import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Star, X } from "lucide-react";

const InAppFeedback = () => {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show after user has matched (positive moment) — check localStorage
    const matchCount = parseInt(localStorage.getItem("stellara-match-count") || "0");
    const alreadyRated = localStorage.getItem("stellara-feedback-dismissed") === "true";
    if (matchCount >= 3 && !alreadyRated) {
      const timer = setTimeout(() => setShow(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem("stellara-feedback-dismissed", "true");
  };

  if (dismissed || !show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4"
      >
        <div className="glass-card border border-accent/30 p-5 text-center space-y-3">
          <button onClick={dismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className="w-6 h-6 text-accent fill-accent" />
            ))}
          </div>
          <h3 className="font-display text-lg font-bold text-foreground">Enjoying Stellara?</h3>
          <p className="text-xs text-muted-foreground">Your feedback helps us build a better experience</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 border-border/30" onClick={dismiss}>
              Not Now
            </Button>
            <Button
              size="sm"
              className="flex-1 btn-shimmer"
              style={{ background: "var(--gradient-golden)" }}
              onClick={() => {
                dismiss();
                // In a real app, this would open the app store
                window.open("https://stellara.app", "_blank");
              }}
            >
              Rate Us ⭐
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InAppFeedback;
