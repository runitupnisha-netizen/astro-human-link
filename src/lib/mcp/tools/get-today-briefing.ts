import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function client(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_today_briefing",
  title: "Get today's cosmic briefing",
  description:
    "Return the signed-in user's most recent daily cosmic briefing from Stellara: energy theme, focus, mood, affirmation, cosmic weather, lucky window, and journal prompt.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await client(ctx)
      .from("daily_briefings")
      .select("briefing_date,energy_theme,focus,mood,affirmation,cosmic_weather,lucky_window,journal_prompt")
      .eq("user_id", ctx.getUserId())
      .order("briefing_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "No briefing yet — open Stellara today to generate one." }] };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { briefing: data },
    };
  },
});