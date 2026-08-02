import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "danger";
export type ButtonSize = "md" | "sm" | "panel";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  fullWidthMobile?: boolean;
  loading?: boolean;
  leadingIcon?: ReactNode;
  labelClassName?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  fullWidthMobile = false,
  loading = false,
  disabled,
  leadingIcon,
  labelClassName,
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const iconSize = size === "md" ? 18 : 15;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={[
        styles.button,
        styles[variant],
        styles[size],
        fullWidth ? styles.fullWidth : "",
        fullWidthMobile ? styles.fullWidthMobile : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {loading ? (
        <Loader2 className={styles.spinner} size={iconSize} aria-hidden="true" />
      ) : (
        leadingIcon
      )}
      {children != null && children !== false ? (
        <span className={[styles.label, labelClassName].filter(Boolean).join(" ")}>{children}</span>
      ) : null}
    </button>
  );
}
