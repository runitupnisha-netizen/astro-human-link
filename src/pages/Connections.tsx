import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Star, Clock, Sparkles, Users, User, Heart, Zap, Eye, Navigation } from "lucide-react";
import CosmicBackground from "@/components/CosmicBackground";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

interface MatchWithProfile {
  id: string;
  compatibility_score: number | null;
  compatibility_summary: string | null;
  created_at: string;
  otherUserId: string;
  otherProfile: {
    display_name: string | null;
    sun_sign: string | null;
    moon_sign: string | null;
    rising_sign: string | null;
    human_design_type: string | null;
    compatibility_tags: string[] | null;
    avatar_url: string | null;
    life_path_number: number | null;
    current_latitude: number | null;
    current_longitude: number | null;
  };
  lastMessage: string | null;
  lastMessageAt: string | null;
  distanceKm: number | null;
}

const Connections = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // Fetch current user's coordinates + matches in parallel
      const [matchResult, myProfileResult] = await Promise.all([
        supabase.from("matches").select("*").or(`user_a.eq.${user.id},user_b.eq.${user.id}`).order("created_at", { ascending: false }),
        supabase.from("profiles").select("current_latitude, current_longitude").eq("user_id", user.id).maybeSingle(),
      ]);

      const matchRows = matchResult.data;
      const myCoords = myProfileResult.data;

      if (!matchRows || matchRows.length === 0) {
        setLoading(false);
        return;
      }

      const otherIds = matchRows.map((m) =>
        m.user_a === user.id ? m.user_b : m.user_a
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, sun_sign, moon_sign, rising_sign, human_design_type, compatibility_tags, avatar_url, life_path_number, current_latitude, current_longitude")
        .in("user_id", otherIds);

      // Fetch last message for each match
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
            sun_sign: null,
            moon_sign: null,
            rising_sign: null,
            human_design_type: null,
            compatibility_tags: null,
            avatar_url: null,
            life_path_number: null,
            current_latitude: null,
            current_longitude: null,
          },
          lastMessage: lastMsg?.content || null,
          lastMessageAt: lastMsg?.created_at || null,
          distanceKm,
        };
      });

      setMatches(results);
      setLoading(false);
    };

    load();
  }, [user]);

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <CosmicBackground />
      <div className="relative z-10 pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h1 className="text-4xl font-bold mb-3 bg-gradient-aurora bg-clip-text text-transparent">
              Soul Connections
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              {matches.length > 0
                ? `You have ${matches.length} cosmic ${matches.length > 1 ? "connections" : "connection"} aligned with your energy`
                : "Your soul connections will manifest here as the cosmos aligns."}
            </p>
          </motion.div>

          {matches.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-6">
                <Users className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">No Connections Yet</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Keep discovering people — when you both like each other, you'll match!
              </p>
              <Button onClick={() => navigate("/")} style={{ background: "var(--gradient-aurora)" }} className="h-11 px-6 shadow-glow">
                <Sparkles className="w-4 h-4 mr-2" />
                Start Discovering
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {matches.map((match, i) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card className="bg-card/70 backdrop-blur-sm border-border/40 interactive-card group"
                    onClick={() => navigate("/messages")}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div className="w-16 h-16 rounded-full bg-gradient-mystical flex items-center justify-center shadow-mystical ring-2 ring-primary/20 overflow-hidden">
                            {match.otherProfile.avatar_url ? (
                              <img src={match.otherProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-8 h-8 text-foreground" />
                            )}
                          </div>
                          {match.compatibility_score && match.compatibility_score >= 80 && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-accent flex items-center justify-center ring-2 ring-background">
                              <Zap className="w-3 h-3 text-background" />
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
                              {match.otherProfile.display_name || "Someone New"}
                            </h3>
                            {match.compatibility_score != null && (
                              <span className={`text-sm font-bold ${getScoreColor(match.compatibility_score)}`}>
                                {match.compatibility_score}%
                              </span>
                            )}
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
                                · <Navigation className="w-3 h-3" /> {match.distanceKm} km
                              </span>
                            )}

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
                        </div>

                        {/* Right side: score label + time + message button */}
                        <div className="shrink-0 flex flex-col items-end gap-2">
                          {match.compatibility_score != null && (
                            <Badge variant="outline" className="border-accent/30 text-accent text-xs whitespace-nowrap">
                              {getScoreLabel(match.compatibility_score)}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(match.lastMessageAt || match.created_at)}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-3 text-foreground hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); navigate(`/profile/${match.otherUserId}`); }}
                          >
                            <User className="w-4 h-4 mr-1" />
                            Profile
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-3 text-accent hover:bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); navigate(`/compatibility/${match.id}`); }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Synastry
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-3 text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); navigate("/messages"); }}
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Chat
                          </Button>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Connections;
