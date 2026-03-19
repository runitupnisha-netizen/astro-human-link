import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  created_at: string;
}

// Map notification types to preference keys
const TYPE_TO_PREF: Record<string, string> = {
  match: "matches",
  like: "matches",
  message: "messages",
  daily_intention: "insights",
  weekly_insight: "insights",
  marketing: "marketing",
  tip: "marketing",
};

const getNotifPrefs = (): Record<string, boolean> => {
  try {
    const stored = localStorage.getItem("stellara-notif-prefs");
    return stored
      ? { matches: true, messages: true, insights: true, marketing: false, ...JSON.parse(stored) }
      : { matches: true, messages: true, insights: true, marketing: false };
  } catch {
    return { matches: true, messages: true, insights: true, marketing: false };
  }
};

const filterByPrefs = (items: Notification[]): Notification[] => {
  const prefs = getNotifPrefs();
  return items.filter((n) => {
    const prefKey = TYPE_TO_PREF[n.type];
    // If no mapping exists, always show
    return prefKey ? prefs[prefKey] !== false : true;
  });
};

export const useNotifications = () => {
  const { user } = useAuth();
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Recompute filtered list whenever allNotifications change
  const applyFilter = useCallback((items: Notification[]) => {
    const filtered = filterByPrefs(items);
    setNotifications(filtered);
    setUnreadCount(filtered.filter((n) => !n.read).length);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) {
      const typed = data as Notification[];
      setAllNotifications(typed);
      applyFilter(typed);
    }
  }, [user, applyFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, refetch: fetchNotifications };
};
