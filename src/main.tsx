import React, { PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import type { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { create } from "zustand";
import { Check, ChevronDown, Clipboard, Clapperboard, Download, Pause, PenLine, Pencil, Play, Plus, Redo2, Repeat, RotateCcw, Save, Share2, Square, Trash2, Undo2, Users, X } from "lucide-react";
import { LandingPage } from "./LandingPage";
import { useAuth } from "./hooks/useAuth";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";
import "./styles.css";

type Player = {
  id: number;
  position: string;
  starterName: string;
  substituteName: string;
  extraNames: string[];
  x: number;
  y: number;
  onPitch: boolean;
};

type FormationPoint = {
  id: number;
  x: number;
  y: number;
};

type OpponentMarker = {
  id: number;
  x: number;
  y: number;
  onPitch: boolean;
};

type DrawLine = {
  id: number;
  points: { x: number; y: number }[];
};

type TacticalMarker = {
  id: string;
  label: string;
  type: "player" | "opponent" | "ball";
  x: number;
  y: number;
  onPitch: boolean;
};

type TacticalFrame = TacticalMarker[];

type TacticalPlaybook = {
  id: string;
  name: string;
  frames: TacticalFrame[];
};

type TacticalStore = {
  currentMode: WorkspaceMode;
  isAnimationMode: boolean;
  tactics: TacticalPlaybook[];
  activeTacticId: string;
  frames: TacticalFrame[];
  draftFrame: TacticalFrame;
  playbackFrames: TacticalFrame[] | null;
  currentFrameIndex: number;
  isPlaying: boolean;
  isLooping: boolean;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  setAnimationMode: (value: boolean) => void;
  selectFrame: (index: number) => void;
  addFrame: () => void;
  commitDraftIfChanged: () => TacticalFrame[];
  removeFrame: (index: number) => void;
  clearFrames: () => void;
  updateMarker: (id: string, x: number, y: number, onPitch?: boolean) => void;
  toggleLoop: () => void;
  saveTactic: () => void;
  createTactic: () => void;
  loadTactic: (id: string) => void;
  deleteTactic: (id: string) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  nextFrame: () => void;
};

type PitchSize = 5 | 7 | 11 | "custom";
type Language = "vi" | "en";
type AppTab = "lineup" | "tactics" | "profile" | "locker";
type WorkspaceMode = "LINEUP" | "CUSTOM" | "ANIMATION";
type SandboxTool = "PERSONNEL_TOOL" | "DRAW_TOOL" | "ANIMATION_TOOL";
type FormationKey =
  | "1-2-1"
  | "2-1-1"
  | "1-1-2"
  | "2-3-1"
  | "3-2-1"
  | "2-2-2"
  | "4-4-2"
  | "4-3-3"
  | "3-5-2"
  | "custom";
type PitchZone = {
  name: string;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
};

type SharedLineup = {
  version?: 1 | 2;
  currentMode?: WorkspaceMode;
  pitchSize?: PitchSize;
  customCount?: number;
  formation: FormationKey;
  players: Pick<Player, "id" | "starterName" | "substituteName" | "extraNames" | "x" | "y" | "onPitch">[];
  opponentMarkers?: OpponentMarker[];
  drawLines?: DrawLine[];
  animationFrames?: TacticalFrame[];
};

type StoredLineupState = {
  version: 1;
  kind?: "unified";
  currentMode?: WorkspaceMode;
  pitchSize: PitchSize;
  formation: FormationKey;
  customCount: number;
  players: Player[];
  savedPlayersByPitch: Partial<Record<PitchSize, Player[]>>;
  savedFormationByPitch: Partial<Record<PitchSize, FormationKey>>;
  savedCustomCountByPitch: Partial<Record<PitchSize, number>>;
  opponentMarkers: OpponentMarker[];
  savedOpponentMarkersByPitch: Partial<Record<PitchSize, OpponentMarker[]>>;
  drawLines: DrawLine[];
  savedDrawLinesByPitch: Partial<Record<PitchSize, DrawLine[]>>;
  animationFrames?: TacticalFrame[];
  thumbnailDataUrl?: string;
  savedAt?: string;
};

type SavedTacticsState = {
  kind: "tactics";
  tactics: TacticalPlaybook[];
};

type SavedLineupRecord = {
  id: string;
  user_id: string;
  name: string;
  format: string;
  players_data: StoredLineupState | SavedTacticsState;
  created_at: string;
};

type ProfileRecord = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  full_name: string | null;
  bio: string | null;
  favorite_team: string | null;
  favorite_position: string | null;
  location: string | null;
};

const lineupStorageKey = "lineup-football-default-state-v1";

const pitchSizes: PitchSize[] = [5, 7, 11];
const pitchOptions: { value: PitchSize; label: string }[] = [
  { value: 5, label: "Sân 5" },
  { value: 7, label: "Sân 7" },
  { value: 11, label: "Sân 11" },
  { value: "custom", label: "Cá nhân hóa" },
];

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

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// Supabase rate-limit errors look like:
// "For security purposes, you can only request this after 16 seconds."
const parseRateLimitSeconds = (message?: string): number | null => {
  if (!message) return null;
  const match = message.match(/after\s+(\d+)\s*seconds?/i);
  return match ? Number(match[1]) : null;
};

function ButtonSpinner() {
  return <span className="button-spinner" aria-hidden="true" />;
}

const createInitialTacticalFrame = (): TacticalFrame => [
  { id: "p1", label: "1", type: "player", x: 50, y: 90, onPitch: true },
  { id: "p2", label: "2", type: "player", x: 34, y: 68, onPitch: true },
  { id: "p3", label: "3", type: "player", x: 66, y: 68, onPitch: true },
  { id: "p4", label: "4", type: "player", x: 24, y: 45, onPitch: true },
  { id: "p5", label: "5", type: "player", x: 50, y: 42, onPitch: true },
  { id: "p6", label: "6", type: "player", x: 76, y: 45, onPitch: true },
  { id: "p7", label: "7", type: "player", x: 50, y: 20, onPitch: true },
  ...Array.from({ length: 4 }, (_, index) => ({
    id: `p${index + 8}`,
    label: `${index + 8}`,
    type: "player" as const,
    x: 50,
    y: 50,
    onPitch: false,
  })),
  ...Array.from({ length: 11 }, (_, index) => ({
    id: `o${index + 1}`,
    label: `${index + 1}`,
    type: "opponent" as const,
    x: 50,
    y: 50,
    onPitch: false,
  })),
  { id: "ball", label: "", type: "ball", x: 50, y: 56, onPitch: true },
];

const cloneTacticalFrame = (frame: TacticalFrame): TacticalFrame => frame.map((marker) => ({ ...marker }));

const areTacticalFramesEqual = (a: TacticalFrame | undefined, b: TacticalFrame | undefined) => {
  if (!a || !b || a.length !== b.length) return false;
  const bMarkers = new Map(b.map((marker) => [marker.id, marker]));
  return a.every((marker) => {
    const other = bMarkers.get(marker.id);
    return (
      !!other &&
      marker.type === other.type &&
      marker.label === other.label &&
      marker.onPitch === other.onPitch &&
      Math.abs(marker.x - other.x) < 0.05 &&
      Math.abs(marker.y - other.y) < 0.05
    );
  });
};

const defaultBallMarker: TacticalMarker = { id: "ball", label: "", type: "ball", x: 50, y: 56, onPitch: true };

const createTacticalFrameFromWorkspace = (
  players: Player[],
  opponentMarkers: OpponentMarker[],
  ballMarker: TacticalMarker = defaultBallMarker,
): TacticalFrame => [
  ...players.map((player) => ({
    id: `p${player.id}`,
    label: `${player.id}`,
    type: "player" as const,
    x: player.x,
    y: player.y,
    onPitch: player.onPitch,
  })),
  ...opponentMarkers.map((marker) => ({
    id: `o${marker.id}`,
    label: `${marker.id}`,
    type: "opponent" as const,
    x: marker.x,
    y: marker.y,
    onPitch: marker.onPitch,
  })),
  { ...defaultBallMarker, ...ballMarker, id: "ball", label: "", type: "ball" as const },
];

const tacticalStorageKey = "lineup-football-tactics-state-v1";

const cloneTacticalFrames = (frames: TacticalFrame[]): TacticalFrame[] => frames.map(cloneTacticalFrame);

const createTacticalId = () => `tactic-${Date.now()}-${Math.round(Math.random() * 1000)}`;

const createDefaultTacticalPlaybook = (): TacticalPlaybook => ({
  id: "tactic-default",
  name: "Chiến thuật 1",
  frames: [],
});

const clampTacticalCoordinate = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(96, Math.max(4, value)) : fallback;

const normalizeTacticalFrame = (frame: unknown): TacticalFrame | null => {
  if (!Array.isArray(frame)) return null;

  const normalized = frame
    .filter((marker) => marker && typeof marker === "object")
    .map((marker) => {
      const item = marker as Partial<TacticalMarker>;
      if (typeof item.id !== "string" || (item.type !== "player" && item.type !== "opponent" && item.type !== "ball")) {
        return null;
      }

      return {
        id: item.id,
        label: typeof item.label === "string" ? item.label : "",
        type: item.type,
        x: clampTacticalCoordinate(item.x, 50),
        y: clampTacticalCoordinate(item.y, 50),
        onPitch: Boolean(item.onPitch),
      };
    })
    .filter(Boolean) as TacticalFrame;

  return normalized.length > 0 ? normalized : null;
};

const normalizeTacticalPlaybooks = (value: unknown): TacticalPlaybook[] => {
  if (!Array.isArray(value)) return [createDefaultTacticalPlaybook()];

  const tactics = value
    .filter((tactic) => tactic && typeof tactic === "object")
    .map((tactic, index) => {
      const item = tactic as Partial<TacticalPlaybook>;
      const frames = Array.isArray(item.frames) ? item.frames.map(normalizeTacticalFrame).filter(Boolean) : [];

      return {
        id: typeof item.id === "string" && item.id ? item.id : `tactic-${index + 1}`,
        name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : `Chiến thuật ${index + 1}`,
        frames: frames as TacticalFrame[],
      };
    })
    .filter(Boolean) as TacticalPlaybook[];

  return tactics.length > 0 ? tactics : [createDefaultTacticalPlaybook()];
};

const encodeTacticalPayload = (tactics: TacticalPlaybook[]) => {
  const json = JSON.stringify({
    version: 1,
    tactics: tactics.map((tactic) => ({
      ...tactic,
      frames: tactic.frames.map((frame) =>
        frame.map((marker) => ({
          ...marker,
          x: Math.round(marker.x * 10) / 10,
          y: Math.round(marker.y * 10) / 10,
        })),
      ),
    })),
  });
  const bytes = new TextEncoder().encode(json);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};

const decodeTacticalPayload = (value: string): TacticalPlaybook[] | null => {
  try {
    const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(paddedBase64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as { tactics?: unknown };

    return normalizeTacticalPlaybooks(parsed.tactics);
  } catch {
    return null;
  }
};

const saveStoredTactics = (tactics: TacticalPlaybook[]) => {
  void tactics;
};

const getInitialTacticalPlaybooks = () => {
  const sharedValue = new URLSearchParams(window.location.search).get("tactics");
  const sharedTactics = sharedValue ? decodeTacticalPayload(sharedValue) : null;
  return sharedTactics ?? [createDefaultTacticalPlaybook()];
};

const initialTacticalPlaybooks = getInitialTacticalPlaybooks();
const initialTacticalPlaybook = initialTacticalPlaybooks[0] ?? createDefaultTacticalPlaybook();

const useTacticalStore = create<TacticalStore>((set, get) => ({
  currentMode: "LINEUP",
  isAnimationMode: true,
  tactics: initialTacticalPlaybooks,
  activeTacticId: initialTacticalPlaybook.id,
  frames: cloneTacticalFrames(initialTacticalPlaybook.frames),
  draftFrame: createInitialTacticalFrame(),
  playbackFrames: null,
  currentFrameIndex: 0,
  isPlaying: false,
  isLooping: false,
  setWorkspaceMode: (mode) => set({ currentMode: mode, isAnimationMode: mode === "ANIMATION" }),
  setAnimationMode: (value) => set({ isAnimationMode: value }),
  selectFrame: (index) =>
    set((state) => {
      const selectedIndex = state.frames.length === 0 ? 0 : Math.min(Math.max(index, 0), state.frames.length - 1);
      const selectedFrame = state.frames[selectedIndex] ?? state.draftFrame;
      return {
        currentFrameIndex: selectedIndex,
        draftFrame: cloneTacticalFrame(selectedFrame),
        isPlaying: false,
        playbackFrames: null,
      };
    }),
  addFrame: () =>
    set((state) => {
      const currentFrame = state.draftFrame;
      const nextFrames = [...state.frames, cloneTacticalFrame(currentFrame)];
      return {
        frames: nextFrames,
        draftFrame: cloneTacticalFrame(currentFrame),
        currentFrameIndex: nextFrames.length,
        isAnimationMode: true,
        isPlaying: false,
        playbackFrames: null,
      };
    }),
  commitDraftIfChanged: () => {
    let committedFrames: TacticalFrame[] = [];
    set((state) => {
      const lastFrame = state.frames[state.frames.length - 1];
      const shouldCommit = state.frames.length === 0 || !areTacticalFramesEqual(state.draftFrame, lastFrame);
      const nextFrames = shouldCommit ? [...state.frames, cloneTacticalFrame(state.draftFrame)] : state.frames;
      const nextTactics = shouldCommit
        ? state.tactics.map((tactic) =>
            tactic.id === state.activeTacticId ? { ...tactic, frames: cloneTacticalFrames(nextFrames) } : tactic,
          )
        : state.tactics;
      committedFrames = cloneTacticalFrames(nextFrames);
      if (!shouldCommit) return state;
      saveStoredTactics(nextTactics);
      return {
        tactics: nextTactics,
        frames: nextFrames,
        currentFrameIndex: nextFrames.length,
        isPlaying: false,
        playbackFrames: null,
      };
    });
    return committedFrames;
  },
  removeFrame: (index) =>
    set((state) => {
      if (state.frames.length === 0) return state;
      if (state.frames.length === 1) {
        const nextTactics = state.tactics.map((tactic) =>
          tactic.id === state.activeTacticId ? { ...tactic, frames: [] } : tactic,
        );
        saveStoredTactics(nextTactics);
        return {
          tactics: nextTactics,
          frames: [],
          draftFrame: cloneTacticalFrame(state.frames[0] ?? state.draftFrame),
          currentFrameIndex: 0,
          isPlaying: false,
          playbackFrames: null,
        };
      }
      const nextFrames = state.frames.filter((_, frameIndex) => frameIndex !== index);
      const nextTactics = state.tactics.map((tactic) =>
        tactic.id === state.activeTacticId ? { ...tactic, frames: cloneTacticalFrames(nextFrames) } : tactic,
      );
      saveStoredTactics(nextTactics);
      return {
        tactics: nextTactics,
        frames: nextFrames,
        currentFrameIndex: Math.min(state.currentFrameIndex, nextFrames.length),
        isPlaying: false,
        playbackFrames: null,
      };
    }),
  clearFrames: () =>
    set((state) => {
      const visibleFrame =
        state.playbackFrames?.[state.currentFrameIndex] ??
        state.frames[state.currentFrameIndex] ??
        state.frames[0] ??
        state.draftFrame;
      const nextTactics = state.tactics.map((tactic) =>
        tactic.id === state.activeTacticId ? { ...tactic, frames: [] } : tactic,
      );
      saveStoredTactics(nextTactics);
      return {
        tactics: nextTactics,
        frames: [],
        draftFrame: cloneTacticalFrame(visibleFrame),
        playbackFrames: null,
        currentFrameIndex: 0,
        isPlaying: false,
      };
    }),
  updateMarker: (id, x, y, onPitch) =>
    set((state) => {
      const updateFrame = (frame: TacticalFrame) =>
        frame.map((marker) => (marker.id === id ? { ...marker, x, y, onPitch: onPitch ?? marker.onPitch } : marker));

      return { draftFrame: updateFrame(state.draftFrame), currentFrameIndex: state.frames.length, playbackFrames: null };
    }),
  toggleLoop: () => set((state) => ({ isLooping: !state.isLooping })),
  saveTactic: () =>
    set((state) => {
      const nextTactics = state.tactics.map((tactic) =>
        tactic.id === state.activeTacticId ? { ...tactic, frames: cloneTacticalFrames(state.frames) } : tactic,
      );
      saveStoredTactics(nextTactics);
      return { tactics: nextTactics };
    }),
  createTactic: () =>
    set((state) => {
      const savedTactics = state.tactics.map((tactic) =>
        tactic.id === state.activeTacticId ? { ...tactic, frames: cloneTacticalFrames(state.frames) } : tactic,
      );
      const nextTactic: TacticalPlaybook = {
        id: createTacticalId(),
        name: `Chiến thuật ${savedTactics.length + 1}`,
        frames: [],
      };
      const nextTactics = [...savedTactics, nextTactic];
      saveStoredTactics(nextTactics);
      return {
        tactics: nextTactics,
        activeTacticId: nextTactic.id,
        frames: cloneTacticalFrames(nextTactic.frames),
        draftFrame: createInitialTacticalFrame(),
        playbackFrames: null,
        currentFrameIndex: 0,
        isPlaying: false,
      };
    }),
  loadTactic: (id) =>
    set((state) => {
      const currentSavedTactics = state.tactics.map((tactic) =>
        tactic.id === state.activeTacticId ? { ...tactic, frames: cloneTacticalFrames(state.frames) } : tactic,
      );
      const tactic = currentSavedTactics.find((item) => item.id === id);
      if (!tactic) return state;

      saveStoredTactics(currentSavedTactics);
      return {
        tactics: currentSavedTactics,
        activeTacticId: tactic.id,
        frames: cloneTacticalFrames(tactic.frames),
        draftFrame: createInitialTacticalFrame(),
        playbackFrames: null,
        currentFrameIndex: 0,
        isPlaying: false,
      };
    }),
  deleteTactic: (id) =>
    set((state) => {
      if (state.tactics.length <= 1) return state;

      const savedTactics = state.tactics.map((tactic) =>
        tactic.id === state.activeTacticId ? { ...tactic, frames: cloneTacticalFrames(state.frames) } : tactic,
      );
      const nextTactics = savedTactics.filter((tactic) => tactic.id !== id);
      const nextActive = id === state.activeTacticId ? nextTactics[0] : nextTactics.find((tactic) => tactic.id === state.activeTacticId);
      if (!nextActive) return state;

      saveStoredTactics(nextTactics);
      return {
        tactics: nextTactics,
        activeTacticId: nextActive.id,
        frames: cloneTacticalFrames(nextActive.frames),
        draftFrame: createInitialTacticalFrame(),
        playbackFrames: null,
        currentFrameIndex: 0,
        isPlaying: false,
      };
    }),
  play: () =>
    set((state) => {
      const lastFrame = state.frames[state.frames.length - 1];
      const shouldCommit = state.frames.length === 0 || !areTacticalFramesEqual(state.draftFrame, lastFrame);
      const nextFrames = shouldCommit ? [...state.frames, cloneTacticalFrame(state.draftFrame)] : state.frames;
      const nextTactics = shouldCommit
        ? state.tactics.map((tactic) =>
            tactic.id === state.activeTacticId ? { ...tactic, frames: cloneTacticalFrames(nextFrames) } : tactic,
          )
        : state.tactics;
      if (nextFrames.length === 0) return { isPlaying: false, currentFrameIndex: 0, playbackFrames: null };
      return {
        tactics: nextTactics,
        frames: nextFrames,
        isPlaying: true,
        currentFrameIndex: 0,
        isAnimationMode: true,
        playbackFrames: cloneTacticalFrames(nextFrames),
      };
    }),
  pause: () => set({ isPlaying: false, currentFrameIndex: 0, playbackFrames: null }),
  stop: () =>
    set((state) => ({
      isPlaying: false,
      currentFrameIndex: 0,
      playbackFrames: state.frames.length > 0 ? [cloneTacticalFrame(state.frames[0])] : [cloneTacticalFrame(state.draftFrame)],
    })),
  nextFrame: () =>
    set((state) => {
      if (!state.isPlaying) return state;
      const sequenceLength = state.playbackFrames?.length ?? state.frames.length;
      const nextIndex = state.currentFrameIndex + 1;
      if (nextIndex >= sequenceLength) {
        const finalFrame = state.playbackFrames?.[sequenceLength - 1] ?? state.frames[sequenceLength - 1] ?? state.draftFrame;
        if (state.isLooping) {
          return { currentFrameIndex: 0, isPlaying: true };
        }
        return {
          currentFrameIndex: state.frames.length,
          draftFrame: cloneTacticalFrame(finalFrame),
          playbackFrames: null,
          isPlaying: false,
        };
      }
      return { currentFrameIndex: nextIndex };
    }),
}));

const createOpponentMarkers = (): OpponentMarker[] =>
  Array.from({ length: 11 }, (_, index) => ({
    id: index + 1,
    x: 50,
    y: 50,
    onPitch: false,
  }));

const pitchZonesBySize: Record<PitchSize, PitchZone[]> = {
  5: [
    { name: "Left Forward", x1: 4, x2: 50, y1: 4, y2: 38 },
    { name: "Right Forward", x1: 50, x2: 96, y1: 4, y2: 38 },
    { name: "Left Midfielder", x1: 4, x2: 34, y1: 38, y2: 68 },
    { name: "Center Midfielder", x1: 34, x2: 66, y1: 38, y2: 68 },
    { name: "Right Midfielder", x1: 66, x2: 96, y1: 38, y2: 68 },
    { name: "Left Defender", x1: 4, x2: 34, y1: 68, y2: 84 },
    { name: "Center Defender", x1: 34, x2: 66, y1: 68, y2: 84 },
    { name: "Right Defender", x1: 66, x2: 96, y1: 68, y2: 84 },
    { name: "Goalkeeper", x1: 4, x2: 96, y1: 84, y2: 96 },
  ],
  7: [
  { name: "Left Forward", x1: 4, x2: 36, y1: 4, y2: 34 },
  { name: "Striker", x1: 36, x2: 64, y1: 4, y2: 34 },
  { name: "Right Forward", x1: 64, x2: 96, y1: 4, y2: 34 },
  { name: "Left Midfielder", x1: 4, x2: 34, y1: 34, y2: 62 },
  { name: "Center Midfielder", x1: 34, x2: 66, y1: 34, y2: 62 },
  { name: "Right Midfielder", x1: 66, x2: 96, y1: 34, y2: 62 },
  { name: "Left Defender", x1: 4, x2: 34, y1: 62, y2: 82 },
  { name: "Center Defender", x1: 34, x2: 66, y1: 62, y2: 82 },
  { name: "Right Defender", x1: 66, x2: 96, y1: 62, y2: 82 },
  { name: "Goalkeeper", x1: 4, x2: 96, y1: 82, y2: 96 },
  ],
  11: [
    { name: "Left Forward", x1: 4, x2: 34, y1: 4, y2: 28 },
    { name: "Striker", x1: 34, x2: 66, y1: 4, y2: 28 },
    { name: "Right Forward", x1: 66, x2: 96, y1: 4, y2: 28 },
    { name: "Left Attacking Midfielder", x1: 4, x2: 34, y1: 28, y2: 45 },
    { name: "Attacking Midfielder", x1: 34, x2: 66, y1: 28, y2: 45 },
    { name: "Right Attacking Midfielder", x1: 66, x2: 96, y1: 28, y2: 45 },
    { name: "Left Midfielder", x1: 4, x2: 30, y1: 45, y2: 62 },
    { name: "Center Midfielder", x1: 30, x2: 70, y1: 45, y2: 62 },
    { name: "Right Midfielder", x1: 70, x2: 96, y1: 45, y2: 62 },
    { name: "Left Back", x1: 4, x2: 24, y1: 62, y2: 84 },
    { name: "Left Center Back", x1: 24, x2: 50, y1: 62, y2: 84 },
    { name: "Right Center Back", x1: 50, x2: 76, y1: 62, y2: 84 },
    { name: "Right Back", x1: 76, x2: 96, y1: 62, y2: 84 },
    { name: "Goalkeeper", x1: 4, x2: 96, y1: 84, y2: 96 },
  ],
  custom: [
    { name: "Left Forward", x1: 4, x2: 34, y1: 4, y2: 28 },
    { name: "Striker", x1: 34, x2: 66, y1: 4, y2: 28 },
    { name: "Right Forward", x1: 66, x2: 96, y1: 4, y2: 28 },
    { name: "Left Midfielder", x1: 4, x2: 34, y1: 28, y2: 62 },
    { name: "Center Midfielder", x1: 34, x2: 66, y1: 28, y2: 62 },
    { name: "Right Midfielder", x1: 66, x2: 96, y1: 28, y2: 62 },
    { name: "Left Defender", x1: 4, x2: 34, y1: 62, y2: 84 },
    { name: "Center Defender", x1: 34, x2: 66, y1: 62, y2: 84 },
    { name: "Right Defender", x1: 66, x2: 96, y1: 62, y2: 84 },
    { name: "Goalkeeper", x1: 4, x2: 96, y1: 84, y2: 96 },
  ],
};

const getZoneName = (pitchSize: PitchSize, x: number, y: number) =>
  pitchZonesBySize[pitchSize].find((zone) => x >= zone.x1 && x <= zone.x2 && y >= zone.y1 && y <= zone.y2)?.name ??
  "Free Role";

const formationsBySize: Record<
  PitchSize,
  Partial<Record<FormationKey, FormationPoint[]>>
> = {
  5: {
    "1-2-1": [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 50, y: 70 },
      { id: 3, x: 35, y: 48 },
      { id: 4, x: 65, y: 48 },
      { id: 5, x: 50, y: 22 },
    ],
    "2-1-1": [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 34, y: 70 },
      { id: 3, x: 66, y: 70 },
      { id: 4, x: 50, y: 48 },
      { id: 5, x: 50, y: 22 },
    ],
    "1-1-2": [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 50, y: 70 },
      { id: 3, x: 50, y: 48 },
      { id: 4, x: 36, y: 22 },
      { id: 5, x: 64, y: 22 },
    ],
  },
  7: {
    "2-3-1": [
    { id: 1, x: 50, y: 90 },
    { id: 2, x: 34, y: 68 },
    { id: 3, x: 66, y: 68 },
    { id: 4, x: 24, y: 45 },
    { id: 5, x: 50, y: 42 },
    { id: 6, x: 76, y: 45 },
    { id: 7, x: 50, y: 20 },
    ],
    "3-2-1": [
    { id: 1, x: 50, y: 90 },
    { id: 2, x: 25, y: 68 },
    { id: 3, x: 50, y: 70 },
    { id: 4, x: 75, y: 68 },
    { id: 5, x: 38, y: 43 },
    { id: 6, x: 62, y: 43 },
    { id: 7, x: 50, y: 19 },
    ],
    "2-2-2": [
    { id: 1, x: 50, y: 90 },
    { id: 2, x: 34, y: 68 },
    { id: 3, x: 66, y: 68 },
    { id: 4, x: 34, y: 45 },
    { id: 5, x: 66, y: 45 },
    { id: 6, x: 39, y: 21 },
    { id: 7, x: 61, y: 21 },
    ],
  },
  11: {
    "4-4-2": [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 16, y: 70 },
      { id: 3, x: 38, y: 72 },
      { id: 4, x: 62, y: 72 },
      { id: 5, x: 84, y: 70 },
      { id: 6, x: 18, y: 50 },
      { id: 7, x: 40, y: 50 },
      { id: 8, x: 60, y: 50 },
      { id: 9, x: 82, y: 50 },
      { id: 10, x: 40, y: 20 },
      { id: 11, x: 60, y: 20 },
    ],
    "4-3-3": [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 16, y: 70 },
      { id: 3, x: 38, y: 72 },
      { id: 4, x: 62, y: 72 },
      { id: 5, x: 84, y: 70 },
      { id: 6, x: 30, y: 50 },
      { id: 7, x: 50, y: 48 },
      { id: 8, x: 70, y: 50 },
      { id: 9, x: 24, y: 20 },
      { id: 10, x: 50, y: 18 },
      { id: 11, x: 76, y: 20 },
    ],
    "3-5-2": [
      { id: 1, x: 50, y: 90 },
      { id: 2, x: 28, y: 72 },
      { id: 3, x: 50, y: 73 },
      { id: 4, x: 72, y: 72 },
      { id: 5, x: 14, y: 52 },
      { id: 6, x: 36, y: 50 },
      { id: 7, x: 50, y: 46 },
      { id: 8, x: 64, y: 50 },
      { id: 9, x: 86, y: 52 },
      { id: 10, x: 40, y: 20 },
      { id: 11, x: 60, y: 20 },
    ],
  },
  custom: {
    custom: [],
  },
};

