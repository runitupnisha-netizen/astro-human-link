import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sun, Sparkles, Moon, Users, Lock, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePremium } from "@/hooks/usePremium";
import CosmicBackground from "@/components/CosmicBackground";
import { useState } from "react";
import PremiumUpsellModal from "@/components/PremiumUpsellModal";

type Tool = {
  id: string;
  title: string;
  tagline: string;
  description: string;
  icon: typeof Sun;
  accent: string;
  route?: string;
  premium: boolean;
  preview: string;
  requiredTier?: "weekly" | "vip";
};

const TOOLS: Tool[] = [
  {
    id: "briefing",
    title: "Daily Cosmic Briefing",
    tagline: "Your energy forecast for today",
    description:
      "Personalized mood, focus, lucky window, and a journal prompt — generated daily from your natal chart.",
    icon: Sun,
    accent: "from-amber-400/30 to-orange-500/10",
    route: "/briefing",
    premium: false,
    preview: "Today's energy: Magnetic. Focus on conversations that feel destined.",
    requiredTier: "weekly",
  },
  {
    id: "guide",
    title: "AI Cosmic Guide",
    tagline: "Chat with your inner-knowing",
    description:
      "Ask anything — love, decisions, growth. Your AI guide knows your chart, Human Design, and numerology.",
    icon: Sparkles,
    accent: "from-violet-400/30 to-fuchsia-500/10",
    premium: true,
    preview: "“Why do I keep meeting the same kind of partner?” — your guide is ready.",
    requiredTier: "vip",
  },
  {
    id: "dreams",
    title: "Dream Journal",
    tagline: "Decode your subconscious",
    description:
      "Log dreams and get AI-led symbolic interpretation woven through your chart and current transits.",
    icon: Moon,
    accent: "from-indigo-400/30 to-blue-500/10",
    premium: true,
    preview: "Last night's water symbolism may be tied to Neptune's transit through your 7th house.",
    requiredTier: "vip",
  },
  {
    id: "lookup",
    title: "Compatibility Lookup",
    tagline: "Read anyone's energy",
    description:
      "Add friends, family, exes by birth data — get full synastry without them needing an account.",
    icon: Users,
    accent: "from-rose-400/30 to-pink-500/10",
    premium: true,
    preview: "Save up to 25 people in your private cosmic rolodex.",
    requiredTier: "vip",
  },
];

const InnerWorld = () => {
  const navigate = useNavigate();
  const { subscribed, currentTier } = usePremium();
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [upsellFeature, setUpsellFeature] = useState("");

  const isVipOrYearly = currentTier === "vip" || currentTier === "yearly";

  const handleOpen = (tool: Tool) => {
    if (tool.id === "briefing") {
      // Briefing is for any subscriber; non-subscribers see upsell
      if (!subscribed) {
        setUpsellFeature(tool.title);
        setUpsellOpen(true);
        return;
      }
      navigate(tool.route!);
      return;
    }
    if (!isVipOrYearly) {
      setUpsellFeature(tool.title);
      setUpsellOpen(true);
      return;
    }
    // Routes for premium-only tools land here once built
    if (tool.route) navigate(tool.route);
    else navigate("/premium");
  };

  const isLocked = (tool: Tool) =>
    tool.id === "briefing" ? !subscribed : !isVipOrYearly;

  return (
    <div className="relative min-h-screen pt-20 pb-28 md:pb-12">
      <CosmicBackground />

      <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-medium text-amber-400 tracking-wide uppercase">
              Inner World
            </span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-gradient-aurora mb-3">
            Know yourself, deeply
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
            A private suite of tools to explore your chart, your dreams, and the people in
            your orbit — guided by ancient wisdom and modern AI.
          </p>
        </motion.div>

        {/* Tools */}
        <div className="grid gap-4">
          {TOOLS.map((tool, i) => {
            const Icon = tool.icon;
            const locked = isLocked(tool);
            return (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Card
                  className={`relative overflow-hidden bg-gradient-to-br ${tool.accent} bg-card/50 backdrop-blur-sm border-border/40 hover:border-border/70 transition-all`}
                >
                  <button
                    onClick={() => handleOpen(tool)}
                    className="w-full text-left p-5 md:p-6 group"
                    aria-label={`Open ${tool.title}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 w-12 h-12 rounded-xl bg-background/60 backdrop-blur-sm border border-border/40 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-foreground" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-display text-lg font-semibold text-foreground">
                            {tool.title}
                          </h3>
                          {locked && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30">
                              <Crown className="w-3 h-3 text-amber-400" />
                              <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide">
                                {tool.id === "briefing" ? "Premium" : "VIP"}
                              </span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{tool.tagline}</p>
                        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
                          {tool.description}
                        </p>

                        {/* Preview */}
                        <div
                          className={`relative rounded-lg border border-border/40 bg-background/40 px-3 py-2.5 text-xs italic text-muted-foreground ${
                            locked ? "select-none" : ""
                          }`}
                        >
                          <span className={locked ? "blur-[3px]" : ""}>{tool.preview}</span>
                          {locked && (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <Lock className="w-4 h-4 text-amber-400" />
                            </span>
                          )}
                        </div>

                        <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-foreground/70 group-hover:text-foreground transition-colors">
                          <span>{locked ? "Unlock" : "Open"}</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </div>
                  </button>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Footer CTA */}
        {!isVipOrYearly && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-center"
          >
            <p className="text-xs text-muted-foreground mb-3">
              Unlock the full Inner World with VIP or Yearly.
            </p>
            <Button
              onClick={() => navigate("/premium")}
              className="bg-gradient-golden text-background hover:opacity-90 shadow-golden"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to unlock
            </Button>
          </motion.div>
        )}
      </div>

      <PremiumUpsellModal
        open={upsellOpen}
        onOpenChange={setUpsellOpen}
        feature={upsellFeature}
      />
    </div>
  );
};

export default InnerWorld;
