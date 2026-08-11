import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { User } from "@supabase/supabase-js";
import QRCode from "qrcode";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Link,
  Loader2,
  LogOut,
  MoreVertical,
  Pencil,
  Plus,
  QrCode,
  Shield,
  Trash2,
  TriangleAlert,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "./Button";
import { getAppPath } from "./appRouting";
import { useTeamMatchesRealtime } from "./hooks/useTeamMatchesRealtime";
import { createTeamMatch, createTeamMatchesBatch, deleteTeamMatch, deleteTeamMatches, getMyAttendanceByMatchIds, getTeamMatches, updateTeamMatch, upsertMatchAttendance } from "./repositories/teamRepository";
import { useTeamStore } from "./stores/teamStore";
import { useDebounce } from "./hooks/useDebounce";
import { getMatchNotificationFromError, getPlayerTeamNotificationFromError, getTeamNotificationFromError, TEAM_NOTIFICATION_MESSAGES } from "./teamNotifications";
import {
  dayHasScheduleConflict,
  findScheduleConflicts,
  formatScheduleConflictMessage,
  formatScheduleSuggestionMessage,
  getDuplicateStartTimes,
  isPastMatchTime,
  sortTeamMatches,
  suggestAvailableMatchTime,
  TEAM_MATCH_TITLE_MAX_LENGTH,
  combineLocalDateAndTime,
  getLocalDateKeyFromIso,
} from "./teamMatchSchedule";
import {
  addDaysToDateKey,
  buildRecurringDateKeys,
  buildRecurringOccurrences,
  compareDateKeys,
  formatRecurringConflictMessage,
  formatRecurringPreview,
  findRecurringScheduleConflicts,
  RECURRENCE_INTERVAL_LABELS,
  RECURRENCE_MAX_COUNT,
  RECURRENCE_MIN_COUNT,
  validateRecurrenceInput,
  type RecurrenceEndMode,
  type RecurrenceInterval,
} from "./teamMatchRecurrence";
import type { SearchableProfile, TeamDetails, TeamJoinLink, TeamMatch, TeamMatchAttendanceStatus, TeamMatchType, TeamMember, TeamMemberRole } from "./types/team";
import { QuickAttendanceButtons } from "./QuickAttendanceButtons";
import { MatchCardScheduleInfo } from "./MatchCardScheduleInfo";
import { validateGoogleMapUrlInput } from "./teamMatchLocation";
import styles from "./TeamPages.module.css";

type TeamDetailProps = {
  user: User | null;
  onRequireAuth: () => void;
  onToast: (message: string, tone?: "success" | "error") => void;
};

const EMPTY_TEAM_MEMBERS: TeamMember[] = [];
const EMPTY_TEAM_MATCHES: TeamMatch[] = [];
const EMPTY_ATTENDANCE_BY_MATCH: Record<string, TeamMatchAttendanceStatus> = {};

const areAttendanceRecordsEqual = (
  left: Record<string, TeamMatchAttendanceStatus>,
  right: Record<string, TeamMatchAttendanceStatus>,
) => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => left[key] === right[key]);
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

const formatMatchDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const toDateInputValue = (date: Date) => {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const toTimeInputValue = (iso: string) => {
  const date = new Date(iso);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const getDateKeyFromIso = getLocalDateKeyFromIso;

const getDefaultMatchDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toDateInputValue(date);
};

const PREFERRED_MATCH_TIME = "18:00";

const ROLE_LABELS: Record<TeamMemberRole, string> = {
  admin: "Quản trị viên",
  player: "Cầu thủ",
};

const MATCH_TYPE_LABELS: Record<TeamMatchType, string> = {
  match: "Trận đấu",
  training: "Tập luyện",
};

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const toDateKey = (date: Date) => {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const toDateKeyFromIso = (iso: string) => getLocalDateKeyFromIso(iso);

const parseDateKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const buildMonthGrid = (viewDate: Date) => {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: Date; inMonth: boolean }> = [];

  for (let index = 0; index < firstDayOffset; index += 1) {
    cells.push({
      date: new Date(year, month, index - firstDayOffset + 1),
      inMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(year, month, day), inMonth: true });
  }

  while (cells.length % 7 !== 0) {
    const lastDate = cells[cells.length - 1]?.date ?? new Date(year, month, daysInMonth);
    cells.push({
      date: new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + 1),
      inMonth: false,
    });
  }

  return cells;
};

