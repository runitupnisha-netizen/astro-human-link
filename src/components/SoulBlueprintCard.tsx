import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Star, Zap, Dna, Hash, User } from "lucide-react";

interface SoulBlueprintProps {
  profile: {
    display_name: string | null;
    avatar_url: string | null;
    sun_sign: string | null;
    moon_sign: string | null;
    rising_sign: string | null;
    human_design_type: string | null;
    human_design_profile: string | null;
    gene_keys_life_purpose: string | null;
    life_path_number: number | null;
    compatibility_tags: string[] | null;
  };
  compact?: boolean;
}

const ZODIAC_SYMBOLS: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
  Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

const getArchetype = (sunSign: string | null, hdType: string | null): string => {
  if (!sunSign) return "Cosmic Explorer";
  const archetypes: Record<string, string> = {
    Aries: "The Initiator", Taurus: "The Builder", Gemini: "The Messenger",
    Cancer: "The Nurturer", Leo: "The Creator", Virgo: "The Healer",
    Libra: "The Harmonizer", Scorpio: "The Alchemist", Sagittarius: "The Seeker",
    Capricorn: "The Architect", Aquarius: "The Visionary", Pisces: "The Mystic",
  };
  return archetypes[sunSign] || "Cosmic Soul";
};

const SoulBlueprintCard = ({ profile, compact = false }: SoulBlueprintProps) => {
  const archetype = getArchetype(profile.sun_sign, profile.human_design_type);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative overflow-hidden rounded-2xl border border-border/40 ${compact ? "p-4" : "p-6"}`}
      style={{ background: "var(--gradient-glass)" }}
    >
      {/* Decorative corner glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />

      <div className="relative z-10">
        {/* Header with avatar */}
        <div className="flex items-center gap-4 mb-4">
          <div className={`${compact ? "w-14 h-14" : "w-20 h-20"} rounded-full bg-gradient-mystical flex items-center justify-center ring-2 ring-accent/20 overflow-hidden shadow-mystical`}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className={`${compact ? "w-7 h-7" : "w-10 h-10"} text-foreground/70`} />
            )}
          </div>
          <div>
            <h3 className={`font-display ${compact ? "text-lg" : "text-xl"} font-bold text-foreground`}>
              {profile.display_name || "Cosmic Soul"}
            </h3>
            <p className="text-xs text-accent font-semibold tracking-wide">{archetype}</p>
          </div>
        </div>

        {/* Celestial Triad */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Sun", symbol: "☉", sign: profile.sun_sign, color: "border-accent/30 bg-accent/8" },
            { label: "Moon", symbol: "☽", sign: profile.moon_sign, color: "border-primary/30 bg-primary/8" },
            { label: "Rising", symbol: "↗", sign: profile.rising_sign, color: "border-secondary-foreground/30 bg-secondary/8" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className={`rounded-xl border ${item.color} p-2.5 text-center`}
            >
              <div className="text-lg mb-0.5">{item.sign ? ZODIAC_SYMBOLS[item.sign] || item.symbol : "?"}</div>
              <div className="text-[10px] text-muted-foreground">{item.label}</div>
              <div className="text-xs font-medium text-foreground">{item.sign || "—"}</div>
            </motion.div>
          ))}
        </div>

        {/* Design Systems Row */}
        <div className="space-y-2">
          {profile.human_design_type && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-2 bg-primary/8 rounded-lg p-2.5 border border-primary/15"
            >
              <Zap className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-muted-foreground block">Human Design</span>
                <span className="text-sm font-medium text-foreground">{profile.human_design_type}</span>
                {profile.human_design_profile && (
                  <span className="text-xs text-muted-foreground ml-1.5">· {profile.human_design_profile}</span>
                )}
              </div>
            </motion.div>
          )}

          {profile.gene_keys_life_purpose && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-2 bg-accent/8 rounded-lg p-2.5 border border-accent/15"
            >
              <Dna className="w-4 h-4 text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-muted-foreground block">Gene Key Life Purpose</span>
                <span className="text-xs font-medium text-foreground">{profile.gene_keys_life_purpose}</span>
              </div>
            </motion.div>
          )}

          {profile.life_path_number && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="flex items-center gap-2 bg-secondary/30 rounded-lg p-2.5 border border-border/30"
            >
              <Hash className="w-4 h-4 text-foreground/70 shrink-0" />
              <div>
                <span className="text-[10px] text-muted-foreground block">Life Path</span>
                <span className="text-sm font-bold text-foreground">{profile.life_path_number}</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Compatibility tags */}
        {profile.compatibility_tags && profile.compatibility_tags.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap gap-1.5 mt-3"
          >
            {profile.compatibility_tags.slice(0, 4).map((tag, i) => (
              <Badge key={i} variant="outline" className="text-[10px] border-accent/20 text-accent">{tag}</Badge>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default SoulBlueprintCard;
