import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Sparkles, X, ArrowRight, Compass, ShieldCheck, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVerificationStatus } from "@/hooks/useVerification";

const DISMISS_KEY = "stellara:welcome-checklist:v1:dismissed";
const TOUR_KEY = "stellara:full-tour:v1:dismissed";

type StepId = "tour" | "verify" | "connect";
type Step = {
  id: StepId;
  label: string;
  description: string;
  icon: typeof Compass;
  cta: string;
  done: boolean;
  action: () => void;
};

interface Props {
  onReplayTour: () => void;
}

const WelcomeChecklist = ({ onReplayTour }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isVerified } = useVerificationStatus(user?.id);

  const [tourDone, setTourDone] = useState(() => {
    try {
      return localStorage.getItem(TOUR_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [hasMatch, setHasMatch] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Re-read tour flag on focus (after the user finishes the tour overlay)
  useEffect(() => {
    const refresh = () => {
      try {
        setTourDone(localStorage.getItem(TOUR_KEY) === "true");
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    const interval = window.setInterval(refresh, 2000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.clearInterval(interval);
    };
  }, []);

  // Check for first connection (any match)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .then(({ count }) => {
        if (!cancelled) setHasMatch((count ?? 0) > 0);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const steps = useMemo<Step[]>(
    () => [
      {
        id: "tour",
        label: "Take the welcome tour",
        description: "A 60-second walkthrough of every Stellara feature.",
        icon: Compass,
        cta: "Start tour",
        done: tourDone,
        action: onReplayTour,
      },
      {
        id: "verify",
        label: "Verify your photo",
        description: "Earn a trust badge with a quick selfie.",
        icon: ShieldCheck,
        cta: "Verify now",
        done: !!isVerified,
        action: () => navigate("/verify"),
      },
      {
        id: "connect",
        label: "Make your first connection",
        description: "Discover aligned souls and send your first like.",
        icon: Heart,
        cta: "Open Discover",
        done: hasMatch === true,
        action: () => navigate("/discover"),
      },
    ],
    [tourDone, isVerified, hasMatch, navigate, onReplayTour],
  );

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;
  const nextStep = steps.find((s) => !s.done);
  const progress = Math.round((completedCount / steps.length) * 100);

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "true");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  // Hide once user has dismissed it OR everything is done and they've seen it
  if (dismissed) return null;
  if (hasMatch === null) return null; // wait for data so we don't flash

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="mb-6"
      >
        <Card className="relative overflow-hidden bg-card/80 backdrop-blur-sm border-accent/30 glow-border">
          {/* Subtle aurora wash */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ background: "var(--gradient-aurora)" }}
            aria-hidden
          />
          <CardContent className="relative p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground leading-tight">
                    {allDone ? "You're all set ✨" : "Welcome to Stellara"}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    {allDone
                      ? "You've completed your getting-started checklist."
                      : `${completedCount} of ${steps.length} complete · finish to unlock the full experience`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss welcome checklist"
                className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 -mt-1 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <Progress value={progress} className="h-1.5 mb-4" />

            <ul className="space-y-2 mb-4">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                      step.done
                        ? "bg-accent/10 border-accent/30"
                        : "bg-muted/30 border-border/50"
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {step.done ? (
                        <CheckCircle2 className="w-5 h-5 text-accent" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground/60" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Icon className={`w-3.5 h-3.5 ${step.done ? "text-accent" : "text-primary"}`} />
                        <span
                          className={`text-sm font-medium ${
                            step.done ? "text-muted-foreground line-through" : "text-foreground"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                      {!step.done && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {step.description}
                        </p>
                      )}
                    </div>
                    {!step.done && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px] text-primary hover:text-primary hover:bg-primary/10"
                        onClick={step.action}
                      >
                        {step.cta}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>

            {nextStep ? (
              <Button
                onClick={nextStep.action}
                className="w-full gap-2 h-10"
                style={{ background: "var(--gradient-aurora)" }}
              >
                Continue where I left off
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleDismiss}
                variant="outline"
                className="w-full gap-2 h-10 border-accent/40 text-accent hover:bg-accent/10"
              >
                <CheckCircle2 className="w-4 h-4" />
                Dismiss checklist
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default WelcomeChecklist;