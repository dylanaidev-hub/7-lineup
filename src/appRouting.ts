export type AppTab = "lineup" | "profile" | "locker" | "teams" | "team-detail" | "match-detail" | "join-team";
export type PitchSize = 5 | 7 | 11 | "custom";

const pitchSizes: PitchSize[] = [5, 7, 11];

export const isPitchSize = (value: unknown): value is PitchSize => pitchSizes.includes(value as PitchSize);

export const getInitialAppTab = (): AppTab => {
  const path = window.location.pathname;
  if (path.endsWith("/profile")) return "profile";
  if (path.endsWith("/locker")) return "locker";
  if (path === "/app/teams") return "teams";
  if (/^\/app\/teams\/[^/]+\/matches\/[^/]+/.test(path)) return "match-detail";
  if (path.startsWith("/app/teams/")) return "team-detail";
  if (path.startsWith("/app/join-team")) return "join-team";

  const params = new URLSearchParams(window.location.search);
  if (params.get("tab") === "profile") return "profile";
  if (params.get("tab") === "locker") return "locker";
  return "lineup";
};

export const getPitchSizeFromUrl = (): PitchSize | null => {
  return getPitchSizeFromSearch(window.location.search);
};

export const getPitchSizeFromSearch = (search: string): PitchSize | null => {
  const value = new URLSearchParams(search).get("pitch");
  if (value === "custom") return "custom";

  const numericValue = Number(value);
  return isPitchSize(numericValue) ? numericValue : null;
};

export const getTeamScheduleUrl = (teamId: string) => `/app/teams/${teamId}?section=schedule`;

export const getAppRouteUrl = (nextTab: AppTab, nextPitchSize?: PitchSize) => {
  const url = new URL(window.location.href);
  url.pathname =
    nextTab === "profile"
      ? "/app/profile"
      : nextTab === "locker"
        ? "/app/locker"
        : nextTab === "teams"
          ? "/app/teams"
          : "/app/lineup";
  url.search = "";
  url.hash = "";
  if (nextTab === "lineup" && nextPitchSize) {
    url.searchParams.set("pitch", String(nextPitchSize));
  }
  return url;
};
