import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import CosmicBackground from "@/components/CosmicBackground";
import type { DiscoverProfile } from "@/types/discoverProfile";
import AdvancedFilters, { AdvancedFilterState } from "@/components/AdvancedFilters";
import { Sparkles, RefreshCw, MessageCircle, SlidersHorizontal, Crown, User as UserIcon } from "lucide-react";
import TourHighlight from "@/components/TourHighlight";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import PremiumUpsellModal from "@/components/PremiumUpsellModal";
import MatchCelebration from "@/components/MatchCelebration";
import BoostButton from "@/components/BoostButton";
import { demoProfiles } from "@/data/demoProfiles";
import { ProfileCardSkeleton } from "@/components/Skeletons";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { prefetchImages } from "@/lib/imagePrefetch";
import { useConnectionActions, FREE_DAILY_LIKE_LIMIT } from "@/hooks/useConnectionActions";

const sanitizeName = (name: string | null): string | null => {
  if (!name) return null;
  if (name.includes("@")) return null;
  const trimmed = name.trim();
  if (!trimmed.includes(" ") && /^[a-z0-9]{8,}$/i.test(trimmed)) return null;
  return trimmed;
};

const Discover = () => {
  const { user } = useAuth();
  const { isPremium, likesLeft } = useConnectionActions();
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchPopup, setMatchPopup] = useState<DiscoverProfile | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterState | null>(null);
  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellFeature, setUpsellFeature] = useState<string>("super_like");
  const [boostUntil, setBoostUntil] = useState<string | null>(null);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);


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

  // Prefetch tile photos so the grid never flashes blank avatars.
  useEffect(() => {
    if (profiles.length === 0) return;
    prefetchImages(profiles.slice(0, 12).map((p) => p.avatar_url));
  }, [profiles]);

  // Pull-to-refresh
  const { containerRef, pullIndicator, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: fetchProfiles,
  });

  // Fetch boost status & avatar
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("boost_until, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.boost_until) setBoostUntil(data.boost_until);
        if (data?.avatar_url) setMyAvatarUrl(data.avatar_url);
      });
  }, [user]);

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
          else toast({ title: "✨ New Connection!", description: "You're both aligned — say hello when you're ready." });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, profiles, toast]);

  const compatibilityRing = (score: number) => {
    const color =
      score >= 80 ? "hsl(142, 71%, 45%)" : score >= 60 ? "hsl(var(--accent))" : "hsl(var(--primary))";
    return (
      <svg width="42" height="42" viewBox="0 0 42 42" className="absolute top-2 right-2 drop-shadow">
        <circle cx="21" cy="21" r="18" fill="rgba(0,0,0,0.55)" />
        <circle
          cx="21"
          cy="21"
          r="17"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="2"
          opacity="0.35"
        />
        <circle
          cx="21"
          cy="21"
          r="17"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 17}`}
          strokeDashoffset={`${2 * Math.PI * 17 * (1 - score / 100)}`}
          transform="rotate(-90 21 21)"
        />
        <text
          x="21"
          y="25"
          textAnchor="middle"
          className="fill-foreground"
          style={{ font: "700 11px var(--font-display, sans-serif)" }}
        >
          {score}%
        </text>
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-background relative">
      <CosmicBackground />

      <div ref={containerRef} {...pullHandlers} className="relative z-10 flex flex-col items-center pt-16 pb-[110px] md:pt-24 md:pb-12 overflow-y-auto">
        {pullIndicator}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-3 px-6"
        >
          <h1 className="font-display text-2xl md:text-3xl font-bold bg-gradient-aurora bg-clip-text text-transparent">
            {t("discover.title")}
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            Tap a profile to read their cosmic blueprint.
          </p>
        </motion.div>

        {/* Toolbar */}
        <div className="w-full max-w-2xl mx-auto px-4 mb-3 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-border/40 hover:bg-muted/40 active:scale-95 transition-transform touch-manipulation"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <SlidersHorizontal className="w-4 h-4 mr-1.5" />
            Filters
          </Button>

          <div className="flex items-center gap-2">
            <BoostButton
              isPremium={isPremium}
              boostUntil={boostUntil}
              onBoostActivated={(until) => setBoostUntil(until)}
              onUpsell={() => { setUpsellFeature("boost"); setShowUpsell(true); }}
            />
            {!isPremium && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${likesLeft <= 3 ? "border-accent/40 bg-accent/10 text-accent" : "border-border/40 bg-muted/30 text-muted-foreground"}`}>
                {likesLeft} {likesLeft === 1 ? "like" : "likes"} left
              </span>
            )}
          </div>
        </div>

        {/* Filter panel */}
        {showAdvancedFilters && (
          <div className="w-full max-w-2xl mx-auto px-4 mb-4">
            <AdvancedFilters
              onApply={(filters) => { setAdvancedFilters(filters); fetchProfiles(); }}
              onClose={() => setShowAdvancedFilters(false)}
              initialFilters={advancedFilters || undefined}
            />
          </div>
        )}

        {/* Browse grid */}
        <TourHighlight
          targetId="connection-grid"
          label="Connection grid"
          className="relative w-full max-w-2xl mx-auto px-3"
        >
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProfileCardSkeleton key={i} />
              ))}
            </div>
          ) : profiles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center gap-6 text-center px-4 py-16"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-mystical flex items-center justify-center shadow-mystical">
                <Sparkles className="w-10 h-10 text-accent" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-2xl font-bold bg-gradient-golden bg-clip-text text-transparent">
                  {t("discover.more_coming")}
                </h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  {t("discover.more_coming_desc")}
                </p>
              </div>
              <div className="flex gap-3">
                <Button onClick={fetchProfiles} variant="outline" className="gap-2">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </Button>
                <Button onClick={() => navigate("/connections")} className="gap-2" style={{ background: "var(--gradient-aurora)" }}>
                  <MessageCircle className="w-4 h-4" /> View Connections
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {profiles.map((profile, idx) => {
                const name = sanitizeName(profile.display_name) || "Cosmic Soul";
                const topTags = (profile.compatibility_tags || []).slice(0, 2);
                const photo = profile.avatar_url || profile.photo_urls?.[0] || null;
                return (
                  <motion.button
                    key={profile.user_id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.3) }}
                    onClick={() => navigate(`/profile/${profile.user_id}`)}
                    className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm text-left active:scale-[0.98] transition-transform touch-manipulation focus:outline-none focus:ring-2 focus:ring-accent/50"
                    aria-label={`Open ${name}'s profile`}
                  >
                    <div className="relative aspect-[3/4] w-full bg-muted/40">
                      {photo ? (
                        <img
                          src={photo}
                          alt=""
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-mystical">
                          <UserIcon className="w-10 h-10 text-foreground/60" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      {compatibilityRing(profile.compatibility_score)}
                      <div className="absolute bottom-0 inset-x-0 p-2.5">
                        <p className="text-sm font-semibold text-white truncate">
                          {name}
                        </p>
                        {topTags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {topTags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-[10px] py-0 px-1.5 bg-white/15 text-white border-none backdrop-blur-sm"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </TourHighlight>

        {/* Premium upsell — once they've engaged with the grid */}
        {!isPremium && profiles.length > 0 && likesLeft <= FREE_DAILY_LIKE_LIMIT - 5 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => navigate("/premium")}
            className="mt-6 flex items-center gap-2 px-4 py-2 rounded-full border border-accent/30 bg-card/60 backdrop-blur-sm text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Crown className="w-4 h-4 text-accent" />
            Unlock Spotlights & unlimited likes
          </motion.button>
        )}
      </div>

      <MatchCelebration
        profile={matchPopup}
        myAvatar={myAvatarUrl}
        onClose={() => setMatchPopup(null)}
        onMessage={() => {
          const matchedId = matchPopup?.user_id;
          setMatchPopup(null);
          if (matchedId) {
            // Find the match record to navigate to the right conversation
            supabase.from("matches").select("id")
              .or(`and(user_a.eq.${user!.id},user_b.eq.${matchedId}),and(user_a.eq.${matchedId},user_b.eq.${user!.id})`)
              .maybeSingle()
              .then(({ data }) => {
                if (data) navigate(`/messages?match=${data.id}`);
                else navigate("/connections");
              });
          } else {
            navigate("/connections");
          }
        }}
      />

      <PremiumUpsellModal
        open={showUpsell}
        onClose={() => setShowUpsell(false)}
        feature={upsellFeature as any}
      />

      {/* Soulmate Sketch persistent entry — floats just above the bottom nav */}
      <button
        onClick={() => navigate("/soulmate-sketch")}
        className="fixed left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs transition-all active:scale-95 shadow-lg"
        style={{
          bottom: "calc(76px + env(safe-area-inset-bottom, 0px))",
          backgroundColor: "rgba(77, 58, 92, 0.85)",
          color: "#d0b4f7",
          border: "0.5px solid rgba(208,180,247,0.35)",
          backdropFilter: "blur(8px)",
        }}
        aria-label="Open Connection Vision"
      >
        <span aria-hidden>✦</span> Connection Vision
      </button>
    </div>
  );
};

export default Discover;
