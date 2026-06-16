import React, { PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { AnimationTimeline } from "./AnimationTimeline";
import { AppContent } from "./AppContent";
import { AppHeader } from "./AppHeader";
import { AppOverlays } from "./AppOverlays";
import type { CanvasTool } from "./CanvasToolSidebar";
import { DashboardShell } from "./DashboardShell";
import { LineupDragPreview } from "./DragPreview";
import { DrawControls } from "./DrawControls";
import {
  createDrawLinesFromSharedLineup,
  createOpponentMarkers,
  createOpponentMarkersFromSharedLineup,
  createPlayers,
  createPlayersFromSharedLineup,
  formationsBySize,
  getBenchCount,
  getDefaultFormation,
  getDisplayPosition,
  getInitialWorkspaceMode,
  getRegisteredNames,
  getZoneName,
  isFormationKey,
  pitchOptions,
  type DrawLine,
  type FormationKey,
  type FormationPlayer,
  type OpponentMarker,
} from "./formationData";
import { LineupColumn } from "./LineupColumn";
import { LineupFooterActions } from "./LineupFooterActions";
import { LineupHeaderActions } from "./LineupHeaderActions";
import { LineupStage } from "./LineupStage";
import { LineupWorkspace } from "./LineupWorkspace";
import { LockerRoom } from "./LockerRoom";
import { MarkerTray } from "./MarkerTray";
import { PitchField } from "./PitchField";
import { ProfileView } from "./ProfileView";
import { MobilePlayerEditor, MobileSquadDrawer, SquadEditor } from "./SquadEditor";
import { ToastStack } from "./ToastStack";
import { getInitialAppTab, getPitchSizeFromUrl, isPitchSize, type AppTab, type PitchSize } from "./appRouting";
import { useAnimationPlaybackControls } from "./hooks/useAnimationPlaybackControls";
import { useAppRouting } from "./hooks/useAppRouting";
import { useAuth } from "./hooks/useAuth";
import { useDrawingControls } from "./hooks/useDrawingControls";
import { useLineupExportActions } from "./hooks/useLineupExportActions";
import { useLineupDragControls } from "./hooks/useLineupDragControls";
import { useLockerRoomData, type LockerCategory } from "./hooks/useLockerRoomData";
import { useLineupStorageActions } from "./hooks/useLineupStorageActions";
import { useOutsidePointerDown } from "./hooks/useOutsidePointerDown";
import { usePasswordRecoveryFlow } from "./hooks/usePasswordRecoveryFlow";
import { useProfile } from "./hooks/useProfile";
import { useSquadEditorControls } from "./hooks/useSquadEditorControls";
import { useToasts } from "./hooks/useToasts";
import { useWorkspaceControls } from "./hooks/useWorkspaceControls";
import {
  clampCoordinate,
  clampCustomCount,
  clampDrawCoordinate,
  decodeSharePayload,
  type SharedLineup,
} from "./lineupShare";
import type { SavedLineupRecord } from "./lineupState";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";
import {
  getSavedLineupDateTime as getSavedLineupDateTimeValue,
  getSavedLineupFormatLabel as getSavedLineupFormatLabelValue,
  getSavedLineupThumbnail as getSavedLineupThumbnailValue,
} from "./lockerDisplay";
import { tacticalStorageKey, useTacticalStore, type WorkspaceMode } from "./stores/tacticalStore";
import {
  cloneTacticalFrame,
  cloneTacticalFrames,
  createInitialTacticalFrame,
  createTacticalFrameFromWorkspace,
  defaultBallMarker,
} from "./tacticalData";
import "./styles.css";

type Player = FormationPlayer;

type Language = "vi" | "en";
type SandboxTool = CanvasTool;

const lineupStorageKey = "lineup-football-default-state-v1";

const pitchSizes: PitchSize[] = [5, 7, 11];

type AppCopy = {
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

const copyByLanguage = {
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
const localizeError = (message: string | undefined, copy: AppCopy): string => {
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

const getSupabaseErrorMessage = (error: { code?: string; message?: string }, copy: AppCopy) => {
  if (error.code === "PGRST205") return copy.databaseNotReady;
  return localizeError(error.message, copy);
};

const getSharedLineupFromUrl = () => {
  const value = new URLSearchParams(window.location.search).get("lineup");
  return value
    ? decodeSharePayload<FormationKey>(value, {
        isPitchSize,
        isFormationKey,
        hasFormation: (pitchSize, formation) => Boolean(formationsBySize[pitchSize][formation]),
      })
    : null;
};

export default function App({ initialLanguage = "vi" }: { initialLanguage?: Language }) {
  const { user, isAuthLoading, signOut, isPasswordRecovery, authHashError, clearPasswordRecovery } = useAuth();
  const navigate = useNavigate();
  const isRecoveryExpiryError = Boolean(
    authHashError && /otp|recovery|expired|invalid/i.test(`${authHashError.code} ${authHashError.description}`),
  );
  const sharedLineup = useMemo(() => getSharedLineupFromUrl(), []);
  const initialPitchSize = sharedLineup?.pitchSize ?? getPitchSizeFromUrl() ?? 7;
  const initialFormation = sharedLineup?.formation ?? "2-3-1";
  const initialCustomCount = sharedLineup ? clampCustomCount(sharedLineup.customCount) : 0;
  const initialPlayers = sharedLineup
    ? createPlayersFromSharedLineup(sharedLineup)
    : createPlayers(initialPitchSize, initialFormation, initialCustomCount || 5);
  const initialOpponentMarkers =
    sharedLineup?.version === 2 || sharedLineup?.pitchSize === "custom"
      ? createOpponentMarkersFromSharedLineup(sharedLineup)
      : createOpponentMarkers();
  const initialDrawLines =
    sharedLineup?.version === 2 || sharedLineup?.pitchSize === "custom" ? createDrawLinesFromSharedLineup(sharedLineup) : [];
  const initialWorkspaceMode = getInitialWorkspaceMode(sharedLineup, initialPitchSize);
  const [pitchSize, setPitchSize] = useState<PitchSize>(() => initialPitchSize);
  const [formation, setFormation] = useState<FormationKey>(() => initialFormation);
  const [customCount, setCustomCount] = useState(() => initialCustomCount);
  const [players, setPlayers] = useState<Player[]>(() => initialPlayers);
  const [savedPlayersByPitch, setSavedPlayersByPitch] = useState<Partial<Record<PitchSize, Player[]>>>(() => ({
    [initialPitchSize]: initialPlayers,
  }));
  const [savedFormationByPitch, setSavedFormationByPitch] = useState<Partial<Record<PitchSize, FormationKey>>>(() => ({
    [initialPitchSize]: initialFormation,
  }));
  const [savedCustomCountByPitch, setSavedCustomCountByPitch] = useState<Partial<Record<PitchSize, number>>>(() => ({
    [initialPitchSize]: initialCustomCount,
  }));
  const [opponentMarkers, setOpponentMarkers] = useState<OpponentMarker[]>(() => initialOpponentMarkers);
  const [savedOpponentMarkersByPitch, setSavedOpponentMarkersByPitch] = useState<
    Partial<Record<PitchSize, OpponentMarker[]>>
  >(() => ({
    [initialPitchSize]: initialOpponentMarkers,
  }));
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [isMobileSquadDrawerOpen, setIsMobileSquadDrawerOpen] = useState(false);
  const [drawLines, setDrawLines] = useState<DrawLine[]>(() => initialDrawLines);
  const [savedDrawLinesByPitch, setSavedDrawLinesByPitch] = useState<Partial<Record<PitchSize, DrawLine[]>>>(() => ({
    [initialPitchSize]: initialDrawLines,
  }));
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [selectedMobilePlayerId, setSelectedMobilePlayerId] = useState(1);
  const [activeTab, setActiveTab] = useState<AppTab>(() => getInitialAppTab());
  const [currentMode, setCurrentMode] = useState<WorkspaceMode>(() => initialWorkspaceMode);
  const [activeTool, setActiveTool] = useState<SandboxTool>(() =>
    initialWorkspaceMode === "ANIMATION" ? "ANIMATION_TOOL" : initialWorkspaceMode === "CUSTOM" ? "PERSONNEL_TOOL" : "PERSONNEL_TOOL",
  );
  const [activeBottomSheetTool, setActiveBottomSheetTool] = useState<SandboxTool | null>(() =>
    initialWorkspaceMode === "ANIMATION" ? "ANIMATION_TOOL" : "PERSONNEL_TOOL",
  );
  const [isLineupMenuOpen, setIsLineupMenuOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [authDialogMode, setAuthDialogMode] = useState<"sign_in" | "sign_up" | "reset">("sign_in");
  const [isAuthScreenOpen, setIsAuthScreenOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [lineupName, setLineupName] = useState("");
  const { toasts, showToast } = useToasts();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const lineupMenuRef = useRef<HTMLDivElement>(null);
  const pitchRef = useRef<HTMLDivElement>(null);
  const drawLayerRef = useRef<SVGSVGElement>(null);
  const frameListRef = useRef<HTMLDivElement>(null);
  const frameListDragRef = useRef<{ pointerId: number; x: number; scrollLeft: number; moved: boolean } | null>(null);
  const activePlayers = players.filter((player) => player.onPitch);
  const benchCount = getBenchCount(activePlayers);
  const copy = copyByLanguage[language];
  const languageMeta =
    language === "vi" ? { flag: "🇻🇳", label: "VI", next: "en" as const } : { flag: "🇺🇸", label: "EN", next: "vi" as const };
  const {
    savedLineups,
    setSavedLineups,
    lockerCategory,
    setLockerCategory,
    lockerStatus,
    setLockerStatus,
    isLockerLoading,
    setIsLockerLoading,
    deletingLineupId,
    fetchSavedLineups,
    deleteSavedLineup,
  } = useLockerRoomData<SavedLineupRecord<FormationKey>>({
    user,
    copy,
    getErrorMessage: (error) => getSupabaseErrorMessage(error as { code?: string; message?: string }, copy),
    showToast,
  });
  const {
    profileUsername,
    profileAvatarUrl,
    profileBio,
    profileFavoriteTeam,
    profileFavoritePosition,
    profileLocation,
    isAvatarUploading,
    isProfileLoading,
    avatarInputRef,
    setProfileUsername,
    setProfileBio,
    setProfileFavoriteTeam,
    setProfileFavoritePosition,
    setProfileLocation,
    fetchProfile,
    updateProfile,
    handleAvatarFileChange,
  } = useProfile({
    user,
    copy,
    setLockerStatus,
    showToast,
    getErrorMessage: (error) => getSupabaseErrorMessage(error as { code?: string; message?: string }, copy),
  });
  const {
    recoveryPassword,
    recoveryConfirm,
    recoveryStatus,
    recoveryDone,
    isRecoverySubmitting,
    setRecoveryPassword,
    setRecoveryConfirm,
    handleUpdatePassword,
    closeRecoveryScreen,
    requestNewResetLink,
    openSignInFromRecovery,
  } = usePasswordRecoveryFlow({
    copy,
    clearPasswordRecovery,
    localizeError: (message) => localizeError(message, copy),
    onOpenReset: () => {
      setAuthDialogMode("reset");
      setIsAuthScreenOpen(true);
    },
    onOpenSignIn: () => {
      setAuthDialogMode("sign_in");
      setIsAuthScreenOpen(true);
    },
  });
  const selectedMobilePlayer =
    activePlayers.find((player) => player.id === selectedMobilePlayerId) ?? activePlayers[0] ?? null;
  const {
    frames: animationFrames,
    draftFrame,
    playbackFrames,
    currentFrameIndex,
    isPlaying,
    isLooping,
    selectFrame,
    addFrame,
    removeFrame,
    clearFrames,
    updateMarker: updateTacticalMarker,
    commitDraftIfChanged,
    toggleLoop,
    play,
    pause,
    stop,
    nextFrame,
  } = useTacticalStore();
  const activeAnimationFrame = playbackFrames
    ? (playbackFrames[currentFrameIndex] ?? playbackFrames[0])
    : currentFrameIndex < animationFrames.length
      ? (animationFrames[currentFrameIndex] ?? draftFrame)
      : draftFrame;
  const animationMarkerMap = useMemo(
    () => new Map(activeAnimationFrame.map((marker) => [marker.id, marker])),
    [activeAnimationFrame],
  );
  const animationOpponentMarkers = activeAnimationFrame
    .filter((marker) => marker.type === "opponent" && marker.onPitch)
    .map((marker) => ({
      frameId: marker.id,
      id: Number(marker.id.replace("o", "")),
      x: marker.x,
      y: marker.y,
    }))
    .filter((marker) => Number.isFinite(marker.id));
  const ballMarker = activeAnimationFrame.find((marker) => marker.type === "ball");
  const isBallOnPitch = Boolean(ballMarker?.onPitch);
  const isPersonnelTool = activeTool === "PERSONNEL_TOOL";
  const isDrawTool = activeTool === "DRAW_TOOL";
  const isAnimationTool = activeTool === "ANIMATION_TOOL";
  const showMarkerTray = activeBottomSheetTool === "PERSONNEL_TOOL";
  const showDrawTools = isDrawTool;
  const showDrawSheet = activeBottomSheetTool === "DRAW_TOOL";
  const showAnimationTimeline = activeBottomSheetTool === "ANIMATION_TOOL";
  const showAllCanvasObjects = true;
  const {
    redoDrawLines,
    setRedoDrawLines,
    startDrawing,
    continueDrawing,
    stopDrawing,
    undoDrawLine,
    redoDrawLine,
    clearDrawLines,
  } = useDrawingControls({
    drawLayerRef,
    isDrawMode,
    showDrawTools,
    setDrawLines,
  });
  const {
    draggingId,
    draggingOpponentId,
    draggingTacticalMarkerId,
    dragPreview,
    clearDragState,
    handleDragStart,
    handleDragMove,
    stopDragging,
    handleOpponentDragStart,
    handleOpponentDragMove,
    stopOpponentDragging,
    handleTacticalMarkerPointerDown,
    handleTacticalMarkerPointerMove,
    stopTacticalMarkerDragging,
  } = useLineupDragControls({
    pitchRef,
    pitchSize,
    isDrawMode,
    isAnimationTool,
    isPersonnelTool,
    isPlaying,
    ballMarker,
    updateTacticalMarker,
    setPlayers,
    setCustomCount,
    setOpponentMarkers,
  });
  const { playAnimationFromStart, stopAnimationPlayback } = useAnimationPlaybackControls({
    isAnimationTool,
    isPlaying,
    currentFrameIndex,
    animationFrames,
    draftFrame,
    pitchSize,
    nextFrame,
    commitDraftIfChanged,
    stop,
    setPlayers,
    setOpponentMarkers,
  });
  const { handleSaveCurrentLineup, loadSavedLineup, shareSavedLineup } = useLineupStorageActions({
    user,
    copy,
    lineupName,
    currentMode,
    pitchSize,
    formation,
    customCount,
    players,
    activePlayers,
    savedPlayersByPitch,
    savedFormationByPitch,
    savedCustomCountByPitch,
    opponentMarkers,
    savedOpponentMarkersByPitch,
    drawLines,
    savedDrawLinesByPitch,
    showAllCanvasObjects,
    fetchSavedLineups,
    getErrorMessage: (error) => getSupabaseErrorMessage(error as { code?: string; message?: string }, copy),
    showToast,
    setAuthDialogMode,
    setIsAuthScreenOpen,
    setLockerStatus,
    setIsLockerLoading,
    setLineupName,
    setLockerCategory,
    setPitchSize,
    setFormation,
    setCustomCount,
    setPlayers,
    setSavedPlayersByPitch,
    setSavedFormationByPitch,
    setSavedCustomCountByPitch,
    setOpponentMarkers,
    setSavedOpponentMarkersByPitch,
    setDrawLines,
    setSavedDrawLinesByPitch,
    setRedoDrawLines,
    setCurrentMode,
    setActiveTool,
    setActiveBottomSheetTool,
    setActiveTab,
    setIsDrawMode,
  });
  const { copyShareLink, downloadLineupImage } = useLineupExportActions({
    copy,
    pitchRef,
    pitchSize,
    formation,
    customCount,
    players,
    activePlayers,
    opponentMarkers,
    drawLines,
    currentMode,
    showAllCanvasObjects,
    showAnimationTimeline,
    ballMarker,
    setCopyStatus,
    showToast,
  });
  const { renamePlayer, renameExtraPlayer, addPlayerInput, removeExtraPlayerInput, applyCustomCount } =
    useSquadEditorControls({
      setPitchSize,
      setFormation,
      setCustomCount,
      setPlayers,
      setOpponentMarkers,
      setDrawLines,
      setRedoDrawLines,
      setIsDrawMode,
      setCurrentMode,
      setActiveTool,
      setActiveBottomSheetTool,
    });
  const { applyPitchSize, resetPositions, resetWorkspace } = useWorkspaceControls({
    pitchSize,
    formation,
    customCount,
    players,
    activePlayers,
    opponentMarkers,
    drawLines,
    savedPlayersByPitch,
    savedFormationByPitch,
    savedCustomCountByPitch,
    savedOpponentMarkersByPitch,
    savedDrawLinesByPitch,
    showAllCanvasObjects,
    clearDragState,
    setPitchSize,
    setFormation,
    setCustomCount,
    setPlayers,
    setSavedPlayersByPitch,
    setSavedFormationByPitch,
    setSavedCustomCountByPitch,
    setOpponentMarkers,
    setSavedOpponentMarkersByPitch,
    setDrawLines,
    setSavedDrawLinesByPitch,
    setRedoDrawLines,
    setIsDrawMode,
    setCurrentMode,
    setActiveTool,
    setActiveBottomSheetTool,
  });
  const lockerCategories: { value: LockerCategory; label: string }[] = [
    { value: "all", label: copy.allCategories },
    { value: "5", label: copy.pitchLabels[5] },
    { value: "7", label: copy.pitchLabels[7] },
    { value: "11", label: copy.pitchLabels[11] },
    { value: "custom", label: copy.pitchLabels.custom },
    { value: "tactics", label: copy.tacticsTab },
  ];
  const filteredSavedLineups =
    lockerCategory === "all" ? savedLineups : savedLineups.filter((lineup) => lineup.format === lockerCategory);

  useEffect(() => {
    document.title = "doihinhsanco";
  }, []);

  useEffect(() => {
    useTacticalStore.setState({ currentMode, isAnimationMode: currentMode === "ANIMATION" });
  }, [currentMode]);

  useEffect(() => {
    if (isAnimationTool || isPlaying || playbackFrames) return;
    const currentBallMarker =
      useTacticalStore.getState().draftFrame.find((marker) => marker.type === "ball") ?? defaultBallMarker;
    const workspaceFrame = createTacticalFrameFromWorkspace(players, opponentMarkers, currentBallMarker);
    useTacticalStore.setState({ draftFrame: cloneTacticalFrame(workspaceFrame) });
  }, [isAnimationTool, isPlaying, opponentMarkers, playbackFrames, players]);

  useEffect(() => {
    if (!sharedLineup?.animationFrames?.length) return;
    useTacticalStore.setState({
      frames: cloneTacticalFrames(sharedLineup.animationFrames),
      draftFrame: cloneTacticalFrame(sharedLineup.animationFrames[0] ?? createInitialTacticalFrame()),
      playbackFrames: null,
      currentFrameIndex: 0,
      isPlaying: false,
    });
  }, [sharedLineup]);

  const startFrameListDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest("[data-frame-delete]")) return;
    frameListDragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveFrameListDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = frameListDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.x;
    if (Math.abs(deltaX) > 4) {
      drag.moved = true;
    }
    event.currentTarget.scrollLeft = drag.scrollLeft - deltaX;
  };

  const stopFrameListDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    window.setTimeout(() => {
      frameListDragRef.current = null;
    }, 0);
  };

  const selectFrameFromList = (index: number) => {
    if (frameListDragRef.current?.moved) return;
    selectFrame(index);
  };

  const applySandboxTool = (nextTool: SandboxTool) => {
    if (activeTool === nextTool && activeBottomSheetTool === nextTool) {
      setActiveBottomSheetTool(null);
      return;
    }

    const nextMode: WorkspaceMode =
      nextTool === "ANIMATION_TOOL" ? "ANIMATION" : nextTool === "DRAW_TOOL" ? "CUSTOM" : "LINEUP";
    if (nextTool === "ANIMATION_TOOL") {
      const currentBallMarker =
        useTacticalStore.getState().draftFrame.find((marker) => marker.type === "ball") ?? defaultBallMarker;
      const workspaceFrame = createTacticalFrameFromWorkspace(players, opponentMarkers, currentBallMarker);
      useTacticalStore.setState({
        draftFrame: cloneTacticalFrame(workspaceFrame),
        currentFrameIndex: useTacticalStore.getState().frames.length,
        isPlaying: false,
        playbackFrames: null,
      });
    }
    setActiveTool(nextTool);
    setActiveBottomSheetTool(nextTool);
    setCurrentMode(nextMode);
    setActiveTab("lineup");
    setIsLineupMenuOpen(false);
    setIsUserMenuOpen(false);
    setIsDrawMode(nextTool === "DRAW_TOOL");
    useTacticalStore.setState({
      currentMode: nextMode,
      isAnimationMode: nextMode === "ANIMATION",
      isPlaying: false,
      playbackFrames: null,
    });
  };

  useEffect(() => {
    try {
      window.localStorage.removeItem(lineupStorageKey);
      window.localStorage.removeItem(tacticalStorageKey);
    } catch {
      // Ignore storage access errors in restricted browsing modes.
    }
  }, []);

  useOutsidePointerDown([
    { ref: userMenuRef, isOpen: isUserMenuOpen, onClose: () => setIsUserMenuOpen(false) },
    { ref: lineupMenuRef, isOpen: isLineupMenuOpen, onClose: () => setIsLineupMenuOpen(false) },
  ]);

  const getSavedLineupFormatLabel = (lineup: SavedLineupRecord<FormationKey>) => {
    return getSavedLineupFormatLabelValue(lineup, { pitchLabels: copy.pitchLabels, tacticsLabel: copy.tacticsTab });
  };
  const getSavedLineupThumbnail = getSavedLineupThumbnailValue;
  const getSavedLineupDateTime = getSavedLineupDateTimeValue;

  const { switchAppTab } = useAppRouting({
    pitchSize,
    applyPitchSize,
    setActiveTab,
    setCurrentMode,
    setActiveTool,
    setActiveBottomSheetTool,
    setIsLineupMenuOpen,
    setIsUserMenuOpen,
  });

  return (
    <main className="match-bg min-h-screen p-4 text-slate-900 antialiased sm:p-6 lg:p-10">
      <AppHeader
        copy={copy}
        user={user}
        languageMeta={languageMeta}
        isUserMenuOpen={isUserMenuOpen}
        userMenuRef={userMenuRef}
        onSwitchLanguage={() => setLanguage(languageMeta.next)}
        onOpenSignIn={() => {
          setAuthDialogMode("sign_in");
          setIsAuthScreenOpen(true);
        }}
        onToggleUserMenu={() => setIsUserMenuOpen((current) => !current)}
        onOpenProfile={() => switchAppTab("profile")}
        onOpenLocker={() => switchAppTab("locker")}
        onSignOut={async () => {
          await signOut();
          navigate("/", { replace: true });
        }}
      />
      <AppOverlays
        copy={copy}
        language={language}
        authHashErrorMessage={authHashError ? localizeError(authHashError.description, copy) : null}
        isPasswordRecovery={isPasswordRecovery}
        hasAuthHashError={Boolean(authHashError)}
        isRecoveryExpiryError={isRecoveryExpiryError}
        isSupabaseConfigured={isSupabaseConfigured}
        recoveryDone={recoveryDone}
        recoveryPassword={recoveryPassword}
        recoveryConfirm={recoveryConfirm}
        recoveryStatus={recoveryStatus}
        isRecoverySubmitting={isRecoverySubmitting}
        isAuthScreenOpen={isAuthScreenOpen}
        authDialogMode={authDialogMode}
        onRecoveryPasswordChange={setRecoveryPassword}
        onRecoveryConfirmChange={setRecoveryConfirm}
        onSubmitRecovery={handleUpdatePassword}
        onCloseRecovery={closeRecoveryScreen}
        onRequestNewResetLink={requestNewResetLink}
        onOpenSignInFromRecovery={openSignInFromRecovery}
        onCloseAuth={() => setIsAuthScreenOpen(false)}
        onAuthenticated={() => setIsAuthScreenOpen(false)}
      />
      <DashboardShell isTacticsView={false}>
        <AppContent
          activeTab={activeTab}
          profileView={
          <ProfileView
            copy={copy}
            user={user}
            isSupabaseConfigured={isSupabaseConfigured}
            profileUsername={profileUsername}
            profileAvatarUrl={profileAvatarUrl}
            profileBio={profileBio}
            profileFavoriteTeam={profileFavoriteTeam}
            profileFavoritePosition={profileFavoritePosition}
            profileLocation={profileLocation}
            isAvatarUploading={isAvatarUploading}
            isProfileLoading={isProfileLoading}
            avatarInputRef={avatarInputRef}
            onAvatarFileChange={handleAvatarFileChange}
            onProfileUsernameChange={setProfileUsername}
            onProfileBioChange={setProfileBio}
            onProfileFavoriteTeamChange={setProfileFavoriteTeam}
            onProfileFavoritePositionChange={setProfileFavoritePosition}
            onProfileLocationChange={setProfileLocation}
            onUpdateProfile={updateProfile}
          />
          }
          lockerView={
          <LockerRoom
            copy={copy}
            savedLineupCount={savedLineups.length}
            categories={lockerCategories}
            activeCategory={lockerCategory}
            savedLineups={filteredSavedLineups}
            deletingLineupId={deletingLineupId}
            getFormatLabel={getSavedLineupFormatLabel}
            getThumbnail={getSavedLineupThumbnail}
            getDateTime={getSavedLineupDateTime}
            onCategoryChange={setLockerCategory}
            onLoadLineup={loadSavedLineup}
            onShareLineup={shareSavedLineup}
            onDeleteLineup={deleteSavedLineup}
          />
          }
          lineupView={
          <LineupWorkspace
            squadEditor={
              <SquadEditor
                copy={copy}
                players={activePlayers}
                benchCount={benchCount}
                getPositionLabel={(position) => getDisplayPosition(position, language)}
                onRenamePlayer={renamePlayer}
                onRenameExtraPlayer={renameExtraPlayer}
                onAddPlayerInput={addPlayerInput}
                onRemoveExtraPlayerInput={removeExtraPlayerInput}
              />
            }
            lineupColumn={
              <LineupColumn
              mode={isAnimationTool ? "animation" : isDrawMode ? "draw" : "personnel"}
              isCustomPitch={pitchSize === "custom"}
              header={
                <LineupHeaderActions
                  saveLabel={copy.save}
                  resetLabel={copy.reset}
                  savedLabel={copy.saved}
                  status={lockerStatus}
                  isSaving={isLockerLoading}
                  onSave={handleSaveCurrentLineup}
                  onReset={resetWorkspace}
                />
              }
              mobileEditor={
                <MobilePlayerEditor
                  copy={copy}
                  players={activePlayers}
                  selectedPlayer={selectedMobilePlayer}
                  getPositionLabel={(position) => getDisplayPosition(position, language)}
                  onSelectedPlayerChange={setSelectedMobilePlayerId}
                  onRenamePlayer={renamePlayer}
                  onRenameExtraPlayer={renameExtraPlayer}
                  onAddPlayerInput={addPlayerInput}
                  onRemoveExtraPlayerInput={removeExtraPlayerInput}
                />
              }
              stage={
                <LineupStage
                  mode={isAnimationTool ? "animation" : isDrawMode ? "draw" : "personnel"}
                  activeTool={activeBottomSheetTool}
                  drawLabel={copy.draw}
                  isDragging={draggingId !== null || draggingOpponentId !== null || draggingTacticalMarkerId !== null}
                  showMarkerTray={showMarkerTray}
                  showAnimationPanel={showAnimationTimeline}
                  onSelectTool={applySandboxTool}
                  markerTray={
                    showMarkerTray ? (
                      <MarkerTray
                        copy={copy}
                        players={players}
                        opponentMarkers={opponentMarkers}
                        ballMarker={ballMarker}
                        isBallOnPitch={isBallOnPitch}
                        onPlayerPointerDown={handleDragStart}
                        onPlayerPointerMove={handleDragMove}
                        onPlayerPointerEnd={stopDragging}
                        onOpponentPointerDown={handleOpponentDragStart}
                        onOpponentPointerMove={handleOpponentDragMove}
                        onOpponentPointerEnd={stopOpponentDragging}
                        onBallPointerDown={handleTacticalMarkerPointerDown}
                        onBallPointerMove={handleTacticalMarkerPointerMove}
                        onBallPointerEnd={stopTacticalMarkerDragging}
                      />
                    ) : null
                  }
                  pitch={
                    <PitchField
                      pitchRef={pitchRef}
                      drawLayerRef={drawLayerRef}
                      players={activePlayers}
                      opponentMarkers={isAnimationTool ? animationOpponentMarkers : opponentMarkers.filter((marker) => marker.onPitch)}
                      ballMarker={ballMarker}
                      animationMarkerMap={animationMarkerMap}
                      drawLines={drawLines}
                      isDrawMode={isDrawMode}
                      showDrawTools={showDrawTools}
                      isAnimationTool={isAnimationTool}
                      isPlaying={isPlaying}
                      showAllCanvasObjects={showAllCanvasObjects}
                      draggingPlayerId={draggingId}
                      draggingOpponentId={draggingOpponentId}
                      draggingBallId={draggingTacticalMarkerId}
                      labels={{ player: copy.player, dragPlayer: copy.dragPlayer, dragOpponent: copy.dragOpponent }}
                      getPositionLabel={(position) => getDisplayPosition(position, language)}
                      onStartDrawing={startDrawing}
                      onContinueDrawing={continueDrawing}
                      onStopDrawing={stopDrawing}
                      onPlayerPointerDown={handleDragStart}
                      onPlayerPointerMove={handleDragMove}
                      onPlayerPointerEnd={stopDragging}
                      onOpponentPointerDown={handleOpponentDragStart}
                      onOpponentPointerMove={handleOpponentDragMove}
                      onOpponentPointerEnd={stopOpponentDragging}
                      onBallPointerDown={handleTacticalMarkerPointerDown}
                      onBallPointerMove={handleTacticalMarkerPointerMove}
                      onBallPointerEnd={stopTacticalMarkerDragging}
                    />
                  }
                  mobileSquadDrawer={
                    <MobileSquadDrawer
                      copy={copy}
                      players={activePlayers}
                      isOpen={isMobileSquadDrawerOpen}
                      getPositionLabel={(position) => getDisplayPosition(position, language)}
                      onOpen={() => setIsMobileSquadDrawerOpen(true)}
                      onClose={() => setIsMobileSquadDrawerOpen(false)}
                      onRenamePlayer={renamePlayer}
                      onRenameExtraPlayer={renameExtraPlayer}
                      onAddPlayerInput={addPlayerInput}
                      onRemoveExtraPlayerInput={removeExtraPlayerInput}
                    />
                  }
                  animationTimeline={
                    showAnimationTimeline ? (
                      <AnimationTimeline
                        frames={animationFrames}
                        currentFrameIndex={currentFrameIndex}
                        isPlaying={isPlaying}
                        isLooping={isLooping}
                        isShowingPlayback={Boolean(playbackFrames)}
                        labels={{
                          tacticalTimeline: copy.tacticalTimeline,
                          framesUnit: copy.framesUnit,
                          frame: copy.frame,
                          addFrame: copy.addFrame,
                          clearAll: copy.clearAll,
                          delete: copy.delete,
                        }}
                        frameListRef={frameListRef}
                        onPlay={playAnimationFromStart}
                        onPause={pause}
                        onStop={stopAnimationPlayback}
                        onToggleLoop={toggleLoop}
                        onClearFrames={clearFrames}
                        onSelectFrame={selectFrameFromList}
                        onDeleteFrame={removeFrame}
                        onAddFrame={addFrame}
                        onFrameListPointerDown={startFrameListDrag}
                        onFrameListPointerMove={moveFrameListDrag}
                        onFrameListPointerUp={stopFrameListDrag}
                        onFrameListPointerCancel={stopFrameListDrag}
                      />
                    ) : null
                  }
                />
              }
              drawControls={
                showDrawSheet && isDrawMode ? (
                    <DrawControls
                      undoLabel={copy.undo}
                      redoLabel={copy.redo}
                      clearLabel={copy.clearLines}
                      canUndo={drawLines.length > 0}
                      canRedo={redoDrawLines.length > 0}
                      canClear={drawLines.length > 0}
                      onUndo={undoDrawLine}
                      onRedo={redoDrawLine}
                      onClear={clearDrawLines}
                    />
                ) : null
              }
              footerActions={
                <LineupFooterActions
                  shareLabel={copy.share}
                  copiedLabel={copy.copied}
                  downloadLabel={copy.download}
                  isCopied={copyStatus === "copied"}
                  onShare={copyShareLink}
                  onDownload={downloadLineupImage}
                />
              }
              />
            }
          />
          }
        />
      </DashboardShell>
      <LineupDragPreview preview={activeTab === "lineup" ? dragPreview : null} />
      <ToastStack toasts={toasts} />
    </main>
  );
}
