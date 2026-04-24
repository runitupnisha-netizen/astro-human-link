/** Tiny one-line meanings for each planet/sign combo — used in My Cosmos Layer 2 deep view. */
export const PLANET_MEANINGS: Record<string, Record<string, string>> = {
  Venus: {
    Aries: "you love fast, fiercely, and on your own terms",
    Taurus: "you love through devotion, beauty, and steady touch",
    Gemini: "you love through words, wit, and curious minds",
    Cancer: "you love by holding people inside your inner world",
    Leo: "you love loudly and want to be chosen back",
    Virgo: "you love through small acts of careful service",
    Libra: "you love through harmony, beauty, and partnership",
    Scorpio: "you love deeply, privately, and all the way in",
    Sagittarius: "you love freely, with adventure as the language",
    Capricorn: "you love through commitment built slowly over time",
    Aquarius: "you love unconventionally, friend first",
    Pisces: "you love mystically, with no real edges",
  },
  Mars: {
    Aries: "you go after what you want, no second-guessing",
    Taurus: "you move slow, but you move deeply",
    Gemini: "your energy is quick, talkative, and clever",
    Cancer: "you defend what you love before yourself",
    Leo: "you act with heart, drama, and visibility",
    Virgo: "your action is precise, detailed, useful",
    Libra: "you move best in collaboration, not alone",
    Scorpio: "your drive is intense, focused, and quiet",
    Sagittarius: "you act on inspiration and big visions",
    Capricorn: "you build, brick by brick, with patience",
    Aquarius: "you act for ideals more than for ego",
    Pisces: "you flow toward action through feeling",
  },
  Mercury: {
    Aries: "your mind moves fast — you say it first",
    Taurus: "you think slowly and then never forget",
    Gemini: "your mind never sleeps; you think in tabs",
    Cancer: "you remember everything that was ever felt",
    Leo: "you speak warmly and want to be heard",
    Virgo: "you think in details and exact words",
    Libra: "you think relationally, weighing every side",
    Scorpio: "your mind sees through the surface",
    Sagittarius: "you think in stories and big ideas",
    Capricorn: "you think strategically, in long arcs",
    Aquarius: "you think in patterns nobody else sees",
    Pisces: "you think in images, music, and feeling",
  },
  Jupiter: {
    Aries: "you grow through bold first steps",
    Taurus: "you grow through abundance and the senses",
    Gemini: "you grow through learning and connection",
    Cancer: "you grow through home and emotional roots",
    Leo: "you grow through play and self-expression",
    Virgo: "you grow through service and refinement",
    Libra: "you grow through partnership and beauty",
    Scorpio: "you grow through depth and transformation",
    Sagittarius: "you grow through freedom and travel",
    Capricorn: "you grow through mastery and discipline",
    Aquarius: "you grow through community and innovation",
    Pisces: "you grow through surrender and faith",
  },
  Saturn: {
    Aries: "you're learning patience with your fire",
    Taurus: "you're learning to trust enough is enough",
    Gemini: "you're learning when to think and when to speak",
    Cancer: "you're learning to mother yourself first",
    Leo: "you're learning self-worth that doesn't need applause",
    Virgo: "you're learning to soften your inner critic",
    Libra: "you're learning to choose yourself in partnership",
    Scorpio: "you're learning the gift in letting go",
    Sagittarius: "you're learning that meaning is built, not found",
    Capricorn: "you're learning to rest as much as you build",
    Aquarius: "you're learning to belong without losing yourself",
    Pisces: "you're learning structure for your dreams",
  },
};

export const planetMeaning = (planet: string, sign: string | null | undefined): string => {
  if (!sign) return "your placement awaits your birth time";
  return PLANET_MEANINGS[planet]?.[sign] || "a quiet, personal current in your chart";
};

/** Numerology one-liners shared by Cosmos & FindMatch — short Lyra voice. */
export const NUMEROLOGY_ONE_LINER: Record<number, string> = {
  1: "born to lead and start what others won't",
  2: "a natural diplomat — partnership is your gift",
  3: "joy and expression are how you create",
  4: "you build foundations that outlast you",
  5: "freedom and change are your medicine",
  6: "love and family are your true compass",
  7: "depth, mysticism, and inner truth pull you",
  8: "abundance and mastery are your terrain",
  9: "you complete cycles others can't finish",
  11: "an intuitive messenger — light flows through you",
  22: "a master builder turning vision into form",
  33: "a teacher whose love uplifts everyone",
};

export const numberMeaning = (n: number | null | undefined): string =>
  n != null ? NUMEROLOGY_ONE_LINER[n] || "a deeply personal cosmic signature" : "complete your chart to reveal";

export const HD_ONE_LINER: Record<string, string> = {
  Generator: "built to respond — your gut knows first",
  "Manifesting Generator": "fast-moving responder, multi-passionate by design",
  Projector: "a guide whose gift unfolds when invited",
  Manifestor: "an initiator — you spark what others build",
  Reflector: "a rare mirror reflecting the room back",
};

export const hdMeaning = (type: string | null | undefined): string =>
  type ? HD_ONE_LINER[type] || "a unique energetic signature" : "—";