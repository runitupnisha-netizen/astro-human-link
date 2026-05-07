import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Share2, Star, Zap, Hash, Sparkles, Moon, Sun, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import CosmicBackground from "@/components/CosmicBackground";
import SoulBlueprintCard from "@/components/SoulBlueprintCard";

type ProfileRow = {
  display_name: string | null;
  avatar_url: string | null;
  sun_sign: string | null;
  moon_sign: string | null;
  rising_sign: string | null;
  human_design_type: string | null;
  human_design_profile: string | null;
  human_design_strategy: string | null;
  human_design_authority: string | null;
  gene_keys_life_purpose: string | null;
  life_path_number: number | null;
  birthday_number: number | null;
  personal_year_number: number | null;
  compatibility_tags: string[] | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  birth_latitude: number | null;
  birth_longitude: number | null;
};

const SIGN_INTERPRETATIONS: Record<string, { sun: string; moon: string; rising: string }> = {
  Aries: { sun: "Bold initiator who burns bright and moves first.", moon: "Emotionally direct — feelings come fast and honest.", rising: "You arrive with momentum and unmistakable presence." },
  Taurus: { sun: "Grounded sensualist who builds beauty that lasts.", moon: "Comfort, safety, and slow pleasure soothe your inner world.", rising: "Steady, magnetic, and quietly luxurious to be near." },
  Gemini: { sun: "Curious mind that connects ideas and people effortlessly.", moon: "Your feelings move through words and conversation.", rising: "You read as quick, witty, and endlessly interesting." },
  Cancer: { sun: "Tender protector who creates home wherever you go.", moon: "Deeply intuitive — you feel everyone in the room.", rising: "Soft on the outside, powerful nurturer underneath." },
  Leo: { sun: "Radiant heart-led creator born to be seen.", moon: "Love, recognition, and play feed your inner child.", rising: "You walk in like the room was waiting for you." },
  Virgo: { sun: "Precise healer who loves through service and care.", moon: "Order and small rituals settle your inner storms.", rising: "Refined, observant, and deceptively luminous." },
  Libra: { sun: "Harmonizer who weighs every angle with grace.", moon: "Connection and beauty are your emotional language.", rising: "You disarm rooms with charm and effortless balance." },
  Scorpio: { sun: "Intense alchemist who transforms what you touch.", moon: "Your inner ocean is deep, private, and fiercely loyal.", rising: "Magnetic, mysterious — people sense your power instantly." },
  Sagittarius: { sun: "Truth-seeker chasing meaning over comfort.", moon: "Freedom and adventure are how you feel safe.", rising: "Open, optimistic, infectiously alive." },
  Capricorn: { sun: "Architect of long arcs — you build legacies.", moon: "You feel safe through mastery, structure, and earned trust.", rising: "Composed, capable, and quietly commanding." },
  Aquarius: { sun: "Visionary outsider rewriting the rules with care.", moon: "You feel through ideas and your chosen tribe.", rising: "Cool, original, and a little otherworldly." },
  Pisces: { sun: "Mystic dreamer with one foot in the unseen.", moon: "Boundaries blur — you feel everything, deeply.", rising: "Soft, ethereal, instinctively compassionate." },
};

const HD_INTERPRETATIONS: Record<string, string> = {
  Generator: "Built to respond — your sacral energy lights up around what's truly yours.",
  "Manifesting Generator": "Multi-passionate responder — you move fast once your gut says yes.",
  Projector: "A natural guide — your gift unfolds when you're recognized and invited.",
  Manifestor: "Initiator energy — your role is to spark what others build.",
  Reflector: "A rare mirror — you reflect the health of everyone around you.",
};

const NUMBER_MEANINGS: Record<number, string> = {
  1: "Pioneer energy — born to lead and start new things.",
  2: "Diplomat — your gift is partnership and intuition.",
  3: "Creative communicator — joy and expression are your fuel.",
  4: "Builder — discipline, structure, and reliable foundations.",
  5: "Free spirit — change, travel, and freedom call you.",
  6: "Nurturer — love, family, and harmony are your purpose.",
  7: "Seeker — depth, mysticism, and inner truth pull you.",
  8: "Power player — abundance, mastery, and tangible results.",
  9: "Old soul — completion, compassion, and humanitarian gifts.",
  11: "Master Intuitive — illumination, vision, spiritual messenger.",
  22: "Master Builder — turning visionary ideas into lasting reality.",
  33: "Master Teacher — selfless love and uplifting consciousness.",
};

