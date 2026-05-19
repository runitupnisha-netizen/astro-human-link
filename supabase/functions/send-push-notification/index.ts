import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Restrict to service-role callers (other edge functions / cron / DB triggers)
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader !== `Bearer ${serviceRoleKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, record, user_id, title: customTitle, body: customBody, url: customUrl } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let targetUserIds: string[] = [];
    let title = "Stellara ✨";
    let body = "";
    let url = "/";

    if (type === "new_match") {
      // Notify both users about the match
      const userA = record.user_a;
      const userB = record.user_b;
      targetUserIds = [userA, userB];
      title = "🎉 New Match!";
      body = "You have a new cosmic connection! Start a conversation now.";
      url = "/connections";
    } else if (type === "new_message") {
      // Notify the recipient (not the sender)
      const senderId = record.sender_id;
      const matchId = record.match_id;

      // Find the other user in the match
      const { data: match } = await supabase
        .from("matches")
        .select("user_a, user_b")
        .eq("id", matchId)
        .single();

      if (!match) {
        return new Response(JSON.stringify({ ok: false, error: "Match not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const recipientId = match.user_a === senderId ? match.user_b : match.user_a;
      targetUserIds = [recipientId];

      // Get sender display name
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", senderId)
        .single();

      // NOTE: Web Push payloads are not yet RFC 8291 encrypted, so push services
      // can read the body. Avoid leaking sender identity or message content.
      void senderProfile;
      title = "💬 New Message";
      body = "You have a new message";
      url = `/messages?match=${matchId}`;
    } else if (type === "daily_briefing" && user_id) {
      targetUserIds = [user_id];
      title = customTitle || "🌅 Your Daily Cosmic Briefing";
      body = customBody || "Today's energy is ready to read.";
      url = customUrl || "/briefing";
    } else {
      return new Response(JSON.stringify({ ok: false, error: "Unknown type" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get push subscriptions for target users
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", targetUserIds);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also insert in-app notifications
    const notifications = targetUserIds.map((userId) => ({
      user_id: userId,
      title,
      body,
      type: type === "new_match" ? "match" : type === "daily_briefing" ? "daily_briefing" : "message",
    }));

    await supabase.from("notifications").insert(notifications);

    // Send web push to each subscription
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKeyJwk = Deno.env.get("VAPID_PRIVATE_KEY_JWK");

    if (!vapidPublicKey || !vapidPrivateKeyJwk) {
      console.warn("VAPID keys not configured — skipping web push, in-app notifications still sent");
      return new Response(JSON.stringify({ ok: true, sent: 0, inApp: notifications.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    const payload = JSON.stringify({ title, body, url });

    for (const sub of subscriptions) {
      try {
        const pushEndpoint = sub.endpoint;

        // Build JWT for VAPID
        const vapidJwt = await createVapidJwt(pushEndpoint, vapidPrivateKeyJwk, vapidPublicKey);

        const response = await fetch(pushEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            Authorization: `vapid t=${vapidJwt}, k=${vapidPublicKey}`,
            TTL: "86400",
          },
          body: await encryptPayload(payload, sub.p256dh, sub.auth),
        });

        if (response.ok || response.status === 201) {
          sent++;
        } else if (response.status === 410 || response.status === 404) {
          // Subscription expired, clean up
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
        }
      } catch (pushErr) {
        console.error("Push send error:", pushErr);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, inApp: notifications.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-push-notification error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ---- VAPID JWT creation ----
async function createVapidJwt(endpoint: string, privateKeyJwkStr: string, publicKey: string): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60;

  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud: audience, exp: expiration, sub: "mailto:hello@stellara.app" };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const privateKeyJwk = JSON.parse(privateKeyJwkStr);
  const key = await crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format if needed
  const sigArray = new Uint8Array(signature);
  const sigB64 = base64UrlEncodeBuffer(sigArray);

  return `${unsignedToken}.${sigB64}`;
}

// ---- Payload encryption (simplified — sends unencrypted for basic push) ----
async function encryptPayload(payload: string, _p256dh: string, _auth: string): Promise<Uint8Array> {
  // For a production app, implement RFC 8291 encryption.
  // For now, sending the raw payload works with most push services for testing.
  return new TextEncoder().encode(payload);
}

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlEncodeBuffer(buffer: Uint8Array): string {
  let binary = "";
  for (const byte of buffer) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
