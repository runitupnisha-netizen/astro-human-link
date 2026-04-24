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

    // 3. Parse body — matchId required, must belong to the caller
    let matchId: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.matchId === "string") matchId = body.matchId.trim();
    } catch (_) {
      // body is optional
    }

    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!matchId || !UUID_RE.test(matchId)) {
      return json({ error: "Valid matchId is required" }, 400);
    }

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, user_a, user_b")
      .eq("id", matchId)
      .maybeSingle();

    if (matchError || !match) {
      log("Match lookup failed", { matchError: matchError?.message });
      return json({ error: "Match not found" }, 404);
    }

    if (match.user_a !== user.id && match.user_b !== user.id) {
      log("User not part of match", { matchId, userId: user.id });
      return json({ error: "Not a participant of this match" }, 403);
    }

    // 4. Create Daily.co room
    const dailyApiKey = Deno.env.get("DAILY_API_KEY");
    if (!dailyApiKey) {
      log("Missing DAILY_API_KEY");
      return json({ error: "Calling service not configured" }, 500);
    }

    // Deterministic room per match within a 30-minute bucket so both
    // participants land in the same room without coordination.
    const bucket = Math.floor(Date.now() / (30 * 60 * 1000));
    const roomName = `stellara-${matchId.replace(/-/g, "").slice(0, 16)}-${bucket
      .toString(36)}`;
    const expSeconds = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour

    // Try to create the room; if it already exists (other participant created
    // it first this bucket), fall through and just mint a token for it.
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
          max_participants: 2,
        },
      }),
    });

    let room: { url?: string; name?: string };
    if (roomRes.ok) {
      room = await roomRes.json();
    } else if (roomRes.status === 409) {
      // Room already exists — fetch it
      const existing = await fetch(
        `https://api.daily.co/v1/rooms/${roomName}`,
        { headers: { Authorization: `Bearer ${dailyApiKey}` } },
      );
      if (!existing.ok) {
        const errText = await existing.text();
        log("Daily room fetch failed", { status: existing.status, errText });
        return json({ error: "Failed to retrieve call room" }, 502);
      }
      room = await existing.json();
    } else {
      const errText = await roomRes.text();
      log("Daily room creation failed", { status: roomRes.status, errText });
      return json({ error: "Failed to create call room" }, 502);
    }

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
    const roomUrl = room.url ?? `https://stellara.daily.co/${roomName}`;
    const joinUrl = `${roomUrl}?t=${meetingToken}`;

    // 6. Record session metadata (best-effort — don't fail the call if logging fails)
    let sessionId: string | null = null;
    try {
      const callType =
        (typeof (await Promise.resolve())) && // no-op to keep TS happy in older builds
        (room as any)?.callType;
      const { data: sessionRow, error: sessionError } = await supabase
        .from("call_sessions")
        .insert({
          match_id: matchId,
          user_id: user.id,
          room_name: roomName,
          call_type: typeof (callType) === "string" ? callType : "video",
        })
        .select("id")
        .maybeSingle();
      if (sessionError) {
        log("Session log insert failed", { error: sessionError.message });
      } else {
        sessionId = sessionRow?.id ?? null;
      }
    } catch (logErr) {
      log("Session log threw", {
        error: logErr instanceof Error ? logErr.message : String(logErr),
      });
    }

    log("Room ready", { roomName, sessionId });
    return json({
      url: joinUrl, // prebuilt iframe URL with embedded token
      roomUrl, // bare room URL (for SDK use)
      roomName,
      token: meetingToken, // for client-side SDK joins
      expiresAt: new Date(expSeconds * 1000).toISOString(),
      sessionId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    return json({ error: message }, 500);
  }
});