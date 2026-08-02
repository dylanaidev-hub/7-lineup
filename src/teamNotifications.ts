export const TEAM_NOTIFICATION_MESSAGES = {
  memberAdded: "Đã thêm thành viên vào đội thành công.",
  inviteSent: "Đã gửi lời mời tham gia đội.",
  invalidIdentity: "Email hoặc username không hợp lệ.",
  alreadyMember: "Thành viên này đã có trong đội.",
  pendingInvite: "Thành viên này đã có lời mời đang chờ xác nhận.",
  noPermission: "Bạn không có quyền thêm thành viên vào đội.",
  memberLimitReached: "Đội đã đạt giới hạn số lượng thành viên.",
  invalidRole: "Vai trò được chọn không hợp lệ.",
  inviteAccepted: "Cầu thủ đã tham gia đội.",
  inviteDeclined: "Cầu thủ đã từ chối lời mời tham gia đội.",
  inviteExpired: "Lời mời đã hết hạn.",
  inviteSendFailed: "Không thể gửi lời mời. Vui lòng thử lại.",
  memberAddFailed: "Không thể thêm thành viên. Vui lòng thử lại.",
  playerInviteReceived: "Bạn được mời tham gia đội [Team name].",
  playerDirectlyAdded: "Bạn đã được thêm vào đội [Team name].",
  playerRemovedFromTeam: "Bạn đã bị xóa khỏi đội.",
  playerLeaveRequestSent: "Đã gửi yêu cầu rời đội.",
  playerLeaveRequestPending: "Bạn đã có yêu cầu rời đội đang chờ xác nhận.",
  playerLeaveRequestDeclined: "Yêu cầu rời đội của bạn đã bị từ chối.",
  playerLeaveRequestFailed: "Không thể gửi yêu cầu rời đội. Vui lòng thử lại.",
  leaveRequestReceived: "Cầu thủ yêu cầu rời đội [Team name].",
  leaveRequestApproved: "Đã xác nhận yêu cầu rời đội.",
  leaveRequestDeclined: "Đã từ chối yêu cầu rời đội.",
  leaveRequestInvalid: "Yêu cầu rời đội không còn hợp lệ.",
  playerAcceptInviteSuccess: "Bạn đã tham gia đội thành công.",
  playerDeclineInviteSuccess: "Bạn đã từ chối lời mời tham gia đội.",
  playerInviteExpired: "Lời mời tham gia đội đã hết hạn.",
  playerInviteInvalid: "Lời mời này không còn hợp lệ.",
  playerAlreadyMember: "Bạn đã là thành viên của đội này.",
  playerTeamAccessDenied: "Bạn chưa có quyền truy cập đội này.",
  playerAcceptInviteFailed: "Không thể chấp nhận lời mời. Vui lòng thử lại.",
  playerDeclineInviteFailed: "Không thể từ chối lời mời. Vui lòng thử lại.",
  joinLinkCreated: "Đã tạo link tham gia đội.",
  joinLinkCopied: "Đã copy link tham gia đội.",
  joinLinkCreateFailed: "Không thể tạo link tham gia đội. Vui lòng thử lại.",
  joinLinkInvalid: "Link tham gia đội không còn hợp lệ.",
  joinLinkExpired: "Link tham gia đội đã hết hạn.",
  joinLinkLimitReached: "Link tham gia đội đã đạt giới hạn lượt sử dụng.",
  joinTeamSuccess: "Bạn đã tham gia đội thành công.",
  joinTeamFailed: "Không thể tham gia đội. Vui lòng thử lại.",
  matchAdded: "Đã thêm lịch thi đấu.",
  matchRecurringAdded: "Đã thêm {count} lịch định kỳ.",
  matchUpdated: "Đã cập nhật lịch thi đấu.",
  matchDeleted: "Đã xoá lịch thi đấu.",
  matchAllDeleted: "Đã xoá {count} lịch thi đấu.",
  matchSelectedDeleted: "Đã xoá {count} lịch thi đấu.",
  matchAddFailed: "Không thể thêm lịch thi đấu. Vui lòng thử lại.",
  matchUpdateFailed: "Không thể cập nhật lịch thi đấu. Vui lòng thử lại.",
  matchDeleteFailed: "Không thể xoá lịch thi đấu. Vui lòng thử lại.",
  matchDeleteAllFailed: "Không thể xoá tất cả lịch. Vui lòng thử lại.",
  matchDeleteSelectedFailed: "Không thể xoá các lịch đã chọn. Vui lòng thử lại.",
  matchInvalidTime: "Thời gian không hợp lệ.",
  matchTimeDuplicate: "Đã có sự kiện vào thời gian này. Vui lòng chọn giờ khác.",
  matchTimeOverlap: "Thời gian này trùng với sự kiện khác. Vui lòng chọn khung giờ khác.",
  matchPastTimeWarning: "Thời gian đã qua — sự kiện sẽ hiển thị trong lịch quá khứ.",
  matchNotFound: "Không tìm thấy trận đấu này.",
  matchAttendanceUpdated: "Đã cập nhật điểm danh.",
  matchAttendanceUpdateFailed: "Không thể cập nhật điểm danh. Vui lòng thử lại.",
  matchAttendanceNotAllowed: "Bạn không có quyền cập nhật điểm danh cho thành viên này.",
  matchLineupApplied: "Đã áp dụng đội hình cho trận này.",
  matchLineupsUpdated: "Đã cập nhật danh sách đội hình áp dụng.",
  matchLineupCleared: "Đã bỏ đội hình áp dụng.",
  matchLineupApplyFailed: "Không thể áp dụng đội hình. Vui lòng thử lại.",
} as const;

