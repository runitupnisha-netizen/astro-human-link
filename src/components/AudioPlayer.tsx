import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioPlayerProps {
  src: string;
  isMe?: boolean;
}

const AudioPlayer = ({ src, isMe }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => setDuration(audio.duration);
    const onTimeUpdate = () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
    setProgress(pct);
  };

  const formatTime = (s: number) => {
    if (!s || !isFinite(s)) return "0:00";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <Button
        size="icon"
        variant="ghost"
        onClick={togglePlay}
        className={`h-8 w-8 shrink-0 rounded-full ${
          isMe
            ? "text-primary-foreground hover:bg-primary-foreground/20"
            : "text-foreground hover:bg-foreground/10"
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>
      <div className="flex-1 flex flex-col gap-1">
        <div
          className="h-1.5 rounded-full bg-foreground/20 cursor-pointer relative overflow-hidden"
          onClick={handleProgressClick}
        >
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all ${
              isMe ? "bg-primary-foreground/80" : "bg-primary"
            }`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className={`text-[10px] ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
          {isPlaying ? formatTime(audioRef.current?.currentTime || 0) : formatTime(duration)}
        </span>
      </div>
    </div>
  );
};

export default AudioPlayer;
