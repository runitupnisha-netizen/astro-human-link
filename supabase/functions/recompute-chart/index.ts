import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  Body,
  Ecliptic,
  GeoVector,
  SiderealTime,
  MakeTime,
  e_tilt,
} from "npm:astronomy-engine@2.1.19";
import { DateTime } from "npm:luxon@3.4.4";
import tzLookup from "npm:tz-lookup@6.1.25";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ZODIAC = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

function signFromLongitude(lonDeg: number): string {
  const norm = ((lonDeg % 360) + 360) % 360;
  return ZODIAC[Math.floor(norm / 30)];
}

function buildBirthDateUTC(
  birthDate: string,
  birthTime: string | null,
  longitudeDeg: number | null,
  latitudeDeg: number | null,
): Date {
  const [y, m, d] = birthDate.split("-").map(Number);
  const [hh, mm] = (birthTime ?? "12:00").split(":").map(Number);

  let zone: string | null = null;
  if (
    latitudeDeg != null &&
    longitudeDeg != null &&
    Number.isFinite(latitudeDeg) &&
    Number.isFinite(longitudeDeg)
  ) {
    try {
      zone = tzLookup(latitudeDeg, longitudeDeg);
    } catch {
      zone = null;
    }
  }

  if (zone) {
    const dt = DateTime.fromObject(
      {
        year: y,
        month: m ?? 1,
        day: d ?? 1,
        hour: hh ?? 12,
        minute: mm ?? 0,
        second: 0,
      },
      { zone },
    );
    if (dt.isValid) return dt.toUTC().toJSDate();
  }

  const asUTC = Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 12, mm ?? 0, 0);
  return new Date(asUTC);
}

function eclipticLongitude(body: Body, date: Date): number {
  const vec = GeoVector(body, date, true);
  const ecl = Ecliptic(vec);
  return ecl.elon;
}

function calcRising(
  date: Date,
  latitudeDeg: number,
  longitudeDeg: number,
): string {
  const gst = SiderealTime(date);
  const lstHours = (gst + longitudeDeg / 15 + 24) % 24;
  const lstDeg = lstHours * 15;

  // True obliquity (mean + nutation in obliquity) for this instant —
  // matches Astro.com / apparent coordinates instead of a static mean.
  let epsilonDeg = 23.4367;
  try {
    const tilt = e_tilt(MakeTime(date));
    if (Number.isFinite(tilt?.tobl)) epsilonDeg = tilt.tobl;
  } catch {
    /* fall back to mean obliquity */
  }
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const eps = toRad(epsilonDeg);
  const phi = toRad(latitudeDeg);
  const lst = toRad(lstDeg);

  const y = -Math.cos(lst);
  const x = Math.sin(eps) * Math.tan(phi) + Math.cos(eps) * Math.sin(lst);
  let asc = toDeg(Math.atan2(y, x));
  asc = ((asc % 360) + 360) % 360;

  const diff = ((asc - lstDeg + 540) % 360) - 180;
  if (diff < 0) asc = (asc + 180) % 360;

  return signFromLongitude(asc);
}

const DEMO_EMAIL = "demo@stellara.app";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // Authn + authz: caller must be a logged-in admin
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) {
    return new Response(JSON.stringify({ error: "missing_token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: caller, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !caller.user) {
    return new Response(JSON.stringify({ error: "invalid_token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: isAdminRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!isAdminRow) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Resolve target user (defaults to demo account)
  let targetUserId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body.user_id === "string") {
      targetUserId = body.user_id;
    }
  } catch {
    // ignore – default to demo
  }

  if (!targetUserId) {
    const { data: list } = await admin.auth.admin.listUsers();
    const demo = list.users.find(
      (u) => u.email?.toLowerCase() === DEMO_EMAIL,
    );
    if (!demo) {
      return new Response(
        JSON.stringify({ error: "demo_user_not_found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    targetUserId = demo.id;
  }

  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select(
      "user_id, birth_date, birth_time, birth_latitude, birth_longitude, sun_sign, moon_sign, rising_sign, venus_sign, mars_sign, mercury_sign",
    )
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (pErr || !profile) {
    return new Response(
      JSON.stringify({ error: "profile_not_found", details: pErr?.message }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  if (!profile.birth_date) {
    return new Response(
      JSON.stringify({ error: "missing_birth_date" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const birthTime = profile.birth_time
    ? String(profile.birth_time).slice(0, 5)
    : null;

  const utc = buildBirthDateUTC(
    profile.birth_date,
    birthTime,
    profile.birth_longitude,
    profile.birth_latitude,
  );

  const sun = signFromLongitude(eclipticLongitude(Body.Sun, utc));
  const moon = signFromLongitude(eclipticLongitude(Body.Moon, utc));
  const venus = signFromLongitude(eclipticLongitude(Body.Venus, utc));
  const mars = signFromLongitude(eclipticLongitude(Body.Mars, utc));
  const mercury = signFromLongitude(eclipticLongitude(Body.Mercury, utc));

  const canRising =
    birthTime != null &&
    profile.birth_latitude != null &&
    profile.birth_longitude != null;
  const rising = canRising
    ? calcRising(
        utc,
        profile.birth_latitude as number,
        profile.birth_longitude as number,
      )
    : null;

  const before = {
    sun_sign: profile.sun_sign,
    moon_sign: profile.moon_sign,
    rising_sign: profile.rising_sign,
    venus_sign: profile.venus_sign,
    mars_sign: profile.mars_sign,
    mercury_sign: profile.mercury_sign,
  };
  const after = {
    sun_sign: sun,
    moon_sign: moon,
    rising_sign: rising,
    venus_sign: venus,
    mars_sign: mars,
    mercury_sign: mercury,
  };

  const { error: uErr } = await admin
    .from("profiles")
    .update({
      ...after,
      // Roll the demo Daily Ritual forward so it reads as
      // "completed yesterday" — keeps the ritual available for
      // App Store / Play reviewers without manual SQL.
      daily_ritual_last_completed: new Date(Date.now() - 86400000)
        .toISOString()
        .slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", targetUserId);

  if (uErr) {
    return new Response(
      JSON.stringify({ error: "update_failed", details: uErr.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      user_id: targetUserId,
      utc_iso: utc.toISOString(),
      before,
      after,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    },
  );
});