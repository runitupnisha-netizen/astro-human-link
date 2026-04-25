import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ExternalLink, X, Globe, Eye } from "lucide-react";

const PUBLISHED_URL = "https://astro-human-link.lovable.app";
const DISMISS_KEY = "stellara-env-banner-dismissed";

type EnvKind = "preview" | "published" | "custom" | "local";

function detectEnv(host: string): EnvKind {
  if (host === "localhost" || host === "127.0.0.1") return "local";
  if (host.includes("id-preview--") && host.endsWith(".lovable.app")) return "preview";
  if (host === "astro-human-link.lovable.app") return "published";
  return "custom";
}

const EnvironmentBanner = () => {
  const [show, setShow] = useState(false);
  const [env, setEnv] = useState<EnvKind>("published");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = sessionStorage.getItem(DISMISS_KEY) === "true";
    if (dismissed) return;
    const kind = detectEnv(window.location.hostname);
    setEnv(kind);
    setShow(true);
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "true");
    } catch {
      /* ignore */
    }
  };

  const switchToPublished = () => {
    window.location.href = PUBLISHED_URL;
  };

  if (!show) return null;

  const isPreview = env === "preview";
  const label =
    env === "preview"
      ? "Preview build (login-gated)"
      : env === "published"
      ? "Live published app"
      : env === "local"
      ? "Local development"
      : "Custom domain";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-0 inset-x-0 z-[60] px-3 pt-[env(safe-area-inset-top)]"
      >
        <div
          className={`mx-auto max-w-3xl mt-2 rounded-xl border backdrop-blur-md px-4 py-2.5 flex items-center gap-3 shadow-lg ${
            isPreview
              ? "bg-destructive/15 border-destructive/40 text-destructive-foreground"
              : "bg-primary/10 border-primary/30 text-foreground"
          }`}
          role="status"
          aria-live="polite"
        >
          {isPreview ? (
            <Eye className="w-4 h-4 shrink-0 text-destructive" />
          ) : (
            <Globe className="w-4 h-4 shrink-0 text-primary" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium truncate">
              {label}
            </p>
            {isPreview && (
              <p className="text-[11px] text-muted-foreground truncate">
                Switch to the public app to skip the Lovable login.
              </p>
            )}
          </div>
          {isPreview && (
            <Button
              size="sm"
              variant="default"
              className="h-8 text-xs shrink-0"
              onClick={switchToPublished}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open public app
            </Button>
          )}
          <button
            onClick={dismiss}
            aria-label="Dismiss banner"
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EnvironmentBanner;