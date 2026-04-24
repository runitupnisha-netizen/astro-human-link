import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SparkleLoader from "@/components/SparkleLoader";
import CosmicBackground from "@/components/CosmicBackground";

/**
 * Shown when a user's session expires mid-app.
 * Brief 500ms SparkleLoader, then a friendly prompt to sign back in.
 * Never a white screen.
 */
const SessionExpired = () => {
  const navigate = useNavigate();
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowLoader(false), 500);
    return () => clearTimeout(t);
  }, []);

  if (showLoader) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <SparkleLoader size={36} />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4">
      <CosmicBackground />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm text-center"
      >
        <div className="glass-card glow-border p-8 space-y-5">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold bg-gradient-golden bg-clip-text text-transparent">
              Your session has ended
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For your security, please sign back in to continue your cosmic journey.
            </p>
          </div>
          <Button
            onClick={() => {
              // Full reload to wipe any stale in-memory state
              window.location.href = "/auth";
            }}
            className="w-full h-12 text-base font-semibold"
            style={{ background: "var(--gradient-aurora)" }}
          >
            Sign In ✦
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default SessionExpired;