import { supabase } from "../lib/supabaseClient";
import {
  findScheduleConflicts,
  formatScheduleConflictMessage,
  TEAM_MATCH_TITLE_MAX_LENGTH,
} from "../teamMatchSchedule";
import { normalizeGoogleMapUrl, validateGoogleMapUrlInput } from "../teamMatchLocation";
import { TEAM_NOTIFICATION_MESSAGES } from "../teamNotifications";
import type {
  SearchableProfile,
  Team,
  TeamDetails,
  TeamInvite,
  TeamJoinLink,
  TeamJoinLinkPreview,
  TeamLeaveRequest,
  MatchLineupSnapshot,
  TeamMatch,
  TeamMatchAttendance,
  TeamMatchAttendanceStatus,
  TeamMatchType,
  TeamMember,
  TeamMemberRole,
} from "../types/team";

const teamColumns = "id,name,logo_url,created_by,created_at";
const teamMemberColumns = "id,team_id,user_id,player_name,role,jersey_number,created_at";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const assertValidUuid = (value: string, fieldName: string) => {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`${fieldName} is required.`);
  }
};
const teamInviteColumns = "id,team_id,invited_user_id,invited_by,role,status,expires_at,responded_at,created_at,team:teams(id,name,logo_url)";
const teamLeaveRequestColumns = "id,team_id,member_id,requested_by,status,reviewed_by,responded_at,created_at";
const teamMatchColumns =
  "id,team_id,title,match_type,location,location_map_url,starts_at,notes,lineup_id,lineup_snapshot,applied_lineups,created_by,created_at";
const teamMatchAttendanceColumns = "id,match_id,member_id,status,updated_by,responded_at,updated_at,created_at";

function mapLineupSnapshot(value: unknown): MatchLineupSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.lineup_id !== "string" || typeof row.name !== "string" || typeof row.format !== "string") {
    return null;
  }
  return {
    lineup_id: row.lineup_id,
    name: row.name,
    format: row.format,
    players_data: row.players_data ?? null,
    applied_at: typeof row.applied_at === "string" ? row.applied_at : new Date().toISOString(),
  };
}

function mapAppliedLineups(value: unknown, legacySnapshot: MatchLineupSnapshot | null): MatchLineupSnapshot[] {
  if (Array.isArray(value)) {
    return value.map((item) => mapLineupSnapshot(item)).filter((item): item is MatchLineupSnapshot => item !== null);
  }
  return legacySnapshot ? [legacySnapshot] : [];
}

export function mapTeamMatchRow(row: Record<string, unknown> | null | undefined): TeamMatch | null {
  if (!row || typeof row.id !== "string" || typeof row.team_id !== "string") return null;

  return {
    id: row.id,
    team_id: row.team_id,
    title: typeof row.title === "string" ? row.title : "",
    match_type: row.match_type === "training" ? "training" : "match",
    location: typeof row.location === "string" ? row.location : null,
    location_map_url: typeof row.location_map_url === "string" ? row.location_map_url : null,
    starts_at: typeof row.starts_at === "string" ? row.starts_at : new Date(String(row.starts_at)).toISOString(),
    notes: typeof row.notes === "string" ? row.notes : null,
    lineup_id: typeof row.lineup_id === "string" ? row.lineup_id : null,
    lineup_snapshot: mapLineupSnapshot(row.lineup_snapshot),
    applied_lineups: mapAppliedLineups(row.applied_lineups, mapLineupSnapshot(row.lineup_snapshot)),
    created_by: typeof row.created_by === "string" ? row.created_by : "",
    created_at: typeof row.created_at === "string" ? row.created_at : new Date(String(row.created_at)).toISOString(),
  };
}

type SearchUsersForTeamRow = {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  email: string | null;
};

type TeamInviteRow = Omit<TeamInvite, "team"> & {
  team?: Pick<Team, "id" | "name" | "logo_url"> | Pick<Team, "id" | "name" | "logo_url">[] | null;
};

type TeamLeaveRequestRow = Omit<TeamLeaveRequest, "team" | "member"> & {
  team?: Pick<Team, "id" | "name" | "logo_url"> | Pick<Team, "id" | "name" | "logo_url">[] | null;
  member?:
    | Pick<TeamMember, "id" | "player_name" | "role" | "user_id">
    | Pick<TeamMember, "id" | "player_name" | "role" | "user_id">[]
    | null;
};

