import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, Lock, Sparkles, Star, Crown, User, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import CosmicBackground from "@/components/CosmicBackground";

interface Liker {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  sun_sign: string | null;
  human_design_type: string | null;
  life_path_number: number | null;
  action: string;
  liked_at: string;
}

const WhoLikedMe = () => {
  const { user } = useAuth();
  const { subscribed: isPremium } = usePremium();
  const navigate = useNavigate();
  const [likers, setLikers] = useState<Liker[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchLikers();
  }, [user]);

  const fetchLikers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("who-liked-me");
      if (error) throw error;
      setLikers(data.likers || []);
      setCount(data.count || 0);
    } catch (err) {
      console.error("Failed to fetch likers:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-8 px-4">
      <CosmicBackground />
      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Heart className="w-4 h-4 text-primary" fill="currentColor" />
            <span className="text-sm font-medium text-primary">Who Liked You</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            {count > 0 ? `${count} ${count !== 1 ? "people" : "person"} liked you` : "Your likes will show up here"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {count > 0
              ? "Upgrade to see who's into you"
              : "Keep putting yourself out there — likes will come!"}
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : count === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground">No pending likes yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">New likes will appear as others discover your profile</p>
          </motion.div>
        ) : (
          <>
            {/* Premium Unlock Banner */}
            {!isPremium && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="mb-6 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/30 overflow-hidden">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Crown className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-sm">Unlock Who Liked You</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        See full profiles, photos, and cosmic compatibility of everyone who swiped right on you.
                      </p>
                    </div>
                    <Button size="sm" className="shrink-0 bg-primary hover:bg-primary/90">
                      <Lock className="w-3.5 h-3.5 mr-1.5" />
                      Upgrade
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Liker Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {likers.map((liker, index) => (
                <motion.div
                  key={liker.user_id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                >
                  <Card className="overflow-hidden border-border/40 bg-card/70 backdrop-blur-sm group hover:border-primary/30 transition-colors">
                    <CardContent className="p-0">
                      {/* Blurred Avatar Area */}
                      <div className="relative aspect-[3/4] bg-muted/20 overflow-hidden">
                        {liker.avatar_url ? (
                          <img
                            src={liker.avatar_url}
                            alt=""
                            className={`w-full h-full object-cover ${!isPremium ? "blur-xl scale-110" : ""} transition-all`}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted/30">
                            <User className={`w-12 h-12 text-muted-foreground/30 ${!isPremium ? "blur-md" : ""}`} />
                          </div>
                        )}

                        {/* Lock Overlay for free users */}
                        {!isPremium && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/20 backdrop-blur-[2px]">
                            <div className="w-10 h-10 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center mb-2 border border-primary/30">
                              <Lock className="w-5 h-5 text-primary" />
                            </div>
                          </div>
                        )}

                        {/* Super like badge */}
                        {liker.action === "super_like" && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-primary/90 text-primary-foreground border-0 text-[10px] px-1.5 py-0.5">
                              <Star className="w-3 h-3 mr-0.5" fill="currentColor" />
                              Super
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Info Section */}
                      <div className="p-3 space-y-1.5">
                        <p className={`font-medium text-sm text-foreground ${!isPremium ? "blur-sm select-none" : ""}`}>
                          {isPremium ? (liker.display_name || "Someone") : "✦✦✦✦✦✦"}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {liker.sun_sign && (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-primary/20 text-primary/80 ${!isPremium ? "blur-sm" : ""}`}>
                              <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                              {isPremium ? liker.sun_sign : "???"}
                            </Badge>
                          )}
                          {liker.human_design_type && (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-accent/20 text-accent/80 ${!isPremium ? "blur-sm" : ""}`}>
                              {isPremium ? liker.human_design_type : "???"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WhoLikedMe;
