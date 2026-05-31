import { useEffect, useState } from "react";
import { Zap, BookOpen, Sparkles } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CosmicBackground from "@/components/CosmicBackground";
import BodyGraph from "@/components/blueprint/BodyGraph";
import TermTooltip from "@/components/blueprint/TermTooltip";
import AskLyraButton from "@/components/blueprint/AskLyraButton";
import PremiumLock from "@/components/blueprint/PremiumLock";
import CachedAiSection from "@/components/blueprint/CachedAiSection";
import BackButton from "@/components/BackButton";
import ReadMore from "@/components/blueprint/ReadMore";

const SECTION_CLASS = "rounded-2xl border border-border/40 bg-card/70 backdrop-blur-md p-6";

const TYPE_BLURBS: Record<string, string> = {
  Manifestor: "You're here to initiate. About 9% of people. Your aura is closed and repelling — you don't wait, you start. The cost of not informing the people around you before you act is friction you didn't earn.\n\nYour energy comes in bursts, not steady flow. You're not built to work a 9-to-5 at full intensity all day. Rest is part of the job.\n\nWhat to watch for: people will react to your unilateral moves. Inform first, then move. It's not asking permission — it's defusing the resistance before it costs you.",
  Generator: "You're here to respond. About 37% of people. Your aura is open and enveloping — life brings things to you, and your gut tells you yes or no. When you try to initiate, you usually end up frustrated.\n\nYour energy is sacral — sustainable, renewable, designed to be used. When you do work you respond to, you can go all day and feel energized. When you push into work that's not yours, you collapse.\n\nWhat to watch for: the urge to jump first. Pause, wait for the cue, let the gut speak — then go all in.",
  "Manifesting Generator": "You're a Generator with Manifestor wiring. About 32% of people. You respond and you initiate — often in the same breath. You skip steps, do three things at once, and circle back to finish what you missed.\n\nYour energy is fast and multi-track. People will tell you to slow down or pick one thing. Don't. The skipping is the design.\n\nWhat to watch for: starting too many things and not finishing. Inform people when you change direction (you will).",
  Projector: "You're here to guide. About 21% of people. Your aura is focused and absorbing — you read other people's energy with uncanny accuracy.\n\nYou're not built to grind. You don't have sacral energy on tap. You work in concentrated bursts, then rest. A successful Projector life looks like fewer hours, deeper recognition, and being invited into the work that's actually yours.\n\nWhat to watch for: trying to keep up with Generators. You'll burn out. Wait for the invitation — into relationships, into work, into the next chapter.",
  Reflector: "You're here to mirror. About 1% of people. Your aura is sampling — you take in the energy of any room and reflect it back. You don't have any defined centers, so you experience life through the people around you.\n\nYour signature is surprise. Big decisions should follow a full lunar cycle of sitting with them. Quick-yes culture isn't yours.\n\nWhat to watch for: environment. Who and where you're around shapes how you feel. Choose carefully.",
};

const STRATEGY_BLURBS: Record<string, string> = {
  "To inform": "Before you act, tell the people your move will affect. You're not asking — you're defusing. Skipping this step is what creates the resistance you keep running into.",
  "To respond": "Wait for life to bring you something to respond to. Your gut answers in real time — a sound, a feeling, a yes/no. When you initiate from your head instead, you end up frustrated. Respond, then move full speed.",
  "To wait for the invitation": "Wait to be invited into the things that matter — relationships, opportunities, work. When the invitation is real, you'll feel it. Without it, your guidance lands sideways and people resist you, even when you're right.",
  "To wait a lunar cycle": "For big decisions, sit with it through a full lunar cycle (about 28 days). You'll sample the energy of the question from many angles. By the end you'll know — without forcing.",
};

const AUTHORITY_BLURBS: Record<string, string> = {
  Emotional: "You have an emotional wave. You feel high, you feel low, and the wave runs underneath everything. Wait for clarity through the wave before deciding anything important. Same yes in the morning, at noon, and at night — that's a real yes.",
  Sacral: "Your gut answers in real time with a guttural uh-huh or uh-uh. It doesn't explain itself. Trust the sound, not the story you tell about it.",
  Splenic: "Your authority is a quiet, in-the-moment intuition — a single hit, often quiet, never repeated. If you missed it, it's gone. Practice listening for it now, in low-stakes moments.",
  Ego: "Your authority sits in willpower and what you want. Decisions need to come from what's in it for you — not selfish, just honest. If you can't stand behind the want, don't commit.",
  "Self-Projected": "You decide by talking it out loud. Your voice, not your head. Find a trusted person who lets you think out loud without rescuing you. Your truth shows up in what you hear yourself say.",
  Mental: "You decide by talking to many people and noticing what stays consistent in your environment. You don't have a single inner signal — you have a chorus.",
  Lunar: "You decide across the lunar cycle. Big choices wait. You're not slow — you're thorough.",
};

