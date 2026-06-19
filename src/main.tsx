import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import ReactDOM, { type Root } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { AppLoadingScreen } from "./AppLoadingScreen";
import { AuthDialog } from "./AuthDialog";
import { LandingPage } from "./LandingPage";
import { NewsKnowledgePage } from "./NewsKnowledgePage";
import { NewsArticleDetailPage } from "./NewsArticleDetailPage";
import { PublicSiteShell } from "./PublicSiteShell";
import { PublicContentPage, type PublicPageKind } from "./PublicContentPage";
import { SeoHead } from "./SeoHead";
import { LanguageProvider, useLanguage } from "./LanguageContext";
import { useAuth } from "./hooks/useAuth";
import "./styles.css";

type AuthDialogMode = "sign_in" | "sign_up";

const CanvasApp = lazy(() => import("./App"));

const routeCopy = {
  vi: {
    signIn: "Đăng nhập",
    signUp: "Đăng ký",
    signOut: "Đăng xuất",
    loading: "Đang tải sân bóng...",
  },
  en: {
    signIn: "Sign in",
    signUp: "Sign up",
    signOut: "Sign out",
    loading: "Loading pitch...",
  },
} as const;

const hasLegacyAppRoute = (search: string, hash: string) => {
  const params = new URLSearchParams(search);
  return Boolean(
    params.get("lineup") ||
      params.get("tab") ||
      params.has("tactics") ||
      hash.includes("type=recovery") ||
      hash.includes("error"),
  );
};

const getLegacyAppPath = (search: string) => {
  const params = new URLSearchParams(search);
  if (params.get("tab") === "profile") return "/app/profile";
  if (params.get("tab") === "locker") return "/app/locker";
  return "/app/lineup";
};

function LegacyRouteRedirect() {
  const location = useLocation();
  const targetPath = getLegacyAppPath(location.search);
  const params = new URLSearchParams(location.search);
  if (params.get("tab") !== "tactics") {
    params.delete("tab");
  }
  const nextSearch = params.toString();
  return <Navigate to={`${targetPath}${nextSearch ? `?${nextSearch}` : ""}${location.hash}`} replace />;
}

function TacticsRouteRedirect() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  if (params.has("tactics") && params.get("tab") !== "tactics") {
    params.set("tab", "tactics");
  }
  const nextSearch = params.toString();
  return <Navigate to={`/app/lineup${nextSearch ? `?${nextSearch}` : "?pitch=7"}`} replace />;
}

function LandingRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, toggleLanguage } = useLanguage();
  const [authDialogMode, setAuthDialogMode] = useState<AuthDialogMode | null>(null);
  const { user, isAuthLoading, signOut } = useAuth();
  const shouldRedirectLegacyUrl = useMemo(
    () => hasLegacyAppRoute(location.search, location.hash),
    [location.search, location.hash],
  );

  if (shouldRedirectLegacyUrl) {
    return <LegacyRouteRedirect />;
  }

  const enterWorkspace = () => {
    navigate("/app/lineup?pitch=7");
  };

  return (
    <>
      <LandingPage
        language={language}
        onChangeLanguage={toggleLanguage}
        onExplore={enterWorkspace}
        onSignIn={() => setAuthDialogMode("sign_in")}
        onSignUp={() => setAuthDialogMode("sign_up")}
        user={user}
        isAuthLoading={isAuthLoading}
        onSignOut={async () => {
          await signOut();
          navigate("/");
        }}
        authLabels={{
          signIn: routeCopy[language].signIn,
          signUp: routeCopy[language].signUp,
          signOut: routeCopy[language].signOut,
        }}
      />
      {authDialogMode ? (
        <AuthDialog
          language={language}
          initialMode={authDialogMode}
          onClose={() => setAuthDialogMode(null)}
          onAuthenticated={() => {
            setAuthDialogMode(null);
            enterWorkspace();
          }}
        />
      ) : null}
    </>
  );
}

