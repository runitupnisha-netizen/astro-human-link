import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Share2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";

const BG = "#0c0b13";
const TITLE = "#e0d4ff";
const BODY = "#9b84c8";
const CARD_BG = "rgba(77, 58, 92, 0.35)";
const CARD_BORDER = "rgba(208, 180, 247, 0.2)";
const ACCENT = "#d0b4f7";
const PURPLE = "#6d28d9";

const LOADING_LINES = [
  "Reading your Venus placement...",
  "Mapping your 7th house...",
  "Feeling into your Moon sign...",
  "Sensing your rising energy...",
  "Almost ready...",
];

const STARS = Array.from({ length: 28 }, (_, i) => ({
  x: (i * 53) % 100,
  y: (i * 37 + 11) % 100,
  size: (i % 3) + 1,
  opacity: 0.25 + ((i * 13) % 50) / 100,
}));

type Step = "intro" | "generating" | "reveal";

const SparkleOrb = ({ size = 64, pulse = true }: { size?: number; pulse?: boolean }) => (
  <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
    <motion.div
      className="absolute inset-0 rounded-full"
      style={{ background: "radial-gradient(circle, rgba(127,119,221,0.55), transparent 70%)" }}
      animate={pulse ? { scale: [1, 1.18, 1], opacity: [0.6, 0.9, 0.6] } : {}}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    />
    <div
      className="relative rounded-full flex items-center justify-center"
      style={{
        width: size * 0.78,
        height: size * 0.78,
        backgroundColor: "#4d3a5c",
        border: "1.5px solid #7F77DD",
      }}
    >
      <svg width={size * 0.42} height={size * 0.42} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z"
          fill="#e0d4ff"
        />
      </svg>
    </div>
  </div>
);

const CosmicSilhouette = () => (
  <svg width="180" height="220" viewBox="0 0 180 220" fill="none" className="mx-auto">
    <defs>
      <radialGradient id="auraGrad" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#9b6fff" stopOpacity="0.6" />
        <stop offset="60%" stopColor="#6d28d9" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#0c0b13" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="figGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#d0b4f7" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#7F77DD" stopOpacity="0.4" />
      </linearGradient>
    </defs>
    <ellipse cx="90" cy="100" rx="80" ry="100" fill="url(#auraGrad)" />
    {/* abstract figure */}
    <circle cx="90" cy="70" r="22" fill="url(#figGrad)" opacity="0.85" />
    <path
      d="M50 200 Q50 130 90 120 Q130 130 130 200 Z"
      fill="url(#figGrad)"
      opacity="0.7"
    />
    {/* orbital arcs */}
    <ellipse cx="90" cy="110" rx="70" ry="20" stroke="#9b6fff" strokeOpacity="0.4" strokeWidth="0.6" fill="none" />
    <ellipse cx="90" cy="110" rx="55" ry="14" stroke="#d0b4f7" strokeOpacity="0.3" strokeWidth="0.5" fill="none" transform="rotate(15 90 110)" />
    {/* star points */}
    {[
      [30, 45], [150, 55], [25, 130], [160, 140], [90, 30], [45, 180], [140, 175],
    ].map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy} r={1.2} fill="#e0d4ff" opacity={0.7} />
    ))}
  </svg>
);

