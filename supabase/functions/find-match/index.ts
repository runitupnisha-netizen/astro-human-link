import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getIdentifier } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Deterministic helpers ──────────────────────────────────────
function reduceToDigit(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split("").reduce((s, d) => s + Number(d), 0);
  }
  return n;
}
function lifePath(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return reduceToDigit(
    reduceToDigit(m) +
      reduceToDigit(d) +
      reduceToDigit(String(y).split("").reduce((s, c) => s + Number(c), 0))
  );
}
function sunSign(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  const z: [number, number, string][] = [
    [1, 20, "Aquarius"], [2, 19, "Pisces"], [3, 21, "Aries"],
    [4, 20, "Taurus"], [5, 21, "Gemini"], [6, 21, "Cancer"],
    [7, 23, "Leo"], [8, 23, "Virgo"], [9, 23, "Libra"],
    [10, 23, "Scorpio"], [11, 22, "Sagittarius"], [12, 22, "Capricorn"],
  ];
  for (let i = z.length - 1; i >= 0; i--) {
    const [sm, sd] = z[i];
    if (m > sm || (m === sm && d >= sd)) return z[i][2];
  }
  return "Capricorn";
}

const ELEMENT: Record<string, string> = {
  Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
  Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
  Gemini: "Air", Libra: "Air", Aquarius: "Air",
  Cancer: "Water", Scorpio: "Water", Pisces: "Water",
};

const ELEMENT_HARMONY: Record<string, Record<string, number>> = {
  Fire: { Fire: 85, Air: 90, Earth: 55, Water: 50 },
  Earth: { Earth: 80, Water: 90, Fire: 55, Air: 60 },
  Air: { Air: 80, Fire: 90, Water: 60, Earth: 60 },
  Water: { Water: 85, Earth: 90, Fire: 50, Air: 60 },
};

function astroSynastryScore(a: any, b: any): number {
  const sun = ELEMENT_HARMONY[ELEMENT[a.sun]]?.[ELEMENT[b.sun]] ?? 65;
  const moon = a.moon && b.moon ? ELEMENT_HARMONY[ELEMENT[a.moon]]?.[ELEMENT[b.moon]] ?? 65 : 70;
  const rising = a.rising && b.rising ? ELEMENT_HARMONY[ELEMENT[a.rising]]?.[ELEMENT[b.rising]] ?? 65 : 70;
  return Math.round(sun * 0.5 + moon * 0.3 + rising * 0.2);
}

function elementalBalance(a: any, b: any): number {
  const els = [ELEMENT[a.sun], ELEMENT[a.moon], ELEMENT[b.sun], ELEMENT[b.moon]].filter(Boolean);
  const unique = new Set(els).size;
  // 4 unique = perfect balance, 1 = stuck in same element
  return Math.round(50 + unique * 12);
}

function numerologyScore(a: number, b: number): number {
  if (!a || !b) return 70;
  const compatPairs: Record<number, number[]> = {
    1: [3, 5, 6], 2: [4, 6, 8, 9], 3: [1, 5, 9],
    4: [2, 7, 8], 5: [1, 3, 7], 6: [1, 2, 9],
    7: [4, 5], 8: [2, 4, 6], 9: [2, 3, 6],
    11: [2, 4, 22], 22: [4, 8, 11],
  };
  if (a === b) return 80;
  if (compatPairs[a]?.includes(b) || compatPairs[b]?.includes(a)) return 90;
  return 65;
}

function keyHighlight(a: any, b: any): string {
  const ea = ELEMENT[a.sun];
  const eb = ELEMENT[b.sun];
  if (a.moon && b.moon && a.moon === b.moon)
    return `Moon in ${a.moon} mirrored — your hearts beat in the same rhythm ✦`;
  if (a.sun === b.sun) return `Sun-conjunct-Sun in ${a.sun} — twin flame frequency ✦`;
  if (ea === "Fire" && eb === "Air") return "Fire meets Air — passion fanned into bright, lasting warmth ✦";
  if (ea === "Air" && eb === "Fire") return "Air meets Fire — ideas ignited, sparks flying ✦";
  if (ea === "Earth" && eb === "Water") return "Earth meets Water — deep nurture, fertile ground for growth ✦";
  if (ea === "Water" && eb === "Earth") return "Water meets Earth — emotional roots planted in steady soil ✦";
  if (ea === eb) return `Twin ${ea} energy — instant familiarity, shared instincts ✦`;
  return `${a.sun} & ${b.sun} — a stretch that becomes a teaching ✦`;
}

