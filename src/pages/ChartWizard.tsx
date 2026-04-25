import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Check,
  Sparkles,
} from "lucide-react";
import { DateTime } from "luxon";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import BirthTimeHelpTooltip from "@/components/BirthTimeHelpTooltip";
import {
  calcChartPlacements,
  buildBirthDateUTC,
  resolveTimezone,
  type ChartPlacements,
} from "@/lib/ephemeris";
import { cn } from "@/lib/utils";

/**
 * Chart Wizard
 *
 * A self-contained 4-step onboarding wizard that walks the user through
 * birth date → local time → birth city → review. The review step shows the
 * resolved IANA timezone, whether DST is in effect at that moment, the exact
 * UTC instant the chart will be cast for, and a sample chart with all six
 * placements (Sun, Moon, Rising, Mercury, Venus, Mars).
 *
 * Designed as a stand-alone, sharable preview surface — does not write to
 * the user's profile. Continue routes to the real Onboarding flow.
 */

type Step = 0 | 1 | 2 | 3;

interface WizardData {
  birthDate: Date | null;
  birthTime: string;
  birthPlace: string;
  latitude: number | null;
  longitude: number | null;
}

const FIELD_LABELS: Record<keyof ChartPlacements, string> = {
  sun_sign: "Sun",
  moon_sign: "Moon",
  rising_sign: "Rising",
  mercury_sign: "Mercury",
  venus_sign: "Venus",
  mars_sign: "Mars",
};

const STEP_TITLES = [
  "When were you born?",
  "What time?",
  "Where?",
  "Your cosmic preview",
];

