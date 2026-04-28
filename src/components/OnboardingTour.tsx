import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  User as UserIcon,
  Sparkles,
  Wand2,
  Heart,
  MessageCircle,
  Moon,
  Crown,
  ShieldCheck,
  ArrowRight,
  X as XIcon,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "stellara:full-tour:v1:dismissed";
export const TOUR_HIGHLIGHT_PARAM = "tour";

const LYRA_DEMO_PROMPTS = [
  "What's my chart saying today?",
  "How do I trust my Human Design strategy?",
  "Send me a small love affirmation",
];

const LYRA_DEMO_REPLIES: Record<string, string> = {
  "What's my chart saying today?":
    "Your chart is humming softly today — Venus is asking you to receive, not chase. Open one door and let beauty walk in. ✨",
  "How do I trust my Human Design strategy?":
    "Strategy is your body whispering yes or wait. Trust the small clues — a breath, a pull, a hesitation. Your design is already wise. 🌙",
  "Send me a small love affirmation":
    "You are not behind. The love that's meant for you moves at the speed of your becoming — and you are right on time. 💗",
};

const LYRA_DEFAULT_REPLY =
  "I hear you. The stars are listening too. When you're ready, open me up anytime — I'll have more space to walk through this with you in depth. 🌟";

interface LyraDemoProps {
  done: boolean;
  onComplete: () => void;
}

