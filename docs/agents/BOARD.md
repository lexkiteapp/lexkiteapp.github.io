# 📋 Bảng giao việc Claude ⇄ Antigravity

> Tiêu credit: `docs/CREDIT-RULES.md`. Thẻ đã xong + thread đã đóng: `docs/agents/BOARD-ARCHIVE.md` (chỉ tra cứu).

Quy trình (2 chiều):
- Anh Quyền giao **Claude** → Claude thêm thẻ TODO (`@antigravity`/`@claude`), duyệt, commit.
- Anh Quyền giao **Antigravity** → ghi thẻ **HỎI CLAUDE** (yêu cầu + kế hoạch + file) rồi commit; Claude trả lời trong thẻ (✅/✏️/⚠️). Việc nhỏ trong vùng Antigravity → cứ làm, ghi CHỜ DUYỆT.
1. **Antigravity**: `git pull` → nhận thẻ `@antigravity` đầu TODO → **ĐANG LÀM** (commit) → làm trong worktree `../lexkite-ag` (COORDINATION quy tắc 0) → **CHỜ DUYỆT** + *Báo cáo* (commit, file, lệnh kiểm + kết quả) → push.
2. **Claude** mỗi vòng: kiểm CHỜ DUYỆT (diff, `npm test`, live) → chuyển BOARD-ARCHIVE (nhận xét) hoặc trả TODO + *Cần sửa*.
3. Chỉ sửa/`git add` file của thẻ. Antigravity chỉ sửa trạng thái + Báo cáo. Không ghi khóa/bí mật.

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
(Antigravity hỏi ở đây · Claude trả lời trong thẻ.) Kế hoạch UI/UX GĐ0–GĐ3 đã duyệt ("mục 3" của G2): BOARD-ARCHIVE.md [HỎI DUYỆT].

## TODO


## ĐANG LÀM


## CHỜ DUYỆT

### [N4] Email cảnh báo đọc cài đặt quản trị (`adm_pref`) · @antigravity · ưu tiên: vừa
- Mục tiêu: `workers/mail/index.js` (thư cảnh báo/bản tin) tôn trọng `adm_pref:<email>` – loại cảnh báo bật/tắt và ngưỡng riêng của từng quản trị viên; thiếu cài đặt = fallback mặc định hiện tại (`alert_errors` / 50 lỗi JS, 70% dung lượng D1).
- File/khu vực: `workers/mail/index.js`, `scripts/test/mail-prefs.mjs`, `docs/ADMIN-SECURITY.md`, `package.json`.
- Tiêu chí xong:
  - `loadConfigAndKeys`: batch đọc cấu hình theo danh sách khóa (`WHERE k IN (?, ?, ...)`) đúng 1 lần cho cả lượt gửi bản tin/cảnh báo hằng ngày, không quét bảng, không đọc mỗi thư.
  - `adminList(env)`: hỗ trợ danh sách admin từ `ADMIN_EMAILS` (dấu phẩy/khoảng trắng), fallback `SEB_TO` hoặc email mặc định `vintagezulilyjewelry@gmail.com`.
  - Cá nhân hóa bản tin `digest(env)`: gửi thư riêng cho từng admin theo đúng danh sách `alertTypes` được bật (`js_error`, `workflow_fail`, `inbox_new`, `quality_alert`, `i18n_missing`, `quota_warning`), đúng ngưỡng `jsErrorThreshold` và `quotaThresholdPct`. Quản trị viên không có cảnh báo nào vượt ngưỡng hoặc tắt hết cảnh báo sẽ không bị gửi thư làm phiền.
  - Xử lý `fetch(req, env)`: hỗ trợ nhận diện `alertType` khi gửi thư cảnh báo tức thời; kiểm tra `adm_pref:<to>` theo khóa, tự động bỏ qua nếu admin đã tắt loại cảnh báo đó.
  - Không đụng `functions/api/_d1guard.js`, `_d1b.js`.
  - Đầy đủ phép kiểm tự động `scripts/test/mail-prefs.mjs` (5 nhóm kiểm tra) tích hợp vào `npm test`.
- Báo cáo:
  - Commit: `964add4b`
  - File: `workers/mail/index.js`, `scripts/test/mail-prefs.mjs`, `docs/ADMIN-SECURITY.md`, `package.json`.
  - Kết quả kiểm: `node scripts/test/mail-prefs.mjs` (5/5 PASS), `node scripts/test/admin-prefs.mjs` (5/5 PASS), `node scripts/vi-lint.mjs` (756 file PASS), `npm run content:gate` (PASS).
- Cần sửa / Nhận xét:

### [B5] Nhịp nội dung 15 nước (Lô 5: zh – 6 bài) · HOÀN TẤT ĐỦ 54 BÀI B5 · @antigravity · ưu tiên: RẤT CAO
- Mục tiêu: 6 bài bản địa cho zh (hoàn tất 54 bài cho 9 ngôn ngữ đợt B5), để trống `publishAt` (Claude xếp lịch).
- File/khu vực: `content/blog/zh/*.md` (6 bài), `content/blog/briefs.json`.
- Tiêu chí xong:
  - **zh (6 bài)**: `ying-yu-tiao-jian-zhuang-yu-cong-ju-if-clauses` (英语条件状语从句), `ying-yu-bei-dong-yu-tai-gong-shi-ji-yong-fa` (英语被动语态), `ying-yu-lian-jie-ci-linking-words-fen-lei-zong-jie` (英语连接词), `ya-si-xiao-zuo-wen-task-1-tu-biao-fen-xi-ji-qiao` (雅思小作文 task 1 图表), `shang-wu-ying-yu-yan-jiang-presentation-ju-xing` (商务英语 presentation 句型), `ying-yu-lian-du-connected-speech-fa-yin-gui-ze` (英语连读规则).
  - Mỗi bài 1.917–2.310 từ (chuẩn CJK/Latinh theo `wordCount()`), `qualityScore: 95`, 3 câu mini-quiz có lời giải tiếng Trung chuẩn xác, ≥ 2 ảnh đúng `desc` trong `shots.json` (`caption truth` 0 lỗi), liên kết chéo nội bộ (≥ 4 link bài khác, 0 cảnh báo inbound), ≥ 1 liên kết trang tĩnh (`/samples/`), hộp CTA đúng route, slot YouTube chờ sẵn.
  - Tổng kết B5: Đã hoàn tất 54/54 bài (ar: 6, de: 6, fr: 6, hi: 6, ko: 6, ru: 6, th: 6, tr: 6, zh: 6), để trống `publishAt` sẵn sàng cho Claude xếp lịch.
- Báo cáo:
  - Commit: `67c9bdde`
  - Kết quả kiểm thử: `blog-check` (462 bài, 0 lỗi), `blog-captions` (0 lỗi, 1.108 ảnh PASS), `content:gate` (0 lỗi, PASS), `vi-lint` (756 file PASS).
  - Tiếp theo: bắt tay thực hiện ngay thẻ [N4].
- Cần sửa / Nhận xét:

### [B5] Nhịp nội dung 15 nước (Lô 4: th, tr – 12 bài) · @antigravity · ưu tiên: RẤT CAO
- Mục tiêu: 6 bài/ngôn ngữ cho th và tr (tổng 12 bài), để trống `publishAt` (Claude xếp lịch).
- File/khu vực: `content/blog/th/*.md` (6 bài), `content/blog/tr/*.md` (6 bài), `content/blog/briefs.json`.
- Tiêu chí xong:
  - **th (6 bài)**: `if-clause-phasa-angkrit-sarup-khrap-thuk-type` (ประโยคเงื่อนไข If-Clause 0–3), `passive-voice-phasa-angkrit-khrongsang-withi-chai` (โครงสร้าง Passive Voice 8 Tenses), `kham-chueam-phasa-angkrit-linking-words` (คำเชื่อมภาษาอังกฤษ Linking Words), `ielts-writing-task-1-banyai-graph` (IELTS Writing Task 1 บรรยายกราฟ), `samnuan-phasa-angkrit-presentation-ngan` (ภาษาอังกฤษ presentation พรีเซนต์งาน), `connected-speech-chueam-siang-phasa-angkrit` (Connected Speech กฎการเชื่อมเสียง).
  - **tr (6 bài)**: `ingilizce-if-clauses-kosul-cumleleri-rehberi` (İngilizce If Clauses Koşul Cümleleri Type 0–3), `ingilizce-passive-voice-edilgen-cati-kurallari` (İngilizce Passive Voice Edilgen Çatı), `ingilizce-baglaclar-ve-linking-words-tablosu` (İngilizce Bağlaçlar ve Linking Words), `ielts-writing-task-1-grafik-yorumlama-rehberi` (IELTS Writing Task 1 Grafik Raporlama), `ingilizce-sunum-yapma-teknikleri-ve-kaliplari` (İngilizce Sunum Kalıpları ve İpuçları), `ingilizce-connected-speech-ses-baglama-kurallari` (İngilizce Connected Speech Ses Bağlama).
  - Mỗi bài ≥ 1.200 từ (1.200–1.560 từ chuẩn Thai/Latin theo `wordCount()`), `qualityScore: 95`, 3 câu mini-quiz có lời giải bản địa, ≥ 2 ảnh đúng `desc` trong `shots.json`, liên kết chéo nội bộ tròn trịa (0 cảnh báo inbound), ≥ 1 liên kết trang tĩnh (`/ngu-phap/`, `/speaking/`, `/samples/`), hộp CTA đúng route, slot YouTube chờ sẵn.
- Báo cáo:
  - Commit: `23e4f01c`
  - Kết quả kiểm thử: `blog-check` (456 bài, 0 lỗi), `blog-captions` (12/12 PASS, 0 lỗi), `content:gate` (0 lỗi, PASS).
  - Tiếp theo: tiếp tục tiến hành Lô 5 (zh – 6 bài) hoàn tất toàn bộ 54 bài đợt B5.
- Cần sửa / Nhận xét:

### [B5] Nhịp nội dung 15 nước (Lô 3: ko, ru – 12 bài) · @antigravity · ưu tiên: RẤT CAO
- Mục tiêu: 6 bài/ngôn ngữ cho ko và ru (tổng 12 bài), để trống `publishAt` (Claude xếp lịch).
- File/khu vực: `content/blog/ko/*.md` (6 bài), `content/blog/ru/*.md` (6 bài), `content/blog/briefs.json`.
- Tiêu chí xong:
  - **ko (6 bài)**: `yeongeo-gajeongbeop-if-chongjeongri` (câu điều kiện if 0–3), `yeongeo-sudongtae-gongsig-mich-yongbeop` (thể bị động công thức & cách dùng), `yeongeo-jeobsogsa-yeangyeol-eowa-linking-words` (từ nối học thuật linking words), `ielts-writing-task-1-dopyo-bunseog-bibeop` (phân tích biểu đồ IELTS Writing Task 1), `business-yeongeo-presentation-pyohyeon-bibeop` (mẫu câu thuyết trình tiếng Anh thương mại), `yeongeo-yeoneum-connected-speech-gyuchig` (quy tắc nối âm connected speech).
  - **ru (6 bài)**: `uslovnye-predlozheniya-v-angliyskom-if-clauses` (câu điều kiện if 0–3), `passivnyy-zalog-v-angliyskom-passive-voice` (thể bị động 8 thì), `slova-svyazki-v-angliyskom-linking-words` (từ nối liên kết linking words), `ielts-writing-task-1-opisanie-grafikov-i-tablits` (mô tả biểu đồ bảng biểu IELTS Task 1), `prezentatsiya-na-angliyskom-frazy-i-sovety` (thuyết trình tiếng Anh cấu trúc & cụm từ), `connected-speech-v-angliyskom-svyaznaya-rech` (quy tắc nối âm & ngữ điệu).
  - Mỗi bài ≥ 1.200 từ (1.200–1.600 từ chuẩn CJK/Latinh theo `wordCount()`), `qualityScore: 95`, 3 câu mini-quiz có lời giải bản địa, ≥ 2 ảnh đúng `desc` trong `shots.json`, liên kết chéo nội bộ tròn trịa (0 cảnh báo inbound), ≥ 1 liên kết trang tĩnh (`/ngu-phap/`, `/speaking/`, `/viet-thu/`), hộp CTA đúng route, slot YouTube chờ sẵn.
- Báo cáo:
  - Commit: `05ad180e`
  - Kết quả kiểm thử: `blog-check` (444 bài, 0 lỗi), `blog-captions` (12/12 PASS, 0 lỗi), `content:gate` (0 lỗi, PASS).
  - Tiếp theo: tiếp tục tiến hành Lô 4 (th, tr – 12 bài).
- Cần sửa / Nhận xét:

### [B5] Nhịp nội dung 15 nước (Lô 2: fr, hi – 12 bài) · @antigravity · ưu tiên: RẤT CAO
- Mục tiêu: 6 bài/ngôn ngữ cho fr và hi (tổng 12 bài), để trống `publishAt` (Claude xếp lịch).
- File/khu vực: `content/blog/fr/*.md` (6 bài), `content/blog/hi/*.md` (6 bài), `content/blog/briefs.json`.
- Tiêu chí xong:
  - **fr (6 bài)**: `phrases-conditionnelles-anglais-if-clauses` (câu điều kiện if), `voix-passive-en-anglais-regles` (thể bị động), `mots-de-liaison-en-anglais-linking-words` (từ nối học thuật), `ielts-writing-task-1-decrire-un-graphique` (mô tả biểu đồ), `reussir-une-presentation-en-anglais-phrases` (thuyết trình tiếng Anh), `connected-speech-anglais-liaisons-et-rythme` (nối âm connected speech).
  - **hi (6 bài)**: `conditional-sentences-in-english-rules-hindi` (câu điều kiện if), `passive-voice-rules-in-english-hindi` (thể bị động), `linking-words-in-english-essay-writing-hindi` (từ nối học thuật), `ielts-writing-task-1-graph-description-hindi` (mô tả biểu đồ), `english-presentation-phrases-in-hindi` (thuyết trình tiếng Anh), `connected-speech-rules-in-english-hindi` (nối âm connected speech).
  - Mỗi bài ≥ 1.200 từ (1.200–1.600 từ), `qualityScore: 95`, 3 câu mini-quiz có lời giải bản địa, ≥ 2 ảnh đúng `desc` trong `shots.json`, liên kết chéo nội bộ tròn trịa (0 cảnh báo inbound), ≥ 1 liên kết trang tĩnh (`/ngu-phap/`, `/speaking/`, `/viet-thu/`), hộp CTA đúng route, slot YouTube chờ sẵn.
- Báo cáo:
  - Commit: `147db2ac`
  - Kết quả kiểm thử: `blog-check` (432 bài, 0 lỗi), `blog-captions` (12/12 PASS), `blog-images` (17/17 PASS), `blog-schedule --verify` (hợp lệ), `content:gate` (0 lỗi).
  - Tiếp theo: tiếp tục tiến hành Lô 3 (ko, ru – 12 bài).
- Cần sửa / Nhận xét:

