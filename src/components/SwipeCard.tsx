import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Heart, X, Star, User, MapPin, Lock, Eye } from "lucide-react";
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  onExitComplete?: () => void;
}

const SwipeCard = ({
  profile,
  onSwipe,
  isTop,
  stackIndex = 0,
  isPremium = false,
  exitDirection = null,
  onExitComplete,
}: SwipeCardProps) => {
  const navigate = useNavigate();
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
  const exitDistanceX = typeof window !== "undefined" ? Math.max(window.innerWidth + 320, 900) : 900;
  const exitDistanceY = typeof window !== "undefined" ? Math.max(window.innerHeight + 240, 900) : 900;

  // Stack cards behind
  const stackStyle = !isTop
    ? { scale: 1 - stackIndex * 0.04, y: stackIndex * 8, opacity: 1 - stackIndex * 0.2 }
    : {};

  return (
    <motion.div
      className={`absolute inset-0 transform-gpu [backface-visibility:hidden] ${isTop ? "z-10 cursor-grab active:cursor-grabbing" : ""}`}
      style={{
        x: isTop ? x : undefined,
        y: isTop ? y : undefined,
        rotate: isTop ? rotate : undefined,
        zIndex: 10 - stackIndex,
        willChange: isTop ? "transform" : undefined,
      }}
      drag={isTop && !exitDirection}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.85}
      onDragEnd={isTop ? handleDragEnd : undefined}
      initial={stackStyle}
      animate={
        isTop && exitDirection
          ? {
              x: exitDirection === "left" ? -exitDistanceX : exitDirection === "right" ? exitDistanceX : 0,
              y: exitDirection === "super" ? -exitDistanceY : 0,
              opacity: 1,
              rotate: exitDirection === "left" ? -15 : exitDirection === "right" ? 15 : 0,
              transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
            }
          : stackStyle
      }
      onAnimationComplete={() => {
        if (isTop && exitDirection) onExitComplete?.();
      }}
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
          <div className="absolute bottom-0 left-0 right-0 h-28 [@media(max-height:700px)]:h-24 bg-gradient-to-t from-card via-card/80 to-transparent" />

          {/* Name & basics overlaid on gradient */}
          <div className="absolute bottom-0 left-0 right-0 p-5 [@media(max-height:700px)]:p-4 z-10">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h2 className="min-w-0 truncate font-display text-xl sm:text-2xl font-bold leading-none text-foreground">
                    {profile.display_name || "New Here"}
                  </h2>
                  {age && <span className="shrink-0 text-lg sm:text-xl leading-none text-foreground/80">{age}</span>}
                  {isVerified && <span className="shrink-0"><VerifiedBadge size="sm" /></span>}
                </div>
                {city && (
                  <span className="mt-1 flex items-center gap-1 text-sm text-muted-foreground [@media(max-height:700px)]:text-xs">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{city}</span>
                    {profile.distance_km != null && (
                      <span className="shrink-0 text-muted-foreground/60">· {Math.round(profile.distance_km * 0.621371)} mi</span>
                    )}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-center gap-0.5">
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" opacity="0.2" />
                    <circle
                      cx="28" cy="28" r="24" fill="none"
                      stroke={profile.compatibility_score >= 80 ? "hsl(142, 71%, 45%)" : profile.compatibility_score >= 60 ? "hsl(var(--accent))" : "hsl(var(--primary))"}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 24}`}
                      strokeDashoffset={`${2 * Math.PI * 24 * (1 - profile.compatibility_score / 100)}`}
                    />
                  </svg>
                  <span className="font-display text-base font-bold text-accent">{profile.compatibility_score}%</span>
                </div>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Match</span>
              </div>
            </div>
          </div>
        </div>

        {/* Compact info section */}
        <div className="p-4 space-y-3 [@media(max-height:700px)]:p-3 [@media(max-height:700px)]:space-y-2">
          {/* Astro badges — just the essentials */}
          <div className="flex flex-wrap gap-1.5 [@media(max-height:700px)]:gap-1">
            {profile.sun_sign && (
              <Badge variant="secondary" className="bg-secondary/40 text-xs [@media(max-height:700px)]:text-[11px]">☉ {profile.sun_sign}</Badge>
            )}
            {profile.moon_sign && (
              <Badge variant="secondary" className="bg-secondary/40 text-xs [@media(max-height:700px)]:text-[11px]">☽ {profile.moon_sign}</Badge>
            )}
            {profile.rising_sign && (
              <Badge variant="secondary" className="bg-secondary/40 text-xs [@media(max-height:700px)]:text-[11px]">↗ {profile.rising_sign}</Badge>
            )}
            {profile.human_design_type && (
              <Badge variant="outline" className="border-primary/30 text-primary text-xs [@media(max-height:700px)]:text-[11px]">{profile.human_design_type}</Badge>
            )}
          </div>

          {/* Shared aspects / what you have in common */}
          {profile.shared_aspects && profile.shared_aspects.length > 0 && (
            <div className="flex flex-wrap gap-1 [@media(max-height:700px)]:gap-0.5">
              <span className="text-[10px] text-muted-foreground mr-1">In common:</span>
              {profile.shared_aspects.map((aspect, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                  {aspect}
                </span>
              ))}
            </div>
          )}

          {/* One-liner compatibility reason */}
          {profile.compatibility_reason && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 [@media(max-height:700px)]:text-xs [@media(max-height:700px)]:line-clamp-1">{profile.compatibility_reason}</p>
          )}

          {/* Bio prompt — only one, keeps it light */}
          {profile.bio_prompt_1 && profile.bio_prompt_1_answer && (
            <div className="bg-primary/5 rounded-xl p-3 [@media(max-height:700px)]:p-2.5">
              <p className="text-xs text-primary font-medium mb-0.5">{profile.bio_prompt_1}</p>
              <p className="text-sm text-foreground line-clamp-2 [@media(max-height:700px)]:text-xs [@media(max-height:700px)]:line-clamp-1">{profile.bio_prompt_1_answer}</p>
            </div>
          )}

          {/* View Full Profile */}
          {isTop && !profile.user_id.startsWith("demo-") && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/profile/${profile.user_id}`); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-primary hover:text-foreground transition-colors py-1"
            >
              <Eye className="w-3.5 h-3.5" /> View Full Profile
            </button>
          )}
        </div>

        {/* Action buttons */}
        {isTop && (
          <div className="flex items-center justify-center gap-5 px-5 pb-5 pt-1 [@media(max-height:700px)]:gap-4 [@media(max-height:700px)]:px-4 [@media(max-height:700px)]:pb-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onSwipe("left")}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-destructive/20 bg-card shadow-sm transition-shadow active:shadow-none [@media(max-height:700px)]:h-12 [@media(max-height:700px)]:w-12"
            >
              <X className="h-6 w-6 text-destructive [@media(max-height:700px)]:h-5 [@media(max-height:700px)]:w-5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onSwipe("super")}
              className={`relative flex h-16 w-16 items-center justify-center rounded-full border border-accent/30 ${!isPremium ? "opacity-50" : ""} [@media(max-height:700px)]:h-14 [@media(max-height:700px)]:w-14`}
              style={{ background: "var(--gradient-golden)", boxShadow: "var(--shadow-golden)" }}
            >
              <Star className="h-7 w-7 fill-current text-accent-foreground [@media(max-height:700px)]:h-6 [@media(max-height:700px)]:w-6" />
              {!isPremium && (
                <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary [@media(max-height:700px)]:h-4.5 [@media(max-height:700px)]:w-4.5">
                  <Lock className="h-3 w-3 text-primary-foreground [@media(max-height:700px)]:h-2.5 [@media(max-height:700px)]:w-2.5" />
                </div>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onSwipe("right")}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-green-400/20 bg-card shadow-sm transition-shadow active:shadow-none [@media(max-height:700px)]:h-12 [@media(max-height:700px)]:w-12"
            >
              <Heart className="h-6 w-6 text-green-400 [@media(max-height:700px)]:h-5 [@media(max-height:700px)]:w-5" />
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SwipeCard;
