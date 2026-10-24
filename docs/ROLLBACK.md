# ROLLBACK – sao lưu & khôi phục nhanh (bản xấu luôn quay lại được)

Đọc mục **0** khi đang có sự cố. Còn lại là tra cứu. Cập nhật 23/10/2026. Mọi thứ miễn phí (GitHub Actions công khai + Kho Drive của chủ + D1 Time Travel).

## 0. Có sự cố? Làm đúng thứ tự này

| # | Việc | Lệnh | Thời gian |
|---|---|---|---|
| 1 | Biết đang chạy bản nào, bản trước là gì | `bash scripts/ops/rollback-pages.sh --list` · `git tag --list 'prod-2*' --sort=-creatordate \| head -5` | 10 giây |
| 2 | Xem trước rollback (không đổi gì) | `bash scripts/ops/rollback-pages.sh --dry-run` | 5 giây |
| 3 | **Rollback web + API** về bản trước | `bash scripts/ops/rollback-pages.sh` (hoặc `… good` / `… prod-20261023-1200-ab12cd3`) | vài giây |
| 4 | Kiểm lại | `node scripts/ops/smoke.mjs` | 1 phút |
| 5 | Gỡ code xấu khỏi `main` (không thì lần push kế tiếp deploy lại nó) | §2 `git revert` | 2 phút |
| 6 | Nếu dữ liệu bị hỏng (không chỉ code) | §3 D1 Time Travel | 1–5 phút |

Token Cloudflare: `CLOUDFLARE_API_TOKEN` (quyền **Pages:Edit**; D1: **D1:Edit**) hoặc file `~/.config/lexkite/cf-token`. Remote git thật: `https://x-access-token:$(gh auth token)@github.com/lexkiteapp/lexkiteapp.github.io.git` (remote `origin` cục bộ là repo CŨ – không dùng).

## 1. Web + API (Cloudflare Pages) – rollback tức thì

- Cloudflare Pages **giữ mọi bản deploy**; rollback chỉ trỏ production về một bản cũ đã thành công (API `POST …/pages/projects/lexkite/deployments/<id>/rollback`), không build lại → vài giây.
- Mỗi lần đẩy `main` (= deploy production) workflow `prod-release.yml` gắn **tag chú thích `prod-YYYYMMDD-HHMM-<sha7>`**, chạy `npm test`, rồi **smoke** lexkite.com. Cả hai xanh → tag **`prod-good`** dời tới commit đó (chỉ tiến).
- `scripts/ops/rollback-pages.sh [--dry-run] [--list] [<đích>]`, đích là một trong:

| Đích | Nghĩa |
|---|---|
| *(bỏ trống)* / `previous` | bản production thành công ngay trước bản đang chạy |
| `good` | commit đang gắn `prod-good` (bản cuối cùng qua test + smoke) |
| `prod-20261023-1200-ab12cd3` | một tag release cụ thể |
| `ab12cd3` (≥ 7 ký tự) | theo commit |
| `<deployment id>` / short id | theo id trong `--list` |

- Lệnh in rõ *Đang chạy / Quay về* và id bản bị thay → **hoàn tác (roll-forward)** bằng chính lệnh đó với id đó.
- Không có token / mạng → làm tay: dash.cloudflare.com › Workers & Pages › lexkite › Deployments › bản cũ › **⋯ › Rollback to this deployment**.
- Phạm vi: chỉ code web (`web/`, `functions/`) và binding hiện tại. **Không** hoàn tác D1, biến môi trường, Workers khác (`workers/*`: deploy lại từ tag bằng wrangler), CDN âm thanh (GitHub Pages: chạy lại `pages.yml` từ tag).
- Cảnh báo schema: bản code mới có thể đã nâng phiên bản lược đồ D1 (`functions/api/_schema.js`, `once(db, tên, N)`). Cột/bảng thêm mới vô hại với bản cũ; nếu bản mới **đổi/xoá** cột, phải khôi phục D1 (§3) hoặc bật `SCHEMA_GATE=0` tạm. Hiện quy ước của dự án là chỉ ADD (không DROP).

## 2. Mã nguồn (git)

**Gỡ commit xấu (luôn dùng revert, không `reset --hard` + force-push):**
```bash
R=https://x-access-token:$(gh auth token)@github.com/lexkiteapp/lexkiteapp.github.io.git
git fetch -q "$R" main && git checkout -q -B fix-revert FETCH_HEAD
git log --oneline prod-good..HEAD            # những gì đã vào sau bản tốt cuối
git revert --no-edit <sha-xấu>               # nhiều commit: git revert --no-edit prod-good..HEAD  (revert từ mới → cũ)
npm test && git push "$R" HEAD:main           # = deploy bản đã sửa; prod-release gắn tag + smoke tiếp
```
Hoặc dùng `bash scripts/mergecheck.sh fix-revert "revert …"` (chạy smoke/tsc/i18n rồi đẩy). Thứ tự khuyến nghị: **rollback Pages trước (giây), git revert sau (phút)** – rollback Pages không ngăn push kế tiếp deploy lại code xấu.

**Mất cả repo / bị xoá nhánh – khôi phục từ bundle** (tuần nào cũng có, 2 bản, giữ 2 tuần gần nhất; sổ `infra/backups/code-bundle.json`):
```bash
node scripts/ops/fetch-backup.mjs code --out out/restore          # tải + kiểm sha256 (Pages phải chạy; hỏng → tải tay file trong thư mục backups/code của Drive)
git clone out/restore/lexkite-repo-YYYYMMDD.bundle restored && cd restored
git bundle list-heads ../out/restore/lexkite-repo-*.bundle        # mọi nhánh + tag có trong bundle
git fetch ../out/restore/lexkite-repo-*.bundle '+refs/heads/*:refs/heads/*' '+refs/tags/*:refs/tags/*'
git push --mirror "$R"                                             # CHỈ khi repo đích trống/đã mất
```
`code-bundle.yml` (Chủ nhật 12:00 UTC) tự diễn tập mỗi lần: `git bundle verify`, fetch mọi ref vào repo trống + so từng ref, `fsck`, clone `main`, rồi **tải lại bản sao Drive và kiểm sha256**. Lỗi → cảnh báo Quản trị `backup_code` + workflow đỏ.

## 3. Dữ liệu (D1)

### 3.1 Tuyến đầu: D1 Time Travel (khôi phục tới từng phút)
- Hạn lưu (kiểm docs Cloudflare 23/10/2026): **7 ngày gói Free, 30 ngày gói Paid**. Quá hạn thì dùng §3.2. Cần wrangler ≥ 3.4 và DB backend `production`.
- **Khôi phục GHI ĐÈ tại chỗ**: yêu cầu đang chạy bị huỷ, máy khách nhận lỗi vài giây. Mỗi lần restore trả **bookmark của trạng thái trước đó** → ghi lại để hoàn tác.
```bash
export CLOUDFLARE_API_TOKEN=$(cat ~/.config/lexkite/cf-token) CLOUDFLARE_ACCOUNT_ID=e34e14b7ab35eaf2b3d9d84fcce011f7
# D1 CHÍNH – lexkite-sync (người dùng, đồng bộ, cấu hình)
npx wrangler d1 time-travel info lexkite-sync                                   # bookmark hiện tại (LƯU LẠI)
npx wrangler d1 time-travel info lexkite-sync --timestamp="2026-10-23T08:30:00Z" # bookmark tại thời điểm trước sự cố
npx wrangler d1 time-travel restore lexkite-sync --timestamp="2026-10-23T08:30:00Z"   # hoặc --bookmark=<id>
# hoàn tác chính lần restore: npx wrangler d1 time-travel restore lexkite-sync --bookmark=<bookmark trước đó>

# D1 NỘI BỘ – lexkite-internal (tài khoản Cloudflare thứ 2: drive*, job_leases/job_runs)
export CLOUDFLARE_API_TOKEN=$(cat ~/.config/lexkite/cf-token-2) CLOUDFLARE_ACCOUNT_ID=$(cat ~/.config/lexkite/cf-account-2)
npx wrangler d1 time-travel info lexkite-internal
npx wrangler d1 time-travel restore lexkite-internal --timestamp="2026-10-23T08:30:00Z"
```
(DB nội bộ id `2cd585e3-f322-46d6-913e-9dd7139d583f`, chính `7ce39cd0-9333-4843-bd6f-5ccbefbde670`. Bảng Kho Drive còn dựng lại được từ chính Drive – `repair`/`verify`.)

