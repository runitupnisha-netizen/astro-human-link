import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useOnboardingStatus = () => {
  const { user, loading: authLoading } = useAuth();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

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
          .select("onboarding_complete")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("Error checking onboarding:", error);
          // If RLS blocks access, still show content rather than blank page
          setOnboardingComplete(true);
        } else {
          setOnboardingComplete(data?.onboarding_complete ?? false);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Onboarding check failed:", err);
        setOnboardingComplete(true);
      }
      setLoading(false);
    };

    checkOnboarding();

    return () => { cancelled = true; };
  }, [user, authLoading]);

  return { onboardingComplete, loading: authLoading || loading, user };
};
