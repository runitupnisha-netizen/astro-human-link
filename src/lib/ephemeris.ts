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
  MakeTime,
  e_tilt,
} from "astronomy-engine";
import tzLookup from "tz-lookup";
import { DateTime } from "luxon";

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
 * Resolve the IANA timezone for a coordinate.
 * Returns null if coordinates are missing or invalid.
 */
export function resolveTimezone(
  latitudeDeg: number | null,
  longitudeDeg: number | null,
): string | null {
  if (latitudeDeg == null || longitudeDeg == null) return null;
  if (!Number.isFinite(latitudeDeg) || !Number.isFinite(longitudeDeg)) return null;
  try {
    return tzLookup(latitudeDeg, longitudeDeg);
  } catch {
    return null;
  }
}

/**
 * Build a UTC Date from a local birth date/time at a specific lat/lng.
 * Uses tz-lookup + luxon to honor real IANA zones, including DST and historical
 * offset rules — so a 3:30 PM birth in New York on Jan 20 1990 maps to the
 * correct EST UTC instant, and a July 4 1985 noon birth in LA maps to PDT.
 *
 * Fallbacks (in order):
 *  1) IANA zone from (lat, lng) via tz-lookup
 *  2) Longitude-based offset (lng / 15) when lat is missing
 *  3) UTC when no coordinates are provided at all
 * If birthTime is missing, defaults to local 12:00 (noon).
 */
