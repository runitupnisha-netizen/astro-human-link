import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkRateLimit, getIdentifier } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CALL-ROOM] ${step}${detailsStr}`);
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rateLimitResponse = checkRateLimit(
    getIdentifier(req),
    "create-call-room",
    corsHeaders,
  );
  if (rateLimitResponse) return rateLimitResponse;

  try {
    log("Function started");

    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Authentication required" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(
      token,
    );
    if (userError || !userData.user?.email) {
      log("Auth failed", { error: userError?.message });
      return json({ error: "Authentication required" }, 401);
    }
    const user = userData.user;
    log("User authenticated", { userId: user.id });

    // 2. Premium check via Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      log("Missing STRIPE_SECRET_KEY");
      return json({ error: "Premium verification unavailable" }, 500);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      log("No Stripe customer for user");
      return json(
        { error: "Premium subscription required", code: "PREMIUM_REQUIRED" },
        403,
      );
    }

    const subs = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: "active",
      limit: 1,
    });

    if (subs.data.length === 0) {
      log("No active subscription");
      return json(
        { error: "Premium subscription required", code: "PREMIUM_REQUIRED" },
        403,
      );
    }
    log("Premium verified");

    // 3. Parse body (optional matchId for naming)
    let matchId: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.matchId === "string") matchId = body.matchId;
    } catch (_) {
      // body is optional
    }

    // 4. Create Daily.co room
    const dailyApiKey = Deno.env.get("DAILY_API_KEY");
    if (!dailyApiKey) {
      log("Missing DAILY_API_KEY");
      return json({ error: "Calling service not configured" }, 500);
    }

    const roomName = `stellara-${matchId ?? user.id.slice(0, 8)}-${Date.now()
      .toString(36)}`;
    const expSeconds = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour

    const roomRes = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dailyApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: roomName,
        privacy: "private",
        properties: {
          exp: expSeconds,
          enable_screenshare: true,
          enable_chat: false,
          start_video_off: false,
          start_audio_off: false,
          eject_at_room_exp: true,
        },
      }),
    });

    if (!roomRes.ok) {
      const errText = await roomRes.text();
      log("Daily room creation failed", { status: roomRes.status, errText });
      return json({ error: "Failed to create call room" }, 502);
    }

    const room = await roomRes.json();

    // 5. Create meeting token scoped to this user
    const tokenRes = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dailyApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_id: user.id,
          user_name: user.email?.split("@")[0] ?? "Stellara user",
          exp: expSeconds,
        },
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      log("Daily token creation failed", {
        status: tokenRes.status,
        errText,
      });
      return json({ error: "Failed to create call token" }, 502);
    }

    const { token: meetingToken } = await tokenRes.json();
    const joinUrl = `${room.url}?t=${meetingToken}`;

    log("Room ready", { roomName });
    return json({
      url: joinUrl,
      roomName,
      expiresAt: new Date(expSeconds * 1000).toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    return json({ error: message }, 500);
  }
});