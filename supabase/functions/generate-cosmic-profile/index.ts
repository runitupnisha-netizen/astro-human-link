import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getIdentifier } from "../_shared/rate-limiter.ts";
import {
  Body,
  GeoVector,
  Ecliptic,
  SiderealTime,
} from "npm:astronomy-engine@2.1.19";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// REAL EPHEMERIS — NASA-grade math via astronomy-engine
// ═══════════════════════════════════════════════════════════════

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

function signFromLongitude(lonDeg: number): string {
  const norm = ((lonDeg % 360) + 360) % 360;
  return ZODIAC_SIGNS[Math.floor(norm / 30)];
}

function buildBirthUTC(birthDate: string, birthTime: string | null, longitudeDeg: number | null): Date {
  const [y, m, d] = birthDate.split("-").map(Number);
  const [hh, mm] = (birthTime ?? "12:00").split(":").map(Number);
  const offsetHours = longitudeDeg != null ? longitudeDeg / 15 : 0;
  const asUTC = Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 12, mm ?? 0, 0);
  return new Date(asUTC - offsetHours * 3600 * 1000);
}

function eclipticLon(body: typeof Body[keyof typeof Body], date: Date): number {
  const vec = GeoVector(body, date, true);
  return Ecliptic(vec).elon;
}

function calcAscendant(date: Date, latDeg: number, lngDeg: number): string {
  const gst = SiderealTime(date);
  const lstHours = (gst + lngDeg / 15 + 24) % 24;
  const lstDeg = lstHours * 15;
  const epsilon = (23.4367 * Math.PI) / 180;
  const phi = (latDeg * Math.PI) / 180;
  const lst = (lstDeg * Math.PI) / 180;
  const y = -Math.cos(lst);
  const x = Math.sin(epsilon) * Math.tan(phi) + Math.cos(epsilon) * Math.sin(lst);
  let asc = (Math.atan2(y, x) * 180) / Math.PI;
  asc = ((asc % 360) + 360) % 360;
  const diff = ((asc - lstDeg + 540) % 360) - 180;
  if (diff < 0) asc = (asc + 180) % 360;
  return signFromLongitude(asc);
}

// ═══════════════════════════════════════════════════════════════
// DETERMINISTIC CALCULATIONS — No AI guessing
// ═══════════════════════════════════════════════════════════════

function reduceToDigit(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split("").reduce((sum, d) => sum + Number(d), 0);
  }
  return n;
}

/**
 * Life Path Number — Pythagorean reduction with master numbers preserved.
 */
function calculateLifePathNumber(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  const monthReduced = reduceToDigit(month);
  const dayReduced = reduceToDigit(day);
  const yearReduced = reduceToDigit(
    String(year).split("").reduce((sum, d) => sum + Number(d), 0)
  );
  return reduceToDigit(monthReduced + dayReduced + yearReduced);
}

/**
 * Birthday Number — The day of birth reduced (but 11, 22 preserved).
 */
function calculateBirthdayNumber(dateStr: string): number {
  const day = Number(dateStr.split("-")[2]);
  return reduceToDigit(day);
}

/**
 * Personal Year Number — Current year cycle.
 */
function calculatePersonalYearNumber(dateStr: string): number {
  const [_, month, day] = dateStr.split("-").map(Number);
  const currentYear = new Date().getFullYear();
  const sum = reduceToDigit(month) + reduceToDigit(day) + reduceToDigit(
    String(currentYear).split("").reduce((s, d) => s + Number(d), 0)
  );
  return reduceToDigit(sum);
}

/**
 * Sun Sign — Deterministic from birth date using tropical zodiac boundaries.
 */
