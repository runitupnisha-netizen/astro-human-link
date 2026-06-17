import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Copy, Check, Users, Star, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReferralShareCard from "@/components/ReferralShareCard";
import BackButton from "@/components/BackButton";

type CodeRow = {
  code: string;
  uses_count: number;
  rewards_earned: number;
};

type Big3 = {
  sun: string | null;
  moon: string | null;
  rising: string | null;
};

const Referral = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [codeRow, setCodeRow] = useState<CodeRow | null>(null);
  const [big3, setBig3] = useState<Big3>({ sun: null, moon: null, rising: null });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const init = async () => {
      // 1. Fetch existing code (auto-created by trigger on profile insert).
      const { data: existing } = await supabase
        .from("referral_codes")
        .select("code, uses_count, rewards_earned")
        .eq("user_id", user.id)
        .maybeSingle();

      let row = existing as CodeRow | null;

      // 2. Fallback: create one client-side if trigger somehow missed it.
      if (!row) {
        // Generate a 6-char code via the SQL helper to keep alphabet aligned.
        const { data: gen } = await supabase.rpc("generate_referral_code" as never);
        const newCode = (gen as unknown as string) || randomCode();
        const { data: inserted } = await supabase
          .from("referral_codes")
          .insert({ user_id: user.id, code: newCode })
          .select("code, uses_count, rewards_earned")
          .single();
        row = inserted as CodeRow | null;
      }

      // 3. Fetch user's Big 3 for the share card.
      const { data: profile } = await supabase
        .from("profiles")
        .select("sun_sign, moon_sign, rising_sign")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!cancelled) {
        setCodeRow(row);
        setBig3({
          sun: profile?.sun_sign ?? null,
          moon: profile?.moon_sign ?? null,
          rising: profile?.rising_sign ?? null,
        });
        setLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const code = codeRow?.code ?? "";
  const usesCount = codeRow?.uses_count ?? 0;
  const rewardsEarned = codeRow?.rewards_earned ?? 0;
  const shareUrl = code ? `https://stellara.app/join/${code}` : "https://stellara.app";

  const copyCode = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied ✦");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0c0b13" }}>
      <div data-back-button-injected className="absolute top-[calc(env(safe-area-inset-top,0px)+4rem)] left-2 z-40">
        <BackButton fallback="/profile" />
      </div>
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#d0b4f7" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-24 px-4" style={{ background: "#0c0b13" }}>
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm"
          style={{ color: "rgba(224, 212, 255, 0.6)" }}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3"
               style={{ background: "rgba(208, 180, 247, 0.12)" }}>
            <Sparkles className="w-5 h-5" style={{ color: "#d0b4f7" }} />
          </div>
          <h1
            className="font-serif text-[26px] leading-tight"
            style={{ fontFamily: "Lora, Georgia, serif", color: "#e0d4ff" }}
          >
            Invite your cosmic twin ✦
          </h1>
          <p className="mt-2 text-sm" style={{ color: "rgba(224, 212, 255, 0.65)" }}>
            They get a free month of Pro. So do you.
          </p>
        </motion.div>

        {/* Progress strip */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="rounded-2xl p-4 border" style={{ background: "rgba(208, 180, 247, 0.05)", borderColor: "rgba(208, 180, 247, 0.18)" }}>
            <Users className="w-5 h-5 mb-1" style={{ color: "#d0b4f7" }} />
            <p className="text-2xl font-semibold" style={{ color: "#ffffff" }}>{usesCount}</p>
            <p className="text-[11px]" style={{ color: "rgba(224, 212, 255, 0.6)" }}>
              cosmic twin{usesCount === 1 ? "" : "s"} invited
            </p>
          </div>
          <div className="rounded-2xl p-4 border" style={{ background: "rgba(208, 180, 247, 0.05)", borderColor: "rgba(208, 180, 247, 0.18)" }}>
            <Star className="w-5 h-5 mb-1" style={{ color: "#d0b4f7" }} />
            <p className="text-2xl font-semibold" style={{ color: "#ffffff" }}>{rewardsEarned}</p>
            <p className="text-[11px]" style={{ color: "rgba(224, 212, 255, 0.6)" }}>
              free month{rewardsEarned === 1 ? "" : "s"} of Pro earned
            </p>
          </div>
        </motion.div>

        {/* Code */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-5 border"
          style={{ background: "rgba(208, 180, 247, 0.06)", borderColor: "rgba(208, 180, 247, 0.25)" }}
        >
          <p className="text-xs uppercase tracking-widest text-center mb-2"
             style={{ color: "rgba(224, 212, 255, 0.55)" }}>
            Your code
          </p>
          <div className="flex items-center gap-2">
            <div
              className="flex-1 rounded-xl px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.3em]"
              style={{ background: "rgba(12, 11, 19, 0.6)", color: "#d0b4f7", border: "1px solid rgba(208, 180, 247, 0.2)" }}
            >
              {code}
            </div>
            <Button
              size="icon"
              variant="outline"
              onClick={copyCode}
              className="h-12 w-12 shrink-0 border-[#d0b4f7]/30"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" style={{ color: "#d0b4f7" }} />}
            </Button>
          </div>
          <p className="text-[11px] text-center mt-2" style={{ color: "rgba(224, 212, 255, 0.5)" }}>
            Link: stellara.app/join/{code}
          </p>
        </motion.div>

        {/* Share card */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {code && <ReferralShareCard code={code} big3={big3} shareUrl={shareUrl} />}
        </motion.div>

        {/* How it works */}
        <div className="rounded-2xl p-4 border text-sm leading-relaxed"
             style={{ background: "rgba(208, 180, 247, 0.03)", borderColor: "rgba(208, 180, 247, 0.14)", color: "rgba(224, 212, 255, 0.75)" }}>
          <p className="mb-2" style={{ color: "#e0d4ff" }}><strong>How it works</strong></p>
          <ol className="space-y-1.5 list-decimal list-inside marker:text-[#d0b4f7]/60">
            <li>Share your code or invite link.</li>
            <li>They sign up and complete their birth chart reveal.</li>
            <li>You both get +30 days of Pro, automatically.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

const randomCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
};

export default Referral;