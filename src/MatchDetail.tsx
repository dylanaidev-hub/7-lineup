import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  LayoutGrid,
  Loader2,
  MapPin,
  Minus,
  Plus,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getAppPath } from "./appRouting";
import { Button } from "./Button";
import { supabase } from "./lib/supabaseClient";
import { copyByLanguage } from "./appI18n";
import { fetchSavedLineups } from "./lineupRepository";
import type { SavedLineupRecord } from "./lineupState";
import { getSavedLineupFormatLabel, getSavedLineupThumbnail } from "./lockerDisplay";
import { buildMatchLineupSnapshot, MatchLineupPickerModal } from "./MatchLineupPickerModal";
import {
  applyMatchLineups,
  getMatchAttendance,
  getTeamMatch,
  upsertMatchAttendance,
} from "./repositories/teamRepository";
import { MatchMatchup } from "./teamMatchDisplay";
import { useTeamStore } from "./stores/teamStore";
import { getMatchNotificationFromError, getPlayerTeamNotificationFromError, TEAM_NOTIFICATION_MESSAGES } from "./teamNotifications";
import type {
  MatchLineupSnapshot,
  TeamDetails,
  TeamMatch,
  TeamMatchAttendance,
  TeamMatchAttendanceStatus,
  TeamMember,
} from "./types/team";
import styles from "./TeamPages.module.css";

type MatchDetailProps = {
  user: User | null;
  onRequireAuth: () => void;
  onToast: (message: string, tone?: "success" | "error") => void;
};

const ATTENDANCE_STATUS_LABELS: Record<TeamMatchAttendanceStatus, string> = {
  going: "Có mặt",
  not_going: "Vắng",
  maybe: "Chưa chắc",
  unknown: "Chưa trả lời",
};

const ATTENDANCE_STATUS_ORDER: TeamMatchAttendanceStatus[] = ["going", "maybe", "not_going"];

/** Tạm ẩn — bật lại khi phát triển tính năng đội hình áp dụng */
const SHOW_APPLIED_LINEUP_SECTION = false;

const lineupCopy = copyByLanguage.vi;

const getLineupFormatLabel = (format: string) =>
  getSavedLineupFormatLabel(
    { format, players_data: null, created_at: "" },
    { pitchLabels: lineupCopy.pitchLabels, tacticsLabel: lineupCopy.tacticsTab },
  );

const getSnapshotThumbnail = (snapshot: MatchLineupSnapshot | null) => {
  if (!snapshot) return "";
  return getSavedLineupThumbnail({
    format: snapshot.format,
    players_data: snapshot.players_data,
    created_at: snapshot.applied_at,
  });
};

const formatMatchDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

function AttendanceSummary({
  total,
  counts,
}: {
  total: number;
  counts: Record<TeamMatchAttendanceStatus, number>;
}) {
  return (
    <div className={styles.attendanceSummary}>
      <div className={styles.attendanceSummaryItem}>
        <span className={styles.attendanceSummaryValue}>{counts.going}</span>
        <span className={styles.attendanceSummaryLabel}>Có mặt</span>
      </div>
      <div className={styles.attendanceSummaryItem}>
        <span className={styles.attendanceSummaryValue}>{counts.maybe}</span>
        <span className={styles.attendanceSummaryLabel}>Chưa chắc</span>
      </div>
      <div className={styles.attendanceSummaryItem}>
        <span className={styles.attendanceSummaryValue}>{counts.not_going}</span>
        <span className={styles.attendanceSummaryLabel}>Vắng</span>
      </div>
      <div className={styles.attendanceSummaryItem}>
        <span className={styles.attendanceSummaryValue}>{counts.unknown}</span>
        <span className={styles.attendanceSummaryLabel}>Chưa trả lời</span>
      </div>
      <div className={styles.attendanceSummaryItem}>
        <span className={styles.attendanceSummaryValue}>{total}</span>
        <span className={styles.attendanceSummaryLabel}>Tổng</span>
      </div>
    </div>
  );
}

