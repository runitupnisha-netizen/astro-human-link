import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface CosmicNudgeProps {
  className?: string;
}

const COSMIC_PROMPTS = [
  "Mercury is direct — communication flows effortlessly today. Perfect time to reach out!",
  "The Moon is in a water sign — emotional connections deepen now. Share something vulnerable.",
  "Venus is trine your chart — love energy is amplified. Don't hold back!",
  "Today's cosmic weather favors meaningful conversation. Send that first message.",
  "The stars align for new connections today. Who's been on your mind?",
  "A Grand Trine forms today — harmonious energy for deepening bonds. Message your match!",
  "Neptune softens hearts today — romance is in the air. Say something sweet.",
  "Jupiter expands your social circle today — be open to new conversations.",
];

const CosmicNudge = ({ className = "" }: CosmicNudgeProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [nudgeText, setNudgeText] = useState("");
  const [matchName, setMatchName] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // Show nudge only once per session
    const shown = sessionStorage.getItem("cosmic-nudge-shown");
    if (shown) return;

    const loadNudge = async () => {
      // Find a match the user hasn't messaged recently
      const { data: matches } = await supabase
        .from("matches")
        .select("id, user_a, user_b")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .limit(5);

      if (!matches || matches.length === 0) return;

      // Pick a random match
      const match = matches[Math.floor(Math.random() * matches.length)];
      const otherId = match.user_a === user.id ? match.user_b : match.user_a;

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", otherId)
        .maybeSingle();

      const name = profile?.display_name;
      if (name && name.includes("@")) return; // Skip email names

      setMatchName(name || "your match");
      setMatchId(match.id);
      setNudgeText(COSMIC_PROMPTS[Math.floor(Math.random() * COSMIC_PROMPTS.length)]);

      // Delay showing for a natural feel
      setTimeout(() => setVisible(true), 3000);
      sessionStorage.setItem("cosmic-nudge-shown", "true");
    };

    loadNudge();
  }, [user]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className={`fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 ${className}`}
      >
        <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-card/95 backdrop-blur-lg shadow-elevated">
          {/* Cosmic gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/10 to-primary/5 pointer-events-none" />

          <div className="relative p-4">
            {/* Close button — enlarged hit area for mobile, above decorative sparkles */}
            <button
              onClick={() => setVisible(false)}
              aria-label="Dismiss cosmic nudge"
              className="absolute top-1.5 right-1.5 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-card/80 text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Sparkles className="w-5 h-5 text-accent" />
              </motion.div>
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                Daily Cosmic Nudge
              </span>
            </div>

            {/* Nudge text */}
            <p className="text-sm text-foreground leading-relaxed mb-3 pr-6">
              {nudgeText}
            </p>

            {/* CTA */}
            {matchId && (
              <Button
                size="sm"
                onClick={() => {
                  navigate(`/messages?match=${matchId}`);
                  setVisible(false);
                }}
                className="gap-1.5 text-xs"
                style={{ background: "var(--gradient-aurora)" }}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Message {matchName}
              </Button>
            )}
          </div>

          {/* Floating stars decoration — moved to bottom-right so it doesn't block close button */}
          <div className="pointer-events-none absolute -bottom-1 -right-1 opacity-30">
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-8 h-8 text-accent" />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CosmicNudge;
