import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import CosmicBackground from "@/components/CosmicBackground";

// Supabase Auth beta namespace — narrow typed wrapper so TS is happy.
interface OAuthAuthz {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
}
const oauthApi = (supabase.auth as unknown as { oauth: OAuthAuthz }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        // Preserve the FULL consent URL so /sign-in returns here after login.
        const next = window.location.pathname + window.location.search;
        window.location.href = "/sign-in?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauthApi.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauthApi.approveAuthorization(authorizationId)
      : await oauthApi.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 py-16">
      <CosmicBackground />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-amber-400/20 bg-background/80 backdrop-blur-xl p-8 shadow-golden">
        {error ? (
          <>
            <h1 className="text-2xl font-serif text-amber-400 mb-3">Authorization error</h1>
            <p className="text-muted-foreground text-sm">{error}</p>
          </>
        ) : !details ? (
          <p className="text-center text-muted-foreground">Loading authorization…</p>
        ) : (
          <>
            <h1 className="text-2xl font-serif text-amber-400 mb-2">
              Connect {details.client?.name ?? "an app"} to Stellara
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              This will let {details.client?.name ?? "the requesting app"} act as you inside
              Stellara — reading your blueprint, daily briefing, and journal entries, and
              creating new journal entries on your behalf.
            </p>
            <div className="flex gap-3">
              <Button
                disabled={busy}
                onClick={() => decide(true)}
                className="flex-1 bg-gradient-golden text-background"
              >
                Approve
              </Button>
              <Button
                disabled={busy}
                variant="outline"
                onClick={() => decide(false)}
                className="flex-1"
              >
                Deny
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}