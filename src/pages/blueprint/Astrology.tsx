import { useEffect, useState } from "react";
import { Star, BookOpen, Sun, Moon, ArrowUpRight, Sparkles } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CosmicBackground from "@/components/CosmicBackground";
import NatalWheel from "@/components/blueprint/NatalWheel";
import TermTooltip from "@/components/blueprint/TermTooltip";
import AskLyraButton from "@/components/blueprint/AskLyraButton";
import PremiumLock from "@/components/blueprint/PremiumLock";
import CachedAiSection from "@/components/blueprint/CachedAiSection";
import BackButton from "@/components/BackButton";
import ReadMore from "@/components/blueprint/ReadMore";

const SECTION_CLASS = "rounded-2xl border border-border/40 bg-card/70 backdrop-blur-md p-6";

const Big3Block = ({ icon: Icon, label, sign, body }: { icon: any; label: string; sign?: string | null; body: string }) => (
  <article className="rounded-xl bg-background/40 border border-border/30 p-5">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4 text-accent" />
      <h3 className="font-display text-base font-semibold">{label}</h3>
      {sign && <span className="text-sm text-muted-foreground">in {sign}</span>}
    </div>
    <ReadMore
      text={body}
      className="text-sm leading-relaxed text-foreground/90 font-serif whitespace-pre-line"
      collapsedChars={260}
    />
  </article>
);

// Lightweight personalized blurbs keyed off sign — enough to feel personal
// without needing the cosmic engine. Lyra is one tap away for full depth.
const SUN_BLURBS: Record<string, string> = {
  Aries: "Your core identity moves first and asks questions later. You're wired for initiation — the room changes when you decide it does. Your work is to channel that fire into things worth starting.",
  Taurus: "Your essence is steady, sensual, and unhurried. You build worth slowly and won't be rushed by anyone's urgency. Your work is to stay rooted without becoming stuck.",
  Gemini: "You're a connector and code-switcher — curious about everything, fluent in many rooms. Your work is to choose which threads you actually weave instead of touching them all.",
  Cancer: "You're tidal: your inner life moves in and out, and so do the people you love. You're here to learn that softness is a kind of strength, not a leak.",
  Leo: "You're meant to be seen — but the deeper play is being witnessed without performing. Your work is to lead from a full heart, not a hungry one.",
  Virgo: "You're a craftsperson of the small thing done well. Your eye for what's off is a gift; your work is to use it on systems, not on yourself.",
  Libra: "You're wired for relationship and aesthetic balance. The risk is averaging yourself toward whoever's in front of you. Your work is to know your own taste before you negotiate.",
  Scorpio: "You go to the bottom of things. You don't trust the surface and people feel that. Your work is intimacy without armor — and knowing when to come back up for air.",
  Sagittarius: "Your essence is a question mark with legs. You're here for the bigger frame — meaning, travel, philosophy. Your work is to land a few of the arrows you shoot.",
  Capricorn: "You're built for the long arc. You don't need permission and you don't need applause. Your work is to make sure the mountain you're climbing is actually yours.",
  Aquarius: "You see the system from outside the system. You're here to be a useful outlier. Your work is to stay warm while you stay weird.",
  Pisces: "You feel everything and you know more than you can prove. Your work is to keep the channel open without dissolving — boundaries are sacred for you.",
};

const MOON_BLURBS: Record<string, string> = {
  Aries: "You feel through action — sitting with emotion makes you itchy. You self-soothe by moving. Notice when you're sprinting away from a feeling.",
  Taurus: "You self-soothe through the body — food, touch, comfort, beauty. Stability is medicine for you. Don't let comfort calcify into avoidance.",
  Gemini: "You process by talking it out and reading about it. Your feelings need words. Pick a person or a journal — don't keep it all in your head.",
  Cancer: "You feel everything in the body and remember everything in the bones. Home and chosen family are non-negotiable for you.",
  Leo: "You need to feel celebrated, not just acknowledged. Underneath: you want to know your love matters. Say it out loud.",
  Virgo: "You process by ordering — when life feels chaotic you organize a drawer. Healthy. Just don't pathologize your own emotions.",
  Libra: "You regulate through harmony and beauty. Conflict drains you fast. Learn to tolerate the temporary discomfort of a hard conversation.",
  Scorpio: "You feel things at full volume even when you look calm. Your inner life is private and intense. Trust takes time — and that's correct.",
  Sagittarius: "You need space and horizon to feel okay. Caged-in feelings turn into restlessness. Travel — even small trips — regulates you.",
  Capricorn: "You self-soothe by getting things done. You're more emotional than you let on. Let someone in before you've earned the right to need them.",
  Aquarius: "You process emotion at arm's length first, then warm up. People can mistake that for coldness. It's not — it's how you stay regulated.",
  Pisces: "You feel other people's weather as your own. You need water, art, and alone-time to discharge. Boundaries are how you stay you.",
};

