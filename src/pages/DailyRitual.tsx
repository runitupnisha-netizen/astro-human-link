import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import LyraStrip from "@/components/lyra/LyraStrip";
import { getDailyTarotCard } from "@/data/tarotDeck";
import PushPermissionPrimer from "@/components/PushPermissionPrimer";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  PUSH_PRIMER_RESOLVED_KEY,
  PUSH_PRIMER_DISMISS_COUNT_KEY,
  PUSH_PRIMER_RITUALS_SINCE_DISMISS_KEY,
} from "@/lib/notificationCopy";
import BackButton from "@/components/BackButton";

const BG = "#0c0b13";
const CARD_BG = "rgba(77, 58, 92, 0.35)";
const CARD_BORDER = "rgba(208, 180, 247, 0.2)";
const TITLE = "#e0d4ff";
const BODY = "#c9b8f0";
const ACCENT = "#d0b4f7";
const COMPLETED_GREEN = "#1D9E75";
const STEP_INACTIVE = "#4d3a5c";

const STAR_FIELD = Array.from({ length: 22 }, (_, i) => {
  const x = (i * 53) % 100;
  const y = (i * 37 + 13) % 100;
  const size = (i % 3) + 1;
  const opacity = 0.18 + ((i * 11) % 50) / 100;
  return { x, y, size, opacity };
});

/** Deterministic daily planetary insight chosen by date — keeps Lyra grounded. */
const PLANETARY_INSIGHTS = [
  { symbol: "♀", planet: "Venus", headline: "Venus activates your 5th house today", body: "Romance and creativity are lit up. Show up fully — the cosmos amplifies your energy." },
  { symbol: "☿", planet: "Mercury", headline: "Mercury sharpens your voice today", body: "Your words carry extra weight today. Say the true thing." },
  { symbol: "♂", planet: "Mars", headline: "Mars asks for one bold move", body: "Action over analysis. Even a small step changes the orbit." },
  { symbol: "♃", planet: "Jupiter", headline: "Jupiter widens your horizon today", body: "Say yes to what feels expansive. The room is bigger than you think." },
  { symbol: "☽", planet: "Moon", headline: "The Moon softens your edges today", body: "Feelings come first. Don't outrun your own heart today." },
  { symbol: "♄", planet: "Saturn", headline: "Saturn rewards quiet discipline today", body: "Show up for the small thing. The cosmos sees the work." },
  { symbol: "☉", planet: "Sun", headline: "The Sun calls you into visibility", body: "Be seen as you are. Your light is the offering." },
];

const getDailyPlanet = (date: Date = new Date()) => {
  const key = date.toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return PLANETARY_INSIGHTS[Math.abs(hash) % PLANETARY_INSIGHTS.length];
};

const PROMPTS = [
  "What would I invite into my love life if I truly believed I deserved it?",
  "Where am I performing love instead of feeling it?",
  "What would I do today if no one was watching?",
  "What part of me am I ready to stop hiding?",
  "Who would I be if I stopped apologising for my needs?",
  "What truth am I avoiding because it asks for change?",
  "What does my soul want me to know today?",
];

const getDailyPrompt = (date: Date = new Date()) => {
  const key = date.toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return PROMPTS[Math.abs(hash) % PROMPTS.length];
};

