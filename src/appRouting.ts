export type AppTab = "lineup" | "profile" | "locker" | "teams" | "team-detail" | "match-detail" | "join-team";
export type AppPage = AppTab;
export type PitchSize = 5 | 7 | 11 | "custom";

export type SwitchAppTabOptions = {
  replace?: boolean;
  teamId?: string;
  matchId?: string;
  search?: Record<string, string>;
};

export type SwitchAppTab = (nextTab: AppTab, options?: SwitchAppTabOptions) => void;

const pitchSizes: PitchSize[] = [5, 7, 11];

export const isPitchSize = (value: unknown): value is PitchSize => pitchSizes.includes(value as PitchSize);

export const getAppTabFromPath = (path: string, search = ""): AppTab => {
  if (path === "/app/teams") return "teams";
  if (path.endsWith("/profile")) return "profile";
  if (path.endsWith("/locker")) return "locker";
  if (path.startsWith("/app/join-team")) return "join-team";
  if (/^\/app\/teams\/[^/]+\/matches\/[^/]+/.test(path)) return "match-detail";
  if (/^\/app\/teams\/[^/]+/.test(path)) return "team-detail";

  const params = new URLSearchParams(search);
  if (params.get("tab") === "profile") return "profile";
  if (params.get("tab") === "locker") return "locker";
  return "lineup";
};

export const getTeamIdFromPath = (path: string): string | null => {
  const match = path.match(/^\/app\/teams\/([^/]+)/);
  return match?.[1] ?? null;
};

export const getMatchIdFromPath = (path: string): string | null => {
  const match = path.match(/^\/app\/teams\/[^/]+\/matches\/([^/]+)/);
  return match?.[1] ?? null;
};

export const getInitialAppTab = (): AppTab => getAppTabFromPath(window.location.pathname, window.location.search);

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

export const getAppRouteUrl = (
  nextTab: AppTab,
  nextPitchSize?: PitchSize,
  options: Pick<SwitchAppTabOptions, "teamId" | "matchId" | "search"> = {},
) => {
  const url = new URL(window.location.origin);

  switch (nextTab) {
    case "profile":
      url.pathname = "/app/profile";
      break;
    case "locker":
      url.pathname = "/app/locker";
      break;
    case "teams":
      url.pathname = "/app/teams";
      break;
    case "team-detail":
      url.pathname = options.teamId ? `/app/teams/${options.teamId}` : "/app/teams";
      break;
    case "match-detail":
      url.pathname =
        options.teamId && options.matchId
          ? `/app/teams/${options.teamId}/matches/${options.matchId}`
          : "/app/teams";
      break;
    case "join-team":
      url.pathname = "/app/join-team";
      break;
    default:
      url.pathname = "/app/lineup";
      break;
  }

  url.search = "";
  url.hash = "";

  if (nextTab === "lineup" && nextPitchSize) {
    url.searchParams.set("pitch", String(nextPitchSize));
  }

  if (options.search) {
    for (const [key, value] of Object.entries(options.search)) {
      url.searchParams.set(key, value);
    }
  }

  return url;
};

export const getAppPath = (
  nextTab: AppPage,
  nextPitchSize?: PitchSize,
  options: Pick<SwitchAppTabOptions, "teamId" | "matchId" | "search"> = {},
) => {
  const url = getAppRouteUrl(nextTab, nextPitchSize, options);
  return `${url.pathname}${url.search}${url.hash}`;
};
