import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Session-level flag: once verified in this session, skip re-checking
let sessionVerified = false;

export const markSessionVerified = () => {
  sessionVerified = true;
};

export const useVerificationGate = (userId: string | null | undefined) => {
  const [verified, setVerified] = useState<boolean | null>(sessionVerified ? true : null);
  const [loading, setLoading] = useState(!sessionVerified);

  useEffect(() => {
    if (sessionVerified) {
      setVerified(true);
      setLoading(false);
      return;
    }
    if (!userId) {
      setLoading(false);
      return;
    }

    const check = async () => {
      const { data } = await supabase
        .from("photo_verifications")
        .select("status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const isVerified = data?.status === "verified" || data?.status === "pending";
      if (isVerified) sessionVerified = true;
      setVerified(isVerified);
      setLoading(false);
    };
    check();
  }, [userId]);

  return { verified, loading };
};
