import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, getIdentifier } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";

// E.164: + then 8-15 digits, leading digit 1-9.
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, { message: "Phone must be in international format (e.g. +14155551234)." });

const BodySchema = z.object({
  phone: phoneSchema,
});

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateCode(): string {
  // 6-digit numeric code, cryptographically random.
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return (arr[0] % 1_000_000).toString().padStart(6, "0");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      throw new Error("Supabase env not configured");
    }
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY is not configured");
    if (!TWILIO_MESSAGING_SERVICE_SID) throw new Error("TWILIO_MESSAGING_SERVICE_SID is not configured");

    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Invalid input" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const phone = parsed.data.phone;

    // Rate limit per IP+phone: 3 requests / 15 min.
    const identifier = `${getIdentifier(req)}:${phone}`;
    const limited = checkRateLimit(identifier, "send-sms-otp", corsHeaders);
    if (limited) return limited;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // Invalidate any active codes for this phone, then create a new one.
    const code = generateCode();
    const codeHash = await sha256Hex(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase
      .from("phone_otps")
      .update({ used: true })
      .eq("phone", phone)
      .eq("used", false);

    const ip = getIdentifier(req);
    const { error: insertErr } = await supabase.from("phone_otps").insert({
      phone,
      code_hash: codeHash,
      expires_at: expiresAt,
      ip,
    });
    if (insertErr) {
      console.error("phone_otps insert error", insertErr);
      throw new Error("Could not create code. Try again.");
    }

    // Send via Twilio Messaging Service.
    const twilioRes = await fetch(`${TWILIO_GATEWAY}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phone,
        MessagingServiceSid: TWILIO_MESSAGING_SERVICE_SID,
        Body: `Your Stellara code is: ${code}`,
      }),
    });

    if (!twilioRes.ok) {
      const errBody = await twilioRes.text();
      console.error(`Twilio send failed [${twilioRes.status}]: ${errBody}`);
      return new Response(
        JSON.stringify({ error: "Could not send SMS. Please check the number and try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, expires_at: expiresAt }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("send-sms-otp error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});