import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getIdentifier } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ... keep existing code (haversine, scoring functions, etc)

// ═══════════════════════════════════════════════════════════════
// HAVERSINE DISTANCE (km)
// ═══════════════════════════════════════════════════════════════

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ═══════════════════════════════════════════════════════════════
// DETERMINISTIC SCIENCE — Same as analyze-compatibility
// ═══════════════════════════════════════════════════════════════

const signElements: Record<string, string> = {
  Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
  Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
  Gemini: "Air", Libra: "Air", Aquarius: "Air",
  Cancer: "Water", Scorpio: "Water", Pisces: "Water",
};

const signModalities: Record<string, string> = {
  Aries: "Cardinal", Cancer: "Cardinal", Libra: "Cardinal", Capricorn: "Cardinal",
  Taurus: "Fixed", Leo: "Fixed", Scorpio: "Fixed", Aquarius: "Fixed",
  Gemini: "Mutable", Virgo: "Mutable", Sagittarius: "Mutable", Pisces: "Mutable",
};

function cleanSignName(sign: string | null): string {
  if (!sign) return "";
  return sign.replace(/\s*\(.*\)\s*$/, "").trim();
}

function elementScore(e1: string, e2: string): number {
  if (e1 === e2) return 90;
  const compatible: Record<string, string> = { Fire: "Air", Air: "Fire", Earth: "Water", Water: "Earth" };
  if (compatible[e1] === e2) return 80;
  const square = (e1 === "Fire" && e2 === "Water") || (e1 === "Water" && e2 === "Fire") ||
                 (e1 === "Earth" && e2 === "Air") || (e1 === "Air" && e2 === "Earth");
  if (square) return 50;
  return 62;
}

function modalityScore(m1: string, m2: string): number {
  if (m1 === m2) return 70;
  if ((m1 === "Cardinal" && m2 === "Mutable") || (m1 === "Mutable" && m2 === "Cardinal")) return 85;
  return 65;
}

const hdPairingScores: Record<string, Record<string, number>> = {
  Generator: { Generator: 75, "Manifesting Generator": 82, Manifestor: 70, Projector: 85, Reflector: 65 },
  "Manifesting Generator": { "Manifesting Generator": 72, Manifestor: 75, Projector: 80, Reflector: 68 },
  Manifestor: { Manifestor: 60, Projector: 82, Reflector: 70 },
  Projector: { Projector: 72, Reflector: 75 },
  Reflector: { Reflector: 65 },
};

function getHDScore(type1: string, type2: string): number {
  return hdPairingScores[type1]?.[type2] ?? hdPairingScores[type2]?.[type1] ?? 65;
}

function lifePathScore(lp1: number | null, lp2: number | null): number {
  if (!lp1 || !lp2) return 60;
  if (lp1 === lp2) return 85;
  const highCompat: Record<number, number[]> = {
    1: [3, 5, 7], 2: [4, 6, 8], 3: [1, 5, 9], 4: [2, 6, 8],
    5: [1, 3, 7], 6: [2, 4, 9], 7: [1, 5, 9], 8: [2, 4, 6],
    9: [3, 6, 7], 11: [2, 4, 6], 22: [4, 6, 8], 33: [3, 6, 9],
  };
  if (highCompat[lp1]?.includes(lp2) || highCompat[lp2]?.includes(lp1)) return 80;
  const challenging: Record<number, number[]> = {
    1: [4, 8], 2: [5, 7], 3: [4, 8], 4: [1, 3, 5],
    5: [2, 4], 6: [7], 7: [2, 6, 8], 8: [1, 3, 7],
    9: [1, 5],
  };
  if (challenging[lp1]?.includes(lp2) || challenging[lp2]?.includes(lp1)) return 50;
  return 65;
}

