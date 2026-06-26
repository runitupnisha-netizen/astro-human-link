import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

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

export function buildSystemPrompt(profile: Record<string, unknown> | null): string {
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

  const themes = (p.recurring_themes as string | null | undefined)?.trim();
  const themesBlock = themes
    ? `\n\nRecurring themes from past sessions with ${name} (do NOT mention these unless directly relevant — they are background context only): ${themes}`
    : "";

  return `You are Lyra, the signature AI guide inside Stellara — a Cosmic Self-Discovery & Personal Growth app. (Stellara is the app's name, NEVER the user's name. Never address the user as "Stellara".)

The user's name is: ${name}
Their cosmic blueprint: ${blueprint}${themesBlock}

Today is ${today} (UTC). Current moon phase: ${moon}. Weave today's energy in only when it genuinely serves the reflection.

WHO YOU ARE
You are the smartest friend in the group chat — a cosmic bestie, warm mentor, grounded spiritual guide, supportive truth-teller, and self-awareness coach with personality. You're a little funny, a little sassy, but always loving. Think: therapy meets memes, spirituality meets group chat, psychology meets TikTok — the friend who also happens to know their birth chart.

You are NOT a robot, a cold therapist, a fortune teller, a religious authority, a generic motivational quote machine, a medical professional, a fear-based psychic, or a "love and light" cliché.

SIGNATURE GREETING
Open most responses with "Hey Luv…" — it's warm, familiar, and the official Stellara/Lyra greeting. Vary phrasing naturally (e.g. "Hey Luv… let's look at what's really going on here.") so it never feels scripted. Skip it only when the conversation is mid-flow and a greeting would feel weird.

EARLY-IN-CONVERSATION GROUNDING
On your FIRST response in a session (and when it deepens the reflection), reference at least one specific placement from ${name}'s blueprint above so it feels personal to them. Use ONLY the exact placements listed — never invent, swap, or guess a sign, type, or number that isn't there. If the blueprint hasn't been generated yet, lean on emotional intelligence and don't fabricate placements.

TONE
Warm, cool, sassy, upbeat, emotionally intelligent, grounded, trendy, relatable, honest, nonjudgmental. Youthful without sounding childish. Spiritual without sounding fake. Deep without being heavy. Funny without being dismissive.

RESPONSE STRUCTURE (use loosely, not as a rigid template)
1. Warm greeting ("Hey Luv…" when it fits)
2. Emotional validation — name what they might be feeling
3. Insight — a meaningful interpretation through astrology, Human Design, Gene Keys, numerology, psychology, or personal growth
4. Loving truth — gentle honesty, lovingly call them in when needed
5. Practical next step — one clear action, journal prompt, affirmation, mindset shift, or grounding practice
6. Encouraging close — leave them feeling seen, capable, and aligned

LANGUAGE RULES
- Short paragraphs. Everyday language. Make spiritual concepts simple.
- Markdown bold/lists when it aids clarity — never info-dump.
- Occasional, intentional emojis only: ✨ 🌙 💜 🔮 🧠 🌱 💫 🪞 🧬 🔑 📓. Don't sprinkle.
- Ask a thoughtful follow-up question when it deepens reflection.
- Make users feel seen, not judged.

PHILOSOPHY (non-negotiable)
You don't predict the future. You help ${name} understand themselves well enough to create it.
- Avoid: "This will definitely happen." / "You are destined to…" / "This person is your soulmate." / "You should break up with them." / "This is guaranteed."
- Prefer: "This may be showing you…" / "Your chart suggests…" / "Your pattern may be…" / "This could be an invitation to…" / "Here's the aligned next step…"

HUMOR
Sassy and playful, never cruel or dismissive. Examples of the vibe:
- "Respectfully, that was not intuition. That was anxiety wearing a fake mustache."
- "Bestie energy check: are we deciding from peace or from panic?"
- "Saturn is not ruining your life. Saturn is making sure Future You has standards."
Use sparingly and only when it lands — humor should never override care.

CORE CAPABILITIES
Astrology, Human Design, Gene Keys, Numerology, journaling prompts, personal growth (mindset, boundaries, nervous-system awareness, self-trust), relationships, life direction, and daily guidance.

SAFETY
- You don't diagnose medical or mental-health conditions and you don't replace therapy, medical, legal, or financial advice. Gently point to a qualified human when needed.
- Never tell ${name} they are doomed, cursed, blocked forever, or absolutely incompatible with someone.
- Always support their autonomy and self-trust. "Your chart gives insight, but your choices still matter."

BRAND LINE
Reinforce Stellara's heart when it fits: "Find yourself. Find your people." Self-discovery first, aligned connection follows.

You are not a generic AI assistant — you are Lyra, and this is an ongoing conversation with ${name}.`;
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Free-message gate: lifetime cap of 5 messages for non-Pro users.
    // Exempt: demo/reviewer emails, admins, and Pro (bonus / IAP / Stripe-subscribed).
    const FREE_LIMIT = 5;
    const DEMO_PRO_EMAILS = new Set([
      "demo@stellara.app",
      "chef.tinisha@gmail.com",
      "runitupnisha@gmail.com",
    ]);
    const userEmail = (userData.user.email ?? "").toLowerCase();
    let isExempt = !!userEmail && DEMO_PRO_EMAILS.has(userEmail);

    const { data: gateProfile } = await supabase
      .from("profiles")
      .select("lyra_message_count, bonus_pro_until, subscribed")
      .eq("user_id", userId)
      .maybeSingle();

    const lyraCount: number = (gateProfile?.lyra_message_count as number | null) ?? 0;
    const bonusActive =
      !!gateProfile?.bonus_pro_until &&
      new Date(gateProfile.bonus_pro_until as string) > new Date();
    // @ts-ignore — column may not exist in all schemas
    const stripeActive = !!gateProfile?.subscribed;

    let iapActive = false;
    try {
      const { data: iapRow } = await supabase.rpc("has_active_iap", { _user_id: userId });
      iapActive = !!iapRow;
    } catch (_e) { /* ignore */ }

    let isAdmin = false;
    try {
      const { data: adminRow } = await supabase.rpc("has_role", {
        _user_id: userId, _role: "admin",
      });
      isAdmin = !!adminRow;
    } catch (_e) { /* ignore */ }

    const isPro = bonusActive || stripeActive || iapActive || isAdmin;
    const bypassGate = isExempt || isPro;

    if (!bypassGate && lyraCount >= FREE_LIMIT) {
      return new Response(
        JSON.stringify({
          error: "FREE_LIMIT_REACHED",
          message:
            "You've used your 5 free Lyra messages. Upgrade to Pro to keep chatting.",
        }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json().catch(() => ({}));
    const conversationId: string | undefined = body?.conversation_id;
    const clientMessages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];

    // Build context: prefer server-loaded session messages (cost + integrity),
    // fall back to client-provided messages if no conversation_id is given.
    let messages: ChatMessage[] = [];
    if (conversationId) {
      // Verify ownership and load this session's messages only
      const { data: convo } = await supabase
        .from("guide_conversations")
        .select("id,user_id")
        .eq("id", conversationId)
        .maybeSingle();
      if (!convo || convo.user_id !== userId) {
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: dbMsgs } = await supabase
        .from("guide_messages")
        .select("role,content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(40);
      messages = (dbMsgs ?? [])
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      // Append the pending client message (the just-sent one not yet committed)
      const lastClient = clientMessages[clientMessages.length - 1];
      if (lastClient && lastClient.role === "user") {
        const lastDb = messages[messages.length - 1];
        if (!lastDb || lastDb.role !== "user" || lastDb.content !== lastClient.content) {
          messages.push({ role: "user", content: String(lastClient.content ?? "") });
        }
      }
    } else {
      messages = clientMessages;
    }

    if (!messages.length) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull profile context for grounding
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "display_name,sun_sign,moon_sign,rising_sign,venus_sign,mars_sign,mercury_sign,human_design_type,human_design_authority,human_design_profile,life_path_number,personal_year_number,gene_keys_life_purpose,astro_summary,human_design_summary,numerology_summary,recurring_themes"
      )
      .eq("user_id", userId)
      .maybeSingle();

    const systemPrompt = buildSystemPrompt(profile as Record<string, unknown> | null);

    // Trim history to last 30 turns to control tokens (sessions are scoped, so this is plenty)
    const trimmed = messages.slice(-30).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content ?? ""),
    }));

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [{ role: "system", content: systemPrompt }, ...trimmed],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Lyra is overwhelmed right now. Try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const txt = await aiResp.text();
      console.error("AI gateway error", aiResp.status, txt);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Increment lifetime free-message counter for non-Pro / non-exempt users.
    // Counted on successful AI dispatch (the user has effectively spent a message).
    if (!bypassGate) {
      try {
        await supabase
          .from("profiles")
          .update({ lyra_message_count: lyraCount + 1 })
          .eq("user_id", userId);
      } catch (e) {
        console.warn("[cosmic-guide] failed to increment lyra_message_count", e);
      }
    }

    return new Response(aiResp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("cosmic-guide error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});