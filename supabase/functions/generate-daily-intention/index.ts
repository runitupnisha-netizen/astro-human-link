import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getIdentifier } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Cron-only: require shared secret
  const cronSecret = Deno.env.get("CRON_SECRET");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization") || "";
  const providedCronSecret = req.headers.get("x-cron-secret");
  const isAuthorized =
    (cronSecret && providedCronSecret === cronSecret) ||
    (serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rateLimitResponse = checkRateLimit(getIdentifier(req), "generate-daily-intention", corsHeaders);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey!);

    // Get all users with completed onboarding
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, sun_sign, moon_sign, rising_sign, human_design_type")
      .eq("onboarding_complete", true);

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No profiles found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date();
    const dayName = today.toLocaleDateString("en-US", { weekday: "long" });

    let created = 0;

    for (const profile of profiles) {
      // Check if we already sent today's intention
      const todayStr = today.toISOString().split("T")[0];
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", profile.user_id)
        .eq("type", "daily_intention")
        .gte("created_at", todayStr + "T00:00:00Z")
        .lte("created_at", todayStr + "T23:59:59Z")
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Generate intention with AI
      const prompt = `Generate a single cosmic daily intention for a person with Sun in ${profile.sun_sign || "unknown"}, Moon in ${profile.moon_sign || "unknown"}, Rising in ${profile.rising_sign || "unknown"}, Human Design type ${profile.human_design_type || "unknown"}. Today is ${dayName}. Return ONLY a JSON object: {"title": "short 3-5 word title", "intention": "1-2 sentence cosmic intention for today"}`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.8,
        }),
      });

      if (!aiResponse.ok) {
        console.error(`AI failed for user ${profile.user_id}`);
        continue;
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "";

      let parsed: { title: string; intention: string };
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch?.[0] || "{}");
      } catch {
        parsed = { title: "Cosmic Alignment", intention: content.slice(0, 200) };
      }

      // Insert notification
      await supabase.from("notifications").insert({
        user_id: profile.user_id,
        title: `✨ ${parsed.title}`,
        body: parsed.intention,
        type: "daily_intention",
      });

      created++;
    }

    return new Response(
      JSON.stringify({ message: `Created ${created} daily intentions` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
