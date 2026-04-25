import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// Inlined from supabase/functions/cosmic-guide/index.ts — kept identical so the
// admin probe surfaces the *exact* prompt the production Lyra endpoint uses.
const LUNAR_CYCLE = 29.530588853;
const KNOWN_NEW_MOON = new Date("2000-01-06T18:14:00Z").getTime();

function currentMoonPhase(): string {
  const days = (Date.now() - KNOWN_NEW_MOON) / (1000 * 60 * 60 * 24);
  const cycles = days / LUNAR_CYCLE;
  const age = (cycles - Math.floor(cycles)) * LUNAR_CYCLE;
  if (age < 1.84566) return "New Moon";
  if (age < 5.53699) return "Waxing Crescent";
  if (age < 9.22831) return "First Quarter";
  if (age < 12.91963) return "Waxing Gibbous";
  if (age < 16.61096) return "Full Moon";
  if (age < 20.30228) return "Waning Gibbous";
  if (age < 23.99361) return "Last Quarter";
  if (age < 27.68493) return "Waning Crescent";
  return "New Moon";
}

function buildSystemPrompt(profile: Record<string, unknown> | null): string {
  const p = profile ?? {};
  const name = (p.display_name as string) || "friend";
  const bits: string[] = [];
  if (p.sun_sign) bits.push(`Sun ${p.sun_sign}`);
  if (p.moon_sign) bits.push(`Moon ${p.moon_sign}`);
  if (p.rising_sign) bits.push(`Rising ${p.rising_sign}`);
  if (p.venus_sign) bits.push(`Venus ${p.venus_sign}`);
  if (p.mars_sign) bits.push(`Mars ${p.mars_sign}`);
  if (p.mercury_sign) bits.push(`Mercury ${p.mercury_sign}`);
  if (p.human_design_type) bits.push(`Human Design ${p.human_design_type}`);
  if (p.human_design_authority) bits.push(`${p.human_design_authority} authority`);
  if (p.human_design_profile) bits.push(`Profile ${p.human_design_profile}`);
  if (p.life_path_number) bits.push(`Life Path ${p.life_path_number}`);
  if (p.personal_year_number) bits.push(`Personal Year ${p.personal_year_number}`);
  if (p.gene_keys_life_purpose) bits.push(`Gene Keys Life Purpose ${p.gene_keys_life_purpose}`);

  const blueprint = bits.length ? bits.join(" · ") : "blueprint not yet generated";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const moon = currentMoonPhase();

  return `You are Lyra, Stellara's personal cosmic guide — a warm, wise, slightly mystical best friend who blends ancient wisdom (astrology, Human Design, Gene Keys, numerology) with grounded, modern emotional intelligence.\n\nSpeak directly to ${name}. Their cosmic blueprint: ${blueprint}.\n\nToday is ${today} (UTC). Current moon phase: ${moon}. When relevant to the conversation, weave today's energy and moon phase into your reflection.\n\nVoice rules:\n- Warm, intimate, conversational. Never robotic, never clinical.\n- Reference their specific blueprint when relevant — but don't info-dump.\n- Short paragraphs. Use markdown (bold, lists) when it helps clarity.\n- Ask thoughtful follow-up questions when it deepens the reflection.\n- For relationship, dating, career, or self-knowledge questions, weave the cosmic lens in naturally.\n- If asked something outside your scope (medical, legal, financial, crisis), gently say so and suggest a qualified human.\n- Never claim to predict the future with certainty. Frame insights as energies, invitations, possibilities.\n- Be encouraging but honest. Don't flatter; reflect.\n\nYou are not a generic AI assistant — you are Lyra, and this is a sacred, ongoing conversation with ${name}.`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const DEMO_EMAIL = "demo@stellara.app";

const PROFILE_FIELDS =
  "user_id,display_name,sun_sign,moon_sign,rising_sign,venus_sign,mars_sign,mercury_sign,human_design_type,human_design_authority,human_design_profile,life_path_number,personal_year_number,gene_keys_life_purpose,astro_summary,human_design_summary,numerology_summary";

function firstSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^[\s\S]*?[.!?](?=\s|$)/);
  return (match ? match[0] : trimmed.split("\n")[0]).trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller and check admin role.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    if (!question) {
      return new Response(JSON.stringify({ error: "question required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const matchWord = typeof body?.matchWord === "string" && body.matchWord.trim()
      ? body.matchWord.trim()
      : "Sagittarius";

    // Find demo user by email.
    const { data: demoList } = await admin.auth.admin.listUsers();
    const demoUser = demoList?.users.find(
      (u) => u.email?.toLowerCase() === DEMO_EMAIL,
    );
    if (!demoUser) {
      return new Response(
        JSON.stringify({ error: `Demo user (${DEMO_EMAIL}) not found. Run seed-demo-account first.` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: demoProfile } = await admin
      .from("profiles")
      .select(PROFILE_FIELDS)
      .eq("user_id", demoUser.id)
      .maybeSingle();

    const systemPrompt = buildSystemPrompt(
      demoProfile as Record<string, unknown> | null,
    );

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      return new Response(
        JSON.stringify({ error: "AI gateway error", status: aiResp.status, detail: txt.slice(0, 500) }),
        { status: aiResp.status === 429 || aiResp.status === 402 ? aiResp.status : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiJson = await aiResp.json();
    const content: string =
      aiJson?.choices?.[0]?.message?.content ?? "";
    const sentence = firstSentence(content);
    const containsMatch = new RegExp(`\\b${matchWord.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i").test(content);
    const sentenceContainsMatch = new RegExp(`\\b${matchWord.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i").test(sentence);

    return new Response(
      JSON.stringify({
        ok: true,
        demo_user_id: demoUser.id,
        demo_email: DEMO_EMAIL,
        question,
        match_word: matchWord,
        first_sentence: sentence,
        full_response: content,
        contains_match_word: containsMatch,
        first_sentence_contains_match_word: sentenceContainsMatch,
        profile_signs: {
          sun: (demoProfile as any)?.sun_sign ?? null,
          moon: (demoProfile as any)?.moon_sign ?? null,
          rising: (demoProfile as any)?.rising_sign ?? null,
          venus: (demoProfile as any)?.venus_sign ?? null,
          mars: (demoProfile as any)?.mars_sign ?? null,
          mercury: (demoProfile as any)?.mercury_sign ?? null,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("admin-lyra-probe error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});