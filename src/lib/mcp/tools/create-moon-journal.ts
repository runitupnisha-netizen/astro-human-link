import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function client(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "create_moon_journal_entry",
  title: "Create a moon journal entry",
  description:
    "Save a new moon journal entry (moon phase, entry type, and content) for the signed-in Stellara user.",
  inputSchema: {
    phase: z
      .string()
      .trim()
      .min(1)
      .describe("Moon phase, e.g. 'New Moon', 'Waxing Crescent', 'Full Moon'."),
    entry_type: z
      .string()
      .trim()
      .min(1)
      .describe("Type of entry, e.g. 'intention', 'release', 'gratitude', 'reflection'."),
    content: z.string().trim().min(1).describe("The entry content."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ phase, entry_type, content }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await client(ctx)
      .from("moon_journal_entries")
      .insert({ user_id: ctx.getUserId(), phase, entry_type, content })
      .select("id,phase,entry_type,content,created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Saved moon entry ${data.id}` }],
      structuredContent: { entry: data },
    };
  },
});