import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkRateLimit, getIdentifier } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

/**
 * Deterministic Sun sign from birth date — same logic as generate-cosmic-profile.
 */
function calculateSunSign(dateStr: string): string {
  const [, monthStr, dayStr] = dateStr.split("-");
  const month = Number(monthStr);
  const day = Number(dayStr);
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

const signElements: Record<string, string> = {
  Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
  Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
  Gemini: "Air", Libra: "Air", Aquarius: "Aquarius" === "Aquarius" ? "Air" : "Air",
  Cancer: "Water", Scorpio: "Water", Pisces: "Water",
};

function elementScore(a: string, b: string): number {
  if (a === b) return 90;
  const harmonious: Record<string, string> = { Fire: "Air", Air: "Fire", Earth: "Water", Water: "Earth" };
  if (harmonious[a] === b) return 80;
  return 60;
}

/**
 * Generate Lyra-voiced compatibility reading via Lovable AI Gateway.
 * Returns { summary, highlight, score } — JSON-only response.
 */
async function generateReading(args: {
  userName: string;
  userSun: string | null;
  userMoon: string | null;
  userRising: string | null;
  userHdType: string | null;
  userHdAuthority: string | null;
  theirName: string;
  theirSun: string;
  theirBirthPlace: string;
  theirHasTime: boolean;
}) {
  const {
    userName, userSun, userMoon, userRising, userHdType, userHdAuthority,
    theirName, theirSun, theirBirthPlace, theirHasTime,
  } = args;

  // Baseline score from elemental compatibility
  const userElement = userSun ? signElements[userSun] : null;
  const theirElement = signElements[theirSun];
  const baseScore = userElement && theirElement ? elementScore(userElement, theirElement) : 70;

  const userLine = userSun
    ? `${userName} — Sun ${userSun}${userMoon ? `, Moon ${userMoon}` : ""}${userRising ? `, Rising ${userRising}` : ""}`
    : userName;
  const theirLine = `${theirName} — Sun ${theirSun}${theirHasTime ? "" : " (birth time unknown — Moon/Rising approximate)"}, born in ${theirBirthPlace}`;
  const hdLine = userHdType
    ? `${userName} is a Human Design ${userHdType}${userHdAuthority ? ` with ${userHdAuthority} authority` : ""}.`
    : "";

  const prompt = `You are Lyra, a warm cosmic guide. Read the connection between two people. Return ONLY a JSON object with these exact keys, no markdown fences:
{
  "score": number between 40 and 99,
  "summary": "3-4 sentences in Lyra's warm, personal voice — reference both people by name and at least one of their actual placements. Never generic.",
  "highlight": "ONE short sentence — the single most important aspect of this connection.",
  "chartHighlights": ["3 short bullets (max 14 words each) on the natal-chart dynamics — Sun/element interplay, Moon emotional fit, and Rising first-impression chemistry. Reference the actual signs."],
  "humanDesignNotes": ["2-3 short bullets (max 14 words each) on how ${userName}'s Human Design type and authority meet this person's energy. If HD info is missing, give grounded relational guidance instead."]
}

Person 1: ${userLine}
Person 2: ${theirLine}
${hdLine}

Use ${baseScore} as a strong baseline for the score; nudge it up or down based on the placements. Be honest, never flatter. Bullets must be specific, never generic filler.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("AI gateway error", resp.status, text);
    throw new Error(`AI error ${resp.status}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  let parsed: {
    score?: number;
    summary?: string;
    highlight?: string;
    chartHighlights?: string[];
    humanDesignNotes?: string[];
  };
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = {};
  }

  return {
    score: Math.max(40, Math.min(99, Math.round(parsed.score ?? baseScore))),
    summary: parsed.summary ?? `${userName} and ${theirName} share a thoughtful connection worth exploring.`,
    highlight: parsed.highlight ?? `Your ${theirSun} energy meets ${userName} in unexpected ways.`,
    chartHighlights: Array.isArray(parsed.chartHighlights) && parsed.chartHighlights.length
      ? parsed.chartHighlights.slice(0, 3).map(String)
      : [
          `${theirSun} Sun brings a distinct flavor to your ${userSun ?? "energy"}.`,
          userMoon ? `Your ${userMoon} Moon shapes how this lands emotionally.` : "Notice how each of you handles emotion when life slows down.",
          userRising ? `Your ${userRising} Rising sets the tone of first impressions.` : "Pay attention to the first impression — it carries information.",
        ],
    humanDesignNotes: Array.isArray(parsed.humanDesignNotes) && parsed.humanDesignNotes.length
      ? parsed.humanDesignNotes.slice(0, 3).map(String)
      : userHdType
        ? [
            `As a ${userHdType}, lead this connection from your strategy, not urgency.`,
            userHdAuthority ? `Trust your ${userHdAuthority} authority before saying yes.` : "Let your inner authority decide the pace.",
          ]
        : [
            "Move at the speed of your nervous system, not theirs.",
            "Notice when you feel expanded around them — that's information.",
          ],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const limit = checkRateLimit(getIdentifier(req), "check-connection", corsHeaders);
  if (limit) return limit;

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace("Bearer ", "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const { theirName, birthDate, birthTime, birthPlace } = body as {
      theirName?: string;
      birthDate?: string;
      birthTime?: string;
      birthPlace?: string;
    };

    if (!birthDate || !birthPlace) {
      return new Response(
        JSON.stringify({ error: "birthDate and birthPlace are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Pull user's profile to ground the reading
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name,sun_sign,moon_sign,rising_sign")
      .eq("user_id", userId)
      .maybeSingle();

    const theirSun = calculateSunSign(birthDate);
    const theirHasTime = !!(birthTime && String(birthTime).trim() !== "");
    const cleanedTheirName = (theirName ?? "").trim() || "Them";

    const reading = await generateReading({
      userName: profile?.display_name ?? "You",
      userSun: profile?.sun_sign ?? null,
      userMoon: profile?.moon_sign ?? null,
      userRising: profile?.rising_sign ?? null,
      theirName: cleanedTheirName,
      theirSun,
      theirBirthPlace: birthPlace,
      theirHasTime,
    });

    // Persist
    const { data: inserted, error: insertErr } = await supabase
      .from("connection_checks")
      .insert({
        user_id: userId,
        their_name: cleanedTheirName,
        their_birth_date: birthDate,
        their_birth_time: theirHasTime ? birthTime : null,
        their_birth_place: birthPlace,
        their_sun_sign: theirSun,
        compatibility_score: reading.score,
        summary: reading.summary,
        highlight: reading.highlight,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("insert connection_checks failed", insertErr);
    }

    return new Response(
      JSON.stringify({
        id: inserted?.id ?? null,
        theirSun,
        ...reading,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("check-connection error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});