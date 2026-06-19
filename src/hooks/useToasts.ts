import { useRef, useState } from "react";
import type { ToastMessage } from "../ToastStack";

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);

  const showToast = (message: string, tone: ToastMessage["tone"] = "success") => {
    if (!message) return;

    const id = (toastIdRef.current += 1);
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3000);
  };

  return { toasts, showToast };
}
