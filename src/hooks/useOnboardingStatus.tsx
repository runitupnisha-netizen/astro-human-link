import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const cacheKey = (userId: string) => `stellara:onboarding-complete:${userId}`;

const readCachedComplete = (userId: string | undefined): boolean | null => {
  if (!userId) return null;
  try {
    const v = localStorage.getItem(cacheKey(userId));
    if (v === "true") return true;
    if (v === "false") return false;
    return null;
  } catch { return null; }
};

const writeCachedComplete = (userId: string, value: boolean) => {
  try { localStorage.setItem(cacheKey(userId), value ? "true" : "false"); } catch {}
};

export const useOnboardingStatus = () => {
  const { user, loading: authLoading } = useAuth();
  // Trust a freshly-set completion flag (set by Onboarding.handleFinish) to avoid
  // a race where ProtectedRoute reads stale `false` between the DB write and the
  // refetch on the next route mount.
  const justCompleted = (() => {
    try {
      const ts = sessionStorage.getItem("stellara:onboarding-just-completed");
      if (!ts) return false;
      return Date.now() - Number(ts) < 60_000;
    } catch { return false; }
  })();
  // Seed from per-user cache so a brand-new ProtectedRoute mount (Profile,
  // Connections, etc.) doesn't briefly render with onboardingComplete=null
  // — which used to flash the child page before the guard re-evaluated.
  const cachedSeed = readCachedComplete(user?.id);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(
    justCompleted ? true : cachedSeed,
  );
  const [loading, setLoading] = useState(!justCompleted && cachedSeed === null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setOnboardingComplete(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const checkOnboarding = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("onboarding_complete, birth_date, birth_time, birth_place")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("[useOnboardingStatus] select error:", error);
          // On a transient read error, prefer the last-known-good value
          // from cache (or the justCompleted flag) instead of defaulting
          // to `false`. Defaulting to `false` caused signed-in, onboarded
          // users to be bounced through /onboarding → / on every tab tap
          // whenever the per-route profile read hiccuped (auth-token race,
          // RLS race, network blip on iOS WKWebView). For a brand-new
          // account with no cache, we still err on the side of routing
          // into onboarding so they can't skip the birth-data step.
          const cached = readCachedComplete(user.id);
          const fallback = justCompleted ? true : (cached !== null ? cached : false);
          setOnboardingComplete(fallback);
        } else {
          const dbValue = data?.onboarding_complete ?? false;
          console.log("[useOnboardingStatus] read profile gate fields", {
            onboarding_complete: dbValue,
            birth_date: data?.birth_date,
            birth_time: data?.birth_time,
            birth_place: data?.birth_place,
          });
          // Honor the just-completed flag if DB read lags
          if (!dbValue && justCompleted) {
            console.log("[useOnboardingStatus] DB says false but justCompleted flag set — trusting flag");
            setOnboardingComplete(true);
            writeCachedComplete(user.id, true);
          } else {
            setOnboardingComplete(dbValue);
            writeCachedComplete(user.id, dbValue);
            if (dbValue) {
              try { sessionStorage.removeItem("stellara:onboarding-just-completed"); } catch {}
            }
          }
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[useOnboardingStatus] check failed:", err);
        const cached = readCachedComplete(user.id);
        setOnboardingComplete(justCompleted ? true : (cached !== null ? cached : false));
      }
      setLoading(false);
    };

    checkOnboarding();

    return () => { cancelled = true; };
  }, [user, authLoading, justCompleted]);

  return { onboardingComplete, loading: authLoading || loading, user };
};
