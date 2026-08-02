import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import QRCode from "qrcode";
import {
  ArrowLeft,
  Check,
  Copy,
  Link,
  Loader2,
  LogOut,
  Plus,
  QrCode,
  Shield,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useTeamStore } from "./stores/teamStore";
import { useDebounce } from "./hooks/useDebounce";
import { getPlayerTeamNotificationFromError, getTeamNotificationFromError, TEAM_NOTIFICATION_MESSAGES } from "./teamNotifications";
import type { SearchableProfile, TeamDetails, TeamJoinLink, TeamMember, TeamMemberRole } from "./types/team";
import styles from "./TeamPages.module.css";

type TeamDetailProps = {
  user: User | null;
  onRequireAuth: () => void;
  onToast: (message: string, tone?: "success" | "error") => void;
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const formatJoinedDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
  }).format(new Date(value));

function DetailSkeleton() {
  return (
    <div className={styles.stack}>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className={styles.detailSkeleton} />
      ))}
    </div>
  );
}

function RoleBadge({ role }: { role: TeamMemberRole }) {
  return (
    <span className={role === "admin" ? styles.adminBadge : styles.playerBadge}>
      {role === "admin" ? "Admin" : "Player"}
    </span>
  );
}

type MembersViewProps = {
  teamId: string;
  members: TeamMember[];
  isAdmin: boolean;
  isLoading: boolean;
  currentUserId: string;
  onRequireAuth: () => void;
  onToast: TeamDetailProps["onToast"];
};