const ensureSupabase = () => {
  if (!supabase) {
    throw new Error("Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
};

const throwRepositoryError = (action: string, error: unknown): never => {
  const details = error && typeof error === "object" && "message" in error
    ? String((error as { message?: unknown }).message)
    : "Unknown Supabase error";
  if (/teams_\d+\.created_by|teams\.created_by|column .*created_by does not exist/i.test(details)) {
    throw new Error(`${action}: Team database schema is out of date. Please run supabase/migrations/002_team_management.sql in Supabase SQL Editor.`);
  }
  if (/null value in column "user_id" of relation "teams"|teams\.user_id/i.test(details)) {
    throw new Error(`${action}: Team database schema still has a legacy required user_id column. Please rerun supabase/migrations/002_team_management.sql in Supabase SQL Editor.`);
  }
  if (/null value in column ".+" of relation "team_members" violates not-null constraint|team_members\.(jersey_number|nickname)/i.test(details)) {
    throw new Error(`${action}: Team members schema still has legacy required columns. Please rerun supabase/migrations/002_team_management.sql in Supabase SQL Editor.`);
  }
  if (/function .*search_users_for_team.* does not exist|could not find the function.*search_users_for_team|search_users_for_team/i.test(details)) {
    throw new Error(`${action}: User search RPC is missing. Please run supabase/migrations/003_search_users_for_team.sql in Supabase SQL Editor.`);
  }
  if (/TEAM_INVITE_ALREADY_PENDING|pending.*invite|invite.*pending|pending invitation|team_invites_pending_unique_idx/i.test(details)) {
    throw new Error(TEAM_NOTIFICATION_MESSAGES.pendingInvite);
  }
  if (/TEAM_LEAVE_REQUEST_ALREADY_PENDING|team_leave_requests_pending_member_unique_idx/i.test(details)) {
    throw new Error(TEAM_NOTIFICATION_MESSAGES.playerLeaveRequestPending);
  }
  if (/TEAM_LEAVE_NOT_MEMBER|TEAM_LEAVE_REQUEST_INVALID/i.test(details)) {
    throw new Error(TEAM_NOTIFICATION_MESSAGES.leaveRequestInvalid);
  }
  if (/TEAM_ADMIN_CANNOT_LEAVE_BY_REQUEST/i.test(details)) {
    throw new Error(TEAM_NOTIFICATION_MESSAGES.noPermission);
  }
  if (/TEAM_LEAVE_NOT_ADMIN/i.test(details)) {
    throw new Error(TEAM_NOTIFICATION_MESSAGES.noPermission);
  }
  if (/TEAM_JOIN_LINK_NOT_ADMIN/i.test(details)) {
    throw new Error(TEAM_NOTIFICATION_MESSAGES.noPermission);
  }
  if (/TEAM_JOIN_AUTH_REQUIRED/i.test(details)) {
    throw new Error(TEAM_NOTIFICATION_MESSAGES.playerTeamAccessDenied);
  }
  if (/TEAM_JOIN_LINK_INVALID/i.test(details)) {
    throw new Error(TEAM_NOTIFICATION_MESSAGES.joinLinkInvalid);
  }
  if (/TEAM_JOIN_LINK_EXPIRED/i.test(details)) {
    throw new Error(TEAM_NOTIFICATION_MESSAGES.joinLinkExpired);
  }
  if (/TEAM_JOIN_LINK_LIMIT_REACHED/i.test(details)) {
    throw new Error(TEAM_NOTIFICATION_MESSAGES.joinLinkLimitReached);
  }
  if (/PLAYER_INVITE_EXPIRED|invite.*expired|expired.*invite/i.test(details)) {
    throw new Error(TEAM_NOTIFICATION_MESSAGES.playerInviteExpired);
  }
  if (/PLAYER_INVITE_INVALID|invalid.*invite|invite.*invalid/i.test(details)) {
    throw new Error(TEAM_NOTIFICATION_MESSAGES.playerInviteInvalid);
  }
  if (/PLAYER_ALREADY_MEMBER/i.test(details)) {
    throw new Error(TEAM_NOTIFICATION_MESSAGES.playerAlreadyMember);
  }
  if (/TEAM_MEMBER_ALREADY_EXISTS|duplicate key value|team_members_team_user_unique|unique constraint/i.test(details)) {
    throw new Error(TEAM_NOTIFICATION_MESSAGES.alreadyMember);
  }
  if (/TEAM_INVITE_NOT_ADMIN|row-level security|violates row-level security|permission denied|not authorized|not admin/i.test(details)) {
    throw new Error(TEAM_NOTIFICATION_MESSAGES.noPermission);
  }
  if (/INVALID_TEAM_ROLE|invalid input value for enum .*team_member_role|team_member_role|invalid.*role/i.test(details)) {
    throw new Error(TEAM_NOTIFICATION_MESSAGES.invalidRole);
  }
  if (
    /relation .*team_invites.* does not exist|function .*send_team_invite.* does not exist|function .*accept_team_invite.* does not exist|function .*decline_team_invite.* does not exist|could not find the function.*(send_team_invite|accept_team_invite|decline_team_invite)|type .*team_invite_status.* does not exist/i.test(details)
  ) {
    throw new Error(`${action}: Team invite schema is missing. Please run supabase/migrations/004_team_invites.sql in Supabase SQL Editor.`);
  }
  if (
    /relation .*team_leave_requests.* does not exist|type .*team_leave_request_status.* does not exist|function .*create_team_leave_request.* does not exist|function .*approve_team_leave_request.* does not exist|function .*decline_team_leave_request.* does not exist|could not find the function.*(create_team_leave_request|approve_team_leave_request|decline_team_leave_request)/i.test(details)
  ) {
    throw new Error(`${action}: Team leave request schema is missing. Please run supabase/migrations/007_team_leave_requests.sql in Supabase SQL Editor.`);
  }
  if (
    /relation .*team_join_links.* does not exist|function .*create_team_join_link.* does not exist|function .*create_team_join_link_v2.* does not exist|function .*get_team_join_link.* does not exist|function .*join_team_by_link.* does not exist|could not find the function.*(create_team_join_link|create_team_join_link_v2|get_team_join_link|join_team_by_link)/i.test(details)
  ) {
    throw new Error(`${action}: Team join link schema is missing. Please run supabase/migrations/010_team_join_link_v2.sql in Supabase SQL Editor.`);
  }
  if (/relation .*team_matches.* does not exist|type .*team_match_type.* does not exist/i.test(details)) {
    throw new Error(`${action}: Team schedule schema is missing. Please run supabase/migrations/011_team_matches.sql in Supabase SQL Editor.`);
  }
  if (/team_matches_team_starts_at_unique|duplicate key value.*team_matches|team_matches.*unique constraint/i.test(details)) {
    throw new Error(TEAM_NOTIFICATION_MESSAGES.matchTimeDuplicate);
  }
  if (
    /relation .*team_match_attendance.* does not exist|type .*team_match_attendance_status.* does not exist|function .*upsert_team_match_attendance.* does not exist|could not find the function.*upsert_team_match_attendance/i.test(details)
  ) {
    throw new Error(`${action}: Match attendance schema is missing. Please run supabase/migrations/013_team_match_attendance.sql in Supabase SQL Editor.`);
  }
  if (/team_match_attendance\.updated_by|column .*team_match_attendance.* does not exist/i.test(details)) {
    throw new Error(`${action}: Match attendance schema is out of date. Please run supabase/migrations/014_team_match_attendance_columns.sql in Supabase SQL Editor.`);
  }
  if (/invalid input value for enum team_match_attendance_status/i.test(details)) {
    throw new Error(`${action}: Match attendance status enum is out of date. Please run supabase/migrations/016_team_match_attendance_status_rsvp.sql in Supabase SQL Editor.`);
  }
  if (/team_match_attendance\.marked_by|column \"marked_by\".*team_match_attendance/i.test(details)) {
    throw new Error(`${action}: Match attendance schema is out of date. Please run supabase/migrations/018_team_match_attendance_repair.sql in Supabase SQL Editor.`);
  }
  if (/MATCH_NOT_FOUND/i.test(details)) {
    throw new Error(TEAM_NOTIFICATION_MESSAGES.matchNotFound);
  }
  if (/TEAM_MATCH_ATTENDANCE_NOT_ALLOWED|TEAM_MEMBER_NOT_FOUND/i.test(details)) {
    throw new Error(TEAM_NOTIFICATION_MESSAGES.matchAttendanceNotAllowed);
  }
  if (/team_join_links|team join link|join_team_by_link|create_team_join_link|create_team_join_link_v2|get_team_join_link/i.test(details)) {
    throw new Error(TEAM_NOTIFICATION_MESSAGES.joinLinkCreateFailed);
  }
  if (/member.*limit|limit.*member|max.*member|quota/i.test(details)) {
    throw new Error(TEAM_NOTIFICATION_MESSAGES.memberLimitReached);
  }
  if (/schema cache|relationship between .*team_leave_requests|foreign key relationship/i.test(details)) {
    throw new Error(`${action}: Supabase schema cache has not refreshed yet. Please wait a moment, reload the app, then retry.`);
  }
  throw new Error(`${action}: ${details}`);
};

const normalizeTeamInvite = (invite: TeamInviteRow): TeamInvite => {
  const relatedTeam = Array.isArray(invite.team) ? invite.team[0] ?? null : invite.team ?? null;
  return {
    ...invite,
    team: relatedTeam,
  };
};

const normalizeTeamLeaveRequest = (request: TeamLeaveRequestRow): TeamLeaveRequest => {
  const relatedTeam = Array.isArray(request.team) ? request.team[0] ?? null : request.team ?? null;
  const relatedMember = Array.isArray(request.member) ? request.member[0] ?? null : request.member ?? null;
  return {
    ...request,
    team: relatedTeam,
    member: relatedMember,
  };
};

export async function getTeamsByUser(userId: string): Promise<Team[]> {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("team_members")
    .select(`team:teams(${teamColumns})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throwRepositoryError("Failed to get teams by user", error);

  return (data ?? []).flatMap((row) => {
    const team = row.team;
    if (!team) return [];
    return Array.isArray(team) ? team : [team];
  }) as Team[];
}

export async function getTeamDetails(teamId: string): Promise<TeamDetails> {
  const client = ensureSupabase();
  const { data: team, error: teamError } = await client
    .from("teams")
    .select(teamColumns)
    .eq("id", teamId)
    .single();

  if (teamError) throwRepositoryError("Failed to get team details", teamError);

  const { data: members, error: membersError } = await client
    .from("team_members")
    .select(teamMemberColumns)
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });

  if (membersError) throwRepositoryError("Failed to get team members", membersError);

  return {
    ...(team as Team),
    members: (members ?? []) as TeamMember[],
  };
}

export async function checkTeamMembership(teamId: string, userId: string): Promise<boolean> {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throwRepositoryError("Failed to check team membership", error);
  return Boolean(data);
}

export async function createTeam(name: string, createdBy: string): Promise<Team> {
  const client = ensureSupabase();
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Team name is required.");

  const { data, error } = await client
    .from("teams")
    .insert({ name: normalizedName, created_by: createdBy, user_id: createdBy })
    .select(teamColumns)
    .single();

  if (error && /column .*user_id.* does not exist|teams\.user_id/i.test(error.message)) {
    const fallback = await client
      .from("teams")
      .insert({ name: normalizedName, created_by: createdBy })
      .select(teamColumns)
      .single();

    if (fallback.error) throwRepositoryError("Failed to create team", fallback.error);
    return fallback.data as Team;
  }

  if (error) throwRepositoryError("Failed to create team", error);
  return data as Team;
}

export async function deleteTeam(teamId: string): Promise<string> {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("teams")
    .delete()
    .eq("id", teamId)
    .select("id")
    .single();

  if (error) throwRepositoryError("Failed to delete team", error);
  if (!data) throw new Error("Failed to delete team: Team not found or you do not have permission to delete it.");
  return data.id as string;
}

export async function searchProfiles(query: string): Promise<SearchableProfile[]> {
  const client = ensureSupabase();
  const normalizedQuery = query.trim().replace(/[,%]/g, " ");
  if (normalizedQuery.length < 2) return [];

  const { data, error } = await client.rpc("search_users_for_team", {
    search_term: normalizedQuery,
  });

  if (error) throwRepositoryError("Failed to search profiles", error);
  return ((data ?? []) as SearchUsersForTeamRow[]).map((profile) => ({
    ...profile,
    id: profile.user_id,
  })) as SearchableProfile[];
}

export async function addTeamMember(
  teamId: string,
  playerName: string,
  role: TeamMemberRole,
  userId?: string,
  jerseyNumber?: number | null,
): Promise<TeamMember> {
  const client = ensureSupabase();
  const normalizedPlayerName = playerName.trim();
  if (!normalizedPlayerName) throw new Error("Player name is required.");
  if (!userId) throw new Error(TEAM_NOTIFICATION_MESSAGES.invalidIdentity);
  if (role !== "admin" && role !== "player") throw new Error(TEAM_NOTIFICATION_MESSAGES.invalidRole);

  const { data: existingMember, error: existingMemberError } = await client
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingMemberError) throwRepositoryError("Failed to check team member", existingMemberError);
  if (existingMember) throw new Error(TEAM_NOTIFICATION_MESSAGES.alreadyMember);

  const payload = {
    team_id: teamId,
    user_id: userId,
    player_name: normalizedPlayerName,
    role,
    jersey_number: jerseyNumber ?? null,
  };

  const { data, error } = await client
    .from("team_members")
    .insert(payload)
    .select(teamMemberColumns)
    .single();

  if (error && /column .*jersey_number.* does not exist|team_members\.jersey_number/i.test(error.message)) {
    const fallback = await client
      .from("team_members")
      .insert({
        team_id: teamId,
        user_id: userId,
        player_name: normalizedPlayerName,
        role,
      })
      .select("id,team_id,user_id,player_name,role,created_at")
      .single();

    if (fallback.error) throwRepositoryError("Failed to add team member", fallback.error);
    return { ...(fallback.data as TeamMember), jersey_number: null };
  }

  if (error) throwRepositoryError("Failed to add team member", error);
  return data as TeamMember;
}

export async function getPendingTeamInvites(userId: string): Promise<TeamInvite[]> {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("team_invites")
    .select(teamInviteColumns)
    .eq("invited_user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throwRepositoryError("Failed to get team invites", error);
  return ((data ?? []) as TeamInviteRow[]).map(normalizeTeamInvite);
}

export async function inviteTeamMember(
  teamId: string,
  invitedUserId: string,
  role: TeamMemberRole = "player",
): Promise<TeamInvite> {
  const client = ensureSupabase();
  if (!invitedUserId) throw new Error(TEAM_NOTIFICATION_MESSAGES.invalidIdentity);
  if (role !== "admin" && role !== "player") throw new Error(TEAM_NOTIFICATION_MESSAGES.invalidRole);

  const { data, error } = await client.rpc("send_team_invite", {
    p_team_id: teamId,
    p_invited_user_id: invitedUserId,
    p_role: role,
  });

  if (error) throwRepositoryError("Failed to send team invite", error);
  return normalizeTeamInvite(data as TeamInviteRow);
}

export async function acceptTeamInvite(inviteId: string): Promise<TeamMember> {
  const client = ensureSupabase();
  const { data, error } = await client.rpc("accept_team_invite", { p_invite_id: inviteId });

  if (error) throwRepositoryError("Failed to accept team invite", error);
  return data as TeamMember;
}

export async function declineTeamInvite(inviteId: string): Promise<TeamInvite> {
  const client = ensureSupabase();
  const { data, error } = await client.rpc("decline_team_invite", { p_invite_id: inviteId });

  if (error) throwRepositoryError("Failed to decline team invite", error);
  return data as TeamInvite;
}

export async function createTeamJoinLink(teamId: string): Promise<TeamJoinLink> {
  const client = ensureSupabase();
  const { data, error } = await client.rpc("create_team_join_link_v2", {
    p_team_id: teamId,
    p_expires_in_days: 30,
    p_max_uses: null,
  });

  if (error) throwRepositoryError("Failed to create team join link", error);
  return data as TeamJoinLink;
}

export async function getTeamJoinLink(token: string): Promise<TeamJoinLinkPreview | null> {
  const client = ensureSupabase();
  const normalizedToken = token.trim();
  if (!normalizedToken) return null;

  const { data, error } = await client.rpc("get_team_join_link", {
    p_token: normalizedToken,
  });

  if (error) throwRepositoryError("Failed to get team join link", error);
  const rows = (data ?? []) as TeamJoinLinkPreview[];
  return rows[0] ?? null;
}

export async function joinTeamByLink(token: string): Promise<TeamMember> {
  const client = ensureSupabase();
  const normalizedToken = token.trim();
  if (!normalizedToken) throw new Error(TEAM_NOTIFICATION_MESSAGES.joinLinkInvalid);

  const { data, error } = await client.rpc("join_team_by_link", {
    p_token: normalizedToken,
  });

  if (error) throwRepositoryError("Failed to join team by link", error);
  return data as TeamMember;
}

export async function getPendingTeamLeaveRequests(): Promise<TeamLeaveRequest[]> {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("team_leave_requests")
    .select(teamLeaveRequestColumns)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throwRepositoryError("Failed to get team leave requests", error);
  return ((data ?? []) as TeamLeaveRequestRow[]).map(normalizeTeamLeaveRequest);
}

export async function requestTeamLeave(teamId: string): Promise<TeamLeaveRequest> {
  const client = ensureSupabase();
  const { data, error } = await client.rpc("create_team_leave_request", {
    p_team_id: teamId,
  });

  if (error) throwRepositoryError("Failed to request team leave", error);
  return normalizeTeamLeaveRequest(data as TeamLeaveRequestRow);
}

export async function approveTeamLeaveRequest(requestId: string): Promise<TeamLeaveRequest> {
  const client = ensureSupabase();
  const { data, error } = await client.rpc("approve_team_leave_request", {
    p_request_id: requestId,
  });

  if (error) throwRepositoryError("Failed to approve team leave request", error);
  return normalizeTeamLeaveRequest(data as TeamLeaveRequestRow);
}

export async function declineTeamLeaveRequest(requestId: string): Promise<TeamLeaveRequest> {
  const client = ensureSupabase();
  const { data, error } = await client.rpc("decline_team_leave_request", {
    p_request_id: requestId,
  });

  if (error) throwRepositoryError("Failed to decline team leave request", error);
  return normalizeTeamLeaveRequest(data as TeamLeaveRequestRow);
}

export async function deleteTeamMember(memberId: string): Promise<string> {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("team_members")
    .delete()
    .eq("id", memberId)
    .select("id")
    .single();

  if (error) throwRepositoryError("Failed to delete team member", error);
  if (!data) throw new Error("Failed to delete team member: Member not found or you do not have permission to delete it.");
  return data.id as string;
}

export async function getTeamMatches(teamId: string): Promise<TeamMatch[]> {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("team_matches")
    .select(teamMatchColumns)
    .eq("team_id", teamId)
    .order("starts_at", { ascending: true });

  if (error) {
    if (/column team_matches\.location_map_url does not exist/i.test(error.message ?? "")) {
      const { data: fallbackData, error: fallbackError } = await client
        .from("team_matches")
        .select("id,team_id,title,match_type,location,starts_at,notes,created_by,created_at")
        .eq("team_id", teamId)
        .order("starts_at", { ascending: true });

      if (fallbackError) throwRepositoryError("Failed to get team matches", fallbackError);
      return (fallbackData ?? []).map((row) => ({
        ...(row as TeamMatch),
        location_map_url: null,
      }));
    }

    throwRepositoryError("Failed to get team matches", error);
  }

  return (data ?? []) as TeamMatch[];
}

export async function createTeamMatch(
  teamId: string,
  createdBy: string,
  input: {
    title: string;
    matchType: TeamMatchType;
    startsAt: string;
    location?: string | null;
    locationMapUrl?: string | null;
    notes?: string | null;
  },
): Promise<TeamMatch> {
  const client = ensureSupabase();
  const trimmedTitle = input.title.trim();
  if (!trimmedTitle) {
    throw new Error("Vui lòng nhập tiêu đề sự kiện.");
  }
  if (trimmedTitle.length > TEAM_MATCH_TITLE_MAX_LENGTH) {
    throw new Error(`Tiêu đề không được dài hơn ${TEAM_MATCH_TITLE_MAX_LENGTH} ký tự.`);
  }

  const mapUrlError = validateGoogleMapUrlInput(input.locationMapUrl ?? "");
  if (mapUrlError) throw new Error(mapUrlError);

  const startsAtDate = new Date(input.startsAt);
  if (Number.isNaN(startsAtDate.getTime())) {
    throw new Error(TEAM_NOTIFICATION_MESSAGES.matchInvalidTime);
  }
  const startsAtIso = startsAtDate.toISOString();

  const existingMatches = await getTeamMatches(teamId);
  const conflicts = findScheduleConflicts(existingMatches, {
    startsAt: startsAtIso,
    matchType: input.matchType,
  });
  if (conflicts.length > 0) {
    throw new Error(formatScheduleConflictMessage(conflicts[0]));
  }

  const { data, error } = await client
    .from("team_matches")
    .insert({
      team_id: teamId,
      created_by: createdBy,
      title: trimmedTitle,
      match_type: input.matchType,
      starts_at: startsAtIso,
      location: input.location?.trim() || null,
      location_map_url: normalizeGoogleMapUrl(input.locationMapUrl ?? ""),
      notes: input.notes?.trim() || null,
    })
    .select(teamMatchColumns)
    .single();

  if (error) throwRepositoryError("Failed to create team match", error);
  return data as TeamMatch;
}

export async function createTeamMatchesBatch(
  teamId: string,
  createdBy: string,
  input: {
    title: string;
    matchType: TeamMatchType;
    startsAtList: string[];
    location?: string | null;
    locationMapUrl?: string | null;
    notes?: string | null;
  },
): Promise<TeamMatch[]> {
  if (input.startsAtList.length === 0) {
    throw new Error("Không có lịch nào để tạo.");
  }

  const client = ensureSupabase();
  const trimmedTitle = input.title.trim();
  if (!trimmedTitle) {
    throw new Error("Vui lòng nhập tiêu đề sự kiện.");
  }
  if (trimmedTitle.length > TEAM_MATCH_TITLE_MAX_LENGTH) {
    throw new Error(`Tiêu đề không được dài hơn ${TEAM_MATCH_TITLE_MAX_LENGTH} ký tự.`);
  }

  const mapUrlError = validateGoogleMapUrlInput(input.locationMapUrl ?? "");
  if (mapUrlError) throw new Error(mapUrlError);

  const startsAtIsoList: string[] = [];
  for (const startsAt of input.startsAtList) {
    const startsAtDate = new Date(startsAt);
    if (Number.isNaN(startsAtDate.getTime())) {
      throw new Error(TEAM_NOTIFICATION_MESSAGES.matchInvalidTime);
    }
    startsAtIsoList.push(startsAtDate.toISOString());
  }

  const uniqueStartsAt = new Set(startsAtIsoList);
  if (uniqueStartsAt.size !== startsAtIsoList.length) {
    throw new Error("Các lần lặp không được trùng thời gian.");
  }

  const normalizedLocation = input.location?.trim() || null;
  const normalizedMapUrl = normalizeGoogleMapUrl(input.locationMapUrl ?? "");
  const normalizedNotes = input.notes?.trim() || null;

  const existingMatches = await getTeamMatches(teamId);
  const draftMatches: TeamMatch[] = [...existingMatches];

  for (const startsAtIso of startsAtIsoList) {
    const conflicts = findScheduleConflicts(draftMatches, {
      startsAt: startsAtIso,
      matchType: input.matchType,
    });
    if (conflicts.length > 0) {
      throw new Error(formatScheduleConflictMessage(conflicts[0]));
    }

    draftMatches.push({
      id: `draft-${startsAtIso}`,
      team_id: teamId,
      title: trimmedTitle,
      match_type: input.matchType,
      location: normalizedLocation,
      location_map_url: normalizedMapUrl,
      starts_at: startsAtIso,
      notes: normalizedNotes,
      lineup_id: null,
      lineup_snapshot: null,
      applied_lineups: [],
      created_by: createdBy,
      created_at: startsAtIso,
    });
  }

  const { data, error } = await client
    .from("team_matches")
    .insert(
      startsAtIsoList.map((startsAtIso) => ({
        team_id: teamId,
        created_by: createdBy,
        title: trimmedTitle,
        match_type: input.matchType,
        starts_at: startsAtIso,
        location: normalizedLocation,
        location_map_url: normalizedMapUrl,
        notes: normalizedNotes,
      })),
    )
    .select(teamMatchColumns);

  if (error) throwRepositoryError("Failed to create team match", error);
  return (data ?? []) as TeamMatch[];
}

export async function updateTeamMatch(
  matchId: string,
  input: {
    title: string;
    matchType: TeamMatchType;
    startsAt: string;
    location?: string | null;
    locationMapUrl?: string | null;
    notes?: string | null;
  },
): Promise<TeamMatch> {
  const client = ensureSupabase();
  assertValidUuid(matchId, "Match id");

  const trimmedTitle = input.title.trim();
  if (!trimmedTitle) {
    throw new Error("Vui lòng nhập tiêu đề sự kiện.");
  }
  if (trimmedTitle.length > TEAM_MATCH_TITLE_MAX_LENGTH) {
    throw new Error(`Tiêu đề không được dài hơn ${TEAM_MATCH_TITLE_MAX_LENGTH} ký tự.`);
  }

  const mapUrlError = validateGoogleMapUrlInput(input.locationMapUrl ?? "");
  if (mapUrlError) throw new Error(mapUrlError);

  const startsAtDate = new Date(input.startsAt);
  if (Number.isNaN(startsAtDate.getTime())) {
    throw new Error(TEAM_NOTIFICATION_MESSAGES.matchInvalidTime);
  }
  const startsAtIso = startsAtDate.toISOString();

  const existingMatch = await getTeamMatch(matchId);
  const existingMatches = await getTeamMatches(existingMatch.team_id);
  const conflicts = findScheduleConflicts(existingMatches, {
    startsAt: startsAtIso,
    matchType: input.matchType,
    excludeMatchId: matchId,
  });
  if (conflicts.length > 0) {
    throw new Error(formatScheduleConflictMessage(conflicts[0]));
  }

  const { data, error } = await client
    .from("team_matches")
    .update({
      title: trimmedTitle,
      match_type: input.matchType,
      starts_at: startsAtIso,
      location: input.location?.trim() || null,
      location_map_url: normalizeGoogleMapUrl(input.locationMapUrl ?? ""),
      notes: input.notes?.trim() || null,
    })
    .eq("id", matchId)
    .select(teamMatchColumns)
    .single();

  if (error) throwRepositoryError("Failed to update team match", error);
  if (!data) throw new Error(TEAM_NOTIFICATION_MESSAGES.matchUpdateFailed);
  const mapped = mapTeamMatchRow(data);
  if (!mapped) throw new Error(TEAM_NOTIFICATION_MESSAGES.matchUpdateFailed);
  return mapped;
}

export async function applyMatchLineups(
  matchId: string,
  lineups: MatchLineupSnapshot[],
): Promise<TeamMatch> {
  const client = ensureSupabase();
  assertValidUuid(matchId, "Match id");

  const firstLineup = lineups[0] ?? null;

  const { data, error } = await client
    .from("team_matches")
    .update({
      applied_lineups: lineups,
      lineup_id: firstLineup?.lineup_id ?? null,
      lineup_snapshot: firstLineup,
    })
    .eq("id", matchId)
    .select(teamMatchColumns)
    .single();

  if (error) throwRepositoryError("Failed to apply match lineups", error);
  if (!data) throw new Error(TEAM_NOTIFICATION_MESSAGES.matchLineupApplyFailed);
  const mapped = mapTeamMatchRow(data);
  if (!mapped) throw new Error(TEAM_NOTIFICATION_MESSAGES.matchLineupApplyFailed);
  return mapped;
}

export async function getTeamMatch(matchId: string): Promise<TeamMatch> {
  const client = ensureSupabase();
  assertValidUuid(matchId, "Match id");
  const { data, error } = await client
    .from("team_matches")
    .select(teamMatchColumns)
    .eq("id", matchId)
    .single();

  if (error) throwRepositoryError("Failed to get team match", error);
  if (!data) throw new Error(TEAM_NOTIFICATION_MESSAGES.matchNotFound);
  const mapped = mapTeamMatchRow(data);
  if (!mapped) throw new Error(TEAM_NOTIFICATION_MESSAGES.matchNotFound);
  return mapped;
}

export async function getMatchAttendance(matchId: string): Promise<TeamMatchAttendance[]> {
  const client = ensureSupabase();
  assertValidUuid(matchId, "Match id");
  const { data, error } = await client
    .from("team_match_attendance")
    .select(teamMatchAttendanceColumns)
    .eq("match_id", matchId)
    .order("updated_at", { ascending: false });

  if (error) {
    if (/column team_match_attendance\.created_at does not exist/i.test(error.message ?? "")) {
      const { data: fallbackData, error: fallbackError } = await client
        .from("team_match_attendance")
        .select("id,match_id,member_id,status,updated_by,responded_at,updated_at")
        .eq("match_id", matchId)
        .order("updated_at", { ascending: false });

      if (fallbackError) throwRepositoryError("Failed to get match attendance", fallbackError);
      return (fallbackData ?? []) as TeamMatchAttendance[];
    }

    throwRepositoryError("Failed to get match attendance", error);
  }

  return (data ?? []) as TeamMatchAttendance[];
}

export async function getMyAttendanceByMatchIds(
  matchIds: string[],
  memberId: string,
): Promise<Record<string, TeamMatchAttendanceStatus>> {
  if (matchIds.length === 0) return {};

  const client = ensureSupabase();
  assertValidUuid(memberId, "Member id");
  for (const matchId of matchIds) {
    assertValidUuid(matchId, "Match id");
  }

  const { data, error } = await client
    .from("team_match_attendance")
    .select("match_id,status")
    .in("match_id", matchIds)
    .eq("member_id", memberId);

  if (error) throwRepositoryError("Failed to get match attendance", error);

  const attendanceByMatchId: Record<string, TeamMatchAttendanceStatus> = {};
  for (const row of data ?? []) {
    attendanceByMatchId[row.match_id as string] = row.status as TeamMatchAttendanceStatus;
  }

  return attendanceByMatchId;
}

export async function upsertMatchAttendance(
  matchId: string,
  memberId: string,
  status: TeamMatchAttendanceStatus,
): Promise<TeamMatchAttendance> {
  const client = ensureSupabase();
  assertValidUuid(matchId, "Match id");
  assertValidUuid(memberId, "Member id");
  const { data, error } = await client.rpc("upsert_team_match_attendance", {
    p_match_id: matchId,
    p_member_id: memberId,
    p_status: status,
  });

  if (error) throwRepositoryError("Failed to update match attendance", error);
  if (!data) throw new Error(TEAM_NOTIFICATION_MESSAGES.matchAttendanceUpdateFailed);
  return data as TeamMatchAttendance;
}

export async function deleteTeamMatch(matchId: string): Promise<string> {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("team_matches")
    .delete()
    .eq("id", matchId)
    .select("id")
    .single();

  if (error) throwRepositoryError("Failed to delete team match", error);
  if (!data) throw new Error("Failed to delete team match: Match not found or you do not have permission to delete it.");
  return data.id as string;
}

export async function deleteTeamMatches(matchIds: string[]): Promise<number> {
  if (matchIds.length === 0) return 0;
  for (const matchId of matchIds) {
    assertValidUuid(matchId, "Match id");
  }

  const client = ensureSupabase();
  const { data, error } = await client
    .from("team_matches")
    .delete()
    .in("id", matchIds)
    .select("id");

  if (error) throwRepositoryError("Failed to delete team matches", error);
  return data?.length ?? 0;
}

export async function deleteAllTeamMatches(teamId: string): Promise<number> {
  assertValidUuid(teamId, "Team id");
  const client = ensureSupabase();
  const { data, error } = await client
    .from("team_matches")
    .delete()
    .eq("team_id", teamId)
    .select("id");

  if (error) throwRepositoryError("Failed to delete all team matches", error);
  return data?.length ?? 0;
}
