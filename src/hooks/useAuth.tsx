import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export const useAuth = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      window.localStorage.removeItem("auth-recovery-pending");
      window.sessionStorage.removeItem("auth-recovery-pending");
      if (hash.includes("access_token")) {
        window.history.replaceState(null, document.title, window.location.pathname);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_IN") {
        window.localStorage.removeItem("auth-recovery-pending");
        window.sessionStorage.removeItem("auth-recovery-pending");
        if (window.location.pathname !== "/reset-password") {
          navigate("/growth", { replace: true });
        }
      }

      if (event === "SIGNED_OUT") {
        setUser(null);
      }

      if (event === "PASSWORD_RECOVERY" && window.location.hash.includes("type=recovery")) {
        navigate("/reset-password", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signOut = async () => {
    // Mark as an explicit sign-out so the listener doesn't flag it as "session expired"
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("auth-explicit-signout", "true");
      window.sessionStorage.removeItem("auth-recovery-pending");
      window.localStorage.removeItem("auth-recovery-pending");
      window.localStorage.removeItem("auth-recovery-requested-at");
    }
    await supabase.auth.signOut();
    // Hard reload to wipe ALL in-memory React state, query cache, and route stack.
    // This prevents the previous user's matches/messages/chart from leaking into a new session.
    if (typeof window !== "undefined") {
      window.location.href = "/sign-in";
    }
  };

  return { user, session, loading, signOut };
};
