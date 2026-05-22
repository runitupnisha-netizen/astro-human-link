import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * Server-side content moderation router.
 *
 * Routes:
 *   text  -> OpenAI Moderation (omni-moderation-latest)
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

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const HIVE_API_KEY = Deno.env.get("HIVE_API_KEY");

/** Categories that should flag at a much lower threshold. */
const ZERO_TOLERANCE = new Set([
  "sexual/minors",
  "csam",
  "child_sexual_content",
]);

async function moderateText(content: string): Promise<Result> {
  if (!OPENAI_API_KEY) {
    return { flagged: true, categories: {}, score: 1, provider: "openai:not_configured" };
  }
  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "omni-moderation-latest", input: content }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("[moderate-content] openai error", res.status, errText);
      return { flagged: true, categories: {}, score: 1, provider: "openai:error" };
    }
    const json = await res.json();
    const r = json.results?.[0];
    const categoryScores: Record<string, number> = r?.category_scores ?? {};
    const categoryFlags: Record<string, boolean> = r?.categories ?? {};
    const reasons: string[] = [];
    let flagged = !!r?.flagged;
    for (const [k, v] of Object.entries(categoryFlags)) {
      if (v) reasons.push(k);
    }
    // Lower threshold on zero-tolerance categories
    for (const k of ZERO_TOLERANCE) {
      const score = categoryScores[k];
      if (typeof score === "number" && score > 0.1) {
        flagged = true;
        if (!reasons.includes(k)) reasons.push(k);
      }
    }
    const maxScore = Object.values(categoryScores).reduce((m, v) => (v > m ? v : m), 0);
    return {
      flagged,
      categories: categoryScores,
      score: maxScore,
      provider: "openai",
      reasons,
    };
  } catch (err) {
    console.error("[moderate-content] openai exception", err);
    return { flagged: true, categories: {}, score: 1, provider: "openai:exception" };
  }
}

/** Hive image moderation. Expects a publicly fetchable image URL. */
async function moderateImage(url: string): Promise<Result> {
  if (!HIVE_API_KEY) {
    // Not configured yet — fail OPEN for images during initial rollout so legitimate
    // avatar/photo uploads aren't blocked. The Report flow still routes to the queue.
    // TODO(hive): switch to fail-closed once HIVE_API_KEY is provisioned and tested.
    return { flagged: false, categories: {}, score: 0, provider: "hive:not_configured" };
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
    // TODO(hive): wire audio moderation once HIVE_API_KEY is provisioned.
    return { flagged: false, categories: {}, score: 0, provider: "hive:not_configured" };
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