const getFormationEntries = (pitchSize: PitchSize) =>
  Object.entries(formationsBySize[pitchSize]) as [FormationKey, FormationPoint[]][];

const getDefaultFormation = (pitchSize: PitchSize) => getFormationEntries(pitchSize)[0][0];

const createCustomFormationPoints = (count: number) => {
  const playerCount = Math.min(11, Math.max(1, Math.round(count)));
  const baseFive: FormationPoint[] = [
    { id: 1, x: 50, y: 90 },
    { id: 2, x: 50, y: 70 },
    { id: 3, x: 35, y: 48 },
    { id: 4, x: 65, y: 48 },
    { id: 5, x: 50, y: 22 },
  ];

  if (playerCount <= 5) {
    return baseFive.slice(0, playerCount);
  }

  const extraPoints: FormationPoint[] = [
    { id: 6, x: 24, y: 70 },
    { id: 7, x: 76, y: 70 },
    { id: 8, x: 50, y: 48 },
    { id: 9, x: 24, y: 30 },
    { id: 10, x: 76, y: 30 },
    { id: 11, x: 50, y: 14 },
  ];

  return [...baseFive, ...extraPoints].slice(0, playerCount);
};

const getFormationPoints = (pitchSize: PitchSize, formation: FormationKey, customCount = 8) =>
  pitchSize === "custom"
    ? createCustomFormationPoints(11)
    : formationsBySize[pitchSize][formation] ?? formationsBySize[pitchSize][getDefaultFormation(pitchSize)]!;

const isPitchSize = (value: unknown): value is PitchSize =>
  value === "custom" || (typeof value === "number" && pitchSizes.includes(value as PitchSize));

const createPlayers = (
  pitchSize: PitchSize,
  formation: FormationKey,
  customCount: number,
  roster?: (Pick<Player, "starterName" | "substituteName" | "extraNames"> & Partial<Pick<Player, "onPitch">>)[],
): Player[] => {
  const formationPoints = getFormationPoints(pitchSize, formation, customCount);
  return Array.from({ length: 11 }, (_, index) => {
    const id = index + 1;
    const point = formationPoints.find((item) => item.id === id) ?? { id, x: 50, y: 50 };
    const rosterPlayer = roster?.[index];

    return {
      ...point,
      position: getZoneName(pitchSize, point.x, point.y),
      starterName: rosterPlayer?.starterName ?? "",
      substituteName: rosterPlayer?.substituteName ?? "",
      extraNames: rosterPlayer?.extraNames ?? [],
      onPitch:
        pitchSize === "custom"
          ? (rosterPlayer?.onPitch ?? index < customCount)
          : (rosterPlayer?.onPitch ?? formationPoints.some((item) => item.id === id)),
    };
  });
};

const isFormationKey = (value: unknown): value is FormationKey =>
  typeof value === "string" &&
  pitchOptions.some((option) => Object.prototype.hasOwnProperty.call(formationsBySize[option.value], value));

const clampCoordinate = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(96, Math.max(4, value)) : fallback;

const clampDrawCoordinate = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : fallback;

const clampCustomCount = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(11, Math.max(0, Math.round(value))) : 0;

const createOpponentMarkersFromSharedLineup = (sharedLineup: SharedLineup): OpponentMarker[] => {
  const sharedMarkers = Array.isArray(sharedLineup.opponentMarkers) ? sharedLineup.opponentMarkers : [];

  return createOpponentMarkers().map((marker) => {
    const sharedMarker = sharedMarkers.find((item) => item.id === marker.id);
    return sharedMarker
      ? {
          id: marker.id,
          x: clampCoordinate(sharedMarker.x, marker.x),
          y: clampCoordinate(sharedMarker.y, marker.y),
          onPitch: Boolean(sharedMarker.onPitch),
        }
      : marker;
  });
};

const createDrawLinesFromSharedLineup = (sharedLineup: SharedLineup): DrawLine[] =>
  Array.isArray(sharedLineup.drawLines)
    ? sharedLineup.drawLines
        .filter((line) => typeof line?.id === "number" && Array.isArray(line.points))
        .map((line) => ({
          id: line.id,
          points: line.points
            .filter((point) => typeof point?.x === "number" && typeof point?.y === "number")
            .map((point) => ({
              x: clampDrawCoordinate(point.x, 50),
              y: clampDrawCoordinate(point.y, 50),
            })),
        }))
        .filter((line) => line.points.length > 0)
    : [];

const createPlayersFromSharedLineup = (sharedLineup: SharedLineup): Player[] => {
  const pitchSize = sharedLineup.pitchSize ?? 7;
  const customCount = clampCustomCount(sharedLineup.customCount);
  const formationPoints = getFormationPoints(pitchSize, sharedLineup.formation, customCount);
  return Array.from({ length: 11 }, (_, index) => {
    const id = index + 1;
    const point = formationPoints.find((item) => item.id === id) ?? { id, x: 50, y: 50 };
    const sharedPlayer = sharedLineup.players.find((player) => player.id === point.id);
    const x = clampCoordinate(sharedPlayer?.x, point.x);
    const y = clampCoordinate(sharedPlayer?.y, point.y);

    return {
      ...point,
      x,
      y,
      position: getZoneName(pitchSize, x, y),
      starterName: sharedPlayer?.starterName ?? "",
      substituteName: sharedPlayer?.substituteName ?? "",
      extraNames: Array.isArray(sharedPlayer?.extraNames) ? sharedPlayer.extraNames : [],
      onPitch:
        typeof sharedPlayer?.onPitch === "boolean"
          ? sharedPlayer.onPitch
          : pitchSize === "custom"
            ? point.id <= customCount
            : formationPoints.some((item) => item.id === point.id),
    };
  });
};

const encodeSharePayload = (
  pitchSize: PitchSize,
  formation: FormationKey,
  customCount: number,
  players: Player[],
  opponentMarkers: OpponentMarker[],
  drawLines: DrawLine[],
  animationFrames: TacticalFrame[] = [],
  currentMode: WorkspaceMode = pitchSize === "custom" ? "CUSTOM" : "LINEUP",
) => {
  const payload: SharedLineup = {
    version: 2,
    currentMode,
    pitchSize,
    customCount: pitchSize === "custom" ? customCount : undefined,
    formation,
    players: players.map(({ id, starterName, substituteName, extraNames, x, y, onPitch }) => ({
      id,
      starterName,
      substituteName,
      extraNames,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      onPitch,
    })),
    opponentMarkers: opponentMarkers.map(({ id, x, y, onPitch }) => ({
      id,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      onPitch,
    })),
    drawLines: drawLines.map((line) => ({
      id: line.id,
      points: line.points.map((point) => ({
        x: Math.round(point.x * 10) / 10,
        y: Math.round(point.y * 10) / 10,
      })),
    })),
    animationFrames: cloneTacticalFrames(animationFrames),
  };
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};

const decodeSharePayload = (value: string): SharedLineup | null => {
  try {
    const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(paddedBase64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<SharedLineup>;

    const pitchSize = isPitchSize(parsed.pitchSize) ? parsed.pitchSize : 7;

    if (!isFormationKey(parsed.formation) || !formationsBySize[pitchSize][parsed.formation] || !Array.isArray(parsed.players)) {
      return null;
    }

    return {
      version: parsed.version === 2 ? 2 : 1,
      currentMode:
        parsed.currentMode === "LINEUP" || parsed.currentMode === "CUSTOM" || parsed.currentMode === "ANIMATION"
          ? parsed.currentMode
          : pitchSize === "custom"
            ? "CUSTOM"
            : "LINEUP",
      pitchSize,
      customCount: clampCustomCount(parsed.customCount),
      formation: parsed.formation,
      players: parsed.players.filter((player) => typeof player?.id === "number") as SharedLineup["players"],
      opponentMarkers: Array.isArray(parsed.opponentMarkers) ? parsed.opponentMarkers : [],
      drawLines: Array.isArray(parsed.drawLines) ? parsed.drawLines : [],
      animationFrames: Array.isArray(parsed.animationFrames)
        ? (parsed.animationFrames.map(normalizeTacticalFrame).filter(Boolean) as TacticalFrame[])
        : [],
    };
  } catch {
    return null;
  }
};

const getSharedLineupFromUrl = () => {
  const value = new URLSearchParams(window.location.search).get("lineup");
  return value ? decodeSharePayload(value) : null;
};

const getInitialAppTab = (): AppTab => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("tab") === "profile") return "profile";
  if (params.get("tab") === "locker") return "locker";
  if (params.get("tab") === "tactics" || params.has("tactics")) return "tactics";
  return "lineup";
};

