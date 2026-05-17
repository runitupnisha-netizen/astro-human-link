import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, User, X, Loader2, RefreshCw, AlertTriangle, PhoneCall, Activity, ChevronDown, ChevronUp, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import PremiumRequiredScreen from "@/components/PremiumRequiredScreen";
import { toast } from "sonner";
import DailyIframe, { DailyCall, DailyEventObjectParticipant, DailyEventObjectFatalError, DailyEventObjectNonFatalError } from "@daily-co/daily-js";
import { usePremium } from "@/hooks/usePremium";
import { useAuth } from "@/hooks/useAuth";
import { playRingtone, stopRingtone } from "@/lib/ringtone";

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

const CallScreen = ({ open, onClose, callerName, callerAvatar, callType: initialCallType, isIncoming = false, matchId }: CallScreenProps) => {
  const { subscribed, loading: premiumLoading, subscriptionEnd } = usePremium();
  const { user, session, loading: authLoading } = useAuth();
  // Local mutable call type so the user can downgrade video → voice
  // from the pre-connect screen if their bandwidth/preference shifts.
  const [callType, setCallType] = useState<"voice" | "video">(initialCallType);
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
  const [callStats, setCallStats] = useState<{
    rttMs: number | null;
    jitterMs: number | null;
    packetLossPct: number | null;
    videoRecvKbps: number | null;
  }>({ rttMs: null, jitterMs: null, packetLossPct: null, videoRecvKbps: null });
  const [statsExpanded, setStatsExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const cancelledRef = useRef(false);
  const callObjectRef = useRef<DailyCall | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerHasJoinedOnceRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  // Tracks whether the peer ever joined; used to mark a hangup as "missed"
  // for the recipient when the caller bails before connect.
  const ringtoneActiveRef = useRef(false);

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
    // Auth gate — never call the edge function without a verified session.
    if (authLoading) return;
    if (!user || !session) {
      const msg = "Please sign in to start a call";
      setErrorMessage(msg);
      setCallStatus("error");
      toast.error(msg);
      return;
    }
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
      const serverMessage: string | undefined =
        (data as any)?.error ||
        (data as any)?.message ||
        (error as any)?.context?.body?.error ||
        (error as any)?.context?.body?.message;

      if (status === 403 || code === "PREMIUM_REQUIRED") {
        setShowPremium(true);
        return;
      }

      if (status === 401) {
        const msg = serverMessage || "Your session expired. Please sign in again.";
        setErrorMessage(msg);
        setCallStatus("error");
        toast.error(msg);
        return;
      }

      // Rate limit — surface the friendly message and a hint when to retry,
      // never silently fall back to demo mode (the user is doing this on
      // purpose and deserves the truth).
      if (status === 429 || code === "RATE_LIMITED") {
        const retryAfter = (data as any)?.retry_after;
        const baseMsg = serverMessage ||
          "You're starting calls a little too quickly. Take a breath and try again in a few seconds.";
        const msg = retryAfter
          ? `${baseMsg} (try again in ${retryAfter}s)`
          : baseMsg;
        setErrorMessage(msg);
        setCallStatus("error");
        toast.error(msg, { duration: 6000 });
        return;
      }

      if (error) {
        if (isTransientCallServiceError(error, data, status, code)) {
          startSimulatedCall(mode);
          return;
        }
        const msg = serverMessage || error.message || "Could not start call";
        setErrorMessage(msg);
        setCallStatus("error");
        toast.error(msg);
        return;
      }

      const roomUrl: string | undefined = data?.roomUrl || data?.url;
      const token: string | undefined = data?.token;
      const newSessionId: string | undefined = data?.sessionId;
      if (!roomUrl) {
        if (serverMessage) {
          setErrorMessage(serverMessage);
          setCallStatus("error");
          toast.error(serverMessage);
          return;
        }
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
  }, [matchId, callType, joinDailyRoom, subscribed, premiumLoading, startSimulatedCall, user, session, authLoading]);

  useEffect(() => {
    if (!open) {
      setCallStatus("connecting");
      setErrorMessage(null);
      setRejoinAttempt(0);
      setDuration(0);
      setMuted(false);
      setVideoOff(callType === "voice");
      setCallType(initialCallType);
      setShowPremium(false);
      setRemoteJoined(false);
      setNetworkQuality(null);
      setSimulated(false);
      setCallStats({ rttMs: null, jitterMs: null, packetLossPct: null, videoRecvKbps: null });
      setStatsExpanded(false);
      peerHasJoinedOnceRef.current = false;
      sessionIdRef.current = null;
      stopRingtone();
      ringtoneActiveRef.current = false;
      teardownCallObject();
      return;
    }

    cancelledRef.current = false;
    // Don't fire until both auth and subscription state are known
    if (!premiumLoading && !authLoading) {
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
      stopRingtone();
      ringtoneActiveRef.current = false;
      teardownCallObject();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
    };
  }, [open, callType, provisionRoom, teardownCallObject, premiumLoading, authLoading]);

  // Ringtone: play while ringing / waiting for the peer, stop on connect/end.
  useEffect(() => {
    if (!open) return;
    const shouldRing =
      callStatus === "ringing" || callStatus === "waiting" || callStatus === "connecting";
    if (shouldRing && !ringtoneActiveRef.current) {
      ringtoneActiveRef.current = true;
      playRingtone(isIncoming ? "incoming" : "outgoing");
    } else if (!shouldRing && ringtoneActiveRef.current) {
      ringtoneActiveRef.current = false;
      stopRingtone();
    }
  }, [callStatus, isIncoming, open]);

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

  // Poll Daily for connection-quality stats (RTT, jitter, packet loss).
  // Daily exposes getNetworkStats() which aggregates the underlying
  // RTCStatsReport for us. We sample every 2s while the call is live.
  useEffect(() => {
    if (simulated) return;
    const co = callObjectRef.current;
    if (!co) return;
    if (callStatus !== "connected" && callStatus !== "reconnecting") return;

    let cancelled = false;
    const sample = async () => {
      const co2 = callObjectRef.current;
      if (!co2 || cancelled) return;
      try {
        const stats: any = await co2.getNetworkStats();
        if (cancelled) return;
        const latest = stats?.stats?.latest ?? stats?.latest ?? {};
        const worst = stats?.stats?.worstNetworkQuality ?? null;

        // Daily reports timers in seconds; convert to ms for display.
        const rttSec =
          typeof latest.videoRecvLatestRoundTripTime === "number"
            ? latest.videoRecvLatestRoundTripTime
            : typeof latest.audioRecvLatestRoundTripTime === "number"
              ? latest.audioRecvLatestRoundTripTime
              : null;
        const jitterSec =
          typeof latest.videoRecvJitter === "number"
            ? latest.videoRecvJitter
            : typeof latest.audioRecvJitter === "number"
              ? latest.audioRecvJitter
              : null;
        const lossPct =
          typeof latest.videoRecvPacketLoss === "number"
            ? latest.videoRecvPacketLoss * 100
            : typeof latest.audioRecvPacketLoss === "number"
              ? latest.audioRecvPacketLoss * 100
              : null;
        const kbps =
          typeof latest.videoRecvBitsPerSecond === "number"
            ? latest.videoRecvBitsPerSecond / 1000
            : null;

        setCallStats({
          rttMs: rttSec != null ? Math.round(rttSec * 1000) : null,
          jitterMs: jitterSec != null ? Math.round(jitterSec * 1000) : null,
          packetLossPct: lossPct != null ? Math.max(0, Math.round(lossPct * 10) / 10) : null,
          videoRecvKbps: kbps != null ? Math.round(kbps) : null,
        });

        // Daily also reports a coarse worstNetworkQuality (1=best, 5=worst);
        // map it to our existing "good/low/very-low" pill if no event has fired.
        if (typeof worst === "number") {
          const mapped: "good" | "low" | "very-low" =
            worst >= 4 ? "very-low" : worst >= 3 ? "low" : "good";
          setNetworkQuality((prev) => prev ?? mapped);
        }
      } catch {
        // getNetworkStats can throw early in the call; ignore and try again.
      }
    };

    sample();
    const id = window.setInterval(sample, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [callStatus, simulated]);

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

  // Derive a more specific gate status so the upsell screen can explain
  // *why* the user is blocked (never subscribed, expired, or temporarily
  // inactive) instead of showing a generic message.
  const derivePremiumGateStatus = ():
    | "missing"
    | "expired"
    | "inactive"
    | "unauthenticated"
    | "unavailable" => {
    if (!user || !session) return "unauthenticated";
    if (subscriptionEnd) {
      const end = new Date(subscriptionEnd);
      if (!isNaN(end.getTime()) && end.getTime() < Date.now()) return "expired";
      // Has a known end date but no active sub right now → inactive (e.g.
      // canceled, payment failed, between renewals).
      return "inactive";
    }
    return "missing";
  };

  // Resume context handed to PremiumRequiredScreen so that after Stripe
  // checkout the user lands back on Messages with the same matchId/callType
  // and the call modal auto-reopens. Skipped when there's no matchId
  // (e.g. demo / incoming-only flows).
  const premiumResumeContext = matchId
    ? {
        type: "call",
        returnPath: `/messages?match=${encodeURIComponent(matchId)}`,
        payload: {
          matchId,
          callType,
          callerName,
          callerAvatar,
        },
      }
    : undefined;

  // Hard premium gate: non-subscribers can never see the call UI or trigger
  // a join. Show only the upsell once premium status has resolved.
  if (!premiumLoading && !subscribed) {
    return (
      <PremiumRequiredScreen
        open={open}
        onClose={onClose}
        feature={callType}
        status={derivePremiumGateStatus()}
        subscriptionEnd={subscriptionEnd}
        resumeContext={premiumResumeContext}
      />
    );
  }

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
          status={derivePremiumGateStatus()}
          subscriptionEnd={subscriptionEnd}
          resumeContext={premiumResumeContext}
          onRetry={async () => {
            // Re-invoke create-call-room without closing the call flow.
            // If the user is now premium, the upsell will dismiss itself
            // when provisionRoom succeeds (it sets callStatus !== error).
            setShowPremium(false);
            await provisionRoom("connecting");
          }}
          retryLabel={callType === "voice" ? "Retry voice call" : "Retry video call"}
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

        {/* Connection-health indicator (visible during connected/reconnecting).
            Tap to expand for latency / jitter / packet-loss detail. */}
        {(callStatus === "connected" || callStatus === "reconnecting") && !simulated && (
          <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 z-20">
            <button
              type="button"
              onClick={() => setStatsExpanded((v) => !v)}
              aria-expanded={statsExpanded}
              aria-label="Toggle connection stats"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium backdrop-blur-sm transition-colors ${
                networkQuality === "very-low"
                  ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                  : networkQuality === "low"
                    ? "bg-accent/20 text-accent hover:bg-accent/30"
                    : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>
                {networkQuality === "very-low"
                  ? "Poor connection"
                  : networkQuality === "low"
                    ? "Weak connection"
                    : "Good connection"}
              </span>
              {statsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <AnimatePresence>
              {statsExpanded && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mt-2 mx-auto w-max min-w-[180px] rounded-xl bg-background/70 backdrop-blur-md border border-border/40 px-3 py-2 text-[11px] text-foreground/90 shadow-lg"
                >
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Latency</span>
                    <span className="font-mono">{callStats.rttMs != null ? `${callStats.rttMs} ms` : "—"}</span>
                  </div>
                  <div className="flex justify-between gap-4 mt-0.5">
                    <span className="text-muted-foreground">Jitter</span>
                    <span className="font-mono">{callStats.jitterMs != null ? `${callStats.jitterMs} ms` : "—"}</span>
                  </div>
                  <div className="flex justify-between gap-4 mt-0.5">
                    <span className="text-muted-foreground">Packet loss</span>
                    <span className={`font-mono ${
                      callStats.packetLossPct != null && callStats.packetLossPct >= 5
                        ? "text-destructive"
                        : callStats.packetLossPct != null && callStats.packetLossPct >= 2
                          ? "text-accent"
                          : ""
                    }`}>
                      {callStats.packetLossPct != null ? `${callStats.packetLossPct}%` : "—"}
                    </span>
                  </div>
                  {callType === "video" && (
                    <div className="flex justify-between gap-4 mt-0.5">
                      <span className="text-muted-foreground">Video bitrate</span>
                      <span className="font-mono">{callStats.videoRecvKbps != null ? `${callStats.videoRecvKbps} kbps` : "—"}</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
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
