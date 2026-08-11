import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { Plus, Shield, Trash2, Trophy, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./Button";
import { getAppPath } from "./appRouting";
import { useTeamStore } from "./stores/teamStore";
import type { Team } from "./types/team";
import styles from "./TeamPages.module.css";

type TeamDashboardProps = {
  user: User | null;
  onRequireAuth: () => void;
  onToast: (message: string, tone?: "success" | "error") => void;
};

function TeamCardSkeleton() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonIcon} />
      <div className={styles.skeletonLine} />
      <div className={styles.skeletonShortLine} />
    </div>
  );
}

export function TeamDashboard({ user, onRequireAuth, onToast }: TeamDashboardProps) {
  const navigate = useNavigate();
  const { teams, isLoadingTeams, fetchTeamsByUser, createTeam, deleteTeam } = useTeamStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void fetchTeamsByUser(user.id).catch((error) => {
      onToast(error instanceof Error ? error.message : "Không thể tải danh sách đội bóng.", "error");
    });
  }, [fetchTeamsByUser, onToast, user]);

  const handleCreateTeam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }

    setIsSubmitting(true);
    try {
      const team = await createTeam(teamName, user.id);
      setTeamName("");
      setIsCreateOpen(false);
      onToast("Đã tạo đội bóng.");
      navigate(getAppPath("team-detail", undefined, { teamId: team.id }));
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Không thể tạo đội bóng.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!teamToDelete) return;

    setDeletingTeamId(teamToDelete.id);
    try {
      await deleteTeam(teamToDelete.id);
      onToast("Đã xoá đội bóng.");
      setTeamToDelete(null);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Không thể xoá đội bóng.", "error");
    } finally {
      setDeletingTeamId(null);
    }
  };

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.dashboardTitle}>Đội bóng của tôi</h1>
        <Button
          variant="primary"
          leadingIcon={<Plus size={18} aria-hidden="true" />}
          onClick={() => (user ? setIsCreateOpen(true) : onRequireAuth())}
        >
          Tạo đội mới
        </Button>
      </div>

      <div className={styles.content}>
        {!user ? (
          <div className={styles.authCard}>
            <Shield className={styles.authIcon} size={42} />
            <h2 className={styles.authTitle}>Đăng nhập để quản lý đội bóng</h2>
            <p className={styles.authText}>
              Tính năng đội bóng dùng Supabase RLS, vì vậy bạn cần đăng nhập để xem đội, thêm thành viên và quản lý lịch trình.
            </p>
            <Button variant="primary" className={styles.authCardButton} onClick={onRequireAuth}>
              Đăng nhập
            </Button>
          </div>
        ) : isLoadingTeams ? (
          <div className={styles.grid}>
            <TeamCardSkeleton />
            <TeamCardSkeleton />
            <TeamCardSkeleton />
          </div>
        ) : teams.length > 0 ? (
          <div className={styles.grid}>
            {teams.map((team) => (
              <article
                key={team.id}
                className={styles.card}
              >
                <button
                  type="button"
                  className={styles.cardLink}
                  onClick={() => navigate(getAppPath("team-detail", undefined, { teamId: team.id }))}
                  aria-label={`Xem chi tiết ${team.name}`}
                >
                  <div className={styles.cardTop}>
                    <div className={styles.logoBox}>
                      {team.logo_url ? <img src={team.logo_url} alt="" /> : <Trophy size={28} />}
                    </div>
                    <span className={styles.badge}>Đội bóng</span>
                  </div>
                  <h2 className={styles.cardTitle}>{team.name}</h2>
                  <div className={styles.metaRow}>
                    <span className={styles.metaItem}>
                      <Users size={15} />
                      Thành viên
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  className={styles.deleteCardButton}
                  onClick={() => setTeamToDelete(team)}
                  aria-label={`Xoá ${team.name}`}
                  title="Xoá đội bóng"
                >
                  <Trash2 size={18} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Trophy className={styles.emptyIcon} size={48} />
            <h2 className={styles.emptyTitle}>Chưa có đội bóng nào</h2>
            <p className={styles.emptyText}>
              Tạo đội đầu tiên để bắt đầu thêm cầu thủ, lên lịch trận đấu và gắn chiến thuật với đội.
            </p>
          </div>
        )}
      </div>

      {isCreateOpen ? (
        <div className={styles.modalOverlay}>
          <form className={styles.modal} onSubmit={handleCreateTeam}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Tạo đội mới</h2>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setIsCreateOpen(false)}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <label className={styles.label}>
                <span className={styles.labelText}>Tên đội bóng</span>
                <input
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  className={styles.input}
                  placeholder="VD: FC Sân Cỏ Quận 7"
                  autoFocus
                />
              </label>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                className={styles.modalSubmitButton}
                loading={isSubmitting}
                disabled={!teamName.trim()}
                leadingIcon={<Plus size={18} aria-hidden="true" />}
              >
                Tạo đội
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {teamToDelete ? (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="delete-team-title">
            <div className={styles.modalHeader}>
              <h2 id="delete-team-title" className={styles.modalTitle}>Xoá đội bóng</h2>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setTeamToDelete(null)}
                aria-label="Đóng"
                disabled={deletingTeamId === teamToDelete.id}
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.confirmText}>
                Bạn có chắc muốn xoá <strong>{teamToDelete.name}</strong>? Thành viên, lịch trình và dữ liệu liên quan của đội sẽ bị xoá theo.
              </p>
              <div className={styles.modalActions}>
                <Button
                  type="button"
                  variant="secondary"
                  fullWidthMobile
                  onClick={() => setTeamToDelete(null)}
                  disabled={deletingTeamId === teamToDelete.id}
                >
                  Huỷ
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  fullWidthMobile
                  loading={deletingTeamId === teamToDelete.id}
                  leadingIcon={<Trash2 size={18} aria-hidden="true" />}
                  onClick={handleDeleteTeam}
                >
                  Xoá đội
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
