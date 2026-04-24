import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Crown, Star, Sparkles, Zap, Heart, Eye, Shield, Check, Loader2 } from "lucide-react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePremium, STELLARA_TIERS, TierKey } from "@/hooks/usePremium";
import { useToast } from "@/hooks/use-toast";
import TourHighlight from "@/components/TourHighlight";

/**
 * Lightweight tagged logger for the post-checkout verification flow.
 * Centralized so every breadcrumb is grep-able as `[Premium:verify]` in
 * the browser console and in shipped error reports. We intentionally avoid
 * a heavier logger lib — these are dev/debug breadcrumbs, not telemetry.
 */
const verifyLog = (
  step:
    | "polling-start"
    | "polling-tick"
    | "polling-success"
    | "polling-timeout"
    | "polling-skip"
    | "manual-recheck"
    | "manual-recheck-result",
  details?: Record<string, unknown>,
) => {
  // eslint-disable-next-line no-console
  console.info(`[Premium:verify] ${step}`, details ?? {});
};

const tierDetails: Record<TierKey, {
  icon: React.ReactNode;
  features: string[];
  highlight?: boolean;
  badge?: string;
  description: string;
}> = {
  weekly: {
    icon: <Sparkles className="w-6 h-6" />,
    description: "Try Premium risk-free",
    features: [
      "Unlimited cosmic matches",
      "Daily Cosmic Briefing + reflections",
      "Advanced compatibility insights",
      "Priority Sacred Reveals",
    ],
  },
  monthly: {
    icon: <Star className="w-6 h-6" />,
    description: "Most popular choice",
    badge: "Popular",
    features: [
      "Everything in Weekly",
      "Full synastry charts",
      "Who Liked Me access",
      "Advanced filters",
      "5 Super Likes per week",
      "Weekly cosmic insights digest",
    ],
  },
  vip: {
    icon: <Crown className="w-6 h-6" />,
    description: "The ultimate experience",
    highlight: true,
    badge: "Best Value",
    features: [
      "Everything in Monthly",
      "Unlimited Super Likes & Boosts",
      "Inner World suite (AI Cosmic Guide, Dream Journal)",
      "Compatibility lookup for anyone",
      "Priority profile visibility",
      "Personal energy readings",
    ],
  },
  yearly: {
    icon: <Zap className="w-6 h-6" />,
    description: "Save over 55%",
    badge: "Best Price",
    features: [
      "Everything in VIP, billed yearly",
      "Inner World suite included",
      "Save $99+ per year",
      "Locked-in price for 12 months",
    ],
  },
};

const premiumPerks = [
  { icon: <Heart className="w-5 h-5" />, title: "Unlimited Matches", desc: "No daily limits on cosmic connections" },
  { icon: <Eye className="w-5 h-5" />, title: "See Who Likes You", desc: "Know your admirers before you swipe" },
  { icon: <Sparkles className="w-5 h-5" />, title: "Deep Compatibility", desc: "Full synastry charts & soul blueprints" },
  { icon: <Shield className="w-5 h-5" />, title: "Priority Visibility", desc: "Your profile gets seen first" },
];

