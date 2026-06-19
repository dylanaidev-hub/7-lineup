import type { User } from "@supabase/supabase-js";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import type { LandingLanguage } from "./LandingPage";
import styles from "./PublicSiteHeader.module.css";

type PublicSiteHeaderProps = {
  language: LandingLanguage;
  onChangeLanguage: (language: LandingLanguage) => void;
  onExplore: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  user: User | null;
  isAuthLoading: boolean;
  onSignOut: () => void;
  authLabels: { signIn: string; signUp: string; signOut: string };
};

const copy = {
  vi: { brand: "Đội Hình Sân Cỏ", home: "Trang chủ", lineup: "Tạo đội hình", tactics: "Vẽ sa bàn", news: "Tin tức", about: "Về chúng tôi", tool: "Vào công cụ" },
  en: { brand: "Lineup Football", home: "Home", lineup: "Lineup", tactics: "Tactics", news: "News", about: "About", tool: "Open workspace" },
};

export function PublicSiteHeader(props: PublicSiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const c = copy[props.language];
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={styles.header}>
      <NavLink to="/" className={styles.brand} onClick={closeMenu}>
        <img src="/favicon.svg" alt="" className={styles.logo} />
        <span>{c.brand}</span>
      </NavLink>

      <button
        type="button"
        className={styles.menuButton}
        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      <div className={`${styles.panel} ${menuOpen ? styles.panelOpen : ""}`}>
        <nav className={styles.navigation} aria-label="Main navigation">
          <NavLink to="/" end onClick={closeMenu} className={({ isActive }) => (isActive ? styles.active : undefined)}>
            {c.home}
          </NavLink>
          <NavLink
            to="/tinh-nang/tao-doi-hinh"
            onClick={closeMenu}
            className={({ isActive }) => (isActive ? styles.active : undefined)}
          >
            {c.lineup}
          </NavLink>
          <NavLink
            to="/tinh-nang/ve-sa-ban"
            onClick={closeMenu}
            className={({ isActive }) => (isActive ? styles.active : undefined)}
          >
            {c.tactics}
          </NavLink>
          <NavLink
            to="/tin-tuc"
            onClick={closeMenu}
            className={({ isActive }) => (isActive ? styles.active : undefined)}
          >
            {c.news}
          </NavLink>
          <NavLink
            to="/ve-chung-toi"
            onClick={closeMenu}
            className={({ isActive }) => (isActive ? styles.active : undefined)}
          >
            {c.about}
          </NavLink>
        </nav>

        <div className={styles.actions}>
          {props.isAuthLoading ? null : props.user ? (
            <>
              <span className={styles.email}>{props.user.email}</span>
              <button type="button" className={styles.primaryButton} onClick={props.onExplore}>{c.tool}</button>
              <button type="button" className={styles.button} onClick={props.onSignOut}>{props.authLabels.signOut}</button>
            </>
          ) : (
            <>
              <button type="button" className={styles.button} onClick={props.onSignIn}>{props.authLabels.signIn}</button>
              <button type="button" className={styles.primaryButton} onClick={props.onSignUp}>{props.authLabels.signUp}</button>
            </>
          )}
          <button
            type="button"
            className={styles.languageButton}
            onClick={() => props.onChangeLanguage(props.language === "vi" ? "en" : "vi")}
            aria-label="Change language"
          >
            {props.language === "vi" ? "VI" : "EN"}
          </button>
        </div>
      </div>
    </header>
  );
}
