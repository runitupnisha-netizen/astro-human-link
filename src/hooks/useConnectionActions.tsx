import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics, AnalyticsEvents } from "@/hooks/useAnalytics";

export const FREE_DAILY_LIKE_LIMIT = 15;

export type ConnectionAction = "pass" | "like" | "super_like";

/**
 * Shared client-side connection actions used by the browse grid
 * and the in-profile action bar. Backend tables/RPCs are unchanged —
 * this hook only abstracts the action-trigger, daily-limit accounting,
 * and premium gating away from the UI layer.
 */
export const useConnectionActions = () => {
  const { user } = useAuth();
  const { subscribed: isPremium } = usePremium();
  const { toast } = useToast();
  const { track } = useAnalytics();
  const [dailyLikesUsed, setDailyLikesUsed] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!user || isPremium) return;
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("swipes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("action", ["like", "super_like"])
      .gte("created_at", `${today}T00:00:00Z`)
      .then(({ count }) => setDailyLikesUsed(count || 0));
  }, [user, isPremium, refreshTick]);

  const likesLeft = Math.max(0, FREE_DAILY_LIKE_LIMIT - dailyLikesUsed);
  const likeLimitReached = !isPremium && dailyLikesUsed >= FREE_DAILY_LIKE_LIMIT;

  const sendAction = useCallback(
    async (
      targetUserId: string,
      action: ConnectionAction,
      opts?: { onUpsell?: (feature: "super_like" | "daily_likes") => void },
    ): Promise<{ ok: boolean; reason?: "upsell" | "error" }> => {
      if (!user) return { ok: false, reason: "error" };

      if (action === "super_like" && !isPremium) {
        opts?.onUpsell?.("super_like");
        track(AnalyticsEvents.DAILY_LIMIT_HIT, { trigger: "super_like_locked" });
        return { ok: false, reason: "upsell" };
      }
      if ((action === "like" || action === "super_like") && likeLimitReached) {
        opts?.onUpsell?.("daily_likes");
        track(AnalyticsEvents.DAILY_LIMIT_HIT, {
          trigger: "daily_likes",
          limit: FREE_DAILY_LIKE_LIMIT,
        });
        return { ok: false, reason: "upsell" };
      }

      const eventName =
        action === "pass"
          ? AnalyticsEvents.SWIPE_LEFT
          : action === "super_like"
            ? AnalyticsEvents.SUPER_LIKE
            : AnalyticsEvents.SWIPE_RIGHT;
      track(eventName, { target_user_id: targetUserId });

      if (action === "super_like") {
        toast({
          title: "⭐ Spotlight Sent!",
          description: "They'll see you stand out",
        });
      } else if (action === "like") {
        toast({
          title: "💫 Like sent",
          description: "If you're both aligned, a new connection opens.",
        });
      }

      const isDemo = targetUserId.startsWith("demo-");
      if (!isDemo) {
        try {
          await supabase.from("swipes").insert({
            user_id: user.id,
            target_user_id: targetUserId,
            action,
          });
        } catch (e) {
          console.error("Connection action error:", e);
          return { ok: false, reason: "error" };
        }
      }

      if (action !== "pass") {
        setDailyLikesUsed((c) => c + 1);
      }
      setRefreshTick((t) => t + 1);
      return { ok: true };
    },
    [user, isPremium, likeLimitReached, toast, track],
  );

  return {
    isPremium,
    likesLeft,
    likeLimitReached,
    dailyLikesUsed,
    sendAction,
  };
};
