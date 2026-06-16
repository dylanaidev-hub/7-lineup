import { useEffect, useState, type FormEvent } from "react";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";
import styles from "./AuthDialog.module.css";

export type AuthLanguage = "vi" | "en";

type AuthCopy = {
  authTitle: string;
  signIn: string;
  signUp: string;
  resetPassword: string;
  backToSignIn: string;
  forgotPassword: string;
  googleSignIn: string;
  username: string;
  email: string;
  password: string;
  supabaseMissing: string;
  invalidEmail: string;
  passwordTooShort: string;
  resetEmailSent: string;
  resetCooldownMessage: string;
  googleAccountNoPassword: string;
  emailUsesGoogle: string;
  emailAlreadyRegistered: string;
  checkEmailToConfirm: string;
  signedInSuccessfully: string;
  invalidCredentials: string;
  networkError: string;
};

const authCopyByLanguage: Record<AuthLanguage, AuthCopy> = {
  vi: {
    authTitle: "Tài khoản",
    signIn: "Đăng nhập",
    signUp: "Đăng ký",
    resetPassword: "Gửi link đặt lại mật khẩu",
    backToSignIn: "Quay lại đăng nhập",
    forgotPassword: "Quên mật khẩu?",
    googleSignIn: "Đăng nhập Google",
    username: "Tên người dùng",
    email: "Email",
    password: "Mật khẩu",
    supabaseMissing: "Chưa cấu hình Supabase.",
    invalidEmail: "Email không hợp lệ.",
    passwordTooShort: "Mật khẩu cần tối thiểu 6 ký tự.",
    resetEmailSent: "Đã gửi link đặt lại mật khẩu. Hãy kiểm tra email.",
    resetCooldownMessage: "Vui lòng chờ {seconds}s trước khi gửi lại.",
    googleAccountNoPassword: "Email này đang đăng nhập bằng Google. Hãy dùng đăng nhập Google.",
    emailUsesGoogle: "Email này đã được đăng ký bằng Google. Hãy đăng nhập bằng Google.",
    emailAlreadyRegistered: "Email này đã được đăng ký. Hãy đăng nhập hoặc dùng quên mật khẩu.",
    checkEmailToConfirm: "Đăng ký thành công. Hãy kiểm tra email để xác nhận tài khoản.",
    signedInSuccessfully: "Đăng nhập thành công.",
    invalidCredentials: "Email hoặc mật khẩu chưa đúng.",
    networkError: "Không thể kết nối máy chủ. Vui lòng thử lại.",
  },
  en: {
    authTitle: "Account",
    signIn: "Sign in",
    signUp: "Sign up",
    resetPassword: "Send password reset link",
    backToSignIn: "Back to sign in",
    forgotPassword: "Forgot password?",
    googleSignIn: "Sign in with Google",
    username: "Username",
    email: "Email",
    password: "Password",
    supabaseMissing: "Supabase is not configured.",
    invalidEmail: "Invalid email address.",
    passwordTooShort: "Password must be at least 6 characters.",
    resetEmailSent: "Password reset link sent. Please check your email.",
    resetCooldownMessage: "Please wait {seconds}s before sending again.",
    googleAccountNoPassword: "This email uses Google sign-in. Please continue with Google.",
    emailUsesGoogle: "This email was registered with Google. Please sign in with Google.",
    emailAlreadyRegistered: "This email is already registered. Please sign in or reset your password.",
    checkEmailToConfirm: "Sign-up successful. Please check your email to confirm your account.",
    signedInSuccessfully: "Signed in successfully.",
    invalidCredentials: "Email or password is incorrect.",
    networkError: "Could not connect to the server. Please try again.",
  },
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const parseRateLimitSeconds = (message?: string): number | null => {
  const match = message?.match(/(\d+)\s*seconds?/i);
  return match ? Number(match[1]) : null;
};

const localizeError = (message: string | undefined, copy: AuthCopy): string => {
  if (!message) return copy.networkError;
  if (/invalid login credentials/i.test(message)) return copy.invalidCredentials;
  if (/already registered|already exists|user already/i.test(message)) return copy.emailAlreadyRegistered;
  if (/network|fetch/i.test(message)) return copy.networkError;
  return message;
};

function ButtonSpinner() {
  return <span className="button-spinner" aria-hidden="true" />;
}

const fetchEmailProviders = async (email: string) => {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("email_auth_providers", { p_email: email });
  if (error) {
    console.error("email_auth_providers error:", error.message);
    return null;
  }
  return data as { account_exists: boolean; has_password: boolean; has_google: boolean } | null;
};

export function AuthDialog({
  language,
  initialMode = "sign_in",
  onClose,
  onAuthenticated,
}: {
  language: AuthLanguage;
  initialMode?: "sign_in" | "sign_up" | "reset";
  onClose: () => void;
  onAuthenticated?: () => void;
}) {
  const copy = authCopyByLanguage[language];
  const [authMode, setAuthMode] = useState<"sign_in" | "sign_up" | "reset">(initialMode);
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
    if (!supabase) {
      setAuthStatus(copy.supabaseMissing);
      return;
    }

    setAuthStatus("");
    const email = authEmail.trim().toLowerCase();
    const password = authPassword.trim();

    if (!isValidEmail(email)) {
      setAuthStatus(copy.invalidEmail);
      return;
    }

    if (authMode !== "reset" && password.length < 6) {
      setAuthStatus(copy.passwordTooShort);
      return;
    }

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
      if (error) {
        const cooldownSeconds = parseRateLimitSeconds(error.message);
        if (cooldownSeconds) {
          setResetCooldown(cooldownSeconds);
          setAuthStatus("");
        } else {
          setAuthStatus(localizeError(error.message, copy));
        }
      } else {
        setResetCooldown(0);
        setAuthStatus(copy.resetEmailSent);
      }
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

      if (result.error) {
        setAuthStatus(localizeError(result.error.message, copy));
        setIsAuthSubmitting(false);
        return;
      }

      const identities = result.data.user?.identities;
      if (Array.isArray(identities) && identities.length === 0) {
        setAuthStatus(copy.emailAlreadyRegistered);
        setIsAuthSubmitting(false);
        return;
      }

      setAuthStatus(copy.checkEmailToConfirm);
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
    if (!supabase) {
      setAuthStatus(copy.supabaseMissing);
      return;
    }
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

  return (
    <div className={styles.screen}>
      <form className={styles.card} onSubmit={handleAuthSubmit}>
        <div className={styles.heading}>
          <span>{copy.authTitle}</span>
          <button type="button" onClick={onClose}>
            x
          </button>
        </div>
        {!isSupabaseConfigured ? <p className={styles.message}>{copy.supabaseMissing}</p> : null}
        <div className={styles.modeSwitch}>
          <button
            type="button"
            className={authMode === "sign_in" ? styles.active : ""}
            onClick={() => {
              setAuthMode("sign_in");
              setAuthStatus("");
            }}
          >
            {copy.signIn}
          </button>
          <button
            type="button"
            className={authMode === "sign_up" ? styles.active : ""}
            onClick={() => {
              setAuthMode("sign_up");
              setAuthStatus("");
            }}
          >
            {copy.signUp}
          </button>
        </div>
        {authMode === "sign_up" ? (
          <input value={authUsername} onChange={(event) => setAuthUsername(event.target.value)} placeholder={copy.username} />
        ) : null}
        <input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder={copy.email} required />
        {authMode !== "reset" ? (
          <input
            type="password"
            value={authPassword}
            onChange={(event) => setAuthPassword(event.target.value)}
            placeholder={copy.password}
            required
          />
        ) : null}
        <button
          type="submit"
          className={styles.submitButton}
          disabled={!isSupabaseConfigured || isAuthSubmitting || isGoogleAuthLoading || (authMode === "reset" && resetCooldown > 0)}
        >
          {isAuthSubmitting ? <ButtonSpinner /> : null}
          {authMode === "reset" && resetCooldown > 0
            ? `${copy.resetPassword} (${resetCooldown}s)`
            : authMode === "sign_up"
              ? copy.signUp
              : authMode === "reset"
                ? copy.resetPassword
                : copy.signIn}
        </button>
        <button
          type="button"
          className={styles.googleButton}
          onClick={signInWithGoogle}
          disabled={!isSupabaseConfigured || isAuthSubmitting || isGoogleAuthLoading}
        >
          {isGoogleAuthLoading ? <ButtonSpinner /> : null}
          {copy.googleSignIn}
        </button>
        {authMode === "reset" && resetCooldown > 0 ? (
          <p className={styles.message}>{copy.resetCooldownMessage.replace("{seconds}", String(resetCooldown))}</p>
        ) : authStatus ? (
          <p className={styles.message}>{authStatus}</p>
        ) : null}
        <button
          type="button"
          className={styles.forgotLink}
          onClick={() => {
            setAuthMode(authMode === "reset" ? "sign_in" : "reset");
            setAuthStatus("");
          }}
        >
          {authMode === "reset" ? copy.backToSignIn : copy.forgotPassword}
        </button>
      </form>
    </div>
  );
}
