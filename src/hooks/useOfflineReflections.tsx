import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface QueuedReflection {
  id: string;            // local uuid
  briefing_id: string;
  briefing_date: string; // for display
  reflection: string;
  queued_at: string;
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
    (entry: Omit<QueuedReflection, "id" | "queued_at">) => {
      if (!user) return;
      const next: QueuedReflection = {
        ...entry,
        id: makeId(),
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
      for (const item of current) {
        const { error } = await supabase.from("briefing_reflections").insert({
          user_id: user.id,
          briefing_id: item.briefing_id,
          reflection: item.reflection,
        });
        if (error) {
          remaining.push(item);
        } else {
          synced++;
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