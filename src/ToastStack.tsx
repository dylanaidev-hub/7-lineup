import { Check } from "lucide-react";

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
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`} role="status">
          {toast.tone === "success" ? <Check size={16} /> : null}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
