import { useEffect, useState } from "react";
import { Hash, BookOpen, Sparkles } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CosmicBackground from "@/components/CosmicBackground";
import TermTooltip from "@/components/blueprint/TermTooltip";
import AskLyraButton from "@/components/blueprint/AskLyraButton";
import PremiumLock from "@/components/blueprint/PremiumLock";
import CachedAiSection from "@/components/blueprint/CachedAiSection";
import BackButton from "@/components/BackButton";
import ReadMore from "@/components/blueprint/ReadMore";

const SECTION_CLASS = "rounded-2xl border border-border/40 bg-card/70 backdrop-blur-md p-6";

const LIFE_PATH_BLURBS: Record<number, string> = {
  1: "The Initiator. You're here to lead, originate, and stand alone when it's the right call. Your lesson is independence without isolation — building something that's yours without losing the people who help you build it.",
  2: "The Diplomat. You're here to relate, mediate, and partner. Your gift is sensitivity to other people; your lesson is using it without disappearing into them.",
  3: "The Communicator. You're here to express — words, art, voice. Your lesson is depth: the surface is easy for you, the underneath is where the real work lives.",
  4: "The Builder. You're here to make things that last. Your lesson is flexibility — your strength is structure, your edge is knowing when to break it.",
  5: "The Explorer. You're here for freedom and experience. Your lesson is commitment that doesn't feel like a cage — choosing what to stay with on purpose.",
  6: "The Nurturer. You're here for love, family, and responsibility. Your lesson is taking care of others without burning out — and being cared for in return.",
  7: "The Seeker. You're here for depth, study, and inner work. Your lesson is staying connected to people while you go inward.",
  8: "The Power-Builder. You're here for material mastery and legacy. Your lesson is using power in service of something larger than your ego.",
  9: "The Humanitarian. You're here for the larger story — service, art, the collective. Your lesson is finishing things and letting them go.",
  11: "Master Number 11 — The Illuminator. You carry the energy of 2 amplified. Spiritual sensitivity is built in; your job is to channel it into something real instead of getting overwhelmed by it.",
  22: "Master Number 22 — The Master Builder. You carry the energy of 4 amplified. You can build at a scale most can't even see. The lesson is patience and pacing — you're not on a normal timeline.",
  33: "Master Number 33 — The Master Teacher. You carry the energy of 6 amplified. You're here for healing and service at a wide scale. The lesson is not collapsing under the weight of what you can feel.",
};

