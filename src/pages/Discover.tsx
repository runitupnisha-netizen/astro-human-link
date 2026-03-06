import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CosmicBackground from "@/components/CosmicBackground";
import SwipeCard, { DiscoverProfile } from "@/components/SwipeCard";
import { Sparkles, Loader2, RefreshCw, Heart, Star } from "lucide-react";
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

  const handleSwipe = async (direction: "left" | "right") => {
    if (profiles.length === 0) return;
    const topProfile = profiles[0];
    const action = direction === "right" ? "like" : "pass";

    setProfiles((prev) => prev.slice(1));

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
              <p className="text-muted-foreground text-sm">Reading the stars...</p>
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
              <h3 className="font-display text-2xl font-bold text-foreground">The Cosmos Is Aligning...</h3>
              <p className="text-muted-foreground text-sm max-w-xs leading-relaxed font-serif">
                Your cosmic blueprint is ready, but there are no new souls to discover right now. As more people join, AI-curated matches based on your unique astrological synastry will appear here.
              </p>
              <Button onClick={fetchProfiles} variant="outline" className="mt-2 border-primary/30 hover:bg-primary/10">
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Again
              </Button>
            </motion.div>
          ) : (
            <>
              {profiles.slice(0, 3).map((profile, index) => (
                <SwipeCard
                  key={profile.user_id}
                  profile={profile}
                  onSwipe={handleSwipe}
                  isTop={index === 0}
                />
              ))}
            </>
          )}
        </div>

        {!loading && profiles.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-muted-foreground text-xs mt-4"
          >
            {profiles.length} soul{profiles.length !== 1 ? "s" : ""} in your queue
          </motion.p>
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
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full bg-accent"
                    initial={{
                      x: "50%",
                      y: "40%",
                      opacity: 0,
                      scale: 0,
                    }}
                    animate={{
                      x: `${15 + Math.random() * 70}%`,
                      y: `${10 + Math.random() * 80}%`,
                      opacity: [0, 1, 0],
                      scale: [0, 1.5, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      delay: 0.2 + i * 0.08,
                      ease: "easeOut",
                    }}
                  />
                ))}
              </div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2, damping: 12 }}
                className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-golden flex items-center justify-center shadow-glow"
              >
                <Heart className="w-10 h-10 text-foreground fill-current" />
              </motion.div>

              <h2 className="font-display text-3xl font-bold bg-gradient-golden bg-clip-text text-transparent mb-2">
                Soul Connection!
              </h2>
              <p className="text-muted-foreground mb-4 font-serif">
                You and <span className="text-foreground font-semibold">{matchPopup.display_name}</span> share a{" "}
                <span className="text-accent font-semibold">{matchPopup.connection_type}</span> bond
              </p>
              <p className="text-sm text-muted-foreground mb-6 italic font-serif">
                "{matchPopup.compatibility_reason}"
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-border/50"
                  onClick={() => setMatchPopup(null)}
                >
                  Keep Exploring
                </Button>
                <Button
                  className="flex-1"
                  style={{ background: "var(--gradient-aurora)" }}
                  onClick={() => {
                    setMatchPopup(null);
                    navigate("/messages");
                  }}
                >
                  Send Message
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Discover;
