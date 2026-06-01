import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  buildBirthDateUTC,
  planetLongitudes,
  ascendantLongitude,
  signAndDegree,
  computeAspects,
  ASPECTS,
  FULL_PLANET_BODIES,
  type PlanetKey,
  type ComputedAspect,
} from "@/lib/ephemeris";

/**
 * Premium interactive natal wheel.
 *
 * Renders the user's real chart from `astronomy-engine` — every planet at its
 * actual ecliptic degree, equal-house cusps derived from the Ascendant, and
 * the major aspect lines between planets. Tapping a planet glyph opens a card
 * with the placement and a short Lyra read; tapping an aspect line shows the
 * two planets, aspect type and orb.
 *
 * Free users see the static `NatalWheel` instead — this component is only
 * mounted when `isPremium` is true.
 */

interface Props {
  birthDate: string;            // "YYYY-MM-DD"
  birthTime: string | null;     // "HH:MM"
  latitude: number | null;
  longitude: number | null;
}

const SIGN_GLYPHS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const HOUSE_LABELS = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];

/** Short planet-in-sign reads — kept compact, Lyra is one tap away for depth. */
const PLANET_NOTES: Record<PlanetKey, string> = {
  sun: "Your core identity — the steady flame at your center.",
  moon: "Your inner weather — how you feel and self-soothe.",
  mercury: "How you think, learn and speak.",
  venus: "How you love, attract and value.",
  mars: "How you act, want and assert.",
  jupiter: "Where you expand, take risks and trust.",
  saturn: "Where you mature, restrict and master.",
  uranus: "Where you break form and innovate (generational).",
  neptune: "Where you dream and dissolve boundaries (generational).",
  pluto: "Where you transform and find power (generational).",
};

const HOUSE_THEMES: Record<number, string> = {
  1: "self & identity", 2: "money & values", 3: "communication", 4: "home & family",
  5: "creativity & romance", 6: "work & health", 7: "partnership", 8: "depth & shared resources",
  9: "philosophy & travel", 10: "career & public life", 11: "community & vision", 12: "the unconscious",
};

