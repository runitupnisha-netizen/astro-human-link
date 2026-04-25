import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle, CheckCircle2, RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { calcChartDebug, formatLongitude } from "@/lib/ephemeris";
import { cn } from "@/lib/utils";

/**
 * Chart Drift Dashboard
 *
 * Compares the *currently computed* placements against the canonical
 * regression fixtures (the same numbers CI locks in
 * `ephemeris-regression.test.ts`). Highlights every planet that drifted,
 * by how many degrees, and whether the *sign* changed — the failure mode
 * that produces 1-star reviews.
 *
 * Three drift bands:
 *   • OK      — < 0.01° (within CI tolerance)
 *   • DRIFT   — ≥ 0.01° but same sign
 *   • SIGN    — sign flipped (highest severity)
 */

interface DriftFixture {
  label: string;
  input: {
    birthDate: string;
    birthTime: string;
    latitude: number;
    longitude: number;
  };
  reference: {
    utcIso: string;
    julianDay: number;
    lstDeg: number;
    moonLongitude: number;
    marsLongitude: number;
    ascendantLongitude: number;
    moonSign: string;
    marsSign: string;
    risingSign: string;
  };
}

/** Mirrors src/lib/__tests__/ephemeris-regression.test.ts FIXTURES. */
const FIXTURES: DriftFixture[] = [
  {
    label: "NYC reference — Jan 20 1990, 15:30 EST",
    input: {
      birthDate: "1990-01-20",
      birthTime: "15:30",
      latitude: 40.7128,
      longitude: -74.006,
    },
    reference: {
      utcIso: "1990-01-20T20:30:00.000Z",
      julianDay: 2447912.3541666665,
      lstDeg: 353.4499973300275,
      moonLongitude: 231.90158912884715,
      marsLongitude: 263.72997467909863,
      ascendantLongitude: 103.45037322791273,
      moonSign: "Scorpio",
      marsSign: "Sagittarius",
      risingSign: "Cancer",
    },
  },
  {
    label: "LA demo — Jan 15 1990, 10:00 PST",
    input: {
      birthDate: "1990-01-15",
      birthTime: "10:00",
      latitude: 34.0522,
      longitude: -118.2437,
    },
    reference: {
      utcIso: "1990-01-15T18:00:00.000Z",
      julianDay: 2447907.25,
      lstDeg: 266.6814199103957,
      moonLongitude: 170.61451971428346,
      marsLongitude: 260.08722983774044,
      ascendantLongitude: 354.88854035818576,
      moonSign: "Virgo",
      marsSign: "Sagittarius",
      risingSign: "Pisces",
    },
  },
];

const DEG_TOLERANCE = 0.01;

type Severity = "ok" | "drift" | "sign";

interface PlanetDrift {
  planet: "Moon" | "Mars" | "Rising";
  expectedLon: number;
  actualLon: number | null;
  expectedSign: string;
  actualSign: string | null;
  driftDeg: number | null;
  severity: Severity;
}

interface FixtureDiff {
  fixture: DriftFixture;
  utcMatch: boolean;
  actualUtcIso: string;
  jdDrift: number;
  lstDrift: number | null;
  planets: PlanetDrift[];
  worst: Severity;
}

const ZODIAC = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

function signFromLongitude(lon: number): string {
  const norm = ((lon % 360) + 360) % 360;
  return ZODIAC[Math.floor(norm / 30)];
}

function classify(
  expectedLon: number,
  actualLon: number | null,
  expectedSign: string,
  actualSign: string | null,
): Severity {
  if (actualLon == null || actualSign == null) return "sign";
  if (expectedSign !== actualSign) return "sign";
  if (Math.abs(actualLon - expectedLon) >= DEG_TOLERANCE) return "drift";
  return "ok";
}

