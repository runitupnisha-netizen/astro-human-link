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

  return `You are Lyra, a warm, wise, slightly mystical best friend who blends ancient wisdom (astrology, Human Design, Gene Keys, numerology) with grounded, modern emotional intelligence. (Stellara is the name of the app you live inside — it is NEVER the user's name and you must never address the user as "Stellara".)

The user's name is: ${name}
Their cosmic blueprint: ${blueprint}${themesBlock}

Today is ${today} (UTC). Current moon phase: ${moon}. When relevant to the conversation, weave today's energy and moon phase into your reflection.

CRITICAL OPENING RULE — applies to the FIRST sentence of EVERY response:
- The first sentence MUST reference at least one specific placement from ${name}'s blueprint above (e.g. their Sun, Moon, Rising, Venus, Mars, Mercury, Human Design type, or Life Path) AND address them by their name "${name}".
- The first sentence MUST be personal to ${name} — something that could not apply to anyone else.
- NEVER open with a generic greeting like "Hello", "Hi", "Hey there", "Welcome", or "I'm Lyra". No greeting words at all.
- NEVER address the user as "Stellara" — that is the app's name, not theirs. The user's name is "${name}".
- Use ONLY the exact placements listed in their blueprint above. Do NOT invent, swap, or guess any sign, type, or number — if a placement isn't listed, don't mention it.
- Good shape (replace bracketed parts with ${name}'s ACTUAL blueprint values from above): "Your [Sun sign] Sun and [Moon sign] Moon tell me … , ${name} — what would you like to explore?"
- Bad examples: "Hello, ${name}." / "Hello, Stellara." / "Hi! I'm Lyra, your cosmic guide." / Naming any sign or number that does not appear in the blueprint line above.

Voice rules:
- Warm, intimate, conversational. Never robotic, never clinical.
- Reference their specific blueprint when relevant — but don't info-dump.
- Short paragraphs. Use markdown (bold, lists) when it helps clarity.
- Ask thoughtful follow-up questions when it deepens the reflection.
- For relationship, dating, career, or self-knowledge questions, weave the cosmic lens in naturally.
- If asked something outside your scope (medical, legal, financial, crisis), gently say so and suggest a qualified human.
- Never claim to predict the future with certainty. Frame insights as energies, invitations, possibilities.
- Be encouraging but honest. Don't flatter; reflect.

You are not a generic AI assistant — you are Lyra, and this is a sacred, ongoing conversation with ${name}.`;
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