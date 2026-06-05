import React, { PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import type { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { create } from "zustand";
import { Bell, Check, ChevronDown, Clipboard, Download, Pencil, Plus, Redo2, Save, Share2, Trash2, Undo2, X } from "lucide-react";
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
  isAnimationMode: boolean;
  tactics: TacticalPlaybook[];
  activeTacticId: string;
  frames: TacticalFrame[];
  draftFrame: TacticalFrame;
  playbackFrames: TacticalFrame[] | null;
  currentFrameIndex: number;
  isPlaying: boolean;
  isLooping: boolean;
  setAnimationMode: (value: boolean) => void;
  selectFrame: (index: number) => void;
  addFrame: () => void;
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
type AppTab = "lineup" | "tactics" | "profile" | "locker" | "team";
type TeamDetailTab = "members" | "tactics";
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
  pitchSize?: PitchSize;
  customCount?: number;
  formation: FormationKey;
  players: Pick<Player, "id" | "starterName" | "substituteName" | "extraNames" | "x" | "y" | "onPitch">[];
  opponentMarkers?: OpponentMarker[];
  drawLines?: DrawLine[];
};

type StoredLineupState = {
  version: 1;
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
  team_id: string | null;
  name: string;
  format: string;
  players_data: StoredLineupState | SavedTacticsState;
  created_at: string;
};

type SaveRequestKind = "lineup" | "tactics";

type ProfileRecord = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  full_name: string | null;
  bio: string | null;
  favorite_team: string | null;
  favorite_position: string | null;
  location: string | null;
  jersey_number: number | null;
};

type MemberProfileRecord = {
  id: string;
  username: string | null;
  full_name: string | null;
  favorite_position: string | null;
};

type TeamRecord = {
  id: string;
  user_id: string;
  name: string;
  logo_url: string | null;
  logo_icon: string | null;
  shirt_color: string;
  shorts_color: string;
  socks_color: string;
  slogan: string | null;
  created_at?: string;
  updated_at?: string;
};

type TeamMemberPosition = "GK" | "CB" | "LB" | "RB" | "LWB" | "RWB" | "DM" | "CM" | "AM" | "LW" | "RW" | "ST" | "DF" | "MF" | "FW";

type TeamMemberRecord = {
  id: string;
  team_id: string;
  user_id: string;
  jersey_number: number;
  nickname: string;
  position: TeamMemberPosition;
  created_at?: string;
  updated_at?: string;
};

type TeamMemberDisplay = TeamMemberRecord & {
  isOwner?: boolean;
};

type TeamInvitationStatus = "pending" | "accepted" | "declined";

type TeamInvitationRecord = {
  id: string;
  team_id: string;
  invited_user_id: string;
  invited_by: string;
  status: TeamInvitationStatus;
  jersey_number: number;
  nickname: string;
  position: TeamMemberPosition;
  created_at?: string;
  updated_at?: string;
};

type TeamInvitationDisplay = TeamInvitationRecord & {
  teamName: string;
};

type MemberRemovalNotice = {
  id: string;
  teamName: string;
  createdAt: number;
};

const lineupStorageKey = "lineup-football-default-state-v1";

const pitchSizes: PitchSize[] = [5, 7, 11];
const pitchOptions: { value: PitchSize; label: string }[] = [
  { value: 5, label: "Sân 5" },
  { value: 7, label: "Sân 7" },
  { value: 11, label: "Sân 11" },
  { value: "custom", label: "Cá nhân hóa" },
];

const defaultTeamColors = {
  shirt: "#f8fafc",
  shorts: "#111827",
  socks: "#dc2626",
};

const teamLogoIcons = ["⚽", "🏆", "⭐", "🔥", "🛡️", "🥅"];

const teamColorPalette = [
  "#f8fafc",
  "#111827",
  "#dc2626",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#2563eb",
  "#7c3aed",
  "#ec4899",
  "#14b8a6",
];

const memberPositions: TeamMemberPosition[] = ["GK", "CB", "LB", "RB", "LWB", "RWB", "DM", "CM", "AM", "LW", "RW", "ST", "DF", "MF", "FW"];

const getShortMemberId = (userId?: string | null) => (userId ? userId.replaceAll("-", "").slice(0, 10).toUpperCase() : "");

const parseProfilePositions = (value?: string | null): TeamMemberPosition[] =>
  (value ?? "")
    .split(",")
    .map((position) => position.trim().toUpperCase())
    .filter((position): position is TeamMemberPosition => memberPositions.includes(position as TeamMemberPosition));

const memberPositionPoints: Record<TeamMemberPosition, { x: number; y: number }[]> = {
  GK: [{ x: 50, y: 86 }],
  CB: [
    { x: 35, y: 68 },
    { x: 65, y: 68 },
    { x: 50, y: 62 },
  ],
  LB: [{ x: 24, y: 66 }],
  RB: [{ x: 76, y: 66 }],
  LWB: [{ x: 20, y: 56 }],
  RWB: [{ x: 80, y: 56 }],
  DF: [
    { x: 35, y: 68 },
    { x: 65, y: 68 },
    { x: 50, y: 62 },
  ],
  DM: [{ x: 50, y: 56 }],
  CM: [
    { x: 38, y: 46 },
    { x: 62, y: 46 },
  ],
  AM: [{ x: 50, y: 34 }],
  MF: [
    { x: 30, y: 46 },
    { x: 50, y: 42 },
    { x: 70, y: 46 },
  ],
  LW: [{ x: 25, y: 24 }],
  RW: [{ x: 75, y: 24 }],
  ST: [{ x: 50, y: 20 }],
  FW: [
    { x: 42, y: 22 },
    { x: 58, y: 22 },
  ],
};

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
  teamMenu: string;
  teamTitle: string;
  teamSubtitle: string;
  teamName: string;
  teamNamePlaceholder: string;
  teamLogo: string;
  uploadTeamLogo: string;
  uploadingTeamLogo: string;
  teamLogoUploaded: string;
  teamLogoUploadError: string;
  chooseTeamIcon: string;
  shirtColor: string;
  teamSlogan: string;
  teamSloganPlaceholder: string;
  saveTeam: string;
  teamSaved: string;
  teamNameRequired: string;
  myTeams: string;
  createTeam: string;
  editTeam: string;
  deleteTeam: string;
  searchTeams: string;
  noTeams: string;
  noTeamMatches: string;
  cancel: string;
  teamDetails: string;
  backToTeams: string;
  totalMembers: string;
  miniLineup: string;
  editLineupBoard: string;
  copyTeamLink: string;
  viewQrCode: string;
  downloadQr: string;
  teamQrTitle: string;
  members: string;
  teamTacticsTab: string;
  emptyLocker: string;
  addFirstPlayer: string;
  addMember: string;
  inviteMember: string;
  invitationSent: string;
  invitedToTeam: string;
  acceptInvite: string;
  declineInvite: string;
  noNotifications: string;
  inviteAccepted: string;
  inviteDeclined: string;
  invalidUserId: string;
  joinTeamTitle: string;
  joinTeamPrompt: string;
  confirmJoinTeam: string;
  joinedTeam: string;
  jerseyNumber: string;
  playerNickname: string;
  teamOwnerTag: string;
  removedFromTeam: string;
  confirmRemoveMemberTitle: string;
  confirmRemoveMemberMessage: string;
  confirmRemoveMemberAction: string;
  memberRemovedNotification: string;
  lockerTitle: string;
  saveCurrentLineup: string;
  saveTacticsBoard: string;
  savedLineups: string;
  teamSavedLineups: string;
  saveDestinationTitle: string;
  saveToPersonalLocker: string;
  saveToTeamQuestion: string;
  saveToThisTeam: string;
  lineupName: string;
  avatarUrl: string;
  updateProfile: string;
  profileSubtitle: string;
  userId: string;
  copyUserId: string;
  fullName: string;
  bio: string;
  favoriteTeam: string;
  favoritePosition: string;
  location: string;
  profileJerseyNumber: string;
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
    lockerTab: "Chiến thuật của tôi",
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
    lockerMenu: "Chiến thuật của tôi",
    teamMenu: "Đội bóng",
    teamTitle: "Đội bóng của bạn",
    teamSubtitle: "Định hình thương hiệu đội bóng phong trào của bạn.",
    teamName: "Tên đội bóng",
    teamNamePlaceholder: "FC Bạn Hữu, Văn Phòng FC...",
    teamLogo: "Logo đội bóng",
    uploadTeamLogo: "Tải logo lên",
    uploadingTeamLogo: "Đang tải logo lên…",
    teamLogoUploaded: "Đã cập nhật logo đội bóng",
    teamLogoUploadError: "Không thể tải logo lên. Vui lòng thử lại.",
    chooseTeamIcon: "Chọn icon nhanh",
    shirtColor: "Màu áo chính",
    teamSlogan: "Mô tả/Slogan",
    teamSloganPlaceholder: "Đá giao lưu - Vui là chính",
    saveTeam: "Lưu đội bóng",
    teamSaved: "Đã lưu đội bóng",
    teamNameRequired: "Tên đội bóng là bắt buộc.",
    myTeams: "Đội bóng của tôi",
    createTeam: "Tạo đội bóng",
    editTeam: "Sửa",
    deleteTeam: "Xoá",
    searchTeams: "Tìm đội bóng",
    noTeams: "Bạn chưa có đội bóng nào. Tạo đội đầu tiên để bắt đầu.",
    noTeamMatches: "Không tìm thấy đội bóng phù hợp.",
    cancel: "Huỷ",
    teamDetails: "Chi tiết đội bóng",
    backToTeams: "Quay lại danh sách",
    totalMembers: "thành viên",
    miniLineup: "Đội hình hiện tại",
    editLineupBoard: "Chỉnh sửa sơ đồ",
    copyTeamLink: "Copy Link",
    viewQrCode: "Xem mã QR",
    downloadQr: "Download QR",
    teamQrTitle: "Mã QR mời vào đội",
    members: "Thành viên",
    teamTacticsTab: "Chiến thuật đội",
    emptyLocker: "Phòng thay đồ đang trống! Hãy thêm đồng đội để bắt đầu chiến thuật.",
    addFirstPlayer: "Thêm cầu thủ đầu tiên",
    addMember: "Thêm thành viên",
    inviteMember: "Gửi lời mời",
    invitationSent: "Đã gửi lời mời vào đội bóng.",
    invitedToTeam: "Bạn được mời vào đội bóng",
    acceptInvite: "Đồng ý",
    declineInvite: "Từ chối",
    noNotifications: "Chưa có thông báo mới.",
    inviteAccepted: "Bạn đã tham gia đội bóng.",
    inviteDeclined: "Bạn đã từ chối lời mời.",
    invalidUserId: "ID user không hợp lệ. Vui lòng copy đúng ID trong hồ sơ người dùng.",
    joinTeamTitle: "Tham gia đội bóng",
    joinTeamPrompt: "Bạn có muốn xác nhận tham gia đội bóng này không?",
    confirmJoinTeam: "Xác nhận tham gia",
    joinedTeam: "Bạn đã tham gia đội bóng.",
    jerseyNumber: "Số áo",
    playerNickname: "Tên/Biệt danh",
    teamOwnerTag: "Chủ đội bóng",
    removedFromTeam: "Bạn đã bị chủ đội mời ra khỏi đội bóng.",
    confirmRemoveMemberTitle: "Xác nhận xoá thành viên",
    confirmRemoveMemberMessage: "Bạn có chắc muốn xoá thành viên này khỏi đội bóng không?",
    confirmRemoveMemberAction: "Xoá thành viên",
    memberRemovedNotification: "Bạn đã bị xoá khỏi đội bóng",
    lockerTitle: "Chiến thuật của tôi",
    saveCurrentLineup: "Lưu đội hình hiện tại",
    saveTacticsBoard: "Lưu bảng chiến thuật",
    savedLineups: "Đội hình đã lưu",
    teamSavedLineups: "Đội hình/chiến thuật của đội",
    saveDestinationTitle: "Lưu vào đâu?",
    saveToPersonalLocker: "Phòng thay đồ cá nhân",
    saveToTeamQuestion: "Bạn có muốn lưu về đội bóng đang sở hữu không?",
    saveToThisTeam: "Lưu vào đội này",
    lineupName: "Tên đội hình",
    avatarUrl: "URL ảnh đại diện",
    updateProfile: "Lưu hồ sơ",
    profileSubtitle: "Cá nhân hoá hồ sơ cầu thủ của bạn",
    userId: "ID user",
    copyUserId: "Copy ID",
    fullName: "Họ và tên",
    bio: "Giới thiệu bản thân",
    favoriteTeam: "Đội bóng yêu thích",
    favoritePosition: "Vị trí sở trường",
    location: "Khu vực",
    profileJerseyNumber: "Số áo thi đấu",
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
    teamMenu: "Team",
    teamTitle: "Your team",
    teamSubtitle: "Shape the identity of your community football team.",
    teamName: "Team name",
    teamNamePlaceholder: "Friends FC, Office FC...",
    teamLogo: "Team logo",
    uploadTeamLogo: "Upload logo",
    uploadingTeamLogo: "Uploading logo…",
    teamLogoUploaded: "Team logo updated",
    teamLogoUploadError: "Could not upload the logo. Please try again.",
    chooseTeamIcon: "Quick icon",
    shirtColor: "Main shirt color",
    teamSlogan: "Description/Slogan",
    teamSloganPlaceholder: "Friendly football, good vibes first",
    saveTeam: "Save team",
    teamSaved: "Team saved",
    teamNameRequired: "Team name is required.",
    myTeams: "My teams",
    createTeam: "Create team",
    editTeam: "Edit",
    deleteTeam: "Delete",
    searchTeams: "Search teams",
    noTeams: "You do not have any teams yet. Create your first team to start.",
    noTeamMatches: "No teams match your filters.",
    cancel: "Cancel",
    teamDetails: "Team details",
    backToTeams: "Back to teams",
    totalMembers: "members",
    miniLineup: "Current line-up",
    editLineupBoard: "Edit board",
    copyTeamLink: "Copy Link",
    viewQrCode: "View QR Code",
    downloadQr: "Download QR",
    teamQrTitle: "Team invite QR",
    members: "Members",
    teamTacticsTab: "Team tactics",
    emptyLocker: "The locker room is empty! Add teammates to start planning tactics.",
    addFirstPlayer: "Add First Player",
    addMember: "Add Member",
    inviteMember: "Send invite",
    invitationSent: "Team invitation sent.",
    invitedToTeam: "You were invited to join",
    acceptInvite: "Accept",
    declineInvite: "Decline",
    noNotifications: "No new notifications.",
    inviteAccepted: "You joined the team.",
    inviteDeclined: "You declined the invite.",
    invalidUserId: "Invalid user ID. Please copy the exact ID from the user's profile.",
    joinTeamTitle: "Join team",
    joinTeamPrompt: "Do you want to confirm joining this team?",
    confirmJoinTeam: "Confirm join",
    joinedTeam: "You joined the team.",
    jerseyNumber: "Number",
    playerNickname: "Name/Nickname",
    teamOwnerTag: "Team owner",
    removedFromTeam: "The team owner has removed you from this team.",
    confirmRemoveMemberTitle: "Remove member?",
    confirmRemoveMemberMessage: "Are you sure you want to remove this member from the team?",
    confirmRemoveMemberAction: "Remove member",
    memberRemovedNotification: "You were removed from the team",
    lockerTitle: "Locker Room",
    saveCurrentLineup: "Save current line-up",
    saveTacticsBoard: "Save tactics board",
    savedLineups: "Saved line-ups",
    teamSavedLineups: "Team line-ups & tactics",
    saveDestinationTitle: "Where do you want to save?",
    saveToPersonalLocker: "Personal locker room",
    saveToTeamQuestion: "Do you want to save this to a team you own?",
    saveToThisTeam: "Save to this team",
    lineupName: "Line-up name",
    avatarUrl: "Avatar URL",
    updateProfile: "Save profile",
    profileSubtitle: "Personalize your player profile",
    userId: "User ID",
    copyUserId: "Copy ID",
    fullName: "Full name",
    bio: "About you",
    favoriteTeam: "Favorite team",
    favoritePosition: "Preferred position",
    location: "Location",
    profileJerseyNumber: "Jersey number",
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
  if (lower.includes("team_id") && (lower.includes("column") || lower.includes("schema cache"))) return copy.databaseNotReady;
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

