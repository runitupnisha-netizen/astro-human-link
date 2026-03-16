import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import CosmicBackground from "@/components/CosmicBackground";
import alignedLogo from "@/assets/aligned-hero-logo.png";
import { motion } from "framer-motion";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      toast.error("Invalid or expired reset link");
      navigate("/auth");
    }
  }, [navigate]);

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
      setSuccess(true);
      toast.success("Password updated successfully!");
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
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
            <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl animate-pulse scale-125" />
            <img src={alignedLogo} alt="Stellara" className="relative w-24 h-24 object-contain mix-blend-screen" />
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
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" />
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