import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Element mappings for synastry
const signElements: Record<string, string> = {
  Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
  Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
  Gemini: "Air", Libra: "Air", Aquarius: "Air",
  Cancer: "Water", Scorpio: "Water", Pisces: "Water",
};

const signModalities: Record<string, string> = {
  Aries: "Cardinal", Cancer: "Cardinal", Libra: "Cardinal", Capricorn: "Cardinal",
  Taurus: "Fixed", Leo: "Fixed", Scorpio: "Fixed", Aquarius: "Fixed",
  Gemini: "Mutable", Virgo: "Mutable", Sagittarius: "Mutable", Pisces: "Mutable",
};

const signRulers: Record<string, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Pluto",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Uranus", Pisces: "Neptune",
};

// Element compatibility matrix (based on traditional elemental polarity)
function elementCompatibility(e1: string, e2: string): { score: number; description: string } {
  if (e1 === e2) return { score: 90, description: "Same element — instant understanding and natural harmony" };
  // Complementary (same polarity: masculine Fire↔Air, feminine Earth↔Water)
  const compatible: Record<string, string> = { Fire: "Air", Air: "Fire", Earth: "Water", Water: "Earth" };
  if (compatible[e1] === e2) return { score: 80, description: `${e1} and ${e2} complement beautifully — one fuels the other` };
  // Square energy (opposite polarity, 90° apart): Fire↔Water, Earth↔Air — most challenging
  const square = (e1 === "Fire" && e2 === "Water") || (e1 === "Water" && e2 === "Fire") ||
                 (e1 === "Earth" && e2 === "Air") || (e1 === "Air" && e2 === "Earth");
  if (square) return { score: 50, description: `${e1} and ${e2} create intense friction — powerful growth through deep challenge` };
  // Inconjunct (adjacent, different polarity): Fire↔Earth, Air↔Water — moderate tension
  return { score: 62, description: `${e1} and ${e2} have different rhythms — balance through patience and contrast` };
}

// HD type pairing dynamics
const hdPairingInsights: Record<string, Record<string, string>> = {
  Generator: {
    Generator: "Two Generators create a powerhouse of sustainable energy. Both respond to life — potential for a deeply satisfying partnership when each honors the other's sacral authority.",
    "Manifesting Generator": "Generator meets Manifesting Generator: complementary sacral beings. The MG's speed inspires the Generator's focus, while the Generator grounds the MG's multi-passionate nature.",
    Manifestor: "Generator provides sustaining energy while Manifestor initiates. Beautiful symbiosis when the Manifestor informs and the Generator responds — avoid power struggles.",
    Projector: "Generator's life force energizes the Projector, while the Projector guides the Generator's energy wisely. Key: Projector must wait for invitation, Generator must respond authentically.",
    Reflector: "Generator offers consistent energy that gives the Reflector a stable mirror. The Reflector reveals patterns the Generator can't see. Requires patience and lunar timing.",
  },
  "Manifesting Generator": {
    "Manifesting Generator": "Two MGs are a whirlwind of multi-passionate energy. Exciting but chaotic — both need space to pivot and explore. Shared adventures fuel the bond.",
    Manifestor: "Both have manifestation energy but express it differently. MG responds then acts fast; Manifestor initiates. Dynamic and powerful when roles are respected.",
    Projector: "MG's buzzing energy gives the Projector much to guide. The Projector helps the MG focus their scattered brilliance. Mutual recognition is essential.",
    Reflector: "MG brings dynamic energy; Reflector mirrors and amplifies it. The Reflector helps the MG see which of their many paths is most aligned.",
  },
  Manifestor: {
    Manifestor: "Two Manifestors can be explosive — both want to initiate. Works when each has sovereign domains. Mutual informing prevents collision. Powerful creator couple.",
    Projector: "Manifestor initiates, Projector guides the direction. Classic power couple dynamic when mutual respect flows. Manifestor must inform; Projector must be invited.",
    Reflector: "Manifestor's bold energy shapes the Reflector's environment. Reflector offers cosmic perspective that grounds the Manifestor's vision. Requires deep patience.",
  },
  Projector: {
    Projector: "Two Projectors see each other deeply — rare mutual recognition. Energy management is key as neither generates consistently. Wisdom amplifies between them.",
    Reflector: "Projector guides while Reflector reflects the bigger picture. Both are non-energy types — they understand each other's need for rest and space.",
  },
  Reflector: {
    Reflector: "Two Reflectors create a cosmic mirror chamber. Deeply sensitive to each other and environment. Requires exceptionally healthy surroundings to thrive together.",
  },
};