const getPitchSizeFromUrl = (): PitchSize | null => {
  const value = new URLSearchParams(window.location.search).get("pitch");
  if (value === "custom") return "custom";
  const numericValue = Number(value);
  return isPitchSize(numericValue) ? numericValue : null;
};

const hasAppRoute = () => {
  const params = new URLSearchParams(window.location.search);
  return (
    Boolean(params.get("lineup") || params.get("tab") || params.has("tactics")) ||
    window.location.hash.includes("type=recovery") ||
    window.location.hash.includes("error")
  );
};

const getInitialWorkspaceMode = (sharedLineup: SharedLineup | null, initialPitchSize: PitchSize): WorkspaceMode => {
  const params = new URLSearchParams(window.location.search);
  if (sharedLineup?.currentMode) return sharedLineup.currentMode;
  if (params.get("tab") === "tactics" || params.has("tactics")) return "ANIMATION";
  return initialPitchSize === "custom" ? "CUSTOM" : "LINEUP";
};

const getRegisteredNames = (player: Player) =>
  [player.starterName, player.substituteName, ...player.extraNames].map((name) => name.trim()).filter(Boolean);

const getBenchNames = (player: Player) =>
  [player.substituteName, ...player.extraNames].map((name) => name.trim()).filter(Boolean);

const getBenchCount = (players: Player[]) => players.reduce((total, player) => total + getBenchNames(player).length, 0);

const positionTranslations: Record<string, string> = {
  "Left Forward": "Tiền đạo trái",
  Striker: "Tiền đạo",
  "Right Forward": "Tiền đạo phải",
  "Left Attacking Midfielder": "Tiền vệ tấn công trái",
  "Attacking Midfielder": "Tiền vệ tấn công",
  "Right Attacking Midfielder": "Tiền vệ tấn công phải",
  "Left Midfielder": "Tiền vệ trái",
  "Center Midfielder": "Tiền vệ trung tâm",
  "Right Midfielder": "Tiền vệ phải",
  "Left Back": "Hậu vệ cánh trái",
  "Left Center Back": "Trung vệ lệch trái",
  "Right Center Back": "Trung vệ lệch phải",
  "Right Back": "Hậu vệ cánh phải",
  "Left Defender": "Hậu vệ trái",
  "Center Defender": "Hậu vệ trung tâm",
  "Right Defender": "Hậu vệ phải",
  Goalkeeper: "Thủ môn",
  "Center Back": "Trung vệ",
  "Left Wing": "Cánh trái",
  "Right Wing": "Cánh phải",
  "Free Role": "Tự do",
  Custom: "Tự tạo",
};

const getDisplayPosition = (position: string, language: Language) =>
  language === "vi" ? (positionTranslations[position] ?? position) : position;

const getDisplayTacticName = (name: string, index: number, copy: AppCopy) => {
  const tacticNumber = name.match(/^(?:Chiến thuật|Tactic)\s+(\d+)$/i)?.[1] ?? `${index + 1}`;
  return `${copy.tacticName} ${tacticNumber}`;
};

function TacticalBoard({
  copy,
  onSaveToLocker,
  isSavingToLocker,
  lockerStatus,
}: {
  copy: AppCopy;
  onSaveToLocker: () => void;
  isSavingToLocker: boolean;
  lockerStatus: string;
}) {
  const {
    frames,
    draftFrame,
    playbackFrames,
    tactics,
    activeTacticId,
    currentFrameIndex,
    isPlaying,
    isLooping,
    selectFrame,
    addFrame,
    removeFrame,
    clearFrames,
    updateMarker,
    toggleLoop,
    saveTactic,
    createTactic,
    loadTactic,
    deleteTactic,
    play,
    pause,
    stop,
    nextFrame,
  } = useTacticalStore();
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);
  const [recentlyDroppedMarkerId, setRecentlyDroppedMarkerId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<TacticalMarker | null>(null);
  const [dragPreviewPosition, setDragPreviewPosition] = useState<{ x: number; y: number } | null>(null);
  const [tacticStatus, setTacticStatus] = useState<"idle" | "saved" | "copied">("idle");
  const [snapPlaybackStart, setSnapPlaybackStart] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const dropTimerRef = useRef<number | null>(null);
  const activeFrame = playbackFrames ? (playbackFrames[currentFrameIndex] ?? playbackFrames[0]) : (frames[currentFrameIndex] ?? frames[0] ?? draftFrame);
  const activeTacticalMarkers = activeFrame.filter((marker) => marker.onPitch);
  const trayPlayers = activeFrame.filter((marker) => marker.type === "player" && !marker.onPitch);
  const trayOpponents = activeFrame.filter((marker) => marker.type === "opponent" && !marker.onPitch);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setTimeout(nextFrame, 900);
    return () => window.clearTimeout(timer);
  }, [currentFrameIndex, isPlaying, nextFrame]);

  useEffect(() => {
    return () => {
      if (dropTimerRef.current) {
        window.clearTimeout(dropTimerRef.current);
      }
    };
  }, []);

  const getBoardPointerPosition = (event: ReactPointerEvent<HTMLElement>) => {
    const board = boardRef.current;
    if (!board) return null;

    const rect = board.getBoundingClientRect();
    const rawX = ((event.clientX - rect.left) / rect.width) * 100;
    const rawY = ((event.clientY - rect.top) / rect.height) * 100;
    return {
      isInside: rawX >= 0 && rawX <= 100 && rawY >= 0 && rawY <= 100,
      x: Math.min(96, Math.max(4, rawX)),
      y: Math.min(96, Math.max(4, rawY)),
    };
  };

  const moveMarker = (event: ReactPointerEvent<HTMLElement>, id: string) => {
    if (draggingMarkerId !== id || isPlaying) return;

    const position = getBoardPointerPosition(event);
    if (!position) return;

    const marker = activeFrame.find((item) => item.id === id);
    if (marker) {
      setDragPreview(marker);
      setDragPreviewPosition({ x: event.clientX, y: event.clientY });
      updateMarker(id, position.x, position.y);
      return;
    }
  };

  const startMarkerDrag = (event: ReactPointerEvent<HTMLElement>, id: string) => {
    if (isPlaying) return;
    const marker = activeFrame.find((item) => item.id === id);
    if (!marker) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingMarkerId(id);
    setDragPreview(marker);
    setDragPreviewPosition({ x: event.clientX, y: event.clientY });
  };

  const stopMarkerDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const id = draggingMarkerId;
    if (id) {
      const position = getBoardPointerPosition(event);
      if (position) {
        const marker = activeFrame.find((item) => item.id === id);
        const nextOnPitch = marker?.type === "ball" ? true : position.isInside;
        setRecentlyDroppedMarkerId(id);
        if (dropTimerRef.current) {
          window.clearTimeout(dropTimerRef.current);
        }
        dropTimerRef.current = window.setTimeout(() => {
          setRecentlyDroppedMarkerId((currentId) => (currentId === id ? null : currentId));
          dropTimerRef.current = null;
        }, 120);
        updateMarker(id, position.x, position.y, nextOnPitch);
      }
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingMarkerId(null);
    setDragPreview(null);
    setDragPreviewPosition(null);
  };

  const saveActiveTacticToLocker = () => {
    saveTactic();
    setTacticStatus("saved");
    window.setTimeout(() => setTacticStatus("idle"), 1600);
    onSaveToLocker();
  };

  const playFromFirstStep = () => {
    setSnapPlaybackStart(true);
    play();
    window.setTimeout(() => setSnapPlaybackStart(false), 120);
  };

  const shareTactics = async () => {
    const nextTactics = tactics.map((tactic) =>
      tactic.id === activeTacticId ? { ...tactic, frames: cloneTacticalFrames(frames) } : tactic,
    );
    saveStoredTactics(nextTactics);
    useTacticalStore.setState({ tactics: nextTactics });

    const url = new URL(window.location.href);
    url.searchParams.set("tactics", encodeTacticalPayload(nextTactics));
    url.searchParams.set("tab", "tactics");
    url.searchParams.delete("lineup");

    try {
      await navigator.clipboard.writeText(url.toString());
      setTacticStatus("copied");
      window.setTimeout(() => setTacticStatus("idle"), 1800);
    } catch {
    window.prompt(`${copy.shareAll}`, url.toString());
    }
  };

  return (
    <section className="tactical-shell">
      <aside className="tactical-panel">
        <div className="panel-heading">
          <span>{copy.tacticalTitle}</span>
          <strong>{frames.length} {copy.framesUnit}</strong>
        </div>
        <div className="tactical-controls">
          <button type="button" onClick={playFromFirstStep} disabled={frames.length < 1 || isPlaying}>
            {copy.play}
          </button>
          <button type="button" onClick={pause} disabled={!isPlaying}>
            {copy.pause}
          </button>
          <button type="button" onClick={stop}>
            {copy.stop}
          </button>
          <button type="button" onClick={toggleLoop} className={isLooping ? "active" : ""} aria-pressed={isLooping}>
            {copy.loop}
          </button>
        </div>
        <div className="tactical-timeline" aria-label={copy.tacticalTimeline}>
          {frames.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => selectFrame(index)}
              className={currentFrameIndex === index ? "active" : ""}
            >
              {copy.frame} {index + 1}
              {frames.length > 0 ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeFrame(index);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      removeFrame(index);
                    }
                  }}
                  aria-label={`${copy.delete} ${copy.frame} ${index + 1}`}
                >
                  x
                </span>
              ) : null}
            </button>
          ))}
          <button type="button" className="add-frame-button" onClick={addFrame}>
            <Plus size={14} />
            {copy.addFrame}
          </button>
          <button type="button" className="clear-frames-button" onClick={clearFrames} disabled={frames.length === 0}>
            <Trash2 size={14} />
            {copy.clearAll}
          </button>
        </div>
        <p className="tactical-help">
          {copy.tacticalHelp}
        </p>
      </aside>

      <div className="tactical-stage">
        <div className="tactical-side-tray">
          <div className="tactical-tray">
            <span>{copy.players}</span>
            <div className="tactical-tray-list">
              {trayPlayers.map((marker) => (
                <button
                  key={marker.id}
                  type="button"
                  className="tactical-tray-dot"
                  onPointerDown={(event) => startMarkerDrag(event, marker.id)}
                  onPointerMove={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) moveMarker(event, marker.id);
                  }}
                  onPointerUp={stopMarkerDrag}
                  onPointerCancel={stopMarkerDrag}
                >
                  {marker.label}
                </button>
              ))}
            </div>
          </div>
          <div className="tactical-tray">
            <span>{copy.opponent}</span>
            <div className="tactical-tray-list">
              {trayOpponents.map((marker) => (
                <button
                  key={marker.id}
                  type="button"
                  className="tactical-tray-dot opponent"
                  onPointerDown={(event) => startMarkerDrag(event, marker.id)}
                  onPointerMove={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) moveMarker(event, marker.id);
                  }}
                  onPointerUp={stopMarkerDrag}
                  onPointerCancel={stopMarkerDrag}
                />
              ))}
            </div>
          </div>
        </div>
        <div ref={boardRef} className="tactical-pitch">
          <div className="absolute inset-[4%] border-[3px] border-white/90" />
          <div className="absolute left-[4%] right-[4%] top-1/2 h-[3px] -translate-y-1/2 bg-white/90" />
          <div className="absolute left-1/2 top-1/2 h-[22%] w-[31%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white/90" />
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
          <div className="absolute left-1/2 top-[4%] h-[15%] w-[48%] -translate-x-1/2 border-x-[3px] border-b-[3px] border-white/90" />
          <div className="absolute left-1/2 top-[4%] h-[7%] w-[26%] -translate-x-1/2 border-x-[3px] border-b-[3px] border-white/90" />
          <div className="absolute bottom-[4%] left-1/2 h-[15%] w-[48%] -translate-x-1/2 border-x-[3px] border-t-[3px] border-white/90" />
          <div className="absolute bottom-[4%] left-1/2 h-[7%] w-[26%] -translate-x-1/2 border-x-[3px] border-t-[3px] border-white/90" />

          {activeTacticalMarkers.map((marker) => (
            <motion.div
              key={marker.id}
              className={`tactical-marker-shell ${draggingMarkerId === marker.id ? "is-dragging" : ""}`}
              initial={false}
              animate={{ left: `${marker.x}%`, top: `${marker.y}%` }}
              transition={
                draggingMarkerId === marker.id || recentlyDroppedMarkerId === marker.id || snapPlaybackStart
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 95, damping: 18, mass: 0.7 }
              }
              onPointerDown={(event) => startMarkerDrag(event, marker.id)}
              onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) moveMarker(event, marker.id);
              }}
              onPointerUp={stopMarkerDrag}
              onPointerCancel={stopMarkerDrag}
              role="button"
              tabIndex={0}
              aria-label={marker.type === "ball" ? copy.dragBall : `${copy.dragPlayer} ${marker.label}`}
            >
              <span
                className={`tactical-marker ${marker.type === "ball" ? "ball-marker" : ""} ${
                  marker.type === "opponent" ? "opponent-marker" : ""
                }`}
              >
                {marker.type === "ball" || marker.type === "opponent" ? null : marker.label}
              </span>
            </motion.div>
          ))}
        </div>
        {dragPreview && dragPreviewPosition ? (
          <div
            className={`tactical-drag-preview ${dragPreview.type === "opponent" ? "opponent" : ""} ${
              dragPreview.type === "ball" ? "ball" : ""
            }`}
            style={{ left: dragPreviewPosition.x, top: dragPreviewPosition.y }}
            aria-hidden="true"
          >
            {dragPreview.type === "player" ? dragPreview.label : null}
          </div>
        ) : null}
      </div>
      <aside className="tactic-library-panel">
        <div className="panel-heading">
          <span>{copy.tacticListTitle}</span>
          <strong>{tactics.length} {copy.tacticUnit}</strong>
        </div>
        <div className="tactic-library">
          <div className="tactic-library-actions">
            <button type="button" className="save-button" onClick={saveActiveTacticToLocker} disabled={isSavingToLocker}>
              {isSavingToLocker ? (
                <ButtonSpinner />
              ) : lockerStatus === copy.saved || tacticStatus === "saved" ? (
                <Check size={14} />
              ) : (
                <Save size={14} />
              )}
              {lockerStatus === copy.saved || tacticStatus === "saved" ? copy.saved : copy.save}
            </button>
            <button type="button" onClick={createTactic}>
              <Plus size={14} />
              {copy.newTactic}
            </button>
            <button type="button" onClick={shareTactics}>
              <Clipboard size={14} />
              {tacticStatus === "copied" ? copy.copied : copy.share}
            </button>
          </div>
          <div className="tactic-list" aria-label={copy.savedTactics}>
            {tactics.map((tactic, index) => (
              <button
                key={tactic.id}
                type="button"
                className={tactic.id === activeTacticId ? "active" : ""}
                onClick={() => loadTactic(tactic.id)}
              >
                <span>{getDisplayTacticName(tactic.name, index, copy)}</span>
                <small>{tactic.id === activeTacticId ? frames.length : tactic.frames.length} {copy.framesUnit}</small>
                {tactics.length > 1 ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteTactic(tactic.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        deleteTactic(tactic.id);
                      }
                    }}
                    aria-label={`${copy.delete} ${getDisplayTacticName(tactic.name, index, copy)}`}
                  >
                    <Trash2 size={13} />
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </section>
  );
}

type LockerCategory = "all" | "5" | "7" | "11" | "custom" | "tactics";

