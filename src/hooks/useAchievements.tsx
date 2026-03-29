import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStreak } from "@/hooks/useStreak";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "profile" | "social" | "streak" | "cosmic";
  unlocked: boolean;
  progress: number;
  target: number;
}

export const useAchievements = () => {
  const { user } = useAuth();
  const { current_streak, longest_streak, total_logins } = useStreak();
  const [stats, setStats] = useState({
    matchCount: 0,
    messagesSent: 0,
    swipeCount: 0,
    profileComplete: false,
    hasAvatar: false,
    hasVerification: false,
    postCount: 0,
  });

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [matches, messages, swipes, profile, verification, posts] = await Promise.all([
        supabase.from("matches").select("id", { count: "exact", head: true }).or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("sender_id", user.id),
        supabase.from("swipes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("profiles").select("avatar_url, display_name, birth_date, sun_sign, bio_prompt_1_answer").eq("user_id", user.id).maybeSingle(),
        supabase.from("photo_verifications").select("status").eq("user_id", user.id).eq("status", "approved").maybeSingle(),
        supabase.from("alignment_posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      setStats({
        matchCount: matches.count || 0,
        messagesSent: messages.count || 0,
        swipeCount: swipes.count || 0,
        profileComplete: !!(profile?.data?.display_name && profile?.data?.birth_date && profile?.data?.sun_sign && profile?.data?.bio_prompt_1_answer),
        hasAvatar: !!profile?.data?.avatar_url,
        hasVerification: !!verification?.data,
        postCount: posts.count || 0,
      });
    };
    fetchStats();
  }, [user]);

  const achievements: Achievement[] = useMemo(() => [
    { id: "first_login", title: "Cosmic Arrival", description: "Log in for the first time", icon: "🌟", category: "streak", unlocked: total_logins >= 1, progress: Math.min(total_logins, 1), target: 1 },
    { id: "streak_3", title: "Burning Bright", description: "Maintain a 3-day login streak", icon: "🔥", category: "streak", unlocked: longest_streak >= 3, progress: Math.min(current_streak, 3), target: 3 },
    { id: "streak_7", title: "Stellar Dedication", description: "Maintain a 7-day login streak", icon: "⭐", category: "streak", unlocked: longest_streak >= 7, progress: Math.min(current_streak, 7), target: 7 },
    { id: "streak_30", title: "Moon Cycle Master", description: "Maintain a 30-day login streak", icon: "🌙", category: "streak", unlocked: longest_streak >= 30, progress: Math.min(current_streak, 30), target: 30 },
    { id: "profile_complete", title: "Soul Blueprint", description: "Complete your entire profile", icon: "📋", category: "profile", unlocked: stats.profileComplete, progress: stats.profileComplete ? 1 : 0, target: 1 },
    { id: "avatar_set", title: "Face of the Stars", description: "Upload a profile photo", icon: "📸", category: "profile", unlocked: stats.hasAvatar, progress: stats.hasAvatar ? 1 : 0, target: 1 },
    { id: "verified", title: "Cosmic Verified", description: "Complete selfie verification", icon: "✅", category: "profile", unlocked: stats.hasVerification, progress: stats.hasVerification ? 1 : 0, target: 1 },
    { id: "first_match", title: "Cosmic Connection", description: "Get your first match", icon: "💫", category: "social", unlocked: stats.matchCount >= 1, progress: Math.min(stats.matchCount, 1), target: 1 },
    { id: "matches_5", title: "Star Cluster", description: "Get 5 matches", icon: "✨", category: "social", unlocked: stats.matchCount >= 5, progress: Math.min(stats.matchCount, 5), target: 5 },
    { id: "matches_25", title: "Constellation Builder", description: "Get 25 matches", icon: "🌌", category: "social", unlocked: stats.matchCount >= 25, progress: Math.min(stats.matchCount, 25), target: 25 },
    { id: "messages_10", title: "Cosmic Messenger", description: "Send 10 messages", icon: "💬", category: "social", unlocked: stats.messagesSent >= 10, progress: Math.min(stats.messagesSent, 10), target: 10 },
    { id: "messages_100", title: "Galactic Communicator", description: "Send 100 messages", icon: "📡", category: "social", unlocked: stats.messagesSent >= 100, progress: Math.min(stats.messagesSent, 100), target: 100 },
    { id: "swipes_50", title: "Star Explorer", description: "Swipe through 50 profiles", icon: "🚀", category: "cosmic", unlocked: stats.swipeCount >= 50, progress: Math.min(stats.swipeCount, 50), target: 50 },
    { id: "first_post", title: "Alignment Voice", description: "Create your first alignment post", icon: "📝", category: "cosmic", unlocked: stats.postCount >= 1, progress: Math.min(stats.postCount, 1), target: 1 },
  ], [total_logins, longest_streak, current_streak, stats]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return { achievements, unlockedCount, totalCount: achievements.length };
};
