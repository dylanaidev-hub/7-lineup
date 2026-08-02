import { combineLocalDateAndTime, findScheduleConflicts, type TeamMatchScheduleConflict } from "./teamMatchSchedule";
import type { TeamMatch, TeamMatchType } from "./types/team";

export type RecurrenceInterval = "weekly" | "biweekly";
export type RecurrenceEndMode = "count" | "date";

export const RECURRENCE_INTERVAL_LABELS: Record<RecurrenceInterval, string> = {
  weekly: "Hàng tuần",
  biweekly: "2 tuần một lần",
};

export const RECURRENCE_INTERVAL_STEP_DAYS: Record<RecurrenceInterval, number> = {
  weekly: 7,
  biweekly: 14,
};

export const RECURRENCE_MIN_COUNT = 2;
export const RECURRENCE_MAX_COUNT = 52;
export const RECURRENCE_MAX_OCCURRENCES = 52;

export type RecurrenceInput = {
  enabled: boolean;
  interval: RecurrenceInterval;
  endMode: RecurrenceEndMode;
  count: number;
  endDate: string;
};

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const next = new Date(year, month - 1, day);
  next.setDate(next.getDate() + days);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}

export function compareDateKeys(left: string, right: string): number {
  return left.localeCompare(right);
}

export function buildRecurringDateKeys(input: {
  startDateKey: string;
  interval: RecurrenceInterval;
  endMode: RecurrenceEndMode;
  count: number;
  endDateKey: string;
}): string[] {
  const stepDays = RECURRENCE_INTERVAL_STEP_DAYS[input.interval];
  const dates: string[] = [input.startDateKey];

  if (input.endMode === "count") {
    const total = Math.min(Math.max(Math.floor(input.count), RECURRENCE_MIN_COUNT), RECURRENCE_MAX_OCCURRENCES);
    for (let index = 1; index < total; index += 1) {
      dates.push(addDaysToDateKey(input.startDateKey, stepDays * index));
    }
    return dates;
  }

  let cursor = input.startDateKey;
  while (dates.length < RECURRENCE_MAX_OCCURRENCES) {
    const next = addDaysToDateKey(cursor, stepDays);
    if (compareDateKeys(next, input.endDateKey) > 0) break;
    dates.push(next);
    cursor = next;
  }

  return dates;
}

export function buildRecurringOccurrences(
  startDateKey: string,
  time: string,
  recurrence: RecurrenceInput,
): Date[] {
  if (!recurrence.enabled) {
    const single = combineLocalDateAndTime(startDateKey, time);
    return single ? [single] : [];
  }

  const dateKeys = buildRecurringDateKeys({
    startDateKey,
    interval: recurrence.interval,
    endMode: recurrence.endMode,
    count: recurrence.count,
    endDateKey: recurrence.endDate,
  });

  return dateKeys
    .map((dateKey) => combineLocalDateAndTime(dateKey, time))
    .filter((value): value is Date => value !== null);
}

export function validateRecurrenceInput(
  startDateKey: string,
  recurrence: RecurrenceInput,
): string | null {
  if (!recurrence.enabled) return null;

  if (recurrence.endMode === "count") {
    if (!Number.isFinite(recurrence.count) || recurrence.count < RECURRENCE_MIN_COUNT) {
      return `Lịch định kỳ cần ít nhất ${RECURRENCE_MIN_COUNT} lần.`;
    }
    if (recurrence.count > RECURRENCE_MAX_COUNT) {
      return `Lịch định kỳ không được vượt quá ${RECURRENCE_MAX_COUNT} lần.`;
    }
    return null;
  }

  if (!recurrence.endDate) {
    return "Vui lòng chọn ngày kết thúc lịch định kỳ.";
  }
  if (compareDateKeys(recurrence.endDate, startDateKey) < 0) {
    return "Ngày kết thúc phải sau ngày bắt đầu.";
  }

  const dates = buildRecurringDateKeys({
    startDateKey,
    interval: recurrence.interval,
    endMode: "date",
    count: RECURRENCE_MIN_COUNT,
    endDateKey: recurrence.endDate,
  });
  if (dates.length < RECURRENCE_MIN_COUNT) {
    return "Khoảng thời gian quá ngắn — cần ít nhất 2 lần lặp.";
  }

  return null;
}

export type RecurringScheduleConflict = {
  conflict: TeamMatchScheduleConflict;
  occurrence: Date;
};

export function findRecurringScheduleConflicts(
  existingMatches: TeamMatch[],
  occurrences: Date[],
  matchType: TeamMatchType,
): RecurringScheduleConflict[] {
  const conflicts: RecurringScheduleConflict[] = [];
  const syntheticMatches: TeamMatch[] = [];

  for (const occurrence of occurrences) {
    const startsAt = occurrence.toISOString();
    const against = [...existingMatches, ...syntheticMatches];
    const nextConflicts = findScheduleConflicts(against, { startsAt, matchType });
    if (nextConflicts.length > 0) {
      conflicts.push({ conflict: nextConflicts[0], occurrence });
      continue;
    }

    syntheticMatches.push({
      id: `draft-${startsAt}`,
      team_id: "",
      title: "",
      match_type: matchType,
      location: null,
      location_map_url: null,
      starts_at: startsAt,
      notes: null,
      lineup_id: null,
      lineup_snapshot: null,
      applied_lineups: [],
      created_by: "",
      created_at: startsAt,
    });
  }

  return conflicts;
}

export function formatRecurringPreview(dateKeys: string[]): string {
  if (dateKeys.length === 0) return "";
  const formatter = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" });
  const labels = dateKeys.map((key) => {
    const [year, month, day] = key.split("-").map(Number);
    return formatter.format(new Date(year, month - 1, day));
  });

  if (labels.length <= 4) {
    return labels.join(", ");
  }

  return `${labels.slice(0, 3).join(", ")} … ${labels[labels.length - 1]} (${labels.length} lần)`;
}

export function formatRecurringConflictMessage(
  conflict: TeamMatchScheduleConflict,
  occurrenceDate: Date,
): string {
  const occurrenceLabel = new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(occurrenceDate);

  if (conflict.kind === "duplicate") {
    return `Lần lặp ${occurrenceLabel} trùng với sự kiện "${conflict.match.title}".`;
  }

  return `Lần lặp ${occurrenceLabel} trùng khung giờ với "${conflict.match.title}".`;
}
