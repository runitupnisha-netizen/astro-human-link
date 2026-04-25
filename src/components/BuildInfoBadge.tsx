import { useEffect, useState } from "react";
import { X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "stellara:build-badge-dismissed-for";

const formatDeploy = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const BuildInfoBadge = () => {
  const version = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
  const buildTime = typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : new Date().toISOString();
  const buildKey = `${version}@${buildTime}`;

  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissedFor = window.localStorage.getItem(STORAGE_KEY);
    // Show automatically when a new build lands; stay dismissed otherwise.
    setOpen(dismissedFor !== buildKey);
  }, [buildKey]);

  const dismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, buildKey);
    }
    setOpen(false);
  };

  return (
    <>
      {/* Always-available tiny chip in the corner so you can re-open it any time */}
      <button
        type="button"
        onClick={() => {
          setCollapsed(false);
          setOpen(true);
        }}
        className="fixed bottom-2 left-2 z-[60] rounded-full border border-border/40 bg-background/70 px-2 py-0.5 text-[10px] font-mono text-muted-foreground/70 backdrop-blur-sm hover:text-foreground hover:border-border transition-colors pointer-events-auto"
        style={{
          paddingBottom: "calc(0.125rem + env(safe-area-inset-bottom, 0px))",
        }}
        aria-label="Show build info"
      >
        v{version}
      </button>

      <AnimatePresence>
        {open && !collapsed && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-3 left-3 right-3 sm:right-auto sm:max-w-xs z-[60] rounded-xl border border-border/60 bg-background/90 backdrop-blur-md shadow-lg p-3 pr-9"
            style={{
              marginBottom: "env(safe-area-inset-bottom, 0px)",
            }}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" aria-hidden />
              <div className="text-xs leading-tight">
                <div className="font-medium text-foreground">
                  Stellara v{version}
                </div>
                <div className="text-muted-foreground mt-0.5 font-mono text-[11px]">
                  Deployed {formatDeploy(buildTime)}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="absolute top-1.5 right-1.5 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="Dismiss build info"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BuildInfoBadge;
