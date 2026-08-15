import type { PitchSize } from "./appRouting";
import type { Language } from "./languagePreference";

export type AppCopy = {
  lineupTab: string;
  tacticsTab: string;
  lockerTab: string;
  squadEditor: string;
  subs: string;
  starterPlaceholder: string;
  substitutePlaceholder: string;
  extraPlayerPlaceholder: string;
  lineupSuffix: string;
  custom: string;
  share: string;
  shareAll: string;
  copied: string;
  copiedShortLink: string;
  download: string;
  draw: string;
  clear: string;
  reset: string;
  undo: string;
  redo: string;
  clearLines: string;
  player: string;
  players: string;
  opponent: string;
  tacticalTitle: string;
  tacticListTitle: string;
  tacticUnit: string;
  framesUnit: string;
  play: string;
  pause: string;
  stop: string;
  loop: string;
  frame: string;
  addFrame: string;
  addPlayer: string;
  addSubstitute: string;
  clearAll: string;
  tacticalHelp: string;
  save: string;
  saved: string;
  deleted: string;
  downloaded: string;
  newTactic: string;
  tacticName: string;
  delete: string;
  close: string;
  switchLanguage: string;
  chooseAppMode: string;
  choosePitchSize: string;
  tacticalTimeline: string;
  savedTactics: string;
  dragBall: string;
  dragPlayer: string;
  dragOpponent: string;
  customPlayerTray: string;
  opponentTray: string;
  authTitle: string;
  profileTitle: string;
  email: string;
  password: string;
  username: string;
  signIn: string;
  signUp: string;
  forgotPassword: string;
  backToSignIn: string;
  resetPassword: string;
  signOut: string;
  googleSignIn: string;
  profileMenu: string;
  lockerMenu: string;
  lockerTitle: string;
  saveCurrentLineup: string;
  saveTacticsBoard: string;
  savedLineups: string;
  lineupName: string;
  avatarUrl: string;
  updateProfile: string;
  profileSubtitle: string;
  fullName: string;
  bio: string;
  favoriteTeam: string;
  favoritePosition: string;
  location: string;
  changeAvatar: string;
  uploadingAvatar: string;
  avatarUploaded: string;
  avatarUploadError: string;
  avatarTooLarge: string;
  profileFieldsHint: string;
  load: string;
  view: string;
  noSavedLineups: string;
  allCategories: string;
  databaseNotReady: string;
  supabaseMissing: string;
  invalidEmail: string;
  passwordTooShort: string;
  emailAlreadyRegistered: string;
  checkEmailToConfirm: string;
  signedInSuccessfully: string;
  resetEmailSent: string;
  setNewPasswordTitle: string;
  setNewPasswordHint: string;
  newPassword: string;
  confirmPassword: string;
  updatePassword: string;
  passwordMismatch: string;
  passwordUpdated: string;
  recoveryLinkExpired: string;
  requestNewLink: string;
  resetCooldownMessage: string;
  invalidCredentials: string;
  emailNotConfirmed: string;
  passwordSameAsOld: string;
  emailRateLimited: string;
  unexpectedError: string;
  invalidLineupData: string;
  googleAccountNoPassword: string;
  emailUsesGoogle: string;
  pitchLabels: Record<PitchSize, string>;
};

