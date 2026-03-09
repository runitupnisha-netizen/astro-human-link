import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MapPin, Calendar, Clock, Loader2, Star, Zap, Dna, Hash, Wine, Cigarette, Pill, Baby, ShieldCheck, ChevronRight, ChevronLeft, Heart, User, Plus, Info, X } from "lucide-react";
import { toast } from "sonner";
import CosmicBackground from "@/components/CosmicBackground";
import { motion, AnimatePresence } from "framer-motion";
import alignedLogo from "@/assets/aligned-hero-logo.png";
import { useAuth } from "@/hooks/useAuth";
import AvatarUpload from "@/components/AvatarUpload";

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
  life_path_number: number;
};

type LifestyleOption = {
  value: string;
  label: string;
  emoji: string;
};

const KIDS_OPTIONS: LifestyleOption[] = [
  { value: "want_kids", label: "Want kids", emoji: "👶" },
  { value: "have_kids", label: "Have kids", emoji: "👨‍👧" },
  { value: "open_to_kids", label: "Open to kids", emoji: "🤔" },
  { value: "dont_want_kids", label: "Don't want kids", emoji: "🚫" },
  { value: "not_sure", label: "Not sure yet", emoji: "🤷" },
  { value: "decline", label: "Prefer not to say", emoji: "🔒" },
];

const DRINKING_OPTIONS: LifestyleOption[] = [
  { value: "never", label: "Never", emoji: "🚫" },
  { value: "rarely", label: "Rarely", emoji: "🥂" },
  { value: "socially", label: "Socially", emoji: "🍷" },
  { value: "regularly", label: "Regularly", emoji: "🍺" },
  { value: "sober", label: "Sober", emoji: "💪" },
  { value: "decline", label: "Prefer not to say", emoji: "🔒" },
];

const SMOKING_OPTIONS: LifestyleOption[] = [
  { value: "never", label: "Never", emoji: "🚫" },
  { value: "occasionally", label: "Occasionally", emoji: "💨" },
  { value: "regularly", label: "Regularly", emoji: "🚬" },
  { value: "trying_to_quit", label: "Trying to quit", emoji: "🌱" },
  { value: "decline", label: "Prefer not to say", emoji: "🔒" },
];

const SUBSTANCES_OPTIONS: LifestyleOption[] = [
  { value: "never", label: "Never", emoji: "🚫" },
  { value: "occasionally", label: "Occasionally", emoji: "🍃" },
  { value: "plant_medicine", label: "Plant medicine only", emoji: "🌿" },
  { value: "microdosing", label: "Microdosing", emoji: "🔬" },
  { value: "open_minded", label: "Open-minded", emoji: "🧠" },
  { value: "decline", label: "Prefer not to say", emoji: "🔒" },
];

