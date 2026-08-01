export type AppTab = "lineup" | "profile" | "locker" | "teams" | "team-detail" | "event-detail";
export type PitchSize = 5 | 7 | 11 | "custom";

const pitchSizes: PitchSize[] = [5, 7, 11];

export const isPitchSize = (value: unknown): value is PitchSize => pitchSizes.includes(value as PitchSize);

export const getInitialAppTab = (): AppTab => {
  const path = window.location.pathname;
  if (path.endsWith("/profile")) return "profile";
  if (path.endsWith("/locker")) return "locker";
  if (path === "/app/teams") return "teams";
  if (path.startsWith("/app/teams/")) return "team-detail";
  if (path.startsWith("/app/events/")) return "event-detail";

  const params = new URLSearchParams(window.location.search);
  if (params.get("tab") === "profile") return "profile";
  if (params.get("tab") === "locker") return "locker";
  return "lineup";
};

export const getPitchSizeFromUrl = (): PitchSize | null => {
  const value = new URLSearchParams(window.location.search).get("pitch");
  if (value === "custom") return "custom";

  const numericValue = Number(value);
  return isPitchSize(numericValue) ? numericValue : null;
};

export const getAppRouteUrl = (nextTab: AppTab, nextPitchSize?: PitchSize) => {
  const url = new URL(window.location.href);
  url.pathname =
    nextTab === "profile"
      ? "/app/profile"
      : nextTab === "locker"
        ? "/app/locker"
        : nextTab === "teams"
          ? "/app/teams"
          : nextTab === "event-detail"
            ? url.pathname
          : "/app/lineup";
  url.search = "";
  url.hash = "";
  if (nextTab === "lineup" && nextPitchSize) {
    url.searchParams.set("pitch", String(nextPitchSize));
  }
  return url;
};

export const writeAppRoute = (nextTab: AppTab, nextPitchSize: PitchSize, replace = false) => {
  const nextUrl = getAppRouteUrl(nextTab, nextPitchSize).toString();
  if (nextUrl === window.location.href) return;

  if (replace) {
    window.history.replaceState({ tab: nextTab }, "", nextUrl);
  } else {
    window.history.pushState({ tab: nextTab }, "", nextUrl);
  }
};
