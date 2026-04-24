import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Star, Clock, Sparkles, Users, User, Heart, Zap, Eye, Navigation, RotateCw, WifiOff } from "lucide-react";
import CosmicBackground from "@/components/CosmicBackground";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import VerifiedBadge from "@/components/VerifiedBadge";
import { useVerificationStatuses } from "@/hooks/useVerification";
import EmptyState from "@/components/EmptyState";
import { ConnectionCardSkeleton } from "@/components/Skeletons";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import TourHighlight from "@/components/TourHighlight";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface MatchWithProfile {
  id: string;
  compatibility_score: number | null;
  compatibility_summary: string | null;
  created_at: string;
  otherUserId: string;
  otherProfile: {
    display_name: string | null;
    username: string | null;
    sun_sign: string | null;
    moon_sign: string | null;
    rising_sign: string | null;
    human_design_type: string | null;
    compatibility_tags: string[] | null;
    avatar_url: string | null;
    life_path_number: number | null;
    current_latitude: number | null;
    current_longitude: number | null;
    interests: string[] | null;
    relationship_goal: string | null;
    spiritual_practice: string | null;
  };
  lastMessage: string | null;
  lastMessageAt: string | null;
  distanceKm: number | null;
}

const sanitizeConnectionName = (name: string | null): string | null => {
  if (!name) return null;
  if (name.includes("@")) return null;
  const trimmed = name.trim();
  if (!trimmed.includes(" ") && /^[a-z0-9]{8,}$/i.test(trimmed)) return null;
  return trimmed;
};

// Offline cache helpers — keep recent connection history visible when network drops
const CACHE_VERSION = 1;
const cacheKey = (userId: string) => `stellara:connections-cache:v${CACHE_VERSION}:${userId}`;

interface ConnectionsCache {
  matches: MatchWithProfile[];
  recentChecks: Array<{ id: string; their_name: string | null; compatibility_score: number | null; created_at: string }>;
  cachedAt: string;
}

const readCache = (userId: string): ConnectionsCache | null => {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as ConnectionsCache;
  } catch {
    return null;
  }
};

const writeCache = (userId: string, data: Omit<ConnectionsCache, "cachedAt">) => {
  try {
    localStorage.setItem(
      cacheKey(userId),
      JSON.stringify({ ...data, cachedAt: new Date().toISOString() })
    );
  } catch {
    // Ignore quota / private mode errors
  }
};