const Premium = () => {
  const { subscribed, currentTier, subscriptionEnd, loading, checkout, manageSubscription, refreshSubscription } = usePremium();
  const [checkoutLoading, setCheckoutLoading] = useState<TierKey | null>(null);
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const navigate = useNavigate();

  const toastShown = useRef(false);
  const redirectTriggered = useRef(false);
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");
  const redirectTo = searchParams.get("redirect") || "/discover";
  const [verifying, setVerifying] = useState(false);
  // Tracks whether the post-checkout polling loop exhausted its attempts
  // without ever observing an active subscription. When true we swap the
  // overlay to a "Upgrade not confirmed yet" state with retry guidance,
  // instead of leaving the user on an empty pricing page wondering what
  // happened. Stripe webhooks usually settle within seconds, but card
  // verification, 3DS, or webhook backlog can occasionally push it past
  // our ~24s polling window.
  const [pollingTimedOut, setPollingTimedOut] = useState(false);

  // Mirrors `subscribed` for use inside the polling interval without putting
  // it in the effect deps (which would tear down and recreate the interval
  // every time the value changes — defeating the "single interval" guarantee).
  const subscribedRef = useRef(subscribed);
  useEffect(() => {
    subscribedRef.current = subscribed;
  }, [subscribed]);

  // Guards the polling loop against duplicate starts caused by:
  //   - StrictMode double-invoking effects in dev,
  //   - the user navigating away from /premium and back while the redirect
  //     timer hasn't fired yet,
  //   - `usePremium` returning a new `refreshSubscription` reference.
  // Component-scoped (not module-scoped) so a fresh page load after a real
  // navigation can poll again, but multiple mounts within the same instance
  // share one interval.
  const pollingActiveRef = useRef(false);

  // Guards the success/timeout *toasts* so they fire exactly once per
  // verification run, even if the polling effect re-evaluates or the user
  // navigates back to /premium with `?success=1` still in the URL.
  const verifyToastShownRef = useRef(false);

  useEffect(() => {
    if (toastShown.current) return;
    if (success) {
      toastShown.current = true;
      toast({ title: "Welcome to Stellara Premium! ✨", description: "Your cosmic journey has been elevated." });
    }
    if (canceled) {
      toastShown.current = true;
      toast({ title: "Checkout canceled", description: "You can upgrade anytime.", variant: "destructive" });
    }
  }, [success, canceled, toast]);

  // After Stripe checkout success, poll the subscription status until it
  // becomes active, then redirect the user back into the app.
  useEffect(() => {
    if (!success || redirectTriggered.current) return;
    // Already subscribed before polling even started — let the redirect
    // effect handle it, no interval needed.
    if (subscribedRef.current) {
      verifyLog("polling-skip", { reason: "already-subscribed" });
      return;
    }
    // Don't start a second interval if one is already running for this mount.
    if (pollingActiveRef.current) {
      verifyLog("polling-skip", { reason: "already-running" });
      return;
    }
    pollingActiveRef.current = true;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 12; // ~24s at 2s interval
    let interval: ReturnType<typeof setInterval> | null = null;

    const stop = (timedOut: boolean) => {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
      setVerifying(false);
      if (timedOut && !subscribedRef.current) {
        setPollingTimedOut(true);
        verifyLog("polling-timeout", { attempts, maxAttempts });
        if (!verifyToastShownRef.current) {
          verifyToastShownRef.current = true;
          toast({
            title: "Still confirming your upgrade…",
            description:
              "Stripe is taking a moment longer than usual. You can check again or retry checkout.",
            variant: "destructive",
          });
        }
      } else if (!timedOut && subscribedRef.current) {
        verifyLog("polling-success", { attempts });
        if (!verifyToastShownRef.current) {
          verifyToastShownRef.current = true;
          toast({
            title: "Premium verified ✨",
            description: "Your subscription is active. Enjoy Stellara Premium.",
          });
        }
      }
    };

    setVerifying(true);
    setPollingTimedOut(false);
    verifyLog("polling-start", { maxAttempts, intervalMs: 2000 });

    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        await refreshSubscription();
        verifyLog("polling-tick", {
          attempt: attempts,
          subscribed: subscribedRef.current,
        });
      } catch {
        // swallow — we'll retry
        verifyLog("polling-tick", {
          attempt: attempts,
          error: "refresh-failed",
        });
      }
      // Bail as soon as the subscription is confirmed so we don't fire one
      // more (wasteful) check-subscription call after the happy path lands.
      if (subscribedRef.current) {
        stop(false);
      }
    };

    // Kick off an immediate check, then poll.
    tick();
    interval = setInterval(async () => {
      if (cancelled) return;
      if (subscribedRef.current) {
        stop(false);
        return;
      }
      if (attempts >= maxAttempts) {
        stop(true);
        return;
      }
      await tick();
    }, 2000);

    return () => {
      cancelled = true;
      if (interval !== null) clearInterval(interval);
      pollingActiveRef.current = false;
    };
    // Intentionally exclude `subscribed` and `refreshSubscription` from deps:
    // we read the live value through `subscribedRef`, and the function ref
    // is stable enough that re-running would only spawn duplicate intervals.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success]);

  // Once subscription is confirmed active after a successful checkout, redirect.
  useEffect(() => {
    if (!success || redirectTriggered.current) return;
    if (subscribed) {
      redirectTriggered.current = true;
      setVerifying(false);
      setPollingTimedOut(false);
      const t = setTimeout(() => navigate(redirectTo, { replace: true }), 1200);
      return () => clearTimeout(t);
    }
  }, [success, subscribed, navigate, redirectTo]);

  const handleCheckout = async (tierKey: TierKey) => {
    setCheckoutLoading(tierKey);
    // Dismiss the timeout overlay if the user is starting a new checkout.
    setPollingTimedOut(false);
    try {
      await checkout(STELLARA_TIERS[tierKey].price_id, redirectTo);
    } catch {
      toast({ title: "Error", description: "Could not start checkout. Please try again.", variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManage = async () => {
    try {
      await manageSubscription();
    } catch {
      toast({ title: "Error", description: "Could not open subscription management.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16 pb-24">
      {/* Post-checkout verification overlay */}
      {success && (verifying || subscribed || pollingTimedOut) && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/90 backdrop-blur-md">
          <div className="text-center max-w-sm px-6">
            {subscribed ? (
              <>
                <Crown className="w-12 h-12 text-accent mx-auto mb-4" />
                <h2 className="font-display text-xl text-foreground mb-2">You're Premium ✨</h2>
                <p className="text-sm text-muted-foreground font-body">
                  Redirecting you back to the app…
                </p>
              </>
            ) : pollingTimedOut ? (
              <>
                <AlertCircle className="w-12 h-12 text-accent mx-auto mb-4" />
                <h2 className="font-display text-xl text-foreground mb-2">
                  Upgrade not confirmed yet
                </h2>
                <p className="text-sm text-muted-foreground font-body mb-4 leading-relaxed">
                  Your payment may still be processing on Stripe's end. This
                  usually clears within a minute. You can:
                </p>
                <ul className="text-left text-sm text-muted-foreground font-body space-y-2 mb-5 mx-auto max-w-[280px]">
                  <li>
                    <span className="text-foreground font-semibold">•</span>{" "}
                    Wait a moment and tap{" "}
                    <span className="text-foreground font-semibold">Check again</span>
                  </li>
                  <li>
                    <span className="text-foreground font-semibold">•</span>{" "}
                    Re-open checkout if your card was declined or 3DS was canceled
                  </li>
                  <li>
                    <span className="text-foreground font-semibold">•</span>{" "}
                    Contact support if your card was charged but Premium isn't active
                  </li>
                </ul>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={async () => {
                      setPollingTimedOut(false);
                      setVerifying(true);
                      verifyLog("manual-recheck");
                      try {
                        await refreshSubscription();
                      } finally {
                        setVerifying(false);
                        // If still not subscribed, surface the timeout state again
                        // so the user isn't stuck on a hidden overlay.
                        const ok = subscribedRef.current;
                        verifyLog("manual-recheck-result", { subscribed: ok });
                        if (ok) {
                          toast({
                            title: "Premium verified ✨",
                            description: "Your subscription is now active.",
                          });
                        } else {
                          setPollingTimedOut(true);
                          toast({
                            title: "Still not confirmed",
                            description:
                              "Stripe hasn't reported your subscription yet. Please try again in a moment.",
                            variant: "destructive",
                          });
                        }
                      }
                    }}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 min-h-[44px]"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Check again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPollingTimedOut(false);
                      // Scroll the user to the plan picker so they can retry checkout.
                      document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="border-accent/30 text-accent hover:bg-accent/10 min-h-[44px]"
                  >
                    Retry checkout
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/contact")}
                    className="text-muted-foreground hover:text-foreground text-sm min-h-[40px]"
                  >
                    Contact support
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Loader2 className="w-10 h-10 animate-spin text-accent mx-auto mb-4" />
                <h2 className="font-display text-lg text-foreground mb-2">Confirming your upgrade</h2>
                <p className="text-sm text-muted-foreground font-body">
                  Aligning the stars with your new plan…
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="relative overflow-hidden pt-8 pb-12 px-4">
        <div className="absolute inset-0 bg-[var(--gradient-cosmic)] opacity-60" />
        <div className="relative z-10 max-w-lg mx-auto text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
            <Crown className="w-12 h-12 text-accent mx-auto mb-4" />
          </motion.div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Stellara Premium
          </h1>
          <p className="text-muted-foreground font-body text-lg">
            Unlock the full power of{" "}
            <a href="#plans" onClick={(e) => { e.preventDefault(); document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" }); }} className="text-accent hover:underline underline-offset-2 transition-colors cursor-pointer">cosmic connection ↓</a>
          </p>

          {subscribed && currentTier && (
            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-6">
              <Badge className="bg-accent text-accent-foreground px-4 py-2 text-sm font-body">
                ✨ Active: {STELLARA_TIERS[currentTier].name} Plan
              </Badge>
              {subscriptionEnd && (
                <p className="text-muted-foreground text-sm mt-2 font-body">
                  Renews {new Date(subscriptionEnd).toLocaleDateString()}
                </p>
              )}
              <Button onClick={handleManage} variant="outline" className="mt-4 border-accent/30 text-accent hover:bg-accent/10">
                Manage Subscription
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Perks */}
      <div className="px-4 max-w-lg mx-auto -mt-4 mb-8">
        <div className="grid grid-cols-2 gap-3">
          {premiumPerks.map((perk, i) => (
            <motion.div
              key={perk.title}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card/60 backdrop-blur border border-border/50 rounded-xl p-4"
            >
              <div className="text-accent mb-2">{perk.icon}</div>
              <h3 className="text-foreground font-body font-semibold text-sm">{perk.title}</h3>
              <p className="text-muted-foreground text-xs font-body mt-1">{perk.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tier Cards */}
      <TourHighlight
        targetId="premium-tiers"
        label="Stellara Premium plans"
        className="px-4 max-w-lg mx-auto space-y-4"
      >
        <h2 id="plans" className="text-foreground font-display text-xl text-center mb-4">Choose Your Plan</h2>

        {(Object.keys(STELLARA_TIERS) as TierKey[]).map((tierKey, i) => {
          const tier = STELLARA_TIERS[tierKey];
          const details = tierDetails[tierKey];
          const isCurrentPlan = subscribed && currentTier === tierKey;

          return (
            <motion.div
              key={tierKey}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <Card className={`relative overflow-hidden transition-all ${
                details.highlight
                  ? "border-accent/50 bg-gradient-to-br from-card to-accent/5 shadow-lg shadow-accent/10"
                  : isCurrentPlan
                    ? "border-primary/50 bg-gradient-to-br from-card to-primary/5"
                    : "border-border/50 bg-card/80"
              }`}>
                {details.badge && (
                  <div className="absolute top-0 right-0">
                    <Badge className={`rounded-none rounded-bl-lg text-xs ${
                      details.highlight ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
                    }`}>
                      {details.badge}
                    </Badge>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute top-0 left-0">
                    <Badge className="rounded-none rounded-br-lg bg-primary text-primary-foreground text-xs">
                      Your Plan
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${details.highlight ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary"}`}>
                      {details.icon}
                    </div>
                    <div>
                      <CardTitle className="text-foreground font-display text-lg">
                        {tier.name}
                      </CardTitle>
                      <p className="text-muted-foreground text-sm font-body">{details.description}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <span className="text-foreground font-display text-2xl font-bold">{tier.price}</span>
                      <span className="text-muted-foreground text-sm font-body">/{tier.interval}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-2">
                  <ul className="space-y-2 mb-4">
                    {details.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm font-body text-foreground/80">
                        <Check className={`w-4 h-4 flex-shrink-0 ${details.highlight ? "text-accent" : "text-primary"}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <Button variant="outline" className="w-full border-primary/30 min-h-[48px]" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleCheckout(tierKey)}
                      disabled={checkoutLoading !== null}
                      className={`w-full min-h-[48px] text-base font-semibold active:scale-[0.98] transition-transform touch-manipulation ${
                        details.highlight
                          ? "bg-accent text-accent-foreground hover:bg-accent/90 shadow-md shadow-accent/20"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      {checkoutLoading === tierKey ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Opening checkout...
                        </>
                      ) : (
                        <>{subscribed ? "Switch to this plan" : "Start now"}</>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {/* Trust line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-xs text-muted-foreground font-body pt-4 px-4 leading-relaxed"
        >
          🔒 Secure checkout via Stripe · Cancel anytime · No hidden fees
        </motion.p>

        {/* Restore Purchase */}
        {!subscribed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center mt-2"
          >
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await manageSubscription();
                } catch {
                  toast({ title: "No subscription found", description: "If you believe this is an error, please contact support.", variant: "destructive" });
                }
              }}
              className="text-muted-foreground hover:text-foreground text-sm min-h-[44px]"
            >
              Restore Previous Purchase
            </Button>
          </motion.div>
        )}
      </TourHighlight>
    </div>
  );
};

export default Premium;
