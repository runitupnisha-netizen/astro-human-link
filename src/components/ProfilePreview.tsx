import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, User, Star, MapPin, Zap, Eye } from "lucide-react";

interface ProfilePreviewProps {
  open: boolean;
  onClose: () => void;
  profile: any;
  photoUrls?: string[];
}

const ProfilePreview = ({ open, onClose, profile, photoUrls = [] }: ProfilePreviewProps) => {
  if (!open || !profile) return null;

  const allPhotos = [profile.avatar_url, ...(photoUrls || [])].filter(Boolean);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-sm max-h-[80vh] overflow-y-auto glass-card rounded-3xl border border-border/30"
            onClick={e => e.stopPropagation()}
          >
            {/* Header badge */}
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <div className="flex items-center gap-2 text-primary">
                <Eye className="w-4 h-4" />
                <span className="text-sm font-semibold">Preview Mode</span>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo */}
            {allPhotos.length > 0 && (
              <div className="relative w-full h-72 bg-muted">
                <img src={allPhotos[0]} alt="" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent" />
              </div>
            )}

            {/* Profile Info */}
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gradient-mystical flex items-center justify-center overflow-hidden ring-2 ring-primary/20">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-7 h-7 text-foreground/70" />
                  )}
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground">
                    {profile.display_name || "Your Name"}
                  </h2>
                  {(profile.current_city || profile.birth_place) && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {profile.current_city || profile.birth_place}
                    </span>
                  )}
                </div>
              </div>

              {/* Cosmic badges */}
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
                  <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                    <Zap className="w-3 h-3 mr-1" /> {profile.human_design_type}
                  </Badge>
                )}
                {profile.life_path_number && (
                  <Badge variant="outline" className="border-accent/30 text-accent text-xs">
                    Life Path {profile.life_path_number}
                  </Badge>
                )}
              </div>

              {/* Bio prompts */}
              {profile.bio_prompt_1 && profile.bio_prompt_1_answer && (
                <div className="bg-primary/5 rounded-xl p-3 border border-primary/15">
                  <div className="text-xs text-primary font-medium mb-1">{profile.bio_prompt_1}</div>
                  <div className="text-xs text-foreground font-serif">{profile.bio_prompt_1_answer}</div>
                </div>
              )}
              {profile.bio_prompt_2 && profile.bio_prompt_2_answer && (
                <div className="bg-accent/5 rounded-xl p-3 border border-accent/15">
                  <div className="text-xs text-accent font-medium mb-1">{profile.bio_prompt_2}</div>
                  <div className="text-xs text-foreground font-serif">{profile.bio_prompt_2_answer}</div>
                </div>
              )}

              {/* Interests */}
              {profile.interests?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {profile.interests.slice(0, 8).map((i: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs bg-secondary/30">{i}</Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 pt-0">
              <p className="text-center text-[11px] text-muted-foreground/60">
                This is how others see your profile
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProfilePreview;
