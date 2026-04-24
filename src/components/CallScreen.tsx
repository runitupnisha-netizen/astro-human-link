import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, User, X, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import PremiumRequiredScreen from "@/components/PremiumRequiredScreen";
import { toast } from "sonner";

interface CallScreenProps {
  open: boolean;
  onClose: () => void;
  callerName: string;
  callerAvatar: string | null;
  callType: "voice" | "video";
  isIncoming?: boolean;
  matchId?: string;
}

type CallStatus = "connecting" | "ringing" | "connected" | "rejoining" | "error" | "ended";

const MAX_REJOIN_ATTEMPTS = 3;

const CallScreen = ({ open, onClose, callerName, callerAvatar, callType, isIncoming = false, matchId }: CallScreenProps) => {
  const [callStatus, setCallStatus] = useState<CallStatus>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rejoinAttempt, setRejoinAttempt] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(callType === "voice");
  const [showPremium, setShowPremium] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const cancelledRef = useRef(false);

  const provisionRoom = useCallback(async (mode: "connecting" | "rejoining") => {
    setCallStatus(mode);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-call-room",
        { body: { matchId } },
      );

      if (cancelledRef.current) return;

      const status = (error as any)?.context?.status ?? (data as any)?.status;
      const code = (data as any)?.code ?? (error as any)?.context?.code;

      if (status === 403 || code === "PREMIUM_REQUIRED") {
        setShowPremium(true);
        return;
      }

      if (error) {
        const msg = error.message || "Could not start call";
        setErrorMessage(msg);
        setCallStatus("error");
        toast.error(msg);
        return;
      }

      if (!data?.url) {
        const msg = "Call service unavailable. Please try again.";
        setErrorMessage(msg);
        setCallStatus("error");
        toast.error(msg);
        return;
      }

      setCallStatus("connected");
      if (mode === "rejoining") {
        toast.success("Reconnected");
      }
    } catch (e) {
      if (cancelledRef.current) return;
      const msg = e instanceof Error ? e.message : "Could not start call";
      setErrorMessage(msg);
      setCallStatus("error");
      toast.error(msg);
    }
  }, [matchId]);

  useEffect(() => {
    if (!open) {
      setCallStatus("connecting");
      setErrorMessage(null);
      setRejoinAttempt(0);
      setDuration(0);
      setMuted(false);
      setVideoOff(callType === "voice");
      setShowPremium(false);
      return;
    }

    cancelledRef.current = false;
    provisionRoom("connecting");

    return () => {
      cancelledRef.current = true;
    };
  }, [open, callType, provisionRoom]);

  const handleRejoin = useCallback(() => {
    if (rejoinAttempt >= MAX_REJOIN_ATTEMPTS) {
      toast.error("Unable to reconnect. Please try again later.");
      return;
    }
    setRejoinAttempt((n) => n + 1);
    toast("Rejoining call…");
    provisionRoom("rejoining");
  }, [rejoinAttempt, provisionRoom]);

  useEffect(() => {
    if (callStatus === "connected") {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callStatus]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleEndCall = () => {
    setCallStatus("ended");
    if (timerRef.current) clearInterval(timerRef.current);
    if (callStatus === "connected" && duration > 0) {
      toast.success(`Call ended · ${formatDuration(duration)}`);
    }
    setTimeout(onClose, 800);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {showPremium && (
        <PremiumRequiredScreen
          open={showPremium}
          onClose={() => {
            setShowPremium(false);
            onClose();
          }}
          feature={callType}
        />
      )}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-gradient-to-b from-[hsl(270,45%,12%)] via-[hsl(220,35%,7%)] to-[hsl(195,50%,8%)]"
      >
        {/* Close button */}
        <div className="absolute top-4 right-4 z-10">
          <Button size="icon" variant="ghost" onClick={handleEndCall} className="text-foreground/60 hover:text-foreground">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Caller info */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {/* Pulsing avatar */}
          <div className="relative">
            {callStatus === "ringing" && (
              <>
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-primary/30"
                  style={{ margin: "-20px" }}
                />
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  className="absolute inset-0 rounded-full bg-accent/20"
                  style={{ margin: "-30px" }}
                />
              </>
            )}
            {callStatus === "connected" && (
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-emerald-500/20"
                style={{ margin: "-8px" }}
              />
            )}
            <div className="w-28 h-28 rounded-full bg-gradient-mystical flex items-center justify-center ring-4 ring-primary/30 overflow-hidden">
              {callerAvatar ? (
                <img src={callerAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-14 h-14 text-foreground/60" />
              )}
            </div>
          </div>

          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-foreground">{callerName}</h2>
            <motion.p
              key={callStatus}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-sm mt-1 ${
                callStatus === "ringing" ? "text-accent animate-pulse" :
                callStatus === "connecting" || callStatus === "rejoining" ? "text-accent" :
                callStatus === "connected" ? "text-emerald-400" :
                callStatus === "error" ? "text-destructive" :
                "text-destructive"
              }`}
            >
              {callStatus === "connecting" && (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Connecting…
                </span>
              )}
              {callStatus === "rejoining" && (
                <span className="inline-flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Rejoining (attempt {rejoinAttempt}/{MAX_REJOIN_ATTEMPTS})…
                </span>
              )}
              {callStatus === "ringing" && (isIncoming ? "Incoming call..." : "Calling...")}
              {callStatus === "connected" && formatDuration(duration)}
              {callStatus === "error" && (
                <span className="inline-flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {errorMessage || "Call failed"}
                </span>
              )}
              {callStatus === "ended" && "Call ended"}
            </motion.p>

            {callStatus === "error" && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRejoin}
                  disabled={rejoinAttempt >= MAX_REJOIN_ATTEMPTS}
                  className="rounded-full"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  {rejoinAttempt >= MAX_REJOIN_ATTEMPTS ? "Try later" : "Rejoin"}
                </Button>
                <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full text-muted-foreground">
                  Dismiss
                </Button>
              </div>
            )}
          </div>

          {/* Sound waves animation when connected */}
          {callStatus === "connected" && (
            <div className="flex items-end gap-1 h-8">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  animate={{ height: [8, 24, 12, 28, 8] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
                  className="w-1 bg-primary/60 rounded-full"
                />
              ))}
            </div>
          )}
        </div>

        {/* Call controls */}
        <div className="pb-16 pt-8">
          <div className="flex items-center gap-6">
            <Button
              size="icon"
              variant="outline"
              className={`w-14 h-14 rounded-full border-2 ${muted ? "bg-destructive/20 border-destructive/50" : "border-border/50"}`}
              onClick={() => setMuted(!muted)}
            >
              {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>

            {callType === "video" && (
              <Button
                size="icon"
                variant="outline"
                className={`w-14 h-14 rounded-full border-2 ${videoOff ? "bg-destructive/20 border-destructive/50" : "border-border/50"}`}
                onClick={() => setVideoOff(!videoOff)}
              >
                {videoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </Button>
            )}

            <Button
              size="icon"
              className="w-16 h-16 rounded-full bg-destructive hover:bg-destructive/80 shadow-lg"
              onClick={handleEndCall}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Incoming call accept button */}
        {isIncoming && callStatus === "ringing" && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-32"
          >
            <Button
              size="icon"
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg"
              onClick={() => setCallStatus("connected")}
            >
              <Phone className="w-6 h-6" />
            </Button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default CallScreen;
