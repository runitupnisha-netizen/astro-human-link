import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import CosmicBackground from "@/components/CosmicBackground";
import SwipeCard, { DiscoverProfile } from "@/components/SwipeCard";
import SacredIntentionFilters from "@/components/SacredIntentionFilters";
import AdvancedFilters, { AdvancedFilterState } from "@/components/AdvancedFilters";
import BoostButton from "@/components/BoostButton";
import StreakBadge from "@/components/StreakBadge";
import { Sparkles, Loader2, RefreshCw, Heart, Star, MessageCircle, Send, Filter, Crown, Undo2, Rocket, EyeOff, SlidersHorizontal } from "lucide-react";
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
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchPopup, setMatchPopup] = useState<DiscoverProfile | null>(null);
  const [swipeCount, setSwipeCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<any>(null);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterState | null>(null);
  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellFeature, setUpsellFeature] = useState<string>("super_like");
  const [lastSwipe, setLastSwipe] = useState<{ profile: DiscoverProfile; swipeId: string } | null>(null);
  const [dailyLikesUsed, setDailyLikesUsed] = useState(0);
  const [likeLimitReached, setLikeLimitReached] = useState(false);
  const [boostUntil, setBoostUntil] = useState<string | null>(null);
  const [isIncognito, setIsIncognito] = useState(false);

  const fetchProfiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const body: any = {};
      if (activeFilters?.max_distance_km && activeFilters.max_distance_km > 0) {
        body.max_distance_km = activeFilters.max_distance_km;
      }
      const { data, error } = await supabase.functions.invoke("discover-profiles", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setProfiles(data.profiles || []);
    } catch (e: any) {
      console.error("Discover error:", e);
      toast({
        title: "Couldn't load profiles",
        description: e.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast, activeFilters]);

  // Load boost/incognito state
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("boost_until, is_incognito").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data) {
          setBoostUntil(data.boost_until);
          setIsIncognito(data.is_incognito || false);
        }
      });
  }, [user]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Count today's likes for daily limit
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

  // Listen for new matches in realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("matches-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches" },
        (payload) => {
          const match = payload.new as any;
          if (match.user_a === user.id || match.user_b === user.id) {
            const matchedUserId = match.user_a === user.id ? match.user_b : match.user_a;
            const matchedProfile = profiles.find((p) => p.user_id === matchedUserId);
            if (matchedProfile) {
              setMatchPopup(matchedProfile);
            } else {
              toast({
                title: "✨ New Soul Connection!",
                description: "You both liked each other — go say hi!",
              });
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, profiles, toast]);

  const handleSwipe = async (direction: "left" | "right" | "super") => {
    if (profiles.length === 0) return;
    const topProfile = profiles[0];

    // Gate super likes behind premium
    if (direction === "super" && !isPremium) {
      setUpsellFeature("super_like");
      setShowUpsell(true);
      return;
    }

    // Daily like limit for free users
    if ((direction === "right" || direction === "super") && !isPremium && likeLimitReached) {
      setUpsellFeature("daily_likes");
      setShowUpsell(true);
      return;
    }

    const action = direction === "left" ? "pass" : direction === "super" ? "super_like" : "like";

    setProfiles((prev) => prev.slice(1));
    setSwipeCount((c) => c + 1);
    if (action !== "pass") {
      setDailyLikesUsed((c) => c + 1);
    }

    if (direction === "super") {
      toast({
        title: "⭐ Super Like Sent!",
        description: `${topProfile.display_name || "Someone special"} will definitely notice this one`,
      });
    }

    try {
      const { data, error } = await supabase.from("swipes").insert({
        user_id: user!.id,
        target_user_id: topProfile.user_id,
        action,
      }).select("id").single();
      if (error) throw error;
      // Store for undo
      setLastSwipe({ profile: topProfile, swipeId: data.id });
    } catch (e: any) {
      console.error("Swipe error:", e);
      toast({ title: "Swipe failed", description: e.message, variant: "destructive" });
    }
  };

  const handleUndo = async () => {
    if (!lastSwipe) return;
    if (!isPremium) {
      setUpsellFeature("undo");
      setShowUpsell(true);
      return;
    }
    try {
      const { error } = await supabase.from("swipes").delete().eq("id", lastSwipe.swipeId);
      if (error) throw error;
      setProfiles((prev) => [lastSwipe.profile, ...prev]);
      setSwipeCount((c) => Math.max(0, c - 1));
      toast({ title: "↩️ Undo successful", description: `${lastSwipe.profile.display_name || "Profile"} is back in your stack` });
      setLastSwipe(null);
    } catch (e: any) {
      console.error("Undo error:", e);
      toast({ title: "Undo failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <CosmicBackground />

      <div className="relative z-10 pt-20 pb-24 md:pb-12 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4 px-6"
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold bg-gradient-aurora bg-clip-text text-transparent mb-1">
            Cosmic Discovery
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Souls aligned with your unique{" "}
            <button onClick={() => navigate("/profile")} className="text-primary hover:underline underline-offset-2 transition-colors">cosmic blueprint</button>
          </p>
          {/* Streak badge */}
          <div className="flex justify-center mt-2">
            <StreakBadge />
          </div>
        </motion.div>

        {/* Filter + Undo + Boost row */}
        <div className="w-full max-w-sm mx-auto px-4 mb-4 flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="border-primary/30 hover:bg-primary/10"
            onClick={() => { setShowFilters(!showFilters); setShowAdvancedFilters(false); }}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="border-accent/30 hover:bg-accent/10"
            onClick={() => { setShowAdvancedFilters(!showAdvancedFilters); setShowFilters(false); }}
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Advanced
          </Button>

          {lastSwipe && (
            <Button
              variant="outline"
              size="sm"
              className="border-accent/30 hover:bg-accent/10 gap-1.5"
              onClick={handleUndo}
            >
              <Undo2 className="w-4 h-4" />
              Undo
              {!isPremium && <Crown className="w-3 h-3 text-accent" />}
            </Button>
          )}

          <BoostButton
            isPremium={isPremium}
            boostUntil={boostUntil}
            onBoostActivated={setBoostUntil}
            onUpsell={() => { setUpsellFeature("boost"); setShowUpsell(true); }}
          />

          {/* Incognito toggle (premium) */}
          <button
            onClick={async () => {
              if (!isPremium) { setUpsellFeature("incognito"); setShowUpsell(true); return; }
              const newVal = !isIncognito;
              setIsIncognito(newVal);
              await supabase.from("profiles").update({ is_incognito: newVal }).eq("user_id", user!.id);
              toast({ title: newVal ? "👻 Incognito On" : "👋 Visible Again", description: newVal ? "You're browsing invisibly" : "You're back in discovery" });
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
              isIncognito ? "bg-primary/15 text-primary border-primary/30" : "border-border/30 text-muted-foreground hover:border-border"
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            {isIncognito ? "Incognito" : ""}
            {!isPremium && <Crown className="w-3 h-3 text-accent" />}
          </button>

          {/* Daily likes counter for free users */}
          {!isPremium && (
            <span className="ml-auto text-xs text-muted-foreground">
              {Math.max(0, FREE_DAILY_LIKE_LIMIT - dailyLikesUsed)}/{FREE_DAILY_LIKE_LIMIT} likes
            </span>
          )}
        </div>

        {/* Sacred Intention Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <div className="w-full max-w-sm mx-auto px-4 mb-4">
              <SacredIntentionFilters
                onApply={(filters) => setActiveFilters(filters)}
                onClose={() => setShowFilters(false)}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Advanced Filter Panel */}
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

        <div className="relative w-full max-w-sm mx-auto px-4" style={{ height: 560 }}>
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full gap-4"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-white/10 rounded-full blur-xl animate-pulse scale-150" />
                <Loader2 className="relative w-10 h-10 text-primary animate-spin" />
              </div>
              <p className="text-muted-foreground text-sm font-serif">Finding your people…</p>
            </motion.div>
          ) : profiles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full gap-6 text-center px-4"
            >
              {/* Animated constellation icon */}
              <div className="relative">
                <motion.div
                  className="absolute inset-0 bg-accent/10 rounded-full blur-3xl"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute inset-0 bg-primary/10 rounded-full blur-2xl"
                  animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                  className="relative w-28 h-28 rounded-full border border-primary/20 flex items-center justify-center"
                >
                  {/* Orbiting dots */}
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 rounded-full bg-accent shadow-glow"
                      style={{
                        top: `${50 - 45 * Math.cos((i * 2 * Math.PI) / 3)}%`,
                        left: `${50 + 45 * Math.sin((i * 2 * Math.PI) / 3)}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                      animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: "easeInOut" }}
                    />
                  ))}
                  <div className="w-16 h-16 rounded-full bg-gradient-mystical flex items-center justify-center shadow-mystical">
                    <Sparkles className="w-8 h-8 text-accent" />
                  </div>
                </motion.div>
              </div>

              <div className="space-y-2">
                <h3 className="font-display text-2xl font-bold bg-gradient-golden bg-clip-text text-transparent">
                  {swipeCount > 0 ? "You've Seen Everyone!" : "More People Coming Soon"}
                </h3>
                <p className="text-muted-foreground text-sm max-w-xs leading-relaxed font-serif">
                  {swipeCount > 0
                    ? "You've been through everyone for now. New people join daily — check back soon!"
                    : "Your profile is all set. As more people join, curated matches will show up right here."}
                </p>
              </div>

              {/* Tips section */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="w-full max-w-xs glass-card rounded-2xl p-4 space-y-3"
              >
                <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">While you wait</p>
                <div className="space-y-2.5">
                  {[
                    { icon: "✨", text: "Finish your profile to get better matches", action: () => navigate("/profile") },
                    { icon: "📖", text: "Check out your weekly insights", action: () => navigate("/insights") },
                    { icon: "💬", text: "Post something in the community feed", action: () => navigate("/feed") },
                  ].map((tip, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      onClick={tip.action}
                      className="flex items-center gap-3 w-full text-left p-2 rounded-xl hover:bg-primary/10 transition-colors group"
                    >
                      <span className="text-lg">{tip.icon}</span>
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors font-serif">{tip.text}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              <div className="flex gap-3 pt-1">
                <Button onClick={fetchProfiles} variant="outline" className="border-primary/30 hover:bg-primary/10 gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
                {swipeCount > 0 && (
                  <Button
                    onClick={() => navigate("/connections")}
                    className="gap-2"
                    style={{ background: "var(--gradient-aurora)" }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    View Matches
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            <AnimatePresence>
              {profiles.slice(0, 3).map((profile, index) => (
                <SwipeCard
                  key={profile.user_id}
                  profile={profile}
                  onSwipe={handleSwipe}
                  isTop={index === 0}
                  stackIndex={index}
                  isPremium={isPremium}
                />
              ))}
            </AnimatePresence>
        )}

        {/* Premium upsell banner after 5 swipes */}
        <AnimatePresence>
          {!isPremium && swipeCount >= 5 && swipeCount < 100 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-sm mx-auto px-4 mt-4"
            >
              <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-card/80 backdrop-blur-sm p-4">
                <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-primary/5 to-accent/5" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-golden flex items-center justify-center shrink-0">
                    <Crown className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm font-bold text-foreground">Unlock Stellara Premium</p>
                    <p className="text-xs text-muted-foreground">Super Likes, see who liked you & full synastry charts</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate("/premium")}
                    className="shrink-0 bg-gradient-golden text-primary-foreground hover:opacity-90"
                  >
                    Upgrade
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>

        {!loading && profiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-2 mt-4"
          >
            <p className="text-muted-foreground text-xs">
              {profiles.length} {profiles.length !== 1 ? "people" : "person"} in your queue
            </p>
            <button
              onClick={() => !isPremium ? setShowUpsell(true) : handleSwipe("super")}
              className="text-muted-foreground/50 text-[10px] hover:text-primary/70 transition-colors"
            >
              Swipe up for ⭐ Super Like
            </button>
          </motion.div>
        )}
      </div>

      <MatchCelebration
        profile={matchPopup}
        onClose={() => setMatchPopup(null)}
        onMessage={() => {
          setMatchPopup(null);
          navigate("/messages");
        }}
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