function computeDiff(fx: DriftFixture): FixtureDiff {
  const debug = calcChartDebug(fx.input);

  const planets: PlanetDrift[] = [
    {
      planet: "Moon",
      expectedLon: fx.reference.moonLongitude,
      actualLon: debug.longitudes.moon,
      expectedSign: fx.reference.moonSign,
      actualSign: signFromLongitude(debug.longitudes.moon),
      driftDeg: Math.abs(debug.longitudes.moon - fx.reference.moonLongitude),
      severity: "ok",
    },
    {
      planet: "Mars",
      expectedLon: fx.reference.marsLongitude,
      actualLon: debug.longitudes.mars,
      expectedSign: fx.reference.marsSign,
      actualSign: signFromLongitude(debug.longitudes.mars),
      driftDeg: Math.abs(debug.longitudes.mars - fx.reference.marsLongitude),
      severity: "ok",
    },
    {
      planet: "Rising",
      expectedLon: fx.reference.ascendantLongitude,
      actualLon: debug.longitudes.ascendant,
      expectedSign: fx.reference.risingSign,
      actualSign:
        debug.longitudes.ascendant != null
          ? signFromLongitude(debug.longitudes.ascendant)
          : null,
      driftDeg:
        debug.longitudes.ascendant != null
          ? Math.abs(debug.longitudes.ascendant - fx.reference.ascendantLongitude)
          : null,
      severity: "ok",
    },
  ];

  for (const p of planets) {
    p.severity = classify(p.expectedLon, p.actualLon, p.expectedSign, p.actualSign);
  }

  const worst: Severity = planets.some((p) => p.severity === "sign")
    ? "sign"
    : planets.some((p) => p.severity === "drift")
      ? "drift"
      : "ok";

  return {
    fixture: fx,
    utcMatch: debug.utcIso === fx.reference.utcIso,
    actualUtcIso: debug.utcIso,
    jdDrift: Math.abs(debug.julianDay - fx.reference.julianDay),
    lstDrift:
      debug.lstDeg != null ? Math.abs(debug.lstDeg - fx.reference.lstDeg) : null,
    planets,
    worst,
  };
}

const SeverityBadge = ({ severity }: { severity: Severity }) => {
  const cfg = {
    ok: { label: "OK", cls: "border-emerald-500/40 text-emerald-400 bg-emerald-500/5" },
    drift: { label: "Drift", cls: "border-amber-500/40 text-amber-400 bg-amber-500/5" },
    sign: { label: "Sign flipped", cls: "border-destructive/50 text-destructive bg-destructive/5" },
  }[severity];
  return (
    <Badge variant="outline" className={cn("text-[10px] font-mono", cfg.cls)}>
      {cfg.label}
    </Badge>
  );
};