function polar(cx: number, cy: number, r: number, deg: number) {
  // Astrological wheel: 0° Aries on the left (East/ASC side, like Astro.com).
  // We rotate so the ASC sits at 180° (the standard orientation), then place
  // each ecliptic longitude counter-clockwise.
  const rad = ((180 - deg) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

const InteractiveNatalWheel = ({ birthDate, birthTime, latitude, longitude }: Props) => {
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetKey | null>(null);
  const [selectedAspect, setSelectedAspect] = useState<ComputedAspect | null>(null);

  const chart = useMemo(() => {
    if (!birthDate) return null;
    const utc = buildBirthDateUTC(birthDate, birthTime, longitude, latitude);
    const longs = planetLongitudes(utc);
    const asc =
      birthTime != null && latitude != null && longitude != null
        ? ascendantLongitude(utc, latitude, longitude)
        : null;
    const aspects = computeAspects(longs);
    return { longs, asc, aspects };
  }, [birthDate, birthTime, latitude, longitude]);

  if (!chart) {
    return (
      <div className="text-center text-xs text-muted-foreground py-6">
        Add your birth details to see your interactive chart.
      </div>
    );
  }

  const { longs, asc, aspects } = chart;
  // Wheel rotates so ASC sits at the left (9 o'clock). When ASC is missing
  // we fall back to 0° Aries on the left, matching the static NatalWheel.
  const wheelOffset = asc ?? 0;

  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 150;
  const rZodiac = 132;
  const rGlyph = 118;
  const rHouse = 100;
  const rPlanet = 78;
  const rAspectInner = 60;

  // Helper: convert ecliptic longitude to wheel angle, rotated by wheelOffset.
  const toWheelDeg = (lon: number) => ((lon - wheelOffset + 360) % 360);

  // Compute screen positions for every planet (with slight stacking when crowded).
  type Placed = { key: PlanetKey; lon: number; x: number; y: number; angle: number };
  const placed: Placed[] = [];
  // Sort by wheel angle so we can detect close clusters.
  const planetEntries = FULL_PLANET_BODIES.map((p) => ({ key: p.key, lon: longs[p.key] }))
    .sort((a, b) => toWheelDeg(a.lon) - toWheelDeg(b.lon));

  for (let i = 0; i < planetEntries.length; i++) {
    const e = planetEntries[i];
    const wheelAngle = toWheelDeg(e.lon);
    // Push outward slightly if previous planet is within 6° to avoid overlap
    let r = rPlanet;
    const prev = placed[placed.length - 1];
    if (prev) {
      const prevAngle = toWheelDeg(prev.lon);
      if (Math.abs(wheelAngle - prevAngle) < 6) r = prev.x === cx + (rPlanet - 12) * Math.cos(((180 - prevAngle) * Math.PI) / 180) ? rPlanet : rPlanet - 14;
    }
    const pos = polar(cx, cy, r, wheelAngle);
    placed.push({ key: e.key, lon: e.lon, x: pos.x, y: pos.y, angle: wheelAngle });
  }

  const planetByKey = Object.fromEntries(placed.map((p) => [p.key, p])) as Record<PlanetKey, Placed>;

  // House number for an ecliptic longitude (equal-house from ASC).
  const houseOf = (lon: number): number => {
    if (asc == null) return 0;
    const offset = ((lon - asc) % 360 + 360) % 360;
    return Math.floor(offset / 30) + 1;
  };

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg">
        <defs>
          <radialGradient id="iwheelBg" cx="50%" cy="50%">
            <stop offset="0%" stopColor="hsl(260 40% 18%)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(260 40% 8%)" stopOpacity="0.95" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={rOuter} fill="url(#iwheelBg)" stroke="hsl(280 50% 50% / 0.35)" />
        <circle cx={cx} cy={cy} r={rZodiac} fill="none" stroke="hsl(280 40% 60% / 0.25)" />
        <circle cx={cx} cy={cy} r={rHouse} fill="none" stroke="hsl(280 40% 60% / 0.15)" />
        <circle cx={cx} cy={cy} r={rAspectInner} fill="none" stroke="hsl(280 40% 60% / 0.1)" />

        {/* 12 zodiac sign slice lines */}
        {Array.from({ length: 12 }).map((_, i) => {
          const wheelAngle = ((i * 30) - wheelOffset + 360) % 360;
          const p1 = polar(cx, cy, rHouse, wheelAngle);
          const p2 = polar(cx, cy, rZodiac, wheelAngle);
          return <line key={`s-${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="hsl(280 40% 60% / 0.25)" />;
        })}

        {/* Sign glyphs */}
        {SIGN_GLYPHS.map((glyph, i) => {
          const wheelAngle = ((i * 30 + 15) - wheelOffset + 360) % 360;
          const pos = polar(cx, cy, rGlyph, wheelAngle);
          return (
            <text key={`sg-${i}`} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" fontSize="13" fill="hsl(280 60% 80% / 0.9)">
              {glyph}
            </text>
          );
        })}

        {/* House cusps (equal-house from ASC) and labels */}
        {asc != null && Array.from({ length: 12 }).map((_, i) => {
          const wheelAngle = (i * 30) % 360; // ASC is at 180° on screen
          const p1 = polar(cx, cy, rAspectInner, wheelAngle);
          const p2 = polar(cx, cy, rHouse, wheelAngle);
          const labelPos = polar(cx, cy, rHouse - 8, wheelAngle + 15);
          return (
            <g key={`h-${i}`}>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="hsl(45 70% 60% / 0.35)" strokeDasharray="3 3" />
              <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="hsl(45 60% 70% / 0.55)">
                {HOUSE_LABELS[i]}
              </text>
            </g>
          );
        })}

        {/* Aspect lines */}
        {aspects.map((asp, i) => {
          const a = planetByKey[asp.a];
          const b = planetByKey[asp.b];
          if (!a || !b) return null;
          const meta = ASPECTS.find((x) => x.key === asp.type)!;
          const pa = polar(cx, cy, rAspectInner, a.angle);
          const pb = polar(cx, cy, rAspectInner, b.angle);
          return (
            <line
              key={`a-${i}`}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke={meta.color}
              strokeOpacity={0.55}
              strokeWidth={1.4}
              strokeDasharray={asp.type === "square" || asp.type === "opposition" ? "3 2" : undefined}
              className="cursor-pointer hover:stroke-opacity-100"
              onClick={(e) => { e.stopPropagation(); setSelectedAspect(asp); }}
            />
          );
        })}

        {/* Planet glyphs */}
        {placed.map((p) => {
          const meta = FULL_PLANET_BODIES.find((b) => b.key === p.key)!;
          return (
            <g
              key={p.key}
              className="cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setSelectedPlanet(p.key); }}
            >
              <circle cx={p.x} cy={p.y} r={12} fill="hsl(260 40% 12%)" stroke="hsl(45 80% 65%)" strokeWidth={1} />
              <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="13" fill="hsl(45 80% 75%)" fontWeight="600">
                {meta.glyph}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="mt-3 text-[10px] text-muted-foreground/80 text-center max-w-xs">
        Tap any planet glyph or aspect line for detail. Houses are equal-house from your Ascendant.
      </p>

      {/* Planet detail dialog */}
      <Dialog open={!!selectedPlanet} onOpenChange={(o) => !o && setSelectedPlanet(null)}>
        <DialogContent className="max-w-sm bg-card/95 backdrop-blur-xl border-border/50">
          {selectedPlanet && (() => {
            const meta = FULL_PLANET_BODIES.find((b) => b.key === selectedPlanet)!;
            const sd = signAndDegree(longs[selectedPlanet]);
            const house = houseOf(longs[selectedPlanet]);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display text-lg flex items-center gap-2">
                    <span className="text-2xl text-amber-400">{meta.glyph}</span>
                    {meta.name} in {sd.sign}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    {sd.degree}°{sd.minute.toString().padStart(2, "0")}′ {sd.sign}
                    {house > 0 && <> · {HOUSE_LABELS[house - 1]} House — {HOUSE_THEMES[house]}</>}
                  </DialogDescription>
                </DialogHeader>
                <p className="text-sm font-serif leading-relaxed text-foreground/90 mt-2">
                  {PLANET_NOTES[selectedPlanet]}
                  {house > 0 && (
                    <> Acting through your {HOUSE_LABELS[house - 1]} house, this energy plays out in your {HOUSE_THEMES[house]}.</>
                  )}
                </p>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Aspect detail dialog */}
      <Dialog open={!!selectedAspect} onOpenChange={(o) => !o && setSelectedAspect(null)}>
        <DialogContent className="max-w-sm bg-card/95 backdrop-blur-xl border-border/50">
          {selectedAspect && (() => {
            const ma = FULL_PLANET_BODIES.find((b) => b.key === selectedAspect.a)!;
            const mb = FULL_PLANET_BODIES.find((b) => b.key === selectedAspect.b)!;
            const meta = ASPECTS.find((x) => x.key === selectedAspect.type)!;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display text-lg flex items-center gap-2">
                    <span className="text-xl">{ma.glyph}</span>
                    <span style={{ color: meta.color }}>{meta.symbol}</span>
                    <span className="text-xl">{mb.glyph}</span>
                    <span className="ml-1 text-sm capitalize text-muted-foreground">{selectedAspect.type}</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    {ma.name} {meta.symbol} {mb.name} · orb {selectedAspect.orb}°
                  </DialogDescription>
                </DialogHeader>
                <p className="text-sm font-serif leading-relaxed text-foreground/90 mt-2">
                  {selectedAspect.type === "conjunction" && `Your ${ma.name} and ${mb.name} fuse — they act as one drive, for better and worse.`}
                  {selectedAspect.type === "opposition" && `Your ${ma.name} and ${mb.name} face off — integrating these two pulls is part of your work.`}
                  {selectedAspect.type === "trine" && `Your ${ma.name} and ${mb.name} flow easily — a real gift that you have to use on purpose.`}
                  {selectedAspect.type === "square" && `Your ${ma.name} and ${mb.name} are in tension — friction that forces growth when you stop avoiding it.`}
                  {selectedAspect.type === "sextile" && `Your ${ma.name} and ${mb.name} support each other — opportunity that activates when you reach for it.`}
                </p>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground/80">
        {ASPECTS.map((a) => (
          <span key={a.key} className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-[2px] rounded" style={{ backgroundColor: a.color }} />
            {a.key}
          </span>
        ))}
      </div>
    </div>
  );
};

export default InteractiveNatalWheel;