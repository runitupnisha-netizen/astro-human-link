import { useState } from "react";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateTime } from "luxon";
import { resolveTimezone } from "@/lib/ephemeris";

interface BirthTimeHelpTooltipProps {
  /** Optional tone hint — uses muted color by default. */
  className?: string;
  /** Local birth date as "YYYY-MM-DD" — enables the worked example. */
  birthDate?: string | null;
  /** Local birth time as "HH:MM" — enables the worked example. */
  birthTime?: string | null;
  /** Birth latitude — used to resolve IANA zone for the worked example. */
  latitude?: number | null;
  /** Birth longitude — used to resolve IANA zone for the worked example. */
  longitude?: number | null;
}

/** Format a Luxon offset (in minutes) as "UTC±HH:MM". */
const fmtOffset = (mins: number) => {
  const sign = mins >= 0 ? "+" : "-";
  const abs = Math.abs(mins);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
};

interface WorkedExample {
  zone: string;
  localLabel: string;
  observedOffset: string;
  observedUtc: string;
  notObservedOffset: string;
  notObservedUtc: string;
  dstActive: boolean;
}

/**
 * Build a worked example from the user's actual entered values when
 * available; otherwise fall back to a canonical example
 * (Brooklyn NY, June 14 1990 @ 03:30 — DST in effect).
 */
const buildExample = (
  birthDate?: string | null,
  birthTime?: string | null,
  lat?: number | null,
  lon?: number | null,
): WorkedExample => {
  let date = birthDate ?? null;
  let time = birthTime ?? null;
  let latitude = lat ?? null;
  let longitude = lon ?? null;
  let zone: string | null =
    latitude != null && longitude != null
      ? resolveTimezone(latitude, longitude)
      : null;

  // Validate inputs; if anything is missing or unparseable, use the
  // canonical demo so the example is always present.
  const hasValidInputs =
    !!date &&
    !!time &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    /^\d{2}:\d{2}/.test(time) &&
    !!zone;

  if (!hasValidInputs) {
    date = "1990-06-14";
    time = "03:30";
    latitude = 40.6782;
    longitude = -73.9442;
    zone = "America/New_York";
  }

  const [y, m, d] = date!.split("-").map(Number);
  const [hh, mm] = time!.split(":").map(Number);

  // Observed: native Luxon resolution honors DST for that historical date.
  const observed = DateTime.fromObject(
    { year: y, month: m, day: d, hour: hh, minute: mm },
    { zone: zone! },
  );
  // Not Observed: same wall clock interpreted as if DST never applied —
  // use the zone's standard offset for that date (offset + 60 when DST is on,
  // identical when DST is already off).
  const standardOffset = observed.isInDST ? observed.offset - 60 : observed.offset;
  const notObservedUtcMs = observed.toMillis() - (standardOffset - observed.offset) * 60_000;
  const notObserved = DateTime.fromMillis(notObservedUtcMs, { zone: "utc" });

  return {
    zone: zone!,
    localLabel: `${date} ${time}`,
    observedOffset: fmtOffset(observed.offset),
    observedUtc: observed.toUTC().toISO() ?? "",
    notObservedOffset: fmtOffset(standardOffset),
    notObservedUtc: notObserved.toISO() ?? "",
    dstActive: observed.isInDST,
  };
};

/**
 * Help tooltip for the natal-chart Birth Time field.
 *
 * Explains why DST and "Observed / Not Observed" matter for the UTC instant
 * we feed to the ephemeris. Uses Popover (not Tooltip) so it works on touch
 * devices and supports rich, multi-paragraph copy.
 */
