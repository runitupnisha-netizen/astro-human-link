import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Star, User, Mountain, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface ProfileCardProps {
  name: string;
  age: number;
  zodiacSign: string;
  sunSign: string;
  moonSign: string;
  risingSign: string;
  venusHouse: number;
  marsAspect: string;
  humanDesignType: string;
  socialEnergy: "Introvert" | "Extrovert" | "Ambivert";
  geneKey: {
    number: number;
    name: string;
    gift: string;
  };
  compatibility: number;
  location: string;
  avatar?: string;
  interests: {
    music: string[];
    movies: string[];
    books: string[];
    sports: string[];
    health: string[];
    lifestyle: string[];
    thoughtSystems: string[];
  };
}

const socialEnergyHDMap: Record<string, string> = {
  "Manifestor-Introvert": "Initiates from within",
  "Manifestor-Extrovert": "Bold catalytic force",
  "Manifestor-Ambivert": "Selective initiator",
  "Generator-Introvert": "Deep sustained focus",
  "Generator-Extrovert": "Magnetic life force",
  "Generator-Ambivert": "Responsive & balanced",
  "Projector-Introvert": "Perceptive guide",
  "Projector-Extrovert": "Charismatic advisor",
  "Projector-Ambivert": "Intuitive mentor",
  "Reflector-Introvert": "Lunar contemplator",
  "Reflector-Extrovert": "Community mirror",
  "Reflector-Ambivert": "Sensitive observer",
};

const ProfileCard = ({ 
  name, age, sunSign, moonSign, risingSign,
  venusHouse, marsAspect, humanDesignType, socialEnergy,
  geneKey, compatibility, location, interests
}: ProfileCardProps) => {
  const getCompatibilityColor = (score: number) => {
    if (score >= 80) return "text-accent";
    if (score >= 60) return "text-primary";
    return "text-muted-foreground";
  };

  const hdEnergyKey = `${humanDesignType}-${socialEnergy}`;
  const hdEnergyDesc = socialEnergyHDMap[hdEnergyKey] || "Unique energy";
  const socialEnergyIcon = socialEnergy === "Introvert" ? "🌙" : socialEnergy === "Extrovert" ? "☀️" : "🌗";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      className="glass-card glow-border p-6 group"
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-full bg-gradient-mystical flex items-center justify-center shadow-mystical">
          <User className="w-7 h-7 text-foreground/70" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground font-display">{name}, {age}</h3>
          <p className="text-sm text-muted-foreground">{location}</p>
        </div>
        <div className={`font-display text-lg font-bold ${getCompatibilityColor(compatibility)}`}>
          {compatibility}%
        </div>
      </div>

      {/* Astro + HD Row */}
      <div className="space-y-2.5 mb-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="bg-secondary/50 text-xs">
            <Star className="w-3 h-3 mr-1" />
            {sunSign} ☽ {moonSign} ↗ {risingSign}
          </Badge>
        </div>
        
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="border-accent/30 text-accent text-xs">
            ♀ {venusHouse}H • {marsAspect}
          </Badge>
          <Badge variant="outline" className="border-primary/30 text-primary text-xs">
            <Zap className="w-3 h-3 mr-1" />{humanDesignType}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs bg-accent/20 text-accent">
            {socialEnergyIcon} {socialEnergy}
          </Badge>
          <Badge variant="outline" className="text-xs border-primary/20 text-muted-foreground italic">
            {hdEnergyDesc}
          </Badge>
        </div>

        {/* Gene Key */}
        <div className="bg-accent/5 rounded-xl p-2.5 border border-accent/15">
          <div className="text-xs text-accent font-medium">Gene Key {geneKey.number}: {geneKey.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5 font-serif">Gift: {geneKey.gift}</div>
        </div>

        {/* Interests — compact */}
        <div className="space-y-1.5">
          {[
            { label: "Music", items: interests.music },
            { label: "Movies", items: interests.movies },
            { label: "Sports", items: interests.sports, icon: Mountain },
          ].map(({ label, items, icon: Icon }) => (
            <div key={label} className="flex flex-wrap items-center gap-1">
              <span className="text-xs text-muted-foreground w-12">{label}:</span>
              {items.slice(0, 2).map((v, i) => (
                <Badge key={i} variant="secondary" className="text-xs py-0 px-1.5 bg-secondary/30">
                  {Icon && <Icon className="w-3 h-3 mr-0.5" />}{v}
                </Badge>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 border-border/40 hover:bg-muted/30 rounded-xl">
          Deep Dive
        </Button>
        <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-glow rounded-xl">
          <Heart className="w-4 h-4 mr-1" />
          Connect
        </Button>
      </div>
    </motion.div>
  );
};

export default ProfileCard;
