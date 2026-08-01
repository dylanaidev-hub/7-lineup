import { create } from "zustand";
import {
  addTeamMember,
  createTeamEvent,
  createTeam,
  deleteTeamMember,
  deleteTeam,
  getEventsByTeam,
  getTeamDetails,
  getTeamsByUser,
  searchProfiles,
  updateAttendance,
} from "../repositories/teamRepository";
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

type TeamStore = {
  teams: Team[];
  currentTeam: TeamDetails | null;
  events: TeamEvent[];
  isLoadingTeams: boolean;
  isLoadingTeamDetails: boolean;
  isLoadingEvents: boolean;
  error: string | null;
  clearError: () => void;
  clearCurrentTeam: () => void;
  fetchTeamsByUser: (userId: string) => Promise<Team[]>;
  fetchTeamDetails: (teamId: string) => Promise<TeamDetails>;
  createTeam: (name: string, createdBy: string) => Promise<Team>;
  deleteTeam: (teamId: string) => Promise<string>;
  searchProfiles: (query: string) => Promise<SearchableProfile[]>;
  addTeamMember: (
    teamId: string,
    playerName: string,
    role: TeamMemberRole,
    userId?: string,
    jerseyNumber?: number | null,
  ) => Promise<TeamMember>;
  deleteTeamMember: (memberId: string) => Promise<string>;
  fetchEventsByTeam: (teamId: string) => Promise<TeamEvent[]>;
  createTeamEvent: (teamId: string, title: string, eventDate: string, eventType: TeamEventType) => Promise<TeamEvent>;
  updateAttendance: (eventId: string, memberId: string, status: AttendanceStatus) => Promise<Attendance>;
};

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : "Unknown team management error.";

export const useTeamStore = create<TeamStore>((set) => ({
  teams: [],
  currentTeam: null,
  events: [],
  isLoadingTeams: false,
  isLoadingTeamDetails: false,
  isLoadingEvents: false,
  error: null,
  clearError: () => set({ error: null }),
  clearCurrentTeam: () => set({ currentTeam: null, events: [] }),
  fetchTeamsByUser: async (userId) => {
    set({ isLoadingTeams: true, error: null });
    try {
      const teams = await getTeamsByUser(userId);
      set({ teams, isLoadingTeams: false });
      return teams;
    } catch (error) {
      const message = getErrorMessage(error);
      set({ error: message, isLoadingTeams: false });
      throw error;
    }
  },
  fetchTeamDetails: async (teamId) => {
    set({ isLoadingTeamDetails: true, error: null });
    try {
      const currentTeam = await getTeamDetails(teamId);
      set({ currentTeam, isLoadingTeamDetails: false });
      return currentTeam;
    } catch (error) {
      const message = getErrorMessage(error);
      set({ error: message, isLoadingTeamDetails: false });
      throw error;
    }
  },
  createTeam: async (name, createdBy) => {
    set({ isLoadingTeams: true, error: null });
    try {
      const team = await createTeam(name, createdBy);
      set((state) => ({ teams: [team, ...state.teams], isLoadingTeams: false }));
      return team;
    } catch (error) {
      const message = getErrorMessage(error);
      set({ error: message, isLoadingTeams: false });
      throw error;
    }
  },
  deleteTeam: async (teamId) => {
    set({ error: null });
    try {
      const deletedTeamId = await deleteTeam(teamId);
      set((state) => ({
        teams: state.teams.filter((team) => team.id !== deletedTeamId),
        currentTeam: state.currentTeam?.id === deletedTeamId ? null : state.currentTeam,
        events: state.currentTeam?.id === deletedTeamId ? [] : state.events,
      }));
      return deletedTeamId;
    } catch (error) {
      const message = getErrorMessage(error);
      set({ error: message });
      throw error;
    }
  },
  searchProfiles: async (query) => {
    set({ error: null });
    try {
      return await searchProfiles(query);
    } catch (error) {
      const message = getErrorMessage(error);
      set({ error: message });
      throw error;
    }
  },
  addTeamMember: async (teamId, playerName, role, userId, jerseyNumber) => {
    set({ error: null });
    try {
      const member = await addTeamMember(teamId, playerName, role, userId, jerseyNumber);
      set((state) => ({
        currentTeam: state.currentTeam?.id === teamId
          ? { ...state.currentTeam, members: [...state.currentTeam.members, member] }
          : state.currentTeam,
      }));
      return member;
    } catch (error) {
      const message = getErrorMessage(error);
      set({ error: message });
      throw error;
    }
  },
  deleteTeamMember: async (memberId) => {
    set({ error: null });
    try {
      const deletedMemberId = await deleteTeamMember(memberId);
      set((state) => ({
        currentTeam: state.currentTeam
          ? { ...state.currentTeam, members: state.currentTeam.members.filter((member) => member.id !== deletedMemberId) }
          : state.currentTeam,
      }));
      return deletedMemberId;
    } catch (error) {
      const message = getErrorMessage(error);
      set({ error: message });
      throw error;
    }
  },
  fetchEventsByTeam: async (teamId) => {
    set({ isLoadingEvents: true, error: null });
    try {
      const events = await getEventsByTeam(teamId);
      set({ events, isLoadingEvents: false });
      return events;
    } catch (error) {
      const message = getErrorMessage(error);
      set({ error: message, isLoadingEvents: false });
      throw error;
    }
  },
  createTeamEvent: async (teamId, title, eventDate, eventType) => {
    set({ error: null });
    try {
      const event = await createTeamEvent(teamId, title, eventDate, eventType);
      set((state) => ({
        events: [...state.events, event].sort((left, right) =>
          new Date(left.event_date).getTime() - new Date(right.event_date).getTime(),
        ),
      }));
      return event;
    } catch (error) {
      const message = getErrorMessage(error);
      set({ error: message });
      throw error;
    }
  },
  updateAttendance: async (eventId, memberId, status) => {
    set({ error: null });
    try {
      const nextAttendance = await updateAttendance(eventId, memberId, status);
      return nextAttendance;
    } catch (error) {
      const message = getErrorMessage(error);
      set({ error: message });
      throw error;
    }
  },
}));
