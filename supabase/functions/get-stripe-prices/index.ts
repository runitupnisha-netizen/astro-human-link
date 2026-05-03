import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOOKUP_KEYS = ["stellara_monthly", "stellara_yearly"] as const;

const formatAmount = (amount: number | null, currency: string) => {
  if (amount == null) return "";
  const value = amount / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const list = await stripe.prices.list({
      lookup_keys: [...LOOKUP_KEYS],
      active: true,
      limit: 10,
      expand: ["data.product"],
    });

    const prices: Record<string, {
      price_id: string;
      product_id: string;
      product_name: string | null;
      unit_amount: number | null;
      currency: string;
      interval: string | null;
      formatted: string;
      lookup_key: string;
    }> = {};

    for (const p of list.data) {
      if (!p.lookup_key) continue;
      const product = p.product as Stripe.Product | string;
      const productId = typeof product === "string" ? product : product.id;
      const productName =
        typeof product === "string" ? null : (product.name ?? null);
      prices[p.lookup_key] = {
        price_id: p.id,
        product_id: productId,
        product_name: productName,
        unit_amount: p.unit_amount,
        currency: p.currency,
        interval: p.recurring?.interval ?? null,
        formatted: formatAmount(p.unit_amount, p.currency),
        lookup_key: p.lookup_key,
      };
    }

    return new Response(JSON.stringify({ prices }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[get-stripe-prices]", message);
    return new Response(JSON.stringify({ error: message, prices: {} }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});