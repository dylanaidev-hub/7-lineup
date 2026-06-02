# Line Up Football - Project Documentation

## 1. Tổng Quan

Line Up Football là web app giúp người dùng thiết kế đội hình bóng đá, kéo thả marker cầu thủ trên sơ đồ sân, lưu đội hình và chia sẻ đội hình qua link. App hiện hỗ trợ nhiều loại sân, bảng chiến thuật động, tài khoản người dùng, lưu dữ liệu lên Supabase và xuất hình ảnh đội hình.

Project được xây dựng theo hướng frontend-first:

- Không có backend custom trong repo.
- Dữ liệu local được giữ bằng React state và một phần Zustand.
- Dữ liệu tài khoản, hồ sơ và đội hình đã lưu dùng Supabase.
- Có thể chạy local bằng Vite hoặc build ra file `dist/standalone.html`.

## 2. Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS / CSS custom trong `src/styles.css`
- Zustand cho state của bảng chiến thuật động
- Supabase cho authentication, profile, lưu đội hình
- Framer Motion cho animation
- Lucide React cho icon
- Google Analytics qua `gtag.js`
- Google Font Roboto

Các dependency chính nằm trong `package.json`.

## 3. Cấu Trúc Codebase

```text
.
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── run-local.cmd
├── open-demo.cmd
├── public/
│   └── favicon.svg
├── scripts/
│   └── make-standalone.cjs
├── src/
│   ├── main.tsx
│   ├── styles.css
│   ├── hooks/
│   │   └── useAuth.ts
│   └── lib/
│       └── supabaseClient.ts
├── supabase/
│   └── schema.sql
└── dist/
    ├── index.html
    └── standalone.html
```

### File quan trọng

- `src/main.tsx`: file chính của app. Hầu hết type, state, formation config, UI, drag/drop, share, download, auth dialog, landing page và tactical board đều nằm ở đây.
- `src/styles.css`: style chính cho landing page, lineup board, tactical board, responsive mobile, marker, form, locker, profile.
- `src/hooks/useAuth.ts`: hook quản lý Supabase session, user, sign out, password recovery.
- `src/lib/supabaseClient.ts`: khởi tạo Supabase client từ biến môi trường.
- `supabase/schema.sql`: schema database, RLS policies, trigger tạo profile, function kiểm tra provider email/Google, storage bucket avatar.
- `scripts/make-standalone.cjs`: sau khi build, script này nhúng CSS/JS vào `dist/standalone.html`.
- `index.html`: root HTML, favicon, Google font Roboto, Google Analytics tag.

## 4. Chức Năng Hiện Tại

### 4.1 Landing Page

Landing page giới thiệu app, có logo đồng bộ với `public/favicon.svg`, nội dung tiếng Việt/tiếng Anh và CTA vào workspace thiết kế đội hình.

### 4.2 Lineup Board

Người dùng có thể thiết kế đội hình trên sân bóng dọc:

- Sân nền xanh.
- Vạch biên, vòng tròn giữa sân, khu phạt đền, khung thành.
- Marker cầu thủ dạng vòng tròn, hiển thị số và tên.
- Marker có thể kéo thả tự do trong sân.
- Khi kéo cầu thủ vào vùng sân, vị trí tự đổi theo zone tương ứng.
- Mỗi vị trí có thể nhập cầu thủ đá chính, dự bị và thêm nhiều tên phụ.
- Tên bị sát viền đã được xử lý để tránh cắt nhãn.

### 4.3 Loại Sân Và Template

App hỗ trợ:

- Sân 5
- Sân 7
- Sân 11
- Cá nhân hóa

Mỗi loại sân có formation preset riêng trong `formationsBySize` ở `src/main.tsx`.

Ví dụ các nhóm formation:

- Sân 5: `1-2-1`, `2-1-1`, `1-1-2`
- Sân 7: `2-3-1`, `3-2-1`, `2-2-2`
- Sân 11: các preset 11 người
- Cá nhân hóa: mặc định 5 cầu thủ bao gồm GK, đội hình `1-2-1`, cho phép tối đa 11 cầu thủ

### 4.4 Cá Nhân Hóa

Tab cá nhân hóa cho phép người dùng kéo marker cầu thủ từ box ngoài vào sân. Số lượng field trong Squad Editor thay đổi theo số cầu thủ đang có trong sân.

Các chức năng chỉ xuất hiện ở Cá nhân hóa:

- Opponent marker
- Draw mode
- Undo/Redo nét vẽ
- Clear toàn bộ nét vẽ

### 4.5 Opponent Markers

Opponent là các marker đỏ 20px nằm ngoài sơ đồ và có thể kéo vào sân. Khi kéo ra ngoài, marker quay về box. Opponent chỉ dùng ở Cá nhân hóa trong Lineup Board.

### 4.6 Draw Mode

Draw mode cho phép vẽ line tự do lên sân:

- Bật/tắt bằng button Draw.
- Vẽ bằng pointer/mouse/touch.
- Undo từng nét.
- Redo từng nét.
- Clear Lines để xóa toàn bộ nét vẽ.
- Draw line được include khi share/download ở chế độ Cá nhân hóa.

### 4.7 Share Lineup

Chức năng share tạo URL có query param `lineup`.

Payload share có:

- `pitchSize`
- `customCount`
- `formation`
- `players`
- `opponentMarkers` nếu là Cá nhân hóa
- `drawLines` nếu là Cá nhân hóa

Payload được JSON stringify rồi encode base64 URL-safe trong `encodeSharePayload`.

Khi mở link share, app decode bằng `decodeSharePayload` và khởi tạo lại đội hình tương ứng.

### 4.8 Download Image

Download image xuất ảnh đội hình bằng canvas. Logic nằm trong `src/main.tsx`, dùng vị trí hiện tại của sân, player, opponent và draw line để render ảnh.

Mục tiêu hiện tại:

- Ảnh giữ tỉ lệ giống browser.
- Có thêm vùng an toàn để không cắt nhãn/marker ngoài sân.
- Hỗ trợ download trên desktop và mobile.

### 4.9 Tactical Board - Bảng Chiến Thuật Động

Ngoài Lineup Board, app có tab Bảng chiến thuật động:

- Marker cầu thủ.
- Marker đối thủ.
- Marker bóng.
- Kéo thả marker vào/ra sân.
- Tạo nhiều frame chiến thuật.
- Play animation qua các frame.
- Tạo nhiều tactic/playbook.
- Share tactical board qua query param `tactics`.
- Lưu tactical board vào Locker Room nếu người dùng đã đăng nhập.

State của phần tactical board dùng Zustand qua `useTacticalStore`.

### 4.10 Locker Room

Locker Room là khu lưu đội hình/bảng chiến thuật theo user:

- Lưu đội hình hiện tại.
- Lưu bảng chiến thuật.
- Xem danh sách đã lưu.
- Lọc theo Sân 5, Sân 7, Sân 11, Cá nhân hóa, Tactics.
- Load lại đội hình đã lưu.

Dữ liệu lưu vào table `lineups` trong Supabase.

### 4.11 Đội Bóng

Mỗi tài khoản có thể tạo và quản lý nhiều đội bóng qua menu dropdown tài khoản > Đội bóng.

Màn Đội bóng gồm:

- Danh sách đội bóng đã tạo.
- Search theo tên đội/slogan.
- Tạo đội bóng mới.
- Sửa đội bóng.
- Xoá đội bóng.
- Trang chi tiết đội bóng với TeamHeader, MiniLineupBoard, TeamShare và MemberList.
- QR invite popup và link mời dạng `https://doihinhsanco.pro.vn/team/[id]`.
- Quản lý thành viên đội bóng, gồm số áo, tên/biệt danh và tag vị trí GK/DF/MF/FW.
- Người được thêm bằng User ID sẽ thấy đội bóng trong danh sách đội đang tham gia.
- Thành viên chỉ được xem chi tiết và dùng share link/QR; các chức năng sửa đội, xoá đội, thêm thành viên, đổi vị trí chỉ dành cho người tạo đội.
- Nếu tài khoản chưa có đội nào, form tạo đội sẽ mở trực tiếp.
- Sau khi lưu đội bóng, app quay lại màn danh sách.

Thông tin mỗi đội bóng gồm:

- Tên đội bóng, bắt buộc.
- Logo đội bóng, có thể upload từ máy/điện thoại.
- Icon logo nhanh nếu đội chưa có logo riêng.
- Màu áo chính.
- Mô tả/Slogan tuỳ chọn.

Dữ liệu lưu trong table `teams` của Supabase. Logo upload vào bucket `team-logos`.

Màu áo chính và màu quần hiện được đưa vào marker cầu thủ trên sơ đồ thông qua CSS variable, để thương hiệu đội bóng có tác dụng trực tiếp khi xếp đội hình.

### 4.12 Profile Và Authentication

App có authentication qua Supabase:

- Sign in.
- Sign up.
- Reset password.
- Google/email provider handling.
- Profile gồm username, full name, bio, favorite team, favorite position, location, avatar.
- Avatar upload qua Supabase Storage bucket `avatars`.

Nếu chưa cấu hình Supabase, app vẫn có thể chạy phần local, nhưng lưu cloud/auth sẽ báo cần cấu hình `.env`.

### 4.13 Responsive Mobile

App đã có các tối ưu mobile:

- Layout tự xuống hàng ở màn nhỏ.
- Hạn chế overflow ngang.
- Controls chính trên mobile được đưa xuống dưới sơ đồ để dễ thao tác.
- Squad editor mobile tránh ép người dùng phải scroll quá nhiều khi nhập.
- Các row player/opponent marker trên mobile wrap xuống hàng thay vì scroll ngang.

## 5. State Và Data Flow

### 5.1 Local React State

Lineup board dùng state trong component `App`:

- `pitchSize`
- `formation`
- `customCount`
- `players`
- `opponentMarkers`
- `drawLines`
- `savedPlayersByPitch`
- `savedFormationByPitch`
- `savedCustomCountByPitch`
- `savedOpponentMarkersByPitch`
- `savedDrawLinesByPitch`
- UI state: tab, dropdown, language, toast, auth dialog, drag preview, drawing state

### 5.2 Zustand Tactical Store

Tactical board dùng `useTacticalStore` trong `src/main.tsx`.

Các nhóm state chính:

- `tactics`
- `activeTacticId`
- `frames`
- `draftFrame`
- `currentFrameIndex`
- `isPlaying`
- `isLooping`
- `isAnimationMode`

Các action chính:

- `addFrame`
- `removeFrame`
- `clearFrames`
- `setCurrentFrameIndex`
- `updateMarker`
- `toggleLoop`
- `saveTactic`
- `createTactic`
- `loadTactic`
- `deleteTactic`
- `nextFrame`
- `togglePlay`

### 5.3 Supabase Data

Supabase dùng cho:

- Auth session.
- User profile.
- Saved lineups.
- Saved tactics.
- Avatar storage.

Biến môi trường:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Schema nằm ở `supabase/schema.sql`.

## 6. Database Schema

### `profiles`

Lưu thông tin hồ sơ user:

- `id`
- `username`
- `avatar_url`
- `full_name`
- `bio`
- `favorite_team`
- `favorite_position`
- `location`
- `created_at`
- `updated_at`

### `lineups`

Lưu đội hình và chiến thuật:

- `id`
- `user_id`
- `name`
- `format`
- `players_data`
- `created_at`

`players_data` là JSONB. Với đội hình thường, dữ liệu có dạng `StoredLineupState`. Với tactical board, dữ liệu có dạng:

```ts
{
  kind: "tactics";
  tactics: TacticalPlaybook[];
}
```

### `teams`

Lưu thương hiệu đội bóng theo từng user:

- `id`
- `user_id`
- `name`
- `logo_url`
- `logo_icon`
- `shirt_color`
- `shorts_color`, vẫn giữ trong schema để tương thích dữ liệu cũ
- `socks_color`, vẫn giữ trong schema để tương thích dữ liệu cũ
- `slogan`
- `created_at`
- `updated_at`

Mỗi user có thể có nhiều record trong `teams`; RLS đảm bảo user chỉ thấy và chỉnh đội bóng của chính mình.

### `team_members`

Lưu thành viên theo từng đội bóng:

- `id`
- `team_id`
- `user_id`
- `jersey_number`
- `nickname`
- `position`, một trong `GK`, `DF`, `MF`, `FW`
- `created_at`
- `updated_at`

RLS cho phép đội trưởng quản lý thành viên của các đội thuộc tài khoản của mình.

## 7. Commands

### Cài dependency

```bash
npm install
```

### Chạy local

```bash
npm run dev
```

Hoặc trên Windows có thể dùng:

```bash
run-local.cmd
```

URL local thường là:

```text
http://localhost:5173/
```

### Build production

```bash
npm run build
```

Build sẽ tạo:

- `dist/index.html`
- asset JS/CSS trong `dist/assets`
- `dist/standalone.html`

### Preview production build

```bash
npm run preview
```

## 8. Build Và Standalone HTML

Script build trong `package.json`:

```json
"build": "tsc -b && vite build && node scripts/make-standalone.cjs"
```

Quy trình:

1. TypeScript build kiểm tra type.
2. Vite build production.
3. `scripts/make-standalone.cjs` đọc JS/CSS từ `dist/assets`.
4. Nhúng toàn bộ vào `dist/standalone.html`.

File `standalone.html` dùng để mở demo trực tiếp không cần dev server.

## 9. Deployment

Project đã từng được push lên GitHub repo:

```text
https://github.com/dylanaidev-hub/7-lineup
```