function NewsRoute() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { language, toggleLanguage } = useLanguage();
  const [authDialogMode, setAuthDialogMode] = useState<AuthDialogMode | null>(null);
  const { user, isAuthLoading, signOut } = useAuth();
  const enterWorkspace = () => navigate("/app/lineup?pitch=7");
  const authLabels = {
    signIn: routeCopy[language].signIn,
    signUp: routeCopy[language].signUp,
    signOut: routeCopy[language].signOut,
  };

  return (
    <>
      <PublicSiteShell
        language={language}
        onChangeLanguage={toggleLanguage}
        onExplore={enterWorkspace}
        onSignIn={() => setAuthDialogMode("sign_in")}
        onSignUp={() => setAuthDialogMode("sign_up")}
        user={user}
        isAuthLoading={isAuthLoading}
        onSignOut={async () => {
          await signOut();
          navigate("/");
        }}
        authLabels={authLabels}
      >
        {slug ? <NewsArticleDetailPage language={language} slug={slug} /> : <NewsKnowledgePage language={language} />}
      </PublicSiteShell>
      {authDialogMode ? (
        <AuthDialog
          language={language}
          initialMode={authDialogMode}
          onClose={() => setAuthDialogMode(null)}
          onAuthenticated={() => {
            setAuthDialogMode(null);
            enterWorkspace();
          }}
        />
      ) : null}
    </>
  );
}

function PublicContentRoute({ kind }: { kind: PublicPageKind }) {
  const navigate = useNavigate();
  const { language, toggleLanguage } = useLanguage();
  const [authDialogMode, setAuthDialogMode] = useState<AuthDialogMode | null>(null);
  const { user, isAuthLoading, signOut } = useAuth();
  const enterWorkspace = () => {
    const tool = kind === "tactics" ? "draw" : kind === "animation" ? "animation" : null;
    navigate(`/app/lineup?pitch=7${tool ? `&tool=${tool}` : ""}`);
  };
  const authLabels = {
    signIn: routeCopy[language].signIn,
    signUp: routeCopy[language].signUp,
    signOut: routeCopy[language].signOut,
  };

  return (
    <>
      <PublicSiteShell
        language={language}
        onChangeLanguage={toggleLanguage}
        onExplore={enterWorkspace}
        onSignIn={() => setAuthDialogMode("sign_in")}
        onSignUp={() => setAuthDialogMode("sign_up")}
        user={user}
        isAuthLoading={isAuthLoading}
        onSignOut={async () => {
          await signOut();
          navigate("/");
        }}
        authLabels={authLabels}
      >
        <PublicContentPage kind={kind} onExplore={enterWorkspace} />
      </PublicSiteShell>
      {authDialogMode ? (
        <AuthDialog
          language={language}
          initialMode={authDialogMode}
          onClose={() => setAuthDialogMode(null)}
          onAuthenticated={() => {
            setAuthDialogMode(null);
            enterWorkspace();
          }}
        />
      ) : null}
    </>
  );
}

function LegacyNewsRedirect() {
  const { slug } = useParams();
  return <Navigate to={slug ? `/tin-tuc/${slug}` : "/tin-tuc"} replace />;
}

function CanvasRoute() {
  const { language } = useLanguage();
  return (
    <>
      <SeoHead title="Không gian chiến thuật | Đội Hình Sân Cỏ" description="Không gian tạo đội hình và sa bàn chiến thuật." path="/app/lineup" robots="noindex,nofollow" />
      <Suspense fallback={<AppLoadingScreen message={routeCopy[language].loading} />}>
        <CanvasApp />
      </Suspense>
    </>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function RootRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route path="/__prerender-home" element={<LandingRoute />} />
      <Route path="/tin-tuc" element={<NewsRoute />} />
      <Route path="/tin-tuc/:slug" element={<NewsRoute />} />
      <Route path="/tin-tuc-kien-thuc" element={<LegacyNewsRedirect />} />
      <Route path="/tin-tuc-kien-thuc/:slug" element={<LegacyNewsRedirect />} />
      <Route path="/ve-chung-toi" element={<PublicContentRoute kind="about" />} />
      <Route path="/tinh-nang/tao-doi-hinh" element={<PublicContentRoute kind="lineup" />} />
      <Route path="/tinh-nang/ve-sa-ban" element={<PublicContentRoute kind="tactics" />} />
      <Route path="/tinh-nang/tao-chuyen-dong" element={<PublicContentRoute kind="animation" />} />
      <Route path="/app" element={<Navigate to="/app/lineup?pitch=7" replace />} />
      <Route path="/app/lineup" element={<CanvasRoute />} />
      <Route path="/app/tactics" element={<TacticsRouteRedirect />} />
      <Route path="/app/profile" element={<CanvasRoute />} />
      <Route path="/app/locker" element={<CanvasRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const rootElement = document.getElementById("root");

declare global {
  interface Window {
    __LINEUP_ROOT__?: Root;
  }
}

if (!rootElement) {
  throw new Error("Root element not found");
}

const root = window.__LINEUP_ROOT__ ?? ReactDOM.createRoot(rootElement);
window.__LINEUP_ROOT__ = root;

root.render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <LanguageProvider>
          <ScrollToTop />
          <RootRouter />
        </LanguageProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
);