### 3.2 Tuyến hai: bản xuất ngoài nền tảng (Kho Drive, mã hoá)
- `d1-backup.yml`: **thứ Hai (và thứ Ba nếu hôm trước chạm cầu dao) 00:15 UTC** – ngay sau mốc đặt lại hạn mức D1 00:00 UTC. Bảng người dùng (`users, docs, league_*, class*, notice*, reports*, config, quota_*, api_keys` – danh sách ở `functions/api/_backup.js`; KHÔNG gồm `drive*`, thống kê phiên, bảng tạm).
- **Ngân sách đọc**: keyset theo khoá chính → mỗi dòng đọc đúng 1 lần (DB ≈ 8 MB ≈ vài chục nghìn dòng, ≪ 1 % hạn mức 5 M/ngày); trần `--max-rows 400000` / `--max-calls 2500`; thuê tài nguyên `d1-backup` trong `infra/jobs.json` (ưu tiên `archive`, bị bỏ qua khi D1 dùng ≥ 50 % hạn mức); **gặp 429 `quota-guard`/`d1-budget` → dừng êm, lưu `state.json` (actions/cache), lượt kế tiếp tục** (không thử lại, không đọc thêm).
- **Mã hoá trong Worker**: nén gzip + AES-256-GCM, khoá suy ra bằng HKDF-SHA256 từ `DRIVE_ENC_KEY` (info `lexkite-backup-v1`, AAD `backup:<bảng>`) → CI và Drive chỉ thấy bản mã. **Chủ phải giữ bản sao `DRIVE_ENC_KEY` ngoài Cloudflare** (`~/.config/lexkite/drive-enc-key` + két mật khẩu) – mất khoá = mất khả năng đọc bản sao lưu *và* token Drive.
- 2 bản trên 2 Drive khác nhau (thư mục `backups/d1`), giữ 8 tuần, sổ `infra/backups/d1-main.json` (sha256, số dòng từng bảng). Số dòng `users`/`docs` tụt > 30 % so với tuần trước → cảnh báo.
- Đây là **ảnh chụp theo từng bảng, không phải điểm thời gian duy nhất** (xuất vài giây–vài phút). Cần đúng một thời điểm → Time Travel.
- **Khôi phục từ bản Drive** (Time Travel không đủ / DB hỏng hẳn):
```bash
export DRIVE_ENC_KEY=$(cat ~/.config/lexkite/drive-enc-key)
node scripts/ops/fetch-backup.mjs d1 --out out/restore                       # tải bản mới nhất, kiểm sha256 (hoặc tải tay từ Drive)
node scripts/ops/d1-restore.mjs --file out/restore/lexkite-d1-main-YYYYMMDD.bak.ndjson --key-env DRIVE_ENC_KEY --sql out/restore.sql   # giải mã NGOẠI TUYẾN → SQL
npx wrangler d1 execute lexkite-sync --local  --file out/restore.sql        # thử trên D1 cục bộ trước
npx wrangler d1 execute lexkite-sync --remote --file out/restore.sql        # áp lên production
npx wrangler d1 execute lexkite-sync --remote --command "SELECT COUNT(*) FROM users"
```
  SQL là `CREATE TABLE IF NOT EXISTS` + `INSERT OR REPLACE` (chạy lại được; không xoá dòng mới hơn bản sao lưu → muốn bảng sạch thì `DELETE FROM <bảng>` có chủ đích trước). Khôi phục 1 vài bảng: thêm `--tables users,docs`.
- **Diễn tập tự động**: sau mỗi lần sao lưu xong, CI tải lại bản Drive, giải mã (op `backup_open`), nạp vào **D1 cục bộ (Miniflare/workerd)** và đối chiếu số dòng từng bảng với sổ (`d1-restore.mjs --latest --api --drill --engine miniflare`). Lệch/giải mã lỗi → cảnh báo Quản trị `backup_d1` + workflow đỏ + issue `ci-failure`.

## 4. Ứng dụng & add-on

`release-archive.yml` (chạy ngay sau khi `android.yml` / `ios-testflight.yml` / `cws-publish.yml` thành công + quét bù thứ Bảy 11:30 UTC) lưu **3 bản đã ký gần nhất mỗi loại** lên Kho Drive (2 bản / 2 Drive, thư mục `releases/<loại>`), kèm sha256 trong `infra/backups/releases.json`:

| Loại | Nội dung | Số build |
|---|---|---|
| `android-aab` | `lexkite-<ver>-<versionCode>.aab` (ký upload key) | versionCode = 1000 + số lượt chạy |
| `ios-ipa` | `lexkite-<ver>-<build>.ipa` (ký App Store) | build = số lượt chạy |
| `addon-zip` | `lexkite-addon-<ver>-run<N>.zip` | version trong `manifest.json` |

