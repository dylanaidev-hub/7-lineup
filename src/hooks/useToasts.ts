import { useCallback, useRef, useState } from "react";
import type { ToastMessage } from "../ToastStack";

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [notifications, setNotifications] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);

  const showToast = useCallback((message: string, tone: ToastMessage["tone"] = "success") => {
    if (!message) return;

    const id = (toastIdRef.current += 1);
    const nextMessage = { id, message, tone };
    setToasts((current) => [...current, nextMessage]);
    setNotifications((current) => [nextMessage, ...current].slice(0, 20));
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  return { toasts, notifications, showToast };
}