export function buildBirthDateUTC(
  birthDate: string,           // "YYYY-MM-DD"
  birthTime: string | null,    // "HH:MM" or null
  longitudeDeg: number | null, // birth longitude (east positive)
  latitudeDeg: number | null = null,
): Date {
  const [y, m, d] = birthDate.split("-").map(Number);
  const [hh, mm] = (birthTime ?? "12:00").split(":").map(Number);

  const zone = resolveTimezone(latitudeDeg, longitudeDeg);
  if (zone) {
    const dt = DateTime.fromObject(
      {
        year: y,
        month: (m ?? 1),
        day: (d ?? 1),
        hour: hh ?? 12,
        minute: mm ?? 0,
        second: 0,
      },
      { zone },
    );
    if (dt.isValid) return dt.toUTC().toJSDate();
  }

  // Fallback: longitude-based offset (no DST, but reasonable when lat is unknown).
  const offsetHours = longitudeDeg != null ? longitudeDeg / 15 : 0;
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

export function calcMarsSign(date: Date): ZodiacSign {
  return signFromLongitude(eclipticLongitude(Body.Mars, date));
}

export function calcMercurySign(date: Date): ZodiacSign {
  return signFromLongitude(eclipticLongitude(Body.Mercury, date));
}

/**
 * True obliquity of the ecliptic in degrees, including nutation in obliquity.
 * Wraps astronomy-engine's `e_tilt` (which returns {mobl, tobl, ee, ...}).
 * Falls back to mean obliquity at J2000 if the helper ever throws.
 */
export function trueObliquityDeg(date: Date): number {
  try {
    const t = MakeTime(date);
    const tilt = e_tilt(t);
    if (Number.isFinite(tilt?.tobl)) return tilt.tobl;
  } catch {
    /* fall through */
  }
  return 23.4367;
}

/**
 * Compute the Ascendant (Rising sign) using local sidereal time + latitude.
 * Standard formula:
 *   tan(ASC) = -cos(LST) / (sin(ε) * tan(φ) + cos(ε) * sin(LST))
 *   ε = true obliquity of ecliptic (mean + nutation in obliquity, via
 *       astronomy-engine's `e_tilt` — matches Astro.com's apparent
 *       coordinates instead of using a static mean value).
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

  // True obliquity (mean + nutation in obliquity) for this instant.
  const epsilonDeg = trueObliquityDeg(date);
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
  mars_sign: ZodiacSign;
  mercury_sign: ZodiacSign;
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
  const utc = buildBirthDateUTC(
    opts.birthDate,
    opts.birthTime,
    opts.longitude,
    opts.latitude,
  );
  const sun = calcSunSign(utc);
  const moon = calcMoonSign(utc);
  const venus = calcVenusSign(utc);
  const mars = calcMarsSign(utc);
  const mercury = calcMercurySign(utc);

  const canRising = opts.birthTime != null && opts.latitude != null && opts.longitude != null;
  const rising = canRising
    ? calcRisingSign(utc, opts.latitude as number, opts.longitude as number)
    : null;

  return {
    sun_sign: sun,
    moon_sign: moon,
    venus_sign: venus,
    mars_sign: mars,
    mercury_sign: mercury,
    rising_sign: rising,
  };
}

/**
 * Format a 0–360° longitude as `Sign DDdMM'SS"` for human-readable debug output.
 */
export function formatLongitude(lonDeg: number): string {
  const norm = ((lonDeg % 360) + 360) % 360;
  const sign = ZODIAC[Math.floor(norm / 30)];
  const inSign = norm - Math.floor(norm / 30) * 30;
  const deg = Math.floor(inSign);
  const minFloat = (inSign - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = Math.round((minFloat - min) * 60);
  return `${sign} ${deg.toString().padStart(2, "0")}°${min.toString().padStart(2, "0")}'${sec
    .toString()
    .padStart(2, "0")}"`;
}

export interface ChartDebugInfo {
  /** Local birth datetime as a normalized ISO string (no zone applied). */
  localIso: string;
  /** Resolved IANA timezone, or null if coords missing. */
  timezone: string | null;
  /** UTC instant fed to the ephemeris. */
  utcDate: Date;
  utcIso: string;
  /** Julian Day for the UTC instant (UT-based, standard astronomy convention). */
  julianDay: number;
  /** Greenwich Apparent Sidereal Time, hours [0–24). */
  gastHours: number;
  /** Local Sidereal Time, degrees [0–360). null when longitude missing. */
  lstDeg: number | null;
  /** Geocentric ecliptic longitudes in degrees [0–360). */
  longitudes: {
    sun: number;
    moon: number;
    venus: number;
    mars: number;
    mercury: number;
    /** Ascendant longitude — null when birth time or coords missing. */
    ascendant: number | null;
  };
}

/**
 * Compute the same chart as `calcChartPlacements` but also return every
 * intermediate value (UTC, JD, GAST, LST, raw longitudes) used along the way.
 * Intended for the user-facing "Chart Debug" panel and for parity testing
 * against external ephemerides.
 */
export function calcChartDebug(opts: {
  birthDate: string;
  birthTime: string | null;
  latitude: number | null;
  longitude: number | null;
}): ChartDebugInfo {
  const timezone = resolveTimezone(opts.latitude, opts.longitude);
  const utcDate = buildBirthDateUTC(
    opts.birthDate,
    opts.birthTime,
    opts.longitude,
    opts.latitude,
  );

  // Julian Day from Unix ms (1970-01-01 UTC == JD 2440587.5).
  const julianDay = utcDate.getTime() / 86400000 + 2440587.5;

  const gastHours = SiderealTime(utcDate); // Greenwich apparent sidereal time
  const lstDeg =
    opts.longitude != null
      ? ((((gastHours + opts.longitude / 15) % 24) + 24) % 24) * 15
      : null;

  const longitudes = {
    sun: ((eclipticLongitude(Body.Sun, utcDate) % 360) + 360) % 360,
    moon: ((eclipticLongitude(Body.Moon, utcDate) % 360) + 360) % 360,
    venus: ((eclipticLongitude(Body.Venus, utcDate) % 360) + 360) % 360,
    mars: ((eclipticLongitude(Body.Mars, utcDate) % 360) + 360) % 360,
    mercury: ((eclipticLongitude(Body.Mercury, utcDate) % 360) + 360) % 360,
    ascendant: null as number | null,
  };

  if (opts.birthTime != null && opts.latitude != null && opts.longitude != null) {
    // Reproduce the exact ASC math from calcRisingSign so the longitude shown
    // matches the sign returned by the chart.
    const epsilonDeg = trueObliquityDeg(utcDate);
    const toRad = (d: number) => (d * Math.PI) / 180;
    const toDeg = (r: number) => (r * 180) / Math.PI;
    const ε = toRad(epsilonDeg);
    const φ = toRad(opts.latitude);
    const lst = toRad(lstDeg as number);
    const y = -Math.cos(lst);
    const x = Math.sin(ε) * Math.tan(φ) + Math.cos(ε) * Math.sin(lst);
    let asc = toDeg(Math.atan2(y, x));
    asc = ((asc % 360) + 360) % 360;
    const diff = ((asc - (lstDeg as number) + 540) % 360) - 180;
    if (diff < 0) asc = (asc + 180) % 360;
    longitudes.ascendant = asc;
  }

  // Build a clean local ISO using the parsed components (no zone math here —
  // the UTC instant already reflects the IANA conversion).
  const [y, m, d] = opts.birthDate.split("-").map(Number);
  const [hh, mm] = (opts.birthTime ?? "12:00").split(":").map(Number);
  const localIso =
    `${y.toString().padStart(4, "0")}-${(m ?? 1).toString().padStart(2, "0")}-${(d ?? 1)
      .toString()
      .padStart(2, "0")}T${(hh ?? 12).toString().padStart(2, "0")}:${(mm ?? 0)
      .toString()
      .padStart(2, "0")}:00`;

  return {
    localIso,
    timezone,
    utcDate,
    utcIso: utcDate.toISOString(),
    julianDay,
    gastHours,
    lstDeg,
    longitudes,
  };
}