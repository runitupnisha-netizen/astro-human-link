import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CosmicBackground from "@/components/CosmicBackground";
import SwipeCard, { DiscoverProfile } from "@/components/SwipeCard";
import { Sparkles, Loader2, RefreshCw, Heart, Star, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const Discover = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchPopup, setMatchPopup] = useState<DiscoverProfile | null>(null);
  const [swipeCount, setSwipeCount] = useState(0);

  const fetchProfiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("discover-profiles");
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
  }, [user, toast]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

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
                description: "You've matched with a cosmic soul!",
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
    const action = direction === "left" ? "pass" : direction === "super" ? "super_like" : "like";

    setProfiles((prev) => prev.slice(1));
    setSwipeCount((c) => c + 1);

    if (direction === "super") {
      toast({
        title: "⭐ Super Like Sent!",
        description: `${topProfile.display_name || "Cosmic Soul"} will see your cosmic enthusiasm`,
      });
    }

    try {
      const { error } = await supabase.from("swipes").insert({
        user_id: user!.id,
        target_user_id: topProfile.user_id,
        action,
      });
      if (error) throw error;
    } catch (e: any) {
      console.error("Swipe error:", e);
      toast({ title: "Swipe failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <CosmicBackground />

      <div className="relative z-10 pt-20 pb-12 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 px-6"
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold bg-gradient-aurora bg-clip-text text-transparent mb-2">
            Cosmic Discovery
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Swipe through souls aligned with your cosmic blueprint
          </p>
        </motion.div>

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
              <p className="text-muted-foreground text-sm font-serif">Reading the stars...</p>
            </motion.div>
          ) : profiles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full gap-5 text-center px-4"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-white/15 rounded-full blur-2xl animate-pulse scale-150" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-mystical flex items-center justify-center shadow-mystical">
                  <Star className="w-12 h-12 text-accent" />
                </div>
              </div>
              <h3 className="font-display text-2xl font-bold text-foreground">
                {swipeCount > 0 ? "You've Explored Every Soul" : "The Cosmos Is Aligning..."}
              </h3>
              <p className="text-muted-foreground text-sm max-w-xs leading-relaxed font-serif">
                {swipeCount > 0
                  ? "You've seen everyone available right now. New cosmic souls join daily — check back soon for fresh connections."
                  : "Your cosmic blueprint is ready, but there are no new souls to discover right now. As more people join, AI-curated matches will appear here."}
              </p>
              <div className="flex flex-col gap-3 items-center">
                <div className="flex gap-3">
                  <Button onClick={fetchProfiles} variant="outline" className="border-primary/30 hover:bg-primary/10">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Check Again
                  </Button>
                  {swipeCount > 0 && (
                    <Button
                      onClick={() => navigate("/connections")}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      View Matches
                    </Button>
                  )}
                </div>
                {/* DEBUG: Preview match popup — remove before production */}
                <Button
                  variant="outline"
                  size="sm"
                  className="border-accent/30 text-accent hover:bg-accent/10 text-xs"
                  onClick={() => setMatchPopup({
                    user_id: "debug-preview",
                    display_name: "Luna Solstice",
                    sun_sign: "Gemini",
                    moon_sign: "Pisces",
                    rising_sign: "Scorpio",
                    human_design_type: "Manifesting Generator",
                    compatibility_score: 87,
                    compatibility_reason: "Your Sacral energy and her Pisces Moon create an effortless emotional magnetism — rare and worth exploring.",
                    connection_type: "Twin Flame",
                    shared_aspects: ["Moon Trine Venus", "Sacral Synergy", "Gate 55 Resonance"],
                    avatar_url: null,
                    interests: ["Yoga", "Astrology", "Sound Healing"],
                    compatibility_tags: ["Deep Thinker", "Empath"],
                  } as any)}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Preview Match Popup
                </Button>
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
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {!loading && profiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-2 mt-4"
          >
            <p className="text-muted-foreground text-xs">
              {profiles.length} soul{profiles.length !== 1 ? "s" : ""} in your queue
            </p>
            <p className="text-muted-foreground/50 text-[10px]">
              Swipe up for ⭐ Super Like
            </p>
          </motion.div>
        )}
      </div>

      {/* Match popup */}
      <AnimatePresence>
        {matchPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setMatchPopup(null)}
          >
            <motion.div
              initial={{ scale: 0.3, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="bg-card border border-border rounded-3xl p-8 max-w-sm w-full text-center shadow-cosmic relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative sparkles */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(16)].map((_, i) => (
                  <motion.div
                    key={i}
                    className={`absolute w-1.5 h-1.5 rounded-full ${i % 3 === 0 ? "bg-accent" : i % 3 === 1 ? "bg-primary" : "bg-foreground/50"}`}
                    initial={{
                      x: "50%",
                      y: "40%",
                      opacity: 0,
                      scale: 0,
                    }}
                    animate={{
                      x: `${10 + Math.random() * 80}%`,
                      y: `${5 + Math.random() * 90}%`,
                      opacity: [0, 1, 0],
                      scale: [0, 1.5 + Math.random(), 0],
                    }}
                    transition={{
                      duration: 1.8,
                      delay: 0.1 + i * 0.06,
                      ease: "easeOut",
                    }}
                  />
                ))}
              </div>

              {/* Glowing background pulse */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-b from-accent/5 via-primary/5 to-transparent rounded-3xl"
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className="relative z-10">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.15, damping: 12 }}
                  className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center shadow-glow"
                  style={{ background: "var(--gradient-golden)" }}
                >
                  <Heart className="w-10 h-10 text-accent-foreground fill-current" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="font-display text-2xl font-bold bg-gradient-golden bg-clip-text text-transparent mb-1"
                >
                  Soul Connection!
                </motion.h2>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <p className="text-muted-foreground text-sm font-serif mb-3">
                    You and <span className="text-foreground font-semibold">{matchPopup.display_name}</span>
                  </p>
                </motion.div>

                {/* Compatibility Score Ring */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: "spring", damping: 15 }}
                  className="flex flex-col items-center mb-4"
                >
                  <div className="relative w-28 h-28">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" opacity="0.3" />
                      <motion.circle
                        cx="50" cy="50" r="42" fill="none"
                        stroke={
                          (matchPopup.compatibility_score || 0) >= 80 ? "hsl(var(--accent))"
                          : (matchPopup.compatibility_score || 0) >= 65 ? "hsl(var(--primary))"
                          : "hsl(var(--muted-foreground))"
                        }
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 42}`}
                        initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - (matchPopup.compatibility_score || 0) / 100) }}
                        transition={{ delay: 0.7, duration: 1.2, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="font-display text-2xl font-bold text-foreground"
                      >
                        {matchPopup.compatibility_score || "?"}%
                      </motion.span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">aligned</span>
                    </div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="mt-2"
                  >
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                      (matchPopup.compatibility_score || 0) >= 82 ? "bg-accent/15 text-accent border border-accent/30"
                      : (matchPopup.compatibility_score || 0) >= 65 ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-muted text-muted-foreground border border-border"
                    }`}>
                      {matchPopup.connection_type || "Cosmic Connection"}
                    </span>
                  </motion.div>
                </motion.div>

                {/* Shared Aspects Pills */}
                {matchPopup.shared_aspects && matchPopup.shared_aspects.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.1 }}
                    className="flex flex-wrap justify-center gap-1.5 mb-3"
                  >
                    {matchPopup.shared_aspects.slice(0, 3).map((aspect, i) => (
                      <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/40">
                        {aspect}
                      </span>
                    ))}
                  </motion.div>
                )}

                {/* Reason */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  className="text-xs text-muted-foreground mb-5 italic font-serif leading-relaxed px-2"
                >
                  "{matchPopup.compatibility_reason}"
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex gap-3"
                >
                  <Button
                    variant="outline"
                    className="flex-1 border-border/50"
                    onClick={() => setMatchPopup(null)}
                  >
                    Keep Exploring
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    style={{ background: "var(--gradient-aurora)" }}
                    onClick={() => {
                      setMatchPopup(null);
                      navigate("/messages");
                    }}
                  >
                    <Send className="w-4 h-4" />
                    Message
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Discover;
