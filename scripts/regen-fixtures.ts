#!/usr/bin/env tsx
/**
 * scripts/regen-fixtures.ts
 *
 * One-click regeneration of the parity-case reference placements.
 *
 * Reads the canonical case inputs (NYC + LA) from this file, runs them
 * through the *current* ephemeris pipeline (`calcChartDebug`), and rewrites
 * the `reference: { ... }` blocks inside
 * `src/lib/__tests__/ephemeris-regression.test.ts` so the CI fixtures stay
 * locked to whatever the engine produces *right now*.
 *
 * Run with:
 *   bun run regen:fixtures
 *   # or directly: bunx tsx scripts/regen-fixtures.ts
 *
 * IMPORTANT: This is a *trust-the-engine* refresh. Only run it when you have
 * cross-checked the new outputs against an external source of truth (e.g.
 * Astro-Seek). The whole point of the regression suite is to catch silent
 * drift, so blindly regenerating defeats it.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { calcChartDebug } from "../src/lib/ephemeris";

interface ParityCase {
  label: string;
  input: {
    birthDate: string;
    birthTime: string;
    latitude: number;
    longitude: number;
  };
}

const ZODIAC = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

function signFromLongitude(lonDeg: number): string {
  const norm = ((lonDeg % 360) + 360) % 360;
  return ZODIAC[Math.floor(norm / 30)];
}

/** Canonical parity cases — single source of truth for fixture inputs. */
const CASES: ParityCase[] = [
  {
    label: "NYC reference — Jan 20 1990, 15:30 EST, New York City",
    input: {
      birthDate: "1990-01-20",
      birthTime: "15:30",
      latitude: 40.7128,
      longitude: -74.006,
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
  },
];

function formatInSign(lon: number): string {
  const norm = ((lon % 360) + 360) % 360;
  const sign = signFromLongitude(norm);
  const inSign = norm - Math.floor(norm / 30) * 30;
  const deg = Math.floor(inSign);
  const minFloat = (inSign - deg) * 60;
  const min = Math.floor(minFloat);
  return `${sign} ${deg}°${min.toString().padStart(2, "0")}'`;
}

function buildReferenceBlock(c: ParityCase): string {
  const debug = calcChartDebug({
    birthDate: c.input.birthDate,
    birthTime: c.input.birthTime,
    latitude: c.input.latitude,
    longitude: c.input.longitude,
  });

  if (debug.longitudes.ascendant == null || debug.lstDeg == null) {
    throw new Error(
      `[regen-fixtures] Ascendant/LST missing for "${c.label}" — case must include lat/lng/time.`,
    );
  }

  const moon = debug.longitudes.moon;
  const mars = debug.longitudes.mars;
  const asc = debug.longitudes.ascendant;

  return [
    "    reference: {",
    `      utcIso: ${JSON.stringify(debug.utcIso)},`,
    `      julianDay: ${debug.julianDay},`,
    `      lstDeg: ${debug.lstDeg},`,
    `      moonLongitude: ${moon},   // ${formatInSign(moon)}`,
    `      marsLongitude: ${mars},   // ${formatInSign(mars)}`,
    `      ascendantLongitude: ${asc}, // ${formatInSign(asc)}`,
    `      moonSign: ${JSON.stringify(signFromLongitude(moon))},`,
    `      marsSign: ${JSON.stringify(signFromLongitude(mars))},`,
    `      risingSign: ${JSON.stringify(signFromLongitude(asc))},`,
    "    },",
  ].join("\n");
}

/**
 * Replace each `reference: { ... }` block inside the FIXTURES array with the
 * freshly computed values. Matches each case by its `label:` line so order
 * and additions are robust.
 */
function rewriteFixturesFile(filePath: string, cases: ParityCase[]): void {
  const source = readFileSync(filePath, "utf8");
  let updated = source;
  let replacements = 0;

  for (const c of cases) {
    // Find the `label: "<label>"` line, then the next `reference: {` block,
    // and replace through its closing `},` (4-space indent).
    const labelEsc = c.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(
      `(label:\\s*"${labelEsc}",[\\s\\S]*?)reference:\\s*\\{[\\s\\S]*?\\n    \\},`,
      "m",
    );
    if (!re.test(updated)) {
      throw new Error(
        `[regen-fixtures] Could not locate reference block for case: "${c.label}"`,
      );
    }
    const block = buildReferenceBlock(c).replace(/^    /, ""); // leading indent handled below
    updated = updated.replace(re, (_match, prefix) => {
      return `${prefix}${block.replace(/^reference:/, "reference:")}`;
    });
    replacements += 1;
  }

  if (updated === source) {
    console.log("[regen-fixtures] No changes needed — fixtures already match.");
    return;
  }

  writeFileSync(filePath, updated, "utf8");
  console.log(
    `[regen-fixtures] Rewrote ${replacements} reference block(s) in ${filePath}`,
  );
}

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const fixturesPath = resolve(
    here,
    "..",
    "src/lib/__tests__/ephemeris-regression.test.ts",
  );

  console.log("[regen-fixtures] Recomputing parity reference values…\n");
  for (const c of CASES) {
    const debug = calcChartDebug({
      birthDate: c.input.birthDate,
      birthTime: c.input.birthTime,
      latitude: c.input.latitude,
      longitude: c.input.longitude,
    });
    console.log(`• ${c.label}`);
    console.log(`    UTC      ${debug.utcIso}`);
    console.log(`    Moon     ${formatInSign(debug.longitudes.moon)}`);
    console.log(`    Mars     ${formatInSign(debug.longitudes.mars)}`);
    console.log(
      `    Rising   ${
        debug.longitudes.ascendant != null
          ? formatInSign(debug.longitudes.ascendant)
          : "n/a"
      }`,
    );
    console.log("");
  }

  rewriteFixturesFile(fixturesPath, CASES);
  console.log(
    "\n[regen-fixtures] Done. Run `bunx vitest run src/lib/__tests__/ephemeris-regression.test.ts` to verify.",
  );
}

main();