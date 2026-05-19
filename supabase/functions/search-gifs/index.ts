import { checkRateLimit, getIdentifier } from "../_shared/rate-limiter.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Require authenticated user — prevents anonymous use of Tenor quota.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rateLimitResponse = checkRateLimit(getIdentifier(req), "search-gifs", corsHeaders);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const TENOR_API_KEY = Deno.env.get("TENOR_API_KEY");
    if (!TENOR_API_KEY) {
      return new Response(JSON.stringify({ gifs: [], error: "GIF service not configured" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { query, limit = 20 } = await req.json();
    
    let url: string;
    if (query && query.trim()) {
      url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&client_key=stellara&limit=${limit}&media_filter=gif,tinygif`;
    } else {
      url = `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&client_key=stellara&limit=${limit}&media_filter=gif,tinygif`;
    }

    const response = await fetch(url);
    const data = await response.json();

    const gifs = (data.results || []).map((r: any) => ({
      id: r.id,
      title: r.content_description || "",
      url: r.media_formats?.gif?.url || r.media_formats?.tinygif?.url || "",
      preview: r.media_formats?.tinygif?.url || r.media_formats?.gif?.url || "",
      width: r.media_formats?.tinygif?.dims?.[0] || 200,
      height: r.media_formats?.tinygif?.dims?.[1] || 200,
    }));

    return new Response(JSON.stringify({ gifs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("GIF search error:", error);
    return new Response(JSON.stringify({ gifs: [], error: "Failed to search GIFs" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
