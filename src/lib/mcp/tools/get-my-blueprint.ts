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
  name: "get_my_blueprint",
  title: "Get my cosmic blueprint",
  description:
    "Return the signed-in Stellara user's cosmic blueprint: astrology placements (sun/moon/rising/venus/mars/mercury), Human Design (type/authority/profile), and numerology (life path, personal year).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await client(ctx)
      .from("profiles")
      .select(
        "display_name,sun_sign,moon_sign,rising_sign,venus_sign,mars_sign,mercury_sign,human_design_type,human_design_authority,human_design_profile,life_path_number,personal_year_number,gene_keys_life_purpose,astro_summary,human_design_summary,numerology_summary",
      )
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (!data) {
      return {
        content: [{ type: "text", text: "No blueprint found — complete onboarding in Stellara first." }],
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { blueprint: data },
    };
  },
});