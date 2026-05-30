import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface FoundationStep {
  id: "chart" | "profile" | "insights" | "lyra";
  label: string;
  done: boolean;
  path: string;
  description: string;
}

export interface FoundationStatus {
  loading: boolean;
  complete: boolean;
  completedCount: number;
  totalCount: number;
  steps: FoundationStep[];
}

const INSIGHTS_READ_KEY = "stellara:insights-read";
const LYRA_ACK_KEY = "stellara:lyra-intro-ack";
const REVIEWER_MODE_KEY = "stellara:reviewer-mode";
const REVIEWER_TOKEN = "STELLARA-REVIEW-2026";

// One-time URL bypass: visiting any page with ?reviewer=STELLARA-REVIEW-2026
// flips a sessionStorage flag so App Store reviewers can skip the Foundation
// gate and reach Connections immediately. Cleared when the tab closes.
if (typeof window !== "undefined") {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reviewer") === REVIEWER_TOKEN) {
      sessionStorage.setItem(REVIEWER_MODE_KEY, "1");
    }
  } catch {}
}

export const isReviewerMode = (): boolean => {
  try { return sessionStorage.getItem(REVIEWER_MODE_KEY) === "1"; } catch { return false; }
};

export const markInsightRead = () => {
  try {
    const n = parseInt(localStorage.getItem(INSIGHTS_READ_KEY) || "0", 10) || 0;
    localStorage.setItem(INSIGHTS_READ_KEY, String(n + 1));
  } catch {}
};

export const markLyraIntroAck = () => {
  try { localStorage.setItem(LYRA_ACK_KEY, "1"); } catch {}
};

const computeProfileScore = (profile: any, photoCount: number): number => {
  if (!profile) return 0;
  const checks = [
    !!profile.avatar_url,
    !!(profile.birth_date && profile.birth_place),
    !!(profile.bio_prompt_1_answer && profile.bio_prompt_2_answer),
    photoCount >= 2,
    !!(profile.kids_preference && profile.drinking && profile.smoking),
    !!(profile.interests?.length >= 3),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

export const useFoundationStatus = (): FoundationStatus => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<FoundationStep[]>([]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setSteps([]);
      return;
    }
    if (isReviewerMode()) {
      setSteps([
        { id: "chart",    label: "Complete your birth chart", description: "Reviewer bypass active.", done: true, path: "/onboarding" },
        { id: "profile",  label: "Reach 80% profile score",   description: "Reviewer bypass active.", done: true, path: "/profile" },
        { id: "insights", label: "Read your first 3 Insights",description: "Reviewer bypass active.", done: true, path: "/insights" },
        { id: "lyra",     label: "Meet Lyra, your cosmic guide", description: "Reviewer bypass active.", done: true, path: "/lyra" },
      ]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, avatar_url, birth_date, birth_time, birth_place, bio_prompt_1_answer, bio_prompt_2_answer, kids_preference, drinking, smoking, interests")
        .eq("user_id", user.id)
        .maybeSingle();

      const { count: photoCount } = await supabase
        .from("profile_photos")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      const score = computeProfileScore(profile, photoCount || 0);
      const chartComplete = !!(profile?.birth_date && profile?.birth_place);
      console.log("[useFoundationStatus] profile read", {
        hasProfile: !!profile,
        birth_date: profile?.birth_date,
        birth_time: profile?.birth_time,
        birth_place: profile?.birth_place,
        chartComplete,
      });

      let insightsRead = 0;
      let lyraAck = false;
      try { insightsRead = parseInt(localStorage.getItem(INSIGHTS_READ_KEY) || "0", 10) || 0; } catch {}
      try { lyraAck = localStorage.getItem(LYRA_ACK_KEY) === "1"; } catch {}

      const { count: briefingCount } = await supabase
        .from("daily_briefings" as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      const insightsDone = insightsRead >= 3 || (briefingCount || 0) >= 1;

      if (cancelled) return;
      setSteps([
        { id: "chart", label: "Complete your birth chart", description: "Add your birth date, time, and place.", done: chartComplete, path: "/onboarding" },
        { id: "profile", label: "Reach 80% profile score", description: `Currently ${score}% — add photos, prompts, and lifestyle details.`, done: score >= 80, path: "/profile" },
        { id: "insights", label: "Read your first 3 Insights", description: `${Math.min(insightsRead, 3)} of 3 read so far.`, done: insightsDone, path: "/insights" },
        { id: "lyra", label: "Meet Lyra, your cosmic guide", description: "Open Lyra and start a conversation.", done: lyraAck, path: "/lyra" },
      ]);
      setLoading(false);
    })().catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  const completedCount = steps.filter(s => s.done).length;
  return {
    loading,
    complete: steps.length > 0 && completedCount === steps.length,
    completedCount,
    totalCount: steps.length || 4,
    steps,
  };
};