const BirthTimeHelpTooltip = ({
  className,
  birthDate,
  birthTime,
  latitude,
  longitude,
}: BirthTimeHelpTooltipProps) => {
  const [open, setOpen] = useState(false);
  const [observedOpen, setObservedOpen] = useState(false);

  const example = buildExample(birthDate, birthTime, latitude, longitude);
  const usingUserInputs =
    !!birthDate &&
    !!birthTime &&
    latitude != null &&
    longitude != null &&
    /^\d{4}-\d{2}-\d{2}$/.test(birthDate) &&
    /^\d{2}:\d{2}/.test(birthTime);

  return (
    <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Why does birth time matter?"
          onClick={(e) => {
            // Don't let the click bubble into surrounding labels/forms.
            e.preventDefault();
            e.stopPropagation();
          }}
          className={
            "inline-flex items-center justify-center w-5 h-5 rounded-full text-muted-foreground hover:text-accent transition-colors " +
            (className ?? "")
          }
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={6}
        className="w-80 max-w-[calc(100vw-2rem)] bg-card/95 backdrop-blur-xl border-border/50 text-foreground p-4"
      >
        <div className="space-y-3 text-xs leading-relaxed">
          <div>
            <p className="font-display text-sm font-semibold mb-1 text-foreground">
              Enter your local clock time
            </p>
            <p className="text-muted-foreground">
              Type the time exactly as it read on the clock at the moment and
              place you were born — we handle the rest.
            </p>
          </div>

          <div className="rounded-lg border border-border/40 bg-background/40 p-2.5">
            <p className="text-foreground/90 font-medium mb-1">
              Daylight Saving (DST)
            </p>
            <p className="text-muted-foreground">
              We resolve your birth city's IANA timezone (e.g.{" "}
              <span className="font-mono text-[11px]">America/New_York</span>)
              and apply the historical DST rules in effect on your birth date.
              You don't need to subtract or add an hour yourself.
            </p>
          </div>

          <div className="rounded-lg border border-border/40 bg-background/40 p-2.5">
            <p className="text-foreground/90 font-medium mb-1">
              "Observed" vs "Not Observed"
            </p>
            <p className="text-muted-foreground mb-1.5">
              Some regions (Arizona except the Navajo Nation, Hawaii, most of
              Indiana before 2006, Saskatchewan, and others) do{" "}
              <span className="text-foreground/90 font-medium">not observe</span>{" "}
              DST. Birth certificates from those places are already in standard
              time — enter them as-is.
            </p>
            <p className="text-muted-foreground">
              For places that{" "}
              <span className="text-foreground/90 font-medium">do observe</span>{" "}
              DST, just enter the clock time. Our timezone database knows
              whether DST was active on your birth date.
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                setObservedOpen(true);
              }}
              className="mt-2 text-[11px] font-medium text-accent hover:text-accent/80 underline-offset-2 hover:underline transition-colors"
            >
              What does "Observed" mean? →
            </button>
          </div>

          <div className="rounded-lg border border-accent/40 bg-accent/5 p-2.5">
            <p className="text-foreground/90 font-medium mb-1">
              Ambiguous "fall-back" hour
            </p>
            <p className="text-muted-foreground mb-1.5">
              When clocks roll back in autumn, the same wall-clock hour
              happens <span className="text-foreground/90 font-medium">twice</span>.
              For example, in New York on Nov 7 2021, both 1:30 AM EDT and
              1:30 AM EST exist — and they're a full hour apart in UTC.
            </p>
            <p className="text-muted-foreground">
              If your birth time falls in this window, we'll show you{" "}
              <span className="text-foreground/90 font-medium">both</span>{" "}
              possible UTC instants on the review step so you can pick the
              correct one (DST = first occurrence, Standard = second).
            </p>
          </div>

          <p className="text-[11px] text-muted-foreground">
            ✦ A 1-hour DST mistake can shift your Rising sign by ~30° (a full
            sign change) and your Moon by ~0.5° — so we automate this to keep
            your chart accurate.
          </p>

          <div className="rounded-lg border border-border/40 bg-background/40 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-foreground/90 font-medium">
                Worked example
              </p>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {usingUserInputs ? "Your inputs" : "Sample"}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground space-y-0.5">
              <div>
                Local:{" "}
                <span className="font-mono text-foreground/90">
                  {example.localLabel}
                </span>
              </div>
              <div>
                Zone:{" "}
                <span className="font-mono text-foreground/90">
                  {example.zone}
                </span>
                {example.dstActive && (
                  <span className="ml-1.5 text-accent">(DST in effect)</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-1 pt-1">
              <div className="rounded-md border border-border/40 bg-background/60 px-2 py-1.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-foreground/90 text-[11px] font-medium">
                    Observed
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {example.observedOffset}
                  </span>
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  → {example.observedUtc}
                </div>
              </div>
              <div className="rounded-md border border-border/40 bg-background/60 px-2 py-1.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-foreground/90 text-[11px] font-medium">
                    Not Observed
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {example.notObservedOffset}
                  </span>
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  → {example.notObservedUtc}
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground pt-0.5">
              The "Observed" instant is what we send to the ephemeris.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>

    <Dialog open={observedOpen} onOpenChange={setObservedOpen}>
      <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            What "Observed" means for your natal chart
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            A quick primer on Daylight Saving and why it matters here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Your natal chart is cast for the exact <span className="text-foreground/90 font-medium">UTC instant</span>{" "}
            of your birth — not the local clock time. To convert, we need to
            know the offset between your birth city and UTC at that moment.
          </p>

          <div className="rounded-lg border border-border/40 bg-background/40 p-3 space-y-1.5">
            <p className="text-foreground/90 font-medium">Observed</p>
            <p>
              The location follows Daylight Saving Time and clocks were{" "}
              <span className="text-foreground/90 font-medium">moved forward</span>{" "}
              by one hour during the warmer months. Most of the US, Canada
              (except Saskatchewan), and Europe observe DST.
            </p>
          </div>

          <div className="rounded-lg border border-border/40 bg-background/40 p-3 space-y-1.5">
            <p className="text-foreground/90 font-medium">Not Observed</p>
            <p>
              The location keeps standard time year-round — the clock never
              jumps. Examples: Arizona (except the Navajo Nation), Hawaii,
              most of Indiana before 2006, Saskatchewan, Japan, China, India.
            </p>
          </div>

          <div className="rounded-lg border border-accent/40 bg-accent/5 p-3 space-y-1">
            <p className="text-foreground/90 font-medium">Why it matters</p>
            <p>
              A 1-hour error shifts the{" "}
              <span className="text-foreground/90 font-medium">Ascendant (Rising sign)</span>{" "}
              by roughly 15°, which is often a full sign change. The Moon
              moves about 0.5° in an hour, and the Midheaven moves the same
              amount as the Ascendant.
            </p>
          </div>

          <p className="text-xs">
            ✦ Good news: you don't have to figure this out yourself. We resolve
            your birth city's IANA timezone (e.g.{" "}
            <span className="font-mono text-[11px]">America/New_York</span>) and
            apply the historical DST rules in effect on your birth date —
            even for births before 1970.
          </p>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default BirthTimeHelpTooltip;
