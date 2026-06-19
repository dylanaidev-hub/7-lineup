import type { FormEvent } from "react";
import { X } from "lucide-react";
import styles from "./AuthDialog.module.css";

type RecoveryCopy = {
  authTitle: string;
  supabaseMissing: string;
  setNewPasswordTitle: string;
  setNewPasswordHint: string;
  newPassword: string;
  confirmPassword: string;
  updatePassword: string;
  signIn: string;
  passwordUpdated: string;
  recoveryLinkExpired: string;
  requestNewLink: string;
};

type PasswordRecoveryDialogProps = {
  copy: RecoveryCopy;
  authHashErrorMessage: string | null;
  isPasswordRecovery: boolean;
  isRecoveryExpiryError: boolean;
  isSupabaseConfigured: boolean;
  recoveryDone: boolean;
  recoveryPassword: string;
  recoveryConfirm: string;
  recoveryStatus: string;
  isRecoverySubmitting: boolean;
  onRecoveryPasswordChange: (value: string) => void;
  onRecoveryConfirmChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onRequestNewResetLink: () => void;
  onOpenSignIn: () => void;
};

function ButtonSpinner() {
  return <span className="button-spinner" aria-hidden="true" />;
}

export function PasswordRecoveryDialog({
  copy,
  authHashErrorMessage,
  isPasswordRecovery,
  isRecoveryExpiryError,
  isSupabaseConfigured,
  recoveryDone,
  recoveryPassword,
  recoveryConfirm,
  recoveryStatus,
  isRecoverySubmitting,
  onRecoveryPasswordChange,
  onRecoveryConfirmChange,
  onSubmit,
  onClose,
  onRequestNewResetLink,
  onOpenSignIn,
}: PasswordRecoveryDialogProps) {
  return (
    <div className={styles.screen}>
      <form className={styles.card} onSubmit={onSubmit} role="dialog" aria-modal="true" aria-labelledby="recovery-dialog-title">
        <div className={styles.heading}>
          <span id="recovery-dialog-title">{isPasswordRecovery || isRecoveryExpiryError ? copy.setNewPasswordTitle : copy.authTitle}</span>
          <button type="button" onClick={onClose} aria-label="Đóng">
            <X size={17} strokeWidth={2.5} />
          </button>
        </div>
        {!isSupabaseConfigured ? <p className={styles.message}>{copy.supabaseMissing}</p> : null}
        {authHashErrorMessage && !isPasswordRecovery ? (
          isRecoveryExpiryError ? (
            <>
              <p className={styles.message}>{copy.recoveryLinkExpired}</p>
              <button type="button" onClick={onRequestNewResetLink}>
                {copy.requestNewLink}
              </button>
            </>
          ) : (
            <>
              <p className={styles.message}>{authHashErrorMessage}</p>
              <button type="button" onClick={onOpenSignIn}>
                {copy.signIn}
              </button>
            </>
          )
        ) : recoveryDone ? (
          <>
            <p className={styles.message}>{copy.passwordUpdated}</p>
            <button type="button" onClick={onClose}>
              {copy.signIn}
            </button>
          </>
        ) : (
          <>
            <p className={styles.message}>{copy.setNewPasswordHint}</p>
            <input
              type="password"
              value={recoveryPassword}
              onChange={(event) => onRecoveryPasswordChange(event.target.value)}
              placeholder={copy.newPassword}
              required
            />
            <input
              type="password"
              value={recoveryConfirm}
              onChange={(event) => onRecoveryConfirmChange(event.target.value)}
              placeholder={copy.confirmPassword}
              required
            />
            <button type="submit" className={styles.submitButton} disabled={!isSupabaseConfigured || isRecoverySubmitting}>
              {isRecoverySubmitting ? <ButtonSpinner /> : null}
              {copy.updatePassword}
            </button>
            {recoveryStatus ? <p className={styles.message}>{recoveryStatus}</p> : null}
          </>
        )}
      </form>
    </div>
  );
}
