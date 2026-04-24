import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, User, X, Loader2, RefreshCw, AlertTriangle, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import PremiumRequiredScreen from "@/components/PremiumRequiredScreen";
import { toast } from "sonner";
import DailyIframe, { DailyCall, DailyEventObjectParticipant, DailyEventObjectFatalError, DailyEventObjectNonFatalError } from "@daily-co/daily-js";
import { usePremium } from "@/hooks/usePremium";

interface CallScreenProps {
  open: boolean;
  onClose: () => void;
  callerName: string;
  callerAvatar: string | null;
  callType: "voice" | "video";
  isIncoming?: boolean;
  matchId?: string;
}

type CallStatus =
  | "connecting"
  | "ringing"
  | "waiting"      // joined the room, waiting for the other person
  | "connected"   // both participants present
  | "reconnecting" // network blip, Daily auto-recovering
  | "rejoining"    // we're re-running provision flow after a hard error
  | "error"
  | "ended";

const MAX_REJOIN_ATTEMPTS = 3;

// When the edge function can't be reached (offline, deploy hiccup, 5xx),
// we transparently fall back to a *simulated* call so the UX never dead-ends.
// No real media is exchanged; the local UI runs the same ringing → connected
// flow with a synthetic timer. A subtle "Demo mode" pill keeps it honest.
const isTransientCallServiceError = (
  err: unknown,
  data: any,
  status: number | undefined,
  code: string | undefined,
): boolean => {
  if (code === "PREMIUM_REQUIRED" || status === 403) return false;
  if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
    // 4xx other than timeout/rate-limit are real client errors, don't sim.
    return false;
  }
  // Treat network errors, 5xx, function-not-found, and missing roomUrl as transient.
  if (status && status >= 500) return true;
  if (err) {
    const msg = (err as any)?.message?.toLowerCase?.() || "";
    if (/failed to fetch|network|timeout|fetch failed|load failed/i.test(msg)) return true;
    if (/not found|404/i.test(msg)) return true;
  }
  if (!data?.roomUrl && !data?.url) return true;
  return false;
};

