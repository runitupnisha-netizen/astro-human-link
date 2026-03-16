import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Heart, X, Star, Zap, User, Sparkles, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useVerificationStatus } from "@/hooks/useVerification";

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
  birth_date: string | null;
  birth_place: string | null;
  current_city?: string | null;
  distance_km?: number | null;
  bio_prompt_1: string | null;
  bio_prompt_1_answer: string | null;
  photo_urls?: string[];
}

interface SwipeCardProps {
  profile: DiscoverProfile;
  onSwipe: (direction: "left" | "right" | "super") => void;
  isTop: boolean;
  stackIndex?: number;
  onViewProfile?: (profile: DiscoverProfile) => void;
  isPremium?: boolean;
}

const CompatibilityRing = ({ score }: { score: number }) => {
  const circumference = 2 * Math.PI * 38;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "hsl(var(--accent))" : score >= 60 ? "hsl(var(--primary))" : "hsl(var(--secondary-foreground))";

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="38" fill="none" stroke="hsl(var(--border))" strokeWidth="3" opacity={0.3} />
        <motion.circle
          cx="40" cy="40" r="38" fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
        />
      </svg>
      <div className="text-center">
        <motion.span
          className="text-lg font-bold text-foreground font-display"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {score}%
        </motion.span>
      </div>
    </div>
  );
};

const socialLabel = (e: number | null) => {
  if (!e) return "Balanced";
  if (e <= 3) return "🌙 Introvert";
  if (e >= 8) return "☀️ Extrovert";
  return "🌗 Ambivert";
};

