import { Check } from "lucide-react";
import styles from "./ToastStack.module.css";

export type ToastMessage = {
  id: number;
  message: string;
  tone: "success" | "error";
};

type ToastStackProps = {
  toasts: ToastMessage[];
};

export function ToastStack({ toasts }: ToastStackProps) {
  return (
    <div className={`${styles.stack} toast-stack`} aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} toast ${toast.tone === "error" ? `${styles.error} toast-error` : ""}`}
          role="status"
        >
          {toast.tone === "success" ? <Check size={16} /> : null}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
