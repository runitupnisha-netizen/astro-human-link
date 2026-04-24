import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Heart, Loader2, ChevronDown, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import CosmicBackground from "@/components/CosmicBackground";

type Signs = { sun: string | null; moon: string | null; rising: string | null };
type Result = {
  score: number;
  summary: string;
  highlight: string;
  mySigns: Signs;
  theirSigns: { sun: string; moon: string | null; rising: string | null; lifePath: number };
  breakdown: {
    astro: { score: number; note: string };
    elements: { score: number; note: string };
    numerology: { score: number; note: string };
  };
};

const ScoreRing = ({ score }: { score: number }) => {
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const hue = score >= 80 ? "from-amber-300 to-rose-400" : score >= 65 ? "from-violet-300 to-fuchsia-400" : "from-blue-300 to-indigo-400";

  return (
    <div className="relative w-56 h-56 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={radius} stroke="hsl(var(--border))" strokeWidth="6" fill="none" opacity="0.3" />
        <motion.circle
          cx="100" cy="100" r={radius}
          stroke="url(#scoreGradient)" strokeWidth="6" fill="none"
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(45 93% 65%)" />
            <stop offset="100%" stopColor="hsl(330 81% 70%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className={`text-6xl font-display bg-gradient-to-br ${hue} bg-clip-text text-transparent`}
        >
          {score}
        </motion.div>
        <span className="text-xs uppercase tracking-widest text-muted-foreground mt-1">alignment</span>
      </div>
    </div>
  );
};

const SignTrio = ({ label, signs }: { label: string; signs: { sun: string | null; moon: string | null; rising: string | null } }) => (
  <div className="text-center space-y-1">
    <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    <div className="flex items-center justify-center gap-3 text-sm">
      <span title="Sun">☉ {signs.sun || "—"}</span>
      <span className="text-border">·</span>
      <span title="Moon">☽ {signs.moon || "—"}</span>
      <span className="text-border">·</span>
      <span title="Rising">↗ {signs.rising || "—"}</span>
    </div>
  </div>
);

const FindMatch = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [mySigns, setMySigns] = useState<Signs>({ sun: null, moon: null, rising: null });
  const [myLifePath, setMyLifePath] = useState<number | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [theirName, setTheirName] = useState("");
  const [theirDate, setTheirDate] = useState("");
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("sun_sign, moon_sign, rising_sign, life_path_number")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setMySigns({ sun: data.sun_sign, moon: data.moon_sign, rising: data.rising_sign });
        setMyLifePath(data.life_path_number);
      }
      setProfileLoading(false);
    })();
  }, [user]);

  const calculate = async () => {
    if (!theirDate) {
      toast({ title: "Add their birth date", description: "We need at least a date to read the energy.", variant: "destructive" });
      return;
    }
    if (!mySigns.sun) {
      toast({ title: "Your chart is missing", description: "Complete your cosmic profile first.", variant: "destructive" });
      return;
    }
    setCalculating(true);
    setResult(null);
    setOpen(false);
    try {
      const { data, error } = await supabase.functions.invoke("find-match", {
        body: { mySigns, myLifePath, theirBirthDate: theirDate, theirName: theirName.trim() || null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as Result);
    } catch (e: any) {
      toast({ title: "Couldn't read the stars", description: e.message || "Try again in a moment.", variant: "destructive" });
    } finally {
      setCalculating(false);
    }
  };

  const reset = () => {
    setResult(null);
    setOpen(false);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <CosmicBackground />
      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-24 pb-32 md:pt-32">
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> My Cosmos
        </button>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 space-y-2"
        >
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-amber-400/80">
            <Sparkles className="w-3 h-3" /> Cosmic Calculator
          </div>
          <h1 className="text-4xl font-display">Find My Match</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Drop in anyone's birth details — Lyra reads the energy between your charts in seconds.
          </p>
        </motion.div>

        {!result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/50 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="theirName">Their name <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="theirName"
                  value={theirName}
                  onChange={(e) => setTheirName(e.target.value)}
                  placeholder="e.g. Alex"
                  maxLength={40}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="theirDate">Their birth date</Label>
                <Input
                  id="theirDate"
                  type="date"
                  value={theirDate}
                  onChange={(e) => setTheirDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
              <Button
                onClick={calculate}
                disabled={calculating || profileLoading}
                className="w-full bg-gradient-to-r from-amber-400 to-rose-400 text-background hover:opacity-90"
                size="lg"
              >
                {calculating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Reading the stars…</>
                ) : (
                  <><Heart className="w-4 h-4 mr-2" /> Calculate alignment</>
                )}
              </Button>
              {!profileLoading && !mySigns.sun && (
                <p className="text-xs text-center text-muted-foreground">
                  Complete your cosmic profile first to enable readings.
                </p>
              )}
            </Card>
          </motion.div>
        )}

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* LAYER 1 — Score, summary, comparison, highlight */}
              <Card className="p-6 md:p-8 bg-card/60 backdrop-blur-xl border-border/50 space-y-6">
                <ScoreRing score={result.score} />

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-center text-base leading-relaxed text-foreground/90 italic max-w-md mx-auto"
                >
                  {result.summary}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/30"
                >
                  <SignTrio label="You" signs={result.mySigns} />
                  <SignTrio
                    label={theirName.trim() || "Them"}
                    signs={{ sun: result.theirSigns.sun, moon: result.theirSigns.moon, rising: result.theirSigns.rising }}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1, duration: 0.5 }}
                  className="text-center px-4 py-3 rounded-lg bg-gradient-to-r from-amber-400/10 via-rose-400/10 to-violet-400/10 border border-amber-400/20"
                >
                  <p className="text-sm font-medium text-amber-200/90">{result.highlight}</p>
                </motion.div>
              </Card>

              {/* LAYER 2 — Dive deeper */}
              <Collapsible open={open} onOpenChange={setOpen}>
                <CollapsibleTrigger asChild>
                  <button className="w-full group flex items-center justify-center gap-2 py-3 text-sm text-amber-300/80 hover:text-amber-200 transition-colors">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="tracking-wide">{open ? "Close" : "Dive deeper"} ✦</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                  <div className="space-y-3 pt-2">
                    {[
                      { key: "astro", label: "Astro Synastry", ...result.breakdown.astro },
                      { key: "elements", label: "Elemental Balance", ...result.breakdown.elements },
                      { key: "numerology", label: "Numerology", ...result.breakdown.numerology },
                    ].map((c, i) => (
                      <motion.div
                        key={c.key}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                      >
                        <Card className="p-4 bg-card/40 backdrop-blur-md border-border/30 flex items-center gap-4">
                          <div className="flex-shrink-0 w-12 h-12 rounded-full border border-amber-400/30 flex items-center justify-center bg-amber-400/5">
                            <span className="text-sm font-display text-amber-200">{c.score}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{c.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{c.note}</p>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Button
                onClick={reset}
                variant="outline"
                className="w-full bg-card/40 backdrop-blur-md border-border/50"
              >
                Read another connection
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FindMatch;