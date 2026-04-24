import { motion } from "framer-motion";
import { Crown, X, Sparkles, Phone, Video, RefreshCw, Loader2, Clock, AlertCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";

/**
 * Why the gate is showing — drives the headline and explanation copy so the
 * user knows whether they never had premium, it lapsed, or it's temporarily
 * unavailable. Mirrors the `reason` field returned by the
 * `get-premium-status` / `create-call-room` edge functions.
 */
export type PremiumGateStatus =
  | "missing"           // no Stripe customer / never subscribed
  | "expired"           // subscription_end is in the past
  | "inactive"          // customer exists but no active subscription right now
  | "unauthenticated"   // session not available
  | "unavailable"       // Stripe not configured / edge function error
  | "generic";

interface PremiumRequiredScreenProps {
  open: boolean;
  onClose: () => void;
  feature?: "voice" | "video" | "generic";
  /**
   * Optional retry handler. When provided, a "Retry" button appears that
   * lets the user re-invoke the gated action (e.g. create-call-room) without
   * closing the call flow. Useful right after upgrading to premium.
   * Should resolve when the retry attempt is complete; throw/reject to keep
   * this screen visible.
   */
  onRetry?: () => void | Promise<void>;
  retryLabel?: string;
  /**
   * Specific reason the user hit this gate, used to tailor the message
   * (e.g. "Your Premium has expired" vs. "Premium is required").
   */
  status?: PremiumGateStatus;
  /**
   * ISO timestamp of when the previous subscription ended — surfaced in the
   * "expired" copy so the user knows when their access lapsed.
   */
  subscriptionEnd?: string | null;
}

const PremiumRequiredScreen = ({
  open,
  onClose,
  feature = "video",
  onRetry,
  retryLabel = "Retry call",
  status = "missing",
  subscriptionEnd = null,
}: PremiumRequiredScreenProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [retrying, setRetrying] = useState(false);

  if (!open) return null;

  const Icon = feature === "voice" ? Phone : feature === "video" ? Video : Sparkles;
  const featureLabel =
    feature === "voice"
      ? "Voice Calls"
      : feature === "video"
      ? "Video Calls"
      : "This Feature";

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const endedOn = formatDate(subscriptionEnd);

  const statusContent: Record<
    PremiumGateStatus,
    {
      badge: { label: string; icon: typeof Crown };
      title: string;
      description: string;
      upgradeLabel: string;
    }
  > = {
    missing: {
      badge: { label: "Premium required", icon: Lock },
      title: `${featureLabel} are a Premium Ritual`,
      description:
        "Connect heart-to-heart with your matches through secure, end-to-end calls. Unlock with Stellara Premium and meet the soul behind the stars.",
      upgradeLabel: "Upgrade to Premium",
    },
    expired: {
      badge: { label: "Premium expired", icon: Clock },
      title: "Your Premium has expired",
      description: endedOn
        ? `Your subscription ended on ${endedOn}. Renew to keep starting ${featureLabel.toLowerCase()} and access every premium ritual.`
        : `Your subscription has ended. Renew to keep starting ${featureLabel.toLowerCase()} and access every premium ritual.`,
      upgradeLabel: "Renew Premium",
    },
    inactive: {
      badge: { label: "Premium inactive", icon: AlertCircle },
      title: "Premium isn't active right now",
      description:
        "We couldn't find an active subscription on your account. If you just upgraded, give it a moment and tap Retry — or reactivate below to start your call.",
      upgradeLabel: "Reactivate Premium",
    },
    unauthenticated: {
      badge: { label: "Sign in required", icon: Lock },
      title: "Sign in to start a call",
      description:
        "Your session expired. Sign back in to verify your Premium status and reconnect with your match.",
      upgradeLabel: "Go to Premium",
    },
    unavailable: {
      badge: { label: "Status unavailable", icon: AlertCircle },
      title: "We couldn't verify your Premium",
      description:
        "Something temporarily blocked us from confirming your subscription. Tap Retry to try again, or open Premium to manage your plan.",
      upgradeLabel: "Open Premium",
    },
    generic: {
      badge: { label: "Premium required", icon: Crown },
      title: `${featureLabel} are a Premium Ritual`,
      description:
        "Unlock with Stellara Premium to meet the soul behind the stars.",
      upgradeLabel: "Upgrade to Premium",
    },
  };

  const content = statusContent[status];
  const BadgeIcon = content.badge.icon;

  const handleUpgrade = () => {
    onClose();
    const back = `${location.pathname}${location.search}`;
    navigate(`/premium?redirect=${encodeURIComponent(back)}`);
  };

  const handleRetry = async () => {
    if (!onRetry || retrying) return;
    try {
      setRetrying(true);
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-background/95 backdrop-blur-md p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-required-title"
    >
      {/* Close */}
      <Button
        size="icon"
        variant="ghost"
        onClick={onClose}
        className="absolute top-4 right-4 text-foreground/60 hover:text-foreground"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </Button>

      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 220 }}
        className="relative w-full max-w-sm mx-auto text-center"
      >
        {/* Glow */}
        <div className="absolute inset-0 -z-10 bg-gradient-mystical opacity-30 blur-3xl rounded-full" />

        {/* Crown badge with halo */}
        <div className="relative mx-auto mb-6 w-24 h-24">
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 2.4, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-amber-400/30 blur-xl"
          />
          <div className="relative w-24 h-24 rounded-full bg-gradient-golden flex items-center justify-center shadow-golden ring-2 ring-amber-300/40">
            <Crown className="w-11 h-11 text-background" strokeWidth={2.2} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center ring-2 ring-amber-300/40">
            <Icon className="w-4 h-4 text-amber-400" />
          </div>
        </div>

        <h2
          id="premium-required-title"
          className="font-display text-2xl font-bold text-foreground mb-2"
        >
          {featureLabel} are a Premium Ritual
        </h2>
        <p className="text-sm text-foreground/70 leading-relaxed mb-6">
          Connect heart-to-heart with your matches through secure, end-to-end
          calls. Unlock with Stellara Premium and meet the soul behind the stars.
        </p>

        {/* Bullets */}
        <ul className="text-left space-y-2 mb-7 mx-auto max-w-[280px]">
          {[
            "Unlimited private voice & video calls",
            "Priority match visibility & boosts",
            "Full Synastry & compatibility insights",
          ].map((b) => (
            <li
              key={b}
              className="flex items-start gap-2 text-sm text-foreground/80"
            >
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleUpgrade}
            className="w-full h-12 bg-gradient-golden text-background font-semibold shadow-golden hover:opacity-95"
          >
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to Premium
          </Button>
          {onRetry && (
            <Button
              variant="outline"
              onClick={handleRetry}
              disabled={retrying}
              className="w-full h-11 border-amber-300/40 text-amber-200 hover:text-amber-100 hover:bg-amber-400/10"
            >
              {retrying ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {retrying ? "Retrying…" : retryLabel}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full h-10 text-foreground/60 hover:text-foreground"
          >
            Maybe later
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PremiumRequiredScreen;