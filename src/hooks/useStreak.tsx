import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface StreakData {
  current_streak: number;
  longest_streak: number;
  total_logins: number;
}

export const useStreak = () => {
  const { user } = useAuth();
  const [streak, setStreak] = useState<StreakData>({ current_streak: 0, longest_streak: 0, total_logins: 0 });

  useEffect(() => {
    if (!user) return;

    const updateStreak = async () => {
      const today = new Date().toISOString().split("T")[0];

      // Try to get existing streak
      const { data: existing } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existing) {
        // Create new streak record
        const { data: created } = await supabase
          .from("user_streaks")
          .insert({ user_id: user.id, current_streak: 1, longest_streak: 1, last_login_date: today, total_logins: 1 })
          .select()
          .single();
        if (created) setStreak({ current_streak: 1, longest_streak: 1, total_logins: 1 });
        return;
      }

      if (existing.last_login_date === today) {
        // Already logged in today
        setStreak({ current_streak: existing.current_streak, longest_streak: existing.longest_streak, total_logins: existing.total_logins });
        return;
      }

      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const isConsecutive = existing.last_login_date === yesterday;
      const newStreak = isConsecutive ? existing.current_streak + 1 : 1;
      const newLongest = Math.max(existing.longest_streak, newStreak);
      const newTotal = existing.total_logins + 1;

      const { data: updated } = await supabase
        .from("user_streaks")
        .update({ current_streak: newStreak, longest_streak: newLongest, last_login_date: today, total_logins: newTotal })
        .eq("user_id", user.id)
        .select()
        .single();

      if (updated) setStreak({ current_streak: newStreak, longest_streak: newLongest, total_logins: newTotal });
    };

    updateStreak();
  }, [user]);

  return streak;
};
