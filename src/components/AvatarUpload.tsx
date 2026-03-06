import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2, User } from "lucide-react";
import { motion } from "framer-motion";

interface AvatarUploadProps {
  userId: string;
  currentUrl: string | null;
  onUpload: (url: string) => void;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-16 h-16",
  md: "w-24 h-24",
  lg: "w-32 h-32",
};

const iconSizeMap = {
  sm: "w-6 h-6",
  md: "w-10 h-10",
  lg: "w-16 h-16",
};

const AvatarUpload = ({ userId, currentUrl, onUpload, size = "lg" }: AvatarUploadProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be under 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);

    // Show preview immediately
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${userId}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Add cache buster
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlWithCacheBust })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      setPreviewUrl(urlWithCacheBust);
      onUpload(urlWithCacheBust);
      toast({ title: "Avatar updated! ✨" });
    } catch (err: any) {
      console.error("Upload error:", err);
      setPreviewUrl(currentUrl);
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localPreview);
    }
  };

  return (
    <div className="relative group">
      <motion.div
        whileHover={{ scale: 1.03 }}
        className={`${sizeMap[size]} rounded-full bg-gradient-mystical flex items-center justify-center shadow-mystical ring-2 ring-primary/20 overflow-hidden cursor-pointer`}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className={`${iconSizeMap[size]} text-foreground animate-spin`} />
        ) : previewUrl ? (
          <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <User className={`${iconSizeMap[size]} text-foreground`} />
        )}
      </motion.div>

      {/* Camera overlay */}
      <div
        className="absolute inset-0 rounded-full bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <Camera className="w-6 h-6 text-foreground" />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default AvatarUpload;
