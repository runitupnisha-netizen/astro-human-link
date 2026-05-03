import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Mail, Lock, User, ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Footer from "@/components/Footer";
import CosmicBackground from "@/components/CosmicBackground";
import PhoneAuthForm from "@/components/PhoneAuthForm";

/**
 * Phone (SMS) sign-in is disabled for the App Store launch while Twilio A2P
 * 10DLC verification is pending. Flip this to `true` once the campaign is
 * approved — no other changes needed; the toggle and form will reappear.
 */
const PHONE_AUTH_ENABLED = false;
import stellaraAppIcon from "@/assets/stellara-app-icon.png";
import soulConnection from "@/assets/soul-connection.jpg";
import stellaraHeroLogo from "@/assets/stellara-hero-logo.png";
import { motion } from "framer-motion";
import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, { message: "Email is required" })
  .email({ message: "Please enter a valid email address" })
  .max(255, { message: "Email is too long" });

const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(128, { message: "Password is too long" })
  .regex(/[A-Za-z]/, { message: "Password must include a letter" })
  .regex(/[0-9]/, { message: "Password must include a number" });

const fullNameSchema = z
  .string()
  .trim()
  .min(1, { message: "Full name is required" })
  .max(40, { message: "Full name must be 40 characters or fewer" });

const usernameSchema = z
  .string()
  .trim()
  .max(30, { message: "Username must be 30 characters or fewer" })
  .regex(/^[a-zA-Z0-9_]*$/, { message: "Username can only use letters, numbers, and underscores" });

const friendlyAuthError = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match. Try again or reset your password.";
  if (m.includes("email not confirmed")) return "Please verify your email first. Check your inbox for the confirmation link.";
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "This email already has a Stellara account. Sign in instead. ✦";
  }
  if (m.includes("rate") && m.includes("limit")) return "Too many attempts — please wait a moment and try again.";
  if (m.includes("pwned") || m.includes("compromised")) return "This password has been found in data breaches. Please choose a stronger one.";
  if (m.includes("network") || m.includes("fetch") || m.includes("failed to fetch")) return "Connection issue. Please try again. ✦";
  if (m.includes("password") && (m.includes("short") || m.includes("8 characters") || m.includes("weak"))) return "Password must be at least 8 characters.";
  if (m.includes("invalid") && m.includes("email")) return "Please enter a valid email address.";
  return message;
};

