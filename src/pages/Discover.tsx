import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CosmicBackground from "@/components/CosmicBackground";
import SwipeCard, { DiscoverProfile } from "@/components/SwipeCard";
import { Sparkles, Loader2, RefreshCw, Heart } from "lucide-react";
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
            // Find the matched profile from current stack
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

    // Optimistically remove from stack
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
        <div className="text-center mb-6 px-6">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-aurora bg-clip-text text-transparent mb-2">
            Cosmic Discovery
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Swipe through souls aligned with your cosmic blueprint
          </p>
        </div>

        <div className="relative w-full max-w-sm mx-auto px-4" style={{ height: 560 }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-muted-foreground text-sm">Reading the stars...</p>
            </div>
          ) : profiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <Sparkles className="w-12 h-12 text-accent" />
              <h3 className="text-xl font-semibold text-foreground">No more souls to discover</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                You've explored all available cosmic connections. Check back later as new souls join.
              </p>
              <Button onClick={fetchProfiles} variant="outline" className="mt-2">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
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
          <p className="text-muted-foreground text-xs mt-4">
            {profiles.length} soul{profiles.length !== 1 ? "s" : ""} in your queue
          </p>
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
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="bg-card border border-border rounded-3xl p-8 max-w-sm w-full text-center shadow-cosmic"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-golden flex items-center justify-center shadow-glow">
                <Heart className="w-10 h-10 text-foreground fill-current" />
              </div>
              <h2 className="text-3xl font-bold bg-gradient-golden bg-clip-text text-transparent mb-2">
                Soul Connection!
              </h2>
              <p className="text-muted-foreground mb-4">
                You and <span className="text-foreground font-semibold">{matchPopup.display_name}</span> share a {matchPopup.connection_type} bond
              </p>
              <p className="text-sm text-muted-foreground mb-6 italic">
                "{matchPopup.compatibility_reason}"
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setMatchPopup(null)}
                >
                  Keep Exploring
                </Button>
                <Button
                  className="flex-1 bg-gradient-aurora hover:opacity-90"
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
