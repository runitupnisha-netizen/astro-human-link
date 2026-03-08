import { generateVapidKeys, exportVapidKeys } from "jsr:@negrel/webpush";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64UrlEncode } from "https://deno.land/std@0.224.0/encoding/base64url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if VAPID keys already exist in env
    let publicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    if (publicKey) {
      return new Response(
        JSON.stringify({ publicKey }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate new VAPID keys using Web Crypto
    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );

    // Export public key as raw bytes then base64url encode
    const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
    const publicKeyBase64Url = base64UrlEncode(new Uint8Array(publicKeyRaw));

    // Export private key as JWK for storage
    const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

    // Store both keys as secrets for persistence
    // For now, return the generated public key
    // The keys should be stored as Supabase secrets
    console.log("Generated new VAPID keys. Public key:", publicKeyBase64Url);
    console.log("IMPORTANT: Store VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY as secrets");
    console.log("Private key JWK:", JSON.stringify(privateKeyJwk));

    return new Response(
      JSON.stringify({ 
        publicKey: publicKeyBase64Url,
        setup_required: true,
        message: "VAPID keys generated. Store them as secrets for persistence."
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
