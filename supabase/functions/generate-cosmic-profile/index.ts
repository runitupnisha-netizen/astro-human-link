import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function calculateLifePathNumber(dateStr: string): number {
  // Reduce each component (month, day, year) to a single digit, then sum and reduce
  const [year, month, day] = dateStr.split("-").map(Number);
  
  const reduceToDigit = (n: number): number => {
    // Master numbers 11, 22, 33 are kept
    while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
      n = String(n).split("").reduce((sum, d) => sum + Number(d), 0);
    }
    return n;
  };

  const monthReduced = reduceToDigit(month);
  const dayReduced = reduceToDigit(day);
  const yearReduced = reduceToDigit(
    String(year).split("").reduce((sum, d) => sum + Number(d), 0)
  );

  return reduceToDigit(monthReduced + dayReduced + yearReduced);
}

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

    const { birthDate, birthTime, birthPlace } = await req.json();
    if (!birthDate || !birthPlace) {
      throw new Error("Missing birth data: birthDate and birthPlace are required");
    }

    const lifePathNumber = calculateLifePathNumber(birthDate);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const hasBirthTime = birthTime && birthTime.trim() !== "";
    
    const timeContext = hasBirthTime 
      ? `at ${birthTime}` 
      : "(birth time unknown — use noon/12:00 PM as the default for rising sign and Human Design calculations, and note this in your summaries)";

    const systemPrompt = `You are an expert astrologer, Human Design analyst, and Gene Keys guide. Given a person's birth data, generate their complete cosmic profile.

You MUST respond using the provided tool/function call format. Do not respond with plain text.

Be specific, insightful, and mystical in tone. Use the actual birth data to calculate approximate positions. Be creative but grounded in real astrological frameworks.

${!hasBirthTime ? "IMPORTANT: The user does not know their birth time. Use noon (12:00 PM) as a standard default — this gives the most statistically accurate rising sign estimate. Clearly note in your astro_summary that the rising sign is approximate. For Human Design, use noon as well and note the approximation in the summary." : ""}`;

    const userPrompt = `Generate a complete cosmic profile for someone born on ${birthDate} ${timeContext} in ${birthPlace}. Their Life Path Number is ${lifePathNumber}.

Include their sun sign, moon sign, rising sign, a rich astrology summary, their Human Design type/strategy/authority/profile with summary, and their Gene Keys life purpose/evolution/radiance paths with summary. Also generate 5-8 compatibility tags (personality traits useful for matching) based on their cosmic blueprint.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_cosmic_profile",
              description: "Save the generated cosmic profile data",
              parameters: {
                type: "object",
                properties: {
                  sun_sign: { type: "string", description: "Zodiac sun sign" },
                  moon_sign: { type: "string", description: "Zodiac moon sign" },
                  rising_sign: { type: "string", description: "Zodiac rising/ascendant sign (note if approximate due to unknown birth time)" },
                  astro_summary: { type: "string", description: "Rich paragraph about their astrological blueprint (3-5 sentences)" },
                  human_design_type: { type: "string", description: "e.g. Generator, Manifestor, Projector, Reflector, Manifesting Generator" },
                  human_design_strategy: { type: "string", description: "Their strategy e.g. To Respond, To Inform, Wait for Invitation, Wait a Lunar Cycle" },
                  human_design_authority: { type: "string", description: "Their authority e.g. Sacral, Emotional, Splenic" },
                  human_design_profile: { type: "string", description: "e.g. 1/3, 2/4, 3/5, 4/6, 5/1, 6/2" },
                  human_design_summary: { type: "string", description: "Rich paragraph about their Human Design (3-5 sentences)" },
                  gene_keys_life_purpose: { type: "string", description: "Their Life's Work Gene Key path (Shadow → Gift → Siddhi)" },
                  gene_keys_evolution: { type: "string", description: "Their Evolution Gene Key path" },
                  gene_keys_radiance: { type: "string", description: "Their Radiance Gene Key path" },
                  gene_keys_summary: { type: "string", description: "Rich paragraph about their Gene Keys (3-5 sentences)" },
                  compatibility_tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "5-8 personality/compatibility tags like 'Deep Thinker', 'Adventure Seeker', 'Emotionally Intuitive'",
                  },
                },
                required: [
                  "sun_sign", "moon_sign", "rising_sign", "astro_summary",
                  "human_design_type", "human_design_strategy", "human_design_authority",
                  "human_design_profile", "human_design_summary",
                  "gene_keys_life_purpose", "gene_keys_evolution", "gene_keys_radiance",
                  "gene_keys_summary", "compatibility_tags",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_cosmic_profile" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured data");

    const cosmicData = JSON.parse(toolCall.function.arguments);

    // Save to profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        birth_date: birthDate,
        birth_time: hasBirthTime ? birthTime : null,
        birth_place: birthPlace,
        life_path_number: lifePathNumber,
        sun_sign: cosmicData.sun_sign,
        moon_sign: cosmicData.moon_sign,
        rising_sign: cosmicData.rising_sign,
        astro_summary: cosmicData.astro_summary,
        human_design_type: cosmicData.human_design_type,
        human_design_strategy: cosmicData.human_design_strategy,
        human_design_authority: cosmicData.human_design_authority,
        human_design_profile: cosmicData.human_design_profile,
        human_design_summary: cosmicData.human_design_summary,
        gene_keys_life_purpose: cosmicData.gene_keys_life_purpose,
        gene_keys_evolution: cosmicData.gene_keys_evolution,
        gene_keys_radiance: cosmicData.gene_keys_radiance,
        gene_keys_summary: cosmicData.gene_keys_summary,
        compatibility_tags: cosmicData.compatibility_tags,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Profile update error:", updateError);
      throw new Error("Failed to save cosmic profile");
    }

    return new Response(JSON.stringify({ 
      success: true, 
      profile: { ...cosmicData, life_path_number: lifePathNumber } 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-cosmic-profile error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
