import type { User } from "@supabase/supabase-js";

export type LandingLanguage = "vi" | "en";

type LandingFeature = { icon: string; title: string; desc: string };

type LandingCopy = {
  brand: string;
  eyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  explore: string;
  featuresTitle: string;
  features: LandingFeature[];
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

  return (
    <main className="landing">
      <header className="landing-nav">
        <div className="landing-brand">
          <span className="landing-logo">⚽</span>
          <span>{c.brand}</span>
        </div>
        <div className="landing-nav-actions">
          {isAuthLoading ? null : user ? (
            <div className="landing-user">
              <span className="landing-user-email">{user.email}</span>
              <button type="button" className="landing-auth-btn landing-auth-btn-primary" onClick={onExplore}>
                {c.explore}
              </button>
              <button type="button" className="landing-auth-btn" onClick={onSignOut}>
                {authLabels.signOut}
              </button>
            </div>
          ) : (
            <>
              <button type="button" className="landing-auth-btn" onClick={onSignIn}>
                {authLabels.signIn}
              </button>
              <button type="button" className="landing-auth-btn landing-auth-btn-primary" onClick={onSignUp}>
                {authLabels.signUp}
              </button>
            </>
          )}
          <button
            type="button"
            className="landing-lang"
            onClick={() => onChangeLanguage(language === "vi" ? "en" : "vi")}
          >
            {language === "vi" ? "🇻🇳 VI" : "🇺🇸 EN"}
          </button>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-content">
          <p className="landing-eyebrow">{c.eyebrow}</p>
          <h1 className="landing-title">{c.heroTitle}</h1>
          <p className="landing-subtitle">{c.heroSubtitle}</p>
          <button type="button" className="landing-cta" onClick={onExplore}>
            {c.explore}
            <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="landing-hero-visual" aria-hidden="true">
          <div className="landing-pitch">
            <span className="landing-pitch-line landing-pitch-halfway" />
            <span className="landing-pitch-circle" />
            <span className="landing-pitch-box landing-pitch-box-top" />
            <span className="landing-pitch-box landing-pitch-box-bottom" />
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
                className={`landing-pitch-dot${index === 0 ? " landing-pitch-dot-keeper" : ""}`}
                style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
              />
            ))}
            <span className="landing-pitch-ball" />
          </div>
        </div>
      </section>

      <section className="landing-features">
        <h2 className="landing-features-title">{c.featuresTitle}</h2>
        <div className="landing-feature-grid">
          {c.features.map((feature) => (
            <article key={feature.title} className="landing-feature-card">
              <span className="landing-feature-icon" aria-hidden="true">
                {feature.icon}
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </article>
          ))}
        </div>
        <button type="button" className="landing-cta landing-cta-secondary" onClick={onExplore}>
          {c.explore}
          <span aria-hidden="true">→</span>
        </button>
      </section>

      <footer className="landing-footer">{c.footer}</footer>
    </main>
  );
}
