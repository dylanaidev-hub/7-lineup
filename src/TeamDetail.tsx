import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Loader2,
  Plus,
  Shield,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useTeamStore } from "./stores/teamStore";
import { useDebounce } from "./hooks/useDebounce";
import type { SearchableProfile, TeamDetails, TeamEvent, TeamEventType, TeamMember, TeamMemberRole } from "./types/team";
import styles from "./TeamPages.module.css";

type TeamDetailProps = {
  user: User | null;
  onRequireAuth: () => void;
  onToast: (message: string, tone?: "success" | "error") => void;
};

type DetailTab = "members" | "events";

const formatEventDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
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
  const { addTeamMember, deleteTeamMember, searchProfiles } = useTeamStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const comboboxRef = useRef<HTMLDivElement>(null);
  const [profileSearchQuery, setProfileSearchQuery] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<SearchableProfile | null>(null);
  const [profileResults, setProfileResults] = useState<SearchableProfile[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchingProfiles, setIsSearchingProfiles] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const debouncedProfileQuery = useDebounce(profileSearchQuery, 350);
  const existingUserIds = useMemo(
    () => new Set(members.flatMap((member) => member.user_id ? [member.user_id] : [])),
    [members],
  );
  const availableProfileResults = useMemo(
    () => profileResults.filter((profile) => !existingUserIds.has(profile.user_id)),
    [existingUserIds, profileResults],
  );
  const isSelectedUserInTeam = Boolean(selectedProfile && existingUserIds.has(selectedProfile.user_id));

  const getProfileDisplayName = (profile: SearchableProfile) =>
    profile.name?.trim() || profile.email?.trim() || "Người dùng chưa đặt tên";

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
    if (!selectedProfile) return;
    if (isSelectedUserInTeam) {
      onToast("User này đã có trong đội.", "error");
      return;
    }

    setIsAddingMember(true);
    try {
      await addTeamMember(teamId, getProfileDisplayName(selectedProfile), "player", selectedProfile.user_id);
      setProfileSearchQuery("");
      setSelectedProfile(null);
      setProfileResults([]);
      onToast("Đã thêm thành viên.");
      window.requestAnimationFrame(() => inputRef.current?.focus());
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Không thể thêm thành viên.", "error");
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

  const handleDeleteMember = async (member: TeamMember) => {
    setDeletingMemberId(member.id);
    try {
      await deleteTeamMember(member.id);
      onToast("Đã xoá thành viên.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Không thể xoá thành viên.", "error");
    } finally {
      setDeletingMemberId(null);
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
              <button type="button" className={styles.primaryButton} onClick={() => setIsAddMemberOpen(true)}>
                <Plus size={18} />
                Thêm cầu thủ
              </button>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <DetailSkeleton />
        ) : members.length ? (
          <div className={styles.memberList}>
            {members.map((member) => (
              <article key={member.id} className={styles.memberRow}>
                <div className={styles.memberIdentity}>
                  <div className={styles.memberAvatar}>
                    <UserRound size={20} />
                  </div>
                  <div className={styles.memberText}>
                    <h3>{member.player_name}</h3>
                    <p>{member.user_id ? `ID: ${member.user_id}` : "Chưa liên kết tài khoản"}</p>
                  </div>
                </div>
                <div className={styles.memberActions}>
                  <RoleBadge role={member.role} />
                  {isAdmin ? (
                    <button
                      type="button"
                      className={styles.rowDeleteButton}
                      onClick={() => handleDeleteMember(member)}
                      disabled={deletingMemberId === member.id}
                      aria-label={`Xoá ${member.player_name}`}
                      title="Xoá thành viên"
                    >
                      {deletingMemberId === member.id ? <Loader2 className={styles.spinner} size={16} /> : <Trash2 size={16} />}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
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
    </div>
  );
}

type EventsViewProps = {
  teamId: string;
  events: TeamEvent[];
  isAdmin: boolean;
  isLoading: boolean;
  onToast: TeamDetailProps["onToast"];
};

function EventsView({ teamId, events, isAdmin, isLoading, onToast }: EventsViewProps) {
  const navigate = useNavigate();
  const { createTeamEvent } = useTeamStore();
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState<TeamEventType>("match");
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const upcomingEvents = useMemo(
    () => events.filter((event) => new Date(event.event_date).getTime() >= Date.now()),
    [events],
  );

  const handleCreateEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreatingEvent(true);
    try {
      await createTeamEvent(teamId, eventTitle, eventDate, eventType);
      setEventTitle("");
      setEventDate("");
      setEventType("match");
      setIsEventModalOpen(false);
      onToast("Đã tạo lịch trình.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Không thể tạo lịch trình.", "error");
    } finally {
      setIsCreatingEvent(false);
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.panelEyebrow}>Schedule</p>
          <h2 className={styles.panelTitle}>Lịch trình</h2>
        </div>
        {isAdmin ? (
          <button type="button" className={styles.primaryButton} onClick={() => setIsEventModalOpen(true)}>
            <Plus size={18} />
            Tạo lịch trình mới
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <DetailSkeleton />
      ) : upcomingEvents.length ? (
        <div className={styles.eventGrid}>
          {upcomingEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              className={styles.eventCard}
              onClick={() => navigate(`/app/events/${event.id}`)}
            >
              <span className={event.event_type === "match" ? styles.matchBadge : styles.trainingBadge}>
                {event.event_type === "match" ? "Match" : "Training"}
              </span>
              <h3>{event.title}</h3>
              <p>
                <Clock size={16} />
                {formatEventDate(event.event_date)}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.emptyInline}>
          <CalendarDays size={38} />
          <h3>Chưa có lịch trình sắp tới</h3>
          <p>Khi admin tạo trận đấu hoặc buổi tập, lịch trình sẽ hiển thị tại đây.</p>
        </div>
      )}

      {isEventModalOpen ? (
        <div className={styles.modalOverlay}>
          <form className={styles.modal} onSubmit={handleCreateEvent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Tạo lịch trình</h2>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setIsEventModalOpen(false)}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <label className={styles.label}>
                <span className={styles.labelText}>Tiêu đề</span>
                <input
                  value={eventTitle}
                  onChange={(inputEvent) => setEventTitle(inputEvent.target.value)}
                  className={styles.input}
                  placeholder="VD: Trận giao hữu vs FC Bạn"
                  autoFocus
                />
              </label>
              <label className={styles.label}>
                <span className={styles.labelText}>Ngày giờ</span>
                <input
                  type="datetime-local"
                  value={eventDate}
                  onChange={(inputEvent) => setEventDate(inputEvent.target.value)}
                  className={styles.input}
                />
              </label>
              <label className={styles.label}>
                <span className={styles.labelText}>Loại sự kiện</span>
                <select
                  value={eventType}
                  onChange={(inputEvent) => setEventType(inputEvent.target.value as TeamEventType)}
                  className={styles.input}
                >
                  <option value="match">Trận đấu</option>
                  <option value="training">Buổi tập</option>
                </select>
              </label>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={isCreatingEvent || !eventTitle.trim() || !eventDate}
              >
                {isCreatingEvent ? <Loader2 className={styles.spinner} size={18} /> : <Plus size={18} />}
                Tạo lịch trình
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

export function TeamDetail({ user, onRequireAuth, onToast }: TeamDetailProps) {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const {
    currentTeam,
    events,
    isLoadingTeamDetails,
    isLoadingEvents,
    fetchTeamDetails,
    fetchEventsByTeam,
    clearCurrentTeam,
  } = useTeamStore();
  const [activeTab, setActiveTab] = useState<DetailTab>("members");

  useEffect(() => {
    if (!user || !teamId) return;
    clearCurrentTeam();
    void Promise.all([
      fetchTeamDetails(teamId),
      fetchEventsByTeam(teamId),
    ]).catch((error) => {
      onToast(error instanceof Error ? error.message : "Không thể tải chi tiết đội bóng.", "error");
    });
  }, [clearCurrentTeam, fetchEventsByTeam, fetchTeamDetails, onToast, teamId, user]);

  const team = currentTeam as TeamDetails | null;
  const currentUserMember = useMemo(
    () => team?.members.find((member) => member.user_id === user?.id) ?? null,
    [team, user?.id],
  );
  const isAdmin = currentUserMember?.role === "admin";

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
          <p className={styles.authText}>Bạn cần đăng nhập để xem thành viên, lịch trình và quyền quản trị đội.</p>
          <button type="button" className={styles.primaryButton} onClick={onRequireAuth}>
            Đăng nhập
          </button>
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
                <p className={styles.description}>{team.members.length} thành viên · {events.length} lịch trình</p>
              </div>
            </div>
            <span className={styles.rolePill}>
              <Shield size={15} />
              {isAdmin ? "Admin" : "Thành viên"}
            </span>
          </>
        ) : (
          <div className={styles.emptyInline}>
            <Shield size={36} />
            <h2>Không tìm thấy đội bóng</h2>
            <p>Đội bóng không tồn tại hoặc bạn chưa có quyền xem.</p>
          </div>
        )}
      </header>

      <nav className={styles.tabs} aria-label="Team detail tabs">
        <button
          type="button"
          className={activeTab === "members" ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab("members")}
        >
          <Users size={18} />
          Thành viên
        </button>
        <button
          type="button"
          className={activeTab === "events" ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab("events")}
        >
          <CalendarDays size={18} />
          Lịch trình
        </button>
      </nav>

      <div className={styles.detailContent}>
        {activeTab === "members" ? (
          <MembersView
            teamId={teamId ?? ""}
            members={team?.members ?? []}
            isAdmin={isAdmin}
            isLoading={isLoadingTeamDetails}
            currentUserId={user.id}
            onRequireAuth={onRequireAuth}
            onToast={onToast}
          />
        ) : (
          <EventsView
            teamId={teamId ?? ""}
            events={events}
            isAdmin={isAdmin}
            isLoading={isLoadingEvents}
            onToast={onToast}
          />
        )}
      </div>
    </section>
  );
}

export function EventDetailPlaceholder() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  return (
    <section className={styles.page}>
      <button type="button" className={styles.backButton} onClick={() => navigate("/app/teams")}>
        <ArrowLeft size={18} />
        Đội bóng
      </button>
      <div className={styles.authCard}>
        <CalendarDays className={styles.authIcon} size={42} />
        <h1 className={styles.authTitle}>Chi tiết lịch trình</h1>
        <p className={styles.authText}>
          Màn hình điểm danh cho lịch trình này sẽ được xây dựng ở bước tiếp theo.
          {eventId ? ` Event ID: ${eventId}` : ""}
        </p>
      </div>
    </section>
  );
}
