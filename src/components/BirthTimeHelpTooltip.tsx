import { useState } from "react";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface BirthTimeHelpTooltipProps {
  /** Optional tone hint — uses muted color by default. */
  className?: string;
}

/**
 * Help tooltip for the natal-chart Birth Time field.
 *
 * Explains why DST and "Observed / Not Observed" matter for the UTC instant
 * we feed to the ephemeris. Uses Popover (not Tooltip) so it works on touch
 * devices and supports rich, multi-paragraph copy.
 */
const BirthTimeHelpTooltip = ({ className }: BirthTimeHelpTooltipProps) => {
  const [open, setOpen] = useState(false);

  return (
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
          </div>

          <p className="text-[11px] text-muted-foreground">
            ✦ A 1-hour DST mistake can shift your Rising sign by ~30° (a full
            sign change) and your Moon by ~0.5° — so we automate this to keep
            your chart accurate.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default BirthTimeHelpTooltip;
