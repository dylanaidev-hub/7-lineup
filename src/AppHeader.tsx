import { useEffect, useRef, useState, type RefObject } from "react";
import type { User } from "@supabase/supabase-js";
import { Bell, ChevronDown, LayoutTemplate } from "lucide-react";
import type { ToastMessage } from "./ToastStack";
import { useTeamStore } from "./stores/teamStore";
import { supabase } from "./lib/supabaseClient";
import { formatTeamNotification, getPlayerTeamNotificationFromError, TEAM_NOTIFICATION_MESSAGES } from "./teamNotifications";
import styles from "./AppHeader.module.css";

type LanguageMeta = {
  flag: string;
  label: string;
  next: "vi" | "en";
};

type AppHeaderCopy = {
  switchLanguage: string;
  signIn: string;
  profileMenu: string;
  lockerMenu: string;
  teamsMenu: string;
  createLineupButton: string;
  notifications: string;
  noNotifications: string;
  acceptInvite: string;
  declineInvite: string;
  approveLeaveRequest: string;
  declineLeaveRequest: string;
  signOut: string;
};

type AppHeaderProps = {
  copy: AppHeaderCopy;
  user: User | null;
  languageMeta: LanguageMeta;
  isUserMenuOpen: boolean;
  notifications: ToastMessage[];
  onToast: (message: string, tone?: "success" | "error") => void;
  userMenuRef: RefObject<HTMLDivElement | null>;
  onSwitchLanguage: () => void;
  onOpenSignIn: () => void;
  onToggleUserMenu: () => void;
  onOpenProfile: () => void;
  onOpenLocker: () => void;
  onOpenTeams: () => void;
  onOpenWorkspace: () => void;
  onOpenTeamDetail: (teamId: string) => void;
  onTeamMemberRemoved: (teamId: string) => void;
  onSignOut: () => void;
};