const DailyRitual = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [firstName, setFirstName] = useState("");
  const [journal, setJournal] = useState("");
  const [primerOpen, setPrimerOpen] = useState(false);
  const [primerShownInProfile, setPrimerShownInProfile] = useState<boolean | null>(null);
  const { subscribe, permission, isSupported } = usePushNotifications();

  const planet = getDailyPlanet();
  const card = getDailyTarotCard();
  const prompt = getDailyPrompt();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, push_primer_shown")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setFirstName((data?.display_name || "").split(" ")[0] || "");
        setPrimerShownInProfile(Boolean((data as { push_primer_shown?: boolean } | null)?.push_primer_shown));
      });
  }, [user]);

  const shouldShowPrimer = () => {
    if (!isSupported) return false;
    // Already granted or hard-denied at OS level → never re-ask
    if (permission === "granted" || permission === "denied") return false;
    // Per spec: only ever show on the user's FIRST ritual completion
    if (primerShownInProfile === true) return false;
    // Permanently resolved (granted, denied, or 3-dismiss cap reached)
    if (localStorage.getItem(PUSH_PRIMER_RESOLVED_KEY) === "true") return false;

    const dismissCount = Number(
      localStorage.getItem(PUSH_PRIMER_DISMISS_COUNT_KEY) || "0"
    );
    if (dismissCount >= 3) {
      localStorage.setItem(PUSH_PRIMER_RESOLVED_KEY, "true");
      return false;
    }

    // First time → show immediately. Subsequent times → wait for 3 more rituals.
    if (dismissCount === 0) return true;
    const ritualsSince = Number(
      localStorage.getItem(PUSH_PRIMER_RITUALS_SINCE_DISMISS_KEY) || "0"
    );
    return ritualsSince >= 3;
  };

  const handleComplete = async () => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem("stellara:daily-ritual:done", today);
    if (journal.trim()) {
      // Persist optional journal entry locally — full backend tie-in is a follow-up
      const key = `stellara:ritual-journal:${today}`;
      localStorage.setItem(key, journal.trim());
    }

    // Save completion date to backend so Growth tab can read it across devices
    if (user) {
      const isFirstEver = primerShownInProfile === false;
      const update: { daily_ritual_last_completed: string; push_primer_shown?: boolean } = {
        daily_ritual_last_completed: today,
      };
      // On the very first ritual ever, also mark the primer as shown so it never re-fires
      if (isFirstEver) update.push_primer_shown = true;
      await supabase.from("profiles").update(update).eq("user_id", user.id);
      if (isFirstEver) setPrimerShownInProfile(true);
    }

    if (shouldShowPrimer()) {
      // Reset the post-dismiss counter; opening the primer is a fresh ask.
      localStorage.setItem(PUSH_PRIMER_RITUALS_SINCE_DISMISS_KEY, "0");
      setPrimerOpen(true);
      return;
    }

    // Increment ritual counter (used to re-trigger primer after dismissal)
    const dismissCount = Number(
      localStorage.getItem(PUSH_PRIMER_DISMISS_COUNT_KEY) || "0"
    );
    if (dismissCount > 0 && dismissCount < 3) {
      const ritualsSince = Number(
        localStorage.getItem(PUSH_PRIMER_RITUALS_SINCE_DISMISS_KEY) || "0"
      );
      localStorage.setItem(
        PUSH_PRIMER_RITUALS_SINCE_DISMISS_KEY,
        String(ritualsSince + 1)
      );
    }

    navigate("/growth");
  };

  const handlePrimerAccept = async (): Promise<void> => {
    await subscribe();
    // Whether the OS dialog granted or denied, this is now resolved permanently.
    localStorage.setItem(PUSH_PRIMER_RESOLVED_KEY, "true");
  };

  const handlePrimerClose = () => {
    setPrimerOpen(false);
    // If permission is now granted, mark resolved; otherwise this counted as a dismissal.
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      localStorage.setItem(PUSH_PRIMER_RESOLVED_KEY, "true");
    } else if (localStorage.getItem(PUSH_PRIMER_RESOLVED_KEY) !== "true") {
      const next =
        Number(localStorage.getItem(PUSH_PRIMER_DISMISS_COUNT_KEY) || "0") + 1;
      localStorage.setItem(PUSH_PRIMER_DISMISS_COUNT_KEY, String(next));
      localStorage.setItem(PUSH_PRIMER_RITUALS_SINCE_DISMISS_KEY, "0");
      if (next >= 3) {
        localStorage.setItem(PUSH_PRIMER_RESOLVED_KEY, "true");
      }
    }
    navigate("/growth");
  };

  const goBack = () => {
    if (step === 1) {
      if (typeof window !== "undefined" && window.history.length > 1) navigate(-1);
      else navigate("/growth");
    }
    else setStep((step - 1) as 1 | 2 | 3);
  };

  return (
    <div className="min-h-[100svh] relative overflow-hidden flex flex-col" style={{ backgroundColor: BG }}>
      <div data-back-button-injected className="absolute top-[calc(env(safe-area-inset-top,0px)+4rem)] left-2 z-40">
        <BackButton fallback="/growth" />
      </div>
      {/* Wash + stars */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 15%, rgba(109, 40, 217, 0.18), transparent 60%), radial-gradient(ellipse 60% 40% at 50% 95%, rgba(77, 58, 92, 0.25), transparent 70%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0">
        {STAR_FIELD.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.size}px`, height: `${s.size}px`, opacity: s.opacity }}
          />
        ))}
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-2">
        <button
          onClick={goBack}
          aria-label="Back"
          className="p-2 -ml-2 rounded-full transition-colors hover:bg-white/5"
          style={{ color: ACCENT }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="w-9" />
      </div>

      {/* Step content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pb-12 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5 }}
              className="w-full"
            >
              <div className="mb-4">
                <LyraStrip
                  context="ritual_planet"
                  contextKey={`${user?.id}-${new Date().toISOString().slice(0, 10)}-planet`}
                  payload={{ name: firstName || "friend", planet_aspect: `${planet.planet} — ${planet.headline.toLowerCase()}` }}
                  fallback={firstName ? `Good morning, ${firstName}. Here's what the sky has for you today.` : "Here's what the sky has for you today."}
                />
              </div>
              <div
                className="w-full rounded-2xl p-7 text-center"
                style={{ backgroundColor: CARD_BG, border: `0.5px solid ${CARD_BORDER}`, borderRadius: 16 }}
              >
                <div className="text-5xl mb-3 leading-none" style={{ color: ACCENT, fontFamily: "Lora, Georgia, serif" }}>
                  {planet.symbol}
                </div>
                <h2 className="text-xl mb-3 leading-snug" style={{ color: TITLE, fontFamily: "Lora, Georgia, serif" }}>
                  {planet.headline}
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: BODY }}>
                  {planet.body}
                </p>
              </div>
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{
                    backgroundColor: "rgba(208, 180, 247, 0.18)",
                    color: "#e0d4ff",
                    border: "0.5px solid rgba(208, 180, 247, 0.4)",
                  }}
                >
                  Next ✦
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5 }}
              className="w-full text-center"
            >
              <div
                className="mx-auto mb-4 rounded-2xl overflow-hidden"
                style={{
                  width: "min(220px, 60vw)",
                  aspectRatio: "2 / 3",
                  border: `0.5px solid ${CARD_BORDER}`,
                  boxShadow: "0 18px 60px -12px rgba(127, 119, 221, 0.45)",
                }}
              >
                <img
                  src={card.image}
                  alt={card.name}
                  loading="lazy"
                  width={768}
                  height={1152}
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <h2 className="text-xl mb-3" style={{ color: TITLE, fontFamily: "Lora, Georgia, serif" }}>
                {card.name}
              </h2>
              <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: BODY }}>
                {card.meaning}
              </p>
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{
                    backgroundColor: "rgba(208, 180, 247, 0.18)",
                    color: "#e0d4ff",
                    border: "0.5px solid rgba(208, 180, 247, 0.4)",
                  }}
                >
                  Next ✦
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5 }}
              className="w-full text-center"
            >
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-5 text-[11px]"
                style={{ color: ACCENT, backgroundColor: "rgba(208,180,247,0.1)", border: `0.5px solid ${CARD_BORDER}` }}
              >
                <Sparkles className="w-3 h-3" /> Today's Growth Prompt
              </div>
              <p
                className="text-xl md:text-2xl italic leading-relaxed mb-6 max-w-md mx-auto"
                style={{ color: TITLE, fontFamily: "Lora, Georgia, serif" }}
              >
                {prompt}
              </p>
              <textarea
                value={journal}
                onChange={(e) => setJournal(e.target.value)}
                placeholder="Write your thoughts here..."
                rows={4}
                className="w-full rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1"
                style={{
                  backgroundColor: "rgba(77, 58, 92, 0.25)",
                  border: `0.5px solid ${CARD_BORDER}`,
                  color: TITLE,
                  fontFamily: "Poppins, sans-serif",
                }}
              />
              <div className="mt-6">
                <button
                  onClick={handleComplete}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{
                    backgroundColor: "rgba(208, 180, 247, 0.18)",
                    color: "#e0d4ff",
                    border: "0.5px solid rgba(208, 180, 247, 0.4)",
                  }}
                >
                  {journal.trim() ? "Save & close ✦" : "I'm sitting with this ✦"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="relative z-10 pb-[max(env(safe-area-inset-bottom),1.5rem)] flex items-center justify-center gap-3">
        {[1, 2, 3].map((s) => {
          const isActive = step === s;
          const isCompleted = s < step;
          // Future steps not tappable; completed/active are
          const tappable = s <= step;
          const size = isActive ? 10 : 8;
          return (
            <button
              key={s}
              onClick={() => tappable && setStep(s as 1 | 2 | 3)}
              disabled={!tappable}
              aria-label={`Go to step ${s}`}
              aria-current={isActive ? "step" : undefined}
              className="rounded-full transition-all flex items-center justify-center"
              style={{
                width: size,
                height: size,
                backgroundColor: isCompleted
                  ? COMPLETED_GREEN
                  : isActive
                  ? ACCENT
                  : "transparent",
                border: isActive || isCompleted ? "none" : `1px solid ${STEP_INACTIVE}`,
                cursor: tappable ? "pointer" : "default",
              }}
            >
              {isCompleted && (
                <svg width="6" height="6" viewBox="0 0 6 6" fill="none" aria-hidden>
                  <path d="M1 3L2.5 4.5L5 1.5" stroke="#0c0b13" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      <PushPermissionPrimer
        open={primerOpen}
        onClose={handlePrimerClose}
        onAccept={handlePrimerAccept}
      />
    </div>
  );
};

export default DailyRitual;