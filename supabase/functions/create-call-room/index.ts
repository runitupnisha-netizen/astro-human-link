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

// Server-side persistent error log. Best-effort — failures here must never
// block call provisioning, but they give ops a durable trail for premium
// verification problems and Daily.co API regressions.
type ErrorCategory =
  | "premium_verification"
  | "daily_api_key"
  | "daily_room_create"
  | "daily_token_create"
  | "auth"
  | "validation"
  | "internal";

const recordProvisioningError = async (
  supabase: ReturnType<typeof createClient>,
  payload: {
    category: ErrorCategory;
    httpStatus: number;
    message: string;
    userId?: string | null;
    matchId?: string | null;
    details?: Record<string, unknown>;
  },
) => {
  try {
    const { error } = await supabase.from("call_provisioning_errors").insert({
      user_id: payload.userId ?? null,
      match_id: payload.matchId ?? null,
      error_category: payload.category,
      http_status: payload.httpStatus,
      message: payload.message.slice(0, 500),
      details: payload.details ?? {},
    });
    if (error) {
      console.warn(`[CREATE-CALL-ROOM] Error log insert failed: ${error.message}`);
    }
  } catch (e) {
    console.warn(
      `[CREATE-CALL-ROOM] Error log threw: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
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

  // First-pass IP rate limit (cheap shield against unauthenticated floods).
  const ipLimitResponse = checkRateLimit(
    getIdentifier(req),
    "create-call-room",
    corsHeaders,
  );
  if (ipLimitResponse) return ipLimitResponse;

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

    // Per-user rate limit — prevents a single premium account from spamming
    // room creation regardless of IP rotation.
    const userLimitResponse = checkRateLimit(
      getIdentifier(req, user.id),
      "create-call-room",
      corsHeaders,
    );
    if (userLimitResponse) {
      log("Per-user rate limit hit", { userId: user.id });
      return userLimitResponse;
    }

    // 2. Premium check via Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      log("Missing STRIPE_SECRET_KEY");
      await recordProvisioningError(supabase, {
        category: "premium_verification",
        httpStatus: 500,
        message: "STRIPE_SECRET_KEY not configured",
        userId: user.id,
      });
      return json({ error: "Premium verification unavailable" }, 500);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    let customers;
    try {
      customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });
    } catch (stripeErr) {
      const message = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
      log("Stripe customer lookup failed", { message });
      await recordProvisioningError(supabase, {
        category: "premium_verification",
        httpStatus: 502,
        message: `Stripe customers.list failed: ${message}`,
        userId: user.id,
        details: { stage: "customers_list" },
      });
      return json({ error: "Premium verification temporarily unavailable" }, 502);
    }

    if (customers.data.length === 0) {
      log("No Stripe customer for user");
      await recordProvisioningError(supabase, {
        category: "premium_verification",
        httpStatus: 403,
        message: "No Stripe customer for user",
        userId: user.id,
        details: { reason: "no_customer" },
      });
      return json(
        { error: "Premium subscription required", code: "PREMIUM_REQUIRED" },
        403,
      );
    }

    let subs;
    try {
      subs = await stripe.subscriptions.list({
        customer: customers.data[0].id,
        status: "active",
        limit: 1,
      });
    } catch (stripeErr) {
      const message = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
      log("Stripe subscriptions lookup failed", { message });
      await recordProvisioningError(supabase, {
        category: "premium_verification",
        httpStatus: 502,
        message: `Stripe subscriptions.list failed: ${message}`,
        userId: user.id,
        details: { stage: "subscriptions_list", customerId: customers.data[0].id },
      });
      return json({ error: "Premium verification temporarily unavailable" }, 502);
    }

    if (subs.data.length === 0) {
      log("No active subscription");
      await recordProvisioningError(supabase, {
        category: "premium_verification",
        httpStatus: 403,
        message: "No active subscription",
        userId: user.id,
        details: { reason: "no_active_sub", customerId: customers.data[0].id },
      });
      return json(
        { error: "Premium subscription required", code: "PREMIUM_REQUIRED" },
        403,
      );
    }
    log("Premium verified");

    // 3. Parse body — matchId required, must belong to the caller
    let matchId: string | undefined;
    let callType: "voice" | "video" = "video";
    try {
      const body = await req.json();
      if (body && typeof body.matchId === "string") matchId = body.matchId.trim();
      if (body && (body.callType === "voice" || body.callType === "video")) {
        callType = body.callType;
      }
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
    if (!dailyApiKey || dailyApiKey.trim().length === 0) {
      log("Missing DAILY_API_KEY");
      return json(
        {
          error:
            "Calling is temporarily unavailable. Our team has been notified — please try again shortly.",
          code: "DAILY_API_KEY_MISSING",
        },
        503,
      );
    }
    // Basic sanity check on the key shape — Daily keys are long opaque strings.
    // Catches obviously misconfigured values (e.g. placeholder text) without
    // making a network call.
    if (dailyApiKey.length < 20 || /\s/.test(dailyApiKey)) {
      log("DAILY_API_KEY appears malformed", { length: dailyApiKey.length });
      return json(
        {
          error:
            "Calling service is misconfigured. Please contact support if this persists.",
          code: "DAILY_API_KEY_INVALID",
        },
        503,
      );
    }

    // Reuse an existing unexpired room for this match if one exists, otherwise
    // create a fresh one with a CRYPTOGRAPHICALLY RANDOM name so URLs cannot
    // be guessed from matchId/time. Both participants land in the same room
    // because we look it up by match_id (RLS-restricted to the two of them).
    const ROOM_TTL_MS = 60 * 60 * 1000; // 1 hour
    const expSeconds = Math.floor((Date.now() + ROOM_TTL_MS) / 1000);

    const { data: existingRow } = await supabase
      .from("call_rooms")
      .select("room_name, room_url, expires_at")
      .eq("match_id", matchId)
      .is("ended_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let roomName: string;
    let room: { url?: string; name?: string };

    if (existingRow) {
      roomName = existingRow.room_name;
      room = { name: roomName, url: existingRow.room_url };
      log("Reusing existing room for match", { roomName });
    } else {
      // Random unguessable name. Daily room names allow [a-z0-9-_].
      const rand = crypto.randomUUID().replace(/-/g, "");
      roomName = `stellara-${rand}`;

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

      if (!roomRes.ok) {
        const errText = await roomRes.text();
        log("Daily room creation failed", { status: roomRes.status, errText });
        if (roomRes.status === 401 || roomRes.status === 403) {
          return json(
            {
              error:
                "Calling service rejected our credentials. Please contact support.",
              code: "DAILY_API_KEY_INVALID",
            },
            503,
          );
        }
        return json({ error: "Failed to create call room" }, 502);
      }
      room = await roomRes.json();

      // Persist the binding so the other participant can find & reuse it.
      const { error: insertErr } = await supabase.from("call_rooms").insert({
        match_id: matchId,
        room_name: roomName,
        room_url: room.url ?? `https://stellara.daily.co/${roomName}`,
        created_by: user.id,
        expires_at: new Date(expSeconds * 1000).toISOString(),
      });
      if (insertErr) {
        log("call_rooms insert failed", { error: insertErr.message });
      }
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
      if (tokenRes.status === 401 || tokenRes.status === 403) {
        return json(
          {
            error:
              "Calling service rejected our credentials. Please contact support.",
            code: "DAILY_API_KEY_INVALID",
          },
          503,
        );
      }
      return json({ error: "Failed to create call token" }, 502);
    }

    const { token: meetingToken } = await tokenRes.json();
    const roomUrl = room.url ?? `https://stellara.daily.co/${roomName}`;
    const joinUrl = `${roomUrl}?t=${meetingToken}`;

    // 6. Record session metadata (best-effort — don't fail the call if logging fails)
    let sessionId: string | null = null;
    try {
      const { data: sessionRow, error: sessionError } = await supabase
        .from("call_sessions")
        .insert({
          match_id: matchId,
          user_id: user.id,
          room_name: roomName,
          call_type: callType,
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