const ChartWizard = () => {
  const [step, setStep] = useState<Step>(0);
  const [data, setData] = useState<WizardData>({
    birthDate: null,
    birthTime: "",
    birthPlace: "",
    latitude: null,
    longitude: null,
  });

  // Derive resolved zone + UTC + placements only when all inputs are present.
  const preview = useMemo(() => {
    if (
      !data.birthDate ||
      !data.birthTime ||
      data.latitude == null ||
      data.longitude == null
    ) {
      return null;
    }
    const isoDate = DateTime.fromJSDate(data.birthDate).toFormat("yyyy-LL-dd");
    const zone = resolveTimezone(data.latitude, data.longitude);
    const utc = buildBirthDateUTC(
      isoDate,
      data.birthTime,
      data.longitude,
      data.latitude,
    );
    const placements = calcChartPlacements({
      birthDate: isoDate,
      birthTime: data.birthTime,
      latitude: data.latitude,
      longitude: data.longitude,
    });
    let dstActive = false;
    let offsetLabel = "—";
    if (zone) {
      const local = DateTime.fromObject(
        {
          year: data.birthDate.getFullYear(),
          month: data.birthDate.getMonth() + 1,
          day: data.birthDate.getDate(),
          hour: parseInt(data.birthTime.split(":")[0], 10),
          minute: parseInt(data.birthTime.split(":")[1], 10),
        },
        { zone },
      );
      if (local.isValid) {
        dstActive = local.isInDST;
        const sign = local.offset >= 0 ? "+" : "-";
        const abs = Math.abs(local.offset);
        offsetLabel = `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
      }
    }
    return {
      zone,
      offsetLabel,
      dstActive,
      utcInstant: utc.toISOString(),
      placements,
    };
  }, [data]);

  const canAdvance = (() => {
    if (step === 0) return !!data.birthDate;
    if (step === 1) return /^\d{2}:\d{2}$/.test(data.birthTime);
    if (step === 2)
      return data.latitude != null && data.longitude != null && !!data.birthPlace;
    return true;
  })();

  const next = () => setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
  const prev = () => setStep((s) => (s > 0 ? ((s - 1) as Step) : s));

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-card/30 px-4 py-12">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </Link>
          <h1 className="text-2xl font-light tracking-tight">
            <Sparkles className="inline w-5 h-5 text-accent mr-1" />
            Chart Preview Wizard
          </h1>
          <p className="text-sm text-muted-foreground">
            See your timezone, DST, and sample placements before you continue.
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step
                  ? "w-8 bg-accent"
                  : i < step
                    ? "w-4 bg-accent/50"
                    : "w-4 bg-border",
              )}
            />
          ))}
        </div>

        <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{STEP_TITLES[step]}</CardTitle>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                className="min-h-[260px]"
              >
                {step === 0 && (
                  <div className="space-y-3">
                    <Label className="text-xs flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      Birth date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !data.birthDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {data.birthDate
                            ? format(data.birthDate, "PPP")
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={data.birthDate ?? undefined}
                          onSelect={(d) =>
                            setData((p) => ({ ...p, birthDate: d ?? null }))
                          }
                          disabled={(d) =>
                            d > new Date() || d < new Date("1900-01-01")
                          }
                          captionLayout="dropdown"
                          fromYear={1900}
                          toYear={new Date().getFullYear()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-[11px] text-muted-foreground">
                      Use your local civil date — the calendar day on the wall
                      where you were born.
                    </p>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Local birth time (24h)
                      </Label>
                      <BirthTimeHelpTooltip />
                    </div>
                    <Input
                      type="time"
                      value={data.birthTime}
                      onChange={(e) =>
                        setData((p) => ({ ...p, birthTime: e.target.value }))
                      }
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Enter the time exactly as it showed on the clock at your
                      birth city. We handle DST automatically using historical
                      IANA rules.
                    </p>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-3">
                    <Label className="text-xs flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      Birth city
                    </Label>
                    <LocationAutocomplete
                      value={data.birthPlace}
                      onChange={(v, lat, lon) =>
                        setData((p) => ({
                          ...p,
                          birthPlace: v,
                          latitude: lat ?? null,
                          longitude: lon ?? null,
                        }))
                      }
                      showGpsButton={false}
                    />
                    {data.latitude != null && data.longitude != null && (
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {data.latitude.toFixed(3)}, {data.longitude.toFixed(3)}
                      </p>
                    )}
                  </div>
                )}

                {step === 3 && preview && (
                  <div className="space-y-4">
                    {/* Resolved zone meta */}
                    <div className="rounded-lg border border-border/40 bg-background/40 p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">IANA zone</span>
                        <span className="font-mono">
                          {preview.zone ?? "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">UTC offset</span>
                        <span className="font-mono">{preview.offsetLabel}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">DST in effect</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            preview.dstActive
                              ? "border-accent/40 text-accent"
                              : "border-border/50 text-muted-foreground",
                          )}
                        >
                          {preview.dstActive ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">UTC instant</span>
                        <span className="font-mono text-[10px]">
                          {preview.utcInstant}
                        </span>
                      </div>
                    </div>

                    {/* Sample placements */}
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                        Sample placements
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(FIELD_LABELS) as Array<keyof ChartPlacements>).map(
                          (k) => (
                            <div
                              key={k}
                              className="rounded-lg border border-border/40 bg-background/40 p-2.5 flex items-center justify-between"
                            >
                              <span className="text-[11px] text-muted-foreground">
                                {FIELD_LABELS[k]}
                              </span>
                              <span className="font-mono text-xs text-foreground">
                                {preview.placements[k] ?? "—"}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground text-center">
                      Looks right? Continue to set up your full profile.
                    </p>
                  </div>
                )}

                {step === 3 && !preview && (
                  <div className="text-sm text-muted-foreground text-center py-12">
                    Missing inputs — go back and complete each step.
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Nav */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={prev}
            disabled={step === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          {step < 3 ? (
            <Button onClick={next} disabled={!canAdvance} size="sm">
              Next
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button asChild size="sm" disabled={!preview}>
              <Link to="/onboarding">
                <Check className="w-4 h-4 mr-1" />
                Continue to onboarding
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChartWizard;