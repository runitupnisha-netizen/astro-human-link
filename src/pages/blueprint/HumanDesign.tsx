import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Zap, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CosmicBackground from "@/components/CosmicBackground";
import humanDesignBody from "@/assets/human-design-body.png";

const HumanDesign = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  const cells = [
    { label: "Type", value: profile?.human_design_type, hint: "Your energetic blueprint — how your aura interacts with the world." },
    { label: "Strategy", value: profile?.human_design_strategy, hint: "The natural way you're designed to move and make things happen." },
    { label: "Authority", value: profile?.human_design_authority, hint: "Your inner compass for decisions — the signal you can trust most." },
    { label: "Profile", value: profile?.human_design_profile, hint: "Your personality archetype — the role you play in relationships." },
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
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">Science of self · II</p>
            <h1 className="font-display text-3xl font-bold bg-gradient-aurora bg-clip-text text-transparent mt-1 flex items-center gap-2">
              <Zap className="w-6 h-6 text-accent" /> Human Design
            </h1>
          </header>

          <Card className="mb-5 bg-card/80 backdrop-blur-md border-border/50 overflow-hidden relative">
            <div className="absolute top-3 right-3 w-16 h-24 opacity-15">
              <img src={humanDesignBody} alt="" className="w-full h-full object-contain" />
            </div>
            <CardContent className="p-6 relative">
              <div className="space-y-4">
                {cells.map((c) => (
                  <div key={c.label} className="rounded-xl bg-background/40 border border-border/30 p-4">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{c.label}</div>
                    <div className="font-display text-lg font-semibold mt-0.5 text-foreground">{c.value || "—"}</div>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{c.hint}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {profile?.human_design_summary && (
            <Card className="mb-5 bg-card/80 backdrop-blur-md border-border/50">
              <CardContent className="p-6">
                <h2 className="font-display text-lg font-semibold mb-3">Your Design</h2>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{profile.human_design_summary}</p>
              </CardContent>
            </Card>
          )}

          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-2 border-border/50">
                <Info className="w-4 h-4" /> What do these terms mean?
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 rounded-xl border border-border/40 bg-card/60 p-4 text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p><strong className="text-foreground">Centers</strong> — nine energy hubs in the body graph. Defined centers are consistent; undefined are open and amplifying.</p>
              <p><strong className="text-foreground">Gates</strong> — 64 archetypes (mirroring the I Ching) activated in your design.</p>
              <p><strong className="text-foreground">Channels</strong> — the wiring between centers that defines your aura.</p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
};

export default HumanDesign;