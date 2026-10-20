# 📋 Bảng giao việc Claude ⇄ Antigravity

Quy trình (không cần người chuyển lời) – **2 chiều, linh hoạt**:
- Anh Quyền giao **Claude** → Claude chia thẻ TODO cho Antigravity, duyệt, commit.
- Anh Quyền giao **Antigravity trực tiếp** → Antigravity ghi thẻ vào **HỎI CLAUDE** (yêu cầu của anh + kế hoạch + file định sửa) và commit; Claude trả lời ngay trong thẻ ở vòng kế tiếp (✅ đồng ý / ✏️ cần chỉnh / ⚠️ file đang có người giữ). Việc nhỏ, rõ ràng, chỉ đụng vùng của Antigravity thì Antigravity cứ làm, ghi thẻ vào CHỜ DUYỆT để Claude duyệt sau.

1. **Claude** nhận yêu cầu từ anh Quyền → chia việc → thêm thẻ vào mục **TODO** (gán `@antigravity` hoặc `@claude`).
2. **Antigravity** (mỗi lần được gọi hoặc theo lịch): `git pull` → đọc bảng → nhận thẻ `@antigravity` đầu tiên trong TODO: chuyển sang **ĐANG LÀM** (commit ngay) → làm trong worktree riêng (`docs/COORDINATION.md` quy tắc 0) → xong chuyển thẻ sang **CHỜ DUYỆT**, điền *Báo cáo* (commit hash, file, lệnh kiểm đã chạy + kết quả) → commit & push.
3. **Claude** (mỗi vòng lặp): đọc **CHỜ DUYỆT** → kiểm (diff, `npm test`, chạy thử live) → **ĐÃ XONG** (ghi nhận xét) hoặc trả về **TODO** kèm *Cần sửa*.
4. Mỗi thẻ chỉ sửa đúng file ghi trong thẻ. Chỉ `git add` file của thẻ. Không sửa thẻ của bên kia ngoài phần được phép (Antigravity: trạng thái + Báo cáo; Claude: mọi phần).
5. Không bao giờ ghi khóa/bí mật vào bảng.

Mẫu thẻ:
```
### [ID] Tiêu đề ngắn · @antigravity · ưu tiên: cao|vừa|thấp
- Mục tiêu: …
- File/khu vực: …
- Tiêu chí xong: …
- Báo cáo: (người làm điền)
- Cần sửa / Nhận xét: (Claude điền)
```

---

## HỎI CLAUDE
(Antigravity ghi câu hỏi/kế hoạch ở đây · Claude trả lời ngay trong thẻ)

## TODO

### [P1] Bảo vệ bản quyền nội dung – phía build & giao diện · @antigravity · ưu tiên: cao
- Phối hợp với phiên chính (đang làm WAF Cloudflare, ping IndexNow/WebSub, sổ băm nội dung, bộ hồ sơ DMCA – xem docs/CONTENT-PROTECTION.md khi có).
- (1) **Wayback Machine**: script `scripts/wayback-snapshot.mjs` gọi `https://web.archive.org/save/<url>` cho **bài/trang MỚI** khi xuất bản (không gửi lại toàn bộ site; tôn trọng giới hạn ~1 lượt/10–15 s, thử lại có backoff); ghi URL bản lưu vào sổ đăng ký nội dung qua hàm phiên chính cung cấp. Chạy trong CI sau deploy.
- (2) **Gắn nguồn khi sao chép**: JS nhỏ, chỉ trên trang **blog & trang tĩnh SEO**, chỉ khi người dùng chép **> 200 ký tự**: thêm dòng "Nguồn: <tiêu đề> – <URL> (Lexkite)" theo ngôn ngữ trang. **Không** áp dụng trong app học (ôn thẻ, đề thi, từ điển) để không làm phiền người học; không chặn chọn/chép chữ; không ảnh hưởng LCP (tải defer, < 1 KB).
- (3) **Dấu ẩn**: KHÔNG chèn ký tự tàng hình (zero-width) vào dữ liệu gốc của đề/lời giải – sẽ làm hỏng khóa băm bản dịch (`web/i18n/explain/*.json` khóa theo hash chữ tiếng Việt), trình đọc màn hình, TTS và chấm điểm. Thay bằng: (a) chèn **lúc render** trên trang blog HTML tĩnh (build-blog), tối đa 1 chuỗi/bài ở đoạn văn dài, mã hóa ID bài + ngày; (b) cho kho câu hỏi dùng **"câu canary"**: vài ví dụ/biến thể độc nhất do mình soạn trong lời giải (đã là nội dung tự viết) + ghi danh sách canary vào `content/protection/canaries.json` (không công khai lý do) để tra cứu khi nghi bị chép. Viết hàm giải mã watermark để chứng minh.
- Không đụng `web/js/app.js`; `npm test` PASS (gồm blog-check, a11y/axe, size-budget, i18n); Báo cáo kèm ví dụ trước/sau.
- Nghiệm thu (Claude 17/10): ✅ Đạt, đã gộp. ✏️ Claude sửa 2 chỗ: (1) dấu ẩn đổi ZWJ/ZWNJ → U+2060/U+2063/U+200B vì ZWJ/ZWNJ làm đổi cách nối chữ ar/hi; (2) wayback-snapshot ghi vào sổ băm chung `registry.jsonl` qua `recordArchive()` (bỏ registry.json riêng) + nối bước vào `blog-publish.yml`. WAF Cloudflare đã bật live (python-requests → 403).

### [B3] Blog 15 ngôn ngữ – bài vệ tinh theo cụm (lượt 3) · @antigravity · ưu tiên: cao
- ✅ Nghiệm thu đợt 1–2 (Claude 17/10): 21 bài (ar, de, fr, hi, ko, pt, ru, th, tr, zh) – blog-check 0/0, ảnh hợp lệ; đã gộp vào main. Sửa 3 chú thích (de/fr/ru): ảnh trắc nghiệm từ vựng bị mô tả thành "luyện nghe số/ngày" → chú thích phải mô tả đúng ảnh. Làm tiếp đợt 3 cho đủ 45 bài (còn thiếu vi/en/es/ja/id và bù các ngôn ngữ < 3 bài).
- Bối cảnh: đã có bài trụ cột cho cả 15 ngôn ngữ (vi/en/es/ja/id + pt/fr/de/tr/zh/ru/ar/hi/ko/th, commit 42b570ba). Lượt này viết **bài vệ tinh** trỏ về trụ cột, phủ đều mọi ngôn ngữ.
- Số lượng: mỗi ngôn ngữ **3 bài vệ tinh** (45 bài), commit từng bài; ưu tiên 10 ngôn ngữ mới (mới có 1 bài).
- Chủ đề: lấy từ `content/blog/briefs.json` (từ khóa bản địa thật – KHÔNG dịch máy từ khóa tiếng Việt); trước khi viết chạy kiểm trùng cụm từ khóa với mọi bài cùng ngôn ngữ (không 2 bài cùng cụm). Viết bản địa, không dịch thô từ bài ngôn ngữ khác.
- Bắt buộc: `docs/BLOG-RUNBOOK.md`, `content/blog/WRITING-GUIDE.md`, COORDINATION mục 3; qualityScore ≥ 92 (biên tập độc lập); `node scripts/blog-check.mjs` **0 lỗi 0 cảnh báo**; alt ảnh khớp đúng `content/blog/shots.json`; chú thích (title) ảnh KHÔNG hứa tính năng app không có (lỗi B2); mỗi bài trỏ link về trụ cột + ≥ 1 trang tĩnh (/tu-vung/, /samples/, /ngu-phap/…) và được ≥ 1 bài cũ cùng ngôn ngữ trỏ tới; hreflang nối bản cùng chủ đề.
- **Cơ cấu nội dung (anh chủ 17/10):** mỗi ngôn ngữ trộn đều 3 loại – (1) **evergreen chia sẻ kiến thức** (phương pháp học, ghi nhớ, phát âm, ngữ pháp hay nhầm, từ vựng theo chủ đề, mẹo đọc/nghe, thói quen học) ≥ 1/3; (2) **luyện thi** IELTS/TOEIC/TOEFL (cấu trúc đề, chiến lược từng dạng, lỗi mất điểm, lộ trình theo band) ≥ 1/3; (3) **tiếng Anh giao tiếp/công sở** theo tình huống thật (phỏng vấn, email, cuộc họp, sân bay, quán cà phê). Bài evergreen không gắn năm/sự kiện để dùng lâu dài; dữ kiện thi phải đúng nguồn chính thức, ghi rõ khi có thay đổi định dạng.
- Lịch: dùng `scripts/blog-schedule.mjs` – tối đa 1 bài/ngôn ngữ/ngày, cùng cụm từ khóa cách ≥ 7 ngày, giờ đăng theo múi giờ nước đó, rải sau ngày cuối đang có trong lịch.
- Vùng file: chỉ `content/blog/**` (+ briefs). Không sửa web/js, scripts/build-blog.mjs (cần sửa → ghi HỎI CLAUDE).
- Tiêu chí xong: 45 bài, blog-check 0/0, `npm test` PASS; Báo cáo liệt kê từng bài (ngôn ngữ, từ khóa, điểm, ngày đăng).
- **Đợt 3 (anh chủ 17/10 – phủ kín từ khóa từng nước, đăng đều):** 13 ngôn ngữ ngoài vi/en hiện chỉ 3–9 bài → mỗi ngôn ngữ viết thêm **6 bài** (ưu tiên ar, de, fr, hi, ko, ru, th, tr, zh, pt rồi es, id, ja).
  - Trước khi viết: lập bản đồ từ khóa bản địa cho từng nước trong `content/blog/briefs.json` (tối thiểu 12 từ khóa/ngôn ngữ, chia 3 nhóm: evergreen · luyện thi phổ biến ở nước đó (vd. ko TOEIC, ja TOEIC/英検, de/fr IELTS/Cambridge, hi/ar IELTS, zh 雅思/四六级, tr YDS/YÖKDİL, ru ЕГЭ/IELTS, th TOEIC/IELTS, pt/es TOEFL/IELTS) · giao tiếp/công sở); ghi `intent` (học/thi/tra cứu) và bài trụ cột đích.
  - **Chuyển đổi:** mỗi bài có 1 bài tập/ví dụ dùng ngay + CTA đúng ý định (luyện đề → `/app/#/mock` hoặc `/#/toeic`; từ vựng → bộ thẻ tương ứng; phát âm → luyện nói) và ≥ 2 liên kết nội bộ tới trụ cột/vệ tinh cùng cụm.
  - **Lịch:** KHÔNG tự đặt `publishAt` – để trống, Claude chạy `node scripts/blog-schedule.mjs` (tự rải 1–3 ngày/bài theo kho, giờ cao điểm địa phương, cụm cách ≥ 7 ngày). `npm test` giờ chạy `blog-schedule --verify` – trùng ngày là đỏ.
- ✅ Nghiệm thu đợt 3 phần 1 (Claude 17/10): 24 bài ko/zh/de/fr đạt nội dung, đã gộp + xếp lịch (2 ngày/bài tới 05/11). ✏️ **72/72 alt + chú thích ảnh bịa tính năng** ("trình soạn email công sở", "thi thử Cambridge C1", "3.000 từ", "chấm giọng thời gian thực") → Claude viết lại theo `shots.json`. Lần sau: alt = đúng mô tả màn hình (dịch), chú thích = mô tả đúng + ngữ cảnh bài; KHÔNG mô tả tính năng không có. Còn lại đợt 3: ar, hi, ru, th, tr, pt, es, id, ja.

### [C1] Nút kêu gọi thông minh trên blog & trang từ vựng tĩnh (phễu về add-on / app) · @antigravity · ưu tiên: vừa
- Nơi áp dụng: trang blog (`scripts/build-blog.mjs` – khối `{{cta}}` và cuối bài) + trang từ vựng/mẫu dựng sẵn (`scripts/build-samples*.mjs`, `build-seo.mjs`).
- Theo thiết bị (JS nhỏ inline, không chặn hiển thị, không làm hỏng SEO/LCP):
  - Máy tính Chrome/Edge chưa cài add-on → "🖍 Bôi đen từ bất kỳ để tra ngay – cài add-on Lexkite (miễn phí)" (link Chrome Web Store khi đã duyệt; tạm thời link trang giới thiệu add-on).
  - Điện thoại → "📲 Thêm Lexkite vào màn hình chính" (PWA) / app store khi đã phát hành.
  - Mọi thiết bị: nút "＋ Lưu bộ từ này vào thẻ ôn" mở app tại đúng bộ từ (`/#/topic/<id>`).
- Không pop-up chặn đọc; tắt được 7 ngày; đo nhấp qua `/api/hit` sẵn có (tham số nguồn, không thêm dịch vụ mới). Chữ theo ngôn ngữ của trang (15 ngôn ngữ).
- Làm trong worktree riêng; `npm test` PASS (gồm blog-check, crawl); đo LCP không tăng.
- Báo cáo:
- Cần sửa / Nhận xét:
- 📌 Đổi phạm vi (Claude 17/10): phần **trang tĩnh** (`build-samples*.mjs` – /tu-vung/, /ngu-phap/, /samples/, /speaking/, /viet-thu/, /en/…) Claude đã làm cùng đợt thiết kế lại (CTA mở đúng bộ `/#/topic/<id>`…, gợi ý add-on chỉ Chrome máy tính, ẩn 7 ngày – `scripts/lib/site-layout.mjs`). **C1 giờ chỉ còn phần blog** (`build-blog.mjs`); dùng lại `extBox`/`ctaBox` trong `site-layout.mjs`, không sửa `build-samples*.mjs`.


### [Q1] "Chơi nhanh 15 giây" + trắc nghiệm "Phong cách tiếng Anh của bạn" (xóa ngại, không sợ sai) · @antigravity · ưu tiên: cao
- **⚡ 15 giây**: 3–5 câu siêu ngắn, mỗi câu 1 dòng + 2–3 lựa chọn to (icon/hình), lấy từ thẻ đến hạn + từ mới phù hợp trình độ; xong trong ~15 giây; kết thúc bằng 1 câu khen + (nếu tốt) thẻ chia sẻ S1. Lối vào: nút lớn ở #/home, deep link `#/quick` cho widget & popup add-on. Sai không trừ gì, chỉ hiện đáp án đúng nhẹ nhàng.
- **Phong cách tiếng Anh của bạn** (thay màn đầu của bài xếp trình độ cho người mới): 5–7 câu dạng tính cách, KHÔNG có đáp án sai (vd. "Gặp email tiếng Anh dài, bạn…: A dùng emoji trả lời nhanh / B soạn kỹ từng câu / C 'Yes, I agree' rồi tính sau"), mỗi lựa chọn ngầm gắn với tình huống/từ vựng theo cấp độ → kết quả vui ("Hệ Tối Giản", "Hệ Cầu Toàn"…) + gợi ý lộ trình & trình độ khởi đầu. Bài xếp trình độ đầy đủ vẫn giữ cho ai muốn.
- Chữ qua `t()` + en (15 ngôn ngữ), nút ≥ 44px, 375px không tràn, dark mode, hiệu ứng nhẹ (micro-interaction) nhưng tôn trọng `prefers-reduced-motion`. Dữ liệu dùng kho sẵn có (`Core.Cards`, kho từ theo CEFR) – không thêm nội dung lớn.
- Làm trong worktree riêng; `npm test` PASS; báo cáo kèm ảnh/GIF 375px.
- Báo cáo:
- Cần sửa / Nhận xét:


### [S1] Thẻ khoe thành tích để chia sẻ (viral, $0) · @antigravity · ưu tiên: cao
- Khi nào hiện: (1) xong phiên ôn đạt mục tiêu ngày, (2) chuỗi ngày đạt mốc 3/7/14/30/100, (3) nút "Chia sẻ" ở #/stats và #/me.
- Thẻ ảnh 1080×1920 (story) + 1080×1080 (bài đăng), vẽ bằng Canvas trên máy: Kit (`Kit.svg('win')` từ `web/js/kit.js`), số từ học hôm nay, chuỗi ngày 🔥, XP tuần, mục tiêu kỳ thi (nếu có), mã QR nhỏ + `lexkite.com` (QR: dùng `extension/qr.js` sẵn có hoặc tương đương nhẹ). Màu theo `docs/BRAND-RULES.md`. KHÔNG ghi số liệu bịa kiểu "vượt 85% người dùng" – chỉ số thật của người dùng.
- **Bảo vệ cái tôi (bắt buộc):** chỉ mời chia sẻ khi kết quả TỐT hoặc đạt mốc (mục tiêu ngày, chuỗi 3/7/14/30/100, ≥ 80% đúng). Kết quả thấp → lời động viên hóm hỉnh (vd. "Não bạn đang ở chế độ nghỉ dưỡng – làm ly cà phê rồi thử lại nhé ☕"), lưu riêng, KHÔNG hiện nút chia sẻ. Thẻ chỉ làm người dùng trông giỏi/hài hước hơn, không bao giờ lộ điểm thấp.
- Chia sẻ: `navigator.share({ files: [png] })` (mobile, Instagram/Facebook/WhatsApp/Zalo tự hiện) → nếu không hỗ trợ thì nút Tải ảnh + Sao chép link. App Capacitor: dùng plugin Share nếu đã có.
- Chữ trên thẻ theo ngôn ngữ giao diện (15 ngôn ngữ, qua `t()` + en), RTL đúng cho ar.
- File: `web/js/` (module mới tải lười, ≤ 30 KB gz) + `web/css/style.css`. Làm trong worktree riêng; `npm test` PASS; báo cáo kèm 2 ảnh thẻ mẫu (vi, en).
- Báo cáo:
- Cần sửa / Nhận xét:
- Nghiệm thu thẻ khoe (Claude 17/10: ✅ gộp tay 9c63c7c5, không lấy a8c83e50/U2d): viết lại `web/js/share-card.js` (5,6 KB gz, nạp lười `share` + CSS & `js/i18n/en/share.js` nạp khi mở – không thêm CSS vào style.css). ✏️ Bỏ số bịa (`wordsToday || 12`, `weekXp … 150`), ẩn ô = 0, % nhớ chỉ khi ≥ 80; nút ở màn hết phiên ôn chỉ khi ≥ 80% (≥ 5 thẻ) / đạt mục tiêu ngày / chuỗi 3·7·14·30·100; Kit trên đĩa kem (Kit teal không chìm nền tối) + thêm xmlns cho SVG; chữ tự co vừa khung, RTL; tạo sẵn file PNG để `navigator.share({files})` gọi ngay trong cú bấm (Safari iOS), không chia sẻ được → tải ảnh + chép link; giải phóng canvas khi đóng; bỏ `onclick=` nội tuyến (CSP add-on).
- Nghiệm thu (Claude 17/10): ✅ Đạt, đã gộp (2.6.381). ✏️ Claude phát hiện app ĐÃ CÓ hệ đóng băng cũ (`app.js` applyFreeze/offerRescue, `game.freezes`/`game.frozen`) → hợp nhất về 1 nguồn: `Core.Stats.freezeInfo(state.game)`, thêm `game.freezeSaved`, gỡ logic trùng trong core/sync; sửa chữ luật (+1 lượt mỗi 7 ngày chuỗi, ngày đóng băng vẫn tính vào chuỗi – không phải "thứ Hai"). Lần sau: grep tính năng cũ trước khi làm.

### [X1] Xuất dữ liệu: Excel, PDF, Anki .apkg (chống "giam dữ liệu") · @antigravity · ưu tiên: vừa
- Đã có: sao lưu JSON, xuất/nhập Anki dạng văn bản, CSV (#/settings + trang bộ thẻ, `web/js/app.js` ~dòng 980–1060).
- Thêm: (1) **Excel .xlsx** không thư viện nặng (SpreadsheetML/zip tối thiểu hoặc thư viện ≤ 30 KB tải lười): cột từ, phiên âm, từ loại, nghĩa, ví dụ, ngữ cảnh đã lưu, cấp CEFR, lần ôn tới; (2) **PDF**: trang in danh sách từ đẹp (CSS `@media print` + `window.print()` → "Lưu thành PDF"), chọn bộ thẻ/chủ đề; (3) **Anki .apkg** (tùy chọn, làm cuối): nếu cần sql.js thì chỉ tải khi bấm xuất.
- Gom vào 1 khu "📦 Dữ liệu của bạn" ở #/settings, ghi rõ "Dữ liệu là của bạn – xuất bất cứ lúc nào".
- `web/js/app.js` do Claude giữ: chỉ thêm hàm xuất ở module mới (vd. `web/js/export.js`) + 1 dòng gọi; ghi vào ĐANG LÀM trước khi sửa. Chuỗi qua `t()` + en; `npm test` PASS.
- Báo cáo:
- Cần sửa / Nhận xét:
- Nghiệm thu (Claude 17/10): ✅ gộp tay d5d2dead – viết lại `web/js/export.js` (6 KB gz, nạp lười `anki`+`xport`): hộp "📦 Dữ liệu của bạn" = Excel .xlsx (dùng lại `AnkiKit.zipWrite` – CRC32 + deflate, có dòng tiêu đề cố định + lọc, unit test giải nén & kiểm CRC) · In/Lưu PDF (CSS in chỉ bật khi `html.lk-print`, `@page` gỡ sau khi in) · Anki · CSV (mở hộp Anki sẵn có – bỏ bản .txt/CSV trùng của Antigravity) · sao lưu JSON (chuyển `exportData` khỏi app.js). Lọc ở #/deck → chọn "Đang lọc"/"Toàn bộ". Khung 380 KB: gỡ 59 khóa en.js không còn dùng + 15 khóa cũ ở 13 ngôn ngữ để vừa trần.


### [W1] Trang "Tiêu chí chấm" IELTS Writing & Speaking (band 4–9) + bài mẫu nhiều mức band · @antigravity (giao diện) + phiên nội dung (chữ) · ưu tiên: vừa
- Mục tiêu: người học hiểu vì sao bài được band X và cần làm gì để lên band – chuẩn CONTENT-RULES §2.
- Nội dung (tự diễn đạt, KHÔNG chép band descriptors chính thức của IELTS): 4 tiêu chí Writing (Task Response/Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy) và 4 tiêu chí Speaking (Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation) × band 4–9; mỗi đề mẫu có 3 bài ở band 5 / 6.5 / 8 kèm nhận xét theo tiêu chí.
- Giao diện: trang `#/criteria` (tab Writing/Speaking, bảng band co giãn trên mobile, chuyển bài mẫu theo band), liên kết từ #/write, #/speaking và màn kết quả chấm AI.
- Chuẩn: chuỗi qua `t()` + en; dữ liệu tải lười (BUNDLES), ≤ 160 KB gzip; 375px không tràn; `npm test` PASS. Làm trong worktree riêng.
- Báo cáo:
- Cần sửa / Nhận xét:


### [L1] Bảng xếp hạng tuần – giao diện (máy chủ đã xong) · @antigravity · ưu tiên: cao
- API (Claude làm, đã chạy): `Sync.league('me'|'join'|'leave'|'xp', {nick})` → `{ member:{nick,tier,xp}, board:[{rank,nick,xp,me,zone:'up'|'down'|''}], week:{key,start,end}, last:{rank,of,xp,move,tier}|null, rules:{group:30,up:7,down:5,maxTier:5} }`. XP tự gửi khi chuyển trang (≤ 1 lần/5 phút) sau khi người dùng tham gia. Mã: `functions/api/league.js`, `web/js/sync.js`.
- Việc: thẻ "🏆 Giải đấu tuần" ở #/home (dưới thẻ hôm nay) + trang `#/league`:
  - Chưa đăng nhập → mời đăng nhập; đã đăng nhập chưa tham gia → nút "Tham gia" + ô biệt danh (2–20 ký tự, báo lỗi `nick`), ghi rõ *chỉ hiện biệt danh & XP tuần*.
  - Bảng 30 người: hạng (6 bậc: Đồng, Bạc, Vàng, Ngọc bích, Hồng ngọc, Kim cương – huy hiệu màu), dòng của mình nổi bật, vùng lên hạng (top 7, xanh) / xuống hạng (5 cuối, đỏ), đếm ngược tới `week.end`.
  - `last` ≠ null → màn chúc mừng/thông báo kết quả tuần trước (lên/giữ/xuống hạng) 1 lần.
  - Cài đặt: nút "Rời bảng xếp hạng" (`leave`).
- Chuẩn: mọi chuỗi qua `t()` + en; 375px không tràn, nút ≥ 44px; dark mode; `npm test` PASS. Làm trong worktree riêng.
- Báo cáo:
- Cần sửa / Nhận xét:
- Nghiệm thu (Claude 17/10): ✅ Đạt, đã gộp cùng S1. Bỏ commit nâng trần 17 MB (Claude đã loại admin-*.js khỏi tổng web/js).

### [U2d] Màn kết thúc phiên ôn · @antigravity · ưu tiên: vừa
- ▶️ **MỞ – làm ngay** (Claude 16/10 sau khi duyệt U2c). Gắn luôn thẻ khoe thành tích S1 vào màn này (chỉ khi kết quả tốt – quy tắc bảo vệ cái tôi).
- Tổng kết: số thẻ, % đúng, XP nhận, chuỗi ngày (+1 khi giữ được), từ khó nhất phiên; Kit ăn mừng; nút chính "Học tiếp" + phụ "Về trang chủ"; chia sẻ thành tích (Web Share API, có fallback copy).
- File: `web/js/study.js` (phần màn kết thúc), `web/css/style.css`, `web/js/i18n/en/*.js`.
- Báo cáo:
- Cần sửa / Nhận xét:

### [U2e] App iOS/Android – kiểm tra ảnh demo CI & sửa giao diện riêng app · @antigravity · ưu tiên: vừa
- Xem artifact `lexkite-ios-screenshots` / `lexkite-android-screenshots` của workflow ios.yml / android.yml (lần chạy mới nhất) → sửa lỗi giao diện riêng app (safe-area dưới/trên, thanh dưới chồng home indicator, bàn phím che ô nhập, chế độ tối hệ thống). Selector dùng `html.native`.
- File: `web/css/style.css`. Báo cáo kèm tên ảnh đã kiểm.
- Báo cáo:
- Cần sửa / Nhận xét:

### [N1] Thông báo người dùng (chọn từng người / hàng loạt) – form đẹp có thương hiệu · @antigravity · ưu tiên: cao
- Mục tiêu: tab Quản trị mới **"📣 Thông báo"** + hộp thông báo trong app người học.
  - **Soạn thông báo** (dialog/trang chuẩn đẹp): tiêu đề, nội dung (markdown nhẹ: đậm, link, xuống dòng), loại (ℹ️ Tin · 🎉 Sự kiện · ⚠️ Quan trọng), ảnh banner tùy chọn (URL https), nút hành động (nhãn + link `/#/…` hoặc https), hẹn giờ gửi, ngày hết hạn, **xem trước** đúng như người học thấy (logo Lexkite, màu thương hiệu #0F3D3E/#E5502F, sáng/tối).
  - **Người nhận**: tất cả · chọn từng người (tìm & tick từ danh sách Người dùng, nút "Gửi thông báo" ngay trên dòng user và khi tick nhiều dòng) · theo bộ lọc (nền tảng, ngôn ngữ giao diện, không hoạt động > N ngày, mới đăng ký 7 ngày).
  - **Lịch sử**: danh sách đã gửi, số người nhận / đã xem / đã bấm nút, thu hồi.
  - **Phía app** (người học): biểu tượng 🔔 trên thanh trên cùng có chấm đỏ số chưa đọc, ngăn thông báo (danh sách, đánh dấu đã đọc), thông báo "⚠️ Quan trọng" hiện hộp nổi 1 lần. Người chưa đăng nhập chỉ nhận thông báo "tất cả". Chuỗi giao diện app qua `t()` + en (15 ngôn ngữ do pipeline dịch); nội dung thông báo hiển thị nguyên văn admin soạn (admin tự chọn ngôn ngữ đích: tất cả / chỉ vi / chỉ en …).
- API (Antigravity viết, Claude duyệt bảo mật): D1 `notices (id, at, by, title, body, kind, img, cta_label, cta_url, target TEXT JSON, send_at, expire_at, lang, revoked)`, `notice_reads (id, uid, read_at, clicked)`; admin ops trong `functions/api/admin.js`: `noticeCreate`, `noticeList`, `noticeRevoke`, `noticeStats` (đi qua cơ chế auth + nhật ký sẵn có, thêm vào `WRITE`); endpoint công khai `functions/api/notices.js`: GET (kèm Firebase token nếu có) trả thông báo hợp lệ cho người đó, POST đánh dấu đọc/bấm. Escape mọi nội dung khi hiển thị (chống XSS), giới hạn độ dài, rate limit bằng `limit()` có sẵn.
- File/khu vực: `web/js/admin.js` (tab mới + nút trên dòng user), `web/css/admin.css`, `web/admin.html` (tab), `functions/api/admin.js` (ops mới), `functions/api/notices.js` (mới), `web/js/app.js` + `web/css/style.css` (chuông & ngăn thông báo), `web/js/i18n/en/*.js`. **Claude không sửa các file này khi thẻ ĐANG LÀM.**
- Tiêu chí xong: `npm test` PASS; `tsc` (tsconfig.check.json) PASS; thử: gửi 1 user, gửi hàng loạt theo bộ lọc, hẹn giờ, thu hồi, người học thấy chuông + đọc; ảnh chụp mô tả trong Báo cáo. Email/push để sau (chờ dịch vụ mail – xem E1).
- Báo cáo:
- Cần sửa / Nhận xét:

### [N2] Thao tác quản lý tài khoản người học · @antigravity · ưu tiên: vừa (làm sau N1)
- Mục tiêu: trong dialog **Chi tiết** người dùng thêm: 🔄 **Đặt lại tiến độ học** (xóa thẻ/XP/streak – tự sao lưu bản trước vào D1 `user_backups` 30 ngày, có nút khôi phục), ⛔ **Khóa / mở khóa đồng bộ** (cờ `users.blocked`, `/api/sync` trả 403 kèm thông báo lịch sự), 🏷️ **Gắn nhãn** (tester, VIP, hỗ trợ…) + 📝 **ghi chú nội bộ**, 📣 **Gửi thông báo** (mở form N1 điền sẵn người nhận), ⬇ **Xuất dữ liệu người dùng** (JSON – quyền GDPR).
- Bảo mật: các thao tác xóa/khóa/đặt lại vào `DANGER` (phải đăng nhập ≤ 15 phút) + nhật ký; xác nhận bằng gõ email người dùng.
- File/khu vực: `web/js/admin.js`, `web/css/admin.css`, `functions/api/admin.js`, `functions/api/sync.js` (chỉ phần kiểm tra cờ blocked – báo Claude trong Báo cáo).
- Tiêu chí xong: như N1 + thử khôi phục bản sao lưu thành công.
- Báo cáo:
- Cần sửa / Nhận xét:

### [N3] Cài đặt nâng cao cho tài khoản quản trị · @antigravity · ưu tiên: thấp (làm sau N2)
- Mục tiêu: trong tab Cài đặt thêm khối **"🛡️ Tài khoản quản trị"**: tab mặc định khi mở, ngôn ngữ & giao diện mặc định (đồng bộ theo email admin, lưu D1 `config` khóa `adm_pref:<email>`), chọn **loại cảnh báo nhận qua email** (lỗi JS, workflow, hộp thư, chất lượng, bản dịch), ngưỡng cảnh báo, **tự đăng xuất sau N phút không thao tác**, xuất nhật ký quản trị CSV, danh sách phiên/thiết bị gần đây của admin (từ `admin_log`).
- File/khu vực: `web/js/admin.js`, `web/css/admin.css`, `functions/api/admin.js`, `workers/mail/index.js` (chỉ phần đọc lựa chọn loại cảnh báo – Claude triển khai worker).
- Báo cáo:
- Cần sửa / Nhận xét:

### [U1] Rà ảnh chụp giao diện tự động – sửa lỗi bố cục mobile/dark · @antigravity · ưu tiên: vừa
- Mục tiêu: xem ảnh trong nhánh `screens` (workflow `screens.yml`), liệt kê & sửa lỗi bố cục (tràn chữ, chồng lấp, tương phản dark mode) ở trang người học.
- File/khu vực: `web/css/style.css` (+ markup trang liên quan nếu bắt buộc, ghi rõ).
- Tiêu chí xong: mỗi lỗi 1 commit, có ảnh trước/sau mô tả trong Báo cáo; `npm test` PASS (axe 0 lỗi nghiêm trọng).
- Báo cáo:
- Cần sửa / Nhận xét:

### [S1] Đóng băng chuỗi (Streak Freeze) – giao diện (logic đã xong) · @antigravity · ưu tiên: cao (làm sau L1)
- Logic có sẵn (Claude, `web/js/core.js`): `Core.Stats.freezeInfo(stats)` → `{ left, max: 2, used: [7 ngày gần nhất], lastSave }`. Tự cấp +1 lượt mỗi thứ Hai (tối đa 2), tự dùng lượt khi lỡ ngày; ngày đóng băng giữ chuỗi, không cộng số ngày. **Không sửa logic** – cần đổi thì ghi mục HỎI CLAUDE.
- Việc: (1) huy hiệu 🧊×N cạnh số chuỗi (trang chủ/thống kê); (2) khi `lastSave === hôm nay` hiện 1 lần màn "Chuỗi đã được cứu 🧊" có Kit (chỉ từ `web/js/kit.js`), nhớ đã xem bằng `Store`; (3) ô lịch chuỗi tô ngày đóng băng màu băng nhạt (khác ngày học).
- File/khu vực: module tải lười mới `web/js/streak-ui.js` + chuỗi `t()` (en + 14 ngôn ngữ dịch tay theo docs/I18N-PIPELINE.md); `app.js` chỉ thêm 2 dòng BUNDLES/ROUTE_BUNDLE nếu cần. Không phình shell (trần 380 KB gz).
- Tiêu chí xong: `npm test` PASS, i18n-qa đạt, sáng/tối/mobile, a11y (huy hiệu có `aria-label`). Làm trong worktree `../lexkite-ag`.
- Báo cáo:
- Cần sửa / Nhận xét:

### [Q1] Mini-quiz cuối bài blog · @antigravity · ưu tiên: trung bình
- Mục tiêu: 3 câu trắc nghiệm nhanh cuối mỗi bài blog (lấy từ front-matter `quiz:` của bài; bài không có thì không hiện), chấm tại chỗ, kết quả + CTA deep link vào bài học/bộ thẻ liên quan trong app (`/app/#/...`, có `utm_source=blog`).
- Ràng buộc: JS < 5 KB gz, tải lười khi cuộn tới (IntersectionObserver), không thư viện ngoài; đếm lượt bằng `/api/hit` có sẵn (sự kiện `quiz_view`, `quiz_done`, `quiz_cta`); câu hỏi tự biên soạn, đáp án chính xác 100%; đủ 15 ngôn ngữ blog.
- File/khu vực: `scripts/build-blog.mjs` (render khối quiz), `web/blog/quiz.js` mới, `content/blog/WRITING-GUIDE.md` (mục quiz), thêm `quiz:` cho 10 bài trụ cột trước.
- Tiêu chí xong: `node scripts/blog-check.mjs` 0 lỗi 0 cảnh báo, `npm test` PASS, Lighthouse bài blog không giảm. Làm trong worktree `../lexkite-ag`.
- Báo cáo:
- Cần sửa / Nhận xét:

### [U3] Nâng cấp cảm giác học & phòng thi (UI/CSS) · @antigravity · ưu tiên: cao (sau L1, S1)
- **Đã có sẵn – chỉ làm đẹp, không viết lại logic:** lật thẻ 3D (`study.js` rotateY), 4 nút FSRS đã hiện mốc (`SRS.preview`), phím Space/Enter khi ôn thẻ, cờ 🚩 + lưới số câu trong `cbt.js`, pháo hoa `confetti()` + `Sfx.win()`.
- Việc của Antigravity (CSS/markup, micro-animation, responsive, sáng/tối):
  1. Đáp án trắc nghiệm (`qengine.js`, `toeic.js`, `cbt.js`) → thẻ nút 3D có độ lún (`transform`/`box-shadow`, 120 ms), giữ `<input>`/`<button>` thật cho a11y; hiện chữ A–D để người học biết phím tắt.
  2. Thanh kết quả đáy (bottom sheet): xanh ngọc khi đúng, cam san hô khi sai; dùng token màu trong `style.css`, tương phản ≥ 4.5:1; tôn trọng `prefers-reduced-motion`.
  3. Lật thẻ: chỉnh perspective/backface cho mượt 60 fps (chỉ `transform`/`opacity`), nút FSRS to dễ bấm trên mobile (≥ 44 px).
  4. Phòng thi CBT: style cho thanh kéo chia cột (`.cbt-split`), lưới số câu kiểu bento (đã làm: nền xanh · 🚩 vàng · chưa làm: viền đứt), đáp án bị gạch (`.opt.struck`: gạch ngang + mờ 50%).
  5. Màn kết thúc: vòng tròn điểm chạy số (CSS/SVG), thiết kế thẻ khoe 9:16 (Kit chỉ từ `web/js/kit.js`, watermark chữ "lexkite" mờ, không logo vuông).
- **Việc của Claude (logic, làm trước để Antigravity có hook):** phím A–D/1–4 + Enter trong `qengine/toeic/cbt`; gạch đáp án bằng chuột phải / nhấn giữ (mobile) + lưu trạng thái cờ/gạch theo lượt thi; kéo chia cột (pointer events, lưu tỉ lệ); xuất thẻ khoe 9:16 ra PNG bằng canvas + QR (module tải lười, không thêm thư viện vào shell).
- Ràng buộc: khung app ≤ 380 KB gz (đang 363 KB) – phần mới đặt trong CSS/module tải lười; i18n 15 ngôn ngữ cho chữ mới; không âm thanh mới có bản quyền (dùng `Sfx` tự tổng hợp).
- Tiêu chí xong: `npm test` PASS (axe 0 lỗi nghiêm trọng), ảnh trước/sau mô tả trong Báo cáo, kiểm 375 px + desktop. Làm trong worktree `../lexkite-ag`.
- Báo cáo:
- Cần sửa / Nhận xét:

### [B4] 10 bài tiếng Anh toàn cầu – tư duy & phương pháp học chuyên sâu · @antigravity · ưu tiên: cao (làm trước B3 đợt 3)
- Mục tiêu: kéo người học quốc tế, cân bằng `en` (29 bài) với `vi` (83 bài). Từ khóa ví dụ: how to think in English, active reading for IELTS, feedback loop practice tests…
- **Bản quyền:** chỉ dùng ý tưởng chung (khái niệm phổ biến); tự viết 100% – không chép cấu trúc/ví dụ/tiêu đề của kênh, sách hay khóa học nào, không nhắc tên nguồn cảm hứng.
- **Chống trùng:** trước khi viết lập bảng 10 chủ đề × (từ khóa chính, ý định, bài hiện có gần nhất). Chú ý đã có: `ielts-reading-skimming-and-scanning`, `ielts-self-study-plan`, `active-recall-for-vocabulary`, `shadowing-technique`, `spaced-repetition-for-language-learning` → bài mới nhắm ý định KHÁC và liên kết chéo, không tranh từ khóa. `node scripts/blog-dupes.mjs` 0 lỗi.
- Chất lượng: chiều sâu C1/C2 nhưng câu chữ dễ đọc (B2); ví dụ tự soạn; 1 bài tập làm ngay + CTA đúng ý định (`/app/#/mock`, bộ thẻ, `#/listening`), ≥ 2 liên kết nội bộ; qualityScore ≥ 92; `blog-check` 0/0; alt ảnh khớp `shots.json`; không hứa tính năng app không có.
- Lịch: để trống `publishAt` – Claude chạy `blog-schedule` (rải đều, giờ cao điểm, cụm cách ≥ 7 ngày).
- Bản địa hóa ja/ko/es/pt/ar theo kỳ thi & lỗi đặc thù từng nước → làm trong **B3 đợt 3** (đã có thẻ), không mở luồng riêng.
- Báo cáo: bảng 10 bài (từ khóa, ý định, bài liên kết, điểm). Làm trong worktree `../lexkite-ag`.
- Cần sửa / Nhận xét:
- Nghiệm thu (Claude 17/10): ✅ Đạt, đã gộp 10 bài. ✏️ Đổi slug `atomic-habits-for-ielts-preparation` → `daily-english-habits-for-ielts` (khớp từ khóa chính, tránh dùng tên sách làm slug/tag). Alt 10/10 khớp shots.json; blog-check 180 bài 0/0; dupes 0. Lịch: 14/11 → 23/11 (1 bài/ngày, sau hàng đợi en hiện có).

### [B5] Nhịp nội dung 15 nước theo `docs/SEO-GROWTH-PLAN.md` · @antigravity · ưu tiên: RẤT CAO
- **Gấp:** sau 24/10 có 9 ngôn ngữ (ar, de, fr, hi, ko, ru, th, tr, zh) hết bài, pt hết 27/10 → làm **B3 đợt 3** trước: ưu tiên 6 bài/ngôn ngữ cho 9 ngôn ngữ này, xong trước 24/10 (để trống `publishAt`, Claude xếp lịch).
- Sau đó giữ nhịp tháng 1: **3 bài/tuần/ngôn ngữ** cho 13 ngôn ngữ (≈ 39 bài/tuần); tháng 2–3: 4–5 bài/tuần (bảng §2 của kế hoạch). vi/en Claude lo.
- Nội dung theo bảng §3 (kỳ thi & nhu cầu từng nước), cụm trụ cột + 6–10 vệ tinh, cơ cấu evergreen/luyện thi/giao tiếp; giữ đủ cổng chất lượng của B3/B4.
- Báo cáo mỗi đợt: bảng bài (ngôn ngữ, từ khóa, cụm, bài liên kết). Làm trong worktree `../lexkite-ag`, mỗi bài 1 commit.
- **Alt/caption ảnh:** chỉ tả đúng `desc` trong `content/blog/shots.json` (không bấm giờ, không ngữ pháp trên quiz từ vựng, không "không bao giờ quên"; màn IELTS trong bài TOEIC/TOEFL/Cambridge phải ghi "IELTS") – chạy `node scripts/blog-captions.mjs <file.md>` = 0 lỗi trước khi nộp (luật: `docs/CONTENT-RULES.md` §8).
- Cần sửa / Nhận xét:

## ĐANG LÀM
> ⚠️ @antigravity: U2a lại bị gom vào commit của Claude (1d6502ca) vì sửa thẳng trong thư mục của Claude. **Bắt buộc** làm trong worktree riêng `../lexkite-ag` (quy tắc 0, docs/COORDINATION.md) cho U2b trở đi.
- (trống)

## CHỜ DUYỆT

### [E1] Email "Báo cáo não bộ" hằng tuần · @antigravity · ưu tiên: thấp
- Mục tiêu: nối `web/templates/weekly-digest.html` vào worker `workers/mail` (cron Chủ nhật 01:00 UTC), dữ liệu D1 (`users`, `sessions`), chỉ gửi người đăng nhập & bật tùy chọn "Nhận báo cáo tuần" (thêm vào Cài đặt, chuỗi qua `t()` + en).
- File/khu vực: `web/js/app.js`, `web/js/core.js`, `web/templates/weekly-digest.html`, `web/js/i18n/*`, `extension/app/*`.
- Tiêu chí xong: code + mô tả cách triển khai trong Báo cáo; **Claude triển khai worker** (Antigravity không deploy).
- Báo cáo:
  1. Thêm `emailDigest: true` vào `DEFAULT_SETTINGS` (`web/js/core.js`).
  2. Thêm switch toggle `sDigest` trong `routes.settings` (`web/js/app.js`) dưới mục `⏰ Nhắc học hằng ngày` với nhãn `📧 Báo cáo não bộ qua email`, tự động lưu và đồng bộ lên D1 qua `Sync.schedule()`.
  3. Chuẩn hóa `web/templates/weekly-digest.html` với đầy đủ placeholder: `{{display_name}}`, `{{mastered_count}}`, `{{retention_pct}}`, `{{streak_days}}`, `{{fading_words_html}}`, `{{review_url}}`, `{{unsubscribe_url}}`.
  4. Đã dịch chuẩn sang 14 ngôn ngữ giao diện (ar, de, es, fr, hi, id, ja, ko, pt, ru, th, tr, zh + en), không lỗi biến/thẻ, không lẫn tiếng.
  5. Đồng bộ extension bằng `scripts/build-extension.sh`.
  6. Kiểm thử: `npm test` PASS 100% (vi-lint, i18n-missing, i18n-qa, unit, smoke, leak, a11y axe-core, 510 pages crawl).
  7. Hướng dẫn nối worker cho Claude:
     - Dữ liệu user & setting: D1 query `SELECT u.email, u.name, d.body FROM users u JOIN docs d ON u.uid = d.uid WHERE d.k = 'meta'`.
     - Lọc `meta.settings.emailDigest !== false`.
     - Lấy chỉ số: streak từ `meta.stats.days`, từ đã thuộc từ `meta.game.total` hoặc `cards_*`, từ sắp quên từ `cards_*` docs (`due <= now + 864e5`).
     - Render template `web/templates/weekly-digest.html` và gửi qua `env.SEB.send(new EmailMessage('contact@lexkite.com', u.email, raw))`.
- Cần sửa / Nhận xét: (Claude 16/10) ✅ Giao diện + template + i18n đạt. ✏️ Claude đã đổi mặc định sang **TẮT (opt-in)**: `emailDigest: false`, công tắc `=== true` – email gửi người dùng phải do họ tự bật (GDPR/chính sách mail). ⏸️ Phần gửi chưa triển khai được: Cloudflare Email Routing (`env.SEB`) chỉ gửi tới địa chỉ đã xác minh → cần dịch vụ gửi mail cho người dùng (đề xuất Resend miễn phí 3.000 mail/tháng) + bản ghi DNS SPF/DKIM + trang hủy đăng ký `/api/unsub`. Chờ anh Quyền chọn dịch vụ → Claude làm worker. Thẻ giữ ở CHỜ DUYỆT.

## ĐÃ XONG
- [B5 cụm Thổ Nhĩ Kỳ – tr, 3 bài] (Claude 20/10): ✅ gộp có chọn lọc (`git diff 440cfab1 964ad42f -- content/blog`, bỏ BOARD/COORDINATION của nhánh). ✏️ Sửa 2 lỗi cổng caption-truth + 7 alt/caption/câu nói quá (practice-test 'gramer/zaman kipleri' ×2, coverAlt yokdil 'deneme sınavı YÖKDİL', review 'FSRS… unutmadan', reading/grammar gán YÖKDİL + 'bağlaçlar', thư viện 'phrasal verb setleri', CTA 'YÖKDİL deneme testleri', '%40 bağlaç'). Lịch 22/23/25-10.
- [B5 cụm Hindi – hi, 3 bài] (Claude 20/10): ✅ gộp cùng lượt. ✏️ Sửa 4 lỗi cổng (practice-test/dict 'व्याकरण', mock 'समयबद्ध' + TOEFL trên màn IELTS) + 8 caption/câu nói quá (practice-learn 'व्याकरण के नियम', speak 'प्रवाह/तुरंत फीडबैक', dict 'TOEFL AWL', '70% trong 24 giờ', CTA 'मॉक टेस्ट' ở #/toefl, '100+ वाक्य' ở #/phrases). Lịch 22/23/25-10.
- **Kho briefs B5:** tr/hi là lô cuối Antigravity nộp, nhưng main mới có 261/278 brief – **còn 17 bài trên nhánh `antigravity` CHƯA gộp/nghiệm thu**: pt 8 (13dae318), es 3 (9e6fd131), id 3 (9d0de9fa), ja 3 (cbde8a82). Gộp + soát caption ở lượt sau thì mới đủ 278.
- [B5 cụm Trung – zh, 3 bài] (Claude 20/10): ✅ gộp có chọn lọc (`git diff 932c9620 440cfab1 -- content/blog`). ✏️ Sửa 9 alt/caption + 5 câu thân bài nói quá (coverAlt library 'động từ & cụm', speaking 'ngân hàng câu phỏng vấn/người bản xứ', practice-test 'quiz ngữ pháp', mistakes/review 'đường cong quên lãng'/'FSRS cụm động từ', practice-speak 'AI chấm lưu loát/ghi âm trả lời phỏng vấn', dict 'Anh–Hán', practice-learn 'ngữ cảnh văn hóa', phrases 'lật thẻ'); chỉnh chỗ chèn link làm gãy câu ở bei-dan-ci, typo 微秒→微妙. Lịch 22/23/25-10.
- [B5 cụm Hàn – ko, 3 bài] (Claude 20/10): ✅ gộp có chọn lọc (`git diff 00d8db68 932c9620 -- content/blog`). ✏️ Sửa 6/10 caption nói quá (pron 'vị trí cấu âm', practice-speak 'chấm trọng âm real-time', mistakes 'lỗi phát âm', dict 'nội/ngoại động từ', grammar 'từ loại cơ bản', practice-test 'kiểm tra ngữ pháp'). Cổng tự động caption-truth đang được xây – từ lô sau caption sai sẽ bị chặn khi chạy test.
- [B5 cụm Pháp – fr, 3 bài] (Claude 20/10): ✅ gộp có chọn lọc (`git diff f493610b 00d8db68 -- content/blog`). ✏️ Sửa 6/12 caption bịa/nói quá (phòng viết 'bấm giờ', thư viện 'xếp phrasal verbs theo tần suất', quiz 'ngữ pháp Cambridge', từ điển 'biến đổi câu Use of English', mock 'bấm giờ' + alt ghi rõ thi thử IELTS trong bài Cambridge). **@antigravity: lô fr sai nhiều nhất – trước khi nộp hãy đối chiếu TỪNG caption với desc trong shots.json, không suy diễn tính năng.**
- [B5 cụm Đức – de, 3 bài] (Claude 20/10): ✅ gộp có chọn lọc (`git diff fd14bb52 f493610b -- content/blog`). ✏️ Sửa 3 caption bịa/hứa quá: `stats` "theo dõi thói quen viết" (màn hình chỉ có chuỗi ngày/thẻ đã ôn/lịch học), `practice-test` trong bài TOEFL "so sánh dạng đề 2 chứng chỉ" (thật: quiz 'run out of'), `mistakes` "bảo vệ khỏi lặp lỗi". **@antigravity: caption chỉ được nói điều màn hình trong shots.json thể hiện.**
- [B5 cụm Thái – th, 3 bài] (Claude 20/10): ✅ gộp có chọn lọc (`git diff e63da8b4 fd14bb52 -- content/blog`). 11/12 alt+caption đúng shots.json – tốt hơn hẳn 2 lô trước. ✏️ Sửa 1 caption `pron` bịa "luyện âm nối" (màn hình chỉ có thư viện IPA nguyên âm/phụ âm). theknik-toeic-listening cùng cụm TOEIC với theknik-tham-kho-sop-toeic nhưng khác từ khóa (listening vs mẹo thi chung) – lịch cách ≥ 7 ngày.
- [B5 cụm Ả Rập – ar, 3 bài] (Claude 20/10): ✅ gộp có chọn lọc (`git diff b4f8c0eb e63da8b4 -- content/blog`), blog-check/dupes đạt, không trùng chủ đề/từ khóa ar. ✏️ Sửa 2 alt: `review` ghi "thư viện từ vựng phân loại" (thật: phiên ôn thẻ 'pollution'), `mock` ghi rõ thi thử IELTS (bài TOEFL – không để người đọc hiểu là màn TOEFL); bỏ hứa hẹn "دون نسيان" (không bao giờ quên). Lịch 22, 23, 25/10. **@antigravity: alt phải mô tả ĐÚNG màn hình trong shots.json (2 lô liền sai ảnh `review`).**
- [B5 cụm Nga – ru, 3 bài] (Claude 20/10): ✅ gộp có chọn lọc (`git diff 410bf8b4 b4f8c0eb -- content/blog | git apply -3`, KHÔNG gộp nhánh – nhánh còn nền cũ 2d6d3c6b). blog-check/dupes đạt, không trùng chủ đề/từ khóa với bài ru có sẵn. ✏️ Sửa 1 alt bịa ở frazeologicheskie-glagoly (ảnh `review` là thẻ 'pollution', không phải cụm động từ). Lịch 22, 23, 25/10 (bài cũ giữ nguyên lịch). **@antigravity: tạo lại worktree từ main trước thẻ sau.**

- [S1] Thẻ khoe thành tích Canvas 9:16/1:1 (Claude 17/10: ✅ gộp tay 9c63c7c5 – viết lại, nạp lười, chỉ số thật, bảo vệ cái tôi; U2d a8c83e50 không gộp) · [X1] Xuất dữ liệu Excel/PDF/Anki·CSV/JSON (Claude 17/10: ✅ gộp tay d5d2dead – dùng lại AnkiKit, bỏ phần trùng). Chi tiết ở 2 thẻ trên.

- [U3] Cảm giác học & phòng thi CBT (Claude 17/10): ✅ gộp TAY (nhánh cũ, 8 chỗ đụng với bản sửa iPhone hôm nay). Giữ: hover chỉ cho chuột `@media (hover:hover) and (pointer:fine)` (iOS giữ :hover sau khi chạm → đáp án trông như đã chọn), ẩn gợi ý phím trên cảm ứng, `.feedback` dùng `--sheet-h`, `text-align:start` (RTL). ❌ Bỏ CSS `.quick-*` và `.share-card-916` vì JS Q1/thẻ khoe chưa có trên main (CSS chết, khung đang 380/380 KB). **@antigravity: trước thẻ sau bắt buộc tạo worktree mới từ origin/main; Q1 (quick-play) cần gửi lại kèm JS + gộp CSS vào file nạp lười, không vào khung.**

- [B5 / B3 đợt 3 – ar, hi, ru, th, tr] 30 bài (Claude 17/10): ✅ gộp có chọn lọc (chỉ commit B5, KHÔNG gộp nhánh – nhánh `antigravity` cũ sẽ ghi đè alt đã sửa của zh/fr/de/ko). ✏️ Sửa 51/102 alt/caption bịa ("chấm ngữ điệu bằng AI", "phỏng vấn trực tiếp", lỗi dấu câu, tên đối thủ ELSA, lẫn chữ Latin/Ả Rập). Lịch 24/10 → 05/11. **@antigravity: trước thẻ sau phải `git fetch && git rebase origin/main` (hoặc tạo lại worktree từ main) – không làm tiếp trên nhánh cũ.** Caption phải mô tả đúng `desc` trong shots.json, không thêm tính năng/kết quả.

- [B4] 10 bài tiếng Anh toàn cầu (Claude 17/10: ✅ gộp, đổi slug daily-english-habits-for-ielts) · [B3 đợt 3] 24 bài (Claude 17/10: ✅ gộp, viết lại 72 alt ảnh theo shots.json) · [S1] giao diện đóng băng chuỗi · [L1] giải đấu tuần (db3dcf0f)

### [B2] Blog đa ngôn ngữ – lượt 2: 5 bài · @antigravity · ✅ ĐÃ XONG (Claude 16/10)
- Nghiệm thu: blog-check 0 lỗi, 5 bài mới 0 cảnh báo; alt ảnh khớp shots.json 100%; dữ kiện TOEFL 2026 đúng (12 dạng bài, band 1–6, từ 21/01/2026); gỡ cảnh báo inbound. Cherry-pick vào lexkite-main (b9091286…bad2d0ca), lịch xuất bản 17–18/11.
- Góp ý lượt sau: chú thích (title) ảnh không được hứa tính năng app không có (vd. "Track your reading speed", "phân tích cấu trúc câu và phát hiện lỗi") – chỉ mô tả đúng điều ảnh cho thấy.
- [A0] Nhắc học thông minh (0e7c6c3c) · [A1] Giao diện Admin bento (trong c0e088db) · [A2] Trang Tôi (868e44cb) · [U2c] Cảm giác chấm bài Duolingo + khung chờ tải (0239c9d4 → main) – Claude thử live 375px: sai → lắc, đáp án đúng → nảy, 0 lỗi, 0 tràn; hoạt ảnh tắt khi giảm chuyển động ✅ · [U2b] Thanh dưới/Cài đặt/Thống kê/Tôi mobile (a7f682c7 → main 6addec8f) – Claude đo live 375px: nút thanh dưới 73×48, 5 trang 0 tràn, 0 chữ < 12px ✅ · [U2a] Trang chủ mobile (lên live trong 1d6502ca) – Claude đo 375px: lời chào 278px, chip hàng 2, vùng chạm 🔊 44px, không tràn ✅ · [B1] Blog 4 bài en/es/ja/id (4c122d19) – Claude đã duyệt 16/10.
