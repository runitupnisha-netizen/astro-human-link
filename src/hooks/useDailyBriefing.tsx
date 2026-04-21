import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface DailyBriefing {
  id: string;
  briefing_date: string;
  energy_theme: string;
  mood: string;
  focus: string;
  lucky_window: string | null;
  affirmation: string | null;
  journal_prompt: string;
  cosmic_weather: string | null;
}

const cacheKey = (userId: string) => `stellara.briefing.${userId}`;

const readCache = (userId: string): { briefing: DailyBriefing; cachedAt: string } | null => {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeCache = (userId: string, briefing: DailyBriefing) => {
  try {
    localStorage.setItem(
      cacheKey(userId),
      JSON.stringify({ briefing, cachedAt: new Date().toISOString() })
    );
  } catch {
    /* quota or disabled — ignore */
  }
};

/**
 * Number of daily briefings currently cached locally for this user.
 * The cache stores at most one day's briefing per user (today's), so this
 * returns 0 or 1. Exposed so Settings can show an honest count and offer
 * a Clear control.
 */
export const getBriefingCacheCount = (userId: string): number => {
  return readCache(userId) ? 1 : 0;
};

/**
 * Remove every locally cached daily briefing for this user.
 */
export const clearBriefingCache = (userId: string): void => {
  try {
    localStorage.removeItem(cacheKey(userId));
  } catch {
    /* storage disabled — ignore */
  }
};

export const useDailyBriefing = () => {
  const { user } = useAuth();
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  // True when the page was opened (or the last fetch ran) while offline and
  // we still owe the server a refresh. Used so reconnection always triggers
  // an automatic update and the UI can surface a "queued" indicator.
  const [refreshQueued, setRefreshQueued] = useState(false);
  const refreshQueuedRef = useRef(false);

  const queueRefresh = useCallback(() => {
    if (refreshQueuedRef.current) return;
    refreshQueuedRef.current = true;
    setRefreshQueued(true);
  }, []);

  const clearQueuedRefresh = useCallback(() => {
    if (!refreshQueuedRef.current) return;
    refreshQueuedRef.current = false;
    setRefreshQueued(false);
  }, []);

  const fetchBriefing = useCallback(async () => {
    if (!user) return;

    // 1. Hydrate immediately from cache if we have it for today
    const today = new Date().toISOString().split("T")[0];
    const cached = readCache(user.id);
    if (cached?.briefing.briefing_date === today) {
      setBriefing(cached.briefing);
      setCachedAt(cached.cachedAt);
    }

    // 2. If browser reports offline, stop here and surface cached briefing
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
      // Owe the server a refresh as soon as we're back online — even if
      // we already have today's cached briefing (it might be stale, e.g.
      // regenerated server-side).
      queueRefresh();
      if (!cached || cached.briefing.briefing_date !== today) {
        setError("You're offline and today's briefing isn't cached yet.");
      }
      return;
    }

    setIsOffline(false);
    setLoading(true);
    setError(null);
    try {
      const { data: dbBriefing } = await supabase
        .from("daily_briefings")
        .select("*")
        .eq("user_id", user.id)
        .eq("briefing_date", today)
        .maybeSingle();

      if (dbBriefing) {
        const b = dbBriefing as DailyBriefing;
        setBriefing(b);
        writeCache(user.id, b);
        setCachedAt(new Date().toISOString());
      } else {
        const { data, error: fnErr } = await supabase.functions.invoke(
          "generate-daily-briefing"
        );
        if (fnErr) throw fnErr;
        const b = data?.briefing as DailyBriefing;
        if (b) {
          setBriefing(b);
          writeCache(user.id, b);
          setCachedAt(new Date().toISOString());
        }
      }
      // Successful round-trip — drop any pending queued refresh.
      clearQueuedRefresh();
    } catch (err) {
      console.error("[useDailyBriefing]", err);
      // Network/server failure: if we already have a cached briefing showing,
      // don't blank it out — just flag offline mode.
      // Either way we still owe the server a refresh once we recover.
      queueRefresh();
      if (cached?.briefing.briefing_date === today) {
        setIsOffline(true);
      } else {
        const msg = err instanceof Error ? err.message : "Could not load today's briefing";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [user, queueRefresh, clearQueuedRefresh]);

  useEffect(() => {
    if (user) fetchBriefing();
  }, [user, fetchBriefing]);

  // Auto-refresh when the connection comes back online — including when
  // the page was first opened offline, in which case `refreshQueued` was
  // set during the initial cache-only render and this listener drains it.
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (user) {
        // Always run a fetch on reconnect; `fetchBriefing` will clear
        // `refreshQueued` on success or re-queue it on failure.
        fetchBriefing();
      }
    };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [user, fetchBriefing]);

  // Safety net: if the user is online but a refresh is still queued (for
  // example after a transient server error that flipped us offline), drain
  // it once. This makes the "queued refresh" guarantee independent of the
  // browser firing an `online` event.
  useEffect(() => {
    if (!user || !refreshQueued) return;
    if (typeof navigator !== "undefined" && navigator.onLine && !isOffline) {
      fetchBriefing();
    }
  }, [user, refreshQueued, isOffline, fetchBriefing]);

  return {
    briefing,
    loading,
    error,
    isOffline,
    cachedAt,
    refreshQueued,
    refresh: fetchBriefing,
  };
};