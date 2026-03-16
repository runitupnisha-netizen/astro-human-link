import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  disabled?: boolean;
}

const VoiceRecorder = ({ onRecordingComplete, disabled }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onRecordingComplete(blob);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      // Microphone permission denied or not available
    }
  }, [onRecordingComplete]);

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
          >
            <Mic className="w-4 h-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VoiceRecorder;