const INTEREST_CATEGORIES = {
  "🎵 Music": [
    "Ambient", "Binaural Beats", "Indie Folk", "Jazz", "R&B", "Hip-Hop",
    "Electronic", "Classical", "Reggae", "Afrobeats", "Latin", "K-Pop",
    "Rock", "Metal", "Country", "Lo-fi", "Soul", "Gospel", "World Music",
    "Punk", "Blues", "Funk", "Disco", "House", "Techno", "Drum & Bass",
    "Trap", "Pop", "Alternative", "Grunge", "Ska", "Bossa Nova", "Opera"
  ],
  "🎬 Movies & TV": [
    "Sci-Fi", "Documentary", "Art House", "Studio Ghibli", "Horror",
    "Comedy", "Drama", "Anime", "Thriller", "Romance", "Rom-Com", "Reality TV",
    "True Crime", "Fantasy", "Action", "Foreign Films", "Superhero",
    "Film Noir", "Westerns", "Musicals", "Biographical", "Psychological Thriller",
    "Satire", "Dystopian", "Noir", "Slasher", "Found Footage",
    "Period Drama", "Crime Drama", "Sitcoms", "K-Drama", "Stand-Up Comedy"
  ],
  "📚 Books & Learning": [
    "Self-Help", "Philosophy", "Poetry", "Fiction", "Non-Fiction",
    "Astrology Books", "Tarot", "Psychology", "History", "Biographies",
    "Science", "Spirituality", "Memoir", "Fantasy", "Sci-Fi",
    "Mystery & Thriller", "Romance", "Horror", "True Crime",
    "Business & Finance", "Health & Wellness", "Classic Literature",
    "Graphic Novels", "Young Adult", "Essays", "Mythology"
  ],
  "💪 Sports & Fitness": [
    "Yoga", "Swimming", "Martial Arts", "Running", "Weight Training",
    "Rock Climbing", "Surfing", "Hiking", "Dance", "Pilates",
    "Cycling", "Basketball", "Tennis", "Skateboarding", "CrossFit"
  ],
  "🏔️ Health & Adventure": [
    "Plant-based", "Breathwork", "Cold Therapy", "Meditation",
    "Skydiving", "Cliff Diving", "Bungee Jumping", "Travel",
    "Camping", "Scuba Diving", "Paragliding", "Fasting", "Herbalism"
  ],
  "✨ Thought Systems": [
    "Non-dualism", "Jungian Psychology", "Buddhism", "Christianity", "Judaism",
    "Islam", "Hinduism", "Sufism", "Stoicism", "Astrology", "Human Design",
    "Gene Keys", "Kabbalah", "Taoism", "Manifestation", "Quantum Physics",
    "Sacred Geometry", "Shamanism", "Hermeticism", "Gnosticism",
    "Existentialism", "Zen", "Advaita Vedanta", "Mysticism",
    "Indigenous Wisdom", "Paganism", "Animism"
  ],
  "🎨 Creative": [
    "Photography", "Painting", "Writing", "Music Production",
    "Pottery", "Fashion", "Graphic Design", "Film Making",
    "Cooking", "Gardening", "DIY", "Tattoo Art", "Jewelry Making"
  ],
  "💻 Tech & Gaming": [
    "Coding", "AI/ML", "Crypto", "Gaming", "VR/AR",
    "Podcasting", "Content Creation", "Startups", "Web3"
  ],
  "🐾 Pets & Animals": [
    "Dogs", "Cats", "Horses", "Birds", "Reptiles",
    "Marine Life", "Wildlife Conservation", "Animal Rescue",
    "Veterinary", "Pet Training", "Exotic Pets"
  ],
  "🌍 Social Causes": [
    "Climate Action", "Racial Justice", "Gender Equality", "Mental Health Advocacy",
    "Homelessness", "Education Access", "LGBTQ+ Rights", "Food Security",
    "Ocean Conservation", "Volunteering", "Human Rights", "Sustainability"
  ],
  "🍜 Food & Drinks": [
    "Coffee Culture", "Wine Tasting", "Craft Beer", "Tea Ceremony",
    "Vegan Cooking", "Baking", "Street Food", "Fine Dining",
    "Mixology", "Fermentation", "Farm-to-Table", "Food Photography",
    "Ethnic Cuisine", "BBQ & Grilling", "Chocolate", "Smoothies & Juices"
  ],
};

const GENDER_OPTIONS: LifestyleOption[] = [
  { value: "male", label: "Male", emoji: "♂️" },
  { value: "female", label: "Female", emoji: "♀️" },
  { value: "non_binary", label: "Non-Binary", emoji: "⚧️" },
  { value: "trans_male", label: "Trans Male", emoji: "🏳️‍⚧️" },
  { value: "trans_female", label: "Trans Female", emoji: "🏳️‍⚧️" },
  { value: "genderqueer", label: "Genderqueer", emoji: "🌈" },
  { value: "genderfluid", label: "Genderfluid", emoji: "💫" },
  { value: "two_spirit", label: "Two-Spirit", emoji: "🪶" },
  { value: "agender", label: "Agender", emoji: "✨" },
  { value: "prefer_not_to_say", label: "Prefer not to say", emoji: "🔒" },
];

const DATING_PREFERENCE_OPTIONS: LifestyleOption[] = [
  { value: "men", label: "Men", emoji: "♂️" },
  { value: "women", label: "Women", emoji: "♀️" },
  { value: "non_binary_people", label: "Non-Binary People", emoji: "⚧️" },
  { value: "everyone", label: "Everyone", emoji: "💖" },
];

