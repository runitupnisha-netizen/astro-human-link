import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_EMAIL = "demo@stellara.app";
// Password is loaded from the DEMO_ACCOUNT_PASSWORD secret. Never hardcode it —
// the demo account has permanent Pro access and must not be loginable from source.
const DEMO_PASSWORD = Deno.env.get("DEMO_ACCOUNT_PASSWORD") ?? "";

// Diverse fake match profiles
const FAKE_PROFILES = [
  { display_name: "Aurora", username: "aurora_skies", gender: "Woman", sun_sign: "Taurus", moon_sign: "Pisces", rising_sign: "Cancer", human_design_type: "Generator", birth_date: "1992-05-12", birth_place: "Brooklyn, NY", current_city: "Brooklyn, NY", about_me: "Sunset chaser, vinyl collector, soft-hearted Taurus." },
  { display_name: "Kai", username: "kai_tides", gender: "Man", sun_sign: "Scorpio", moon_sign: "Leo", rising_sign: "Sagittarius", human_design_type: "Manifestor", birth_date: "1988-11-04", birth_place: "Honolulu, HI", current_city: "Los Angeles, CA", about_me: "Surfer, builder, deep talks at 2am." },
  { display_name: "Sage", username: "sage_moon", gender: "Non-binary", sun_sign: "Pisces", moon_sign: "Virgo", rising_sign: "Aquarius", human_design_type: "Projector", birth_date: "1994-03-08", birth_place: "Portland, OR", current_city: "Portland, OR", about_me: "Tarot, tea, and tender truths." },
  { display_name: "Nova", username: "nova_stardust", gender: "Woman", sun_sign: "Leo", moon_sign: "Gemini", rising_sign: "Libra", human_design_type: "Manifesting Generator", birth_date: "1991-08-02", birth_place: "Austin, TX", current_city: "Austin, TX", about_me: "Stage lights, stargazing, sourdough starter." },
  { display_name: "Orion", username: "orion_wild", gender: "Man", sun_sign: "Sagittarius", moon_sign: "Aquarius", rising_sign: "Aries", human_design_type: "Generator", birth_date: "1989-12-14", birth_place: "Denver, CO", current_city: "Denver, CO", about_me: "Mountains, mezcal, and mid-week missions." },
  { display_name: "Luna", username: "luna_velvet", gender: "Woman", sun_sign: "Cancer", moon_sign: "Scorpio", rising_sign: "Pisces", human_design_type: "Reflector", birth_date: "1993-07-01", birth_place: "Brooklyn, NY", current_city: "Los Angeles, CA", about_me: "Witchy, warm, watercolor mornings." },
  { display_name: "River", username: "river_clay", gender: "Man", sun_sign: "Aquarius", moon_sign: "Taurus", rising_sign: "Virgo", human_design_type: "Projector", birth_date: "1990-02-09", birth_place: "Seattle, WA", current_city: "Seattle, WA", about_me: "Architect by day, jazz pianist by night." },
  { display_name: "Celeste", username: "celeste_glow", gender: "Woman", sun_sign: "Gemini", moon_sign: "Aries", rising_sign: "Leo", human_design_type: "Generator", birth_date: "1992-06-21", birth_place: "Miami, FL", current_city: "Los Angeles, CA", about_me: "Bilingual, brave, big-laugh energy." },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Simple shared-secret guard so this can't be triggered by random clients
  const provided = req.headers.get("x-seed-secret");
  const expected = Deno.env.get("DEMO_SEED_SECRET");
  if (!expected) {
    return new Response(JSON.stringify({ error: "Demo seeding not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!provided || provided !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!DEMO_PASSWORD || DEMO_PASSWORD.length < 12) {
    return new Response(JSON.stringify({
      error: "DEMO_ACCOUNT_PASSWORD secret is not configured (must be >=12 chars).",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const log: string[] = [];

  try {
    // 1) Create or fetch demo auth user
    let demoUserId: string | null = null;
    const { data: existing } = await admin.auth.admin.listUsers();
    const found = existing.users.find((u) => u.email?.toLowerCase() === DEMO_EMAIL);
    if (found) {
      demoUserId = found.id;
      log.push(`Demo user already exists: ${demoUserId}`);
      // Reset password just in case
      await admin.auth.admin.updateUserById(demoUserId, {
        password: DEMO_PASSWORD, email_confirm: true,
      });
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: "Stellara Demo" },
      });
      if (error) throw error;
      demoUserId = created.user!.id;
      log.push(`Created demo user: ${demoUserId}`);
    }

    // 2) Upsert demo profile.
    // Birth: Jan 15 1990, 10:00 local (PST, UTC−8) in Los Angeles.
    // Verified placements (Astro-Seek + astronomy-engine, locked by
    // ephemeris-regression.test.ts): Sun Capricorn, Moon Virgo, Rising Pisces,
    // Mercury Capricorn, Venus Aquarius, Mars Sagittarius.
    const demoProfile = {
      user_id: demoUserId,
      display_name: "Stellara Demo",
      username: "stellara_demo",
      birth_date: "1990-01-15",
      birth_time: "10:00:00",
      birth_place: "Los Angeles, CA, USA",
      birth_latitude: 34.0522,
      birth_longitude: -118.2437,
      current_city: "Los Angeles, CA",
      current_latitude: 34.0522,
      current_longitude: -118.2437,
      sun_sign: "Capricorn",
      moon_sign: "Virgo",
      rising_sign: "Pisces",
      venus_sign: "Aquarius",
      mars_sign: "Sagittarius",
      mercury_sign: "Capricorn",
      human_design_type: "Generator",
      human_design_strategy: "To respond",
      human_design_authority: "Sacral",
      human_design_profile: "3/5 Martyr / Heretic",
      human_design_summary: "Generators thrive by responding to life with sustained sacral energy.",
      life_path_number: 8,
      birthday_number: 6,
      personal_year_number: 1,
      numerology_summary: "Life Path 8: building lasting structures of love and legacy.",
      astro_summary: "A Capricorn Sun gives you grounded ambition; Virgo Moon brings devoted, precise emotion; Pisces Rising softens your edges with quiet, dreamy grace.",
      gender: "Woman",
      preferred_genders: ["Man", "Woman", "Non-binary"],
      age_min: 24,
      age_max: 45,
      max_distance_km: 100,
      relationship_goal: "Long-term partnership",
      about_me: "Reviewer demo account — explore matches, chat, journals, and Pro features freely.",
      bio_prompt_1: "What I'm looking for",
      bio_prompt_1_answer: "Someone who feels like home and adventure at once.",
      bio_prompt_2: "My ideal Sunday",
      bio_prompt_2_answer: "Slow coffee, hike, vinyl, dinner cooked together.",
      bio_prompt_3: "Green flag",
      bio_prompt_3_answer: "You text back. You mean what you say.",
      interests: ["astrology", "hiking", "vinyl", "cooking", "yoga", "books"],
      compatibility_tags: ["Deep Thinker", "Romantic", "Grounded", "Creative"],
      onboarding_complete: true,
      is_paused: false,
      is_incognito: false,
      preferred_language: "English",
      social_energy: 7,
      // Demo gets 1 year of Pro access via the bonus_pro_until window
      bonus_pro_until: new Date(Date.now() + 365 * 86400000).toISOString(),
      // Set Daily Ritual to "completed yesterday" so the ritual is
      // available (not already done today) for App Store reviewers.
      daily_ritual_last_completed: new Date(Date.now() - 86400000)
        .toISOString()
        .slice(0, 10),
    };
    const { error: pErr } = await admin
      .from("profiles")
      .upsert(demoProfile, { onConflict: "user_id" });
    if (pErr) throw pErr;
    log.push("Upserted demo profile");

    // 3) Create 8 fake match profiles (deterministic UUIDs from email so re-runs are idempotent)
    const fakeUserIds: string[] = [];
    for (let i = 0; i < FAKE_PROFILES.length; i++) {
      const fp = FAKE_PROFILES[i];
      const fakeEmail = `demo-match-${i + 1}@stellara.app`;
      let uid: string | null = null;
      const exist = existing.users.find((u) => u.email?.toLowerCase() === fakeEmail);
      if (exist) {
        uid = exist.id;
      } else {
        const { data: c, error: e } = await admin.auth.admin.createUser({
          email: fakeEmail,
          password: crypto.randomUUID() + "Aa1!",
          email_confirm: true,
          user_metadata: { full_name: fp.display_name },
        });
        if (e) throw e;
        uid = c.user!.id;
      }
      fakeUserIds.push(uid!);

      await admin.from("profiles").upsert({
        user_id: uid,
        display_name: fp.display_name,
        username: fp.username,
        gender: fp.gender,
        sun_sign: fp.sun_sign,
        moon_sign: fp.moon_sign,
        rising_sign: fp.rising_sign,
        human_design_type: fp.human_design_type,
        birth_date: fp.birth_date,
        birth_place: fp.birth_place,
        current_city: fp.current_city,
        about_me: fp.about_me,
        onboarding_complete: true,
        is_paused: false,
        is_incognito: false,
        preferred_genders: ["Woman", "Man", "Non-binary"],
        compatibility_tags: ["Romantic", "Adventurous", "Deep Thinker"],
        astro_summary: `${fp.sun_sign} Sun · ${fp.moon_sign} Moon · ${fp.rising_sign} Rising`,
        interests: ["music", "travel", "astrology"],
      }, { onConflict: "user_id" });
    }
    log.push(`Upserted ${fakeUserIds.length} fake match profiles`);

    // 4) Create 3 mutual matches (with first 3 fake users)
    // matches table has unique (user_a, user_b) ordered alphabetically
    const matchIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const otherId = fakeUserIds[i];
      const userA = demoUserId! < otherId ? demoUserId! : otherId;
      const userB = demoUserId! < otherId ? otherId : demoUserId!;

      // Insert swipes both directions (idempotent via where)
      for (const swipe of [
        { user_id: demoUserId!, target_user_id: otherId, action: "like" },
        { user_id: otherId, target_user_id: demoUserId!, action: "like" },
      ]) {
        const { data: ex } = await admin
          .from("swipes")
          .select("id")
          .eq("user_id", swipe.user_id)
          .eq("target_user_id", swipe.target_user_id)
          .maybeSingle();
        if (!ex) await admin.from("swipes").insert(swipe);
      }

      // Find existing match or create
      const { data: exMatch } = await admin
        .from("matches")
        .select("id")
        .eq("user_a", userA)
        .eq("user_b", userB)
        .maybeSingle();
      if (exMatch) {
        matchIds.push(exMatch.id);
      } else {
        const { data: m, error: mErr } = await admin
          .from("matches")
          .insert({
            user_a: userA,
            user_b: userB,
            compatibility_score: 80 + i * 5,
            compatibility_summary: "Strong elemental and energetic resonance.",
          })
          .select("id")
          .single();
        if (mErr) throw mErr;
        matchIds.push(m.id);
      }
    }
    log.push(`Ensured ${matchIds.length} mutual matches`);

    // 5) Two message threads with 3-4 messages each (matches 0 and 1)
    const thread1 = [
      { match_id: matchIds[0], sender_id: fakeUserIds[0], content: "Hey! Your chart is wild — Capricorn Sun with Aries Moon? Power combo." },
      { match_id: matchIds[0], sender_id: demoUserId!, content: "Ha thank you! Yours is gorgeous too. Pisces Moons get me." },
      { match_id: matchIds[0], sender_id: fakeUserIds[0], content: "What does an ideal first date look like for you?" },
      { match_id: matchIds[0], sender_id: demoUserId!, content: "Walk + great coffee + a question I've never been asked. ☕️" },
    ];
    const thread2 = [
      { match_id: matchIds[1], sender_id: demoUserId!, content: "Okay Manifestor energy — I respect it. What are you initiating right now?" },
      { match_id: matchIds[1], sender_id: fakeUserIds[1], content: "Building a small surf school. You?" },
      { match_id: matchIds[1], sender_id: demoUserId!, content: "Launching a project I've been sitting on for years. Capricorn slow burn." },
    ];
    for (const m of [...thread1, ...thread2]) {
      const { data: exM } = await admin
        .from("messages")
        .select("id")
        .eq("match_id", m.match_id)
        .eq("sender_id", m.sender_id)
        .eq("content", m.content)
        .maybeSingle();
      if (!exM) await admin.from("messages").insert(m);
    }
    log.push("Seeded 2 message threads");

    // 6) Three shadow journal entries (different dates)
    const journalEntries = [
      { prompt: "What pattern keeps showing up in my relationships?", entry: "I attract people who need rescuing. I want to learn to receive instead.", prompt_index: 0, created_at: new Date(Date.now() - 7 * 86400000).toISOString() },
      { prompt: "Where am I performing instead of being?", entry: "At work — I default to 'capable.' I want to let softness lead more often.", prompt_index: 1, created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
      { prompt: "What truth am I avoiding?", entry: "That I am ready for partnership and have been for a while.", prompt_index: 2, created_at: new Date(Date.now() - 1 * 86400000).toISOString() },
    ];
    for (const j of journalEntries) {
      const { data: ex } = await admin
        .from("shadow_journal_entries")
        .select("id")
        .eq("user_id", demoUserId!)
        .eq("prompt", j.prompt)
        .maybeSingle();
      if (!ex) {
        await admin.from("shadow_journal_entries").insert({
          user_id: demoUserId!,
          prompt: j.prompt,
          entry: j.entry,
          prompt_index: j.prompt_index,
          created_at: j.created_at,
        });
      }
    }
    log.push("Seeded 3 journal entries");

    // 7) One completed moon intention
    const { data: exMoon } = await admin
      .from("moon_journal_entries")
      .select("id")
      .eq("user_id", demoUserId!)
      .eq("entry_type", "intention")
      .maybeSingle();
    if (!exMoon) {
      await admin.from("moon_journal_entries").insert({
        user_id: demoUserId!,
        entry_type: "intention",
        phase: "Waxing Gibbous",
        content: "I am calling in a partnership built on honesty, devotion, and shared adventure.",
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      });
    }
    log.push("Seeded moon intention");

    // 8) Daily ritual: emit a daily briefing for yesterday so the Ritual is fresh today.
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const { data: exBrief } = await admin
      .from("daily_briefings")
      .select("id")
      .eq("user_id", demoUserId!)
      .eq("briefing_date", yesterday)
      .maybeSingle();
    if (!exBrief) {
      await admin.from("daily_briefings").insert({
        user_id: demoUserId!,
        briefing_date: yesterday,
        energy_theme: "Grounded ambition",
        focus: "Move slow, build well",
        mood: "Focused",
        affirmation: "I trust the timeline of my becoming.",
        journal_prompt: "What does steady devotion look like today?",
        cosmic_weather: "Capricorn Sun · Aries Moon · Libra Rising in harmony",
        lucky_window: "10:00–12:00 AM local time",
      });
    }
    log.push(`Seeded yesterday's briefing (${yesterday})`);

    return new Response(JSON.stringify({
      ok: true,
      demo_user_id: demoUserId,
      email: DEMO_EMAIL,
      log,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message, log }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});