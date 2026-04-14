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
    let cancelled = false;

    // Extract storage path from legacy signed URLs
    const extractPath = (input: string): string => {
      if (!input.startsWith("http")) return input;
      try {
        const url = new URL(input);
        // Supabase signed URLs: /storage/v1/object/sign/<bucket>/<path>?token=...
        const signMatch = url.pathname.match(/\/storage\/v1\/object\/sign\/[^/]+\/(.+)/);
        if (signMatch) return decodeURIComponent(signMatch[1]);
        // Public URLs: /storage/v1/object/public/<bucket>/<path>
        const pubMatch = url.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
        if (pubMatch) return decodeURIComponent(pubMatch[1]);
      } catch {}
      // Can't parse — use as-is (external URL like Tenor GIF)
      setUrl(input);
      return "";
    };

    const storagePath = extractPath(path);
    if (!storagePath) return; // was set directly above

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