const CallScreen = ({ open, onClose, callerName, callerAvatar, callType, isIncoming = false, matchId }: CallScreenProps) => {
  const { subscribed, loading: premiumLoading } = usePremium();
  const [callStatus, setCallStatus] = useState<CallStatus>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rejoinAttempt, setRejoinAttempt] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(callType === "voice");
  const [showPremium, setShowPremium] = useState(false);
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<"good" | "low" | "very-low" | null>(null);
  const [simulated, setSimulated] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const cancelledRef = useRef(false);
  const callObjectRef = useRef<DailyCall | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerHasJoinedOnceRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  const teardownCallObject = useCallback(async () => {
    const co = callObjectRef.current;
    callObjectRef.current = null;
    if (!co) return;
    try {
      await co.leave();
    } catch {/* ignore */}
    try {
      await co.destroy();
    } catch {/* ignore */}
  }, []);

  const attachParticipantTracks = useCallback(() => {
    const co = callObjectRef.current;
    if (!co) return;
    const participants = co.participants();
    const remote = Object.values(participants).find((p) => !p.local);

    // Local self-view (video only)
    const localVideoTrack = participants.local?.tracks?.video?.persistentTrack;
    if (localVideoRef.current) {
      if (localVideoTrack) {
        const stream = new MediaStream([localVideoTrack]);
        if (localVideoRef.current.srcObject !== stream) {
          localVideoRef.current.srcObject = stream;
        }
      } else {
        localVideoRef.current.srcObject = null;
      }
    }

    // Remote audio/video
    const remoteVideoTrack = remote?.tracks?.video?.persistentTrack;
    const remoteAudioTrack = remote?.tracks?.audio?.persistentTrack;

    if (remoteVideoRef.current) {
      if (remoteVideoTrack) {
        const stream = new MediaStream([remoteVideoTrack]);
        if (remoteVideoRef.current.srcObject !== stream) {
          remoteVideoRef.current.srcObject = stream;
        }
      } else {
        remoteVideoRef.current.srcObject = null;
      }
    }

    if (remoteAudioRef.current) {
      if (remoteAudioTrack) {
        const stream = new MediaStream([remoteAudioTrack]);
        if (remoteAudioRef.current.srcObject !== stream) {
          remoteAudioRef.current.srcObject = stream;
          remoteAudioRef.current.play().catch(() => {/* autoplay blocked */});
        }
      } else {
        remoteAudioRef.current.srcObject = null;
      }
    }

    const hasRemote = Boolean(remote);
    setRemoteJoined(hasRemote);
    if (hasRemote) peerHasJoinedOnceRef.current = true;
  }, []);

  const joinDailyRoom = useCallback(async (roomUrl: string, token?: string) => {
    await teardownCallObject();

    const co = DailyIframe.createCallObject({
      audioSource: true,
      videoSource: callType === "video",
    });
    callObjectRef.current = co;

    co.on("participant-joined", attachParticipantTracks);
    co.on("participant-updated", attachParticipantTracks);
    co.on("participant-left", () => {
      attachParticipantTracks();
      // If the *other* person hangs up, end the call gracefully on our side
      const co2 = callObjectRef.current;
      if (!co2 || cancelledRef.current) return;
      const others = Object.values(co2.participants()).filter((p) => !p.local);
      if (others.length === 0 && peerHasJoinedOnceRef.current) {
        toast(`${callerName} left the call`);
        handleEndCall();
      }
    });
    co.on("track-started", attachParticipantTracks);
    co.on("track-stopped", attachParticipantTracks);
    co.on("left-meeting", () => {
      if (cancelledRef.current) return;
      setRemoteJoined(false);
    });
    // Network quality / reconnection events
    co.on("network-connection", (ev: any) => {
      if (cancelledRef.current) return;
      if (ev?.event === "interrupted") {
        setCallStatus("reconnecting");
        toast("Reconnecting…", { id: "call-network" });
      } else if (ev?.event === "connected") {
        toast.success("Back online", { id: "call-network" });
        // Daily reconnects automatically; flip back to connected/waiting
        setCallStatus(peerHasJoinedOnceRef.current ? "connected" : "waiting");
      }
    });
    co.on("network-quality-change", (ev: any) => {
      const t = ev?.threshold as "good" | "low" | "very-low" | undefined;
      if (t) setNetworkQuality(t);
    });
    co.on("error", (ev?: DailyEventObjectFatalError) => {
      if (cancelledRef.current) return;
      const msg = ev?.errorMsg || "Call connection error";
      setErrorMessage(msg);
      setCallStatus("error");
      toast.error(msg);
    });
    co.on("nonfatal-error", (ev?: DailyEventObjectNonFatalError) => {
      // Surface permission / device issues
      const t = ev?.type as string | undefined;
      if (t && /permission|camera|mic|input/i.test(t)) {
        toast.error(ev?.errorMsg || "Camera/Mic permission denied");
      }
    });
    co.on("camera-error", () => {
      toast.error("Camera unavailable. Check your browser permissions.");
    });

    await co.join({ url: roomUrl, token, startVideoOff: callType === "voice" });
    if (callType === "voice") {
      await co.setLocalVideo(false);
    }
    attachParticipantTracks();
  }, [callType, attachParticipantTracks, teardownCallObject]);

  const startSimulatedCall = useCallback((mode: "connecting" | "rejoining") => {
    if (cancelledRef.current) return;
    setSimulated(true);
    setErrorMessage(null);
    setCallStatus("ringing");
    if (mode === "rejoining") {
      toast("Reconnected in demo mode");
    } else {
      toast("Live calling is offline — running demo mode");
    }
    // Auto-advance to connected after a short ring
    window.setTimeout(() => {
      if (cancelledRef.current) return;
      peerHasJoinedOnceRef.current = true;
      setRemoteJoined(true);
      setCallStatus("connected");
    }, isIncoming ? 0 : 1800);
  }, [isIncoming]);

  const provisionRoom = useCallback(async (mode: "connecting" | "rejoining") => {
    setCallStatus(mode);
    setErrorMessage(null);
    setSimulated(false);
    // Client-side premium gate — skip edge function for non-subscribers.
    // Wait until subscription status has loaded so we don't bounce subscribers
    // to the upsell during a brief loading window.
    if (premiumLoading) return;
    if (!subscribed) {
      setShowPremium(true);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-call-room",
        { body: { matchId, callType } },
      );

      if (cancelledRef.current) return;

      const status = (error as any)?.context?.status ?? (data as any)?.status;
      const code = (data as any)?.code ?? (error as any)?.context?.code;

      if (status === 403 || code === "PREMIUM_REQUIRED") {
        setShowPremium(true);
        return;
      }

      if (error) {
        if (isTransientCallServiceError(error, data, status, code)) {
          startSimulatedCall(mode);
          return;
        }
        const msg = error.message || "Could not start call";
        setErrorMessage(msg);
        setCallStatus("error");
        toast.error(msg);
        return;
      }

      const roomUrl: string | undefined = data?.roomUrl || data?.url;
      const token: string | undefined = data?.token;
      const newSessionId: string | undefined = data?.sessionId;
      if (!roomUrl) {
        startSimulatedCall(mode);
        return;
      }
      if (newSessionId) sessionIdRef.current = newSessionId;

      try {
        await joinDailyRoom(roomUrl, token);
        if (cancelledRef.current) return;
        // Decide initial post-join state: waiting if alone, connected if peer already there
        const co = callObjectRef.current;
        const others = co
          ? Object.values(co.participants()).filter((p) => !p.local)
          : [];
        setCallStatus(others.length > 0 ? "connected" : "waiting");
      } catch (joinErr) {
        if (cancelledRef.current) return;
        // Daily SDK couldn't establish — surface a graceful fallback too.
        startSimulatedCall(mode);
        return;
      }
      if (mode === "rejoining") {
        toast.success("Reconnected");
      }
    } catch (e) {
      if (cancelledRef.current) return;
      if (isTransientCallServiceError(e, null, undefined, undefined)) {
        startSimulatedCall(mode);
        return;
      }
      const msg = e instanceof Error ? e.message : "Could not start call";
      setErrorMessage(msg);
      setCallStatus("error");
      toast.error(msg);
    }
  }, [matchId, callType, joinDailyRoom, subscribed, premiumLoading, startSimulatedCall]);

  useEffect(() => {
    if (!open) {
      setCallStatus("connecting");
      setErrorMessage(null);
      setRejoinAttempt(0);
      setDuration(0);
      setMuted(false);
      setVideoOff(callType === "voice");
      setShowPremium(false);
      setRemoteJoined(false);
      setNetworkQuality(null);
      setSimulated(false);
      peerHasJoinedOnceRef.current = false;
      sessionIdRef.current = null;
      teardownCallObject();
      return;
    }

    cancelledRef.current = false;
    // Don't fire until subscription state is known
    if (!premiumLoading) {
      provisionRoom("connecting");
    }

    // Hang up cleanly if the user navigates away or closes the tab
    const handleBeforeUnload = () => {
      teardownCallObject();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    return () => {
      cancelledRef.current = true;
      teardownCallObject();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
    };
  }, [open, callType, provisionRoom, teardownCallObject, premiumLoading]);

  // Promote waiting → connected as soon as a remote participant arrives
  useEffect(() => {
    if (callStatus === "waiting" && remoteJoined) {
      setCallStatus("connected");
      toast.success(`${callerName} joined`);
    }
  }, [callStatus, remoteJoined, callerName]);

  // Sync mute state with Daily
  useEffect(() => {
    const co = callObjectRef.current;
    if (simulated) return;
    if (!co || (callStatus !== "connected" && callStatus !== "waiting" && callStatus !== "reconnecting")) return;
    co.setLocalAudio(!muted);
  }, [muted, callStatus, simulated]);

  // Sync video state with Daily
  useEffect(() => {
    const co = callObjectRef.current;
    if (simulated || callType !== "video") return;
    if (!co) return;
    if (callStatus !== "connected" && callStatus !== "waiting" && callStatus !== "reconnecting") return;
    co.setLocalVideo(!videoOff);
  }, [videoOff, callStatus, callType, simulated]);

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
    // Run the timer once a peer is connected; pause during reconnect blips
    if (callStatus === "connected") {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callStatus]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleEndCall = useCallback(() => {
    setCallStatus("ended");
    if (timerRef.current) clearInterval(timerRef.current);
    const wasConnected = peerHasJoinedOnceRef.current && duration > 0;
    if (wasConnected) {
      toast.success(`Call ended · ${formatDuration(duration)}`);
    }
    // Mark session as ended (best-effort — RLS only allows updating our own row).
    const sid = sessionIdRef.current;
    if (sid) {
      sessionIdRef.current = null;
      supabase
        .from("call_sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", sid)
        .then(({ error }) => {
          if (error) console.warn("Failed to mark call session ended:", error.message);
        });
    }
    // Release camera/mic and Daily room immediately, don't wait for unmount
    teardownCallObject();
    setTimeout(onClose, 600);
  }, [duration, onClose, teardownCallObject]);

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
        className="fixed inset-0 z-[100] flex flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-[hsl(270,45%,12%)] via-[hsl(220,35%,7%)] to-[hsl(195,50%,8%)]"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        {/* Remote video (full-screen background for video calls) */}
        {callType === "video" && callStatus === "connected" && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500 ${remoteJoined ? "opacity-100" : "opacity-0"}`}
          />
        )}
        {/* Hidden audio sink for remote participant */}
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

        {/* Local self-view (picture-in-picture, video calls only) */}
        {callType === "video" && callStatus === "connected" && !videoOff && (
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 w-20 h-28 sm:w-28 sm:h-40 md:w-32 md:h-44 rounded-2xl overflow-hidden border border-border/40 bg-background/40 backdrop-blur-sm shadow-lg z-10">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          </div>
        )}

        {/* Close button */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30">
          <Button size="icon" variant="ghost" onClick={handleEndCall} className="text-foreground/60 hover:text-foreground">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Network quality pill (visible during connected/reconnecting) */}
        {(callStatus === "connected" || callStatus === "reconnecting") && networkQuality && networkQuality !== "good" && (
          <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className={`px-3 py-1 rounded-full text-[11px] font-medium backdrop-blur-sm ${
              networkQuality === "very-low"
                ? "bg-destructive/20 text-destructive"
                : "bg-accent/20 text-accent"
            }`}>
              {networkQuality === "very-low" ? "Poor connection" : "Weak connection"}
            </div>
          </div>
        )}

        {/* Demo mode pill — shown whenever we fall back from the live call service */}
        {simulated && callStatus !== "ended" && (
          <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="px-3 py-1 rounded-full text-[11px] font-medium backdrop-blur-sm bg-accent/20 text-accent">
              Demo mode · live calling unavailable
            </div>
          </div>
        )}

        {/* Caller info */}
        <div className={`flex-1 w-full max-w-md mx-auto px-6 flex flex-col items-center justify-center gap-5 sm:gap-6 z-10 min-h-0 ${callType === "video" && callStatus === "connected" && remoteJoined ? "opacity-0 pointer-events-none" : ""}`}>
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
            {(callStatus === "waiting" || callStatus === "reconnecting") && (
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-accent/30"
                style={{ margin: "-16px" }}
              />
            )}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-mystical flex items-center justify-center ring-4 ring-primary/30 overflow-hidden">
              {callerAvatar ? (
                <img src={callerAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 sm:w-14 sm:h-14 text-foreground/60" />
              )}
            </div>
          </div>

          <div className="text-center w-full">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground truncate">{callerName}</h2>
            <motion.p
              key={callStatus}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-sm mt-1 ${
                callStatus === "ringing" ? "text-accent animate-pulse" :
                callStatus === "connecting" || callStatus === "rejoining" || callStatus === "waiting" || callStatus === "reconnecting" ? "text-accent" :
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
              {callStatus === "waiting" && (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Waiting for {callerName}…
                </span>
              )}
              {callStatus === "reconnecting" && (
                <span className="inline-flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Reconnecting…
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

            {/* Manual start CTA — visible before the call is live, when the
                auto-provision didn't run (e.g. premium loading) or after an
                error/dismissal. Re-runs the same provisionRoom flow. */}
            {(callStatus === "connecting" || callStatus === "ringing") && !isIncoming && !simulated && (
              <div className="mt-5 flex items-center justify-center">
                <Button
                  size="lg"
                  onClick={() => provisionRoom("connecting")}
                  className="rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg hover:opacity-95"
                >
                  <PhoneCall className="w-4 h-4 mr-2" />
                  Start 1-on-1 Call
                </Button>
              </div>
            )}

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
        <div className="pb-8 sm:pb-12 pt-6 sm:pt-8 px-6 relative z-20 w-full flex justify-center">
          <div className="flex items-center gap-4 sm:gap-6">
            <Button
              size="icon"
              variant="outline"
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 shrink-0 ${muted ? "bg-destructive/20 border-destructive/50" : "border-border/50"}`}
              onClick={() => setMuted(!muted)}
            >
              {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>

            {callType === "video" && (
              <Button
                size="icon"
                variant="outline"
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 shrink-0 ${videoOff ? "bg-destructive/20 border-destructive/50" : "border-border/50"}`}
                onClick={() => setVideoOff(!videoOff)}
              >
                {videoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </Button>
            )}

            <Button
              size="icon"
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-destructive hover:bg-destructive/80 shadow-lg shrink-0"
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
            className="absolute bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2 z-30"
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