export function MatchDetail({ user, onRequireAuth, onToast }: MatchDetailProps) {
  const { teamId, matchId } = useParams<{ teamId: string; matchId: string }>();
  const navigate = useNavigate();
  const { currentTeam, isLoadingTeamDetails, fetchTeamDetails, clearCurrentTeam } = useTeamStore();
  const [match, setMatch] = useState<TeamMatch | null>(null);
  const [attendance, setAttendance] = useState<TeamMatchAttendance[]>([]);
  const [isLoadingMatch, setIsLoadingMatch] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [savedLineups, setSavedLineups] = useState<SavedLineupRecord[]>([]);
  const [isLoadingLineups, setIsLoadingLineups] = useState(false);
  const [isApplyingLineup, setIsApplyingLineup] = useState(false);
  const [isLineupPickerOpen, setIsLineupPickerOpen] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const team = currentTeam as TeamDetails | null;
  const currentUserMember = useMemo(
    () => team?.members.find((member) => member.user_id === user?.id) ?? null,
    [team, user?.id],
  );
  const isAdmin = currentUserMember?.role === "admin";

  const attendanceByMemberId = useMemo(() => {
    const map = new Map<string, TeamMatchAttendance>();
    for (const record of attendance) {
      map.set(record.member_id, record);
    }
    return map;
  }, [attendance]);

  const sortedMembers = useMemo(() => {
    const members = team?.members ?? [];
    return [...members].sort((left, right) => {
      if (left.user_id === user?.id) return -1;
      if (right.user_id === user?.id) return 1;
      return left.player_name.localeCompare(right.player_name, "vi");
    });
  }, [team?.members, user?.id]);

  const attendanceCounts = useMemo(() => {
    const counts: Record<TeamMatchAttendanceStatus, number> = {
      going: 0,
      not_going: 0,
      maybe: 0,
      unknown: 0,
    };

    for (const member of sortedMembers) {
      const status = attendanceByMemberId.get(member.id)?.status ?? "unknown";
      counts[status] += 1;
    }

    return counts;
  }, [attendanceByMemberId, sortedMembers]);

  const loadMatchData = useCallback(async () => {
    if (!matchId) return;
    setIsLoadingMatch(true);
    setLoadError("");
    try {
      const [nextMatch, nextAttendance] = await Promise.all([
        getTeamMatch(matchId),
        getMatchAttendance(matchId),
      ]);
      if (!isMountedRef.current) return;
      setMatch(nextMatch);
      setAttendance(nextAttendance);
    } catch (error) {
      if (!isMountedRef.current) return;
      const message = error instanceof Error ? error.message : TEAM_NOTIFICATION_MESSAGES.matchNotFound;
      setLoadError(message);
      onToast(message, "error");
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMatch(false);
      }
    }
  }, [matchId, onToast]);

  useEffect(() => {
    if (!user || !teamId || !matchId) return;

    let isMounted = true;
    clearCurrentTeam();
    void fetchTeamDetails(teamId).catch((error) => {
      if (!isMounted) return;
      const message = getPlayerTeamNotificationFromError(error, "playerTeamAccessDenied");
      setLoadError(message);
      onToast(message, "error");
    });
    void loadMatchData();

    return () => {
      isMounted = false;
    };
  }, [clearCurrentTeam, fetchTeamDetails, loadMatchData, matchId, onToast, teamId, user]);

  useEffect(() => {
    if (!SHOW_APPLIED_LINEUP_SECTION || !user || !isAdmin) {
      setSavedLineups([]);
      return;
    }

    let isMounted = true;
    setIsLoadingLineups(true);
    void fetchSavedLineups()
      .then((lineups) => {
        if (isMounted) setSavedLineups(lineups);
      })
      .catch(() => {
        if (isMounted) setSavedLineups([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingLineups(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isAdmin, user]);

  useEffect(() => {
    if (!teamId || !matchId || !supabase) return;
    const client = supabase;

    const channel = client
      .channel(`team-match:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "team_matches",
          filter: `id=eq.${matchId}`,
        },
        () => {
          onToast(TEAM_NOTIFICATION_MESSAGES.matchDeleted);
          navigate(getAppPath("team-detail", undefined, { teamId, search: { section: "schedule" } }), { replace: true });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "team_matches",
          filter: `id=eq.${matchId}`,
        },
        () => {
          void loadMatchData();
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [loadMatchData, matchId, navigate, onToast, teamId]);

  useEffect(() => {
    if (!match || !teamId) return;
    if (match.team_id !== teamId) {
      setLoadError(TEAM_NOTIFICATION_MESSAGES.matchNotFound);
    }
  }, [match, teamId]);

  const canEditMemberAttendance = (member: TeamMember) =>
    isAdmin || (member.user_id !== null && member.user_id === user?.id);

  const handleStatusChange = async (member: TeamMember, status: TeamMatchAttendanceStatus) => {
    if (!matchId || !canEditMemberAttendance(member)) return;
    if (attendanceByMemberId.get(member.id)?.status === status) return;

    setUpdatingMemberId(member.id);
    try {
      const updated = await upsertMatchAttendance(matchId, member.id, status);
      setAttendance((current) => {
        const others = current.filter((record) => record.member_id !== member.id);
        return [...others, updated];
      });
      if (member.user_id === user?.id) {
        onToast(TEAM_NOTIFICATION_MESSAGES.matchAttendanceUpdated);
      }
    } catch (error) {
      onToast(getMatchNotificationFromError(error, "matchAttendanceUpdateFailed"), "error");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleConfirmLineups = async (selectedLineups: SavedLineupRecord[]) => {
    if (!matchId || !isAdmin || isApplyingLineup) return;

    const existingById = new Map((match?.applied_lineups ?? []).map((snapshot) => [snapshot.lineup_id, snapshot]));
    const snapshots = selectedLineups.map((lineup) => {
      const existing = existingById.get(lineup.id);
      return existing ?? buildMatchLineupSnapshot(lineup);
    });

    setIsApplyingLineup(true);
    try {
      const updated = await applyMatchLineups(matchId, snapshots);
      setMatch(updated);
      setIsLineupPickerOpen(false);
      onToast(TEAM_NOTIFICATION_MESSAGES.matchLineupsUpdated);
    } catch (error) {
      onToast(getMatchNotificationFromError(error, "matchLineupApplyFailed"), "error");
    } finally {
      setIsApplyingLineup(false);
    }
  };

  const handleRemoveAppliedLineup = async (lineupId: string) => {
    if (!matchId || !isAdmin || isApplyingLineup) return;

    const nextSnapshots = (match?.applied_lineups ?? []).filter((snapshot) => snapshot.lineup_id !== lineupId);
    setIsApplyingLineup(true);
    try {
      const updated = await applyMatchLineups(matchId, nextSnapshots);
      setMatch(updated);
      onToast(TEAM_NOTIFICATION_MESSAGES.matchLineupsUpdated);
    } catch (error) {
      onToast(getMatchNotificationFromError(error, "matchLineupApplyFailed"), "error");
    } finally {
      setIsApplyingLineup(false);
    }
  };

  const appliedLineups = match?.applied_lineups ?? [];
  const appliedLineupIds = appliedLineups.map((snapshot) => snapshot.lineup_id);

  const renderStatusButton = (
    member: TeamMember,
    status: TeamMatchAttendanceStatus,
    icon: typeof Check,
  ) => {
    const Icon = icon;
    const currentStatus = attendanceByMemberId.get(member.id)?.status ?? "unknown";
    const isActive = currentStatus === status;
    const isDisabled = !canEditMemberAttendance(member) || updatingMemberId === member.id;

    return (
      <button
        key={status}
        type="button"
        className={[
          styles.attendanceStatusButton,
          isActive ? styles.attendanceStatusButtonActive : "",
          status === "going" ? styles.attendanceStatusGoing : "",
          status === "maybe" ? styles.attendanceStatusMaybe : "",
          status === "not_going" ? styles.attendanceStatusAbsent : "",
        ]
          .filter(Boolean)
          .join(" ")}
        disabled={isDisabled}
        aria-pressed={isActive}
        aria-label={`${member.player_name}: ${ATTENDANCE_STATUS_LABELS[status]}`}
        onClick={() => void handleStatusChange(member, status)}
      >
        {updatingMemberId === member.id && isActive ? (
          <Loader2 className={styles.spinner} size={14} />
        ) : (
          <Icon size={14} aria-hidden="true" />
        )}
        {ATTENDANCE_STATUS_LABELS[status]}
      </button>
    );
  };

  if (!user) {
    return (
      <section className={styles.page}>
        <button type="button" className={styles.backButton} onClick={() => navigate(getAppPath("teams"))}>
          <ArrowLeft size={18} />
          Đội bóng
        </button>
        <div className={styles.authCard}>
          <Users className={styles.authIcon} size={42} />
          <h1 className={styles.authTitle}>Đăng nhập để điểm danh</h1>
          <p className={styles.authText}>Bạn cần đăng nhập để xem và cập nhật điểm danh trận đấu.</p>
          <Button variant="primary" className={styles.authCardButton} onClick={onRequireAuth}>
            Đăng nhập
          </Button>
        </div>
      </section>
    );
  }

  const resolvedTeamId = teamId ?? match?.team_id ?? null;

  const goBackToTeamSchedule = () => {
    if (!resolvedTeamId) {
      navigate(getAppPath("teams"));
      return;
    }
    navigate(getAppPath("team-detail", undefined, { teamId: resolvedTeamId, search: { section: "schedule" } }));
  };

  if (!teamId || !matchId) {
    return null;
  }

  const isLoading = isLoadingTeamDetails || isLoadingMatch;

  return (
    <section className={styles.page}>
      <button
        type="button"
        className={styles.backButton}
        onClick={goBackToTeamSchedule}
      >
        <ArrowLeft size={18} />
        Lịch thi đấu
      </button>

      {loadError && !isLoading && !match ? (
        <div className={styles.authCard}>
          <CalendarDays className={styles.authIcon} size={42} />
          <h1 className={styles.authTitle}>Không thể mở trận đấu</h1>
          <p className={styles.authText}>{loadError}</p>
          <Button variant="primary" className={styles.authCardButton} onClick={goBackToTeamSchedule}>
            Quay lại lịch thi đấu
          </Button>
        </div>
      ) : (
        <>
          <div className={styles.matchDetailLayout}>
            {isLoading && !match ? (
              <div className={styles.heroSkeleton} />
            ) : match ? (
              <div className={styles.matchDetailTitleWrap}>
                <MatchMatchup match={match} teamName={team?.name} />
              </div>
            ) : null}

            <div className={styles.matchDetailGrid}>
              <div className={styles.matchDetailLeftColumn}>
                <section className={styles.panel}>
                  {isLoading && !match ? (
                    <div className={styles.detailSkeleton}>
                      <div className={styles.skeletonLine} />
                      <div className={styles.skeletonLine} />
                    </div>
                  ) : match ? (
                    <dl className={styles.matchDetailInfoList}>
                      <div className={styles.matchDetailInfoRow}>
                        <dt className={styles.matchDetailInfoLabel}>
                          <CalendarDays size={16} aria-hidden="true" />
                          Ngày giờ
                        </dt>
                        <dd className={styles.matchDetailInfoValue}>{formatMatchDate(match.starts_at)}</dd>
                      </div>
                      <div className={styles.matchDetailInfoRow}>
                        <dt className={styles.matchDetailInfoLabel}>
                          <MapPin size={16} aria-hidden="true" />
                          Địa điểm
                        </dt>
                        <dd className={styles.matchDetailInfoValue}>
                          {match.location?.trim() || "Chưa cập nhật"}
                        </dd>
                      </div>
                    </dl>
                  ) : null}
                </section>

                {SHOW_APPLIED_LINEUP_SECTION ? (
                <section className={styles.panel}>
                  <div className={styles.matchAppliedLineupHeader}>
                    <div className={styles.matchAppliedLineupTitle}>
                      <LayoutGrid size={16} aria-hidden="true" />
                      <h2>Đội hình áp dụng</h2>
                    </div>
                    <div className={styles.matchAppliedLineupHeaderActions}>
                      {isAdmin ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className={styles.matchAppliedLineupAddButton}
                          disabled={isLoadingLineups || isApplyingLineup || isLoading}
                          onClick={() => setIsLineupPickerOpen(true)}
                        >
                          <Plus size={16} aria-hidden="true" />
                          Tạo đội hình
                        </Button>
                      ) : null}
                      {isApplyingLineup ? <Loader2 className={styles.spinner} size={16} aria-hidden="true" /> : null}
                    </div>
                  </div>

                  {appliedLineups.length > 0 ? (
                    <div className={styles.matchAppliedLineupList}>
                      {appliedLineups.map((snapshot) => {
                        const thumbnail = getSnapshotThumbnail(snapshot);
                        return (
                          <article key={snapshot.lineup_id} className={styles.matchAppliedLineupCard}>
                            {thumbnail ? (
                              <img
                                src={thumbnail}
                                alt={snapshot.name}
                                className={styles.matchAppliedLineupThumb}
                              />
                            ) : (
                              <div className={styles.matchAppliedLineupThumbPlaceholder}>
                                {getLineupFormatLabel(snapshot.format)}
                              </div>
                            )}
                            <div className={styles.matchAppliedLineupMeta}>
                              <strong>{snapshot.name}</strong>
                              <span>{getLineupFormatLabel(snapshot.format)}</span>
                            </div>
                            {isAdmin ? (
                              <button
                                type="button"
                                className={styles.matchAppliedLineupRemoveButton}
                                aria-label={`Xoá ${snapshot.name}`}
                                disabled={isApplyingLineup}
                                onClick={() => void handleRemoveAppliedLineup(snapshot.lineup_id)}
                              >
                                <X size={14} aria-hidden="true" />
                              </button>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  ) : !isAdmin ? (
                    <p className={styles.matchAppliedLineupEmpty}>
                      Admin chưa chọn đội hình cho trận này.
                    </p>
                  ) : null}
                </section>
                ) : null}
              </div>

              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.panelEyebrow}>Điểm danh</p>
                    <h2 className={styles.panelTitle}>Điểm danh</h2>
                  </div>
                  <span className={styles.countBadge}>
                    {attendanceCounts.going}/{sortedMembers.length} có mặt
                  </span>
                </div>

                {isLoading ? (
                  <div className={styles.detailSkeleton}>
                    <div className={styles.skeletonLine} />
                    <div className={styles.skeletonLine} />
                    <div className={styles.skeletonLine} />
                  </div>
                ) : sortedMembers.length ? (
                  <>
                    <AttendanceSummary total={sortedMembers.length} counts={attendanceCounts} />
                    <div className={styles.memberList}>
                      {sortedMembers.map((member) => {
                        const currentStatus = attendanceByMemberId.get(member.id)?.status ?? "unknown";
                        const isSelf = member.user_id === user.id;

                        return (
                          <article
                            key={member.id}
                            className={[
                              styles.memberRow,
                              isSelf ? styles.memberRowSelf : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            <div className={styles.memberIdentity}>
                              <div className={styles.memberAvatar}>
                                <UserRound size={20} />
                              </div>
                              <div className={styles.memberText}>
                                <h3>
                                  {member.player_name}
                                  {isSelf ? <span className={styles.memberSelfTag}>Bạn</span> : null}
                                </h3>
                                <p>{ATTENDANCE_STATUS_LABELS[currentStatus]}</p>
                              </div>
                            </div>
                            <div className={styles.attendanceActions}>
                              {canEditMemberAttendance(member) ? (
                                ATTENDANCE_STATUS_ORDER.map((status) =>
                                  renderStatusButton(
                                    member,
                                    status,
                                    status === "going" ? Check : status === "maybe" ? Minus : X,
                                  ),
                                )
                              ) : (
                                <span
                                  className={[
                                    styles.attendanceReadonlyBadge,
                                    currentStatus === "going" ? styles.attendanceStatusGoing : "",
                                    currentStatus === "maybe" ? styles.attendanceStatusMaybe : "",
                                    currentStatus === "not_going" ? styles.attendanceStatusAbsent : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                >
                                  {ATTENDANCE_STATUS_LABELS[currentStatus]}
                                </span>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className={styles.emptyInline}>
                    <Users size={36} />
                    <h3>Chưa có thành viên</h3>
                    <p>Thêm thành viên vào đội để bắt đầu điểm danh trận này.</p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </>
      )}

      {SHOW_APPLIED_LINEUP_SECTION ? (
      <MatchLineupPickerModal
        isOpen={isLineupPickerOpen}
        isLoading={isLoadingLineups}
        isSubmitting={isApplyingLineup}
        savedLineups={savedLineups}
        initialSelectedIds={appliedLineupIds}
        copy={{
          pitchLabels: lineupCopy.pitchLabels,
          tacticsTab: lineupCopy.tacticsTab,
        }}
        onClose={() => setIsLineupPickerOpen(false)}
        onConfirm={(selectedLineups) => void handleConfirmLineups(selectedLineups)}
        onCreateNew={() => {
          setIsLineupPickerOpen(false);
          navigate(getAppPath("lineup"));
        }}
      />
      ) : null}
    </section>
  );
}
