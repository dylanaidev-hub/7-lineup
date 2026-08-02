export type TeamMemberRole = "admin" | "player";
export type TeamInviteStatus = "pending" | "accepted" | "declined" | "expired";
export type TeamLeaveRequestStatus = "pending" | "approved" | "declined";
export type TeamMatchType = "match" | "training";
export type TeamMatchAttendanceStatus = "going" | "not_going" | "maybe" | "unknown";

export interface MatchLineupSnapshot {
  lineup_id: string;
  name: string;
  format: string;
  players_data: unknown;
  applied_at: string;
}

export interface TeamMatch {
  id: string;
  team_id: string;
  title: string;
  match_type: TeamMatchType;
  location: string | null;
  location_map_url: string | null;
  starts_at: string;
  notes: string | null;
  lineup_id: string | null;
  lineup_snapshot: MatchLineupSnapshot | null;
  applied_lineups: MatchLineupSnapshot[];
  created_by: string;
  created_at: string;
}

export interface TeamMatchAttendance {
  id: string;
  match_id: string;
  member_id: string;
  status: TeamMatchAttendanceStatus;
  updated_by: string | null;
  responded_at: string | null;
  created_at?: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  created_by: string;
  user_id?: string | null;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string | null;
  player_name: string;
  role: TeamMemberRole;
  jersey_number?: number | null;
  created_at: string;
}

export interface TeamInvite {
  id: string;
  team_id: string;
  invited_user_id: string;
  invited_by: string;
  role: TeamMemberRole;
  status: TeamInviteStatus;
  expires_at: string;
  responded_at: string | null;
  created_at: string;
  team?: Pick<Team, "id" | "name" | "logo_url"> | null;
}

export interface TeamLeaveRequest {
  id: string;
  team_id: string;
  member_id: string | null;
  requested_by: string;
  status: TeamLeaveRequestStatus;
  reviewed_by: string | null;
  responded_at: string | null;
  created_at: string;
  team?: Pick<Team, "id" | "name" | "logo_url"> | null;
  member?: Pick<TeamMember, "id" | "player_name" | "role" | "user_id"> | null;
}

export interface TeamJoinLink {
  id: string;
  team_id: string;
  created_by: string;
  token: string;
  role: TeamMemberRole;
  expires_at: string;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

export interface TeamJoinLinkPreview {
  id: string;
  team_id: string;
  team_name: string;
  logo_url: string | null;
  expires_at: string;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
}

export interface SearchableProfile {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  email: string | null;
  id?: string;
  username?: string | null;
  full_name?: string | null;
}

export interface TeamDetails extends Team {
  members: TeamMember[];
}
