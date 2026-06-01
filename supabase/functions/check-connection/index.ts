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

  // Forced-JSON tool-call schema (same pattern as blueprint-synthesis) — the
  // model MUST call `emit_synastry_reading` so the response always parses.
  const tools = [
    {
      type: "function",
      function: {
        name: "emit_synastry_reading",
        description: "Return Lyra's full Bonds-style synastry reading for two people.",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: [
            "score", "summary", "highlight",
            "chartHighlights", "humanDesignNotes",
            "synastry_overview", "cross_aspects",
            "strengths", "friction_points", "lessons",
          ],
          properties: {
            score: { type: "integer", minimum: 40, maximum: 99 },
            summary: { type: "string" },
            highlight: { type: "string" },
            chartHighlights: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
            humanDesignNotes: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 3 },
            synastry_overview: { type: "string", description: "One short paragraph (2-4 sentences) on how the two charts interact overall, in Lyra's warm, grounded voice." },
            cross_aspects: {
              type: "array",
              minItems: 3, maxItems: 6,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["person_a_planet", "person_b_planet", "aspect_type", "orb", "short_read"],
                properties: {
                  person_a_planet: { type: "string", description: `${userName}'s planet, e.g. "Sun", "Moon", "Venus", "Mars"` },
                  person_b_planet: { type: "string", description: `${theirName}'s planet` },
                  aspect_type: { type: "string", enum: ["conjunction", "sextile", "square", "trine", "opposition", "quincunx"] },
                  orb: { type: "string", description: "Approximate orb in degrees (e.g. \"3°\"). Estimate when exact orb is unknowable — never invent precision." },
                  short_read: { type: "string", description: "1-2 sentences, Lyra's voice, on what this cross-aspect actually feels like for them." },
                },
              },
            },
            strengths: {
              type: "array",
              minItems: 3, maxItems: 4,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["title", "read"],
                properties: {
                  title: { type: "string", description: "Short label, 3-6 words." },
                  read: { type: "string", description: "1-2 sentences." },
                },
              },
            },
            friction_points: {
              type: "array",
              minItems: 2, maxItems: 3,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["title", "read"],
                properties: {
                  title: { type: "string", description: "Short label, 3-6 words." },
                  read: { type: "string", description: "1-2 sentences. Frame constructively as a growth edge — never \"this won't work\"." },
                },
              },
            },
            lessons: { type: "string", description: "One short closing paragraph (2-4 sentences) on what this connection is here to teach the user." },
          },
        },
      },
    },
  ];

  const degradedNote = theirHasTime
    ? ""
    : `\n\nNOTE: ${theirName}'s birth time is unknown — degrade to sign-level synastry. Use Sun, Venus, Mars, Mercury cross-aspects only (never Moon, Rising, or house-based placements for them). Mark orbs as approximate ("~"). Never invent a birth time.`;

  const systemPrompt = `You are Lyra, a warm, grounded cosmic guide who speaks like a wise best friend — never generic, never flattering. You always read TWO charts against each other (synastry), not one chart in isolation. Compute cross-aspects from the actual placements you are given; never fabricate planets, signs, or houses you weren't told about. When a placement is unknown, work with what you have and say so plainly.`;

  const userPrompt = `Read the connection between these two charts and call emit_synastry_reading with the full structured output.

Person A (the user): ${userLine}
Person B: ${theirLine}
${hdLine}

Baseline elemental score: ${baseScore} — use this as a strong anchor, then nudge up or down based on the cross-aspects you identify. Reference both people by name in the prose fields.${degradedNote}`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "emit_synastry_reading" } },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("AI gateway error", resp.status, text);
    throw new Error(`AI error ${resp.status}`);
  }

  const data = await resp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  const rawArgs = toolCall?.function?.arguments ?? data.choices?.[0]?.message?.content ?? "{}";
  type CrossAspect = { person_a_planet: string; person_b_planet: string; aspect_type: string; orb: string; short_read: string };
  type LabeledItem = { title: string; read: string };
  let parsed: {
    score?: number;
    summary?: string;
    highlight?: string;
    chartHighlights?: string[];
    humanDesignNotes?: string[];
    synastry_overview?: string;
    cross_aspects?: CrossAspect[];
    strengths?: LabeledItem[];
    friction_points?: LabeledItem[];
    lessons?: string;
  };
  try {
    parsed = typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs;
  } catch (e) {
    console.error("synastry tool-call parse failed", e, rawArgs);
    parsed = {};
  }

  const sanitizeAspects = (arr: unknown): CrossAspect[] => {
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((it): it is CrossAspect =>
        !!it && typeof it === "object" &&
        typeof (it as CrossAspect).person_a_planet === "string" &&
        typeof (it as CrossAspect).person_b_planet === "string" &&
        typeof (it as CrossAspect).aspect_type === "string" &&
        typeof (it as CrossAspect).short_read === "string"
      )
      .slice(0, 6)
      .map((it) => ({
        person_a_planet: String(it.person_a_planet),
        person_b_planet: String(it.person_b_planet),
        aspect_type: String(it.aspect_type),
        orb: String(it.orb ?? "~"),
        short_read: String(it.short_read),
      }));
  };
  const sanitizeLabeled = (arr: unknown, max: number): LabeledItem[] => {
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((it): it is LabeledItem =>
        !!it && typeof it === "object" &&
        typeof (it as LabeledItem).title === "string" &&
        typeof (it as LabeledItem).read === "string"
      )
      .slice(0, max)
      .map((it) => ({ title: String(it.title), read: String(it.read) }));
  };

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
    synastry_overview: parsed.synastry_overview ??
      `${userName} and ${theirName} bring two distinct rhythms together — ${userSun ?? "your"} energy meets ${theirSun} in a way worth paying attention to.`,
    cross_aspects: sanitizeAspects(parsed.cross_aspects),
    strengths: sanitizeLabeled(parsed.strengths, 4),
    friction_points: sanitizeLabeled(parsed.friction_points, 3),
    lessons: parsed.lessons ??
      `This connection is asking ${userName} to notice what shifts in their nervous system around ${theirName}. Pay attention to the texture, not just the spark.`,
    degraded: !theirHasTime,
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
      .select("display_name,sun_sign,moon_sign,rising_sign,human_design_type,human_design_authority")
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
      userHdType: profile?.human_design_type ?? null,
      userHdAuthority: profile?.human_design_authority ?? null,
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
        synastry_overview: reading.synastry_overview,
        cross_aspects: reading.cross_aspects,
        strengths: reading.strengths,
        friction_points: reading.friction_points,
        lessons: reading.lessons,
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
        userSun: profile?.sun_sign ?? null,
        userMoon: profile?.moon_sign ?? null,
        userRising: profile?.rising_sign ?? null,
        userHdType: profile?.human_design_type ?? null,
        userHdAuthority: profile?.human_design_authority ?? null,
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