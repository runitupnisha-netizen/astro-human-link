import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CosmicBackground from "@/components/CosmicBackground";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Heart, Zap, Star, Sun, Moon, User, Flame, Droplets, Wind, Mountain, ChevronDown, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface AnalysisProfile {
  display_name: string | null;
  avatar_url: string | null;
  sun_sign: string | null;
  moon_sign: string | null;
  rising_sign: string | null;
  element: string;
  human_design_type: string | null;
  human_design_profile: string | null;
  gene_keys_life_purpose: string | null;
  life_path_number: number | null;
}

interface KeyAspect {
  aspect: string;
  meaning: string;
  energy: "harmonious" | "dynamic" | "challenging";
}

interface CompatibilityData {
  overall_score: number;
  overall_summary: string;
  connection_archetype: string;
  synastry: {
    score: number;
    sun_sun: string;
    moon_moon: string;
    sun_moon_cross: string;
    rising_dynamic: string;
    key_aspects: KeyAspect[];
  };
  elements: {
    score: number;
    balance_description: string;
    dominant_element: string;
    missing_element: string;
  };
  human_design: {
    score: number;
    type_dynamic: string;
    strategy_harmony: string;
    authority_interplay: string;
    growth_edge: string;
  };
  gene_keys: {
    score: number;
    resonance_description: string;
    shadow_alchemy: string;
    gift_amplification: string;
  };
  numerology: {
    score: number;
    life_path_dynamic: string;
  };
  strengths: string[];
  growth_areas: string[];
  cosmic_advice: string;
  profiles: {
    mine: AnalysisProfile;
    theirs: AnalysisProfile;
  };
  element_compatibility: { score: number; description: string };
  hd_pairing_detail: string;
}

const elementIcons: Record<string, React.ReactNode> = {
  Fire: <Flame className="w-4 h-4" />,
  Water: <Droplets className="w-4 h-4" />,
  Air: <Wind className="w-4 h-4" />,
  Earth: <Mountain className="w-4 h-4" />,
};

const elementColors: Record<string, string> = {
  Fire: "text-orange-400 bg-orange-400/15 border-orange-400/30",
  Water: "text-blue-400 bg-blue-400/15 border-blue-400/30",
  Air: "text-cyan-300 bg-cyan-300/15 border-cyan-300/30",
  Earth: "text-emerald-400 bg-emerald-400/15 border-emerald-400/30",
};

const aspectEnergyColors: Record<string, string> = {
  harmonious: "bg-green-400/15 text-green-400 border-green-400/30",
  dynamic: "bg-accent/15 text-accent border-accent/30",
  challenging: "bg-orange-400/15 text-orange-400 border-orange-400/30",
};

const ScoreRing = ({ score, size = 120, label }: { score: number; size?: number; label?: string }) => {
  const radius = (size / 2) - 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "hsl(var(--accent))" : score >= 60 ? "hsl(var(--primary))" : "hsl(var(--secondary-foreground))";

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="4" opacity={0.3} />
        <motion.circle
          cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl font-bold text-foreground"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
        >
          {score}%
        </motion.span>
        {label && <span className="text-[10px] text-muted-foreground mt-0.5">{label}</span>}
      </div>
    </div>
  );
};

const MiniScore = ({ score, label }: { score: number; label: string }) => (
  <div className="flex flex-col items-center gap-1">
    <ScoreRing score={score} size={72} />
    <span className="text-xs text-muted-foreground font-medium">{label}</span>
  </div>
);

