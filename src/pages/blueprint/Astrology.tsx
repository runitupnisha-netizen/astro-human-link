import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Star, Info, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CosmicBackground from "@/components/CosmicBackground";
import zodiacWheel from "@/assets/zodiac-wheel.png";

const PLANET_GLOSSARY: Record<string, string> = {
  Sun: "Core identity — who you are at your essence.",
  Moon: "Emotional inner world — how you feel and self-soothe.",
  Rising: "Outer mask — how strangers first experience you.",
};

const Astrology = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  return (
    <div className="min-h-[100svh] relative">
      <CosmicBackground />
      <div className="relative z-10 pt-20 md:pt-24 pb-28 md:pb-12 px-5">
        <div className="max-w-md mx-auto">
          <button onClick={() => navigate("/blueprint")} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" /> Blueprint
          </button>

          <header className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">Science of self · I</p>
            <h1 className="font-display text-3xl font-bold bg-gradient-aurora bg-clip-text text-transparent mt-1 flex items-center gap-2">
              <Star className="w-6 h-6 text-primary" /> Astrology
            </h1>
          </header>

          {/* Three luminaries */}
          <Card className="mb-5 bg-card/80 backdrop-blur-md border-border/50 overflow-hidden relative">
            <div className="absolute top-3 right-3 w-20 h-20 opacity-15">
              <img src={zodiacWheel} alt="" className="w-full h-full object-contain" />
            </div>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold mb-4">Three Luminaries</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { symbol: "☉", label: "Sun", value: profile?.sun_sign },
                  { symbol: "☽", label: "Moon", value: profile?.moon_sign },
                  { symbol: "↗", label: "Rising", value: profile?.rising_sign },
                ].map((p) => (
                  <div key={p.label} className="text-center rounded-xl bg-background/40 border border-border/30 p-3">
                    <div className="text-2xl font-bold text-primary">{p.symbol}</div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground mt-1">{p.label}</div>
                    <div className="font-medium text-sm mt-0.5">{p.value || "—"}</div>
                    <p className="text-[10px] text-muted-foreground/80 mt-2 leading-relaxed">{PLANET_GLOSSARY[p.label]}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Narrative summary */}
          {profile?.astro_summary && (
            <Card className="mb-5 bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="p-6">
                <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" /> Your Reading
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{profile.astro_summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Glossary */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-2 border-border/50">
                <Info className="w-4 h-4" /> What do these terms mean?
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 rounded-xl border border-border/40 bg-card/60 p-4 text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p><strong className="text-foreground">Natal chart</strong> — a snapshot of the sky at the moment you were born.</p>
              <p><strong className="text-foreground">Transits</strong> — where the planets are now, in relationship to your natal positions.</p>
              <p><strong className="text-foreground">Aspect</strong> — the geometric angle between two planets and the energy it creates.</p>
            </CollapsibleContent>
          </Collapsible>

          <Button
            variant="outline"
            className="mt-6 w-full border-primary/40 text-primary"
            onClick={() => navigate("/profile")}
          >
            Edit birth details
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Astrology;