import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyBlueprint from "./tools/get-my-blueprint";
import getTodayBriefing from "./tools/get-today-briefing";
import listShadowJournal from "./tools/list-shadow-journal";
import createShadowJournal from "./tools/create-shadow-journal";
import listMoonJournal from "./tools/list-moon-journal";
import createMoonJournal from "./tools/create-moon-journal";

// Read the Supabase project ref at build time (Vite inlines this literal).
// The direct supabase.co issuer is required — the .lovable.cloud proxy URL
// won't match the discovery document that mcp-js fetches to verify tokens.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "stellara-mcp",
  title: "Stellara",
  version: "0.1.0",
  instructions:
    "Stellara is a cosmic self-discovery app (astrology, Human Design, numerology, journaling). Use `get_my_blueprint` to read the user's cosmic placements, `get_today_briefing` for today's guidance, and the shadow/moon journal tools to read or add reflections. All tools act as the signed-in Stellara user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getMyBlueprint,
    getTodayBriefing,
    listShadowJournal,
    createShadowJournal,
    listMoonJournal,
    createMoonJournal,
  ],
});