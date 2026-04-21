// Compact, deterministic "cosmic overlap" generator.
// Uses ONLY data that's already on the DiscoverProfile (no extra fetch),
// so the summary renders instantly and never blocks the card.

const ELEMENT_BY_SIGN: Record<string, "Fire" | "Earth" | "Air" | "Water"> = {
  Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
  Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
  Gemini: "Air", Libra: "Air", Aquarius: "Air",
  Cancer: "Water", Scorpio: "Water", Pisces: "Water",
};

const ELEMENT_VIBE: Record<string, string> = {
  Fire: "spark & momentum",
  Earth: "grounding & steadiness",
  Air: "ideas & easy conversation",
  Water: "emotional depth",
};

// One-line HD compatibility hints (kept short so the card stays scannable).
const HD_PAIRINGS: Record<string, Record<string, string>> = {
  Generator: {
    Generator: "two sustainable rhythms — slow build, deep groove",
    "Manifesting Generator": "shared lit-up energy, lots of creative momentum",
    Manifestor: "their initiation meets your follow-through",
    Projector: "your aura energizes their guidance",
    Reflector: "you give them a steady field to read",
  },
  "Manifesting Generator": {
    Generator: "shared lit-up energy with grounded depth",
    "Manifesting Generator": "high-velocity duo — keep aligning on what lights you up",
    Manifestor: "fast-moving pair — both initiators, mutual respect for autonomy",
    Projector: "your speed paired with their precision",
    Reflector: "they mirror back the truest version of your pace",
  },
  Manifestor: {
    Generator: "you initiate, they sustain — natural complement",
    "Manifesting Generator": "twin initiators — give each other room to move",
    Manifestor: "two sovereigns — communication keeps the peace",
    Projector: "your impact, their direction",
    Reflector: "they sense exactly when your timing is right",
  },
  Projector: {
    Generator: "their energy fuels your guidance",
    "Manifesting Generator": "their pace, your precision — a powerful pairing",
    Manifestor: "you read their direction beautifully",
    Projector: "deep mutual recognition — true seeing of one another",
    Reflector: "rare, intuitive attunement",
  },
  Reflector: {
    Generator: "they offer the steady field you flourish in",
    "Manifesting Generator": "their lit-up energy reflects vibrantly through you",
    Manifestor: "you sense the truth of their timing",
    Projector: "rare, intuitive attunement",
    Reflector: "extraordinary mirroring — move slowly together",
  },
};

const cleanList = (arr?: string[] | null) =>
  (arr ?? []).map((s) => (s ?? "").trim()).filter(Boolean);

export interface CosmicOverlapInput {
  // Match candidate
  sun_sign?: string | null;
  moon_sign?: string | null;
  rising_sign?: string | null;
  human_design_type?: string | null;
  shared_aspects?: string[] | null;
  // Viewer (optional — overlap reads richer when we have it)
  viewer?: {
    sun_sign?: string | null;
    moon_sign?: string | null;
    rising_sign?: string | null;
    human_design_type?: string | null;
  };
}

export interface CosmicOverlapPoint {
  /** Short label, e.g. "Sun", "Moon", "Human Design" */
  label: string;
  /** One-sentence explanation of the overlap. */
  detail: string;
}

/**
 * Returns up to 3 short overlap points. Always returns at least one item
 * so the summary block never collapses unexpectedly.
 */
export function buildCosmicOverlap(input: CosmicOverlapInput): CosmicOverlapPoint[] {
  const points: CosmicOverlapPoint[] = [];
  const v = input.viewer ?? {};

  const matchSun = input.sun_sign ?? null;
  const matchMoon = input.moon_sign ?? null;
  const matchRising = input.rising_sign ?? null;
  const matchHD = input.human_design_type ?? null;

  // 1. Sun-sign element resonance
  if (matchSun) {
    const theirElem = ELEMENT_BY_SIGN[matchSun];
    const yourElem = v.sun_sign ? ELEMENT_BY_SIGN[v.sun_sign] : null;
    if (theirElem && yourElem) {
      if (theirElem === yourElem) {
        points.push({
          label: "Sun",
          detail: `Both ${theirElem} suns — instant ${ELEMENT_VIBE[theirElem]}.`,
        });
      } else if (
        (theirElem === "Fire" && yourElem === "Air") ||
        (theirElem === "Air" && yourElem === "Fire")
      ) {
        points.push({
          label: "Sun",
          detail: `Your ${yourElem} sun feeds their ${theirElem} sun — ideas turn into action.`,
        });
      } else if (
        (theirElem === "Earth" && yourElem === "Water") ||
        (theirElem === "Water" && yourElem === "Earth")
      ) {
        points.push({
          label: "Sun",
          detail: `${yourElem} + ${theirElem} suns — feelings find form together.`,
        });
      } else {
        points.push({
          label: "Sun",
          detail: `${yourElem} meets ${theirElem} — different rhythms, room to learn.`,
        });
      }
    } else if (theirElem) {
      points.push({
        label: "Sun",
        detail: `${matchSun} sun brings ${ELEMENT_VIBE[theirElem]}.`,
      });
    }
  }

  // 2. Moon (emotional layer) — prioritise same-sign or same-element resonance
  if (matchMoon) {
    if (v.moon_sign && v.moon_sign === matchMoon) {
      points.push({
        label: "Moon",
        detail: `Same ${matchMoon} moon — you feel things in the same key.`,
      });
    } else if (v.moon_sign) {
      const theirElem = ELEMENT_BY_SIGN[matchMoon];
      const yourElem = ELEMENT_BY_SIGN[v.moon_sign];
      if (theirElem && yourElem && theirElem === yourElem) {
        points.push({
          label: "Moon",
          detail: `Both ${theirElem} moons — emotional language flows easily.`,
        });
      }
    }
  }

  // 3. Rising — fallback texture if we still have room
  if (points.length < 2 && matchRising) {
    if (v.rising_sign && v.rising_sign === matchRising) {
      points.push({
        label: "Rising",
        detail: `Matching ${matchRising} rising — you arrive in the world the same way.`,
      });
    } else if (matchRising) {
      const elem = ELEMENT_BY_SIGN[matchRising];
      points.push({
        label: "Rising",
        detail: elem
          ? `${matchRising} rising — first impression carries ${ELEMENT_VIBE[elem]}.`
          : `${matchRising} rising shapes how they show up.`,
      });
    }
  }

  // 4. Human Design pairing
  if (matchHD) {
    const theirHD = matchHD;
    const yourHD = v.human_design_type ?? null;
    if (yourHD && HD_PAIRINGS[yourHD]?.[theirHD]) {
      points.push({
        label: "Human Design",
        detail: `${yourHD} × ${theirHD} — ${HD_PAIRINGS[yourHD][theirHD]}.`,
      });
    } else {
      points.push({
        label: "Human Design",
        detail: `They lead as a ${theirHD}.`,
      });
    }
  }

  // 5. Shared aspects from the matching engine — surface up to 1 extra
  const shared = cleanList(input.shared_aspects);
  if (points.length < 3 && shared.length > 0) {
    points.push({
      label: "In common",
      detail: shared.slice(0, 3).join(" · "),
    });
  }

  // Always return at least one point so the UI doesn't disappear.
  if (points.length === 0) {
    points.push({
      label: "Cosmic overlap",
      detail: "Their blueprint is still loading — open the full profile to explore.",
    });
  }

  return points.slice(0, 3);
}
