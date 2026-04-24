import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import LyraStrip from "@/components/lyra/LyraStrip";

/**
 * TransitAlertCard
 * Lightweight, deterministic transit detector that surfaces an in-app card
 * at the top of Growth when a key transit is active for this user.
 *
 * Launch transits supported:
 *  - Mercury retrograde (any user)
 *  - Venus entering a new sign (any user, week of ingress)
 *  - Full moon in user's sun sign (sun ± 2 days)
 *  - New moon in user's moon sign (sun ± 2 days)
 *
 * Detection is approximate but deterministic — no API calls.
 * Persists 24h dismissals in localStorage.
 */

const ZODIAC = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

// Approximate Mercury retrograde windows for 2026
const MERCURY_RETRO_2026: Array<{ start: string; end: string }> = [
  { start: "2026-02-26", end: "2026-03-20" },
  { start: "2026-06-29", end: "2026-07-23" },
  { start: "2026-10-24", end: "2026-11-13" },
];

// Approximate Venus sign ingress dates for 2026 (sign Venus enters)
const VENUS_INGRESS_2026: Array<{ date: string; sign: typeof ZODIAC[number] }> = [
  { date: "2026-01-08", sign: "Capricorn" },
  { date: "2026-02-01", sign: "Aquarius" },
  { date: "2026-02-25", sign: "Pisces" },
  { date: "2026-03-21", sign: "Aries" },
  { date: "2026-04-15", sign: "Taurus" },
  { date: "2026-05-10", sign: "Gemini" },
  { date: "2026-06-04", sign: "Cancer" },
  { date: "2026-06-29", sign: "Leo" },
  { date: "2026-07-24", sign: "Virgo" },
  { date: "2026-08-18", sign: "Libra" },
  { date: "2026-09-12", sign: "Scorpio" },
  { date: "2026-10-07", sign: "Sagittarius" },
  { date: "2026-11-01", sign: "Capricorn" },
];

// Synodic month constants
const SYN = 29.530588853;
const KNOWN_NEW_MS = Date.UTC(2024, 0, 11, 11, 57, 0);

const moonAge = (now: number) => {
  const days = (now - KNOWN_NEW_MS) / (1000 * 60 * 60 * 24);
  return ((days % SYN) + SYN) % SYN;
};

// Approximate the sign the moon currently sits in by mapping age to ecliptic longitude.
const moonSignNow = (now: number): typeof ZODIAC[number] => {
  // Moon completes 360° per ~27.32 sidereal days (different from synodic)
  // For "what sign is the full/new moon in" we approximate from solar position +180° / 0°.
  const today = new Date(now);
  const sunLong = solarLongitude(today);
  const phase = moonAge(now) / SYN; // 0..1
  // Moon longitude ≈ sun longitude + (phase * 360)
  let moonLong = (sunLong + phase * 360) % 360;
  if (moonLong < 0) moonLong += 360;
  const idx = Math.floor(moonLong / 30) % 12;
  return ZODIAC[idx];
};

// Sun sign on a given date — approximation by ecliptic longitude.
const solarLongitude = (d: Date): number => {
  // Days since J2000 (2000-01-01 12:00 UT)
  const j2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  const n = (d.getTime() - j2000) / (1000 * 60 * 60 * 24);
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * (Math.PI / 180);
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g) + 360) % 360;
  return lambda;
};

const sunSignNow = (now: number): typeof ZODIAC[number] => {
  const lon = solarLongitude(new Date(now));
  return ZODIAC[Math.floor(lon / 30) % 12];
};

const daysBetween = (a: Date, b: Date) =>
  Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));

type ActiveTransit = {
  id: string;
  title: string;
  meaning: string;
  daysLeft: number;
  symbol: string;
};

