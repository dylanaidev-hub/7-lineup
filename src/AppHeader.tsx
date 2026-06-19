import type { RefObject } from "react";
import type { User } from "@supabase/supabase-js";
import { ChevronDown } from "lucide-react";
import styles from "./AppHeader.module.css";

type LanguageMeta = {
  flag: string;
  label: string;
  next: "vi" | "en";
};

type AppHeaderCopy = {
  switchLanguage: string;
  signIn: string;
  profileMenu: string;
  lockerMenu: string;
  signOut: string;
};

type AppHeaderProps = {
  copy: AppHeaderCopy;
  user: User | null;
  languageMeta: LanguageMeta;
  isUserMenuOpen: boolean;
  userMenuRef: RefObject<HTMLDivElement | null>;
  onSwitchLanguage: () => void;
  onOpenSignIn: () => void;
  onToggleUserMenu: () => void;
  onOpenProfile: () => void;
  onOpenLocker: () => void;
  onSignOut: () => void;
};

export function AppHeader({
  copy,
  user,
  languageMeta,
  isUserMenuOpen,
  userMenuRef,
  onSwitchLanguage,
  onOpenSignIn,
  onToggleUserMenu,
  onOpenProfile,
  onOpenLocker,
  onSignOut,
}: AppHeaderProps) {
  return (
    <header className={`${styles.titleBar} mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-3 shadow-2xl`}>
      <div className={styles.actions}>
        <button type="button" className={styles.languageSwitch} onClick={onSwitchLanguage} aria-label={copy.switchLanguage}>
          <span aria-hidden="true">{languageMeta.flag}</span>
          {languageMeta.label}
        </button>
        {!user ? (
          <button type="button" className={styles.loginButton} onClick={onOpenSignIn}>
            {copy.signIn}
          </button>
        ) : (
          <div ref={userMenuRef} className={styles.userMenu}>
            <span>{user.email}</span>
            <button type="button" className={styles.dropdownButton} onClick={onToggleUserMenu}>
              <ChevronDown size={16} />
            </button>
            {isUserMenuOpen ? (
              <div className={styles.userDropdown}>
                <button type="button" onClick={onOpenProfile}>
                  {copy.profileMenu}
                </button>
                <button type="button" onClick={onOpenLocker}>
                  {copy.lockerMenu}
                </button>
                <button type="button" onClick={onSignOut}>
                  {copy.signOut}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
      <h1 className={styles.title}>Line Up Football</h1>
    </header>
  );
}
