import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Check, X, AlertTriangle, RefreshCw, ArrowLeft, Sliders } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  calcChartPlacements,
  buildBirthDateUTC,
  resolveTimezone,
  type ChartPlacements,
  type ZodiacSign,
} from "@/lib/ephemeris";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateTime } from "luxon";

type Placements = ChartPlacements;
type ParityField = keyof Placements;

const FIELD_LABELS: Record<ParityField, string> = {
  sun_sign: "Sun",
  moon_sign: "Moon",
  rising_sign: "Rising",
  mercury_sign: "Mercury",
  venus_sign: "Venus",
  mars_sign: "Mars",
};

const FIELD_ORDER: ParityField[] = [
  "sun_sign",
  "moon_sign",
  "rising_sign",
  "mercury_sign",
  "venus_sign",
  "mars_sign",
];

interface ParityCase {
  id: string;
  label: string;
  source: string;
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  expected: Record<ParityField, ZodiacSign>;
}

/**
 * Canonical parity fixtures that gate every release.
 *
 * Inputs use **local clock time at the birth city**. The ephemeris pipeline
 * resolves the IANA zone from (lat, lng) via tz-lookup, then luxon converts
 * to the correct UTC instant — including historical DST rules. So
 * "Jul 4 1985, 12:00 LA" is treated as PDT (UTC−7), and "Jan 20 1990, 15:30
 * NYC" is treated as EST (UTC−5).
 *
 * Expected placements were verified against Astro-Seek's free natal calculator
 * (tropical / geocentric / true equinox of date) — the same source of truth
 * used in `src/lib/__tests__/ephemeris.test.ts` and the regression suite.
 * Keep all three files in lock-step.
 */
const CASES: ParityCase[] = [
  {
    id: "nyc-1990",
    label: "Test 1 — New York City",
    source: "Jan 20 1990, 15:30 local (EST, no DST)",
    birthDate: "1990-01-20",
    birthTime: "15:30",
    latitude: 40.7128,
    longitude: -74.006,
    expected: {
      sun_sign: "Aquarius",
      moon_sign: "Scorpio",
      rising_sign: "Cancer",
      mercury_sign: "Capricorn",
      venus_sign: "Capricorn",
      mars_sign: "Sagittarius",
    },
  },
  {
    id: "la-1985",
    label: "Test 2 — Los Angeles",
    source: "Jul 4 1985, 12:00 local (PDT, UTC−7)",
    birthDate: "1985-07-04",
    birthTime: "12:00",
    latitude: 34.0522,
    longitude: -118.2437,
    expected: {
      sun_sign: "Cancer",
      moon_sign: "Aquarius",
      rising_sign: "Virgo",
      mercury_sign: "Leo",
      venus_sign: "Taurus",
      mars_sign: "Cancer",
    },
  },
  {
    id: "london-2000",
    label: "Test 3 — London",
    source: "Mar 15 2000, 06:00 local (GMT, no DST)",
    birthDate: "2000-03-15",
    birthTime: "06:00",
    latitude: 51.5074,
    longitude: -0.1278,
    expected: {
      sun_sign: "Pisces",
      moon_sign: "Cancer",
      rising_sign: "Pisces",
      mercury_sign: "Pisces",
      venus_sign: "Pisces",
      mars_sign: "Aries",
    },
  },
];

interface RowResult {
  field: ParityField;
  expected: ZodiacSign;
  computed: ZodiacSign | null;
  pass: boolean;
}

interface CaseResult {
  case: ParityCase;
  rows: RowResult[];
  passed: number;
  total: number;
  utcInstant: string;
  zone: string | null;
  computed: Placements;
}

function runCase(c: ParityCase): CaseResult {
  const computed = calcChartPlacements({
    birthDate: c.birthDate,
    birthTime: c.birthTime,
    latitude: c.latitude,
    longitude: c.longitude,
  });
  const utc = buildBirthDateUTC(c.birthDate, c.birthTime, c.longitude, c.latitude);
  const zone = resolveTimezone(c.latitude, c.longitude);
  const rows: RowResult[] = FIELD_ORDER.map((field) => {
    const exp = c.expected[field];
    const got = computed[field];
    return {
      field,
      expected: exp,
      computed: got,
      pass: got === exp,
    };
  });
  return {
    case: c,
    rows,
    passed: rows.filter((r) => r.pass).length,
    total: rows.length,
    utcInstant: utc.toISOString(),
    zone,
    computed,
  };
}

/**
 * Inspect an IANA zone at a date and report whether DST is in effect plus
 * the matching standard / DST UTC offsets in minutes. Used by the fixture
 * editor to forcibly toggle DST on or off without changing the IANA zone.
 */
