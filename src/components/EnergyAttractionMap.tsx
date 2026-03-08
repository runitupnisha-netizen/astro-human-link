import { motion } from "framer-motion";
import { Flame, Droplets, Wind, Mountain, Zap, Heart, Sparkles } from "lucide-react";

interface EnergyAttractionMapProps {
  myProfile: {
    sun_sign: string | null;
    human_design_type: string | null;
    element: string;
  };
  theirProfile: {
    sun_sign: string | null;
    human_design_type: string | null;
    element: string;
  };
  score: number;
}

const ELEMENT_ICONS: Record<string, React.ReactNode> = {
  Fire: <Flame className="w-5 h-5" />,
  Water: <Droplets className="w-5 h-5" />,
  Air: <Wind className="w-5 h-5" />,
  Earth: <Mountain className="w-5 h-5" />,
};

const ELEMENT_COLORS: Record<string, string> = {
  Fire: "from-orange-500/30 to-red-500/10",
  Water: "from-blue-500/30 to-indigo-500/10",
  Air: "from-cyan-400/30 to-sky-500/10",
  Earth: "from-emerald-500/30 to-green-500/10",
};

const ATTRACTION_DYNAMICS: Record<string, { label: string; description: string }> = {
  "Fire-Fire": { label: "Combustion", description: "An explosive, passionate dynamic. You ignite each other's drive and enthusiasm, creating unstoppable momentum together." },
  "Fire-Water": { label: "Steam", description: "A transformative alchemical bond. Your passion meets their depth, creating powerful emotional steam that fuels growth." },
  "Fire-Air": { label: "Wildfire", description: "Air fans the flames of Fire's passion. You inspire each other intellectually and creatively in equal measure." },
  "Fire-Earth": { label: "Forge", description: "Fire's vision meets Earth's grounding. Together you forge something lasting — passion tempered by patience." },
  "Water-Water": { label: "Ocean", description: "Two currents merging into an ocean of emotional understanding. You feel each other on the deepest level." },
  "Water-Air": { label: "Mist", description: "Air brings clarity to Water's emotions, while Water gives Air emotional depth. A beautifully balanced exchange." },
  "Water-Earth": { label: "Garden", description: "Water nourishes Earth's growth. A naturally nurturing, abundant connection that deepens with time." },
  "Air-Air": { label: "Vortex", description: "Two minds creating a powerful intellectual vortex. Endless ideas, conversations, and mental stimulation." },
  "Air-Earth": { label: "Landscape", description: "Air's ideas find form through Earth's practicality. Together you turn dreams into tangible reality." },
  "Earth-Earth": { label: "Bedrock", description: "Two grounded souls creating unshakable stability. Your connection is built on trust, loyalty, and shared values." },
};

const getDynamic = (el1: string, el2: string) => {
  const key1 = `${el1}-${el2}`;
  const key2 = `${el2}-${el1}`;
  return ATTRACTION_DYNAMICS[key1] || ATTRACTION_DYNAMICS[key2] || {
    label: "Cosmic",
    description: "A unique energetic connection that transcends traditional elemental dynamics.",
  };
};

const EnergyAttractionMap = ({ myProfile, theirProfile, score }: EnergyAttractionMapProps) => {
  const dynamic = getDynamic(myProfile.element, theirProfile.element);
  const myColor = ELEMENT_COLORS[myProfile.element] || ELEMENT_COLORS.Fire;
  const theirColor = ELEMENT_COLORS[theirProfile.element] || ELEMENT_COLORS.Water;

  return (
    <div className="space-y-4">
      {/* Visual attraction visualization */}
      <div className="relative h-48 rounded-2xl overflow-hidden bg-card/50">
        {/* Gradient backgrounds meeting in center */}
        <motion.div
          className={`absolute inset-0 bg-gradient-to-r ${myColor}`}
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <motion.div
          className={`absolute inset-0 bg-gradient-to-l ${theirColor}`}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />

        {/* Connection particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-accent"
            animate={{
              x: [`${20 + Math.random() * 20}%`, `${55 + Math.random() * 20}%`],
              y: [`${20 + Math.random() * 60}%`, `${20 + Math.random() * 60}%`],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}

        {/* My element orb */}
        <motion.div
          className="absolute left-[15%] top-1/2 -translate-y-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="w-16 h-16 rounded-full bg-card/80 backdrop-blur-sm border border-border/40 flex items-center justify-center shadow-elevated">
            {ELEMENT_ICONS[myProfile.element]}
          </div>
          <span className="text-[10px] text-foreground font-medium">{myProfile.element}</span>
        </motion.div>

        {/* Center dynamic label */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: "spring" }}
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-1"
            style={{ background: "var(--gradient-golden)", boxShadow: "var(--shadow-golden)" }}
          >
            <Sparkles className="w-7 h-7 text-accent-foreground" />
          </div>
          <span className="text-xs font-display font-bold text-accent">{dynamic.label}</span>
        </motion.div>

        {/* Their element orb */}
        <motion.div
          className="absolute right-[15%] top-1/2 -translate-y-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="w-16 h-16 rounded-full bg-card/80 backdrop-blur-sm border border-border/40 flex items-center justify-center shadow-elevated">
            {ELEMENT_ICONS[theirProfile.element]}
          </div>
          <span className="text-[10px] text-foreground font-medium">{theirProfile.element}</span>
        </motion.div>
      </div>

      {/* Description */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <h4 className="font-display text-sm font-bold text-accent mb-2 flex items-center gap-1">
          <Zap className="w-4 h-4" /> {dynamic.label} Dynamic
        </h4>
        <p className="text-sm text-muted-foreground font-serif leading-relaxed">{dynamic.description}</p>
      </motion.div>

      {/* Energy connection bars */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="space-y-2"
      >
        {[
          { label: "Emotional Magnetism", value: Math.min(100, score + 10) },
          { label: "Intellectual Spark", value: Math.max(30, score - 5) },
          { label: "Spiritual Resonance", value: score },
        ].map((bar, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-32 shrink-0">{bar.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "var(--gradient-aurora)" }}
                initial={{ width: "0%" }}
                animate={{ width: `${bar.value}%` }}
                transition={{ delay: 1.4 + i * 0.15, duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <span className="text-xs font-medium text-foreground w-8 text-right">{bar.value}%</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default EnergyAttractionMap;
