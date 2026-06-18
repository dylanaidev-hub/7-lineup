import { isSupabaseConfigured } from "./lib/supabaseClient";
import { useAuthDialogForm } from "./hooks/useAuthDialogForm";
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

function ButtonSpinner() {
  return <span className="button-spinner" aria-hidden="true" />;
}

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
  const {
    authMode, authEmail, authPassword, authUsername, authStatus, isAuthSubmitting,
    isGoogleAuthLoading, resetCooldown, setAuthEmail, setAuthPassword, setAuthUsername,
    handleAuthSubmit, signInWithGoogle, changeMode,
  } = useAuthDialogForm({ initialMode, copy, onClose, onAuthenticated });

  return (
    <div className={styles.screen}>
      <form className={styles.card} onSubmit={handleAuthSubmit}>
        <div className={styles.heading}>
          <span>{copy.authTitle}</span>
          <button type="button" onClick={onClose}>x</button>
        </div>
        {!isSupabaseConfigured ? <p className={styles.message}>{copy.supabaseMissing}</p> : null}
        <div className={styles.modeSwitch}>
          <button type="button" className={authMode === "sign_in" ? styles.active : ""} onClick={() => changeMode("sign_in")}>
            {copy.signIn}
          </button>
          <button type="button" className={authMode === "sign_up" ? styles.active : ""} onClick={() => changeMode("sign_up")}>
            {copy.signUp}
          </button>
        </div>
        {authMode === "sign_up" ? (
          <input value={authUsername} onChange={(event) => setAuthUsername(event.target.value)} placeholder={copy.username} />
        ) : null}
        <input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder={copy.email} required />
        {authMode !== "reset" ? (
          <input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder={copy.password} required />
        ) : null}
        <button
          type="submit"
          className={styles.submitButton}
          disabled={!isSupabaseConfigured || isAuthSubmitting || isGoogleAuthLoading || (authMode === "reset" && resetCooldown > 0)}
        >
          {isAuthSubmitting ? <ButtonSpinner /> : null}
          {authMode === "reset" && resetCooldown > 0
            ? `${copy.resetPassword} (${resetCooldown}s)`
            : authMode === "sign_up" ? copy.signUp : authMode === "reset" ? copy.resetPassword : copy.signIn}
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
        ) : authStatus ? <p className={styles.message}>{authStatus}</p> : null}
        <button type="button" className={styles.forgotLink} onClick={() => changeMode(authMode === "reset" ? "sign_in" : "reset")}>
          {authMode === "reset" ? copy.backToSignIn : copy.forgotPassword}
        </button>
      </form>
    </div>
  );
}
