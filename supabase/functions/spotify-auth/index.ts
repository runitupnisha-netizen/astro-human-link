import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkRateLimit, getIdentifier } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_ME_URL = "https://api.spotify.com/v1/me";
const SPOTIFY_TOP_URL = "https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=5";
const SPOTIFY_CURRENTLY_PLAYING_URL = "https://api.spotify.com/v1/me/player/currently-playing";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const rateLimitResponse = checkRateLimit(getIdentifier(req), "spotify-auth", corsHeaders);
  if (rateLimitResponse) return rateLimitResponse;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: "Spotify not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify user
  let userId: string | null = null;
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    userId = user?.id ?? null;
  }

  const url = new URL(req.url);
  // Parse body ONCE — calling req.json() multiple times throws "Body already consumed".
  let body: Record<string, any> = {};
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.json().catch(() => ({}));
  }
  const action = url.searchParams.get("action") || body.action;

  // ACTION: get auth URL
  if (action === "auth_url") {
    const redirectUri = url.searchParams.get("redirect_uri") || body.redirect_uri;
    const scopes = "user-read-currently-playing user-top-read user-read-recently-played";
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&show_dialog=true`;
    return new Response(JSON.stringify({ url: authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ACTION: exchange code for tokens
  if (action === "callback") {
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const code = body.code || url.searchParams.get("code");
    const redirectUri = body.redirect_uri || url.searchParams.get("redirect_uri");

    if (!code || !redirectUri) {
      return new Response(JSON.stringify({ error: "Missing code or redirect_uri" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Exchange code for tokens
    const tokenRes = await fetch(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      return new Response(JSON.stringify({ error: "Token exchange failed", details: tokenData }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Spotify user info
    const meRes = await fetch(SPOTIFY_ME_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const meData = await meRes.json();

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Upsert connection
    const { error } = await supabase.from("spotify_connections").upsert({
      user_id: userId,
      spotify_user_id: meData.id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: expiresAt,
      display_name: meData.display_name,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    if (error) {
      return new Response(JSON.stringify({ error: "Failed to save connection", details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, spotify_name: meData.display_name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ACTION: get currently playing / top tracks for a user
  if (action === "now_playing" || action === "top_tracks") {
    const targetUserId = url.searchParams.get("user_id") || body.user_id || userId;
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get stored tokens
    const { data: conn } = await supabase
      .from("spotify_connections")
      .select("*")
      .eq("user_id", targetUserId)
      .single();

    if (!conn) {
      return new Response(JSON.stringify({ connected: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = conn.access_token;

    // Refresh if expired
    if (new Date(conn.token_expires_at) <= new Date()) {
      const refreshRes = await fetch(SPOTIFY_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: conn.refresh_token,
        }),
      });
      const refreshData = await refreshRes.json();
      if (!refreshRes.ok) {
        return new Response(JSON.stringify({ connected: false, error: "Token refresh failed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      accessToken = refreshData.access_token;
      const newExpiry = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
      await supabase.from("spotify_connections").update({
        access_token: accessToken,
        token_expires_at: newExpiry,
        ...(refreshData.refresh_token ? { refresh_token: refreshData.refresh_token } : {}),
        updated_at: new Date().toISOString(),
      }).eq("user_id", targetUserId);
    }

    if (action === "now_playing") {
      const res = await fetch(SPOTIFY_CURRENTLY_PLAYING_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.status === 204 || res.status === 202) {
        return new Response(JSON.stringify({ connected: true, is_playing: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await res.json();
      return new Response(JSON.stringify({
        connected: true,
        is_playing: data.is_playing ?? false,
        track: data.item ? {
          name: data.item.name,
          artist: data.item.artists?.map((a: any) => a.name).join(", "),
          album: data.item.album?.name,
          image: data.item.album?.images?.[0]?.url,
          url: data.item.external_urls?.spotify,
        } : null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "top_tracks") {
      const res = await fetch(SPOTIFY_TOP_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      const tracks = (data.items || []).map((t: any) => ({
        name: t.name,
        artist: t.artists?.map((a: any) => a.name).join(", "),
        image: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url,
        url: t.external_urls?.spotify,
      }));
      return new Response(JSON.stringify({ connected: true, tracks }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // ACTION: disconnect
  if (action === "disconnect") {
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await supabase.from("spotify_connections").delete().eq("user_id", userId);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