const getDetailedSupabaseErrorMessage = (
  error: { code?: string; message?: string; details?: string; hint?: string },
  copy: AppCopy,
) => {
  if (
    error.code === "23505" &&
    `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase().includes("teams_user_id_unique")
  ) {
    return `${copy.unexpectedError} Database vẫn còn giới hạn 1 đội/tài khoản. Hãy chạy lại supabase/teams_feature.sql để bỏ constraint teams_user_id_unique.`;
  }
  if (
    error.code === "PGRST205" &&
    `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase().includes("team_members")
  ) {
    return "Chưa tạo bảng thành viên đội bóng. Hãy chạy lại supabase/teams_feature.sql trong Supabase SQL Editor.";
  }

  const friendlyMessage = getSupabaseErrorMessage(error, copy);
  const rawParts = [error.code, error.message, error.details, error.hint].filter(Boolean);
  return rawParts.length > 0 ? `${friendlyMessage} (${rawParts.join(" - ")})` : friendlyMessage;
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

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
  isAnimationMode: true,
  tactics: initialTacticalPlaybooks,
  activeTacticId: initialTacticalPlaybook.id,
  frames: cloneTacticalFrames(initialTacticalPlaybook.frames),
  draftFrame: createInitialTacticalFrame(),
  playbackFrames: null,
  currentFrameIndex: 0,
  isPlaying: false,
  isLooping: false,
  setAnimationMode: (value) => set({ isAnimationMode: value }),
  selectFrame: (index) =>
    set((state) => ({
      currentFrameIndex: state.frames.length === 0 ? 0 : Math.min(Math.max(index, 0), state.frames.length - 1),
      isPlaying: false,
      playbackFrames: null,
    })),
  addFrame: () =>
    set((state) => {
      const currentFrame = state.frames[state.currentFrameIndex] ?? state.draftFrame;
      const nextFrames = [...state.frames, cloneTacticalFrame(currentFrame)];
      return { frames: nextFrames, currentFrameIndex: nextFrames.length - 1, isAnimationMode: true, playbackFrames: null };
    }),
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
        currentFrameIndex: Math.min(state.currentFrameIndex, nextFrames.length - 1),
        isPlaying: false,
        playbackFrames: null,
      };
    }),
  clearFrames: () =>
    set((state) => {
      const nextTactics = state.tactics.map((tactic) =>
        tactic.id === state.activeTacticId ? { ...tactic, frames: [] } : tactic,
      );
      saveStoredTactics(nextTactics);
      return {
        tactics: nextTactics,
        frames: [],
        draftFrame: createInitialTacticalFrame(),
        playbackFrames: null,
        currentFrameIndex: 0,
        isPlaying: false,
      };
    }),
  updateMarker: (id, x, y, onPitch) =>
    set((state) => {
      const updateFrame = (frame: TacticalFrame) =>
        frame.map((marker) => (marker.id === id ? { ...marker, x, y, onPitch: onPitch ?? marker.onPitch } : marker));

      if (state.frames.length === 0) {
        return { draftFrame: updateFrame(state.draftFrame), playbackFrames: null };
      }

      return {
        frames: state.frames.map((frame, frameIndex) =>
          frameIndex === state.currentFrameIndex ? updateFrame(frame) : frame,
        ),
        playbackFrames: null,
      };
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
      if (state.frames.length === 0) return { isPlaying: false, currentFrameIndex: 0, playbackFrames: null };
      return {
        isPlaying: true,
        currentFrameIndex: 0,
        isAnimationMode: true,
        playbackFrames: [cloneTacticalFrame(state.draftFrame), ...cloneTacticalFrames(state.frames)],
      };
    }),
  pause: () => set({ isPlaying: false, currentFrameIndex: 0, playbackFrames: null }),
  stop: () =>
    set((state) => ({
      isPlaying: false,
      currentFrameIndex: 0,
      playbackFrames: [cloneTacticalFrame(state.draftFrame)],
    })),
  nextFrame: () =>
    set((state) => {
      if (!state.isPlaying) return state;
      const sequenceLength = state.playbackFrames?.length ?? state.frames.length;
      const nextIndex = state.currentFrameIndex + 1;
      if (nextIndex >= sequenceLength) {
        if (state.isLooping) {
          return { currentFrameIndex: 0, isPlaying: true };
        }
        // Stop on the last step instead of resetting to the start. Pressing
        // play again rebuilds the sequence and restarts from the beginning.
        return { currentFrameIndex: sequenceLength - 1, isPlaying: false };
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
  roster?: Pick<Player, "starterName" | "substituteName" | "extraNames" | "onPitch">[],
): Player[] =>
  getFormationPoints(pitchSize, formation, customCount).map((point, index) => ({
    ...point,
    position: getZoneName(pitchSize, point.x, point.y),
    starterName: roster?.[index]?.starterName ?? "",
    substituteName: roster?.[index]?.substituteName ?? "",
    extraNames: roster?.[index]?.extraNames ?? [],
    onPitch: pitchSize === "custom" ? (roster?.[index]?.onPitch ?? index < customCount) : true,
  }));

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
  return getFormationPoints(pitchSize, sharedLineup.formation, customCount).map((point) => {
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
      onPitch: pitchSize === "custom" ? (sharedPlayer?.onPitch ?? point.id <= customCount) : true,
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
) => {
  const payload: SharedLineup = {
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
    opponentMarkers:
      pitchSize === "custom"
        ? opponentMarkers.map(({ id, x, y, onPitch }) => ({
            id,
            x: Math.round(x * 10) / 10,
            y: Math.round(y * 10) / 10,
            onPitch,
          }))
        : undefined,
    drawLines:
      pitchSize === "custom"
        ? drawLines.map((line) => ({
            id: line.id,
            points: line.points.map((point) => ({
              x: Math.round(point.x * 10) / 10,
              y: Math.round(point.y * 10) / 10,
            })),
          }))
        : undefined,
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
      pitchSize,
      customCount: clampCustomCount(parsed.customCount),
      formation: parsed.formation,
      players: parsed.players.filter((player) => typeof player?.id === "number") as SharedLineup["players"],
      opponentMarkers: Array.isArray(parsed.opponentMarkers) ? parsed.opponentMarkers : [],
      drawLines: Array.isArray(parsed.drawLines) ? parsed.drawLines : [],
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
  if (params.get("tab") === "team" || getTeamIdFromPath()) return "team";
  return params.get("tab") === "tactics" || params.has("tactics") ? "tactics" : "lineup";
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
    Boolean(getTeamIdFromPath()) ||
    window.location.hash.includes("type=recovery") ||
    window.location.hash.includes("error")
  );
};

const getTeamIdFromPath = () => {
  const match = window.location.pathname.match(/^\/team\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
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
  const shortMemberId = getShortMemberId(user?.id);
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
    sharedLineup?.pitchSize === "custom"
      ? createOpponentMarkersFromSharedLineup(sharedLineup)
      : createOpponentMarkers();
  const initialDrawLines =
    sharedLineup?.pitchSize === "custom" ? createDrawLinesFromSharedLineup(sharedLineup) : [];
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
  const [dragPreview, setDragPreview] = useState<{ type: "player" | "opponent"; id: number; x: number; y: number } | null>(
    null,
  );
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [drawLines, setDrawLines] = useState<DrawLine[]>(() => initialDrawLines);
  const [savedDrawLinesByPitch, setSavedDrawLinesByPitch] = useState<Partial<Record<PitchSize, DrawLine[]>>>(() => ({
    [initialPitchSize]: initialDrawLines,
  }));
  const [redoDrawLines, setRedoDrawLines] = useState<DrawLine[]>([]);
  const [activeDrawLineId, setActiveDrawLineId] = useState<number | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [selectedMobilePlayerId, setSelectedMobilePlayerId] = useState(1);
  const [activeTab, setActiveTab] = useState<AppTab>(() => getInitialAppTab());
  const [lastWorkspaceTab, setLastWorkspaceTab] = useState<"lineup" | "tactics">("lineup");
  const [isLineupMenuOpen, setIsLineupMenuOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [authMode, setAuthMode] = useState<"sign_in" | "sign_up" | "reset">("sign_in");
  const [isAuthScreenOpen, setIsAuthScreenOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
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
  const [profileJerseyNumber, setProfileJerseyNumber] = useState("");
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [team, setTeam] = useState<TeamRecord | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamLogoUrl, setTeamLogoUrl] = useState("");
  const [teamLogoIcon, setTeamLogoIcon] = useState(teamLogoIcons[0]);
  const [teamShirtColor, setTeamShirtColor] = useState(defaultTeamColors.shirt);
  const [teamSlogan, setTeamSlogan] = useState("");
  const [isTeamLoading, setIsTeamLoading] = useState(false);
  const [isTeamLogoUploading, setIsTeamLogoUploading] = useState(false);
  const teamLogoInputRef = useRef<HTMLInputElement>(null);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [teamSearch, setTeamSearch] = useState("");
  const [isTeamFormOpen, setIsTeamFormOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamDetailTab, setTeamDetailTab] = useState<TeamDetailTab>("members");
  const [qrTeam, setQrTeam] = useState<TeamRecord | null>(null);
  const [qrInviteUserId, setQrInviteUserId] = useState("");
  const [isMemberInviteOpen, setIsMemberInviteOpen] = useState(false);
  const [memberInviteUserId, setMemberInviteUserId] = useState("");
  const [isJoinTeamPromptOpen, setIsJoinTeamPromptOpen] = useState(false);
  const [isJoiningTeam, setIsJoiningTeam] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);
  const [teamMembersByTeam, setTeamMembersByTeam] = useState<Record<string, TeamMemberRecord[]>>({});
  const [memberProfilesById, setMemberProfilesById] = useState<Record<string, MemberProfileRecord>>({});
  const [teamInvitations, setTeamInvitations] = useState<TeamInvitationDisplay[]>([]);
  const [memberRemovalNotices, setMemberRemovalNotices] = useState<MemberRemovalNotice[]>([]);
  const [updatingInvitationId, setUpdatingInvitationId] = useState<string | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [memberPendingDelete, setMemberPendingDelete] = useState<TeamMemberRecord | null>(null);
  const [lineupName, setLineupName] = useState("");
  const [savedLineups, setSavedLineups] = useState<SavedLineupRecord[]>([]);
  const [pendingSaveRequest, setPendingSaveRequest] = useState<SaveRequestKind | null>(null);
  const [previewLineup, setPreviewLineup] = useState<SavedLineupRecord | null>(null);
  const [previewTacticId, setPreviewTacticId] = useState<string | null>(null);
  const [previewFrameIndex, setPreviewFrameIndex] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isPreviewLooping, setIsPreviewLooping] = useState(false);
  const [lockerCategory, setLockerCategory] = useState<LockerCategory>("all");
  const [lockerStatus, setLockerStatus] = useState("");
  const [isLockerLoading, setIsLockerLoading] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [deletingLineupId, setDeletingLineupId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: number; message: string; tone: "success" | "error" }[]>([]);
  const toastIdRef = useRef(0);
  const removedTeamNoticeRef = useRef<Set<string>>(new Set());
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
  const dragStartRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const activePlayers = pitchSize === "custom" ? players.filter((player) => player.onPitch) : players;
  const benchCount = getBenchCount(activePlayers);
  const formationEntries = getFormationEntries(pitchSize);
  const copy = copyByLanguage[language];
  const languageMeta =
    language === "vi" ? { flag: "🇻🇳", label: "VI", next: "en" as const } : { flag: "🇺🇸", label: "EN", next: "vi" as const };
  const selectedMobilePlayer =
    activePlayers.find((player) => player.id === selectedMobilePlayerId) ?? activePlayers[0] ?? null;
  const lockerCategories: { value: LockerCategory; label: string }[] = [
    { value: "all", label: copy.allCategories },
    { value: "5", label: copy.pitchLabels[5] },
    { value: "7", label: copy.pitchLabels[7] },
    { value: "11", label: copy.pitchLabels[11] },
    { value: "custom", label: copy.pitchLabels.custom },
    { value: "tactics", label: copy.tacticsTab },
  ];
  const filteredSavedLineups =
    lockerCategory === "all"
      ? savedLineups.filter((lineup) => !lineup.team_id)
      : savedLineups.filter((lineup) => !lineup.team_id && lineup.format === lockerCategory);
  const normalizedTeamSearch = teamSearch.trim().toLowerCase();
  const filteredTeams = teams.filter(
    (item) =>
      !normalizedTeamSearch ||
      item.name.toLowerCase().includes(normalizedTeamSearch) ||
      (item.slogan ?? "").toLowerCase().includes(normalizedTeamSearch),
  );
  const selectedTeam = selectedTeamId ? teams.find((item) => item.id === selectedTeamId) ?? null : null;
  const selectedTeamMembers = selectedTeam ? teamMembersByTeam[selectedTeam.id] ?? [] : [];
  const selectedTeamIsOwner = Boolean(selectedTeam && user && selectedTeam.user_id === user.id);
  const ownedTeams = user ? teams.filter((item) => item.user_id === user.id) : [];
  const selectedTeamLineups = selectedTeam
    ? savedLineups.filter((lineup) => lineup.team_id === selectedTeam.id)
    : [];
  const selectedTeamHasCurrentUser = Boolean(
    selectedTeam && user && (selectedTeam.user_id === user.id || selectedTeamMembers.some((member) => member.user_id === user.id)),
  );
  const getUserDisplayName = (userId: string, fallback = "") => {
    const memberProfile = memberProfilesById[userId];
    return memberProfile?.full_name || memberProfile?.username || fallback || `${userId.slice(0, 8).toUpperCase()}`;
  };
  const getCurrentUserDisplayName = () =>
    profileFullName.trim() ||
    profileUsername.trim() ||
    profile?.full_name ||
    profile?.username ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    user?.id.slice(0, 8).toUpperCase() ||
    "PLAYER";
  const profileSelectedPositions = parseProfilePositions(profileFavoritePosition);
  const toggleProfilePosition = (position: TeamMemberPosition) => {
    const selected = new Set(profileSelectedPositions);
    if (selected.has(position)) {
      selected.delete(position);
    } else {
      selected.add(position);
    }
    setProfileFavoritePosition(memberPositions.filter((item) => selected.has(item)).join(","));
  };
  const getJoinJerseyNumber = (members: TeamMemberRecord[]) => {
    const preferredNumber = Number(profileJerseyNumber || profile?.jersey_number || "");
    if (Number.isFinite(preferredNumber) && preferredNumber > 0) {
      return Math.max(1, Math.min(999, Math.round(preferredNumber)));
    }

    const usedNumbers = new Set(members.map((member) => member.jersey_number));
    const availableNumbers = Array.from({ length: 99 }, (_, index) => index + 1).filter((number) => !usedNumbers.has(number));
    if (availableNumbers.length > 0) {
      return availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
    }

    let fallbackNumber = 100;
    while (usedNumbers.has(fallbackNumber) && fallbackNumber < 999) fallbackNumber += 1;
    return fallbackNumber;
  };
  const getJoinPosition = (fallback: TeamMemberPosition = "MF") => profileSelectedPositions[0] ?? fallback;
  const selectedTeamDisplayMembers: TeamMemberDisplay[] = selectedTeam
    ? [
        {
          id: `${selectedTeam.id}-owner`,
          team_id: selectedTeam.id,
          user_id: selectedTeam.user_id,
          jersey_number: 1,
          nickname: getUserDisplayName(selectedTeam.user_id),
          position: "MF",
          isOwner: true,
        },
        ...selectedTeamMembers.filter((member) => member.user_id !== selectedTeam.user_id),
      ]
    : [];
  const teamDetailTabs: { value: TeamDetailTab; label: string; count: number }[] = [
    { value: "members", label: copy.members, count: selectedTeamDisplayMembers.length },
    { value: "tactics", label: copy.teamTacticsTab, count: selectedTeamLineups.length },
  ];
  const notificationCount = teamInvitations.length + memberRemovalNotices.length;

  useEffect(() => {
    document.title = "doihinhsanco";
  }, []);

  const writeAppRoute = (nextTab: AppTab, options: { nextPitchSize?: PitchSize; teamId?: string | null; replace?: boolean } = {}) => {
    const url = new URL(window.location.href);
    const nextPathname = getTeamIdFromPath() ? "/" : url.pathname;
    url.pathname = nextPathname;
    url.searchParams.delete("lineup");
    url.searchParams.delete("tactics");
    url.searchParams.delete("team");
    url.searchParams.set("tab", nextTab);

    if (nextTab === "lineup") {
      url.searchParams.set("pitch", String(options.nextPitchSize ?? pitchSize));
    } else {
      url.searchParams.delete("pitch");
    }

    if (nextTab === "team" && options.teamId) {
      url.searchParams.set("team", options.teamId);
    }

    const nextUrl = url.toString();
    if (nextUrl === window.location.href) return;
    if (options.replace) {
      window.history.replaceState({ tab: nextTab }, "", nextUrl);
    } else {
      window.history.pushState({ tab: nextTab }, "", nextUrl);
    }
  };

  const syncRouteFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const pathTeamId = getTeamIdFromPath();
    const nextTab = getInitialAppTab();
    const routeTeamId = pathTeamId ?? (params.get("tab") === "team" ? params.get("team") : null);
    const routePitchSize = getPitchSizeFromUrl();

    setActiveTab(nextTab);
    if (nextTab === "lineup") {
      setLastWorkspaceTab("lineup");
      if (routePitchSize && routePitchSize !== pitchSize) {
        applyPitchSize(routePitchSize, { updateUrl: false });
      }
    }
    if (nextTab === "tactics") {
      setLastWorkspaceTab("tactics");
    }
    if (nextTab === "team") {
      setSelectedTeamId(routeTeamId);
      setIsJoinTeamPromptOpen(Boolean(pathTeamId));
      setIsMemberInviteOpen(false);
      setMemberInviteUserId("");
    } else {
      setSelectedTeamId(null);
      setIsJoinTeamPromptOpen(false);
    }
    setIsLineupMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  useEffect(() => {
    window.addEventListener("popstate", syncRouteFromUrl);
    return () => window.removeEventListener("popstate", syncRouteFromUrl);
  }, [pitchSize, savedPlayersByPitch, savedFormationByPitch, savedCustomCountByPitch, savedOpponentMarkersByPitch, savedDrawLinesByPitch]);

  useEffect(() => {
    if (selectedTeamHasCurrentUser) {
      setIsJoinTeamPromptOpen(false);
    }
  }, [selectedTeamHasCurrentUser]);

  const switchAppTab = (nextTab: AppTab, options: { nextPitchSize?: PitchSize; teamId?: string | null; updateUrl?: boolean } = {}) => {
    if (nextTab === "lineup" || nextTab === "tactics") {
      setLastWorkspaceTab(nextTab);
    }
    setActiveTab(nextTab);
    if (nextTab === "team" && !options.teamId) {
      setSelectedTeamId(null);
    }
    setIsLineupMenuOpen(false);
    setIsUserMenuOpen(false);
    if (options.updateUrl !== false) {
      writeAppRoute(nextTab, { nextPitchSize: options.nextPitchSize, teamId: options.teamId });
    }
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

    if (pitchSize === "custom") {
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

    if (pitchSize === "custom") {
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

  const getCurrentLineupState = (metadata: Partial<Pick<StoredLineupState, "thumbnailDataUrl" | "savedAt">> = {}): StoredLineupState => ({
    version: 1,
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
    ...metadata,
  });

  const fetchSavedLineups = async () => {
    if (!supabase || !user) {
      setSavedLineups([]);
      return;
    }

    setIsLockerLoading(true);
    const { data, error } = await supabase
      .from("lineups")
      .select("id,user_id,team_id,name,format,players_data,created_at")
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
      setProfileJerseyNumber("");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id,username,avatar_url,full_name,bio,favorite_team,favorite_position,location,jersey_number")
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
    setProfileJerseyNumber(nextProfile?.jersey_number ? String(nextProfile.jersey_number) : "");
  };

  const resetTeamForm = () => {
    setTeam(null);
    setTeams([]);
    setTeamName("");
    setTeamLogoUrl("");
    setTeamLogoIcon(teamLogoIcons[0]);
    setTeamShirtColor(defaultTeamColors.shirt);
    setTeamSlogan("");
    setTeamSearch("");
    setIsTeamFormOpen(false);
    setSelectedTeamId(null);
    setQrTeam(null);
    setTeamMembersByTeam({});
    setEditingTeamId(null);
  };

  const fillTeamForm = (nextTeam?: TeamRecord | null) => {
    setEditingTeamId(nextTeam?.id ?? null);
    setTeamName(nextTeam?.name ?? "");
    setTeamLogoUrl(nextTeam?.logo_url ?? "");
    setTeamLogoIcon(nextTeam?.logo_icon ?? teamLogoIcons[0]);
    setTeamShirtColor(nextTeam?.shirt_color ?? defaultTeamColors.shirt);
    setTeamSlogan(nextTeam?.slogan ?? "");
  };

  const mergeMemberProfiles = async (profileIds: string[]) => {
    if (!supabase) return;
    const uniqueProfileIds = Array.from(new Set(profileIds.filter(Boolean)));
    if (uniqueProfileIds.length === 0) return;

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id,username,full_name,favorite_position")
      .in("id", uniqueProfileIds);

    if (profileError) {
      console.error("fetch member profiles error:", profileError);
      return;
    }

    setMemberProfilesById((current) => ({
      ...current,
      ...((profileData ?? []) as MemberProfileRecord[]).reduce<Record<string, MemberProfileRecord>>((acc, profileItem) => {
        acc[profileItem.id] = profileItem;
        return acc;
      }, {}),
    }));
  };

  const refreshTeamMembers = async (teamIds: string[]) => {
    if (!supabase || !user) return;
    const uniqueTeamIds = Array.from(new Set(teamIds.filter(Boolean)));
    if (uniqueTeamIds.length === 0) return;

    const { data, error } = await supabase
      .from("team_members")
      .select("id,team_id,user_id,jersey_number,nickname,position,created_at,updated_at")
      .in("team_id", uniqueTeamIds)
      .order("jersey_number", { ascending: true });

    if (error) {
      console.error("refreshTeamMembers error:", error);
      return;
    }

    const refreshedMembers = ((data ?? []) as TeamMemberRecord[]).reduce<Record<string, TeamMemberRecord[]>>((acc, member) => {
      acc[member.team_id] = [...(acc[member.team_id] ?? []), member];
      return acc;
    }, {});

    setTeamMembersByTeam((current) => ({
      ...current,
      ...Object.fromEntries(uniqueTeamIds.map((teamId) => [teamId, refreshedMembers[teamId] ?? []])),
    }));
    await mergeMemberProfiles((data ?? []).map((member) => member.user_id));
  };

  const notifyTeamMembersChanged = async (teamId: string) => {
    if (!supabase) return;
    const realtimeClient = supabase;
    const channel = realtimeClient.channel(`team-members-sync-${teamId}`);
    await channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      await channel.send({
        type: "broadcast",
        event: "team_members_changed",
        payload: { teamId, at: Date.now() },
      });
      await realtimeClient.removeChannel(channel);
    });
  };

  const notifyTeamInvitationChanged = async (userId: string) => {
    if (!supabase) return;
    const realtimeClient = supabase;
    const channel = realtimeClient.channel(`team-invitations-sync-${userId}`);
    await channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      await channel.send({
        type: "broadcast",
        event: "team_invitation_changed",
        payload: { userId, at: Date.now() },
      });
      await realtimeClient.removeChannel(channel);
    });
  };

  const addMemberRemovalNotice = (teamId: string, memberId: string, teamName?: string | null) => {
    const noticeId = `${teamId}-${memberId}`;
    setMemberRemovalNotices((current) =>
      current.some((notice) => notice.id === noticeId)
        ? current
        : [
            {
              id: noticeId,
              teamName: teamName || teams.find((item) => item.id === teamId)?.name || teamId.slice(0, 8).toUpperCase(),
              createdAt: Date.now(),
            },
            ...current,
          ],
    );
  };

  const notifyMemberRemoved = async (removedUserId: string, member: TeamMemberRecord, nextTeam: TeamRecord) => {
    if (!supabase) return;
    const realtimeClient = supabase;
    const channel = realtimeClient.channel(`member-removal-sync-${removedUserId}`);
    await channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      await channel.send({
        type: "broadcast",
        event: "member_removed",
        payload: {
          userId: removedUserId,
          teamId: nextTeam.id,
          teamName: nextTeam.name,
          memberId: member.id,
          at: Date.now(),
        },
      });
      await realtimeClient.removeChannel(channel);
    });
  };

  const fetchTeamInvitations = async () => {
    if (!supabase || !user) {
      setTeamInvitations([]);
      return;
    }

    const { data, error } = await supabase
      .from("team_invitations")
      .select("id,team_id,invited_user_id,invited_by,status,jersey_number,nickname,position,created_at,updated_at")
      .eq("invited_user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchTeamInvitations error:", error);
      return;
    }

    const invitations = (data ?? []) as TeamInvitationRecord[];
    const teamIds = Array.from(new Set(invitations.map((invite) => invite.team_id)));
    let teamsById: Record<string, TeamRecord> = {};
    if (teamIds.length > 0) {
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("id,user_id,name,logo_url,logo_icon,shirt_color,shorts_color,socks_color,slogan,created_at,updated_at")
        .in("id", teamIds);

      if (teamError) {
        console.error("fetch invitation teams error:", teamError);
      } else {
        teamsById = ((teamData ?? []) as TeamRecord[]).reduce<Record<string, TeamRecord>>((acc, item) => {
          acc[item.id] = item;
          return acc;
        }, {});
      }
    }

    setTeamInvitations(
      invitations.map((invite) => ({
        ...invite,
        teamName: teamsById[invite.team_id]?.name ?? invite.team_id.slice(0, 8).toUpperCase(),
      })),
    );
  };

  const fetchTeams = async () => {
    if (!supabase || !user) {
      resetTeamForm();
      return;
    }

    const { data: ownedTeamData, error: ownedTeamError } = await supabase
      .from("teams")
      .select("id,user_id,name,logo_url,logo_icon,shirt_color,shorts_color,socks_color,slogan,created_at,updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (ownedTeamError) {
      console.error("fetchTeams owned error:", ownedTeamError);
      setLockerStatus(getDetailedSupabaseErrorMessage(ownedTeamError, copy));
      return;
    }

    const { data: ownMembershipData, error: ownMembershipError } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", user.id);

    if (ownMembershipError) {
      console.error("fetchTeams membership error:", ownMembershipError);
      setLockerStatus(getDetailedSupabaseErrorMessage(ownMembershipError, copy));
      return;
    }

    const pathTeamId = getTeamIdFromPath();
    const teamIds = Array.from(
      new Set([
        ...(ownedTeamData ?? []).map((item) => item.id),
        ...(ownMembershipData ?? []).map((member) => member.team_id as string),
        ...(pathTeamId ? [pathTeamId] : []),
      ]),
    );

    let nextTeams: TeamRecord[] = [];
    if (teamIds.length > 0) {
      const { data, error } = await supabase
        .from("teams")
        .select("id,user_id,name,logo_url,logo_icon,shirt_color,shorts_color,socks_color,slogan,created_at,updated_at")
        .in("id", teamIds)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("fetchTeams detail error:", error);
        setLockerStatus(getDetailedSupabaseErrorMessage(error, copy));
        return;
      }
      nextTeams = (data ?? []) as TeamRecord[];
    }

    const isTeamLinkRoute = Boolean(getTeamIdFromPath());
    const wasViewingRemovedTeam = Boolean(
      selectedTeamId && !isTeamLinkRoute && !nextTeams.some((item) => item.id === selectedTeamId),
    );
    setTeams(nextTeams);
    setTeam(nextTeams[0] ?? null);
    setIsTeamFormOpen(wasViewingRemovedTeam ? false : nextTeams.length === 0);
    if (wasViewingRemovedTeam && selectedTeamId) {
      setSelectedTeamId(null);
      setIsMemberInviteOpen(false);
      setMemberInviteUserId("");
      window.history.replaceState({}, "", `${window.location.origin}${window.location.pathname.replace(/^\/team\/[^/?#]+/, "/")}?tab=team`);
      if (!removedTeamNoticeRef.current.has(selectedTeamId)) {
        removedTeamNoticeRef.current.add(selectedTeamId);
        showToast(copy.removedFromTeam, "error");
      }
    }
    fillTeamForm(null);

    if (nextTeams.length === 0) {
      setTeamMembersByTeam({});
      return;
    }

    const { data: memberData, error: memberError } = await supabase
      .from("team_members")
      .select("id,team_id,user_id,jersey_number,nickname,position,created_at,updated_at")
      .in(
        "team_id",
        nextTeams.map((item) => item.id),
      )
      .order("jersey_number", { ascending: true });

    if (memberError) {
      console.error("fetchTeamMembers error:", memberError);
      setLockerStatus(getDetailedSupabaseErrorMessage(memberError, copy));
      return;
    }

    const nextMembers = ((memberData ?? []) as TeamMemberRecord[]).reduce<Record<string, TeamMemberRecord[]>>((acc, member) => {
      acc[member.team_id] = [...(acc[member.team_id] ?? []), member];
      return acc;
    }, {});
    setTeamMembersByTeam(nextMembers);

    const profileIds = Array.from(
      new Set([...nextTeams.map((item) => item.user_id), ...(memberData ?? []).map((member) => member.user_id)]),
    );
    await mergeMemberProfiles(profileIds);
  };

  useEffect(() => {
    if (!user) {
      fetchSavedLineups();
      fetchProfile();
      fetchTeams();
      fetchTeamInvitations();
      return;
    }

    void (async () => {
      await ensureCurrentUserProfile();
      fetchSavedLineups();
      fetchProfile();
      fetchTeams();
      fetchTeamInvitations();
    })();
  }, [user?.id, teams]);

  useEffect(() => {
    if (!supabase || !user) return;
    const realtimeClient = supabase;

    const channel = realtimeClient
      .channel(`team-members-realtime-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members" }, (payload) => {
        const eventType = payload.eventType;
        const nextMember = payload.new as TeamMemberRecord | null;
        const previousMember = payload.old as Partial<TeamMemberRecord> | null;
        const changedMember = eventType === "DELETE" ? previousMember : nextMember;
        if (!changedMember?.id) return;

        if (nextMember?.user_id) {
          void mergeMemberProfiles([nextMember.user_id]);
        }

        if (eventType === "DELETE") {
          if (previousMember?.user_id === user.id && previousMember.team_id) {
            addMemberRemovalNotice(previousMember.team_id, changedMember.id);
            showToast(copy.removedFromTeam, "error");
          }
          setTeamMembersByTeam((current) =>
            Object.fromEntries(
              Object.entries(current).map(([teamId, members]) => [
                teamId,
                members.filter((member) => member.id !== changedMember.id),
              ]),
            ),
          );
          void fetchTeams();
          return;
        }

        if (!nextMember?.team_id) return;

        setTeamMembersByTeam((current) => {
          const teamMembers = current[nextMember.team_id] ?? [];
          const hasMember = teamMembers.some((member) => member.id === nextMember.id);
          const nextMembers = hasMember
            ? teamMembers.map((member) => (member.id === nextMember.id ? nextMember : member))
            : [...teamMembers, nextMember];

          return {
            ...current,
            [nextMember.team_id]: nextMembers.sort((a, b) => a.jersey_number - b.jersey_number),
          };
        });

        if (nextMember.user_id === user.id) {
          void fetchTeams();
        }
      })
      .subscribe();

    return () => {
      realtimeClient.removeChannel(channel);
    };
  }, [user?.id, teams]);

  useEffect(() => {
    if (!supabase || !user) return;
    const realtimeClient = supabase;
    const channel = realtimeClient
      .channel(`member-removal-sync-${user.id}`)
      .on("broadcast", { event: "member_removed" }, ({ payload }) => {
        const noticePayload = payload as Partial<{ userId: string; teamId: string; teamName: string; memberId: string }>;
        if (noticePayload.userId !== user.id || !noticePayload.teamId || !noticePayload.memberId) return;
        addMemberRemovalNotice(noticePayload.teamId, noticePayload.memberId, noticePayload.teamName);
        showToast(copy.removedFromTeam, "error");
        void fetchTeams();
      })
      .subscribe();

    return () => {
      realtimeClient.removeChannel(channel);
    };
  }, [user?.id, teams]);

  useEffect(() => {
    if (!supabase || !user) return;
    const realtimeClient = supabase;
    const channel = realtimeClient
      .channel(`team-invitations-sync-${user.id}`)
      .on("broadcast", { event: "team_invitation_changed" }, () => {
        void fetchTeamInvitations();
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_invitations", filter: `invited_user_id=eq.${user.id}` },
        () => {
          void fetchTeamInvitations();
        },
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void fetchTeamInvitations();
    }, 4000);

    return () => {
      window.clearInterval(intervalId);
      realtimeClient.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!supabase || !user || !selectedTeam?.id) return;
    const syncTeamId = selectedTeam.id;
    const realtimeClient = supabase;
    const channel = realtimeClient
      .channel(`team-members-sync-${syncTeamId}`)
      .on("broadcast", { event: "team_members_changed" }, () => {
        void refreshTeamMembers([syncTeamId]);
        void fetchTeams();
      })
      .subscribe();

    const intervalId = window.setInterval(() => {
      void refreshTeamMembers([syncTeamId]);
      void fetchTeams();
    }, 2500);

    return () => {
      window.clearInterval(intervalId);
      realtimeClient.removeChannel(channel);
    };
  }, [user?.id, selectedTeam?.id]);

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

  const profileColumnsBase = "id,username,avatar_url,full_name,bio,favorite_team,favorite_position,location";
  const profileColumns = `${profileColumnsBase},jersey_number`;

  const buildProfilePayload = (overrides?: { avatar_url?: string | null }, includeJerseyNumber = true) => {
    const jerseyNumber = Number(profileJerseyNumber);
    const payload: Record<string, string | number | null> = {
      id: user!.id,
      username: profileUsername.trim() || user!.email?.split("@")[0] || "",
      avatar_url:
        overrides && "avatar_url" in overrides ? overrides.avatar_url ?? null : profileAvatarUrl.trim() || null,
      full_name: profileFullName.trim() || null,
      bio: profileBio.trim() || null,
      favorite_team: profileFavoriteTeam.trim() || null,
      favorite_position: profileFavoritePosition.trim() || null,
      location: profileLocation.trim() || null,
    };

    if (includeJerseyNumber) {
      payload.jersey_number = profileJerseyNumber.trim() && Number.isFinite(jerseyNumber)
        ? Math.max(1, Math.min(999, Math.round(jerseyNumber)))
        : null;
    }

    return payload;
  };

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
      const errorText = `${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
      if (errorText.includes("jersey_number") || errorText.includes("schema cache")) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("profiles")
          .upsert(buildProfilePayload(undefined, false))
          .select(profileColumnsBase)
          .single();

        if (!fallbackError) {
          setProfile({ ...(fallbackData as ProfileRecord), jersey_number: null });
          const message = "Đã lưu hồ sơ, nhưng DB chưa có cột jersey_number. Hãy chạy SQL add column rồi lưu lại số áo.";
          setLockerStatus(message);
          showToast(message, "error");
          setIsProfileLoading(false);
          return;
        }
      }

      const message = getDetailedSupabaseErrorMessage(error, copy);
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

  const openCreateTeamForm = () => {
    fillTeamForm(null);
    setSelectedTeamId(null);
    setIsTeamFormOpen(true);
  };

  const openEditTeamForm = (nextTeam: TeamRecord) => {
    if (!user || nextTeam.user_id !== user.id) return;
    fillTeamForm(nextTeam);
    setIsTeamFormOpen(true);
  };

  const closeTeamForm = () => {
    fillTeamForm(null);
    setIsTeamFormOpen(teams.length === 0);
  };

  const openTeamDetail = (teamId: string) => {
    setSelectedTeamId(teamId);
    setTeamDetailTab("members");
    setIsMemberInviteOpen(false);
    setMemberInviteUserId("");
    writeAppRoute("team", { teamId });
  };

  const buildTeamPayload = (overrides?: { logo_url?: string | null }) => ({
    user_id: user!.id,
    name: teamName.trim(),
    logo_url:
      overrides && "logo_url" in overrides ? overrides.logo_url : teamLogoUrl.trim() || null,
    logo_icon: teamLogoIcon || teamLogoIcons[0],
    shirt_color: teamShirtColor,
    shorts_color: teams.find((item) => item.id === editingTeamId)?.shorts_color ?? defaultTeamColors.shorts,
    socks_color: teams.find((item) => item.id === editingTeamId)?.socks_color ?? defaultTeamColors.socks,
    slogan: teamSlogan.trim() || null,
    updated_at: new Date().toISOString(),
  });

  const ensureCurrentUserProfile = async () => {
    if (!supabase || !user) return null;

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      username: user.user_metadata?.username ?? user.email?.split("@")[0] ?? "",
      avatar_url: user.user_metadata?.avatar_url ?? null,
    });

    return error;
  };

  const updateTeam = async () => {
    if (!supabase || !user) return;
    if (!teamName.trim()) {
      showToast(copy.teamNameRequired, "error");
      return;
    }

    setLockerStatus("");
    setIsTeamLoading(true);
    const profileError = await ensureCurrentUserProfile();
    if (profileError) {
      console.error("ensure profile before team save error:", profileError);
      const message = getDetailedSupabaseErrorMessage(profileError, copy);
      setLockerStatus(message);
      showToast(message, "error");
      setIsTeamLoading(false);
      return;
    }

    const query = editingTeamId
      ? supabase
          .from("teams")
          .update(buildTeamPayload())
          .eq("id", editingTeamId)
          .select("id,user_id,name,logo_url,logo_icon,shirt_color,shorts_color,socks_color,slogan,created_at,updated_at")
          .single()
      : supabase
          .from("teams")
          .insert(buildTeamPayload())
          .select("id,user_id,name,logo_url,logo_icon,shirt_color,shorts_color,socks_color,slogan,created_at,updated_at")
          .single();
    const { data, error } = await query;

    if (error) {
      console.error("save team error:", error);
      const message = getDetailedSupabaseErrorMessage(error, copy);
      setLockerStatus(message);
      showToast(message, "error");
      setIsTeamLoading(false);
      return;
    }

    const savedTeam = data as TeamRecord;
    setTeam(savedTeam);
    setTeams((current) =>
      editingTeamId ? current.map((item) => (item.id === savedTeam.id ? savedTeam : item)) : [savedTeam, ...current],
    );
    fillTeamForm(null);
    setIsTeamFormOpen(false);
    setLockerStatus(copy.teamSaved);
    showToast(copy.teamSaved);
    setIsTeamLoading(false);
  };

  const deleteTeam = async (id: string) => {
    if (!supabase || !user) return;
    const targetTeam = teams.find((item) => item.id === id);
    if (!targetTeam || targetTeam.user_id !== user.id) return;
    setDeletingTeamId(id);
    const { error } = await supabase.from("teams").delete().eq("id", id);

    if (error) {
      console.error("delete team error:", error);
      showToast(getDetailedSupabaseErrorMessage(error, copy), "error");
      setDeletingTeamId(null);
      return;
    }

    setTeams((current) => {
      const nextTeams = current.filter((item) => item.id !== id);
      setTeam(nextTeams[0] ?? null);
      setIsTeamFormOpen(nextTeams.length === 0);
      return nextTeams;
    });
    if (editingTeamId === id) fillTeamForm(null);
    showToast(copy.deleted);
    setDeletingTeamId(null);
  };

  const getTeamInviteLink = (teamId: string, inviteUserId = "") => {
    const currentOrigin = window.location.origin;
    const isLocalOrigin =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.startsWith("192.168.") ||
      window.location.hostname.startsWith("10.") ||
      window.location.hostname.endsWith(".local");
    const baseOrigin = isLocalOrigin ? currentOrigin : "https://doihinhsanco.pro.vn";
    const url = new URL(`/team/${teamId}`, baseOrigin);
    if (inviteUserId.trim()) url.searchParams.set("user", inviteUserId.trim());
    return url.toString();
  };

  const getTeamQrUrl = (teamId: string, inviteUserId = "") =>
    `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(getTeamInviteLink(teamId, inviteUserId))}`;

  const copyTeamInviteLink = async (nextTeam: TeamRecord, inviteUserId = "") => {
    const link = getTeamInviteLink(nextTeam.id, inviteUserId);
    try {
      await navigator.clipboard.writeText(link);
      showToast(copy.copied);
    } catch {
      window.prompt(copy.copyTeamLink, link);
    }
  };

  const addTeamMemberByUserId = async (nextTeam: TeamRecord, invitedUserId: string) => {
    if (!supabase || !user) return;
    if (nextTeam.user_id !== user.id) return;
    const rawUserId = invitedUserId.trim();
    if (!rawUserId) return;

    let targetUserId = rawUserId;
    if (!isValidUuid(targetUserId)) {
      const normalizedShortId = rawUserId.replaceAll("-", "").trim().toLowerCase();
      if (normalizedShortId.length < 6 || normalizedShortId.length > 32 || /[^a-f0-9]/.test(normalizedShortId)) {
        showToast(copy.invalidUserId, "error");
        return;
      }

      const { data: resolvedUserId, error: lookupError } = await supabase.rpc("resolve_profile_short_id", {
        p_short_id: normalizedShortId,
      });

      if (lookupError) {
        console.error("lookup short member id error:", lookupError);
        showToast(copy.databaseNotReady, "error");
        return;
      }

      if (!resolvedUserId || typeof resolvedUserId !== "string") {
        showToast(copy.invalidUserId, "error");
        return;
      }

      targetUserId = resolvedUserId;
    }
    const existingMembers = teamMembersByTeam[nextTeam.id] ?? [];
    const nextNumber =
      existingMembers.length > 0 ? Math.max(...existingMembers.map((member) => member.jersey_number)) + 1 : 1;

    const { error } = await supabase
      .from("team_invitations")
      .insert({
        team_id: nextTeam.id,
        invited_user_id: targetUserId,
        invited_by: user.id,
        jersey_number: nextNumber,
        nickname: targetUserId.slice(0, 8).toUpperCase(),
        position: "MF" satisfies TeamMemberPosition,
        status: "pending" satisfies TeamInvitationStatus,
      });

    if (error) {
      console.error("sendTeamInvitation error:", error);
      showToast(getDetailedSupabaseErrorMessage(error, copy), "error");
      return;
    }

    showToast(copy.invitationSent);
    void notifyTeamInvitationChanged(targetUserId);
    setMemberInviteUserId("");
    setIsMemberInviteOpen(false);
  };

  const respondToTeamInvitation = async (invitation: TeamInvitationDisplay, status: Exclude<TeamInvitationStatus, "pending">) => {
    if (!supabase || !user || invitation.invited_user_id !== user.id) return;
    setUpdatingInvitationId(invitation.id);

    if (status === "accepted") {
      const invitationTeamMembers = teamMembersByTeam[invitation.team_id] ?? [];
      const { error: memberError } = await supabase.from("team_members").insert({
        team_id: invitation.team_id,
        user_id: user.id,
        jersey_number: getJoinJerseyNumber(invitationTeamMembers),
        nickname: getCurrentUserDisplayName(),
        position: getJoinPosition(invitation.position),
      });

      if (memberError) {
        console.error("respondToTeamInvitation member error:", memberError);
        showToast(getDetailedSupabaseErrorMessage(memberError, copy), "error");
        setUpdatingInvitationId(null);
        return;
      }
    }

    const { error: updateError } = await supabase
      .from("team_invitations")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("respondToTeamInvitation update error:", updateError);
      showToast(getDetailedSupabaseErrorMessage(updateError, copy), "error");
      setUpdatingInvitationId(null);
      return;
    }

    if (status === "accepted") {
      showToast(copy.inviteAccepted);
      void notifyTeamMembersChanged(invitation.team_id);
      void fetchTeams();
    } else {
      showToast(copy.inviteDeclined);
    }

    setTeamInvitations((current) => current.filter((item) => item.id !== invitation.id));
    setUpdatingInvitationId(null);
  };

  const joinSelectedTeamFromLink = async () => {
    if (!supabase || !user || !selectedTeam || selectedTeamHasCurrentUser) return;
    setIsJoiningTeam(true);
    const { error } = await supabase.from("team_members").insert({
      team_id: selectedTeam.id,
      user_id: user.id,
      jersey_number: getJoinJerseyNumber(selectedTeamMembers),
      nickname: getCurrentUserDisplayName(),
      position: getJoinPosition(),
    });
    setIsJoiningTeam(false);

    if (error) {
      console.error("joinSelectedTeamFromLink error:", error);
      showToast(getDetailedSupabaseErrorMessage(error, copy), "error");
      return;
    }

    showToast(copy.joinedTeam);
    setIsJoinTeamPromptOpen(false);
    void notifyTeamMembersChanged(selectedTeam.id);
    await fetchTeams();

    const url = new URL(window.location.href);
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("tab", "team");
    url.searchParams.set("team", selectedTeam.id);
    window.history.replaceState({ teamId: selectedTeam.id }, "", url.toString());
  };

  const updateTeamMember = async (member: TeamMemberRecord, updates: Partial<Pick<TeamMemberRecord, "jersey_number" | "nickname" | "position">>) => {
    if (!supabase) return;
    const memberTeam = teams.find((item) => item.id === member.team_id);
    if (!user || !memberTeam || memberTeam.user_id !== user.id) return;

    const payload: Partial<Pick<TeamMemberRecord, "jersey_number" | "nickname" | "position">> & { updated_at: string } = {
      updated_at: new Date().toISOString(),
    };

    if (typeof updates.jersey_number === "number" && updates.jersey_number !== member.jersey_number) {
      const normalizedNumber = Math.max(0, Math.min(999, Math.round(updates.jersey_number)));
      payload.jersey_number = normalizedNumber;
    }
    if (typeof updates.nickname === "string") {
      const normalizedNickname = updates.nickname.trim();
      if (normalizedNickname && normalizedNickname !== member.nickname) {
        payload.nickname = normalizedNickname;
      }
    }
    if (updates.position && updates.position !== member.position) {
      payload.position = updates.position;
    }

    if (!("jersey_number" in payload) && !("nickname" in payload) && !("position" in payload)) return;

    setUpdatingMemberId(member.id);
    const { data, error } = await supabase
      .from("team_members")
      .update(payload)
      .eq("id", member.id)
      .select("id,team_id,user_id,jersey_number,nickname,position,created_at,updated_at")
      .single();
    setUpdatingMemberId(null);

    if (error) {
      console.error("updateTeamMember error:", error);
      showToast(getDetailedSupabaseErrorMessage(error, copy), "error");
      return;
    }

    const savedMember = data as TeamMemberRecord;
    setTeamMembersByTeam((current) => ({
      ...current,
      [savedMember.team_id]: (current[savedMember.team_id] ?? []).map((item) =>
        item.id === savedMember.id ? savedMember : item,
      ).sort((a, b) => a.jersey_number - b.jersey_number),
    }));
    void notifyTeamMembersChanged(savedMember.team_id);
  };

  const updateTeamMemberPosition = async (member: TeamMemberRecord, position: TeamMemberPosition) => {
    await updateTeamMember(member, { position });
  };

  const deleteTeamMember = async (member: TeamMemberRecord) => {
    if (!supabase) return;
    const memberTeam = teams.find((item) => item.id === member.team_id);
    if (!user || !memberTeam || memberTeam.user_id !== user.id) return;

    setDeletingMemberId(member.id);
    const { error } = await supabase.from("team_members").delete().eq("id", member.id);
    setDeletingMemberId(null);

    if (error) {
      console.error("deleteTeamMember error:", error);
      showToast(getDetailedSupabaseErrorMessage(error, copy), "error");
      return;
    }

    setTeamMembersByTeam((current) => ({
      ...current,
      [member.team_id]: (current[member.team_id] ?? []).filter((item) => item.id !== member.id),
    }));
    setMemberPendingDelete(null);
    void notifyTeamMembersChanged(member.team_id);
    void notifyMemberRemoved(member.user_id, member, memberTeam);
  };

  const getMiniLineupPoint = (member: TeamMemberDisplay, allMembers: TeamMemberDisplay[]) => {
    const samePositionMembers = allMembers.filter((item) => item.position === member.position);
    const index = samePositionMembers.findIndex((item) => item.id === member.id);
    const points = memberPositionPoints[member.position];
    return points[index % points.length];
  };

  const handleTeamLogoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !supabase || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast(copy.avatarTooLarge, "error");
      return;
    }

    setIsTeamLogoUploading(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const filePath = `${user.id}/team-logo-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("team-logos")
        .upload(filePath, file, { upsert: true, contentType: file.type || undefined });

      if (uploadError) {
        showToast(copy.teamLogoUploadError, "error");
        setIsTeamLogoUploading(false);
        return;
      }

      const { data: publicData } = supabase.storage.from("team-logos").getPublicUrl(filePath);
      const publicUrl = `${publicData.publicUrl}?v=${Date.now()}`;
      setTeamLogoUrl(publicUrl);
      showToast(copy.teamLogoUploaded);

      if (editingTeamId && teamName.trim()) {
        const profileError = await ensureCurrentUserProfile();
        if (profileError) {
          console.error("ensure profile before team logo save error:", profileError);
          showToast(getDetailedSupabaseErrorMessage(profileError, copy), "error");
          setIsTeamLogoUploading(false);
          return;
        }

        const { data, error } = await supabase
          .from("teams")
          .update(buildTeamPayload({ logo_url: publicUrl }))
          .eq("id", editingTeamId)
          .select("id,user_id,name,logo_url,logo_icon,shirt_color,shorts_color,socks_color,slogan,created_at,updated_at")
          .single();

        if (error) {
          console.error("save team logo error:", error);
          showToast(getDetailedSupabaseErrorMessage(error, copy), "error");
        } else {
          const savedTeam = data as TeamRecord;
          setTeam(savedTeam);
          setTeams((current) => current.map((item) => (item.id === savedTeam.id ? savedTeam : item)));
        }
      }
    } catch {
      showToast(copy.teamLogoUploadError, "error");
    } finally {
      setIsTeamLogoUploading(false);
    }
  };

  const saveCurrentLineupToSupabase = async (teamId: string | null = null) => {
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
      team_id: teamId,
      name: displayName,
      format: String(pitchSize),
      players_data: getCurrentLineupState({ thumbnailDataUrl, savedAt }),
    });

    if (error) {
      const message = getSupabaseErrorMessage(error, copy);
      setLockerStatus(message);
      showToast(message, "error");
    } else {
      setLineupName("");
      setLockerCategory(String(pitchSize) as LockerCategory);
      setLockerStatus(copy.saved);
      showToast(copy.saved);
      setPendingSaveRequest(null);
      await fetchSavedLineups();
    }
    setIsLockerLoading(false);
  };

  const saveTacticsBoardToSupabase = async (teamId: string | null = null) => {
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
      team_id: teamId,
      name: displayName,
      format: "tactics",
      players_data: {
        kind: "tactics",
        tactics: tacticalState.tactics.map((tactic) =>
          tactic.id === tacticalState.activeTacticId
            ? { ...tactic, frames: cloneTacticalFrames(tacticalState.frames) }
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
      setPendingSaveRequest(null);
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
    if (ownedTeams.length > 0) {
      setPendingSaveRequest("lineup");
      return;
    }
    void saveCurrentLineupToSupabase(null);
  };

  const handleSaveTacticsBoard = () => {
    if (!user) {
      openAuthForSave();
      return;
    }
    if (ownedTeams.length > 0) {
      setPendingSaveRequest("tactics");
      return;
    }
    void saveTacticsBoardToSupabase(null);
  };

  const confirmSaveDestination = (teamId: string | null) => {
    if (pendingSaveRequest === "lineup") {
      void saveCurrentLineupToSupabase(teamId);
    } else if (pendingSaveRequest === "tactics") {
      void saveTacticsBoardToSupabase(teamId);
    }
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
      setActiveTab("tactics");
      setLastWorkspaceTab("tactics");
      writeAppRoute("tactics");
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
    setRedoDrawLines([]);
    setIsDrawMode(false);
    setActiveTab("lineup");
    writeAppRoute("lineup", { nextPitchSize: lineupData.pitchSize });
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

  const getPreviewLineupData = (lineup: SavedLineupRecord | null) => {
    if (!lineup) return null;
    const data = lineup.players_data;
    if (!data || (data as SavedTacticsState).kind === "tactics") return null;
    const lineupData = data as StoredLineupState;
    if (!isPitchSize(lineupData.pitchSize) || !isFormationKey(lineupData.formation) || !Array.isArray(lineupData.players)) return null;
    return lineupData;
  };

  const getPreviewTacticsData = (lineup: SavedLineupRecord | null) => {
    if (!lineup) return null;
    const data = lineup.players_data;
    if (!data || (data as SavedTacticsState).kind !== "tactics") return null;
    return data as SavedTacticsState;
  };

  const previewTacticsData = getPreviewTacticsData(previewLineup);
  const previewTactics = previewTacticsData?.tactics ?? [];
  const activePreviewTactic = previewTactics.find((tactic) => tactic.id === previewTacticId) ?? previewTactics[0] ?? null;
  const activePreviewFrames = activePreviewTactic?.frames ?? [];
  const previewPlaybackFrames = activePreviewFrames.length > 0 ? [createInitialTacticalFrame(), ...activePreviewFrames] : [];
  const activePreviewFrame =
    previewPlaybackFrames[Math.min(Math.max(previewFrameIndex, 0), Math.max(previewPlaybackFrames.length - 1, 0))] ?? [];

  useEffect(() => {
    const tacticsData = getPreviewTacticsData(previewLineup);
    const firstTactic = tacticsData?.tactics[0] ?? null;
    setPreviewTacticId(firstTactic?.id ?? null);
    setPreviewFrameIndex(0);
    setIsPreviewPlaying(false);
    setIsPreviewLooping(false);
  }, [previewLineup?.id]);

  useEffect(() => {
    if (!isPreviewPlaying || previewPlaybackFrames.length <= 1) return;

    const intervalId = window.setInterval(() => {
      setPreviewFrameIndex((current) => {
        const nextIndex = current + 1;
        if (nextIndex < previewPlaybackFrames.length) return nextIndex;
        if (isPreviewLooping) return 0;
        setIsPreviewPlaying(false);
        return previewPlaybackFrames.length - 1;
      });
    }, 900);

    return () => window.clearInterval(intervalId);
  }, [isPreviewPlaying, isPreviewLooping, activePreviewTactic?.id, previewPlaybackFrames.length]);

  const playPreviewTactic = () => {
    if (activePreviewFrames.length === 0) return;
    setPreviewFrameIndex(0);
    setIsPreviewPlaying(true);
  };

  const pausePreviewTactic = () => {
    setIsPreviewPlaying(false);
  };

  const stopPreviewTactic = () => {
    setIsPreviewPlaying(false);
    setPreviewFrameIndex(0);
  };

  const selectPreviewTactic = (tacticId: string) => {
    setPreviewTacticId(tacticId);
    setPreviewFrameIndex(0);
    setIsPreviewPlaying(false);
  };

  const getPitchPointerPosition = (event: ReactPointerEvent<Element>, options: { clamp?: boolean } = {}) => {
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
    const rawX = ((event.clientX - contentLeft) / contentWidth) * 100;
    const rawY = ((event.clientY - contentTop) / contentHeight) * 100;
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
    const position = getPitchPointerPosition(event, { clamp: pitchSize !== "custom" });
    if (!position) return;
    setDragPreview({ type: "player", id, x: event.clientX, y: event.clientY });

    if (pitchSize === "custom") return;

    setPlayers((current) => {
      const nextPlayers = current.map((player) =>
        player.id === id
          ? {
              ...player,
              position: getZoneName(
                pitchSize,
                position.isInside ? Math.min(96, Math.max(4, position.x)) : player.x,
                position.isInside ? Math.min(96, Math.max(4, position.y)) : player.y,
              ),
              x: position.isInside ? Math.min(96, Math.max(4, position.x)) : player.x,
              y: position.isInside ? Math.min(96, Math.max(4, position.y)) : player.y,
              onPitch: true,
            }
          : player,
      );

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

  const startDrawing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDrawMode) return;
    const position = getDrawPointerPosition(event);
    if (!position?.isInside) return;

    const lineId = Date.now();
    event.currentTarget.setPointerCapture(event.pointerId);
    setActiveDrawLineId(lineId);
    setRedoDrawLines([]);
    setDrawLines((current) => [...current, { id: lineId, points: [{ x: position.x, y: position.y }] }]);
  };

  const continueDrawing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDrawMode || activeDrawLineId === null) return;
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
    if (isDrawMode) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(id);
    setDragPreview({ type: "player", id, x: event.clientX, y: event.clientY });
    dragStartRef.current = { id, x: event.clientX, y: event.clientY };
  };

  const handleDragMove = (event: ReactPointerEvent<HTMLElement>, id: number) => {
    if (draggingId !== id) return;
    const dragStart = dragStartRef.current;
    if (!dragStart || dragStart.id !== id) return;

    const movedX = event.clientX - dragStart.x;
    const movedY = event.clientY - dragStart.y;
    if (Math.hypot(movedX, movedY) < 6) return;

    updatePlayerPosition(event, id);
  };

  const stopDragging = (event: ReactPointerEvent<HTMLElement>) => {
    const id = draggingId;
    if (id !== null && pitchSize === "custom") {
      const position = getPitchPointerPosition(event, { clamp: false });
      if (position) {
        setPlayers((current) => {
          const nextPlayers = current.map((player) => {
            if (player.id !== id) return player;

            const x = position.isInside ? Math.min(96, Math.max(4, position.x)) : player.x;
            const y = position.isInside ? Math.min(96, Math.max(4, position.y)) : player.y;

            return {
              ...player,
              position: getZoneName(pitchSize, x, y),
              x,
              y,
              onPitch: position.isInside,
            };
          });
          setCustomCount(nextPlayers.filter((player) => player.onPitch).length);
          return nextPlayers;
        });
      }
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingId(null);
    setDragPreview(null);
    dragStartRef.current = null;
  };

  const handleOpponentDragStart = (event: ReactPointerEvent<HTMLElement>, id: number) => {
    if (isDrawMode) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingOpponentId(id);
    setDragPreview({ type: "opponent", id, x: event.clientX, y: event.clientY });
  };

  const handleOpponentDragMove = (event: ReactPointerEvent<HTMLElement>, id: number) => {
    if (draggingOpponentId !== id) return;
    setDragPreview({ type: "opponent", id, x: event.clientX, y: event.clientY });
  };

  const stopOpponentDragging = (event: ReactPointerEvent<HTMLElement>) => {
    const id = draggingOpponentId;
    if (id !== null) {
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

  const applyFormation = (nextFormation: FormationKey) => {
    setFormation(nextFormation);
    setPlayers((current) => createPlayers(pitchSize, nextFormation, customCount, current));
    if (pitchSize === "custom") {
      setOpponentMarkers(createOpponentMarkers());
      setDrawLines([]);
      setRedoDrawLines([]);
      setIsDrawMode(false);
    }
  };

  const applyPitchSize = (nextPitchSize: PitchSize, options: { updateUrl?: boolean } = {}) => {
    setSavedPlayersByPitch((current) => ({ ...current, [pitchSize]: players }));
    setSavedFormationByPitch((current) => ({ ...current, [pitchSize]: formation }));
    setSavedCustomCountByPitch((current) => ({ ...current, [pitchSize]: customCount }));
    setSavedOpponentMarkersByPitch((current) => ({ ...current, [pitchSize]: opponentMarkers }));
    setSavedDrawLinesByPitch((current) => ({ ...current, [pitchSize]: drawLines }));

    if (options.updateUrl !== false) {
      writeAppRoute("lineup", { nextPitchSize });
    }

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
  };

  const applyCustomCount = (nextCount: number) => {
    const count = clampCustomCount(nextCount);
    writeAppRoute("lineup", { nextPitchSize: "custom" });
    setCustomCount(count);
    setPitchSize("custom");
    setFormation("custom");
    setPlayers((current) => createPlayers("custom", "custom", count, current));
    setOpponentMarkers(createOpponentMarkers());
    setDrawLines([]);
    setRedoDrawLines([]);
    setIsDrawMode(false);
  };

  const resetPositions = () => {
    const nextCustomCount = pitchSize === "custom" ? activePlayers.length || 5 : customCount;
    if (pitchSize === "custom") {
      setCustomCount(nextCustomCount);
    }
    setPlayers((current) => createPlayers(pitchSize, formation, nextCustomCount, current));
    if (pitchSize === "custom") {
      setOpponentMarkers(createOpponentMarkers());
      setDrawLines([]);
      setRedoDrawLines([]);
      setIsDrawMode(false);
    }
  };

  const clearNames = () => {
    const nextCustomCount = pitchSize === "custom" ? activePlayers.length || 5 : customCount;
    if (pitchSize === "custom") {
      setCustomCount(nextCustomCount);
    }
    setPlayers((current) =>
      createPlayers(pitchSize, formation, nextCustomCount, current).map((player) => ({
        ...player,
        starterName: "",
        substituteName: "",
        extraNames: [],
      })),
    );
    if (pitchSize === "custom") {
      setOpponentMarkers(createOpponentMarkers());
      setDrawLines([]);
      setRedoDrawLines([]);
      setIsDrawMode(false);
    }
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

    if (pitchSize === "custom") {
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

    if (pitchSize === "custom") {
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

  const isWorkspaceTab = activeTab === "lineup" || activeTab === "tactics";
  const signOutToLanding = async () => {
    await signOut();
    window.history.pushState({}, "", `${window.location.origin}${window.location.pathname}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <main className={`match-bg ${isWorkspaceTab ? "workspace-page" : "scroll-page"} min-h-screen p-4 text-slate-900 antialiased sm:p-6 lg:p-10`}>
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
              <div className="header-user-identity">
                <span>{user.email}</span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(shortMemberId);
                      showToast(copy.copied);
                    } catch {
                      window.prompt(copy.copyUserId, shortMemberId);
                    }
                  }}
                  title={copy.copyUserId}
                >
                  ID {shortMemberId}
                </button>
              </div>
              <button
                type="button"
                className="notification-button"
                onClick={() => {
                  setIsNotificationOpen((current) => !current);
                  setIsUserMenuOpen(false);
                }}
                aria-label="Notifications"
                aria-expanded={isNotificationOpen}
              >
                <Bell size={20} />
                {notificationCount > 0 ? <strong>{notificationCount}</strong> : null}
              </button>
              {isNotificationOpen ? (
                <div className="notification-dropdown">
                  <div className="notification-title">
                    <span>Notifications</span>
                    <strong>{notificationCount}</strong>
                  </div>
                  {notificationCount === 0 ? (
                    <p>{copy.noNotifications}</p>
                  ) : (
                    <>
                      {memberRemovalNotices.map((notice) => (
                        <div key={notice.id} className="notification-item">
                          <span>{copy.memberRemovedNotification}</span>
                          <strong>{notice.teamName}</strong>
                        </div>
                      ))}
                      {teamInvitations.map((invitation) => (
                        <div key={invitation.id} className="notification-item">
                          <span>{copy.invitedToTeam}</span>
                          <strong>{invitation.teamName}</strong>
                          <div className="notification-actions">
                            <button
                              type="button"
                              onClick={() => respondToTeamInvitation(invitation, "accepted")}
                              disabled={updatingInvitationId === invitation.id}
                            >
                              <Check size={13} />
                              {copy.acceptInvite}
                            </button>
                            <button
                              type="button"
                              onClick={() => respondToTeamInvitation(invitation, "declined")}
                              disabled={updatingInvitationId === invitation.id}
                            >
                              <X size={13} />
                              {copy.declineInvite}
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ) : null}
              <button
                type="button"
                className="header-dropdown-button"
                onClick={() => {
                  setIsUserMenuOpen((current) => !current);
                  setIsNotificationOpen(false);
                }}
              >
                <ChevronDown size={16} />
              </button>
              {isUserMenuOpen ? (
                <div className="user-dropdown">
                  <button type="button" onClick={() => switchAppTab("profile")}>
                    {copy.profileMenu}
                  </button>
                  <button type="button" onClick={() => switchAppTab("team")}>
                    {copy.teamMenu}
                  </button>
                  <button type="button" onClick={() => switchAppTab("locker")}>
                    {copy.lockerMenu}
                  </button>
                  <button type="button" onClick={signOutToLanding}>
                    {copy.signOut}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
        <h1>Line Up Football</h1>
        <div className="app-tab-switch" aria-label={copy.chooseAppMode}>
          <div ref={lineupMenuRef} className="lineup-tab-menu">
            <button
              type="button"
              className={`lineup-tab-trigger ${activeTab === "lineup" ? "active" : ""}`}
              onClick={() => {
                switchAppTab("lineup");
                setIsUserMenuOpen(false);
                setIsLineupMenuOpen((current) => !current);
              }}
              aria-expanded={isLineupMenuOpen}
              aria-haspopup="menu"
            >
              {copy.lineupTab}
              <span>{copy.pitchLabels[pitchSize]}</span>
              <ChevronDown size={14} />
            </button>
            {isLineupMenuOpen ? (
              <div className="lineup-format-menu" role="menu" aria-label={copy.choosePitchSize}>
                {pitchOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={pitchSize === option.value ? "active" : ""}
                    onClick={() => {
                      applyPitchSize(option.value);
                      switchAppTab("lineup", { nextPitchSize: option.value, updateUrl: false });
                    }}
                    role="menuitem"
                  >
                    {copy.pitchLabels[option.value]}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button type="button" className={activeTab === "tactics" ? "active" : ""} onClick={() => switchAppTab("tactics")}>
            {copy.tacticsTab}
          </button>
        </div>
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
      {qrTeam ? (
        <div className="auth-screen">
          <div className="auth-screen-card team-qr-card">
            <div className="panel-heading">
              <span>{copy.teamQrTitle}</span>
              <button
                type="button"
                onClick={() => {
                  setQrTeam(null);
                  setQrInviteUserId("");
                }}
              >
                x
              </button>
            </div>
            <img src={getTeamQrUrl(qrTeam.id, qrInviteUserId)} alt={copy.teamQrTitle} />
            <strong>{qrTeam.name}</strong>
            <p className="locker-message">{getTeamInviteLink(qrTeam.id, qrInviteUserId)}</p>
            <a href={getTeamQrUrl(qrTeam.id, qrInviteUserId)} download={`team-${qrTeam.id}-qr.png`}>
              <Download size={14} />
              {copy.downloadQr}
            </a>
          </div>
        </div>
      ) : null}
      {selectedTeam && selectedTeamIsOwner && isMemberInviteOpen ? (
        <div className="auth-screen">
          <form
            className="auth-screen-card member-invite-modal"
            onSubmit={(event) => {
              event.preventDefault();
              addTeamMemberByUserId(selectedTeam, memberInviteUserId);
            }}
          >
            <div className="panel-heading">
              <span>{copy.inviteMember}</span>
              <button
                type="button"
                onClick={() => {
                  setIsMemberInviteOpen(false);
                  setMemberInviteUserId("");
                }}
              >
                x
              </button>
            </div>
            <label className="profile-field">
              <span>{copy.userId}</span>
              <input
                type="text"
                name="team-member-user-id"
                value={memberInviteUserId}
                onChange={(event) => setMemberInviteUserId(event.target.value)}
                placeholder="VD: A1B2C3D4E5"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
              />
            </label>
            <button type="submit" disabled={!memberInviteUserId.trim()}>
              <Plus size={14} />
              {copy.inviteMember}
            </button>
          </form>
        </div>
      ) : null}
      {memberPendingDelete ? (
        <div className="auth-screen">
          <div className="auth-screen-card member-delete-confirm-modal">
            <div className="panel-heading">
              <span>{copy.confirmRemoveMemberTitle}</span>
              <button type="button" onClick={() => setMemberPendingDelete(null)} disabled={deletingMemberId === memberPendingDelete.id}>
                x
              </button>
            </div>
            <p className="locker-message">
              {copy.confirmRemoveMemberMessage}
            </p>
            <strong>{memberPendingDelete.nickname}</strong>
            <div className="confirm-actions">
              <button type="button" onClick={() => setMemberPendingDelete(null)} disabled={deletingMemberId === memberPendingDelete.id}>
                {copy.cancel}
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => deleteTeamMember(memberPendingDelete)}
                disabled={deletingMemberId === memberPendingDelete.id}
              >
                {deletingMemberId === memberPendingDelete.id ? <ButtonSpinner /> : <Trash2 size={14} />}
                {copy.confirmRemoveMemberAction}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {pendingSaveRequest ? (
        <div className="auth-screen">
          <div className="auth-screen-card save-destination-modal">
            <div className="panel-heading">
              <span>{copy.saveDestinationTitle}</span>
              <button type="button" onClick={() => setPendingSaveRequest(null)} disabled={isLockerLoading}>
                x
              </button>
            </div>
            <p className="locker-message">{copy.saveToTeamQuestion}</p>
            <button type="button" className="save-destination-personal" onClick={() => confirmSaveDestination(null)} disabled={isLockerLoading}>
              {isLockerLoading ? <ButtonSpinner /> : <Save size={15} />}
              {copy.saveToPersonalLocker}
            </button>
            <div className="save-destination-team-list">
              {ownedTeams.map((item) => (
                <button key={item.id} type="button" onClick={() => confirmSaveDestination(item.id)} disabled={isLockerLoading}>
                  <span className="save-destination-team-logo">
                    {item.logo_url ? <img src={item.logo_url} alt="" /> : item.logo_icon || teamLogoIcons[0]}
                  </span>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{copy.saveToThisTeam}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {previewLineup ? (
        <div className="auth-screen">
          <div className="auth-screen-card team-lineup-preview-modal">
            <div className="panel-heading">
              <span>{previewLineup.name}</span>
              <button type="button" onClick={() => setPreviewLineup(null)}>
                x
              </button>
            </div>
            <div className="team-lineup-preview-meta">
              <strong>{getSavedLineupFormatLabel(previewLineup)}</strong>
              <time dateTime={previewLineup.created_at}>{getSavedLineupDateTime(previewLineup)}</time>
            </div>
            {getPreviewTacticsData(previewLineup) ? (
              <div className="team-lineup-preview-content">
                <div className="team-preview-playback">
                  <button type="button" onClick={playPreviewTactic} disabled={activePreviewFrames.length === 0 || isPreviewPlaying}>
                    {copy.play}
                  </button>
                  <button type="button" onClick={pausePreviewTactic} disabled={!isPreviewPlaying}>
                    {copy.pause}
                  </button>
                  <button type="button" onClick={stopPreviewTactic} disabled={activePreviewFrames.length === 0}>
                    {copy.stop}
                  </button>
                  <button
                    type="button"
                    className={isPreviewLooping ? "active" : ""}
                    onClick={() => setIsPreviewLooping((current) => !current)}
                    disabled={activePreviewFrames.length === 0}
                  >
                    {copy.loop}
                  </button>
                </div>
                <div className="team-preview-pitch">
                  <div className="team-preview-line team-preview-half" />
                  <div className="team-preview-circle" />
                  <div className="team-preview-box team-preview-box-top" />
                  <div className="team-preview-box team-preview-box-bottom" />
                  {activePreviewFrame
                    .filter((marker) => marker.onPitch)
                    .map((marker) => (
                      <motion.span
                        key={marker.id}
                        className={`team-preview-marker ${marker.type === "opponent" ? "opponent" : ""} ${
                          marker.type === "ball" ? "ball" : ""
                        }`}
                        initial={false}
                        animate={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                        transition={{ type: "spring", stiffness: 95, damping: 18, mass: 0.7 }}
                      >
                        {marker.type === "player" ? marker.label : null}
                      </motion.span>
                    ))}
                </div>
                <div className="team-preview-frame-list">
                  {activePreviewFrames.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      className={previewFrameIndex === index + 1 ? "active" : ""}
                      onClick={() => {
                        setPreviewFrameIndex(index + 1);
                        setIsPreviewPlaying(false);
                      }}
                    >
                      {copy.frame} {index + 1}
                    </button>
                  ))}
                </div>
                <div className="team-preview-tactic-list">
                  {getPreviewTacticsData(previewLineup)?.tactics.map((tactic, index) => (
                    <button
                      key={tactic.id}
                      type="button"
                      className={activePreviewTactic?.id === tactic.id ? "active" : ""}
                      onClick={() => selectPreviewTactic(tactic.id)}
                    >
                      <strong>{getDisplayTacticName(tactic.name, index, copy)}</strong>
                      <span>{tactic.frames.length} {copy.framesUnit}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : getPreviewLineupData(previewLineup) ? (
              <div className="team-lineup-preview-content">
                <div className="team-preview-pitch">
                  <div className="team-preview-line team-preview-half" />
                  <div className="team-preview-circle" />
                  <div className="team-preview-box team-preview-box-top" />
                  <div className="team-preview-box team-preview-box-bottom" />
                  {getPreviewLineupData(previewLineup)?.drawLines.map((line) => (
                    <svg key={line.id} className="team-preview-draw-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {line.points.length > 1 ? (
                        <polyline
                          points={line.points.map((point) => `${point.x},${point.y}`).join(" ")}
                          fill="none"
                          stroke="#facc15"
                          strokeWidth="1.1"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : null}
                    </svg>
                  ))}
                  {getPreviewLineupData(previewLineup)?.players
                    .filter((player) => player.onPitch)
                    .map((player) => (
                      <span
                        key={player.id}
                        className="team-preview-player"
                        style={{ left: `${player.x}%`, top: `${player.y}%` }}
                      >
                        <i>{player.id}</i>
                        <strong>{player.starterName.trim() || `${copy.player} ${player.id}`}</strong>
                      </span>
                    ))}
                  {getPreviewLineupData(previewLineup)?.opponentMarkers
                    .filter((marker) => marker.onPitch)
                    .map((marker) => (
                      <span
                        key={marker.id}
                        className="team-preview-marker opponent"
                        style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                      />
                    ))}
                </div>
              </div>
            ) : (
              <p className="locker-message">{copy.invalidLineupData}</p>
            )}
          </div>
        </div>
      ) : null}
      {selectedTeam && user && !selectedTeamHasCurrentUser && isJoinTeamPromptOpen ? (
        <div className="auth-screen">
          <div className="auth-screen-card member-invite-modal">
            <div className="panel-heading">
              <span>{copy.joinTeamTitle}</span>
              <button type="button" onClick={() => setIsJoinTeamPromptOpen(false)}>
                x
              </button>
            </div>
            <div className="team-invite-confirm">
              <div className="team-detail-logo">
                {selectedTeam.logo_url ? <img src={selectedTeam.logo_url} alt="" /> : <span>{selectedTeam.logo_icon || teamLogoIcons[0]}</span>}
              </div>
              <strong>{selectedTeam.name}</strong>
              {selectedTeam.slogan ? <span>{selectedTeam.slogan}</span> : null}
              <p>{copy.joinTeamPrompt}</p>
            </div>
            <button type="button" onClick={joinSelectedTeamFromLink} disabled={isJoiningTeam}>
              {isJoiningTeam ? <ButtonSpinner /> : <Check size={14} />}
              {copy.confirmJoinTeam}
            </button>
          </div>
        </div>
      ) : null}
      <div
        className={`dashboard-shell mx-auto grid w-full shadow-2xl ${
          isWorkspaceTab ? "overflow-hidden" : ""
        } ${
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

                  <div className="profile-user-id">
                    <span>{copy.userId}</span>
                    <code>{shortMemberId}</code>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(shortMemberId);
                          showToast(copy.copied);
                        } catch {
                          window.prompt(copy.copyUserId, shortMemberId);
                        }
                      }}
                    >
                      <Clipboard size={14} />
                      {copy.copyUserId}
                    </button>
                  </div>

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
                      <div className="profile-position-selector">
                        {memberPositions.map((position) => (
                          <button
                            key={position}
                            type="button"
                            className={`position-tag position-${position.toLowerCase()} ${
                              profileSelectedPositions.includes(position) ? "selected" : ""
                            }`}
                            onClick={() => toggleProfilePosition(position)}
                          >
                            {position}
                          </button>
                        ))}
                      </div>
                    </label>
                    <label className="profile-field">
                      <span>{copy.location}</span>
                      <input value={profileLocation} onChange={(event) => setProfileLocation(event.target.value)} placeholder={copy.location} />
                    </label>
                    <label className="profile-field">
                      <span>{copy.profileJerseyNumber}</span>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={profileJerseyNumber}
                        onChange={(event) => setProfileJerseyNumber(event.target.value)}
                        placeholder={copy.profileJerseyNumber}
                      />
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
        ) : activeTab === "team" ? (
          <section className="locker-room profile-room team-room">
            <div className="locker-panel">
              <div className="panel-heading">
                <span>{copy.myTeams}</span>
                <strong>{teams.length}</strong>
              </div>
              {lockerStatus && lockerStatus !== copy.saved && lockerStatus !== copy.teamSaved ? (
                <p className="locker-message">{lockerStatus}</p>
              ) : null}
              {!isSupabaseConfigured ? (
                <p className="locker-message">{copy.supabaseMissing}</p>
              ) : !user ? (
                <p className="locker-message">{copy.signIn}</p>
              ) : selectedTeam ? (
                <div className="team-detail-view">
                  <section className="team-detail-header">
                    <div className="team-detail-logo">
                      {selectedTeam.logo_url ? <img src={selectedTeam.logo_url} alt="" /> : <span>{selectedTeam.logo_icon || teamLogoIcons[0]}</span>}
                    </div>
                    <div>
                      <strong>{selectedTeam.name}</strong>
                      {selectedTeam.slogan ? <span>{selectedTeam.slogan}</span> : null}
                      <small>
                        {selectedTeamDisplayMembers.length} {copy.totalMembers}
                      </small>
                    </div>
                    <div className="team-header-actions" aria-label="Team share">
                      <button type="button" onClick={() => copyTeamInviteLink(selectedTeam)} aria-label={copy.copyTeamLink} title={copy.copyTeamLink}>
                        <Clipboard size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQrInviteUserId("");
                          setQrTeam(selectedTeam);
                        }}
                        aria-label={copy.viewQrCode}
                        title={copy.viewQrCode}
                      >
                        <Share2 size={16} />
                      </button>
                    </div>
                  </section>

                  <div className="team-detail-tabs" role="tablist" aria-label={copy.teamDetails}>
                    {teamDetailTabs.map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        role="tab"
                        aria-selected={teamDetailTab === tab.value}
                        className={teamDetailTab === tab.value ? "active" : ""}
                        onClick={() => setTeamDetailTab(tab.value)}
                      >
                        <span>{tab.label}</span>
                        <strong>{tab.count}</strong>
                      </button>
                    ))}
                  </div>

                  {teamDetailTab === "tactics" ? (
                    <section className="team-lineups-panel">
                      <div className="team-section-title">
                        <span>{copy.teamSavedLineups}</span>
                        <strong>{selectedTeamLineups.length}</strong>
                      </div>
                      <div className="saved-lineup-list team-saved-lineup-list">
                        {selectedTeamLineups.length === 0 ? <p className="locker-message">{copy.noSavedLineups}</p> : null}
                        {selectedTeamLineups.map((lineup) => (
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
                              <span>{getSavedLineupFormatLabel(lineup)}</span>
                              <time dateTime={lineup.created_at}>{getSavedLineupDateTime(lineup)}</time>
                            </div>
                            <div className="saved-lineup-actions">
                              <button type="button" onClick={() => setPreviewLineup(lineup)}>
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
                              {selectedTeamIsOwner ? (
                                <button type="button" onClick={() => deleteSavedLineup(lineup.id)} disabled={deletingLineupId === lineup.id}>
                                  {deletingLineupId === lineup.id ? <ButtonSpinner /> : <Trash2 size={14} />}
                                </button>
                              ) : null}
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  ) : (
                  <section className="member-panel">
                    <div className="team-section-title">
                      <span>{copy.members}</span>
                      {selectedTeamIsOwner && selectedTeamDisplayMembers.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setMemberInviteUserId("");
                            setIsMemberInviteOpen(true);
                          }}
                        >
                          <Plus size={14} />
                          {copy.addMember}
                        </button>
                      ) : null}
                    </div>
                    {selectedTeamDisplayMembers.length === 0 ? (
                      <div className="member-empty-state">
                        <div className="empty-locker-illustration" aria-hidden="true">
                          <span />
                          <span />
                          <span />
                        </div>
                        <p>{copy.emptyLocker}</p>
                        {selectedTeamIsOwner ? (
                          <button
                            type="button"
                            onClick={() => {
                              setMemberInviteUserId("");
                              setIsMemberInviteOpen(true);
                            }}
                          >
                            <Plus size={16} />
                            {copy.addFirstPlayer}
                          </button>
                        ) : null}
                        {false ? (
                          <div className="member-invite-panel first-player-invite-panel">
                            <input
                              value={memberInviteUserId}
                              onChange={(event) => setMemberInviteUserId(event.target.value)}
                              placeholder="VD: A1B2C3D4E5"
                              aria-label={copy.userId}
                            />
                            <button type="button" onClick={() => addTeamMemberByUserId(selectedTeam!, memberInviteUserId)}>
                              <Plus size={14} />
                              {copy.inviteMember}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="member-list">
                        {false ? (
                          <div className="member-invite-panel">
                            <input
                              value={memberInviteUserId}
                              onChange={(event) => setMemberInviteUserId(event.target.value)}
                              placeholder="VD: A1B2C3D4E5"
                              aria-label={copy.userId}
                            />
                            <button type="button" onClick={() => addTeamMemberByUserId(selectedTeam!, memberInviteUserId)}>
                              <Plus size={14} />
                              {copy.inviteMember}
                            </button>
                          </div>
                        ) : null}
                        {selectedTeamDisplayMembers.map((member) => {
                          const profilePositions = parseProfilePositions(memberProfilesById[member.user_id]?.favorite_position);
                          return (
                          <div key={member.id} className="member-row">
                            {selectedTeamIsOwner && !member.isOwner ? (
                              <input
                                key={`${member.id}-${member.jersey_number}`}
                                className="member-number member-number-input"
                                type="number"
                                min={0}
                                max={999}
                                defaultValue={member.jersey_number}
                                aria-label={copy.jerseyNumber}
                                disabled={updatingMemberId === member.id || deletingMemberId === member.id}
                                onBlur={(event) => {
                                  if (!event.currentTarget.value.trim()) {
                                    event.currentTarget.value = String(member.jersey_number);
                                    return;
                                  }
                                  const nextNumber = Number(event.currentTarget.value);
                                  if (Number.isFinite(nextNumber)) {
                                    updateTeamMember(member, { jersey_number: nextNumber });
                                  }
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") event.currentTarget.blur();
                                }}
                              />
                            ) : (
                              <span className="member-number">{member.jersey_number}</span>
                            )}
                            {selectedTeamIsOwner && !member.isOwner ? (
                              <input
                                key={`${member.id}-${member.nickname}`}
                                className="member-name-input"
                                defaultValue={member.nickname}
                                aria-label={copy.playerNickname}
                                disabled={updatingMemberId === member.id || deletingMemberId === member.id}
                                onBlur={(event) => {
                                  if (!event.currentTarget.value.trim()) {
                                    event.currentTarget.value = member.nickname;
                                    return;
                                  }
                                  updateTeamMember(member, { nickname: event.currentTarget.value });
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") event.currentTarget.blur();
                                }}
                              />
                            ) : (
                              <strong>
                                {member.nickname}
                                {member.isOwner ? <small className="owner-tag">{copy.teamOwnerTag}</small> : null}
                              </strong>
                            )}
                            {member.isOwner ? (
                              <span className="owner-role-pill">{copy.teamOwnerTag}</span>
                            ) : profilePositions.length > 0 ? (
                              <div className="member-row-actions">
                                {profilePositions.map((position) => (
                                  <span key={position} className={`position-tag position-${position.toLowerCase()}`}>
                                    {position}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="member-row-actions">
                                <select
                                  className={`position-tag position-${member.position.toLowerCase()}`}
                                  value={member.position}
                                  disabled={!selectedTeamIsOwner || updatingMemberId === member.id || deletingMemberId === member.id}
                                  onChange={(event) => updateTeamMemberPosition(member, event.target.value as TeamMemberPosition)}
                                >
                                  {memberPositions.map((position) => (
                                    <option key={position} value={position}>
                                      {position}
                                    </option>
                                  ))}
                                </select>
                                {selectedTeamIsOwner ? (
                                  <button
                                    type="button"
                                    className="member-delete-button"
                                    onClick={() => setMemberPendingDelete(member)}
                                    disabled={deletingMemberId === member.id}
                                    aria-label={`${copy.delete} ${member.nickname}`}
                                    title={copy.delete}
                                  >
                                    {deletingMemberId === member.id ? <ButtonSpinner /> : <Trash2 size={14} />}
                                  </button>
                                ) : null}
                              </div>
                            )}
                          </div>
                        );
                        })}
                      </div>
                    )}
                  </section>
                  )}
                </div>
              ) : isTeamFormOpen ? (
                <div className="profile-card team-card">
                  <div className="team-brand-hero">
                    <button
                      type="button"
                      className="team-logo-preview"
                      onClick={() => teamLogoInputRef.current?.click()}
                      disabled={isTeamLogoUploading}
                      aria-label={copy.uploadTeamLogo}
                    >
                      {teamLogoUrl ? (
                        <img src={teamLogoUrl} alt="" />
                      ) : (
                        <span>{teamLogoIcon}</span>
                      )}
                      <i>
                        {isTeamLogoUploading ? <ButtonSpinner /> : <Pencil size={16} />}
                      </i>
                    </button>
                    <input
                      ref={teamLogoInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleTeamLogoFileChange}
                    />
                    <div className="team-brand-copy">
                      <strong>{editingTeamId ? copy.editTeam : copy.createTeam}</strong>
                      <span>{copy.teamSubtitle}</span>
                      <button
                        type="button"
                        className="profile-avatar-trigger"
                        onClick={() => teamLogoInputRef.current?.click()}
                        disabled={isTeamLogoUploading}
                      >
                        {isTeamLogoUploading ? copy.uploadingTeamLogo : copy.uploadTeamLogo}
                      </button>
                    </div>
                  </div>

                  <div className="profile-grid">
                    <label className="profile-field profile-field-full">
                      <span>{copy.teamName}</span>
                      <input
                        value={teamName}
                        onChange={(event) => setTeamName(event.target.value)}
                        placeholder={copy.teamNamePlaceholder}
                        required
                      />
                    </label>

                    <div className="profile-field profile-field-full">
                      <span>{copy.chooseTeamIcon}</span>
                      <div className="team-icon-grid">
                        {teamLogoIcons.map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            className={!teamLogoUrl && teamLogoIcon === icon ? "active" : ""}
                            onClick={() => {
                              setTeamLogoIcon(icon);
                              setTeamLogoUrl("");
                            }}
                            aria-label={`${copy.chooseTeamIcon} ${icon}`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="profile-field profile-field-full team-color-field">
                      <span>{copy.shirtColor}</span>
                      <div className="team-color-row">
                        <input
                          type="color"
                          value={teamShirtColor}
                          onChange={(event) => setTeamShirtColor(event.target.value)}
                          aria-label={copy.shirtColor}
                        />
                        <div className="team-swatch-list">
                          {teamColorPalette.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={teamShirtColor.toLowerCase() === color.toLowerCase() ? "active" : ""}
                              style={{ backgroundColor: color }}
                              onClick={() => setTeamShirtColor(color)}
                              aria-label={`${copy.shirtColor} ${color}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <label className="profile-field profile-field-full">
                      <span>{copy.teamSlogan}</span>
                      <textarea
                        value={teamSlogan}
                        onChange={(event) => setTeamSlogan(event.target.value)}
                        placeholder={copy.teamSloganPlaceholder}
                        rows={3}
                        maxLength={220}
                      />
                    </label>
                  </div>

                  <button type="button" className="profile-save" onClick={updateTeam} disabled={isTeamLoading || isTeamLogoUploading}>
                    {isTeamLoading ? <ButtonSpinner /> : null}
                    {copy.saveTeam}
                  </button>
                  {teams.length > 0 ? (
                    <button type="button" className="team-cancel-button" onClick={closeTeamForm} disabled={isTeamLoading || isTeamLogoUploading}>
                      {copy.cancel}
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="team-list-view">
                  <div className="team-list-toolbar">
                    <input
                      value={teamSearch}
                      onChange={(event) => setTeamSearch(event.target.value)}
                      placeholder={copy.searchTeams}
                      aria-label={copy.searchTeams}
                    />
                    <button type="button" className="profile-save team-create-button" onClick={openCreateTeamForm}>
                      <Plus size={14} />
                      {copy.createTeam}
                    </button>
                  </div>

                  {teams.length === 0 ? (
                    <p className="locker-message">{copy.noTeams}</p>
                  ) : filteredTeams.length === 0 ? (
                    <p className="locker-message">{copy.noTeamMatches}</p>
                  ) : (
                    <div className="team-card-list">
                      {filteredTeams.map((item) => (
                        <article key={item.id} className="team-list-card">
                          <div className="team-list-logo">
                            {item.logo_url ? <img src={item.logo_url} alt="" /> : <span>{item.logo_icon || teamLogoIcons[0]}</span>}
                          </div>
                          <div className="team-list-info">
                            <strong>{item.name}</strong>
                            {item.slogan ? <span>{item.slogan}</span> : null}
                            <div className="team-list-kit">
                              <i style={{ backgroundColor: item.shirt_color }} />
                            </div>
                          </div>
                          <div className="team-list-actions">
                            <button type="button" onClick={() => openTeamDetail(item.id)}>
                              {copy.view}
                            </button>
                            {user?.id === item.user_id ? (
                              <>
                                <button type="button" onClick={() => openEditTeamForm(item)}>
                                  <Pencil size={14} />
                                  {copy.editTeam}
                                </button>
                                <button type="button" onClick={() => deleteTeam(item.id)} disabled={deletingTeamId === item.id}>
                                  {deletingTeamId === item.id ? <ButtonSpinner /> : <Trash2 size={14} />}
                                  {copy.deleteTeam}
                                </button>
                              </>
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        ) : activeTab === "locker" ? (
          <section className="locker-room">
            <div className="locker-panel">
              <div className="panel-heading">
                <span>{copy.savedLineups}</span>
                <strong>{savedLineups.filter((lineup) => !lineup.team_id).length}</strong>
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

            <section className="lineup-column">
              <div className="lineup-header">
                <span>{pitchSize === "custom" ? copy.custom : copy.pitchLabels[pitchSize]} {copy.lineupSuffix}</span>
                <div className="lineup-header-actions">
                  <button type="button" className="save-button" onClick={handleSaveCurrentLineup} disabled={isLockerLoading}>
                    {isLockerLoading ? <ButtonSpinner /> : lockerStatus === copy.saved ? <Check size={14} /> : <Save size={14} />}
                    {copy.save}
                  </button>
                  <button type="button" onClick={clearNames}>
                    <Trash2 size={14} />
                    {copy.clear}
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
              <div className={`lineup-stage ${pitchSize === "custom" ? "custom-lineup-stage" : ""}`}>
                {pitchSize === "custom" ? (
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
                  </div>
                ) : null}
              <div
                ref={pitchRef}
                className={`pitch relative mx-auto aspect-[7/10] border-[4px] border-white/80 touch-none select-none ${
                  isDrawMode ? "draw-mode" : ""
                }`}
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
                  {drawLines.map((line) => (
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
                  ))}
                </svg>
                {isDrawMode ? (
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
                      style={
                        {
                          left: `${player.x}%`,
                          top: `${player.y}%`,
                          "--team-shirt-color": team?.shirt_color ?? teamShirtColor,
                        } as React.CSSProperties
                      }
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
                {pitchSize === "custom"
                  ? opponentMarkers
                      .filter((marker) => marker.onPitch)
                      .map((marker) => (
                        <button
                          key={`opponent-${marker.id}`}
                          type="button"
                          className={`opponent-pitch-dot ${draggingOpponentId === marker.id ? "dragging" : ""}`}
                          style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                          onPointerDown={(event) => handleOpponentDragStart(event, marker.id)}
                          onPointerMove={(event) => handleOpponentDragMove(event, marker.id)}
                          onPointerUp={stopOpponentDragging}
                          onPointerCancel={stopOpponentDragging}
                          aria-label={`${copy.dragOpponent} ${marker.id}`}
                        />
                      ))
                  : null}
              </div>
              </div>
              <div className="lineup-footer-actions">
                <div className={`footer-formation-switch ${pitchSize === "custom" ? "custom-formation-switch" : ""}`}>
                  {pitchSize !== "custom"
                    ? formationEntries.map(([item]) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => applyFormation(item)}
                          className={formation === item ? "active" : ""}
                        >
                          {item}
                        </button>
                      ))
                    : null}
                  {pitchSize === "custom" && isDrawMode ? (
                    <div className="draw-history-actions">
                      <button type="button" onClick={undoDrawLine} disabled={drawLines.length === 0}>
                        <Undo2 size={14} />
                        {copy.undo}
                      </button>
                      <button type="button" onClick={redoDrawLine} disabled={redoDrawLines.length === 0}>
                        <Redo2 size={14} />
                        {copy.redo}
                      </button>
                      <button type="button" onClick={clearDrawLines} disabled={drawLines.length === 0}>
                        {copy.clearLines}
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="footer-actions-right">
                  <button type="button" className="share-button" onClick={copyShareLink}>
                    {copyStatus === "copied" ? <Check size={14} /> : <Clipboard size={14} />}
                    {copyStatus === "copied" ? copy.copied : copy.share}
                  </button>
                  <button type="button" className="download-button" onClick={downloadLineupImage}>
                    <Download size={14} />
                    {copy.download}
                  </button>
                  {pitchSize === "custom" ? (
                    <button
                      type="button"
                      className={`draw-button ${isDrawMode ? "active" : ""}`}
                      onClick={() => setIsDrawMode((current) => !current)}
                    >
                      <Pencil size={14} />
                      {copy.draw}
                    </button>
                  ) : null}
                </div>
              </div>
            </section>
        </div>
        )}
      </div>
      {activeTab === "lineup" && dragPreview ? (
        <div
          className={`drag-preview ${dragPreview.type === "opponent" ? "opponent-preview" : "player-preview"}`}
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

type LandingFeature = { icon: string; title: string; desc: string };
type LandingCopy = {
  brand: string;
  eyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  explore: string;
  featuresTitle: string;
  features: LandingFeature[];
  footer: string;
};

const landingCopy: Record<Language, LandingCopy> = {
  vi: {
    brand: "Đội Hình Sân Cỏ",
    eyebrow: "Công cụ xếp đội hình & chiến thuật bóng đá",
    heroTitle: "Dựng đội hình sân cỏ chỉ trong vài giây",
    heroSubtitle:
      "Tạo đội hình sân 5, 7, 11 hoặc tuỳ chỉnh, dựng bảng chiến thuật động và chia sẻ với cả đội — tất cả trên một công cụ duy nhất.",
    explore: "Khám phá",
    featuresTitle: "Mọi thứ bạn cần cho ngày ra sân",
    features: [
      { icon: "⚽", title: "Đội hình linh hoạt", desc: "Sân 5, 7, 11 hoặc tuỳ chỉnh. Kéo thả cầu thủ, đặt tên và đổi sơ đồ tức thì." },
      { icon: "🎬", title: "Bảng chiến thuật động", desc: "Dựng từng bước di chuyển rồi chạy hoạt ảnh để xem bài phối hợp." },
      { icon: "🗄️", title: "Chiến thuật của tôi", desc: "Lưu đội hình & chiến thuật theo tài khoản, mở lại bất cứ lúc nào." },
      { icon: "🔗", title: "Chia sẻ tức thì", desc: "Tạo link hoặc ảnh đội hình để gửi nhanh cho cả đội." },
    ],
    footer: "Đội Hình Sân Cỏ — dựng đội hình, lên chiến thuật, ra sân.",
  },
  en: {
    brand: "Lineup Football",
    eyebrow: "Football line-up & tactics tool",
    heroTitle: "Build your match-day line-up in seconds",
    heroSubtitle:
      "Create 5, 7, 11-a-side or custom line-ups, design animated tactics boards and share with your whole team — all in one tool.",
    explore: "Explore",
    featuresTitle: "Everything you need for match day",
    features: [
      { icon: "⚽", title: "Flexible line-ups", desc: "5, 7, 11-a-side or custom. Drag players, name them and switch formations instantly." },
      { icon: "🎬", title: "Animated tactics board", desc: "Build movement step by step then play the animation to review your plays." },
      { icon: "🗄️", title: "Locker room", desc: "Save line-ups & tactics to your account and reopen them anytime." },
      { icon: "🔗", title: "Instant sharing", desc: "Generate a link or image of your line-up to send to the team." },
    ],
    footer: "Lineup Football — build the line-up, plan the tactics, hit the pitch.",
  },
};

function LandingPage({
  language,
  onChangeLanguage,
  onExplore,
  onSignIn,
  onSignUp,
  user,
  isAuthLoading,
  onSignOut,
}: {
  language: Language;
  onChangeLanguage: (language: Language) => void;
  onExplore: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  user: User | null;
  isAuthLoading: boolean;
  onSignOut: () => void;
}) {
  const c = landingCopy[language];
  const appCopy = copyByLanguage[language];
  return (
    <main className="landing">
      <header className="landing-nav">
        <div className="landing-brand">
          <img className="landing-logo" src="/favicon.svg" alt="" aria-hidden="true" />
          <span>{c.brand}</span>
        </div>
        <div className="landing-nav-actions">
          {isAuthLoading ? null : user ? (
            <div className="landing-user">
              <span className="landing-user-email">{user.email}</span>
              <button type="button" className="landing-auth-btn landing-auth-btn-primary" onClick={onExplore}>
                {c.explore}
              </button>
              <button type="button" className="landing-auth-btn" onClick={onSignOut}>
                {appCopy.signOut}
              </button>
            </div>
          ) : (
            <>
              <button type="button" className="landing-auth-btn" onClick={onSignIn}>
                {appCopy.signIn}
              </button>
              <button type="button" className="landing-auth-btn landing-auth-btn-primary" onClick={onSignUp}>
                {appCopy.signUp}
              </button>
            </>
          )}
          <button
            type="button"
            className="landing-lang"
            onClick={() => onChangeLanguage(language === "vi" ? "en" : "vi")}
          >
            {language === "vi" ? "🇻🇳 VI" : "🇺🇸 EN"}
          </button>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-content">
          <p className="landing-eyebrow">{c.eyebrow}</p>
          <h1 className="landing-title">{c.heroTitle}</h1>
          <p className="landing-subtitle">{c.heroSubtitle}</p>
          <button type="button" className="landing-cta" onClick={onExplore}>
            {c.explore}
            <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="landing-hero-visual" aria-hidden="true">
          <div className="landing-pitch">
            <span className="landing-pitch-line landing-pitch-halfway" />
            <span className="landing-pitch-circle" />
            <span className="landing-pitch-box landing-pitch-box-top" />
            <span className="landing-pitch-box landing-pitch-box-bottom" />
            {[
              { x: 50, y: 90 },
              { x: 26, y: 70 },
              { x: 74, y: 70 },
              { x: 50, y: 58 },
              { x: 20, y: 42 },
              { x: 50, y: 36 },
              { x: 80, y: 42 },
              { x: 36, y: 18 },
              { x: 64, y: 18 },
            ].map((dot, index) => (
              <span
                key={index}
                className={`landing-pitch-dot${index === 0 ? " landing-pitch-dot-keeper" : ""}`}
                style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
              />
            ))}
            <span className="landing-pitch-ball" />
          </div>
        </div>
      </section>

      <section className="landing-features">
        <h2 className="landing-features-title">{c.featuresTitle}</h2>
        <div className="landing-feature-grid">
          {c.features.map((feature) => (
            <article key={feature.title} className="landing-feature-card">
              <span className="landing-feature-icon" aria-hidden="true">
                {feature.icon}
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </article>
          ))}
        </div>
        <button type="button" className="landing-cta landing-cta-secondary" onClick={onExplore}>
          {c.explore}
          <span aria-hidden="true">→</span>
        </button>
      </section>

      <footer className="landing-footer">{c.footer}</footer>
    </main>
  );
}

function Root() {
  // Deep links (shared line-up, specific tab) should skip the landing page.
  const hasDeepLink = useMemo(() => hasAppRoute(), []);
  const [entered, setEntered] = useState(hasDeepLink);
  const [language, setLanguage] = useState<Language>("vi");
  const [authDialogMode, setAuthDialogMode] = useState<"sign_in" | "sign_up" | null>(null);
  const { user, isAuthLoading, signOut } = useAuth();

  useEffect(() => {
    const syncEnteredFromUrl = () => setEntered(hasAppRoute());
    window.addEventListener("popstate", syncEnteredFromUrl);
    return () => window.removeEventListener("popstate", syncEnteredFromUrl);
  }, []);

  const enterWorkspace = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "lineup");
    url.searchParams.set("pitch", "7");
    window.history.pushState({ tab: "lineup" }, "", url.toString());
    setEntered(true);
  };

  const signOutToLanding = async () => {
    await signOut();
    window.history.pushState({}, "", `${window.location.origin}${window.location.pathname}`);
    setEntered(false);
  };

  if (!entered) {
    return (
      <>
        <LandingPage
          language={language}
          onChangeLanguage={setLanguage}
          onExplore={enterWorkspace}
          onSignIn={() => setAuthDialogMode("sign_in")}
          onSignUp={() => setAuthDialogMode("sign_up")}
          user={user}
          isAuthLoading={isAuthLoading}
          onSignOut={signOutToLanding}
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
