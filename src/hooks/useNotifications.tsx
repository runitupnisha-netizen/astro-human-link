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

  // Re-apply filter when localStorage prefs change (e.g. from Settings page)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "stellara-notif-prefs") {
        applyFilter(allNotifications);
      }
    };
    const onCustom = () => applyFilter(allNotifications);
    window.addEventListener("storage", onStorage);
    window.addEventListener("stellara-notif-prefs-changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("stellara-notif-prefs-changed", onCustom);
    };
  }, [allNotifications, applyFilter]);

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
          setAllNotifications((prev) => {
            const updated = [newNotif, ...prev];
            applyFilter(updated);
            return updated;
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, applyFilter]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setAllNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      applyFilter(updated);
      return updated;
    });
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setAllNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      applyFilter(updated);
      return updated;
    });
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, refetch: fetchNotifications };
};
