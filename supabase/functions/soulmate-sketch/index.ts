// supabase/functions/soulmate-sketch/index.ts
// Generates a 4-sentence cosmic energy portrait of the user's ideal soul match.
// Stores the result so re-opens are instant.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are Lyra — a warm, poetic cosmic guide for the Stellara dating app.
You write energy portraits, never physical descriptions.
Voice: warm, knowing, intimate, lightly mystical, never clinical.
Always 4 sentences. Always second person ("they", "this soul").
Never describe physical features (face, hair, body, height).
Focus on energy, emotional rhythm, soul qualities, the way they hold space, what they spark in the user.
No emojis. No bullet points. Output only the 4 sentences — no preface.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sun, moon, rising, venus, seventh_house, name } = await req.json().catch(() => ({}));

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ sketch: null, error: "AI not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Based on this person's birth chart, write a 4-sentence cosmic energy portrait of their ideal soul match.
Their chart: Sun ${sun ?? "?"}, Moon ${moon ?? "?"}, Rising ${rising ?? "?"}, Venus ${venus ?? "(unknown)"}, 7th house ${seventh_house ?? "(unknown)"}.
Describe the energy, emotional qualities, and spiritual nature of who they attract — not appearance.
Write in a warm, poetic tone. ${name ? `The user's name is ${name}; you may use it once if it lands naturally.` : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 320,
        temperature: 0.9,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ sketch: null, error: "rate_limited" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ sketch: null, error: "credits_exhausted" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      return new Response(JSON.stringify({ sketch: null, error: "ai_error" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const sketch: string = (data?.choices?.[0]?.message?.content ?? "").trim();

    return new Response(JSON.stringify({ sketch }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[soulmate-sketch] error", e);
    return new Response(JSON.stringify({ sketch: null, error: "server_error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});