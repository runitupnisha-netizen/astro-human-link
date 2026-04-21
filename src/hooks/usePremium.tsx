import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const STELLARA_TIERS = {
  weekly: {
    name: "Weekly",
    price: "$4.99",
    interval: "week",
    price_id: "price_1TBSzZGjQT3v2NNS3Dl5EggN",
    product_id: "prod_U9mYKiREwQYdpU",
  },
  monthly: {
    name: "Monthly",
    price: "$14.99",
    interval: "month",
    price_id: "price_1TBSzaGjQT3v2NNStNP04TH6",
    product_id: "prod_U9mYDs9E8nk1sl",
  },
  vip: {
    name: "VIP",
    price: "$29.99",
    interval: "month",
    price_id: "price_1TBSzcGjQT3v2NNSvxYfK8CF",
    product_id: "prod_U9mYdclgJK5DOP",
  },
  yearly: {
    name: "Yearly",
    price: "$79.99",
    interval: "year",
    price_id: "price_1TBSzeGjQT3v2NNSSd7TLkPn",
    product_id: "prod_U9mYrOjy0ezljw",
  },
} as const;

export type TierKey = keyof typeof STELLARA_TIERS;

const getTierKeyByProductId = (productId: string): TierKey | null => {
  for (const [key, tier] of Object.entries(STELLARA_TIERS)) {
    if (tier.product_id === productId) return key as TierKey;
  }
  return null;
};

export const usePremium = () => {
  const { user, session } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [currentTier, setCurrentTier] = useState<TierKey | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (!session) {
      setSubscribed(false);
      setCurrentTier(null);
      setSubscriptionEnd(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;

      setSubscribed(data.subscribed);
      setCurrentTier(data.product_id ? getTierKeyByProductId(data.product_id) : null);
      setSubscriptionEnd(data.subscription_end || null);
    } catch (err) {
      console.error("Error checking subscription:", err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    checkSubscription();
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const checkout = async (priceId: string, redirectTo?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId, redirectTo },
      });
      if (error) throw error;
      if (data?.url) {
        // Try opening in new tab; if blocked (mobile/PWA), fall back to same-tab redirect
        const popup = window.open(data.url, "_blank");
        if (!popup || popup.closed || typeof popup.closed === "undefined") {
          window.location.href = data.url;
        }
      }
    } catch (err) {
      console.error("Error creating checkout:", err);
      throw err;
    }
  };

  const manageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        const popup = window.open(data.url, "_blank");
        if (!popup || popup.closed || typeof popup.closed === "undefined") {
          window.location.href = data.url;
        }
      }
    } catch (err) {
      console.error("Error opening customer portal:", err);
      throw err;
    }
  };

  return {
    subscribed,
    currentTier,
    subscriptionEnd,
    loading,
    checkout,
    manageSubscription,
    refreshSubscription: checkSubscription,
  };
};
