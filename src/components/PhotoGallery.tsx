import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2, Plus, X, GripVertical, Star, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

interface PhotoGalleryProps {
  userId: string;
  editable?: boolean;
  maxPhotos?: number;
  columns?: number;
  currentAvatarUrl?: string | null;
  onAvatarChange?: (url: string) => void;
}

interface ProfilePhoto {
  id: string;
  photo_url: string;
  display_order: number;
}

const PhotoGallery = ({ userId, editable = true, maxPhotos = 999, columns = 3, currentAvatarUrl, onAvatarChange }: PhotoGalleryProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [photos, setPhotos] = useState<ProfilePhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPhotos();
  }, [userId]);

  // Check if already liked this user
  useEffect(() => {
    if (!user || !userId || user.id === userId) return;
    supabase
      .from("swipes")
      .select("id")
      .eq("user_id", user.id)
      .eq("target_user_id", userId)
      .eq("action", "like")
      .maybeSingle()
      .then(({ data }) => setLiked(!!data));
  }, [user, userId]);

  const loadPhotos = async () => {
    const { data, error } = await supabase
      .from("profile_photos")
      .select("*")
      .eq("user_id", userId)
      .order("display_order", { ascending: true });

    if (!error && data) {
      setPhotos(data as ProfilePhoto[]);
    }
    setLoading(false);
  };

  const handleLike = async () => {
    if (!user || liking || liked || user.id === userId) return;
    setLiking(true);
    try {
      await supabase.from("swipes").insert({
        user_id: user.id,
        target_user_id: userId,
        action: "like",
      });
      setLiked(true);
      toast({ title: "💖 You liked this person!" });
    } catch {
      toast({ title: "Failed to like", variant: "destructive" });
    } finally {
      setLiking(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesToUpload = Array.from(files);
    setUploading(true);

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];

        if (!file.type.startsWith("image/")) {
          toast({ title: "Please select image files only", variant: "destructive" });
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast({ title: `${file.name} is too large (max 5MB)`, variant: "destructive" });
          continue;
        }

        const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${userId}/gallery-${Date.now()}-${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, file, { upsert: false });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

        const { error: insertError } = await supabase
          .from("profile_photos")
          .insert({
            user_id: userId,
            photo_url: urlWithCacheBust,
            display_order: photos.length + i,
          });

        if (insertError) {
          console.error("Insert error:", insertError);
        }
      }

      await loadPhotos();
      toast({ title: "Photos uploaded! ✨" });
    } catch (err: any) {
      console.error("Upload error:", err);
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (photo: ProfilePhoto) => {
    try {
      const url = new URL(photo.photo_url.split("?")[0]);
      const pathMatch = url.pathname.match(/\/object\/public\/avatars\/(.+)/);
      if (pathMatch) {
        await supabase.storage.from("avatars").remove([pathMatch[1]]);
      }

      await supabase.from("profile_photos").delete().eq("id", photo.id);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      toast({ title: "Photo removed" });
    } catch (err: any) {
      toast({ title: "Failed to remove photo", variant: "destructive" });
    }
  };

  const handleSetAvatar = async (photo: ProfilePhoto) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: photo.photo_url })
        .eq("user_id", userId);

      if (error) throw error;

      onAvatarChange?.(photo.photo_url);
      toast({ title: "Profile photo updated! ✨" });
    } catch (err: any) {
      toast({ title: "Failed to set avatar", variant: "destructive" });
    }
  };

  const isCurrentAvatar = (url: string) => {
    if (!currentAvatarUrl) return false;
    return currentAvatarUrl.split("?")[0] === url.split("?")[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  const gridCols = columns === 2 ? "grid-cols-2" : "grid-cols-3";
  const isOwnProfile = user?.id === userId;

  return (
    <div className="space-y-3">
      <div className={`grid ${gridCols} gap-2`}>
        <AnimatePresence mode="popLayout">
          {photos.map((photo, index) => (
            <motion.div
              key={photo.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer"
              onClick={() => !editable && setLightboxIndex(index)}
            >
              <img
                src={photo.photo_url}
                alt=""
                className="w-full h-full object-cover"
              />
              {editable && (
                <div className="absolute inset-x-0 top-0 flex justify-between p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleSetAvatar(photo)}
                    className={`w-6 h-6 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors ${
                      isCurrentAvatar(photo.photo_url)
                        ? "bg-primary text-primary-foreground"
                        : "bg-background/80 text-muted-foreground hover:bg-primary/80 hover:text-primary-foreground"
                    }`}
                    title="Set as profile photo"
                  >
                    <Star className="w-3.5 h-3.5" fill={isCurrentAvatar(photo.photo_url) ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={() => handleDelete(photo)}
                    className="w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {/* Non-editable: show tap hint */}
              {!editable && !isOwnProfile && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100">
                  <span className="text-[10px] text-white/80 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">Tap to view</span>
                </div>
              )}
              {isCurrentAvatar(photo.photo_url) && (
                <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-primary/90 backdrop-blur-sm text-primary-foreground text-[9px] font-medium">
                  Profile Photo
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add photo button — always visible */}
        {editable && (
          <motion.button
            layout
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-border/50 hover:border-primary/40 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors bg-muted/20 hover:bg-primary/5"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Plus className="w-6 h-6" />
                <span className="text-[10px]">Add Photo</span>
              </>
            )}
          </motion.button>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && photos[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Close button */}
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Navigation arrows */}
            {lightboxIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
                className="absolute left-3 z-50 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {lightboxIndex < photos.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
                className="absolute right-3 z-50 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Photo */}
            <motion.img
              key={photos[lightboxIndex].id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={photos[lightboxIndex].photo_url}
              alt=""
              className="max-w-[90vw] max-h-[80vh] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Like button */}
            {!isOwnProfile && user && (
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                onClick={(e) => { e.stopPropagation(); handleLike(); }}
                disabled={liked || liking}
                className={`absolute bottom-8 z-50 flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all shadow-lg ${
                  liked
                    ? "bg-pink-500 text-white"
                    : "bg-white/15 backdrop-blur-md text-white hover:bg-pink-500/80 hover:scale-105"
                }`}
              >
                <Heart className="w-5 h-5" fill={liked ? "currentColor" : "none"} />
                {liked ? "Liked!" : liking ? "Liking..." : "Like"}
              </motion.button>
            )}

            {/* Photo counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-xs bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
              {lightboxIndex + 1} / {photos.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default PhotoGallery;