const RISING_BLURBS: Record<string, string> = {
  Aries: "Strangers experience you as direct, fast, and a little intense. You walk into rooms — you don't drift in.",
  Taurus: "You come across as grounded and unhurried. People relax around you. They also underestimate your stubbornness.",
  Gemini: "You read as quick, curious, and witty. People want to talk to you. The risk is being remembered as clever instead of deep.",
  Cancer: "You come across as warm, careful, and a little guarded. People feel safer near you than they can explain.",
  Leo: "You enter rooms. People orient to you whether you want them to or not. Use it on purpose.",
  Virgo: "You read as composed, observant, and a touch reserved. People assume you have it together — give them the real version sometimes.",
  Libra: "You come across as charming, balanced, and easy to be around. People may not realize how much editing happens before they meet you.",
  Scorpio: "You read as private and magnetic. People feel watched. You don't owe anyone access — but choose intimacy on purpose, not by default.",
  Sagittarius: "You come across as open, funny, and a little ungrounded. People trust you fast. Don't waste that.",
  Capricorn: "You read as older, calmer, and more capable than you are. People hand you responsibility. Choose your yeses.",
  Aquarius: "You come across as a little different — interesting, distant, hard to pin down. That's the brand. Lean in.",
  Pisces: "You read as soft, dreamy, and intuitive. People project a lot onto you. Decide who gets close.",
};

