import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MapPin, Calendar, Clock, Loader2, Star, Zap, Dna, Hash, Wine, Cigarette, Pill, Baby, ShieldCheck, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import CosmicBackground from "@/components/CosmicBackground";
import { motion, AnimatePresence } from "framer-motion";
import alignedLogo from "@/assets/aligned-hero-logo.png";

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
    "Comedy", "Drama", "Anime", "Thriller", "Romance", "Reality TV",
    "True Crime", "Fantasy", "Action", "Foreign Films", "Superhero",
    "Film Noir", "Westerns", "Musicals", "Biographical", "Psychological Thriller",
    "Satire", "Dystopian", "Noir", "Slasher", "Found Footage",
    "Period Drama", "Crime Drama", "Sitcoms", "K-Drama", "Stand-Up Comedy"
  ],
  "📚 Books & Learning": [
    "The Power of Now", "Siddhartha", "Dune", "Self-Help", "Philosophy",
    "Poetry", "Fiction", "Non-Fiction", "Astrology Books", "Tarot",
    "Psychology", "History", "Biographies", "Science", "Spirituality"
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
    "Non-dualism", "Jungian Psychology", "Buddhism", "Stoicism",
    "Astrology", "Human Design", "Gene Keys", "Kabbalah", "Taoism",
    "Manifestation", "Quantum Physics", "Sacred Geometry", "Shamanism"
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

type OnboardingStep = "input" | "generating" | "reveal" | "lifestyle" | "interests";

const Onboarding = () => {
  const [step, setStep] = useState<OnboardingStep>("input");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [knowsBirthTime, setKnowsBirthTime] = useState(true);
  const [profile, setProfile] = useState<CosmicProfile | null>(null);
  const navigate = useNavigate();

  // Lifestyle
  const [kidsPreference, setKidsPreference] = useState<string>("");
  const [drinking, setDrinking] = useState<string>("");
  const [smoking, setSmoking] = useState<string>("");
  const [substances, setSubstances] = useState<string>("");

  // Interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

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
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left w-full ${
        selected
          ? "border-primary bg-primary/15 text-foreground ring-1 ring-primary/30"
          : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:border-border"
      }`}
    >
      <span className="text-xl">{option.emoji}</span>
      <span className="text-sm font-medium">{option.label}</span>
      {option.value === "decline" && (
        <ShieldCheck className="w-4 h-4 ml-auto text-muted-foreground" />
      )}
    </button>
  );

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
                <div className="relative w-56 h-56 mx-auto mb-2">
                  <div className="absolute inset-0 bg-gradient-aurora rounded-full blur-2xl animate-pulse scale-110 opacity-30" />
                  <img src={alignedLogo} alt="Aligned" className="relative w-56 h-56 object-contain mix-blend-lighten drop-shadow-[0_0_25px_hsl(260_60%_65%/0.5)]" />
                </div>
                <h1 className="font-display text-3xl font-bold text-foreground">Unlock Your Aligned Blueprint</h1>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                  Enter your birth details and our AI will decode your astrology, Human Design, and Gene Keys
                </p>
              </div>

              <form onSubmit={handleGenerate} className="space-y-5 bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Birth Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="pl-10 bg-muted/50 border-border" required />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-foreground">Birth Time</label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={!knowsBirthTime} onCheckedChange={(checked) => { setKnowsBirthTime(!checked); if (checked) setBirthTime(""); }} />
                      <span className="text-xs text-muted-foreground">I don't know my birth time</span>
                    </label>
                  </div>
                  {knowsBirthTime ? (
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} className="pl-10 bg-muted/50 border-border" required />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                      No worries! We'll use noon as a standard reference point — this gives the most statistically accurate results for your rising sign and Human Design.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Birth Place</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input type="text" placeholder="e.g. Los Angeles, California" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} className="pl-10 bg-muted/50 border-border" required />
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 text-base font-semibold" style={{ background: "var(--gradient-aurora)" }}>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate My Aligned Blueprint
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
                <p className="text-muted-foreground mt-1">
                  Born {birthDate}{knowsBirthTime && birthTime ? ` at ${birthTime}` : ""} in {birthPlace}
                </p>
              </div>

              {/* Life Path Number */}
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center"><Hash className="w-5 h-5 text-accent" /></div>
                  <h2 className="text-xl font-bold text-foreground">Life Path Number</h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-accent border-2 border-accent/30" style={{ background: "var(--gradient-mystical)" }}>{profile.life_path_number}</div>
                  <p className="text-sm text-muted-foreground flex-1">{lifePathMeaning(profile.life_path_number)}</p>
                </div>
              </motion.div>

              {/* Astrology */}
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"><Star className="w-5 h-5 text-primary" /></div>
                  <h2 className="text-xl font-bold text-foreground">Astrology</h2>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[{ label: "Sun", value: profile.sun_sign }, { label: "Moon", value: profile.moon_sign }, { label: "Rising", value: profile.rising_sign }].map((item) => (
                    <div key={item.label} className="bg-muted/50 rounded-xl p-3 text-center">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-semibold text-foreground mt-1">{item.value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{profile.astro_summary}</p>
              </motion.div>

              {/* Human Design */}
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center"><Zap className="w-5 h-5 text-accent" /></div>
                  <h2 className="text-xl font-bold text-foreground">Human Design</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[{ label: "Type", value: profile.human_design_type }, { label: "Strategy", value: profile.human_design_strategy }, { label: "Authority", value: profile.human_design_authority }, { label: "Profile", value: profile.human_design_profile }].map((item) => (
                    <div key={item.label} className="bg-muted/50 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-semibold text-foreground mt-1">{item.value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{profile.human_design_summary}</p>
              </motion.div>

              {/* Gene Keys */}
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-secondary/40 flex items-center justify-center"><Dna className="w-5 h-5 text-primary" /></div>
                  <h2 className="text-xl font-bold text-foreground">Gene Keys</h2>
                </div>
                <div className="space-y-3 mb-4">
                  {[{ label: "Life Purpose", value: profile.gene_keys_life_purpose }, { label: "Evolution", value: profile.gene_keys_evolution }, { label: "Radiance", value: profile.gene_keys_radiance }].map((item) => (
                    <div key={item.label} className="bg-muted/50 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-semibold text-foreground mt-1">{item.value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{profile.gene_keys_summary}</p>
              </motion.div>

              {/* Compatibility Tags */}
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6">
                <h3 className="text-lg font-bold text-foreground mb-3">Your Cosmic Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.compatibility_tags.map((tag) => (
                    <span key={tag} className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">{tag}</span>
                  ))}
                </div>
              </motion.div>

              {/* Continue Button */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
                <Button onClick={handleContinueToLifestyle} className="w-full h-12 text-base font-semibold" style={{ background: "var(--gradient-aurora)" }}>
                  Continue — Tell Us About You
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* STEP 4: Lifestyle Preferences */}
          {step === "lifestyle" && (
            <motion.div
              key="lifestyle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-accent" />
                </div>
                <h1 className="text-3xl font-bold text-foreground">Lifestyle & Preferences</h1>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                  This is a <span className="text-accent font-semibold">judgment-free zone</span> ✨ Share what you're comfortable with — you can always skip.
                </p>
              </div>

              {/* Kids */}
              <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Baby className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Kids</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {KIDS_OPTIONS.map((opt) => (
                    <LifestyleOptionButton key={opt.value} option={opt} selected={kidsPreference === opt.value} onSelect={() => setKidsPreference(kidsPreference === opt.value ? "" : opt.value)} />
                  ))}
                </div>
              </div>

              {/* Drinking */}
              <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Wine className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Drinking</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DRINKING_OPTIONS.map((opt) => (
                    <LifestyleOptionButton key={opt.value} option={opt} selected={drinking === opt.value} onSelect={() => setDrinking(drinking === opt.value ? "" : opt.value)} />
                  ))}
                </div>
              </div>

              {/* Smoking */}
              <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Cigarette className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Smoking</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SMOKING_OPTIONS.map((opt) => (
                    <LifestyleOptionButton key={opt.value} option={opt} selected={smoking === opt.value} onSelect={() => setSmoking(smoking === opt.value ? "" : opt.value)} />
                  ))}
                </div>
              </div>

              {/* Substances */}
              <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6">
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
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("reveal")} className="h-12 px-6">
                  <ChevronLeft className="w-5 h-5 mr-1" />
                  Back
                </Button>
                <Button onClick={handleContinueToInterests} className="flex-1 h-12 text-base font-semibold" style={{ background: "var(--gradient-aurora)" }}>
                  Continue — Pick Your Interests
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: Interests */}
          {step === "interests" && (
            <motion.div
              key="interests"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-foreground">What Lights You Up?</h1>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                  Select the things you love — the more you pick, the better your matches ✨
                </p>
                {selectedInterests.length > 0 && (
                  <Badge className="mt-3 bg-primary/20 text-primary border border-primary/30">
                    {selectedInterests.length} selected
                  </Badge>
                )}
              </div>

              {Object.entries(INTEREST_CATEGORIES).map(([category, items]) => (
                <div key={category} className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-3">{category}</h3>
                  <div className="flex flex-wrap gap-2">
                    {items.map((interest) => {
                      const isSelected = selectedInterests.includes(interest);
                      return (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => toggleInterest(interest)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            isSelected
                              ? "bg-primary/20 text-primary border border-primary/40 ring-1 ring-primary/20"
                              : "bg-muted/40 text-muted-foreground border border-border/50 hover:bg-muted/60 hover:text-foreground"
                          }`}
                        >
                          {interest}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("lifestyle")} className="h-12 px-6">
                  <ChevronLeft className="w-5 h-5 mr-1" />
                  Back
                </Button>
                <Button onClick={handleFinish} className="flex-1 h-12 text-base font-semibold" style={{ background: "var(--gradient-aurora)" }}>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Complete My Profile
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Onboarding;
