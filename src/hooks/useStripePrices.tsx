import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TierKey } from "@/hooks/usePremium";

export type StripePriceInfo = {
  price_id: string;
  product_id: string;
  product_name: string | null;
  unit_amount: number | null;
  currency: string;
  interval: string | null;
  formatted: string;
  lookup_key: string;
};

const LOOKUP_KEY_BY_TIER: Record<TierKey, string> = {
  monthly: "stellara_monthly",
  yearly: "stellara_yearly",
};

type PricesMap = Partial<Record<TierKey, StripePriceInfo>>;

const CACHE_KEY = "stellara_stripe_prices_v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

const readCache = (): PricesMap | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; prices: PricesMap };
    if (!parsed?.at || Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return parsed.prices ?? null;
  } catch {
    return null;
  }
};

export const useStripePrices = () => {
  const [prices, setPrices] = useState<PricesMap>(() => readCache() ?? {});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-stripe-prices");
        if (error) throw error;
        const raw = (data?.prices ?? {}) as Record<string, StripePriceInfo>;
        const mapped: PricesMap = {};
        (Object.keys(LOOKUP_KEY_BY_TIER) as TierKey[]).forEach((tier) => {
          const info = raw[LOOKUP_KEY_BY_TIER[tier]];
          if (info) mapped[tier] = info;
        });
        if (cancelled) return;
        if (Object.keys(mapped).length > 0) {
          setPrices(mapped);
          try {
            localStorage.setItem(
              CACHE_KEY,
              JSON.stringify({ at: Date.now(), prices: mapped }),
            );
          } catch { /* ignore */ }
        }
      } catch (err) {
        console.warn("[useStripePrices] failed to load prices", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { prices, loading };
};