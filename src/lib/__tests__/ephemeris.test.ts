import { describe, it, expect } from "vitest";
import { calcChartPlacements } from "@/lib/ephemeris";

/**
 * Ephemeris parity fixtures.
 *
 * Each case lists Sun / Moon / Rising / Mercury / Venus / Mars verified against
 * an independent calculator (Astro-Seek free birth-chart tool, tropical
 * zodiac / geocentric / true equinox of date). The Astro-Seek output for
 * Jan 20 1990 15:30 NYC (Aquarius Sun 0°19', Scorpio Moon 19°25', Capricorn
 * Mercury 9°42', Capricorn Venus 27°32', Sagittarius Mars 23°34') matches
 * astronomy-engine to within sub-degree precision, which is the source of
 * truth here.
 *
 * These fixtures lock the timezone pipeline (tz-lookup → luxon → UTC instant
 * → astronomy-engine) end to end. If any placement drifts the test fails —
 * that means our ephemeris pipeline has regressed and Lyra/blueprint will lie
 * to users.
 */
const CASES = [
  {
    label: "Test 1 — Jan 20 1990, 15:30, New York City",
    input: {
      birthDate: "1990-01-20",
      birthTime: "15:30",
      latitude: 40.7128,
      longitude: -74.006,
    },
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
    label: "Test 2 — Jul 4 1985, 12:00, Los Angeles",
    input: {
      birthDate: "1985-07-04",
      birthTime: "12:00",
      latitude: 34.0522,
      longitude: -118.2437,
    },
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
    label: "Test 3 — Mar 15 2000, 06:00, London",
    input: {
      birthDate: "2000-03-15",
      birthTime: "06:00",
      latitude: 51.5074,
      longitude: -0.1278,
    },
    expected: {
      sun_sign: "Pisces",
      moon_sign: "Cancer",
      rising_sign: "Pisces",
      mercury_sign: "Pisces",
      venus_sign: "Pisces",
      mars_sign: "Aries",
    },
  },
  {
    label: "Test 4 — Jan 15 1990, 10:00, Los Angeles (demo account)",
    input: {
      birthDate: "1990-01-15",
      birthTime: "10:00",
      latitude: 34.0522,
      longitude: -118.2437,
    },
    expected: {
      sun_sign: "Capricorn",
      moon_sign: "Virgo",
      rising_sign: "Pisces",
      mercury_sign: "Capricorn",
      venus_sign: "Aquarius",
      mars_sign: "Sagittarius",
    },
  },
] as const;

describe("ephemeris — Astro.com parity", () => {
  for (const c of CASES) {
    describe(c.label, () => {
      const result = calcChartPlacements(c.input);

      it("Sun sign matches Astro.com", () => {
        expect(result.sun_sign).toBe(c.expected.sun_sign);
      });
      it("Moon sign matches Astro.com", () => {
        expect(result.moon_sign).toBe(c.expected.moon_sign);
      });
      it("Rising sign matches Astro.com", () => {
        expect(result.rising_sign).toBe(c.expected.rising_sign);
      });
      it("Mercury sign matches Astro.com", () => {
        expect(result.mercury_sign).toBe(c.expected.mercury_sign);
      });
      it("Venus sign matches Astro.com", () => {
        expect(result.venus_sign).toBe(c.expected.venus_sign);
      });
      it("Mars sign matches Astro.com", () => {
        expect(result.mars_sign).toBe(c.expected.mars_sign);
      });
    });
  }
});