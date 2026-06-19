import type { User } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import type { LandingLanguage } from "./LandingPage";
import { PublicSiteFooter } from "./PublicSiteFooter";
import { PublicSiteHeader } from "./PublicSiteHeader";
import styles from "./PublicSiteShell.module.css";

type PublicSiteShellProps = {
  language: LandingLanguage;
  onChangeLanguage: () => void;
  onExplore: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  user: User | null;
  isAuthLoading: boolean;
  onSignOut: () => void | Promise<void>;
  authLabels: { signIn: string; signUp: string; signOut: string };
  children: ReactNode;
};

export function PublicSiteShell({ children, ...headerProps }: PublicSiteShellProps) {
  return (
    <div className={styles.shell}>
      <PublicSiteHeader {...headerProps} />
      {children}
      <PublicSiteFooter language={headerProps.language} onExplore={headerProps.onExplore} />
    </div>
  );
}
