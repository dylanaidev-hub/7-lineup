import { Suspense, lazy } from "react";
import { Outlet } from "react-router-dom";
import { AppLoadingScreen } from "../AppLoadingScreen";
import { AppControllerProvider } from "../AppControllerContext";
import { SeoHead } from "../SeoHead";
import { useLanguage } from "../LanguageContext";
import type { AppPage } from "../appRouting";

const AppView = lazy(() => import("../AppView").then((module) => ({ default: module.AppView })));

const routeCopy = {
  vi: { loading: "Đang tải sân bóng..." },
  en: { loading: "Loading pitch..." },
} as const;

function AppPageRoute({ page, seoPath, title }: { page: AppPage; seoPath: string; title: string }) {
  const { language } = useLanguage();
  return (
    <>
      <SeoHead
        title={`${title} | Đội Hình Sân Cỏ`}
        description="Không gian tạo đội hình và sa bàn chiến thuật."
        path={seoPath}
        robots="noindex,nofollow"
      />
      <Suspense fallback={<AppLoadingScreen message={routeCopy[language].loading} />}>
        <AppView page={page} />
      </Suspense>
    </>
  );
}

export function AppWorkspaceLayout() {
  return (
    <AppControllerProvider>
      <Outlet />
    </AppControllerProvider>
  );
}

export function AppLineupRoute() {
  return <AppPageRoute page="lineup" seoPath="/app/lineup" title="Không gian chiến thuật" />;
}

export function AppProfileRoute() {
  return <AppPageRoute page="profile" seoPath="/app/profile" title="Hồ sơ" />;
}

export function AppLockerRoute() {
  return <AppPageRoute page="locker" seoPath="/app/locker" title="Tủ đồ" />;
}

export function AppTeamsRoute() {
  return <AppPageRoute page="teams" seoPath="/app/teams" title="Đội bóng" />;
}

export function AppTeamDetailRoute() {
  return <AppPageRoute page="team-detail" seoPath="/app/teams" title="Chi tiết đội bóng" />;
}

export function AppMatchDetailRoute() {
  return <AppPageRoute page="match-detail" seoPath="/app/teams" title="Chi tiết trận đấu" />;
}

export function AppJoinTeamRoute() {
  return <AppPageRoute page="join-team" seoPath="/app/join-team" title="Tham gia đội bóng" />;
}
