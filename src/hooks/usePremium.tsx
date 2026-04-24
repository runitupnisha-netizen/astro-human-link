import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  initRevenueCat,
  isNativePurchasePlatform,
  getCustomerInfo,
  hasProEntitlement,
  purchaseProduct,
  restorePurchases as rcRestorePurchases,
  RC_PRODUCT_IDS,
  type RcPlanKey,
} from "@/lib/revenuecat";

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
    rc_plan_key: "monthly" as RcPlanKey,
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
    rc_plan_key: "annual" as RcPlanKey,
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

  // Initialize RevenueCat on native platforms once we know the user.
  useEffect(() => {
    if (!isNativePurchasePlatform()) return;
    initRevenueCat(user?.id).catch((err) =>
      console.warn("[usePremium] initRevenueCat failed", err),
    );
  }, [user?.id]);

  const checkSubscription = useCallback(async () => {
    if (!session) {
      setSubscribed(false);
      setCurrentTier(null);
      setSubscriptionEnd(null);
      setLoading(false);
      return;
    }

    try {
      // On native iOS/Android, the source of truth is RevenueCat.
      if (isNativePurchasePlatform()) {
        const info = await getCustomerInfo();
        if (info) {
          const isPro = hasProEntitlement(info);
          setSubscribed(isPro);
          // Map active product back to a tier key (monthly / yearly).
          const activeProductId = Object.values(info.entitlements?.active ?? {})[0]?.productIdentifier;
          if (activeProductId === RC_PRODUCT_IDS.monthly) setCurrentTier("monthly");
          else if (activeProductId === RC_PRODUCT_IDS.annual) setCurrentTier("yearly");
          else setCurrentTier(null);
          const expiry = Object.values(info.entitlements?.active ?? {})[0]?.expirationDate;
          setSubscriptionEnd(expiry ?? null);
          setLoading(false);
          return;
        }
        // Fall through to Stripe check if RC isn't ready yet.
      }

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
    // Native path: RevenueCat / StoreKit / Play Billing.
    if (isNativePurchasePlatform()) {
      // Map Stripe price_id back to the matching native plan.
      const tierEntry = Object.values(STELLARA_TIERS).find((t) => t.price_id === priceId);
      const planKey = (tierEntry as { rc_plan_key?: RcPlanKey } | undefined)?.rc_plan_key;
      if (!planKey) {
        throw new Error(
          "This plan isn't available on mobile. Please choose Monthly or Annual.",
        );
      }
      const result = await purchaseProduct(planKey);
      if (result.ok === true) {
        await checkSubscription();
        return;
      } else {
        if (result.userCancelled) return;
        throw new Error(result.error ?? "Purchase failed");
      }
    }

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
    // On native, redirect to the OS-managed subscription screen.
    if (isNativePurchasePlatform()) {
      const platform = (await import("@capacitor/core")).Capacitor.getPlatform();
      const url =
        platform === "ios"
          ? "https://apps.apple.com/account/subscriptions"
          : "https://play.google.com/store/account/subscriptions";
      window.open(url, "_blank");
      return;
    }
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

  /** Restore previous purchases (App Store requirement). */
  const restorePurchases = async (): Promise<{ subscribed: boolean }> => {
    if (isNativePurchasePlatform()) {
      const result = await rcRestorePurchases();
      if (result) {
        await checkSubscription();
        return result;
      }
    }
    // On web, just re-check the Stripe subscription state.
    await checkSubscription();
    return { subscribed };
  };

  return {
    subscribed,
    currentTier,
    subscriptionEnd,
    loading,
    checkout,
    manageSubscription,
    restorePurchases,
    refreshSubscription: checkSubscription,
  };
};
