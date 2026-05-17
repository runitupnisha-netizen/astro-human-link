import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "auth required" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "auth required" }, 401);
    const caller = userData.user;

    const body = await req.json().catch(() => ({}));
    const matchId = typeof body.matchId === "string" ? body.matchId : null;
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;
    const callType = body.callType === "voice" ? "voice" : "video";
    if (!matchId) return json({ error: "matchId required" }, 400);

    // Confirm caller participates and find peer.
    const { data: match } = await supabase
      .from("matches")
      .select("id, user_a, user_b")
      .eq("id", matchId)
      .maybeSingle();
    if (!match) return json({ error: "match not found" }, 404);
    if (match.user_a !== caller.id && match.user_b !== caller.id) {
      return json({ error: "not a participant" }, 403);
    }
    const peerId = match.user_a === caller.id ? match.user_b : match.user_a;

    // Caller display name for the notification body.
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", caller.id)
      .maybeSingle();
    const callerName = callerProfile?.display_name?.trim() || "Someone";

    // Insert notification (service role bypasses RLS).
    await supabase.from("notifications").insert({
      user_id: peerId,
      title: callType === "video" ? "📞 Missed video call" : "📞 Missed call",
      body: `${callerName} tried to reach you`,
      type: "missed_call",
    });

    // Mark the call session as ended so call history reflects it.
    if (sessionId) {
      await supabase
        .from("call_sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", sessionId)
        .eq("user_id", caller.id);
    }

    return json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});