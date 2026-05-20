import { motion, AnimatePresence } from "framer-motion";
import { Crown, Heart, Eye, Sparkles, Shield, Star, X, Undo2, Rocket, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";

type FeatureKey = "super_like" | "who_liked_me" | "synastry" | "filters" | "unlimited_swipes" | "undo" | "daily_likes" | "boost" | "incognito" | "video_call" | "voice_call";

interface PremiumUpsellModalProps {
  open: boolean;
  onClose: () => void;
  feature?: FeatureKey;
}

const featureContent: Record<FeatureKey, { title: string; description: string; icon: React.ReactNode }> = {
  super_like: {
    title: "Super Likes",
    description: "Stand out from the crowd — let them know you're truly interested",
    icon: <Star className="w-6 h-6" />,
  },
  who_liked_me: {
    title: "See Who Resonates",
    description: "See who's already aligned with you in Connections.",
    icon: <Eye className="w-6 h-6" />,
  },
  synastry: {
    title: "Full Synastry Charts",
    description: "Dive deep into your cosmic compatibility with detailed charts",
    icon: <Sparkles className="w-6 h-6" />,
  },
  filters: {
    title: "Advanced Filters",
    description: "Find exactly who you're looking for with powerful search filters",
    icon: <Shield className="w-6 h-6" />,
  },
  unlimited_swipes: {
    title: "Unlimited Connections",
    description: "No daily limits — explore as many profiles as you'd like.",
    icon: <Heart className="w-6 h-6" />,
  },
  undo: {
    title: "Undo Last Swipe",
    description: "Accidentally passed on someone? Go back and give them another chance",
    icon: <Undo2 className="w-6 h-6" />,
  },
  daily_likes: {
    title: "Unlimited Likes",
    description: "You've used all your daily likes — upgrade for unlimited Connections.",
    icon: <Heart className="w-6 h-6" />,
  },
  boost: {
    title: "Profile Boost",
    description: "Appear at the top of discovery for 30 minutes — get seen by more people",
    icon: <Rocket className="w-6 h-6" />,
  },
  incognito: {
    title: "Incognito Mode",
    description: "Browse profiles invisibly — only appear to people you like",
    icon: <EyeOff className="w-6 h-6" />,
  },
  video_call: {
    title: "Video Calls",
    description: "Meet face-to-face before meeting in person — premium only",
    icon: <Sparkles className="w-6 h-6" />,
  },
  voice_call: {
    title: "Voice Calls",
    description: "Hear their voice and feel the connection — premium only",
    icon: <Sparkles className="w-6 h-6" />,
  },
};

const allPerks = [
  { icon: <Sparkles className="w-4 h-4" />, label: "Full Cosmic Blueprint" },
  { icon: <Star className="w-4 h-4" />, label: "Complete Human Design & Numerology" },
  { icon: <Heart className="w-4 h-4" />, label: "Cross-Science Synthesis readings" },
  { icon: <Eye className="w-4 h-4" />, label: "Unlimited Lyra AI conversations" },
  { icon: <Shield className="w-4 h-4" />, label: "Cosmic Connections (when unlocked)" },
];

const PremiumUpsellModal = ({ open, onClose, feature = "super_like" }: PremiumUpsellModalProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const content = featureContent[feature];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            className="bg-card border border-border/50 rounded-3xl max-w-sm w-full relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient header */}
            <div className="relative px-6 pt-8 pb-6 text-center overflow-hidden">
              <div className="absolute inset-0 bg-[var(--gradient-cosmic)] opacity-80" />
              <motion.div
                className="absolute inset-0 bg-[var(--gradient-golden)] opacity-10"
                animate={{ opacity: [0.05, 0.15, 0.05] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />

              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute top-2 right-2 z-10 w-11 h-11 rounded-full bg-background/30 hover:bg-background/50 active:scale-95 transition-all flex items-center justify-center touch-manipulation"
              >
                <X className="w-5 h-5 text-foreground/80" />
              </button>

              <div className="relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", damping: 12 }}
                  className="w-16 h-16 rounded-full bg-gradient-golden mx-auto mb-4 flex items-center justify-center shadow-[var(--shadow-golden)]"
                >
                  <Crown className="w-8 h-8 text-primary-foreground" />
                </motion.div>

                <h2 className="font-display text-2xl font-bold text-foreground mb-1.5">
                  Unlock {content.title}
                </h2>
                <p className="text-muted-foreground text-sm font-body leading-relaxed">
                  {content.description}
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 border border-accent/30">
                  <Sparkles className="w-3 h-3 text-accent" />
                  <span className="text-[11px] font-semibold text-accent uppercase tracking-wider">7-Day Free Trial · From $9.99/mo</span>
                </div>
              </div>
            </div>

            {/* Feature preview */}
            <div className="px-6 py-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-2xl border border-accent/20 bg-accent/5 p-4 mb-5 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent shrink-0">
                  {content.icon}
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-foreground">{content.title}</p>
                  <p className="text-xs text-muted-foreground">Included with Stellara Premium</p>
                </div>
              </motion.div>

              {/* All perks */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Everything you get
              </p>
              <div className="space-y-2.5 mb-6">
                {allPerks.map((perk, i) => (
                  <motion.div
                    key={perk.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    className="flex items-center gap-2.5"
                  >
                    <div className="text-accent">{perk.icon}</div>
                    <span className="text-sm text-foreground/80 font-body">{perk.label}</span>
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <Button
                onClick={() => {
                  onClose();
                  const back = `${location.pathname}${location.search}`;
                  navigate(`/premium?redirect=${encodeURIComponent(back)}`);
                }}
                className="w-full bg-gradient-golden text-primary-foreground hover:opacity-95 active:scale-[0.98] font-display text-base h-13 min-h-[52px] shadow-[var(--shadow-golden)] transition-transform touch-manipulation"
              >
                <Crown className="w-4 h-4 mr-2" />
                See Plans & Upgrade
              </Button>

              <button
                onClick={onClose}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors mt-2 min-h-[44px] touch-manipulation"
              >
                Not right now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PremiumUpsellModal;
