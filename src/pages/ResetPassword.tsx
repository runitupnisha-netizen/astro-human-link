import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import CosmicBackground from "@/components/CosmicBackground";
import stellaraAppIcon from "@/assets/stellara-app-icon.png";
import { motion } from "framer-motion";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const [verifyingLink, setVerifyingLink] = useState(true);
  const [confirmationUrl, setConfirmationUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let recovered = false;
    let failureTimer: number | undefined;

    const params = new URLSearchParams(window.location.search);
    const encodedConfirmationUrl = params.get("confirmation_url");
    const safeConfirmationUrl = encodedConfirmationUrl
      ? decodeURIComponent(encodedConfirmationUrl)
      : null;

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

    const hash = window.location.hash;
    const hasRecoveryHash = hash.includes("type=recovery") || hash.includes("access_token");

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
        setVerifyingLink(false);
        return;
      }

      if (safeConfirmationUrl) {
        setVerifyingLink(false);
        return;
      }

      if (hasRecoveryHash) {
        setVerifyingLink(true);
      }

      failureTimer = window.setTimeout(() => {
        if (!recovered) {
          window.sessionStorage.removeItem("auth-recovery-pending");
          setVerifyingLink(false);
          toast.error("Invalid or expired reset link. Please request a new one.");
          navigate("/auth", { replace: true });
        }
      }, 2000);
    });

    return () => {
      subscription.subscription.unsubscribe();
      if (failureTimer) {
        window.clearTimeout(failureTimer);
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
    : confirmationUrl
      ? "One more secure step"
      : ready
        ? "Set New Password"
        : "Verifying reset link";

  const description = success
    ? "Your password has been updated"
    : confirmationUrl
      ? "Tap below to open your one-time reset link safely"
      : ready
        ? "Enter your new password below"
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
