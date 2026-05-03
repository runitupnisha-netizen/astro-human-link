import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStripePrices } from "@/hooks/useStripePrices";
import { STELLARA_TIERS, TierKey } from "@/hooks/usePremium";
import { Bug } from "lucide-react";

/**
 * Admin-only diagnostic panel: shows the live Stripe price record the app
 * is currently rendering for each tier. Useful to confirm the app is in
 * sync with Stripe (e.g. after rotating keys or editing products).
 */
const PricingDebugPanel = () => {
  const { prices, loading } = useStripePrices();
  const tiers: TierKey[] = ["monthly", "yearly"];

  return (
    <Card className="border-dashed border-amber-500/40 bg-amber-500/5 p-4 my-4">
      <div className="flex items-center gap-2 mb-3">
        <Bug className="w-4 h-4 text-amber-400" />
        <h3 className="font-display text-sm text-amber-300 tracking-wide uppercase">
          Pricing Debug · Live Stripe
        </h3>
        {loading && (
          <span className="text-[10px] text-muted-foreground">loading…</span>
        )}
      </div>

      <div className="space-y-3">
        {tiers.map((tier) => {
          const info = prices[tier];
          const fallback = STELLARA_TIERS[tier];
          return (
            <div
              key={tier}
              className="rounded-md border border-border/40 bg-background/40 p-3 text-xs font-mono"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-display text-sm uppercase tracking-wider text-foreground">
                  {fallback.name}
                </span>
                {info ? (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                    live
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                    fallback
                  </Badge>
                )}
              </div>
              {info ? (
                <dl className="grid grid-cols-[120px_1fr] gap-y-1 gap-x-3 text-muted-foreground">
                  <dt>lookup_key</dt>
                  <dd className="text-foreground break-all">{info.lookup_key}</dd>
                  <dt>product</dt>
                  <dd className="text-foreground break-all">
                    {info.product_name ?? "—"}{" "}
                    <span className="text-muted-foreground">({info.product_id})</span>
                  </dd>
                  <dt>price_id</dt>
                  <dd className="text-foreground break-all">{info.price_id}</dd>
                  <dt>amount</dt>
                  <dd className="text-foreground">
                    {info.formatted}{" "}
                    <span className="text-muted-foreground">
                      ({info.unit_amount} minor units)
                    </span>
                  </dd>
                  <dt>currency</dt>
                  <dd className="text-foreground uppercase">{info.currency}</dd>
                  <dt>interval</dt>
                  <dd className="text-foreground">{info.interval ?? "—"}</dd>
                </dl>
              ) : (
                <p className="text-muted-foreground">
                  No live price returned. Showing hardcoded fallback{" "}
                  <span className="text-foreground">{fallback.price}</span> /{" "}
                  {fallback.interval}.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default PricingDebugPanel;