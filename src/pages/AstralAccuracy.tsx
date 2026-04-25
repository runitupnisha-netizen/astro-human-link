import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Telescope } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  calcChartDebug,
  formatLongitude,
  resolveTimezone,
  type ChartDebugInfo,
} from "@/lib/ephemeris";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateTime } from "luxon";

interface SampleInput {
  id: string;
  label: string;
  source: string;
  birthDate: string;     // YYYY-MM-DD local
  birthTime: string;     // HH:MM local
  latitude: number;
  longitude: number;
  expectedTimezone: string;
  expectedUtcIso: string; // for human comparison
  notes?: string;
}

const SAMPLES: SampleInput[] = [
  {
    id: "nyc-1990",
    label: "New York City — Jan 20, 1990 · 3:30 PM EST",
    source: "Astro.com (Capricorn Sun, Pisces Rising)",
    birthDate: "1990-01-20",
    birthTime: "15:30",
    latitude: 40.7128,
    longitude: -74.006,
    expectedTimezone: "America/New_York",
    expectedUtcIso: "1990-01-20T20:30:00.000Z",
  },
  {
    id: "la-1985",
    label: "Los Angeles — Jul 4, 1985 · 12:00 PM PDT",
    source: "Astro.com (Cancer Sun)",
    birthDate: "1985-07-04",
    birthTime: "12:00",
    latitude: 34.0522,
    longitude: -118.2437,
    expectedTimezone: "America/Los_Angeles",
    expectedUtcIso: "1985-07-04T19:00:00.000Z",
  },
  {
    id: "london-1969",
    label: "London — Jul 20, 1969 · 8:17 PM BST (Apollo 11 landing)",
    source: "Historical reference",
    birthDate: "1969-07-20",
    birthTime: "20:17",
    latitude: 51.5074,
    longitude: -0.1278,
    expectedTimezone: "Europe/London",
    expectedUtcIso: "1969-07-20T19:17:00.000Z",
  },
  {
    id: "tokyo-2000",
    label: "Tokyo — Mar 15, 2000 · 9:00 AM JST",
    source: "Eastern hemisphere parity",
    birthDate: "2000-03-15",
    birthTime: "09:00",
    latitude: 35.6762,
    longitude: 139.6503,
    expectedTimezone: "Asia/Tokyo",
    expectedUtcIso: "2000-03-15T00:00:00.000Z",
  },
  {
    id: "sydney-1995",
    label: "Sydney — Dec 25, 1995 · 6:00 AM AEDT",
    source: "Southern hemisphere parity",
    birthDate: "1995-12-25",
    birthTime: "06:00",
    latitude: -33.8688,
    longitude: 151.2093,
    expectedTimezone: "Australia/Sydney",
    expectedUtcIso: "1995-12-24T19:00:00.000Z",
  },
];

interface AuditRow {
  input: SampleInput;
  resolvedTimezone: string | null;
  expectedZoneOk: boolean;
  expectedUtcOk: boolean;
  debug: ChartDebugInfo;
}

const fmtNum = (n: number, digits = 6) => {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits);
};

