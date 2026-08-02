import type { MouseEvent } from "react";
import { Navigation } from "lucide-react";
import styles from "./TeamPages.module.css";

type MatchMapDirectionsLinkProps = {
  href: string;
  className?: string;
  iconSize?: number;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export function MatchMapDirectionsLink({
  href,
  className,
  iconSize = 14,
  onClick,
}: MatchMapDirectionsLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={[styles.matchMapDirectionsLink, className].filter(Boolean).join(" ")}
      aria-label="Chỉ đường trên Google Maps"
      title="Chỉ đường Google Maps"
      onClick={onClick}
    >
      <Navigation size={iconSize} aria-hidden="true" />
    </a>
  );
}