export function AppHeader({
  copy,
  user,
  languageMeta,
  isUserMenuOpen,
  notifications,
  onToast,
  userMenuRef,
  onSwitchLanguage,
  onOpenSignIn,
  onToggleUserMenu,
  onOpenProfile,
  onOpenLocker,
  onOpenTeams,
  onOpenWorkspace,
  onOpenTeamDetail,
  onTeamMemberRemoved,
  onSignOut,
}: AppHeaderProps) {
  const notificationRef = useRef<HTMLDivElement>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const {
    pendingTeamInvites,
    pendingTeamLeaveRequests,
    fetchPendingTeamInvites,
    fetchPendingTeamLeaveRequests,
    fetchTeamsByUser,
    acceptTeamInvite,
    declineTeamInvite,
    approveTeamLeaveRequest,
    declineTeamLeaveRequest,
    clearCurrentTeam,
  } = useTeamStore();
  const adminLeaveRequests = pendingTeamLeaveRequests.filter((request) => request.requested_by !== user?.id);
  const hasNotifications = notifications.length > 0 || pendingTeamInvites.length > 0 || adminLeaveRequests.length > 0;

  useEffect(() => {
    if (!user?.id) return;

    void fetchPendingTeamInvites(user.id).catch((error) => {
      onToast(getPlayerTeamNotificationFromError(error, "playerInviteInvalid"), "error");
    });
    void fetchPendingTeamLeaveRequests().catch((error) => {
      onToast(getPlayerTeamNotificationFromError(error, "leaveRequestInvalid"), "error");
    });
  }, [fetchPendingTeamInvites, fetchPendingTeamLeaveRequests, onToast, user?.id]);

  useEffect(() => {
    if (!user?.id || !supabase) return;
    const client = supabase;

    const channel = client
      .channel(`team-invites:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_invites",
          filter: `invited_user_id=eq.${user.id}`,
        },
        (payload) => {
          const newInviteId = typeof payload.new.id === "string" ? payload.new.id : null;
          void fetchPendingTeamInvites(user.id)
            .then((invites) => {
              const newInvite = newInviteId ? invites.find((invite) => invite.id === newInviteId) : null;
              onToast(formatTeamNotification("playerInviteReceived", newInvite?.team?.name));
            })
            .catch((error) => {
              onToast(getPlayerTeamNotificationFromError(error, "playerInviteInvalid"), "error");
            });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [fetchPendingTeamInvites, onToast, user?.id]);

  useEffect(() => {
    if (!user?.id || !supabase) return;
    const client = supabase;

    const channel = client
      .channel(`team-leave-requests:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_leave_requests",
        },
        (payload) => {
          const requestUserId = typeof payload.new.requested_by === "string" ? payload.new.requested_by : "";
          void fetchPendingTeamLeaveRequests()
            .then((requests) => {
              const requestId = typeof payload.new.id === "string" ? payload.new.id : "";
              const request = requests.find((pendingRequest) => pendingRequest.id === requestId);
              if (request && requestUserId !== user.id) {
                onToast(formatTeamNotification("leaveRequestReceived", request.team?.name));
              }
            })
            .catch((error) => {
              onToast(getPlayerTeamNotificationFromError(error, "leaveRequestInvalid"), "error");
            });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "team_leave_requests",
          filter: `requested_by=eq.${user.id}`,
        },
        (payload) => {
          const nextStatus = typeof payload.new.status === "string" ? payload.new.status : "";
          void fetchPendingTeamLeaveRequests().catch(() => undefined);
          if (nextStatus === "declined") {
            onToast(TEAM_NOTIFICATION_MESSAGES.playerLeaveRequestDeclined, "error");
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [fetchPendingTeamLeaveRequests, onToast, user?.id]);

  useEffect(() => {
    if (!user?.id || !supabase) return;
    const client = supabase;

    const channel = client
      .channel(`team-invite-responses:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "team_invites",
          filter: `invited_by=eq.${user.id}`,
        },
        (payload) => {
          const nextStatus = typeof payload.new.status === "string" ? payload.new.status : "";
          if (nextStatus === "declined") {
            onToast(TEAM_NOTIFICATION_MESSAGES.inviteDeclined, "error");
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [onToast, user?.id]);

  useEffect(() => {
    if (!user?.id || !supabase) return;
    const client = supabase;

    const channel = client
      .channel(`team-member-removal:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "team_members",
        },
        (payload) => {
          const removedUserId = typeof payload.old.user_id === "string" ? payload.old.user_id : "";
          if (removedUserId !== user.id) return;
          const removedTeamId = typeof payload.old.team_id === "string" ? payload.old.team_id : "";
          if (!removedTeamId) return;
          onToast(TEAM_NOTIFICATION_MESSAGES.playerRemovedFromTeam, "error");
          clearCurrentTeam();
          void fetchTeamsByUser(user.id).catch((error) => {
            onToast(getPlayerTeamNotificationFromError(error, "playerTeamAccessDenied"), "error");
          });
          onTeamMemberRemoved(removedTeamId);
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [clearCurrentTeam, fetchTeamsByUser, onTeamMemberRemoved, onToast, user?.id]);

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      const member = await acceptTeamInvite(inviteId);
      if (user?.id) void fetchTeamsByUser(user.id).catch(() => undefined);
      onToast(TEAM_NOTIFICATION_MESSAGES.playerAcceptInviteSuccess);
      onOpenTeamDetail(member.team_id);
    } catch (error) {
      onToast(getPlayerTeamNotificationFromError(error, "playerAcceptInviteFailed"), "error");
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      await declineTeamInvite(inviteId);
      onToast(TEAM_NOTIFICATION_MESSAGES.playerDeclineInviteSuccess);
    } catch (error) {
      onToast(getPlayerTeamNotificationFromError(error, "playerDeclineInviteFailed"), "error");
    }
  };

  const handleApproveLeaveRequest = async (requestId: string) => {
    try {
      await approveTeamLeaveRequest(requestId);
      onToast(TEAM_NOTIFICATION_MESSAGES.leaveRequestApproved);
    } catch (error) {
      onToast(getPlayerTeamNotificationFromError(error, "leaveRequestInvalid"), "error");
    }
  };

  const handleDeclineLeaveRequest = async (requestId: string) => {
    try {
      await declineTeamLeaveRequest(requestId);
      onToast(TEAM_NOTIFICATION_MESSAGES.leaveRequestDeclined);
    } catch (error) {
      onToast(getPlayerTeamNotificationFromError(error, "leaveRequestInvalid"), "error");
    }
  };

  useEffect(() => {
    if (!isNotificationOpen) return;

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (notificationRef.current?.contains(target)) return;
      setIsNotificationOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
  }, [isNotificationOpen]);

  return (
    <header className={`${styles.titleBar} mx-auto flex w-full max-w-5xl items-center shadow-2xl`}>
      <img className={styles.logo} src="/site-logo.png" alt="Đội Hình Sân Cỏ" />
      <div className={styles.actions}>
        <button type="button" className={styles.languageSwitch} onClick={onSwitchLanguage} aria-label={copy.switchLanguage}>
          <span aria-hidden="true">{languageMeta.flag}</span>
          {languageMeta.label}
        </button>
        {!user ? (
          <button type="button" className={styles.loginButton} onClick={onOpenSignIn}>
            {copy.signIn}
          </button>
        ) : (
          <div ref={userMenuRef} className={styles.userMenu}>
            <span>{user.email}</span>
            <button
              type="button"
              className={styles.workspaceButton}
              onClick={onOpenWorkspace}
              title={copy.createLineupButton}
            >
              <LayoutTemplate size={15} />
              <span>{copy.createLineupButton}</span>
            </button>
            <div ref={notificationRef} className={styles.notificationMenu}>
              <button
                type="button"
                className={styles.notificationButton}
                onClick={() => setIsNotificationOpen((current) => !current)}
                aria-label={copy.notifications}
                aria-expanded={isNotificationOpen}
                aria-haspopup="menu"
                title={copy.notifications}
              >
                <Bell size={16} />
                {hasNotifications ? <span className={styles.notificationDot} aria-hidden="true" /> : null}
              </button>
              {isNotificationOpen ? (
                <div className={styles.notificationDropdown} role="menu">
                  <div className={styles.notificationHeader}>{copy.notifications}</div>
                  {hasNotifications ? (
                    <div className={styles.notificationList}>
                      {pendingTeamInvites.map((invite) => (
                        <div key={invite.id} className={styles.inviteItem}>
                          <p>{formatTeamNotification("playerInviteReceived", invite.team?.name)}</p>
                          <div className={styles.inviteActions}>
                            <button type="button" className={styles.acceptInviteButton} onClick={() => void handleAcceptInvite(invite.id)}>
                              {copy.acceptInvite}
                            </button>
                            <button type="button" className={styles.declineInviteButton} onClick={() => void handleDeclineInvite(invite.id)}>
                              {copy.declineInvite}
                            </button>
                          </div>
                        </div>
                      ))}
                      {adminLeaveRequests.map((request) => (
                        <div key={request.id} className={styles.inviteItem}>
                          <p>
                            {request.member?.player_name
                              ? `${request.member.player_name} yêu cầu rời team ${request.team?.name ?? ""}.`
                              : formatTeamNotification("leaveRequestReceived", request.team?.name)}
                          </p>
                          <div className={styles.inviteActions}>
                            <button type="button" className={styles.acceptInviteButton} onClick={() => void handleApproveLeaveRequest(request.id)}>
                              {copy.approveLeaveRequest}
                            </button>
                            <button type="button" className={styles.declineInviteButton} onClick={() => void handleDeclineLeaveRequest(request.id)}>
                              {copy.declineLeaveRequest}
                            </button>
                          </div>
                        </div>
                      ))}
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`${styles.notificationItem} ${notification.tone === "error" ? styles.notificationItemError : ""}`}
                        >
                          {notification.message}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.notificationEmpty}>{copy.noNotifications}</div>
                  )}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className={styles.dropdownButton}
              onClick={onToggleUserMenu}
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
            >
              <ChevronDown size={16} />
            </button>
            {isUserMenuOpen ? (
              <div className={styles.userDropdown} role="menu">
                <button type="button" onClick={onOpenProfile}>
                  {copy.profileMenu}
                </button>
                <button type="button" onClick={onOpenLocker}>
                  {copy.lockerMenu}
                </button>
                <button type="button" onClick={onOpenTeams}>
                  {copy.teamsMenu}
                </button>
                <button type="button" onClick={onSignOut}>
                  {copy.signOut}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </header>
  );
}
