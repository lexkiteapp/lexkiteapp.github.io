# STORAGE – dung lượng repo chính & kho media (24/10/2026)

> TL;DR: Dung lượng repo chính và kho media (24/10): số đo trước→sau, âm thanh ở kho media, không viết lại lịch sử git, cổng size-guard. Số đo ở infra/storage-forecast.json.
> Đọc khi: thêm file lớn/media.

Nguồn sự thật: `infra/media-repos.json` (kho media, round-robin theo hash), `infra/resources.json` (sổ tài nguyên), số đo `infra/storage-forecast.json`
(= `web/data/storage-forecast.json`, Quản trị › 💾 Lưu trữ). Đo lại: `node scripts/lexicon/expand/forecast.mjs --measure` (storage-watch hằng tuần, tự commit số đo).

## 1. Đo 24/10 (trước → sau)
| Repo | Cây đầu nhánh | Số tệp | API (cả lịch sử) |
|---|---|---|---|
| lexkiteapp.github.io (chính) | 711 MB → ~229 MB | 31.669 → ~4.180 | 945 MB → ~945 MB (lịch sử giữ nguyên, §3) |
| lexkite-media (m1) | ~583 MB | – | 583 MB · state `full` (ảnh blog/thư viện vẫn ghi qua pipeline riêng, KHÔNG nhận âm thanh) |
| lexkite-media-2 (m2, mới) | 0 → ~514 MB | 27.489 | ~0,5 GB |

Nặng nhất trong cây repo chính trước khi chuyển: `web/audio/l` 475,7 MB / 25.674 mp3 (câu bài nghe) · `brand/library/cine` 99,3 MB / 186 · `extension/app/js` 20,9 MB ·
`web/i18n/explain` 10,8 MB · `web/i18n/content` 8,1 MB · `web/js/i18n` 7,9 MB · `web/audio/w` 5,9 MB / 1.811 mp3 (giọng từ). Ảnh (`web/img`, `store`, `mobile/icons`) < 12 MB tổng.

## 2. Âm thanh ở kho media (đã làm)
- mp3 `audio/l/*` + `audio/w/*` ở **lexkite-media-2** (Pages legacy `main /`, `.nojekyll`, robots chặn). Repo chính chỉ giữ chỉ mục: `web/js/listen/audio-index.js`, `web/audio/w/index.txt`.
- Phục vụ: `https://audio.lexkite.com/audio/<l|w>/<khoá>.mp3` – Worker `lexkite-audio` (`workers/audio/index.js`) dò `ORIGINS` theo thứ tự (m2 → gốc cũ `lexkiteapp.github.io/audio`), trả bản 200 đầu, header `X-Origin`. Cache 1 năm.
- Dự phòng phía máy khách: `AUDIO_BASES`/`UI.audioUrl` (web/js/ui.js), `listening.js`, `site-layout.mjs` (trang SEO), `extension/newtab.js`, `web/sw.js`: CDN → `lexkiteapp.github.io/lexkite-media-2/audio/l/` → gốc cũ.
- Sinh mới (CI): `gen-audio.mjs` / `gen-word-audio.mjs` ghi `.media-out/` (gitignore) → `scripts/media/push.mjs` (clone nông+thưa+không blob, deploy key secret `MEDIA2_DEPLOY_KEY`) → **đẩy thành công** mới commit chỉ mục. `pages.yml` giờ chỉ KIỂM (`audio-cdn-check.mjs --media` + mẫu HTTP), không deploy.
- `WORD_AUDIO_EXPAND=1` bật trong `word-audio.yml` (từ mở rộng 20k) – mp3 vào m2, không vào repo chính.
- Giới hạn tệp: dist Cloudflare Pages vẫn ≤ 18.000 (build-web.sh, âm thanh không vào dist). Kho media: `soft_files` 60.000/kho (cảnh báo 70 %).

