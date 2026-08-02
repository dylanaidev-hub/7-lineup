import { supabase } from "../lib/supabaseClient";
import { TEAM_NOTIFICATION_MESSAGES } from "../teamNotifications";
import type {
  SearchableProfile,
  Team,
  TeamDetails,
  TeamInvite,
  TeamJoinLink,
  TeamJoinLinkPreview,
  TeamLeaveRequest,
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