type OnboardingStep = "input" | "generating" | "reveal" | "identity" | "lifestyle" | "interests";

const STEPS_ORDER: OnboardingStep[] = ["input", "generating", "reveal", "identity", "lifestyle", "interests"];
const STEP_LABELS = ["Birth Data", "Generating", "Your Blueprint", "Identity", "Lifestyle", "Interests"];

const staggerCard = (delay: number) => ({
  initial: { opacity: 0, y: 24, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
});

const ProgressIndicator = ({ currentStep }: { currentStep: OnboardingStep }) => {
  const visibleSteps = STEPS_ORDER.filter(s => s !== "generating");
  const currentIndex = visibleSteps.indexOf(currentStep === "generating" ? "input" : currentStep);
  
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {visibleSteps.map((step, idx) => {
        const isActive = idx === currentIndex;
        const isComplete = idx < currentIndex;
        return (
          <motion.div
            key={step}
            className="flex items-center gap-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
          >
            <motion.div
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                isActive 
                  ? "bg-accent shadow-glow scale-125" 
                  : isComplete 
                    ? "bg-primary" 
                    : "bg-muted-foreground/30"
              }`}
              animate={isActive ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
            {idx < visibleSteps.length - 1 && (
              <div className={`w-8 h-0.5 rounded-full transition-colors duration-300 ${
                isComplete ? "bg-primary/50" : "bg-muted-foreground/20"
              }`} />
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

const Onboarding = () => {
  const { user } = useAuth();
  const [step, setStep] = useState<OnboardingStep>("input");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [knowsBirthTime, setKnowsBirthTime] = useState(true);
  const [profile, setProfile] = useState<CosmicProfile | null>(null);
  const navigate = useNavigate();

  // Identity
  const [gender, setGender] = useState<string>("");
  const [preferredGenders, setPreferredGenders] = useState<string[]>([]);

  // Lifestyle
  const [kidsPreference, setKidsPreference] = useState<string>("");
  const [drinking, setDrinking] = useState<string>("");
  const [smoking, setSmoking] = useState<string>("");
  const [substances, setSubstances] = useState<string>("");

  // Interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Age validation: must be 10+
    if (birthDate) {
      const birth = new Date(birthDate + "T12:00:00");
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      if (age < 10) {
        toast.error("You must be at least 10 years old to use Aligned.");
        return;
      }
    }

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
          body: JSON.stringify({
            birthDate,
            birthTime: knowsBirthTime ? birthTime : "",
            birthPlace,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to generate profile");
      }

      const data = await response.json();
      setProfile(data.profile);
      setStep("reveal");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate your cosmic profile");
      setStep("input");
    }
  };

  const handleContinueToIdentity = () => {
    setStep("identity");
  };

  const togglePreferredGender = (value: string) => {
    setPreferredGenders(prev =>
      prev.includes(value)
        ? prev.filter(g => g !== value)
        : [...prev, value]
    );
  };

  const handleContinueToLifestyle = () => {
    setStep("lifestyle");
  };

  const handleContinueToInterests = () => {
    setStep("interests");
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleFinish = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          gender: gender || null,
          preferred_genders: preferredGenders.length > 0 ? preferredGenders : null,
          kids_preference: kidsPreference || null,
          drinking: drinking || null,
          smoking: smoking || null,
          substances: substances || null,
          interests: selectedInterests.length > 0 ? selectedInterests : null,
          onboarding_complete: true,
        })
        .eq("user_id", session.user.id);

      if (error) throw error;

      toast.success("Your Aligned blueprint is complete! ✨");
      navigate("/profile");
    } catch (err: any) {
      toast.error("Failed to save preferences");
    }
  };

  const lifePathMeaning = (num: number): string => {
    const meanings: Record<number, string> = {
      1: "The Leader — Independent, ambitious, pioneering",
      2: "The Peacemaker — Diplomatic, intuitive, cooperative",
      3: "The Creative — Expressive, social, artistic",
      4: "The Builder — Practical, disciplined, grounded",
      5: "The Adventurer — Freedom-loving, dynamic, versatile",
      6: "The Nurturer — Compassionate, responsible, harmonious",
      7: "The Seeker — Analytical, spiritual, introspective",
      8: "The Powerhouse — Ambitious, authoritative, abundant",
      9: "The Humanitarian — Wise, generous, visionary",
      11: "Master Number — Visionary, intuitive, inspirational",
      22: "Master Builder — Practical idealist, powerful manifestor",
      33: "Master Teacher — Compassionate healer, selfless guide",
    };
    return meanings[num] || "Unique Path";
  };

  const LifestyleOptionButton = ({ option, selected, onSelect }: { option: LifestyleOption; selected: boolean; onSelect: () => void }) => (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left w-full ${
        selected
          ? "border-primary bg-primary/15 text-foreground ring-1 ring-primary/30 shadow-mystical"
          : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:border-border"
      }`}
    >
      <span className="text-xl">{option.emoji}</span>
      <span className="text-sm font-medium">{option.label}</span>
      {option.value === "decline" && (
        <ShieldCheck className="w-4 h-4 ml-auto text-muted-foreground" />
      )}
    </motion.button>
  );

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 pt-16 pb-10 overflow-hidden">
      <CosmicBackground />

      <div className="w-full max-w-2xl relative z-10">
        {/* Progress Indicator - hide during generating */}
        {step !== "generating" && <ProgressIndicator currentStep={step} />}
        
        <AnimatePresence mode="wait">
          {/* STEP 1: Birth Data Input */}
          {step === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <motion.div
                className="text-center mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <motion.div 
                  className="relative w-44 h-44 mx-auto mb-4"
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <motion.div 
                    className="absolute inset-0 bg-accent/20 rounded-full blur-3xl"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <img src={alignedLogo} alt="Aligned" className="relative w-44 h-44 object-contain mix-blend-screen drop-shadow-[0_0_30px_rgba(200,180,130,0.3)]" />
                </motion.div>
                <motion.h1 
                  className="font-display text-3xl md:text-4xl font-bold bg-gradient-golden bg-clip-text text-transparent"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  Unlock Your Blueprint
                </motion.h1>
                <motion.p 
                  className="text-muted-foreground mt-2 max-w-md mx-auto text-sm md:text-base"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Enter your birth details and AI will decode your astrology, Human Design & Gene Keys
                </motion.p>
              </motion.div>

              <motion.form
                onSubmit={handleGenerate}
                className="glass-card glow-border p-6 md:p-8 space-y-5"
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.25 }}
              >
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Birth Date</label>
                  <div className="relative group">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="pl-10 bg-muted/50 border-border focus:ring-2 focus:ring-primary/20" required />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-foreground">Birth Time</label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <Checkbox checked={!knowsBirthTime} onCheckedChange={(checked) => { setKnowsBirthTime(!checked); if (checked) setBirthTime(""); }} />
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">I don't know my birth time</span>
                    </label>
                  </div>
                  <AnimatePresence mode="wait">
                    {knowsBirthTime ? (
                      <motion.div 
                        key="time-input"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="relative group"
                      >
                        <Clock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} className="pl-10 bg-muted/50 border-border focus:ring-2 focus:ring-primary/20" required />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="time-info"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-start gap-3 bg-muted/30 rounded-xl p-3 border border-border/50"
                      >
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                          <Clock className="w-4 h-4 text-accent" />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          No worries! We'll use noon as a reference — this gives statistically accurate results for your rising sign and Human Design.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Birth Place</label>
                  <div className="relative group">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input type="text" placeholder="e.g. Los Angeles, California" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} className="pl-10 bg-muted/50 border-border focus:ring-2 focus:ring-primary/20" required />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button type="submit" className="w-full h-12 text-base font-semibold group relative overflow-hidden" style={{ background: "var(--gradient-aurora)" }}>
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      Generate My Blueprint
                    </span>
                    <motion.div
                      className="absolute inset-0 bg-white/10"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.5 }}
                    />
                  </Button>
                </motion.div>
              </motion.form>
            </motion.div>
          )}

          {/* STEP 2: Generating Animation */}
          {step === "generating" && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center py-16"
            >
              <div className="relative w-32 h-32 mx-auto mb-8">
                {/* Outer rotating ring */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-dashed border-primary/40"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                />
                {/* Middle pulsing ring */}
                <motion.div
                  className="absolute inset-3 rounded-full border border-accent/50"
                  animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Inner rotating ring */}
                <motion.div
                  className="absolute inset-6 rounded-full border-2 border-dashed border-accent/30"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                />
                {/* Center orb */}
                <motion.div 
                  className="absolute inset-8 rounded-full flex items-center justify-center shadow-glow"
                  style={{ background: "var(--gradient-aurora)" }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Loader2 className="w-8 h-8 text-background animate-spin" />
                </motion.div>
                {/* Orbiting particles */}
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-accent shadow-glow"
                    style={{ top: "50%", left: "50%", marginTop: -4, marginLeft: -4 }}
                    animate={{
                      x: [0, 60 * Math.cos(i * 2.1), 0],
                      y: [0, 60 * Math.sin(i * 2.1), 0],
                      opacity: [0.3, 1, 0.3],
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
                  />
                ))}
              </div>
              <motion.h2 
                className="font-display text-2xl md:text-3xl font-bold bg-gradient-golden bg-clip-text text-transparent mb-3"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                Reading the Stars...
              </motion.h2>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-muted-foreground text-sm md:text-base">Channeling your cosmic blueprint</p>
                <motion.div 
                  className="flex justify-center gap-1 mt-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {["Astrology", "Human Design", "Gene Keys"].map((item, i) => (
                    <motion.span
                      key={item}
                      className="text-xs px-2 py-1 rounded-full bg-muted/50 text-muted-foreground border border-border/50"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + i * 0.2 }}
                    >
                      {item}
                    </motion.span>
                  ))}
                </motion.div>
              </motion.div>
            </motion.div>
          )}

          {/* STEP 3: Profile Reveal */}
          {step === "reveal" && profile && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.5 }}
              className="space-y-5"
            >
              <motion.div className="text-center mb-6" {...staggerCard(0)}>
                <motion.div
                  className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-golden flex items-center justify-center shadow-golden"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 12, delay: 0.2 }}
                >
                  <Sparkles className="w-10 h-10 text-background" />
                </motion.div>
                <h1 className="font-display text-3xl md:text-4xl font-bold bg-gradient-golden bg-clip-text text-transparent">Your Cosmic Blueprint</h1>
                <p className="text-muted-foreground mt-2 text-sm">
                  Born {birthDate}{knowsBirthTime && birthTime ? ` at ${birthTime}` : ""} in {birthPlace}
                </p>
              </motion.div>

              {/* Life Path Number */}
              <motion.div {...staggerCard(0.1)} className="glass-card glow-border p-5 md:p-6 group hover:shadow-mystical transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <motion.div 
                    className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center"
                    whileHover={{ scale: 1.1, rotate: 10 }}
                  >
                    <Hash className="w-5 h-5 text-accent" />
                  </motion.div>
                  <h2 className="text-lg md:text-xl font-bold text-foreground">Life Path Number</h2>
                </div>
                <div className="flex items-center gap-4">
                  <motion.div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-accent border-2 border-accent/30 shadow-mystical" 
                    style={{ background: "var(--gradient-mystical)" }}
                    whileHover={{ scale: 1.05 }}
                  >
                    {profile.life_path_number}
                  </motion.div>
                  <p className="text-sm text-muted-foreground flex-1">{lifePathMeaning(profile.life_path_number)}</p>
                </div>
              </motion.div>

              {/* Astrology */}
              <motion.div {...staggerCard(0.2)} className="glass-card glow-border p-5 md:p-6 group hover:shadow-mystical transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <motion.div 
                    className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"
                    whileHover={{ scale: 1.1, rotate: 10 }}
                  >
                    <Star className="w-5 h-5 text-primary" />
                  </motion.div>
                  <h2 className="text-lg md:text-xl font-bold text-foreground">Astrology</h2>
                </div>
                <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
                  {[{ label: "Sun", value: profile.sun_sign, emoji: "☀️" }, { label: "Moon", value: profile.moon_sign, emoji: "🌙" }, { label: "Rising", value: profile.rising_sign, emoji: "⬆️" }].map((item, i) => (
                    <motion.div 
                      key={item.label} 
                      className="bg-muted/50 rounded-xl p-3 text-center hover:bg-muted/70 transition-colors"
                      whileHover={{ y: -2 }}
                    >
                      <p className="text-xs text-muted-foreground">{item.emoji} {item.label}</p>
                      <p className="text-sm font-semibold text-foreground mt-1">{item.value}</p>
                    </motion.div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{profile.astro_summary}</p>
              </motion.div>

              {/* Human Design */}
              <motion.div {...staggerCard(0.3)} className="glass-card glow-border p-5 md:p-6 group hover:shadow-mystical transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <motion.div 
                    className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center"
                    whileHover={{ scale: 1.1, rotate: 10 }}
                  >
                    <Zap className="w-5 h-5 text-accent" />
                  </motion.div>
                  <h2 className="text-lg md:text-xl font-bold text-foreground">Human Design</h2>
                </div>
                <div className="grid grid-cols-2 gap-2 md:gap-3 mb-4">
                  {[{ label: "Type", value: profile.human_design_type }, { label: "Strategy", value: profile.human_design_strategy }, { label: "Authority", value: profile.human_design_authority }, { label: "Profile", value: profile.human_design_profile }].map((item) => (
                    <motion.div 
                      key={item.label} 
                      className="bg-muted/50 rounded-xl p-3 hover:bg-muted/70 transition-colors"
                      whileHover={{ y: -2 }}
                    >
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-semibold text-foreground mt-1">{item.value}</p>
                    </motion.div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{profile.human_design_summary}</p>
              </motion.div>

              {/* Gene Keys */}
              <motion.div {...staggerCard(0.4)} className="glass-card glow-border p-5 md:p-6 group hover:shadow-mystical transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <motion.div 
                    className="w-10 h-10 rounded-full bg-secondary/40 flex items-center justify-center"
                    whileHover={{ scale: 1.1, rotate: 10 }}
                  >
                    <Dna className="w-5 h-5 text-primary" />
                  </motion.div>
                  <h2 className="text-lg md:text-xl font-bold text-foreground">Gene Keys</h2>
                </div>
                <div className="space-y-2 mb-4">
                  {[{ label: "Life Purpose", value: profile.gene_keys_life_purpose, emoji: "🎯" }, { label: "Evolution", value: profile.gene_keys_evolution, emoji: "🌱" }, { label: "Radiance", value: profile.gene_keys_radiance, emoji: "✨" }].map((item) => (
                    <motion.div 
                      key={item.label} 
                      className="bg-muted/50 rounded-xl p-3 hover:bg-muted/70 transition-colors"
                      whileHover={{ x: 4 }}
                    >
                      <p className="text-xs text-muted-foreground">{item.emoji} {item.label}</p>
                      <p className="text-sm font-semibold text-foreground mt-1">{item.value}</p>
                    </motion.div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{profile.gene_keys_summary}</p>
              </motion.div>

              {/* Compatibility Tags */}
              <motion.div {...staggerCard(0.5)} className="glass-card glow-border p-5 md:p-6">
                <h3 className="text-lg font-bold text-foreground mb-3">Your Cosmic Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.compatibility_tags.map((tag, i) => (
                    <motion.span 
                      key={tag} 
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + i * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      {tag}
                    </motion.span>
                  ))}
                </div>
              </motion.div>

              {/* Continue Button */}
              <motion.div {...staggerCard(0.6)}>
                <Button 
                  onClick={handleContinueToIdentity} 
                  className="w-full h-12 text-base font-semibold group relative overflow-hidden" 
                  style={{ background: "var(--gradient-aurora)" }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Continue — Tell Us About You
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* STEP 4: Identity & Dating Preferences */}
          {step === "identity" && (
            <motion.div
              key="identity"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.5 }}
              className="space-y-5"
            >
              <motion.div className="text-center mb-6" {...staggerCard(0)}>
                <motion.div 
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center shadow-mystical"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 12, delay: 0.1 }}
                >
                  <Heart className="w-8 h-8 text-primary" />
                </motion.div>
                <h1 className="font-display text-2xl md:text-3xl font-bold bg-gradient-golden bg-clip-text text-transparent">Identity & Dating</h1>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm md:text-base">
                  Tell us about yourself and who you're looking to connect with ✨
                </p>
              </motion.div>

              {/* Gender Identity */}
              <motion.div {...staggerCard(0.1)} className="glass-card glow-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <User className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">I identify as...</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {GENDER_OPTIONS.map((opt) => (
                    <LifestyleOptionButton 
                      key={opt.value} 
                      option={opt} 
                      selected={gender === opt.value} 
                      onSelect={() => setGender(gender === opt.value ? "" : opt.value)} 
                    />
                  ))}
                </div>
              </motion.div>

              {/* Dating Preferences */}
              <motion.div {...staggerCard(0.2)} className="glass-card glow-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Heart className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">I'm interested in...</h3>
                  <Badge variant="outline" className="border-primary/30 text-primary text-xs ml-auto">Multi-select</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Select all that apply — your matches will be filtered accordingly.</p>
                <div className="grid grid-cols-2 gap-2">
                  {DATING_PREFERENCE_OPTIONS.map((opt) => (
                    <motion.button
                      key={opt.value}
                      type="button"
                      onClick={() => togglePreferredGender(opt.value)}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left w-full ${
                        preferredGenders.includes(opt.value)
                          ? "border-primary bg-primary/15 text-foreground ring-1 ring-primary/30 shadow-mystical"
                          : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:border-border"
                      }`}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <span className="text-sm font-medium">{opt.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              <motion.div {...staggerCard(0.3)} className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("reveal")} className="h-12 px-6 group">
                  <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
                  Back
                </Button>
                <Button onClick={handleContinueToLifestyle} className="flex-1 h-12 text-base font-semibold group" style={{ background: "var(--gradient-aurora)" }}>
                  <span className="flex items-center justify-center gap-2">
                    Continue — Lifestyle
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* STEP 5: Lifestyle Preferences */}
          {step === "lifestyle" && (
            <motion.div
              key="lifestyle"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.5 }}
              className="space-y-5"
            >
              <motion.div className="text-center mb-6" {...staggerCard(0)}>
                <motion.div 
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center shadow-mystical"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 12, delay: 0.1 }}
                >
                  <ShieldCheck className="w-8 h-8 text-accent" />
                </motion.div>
                <h1 className="font-display text-2xl md:text-3xl font-bold bg-gradient-golden bg-clip-text text-transparent">Lifestyle & Preferences</h1>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm md:text-base">
                  This is a <span className="text-accent font-semibold">judgment-free zone</span> ✨ Share what feels right.
                </p>
              </motion.div>

              {/* Kids */}
              <motion.div {...staggerCard(0.1)} className="glass-card glow-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Baby className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Kids</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {KIDS_OPTIONS.map((opt) => (
                    <LifestyleOptionButton key={opt.value} option={opt} selected={kidsPreference === opt.value} onSelect={() => setKidsPreference(kidsPreference === opt.value ? "" : opt.value)} />
                  ))}
                </div>
              </motion.div>

              {/* Drinking */}
              <motion.div {...staggerCard(0.2)} className="glass-card glow-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Wine className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Drinking</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DRINKING_OPTIONS.map((opt) => (
                    <LifestyleOptionButton key={opt.value} option={opt} selected={drinking === opt.value} onSelect={() => setDrinking(drinking === opt.value ? "" : opt.value)} />
                  ))}
                </div>
              </motion.div>

              {/* Smoking */}
              <motion.div {...staggerCard(0.3)} className="glass-card glow-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Cigarette className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Smoking</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SMOKING_OPTIONS.map((opt) => (
                    <LifestyleOptionButton key={opt.value} option={opt} selected={smoking === opt.value} onSelect={() => setSmoking(smoking === opt.value ? "" : opt.value)} />
                  ))}
                </div>
              </motion.div>

              {/* Substances */}
              <motion.div {...staggerCard(0.4)} className="glass-card glow-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Pill className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Substances</h3>
                  <Badge variant="outline" className="border-accent/30 text-accent text-xs ml-auto">Judgment-Free Zone 🕊️</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SUBSTANCES_OPTIONS.map((opt) => (
                    <LifestyleOptionButton key={opt.value} option={opt} selected={substances === opt.value} onSelect={() => setSubstances(substances === opt.value ? "" : opt.value)} />
                  ))}
                </div>
              </motion.div>

              <motion.div {...staggerCard(0.5)} className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("identity")} className="h-12 px-6 group">
                  <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
                  Back
                </Button>
                <Button onClick={handleContinueToInterests} className="flex-1 h-12 text-base font-semibold group" style={{ background: "var(--gradient-aurora)" }}>
                  <span className="flex items-center justify-center gap-2">
                    Continue — Pick Interests
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* STEP 5: Interests */}
          {step === "interests" && (
            <motion.div
              key="interests"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.5 }}
              className="space-y-5"
            >
              <motion.div className="text-center mb-6" {...staggerCard(0)}>
                <motion.div 
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center shadow-mystical"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 12, delay: 0.1 }}
                >
                  <Sparkles className="w-8 h-8 text-primary" />
                </motion.div>
                <h1 className="font-display text-2xl md:text-3xl font-bold bg-gradient-golden bg-clip-text text-transparent">What Lights You Up?</h1>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm md:text-base">
                  Select the things you love — the more you pick, the better your matches ✨
                </p>
                <AnimatePresence>
                  {selectedInterests.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <Badge className="mt-3 bg-primary/20 text-primary border border-primary/30">
                        {selectedInterests.length} selected
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {Object.entries(INTEREST_CATEGORIES).map(([category, items], idx) => (
                <motion.div 
                  key={category} 
                  {...staggerCard(0.03 * (idx + 1))} 
                  className="glass-card glow-border p-5 md:p-6 hover:shadow-mystical transition-shadow"
                >
                  <h3 className="text-base md:text-lg font-semibold text-foreground mb-3">{category}</h3>
                  <div className="flex flex-wrap gap-2">
                    {items.map((interest) => {
                      const isSelected = selectedInterests.includes(interest);
                      return (
                        <motion.button
                          key={interest}
                          type="button"
                          onClick={() => toggleInterest(interest)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all ${
                            isSelected
                              ? "bg-primary/20 text-primary border border-primary/40 ring-1 ring-primary/20 shadow-sm"
                              : "bg-muted/40 text-muted-foreground border border-border/50 hover:bg-muted/60 hover:text-foreground"
                          }`}
                        >
                          {interest}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              ))}

              {/* Avatar Upload */}
              <motion.div {...staggerCard(0.4)} className="glass-card glow-border p-5 md:p-6">
                <div className="text-center space-y-4">
                  <h3 className="text-base md:text-lg font-semibold text-foreground">Add a Profile Photo</h3>
                  <p className="text-sm text-muted-foreground">Show the world your cosmic self ✨</p>
                  {user && (
                    <motion.div 
                      className="flex justify-center"
                      whileHover={{ scale: 1.02 }}
                    >
                      <AvatarUpload
                        userId={user.id}
                        currentUrl={null}
                        onUpload={() => {}}
                        size="lg"
                      />
                    </motion.div>
                  )}
                  <p className="text-xs text-muted-foreground">Tap to upload — you can change it anytime</p>
                </div>
              </motion.div>

              <motion.div {...staggerCard(0.45)} className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("lifestyle")} className="h-12 px-6 group">
                  <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
                  Back
                </Button>
                <Button onClick={handleFinish} className="flex-1 h-12 text-base font-semibold group relative overflow-hidden" style={{ background: "var(--gradient-aurora)" }}>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    Complete My Profile
                  </span>
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