export const copyByLanguage = {
  vi: {
    lineupTab: "Đội hình",
    tacticsTab: "Bảng chiến thuật động",
    lockerTab: "Phòng thay đồ",
    squadEditor: "Chỉnh đội hình",
    subs: "dự bị",
    starterPlaceholder: "Đá chính",
    substitutePlaceholder: "Dự bị",
    extraPlayerPlaceholder: "Cầu thủ",
    lineupSuffix: "đội hình",
    custom: "Cá nhân hóa",
    share: "Chia sẻ",
    shareAll: "Chia sẻ tất cả",
    copied: "Đã sao chép",
    copiedShortLink: "Đã sao chép liên kết (hết hạn sau 7 ngày)",
    download: "Tải ảnh",
    draw: "Vẽ",
    clear: "Xoá",
    reset: "Đặt lại",
    undo: "Hoàn tác",
    redo: "Làm lại",
    clearLines: "Xoá nét vẽ",
    player: "Cầu thủ",
    players: "Cầu thủ",
    opponent: "Đối thủ",
    tacticalTitle: "Bảng chiến thuật động",
    tacticListTitle: "Danh sách tactic",
    tacticUnit: "tactic",
    framesUnit: "bước",
    play: "Chạy",
    pause: "Tạm dừng",
    stop: "Dừng",
    loop: "Lặp",
    frame: "Bước",
    addFrame: "Thêm bước",
    addPlayer: "Thêm cầu thủ",
    addSubstitute: "Thêm dự bị",
    clearAll: "Xoá tất cả",
    tacticalHelp: "Chọn bước, kéo cầu thủ hoặc bóng đến vị trí mới, sau đó thêm bước tiếp theo và bấm Chạy để xem bài phối hợp.",
    save: "Lưu",
    saved: "Đã lưu",
    deleted: "Đã xoá",
    downloaded: "Đã tải ảnh",
    newTactic: "Tạo mới",
    tacticName: "Chiến thuật",
    delete: "Xoá",
    close: "Đóng",
    switchLanguage: "Đổi ngôn ngữ",
    chooseAppMode: "Chọn chế độ",
    choosePitchSize: "Chọn loại sân",
    tacticalTimeline: "Timeline chiến thuật",
    savedTactics: "Danh sách chiến thuật đã lưu",
    dragBall: "Kéo bóng",
    dragPlayer: "Kéo cầu thủ",
    dragOpponent: "Kéo đối thủ",
    customPlayerTray: "Danh sách cầu thủ tuỳ chỉnh",
    opponentTray: "Danh sách đối thủ",
    authTitle: "Tài khoản",
    profileTitle: "Hồ sơ người dùng",
    email: "Email",
    password: "Mật khẩu",
    username: "Tên người dùng",
    signIn: "Đăng nhập",
    signUp: "Đăng ký",
    forgotPassword: "Quên mật khẩu?",
    backToSignIn: "← Quay lại đăng nhập",
    resetPassword: "Gửi link đặt lại mật khẩu",
    signOut: "Đăng xuất",
    googleSignIn: "Đăng nhập Google",
    profileMenu: "Hồ sơ",
    lockerMenu: "Phòng thay đồ",
    lockerTitle: "Phòng thay đồ",
    saveCurrentLineup: "Lưu đội hình hiện tại",
    saveTacticsBoard: "Lưu bảng chiến thuật",
    savedLineups: "Đội hình đã lưu",
    lineupName: "Tên đội hình",
    avatarUrl: "URL ảnh đại diện",
    updateProfile: "Lưu hồ sơ",
    profileSubtitle: "Cá nhân hoá hồ sơ cầu thủ của bạn",
    fullName: "Họ và tên",
    bio: "Giới thiệu bản thân",
    favoriteTeam: "Đội bóng yêu thích",
    favoritePosition: "Vị trí sở trường",
    location: "Khu vực",
    changeAvatar: "Đổi ảnh đại diện",
    uploadingAvatar: "Đang tải ảnh lên…",
    avatarUploaded: "Đã cập nhật ảnh đại diện",
    avatarUploadError: "Không thể tải ảnh lên. Vui lòng thử lại.",
    avatarTooLarge: "Ảnh quá lớn (tối đa 2MB).",
    profileFieldsHint: "Các thông tin này sẽ được lưu vào hồ sơ của bạn.",
    load: "Tải",
    view: "Xem",
    noSavedLineups: "Chưa có đội hình nào được lưu.",
    allCategories: "Tất cả",
    databaseNotReady: "Chưa tạo bảng Supabase. Hãy chạy file supabase/schema.sql trong SQL Editor trước khi lưu.",
    supabaseMissing: "Chưa cấu hình Supabase. Hãy tạo .env từ .env.example và điền VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.",
    invalidEmail: "Email không hợp lệ.",
    passwordTooShort: "Mật khẩu cần ít nhất 6 ký tự.",
    emailAlreadyRegistered: "Email này đã được đăng ký. Hãy đăng nhập hoặc dùng quên mật khẩu.",
    checkEmailToConfirm: "Đăng ký thành công. Hãy kiểm tra email để xác thực tài khoản trước khi đăng nhập.",
    signedInSuccessfully: "Đăng nhập thành công.",
    resetEmailSent: "Nếu email tồn tại, link đặt lại mật khẩu đã được gửi.",
    setNewPasswordTitle: "Đặt lại mật khẩu",
    setNewPasswordHint: "Nhập mật khẩu mới cho tài khoản của bạn.",
    newPassword: "Mật khẩu mới",
    confirmPassword: "Nhập lại mật khẩu",
    updatePassword: "Cập nhật mật khẩu",
    passwordMismatch: "Mật khẩu nhập lại không khớp.",
    passwordUpdated: "Đổi mật khẩu thành công. Bạn đã được đăng nhập.",
    recoveryLinkExpired: "Link đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng. Hãy yêu cầu link mới.",
    requestNewLink: "Gửi lại link đặt lại mật khẩu",
    resetCooldownMessage: "Vì lý do bảo mật, bạn có thể gửi lại sau {seconds} giây.",
    invalidCredentials: "Email hoặc mật khẩu không đúng.",
    emailNotConfirmed: "Email chưa được xác thực. Hãy kiểm tra hộp thư để xác thực trước khi đăng nhập.",
    passwordSameAsOld: "Mật khẩu mới phải khác mật khẩu cũ.",
    emailRateLimited: "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.",
    unexpectedError: "Đã có lỗi xảy ra. Vui lòng thử lại.",
    invalidLineupData: "Dữ liệu đội hình không hợp lệ.",
    googleAccountNoPassword: 'Tài khoản này đăng nhập bằng Google nên không có mật khẩu. Hãy dùng nút "Đăng nhập Google".',
    emailUsesGoogle: "Email này đã đăng ký bằng Google. Vui lòng đăng nhập bằng Google.",
    pitchLabels: {
      5: "Sân 5",
      7: "Sân 7",
      11: "Sân 11",
      custom: "Cá nhân hóa",
    } satisfies Record<PitchSize, string>,
  },
  en: {
    lineupTab: "Line up",
    tacticsTab: "Tactics board",
    lockerTab: "Locker Room",
    squadEditor: "Squad editor",
    subs: "subs",
    starterPlaceholder: "Starter",
    substitutePlaceholder: "Substitute",
    extraPlayerPlaceholder: "Player",
    lineupSuffix: "line up",
    custom: "Custom",
    share: "Share",
    shareAll: "Share all",
    copied: "Copied",
    copiedShortLink: "Link copied (expires in 7 days)",
    download: "Download",
    draw: "Draw",
    clear: "Clear",
    reset: "Reset",
    undo: "Undo",
    redo: "Redo",
    clearLines: "Clear lines",
    player: "Player",
    players: "Players",
    opponent: "Opponent",
    tacticalTitle: "Tactics board",
    tacticListTitle: "Tactic list",
    tacticUnit: "tactic",
    framesUnit: "frames",
    play: "Play",
    pause: "Pause",
    stop: "Stop",
    loop: "Loop",
    frame: "Frame",
    addFrame: "Add frame",
    addPlayer: "Add player",
    addSubstitute: "Add substitute",
    clearAll: "Clear all",
    tacticalHelp: "Select a frame, drag players or the ball to new positions, then add the next frame and press Play to preview the move.",
    save: "Save",
    saved: "Saved",
    deleted: "Deleted",
    downloaded: "Image downloaded",
    newTactic: "New",
    tacticName: "Tactic",
    delete: "Delete",
    close: "Close",
    switchLanguage: "Switch language",
    chooseAppMode: "Choose app mode",
    choosePitchSize: "Choose pitch size",
    tacticalTimeline: "Tactical timeline",
    savedTactics: "Saved tactics",
    dragBall: "Drag ball",
    dragPlayer: "Drag player",
    dragOpponent: "Drag opponent",
    customPlayerTray: "Custom player tray",
    opponentTray: "Opponent marker tray",
    authTitle: "Account",
    profileTitle: "User Profile",
    email: "Email",
    password: "Password",
    username: "Username",
    signIn: "Sign in",
    signUp: "Sign up",
    forgotPassword: "Forgot password?",
    backToSignIn: "← Back to sign in",
    resetPassword: "Send reset link",
    signOut: "Sign out",
    googleSignIn: "Sign in with Google",
    profileMenu: "Profile",
    lockerMenu: "Locker Room",
    lockerTitle: "Locker Room",
    saveCurrentLineup: "Save current line-up",
    saveTacticsBoard: "Save tactics board",
    savedLineups: "Saved line-ups",
    lineupName: "Line-up name",
    avatarUrl: "Avatar URL",
    updateProfile: "Save profile",
    profileSubtitle: "Personalize your player profile",
    fullName: "Full name",
    bio: "About you",
    favoriteTeam: "Favorite team",
    favoritePosition: "Preferred position",
    location: "Location",
    changeAvatar: "Change avatar",
    uploadingAvatar: "Uploading…",
    avatarUploaded: "Avatar updated",
    avatarUploadError: "Could not upload the image. Please try again.",
    avatarTooLarge: "Image is too large (max 2MB).",
    profileFieldsHint: "This information is saved to your profile.",
    load: "Load",
    view: "View",
    noSavedLineups: "No saved line-ups yet.",
    allCategories: "All",
    databaseNotReady: "Supabase tables are not created yet. Run supabase/schema.sql in SQL Editor before saving.",
    supabaseMissing: "Supabase is not configured. Create .env from .env.example and set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.",
    invalidEmail: "Invalid email address.",
    passwordTooShort: "Password must be at least 6 characters.",
    emailAlreadyRegistered: "This email is already registered. Sign in or use forgot password.",
    checkEmailToConfirm: "Sign-up succeeded. Check your email to confirm your account before signing in.",
    signedInSuccessfully: "Signed in successfully.",
    resetEmailSent: "If the email exists, a password reset link has been sent.",
    setNewPasswordTitle: "Reset your password",
    setNewPasswordHint: "Enter a new password for your account.",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    updatePassword: "Update password",
    passwordMismatch: "The passwords do not match.",
    passwordUpdated: "Password updated. You are now signed in.",
    recoveryLinkExpired: "The reset link has expired or was already used. Please request a new one.",
    requestNewLink: "Send a new reset link",
    resetCooldownMessage: "For security purposes, you can request again in {seconds} seconds.",
    invalidCredentials: "Invalid email or password.",
    emailNotConfirmed: "Email not confirmed. Please check your inbox to confirm before signing in.",
    passwordSameAsOld: "The new password must be different from the old one.",
    emailRateLimited: "Too many attempts. Please try again in a few minutes.",
    unexpectedError: "Something went wrong. Please try again.",
    invalidLineupData: "Invalid line-up data.",
    googleAccountNoPassword: 'This account uses Google sign-in, so it has no password. Please use the "Sign in with Google" button.',
    emailUsesGoogle: "This email is already registered with Google. Please sign in with Google.",
    pitchLabels: {
      5: "5-a-side",
      7: "7-a-side",
      11: "11-a-side",
      custom: "Custom",
    } satisfies Record<PitchSize, string>,
  },
} satisfies Record<Language, AppCopy>;

