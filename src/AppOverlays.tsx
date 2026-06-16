import type { FormEvent } from "react";
import { AuthDialog } from "./AuthDialog";
import { PasswordRecoveryDialog } from "./PasswordRecoveryDialog";

type OverlayLanguage = "vi" | "en";
type AuthDialogMode = "sign_in" | "sign_up" | "reset";

type RecoveryCopy = Parameters<typeof PasswordRecoveryDialog>[0]["copy"];

type AppOverlaysProps = {
  copy: RecoveryCopy;
  language: OverlayLanguage;
  authHashErrorMessage: string | null;
  isPasswordRecovery: boolean;
  hasAuthHashError: boolean;
  isRecoveryExpiryError: boolean;
  isSupabaseConfigured: boolean;
  recoveryDone: boolean;
  recoveryPassword: string;
  recoveryConfirm: string;
  recoveryStatus: string;
  isRecoverySubmitting: boolean;
  isAuthScreenOpen: boolean;
  authDialogMode: AuthDialogMode;
  onRecoveryPasswordChange: (value: string) => void;
  onRecoveryConfirmChange: (value: string) => void;
  onSubmitRecovery: (event: FormEvent<HTMLFormElement>) => void;
  onCloseRecovery: () => void;
  onRequestNewResetLink: () => void;
  onOpenSignInFromRecovery: () => void;
  onCloseAuth: () => void;
  onAuthenticated: () => void;
};

export function AppOverlays({
  copy,
  language,
  authHashErrorMessage,
  isPasswordRecovery,
  hasAuthHashError,
  isRecoveryExpiryError,
  isSupabaseConfigured,
  recoveryDone,
  recoveryPassword,
  recoveryConfirm,
  recoveryStatus,
  isRecoverySubmitting,
  isAuthScreenOpen,
  authDialogMode,
  onRecoveryPasswordChange,
  onRecoveryConfirmChange,
  onSubmitRecovery,
  onCloseRecovery,
  onRequestNewResetLink,
  onOpenSignInFromRecovery,
  onCloseAuth,
  onAuthenticated,
}: AppOverlaysProps) {
  return (
    <>
      {isPasswordRecovery || hasAuthHashError ? (
        <PasswordRecoveryDialog
          copy={copy}
          authHashErrorMessage={authHashErrorMessage}
          isPasswordRecovery={isPasswordRecovery}
          isRecoveryExpiryError={isRecoveryExpiryError}
          isSupabaseConfigured={isSupabaseConfigured}
          recoveryDone={recoveryDone}
          recoveryPassword={recoveryPassword}
          recoveryConfirm={recoveryConfirm}
          recoveryStatus={recoveryStatus}
          isRecoverySubmitting={isRecoverySubmitting}
          onRecoveryPasswordChange={onRecoveryPasswordChange}
          onRecoveryConfirmChange={onRecoveryConfirmChange}
          onSubmit={onSubmitRecovery}
          onClose={onCloseRecovery}
          onRequestNewResetLink={onRequestNewResetLink}
          onOpenSignIn={onOpenSignInFromRecovery}
        />
      ) : null}
      {isAuthScreenOpen ? (
        <AuthDialog language={language} initialMode={authDialogMode} onClose={onCloseAuth} onAuthenticated={onAuthenticated} />
      ) : null}
    </>
  );
}
