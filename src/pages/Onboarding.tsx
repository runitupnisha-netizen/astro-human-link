import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, MapPin, Calendar, Clock, Loader2, Star, Zap, Dna } from "lucide-react";
import { toast } from "sonner";
import CosmicBackground from "@/components/CosmicBackground";
import { motion, AnimatePresence } from "framer-motion";

type CosmicProfile = {
  sun_sign: string;
  moon_sign: string;
  rising_sign: string;
  astro_summary: string;
  human_design_type: string;
  human_design_strategy: string;
  human_design_authority: string;
  human_design_profile: string;
  human_design_summary: string;
  gene_keys_life_purpose: string;
  gene_keys_evolution: string;
  gene_keys_radiance: string;
  gene_keys_summary: string;
  compatibility_tags: string[];
};

const Onboarding = () => {
  const [step, setStep] = useState<"input" | "generating" | "reveal">("input");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [profile, setProfile] = useState<CosmicProfile | null>(null);
  const [revealSection, setRevealSection] = useState(0);
  const navigate = useNavigate();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep("generating");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in first");
        navigate("/auth");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cosmic-profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ birthDate, birthTime, birthPlace }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to generate profile");
      }

      const data = await response.json();
      setProfile(data.profile);
      setStep("reveal");
      setRevealSection(0);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate your cosmic profile");
      setStep("input");
    }
  };

  const handleFinish = () => {
    toast.success("Your cosmic blueprint is complete! ✨");
    navigate("/profile");
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 pt-20 pb-10">
      <CosmicBackground />

      <div className="w-full max-w-2xl relative z-10">
        <AnimatePresence mode="wait">
          {/* STEP 1: Birth Data Input */}
          {step === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: "var(--gradient-aurora)" }}>
                  <Sparkles className="w-8 h-8 text-background" />
                </div>
                <h1 className="text-3xl font-bold text-foreground">Unlock Your Cosmic Blueprint</h1>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                  Enter your birth details and our AI will decode your astrology, Human Design, and Gene Keys
                </p>
              </div>

              <form onSubmit={handleGenerate} className="space-y-5 bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Birth Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="pl-10 bg-muted/50 border-border"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Birth Time</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={birthTime}
                      onChange={(e) => setBirthTime(e.target.value)}
                      className="pl-10 bg-muted/50 border-border"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Birth Place</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="e.g. Los Angeles, California"
                      value={birthPlace}
                      onChange={(e) => setBirthPlace(e.target.value)}
                      className="pl-10 bg-muted/50 border-border"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  style={{ background: "var(--gradient-aurora)" }}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate My Cosmic Blueprint
                </Button>
              </form>
            </motion.div>
          )}

          {/* STEP 2: Generating Animation */}
          {step === "generating" && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-20"
            >
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                <div className="absolute inset-2 rounded-full border-2 border-accent/40 animate-ping" style={{ animationDelay: "0.5s" }} />
                <div className="absolute inset-4 rounded-full border-2 border-primary/50 animate-ping" style={{ animationDelay: "1s" }} />
                <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: "var(--gradient-aurora)" }}>
                  <Loader2 className="w-10 h-10 text-background animate-spin" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Reading the Stars...</h2>
              <p className="text-muted-foreground">Channeling your cosmic blueprint from the universe</p>
            </motion.div>
          )}

          {/* STEP 3: Profile Reveal */}
          {step === "reveal" && profile && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-foreground">Your Cosmic Blueprint</h1>
                <p className="text-muted-foreground mt-1">Born {birthDate} at {birthTime} in {birthPlace}</p>
              </div>

              {/* Astrology Section */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Star className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Astrology</h2>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Sun", value: profile.sun_sign },
                    { label: "Moon", value: profile.moon_sign },
                    { label: "Rising", value: profile.rising_sign },
                  ].map((item) => (
                    <div key={item.label} className="bg-muted/50 rounded-xl p-3 text-center">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-semibold text-foreground mt-1">{item.value}</p>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">{profile.astro_summary}</p>
              </motion.div>

              {/* Human Design Section */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-accent" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Human Design</h2>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: "Type", value: profile.human_design_type },
                    { label: "Strategy", value: profile.human_design_strategy },
                    { label: "Authority", value: profile.human_design_authority },
                    { label: "Profile", value: profile.human_design_profile },
                  ].map((item) => (
                    <div key={item.label} className="bg-muted/50 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-semibold text-foreground mt-1">{item.value}</p>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">{profile.human_design_summary}</p>
              </motion.div>

              {/* Gene Keys Section */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-secondary/40 flex items-center justify-center">
                    <Dna className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Gene Keys</h2>
                </div>

                <div className="space-y-3 mb-4">
                  {[
                    { label: "Life Purpose", value: profile.gene_keys_life_purpose },
                    { label: "Evolution", value: profile.gene_keys_evolution },
                    { label: "Radiance", value: profile.gene_keys_radiance },
                  ].map((item) => (
                    <div key={item.label} className="bg-muted/50 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-semibold text-foreground mt-1">{item.value}</p>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">{profile.gene_keys_summary}</p>
              </motion.div>

              {/* Compatibility Tags */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6"
              >
                <h3 className="text-lg font-bold text-foreground mb-3">Your Cosmic Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.compatibility_tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Continue Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
              >
                <Button
                  onClick={handleFinish}
                  className="w-full h-12 text-base font-semibold"
                  style={{ background: "var(--gradient-aurora)" }}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Continue to Discover Matches
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Onboarding;
