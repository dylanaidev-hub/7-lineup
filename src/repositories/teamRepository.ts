import { supabase } from "../lib/supabaseClient";
import type {
  Attendance,
  AttendanceStatus,
  SearchableProfile,
  Team,
  TeamDetails,
  TeamEvent,
  TeamEventType,
  TeamMember,
  TeamMemberRole,
} from "../types/team";

const teamColumns = "id,name,logo_url,created_by,created_at";
const teamMemberColumns = "id,team_id,user_id,player_name,role,jersey_number,created_at";
const eventColumns = "id,team_id,title,event_date,event_type,lineup_id,created_at";
const attendanceColumns = "id,event_id,member_id,status,updated_at";

type SearchUsersForTeamRow = {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  email: string | null;
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
  throw new Error(`${action}: ${details}`);
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
  if (!userId) throw new Error("Please select an existing user before adding them to the team.");

  const { data: existingMember, error: existingMemberError } = await client
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingMemberError) throwRepositoryError("Failed to check team member", existingMemberError);
  if (existingMember) throw new Error("User này đã có trong đội.");

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

export async function getEventsByTeam(teamId: string): Promise<TeamEvent[]> {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("events")
    .select(eventColumns)
    .eq("team_id", teamId)
    .order("event_date", { ascending: true });

  if (error) throwRepositoryError("Failed to get events by team", error);
  return (data ?? []) as TeamEvent[];
}

export async function createTeamEvent(
  teamId: string,
  title: string,
  eventDate: string,
  eventType: TeamEventType,
): Promise<TeamEvent> {
  const client = ensureSupabase();
  const normalizedTitle = title.trim();
  if (!normalizedTitle) throw new Error("Event title is required.");
  if (!eventDate) throw new Error("Event date is required.");

  const { data, error } = await client
    .from("events")
    .insert({
      team_id: teamId,
      title: normalizedTitle,
      event_date: new Date(eventDate).toISOString(),
      event_type: eventType,
    })
    .select(eventColumns)
    .single();

  if (error) throwRepositoryError("Failed to create event", error);
  return data as TeamEvent;
}

export async function updateAttendance(
  eventId: string,
  memberId: string,
  status: AttendanceStatus,
): Promise<Attendance> {
  const client = ensureSupabase();
  const { data, error } = await client
    .from("attendance")
    .update({ status })
    .eq("event_id", eventId)
    .eq("member_id", memberId)
    .select(attendanceColumns)
    .single();

  if (error) throwRepositoryError("Failed to update attendance", error);
  return data as Attendance;
}