const SoulmateSketch = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribed: isPremium, loading: premiumLoading } = usePremium();
  const [step, setStep] = useState<Step>("intro");
  const [loadingIdx, setLoadingIdx] = useState(0);
  const [sketch, setSketch] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ sun: string | null; moon: string | null; rising: string | null; name: string | null }>({
    sun: null, moon: null, rising: null, name: null,
  });
  const startedAt = useRef<number>(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, sun_sign, moon_sign, rising_sign")
        .eq("user_id", user.id)
        .maybeSingle();
      setProfile({
        sun: data?.sun_sign ?? null,
        moon: data?.moon_sign ?? null,
        rising: data?.rising_sign ?? null,
        name: data?.display_name ? data.display_name.split(" ")[0] : null,
      });

      // Load existing sketch if present
      const { data: existing } = await supabase
        .from("soulmate_sketches")
        .select("sketch_text")
        .eq("user_id", user.id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing?.sketch_text) setSketch(existing.sketch_text);
    })();
  }, [user]);

  // Loading line rotation
  useEffect(() => {
    if (step !== "generating") return;
    setLoadingIdx(0);
    const id = setInterval(() => {
      setLoadingIdx((i) => Math.min(i + 1, LOADING_LINES.length - 1));
    }, 2500);
    return () => clearInterval(id);
  }, [step]);

  const handleGenerate = async () => {
    if (!user) return;
    if (!isPremium) {
      navigate("/premium");
      return;
    }
    setStep("generating");
    startedAt.current = Date.now();

    try {
      const { data } = await supabase.functions.invoke("soulmate-sketch", {
        body: {
          sun: profile.sun,
          moon: profile.moon,
          rising: profile.rising,
          name: profile.name,
        },
      });
      const text: string | null = data?.sketch ?? null;

      // Enforce minimum 4s wait so the moment feels meaningful
      const elapsed = Date.now() - startedAt.current;
      const remaining = Math.max(0, 4000 - elapsed);
      await new Promise((r) => setTimeout(r, remaining));

      if (text) {
        setSketch(text);
        // Persist
        await supabase.from("soulmate_sketches").insert({ user_id: user.id, sketch_text: text });
        setStep("reveal");
      } else {
        setStep("intro");
      }
    } catch (err) {
      console.error(err);
      setStep("intro");
    }
  };

  const handleShare = async () => {
    if (!sketch) return;
    const firstTwo = sketch.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
    const text = `STELLARA — My Connection Vision ✦\n\n${firstTwo}\n\nDiscover yours at stellara.app`;
    if (navigator.share) {
      try { await navigator.share({ title: "My Connection Vision", text }); } catch { /* dismissed */ }
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="min-h-[100svh] relative overflow-hidden" style={{ backgroundColor: BG }}>
      {/* Star field */}
      <div className="pointer-events-none absolute inset-0">
        {STARS.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, opacity: s.opacity }}
          />
        ))}
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 25%, rgba(109, 40, 217, 0.22), transparent 65%)",
        }}
      />

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-20 inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs"
        style={{ color: ACCENT, backgroundColor: "rgba(77,58,92,0.4)", border: `0.5px solid ${CARD_BORDER}` }}
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      <div className="relative z-10 max-w-md mx-auto px-5 pt-20 pb-16 min-h-[100svh] flex flex-col">
        <AnimatePresence mode="wait" initial={false}>
          {step === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="flex-1 flex flex-col items-center justify-center text-center"
            >
              <div className="mb-6"><SparkleOrb size={88} /></div>
              <h1
                className="mb-4 px-2"
                style={{ fontFamily: "Lora, Georgia, serif", color: TITLE, fontSize: 26, lineHeight: 1.25 }}
              >
                See Who the Stars Drew for You.
              </h1>
              <p
                className="mb-5 px-3"
                style={{ color: BODY, fontFamily: "Poppins, sans-serif", fontWeight: 300, fontSize: 14, lineHeight: 1.6 }}
              >
                Based on your birth chart, Lyra will paint an energy portrait of the soul you are most magnetic to.
              </p>
              <p
                className="mb-8 italic px-3"
                style={{ color: ACCENT, fontFamily: "Poppins, sans-serif", fontWeight: 300, fontSize: 12 }}
              >
                ✦ Lyra: Your Venus placement tells me exactly who you attract. Ready to see?
              </p>

              {sketch ? (
                <button
                  onClick={() => setStep("reveal")}
                  className="w-full py-3.5 rounded-full text-sm font-medium transition-all active:scale-[0.98]"
                  style={{ backgroundColor: PURPLE, color: "white", boxShadow: "0 0 32px rgba(109,40,217,0.4)" }}
                >
                  View My Sketch ✦
                </button>
              ) : isPremium ? (
                <button
                  onClick={handleGenerate}
                  disabled={premiumLoading}
                  className="w-full py-3.5 rounded-full text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{ backgroundColor: PURPLE, color: "white", boxShadow: "0 0 32px rgba(109,40,217,0.4)" }}
                >
                  Generate My Sketch ✦
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/premium")}
                    className="w-full py-3.5 rounded-full text-sm font-medium transition-all active:scale-[0.98]"
                    style={{ backgroundColor: PURPLE, color: "white", boxShadow: "0 0 32px rgba(109,40,217,0.4)" }}
                  >
                    Unlock Connection Vision ✦
                  </button>
                  <p className="mt-3 text-xs" style={{ color: BODY }}>
                    Available with Stellara Pro
                  </p>
                </>
              )}
            </motion.div>
          )}

          {step === "generating" && (
            <motion.div
              key="gen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col items-center justify-center text-center"
            >
              <div className="mb-8"><SparkleOrb size={96} /></div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingIdx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35 }}
                  style={{ color: ACCENT, fontFamily: "Lora, Georgia, serif", fontSize: 16, fontStyle: "italic" }}
                >
                  {LOADING_LINES[loadingIdx]}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          )}

          {step === "reveal" && sketch && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="flex-1 flex flex-col"
            >
              <h2
                className="text-center mb-3"
                style={{ fontFamily: "Lora, Georgia, serif", color: TITLE, fontSize: 18 }}
              >
                Your Connection Vision
              </h2>
              <div
                className="mx-auto mb-5"
                style={{ width: 80, height: 1, background: "rgba(208,180,247,0.2)" }}
              />

              <div
                className="rounded-2xl p-6 mb-6"
                style={{ backgroundColor: CARD_BG, border: `0.5px solid ${CARD_BORDER}`, borderRadius: 20 }}
              >
                <p
                  style={{
                    color: "#c9b8f0",
                    fontFamily: "Lora, Georgia, serif",
                    fontStyle: "italic",
                    fontSize: 15,
                    lineHeight: 1.8,
                  }}
                >
                  {sketch}
                </p>
              </div>

              <CosmicSilhouette />

              <div className="mt-6 space-y-3">
                <button
                  onClick={() => navigate("/discover")}
                  className="w-full py-3.5 rounded-full text-sm font-medium transition-all active:scale-[0.98]"
                  style={{ backgroundColor: PURPLE, color: "white" }}
                >
                  Explore aligned connections ✦
                </button>
                <button
                  onClick={handleShare}
                  className="w-full py-3.5 rounded-full text-sm transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2"
                  style={{ backgroundColor: "transparent", color: ACCENT, border: `0.5px solid rgba(208,180,247,0.3)` }}
                >
                  <Share2 className="w-4 h-4" /> Share my sketch
                </button>
                {isPremium && (
                  <button
                    onClick={handleGenerate}
                    className="w-full py-2.5 text-xs"
                    style={{ color: BODY }}
                  >
                    Re-cast my sketch ✦
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SoulmateSketch;
