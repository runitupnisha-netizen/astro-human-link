import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface QueuedReflection {
  id: string;            // local uuid
  briefing_id: string;
  briefing_date: string; // for display
  reflection: string;
  queued_at: string;
  /** Stable per-entry idempotency key sent to the server. */
  client_key: string;
  /** Number of failed sync attempts so far (0 = never tried). */
  attempts?: number;
  /** Short, user-readable reason from the last failure. */
  last_error?: string;
  /** ISO timestamp of the last attempt (success or failure). */
  last_attempt_at?: string;
}

const queueKey = (userId: string) => `stellara.reflectionQueue.${userId}`;

const readQueue = (userId: string): QueuedReflection[] => {
  try {
    const raw = localStorage.getItem(queueKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueue = (userId: string, queue: QueuedReflection[]) => {
  try {
    localStorage.setItem(queueKey(userId), JSON.stringify(queue));
  } catch {
    /* ignore quota */
  }
};

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Persists reflections to localStorage when the network is unreachable
 * (or a save fails) and automatically flushes them once we're back online.
 */
export const useOfflineReflections = (onSynced?: () => void) => {
  const { user } = useAuth();
  const [queue, setQueue] = useState<QueuedReflection[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<
    { current: number; total: number; synced: number; failed: number } | null
  >(null);

  // Hydrate queue when user becomes available
  useEffect(() => {
    if (!user) {
      setQueue([]);
      return;
    }
    setQueue(readQueue(user.id));
  }, [user]);

  const enqueue = useCallback(
    (entry: Omit<QueuedReflection, "id" | "queued_at" | "client_key"> & { client_key?: string }) => {
      if (!user) return;
      const id = makeId();
      const next: QueuedReflection = {
        ...entry,
        id,
        // If the caller supplied a client_key (e.g. from a failed direct save),
        // reuse it so retries collapse onto the same server row.
        client_key: entry.client_key ?? id,
        queued_at: new Date().toISOString(),
      };
      const updated = [...readQueue(user.id), next];
      writeQueue(user.id, updated);
      setQueue(updated);
    },
    [user]
  );

  /**
   * Core sync worker. Processes only the items in `targetKeys` (a set of
   * client_keys), preserving any other queued items untouched. If `targetKeys`
   * is null, every queued item is attempted.
   */
  const runFlush = useCallback(
    async (targetKeys: Set<string> | null) => {
      if (!user) return { synced: 0, failed: 0 };
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return { synced: 0, failed: 0 };
      }
      const current = readQueue(user.id);
      if (current.length === 0) return { synced: 0, failed: 0 };

      // Partition: items we'll attempt now vs. items we'll leave alone.
      const toProcess = targetKeys
        ? current.filter((it) => targetKeys.has(it.client_key))
        : current;
      const untouched = targetKeys
        ? current.filter((it) => !targetKeys.has(it.client_key))
        : [];

      if (toProcess.length === 0) return { synced: 0, failed: 0 };

      setSyncing(true);
      setProgress({ current: 0, total: toProcess.length, synced: 0, failed: 0 });
      const remaining: QueuedReflection[] = [];
      let synced = 0;
      let failed = 0;
      try {
        // Local de-dupe: collapse any accidental duplicates that share a client_key.
        const seen = new Set<string>();
        const deduped = toProcess.filter((item) => {
          if (seen.has(item.client_key)) return false;
          seen.add(item.client_key);
          return true;
        });

        setProgress({ current: 0, total: deduped.length, synced: 0, failed: 0 });

        for (let i = 0; i < deduped.length; i++) {
          const item = deduped[i];
          setProgress({ current: i, total: deduped.length, synced, failed });

          const { data: existing } = await supabase
            .from("briefing_reflections")
            .select("id")
            .eq("user_id", user.id)
            .eq("client_key", item.client_key)
            .maybeSingle();

          if (existing) {
            synced++;
            setProgress({ current: i + 1, total: deduped.length, synced, failed });
            continue;
          }

          const { error } = await supabase.from("briefing_reflections").insert({
            user_id: user.id,
            briefing_id: item.briefing_id,
            reflection: item.reflection,
            client_key: item.client_key,
          });

          if (!error) {
            synced++;
          } else if ((error as { code?: string }).code === "23505") {
            synced++;
          } else {
            // Annotate the item with retry metadata so the UI can surface
            // a "Retry failed" affordance later.
            remaining.push({
              ...item,
              attempts: (item.attempts ?? 0) + 1,
              last_error: error.message?.slice(0, 200) ?? "Unknown error",
              last_attempt_at: new Date().toISOString(),
            });
            failed++;
          }
          setProgress({ current: i + 1, total: deduped.length, synced, failed });
        }
        setProgress({ current: deduped.length, total: deduped.length, synced, failed });
      } finally {
        // Preserve items we deliberately skipped this run.
        const finalQueue = [...untouched, ...remaining];
        writeQueue(user.id, finalQueue);
        setQueue(finalQueue);
        setSyncing(false);
        setTimeout(() => setProgress(null), 1200);
      }
      if (synced > 0) onSynced?.();
      return { synced, failed };
    },
    [user, onSynced]
  );

  const flush = useCallback(() => runFlush(null), [runFlush]);

  /**
   * Retry only the items that previously failed at least once. Items that
   * were queued offline but never attempted are left alone — they'll sync
   * on the next normal flush.
   */
  const retryFailed = useCallback(async () => {
    if (!user) return { synced: 0, failed: 0 };
    const failedKeys = new Set(
      readQueue(user.id)
        .filter((it) => (it.attempts ?? 0) > 0)
        .map((it) => it.client_key)
    );
    if (failedKeys.size === 0) return { synced: 0, failed: 0 };
    return runFlush(failedKeys);
  }, [user, runFlush]);

  // Auto-flush when we come back online
  useEffect(() => {
    if (!user) return;
    const handleOnline = () => {
      void flush();
    };
    window.addEventListener("online", handleOnline);
    // Try once on mount in case we loaded already-online with a leftover queue
    if (typeof navigator === "undefined" || navigator.onLine) {
      void flush();
    }
    return () => window.removeEventListener("online", handleOnline);
  }, [user, flush]);

  return { queue, syncing, progress, enqueue, flush, retryFailed };
};