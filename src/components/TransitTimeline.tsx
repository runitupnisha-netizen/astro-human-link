import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Sparkles, Crown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { usePremium } from "@/hooks/usePremium";
import { computeUpcomingTransits, groupTransits, type TransitCard, type TransitGroup } from "@/lib/transits";

/**
 * Horizontal swipeable timeline of upcoming transits, grouped into themed rows.
 *
 * Free users see the card titles + date ranges; tapping opens a teaser that
 * nudges to Premium. Premium users get a deep Lyra read seeded with their
 * personal chart context (handled via the existing /lyra deep-link with seed).
 */

const GROUP_ORDER: TransitGroup[] = ["drive", "expansion", "structure", "lunar"];
const GROUP_SUBLABEL: Record<TransitGroup, string> = {
  drive: "Temporary cycles bringing change",
  expansion: "Growth, luck and opportunity",
  structure: "Long arcs of maturation",
  lunar: "Monthly emotional turning points",
};

const TransitTimeline = ({ compact = false }: { compact?: boolean }) => {
  const navigate = useNavigate();
  const { subscribed: isPremium } = usePremium();
  const [selected, setSelected] = useState<TransitCard | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Defer ephemeris work past the initial paint so the page doesn't jank.
    const t = setTimeout(() => setNow(new Date()), 50);
    return () => clearTimeout(t);
  }, []);

  const groups = useMemo(() => {
    if (!now) return null;
    try {
      return groupTransits(computeUpcomingTransits(now));
    } catch (e) {
      console.warn("[TransitTimeline] compute failed", e);
      return null;
    }
  }, [now]);

  if (!groups) {
    return (
      <div className="text-xs text-muted-foreground py-4">Mapping the sky…</div>
    );
  }

  const open = (c: TransitCard) => {
    if (isPremium) {
      navigate(`/lyra?seed=${encodeURIComponent(c.lyraSeed)}`);
    } else {
      setSelected(c);
    }
  };

  return (
    <div className="space-y-5">
      {GROUP_ORDER.map((g) => {
        const items = groups[g].slice(0, compact ? 5 : 10);
        if (items.length === 0) return null;
        return (
          <section key={g}>
            <div className="mb-2 px-1">
              <h3 className="font-display text-sm font-semibold text-foreground">{items[0].groupLabel}</h3>
              <p className="text-[11px] text-muted-foreground">{GROUP_SUBLABEL[g]}</p>
            </div>
            <div
              className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory"
              style={{ scrollbarWidth: "thin" }}
            >
              {items.map((c) => (
                <button
                  key={c.id}
                  onClick={() => open(c)}
                  className="relative shrink-0 w-[220px] snap-start rounded-2xl border border-border/40 bg-card/70 backdrop-blur-md p-4 text-left hover:border-accent/40 hover:bg-card/90 transition-colors active:scale-[0.99]"
                >
                  <div className="absolute top-3 right-3 flex items-center gap-0.5 text-lg leading-none opacity-80">
                    {c.glyphs.map((gl, i) => (
                      <span key={i} aria-hidden>{gl}</span>
                    ))}
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
                    {c.rangeLabel}
                  </p>
                  <h4 className="font-display text-base font-semibold text-foreground mt-1 pr-10 leading-snug">
                    {c.title}
                  </h4>
                  <div className="mt-3 inline-flex items-center gap-1 text-[11px] text-accent">
                    {isPremium ? (
                      <><Sparkles className="w-3 h-3" /> Tap for Lyra's read</>
                    ) : (
                      <><Lock className="w-3 h-3 text-amber-400" /> <span className="text-amber-400">Pro: full read</span></>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {/* Free user teaser dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-sm bg-card/95 backdrop-blur-xl border-border/50">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-lg">{selected.title}</DialogTitle>
                <DialogDescription className="text-xs">{selected.rangeLabel}</DialogDescription>
              </DialogHeader>
              <p className="text-sm text-foreground/90 leading-relaxed mt-2">
                Personalized transit reads are part of Stellara Pro. Unlock to have Lyra tie this transit to your natal chart and tell you what to do about it.
              </p>
              <button
                onClick={() => navigate("/premium")}
                className="mt-4 inline-flex items-center justify-center gap-1.5 w-full rounded-full bg-gradient-to-r from-amber-400 to-amber-300 px-4 py-2.5 text-sm font-medium text-background"
              >
                <Crown className="w-4 h-4" /> Unlock Pro
              </button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransitTimeline;