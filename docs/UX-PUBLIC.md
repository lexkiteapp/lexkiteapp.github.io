# UX công khai – trang vào cửa + app (audit 24/10/2026)

Phạm vi: `/en/vocabulary/`, `/en/samples/`, `/en/speaking/` (+ bản vi `/tu-vung/`, `/samples/`, `/speaking/`), màn đầu app `/app/?hl=en|vi|ar`,
và quét mẫu lỗi trên mọi route app. So với chuẩn Duolingo / Babbel / Cambridge Dictionary / Quizlet.

**Đo bằng gì (chạy trên GitHub Actions, không chạy máy local):** workflow `ux-public.yml`
(`base=dist` dựng đúng commit rồi phục vụ localhost:8080; `base=https://lexkite.com` đo bản đang chạy).
- `scripts/test/ux-public.mjs` – ma trận 1280/375 × sáng/tối × en/vi/ar: ảnh màn đầu + 3 màn, LCP, CLS, KB, INP (gõ ô lọc), axe AA,
  vùng chạm < 44 px (link trong câu được miễn – WCAG 2.5.8), cuộn ngang, h1/CTA/ô tìm có trong màn đầu, 12 request nặng nhất.
- `scripts/test/ux-sweep.mjs` – mọi route app × 1280/375 × sáng/tối (+ ar 375): hàng link phụ xuống > 2 dòng, chữ phụ vượt token,
  khoảng trống > 30 % màn đầu, banner chồng nhau, thẻ đệm quá dày, điều hướng trùng, cùng vai trò khác cỡ chữ.
  `--check` chặn tái phát theo `scripts/test/ux-sweep.budget.json` (linkrow-wrap, text-token).
- Lighthouse 12 (mobile = trung vị 3 lần, desktop 1 lần).

Lưu ý: bản live của các trang tĩnh trả trang thử thách Cloudflare ("Just a moment…") cho trình duyệt headless → đo Playwright
trên `dist`; Lighthouse đi qua được nên có số live.

## Kết quả – lỗi nặng nhất trước

| # | Trang | Vấn đề (bằng chứng) | Chuẩn tốt nhất | Sửa |
|---|---|---|---|---|
| 1 | App màn đầu (khách mới) | Trang chào tải sẵn **mọi gói** lúc rảnh: 9,6 MB (dist) / 4,1 MB (live, LH total-byte-weight) – ngsl.js 416 KB, toefl/data4 257 KB, exam-vocab 226 KB… tranh băng thông với LCP; LH mobile perf 62 (dist) / 76 (live), TBT 380 ms | Duolingo/Babbel: trang chào < 1 MB | Khách mới: `prefetchAll` chờ lần chạm đầu (`pointerdown`, once) – 9,6 → 1,3 MB, TBT 380 → 60 ms |
| 2 | 3 trang tĩnh | 27–37 vùng chạm < 44 px mỗi trang: link menu cao 26 px, nút ngôn ngữ 36 px, breadcrumb 16 px, chip 35 px, link chân trang | ≥ 44 px (Apple/Material, Duolingo) | Token chung trong `SEO_CSS /* ux */`: `.btn`, menu, `.lsw-b`, crumbs, `.cats/.tf/.jump`, footer ≥ 44 px; nút nghe `.au` 44 px bằng lề âm (không tăng chiều cao hàng) |
| 3 | 3 trang tĩnh, 375 px | Thanh đầu xuống 2–3 dòng (logo + 4 link + Mở app + ngôn ngữ) → đẩy h1 xuống ~90 px | 1 dòng: logo · CTA · ngôn ngữ | ≤ 640 px: 1 dòng, link mục ẩn (đã có thanh mục `.cats` + breadcrumb + chân trang), giống landing |
| 4 | /en/vocabulary/, /tu-vung/ | Không đồng bộ với samples/speaking: hero trơn, không số liệu, không Kit, 83 bộ / 8 nhóm không có lối nhảy nhóm | Quizlet/Cambridge: tiêu đề + số liệu + bộ lọc nhóm | Dùng chung hero2 + số liệu (bộ, từ, nhóm, có phát âm) + Kit + chip nhóm |
| 5 | Tìm/lọc (vocab, samples, speaking) | Ô lọc không icon, không nút xóa, không phím tắt, trôi mất khi cuộn; không có trạng thái rỗng (chỉ 1 dòng chữ); chip lọc nhóm nằm ngoài ô tìm | Cambridge/Quizlet: ô tìm luôn trong tầm tay, xóa 1 chạm | Thanh tìm `.find` dính đầu màn hình (ô + chip trong một khối), icon kính lúp, nút × 44 px, `/` để tìm, Esc xóa, trạng thái rỗng dạng thẻ; chip nhóm chuyển vào JS chung `UI_JS` |
| 6 | App, thanh bên máy tính | Chân thanh bên 8 link (⚑ Báo lỗi · Blog · Từ vựng · Bài mẫu · Liên hệ · Quyền riêng tư · Điều khoản · Giới thiệu) xuống 4 dòng – 34 lần trên 18 route | 1 dòng phụ 12–13 px | `Blog · Giới thiệu · ⋯ Xem thêm` (popover `<details>`: Enter/Space mở, Esc đóng trả focus, bấm ngoài/Tab ra ngoài đóng) + ⚑ nút biểu tượng 28 px có chú thích |
| 7 | App, 70 route×khung | Chữ phụ `p/div/span.muted` 16 px (= cỡ thân bài) | chữ phụ 14 px | Token vai trò: `.view .muted` 14 px |
| 8 | App Cài đặt 375 px | Link pháp lý (Quyền riêng tư / Điều khoản / Liên hệ) là nút to xếp 3 dòng | 1 hàng link nhỏ | `.set-btns:has(>a.btn)` 1 dòng cuộn ngang, nút link nhỏ 13 px |
| 9 | App màn chào | Link "Kiểm tra trình độ" / "Phong cách tiếng Anh" cao 22 px, link 2 lệch lề bằng `margin-left` vật lý (sai khi xuống dòng và RTL) | ≥ 44 px, thẳng hàng | `.w-lk` (flex, 44 px) thay style nội tuyến – cũng giảm byte khung |
| 10 | Trang tĩnh | 9–12 cỡ chữ khác nhau trong 3 màn đầu; chip 13–14 px, h2 nhóm 22 px, thẻ 18 px | thang chữ ≤ 6 bậc | Đồng bộ qua hero2/stats/chip chung (vocab dùng cùng thang với samples/speaking) – còn lại ghi nợ |
| 11 | Trang tĩnh (LH) | `label-content-name-mismatch`: nút ngôn ngữ hiện "EN" nhưng tên "Language: English" | tên chứa chữ hiển thị | Nợ: sửa ở `langSwitch` cần dựng lại landing 15 ngôn ngữ (vùng của agent SEO) |
| 12 | Trang tĩnh | LCP 1,0–1,2 s, CLS 0, INP gõ lọc 24–32 ms, 60–100 KB HTML | – | Giữ: không thêm JS khung, chỗ ô lọc giữ sẵn (CLS 0) |
| 13 | Tin cậy | Trang tĩnh: ™, quyền riêng tư, điều khoản, nguồn tự biên soạn có ở chân trang; vocab thiếu số liệu "bao nhiêu từ / có phát âm" ngay màn đầu | Babbel: số liệu + cam kết ở màn đầu | Số liệu ở hero (mục 4) |

## Token vai trò (một nguồn)
- Trang tĩnh: `scripts/lib/site-layout.mjs` → `SEO_CSS` khối `/* ux */` (+ các thành phần danh sách chuyển từ `samples-ui.mjs`: hero2, stats, chip `.tf`, thẻ `.sc`).
- App: khung app chỉ còn ~100 B gzip dư → token phụ nằm ngoài SHELL, trong CSS của `web/js/report-pill.js` (nạp mọi trang app, không cache khung):
  chữ phụ 14 px; hàng link phụ 1 dòng (chân thanh bên, link pháp lý); popover "Xem thêm"; thẻ trống ≤ 28 px đệm.
- Chuỗi mới: `FIND_I18N` (15 ngôn ngữ, site-layout) và khóa app `Xem thêm` (en/shell.js + bản dịch tay 13 ngôn ngữ trong `scripts/i18n-fixed.json`).

## Mẫu lỗi toàn app (ux-sweep, route → vấn đề → sửa)

| Route | Vấn đề | Sửa | Trạng thái |
|---|---|---|---|
| mọi route (máy tính) | `nav.side-foot` 8 link / 4 dòng | Blog · Giới thiệu · ⋯ Xem thêm · ⚑ | ✓ hết |
| #/path, #/vocab, #/dict, #/library… (70) | `p.muted` 16 px | token 14 px | ✓ hết |
| #/stats | `div.muted` 16 px ("Current level") | token 14 px | ✓ hết |
| #/settings | `span.muted` 16 px; link pháp lý 3 dòng (375) | token 14 px; hàng link 1 dòng | ✓ hết |
| #/qstats (máy tính) | thẻ trống đệm 48 px | 28/24 px | ✓ |
| #/quick (375) | `.qk-card` đệm 26 px | 18 px | ✓ |
| #/dict/hello (375) | `.pron` UK/US/Chậm xếp 3 dòng cạnh ảnh; mây 10 từ liên quan 4 dòng | khoảng cách gọn hơn; mây từ là nội dung (chấp nhận) | ngân sách |
| #/settings (375) | 3 nút thao tác (thông báo…) xuống dòng | nút hành động, không phải link phụ – giữ | ngân sách |
| #/qstats ar 375 | hàng 4 nút 3 dòng | ghi nợ | ngân sách |
| #/home, #/path… | `a.btn.sm` 14/17 px; `#flipBtn`, `#saveWord` 14–17 px; `h2#meVocH` 16 vs 21 px | cần token cỡ nút trong style.css (khung) – nợ khi có chỗ byte | nợ |
| không route nào | banner chồng, khoảng trống > 30 %, điều hướng trùng | – | ✓ sạch |

