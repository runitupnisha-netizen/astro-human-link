/**
 * Lightweight upcoming-transit generator for the timeline cards.
 *
 * We're not trying to replicate a full ephemeris UI here — the goal is to
 * surface the handful of macro events that genuinely matter to a personal
 * narrative over the next ~18 months:
 *
 *   - Mars sign ingresses (changes mood / drive every ~6 weeks)
 *   - Jupiter sign ingresses (annual expansion themes)
 *   - Saturn sign ingresses (multi-year structural shifts)
 *   - New + Full Moons (monthly emotional turning points — limited to next 6)
 *
 * Each event becomes a card with date, evocative title, glyphs and a Lyra
 * seed string used to open a personalized interpretation.
 */
import { Body, GeoVector, Ecliptic, SearchMoonPhase } from "astronomy-engine";
import { signAndDegree } from "@/lib/ephemeris";

const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

const PLANET_GLYPH: Record<string, string> = {
  Mars: "♂", Jupiter: "♃", Saturn: "♄", Sun: "☉", Moon: "☽",
};

const SIGN_GLYPH: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
  Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

export type TransitGroup = "drive" | "expansion" | "structure" | "lunar";

export interface TransitCard {
  id: string;
  group: TransitGroup;
  groupLabel: string;
  title: string;
  start: Date;
  end: Date;
  rangeLabel: string;
  glyphs: string[];           // small set of glyphs to render in the corner
  planet: string;             // for Lyra seed
  sign?: string;
  lyraSeed: string;
}

const TITLES_INGRESS: Record<string, (sign: string) => string> = {
  Mars: (s) => `Drive Shifts into ${s}`,
  Jupiter: (s) => `Adventure Unfolds in ${s}`,
  Saturn: (s) => `Structure Re-formed in ${s}`,
};

function fmtRange(start: Date, end: Date) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}

function eclipticLon(body: Body, date: Date) {
  const v = GeoVector(body, date, true);
  return ((Ecliptic(v).elon % 360) + 360) % 360;
}

/**
 * Scan day-by-day for sign-ingress dates of the given planet between two dates.
 * Returns array of { date, sign } pairs ordered chronologically.
 */
function findIngresses(body: Body, from: Date, to: Date, stepDays = 1) {
  const out: { date: Date; sign: string }[] = [];
  let prev = Math.floor(eclipticLon(body, from) / 30);
  let prevDate = from;
  const stepMs = stepDays * 86400000;
  for (let t = from.getTime() + stepMs; t <= to.getTime(); t += stepMs) {
    const d = new Date(t);
    const cur = Math.floor(eclipticLon(body, d) / 30);
    if (cur !== prev) {
      // narrow to the actual day with a quick bisection
      let lo = prevDate.getTime();
      let hi = t;
      while (hi - lo > 3600000) {
        const mid = (lo + hi) / 2;
        const m = Math.floor(eclipticLon(body, new Date(mid)) / 30);
        if (m === prev) lo = mid;
        else hi = mid;
      }
      out.push({ date: new Date(hi), sign: SIGNS[cur] });
      prev = cur;
    }
    prevDate = d;
  }
  return out;
}

export function computeUpcomingTransits(now: Date = new Date()): TransitCard[] {
  const horizon = new Date(now.getTime() + 540 * 86400000); // ~18 months
  const cards: TransitCard[] = [];

  // Helper to append ingresses for a given outer/personal planet.
  const addIngresses = (body: Body, name: string, group: TransitGroup, groupLabel: string, stepDays: number) => {
    const events = findIngresses(body, now, horizon, stepDays);
    // Current sign ends at first ingress; each subsequent event runs until the next.
    const currentSign = SIGNS[Math.floor(eclipticLon(body, now) / 30)];
    const series: { date: Date; sign: string }[] = [{ date: now, sign: currentSign }, ...events];
    for (let i = 0; i < series.length; i++) {
      const start = series[i].date;
      const end = series[i + 1]?.date ?? horizon;
      const sign = series[i].sign;
      const titleFn = TITLES_INGRESS[name];
      cards.push({
        id: `${name}-${sign}-${start.toISOString().slice(0, 10)}`,
        group,
        groupLabel,
        title: titleFn ? titleFn(sign) : `${name} in ${sign}`,
        start,
        end,
        rangeLabel: fmtRange(start, end),
        glyphs: [PLANET_GLYPH[name] ?? "★", SIGN_GLYPH[sign] ?? ""],
        planet: name,
        sign,
        lyraSeed: `${name} is moving through ${sign} from ${fmtRange(start, end)}. Read this transit for me personally — tie it to my natal chart and tell me what life area to watch and what to do about it.`,
      });
    }
  };

  addIngresses(Body.Mars, "Mars", "drive", "Your Drive & Action", 1);
  addIngresses(Body.Jupiter, "Jupiter", "expansion", "Your Expansion & Luck", 5);
  addIngresses(Body.Saturn, "Saturn", "structure", "Your Structure & Mastery", 14);

  // Add next 6 lunations (New + Full).
  try {
    let cursor = now;
    for (let i = 0; i < 12; i++) {
      const newMoon = SearchMoonPhase(0, cursor, 40);
      const fullMoon = SearchMoonPhase(180, cursor, 40);
      if (newMoon) {
        const date = newMoon.date;
        if (date > now && cards.filter((c) => c.group === "lunar").length < 6) {
          const sun = eclipticLon(Body.Sun, date);
          const sd = signAndDegree(sun);
          cards.push({
            id: `new-${date.toISOString().slice(0, 10)}`,
            group: "lunar",
            groupLabel: "Lunar Cycles",
            title: `New Moon in ${sd.sign}`,
            start: date,
            end: new Date(date.getTime() + 14 * 86400000),
            rangeLabel: date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
            glyphs: ["🌑", SIGN_GLYPH[sd.sign] ?? ""],
            planet: "New Moon",
            sign: sd.sign,
            lyraSeed: `There's a New Moon in ${sd.sign} on ${date.toDateString()}. What does this lunation mean for me given my natal chart, and what should I plant as an intention?`,
          });
        }
      }
      if (fullMoon) {
        const date = fullMoon.date;
        if (date > now && cards.filter((c) => c.group === "lunar").length < 6) {
          const sun = eclipticLon(Body.Sun, date);
          // Full moon sits opposite the Sun
          const moonLon = (sun + 180) % 360;
          const sd = signAndDegree(moonLon);
          cards.push({
            id: `full-${date.toISOString().slice(0, 10)}`,
            group: "lunar",
            groupLabel: "Lunar Cycles",
            title: `Full Moon in ${sd.sign}`,
            start: date,
            end: new Date(date.getTime() + 14 * 86400000),
            rangeLabel: date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
            glyphs: ["🌕", SIGN_GLYPH[sd.sign] ?? ""],
            planet: "Full Moon",
            sign: sd.sign,
            lyraSeed: `There's a Full Moon in ${sd.sign} on ${date.toDateString()}. What does this culmination spotlight for me given my natal chart, and what's ready to be released?`,
          });
        }
      }
      // Step cursor forward ~30d to find next pair
      cursor = new Date(cursor.getTime() + 30 * 86400000);
      if (cursor > horizon) break;
    }
  } catch (e) {
    console.warn("[transits] lunation search failed", e);
  }

  return cards.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function groupTransits(cards: TransitCard[]): Record<TransitGroup, TransitCard[]> {
  const g: Record<TransitGroup, TransitCard[]> = { drive: [], expansion: [], structure: [], lunar: [] };
  for (const c of cards) g[c.group].push(c);
  return g;
}