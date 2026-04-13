import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  disabled?: boolean;
}

const VoiceRecorder = ({ onRecordingComplete, disabled }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    setMicError(null);

    // Check permission status (not supported in Safari, so wrap in try/catch)
    try {
      if (navigator.permissions) {
        const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
        if (status.state === "denied") {
          const msg = "Microphone blocked. Enable it in your browser settings.";
          setMicError(msg);
          toast({ title: msg, variant: "destructive" });
          return;
        }
      }
    } catch {
      // Safari doesn't support microphone permission query — continue
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Pick best supported mimeType
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : undefined;

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const actualType = mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: actualType });
        onRecordingComplete(blob);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err: any) {
      let msg = "Could not access microphone.";
      if (err.name === "NotAllowedError") {
        msg = "Microphone permission denied. Allow it in your browser settings.";
      } else if (err.name === "NotFoundError") {
        msg = "No microphone found on this device.";
      } else if (err.name === "NotReadableError") {
        msg = "Microphone is in use by another app.";
      }
      setMicError(msg);
      toast({ title: msg, variant: "destructive" });
    }
  }, [onRecordingComplete, toast]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setDuration(0);
  }, []);

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <AnimatePresence mode="wait">
      {isRecording ? (
        <motion.div
          key="recording"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="flex items-center gap-2"
        >
          <span className="flex items-center gap-1.5 text-xs text-destructive font-medium">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            {formatDuration(duration)}
          </span>
          <Button
            size="icon"
            variant="destructive"
            onClick={stopRecording}
            className="h-9 w-9 rounded-full shrink-0"
          >
            <Square className="w-3.5 h-3.5" />
          </Button>
        </motion.div>
      ) : (
        <motion.div
          key="idle"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
        >
          <Button
            size="icon"
            variant="ghost"
            onClick={startRecording}
            disabled={disabled}
            className="h-9 w-9 text-muted-foreground hover:text-primary shrink-0"
            title={micError || "Record voice note"}
          >
            <Mic className="w-4 h-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VoiceRecorder;
