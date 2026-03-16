import { motion, AnimatePresence } from "framer-motion";
import { Crown, Heart, Eye, Sparkles, Shield, Star, X, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type FeatureKey = "super_like" | "who_liked_me" | "synastry" | "filters" | "unlimited_swipes" | "undo" | "daily_likes";

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
    title: "See Who Likes You",
    description: "Skip the guessing game — see who's already into you",
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
    title: "Unlimited Matches",
    description: "No daily limits — explore as many connections as the cosmos offer",
    icon: <Heart className="w-6 h-6" />,
  },
  undo: {
    title: "Undo Last Swipe",
    description: "Accidentally passed on someone? Go back and give them another chance",
    icon: <Undo2 className="w-6 h-6" />,
  },
  daily_likes: {
    title: "Unlimited Likes",
    description: "You've used all your daily likes — upgrade for unlimited cosmic connections",
    icon: <Heart className="w-6 h-6" />,
  },
};

const allPerks = [
  { icon: <Heart className="w-4 h-4" />, label: "Unlimited cosmic matches" },
  { icon: <Eye className="w-4 h-4" />, label: "See who likes you" },
  { icon: <Sparkles className="w-4 h-4" />, label: "Full synastry charts" },
  { icon: <Star className="w-4 h-4" />, label: "Unlimited Super Likes" },
  { icon: <Shield className="w-4 h-4" />, label: "Priority profile visibility" },
];

const PremiumUpsellModal = ({ open, onClose, feature = "super_like" }: PremiumUpsellModalProps) => {
  const navigate = useNavigate();
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
                className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-background/20 hover:bg-background/40 transition-colors"
              >
                <X className="w-4 h-4 text-foreground/70" />
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

                <h2 className="font-display text-2xl font-bold text-foreground mb-1">
                  Unlock {content.title}
                </h2>
                <p className="text-muted-foreground text-sm font-body">
                  {content.description}
                </p>
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
                  navigate("/premium");
                }}
                className="w-full bg-gradient-golden text-primary-foreground hover:opacity-90 font-display text-base py-5 shadow-[var(--shadow-golden)]"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Premium
              </Button>

              <button
                onClick={onClose}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors mt-3 py-2"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PremiumUpsellModal;
