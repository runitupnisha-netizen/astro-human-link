import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getIdentifier } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rateLimitResponse = checkRateLimit(getIdentifier(req), "who-liked-me", corsHeaders);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get current user from their JWT
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // ─── Server-side premium check ──────────────────────────────
    // Free users get ONLY the count + opaque placeholder cards —
    // names, avatars, signs, etc. NEVER leave the function for free
    // accounts. (Previously we returned full data and only CSS-blurred
    // it client-side, which leaked private profile data via DevTools.)
    const DEMO_PRO_EMAILS = new Set([
      "demo@stellara.app",
      "chef.tinisha@gmail.com",
      "runitupnisha@gmail.com",
    ]);
    let isPremium = false;
    if (user.email && DEMO_PRO_EMAILS.has(user.email.toLowerCase())) {
      isPremium = true;
    }
    if (!isPremium) {
      const { data: adminRow } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (adminRow) isPremium = true;
    }
    if (!isPremium) {
      const { data: iapActive } = await adminClient.rpc("has_active_iap", { _user_id: user.id });
      if (iapActive === true) isPremium = true;
    }
    if (!isPremium) {
      const { data: profileBonus } = await adminClient
        .from("profiles")
        .select("bonus_pro_until")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profileBonus?.bonus_pro_until && new Date(profileBonus.bonus_pro_until as string) > new Date()) {
        isPremium = true;
      }
    }

    // Get users who liked/super_liked the current user
    const { data: likers, error: swipeError } = await adminClient
      .from('swipes')
      .select('user_id, action, created_at')
      .eq('target_user_id', user.id)
      .in('action', ['like', 'super_like'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (swipeError) {
      throw swipeError;
    }

    if (!likers || likers.length === 0) {
      return new Response(JSON.stringify({ likers: [], count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check which ones the current user has already swiped on (already matched or passed)
    const likerIds = likers.map(l => l.user_id);

    const { data: mySwipes } = await adminClient
      .from('swipes')
      .select('target_user_id')
      .eq('user_id', user.id)
      .in('target_user_id', likerIds);

    const alreadySwiped = new Set((mySwipes || []).map(s => s.target_user_id));

    // Filter to only unswiped likers
    const unswipedLikerIds = likerIds.filter(id => !alreadySwiped.has(id));

    if (unswipedLikerIds.length === 0) {
      return new Response(JSON.stringify({ likers: [], count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isPremium) {
      // Return opaque placeholder cards — count + action only.
      const result = likers
        .filter(l => !alreadySwiped.has(l.user_id))
        .map((l, i) => ({
          user_id: `obscured-${i}`,
          display_name: null,
          avatar_url: null,
          sun_sign: null,
          human_design_type: null,
          life_path_number: null,
          action: l.action,
          liked_at: l.created_at,
        }));
      return new Response(JSON.stringify({ likers: result, count: result.length, premium: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Premium → full data
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('user_id, display_name, avatar_url, sun_sign, human_design_type, life_path_number')
      .in('user_id', unswipedLikerIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    const result = likers
      .filter(l => !alreadySwiped.has(l.user_id) && profileMap.has(l.user_id))
      .map(l => {
        const profile = profileMap.get(l.user_id)!;
        return {
          user_id: profile.user_id,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          sun_sign: profile.sun_sign,
          human_design_type: profile.human_design_type,
          life_path_number: profile.life_path_number,
          action: l.action,
          liked_at: l.created_at,
        };
      });

    return new Response(JSON.stringify({ likers: result, count: result.length, premium: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
