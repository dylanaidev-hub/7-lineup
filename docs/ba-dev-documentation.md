# Đội Hình Sân Cỏ - Tài liệu BA & Dev

## 1. Mục tiêu tài liệu

Tài liệu này mô tả sản phẩm **Đội Hình Sân Cỏ** ở hai góc nhìn:

- **BA/Product**: phạm vi nghiệp vụ, người dùng, luồng sử dụng, rule, tiêu chí nghiệm thu.
- **Dev/Technical**: kiến trúc frontend, routing, state, dữ liệu lưu trữ, Supabase, build/deploy và checklist kiểm thử.

Tài liệu phản ánh code hiện tại trên nhánh `main`.

## 2. Tổng quan sản phẩm

**Đội Hình Sân Cỏ** là website giúp người dùng tạo đội hình bóng đá, vẽ sa bàn chiến thuật, mô phỏng chuyển động cầu thủ/bóng và lưu lại các phương án để sử dụng hoặc chia sẻ.

Website chính:

- Production domain: `https://doihinhsanco.pro.vn`
- Local development: `http://127.0.0.1:5147`

Sản phẩm gồm hai nhóm trải nghiệm chính:

- **Public website**: landing page, trang giới thiệu, trang tính năng, tin tức/kiến thức.
- **Workspace app**: khu vực thao tác đội hình, vẽ, chuyển động, hồ sơ và chiến thuật đã lưu.

## 3. Đối tượng người dùng

### 3.1. Đội trưởng / quản lý đội bóng

Nhu cầu chính:

- Chọn đội hình trước trận.
- Nhập tên cầu thủ đá chính và dự bị.
- Gửi sơ đồ vào nhóm chat.
- Lưu nhiều phương án đội hình.

### 3.2. Huấn luyện viên / người hướng dẫn chiến thuật

Nhu cầu chính:

- Mô tả cách đứng vị trí.
- Vẽ đường chạy, hướng chuyền, khu vực pressing.
- Tạo chuỗi chuyển động để giải thích bài phối hợp.
- Xuất ảnh hoặc chia sẻ link cho cầu thủ xem lại.

### 3.3. Cầu thủ / người nhận link

Nhu cầu chính:

- Mở link để xem đội hình hoặc bài chiến thuật.
- Hiểu vị trí của mình.
- Không bắt buộc đăng nhập khi chỉ xem/chỉnh nhanh.

## 4. Phạm vi tính năng hiện tại

### 4.1. Public website

Các route chính:

- `/`: trang chủ.
- `/ve-chung-toi`: trang về chúng tôi.
- `/tinh-nang/tao-doi-hinh`: trang tính năng tạo đội hình.
- `/tinh-nang/ve-sa-ban`: trang tính năng vẽ sa bàn.
- `/tinh-nang/tao-chuyen-dong`: trang tính năng tạo chuyển động.
- `/tin-tuc`: danh sách tin tức/kiến thức.
- `/tin-tuc/:slug`: chi tiết bài viết.

Các route legacy:

- `/tin-tuc-kien-thuc` redirect về `/tin-tuc`.
- `/tin-tuc-kien-thuc/:slug` redirect về `/tin-tuc/:slug`.

### 4.2. Workspace app

Các route chính:

- `/app/lineup?pitch=7`: workspace đội hình mặc định sân 7.
- `/app/lineup?pitch=5`: workspace sân 5.
- `/app/lineup?pitch=11`: workspace sân 11.
- `/app/lineup?pitch=custom`: workspace số lượng cầu thủ tùy chỉnh.
- `/app/profile`: hồ sơ người dùng.
- `/app/locker`: chiến thuật đã lưu của người dùng.

Code vẫn hỗ trợ redirect từ URL cũ có `tab`, `lineup`, `tactics` hoặc hash auth recovery về route app mới.

## 5. Rule nghiệp vụ

### 5.1. Trạng thái đăng nhập

Người dùng chưa đăng nhập vẫn có thể:

- Tạo đội hình.
- Kéo thả cầu thủ, đối thủ và bóng.
- Vẽ sa bàn.
- Tạo chuyển động.
- Chia sẻ link.
- Tải ảnh.

Người dùng chưa đăng nhập không thể lưu vào **Chiến thuật của tôi**. Khi bấm lưu, hệ thống mở modal đăng nhập.

Người dùng đã đăng nhập có thể:

- Lưu đội hình/chuyển động hiện tại vào Supabase.
- Mở lại chiến thuật đã lưu.
- Chia sẻ chiến thuật đã lưu.
- Xóa chiến thuật đã lưu.
- Cập nhật hồ sơ cá nhân.

