import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { DateTime } from "luxon";
import { resolveTimezone } from "@/lib/ephemeris";
import { cn } from "@/lib/utils";

interface DstShiftWarningProps {
  /** Local birth date as "YYYY-MM-DD". */
  birthDate: string | null | undefined;
  /** Local birth time as "HH:MM" (24h). */
  birthTime: string | null | undefined;
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  className?: string;
}

/**
 * Inline warning that surfaces when the resolved IANA timezone applies DST
 * at the entered local birth instant — meaning the "Observed" vs
 * "Not Observed" interpretation of the wall clock would shift the UTC
 * instant by a full hour, which materially changes the chart (Ascendant
 * can flip a full sign, Moon can shift ~0.5°).
 *
 * Renders nothing when:
 *  - any input is missing or invalid,
 *  - the timezone can't be resolved,
 *  - DST is not in effect at the entered instant (no shift to warn about).
 */
const DstShiftWarning = ({
  birthDate,
  birthTime,
  latitude,
  longitude,
  className,
}: DstShiftWarningProps) => {
  const info = useMemo(() => {
    if (!birthDate || !birthTime) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
    if (!/^\d{2}:\d{2}/.test(birthTime)) return null;
    if (latitude == null || longitude == null) return null;
    const zone = resolveTimezone(latitude, longitude);
    if (!zone) return null;

    const [y, m, d] = birthDate.split("-").map(Number);
    const [hh, mm] = birthTime.split(":").map(Number);
    const local = DateTime.fromObject(
      { year: y, month: m, day: d, hour: hh, minute: mm },
      { zone },
    );
    if (!local.isValid) return null;
    if (!local.isInDST) return null;

    // Compute the alternative (Standard time) UTC instant for the same
    // wall clock by rebuilding it as if DST were not applied (offset + 60).
    const observedUtc = local.toUTC();
    const notObservedUtc = local.plus({ minutes: 60 }).toUTC();

    const fmtOffset = (mins: number) => {
      const s = mins >= 0 ? "+" : "-";
      const a = Math.abs(mins);
      return `UTC${s}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
    };

    return {
      zone,
      observedOffset: fmtOffset(local.offset),
      notObservedOffset: fmtOffset(local.offset - 60),
      observedUtc: observedUtc.toISO() ?? "",
      notObservedUtc: notObservedUtc.toISO() ?? "",
    };
  }, [birthDate, birthTime, latitude, longitude]);

  if (!info) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-accent/40 bg-accent/5 p-2.5 text-xs space-y-1.5",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-foreground">
            DST is in effect for this date in{" "}
            <span className="font-mono text-[11px]">{info.zone}</span>
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Switching between <span className="text-foreground/90 font-medium">Observed</span>{" "}
            and <span className="text-foreground/90 font-medium">Not Observed</span> shifts
            your chart's UTC instant by one full hour — enough to move the
            Ascendant a whole zodiac sign.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-1 pl-5">
        <div className="flex items-center justify-between rounded-md border border-border/40 bg-background/40 px-2 py-1">
          <span className="text-foreground/90">
            Observed ({info.observedOffset})
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {info.observedUtc}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border/40 bg-background/40 px-2 py-1">
          <span className="text-foreground/90">
            Not Observed ({info.notObservedOffset})
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {info.notObservedUtc}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DstShiftWarning;