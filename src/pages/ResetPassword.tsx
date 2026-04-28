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
import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(128, { message: "Password is too long" })
  .regex(/[A-Za-z]/, { message: "Password must include a letter" })
  .regex(/[0-9]/, { message: "Password must include a number" });

const getRecoveryTokensFromHash = () => {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);

  return {
    accessToken: hashParams.get("access_token"),
    refreshToken: hashParams.get("refresh_token"),
    tokenHash: queryParams.get("token_hash") || queryParams.get("token"),
    type: hashParams.get("type"),
  };
};

const hasGenuineRecoveryLink = () => {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);
  const hashHasRecoverySession =
    hashParams.get("type") === "recovery" &&
    !!hashParams.get("access_token") &&
    !!hashParams.get("refresh_token");
  const queryHasRecoveryToken =
    queryParams.get("type") === "recovery" &&
    (!!queryParams.get("token_hash") || !!queryParams.get("token"));

  return hashHasRecoverySession || queryHasRecoveryToken;
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
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", ""));

    const type = params.get("type");
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    const isGenuineRecovery =
      type === "recovery" &&
      !!accessToken &&
      accessToken.length > 20;

    if (!isGenuineRecovery) {
      window.localStorage.removeItem("auth-recovery-pending");
      window.sessionStorage.clear();
      window.history.replaceState(
        null,
        document.title,
        window.location.pathname
      );
      navigate("/", { replace: true });
      return;
    }

    window.localStorage.setItem("auth-recovery-pending", "true");

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setConfirmationUrl(null);
        setReady(true);
        setVerifyingLink(false);
      }
    });

    const initializeRecovery = async () => {
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error) {
          setReady(true);
          setVerifyingLink(false);
          return;
        }
      }

      setVerifyingLink(false);
      setShowManualFallback(true);
    };

    void initializeRecovery();

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleContinueToSecureReset = () => {
    if (!confirmationUrl) return;

    setContinuing(true);
    window.location.assign(confirmationUrl);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = passwordSchema.safeParse(password);
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
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
      toast.success("Password updated! Welcome back ✨", {
        description: "Redirecting you to the app...",
      });
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reset password";
      const m = message.toLowerCase();
      if (m.includes("same") && m.includes("password")) {
        toast.error("Please choose a password different from your current one.");
      } else if (m.includes("pwned") || m.includes("compromised")) {
        toast.error("This password has been found in data breaches. Please choose a stronger one.");
      } else if (m.includes("session") || m.includes("expired") || m.includes("token")) {
        toast.error("Your reset link has expired. Please request a new one.");
        setTimeout(() => navigate("/auth"), 2500);
      } else {
        toast.error(message);
      }
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
        ) : ready ? (
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
                minLength={8}
                autoComplete="new-password"
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
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <p className="text-xs text-muted-foreground -mt-1 ml-1">
              At least 8 characters with a letter and a number
            </p>
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
        ) : showManualFallback ? (
          <form onSubmit={handleManualRecover} className="glass-card glow-border p-6 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                We couldn't auto-verify the link. Open the reset email, copy the full
                <span className="font-semibold text-foreground"> "Reset Password" </span>
                link (right-click → Copy link), and paste it below.
              </p>
            </div>
            <div className="relative">
              <Link2 className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                type="url"
                placeholder="Paste reset link here…"
                value={manualLink}
                onChange={(e) => setManualLink(e.target.value)}
                className="pl-10 bg-muted/50 border-border"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={manualLoading}
              className="w-full h-12 text-base font-semibold"
              style={{ background: "var(--gradient-aurora)" }}
            >
              {manualLoading ? (
                <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <>
                  Verify & Continue
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
            <button
              type="button"
              onClick={() => navigate("/auth", { replace: true })}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Request a new reset link instead
            </button>
          </form>
        ) : confirmationUrl ? (
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
            <button
              type="button"
              onClick={() => setShowManualFallback(true)}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Link not working? Paste it manually
            </button>
          </div>
        ) : (
          <div className="glass-card glow-border p-8 text-center space-y-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Verifying your reset link...</p>
            <button
              type="button"
              onClick={() => setShowManualFallback(true)}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Taking too long? Paste your link manually
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPassword;
