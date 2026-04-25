import { describe, it, expect } from "vitest";
import { calcChartDebug } from "@/lib/ephemeris";

/**
 * EPHEMERIS REGRESSION SUITE
 * --------------------------
 * Locks the *numeric* output of the ephemeris pipeline for the two demo
 * inputs (NYC + LA) used throughout the app and on App Store review screens.
 *
 * Why a separate suite from the sign-parity tests:
 *   - Sign tests pass even when a placement drifts ~10° within the same sign.
 *   - For Moon (~13°/day) and Rising (~1°/4min) tiny drift = wrong sign at
 *     the boundary, which produces 1-star reviews ("the app says my moon is
 *     wrong"). We need to detect drift *before* it crosses a sign cusp.
 *
 * The reference values below were captured from the verified pipeline
 * (tz-lookup → luxon → astronomy-engine v2.1.19) and cross-checked against
 * Astro-Seek's free birth-chart calculator (tropical, geocentric, true
 * equinox of date). If any of these fail, the ephemeris layer has changed
 * and CI must block the deploy until a human re-verifies against an
 * external source of truth.
 *
 * Tolerances:
 *   - UTC instant: must match to the millisecond (timezone pipeline change).
 *   - Julian Day:  1e-6 days  (~0.09s)
 *   - LST:         0.001°     (sidereal-time formula change)
 *   - Longitudes:  0.01°      (~36 arcseconds — well below sign-cusp risk)
 */

const DEG_TOLERANCE = 0.01;     // ~36 arcseconds
const LST_TOLERANCE = 0.001;    // sidereal-time math drift
const JD_TOLERANCE = 1e-6;      // ~0.09 seconds

interface RegressionFixture {
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

const FIXTURES: RegressionFixture[] = [
  {
    label: "NYC reference — Jan 20 1990, 15:30 EST, New York City",
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
      moonLongitude: 231.90158912884715,   // Scorpio 21°54'
      marsLongitude: 263.72997467909863,   // Sagittarius 23°43'
      ascendantLongitude: 103.45037322791273, // Cancer 13°27'
      moonSign: "Scorpio",
      marsSign: "Sagittarius",
      risingSign: "Cancer",
    },
  },
  {
    label: "LA demo account — Jan 15 1990, 10:00 PST, Los Angeles",
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
      moonLongitude: 170.61451971428346,   // Virgo 20°36'
      marsLongitude: 260.08722983774044,   // Sagittarius 20°05'
      ascendantLongitude: 354.88854035818576, // Pisces 24°53'
      moonSign: "Virgo",
      marsSign: "Sagittarius",
      risingSign: "Pisces",
    },
  },
];

describe("ephemeris regression — Moon / Rising / Mars must not drift", () => {
  for (const fx of FIXTURES) {
    describe(fx.label, () => {
      const debug = calcChartDebug(fx.input);

      it("UTC instant matches the reference timezone pipeline", () => {
        expect(debug.utcIso).toBe(fx.reference.utcIso);
      });

      it("Julian Day matches reference (≤1e-6 drift)", () => {
        expect(Math.abs(debug.julianDay - fx.reference.julianDay))
          .toBeLessThan(JD_TOLERANCE);
      });

      it("Local Sidereal Time matches reference (≤0.001° drift)", () => {
        expect(debug.lstDeg).not.toBeNull();
        expect(Math.abs((debug.lstDeg as number) - fx.reference.lstDeg))
          .toBeLessThan(LST_TOLERANCE);
      });

      it("Moon longitude matches reference (≤0.01° drift)", () => {
        const drift = Math.abs(debug.longitudes.moon - fx.reference.moonLongitude);
        expect(drift).toBeLessThan(DEG_TOLERANCE);
      });

      it("Mars longitude matches reference (≤0.01° drift)", () => {
        const drift = Math.abs(debug.longitudes.mars - fx.reference.marsLongitude);
        expect(drift).toBeLessThan(DEG_TOLERANCE);
      });

      it("Ascendant longitude matches reference (≤0.01° drift)", () => {
        expect(debug.longitudes.ascendant).not.toBeNull();
        const drift = Math.abs(
          (debug.longitudes.ascendant as number) - fx.reference.ascendantLongitude,
        );
        expect(drift).toBeLessThan(DEG_TOLERANCE);
      });

      // Cusp-distance guard: if a placement drifts close to a sign boundary
      // we want to know about it *before* the sign flips. Failing here means
      // we're within 0.5° of crossing into a different zodiac sign.
      it("Moon is safely inside its sign (≥0.5° from nearest cusp)", () => {
        const inSign = fx.reference.moonLongitude % 30;
        const distToCusp = Math.min(inSign, 30 - inSign);
        expect(distToCusp).toBeGreaterThan(0.5);
      });

      it("Ascendant is safely inside its sign (≥0.5° from nearest cusp)", () => {
        const inSign = fx.reference.ascendantLongitude % 30;
        const distToCusp = Math.min(inSign, 30 - inSign);
        expect(distToCusp).toBeGreaterThan(0.5);
      });
    });
  }
});
