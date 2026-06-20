import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Bookmark, BookmarkCheck, Crown, Clock, Wand2, Trash2 } from "lucide-react";
import { format, parseISO, differenceInYears } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import CosmicBackground from "@/components/CosmicBackground";
import BackButton from "@/components/BackButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  buildBirthDateUTC,
  planetLongitudes,
  computeAspects,
  signAndDegree,
  FULL_PLANET_BODIES,
  type PlanetKey,
} from "@/lib/ephemeris";

const FREE_USES_KEY = "stellara.timeTravel.freeUses";
const FREE_USE_LIMIT = 3;

type Profile = {
  display_name: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_latitude: number | null;
  birth_longitude: number | null;
};

type Moment = {
  id: string;
  moment_date: string;
  label: string | null;
  reflection: string | null;
  narrative_excerpt: string | null;
};

const ASPECT_GLYPH: Record<string, string> = {
  conjunction: "☌", opposition: "☍", trine: "△", square: "□", sextile: "✶",
};
const ASPECT_TONE: Record<string, string> = {
  conjunction: "text-amber-300", opposition: "text-rose-300",
  square: "text-orange-300", trine: "text-emerald-300", sextile: "text-sky-300",
};

const PLANET_LABEL: Record<PlanetKey, string> = {
  sun: "Sun", moon: "Moon", mercury: "Mercury", venus: "Venus", mars: "Mars",
  jupiter: "Jupiter", saturn: "Saturn", uranus: "Uranus", neptune: "Neptune", pluto: "Pluto",
};

const isoDate = (d: Date) => format(d, "yyyy-MM-dd");
const fmtNice = (iso: string) => format(parseISO(iso), "EEEE, MMMM d, yyyy");

