import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Heart, X, Sparkles, Star, Zap, User } from "lucide-react";
import { useState } from "react";

export interface DiscoverProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  sun_sign: string | null;
  moon_sign: string | null;
  rising_sign: string | null;
  human_design_type: string | null;
  life_path_number: number | null;
  social_energy: number | null;
  interests: string[] | null;
  compatibility_tags: string[] | null;
  gene_keys_life_purpose: string | null;
  compatibility_score: number;
  connection_type: string;
  compatibility_reason: string;
  shared_aspects: string[];
}

interface SwipeCardProps {
  profile: DiscoverProfile;
  onSwipe: (direction: "left" | "right") => void;
  isTop: boolean;
}

const SwipeCard = ({ profile, onSwipe, isTop }: SwipeCardProps) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-25, 25]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, 0], [1, 0]);
  const [exiting, setExiting] = useState(false);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 120) {
      setExiting(true);
      onSwipe(info.offset.x > 0 ? "right" : "left");
    }
  };

  const socialLabel = (e: number | null) => {
    if (!e) return "Balanced";
    if (e <= 3) return "🌙 Introvert";
    if (e >= 8) return "☀️ Extrovert";
    return "🌗 Ambivert";
  };

  const scoreColor = profile.compatibility_score >= 80 
    ? "bg-gradient-golden" 
    : profile.compatibility_score >= 60 
      ? "bg-gradient-aurora" 
      : "bg-gradient-mystical";

  return (
    <motion.div
      className={`absolute inset-0 ${isTop ? "z-10 cursor-grab active:cursor-grabbing" : "z-0"}`}
      style={{ x, rotate }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      animate={exiting ? { x: x.get() > 0 ? 500 : -500, opacity: 0 } : {}}
      transition={{ duration: 0.3 }}
    >
      {/* Swipe overlays */}
      {isTop && (
        <>
          <motion.div
            className="absolute top-8 right-8 z-20 border-4 border-green-400 rounded-xl px-6 py-2 -rotate-12"
            style={{ opacity: likeOpacity }}
          >
            <span className="text-green-400 text-3xl font-black tracking-wider">SOUL YES</span>
          </motion.div>
          <motion.div
            className="absolute top-8 left-8 z-20 border-4 border-red-400 rounded-xl px-6 py-2 rotate-12"
            style={{ opacity: passOpacity }}
          >
            <span className="text-red-400 text-3xl font-black tracking-wider">PASS</span>
          </motion.div>
        </>
      )}

      <div className="w-full h-full rounded-3xl overflow-hidden border border-border/50 bg-card/95 backdrop-blur-xl shadow-cosmic flex flex-col">
        {/* Header with avatar & score */}
        <div className="relative p-6 pb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-mystical flex items-center justify-center shadow-mystical ring-2 ring-primary/30">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-foreground" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">
                {profile.display_name || "Cosmic Soul"}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${scoreColor} text-foreground font-bold text-sm`}>
                  {profile.compatibility_score}% Match
                </Badge>
              </div>
            </div>
          </div>

          {/* Connection type */}
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-accent">{profile.connection_type}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{profile.compatibility_reason}</p>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
          {/* Cosmic signature */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-accent uppercase tracking-wider">Cosmic Signature</h3>
            <div className="flex flex-wrap gap-2">
              {profile.sun_sign && (
                <Badge variant="secondary" className="bg-secondary/50 text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  ☉ {profile.sun_sign}
                </Badge>
              )}
              {profile.moon_sign && (
                <Badge variant="secondary" className="bg-secondary/50 text-xs">☽ {profile.moon_sign}</Badge>
              )}
              {profile.rising_sign && (
                <Badge variant="secondary" className="bg-secondary/50 text-xs">↗ {profile.rising_sign}</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.human_design_type && (
                <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  {profile.human_design_type}
                </Badge>
              )}
              {profile.life_path_number && (
                <Badge variant="outline" className="border-accent/30 text-accent text-xs">
                  Life Path {profile.life_path_number}
                </Badge>
              )}
              <Badge variant="secondary" className="bg-accent/20 text-accent text-xs">
                {socialLabel(profile.social_energy)}
              </Badge>
            </div>
          </div>

          {/* Shared aspects */}
          {profile.shared_aspects?.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-accent uppercase tracking-wider">Cosmic Resonances</h3>
              <div className="flex flex-wrap gap-2">
                {profile.shared_aspects.map((a, i) => (
                  <Badge key={i} variant="secondary" className="bg-primary/15 text-primary text-xs">{a}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Gene Keys */}
          {profile.gene_keys_life_purpose && (
            <div className="bg-gradient-mystical/20 rounded-lg p-3 border border-accent/20">
              <div className="text-xs text-accent font-medium">Gene Keys Life Purpose</div>
              <div className="text-xs text-muted-foreground mt-1">{profile.gene_keys_life_purpose}</div>
            </div>
          )}

          {/* Tags */}
          {profile.compatibility_tags && profile.compatibility_tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-accent uppercase tracking-wider">Soul Traits</h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.compatibility_tags.map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-xs border-border/50 text-muted-foreground">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-accent uppercase tracking-wider">Interests</h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.interests.map((interest, i) => (
                  <Badge key={i} variant="secondary" className="text-xs bg-secondary/30">{interest}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {isTop && (
          <div className="p-6 pt-2 flex justify-center gap-6">
            <button
              onClick={() => { setExiting(true); onSwipe("left"); }}
              className="w-16 h-16 rounded-full bg-card border-2 border-destructive/40 flex items-center justify-center hover:bg-destructive/10 transition-colors shadow-lg"
            >
              <X className="w-8 h-8 text-destructive" />
            </button>
            <button
              onClick={() => { setExiting(true); onSwipe("right"); }}
              className="w-16 h-16 rounded-full bg-card border-2 border-green-400/40 flex items-center justify-center hover:bg-green-400/10 transition-colors shadow-lg"
            >
              <Heart className="w-8 h-8 text-green-400" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SwipeCard;
