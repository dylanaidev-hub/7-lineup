import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

// Supabase appends the recovery tokens to the URL hash (e.g. #access_token=...&type=recovery)
// when the user opens the password reset email link.
const hasRecoveryHash = () =>
  typeof window !== "undefined" && window.location.hash.includes("type=recovery");

// When the recovery link is invalid/expired/already used, Supabase redirects back
// with an error in the hash (e.g. #error=access_denied&error_code=otp_expired&...).
const parseRecoveryError = (): string | null => {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash.includes("error")) return null;
  const params = new URLSearchParams(hash);
  if (!params.get("error") && !params.get("error_code")) return null;
  const description = params.get("error_description");
  return description ? description.replace(/\+/g, " ") : params.get("error_code") || params.get("error") || "error";
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(Boolean(supabase));
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(hasRecoveryHash);
  const [recoveryError, setRecoveryError] = useState<string | null>(parseRecoveryError);

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
    setRecoveryError(null);
    if (typeof window !== "undefined" && window.location.hash) {
      // Remove the recovery tokens/error from the URL so a refresh doesn't re-trigger the flow.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  return {
    user,
    session,
    isAuthLoading,
    signOut,
    isPasswordRecovery,
    recoveryError,
    clearPasswordRecovery,
  };
}