const getAge = (birthDate: string | null): number | null => {
  if (!birthDate) return null;
  const birth = new Date(birthDate + "T12:00:00");
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const getCity = (place: string | null): string | null => {
  if (!place) return null;
  return place.split(",")[0].trim();
};

const SwipeCard = ({ profile, onSwipe, isTop, stackIndex = 0, isPremium = false }: SwipeCardProps) => {
  const { isVerified } = useVerificationStatus(profile.user_id);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-18, 18]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, 0], [1, 0]);
  const superLikeOpacity = useTransform(y, [-100, 0], [1, 0]);
  const [exiting, setExiting] = useState(false);
  const [exitDir, setExitDir] = useState<"left" | "right" | "up">("right");
  const [photoIndex, setPhotoIndex] = useState(0);

  // Build photo array: avatar + gallery photos (deduplicated)
  const allPhotos = (() => {
    const photos: string[] = [];
    if (profile.avatar_url) photos.push(profile.avatar_url);
    if (profile.photo_urls) {
      for (const url of profile.photo_urls) {
        if (!photos.includes(url)) photos.push(url);
      }
    }
    return photos;
  })();

  const hasMultiplePhotos = allPhotos.length > 1;
  const currentPhoto = allPhotos[photoIndex] || profile.avatar_url;

  const handlePhotoNav = (e: React.MouseEvent, direction: "prev" | "next") => {
    e.stopPropagation();
    e.preventDefault();
    if (direction === "next") setPhotoIndex((i) => Math.min(i + 1, allPhotos.length - 1));
    else setPhotoIndex((i) => Math.max(i - 1, 0));
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y < -100 && Math.abs(info.offset.x) < 80) {
      if (!isPremium) return; // Block super like for free users
      setExitDir("up");
      setExiting(true);
      onSwipe("super");
      return;
    }
    if (Math.abs(info.offset.x) > 120) {
      setExitDir(info.offset.x > 0 ? "right" : "left");
      setExiting(true);
      onSwipe(info.offset.x > 0 ? "right" : "left");
    }
  };

  const getExitAnimation = (): Record<string, any> => {
    if (!exiting) return isTop ? {} : { scale: 1 - stackIndex * 0.04, y: stackIndex * 10, opacity: 1 - stackIndex * 0.15 };
    if (exitDir === "up") return { y: -600, opacity: 0, scale: 0.8, transition: { duration: 0.4, ease: "easeIn" as const } };
    return { x: exitDir === "right" ? 500 : -500, opacity: 0, rotate: exitDir === "right" ? 20 : -20, transition: { duration: 0.35 } };
  };

  return (
    <motion.div
      className={`absolute inset-0 ${isTop ? "z-10 cursor-grab active:cursor-grabbing" : ""}`}
      style={{
        x: isTop ? x : undefined,
        y: isTop ? y : undefined,
        rotate: isTop ? rotate : undefined,
        zIndex: 10 - stackIndex,
      }}
      drag={isTop ? true : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      initial={isTop ? { scale: 1 } : { scale: 1 - stackIndex * 0.04, y: stackIndex * 10, opacity: 1 - stackIndex * 0.15 }}
      animate={getExitAnimation()}
    >
      {/* Swipe overlays */}
      {isTop && (
        <>
          <motion.div
            className="absolute top-8 right-8 z-20 border-2 border-green-400/80 rounded-2xl px-6 py-2 -rotate-12 bg-green-400/10 backdrop-blur-sm"
            style={{ opacity: likeOpacity }}
          >
            <span className="font-display text-green-400 text-xl font-black tracking-wider">YES</span>
          </motion.div>
          <motion.div
            className="absolute top-8 left-8 z-20 border-2 border-red-400/80 rounded-2xl px-6 py-2 rotate-12 bg-red-400/10 backdrop-blur-sm"
            style={{ opacity: passOpacity }}
          >
            <span className="font-display text-red-400 text-xl font-black tracking-wider">NEXT</span>
          </motion.div>
          <motion.div
            className="absolute top-8 left-1/2 -translate-x-1/2 z-20 border-2 border-accent/80 rounded-2xl px-6 py-2 bg-accent/10 backdrop-blur-sm"
            style={{ opacity: superLikeOpacity }}
          >
            <span className="font-display text-accent text-xl font-black tracking-wider">⭐ SUPER</span>
          </motion.div>
        </>
      )}

      <div className="w-full h-full rounded-3xl overflow-hidden border border-border/30 glass-card flex flex-col">
        {/* Photo carousel */}
        {allPhotos.length > 0 && (
          <div className="relative w-full h-72 bg-muted shrink-0">
            <img 
              src={currentPhoto || ""} 
              alt={profile.display_name || ""} 
              className="w-full h-full object-cover"
            />
            {/* Photo indicator dots */}
            {hasMultiplePhotos && (
              <div className="absolute top-2 left-0 right-0 flex justify-center gap-1 z-10">
                {allPhotos.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all ${
                      i === photoIndex ? "w-6 bg-foreground/90" : "w-2 bg-foreground/40"
                    }`}
                  />
                ))}
              </div>
            )}
            {/* Tap zones for navigation */}
            {hasMultiplePhotos && isTop && (
              <>
                <button
                  className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
                  onClick={(e) => handlePhotoNav(e, "prev")}
                  onPointerDown={(e) => e.stopPropagation()}
                />
                <button
                  className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
                  onClick={(e) => handlePhotoNav(e, "next")}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              </>
            )}
            {/* Gradient overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent" />
          </div>
        )}

        {/* Header */}
        <div className="relative p-5 pb-3 -mt-8 z-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-mystical flex items-center justify-center ring-2 ring-primary/20 overflow-hidden shadow-mystical">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-foreground/70" />
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <h2 className="font-display text-xl font-bold text-foreground truncate">
                  {profile.display_name || "New Here"}
                </h2>
                {isVerified && <VerifiedBadge size="sm" />}
                {getAge(profile.birth_date) && (
                  <span className="text-lg text-muted-foreground font-medium">{getAge(profile.birth_date)}</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {(profile.current_city || getCity(profile.birth_place)) && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" /> {profile.current_city || getCity(profile.birth_place)}
                    {profile.distance_km != null && (
                      <span className="text-muted-foreground/70 ml-0.5">· {Math.round(profile.distance_km * 0.621371)} mi</span>
                    )}
                  </span>
                )}
                <span className="text-xs text-accent font-semibold tracking-wide">{profile.connection_type}</span>
              </div>
            </div>
            <CompatibilityRing score={profile.compatibility_score} />
          </div>

          {/* Connection reason */}
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-primary/8 border border-primary/15 rounded-xl p-3"
          >
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-accent mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground leading-relaxed font-serif">{profile.compatibility_reason}</p>
            </div>
          </motion.div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-3">
          {/* Cosmic signature */}
          <div className="space-y-2">
            <h3 className="section-heading">Their Vibe</h3>
            <div className="flex flex-wrap gap-1.5">
              {profile.sun_sign && (
                <Badge variant="secondary" className="bg-secondary/40 text-xs">
                  <Star className="w-3 h-3 mr-1" /> ☉ {profile.sun_sign}
                </Badge>
              )}
              {profile.moon_sign && (
                <Badge variant="secondary" className="bg-secondary/40 text-xs">☽ {profile.moon_sign}</Badge>
              )}
              {profile.rising_sign && (
                <Badge variant="secondary" className="bg-secondary/40 text-xs">↗ {profile.rising_sign}</Badge>
              )}
              {profile.human_design_type && (
                <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                  <Zap className="w-3 h-3 mr-1" /> {profile.human_design_type}
                </Badge>
              )}
              {profile.life_path_number && (
                <Badge variant="outline" className="border-accent/30 text-accent text-xs">
                  Life Path {profile.life_path_number}
                </Badge>
              )}
              <Badge variant="secondary" className="bg-accent/15 text-accent text-xs">
                {socialLabel(profile.social_energy)}
              </Badge>
            </div>
          </div>

          {/* Shared aspects */}
          {profile.shared_aspects?.length > 0 && (
            <div className="space-y-2">
              <h3 className="section-heading">Things in Common</h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.shared_aspects.map((a, i) => (
                  <Badge key={i} variant="secondary" className="bg-primary/12 text-primary text-xs">{a}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Gene Keys */}
          {profile.gene_keys_life_purpose && (
            <div className="bg-accent/5 rounded-xl p-3 border border-accent/15">
              <div className="text-xs text-accent font-medium mb-1">Their Life Purpose</div>
              <div className="text-xs text-muted-foreground font-serif">{profile.gene_keys_life_purpose}</div>
            </div>
          )}

          {/* Bio Prompt */}
          {profile.bio_prompt_1 && profile.bio_prompt_1_answer && (
            <div className="bg-primary/5 rounded-xl p-3 border border-primary/15">
              <div className="text-xs text-primary font-medium mb-1">{profile.bio_prompt_1}</div>
              <div className="text-xs text-foreground font-serif leading-relaxed">{profile.bio_prompt_1_answer}</div>
            </div>
          )}

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="space-y-2">
              <h3 className="section-heading">Interests</h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.interests.slice(0, 8).map((interest, i) => (
                  <Badge key={i} variant="secondary" className="text-xs bg-secondary/30">{interest}</Badge>
                ))}
                {profile.interests.length > 8 && (
                  <Badge variant="secondary" className="text-xs bg-secondary/20 text-muted-foreground">
                    +{profile.interests.length - 8} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {isTop && (
          <div className="p-5 pt-2 flex justify-center items-center gap-5">
            <motion.button
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.85 }}
              onClick={() => { setExitDir("left"); setExiting(true); onSwipe("left"); }}
              className="w-14 h-14 rounded-full bg-card border border-destructive/20 flex items-center justify-center hover:bg-destructive/10 transition-colors shadow-elevated"
            >
              <X className="w-6 h-6 text-destructive" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.15, y: -4 }}
              whileTap={{ scale: 0.85 }}
              onClick={() => {
                if (!isPremium) {
                  onSwipe("super"); // Will be intercepted by Discover to show toast
                  return;
                }
                setExitDir("up"); setExiting(true); onSwipe("super");
              }}
              className={`w-16 h-16 rounded-full border border-accent/30 flex items-center justify-center relative ${!isPremium ? "opacity-60" : ""}`}
              style={{ background: "var(--gradient-golden)", boxShadow: "var(--shadow-golden)" }}
            >
              <Star className="w-8 h-8 text-accent-foreground fill-current" />
              {!isPremium && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Lock className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.85 }}
              onClick={() => { setExitDir("right"); setExiting(true); onSwipe("right"); }}
              className="w-14 h-14 rounded-full bg-card border border-green-400/20 flex items-center justify-center hover:bg-green-400/10 transition-colors shadow-elevated"
            >
              <Heart className="w-6 h-6 text-green-400" />
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SwipeCard;