Live URL từng dùng:

```text
https://dylanaidev-hub.github.io/7-lineup/
```

Flow thường dùng:

1. Sửa code local.
2. Chạy `npm run build`.
3. Commit code.
4. Push lên GitHub.
5. GitHub Pages/go-live cập nhật theo cấu hình repo.

## 10. Analytics

Google Analytics được thêm trong `index.html` bằng Google tag:

```text
G-NCQ98NW7LE
```

Tag này chạy khi app được mở từ bản deploy hoặc local nếu trình duyệt cho phép tải script ngoài.

## 11. Font Và Branding

- Font chính hiện tại: Roboto.
- Favicon: `public/favicon.svg`.
- Logo landing page dùng chính favicon để đồng bộ nhận diện.
- Title landing: Line Up Football.

## 12. Quy Ước Khi Phát Triển Tiếp

### Khi thêm formation mới

Sửa trong `formationsBySize` ở `src/main.tsx`.

Cần đảm bảo:

- `id` cầu thủ đúng số lượng sân.
- `x`, `y` là phần trăm vị trí trên sân.
- Formation key có trong type `FormationKey`.
- Nếu là loại sân mới, cập nhật `PitchSize`, `pitchOptions`, `pitchZonesBySize`, `formationsBySize`, copy đa ngôn ngữ và UI liên quan.

### Khi chỉnh vùng tự đổi vị trí

Sửa trong `pitchZonesBySize`.

Mỗi zone gồm:

- `name`
- `x1`
- `x2`
- `y1`
- `y2`

Khi player được kéo, `getZoneName` sẽ tìm zone tương ứng và cập nhật `position`.

### Khi chỉnh drag/drop

Các function chính:

- Lineup player: `handleDragStart`, `handleDragMove`, `stopDragging`
- Opponent: `handleOpponentDragStart`, `handleOpponentDragMove`, `stopOpponentDragging`
- Tactical board marker: `startMarkerDrag`, `moveMarker`, `stopMarkerDrag`

Nên giữ nguyên nguyên tắc:

- Khi chỉ click marker ngoài sân thì không tạo marker mới.
- Khi kéo ra ngoài sân, marker phải quay về tray/box.
- Không để browser select text trong lúc kéo.
- Drag preview phải bám đúng con trỏ.

### Khi chỉnh download image

Logic download dùng canvas trong `src/main.tsx`. Khi thay đổi layout sân, marker size, label hoặc vùng padding, cần test lại:

- Desktop.
- Mobile.
- Player sát viền.
- Opponent nằm ngoài sân.
- Draw line.
- Cá nhân hóa với số cầu thủ khác nhau.

### Khi chỉnh share

Nếu thêm dữ liệu mới cần được share, cập nhật cả:

- `SharedLineup`
- `encodeSharePayload`
- `decodeSharePayload`
- hàm khởi tạo từ shared data

Nếu dữ liệu thuộc tactical board, cập nhật:

- `encodeTacticalPayload`
- `decodeTacticalPayload`
- `normalizeTacticalPlaybooks`

## 13. Lưu Ý Hiện Trạng Kỹ Thuật

- `src/main.tsx` đang là file rất lớn, chứa nhiều domain cùng lúc. Nếu project phát triển thêm, nên tách dần thành component/hook riêng:
  - `LineupBoard`
  - `Pitch`
  - `SquadEditor`
  - `TacticalBoard`
  - `LockerRoom`
  - `Profile`
  - `AuthDialog`
  - `formations.ts`
  - `share.ts`
  - `downloadImage.ts`
- Build hiện có thể cảnh báo chunk JS lớn hơn 500kB. Đây là warning, không phải lỗi build. Có thể tối ưu sau bằng code splitting.
- Supabase là optional ở runtime, nhưng các tính năng đăng nhập/lưu cloud cần `.env` và database đã chạy `supabase/schema.sql`.
- `dist/` là output build, không nên sửa trực tiếp.

## 14. Checklist Test Nhanh Sau Khi Sửa

Sau mỗi thay đổi đáng kể nên test:

- `npm run build` pass.
- Mở `http://localhost:5173/`.
- Chọn sân 5/7/11/Cá nhân hóa.
- Kéo player trong sân và ra ngoài nếu là Cá nhân hóa.
- Kéo opponent vào/ra ở Cá nhân hóa.
- Draw, Undo, Redo, Clear Lines.
- Share link rồi mở lại link.
- Download image trên desktop.
- Kiểm tra layout mobile nhỏ, đặc biệt iPhone 12 width.
- Login, save lineup, load lineup nếu Supabase được cấu hình.
