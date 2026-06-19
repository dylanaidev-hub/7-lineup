import type { Icon, IconWeight } from "@phosphor-icons/react";
import styles from "./SiteIcon.module.css";

export type SiteIconVariant = "feature" | "check" | "principle" | "spotlight" | "card";

type SiteIconProps = {
  icon: Icon;
  variant?: SiteIconVariant;
  weight?: IconWeight;
  size?: number;
  className?: string;
};

const defaultSize: Record<SiteIconVariant, number> = {
  feature: 28,
  check: 22,
  principle: 26,
  spotlight: 56,
  card: 24,
};

export function SiteIcon({
  icon: IconComponent,
  variant = "feature",
  weight = "duotone",
  size,
  className,
}: SiteIconProps) {
  return (
    <span className={[styles.base, styles[variant], className].filter(Boolean).join(" ")} aria-hidden="true">
      <IconComponent size={size ?? defaultSize[variant]} weight={weight} />
    </span>
  );
}
