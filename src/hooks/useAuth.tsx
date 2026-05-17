import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const isRecoveryLink = window.location.pathname === "/reset-password" &&
      params.get("type") === "recovery" &&
      !!params.get("access_token");

    const hydrateOAuthSession = async () => {
      if (!isRecoveryLink && code) {
        const { data } = await supabase.auth.exchangeCodeForSession(code);
        if (data.session) {
          const cleanPath = window.location.pathname === "/auth/callback" ? "/" : window.location.pathname;
          window.history.replaceState(null, document.title, cleanPath);
          return data.session;
        }
      }

      if (!isRecoveryLink && accessToken && refreshToken) {
        const { data } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (data.session) {
          window.history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
          return data.session;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      return session;
    };

    if (!isRecoveryLink) {
      window.localStorage.removeItem("auth-recovery-pending");
      window.sessionStorage.removeItem("auth-recovery-pending");
      if (!accessToken && (hash.includes("access_token") || hash.includes("type=recovery"))) {
        window.history.replaceState(null, document.title, window.location.pathname);
      }
    }

    hydrateOAuthSession().then((session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_IN") {
        window.localStorage.removeItem("auth-recovery-pending");
        window.sessionStorage.removeItem("auth-recovery-pending");
      }

      if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
