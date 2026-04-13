import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2, Plus, X, GripVertical, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [photos, setPhotos] = useState<ProfilePhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPhotos();
  }, [userId]);

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

  return (
    <div className="space-y-3">
      <div className={`grid ${gridCols} gap-2`}>
        <AnimatePresence mode="popLayout">
          {photos.map((photo) => (
            <motion.div
              key={photo.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative aspect-square rounded-xl overflow-hidden group"
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
