import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${txt.slice(0, 200)}`);
  }
  const data = await resp.json();
  return (data?.choices?.[0]?.message?.content ?? "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const conversationId = String(body?.conversation_id ?? "");

    if (!conversationId) {
      return new Response(JSON.stringify({ error: "conversation_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    const { data: convo } = await admin
      .from("guide_conversations")
      .select("id,user_id,title,summary,is_active,seed_topic")
      .eq("id", conversationId)
      .maybeSingle();
    if (!convo || convo.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: title ===
    if (action === "title") {
      // First user message
      const { data: msgs } = await admin
        .from("guide_messages")
        .select("role,content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(4);
      const firstUser = (msgs ?? []).find((m) => m.role === "user");
      if (!firstUser) {
        return new Response(JSON.stringify({ title: convo.title }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const title = await callAI(
        "You title chat sessions. Return ONLY a 4-8 word title in title case. No quotes, no punctuation at the end. Capture the topic concretely.",
        `Topic of this session: ${firstUser.content.slice(0, 500)}`
      );
      const cleaned = title.replace(/^["'`]+|["'`.]+$/g, "").slice(0, 80);
      await admin
        .from("guide_conversations")
        .update({ title: cleaned })
        .eq("id", conversationId);
      return new Response(JSON.stringify({ title: cleaned }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: end (summarize + close + recompute recurring themes) ===
    if (action === "end") {
      const { data: msgs } = await admin
        .from("guide_messages")
        .select("role,content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      let summary = convo.summary ?? null;
      if (msgs && msgs.length >= 2) {
        const transcript = msgs
          .slice(-30)
          .map((m) => `${m.role === "user" ? "User" : "Lyra"}: ${m.content.slice(0, 600)}`)
          .join("\n");
        summary = await callAI(
          "Summarize this Lyra session in 2-3 sentences. Focus on what the user was exploring (themes, feelings, decisions), not Lyra's advice. Plain prose, no headers.",
          transcript
        );
        summary = summary.slice(0, 600);
      }

      await admin
        .from("guide_conversations")
        .update({
          summary,
          ended_at: new Date().toISOString(),
          is_active: false,
        })
        .eq("id", conversationId);

      // Recompute recurring_themes from last 5 ended-session summaries
      const { data: recent } = await admin
        .from("guide_conversations")
        .select("summary")
        .eq("user_id", userId)
        .not("summary", "is", null)
        .order("ended_at", { ascending: false })
        .limit(5);

      const summaries = (recent ?? [])
        .map((r) => r.summary)
        .filter((s): s is string => !!s);

      let themes: string | null = null;
      if (summaries.length >= 2) {
        themes = await callAI(
          "You identify recurring themes across multiple journal-style conversations. Return ONE or TWO short sentences (max 50 words total) describing what keeps coming up for this person. Plain prose. No headers, no lists.",
          summaries.map((s, i) => `Session ${i + 1}: ${s}`).join("\n\n")
        );
        themes = themes.slice(0, 400);
      } else if (summaries.length === 1) {
        themes = summaries[0].slice(0, 400);
      }

      if (themes !== null) {
        await admin
          .from("profiles")
          .update({ recurring_themes: themes })
          .eq("user_id", userId);
      }

      return new Response(JSON.stringify({ summary, themes }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("guide-session-finalize error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});