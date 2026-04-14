import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CosmicBackground from "@/components/CosmicBackground";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Star, Heart, User, Loader2, Eye, MessageCircle, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface RevealProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  sun_sign: string | null;
  moon_sign: string | null;
  rising_sign: string | null;
  human_design_type: string | null;
  life_path_number: number | null;
  compatibility_tags: string[] | null;
  gene_keys_life_purpose: string | null;
  interests: string[] | null;
}

const SacredReveal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [revealProfile, setRevealProfile] = useState<RevealProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [alreadyRevealed, setAlreadyRevealed] = useState(false);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!user) return;

    const checkReveal = async () => {
      const today = new Date().toISOString().split("T")[0];

      // Check if already revealed today
      const { data: existing } = await supabase
        .from("daily_reveals")
        .select("*")
        .eq("user_id", user.id)
        .eq("reveal_date", today)
        .maybeSingle();

      if (existing) {
        // Already have today's reveal - fetch the profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, sun_sign, moon_sign, rising_sign, human_design_type, life_path_number, compatibility_tags, gene_keys_life_purpose, interests")
          .eq("user_id", existing.revealed_user_id)
          .single();

        if (profile) {
          setRevealProfile(profile);
          setAlreadyRevealed(existing.viewed);
          if (existing.viewed) setRevealed(true);
        }
      } else {
        // Pick a random profile for today's reveal
        const { data: swipedIds } = await supabase
          .from("swipes")
          .select("target_user_id")
          .eq("user_id", user.id);

        const excludeIds = [user.id, ...(swipedIds || []).map(s => s.target_user_id)];

        const { data: candidates } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, sun_sign, moon_sign, rising_sign, human_design_type, life_path_number, compatibility_tags, gene_keys_life_purpose, interests")
          .eq("onboarding_complete", true)
          .not("user_id", "in", `(${excludeIds.join(",")})`)
          .limit(20);

        if (candidates && candidates.length > 0) {
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          setRevealProfile(pick);

          await supabase.from("daily_reveals").insert({
            user_id: user.id,
            revealed_user_id: pick.user_id,
            reveal_date: today,
          });
        }
      }
      setLoading(false);
    };

    checkReveal();
  }, [user]);

  // Countdown to midnight
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      setCountdown({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleReveal = async () => {
    setRevealed(true);
    if (user) {
      const today = new Date().toISOString().split("T")[0];
      await supabase
        .from("daily_reveals")
        .update({ viewed: true })
        .eq("user_id", user.id)
        .eq("reveal_date", today);
    }
  };

  const handleLike = async () => {
    if (!user || !revealProfile) return;
    try {
      await supabase.from("swipes").insert({
        user_id: user.id,
        target_user_id: revealProfile.user_id,
        action: "like",
      });
      toast({ title: "💜 You liked them!" });
    } catch (e: any) {
      toast({ title: "Already swiped", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <CosmicBackground />
      <div className="relative z-10 pt-20 pb-12 flex flex-col items-center">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8 px-6">
           <h1 className="font-display text-3xl md:text-4xl font-bold bg-gradient-golden bg-clip-text text-transparent mb-2">
            Sacred Match Reveal
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto font-serif">
            The cosmos has chosen one soul for you today
          </p>
        </motion.div>

        {/* Countdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex gap-3 mb-8"
        >
          {[
            { val: countdown.hours, label: "HRS" },
            { val: countdown.minutes, label: "MIN" },
            { val: countdown.seconds, label: "SEC" },
          ].map((t, i) => (
            <div key={i} className="text-center">
              <div className="w-16 h-16 rounded-xl bg-card/70 backdrop-blur-sm border border-border/40 flex items-center justify-center shadow-elevated">
                <span className="font-display text-2xl font-bold text-accent">{String(t.val).padStart(2, "0")}</span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 block tracking-widest">{t.label}</span>
            </div>
          ))}
          <div className="self-center text-xs text-muted-foreground">until next</div>
        </motion.div>

        {loading ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-muted-foreground text-sm font-serif">Finding someone great for you...</p>
          </div>
        ) : !revealProfile ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 px-6">
            <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
              <Star className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground mb-2">No Reveals Available</h3>
            <p className="text-muted-foreground text-sm">Check back as more people join!</p>
          </motion.div>
        ) : !revealed ? (
          /* Pre-reveal — mysterious card */
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm px-4">
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-0">
                <div className="relative h-80 flex flex-col items-center justify-center">
                  {/* Animated glow */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-b from-primary/10 via-accent/5 to-transparent"
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />

                  {/* Sparkle particles */}
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 rounded-full bg-accent"
                      animate={{
                        x: [0, Math.random() * 100 - 50],
                        y: [0, Math.random() * 100 - 50],
                        opacity: [0, 1, 0],
                        scale: [0, 1.5, 0],
                      }}
                      transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
                      style={{ left: `${30 + Math.random() * 40}%`, top: `${30 + Math.random() * 40}%` }}
                    />
                  ))}

                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="relative z-10"
                  >
                    <div className="w-24 h-24 rounded-full bg-gradient-mystical flex items-center justify-center shadow-cosmic ring-2 ring-accent/20">
                      <Star className="w-12 h-12 text-accent" />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="relative z-10 mt-6 text-center"
                  >
                    <h3 className="font-display text-xl font-bold text-foreground mb-2">Someone's Waiting for You</h3>
                    <p className="text-muted-foreground text-sm font-serif">Your daily curated match is ready to reveal</p>
                  </motion.div>
                </div>

                <div className="p-5 pt-0">
                  <Button
                    onClick={handleReveal}
                    className="w-full h-12 text-base font-display btn-shimmer"
                    style={{ background: "var(--gradient-golden)" }}
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    Reveal Your Match
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* Post-reveal */
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 15 }}
            className="w-full max-w-sm px-4"
          >
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-6">
                {/* Avatar */}
                <div className="flex flex-col items-center mb-5">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="w-28 h-28 rounded-full bg-gradient-mystical flex items-center justify-center ring-4 ring-accent/20 overflow-hidden shadow-cosmic mb-4"
                  >
                    {revealProfile.avatar_url ? (
                      <img src={revealProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-14 h-14 text-foreground/70" />
                    )}
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="font-display text-2xl font-bold text-foreground mb-1"
                  >
                    {revealProfile.display_name || (revealProfile.username ? `@${revealProfile.username}` : "New Connection")}
                  </motion.h2>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-wrap gap-1.5 justify-center"
                  >
                    {revealProfile.sun_sign && <Badge variant="secondary" className="bg-secondary/40 text-xs">☉ {revealProfile.sun_sign}</Badge>}
                    {revealProfile.moon_sign && <Badge variant="secondary" className="bg-secondary/40 text-xs">☽ {revealProfile.moon_sign}</Badge>}
                    {revealProfile.rising_sign && <Badge variant="secondary" className="bg-secondary/40 text-xs">↗ {revealProfile.rising_sign}</Badge>}
                    {revealProfile.human_design_type && (
                      <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                        <Zap className="w-3 h-3 mr-1" />{revealProfile.human_design_type}
                      </Badge>
                    )}
                    {revealProfile.life_path_number && (
                      <Badge variant="outline" className="border-accent/30 text-accent text-xs">LP {revealProfile.life_path_number}</Badge>
                    )}
                  </motion.div>
                </div>

                {/* Gene Keys */}
                {revealProfile.gene_keys_life_purpose && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-accent/5 rounded-xl p-3 border border-accent/15 mb-4"
                  >
                    <div className="text-xs text-accent font-medium mb-1">Gene Keys Life Purpose</div>
                    <p className="text-xs text-muted-foreground font-serif">{revealProfile.gene_keys_life_purpose}</p>
                  </motion.div>
                )}

                {/* Interests */}
                {revealProfile.interests && revealProfile.interests.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="mb-5"
                  >
                    <h4 className="section-heading mb-2">Interests</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {revealProfile.interests.slice(0, 6).map((interest, i) => (
                        <Badge key={i} variant="secondary" className="text-xs bg-secondary/30">{interest}</Badge>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="flex gap-3"
                >
                  <Button
                    onClick={handleLike}
                    className="flex-1 btn-shimmer"
                    style={{ background: "var(--gradient-aurora)" }}
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Like
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-primary/30"
                    onClick={() => navigate("/")}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Discover More
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SacredReveal;
