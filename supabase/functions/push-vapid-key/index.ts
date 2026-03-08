const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Return the VAPID public key for push subscription
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");

  if (!publicKey) {
    return new Response(
      JSON.stringify({ error: "VAPID keys not configured. Push notifications are not available yet." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ publicKey }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
