import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NEW_PASSWORD = "StellaraReview2026!";
const DEMO_EMAIL = "demo@stellara.app";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { data: existing } = await admin.auth.admin.listUsers();
    const found = existing.users.find((u) => u.email?.toLowerCase() === DEMO_EMAIL);
    if (!found) {
      return new Response(JSON.stringify({ error: "Demo user not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.auth.admin.updateUserById(found.id, {
      password: NEW_PASSWORD,
      email_confirm: true,
    });

    return new Response(JSON.stringify({ ok: true, email: DEMO_EMAIL, password: NEW_PASSWORD }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
