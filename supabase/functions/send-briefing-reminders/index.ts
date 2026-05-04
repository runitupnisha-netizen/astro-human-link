// Daily scheduler: triggers each user's briefing + push/email reminder
// at the local hour they chose. Runs hourly via pg_cron.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function localHour(tz: string): { hour: number; date: string } {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = fmt.formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const hour = parseInt(get("hour"), 10) % 24;
    const date = `${get("year")}-${get("month")}-${get("day")}`;
    return { hour, date };
  } catch {
    const now = new Date();
    return { hour: now.getUTCHours(), date: now.toISOString().slice(0, 10) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Cron-only: require shared secret or service-role bearer
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization") || "";
  const providedCronSecret = req.headers.get("x-cron-secret");
  const isAuthorized =
    (cronSecret && providedCronSecret === cronSecret) ||
    authHeader === `Bearer ${SERVICE_ROLE}`;
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: candidates, error } = await admin
    .from("profiles")
    .select(
      "user_id, display_name, briefing_email_reminder, briefing_push_reminder, briefing_reminder_hour, briefing_reminder_timezone, briefing_last_reminder_date"
    )
    .or("briefing_email_reminder.eq.true,briefing_push_reminder.eq.true");

  if (error) {
    console.error("Failed to load reminder candidates", error);
    return new Response(JSON.stringify({ error: "load_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let processed = 0;
  let emailSent = 0;
  let pushSent = 0;

  for (const p of candidates ?? []) {
    const { hour, date } = localHour(p.briefing_reminder_timezone || "UTC");
    if (hour !== p.briefing_reminder_hour) continue;
    if (p.briefing_last_reminder_date === date) continue;

    processed += 1;

    // 1. Generate today's briefing (idempotent — function returns cached row if exists)
    let briefing: any = null;
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-daily-briefing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({ user_id: p.user_id }),
      });
      if (res.ok) briefing = await res.json();
    } catch (e) {
      console.warn("generate-daily-briefing failed", p.user_id, e);
    }

    const energyTheme = briefing?.energy_theme || "A new cosmic chapter awaits";
    const mood = briefing?.mood || "Reflective";

    // 2. Email reminder
    if (p.briefing_email_reminder) {
      const { data: userRes } = await admin.auth.admin.getUserById(p.user_id);
      const email = userRes?.user?.email;
      if (email) {
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE_ROLE}`,
            },
            body: JSON.stringify({
              templateName: "daily-briefing-reminder",
              recipientEmail: email,
              idempotencyKey: `briefing-${p.user_id}-${date}`,
              templateData: {
                displayName: p.display_name || "Friend",
                energyTheme,
                mood,
                appUrl: "https://astro-human-link.lovable.app/briefing",
              },
            }),
          });
          emailSent += 1;
        } catch (e) {
          console.warn("email send failed", p.user_id, e);
        }
      }
    }

    // 3. Push reminder
    if (p.briefing_push_reminder) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_ROLE}`,
          },
          body: JSON.stringify({
            type: "daily_briefing",
            user_id: p.user_id,
            title: "🌅 Your Daily Cosmic Briefing is ready",
            body: energyTheme,
            url: "/briefing",
          }),
        });
        pushSent += 1;
      } catch (e) {
        console.warn("push send failed", p.user_id, e);
      }
    }

    // 4. Mark sent so we don't double-send
    await admin
      .from("profiles")
      .update({ briefing_last_reminder_date: date })
      .eq("user_id", p.user_id);
  }

  return new Response(
    JSON.stringify({ processed, emailSent, pushSent, candidates: candidates?.length ?? 0 }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
