export type TeamMemberRole = "admin" | "player";
export type TeamEventType = "match" | "training";
export type AttendanceStatus = "going" | "not_going" | "pending";

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
