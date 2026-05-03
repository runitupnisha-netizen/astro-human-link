import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkRateLimit, getIdentifier } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rateLimitResponse = checkRateLimit(getIdentifier(req), "create-checkout", corsHeaders);
  if (rateLimitResponse) return rateLimitResponse;

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { priceId, planKey, redirectTo } = await req.json();
    if (!priceId && !planKey) throw new Error("priceId or planKey is required");
    logStep("Request received", { priceId, planKey, redirectTo });

    // Sanitize redirect target: must be a same-origin path starting with "/"
    // and not a protocol-relative URL ("//host"). Falls back to "/discover".
    const safeRedirect = (() => {
      if (typeof redirectTo !== "string") return "/discover";
      if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) return "/discover";
      if (redirectTo.length > 512) return "/discover";
      return redirectTo;
    })();

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Resolve the live price by stable lookup_key. This guarantees we always
    // use a valid price for the *current* Stripe API key (test or live), so
    // rotating keys can never desync the checkout from the real catalog.
    const PLAN_LOOKUP_KEYS: Record<string, string> = {
      monthly: "stellara_monthly",
      yearly: "stellara_yearly",
    };

    let resolvedPriceId = priceId as string | undefined;
    const lookupKey = planKey ? PLAN_LOOKUP_KEYS[planKey] : undefined;

    const tryResolveByLookupKey = async (key: string) => {
      const list = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 });
      return list.data[0]?.id;
    };

    if (lookupKey) {
      const id = await tryResolveByLookupKey(lookupKey);
      if (!id) throw new Error(`No active price found for lookup_key '${lookupKey}'`);
      resolvedPriceId = id;
      logStep("Resolved price by lookup_key", { lookupKey, resolvedPriceId });
    } else if (resolvedPriceId) {
      // Validate the provided priceId exists in this mode; if it doesn't,
      // fall back to the canonical lookup_keys based on interval.
      try {
        await stripe.prices.retrieve(resolvedPriceId);
      } catch (err) {
        logStep("Provided priceId invalid, attempting lookup_key fallback", {
          priceId: resolvedPriceId,
          error: err instanceof Error ? err.message : String(err),
        });
        const fallback =
          (await tryResolveByLookupKey("stellara_monthly")) ||
          (await tryResolveByLookupKey("stellara_yearly"));
        if (!fallback) throw err;
        resolvedPriceId = fallback;
        logStep("Recovered via lookup_key fallback", { resolvedPriceId });
      }
    }

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }
    logStep("Customer lookup", { customerId: customerId || "new customer" });

    const origin = req.headers.get("origin") || "https://stellara.app";
    const redirectParam = encodeURIComponent(safeRedirect);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: resolvedPriceId!, quantity: 1 }],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 7,
      },
      payment_method_collection: "always",
      success_url: `${origin}/premium?success=true&redirect=${redirectParam}`,
      cancel_url: `${origin}/premium?canceled=true&redirect=${redirectParam}`,
    });
    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
