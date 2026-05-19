import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Hash, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CosmicBackground from "@/components/CosmicBackground";
import numerologyMandala from "@/assets/numerology-mandala.png";

const Numerology = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  const cells = [
    { label: "Life Path", value: profile?.life_path_number, hint: "Your core lesson and direction across this lifetime." },
    { label: "Birthday", value: profile?.birthday_number, hint: "A natural talent stamped on you at birth." },
    { label: "Personal Year", value: profile?.personal_year_number, hint: "The theme of your current 12-month cycle." },
    { label: "Expression", value: profile?.expression_number, hint: "How your gifts come out into the world." },
    { label: "Soul Urge", value: profile?.soul_urge_number, hint: "What your heart actually wants beneath the noise." },
  ];

  return (
    <div className="min-h-[100svh] relative">
      <CosmicBackground />
      <div className="relative z-10 pt-20 md:pt-24 pb-28 md:pb-12 px-5">
        <div className="max-w-md mx-auto">
          <button onClick={() => navigate("/blueprint")} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" /> Blueprint
          </button>

          <header className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">Science of self · III</p>
            <h1 className="font-display text-3xl font-bold bg-gradient-aurora bg-clip-text text-transparent mt-1 flex items-center gap-2">
              <Hash className="w-6 h-6 text-primary" /> Numerology
            </h1>
          </header>

          <Card className="mb-5 bg-card/80 backdrop-blur-md border-border/50 overflow-hidden relative">
            <div className="absolute top-3 right-3 w-20 h-20 opacity-10">
              <img src={numerologyMandala} alt="" className="w-full h-full object-contain" />
            </div>
            <CardContent className="p-6 relative">
              <div className="grid grid-cols-2 gap-3">
                {cells.map((c) => (
                  <div key={c.label} className="rounded-xl bg-background/40 border border-border/30 p-4 flex flex-col">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{c.label}</div>
                    <div className="font-display text-3xl font-bold text-primary mt-1">{c.value ?? "—"}</div>
                    <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{c.hint}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-2 border-border/50">
                <Info className="w-4 h-4" /> Master & karmic numbers
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 rounded-xl border border-border/40 bg-card/60 p-4 text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p><strong className="text-foreground">Master numbers (11, 22, 33)</strong> — high-vibration numbers that aren't reduced. They carry intensity and purpose.</p>
              <p><strong className="text-foreground">Karmic debt (13, 14, 16, 19)</strong> — patterns you're here to consciously balance this lifetime.</p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
};

export default Numerology;