const HumanDesign = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  const type = profile?.human_design_type;
  const strategy = profile?.human_design_strategy;
  const authority = profile?.human_design_authority;
  const hdProfile = profile?.human_design_profile;

  return (
    <div className="min-h-[100svh] relative">
      <CosmicBackground />
      <div className="relative z-10 pt-24 md:pt-28 pb-28 md:pb-12 px-5">
        <div className="max-w-md mx-auto">
          <BackButton fallback="/blueprint" label="Blueprint" className="mb-2" />

          <header className="mb-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">Science of self · II</p>
            <h1 className="font-display text-4xl font-bold bg-gradient-aurora bg-clip-text text-transparent mt-1">Human Design</h1>
          </header>

          {/* HERO — Bodygraph */}
          <section className={`${SECTION_CLASS} mb-8 flex flex-col items-center`}>
            <BodyGraph type={type} />
            <p className="mt-4 text-center text-xs text-muted-foreground max-w-xs leading-relaxed">
              The bodygraph — nine <TermTooltip term="centers" definition="Nine energy hubs in the body graph. Defined centers (filled) are consistent in you. Undefined centers (outlined) are open and amplifying — they take in and magnify the energy around you." /> connected by channels and gates.
            </p>
          </section>

          {/* SECTION 1 — Type */}
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold mb-1">Your Type</h2>
            <p className="text-xs text-muted-foreground mb-4">How you're energetically built.</p>
            <div className={SECTION_CLASS}>
              <h3 className="font-display text-2xl font-bold text-primary mb-3">{type || "—"}</h3>
              <ReadMore
                text={TYPE_BLURBS[type] || "Your type tells you how your aura works and how you're meant to use your energy. Ask Lyra for a personalized read."}
              />
              <AskLyraButton seed={`I'm a ${type}. What does that mean for how I work, rest, and move through life day-to-day?`} />
            </div>
          </section>

          {/* SECTION 2 — Strategy */}
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold mb-1">Strategy</h2>
            <p className="text-xs text-muted-foreground mb-4">The way you're designed to move.</p>
            <div className={SECTION_CLASS}>
              <h3 className="font-display text-lg font-semibold text-accent mb-2">{strategy || "—"}</h3>
              <ReadMore
                text={STRATEGY_BLURBS[strategy] || "Your strategy is how you avoid resistance and find flow. Ask Lyra what it looks like in practice for you."}
                className="text-sm text-foreground/90 leading-relaxed font-serif"
              />
              <AskLyraButton seed={`My HD strategy is "${strategy}". Give me three concrete examples of what this looks like in real life this week.`} />
            </div>
          </section>

          {/* SECTION 3 — Authority */}
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold mb-1">Authority</h2>
            <p className="text-xs text-muted-foreground mb-4">How you make decisions you can trust.</p>
            <div className={SECTION_CLASS}>
              <h3 className="font-display text-lg font-semibold text-accent mb-2">{authority || "—"}</h3>
              <ReadMore
                text={AUTHORITY_BLURBS[authority?.replace(/ Authority$/, "")] || "Your authority is your inner compass. Ask Lyra how to use it on real decisions you're sitting with."}
                className="text-sm text-foreground/90 leading-relaxed font-serif"
              />
              <AskLyraButton seed={`My authority is ${authority}. I'm sitting with a decision — walk me through how to use my authority on it.`} />
            </div>
          </section>

          {/* SECTION 4 — Profile */}
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold mb-1">Profile</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Two numbers that name your <TermTooltip term="profile" definition="A two-number archetype (like 1/3 or 5/1) describing your personality lines — how you investigate, how you affect others, and your life theme." /> — the role you play.
            </p>
            {hdProfile ? (
              <div className={SECTION_CLASS}>
                <h3 className="font-display text-2xl font-bold text-primary mb-3">{hdProfile}</h3>
                <PremiumLock
                  title={`What ${hdProfile} actually means`}
                  teaser={`Your ${hdProfile} profile describes two distinct lines that show up together: a conscious personality you operate from and an unconscious design others feel. Unlock the full read.`}
                  lyraSeed={`My HD profile is ${hdProfile}. Break down what each line means, how they interact, and what my life theme is.`}
                >
                  <CachedAiSection section="profile_detail" title={`Profile ${hdProfile} — full read`} />
                </PremiumLock>
              </div>
            ) : (
              <PremiumLock
                title="Your Profile"
                teaser="Your profile is your personality archetype — the role you play in relationships and the life theme you're here to live. Unlock to get yours."
                lyraSeed="What's my HD profile and what does it mean for how I live?"
              >
                <CachedAiSection section="profile_detail" title="Your HD Profile" />
              </PremiumLock>
            )}
          </section>

          {/* SECTION 5 — Centers */}
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold mb-1">Defined & Undefined Centers</h2>
            <p className="text-xs text-muted-foreground mb-4">Where you're consistent — and where you take in the room.</p>
            <PremiumLock
              title="Your 9 Centers"
              teaser="Defined centers are your fixed traits — the way you reliably operate. Undefined centers are where you take in and amplify other people's energy. Unlock to see all nine centers personalized to you."
              lyraSeed="Walk me through my nine centers — which are defined, which are undefined, and what each one means for how I show up."
            >
              <CachedAiSection section="centers" title="Your 9 Centers" />
            </PremiumLock>
          </section>

          {/* SECTION 6 — Channels & Gates */}
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold mb-1">Channels & Gates</h2>
            <p className="text-xs text-muted-foreground mb-4">
              <TermTooltip term="Channels" definition="Connections between two defined centers — they create consistent themes in your design." /> and <TermTooltip term="gates" definition="64 archetypes (mirroring the I Ching) activated in your bodygraph. Each gate has a name and a theme." /> — the wiring of your design.
            </p>
            <PremiumLock
              title="Your active channels & gates"
              teaser="Each active gate carries a specific theme. Active channels turn pairs of gates into life-long signatures. Unlock to see what's wired in your design and what it means."
              lyraSeed="What channels and gates are active in my design, and what are the headline themes I should know?"
            >
              <CachedAiSection section="channels" title="Your Channels & Gates" />
            </PremiumLock>
          </section>

          {/* SECTION 7 — Incarnation Cross */}
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold mb-1">Incarnation Cross</h2>
            <p className="text-xs text-muted-foreground mb-4">Your HD life-purpose theme.</p>
            <PremiumLock
              title="What you're here to embody"
              teaser="Your Incarnation Cross is built from your Sun and Earth — conscious and unconscious. It names the larger theme you're here to live out across this lifetime."
              lyraSeed="What's my Incarnation Cross, and what is it asking me to embody in this lifetime?"
            >
              <CachedAiSection section="incarnation_cross" title="Your Incarnation Cross" />
            </PremiumLock>
          </section>

          {/* SECTION 8 — Learn */}
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold mb-1 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-accent" /> Learn Human Design
            </h2>
            <div className={SECTION_CLASS}>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="what">
                  <AccordionTrigger className="text-sm font-display">What is Human Design?</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    A synthesis of astrology, the I Ching, the Kabbalah, the chakras, and quantum physics — distilled into a single chart that tells you how your energy is built and how you're designed to make decisions.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="parts">
                  <AccordionTrigger className="text-sm font-display">Type, Strategy, Authority — start here</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    Most of HD reduces to three things: <strong className="text-foreground">Type</strong> (how your energy works), <strong className="text-foreground">Strategy</strong> (how you move without resistance), and <strong className="text-foreground">Authority</strong> (how you make decisions). Live by those three for 30 days and you'll feel the difference.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="glossary">
                  <AccordionTrigger className="text-sm font-display">Glossary</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed space-y-2">
                    <p><strong className="text-foreground">Aura</strong> — your energy field; each Type has a distinct one.</p>
                    <p><strong className="text-foreground">Not-self</strong> — the version of you that emerges when you ignore your Strategy and Authority.</p>
                    <p><strong className="text-foreground">Deconditioning</strong> — the process of returning to your own design after years of being shaped by others.</p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <AskLyraButton seed="Walk me through my bodygraph — type, strategy, authority, profile, and the centers — like I'm new to Human Design." label="Ask Lyra to walk me through my bodygraph" />
            </div>
          </section>

          <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5 flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-accent shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Strategy is what you do. Alignment is when you do it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HumanDesign;