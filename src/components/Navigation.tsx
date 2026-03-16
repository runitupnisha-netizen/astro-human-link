import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart, User, MessageCircle, Settings, Sparkles, BookOpen, Star, TrendingUp, Eye, LogOut, Crown } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import stellaraLogo from "@/assets/stellara-logo.png";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread message count
  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      // Get all match IDs for this user
      const { data: matches } = await supabase
        .from("matches")
        .select("id")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

      if (!matches || matches.length === 0) return;

      const matchIds = matches.map((m) => m.id);
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("match_id", matchIds)
        .neq("sender_id", user.id)
        .is("read_at", null);

      setUnreadCount(count || 0);
    };

    fetchUnread();

    // Listen for new messages in realtime
    const channel = supabase
      .channel("nav-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const desktopNavItems = [
    { path: "/", label: "Discover", icon: Sparkles },
    { path: "/reveal", label: "Reveal", icon: Star },
    { path: "/feed", label: "Feed", icon: BookOpen },
    { path: "/connections", label: "Connections", icon: Heart },
    { path: "/likes", label: "Likes", icon: Eye },
    { path: "/messages", label: "Messages", icon: MessageCircle, badge: unreadCount },
    { path: "/insights", label: "Insights", icon: TrendingUp },
    { path: "/profile", label: "Blueprint", icon: User },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  // Bottom tab bar items — 5 key tabs for mobile
  const bottomTabs = [
    { path: "/", label: "Discover", icon: Sparkles },
    { path: "/connections", label: "Matches", icon: Heart },
    { path: "/messages", label: "Messages", icon: MessageCircle, badge: unreadCount },
    { path: "/profile", label: "Profile", icon: User },
    { path: "/settings", label: "More", icon: Settings },
  ];

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-md scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <img src={stellaraLogo} alt="Stellara" className="relative w-8 h-8 object-contain mix-blend-screen" />
              </div>
              <span className="font-display text-lg font-bold text-gradient-aurora">
                Stellara
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {desktopNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? "nav-pill-active"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30 nav-link-hover"
                    }`}
                  >
                    <div className="relative">
                      <Icon className="w-4 h-4 nav-icon" />
                      {item.badge && item.badge > 0 && (
                        <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </div>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Notification Bell + Sign Out (desktop) */}
            <div className="flex items-center gap-1">
              <NotificationBell />
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/auth";
                }}
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all duration-300"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/30 safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {bottomTabs.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px] ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? "text-primary" : ""}`}>{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="bottomTabIndicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Navigation;