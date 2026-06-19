import type { User } from "@supabase/supabase-js";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import type { LandingLanguage } from "./LandingPage";
import { copyByLanguage } from "./appI18n";
import { getLanguageMeta } from "./languagePreference";
import styles from "./PublicSiteHeader.module.css";

type PublicSiteHeaderProps = {
  language: LandingLanguage;
  onChangeLanguage: () => void;
  onExplore: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  user: User | null;
  isAuthLoading: boolean;
  onSignOut: () => void;
  authLabels: { signIn: string; signUp: string; signOut: string };
};

const copy = {
  vi: { brand: "Đội Hình Sân Cỏ", home: "Trang chủ", features: "Tính năng", lineup: "Tạo đội hình", tactics: "Vẽ sa bàn", animation: "Tạo chuyển động", news: "Tin tức", about: "Về chúng tôi", tool: "Vào công cụ" },
  en: { brand: "Lineup Football", home: "Home", features: "Features", lineup: "Create lineup", tactics: "Draw tactics board", animation: "Create animation", news: "News", about: "About", tool: "Open workspace" },
};

export function PublicSiteHeader(props: PublicSiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const featureMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const c = copy[props.language];
  const languageMeta = getLanguageMeta(props.language);
  const switchLanguageLabel = copyByLanguage[props.language].switchLanguage;
  const closeMenu = () => {
    setMenuOpen(false);
    setFeaturesOpen(false);
  };
  const isFeaturesActive = location.pathname.startsWith("/tinh-nang/");

  useEffect(() => {
    if (!featuresOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!featureMenuRef.current?.contains(event.target as Node)) setFeaturesOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [featuresOpen]);

  return (
    <header className={styles.header}>
      <NavLink to="/" className={styles.brand} onClick={closeMenu}>
        <img src="/site-logo.png?v=2" alt={c.brand} className={styles.logo} />
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
          <div className={styles.featureMenu} ref={featureMenuRef}>
            <button
              type="button"
              className={`${styles.featureTrigger} ${isFeaturesActive ? styles.active : ""}`}
              aria-expanded={featuresOpen}
              aria-haspopup="menu"
              onClick={() => setFeaturesOpen((open) => !open)}
            >
              {c.features}
              <ChevronDown size={16} className={featuresOpen ? styles.chevronOpen : ""} />
            </button>
            <div className={`${styles.featureDropdown} ${featuresOpen ? styles.featureDropdownOpen : ""}`} role="menu">
              <NavLink to="/tinh-nang/tao-doi-hinh" onClick={closeMenu} role="menuitem" className={({ isActive }) => (isActive ? styles.active : undefined)}>
                {c.lineup}
              </NavLink>
              <NavLink to="/tinh-nang/ve-sa-ban" onClick={closeMenu} role="menuitem" className={({ isActive }) => (isActive ? styles.active : undefined)}>
                {c.tactics}
              </NavLink>
              <NavLink to="/tinh-nang/tao-chuyen-dong" onClick={closeMenu} role="menuitem" className={({ isActive }) => (isActive ? styles.active : undefined)}>
                {c.animation}
              </NavLink>
            </div>
          </div>
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
            onClick={props.onChangeLanguage}
            aria-label={switchLanguageLabel}
          >
            <span aria-hidden="true">{languageMeta.flag}</span>
            {languageMeta.label}
          </button>
        </div>
      </div>
    </header>
  );
}
