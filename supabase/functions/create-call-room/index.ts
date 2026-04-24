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

/**
 * Standardized error envelope. Every error response from this function
 * follows this shape so the client can reliably branch on `code` without
 * having to also check HTTP status, response body shape, or message text.
 *
 * Fields:
 *   - code:    machine-readable identifier (e.g. "PREMIUM_REQUIRED").
 *   - message: human-readable copy safe to show to the user.
 *   - status:  echoed HTTP status — convenient when callers only have the
 *              parsed JSON (Supabase functions.invoke wraps the Response).
 *   - error:   alias of `message` kept for backward compatibility with
 *              existing clients that still read `data.error`.
 *   - details: optional, non-sensitive context (e.g. reason).
 */
type ErrorCode =
  | "PREMIUM_REQUIRED"
  | "PREMIUM_VERIFICATION_UNAVAILABLE"
  | "MATCH_ID_REQUIRED"
  | "MATCH_ID_INVALID"
  | "MATCH_NOT_FOUND"
  | "NOT_MATCH_PARTICIPANT"
  | "INVALID_JSON"
  | "MATCH_LOOKUP_FAILED"
  | "DAILY_API_KEY_MISSING"
  | "DAILY_API_KEY_INVALID"
  | "DAILY_ROOM_FAILED"
  | "DAILY_TOKEN_FAILED"
  | "AUTH_REQUIRED"
  | "INTERNAL_ERROR";

const errorResponse = (
  code: ErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>,
) =>
  json(
    {
      code,
      message,
      status,
      error: message, // backward-compat with existing { error } readers
      ...(details ? { details } : {}),
    },
    status,
  );

/**
 * Reason the caller failed the premium gate. Surfaced in the response
 * `details.reason` so the client can choose between "Upgrade" vs "Renew"
 * copy without a second round-trip to check-subscription.
 */
type PremiumRequiredReason =
  | "no_customer"        // Stripe has no customer record for this email
  | "no_active_sub";     // customer exists but no active subscription

