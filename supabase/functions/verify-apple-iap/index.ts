// Verify an Apple IAP transaction against the App Store Server API.
//
// Flow:
//   1. Client (post-purchase) sends { originalTransactionId } and its JWT.
//   2. We mint an ES256 JWT signed with the App Store Connect p8 key.
//   3. Call GET /inApps/v1/subscriptions/{originalTransactionId} on the
//      App Store Server API. We try production first; on 404 we retry sandbox
//      (per Apple's recommended sandbox/prod fallback for unified flows).
//   4. Apple's response contains JWS-signed transaction + renewal info. We
//      decode the JWS payload (middle segment) — the response itself is
//      authenticated TLS from Apple, so this is sufficient for v1. (Full
//      JWS x5c chain validation is tracked as a v2 hardening item.)
//   5. Upsert into iap_subscriptions, keyed on (platform, original_transaction_id).
//
// Required secrets:
//   APPLE_ASC_KEY_ID         e.g. "ABC123XYZ9"
//   APPLE_ASC_ISSUER_ID      UUID from ASC → Users and Access → Keys
//   APPLE_ASC_PRIVATE_KEY    full PEM contents of AuthKey_XXXX.p8
//   APPLE_BUNDLE_ID          e.g. "com.runitupmedia.stellara"

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` ${JSON.stringify(details)}` : "";
  console.log(`[verify-apple-iap] ${step}${d}`);
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

// --- Helpers -------------------------------------------------------------

function b64UrlEncode(bytes: Uint8Array): string {
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64UrlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function pemToPkcs8(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, "")
    .replace(/-----END [A-Z ]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function signAppleJwt(opts: {
  keyId: string;
  issuerId: string;
  bundleId: string;
  privateKeyPem: string;
}): Promise<string> {
  const header = { alg: "ES256", kid: opts.keyId, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: opts.issuerId,
    iat: now,
    exp: now + 60 * 20, // 20 min, max allowed is 60
    aud: "appstoreconnect-v1",
    bid: opts.bundleId,
  };
  const enc = new TextEncoder();
  const headerB64 = b64UrlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = b64UrlEncode(enc.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const pkcs8 = pemToPkcs8(opts.privateKeyPem);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(signingInput),
  );
  return `${signingInput}.${b64UrlEncode(new Uint8Array(sig))}`;
}

// Decode the middle (payload) segment of a JWS. Apple-issued, returned over
// authenticated TLS — sufficient for v1. (Full x5c chain verification is a
// follow-up hardening; tracked in /mnt/documents/STOREKIT_TEST_PLAN.md.)
function decodeJwsPayload<T = Record<string, unknown>>(jws: string): T {
  const parts = jws.split(".");
  if (parts.length !== 3) throw new Error("malformed JWS");
  const bytes = b64UrlDecode(parts[1]);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

async function callAppleApi(
  jwt: string,
  originalTransactionId: string,
  env: "production" | "sandbox",
): Promise<{ status: number; body: any }> {
  const base =
    env === "production"
      ? "https://api.storekit.itunes.apple.com"
      : "https://api.storekit-sandbox.itunes.apple.com";
  const url = `${base}/inApps/v1/subscriptions/${encodeURIComponent(originalTransactionId)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const text = await res.text();
  let body: unknown = null;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

// --- Handler -------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthenticated" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData.user) return json({ error: "unauthenticated" }, 401);
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const originalTransactionId = (body?.originalTransactionId ?? "").toString().trim();
    if (!originalTransactionId) {
      return json({ error: "missing originalTransactionId" }, 400);
    }

    const keyId = Deno.env.get("APPLE_ASC_KEY_ID");
    const issuerId = Deno.env.get("APPLE_ASC_ISSUER_ID");
    const privateKeyPem = Deno.env.get("APPLE_ASC_PRIVATE_KEY");
    const bundleId = Deno.env.get("APPLE_BUNDLE_ID") ?? "com.runitupmedia.stellara";
    if (!keyId || !issuerId || !privateKeyPem) {
      log("missing secrets");
      return json({ error: "apple_credentials_not_configured" }, 500);
    }

    const jwt = await signAppleJwt({ keyId, issuerId, bundleId, privateKeyPem });

    // Try production first, fall back to sandbox on 404 (Apple's pattern).
    let env: "production" | "sandbox" = "production";
    let resp = await callAppleApi(jwt, originalTransactionId, env);
    if (resp.status === 404) {
      log("prod 404, retrying sandbox");
      env = "sandbox";
      resp = await callAppleApi(jwt, originalTransactionId, env);
    }
    if (resp.status !== 200) {
      log("apple api error", { status: resp.status, body: resp.body });
      return json({ error: "apple_api_error", status: resp.status, body: resp.body }, 502);
    }

    // Response shape: { environment, bundleId, data: [{ subscriptionGroupIdentifier, lastTransactions: [{ status, signedTransactionInfo, signedRenewalInfo, ... }] }] }
    const last = resp.body?.data?.[0]?.lastTransactions?.[0];
    if (!last?.signedTransactionInfo) {
      return json({ error: "no_transaction_info", raw: resp.body }, 502);
    }

    const tx = decodeJwsPayload<{
      originalTransactionId: string;
      transactionId: string;
      productId: string;
      purchaseDate: number;
      expiresDate?: number;
      revocationDate?: number;
      type: string;
      environment?: string;
    }>(last.signedTransactionInfo);

    const renewal = last.signedRenewalInfo
      ? decodeJwsPayload<{ autoRenewStatus?: number; expirationIntent?: number }>(
          last.signedRenewalInfo,
        )
      : null;

    // Apple subscription status codes: 1=active, 2=expired, 3=in billing retry,
    // 4=in grace, 5=revoked.
    const appleStatus = Number(last.status);
    let status: string = "expired";
    if (appleStatus === 1) status = "active";
    else if (appleStatus === 4) status = "in_grace";
    else if (appleStatus === 5) status = "revoked";
    else if (tx.revocationDate) status = "refunded";

    const upsertRow = {
      user_id: user.id,
      platform: "ios" as const,
      product_id: tx.productId,
      original_transaction_id: tx.originalTransactionId,
      latest_transaction_id: tx.transactionId,
      expires_at: tx.expiresDate ? new Date(tx.expiresDate).toISOString() : null,
      purchased_at: tx.purchaseDate ? new Date(tx.purchaseDate).toISOString() : null,
      status,
      environment: env,
      auto_renew: renewal?.autoRenewStatus === 1,
      raw: { transaction: tx, renewal, status: appleStatus },
    };

    const { error: upsertErr } = await supabase
      .from("iap_subscriptions")
      .upsert(upsertRow, { onConflict: "platform,original_transaction_id" });
    if (upsertErr) {
      log("upsert failed", { error: upsertErr.message });
      return json({ error: "db_upsert_failed", details: upsertErr.message }, 500);
    }

    log("verified", { userId: user.id, productId: tx.productId, status, env });
    return json({
      ok: true,
      premium: status === "active" || status === "in_grace",
      product_id: tx.productId,
      expires_at: upsertRow.expires_at,
      status,
      environment: env,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("error", { msg });
    return json({ error: msg }, 500);
  }
});