```bash
node scripts/ops/fetch-backup.mjs --list                  # tên, ngày, kích thước, sha256 của MỌI bản sao lưu
node scripts/ops/fetch-backup.mjs android-aab --index 1   # bản AAB trước bản mới nhất (tải + kiểm sha256)
sha256sum out/restore/<file>                               # tự đối chiếu (macOS: shasum -a 256)
```

**Quay lại trên cửa hàng – không cửa hàng nào cho hạ xuống số build thấp hơn, nên "rollback" = dừng phát tán + phát lại bản tốt với số build CAO HƠN:**
- **Chrome Web Store** (add-on): không có nút quay về. (1) Nếu bản xấu còn *đang chờ duyệt*: Developer Dashboard › Package › huỷ lần gửi duyệt. (2) Nếu đã phát hành: lấy mã của bản tốt (`git checkout <tag>` hoặc zip trong `addon-zip`), **tăng `version` trong `extension/manifest.json` lên cao hơn bản đang trên cửa hàng**, chạy `cws-publish.yml` (mode `publish`) – theo `docs/CWS-RULES.md` (permissions.lock không đổi). (3) Trong lúc chờ duyệt: tắt tính năng lỗi từ xa qua `/api/config` nếu tính năng đó có cờ. Người dùng Chrome nhận bản mới trong vài giờ sau khi duyệt.
- **Google Play**: nếu đang **phát hành theo giai đoạn** (staged rollout) → Play Console › Production › **Halt rollout** (người đã nhận bản xấu vẫn giữ nó). Để sửa: `gh workflow run android.yml --ref <tag-bản-tốt>` (versionCode mới = 1000 + run, luôn tăng) rồi tạo release mới từ AAB đó; hoặc *Add from library* nếu cần dùng lại đúng AAB đã tải trước đây (chỉ khi versionCode của nó chưa bị bản khác vượt). Dự phòng: Play Console › App bundle explorer lưu mọi bundle đã tải lên.
- **App Store (iOS)**: không thể trả về binary cũ. (1) Đang **phased release** → App Store Connect › Pause phased release (tối đa 30 ngày). (2) Build bản tốt với build number mới: `gh workflow run ios-testflight.yml --ref <tag-bản-tốt>` → chọn build ở phiên bản mới và nộp review, kèm **Request an Expedited Review** (App Store Connect › Contact Us) ghi rõ lỗi nghiêm trọng. (3) Cực chẩn: Remove from Sale tạm thời. TestFlight giữ build cũ để thử nội bộ.
- Phần *nội dung* của app (từ vựng, đề, giải thích) tải từ lexkite.com → rollback Pages (§1) cũng đưa app cũ về nội dung cũ ngay, không cần qua cửa hàng.

## 4b. Âm thanh (kho media lexkite-media-2, 24/10/2026)
- Worker `lexkite-audio` dò `ORIGINS` (m2 → gốc cũ `lexkiteapp.github.io/audio`, bản Pages cũ đóng băng). Âm thanh lỗi → `curl -sI https://audio.lexkite.com/audio/l/<khoá>.mp3` xem `X-Origin`.
- Quay lại Worker cũ: `git show <commit-trước>:workers/audio/index.js > workers/audio/index.js` rồi `wrangler deploy` (thư mục workers/audio, token `~/.config/lexkite/cf-token`) – gốc cũ vẫn đủ mp3 tới khi gỡ dự phòng (docs/STORAGE.md §Gỡ dự phòng).
- mp3 còn nguyên trong lịch sử git repo chính (commit trước 24/10) → khôi phục cây: `git checkout <commit-trước> -- web/audio` (không khuyến nghị: size-guard đỏ).
- KHÔNG deploy Pages repo chính khi còn cần gốc cũ (pages.yml đã bỏ bước deploy) – deploy mới xoá bản Pages cũ.

## 5. Kiểm tra sau deploy (smoke) & vì sao không tự rollback