function inspectZone(zone: string | null, isoDate: string) {
  if (!zone) return { inDst: false, stdOffsetMin: 0, dstOffsetMin: 0 };
  // Sample two datetimes 6 months apart to discover the zone's two offsets.
  const winter = DateTime.fromISO(`${isoDate.slice(0, 4)}-01-15T12:00`, { zone });
  const summer = DateTime.fromISO(`${isoDate.slice(0, 4)}-07-15T12:00`, { zone });
  const stdOffsetMin = Math.min(winter.offset, summer.offset);
  const dstOffsetMin = Math.max(winter.offset, summer.offset);
  const onDate = DateTime.fromISO(`${isoDate}T12:00`, { zone });
  const inDst = onDate.isInDST ?? onDate.offset === dstOffsetMin;
  return { inDst, stdOffsetMin, dstOffsetMin };
}

/**
 * Build the UTC instant for a fixture using a forced DST mode:
 *   - "auto":     honor the IANA zone (real historical DST rules)
 *   - "standard": treat the local time as standard (winter) offset
 *   - "dst":      treat the local time as DST (summer) offset
 * Falls back to `buildBirthDateUTC` when no IANA zone is resolvable.
 */
function buildUtcWithDst(
  birthDate: string,
  birthTime: string,
  latitude: number,
  longitude: number,
  mode: "auto" | "standard" | "dst",
): { utc: Date; zone: string | null; effectiveOffsetMin: number | null } {
  const zone = resolveTimezone(latitude, longitude);
  if (mode === "auto" || !zone) {
    const utc = buildBirthDateUTC(birthDate, birthTime, longitude, latitude);
    const effective = zone
      ? DateTime.fromObject(
          parseLocal(birthDate, birthTime),
          { zone },
        ).offset
      : null;
    return { utc, zone, effectiveOffsetMin: effective };
  }
  const { stdOffsetMin, dstOffsetMin } = inspectZone(zone, birthDate);
  const offsetMin = mode === "standard" ? stdOffsetMin : dstOffsetMin;
  // Build a fixed-offset zone string like "UTC-05:00".
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const fixedZone = `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(
    abs % 60,
  ).padStart(2, "0")}`;
  const dt = DateTime.fromObject(parseLocal(birthDate, birthTime), {
    zone: fixedZone,
  });
  return { utc: dt.toUTC().toJSDate(), zone, effectiveOffsetMin: offsetMin };
}

function parseLocal(birthDate: string, birthTime: string) {
  const [y, m, d] = birthDate.split("-").map(Number);
  const [hh, mm] = (birthTime || "12:00").split(":").map(Number);
  return { year: y, month: m, day: d, hour: hh, minute: mm, second: 0 };
}

function offsetLabel(min: number | null): string {
  if (min == null) return "—";
  const sign = min >= 0 ? "+" : "-";
  const abs = Math.abs(min);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(
    abs % 60,
  ).padStart(2, "0")}`;
}

const Pill = ({ ok, label }: { ok: boolean; label: string }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
      ok
        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
        : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
    }`}
  >
    {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
    {label}
  </span>
);

