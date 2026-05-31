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
// Each blurb: paragraph 1 = identity dynamics, 2 = life themes, 3 = one practical insight.
const SUN_BLURBS: Record<string, string> = {
  Aries: "Your core identity moves first and asks questions later. You're wired for initiation — the room changes when you decide it does, and you'd rather start something messy than wait for permission. Underneath the speed is a clean instinct for what wants to be born next.\n\nYour life themes circle around courage, autonomy, and the long apprenticeship of learning to finish what you start. You're meant to be a beginner often — new projects, new chapters, new rooms — but the deeper assignment is to stay long enough to see one of those beginnings all the way through.\n\nPractical insight: before you say yes to the next exciting thing, ask whether you've finished the last one. Your power doubles when initiation meets follow-through.",
  Taurus: "Your essence is steady, sensual, and unhurried. You build worth slowly and refuse to be rushed by anyone's urgency. The world reads you as grounded; what's actually happening is that your nervous system needs to feel the thing before it commits.\n\nYour life themes are value, comfort, and the long art of building something that lasts. You're here to learn the difference between rooted and stuck — and to make beauty and stability with your own hands, not borrow them.\n\nPractical insight: when you can't decide, move your body. A walk, a meal, time with your hands in something real — your answers live in the body, not the head.",
  Gemini: "You're a connector and a code-switcher — curious about everything, fluent in many rooms, and quicker than most to see how two unrelated ideas talk to each other. Your mind is your primary instrument and it almost never stops playing.\n\nYour life themes orbit around language, learning, and the dozens of small relationships that make up a city's worth of contacts. You're here to translate — between people, between fields, between versions of yourself.\n\nPractical insight: choose one thread to weave deeply each season. Your superpower is range, but depth is the thing you have to opt into on purpose.",
  Cancer: "You're tidal — your inner life moves in and out, and so do the people you love. You feel everything before you can name it, and you remember the emotional weather of a room long after everyone else has forgotten.\n\nYour life themes are home, lineage, and the slow building of a chosen family. You're here to learn that softness is a kind of strength, not a leak, and that protecting your own coastline is a form of love.\n\nPractical insight: when you're overwhelmed, ask what you actually need to feel safe in this hour — food, a closed door, one specific person. Specificity is how you stop drowning.",
  Leo: "You're meant to be seen — but the deeper play is being witnessed without performing. You carry a natural warmth that organizes a room, and you'd rather be the one who makes the toast than the one who hides at the bar.\n\nYour life themes are creative expression, generosity, and the lifelong project of leading from a full heart instead of a hungry one. You're here to model what it looks like to want to be loved out loud.\n\nPractical insight: make something nobody will see this month — a private creative act with no audience. It reminds your ego who the work is actually for.",
  Virgo: "You're a craftsperson of the small thing done well. Your eye for what's off is a real gift — you can feel a misalignment in a sentence, a recipe, or a relationship before anyone else can articulate it. You'd rather be useful than admired.\n\nYour life themes are service, refinement, and the daily work of making imperfect systems a little better. You're here to learn the difference between caring about quality and using critique to stay safely outside the arena.\n\nPractical insight: turn your editor's eye on systems, not on yourself. Your inner critic is a brilliant employee and a terrible boss.",
  Libra: "You're wired for relationship and aesthetic balance. You see all sides faster than most people see one, and you can find the elegant compromise in almost any room. People feel met by you in a way they can't always explain.\n\nYour life themes are partnership, fairness, and the long practice of staying yourself inside intimacy. The risk is averaging yourself toward whoever's in front of you. You're here to learn that your own taste, position, and 'no' are part of the balance, not a disturbance to it.\n\nPractical insight: before you negotiate, name one preference that's purely yours — what you actually want, with no eye on the other person. That's your center.",
  Scorpio: "You go to the bottom of things. You don't trust the surface and people feel that — there's a quiet intensity in you that reads everyone in the room before you've said a word. You'd rather have one true conversation than ten polite ones.\n\nYour life themes are intimacy, power, and the long work of trusting another person enough to be seen without armor. You're here to learn that depth doesn't require secrecy, and that vulnerability is not the same as exposure.\n\nPractical insight: name one thing out loud this week that you'd normally keep private. Small, controlled disclosure is how you build the trust you actually want.",
  Sagittarius: "Your essence is a question mark with legs. You're built for the bigger frame — meaning, travel, philosophy, the long view — and you'd rather have an opinion you'll have to revise than no opinion at all. People trust your read because you give it freely.\n\nYour life themes are exploration, belief, and the slow construction of a personal philosophy that can carry weight. You're here to learn that the arrow only matters if it lands.\n\nPractical insight: pick one of your big ideas this season and bring it down to one concrete commitment. Vision becomes meaning the moment it touches a calendar.",
  Capricorn: "You're built for the long arc. You don't need permission and you don't need applause — you need the work to be real and the result to last. You've felt like the responsible one since you were young, sometimes for good reasons and sometimes by accident.\n\nYour life themes are mastery, structure, and authority — the kind you earn rather than inherit. You're here to learn that ambition is most powerful when it's pointed at a mountain you actually chose, not one you inherited.\n\nPractical insight: every quarter, audit one structure in your life — job, relationship, routine — and ask whether you'd choose it again today. Loyalty to the right things only.",
  Aquarius: "You see the system from outside the system. You're here to be a useful outlier — to notice what everyone's agreed to stop noticing, and to ask the question that reframes the room. People often experience you as a few steps ahead and a few degrees cooler.\n\nYour life themes are community, innovation, and the long practice of staying connected to people while you stay true to a vision they might not share yet. You're here to build for a future that doesn't quite exist.\n\nPractical insight: stay warm while you stay weird. Your ideas land when people feel you're with them, not above them.",
  Pisces: "You feel everything, and you know more than you can prove. Your inner life is bigger than your outer one, and your imagination is a working tool, not a hobby. You read rooms through atmosphere, not data.\n\nYour life themes are compassion, creativity, and the lifelong art of staying porous to the world without dissolving into it. You're here to translate the invisible into something other people can use.\n\nPractical insight: boundaries are sacred for you — not walls, but membranes. Decide in advance whose energy you'll let in today, and the rest takes care of itself.",
};

const MOON_BLURBS: Record<string, string> = {
  Aries: "Your inner life moves at speed. You feel through action — sitting with an emotion makes you itchy, so you channel it into a workout, a project, a confrontation. Anger is the easiest feeling for you to access; sadness takes longer to surface.\n\nThe theme of your emotional life is learning to stay with a feeling long enough to find out what's underneath it. You're not avoiding by accident — your nervous system thinks motion is safety. It often is, until it isn't.\n\nPractical insight: when you feel the urge to sprint, set a five-minute timer and just breathe. If after five minutes you still want to move, go. You'll be amazed how often the feeling resolves itself.",
  Taurus: "Your emotional weather is slow, steady, and deeply somatic. You self-soothe through the body — food, touch, comfort, beauty, your favorite chair. Stability isn't a preference for you; it's medicine. You change your mind slowly and your feelings even slower.\n\nThe theme of your emotional life is the difference between rooted and stuck. You'd rather endure a situation that's not quite right than tolerate the chaos of change, and that loyalty cuts both ways.\n\nPractical insight: every season, ask one question: is this comfort, or is this calcification? Your nervous system will tell you the truth if you let it.",
  Gemini: "You process by talking and reading and turning a feeling into a question. Your emotions need words before they feel real to you, and an unprocessed feeling tends to ping around your head like an open browser tab.\n\nThe theme of your emotional life is choosing where the words go. Talking to ten people about the same feeling will fragment it; talking to one trusted person or a single page in a journal will integrate it.\n\nPractical insight: when you're spinning, write it down before you say it out loud. The page metabolizes faster than other people can.",
  Cancer: "You feel everything in the body and remember everything in the bones. Home — a room, a person, a ritual — isn't optional for you; it's the container that lets you exist. You take care of others almost reflexively, and you sometimes confuse caretaking with intimacy.\n\nThe theme of your emotional life is learning to receive as well as you give, and to let your chosen family include you, not just rely on you.\n\nPractical insight: once a week, let someone do something for you that you could absolutely have done yourself. The discomfort is the point.",
  Leo: "Your emotional life runs warm and visible. You need to feel celebrated, not just acknowledged — and underneath that, you want to know your love actually matters to the people you give it to. Performative warmth tires you; sincere warmth feeds you.\n\nThe theme of your emotional life is the difference between an audience and a witness. You don't actually need applause; you need a few people who really see you.\n\nPractical insight: say the affectionate thing out loud, even when it feels too big. You're not too much — you're correctly sized for the people who can meet you.",
  Virgo: "You process emotion by ordering the environment around it. When life feels chaotic you reorganize a drawer, clean the kitchen, make a list. This is genuinely how your nervous system regulates — it's not avoidance.\n\nThe theme of your emotional life is refusing to pathologize your own feelings. You'd diagnose any friend with compassion and yourself with a clipboard. The inner critic that helps you do good work is the same voice that tells you your feelings are inefficient. They're not.\n\nPractical insight: when you catch yourself analyzing a feeling, ask instead: 'What does this feeling want?' Treat it like a guest, not a problem.",
  Libra: "You regulate through harmony and beauty. A pleasant environment, a balanced conversation, a fair outcome — these are not luxuries for you, they're physical needs. Conflict drains you fast and lingers in your body.\n\nThe theme of your emotional life is learning to tolerate the temporary discomfort of a hard conversation in exchange for the lasting peace of an honest one. Avoided friction doesn't disappear; it just goes underground.\n\nPractical insight: when you sense a conversation you've been deferring, schedule it. The dread is almost always worse than the conversation itself.",
  Scorpio: "You feel things at full volume even when you look perfectly calm. Your inner life is private and intense, and you can hold a feeling for years without anyone knowing. Trust takes time for you — and that's correct, not a flaw.\n\nThe theme of your emotional life is the slow letting-in. You don't owe anyone access to your inner world, and you also don't have to make every relationship earn that level of access. Calibrated intimacy is the work.\n\nPractical insight: when something matters to you, name it within 24 hours — even just to yourself in writing. Unspoken intensity becomes resentment faster than you'd expect.",
  Sagittarius: "You need space and horizon to feel okay. Caged-in feelings turn into restlessness, and restlessness turns into the urge to blow something up — a job, a relationship, a city. Movement is regulation for you, literally.\n\nThe theme of your emotional life is learning the difference between an escape and an exit. Sometimes you genuinely need to go; sometimes you need to stay and tolerate a feeling you've never sat through before.\n\nPractical insight: travel — even a one-day trip out of your usual square mile — is a real intervention for you, not an indulgence. Use it.",
  Capricorn: "You self-soothe by getting things done. A productive afternoon does for you what a long bath does for someone else — it reassures the part of you that's been carrying things since you were too young to be carrying them.\n\nThe theme of your emotional life is admitting how much you actually feel. You're more tender than you let on, and the armor that kept you safe at twelve is heavier than you need at thirty-five.\n\nPractical insight: let someone in before you've earned the right to need them. You don't have to be useful to be loved.",
  Aquarius: "You process emotion at arm's length first, then warm up. You analyze the feeling before you experience it, which can look like coldness to people who haven't earned access yet. It's not — it's how you stay regulated in a world that's a lot.\n\nThe theme of your emotional life is the bridge between the head and the body. Once you trust someone, you can be surprisingly devoted; the work is letting the trust form even when it doesn't fit your existing framework.\n\nPractical insight: when you catch yourself observing your feelings from outside, name the feeling out loud — even quietly to yourself. Naming closes the distance.",
  Pisces: "You feel other people's weather as your own. You can walk into a room neutral and walk out carrying three other people's moods, and the line between empathy and absorption is genuinely thin for you.\n\nThe theme of your emotional life is the daily practice of distinguishing what's yours from what's not. Water, art, music, and protected alone-time aren't hobbies for you — they're how you discharge.\n\nPractical insight: before any draining situation, decide in advance how long you'll stay and where you'll go after. Pre-planned exits are how you stay generous without disappearing.",
};

