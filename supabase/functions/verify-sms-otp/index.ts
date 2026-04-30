import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { checkRateLimit, getIdentifier } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, { message: "Phone must be in international format." });

const BodySchema = z.object({
  phone: phoneSchema,
  code: z.string().trim().regex(/^\d{6}$/, { message: "Code must be 6 digits." }),
});

const MAX_ATTEMPTS = 5;

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Synthetic email so we can leverage Supabase Auth's email-based session
 *  flow. The address is non-deliverable and uniquely keyed to the phone. */
function syntheticEmailFor(phone: string): string {
  // Strip the leading + and use as local part: phone+14155551234@phone.stellara.app
  const local = phone.replace(/^\+/, "");
  return `phone${local}@phone.stellara.app`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error("Supabase env not configured");

    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Invalid input" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { phone, code } = parsed.data;

    // Rate limit per IP+phone: 10 attempts / minute.
    const identifier = `${getIdentifier(req)}:${phone}`;
    const limited = checkRateLimit(identifier, "verify-sms-otp", corsHeaders);
    if (limited) return limited;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // Look up the most recent unused code for this phone.
    const { data: rows, error: fetchErr } = await supabase
      .from("phone_otps")
      .select("*")
      .eq("phone", phone)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchErr) {
      console.error("phone_otps select error", fetchErr);
      throw new Error("Could not verify code");
    }
    const otp = rows?.[0];
    if (!otp) {
      return new Response(
        JSON.stringify({ error: "No active code. Request a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (new Date(otp.expires_at).getTime() < Date.now()) {
      await supabase.from("phone_otps").update({ used: true }).eq("id", otp.id);
      return new Response(
        JSON.stringify({ error: "Code expired. Request a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (otp.attempts >= MAX_ATTEMPTS) {
      await supabase.from("phone_otps").update({ used: true }).eq("id", otp.id);
      return new Response(
        JSON.stringify({ error: "Too many incorrect attempts. Request a new code." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const candidate = await sha256Hex(code);
    if (candidate !== otp.code_hash) {
      await supabase
        .from("phone_otps")
        .update({ attempts: (otp.attempts ?? 0) + 1 })
        .eq("id", otp.id);
      return new Response(
        JSON.stringify({ error: "Incorrect code. Try again." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Code is valid — mark used.
    await supabase.from("phone_otps").update({ used: true }).eq("id", otp.id);

    // Find or create user keyed by synthetic email.
    const email = syntheticEmailFor(phone);

    // Check if user exists.
    let userId: string | null = null;
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    // listUsers can't filter by email reliably across versions — use getUserByEmail when available
    // Fallback: try generateLink with type=magiclink, which creates if missing only when create_user=true.
    // Approach: try to create; if it already exists, fetch via admin lookup.
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      phone,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { phone, signup_method: "phone" },
    });

    if (created?.user) {
      userId = created.user.id;
    } else if (createErr) {
      // Already exists — find the user.
      const msg = String(createErr.message || "").toLowerCase();
      if (
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("exists") ||
        msg.includes("duplicate")
      ) {
        // Page through users to find by email. Most apps fit in a few pages.
        let found: { id: string } | null = null;
        for (let page = 1; page <= 20 && !found; page++) {
          const { data: pageData } = await supabase.auth.admin.listUsers({
            page,
            perPage: 200,
          });
          if (!pageData?.users?.length) break;
          const match = pageData.users.find((u: any) => u.email === email || u.phone === phone);
          if (match) found = { id: match.id };
          if (pageData.users.length < 200) break;
        }
        if (!found) throw new Error("Could not locate existing account.");
        userId = found.id;
      } else {
        console.error("admin.createUser error", createErr);
        throw new Error("Could not create account.");
      }
    }

    if (!userId) throw new Error("Could not establish account.");

    // Issue a magic-link hashed_token the client can exchange for a session.
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkErr || !linkData?.properties?.hashed_token) {
      console.error("generateLink error", linkErr);
      throw new Error("Could not issue session.");
    }

    return new Response(
      JSON.stringify({
        success: true,
        email,
        token_hash: linkData.properties.hashed_token,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("verify-sms-otp error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});