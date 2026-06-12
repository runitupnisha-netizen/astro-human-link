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

// NOTE: the prior public URL-token bypass (?reviewer=STELLARA-REVIEW-2026)
// has been removed — anything in client JS is enumerable, which means
// anyone reading the bundle could skip the Foundation gate. App Store
// reviewers now hit the Connections surface legitimately because the
// shared reviewer accounts (DEMO_PRO_EMAILS, mirrored below) are pre-
// seeded with onboarding + foundation flags marked complete in the DB,
// and we additionally bypass the Foundation gate for those known emails
// AND for any user with the `admin` role.
const REVIEWER_EMAILS = new Set([
  "demo@stellara.app",
  "chef.tinisha@gmail.com",
  "runitupnisha@gmail.com",
]);
export const isReviewerMode = (): boolean => false;

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
    const email = (user.email ?? "").toLowerCase();
    if (email && REVIEWER_EMAILS.has(email)) {
      setSteps([
        { id: "chart",    label: "Complete your birth chart", description: "Reviewer access.", done: true, path: "/onboarding" },
        { id: "profile",  label: "Reach 80% profile score",   description: "Reviewer access.", done: true, path: "/profile" },
        { id: "insights", label: "Read your first 3 Insights",description: "Reviewer access.", done: true, path: "/insights" },
        { id: "lyra",     label: "Meet Lyra, your cosmic guide", description: "Reviewer access.", done: true, path: "/lyra" },
      ]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      // Admin role → bypass Foundation gate entirely (full app access).
      const { data: adminRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (adminRow) {
        if (cancelled) return;
        setSteps([
          { id: "chart",    label: "Complete your birth chart",    description: "Admin bypass active.", done: true, path: "/onboarding" },
          { id: "profile",  label: "Reach 80% profile score",      description: "Admin bypass active.", done: true, path: "/profile" },
          { id: "insights", label: "Read your first 3 Insights",   description: "Admin bypass active.", done: true, path: "/insights" },
          { id: "lyra",     label: "Meet Lyra, your cosmic guide", description: "Admin bypass active.", done: true, path: "/lyra" },
        ]);
        setLoading(false);
        return;
      }

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