async function generateLyraSummary(
  a: any, b: any, score: number, theirName: string
): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return `You and ${theirName} land at ${score}% alignment. Your charts dance — sometimes in step, sometimes calling each other forward. Trust what feels easy, and stay curious about what stretches you.`;
  }

  const prompt = `You are Lyra, a warm wise cosmic guide — like a best friend who reads stars. Write ONE short paragraph (2–3 sentences max, conversational, no clinical jargon, no headers, no bullet points) about the energy between two people.

Person 1: ☉ ${a.sun} ☽ ${a.moon || "?"} ↗ ${a.rising || "?"}
Person 2 (${theirName}): ☉ ${b.sun} ☽ ${b.moon || "?"} ↗ ${b.rising || "?"}
Compatibility score: ${score}%

Speak in second person ("you and ${theirName}…"). Be warm, real, slightly poetic — never clinical. Do NOT mention the score number. End with a gentle insight, not a verdict.`;

  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!r.ok) throw new Error(`AI ${r.status}`);
    const data = await r.json();
    return data.choices?.[0]?.message?.content?.trim() ||
      `You and ${theirName} share a ${score}% resonance — let the chemistry unfold.`;
  } catch (e) {
    console.error("Lyra summary failed:", e);
    return `You and ${theirName} share an interesting current — moments of easy flow, moments asking you both to grow. Stay curious.`;
  }
}

function categoryNote(category: string, score: number): string {
  const tier = score >= 80 ? "high" : score >= 65 ? "mid" : "low";
  const notes: Record<string, Record<string, string>> = {
    astro: {
      high: "Your luminaries align — conversation feels fated.",
      mid: "Steady rapport with room to surprise each other.",
      low: "Different rhythms — friction here is the teacher.",
    },
    elements: {
      high: "All four elements present — a complete circuit.",
      mid: "Balanced enough to nourish, varied enough to spark.",
      low: "Heavy in one element — watch for echo chambers.",
    },
    numerology: {
      high: "Life-path numbers in natural harmony.",
      mid: "Compatible cycles — small rituals will deepen the bond.",
      low: "Different timelines — patience turns this into devotion.",
    },
  };
  return notes[category][tier];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const rl = checkRateLimit(getIdentifier(req, userData.user.id), "find-match", corsHeaders);
    if (rl) return rl;

    const { mySigns, theirBirthDate, theirName, myLifePath } = await req.json();

    if (!mySigns?.sun || !theirBirthDate) {
      return new Response(JSON.stringify({ error: "Missing your chart or their birth date." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const theirSun = sunSign(theirBirthDate);
    const theirLifePath = lifePath(theirBirthDate);

    // We don't have their moon/rising without time/place — keep null and weight accordingly
    const them = { sun: theirSun, moon: null as string | null, rising: null as string | null };
    const me = { sun: mySigns.sun, moon: mySigns.moon, rising: mySigns.rising };

    const astro = astroSynastryScore(me, them);
    const elements = elementalBalance(me, them);
    const numero = numerologyScore(myLifePath || 0, theirLifePath);
    const overall = Math.round(astro * 0.5 + elements * 0.25 + numero * 0.25);

    const safeName = (theirName || "they").trim() || "they";
    const summary = await generateLyraSummary(me, them, overall, safeName);
    const highlight = keyHighlight(me, them);

    return new Response(
      JSON.stringify({
        score: overall,
        summary,
        highlight,
        mySigns: me,
        theirSigns: { ...them, lifePath: theirLifePath },
        breakdown: {
          astro: { score: astro, note: categoryNote("astro", astro) },
          elements: { score: elements, note: categoryNote("elements", elements) },
          numerology: { score: numero, note: categoryNote("numerology", numero) },
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("find-match error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});