import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Mail, Lock, User, ArrowRight, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import Footer from "@/components/Footer";
import CosmicBackground from "@/components/CosmicBackground";
import stellaraAppIcon from "@/assets/stellara-app-icon.png";
import soulConnection from "@/assets/soul-connection.jpg";
import stellaraHeroLogo from "@/assets/stellara-hero-logo.png";
import { motion } from "framer-motion";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSocialLogin = async (provider: "google" | "apple") => {
    setSocialLoading(provider);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || `Failed to sign in with ${provider}`);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back ✨");
        navigate("/");
      } else {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, username: username.trim() || undefined } },
        });
        if (!error && data.user && username.trim()) {
          await supabase.from("profiles").update({ username: username.trim() }).eq("user_id", data.user.id);
        }
        if (error) throw error;
        toast.success("Almost there — check your email to verify ✨");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/?reset=1`,
      });
      if (error) throw error;
      toast.success("Password reset link sent! Check your inbox 📧");
      setShowForgotPassword(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col">
      {/* Soul connection hero background */}
      <div className="absolute inset-0 z-0">
        <img src={soulConnection} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      </div>
      <CosmicBackground />

      {/* Silhouette overlay */}
      <div className="absolute inset-0 z-[1] flex items-start justify-center pt-16 md:pt-0 md:items-center pointer-events-none select-none">
        <motion.img
          src={stellaraHeroLogo}
          alt=""
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 0.18, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="w-[90vw] md:w-[55vw] lg:w-[45vw] max-w-[700px] object-contain mix-blend-screen"
        />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          className="w-full max-w-md relative z-10"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Logo */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute -inset-8 bg-primary/40 rounded-full blur-3xl animate-pulse" />
              <div className="absolute -inset-5 bg-primary/25 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.3s' }} />
              <div className="absolute -inset-3 bg-foreground/15 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0.6s' }} />
              <img src={stellaraAppIcon} alt="Stellara" className="relative w-20 h-20 object-contain rounded-xl shadow-2xl shadow-primary/50 ring-1 ring-primary/20" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold bg-gradient-golden bg-clip-text text-transparent">
              {showForgotPassword ? "Reset password" : isLogin ? "Welcome back" : "Find your alignment"}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              {showForgotPassword
                ? "We'll send a reset link to your inbox"
                : isLogin
                ? "Your matches are waiting"
                : "Real connections, written in the stars"}
            </p>
          </motion.div>

          {/* Forgot Password Form */}
          {showForgotPassword ? (
            <motion.form
              onSubmit={handleForgotPassword}
              className="glass-card glow-border p-6 space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-muted/50 border-border"
                  required
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
                    Send Reset Link
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1 mx-auto"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to sign in
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.div
              className="glass-card glow-border p-6 space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {/* Email Auth Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <motion.div
                    className="space-y-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Full Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10 bg-muted/50 border-border"
                        required={!isLogin}
                        maxLength={40}
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-muted-foreground text-sm font-medium">@</span>
                      <Input
                        placeholder="Username (optional)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30))}
                        className="pl-10 bg-muted/50 border-border"
                      />
                    </div>
                  </motion.div>
                )}

                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-muted/50 border-border"
                    required
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-11 h-12 bg-muted/50 border-border"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {isLogin && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {!isLogin && (
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="terms"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                      className="mt-0.5"
                    />
                    <label htmlFor="terms" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                      I am 18+ and agree to the{" "}
                      <Link to="/disclaimer" className="text-primary hover:underline" target="_blank">
                        Disclaimer &amp; Terms of Use
                      </Link>
                      , including that AI-generated content is for entertainment only and Stellara is not responsible for meetups or shared information.
                    </label>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || (!isLogin && !agreedToTerms)}
                  className="w-full h-13 min-h-[3.25rem] text-base font-semibold rounded-xl btn-shimmer"
                  style={{ background: "var(--gradient-aurora)" }}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  ) : (
                    <>
                      {isLogin ? "Sign in" : "Create account"}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              {/* Social Login Divider */}
              <div className="flex items-center gap-3 my-2">
                <Separator className="flex-1 bg-border/50" />
                <span className="text-[11px] text-muted-foreground uppercase tracking-[0.18em]">or continue with</span>
                <Separator className="flex-1 bg-border/50" />
              </div>

              {/* Social Login Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialLogin("google")}
                  disabled={!!socialLoading}
                  className="h-11 bg-muted/30 border-border/50 hover:bg-muted/60 transition-all"
                >
                  {socialLoading === "google" ? (
                    <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  Google
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialLogin("apple")}
                  disabled={!!socialLoading}
                  className="h-11 bg-muted/30 border-border/50 hover:bg-muted/60 transition-all"
                >
                  {socialLoading === "apple" ? (
                    <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                  )}
                  Apple
                </Button>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isLogin ? (
                    <>New to Stellara? <span className="text-primary font-semibold">Create an account</span></>
                  ) : (
                    <>Already have an account? <span className="text-primary font-semibold">Sign in</span></>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default Auth;