Chặn tái phát: `node scripts/test/ux-sweep.mjs <base> <out> --check` (bước trong `ux-public.yml`) – hàng link phụ > 2 dòng
và chữ phụ vượt token không được vượt `scripts/test/ux-sweep.budget.json`. Script nội tuyến của trang tĩnh phải parse được
(`samples-ui.mjs` – lỗi 24/10: một dòng cũ còn sót làm chết ô lọc cả trang, bắt được nhờ Lighthouse `errors-in-console`).

## Lighthouse trước → sau
Điểm perf / a11y / best-practices / SEO, Lighthouse mobile (trung vị 3 lần). `dist` = localhost không nén (cùng điều kiện trước/sau).

| Trang | Live trước | dist trước | dist sau | Ghi chú |
|---|---|---|---|---|
| /en/vocabulary/ | 99/100/96/100 · LCP 1,6 s | 100/100/100/100 · LCP 1,0 s | 100/100/100/100 · LCP 1,0 s | BP 96 live = trang thử thách Cloudflare |
| /en/samples/ | 99/100/96/100 · LCP 1,8 s | 100/100/100/100 · 1,2 s | 100/100/100/100 · 1,2 s | |
| /en/speaking/ | 99/100/96/100 · LCP 1,8 s | 100/100/100/100 · 1,0 s | 100/100/100/100 · 1,2 s | |
| /app/?hl=en | 76/100/96/61 · LCP 5,3 s · TBT 180 ms · 4,1 MB | 62/100/100/61 · LCP 7,0 s · TBT 380 ms · 9,6 MB | **71**/100/100/61 · LCP 7,0 s · TBT **80 ms** · **1,3 MB** | SEO 61 = app `noindex` có chủ đích; LCP còn do khung 377 KB + font chặn hiển thị (nợ) |

Playwright (dist): vùng chạm < 44 px trên 3 trang tĩnh 27–37 → 12–13 (còn lại: link chữ ngắn đủ cao 44 px nhưng hẹp, chân trang);
CLS 0 trước/sau; INP gõ ô lọc 24–32 ms; axe AA 0 lỗi mọi ca; không cuộn ngang ở 375 px (en/vi/ar).
ux-sweep: linkrow-wrap 6 nhóm → 4, text-token 3 nhóm (80 lần) → 0, card-padding 2 → 2 (đệm đã giảm, ngưỡng chặt), banner chồng / khoảng trống / nav trùng 0.

## LCP màn đầu app (24/10) – đo `app-lcp.yml` (dist, Lighthouse 12 mobile trung vị 3 lần + Playwright 4G/CPU×4)
Gốc lỗi (Lantern tính LCP = mọi request XONG trước thời điểm LCP quan sát): 25 file JS khung app (~650 KB chưa nén) + en.js 284 KB + font
Google tải xong TRƯỚC khi chữ #lkHero được vẽ (khung đầu bị `.view` mờ dần từ opacity 0, rồi luồng chính bận chạy JS) → LCP 7,0 s.
Sửa: (1) `scripts/app-loader.mjs` – chỉ dist web: JS khung + CSS font nạp SAU khung hình đầu (rAF→setTimeout, dự phòng 300 ms),
giữ thứ tự defer, phát lại DOMContentLoaded/load; web/app/index.html giữ `<script defer>` (add-on MV3, app di động, test jsdom);
(2) `#view:has(#lkHero){animation:none}` – khung chào vẽ ngay; (3) font dự phòng "Be Vietnam Pro Fallback" (size-adjust 109,94 %,
ascent 90,96 %, descent 24,1 % – đo từ file font) → CLS ≤ 0,03 khi font web tới; (4) bỏ preload CSS font; (5) SW vẫn đăng ký lúc app sẵn sàng (đã sau lần vẽ đầu; trễ thêm 2 s làm hỏng phép thử offline);
(6) icon-512.png ra khỏi SHELL (6,6 KB gz, ảnh tĩnh vẫn cache khi dùng).
Kết quả /app/?hl=en: perf 71 → 99, LCP 7,0 → 2,0 s, FCP 2,9 → 1,5 s, CLS 0,007 → 0,009; ?hl=vi: 80 → 99, LCP 6,1 → 2,0 s.
Playwright 4G/CPU×4: FCP 3,0 → 1,1 s, LCP 3,6 → 1,15 s. Cổng: `app-loader.mjs --check` + `app-lcp-probe.mjs` (khởi động, khách cũ, SW, offline).

Ảnh so sánh: `out/ux-public/compare-*.png` (máy chủ sở hữu, không commit).