const CaseTable = ({ result }: { result: CaseResult }) => {
  const { rows, passed, total } = result;
  const ok = passed === total;
  return (
    <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base">{result.case.label}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {result.case.source} · {result.case.latitude.toFixed(3)},{" "}
              {result.case.longitude.toFixed(3)}
            </p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5 font-mono">
              {result.zone ?? "no-tz"} → {result.utcInstant}
            </p>
          </div>
          <Pill ok={ok} label={`${passed}/${total}`} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/50">
                <th className="py-2 pr-2 font-medium">Field</th>
                <th className="py-2 px-2 font-medium">Expected</th>
                <th className="py-2 px-2 font-medium">Computed</th>
                <th className="py-2 pl-2 font-medium text-right">Match</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.field} className="border-b border-border/20 last:border-0">
                  <td className="py-2 pr-2 text-muted-foreground">
                    {FIELD_LABELS[r.field]}
                  </td>
                  <td className="py-2 px-2 font-mono text-foreground">{r.expected}</td>
                  <td
                    className={`py-2 px-2 font-mono ${
                      r.pass ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {r.computed ?? "—"}
                  </td>
                  <td className="py-2 pl-2 text-right">
                    {r.pass ? (
                      <Check className="inline w-4 h-4 text-emerald-400" />
                    ) : (
                      <X className="inline w-4 h-4 text-rose-400" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

const ChartParity = () => {
  const { isAdmin, loading } = useIsAdmin();
  const [tick, setTick] = useState(0);

  // Custom case for ad-hoc validation (e.g. "verify a real user's birth chart").
  const [custom, setCustom] = useState({
    birthDate: "",
    birthTime: "",
    latitude: "",
    longitude: "",
  });
  const [customResult, setCustomResult] = useState<Placements | null>(null);
  const [customMeta, setCustomMeta] = useState<{ zone: string | null; utc: string } | null>(
    null,
  );

  // ----- Fixture editor state -----
  // Pick one of the canonical fixtures, override the DST mode, edit the
  // expected placements inline, and see the live diff against the computed
  // chart. "Auto" honors the IANA zone (real history). "Standard" forces the
  // zone's winter offset. "DST" forces the zone's summer offset. Useful for
  // sanity-checking what would happen if the user (or Astro.com) chose the
  // wrong DST setting on the same input.
  const [fxId, setFxId] = useState<string>(CASES[0].id);
  const [fxDst, setFxDst] = useState<"auto" | "standard" | "dst">("auto");
  const [fxExpected, setFxExpected] = useState<Record<ParityField, ZodiacSign>>(
    () => ({ ...CASES[0].expected }),
  );

  const results = useMemo(() => CASES.map(runCase), [tick]);
  const totals = results.reduce(
    (acc, r) => ({ passed: acc.passed + r.passed, total: acc.total + r.total }),
    { passed: 0, total: 0 },
  );
  const allGreen = totals.passed === totals.total;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const runCustom = () => {
    const lat = parseFloat(custom.latitude);
    const lng = parseFloat(custom.longitude);
    if (
      !custom.birthDate ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      setCustomResult(null);
      setCustomMeta(null);
      return;
    }
    const placements = calcChartPlacements({
      birthDate: custom.birthDate,
      birthTime: custom.birthTime || null,
      latitude: lat,
      longitude: lng,
    });
    const utc = buildBirthDateUTC(
      custom.birthDate,
      custom.birthTime || null,
      lng,
      lat,
    );
    setCustomResult(placements);
    setCustomMeta({ zone: resolveTimezone(lat, lng), utc: utc.toISOString() });
  };

  return (
    <div className="min-h-screen bg-background pt-20 md:pt-24 pb-24 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to Admin
            </Link>
            <h1 className="text-2xl md:text-3xl font-semibold mt-1">Chart Parity</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Validates the live ephemeris against the canonical Astro.com fixtures
              before every release.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Pill
              ok={allGreen}
              label={`${totals.passed}/${totals.total} placements match`}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTick((t) => t + 1)}
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-run
            </Button>
          </div>
        </div>

        {!allGreen && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="text-sm">
              <strong>Parity drift detected.</strong>{" "}
              {totals.total - totals.passed} placement
              {totals.total - totals.passed === 1 ? "" : "s"} disagree with Astro.com.
              Do not ship — investigate the ephemeris pipeline first.
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {results.map((r) => (
            <CaseTable key={r.case.id} result={r} />
          ))}
        </div>

        {/* Ad-hoc validator */}
        <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ad-hoc chart validator</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Plug in any birth data to compare against Astro.com manually
              (e.g. user-reported chart issues).
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cp-date" className="text-xs">Date</Label>
                <Input
                  id="cp-date"
                  type="date"
                  value={custom.birthDate}
                  onChange={(e) => setCustom({ ...custom, birthDate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cp-time" className="text-xs">Time (24h)</Label>
                <Input
                  id="cp-time"
                  type="time"
                  value={custom.birthTime}
                  onChange={(e) => setCustom({ ...custom, birthTime: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cp-lat" className="text-xs">Latitude</Label>
                <Input
                  id="cp-lat"
                  inputMode="decimal"
                  placeholder="40.7128"
                  value={custom.latitude}
                  onChange={(e) => setCustom({ ...custom, latitude: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cp-lng" className="text-xs">Longitude</Label>
                <Input
                  id="cp-lng"
                  inputMode="decimal"
                  placeholder="-74.006"
                  value={custom.longitude}
                  onChange={(e) => setCustom({ ...custom, longitude: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-3">
              <Button size="sm" onClick={runCustom}>
                Compute placements
              </Button>
            </div>

            {customResult && (
              <div className="mt-4 rounded-lg border border-border/50 bg-background/40 p-3">
                {customMeta && (
                  <p className="text-[11px] font-mono text-muted-foreground mb-2">
                    {customMeta.zone ?? "no-tz"} → {customMeta.utc}
                  </p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  {FIELD_ORDER.map((f) => (
                    <div
                      key={f}
                      className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2"
                    >
                      <span className="text-muted-foreground">{FIELD_LABELS[f]}</span>
                      <span className="font-mono text-foreground">
                        {customResult[f] ?? "—"}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-3">
                  Cross-check at{" "}
                  <a
                    href="https://www.astro.com/cgi/chart.cgi"
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent underline underline-offset-2"
                  >
                    astro.com
                  </a>
                  .
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChartParity;