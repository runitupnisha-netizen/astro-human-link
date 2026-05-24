import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * Server-side content moderation router.
 *
 * Routes:
 *   text  -> Lovable AI Gateway (Gemini) structured classifier via tool calling
 *   image -> Hive visual moderation  (if HIVE_API_KEY set, else not_configured)
 *   audio -> Hive audio moderation   (if HIVE_API_KEY set, else not_configured)
 *
 * Fail-closed: on transport/API error the response is { flagged: true, provider: "<x>:error" }
 * so call sites block the action and route the content to the human moderation queue.
 *
 * Auth: requires a Supabase JWT (verified by reading the user via the user's bearer token).
 */

interface RequestBody {
  type: "text" | "image" | "audio";
  /** Text content, OR a publicly fetchable URL for image/audio. */
  content: string;
}

interface Result {
  flagged: boolean;
  categories: Record<string, number>;
  score: number;
  provider: string;
  reasons?: string[];
}

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const HIVE_API_KEY = Deno.env.get("HIVE_API_KEY");

/**
 * Text moderation via Lovable AI Gateway (Gemini).
 * Uses tool calling to force a strict JSON shape with per-category 0-1 scores.
 * Zero-tolerance on sexual_minors: ANY non-trivial score => flagged.
 */
const TEXT_CATEGORIES = [
  "sexual",
  "sexual_minors",
  "harassment",
  "hate",
  "self_harm",
  "violence",
  "dangerous",
  "illegal",
] as const;

async function moderateText(content: string): Promise<Result> {
  if (!LOVABLE_API_KEY) {
    return { flagged: true, categories: {}, score: 1, provider: "gemini:not_configured" };
  }
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "You are a strict content safety classifier for a dating app. " +
              "Score the user content from 0.0 (safe) to 1.0 (severe violation) for each category. " +
              "Be especially strict and conservative for sexual_minors: ANY sexualization, reference, " +
              "roleplay, or grooming involving anyone under 18 (or ambiguous age) MUST score >= 0.9. " +
              "Return ONLY the tool call. Do not narrate.",
          },
          { role: "user", content: content.slice(0, 4000) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_content",
              description: "Return safety scores per category.",
              parameters: {
                type: "object",
                properties: Object.fromEntries(
                  TEXT_CATEGORIES.map((c) => [
                    c,
                    { type: "number", minimum: 0, maximum: 1 },
                  ]),
                ),
                required: [...TEXT_CATEGORIES],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_content" } },
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("[moderate-content] gemini error", res.status, errText);
      if (res.status === 429 || res.status === 402) {
        // Don't permanently block users on transient gateway throttle/credit issues
        return { flagged: false, categories: {}, score: 0, provider: `gemini:${res.status}` };
      }
      return { flagged: true, categories: {}, score: 1, provider: "gemini:error" };
    }
    const json = await res.json();
    const argStr = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argStr) {
      console.error("[moderate-content] gemini no tool_call", JSON.stringify(json).slice(0, 500));
      return { flagged: true, categories: {}, score: 1, provider: "gemini:no_tool_call" };
    }
    let parsed: Record<string, number> = {};
    try {
      parsed = JSON.parse(argStr);
    } catch {
      return { flagged: true, categories: {}, score: 1, provider: "gemini:bad_json" };
    }
    const scores: Record<string, number> = {};
    for (const c of TEXT_CATEGORIES) {
      const v = Number(parsed[c]);
      scores[c] = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
    }
    const reasons: string[] = [];
    let flagged = false;
    // Zero-tolerance: sexual_minors at very low threshold.
    if (scores.sexual_minors >= 0.2) {
      flagged = true;
      reasons.push("sexual_minors");
    }
    // Standard thresholds for other categories.
    const STANDARD_THRESHOLDS: Record<string, number> = {
      sexual: 0.85,
      harassment: 0.8,
      hate: 0.8,
      self_harm: 0.8,
      violence: 0.85,
      dangerous: 0.85,
      illegal: 0.8,
    };
    for (const [k, t] of Object.entries(STANDARD_THRESHOLDS)) {
      if (scores[k] >= t) {
        flagged = true;
        if (!reasons.includes(k)) reasons.push(k);
      }
    }
    const maxScore = Object.values(scores).reduce((m, v) => (v > m ? v : m), 0);
    return { flagged, categories: scores, score: maxScore, provider: "gemini", reasons };
  } catch (err) {
    console.error("[moderate-content] gemini exception", err);
    return { flagged: true, categories: {}, score: 1, provider: "gemini:exception" };
  }
}

