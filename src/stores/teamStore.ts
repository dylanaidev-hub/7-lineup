import { create } from "zustand";
import {
  addTeamMember,
  acceptTeamInvite,
  approveTeamLeaveRequest,
  checkTeamMembership,
  createTeamJoinLink,
  createTeam,
  declineTeamLeaveRequest,
  declineTeamInvite,
  deleteTeamMember,
  deleteTeam,
  getPendingTeamInvites,
  getPendingTeamLeaveRequests,
  getTeamDetails,
  getTeamJoinLink,
  getTeamsByUser,
  inviteTeamMember,
  joinTeamByLink,
  requestTeamLeave,
  searchProfiles,
} from "../repositories/teamRepository";
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

type TeamStore = {
  teams: Team[];
  currentTeam: TeamDetails | null;
  pendingTeamInvites: TeamInvite[];
  pendingTeamLeaveRequests: TeamLeaveRequest[];
  currentJoinLink: TeamJoinLink | null;
  currentJoinLinkPreview: TeamJoinLinkPreview | null;
  isLoadingTeams: boolean;
  isLoadingTeamDetails: boolean;
  isLoadingTeamInvites: boolean;
  isLoadingTeamLeaveRequests: boolean;
  error: string | null;
  clearError: () => void;
  clearCurrentTeam: () => void;
  fetchTeamsByUser: (userId: string) => Promise<Team[]>;
  fetchTeamDetails: (teamId: string) => Promise<TeamDetails>;
  checkTeamMembership: (teamId: string, userId: string) => Promise<boolean>;
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
  fetchPendingTeamInvites: (userId: string) => Promise<TeamInvite[]>;
  inviteTeamMember: (teamId: string, invitedUserId: string, role?: TeamMemberRole) => Promise<TeamInvite>;
  acceptTeamInvite: (inviteId: string) => Promise<TeamMember>;
  declineTeamInvite: (inviteId: string) => Promise<TeamInvite>;
  createTeamJoinLink: (teamId: string) => Promise<TeamJoinLink>;
  fetchTeamJoinLink: (token: string) => Promise<TeamJoinLinkPreview | null>;
  joinTeamByLink: (token: string) => Promise<TeamMember>;
  fetchPendingTeamLeaveRequests: () => Promise<TeamLeaveRequest[]>;
  requestTeamLeave: (teamId: string) => Promise<TeamLeaveRequest>;
  approveTeamLeaveRequest: (requestId: string) => Promise<TeamLeaveRequest>;
  declineTeamLeaveRequest: (requestId: string) => Promise<TeamLeaveRequest>;
  deleteTeamMember: (memberId: string) => Promise<string>;
};

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : "Unknown team management error.";

export const useTeamStore = create<TeamStore>((set) => ({
  teams: [],
  currentTeam: null,
  pendingTeamInvites: [],
  pendingTeamLeaveRequests: [],
  currentJoinLink: null,
  currentJoinLinkPreview: null,
  isLoadingTeams: false,
  isLoadingTeamDetails: false,
  isLoadingTeamInvites: false,
  isLoadingTeamLeaveRequests: false,
  error: null,
  clearError: () => set({ error: null }),
  clearCurrentTeam: () => set({ currentTeam: null }),
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
  checkTeamMembership: async (teamId, userId) => {
    set({ error: null });
    try {
      return await checkTeamMembership(teamId, userId);
    } catch (error) {
      const message = getErrorMessage(error);
      set({ error: message });
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
  fetchPendingTeamInvites: async (userId) => {
    set({ isLoadingTeamInvites: true, error: null });
    try {
      const pendingTeamInvites = await getPendingTeamInvites(userId);
      set({ pendingTeamInvites, isLoadingTeamInvites: false });
      return pendingTeamInvites;
    } catch (error) {
      const message = getErrorMessage(error);
      set({ error: message, isLoadingTeamInvites: false });
      throw error;
    }
  },
  inviteTeamMember: async (teamId, invitedUserId, role = "player") => {
    set({ error: null });
    try {
      return await inviteTeamMember(teamId, invitedUserId, role);
    } catch (error) {
      const message = getErrorMessage(error);
      set({ error: message });
      throw error;
    }
  },
  acceptTeamInvite: async (inviteId) => {
    set({ error: null });
    try {
      const member = await acceptTeamInvite(inviteId);
      set((state) => ({
        pendingTeamInvites: state.pendingTeamInvites.filter((invite) => invite.id !== inviteId),
        currentTeam: state.currentTeam?.id === member.team_id
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
  declineTeamInvite: async (inviteId) => {
    set({ error: null });
    try {
      const invite = await declineTeamInvite(inviteId);
      set((state) => ({
        pendingTeamInvites: state.pendingTeamInvites.filter((pendingInvite) => pendingInvite.id !== inviteId),
      }));
      return invite;
    } catch (error) {
      const message = getErrorMessage(error);
      set({ error: message });
      throw error;
    }
  },
  createTeamJoinLink: async (teamId) => {
    set({ error: null });
    try {
      const currentJoinLink = await createTeamJoinLink(teamId);
      set({ currentJoinLink });
      return currentJoinLink;
    } catch (error) {
      const message = getErrorMessage(error);
      set({ error: message });
      throw error;
    }
  },
  fetchTeamJoinLink: async (token) => {
    set({ error: null });
    try {
      const currentJoinLinkPreview = await getTeamJoinLink(token);
      set({ currentJoinLinkPreview });
      return currentJoinLinkPreview;
    } catch (error) {
      const message = getErrorMessage(error);
      set({ error: message });
      throw error;
    }
  },
  joinTeamByLink: async (token) => {
    set({ error: null });
    try {
      const member = await joinTeamByLink(token);
      set((state) => ({
        currentJoinLinkPreview: null,
        currentTeam: state.currentTeam?.id === member.team_id
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
  fetchPendingTeamLeaveRequests: async () => {
    set({ isLoadingTeamLeaveRequests: true, error: null });
    try {
      const pendingTeamLeaveRequests = await getPendingTeamLeaveRequests();
      set({ pendingTeamLeaveRequests, isLoadingTeamLeaveRequests: false });
      return pendingTeamLeaveRequests;
    } catch (error) {
      const message = getErrorMessage(error);
      set({ error: message, isLoadingTeamLeaveRequests: false });
      throw error;
    }
  },
  requestTeamLeave: async (teamId) => {
    set({ error: null });
    try {
      return await requestTeamLeave(teamId);
    } catch (error) {
      const message = getErrorMessage(error);
      set({ error: message });
      throw error;
    }
  },
  approveTeamLeaveRequest: async (requestId) => {
    set({ error: null });
    try {
      const request = await approveTeamLeaveRequest(requestId);
      set((state) => ({
        pendingTeamLeaveRequests: state.pendingTeamLeaveRequests.filter((pendingRequest) => pendingRequest.id !== requestId),
        currentTeam: state.currentTeam?.id === request.team_id && request.member_id
          ? {
              ...state.currentTeam,
              members: state.currentTeam.members.filter((member) => member.id !== request.member_id),
            }
          : state.currentTeam,
      }));
      return request;
    } catch (error) {
      const message = getErrorMessage(error);
      set({ error: message });
      throw error;
    }
  },
  declineTeamLeaveRequest: async (requestId) => {
    set({ error: null });
    try {
      const request = await declineTeamLeaveRequest(requestId);
      set((state) => ({
        pendingTeamLeaveRequests: state.pendingTeamLeaveRequests.filter((pendingRequest) => pendingRequest.id !== requestId),
      }));
      return request;
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
}));