const formatMonthLabel = (date: Date) =>
  new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric",
  }).format(date);

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
      {ROLE_LABELS[role]}
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
      setJoinLinkQr((current) => (current ? "" : current));
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
    // fetchPendingTeamLeaveRequests and onToast are stable store/callback references.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when admin context or team changes
  }, [isAdmin, teamId]);

  useEffect(() => {
    const normalizedQuery = debouncedProfileQuery.trim();
    if (!isAddMemberOpen || selectedProfile || normalizedQuery.length < 2) {
      setProfileResults((current) => (current.length === 0 ? current : []));
      setIsSearchingProfiles((current) => (current ? false : current));
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
    // searchProfiles and onToast are stable store/callback references.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- query-driven search only
  }, [debouncedProfileQuery, isAddMemberOpen, selectedProfile]);

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
    <>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelEyebrow}>Thành viên</p>
            <h2 className={styles.panelTitle}>Thành viên</h2>
          </div>
          <div className={styles.panelActions}>
            <span className={styles.countBadge}>{members.length} người</span>
            {isAdmin ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="panel"
                  loading={isCreatingJoinLink}
                  leadingIcon={<QrCode size={15} aria-hidden="true" />}
                  onClick={() => void handleCreateJoinLink()}
                >
                  Mời bằng link
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="panel"
                  leadingIcon={<Plus size={15} aria-hidden="true" />}
                  onClick={() => setIsAddMemberOpen(true)}
                >
                  Thêm cầu thủ
                </Button>
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
            <p>Quản trị viên có thể thêm nhanh cầu thủ bằng tên, tài khoản liên kết sau.</p>
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
              <Button
                type="submit"
                variant="primary"
                fullWidth
                className={styles.modalSubmitButton}
                loading={isAddingMember}
                disabled={!selectedProfile || isSelectedUserInTeam}
                leadingIcon={<Plus size={18} aria-hidden="true" />}
              >
                Thêm vào đội
              </Button>
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
              <Button
                type="button"
                variant="primary"
                fullWidth
                className={styles.modalSubmitButton}
                leadingIcon={<Copy size={18} aria-hidden="true" />}
                onClick={() => void handleCopyJoinLink()}
              >
                Copy link
              </Button>
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
                <Button type="button" variant="secondary" fullWidthMobile onClick={() => setMemberToDelete(null)}>
                  Huỷ
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  fullWidthMobile
                  loading={deletingMemberId === memberToDelete.id}
                  leadingIcon={<Trash2 size={18} aria-hidden="true" />}
                  onClick={() => void handleConfirmDeleteMember()}
                >
                  Xoá
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

type ScheduleViewProps = {
  teamId: string;
  userId: string;
  currentMemberId: string | null;
  isAdmin: boolean;
  onToast: TeamDetailProps["onToast"];
};

function ScheduleView({ teamId, userId, currentMemberId, isAdmin, onToast }: ScheduleViewProps) {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<TeamMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [matchType, setMatchType] = useState<TeamMatchType>("match");
  const [matchDate, setMatchDate] = useState(getDefaultMatchDate);
  const [matchTime, setMatchTime] = useState(PREFERRED_MATCH_TIME);
  const [location, setLocation] = useState("");
  const [locationMapUrl, setLocationMapUrl] = useState("");
  const [locationMapUrlTouched, setLocationMapUrlTouched] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);
  const [scheduleTouched, setScheduleTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const timeManuallyEdited = useRef(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [myAttendanceByMatchId, setMyAttendanceByMatchId] = useState<Record<string, TeamMatchAttendanceStatus>>({});
  const [updatingAttendanceMatchId, setUpdatingAttendanceMatchId] = useState<string | null>(null);
  const [openMenuMatchId, setOpenMenuMatchId] = useState<string | null>(null);
  const [isMatchListOpen, setIsMatchListOpen] = useState(false);
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [isDeleteSelectedMatchesConfirmOpen, setIsDeleteSelectedMatchesConfirmOpen] = useState(false);
  const [isDeletingSelectedMatches, setIsDeletingSelectedMatches] = useState(false);
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval>("weekly");
  const [recurrenceEndMode, setRecurrenceEndMode] = useState<RecurrenceEndMode>("count");
  const [recurrenceCount, setRecurrenceCount] = useState(4);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(() => addDaysToDateKey(getDefaultMatchDate(), 21));
  const [scheduleFormStep, setScheduleFormStep] = useState<1 | 2>(1);
  const [showMapLinkField, setShowMapLinkField] = useState(false);
  const scheduleFormStepRef = useRef<1 | 2>(1);
  const hasInitializedCalendar = useRef(false);
  const todayKey = toDateKey(new Date());
  const isEditingSchedule = editingMatchId !== null;

  const loadMatches = async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
    }
    try {
      const nextMatches = await getTeamMatches(teamId);
      const sorted = sortTeamMatches(nextMatches);
      setMatches(sorted);
      setSelectedMatchIds((current) => current.filter((id) => sorted.some((match) => match.id === id)));
    } catch (error) {
      if (!options?.silent) {
        onToast(getMatchNotificationFromError(error, "matchAddFailed"), "error");
      }
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadMatches();
    hasInitializedCalendar.current = false;
  }, [teamId]);

  useTeamMatchesRealtime({
    teamId,
    setMatches: (updater) => {
      setMatches((current) => {
        const nextMatches = typeof updater === "function" ? updater(current) : updater;
        setSelectedMatchIds((selected) => selected.filter((id) => nextMatches.some((match) => match.id === id)));
        return nextMatches;
      });
    },
    onResync: () => {
      void loadMatches({ silent: true });
    },
  });

  const matchesByDate = useMemo(() => {
    const grouped = new Map<string, TeamMatch[]>();
    for (const match of matches) {
      const key = toDateKeyFromIso(match.starts_at);
      const bucket = grouped.get(key) ?? [];
      bucket.push(match);
      grouped.set(key, bucket);
    }
    for (const bucket of grouped.values()) {
      bucket.sort((left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime());
    }
    return grouped;
  }, [matches]);

  const upcomingMatches = useMemo(() => {
    const now = Date.now();
    return sortTeamMatches(matches.filter((match) => new Date(match.starts_at).getTime() >= now));
  }, [matches]);

  const sortedMatchesForList = useMemo(
    () => sortTeamMatches([...matches]),
    [matches],
  );

  const nearestUpcomingMatch = upcomingMatches[0] ?? null;

  const nearestUpcomingMatchCount = useMemo(() => {
    if (!nearestUpcomingMatch) return 0;
    const nearestTime = new Date(nearestUpcomingMatch.starts_at).getTime();
    return upcomingMatches.filter((match) => new Date(match.starts_at).getTime() === nearestTime).length;
  }, [nearestUpcomingMatch, upcomingMatches]);

  const parsedStartsAt = useMemo(
    () => combineLocalDateAndTime(matchDate, matchTime),
    [matchDate, matchTime],
  );

  const titleValidationError = useMemo(() => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return "Vui lòng nhập tiêu đề sự kiện.";
    if (trimmedTitle.length > TEAM_MATCH_TITLE_MAX_LENGTH) {
      return `Tiêu đề không được dài hơn ${TEAM_MATCH_TITLE_MAX_LENGTH} ký tự.`;
    }
    return null;
  }, [title]);

  const scheduleValidationError = useMemo(() => {
    if (!matchDate || !matchTime) return "Vui lòng chọn ngày và giờ.";
    if (!parsedStartsAt) return "Thời gian không hợp lệ.";
    return null;
  }, [matchDate, matchTime, parsedStartsAt]);

  const showTitleError = Boolean((titleTouched || submitAttempted) && titleValidationError);
  const showScheduleError = Boolean((scheduleTouched || submitAttempted) && scheduleValidationError);

  const createFormValidationError = titleValidationError || scheduleValidationError;

  const locationMapUrlValidationError = useMemo(
    () => validateGoogleMapUrlInput(locationMapUrl),
    [locationMapUrl],
  );

  const showLocationMapUrlError = Boolean(
    (locationMapUrlTouched || submitAttempted) && locationMapUrlValidationError,
  );

  const createFormConflicts = useMemo(() => {
    if (scheduleValidationError || !parsedStartsAt || recurrenceEnabled) return [];

    return findScheduleConflicts(matches, {
      startsAt: parsedStartsAt.toISOString(),
      matchType,
      excludeMatchId: editingMatchId ?? undefined,
    });
  }, [scheduleValidationError, matchType, matches, parsedStartsAt, editingMatchId, recurrenceEnabled]);

  const recurrenceValidationError = useMemo(() => {
    if (!recurrenceEnabled || isEditingSchedule) return null;
    return validateRecurrenceInput(matchDate, {
      enabled: recurrenceEnabled,
      interval: recurrenceInterval,
      endMode: recurrenceEndMode,
      count: recurrenceCount,
      endDate: recurrenceEndDate,
    });
  }, [
    recurrenceEnabled,
    isEditingSchedule,
    matchDate,
    recurrenceInterval,
    recurrenceEndMode,
    recurrenceCount,
    recurrenceEndDate,
  ]);

  const plannedOccurrences = useMemo(() => {
    if (!parsedStartsAt || isEditingSchedule) return [parsedStartsAt].filter(Boolean) as Date[];
    return buildRecurringOccurrences(matchDate, matchTime, {
      enabled: recurrenceEnabled,
      interval: recurrenceInterval,
      endMode: recurrenceEndMode,
      count: recurrenceCount,
      endDate: recurrenceEndDate,
    });
  }, [
    parsedStartsAt,
    isEditingSchedule,
    matchDate,
    matchTime,
    recurrenceEnabled,
    recurrenceInterval,
    recurrenceEndMode,
    recurrenceCount,
    recurrenceEndDate,
  ]);

  const recurringDateKeys = useMemo(() => {
    if (!recurrenceEnabled || isEditingSchedule) return [];
    return buildRecurringDateKeys({
      startDateKey: matchDate,
      interval: recurrenceInterval,
      endMode: recurrenceEndMode,
      count: recurrenceCount,
      endDateKey: recurrenceEndDate,
    });
  }, [
    recurrenceEnabled,
    isEditingSchedule,
    matchDate,
    recurrenceInterval,
    recurrenceEndMode,
    recurrenceCount,
    recurrenceEndDate,
  ]);

  const recurringConflicts = useMemo(() => {
    if (!recurrenceEnabled || isEditingSchedule || recurrenceValidationError || plannedOccurrences.length === 0) {
      return [];
    }

    return findRecurringScheduleConflicts(matches, plannedOccurrences, matchType);
  }, [
    recurrenceEnabled,
    isEditingSchedule,
    recurrenceValidationError,
    plannedOccurrences,
    matches,
    matchType,
  ]);

  const recurringPreviewLabel = useMemo(() => {
    if (!recurrenceEnabled || isEditingSchedule || recurringDateKeys.length === 0) return "";
    return formatRecurringPreview(recurringDateKeys);
  }, [recurrenceEnabled, isEditingSchedule, recurringDateKeys]);

  const showRecurrenceError = Boolean((scheduleTouched || submitAttempted) && recurrenceValidationError);
  const hasScheduleBlockingConflict = recurrenceEnabled && !isEditingSchedule
    ? recurringConflicts.length > 0
    : createFormConflicts.length > 0;

  const scheduleFormTotalSteps = isEditingSchedule ? 1 : recurrenceEnabled ? 2 : 1;
  const scheduleFormFinalStep = scheduleFormTotalSteps as 1 | 2;
  const scheduleFormStepLabels = recurrenceEnabled
    ? (["Thông tin", "Lặp lại"] as const)
    : ([] as const);
  const isScheduleRecurrenceStep = !isEditingSchedule && recurrenceEnabled && scheduleFormStep === 2;
  const canProceedScheduleStep1 =
    !titleValidationError
    && !scheduleValidationError
    && !locationMapUrlValidationError
    && (!recurrenceEnabled ? !hasScheduleBlockingConflict : true);

  scheduleFormStepRef.current = scheduleFormStep;

  const goToNextScheduleStep = () => {
    const currentStep = scheduleFormStepRef.current;
    setSubmitAttempted(true);

    if (currentStep === 1) {
      setTitleTouched(true);
      setScheduleTouched(true);
      if (!canProceedScheduleStep1) return;
      setScheduleFormStep(2);
    }
  };

  const goBackScheduleStep = () => {
    setScheduleFormStep(1);
  };

  const toggleRecurrenceEnabled = (enabled: boolean) => {
    setRecurrenceEnabled(enabled);
    setScheduleFormStep(1);
  };

  const renderScheduleAlerts = () => (
    <>
      {showScheduleError ? (
        <span className={styles.scheduleFormError} role="alert">
          <TriangleAlert size={14} aria-hidden="true" />
          {scheduleValidationError}
        </span>
      ) : !recurrenceEnabled && createFormConflicts[0] ? (
        <>
          <span className={styles.scheduleFormError} role="alert">
            <TriangleAlert size={14} aria-hidden="true" />
            {formatScheduleConflictMessage(createFormConflicts[0])}
          </span>
          {showScheduleSuggestion ? (
            <button
              type="button"
              className={styles.scheduleFormSuggestion}
              onClick={applySuggestedMatchTime}
            >
              {formatScheduleSuggestionMessage(suggestedMatchTime)}
            </button>
          ) : null}
        </>
      ) : isPastSelectedTime ? (
        <span className={styles.scheduleFormWarning} role="status">
          <TriangleAlert size={14} aria-hidden="true" />
          {TEAM_NOTIFICATION_MESSAGES.matchPastTimeWarning}
        </span>
      ) : null}
    </>
  );

  const suggestedMatchTime = useMemo(() => {
    const matchesForSuggestion = editingMatchId
      ? matches.filter((match) => match.id !== editingMatchId)
      : matches;
    return suggestAvailableMatchTime(matchesForSuggestion, matchDate, matchType, PREFERRED_MATCH_TIME);
  }, [editingMatchId, matches, matchDate, matchType]);

  const showScheduleSuggestion = Boolean(
    !scheduleValidationError
    && createFormConflicts.length > 0
    && suggestedMatchTime !== matchTime,
  );

  const isPastSelectedTime = useMemo(() => {
    if (scheduleValidationError || !parsedStartsAt) return false;
    return isPastMatchTime(parsedStartsAt);
  }, [scheduleValidationError, parsedStartsAt]);

  const scheduleConflictMatchId = createFormConflicts[0]?.match.id ?? null;
  const scheduleConflictStartsAt = createFormConflicts[0]?.match.starts_at ?? null;

  useEffect(() => {
    if (!scheduleConflictMatchId || !scheduleConflictStartsAt || !isScheduleModalOpen) return;

    const nextDateKey = getLocalDateKeyFromIso(scheduleConflictStartsAt);
    const conflictDate = new Date(scheduleConflictStartsAt);
    const nextMonth = new Date(conflictDate.getFullYear(), conflictDate.getMonth(), 1);

    setSelectedDateKey((current) => (current === nextDateKey ? current : nextDateKey));
    setCalendarMonth((current) =>
      current.getFullYear() === nextMonth.getFullYear() && current.getMonth() === nextMonth.getMonth()
        ? current
        : nextMonth,
    );
  }, [scheduleConflictMatchId, scheduleConflictStartsAt, isScheduleModalOpen]);

  const calendarCells = useMemo(() => buildMonthGrid(calendarMonth), [calendarMonth]);

  const selectedDayMatches = useMemo(() => {
    if (!selectedDateKey) return EMPTY_TEAM_MATCHES;
    return matchesByDate.get(selectedDateKey) ?? EMPTY_TEAM_MATCHES;
  }, [selectedDateKey, matchesByDate]);

  const selectedDayDuplicateTimes = useMemo(
    () => (selectedDateKey ? getDuplicateStartTimes(selectedDayMatches) : new Set<number>()),
    [selectedDateKey, selectedDayMatches],
  );

  const isUpcomingMatch = (match: TeamMatch) => new Date(match.starts_at).getTime() >= Date.now();

  const matchIdsForAttendanceKey = useMemo(() => {
    const ids = new Set<string>();
    if (nearestUpcomingMatch && isUpcomingMatch(nearestUpcomingMatch)) {
      ids.add(nearestUpcomingMatch.id);
    }
    for (const match of selectedDayMatches) {
      if (isUpcomingMatch(match)) {
        ids.add(match.id);
      }
    }
    return [...ids].sort().join("|");
  }, [nearestUpcomingMatch, selectedDayMatches]);

  useEffect(() => {
    if (!currentMemberId || !matchIdsForAttendanceKey) {
      setMyAttendanceByMatchId((current) =>
        Object.keys(current).length === 0 ? current : EMPTY_ATTENDANCE_BY_MATCH,
      );
      return;
    }

    const matchIds = matchIdsForAttendanceKey.split("|");
    let isMounted = true;
    void getMyAttendanceByMatchIds(matchIds, currentMemberId)
      .then((nextAttendance) => {
        if (!isMounted) return;
        setMyAttendanceByMatchId((current) =>
          areAttendanceRecordsEqual(current, nextAttendance) ? current : nextAttendance,
        );
      })
      .catch(() => {
        if (!isMounted) return;
        setMyAttendanceByMatchId((current) =>
          Object.keys(current).length === 0 ? current : EMPTY_ATTENDANCE_BY_MATCH,
        );
      });

    return () => {
      isMounted = false;
    };
  }, [currentMemberId, matchIdsForAttendanceKey]);

  useEffect(() => {
    if (!openMenuMatchId) return;

    const handlePointerDown = (event: MouseEvent) => {
      if ((event.target as Element).closest("[data-match-menu-root]")) return;
      setOpenMenuMatchId(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openMenuMatchId]);

  useEffect(() => {
    if (hasInitializedCalendar.current || !nearestUpcomingMatch) return;
    hasInitializedCalendar.current = true;
    const matchDate = new Date(nearestUpcomingMatch.starts_at);
    setCalendarMonth(new Date(matchDate.getFullYear(), matchDate.getMonth(), 1));
    setSelectedDateKey(toDateKeyFromIso(nearestUpcomingMatch.starts_at));
  }, [nearestUpcomingMatch]);

  const resetForm = () => {
    const defaultDate = getDefaultMatchDate();
    setTitle("");
    setMatchType("match");
    setMatchDate(defaultDate);
    setMatchTime(suggestAvailableMatchTime(matches, defaultDate, "match", PREFERRED_MATCH_TIME));
    setLocation("");
    setLocationMapUrl("");
    setLocationMapUrlTouched(false);
    setTitleTouched(false);
    setScheduleTouched(false);
    setSubmitAttempted(false);
    setEditingMatchId(null);
    timeManuallyEdited.current = false;
    setRecurrenceEnabled(false);
    setRecurrenceInterval("weekly");
    setRecurrenceEndMode("count");
    setRecurrenceCount(4);
    setRecurrenceEndDate(addDaysToDateKey(defaultDate, 21));
    setScheduleFormStep(1);
    setShowMapLinkField(false);
  };

  const closeScheduleModal = () => {
    setIsScheduleModalOpen(false);
    resetForm();
  };

  const openCreateForm = () => {
    resetForm();
    void loadMatches();
    setIsScheduleModalOpen(true);
  };

  const openEditForm = (match: TeamMatch) => {
    setTitle(match.title);
    setMatchType(match.match_type);
    setMatchDate(toDateInputValue(new Date(match.starts_at)));
    setMatchTime(toTimeInputValue(match.starts_at));
    setLocation(match.location ?? "");
    setLocationMapUrl(match.location_map_url ?? "");
    setLocationMapUrlTouched(false);
    setTitleTouched(false);
    setScheduleTouched(false);
    setSubmitAttempted(false);
    setEditingMatchId(match.id);
    timeManuallyEdited.current = true;
    setScheduleFormStep(1);
    setShowMapLinkField(Boolean(match.location_map_url));
    setOpenMenuMatchId(null);
    void loadMatches();
    setIsScheduleModalOpen(true);
  };

  const applySuggestedMatchTime = () => {
    setMatchTime(suggestedMatchTime);
    timeManuallyEdited.current = false;
  };

  const handleMatchDateChange = (nextDate: string) => {
    setMatchDate(nextDate);
    setScheduleTouched(true);
    timeManuallyEdited.current = false;
    setMatchTime(suggestAvailableMatchTime(matches, nextDate, matchType, PREFERRED_MATCH_TIME));
    if (compareDateKeys(recurrenceEndDate, nextDate) < 0) {
      setRecurrenceEndDate(addDaysToDateKey(nextDate, 21));
    }
  };

  const handleMatchTypeChange = (nextType: TeamMatchType) => {
    setMatchType(nextType);
    timeManuallyEdited.current = false;
    setMatchTime(suggestAvailableMatchTime(matches, matchDate, nextType, PREFERRED_MATCH_TIME));
  };

  const handleMatchTimeChange = (nextTime: string) => {
    setMatchTime(nextTime);
    setScheduleTouched(true);
    timeManuallyEdited.current = true;
  };

  const handleScheduleConfirm = async () => {
    setSubmitAttempted(true);

    const currentStep = scheduleFormStepRef.current;
    if (!isEditingSchedule && currentStep < scheduleFormFinalStep) {
      goToNextScheduleStep();
      return;
    }

    if (titleValidationError) {
      onToast(titleValidationError, "error");
      return;
    }
    if (scheduleValidationError) {
      onToast(scheduleValidationError, "error");
      return;
    }
    if (locationMapUrlValidationError) {
      onToast(locationMapUrlValidationError, "error");
      return;
    }

    const parsedStartsAt = combineLocalDateAndTime(matchDate, matchTime);
    if (!parsedStartsAt) {
      onToast("Thời gian không hợp lệ.", "error");
      return;
    }

    if (editingMatchId) {
      const conflicts = findScheduleConflicts(matches, {
        startsAt: parsedStartsAt.toISOString(),
        matchType,
        excludeMatchId: editingMatchId,
      });
      if (conflicts.length > 0) {
        onToast(formatScheduleConflictMessage(conflicts[0]), "error");
        return;
      }
    } else if (recurrenceEnabled) {
      if (recurrenceValidationError) {
        onToast(recurrenceValidationError, "error");
        return;
      }
      if (recurringConflicts.length > 0) {
        const firstConflict = recurringConflicts[0];
        onToast(formatRecurringConflictMessage(firstConflict.conflict, firstConflict.occurrence), "error");
        return;
      }
    } else {
      const conflicts = findScheduleConflicts(matches, {
        startsAt: parsedStartsAt.toISOString(),
        matchType,
      });
      if (conflicts.length > 0) {
        onToast(formatScheduleConflictMessage(conflicts[0]), "error");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editingMatchId) {
        const updatedMatch = await updateTeamMatch(editingMatchId, {
          title,
          matchType,
          startsAt: parsedStartsAt.toISOString(),
          location,
          locationMapUrl,
        });
        setMatches((current) =>
          sortTeamMatches(current.map((match) => (match.id === updatedMatch.id ? updatedMatch : match))),
        );
        const updatedDateKey = toDateKeyFromIso(updatedMatch.starts_at);
        const updatedDate = new Date(updatedMatch.starts_at);
        setCalendarMonth(new Date(updatedDate.getFullYear(), updatedDate.getMonth(), 1));
        setSelectedDateKey(updatedDateKey);
        closeScheduleModal();
        onToast(TEAM_NOTIFICATION_MESSAGES.matchUpdated);
        return;
      }

      if (recurrenceEnabled) {
        const createdMatches = await createTeamMatchesBatch(teamId, userId, {
          title,
          matchType,
          startsAtList: plannedOccurrences.map((occurrence) => occurrence.toISOString()),
          location,
          locationMapUrl,
        });
        setMatches((current) => sortTeamMatches([...current, ...createdMatches]));
        const firstCreated = createdMatches[0];
        const createdDateKey = toDateKeyFromIso(firstCreated.starts_at);
        const createdDate = new Date(firstCreated.starts_at);
        setCalendarMonth(new Date(createdDate.getFullYear(), createdDate.getMonth(), 1));
        setSelectedDateKey(createdDateKey);
        closeScheduleModal();
        onToast(TEAM_NOTIFICATION_MESSAGES.matchRecurringAdded.replace("{count}", String(createdMatches.length)));
        return;
      }

      const createdMatch = await createTeamMatch(teamId, userId, {
        title,
        matchType,
        startsAt: parsedStartsAt.toISOString(),
        location,
        locationMapUrl,
      });
      setMatches((current) => sortTeamMatches([...current, createdMatch]));
      const createdDateKey = toDateKeyFromIso(createdMatch.starts_at);
      const createdDate = new Date(createdMatch.starts_at);
      setCalendarMonth(new Date(createdDate.getFullYear(), createdDate.getMonth(), 1));
      setSelectedDateKey(createdDateKey);
      closeScheduleModal();
      onToast(TEAM_NOTIFICATION_MESSAGES.matchAdded);
    } catch (error) {
      onToast(
        getMatchNotificationFromError(
          error,
          editingMatchId ? "matchUpdateFailed" : "matchAddFailed",
        ),
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.tagName === "TEXTAREA") return;

    const currentStep = scheduleFormStepRef.current;
    const finalStep = isEditingSchedule ? 1 : recurrenceEnabled ? 2 : 1;

    if (!isEditingSchedule && currentStep < finalStep) {
      event.preventDefault();
      goToNextScheduleStep();
      return;
    }

    event.preventDefault();
    void handleScheduleConfirm();
  };

  const handleDeleteMatch = async (matchId: string) => {
    setDeletingMatchId(matchId);
    try {
      await deleteTeamMatch(matchId);
      setMatches((current) => {
        const nextMatches = current.filter((match) => match.id !== matchId);
        if (nextMatches.length === 0) {
          closeMatchListModal();
        }
        return nextMatches;
      });
      setSelectedMatchIds((current) => current.filter((id) => id !== matchId));
      onToast(TEAM_NOTIFICATION_MESSAGES.matchDeleted);
    } catch (error) {
      onToast(getMatchNotificationFromError(error, "matchDeleteFailed"), "error");
    } finally {
      setDeletingMatchId(null);
    }
  };

  const closeMatchListModal = () => {
    setIsMatchListOpen(false);
    setIsDeleteSelectedMatchesConfirmOpen(false);
    setSelectedMatchIds([]);
  };

  const selectedMatchIdSet = useMemo(() => new Set(selectedMatchIds), [selectedMatchIds]);
  const allMatchesSelected = matches.length > 0 && selectedMatchIds.length === matches.length;

  const toggleMatchSelection = (matchId: string) => {
    setSelectedMatchIds((current) =>
      current.includes(matchId)
        ? current.filter((id) => id !== matchId)
        : [...current, matchId],
    );
    setIsDeleteSelectedMatchesConfirmOpen(false);
  };

  const toggleSelectAllMatches = () => {
    setSelectedMatchIds(allMatchesSelected ? [] : matches.map((match) => match.id));
    setIsDeleteSelectedMatchesConfirmOpen(false);
  };

  const handleDeleteSelectedMatches = async () => {
    if (selectedMatchIds.length === 0) return;
    setIsDeletingSelectedMatches(true);
    try {
      const deletedCount = await deleteTeamMatches(selectedMatchIds);
      const deletedIdSet = new Set(selectedMatchIds);
      setMatches((current) => {
        const nextMatches = current.filter((match) => !deletedIdSet.has(match.id));
        if (nextMatches.length === 0) {
          closeMatchListModal();
        }
        return nextMatches;
      });
      setSelectedMatchIds([]);
      setIsDeleteSelectedMatchesConfirmOpen(false);
      onToast(TEAM_NOTIFICATION_MESSAGES.matchSelectedDeleted.replace("{count}", String(deletedCount)));
    } catch (error) {
      onToast(getMatchNotificationFromError(error, "matchDeleteSelectedFailed"), "error");
    } finally {
      setIsDeletingSelectedMatches(false);
    }
  };

  const shiftCalendarMonth = (offset: number) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const openMatchDetail = (matchId: string) => {
    navigate(getAppPath("match-detail", undefined, { teamId, matchId }));
  };

  const handleQuickAttendance = async (
    matchId: string,
    status: Exclude<TeamMatchAttendanceStatus, "unknown">,
  ) => {
    if (!currentMemberId) return;
    if ((myAttendanceByMatchId[matchId] ?? "unknown") === status) return;

    setUpdatingAttendanceMatchId(matchId);
    try {
      await upsertMatchAttendance(matchId, currentMemberId, status);
      setMyAttendanceByMatchId((current) => ({ ...current, [matchId]: status }));
      onToast(TEAM_NOTIFICATION_MESSAGES.matchAttendanceUpdated);
    } catch (error) {
      onToast(getMatchNotificationFromError(error, "matchAttendanceUpdateFailed"), "error");
    } finally {
      setUpdatingAttendanceMatchId(null);
    }
  };

  const renderQuickAttendance = (match: TeamMatch, showLabels = false) => {
    if (!currentMemberId || !isUpcomingMatch(match)) return null;

    return (
      <QuickAttendanceButtons
        status={myAttendanceByMatchId[match.id] ?? "unknown"}
        isUpdating={updatingAttendanceMatchId === match.id}
        showLabels={showLabels}
        onStatusChange={(status) => void handleQuickAttendance(match.id, status)}
      />
    );
  };

  const renderNearestMatchCard = (match: TeamMatch) => {
    const quickAttendance = renderQuickAttendance(match, true);
    const isMenuOpen = openMenuMatchId === match.id;

    return (
      <article className={[styles.nearestMatchCard, isAdmin ? styles.nearestMatchCardAdmin : ""].filter(Boolean).join(" ")}>
        {isAdmin ? (
          <div className={styles.nearestMatchMenuWrap} data-match-menu-root>
            <button
              type="button"
              className={styles.nearestMatchMenuButton}
              aria-label="Tuỳ chọn lịch"
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
              onClick={(event) => {
                event.stopPropagation();
                setOpenMenuMatchId((current) => (current === match.id ? null : match.id));
              }}
            >
              <MoreVertical size={18} aria-hidden="true" />
            </button>
            {isMenuOpen ? (
              <div className={styles.nearestMatchMenu} role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className={styles.nearestMatchMenuItem}
                  onClick={() => openEditForm(match)}
                >
                  <Pencil size={14} aria-hidden="true" />
                  Chỉnh sửa
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={styles.nearestMatchMenuItemDanger}
                  disabled={deletingMatchId === match.id}
                  onClick={() => {
                    setOpenMenuMatchId(null);
                    void handleDeleteMatch(match.id);
                  }}
                >
                  {deletingMatchId === match.id ? (
                    <Loader2 className={styles.spinner} size={14} aria-hidden="true" />
                  ) : (
                    <Trash2 size={14} aria-hidden="true" />
                  )}
                  Xoá lịch
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          className={styles.nearestMatchBody}
          onClick={() => openMatchDetail(match.id)}
          aria-label={`Mở chi tiết ${match.title}`}
        >
          <div className={styles.nearestMatchHeader}>
            <p className={styles.scheduleSectionLabel}>Trận sắp tới</p>
          </div>
          <div className={styles.nearestMatchTitleRow}>
            <h3 className={styles.nearestMatchTitle}>{match.title}</h3>
            <span
              className={
                match.match_type === "match" ? styles.nearestMatchTypeTag : styles.nearestMatchTrainingTag
              }
            >
              {MATCH_TYPE_LABELS[match.match_type]}
            </span>
          </div>
          <MatchCardScheduleInfo
            match={match}
            formatMatchDate={formatMatchDate}
            metaClassName={styles.nearestMatchMeta}
            locationClassName={styles.nearestMatchLocation}
            emptyLocationClassName={styles.nearestMatchLocationEmpty}
            onMapLinkClick={(event) => event.stopPropagation()}
          />
          {nearestUpcomingMatchCount > 1 ? (
            <p className={styles.scheduleConflictNote}>
              <TriangleAlert size={14} aria-hidden="true" />
              Có {nearestUpcomingMatchCount} sự kiện cùng khung giờ này.
            </p>
          ) : null}
        </button>

        <div className={styles.nearestMatchFooter}>
          <div className={styles.nearestMatchFooterStart}>{quickAttendance}</div>
          <button
            type="button"
            className={styles.nearestMatchDetailButton}
            onClick={() => openMatchDetail(match.id)}
          >
            Chi tiết
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </article>
    );
  };

  const renderCompactMatch = (match: TeamMatch) => {
    const hasDuplicateTime = selectedDayDuplicateTimes.has(new Date(match.starts_at).getTime());
    const quickAttendance = renderQuickAttendance(match, true);
    const isMenuOpen = openMenuMatchId === match.id;

    return (
      <article
        key={match.id}
        className={[
          styles.calendarMatchItem,
          isAdmin ? styles.calendarMatchItemAdmin : "",
          hasDuplicateTime ? styles.calendarMatchItemConflict : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {isAdmin ? (
          <div className={styles.nearestMatchMenuWrap} data-match-menu-root>
            <button
              type="button"
              className={styles.nearestMatchMenuButton}
              aria-label="Tuỳ chọn lịch"
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
              onClick={(event) => {
                event.stopPropagation();
                setOpenMenuMatchId((current) => (current === match.id ? null : match.id));
              }}
            >
              <MoreVertical size={18} aria-hidden="true" />
            </button>
            {isMenuOpen ? (
              <div className={styles.nearestMatchMenu} role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className={styles.nearestMatchMenuItemDanger}
                  disabled={deletingMatchId === match.id}
                  onClick={() => {
                    setOpenMenuMatchId(null);
                    void handleDeleteMatch(match.id);
                  }}
                >
                  {deletingMatchId === match.id ? (
                    <Loader2 className={styles.spinner} size={14} aria-hidden="true" />
                  ) : (
                    <Trash2 size={14} aria-hidden="true" />
                  )}
                  Xoá lịch
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className={styles.calendarMatchItemContent}>
          <button
            type="button"
            className={styles.calendarMatchItemTitleButton}
            onClick={() => openMatchDetail(match.id)}
            aria-label={`Mở chi tiết ${match.title}`}
          >
            <strong className={styles.calendarMatchTitle}>{match.title}</strong>
          </button>

          <div className={styles.calendarMatchItemMetaRow}>
            <button
              type="button"
              className={styles.calendarMatchItemMetaButton}
              onClick={() => openMatchDetail(match.id)}
              aria-label={`Mở chi tiết ${match.title}`}
            >
              <MatchCardScheduleInfo
                match={match}
                formatMatchDate={formatMatchDate}
                metaClassName={styles.calendarMatchDate}
                locationClassName={styles.calendarMatchLocation}
                emptyLocationClassName={styles.calendarMatchLocationEmpty}
                showCountdown={false}
                calendarIconSize={13}
                locationIconSize={13}
              />
              {hasDuplicateTime ? (
                <span className={styles.scheduleConflictNoteInline}>
                  <TriangleAlert size={12} aria-hidden="true" />
                  Trùng giờ với sự kiện khác
                </span>
              ) : null}
            </button>
            {quickAttendance}
          </div>
        </div>
      </article>
    );
  };

  return (
    <>
      <section id="team-schedule-section" className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelEyebrow}>Lịch thi đấu</p>
            <h2 className={styles.panelTitle}>Lịch thi đấu</h2>
          </div>
          <div className={styles.panelActions}>
            {matches.length > 0 ? (
              <button
                type="button"
                className={styles.countBadgeButton}
                onClick={() => setIsMatchListOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={isMatchListOpen}
              >
                {matches.length} sự kiện
                <ChevronRight size={12} aria-hidden="true" />
              </button>
            ) : (
              <span className={styles.countBadge}>0 sự kiện</span>
            )}
            {isAdmin ? (
              <Button
                type="button"
                variant="primary"
                size="panel"
                leadingIcon={<Plus size={15} aria-hidden="true" />}
                onClick={() => {
                  openCreateForm();
                }}
              >
                Thêm lịch
              </Button>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <DetailSkeleton />
        ) : (
          <div className={styles.scheduleLayout}>
            {nearestUpcomingMatch ? (
              renderNearestMatchCard(nearestUpcomingMatch)
            ) : matches.length === 0 ? (
              <div className={styles.nearestMatchEmpty}>
                <CalendarDays size={28} />
                <div>
                  <h3>Chưa có lịch thi đấu</h3>
                  <p>Thêm trận giao hữu, giải đấu hoặc buổi tập để cả đội theo dõi trên lịch.</p>
                </div>
              </div>
            ) : (
              <div className={styles.nearestMatchEmpty}>
                <CalendarDays size={28} />
                <div>
                  <h3>Chưa có trận sắp tới</h3>
                  <p>Các sự kiện trước đây vẫn hiển thị trên lịch bên dưới.</p>
                </div>
              </div>
            )}

            <div className={styles.calendar}>
              <div className={styles.calendarToolbar}>
                <button
                  type="button"
                  className={styles.calendarNavButton}
                  onClick={() => shiftCalendarMonth(-1)}
                  aria-label="Tháng trước"
                >
                  <ChevronLeft size={18} />
                </button>
                <p className={styles.calendarMonthLabel}>{formatMonthLabel(calendarMonth)}</p>
                <button
                  type="button"
                  className={styles.calendarNavButton}
                  onClick={() => shiftCalendarMonth(1)}
                  aria-label="Tháng sau"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className={styles.calendarWeekdays}>
                {WEEKDAY_LABELS.map((label) => (
                  <span key={label} className={styles.calendarWeekday}>
                    {label}
                  </span>
                ))}
              </div>

              <div className={styles.calendarGrid}>
                {calendarCells.map(({ date, inMonth }) => {
                  const dateKey = toDateKey(date);
                  const dayMatches = matchesByDate.get(dateKey) ?? [];
                  const isToday = dateKey === todayKey;
                  const isSelected = dateKey === selectedDateKey;
                  const hasConflict = dayHasScheduleConflict(dayMatches);

                  return (
                    <button
                      key={`${dateKey}-${inMonth ? "in" : "out"}`}
                      type="button"
                      className={[
                        styles.calendarDay,
                        inMonth ? "" : styles.calendarDayMuted,
                        isToday ? styles.calendarDayToday : "",
                        isSelected ? styles.calendarDaySelected : "",
                        dayMatches.length ? styles.calendarDayHasEvents : "",
                        hasConflict ? styles.calendarDayConflict : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => setSelectedDateKey(dateKey)}
                      aria-label={`${date.getDate()}/${date.getMonth() + 1}${dayMatches.length ? `, ${dayMatches.length} sự kiện` : ""}${hasConflict ? ", có trùng giờ" : ""}`}
                      aria-pressed={isSelected}
                    >
                      <span className={styles.calendarDayCircle}>{date.getDate()}</span>
                      <span className={styles.calendarDayDots} aria-hidden="true">
                        {dayMatches.slice(0, 3).map((match) => (
                          <span
                            key={match.id}
                            className={match.match_type === "match" ? styles.calendarDotMatch : styles.calendarDotTraining}
                          />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedDateKey ? (
                <div className={styles.calendarDayDetails}>
                  <p className={styles.scheduleSectionLabel}>
                    {new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" }).format(parseDateKey(selectedDateKey))}
                  </p>
                  {selectedDayMatches.length ? (
                    <div className={styles.calendarDayMatchList}>{selectedDayMatches.map(renderCompactMatch)}</div>
                  ) : (
                    <p className={styles.calendarDayEmpty}>Không có sự kiện trong ngày này.</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>

      {isMatchListOpen ? (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="match-list-title">
            <div className={styles.modalHeader}>
              <h2 id="match-list-title" className={styles.modalTitle}>Danh sách lịch</h2>
              <button
                type="button"
                className={styles.iconButton}
                onClick={closeMatchListModal}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.matchListToolbar}>
                <p className={styles.matchListSummary}>
                  {matches.length} sự kiện
                  {isAdmin && selectedMatchIds.length > 0 ? (
                    <span className={styles.matchListSelectedCount}>
                      · Đã chọn {selectedMatchIds.length}
                    </span>
                  ) : null}
                </p>
                {isAdmin && matches.length > 0 ? (
                  <button
                    type="button"
                    className={styles.matchListSelectAllButton}
                    onClick={toggleSelectAllMatches}
                  >
                    {allMatchesSelected ? "Bỏ chọn" : "Chọn tất cả"}
                  </button>
                ) : null}
              </div>

              <div className={styles.matchListScroll}>
                {sortedMatchesForList.map((match) => {
                  const isPastMatch = new Date(match.starts_at).getTime() < Date.now();
                  const isSelected = selectedMatchIdSet.has(match.id);
                  return (
                    <button
                      key={match.id}
                      type="button"
                      className={[
                        styles.matchListItem,
                        isSelected ? styles.matchListItemSelected : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-pressed={isAdmin ? isSelected : undefined}
                      onClick={() => {
                        if (isAdmin) {
                          toggleMatchSelection(match.id);
                          return;
                        }
                        closeMatchListModal();
                        openMatchDetail(match.id);
                      }}
                    >
                      <div className={styles.matchListItemTitleRow}>
                        <strong className={styles.matchListItemTitle}>{match.title}</strong>
                        <span
                          className={
                            match.match_type === "match"
                              ? styles.matchListItemTypeMatch
                              : styles.matchListItemTypeTraining
                          }
                        >
                          {MATCH_TYPE_LABELS[match.match_type]}
                        </span>
                      </div>
                      <span className={styles.matchListItemMeta}>
                        {formatMatchDate(match.starts_at)}
                        {isPastMatch ? " · Đã qua" : ""}
                      </span>
                      {match.location ? (
                        <span className={styles.matchListItemLocation}>{match.location}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {isAdmin ? (
                isDeleteSelectedMatchesConfirmOpen ? (
                  <div className={styles.matchListDeleteAllConfirm}>
                    <p className={styles.confirmText}>
                      Xoá <strong>{selectedMatchIds.length}</strong> lịch đã chọn? Hành động này không thể hoàn tác.
                    </p>
                    <div className={styles.modalActions}>
                      <Button
                        type="button"
                        variant="secondary"
                        fullWidthMobile
                        onClick={() => setIsDeleteSelectedMatchesConfirmOpen(false)}
                      >
                        Huỷ
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        fullWidthMobile
                        loading={isDeletingSelectedMatches}
                        onClick={() => void handleDeleteSelectedMatches()}
                      >
                        Xoá
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="danger"
                    fullWidth
                    className={styles.matchListDeleteButton}
                    disabled={selectedMatchIds.length === 0 || isDeletingSelectedMatches}
                    loading={isDeletingSelectedMatches}
                    onClick={() => setIsDeleteSelectedMatchesConfirmOpen(true)}
                  >
                    Xoá
                  </Button>
                )
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isScheduleModalOpen ? (
        <div className={styles.modalOverlay}>
          <form
            className={styles.modal}
            noValidate
            onSubmit={(event) => event.preventDefault()}
            onKeyDown={handleScheduleFormKeyDown}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{isEditingSchedule ? "Chỉnh sửa lịch" : "Thêm lịch"}</h2>
              <button
                type="button"
                className={styles.iconButton}
                onClick={closeScheduleModal}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            {!isEditingSchedule && scheduleFormTotalSteps > 1 ? (
              <ol className={styles.scheduleStepper} aria-label="Tiến trình tạo lịch">
                {scheduleFormStepLabels.map((label, index) => {
                  const stepNumber = index + 1;
                  const isCompleted = scheduleFormStep > stepNumber;
                  const isActive = scheduleFormStep === stepNumber;

                  return (
                    <li
                      key={label}
                      className={[
                        styles.scheduleStepperStep,
                        isCompleted ? styles.scheduleStepperStepDone : "",
                        isActive ? styles.scheduleStepperStepActive : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-current={isActive ? "step" : undefined}
                    >
                      <div
                        className={[
                          styles.scheduleStepperBadge,
                          isCompleted ? styles.scheduleStepperBadgeDone : "",
                          isActive ? styles.scheduleStepperBadgeActive : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {isCompleted ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : stepNumber}
                      </div>
                      <span
                        className={[
                          styles.scheduleStepperLabel,
                          isCompleted ? styles.scheduleStepperLabelDone : "",
                          isActive ? styles.scheduleStepperLabelActive : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : null}

            <div className={styles.modalBody}>
              {isEditingSchedule || scheduleFormStep === 1 ? (
                <>
                  <label className={styles.label}>
                    <span className={styles.labelText}>Tiêu đề / Đối thủ</span>
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      onBlur={() => setTitleTouched(true)}
                      className={styles.input}
                      placeholder="VD: Giao hữu vs FC Phố Lá"
                      autoFocus
                      maxLength={TEAM_MATCH_TITLE_MAX_LENGTH}
                    />
                    {showTitleError ? (
                      <span className={styles.scheduleFormError} role="alert">
                        <TriangleAlert size={14} aria-hidden="true" />
                        {titleValidationError}
                      </span>
                    ) : null}
                  </label>

                  <div className={styles.label}>
                    <span className={styles.labelText}>Loại sự kiện</span>
                    <div className={styles.scheduleChipGroup} role="group" aria-label="Loại sự kiện">
                      {(Object.entries(MATCH_TYPE_LABELS) as [TeamMatchType, string][]).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          className={matchType === value ? styles.scheduleChipActive : styles.scheduleChip}
                          aria-pressed={matchType === value}
                          onClick={() => handleMatchTypeChange(value)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.label}>
                    <span className={styles.labelText}>Thời gian</span>
                    <div className={styles.scheduleDateTimeFields}>
                      <input
                        type="date"
                        value={matchDate}
                        onChange={(event) => handleMatchDateChange(event.target.value)}
                        onBlur={() => setScheduleTouched(true)}
                        className={styles.input}
                        aria-label="Ngày thi đấu"
                      />
                      <input
                        type="time"
                        value={matchTime}
                        onChange={(event) => handleMatchTimeChange(event.target.value)}
                        onBlur={() => setScheduleTouched(true)}
                        className={styles.input}
                        aria-label="Giờ thi đấu"
                      />
                    </div>
                    {renderScheduleAlerts()}
                  </div>

                  <div className={styles.label}>
                    <span className={styles.labelText}>Địa điểm</span>
                    <input
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      className={styles.input}
                      placeholder="VD: Sân bóng Quận 7"
                    />
                    {!showMapLinkField ? (
                      <button
                        type="button"
                        className={styles.scheduleFormLinkToggle}
                        onClick={() => setShowMapLinkField(true)}
                      >
                        <Link size={14} aria-hidden="true" />
                        Thêm link Google Maps
                      </button>
                    ) : (
                      <div className={styles.scheduleLocationMapField}>
                        <span className={styles.scheduleLocationMapLabel}>Link Google Maps</span>
                        <input
                          type="url"
                          value={locationMapUrl}
                          onChange={(event) => setLocationMapUrl(event.target.value)}
                          onBlur={() => setLocationMapUrlTouched(true)}
                          className={styles.input}
                          placeholder="https://maps.app.goo.gl/..."
                          inputMode="url"
                          autoComplete="off"
                        />
                      </div>
                    )}
                    {showLocationMapUrlError ? (
                      <span className={styles.scheduleFormError} role="alert">
                        <TriangleAlert size={14} aria-hidden="true" />
                        {locationMapUrlValidationError}
                      </span>
                    ) : null}
                  </div>

                  {!isEditingSchedule ? (
                    <div className={styles.recurrenceToggleCard}>
                      <label className={styles.recurrenceToggleCompact}>
                        <input
                          type="checkbox"
                          checked={recurrenceEnabled}
                          onChange={(event) => toggleRecurrenceEnabled(event.target.checked)}
                        />
                        <span className={styles.recurrenceToggleContent}>
                          <strong>Lặp lại lịch này</strong>
                          <small>Tạo nhiều sự kiện theo chu kỳ</small>
                        </span>
                      </label>
                    </div>
                  ) : null}
                </>
              ) : isScheduleRecurrenceStep ? (
                <div className={styles.scheduleRecurrencePanel}>
                  <div className={styles.label}>
                    <span className={styles.labelText}>Tần suất</span>
                    <div className={styles.scheduleChipGroup} role="group" aria-label="Tần suất lặp">
                      {(Object.entries(RECURRENCE_INTERVAL_LABELS) as [RecurrenceInterval, string][]).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          className={recurrenceInterval === value ? styles.scheduleChipActive : styles.scheduleChip}
                          aria-pressed={recurrenceInterval === value}
                          onClick={() => setRecurrenceInterval(value)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.label}>
                    <span className={styles.labelText}>Kết thúc</span>
                    <div className={styles.scheduleSegmentGroup} role="group" aria-label="Cách kết thúc lặp lại">
                      <button
                        type="button"
                        className={recurrenceEndMode === "count" ? styles.scheduleSegmentActive : styles.scheduleSegment}
                        aria-pressed={recurrenceEndMode === "count"}
                        onClick={() => setRecurrenceEndMode("count")}
                      >
                        Sau số lần
                      </button>
                      <button
                        type="button"
                        className={recurrenceEndMode === "date" ? styles.scheduleSegmentActive : styles.scheduleSegment}
                        aria-pressed={recurrenceEndMode === "date"}
                        onClick={() => setRecurrenceEndMode("date")}
                      >
                        Đến ngày
                      </button>
                    </div>

                    {recurrenceEndMode === "count" ? (
                      <div className={styles.recurrenceEndInline}>
                        <div className={styles.scheduleChipGroupCompact} role="group" aria-label="Số lần nhanh">
                          {[4, 8, 12].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              className={recurrenceCount === preset ? styles.scheduleChipActive : styles.scheduleChip}
                              aria-pressed={recurrenceCount === preset}
                              onClick={() => setRecurrenceCount(preset)}
                            >
                              {preset} lần
                            </button>
                          ))}
                        </div>
                        <label className={styles.recurrenceInlineField}>
                          <span>Tổng</span>
                          <input
                            type="number"
                            min={RECURRENCE_MIN_COUNT}
                            max={RECURRENCE_MAX_COUNT}
                            value={recurrenceCount}
                            onChange={(event) => setRecurrenceCount(Number(event.target.value))}
                            className={styles.recurrenceCountInput}
                            aria-label="Số lần lặp"
                          />
                          <span>lần</span>
                        </label>
                      </div>
                    ) : (
                      <div className={styles.recurrenceEndInline}>
                        <input
                          type="date"
                          value={recurrenceEndDate}
                          onChange={(event) => setRecurrenceEndDate(event.target.value)}
                          className={styles.input}
                          min={matchDate}
                          aria-label="Ngày kết thúc lặp lại"
                        />
                      </div>
                    )}
                  </div>

                  {showRecurrenceError ? (
                    <span className={styles.scheduleFormError} role="alert">
                      <TriangleAlert size={14} aria-hidden="true" />
                      {recurrenceValidationError}
                    </span>
                  ) : null}

                  {recurringPreviewLabel ? (
                    <p className={styles.recurrencePreview}>
                      Sẽ tạo <strong>{recurringDateKeys.length}</strong> sự kiện: {recurringPreviewLabel}
                    </p>
                  ) : null}

                  {recurringConflicts[0] ? (
                    <span className={styles.scheduleFormError} role="alert">
                      <TriangleAlert size={14} aria-hidden="true" />
                      {formatRecurringConflictMessage(
                        recurringConflicts[0].conflict,
                        recurringConflicts[0].occurrence,
                      )}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className={styles.scheduleFormFooter}>
              {!isEditingSchedule && scheduleFormStep > 1 ? (
                <Button
                  type="button"
                  variant="secondary"
                  className={styles.scheduleFormBackButton}
                  onClick={goBackScheduleStep}
                  leadingIcon={<ChevronLeft size={18} aria-hidden="true" />}
                >
                  Quay lại
                </Button>
              ) : null}

              {!isEditingSchedule && scheduleFormStep < scheduleFormFinalStep ? (
                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  className={styles.modalSubmitButton}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    goToNextScheduleStep();
                  }}
                  disabled={
                    scheduleFormStep === 1
                      ? !canProceedScheduleStep1
                      : false
                  }
                >
                  Tiếp theo
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  fullWidth={isEditingSchedule || scheduleFormStep === 1}
                  className={styles.modalSubmitButton}
                  loading={isSubmitting}
                  disabled={
                    !title.trim()
                    || !matchDate
                    || !matchTime
                    || Boolean(createFormValidationError)
                    || Boolean(locationMapUrlValidationError)
                    || Boolean(recurrenceEnabled && recurrenceValidationError)
                    || hasScheduleBlockingConflict
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void handleScheduleConfirm();
                  }}
                  leadingIcon={
                    isEditingSchedule ? (
                      <Check size={18} aria-hidden="true" />
                    ) : (
                      <Plus size={18} aria-hidden="true" />
                    )
                  }
                >
                  {isEditingSchedule
                    ? "Lưu thay đổi"
                    : recurrenceEnabled
                      ? `Thêm ${recurringDateKeys.length || 1} lịch`
                      : "Thêm lịch"}
                </Button>
              )}
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

export function TeamDetail({ user, onRequireAuth, onToast }: TeamDetailProps) {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const scheduleSectionHandledRef = useRef(false);
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
      navigate(getAppPath("teams"), { replace: true });
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
    // Store actions (clearCurrentTeam, fetchTeamDetails) are stable; onToast is stable via useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when team or user identity changes
  }, [teamId, user?.id]);

  useEffect(() => {
    if (!teamId) return;
    window.sessionStorage.setItem("lastTeamDetailId", teamId);
  }, [teamId]);

  useEffect(() => {
    scheduleSectionHandledRef.current = false;
  }, [teamId]);

  const scheduleSection = searchParams.get("section");
  useEffect(() => {
    if (scheduleSection !== "schedule" || isLoadingTeamDetails || !team?.id || scheduleSectionHandledRef.current) {
      return;
    }

    scheduleSectionHandledRef.current = true;
    const scheduleElement = document.getElementById("team-schedule-section");
    scheduleElement?.scrollIntoView({ behavior: "smooth", block: "start" });

    setSearchParams((currentParams) => {
      if (!currentParams.has("section")) return currentParams;
      const nextParams = new URLSearchParams(currentParams);
      nextParams.delete("section");
      return nextParams;
    }, { replace: true });
  }, [scheduleSection, isLoadingTeamDetails, team?.id, setSearchParams]);

  useEffect(() => {
    if (!user?.id || !teamId || !currentUserMember?.id) return;
    let isMounted = true;
    let isChecking = false;

    const handleRemovedFromTeam = () => {
      if (!isMounted) return;
      onToast(TEAM_NOTIFICATION_MESSAGES.playerRemovedFromTeam, "error");
      clearCurrentTeam();
      navigate(getAppPath("teams"), { replace: true });
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
    // Store actions and navigate/onToast are stable; poll only when membership context changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- teamId, user?.id, currentUserMember?.id
  }, [teamId, user?.id, currentUserMember?.id]);

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
        <button type="button" className={styles.backButton} onClick={() => navigate(getAppPath("teams"))}>
          <ArrowLeft size={18} />
          Đội bóng
        </button>
        <div className={styles.authCard}>
          <Shield className={styles.authIcon} size={42} />
          <h1 className={styles.authTitle}>Đăng nhập để xem đội bóng</h1>
          <p className={styles.authText}>Bạn cần đăng nhập để xem thành viên và quyền quản trị đội.</p>
          <Button variant="primary" className={styles.authCardButton} onClick={onRequireAuth}>
            Đăng nhập
          </Button>
        </div>
      </section>
    );
  }

  if (!teamId) {
    return (
      <section className={styles.page}>
        <button type="button" className={styles.backButton} onClick={() => navigate(getAppPath("teams"))}>
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
        <button type="button" className={styles.backButton} onClick={() => navigate(getAppPath("teams"))}>
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
      <button type="button" className={styles.backButton} onClick={() => navigate(getAppPath("teams"))}>
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
                {team.logo_url ? <img src={team.logo_url} alt="" /> : <Users size={24} />}
              </div>
              <div className={styles.teamIdentityText}>
                <h1 className={styles.detailTitle}>{team.name}</h1>
                <p className={styles.detailMeta}>{team.members.length} thành viên</p>
              </div>
            </div>
            <div className={styles.detailHeroActions}>
              <span className={styles.rolePill}>
                <Shield size={15} />
                {isAdmin ? "Quản trị viên" : "Thành viên"}
              </span>
              {!isAdmin && currentUserMember?.role === "player" ? (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  leadingIcon={<LogOut size={16} aria-hidden="true" />}
                  onClick={() => setIsLeaveConfirmOpen(true)}
                >
                  Rời đội bóng
                </Button>
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
        <div className={styles.detailGrid}>
          <MembersView
            teamId={teamId}
            members={team?.members ?? EMPTY_TEAM_MEMBERS}
            isAdmin={isAdmin}
            isLoading={isLoadingTeamDetails}
            currentUserId={user.id}
            onRequireAuth={onRequireAuth}
            onToast={onToast}
          />
          <ScheduleView
            teamId={teamId}
            userId={user.id}
            currentMemberId={currentUserMember?.id ?? null}
            isAdmin={isAdmin}
            onToast={onToast}
          />
        </div>
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
                Quản trị viên sẽ cần xác nhận trước khi bạn rời đội.
              </p>
              <div className={styles.modalActions}>
                <Button type="button" variant="secondary" fullWidthMobile onClick={() => setIsLeaveConfirmOpen(false)}>
                  Huỷ
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  fullWidthMobile
                  loading={isRequestingLeave}
                  leadingIcon={<LogOut size={18} aria-hidden="true" />}
                  onClick={() => void handleRequestLeaveTeam()}
                >
                  Gửi yêu cầu
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