// Supabase returns errors in English; map every known case to the active language
// and fall back to a generic localized message so no raw English ever reaches the UI.
export const localizeError = (message: string | undefined, copy: AppCopy): string => {
  if (!message) return copy.unexpectedError;
  const lower = message.toLowerCase();
  if (lower.includes("could not find the table") || message.includes("PGRST205")) return copy.databaseNotReady;
  if (lower.includes("invalid login credentials")) return copy.invalidCredentials;
  if (lower.includes("email not confirmed")) return copy.emailNotConfirmed;
  if (lower.includes("already registered") || lower.includes("already been registered")) return copy.emailAlreadyRegistered;
  if (lower.includes("new password should be different") || lower.includes("different from the old")) return copy.passwordSameAsOld;
  if (lower.includes("should be at least") || lower.includes("at least 6") || lower.includes("password is too short")) return copy.passwordTooShort;
  if (lower.includes("unable to validate email") || lower.includes("invalid email") || lower.includes("invalid format")) return copy.invalidEmail;
  if (lower.includes("for security purposes")) return copy.emailRateLimited;
  if (lower.includes("rate limit") || lower.includes("too many requests")) return copy.emailRateLimited;
  if (lower.includes("email_provider_conflict") || lower.includes("already uses")) return copy.emailUsesGoogle;
  if (lower.includes("otp_expired") || lower.includes("invalid or has expired") || lower.includes("expired")) {
    return copy.recoveryLinkExpired;
  }
  // Unknown error: keep the raw message in the console for debugging but show a localized message.
  console.error("Unlocalized Supabase error:", message);
  return copy.unexpectedError;
};

export const getSupabaseErrorMessage = (error: { code?: string; message?: string }, copy: AppCopy) => {
  if (error.code === "PGRST205") return copy.databaseNotReady;
  return localizeError(error.message, copy);
};
