// Moon phase calculation + metadata.
// Astronomical formula based on lunar cycle (29.530588853 days).

export type MoonPhaseKey =
  | "new_moon"
  | "waxing_crescent"
  | "first_quarter"
  | "waxing_gibbous"
  | "full_moon"
  | "waning_gibbous"
  | "last_quarter"
  | "waning_crescent";

export interface MoonPhaseInfo {
  key: MoonPhaseKey;
  name: string;
  illumination: number; // 0-1
  age: number; // days since new moon
  shortDescription: string;
}

export const PHASE_NAMES: Record<MoonPhaseKey, string> = {
  new_moon: "New Moon",
  waxing_crescent: "Waxing Crescent",
  first_quarter: "First Quarter",
  waxing_gibbous: "Waxing Gibbous",
  full_moon: "Full Moon",
  waning_gibbous: "Waning Gibbous",
  last_quarter: "Last Quarter",
  waning_crescent: "Waning Crescent",
};

export const PHASE_ORDER: MoonPhaseKey[] = [
  "new_moon",
  "waxing_crescent",
  "first_quarter",
  "waxing_gibbous",
  "full_moon",
  "waning_gibbous",
  "last_quarter",
  "waning_crescent",
];

export const PHASE_DESCRIPTIONS: Record<MoonPhaseKey, string> = {
  new_moon: "A blank page. Set what you want to call in.",
  waxing_crescent: "Tender beginnings. Tend to your intention.",
  first_quarter: "First friction. Take aligned action.",
  waxing_gibbous: "Refine and adjust. You're almost there.",
  full_moon: "Peak illumination. Release what you have outgrown.",
  waning_gibbous: "Integrate the lessons. Express your truth.",
  last_quarter: "Surrender. Let the old structures fall.",
  waning_crescent: "Rest. Reflect. Prepare for the next cycle.",
};

const LUNAR_CYCLE = 29.530588853;
const KNOWN_NEW_MOON = new Date("2000-01-06T18:14:00Z").getTime();

export function getMoonPhase(date: Date = new Date()): MoonPhaseInfo {
  const days = (date.getTime() - KNOWN_NEW_MOON) / (1000 * 60 * 60 * 24);
  const cycles = days / LUNAR_CYCLE;
  const age = (cycles - Math.floor(cycles)) * LUNAR_CYCLE;
  const illumination = (1 - Math.cos((age / LUNAR_CYCLE) * 2 * Math.PI)) / 2;

  let key: MoonPhaseKey;
  if (age < 1.84566) key = "new_moon";
  else if (age < 5.53699) key = "waxing_crescent";
  else if (age < 9.22831) key = "first_quarter";
  else if (age < 12.91963) key = "waxing_gibbous";
  else if (age < 16.61096) key = "full_moon";
  else if (age < 20.30228) key = "waning_gibbous";
  else if (age < 23.99361) key = "last_quarter";
  else if (age < 27.68493) key = "waning_crescent";
  else key = "new_moon";

  return {
    key,
    name: PHASE_NAMES[key],
    illumination,
    age,
    shortDescription: PHASE_DESCRIPTIONS[key],
  };
}