import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ArrowRight, Check } from "lucide-react";
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

const isGenuineRecoveryLink = () => {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get("type") === "recovery" && !!params.get("access_token");
};

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isGenuineRecoveryLink()) {
      navigate("/sign-in", { replace: true });
    }
  }, [navigate]);

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
      setSuccess(true);
      toast.success("Password updated! Welcome back ✨", {
        description: "Redirecting you to the app...",
      });
      window.history.replaceState(null, document.title, "/growth");
      setTimeout(() => navigate("/growth", { replace: true }), 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reset password";
      const m = message.toLowerCase();
      if (m.includes("same") && m.includes("password")) {
        toast.error("Please choose a password different from your current one.");
      } else if (m.includes("pwned") || m.includes("compromised")) {
        toast.error("This password has been found in data breaches. Please choose a stronger one.");
      } else if (m.includes("session") || m.includes("expired") || m.includes("token")) {
        toast.error("Your reset link has expired. Please request a new one.");
        setTimeout(() => navigate("/sign-in", { replace: true }), 2000);
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

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
            {success ? "You're All Set" : "Set New Password"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {success ? "Your password has been updated" : "Enter your new password below"}
          </p>
        </div>

        {success ? (
          <div className="glass-card glow-border p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground">Redirecting you back...</p>
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
        )}
      </motion.div>
    </div>
  );
};

export default ResetPassword;