const RISING_BLURBS: Record<string, string> = {
  Aries: "Strangers experience you as direct, fast, and a little intense. You walk into rooms — you don't drift in. People often assume you're more confident than you feel inside, and that assumption tends to become true once you commit to the bit.\n\nThe theme of your outer self is leadership by entry. You set the tempo of a new situation just by showing up to it, which is a real gift and a real responsibility.\n\nPractical insight: before a big meeting or first date, pause for ten seconds at the threshold. Your default speed is your strength; choosing it on purpose is your superpower.",
  Taurus: "You come across as grounded and unhurried. People relax around you — your nervous system regulates other people's nervous systems before you've said anything. They also underestimate your stubbornness, often to their own surprise.\n\nThe theme of your outer self is presence. You don't need to perform; you just need to be in the room. The way you take up space teaches people they're allowed to take up theirs.\n\nPractical insight: dress and arrange your space deliberately. Your aesthetic isn't decoration — it's how you tell the world who you are without speaking.",
  Gemini: "You read as quick, curious, and witty. People want to talk to you, and you can find the interesting thread in almost any stranger within a few minutes. The risk is being remembered as clever instead of substantial.\n\nThe theme of your outer self is connection. You're a natural bridge between people, ideas, and rooms — and the more conscious you are of it, the more powerful that bridging becomes.\n\nPractical insight: in any new conversation, ask one slow question after the fast ones. It's the difference between charming people and being trusted by them.",
  Cancer: "You come across as warm, careful, and a little guarded. People feel safer near you than they can explain, and you tend to attract those who are looking for someone to take care of them — which you'll do, until you don't.\n\nThe theme of your outer self is protection. You move through the world with one hand on the door, deciding who gets in, and that discernment is part of your gift.\n\nPractical insight: let your warmth meet new people before your caution does. You can always pull back; first impressions of softness open doors that caution closes.",
  Leo: "You enter rooms. People orient to you whether you want them to or not — there's a quality of light around your presence that's hard to dim. The trick is using it on purpose instead of pretending it isn't happening.\n\nThe theme of your outer self is generosity of presence. When you're warm in public, people remember it for years. When you're cold, they remember that too.\n\nPractical insight: pick one person in every room to make feel seen. Your attention is more valuable than you realize.",
  Virgo: "You read as composed, observant, and a touch reserved. People assume you have it together — and you often do, but the assumption can keep them from offering you the help you'd benefit from.\n\nThe theme of your outer self is precision. The way you move, dress, and speak tells people you're paying attention, which sets a quietly high standard around you.\n\nPractical insight: occasionally show the messy version on purpose. Letting people see you mid-process, not just mid-result, deepens every relationship you have.",
  Libra: "You come across as charming, balanced, and easy to be around. People may not realize how much editing happens before they meet you — the outfit, the opening line, the tone. That work is real, and it's part of your art.\n\nThe theme of your outer self is grace. You can de-escalate a room just by walking into it, and you'd rather be remembered as kind than as right.\n\nPractical insight: occasionally let a slightly unpolished thought land before you edit it. The people who matter to you want to meet you, not your best draft.",
  Scorpio: "You read as private and magnetic. People feel watched in your presence — sometimes uncomfortably, often compellingly. You don't actually have to do anything; the intensity is the broadcast.\n\nThe theme of your outer self is gravity. You attract people who want to be seen all the way down, and you repel people who can't tolerate being read accurately.\n\nPractical insight: smile early in new situations. You don't need to dial down your intensity; you just need to signal that intimacy with you is possible, not just observation.",
  Sagittarius: "You come across as open, funny, and a little ungrounded. People trust you fast, often before you've earned it, because your warmth reads as honesty. Mostly that's accurate — and it's also a responsibility.\n\nThe theme of your outer self is possibility. You make people feel like the world is bigger than they were treating it as, which is a real gift in a tight room.\n\nPractical insight: when you make a casual commitment — 'we should hang out', 'I'll send that' — write it down. Your reputation lives in the small follow-throughs.",
  Capricorn: "You read as older, calmer, and more capable than you are. People hand you responsibility — at work, in families, in friend groups — sometimes before you've agreed to take it. You usually rise to it, but it costs you.\n\nThe theme of your outer self is authority. You're trusted by default, which is a privilege; the work is choosing your yeses instead of inheriting them.\n\nPractical insight: every time someone offers you more responsibility, pause for a day before answering. Your reflex is to accept; your power is to choose.",
  Aquarius: "You come across as a little different — interesting, distant, hard to pin down. People can't quite categorize you, which is exactly the brand. They remember you precisely because they couldn't slot you anywhere familiar.\n\nThe theme of your outer self is signal. You're the person who tells other outliers they're not alone, just by walking through the world as visibly yourself.\n\nPractical insight: lean into the thing about you that's most idiosyncratic. The people who get it will find you faster the louder you are about it.",
  Pisces: "You read as soft, dreamy, and intuitive. People project a lot onto you — they see what they need, sometimes before they see you. You're a screen that the world tends to use, which is both a gift and a weight.\n\nThe theme of your outer self is permeability. You blur edges between yourself and the people you're with, which is part of why you're so easy to talk to.\n\nPractical insight: decide who gets close before they decide for you. Your softness deserves your discernment, not just your generosity.",
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