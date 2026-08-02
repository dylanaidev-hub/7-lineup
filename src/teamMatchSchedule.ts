import type { TeamMatch, TeamMatchType } from "./types/team";

export const TEAM_MATCH_TITLE_MAX_LENGTH = 120;

export const TEAM_MATCH_DURATION_MINUTES: Record<TeamMatchType, number> = {
  match: 90,
  training: 60,
};

export type TeamMatchScheduleConflictKind = "duplicate" | "overlap";

export interface TeamMatchScheduleConflict {
  kind: TeamMatchScheduleConflictKind;
  match: TeamMatch;
}

export interface TeamMatchScheduleCandidate {
  startsAt: string;
  matchType: TeamMatchType;
  excludeMatchId?: string;
}

export function parseDatetimeLocalValue(value: string): Date | null {
  if (!value.trim()) return null;

  const localDateTimeMatch = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (localDateTimeMatch) {
    const [, year, month, day, hours, minutes] = localDateTimeMatch.map(Number);
    const parsed = new Date(year, month - 1, day, hours, minutes, 0, 0);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function combineLocalDateAndTime(dateKey: string, time: string): Date | null {
  if (!dateKey || !time) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  if ([year, month, day, hours, minutes].some((part) => Number.isNaN(part))) return null;

  const parsed = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function getLocalDateKeyFromIso(iso: string): string {
  const date = new Date(iso);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function normalizeMatchStartsAt(value: string | Date): number {
  const date = value instanceof Date ? value : new Date(value);
  return date.getTime();
}

export function getMatchEndTime(startsAt: string | Date, matchType: TeamMatchType): number {
  const startMs = normalizeMatchStartsAt(startsAt);
  return startMs + TEAM_MATCH_DURATION_MINUTES[matchType] * 60_000;
}

function rangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return startA < endB && startB < endA;
}

export function findScheduleConflicts(
  existingMatches: TeamMatch[],
  candidate: TeamMatchScheduleCandidate,
): TeamMatchScheduleConflict[] {
  const candidateStart = normalizeMatchStartsAt(candidate.startsAt);
  const candidateEnd = getMatchEndTime(candidate.startsAt, candidate.matchType);
  const conflicts: TeamMatchScheduleConflict[] = [];

  for (const match of existingMatches) {
    if (candidate.excludeMatchId && match.id === candidate.excludeMatchId) continue;

    const matchStart = normalizeMatchStartsAt(match.starts_at);
    const matchEnd = getMatchEndTime(match.starts_at, match.match_type);

    if (candidateStart === matchStart) {
      conflicts.push({ kind: "duplicate", match });
      continue;
    }

    if (rangesOverlap(candidateStart, candidateEnd, matchStart, matchEnd)) {
      conflicts.push({ kind: "overlap", match });
    }
  }

  return conflicts.sort((left, right) => {
    const kindOrder = { duplicate: 0, overlap: 1 } as const;
    if (kindOrder[left.kind] !== kindOrder[right.kind]) {
      return kindOrder[left.kind] - kindOrder[right.kind];
    }
    return normalizeMatchStartsAt(left.match.starts_at) - normalizeMatchStartsAt(right.match.starts_at);
  });
}

export function getDuplicateStartTimes(matches: TeamMatch[]): Set<number> {
  const counts = new Map<number, number>();
  for (const match of matches) {
    const startMs = normalizeMatchStartsAt(match.starts_at);
    counts.set(startMs, (counts.get(startMs) ?? 0) + 1);
  }

  return new Set(
    [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([startMs]) => startMs),
  );
}

export function dayHasScheduleConflict(matches: TeamMatch[]): boolean {
  return getDuplicateStartTimes(matches).size > 0
    || findDayOverlaps(matches).length > 0;
}

function findDayOverlaps(matches: TeamMatch[]): TeamMatchScheduleConflict[] {
  const conflicts: TeamMatchScheduleConflict[] = [];
  const sorted = [...matches].sort(
    (left, right) => normalizeMatchStartsAt(left.starts_at) - normalizeMatchStartsAt(right.starts_at),
  );

  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    const currentStart = normalizeMatchStartsAt(current.starts_at);
    const currentEnd = getMatchEndTime(current.starts_at, current.match_type);

    for (let otherIndex = index + 1; otherIndex < sorted.length; otherIndex += 1) {
      const other = sorted[otherIndex];
      const otherStart = normalizeMatchStartsAt(other.starts_at);
      if (otherStart >= currentEnd) break;

      const otherEnd = getMatchEndTime(other.starts_at, other.match_type);
      if (rangesOverlap(currentStart, currentEnd, otherStart, otherEnd) && currentStart !== otherStart) {
        conflicts.push({ kind: "overlap", match: other });
      }
    }
  }

  return conflicts;
}

export function formatScheduleConflictMessage(conflict: TeamMatchScheduleConflict): string {
  const timeLabel = new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(conflict.match.starts_at));

  if (conflict.kind === "duplicate") {
    return `Đã có sự kiện "${conflict.match.title}" vào ${timeLabel}. Vui lòng chọn giờ khác.`;
  }

  return `Thời gian này trùng với "${conflict.match.title}" (${timeLabel}). Vui lòng chọn khung giờ khác.`;
}

export function validateTeamMatchInput(input: {
  title: string;
  startsAt: string;
}): string | null {
  const title = input.title.trim();
  if (!title) return "Vui lòng nhập tiêu đề sự kiện.";
  if (title.length > TEAM_MATCH_TITLE_MAX_LENGTH) {
    return `Tiêu đề không được dài hơn ${TEAM_MATCH_TITLE_MAX_LENGTH} ký tự.`;
  }

  const parsed = parseDatetimeLocalValue(input.startsAt);
  if (!parsed) return "Thời gian không hợp lệ.";

  return null;
}

export function isPastMatchTime(startsAt: string | Date): boolean {
  return normalizeMatchStartsAt(startsAt) < Date.now();
}

export function sortTeamMatches(matches: TeamMatch[]): TeamMatch[] {
  return [...matches].sort((left, right) => {
    const timeDiff = normalizeMatchStartsAt(left.starts_at) - normalizeMatchStartsAt(right.starts_at);
    if (timeDiff !== 0) return timeDiff;
    return left.title.localeCompare(right.title, "vi");
  });
}

const getDateKeyFromIso = getLocalDateKeyFromIso;

export function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const nextHours = Math.floor(wrapped / 60);
  const nextMins = wrapped % 60;
  return `${String(nextHours).padStart(2, "0")}:${String(nextMins).padStart(2, "0")}`;
}

export function suggestAvailableMatchTime(
  existingMatches: TeamMatch[],
  dateKey: string,
  matchType: TeamMatchType,
  preferredTime = "18:00",
  stepMinutes = 30,
): string {
  const dayMatches = existingMatches.filter(
    (match) => getLocalDateKeyFromIso(match.starts_at) === dateKey,
  );

  let candidateTime = preferredTime;
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const parsed = combineLocalDateAndTime(dateKey, candidateTime);
    if (!parsed) break;

    const conflicts = findScheduleConflicts(dayMatches, {
      startsAt: parsed.toISOString(),
      matchType,
    });
    if (conflicts.length === 0) {
      return candidateTime;
    }
    candidateTime = addMinutesToTime(candidateTime, stepMinutes);
  }

  return preferredTime;
}

export function formatScheduleSuggestionMessage(suggestedTime: string): string {
  return `Gợi ý: ${suggestedTime}`;
}
