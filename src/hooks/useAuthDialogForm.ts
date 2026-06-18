import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";

export type AuthMode = "sign_in" | "sign_up" | "reset";

export type AuthFormCopy = {
  supabaseMissing: string;
  invalidEmail: string;
  passwordTooShort: string;
  resetEmailSent: string;
  googleAccountNoPassword: string;
  emailUsesGoogle: string;
  emailAlreadyRegistered: string;
  checkEmailToConfirm: string;
  signedInSuccessfully: string;
  invalidCredentials: string;
  networkError: string;
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const parseRateLimitSeconds = (message?: string) => Number(message?.match(/(\d+)\s*seconds?/i)?.[1]) || null;

const localizeError = (message: string | undefined, copy: AuthFormCopy) => {
  if (!message) return copy.networkError;
  if (/invalid login credentials/i.test(message)) return copy.invalidCredentials;
  if (/already registered|already exists|user already/i.test(message)) return copy.emailAlreadyRegistered;
  if (/network|fetch/i.test(message)) return copy.networkError;
  return message;
};

const fetchEmailProviders = async (email: string) => {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("email_auth_providers", { p_email: email });
  if (error) {
    console.error("email_auth_providers error:", error.message);
    return null;
  }
  return data as { account_exists: boolean; has_password: boolean; has_google: boolean } | null;
};

export function useAuthDialogForm({
  initialMode,
  copy,
  onClose,
  onAuthenticated,
}: {
  initialMode: AuthMode;
  copy: AuthFormCopy;
  onClose: () => void;
  onAuthenticated?: () => void;
}) {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isGoogleAuthLoading, setIsGoogleAuthLoading] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);

  useEffect(() => {
    if (resetCooldown <= 0) return;
    const intervalId = window.setInterval(() => {
      setResetCooldown((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(intervalId);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [resetCooldown]);

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return setAuthStatus(copy.supabaseMissing);
    setAuthStatus("");
    const email = authEmail.trim().toLowerCase();
    const password = authPassword.trim();
    if (!isValidEmail(email)) return setAuthStatus(copy.invalidEmail);
    if (authMode !== "reset" && password.length < 6) return setAuthStatus(copy.passwordTooShort);
    setIsAuthSubmitting(true);

    if (authMode === "reset") {
      const providers = await fetchEmailProviders(email);
      if (providers?.account_exists && providers.has_google && !providers.has_password) {
        setAuthStatus(copy.googleAccountNoPassword);
        setIsAuthSubmitting(false);
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname,
      });
      const cooldown = error ? parseRateLimitSeconds(error.message) : null;
      if (cooldown) setResetCooldown(cooldown);
      setAuthStatus(error && !cooldown ? localizeError(error.message, copy) : error ? "" : copy.resetEmailSent);
      setIsAuthSubmitting(false);
      return;
    }

    if (authMode === "sign_up") {
      const providers = await fetchEmailProviders(email);
      if (providers?.has_google) {
        setAuthStatus(copy.emailUsesGoogle);
        setIsAuthSubmitting(false);
        return;
      }
      const result = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: authUsername.trim() || email.split("@")[0] } },
      });
      const hasNoIdentity = Array.isArray(result.data.user?.identities) && result.data.user.identities.length === 0;
      setAuthStatus(
        result.error
          ? localizeError(result.error.message, copy)
          : hasNoIdentity
            ? copy.emailAlreadyRegistered
            : copy.checkEmailToConfirm,
      );
      setIsAuthSubmitting(false);
      return;
    }

    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) {
      const providers = await fetchEmailProviders(email);
      setAuthStatus(
        providers?.account_exists && providers.has_google && !providers.has_password
          ? copy.emailUsesGoogle
          : localizeError(result.error.message, copy),
      );
      setIsAuthSubmitting(false);
      return;
    }
    setIsAuthSubmitting(false);
    setAuthStatus(copy.signedInSuccessfully);
    onAuthenticated?.();
    onClose();
  };

  const signInWithGoogle = async () => {
    if (!supabase) return setAuthStatus(copy.supabaseMissing);
    setIsGoogleAuthLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) {
      setAuthStatus(localizeError(error.message, copy));
      setIsGoogleAuthLoading(false);
    }
  };

  const changeMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthStatus("");
  };

  return {
    authMode, authEmail, authPassword, authUsername, authStatus, isAuthSubmitting,
    isGoogleAuthLoading, resetCooldown, setAuthEmail, setAuthPassword, setAuthUsername,
    handleAuthSubmit, signInWithGoogle, changeMode,
  };
}
