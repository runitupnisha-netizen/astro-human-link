import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, X as XIcon, Star, ChevronDown, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "stellara:swipe-tutorial:v1:dismissed";

interface Step {
  icon: React.ComponentType<{ className?: string }>;
  iconWrapClass: string;
  title: string;
  body: string;
  hint: string;
}

const steps: Step[] = [
  {
    icon: Heart,
    iconWrapClass: "bg-green-400/15 text-green-400 border-green-400/30",
    title: "Show interest",
    body: "Tap the heart (or drag the card right) to send a like. If you're both aligned, a new connection opens ✨",
    hint: "Tap ❤ · Drag →",
  },
  {
    icon: XIcon,
    iconWrapClass: "bg-destructive/15 text-destructive border-destructive/30",
    title: "Pass with grace",
    body: "Not feeling aligned? Tap the X (or drag the card left). Their journey continues elsewhere.",
    hint: "Tap ✕ · Drag ←",
  },
  {
    icon: Star,
    iconWrapClass:
      "text-accent-foreground border-accent/40 [background:var(--gradient-golden)]",
    title: "Spotlight (Premium)",
    body: "Tap the gold star (or drag the card up) to stand out. They'll see you took notice.",
    hint: "Tap ⭐ · Drag ↑",
  },
  {
    icon: ChevronDown,
    iconWrapClass: "bg-primary/15 text-primary border-primary/30",
    title: "Read the full story",
    body: "Tap the bio card to expand it, or hit “More details” for shared aspects, about-me & compatibility.",
    hint: "Tap to expand",
  },
];

const SwipeTutorialOverlay = () => {
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        // brief delay so the cards mount first and the overlay feels intentional
        const t = setTimeout(() => setOpen(true), 450);
        return () => clearTimeout(t);
      }
    } catch {
      /* ignore (private mode, etc.) */
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const next = () => {
    if (stepIdx < steps.length - 1) {
      setStepIdx((i) => i + 1);
    } else {
      dismiss();
    }
  };

  if (!open) return null;

  const step = steps[stepIdx];
  const Icon = step.icon;
  const isLast = stepIdx === steps.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="tutorial-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-background/70 backdrop-blur-md px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-[max(env(safe-area-inset-top),1rem)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="swipe-tutorial-title"
          onClick={(e) => {
            // tap outside the card dismisses
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
            {/* Close */}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Skip tutorial"
              className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors touch-manipulation"
            >
              <XIcon className="h-4 w-4" />
            </button>

            {/* Header strip */}
            <div className="flex items-center gap-2 px-5 pt-5 pb-2 text-[11px] uppercase tracking-[0.2em] text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Quick tour · {stepIdx + 1} of {steps.length}</span>
            </div>

            {/* Body */}
            <div className="px-6 pb-5">
              <div
                className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border ${step.iconWrapClass}`}
              >
                <Icon className="h-7 w-7" />
              </div>
              <h2
                id="swipe-tutorial-title"
                className="font-display text-2xl font-bold text-foreground leading-tight"
              >
                {step.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {step.body}
              </p>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/40 px-3 py-1 text-[11px] font-semibold text-foreground/80">
                {step.hint}
              </p>
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5 pb-3">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === stepIdx ? "w-6 bg-primary" : "w-1.5 bg-border"
                  }`}
                />
              ))}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between gap-3 border-t border-border/40 bg-background/40 px-5 py-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={dismiss}
                className="text-muted-foreground hover:text-foreground"
              >
                Skip
              </Button>
              <Button
                size="sm"
                onClick={next}
                className="gap-1.5 min-w-[6.5rem]"
                style={isLast ? { background: "var(--gradient-aurora)" } : undefined}
              >
                {isLast ? "Got it" : "Next"}
                {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SwipeTutorialOverlay;