function calculateSunSign(dateStr: string): string {
  const [_, month, day] = dateStr.split("-").map(Number);
  const zodiac: [number, number, string][] = [
    [1, 20, "Aquarius"], [2, 19, "Pisces"], [3, 21, "Aries"],
    [4, 20, "Taurus"], [5, 21, "Gemini"], [6, 21, "Cancer"],
    [7, 23, "Leo"], [8, 23, "Virgo"], [9, 23, "Libra"],
    [10, 23, "Scorpio"], [11, 22, "Sagittarius"], [12, 22, "Capricorn"],
  ];
  for (let i = zodiac.length - 1; i >= 0; i--) {
    const [sm, sd] = zodiac[i];
    if (month > sm || (month === sm && day >= sd)) return zodiac[i][2];
  }
  return "Capricorn";
}

function calculateExpressionContext(lifePathNumber: number): string {
  const meanings: Record<number, string> = {
    1: "Leadership, independence, pioneering spirit. Driven to forge their own path.",
    2: "Diplomacy, sensitivity, partnership. Natural mediator seeking harmony.",
    3: "Creative expression, communication, joy. Born storyteller and artist.",
    4: "Structure, discipline, foundation-building. Creates lasting systems.",
    5: "Freedom, adventure, change. Thrives on variety and sensory experience.",
    6: "Nurturing, responsibility, beauty. The cosmic caretaker and healer.",
    7: "Introspection, spirituality, analysis. Seeker of hidden truths.",
    8: "Power, abundance, material mastery. Karmic lessons around authority.",
    9: "Humanitarianism, wisdom, completion. Old soul with universal compassion.",
    11: "Master Intuitive — Visionary channel between spiritual and material realms.",
    22: "Master Builder — Ability to manifest grand visions into physical reality.",
    33: "Master Teacher — Embodiment of compassionate wisdom and selfless service.",
  };
  return meanings[lifePathNumber] || "Unique numerological path with special significance.";
}

/**
 * Birthday Number meaning
 */
function birthdayNumberMeaning(num: number): string {
  const meanings: Record<number, string> = {
    1: "The Initiator — Born to lead, innovate, and pioneer new paths",
    2: "The Sensitive — Natural diplomat with deep emotional intelligence",
    3: "The Performer — Creative spark, joyful communicator, magnetic presence",
    4: "The Architect — Grounded builder who creates lasting foundations",
    5: "The Explorer — Restless spirit seeking freedom and new horizons",
    6: "The Caretaker — Heart-centered nurturer devoted to love and beauty",
    7: "The Mystic — Deep thinker drawn to spiritual mysteries and inner wisdom",
    8: "The Powerhouse — Born for abundance, authority, and material mastery",
    9: "The Sage — Wise soul with a humanitarian mission and universal love",
    11: "The Illuminator — Master intuitive channeling higher wisdom",
    22: "The Master Builder — Visionary who turns dreams into reality",
    33: "The Master Healer — Embodiment of unconditional love and service",
  };
  return meanings[num] || "Unique vibrational essence";
}

/**
 * Personal Year meaning
 */
function personalYearMeaning(num: number): string {
  const meanings: Record<number, string> = {
    1: "Year of New Beginnings — Fresh starts, independence, planting seeds",
    2: "Year of Partnership — Patience, cooperation, deepening connections",
    3: "Year of Expression — Creativity, social expansion, joy and play",
    4: "Year of Foundation — Hard work, structure, building for the future",
    5: "Year of Change — Transformation, adventure, breaking free",
    6: "Year of Love — Family, responsibility, domestic harmony",
    7: "Year of Reflection — Spiritual growth, solitude, inner discovery",
    8: "Year of Power — Achievement, financial growth, karmic rewards",
    9: "Year of Completion — Letting go, wisdom, endings that make space",
    11: "Master Year of Awakening — Spiritual breakthroughs and illumination",
    22: "Master Year of Manifestation — Grand visions becoming reality",
    33: "Master Year of Service — Selfless love and collective healing",
  };
  return meanings[num] || "A transformative cycle";
}

