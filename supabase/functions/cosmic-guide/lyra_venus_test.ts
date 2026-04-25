import {
  assert,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildSystemPrompt } from "./index.ts";

/**
 * Canonical Venus signs we may see in profiles. Used to detect whether Lyra's
 * answer references the user's *own* Venus rather than some other sign.
 */
const ALL_SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

const SAMPLE_PROFILE = {
  display_name: "Aria",
  sun_sign: "Aquarius",
  moon_sign: "Capricorn",
  rising_sign: "Gemini",
  venus_sign: "Pisces",
  mars_sign: "Sagittarius",
  mercury_sign: "Capricorn",
  human_design_type: "Generator",
  human_design_authority: "Sacral",
  life_path_number: 7,
};

// ---------------------------------------------------------------------------
// Pure prompt assertion — runs in every CI execution, no network required.
// ---------------------------------------------------------------------------
Deno.test("Lyra system prompt includes Venus placement", () => {
  const prompt = buildSystemPrompt(SAMPLE_PROFILE);
  assertStringIncludes(prompt, "Venus Pisces");
  // Also confirm the love-aware framing is present so future regressions
  // (e.g. removing the relationship guidance) get caught here.
  assertStringIncludes(prompt, "relationship");
});

Deno.test("Lyra prompt omits Venus cleanly when profile lacks it", () => {
  const prompt = buildSystemPrompt({
    display_name: "Aria",
    sun_sign: "Aquarius",
  });
  assert(
    !prompt.includes("Venus "),
    "Prompt should not fabricate a Venus placement when missing",
  );
});

// ---------------------------------------------------------------------------
// Live integration: Lyra must reference the user's actual Venus sign when
// asked a love question. Skipped automatically when LOVABLE_API_KEY is absent
// (e.g. local runs without the secret) so CI stays deterministic.
// ---------------------------------------------------------------------------
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

Deno.test({
  name: "Lyra references the user's Venus sign on love questions",
  ignore: !LOVABLE_API_KEY,
  fn: async () => {
    const systemPrompt = buildSystemPrompt(SAMPLE_PROFILE);
    const resp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          stream: false,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content:
                "What does my Venus placement say about how I love? " +
                "Please name my Venus sign explicitly in your answer.",
            },
          ],
        }),
      },
    );

    assert(resp.ok, `AI gateway returned ${resp.status}`);
    const json = await resp.json();
    const content: string =
      json?.choices?.[0]?.message?.content?.toString() ?? "";

    assert(content.length > 0, "Lyra returned an empty answer");

    // Must mention the user's actual Venus sign.
    assertStringIncludes(
      content,
      "Pisces",
      `Expected Lyra to reference the user's Venus (Pisces). Got: ${content}`,
    );

    // Must not anchor the love reading on a *different* sign.
    const otherSigns = ALL_SIGNS.filter((s) => s !== "Pisces");
    const wronglyAnchored = otherSigns.find((s) =>
      new RegExp(`Venus[^.]{0,40}\\b${s}\\b`, "i").test(content) ||
      new RegExp(`\\b${s}\\b[^.]{0,40}Venus`, "i").test(content)
    );
    assert(
      !wronglyAnchored,
      `Lyra anchored the Venus reading on the wrong sign (${wronglyAnchored}). ` +
        `Full answer: ${content}`,
    );
  },
});