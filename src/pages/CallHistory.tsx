import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, User, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CosmicBackground from "@/components/CosmicBackground";
import CallScreen from "@/components/CallScreen";
import { sanitizeDisplayName } from "@/lib/utils";

type Direction = "incoming" | "outgoing" | "missed";

interface CallEntry {
  id: string;
  matchId: string;
  otherUserId: string;
  otherName: string;
  otherAvatar: string | null;
  otherSun: string | null;
  callType: "voice" | "video";
  direction: Direction;
  startedAt: string;
  durationSec: number | null;
}

const formatDuration = (secs: number | null) => {
  if (secs == null || secs <= 0) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const DirectionIcon = ({ d }: { d: Direction }) => {
  if (d === "missed") return <PhoneMissed className="w-3.5 h-3.5 text-destructive" />;
  if (d === "incoming") return <PhoneIncoming className="w-3.5 h-3.5 text-emerald-400" />;
  return <PhoneOutgoing className="w-3.5 h-3.5 text-accent" />;
};

const CallHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<CallEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState<{
    matchId: string;
    name: string;
    avatar: string | null;
    type: "voice" | "video";
  } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Pull sessions the user participated in (their own + sessions on their matches).
    const { data: matchRows } = await supabase
      .from("matches")
      .select("id, user_a, user_b")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
    const matchIds = (matchRows ?? []).map((m: any) => m.id);
    if (matchIds.length === 0) {
      setEntries([]);
      setLoading(false);
      return;
    }
    const peerByMatch = new Map<string, string>();
    (matchRows ?? []).forEach((m: any) => {
      peerByMatch.set(m.id, m.user_a === user.id ? m.user_b : m.user_a);
    });

    const { data: sessions } = await supabase
      .from("call_sessions")
      .select("id, match_id, user_id, call_type, started_at, ended_at")
      .in("match_id", matchIds)
      .order("started_at", { ascending: false })
      .limit(100);

    const peerIds = Array.from(new Set((sessions ?? []).map((s: any) => peerByMatch.get(s.match_id)).filter(Boolean))) as string[];
    const { data: profiles } = peerIds.length
      ? await supabase
          .from("public_profiles" as any)
          .select("user_id, display_name, avatar_url, sun_sign")
          .in("user_id", peerIds)
      : { data: [] as any[] };
    const profileMap = new Map<string, any>((profiles ?? []).map((p: any) => [p.user_id, p]));

    // Resolve avatars (signed when relative).
    const resolved: CallEntry[] = await Promise.all(
      (sessions ?? []).map(async (s: any) => {
        const peerId = peerByMatch.get(s.match_id) ?? "";
        const peer = profileMap.get(peerId);
        let avatarUrl: string | null = peer?.avatar_url ?? null;
        if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) {
          const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(avatarUrl, 3600);
          avatarUrl = signed?.signedUrl ?? null;
        }
        const startedMs = new Date(s.started_at).getTime();
        const endedMs = s.ended_at ? new Date(s.ended_at).getTime() : null;
        const durationSec = endedMs ? Math.max(0, Math.round((endedMs - startedMs) / 1000)) : null;
        const wasInitiator = s.user_id === user.id;
        // Missed = initiator hung up under ~10s with no peer joining (heuristic for now).
        // Real peer-join telemetry lives in call_events; for the launch, sub-10s sessions
        // count as missed which matches the missed_call notification path.
        const missed = durationSec != null && durationSec < 10;
        const direction: Direction = missed
          ? "missed"
          : wasInitiator
            ? "outgoing"
            : "incoming";
        return {
          id: s.id,
          matchId: s.match_id,
          otherUserId: peerId,
          otherName: sanitizeDisplayName(peer?.display_name) || "Someone",
          otherAvatar: avatarUrl,
          otherSun: peer?.sun_sign ?? null,
          callType: (s.call_type === "voice" ? "voice" : "video") as "voice" | "video",
          direction,
          startedAt: s.started_at,
          durationSec,
        };
      }),
    );

    setEntries(resolved);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-background relative">
      <CosmicBackground />
      <div className="relative z-10 pt-20 pb-24 lg:pb-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Back" className="p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-gradient-aurora">Calls</h1>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <Card className="bg-card/70 backdrop-blur-sm border-border/40">
              <CardContent className="py-12 text-center">
                <Phone className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="font-display text-lg text-foreground mb-1">No calls yet</p>
                <p className="text-sm text-muted-foreground font-serif">
                  When you and a match share a call, it'll appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {entries.map((e, i) => (
                <motion.button
                  key={e.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() =>
                    setActiveCall({
                      matchId: e.matchId,
                      name: e.otherName,
                      avatar: e.otherAvatar,
                      type: e.callType,
                    })
                  }
                  className="w-full text-left p-3 rounded-xl bg-card/60 hover:bg-card/80 border border-border/30 backdrop-blur-sm transition-colors flex items-center gap-3"
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-mystical flex items-center justify-center ring-1 ring-border/40 overflow-hidden shrink-0">
                    {e.otherAvatar ? (
                      <img src={e.otherAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-foreground/70" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-sm truncate ${e.direction === "missed" ? "text-destructive" : "text-foreground"}`}>
                        {e.otherName}
                      </span>
                      {e.otherSun && <span className="text-[10px] text-accent shrink-0">☉ {e.otherSun}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                      <DirectionIcon d={e.direction} />
                      <span className="capitalize">{e.direction}</span>
                      <span>·</span>
                      {e.callType === "video" ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                      <span>{e.callType === "video" ? "Video" : "Voice"}</span>
                      <span>·</span>
                      <span>{formatDuration(e.durationSec)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {formatDistanceToNow(new Date(e.startedAt), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Call ${e.otherName} back`}
                    className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setActiveCall({
                        matchId: e.matchId,
                        name: e.otherName,
                        avatar: e.otherAvatar,
                        type: e.callType,
                      });
                    }}
                  >
                    {e.callType === "video" ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                  </Button>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeCall && (
        <CallScreen
          open={!!activeCall}
          onClose={() => {
            setActiveCall(null);
            load();
          }}
          callerName={activeCall.name}
          callerAvatar={activeCall.avatar}
          callType={activeCall.type}
          matchId={activeCall.matchId}
        />
      )}
    </div>
  );
};

export default CallHistory;