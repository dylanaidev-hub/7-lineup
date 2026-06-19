import type { User } from "@supabase/supabase-js";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { PublicSiteFooter } from "./PublicSiteFooter";
import { PublicSiteHeader } from "./PublicSiteHeader";
import { SeoHead, seoSiteUrl } from "./SeoHead";
import { usePrerenderReady } from "./hooks/usePrerenderReady";
import styles from "./LandingPage.module.css";

export type LandingLanguage = "vi" | "en";

type LandingFeature = { icon: string; title: string; desc: string };
type LandingStep = { title: string; desc: string };
type LandingMode = { label: string; title: string; desc: string; href: string };

type LandingCopy = {
  brand: string;
  eyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  explore: string;
  featuresTitle: string;
  features: LandingFeature[];
  workflowEyebrow: string;
  workflowTitle: string;
  workflowSteps: LandingStep[];
  modesEyebrow: string;
  modesTitle: string;
  modesIntro: string;
  modes: LandingMode[];
  learnMore: string;
  footer: string;
};

const landingCopy: Record<LandingLanguage, LandingCopy> = {
  vi: {
    brand: "Đội Hình Sân Cỏ",
    eyebrow: "Công cụ xếp đội hình & chiến thuật bóng đá",
    heroTitle: "Dựng đội hình sân cỏ chỉ trong vài giây",
    heroSubtitle:
      "Tạo đội hình sân 5, 7, 11 hoặc tuỳ chỉnh, dựng bảng chiến thuật động và chia sẻ với cả đội — tất cả trên một công cụ duy nhất.",
    explore: "Khám phá",
    featuresTitle: "Mọi thứ bạn cần cho ngày ra sân",
    features: [
      { icon: "⚽", title: "Đội hình linh hoạt", desc: "Sân 5, 7, 11 hoặc tuỳ chỉnh. Kéo thả cầu thủ, đặt tên và đổi sơ đồ tức thì." },
      { icon: "🎬", title: "Bảng chiến thuật động", desc: "Dựng từng bước di chuyển rồi chạy hoạt ảnh để xem bài phối hợp." },
      { icon: "🗄️", title: "Phòng thay đồ", desc: "Lưu đội hình & chiến thuật theo tài khoản, mở lại bất cứ lúc nào." },
      { icon: "🔗", title: "Chia sẻ tức thì", desc: "Tạo link hoặc ảnh đội hình để gửi nhanh cho cả đội." },
    ],
    workflowEyebrow: "Một quy trình liền mạch",
    workflowTitle: "Từ danh sách cầu thủ đến kế hoạch thi đấu trong ba bước",
    workflowSteps: [
      { title: "Chọn sân và đội hình", desc: "Bắt đầu với sân 5, 7, 11 hoặc số lượng cầu thủ tùy chỉnh phù hợp buổi đá thực tế." },
      { title: "Sắp xếp ý tưởng trên sân", desc: "Kéo cầu thủ, đối thủ và bóng; thêm tên, nét vẽ hoặc từng bước chuyển động chiến thuật." },
      { title: "Chia sẻ với cả đội", desc: "Tải ảnh hoặc gửi đường link để mọi người xem cùng một đội hình trước giờ bóng lăn." },
    ],
    modesEyebrow: "Ba chế độ, một mặt sân",
    modesTitle: "Chọn đúng cách thể hiện cho điều bạn muốn nói",
    modesIntro: "Giữ nguyên bối cảnh trận đấu và chuyển nhanh giữa xếp người, vẽ ý đồ hoặc mô phỏng cả pha bóng.",
    modes: [
      { label: "01", title: "Tạo đội hình", desc: "Chốt vị trí, tên cầu thủ đá chính và dự bị trên một sơ đồ rõ ràng.", href: "/tinh-nang/tao-doi-hinh" },
      { label: "02", title: "Vẽ sa bàn", desc: "Đánh dấu hướng chạy, đường chuyền và khu vực pressing trực tiếp trên sân.", href: "/tinh-nang/ve-sa-ban" },
      { label: "03", title: "Tạo chuyển động", desc: "Lưu từng bước và phát lại chuỗi di chuyển của cầu thủ, đối thủ và bóng.", href: "/tinh-nang/tao-chuyen-dong" },
    ],
    learnMore: "Tìm hiểu thêm",
    footer: "Đội Hình Sân Cỏ — dựng đội hình, lên chiến thuật, ra sân.",
  },
  en: {
    brand: "Lineup Football",
    eyebrow: "Football line-up & tactics tool",
    heroTitle: "Build your match-day line-up in seconds",
    heroSubtitle:
      "Create 5, 7, 11-a-side or custom line-ups, design animated tactics boards and share with your whole team — all in one tool.",
    explore: "Explore",
    featuresTitle: "Everything you need for match day",
    features: [
      { icon: "⚽", title: "Flexible line-ups", desc: "5, 7, 11-a-side or custom. Drag players, name them and switch formations instantly." },
      { icon: "🎬", title: "Animated tactics board", desc: "Build movement step by step then play the animation to review your plays." },
      { icon: "🗄️", title: "Locker room", desc: "Save line-ups & tactics to your account and reopen them anytime." },
      { icon: "🔗", title: "Instant sharing", desc: "Generate a link or image of your line-up to send to the team." },
    ],
    workflowEyebrow: "One connected workflow",
    workflowTitle: "From player list to match plan in three steps",
    workflowSteps: [
      { title: "Choose a pitch and formation", desc: "Start with 5, 7, 11-a-side or a custom player count that matches the session." },
      { title: "Arrange the idea on the pitch", desc: "Move players, opponents and the ball; add names, drawing or animated tactical steps." },
      { title: "Share it with the team", desc: "Download an image or send a link so everyone sees the same plan before kick-off." },
    ],
    modesEyebrow: "Three modes, one pitch",
    modesTitle: "Choose the right way to express the idea",
    modesIntro: "Keep the match context in place while switching between selection, drawing and full movement sequences.",
    modes: [
      { label: "01", title: "Create lineup", desc: "Confirm positions, starters and substitutes in one clear formation.", href: "/tinh-nang/tao-doi-hinh" },
      { label: "02", title: "Draw tactics", desc: "Mark runs, passing lanes and pressing areas directly on the pitch.", href: "/tinh-nang/ve-sa-ban" },
      { label: "03", title: "Create animation", desc: "Save each step and replay the movement of players, opponents and the ball.", href: "/tinh-nang/tao-chuyen-dong" },
    ],
    learnMore: "Learn more",
    footer: "Lineup Football — build the line-up, plan the tactics, hit the pitch.",
  },
};