### Gỡ dự phòng (sau 1 bản phát hành, ≥ 31/10/2026)
Xoá gốc cuối `https://lexkiteapp.github.io` trong `workers/audio/index.js` (`wrangler deploy`), phần tử thứ 3 của `AUDIO_BASES` (ui.js), `site-layout.mjs`, `newtab.js`, phần tử thứ 2 của `alt` trong `sw.js`; có thể tắt Pages repo chính. Kiểm không còn `X-Origin: legacy` trước khi gỡ.

### Mở kho mới (m3) khi m2 ≥ 70 %
1. `POST /user/repos` `lexkite-media-3` (public, không issues/wiki) · đẩy `.nojekyll`, `index.html`/`404.html` chuyển về lexkite.com, `robots.txt` Disallow · `POST /repos/…/pages` `{build_type: legacy, source: {branch: main, path: /}}`.
2. Deploy key (ghi) → secret `MEDIA3_DEPLOY_KEY` (sealed-box với public key secrets) · workflow xuất `MEDIA_KEY_M3`.
3. `infra/media-repos.json`: m2 `state: full`, m3 `state: open` · `infra/resources.json` mục media-3 → "Miễn phí" · thêm m3 vào **đầu** `ORIGINS` Worker + `wrangler deploy`.
Tệp đã đặt không bao giờ dời; Worker dò mọi kho nên URL không đổi.

## 3. Lịch sử git repo chính – KHÔNG viết lại
- Lịch sử bắt đầu 15/10/2026 (gốc gộp), ~1.920 commit. API size 945 MB ≈ cây đầu nhánh cũ (~711 MB, mp3 không nén được) + các bản sửa JSON/JS lớn (`web/i18n/*` ~1.357 phiên bản blob, `extension/app` ~2.922, `content/blog` ~1.402). Nhị phân đã xoá trong lịch sử chỉ ~60 ảnh nhỏ (store/brand).
- Xoá mp3 khỏi cây KHÔNG làm giảm API size (blob còn trong lịch sử) – nhưng dừng tăng: mp3 mới không vào repo chính (+~143 MB âm thanh từ 20k đi m2).
- Viết lại lịch sử (filter-repo) bị loại: phá mọi clone/worktree/agent, tag `prod-*`, PR mở; GitHub vẫn giữ object cũ tới khi support GC. Nếu buộc phải < 1 GB: repo mới từ ảnh chụp cây (không lịch sử) – quyết định của chủ.

### Giữ CI nhanh (đề xuất, áp dần)
- `actions/checkout@v4` mặc định `fetch-depth: 1` → không tải lịch sử; sau khi chuyển mỗi checkout ~229 MB thay vì ~711 MB.
- Việc chỉ đọc vài tệp: `sparse-checkout` (như `size-guard.yml`) hoặc `filter: blob:none`.
- Việc cần dải commit (size-guard, ci-triage): `fetch-depth: 0` + `filter: blob:none` (chỉ commit + cây) – blob nhị phân tải lười khi đo.
- Clone cục bộ/agent: `git clone --filter=blob:none` (hoặc `--depth 1` cho bản deploy) – không cần ~1 GB lịch sử.

## 4. Cổng chặn tăng (size-guard)
`scripts/test/size-guard.mjs` + `.github/workflows/size-guard.yml` (mọi push main + PR): đỏ khi cây HEAD > 600 MB hoặc một commit thêm/sửa > 20 MB tệp nhị phân
(không phải văn bản). Ngoại lệ có chủ đích: dòng `Size-Guard: allow` trong thông điệp commit (ghi lý do). Chạy tay: `node scripts/test/size-guard.mjs --range origin/main..HEAD`.

## 5. Quản trị › 💾 Lưu trữ
`web/js/admin-storage.js` đọc `/data/storage-forecast.json`: từng repo (MB cây đầu nhánh, MB cả lịch sử, số tệp, %, dự báo khi đủ 20k từ), cảnh báo ≥ 70 %,
dự báo kho 20k (âm thanh/ảnh từ mới, tệp Pages kho từ so với cổng 18.000).
