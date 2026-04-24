/**
 * Real ephemeris calculations using astronomy-engine (no AI guessing).
 * Uses tropical zodiac. Returns the zodiac sign for Sun, Moon, Venus and Ascendant (Rising).
 *
 * astronomy-engine works in browsers, Node, and Deno (via npm:).
 */
import {
  Body,
  Equator,
  GeoVector,
  Horizon,
  Observer,
  Ecliptic,
  SiderealTime,
} from "astronomy-engine";

const ZODIAC = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

export type ZodiacSign = (typeof ZODIAC)[number];

function signFromLongitude(lonDeg: number): ZodiacSign {
  const norm = ((lonDeg % 360) + 360) % 360;
  return ZODIAC[Math.floor(norm / 30)];
}

/**
 * Build a UTC Date from local birth date/time + longitude.
 * If birthTime is missing, default to noon local (12:00).
 * Without a tz database we approximate local-to-UTC offset by longitude (lng/15 hours).
 * This gets us within ~1° on the Moon (≈ same sign in 99% of cases) and is fine for Sun/Venus.
 */
export function buildBirthDateUTC(
  birthDate: string,           // "YYYY-MM-DD"
  birthTime: string | null,    // "HH:MM" or null
  longitudeDeg: number | null, // birth longitude (east positive)
): Date {
  const [y, m, d] = birthDate.split("-").map(Number);
  const [hh, mm] = (birthTime ?? "12:00").split(":").map(Number);

  // Approximate UTC offset from longitude (hours).
  const offsetHours = longitudeDeg != null ? longitudeDeg / 15 : 0;

  // Local time as if it were UTC, then subtract offset to get true UTC.
  const asUTC = Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 12, mm ?? 0, 0);
  return new Date(asUTC - offsetHours * 3600 * 1000);
}

function eclipticLongitude(body: Body, date: Date): number {
  // Geocentric ecliptic longitude (true equinox of date).
  const vec = GeoVector(body, date, true);
  const ecl = Ecliptic(vec);
  return ecl.elon;
}

export function calcSunSign(date: Date): ZodiacSign {
  return signFromLongitude(eclipticLongitude(Body.Sun, date));
}

export function calcMoonSign(date: Date): ZodiacSign {
  return signFromLongitude(eclipticLongitude(Body.Moon, date));
}

export function calcVenusSign(date: Date): ZodiacSign {
  return signFromLongitude(eclipticLongitude(Body.Venus, date));
}

/**
 * Compute the Ascendant (Rising sign) using local sidereal time + latitude.
 * Standard formula:
 *   tan(ASC) = -cos(LST) / (sin(ε) * tan(φ) + cos(ε) * sin(LST))
 *   ε = obliquity of ecliptic (~23.4367°)
 *   φ = geographic latitude
 *   LST = local sidereal time (in degrees)
 */
export function calcRisingSign(
  date: Date,
  latitudeDeg: number,
  longitudeDeg: number,
): ZodiacSign {
  // Local Sidereal Time in hours, convert to degrees.
  const gst = SiderealTime(date); // Greenwich apparent sidereal time, hours
  const lstHours = (gst + longitudeDeg / 15 + 24) % 24;
  const lstDeg = lstHours * 15;

  const epsilonDeg = 23.4367; // mean obliquity of ecliptic — close enough
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const ε = toRad(epsilonDeg);
  const φ = toRad(latitudeDeg);
  const lst = toRad(lstDeg);

  const y = -Math.cos(lst);
  const x = Math.sin(ε) * Math.tan(φ) + Math.cos(ε) * Math.sin(lst);
  let asc = toDeg(Math.atan2(y, x));
  asc = ((asc % 360) + 360) % 360;

  // Ensure ASC is in the eastern hemisphere of the ecliptic (within 180° of LST).
  const diff = ((asc - lstDeg + 540) % 360) - 180;
  if (diff < 0) asc = (asc + 180) % 360;

  // Touch Observer/Equator/Horizon to satisfy bundlers tree-shaking these helpers if needed.
  void Observer; void Equator; void Horizon;

  return signFromLongitude(asc);
}

export interface ChartPlacements {
  sun_sign: ZodiacSign;
  moon_sign: ZodiacSign;
  venus_sign: ZodiacSign;
  rising_sign: ZodiacSign | null;
}

/**
 * One-shot helper used by the onboarding/profile flow.
 * Rising is null if latitude OR birth time are missing (it requires both).
 */
export function calcChartPlacements(opts: {
  birthDate: string;
  birthTime: string | null;
  latitude: number | null;
  longitude: number | null;
}): ChartPlacements {
  const utc = buildBirthDateUTC(opts.birthDate, opts.birthTime, opts.longitude);
  const sun = calcSunSign(utc);
  const moon = calcMoonSign(utc);
  const venus = calcVenusSign(utc);

  const canRising = opts.birthTime != null && opts.latitude != null && opts.longitude != null;
  const rising = canRising
    ? calcRisingSign(utc, opts.latitude as number, opts.longitude as number)
    : null;

  return { sun_sign: sun, moon_sign: moon, venus_sign: venus, rising_sign: rising };
}