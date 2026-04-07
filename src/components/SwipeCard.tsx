import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Heart, X, Star, User, MapPin, Lock } from "lucide-react";
import { useState, useCallback } from "react";
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

// SwipeCardProps defined below with exitDirection

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

const SWIPE_THRESHOLD = 100;

interface SwipeCardProps {
  profile: DiscoverProfile;
  onSwipe: (direction: "left" | "right" | "super") => void;
  isTop: boolean;
  stackIndex?: number;
  onViewProfile?: (profile: DiscoverProfile) => void;
  isPremium?: boolean;
  exitDirection?: "left" | "right" | "super" | null;
}

const SwipeCard = ({ profile, onSwipe, isTop, stackIndex = 0, isPremium = false, exitDirection = null }: SwipeCardProps) => {
  const { isVerified } = useVerificationStatus(profile.user_id);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-15, 15]);
  const likeOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const passOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const superLikeOpacity = useTransform(y, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const [photoIndex, setPhotoIndex] = useState(0);

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

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const { offset, velocity } = info;
    // Super like: swipe up
    if (offset.y < -80 && Math.abs(offset.x) < 60) {
      if (!isPremium) return;
      onSwipe("super");
      return;
    }
    // Left/right threshold: offset OR velocity
    if (Math.abs(offset.x) > SWIPE_THRESHOLD || Math.abs(velocity.x) > 500) {
      onSwipe(offset.x > 0 ? "right" : "left");
    }
  }, [isPremium, onSwipe]);

  const age = getAge(profile.birth_date);
  const city = profile.current_city || getCity(profile.birth_place);

  // Stack cards behind
  const stackStyle = !isTop
    ? { scale: 1 - stackIndex * 0.04, y: stackIndex * 8, opacity: 1 - stackIndex * 0.2 }
    : {};

  return (
    <motion.div
      className={`absolute inset-0 ${isTop ? "z-10 cursor-grab active:cursor-grabbing" : ""}`}
      style={{
        x: isTop ? x : undefined,
        y: isTop ? y : undefined,
        rotate: isTop ? rotate : undefined,
        zIndex: 10 - stackIndex,
      }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.85}
      onDragEnd={isTop ? handleDragEnd : undefined}
      initial={stackStyle}
      animate={stackStyle}
      exit={
        isTop
          ? {
              x: exitDirection === "left" ? -600 : exitDirection === "right" ? 600 : 0,
              y: exitDirection === "super" ? -600 : 0,
              opacity: 0,
              transition: { duration: 0.2, ease: "easeIn" },
            }
          : undefined
      }
    >
      {/* Swipe overlays */}
      {isTop && (
        <>
          <motion.div
            className="absolute top-8 right-8 z-20 border-2 border-green-400/80 rounded-2xl px-6 py-2 -rotate-12 bg-green-400/10 backdrop-blur-sm pointer-events-none"
            style={{ opacity: likeOpacity }}
          >
            <span className="font-display text-green-400 text-xl font-black tracking-wider">YES</span>
          </motion.div>
          <motion.div
            className="absolute top-8 left-8 z-20 border-2 border-red-400/80 rounded-2xl px-6 py-2 rotate-12 bg-red-400/10 backdrop-blur-sm pointer-events-none"
            style={{ opacity: passOpacity }}
          >
            <span className="font-display text-red-400 text-xl font-black tracking-wider">NEXT</span>
          </motion.div>
          <motion.div
            className="absolute top-8 left-1/2 -translate-x-1/2 z-20 border-2 border-accent/80 rounded-2xl px-6 py-2 bg-accent/10 backdrop-blur-sm pointer-events-none"
            style={{ opacity: superLikeOpacity }}
          >
            <span className="font-display text-accent text-xl font-black tracking-wider">⭐ SUPER</span>
          </motion.div>
        </>
      )}

      <div className="w-full h-full rounded-3xl overflow-hidden border border-border/30 glass-card flex flex-col">
        {/* Photo — large, immersive */}
        <div className="relative w-full flex-1 min-h-0 bg-muted">
          {currentPhoto ? (
            <img src={currentPhoto} alt={profile.display_name || ""} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-16 h-16 text-muted-foreground/40" />
            </div>
          )}
          {/* Photo dots */}
          {hasMultiplePhotos && (
            <div className="absolute top-3 left-0 right-0 flex justify-center gap-1 z-10">
              {allPhotos.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all ${i === photoIndex ? "w-6 bg-white/90" : "w-2 bg-white/40"}`}
                />
              ))}
            </div>
          )}
          {/* Photo tap zones */}
          {hasMultiplePhotos && isTop && (
            <>
              <button className="absolute left-0 top-0 bottom-0 w-1/3 z-10" onClick={(e) => handlePhotoNav(e, "prev")} onPointerDown={(e) => e.stopPropagation()} />
              <button className="absolute right-0 top-0 bottom-0 w-1/3 z-10" onClick={(e) => handlePhotoNav(e, "next")} onPointerDown={(e) => e.stopPropagation()} />
            </>
          )}
          {/* Bottom gradient into info */}
          <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-card via-card/80 to-transparent" />

          {/* Name & basics overlaid on gradient */}
          <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-2xl font-bold text-foreground">
                    {profile.display_name || "New Here"}
                  </h2>
                  {age && <span className="text-xl text-foreground/80">{age}</span>}
                  {isVerified && <VerifiedBadge size="sm" />}
                </div>
                {city && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" /> {city}
                    {profile.distance_km != null && (
                      <span className="text-muted-foreground/60"> · {Math.round(profile.distance_km * 0.621371)} mi</span>
                    )}
                  </span>
                )}
              </div>
              {/* Compatibility score */}
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-accent font-display">{profile.compatibility_score}%</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Match</span>
              </div>
            </div>
          </div>
        </div>

        {/* Compact info section */}
        <div className="p-4 space-y-3">
          {/* Astro badges — just the essentials */}
          <div className="flex flex-wrap gap-1.5">
            {profile.sun_sign && (
              <Badge variant="secondary" className="bg-secondary/40 text-xs">☉ {profile.sun_sign}</Badge>
            )}
            {profile.moon_sign && (
              <Badge variant="secondary" className="bg-secondary/40 text-xs">☽ {profile.moon_sign}</Badge>
            )}
            {profile.rising_sign && (
              <Badge variant="secondary" className="bg-secondary/40 text-xs">↗ {profile.rising_sign}</Badge>
            )}
            {profile.human_design_type && (
              <Badge variant="outline" className="border-primary/30 text-primary text-xs">{profile.human_design_type}</Badge>
            )}
          </div>

          {/* One-liner compatibility reason */}
          {profile.compatibility_reason && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{profile.compatibility_reason}</p>
          )}

          {/* Bio prompt — only one, keeps it light */}
          {profile.bio_prompt_1 && profile.bio_prompt_1_answer && (
            <div className="bg-primary/5 rounded-xl p-3">
              <p className="text-xs text-primary font-medium mb-0.5">{profile.bio_prompt_1}</p>
              <p className="text-sm text-foreground line-clamp-2">{profile.bio_prompt_1_answer}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {isTop && (
          <div className="px-5 pb-5 pt-1 flex justify-center items-center gap-5">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onSwipe("left")}
              className="w-14 h-14 rounded-full bg-card border border-destructive/20 flex items-center justify-center shadow-sm active:shadow-none transition-shadow"
            >
              <X className="w-6 h-6 text-destructive" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onSwipe("super")}
              className={`w-16 h-16 rounded-full border border-accent/30 flex items-center justify-center relative ${!isPremium ? "opacity-50" : ""}`}
              style={{ background: "var(--gradient-golden)", boxShadow: "var(--shadow-golden)" }}
            >
              <Star className="w-7 h-7 text-accent-foreground fill-current" />
              {!isPremium && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Lock className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onSwipe("right")}
              className="w-14 h-14 rounded-full bg-card border border-green-400/20 flex items-center justify-center shadow-sm active:shadow-none transition-shadow"
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