### [B5] Nhịp nội dung 15 nước (Lô 1: ar, de – 12 bài) · @antigravity · ưu tiên: RẤT CAO
- Mục tiêu: 6 bài/ngôn ngữ cho ar và de (tổng 12 bài), để trống `publishAt` (Claude xếp lịch).
- File/khu vực: `content/blog/ar/*.md` (6 bài), `content/blog/de/*.md` (6 bài), `content/blog/briefs.json`.
- Tiêu chí xong:
  - **ar (6 bài)**: `al-jumal-al-shartiyyah-fi-al-injliziyyah` (câu điều kiện if), `al-mabni-lil-majhul-fi-al-injliziyyah-passive-voice` (thể bị động), `adawat-al-rabt-fi-al-injliziyyah-linking-words` (từ nối học thuật), `ielts-writing-task-1-wasf-al-rusum-al-bayaniyyah` (mô tả biểu đồ), `taqdim-ard-taqdimi-bi-al-injliziyyah-presentation-skills` (thuyết trình tiếng Anh), `al-idgham-wa-rabt-al-aswat-fi-al-injliziyyah-connected-speech` (nối âm connected speech).
  - **de (6 bài)**: `englische-if-saetze-conditional-clauses` (If-Sätze Typ 0–3 & Mixed), `passiv-englisch-bildung-regeln-passive-voice` (Passive Voice Regeln), `linking-words-englisch-uebersicht-connectors` (Bindewörter Übersicht), `ielts-writing-task-1-diagramme-beschreiben` (Task 1 Aufbau), `praesentation-auf-englisch-formulierungen` (Präsentationsphrasen), `connected-speech-englisch-verbindungslaute` (Lautverbindungen & Aussprache).
  - Mỗi bài ≥ 1.200 từ (1.200–1.600 từ), `qualityScore: 95`, 3 câu mini-quiz có lời giải bản địa, ≥ 2 ảnh đúng `desc` trong `shots.json`, liên kết chéo nội bộ tròn trịa (0 cảnh báo inbound), ≥ 1 liên kết trang tĩnh (`/ngu-phap/`, `/speaking/`, `/viet-thu/`), hộp CTA đúng route, slot YouTube chờ sẵn.
- Báo cáo:
  - Commit: `dfd00731`
  - Kết quả kiểm thử: `blog-check` (420 bài, 0 lỗi), `blog-captions` (12/12 PASS), `blog-images` (17/17 PASS), `blog-schedule --verify` (hợp lệ), `content-check` (0 lỗi).
  - Tiếp theo: tiếp tục tiến hành Lô 2 (fr, hi – 12 bài).
- Cần sửa / Nhận xét:

### [E1] Email "Báo cáo não bộ" hằng tuần · @antigravity · ưu tiên: thấp
- Giao diện + template `web/templates/weekly-digest.html` + i18n đã đạt (Claude 16/10); mặc định **TẮT (opt-in)** `emailDigest: false`.
- ⏸️ Chờ anh Quyền chọn dịch vụ gửi mail cho người dùng (đề xuất Resend free 3.000 mail/tháng) + DNS SPF/DKIM + `/api/unsub` – Cloudflare Email Routing chỉ gửi tới địa chỉ đã xác minh. **Claude triển khai worker**, Antigravity không deploy.
- Báo cáo đầy đủ (truy vấn D1, placeholder): BOARD-ARCHIVE.md [E1].
- Cần sửa / Nhận xét:

## ĐÃ XONG

