import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

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

      setSession(session);
      setUser(session?.user ?? null);
      // Only set loading false here if we've already initialized
      if (initialized.current) {
        setLoading(false);
      }
    });

    // THEN restore the session from storage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      initialized.current = true;
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, loading, signOut };
};