const LyraDemo = ({ done, onComplete }: LyraDemoProps) => {
  const [input, setInput] = useState("");
  const [userMsg, setUserMsg] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || typing || userMsg) return;
    setUserMsg(t);
    setInput("");
    setTyping(true);
    const answer = LYRA_DEMO_REPLIES[t] ?? LYRA_DEFAULT_REPLY;
    window.setTimeout(() => {
      setReply(answer);
      setTyping(false);
      onComplete();
    }, 900);
  };

  return (
    <div
      className="mt-4 rounded-2xl border p-3 space-y-3"
      style={{
        backgroundColor: "rgba(12, 11, 19, 0.85)",
        borderColor: "rgba(208, 180, 247, 0.22)",
      }}
    >
      {/* Lyra mini header */}
      <div className="flex items-center gap-2">
        <div
          className="relative w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: "radial-gradient(circle at 35% 30%, #b89df5, #6d28d9 60%, #2a1740)",
            boxShadow: "0 0 12px rgba(127, 119, 221, 0.5)",
          }}
        >
          <Sparkles className="w-3.5 h-3.5" style={{ color: "#f9d697" }} />
        </div>
        <div className="leading-tight">
          <p style={{ fontFamily: "Lora, Georgia, serif", color: "#e0d4ff" }} className="text-sm">
            Lyra
          </p>
          <p className="text-[10px] tracking-wider" style={{ color: "#7a6a9a" }}>
            demo · always here
          </p>
        </div>
      </div>

      {/* Conversation */}
      <div className="space-y-2 min-h-[3.5rem]">
        {!userMsg ? (
          <p
            className="text-xs leading-relaxed"
            style={{ color: "#c9b8f0", fontFamily: "Lora, Georgia, serif" }}
          >
            Pick a prompt or write your own — I'll reply right here.
          </p>
        ) : (
          <>
            <div className="flex justify-end">
              <div
                className="max-w-[85%] rounded-2xl px-3 py-2 text-xs"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(127, 119, 221, 0.55), rgba(109, 40, 217, 0.45))",
                  color: "#f5edff",
                }}
              >
                {userMsg}
              </div>
            </div>
            <div className="flex justify-start">
              <div
                className="max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed"
                style={{
                  backgroundColor: "rgba(77, 58, 92, 0.55)",
                  color: "#e0d4ff",
                  fontFamily: "Lora, Georgia, serif",
                }}
              >
                {typing ? (
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#c9b8f0] animate-bounce" />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-[#c9b8f0] animate-bounce"
                      style={{ animationDelay: "0.15s" }}
                    />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-[#c9b8f0] animate-bounce"
                      style={{ animationDelay: "0.3s" }}
                    />
                  </span>
                ) : (
                  reply
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Prompt chips (only before first send) */}
      {!userMsg && (
        <div className="flex flex-wrap gap-1.5">
          {LYRA_DEMO_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => send(p)}
              className="rounded-full px-2.5 py-1 text-[11px] transition-colors"
              style={{
                backgroundColor: "rgba(77, 58, 92, 0.45)",
                border: "1px solid rgba(208, 180, 247, 0.25)",
                color: "#c9b8f0",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 rounded-full px-3 py-1.5"
        style={{
          backgroundColor: "rgba(77, 58, 92, 0.35)",
          border: "1px solid rgba(208, 180, 247, 0.22)",
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={userMsg ? "Continue inside Lyra →" : "Ask Lyra anything..."}
          disabled={!!userMsg || typing}
          className="flex-1 bg-transparent outline-none text-xs placeholder:text-[#7a6a9a] disabled:opacity-60"
          style={{ color: "#e0d4ff" }}
        />
        <button
          type="submit"
          disabled={!!userMsg || typing || !input.trim()}
          aria-label="Send to Lyra"
          className="flex h-7 w-7 items-center justify-center rounded-full disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #7f77dd, #6d28d9)" }}
        >
          <Send className="h-3 w-3 text-white" />
        </button>
      </form>

      {done && (
        <p className="text-[10px] text-center" style={{ color: "#7a6a9a" }}>
          Beautiful — you've met Lyra. Tap Next to continue.
        </p>
      )}
    </div>
  );
};

interface TourStep {
  icon: React.ComponentType<{ className?: string }>;
  iconWrapClass: string;
  title: string;
  body: string;
  hint?: string;
  cta?: { label: string; path: string; highlight?: string };
  /** When true, renders the interactive Lyra demo below the body. */
  lyraDemo?: boolean;
}

const TOUR_STEPS: TourStep[] = [
  {
    icon: ShieldCheck,
    iconWrapClass: "bg-primary/15 text-primary border-primary/30",
    title: "Welcome to Stellara ✨",
    body: "You're now part of a community where love aligns with the stars. Let's take a quick tour of what makes Stellara special.",
    hint: "Takes ~30 seconds",
  },
  {
    icon: UserIcon,
    iconWrapClass: "bg-accent/15 text-accent border-accent/30",
    title: "Your Cosmic Blueprint",
    body: "This is your home — a deep portrait of who you are: astrology, Human Design, numerology, photos, voice intro & bio prompts. Edit anything anytime.",
    hint: "You're here now",
  },
  {
    icon: Sparkles,
    iconWrapClass: "bg-green-400/15 text-green-400 border-green-400/30",
    title: "Discover · swipe with intention",
    body: "Swipe through soul-matched profiles curated by your cosmic compatibility. Right to like, left to pass, up to super-like.",
    cta: { label: "Open Discover", path: "/discover", highlight: "swipe-deck" },
  },
  {
    icon: Wand2,
    iconWrapClass: "bg-violet-500/15 text-violet-300 border-violet-400/30",
    title: "Meet Lyra · your AI cosmic guide",
    body: "Lyra is your personal cosmic confidante. Ask her about your chart, a connection, your week, or anything weighing on your heart — she knows you.",
    cta: { label: "Message Lyra", path: "/lyra", highlight: "lyra-input" },
  },
  {
    icon: Wand2,
    iconWrapClass: "bg-violet-500/15 text-violet-300 border-violet-400/30",
    title: "Try Lyra · say hi 👋",
    body: "Tap a prompt or type your own. Lyra will respond right here so you can feel how it works before diving in.",
    lyraDemo: true,
  },
  {
    icon: Heart,
    iconWrapClass: "bg-pink-500/15 text-pink-300 border-pink-400/30",
    title: "Matches & Sacred Reveal",
    body: "Mutual likes appear in Matches. Each day, one curated soul is unveiled to you in the Sacred Reveal — slow dating, the cosmic way.",
    cta: { label: "Find Matches", path: "/connections", highlight: "connections-list" },
  },
  {
    icon: MessageCircle,
    iconWrapClass: "bg-blue-500/15 text-blue-300 border-blue-400/30",
    title: "Conversations that flow",
    body: "Send voice notes, GIFs, photos & AI icebreakers. Open a shared synastry chart inside any chat to see your energy together.",
    cta: { label: "Open Messages", path: "/messages", highlight: "messages-list" },
  },
  {
    icon: Moon,
    iconWrapClass: "bg-indigo-400/15 text-indigo-300 border-indigo-400/30",
    title: "My Cosmos",
    body: "Your private sanctuary: daily briefings, reflections, weekly cosmic insights, the astro calendar & alignment journal.",
    cta: { label: "Visit My Cosmos", path: "/inner-world", highlight: "inner-world-first-tool" },
  },
  {
    icon: Crown,
    iconWrapClass: "text-background border-amber-300/40 [background:var(--gradient-golden)]",
    title: "Stellara Premium (optional)",
    body: "Unlock unlimited likes, see who liked you, profile boosts, incognito mode and full synastry deep-dives whenever you're ready.",
    cta: { label: "Explore Premium", path: "/premium", highlight: "premium-tiers" },
  },
  {
    icon: Sparkles,
    iconWrapClass: "bg-accent/15 text-accent border-accent/30",
    title: "You're aligned 🌟",
    body: "That's it. Your blueprint is below — explore freely, and remember: Lyra is one tap away whenever the stars feel unclear.",
  },
];

interface OnboardingTourProps {
  /** When true, shows the tour regardless of the dismissed flag. Used by "Preview as new user". */
  forceOpen?: boolean;
  onClose?: () => void;
}

const OnboardingTour = ({ forceOpen = false, onClose }: OnboardingTourProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [lyraDemoComplete, setLyraDemoComplete] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setStepIdx(0);
      setOpen(true);
      setLyraDemoComplete(false);
      return;
    }
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        const t = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
  }, [forceOpen]);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setOpen(false);
    onClose?.();
  };

  const next = () => {
    if (stepIdx < TOUR_STEPS.length - 1) {
      setStepIdx((i) => i + 1);
    } else {
      dismiss();
    }
  };

  const back = () => {
    if (stepIdx > 0) setStepIdx((i) => i - 1);
  };

  if (!open) return null;

  const step = TOUR_STEPS[stepIdx];
  const Icon = step.icon;
  const isLast = stepIdx === TOUR_STEPS.length - 1;
  // Lyra demo is optional — never block progression. Just nudge with the label.
  const showLyraNudge = !!step.lyraDemo && !lyraDemoComplete;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="full-tour-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-md px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-[max(env(safe-area-inset-top),1rem)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="full-tour-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) dismiss();
          }}
        >
          <motion.div
            key={stepIdx}
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-sm rounded-3xl border border-border/40 bg-card/95 shadow-2xl overflow-hidden"
          >
            <button
              type="button"
              onClick={dismiss}
              aria-label="Skip tour"
              className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors touch-manipulation"
            >
              <XIcon className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 px-5 pt-5 pb-2 text-[11px] uppercase tracking-[0.2em] text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                Tour · {stepIdx + 1} of {TOUR_STEPS.length}
              </span>
            </div>

            <div className="px-6 pb-5">
              <div
                className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border ${step.iconWrapClass}`}
              >
                <Icon className="h-7 w-7" />
              </div>
              <h2
                id="full-tour-title"
                className="font-display text-2xl font-bold text-foreground leading-tight"
              >
                {step.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {step.body}
              </p>
              {step.hint && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/40 px-3 py-1 text-[11px] font-semibold text-foreground/80">
                  {step.hint}
                </p>
              )}
              {step.cta && (
                <button
                  type="button"
                  onClick={() => {
                    dismiss();
                    const path = step.cta!.highlight
                      ? `${step.cta!.path}?${TOUR_HIGHLIGHT_PARAM}=${step.cta!.highlight}`
                      : step.cta!.path;
                    navigate(path);
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-semibold text-accent hover:bg-accent/20 transition-colors"
                >
                  {step.cta.label}
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
              {step.lyraDemo && (
                <LyraDemo
                  done={lyraDemoComplete}
                  onComplete={() => setLyraDemoComplete(true)}
                />
              )}
            </div>

            <div className="flex items-center justify-center gap-1.5 pb-3">
              {TOUR_STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === stepIdx ? "w-6 bg-primary" : "w-1.5 bg-border"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border/40 bg-background/40 px-5 py-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={stepIdx === 0 ? dismiss : back}
                className="text-muted-foreground hover:text-foreground"
              >
                {stepIdx === 0 ? "Skip" : "Back"}
              </Button>
              <Button
                size="sm"
                onClick={next}
                className="gap-1.5 min-w-[6.5rem]"
                style={isLast ? { background: "var(--gradient-aurora)" } : undefined}
              >
                {isLast ? "Begin journey" : showLyraNudge ? "Skip demo" : "Next"}
                {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingTour;