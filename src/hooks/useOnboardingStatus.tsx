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

    const checkOnboarding = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("user_id", user.id)
        .maybeSingle();

      setOnboardingComplete(data?.onboarding_complete ?? false);
      setLoading(false);
    };

    checkOnboarding();
  }, [user, authLoading]);

  return { onboardingComplete, loading: authLoading || loading, user };
};