const Connections = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const online = useNetworkStatus();
  const [matches, setMatches] = useState<MatchWithProfile[]>([]);
  const [recentChecks, setRecentChecks] = useState<
    Array<{ id: string; their_name: string | null; compatibility_score: number | null; created_at: string }>
  >([]);
  const [servingFromCache, setServingFromCache] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<string | null>(null);

  const otherIds = matches.map((m) => m.otherUserId);
  const verifiedUsers = useVerificationStatuses(otherIds);
  const [loading, setLoading] = useState(true);

  const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const load = useCallback(async () => {
    if (!user) return;

    // If offline, immediately serve cached data without hitting the network
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const cached = readCache(user.id);
      if (cached) {
        setMatches(cached.matches);
        setRecentChecks(cached.recentChecks);
        setCacheTimestamp(cached.cachedAt);
        setServingFromCache(true);
      }
      setLoading(false);
      return;
    }

    try {
    const [matchResult, myProfileResult] = await Promise.all([
      supabase.from("matches").select("*").or(`user_a.eq.${user.id},user_b.eq.${user.id}`).order("created_at", { ascending: false }),
      supabase.from("profiles").select("current_latitude, current_longitude").eq("user_id", user.id).maybeSingle(),
    ]);

    const matchRows = matchResult.data;
    const myCoords = myProfileResult.data;

    if (!matchRows || matchRows.length === 0) {
      // No matches but still cache empty state + recent checks
      const { data: checks } = await supabase
        .from("connection_checks")
        .select("id,their_name,compatibility_score,created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentChecks(checks ?? []);
      writeCache(user.id, { matches: [], recentChecks: checks ?? [] });
      setServingFromCache(false);
      setLoading(false);
      return;
    }

    const otherIds = matchRows.map((m) =>
      m.user_a === user.id ? m.user_b : m.user_a
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, sun_sign, moon_sign, rising_sign, human_design_type, compatibility_tags, avatar_url, life_path_number, current_latitude, current_longitude, interests, relationship_goal, spiritual_practice")
      .in("user_id", otherIds);

    const matchIds = matchRows.map((m) => m.id);
    const { data: messages } = await supabase
      .from("messages")
      .select("match_id, content, created_at")
      .in("match_id", matchIds)
      .order("created_at", { ascending: false });

    const lastMessageMap = new Map<string, { content: string; created_at: string }>();
    (messages || []).forEach((msg) => {
      if (!lastMessageMap.has(msg.match_id)) {
        lastMessageMap.set(msg.match_id, { content: msg.content, created_at: msg.created_at });
      }
    });

    const profileMap = new Map(
      (profiles || []).map((p) => [p.user_id, p])
    );

    const results: MatchWithProfile[] = matchRows.map((m) => {
      const otherId = m.user_a === user.id ? m.user_b : m.user_a;
      const prof = profileMap.get(otherId);
      const lastMsg = lastMessageMap.get(m.id);

      let distanceKm: number | null = null;
      if (myCoords?.current_latitude && myCoords?.current_longitude && prof?.current_latitude && prof?.current_longitude) {
        distanceKm = Math.round(calcDistance(myCoords.current_latitude, myCoords.current_longitude, prof.current_latitude, prof.current_longitude));
      }

      return {
        id: m.id,
        compatibility_score: m.compatibility_score,
        compatibility_summary: m.compatibility_summary,
        created_at: m.created_at,
        otherUserId: otherId,
        otherProfile: prof || {
          display_name: "New Match",
          username: null,
          sun_sign: null,
          moon_sign: null,
          rising_sign: null,
          human_design_type: null,
          compatibility_tags: null,
          avatar_url: null,
          life_path_number: null,
          current_latitude: null,
          current_longitude: null,
          interests: null,
          relationship_goal: null,
          spiritual_practice: null,
        },
        lastMessage: lastMsg?.content || null,
        lastMessageAt: lastMsg?.created_at || null,
        distanceKm,
      };
    });

    setMatches(results);

    // Recent Cosmic Checks — last 5 saved Check a Connection runs
    const { data: checks } = await supabase
      .from("connection_checks")
      .select("id,their_name,compatibility_score,created_at")
      .order("created_at", { ascending: false })
      .limit(5);
    setRecentChecks(checks ?? []);

    // Persist for offline access
    writeCache(user.id, { matches: results, recentChecks: checks ?? [] });
    setServingFromCache(false);
    setCacheTimestamp(null);

    setLoading(false);
    } catch (err) {
      // Network failure mid-fetch — fall back to cached data if we have it
      const cached = readCache(user.id);
      if (cached) {
        setMatches(cached.matches);
        setRecentChecks(cached.recentChecks);
        setCacheTimestamp(cached.cachedAt);
        setServingFromCache(true);
      }
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // When network comes back online, silently refresh from server
  useEffect(() => {
    if (online && servingFromCache && user) {
      load();
    }
  }, [online, servingFromCache, user, load]);

  const { containerRef, pullIndicator, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: load,
  });

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-accent";
    return "text-primary";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Amazing Match";
    if (score >= 80) return "Great Match";
    if (score >= 70) return "Strong Match";
    if (score >= 60) return "Good Match";
    return "New Match";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background relative">
        <CosmicBackground />
        <div className="relative z-10 pt-20 pb-24 md:pb-12">
          <div className="max-w-4xl mx-auto px-6 space-y-4 mt-16">
            {[0, 1, 2, 3].map((i) => (
              <ConnectionCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <CosmicBackground />
      <div ref={containerRef} {...pullHandlers} className="relative z-10 pt-20 pb-24 md:pb-12 overflow-y-auto">
        {pullIndicator}
        <div className="max-w-4xl mx-auto px-6">
          {/* Offline cache notice — visible only when serving stale data */}
          {servingFromCache && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-accent/30 bg-accent/5 text-xs text-accent"
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span>
                Offline · Showing your saved connections
                {cacheTimestamp ? ` from ${formatTime(cacheTimestamp)}` : ""}
              </span>
            </motion.div>
          )}

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h1 className="text-4xl font-bold mb-3 bg-gradient-aurora bg-clip-text text-transparent">
              {t("connections.title")}
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              {matches.length > 0 ? (
                <>
                  You have {matches.length} cosmic {matches.length > 1 ? "connections" : "connection"} aligned with your energy.{" "}
                  <button onClick={() => navigate("/")} className="text-primary hover:underline underline-offset-2 transition-colors">{t("connections.discover_more")}</button>
                </>
              ) : (
                <>
                  {t("connections.no_connections")}{" "}
                  <button onClick={() => navigate("/")} className="text-primary hover:underline underline-offset-2 transition-colors">{t("connections.start_discovering")}</button>
                </>
              )}
            </p>
          </motion.div>

          {/* Check a Connection CTA — 44px min tap target */}
          <div className="flex justify-center mb-8 -mt-4">
            <button
              onClick={() => navigate("/check-connection")}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] text-xs px-5 py-2.5 rounded-full transition-colors hover:bg-primary/10"
              style={{
                backgroundColor: "hsl(var(--primary) / 0.08)",
                border: "0.5px solid hsl(var(--primary) / 0.3)",
                color: "hsl(var(--primary))",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Check a Connection ✦
            </button>
          </div>

          {/* Recent Cosmic Checks — quick rerun of past Check a Connection readings */}
          {recentChecks.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Recent Cosmic Checks
                </h3>
                <button
                  onClick={() => navigate("/check-connection")}
                  className="inline-flex items-center justify-center min-h-[36px] px-2 -mr-2 text-xs text-primary hover:underline underline-offset-2 rounded"
                >
                  View all
                </button>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {recentChecks.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/check-connection?rerun=${c.id}`)}
                    className="group shrink-0 flex flex-col items-start justify-center gap-1.5 px-4 py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] min-h-[60px]"
                    style={{
                      backgroundColor: "hsl(var(--primary) / 0.06)",
                      border: "0.5px solid hsl(var(--primary) / 0.2)",
                      minWidth: "150px",
                      maxWidth: "190px",
                    }}
                    aria-label={`Rerun cosmic check for ${c.their_name || "previous connection"}`}
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <span
                        className="text-sm font-medium truncate text-foreground"
                        style={{ fontFamily: "Lora, Georgia, serif" }}
                      >
                        {c.their_name?.trim() || "Unnamed"}
                      </span>
                      {typeof c.compatibility_score === "number" && (
                        <span
                          className="text-[10px] font-semibold shrink-0 px-1.5 py-0.5 rounded-full"
                          style={{
                            color: "hsl(var(--primary))",
                            backgroundColor: "hsl(var(--primary) / 0.12)",
                          }}
                        >
                          {c.compatibility_score}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <RotateCw className="w-2.5 h-2.5 group-hover:rotate-180 transition-transform duration-500" />
                      <span>Rerun · {formatTime(c.created_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {matches.length === 0 ? (
            <EmptyState type="connections" />
          ) : (
            <TourHighlight
              targetId="connections-list"
              label="Your connections"
              className="space-y-4"
            >
              {matches.map((match, i) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card
                    className="bg-card/70 backdrop-blur-sm border-border/40 interactive-card group"
                    onClick={() => navigate(`/messages?match=${match.id}`)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Avatar with score ring */}
                        <div className="relative shrink-0">
                          <div className="relative">
                            <div className="w-16 h-16 rounded-full bg-gradient-mystical flex items-center justify-center shadow-mystical ring-2 ring-primary/20 overflow-hidden">
                              {match.otherProfile.avatar_url ? (
                                <img src={match.otherProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-8 h-8 text-foreground" />
                              )}
                            </div>
                            {/* Score ring overlay */}
                            {match.compatibility_score != null && (
                              <svg className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] -rotate-90" viewBox="0 0 72 72">
                                <circle cx="36" cy="36" r="34" fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" opacity="0.15" />
                                <circle
                                  cx="36" cy="36" r="34" fill="none"
                                  stroke={match.compatibility_score >= 80 ? "hsl(142, 71%, 45%)" : match.compatibility_score >= 60 ? "hsl(var(--accent))" : "hsl(var(--primary))"}
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeDasharray={`${2 * Math.PI * 34}`}
                                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - match.compatibility_score / 100)}`}
                                />
                              </svg>
                            )}
                          </div>
                          {/* Score badge centered below avatar */}
                          {match.compatibility_score != null && (
                            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-10">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                match.compatibility_score >= 80 ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                                match.compatibility_score >= 60 ? "bg-accent/20 text-accent border border-accent/30" :
                                "bg-primary/20 text-primary border border-primary/30"
                              }`}>
                                {match.compatibility_score}%
                              </span>
                            </div>
                          )}
                          {match.compatibility_score && match.compatibility_score >= 80 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center ring-2 ring-background">
                              <Zap className="w-2.5 h-2.5 text-background" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3
                              className="text-lg font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                              onClick={(e) => { e.stopPropagation(); navigate(`/profile/${match.otherUserId}`); }}
                            >
                              {sanitizeConnectionName(match.otherProfile.display_name) || (match.otherProfile.username ? `@${match.otherProfile.username}` : "New Connection")}
                            </h3>
                            {verifiedUsers.has(match.otherUserId) && <VerifiedBadge size="sm" />}
                          </div>

                          {/* Cosmic badges row */}
                          <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            {match.otherProfile.sun_sign && (
                              <span className="text-xs text-muted-foreground">☉ {match.otherProfile.sun_sign}</span>
                            )}
                            {match.otherProfile.moon_sign && (
                              <span className="text-xs text-muted-foreground">· ☽ {match.otherProfile.moon_sign}</span>
                            )}
                            {match.otherProfile.human_design_type && (
                              <span className="text-xs text-muted-foreground">· {match.otherProfile.human_design_type}</span>
                            )}
                            {match.otherProfile.life_path_number && (
                              <span className="text-xs text-muted-foreground">· LP {match.otherProfile.life_path_number}</span>
                            )}
                            {match.distanceKm != null && (
                              <span className="text-xs text-accent flex items-center gap-0.5">
                                · <Navigation className="w-3 h-3" /> {Math.round(match.distanceKm * 0.621371)} mi
                              </span>
                            )}
                          </div>

                          {/* Key info: relationship goal, interests */}
                          <div className="flex flex-wrap items-center gap-1 mb-2">
                            {match.otherProfile.relationship_goal && (
                              <Badge variant="outline" className="text-[10px] border-accent/20 text-accent">
                                {match.otherProfile.relationship_goal}
                              </Badge>
                            )}
                            {match.otherProfile.spiritual_practice && (
                              <Badge variant="outline" className="text-[10px] border-primary/20 text-primary">
                                {match.otherProfile.spiritual_practice}
                              </Badge>
                            )}
                            {match.otherProfile.interests && match.otherProfile.interests.slice(0, 3).map((interest, idx) => (
                              <Badge key={idx} variant="secondary" className="text-[10px] bg-muted/40">
                                {interest}
                              </Badge>
                            ))}
                          </div>

                          {/* Last message or compatibility summary */}
                          {match.lastMessage ? (
                            <p className="text-sm text-muted-foreground truncate">
                              {match.lastMessage}
                            </p>
                          ) : match.compatibility_summary ? (
                            <p className="text-sm text-muted-foreground truncate italic">
                              {match.compatibility_summary}
                            </p>
                          ) : (
                            <p className="text-sm text-primary/70 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Tap to send an icebreaker ✨
                            </p>
                          )}

                          {/* Action buttons — 44×44 min tap targets on mobile, hover-reveal on desktop */}
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-h-[44px] h-11 md:h-9 px-3.5 text-xs border-border/50 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); navigate(`/profile/${match.otherUserId}`); }}
                            >
                              <User className="w-3.5 h-3.5 mr-1.5" />
                              Profile
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-h-[44px] h-11 md:h-9 px-3.5 text-xs border-accent/30 text-accent md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); navigate(`/compatibility/${match.id}`); }}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1.5" />
                              Synastry
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-h-[44px] h-11 md:h-9 px-3.5 text-xs border-primary/30 text-primary md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); navigate(`/messages?match=${match.id}`); }}
                            >
                              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                              Chat
                            </Button>
                          </div>
                        </div>

                        {/* Right side: score label + time */}
                        <div className="shrink-0 flex flex-col items-end gap-1.5 max-w-[80px]">
                          {match.compatibility_score != null && (
                            <Badge variant="outline" className="border-accent/30 text-accent text-[10px] px-1.5 py-0 whitespace-nowrap">
                              {getScoreLabel(match.compatibility_score)}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 whitespace-nowrap">
                            <Clock className="w-2.5 h-2.5" />
                            {formatTime(match.lastMessageAt || match.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Compatibility tags */}
                      {match.otherProfile.compatibility_tags && match.otherProfile.compatibility_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/30">
                          {match.otherProfile.compatibility_tags.slice(0, 4).map((tag, j) => (
                            <Badge key={j} variant="secondary" className="text-xs bg-primary/10 text-primary border-none">
                              {tag}
                            </Badge>
                          ))}
                          {match.otherProfile.compatibility_tags.length > 4 && (
                            <span className="text-xs text-muted-foreground self-center">
                              +{match.otherProfile.compatibility_tags.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </TourHighlight>
          )}
        </div>
      </div>
    </div>
  );
};

export default Connections;