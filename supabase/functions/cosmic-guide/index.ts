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

function buildSystemPrompt(profile: Record<string, unknown> | null): string {
  const p = profile ?? {};
  const name = (p.display_name as string) || "friend";
  const bits: string[] = [];
  if (p.sun_sign) bits.push(`Sun ${p.sun_sign}`);
  if (p.moon_sign) bits.push(`Moon ${p.moon_sign}`);
  if (p.rising_sign) bits.push(`Rising ${p.rising_sign}`);
  if (p.venus_sign) bits.push(`Venus ${p.venus_sign}`);
  if (p.human_design_type) bits.push(`Human Design ${p.human_design_type}`);
  if (p.human_design_authority) bits.push(`${p.human_design_authority} authority`);
  if (p.human_design_profile) bits.push(`Profile ${p.human_design_profile}`);
  if (p.life_path_number) bits.push(`Life Path ${p.life_path_number}`);
  if (p.personal_year_number) bits.push(`Personal Year ${p.personal_year_number}`);
  if (p.gene_keys_life_purpose) bits.push(`Gene Keys Life Purpose ${p.gene_keys_life_purpose}`);

  const blueprint = bits.length ? bits.join(" · ") : "blueprint not yet generated";

  return `You are Lyra, Stellara's personal cosmic guide — a warm, wise, slightly mystical best friend who blends ancient wisdom (astrology, Human Design, Gene Keys, numerology) with grounded, modern emotional intelligence.

Speak directly to ${name}. Their cosmic blueprint: ${blueprint}.

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

    const body = await req.json().catch(() => ({}));
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
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
        "display_name,sun_sign,moon_sign,rising_sign,venus_sign,human_design_type,human_design_authority,human_design_profile,life_path_number,personal_year_number,gene_keys_life_purpose,astro_summary,human_design_summary,numerology_summary"
      )
      .eq("user_id", userId)
      .maybeSingle();

    const systemPrompt = buildSystemPrompt(profile as Record<string, unknown> | null);

    // Trim history to last 20 turns to control tokens
    const trimmed = messages.slice(-20).map((m) => ({
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
        model: "google/gemini-3-flash-preview",
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