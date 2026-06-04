import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(
    justCompleted ? true : null,
  );
  const [loading, setLoading] = useState(!justCompleted);

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
          // SAFER DEFAULT: on read error, route to onboarding rather than
          // skipping it. Previously this defaulted to `true`, which let
          // brand-new accounts bypass the birth-time/location step whenever
          // the very first profile read failed (auth-token race, RLS hiccup,
          // network blip) — the chart then had no birth data.
          // Honor justCompleted so users finishing onboarding aren't bounced
          // back into it on a transient post-write error.
          setOnboardingComplete(justCompleted ? true : false);
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
          } else {
            setOnboardingComplete(dbValue);
            if (dbValue) {
              try { sessionStorage.removeItem("stellara:onboarding-just-completed"); } catch {}
            }
          }
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[useOnboardingStatus] check failed:", err);
        setOnboardingComplete(justCompleted ? true : false);
      }
      setLoading(false);
    };

    checkOnboarding();

    return () => { cancelled = true; };
  }, [user, authLoading, justCompleted]);

  return { onboardingComplete, loading: authLoading || loading, user };
};
