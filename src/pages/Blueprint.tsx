import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, Zap, Hash, ArrowRight } from "lucide-react";
import CosmicBackground from "@/components/CosmicBackground";
import SynthesisCard from "@/components/blueprint/SynthesisCard";

const SECTIONS = [
  {
    path: "/blueprint/astrology",
    title: "Astrology",
    blurb: "Sun, moon, rising · natal chart · current transits.",
    icon: Star,
    accent: "text-primary",
    ring: "border-primary/30 hover:border-primary/60",
    bg: "from-primary/10",
  },
  {
    path: "/blueprint/human-design",
    title: "Human Design",
    blurb: "Type, strategy, authority, profile · body graph.",
    icon: Zap,
    accent: "text-accent",
    ring: "border-accent/30 hover:border-accent/60",
    bg: "from-accent/10",
  },
  {
    path: "/blueprint/numerology",
    title: "Numerology",
    blurb: "Life path · expression · soul urge · personal year.",
    icon: Hash,
    accent: "text-primary",
    ring: "border-primary/30 hover:border-primary/60",
    bg: "from-primary/10",
  },
];

const Blueprint = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-[100svh] relative">
      <CosmicBackground />
      <div className="relative z-10 pt-20 md:pt-24 pb-28 md:pb-12 px-5">
        <div className="max-w-md mx-auto">
          <header className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">Three sciences of self</p>
            <h1 className="font-display text-3xl font-bold bg-gradient-aurora bg-clip-text text-transparent mt-1">
              Your Blueprint
            </h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Strategy is what you do. Alignment is when you do it.
            </p>
          </header>

          {/* HERO — Cross-science Synthesis (premium-gated) */}
          <SynthesisCard />

          <div className="flex flex-col gap-4">
            {SECTIONS.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.button
                  key={s.path}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(s.path)}
                  className={`group relative overflow-hidden text-left rounded-2xl border ${s.ring} bg-card/70 backdrop-blur-md p-6 transition-all active:scale-[0.99]`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${s.bg} via-transparent to-transparent pointer-events-none`} />
                  <div className="relative flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-background/40 border border-border/40 flex items-center justify-center shrink-0">
                      <Icon className={`w-6 h-6 ${s.accent}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-display text-xl font-semibold text-foreground">{s.title}</h2>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{s.blurb}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground mt-2 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blueprint;