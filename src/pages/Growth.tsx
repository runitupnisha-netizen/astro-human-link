import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Moon, BookOpen, FileText, Lock, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import LyraStrip from "@/components/lyra/LyraStrip";
import TransitAlertCard from "@/components/TransitAlertCard";
import TransitTimeline from "@/components/TransitTimeline";

/** Background colour spec from Prompt 2: dark cosmic #0c0b13. */
const BG = "#0c0b13";
const CARD_BG = "rgba(77, 58, 92, 0.35)";
const CARD_BG_COMPLETED = "rgba(77, 58, 92, 0.55)";
const CARD_BORDER = "rgba(208, 180, 247, 0.2)";
const TITLE = "#e0d4ff";
const BODY = "#c9b8f0";
const COMPLETED_GREEN = "#1D9E75";

/** Static deterministic star field — no animation per spec. */
const STAR_FIELD = Array.from({ length: 32 }, (_, i) => {
  const x = (i * 53) % 100;
  const y = (i * 37 + 13) % 100;
  const size = (i % 3) + 1;
  const opacity = 0.18 + ((i * 11) % 50) / 100;
  return { x, y, size, opacity };
});

const moonPhaseToday = (): { name: string; line: string; icon: string } => {
  // Lightweight phase calc — synodic month 29.530588 days from a known new moon
  const SYN = 29.530588853;
  const KNOWN_NEW = Date.UTC(2024, 0, 11, 11, 57, 0); // Jan 11 2024 new moon
  const days = (Date.now() - KNOWN_NEW) / (1000 * 60 * 60 * 24);
  const age = ((days % SYN) + SYN) % SYN;
  if (age < 1.84) return { name: "New Moon", line: "A blank page night — set an intention.", icon: "🌑" };
  if (age < 5.53) return { name: "Waxing Crescent", line: "Tiny first steps count tonight.", icon: "🌒" };
  if (age < 9.22) return { name: "First Quarter", line: "A turning point — choose action.", icon: "🌓" };
  if (age < 12.91) return { name: "Waxing Gibbous", line: "Refine what you're building.", icon: "🌔" };
  if (age < 16.61) return { name: "Full Moon", line: "Everything is lit — what do you see?", icon: "🌕" };
  if (age < 20.30) return { name: "Waning Gibbous", line: "Share what you've learned.", icon: "🌖" };
  if (age < 23.99) return { name: "Last Quarter", line: "Release what no longer fits.", icon: "🌗" };
  return { name: "Waning Crescent", line: "Rest. The next cycle is coming.", icon: "🌘" };
};

