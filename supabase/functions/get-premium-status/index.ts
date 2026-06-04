import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkRateLimit, getIdentifier } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[GET-PREMIUM-STATUS] ${step}${detailsStr}`);
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rateLimitResponse = checkRateLimit(
    getIdentifier(req),
    "get-premium-status",
    corsHeaders,
  );
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logStep("Missing auth header");
      return json({ premium: false, reason: "unauthenticated" }, 200);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user?.email) {
      logStep("Auth failed", { error: userError?.message });
      return json({ premium: false, reason: "unauthenticated" }, 200);
    }
    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    // Permanent Pro for demo/reviewer/admin accounts. Source of truth so
    // these emails are never paywalled regardless of Stripe/IAP state.
    const DEMO_PRO_EMAILS = new Set([
      "demo@stellara.app",
      "chef.tinisha@gmail.com",
      "runitupnisha@gmail.com",
    ]);
    if (user.email && DEMO_PRO_EMAILS.has(user.email.toLowerCase())) {
      logStep("Demo/admin permanent Pro", { email: user.email });
      return json({
        premium: true,
        product_id: "prod_URoqBFRb0G2Kg2",
        price_id: "price_1TSvCqGjQT3v2NNSiycEinsh",
        subscription_end: "2099-12-31T23:59:59.000Z",
        source: "permanent_grant",
        reason: "active",
      });
    }

    // Admin role also implies permanent Pro access app-wide.
    const { data: adminRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (adminRow) {
      logStep("Admin role permanent Pro", { userId: user.id });
      return json({
        premium: true,
        product_id: "prod_URoqBFRb0G2Kg2",
        price_id: "price_1TSvCqGjQT3v2NNSiycEinsh",
        subscription_end: "2099-12-31T23:59:59.000Z",
        source: "admin_grant",
        reason: "active",
      });
    }

    // 1) Check native IAP first (App Store / Play Store). If the user has an
    //    active iap_subscriptions row, return premium immediately and skip Stripe.
    //    This is the source of truth for iOS / Android subscribers.
    const { data: iapRows, error: iapErr } = await supabase
      .from("iap_subscriptions")
      .select("product_id, expires_at, status, platform, environment")
      .eq("user_id", user.id)
      .in("status", ["active", "in_grace"])
      .order("expires_at", { ascending: false, nullsFirst: false })
      .limit(1);
    if (iapErr) {
      logStep("iap lookup error", { error: iapErr.message });
    } else if (iapRows && iapRows.length > 0) {
      const row = iapRows[0];
      const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
      const stillActive = !expiresAt || expiresAt.getTime() > Date.now();
      if (stillActive) {
        logStep("Premium active via IAP", { platform: row.platform, productId: row.product_id });
        return json({
          premium: true,
          product_id: row.product_id,
          price_id: null,
          subscription_end: expiresAt ? expiresAt.toISOString() : null,
          source: row.platform === "ios" ? "apple_iap" : "google_iap",
          environment: row.environment,
          reason: "active",
        });
      }
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("STRIPE_SECRET_KEY not set");
      return json({ premium: false, reason: "stripe_not_configured" }, 200);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer");
      return json({
        premium: false,
        product_id: null,
        price_id: null,
        subscription_end: null,
        reason: "no_customer",
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription", { customerId });
      return json({
        premium: false,
        product_id: null,
        price_id: null,
        subscription_end: null,
        reason: "no_active_subscription",
      });
    }

    const subscription = subscriptions.data[0];
    const periodEnd = (subscription as { current_period_end?: number | string })
      .current_period_end;
    let subscriptionEnd: string | null = null;
    if (typeof periodEnd === "number") {
      subscriptionEnd = new Date(periodEnd * 1000).toISOString();
    } else if (typeof periodEnd === "string") {
      const parsed = new Date(periodEnd);
      subscriptionEnd = isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }

    const productId = subscription.items.data[0]?.price.product ?? null;
    const priceId = subscription.items.data[0]?.price.id ?? null;

    logStep("Premium active", { productId, priceId, subscriptionEnd });
    return json({
      premium: true,
      product_id: productId,
      price_id: priceId,
      subscription_end: subscriptionEnd,
      reason: "active",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return json({ premium: false, error: message, reason: "error" }, 500);
  }
});