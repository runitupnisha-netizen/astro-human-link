import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Filter, X, Heart, Sparkles, Flame, Leaf, Mountain, Droplets, Wind, Zap, MapPin } from "lucide-react";

interface FilterState {
  relationship_goals: string[];
  spiritual_levels: string[];
  elements: string[];
  hd_types: string[];
  max_distance_km: number;
}

interface SacredIntentionFiltersProps {
  onApply: (filters: FilterState) => void;
  onClose: () => void;
}

const RELATIONSHIP_GOALS = [
  { value: "soul_mate", label: "The One", icon: Heart },
  { value: "twin_flame", label: "Deep Connection", icon: Flame },
  { value: "life_partner", label: "Life Partner", icon: Sparkles },
  { value: "spiritual_friend", label: "Good Vibes", icon: Leaf },
  { value: "sacred_union", label: "Something Real", icon: Sparkles },
];

const SPIRITUAL_LEVELS = [
  { value: "explorer", label: "Explorer", desc: "Curious and beginning" },
  { value: "practitioner", label: "Practitioner", desc: "Active daily practice" },
  { value: "devotee", label: "Devotee", desc: "Deep commitment" },
  { value: "guide", label: "Guide", desc: "Teaching and mentoring" },
];

const ELEMENTS = [
  { value: "Fire", label: "Fire", icon: Flame, color: "text-orange-400 border-orange-400/30 bg-orange-400/10" },
  { value: "Water", label: "Water", icon: Droplets, color: "text-blue-400 border-blue-400/30 bg-blue-400/10" },
  { value: "Air", label: "Air", icon: Wind, color: "text-cyan-300 border-cyan-300/30 bg-cyan-300/10" },
  { value: "Earth", label: "Earth", icon: Mountain, color: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" },
];

const HD_TYPES = [
  { value: "Generator", label: "Generator" },
  { value: "Manifesting Generator", label: "MG" },
  { value: "Projector", label: "Projector" },
  { value: "Manifestor", label: "Manifestor" },
  { value: "Reflector", label: "Reflector" },
];

const DISTANCE_LABELS: Record<number, string> = {
  25: "15 mi",
  50: "30 mi",
  100: "60 mi",
  250: "155 mi",
  500: "310 mi",
  0: "Anywhere",
};

const SacredIntentionFilters = ({ onApply, onClose }: SacredIntentionFiltersProps) => {
  const [filters, setFilters] = useState<FilterState>({
    relationship_goals: [],
    spiritual_levels: [],
    elements: [],
    hd_types: [],
    max_distance_km: 0,
  });

  const toggle = (key: keyof Omit<FilterState, 'max_distance_km'>, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter(v => v !== value) : [...prev[key], value],
    }));
  };

  const distanceSteps = [0, 25, 50, 100, 250, 500];
  const distanceIndex = distanceSteps.indexOf(filters.max_distance_km);
  const currentDistanceLabel = filters.max_distance_km === 0 ? "Anywhere" : DISTANCE_LABELS[filters.max_distance_km] || `${Math.round(filters.max_distance_km * 0.621371)} mi`;

  const activeCount = Object.entries(filters).reduce((acc, [key, val]) => {
    if (key === 'max_distance_km') return acc + (val !== 0 ? 1 : 0);
    return acc + (val as string[]).length;
  }, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="glass-card p-5 space-y-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
          <Filter className="w-5 h-5 text-primary" />
          What Are You Looking For?
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Distance */}
      <div>
        <h4 className="section-heading mb-2 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          Distance
        </h4>
        <div className="px-1">
          <Slider
            value={[distanceIndex >= 0 ? distanceIndex : 0]}
            onValueChange={([idx]) => setFilters(prev => ({ ...prev, max_distance_km: distanceSteps[idx] }))}
            max={distanceSteps.length - 1}
            step={1}
            className="mb-2"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Anywhere</span>
            <span className="text-foreground font-medium text-xs">{currentDistanceLabel}</span>
            <span>310 mi</span>
          </div>
        </div>
      </div>

      {/* Relationship Goals */}
      <div>
        <h4 className="section-heading mb-2">Seeking</h4>
        <div className="flex flex-wrap gap-1.5">
          {RELATIONSHIP_GOALS.map(goal => (
            <button
              key={goal.value}
              onClick={() => toggle("relationship_goals", goal.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filters.relationship_goals.includes(goal.value)
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "border-border/30 text-muted-foreground hover:border-border"
              }`}
            >
              <goal.icon className="w-3 h-3" />
              {goal.label}
            </button>
          ))}
        </div>
      </div>

      {/* Spiritual Practice Level */}
      <div>
        <h4 className="section-heading mb-2">How Into This Are They?</h4>
        <div className="flex flex-wrap gap-1.5">
          {SPIRITUAL_LEVELS.map(level => (
            <button
              key={level.value}
              onClick={() => toggle("spiritual_levels", level.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filters.spiritual_levels.includes(level.value)
                  ? "bg-accent/15 text-accent border-accent/30"
                  : "border-border/30 text-muted-foreground hover:border-border"
              }`}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>

      {/* Element Preference */}
      <div>
        <h4 className="section-heading mb-2">Element Preference</h4>
        <div className="flex gap-2">
          {ELEMENTS.map(el => (
            <button
              key={el.value}
              onClick={() => toggle("elements", el.value)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all flex-1 ${
                filters.elements.includes(el.value) ? el.color : "border-border/30 text-muted-foreground"
              }`}
            >
              <el.icon className="w-4 h-4" />
              <span className="text-[10px] font-medium">{el.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Human Design Type */}
      <div>
        <h4 className="section-heading mb-2">Human Design Type</h4>
        <div className="flex flex-wrap gap-1.5">
          {HD_TYPES.map(type => (
            <button
              key={type.value}
              onClick={() => toggle("hd_types", type.value)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filters.hd_types.includes(type.value)
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "border-border/30 text-muted-foreground hover:border-border"
              }`}
            >
              <Zap className="w-3 h-3" />
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 border-border/30"
          onClick={() => setFilters({ relationship_goals: [], spiritual_levels: [], elements: [], hd_types: [], max_distance_km: 0 })}
        >
          Clear All
        </Button>
        <Button
          size="sm"
          className="flex-1 btn-shimmer"
          style={{ background: "var(--gradient-aurora)" }}
          onClick={() => { onApply(filters); onClose(); }}
        >
          Apply {activeCount > 0 && `(${activeCount})`}
        </Button>
      </div>
    </motion.div>
  );
};

export default SacredIntentionFilters;
