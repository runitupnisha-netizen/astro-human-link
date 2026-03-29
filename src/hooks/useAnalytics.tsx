import { useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const SESSION_KEY = "stellara-session-id";

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export const useAnalytics = () => {
  const { user } = useAuth();
  const sessionId = useRef(getSessionId());
  const lastPage = useRef<string | null>(null);

  const track = useCallback(
    async (eventName: string, eventData: Record<string, any> = {}, page?: string) => {
      if (!user) return;
      try {
        await supabase.from("analytics_events" as any).insert({
          user_id: user.id,
          event_name: eventName,
          event_data: eventData,
          page: page || window.location.pathname,
          session_id: sessionId.current,
        });
      } catch (e) {
        // Silently fail - analytics should never break the app
        console.debug("Analytics event failed:", e);
      }
    },
    [user]
  );

  const trackPageView = useCallback(
    (page?: string) => {
      const currentPage = page || window.location.pathname;
      if (currentPage !== lastPage.current) {
        lastPage.current = currentPage;
        track("page_view", { path: currentPage });
      }
    },
    [track]
  );

  // Auto-track page views on route change
  useEffect(() => {
    if (user) {
      trackPageView();
    }
  }, [user, trackPageView]);

  return { track, trackPageView };
};

// Pre-defined event names for consistency
export const AnalyticsEvents = {
  // Auth
  SIGN_UP: "sign_up",
  SIGN_IN: "sign_in",
  SIGN_OUT: "sign_out",

  // Discovery
  SWIPE_LEFT: "swipe_left",
  SWIPE_RIGHT: "swipe_right",
  SUPER_LIKE: "super_like",
  UNDO_SWIPE: "undo_swipe",
  DAILY_LIMIT_HIT: "daily_limit_hit",

  // Profile
  PROFILE_VIEW: "profile_view",
  PROFILE_EDIT: "profile_edit",
  PHOTO_UPLOAD: "photo_upload",
  BOOST_ACTIVATED: "boost_activated",
  INCOGNITO_TOGGLED: "incognito_toggled",

  // Messaging
  MESSAGE_SENT: "message_sent",
  GIF_SENT: "gif_sent",
  IMAGE_SENT: "image_sent",
  CALL_REQUESTED: "call_requested",

  // Premium
  PREMIUM_VIEW: "premium_view",
  CHECKOUT_STARTED: "checkout_started",
  SUBSCRIPTION_ACTIVE: "subscription_active",

  // Social
  POST_CREATED: "post_created",
  POST_LIKED: "post_liked",
  REFERRAL_SHARED: "referral_shared",

  // Engagement
  WEEKLY_INSIGHTS_VIEWED: "weekly_insights_viewed",
  COMPATIBILITY_ANALYZED: "compatibility_analyzed",
  ICEBREAKER_GENERATED: "icebreaker_generated",
  NOTIFICATION_CLICKED: "notification_clicked",

  // Safety
  USER_BLOCKED: "user_blocked",
  USER_REPORTED: "user_reported",
} as const;
