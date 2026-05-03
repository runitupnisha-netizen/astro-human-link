import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkRateLimit, getIdentifier } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Looks up which auth providers an email is registered with.
 * Helps the sign-in screen route Google-only users to Google OAuth
 * instead of failing them with "invalid login credentials".
 *
 * Privacy: We deliberately return the same shape regardless of whether
 * the email exists, except when the user has ONLY social providers (no
 * password). In that case we expose `providers` so the UI can guide them.
 * If the user has a password, we return `{ exists: true, providers: [...] }`
 * with `has_password: true` but the UI keeps the normal password flow.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = checkRateLimit(getIdentifier(req), "check-auth-method", corsHeaders);
  if (rl) return rl;

  try {
    const { email } = await req.json().catch(() => ({}));
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Page through users to find a match (admin.listUsers has no email filter
    // in older SDKs). For a launch-day userbase this is acceptable; we cap
    // pages to keep latency reasonable.
    const target = email.trim().toLowerCase();
    let found: any = null;
    for (let page = 1; page <= 20 && !found; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      found = data.users.find((u) => (u.email ?? "").toLowerCase() === target);
      if (!data.users.length || data.users.length < 1000) break;
    }

    if (!found) {
      return new Response(
        JSON.stringify({ exists: false, providers: [], has_password: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const providers = Array.from(
      new Set((found.identities ?? []).map((i: any) => i.provider).filter(Boolean)),
    );
    const has_password = providers.includes("email");

    return new Response(
      JSON.stringify({ exists: true, providers, has_password }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});