### 5.2. Loại sân

Hệ thống hỗ trợ:

- Sân 5.
- Sân 7.
- Sân 11.
- Cá nhân hóa.

Với sân cố định, số marker đội nhà tương ứng với số cầu thủ của loại sân. Với cá nhân hóa, người dùng điều chỉnh số lượng cầu thủ.

### 5.3. Cầu thủ và dự bị

Mỗi vị trí có:

- Tên cầu thủ đá chính.
- Một ô dự bị mặc định.
- Có thể thêm input dự bị bổ sung.

Tên cầu thủ hiển thị trên sân để khi tải ảnh hoặc gửi link, người xem vẫn đọc được thông tin mà không cần hover.

### 5.4. Đối thủ và bóng

Người dùng có thể thêm marker đối thủ để mô phỏng bối cảnh.

Bóng có rule:

- Chỉ có một bóng hợp lệ trong sân tại một thời điểm.
- Bóng có thể kéo ra/vào sân.
- Khi đổi vị trí cầu thủ, vị trí bóng không được tự reset.

### 5.5. Vẽ sa bàn

Chế độ vẽ cho phép:

- Vẽ đường tự do trên sân.
- Hoàn tác.
- Làm lại.
- Xóa toàn bộ nét vẽ.

Nét vẽ phải được đưa vào:

- Link chia sẻ.
- Dữ liệu lưu.
- Ảnh tải xuống.

### 5.6. Tạo chuyển động

Chế độ chuyển động dùng danh sách bước.

Luồng chuẩn:

1. Người dùng sắp xếp marker ở trạng thái ban đầu.
2. Bấm **Thêm bước** để ghi lại Bước 1.
3. Di chuyển marker.
4. Bấm **Thêm bước** để ghi lại bước tiếp theo.
5. Bấm play để xem animation.

Rule playback:

- Khi bấm play, animation bắt đầu từ Bước 1.
- Khi animation chạy xong, sân giữ trạng thái ở bước cuối.
- Khi đổi sang tab Đội hình/Vẽ, sân hiển thị lại đội hình gốc ban đầu mà người dùng đã điều chỉnh.
- Có thể xóa từng bước.
- Có thể xóa tất cả bước.
- Có thể bật/tắt loop.

### 5.7. Fullscreen và responsive

Workspace hỗ trợ fullscreen:

- Desktop dùng HTML5 Fullscreen API nếu trình duyệt hỗ trợ.
- iOS Safari hoặc trường hợp không hỗ trợ Fullscreen API dùng pseudo-fullscreen bằng CSS.
- Phím tắt `F` bật/tắt fullscreen, nhưng bỏ qua khi focus đang ở `input` hoặc `textarea`.

Responsive mobile/tablet:

- Ưu tiên giữ sân dễ thao tác.
- Khi thiết bị mobile/tablet xoay ngang, hiển thị popup gợi ý chế độ màn hình ngang.
- Khi người dùng mở chế độ ngang/toàn màn hình, sân được tối ưu theo layout ngang.

## 6. User flow chính

### 6.1. Tạo đội hình và chia sẻ

1. Người dùng vào `/`.
2. Bấm khám phá/tạo đội hình.
3. Website chuyển đến `/app/lineup?pitch=7`.
4. Người dùng chọn loại sân nếu cần.
5. Nhập tên cầu thủ.
6. Kéo marker vào vị trí.
7. Bấm chia sẻ hoặc tải ảnh.

Kết quả mong muốn:

- Link chia sẻ mở lại đúng đội hình.
- Ảnh tải xuống có đủ marker, tên cầu thủ, bóng, đối thủ và nét vẽ nếu có.

### 6.2. Đăng nhập và lưu chiến thuật

1. Người dùng bấm đăng nhập.
2. Đăng nhập bằng email/password hoặc Google nếu Supabase provider đã cấu hình.
3. Tạo hoặc chỉnh đội hình.
4. Bấm lưu.
5. Hệ thống lưu vào bảng `lineups`.
6. Người dùng mở `/app/locker` để xem lại.

Kết quả mong muốn:

- Bản lưu xuất hiện trong **Chiến thuật của tôi**.
- Card có tên, loại dữ liệu, thumbnail và thời gian lưu.
- Người dùng chỉ thấy dữ liệu của chính tài khoản mình.

### 6.3. Tạo chuyển động

1. Người dùng chọn công cụ Chuyển động.
2. Sắp xếp marker.
3. Bấm Thêm bước.
4. Di chuyển marker.
5. Bấm Thêm bước tiếp theo.
6. Bấm play.

