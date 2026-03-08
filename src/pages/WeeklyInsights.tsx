import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CosmicBackground from "@/components/CosmicBackground";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Star, Moon, Sun, Zap, Flame, Droplets, Wind, Mountain, Heart, TrendingUp, Calendar } from "lucide-react";
import { Loader2 } from "lucide-react";

const ZODIAC_SYMBOLS: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
  Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

const ELEMENT_MAP: Record<string, { icon: React.ReactNode; color: string }> = {
  Fire: { icon: <Flame className="w-4 h-4" />, color: "text-orange-400" },
  Water: { icon: <Droplets className="w-4 h-4" />, color: "text-blue-400" },
  Air: { icon: <Wind className="w-4 h-4" />, color: "text-cyan-300" },
  Earth: { icon: <Mountain className="w-4 h-4" />, color: "text-emerald-400" },
};

const getElement = (sign: string | null) => {
  if (!sign) return "Unknown";
  const fire = ["Aries", "Leo", "Sagittarius"];
  const water = ["Cancer", "Scorpio", "Pisces"];
  const air = ["Gemini", "Libra", "Aquarius"];
  if (fire.includes(sign)) return "Fire";
  if (water.includes(sign)) return "Water";
  if (air.includes(sign)) return "Air";
  return "Earth";
};

// Deterministic weekly insights based on sun sign and current week
const generateWeeklyInsights = (profile: any) => {
  const now = new Date();
  const weekOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 604800000);
  const sunSign = profile?.sun_sign || "Aries";
  const element = getElement(sunSign);

  const themes = {
    Fire: ["passion", "creative expression", "leadership", "adventure"],
    Water: ["intuition", "emotional depth", "healing", "connection"],
    Air: ["communication", "ideas", "social bonds", "mental clarity"],
    Earth: ["stability", "manifestation", "grounding", "abundance"],
  };

  const weekThemes = themes[element as keyof typeof themes] || themes.Fire;
  const themeIdx = weekOfYear % weekThemes.length;

  const transits = [
    {
      planet: "☉ Sun",
      description: `The Sun illuminates your ${weekThemes[themeIdx]} sector this week, bringing opportunities for growth and self-expression.`,
      energy: "high" as const,
    },
    {
      planet: "☽ Moon",
      description: `The Moon's cycle encourages ${weekThemes[(themeIdx + 1) % weekThemes.length]} — trust your inner knowing.`,
      energy: "medium" as const,
    },
    {
      planet: "♀ Venus",
      description: `Venus favors authentic connections. Open your heart to ${weekThemes[(themeIdx + 2) % weekThemes.length]}.`,
      energy: "high" as const,
    },
  ];

  const dailyEnergies = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now);
    day.setDate(now.getDate() - now.getDay() + i);
    const seed = (day.getDate() * 7 + weekOfYear + sunSign.charCodeAt(0)) % 100;
    return {
      day: day.toLocaleDateString("en-US", { weekday: "short" }),
      date: day.getDate(),
      energy: seed > 70 ? "high" : seed > 35 ? "medium" : "low",
      isToday: day.toDateString() === now.toDateString(),
    };
  });

  const growthFocus = [
    `This week invites you to explore ${weekThemes[themeIdx]} more deeply in your relationships.`,
    `Your ${profile?.human_design_type || "energetic"} design thrives when you honor your strategy of ${profile?.human_design_strategy || "responding to life"}.`,
    profile?.gene_keys_life_purpose
      ? `Your Gene Key of ${profile.gene_keys_life_purpose} is activated this week — watch for synchronicities.`
      : `Pay attention to repeating patterns and synchronicities this week.`,
  ];

  return { transits, dailyEnergies, growthFocus, weekTheme: weekThemes[themeIdx], element };
};

const WeeklyInsights = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setProfile(data);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const insights = generateWeeklyInsights(profile);
  const elementInfo = ELEMENT_MAP[insights.element] || ELEMENT_MAP.Fire;
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return (
    <div className="min-h-screen bg-background relative">
      <CosmicBackground />
      <div className="relative z-10 pt-20 pb-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold bg-gradient-aurora bg-clip-text text-transparent mb-2">
              Weekly Alignment
            </h1>
            <p className="text-muted-foreground text-sm font-serif">
              {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </motion.div>

          {/* Week Theme Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass-card mb-6 overflow-hidden">
              <CardContent className="p-6 relative">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 4, repeat: Infinity }}
                />
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-mystical flex items-center justify-center shadow-mystical">
                    <span className="text-3xl">{ZODIAC_SYMBOLS[profile?.sun_sign] || "✦"}</span>
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground mb-1">
                      Week of <span className="text-gradient-golden capitalize">{insights.weekTheme}</span>
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-sm ${elementInfo.color}`}>
                        {elementInfo.icon} {insights.element} Energy
                      </span>
                      <Badge variant="outline" className="border-accent/30 text-accent text-xs">
                        {profile?.sun_sign || "Unknown"} Season
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Daily Energy Forecast */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-card/70 backdrop-blur-sm border-border/40 glow-border mb-6">
              <CardContent className="p-5">
                <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-primary" />
                  Daily Energy Forecast
                </h3>
                <div className="flex gap-2 justify-between">
                  {insights.dailyEnergies.map((day, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className={`flex flex-col items-center gap-1.5 flex-1 rounded-xl p-2 ${
                        day.isToday ? "bg-primary/15 ring-1 ring-primary/30" : ""
                      }`}
                    >
                      <span className="text-[10px] text-muted-foreground font-medium">{day.day}</span>
                      <div className="flex flex-col gap-0.5">
                        {[3, 2, 1].map(level => (
                          <div
                            key={level}
                            className={`w-4 h-1.5 rounded-full transition-colors ${
                              (day.energy === "high" && level <= 3) ||
                              (day.energy === "medium" && level <= 2) ||
                              (day.energy === "low" && level <= 1)
                                ? day.energy === "high"
                                  ? "bg-green-400"
                                  : day.energy === "medium"
                                  ? "bg-accent"
                                  : "bg-muted-foreground/50"
                                : "bg-muted/40"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-foreground">{day.date}</span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Planetary Transits */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-card/70 backdrop-blur-sm border-border/40 glow-border mb-6">
              <CardContent className="p-5">
                <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-accent" />
                  Planetary Transits
                </h3>
                <div className="space-y-4">
                  {insights.transits.map((transit, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-sm">{transit.planet.split(" ")[0]}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground text-sm">{transit.planet}</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              transit.energy === "high"
                                ? "border-green-400/30 text-green-400"
                                : "border-accent/30 text-accent"
                            }`}
                          >
                            {transit.energy} energy
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-serif leading-relaxed">{transit.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Growth Focus */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="bg-card/70 backdrop-blur-sm border-border/40 glow-border mb-6">
              <CardContent className="p-5">
                <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  Personal Growth Focus
                </h3>
                <div className="space-y-3">
                  {insights.growthFocus.map((focus, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      className="flex items-start gap-2"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                      <p className="text-sm text-muted-foreground font-serif leading-relaxed">{focus}</p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Relationship Insight */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-2xl p-6 border border-accent/20 text-center">
              <Heart className="w-6 h-6 text-accent mx-auto mb-3" />
              <p className="text-foreground font-serif italic leading-relaxed">
                "This week's cosmic energy supports {insights.weekTheme} in all your relationships. Trust the timing of your connections."
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyInsights;