/** Map a friendly error message to the input field it should appear under. */
const mapErrorToField = (friendly: string): "email" | "password" | "form" => {
  const m = friendly.toLowerCase();
  if (m.includes("email") || m.includes("account")) return "email";
  if (m.includes("password")) return "password";
  return "form";
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [authMode, setAuthMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
    setFieldErrors({});

    // Validate inputs
    const errors: Record<string, string> = {};
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) errors.email = emailResult.error.issues[0].message;

    if (isLogin) {
      if (!password) errors.password = "Password is required";
    } else {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) errors.password = passwordResult.error.issues[0].message;
      const nameResult = fullNameSchema.safeParse(fullName);
      if (!nameResult.success) errors.fullName = nameResult.error.issues[0].message;
      if (username.trim()) {
        const userResult = usernameSchema.safeParse(username);
        if (!userResult.success) errors.username = userResult.error.issues[0].message;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          // If login failed, check whether this email was created via Google.
          // If so, route the user to Google OAuth instead of the password flow.
          const isCredErr = (error.message || "").toLowerCase().includes("invalid login");
          if (isCredErr) {
            try {
              const { data: methodData } = await supabase.functions.invoke(
                "check-auth-method",
                { body: { email: email.trim() } },
              );
              const providers: string[] = methodData?.providers ?? [];
              const hasPassword: boolean = !!methodData?.has_password;
              if (providers.includes("google") && !hasPassword) {
                toast.info("This email is linked to Google. Redirecting…", {
                  description: "Continue with Google to sign in.",
                });
                await handleSocialLogin("google");
                return;
              }
              if (providers.includes("apple") && !hasPassword) {
                toast.info("This email is linked to Apple. Redirecting…", {
                  description: "Continue with Apple to sign in.",
                });
                await handleSocialLogin("apple");
                return;
              }
            } catch {
              // fall through to normal error handling
            }
          }
          throw error;
        }
        toast.success("Welcome back ✨");
        navigate("/growth", { replace: true });
      } else {
        const { error, data } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName.trim(), username: username.trim() || undefined },
          },
        });
        if (error) throw error;
        if (!error && data.user && username.trim()) {
          await supabase.from("profiles").update({ username: username.trim() }).eq("user_id", data.user.id);
        }
        // If session is null, email confirmation is required
        if (!data.session) {
          toast.success(`Check ${email.trim()} to confirm your account ✨`, {
            description: "We sent a verification link. Click it to activate your account, then sign in.",
            duration: 8000,
          });
          // Switch to login view so user can sign in after confirming
          setIsLogin(true);
          setPassword("");
        } else {
          // Auto-confirm enabled — user is signed in directly
          toast.success("Welcome to Stellara ✨");
          navigate("/growth", { replace: true });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      const friendly = friendlyAuthError(message);
      const field = mapErrorToField(friendly);
      // Inline error under the relevant field — never a browser alert/toast-only path.
      if (field === "form") {
        toast.error(friendly);
      } else {
        setFieldErrors((prev) => ({ ...prev, [field]: friendly }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      const msg = result.error.issues[0].message;
      setFieldErrors({ email: msg });
      toast.error(msg);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      // Always show success even if email doesn't exist (prevents user enumeration)
      setResetSent(true);
      toast.success("If an account exists, a reset link is on its way 📧", {
        description: "Check your inbox and spam folder. Links expire in 1 hour.",
        duration: 7000,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send reset email";
      // For rate limits, surface the message; otherwise still show generic success
      if (message.toLowerCase().includes("rate")) {
        toast.error(friendlyAuthError(message));
      } else {
        setResetSent(true);
        toast.success("If an account exists, a reset link is on its way 📧");
      }
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
            resetSent ? (
              <motion.div
                className="glass-card glow-border p-6 space-y-4 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold text-foreground">Check your inbox</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    If an account exists for <span className="font-medium text-foreground">{email}</span>, we've sent a password reset link.
                    It will expire in 1 hour.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Don't see it? Check your spam folder or wait a minute before requesting another.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setResetSent(false);
                    setShowForgotPassword(false);
                  }}
                  className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1 mx-auto"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to sign in
                </button>
              </motion.div>
            ) : (
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: "" }));
                  }}
                  className={`pl-10 bg-muted/50 border-border ${fieldErrors.email ? "border-destructive" : ""}`}
                  required
                  autoComplete="email"
                  aria-invalid={!!fieldErrors.email}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-destructive mt-1.5 ml-1">{fieldErrors.email}</p>
                )}
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
                  onClick={() => {
                    setShowForgotPassword(false);
                    setFieldErrors({});
                  }}
                  className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1 mx-auto"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to sign in
                </button>
              </div>
            </motion.form>
            )
          ) : (
            <motion.div
              className="glass-card glow-border p-6 space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {/* Email/Phone toggle (Phone hidden until Twilio A2P approval) */}
              {PHONE_AUTH_ENABLED && (
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted/40 border border-border/40">
                  <button
                    type="button"
                    onClick={() => setAuthMode("email")}
                    className={`h-9 rounded-lg text-sm font-medium transition-all ${
                      authMode === "email"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode("phone")}
                    className={`h-9 rounded-lg text-sm font-medium transition-all ${
                      authMode === "phone"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Phone
                  </button>
                </div>
              )}

              {PHONE_AUTH_ENABLED && authMode === "phone" ? (
                <PhoneAuthForm />
              ) : (
              <>
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
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (fieldErrors.fullName) setFieldErrors((p) => ({ ...p, fullName: "" }));
                        }}
                        className={`pl-10 bg-muted/50 border-border ${fieldErrors.fullName ? "border-destructive" : ""}`}
                        required={!isLogin}
                        maxLength={40}
                        autoComplete="name"
                        aria-invalid={!!fieldErrors.fullName}
                      />
                      {fieldErrors.fullName && (
                        <p className="text-xs text-destructive mt-1.5 ml-1">{fieldErrors.fullName}</p>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-muted-foreground text-sm font-medium">@</span>
                      <Input
                        placeholder="Username (optional)"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30));
                          if (fieldErrors.username) setFieldErrors((p) => ({ ...p, username: "" }));
                        }}
                        className={`pl-10 bg-muted/50 border-border ${fieldErrors.username ? "border-destructive" : ""}`}
                        autoComplete="username"
                        aria-invalid={!!fieldErrors.username}
                      />
                      {fieldErrors.username && (
                        <p className="text-xs text-destructive mt-1.5 ml-1">{fieldErrors.username}</p>
                      )}
                    </div>
                  </motion.div>
                )}

                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: "" }));
                    }}
                    className={`pl-10 h-12 bg-muted/50 border-border ${fieldErrors.email ? "border-destructive" : ""}`}
                    required
                    autoComplete="email"
                    aria-invalid={!!fieldErrors.email}
                  />
                  {fieldErrors.email && (
                    <p className="text-xs text-destructive mt-1.5 ml-1">{fieldErrors.email}</p>
                  )}
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: "" }));
                    }}
                    className={`pl-10 pr-11 h-12 bg-muted/50 border-border ${fieldErrors.password ? "border-destructive" : ""}`}
                    required
                    minLength={isLogin ? 1 : 8}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    aria-invalid={!!fieldErrors.password}
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
                {fieldErrors.password && (
                  <p className="text-xs text-destructive -mt-2 ml-1">{fieldErrors.password}</p>
                )}
                {!isLogin && !fieldErrors.password && (
                  <p className="text-xs text-muted-foreground -mt-2 ml-1">
                    At least 8 characters with a letter and a number
                  </p>
                )}

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
              </>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default Auth;