Kết quả mong muốn:

- Marker di chuyển mượt qua các bước.
- Bước đầu không bị bỏ qua.
- Có thể dừng, loop, xóa bước hoặc xóa tất cả.

## 7. Acceptance criteria đề xuất

### 7.1. Routing

- Từ landing page vào app tạo history entry mới để browser back quay lại landing page.
- `/app/profile` mở đúng hồ sơ.
- `/app/locker` mở đúng Chiến thuật của tôi.
- URL legacy có `tab=profile` hoặc `tab=locker` redirect đúng route mới.
- Route public không lazy-load canvas code.

### 7.2. Workspace

- Chọn sân 5/7/11/custom không làm mất dữ liệu đã lưu tạm của sân khác trong cùng session.
- Kéo cầu thủ không làm reset bóng.
- Kéo bóng không tạo thêm bóng thứ hai trong sân.
- Reset trả workspace hiện tại về trạng thái mặc định.
- Download ảnh bao gồm marker và nét vẽ.

### 7.3. Auth

- Người chưa đăng nhập bấm lưu sẽ thấy modal đăng nhập.
- Đăng ký email đã tồn tại có thông báo phù hợp.
- Quên mật khẩu không giữ lại thông báo validate từ tab đăng nhập/đăng ký.
- Đăng xuất từ mọi context điều hướng về landing page.

### 7.4. Locker

- Lưu thành công tạo record trong Supabase.
- Locker chỉ hiển thị record của user hiện tại.
- Xóa record cần cập nhật list.
- Share record tạo link mở lại đúng dữ liệu.

### 7.5. Responsive/fullscreen

- Mobile không bị zoom khi focus input.
- Mobile/tablet landscape hiển thị prompt phù hợp.
- Fullscreen ẩn header app và ưu tiên kích thước sân.
- Phím `F` không kích hoạt fullscreen khi đang nhập text.

## 8. Kiến trúc frontend

### 8.1. Stack

- React.
- TypeScript.
- Vite.
- React Router.
- Zustand.
- Framer Motion.
- Supabase JS SDK.
- React Helmet Async.
- CSS Modules cho một số component public/app.
- Global CSS theo nhóm workspace trong `src/styles/`.

### 8.2. Entry và routing

Entry point:

- `src/main.tsx`

Canvas app được lazy-load:

- `const CanvasApp = lazy(() => import("./App"));`

Router chính:

- Public routes render trực tiếp landing/content/news.
- App routes render `CanvasRoute`.
- `CanvasRoute` bọc `CanvasApp` bằng `Suspense` và loading screen.

Route app:

- `/app/lineup`
- `/app/profile`
- `/app/locker`
- `/app/tactics` hiện redirect về `/app/lineup`.

### 8.3. App controller

Logic workspace tập trung ở:

- `src/hooks/useAppController.ts`

Hook này gom các nhóm logic:

- Auth/session.
- Routing app.
- State đội hình.
- Kéo thả marker.
- Vẽ sa bàn.
- Playback animation.
- Lưu/load/share.
- Locker room.
- Profile.
- Toast.
- Outside click dropdown.

View chính:

- `src/AppView.tsx`

`AppView` nhận model từ `useAppController()` và render:

- Header app.
- Overlay auth/password recovery/mobile landscape.
- Dashboard shell.
- Profile view.
- Locker room.
- Lineup workspace.
- Drag preview.
- Toast stack.

### 8.4. Component workspace chính

Các component quan trọng:

- `src/LineupWorkspace.tsx`: layout giữa squad editor và lineup column.
- `src/SquadEditor.tsx`: nhập tên cầu thủ/dự bị.
- `src/MobileSquadEditor.tsx`: drawer chỉnh cầu thủ trên mobile.
- `src/LineupColumn.tsx`: khung chính của sân.
- `src/LineupStage.tsx`: stage chứa sân, marker tray, draw controls, animation timeline.
- `src/PitchField.tsx`: render mặt sân, marker, bóng, nét vẽ.
- `src/MarkerTray.tsx`: khay cầu thủ/đối thủ/bóng.
- `src/DrawControls.tsx`: hoàn tác, làm lại, xóa nét.
- `src/AnimationTimeline.tsx`: play/stop/loop/thêm bước/xóa bước.
- `src/CanvasToolSidebar.tsx`: chuyển công cụ đội hình/vẽ/chuyển động.
- `src/LineupHeaderActions.tsx`: lưu/reset.
- `src/LineupFooterActions.tsx`: chia sẻ, tải ảnh, fullscreen, xoay sân desktop.

