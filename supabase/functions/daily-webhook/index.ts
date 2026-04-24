// Daily.co webhook receiver — stores call events in Supabase for analytics
// and per-user call history. Daily signs each delivery with HMAC-SHA256 over
// the raw request body using the webhook's shared secret (DAILY_WEBHOOK_SECRET).
// We verify the signature before accepting any event.
//
// This endpoint is PUBLIC (no Supabase JWT) — Daily calls it server-to-server.
// Authentication is enforced via the HMAC signature check.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp",
};

const log = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[DAILY-WEBHOOK] ${step}${detailsStr}`);
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

// Constant-time string compare to defeat timing attacks on the HMAC.
const safeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

const verifySignature = async (
  rawBody: string,
  timestamp: string,
  signature: string,
  secret: string,
): Promise<boolean> => {
  // Daily's HMAC scheme: signed payload is `${timestamp}.${rawBody}`,
  // HMAC-SHA256 with the webhook secret, hex-encoded.
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`${timestamp}.${rawBody}`),
  );
  const computed = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return safeEqual(computed, signature.toLowerCase());
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const rawBody = await req.text();

  // 1. Verify Daily HMAC signature
  const secret = Deno.env.get("DAILY_WEBHOOK_SECRET");
  if (!secret) {
    log("Missing DAILY_WEBHOOK_SECRET");
    return json({ error: "Webhook not configured" }, 500);
  }
  const timestamp = req.headers.get("x-webhook-timestamp") ?? "";
  const signature = req.headers.get("x-webhook-signature") ?? "";
  if (!timestamp || !signature) {
    log("Missing signature headers");
    return json({ error: "Missing signature" }, 401);
  }

  // Reject deliveries older than 5 min (replay protection)
  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) {
    log("Stale or invalid timestamp", { timestamp });
    return json({ error: "Invalid timestamp" }, 401);
  }

  const valid = await verifySignature(rawBody, timestamp, signature, secret);
  if (!valid) {
    log("Invalid signature");
    return json({ error: "Invalid signature" }, 401);
  }

  // 2. Parse payload
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  // Daily payloads look like { type, event_ts, payload: { room, ... } }
  // or sometimes { event, room, ... } for older formats — handle both.
  const eventType: string | undefined = event?.type ?? event?.event;
  const eventTs: number | undefined = event?.event_ts ?? event?.timestamp;
  const inner = event?.payload ?? event;
  const roomName: string | undefined = inner?.room ?? inner?.room_name ??
    inner?.meeting?.room ?? event?.room;
  const participantId: string | undefined = inner?.participant?.user_id ??
    inner?.user_id ?? inner?.session_id ?? null;

  if (!eventType || !roomName) {
    log("Missing event_type or room", { eventType, roomName });
    return json({ error: "Malformed event" }, 400);
  }

  // 3. Persist
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // Try to associate with the most recent call_session for this room
  const { data: session } = await supabase
    .from("call_sessions")
    .select("id")
    .eq("room_name", roomName)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const occurredAt = eventTs
    ? new Date(eventTs * 1000).toISOString()
    : new Date().toISOString();

  const { error: insertErr } = await supabase.from("call_events").insert({
    session_id: session?.id ?? null,
    room_name: roomName,
    event_type: eventType,
    participant_id: participantId,
    occurred_at: occurredAt,
    payload: event,
  });

  if (insertErr) {
    log("Insert failed", { error: insertErr.message });
    return json({ error: "Failed to record event" }, 500);
  }

  // 4. Side-effect: keep call_sessions.ended_at in sync when the room ends
  if (
    session?.id &&
    /^(meeting\.ended|room\.ended|meeting-ended)$/i.test(eventType)
  ) {
    await supabase
      .from("call_sessions")
      .update({ ended_at: occurredAt })
      .eq("id", session.id)
      .is("ended_at", null);
  }

  log("Event recorded", { eventType, roomName, sessionId: session?.id });
  return json({ received: true });
});