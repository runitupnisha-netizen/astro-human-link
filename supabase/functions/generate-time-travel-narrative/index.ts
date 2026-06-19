// Time Travel — generates a Lyra-voice narrative for a specific date in the
// user's life. Receives pre-computed transiting placements + active aspects
// to the natal chart from the client (calculated locally via astronomy-engine),
// so the model never has to guess ephemeris values.
//
// Results are cached per (user, date) in blueprint_ai_cache with a 90-day TTL
// so re-visiting the same date is free.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Lyra, a warm, wise cosmic guide for Stellara.
You're helping a user travel back (or forward) to a specific date in their life and read what the sky was doing then.

Voice: warm, knowing, personal, never clinical. Speak directly to the user. Never mention being an AI.
Length: 3 short paragraphs (max ~170 words total).
Structure:
  1) One sentence naming the *feeling* of that moment, given the active transits.
  2) The 1–2 most significant transits in plain language — what theme they brought, what life area they touched.
  3) A single gentle invitation: what to notice, honor, or release about this moment now.

Never invent placements. Use only the facts provided. No headers, no bullet points, no emojis. Plain prose.`;

interface ActiveAspect {
  transit: string;        // e.g. "Saturn"
  natal: string;          // e.g. "Sun"
  aspect: string;         // e.g. "square"
  orb: number;
}

interface Body {
  date: string;                 // YYYY-MM-DD
  natal: Record<string, string>;// { sun: "Pisces", moon: "Leo", ... }
  transiting: Record<string, string>;
  aspects: ActiveAspect[];
  user_name?: string | null;
  is_past?: boolean;
}

function buildUserPrompt(b: Body): string {
  const natalLines = Object.entries(b.natal).map(([k, v]) => `  - Natal ${k}: ${v}`).join("\n");
  const transitLines = Object.entries(b.transiting).map(([k, v]) => `  - Transiting ${k}: ${v}`).join("\n");
  const aspectLines = b.aspects.length
    ? b.aspects.map((a) => `  - Transiting ${a.transit} ${a.aspect} natal ${a.natal} (orb ${a.orb.toFixed(1)}°)`).join("\n")
    : "  - (no major transits within tight orb)";

  const when = b.is_past ? "was" : "is";
  const dateNice = new Date(b.date + "T12:00:00Z").toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return `Date: ${dateNice}
User name: ${b.user_name || "friend"}

Natal chart (their permanent imprint):
${natalLines}

Sky on that date:
${transitLines}

Active aspects between the transiting sky and their natal chart:
${aspectLines}

Read what ${when} happening for them on this date. Tie the transits to their natal placements personally — never speak in generalities.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body || !body.date || !body.natal || !body.transiting) {
      return new Response(JSON.stringify({ error: "Missing date / chart data" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cacheKey = `time-travel:${body.date}`;

    // Cache hit — return immediately, no AI spend.
    const { data: cached } = await supabase
      .from("blueprint_ai_cache")
      .select("content, generated_at, cached_until")
      .eq("user_id", userId)
      .eq("section_key", cacheKey)
      .maybeSingle();

    if (cached?.content && cached.cached_until && new Date(cached.cached_until) > new Date()) {
      return new Response(JSON.stringify({ narrative: cached.content, cached: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(body) },
        ],
        max_tokens: 360,
        temperature: 0.85,
      }),
    });

    if (ai.status === 429) {
      return new Response(JSON.stringify({ error: "Slow down — try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (ai.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!ai.ok) {
      const txt = await ai.text();
      console.error("[time-travel] AI error", ai.status, txt);
      return new Response(JSON.stringify({ error: "AI unavailable" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await ai.json();
    const narrative: string = (data?.choices?.[0]?.message?.content ?? "").trim();
    if (!narrative) {
      return new Response(JSON.stringify({ error: "Empty response" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache for 90 days.
    const cachedUntil = new Date(Date.now() + 90 * 86400000).toISOString();
    await supabase
      .from("blueprint_ai_cache")
      .upsert(
        {
          user_id: userId,
          section_key: cacheKey,
          content: narrative,
          model: "google/gemini-2.5-flash",
          cached_until: cachedUntil,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,section_key" },
      );

    return new Response(JSON.stringify({ narrative, cached: false }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[generate-time-travel-narrative] error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});