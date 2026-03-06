import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Star, Clock, Sparkles, Users } from "lucide-react";
import CosmicBackground from "@/components/CosmicBackground";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface MatchWithProfile {
  id: string;
  compatibility_score: number | null;
  compatibility_summary: string | null;
  created_at: string;
  otherProfile: {
    display_name: string | null;
    sun_sign: string | null;
    moon_sign: string | null;
    rising_sign: string | null;
    human_design_type: string | null;
    compatibility_tags: string[] | null;
    avatar_url: string | null;
  };
}

const Connections = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<MatchWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data: matchRows } = await supabase
        .from("matches")
        .select("*")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (!matchRows || matchRows.length === 0) {
        setLoading(false);
        return;
      }

      const otherIds = matchRows.map((m) =>
        m.user_a === user.id ? m.user_b : m.user_a
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, sun_sign, moon_sign, rising_sign, human_design_type, compatibility_tags, avatar_url")
        .in("user_id", otherIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      const results: MatchWithProfile[] = matchRows.map((m) => {
        const otherId = m.user_a === user.id ? m.user_b : m.user_a;
        const prof = profileMap.get(otherId);
        return {
          id: m.id,
          compatibility_score: m.compatibility_score,
          compatibility_summary: m.compatibility_summary,
          created_at: m.created_at,
          otherProfile: prof || {
            display_name: "Cosmic Soul",
            sun_sign: null,
            moon_sign: null,
            rising_sign: null,
            human_design_type: null,
            compatibility_tags: null,
            avatar_url: null,
          },
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
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
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
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-aurora bg-clip-text text-transparent">
              Your Soul Connections
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              These are the souls who've resonated with your cosmic signature.
            </p>
          </div>

          {matches.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Connections Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Keep swiping in Discovery to find souls that resonate with your cosmic energy!
              </p>
              <Button onClick={() => navigate("/")} className="bg-primary hover:bg-primary/90 shadow-glow">
                <Star className="w-4 h-4 mr-2" />
                Explore Discovery
              </Button>
            </div>
          ) : (
            <div className="grid gap-6">
              {matches.map((match) => (
                <Card key={match.id} className="bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-glow transition-all duration-500">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-6">
                      <div className="w-20 h-20 rounded-full bg-gradient-mystical flex items-center justify-center shadow-mystical shrink-0">
                        <Sparkles className="w-10 h-10 text-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <h3 className="text-2xl font-semibold text-foreground">
                            {match.otherProfile.display_name || "Cosmic Soul"}
                          </h3>
                          {match.compatibility_score && (
                            <div className="px-3 py-1 rounded-full text-sm font-medium text-foreground bg-gradient-golden">
                              {match.compatibility_score}% Match
                            </div>
                          )}
                          <Badge variant="outline" className="border-accent/30 text-accent">
                            Mutual Connection
                          </Badge>
                        </div>

                        {/* Cosmic details */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {match.otherProfile.sun_sign && (
                            <Badge variant="secondary" className="text-xs bg-secondary/50">
                              ☉ {match.otherProfile.sun_sign}
                            </Badge>
                          )}
                          {match.otherProfile.moon_sign && (
                            <Badge variant="secondary" className="text-xs bg-secondary/50">
                              ☽ {match.otherProfile.moon_sign}
                            </Badge>
                          )}
                          {match.otherProfile.rising_sign && (
                            <Badge variant="secondary" className="text-xs bg-secondary/50">
                              ↑ {match.otherProfile.rising_sign}
                            </Badge>
                          )}
                          {match.otherProfile.human_design_type && (
                            <Badge variant="secondary" className="text-xs bg-secondary/50">
                              {match.otherProfile.human_design_type}
                            </Badge>
                          )}
                        </div>

                        {match.compatibility_summary && (
                          <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                            {match.compatibility_summary}
                          </p>
                        )}

                        {match.otherProfile.compatibility_tags && match.otherProfile.compatibility_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {match.otherProfile.compatibility_tags.slice(0, 5).map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-xs border-primary/20 text-primary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 mr-1" />
                            Matched {formatTime(match.created_at)}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => navigate("/messages")}
                            className="bg-primary hover:bg-primary/90 shadow-glow"
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Message
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Connections;
