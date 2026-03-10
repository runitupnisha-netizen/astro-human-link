import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Get profiles for unswiped likers
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

    return new Response(JSON.stringify({ likers: result, count: result.length }), {
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
