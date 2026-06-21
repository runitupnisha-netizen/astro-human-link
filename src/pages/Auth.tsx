import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { NATIVE_AUTH_CALLBACK_URL } from "@/lib/authRedirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Mail, Lock, User, ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle2, Phone, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Footer from "@/components/Footer";
import CosmicBackground from "@/components/CosmicBackground";
import PhoneAuthForm from "@/components/PhoneAuthForm";

/** Phone (SMS) sign-in via Twilio. Disabled until A2P campaign is approved. */
const PHONE_AUTH_ENABLED = false;

/**
 * Social sign-in (Google + Apple) is HIDDEN pending Stellara's own
 * developer credentials. The managed Lovable Cloud OAuth flow currently
 * presents "Sign in with Lovable Apps" branding on the Apple consent
 * sheet and uses Lovable's Google OAuth client — neither is acceptable
 * for production. Flip this flag back to `true` once BYOC is configured
 * in Lovable Cloud → Auth Settings with:
 *   • Stellara Google Cloud OAuth Client ID + Secret
 *   • Stellara Apple Services ID + Team ID + Key ID + .p8 private key
 * The button JSX and handler below are intentionally left in place for
 * a one-line re-enable.
 */
const SOCIAL_AUTH_ENABLED = true;
import stellaraAppIcon from "@/assets/stellara-app-icon.png";
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

const EULA_VERSION = "2026-05-20";

/** Strict 18+ check from a yyyy-mm-dd string. Apple UGC requirement. */
const dobSchema = z
  .string()
  .min(1, { message: "Date of birth is required" })
  .refine((s) => /^\d{4}-\d{2}-\d{2}$/.test(s), { message: "Use the date picker" })
  .refine(
    (s) => {
      const dob = new Date(s + "T00:00:00");
      if (Number.isNaN(dob.getTime())) return false;
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      return age >= 18;
    },
    { message: "You must be 18 or older to use Stellara" },
  );

const PRODUCTION_ORIGIN = "https://stellaraapp.net";
/**
 * OAuth redirect target. On native iOS (Capacitor) and the Lovable
 * preview, `window.location.origin` is NOT `stellaraapp.net`, so a
 * hardcoded production URL breaks the return-to-app step (Apple
 * reviewer reported "nothing happened" when tapping Sign in with
 * Apple/Google). Always use the current origin so the OAuth provider
 * can hand the session back to whatever shell launched the flow.
 */
const AUTH_CALLBACK_URL =
  typeof window !== "undefined"
    ? `${Capacitor.isNativePlatform() ? PRODUCTION_ORIGIN : window.location.origin}/auth/callback`
    : `${PRODUCTION_ORIGIN}/auth/callback`;

const getNativeOAuthUrl = (provider: "google" | "apple") => {
  const state = crypto.getRandomValues(new Uint8Array(16))
    .reduce((value, byte) => value + byte.toString(16).padStart(2, "0"), "");
  sessionStorage.setItem("oauth-native-pending", state);

  const params = new URLSearchParams({
    provider,
    redirect_uri: NATIVE_AUTH_CALLBACK_URL,
    state,
  });
  return `${PRODUCTION_ORIGIN}/~oauth/initiate?${params.toString()}`;
};

