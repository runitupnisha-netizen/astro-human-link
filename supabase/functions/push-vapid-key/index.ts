import { checkRateLimit, getIdentifier } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rateLimitResponse = checkRateLimit(getIdentifier(req), "push-vapid-key", corsHeaders);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    if (publicKey) {
      return new Response(
        JSON.stringify({ publicKey }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate new VAPID key pair
    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );

    const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
    const publicKeyBase64Url = arrayBufferToBase64Url(publicKeyRaw);

    const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

    console.log("VAPID_PUBLIC_KEY:", publicKeyBase64Url);
    console.log("VAPID_PRIVATE_KEY_JWK:", JSON.stringify(privateKeyJwk));

    return new Response(
      JSON.stringify({ 
        publicKey: publicKeyBase64Url,
        privateKeyJwk,
        setup_required: true,
        message: "Store VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY_JWK as secrets for persistence."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function arrayBufferToBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