function App({ initialLanguage = "vi" }: { initialLanguage?: Language }) {
  const { user, isAuthLoading, signOut, isPasswordRecovery, authHashError, clearPasswordRecovery } = useAuth();
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
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [draggingOpponentId, setDraggingOpponentId] = useState<number | null>(null);
  const [draggingTacticalMarkerId, setDraggingTacticalMarkerId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<{ type: "player" | "opponent" | "ball"; id: number | string; x: number; y: number } | null>(
    null,
  );
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [isMobileSquadDrawerOpen, setIsMobileSquadDrawerOpen] = useState(false);
  const [drawLines, setDrawLines] = useState<DrawLine[]>(() => initialDrawLines);
  const [savedDrawLinesByPitch, setSavedDrawLinesByPitch] = useState<Partial<Record<PitchSize, DrawLine[]>>>(() => ({
    [initialPitchSize]: initialDrawLines,
  }));
  const [redoDrawLines, setRedoDrawLines] = useState<DrawLine[]>([]);
  const [activeDrawLineId, setActiveDrawLineId] = useState<number | null>(null);
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
  const [lastWorkspaceTab, setLastWorkspaceTab] = useState<"lineup" | "tactics">("lineup");
  const [isLineupMenuOpen, setIsLineupMenuOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [authMode, setAuthMode] = useState<"sign_in" | "sign_up" | "reset">("sign_in");
  const [isAuthScreenOpen, setIsAuthScreenOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isGoogleAuthLoading, setIsGoogleAuthLoading] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryConfirm, setRecoveryConfirm] = useState("");
  const [recoveryStatus, setRecoveryStatus] = useState("");
  const [recoveryDone, setRecoveryDone] = useState(false);
  const [isRecoverySubmitting, setIsRecoverySubmitting] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [profileUsername, setProfileUsername] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [profileFullName, setProfileFullName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileFavoriteTeam, setProfileFavoriteTeam] = useState("");
  const [profileFavoritePosition, setProfileFavoritePosition] = useState("");
  const [profileLocation, setProfileLocation] = useState("");
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [lineupName, setLineupName] = useState("");
  const [savedLineups, setSavedLineups] = useState<SavedLineupRecord[]>([]);
  const [lockerCategory, setLockerCategory] = useState<LockerCategory>("all");
  const [lockerStatus, setLockerStatus] = useState("");
  const [isLockerLoading, setIsLockerLoading] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [deletingLineupId, setDeletingLineupId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: number; message: string; tone: "success" | "error" }[]>([]);
  const toastIdRef = useRef(0);
  const showToast = (message: string, tone: "success" | "error" = "success") => {
    if (!message) return;
    const id = (toastIdRef.current += 1);
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3000);
  };
  const userMenuRef = useRef<HTMLDivElement>(null);
  const lineupMenuRef = useRef<HTMLDivElement>(null);
  const pitchRef = useRef<HTMLDivElement>(null);
  const drawLayerRef = useRef<SVGSVGElement>(null);
  const frameListRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const frameListDragRef = useRef<{ pointerId: number; x: number; scrollLeft: number; moved: boolean } | null>(null);
  const wasAnimationPlayingRef = useRef(false);
  const playbackStartTimerRef = useRef<number | null>(null);
  const activePlayers = players.filter((player) => player.onPitch);
  const benchCount = getBenchCount(activePlayers);
  const copy = copyByLanguage[language];
  const languageMeta =
    language === "vi" ? { flag: "🇻🇳", label: "VI", next: "en" as const } : { flag: "🇺🇸", label: "EN", next: "vi" as const };
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

  const writeAppRoute = (nextTab: AppTab, nextPitchSize: PitchSize = pitchSize, replace = false) => {
    const url = new URL(window.location.href);
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    url.searchParams.set("tab", nextTab);
    if (nextTab === "lineup") {
      url.searchParams.set("pitch", String(nextPitchSize));
    }
    if (nextTab === "tactics") {
      url.searchParams.set("tab", "tactics");
    }
    const nextUrl = url.toString();
    if (nextUrl === window.location.href) return;
    if (replace) {
      window.history.replaceState({ tab: nextTab }, "", nextUrl);
    } else {
      window.history.pushState({ tab: nextTab }, "", nextUrl);
    }
  };

  const syncAppRouteFromUrl = () => {
    const nextTab = getInitialAppTab();
    const nextPitchSize = getPitchSizeFromUrl();
    setActiveTab(nextTab);
    if (nextTab === "lineup" && nextPitchSize && nextPitchSize !== pitchSize) {
      applyPitchSize(nextPitchSize, { updateUrl: false });
    }
    if (nextTab === "tactics") {
      setLastWorkspaceTab("tactics");
      setCurrentMode("ANIMATION");
      setActiveTool("ANIMATION_TOOL");
      setActiveBottomSheetTool("ANIMATION_TOOL");
    } else if (nextTab === "lineup") {
      setLastWorkspaceTab("lineup");
    }
    setIsLineupMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  useEffect(() => {
    window.addEventListener("popstate", syncAppRouteFromUrl);
    return () => window.removeEventListener("popstate", syncAppRouteFromUrl);
  }, [pitchSize, savedPlayersByPitch, savedFormationByPitch, savedCustomCountByPitch, savedOpponentMarkersByPitch, savedDrawLinesByPitch]);

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

  useEffect(() => {
    if (!isPlaying || !isAnimationTool) return;
    const timer = window.setTimeout(nextFrame, 900);
    return () => window.clearTimeout(timer);
  }, [currentFrameIndex, isAnimationTool, isPlaying, nextFrame]);

  useEffect(() => {
    return () => {
      if (playbackStartTimerRef.current) {
        window.clearTimeout(playbackStartTimerRef.current);
      }
    };
  }, []);

  const clearPlaybackStartTimer = () => {
    if (!playbackStartTimerRef.current) return;
    window.clearTimeout(playbackStartTimerRef.current);
    playbackStartTimerRef.current = null;
  };

  const playAnimationFromStart = () => {
    clearPlaybackStartTimer();
    const committedFrames = commitDraftIfChanged();
    const nextFrames = committedFrames.length > 0 ? committedFrames : useTacticalStore.getState().frames;
    if (nextFrames.length === 0) return;

    const playbackFramesFromStart = cloneTacticalFrames(nextFrames);
    useTacticalStore.setState({
      playbackFrames: [cloneTacticalFrame(playbackFramesFromStart[0])],
      currentFrameIndex: 0,
      isPlaying: false,
      isAnimationMode: true,
    });

    playbackStartTimerRef.current = window.setTimeout(() => {
      useTacticalStore.setState({
        playbackFrames: playbackFramesFromStart,
        currentFrameIndex: 0,
        isPlaying: true,
        isAnimationMode: true,
      });
      playbackStartTimerRef.current = null;
    }, 80);
  };

  const stopAnimationPlayback = () => {
    clearPlaybackStartTimer();
    stop();
  };

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

  const deleteFrameFromList = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const index = Number(event.currentTarget.dataset.frameIndex);
    if (!Number.isInteger(index)) return;
    removeFrame(index);
  };

  useEffect(() => {
    const finishedPlayback = wasAnimationPlayingRef.current && !isPlaying && currentFrameIndex >= animationFrames.length;
    wasAnimationPlayingRef.current = isPlaying;
    if (!isAnimationTool || !finishedPlayback) return;

    setPlayers((current) =>
      current.map((player) => {
        const marker = draftFrame.find((item) => item.id === `p${player.id}`);
        if (!marker) return player;
        return {
          ...player,
          x: marker.x,
          y: marker.y,
          position: getZoneName(pitchSize, marker.x, marker.y),
          onPitch: marker.onPitch,
        };
      }),
    );
    setOpponentMarkers((current) =>
      current.map((marker) => {
        const frameMarker = draftFrame.find((item) => item.id === `o${marker.id}`);
        if (!frameMarker) return marker;
        return {
          ...marker,
          x: frameMarker.x,
          y: frameMarker.y,
          onPitch: frameMarker.onPitch,
        };
      }),
    );
  }, [animationFrames.length, currentFrameIndex, draftFrame, isAnimationTool, isPlaying, pitchSize]);

  const switchAppTab = (nextTab: AppTab, options: { updateUrl?: boolean } = {}) => {
    if (nextTab === "lineup" || nextTab === "tactics") {
      setLastWorkspaceTab(nextTab);
    }
    setActiveTab(nextTab);
    setIsLineupMenuOpen(false);
    setIsUserMenuOpen(false);
    if (options.updateUrl !== false) {
      writeAppRoute(nextTab);
    }
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
    setLastWorkspaceTab(nextMode === "ANIMATION" ? "tactics" : "lineup");
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

  useEffect(() => {
    if (!isUserMenuOpen && !isLineupMenuOpen) return;

    const closeDropdownsOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (isUserMenuOpen && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }

      if (isLineupMenuOpen && lineupMenuRef.current && !lineupMenuRef.current.contains(target)) {
        setIsLineupMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeDropdownsOnOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", closeDropdownsOnOutsidePointerDown);
  }, [isUserMenuOpen, isLineupMenuOpen]);

  const createLineupThumbnail = () => {
    const canvas = document.createElement("canvas");
    const width = 360;
    const height = 514;
    const padding = 24;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return undefined;

    const fieldGradient = context.createLinearGradient(0, 0, width, height);
    fieldGradient.addColorStop(0, "#38aa52");
    fieldGradient.addColorStop(0.55, "#2d9348");
    fieldGradient.addColorStop(1, "#267d3d");
    context.fillStyle = fieldGradient;
    context.fillRect(0, 0, width, height);

    const stripeHeight = 45;
    for (let y = 0; y < height; y += stripeHeight * 2) {
      context.fillStyle = "rgba(255,255,255,0.055)";
      context.fillRect(0, y, width, stripeHeight);
      context.fillStyle = "rgba(0,0,0,0.04)";
      context.fillRect(0, y + stripeHeight, width, stripeHeight);
    }

    const pitchWidth = width - padding * 2;
    const pitchHeight = height - padding * 2;
    const px = (value: number) => padding + (value / 100) * pitchWidth;
    const py = (value: number) => padding + (value / 100) * pitchHeight;
    const pw = (value: number) => (value / 100) * pitchWidth;
    const ph = (value: number) => (value / 100) * pitchHeight;

    context.strokeStyle = "rgba(255,255,255,0.88)";
    context.lineWidth = 2;
    context.strokeRect(px(4), py(4), pw(92), ph(92));
    context.beginPath();
    context.moveTo(px(4), py(50));
    context.lineTo(px(96), py(50));
    context.stroke();
    context.beginPath();
    context.ellipse(px(50), py(50), pw(15.5), ph(11), 0, 0, Math.PI * 2);
    context.stroke();
    context.strokeRect(px(26), py(4), pw(48), ph(15));
    context.strokeRect(px(37), py(4), pw(26), ph(7));
    context.strokeRect(px(26), py(81), pw(48), ph(15));
    context.strokeRect(px(37), py(89), pw(26), ph(7));

    if (showAllCanvasObjects) {
      drawLines.forEach((line) => {
        if (line.points.length < 2) return;
        context.save();
        context.strokeStyle = "#facc15";
        context.lineWidth = 2;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.beginPath();
        context.moveTo(px(line.points[0].x), py(line.points[0].y));
        line.points.slice(1).forEach((point) => context.lineTo(px(point.x), py(point.y)));
        context.stroke();
        context.restore();
      });
    }

    activePlayers.forEach((player) => {
      const x = px(player.x);
      const y = py(player.y);
      const starterName = player.starterName.trim() || `${copy.player} ${player.id}`;

      context.save();
      context.shadowColor = "rgba(0,0,0,0.35)";
      context.shadowBlur = 4;
      context.shadowOffsetY = 2;
      context.fillStyle = "#f8fafc";
      context.beginPath();
      context.arc(x, y, 14, 0, Math.PI * 2);
      context.fill();
      context.shadowColor = "transparent";
      context.strokeStyle = "#ffffff";
      context.lineWidth = 2;
      context.stroke();
      context.fillStyle = "#111827";
      context.font = "950 12px Inter, Arial, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(String(player.id), x, y + 0.5);
      context.restore();

      context.save();
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = "900 8px Inter, Arial, sans-serif";
      const nameWidth = Math.min(78, Math.max(46, starterName.length * 4.8));
      context.fillStyle = "rgba(16, 42, 25, 0.6)";
      context.beginPath();
      context.roundRect(x - nameWidth / 2, y + 18, nameWidth, 16, 8);
      context.fill();
      context.fillStyle = "#ffffff";
      context.fillText(starterName.toUpperCase(), x, y + 26, nameWidth - 8);
      context.restore();
    });

    if (showAllCanvasObjects) {
      opponentMarkers
        .filter((marker) => marker.onPitch)
        .forEach((marker) => {
          context.save();
          context.fillStyle = "#dc2626";
          context.strokeStyle = "#ffffff";
          context.lineWidth = 2;
          context.beginPath();
          context.arc(px(marker.x), py(marker.y), 8, 0, Math.PI * 2);
          context.fill();
          context.stroke();
          context.restore();
        });
    }

    return canvas.toDataURL("image/jpeg", 0.78);
  };

  const getCurrentLineupState = (metadata: Partial<Pick<StoredLineupState, "thumbnailDataUrl" | "savedAt">> = {}): StoredLineupState => {
    const animationFrames = commitDraftIfChanged();
    return {
      version: 1,
      kind: "unified",
      currentMode,
      pitchSize,
      formation,
      customCount,
      players,
      savedPlayersByPitch: {
        ...savedPlayersByPitch,
        [pitchSize]: players,
      },
      savedFormationByPitch: {
        ...savedFormationByPitch,
        [pitchSize]: formation,
      },
      savedCustomCountByPitch: {
        ...savedCustomCountByPitch,
        [pitchSize]: customCount,
      },
      opponentMarkers,
      savedOpponentMarkersByPitch: {
        ...savedOpponentMarkersByPitch,
        [pitchSize]: opponentMarkers,
      },
      drawLines,
      savedDrawLinesByPitch: {
        ...savedDrawLinesByPitch,
        [pitchSize]: drawLines,
      },
      animationFrames,
      ...metadata,
    };
  };

  const fetchSavedLineups = async () => {
    if (!supabase || !user) {
      setSavedLineups([]);
      return;
    }

    setIsLockerLoading(true);
    const { data, error } = await supabase
      .from("lineups")
      .select("id,user_id,name,format,players_data,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setLockerStatus(getSupabaseErrorMessage(error, copy));
    } else {
      setSavedLineups((data ?? []) as SavedLineupRecord[]);
    }
    setIsLockerLoading(false);
  };

  const fetchProfile = async () => {
    if (!supabase || !user) {
      setProfile(null);
      setProfileUsername("");
      setProfileAvatarUrl("");
      setProfileFullName("");
      setProfileBio("");
      setProfileFavoriteTeam("");
      setProfileFavoritePosition("");
      setProfileLocation("");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id,username,avatar_url,full_name,bio,favorite_team,favorite_position,location")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      setLockerStatus(getSupabaseErrorMessage(error, copy));
      return;
    }

    const nextProfile = data as ProfileRecord | null;
    setProfile(nextProfile);
    setProfileUsername(nextProfile?.username ?? user.user_metadata?.username ?? user.email?.split("@")[0] ?? "");
    setProfileAvatarUrl(nextProfile?.avatar_url ?? user.user_metadata?.avatar_url ?? "");
    setProfileFullName(nextProfile?.full_name ?? user.user_metadata?.full_name ?? "");
    setProfileBio(nextProfile?.bio ?? "");
    setProfileFavoriteTeam(nextProfile?.favorite_team ?? "");
    setProfileFavoritePosition(nextProfile?.favorite_position ?? "");
    setProfileLocation(nextProfile?.location ?? "");
  };

  useEffect(() => {
    fetchSavedLineups();
    fetchProfile();
  }, [user?.id]);

  useEffect(() => {
    if (resetCooldown <= 0) return;
    const intervalId = window.setInterval(() => {
      setResetCooldown((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(intervalId);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [resetCooldown > 0]);

  const getEmailProviders = async (email: string) => {
    if (!supabase) return null;
    const { data, error } = await supabase.rpc("email_auth_providers", { p_email: email });
    if (error) {
      // RPC missing or failed: degrade gracefully (don't block the flow).
      console.error("email_auth_providers error:", error.message);
      return null;
    }
    return data as { account_exists: boolean; has_password: boolean; has_google: boolean } | null;
  };

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setAuthStatus(copy.supabaseMissing);
      return;
    }

    setAuthStatus("");
    const email = authEmail.trim().toLowerCase();
    const password = authPassword.trim();

    if (!isValidEmail(email)) {
      setAuthStatus(copy.invalidEmail);
      return;
    }

    if (authMode !== "reset" && password.length < 6) {
      setAuthStatus(copy.passwordTooShort);
      return;
    }

    setIsAuthSubmitting(true);
    if (authMode === "reset") {
      const providers = await getEmailProviders(email);
      if (providers?.account_exists && providers.has_google && !providers.has_password) {
        setAuthStatus(copy.googleAccountNoPassword);
        setIsAuthSubmitting(false);
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname,
      });
      if (error) {
        const cooldownSeconds = parseRateLimitSeconds(error.message);
        if (cooldownSeconds) {
          setResetCooldown(cooldownSeconds);
          setAuthStatus("");
        } else {
          setAuthStatus(localizeError(error.message, copy));
        }
      } else {
        setResetCooldown(0);
        setAuthStatus(copy.resetEmailSent);
      }
      setIsAuthSubmitting(false);
      return;
    }

    if (authMode === "sign_up") {
      const providers = await getEmailProviders(email);
      if (providers?.has_google) {
        setAuthStatus(copy.emailUsesGoogle);
        setIsAuthSubmitting(false);
        return;
      }

      const result = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: authUsername.trim() || email.split("@")[0] } },
      });

      if (result.error) {
        setAuthStatus(localizeError(result.error.message, copy));
        setIsAuthSubmitting(false);
        return;
      }

      const identities = result.data.user?.identities;
      if (Array.isArray(identities) && identities.length === 0) {
        setAuthStatus(copy.emailAlreadyRegistered);
        setIsAuthSubmitting(false);
        return;
      }

      setAuthStatus(copy.checkEmailToConfirm);
      setIsAuthSubmitting(false);
      return;
    }

    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) {
      const providers = await getEmailProviders(email);
      if (providers?.account_exists && providers.has_google && !providers.has_password) {
        setAuthStatus(copy.emailUsesGoogle);
      } else {
        setAuthStatus(localizeError(result.error.message, copy));
      }
      setIsAuthSubmitting(false);
      return;
    }

    setIsAuthScreenOpen(false);
    setAuthStatus(copy.signedInSuccessfully);
    setIsAuthSubmitting(false);
  };

  const handleUpdatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setRecoveryStatus(copy.supabaseMissing);
      return;
    }

    setRecoveryStatus("");
    const password = recoveryPassword.trim();
    const confirm = recoveryConfirm.trim();

    if (password.length < 6) {
      setRecoveryStatus(copy.passwordTooShort);
      return;
    }

    if (password !== confirm) {
      setRecoveryStatus(copy.passwordMismatch);
      return;
    }

    setIsRecoverySubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setRecoveryStatus(localizeError(error.message, copy));
      setIsRecoverySubmitting(false);
      return;
    }

    setRecoveryStatus(copy.passwordUpdated);
    setRecoveryPassword("");
    setRecoveryConfirm("");
    setRecoveryDone(true);
    setIsRecoverySubmitting(false);
  };

  const closeRecoveryScreen = () => {
    setRecoveryPassword("");
    setRecoveryConfirm("");
    setRecoveryStatus("");
    setRecoveryDone(false);
    clearPasswordRecovery();
  };

  const requestNewResetLink = () => {
    closeRecoveryScreen();
    setAuthMode("reset");
    setAuthStatus("");
    setIsAuthScreenOpen(true);
  };

  const openSignInFromRecovery = () => {
    closeRecoveryScreen();
    setAuthMode("sign_in");
    setAuthStatus("");
    setIsAuthScreenOpen(true);
  };

  const signInWithGoogle = async () => {
    if (!supabase) {
      setAuthStatus(copy.supabaseMissing);
      return;
    }

    setIsGoogleAuthLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) {
      setAuthStatus(localizeError(error.message, copy));
      setIsGoogleAuthLoading(false);
    }
  };

  const profileColumns = "id,username,avatar_url,full_name,bio,favorite_team,favorite_position,location";

  const buildProfilePayload = (overrides?: { avatar_url?: string | null }) => ({
    id: user!.id,
    username: profileUsername.trim() || user!.email?.split("@")[0] || "",
    avatar_url:
      overrides && "avatar_url" in overrides ? overrides.avatar_url : profileAvatarUrl.trim() || null,
    full_name: profileFullName.trim() || null,
    bio: profileBio.trim() || null,
    favorite_team: profileFavoriteTeam.trim() || null,
    favorite_position: profileFavoritePosition.trim() || null,
    location: profileLocation.trim() || null,
  });

  const updateProfile = async () => {
    if (!supabase || !user) return;

    setLockerStatus("");
    setIsProfileLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .upsert(buildProfilePayload())
      .select(profileColumns)
      .single();

    if (error) {
      const message = getSupabaseErrorMessage(error, copy);
      setLockerStatus(message);
      showToast(message, "error");
      setIsProfileLoading(false);
      return;
    }

    setProfile(data as ProfileRecord);
    setLockerStatus(copy.saved);
    showToast(copy.saved);
    setIsProfileLoading(false);
  };

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !supabase || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast(copy.avatarTooLarge, "error");
      return;
    }

    setIsAvatarUploading(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const filePath = `${user.id}/avatar-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true, contentType: file.type || undefined });

      if (uploadError) {
        showToast(copy.avatarUploadError, "error");
        setIsAvatarUploading(false);
        return;
      }

      const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = `${publicData.publicUrl}?v=${Date.now()}`;
      setProfileAvatarUrl(publicUrl);

      const { data, error } = await supabase
        .from("profiles")
        .upsert(buildProfilePayload({ avatar_url: publicUrl }))
        .select(profileColumns)
        .single();

      if (error) {
        showToast(getSupabaseErrorMessage(error, copy), "error");
        setIsAvatarUploading(false);
        return;
      }

      setProfile(data as ProfileRecord);
      showToast(copy.avatarUploaded);
    } catch {
      showToast(copy.avatarUploadError, "error");
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const saveCurrentLineupToSupabase = async () => {
    if (!supabase) {
      setLockerStatus(copy.supabaseMissing);
      showToast(copy.supabaseMissing, "error");
      return;
    }
    if (!user) {
      openAuthForSave();
      return;
    }

    setLockerStatus("");
    setIsLockerLoading(true);
    const savedAt = new Date().toISOString();
    const displayName = lineupName.trim() || `${copy.pitchLabels[pitchSize]} ${new Date(savedAt).toLocaleString()}`;
    const thumbnailDataUrl = createLineupThumbnail();

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      username: user.user_metadata?.username ?? user.email?.split("@")[0] ?? "",
      avatar_url: user.user_metadata?.avatar_url ?? null,
    });

    if (profileError) {
      const message = getSupabaseErrorMessage(profileError, copy);
      setLockerStatus(message);
      showToast(message, "error");
      setIsLockerLoading(false);
      return;
    }

    const { error } = await supabase.from("lineups").insert({
      user_id: user.id,
      name: displayName,
      format: "unified",
      players_data: getCurrentLineupState({ thumbnailDataUrl, savedAt }),
    });

    if (error) {
      const message = getSupabaseErrorMessage(error, copy);
      setLockerStatus(message);
      showToast(message, "error");
    } else {
      setLineupName("");
      setLockerCategory("all");
      setLockerStatus(copy.saved);
      showToast(copy.saved);
      await fetchSavedLineups();
    }
    setIsLockerLoading(false);
  };

  const saveTacticsBoardToSupabase = async () => {
    if (!supabase) {
      setLockerStatus(copy.supabaseMissing);
      showToast(copy.supabaseMissing, "error");
      return;
    }
    if (!user) {
      openAuthForSave();
      return;
    }

    setLockerStatus("");
    setIsLockerLoading(true);
    const committedFrames = useTacticalStore.getState().commitDraftIfChanged();
    const tacticalState = useTacticalStore.getState();
    const displayName = lineupName.trim() || `${copy.tacticsTab} ${new Date().toLocaleDateString()}`;

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      username: user.user_metadata?.username ?? user.email?.split("@")[0] ?? "",
      avatar_url: user.user_metadata?.avatar_url ?? null,
    });

    if (profileError) {
      const message = getSupabaseErrorMessage(profileError, copy);
      setLockerStatus(message);
      showToast(message, "error");
      setIsLockerLoading(false);
      return;
    }

    const { error } = await supabase.from("lineups").insert({
      user_id: user.id,
      name: displayName,
      format: "tactics",
      players_data: {
        kind: "tactics",
        tactics: tacticalState.tactics.map((tactic) =>
          tactic.id === tacticalState.activeTacticId
            ? { ...tactic, frames: cloneTacticalFrames(committedFrames) }
            : tactic,
        ),
      } satisfies SavedTacticsState,
    });

    if (error) {
      const message = getSupabaseErrorMessage(error, copy);
      setLockerStatus(message);
      showToast(message, "error");
    } else {
      setLineupName("");
      setLockerCategory("tactics");
      setLockerStatus(copy.saved);
      showToast(copy.saved);
      await fetchSavedLineups();
    }
    setIsLockerLoading(false);
  };

  const openAuthForSave = () => {
    setAuthMode("sign_in");
    setAuthStatus("");
    setIsAuthScreenOpen(true);
  };

  const handleSaveCurrentLineup = () => {
    if (!user) {
      openAuthForSave();
      return;
    }
    void saveCurrentLineupToSupabase();
  };

  const handleSaveTacticsBoard = () => {
    if (!user) {
      openAuthForSave();
      return;
    }
    void saveTacticsBoardToSupabase();
  };

  const loadSavedLineup = (lineup: SavedLineupRecord) => {
    const data = lineup.players_data;
    if ("kind" in data && data.kind === "tactics") {
      const tactics = normalizeTacticalPlaybooks(data.tactics);
      const activeTactic = tactics[0] ?? createDefaultTacticalPlaybook();
      useTacticalStore.setState({
        tactics,
        activeTacticId: activeTactic.id,
        frames: cloneTacticalFrames(activeTactic.frames),
        draftFrame: createInitialTacticalFrame(),
        playbackFrames: null,
        currentFrameIndex: 0,
        isPlaying: false,
      });
      setCurrentMode("ANIMATION");
      setActiveTool("ANIMATION_TOOL");
      setActiveBottomSheetTool("ANIMATION_TOOL");
      setActiveTab("lineup");
      setLastWorkspaceTab("tactics");
      setLockerStatus("");
      return;
    }

    const lineupData = data as StoredLineupState;
    if (!lineupData || !isPitchSize(lineupData.pitchSize) || !isFormationKey(lineupData.formation) || !Array.isArray(lineupData.players)) {
      setLockerStatus(copy.invalidLineupData);
      showToast(copy.invalidLineupData, "error");
      return;
    }

    setPitchSize(lineupData.pitchSize);
    setFormation(lineupData.formation);
    setCustomCount(clampCustomCount(lineupData.customCount));
    setPlayers(lineupData.players);
    setSavedPlayersByPitch(lineupData.savedPlayersByPitch ?? {});
    setSavedFormationByPitch(lineupData.savedFormationByPitch ?? {});
    setSavedCustomCountByPitch(lineupData.savedCustomCountByPitch ?? {});
    setOpponentMarkers(Array.isArray(lineupData.opponentMarkers) ? lineupData.opponentMarkers : createOpponentMarkers());
    setSavedOpponentMarkersByPitch(lineupData.savedOpponentMarkersByPitch ?? {});
    setDrawLines(Array.isArray(lineupData.drawLines) ? lineupData.drawLines : []);
    setSavedDrawLinesByPitch(lineupData.savedDrawLinesByPitch ?? {});
    const loadedMode = lineupData.currentMode ?? (lineupData.pitchSize === "custom" ? "CUSTOM" : "LINEUP");
    const loadedTool = loadedMode === "ANIMATION" ? "ANIMATION_TOOL" : "PERSONNEL_TOOL";
    setCurrentMode(loadedMode);
    setActiveTool(loadedTool);
    setActiveBottomSheetTool(loadedTool);
    if (Array.isArray(lineupData.animationFrames)) {
      useTacticalStore.setState({
        frames: cloneTacticalFrames(lineupData.animationFrames),
        draftFrame: cloneTacticalFrame(lineupData.animationFrames[0] ?? createInitialTacticalFrame()),
        playbackFrames: null,
        currentFrameIndex: 0,
        isPlaying: false,
      });
    }
    setRedoDrawLines([]);
    setIsDrawMode(false);
    setActiveTab("lineup");
    setLockerStatus("");
  };

  const deleteSavedLineup = async (id: string) => {
    if (!supabase || !user) return;
    setDeletingLineupId(id);
    const { error } = await supabase.from("lineups").delete().eq("id", id);
    if (error) {
      const message = getSupabaseErrorMessage(error, copy);
      setLockerStatus(message);
      showToast(message, "error");
    } else {
      setSavedLineups((current) => current.filter((lineup) => lineup.id !== id));
      showToast(copy.deleted);
    }
    setDeletingLineupId(null);
  };

  const shareSavedLineup = async (lineup: SavedLineupRecord) => {
    const data = lineup.players_data;
    if ("kind" in data && data.kind === "tactics") {
      showToast(copy.invalidLineupData, "error");
      return;
    }

    const lineupData = data as StoredLineupState;
    if (!lineupData || !isPitchSize(lineupData.pitchSize) || !isFormationKey(lineupData.formation) || !Array.isArray(lineupData.players)) {
      showToast(copy.invalidLineupData, "error");
      return;
    }

    const shareableCount =
      lineupData.pitchSize === "custom"
        ? lineupData.players.filter((player) => player.onPitch).length
        : lineupData.customCount;
    const url = new URL(window.location.href);
    url.searchParams.set(
      "lineup",
      encodeSharePayload(
        lineupData.pitchSize,
        lineupData.formation,
        shareableCount,
        lineupData.players,
        Array.isArray(lineupData.opponentMarkers) ? lineupData.opponentMarkers : [],
        Array.isArray(lineupData.drawLines) ? lineupData.drawLines : [],
        Array.isArray(lineupData.animationFrames) ? lineupData.animationFrames : [],
        lineupData.currentMode ?? (lineupData.pitchSize === "custom" ? "CUSTOM" : "LINEUP"),
      ),
    );

    try {
      await navigator.clipboard.writeText(url.toString());
      showToast(copy.copied);
    } catch {
      window.prompt(copy.share, url.toString());
    }
  };

  const getSavedLineupFormatLabel = (lineup: SavedLineupRecord) => {
    if (lineup.format === "unified") return "Unified workspace";
    if (lineup.format === "tactics") return copy.tacticsTab;
    if (lineup.format === "custom") return copy.pitchLabels.custom;
    const numericFormat = Number(lineup.format);
    return isPitchSize(numericFormat) ? copy.pitchLabels[numericFormat] : lineup.format;
  };

  const getSavedLineupThumbnail = (lineup: SavedLineupRecord) => {
    const data = lineup.players_data;
    if (!data || (data as SavedTacticsState).kind === "tactics") return "";
    const lineupData = data as StoredLineupState;
    return typeof lineupData.thumbnailDataUrl === "string" ? lineupData.thumbnailDataUrl : "";
  };

  const getSavedLineupDateTime = (lineup: SavedLineupRecord) => {
    const data = lineup.players_data;
    const lineupData = data && (data as SavedTacticsState).kind !== "tactics" ? (data as StoredLineupState) : null;
    const savedAt = typeof lineupData?.savedAt === "string" ? lineupData.savedAt : lineup.created_at;
    return new Date(savedAt).toLocaleString();
  };

  const getPitchPointerPosition = (event: ReactPointerEvent<Element>, options: { clamp?: boolean } = {}) => {
    return getPitchClientPosition(event.clientX, event.clientY, options);
  };

  const getPitchClientPosition = (clientX: number, clientY: number, options: { clamp?: boolean } = {}) => {
    const pitch = pitchRef.current;
    if (!pitch) return null;

    const rect = pitch.getBoundingClientRect();
    const styles = window.getComputedStyle(pitch);
    const borderLeft = Number.parseFloat(styles.borderLeftWidth) || 0;
    const borderTop = Number.parseFloat(styles.borderTopWidth) || 0;
    const contentLeft = rect.left + borderLeft;
    const contentTop = rect.top + borderTop;
    const contentWidth = pitch.clientWidth;
    const contentHeight = pitch.clientHeight;
    const rawX = ((clientX - contentLeft) / contentWidth) * 100;
    const rawY = ((clientY - contentTop) / contentHeight) * 100;
    const shouldClamp = options.clamp ?? true;

    return {
      isInside: rawX >= 0 && rawX <= 100 && rawY >= 0 && rawY <= 100,
      x: shouldClamp ? Math.min(96, Math.max(4, rawX)) : rawX,
      y: shouldClamp ? Math.min(96, Math.max(4, rawY)) : rawY,
    };
  };

  const getDrawPointerPosition = (event: ReactPointerEvent<Element>) => {
    const drawLayer = drawLayerRef.current;
    if (!drawLayer) return null;

    const rect = drawLayer.getBoundingClientRect();
    const rawX = ((event.clientX - rect.left) / rect.width) * 100;
    const rawY = ((event.clientY - rect.top) / rect.height) * 100;

    return {
      isInside: rawX >= 0 && rawX <= 100 && rawY >= 0 && rawY <= 100,
      x: rawX,
      y: rawY,
    };
  };

  const updatePlayerPosition = (event: ReactPointerEvent<Element>, id: number) => {
    const position = getPitchPointerPosition(event, { clamp: false });
    if (!position) return;
    setDragPreview({ type: "player", id, x: event.clientX, y: event.clientY });

    setPlayers((current) => {
      const nextPlayers = current.map((player) =>
        player.id === id
          ? {
              ...player,
              position: position.isInside
                ? getZoneName(pitchSize, Math.min(96, Math.max(4, position.x)), Math.min(96, Math.max(4, position.y)))
                : player.position,
              x: position.isInside ? Math.min(96, Math.max(4, position.x)) : player.x,
              y: position.isInside ? Math.min(96, Math.max(4, position.y)) : player.y,
              onPitch: position.isInside,
            }
          : player,
      );

      if (pitchSize === "custom") {
        setCustomCount(nextPlayers.filter((player) => player.onPitch).length);
      }

      return nextPlayers;
    });
  };

  const updateOpponentPosition = (event: ReactPointerEvent<Element>, id: number) => {
    const position = getPitchPointerPosition(event, { clamp: false });
    if (!position) return;
    setDragPreview({ type: "opponent", id, x: event.clientX, y: event.clientY });

    setOpponentMarkers((current) =>
      current.map((marker) =>
        marker.id === id
          ? {
              ...marker,
              onPitch: position.isInside,
              x: position.isInside ? Math.min(96, Math.max(4, position.x)) : marker.x,
              y: position.isInside ? Math.min(96, Math.max(4, position.y)) : marker.y,
            }
          : marker,
      ),
    );
  };

  const syncPlayerFromAnimation = (id: number, x: number, y: number) => {
    setPlayers((current) =>
      current.map((player) =>
        player.id === id
          ? {
              ...player,
              x,
              y,
              position: getZoneName(pitchSize, x, y),
              onPitch: true,
            }
          : player,
      ),
    );
  };

  const syncOpponentFromAnimation = (id: number, x: number, y: number) => {
    setOpponentMarkers((current) =>
      current.map((marker) =>
        marker.id === id
          ? {
              ...marker,
              x,
              y,
              onPitch: true,
            }
          : marker,
      ),
    );
  };

  const getBoundedPitchPosition = (position: { x: number; y: number }) => ({
    x: Math.min(96, Math.max(4, position.x)),
    y: Math.min(96, Math.max(4, position.y)),
  });

  const updateBallMarkerFromPointer = (event: ReactPointerEvent<HTMLElement>, commitDrop = false) => {
    updateBallMarkerFromPoint(event.clientX, event.clientY, commitDrop);
  };

  const updateBallMarkerFromPoint = (clientX: number, clientY: number, commitDrop = false) => {
    const marker = ballMarker ?? { id: "ball", label: "", type: "ball" as const, x: 50, y: 56, onPitch: false };
    const position = getPitchClientPosition(clientX, clientY, { clamp: false });
    setDragPreview({ type: "ball", id: marker.id, x: clientX, y: clientY });
    if (!position) return;

    if (position.isInside) {
      const boundedPosition = getBoundedPitchPosition(position);
      if (marker.onPitch || commitDrop) {
        updateTacticalMarker(marker.id, boundedPosition.x, boundedPosition.y, true);
      }
      return;
    }

    if (commitDrop) {
      updateTacticalMarker(marker.id, marker.x, marker.y, false);
    }
  };

  useEffect(() => {
    if (draggingTacticalMarkerId !== "ball") return;

    const handleWindowPointerMove = (event: PointerEvent) => {
      if (isPlaying) return;
      updateBallMarkerFromPoint(event.clientX, event.clientY);
    };
    const handleWindowPointerEnd = (event: PointerEvent) => {
      updateBallMarkerFromPoint(event.clientX, event.clientY, true);
      setDraggingTacticalMarkerId(null);
      setDragPreview(null);
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerEnd);
    window.addEventListener("pointercancel", handleWindowPointerEnd);
    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerEnd);
      window.removeEventListener("pointercancel", handleWindowPointerEnd);
    };
  }, [ballMarker, draggingTacticalMarkerId, isPlaying]);

  const handleTacticalMarkerPointerDown = (event: ReactPointerEvent<HTMLElement>, id: string) => {
    if (!(isAnimationTool || isPersonnelTool) || isPlaying) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingTacticalMarkerId(id);
    if (id === "ball") {
      updateBallMarkerFromPointer(event);
      return;
    }
    const position = getPitchPointerPosition(event, { clamp: true });
    if (position) {
      updateTacticalMarker(id, position.x, position.y, true);
    }
  };

  const handleTacticalMarkerPointerMove = (event: ReactPointerEvent<HTMLElement>, id: string) => {
    if (draggingTacticalMarkerId !== id || isPlaying) return;
    if (id === "ball") {
      updateBallMarkerFromPointer(event);
      return;
    }
    const position = getPitchPointerPosition(event, { clamp: true });
    if (!position) return;
    updateTacticalMarker(id, position.x, position.y, true);
  };

  const stopTacticalMarkerDragging = (event?: ReactPointerEvent<HTMLElement>) => {
    if (draggingTacticalMarkerId === "ball" && event) {
      updateBallMarkerFromPointer(event, true);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
    setDraggingTacticalMarkerId(null);
    setDragPreview(null);
  };

  const startDrawing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDrawMode || !showDrawTools) return;
    const position = getDrawPointerPosition(event);
    if (!position?.isInside) return;

    const lineId = Date.now();
    event.currentTarget.setPointerCapture(event.pointerId);
    setActiveDrawLineId(lineId);
    setRedoDrawLines([]);
    setDrawLines((current) => [...current, { id: lineId, points: [{ x: position.x, y: position.y }] }]);
  };

  const continueDrawing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDrawMode || !showDrawTools || activeDrawLineId === null) return;
    const position = getDrawPointerPosition(event);
    if (!position) return;

    setDrawLines((current) =>
      current.map((line) =>
        line.id === activeDrawLineId
          ? { ...line, points: [...line.points, { x: position.x, y: position.y }] }
          : line,
      ),
    );
  };

  const stopDrawing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setActiveDrawLineId(null);
  };

  const undoDrawLine = () => {
    setDrawLines((current) => {
      if (current.length === 0) return current;
      const removedLine = current[current.length - 1];
      setRedoDrawLines((redoCurrent) => [removedLine, ...redoCurrent]);
      return current.slice(0, -1);
    });
  };

  const redoDrawLine = () => {
    setRedoDrawLines((current) => {
      if (current.length === 0) return current;
      const [restoredLine, ...remainingLines] = current;
      setDrawLines((drawCurrent) => [...drawCurrent, restoredLine]);
      return remainingLines;
    });
  };

  const clearDrawLines = () => {
    setDrawLines([]);
    setRedoDrawLines([]);
  };

  const handleDragStart = (event: ReactPointerEvent<HTMLElement>, id: number) => {
    if (isDrawMode || (isAnimationTool && isPlaying)) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(id);
    setDragPreview({ type: "player", id, x: event.clientX, y: event.clientY });
    dragStartRef.current = { id, x: event.clientX, y: event.clientY };
    if (isAnimationTool) {
      const position = getPitchPointerPosition(event, { clamp: true });
      if (position) {
        updateTacticalMarker(`p${id}`, position.x, position.y, true);
        syncPlayerFromAnimation(id, position.x, position.y);
      }
    }
  };

  const handleDragMove = (event: ReactPointerEvent<HTMLElement>, id: number) => {
    if (draggingId !== id) return;
    if (isAnimationTool) {
      const position = getPitchPointerPosition(event, { clamp: true });
      setDragPreview({ type: "player", id, x: event.clientX, y: event.clientY });
      if (position) {
        updateTacticalMarker(`p${id}`, position.x, position.y, true);
        syncPlayerFromAnimation(id, position.x, position.y);
      }
      return;
    }
    const dragStart = dragStartRef.current;
    if (!dragStart || dragStart.id !== id) return;

    const movedX = event.clientX - dragStart.x;
    const movedY = event.clientY - dragStart.y;
    if (Math.hypot(movedX, movedY) < 6) return;

    setDragPreview({ type: "player", id, x: event.clientX, y: event.clientY });
  };

  const stopDragging = (event: ReactPointerEvent<HTMLElement>) => {
    const id = draggingId;
    if (id !== null && isAnimationTool) {
      const position = getPitchPointerPosition(event, { clamp: true });
      if (position) {
        updateTacticalMarker(`p${id}`, position.x, position.y, true);
        syncPlayerFromAnimation(id, position.x, position.y);
      }
    } else if (id !== null) {
      updatePlayerPosition(event, id);
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingId(null);
    setDragPreview(null);
    dragStartRef.current = null;
  };

  const handleOpponentDragStart = (event: ReactPointerEvent<HTMLElement>, id: number) => {
    if (isDrawMode || (isAnimationTool && isPlaying)) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingOpponentId(id);
    setDragPreview({ type: "opponent", id, x: event.clientX, y: event.clientY });
    if (isAnimationTool) {
      const position = getPitchPointerPosition(event, { clamp: true });
      if (position) {
        updateTacticalMarker(`o${id}`, position.x, position.y, true);
        syncOpponentFromAnimation(id, position.x, position.y);
      }
    }
  };

  const handleOpponentDragMove = (event: ReactPointerEvent<HTMLElement>, id: number) => {
    if (draggingOpponentId !== id) return;
    setDragPreview({ type: "opponent", id, x: event.clientX, y: event.clientY });
    if (isAnimationTool) {
      const position = getPitchPointerPosition(event, { clamp: true });
      if (position) {
        updateTacticalMarker(`o${id}`, position.x, position.y, true);
        syncOpponentFromAnimation(id, position.x, position.y);
      }
    }
  };

  const stopOpponentDragging = (event: ReactPointerEvent<HTMLElement>) => {
    const id = draggingOpponentId;
    if (id !== null && isAnimationTool) {
      const position = getPitchPointerPosition(event, { clamp: true });
      if (position) {
        updateTacticalMarker(`o${id}`, position.x, position.y, true);
        syncOpponentFromAnimation(id, position.x, position.y);
      }
    } else if (id !== null) {
      updateOpponentPosition(event, id);
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingOpponentId(null);
    setDragPreview(null);
  };

  const renamePlayer = (id: number, field: "starterName" | "substituteName", name: string) => {
    setPlayers((current) => current.map((player) => (player.id === id ? { ...player, [field]: name } : player)));
  };

  const renameExtraPlayer = (id: number, index: number, name: string) => {
    setPlayers((current) =>
      current.map((player) =>
        player.id === id
          ? {
              ...player,
              extraNames: player.extraNames.map((extraName, extraIndex) => (extraIndex === index ? name : extraName)),
            }
          : player,
      ),
    );
  };

  const addPlayerInput = (id: number) => {
    setPlayers((current) =>
      current.map((player) =>
        player.id === id && player.extraNames.length < 1
          ? { ...player, extraNames: [...player.extraNames, ""] }
          : player,
      ),
    );
  };

  const removeExtraPlayerInput = (id: number, index: number) => {
    setPlayers((current) =>
      current.map((player) =>
        player.id === id
          ? { ...player, extraNames: player.extraNames.filter((_, extraIndex) => extraIndex !== index) }
          : player,
      ),
    );
  };

  const applyPitchSize = (nextPitchSize: PitchSize, options: { updateUrl?: boolean } = {}) => {
    setSavedPlayersByPitch((current) => ({ ...current, [pitchSize]: players }));
    setSavedFormationByPitch((current) => ({ ...current, [pitchSize]: formation }));
    setSavedCustomCountByPitch((current) => ({ ...current, [pitchSize]: customCount }));
    setSavedOpponentMarkersByPitch((current) => ({ ...current, [pitchSize]: opponentMarkers }));
    setSavedDrawLinesByPitch((current) => ({ ...current, [pitchSize]: drawLines }));

    const nextFormation = savedFormationByPitch[nextPitchSize] ?? getDefaultFormation(nextPitchSize);
    const nextCustomCount = savedCustomCountByPitch[nextPitchSize] ?? (nextPitchSize === "custom" ? 5 : customCount);
    const savedPlayers = savedPlayersByPitch[nextPitchSize];
    const savedOpponentMarkers = savedOpponentMarkersByPitch[nextPitchSize];
    const savedDrawLines = savedDrawLinesByPitch[nextPitchSize];
    setPitchSize(nextPitchSize);
    setFormation(nextFormation);
    setCustomCount(nextCustomCount);
    setPlayers(savedPlayers ?? createPlayers(nextPitchSize, nextFormation, nextCustomCount));
    setOpponentMarkers(savedOpponentMarkers ?? createOpponentMarkers());
    setDrawLines(savedDrawLines ?? []);
    setRedoDrawLines([]);
    setIsDrawMode(false);
    setCurrentMode(nextPitchSize === "custom" ? "CUSTOM" : "LINEUP");
    setActiveTool("PERSONNEL_TOOL");
    setActiveBottomSheetTool("PERSONNEL_TOOL");
    if (options.updateUrl !== false) {
      writeAppRoute("lineup", nextPitchSize);
    }
  };

  const applyCustomCount = (nextCount: number) => {
    const count = clampCustomCount(nextCount);
    setCustomCount(count);
    setPitchSize("custom");
    setFormation("custom");
    setCurrentMode("CUSTOM");
    setActiveTool("PERSONNEL_TOOL");
    setActiveBottomSheetTool("PERSONNEL_TOOL");
    setPlayers((current) => createPlayers("custom", "custom", count, current));
    setOpponentMarkers(createOpponentMarkers());
    setDrawLines([]);
    setRedoDrawLines([]);
    setIsDrawMode(false);
  };

  const resetPositions = () => {
  const nextCustomCount = pitchSize === "custom" ? activePlayers.length || 5 : customCount;
    if (showAllCanvasObjects) {
      setCustomCount(nextCustomCount);
    }
    setPlayers((current) =>
      createPlayers(
        pitchSize,
        formation,
        nextCustomCount,
        current.map(({ starterName, substituteName, extraNames }) => ({ starterName, substituteName, extraNames })),
      ),
    );
    if (showAllCanvasObjects) {
      setOpponentMarkers(createOpponentMarkers());
      setDrawLines([]);
      setRedoDrawLines([]);
      setIsDrawMode(false);
    }
  };

  const resetWorkspace = () => {
    const nextCustomCount = pitchSize === "custom" ? activePlayers.length || 5 : customCount;
    const nextOpponentMarkers = createOpponentMarkers();
    const nextPlayers = createPlayers(
      pitchSize,
      formation,
      nextCustomCount,
      players.map(({ starterName, substituteName, extraNames }) => ({ starterName, substituteName, extraNames })),
    ).map((player) => ({
      ...player,
      starterName: "",
      substituteName: "",
      extraNames: [],
    }));
    const nextDraftFrame = createTacticalFrameFromWorkspace(nextPlayers, nextOpponentMarkers);

    if (showAllCanvasObjects) {
      setCustomCount(nextCustomCount);
    }
    setPlayers(nextPlayers);
    setOpponentMarkers(nextOpponentMarkers);
    setDrawLines([]);
    setRedoDrawLines([]);
    setIsDrawMode(false);
    setDraggingId(null);
    setDraggingOpponentId(null);
    setDraggingTacticalMarkerId(null);
    setDragPreview(null);
    dragStartRef.current = null;
    useTacticalStore.setState((state) => ({
      tactics: state.tactics.map((tactic) =>
        tactic.id === state.activeTacticId ? { ...tactic, frames: [] } : tactic,
      ),
      frames: [],
      draftFrame: cloneTacticalFrame(nextDraftFrame),
      playbackFrames: null,
      currentFrameIndex: 0,
      isPlaying: false,
    }));
  };

  const copyShareLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set(
      "lineup",
      encodeSharePayload(
        pitchSize,
        formation,
        pitchSize === "custom" ? activePlayers.length : customCount,
        players,
        opponentMarkers,
        drawLines,
        useTacticalStore.getState().frames,
        currentMode,
      ),
    );

    try {
      await navigator.clipboard.writeText(url.toString());
      setCopyStatus("copied");
      showToast(copy.copied);
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch {
      window.prompt(copy.share, url.toString());
    }
  };

  const downloadLineupImage = async () => {
    const pitch = pitchRef.current;
    if (!pitch) return;

    const scale = 3;
    const rect = pitch.getBoundingClientRect();
    const exportPadding = 76 * scale;
    const pitchWidth = Math.round(rect.width * scale);
    const pitchHeight = Math.round(rect.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = pitchWidth + exportPadding * 2;
    canvas.height = pitchHeight + exportPadding * 2;

    const context = canvas.getContext("2d");
    if (!context) return;

    const width = canvas.width;
    const height = canvas.height;
    const sx = pitchWidth / 100;
    const sy = pitchHeight / 100;
    const px = (value: number) => exportPadding + value * sx;
    const py = (value: number) => exportPadding + value * sy;
    const pw = (value: number) => value * sx;
    const ph = (value: number) => value * sy;
    const css = (value: number) => value * scale;

    const fieldGradient = context.createLinearGradient(0, 0, width, height);
    fieldGradient.addColorStop(0, "#37a84f");
    fieldGradient.addColorStop(0.5, "#2e9849");
    fieldGradient.addColorStop(1, "#2a8841");
    context.fillStyle = fieldGradient;
    context.fillRect(0, 0, width, height);

    const stripeHeight = css(58);
    for (let y = 0; y < height; y += stripeHeight * 2) {
      context.fillStyle = "rgba(255,255,255,0.055)";
      context.fillRect(0, y, width, stripeHeight);
      context.fillStyle = "rgba(0,0,0,0.04)";
      context.fillRect(0, y + stripeHeight, width, stripeHeight);
    }

    context.strokeStyle = "rgba(255,255,255,0.9)";
    context.lineWidth = css(3);
    context.strokeRect(px(4), py(4), pw(92), ph(92));
    context.beginPath();
    context.moveTo(px(4), py(50));
    context.lineTo(px(96), py(50));
    context.stroke();
    context.beginPath();
    context.ellipse(px(50), py(50), pw(15.5), ph(11), 0, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(px(50), py(50), css(3), 0, Math.PI * 2);
    context.fill();
    context.strokeRect(px(26), py(4), pw(48), ph(15));
    context.strokeRect(px(37), py(4), pw(26), ph(7));
    context.strokeRect(px(26), py(81), pw(48), ph(15));
    context.strokeRect(px(37), py(89), pw(26), ph(7));

    if (showAllCanvasObjects) {
      drawLines.forEach((line) => {
        if (line.points.length < 2) return;
        context.save();
        context.strokeStyle = "#facc15";
        context.lineWidth = css(3);
        context.lineCap = "round";
        context.lineJoin = "round";
        context.beginPath();
        context.moveTo(px(line.points[0].x), py(line.points[0].y));
        line.points.slice(1).forEach((point) => context.lineTo(px(point.x), py(point.y)));
        context.stroke();
        context.restore();
      });
    }

    activePlayers.forEach((player) => {
      const x = px(player.x);
      const y = py(player.y);
      const starterName = player.starterName.trim() || `${copy.player} ${player.id}`;
      const benchNames = getBenchNames(player);

      context.save();
      context.shadowColor = "rgba(0,0,0,0.34)";
      context.shadowBlur = css(5);
      context.shadowOffsetY = css(3);
      context.fillStyle = "#f8fafc";
      context.beginPath();
      context.arc(x, y, css(17), 0, Math.PI * 2);
      context.fill();
      context.shadowColor = "transparent";
      context.strokeStyle = "#ffffff";
      context.lineWidth = css(2);
      context.stroke();
      context.fillStyle = "#111827";
      context.font = `950 ${css(13)}px Inter, Arial, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(String(player.id), x, y + css(0.5));
      context.restore();

      context.save();
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = `900 ${css(9)}px Inter, Arial, sans-serif`;
      const nameWidth = Math.min(css(86), Math.max(css(52), starterName.length * css(5.6)));
      context.fillStyle = "rgba(16, 42, 25, 0.58)";
      context.beginPath();
      context.roundRect(x - nameWidth / 2, y + css(21), nameWidth, css(18), css(9));
      context.fill();
      context.fillStyle = "#ffffff";
      context.fillText(starterName.toUpperCase(), x, y + css(30), nameWidth - css(8));

      if (benchNames.length > 0) {
        context.font = `900 ${css(8)}px Inter, Arial, sans-serif`;
        const benchText = benchNames.slice(0, 2).join(" / ");
        const benchWidth = Math.min(css(130), Math.max(css(54), benchText.length * css(5)));
        context.fillStyle = "rgba(16, 42, 25, 0.58)";
        context.beginPath();
        context.roundRect(x - benchWidth / 2, y + css(42), benchWidth, css(16), css(8));
        context.fill();
        context.fillStyle = "#d9ffe6";
        context.fillText(benchText.toUpperCase(), x, y + css(50), benchWidth - css(8));
      }
      context.restore();
    });

    if (showAllCanvasObjects) {
      opponentMarkers
        .filter((marker) => marker.onPitch)
        .forEach((marker) => {
          context.save();
          context.fillStyle = "#dc2626";
          context.strokeStyle = "#ffffff";
          context.lineWidth = css(2);
          context.beginPath();
          context.arc(px(marker.x), py(marker.y), css(10), 0, Math.PI * 2);
          context.fill();
          context.stroke();
          context.restore();
        });
    }

    if (showAnimationTimeline && ballMarker) {
      context.save();
      context.fillStyle = "#f8fafc";
      context.strokeStyle = "#94a3b8";
      context.lineWidth = css(2);
      context.shadowColor = "rgba(0,0,0,0.32)";
      context.shadowBlur = css(5);
      context.beginPath();
      context.arc(px(ballMarker.x), py(ballMarker.y), css(10), 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.restore();
    }

    const filename = `${pitchSize}-lineup-football-${new Date().toISOString().slice(0, 10)}.png`;
    const link = document.createElement("a");
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;

    const file = new File([blob], filename, { type: "image/png" });
    const canShareFile =
      "canShare" in navigator &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] });

    if (canShareFile && navigator.maxTouchPoints > 0) {
      try {
        await navigator.share({
          files: [file],
          title: "Line Up Football",
        });
        showToast(copy.downloaded);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Fall back to the normal browser download/open behavior below.
      }
    }

    const pngUrl = URL.createObjectURL(blob);
    link.href = pngUrl;
    link.download = filename;
    link.target = "_blank";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast(copy.downloaded);
    window.setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
  };

  return (
    <main className="match-bg min-h-screen p-4 text-slate-900 antialiased sm:p-6 lg:p-10">
      <header className="app-title-bar mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-3 shadow-2xl">
        <div className="header-actions">
          <button
            type="button"
            className="language-switch"
            onClick={() => setLanguage(languageMeta.next)}
            aria-label={copy.switchLanguage}
          >
            <span aria-hidden="true">{languageMeta.flag}</span>
            {languageMeta.label}
          </button>
          {!user ? (
            <button type="button" className="header-login-button" onClick={() => setIsAuthScreenOpen(true)}>
              {copy.signIn}
            </button>
          ) : (
            <div ref={userMenuRef} className="header-user-menu">
              <span>{user.email}</span>
              <button type="button" className="header-dropdown-button" onClick={() => setIsUserMenuOpen((current) => !current)}>
                <ChevronDown size={16} />
              </button>
              {isUserMenuOpen ? (
                <div className="user-dropdown">
                  <button type="button" onClick={() => switchAppTab("profile")}>
                    {copy.profileMenu}
                  </button>
                  <button type="button" onClick={() => switchAppTab("locker")}>
                    {copy.lockerMenu}
                  </button>
                  <button type="button" onClick={signOut}>
                    {copy.signOut}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
        <h1>Line Up Football</h1>
      </header>
      {isPasswordRecovery || authHashError ? (
        <div className="auth-screen">
          <form className="auth-screen-card" onSubmit={handleUpdatePassword}>
            <div className="panel-heading">
              <span>{isPasswordRecovery || isRecoveryExpiryError ? copy.setNewPasswordTitle : copy.authTitle}</span>
              <button type="button" onClick={closeRecoveryScreen}>
                x
              </button>
            </div>
            {!isSupabaseConfigured ? <p className="locker-message">{copy.supabaseMissing}</p> : null}
            {authHashError && !isPasswordRecovery ? (
              isRecoveryExpiryError ? (
                <>
                  <p className="locker-message">{copy.recoveryLinkExpired}</p>
                  <button type="button" onClick={requestNewResetLink}>
                    {copy.requestNewLink}
                  </button>
                </>
              ) : (
                <>
                  <p className="locker-message">{localizeError(authHashError.description, copy)}</p>
                  <button type="button" onClick={openSignInFromRecovery}>
                    {copy.signIn}
                  </button>
                </>
              )
            ) : recoveryDone ? (
              <>
                <p className="locker-message">{copy.passwordUpdated}</p>
                <button type="button" onClick={closeRecoveryScreen}>
                  {copy.signIn}
                </button>
              </>
            ) : (
              <>
                <p className="locker-message">{copy.setNewPasswordHint}</p>
                <input
                  type="password"
                  value={recoveryPassword}
                  onChange={(event) => setRecoveryPassword(event.target.value)}
                  placeholder={copy.newPassword}
                  required
                />
                <input
                  type="password"
                  value={recoveryConfirm}
                  onChange={(event) => setRecoveryConfirm(event.target.value)}
                  placeholder={copy.confirmPassword}
                  required
                />
                <button type="submit" disabled={!isSupabaseConfigured || isRecoverySubmitting}>
                  {isRecoverySubmitting ? <ButtonSpinner /> : null}
                  {copy.updatePassword}
                </button>
                {recoveryStatus ? <p className="locker-message">{recoveryStatus}</p> : null}
              </>
            )}
          </form>
        </div>
      ) : null}
      {isAuthScreenOpen ? (
        <div className="auth-screen">
          <form className="auth-screen-card" onSubmit={handleAuthSubmit}>
            <div className="panel-heading">
              <span>{copy.authTitle}</span>
              <button type="button" onClick={() => setIsAuthScreenOpen(false)}>
                x
              </button>
            </div>
            {!isSupabaseConfigured ? <p className="locker-message">{copy.supabaseMissing}</p> : null}
            <div className="auth-mode-switch">
              <button
                type="button"
                className={authMode === "sign_in" ? "active" : ""}
                onClick={() => {
                  setAuthMode("sign_in");
                  setAuthStatus("");
                }}
              >
                {copy.signIn}
              </button>
              <button
                type="button"
                className={authMode === "sign_up" ? "active" : ""}
                onClick={() => {
                  setAuthMode("sign_up");
                  setAuthStatus("");
                }}
              >
                {copy.signUp}
              </button>
            </div>
            {authMode === "sign_up" ? (
              <input value={authUsername} onChange={(event) => setAuthUsername(event.target.value)} placeholder={copy.username} />
            ) : null}
            <input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder={copy.email} required />
            {authMode !== "reset" ? (
              <input
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder={copy.password}
                required
              />
            ) : null}
            <button
              type="submit"
              disabled={
                !isSupabaseConfigured ||
                isAuthSubmitting ||
                isGoogleAuthLoading ||
                (authMode === "reset" && resetCooldown > 0)
              }
            >
              {isAuthSubmitting ? <ButtonSpinner /> : null}
              {authMode === "reset" && resetCooldown > 0
                ? `${copy.resetPassword} (${resetCooldown}s)`
                : authMode === "sign_up"
                  ? copy.signUp
                  : authMode === "reset"
                    ? copy.resetPassword
                    : copy.signIn}
            </button>
            <button
              type="button"
              className="google-auth-button"
              onClick={signInWithGoogle}
              disabled={!isSupabaseConfigured || isAuthSubmitting || isGoogleAuthLoading}
            >
              {isGoogleAuthLoading ? <ButtonSpinner /> : null}
              {copy.googleSignIn}
            </button>
            {authMode === "reset" && resetCooldown > 0 ? (
              <p className="locker-message">{copy.resetCooldownMessage.replace("{seconds}", String(resetCooldown))}</p>
            ) : authStatus ? (
              <p className="locker-message">{authStatus}</p>
            ) : null}
            <button
              type="button"
              className="auth-forgot-link"
              onClick={() => {
                setAuthMode(authMode === "reset" ? "sign_in" : "reset");
                setAuthStatus("");
              }}
            >
              {authMode === "reset" ? copy.backToSignIn : copy.forgotPassword}
            </button>
          </form>
        </div>
      ) : null}
      <div
        className={`dashboard-shell mx-auto grid w-full overflow-hidden shadow-2xl ${
          activeTab === "tactics" ? "tactics-dashboard" : "max-w-5xl"
        }`}
      >
        {activeTab === "tactics" ? (
          <TacticalBoard
            copy={copy}
            onSaveToLocker={handleSaveTacticsBoard}
            isSavingToLocker={isLockerLoading}
            lockerStatus={lockerStatus}
          />
        ) : activeTab === "profile" ? (
          <section className="locker-room profile-room">
            <div className="locker-panel">
              <div className="panel-heading">
                <span>{copy.profileTitle}</span>
                <strong>{user?.email ?? copy.signIn}</strong>
              </div>
              {!isSupabaseConfigured ? (
                <p className="locker-message">{copy.supabaseMissing}</p>
              ) : !user ? (
                <p className="locker-message">{copy.signIn}</p>
              ) : (
                <div className="profile-card">
                  <div className="profile-hero">
                    <button
                      type="button"
                      className="profile-avatar"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={isAvatarUploading}
                      aria-label={copy.changeAvatar}
                    >
                      {profileAvatarUrl ? (
                        <img src={profileAvatarUrl} alt="" />
                      ) : (
                        <span className="profile-avatar-initials">
                          {(profileUsername || user.email || "?").trim().charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="profile-avatar-overlay">
                        {isAvatarUploading ? <ButtonSpinner /> : <Pencil size={16} />}
                      </span>
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleAvatarFileChange}
                    />
                    <div className="profile-hero-info">
                      <strong>{profileUsername || user.email}</strong>
                      <span>{user.email}</span>
                      <button
                        type="button"
                        className="profile-avatar-trigger"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={isAvatarUploading}
                      >
                        {isAvatarUploading ? copy.uploadingAvatar : copy.changeAvatar}
                      </button>
                    </div>
                  </div>

                  <p className="profile-subtitle">{copy.profileSubtitle}</p>

                  <div className="profile-grid">
                    <label className="profile-field">
                      <span>{copy.username}</span>
                      <input value={profileUsername} onChange={(event) => setProfileUsername(event.target.value)} placeholder={copy.username} />
                    </label>
                    <label className="profile-field">
                      <span>{copy.favoriteTeam}</span>
                      <input value={profileFavoriteTeam} onChange={(event) => setProfileFavoriteTeam(event.target.value)} placeholder={copy.favoriteTeam} />
                    </label>
                    <label className="profile-field">
                      <span>{copy.favoritePosition}</span>
                      <input value={profileFavoritePosition} onChange={(event) => setProfileFavoritePosition(event.target.value)} placeholder={copy.favoritePosition} />
                    </label>
                    <label className="profile-field">
                      <span>{copy.location}</span>
                      <input value={profileLocation} onChange={(event) => setProfileLocation(event.target.value)} placeholder={copy.location} />
                    </label>
                    <label className="profile-field profile-field-full">
                      <span>{copy.bio}</span>
                      <textarea
                        value={profileBio}
                        onChange={(event) => setProfileBio(event.target.value)}
                        placeholder={copy.bio}
                        rows={3}
                        maxLength={280}
                      />
                    </label>
                  </div>

                  <p className="profile-hint">{copy.profileFieldsHint}</p>

                  <button type="button" className="profile-save" onClick={updateProfile} disabled={isProfileLoading}>
                    {isProfileLoading ? <ButtonSpinner /> : null}
                    {copy.updateProfile}
                  </button>
                </div>
              )}
            </div>
          </section>
        ) : activeTab === "locker" ? (
          <section className="locker-room">
            <div className="locker-panel">
              <div className="panel-heading">
                <span>{copy.savedLineups}</span>
                <strong>{savedLineups.length}</strong>
              </div>
              <div className="locker-category-switch" aria-label={copy.savedLineups}>
                {lockerCategories.map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    className={lockerCategory === category.value ? "active" : ""}
                    onClick={() => setLockerCategory(category.value)}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
              <div className="saved-lineup-list">
                {filteredSavedLineups.length === 0 ? <p className="locker-message">{copy.noSavedLineups}</p> : null}
                {filteredSavedLineups.map((lineup) => (
                  <article key={lineup.id} className="saved-lineup-card">
                    {getSavedLineupThumbnail(lineup) ? (
                      <img src={getSavedLineupThumbnail(lineup)} alt={lineup.name} className="saved-lineup-thumbnail" />
                    ) : (
                      <div className="saved-lineup-thumbnail saved-lineup-thumbnail-placeholder">
                        {getSavedLineupFormatLabel(lineup)}
                      </div>
                    )}
                    <div>
                      <strong>{lineup.name}</strong>
                      <span>
                        {getSavedLineupFormatLabel(lineup)}
                      </span>
                      <time dateTime={lineup.created_at}>
                        {getSavedLineupDateTime(lineup)}
                      </time>
                    </div>
                    <div className="saved-lineup-actions">
                      <button type="button" onClick={() => loadSavedLineup(lineup)}>
                        {copy.view}
                      </button>
                      <button
                        type="button"
                        className="saved-lineup-share"
                        onClick={() => shareSavedLineup(lineup)}
                        aria-label={copy.share}
                      >
                        <Share2 size={14} />
                      </button>
                      <button type="button" onClick={() => deleteSavedLineup(lineup.id)} disabled={deletingLineupId === lineup.id}>
                        {deletingLineupId === lineup.id ? <ButtonSpinner /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : (
        <div className="content-grid">
            <section className="stats-column">
              <div className="panel-heading">
                <span>{copy.squadEditor}</span>
                <strong>{benchCount}/{activePlayers.length} {copy.subs}</strong>
              </div>
              <div className="squad-editor">
                {activePlayers.map((player) => (
                  <div key={player.id} className="squad-row">
                    <div className="squad-row-header">
                      <span>{player.id}</span>
                      <strong>{getDisplayPosition(player.position, language)}</strong>
                      <button
                        type="button"
                        onClick={() => addPlayerInput(player.id)}
                        disabled={player.extraNames.length >= 1}
                        aria-label={`${copy.addPlayer} ${player.id}`}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="squad-input-list">
                      <input
                        value={player.starterName}
                        onChange={(event) => renamePlayer(player.id, "starterName", event.target.value)}
                        placeholder={copy.starterPlaceholder}
                      />
                      <input
                        value={player.substituteName}
                        onChange={(event) => renamePlayer(player.id, "substituteName", event.target.value)}
                        placeholder={copy.substitutePlaceholder}
                      />
                      {player.extraNames.slice(0, 1).map((extraName, index) => (
                        <div key={index} className="extra-player-input">
                          <input
                            value={extraName}
                            onChange={(event) => renameExtraPlayer(player.id, index, event.target.value)}
                            placeholder={`${copy.extraPlayerPlaceholder} ${index + 3}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeExtraPlayerInput(player.id, index)}
                            aria-label={`${copy.delete} ${copy.player} ${index + 3}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section
              className={`lineup-column ${
                isAnimationTool ? "tool-animation" : isDrawMode ? "tool-draw" : "tool-personnel"
              }`}
            >
              <div className="lineup-header">
                <div className="lineup-header-actions">
                  <button type="button" className="save-button" onClick={handleSaveCurrentLineup} disabled={isLockerLoading}>
                    {isLockerLoading ? <ButtonSpinner /> : lockerStatus === copy.saved ? <Check size={14} /> : <Save size={14} />}
                    <span>{copy.save}</span>
                  </button>
                  <button type="button" onClick={resetWorkspace}>
                    <RotateCcw size={14} />
                    <span>{copy.reset}</span>
                  </button>
                </div>
              </div>
              {selectedMobilePlayer ? (
                <div className="mobile-player-editor">
                  <div className="mobile-player-editor-top">
                    <label htmlFor="mobile-player-select">{copy.player}</label>
                    <select
                      id="mobile-player-select"
                      value={selectedMobilePlayer.id}
                      onChange={(event) => setSelectedMobilePlayerId(Number(event.target.value))}
                    >
                      {activePlayers.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.id}. {getDisplayPosition(player.position, language)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mobile-player-inputs">
                    <input
                      value={selectedMobilePlayer.starterName}
                      onChange={(event) => renamePlayer(selectedMobilePlayer.id, "starterName", event.target.value)}
                      placeholder={copy.starterPlaceholder}
                    />
                    <input
                      value={selectedMobilePlayer.substituteName}
                      onChange={(event) => renamePlayer(selectedMobilePlayer.id, "substituteName", event.target.value)}
                      placeholder={copy.substitutePlaceholder}
                    />
                    {selectedMobilePlayer.extraNames.slice(0, 1).map((extraName, index) => (
                      <div key={index} className="mobile-extra-player-input">
                        <input
                          value={extraName}
                          onChange={(event) => renameExtraPlayer(selectedMobilePlayer.id, index, event.target.value)}
                          placeholder={`${copy.extraPlayerPlaceholder} ${index + 3}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeExtraPlayerInput(selectedMobilePlayer.id, index)}
                          aria-label={`${copy.delete} ${copy.player} ${index + 3}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    {selectedMobilePlayer.extraNames.length < 1 ? (
                      <button
                        type="button"
                        className="mobile-add-player"
                        onClick={() => addPlayerInput(selectedMobilePlayer.id)}
                      >
                        <Plus size={14} />
                        {copy.addSubstitute}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <div
                className={`lineup-stage sandbox-canvas-stage ${
                  isAnimationTool ? "tool-animation" : isDrawMode ? "tool-draw" : "tool-personnel"
                } ${
                  draggingId !== null || draggingOpponentId !== null || draggingTacticalMarkerId !== null ? "dock-dimmed" : ""
                } ${showMarkerTray ? "show-marker-tray" : ""} ${
                  showAnimationTimeline ? "show-animation-panel" : ""
                }`}
              >
                <aside className="sandbox-tool-sidebar" aria-label="Canvas tools">
                  <button
                    type="button"
                    className={activeBottomSheetTool === "PERSONNEL_TOOL" ? "active" : ""}
                    onClick={() => applySandboxTool("PERSONNEL_TOOL")}
                    aria-label="Đội hình"
                  >
                    <Users size={18} />
                    <span>Đội hình</span>
                  </button>
                  <button
                    type="button"
                    className={activeBottomSheetTool === "DRAW_TOOL" ? "active" : ""}
                    onClick={() => applySandboxTool("DRAW_TOOL")}
                    aria-label={copy.draw}
                  >
                    <PenLine size={18} />
                    <span>{copy.draw}</span>
                  </button>
                  <button
                    type="button"
                    className={activeBottomSheetTool === "ANIMATION_TOOL" ? "active" : ""}
                    onClick={() => applySandboxTool("ANIMATION_TOOL")}
                    aria-label="Tạo chuyển động"
                  >
                    <Clapperboard size={18} />
                    <span>Chuyển động</span>
                  </button>
                </aside>
                {showMarkerTray ? (
                  <div className="custom-side-tray">
                    <div className="custom-player-tray" aria-label={copy.customPlayerTray}>
                      <span>{copy.players}</span>
                      <div className="custom-player-dot-list">
                        {players.map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            className={`custom-player-dot ${player.onPitch ? "placed" : ""}`}
                            onPointerDown={(event) => handleDragStart(event, player.id)}
                            onPointerMove={(event) => handleDragMove(event, player.id)}
                            onPointerUp={stopDragging}
                            onPointerCancel={stopDragging}
                            aria-label={`${copy.dragPlayer} ${player.id}`}
                          >
                            {player.id}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="opponent-tray" aria-label={copy.opponentTray}>
                      <span>{copy.opponent}</span>
                      <div className="opponent-dot-list">
                        {opponentMarkers.map((marker) => (
                          <button
                            key={marker.id}
                            type="button"
                            className={`opponent-dot ${marker.onPitch ? "placed" : ""}`}
                            onPointerDown={(event) => handleOpponentDragStart(event, marker.id)}
                            onPointerMove={(event) => handleOpponentDragMove(event, marker.id)}
                            onPointerUp={stopOpponentDragging}
                            onPointerCancel={stopOpponentDragging}
                            aria-label={`${copy.dragOpponent} ${marker.id}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="ball-tray" aria-label="Ball marker tray">
                      <span>Bóng</span>
                      {ballMarker && !isBallOnPitch ? (
                        <button
                          type="button"
                          className="tactical-ball-tray-dot"
                          onPointerDown={(event) => handleTacticalMarkerPointerDown(event, ballMarker.id)}
                          onPointerMove={(event) => handleTacticalMarkerPointerMove(event, ballMarker.id)}
                          onPointerUp={stopTacticalMarkerDragging}
                          onPointerCancel={stopTacticalMarkerDragging}
                          aria-label="Drag ball marker"
                        />
                      ) : null}
                    </div>
                  </div>
                ) : null}
              <div
                ref={pitchRef}
                className={`pitch relative mx-auto aspect-[7/10] border-[4px] border-white/80 touch-none select-none ${
                  isDrawMode ? "draw-mode" : ""
                } ${isPlaying && isAnimationTool ? "playback-mode" : ""}`}
              >
                <div className="absolute inset-[4%] border-[3px] border-white/90" />
                <div className="absolute left-[4%] right-[4%] top-1/2 h-[3px] -translate-y-1/2 bg-white/90" />
                <div className="absolute left-1/2 top-1/2 h-[22%] w-[31%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white/90" />
                <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
                <div className="absolute left-1/2 top-[4%] h-[15%] w-[48%] -translate-x-1/2 border-x-[3px] border-b-[3px] border-white/90" />
                <div className="absolute left-1/2 top-[4%] h-[7%] w-[26%] -translate-x-1/2 border-x-[3px] border-b-[3px] border-white/90" />
                <div className="absolute bottom-[4%] left-1/2 h-[15%] w-[48%] -translate-x-1/2 border-x-[3px] border-t-[3px] border-white/90" />
                <div className="absolute bottom-[4%] left-1/2 h-[7%] w-[26%] -translate-x-1/2 border-x-[3px] border-t-[3px] border-white/90" />

                <svg
                  ref={drawLayerRef}
                  className="draw-layer"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {showAllCanvasObjects ? drawLines.map((line) => (
                    <polyline
                      key={line.id}
                      points={line.points.map((point) => `${point.x},${point.y}`).join(" ")}
                      fill="none"
                      stroke="#facc15"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.15"
                      vectorEffect="non-scaling-stroke"
                    />
                  )) : null}
                </svg>
                {isDrawMode && showDrawTools ? (
                  <div
                    className="draw-hit-layer"
                    onPointerDown={startDrawing}
                    onPointerMove={continueDrawing}
                    onPointerUp={stopDrawing}
                    onPointerCancel={stopDrawing}
                    aria-hidden="true"
                  />
                ) : null}

                {activePlayers.map((player) => {
                  const animationMarker = isAnimationTool ? animationMarkerMap.get(`p${player.id}`) : null;
                  if (animationMarker && !animationMarker.onPitch) return null;
                  const starterName = player.starterName.trim() || `${copy.player} ${player.id}`;
                  const benchNames = getBenchNames(player);

                  return (
                    <div
                      key={player.id}
                      onPointerDown={(event) => handleDragStart(event, player.id)}
                      onPointerMove={(event) => handleDragMove(event, player.id)}
                      onPointerUp={stopDragging}
                      onPointerCancel={stopDragging}
                  className={`player-token group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center outline-none ${
                    draggingId === player.id ? "dragging" : ""
                  }`}
                      style={{ left: `${animationMarker?.x ?? player.x}%`, top: `${animationMarker?.y ?? player.y}%` }}
                      role="button"
                      tabIndex={0}
                      aria-label={`${copy.dragPlayer} ${getDisplayPosition(player.position, language)}`}
                    >
                      <span
                        className={`kit-disc transition group-active:scale-110 ${
                          draggingId === player.id ? "ring-4 ring-emerald-200" : ""
                        }`}
                      >
                        <span className="kit-number">{player.id}</span>
                      </span>
                      <span className="token-name">{starterName}</span>
                      {benchNames.length > 0 ? (
                        <span className="bench-list">
                          {benchNames.slice(0, 2).map((name, index) => (
                            <small key={`${name}-${index}`}>{name}</small>
                          ))}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
                {showAllCanvasObjects
                  ? (isAnimationTool ? animationOpponentMarkers : opponentMarkers.filter((marker) => marker.onPitch))
                      .map((marker) => {
                        return (
                        <button
                          key={`opponent-${marker.id}`}
                          type="button"
                          className={`opponent-pitch-dot ${draggingOpponentId === marker.id ? "dragging" : ""}`}
                          style={{
                            left: `${marker.x}%`,
                            top: `${marker.y}%`,
                          }}
                          onPointerDown={(event) => handleOpponentDragStart(event, marker.id)}
                          onPointerMove={(event) => handleOpponentDragMove(event, marker.id)}
                          onPointerUp={stopOpponentDragging}
                          onPointerCancel={stopOpponentDragging}
                          aria-label={`${copy.dragOpponent} ${marker.id}`}
                        />
                        );
                      })
                  : null}
                {ballMarker && isBallOnPitch ? (
                  <button
                    type="button"
                    className={`tactical-ball-marker ${draggingTacticalMarkerId === ballMarker.id ? "dragging" : ""}`}
                    style={{ left: `${ballMarker.x}%`, top: `${ballMarker.y}%` }}
                    onPointerDown={(event) => handleTacticalMarkerPointerDown(event, ballMarker.id)}
                    onPointerMove={(event) => handleTacticalMarkerPointerMove(event, ballMarker.id)}
                    onPointerUp={stopTacticalMarkerDragging}
                    onPointerCancel={stopTacticalMarkerDragging}
                    aria-label="Drag ball marker"
                  />
                ) : null}
              </div>
              <button
                type="button"
                className="mobile-squad-toggle"
                onClick={() => setIsMobileSquadDrawerOpen(true)}
                aria-label={copy.squadEditor}
                title={copy.squadEditor}
              >
                <Pencil size={18} />
              </button>
              <div
                className={`mobile-squad-drawer ${isMobileSquadDrawerOpen ? "open" : ""}`}
                aria-hidden={!isMobileSquadDrawerOpen}
              >
                <div className="mobile-squad-drawer-header">
                  <span>{copy.squadEditor}</span>
                  <button
                    type="button"
                    onClick={() => setIsMobileSquadDrawerOpen(false)}
                    aria-label={copy.close}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="mobile-squad-drawer-list">
                  {activePlayers.map((player) => (
                    <div key={player.id} className="mobile-squad-player-card">
                      <div className="mobile-squad-player-title">
                        <span>{player.id}</span>
                        <strong>{getDisplayPosition(player.position, language)}</strong>
                        <button
                          type="button"
                          onClick={() => addPlayerInput(player.id)}
                          disabled={player.extraNames.length >= 1}
                          aria-label={`${copy.addPlayer} ${player.id}`}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <input
                        value={player.starterName}
                        onChange={(event) => renamePlayer(player.id, "starterName", event.target.value)}
                        placeholder={copy.starterPlaceholder}
                      />
                      <input
                        value={player.substituteName}
                        onChange={(event) => renamePlayer(player.id, "substituteName", event.target.value)}
                        placeholder={copy.substitutePlaceholder}
                      />
                      {player.extraNames.slice(0, 1).map((extraName, index) => (
                        <div key={index} className="mobile-squad-extra-input">
                          <input
                            value={extraName}
                            onChange={(event) => renameExtraPlayer(player.id, index, event.target.value)}
                            placeholder={`${copy.extraPlayerPlaceholder} ${index + 3}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeExtraPlayerInput(player.id, index)}
                            aria-label={`${copy.delete} ${copy.player} ${index + 3}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              {showAnimationTimeline ? (
                <aside className="workspace-timeline" aria-label={copy.tacticalTimeline}>
                  <div className="workspace-timeline-title">
                    <span>Tạo chuyển động</span>
                    <strong>{animationFrames.length} {copy.framesUnit}</strong>
                  </div>
                  <div className="workspace-timeline-controls">
                    <button
                      type="button"
                      className="playback-button"
                      onClick={isPlaying ? pause : playAnimationFromStart}
                      disabled={animationFrames.length === 0}
                      aria-label={isPlaying ? "Pause" : "Play"}
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button
                      type="button"
                      className="playback-button"
                      onClick={stopAnimationPlayback}
                      disabled={animationFrames.length === 0}
                      aria-label="Stop"
                      title="Stop"
                    >
                      <Square size={15} />
                    </button>
                    <button
                      type="button"
                      className={`playback-button ${isLooping ? "active" : ""}`}
                      onClick={toggleLoop}
                      aria-label="Loop"
                      title="Loop"
                    >
                      <Repeat size={16} />
                    </button>
                    <button type="button" className="clear-frames-mobile-button" onClick={clearFrames} disabled={animationFrames.length === 0}>
                      <Trash2 size={15} />
                      <span>{copy.clearAll}</span>
                    </button>
                  </div>
                  <div
                    ref={frameListRef}
                    className="workspace-frame-list"
                    onPointerDown={startFrameListDrag}
                    onPointerMove={moveFrameListDrag}
                    onPointerUp={stopFrameListDrag}
                    onPointerCancel={stopFrameListDrag}
                  >
                    {animationFrames.length === 0 ? (
                      <div className="workspace-frame-empty">
                        Chưa có bước nào. Bấm Thêm bước để tạo Bước 1.
                      </div>
                    ) : null}
                    {animationFrames.map((_, index) => (
                      <div
                        key={index}
                        className={`workspace-frame-item ${
                          currentFrameIndex === index && currentFrameIndex < animationFrames.length && !playbackFrames ? "active" : ""
                        }`}
                      >
                        <button type="button" className="workspace-frame-select" onClick={() => selectFrameFromList(index)}>
                          {copy.frame} {index + 1}
                        </button>
                        <button
                          type="button"
                          className="workspace-frame-delete-button"
                          data-frame-delete
                          data-frame-index={index}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onPointerUp={(event) => event.stopPropagation()}
                          onClick={deleteFrameFromList}
                          aria-label={`${copy.delete} ${copy.frame} ${index + 1}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="workspace-add-frame-button" onClick={addFrame}>
                    <Plus size={15} />
                    {copy.addFrame}
                  </button>
                </aside>
              ) : null}
              </div>
              <div className="lineup-footer-actions">
                <div className={`footer-formation-switch ${pitchSize === "custom" ? "custom-formation-switch" : ""}`}>
                  {showDrawSheet && isDrawMode ? (
                    <div className="draw-history-actions">
                      <button type="button" onClick={undoDrawLine} disabled={drawLines.length === 0}>
                        <Undo2 size={14} />
                        <span>{copy.undo}</span>
                      </button>
                      <button type="button" onClick={redoDrawLine} disabled={redoDrawLines.length === 0}>
                        <Redo2 size={14} />
                        <span>{copy.redo}</span>
                      </button>
                      <button type="button" onClick={clearDrawLines} disabled={drawLines.length === 0}>
                        <Trash2 size={14} />
                        <span>{copy.clearLines}</span>
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="footer-actions-right">
                  <button type="button" className="share-button" onClick={copyShareLink}>
                    {copyStatus === "copied" ? <Check size={14} /> : <Clipboard size={14} />}
                    <span>{copyStatus === "copied" ? copy.copied : copy.share}</span>
                  </button>
                  <button type="button" className="download-button" onClick={downloadLineupImage}>
                    <Download size={14} />
                    <span>{copy.download}</span>
                  </button>
                </div>
              </div>
            </section>
        </div>
        )}
      </div>
      {activeTab === "lineup" && dragPreview ? (
        <div
          className={`drag-preview ${
            dragPreview.type === "opponent" ? "opponent-preview" : dragPreview.type === "ball" ? "ball-preview" : "player-preview"
          }`}
          style={{ left: dragPreview.x, top: dragPreview.y }}
          aria-hidden="true"
        >
          {dragPreview.type === "player" ? dragPreview.id : null}
        </div>
      ) : null}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.tone}`} role="status">
            {toast.tone === "success" ? <Check size={16} /> : null}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </main>
  );
}

const fetchEmailProviders = async (email: string) => {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("email_auth_providers", { p_email: email });
  if (error) {
    console.error("email_auth_providers error:", error.message);
    return null;
  }
  return data as { account_exists: boolean; has_password: boolean; has_google: boolean } | null;
};

function AuthDialog({
  language,
  initialMode = "sign_in",
  onClose,
  onAuthenticated,
}: {
  language: Language;
  initialMode?: "sign_in" | "sign_up" | "reset";
  onClose: () => void;
  onAuthenticated?: () => void;
}) {
  const copy = copyByLanguage[language];
  const [authMode, setAuthMode] = useState<"sign_in" | "sign_up" | "reset">(initialMode);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isGoogleAuthLoading, setIsGoogleAuthLoading] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);

  useEffect(() => {
    if (resetCooldown <= 0) return;
    const intervalId = window.setInterval(() => {
      setResetCooldown((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(intervalId);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [resetCooldown > 0]);

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setAuthStatus(copy.supabaseMissing);
      return;
    }

    setAuthStatus("");
    const email = authEmail.trim().toLowerCase();
    const password = authPassword.trim();

    if (!isValidEmail(email)) {
      setAuthStatus(copy.invalidEmail);
      return;
    }

    if (authMode !== "reset" && password.length < 6) {
      setAuthStatus(copy.passwordTooShort);
      return;
    }

    setIsAuthSubmitting(true);
    if (authMode === "reset") {
      const providers = await fetchEmailProviders(email);
      if (providers?.account_exists && providers.has_google && !providers.has_password) {
        setAuthStatus(copy.googleAccountNoPassword);
        setIsAuthSubmitting(false);
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname,
      });
      if (error) {
        const cooldownSeconds = parseRateLimitSeconds(error.message);
        if (cooldownSeconds) {
          setResetCooldown(cooldownSeconds);
          setAuthStatus("");
        } else {
          setAuthStatus(localizeError(error.message, copy));
        }
      } else {
        setResetCooldown(0);
        setAuthStatus(copy.resetEmailSent);
      }
      setIsAuthSubmitting(false);
      return;
    }

    if (authMode === "sign_up") {
      const providers = await fetchEmailProviders(email);
      if (providers?.has_google) {
        setAuthStatus(copy.emailUsesGoogle);
        setIsAuthSubmitting(false);
        return;
      }

      const result = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: authUsername.trim() || email.split("@")[0] } },
      });

      if (result.error) {
        setAuthStatus(localizeError(result.error.message, copy));
        setIsAuthSubmitting(false);
        return;
      }

      const identities = result.data.user?.identities;
      if (Array.isArray(identities) && identities.length === 0) {
        setAuthStatus(copy.emailAlreadyRegistered);
        setIsAuthSubmitting(false);
        return;
      }

      setAuthStatus(copy.checkEmailToConfirm);
      setIsAuthSubmitting(false);
      return;
    }

    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) {
      const providers = await fetchEmailProviders(email);
      if (providers?.account_exists && providers.has_google && !providers.has_password) {
        setAuthStatus(copy.emailUsesGoogle);
      } else {
        setAuthStatus(localizeError(result.error.message, copy));
      }
      setIsAuthSubmitting(false);
      return;
    }

    setIsAuthSubmitting(false);
    setAuthStatus(copy.signedInSuccessfully);
    onAuthenticated?.();
    onClose();
  };

  const signInWithGoogle = async () => {
    if (!supabase) {
      setAuthStatus(copy.supabaseMissing);
      return;
    }
    setIsGoogleAuthLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) {
      setAuthStatus(localizeError(error.message, copy));
      setIsGoogleAuthLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <form className="auth-screen-card" onSubmit={handleAuthSubmit}>
        <div className="panel-heading">
          <span>{copy.authTitle}</span>
          <button type="button" onClick={onClose}>
            x
          </button>
        </div>
        {!isSupabaseConfigured ? <p className="locker-message">{copy.supabaseMissing}</p> : null}
        <div className="auth-mode-switch">
          <button
            type="button"
            className={authMode === "sign_in" ? "active" : ""}
            onClick={() => {
              setAuthMode("sign_in");
              setAuthStatus("");
            }}
          >
            {copy.signIn}
          </button>
          <button
            type="button"
            className={authMode === "sign_up" ? "active" : ""}
            onClick={() => {
              setAuthMode("sign_up");
              setAuthStatus("");
            }}
          >
            {copy.signUp}
          </button>
        </div>
        {authMode === "sign_up" ? (
          <input value={authUsername} onChange={(event) => setAuthUsername(event.target.value)} placeholder={copy.username} />
        ) : null}
        <input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder={copy.email} required />
        {authMode !== "reset" ? (
          <input
            type="password"
            value={authPassword}
            onChange={(event) => setAuthPassword(event.target.value)}
            placeholder={copy.password}
            required
          />
        ) : null}
        <button
          type="submit"
          disabled={!isSupabaseConfigured || isAuthSubmitting || isGoogleAuthLoading || (authMode === "reset" && resetCooldown > 0)}
        >
          {isAuthSubmitting ? <ButtonSpinner /> : null}
          {authMode === "reset" && resetCooldown > 0
            ? `${copy.resetPassword} (${resetCooldown}s)`
            : authMode === "sign_up"
              ? copy.signUp
              : authMode === "reset"
                ? copy.resetPassword
                : copy.signIn}
        </button>
        <button
          type="button"
          className="google-auth-button"
          onClick={signInWithGoogle}
          disabled={!isSupabaseConfigured || isAuthSubmitting || isGoogleAuthLoading}
        >
          {isGoogleAuthLoading ? <ButtonSpinner /> : null}
          {copy.googleSignIn}
        </button>
        {authMode === "reset" && resetCooldown > 0 ? (
          <p className="locker-message">{copy.resetCooldownMessage.replace("{seconds}", String(resetCooldown))}</p>
        ) : authStatus ? (
          <p className="locker-message">{authStatus}</p>
        ) : null}
        <button
          type="button"
          className="auth-forgot-link"
          onClick={() => {
            setAuthMode(authMode === "reset" ? "sign_in" : "reset");
            setAuthStatus("");
          }}
        >
          {authMode === "reset" ? copy.backToSignIn : copy.forgotPassword}
        </button>
      </form>
    </div>
  );
}

function Root() {
  // Deep links (shared line-up, specific tab) should skip the landing page.
  const hasDeepLink = useMemo(() => hasAppRoute(), []);
  const [entered, setEntered] = useState(hasDeepLink);
  const [language, setLanguage] = useState<Language>("vi");
  const [authDialogMode, setAuthDialogMode] = useState<"sign_in" | "sign_up" | null>(null);
  const { user, isAuthLoading, signOut } = useAuth();
  const enterWorkspace = (replace = false) => {
    const url = new URL(window.location.href);
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    url.searchParams.set("tab", "lineup");
    url.searchParams.set("pitch", "7");
    if (replace) {
      window.history.replaceState({ tab: "lineup" }, "", url.toString());
    } else {
      window.history.pushState({ tab: "lineup" }, "", url.toString());
    }
    setEntered(true);
  };

  useEffect(() => {
    const syncEnteredFromUrl = () => setEntered(hasAppRoute());
    window.addEventListener("popstate", syncEnteredFromUrl);
    return () => window.removeEventListener("popstate", syncEnteredFromUrl);
  }, []);

  if (!entered) {
    return (
      <>
        <LandingPage
          language={language}
          onChangeLanguage={setLanguage}
          onExplore={() => enterWorkspace()}
          onSignIn={() => setAuthDialogMode("sign_in")}
          onSignUp={() => setAuthDialogMode("sign_up")}
          user={user}
          isAuthLoading={isAuthLoading}
          onSignOut={signOut}
          authLabels={{
            signIn: copyByLanguage[language].signIn,
            signUp: copyByLanguage[language].signUp,
            signOut: copyByLanguage[language].signOut,
          }}
        />
        {authDialogMode ? (
          <AuthDialog
            language={language}
            initialMode={authDialogMode}
            onClose={() => setAuthDialogMode(null)}
            onAuthenticated={() => {
              setAuthDialogMode(null);
              enterWorkspace();
            }}
          />
        ) : null}
      </>
    );
  }

  return <App initialLanguage={language} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
