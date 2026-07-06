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
  name: "create_shadow_journal_entry",
  title: "Create a shadow journal entry",
  description:
    "Save a new shadow journal entry (prompt + reflection) for the signed-in user in Stellara.",
  inputSchema: {
    prompt: z.string().trim().min(1).describe("The shadow work prompt being reflected on."),
    entry: z.string().trim().min(1).describe("The user's written reflection."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  needsApproval: true,
  handler: async ({ prompt, entry }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await client(ctx)
      .from("shadow_journal_entries")
      .insert({ user_id: ctx.getUserId(), prompt, entry })
      .select("id,prompt,entry,created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Saved shadow entry ${data.id}` }],
      structuredContent: { entry: data },
    };
  },
});