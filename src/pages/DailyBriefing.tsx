import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Sun, Compass, Clock, Sparkles, BookOpen, CloudMoon, Loader2, RefreshCw, Save, Check, Share2, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDailyBriefing } from "@/hooks/useDailyBriefing";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toPng } from "html-to-image";

const DailyBriefing = () => {
  const { briefing, loading, error, refresh } = useDailyBriefing();
  const { user } = useAuth();
  const { toast } = useToast();
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const handleShare = async () => {
    if (!shareCardRef.current || !briefing) return;
    setSharing(true);
    try {
      const dataUrl = await toPng(shareCardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0b0a1a",
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `stellara-briefing-${briefing.briefing_date}.png`, {
        type: "image/png",
      });

      const navAny = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (navAny.canShare && navAny.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "My Cosmic Briefing — Stellara",
          text: `Today's energy: ${briefing.energy_theme} ✨`,
        });
      } else {
        const link = document.createElement("a");
        link.download = `stellara-briefing-${briefing.briefing_date}.png`;
        link.href = dataUrl;
        link.click();
        toast({
          title: "Card downloaded ✨",
          description: "Share it anywhere from your camera roll.",
        });
      }
    } catch (err) {
      console.error("[share]", err);
      toast({
        title: "Could not generate card",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSharing(false);
    }
  };

  const saveReflection = async () => {
    if (!briefing || !user || !reflection.trim()) return;
    setSaving(true);
    try {
      const { error: insErr } = await supabase
        .from("briefing_reflections")
        .insert({
          user_id: user.id,
          briefing_id: briefing.id,
          reflection: reflection.trim(),
        });
      if (insErr) throw insErr;
      setSaved(true);
      toast({ title: "Saved ✨", description: "Your reflection is in your private journal." });
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      toast({
        title: "Could not save",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 md:pt-24 pb-24 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.header
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center gap-2 mb-2 text-accent">
            <Sun className="w-5 h-5" />
            <span className="text-xs uppercase tracking-widest font-body">Daily Cosmic Briefing</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">{today}</h1>
          <p className="text-muted-foreground text-sm mt-1 font-body">
            Your personalised energy reading, tuned to your chart.
          </p>
        </motion.header>

        {loading && (
          <div className="flex flex-col items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-muted-foreground text-sm font-body">Reading the stars for you…</p>
          </div>
        )}

        {error && !loading && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-6 text-center">
              <p className="text-foreground text-sm mb-3">{error}</p>
              <Button onClick={refresh} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" /> Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {briefing && !loading && (
          <>
            {/* Hero theme */}
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="overflow-hidden border-accent/30 bg-gradient-to-br from-card via-card to-accent/10 mb-4">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-accent mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider font-body">Today's Theme</span>
                  </div>
                  <h2 className="font-display text-2xl text-foreground mb-3">
                    {briefing.energy_theme}
                  </h2>
                  {briefing.cosmic_weather && (
                    <p className="text-muted-foreground text-sm font-body leading-relaxed flex gap-2">
                      <CloudMoon className="w-4 h-4 mt-0.5 shrink-0 text-accent" />
                      <span>{briefing.cosmic_weather}</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Mood + Focus grid */}
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
                <Card className="h-full border-border/50 bg-card/80">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <Sun className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wider font-body">Mood</span>
                    </div>
                    <p className="text-foreground text-sm font-body leading-relaxed">{briefing.mood}</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                <Card className="h-full border-border/50 bg-card/80">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <Compass className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wider font-body">Focus</span>
                    </div>
                    <p className="text-foreground text-sm font-body leading-relaxed">{briefing.focus}</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Lucky window + Affirmation */}
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {briefing.lucky_window && (
                <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
                  <Card className="h-full border-accent/30 bg-accent/5">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 text-accent mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wider font-body">Lucky Window</span>
                      </div>
                      <p className="text-foreground font-display text-lg">{briefing.lucky_window}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
              {briefing.affirmation && (
                <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                  <Card className="h-full border-primary/30 bg-primary/5">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 text-primary mb-2">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wider font-body">Affirmation</span>
                      </div>
                      <p className="text-foreground text-sm font-body italic leading-relaxed">
                        "{briefing.affirmation}"
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Journal prompt */}
            <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
              <Card className="border-border/50 bg-card/80 mb-4">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-primary mb-3">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider font-body">Reflection Prompt</span>
                  </div>
                  <p className="text-foreground font-body leading-relaxed mb-4">
                    {briefing.journal_prompt}
                  </p>
                  <Textarea
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="Write what comes up… (private, only you can see it)"
                    className="min-h-[120px] bg-background/60"
                    maxLength={2000}
                  />
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs text-muted-foreground font-body">
                      {reflection.length}/2000
                    </span>
                    <Button
                      onClick={saveReflection}
                      disabled={!reflection.trim() || saving}
                      size="sm"
                      className="min-h-[40px]"
                    >
                      {saving ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving</>
                      ) : saved ? (
                        <><Check className="w-4 h-4 mr-2" /> Saved</>
                      ) : (
                        <><Save className="w-4 h-4 mr-2" /> Save reflection</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <p className="text-center text-xs text-muted-foreground font-body mt-6">
              ✨ A new briefing arrives each morning. Available on every Stellara plan.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default DailyBriefing;