function readFreeUses(): string[] {
  try {
    const raw = localStorage.getItem(FREE_USES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
function writeFreeUses(dates: string[]) {
  try { localStorage.setItem(FREE_USES_KEY, JSON.stringify(dates.slice(-50))); } catch { /* ignore */ }
}

const TimeTravel = () => {
  const { user } = useAuth();
  const { subscribed } = usePremium();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [moments, setMoments] = useState<Moment[]>([]);

  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState<string>(isoDate(today));
  const [narrative, setNarrative] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [freeUses, setFreeUses] = useState<string[]>(() => readFreeUses());
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [saving, setSaving] = useState(false);

  /* ---------------- Load profile + saved moments ---------------- */
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, birth_date, birth_time, birth_latitude, birth_longitude")
        .eq("user_id", user.id)
        .maybeSingle();
      setProfile((data as Profile) ?? null);
      setProfileLoading(false);

      const { data: m } = await supabase
        .from("time_travel_moments")
        .select("id, moment_date, label, reflection, narrative_excerpt")
        .eq("user_id", user.id)
        .order("moment_date", { ascending: false });
      setMoments((m as Moment[]) ?? []);
    })();
  }, [user]);

  /* ---------------- Chart math (memoized per selected date) ---------------- */
  const chart = useMemo(() => {
    if (!profile?.birth_date) return null;
    const natalUtc = buildBirthDateUTC(
      profile.birth_date,
      profile.birth_time,
      profile.birth_longitude,
      profile.birth_latitude,
    );
    const targetUtc = buildBirthDateUTC(selectedDate, "12:00", profile.birth_longitude, profile.birth_latitude);
    const natal = planetLongitudes(natalUtc);
    const transiting = planetLongitudes(targetUtc);

    // Compute transit-to-natal aspects (cross-chart)
    const aspects: { transit: PlanetKey; natal: PlanetKey; type: string; orb: number }[] = [];
    const orbsByAspect: Record<string, number> = {
      conjunction: 6, opposition: 6, square: 5, trine: 5, sextile: 4,
    };
    const ASPECT_DEGREES = { conjunction: 0, opposition: 180, square: 90, trine: 120, sextile: 60 };

    (Object.keys(transiting) as PlanetKey[]).forEach((tKey) => {
      (Object.keys(natal) as PlanetKey[]).forEach((nKey) => {
        let diff = Math.abs(transiting[tKey] - natal[nKey]);
        if (diff > 180) diff = 360 - diff;
        for (const [aspName, deg] of Object.entries(ASPECT_DEGREES)) {
          const orb = Math.abs(diff - deg);
          if (orb <= orbsByAspect[aspName]) {
            aspects.push({ transit: tKey, natal: nKey, type: aspName, orb });
            break;
          }
        }
      });
    });
    aspects.sort((a, b) => a.orb - b.orb);

    return { natal, transiting, aspects: aspects.slice(0, 8) };
  }, [profile, selectedDate]);

  /* ---------------- Quick milestones ---------------- */
  const milestones = useMemo(() => {
    const list: { label: string; date: string }[] = [];
    const now = today;
    list.push({ label: "Today", date: isoDate(now) });
    list.push({ label: "1 year ago", date: isoDate(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())) });
    list.push({ label: "5 years ago", date: isoDate(new Date(now.getFullYear() - 5, now.getMonth(), now.getDate())) });
    list.push({ label: "10 years ago", date: isoDate(new Date(now.getFullYear() - 10, now.getMonth(), now.getDate())) });
    list.push({ label: "Next birthday", date: (() => {
      if (!profile?.birth_date) return isoDate(new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()));
      const b = parseISO(profile.birth_date);
      const next = new Date(now.getFullYear(), b.getMonth(), b.getDate());
      if (next < now) next.setFullYear(now.getFullYear() + 1);
      return isoDate(next);
    })() });
    if (profile?.birth_date) {
      const b = parseISO(profile.birth_date);
      // First Saturn return ~29.5y
      const sr = new Date(b);
      sr.setFullYear(b.getFullYear() + 29);
      list.push({ label: "Saturn return", date: isoDate(sr) });
    }
    return list;
  }, [profile, today]);

  /* ---------------- Free-use gate ---------------- */
  const usedFreeForThisDate = freeUses.includes(selectedDate);
  const freeRemaining = Math.max(0, FREE_USE_LIMIT - freeUses.length);
  const canGenerate = subscribed || usedFreeForThisDate || freeRemaining > 0;

  /* ---------------- Generate narrative ---------------- */
  const generate = async () => {
    if (!chart) return;
    if (!canGenerate) {
      toast.error("You've used your 3 free time-travel readings. Unlock unlimited with Premium.");
      return;
    }
    setNarrativeLoading(true);
    setNarrative(null);
    try {
      const natalSigns = Object.fromEntries(
        FULL_PLANET_BODIES.map((p) => [p.key, signAndDegree(chart.natal[p.key as PlanetKey]).sign]),
      );
      const transitSigns = Object.fromEntries(
        FULL_PLANET_BODIES.map((p) => [p.key, signAndDegree(chart.transiting[p.key as PlanetKey]).sign]),
      );
      const isPast = parseISO(selectedDate) < today;
      const { data, error } = await supabase.functions.invoke("generate-time-travel-narrative", {
        body: {
          date: selectedDate,
          natal: natalSigns,
          transiting: transitSigns,
          aspects: chart.aspects.map((a) => ({
            transit: PLANET_LABEL[a.transit],
            natal: PLANET_LABEL[a.natal],
            aspect: a.type,
            orb: a.orb,
          })),
          user_name: profile?.display_name?.split(" ")[0] ?? null,
          is_past: isPast,
        },
      });
      if (error) throw error;
      if (data?.narrative) {
        setNarrative(data.narrative);
        if (!subscribed && !usedFreeForThisDate) {
          const next = [...freeUses, selectedDate];
          setFreeUses(next);
          writeFreeUses(next);
        }
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (e) {
      console.error("[time-travel] generate failed", e);
      toast.error("Couldn't read this moment. Try again in a beat.");
    } finally {
      setNarrativeLoading(false);
    }
  };

  /* ---------------- Bookmark this moment ---------------- */
  const saveMoment = async () => {
    if (!user || !narrative) return;
    setSaveLabel("");
    setSaveOpen(true);
  };

  const confirmSaveMoment = async () => {
    if (!user || !narrative) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("time_travel_moments")
      .insert({
        user_id: user.id,
        moment_date: selectedDate,
        label: saveLabel.trim() || null,
        narrative_excerpt: narrative.slice(0, 280),
      })
      .select("id, moment_date, label, reflection, narrative_excerpt")
      .single();
    setSaving(false);
    if (error) {
      toast.error("Couldn't save.");
      return;
    }
    setMoments([data as Moment, ...moments]);
    setSaveOpen(false);
    toast.success("Moment saved ✦");
  };

  const deleteMoment = async (id: string) => {
    const { error } = await supabase.from("time_travel_moments").delete().eq("id", id);
    if (error) return toast.error("Couldn't delete.");
    setMoments(moments.filter((m) => m.id !== id));
  };

  /* ---------------- Render guards ---------------- */
  if (profileLoading) {
    return (
      <div className="min-h-[100svh] relative flex items-center justify-center">
        <CosmicBackground />
        <p className="text-sm text-muted-foreground">Loading your chart…</p>
      </div>
    );
  }
  if (!profile?.birth_date) {
    return (
      <div className="min-h-[100svh] relative">
        <CosmicBackground />
        <div className="relative z-10 pt-20 md:pt-24 pb-28 px-5 max-w-md mx-auto">
          <h1 className="font-display text-2xl font-bold text-foreground">Time Travel</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Time Travel needs your birth date to read what the sky was doing for you. Add it from your profile to begin.
          </p>
          <button
            onClick={() => navigate("/profile")}
            className="mt-5 rounded-full px-5 py-2.5 text-sm font-semibold text-background bg-gradient-golden"
          >
            Add birth details
          </button>
        </div>
      </div>
    );
  }

  const ageAt = profile.birth_date
    ? differenceInYears(parseISO(selectedDate), parseISO(profile.birth_date))
    : null;

  return (
    <div className="min-h-[100svh] relative">
      <CosmicBackground />
      <div className="relative z-10 pt-20 md:pt-24 pb-28 md:pb-12 px-5">
        <div className="max-w-md mx-auto flex flex-col gap-6">
          <BackButton fallback="/blueprint" />
          {/* Header */}
          <header>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <p className="text-[11px] uppercase tracking-[0.2em] text-amber-400 font-semibold">
                {!subscribed && freeRemaining > 0
                  ? `Time Travel · ${freeRemaining} free reading${freeRemaining === 1 ? "" : "s"}`
                  : "Time Travel · Premium"}
              </p>
            </div>
            <h1 className="font-display text-3xl font-bold bg-gradient-aurora bg-clip-text text-transparent mt-1">
              Any moment of your life
            </h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Scrub to any date — past or future — and read what the cosmos was orchestrating around you.
            </p>
            {!subscribed && (
              <p className="mt-2 text-[11px] text-amber-400/80">
                {freeRemaining > 0 ? `${freeRemaining} of ${FREE_USE_LIMIT} free readings remaining` : "Free readings used — upgrade for unlimited"}
              </p>
            )}
          </header>

          {/* Date scrubber */}
          <section className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-md p-5">
            <label className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-2">
              Travel to…
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setNarrative(null); }}
              max={isoDate(new Date(today.getFullYear() + 50, 11, 31))}
              min={profile.birth_date}
              className="w-full rounded-lg bg-background/60 border border-border/40 px-3 py-2.5 text-sm text-foreground"
            />
            <p className="mt-2 font-display text-base text-foreground">
              {fmtNice(selectedDate)}{ageAt !== null && ageAt >= 0 ? <span className="text-muted-foreground"> · Age {ageAt}</span> : null}
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {milestones.map((m) => (
                <button
                  key={m.label}
                  onClick={() => { setSelectedDate(m.date); setNarrative(null); }}
                  className={`text-[11px] rounded-full px-2.5 py-1 border transition-colors ${
                    selectedDate === m.date
                      ? "border-amber-400/60 bg-amber-400/15 text-amber-200"
                      : "border-border/50 bg-background/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </section>

          {/* Active transits */}
          {chart && (
            <section className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md p-5">
              <h2 className="font-display text-base font-semibold text-foreground mb-3">
                Active transits to your chart
              </h2>
              {chart.aspects.length === 0 ? (
                <p className="text-xs text-muted-foreground">A quiet day — no major transits in tight orb.</p>
              ) : (
                <ul className="space-y-2">
                  {chart.aspects.map((a, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className={`font-mono text-base ${ASPECT_TONE[a.type] ?? "text-foreground"}`}>
                        {ASPECT_GLYPH[a.type] ?? "·"}
                      </span>
                      <span className="text-foreground">{PLANET_LABEL[a.transit]}</span>
                      <span className="text-muted-foreground text-xs">{a.type}</span>
                      <span className="text-foreground">natal {PLANET_LABEL[a.natal]}</span>
                      <span className="text-muted-foreground text-[10px] ml-auto">{a.orb.toFixed(1)}°</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* AI narrative */}
          <section className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/5 via-card/70 to-transparent backdrop-blur-md p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="font-display text-base font-semibold text-foreground">Lyra's reading</h2>
            </div>

            {narrative ? (
              <>
                <div className="space-y-3 text-sm text-foreground/95 leading-relaxed whitespace-pre-line">
                  {narrative}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={saveMoment}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/40 px-3 py-1.5 text-xs text-foreground hover:bg-background/70 transition-colors"
                  >
                    <Bookmark className="w-3.5 h-3.5" /> Save this moment
                  </button>
                  <button
                    onClick={() =>
                      navigate(
                        `/lyra?seed=${encodeURIComponent(
                          `I just time-traveled to ${fmtNice(selectedDate)}. ${narrative.slice(0, 280)} — help me unpack what this moment means for me now.`,
                        )}`,
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/40 px-3 py-1.5 text-xs text-foreground hover:bg-background/70 transition-colors"
                  >
                    <Wand2 className="w-3.5 h-3.5" /> Ask Lyra deeper
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Read what the sky was orchestrating for you on {fmtNice(selectedDate)} — tied personally to your natal chart.
                </p>
                {canGenerate ? (
                  <button
                    onClick={generate}
                    disabled={narrativeLoading}
                    className="w-full rounded-full px-5 py-3 text-sm font-semibold text-background bg-gradient-golden shadow-golden disabled:opacity-60"
                  >
                    {narrativeLoading ? "Reading the sky…" : "Read this moment"}
                  </button>
                ) : (
                  <button
                    onClick={() => navigate("/premium")}
                    className="w-full rounded-full px-5 py-3 text-sm font-semibold text-background bg-gradient-golden shadow-golden inline-flex items-center justify-center gap-2"
                  >
                    <Crown className="w-4 h-4" /> Unlock unlimited Time Travel
                  </button>
                )}
              </>
            )}
          </section>

          {/* Saved moments */}
          {moments.length > 0 && (
            <section className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md p-5">
              <h2 className="font-display text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                <BookmarkCheck className="w-4 h-4 text-amber-400" />
                Your saved moments
              </h2>
              <ul className="space-y-3">
                {moments.map((m) => (
                  <li key={m.id} className="rounded-lg border border-border/30 bg-background/30 p-3">
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => { setSelectedDate(m.moment_date); setNarrative(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className="flex-1 text-left"
                      >
                        <p className="text-xs uppercase tracking-wide text-amber-400/80">
                          {format(parseISO(m.moment_date), "MMM d, yyyy")}
                        </p>
                        {m.label && <p className="text-sm font-medium text-foreground mt-0.5">{m.label}</p>}
                        {m.narrative_excerpt && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.narrative_excerpt}</p>
                        )}
                      </button>
                      <button
                        onClick={() => deleteMoment(m.id)}
                        className="text-muted-foreground hover:text-rose-400 p-1"
                        aria-label="Delete moment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Name this moment</DialogTitle>
            <DialogDescription>
              Give this reading a short label so you can find it later (optional).
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={saveLabel}
            onChange={(e) => setSaveLabel(e.target.value)}
            placeholder="e.g. The summer everything shifted"
            maxLength={80}
            onKeyDown={(e) => { if (e.key === "Enter") confirmSaveMoment(); }}
          />
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setSaveOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={confirmSaveMoment} disabled={saving}>
              {saving ? "Saving…" : "Save moment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeTravel;