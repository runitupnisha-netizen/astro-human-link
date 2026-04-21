import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const today = new Date().toISOString().split("T")[0];

    // Already exists?
    const { data: existing } = await adminClient
      .from("daily_briefings")
      .select("*")
      .eq("user_id", userId)
      .eq("briefing_date", today)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ briefing: existing, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load profile context
    const { data: profile } = await adminClient
      .from("profiles")
      .select(
        "display_name, sun_sign, moon_sign, rising_sign, human_design_type, human_design_authority, life_path_number, personal_year_number"
      )
      .eq("user_id", userId)
      .maybeSingle();

    let parsed: any = null;

    if (lovableKey) {
      const sysPrompt = `You are Stellara's daily cosmic guide. Generate a warm, specific, "wise best friend" briefing for today (${today}) based on the user's chart. Output STRICT JSON only.`;
      const userPrompt = `User chart context:
- Name: ${profile?.display_name || "Friend"}
- Sun: ${profile?.sun_sign || "unknown"}
- Moon: ${profile?.moon_sign || "unknown"}
- Rising: ${profile?.rising_sign || "unknown"}
- Human Design: ${profile?.human_design_type || "unknown"} (${profile?.human_design_authority || "unknown"} authority)
- Life Path: ${profile?.life_path_number ?? "unknown"}
- Personal Year: ${profile?.personal_year_number ?? "unknown"}

Return JSON with these exact keys (all strings, concise, no markdown):
{
  "energy_theme": "3-6 word theme for today",
  "mood": "1-2 sentence emotional tone",
  "focus": "1-2 sentence area to focus on",
  "lucky_window": "specific time window like '2pm-5pm'",
  "affirmation": "single short affirmation in first person",
  "journal_prompt": "one introspective question",
  "cosmic_weather": "1 sentence about today's transits in plain English"
}`;

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (aiRes.ok) {
        const aiJson = await aiRes.json();
        const content = aiJson?.choices?.[0]?.message?.content;
        try {
          parsed = typeof content === "string" ? JSON.parse(content) : content;
        } catch {
          parsed = null;
        }
      }
    }

    // Fallback if AI unavailable
    if (!parsed) {
      parsed = {
        energy_theme: "Quiet Reset",
        mood: "Grounded and reflective. A good day to slow down and listen inward.",
        focus: "Tend to small, neglected details. Clarity comes from the quiet work.",
        lucky_window: "10am-1pm",
        affirmation: "I trust the pace at which my life is unfolding.",
        journal_prompt: "What is one thing I've been avoiding that's actually quite simple?",
        cosmic_weather: "A steady, supportive flow today — nothing demanding, plenty available.",
      };
    }

    const insertPayload = {
      user_id: userId,
      briefing_date: today,
      energy_theme: String(parsed.energy_theme || "Today's Energy"),
      mood: String(parsed.mood || ""),
      focus: String(parsed.focus || ""),
      lucky_window: parsed.lucky_window ? String(parsed.lucky_window) : null,
      affirmation: parsed.affirmation ? String(parsed.affirmation) : null,
      journal_prompt: String(parsed.journal_prompt || "What am I noticing today?"),
      cosmic_weather: parsed.cosmic_weather ? String(parsed.cosmic_weather) : null,
    };

    const { data: inserted, error: insertErr } = await adminClient
      .from("daily_briefings")
      .insert(insertPayload)
      .select()
      .single();

    if (insertErr) {
      // Race condition: another request created it
      const { data: again } = await adminClient
        .from("daily_briefings")
        .select("*")
        .eq("user_id", userId)
        .eq("briefing_date", today)
        .maybeSingle();
      if (again) {
        return new Response(JSON.stringify({ briefing: again, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw insertErr;
    }

    return new Response(JSON.stringify({ briefing: inserted, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate-daily-briefing] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});