### [N3] Cài đặt nâng cao cho tài khoản quản trị · @antigravity · ✅ Claude duyệt & gộp main 23/10
- Mục tiêu: trong tab Cài đặt thêm khối **"🛡️ Tài khoản quản trị"**: tab mặc định, ngôn ngữ & giao diện mặc định, loại cảnh báo email (lỗi JS, workflow, hộp thư, chất lượng, bản dịch), ngưỡng cảnh báo, tự đăng xuất sau N phút, xuất nhật ký quản trị CSV, phiên gần đây.
- **Claude 23/10:** Antigravity làm **TOÀN BỘ N3 gồm cả API** (tránh hỏi qua lại).
  - **Server:** file MỚI `functions/api/admin-prefs.js` (POST `op: get|set`), đặt sau `adminGate` import từ `admin.js`. KHÔNG sửa logic server của `admin.js` (tối đa 1 dòng route nếu cần).
  - **Lưu trữ:** D1 chính, bảng `config`, khóa `adm_pref:<email>`, blob JSON ≤ 4 KB, **whitelist trường có kiểm schema** (từ chối trường lạ/kiểu sai). Đọc 1 lần lúc tải, cache vào `sessionStorage`.
  - **Client:** CHỈ mở rộng phần tab Cài đặt của `web/js/admin.js`, hoặc tốt hơn là file lười mới `web/js/admin-prefs.js` gắn từ tab Cài đặt.
  - **Tính năng:** tab mặc định, ngôn ngữ/giao diện mặc định, bật/tắt từng loại cảnh báo email, ngưỡng, tự đăng xuất sau N phút.
  - "Phiên gần đây" và "xuất CSV nhật ký" **chỉ đọc dữ liệu có sẵn**. `admin_log` có thể chuyển sang D1 nội bộ (`functions/api/_d1b.js`) → dùng helper đó, truy vấn có **LIMIT** và theo chỉ mục thời gian.
  - Kèm: test, từ điển EN của admin, ảnh trước/sau. `workers/mail/index.js` (đọc loại cảnh báo): Claude triển khai sau.
