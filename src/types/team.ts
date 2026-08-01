export type TeamMemberRole = "admin" | "player";
export type TeamEventType = "match" | "training";
export type AttendanceStatus = "going" | "not_going" | "pending";
export type TeamInviteStatus = "pending" | "accepted" | "declined" | "expired";
export type TeamLeaveRequestStatus = "pending" | "approved" | "declined";

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

export interface Event {
  id: string;
  team_id: string;
  title: string;
  event_date: string;
  event_type: TeamEventType;
  lineup_id: string | null;
  created_at: string;
}

export type TeamEvent = Event;

export interface Attendance {
  id: string;
  event_id: string;
  member_id: string;
  status: AttendanceStatus;
  updated_at: string;
}

export interface TeamDetails extends Team {
  members: TeamMember[];
}
