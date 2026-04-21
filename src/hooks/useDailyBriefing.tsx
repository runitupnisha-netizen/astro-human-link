import { useState, useEffect, useCallback } from "react";
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

export const useDailyBriefing = () => {
  const { user } = useAuth();
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBriefing = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: cached } = await supabase
        .from("daily_briefings")
        .select("*")
        .eq("user_id", user.id)
        .eq("briefing_date", today)
        .maybeSingle();

      if (cached) {
        setBriefing(cached as DailyBriefing);
      } else {
        const { data, error: fnErr } = await supabase.functions.invoke(
          "generate-daily-briefing"
        );
        if (fnErr) throw fnErr;
        setBriefing(data?.briefing as DailyBriefing);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not load today's briefing";
      setError(msg);
      console.error("[useDailyBriefing]", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchBriefing();
  }, [user, fetchBriefing]);

  return { briefing, loading, error, refresh: fetchBriefing };
};