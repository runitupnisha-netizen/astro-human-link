import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const initialized = useRef(false);
  const hadSession = useRef(false);

  useEffect(() => {
    // Set up the auth state listener FIRST so we don't miss events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (typeof window !== "undefined") {
        if (event === "PASSWORD_RECOVERY") {
          window.sessionStorage.setItem("auth-recovery-pending", "true");
          window.localStorage.setItem("auth-recovery-pending", "true");
          window.localStorage.setItem("auth-recovery-requested-at", Date.now().toString());
        }
        if (event === "SIGNED_OUT") {
          window.sessionStorage.removeItem("auth-recovery-pending");
          window.localStorage.removeItem("auth-recovery-pending");
          window.localStorage.removeItem("auth-recovery-requested-at");
        }
      }

      // Detect session expiry: had a session, now lost it without an explicit sign-out action.
      // SIGNED_OUT can fire on token refresh failure too — flag it so UI can show "Session expired".
      if (initialized.current && hadSession.current && !session) {
        const explicit = typeof window !== "undefined" && window.sessionStorage.getItem("auth-explicit-signout") === "true";
        if (!explicit) {
          setSessionExpired(true);
        }
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem("auth-explicit-signout");
        }
      }

      setSession(session);
      setUser(session?.user ?? null);
      hadSession.current = !!session;
      // Only set loading false here if we've already initialized
      if (initialized.current) {
        setLoading(false);
      }
    });

    // THEN restore the session from storage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      hadSession.current = !!session;
      initialized.current = true;
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Mark as an explicit sign-out so the listener doesn't flag it as "session expired"
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("auth-explicit-signout", "true");
      // Clear any lingering password-recovery flags so the next login isn't
      // forced into the /reset-password flow.
      window.sessionStorage.removeItem("auth-recovery-pending");
      window.localStorage.removeItem("auth-recovery-pending");
      window.localStorage.removeItem("auth-recovery-requested-at");
    }
    await supabase.auth.signOut();
    // Hard reload to wipe ALL in-memory React state, query cache, and route stack.
    // This prevents the previous user's matches/messages/chart from leaking into a new session.
    if (typeof window !== "undefined") {
      window.location.href = "/auth";
    }
  };

  return { user, session, loading, sessionExpired, signOut };
};