const numberMeaning = (n: number | null) => (n != null ? NUMBER_MEANINGS[n] ?? "A deeply personal cosmic signature." : "—");

const MyChart = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select(
          "display_name, avatar_url, sun_sign, moon_sign, rising_sign, human_design_type, human_design_profile, human_design_strategy, human_design_authority, gene_keys_life_purpose, life_path_number, birthday_number, personal_year_number, compatibility_tags, birth_date, birth_time, birth_place, birth_latitude, birth_longitude"
        )
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setProfile(data as ProfileRow | null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const share = async (title: string, text: string) => {
    const fullText = `${text}\n\n— Stellara ✨`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: fullText, url: window.location.href });
        return;
      } catch {
        /* user cancelled — fall through */
      }
    }
    try {
      await navigator.clipboard.writeText(fullText);
      toast({ title: "Copied to clipboard", description: "Paste anywhere to share ✨" });
    } catch {
      toast({ title: "Couldn't share", description: "Try again in a moment.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="relative min-h-screen pt-24 pb-28 md:pb-12">
        <CosmicBackground />
        <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-6 space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-card/40 border border-border/40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="relative min-h-screen pt-24 pb-28 md:pb-12 flex items-center justify-center">
        <CosmicBackground />
        <div className="relative z-10 text-center px-6">
          <p className="text-muted-foreground mb-4">We couldn't find your chart yet.</p>
          <Button onClick={() => navigate("/onboarding")} className="bg-gradient-golden text-background">
            Complete onboarding
          </Button>
        </div>
      </div>
    );
  }

  const sunInterp = profile.sun_sign ? SIGN_INTERPRETATIONS[profile.sun_sign]?.sun : null;
  const moonInterp = profile.moon_sign ? SIGN_INTERPRETATIONS[profile.moon_sign]?.moon : null;
  const risingInterp = profile.rising_sign ? SIGN_INTERPRETATIONS[profile.rising_sign]?.rising : null;
  const hdInterp = profile.human_design_type ? HD_INTERPRETATIONS[profile.human_design_type] : null;

  const tags = profile.compatibility_tags ?? [];

  return (
    <div className="relative min-h-screen pt-24 pb-28 md:pb-12">
      <CosmicBackground />

      <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-3 text-muted-foreground hover:text-foreground -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back
          </Button>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 mb-3">
              <Star className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-medium text-accent tracking-wide uppercase">Your Chart</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-gradient-aurora mb-2">
              Your cosmic results
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              Four shareable cards drawn from your natal chart, Human Design, and numerology — tap Share on any of them.
            </p>
          </div>
        </motion.div>

        {/* Master Soul Blueprint card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <SoulBlueprintCard profile={profile} />
        </motion.div>

        <div className="grid gap-4">
          {/* Card 1 — Big Three */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-card/70 backdrop-blur-sm border-border/50">
              <CardContent className="p-5 md:p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Sun className="w-5 h-5 text-accent" />
                    <h2 className="font-display text-lg font-semibold">Your Big Three</h2>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-accent/30 text-accent hover:bg-accent/10"
                    onClick={() =>
                      share(
                        "My Big Three — Stellara",
                        `☉ Sun in ${profile.sun_sign ?? "—"}\n☽ Moon in ${profile.moon_sign ?? "—"}\n↗ Rising in ${profile.rising_sign ?? "—"}`
                      )
                    }
                  >
                    <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
                  </Button>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    { label: "Sun", icon: Sun, sign: profile.sun_sign, interp: sunInterp, tone: "border-accent/30 bg-accent/5" },
                    { label: "Moon", icon: Moon, sign: profile.moon_sign, interp: moonInterp, tone: "border-primary/30 bg-primary/5" },
                    { label: "Rising", icon: ArrowUpRight, sign: profile.rising_sign, interp: risingInterp, tone: "border-secondary-foreground/30 bg-secondary/10" },
                  ].map(({ label, icon: Icon, sign, interp, tone }) => (
                    <div key={label} className={`rounded-xl border ${tone} p-3`}>
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                        <Icon className="w-3 h-3" />
                        {label}
                      </div>
                      <div className="font-display text-base font-semibold text-foreground mb-1.5">{sign ?? "—"}</div>
                      <p className="text-xs text-foreground/75 leading-relaxed">{interp ?? "Add your birth time to unlock this placement."}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Layer 2 — Deeper details in accordion */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="bg-card/70 backdrop-blur-sm border-border/50">
              <CardContent className="p-2 md:p-3">
                <Accordion type="multiple" className="w-full">
                  {/* Human Design */}
                  <AccordionItem value="human-design" className="border-border/40">
                    <AccordionTrigger className="px-3 md:px-4 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-primary" />
                        <span className="font-display text-base font-semibold">Human Design Snapshot</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 md:px-4 pb-4">
                      <div className="flex justify-end mb-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-primary/30 text-primary hover:bg-primary/10"
                          onClick={() =>
                            share(
                              "My Human Design — Stellara",
                              `⚡ Type: ${profile.human_design_type ?? "—"}\n🧭 Strategy: ${profile.human_design_strategy ?? "—"}\n🔑 Authority: ${profile.human_design_authority ?? "—"}\n📐 Profile: ${profile.human_design_profile ?? "—"}`
                            )
                          }
                        >
                          <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
                        </Button>
                      </div>
                      {profile.human_design_type ? (
                        <>
                          <p className="text-sm text-foreground/80 leading-relaxed mb-4">
                            {hdInterp ?? "A unique energetic blueprint guiding how you make aligned decisions."}
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              { label: "Type", value: profile.human_design_type },
                              { label: "Strategy", value: profile.human_design_strategy },
                              { label: "Authority", value: profile.human_design_authority },
                              { label: "Profile", value: profile.human_design_profile },
                            ].map((cell) => (
                              <div key={cell.label} className="rounded-lg border border-border/40 bg-background/40 p-2.5">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">{cell.label}</div>
                                <div className="text-sm font-medium text-foreground truncate">{cell.value ?? "—"}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Your Human Design will appear here once your chart is generated.</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* Numerology */}
                  <AccordionItem value="numerology" className="border-border/40">
                    <AccordionTrigger className="px-3 md:px-4 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Hash className="w-5 h-5 text-foreground/80" />
                        <span className="font-display text-base font-semibold">Numerology Highlights</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 md:px-4 pb-4">
                      <div className="flex justify-end mb-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-border/60 hover:bg-muted/30"
                          onClick={() =>
                            share(
                              "My Numerology — Stellara",
                              `🔢 Life Path: ${profile.life_path_number ?? "—"}\n🎂 Birthday: ${profile.birthday_number ?? "—"}\n📅 Personal Year: ${profile.personal_year_number ?? "—"}`
                            )
                          }
                        >
                          <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
                        </Button>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-3">
                        {[
                          { label: "Life Path", value: profile.life_path_number },
                          { label: "Birthday", value: profile.birthday_number },
                          { label: "Personal Year", value: profile.personal_year_number },
                        ].map((n) => (
                          <div key={n.label} className="rounded-xl border border-border/40 bg-background/30 p-4 text-center">
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{n.label}</div>
                            <div className="font-display text-3xl font-bold text-foreground mb-2">{n.value ?? "—"}</div>
                            <p className="text-xs text-foreground/70 leading-relaxed">{numberMeaning(n.value)}</p>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Compatibility Tags */}
                  <AccordionItem value="tags" className="border-b-0">
                    <AccordionTrigger className="px-3 md:px-4 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-accent" />
                        <span className="font-display text-base font-semibold">Compatibility Tags</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 md:px-4 pb-4">
                      <div className="flex justify-end mb-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-accent/30 text-accent hover:bg-accent/10"
                          disabled={tags.length === 0}
                          onClick={() =>
                            share(
                              "My Compatibility Tags — Stellara",
                              `My energy reads as:\n${tags.map((t) => `• ${t}`).join("\n")}`
                            )
                          }
                        >
                          <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
                        </Button>
                      </div>
                      {tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag, i) => (
                            <Badge
                              key={`${tag}-${i}`}
                              variant="outline"
                              className="border-accent/30 bg-accent/5 text-accent text-xs py-1 px-2.5"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Your compatibility tags will appear here once your cosmic profile finishes generating.
                        </p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default MyChart;