const Astrology = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  const sun = profile?.sun_sign;
  const moon = profile?.moon_sign;
  const rising = profile?.rising_sign;

  return (
    <div className="min-h-[100svh] relative">
      <CosmicBackground />
      <div className="relative z-10 pt-24 md:pt-28 pb-28 md:pb-12 px-5">
        <div className="max-w-md mx-auto">
          <BackButton fallback="/blueprint" label="Blueprint" className="mb-2" />

          <header className="mb-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">Science of self · I</p>
            <h1 className="font-display text-4xl font-bold bg-gradient-aurora bg-clip-text text-transparent mt-1">Astrology</h1>
          </header>

          {/* HERO — Natal wheel */}
          <section className={`${SECTION_CLASS} mb-8 flex flex-col items-center`}>
            <NatalWheel sun={sun} moon={moon} rising={rising} />
            <p className="mt-4 text-center text-xs text-muted-foreground max-w-xs leading-relaxed">
              Your natal chart — a snapshot of the sky the moment you were born.
            </p>
          </section>

          {/* SECTION 1 — Big 3 */}
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold mb-1">Your Big Three</h2>
            <p className="text-xs text-muted-foreground mb-4">The three placements that shape how you live, feel, and arrive.</p>
            <div className="space-y-3">
              <Big3Block icon={Sun} label="Sun" sign={sun} body={SUN_BLURBS[sun] || "Your core identity, the steady flame at your center. Ask Lyra for a personalized read."} />
              <Big3Block icon={Moon} label="Moon" sign={moon} body={MOON_BLURBS[moon] || "Your inner world — how you feel and self-soothe."} />
              <Big3Block icon={ArrowUpRight} label="Rising" sign={rising} body={RISING_BLURBS[rising] || "Your outer mask — how strangers first meet you."} />
            </div>
            {sun && moon && rising && (
              <p className="mt-4 text-sm text-center font-serif italic text-muted-foreground/90">
                You are a <span className="text-foreground">{sun}</span> who feels like a <span className="text-foreground">{moon}</span> and shows up as a <span className="text-foreground">{rising}</span>.
              </p>
            )}
            <AskLyraButton seed={`Tell me how my Sun in ${sun}, Moon in ${moon}, and ${rising} Rising work together. Where do they cooperate, and where do they fight?`} />
          </section>

          {/* SECTION 2 — Planets */}
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold mb-1">The Planets</h2>
            <p className="text-xs text-muted-foreground mb-4">Each planet runs a part of your inner government.</p>
            <PremiumLock
              title="Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto"
              teaser="Your Mercury shows how you think and speak. Venus runs love, money, and taste. Mars is how you fight and want. Outer planets — Jupiter through Pluto — describe your generation and your fate. Unlock to see all eight personalized to your chart."
              lyraSeed="Walk me through my Mercury, Venus, and Mars placements — what sign and house, and what each one says about me."
            >
              <CachedAiSection
                section="planets"
                title="Your Personal & Outer Planets"
                lyraSeedFallback="Walk me through my Mercury, Venus, and Mars placements."
              />
            </PremiumLock>
          </section>

          {/* SECTION 3 — Houses */}
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold mb-1">Your Houses</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Twelve <TermTooltip term="houses" definition="The 12 life areas of the natal chart — self, money, communication, home, creativity, work, partnership, depth, philosophy, career, community, the unconscious." /> — every area of your life sits in one.
            </p>
            <PremiumLock
              title="All 12 Life Houses"
              teaser="What planets sit in your 7th house tells you a lot about partnership. An empty house isn't dead — it's ruled by another planet. Unlock to see what's in each of your twelve houses and what each one means for you."
              lyraSeed="Walk me through all 12 houses of my natal chart — what's in each and what the empty ones mean."
            >
              <CachedAiSection section="houses" title="Your 12 Life Houses" />
            </PremiumLock>
          </section>

          {/* SECTION 4 — Aspects */}
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold mb-1">Aspects</h2>
            <p className="text-xs text-muted-foreground mb-4">
              The angles between your planets — <TermTooltip term="conjunction" definition="Two planets in roughly the same spot — they fuse and act as one." />, <TermTooltip term="square" definition="A 90° tension between two planets — friction that forces growth." />, <TermTooltip term="trine" definition="A 120° harmony — gifts that come easily and need to be used on purpose." />, <TermTooltip term="opposition" definition="A 180° face-off — you have to integrate two opposite drives." />, <TermTooltip term="sextile" definition="A 60° opportunity — talent that activates when you reach for it." />.
            </p>
            <PremiumLock
              title="Your Personalized Aspects"
              teaser="Your Mars square Saturn means you feel held back when you act — and learning to act anyway is your work. Unlock to see all the major aspects in your chart with a plain-English read on each."
              lyraSeed="What are the major aspects in my chart, and what do they mean for how I move through life?"
            >
              <CachedAiSection section="aspects" title="Your Major Aspects" />
            </PremiumLock>
          </section>

          {/* SECTION 5 — Today's Sky */}
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold mb-1">Today's Sky</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Current <TermTooltip term="transits" definition="Where the planets are right now relative to your natal positions — the live weather over your chart." /> across your chart. Refreshes daily.
            </p>
            <PremiumLock
              title="Live transits over your chart"
              teaser="Right now Mars is moving through one of your houses, kicking up energy in a specific life area. Mercury is highlighting a different one. Unlock to get today's sky read against your personal chart, every day."
              lyraSeed="What's the sky doing today against my natal chart? Give me the top three transits to pay attention to and what to do about each."
            >
              <CachedAiSection section="transits" title="Today's Sky over your chart" />
            </PremiumLock>
          </section>

          {/* SECTION 6 — Learn */}
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold mb-1 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-accent" /> Learn Astrology
            </h2>
            <p className="text-xs text-muted-foreground mb-4">New to this? Start here.</p>
            <div className={SECTION_CLASS}>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="what">
                  <AccordionTrigger className="text-sm font-display">What is a natal chart?</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    A snapshot of where every planet was at the moment you were born — from the angle of your birthplace. It's a personalized map, not a generic horoscope.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="signs">
                  <AccordionTrigger className="text-sm font-display">Signs, planets, houses — what's the difference?</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Planets</strong> are who's acting. <strong className="text-foreground">Signs</strong> are the costume they're wearing — the style of expression. <strong className="text-foreground">Houses</strong> are where it's happening in your life.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="transits">
                  <AccordionTrigger className="text-sm font-display">What are transits?</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    The current sky moving across your fixed natal chart. They're how astrology "predicts" — by reading the weather, not your fate.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="glossary">
                  <AccordionTrigger className="text-sm font-display">Glossary</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed space-y-2">
                    <p><strong className="text-foreground">Ascendant / Rising</strong> — the sign on the eastern horizon at your birth.</p>
                    <p><strong className="text-foreground">MC / Midheaven</strong> — the highest point in your chart, tied to career and public self.</p>
                    <p><strong className="text-foreground">Retrograde</strong> — a planet appearing to move backward; tends to slow that planet's themes down.</p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <AskLyraButton seed="I want to understand transits — walk me through how they work using my chart as the example." label="Ask Lyra to teach me" />
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

export default Astrology;