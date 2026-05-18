import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check, Lock, ArrowRight, Sparkles } from "lucide-react";
import CosmicBackground from "@/components/CosmicBackground";
import { Progress } from "@/components/ui/progress";
import type { FoundationStatus } from "@/hooks/useFoundationStatus";

const ConnectionsLocked = ({ status }: { status: FoundationStatus }) => {
  const pct = Math.round((status.completedCount / status.totalCount) * 100);

  return (
    <div className="min-h-screen bg-background relative">
      <CosmicBackground />
      <div className="relative z-10 pt-24 md:pt-28 pb-24 md:pb-12">
        <div className="max-w-2xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/15 flex items-center justify-center ring-1 ring-primary/30">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <p className="italic text-sm text-primary/80 mb-2 font-serif">
              Self-discovery first. Connection follows.
            </p>
            <h1 className="text-2xl md:text-3xl font-display font-bold bg-gradient-golden bg-clip-text text-transparent">
              Complete your Self-Knowledge Foundation to unlock Cosmic Connections
            </h1>
            <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
              Stellara begins with knowing yourself. Finish these four steps and Connections opens to you.
            </p>
          </motion.div>

          <div className="glass-card glow-border p-5 md:p-6 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Foundation Progress
              </span>
              <span className="text-xs font-bold text-primary">
                {status.completedCount} / {status.totalCount}
              </span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>

          <div className="space-y-3">
            {status.steps.map((step, i) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <Link
                  to={step.path}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all touch-manipulation ${
                    step.done
                      ? "border-accent/40 bg-accent/5"
                      : "border-border/50 bg-card/40 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.99]"
                  }`}
                >
                  <div
                    className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                      step.done ? "bg-accent/20 text-accent" : "bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {step.done ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${step.done ? "text-foreground/70 line-through" : "text-foreground"}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  </div>
                  {!step.done && <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionsLocked;