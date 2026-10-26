# BACKLINKS – kế hoạch uy tín & backlink miễn phí (hạng mục 4 lộ trình SEO, 26/10/2026)

> TL;DR: 20 nơi đăng MIỄN PHÍ mới (kho dữ liệu, kho học liệu mở, chợ học liệu giáo viên, danh sách tuyển chọn, nền tảng kỹ thuật bản địa) kèm chữ điền sẵn đúng ngôn ngữ; kịch bản tiếp cận giáo viên/trường/thủ thư/nhà báo (không spam); các bước lập kênh YouTube; mục "Việc anh chủ làm". Bổ sung cho docs/PR-PLATFORMS.md (32 mục cũ) – không trùng.
> Đọc khi: đăng hồ sơ/thư mục, tiếp cận giáo viên hoặc báo chí, lập kênh YouTube, thêm kênh vào schema sameAs.

**Luật:** chỉ gói miễn phí ([pr-free-only]); em KHÔNG tạo tài khoản, không đăng nhập, không đăng bài dưới tên anh – em soạn sẵn, anh dán. Mỗi nơi đăng xong → ghi `content/pr/placements.json` (status `live` + URL) → nếu là hồ sơ thương hiệu thì thêm vào `content/authority/profiles.json` → schema `sameAs` tự cập nhật ở lần build sau (test `authority-pages` chặn URL chưa live).
**Không trùng** danh sách 32 mục ở `docs/PR-PLATFORMS.md` (Product Hunt, AlternativeTo, Edge/Firefox add-ons, EdSurge, Educational App Store…). Chữ chung dán sẵn: `content/pr/kit.md`.
**Tài sản để trỏ link về (đã live sau PR này):** bộ dữ liệu `/en/research/confused-words/` (CSV/JSON, CC BY 4.0) · widget `/en/embed/` · bài test CEFR `/en/english-level-test/` · trang nhà trường `/en/schools`.
**Chống phạt Google (link scheme):** không mua/đổi link, không anchor nhồi từ khóa, link widget dùng tên thương hiệu hiển thị rõ; trang nào bắt đặt link ngược để được duyệt → bỏ qua.

## 1. 20 nơi đăng miễn phí (chưa có trong PR-PLATFORMS)

Cột "Free": ✓ = gói miễn phí đã biết (kiểm lại lúc đăng – chính sách đổi); ? = phải kiểm form trước. Ngôn ngữ = ngôn ngữ chữ điền.

| # | Nơi | Loại | Free | Ngôn ngữ | Chữ điền sẵn |
|---|---|---|---|---|---|
| 1 | Zenodo (zenodo.org) – có DOI | kho dữ liệu nghiên cứu | ✓ | EN | D1 |
| 2 | Kaggle Datasets | kho dữ liệu | ✓ | EN | D1 + D2 |
| 3 | Hugging Face Datasets | kho dữ liệu | ✓ | EN | D1 + thẻ dataset card |
| 4 | Figshare | kho dữ liệu | ✓ | EN | D1 |
| 5 | Mendeley Data | kho dữ liệu | ✓ | EN | D1 |
| 6 | Internet Archive (archive.org/upload) | lưu trữ | ✓ | EN | D1 |
| 7 | GitHub repo `lexkiteapp/confused-words-dataset` | repo dữ liệu | ✓ | EN | D1 làm README + CSV |
| 8 | OER Commons (oercommons.org) | học liệu mở | ✓ | EN | O1 |
| 9 | MERLOT (merlot.org) – Add material | học liệu mở | ✓ (thành viên free) | EN | O1 |
| 10 | Tes Resources (tes.com) | chợ học liệu giáo viên | ✓ (tài nguyên free) | EN-UK | T1 |
| 11 | Teachers Pay Teachers – free resource | chợ học liệu | ✓ (Basic seller) | EN-US | T1 |
| 12 | ISLCollective | phiếu bài tập ESL | ✓ | EN | T2 |
| 13 | ESL Printables | phiếu bài tập ESL | ✓ (trao đổi) | EN | T2 |
| 14 | All Language Resources – Suggest a resource | trang đánh giá công cụ | ? | EN | C1 |
| 15 | Danh sách GitHub "awesome" học ngôn ngữ/ESL (tìm `awesome language learning`, chọn list còn merge PR ≤ 6 tháng) | danh sách tuyển chọn | ✓ | EN | C2 |
| 16 | Opera add-ons (addons.opera.com) – nhận gói Chrome | cửa hàng tiện ích | ✓ | EN + mô tả 15 ngôn ngữ có sẵn ở `store/` | dùng `store/chrome/LISTING.md` |
| 17 | Qiita (qiita.com) | bài kỹ thuật | ✓ | JA | J1 |
| 18 | Zenn (zenn.dev) | bài kỹ thuật | ✓ | JA | J1 (bản khác góc) |
| 19 | velog (velog.io) | bài kỹ thuật | ✓ | KO | K1 |
| 20 | 掘金 Juejin (juejin.cn) | bài kỹ thuật | ✓ | ZH | Z1 |

Thứ tự đề xuất: 1 → 7 → 2 → 3 (dữ liệu có DOI + repo trước, các kho khác dẫn về DOI) → 8–13 (giáo viên) → 14–16 → 17–20 (mỗi tuần 1 bài).
Sau khi Zenodo cấp DOI: báo em thêm DOI vào trang nghiên cứu (`identifier` trong schema Dataset + dòng trích dẫn).

### D1 – mô tả bộ dữ liệu (EN, dán cho mục 1–7)
- **Title:** Commonly Confused English Words: an open dataset (Lexkite)
- **Description:** 82 groups of English words that learners often mix up (affect/effect, borrow/lend, lie/lay…). Each group lists every word with its part of speech, a short English definition, an original example sentence, a typical mistake with its correction and a memory tip. Built by the Lexkite Editorial Team from Lexkite's own editorial content; contains no user data. Updated automatically from the source at https://lexkite.com/en/research/confused-words/
- **License:** CC BY 4.0 · **Creator:** Lexkite Editorial Team · **Publisher:** Lexkite
- **Files:** https://lexkite.com/research/confused-words.csv · https://lexkite.com/research/confused-words.json
- **Keywords:** English, ESL, EFL, commonly confused words, learner errors, vocabulary, CEFR, education
- **Cite as:** dùng đúng dòng "How to cite" trên trang nghiên cứu (có ngày phiên bản).
- **Lưu ý trung thực:** đây là danh sách biên tập tuyển chọn, KHÔNG phải tần suất lỗi đo từ người học – giữ câu "Limitations" khi mô tả.

### D2 – Kaggle "starter notebook" (EN)
Tiêu đề: *Exploring commonly confused English words*. 3 ô: đọc CSV bằng pandas → đếm `pos_pattern` → in 10 ví dụ `typical_mistake → correction`. Link nguồn ở ô đầu.

### O1 – học liệu mở (EN, mục 8–9)
- **Title:** Commonly Confused English Words – open dataset and free classroom widget
- **Abstract:** A CC BY 4.0 list of 82 commonly confused English word groups with definitions, example sentences, typical mistakes and memory tips, plus a free "word pair of the day" widget teachers can embed in a class website. No sign-up, no cookies.
- **Subject:** English Language Learning / ESL · **Level:** Secondary, Adult education, Higher education · **Material type:** Data set, Reference material · **Language:** English
- **URL:** https://lexkite.com/en/research/confused-words/

### T1 – tài nguyên giáo viên (EN, mục 10–11)
Tải lên 1 file PDF/CSV miễn phí "Commonly Confused Words – 82 pairs with mistakes and tips" (in từ trang nghiên cứu) + mô tả:
"A free, printable reference of 82 commonly confused English word groups for B1–C1 learners. Each entry has a definition, a model sentence, a typical mistake and a memory tip. Licensed CC BY 4.0 – share it with your class. Interactive version and daily widget: lexkite.com/en/research/confused-words/". Thẻ: ESL, EFL, vocabulary, IELTS, TOEIC, grammar. Giá: Free.

### T2 – phiếu bài tập ESL (EN, mục 12–13)
Phiếu "Affect or effect? 10 confusing pairs" – 10 câu điền chỗ trống lấy từ cột `example` (thay từ bằng ___) + đáp án; dòng cuối "Source: Lexkite (CC BY 4.0) – lexkite.com". Em soạn thêm phiếu theo yêu cầu (lấy dữ liệu thật, không chép nguồn khác).

### C1 – All Language Resources (EN)
"Lexkite is a free English vocabulary and exam-prep app (IELTS, TOEIC, TOEFL) with FSRS flashcards, a bilingual dictionary in 15 languages, a free adaptive CEFR level test and timed mock tests. Works in the browser and as a Chrome add-on. No credit card." Link: https://lexkite.com/en/

### C2 – dòng PR vào danh sách GitHub (EN, giữ đúng định dạng list)
`- [Lexkite](https://lexkite.com/en/) - Free English vocabulary app with FSRS flashcards, a 15-language bilingual dictionary and a free CEFR level test.` – mô tả PR: liên quan chủ đề list, miễn phí, mã nguồn web; không gửi vào list không đúng chủ đề.

### J1 – Qiita / Zenn (JA)
- **タイトル案:** 「Vanilla JS で FSRS 単語帳を作り、15 言語に対応した話」（Zenn 版:「間違えやすい英単語 82 組をオープンデータ（CC BY 4.0）にした話」）
- **導入文:** 英語学習アプリ Lexkite を個人開発しています。本記事では、間隔反復アルゴリズム FSRS をブラウザだけで動かす方法と、15 言語の UI を機械翻訳任せにしないための仕組みを紹介します。データセットは CC BY 4.0 で公開しています: https://lexkite.com/ja/research/confused-words/
- **タグ:** JavaScript, PWA, 英語学習, FSRS, i18n · Canonical は dev.to の元記事（Zenn 版は内容を変えて独立記事に）。

### K1 – velog (KO)
- **제목:** 바닐라 JS로 FSRS 단어장 앱 만들기 – 15개 언어 지원기
- **소개:** 무료 영어 학습 앱 Lexkite를 만들며 배운 점을 정리했습니다. 브라우저에서 FSRS 간격 반복을 구현한 방법과, 헷갈리는 영어 단어 82쌍을 CC BY 4.0 오픈 데이터로 공개한 과정을 다룹니다: https://lexkite.com/ko/research/confused-words/
- **태그:** javascript, pwa, 영어공부, fsrs, i18n

### Z1 – 掘金 Juejin (ZH)
- **标题:** 用原生 JS 实现 FSRS 背单词应用，并支持 15 种界面语言
- **简介:** 分享开发免费英语学习应用 Lexkite 的经验：在浏览器中实现 FSRS 间隔重复算法、15 种语言界面的本地化流程，以及以 CC BY 4.0 开放的「易混淆英语单词」数据集：https://lexkite.com/zh/research/confused-words/
- **标签:** JavaScript, 前端, 英语学习, 开源数据

## 2. Kịch bản tiếp cận (không spam)

Nguyên tắc chung: cá nhân hoá từng thư (nhắc đúng bài/trang của họ), tối đa 1 thư nhắc lại sau 7 ngày, không gửi hàng loạt, ghi rõ mình là người làm Lexkite, luôn cho họ thứ hữu ích trước (dữ liệu, widget, bài test), không xin "dofollow", dừng ngay khi họ không muốn nhận. Ghi mỗi lần gửi vào Quản trị → Backlink, PR & Thương hiệu.

### 2.1 Giáo viên & trường (EN; bản VI ngay dưới)
**Subject:** A free word-pair widget for your class page
> Hi [Name], I read your [post/page on X] – especially [một chi tiết thật]. I'm part of the team behind Lexkite, a free English vocabulary app. We just published an open (CC BY 4.0) list of 82 commonly confused word groups with typical mistakes and memory tips, plus a "word pair of the day" widget that schools can embed for free – no sign-up, no cookies, no tracking: https://lexkite.com/en/embed/ . If it is useful for your students, feel free to use it; if anything in the data is wrong, I'd love to hear it. Best, [Tên] – Lexkite

> **Tiêu đề:** Tiện ích "cặp từ dễ nhầm mỗi ngày" miễn phí cho trang lớp học
> Chào thầy/cô [Tên], em đã đọc [bài/trang …] của thầy/cô, nhất là phần [chi tiết thật]. Em thuộc nhóm làm Lexkite – app học từ vựng tiếng Anh miễn phí. Nhóm vừa công bố bộ 82 cặp từ dễ nhầm (giấy phép CC BY 4.0) kèm lỗi điển hình và mẹo nhớ, cùng tiện ích nhúng "cặp từ hôm nay" cho website lớp học – không cần đăng ký, không cookie, không theo dõi: https://lexkite.com/vi/embed/ . Nếu hữu ích cho học viên, thầy/cô cứ dùng; thấy chỗ nào sai xin báo để nhóm sửa. Cảm ơn thầy/cô!

Đích: blog giáo viên ESL, trang khoa ngoại ngữ, trung tâm IELTS có mục "resources" – tìm bằng `"commonly confused words" ESL resources`, `"useful links" IELTS teacher`.

### 2.2 Thủ thư đại học (LibGuides ESL/Academic English) – EN
**Subject:** Open dataset for your ESL guide: commonly confused words (CC BY)
> Hello [Name], your guide "[Tên guide]" is a great starting point for international students. We have released a free CC BY 4.0 dataset of 82 commonly confused English word groups (definitions, examples, typical mistakes, memory tips; CSV/JSON) and a free adaptive CEFR level test. Both need no account and collect no personal data: https://lexkite.com/en/research/confused-words/ – https://lexkite.com/en/english-level-test/ . If they fit your guide, we would be glad to be listed. Thank you for your work, [Tên], Lexkite
Tìm: `site:libguides.com ESL "vocabulary"`, `site:.edu "English language learners" resources`.

### 2.3 Người viết bài "commonly confused words" (đề nghị bổ sung nguồn) – EN
> Hi [Name], your article "[Tiêu đề]" explains [cặp] really clearly. In case it helps readers, we published an open dataset of 82 confused word groups with a typical mistake for each, which you may quote or chart under CC BY: [link]. No pressure at all – thanks for writing it.

### 2.4 Kiểu HARO (nền tảng nhà báo tìm chuyên gia) – anh đăng ký, em soạn câu trả lời
HARO đã đóng (12/2024). Thay bằng gói free: **Featured.com**, **Qwoted** (free giới hạn lượt), **SourceBottle**. Chỉ trả lời câu hỏi đúng chuyên môn (học từ vựng, luyện thi IELTS/TOEIC, ứng dụng học ngôn ngữ, lặp lại ngắt quãng). Mẫu 120–180 từ: 1 câu trả lời thẳng → 2–3 ý có số liệu THẬT từ bộ dữ liệu/app → chữ ký "Lexkite Editorial Team, lexkite.com". Không bịa chức danh/bằng cấp; nếu báo yêu cầu người thật có tên → anh quyết định ký tên mình hay bỏ qua.

### 2.5 Reddit / Quora – chỉ khi anh duyệt riêng (theo [pr-free-only] anh dặn tránh nơi hay xoá bài/khoá tài khoản)
- Đọc luật sidebar từng subreddit (r/EnglishLearning, r/IELTS, r/languagelearning có thread tài nguyên). Tỉ lệ 9:1: chín câu trả lời giúp thật (không link) cho một lần nhắc Lexkite, và chỉ khi câu hỏi đúng là đang xin công cụ.
- Luôn ghi "I work on Lexkite" khi nhắc; không tạo nhiều tài khoản, không nhờ người upvote, không đăng cùng 1 nội dung nhiều nơi.
- Quora: trả lời đầy đủ ngay trong câu trả lời (dùng số liệu bộ dữ liệu), link chỉ làm nguồn tham khảo cuối bài.

### 2.6 Nhắc tên chưa có link (link reclamation)
Mỗi tháng tìm `"Lexkite" -site:lexkite.com` và `"lexkite.com"`; trang nhắc tên mà không link → thư ngắn cảm ơn + đề nghị gắn link tới đúng trang họ nhắc. Ảnh/biểu đồ của trang nghiên cứu bị dùng lại không ghi nguồn → nhắc điều kiện CC BY (ghi nguồn), lịch sự.

## 3. Lập kênh YouTube (anh làm – em không đăng nhập)
1. Đăng nhập Google bằng email chính thức (memory accounts-services) → youtube.com → avatar → **Tạo kênh** → chọn **dùng tên doanh nghiệp/tên khác** (Brand Account) → tên **Lexkite**.
2. Handle `@lexkite` (nếu đã có người dùng → `@lexkiteapp`). Ảnh đại diện: `brand/lexkite-icon-512.png`; ảnh bìa 2560×1440 theo `docs/BRAND-RULES.md` (Kit lấy từ `web/js/kit.js`, không dùng Kit xanh cũ).
3. Mô tả kênh (EN): "Free English vocabulary and IELTS, TOEIC and TOEFL practice from Lexkite – short lessons on commonly confused words, word families and exam tips. Learn free at lexkite.com." Liên kết: lexkite.com, trang nghiên cứu, bài test CEFR. Email liên hệ: support@lexkite.com.
4. Xác minh kênh (youtube.com/verify) để đặt ảnh bìa video + video > 15 phút.
5. Kết nối kênh cho máy đăng video theo `docs/YOUTUBE-SETUP.md` (OAuth, Quản trị → Video → YouTube).
6. Khi kênh có ≥ 1 video công khai: thêm URL kênh vào `content/pr/placements.json` (type `profile`, status `live`) rồi vào `content/authority/profiles.json` → `sameAs` tự lên schema; báo em điền ID video vào các ô YouTube của bài blog.

## 4. Việc anh chủ làm (em đã soạn sẵn mọi chữ ở trên)
- [ ] Zenodo: đăng nhập bằng GitHub `lexkiteapp` → New upload → dán D1 + tải CSV/JSON → Publish → gửi em DOI.
- [ ] Tạo repo công khai `lexkiteapp/confused-words-dataset` (hoặc cho phép em tạo bằng token của anh) → em đẩy README + CSV.
- [ ] Kaggle, Hugging Face, Figshare, Mendeley Data, Internet Archive: tạo tài khoản free, dán D1 (mỗi nơi ~10 phút).
- [ ] OER Commons, MERLOT, Tes, Teachers Pay Teachers (Basic), ISLCollective, ESL Printables: tạo tài khoản, đăng tài nguyên T1/T2/O1 (em xuất PDF/phiếu khi anh cần).
- [ ] All Language Resources + 1–2 danh sách GitHub awesome: gửi C1/C2.
- [ ] Opera add-ons: đăng ký nhà phát triển free, tải gói Chrome hiện có.
- [ ] Qiita, Zenn, velog, Juejin: tạo tài khoản; em viết bài đầy đủ từng ngôn ngữ khi anh báo.
- [ ] Featured.com / Qwoted / SourceBottle: đăng ký free; chuyển câu hỏi phù hợp cho em soạn trả lời.
- [ ] Kênh YouTube theo §3.
- [ ] Mỗi nơi live → ghi `content/pr/placements.json` (hoặc Quản trị → Xuất JSON) để test và schema tự cập nhật.