const Numerology = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  const lp = profile?.life_path_number as number | undefined;
  const bday = profile?.birthday_number as number | undefined;
  const py = profile?.personal_year_number as number | undefined;
  const karmic = [13, 14, 16, 19].filter((k) => [lp, bday, py].includes(k));
  const master = [11, 22, 33].filter((m) => [lp, bday, py].includes(m));
  const showKarmicMaster = karmic.length > 0 || master.length > 0;

  const numbers = [
    { label: "Life Path", value: lp, key: "lp" },
    { label: "Expression", value: null, key: "exp", premium: true },
    { label: "Soul Urge", value: null, key: "soul", premium: true },
    { label: "Personality", value: null, key: "pers", premium: true },
    { label: "Birthday", value: bday, key: "bday" },
    { label: "Personal Year", value: py, key: "py" },
  ];

  return (
    <div className="min-h-[100svh] relative">
      <CosmicBackground />
      <div className="relative z-10 pt-24 md:pt-28 pb-28 md:pb-12 px-5">
        <div className="max-w-md mx-auto">
          <BackButton fallback="/blueprint" label="Blueprint" className="mb-2" />

          <header className="mb-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">Science of self · III</p>
            <h1 className="font-display text-4xl font-bold bg-gradient-aurora bg-clip-text text-transparent mt-1">Numerology</h1>
          </header>

          {/* HERO — Six-number grid */}
          <section className={`${SECTION_CLASS} mb-8`}>
            <div className="grid grid-cols-3 gap-3">
              {numbers.map((n) => (
                <div key={n.key} className="rounded-xl bg-background/40 border border-border/30 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{n.label}</div>
                  <div className="font-display text-2xl font-bold text-primary mt-1">
                    {n.value ?? (n.premium ? "✦" : "—")}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 1 — Life Path (free) */}
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold mb-1">Life Path Number</h2>
            <p className="text-xs text-muted-foreground mb-4">Your core lesson across this lifetime.</p>
            <div className={SECTION_CLASS}>
              <div className="flex items-baseline gap-3 mb-3">
                <span className="font-display text-5xl font-bold text-primary">{lp ?? "—"}</span>
                <span className="text-sm text-muted-foreground">Life Path</span>
              </div>
              <ReadMore
                text={lp ? LIFE_PATH_BLURBS[lp] || "Your Life Path number carries a specific archetype. Ask Lyra for a personalized read." : "Ask Lyra to compute your Life Path from your birth date."}
              />
              <AskLyraButton seed={`My Life Path number is ${lp}. Give me the unvarnished read — strengths, blind spots, and the work this lifetime is asking of me.`} />
            </div>
          </section>

          {/* SECTION 2 — Expression (premium) */}
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold mb-1">Expression Number</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Also called <TermTooltip term="Destiny number" definition="The Expression number — derived from your full birth name. It names what you're here to express in the world." />.
            </p>
            <PremiumLock
              title="Your Expression / Destiny"
              teaser="Your Life Path tells you what you're here to learn. Your Expression number tells you what you're here to express — the talent set you arrived with. Unlock to compute it from your full birth name."
              lyraSeed="What's my Expression number, and how is it different from my Life Path? Give me the read."
            >
              <CachedAiSection section="expression" title="Your Expression Number" />
            </PremiumLock>
          </section>

          {/* SECTION 3 — Soul Urge (premium) */}
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold mb-1">Soul Urge Number</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Also called <TermTooltip term="Heart's Desire" definition="The Soul Urge number — derived from the vowels in your name. It names what your heart actually wants, sometimes beneath conscious awareness." />.
            </p>
            <PremiumLock
              title="What your heart actually wants"
              teaser="The motivation underneath your choices — what you're really reaching for when you choose a job, a partner, a city. Unlock to compute and read your Soul Urge."
              lyraSeed="What's my Soul Urge number, and what does it say I'm actually after underneath the surface?"
            >
              <CachedAiSection section="soul_urge" title="Your Soul Urge" />
            </PremiumLock>
          </section>

          {/* SECTION 4 — Personality (premium) */}
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold mb-1">Personality Number</h2>
            <p className="text-xs text-muted-foreground mb-4">The outer mask — how others perceive you first.</p>
            <PremiumLock
              title="The mask others meet first"
              teaser="Derived from the consonants in your name. It describes the first impression you give off — often very different from who you are on the inside."
              lyraSeed="What's my Personality number and what first impression does it create?"
            >
              <CachedAiSection section="personality" title="Your Personality Number" />
            </PremiumLock>
          </section>

          {/* SECTION 5 — Birthday (premium-ish, value shown if available) */}
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold mb-1">Birthday Number</h2>
            <p className="text-xs text-muted-foreground mb-4">A specific gift stamped on you at birth.</p>
            {bday ? (
              <div className={SECTION_CLASS}>
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="font-display text-4xl font-bold text-primary">{bday}</span>
                  <span className="text-sm text-muted-foreground">Birthday</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed font-serif">
                  Your birthday number is a specific talent you were born with. Ask Lyra for the personalized read on yours.
                </p>
                <AskLyraButton seed={`My Birthday number is ${bday}. What specific talent or gift does it point to?`} />
              </div>
            ) : (
              <PremiumLock
                title="Your Birthday gift"
                teaser="The day of the month you were born carries its own specific talent. Unlock to see yours."
                lyraSeed="What's my Birthday number and what gift does it carry?"
              />
            )}
          </section>

          {/* SECTION 6 — Personal Year (premium, dynamic) */}
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold mb-1">Personal Year</h2>
            <p className="text-xs text-muted-foreground mb-4">The 9-year cycle you're inside. Refreshes annually on your birthday.</p>
            {py ? (
              <div className={SECTION_CLASS}>
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="font-display text-4xl font-bold text-primary">{py}</span>
                  <span className="text-sm text-muted-foreground">Personal Year</span>
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed font-serif">
                  Each year in the 9-year cycle has a theme. Year {py} is asking something specific of you right now — what to start, what to release, what to build.
                </p>
                <AskLyraButton seed={`I'm in Personal Year ${py}. What's this year asking of me, and what should I focus on between now and my next birthday?`} />
                <div className="mt-5 pt-5 border-t border-border/40">
                  <PremiumLock
                    title="Personal Month & Personal Day"
                    teaser="Zoom in further — every month and every day inside your Personal Year has its own number and theme. Unlock the daily lens."
                    lyraSeed="What's my Personal Month and Personal Day today, and what should I do with them?"
                  >
                    <CachedAiSection section="personal_year_detail" title="Personal Year · Month · Day" />
                  </PremiumLock>
                </div>
              </div>
            ) : (
              <PremiumLock
                title="Your current Personal Year"
                teaser="Each year in the 9-year cycle has a theme. Unlock to see where you are in the cycle and what this year is for."
                lyraSeed="What's my current Personal Year and what's it asking of me?"
              />
            )}
          </section>

          {/* SECTION 7 — Karmic & Master (conditional) */}
          {showKarmicMaster && (
            <section className="mb-10">
              <h2 className="font-display text-xl font-semibold mb-1">Karmic & Master Numbers</h2>
              <p className="text-xs text-muted-foreground mb-4">Extra spiritual weight in your chart.</p>
              <PremiumLock
                title={`You carry ${[...master.map((m) => `Master ${m}`), ...karmic.map((k) => `Karmic ${k}`)].join(" · ")}`}
                teaser="Master numbers (11, 22, 33) are high-vibration archetypes that aren't reduced. Karmic debts (13, 14, 16, 19) name patterns you're here to consciously balance. Unlock the full reading on what these mean for you."
                lyraSeed={`I have ${[...master, ...karmic].join(", ")} in my numerology chart. What do these specifically ask of me?`}
              />
            </section>
          )}

          {/* SECTION 8 — Learn */}
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold mb-1 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-accent" /> Learn Numerology
            </h2>
            <div className={SECTION_CLASS}>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="what">
                  <AccordionTrigger className="text-sm font-display">What is numerology?</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    The study of numbers as archetypes. Your birth date and birth name reduce to a small set of single digits — each one carrying a specific energy, lesson, and gift.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="reduce">
                  <AccordionTrigger className="text-sm font-display">
                    What is <TermTooltip term="single-digit reduction" definition="Adding the digits of a number until you arrive at a single digit (1–9). E.g. 28 → 2+8 = 10 → 1+0 = 1." />?
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    Most numerology numbers get reduced to a single digit by adding their digits. Master numbers (11, 22, 33) are an exception — they're held at the double-digit form because of their intensity.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="glossary">
                  <AccordionTrigger className="text-sm font-display">Glossary</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed space-y-2">
                    <p><strong className="text-foreground">Master numbers</strong> — 11, 22, 33. High-frequency archetypes.</p>
                    <p><strong className="text-foreground">Karmic debt</strong> — 13, 14, 16, 19. Patterns to consciously balance this lifetime.</p>
                    <p><strong className="text-foreground">Personal Year</strong> — your position in the 9-year cycle.</p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <AskLyraButton seed="Read my numbers together — Life Path, Birthday, Personal Year. What story do they tell as a set?" label="Ask Lyra what my numbers say together" />
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

export default Numerology;