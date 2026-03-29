import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getIdentifier } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rateLimitResponse = checkRateLimit(getIdentifier(req), "generate-icebreaker", corsHeaders);
  if (rateLimitResponse) return rateLimitResponse;

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

    const { matchId } = await req.json();
    if (!matchId) throw new Error("matchId is required");

    const { data: match } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single();

    if (!match) throw new Error("Match not found");

    const otherUserId = match.user_a === user.id ? match.user_b : match.user_a;

    const [{ data: myProfile }, { data: theirProfile }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("profiles").select("*").eq("user_id", otherUserId).single(),
    ]);

    if (!myProfile || !theirProfile) throw new Error("Profiles not found");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const formatProfile = (p: any) =>
      `${p.display_name || "Unknown"}: ${p.sun_sign || "?"} Sun, ${p.moon_sign || "?"} Moon, ${p.rising_sign || "?"} Rising, HD: ${p.human_design_type || "?"}, Life Path: ${p.life_path_number || "?"}, Gene Keys: ${p.gene_keys_life_purpose || "?"}, Interests: ${(p.interests || []).join(", ")}`;

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
            content: `You generate conversation starters for a dating app that blends astrology, Human Design, and Gene Keys with modern culture. The audience is hip, emotionally intelligent, and spiritually curious — NOT stereotypical "woo-woo" types.

VOICE & TONE:
- Confident, flirty, and effortlessly cool — like a text from someone who reads their birth chart AND has great taste in music
- Weave in cosmic references naturally, never forced or lecture-y. Think subtle flex, not astrology textbook
- Mix spiritual awareness with real-world charm. A Scorpio Moon reference should feel as smooth as a music recommendation
- Humor is welcome — witty, self-aware, a little cheeky. Never corny, never try-hard
- Keep it conversational. These should sound like something you'd ACTUALLY send, not a horoscope greeting card

CATEGORIES (generate exactly one per category):
1. 🎉 LIGHT & FUN — Playful, zero-pressure, makes them smile. Think "would you rather" energy or a funny observation about their chart
2. 💬 CASUAL & FLIRTY — Warm, a little cheeky, easy to respond to. The kind of opener that just flows
3. 🔮 CURIOUS & COSMIC — References something specific from their profile (sign, HD type, Gene Keys) in a genuinely intriguing way
4. 🌊 DEEP & MEANINGFUL — An honest, thoughtful question that invites real conversation. Emotional intelligence on display
5. 🔥 BOLD — Confident, direct, maybe a little spicy. Shows you know what you want

RULES:
- Reference 1-2 specific details from their profiles (signs, HD type, Gene Keys, shared interests) but keep it breezy
- Each icebreaker must be 1-2 sentences MAX
- NO jargon dumps. "Your Sacral energy is magnetic" > "As a Generator with Sacral authority you have defined centers that..."
- Avoid: "the stars aligned", "cosmic connection", "written in the stars", "universe brought us together" — too cliché
- Range from light banter to deep questions so the sender can pick their vibe

Generate exactly 5 icebreakers that Person A can send to Person B.`,
          },
          {
            role: "user",
            content: `Person A: ${formatProfile(myProfile)}\nPerson B: ${formatProfile(theirProfile)}\n\nGenerate 5 cosmic icebreakers.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_icebreakers",
              description: "Return 3 icebreaker conversation starters",
              parameters: {
                type: "object",
                properties: {
                  icebreakers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string", enum: ["🎉 Light & Fun", "💬 Casual & Flirty", "🔮 Curious & Cosmic", "🌊 Deep & Meaningful", "🔥 Bold"] },
                        text: { type: "string" },
                      },
                      required: ["category", "text"],
                    },
                    description: "Exactly 5 icebreaker messages with their category labels",
                  },
                },
                required: ["icebreakers"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_icebreakers" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return icebreakers");

    const { icebreakers } = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ icebreakers: icebreakers.slice(0, 5) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-icebreaker error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
