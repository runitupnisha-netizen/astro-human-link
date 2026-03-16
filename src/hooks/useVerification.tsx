import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useVerificationStatus = (userId: string | null | undefined) => {
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const check = async () => {
      const { data } = await supabase
        .from("photo_verifications")
        .select("status")
        .eq("user_id", userId)
        .eq("status", "verified")
        .maybeSingle();
      setIsVerified(!!data);
      setLoading(false);
    };
    check();
  }, [userId]);

  return { isVerified, loading };
};

// Batch check for multiple user IDs
export const useVerificationStatuses = (userIds: string[]) => {
  const [verifiedSet, setVerifiedSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (userIds.length === 0) return;
    const check = async () => {
      const { data } = await supabase
        .from("photo_verifications")
        .select("user_id")
        .in("user_id", userIds)
        .eq("status", "verified");
      setVerifiedSet(new Set((data || []).map((d) => d.user_id)));
    };
    check();
  }, [userIds.join(",")]);

  return verifiedSet;
};
