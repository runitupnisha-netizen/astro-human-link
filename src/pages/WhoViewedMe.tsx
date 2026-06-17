import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Lock, Crown, User, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import PremiumUpsellModal from "@/components/PremiumUpsellModal";
import { useNavigate } from "react-router-dom";
import CosmicBackground from "@/components/CosmicBackground";
import BackButton from "@/components/BackButton";

interface Viewer {
  viewer_id: string;
  display_name: string | null;
  avatar_url: string | null;
  sun_sign: string | null;
  viewed_at: string;
}

const WhoViewedMe = () => {
  const { user } = useAuth();
  const { subscribed: isPremium } = usePremium();
  const navigate = useNavigate();
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpsell, setShowUpsell] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchViewers = async () => {
      const { data: views } = await supabase
        .from("profile_views")
        .select("viewer_id, created_at")
        .eq("viewed_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!views || views.length === 0) {
        setLoading(false);
        return;
      }

      const uniqueViewers = Array.from(
        new Map(views.map((v) => [v.viewer_id, v])).values()
      );

      const ids = uniqueViewers.map((v) => v.viewer_id);
      const { data: profilesRaw } = await supabase
        .from("public_profiles" as any)
        .select("user_id, display_name, avatar_url, sun_sign")
        .in("user_id", ids);
      const profiles = (profilesRaw ?? []) as any[];

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      setViewers(
        uniqueViewers.map((v) => {
          const p = profileMap.get(v.viewer_id);
          return {
            viewer_id: v.viewer_id,
            display_name: p?.display_name || "Someone",
            avatar_url: p?.avatar_url || null,
            sun_sign: p?.sun_sign || null,
            viewed_at: v.created_at,
          };
        })
      );
      setLoading(false);
    };
    fetchViewers();
  }, [user]);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-24 px-4">
      <div data-back-button-injected className="absolute top-[calc(env(safe-area-inset-top,0px)+4rem)] left-2 z-40">
        <BackButton fallback="/profile" />
      </div>
      <CosmicBackground />
      <div className="max-w-2xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-4">
            <Eye className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Profile Views</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            {viewers.length > 0 ? `${viewers.length} people viewed your profile` : "Your views will show up here"}
          </h1>
          <p className="text-sm text-muted-foreground">See who's been checking you out</p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : viewers.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
              <Eye className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground">No profile views yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Complete your profile to attract more visitors
            </p>
          </motion.div>
        ) : (
          <>
            {!isPremium && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="mb-6 bg-gradient-to-r from-accent/10 via-primary/10 to-accent/10 border-accent/30">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                      <Crown className="w-6 h-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-sm">Unlock Profile Views</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">See who's been visiting your profile and when</p>
                    </div>
                    <Button size="sm" className="shrink-0 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => setShowUpsell(true)}>
                      <Lock className="w-3.5 h-3.5 mr-1.5" />
                      Upgrade
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <div className="space-y-2">
              {viewers.map((viewer, index) => (
                <motion.div
                  key={viewer.viewer_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * index }}
                >
                  <Card
                    className="border-border/40 bg-card/70 backdrop-blur-sm hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => isPremium && navigate(`/profile/${viewer.viewer_id}`)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-mystical flex items-center justify-center ring-2 ring-border/30 overflow-hidden shrink-0">
                        {viewer.avatar_url ? (
                          <img src={viewer.avatar_url} alt="" className={`w-full h-full object-cover ${!isPremium ? "blur-lg" : ""}`} />
                        ) : (
                          <User className={`w-6 h-6 text-foreground ${!isPremium ? "blur-md" : ""}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm text-foreground ${!isPremium ? "blur-sm select-none" : ""}`}>
                          {isPremium ? viewer.display_name : "✦✦✦✦✦"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {viewer.sun_sign && (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-primary/20 text-primary/80 ${!isPremium ? "blur-sm" : ""}`}>
                              <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                              {isPremium ? viewer.sun_sign : "???"}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs text-muted-foreground shrink-0 ${!isPremium ? "blur-sm" : ""}`}>
                        {isPremium ? timeAgo(viewer.viewed_at) : "•••"}
                      </span>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      <PremiumUpsellModal open={showUpsell} onClose={() => setShowUpsell(false)} feature="who_liked_me" />
    </div>
  );
};

export default WhoViewedMe;
