import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart, User, MessageCircle, Settings, Sparkles, LogOut, Crown, Users, Menu, Trophy, Gift, Shield, Mail, Sun, Moon, Wand2, Diamond } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import stellaraLogo from "@/assets/stellara-logo.png";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Fetch the current user's avatar for the top-right profile button (mobile)
  useEffect(() => {
    if (!user) {
      setAvatarUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const url = data?.avatar_url ?? null;
      if (!url) {
        setAvatarUrl(null);
        return;
      }
      if (/^https?:\/\//i.test(url)) {
        setAvatarUrl(url);
      } else {
        const { data: signed } = await supabase.storage
          .from("avatars")
          .createSignedUrl(url, 3600);
        if (!cancelled) setAvatarUrl(signed?.signedUrl ?? null);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

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
    { path: "/", label: t("nav.profile"), icon: User },
    { path: "/discover", label: t("nav.discover"), icon: Sparkles },
    { path: "/connections", label: t("nav.connections"), icon: Heart },
    { path: "/inner-world", label: "My Cosmos", icon: Moon },
    { path: "/lyra", label: "Lyra", icon: Wand2 },
    { path: "/feed", label: "Community", icon: Users },
    { path: "/messages", label: t("nav.messages"), icon: MessageCircle, badge: unreadCount },
    { path: "/premium", label: t("premium.title"), icon: Crown, premium: true },
    { path: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  // Bottom tab bar items — 4 key tabs for mobile (Profile via top-right avatar)
  const bottomTabs: Array<{ path: string; label: string; icon: typeof Sparkles; badge?: number }> = [
    { path: "/discover", label: t("nav.discover"), icon: Sparkles },
    { path: "/connections", label: t("connections.matches"), icon: Heart },
    { path: "/growth", label: "Growth", icon: Diamond },
    { path: "/lyra", label: "Lyra", icon: Moon },
  ];

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/30 pt-[env(safe-area-inset-top,0px)]" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-3 md:px-5 lg:px-6">
          <div className="flex items-center justify-between h-14 gap-2">
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-md scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <img src={stellaraLogo} alt="Stellara" className="relative w-8 h-8 object-contain mix-blend-screen" />
              </div>
              <span className="font-display text-lg font-bold text-gradient-aurora">
                Stellara
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-0 flex-1 justify-center min-w-0 px-1">
              {desktopNavItems.map((item) => {
                const Icon = item.icon;
            const isActive = item.path === "/profile"
              ? location.pathname === "/profile" || location.pathname.startsWith("/profile/")
              : location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                className={`relative flex items-center gap-1 px-1.5 py-2 lg:px-2.5 rounded-xl text-[11px] lg:text-xs font-medium whitespace-nowrap transition-all duration-300 shrink-0 ${
                      isActive
                        ? item.premium ? "bg-gradient-golden text-background shadow-golden" : "nav-pill-active"
                        : item.premium
                          ? "text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30 nav-link-hover"
                    }`}
                  >
                    <div className="relative">
                      <Icon className={`w-4 h-4 ${item.premium && !isActive ? "drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]" : ""} nav-icon`} />
                      {!!item.badge && item.badge > 0 && (
                        <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </div>
                    <span className="hidden lg:inline">{item.label}</span>
                    {item.premium && !isActive && (
                      <span className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                        <span className="absolute inset-0 animate-[shimmer_3s_ease-in-out_infinite] bg-[linear-gradient(110deg,transparent_25%,rgba(251,191,36,0.15)_50%,transparent_75%)] bg-[length:250%_100%]" />
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Notification Bell + Sign Out (desktop) + Mobile Menu */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Mobile-only profile avatar — opens My Cosmos (Profile) */}
              <Link
                to="/profile"
                aria-label="Open My Cosmos"
                className="md:hidden flex items-center justify-center w-11 h-11 rounded-full hover:bg-muted/30 transition-colors"
              >
                <Avatar className="w-9 h-9 border border-border/40">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt="My Cosmos" /> : null}
                  <AvatarFallback className="bg-muted text-foreground text-xs">
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              </Link>
              <NotificationBell />
              <button
                onClick={async () => {
                  // Centralized signOut: marks explicit + hard-reloads to /sign-in
                  await signOut();
                }}
                className="hidden md:flex items-center gap-1 px-2 py-2 lg:px-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all duration-300"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden xl:inline">{t("settings.sign_out")}</span>
              </button>

              {/* Mobile hamburger menu */}
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <button
                    className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all duration-300"
                    aria-label="Open menu"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] bg-background/95 backdrop-blur-xl border-border/40">
                  <SheetHeader>
                    <SheetTitle className="text-gradient-aurora font-display text-xl text-left">Menu</SheetTitle>
                  </SheetHeader>
                  <div className="mt-8 flex flex-col gap-2">
                    <Link
                      to="/premium"
                      onClick={() => setIsOpen(false)}
                      className="relative flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-golden text-background shadow-golden font-medium overflow-hidden"
                    >
                      <Crown className="w-5 h-5" />
                      <span>{t("premium.title")}</span>
                      <span className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                        <span className="absolute inset-0 animate-[shimmer_3s_ease-in-out_infinite] bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.25)_50%,transparent_75%)] bg-[length:250%_100%]" />
                      </span>
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground hover:bg-muted/30 transition-colors"
                    >
                      <Settings className="w-5 h-5" />
                      <span>{t("nav.settings")}</span>
                    </Link>
                    <Link
                      to="/lyra"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground hover:bg-muted/30 transition-colors"
                    >
                      <Wand2 className="w-5 h-5" />
                      <span>Ask Lyra</span>
                    </Link>
                    <Link
                      to="/inner-world"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground hover:bg-muted/30 transition-colors"
                    >
                      <Moon className="w-5 h-5" />
                      <span>My Cosmos</span>
                    </Link>
                    <Link
                      to="/achievements"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground hover:bg-muted/30 transition-colors"
                    >
                      <Trophy className="w-5 h-5" />
                      <span>Achievements</span>
                    </Link>
                    <Link
                      to="/referral"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground hover:bg-muted/30 transition-colors"
                    >
                      <Gift className="w-5 h-5" />
                      <span>Referral Program</span>
                    </Link>
                    <Link
                      to="/safety"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground hover:bg-muted/30 transition-colors"
                    >
                      <Shield className="w-5 h-5" />
                      <span>Safety Center</span>
                    </Link>
                    <Link
                      to="/briefing"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground hover:bg-muted/30 transition-colors"
                    >
                      <Sun className="w-5 h-5" />
                      <span>Daily Briefing</span>
                    </Link>
                    <Link
                      to="/contact"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-foreground hover:bg-muted/30 transition-colors"
                    >
                      <Mail className="w-5 h-5" />
                      <span>Contact</span>
                    </Link>
                    <div className="h-px bg-border/40 my-2" />
                    <button
                      onClick={async () => {
                        setIsOpen(false);
                        await signOut();
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors text-left"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>{t("settings.sign_out")}</span>
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/30" role="navigation" aria-label="Bottom navigation" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="grid grid-cols-4 h-[72px] px-1 pb-[env(safe-area-inset-bottom,0px)]">
          {bottomTabs.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === "/profile"
              ? location.pathname === "/profile" || location.pathname.startsWith("/profile/")
              : location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-label={`${item.label}${item.badge && item.badge > 0 ? `, ${item.badge} unread` : ""}`}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-center rounded-xl transition-all duration-200 min-h-[44px] min-w-[44px] ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <div className="relative">
                  <Icon className={`h-[22px] w-[22px] transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
                  {!!item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span className={`max-w-full break-words text-[11px] font-medium leading-tight ${isActive ? "text-primary" : ""}`}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="bottomTabIndicator"
                    className="absolute top-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-primary"
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