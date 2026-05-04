// supabase/functions/lyra-insight/index.ts
// Per-screen one-line cosmic insight from Lyra.
// One AI call per request, max 60 tokens, returns a single sentence.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getIdentifier } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LYRA_SYSTEM = `You are Lyra, a warm, wise cosmic guide for the Stellara dating app.
Speak in ONE short sentence — never more. Maximum ~22 words.
Voice: warm, knowing, personal, never clinical or generic.
Never mention being an AI. Never use bullet points or lists.
Never use the word "vibes". No emojis except an occasional ✦.
Output the sentence only — no preface, no quotes.`;

function buildPrompt(context: string, payload: Record<string, unknown> | null): string {
  const ctx = (payload || {}) as Record<string, unknown>;
  switch (context) {
    case "discover_card":
      return `Write one short Lyra-voice sentence of synastry insight between the user and a potential match.
User: Sun ${ctx.user_sun ?? "?"}, Moon ${ctx.user_moon ?? "?"}, Rising ${ctx.user_rising ?? "?"}.
Match: Sun ${ctx.match_sun ?? "?"}, Moon ${ctx.match_moon ?? "?"}, Rising ${ctx.match_rising ?? "?"}.
Be specific to the placements above. One sentence only.`;
    case "compatibility":
      return `Write one short Lyra-voice sentence highlighting the single most significant aspect between two charts.
You: Sun ${ctx.user_sun ?? "?"}, Moon ${ctx.user_moon ?? "?"}.
Them: Sun ${ctx.match_sun ?? "?"}, Moon ${ctx.match_moon ?? "?"}.
Mention the specific aspect by name. One sentence only.`;
    case "my_cosmos":
      return `Write one short Lyra-voice sentence about what this Big Three combination means for how the user loves.
Sun ${ctx.sun ?? "?"}, Moon ${ctx.moon ?? "?"}, Rising ${ctx.rising ?? "?"}.
Refer to all three signs by name. One sentence only.`;
    case "ritual_planet":
      return `Write one short Lyra-voice morning greeting referencing today's planetary energy for ${ctx.name ?? "the user"}.
Today's planet/aspect: ${ctx.planet_aspect ?? "current sky"}.
Address them by first name. One sentence only.`;
    case "moon_cycle":
      return `Write one short Lyra-voice sentence about what the current moon phase means for the user's love life specifically.
Phase: ${ctx.phase ?? "current"}. User Sun ${ctx.user_sun ?? "?"}, Moon ${ctx.user_moon ?? "?"}.
One sentence only.`;
    case "match_profile":
      return `Write one short Lyra-voice sentence with your overall read on this pairing.
You: Sun ${ctx.user_sun ?? "?"}, Moon ${ctx.user_moon ?? "?"}.
Them: Sun ${ctx.match_sun ?? "?"}, Moon ${ctx.match_moon ?? "?"}.
One sentence only.`;
    case "growth_greeting":
      return `Write one short Lyra-voice morning greeting for ${ctx.name ?? "the user"}, naming today's primary planetary energy and what it means for them personally.
User Sun ${ctx.user_sun ?? "?"}, Moon ${ctx.user_moon ?? "?"}.
Address them by first name. One sentence only.`;
    case "onboarding_lyra_intro":
      return `Write one short Lyra-voice greeting introducing yourself as their cosmic guide, referencing their chart.
Sun ${ctx.sun ?? "?"}, Moon ${ctx.moon ?? "?"}, Rising ${ctx.rising ?? "?"}.
Make it warm and personal. One sentence only.`;
    default:
      return `Write one short Lyra-voice sentence of cosmic insight for ${ctx.name ?? "the user"}. One sentence only.`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    const { data: claims, error: claimsErr } = await supabaseAuth.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const rl = checkRateLimit(getIdentifier(req, claims.claims.sub), "lyra-insight", corsHeaders);
    if (rl) return rl;

    const { context, payload } = await req.json().catch(() => ({ context: "", payload: null }));
    if (!context) {
      return new Response(JSON.stringify({ error: "Missing context" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ insight: null, error: "AI not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = buildPrompt(context, payload);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: LYRA_SYSTEM },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 60,
        temperature: 0.85,
      }),
    });

    if (response.status === 429 || response.status === 402) {
      // Silent — frontend hides the strip
      return new Response(JSON.stringify({ insight: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!response.ok) {
      return new Response(JSON.stringify({ insight: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let insight: string = data?.choices?.[0]?.message?.content?.trim() || "";
    // Hard truncate at first sentence
    insight = insight.replace(/^["']|["']$/g, "").trim();
    const firstSentence = insight.split(/(?<=[.!?])\s/)[0] || insight;

    return new Response(JSON.stringify({ insight: firstSentence }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[lyra-insight] error", e);
    return new Response(JSON.stringify({ insight: null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});