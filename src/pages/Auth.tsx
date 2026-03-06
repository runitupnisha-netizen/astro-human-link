import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Mail, Lock, User, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import CosmicBackground from "@/components/CosmicBackground";
import alignedLogo from "@/assets/aligned-hero-logo.png";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back, cosmic soul ✨");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        toast.success("Check your email to verify your account 🌟");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4">
      <CosmicBackground />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
           <div className="relative w-56 h-56 mx-auto mb-2">
             <div className="absolute inset-0 bg-gradient-aurora rounded-full blur-2xl animate-pulse scale-110 opacity-30" />
             <img src={alignedLogo} alt="Aligned" className="relative w-56 h-56 object-contain mix-blend-lighten drop-shadow-[0_0_25px_hsl(260_60%_65%/0.5)]" />
           </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            {isLogin ? "Welcome Back" : "Begin Your Journey"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isLogin ? "Your cosmic connections await" : "Discover your soul's blueprint"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10 bg-muted/50 border-border"
                required={!isLogin}
              />
            </div>
          )}

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

          <div className="relative">
            <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 bg-muted/50 border-border"
              required
              minLength={6}
            />
          </div>

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
                , including that AI-generated content is for entertainment only and Aligned is not responsible for meetups or shared information.
              </label>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || (!isLogin && !agreedToTerms)}
            className="w-full h-12 text-base font-semibold"
            style={{ background: "var(--gradient-aurora)" }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
            ) : (
              <>
                {isLogin ? "Enter the Cosmos" : "Create Your Blueprint"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              {isLogin ? "New soul? Create an account" : "Already have an account? Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;
