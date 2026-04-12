import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, code } = await req.json();
    if (!phone || !code) {
      return new Response(JSON.stringify({ error: "Phone and code required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check OTP
    const { data: otpRecord, error: fetchError } = await supabase
      .from("phone_otps")
      .select("*")
      .eq("phone", phone)
      .eq("code", code)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) throw new Error(`DB error: ${fetchError.message}`);

    if (!otpRecord) {
      return new Response(JSON.stringify({ error: "Invalid or expired code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as verified
    await supabase.from("phone_otps").update({ verified: true }).eq("id", otpRecord.id);

    // Check if user exists with this phone
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.phone === phone);

    let session;

    if (existingUser) {
      // Generate a magic link session for existing user
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: existingUser.email!,
      });
      if (error) throw new Error(`Auth error: ${error.message}`);

      // Sign in by updating user and creating session
      // Use signInWithPassword approach - set a temp password
      // Better: use admin to get user token
      const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseServiceKey,
        },
        body: JSON.stringify({
          phone,
          password: `phone_verified_${otpRecord.id}`,
        }),
      });
      
      // If password auth fails, create a session via admin
      if (!tokenRes.ok) {
        // Update the user's password to allow sign-in
        await supabase.auth.admin.updateUserById(existingUser.id, {
          password: `phone_verified_${otpRecord.id}`,
        });
        
        const retryRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
          },
          body: JSON.stringify({
            phone,
            password: `phone_verified_${otpRecord.id}`,
          }),
        });
        session = await retryRes.json();
        if (!retryRes.ok) throw new Error(`Session error: ${JSON.stringify(session)}`);
      } else {
        session = await tokenRes.json();
      }
    } else {
      // Create new user with phone
      const tempPassword = `phone_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        phone,
        phone_confirm: true,
        password: tempPassword,
      });
      if (createError) throw new Error(`Create user error: ${createError.message}`);

      // Sign in the new user
      const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
        },
        body: JSON.stringify({
          phone,
          password: tempPassword,
        }),
      });
      session = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(`Session error: ${JSON.stringify(session)}`);
    }

    // Cleanup used OTPs
    await supabase.from("phone_otps").delete().eq("phone", phone);

    return new Response(JSON.stringify({ session }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("verify-otp error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});