import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Wand2, Compass, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CosmicBackground from "@/components/CosmicBackground";

const COSMIC_PROMPTS = [
  "Mercury is direct — communication flows effortlessly today. Speak the thing you've been holding.",
  "The Moon favors emotional honesty. Notice what rises before you reach for distraction.",
  "Venus softens edges today — say the kind thing first, even to yourself.",
  "A grounding day. Move slowly. Decide with your body, not your inbox.",
  "Jupiter expands what you tend. Pick one thing to grow and feed it on purpose.",
  "Neptune blurs the lines — write before you reply. Clarity is downstream of stillness.",
  "Saturn rewards the small, kept promise. Show up for yourself in one tiny way.",
  "A creative current is open today — make something that doesn't need to be good.",
];

const SYN = 29.530588853;
const KNOWN_NEW = Date.UTC(2024, 0, 11, 11, 57, 0);
const moonToday = () => {
  const age = ((((Date.now() - KNOWN_NEW) / 86400000) % SYN) + SYN) % SYN;
  if (age < 1.84) return { name: "New Moon", icon: "🌑" };
  if (age < 5.53) return { name: "Waxing Crescent", icon: "🌒" };
  if (age < 9.22) return { name: "First Quarter", icon: "🌓" };
  if (age < 12.91) return { name: "Waxing Gibbous", icon: "🌔" };
  if (age < 16.61) return { name: "Full Moon", icon: "🌕" };
  if (age < 20.30) return { name: "Waning Gibbous", icon: "🌖" };
  if (age < 23.99) return { name: "Last Quarter", icon: "🌗" };
  return { name: "Waning Crescent", icon: "🌘" };
};

const Today = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const moon = moonToday();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const n = (data?.display_name || "").split(" ")[0] || "";
        setFirstName(n);
      });
  }, [user]);

  // Deterministic daily prompt
  const dayIndex = Math.floor(Date.now() / 86400000) % COSMIC_PROMPTS.length;
  const dailyPrompt = COSMIC_PROMPTS[dayIndex];
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const hour = new Date().getHours();
  const greeting =
    hour < 5 ? "Still here" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-[100svh] relative">
      <CosmicBackground />
      <div className="relative z-10 pt-20 md:pt-24 pb-28 md:pb-12 px-5">
        <div className="max-w-md mx-auto flex flex-col gap-6">
          {/* Header */}
          <header className="pt-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">{today}</p>
            <h1 className="font-display text-3xl font-bold bg-gradient-aurora bg-clip-text text-transparent mt-1">
              {greeting}{firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5">
              <span aria-hidden>{moon.icon}</span>
              <span>{moon.name}</span>
            </p>
          </header>

          {/* HERO: Daily Cosmic Nudge */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-accent/30 bg-card/80 backdrop-blur-md shadow-elevated p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                  Daily Cosmic Nudge
                </span>
              </div>
              <p className="font-display text-lg leading-relaxed text-foreground">
                {dailyPrompt}
              </p>
              <p className="mt-5 pt-3 border-t border-border/40 text-[11px] font-display tracking-wide text-muted-foreground/80">
                Strategy is what you do. Alignment is when you do it.
              </p>
            </div>
          </motion.section>

          {/* Ask Lyra */}
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onClick={() =>
              navigate(
                `/lyra?seed=${encodeURIComponent(
                  `Today's energy: ${moon.name}. ${dailyPrompt} — help me apply this to what's on my plate today.`
                )}`
              )
            }
            className="group text-left rounded-2xl border border-border/50 bg-card/70 backdrop-blur-md p-5 hover:border-primary/40 hover:bg-card/90 transition-all active:scale-[0.99]"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Wand2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-base font-semibold text-foreground">
                  Ask Lyra about today
                </h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Open a conversation seeded with today's cosmic weather.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform mt-1" />
            </div>
          </motion.button>

          {/* Continue your journey */}
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => navigate("/blueprint")}
            className="group text-left rounded-2xl border border-border/50 bg-card/70 backdrop-blur-md p-5 hover:border-accent/40 hover:bg-card/90 transition-all active:scale-[0.99]"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-base font-semibold text-foreground">
                  Continue your journey
                </h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Pick up where you left off in your Blueprint.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform mt-1" />
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Today;