import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";

type PasswordRecoveryCopy = {
  supabaseMissing: string;
  passwordTooShort: string;
  passwordMismatch: string;
  passwordUpdated: string;
};

type UsePasswordRecoveryFlowOptions = {
  copy: PasswordRecoveryCopy;
  clearPasswordRecovery: () => void;
  localizeError: (message: string | undefined) => string;
  onOpenReset: () => void;
  onOpenSignIn: () => void;
};

export function usePasswordRecoveryFlow({
  copy,
  clearPasswordRecovery,
  localizeError,
  onOpenReset,
  onOpenSignIn,
}: UsePasswordRecoveryFlowOptions) {
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryConfirm, setRecoveryConfirm] = useState("");
  const [recoveryStatus, setRecoveryStatus] = useState("");
  const [recoveryDone, setRecoveryDone] = useState(false);
  const [isRecoverySubmitting, setIsRecoverySubmitting] = useState(false);

  const resetRecoveryState = () => {
    setRecoveryPassword("");
    setRecoveryConfirm("");
    setRecoveryStatus("");
    setRecoveryDone(false);
  };

  const handleUpdatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setRecoveryStatus(copy.supabaseMissing);
      return;
    }

    setRecoveryStatus("");
    const password = recoveryPassword.trim();
    const confirm = recoveryConfirm.trim();

    if (password.length < 6) {
      setRecoveryStatus(copy.passwordTooShort);
      return;
    }

    if (password !== confirm) {
      setRecoveryStatus(copy.passwordMismatch);
      return;
    }

    setIsRecoverySubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setRecoveryStatus(localizeError(error.message));
      setIsRecoverySubmitting(false);
      return;
    }

    setRecoveryStatus(copy.passwordUpdated);
    setRecoveryPassword("");
    setRecoveryConfirm("");
    setRecoveryDone(true);
    setIsRecoverySubmitting(false);
  };

  const closeRecoveryScreen = () => {
    resetRecoveryState();
    clearPasswordRecovery();
  };

  const requestNewResetLink = () => {
    closeRecoveryScreen();
    onOpenReset();
  };

  const openSignInFromRecovery = () => {
    closeRecoveryScreen();
    onOpenSignIn();
  };

  return {
    recoveryPassword,
    recoveryConfirm,
    recoveryStatus,
    recoveryDone,
    isRecoverySubmitting,
    setRecoveryPassword,
    setRecoveryConfirm,
    handleUpdatePassword,
    closeRecoveryScreen,
    requestNewResetLink,
    openSignInFromRecovery,
  };
}