function MembersView({ teamId, members, isAdmin, isLoading, currentUserId, onRequireAuth, onToast }: MembersViewProps) {
  const {
    inviteTeamMember,
    deleteTeamMember,
    searchProfiles,
    pendingTeamLeaveRequests,
    fetchPendingTeamLeaveRequests,
    approveTeamLeaveRequest,
    declineTeamLeaveRequest,
    createTeamJoinLink,
  } = useTeamStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const comboboxRef = useRef<HTMLDivElement>(null);
  const [profileSearchQuery, setProfileSearchQuery] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<SearchableProfile | null>(null);
  const [profileResults, setProfileResults] = useState<SearchableProfile[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchingProfiles, setIsSearchingProfiles] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isJoinLinkOpen, setIsJoinLinkOpen] = useState(false);
  const [joinLink, setJoinLink] = useState<TeamJoinLink | null>(null);
  const [joinLinkQr, setJoinLinkQr] = useState("");
  const [isCreatingJoinLink, setIsCreatingJoinLink] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [reviewingLeaveRequestId, setReviewingLeaveRequestId] = useState<string | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const debouncedProfileQuery = useDebounce(profileSearchQuery, 350);
  const pendingLeaveRequestByMemberId = useMemo(
    () =>
      new Map(
        pendingTeamLeaveRequests
          .filter((request) => request.team_id === teamId && request.member_id)
          .map((request) => [request.member_id, request]),
      ),
    [pendingTeamLeaveRequests, teamId],
  );
  const existingUserIds = useMemo(
    () => new Set(members.flatMap((member) => member.user_id ? [member.user_id] : [])),
    [members],
  );
  const availableProfileResults = useMemo(
    () => profileResults.filter((profile) => !existingUserIds.has(profile.user_id)),
    [existingUserIds, profileResults],
  );
  const isSelectedUserInTeam = Boolean(selectedProfile && existingUserIds.has(selectedProfile.user_id));
  const joinUrl = joinLink
    ? `${window.location.origin}/app/join-team?token=${encodeURIComponent(joinLink.token)}`
    : "";

  const getProfileDisplayName = (profile: SearchableProfile) =>
    profile.name?.trim() || profile.email?.trim() || "Người dùng chưa đặt tên";

  const getJoinUrl = (link: TeamJoinLink) =>
    `${window.location.origin}/app/join-team?token=${encodeURIComponent(link.token)}`;

  const copyJoinUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
  };

  useEffect(() => {
    if (!isAddMemberOpen) return;
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [isAddMemberOpen]);

  useEffect(() => {
    if (!isSearchOpen) return;

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      if (comboboxRef.current?.contains(event.target as Node)) return;
      setIsSearchOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
  }, [isSearchOpen]);

  useEffect(() => {
    if (!joinUrl) {
      setJoinLinkQr("");
      return;
    }

    let isCurrent = true;
    void QRCode.toDataURL(joinUrl, {
      width: 240,
      margin: 1,
      color: {
        dark: "#06120d",
        light: "#ffffff",
      },
    }).then((dataUrl) => {
      if (isCurrent) setJoinLinkQr(dataUrl);
    });

    return () => {
      isCurrent = false;
    };
  }, [joinUrl]);

  useEffect(() => {
    if (!isAdmin || !teamId) return;
    void fetchPendingTeamLeaveRequests().catch((error) => {
      onToast(getPlayerTeamNotificationFromError(error, "leaveRequestInvalid"), "error");
    });
  }, [fetchPendingTeamLeaveRequests, isAdmin, onToast, teamId]);

  useEffect(() => {
    const normalizedQuery = debouncedProfileQuery.trim();
    if (!isAddMemberOpen || selectedProfile || normalizedQuery.length < 2) {
      setProfileResults([]);
      setIsSearchingProfiles(false);
      return;
    }

    let isCurrentRequest = true;
    setIsSearchingProfiles(true);
    void searchProfiles(normalizedQuery)
      .then((profiles) => {
        if (!isCurrentRequest) return;
        setProfileResults(profiles);
        setIsSearchOpen(true);
      })
      .catch((error) => {
        if (!isCurrentRequest) return;
        setProfileResults([]);
        onToast(error instanceof Error ? error.message : "Không thể tìm người dùng.", "error");
      })
      .finally(() => {
        if (isCurrentRequest) setIsSearchingProfiles(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [debouncedProfileQuery, isAddMemberOpen, onToast, searchProfiles, selectedProfile]);

  const handleAddMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUserId) {
      onRequireAuth();
      return;
    }
    if (!isAdmin) {
      onToast(TEAM_NOTIFICATION_MESSAGES.noPermission, "error");
      return;
    }
    if (!selectedProfile) {
      onToast(TEAM_NOTIFICATION_MESSAGES.invalidIdentity, "error");
      return;
    }
    if (isSelectedUserInTeam) {
      onToast(TEAM_NOTIFICATION_MESSAGES.alreadyMember, "error");
      return;
    }

    setIsAddingMember(true);
    try {
      await inviteTeamMember(teamId, selectedProfile.user_id, "player");
      setProfileSearchQuery("");
      setSelectedProfile(null);
      setProfileResults([]);
      onToast(TEAM_NOTIFICATION_MESSAGES.inviteSent);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    } catch (error) {
      onToast(getTeamNotificationFromError(error, "inviteSendFailed"), "error");
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleProfileInputChange = (value: string) => {
    setProfileSearchQuery(value);
    setSelectedProfile(null);
    setIsSearchOpen(true);
  };

  const handleSelectProfile = (profile: SearchableProfile) => {
    setSelectedProfile(profile);
    setProfileSearchQuery(getProfileDisplayName(profile));
    setProfileResults([]);
    setIsSearchOpen(false);
  };

  const handleConfirmDeleteMember = async () => {
    if (!memberToDelete) return;
    const member = memberToDelete;
    setDeletingMemberId(member.id);
    try {
      await deleteTeamMember(member.id);
      setMemberToDelete(null);
      onToast("Đã xoá thành viên.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Không thể xoá thành viên.", "error");
    } finally {
      setDeletingMemberId(null);
    }
  };

  const handleCreateJoinLink = async () => {
    if (!currentUserId) {
      onRequireAuth();
      return;
    }
    if (!isAdmin) {
      onToast(TEAM_NOTIFICATION_MESSAGES.noPermission, "error");
      return;
    }

    setIsCreatingJoinLink(true);
    try {
      const nextJoinLink = await createTeamJoinLink(teamId);
      const nextJoinUrl = getJoinUrl(nextJoinLink);
      setJoinLink(nextJoinLink);
      setIsJoinLinkOpen(true);
      try {
        await copyJoinUrl(nextJoinUrl);
        onToast(TEAM_NOTIFICATION_MESSAGES.joinLinkCopied);
      } catch {
        onToast(TEAM_NOTIFICATION_MESSAGES.joinLinkCreated);
      }
    } catch (error) {
      onToast(error instanceof Error ? error.message : TEAM_NOTIFICATION_MESSAGES.joinLinkCreateFailed, "error");
    } finally {
      setIsCreatingJoinLink(false);
    }
  };

  const handleCopyJoinLink = async () => {
    if (!joinUrl) return;
    try {
      await copyJoinUrl(joinUrl);
      onToast(TEAM_NOTIFICATION_MESSAGES.joinLinkCopied);
    } catch {
      onToast("Không thể copy link. Vui lòng copy thủ công.", "error");
    }
  };

  const handleApproveLeaveRequest = async (requestId: string) => {
    setReviewingLeaveRequestId(requestId);
    try {
      await approveTeamLeaveRequest(requestId);
      onToast(TEAM_NOTIFICATION_MESSAGES.leaveRequestApproved);
    } catch (error) {
      onToast(getPlayerTeamNotificationFromError(error, "leaveRequestInvalid"), "error");
    } finally {
      setReviewingLeaveRequestId(null);
    }
  };

  const handleDeclineLeaveRequest = async (requestId: string) => {
    setReviewingLeaveRequestId(requestId);
    try {
      await declineTeamLeaveRequest(requestId);
      onToast(TEAM_NOTIFICATION_MESSAGES.leaveRequestDeclined);
    } catch (error) {
      onToast(getPlayerTeamNotificationFromError(error, "leaveRequestInvalid"), "error");
    } finally {
      setReviewingLeaveRequestId(null);
    }
  };

  return (
    <div className={styles.detailSingle}>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelEyebrow}>Members</p>
            <h2 className={styles.panelTitle}>Thành viên</h2>
          </div>
          <div className={styles.panelActions}>
            <span className={styles.countBadge}>{members.length} người</span>
            {isAdmin ? (
              <>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => void handleCreateJoinLink()}
                  disabled={isCreatingJoinLink}
                >
                  {isCreatingJoinLink ? <Loader2 className={styles.spinner} size={18} /> : <QrCode size={18} />}
                  Mời bằng link
                </button>
                <button type="button" className={styles.primaryButton} onClick={() => setIsAddMemberOpen(true)}>
                  <Plus size={18} />
                  Thêm cầu thủ
                </button>
              </>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <DetailSkeleton />
        ) : members.length ? (
          <div className={styles.memberList}>
            {members.map((member) => {
              const pendingLeaveRequest = pendingLeaveRequestByMemberId.get(member.id);
              const isReviewingLeaveRequest = Boolean(pendingLeaveRequest && reviewingLeaveRequestId === pendingLeaveRequest.id);

              return (
                <article key={member.id} className={pendingLeaveRequest ? `${styles.memberRow} ${styles.memberRowPendingLeave}` : styles.memberRow}>
                  <div className={styles.memberIdentity}>
                    <div className={styles.memberAvatar}>
                      <UserRound size={20} />
                    </div>
                    <div className={styles.memberText}>
                      <h3>{member.player_name}</h3>
                      <p>
                        {pendingLeaveRequest
                          ? "Đang yêu cầu rời đội"
                          : `Tham gia ngày ${formatJoinedDate(member.created_at)}`}
                      </p>
                    </div>
                  </div>
                  <div className={styles.memberActions}>
                    <RoleBadge role={member.role} />
                    {isAdmin && member.role !== "admin" && pendingLeaveRequest ? (
                      <div className={styles.leaveRequestActions} aria-label={`${member.player_name} đang yêu cầu rời đội`}>
                        <button
                          type="button"
                          className={styles.rowApproveButton}
                          onClick={() => void handleApproveLeaveRequest(pendingLeaveRequest.id)}
                          disabled={isReviewingLeaveRequest}
                          aria-label={`Chấp nhận yêu cầu rời đội của ${member.player_name}`}
                          title="Chấp nhận rời đội"
                        >
                          {isReviewingLeaveRequest ? <Loader2 className={styles.spinner} size={15} /> : <Check size={15} />}
                        </button>
                        <button
                          type="button"
                          className={styles.rowDeclineButton}
                          onClick={() => void handleDeclineLeaveRequest(pendingLeaveRequest.id)}
                          disabled={isReviewingLeaveRequest}
                          aria-label={`Từ chối yêu cầu rời đội của ${member.player_name}`}
                          title="Từ chối yêu cầu"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ) : isAdmin && member.role !== "admin" ? (
                      <button
                        type="button"
                        className={styles.rowDeleteButton}
                        onClick={() => setMemberToDelete(member)}
                        disabled={deletingMemberId === member.id}
                        aria-label={`Xoá ${member.player_name}`}
                        title="Xoá thành viên"
                      >
                        {deletingMemberId === member.id ? <Loader2 className={styles.spinner} size={16} /> : <Trash2 size={16} />}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyInline}>
            <Users size={36} />
            <h3>Chưa có thành viên</h3>
            <p>Admin có thể thêm nhanh cầu thủ bằng tên, tài khoản liên kết sau.</p>
          </div>
        )}
      </section>

      {isAddMemberOpen ? (
        <div className={styles.modalOverlay}>
          <form className={styles.modal} onSubmit={handleAddMember}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Thêm cầu thủ</h2>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setIsAddMemberOpen(false)}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <label className={styles.label}>
                <span className={styles.labelText}>Tìm người dùng</span>
                <div ref={comboboxRef} className={styles.combobox}>
                  <input
                    ref={inputRef}
                    value={profileSearchQuery}
                    onChange={(event) => handleProfileInputChange(event.target.value)}
                    onFocus={() => setIsSearchOpen(true)}
                    className={styles.input}
                    placeholder="Nhập tên hoặc email người dùng..."
                    role="combobox"
                    aria-expanded={isSearchOpen}
                    aria-autocomplete="list"
                  />
                  {isSearchOpen && profileSearchQuery.trim().length >= 2 && !selectedProfile ? (
                    <div className={styles.comboboxMenu} role="listbox">
                      {isSearchingProfiles ? (
                        <div className={styles.comboboxState}>
                          <Loader2 className={styles.spinner} size={16} />
                          Đang tìm kiếm...
                        </div>
                      ) : availableProfileResults.length ? (
                        availableProfileResults.map((profile) => (
                          <button
                            key={profile.id}
                            type="button"
                            className={styles.comboboxOption}
                            onClick={() => handleSelectProfile(profile)}
                            role="option"
                          >
                            <span className={styles.profileAvatar}>
                              {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : <UserRound size={18} />}
                            </span>
                            <span className={styles.profileOptionText}>
                              <strong>{getProfileDisplayName(profile)}</strong>
                              <small>{profile.email ?? "Email đã được bảo vệ"}</small>
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className={styles.comboboxState}>Không tìm thấy người dùng này</div>
                      )}
                    </div>
                  ) : null}
                </div>
              </label>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={isAddingMember || !selectedProfile || isSelectedUserInTeam}
              >
                {isAddingMember ? <Loader2 className={styles.spinner} size={18} /> : <Plus size={18} />}
                Thêm vào đội
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {isJoinLinkOpen && joinLink ? (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="join-link-title">
            <div className={styles.modalHeader}>
              <h2 id="join-link-title" className={styles.modalTitle}>Mời bằng link / QR</h2>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setIsJoinLinkOpen(false)}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.qrCard}>
                {joinLinkQr ? <img src={joinLinkQr} alt="QR tham gia đội bóng" /> : <Loader2 className={styles.spinner} size={28} />}
              </div>
              <div className={styles.inviteLinkBox}>
                <Link size={18} />
                <span>{joinUrl}</span>
              </div>
              <p className={styles.helperText}>
                Link có hiệu lực đến {formatDateTime(joinLink.expires_at)}. Người nhận cần đăng nhập trước khi tham gia đội.
              </p>
              <button type="button" className={styles.primaryButton} onClick={() => void handleCopyJoinLink()}>
                <Copy size={18} />
                Copy link
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {memberToDelete ? (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="delete-member-title">
            <div className={styles.modalHeader}>
              <h2 id="delete-member-title" className={styles.modalTitle}>Xác nhận xoá</h2>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setMemberToDelete(null)}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.confirmText}>
                Bạn có chắc muốn xoá <strong>{memberToDelete.player_name}</strong> khỏi đội không?
                Thành viên này sẽ mất quyền truy cập đội bóng.
              </p>
              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setMemberToDelete(null)}>
                  Huỷ
                </button>
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => void handleConfirmDeleteMember()}
                  disabled={deletingMemberId === memberToDelete.id}
                >
                  {deletingMemberId === memberToDelete.id ? <Loader2 className={styles.spinner} size={18} /> : <Trash2 size={18} />}
                  Xoá
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TeamDetail({ user, onRequireAuth, onToast }: TeamDetailProps) {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const {
    currentTeam,
    isLoadingTeamDetails,
    fetchTeamDetails,
    checkTeamMembership,
    clearCurrentTeam,
    requestTeamLeave,
  } = useTeamStore();
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [isRequestingLeave, setIsRequestingLeave] = useState(false);
  const [teamLoadError, setTeamLoadError] = useState("");
  const team = currentTeam as TeamDetails | null;
  const currentUserMember = useMemo(
    () => team?.members.find((member) => member.user_id === user?.id) ?? null,
    [team, user?.id],
  );
  const isAdmin = currentUserMember?.role === "admin";

  useEffect(() => {
    if (!user) return;
    if (!teamId) {
      clearCurrentTeam();
      navigate("/app/teams", { replace: true });
      return;
    }
    let isMounted = true;
    setTeamLoadError("");
    clearCurrentTeam();
    void fetchTeamDetails(teamId).catch((error) => {
      if (!isMounted) return;
      const message = getPlayerTeamNotificationFromError(error, "playerTeamAccessDenied");
      setTeamLoadError(message);
      onToast(message, "error");
    });

    return () => {
      isMounted = false;
    };
  }, [clearCurrentTeam, fetchTeamDetails, navigate, onToast, teamId, user]);

  useEffect(() => {
    if (!teamId) return;
    window.sessionStorage.setItem("lastTeamDetailId", teamId);
  }, [teamId]);

  useEffect(() => {
    if (!user?.id || !teamId || !currentUserMember?.id) return;
    let isMounted = true;
    let isChecking = false;

    const handleRemovedFromTeam = () => {
      if (!isMounted) return;
      onToast(TEAM_NOTIFICATION_MESSAGES.playerRemovedFromTeam, "error");
      clearCurrentTeam();
      console.warn("⚠️ Redirect blocked: handleRemovedFromTeam fired!");
      // navigate("/app/teams", { replace: true });
    };

    const verifyCurrentMembership = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const isStillMember = await checkTeamMembership(teamId, user.id);
        if (!isStillMember) handleRemovedFromTeam();
      } catch {
        // A transient RLS/schema/network error must not be treated as a removal.
        // Actual removal is represented by a successful membership check returning false.
      } finally {
        isChecking = false;
      }
    };

    const intervalId = window.setInterval(() => {
      void verifyCurrentMembership();
    }, 4000);
    const handleFocus = () => {
      void verifyCurrentMembership();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void verifyCurrentMembership();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkTeamMembership, clearCurrentTeam, currentUserMember?.id, navigate, onToast, teamId, user?.id]);

  const handleRequestLeaveTeam = async () => {
    if (!teamId) return;
    setIsRequestingLeave(true);
    try {
      await requestTeamLeave(teamId);
      setIsLeaveConfirmOpen(false);
      onToast(TEAM_NOTIFICATION_MESSAGES.playerLeaveRequestSent);
    } catch (error) {
      onToast(getPlayerTeamNotificationFromError(error, "playerLeaveRequestFailed"), "error");
    } finally {
      setIsRequestingLeave(false);
    }
  };

  if (!user) {
    return (
      <section className={styles.page}>
        <button type="button" className={styles.backButton} onClick={() => navigate("/app/teams")}>
          <ArrowLeft size={18} />
          Đội bóng
        </button>
        <div className={styles.authCard}>
          <Shield className={styles.authIcon} size={42} />
          <h1 className={styles.authTitle}>Đăng nhập để xem đội bóng</h1>
          <p className={styles.authText}>Bạn cần đăng nhập để xem thành viên và quyền quản trị đội.</p>
          <button type="button" className={styles.primaryButton} onClick={onRequireAuth}>
            Đăng nhập
          </button>
        </div>
      </section>
    );
  }

  if (!teamId) {
    return (
      <section className={styles.page}>
        <button type="button" className={styles.backButton} onClick={() => navigate("/app/teams")}>
          <ArrowLeft size={18} />
          Đội bóng
        </button>
        <div className={styles.emptyInline}>
          <Shield size={36} />
          <h2>Không tìm thấy đội bóng</h2>
          <p>Đường dẫn đội bóng không hợp lệ. Vui lòng quay lại danh sách đội bóng.</p>
        </div>
      </section>
    );
  }

  if (teamLoadError && !isLoadingTeamDetails && !team) {
    return (
      <section className={styles.page}>
        <button type="button" className={styles.backButton} onClick={() => navigate("/app/teams")}>
          <ArrowLeft size={18} />
          Đội bóng
        </button>
        <div className={styles.authCard}>
          <Shield className={styles.authIcon} size={42} />
          <h1 className={styles.authTitle}>Không thể mở chi tiết đội bóng</h1>
          <p className={styles.authText}>{teamLoadError}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <button type="button" className={styles.backButton} onClick={() => navigate("/app/teams")}>
        <ArrowLeft size={18} />
        Đội bóng
      </button>

      <header className={styles.detailHero}>
        {isLoadingTeamDetails && !team ? (
          <div className={styles.heroSkeleton} />
        ) : team ? (
          <>
            <div className={styles.teamIdentity}>
              <div className={styles.teamLogo}>
                {team.logo_url ? <img src={team.logo_url} alt="" /> : <Users size={32} />}
              </div>
              <div>
                <p className={styles.eyebrow}>Chi tiết đội bóng</p>
                <h1 className={styles.title}>{team.name}</h1>
                <p className={styles.description}>{team.members.length} thành viên</p>
              </div>
            </div>
            <div className={styles.detailHeroActions}>
              <span className={styles.rolePill}>
                <Shield size={15} />
                {isAdmin ? "Admin" : "Thành viên"}
              </span>
              {!isAdmin && currentUserMember?.role === "player" ? (
                <button type="button" className={styles.dangerButton} onClick={() => setIsLeaveConfirmOpen(true)}>
                  <LogOut size={16} />
                  Rời đội bóng
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <div className={styles.emptyInline}>
            <Shield size={36} />
            <h2>Không tìm thấy đội bóng</h2>
            <p>Đội bóng không tồn tại hoặc bạn chưa có quyền xem.</p>
          </div>
        )}
      </header>

      <div className={styles.detailContent}>
        <MembersView
          teamId={teamId}
          members={team?.members ?? []}
          isAdmin={isAdmin}
          isLoading={isLoadingTeamDetails}
          currentUserId={user.id}
          onRequireAuth={onRequireAuth}
          onToast={onToast}
        />
      </div>

      {isLeaveConfirmOpen ? (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="leave-team-title">
            <div className={styles.modalHeader}>
              <h2 id="leave-team-title" className={styles.modalTitle}>Xác nhận rời đội</h2>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setIsLeaveConfirmOpen(false)}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.confirmText}>
                Bạn muốn gửi yêu cầu rời <strong>{team?.name ?? "đội bóng"}</strong>?
                Admin sẽ cần xác nhận trước khi bạn rời đội.
              </p>
              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setIsLeaveConfirmOpen(false)}>
                  Huỷ
                </button>
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => void handleRequestLeaveTeam()}
                  disabled={isRequestingLeave}
                >
                  {isRequestingLeave ? <Loader2 className={styles.spinner} size={18} /> : <LogOut size={18} />}
                  Gửi yêu cầu
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