## 9. State management

### 9.1. Unified workspace state

Hook:

- `src/hooks/useUnifiedWorkspaceState.ts`

Quản lý:

- `pitchSize`
- `formation`
- `customCount`
- `players`
- `opponentMarkers`
- `drawLines`
- `activeTab`
- `currentMode`
- `activeTool`
- `activeBottomSheetTool`
- refs cho pitch/draw/frame list

### 9.2. Tactical store

Store:

- `src/stores/tacticalStore.ts`

State chính:

- `currentMode`
- `isAnimationMode`
- `tactics`
- `activeTacticId`
- `frames`
- `draftFrame`
- `playbackFrames`
- `currentFrameIndex`
- `isPlaying`
- `isLooping`

Action chính:

- `selectFrame`
- `addFrame`
- `commitDraftIfChanged`
- `removeFrame`
- `clearFrames`
- `updateMarker`
- `toggleLoop`
- `play`
- `pause`
- `stop`
- `nextFrame`

### 9.3. Dữ liệu marker

Cầu thủ:

```ts
type FormationPlayer = {
  id: number;
  position: string;
  starterName: string;
  substituteName: string;
  extraNames: string[];
  x: number;
  y: number;
  onPitch: boolean;
};
```

Đối thủ:

```ts
type OpponentMarker = {
  id: number;
  x: number;
  y: number;
  onPitch: boolean;
};
```

Marker chuyển động:

```ts
type TacticalMarker = {
  id: string;
  label: string;
  type: "player" | "opponent" | "ball";
  x: number;
  y: number;
  onPitch: boolean;
};
```

## 10. Supabase

### 10.1. Client config

File:

- `src/lib/supabaseClient.ts`

Biến môi trường:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Nếu thiếu config, app vẫn chạy nhưng các chức năng auth/lưu sẽ báo chưa cấu hình Supabase.

### 10.2. Schema chính

File:

- `supabase/schema.sql`

Bảng `profiles`:

- `id`: UUID, reference `auth.users(id)`.
- `username`
- `avatar_url`
- `full_name`
- `bio`
- `favorite_team`
- `favorite_position`
- `location`
- `created_at`
- `updated_at`

Bảng `lineups`:

- `id`: UUID.
- `user_id`: reference `profiles(id)`.
- `name`
- `format`
- `players_data`: JSONB.
- `created_at`

Storage:

- Bucket public `avatars`.
- User chỉ upload/update/delete avatar trong folder theo `auth.uid()`.

### 10.3. RLS

Profiles:

- User chỉ select/insert/update profile của chính mình.

Lineups:

- User chỉ select/insert/update/delete lineup của chính mình.

### 10.4. Auth helpers

Schema có function:

- `handle_new_user()`: tự tạo profile khi user mới được tạo.
- `email_auth_providers(p_email text)`: kiểm tra provider của email để hướng dẫn đăng nhập đúng phương thức.
- `prevent_mixed_identities()`: hạn chế trộn email/password và Google trên cùng tài khoản.

## 11. Dữ liệu lưu đội hình

Dữ liệu lưu được serialize tại:

- `src/lineupState.ts`
- `src/lineupSerializer.ts`

Record lưu vào Supabase:

```ts
type SavedLineupRecord = {
  id: string;
  user_id: string;
  name: string;
  format: string;
  players_data: StoredLineupState | SavedTacticsState;
  created_at: string;
};
```

Với workspace thống nhất:

```ts
type StoredLineupState = {
  version: 1;
  kind?: "unified";
  currentMode?: WorkspaceMode;
  pitchSize: PitchSize;
  formation: FormationKey;
  customCount: number;
  players: StoredLineupPlayer[];
  opponentMarkers: StoredOpponentMarker[];
  drawLines: StoredDrawLine[];
  animationFrames?: TacticalFrame[];
  thumbnailDataUrl?: string;
  savedAt?: string;
};
```

Lưu hiện tại:

- `src/hooks/useLineupStorageActions.ts`
- Gọi `saveLineupRecord()`.
- Tạo thumbnail bằng `createLineupThumbnail()`.
- Lưu `format: "unified"`.

## 12. Chia sẻ và tải ảnh

### 12.1. Share URL

Các file liên quan:

- `src/lineupShare.ts`
- `src/savedLineupShare.ts`
- `src/shareUtils.ts`

Share dùng payload mã hóa trong URL. Người nhận mở link sẽ khôi phục lại state vào workspace.

### 12.2. Export ảnh

Các file liên quan:

- `src/canvasLineupExport.ts`
- `src/lineupThumbnail.ts`
- `src/hooks/useLineupExportActions.ts`

Yêu cầu quan trọng:

- Ảnh phải có marker, tên cầu thủ, bóng, đối thủ.
- Nét vẽ phải xuất hiện trong ảnh.
- Trạng thái animation được xuất theo frame/visual hiện tại, không phải video.

## 13. SEO và public content

SEO head:

- `src/SeoHead.tsx`

Build prerender:

- `vite.config.ts`
- `@prerenderer/rollup-plugin`
- `@prerenderer/renderer-puppeteer`

Static routes prerender:

- `/`
- `/tin-tuc`
- `/ve-chung-toi`
- `/tinh-nang/tao-doi-hinh`
- `/tinh-nang/ve-sa-ban`
- `/tinh-nang/tao-chuyen-dong`

Tin tức lấy từ Contentful khi build nếu có env:

- `VITE_CONTENTFUL_SPACE_ID`
- `VITE_CONTENTFUL_ACCESS_TOKEN`
- `VITE_CONTENTFUL_ENVIRONMENT`
- `VITE_CONTENTFUL_CONTENT_TYPE`

Build tạo:

- `sitemap.xml`
- `robots.txt`
- redirect HTML cho route legacy tin tức.

## 14. Build và chạy local

Cài dependencies:

```bash
npm install
```

Chạy local:

```bash
npm run dev -- --host 127.0.0.1 --port 5147
```

Build production:

```bash
npm run build
```

Lưu ý:

- Build full prerender cần env Contentful.
- Với Vercel có mode riêng để skip prerender Puppeteer nếu dùng cấu hình deploy tương ứng.

## 15. Checklist kỹ thuật trước khi merge/deploy

### 15.1. Type/build

- `npx tsc -b`
- `npm run build`
- `git diff --check`

### 15.2. Manual QA

Kiểm tra desktop:

- Landing page.
- `/app/lineup?pitch=5`
- `/app/lineup?pitch=7`
- `/app/lineup?pitch=11`
- `/app/lineup?pitch=custom`
- `/app/profile`
- `/app/locker`

Kiểm tra workspace:

- Kéo cầu thủ.
- Kéo đối thủ.
- Kéo bóng.
- Vẽ, undo, redo, clear.
- Tạo chuyển động, play, stop, loop.
- Reset.
- Share.
- Download image.
- Fullscreen.
- Xoay sân desktop.

Kiểm tra responsive:

- Mobile portrait.
- Mobile landscape.
- Tablet portrait.
- Tablet landscape.
- iOS Safari pseudo-fullscreen.

Kiểm tra auth/Supabase:

- Đăng ký.
- Đăng nhập email/password.
- Google login nếu provider đã bật.
- Quên mật khẩu.
- Lưu lineup.
- Mở lại trong locker.
- Xóa lineup.

## 16. Rủi ro và điểm cần chú ý

### 16.1. Supabase chưa chạy schema

Nếu database chưa chạy `supabase/schema.sql`, app sẽ báo chưa tạo bảng Supabase hoặc lỗi lưu.

### 16.2. Google Auth

Google login chỉ hoạt động khi Supabase đã bật Google provider và cấu hình đúng redirect URL.

### 16.3. URL share dài

Payload đội hình nằm trên URL nên đội hình/chuyển động quá lớn có thể làm link dài. Nếu sau này cần share nhiều dữ liệu hơn, nên chuyển sang cơ chế lưu snapshot server-side và share bằng short ID.

### 16.4. Fullscreen trên iOS

iOS Safari không hỗ trợ Fullscreen API đầy đủ cho `div`, nên pseudo-fullscreen phụ thuộc CSS và viewport behavior của trình duyệt. Cần QA trực tiếp trên thiết bị thật.

### 16.5. CSS global

Workspace hiện vẫn dùng nhiều global CSS trong `src/styles/`. Khi refactor, cần tránh đổi selector quá rộng làm ảnh hưởng public site hoặc modal.

## 17. Hướng phát triển tiếp theo

Đề xuất ưu tiên:

1. Tách tiếp CSS workspace sang CSS module theo component.
2. Giảm logic tập trung trong `useAppController` bằng các view-model nhỏ hơn.
3. Tạo E2E test cho các luồng quan trọng: drag, save, share, download, animation.
4. Tạo server-side share snapshot để tránh URL quá dài.
5. Bổ sung quản lý đội bóng/team workspace nếu product scope cần lưu chiến thuật theo đội.
6. Bổ sung versioning cho `players_data` để migration dữ liệu cũ an toàn hơn.