const Growth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribed: isPremium } = usePremium();
  const [firstName, setFirstName] = useState<string>("");
  const [chart, setChart] = useState<{ sun: string | null; moon: string | null }>({ sun: null, moon: null });
  const [ritualDoneToday, setRitualDoneToday] = useState(false);

  const moon = moonPhaseToday();

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("profiles")
      .select("display_name, sun_sign, moon_sign, daily_ritual_last_completed")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const name = (data?.display_name || "").split(" ")[0] || "";
        setFirstName(name);
        setChart({ sun: data?.sun_sign ?? null, moon: data?.moon_sign ?? null });
        const lastBackend = (data as { daily_ritual_last_completed?: string | null } | null)?.daily_ritual_last_completed ?? null;
        const lastLocal = localStorage.getItem("stellara:daily-ritual:done");
        // Backend is source of truth; localStorage is fallback for offline-first UX
        setRitualDoneToday(lastBackend === today || lastLocal === today);
      });
  }, [user]);

  return (
    <div className="min-h-[100svh] relative overflow-hidden" style={{ backgroundColor: BG }}>
      {/* Radial wash */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 15%, rgba(109, 40, 217, 0.18), transparent 60%), radial-gradient(ellipse 60% 40% at 50% 95%, rgba(77, 58, 92, 0.25), transparent 70%)",
        }}
      />

      {/* Static stars */}
      <div className="pointer-events-none absolute inset-0">
        {STAR_FIELD.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              opacity: s.opacity,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-md mx-auto px-5 pt-28 md:pt-32 pb-28 md:pb-12">
        {/* Lyra greeting strip */}
        <div className="mb-5">
          <LyraStrip
            context="growth_greeting"
            contextKey={`${user?.id}-${new Date().toISOString().slice(0, 10)}`}
            payload={{ name: firstName || "friend", user_sun: chart.sun, user_moon: chart.moon }}
            fallback={firstName ? `Good morning, ${firstName}. Here's what the sky has for you today.` : "Here's what the sky has for you today."}
            size="sm"
            className="px-1"
          />
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-7"
        >
          <h1
            className="text-2xl md:text-3xl mb-2 tracking-wide"
            style={{ fontFamily: "Lora, Georgia, serif", color: TITLE }}
          >
            Your Growth Journey
          </h1>
          <p className="text-sm" style={{ color: BODY, fontFamily: "Poppins, sans-serif", fontWeight: 300 }}>
            Know yourself. Track your evolution. Become your highest self.
          </p>
        </motion.div>

        {/* Active planetary transit (auto-hides when none) */}
        <TransitAlertCard userSun={chart.sun} userMoon={chart.moon} userId={user?.id} />

        {/* Upcoming transit timeline cards */}
        <div className="mb-4">
          <TransitTimeline />
        </div>

        {/* Card 1 — Daily Ritual (full width, hero) */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => !ritualDoneToday && navigate("/growth/ritual")}
          disabled={ritualDoneToday}
          aria-disabled={ritualDoneToday}
          className="w-full text-left rounded-2xl p-5 mb-3 transition-all relative"
          style={{
            backgroundColor: ritualDoneToday ? CARD_BG_COMPLETED : CARD_BG,
            border: `0.5px solid ${CARD_BORDER}`,
            borderRadius: 16,
            cursor: ritualDoneToday ? "default" : "pointer",
          }}
        >
          {ritualDoneToday && (
            <span
              aria-label="Completed"
              className="absolute top-3 right-3 inline-flex items-center justify-center rounded-full"
              style={{
                width: 24,
                height: 24,
                backgroundColor: COMPLETED_GREEN,
              }}
            >
              <Check className="w-3.5 h-3.5" style={{ color: "#0c0b13" }} strokeWidth={3} />
            </span>
          )}
          <div className="flex items-start justify-between gap-3 mb-2">
            <h2 className="text-lg font-medium" style={{ color: TITLE, fontFamily: "Lora, Georgia, serif" }}>
              {ritualDoneToday ? "Ritual complete ✦" : "Your Daily Ritual"}
            </h2>
          </div>
          <p className="text-sm mb-4 leading-relaxed" style={{ color: BODY }}>
            {ritualDoneToday
              ? "Come back tomorrow."
              : "Three quiet moments — the planets, a card, and one prompt."}
          </p>
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
            style={{
              backgroundColor: ritualDoneToday ? "rgba(208, 180, 247, 0.08)" : "rgba(208, 180, 247, 0.15)",
              color: ritualDoneToday ? "rgba(224, 212, 255, 0.55)" : "#e0d4ff",
              border: `0.5px solid ${ritualDoneToday ? "rgba(208, 180, 247, 0.18)" : "rgba(208, 180, 247, 0.35)"}`,
              opacity: ritualDoneToday ? 0.75 : 1,
            }}
          >
            {ritualDoneToday ? "See you tomorrow ✦" : "Begin Today's Ritual ✦"}
          </span>
        </motion.button>

        {/* Cards 2 + 3 — half width pair */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => navigate("/growth/shadow")}
            className="text-left rounded-2xl p-4 transition-all hover:brightness-110 active:scale-[0.99] flex flex-col h-full"
            style={{ backgroundColor: CARD_BG, border: `0.5px solid ${CARD_BORDER}`, borderRadius: 16 }}
          >
            <Moon className="w-5 h-5 mb-2" style={{ color: "#d0b4f7" }} />
            <h3 className="text-base font-medium mb-1" style={{ color: TITLE, fontFamily: "Lora, Georgia, serif" }}>
              Shadow Work Journal
            </h3>
            <p className="text-xs leading-relaxed mt-auto" style={{ color: BODY }}>
              Meet yourself. Love yourself.
            </p>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={() => navigate("/growth/moon")}
            className="text-left rounded-2xl p-4 transition-all hover:brightness-110 active:scale-[0.99] flex flex-col h-full"
            style={{ backgroundColor: CARD_BG, border: `0.5px solid ${CARD_BORDER}`, borderRadius: 16 }}
          >
            <span className="text-xl mb-2" aria-hidden>{moon.icon}</span>
            <h3 className="text-base font-medium mb-1" style={{ color: TITLE, fontFamily: "Lora, Georgia, serif" }}>
              Moon Cycle
            </h3>
            <p className="text-xs leading-relaxed mt-auto" style={{ color: BODY }}>
              {moon.name} — {moon.line}
            </p>
          </motion.button>
        </div>

        {/* Card 4 — Weekly Cosmic Report (full width) */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => (isPremium ? navigate("/insights") : navigate("/premium"))}
          className="w-full text-left rounded-2xl p-5 transition-all hover:brightness-110 active:scale-[0.99]"
          style={{ backgroundColor: CARD_BG, border: `0.5px solid ${CARD_BORDER}`, borderRadius: 16 }}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <h2 className="text-lg font-medium" style={{ color: TITLE, fontFamily: "Lora, Georgia, serif" }}>
              Your Weekly Cosmic Report
            </h2>
            {!isPremium && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full" style={{ color: "#f9d697", backgroundColor: "rgba(249,214,151,0.12)", border: "0.5px solid rgba(249,214,151,0.3)" }}>
                <Lock className="w-3 h-3" /> Pro ✦
              </span>
            )}
          </div>
          <p className="text-sm mb-4 leading-relaxed" style={{ color: BODY }}>
            Your soul's progress, mapped by the planets.
          </p>
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
            style={{
              backgroundColor: isPremium ? "rgba(208, 180, 247, 0.15)" : "rgba(249, 214, 151, 0.12)",
              color: isPremium ? "#e0d4ff" : "#f9d697",
              border: `0.5px solid ${isPremium ? "rgba(208, 180, 247, 0.35)" : "rgba(249, 214, 151, 0.35)"}`,
            }}
          >
            {isPremium ? "Read this week's report ✦" : "Unlock with Pro"}
          </span>
        </motion.button>
      </div>
    </div>
  );
};

export default Growth;