const premiumRequiredResponse = (reason: PremiumRequiredReason) =>
  errorResponse(
    "PREMIUM_REQUIRED",
    "Premium subscription required to start a call",
    403,
    { reason },
  );

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
      return errorResponse("AUTH_REQUIRED", "Authentication required", 401);
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
      return errorResponse("AUTH_REQUIRED", "Authentication required", 401);
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
      return errorResponse(
        "PREMIUM_VERIFICATION_UNAVAILABLE",
        "Premium verification unavailable",
        500,
      );
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
      return errorResponse(
        "PREMIUM_VERIFICATION_UNAVAILABLE",
        "Premium verification temporarily unavailable",
        502,
      );
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
      return premiumRequiredResponse("no_customer");
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
      return errorResponse(
        "PREMIUM_VERIFICATION_UNAVAILABLE",
        "Premium verification temporarily unavailable",
        502,
      );
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
      return premiumRequiredResponse("no_active_sub");
    }
    log("Premium verified");

    // 3. Parse + validate body. matchId is REQUIRED and must reference a real
    // match the caller participates in. Reject with structured 400/403/404 so
    // the client can surface a clear message rather than silently degrading.
    let parsedBody: Record<string, unknown> = {};
    try {
      parsedBody = (await req.json()) ?? {};
    } catch (_) {
      await recordProvisioningError(supabase, {
        category: "validation",
        httpStatus: 400,
        message: "Request body is not valid JSON",
        userId: user.id,
      });
      return errorResponse(
        "INVALID_JSON",
        "Request body must be valid JSON",
        400,
      );
    }

    const rawMatchId = parsedBody.matchId;
    const rawCallType = parsedBody.callType;

    if (typeof rawMatchId !== "string" || rawMatchId.trim().length === 0) {
      await recordProvisioningError(supabase, {
        category: "validation",
        httpStatus: 400,
        message: "matchId is required",
        userId: user.id,
        details: { receivedType: typeof rawMatchId },
      });
      return errorResponse("MATCH_ID_REQUIRED", "matchId is required", 400);
    }
    const matchId = rawMatchId.trim();

    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(matchId)) {
      await recordProvisioningError(supabase, {
        category: "validation",
        httpStatus: 400,
        message: "matchId is not a valid UUID",
        userId: user.id,
        details: { matchId: matchId.slice(0, 64) },
      });
      return errorResponse(
        "MATCH_ID_INVALID",
        "matchId must be a valid UUID",
        400,
      );
    }

    const callType: "voice" | "video" =
      rawCallType === "voice" ? "voice" : "video";

    // Look up the match using the service role so RLS doesn't mask a real row,
    // then enforce participation in code. This guarantees the call room is
    // bound to a confirmed mutual match and the caller cannot guess/forge one.
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, user_a, user_b")
      .eq("id", matchId)
      .maybeSingle();

    if (matchError) {
      log("Match lookup error", { error: matchError.message });
      await recordProvisioningError(supabase, {
        category: "validation",
        httpStatus: 500,
        message: `Match lookup failed: ${matchError.message}`,
        userId: user.id,
        matchId,
      });
      return errorResponse(
        "MATCH_LOOKUP_FAILED",
        "Could not validate match",
        500,
      );
    }

    if (!match) {
      log("Match not found", { matchId, userId: user.id });
      await recordProvisioningError(supabase, {
        category: "validation",
        httpStatus: 404,
        message: "Match not found",
        userId: user.id,
        matchId,
      });
      return errorResponse("MATCH_NOT_FOUND", "Match not found", 404);
    }

    if (match.user_a !== user.id && match.user_b !== user.id) {
      log("User not part of match", { matchId, userId: user.id });
      await recordProvisioningError(supabase, {
        category: "auth",
        httpStatus: 403,
        message: "User is not a participant of this match",
        userId: user.id,
        matchId,
      });
      return errorResponse(
        "NOT_MATCH_PARTICIPANT",
        "You are not a participant of this match",
        403,
      );
    }
    log("Match validated", { matchId });

    // 4. Create Daily.co room
    const dailyApiKey = Deno.env.get("DAILY_API_KEY");
    if (!dailyApiKey || dailyApiKey.trim().length === 0) {
      log("Missing DAILY_API_KEY");
      await recordProvisioningError(supabase, {
        category: "daily_api_key",
        httpStatus: 503,
        message: "DAILY_API_KEY missing",
        userId: user.id,
        matchId,
      });
      return errorResponse(
        "DAILY_API_KEY_MISSING",
        "Calling is temporarily unavailable. Our team has been notified — please try again shortly.",
        503,
      );
    }
    // Basic sanity check on the key shape — Daily keys are long opaque strings.
    // Catches obviously misconfigured values (e.g. placeholder text) without
    // making a network call.
    if (dailyApiKey.length < 20 || /\s/.test(dailyApiKey)) {
      log("DAILY_API_KEY appears malformed", { length: dailyApiKey.length });
      await recordProvisioningError(supabase, {
        category: "daily_api_key",
        httpStatus: 503,
        message: "DAILY_API_KEY appears malformed",
        userId: user.id,
        matchId,
        details: { length: dailyApiKey.length },
      });
      return errorResponse(
        "DAILY_API_KEY_INVALID",
        "Calling service is misconfigured. Please contact support if this persists.",
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
        await recordProvisioningError(supabase, {
          category: roomRes.status === 401 || roomRes.status === 403
            ? "daily_api_key"
            : "daily_room_create",
          httpStatus: roomRes.status,
          message: `Daily room creation failed (${roomRes.status})`,
          userId: user.id,
          matchId,
          details: {
            roomName,
            providerStatus: roomRes.status,
            providerBody: errText.slice(0, 500),
          },
        });
        if (roomRes.status === 401 || roomRes.status === 403) {
          return errorResponse(
            "DAILY_API_KEY_INVALID",
            "Calling service rejected our credentials. Please contact support.",
            503,
          );
        }
        return errorResponse(
          "DAILY_ROOM_FAILED",
          "Failed to create call room",
          502,
        );
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
        await recordProvisioningError(supabase, {
          category: "internal",
          httpStatus: 500,
          message: `call_rooms insert failed: ${insertErr.message}`,
          userId: user.id,
          matchId,
          details: { roomName },
        });
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
      await recordProvisioningError(supabase, {
        category: tokenRes.status === 401 || tokenRes.status === 403
          ? "daily_api_key"
          : "daily_token_create",
        httpStatus: tokenRes.status,
        message: `Daily meeting-token creation failed (${tokenRes.status})`,
        userId: user.id,
        matchId,
        details: {
          roomName,
          providerStatus: tokenRes.status,
          providerBody: errText.slice(0, 500),
        },
      });
      if (tokenRes.status === 401 || tokenRes.status === 403) {
        return errorResponse(
          "DAILY_API_KEY_INVALID",
          "Calling service rejected our credentials. Please contact support.",
          503,
        );
      }
      return errorResponse(
        "DAILY_TOKEN_FAILED",
        "Failed to create call token",
        502,
      );
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
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } },
      );
      await recordProvisioningError(supabase, {
        category: "internal",
        httpStatus: 500,
        message,
        details: {
          stack: error instanceof Error ? error.stack?.slice(0, 1000) : undefined,
        },
      });
    } catch {/* swallow — logging must not crash the handler */}
    return json({ error: message }, 500);
  }
});