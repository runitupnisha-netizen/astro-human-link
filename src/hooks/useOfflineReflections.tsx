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

  const flush = useCallback(async () => {
    if (!user) return { synced: 0, failed: 0 };
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return { synced: 0, failed: 0 };
    }
    const current = readQueue(user.id);
    if (current.length === 0) return { synced: 0, failed: 0 };

    setSyncing(true);
    const remaining: QueuedReflection[] = [];
    let synced = 0;
    try {
      // Local de-dupe: collapse any accidental duplicates that share a client_key.
      const seen = new Set<string>();
      const deduped = current.filter((item) => {
        if (seen.has(item.client_key)) return false;
        seen.add(item.client_key);
        return true;
      });

      for (const item of deduped) {
        // Pre-flight: if a row with this client_key already exists for this
        // user (e.g. a previous request reached the server before the network
        // dropped), treat it as already-synced.
        const { data: existing } = await supabase
          .from("briefing_reflections")
          .select("id")
          .eq("user_id", user.id)
          .eq("client_key", item.client_key)
          .maybeSingle();

        if (existing) {
          synced++;
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
        } else if (
          // Postgres unique violation → server already has it; safe to drop.
          (error as { code?: string }).code === "23505"
        ) {
          synced++;
        } else {
          remaining.push(item);
        }
      }
    } finally {
      writeQueue(user.id, remaining);
      setQueue(remaining);
      setSyncing(false);
    }
    if (synced > 0) onSynced?.();
    return { synced, failed: remaining.length };
  }, [user, onSynced]);

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

  return { queue, syncing, enqueue, flush };
};