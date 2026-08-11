import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, Loader2, Shield, Trophy, UserPlus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "./Button";
import { getAppPath } from "./appRouting";
import { useTeamStore } from "./stores/teamStore";
import { getPlayerTeamNotificationFromError, TEAM_NOTIFICATION_MESSAGES } from "./teamNotifications";
import styles from "./TeamPages.module.css";

type TeamJoinPageProps = {
  user: User | null;
  onRequireAuth: () => void;
  onToast: (message: string, tone?: "success" | "error") => void;
};

const isJoinLinkUsable = (expiresAt: string, isActive: boolean, maxUses: number | null, usedCount: number) => {
  if (!isActive) return false;
  if (new Date(expiresAt).getTime() <= Date.now()) return false;
  if (maxUses !== null && usedCount >= maxUses) return false;
  return true;
};

export function TeamJoinPage({ user, onRequireAuth, onToast }: TeamJoinPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const { currentJoinLinkPreview, fetchTeamJoinLink, joinTeamByLink, fetchTeamsByUser } = useTeamStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void fetchTeamJoinLink(token)
      .then((preview) => {
        if (!preview) onToast(TEAM_NOTIFICATION_MESSAGES.joinLinkInvalid, "error");
      })
      .catch((error) => {
        onToast(getPlayerTeamNotificationFromError(error, "joinLinkInvalid"), "error");
      })
      .finally(() => setIsLoading(false));
  }, [fetchTeamJoinLink, onToast, token]);

  const handleJoinTeam = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }

    setIsJoining(true);
    try {
      const member = await joinTeamByLink(token);
      await fetchTeamsByUser(user.id);
      onToast(TEAM_NOTIFICATION_MESSAGES.joinTeamSuccess);
      navigate(getAppPath("team-detail", undefined, { teamId: member.team_id }), { replace: true });
    } catch (error) {
      onToast(getPlayerTeamNotificationFromError(error, "joinTeamFailed"), "error");
    } finally {
      setIsJoining(false);
    }
  };

  const isUsable = currentJoinLinkPreview
    ? isJoinLinkUsable(
        currentJoinLinkPreview.expires_at,
        currentJoinLinkPreview.is_active,
        currentJoinLinkPreview.max_uses,
        currentJoinLinkPreview.used_count,
      )
    : false;

  return (
    <section className={styles.page}>
      <button type="button" className={styles.backButton} onClick={() => navigate("/")}>
        <ArrowLeft size={18} />
        Trang chủ
      </button>

      <div className={styles.authCard}>
        {isLoading ? (
          <>
            <Loader2 className={styles.spinner} size={42} />
            <h1 className={styles.authTitle}>Đang kiểm tra lời mời</h1>
            <p className={styles.authText}>Hệ thống đang xác thực link tham gia đội bóng.</p>
          </>
        ) : !token || !currentJoinLinkPreview ? (
          <>
            <Shield className={styles.authIcon} size={42} />
            <h1 className={styles.authTitle}>Link không hợp lệ</h1>
            <p className={styles.authText}>Link tham gia đội bóng không tồn tại hoặc đã bị thu hồi.</p>
            <Button variant="primary" className={styles.authCardButton} onClick={() => navigate(getAppPath("teams"))}>
              Đội bóng của tôi
            </Button>
          </>
        ) : !isUsable ? (
          <>
            <Shield className={styles.authIcon} size={42} />
            <h1 className={styles.authTitle}>Link không còn hiệu lực</h1>
            <p className={styles.authText}>Link này đã hết hạn, bị tắt hoặc đã đạt giới hạn lượt sử dụng.</p>
            <Button variant="primary" className={styles.authCardButton} onClick={() => navigate(getAppPath("teams"))}>
              Đội bóng của tôi
            </Button>
          </>
        ) : (
          <>
            <div className={styles.logoBoxLarge}>
              {currentJoinLinkPreview.logo_url ? (
                <img src={currentJoinLinkPreview.logo_url} alt="" />
              ) : (
                <Trophy size={34} />
              )}
            </div>
            <p className={styles.eyebrow}>Team invite</p>
            <h1 className={styles.authTitle}>Tham gia {currentJoinLinkPreview.team_name}</h1>
            <p className={styles.authText}>
              Xác nhận tham gia đội bóng để xem thành viên, lịch trình và các chiến thuật của team.
            </p>
            <Button
              variant="primary"
              className={styles.authCardButton}
              loading={isJoining}
              leadingIcon={<UserPlus size={18} aria-hidden="true" />}
              onClick={() => void handleJoinTeam()}
            >
              {user ? "Tham gia đội bóng" : "Đăng nhập để tham gia"}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