type LandingPageProps = {
  language: LandingLanguage;
  onChangeLanguage: (language: LandingLanguage) => void;
  onExplore: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  user: User | null;
  isAuthLoading: boolean;
  onSignOut: () => void;
  authLabels: {
    signIn: string;
    signUp: string;
    signOut: string;
  };
};

export function LandingPage({
  language,
  onChangeLanguage,
  onExplore,
  onSignIn,
  onSignUp,
  user,
  isAuthLoading,
  onSignOut,
  authLabels,
}: LandingPageProps) {
  const c = landingCopy[language];
  usePrerenderReady(true);
  const cx = (...classNames: string[]) => classNames.map((className) => styles[className]).filter(Boolean).join(" ");

  return (
    <main className={styles.landing}>
      <SeoHead
        title="Đội Hình Sân Cỏ - Tạo đội hình và chiến thuật bóng đá"
        description="Công cụ miễn phí giúp tạo đội hình sân 5, 7, 11, vẽ sa bàn chiến thuật, mô phỏng chuyển động và chia sẻ với đồng đội."
        path="/"
        structuredData={[
          { "@context": "https://schema.org", "@type": "WebSite", name: "Đội Hình Sân Cỏ", url: seoSiteUrl, inLanguage: "vi-VN" },
          { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Đội Hình Sân Cỏ", applicationCategory: "SportsApplication", operatingSystem: "Web", url: seoSiteUrl, offers: { "@type": "Offer", price: "0", priceCurrency: "VND" } },
        ]}
      />
      <PublicSiteHeader
        language={language}
        onChangeLanguage={onChangeLanguage}
        onExplore={onExplore}
        onSignIn={onSignIn}
        onSignUp={onSignUp}
        user={user}
        isAuthLoading={isAuthLoading}
        onSignOut={onSignOut}
        authLabels={authLabels}
      />

      <section className={styles["landing-hero"]}>
        <div className={styles["landing-hero-content"]}>
          <p className={styles["landing-eyebrow"]}>{c.eyebrow}</p>
          <h1 className={styles["landing-title"]}>{c.heroTitle}</h1>
          <p className={styles["landing-subtitle"]}>{c.heroSubtitle}</p>
          <button type="button" className={styles["landing-cta"]} onClick={onExplore}>
            {c.explore}
            <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className={styles["landing-hero-visual"]} aria-hidden="true">
          <div className={styles["landing-pitch"]}>
            <span className={cx("landing-pitch-line", "landing-pitch-halfway")} />
            <span className={styles["landing-pitch-circle"]} />
            <span className={cx("landing-pitch-box", "landing-pitch-box-top")} />
            <span className={cx("landing-pitch-box", "landing-pitch-box-bottom")} />
            {[
              { x: 50, y: 90 },
              { x: 26, y: 70 },
              { x: 74, y: 70 },
              { x: 50, y: 58 },
              { x: 20, y: 42 },
              { x: 50, y: 36 },
              { x: 80, y: 42 },
              { x: 36, y: 18 },
              { x: 64, y: 18 },
            ].map((dot, index) => (
              <span
                key={index}
                className={cx("landing-pitch-dot", ...(index === 0 ? ["landing-pitch-dot-keeper"] : []))}
                style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
              />
            ))}
            <span className={styles["landing-pitch-ball"]} />
          </div>
        </div>
      </section>

      <section className={styles["landing-features"]}>
        <h2 className={styles["landing-features-title"]}>{c.featuresTitle}</h2>
        <div className={styles["landing-feature-grid"]}>
          {c.features.map((feature) => (
            <article key={feature.title} className={styles["landing-feature-card"]}>
              <span className={styles["landing-feature-icon"]} aria-hidden="true">
                {feature.icon}
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </article>
          ))}
        </div>
        <button type="button" className={cx("landing-cta", "landing-cta-secondary")} onClick={onExplore}>
          {c.explore}
          <span aria-hidden="true">→</span>
        </button>
      </section>

      <section className={styles["landing-workflow"]}>
        <div className={styles["landing-section-heading"]}>
          <p>{c.workflowEyebrow}</p>
          <h2>{c.workflowTitle}</h2>
        </div>
        <div className={styles["landing-workflow-list"]}>
          {c.workflowSteps.map((step, index) => (
            <article key={step.title}>
              <span>0{index + 1}</span>
              <div><h3>{step.title}</h3><p>{step.desc}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles["landing-modes"]}>
        <div className={styles["landing-modes-intro"]}>
          <p className={styles["landing-section-eyebrow"]}>{c.modesEyebrow}</p>
          <h2>{c.modesTitle}</h2>
          <p>{c.modesIntro}</p>
        </div>
        <div className={styles["landing-mode-list"]}>
          {c.modes.map((mode) => (
            <Link key={mode.href} to={mode.href}>
              <span>{mode.label}</span>
              <div><h3>{mode.title}</h3><p>{mode.desc}</p></div>
              <strong>{c.learnMore}<ArrowRight size={17} /></strong>
            </Link>
          ))}
        </div>
      </section>

      <PublicSiteFooter language={language} onExplore={onExplore} />
    </main>
  );
}