const SectionCard = ({ title, icon, children, delay = 0 }: { title: string; icon: React.ReactNode; children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
  >
    <Card className="bg-card/70 backdrop-blur-sm border-border/40">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
            {icon}
          </div>
          <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
        </div>
        {children}
      </CardContent>
    </Card>
  </motion.div>
);

const ProfileAvatar = ({ profile, size = "w-16 h-16" }: { profile: AnalysisProfile; size?: string }) => (
  <div className={`${size} rounded-full bg-gradient-mystical flex items-center justify-center ring-2 ring-primary/20 overflow-hidden`}>
    {profile.avatar_url ? (
      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
    ) : (
      <User className="w-1/2 h-1/2 text-foreground" />
    )}
  </div>
);

const Compatibility = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<CompatibilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId || !user) return;

    const analyze = async () => {
      try {
        const { data: result, error: fnError } = await supabase.functions.invoke("analyze-compatibility", {
          body: { matchId },
        });
        if (fnError) throw fnError;
        if (result?.error) throw new Error(result.error);
        setData(result);
      } catch (e: any) {
        console.error("Compatibility analysis error:", e);
        setError(e.message || "Failed to analyze compatibility");
        toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    analyze();
  }, [matchId, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background relative">
        <CosmicBackground />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen gap-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="relative"
          >
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl scale-150 animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-mystical flex items-center justify-center shadow-mystical">
              <Sparkles className="w-10 h-10 text-accent" />
            </div>
          </motion.div>
          <div className="text-center">
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Analyzing Your Cosmic Bond</h2>
            <p className="text-muted-foreground text-sm font-serif">Reading the stars, charts, and keys...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background relative">
        <CosmicBackground />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen gap-4 px-6">
          <p className="text-destructive">{error || "Something went wrong"}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const { profiles, synastry, elements, human_design, gene_keys, numerology } = data;

  return (
    <div className="min-h-screen bg-background relative">
      <CosmicBackground />
      <div className="relative z-10 pt-20 pb-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          {/* Back button */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </motion.div>

          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            {/* Profile avatars */}
            <div className="flex items-center justify-center gap-4 mb-5">
              <div className="text-center">
                <ProfileAvatar profile={profiles.mine} size="w-20 h-20" />
                <p className="text-xs text-muted-foreground mt-2 font-medium">{profiles.mine.display_name || "You"}</p>
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.3 }}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "var(--gradient-golden)" }}
              >
                <Heart className="w-5 h-5 text-accent-foreground fill-current" />
              </motion.div>
              <div className="text-center">
                <ProfileAvatar profile={profiles.theirs} size="w-20 h-20" />
                <p className="text-xs text-muted-foreground mt-2 font-medium">{profiles.theirs.display_name || "Match"}</p>
              </div>
            </div>

            {/* Overall score */}
            <ScoreRing score={data.overall_score} size={140} />
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              <Badge className="mt-3 bg-accent/15 text-accent border-accent/30 text-sm px-4 py-1">
                {data.connection_archetype}
              </Badge>
              <p className="text-muted-foreground text-sm mt-3 max-w-md mx-auto font-serif italic leading-relaxed">
                "{data.overall_summary}"
              </p>
            </motion.div>
          </motion.div>

          {/* Category Scores Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center gap-5 flex-wrap mb-8"
          >
            <MiniScore score={synastry.score} label="Synastry" />
            <MiniScore score={elements.score} label="Elements" />
            <MiniScore score={human_design.score} label="Design" />
            <MiniScore score={gene_keys.score} label="Gene Keys" />
            <MiniScore score={numerology.score} label="Numbers" />
          </motion.div>

          <div className="space-y-4">
            {/* Synastry Section */}
            <SectionCard title="Astrological Synastry" icon={<Star className="w-4 h-4" />} delay={0.3}>
              <div className="space-y-4">
                {/* Sign comparison */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="text-muted-foreground">You</div>
                  <div className="text-accent font-semibold">Aspect</div>
                  <div className="text-muted-foreground">Match</div>
                  
                  <div className="font-medium text-foreground">☉ {profiles.mine.sun_sign}</div>
                  <div className="text-accent">Sun</div>
                  <div className="font-medium text-foreground">☉ {profiles.theirs.sun_sign}</div>
                  
                  <div className="font-medium text-foreground">☽ {profiles.mine.moon_sign}</div>
                  <div className="text-accent">Moon</div>
                  <div className="font-medium text-foreground">☽ {profiles.theirs.moon_sign}</div>
                  
                  <div className="font-medium text-foreground">↗ {profiles.mine.rising_sign}</div>
                  <div className="text-accent">Rising</div>
                  <div className="font-medium text-foreground">↗ {profiles.theirs.rising_sign}</div>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <h4 className="text-xs font-semibold text-accent mb-1">☉ Sun–Sun Dynamic</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{synastry.sun_sun}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-accent mb-1">☽ Moon–Moon Emotional Bond</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{synastry.moon_moon}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-accent mb-1">☉↔☽ Sun–Moon Cross Aspects</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{synastry.sun_moon_cross}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-accent mb-1">↗ Rising Sign Dynamic</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{synastry.rising_dynamic}</p>
                  </div>
                </div>

                {/* Key Aspects */}
                {synastry.key_aspects?.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-xs font-semibold text-accent mb-2">Key Planetary Aspects</h4>
                    <div className="space-y-2">
                      {synastry.key_aspects.map((asp, i) => (
                        <div key={i} className={`rounded-lg border p-3 ${aspectEnergyColors[asp.energy]}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-bold">{asp.aspect}</span>
                            <Badge variant="outline" className="text-[10px] h-4 border-current/30">
                              {asp.energy}
                            </Badge>
                          </div>
                          <p className="text-xs opacity-80">{asp.meaning}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Elements Section */}
            <SectionCard title="Elemental Balance" icon={<Flame className="w-4 h-4" />} delay={0.4}>
              <div className="space-y-4">
                <div className="flex justify-center gap-4">
                  <div className="text-center">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium ${elementColors[profiles.mine.element] || "text-muted-foreground"}`}>
                      {elementIcons[profiles.mine.element]} {profiles.mine.element}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">You</p>
                  </div>
                  <span className="text-accent self-center">×</span>
                  <div className="text-center">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium ${elementColors[profiles.theirs.element] || "text-muted-foreground"}`}>
                      {elementIcons[profiles.theirs.element]} {profiles.theirs.element}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Match</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">{elements.balance_description}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-primary/8 rounded-lg p-3 border border-primary/15">
                    <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mb-1">Dominant</p>
                    <div className={`inline-flex items-center gap-1 text-sm font-medium ${elementColors[elements.dominant_element]?.split(" ")[0] || "text-foreground"}`}>
                      {elementIcons[elements.dominant_element]} {elements.dominant_element}
                    </div>
                  </div>
                  <div className="bg-accent/8 rounded-lg p-3 border border-accent/15">
                    <p className="text-[10px] text-accent font-semibold uppercase tracking-wider mb-1">Growth Area</p>
                    <div className={`inline-flex items-center gap-1 text-sm font-medium ${elementColors[elements.missing_element]?.split(" ")[0] || "text-foreground"}`}>
                      {elementIcons[elements.missing_element]} {elements.missing_element}
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Human Design Section */}
            <SectionCard title="Human Design Dynamics" icon={<Zap className="w-4 h-4" />} delay={0.5}>
              <div className="space-y-4">
                <div className="flex justify-center gap-6 text-center">
                  <div>
                    <Badge variant="outline" className="border-primary/30 text-primary mb-1">{profiles.mine.human_design_type || "?"}</Badge>
                    <p className="text-[10px] text-muted-foreground">{profiles.mine.human_design_profile || ""}</p>
                  </div>
                  <span className="text-accent self-center text-lg">⚡</span>
                  <div>
                    <Badge variant="outline" className="border-primary/30 text-primary mb-1">{profiles.theirs.human_design_type || "?"}</Badge>
                    <p className="text-[10px] text-muted-foreground">{profiles.theirs.human_design_profile || ""}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-semibold text-primary mb-1">Type Dynamic</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{human_design.type_dynamic}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-primary mb-1">Strategy Harmony</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{human_design.strategy_harmony}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-primary mb-1">Authority Interplay</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{human_design.authority_interplay}</p>
                  </div>
                  <div className="bg-accent/8 rounded-lg p-3 border border-accent/15">
                    <h4 className="text-xs font-semibold text-accent mb-1">🌱 Growth Edge</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{human_design.growth_edge}</p>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Gene Keys Section */}
            <SectionCard title="Gene Keys Resonance" icon={<Sparkles className="w-4 h-4" />} delay={0.6}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-primary/8 rounded-lg p-3 border border-primary/15">
                    <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mb-1">Your Purpose</p>
                    <p className="text-xs text-foreground">{profiles.mine.gene_keys_life_purpose || "—"}</p>
                  </div>
                  <div className="bg-primary/8 rounded-lg p-3 border border-primary/15">
                    <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mb-1">Their Purpose</p>
                    <p className="text-xs text-foreground">{profiles.theirs.gene_keys_life_purpose || "—"}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-semibold text-primary mb-1">Purpose Resonance</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{gene_keys.resonance_description}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-primary mb-1">Shadow Alchemy</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{gene_keys.shadow_alchemy}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-primary mb-1">Gift Amplification</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{gene_keys.gift_amplification}</p>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Numerology */}
            <SectionCard title="Life Path Numerology" icon={<span className="text-sm font-bold">#</span>} delay={0.7}>
              <div className="flex items-center gap-6 justify-center mb-3">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center text-accent font-bold text-lg">
                    {profiles.mine.life_path_number || "?"}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">You</p>
                </div>
                <span className="text-accent">+</span>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center text-accent font-bold text-lg">
                    {profiles.theirs.life_path_number || "?"}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Match</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{numerology.life_path_dynamic}</p>
            </SectionCard>

            {/* Strengths & Growth */}
            <SectionCard title="Relationship Blueprint" icon={<Heart className="w-4 h-4" />} delay={0.8}>
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">✦ Core Strengths</h4>
                  <div className="space-y-2">
                    {data.strengths.map((s, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">🌱 Growth Areas</h4>
                  <div className="space-y-2">
                    {data.growth_areas.map((g, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">{g}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Cosmic Advice */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="text-center py-6"
            >
              <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-2xl p-6 border border-accent/20">
                <Sparkles className="w-6 h-6 text-accent mx-auto mb-3" />
                <p className="text-foreground font-serif italic leading-relaxed">"{data.cosmic_advice}"</p>
              </div>
            </motion.div>

            {/* Action Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex justify-center pb-8"
            >
              <Button
                onClick={() => navigate("/messages")}
                className="gap-2 h-12 px-8"
                style={{ background: "var(--gradient-aurora)" }}
              >
                <MessageCircle className="w-5 h-5" />
                Send a Message
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Compatibility;
