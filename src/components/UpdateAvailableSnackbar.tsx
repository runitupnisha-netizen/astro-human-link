import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X, Sparkles } from "lucide-react";

/**
 * Listens for a new service worker reaching the "waiting" state and shows
 * a snackbar inviting the user to reload immediately. The reload itself is
 * triggered by `controllerchange` (handled in main.tsx), so we just send
 * SKIP_WAITING to the new worker.
 */
const UpdateAvailableSnackbar = () => {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [open, setOpen] = useState(false);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;

    const promote = (worker: ServiceWorker | null) => {
      if (cancelled || !worker) return;
      setWaitingWorker(worker);
      setOpen(true);
    };

    const watchRegistration = (reg: ServiceWorkerRegistration) => {
      // Already a waiting worker (update sat across reloads)
      if (reg.waiting && navigator.serviceWorker.controller) {
        promote(reg.waiting);
      }

      // A new worker started installing — wait for it to reach "installed"
      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (
            installing.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            promote(installing);
          }
        });
      });
    };

    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach(watchRegistration);
    });

    navigator.serviceWorker.ready.then(watchRegistration).catch(() => {
      /* no-op */
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const reloadNow = () => {
    if (!waitingWorker) {
      window.location.reload();
      return;
    }
    setReloading(true);
    // Tell the waiting SW to take over; main.tsx's controllerchange listener
    // will reload the page once it does.
    try {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    } catch {
      window.location.reload();
    }

    // Safety fallback in case controllerchange never fires
    window.setTimeout(() => {
      if (!cancelled.current) window.location.reload();
    }, 2500);
  };

  // Tiny mutable holder for the safety timeout, scoped to component lifetime.
  const cancelled = { current: false };
  useEffect(() => () => { cancelled.current = true; }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          role="status"
          aria-live="polite"
          className="fixed left-1/2 -translate-x-1/2 z-[70] w-[min(92vw,420px)]"
          style={{
            bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/95 backdrop-blur-md shadow-xl px-3 py-2.5">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-tight">
                New update available
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                Tap reload to get the latest Stellara experience.
              </p>
            </div>
            <button
              type="button"
              onClick={reloadNow}
              disabled={reloading}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${reloading ? "animate-spin" : ""}`} />
              {reloading ? "Reloading…" : "Reload"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Dismiss update notice"
              className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpdateAvailableSnackbar;