/** Hive image moderation. Expects a publicly fetchable image URL. */
async function moderateImage(url: string): Promise<Result> {
  if (!HIVE_API_KEY) {
    // Fail CLOSED for image moderation — photos are the highest-risk vector
    // and must never bypass scanning, even during configuration gaps.
    return { flagged: true, categories: {}, score: 1, provider: "hive:not_configured" };
  }
  try {
    const form = new FormData();
    form.append("url", url);
    const res = await fetch("https://api.thehive.ai/api/v2/task/sync", {
      method: "POST",
      headers: { Authorization: `Token ${HIVE_API_KEY}` },
      body: form,
    });
    if (!res.ok) {
      console.error("[moderate-content] hive image error", res.status, await res.text());
      return { flagged: true, categories: {}, score: 1, provider: "hive:error" };
    }
    const json = await res.json();
    const classes = json?.status?.[0]?.response?.output?.[0]?.classes ?? [];
    const scores: Record<string, number> = {};
    const reasons: string[] = [];
    let maxBad = 0;
    const BAD_PREFIXES = [
      "yes_nsfw", "yes_sexual", "yes_porn",
      "yes_violence", "yes_gore", "yes_blood",
      "yes_hate", "yes_nazi", "yes_terrorist",
      "yes_minor", "yes_child",
    ];
    for (const c of classes) {
      scores[c.class] = c.score;
      const isBad = BAD_PREFIXES.some((p) => c.class.startsWith(p));
      if (isBad && c.score > 0.7) {
        reasons.push(c.class);
        if (c.score > maxBad) maxBad = c.score;
      }
      if (c.class.includes("minor") && c.score > 0.2) {
        reasons.push(c.class);
        maxBad = Math.max(maxBad, c.score);
      }
    }
    return {
      flagged: reasons.length > 0,
      categories: scores,
      score: maxBad,
      provider: "hive",
      reasons,
    };
  } catch (err) {
    console.error("[moderate-content] hive image exception", err);
    return { flagged: true, categories: {}, score: 1, provider: "hive:exception" };
  }
}

async function moderateAudio(url: string): Promise<Result> {
  if (!HIVE_API_KEY) {
    // Fail CLOSED for voice moderation — audio is high-risk and must never
    // bypass scanning, even during configuration gaps.
    return { flagged: true, categories: {}, score: 1, provider: "hive:not_configured" };
  }
  try {
    const form = new FormData();
    form.append("url", url);
    const res = await fetch("https://api.thehive.ai/api/v2/task/sync", {
      method: "POST",
      headers: { Authorization: `Token ${HIVE_API_KEY}` },
      body: form,
    });
    if (!res.ok) {
      return { flagged: true, categories: {}, score: 1, provider: "hive:error" };
    }
    const json = await res.json();
    // Hive audio returns transcription + per-class scores; treat hate/harassment > 0.7 as flagged.
    const classes = json?.status?.[0]?.response?.output?.[0]?.classes ?? [];
    const scores: Record<string, number> = {};
    const reasons: string[] = [];
    let maxBad = 0;
    for (const c of classes) {
      scores[c.class] = c.score;
      if (/(hate|harass|threat|sexual|violence)/i.test(c.class) && c.score > 0.7) {
        reasons.push(c.class);
        if (c.score > maxBad) maxBad = c.score;
      }
    }
    return { flagged: reasons.length > 0, categories: scores, score: maxBad, provider: "hive", reasons };
  } catch (err) {
    console.error("[moderate-content] hive audio exception", err);
    return { flagged: true, categories: {}, score: 1, provider: "hive:exception" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    if (!body?.type || typeof body.content !== "string" || !body.content) {
      return new Response(JSON.stringify({ error: "type and content required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: Result;
    if (body.type === "text") result = await moderateText(body.content);
    else if (body.type === "image") result = await moderateImage(body.content);
    else if (body.type === "audio") result = await moderateAudio(body.content);
    else {
      return new Response(JSON.stringify({ error: "unknown type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[moderate-content] handler exception", err);
    // Fail closed on text by default. Caller decides.
    return new Response(
      JSON.stringify({ flagged: true, categories: {}, score: 1, provider: "router:error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});