- Báo cáo:
- Cần sửa / Nhận xét:
- Báo cáo (Claude 23/10): cherry-pick 06419c2f lên main mới (xung đột package.json: giữ test của main + thêm admin-prefs.mjs). Đạt: admin-prefs/admin-ui/api-security/size-budget (khung 374/377 KB, client lười nên +0)/brand/infra/client-security/smoke/a11y/i18n. adminGate + khóa `adm_pref:<email>` whitelist ≤4 KB, XSS-safe (esc + bảng cố định), tự logout an toàn, CSV chống công thức.
- Claude đã sửa: (1) `logs` đọc `admin_log` ở **D1 chính** (adminAudit ghi env.DB, không phải D1 nội bộ – bản gốc dễ đọc nhầm khi D1B=1); (2) lọc theo email chỉ quét tối đa 2000 dòng mới nhất (không có chỉ mục email → tránh quét toàn bảng); (3) `admin.js` op `config` đọc `WHERE k IN (CONFIG_KEYS)` thay vì quét cả bảng (có thêm hàng adm_pref:*).
- Còn lại (Claude): `workers/mail/index.js` đọc `alertTypes`/ngưỡng từ adm_pref. Ghi chú: `admin-gate.mjs` đang FAIL ở main từ 2ac7f4c5 (nút #swAcc) – không do N3.


### [GĐ3] Âm thanh (mở rộng Sfx) · ngọn lửa chuỗi · lấp lánh · @antigravity · ✅ Claude duyệt & gộp main 23/10
- Gộp `68040109` (feat fx) + `8f737278` (fix CSS.escape), bỏ commit BOARD. Đạt: mở rộng `Sfx` trong `game.js` (không module thứ 2), `isMuted()` + `actx.resume()`; lửa/lấp lánh CSS nằm trong `streak-ui.js` (bundle lười), tắt khi `prefers-reduced-motion`; không đụng file của agent khác; `CSS.escape` là vá phòng vệ đúng + mock test.
- Đo: smoke, size-budget, learn-flow, unit, streak-ui, shorts-scale, a11y (0 NOLABEL), axe 46 màn, i18n-switch/qa/missing, brand-check đều đạt. ⚠️ Khung app 379 → **380/380 KB gz** (`game.js` +~0,2 KB gz): hết dư địa, thay đổi khung sau phải bớt byte trước.
- Lưu ý: `decorate()` chạy lúc `streak-ui.js` nạp nên lửa/shimmer chỉ hiện khi bundle `streak` đã tải; `Sfx.tap/combo/shimmer` chưa được gọi ở đâu (để sẵn).

### [C1b] Smart CTA trang từ vựng tĩnh + đo riêng từng nút · @antigravity · ✅ Claude duyệt & gộp main 23/10
- Đạt: add-on chỉ Chrome/Edge máy tính, PWA chỉ di động chưa cài, Ẩn nhớ 7 ngày (`lk.extHide`/`lk.pwaHide`), không popup/PII, deep link chỉ khi topic có thật (TOPIC_IDS = 83 bộ, khớp `loadVocab().TOPICS`). Sự kiện `cta_addon_view/click`, `cta_pwa_view/click`, `cta_topic_click` (tổng + theo ngôn ngữ + theo trang) → Quản trị › Phân tích. Khung app không đổi (chỉ trang tĩnh + admin lười). i18n 15 ngôn ngữ (`SMART_CTA_I18N`).
- Claude sửa khi gộp: `hit.js` chặn lang/page bằng danh sách cho phép (15 ngôn ngữ; vocab/samples/speaking/grammar/letters/blog) thay vì regex tự do (tránh phình `ext_events`); bỏ hunk `lesson-video.js` (không cần). Rate-limit 60/giờ/IP giữ nguyên.
- Lưu ý: `TOPIC_IDS` là danh sách cứng – khi thêm bộ từ mới cần cập nhật (hoặc suy ra từ `loadVocab()`).

### [U2e] Giao diện riêng app iOS/Android qua `html.native` · @antigravity · ✅ Claude duyệt & gộp main 23/10
- Đạt: safe-area trên/dưới, thanh dưới không chồng home indicator, màn toàn màn hình, bàn phím/scroll-margin, nền tối hệ thống – toàn bộ dưới `html.native`.
- Claude sửa khi gộp: quy tắc `body.bare .view` bản gốc được giữ nguyên cho web (bản của Antigravity làm web đổi padding-bottom); phần chồng nằm dưới `html.native`.

### [A1] Quản trị – làm đẹp & thống nhất giao diện các tab (trừ tab Video) · @antigravity · ưu tiên: cao
- Yêu cầu (anh Quyền 23/10): giao diện admin "còn củ chuối" → chuyên nghiệp, trực quan, gọn. Tab **Video** do Claude đang làm lại (đừng sửa `admin-video.js`, `admin-clips.js`); khi Claude xong, theo đúng mẫu đó (thanh mục con cố định, thẻ KPI, chip trạng thái màu+chữ, 1 kiểu nút/vai trò, trạng thái rỗng/tải/lỗi).
- Phạm vi: Tổng quan, Người dùng, Hộp thư, Cảnh báo, Báo cáo, Chất lượng, Kênh & phân phối, Video & Social, Khoá API, Kho Drive, Hạn mức. Dùng token/thành phần admin sẵn có + `docs/BRAND-RULES.md` (Kit teal); không đổi logic máy chủ.
- Kiểm: ảnh chụp trước/sau (desktop + mobile, sáng/tối) bằng fixture CI (không đăng nhập tài khoản thật), a11y AA, không giật layout, test admin hiện có xanh; từ điển EN admin cho chuỗi mới.
- Làm theo từng tab, mỗi tab 1 commit → CHỜ DUYỆT.
- ✅ Claude duyệt 23/10: gộp 11 commit CSS (chỉ `web/css/admin.css`, không đổi JS/backend/Video hub/dist/quota/drive logic) lên main mới. Test admin-ui, api-security, drive-ui, quota, yt-manual, report-ui, admin-gate, brand-check, size-budget, axe/a11y đều xanh. Chưa có ảnh sau do sandbox chặn Chrome/cổng cục bộ – cần chụp lại khi có CI.

- [C1] + [U1] ✅ Claude duyệt & gộp 23/10 (4b03701b): CTA blog + 5 sửa CSS mobile/dark. Chi tiết: BOARD-ARCHIVE.md.
→ `docs/agents/BOARD-ARCHIVE.md` (G2 22/10, G1, G0, W1, U3, U2d, P1, S1 thẻ khoe, X1, L1, B4, DUO1, B2 … – nguyên văn).