const ChartDrift = () => {
  const [tick, setTick] = useState(0);
  const diffs = useMemo(() => FIXTURES.map(computeDiff), [tick]);

  const totals = diffs.reduce(
    (acc, d) => {
      for (const p of d.planets) acc[p.severity] += 1;
      return acc;
    },
    { ok: 0, drift: 0, sign: 0 } as Record<Severity, number>,
  );

  const overall: Severity =
    totals.sign > 0 ? "sign" : totals.drift > 0 ? "drift" : "ok";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-card/30 px-4 py-12">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Admin
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-light tracking-tight">
                Chart Drift Dashboard
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Live placements vs. CI-locked reference fixtures.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTick((t) => t + 1)}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Recompute
            </Button>
          </div>
        </div>

        {/* Overall summary */}
        <Card
          className={cn(
            "border-border/50 bg-card/40 backdrop-blur-sm",
            overall === "sign" && "border-destructive/40",
            overall === "drift" && "border-amber-500/30",
            overall === "ok" && "border-emerald-500/30",
          )}
        >
          <CardContent className="pt-6 flex items-center gap-3 flex-wrap">
            {overall === "ok" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : overall === "drift" ? (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            )}
            <div className="flex-1 min-w-[180px]">
              <p className="text-sm font-medium">
                {overall === "ok"
                  ? "All fixtures match — no drift detected."
                  : overall === "drift"
                    ? "Numeric drift detected — signs still correct."
                    : "Sign change detected — investigate immediately."}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Tolerance: {DEG_TOLERANCE}° (~36 arcseconds).
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px] font-mono">
                {totals.ok} ok
              </Badge>
              <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px] font-mono">
                {totals.drift} drift
              </Badge>
              <Badge variant="outline" className="border-destructive/50 text-destructive text-[10px] font-mono">
                {totals.sign} sign
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Per-fixture detail */}
        {diffs.map((diff) => (
          <Card
            key={diff.fixture.label}
            className="border-border/50 bg-card/40 backdrop-blur-sm"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <CardTitle className="text-base font-normal">
                  {diff.fixture.label}
                </CardTitle>
                <SeverityBadge severity={diff.worst} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pipeline meta */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-md border border-border/40 bg-background/40 p-2">
                  <div className="text-muted-foreground">UTC instant</div>
                  <div
                    className={cn(
                      "font-mono mt-0.5",
                      diff.utcMatch ? "text-foreground" : "text-destructive",
                    )}
                  >
                    {diff.utcMatch ? "match" : `≠ ${diff.actualUtcIso}`}
                  </div>
                </div>
                <div className="rounded-md border border-border/40 bg-background/40 p-2">
                  <div className="text-muted-foreground">Julian Day drift</div>
                  <div className="font-mono mt-0.5">
                    {diff.jdDrift.toExponential(2)}
                  </div>
                </div>
                <div className="rounded-md border border-border/40 bg-background/40 p-2">
                  <div className="text-muted-foreground">LST drift (°)</div>
                  <div className="font-mono mt-0.5">
                    {diff.lstDrift?.toFixed(6) ?? "—"}
                  </div>
                </div>
              </div>

              {/* Planet rows */}
              <div className="space-y-1.5">
                {diff.planets.map((p) => {
                  const driftArcMin =
                    p.driftDeg != null ? p.driftDeg * 60 : null;
                  return (
                    <div
                      key={p.planet}
                      className={cn(
                        "rounded-lg border p-3 grid grid-cols-12 gap-2 items-center text-xs",
                        p.severity === "ok" && "border-border/40 bg-background/30",
                        p.severity === "drift" && "border-amber-500/30 bg-amber-500/5",
                        p.severity === "sign" && "border-destructive/40 bg-destructive/5",
                      )}
                    >
                      <div className="col-span-3 sm:col-span-2 font-medium">
                        {p.planet}
                      </div>
                      <div className="col-span-9 sm:col-span-4 font-mono text-[11px] text-muted-foreground">
                        <div>exp&nbsp; {formatLongitude(p.expectedLon)}</div>
                        <div className={cn(p.severity !== "ok" && "text-foreground")}>
                          got&nbsp; {p.actualLon != null ? formatLongitude(p.actualLon) : "—"}
                        </div>
                      </div>
                      <div className="col-span-7 sm:col-span-3 text-[11px]">
                        {p.severity === "sign" ? (
                          <span className="text-destructive font-medium">
                            {p.expectedSign} → {p.actualSign ?? "n/a"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {p.actualSign}
                          </span>
                        )}
                      </div>
                      <div className="col-span-3 sm:col-span-2 text-right font-mono text-[11px]">
                        {driftArcMin != null
                          ? `${driftArcMin < 1 ? driftArcMin.toFixed(3) : driftArcMin.toFixed(1)}'`
                          : "—"}
                      </div>
                      <div className="col-span-2 sm:col-span-1 flex justify-end">
                        <SeverityBadge severity={p.severity} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] text-muted-foreground font-mono">
                Drift shown in arcminutes. CI tolerance: {DEG_TOLERANCE}° = {(DEG_TOLERANCE * 60).toFixed(1)}'.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ChartDrift;