// Clean rising sign strings like "Aquarius (Approximate)" → "Aquarius"
function cleanSignName(sign: string | null): string {
  if (!sign) return "";
  return sign.replace(/\s*\(.*\)\s*$/, "").trim();
}

function getHDPairing(type1: string, type2: string): string {
  return hdPairingInsights[type1]?.[type2] || hdPairingInsights[type2]?.[type1] || 
    `${type1} and ${type2} bring unique energetic dynamics. Their interaction creates opportunities for growth and understanding through their complementary strategies.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    // Auth client to verify user
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Service role client for DB operations (bypasses RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { matchId } = await req.json();
    if (!matchId) throw new Error("matchId required");

    // Fetch match
    const { data: match, error: matchErr } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single();

    if (matchErr || !match) throw new Error("Match not found");
    if (match.user_a !== user.id && match.user_b !== user.id) throw new Error("Unauthorized");

    // Fetch both profiles
    const [{ data: profileA }, { data: profileB }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", match.user_a).single(),
      supabase.from("profiles").select("*").eq("user_id", match.user_b).single(),
    ]);

    if (!profileA || !profileB) throw new Error("Profiles not found");

    const myProfile = match.user_a === user.id ? profileA : profileB;
    const theirProfile = match.user_a === user.id ? profileB : profileA;

    // --- Deterministic Analysis ---

    // 1. Element compatibility (Sun signs)
    const myElement = signElements[myProfile.sun_sign || ""] || "Unknown";
    const theirElement = signElements[theirProfile.sun_sign || ""] || "Unknown";
    const elemCompat = myElement !== "Unknown" && theirElement !== "Unknown"
      ? elementCompatibility(myElement, theirElement)
      : { score: 50, description: "Birth data incomplete for element analysis" };

    // 2. Modality analysis
    const myModality = signModalities[myProfile.sun_sign || ""] || "Unknown";
    const theirModality = signModalities[theirProfile.sun_sign || ""] || "Unknown";

    // 3. HD Type Pairing
    const hdPairingText = (myProfile.human_design_type && theirProfile.human_design_type)
      ? getHDPairing(myProfile.human_design_type, theirProfile.human_design_type)
      : "Complete Human Design data needed for pairing analysis.";

    // 4. Element distribution (clean sign names for lookup)
    const myElements = {
      sun: signElements[cleanSignName(myProfile.sun_sign)] || null,
      moon: signElements[cleanSignName(myProfile.moon_sign)] || null,
      rising: signElements[cleanSignName(myProfile.rising_sign)] || null,
    };
    const theirElements = {
      sun: signElements[cleanSignName(theirProfile.sun_sign)] || null,
      moon: signElements[cleanSignName(theirProfile.moon_sign)] || null,
      rising: signElements[cleanSignName(theirProfile.rising_sign)] || null,
    };

    // --- AI-Enhanced Deep Analysis ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are a master astrologer and Human Design analyst. Analyze the deep compatibility between these two people.

PERSON A (${myProfile.display_name || "User A"}):
- Sun: ${myProfile.sun_sign || "?"} (${myElement}, ${myModality})
- Moon: ${myProfile.moon_sign || "?"}
- Rising: ${myProfile.rising_sign || "?"}
- Ruling Planet: ${signRulers[myProfile.sun_sign || ""] || "?"}
- Human Design: ${myProfile.human_design_type || "?"} — Strategy: ${myProfile.human_design_strategy || "?"}, Authority: ${myProfile.human_design_authority || "?"}, Profile: ${myProfile.human_design_profile || "?"}
- Gene Keys Life Purpose: ${myProfile.gene_keys_life_purpose || "?"}
- Gene Keys Evolution: ${myProfile.gene_keys_evolution || "?"}
- Gene Keys Radiance: ${myProfile.gene_keys_radiance || "?"}
- Life Path Number: ${myProfile.life_path_number || "?"}
- Interests: ${(myProfile.interests || []).join(", ")}

PERSON B (${theirProfile.display_name || "User B"}):
- Sun: ${theirProfile.sun_sign || "?"} (${theirElement}, ${theirModality})
- Moon: ${theirProfile.moon_sign || "?"}
- Rising: ${theirProfile.rising_sign || "?"}
- Ruling Planet: ${signRulers[theirProfile.sun_sign || ""] || "?"}
- Human Design: ${theirProfile.human_design_type || "?"} — Strategy: ${theirProfile.human_design_strategy || "?"}, Authority: ${theirProfile.human_design_authority || "?"}, Profile: ${theirProfile.human_design_profile || "?"}
- Gene Keys Life Purpose: ${theirProfile.gene_keys_life_purpose || "?"}
- Gene Keys Evolution: ${theirProfile.gene_keys_evolution || "?"}
- Gene Keys Radiance: ${theirProfile.gene_keys_radiance || "?"}
- Life Path Number: ${theirProfile.life_path_number || "?"}
- Interests: ${(theirProfile.interests || []).join(", ")}

PRE-COMPUTED DATA:
- Element compatibility score: ${elemCompat.score}/100
- Element relationship: ${elemCompat.description}
- HD Type Pairing: ${hdPairingText}

Provide a comprehensive compatibility analysis.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a master cosmic compatibility analyst. Always base your analysis on real astrological principles. Be specific and insightful." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_analysis",
            description: "Return the detailed compatibility analysis",
            parameters: {
              type: "object",
              properties: {
                overall_score: { type: "number", description: "Overall compatibility 0-100" },
                overall_summary: { type: "string", description: "2-3 sentence poetic summary of the connection" },
                connection_archetype: { type: "string", description: "e.g. Twin Flame, Soul Mates, Karmic Teachers, Divine Complements, Cosmic Mirrors" },
                synastry: {
                  type: "object",
                  properties: {
                    score: { type: "number", description: "Astrological synastry score 0-100" },
                    sun_sun: { type: "string", description: "How their Sun signs interact (2 sentences)" },
                    moon_moon: { type: "string", description: "Emotional compatibility via Moon signs (2 sentences)" },
                    sun_moon_cross: { type: "string", description: "Sun-Moon cross aspects — how one's identity nurtures the other's emotions (2 sentences)" },
                    rising_dynamic: { type: "string", description: "How their Rising signs shape first impressions and daily interaction (2 sentences)" },
                    key_aspects: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          aspect: { type: "string", description: "e.g. ☉ △ ☽, ♀ ☌ ♂" },
                          meaning: { type: "string", description: "What this aspect means for them" },
                          energy: { type: "string", enum: ["harmonious", "dynamic", "challenging"] },
                        },
                        required: ["aspect", "meaning", "energy"],
                      },
                    },
                  },
                  required: ["score", "sun_sun", "moon_moon", "sun_moon_cross", "rising_dynamic", "key_aspects"],
                },
                elements: {
                  type: "object",
                  properties: {
                    score: { type: "number" },
                    balance_description: { type: "string", description: "How their combined elemental makeup creates balance or intensity (2 sentences)" },
                    dominant_element: { type: "string", description: "The dominant element in this pairing" },
                    missing_element: { type: "string", description: "Element that may be lacking, creating a growth area" },
                  },
                  required: ["score", "balance_description", "dominant_element", "missing_element"],
                },
                human_design: {
                  type: "object",
                  properties: {
                    score: { type: "number" },
                    type_dynamic: { type: "string", description: "How their HD types interact (2-3 sentences)" },
                    strategy_harmony: { type: "string", description: "How their strategies complement or challenge each other (2 sentences)" },
                    authority_interplay: { type: "string", description: "How their decision-making authorities interact (2 sentences)" },
                    growth_edge: { type: "string", description: "Key growth opportunity in this HD pairing (1-2 sentences)" },
                  },
                  required: ["score", "type_dynamic", "strategy_harmony", "authority_interplay", "growth_edge"],
                },
                gene_keys: {
                  type: "object",
                  properties: {
                    score: { type: "number" },
                    resonance_description: { type: "string", description: "How their Gene Keys life purposes resonate (2-3 sentences)" },
                    shadow_alchemy: { type: "string", description: "How their shadows can transform through the relationship (2 sentences)" },
                    gift_amplification: { type: "string", description: "How their gifts amplify each other (2 sentences)" },
                  },
                  required: ["score", "resonance_description", "shadow_alchemy", "gift_amplification"],
                },
                numerology: {
                  type: "object",
                  properties: {
                    score: { type: "number" },
                    life_path_dynamic: { type: "string", description: "How their Life Path numbers interact — core soul mission compatibility (2-3 sentences)" },
                    birthday_synergy: { type: "string", description: "How their Birthday Numbers (innate gifts/talents) complement or challenge each other (2 sentences)" },
                    personal_year_alignment: { type: "string", description: "How their current Personal Year cycles align — are they in sync or offering different lessons? (2 sentences)" },
                    karmic_connection: { type: "string", description: "Any karmic patterns, master number amplifications, or destiny connections between their numbers (2 sentences)" },
                    numerology_advice: { type: "string", description: "One sentence of numerological guidance for this pairing" },
                  },
                  required: ["score", "life_path_dynamic", "birthday_synergy", "personal_year_alignment", "karmic_connection", "numerology_advice"],
                },
                strengths: {
                  type: "array",
                  items: { type: "string" },
                  description: "3-4 key strengths of this pairing",
                },
                growth_areas: {
                  type: "array",
                  items: { type: "string" },
                  description: "2-3 areas where this pairing can grow together",
                },
                cosmic_advice: { type: "string", description: "One piece of mystical advice for this pairing (1-2 sentences)" },
              },
              required: ["overall_score", "overall_summary", "connection_archetype", "synastry", "elements", "human_design", "gene_keys", "numerology", "strengths", "growth_areas", "cosmic_advice"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("AI analysis failed");
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return analysis");

    const analysis = JSON.parse(toolCall.function.arguments);

    // Enrich with deterministic data
    const result = {
      ...analysis,
      profiles: {
        mine: {
          display_name: myProfile.display_name,
          avatar_url: myProfile.avatar_url,
          sun_sign: myProfile.sun_sign,
          moon_sign: myProfile.moon_sign,
          rising_sign: myProfile.rising_sign,
          element: myElement,
          human_design_type: myProfile.human_design_type,
          human_design_profile: myProfile.human_design_profile,
          gene_keys_life_purpose: myProfile.gene_keys_life_purpose,
          life_path_number: myProfile.life_path_number,
        },
        theirs: {
          display_name: theirProfile.display_name,
          avatar_url: theirProfile.avatar_url,
          sun_sign: theirProfile.sun_sign,
          moon_sign: theirProfile.moon_sign,
          rising_sign: theirProfile.rising_sign,
          element: theirElement,
          human_design_type: theirProfile.human_design_type,
          human_design_profile: theirProfile.human_design_profile,
          gene_keys_life_purpose: theirProfile.gene_keys_life_purpose,
          life_path_number: theirProfile.life_path_number,
        },
      },
      element_compatibility: elemCompat,
      hd_pairing_detail: hdPairingText,
    };

    // Update match with overall score
    await supabase
      .from("matches")
      .update({
        compatibility_score: analysis.overall_score,
        compatibility_summary: analysis.overall_summary,
      })
      .eq("id", matchId);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-compatibility error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
