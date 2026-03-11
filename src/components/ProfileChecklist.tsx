import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, X, ChevronDown, ChevronUp, PartyPopper } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface ChecklistItem {
  label: string;
  done: boolean;
  tip: string;
}

interface ProfileChecklistProps {
  profile: any;
  photoCount: number;
}

const ProfileChecklist = ({ profile, photoCount }: ProfileChecklistProps) => {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('profile-checklist-dismissed') === 'true';
  });
  const [expanded, setExpanded] = useState(true);

  const items: ChecklistItem[] = [
    {
      label: "Add a profile photo",
      done: !!profile.avatar_url,
      tip: "Profiles with photos get 10× more interest.",
    },
    {
      label: "Enter your birth details",
      done: !!(profile.birth_date && profile.birth_place),
      tip: "Unlocks your star chart and compatibility insights.",
    },
    {
      label: "Fill in your bio prompts",
      done: !!(profile.bio_prompt_1_answer && profile.bio_prompt_2_answer),
      tip: "Help others get to know the real you.",
    },
    {
      label: "Upload gallery photos",
      done: photoCount >= 2,
      tip: "Add at least 2 photos to stand out.",
    },
    {
      label: "Set your lifestyle preferences",
      done: !!(profile.kids_preference && profile.drinking && profile.smoking),
      tip: "Helps match you with compatible people.",
    },
    {
      label: "Choose your interests",
      done: !!(profile.interests && profile.interests.length >= 3),
      tip: "Pick 3+ interests for better discovery.",
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const percentage = Math.round((completedCount / items.length) * 100);
  const isComplete = percentage === 100;
  const hasFiredConfetti = useRef(false);

  useEffect(() => {
    if (isComplete && !hasFiredConfetti.current) {
      hasFiredConfetti.current = true;
      const duration = 2000;
      const end = Date.now() + duration;
      const fire = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ["#d4a843", "#9b87f5", "#e0c97f", "#7E69AB"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ["#d4a843", "#9b87f5", "#e0c97f", "#7E69AB"],
        });
        if (Date.now() < end) requestAnimationFrame(fire);
      };
      fire();
    }
  }, [isComplete]);

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="mb-6 bg-card/80 backdrop-blur-sm border-accent/30">
        <CardContent className="p-5">
          {isComplete ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center text-center py-4 gap-3"
            >
              <PartyPopper className="w-10 h-10 text-primary" />
              <h3 className="text-xl font-bold text-foreground">Profile Complete!</h3>
              <p className="text-sm text-muted-foreground">Your cosmic blueprint is fully activated. You're ready to attract aligned connections.</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-muted-foreground"
                onClick={() => { localStorage.setItem('profile-checklist-dismissed', 'true'); setDismissed(true); }}
              >
                Dismiss
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-lg font-semibold text-foreground">
                    Profile {percentage}% complete
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {completedCount}/{items.length} steps
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setExpanded(!expanded)}
                  >
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => { localStorage.setItem('profile-checklist-dismissed', 'true'); setDismissed(true); }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Progress bar */}
              <Progress value={percentage} className="h-2 mb-3" />

              {/* Checklist items */}
              <AnimatePresence>
                {expanded && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2 overflow-hidden"
                  >
                    {items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        {item.done ? (
                          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <span
                            className={`text-sm font-medium ${
                              item.done ? "text-muted-foreground line-through" : "text-foreground"
                            }`}
                          >
                            {item.label}
                          </span>
                          {!item.done && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.tip}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ProfileChecklist;
