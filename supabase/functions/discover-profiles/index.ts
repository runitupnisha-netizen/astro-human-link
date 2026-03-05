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

    // Get current user's profile
    const { data: myProfile, error: myErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (myErr || !myProfile) throw new Error("Profile not found");

    // Get users already swiped on
    const { data: swipedRows } = await supabase
      .from("swipes")
      .select("target_user_id")
      .eq("user_id", user.id);

    const swipedIds = (swipedRows || []).map((r: any) => r.target_user_id);
    swipedIds.push(user.id); // exclude self

    // Fetch candidate profiles (onboarding complete, not already swiped)
    const { data: candidates, error: candErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("onboarding_complete", true)
      .not("user_id", "in", `(${swipedIds.join(",")})`)
      .limit(10);

    if (candErr) {
      console.error("Candidate fetch error:", candErr);
      throw new Error("Failed to fetch candidates");
    }

    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ profiles: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use AI to score compatibility
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const myBlueprint = formatProfile(myProfile);
    const candidateSummaries = candidates.map((c: any, i: number) => 
      `[${i}] ${formatProfile(c)}`
    ).join("\n\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert cosmic matchmaker. Given a user's profile and candidates, score compatibility (0-100) and provide a short mystical reason. Consider astrological synastry (sun/moon/rising compatibility), Human Design type pairing, Gene Keys resonance, shared interests, and social energy alignment. Be specific about WHY they match.`,
          },
          {
            role: "user",
            content: `MY PROFILE:\n${myBlueprint}\n\nCANDIDATES:\n${candidateSummaries}\n\nScore each candidate's compatibility with me. Return results sorted by score descending.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_scores",
              description: "Return compatibility scores for all candidates",
              parameters: {
                type: "object",
                properties: {
                  scores: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        index: { type: "number", description: "Candidate index from the list" },
                        score: { type: "number", description: "Compatibility 0-100" },
                        connection_type: { type: "string", description: "e.g. Soul Mate Potential, Twin Flame, Karmic Teacher, Cosmic Companion" },
                        reason: { type: "string", description: "1-2 sentence mystical reason for the match" },
                        shared_aspects: {
                          type: "array",
                          items: { type: "string" },
                          description: "2-3 astrological aspects they share, using symbols like ☉ ☌ ☽, ♀ △ ♂",
                        },
                      },
                      required: ["index", "score", "connection_type", "reason", "shared_aspects"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["scores"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_scores" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI scoring failed");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return scores");

    const { scores } = JSON.parse(toolCall.function.arguments);

    // Merge AI scores with profile data
    const enrichedProfiles = (scores as any[])
      .sort((a, b) => b.score - a.score)
      .map((s: any) => {
        const candidate = candidates[s.index];
        if (!candidate) return null;
        return {
          user_id: candidate.user_id,
          display_name: candidate.display_name,
          avatar_url: candidate.avatar_url,
          sun_sign: candidate.sun_sign,
          moon_sign: candidate.moon_sign,
          rising_sign: candidate.rising_sign,
          human_design_type: candidate.human_design_type,
          life_path_number: candidate.life_path_number,
          social_energy: candidate.social_energy,
          interests: candidate.interests,
          compatibility_tags: candidate.compatibility_tags,
          gene_keys_life_purpose: candidate.gene_keys_life_purpose,
          compatibility_score: s.score,
          connection_type: s.connection_type,
          compatibility_reason: s.reason,
          shared_aspects: s.shared_aspects,
        };
      })
      .filter(Boolean);

    return new Response(JSON.stringify({ profiles: enrichedProfiles }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("discover-profiles error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatProfile(p: any): string {
  return `Name: ${p.display_name || "Unknown"}
Sun: ${p.sun_sign || "?"}, Moon: ${p.moon_sign || "?"}, Rising: ${p.rising_sign || "?"}
Human Design: ${p.human_design_type || "?"} (${p.human_design_strategy || "?"}, ${p.human_design_authority || "?"})
Gene Keys Life Purpose: ${p.gene_keys_life_purpose || "?"}
Life Path: ${p.life_path_number || "?"}
Social Energy: ${p.social_energy || 5}/10
Tags: ${(p.compatibility_tags || []).join(", ")}
Interests: ${(p.interests || []).join(", ")}`;
}