const detectActiveTransit = (
  userSun: string | null,
  userMoon: string | null
): ActiveTransit | null => {
  const today = new Date();
  const now = today.getTime();

  // 1. Mercury retrograde — universal
  for (const win of MERCURY_RETRO_2026) {
    const start = new Date(win.start + "T00:00:00Z");
    const end = new Date(win.end + "T23:59:59Z");
    if (now >= start.getTime() && now <= end.getTime()) {
      return {
        id: `mercury-retro-${win.start}`,
        title: "Mercury Retrograde",
        meaning: "Review, don't launch. Conversations may need second readings.",
        daysLeft: daysBetween(today, end),
        symbol: "☿",
      };
    }
  }

  // 2. Venus ingress — week of (3 days before / 4 days after)
  for (const v of VENUS_INGRESS_2026) {
    const ing = new Date(v.date + "T00:00:00Z");
    const delta = daysBetween(ing, today);
    if (delta >= -2 && delta <= 4) {
      const daysLeft = 4 - delta;
      return {
        id: `venus-${v.date}`,
        title: `Venus enters ${v.sign}`,
        meaning: "Your love season is shifting. A new flavour of attraction comes online.",
        daysLeft: Math.max(daysLeft, 1),
        symbol: "♀",
      };
    }
  }

  // 3. Full moon in user's sun sign
  if (userSun) {
    const age = moonAge(now);
    const isFullish = age > 13.5 && age < 16.5;
    if (isFullish) {
      const moonSign = moonSignNow(now);
      if (moonSign === (userSun as any)) {
        return {
          id: `full-moon-sun-${moonSign}`,
          title: `Full Moon in ${moonSign}`,
          meaning: "Your year's most powerful illumination. What is being revealed?",
          daysLeft: 2,
          symbol: "🌕",
        };
      }
    }
  }

  // 4. New moon in user's moon sign
  if (userMoon) {
    const age = moonAge(now);
    const isNewish = age < 1.5 || age > 28.0;
    if (isNewish) {
      const moonSign = moonSignNow(now);
      if (moonSign === (userMoon as any)) {
        return {
          id: `new-moon-moon-${moonSign}`,
          title: `New Moon in ${moonSign}`,
          meaning: "An emotional reset for your inner world. Set the intention that matters.",
          daysLeft: 2,
          symbol: "🌑",
        };
      }
    }
  }

  return null;
};

const DISMISS_KEY = "stellara:transit-card:dismissed";

type Props = {
  userSun: string | null;
  userMoon: string | null;
  userId?: string;
};

const TransitAlertCard = ({ userSun, userMoon, userId }: Props) => {
  const [transit, setTransit] = useState<ActiveTransit | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const t = detectActiveTransit(userSun, userMoon);
    if (!t) {
      setTransit(null);
      return;
    }

    // Check 24h dismissal
    const raw = localStorage.getItem(DISMISS_KEY);
    if (raw) {
      try {
        const stored = JSON.parse(raw) as { id: string; until: number };
        if (stored.id === t.id && stored.until > Date.now()) {
          setDismissed(true);
          return;
        }
      } catch {
        // ignore parse errors
      }
    }

    setTransit(t);
    setDismissed(false);
  }, [userSun, userMoon]);

  const dismiss = () => {
    if (!transit) return;
    localStorage.setItem(
      DISMISS_KEY,
      JSON.stringify({ id: transit.id, until: Date.now() + 24 * 60 * 60 * 1000 })
    );
    setDismissed(true);
  };

  if (!transit || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4 }}
        className="relative rounded-2xl p-4 mb-3"
        style={{
          backgroundColor: "rgba(77, 58, 92, 0.5)",
          border: "0.5px solid rgba(208, 180, 247, 0.3)",
          borderRadius: 16,
        }}
      >
        <button
          onClick={dismiss}
          aria-label="Dismiss transit alert"
          className="absolute top-2 right-2 p-1 rounded-full transition-colors hover:bg-white/5"
          style={{ color: "#7a6a9a" }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-start gap-3 mb-2">
          <span className="text-3xl leading-none mt-0.5" style={{ color: "#d0b4f7" }}>
            {transit.symbol}
          </span>
          <div className="flex-1 min-w-0 pr-4">
            <h3
              className="text-base font-medium mb-1"
              style={{ color: "#e0d4ff", fontFamily: "Lora, Georgia, serif" }}
            >
              {transit.title}
            </h3>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "#c9b8f0", fontFamily: "Poppins, sans-serif" }}
            >
              {transit.meaning}
            </p>
          </div>
        </div>
        <LyraStrip
          context="transit_alert"
          contextKey={`${userId ?? "anon"}-${transit.id}`}
          payload={{ user_sun: userSun, user_moon: userMoon, transit: transit.title }}
          fallback={`This transit is active for ${transit.daysLeft} more day${
            transit.daysLeft === 1 ? "" : "s"
          } — let it move you gently.`}
          size="sm"
          className="mt-1"
        />
        <div className="mt-2 flex items-center justify-between">
          <span
            className="inline-block text-[10px] px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: "rgba(208, 180, 247, 0.12)",
              color: "#d0b4f7",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            Active for {transit.daysLeft} more day{transit.daysLeft === 1 ? "" : "s"}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TransitAlertCard;