function geneKeysScore(gk1: string | null, gk2: string | null): number {
  if (!gk1 || !gk2) return 60;
  const extractNum = (s: string) => { const m = s.match(/Gene Key (\d+)/); return m ? parseInt(m[1]) : null; };
  const n1 = extractNum(gk1);
  const n2 = extractNum(gk2);
  if (!n1 || !n2) return 60;
  if (n1 === n2) return 95;
  const partners: Record<number, number> = {
    1: 2, 3: 4, 5: 35, 6: 36, 7: 13, 8: 14, 9: 16, 10: 15, 11: 12,
    17: 18, 19: 33, 20: 34, 21: 48, 22: 47, 23: 43, 24: 44, 25: 46,
    26: 45, 27: 28, 29: 30, 31: 41, 32: 42, 37: 40, 38: 39, 49: 4,
    50: 3, 51: 57, 52: 58, 53: 54, 55: 59, 56: 60, 61: 62, 63: 64,
  };
  if (partners[n1] === n2 || partners[n2] === n1) return 88;
  return 65;
}

function interestsScore(i1: string[] | null, i2: string[] | null): number {
  if (!i1?.length || !i2?.length) return 50;
  const set2 = new Set(i2);
  const shared = i1.filter(i => set2.has(i)).length;
  const maxPossible = Math.min(i1.length, i2.length);
  if (maxPossible === 0) return 50;
  return Math.round(50 + (shared / maxPossible) * 45);
}

function socialEnergyScore(s1: number | null, s2: number | null): number {
  if (!s1 || !s2) return 60;
  const diff = Math.abs(s1 - s2);
  if (diff <= 1) return 90;
  if (diff <= 3) return 75;
  if (diff <= 5) return 55;
  return 40;
}

interface PreComputedScore {
  overall: number; element: number; modality: number; hdType: number;
  lifePath: number; geneKeys: number; interests: number; socialEnergy: number; breakdown: string;
}

function computeCompatibility(myProfile: any, candidate: any): PreComputedScore {
  const mySun = cleanSignName(myProfile.sun_sign);
  const theirSun = cleanSignName(candidate.sun_sign);
  const myMoon = cleanSignName(myProfile.moon_sign);
  const theirMoon = cleanSignName(candidate.moon_sign);
  const myEl = signElements[mySun] || "Unknown";
  const theirEl = signElements[theirSun] || "Unknown";
  const element = myEl !== "Unknown" && theirEl !== "Unknown" ? elementScore(myEl, theirEl) : 60;
  const myMoonEl = signElements[myMoon] || null;
  const theirMoonEl = signElements[theirMoon] || null;
  let moonCross = 60;
  if (myMoonEl && theirEl) {
    const sunMoonScore = elementScore(signElements[mySun] || "Fire", theirMoonEl || "Fire");
    const moonSunScore = elementScore(myMoonEl, signElements[theirSun] || "Fire");
    moonCross = Math.round((sunMoonScore + moonSunScore) / 2);
  }
  const myMod = signModalities[mySun] || "Unknown";
  const theirMod = signModalities[theirSun] || "Unknown";
  const modality = myMod !== "Unknown" && theirMod !== "Unknown" ? modalityScore(myMod, theirMod) : 60;
  const hdType = (myProfile.human_design_type && candidate.human_design_type) ? getHDScore(myProfile.human_design_type, candidate.human_design_type) : 60;
  const lifePath = lifePathScore(myProfile.life_path_number, candidate.life_path_number);
  const geneKeys = geneKeysScore(myProfile.gene_keys_life_purpose, candidate.gene_keys_life_purpose);
  const interests = interestsScore(myProfile.interests, candidate.interests);
  const socialEnergy = socialEnergyScore(myProfile.social_energy, candidate.social_energy);
  const overall = Math.round(element * 0.20 + moonCross * 0.12 + modality * 0.08 + hdType * 0.20 + lifePath * 0.10 + geneKeys * 0.10 + interests * 0.12 + socialEnergy * 0.08);
  const breakdown = `Element: ${element}, Moon Cross: ${moonCross}, Modality: ${modality}, HD: ${hdType}, LifePath: ${lifePath}, GeneKeys: ${geneKeys}, Interests: ${interests}, Social: ${socialEnergy}`;
  return { overall, element, modality, hdType, lifePath, geneKeys, interests, socialEnergy, breakdown };
}

