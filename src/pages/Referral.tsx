import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Copy, Check, Users, Star, Share2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import CosmicBackground from "@/components/CosmicBackground";
import { toast } from "sonner";

const Referral = () => {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      // Check for existing referral code
      const { data: existing } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user.id);

      if (existing && existing.length > 0) {
        setReferralCode(existing[0].referral_code);
        setReferrals(existing);
      } else {
        // Generate a unique referral code
        const code = `STAR-${user.id.substring(0, 4).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        await supabase.from("referrals").insert({
          referrer_id: user.id,
          referral_code: code,
          status: "active",
        });
        setReferralCode(code);
      }
      setLoading(false);
    };
    init();
  }, [user]);

  const completedReferrals = referrals.filter((r) => r.status === "completed").length;

  const copyCode = async () => {
    await navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success("Referral code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    const url = `${window.location.origin}/auth?ref=${referralCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Stellara ✨",
          text: "Discover your cosmic connections on Stellara! Use my referral code for a special welcome.",
          url,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied!");
    }
  };

  const rewards = [
    { count: 1, reward: "3 Extra Daily Likes", icon: "💫" },
    { count: 3, reward: "1 Free Profile Boost", icon: "🚀" },
    { count: 5, reward: "1 Week Premium Free", icon: "👑" },
    { count: 10, reward: "1 Month Premium Free", icon: "🌟" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-24 px-4">
      <CosmicBackground />
      <div className="max-w-lg mx-auto relative z-10 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Gift className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Referral Program</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            Invite Friends, Earn Rewards
          </h1>
          <p className="text-sm text-muted-foreground">
            Share Stellara with your friends and unlock cosmic perks
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-card/70 backdrop-blur-sm border-border/40">
              <CardContent className="p-4 text-center">
                <Users className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{completedReferrals}</p>
                <p className="text-[10px] text-muted-foreground">Friends Joined</p>
              </CardContent>
            </Card>
            <Card className="bg-card/70 backdrop-blur-sm border-border/40">
              <CardContent className="p-4 text-center">
                <Star className="w-6 h-6 text-accent mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">
                  {rewards.filter((r) => completedReferrals >= r.count).length}
                </p>
                <p className="text-[10px] text-muted-foreground">Rewards Earned</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Referral Code */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold text-foreground text-sm">Your Referral Code</h3>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-background/60 rounded-lg px-4 py-3 text-center font-mono text-lg font-bold text-foreground tracking-wider border border-border/50">
                  {referralCode}
                </div>
                <Button size="icon" variant="outline" onClick={copyCode} className="shrink-0 h-12 w-12">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <Button onClick={shareLink} className="w-full gap-2 bg-primary hover:bg-primary/90">
                <Share2 className="w-4 h-4" />
                Share Invite Link
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Rewards Ladder */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-card/70 backdrop-blur-sm border-border/40">
            <CardContent className="p-5">
              <h3 className="font-semibold text-foreground text-sm mb-4">Reward Milestones</h3>
              <div className="space-y-3">
                {rewards.map((r, i) => {
                  const unlocked = completedReferrals >= r.count;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                        unlocked ? "border-accent/40 bg-accent/5" : "border-border/30 bg-muted/10"
                      }`}
                    >
                      <span className="text-2xl">{r.icon}</span>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${unlocked ? "text-foreground" : "text-muted-foreground"}`}>
                          {r.reward}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {r.count} referral{r.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {unlocked ? (
                        <Badge className="bg-accent/20 text-accent border-accent/30 text-[10px]">Unlocked</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {r.count - completedReferrals} more
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Referral;