export type TeamNotificationKey = keyof typeof TEAM_NOTIFICATION_MESSAGES;

export function formatTeamNotification(key: TeamNotificationKey, teamName?: string): string {
  const normalizedTeamName = teamName?.trim() || "đội";
  return TEAM_NOTIFICATION_MESSAGES[key].replace("[Team name]", normalizedTeamName);
}

function isTechnicalSetupError(normalizedMessage: string) {
  return /migration|schema|supabase\/migrations|sql editor|rpc is missing/.test(normalizedMessage);
}

export function getMatchNotificationFromError(error: unknown, fallback: TeamNotificationKey): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalizedMessage = message.toLowerCase();

  if (isTechnicalSetupError(normalizedMessage)) {
    return message;
  }
  if (/team_matches_team_starts_at_unique|duplicate key value.*team_matches|match_time_duplicate/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.matchTimeDuplicate;
  }
  if (/overlap|trùng khung giờ|trùng giờ/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.matchTimeOverlap;
  }
  if (/match_not_found|failed to get team match/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.matchNotFound;
  }
  if (/team_match_attendance_not_allowed|attendance_not_allowed/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.matchAttendanceNotAllowed;
  }
  if (/failed to update match attendance|match attendance schema|match attendance status enum/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.matchAttendanceUpdateFailed;
  }
  if (/failed to update team match/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.matchUpdateFailed;
  }
  if (/failed to apply match lineup/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.matchLineupApplyFailed;
  }
  if (/failed to apply match lineups/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.matchLineupApplyFailed;
  }
  if (/failed to create team match/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.matchAddFailed;
  }
  if (/failed to delete team match/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.matchDeleteFailed;
  }
  if (/failed to get match attendance/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.matchAttendanceUpdateFailed;
  }

  return TEAM_NOTIFICATION_MESSAGES[fallback];
}

export function getTeamNotificationFromError(error: unknown, fallback: TeamNotificationKey): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalizedMessage = message.toLowerCase();

  if (/failed to create team join link:/.test(normalizedMessage)) {
    return message;
  }
  if (isTechnicalSetupError(normalizedMessage)) {
    return message;
  }
  if (/already|duplicate|unique|đã có trong team|đã có trong đội/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.alreadyMember;
  }
  if (/pending|waiting|chờ xác nhận/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.pendingInvite;
  }
  if (/permission|policy|rls|not authorized|not admin|không có quyền|chưa có quyền/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.noPermission;
  }
  if (/team join link|join link|link tham gia|create team join link/.test(normalizedMessage)) {
    if (/limit|max|quota|giới hạn/.test(normalizedMessage)) {
      return TEAM_NOTIFICATION_MESSAGES.joinLinkLimitReached;
    }
    return TEAM_NOTIFICATION_MESSAGES.joinLinkCreateFailed;
  }
  if (/limit|max|quota|giới hạn/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.memberLimitReached;
  }
  if (/invalid.*role|role.*invalid|vai trò/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.invalidRole;
  }
  if (/invalid.*email|invalid.*username|email.*username|không hợp lệ/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.invalidIdentity;
  }
  if (/expired|hết hạn/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.inviteExpired;
  }
  if (/invite|lời mời/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.inviteSendFailed;
  }

  return TEAM_NOTIFICATION_MESSAGES[fallback];
}

export function getPlayerTeamNotificationFromError(error: unknown, fallback: TeamNotificationKey): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalizedMessage = message.toLowerCase();

  if (isTechnicalSetupError(normalizedMessage)) {
    return message;
  }
  if (/already|duplicate|unique|đã là thành viên|đã có trong team|đã có trong đội/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.playerAlreadyMember;
  }
  if (/permission|policy|rls|not authorized|access denied|không có quyền|chưa có quyền/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.playerTeamAccessDenied;
  }
  if (/expired|hết hạn/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.playerInviteExpired;
  }
  if (/limit|max|quota|giới hạn/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.joinLinkLimitReached;
  }
  if (/revoked|deleted|removed|invalid invite|not valid|không còn hợp lệ/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.playerInviteInvalid;
  }
  if (/decline|reject|từ chối/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.playerDeclineInviteFailed;
  }
  if (/accept|chấp nhận/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.playerAcceptInviteFailed;
  }

  return TEAM_NOTIFICATION_MESSAGES[fallback];
}
