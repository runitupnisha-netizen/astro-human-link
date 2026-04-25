import { describe, it, expect } from "vitest";
import { calcChartPlacements } from "@/lib/ephemeris";

/**
 * Astro.com parity fixtures.
 * Each case lists Sun / Moon / Rising / Mercury / Venus / Mars as published
 * by Astro.com's free chart wizard (tropical zodiac, geocentric, true equinox).
 * If any placement drifts the test fails — that means our ephemeris pipeline
 * has regressed and Lyra/blueprint will lie to users.
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
      moon_sign: "Capricorn",
      rising_sign: "Gemini",
      mercury_sign: "Capricorn",
      venus_sign: "Pisces",
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
      moon_sign: "Aries",
      rising_sign: "Libra",
      mercury_sign: "Cancer",
      venus_sign: "Gemini",
      mars_sign: "Virgo",
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
      moon_sign: "Aquarius",
      rising_sign: "Aquarius",
      mercury_sign: "Pisces",
      venus_sign: "Aquarius",
      mars_sign: "Aquarius",
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