const Row = ({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex items-baseline justify-between gap-4 py-1 border-b border-border/40 last:border-0">
    <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
    <span className={`text-sm text-foreground ${mono ? "font-mono" : ""}`}>{value}</span>
  </div>
);

const AstralAccuracy = () => {
  const { isAdmin, loading } = useIsAdmin();

  const rows = useMemo<AuditRow[]>(() => {
    return SAMPLES.map((input) => {
      const debug = calcChartDebug({
        birthDate: input.birthDate,
        birthTime: input.birthTime,
        latitude: input.latitude,
        longitude: input.longitude,
      });
      const resolvedTimezone = resolveTimezone(input.latitude, input.longitude);
      return {
        input,
        resolvedTimezone,
        expectedZoneOk: resolvedTimezone === input.expectedTimezone,
        expectedUtcOk: debug.utcIso === input.expectedUtcIso,
        debug,
      };
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Checking access…
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background pt-20 pb-24 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Admin
            </Link>
          </Button>
          <Badge variant="secondary" className="gap-1">
            <Telescope className="w-3 h-3" /> Astral Accuracy
          </Badge>
        </div>

        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Astral Accuracy Audit
          </h1>
          <p className="text-muted-foreground">
            Live ephemeris run on canonical sample inputs. Shows the exact UTC
            instant fed into <code className="font-mono">astronomy-engine</code>,
            Julian Day, sidereal time, raw ecliptic longitudes, and resulting
            sign placements — for parity checks against Astro.com.
          </p>
        </header>

        {rows.map(({ input, resolvedTimezone, expectedZoneOk, expectedUtcOk, debug }) => {
          const localExpected = DateTime.fromISO(input.expectedUtcIso, { zone: "utc" })
            .setZone(input.expectedTimezone);
          return (
            <Card key={input.id} className="bg-card/60 border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-foreground">{input.label}</CardTitle>
                <p className="text-xs text-muted-foreground">{input.source}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                      Input
                    </h4>
                    <Row label="Local date" value={input.birthDate} />
                    <Row label="Local time" value={input.birthTime} />
                    <Row
                      label="Coords"
                      value={`${fmtNum(input.latitude, 4)}, ${fmtNum(input.longitude, 4)}`}
                    />
                    <Row label="Expected zone" value={input.expectedTimezone} />
                    <Row
                      label="Expected UTC"
                      value={input.expectedUtcIso}
                    />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                      Time resolution
                    </h4>
                    <Row
                      label="Resolved zone"
                      value={`${resolvedTimezone ?? "—"}  ${expectedZoneOk ? "✓" : "✗"}`}
                    />
                    <Row
                      label="UTC instant"
                      value={`${debug.utcIso}  ${expectedUtcOk ? "✓" : "✗"}`}
                    />
                    <Row
                      label="Local recheck"
                      value={localExpected.isValid
                        ? localExpected.toFormat("yyyy-LL-dd HH:mm ZZZZ")
                        : "—"}
                    />
                    <Row label="Julian Day (UT)" value={fmtNum(debug.julianDay, 6)} />
                    <Row label="GAST (hours)" value={fmtNum(debug.gastHours, 6)} />
                    <Row
                      label="LST (deg)"
                      value={debug.lstDeg != null ? fmtNum(debug.lstDeg, 4) : "—"}
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Geocentric ecliptic longitudes (true equinox of date)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                    <Row label="Sun" value={`${fmtNum(debug.longitudes.sun, 4)}°`} />
                    <Row label="Moon" value={`${fmtNum(debug.longitudes.moon, 4)}°`} />
                    <Row label="Mercury" value={`${fmtNum(debug.longitudes.mercury, 4)}°`} />
                    <Row label="Venus" value={`${fmtNum(debug.longitudes.venus, 4)}°`} />
                    <Row label="Mars" value={`${fmtNum(debug.longitudes.mars, 4)}°`} />
                    <Row
                      label="Ascendant"
                      value={
                        debug.longitudes.ascendant != null
                          ? `${fmtNum(debug.longitudes.ascendant, 4)}°`
                          : "—"
                      }
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Sign placements
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                    <Row label="Sun" value={formatLongitude(debug.longitudes.sun)} />
                    <Row label="Moon" value={formatLongitude(debug.longitudes.moon)} />
                    <Row label="Mercury" value={formatLongitude(debug.longitudes.mercury)} />
                    <Row label="Venus" value={formatLongitude(debug.longitudes.venus)} />
                    <Row label="Mars" value={formatLongitude(debug.longitudes.mars)} />
                    <Row
                      label="Rising"
                      value={
                        debug.longitudes.ascendant != null
                          ? formatLongitude(debug.longitudes.ascendant)
                          : "—"
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <p className="text-xs text-muted-foreground text-center pt-2">
          Calculated client-side via <code className="font-mono">src/lib/ephemeris.ts</code>{" "}
          — true obliquity (mean + nutation), IANA tz via tz-lookup + Luxon.
        </p>
      </div>
    </div>
  );
};

export default AstralAccuracy;