- `scripts/ops/smoke.mjs` (job `smoke` trong `prod-release.yml`): đợi Cloudflare Pages build xong đúng commit (check-run "Cloudflare Pages"; không thấy sau 6 phút thì đối chiếu `sw.js` live với repo; quá 25 phút → cảnh báo), rồi kiểm ~12 trang quan trọng (`/`, `/en/`, `/vi/`, `/app/`, blog, `/privacy`, sitemap, `sw.js`, `app.js`…) và 10 API (`/api/config`, `/api/hit`, `/api/sync` từ chối token giả = 401, `/api/notices`, `/api/league`, `/api/quota`, `/api/class`, `/api/lexai`, `/api/drive`, `/packs/ja.json`). 5xx / thiếu nội dung = lỗi.
- **Lỗi → ** workflow đỏ (`ci-triage.yml` mở issue `ci-failure` “CI đỏ: Prod release”, nội dung có sẵn dòng `ROLLBACK (cần chủ OK): bash scripts/ops/rollback-pages.sh <tag-trước>`) + cảnh báo Quản trị › Kho Drive loại `deploy` + thư bản tin CI. Pages build **thất bại** thì bản cũ vẫn phục vụ – không cần rollback, chỉ sửa lỗi build.
- Cổng trước deploy: **`npm test`** – chặn thật ở `mergecheck.sh` / lệnh ship TRƯỚC khi push (Pages tự deploy theo push nên GitHub Actions không chặn được); `prod-release.yml › gate` chạy lại `npm test` trên đúng commit đã deploy, đỏ → issue + không dời `prod-good`.
- **Vì sao không tự rollback (quyết định của chủ):**
  1. Rollback chỉ đổi code, không đổi D1: bản mới có thể đã ghi dữ liệu/lược đồ mà bản cũ đọc sai → rollback tự động có thể làm *tệ hơn* và che lỗi thật.
  2. Smoke đỏ có thể do ngoài code (Cloudflare/DNS chập, runner mất mạng, D1 hết hạn mức ngày, WAF chặn CI) – rollback nhầm làm mất bản sửa đúng; không có người xác nhận thì dễ vòng lặp (deploy → đỏ giả → rollback → deploy…).
  3. `main` vẫn chứa commit xấu: rollback tự động không kèm `git revert` → lần push kế tiếp lại deploy nó.
  4. Chi phí chờ thấp: cảnh báo + lệnh một dòng tới chủ trong vài phút; còn rollback sai thì khó truy nguyên.
  Muốn bật sau này: thêm bước gọi `pages-rollback.mjs` có điều kiện (smoke đỏ 2 lần liên tiếp cách 5 phút + bản trước có `prod-good`) – chỉ khi chủ đồng ý bằng văn bản.

## 6. Lịch & đăng ký (tra cứu)

| Việc | Khi nào (UTC) | Giữ | Sổ / cảnh báo |
|---|---|---|---|
| `prod-release` (tag + test + smoke) | mỗi push `main` | tag vô hạn | tag `prod-*`, `prod-good`; cảnh báo `deploy` |
| `d1-backup` | T2 00:15 (+T3 tiếp tục) | 8 tuần | `infra/backups/d1-main.json`; `backup_d1` |
| `code-bundle` | CN 12:00 | 2 tuần | `infra/backups/code-bundle.json`; `backup_code` |
| `release-archive` | sau mỗi build + T7 11:30 | 3 bản/loại | `infra/backups/releases.json`; `backup_rel` |

- Sổ việc nền `infra/jobs.json` (điều phối thuê tài nguyên, `docs/JOBS.md`); đăng ký tài nguyên `infra/resources.json` (mục `backup-rollback`). Chạy tay: Actions › workflow › *Run workflow* (`force` = làm lại dù tuần này đã có).
- Dung lượng Kho Drive: bundle repo ≈ 0,9 GB × 2 bản × 2 tuần + D1 ≈ vài MB × 2 × 8 + bản phát hành (~vài chục MB × 3 × 3 loại × 2). Thiếu chỗ (< 1,2 × cần) → job dừng + cảnh báo thay vì làm đầy Drive; nối thêm Drive ở Quản trị › Kho Drive hoặc giảm `--keep`. Bản cũ vào *thùng rác Drive* (op `retire`, chỉ áp cho `backups/` và `releases/`), không xoá cứng.
- Phụ thuộc: sao lưu/diễn tập cần `lexkite.com/api/drive` đang chạy (HMAC `LEXKITE_DRIVE_CLI_KEY`); khôi phục ngoại tuyến D1 chỉ cần file `.bak.ndjson` + `DRIVE_ENC_KEY` + Node ≥ 22.
