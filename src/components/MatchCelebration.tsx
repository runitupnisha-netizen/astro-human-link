import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import YinYangAnimation from "@/components/YinYangAnimation";
import WrittenInTheStars from "@/components/WrittenInTheStars";
import confetti from "canvas-confetti";

interface MatchProfile {
  display_name?: string | null;
  avatar_url?: string | null;
  sun_sign?: string | null;
  compatibility_score?: number | null;
  compatibility_reason?: string | null;
  connection_type?: string | null;
  shared_aspects?: string[] | null;
}

interface MatchCelebrationProps {
  profile: MatchProfile | null;
  onClose: () => void;
  onMessage: () => void;
  myAvatar?: string | null;
}

const MatchCelebration = ({ profile, onClose, onMessage, myAvatar }: MatchCelebrationProps) => {
  const confettiFired = useRef(false);

  useEffect(() => {
    if (!profile || confettiFired.current) return;
    confettiFired.current = true;

    // Initial burst
    const burst = (angle: number, origin: { x: number; y: number }) =>
      confetti({
        particleCount: 60,
        angle,
        spread: 70,
        origin,
        colors: ["#D4AF37", "#9b87f5", "#F5E6D3", "#E8D5B7", "#7E69AB"],
        gravity: 0.8,
        scalar: 1.1,
        drift: 0,
        ticks: 200,
      });

    burst(60, { x: 0, y: 0.65 });
    burst(120, { x: 1, y: 0.65 });

    // Delayed center burst
    const t1 = setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 360,
        origin: { x: 0.5, y: 0.4 },
        colors: ["#D4AF37", "#9b87f5", "#F5E6D3", "#E8D5B7"],
        gravity: 0.6,
        scalar: 1.2,
        ticks: 250,
        startVelocity: 30,
      });
    }, 400);

    // Sparkle shower
    const t2 = setTimeout(() => {
      confetti({
        particleCount: 40,
        spread: 160,
        origin: { x: 0.5, y: 0 },
        colors: ["#D4AF37", "#FFFFFF", "#9b87f5"],
        gravity: 1.2,
        scalar: 0.7,
        ticks: 300,
        startVelocity: 10,
        shapes: ["circle"],
      });
    }, 900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      confettiFired.current = false;
    };
  }, [profile]);

  const score = profile?.compatibility_score || 0;
  const tierColor =
    score >= 80 ? "hsl(var(--accent))" : score >= 65 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))";
  const tierClass =
    score >= 82
      ? "bg-accent/15 text-accent border border-accent/30"
      : score >= 65
        ? "bg-primary/15 text-primary border border-primary/30"
        : "bg-muted text-muted-foreground border border-border";

  return (
    <AnimatePresence>
      {profile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Full-screen cosmic backdrop */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              background:
                "radial-gradient(ellipse at 50% 30%, hsl(var(--primary) / 0.15) 0%, hsl(var(--background)) 70%)",
            }}
          />
          <div className="absolute inset-0 bg-background/85 backdrop-blur-xl" />

          {/* Ambient glow rings */}
          <motion.div
            className="absolute w-[600px] h-[600px] rounded-full border border-accent/10"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 1.5, ease: "easeOut" }}
          />
          <motion.div
            className="absolute w-[400px] h-[400px] rounded-full border border-primary/10"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.6 }}
            transition={{ delay: 0.4, duration: 1.2, ease: "easeOut" }}
          />
          <motion.div
            className="absolute w-[200px] h-[200px] rounded-full bg-accent/5 blur-3xl"
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Close button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            onClick={onClose}
            aria-label="Close"
            className="absolute top-6 right-6 z-10 w-11 h-11 rounded-full bg-card/70 backdrop-blur-sm border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border transition-colors touch-manipulation"
          >
            <X className="w-5 h-5" />
          </motion.button>

          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-sm w-full">
            {/* Header text */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mb-2"
            >
              <span className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground font-medium">
                ✦ Written in the Stars ✦
              </span>
            </motion.div>

            {/* Written in the Stars constellation animation */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring", damping: 12 }}
              className="mb-2"
            >
              <WrittenInTheStars myAvatar={myAvatar} theirAvatar={profile.avatar_url} />
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: "spring", damping: 15 }}
              className="font-display text-4xl md:text-5xl font-bold bg-gradient-golden bg-clip-text text-transparent mb-1"
            >
              It's a Match!
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-muted-foreground text-sm font-serif mb-6"
            >
              You and{" "}
              <span className="text-foreground font-semibold">
                {profile.display_name || "someone special"}
              </span>{" "}
              are aligned ✨
            </motion.p>

            {/* Score Ring */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8, type: "spring", damping: 15 }}
              className="relative w-32 h-32 mb-2"
            >
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" opacity="0.2" />
                <motion.circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={tierColor}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - score / 100) }}
                  transition={{ delay: 1, duration: 1.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.3 }}
                  className="font-display text-3xl font-bold text-foreground"
                >
                  {score || "?"}%
                </motion.span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-[0.2em]">stellara</span>
              </div>
            </motion.div>

            {/* Match type badge */}
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="mb-4"
            >
              <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-wide ${tierClass}`}>
                {profile.connection_type || "Cosmic Match"}
              </span>
            </motion.div>

            {/* Shared aspects */}
            {profile.shared_aspects && profile.shared_aspects.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3 }}
                className="flex flex-wrap justify-center gap-1.5 mb-4"
              >
                {profile.shared_aspects.slice(0, 4).map((aspect, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.4 + i * 0.1 }}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground border border-border/40"
                  >
                    {aspect}
                  </motion.span>
                ))}
              </motion.div>
            )}

            {/* Reason */}
            {profile.compatibility_reason && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="text-xs text-muted-foreground italic font-serif leading-relaxed px-4 mb-6"
              >
                "{profile.compatibility_reason}"
              </motion.p>
            )}

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="flex gap-3 w-full"
            >
              <Button
                variant="outline"
                className="flex-1 border-border/50 h-12 min-h-[3rem] touch-manipulation"
                onClick={onClose}
              >
                Keep Swiping
              </Button>
              <Button
                className="flex-1 gap-2 h-12 min-h-[3rem] font-semibold touch-manipulation"
                style={{ background: "var(--gradient-aurora)" }}
                onClick={onMessage}
              >
                <Send className="w-4 h-4" />
                Send Message
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MatchCelebration;
