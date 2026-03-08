import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) throw new Error("Profile not found");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

    const systemPrompt = `You are a world-class astrologer and cosmic guide specializing in personalized weekly readings. You blend traditional astrology, Human Design, Gene Keys, and numerology into practical, inspiring weekly insights.

Your tone is warm, poetic yet grounded, and always empowering. You speak directly to the person ("you") and weave their specific cosmic data into every insight.

IMPORTANT: Respond ONLY using the provided tool/function call. Do NOT respond with plain text.`;

    const userPrompt = `Generate a deeply personalized weekly cosmic reading for the week of ${weekLabel}.

USER'S COSMIC PROFILE:
- Sun Sign: ${profile.sun_sign || "Unknown"}
- Moon Sign: ${profile.moon_sign || "Unknown"}
- Rising Sign: ${profile.rising_sign || "Unknown"}
- Life Path Number: ${profile.life_path_number || "Unknown"}
- Human Design Type: ${profile.human_design_type || "Unknown"}
- HD Strategy: ${profile.human_design_strategy || "Unknown"}
- HD Authority: ${profile.human_design_authority || "Unknown"}
- HD Profile: ${profile.human_design_profile || "Unknown"}
- Gene Keys Life Purpose: ${profile.gene_keys_life_purpose || "Unknown"}
- Gene Keys Evolution: ${profile.gene_keys_evolution || "Unknown"}
- Gene Keys Radiance: ${profile.gene_keys_radiance || "Unknown"}
- Relationship Goal: ${profile.relationship_goal || "Unknown"}
- Spiritual Practice: ${profile.spiritual_practice || "Unknown"}
- Growth Commitment: ${profile.growth_commitment || "Unknown"}

Create:
1. A weekly theme (2-4 words, evocative and specific to their chart)
2. A weekly overview (3-4 sentences weaving their sun/moon/rising with current cosmic weather)
3. Three planetary transit insights specific to their chart (planet name + emoji, description personalized to their signs, and energy level)
4. Seven daily energy ratings (high/medium/low) for each day of the week with a one-line intention for each day
5. Three personal growth focus points that tie into their Human Design strategy, Gene Keys activation, and life path number
6. A relationship insight quote specific to their cosmic profile and relationship goals`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        tools: [
          {
            type: "function",
            function: {
              name: "weekly_insights",
              description: "Return the structured weekly cosmic insights",
              parameters: {
                type: "object",
                properties: {
                  week_theme: { type: "string", description: "2-4 word evocative weekly theme" },
                  weekly_overview: { type: "string", description: "3-4 sentence overview weaving user's chart with cosmic weather" },
                  transits: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        planet: { type: "string", description: "Planet name with emoji, e.g. '☉ Sun'" },
                        description: { type: "string", description: "Personalized transit description" },
                        energy: { type: "string", enum: ["high", "medium", "low"] },
                      },
                      required: ["planet", "description", "energy"],
                      additionalProperties: false,
                    },
                    description: "Exactly 3 planetary transits",
                  },
                  daily_energies: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day: { type: "string", description: "Day abbreviation (Sun, Mon, Tue, etc.)" },
                        energy: { type: "string", enum: ["high", "medium", "low"] },
                        intention: { type: "string", description: "One-line daily intention" },
                      },
                      required: ["day", "energy", "intention"],
                      additionalProperties: false,
                    },
                    description: "Exactly 7 daily entries starting Sunday",
                  },
                  growth_focus: {
                    type: "array",
                    items: { type: "string" },
                    description: "Exactly 3 personal growth focus points",
                  },
                  relationship_quote: { type: "string", description: "A poetic relationship insight quote" },
                },
                required: ["week_theme", "weekly_overview", "transits", "daily_energies", "growth_focus", "relationship_quote"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "weekly_insights" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const insights = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Weekly insights error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
