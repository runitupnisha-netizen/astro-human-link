import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";
import Footer from "@/components/Footer";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State =
  | { kind: "loading" }
  | { kind: "valid" }
  | { kind: "already" }
  | { kind: "invalid"; message: string }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid", message: "No unsubscribe token provided." });
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json();
        if (data.valid === true) setState({ kind: "valid" });
        else if (data.reason === "already_unsubscribed") setState({ kind: "already" });
        else setState({ kind: "invalid", message: data.error || "Invalid or expired link." });
      } catch {
        setState({ kind: "invalid", message: "Couldn't verify your unsubscribe link." });
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState({ kind: "submitting" });
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) setState({ kind: "success" });
      else if (data.reason === "already_unsubscribed") setState({ kind: "already" });
      else setState({ kind: "error", message: data.error || "Something went wrong." });
    } catch {
      setState({ kind: "error", message: "Network error. Please try again." });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 container max-w-lg mx-auto px-4 py-16 flex items-center">
        <Card className="w-full border-border/50 shadow-golden">
          <CardContent className="p-8 text-center space-y-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto">
              <Mail className="w-7 h-7 text-primary" />
            </div>

            {state.kind === "loading" && (
              <>
                <h1 className="text-2xl font-bold text-foreground">Verifying your link…</h1>
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
              </>
            )}

            {state.kind === "valid" && (
              <>
                <h1 className="text-2xl font-bold text-foreground">Unsubscribe from Stellara emails?</h1>
                <p className="text-muted-foreground">
                  You'll stop receiving non-essential emails from Stellara. You can still
                  receive critical account messages (like password resets).
                </p>
                <Button onClick={confirm} className="w-full">Confirm Unsubscribe</Button>
                <Link to="/" className="block text-sm text-muted-foreground hover:text-foreground">
                  Never mind, keep me subscribed
                </Link>
              </>
            )}

            {state.kind === "submitting" && (
              <>
                <h1 className="text-2xl font-bold text-foreground">Unsubscribing…</h1>
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
              </>
            )}

            {state.kind === "success" && (
              <>
                <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
                <h1 className="text-2xl font-bold text-foreground">You're unsubscribed</h1>
                <p className="text-muted-foreground">
                  We're sorry to see you go. You won't receive further emails from us.
                </p>
                <Link to="/"><Button variant="outline" className="w-full">Back to Stellara</Button></Link>
              </>
            )}

            {state.kind === "already" && (
              <>
                <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
                <h1 className="text-2xl font-bold text-foreground">Already unsubscribed</h1>
                <p className="text-muted-foreground">This email address has already been unsubscribed.</p>
                <Link to="/"><Button variant="outline" className="w-full">Back to Stellara</Button></Link>
              </>
            )}

            {(state.kind === "invalid" || state.kind === "error") && (
              <>
                <XCircle className="w-12 h-12 text-destructive mx-auto" />
                <h1 className="text-2xl font-bold text-foreground">Couldn't process request</h1>
                <p className="text-muted-foreground">{state.message}</p>
                <Link to="/contact"><Button variant="outline" className="w-full">Contact support</Button></Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Unsubscribe;
