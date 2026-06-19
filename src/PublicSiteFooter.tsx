import { FacebookLogo } from "@phosphor-icons/react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { LandingLanguage } from "./LandingPage";
import styles from "./PublicSiteFooter.module.css";

const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61566073424531";

const copy = {
  vi: {
    description: "Công cụ trực quan để xếp đội hình, vẽ sa bàn và mô phỏng chuyển động cho bóng đá phong trào.",
    features: "Tính năng",
    company: "Khám phá",
    lineup: "Tạo đội hình",
    tactics: "Vẽ sa bàn",
    animation: "Tạo chuyển động",
    news: "Tin tức & Kiến thức",
    about: "Về chúng tôi",
    open: "Mở công cụ",
    copyright: "Đội Hình Sân Cỏ. Dựng đội hình, lên chiến thuật, ra sân.",
    credit: "Copyright by dylan.aidev",
    facebook: "Facebook Đội Hình Sân Cỏ",
  },
  en: {
    description: "A visual workspace for building lineups, drawing tactics and animating movement in amateur football.",
    features: "Features",
    company: "Explore",
    lineup: "Create lineup",
    tactics: "Draw tactics board",
    animation: "Create animation",
    news: "News & Knowledge",
    about: "About us",
    open: "Open workspace",
    copyright: "Lineup Football. Build the lineup, plan the tactics, hit the pitch.",
    credit: "Copyright by dylan.aidev",
    facebook: "Lineup Football on Facebook",
  },
};

export function PublicSiteFooter({ language, onExplore }: { language: LandingLanguage; onExplore: () => void }) {
  const c = copy[language];

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandBlock}>
          <Link to="/" className={styles.brand}>
            DOIHINHSANCO
          </Link>
          <p>{c.description}</p>
        </div>

        <nav aria-label={c.features}>
          <strong>{c.features}</strong>
          <Link to="/tinh-nang/tao-doi-hinh">{c.lineup}</Link>
          <Link to="/tinh-nang/ve-sa-ban">{c.tactics}</Link>
          <Link to="/tinh-nang/tao-chuyen-dong">{c.animation}</Link>
        </nav>

        <nav aria-label={c.company}>
          <strong>{c.company}</strong>
          <Link to="/tin-tuc">{c.news}</Link>
          <Link to="/ve-chung-toi">{c.about}</Link>
          <button type="button" onClick={onExplore}>{c.open}<ArrowUpRight size={15} /></button>
        </nav>
      </div>

      <div className={styles.bottom}>
        <div className={styles.bottomMeta}>
          <span>© {new Date().getFullYear()} {c.copyright}</span>
          <span className={styles.credit}>{c.credit}</span>
        </div>
        <div className={styles.social}>
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.socialLink}
            aria-label={c.facebook}
          >
            <FacebookLogo size={20} weight="fill" aria-hidden="true" />
            <span>Facebook</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
