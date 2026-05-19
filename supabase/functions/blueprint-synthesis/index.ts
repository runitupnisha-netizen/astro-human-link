import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// Sections that can be generated on demand and cached on the user's profile.
// `ttlHours` controls when the cache is stale and should auto-regenerate.
// Sections without a TTL persist until the user manually refreshes.
const SECTIONS: Record<
  string,
  { ttlHours?: number; prompt: (profile: Record<string, unknown>) => string }
> = {
  synthesis: {
    prompt: (p) => `Write a coherent 3-4 paragraph cross-science synthesis reading for ${p.display_name || "this person"} that weaves together ALL three sciences into ONE integrated story — not three separate readings stitched together. Cross-reference between systems (e.g. "Your ${p.sun_sign} Sun + ${p.human_design_type} type + Life Path ${p.life_path_number} together suggest…"). Speak directly to the user in second person. Open with a 1-sentence headline of the synthesis, then 3 paragraphs: who they are, the central tension/opportunity, and what to do with it this season. End with one grounded invitation. No bullet lists. Markdown allowed (bold for keywords). Avoid generic horoscope language — this must feel personal and could only be written for this exact chart.`,
  },
  planets: {
    prompt: (p) => `Walk ${p.display_name || "the user"} through their personal planets — Mercury (${p.mercury_sign || "compute it from their chart"}), Venus (${p.venus_sign || "compute it"}), Mars (${p.mars_sign || "compute it"}) — plus the social and outer planets (Jupiter, Saturn, Uranus, Neptune, Pluto). For each: 2-3 sentences in plain English on what that placement says about how they think/love/fight/grow. Use markdown with bold planet names as section headers. Coherent, not a list of definitions.`,
  },
  houses: {
    prompt: (p) => `Walk through the 12 astrological houses for ${p.display_name || "this person"}. For each house: name the life area, name what (if anything) sits there based on their Sun in ${p.sun_sign}, Moon in ${p.moon_sign}, Rising in ${p.rising_sign}, Mercury ${p.mercury_sign}, Venus ${p.venus_sign}, Mars ${p.mars_sign}, then 1-2 sentences on the headline for that area of their life. Bold house numbers. Acknowledge when a house is empty (it's ruled by another planet — still active).`,
  },
  aspects: {
    prompt: (p) => `Identify and interpret the 4-6 most important aspects in ${p.display_name || "this person"}'s natal chart given Sun ${p.sun_sign}, Moon ${p.moon_sign}, Rising ${p.rising_sign}, Mercury ${p.mercury_sign}, Venus ${p.venus_sign}, Mars ${p.mars_sign}. For each aspect: bold the aspect (e.g. "Venus square Saturn"), then 2-3 sentences in plain English on what that tension or harmony plays out as in real life. End with one paragraph synthesizing the dominant pattern across the aspects.`,
  },
  transits: {
    ttlHours: 24,
    prompt: (p) => `Given today is ${new Date().toUTCString()}, name the top 3 current planetary transits affecting ${p.display_name || "this person"}'s chart (Sun ${p.sun_sign}, Moon ${p.moon_sign}, Rising ${p.rising_sign}, Mercury ${p.mercury_sign}, Venus ${p.venus_sign}, Mars ${p.mars_sign}). For each transit: bold the transit, name which natal placement and house it's hitting, then 2-3 sentences on what's being activated and one concrete piece of advice for the next few days. End with one sentence about the dominant weather of the week.`,
  },
  centers: {
    prompt: (p) => `Walk through ${p.display_name || "the user"}'s 9 Human Design centers based on their type ${p.human_design_type} with ${p.human_design_authority} authority and profile ${p.human_design_profile}. For each of the 9 centers (Head, Ajna, Throat, G, Heart, Spleen, Solar Plexus, Sacral, Root): name it bold, say whether it's likely defined or undefined for their type, and 1-2 sentences on what that means in practice for them. Honest, not vague.`,
  },
  channels: {
    prompt: (p) => `Based on Human Design type ${p.human_design_type}, profile ${p.human_design_profile}, authority ${p.human_design_authority}, describe the 2-4 most likely active channels in this person's bodygraph and what each one signals in their life. Bold each channel name (e.g. "Channel of Initiation 25-51"), then 2-3 sentences on the gift it carries and how it shows up in daily life. End with a paragraph on the dominant theme across their channels.`,
  },
  incarnation_cross: {
    prompt: (p) => `Describe a plausible Incarnation Cross for ${p.display_name || "this person"} given Sun in ${p.sun_sign} and Human Design profile ${p.human_design_profile}, type ${p.human_design_type}. Bold the cross name. Three paragraphs: what they're here to embody, the conscious vs unconscious thread, and how this purpose shows up in their day-to-day choices.`,
  },
  profile_detail: {
    prompt: (p) => `Break down Human Design profile ${p.human_design_profile} for ${p.display_name || "the user"}. Bold each line number. Three paragraphs: (1) what their conscious personality line means, (2) what their unconscious design line means, and (3) the life theme that emerges when both run together. Be specific to ${p.human_design_type}.`,
  },
  expression: {
    prompt: (p) => `Compute and interpret the Expression / Destiny number for ${p.display_name || "the user"}. (If you can't compute precisely from a partial name, estimate based on their Life Path ${p.life_path_number} and explain it as a likely Expression archetype.) Bold the number. Three paragraphs: the talent set they arrived with, how it differs from their Life Path, and where it wants to be used in this lifetime.`,
  },
  soul_urge: {
    prompt: (p) => `Describe the likely Soul Urge / Heart's Desire number for ${p.display_name || "the user"} given Life Path ${p.life_path_number}, Personal Year ${p.personal_year_number}, and Birthday number ${p.birthday_number}. Bold the number. Three paragraphs: what their heart actually wants beneath conscious choices, where the gap between Soul Urge and outer life tends to show up, and one practice to bring them into alignment.`,
  },
  personality: {
    prompt: (p) => `Describe the likely Personality number for ${p.display_name || "the user"} given Life Path ${p.life_path_number}. Bold the number. Two paragraphs: the first impression their Personality number creates in others, and how that mask compares with who they are inside.`,
  },
  personal_year_detail: {
    ttlHours: 24,
    prompt: (p) => `${p.display_name || "The user"} is in Personal Year ${p.personal_year_number} (Life Path ${p.life_path_number}). Today is ${new Date().toUTCString()}. Write 3 paragraphs: (1) the theme of this Personal Year and what's being asked of them, (2) what their Personal Month is right now and the focus it sets, (3) one concrete invitation for the week. Bold the year, month, and day numbers as you reference them.`,
  },
  gates: {
    prompt: (p) => `Describe 3-5 of the most likely activated Gates in ${p.display_name || "the user"}'s Human Design bodygraph (type ${p.human_design_type}, profile ${p.human_design_profile}, Sun ${p.sun_sign}). For each gate: bold its number and name, then 2 sentences on the archetype it carries and how it shows up in their life. End with a paragraph naming the dominant theme across the active gates.`,
  },
};

