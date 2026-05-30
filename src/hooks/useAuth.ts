import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

// Supabase appends the recovery tokens to the URL hash (e.g. #access_token=...&type=recovery)
// when the user opens the password reset email link.
const hasRecoveryHash = () =>
  typeof window !== "undefined" && window.location.hash.includes("type=recovery");

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(Boolean(supabase));
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(hasRecoveryHash);

  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsAuthLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      // Remove the recovery tokens from the URL so a refresh doesn't re-trigger the flow.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  return { user, session, isAuthLoading, signOut, isPasswordRecovery, clearPasswordRecovery };
}

