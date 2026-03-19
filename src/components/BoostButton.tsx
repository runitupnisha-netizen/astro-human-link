import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Rocket, Crown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface BoostButtonProps {
  isPremium: boolean;
  boostUntil: string | null;
  onBoostActivated: (until: string) => void;
  onUpsell: () => void;
}

const BoostButton = ({ isPremium, boostUntil, onBoostActivated, onUpsell }: BoostButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [boosting, setBoosting] = useState(false);

  const isActive = boostUntil && new Date(boostUntil) > new Date();

  const handleBoost = async () => {
    if (!isPremium) {
      onUpsell();
      return;
    }
    if (!user) return;
    setBoosting(true);
    try {
      const until = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min boost
      const { error } = await supabase.from("profiles").update({ boost_until: until }).eq("user_id", user.id);
      if (error) throw error;
      onBoostActivated(until);
      toast({ title: "🚀 Boost Activated!", description: "You'll appear at the top of discovery for 30 minutes" });
    } catch (e: any) {
      toast({ title: "Boost failed", description: e.message, variant: "destructive" });
    } finally {
      setBoosting(false);
    }
  };

  if (isActive) {
    const remaining = Math.ceil((new Date(boostUntil!).getTime() - Date.now()) / 60000);
    return (
      <motion.div
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/15 border border-accent/30"
      >
        <Rocket className="w-4 h-4 text-accent" />
        <span className="text-xs font-medium text-accent">Boosted • {remaining}m left</span>
      </motion.div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="border-accent/30 hover:bg-accent/10 gap-1.5"
      onClick={handleBoost}
      disabled={boosting}
    >
      {boosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
      Boost
      {!isPremium && <Crown className="w-3 h-3 text-accent" />}
    </Button>
  );
};

export default BoostButton;
