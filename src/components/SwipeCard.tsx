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
  username?: string | null;
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
  relationship_goal?: string | null;
  about_me?: string | null;
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

const sanitizeDisplayName = (name: string | null): string | null => {
  if (!name) return null;
  // Hide email addresses
  if (name.includes("@")) return null;
  // Hide random relay-style hashes (no spaces, all lowercase alphanumeric, 8+ chars)
  const trimmed = name.trim();
  if (!trimmed.includes(" ") && /^[a-z0-9]{8,}$/i.test(trimmed)) return null;
  return trimmed;
};

const getCity = (place: string | null): string | null => {
  if (!place) return null;
  return place.split(",")[0].trim();
};

// --- Graceful fallback helpers --------------------------------------------
const hasText = (v: string | null | undefined): v is string =>
  typeof v === "string" && v.trim().length > 0;

const cleanText = (v: string | null | undefined): string | null =>
  hasText(v) ? v.trim() : null;

const DEFAULT_PROMPT = "A little about me";
const BIO_PLACEHOLDER = "This soul hasn't shared their story yet — open the full profile to learn more.";
const NO_INFO_PLACEHOLDER = "New profile · still discovering their cosmic blueprint ✨";

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
  const [bioExpanded, setBioExpanded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

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

  // Normalize potentially-missing text fields with graceful fallbacks.
  const bioPromptLabel = cleanText(profile.bio_prompt_1) ?? DEFAULT_PROMPT;
  const bioAnswer = cleanText(profile.bio_prompt_1_answer);
  // Always render the bio block — show a friendly placeholder instead of hiding.
  const bioAnswerDisplay = bioAnswer ?? BIO_PLACEHOLDER;
  const isBioPlaceholder = bioAnswer === null;

  const aboutMe = cleanText(profile.about_me);
  const compatibilityReason = cleanText(profile.compatibility_reason);
  const sharedAspects = (profile.shared_aspects ?? []).filter(hasText);
  const interests = (profile.interests ?? []).filter(hasText);
  const relationshipGoal = cleanText(profile.relationship_goal);

  const hasAnyAstro = Boolean(
    profile.sun_sign || profile.moon_sign || profile.rising_sign || profile.human_design_type
  );
  const hasExtraDetails = Boolean(aboutMe || sharedAspects.length > 0 || compatibilityReason);
  const hasAnyVisibleInfo = hasAnyAstro || interests.length > 0 || !!relationshipGoal || hasExtraDetails;

  const handlePhotoNav = (e: React.MouseEvent, direction: "prev" | "next") => {
    e.stopPropagation();
    e.preventDefault();
    if (direction === "next") setPhotoIndex((i) => Math.min(i + 1, allPhotos.length - 1));
    else setPhotoIndex((i) => Math.max(i - 1, 0));
  };

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const { offset, velocity } = info;
    if (detailsExpanded) return;
    // Super like: swipe up (only if premium)
    if (isPremium && offset.y < -80 && Math.abs(offset.x) < 60) {
      onSwipe("super");
      return;
    }
    // Left/right threshold: offset OR velocity
    if (Math.abs(offset.x) > SWIPE_THRESHOLD || Math.abs(velocity.x) > 500) {
      onSwipe(offset.x > 0 ? "right" : "left");
    }
  }, [detailsExpanded, isPremium, onSwipe]);

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
      drag={isTop && !exitDirection && !detailsExpanded}
      dragConstraints={{ left: 0, right: 0, top: isPremium ? 0 : 0, bottom: 0 }}
      dragElastic={{ left: 0.85, right: 0.85, top: isPremium ? 0.85 : 0.1, bottom: 0.1 }}
      onDragEnd={isTop ? handleDragEnd : undefined}
      initial={stackStyle}
      animate={
        isTop && exitDirection
          ? {
              x: exitDirection === "left" ? -exitDistanceX : exitDirection === "right" ? exitDistanceX : 0,
              y: exitDirection === "super" ? -exitDistanceY : 0,
              opacity: 1,
              rotate: exitDirection === "left" ? -18 : exitDirection === "right" ? 18 : 0,
              transition: { duration: 0.18, ease: [0.32, 0, 0.67, 0] },
            }
          : stackStyle
      }
      onAnimationComplete={() => {
        if (isTop && exitDirection) onExitComplete?.();
      }}
    >
      {/* Swipe overlays */}
      {isTop && !detailsExpanded && (
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
          {isPremium && (
            <motion.div
              className="absolute top-8 left-1/2 -translate-x-1/2 z-20 border-2 border-accent/80 rounded-2xl px-6 py-2 bg-accent/10 backdrop-blur-sm pointer-events-none"
              style={{ opacity: superLikeOpacity }}
            >
              <span className="font-display text-accent text-xl font-black tracking-wider">⭐ SUPER</span>
            </motion.div>
          )}
        </>
      )}

      <div className="w-full h-full rounded-3xl overflow-hidden border border-border/30 glass-card flex flex-col">
        {/* Photo — large, immersive */}
        <div className={`relative w-full shrink-0 bg-muted transition-all duration-300 ${detailsExpanded ? "basis-[36%] min-h-[11rem] max-h-[40%]" : "basis-[52%] min-h-[15rem] max-h-[55%]"}`}>
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

          {/* Match score badge — positioned in top-right of photo */}
          <div className="absolute top-4 right-4 z-10 flex flex-col items-center">
            <div className="relative flex h-11 w-11 items-center justify-center bg-card/70 backdrop-blur-md rounded-full">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="19" fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" opacity="0.2" />
                <circle
                  cx="22" cy="22" r="19" fill="none"
                  stroke={profile.compatibility_score >= 80 ? "hsl(142, 71%, 45%)" : profile.compatibility_score >= 60 ? "hsl(var(--accent))" : "hsl(var(--primary))"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 19}`}
                  strokeDashoffset={`${2 * Math.PI * 19 * (1 - profile.compatibility_score / 100)}`}
                />
              </svg>
              <span className="font-display text-xs font-bold text-accent">{profile.compatibility_score}%</span>
            </div>
            <span className="text-[7px] uppercase tracking-wider text-white/80 mt-0.5 drop-shadow">Match</span>
          </div>

          {/* Name & basics overlaid on gradient */}
          <div className="absolute bottom-0 left-0 right-0 p-5 [@media(max-height:700px)]:p-4 z-10">
            <div className="flex flex-wrap items-end gap-x-2 gap-y-1.5 pt-2 overflow-visible">
              <h2 className="block font-display text-xl sm:text-2xl font-bold leading-[1.28] text-foreground break-words overflow-visible">
                {sanitizeDisplayName(profile.display_name) || (profile.username ? `@${profile.username}` : "New Here")}
              </h2>
              {age && <span className="text-lg sm:text-xl leading-none text-foreground/80 pb-0.5">{age}</span>}
              {isVerified && <span className="pb-1"><VerifiedBadge size="sm" /></span>}
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
        </div>

        {/* Compact info section */}
        <div className={`flex-1 min-h-0 p-4 pb-5 [@media(max-height:700px)]:p-3 [@media(max-height:700px)]:pb-4 overflow-y-auto overscroll-contain transition-all duration-300 ${detailsExpanded ? "space-y-3.5" : "space-y-3 [@media(max-height:700px)]:space-y-2"}`}>

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

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-1 [@media(max-height:700px)]:gap-0.5">
              {profile.interests.slice(0, 5).map((interest, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] bg-accent/10 text-accent border border-accent/20">
                  {interest}
                </Badge>
              ))}
              {profile.interests.length > 5 && (
                <span className="text-[10px] text-muted-foreground">+{profile.interests.length - 5} more</span>
              )}
            </div>
          )}

          {/* Relationship goal */}
          {profile.relationship_goal && (
            <Badge variant="outline" className="text-[10px] border-primary/20 text-primary w-fit">
              {profile.relationship_goal}
            </Badge>
          )}

          {hasExtraDetails && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setDetailsExpanded((v) => !v);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="flex w-full items-center justify-between rounded-xl border border-primary/30 bg-gradient-to-br from-primary/12 via-primary/6 to-accent/6 px-4 py-3 text-left transition-all duration-200 hover:border-primary/50 hover:from-primary/18 active:scale-[0.99] touch-manipulation min-h-[52px]"
              aria-expanded={detailsExpanded}
            >
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  {detailsExpanded ? "Less details" : "More details"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {detailsExpanded ? "Tap to hide" : "See bio, shared aspects & more"}
                </p>
              </div>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary text-sm leading-none font-bold transition-transform" aria-hidden="true">
                {detailsExpanded ? "▴" : "▾"}
              </span>
            </button>
          )}

          {detailsExpanded && profile.about_me && (
            <p className="text-sm text-foreground/90 leading-relaxed [@media(max-height:700px)]:text-xs">
              {profile.about_me}
            </p>
          )}

          {detailsExpanded && profile.shared_aspects && profile.shared_aspects.length > 0 && (
            <div className="flex flex-wrap gap-1 [@media(max-height:700px)]:gap-0.5">
              <span className="text-[10px] text-muted-foreground mr-1">In common:</span>
              {profile.shared_aspects.map((aspect, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                  {aspect}
                </span>
              ))}
            </div>
          )}

          {detailsExpanded && profile.compatibility_reason && (
            <p className="text-sm text-muted-foreground leading-relaxed [@media(max-height:700px)]:text-xs">{profile.compatibility_reason}</p>
          )}

          {/* Bio prompt — always visible, tap to expand */}
          {hasBioPrompt && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setBioExpanded((v) => !v); }}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="group w-full text-left bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 hover:from-primary/15 hover:to-accent/10 active:scale-[0.99] transition-all duration-200 rounded-xl p-3.5 [@media(max-height:700px)]:p-3 border border-primary/25 hover:border-primary/40 shadow-sm hover:shadow-md hover:-translate-y-0.5 touch-manipulation"
              aria-expanded={bioExpanded}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-xs text-primary font-semibold flex-1 uppercase tracking-wide">{profile.bio_prompt_1}</p>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs leading-none transition-transform group-hover:scale-110" aria-hidden="true">
                  {bioExpanded ? "▴" : "▾"}
                </span>
              </div>
              <p className={`text-sm text-foreground/95 leading-relaxed [@media(max-height:700px)]:text-xs ${bioExpanded ? "" : "line-clamp-3"}`}>
                {profile.bio_prompt_1_answer}
              </p>
              {profile.bio_prompt_1_answer && profile.bio_prompt_1_answer.length > 100 && (
                <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-primary font-semibold">
                  {bioExpanded ? "Tap to collapse" : "Tap to read more"}
                </span>
              )}
            </button>
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
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => onSwipe("left")}
              aria-label="Pass"
              className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-destructive/25 bg-card shadow-md hover:border-destructive/50 hover:shadow-lg transition-all touch-manipulation [@media(max-height:700px)]:h-12 [@media(max-height:700px)]:w-12"
            >
              <X className="h-7 w-7 text-destructive [@media(max-height:700px)]:h-6 [@media(max-height:700px)]:w-6" strokeWidth={2.5} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => onSwipe("super")}
              aria-label={isPremium ? "Super like" : "Super like (premium)"}
              className={`relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent/40 hover:border-accent/70 shadow-lg transition-all touch-manipulation ${!isPremium ? "opacity-70" : ""} [@media(max-height:700px)]:h-14 [@media(max-height:700px)]:w-14`}
              style={{ background: "var(--gradient-golden)", boxShadow: "var(--shadow-golden)" }}
            >
              <Star className="h-7 w-7 fill-current text-accent-foreground [@media(max-height:700px)]:h-6 [@media(max-height:700px)]:w-6" strokeWidth={2} />
              {!isPremium && (
                <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary border border-card shadow-sm">
                  <Lock className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => onSwipe("right")}
              aria-label="Like"
              className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-green-400/25 bg-card shadow-md hover:border-green-400/60 hover:shadow-lg transition-all touch-manipulation [@media(max-height:700px)]:h-12 [@media(max-height:700px)]:w-12"
            >
              <Heart className="h-7 w-7 text-green-400 fill-green-400/20 [@media(max-height:700px)]:h-6 [@media(max-height:700px)]:w-6" strokeWidth={2.5} />
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SwipeCard;
