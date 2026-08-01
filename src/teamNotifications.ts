export const TEAM_NOTIFICATION_MESSAGES = {
  memberAdded: "Đã thêm thành viên vào team thành công.",
  inviteSent: "Đã gửi lời mời tham gia team.",
  invalidIdentity: "Email hoặc username không hợp lệ.",
  alreadyMember: "Thành viên này đã có trong team.",
  pendingInvite: "Thành viên này đã có lời mời đang chờ xác nhận.",
  noPermission: "Bạn không có quyền thêm thành viên vào team.",
  memberLimitReached: "Team đã đạt giới hạn số lượng thành viên.",
  invalidRole: "Vai trò được chọn không hợp lệ.",
  inviteAccepted: "Player đã tham gia team.",
  inviteDeclined: "Player đã từ chối lời mời tham gia team.",
  inviteExpired: "Lời mời đã hết hạn.",
  inviteSendFailed: "Không thể gửi lời mời. Vui lòng thử lại.",
  memberAddFailed: "Không thể thêm thành viên. Vui lòng thử lại.",
  playerInviteReceived: "Bạn được mời tham gia team [Team name].",
  playerDirectlyAdded: "Bạn đã được thêm vào team [Team name].",
  playerRemovedFromTeam: "Bạn đã bị xóa khỏi team.",
  playerLeaveRequestSent: "Đã gửi yêu cầu rời team.",
  playerLeaveRequestPending: "Bạn đã có yêu cầu rời team đang chờ xác nhận.",
  playerLeaveRequestDeclined: "Yêu cầu rời team của bạn đã bị từ chối.",
  playerLeaveRequestFailed: "Không thể gửi yêu cầu rời team. Vui lòng thử lại.",
  leaveRequestReceived: "Player yêu cầu rời team [Team name].",
  leaveRequestApproved: "Đã xác nhận yêu cầu rời team.",
  leaveRequestDeclined: "Đã từ chối yêu cầu rời team.",
  leaveRequestInvalid: "Yêu cầu rời team không còn hợp lệ.",
  playerAcceptInviteSuccess: "Bạn đã tham gia team thành công.",
  playerDeclineInviteSuccess: "Bạn đã từ chối lời mời tham gia team.",
  playerInviteExpired: "Lời mời tham gia team đã hết hạn.",
  playerInviteInvalid: "Lời mời này không còn hợp lệ.",
  playerAlreadyMember: "Bạn đã là thành viên của team này.",
  playerTeamAccessDenied: "Bạn chưa có quyền truy cập team này.",
  playerAcceptInviteFailed: "Không thể chấp nhận lời mời. Vui lòng thử lại.",
  playerDeclineInviteFailed: "Không thể từ chối lời mời. Vui lòng thử lại.",
} as const;

export type TeamNotificationKey = keyof typeof TEAM_NOTIFICATION_MESSAGES;

export function formatTeamNotification(key: TeamNotificationKey, teamName?: string): string {
  const normalizedTeamName = teamName?.trim() || "team";
  return TEAM_NOTIFICATION_MESSAGES[key].replace("[Team name]", normalizedTeamName);
}

export function getTeamNotificationFromError(error: unknown, fallback: TeamNotificationKey): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalizedMessage = message.toLowerCase();

  if (/migration|schema|supabase\/migrations|sql editor|rpc is missing/.test(normalizedMessage)) {
    return message;
  }
  if (/already|duplicate|unique|đã có trong team|đã có trong đội/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.alreadyMember;
  }
  if (/pending|waiting|chờ xác nhận/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.pendingInvite;
  }
  if (/permission|policy|rls|not authorized|not admin|không có quyền/.test(normalizedMessage)) {
    return TEAM_NOTIFICATION_MESSAGES.noPermission;
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

  if (/migration|schema|supabase\/migrations|sql editor|rpc is missing/.test(normalizedMessage)) {
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
