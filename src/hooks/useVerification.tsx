import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const isValidUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export const useVerificationStatus = (userId: string | null | undefined) => {
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !isValidUuid(userId)) {
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
    const validIds = userIds.filter(isValidUuid);
    if (validIds.length === 0) return;
    const check = async () => {
      const { data } = await supabase
        .from("photo_verifications")
        .select("user_id")
        .in("user_id", validIds)
        .eq("status", "verified");
      setVerifiedSet(new Set((data || []).map((d) => d.user_id)));
    };
    check();
  }, [userIds.join(",")]);

  return verifiedSet;
};
