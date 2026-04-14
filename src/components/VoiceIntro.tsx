import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AudioPlayer from "@/components/AudioPlayer";

interface VoiceIntroProps {
  userId: string;
  currentUrl: string | null;
  onUpdate: (url: string | null) => void;
  editable?: boolean;
}

const MAX_DURATION = 15;

const VoiceIntro = ({ userId, currentUrl, onUpdate, editable = false }: VoiceIntroProps) => {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const { toast } = useToast();

  // Get signed URL for playback
  const getSignedUrl = useCallback(async (path: string) => {
    if (path.startsWith("http")) return path;
    const { data } = await supabase.storage.from("voice-messages").createSignedUrl(path, 3600);
    return data?.signedUrl || null;
  }, []);

  // Load signed URL on mount if currentUrl exists
  useState(() => {
    if (currentUrl) {
      getSignedUrl(currentUrl).then(setSignedUrl);
    }
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        await uploadVoiceIntro(blob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => {
          if (d >= MAX_DURATION - 1) {
            stopRecording();
            return MAX_DURATION;
          }
          return d + 1;
        });
      }, 1000);
    } catch {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const uploadVoiceIntro = async (blob: Blob) => {
    setUploading(true);
    try {
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      const fileName = `voice-intros/${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("voice-messages")
        .upload(fileName, blob, { contentType: blob.type });
      if (uploadError) throw uploadError;

      await supabase.from("profiles").update({ voice_intro_url: fileName } as any).eq("user_id", userId);
      onUpdate(fileName);

      const signed = await getSignedUrl(fileName);
      setSignedUrl(signed);
      toast({ title: "Voice intro saved! 🎤" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteVoiceIntro = async () => {
    if (currentUrl && !currentUrl.startsWith("http")) {
      await supabase.storage.from("voice-messages").remove([currentUrl]);
    }
    await supabase.from("profiles").update({ voice_intro_url: null } as any).eq("user_id", userId);
    onUpdate(null);
    setSignedUrl(null);
    toast({ title: "Voice intro removed" });
  };

  if (!editable && !currentUrl) return null;

  return (
    <div className="space-y-2">
      {signedUrl || currentUrl ? (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <AudioPlayer src={signedUrl || currentUrl || ""} />
          </div>
          {editable && (
            <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={deleteVoiceIntro}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      ) : editable ? (
        <div className="flex items-center gap-3">
          {recording ? (
            <>
              <Button variant="destructive" size="sm" onClick={stopRecording} className="gap-2">
                <Square className="w-3 h-3" /> Stop ({MAX_DURATION - duration}s)
              </Button>
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            </>
          ) : uploading ? (
            <Button disabled size="sm" className="gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Saving...
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={startRecording} className="gap-2 border-primary/30">
              <Mic className="w-4 h-4" /> Record Voice Intro ({MAX_DURATION}s max)
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default VoiceIntro;
