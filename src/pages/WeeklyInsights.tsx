import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CosmicBackground from "@/components/CosmicBackground";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Star, Moon, Sun, Zap, Flame, Droplets, Wind, Mountain, Heart, TrendingUp, Calendar, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

interface AIInsights {
  week_theme: string;
  weekly_overview: string;
  transits: { planet: string; description: string; energy: "high" | "medium" | "low" }[];
  daily_energies: { day: string; energy: "high" | "medium" | "low"; intention: string }[];
  growth_focus: string[];
  relationship_quote: string;
}

const WeeklyInsights = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [generating, setGenerating] = useState(false);

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

  // Try to load cached insights from localStorage
  useEffect(() => {
    if (!user) return;
    const cacheKey = `weekly_insights_${user.id}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data, weekKey } = JSON.parse(cached);
        const now = new Date();
        const currentWeekKey = `${now.getFullYear()}-W${Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 604800000)}`;
        if (weekKey === currentWeekKey) {
          setAiInsights(data);
        }
      } catch {}
    }
  }, [user]);

  const generateInsights = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-weekly-insights");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAiInsights(data);

      // Cache for the week
      const now = new Date();
      const weekKey = `${now.getFullYear()}-W${Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 604800000)}`;
      localStorage.setItem(`weekly_insights_${user.id}`, JSON.stringify({ data, weekKey }));

      toast.success("Your personalized cosmic reading is ready ✨");
    } catch (e: any) {
      console.error("Failed to generate insights:", e);
      toast.error(e.message || "Failed to generate insights");
    } finally {
      setGenerating(false);
    }
  };

  // Auto-generate on first load if no cached insights
  useEffect(() => {
    if (!loading && profile && !aiInsights && !generating) {
      generateInsights();
    }
  }, [loading, profile, aiInsights]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const element = getElement(profile?.sun_sign);
  const elementInfo = ELEMENT_MAP[element] || ELEMENT_MAP.Fire;
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  // Map daily energies to include date numbers
  const dailyEnergiesWithDates = (aiInsights?.daily_energies || []).map((de, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    return {
      ...de,
      date: day.getDate(),
      isToday: day.toDateString() === now.toDateString(),
    };
  });

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

          {/* Generating State */}
          {generating && !aiInsights && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 mx-auto mb-6"
              >
                <Sparkles className="w-16 h-16 text-primary" />
              </motion.div>
              <p className="text-foreground font-display text-lg mb-2">Reading the stars for you…</p>
              <p className="text-muted-foreground text-sm font-serif">Generating your personalized cosmic reading</p>
            </motion.div>
          )}

          {aiInsights && (
            <>
              {/* Week Theme Header */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="glass-card mb-6 overflow-hidden">
                  <CardContent className="p-6 relative">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent"
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 4, repeat: Infinity }}
                    />
                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-mystical flex items-center justify-center shadow-mystical">
                          <span className="text-3xl">{ZODIAC_SYMBOLS[profile?.sun_sign] || "✦"}</span>
                        </div>
                        <div>
                          <h2 className="font-display text-xl font-bold text-foreground mb-1">
                            <span className="text-gradient-golden">{aiInsights.week_theme}</span>
                          </h2>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 text-sm ${elementInfo.color}`}>
                              {elementInfo.icon} {element} Energy
                            </span>
                            <Badge variant="outline" className="border-accent/30 text-accent text-xs">
                              {profile?.sun_sign || "Unknown"} Season
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground font-serif leading-relaxed">
                        {aiInsights.weekly_overview}
                      </p>
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
                    <div className="flex gap-2 justify-between mb-4">
                      {dailyEnergiesWithDates.map((day, i) => (
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
                    {/* Daily intentions */}
                    {dailyEnergiesWithDates.map((day, i) => (
                      day.isToday && day.intention ? (
                        <div key={i} className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                          <p className="text-xs text-muted-foreground mb-1 font-medium">Today's Intention</p>
                          <p className="text-sm text-foreground font-serif">{day.intention}</p>
                        </div>
                      ) : null
                    ))}
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
                      {aiInsights.transits.map((transit, i) => (
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
                                    : transit.energy === "medium"
                                    ? "border-accent/30 text-accent"
                                    : "border-muted-foreground/30 text-muted-foreground"
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
                      {aiInsights.growth_focus.map((focus, i) => (
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
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-2xl p-6 border border-accent/20 text-center mb-6">
                  <Heart className="w-6 h-6 text-accent mx-auto mb-3" />
                  <p className="text-foreground font-serif italic leading-relaxed">
                    "{aiInsights.relationship_quote}"
                  </p>
                </div>
              </motion.div>

              {/* Regenerate Button */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateInsights}
                  disabled={generating}
                  className="border-accent/30 text-accent hover:bg-accent/10"
                >
                  {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Regenerate Reading
                </Button>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeeklyInsights;