function connectionType(score: number): string {
  if (score >= 90) return "Twin Flame";
  if (score >= 82) return "Soul Mate";
  if (score >= 74) return "Cosmic Companion";
  if (score >= 65) return "Karmic Teacher";
  if (score >= 55) return "Growth Catalyst";
  return "Cosmic Mirror";
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rateLimitResponse = checkRateLimit(getIdentifier(req), "discover-profiles", corsHeaders);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    let bodyParams: any = {};
    try {
      bodyParams = await req.json();
    } catch {
      // No body is fine
    }

    const maxDistanceKm = bodyParams?.max_distance_km || 0;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log("[DISCOVER] Auth failed, returning empty profiles -", JSON.stringify(authError));
      return new Response(JSON.stringify({ profiles: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get current user's profile
    const { data: myProfile, error: myErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (myErr || !myProfile) throw new Error("Profile not found");

    // Get users already swiped on
    const { data: swipedRows } = await supabase
      .from("swipes")
      .select("target_user_id")
      .eq("user_id", user.id);

    const swipedIds = (swipedRows || []).map((r: any) => r.target_user_id);
    swipedIds.push(user.id); // exclude self

    // Fetch candidate profiles (onboarding complete, not paused, not already swiped)
    const { data: candidates, error: candErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("onboarding_complete", true)
      .eq("is_paused", false)
      .eq("is_incognito", false)
      .not("user_id", "in", `(${swipedIds.join(",")})`)
      .limit(50);

    if (candErr) {
      console.error("Candidate fetch error:", candErr);
      throw new Error("Failed to fetch candidates");
    }

    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ profiles: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Distance filtering ──
    const myLat = myProfile.current_latitude;
    const myLon = myProfile.current_longitude;

    let filteredCandidates = candidates;
    if (maxDistanceKm > 0 && myLat && myLon) {
      filteredCandidates = candidates.filter((c: any) => {
        if (!c.current_latitude || !c.current_longitude) return false;
        const dist = haversineKm(myLat, myLon, c.current_latitude, c.current_longitude);
        return dist <= maxDistanceKm;
      });
    }

    if (filteredCandidates.length === 0) {
      return new Response(JSON.stringify({ profiles: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch gallery photos for all candidates
    const candidateUserIds = filteredCandidates.map((c: any) => c.user_id);
    const { data: allPhotos } = await supabase
      .from("profile_photos")
      .select("user_id, photo_url, display_order")
      .in("user_id", candidateUserIds)
      .order("display_order", { ascending: true });

    const photosByUser = new Map<string, string[]>();
    for (const photo of (allPhotos || [])) {
      if (!photosByUser.has(photo.user_id)) photosByUser.set(photo.user_id, []);
      photosByUser.get(photo.user_id)!.push(photo.photo_url);
    }

    // ── Pre-compute deterministic compatibility scores ──
    const scoredCandidates = filteredCandidates.map((candidate: any) => {
      const scores = computeCompatibility(myProfile, candidate);
      const dist = (myLat && myLon && candidate.current_latitude && candidate.current_longitude)
        ? Math.round(haversineKm(myLat, myLon, candidate.current_latitude, candidate.current_longitude))
        : null;
      return { candidate, scores, type: connectionType(scores.overall), distance_km: dist };
    }).sort((a, b) => b.scores.overall - a.scores.overall);

    console.log(`Scored ${scoredCandidates.length} candidates. Top: ${scoredCandidates[0]?.scores.overall} (${scoredCandidates[0]?.scores.breakdown})`);

    // ── AI layer: generate mystical reasons using pre-computed scores ──
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const candidateSummaries = scoredCandidates.map((sc, i) => {
      const c = sc.candidate;
      const s = sc.scores;
      return `[${i}] ${c.display_name || "Unknown"} — Score: ${s.overall}/100 (${sc.type})
  Sun: ${c.sun_sign || "?"}, Moon: ${c.moon_sign || "?"}, Rising: ${c.rising_sign || "?"}
  HD: ${c.human_design_type || "?"}, Life Path: ${c.life_path_number || "?"}
  Gene Keys: ${c.gene_keys_life_purpose || "?"}
  Breakdown: ${s.breakdown}`;
    }).join("\n\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a cosmic matchmaker. Given pre-computed compatibility scores and astrological data, generate a short mystical reason (1-2 sentences) and 2-3 symbolic aspects for each match. The scores are ALREADY calculated deterministically — do NOT override them. Just provide the poetic interpretation.`,
          },
          {
            role: "user",
            content: `MY PROFILE: ${formatProfile(myProfile)}\n\nMATCHES (pre-scored, sorted by compatibility):\n${candidateSummaries}\n\nFor each candidate, provide a mystical reason and symbolic aspects. Keep the pre-computed scores exactly as-is.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_descriptions",
              description: "Return mystical descriptions for pre-scored matches",
              parameters: {
                type: "object",
                properties: {
                  matches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        index: { type: "number", description: "Candidate index" },
                        reason: { type: "string", description: "1-2 sentence mystical reason grounded in their actual cosmic data" },
                        shared_aspects: {
                          type: "array",
                          items: { type: "string" },
                          description: "2-3 astrological aspect symbols like ☉ △ ☽, ♀ ☌ ♂ based on their actual signs",
                        },
                      },
                      required: ["index", "reason", "shared_aspects"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["matches"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_descriptions" } },
      }),
    });

    let aiDescriptions: any[] = [];
    if (response.ok) {
      try {
        const aiResult = await response.json();
        const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall) {
          const parsed = JSON.parse(toolCall.function.arguments);
          aiDescriptions = parsed.matches || [];
        }
      } catch (e) {
        console.error("AI description parse error:", e);
      }
    } else {
      const errText = await response.text();
      console.error("AI description error:", response.status, errText);
    }

    // Build AI lookup by index
    const aiLookup = new Map<number, any>();
    for (const desc of aiDescriptions) {
      aiLookup.set(desc.index, desc);
    }

    // Merge deterministic scores with AI descriptions
    const enrichedProfiles = scoredCandidates.map((sc, i) => {
      const c = sc.candidate;
      const aiDesc = aiLookup.get(i);
      return {
        user_id: c.user_id,
        display_name: c.display_name,
        avatar_url: c.avatar_url,
        sun_sign: c.sun_sign,
        moon_sign: c.moon_sign,
        rising_sign: c.rising_sign,
        human_design_type: c.human_design_type,
        life_path_number: c.life_path_number,
        social_energy: c.social_energy,
        interests: c.interests,
        compatibility_tags: c.compatibility_tags,
        gene_keys_life_purpose: c.gene_keys_life_purpose,
        compatibility_score: sc.scores.overall,
        connection_type: sc.type,
        compatibility_reason: aiDesc?.reason || `A ${sc.type} connection with ${sc.scores.overall}% cosmic alignment.`,
        shared_aspects: aiDesc?.shared_aspects || [],
        birth_date: c.birth_date,
        birth_place: c.birth_place,
        current_city: c.current_city,
        distance_km: sc.distance_km,
        bio_prompt_1: c.bio_prompt_1,
        bio_prompt_1_answer: c.bio_prompt_1_answer,
        relationship_goal: c.relationship_goal,
        about_me: c.about_me,
        photo_urls: photosByUser.get(c.user_id) || [],
      };
    });

    return new Response(JSON.stringify({ profiles: enrichedProfiles }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("discover-profiles error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatProfile(p: any): string {
  return `Name: ${p.display_name || "Unknown"}
Sun: ${p.sun_sign || "?"}, Moon: ${p.moon_sign || "?"}, Rising: ${p.rising_sign || "?"}
Human Design: ${p.human_design_type || "?"} (${p.human_design_strategy || "?"}, ${p.human_design_authority || "?"})
Gene Keys Life Purpose: ${p.gene_keys_life_purpose || "?"}
Life Path: ${p.life_path_number || "?"}
Social Energy: ${p.social_energy || 5}/10
Tags: ${(p.compatibility_tags || []).join(", ")}
Interests: ${(p.interests || []).join(", ")}`;
}
