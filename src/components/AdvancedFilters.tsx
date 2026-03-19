import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { X, Filter, MapPin, Calendar, Wine, Cigarette, Baby, Pill } from "lucide-react";

export interface AdvancedFilterState {
  age_min: number;
  age_max: number;
  max_distance_km: number;
  drinking: string[];
  smoking: string[];
  kids_preference: string[];
  substances: string[];
}

interface AdvancedFiltersProps {
  onApply: (filters: AdvancedFilterState) => void;
  onClose: () => void;
  initialFilters?: Partial<AdvancedFilterState>;
}

const DRINKING_OPTIONS = ["Never", "Rarely", "Socially", "Regularly", "Sober"];
const SMOKING_OPTIONS = ["Never", "Occasionally", "Regularly", "Trying to quit"];
const KIDS_OPTIONS = ["Want kids", "Have kids", "Open to kids", "Don't want kids", "Not sure"];
const SUBSTANCES_OPTIONS = ["Never", "Occasionally", "Plant medicine", "Open-minded"];

const AdvancedFilters = ({ onApply, onClose, initialFilters }: AdvancedFiltersProps) => {
  const [filters, setFilters] = useState<AdvancedFilterState>({
    age_min: initialFilters?.age_min ?? 18,
    age_max: initialFilters?.age_max ?? 99,
    max_distance_km: initialFilters?.max_distance_km ?? 0,
    drinking: initialFilters?.drinking ?? [],
    smoking: initialFilters?.smoking ?? [],
    kids_preference: initialFilters?.kids_preference ?? [],
    substances: initialFilters?.substances ?? [],
  });

  const toggleOption = (key: keyof Pick<AdvancedFilterState, 'drinking' | 'smoking' | 'kids_preference' | 'substances'>, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter(v => v !== value) : [...prev[key], value],
    }));
  };

  const distanceSteps = [0, 10, 25, 50, 100, 250, 500];
  const distIndex = distanceSteps.indexOf(filters.max_distance_km) >= 0 ? distanceSteps.indexOf(filters.max_distance_km) : 0;
  const distLabel = filters.max_distance_km === 0 ? "Anywhere" : `${Math.round(filters.max_distance_km * 0.621371)} mi`;

  const activeCount = (filters.drinking.length + filters.smoking.length + filters.kids_preference.length + filters.substances.length) +
    (filters.age_min > 18 || filters.age_max < 99 ? 1 : 0) +
    (filters.max_distance_km > 0 ? 1 : 0);

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
          Advanced Filters
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Age Range */}
      <div>
        <h4 className="section-heading mb-2 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" /> Age Range
        </h4>
        <div className="px-1">
          <Slider
            value={[filters.age_min, filters.age_max]}
            onValueChange={([min, max]) => setFilters(prev => ({ ...prev, age_min: min, age_max: max }))}
            min={18}
            max={99}
            step={1}
            className="mb-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{filters.age_min}</span>
            <span className="text-foreground font-medium">{filters.age_min} – {filters.age_max === 99 ? "99+" : filters.age_max}</span>
            <span>99+</span>
          </div>
        </div>
      </div>

      {/* Distance */}
      <div>
        <h4 className="section-heading mb-2 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" /> Distance
        </h4>
        <div className="px-1">
          <Slider
            value={[distIndex]}
            onValueChange={([idx]) => setFilters(prev => ({ ...prev, max_distance_km: distanceSteps[idx] }))}
            max={distanceSteps.length - 1}
            step={1}
            className="mb-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Anywhere</span>
            <span className="text-foreground font-medium">{distLabel}</span>
            <span>310 mi</span>
          </div>
        </div>
      </div>

      {/* Drinking */}
      <div>
        <h4 className="section-heading mb-2 flex items-center gap-1.5">
          <Wine className="w-3.5 h-3.5" /> Drinking
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {DRINKING_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => toggleOption("drinking", opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filters.drinking.includes(opt) ? "bg-primary/15 text-primary border-primary/30" : "border-border/30 text-muted-foreground hover:border-border"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Smoking */}
      <div>
        <h4 className="section-heading mb-2 flex items-center gap-1.5">
          <Cigarette className="w-3.5 h-3.5" /> Smoking
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {SMOKING_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => toggleOption("smoking", opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filters.smoking.includes(opt) ? "bg-primary/15 text-primary border-primary/30" : "border-border/30 text-muted-foreground hover:border-border"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Kids Preference */}
      <div>
        <h4 className="section-heading mb-2 flex items-center gap-1.5">
          <Baby className="w-3.5 h-3.5" /> Kids
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {KIDS_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => toggleOption("kids_preference", opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filters.kids_preference.includes(opt) ? "bg-accent/15 text-accent border-accent/30" : "border-border/30 text-muted-foreground hover:border-border"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Substances */}
      <div>
        <h4 className="section-heading mb-2 flex items-center gap-1.5">
          <Pill className="w-3.5 h-3.5" /> Substances
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {SUBSTANCES_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => toggleOption("substances", opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filters.substances.includes(opt) ? "bg-primary/15 text-primary border-primary/30" : "border-border/30 text-muted-foreground hover:border-border"
              }`}
            >
              {opt}
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
          onClick={() => setFilters({ age_min: 18, age_max: 99, max_distance_km: 0, drinking: [], smoking: [], kids_preference: [], substances: [] })}
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

export default AdvancedFilters;
