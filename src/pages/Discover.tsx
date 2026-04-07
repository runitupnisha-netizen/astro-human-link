import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import { useTranslation } from "@/hooks/useTranslation";
import CosmicBackground from "@/components/CosmicBackground";
import SwipeCard, { DiscoverProfile } from "@/components/SwipeCard";
import AdvancedFilters, { AdvancedFilterState } from "@/components/AdvancedFilters";
import { Sparkles, Loader2, RefreshCw, MessageCircle, SlidersHorizontal, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import PremiumUpsellModal from "@/components/PremiumUpsellModal";
import MatchCelebration from "@/components/MatchCelebration";
import { demoProfiles } from "@/data/demoProfiles";

const FREE_DAILY_LIKE_LIMIT = 15;

const Discover = () => {
  const { user } = useAuth();
  const { subscribed: isPremium } = usePremium();
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchPopup, setMatchPopup] = useState<DiscoverProfile | null>(null);
  const [swipeCount, setSwipeCount] = useState(0);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterState | null>(null);
  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellFeature, setUpsellFeature] = useState<string>("super_like");
  const [dailyLikesUsed, setDailyLikesUsed] = useState(0);
  const [likeLimitReached, setLikeLimitReached] = useState(false);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | "super" | null>(null);
  const [pendingSwipe, setPendingSwipe] = useState<{
    profileId: string;
    action: "pass" | "like" | "super_like";
  } | null>(null);

  const fetchProfiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("discover-profiles", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const fetched = data.profiles || [];
      setProfiles(fetched.length > 0 ? fetched : demoProfiles);
    } catch (e: any) {
      console.error("Discover error:", e);
      toast({ title: "Couldn't load profiles", description: e.message || "Please try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  // Count today's likes
  useEffect(() => {
    if (!user || isPremium) return;
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("swipes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("action", ["like", "super_like"])
      .gte("created_at", `${today}T00:00:00Z`)
      .then(({ count }) => {
        const used = count || 0;
        setDailyLikesUsed(used);
        setLikeLimitReached(used >= FREE_DAILY_LIKE_LIMIT);
      });
  }, [user, isPremium, swipeCount]);

  // Realtime match listener
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("matches-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "matches" }, (payload) => {
        const match = payload.new as any;
        if (match.user_a === user.id || match.user_b === user.id) {
          const matchedId = match.user_a === user.id ? match.user_b : match.user_a;
          const matchedProfile = profiles.find((p) => p.user_id === matchedId);
          if (matchedProfile) setMatchPopup(matchedProfile);
          else toast({ title: "✨ New Soul Connection!", description: "You both liked each other — go say hi!" });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, profiles, toast]);

  const finalizeSwipe = useCallback(() => {
    if (!pendingSwipe) return;

    setProfiles((prev) => {
      if (prev[0]?.user_id === pendingSwipe.profileId) {
        return prev.slice(1);
      }

      return prev.filter((profile) => profile.user_id !== pendingSwipe.profileId);
    });
    setSwipeCount((count) => count + 1);

    if (pendingSwipe.action !== "pass") {
      setDailyLikesUsed((count) => count + 1);
    }

    setExitDirection(null);
    setPendingSwipe(null);
  }, [pendingSwipe]);

  const handleSwipe = async (direction: "left" | "right" | "super") => {
    if (profiles.length === 0 || pendingSwipe) return;
    const topProfile = profiles[0];

    if (direction === "super" && !isPremium) {
      setUpsellFeature("super_like");
      setShowUpsell(true);
      return;
    }
    if ((direction === "right" || direction === "super") && !isPremium && likeLimitReached) {
      setUpsellFeature("daily_likes");
      setShowUpsell(true);
      return;
    }

    const action = direction === "left" ? "pass" : direction === "super" ? "super_like" : "like";

    // Start exit animation and only remove the card once it has fully cleared the viewport
    setPendingSwipe({ profileId: topProfile.user_id, action });
    setExitDirection(direction);

    if (direction === "super") {
      toast({ title: "⭐ Super Like Sent!", description: `${topProfile.display_name || "Someone special"} will notice this one` });
    }

    const isDemo = topProfile.user_id.startsWith("demo-");
    if (!isDemo) {
      try {
        await supabase.from("swipes").insert({
          user_id: user!.id,
          target_user_id: topProfile.user_id,
          action,
        });
      } catch (e: any) {
        console.error("Swipe error:", e);
      }
    }
  };

  const likesLeft = Math.max(0, FREE_DAILY_LIKE_LIMIT - dailyLikesUsed);
  const visibleProfiles = pendingSwipe ? profiles.slice(0, 1) : profiles.slice(0, 3);

  return (
    <div className="min-h-screen bg-background relative">
      <CosmicBackground />

      <div className="relative z-10 pt-[60px] pb-[80px] md:pt-20 md:pb-12 flex flex-col items-center">
        {/* Clean header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-2 px-6"
        >
          <h1 className="font-display text-2xl md:text-3xl font-bold bg-gradient-aurora bg-clip-text text-transparent">
            {t("discover.title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t("discover.subtitle")}</p>
        </motion.div>

        {/* Minimal toolbar */}
        <div className="w-full max-w-sm mx-auto px-4 mb-2 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            className="border-border/40 hover:bg-muted/30"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <SlidersHorizontal className="w-4 h-4 mr-1.5" />
            Filters
          </Button>

          {!isPremium && (
            <span className="text-xs text-muted-foreground">
              {likesLeft} likes left today
            </span>
          )}
        </div>

        {/* Filter panel */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <div className="w-full max-w-sm mx-auto px-4 mb-4">
              <AdvancedFilters
                onApply={(filters) => { setAdvancedFilters(filters); fetchProfiles(); }}
                onClose={() => setShowAdvancedFilters(false)}
                initialFilters={advancedFilters || undefined}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Card stack */}
        <div className="relative w-full max-w-sm mx-auto px-4 h-[calc(100dvh-260px)] md:h-[580px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-muted-foreground text-sm">{t("discover.loading")}</p>
            </div>
          ) : profiles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full gap-6 text-center px-4"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-mystical flex items-center justify-center shadow-mystical">
                <Sparkles className="w-10 h-10 text-accent" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-2xl font-bold bg-gradient-golden bg-clip-text text-transparent">
                  {swipeCount > 0 ? t("discover.seen_everyone") : t("discover.more_coming")}
                </h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  {swipeCount > 0 ? t("discover.seen_everyone_desc") : t("discover.more_coming_desc")}
                </p>
              </div>
              <div className="flex gap-3">
                <Button onClick={fetchProfiles} variant="outline" className="gap-2">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </Button>
                {swipeCount > 0 && (
                  <Button onClick={() => navigate("/connections")} className="gap-2" style={{ background: "var(--gradient-aurora)" }}>
                    <MessageCircle className="w-4 h-4" /> View Matches
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            <AnimatePresence initial={false} mode="sync">
              {visibleProfiles.map((profile, index) => (
                <SwipeCard
                  key={profile.user_id}
                  profile={profile}
                  onSwipe={handleSwipe}
                  isTop={index === 0}
                  stackIndex={index}
                  isPremium={isPremium}
                  exitDirection={index === 0 && pendingSwipe?.profileId === profile.user_id ? exitDirection : null}
                  onExitComplete={index === 0 && pendingSwipe?.profileId === profile.user_id ? finalizeSwipe : undefined}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Premium upsell — only after significant use */}
        {!isPremium && swipeCount >= 8 && profiles.length > 0 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => navigate("/premium")}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full border border-accent/30 bg-card/60 backdrop-blur-sm text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Crown className="w-4 h-4 text-accent" />
            Unlock Super Likes & more
          </motion.button>
        )}
      </div>

      <MatchCelebration
        profile={matchPopup}
        onClose={() => setMatchPopup(null)}
        onMessage={() => { setMatchPopup(null); navigate("/messages"); }}
      />

      <PremiumUpsellModal
        open={showUpsell}
        onClose={() => setShowUpsell(false)}
        feature={upsellFeature as any}
      />
    </div>
  );
};

export default Discover;