function buildSystem(profile: Record<string, unknown>) {
  const bits: string[] = [];
  if (profile.sun_sign) bits.push(`Sun ${profile.sun_sign}`);
  if (profile.moon_sign) bits.push(`Moon ${profile.moon_sign}`);
  if (profile.rising_sign) bits.push(`Rising ${profile.rising_sign}`);
  if (profile.mercury_sign) bits.push(`Mercury ${profile.mercury_sign}`);
  if (profile.venus_sign) bits.push(`Venus ${profile.venus_sign}`);
  if (profile.mars_sign) bits.push(`Mars ${profile.mars_sign}`);
  if (profile.human_design_type) bits.push(`HD ${profile.human_design_type}`);
  if (profile.human_design_authority) bits.push(`${profile.human_design_authority} authority`);
  if (profile.human_design_profile) bits.push(`Profile ${profile.human_design_profile}`);
  if (profile.life_path_number) bits.push(`Life Path ${profile.life_path_number}`);
  if (profile.personal_year_number) bits.push(`Personal Year ${profile.personal_year_number}`);
  if (profile.birthday_number) bits.push(`Birthday ${profile.birthday_number}`);
  return `You are Lyra, a wise mystical-but-grounded guide writing a personalized Blueprint reading. The user's full blueprint: ${bits.join(" · ") || "incomplete"}. Voice: warm, intimate, conversational; speak in second person ("you"); use markdown sparingly (bold for keywords, no emojis, no bullet lists unless the section demands a walk-through). Never hedge with "this might mean" — speak with confident, grounded specificity. Avoid generic horoscope language. The reading must feel personal — like it could only be written for this exact chart.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
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
    const section = String(body?.section ?? "synthesis");
    const force = Boolean(body?.force_refresh);
    const tierHint = body?.tier === "free" ? "free" : "premium";

    const def = SECTIONS[section];
    if (!def) {
      return new Response(JSON.stringify({ error: "Unknown section" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache check (skip for free-tier synthesis teaser — that's generated each time deterministically client-side)
    if (!force && tierHint === "premium") {
      const { data: cached } = await supabase
        .from("blueprint_ai_cache")
        .select("content, generated_at, cached_until, model")
        .eq("user_id", userId)
        .eq("section_key", section)
        .maybeSingle();
      if (cached) {
        const fresh = !cached.cached_until || new Date(cached.cached_until).getTime() > Date.now();
        if (fresh) {
          return new Response(
            JSON.stringify({
              content: cached.content,
              generated_at: cached.generated_at,
              cached: true,
              model: cached.model,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "display_name,sun_sign,moon_sign,rising_sign,mercury_sign,venus_sign,mars_sign,human_design_type,human_design_authority,human_design_profile,life_path_number,personal_year_number,birthday_number,gene_keys_life_purpose",
      )
      .eq("user_id", userId)
      .maybeSingle();

    const profileSafe = (profile ?? {}) as Record<string, unknown>;
    const system = buildSystem(profileSafe);
    const userPrompt = def.prompt(profileSafe);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Lyra is overwhelmed — try again in a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI gateway error", aiResp.status, txt);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ai = await aiResp.json();
    const content: string = ai?.choices?.[0]?.message?.content ?? "";
    if (!content) {
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cached_until = def.ttlHours
      ? new Date(Date.now() + def.ttlHours * 60 * 60 * 1000).toISOString()
      : null;

    // Persist for premium users only — free tier shouldn't write cache.
    if (tierHint === "premium") {
      await supabase.from("blueprint_ai_cache").upsert(
        {
          user_id: userId,
          section_key: section,
          content,
          model: "google/gemini-2.5-flash",
          generated_at: new Date().toISOString(),
          cached_until,
        },
        { onConflict: "user_id,section_key" },
      );
    }

    return new Response(
      JSON.stringify({ content, generated_at: new Date().toISOString(), cached: false, model: "google/gemini-2.5-flash" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("blueprint-synthesis error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});