async function geocodeBirthPlace(place: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encoded = encodeURIComponent(place);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
      { headers: { "User-Agent": "StellaraApp/1.0 (cosmic-dating-app)" } }
    );
    if (!response.ok) return null;
    const results = await response.json();
    if (results.length > 0) {
      return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
    }
    return null;
  } catch (e) {
    console.error("Geocoding error:", e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// REFERENCE DATA
// ═══════════════════════════════════════════════════════════════

const MOON_SIGN_REFERENCE = `
MOON SIGN ESTIMATION GUIDE (the Moon moves ~13° per day, spending ~2.5 days in each sign):
The Moon's position depends on the EXACT date. Use these approximate monthly Moon sign tables:
- The Moon cycles through all 12 signs every 27.3 days
- Without an ephemeris, estimate based on the birth YEAR and DAY within the lunar cycle
- If birth time is unknown, acknowledge the Moon sign may be off by one sign
- ALWAYS state your confidence level (high/medium/low) in the astro_summary
`;

const RISING_SIGN_REFERENCE = `
RISING SIGN (ASCENDANT) RULES:
- The Ascendant changes sign every ~2 hours throughout the day
- It requires EXACT birth time and location (latitude/longitude) to calculate precisely
- The Ascendant at sunrise roughly equals the Sun sign
- Each hour after sunrise advances the Ascendant by ~15°
- IF BIRTH TIME IS UNKNOWN: Do NOT guess. State "Rising sign requires exact birth time" and use the Sun sign as a placeholder with clear notation
- IF BIRTH TIME IS KNOWN: Estimate based on: sunrise time at birth location + hours elapsed = approximate Ascendant sign
`;

const HUMAN_DESIGN_REFERENCE = `
HUMAN DESIGN SYSTEM — SCIENTIFIC FRAMEWORK:
Human Design combines the I Ching, Kabbalah, the Hindu-Brahmin Chakra system, and quantum physics.

THE 5 TYPES (determined by defined/undefined centers and channels):
1. MANIFESTOR (~9% of population): Defined Throat connected to a motor center (Heart/Solar Plexus/Root/Sacral) BUT Sacral is UNDEFINED. Strategy: To Inform. Aura: Closed and repelling.
2. GENERATOR (~37%): Defined Sacral center, NO motor-to-throat connection. Strategy: To Respond. Aura: Open and enveloping. 
3. MANIFESTING GENERATOR (~33%): Defined Sacral AND motor-to-throat connection. Strategy: To Respond then Inform. Aura: Open and enveloping.
4. PROJECTOR (~20%): Undefined Sacral, NO motor-to-throat connection. Strategy: Wait for the Invitation. Aura: Focused and absorbing.
5. REFLECTOR (~1%): ALL centers undefined. Strategy: Wait a Lunar Cycle. Aura: Sampling and reflecting.

THE 7 AUTHORITIES (decision-making hierarchy):
1. Emotional/Solar Plexus — Wait for emotional clarity (wave)
2. Sacral — Gut response (uh-huh/un-un sounds)
3. Splenic — Instant intuitive knowing
4. Ego/Heart — Willpower-based
5. Self-Projected — Speak to hear your truth
6. Environmental/Mental — No inner authority, use environment
7. Lunar — Wait full lunar cycle (Reflectors only)

THE 12 PROFILES (personality/design lines):
1/3 Investigator/Martyr, 1/4 Investigator/Opportunist
2/4 Hermit/Opportunist, 2/5 Hermit/Heretic
3/5 Martyr/Heretic, 3/6 Martyr/Role Model
4/6 Opportunist/Role Model, 4/1 Opportunist/Investigator
5/1 Heretic/Investigator, 5/2 Heretic/Hermit
6/2 Role Model/Hermit, 6/3 Role Model/Martyr

RULES FOR HD DETERMINATION:
- Type and Authority are determined by planetary gate activations at exact birth time AND 88 days before birth (Design/Personality crystals)
- Without an ephemeris, use the birth data to make an EDUCATED estimation based on statistical distributions
- ALWAYS note in the summary that precise HD requires a formal chart calculation
- The profile lines (1-6) correspond to hexagram lines in the I Ching
`;

const GENE_KEYS_REFERENCE = `
GENE KEYS SYSTEM — Richard Rudd's framework based on the 64 hexagrams of the I Ching:
Each Gene Key has three frequency bands:
- SHADOW (fear-based pattern) → GIFT (creative potential) → SIDDHI (highest expression)

THE GOLDEN PATH has three primary sequences:
1. ACTIVATION SEQUENCE (Life's Work, Evolution, Radiance, Purpose):
   - Life's Work (Sun Gene Key) — Your core creative genius
   - Evolution (Earth Gene Key) — Your growth edge
   - Radiance (South Node Gene Key) — Your natural radiance/health
   - Purpose (North Node Gene Key) — Your higher purpose

2. VENUS SEQUENCE (relationships): Opens the heart
3. PEARL SEQUENCE (prosperity): Material abundance

GENE KEY DETERMINATION:
- Gene Keys are derived from planetary positions mapped to I Ching hexagrams
- Each of the 64 Gene Keys corresponds to specific zodiacal degrees
- The Sun's position determines the Life's Work Gene Key
- The Earth's position (opposite the Sun) determines the Evolution Gene Key
- Lunar nodes determine Radiance and Purpose Gene Keys

SUN SIGN TO GENE KEY MAPPING (based on the Rave Mandala / I Ching wheel):
Each zodiac sign spans ~5-6 Gene Keys. The Sun's exact degree determines the Life's Work Gene Key.
- Aries (Mar 21 – Apr 19): Gene Keys 25, 51, 21, 17, 42
- Taurus (Apr 20 – May 20): Gene Keys 3, 27, 24, 2, 23
- Gemini (May 21 – Jun 20): Gene Keys 8, 20, 16, 35, 45
- Cancer (Jun 21 – Jul 22): Gene Keys 12, 15, 52, 39, 53
- Leo (Jul 23 – Aug 22): Gene Keys 62, 56, 31, 33, 7
- Virgo (Aug 23 – Sep 22): Gene Keys 4, 29, 59, 40, 64
- Libra (Sep 23 – Oct 22): Gene Keys 47, 6, 46, 18, 48
- Scorpio (Oct 23 – Nov 21): Gene Keys 57, 32, 50, 28, 44
- Sagittarius (Nov 22 – Dec 21): Gene Keys 1, 43, 14, 34, 9
- Capricorn (Dec 22 – Jan 19): Gene Keys 5, 26, 11, 10, 58
- Aquarius (Jan 20 – Feb 18): Gene Keys 38, 54, 61, 60, 41
- Pisces (Feb 19 – Mar 20): Gene Keys 19, 13, 49, 30, 55

The Evolution Gene Key is always the PROGRAMMING PARTNER (opposite side of the wheel) of the Life's Work Gene Key.
Use your knowledge of the exact Gene Key degree ranges for precision.

ALWAYS format Gene Keys as: "Gene Key [number]: [Shadow] → [Gift] → [Siddhi]"
Example: "Gene Key 25: Constriction → Acceptance → Universal Love"
`;

const NUMEROLOGY_REFERENCE = `
NUMEROLOGY SYSTEM — Pythagorean Numerology:
Numerology is an ancient divination system that reveals personality traits, life cycles, and soul purpose through the vibrational frequencies of numbers.

CORE NUMBERS:
1. LIFE PATH NUMBER — The most important number. Calculated from the full birth date. Reveals your soul's mission and the lessons you're here to learn.
2. BIRTHDAY NUMBER — The day of birth (reduced). Reveals your special gift or talent — the unique ability you bring to the world.
3. PERSONAL YEAR NUMBER — Current annual cycle. Calculated from birth month + birth day + current year. Reveals the theme and energy of your current year.

KARMIC DEBT NUMBERS (13, 14, 16, 19):
These appear before reduction and indicate karmic lessons from past lives:
- 13/4: Karmic debt of laziness → lesson of hard work and discipline
- 14/5: Karmic debt of control → lesson of freedom through responsibility
- 16/7: Karmic debt of ego → lesson of spiritual humility
- 19/1: Karmic debt of selfishness → lesson of compassionate independence

MASTER NUMBERS (11, 22, 33):
These are NOT reduced further. They carry higher spiritual vibrations:
- 11: Master Intuitive — Channel between physical and spiritual
- 22: Master Builder — Ability to manifest grand visions
- 33: Master Teacher — Embodiment of unconditional love

NUMBER COMPATIBILITY IN RELATIONSHIPS:
- Same numbers: Deep understanding but can amplify shadows
- Numbers that add to 10 (1+9, 2+8, 3+7, 4+6): Natural completion energy
- Adjacent numbers (1-2, 2-3, etc.): Growth through slight contrast
- Master numbers with any: Intensified spiritual connection
`;

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rateLimitResponse = checkRateLimit(getIdentifier(req), "generate-cosmic-profile", corsHeaders);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { birthDate, birthTime, birthPlace } = await req.json();
    if (!birthDate || !birthPlace) {
      throw new Error("Missing birth data: birthDate and birthPlace are required");
    }

    // ── Deterministic calculations ──
    const lifePathNumber = calculateLifePathNumber(birthDate);
    const birthdayNumber = calculateBirthdayNumber(birthDate);
    const personalYearNumber = calculatePersonalYearNumber(birthDate);
    const sunSign = calculateSunSign(birthDate);
    const lifePathContext = calculateExpressionContext(lifePathNumber);
    const birthdayContext = birthdayNumberMeaning(birthdayNumber);
    const personalYearContext = personalYearMeaning(personalYearNumber);

    // Check for karmic debt
    const rawDay = Number(birthDate.split("-")[2]);
    const karmicDebtNumbers = [13, 14, 16, 19];
    const hasKarmicDebt = karmicDebtNumbers.includes(rawDay);

    // ── Geocode birth place ──
    const coords = await geocodeBirthPlace(birthPlace);
    const latLng = coords
      ? `Latitude: ${coords.lat.toFixed(4)}, Longitude: ${coords.lng.toFixed(4)}`
      : "Coordinates unavailable";

    console.log(`Birth data: ${birthDate} ${birthTime || "no time"} in ${birthPlace} (${latLng})`);
    console.log(`Deterministic: Sun=${sunSign}, LifePath=${lifePathNumber}, Birthday=${birthdayNumber}, PersonalYear=${personalYearNumber}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const hasBirthTime = birthTime && birthTime.trim() !== "";

    const timeContext = hasBirthTime
      ? `at exactly ${birthTime} local time`
      : "(birth time UNKNOWN — use noon/12:00 PM as default, and clearly note all time-dependent calculations are approximate)";

    const systemPrompt = `You are an expert astrologer, Human Design analyst, Gene Keys guide, and Pythagorean numerologist with deep knowledge of ephemeris-based calculations.

CRITICAL RULES:
1. The Sun Sign has ALREADY been calculated deterministically and is: ${sunSign}. You MUST use this exact value. Do NOT recalculate it.
2. For Moon sign: Use your knowledge of lunar ephemeris patterns to estimate as accurately as possible for the given date.
3. For Rising sign: ${hasBirthTime ? "Estimate using birth time and location coordinates." : "State that rising sign requires exact birth time. Provide your best estimate using noon but clearly mark it as approximate."}
4. For Human Design: Follow the type/authority/profile framework strictly. Use statistical distributions and birth data correlations.
5. For Gene Keys: Map from the Sun's zodiacal position to the appropriate Gene Key number. Use the exact Shadow → Gift → Siddhi format.
6. For Numerology: The core numbers have been calculated deterministically. You MUST provide a rich, insightful numerology_summary that weaves together the Life Path, Birthday Number, and Personal Year cycle into a cohesive narrative about the person's numerological blueprint.
7. Be HONEST about confidence levels. If something requires an ephemeris for precision, say so.
8. In summaries, distinguish between CALCULATED facts and ESTIMATED positions.

${MOON_SIGN_REFERENCE}

${RISING_SIGN_REFERENCE}

${HUMAN_DESIGN_REFERENCE}

${GENE_KEYS_REFERENCE}

${NUMEROLOGY_REFERENCE}

You MUST respond using the provided tool/function call format. Do not respond with plain text.`;

    const userPrompt = `Generate a complete cosmic profile for:
- Birth Date: ${birthDate}
- Birth Time: ${timeContext}
- Birth Place: ${birthPlace}
- Coordinates: ${latLng}
- CONFIRMED Sun Sign: ${sunSign} (use this exactly)
- Life Path Number: ${lifePathNumber} (${lifePathContext})
- Birthday Number: ${birthdayNumber} (${birthdayContext})
- Personal Year Number: ${personalYearNumber} (${personalYearContext})
${hasKarmicDebt ? `- Karmic Debt: Day ${rawDay} carries karmic debt energy (${rawDay}/${reduceToDigit(rawDay)})` : "- No karmic debt detected in birth day"}

Provide:
1. Moon sign (best estimate with confidence note)
2. Rising sign (${hasBirthTime ? "estimate from birth time + coordinates" : "note as approximate, requires exact birth time"})
3. Rich astrology summary (3-5 sentences, noting which positions are calculated vs estimated)
4. Human Design type, strategy, authority, profile with detailed summary
5. Gene Keys Life's Work, Evolution, and Radiance paths in "Gene Key [N]: Shadow → Gift → Siddhi" format
6. Gene Keys summary explaining their Golden Path activation
7. A rich numerology_summary (4-6 sentences) that weaves together the Life Path ${lifePathNumber}, Birthday Number ${birthdayNumber}, and Personal Year ${personalYearNumber} into a cohesive narrative about their numerological blueprint, soul gifts, current cycle, and ${hasKarmicDebt ? "karmic debt lessons" : "growth opportunities"}
8. 5-8 compatibility tags chosen ONLY from this list: Deep Thinker, Empath, Visionary, Healer, Old Soul, Free Spirit, Mystic, Warrior, Nurturer, Creator, Seeker, Leader, Rebel, Dreamer, Philosopher, Intuitive, Alchemist, Adventurer, Peacemaker, Teacher, Lightworker, Manifester, Connector, Sage, Transformer`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_cosmic_profile",
              description: "Save the generated cosmic profile data",
              parameters: {
                type: "object",
                properties: {
                  sun_sign: { type: "string", description: "Zodiac sun sign (MUST match the pre-calculated value)" },
                  moon_sign: { type: "string", description: "Estimated zodiac moon sign" },
                  rising_sign: { type: "string", description: "Zodiac rising/ascendant sign (note if approximate)" },
                  astro_summary: { type: "string", description: "Rich paragraph about their astrological blueprint (3-5 sentences). MUST note which positions are calculated vs estimated." },
                  human_design_type: { type: "string", enum: ["Generator", "Manifesting Generator", "Projector", "Manifestor", "Reflector"], description: "One of the 5 HD types" },
                  human_design_strategy: { type: "string", enum: ["To Respond", "To Respond & Inform", "Wait for the Invitation", "To Inform", "Wait a Lunar Cycle"], description: "Strategy matching the type" },
                  human_design_authority: { type: "string", enum: ["Emotional/Solar Plexus", "Sacral", "Splenic", "Ego/Heart", "Self-Projected", "Environmental/Mental", "Lunar"], description: "Inner authority" },
                  human_design_profile: { type: "string", enum: ["1/3", "1/4", "2/4", "2/5", "3/5", "3/6", "4/6", "4/1", "5/1", "5/2", "6/2", "6/3"], description: "Profile lines" },
                  human_design_summary: { type: "string", description: "Rich paragraph about their Human Design (3-5 sentences). Note that precise calculation requires a formal HD chart." },
                  gene_keys_life_purpose: { type: "string", description: "Life's Work Gene Key in format: 'Gene Key N: Shadow → Gift → Siddhi'" },
                  gene_keys_evolution: { type: "string", description: "Evolution Gene Key in format: 'Gene Key N: Shadow → Gift → Siddhi'" },
                  gene_keys_radiance: { type: "string", description: "Radiance Gene Key in format: 'Gene Key N: Shadow → Gift → Siddhi'" },
                  gene_keys_summary: { type: "string", description: "Rich paragraph about their Gene Keys Golden Path (3-5 sentences)" },
                  numerology_summary: { type: "string", description: "Rich paragraph (4-6 sentences) weaving together Life Path, Birthday Number, Personal Year, and any karmic debt into a cohesive numerological narrative about soul mission, innate gifts, and current cycle." },
                  compatibility_tags: {
                    type: "array",
                    items: { 
                      type: "string",
                      enum: ["Deep Thinker", "Empath", "Visionary", "Healer", "Old Soul", "Free Spirit", "Mystic", "Warrior", "Nurturer", "Creator", "Seeker", "Leader", "Rebel", "Dreamer", "Philosopher", "Intuitive", "Alchemist", "Adventurer", "Peacemaker", "Teacher", "Lightworker", "Manifester", "Connector", "Sage", "Transformer"]
                    },
                    description: "5-8 personality/compatibility tags from the allowed list, derived from the cosmic blueprint",
                  },
                },
                required: [
                  "sun_sign", "moon_sign", "rising_sign", "astro_summary",
                  "human_design_type", "human_design_strategy", "human_design_authority",
                  "human_design_profile", "human_design_summary",
                  "gene_keys_life_purpose", "gene_keys_evolution", "gene_keys_radiance",
                  "gene_keys_summary", "numerology_summary", "compatibility_tags",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_cosmic_profile" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured data");

    const cosmicData = JSON.parse(toolCall.function.arguments);

    // ── Enforce deterministic sun sign (override AI if it deviated) ──
    cosmicData.sun_sign = sunSign;

    // ── Save to profile ──
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        birth_date: birthDate,
        birth_time: hasBirthTime ? birthTime : null,
        birth_place: birthPlace,
        birth_latitude: coords?.lat ?? null,
        birth_longitude: coords?.lng ?? null,
        life_path_number: lifePathNumber,
        birthday_number: birthdayNumber,
        personal_year_number: personalYearNumber,
        numerology_summary: cosmicData.numerology_summary,
        sun_sign: sunSign,
        moon_sign: cosmicData.moon_sign,
        rising_sign: cosmicData.rising_sign,
        astro_summary: cosmicData.astro_summary,
        human_design_type: cosmicData.human_design_type,
        human_design_strategy: cosmicData.human_design_strategy,
        human_design_authority: cosmicData.human_design_authority,
        human_design_profile: cosmicData.human_design_profile,
        human_design_summary: cosmicData.human_design_summary,
        gene_keys_life_purpose: cosmicData.gene_keys_life_purpose,
        gene_keys_evolution: cosmicData.gene_keys_evolution,
        gene_keys_radiance: cosmicData.gene_keys_radiance,
        gene_keys_summary: cosmicData.gene_keys_summary,
        compatibility_tags: cosmicData.compatibility_tags,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Profile update error:", updateError);
      throw new Error("Failed to save cosmic profile");
    }

    return new Response(JSON.stringify({
      success: true,
      profile: {
        ...cosmicData,
        sun_sign: sunSign,
        life_path_number: lifePathNumber,
        birthday_number: birthdayNumber,
        personal_year_number: personalYearNumber,
        birth_latitude: coords?.lat ?? null,
        birth_longitude: coords?.lng ?? null,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-cosmic-profile error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
