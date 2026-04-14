import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AudioPlayer from "@/components/AudioPlayer";

interface SignedMediaProps {
  bucket: string;
  path: string;
  type: "image" | "voice";
  isMe?: boolean;
}

const SignedMedia = ({ bucket, path, type, isMe }: SignedMediaProps) => {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // If path is already a full URL (legacy signed URL or external), use it directly
    if (path.startsWith("http")) {
      setUrl(path);
      return;
    }

    let cancelled = false;
    const getUrl = async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600);
      if (cancelled) return;
      if (error || !data?.signedUrl) {
        setError(true);
        return;
      }
      setUrl(data.signedUrl);
    };
    getUrl();
    return () => { cancelled = true; };
  }, [bucket, path]);

  if (error) {
    return <span className="text-xs text-muted-foreground italic">Media unavailable</span>;
  }

  if (!url) {
    return (
      <div className="flex items-center gap-2 min-w-[100px]">
        <div className="w-4 h-4 border-2 border-muted-foreground/40 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground">Loading…</span>
      </div>
    );
  }

  if (type === "voice") {
    return <AudioPlayer src={url} isMe={isMe} />;
  }

  return (
    <img
      src={url}
      alt="Shared image"
      className="rounded-lg max-w-[260px] max-h-[300px] object-cover cursor-pointer"
      onClick={() => window.open(url, '_blank')}
    />
  );
};

export default SignedMedia;
