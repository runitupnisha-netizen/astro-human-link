import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ArrowRight, Check, ShieldCheck, Link2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import CosmicBackground from "@/components/CosmicBackground";
import stellaraAppIcon from "@/assets/stellara-app-icon.png";
import { motion } from "framer-motion";

const getRecoveryTokensFromHash = () => {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return {
    accessToken: hashParams.get("access_token"),
    refreshToken: hashParams.get("refresh_token"),
    type: hashParams.get("type"),
  };
};

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const [verifyingLink, setVerifyingLink] = useState(true);
  const [confirmationUrl, setConfirmationUrl] = useState<string | null>(null);
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [manualLink, setManualLink] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const navigate = useNavigate();

  const extractTokensFromAnyUrl = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      // Accept either full URL or just the hash/query fragment
      let url: URL;
      try {
        url = new URL(trimmed);
      } catch {
        url = new URL(trimmed, window.location.origin);
      }
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const query = url.searchParams;
      const accessToken = hash.get("access_token") || query.get("access_token");
      const refreshToken = hash.get("refresh_token") || query.get("refresh_token");
      const tokenHash = query.get("token_hash") || query.get("token");
      const type = hash.get("type") || query.get("type") || "recovery";
      return { accessToken, refreshToken, tokenHash, type };
    } catch {
      return null;
    }
  };

  const handleManualRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    const tokens = extractTokensFromAnyUrl(manualLink);
    if (!tokens || (!tokens.accessToken && !tokens.tokenHash)) {
      toast.error("Couldn't find a valid token in that link. Paste the full URL from the email.");
      return;
    }
    setManualLoading(true);
    try {
      if (tokens.accessToken && tokens.refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        });
        if (error) throw error;
      } else if (tokens.tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: tokens.tokenHash,
        });
        if (error) throw error;
      }
      setReady(true);
      setShowManualFallback(false);
      setConfirmationUrl(null);
      setVerifyingLink(false);
      toast.success("Link verified — set your new password ✨");
    } catch (err: any) {
      toast.error(err.message || "Could not verify that link. Request a fresh one.");
    } finally {
      setManualLoading(false);
    }
  };

  useEffect(() => {
    let recovered = false;
    let failureTimer: number | undefined;
    let sessionPoller: number | undefined;

    const params = new URLSearchParams(window.location.search);
    const { accessToken, refreshToken, type } = getRecoveryTokensFromHash();
    const encodedConfirmationUrl = params.get("confirmation_url");
    const safeConfirmationUrl = encodedConfirmationUrl
      ? decodeURIComponent(encodedConfirmationUrl)
      : null;
    const hasRecoveryIntent =
      params.get("reset") === "1" ||
      window.location.hash.includes("type=recovery") ||
      window.location.hash.includes("access_token") ||
      window.location.hash.includes("refresh_token") ||
      window.sessionStorage.getItem("auth-recovery-pending") === "true" ||
      window.localStorage.getItem("auth-recovery-pending") === "true" ||
      document.referrer.includes("/verify");

    if (safeConfirmationUrl) {
      setConfirmationUrl(safeConfirmationUrl);
      setVerifyingLink(false);
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        recovered = true;
        setConfirmationUrl(null);
        setReady(true);
        setVerifyingLink(false);
      }
    });

    const initializeRecovery = async () => {
      if (accessToken && refreshToken && (type === "recovery" || hasRecoveryIntent)) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error) {
          recovered = true;
          setReady(true);
          setVerifyingLink(false);
          window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setReady(true);
        setVerifyingLink(false);
        return;
      }

      if (safeConfirmationUrl) {
        setVerifyingLink(false);
        return;
      }

      if (hasRecoveryIntent) {
        setVerifyingLink(true);
        sessionPoller = window.setInterval(async () => {
          const { data } = await supabase.auth.getSession();
          if (!data.session) return;

          recovered = true;
          window.clearInterval(sessionPoller);
          setReady(true);
          setVerifyingLink(false);
        }, 500);
      }

      failureTimer = window.setTimeout(() => {
        if (!recovered) {
          if (sessionPoller) {
            window.clearInterval(sessionPoller);
          }
          setVerifyingLink(false);
          setShowManualFallback(true);
        }
      }, hasRecoveryIntent ? 12000 : 2000);
    };

    void initializeRecovery();

    return () => {
      subscription.subscription.unsubscribe();
      if (failureTimer) {
        window.clearTimeout(failureTimer);
      }
      if (sessionPoller) {
        window.clearInterval(sessionPoller);
      }
    };
  }, [navigate]);

  const handleContinueToSecureReset = () => {
    if (!confirmationUrl) return;

    setContinuing(true);
    window.location.assign(confirmationUrl);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      window.sessionStorage.removeItem("auth-recovery-pending");
      window.localStorage.removeItem("auth-recovery-pending");
      window.localStorage.removeItem("auth-recovery-requested-at");
      setSuccess(true);
      toast.success("Password updated successfully!");
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const title = success
    ? "You're All Set"
    : ready
      ? "Set New Password"
      : showManualFallback
        ? "Recover Access Manually"
        : confirmationUrl
          ? "One more secure step"
          : "Verifying reset link";

  const description = success
    ? "Your password has been updated"
    : ready
      ? "Enter your new password below"
      : showManualFallback
        ? "Paste the reset link from your email to continue"
        : confirmationUrl
          ? "Tap below to open your one-time reset link safely"
          : "Checking your password reset session";

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4">
      <CosmicBackground />
      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center mb-8">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse scale-125" />
            <img src={stellaraAppIcon} alt="Stellara" className="relative w-24 h-24 object-contain rounded-xl" />
          </div>
          <h1 className="font-display text-3xl font-bold bg-gradient-golden bg-clip-text text-transparent">
            {title}
          </h1>
          <p className="text-muted-foreground mt-2">{description}</p>
        </div>

        {success ? (
          <div className="glass-card glow-border p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-muted-foreground">Redirecting you back...</p>
          </div>
        ) : confirmationUrl && !ready ? (
          <div className="glass-card glow-border p-6 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Some inbox apps pre-open password reset links and accidentally expire them. This extra step protects your link until you tap it.
            </p>
            <Button
              type="button"
              onClick={handleContinueToSecureReset}
              disabled={continuing}
              className="w-full h-12 text-base font-semibold"
              style={{ background: "var(--gradient-aurora)" }}
            >
              {continuing ? (
                <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <>
                  Continue to Reset Password
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        ) : !ready || verifyingLink ? (
          <div className="glass-card glow-border p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Verifying your reset link...</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="glass-card glow-border p-6 space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-muted/50 border-border"
                required
                minLength={6}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 bg-muted/50 border-border"
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-semibold"
              style={{ background: "var(--gradient-aurora)" }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <>
                  Update Password
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPassword;
