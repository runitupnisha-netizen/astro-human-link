import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useVerificationGate = (userId: string | null | undefined) => {
  const [verified, setVerified] = useState<boolean | null>(null);
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
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setVerified(data?.status === "verified" || data?.status === "pending");
      setLoading(false);
    };
    check();
  }, [userId]);

  return { verified, loading };
};