const friendlyAuthError = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) {
    return "Hmm, that didn't work. Did you sign up with Google or Apple? Try those buttons below instead. Or reset your password.";
  }
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
  const [dob, setDob] = useState(""); // yyyy-mm-dd, signup only
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [magicLinkMode, setMagicLinkMode] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const handleSocialLogin = async (provider: "google" | "apple") => {
    setSocialLoading(provider);
    try {
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: getNativeOAuthUrl(provider), presentationStyle: "popover" });
        return;
      }

      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: AUTH_CALLBACK_URL,
      });
      if (result.redirected) return; // browser is navigating to provider
      if (result.error) {
        const message = result.error instanceof Error ? result.error.message : String(result.error);
        const lower = message.toLowerCase();
        if (lower.includes("cancel") || lower.includes("closed") || lower.includes("popup")) {
          toast.info("Sign-in cancelled.");
        } else {
          toast.error(friendlyAuthError(message));
        }
        return;
      }
      // Tokens received and session set
      toast.success(`Welcome ✨`);
      navigate("/", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-in failed";
      toast.error(friendlyAuthError(message));
    } finally {
      setSocialLoading(null);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
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
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: AUTH_CALLBACK_URL },
      });
      if (error) throw error;
      setMagicLinkSent(true);
      toast.success("Magic link sent ✨", {
        description: "Check your inbox and click the link to sign in instantly.",
        duration: 7000,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send magic link";
      toast.error(friendlyAuthError(message));
    } finally {
      setLoading(false);
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
      const dobResult = dobSchema.safeParse(dob);
      if (!dobResult.success) errors.dob = dobResult.error.issues[0].message;
      if (!agreedToTerms) errors.terms = "You must accept the Terms to continue";
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
          // Auto-redirect to OAuth provider is gated on SOCIAL_AUTH_ENABLED
          // so users aren't sent to a Lovable-branded consent screen.
          if (isCredErr && SOCIAL_AUTH_ENABLED) {
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
        navigate("/", { replace: true });
      } else {
        const { error, data } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${PRODUCTION_ORIGIN}/`,
            data: { full_name: fullName.trim(), username: username.trim() || undefined },
          },
        });
        if (error) throw error;
        if (!error && data.user && username.trim()) {
          await supabase.from("profiles").update({ username: username.trim() }).eq("user_id", data.user.id);
        }
        // Persist DOB + EULA acceptance (Apple UGC compliance).
        if (!error && data.user) {
          await supabase
            .from("profiles")
            .update({
              date_of_birth: dob,
              eula_accepted_at: new Date().toISOString(),
              eula_version: EULA_VERSION,
            } as never)
            .eq("user_id", data.user.id);
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
          navigate("/", { replace: true });
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
        redirectTo: `${PRODUCTION_ORIGIN}/reset-password`,
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
      <CosmicBackground />

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
              {showForgotPassword ? "Reset password" : isLogin ? "Welcome back" : "Begin your self-discovery"}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              {showForgotPassword
                ? "We'll send a reset link to your inbox"
                : "Self-discovery first. Connection follows."}
            </p>
          </motion.div>

          {/* Forgot Password Form */}
          {magicLinkMode ? (
            magicLinkSent ? (
              <motion.div
                className="glass-card glow-border p-6 space-y-4 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold text-foreground">Magic link sent</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We sent a sign-in link to <span className="font-medium text-foreground">{email}</span>.
                    Click it from this device to enter Stellara instantly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMagicLinkSent(false);
                    setMagicLinkMode(false);
                  }}
                  className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1 mx-auto"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to sign in
                </button>
              </motion.div>
            ) : (
              <motion.form
                onSubmit={handleMagicLink}
                className="glass-card glow-border p-6 space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <p className="text-sm text-muted-foreground text-center">
                  Enter your email and we'll send a one-click sign-in link.
                </p>
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
                      <Sparkles className="w-5 h-5 mr-2" />
                      Send Magic Link
                    </>
                  )}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMagicLinkMode(false);
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
          ) : showForgotPassword ? (
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
              {PHONE_AUTH_ENABLED && authMode === "phone" ? (
                <div className="space-y-4">
                  <PhoneAuthForm />
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setAuthMode("email")}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Back to email
                    </button>
                  </div>
                </div>
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

                {!isLogin && (
                  <div className="space-y-1">
                    <Input
                      type="date"
                      value={dob}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => {
                        setDob(e.target.value);
                        if (fieldErrors.dob) setFieldErrors((p) => ({ ...p, dob: "" }));
                      }}
                      className={`h-12 bg-muted/50 border-border ${fieldErrors.dob ? "border-destructive" : ""}`}
                      aria-label="Date of birth"
                      aria-invalid={!!fieldErrors.dob}
                    />
                    {fieldErrors.dob ? (
                      <p className="text-xs text-destructive ml-1">{fieldErrors.dob}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground ml-1">
                        Date of birth — Stellara is 18+ only.
                      </p>
                    )}
                  </div>
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
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    name="stellara-email-no-autofill"
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
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    name="stellara-password-no-autofill"
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
                      , including that AI-generated content is for entertainment only and Stellara is not responsible for interactions or shared information.
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

              {/* Magic Link option */}
              {isLogin && (
                <>
                  <div className="flex items-center gap-3 my-2">
                    <Separator className="flex-1 bg-border/50" />
                    <span className="text-[11px] text-muted-foreground uppercase tracking-[0.18em]">or</span>
                    <Separator className="flex-1 bg-border/50" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setMagicLinkMode(true);
                      setFieldErrors({});
                    }}
                    className="w-full h-11 bg-muted/30 border-border/50 hover:bg-muted/60 transition-all"
                  >
                    <Sparkles className="w-4 h-4 mr-2 text-primary" />
                    Email me a magic link
                  </Button>
                </>
              )}

              {/*
                Social login (Google + Apple) — HIDDEN for launch.
                These buttons stay in the codebase so re-enabling is a single
                flag flip (SOCIAL_AUTH_ENABLED = true at the top of this file)
                once Stellara's own Google Cloud OAuth client and Apple
                Services ID are configured in Lovable Cloud → Auth Settings.
                Until then, the managed Lovable Cloud flow would render
                "Sign in with Lovable Apps" on the Apple consent sheet,
                which is unacceptable for production / App Review.
              */}
              {SOCIAL_AUTH_ENABLED && (
              <>
              <div className="flex items-center gap-3 my-2">
                <Separator className="flex-1 bg-border/50" />
                <span className="text-[11px] text-muted-foreground uppercase tracking-[0.18em]">or continue with</span>
                <Separator className="flex-1 bg-border/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialLogin("google")}
                  disabled={!!socialLoading}
                  className="h-11 bg-background hover:bg-muted text-foreground border-border"
                  aria-label="Sign in with Google"
                >
                  {socialLoading === "google" ? (
                    <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.46-1.7 4.28-5.5 4.28-3.3 0-6-2.74-6-6.12s2.7-6.12 6-6.12c1.88 0 3.14.8 3.86 1.48l2.63-2.54C16.83 3.6 14.66 2.6 12 2.6 6.86 2.6 2.7 6.76 2.7 11.9S6.86 21.2 12 21.2c6.93 0 9.16-4.86 9.16-8.42 0-.57-.06-1-.13-1.4H12z"/>
                      </svg>
                      Google
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialLogin("apple")}
                  disabled={!!socialLoading}
                  className="h-11 bg-black hover:bg-black/90 text-white border-black"
                  aria-label="Sign in with Apple"
                >
                  {socialLoading === "apple" ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M17.05 12.04c-.03-2.65 2.17-3.92 2.27-3.98-1.24-1.81-3.17-2.06-3.85-2.09-1.64-.17-3.2.96-4.04.96-.83 0-2.12-.94-3.49-.91-1.79.03-3.45 1.04-4.37 2.64-1.87 3.24-.48 8.04 1.34 10.68.89 1.29 1.95 2.74 3.34 2.69 1.34-.05 1.85-.87 3.47-.87 1.62 0 2.07.87 3.49.84 1.44-.03 2.36-1.31 3.24-2.61 1.02-1.5 1.44-2.95 1.46-3.03-.03-.01-2.8-1.07-2.86-4.32zM14.4 4.34c.73-.88 1.22-2.1 1.09-3.32-1.05.04-2.32.7-3.07 1.58-.67.78-1.26 2.02-1.1 3.22 1.17.09 2.36-.59 3.08-1.48z"/>
                      </svg>
                      Apple
                    </>
                  )}
                </Button>
              </div>
              </>
              )}

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
