# Lexkite – Nền tảng PR & backlink miễn phí (rà soát 17/10/2026)

> TL;DR: Nền tảng PR & backlink miễn phí: tiến độ đăng, thay đổi 2026, danh sách xếp hạng 32 mục, cảnh báo, lộ trình 4 tuần. Chỉ gói miễn phí; anh chủ tự đăng ký/đăng bài.
> Đọc khi: làm PR/backlink.

Bổ sung cho `docs/SEO-GROWTH-PLAN.md` (nội dung on-site) và `docs/SEO-PLAN.md` (kỹ thuật). Tài liệu này chỉ lo **liên kết & uy tín ngoài site**. Bộ chữ dán sẵn: `content/pr/kit.md`.
**Anh tự đăng ký / đăng bài** – em không tạo tài khoản, không đăng nhập, không gửi gì.

Quy ước cột:
- **DR** = ước lượng Ahrefs DR/Moz DA theo nguồn bên thứ ba, chỉ để so sánh tương đối (các nguồn lệch nhau ±10).
- **Link**: `follow` / `nofollow` / `ugc` / `?` = chưa chắc, phải tự kiểm bằng "Inspect" sau khi đăng. Link nofollow vẫn có giá trị lượt truy cập + tín hiệu thương hiệu, chỉ không truyền PageRank.
- **Ưu tiên**: P1 làm ngay · P2 trong tháng · P3 khi có điều kiện · ✗ không làm.
- Thị trường: VI = Việt Nam, EN = quốc tế tiếng Anh, ALL = 15 ngôn ngữ.

## ✅ Tiến độ đăng (cập nhật mỗi lần gửi – chỉ gói MIỄN PHÍ, mục tiêu 20 trang)

**Nguồn gốc duy nhất:** `content/pr/placements.json` (bảng dưới sinh tự động – không sửa tay; `npm test` chặn khi lệch). Anh cũng sửa/thêm được trong **Quản trị → Backlink, PR & Thương hiệu** (D1) → nút "Xuất JSON" để chép ngược về file. Kiểm tự động hằng ngày: xem mục "Theo dõi tự động" cuối file.

<!-- pr-table:start (sinh tự động từ content/pr/placements.json – sửa JSON rồi chạy: node scripts/pr-check.mjs --table) -->
| # | Trang | Trạng thái | Ngày | Link kiểm tra | Loại · tài khoản | Ghi chú |
|---|---|---|---|---|---|---|
| 1 | dev.to | ✅ Đang hiển thị | 17/10/2026 | https://dev.to/zulily_jewelry_vintage_92/building-a-15-language-fsrs-vocabulary-app-in-vanilla-js-and-exporting-real-anki-apkg-files-in-3fl7 | article · @zulily_jewelry_vintage_92 | Bài gốc (canonical). Tên hiển thị Lexkite, logo, khai báo AI-assisted. Username trong link chưa đổi (đổi sẽ đổi link). |
| 2 | GitHub awesome-fsrs | ✅ Đang hiển thị | 17/10/2026 | https://github.com/open-spaced-repetition/awesome-fsrs/pull/80 | pr · @lexkiteapp | PR #80 đã merge 17/10/2026 – mục Specialized Flashcard trong README (GitHub gắn nofollow cho link README). |
| 3 | SaaSHub | ⏳ Chờ duyệt | 17/10/2026 | https://www.saashub.com/lexkite | directory · @lexkite | Đã gửi, chờ duyệt (1–12 tuần, gói Free). App tương tự Brainscape, Mochi, Readlang. Trang có chống bot – thường phải kiểm tay. |
| 4 | AlternativeTo | ⏳ Chờ duyệt | 17/10/2026 | https://alternativeto.net/software/lexkite/ | directory | Đã gửi, hàng chờ miễn phí (My submissions). URL là trang dự kiến khi được duyệt. Logo + 4 ảnh, 15 ngôn ngữ, gắn alternative Anki. |
| 5 | Uneed | ⏳ Chờ duyệt | 17/10/2026 | https://www.uneed.best/tool/lexkite | listing · @lexkite | Hồ sơ đã lưu, CHƯA ra mắt (hàng chờ free kín ~5 tháng, không mua gói phí). Trước ra mắt: link nofollow + trang noindex. |
| 6 | Crunchbase | ✍️ Nháp | 17/10/2026 | — | profile | Nháp – chờ anh: trụ sở Sheridan, Wyoming + logo + Save All Edits. Điền URL hồ sơ khi đã duyệt. |
| 7 | Product Hunt | ✍️ Nháp | 17/10/2026 | — | profile | Tài khoản mới – chờ anh điền tên + tích ≥16 tuổi; tài khoản đủ 1 tuần mới launch (sớm nhất ~24/10). |
| 8 | Medium | ✅ Đang hiển thị | 17/10/2026 | https://medium.com/@vintagezulilyjewelry/building-a-15-language-fsrs-vocabulary-app-in-vanilla-js-and-exporting-real-anki-apkg-fe8adf6601d9 | article · @vintagezulilyjewelry | Import từ dev.to, canonical về dev.to. Tên hiển thị Lexkite + logo; 5 chủ đề. Medium hay chặn bot – có thể phải kiểm tay. |
| 9 | Peerlist | ✅ Đang hiển thị | 17/10/2026 | https://peerlist.io/lexkite | profile · @lexkite | Hồ sơ dự án 100% (logo, ảnh bìa, mô tả, danh mục). Launchpad cần hồ sơ cá nhân tên thật. Trang có chống bot – thường phải kiểm tay. |
| 10 | Hashnode | ✅ Đang hiển thị | 17/10/2026 | https://lexkite.hashnode.dev/building-a-15-language-fsrs-vocabulary-app-in-vanilla-js-and-exporting-real-anki-apkg-files-in-the-browser | article · @lexkite | Blog "Lexkite Engineering" (lexkite.hashnode.dev), canonical về dev.to; thẻ JavaScript/Web Development/PWA. |
| 11 | Zenodo | ✅ Đang hiển thị | 26/10/2026 | https://zenodo.org/records/23662627 | listing · @lexkiteapp | Dataset CC BY 4.0, DOI 10.5281/zenodo.23662627 (concept 10.5281/zenodo.23662626), archived from GitHub release v1.0.0. |
| 12 | GitHub | ✅ Đang hiển thị | 26/10/2026 | https://github.com/lexkiteapp/confused-words-dataset | listing · @lexkiteapp | Public dataset repo (README + CSV/JSON + .zenodo.json); homepage = research page. |
| 13 | Hugging Face | ✅ Đang hiển thị | 26/10/2026 | https://huggingface.co/datasets/mrquyenbkpro/confused-english-words | listing · @mrquyenbkpro | Dataset card + CSV/JSON, CC BY 4.0, DOI 10.5281/zenodo.23662626. |
| 14 | Kaggle | ✅ Đang hiển thị | 26/10/2026 | https://www.kaggle.com/datasets/zulilyjewelryvintage/commonly-confused-english-words-lexkite | listing · @zulilyjewelryvintage | Public dataset, CC BY 4.0, description cites DOI + source page. |
| 15 | Figshare | ✅ Đang hiển thị | 26/10/2026 | https://figshare.com/articles/dataset/Commonly_Confused_English_Words_an_open_dataset_Lexkite_/34789332 | listing · @Quyen Khieu Dinh | Dataset CC BY 4.0, DOI 10.6084/m9.figshare.34789332.v1; description links research page + Zenodo DOI. |
| 16 | OER Commons | ⏳ Chờ duyệt | 26/10/2026 | https://oercommons.org/courses/commonly-confused-english-words-open-dataset-and-free-classroom-widget | listing · @Quyen Khieu Dinh | Submitted from web (librarian review). CC BY, English Language Arts, HS/CC/Adult, Data Set. |
<!-- pr-table:end -->

Tiếp theo (miễn phí, chưa làm – chỉ trang ỔN ĐỊNH, mình làm chủ hồ sơ/bài): Peerlist, Indie Hackers (trang Product), Hashnode (blog riêng, canonical về dev.to), Medium (import, canonical), LinkedIn Company Page, Viblo (bài thuần kỹ thuật), Microsoft Edge Add-ons, Firefox Add-ons, Educational App Store, TinyLaunch, HackerNoon, GitHub (repo/README giới thiệu), Wellfound (hồ sơ công ty).

⛔ **Tránh** (hay xóa bài/khóa tài khoản vì tự quảng bá → mất link, hại uy tín tên miền): Reddit, Hacker News, Quora, Voz, nhóm Facebook, Spiderum, các trang "đăng thông cáo hàng loạt", trang đòi đặt badge/link ngược (Fazier) – trừ khi anh duyệt riêng.


## 0. Thay đổi 2026 cần biết (đã kiểm qua web)
| Nền tảng | Thay đổi |
|---|---|
| Hacker News | Mod (dang, 03/2026) yêu cầu **tự viết tay**, không dùng văn bản do LLM viết; đang cân nhắc siết Show HN với tài khoản mới vì "AI slop". → Bài Show HN trong kit chỉ là **dàn ý**, anh viết lại bằng lời mình. |
| BetaList | Bỏ suất miễn phí – mọi lượt gửi phải trả phí → **loại**. |
| Product Hunt | Vẫn miễn phí; tài khoản cá nhân ≥ 1 tuần, không dùng tài khoản công ty; 1 domain chỉ launch 1 lần/6 tháng; "Coming soon" đã bỏ; link "Visit" là `ugc` (không follow). |
| Peerlist Launchpad | Miễn phí, mở mỗi thứ Hai (UTC); chỉ top 5 tuần có link (`ugc`); cần hồ sơ cá nhân xác minh, dự án điền 100 %. |
| Capterra/GetApp/Software Advice | Nay đi qua form của G2; hồ sơ miễn phí **không có link website**. |
| Google | Đợt spam update 08/2026 nhắm "scaled content abuse" (nội dung hàng loạt giá trị thấp, kể cả AI/viết thuê). |
| Opera add-ons | Vẫn nhận bài nhưng diễn đàn dev báo duyệt treo nhiều tháng (2025–2026). |
| Luật QC Việt Nam | Từ 05/07/2026 (TT 12/2026/TT-BVHTTDL): dùng từ "nhất / số một / tốt nhất / duy nhất" trong quảng cáo phải có căn cứ → **không dùng** trong bài VN. |

## 1. Danh sách xếp hạng (32 mục)

### (a) Launch / thư mục sản phẩm
| # | Nền tảng | URL | DR | Link | Free | Gửi gì | Người đọc | Công | Luật & rủi ro | Ưu tiên |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Product Hunt | producthunt.com/posts/new | ~90 | ugc | ✓ | Tên, tagline ≤60, mô tả, 4–6 ảnh, first comment (kit §3) | EN, maker/early adopter | Cao (1 ngày trực) | Cấm xin upvote / mua vote → ban + gỡ. Chỉ "mời xem". 6 tháng/1 lần → chọn ngày kỹ. | P1 |
| 2 | Hacker News – Show HN | news.ycombinator.com/submit | ~90 | nofollow | ✓ | Tiêu đề "Show HN: …" + link thẳng app dùng thử không cần đăng ký + comment tự viết | EN, dev | TB | Không landing page/không bắt đăng ký; cấm rủ bạn upvote; viết tay, không văn LLM; tài khoản mới dễ bị lọc → dùng tài khoản đã bình luận thật vài tuần. | P1 |
| 3 | Indie Hackers | indiehackers.com (Products + bài) | ~80 | nofollow | ✓ | Trang product + bài "build in public" (kỹ thuật/bài học, không quảng cáo) | EN, founder | TB | Bài thuần quảng cáo bị bỏ qua/xóa. | P2 |
| 4 | Uneed | uneed.best | ~70 | **follow** (help center: link vĩnh viễn) | ✓ hàng chờ (có nguồn nói phí nhỏ – kiểm lúc gửi) | Logo, ảnh, mô tả ngắn/dài | EN, maker | Thấp | Không cần badge. Ngày launch theo hàng chờ. | P1 |
| 5 | Peerlist Launchpad | peerlist.io/launchpad | ~75 | ugc (top 5) | ✓ | Dự án 100 %, launch thứ Hai | EN, dev/designer | TB | Không hồ sơ công ty/agency SEO. | P2 |
| 6 | AlternativeTo | alternativeto.net (Suggest new application) | ~80 | nofollow với app mới | ✓ (hàng chờ dài) | Mô tả, nền tảng (Web, Chrome, Edge, Firefox, Android*), nhãn "Free", ảnh | EN + nhiều nước | Thấp | Chọn đúng nhãn "free", không tự viết review. Chỉ ghi nền tảng đã phát hành. | P1 |
| 7 | SaaSHub | saashub.com/submit | ~70 | ? (nguồn mâu thuẫn) | ? miễn phí cơ bản – kiểm | Mô tả, danh mục Education/Language learning | EN | Thấp | Nếu chỉ có gói trả phí → bỏ. | P2 |
| 8 | TinyLaunch | tinylaun.ch | ~50–60 | follow cho top 3 / có thể cần badge | ✓ | Như Uneed | EN, maker | Thấp | Badge = trao đổi link → chỉ đặt ở trang "Press/Featured on", không phải footer toàn site. | P3 |
| 9 | Fazier | fazier.com | ~60 | follow (mẫu kiểm) | ✓ nếu đặt badge/link | Như Uneed | EN | Thấp | Free **đòi link ngược** → cùng lưu ý badge. | P3 |
| — | BetaList | betalist.com | — | — | ✗ trả phí | — | — | — | Đã bỏ free 2026. | ✗ |
| — | DevHunt | devhunt.org | ~60 | ? | ✓ (chờ ~6 tháng) | — | dev tools | — | Không hợp app học (chỉ dev tool). | ✗ |

### (b) Edtech / danh mục giáo dục
| # | Nền tảng | URL | DR | Link | Free | Gửi gì | Người đọc | Công | Luật & rủi ro | Ưu tiên |
|---|---|---|---|---|---|---|---|---|---|---|
| 10 | Educational App Store | educationalappstore.com/developer | ~55 | ? | ? (chưa thấy phí – kiểm form) | App web (họ duyệt cả web), tiêu chí: kết quả học, khả dụng & tiếp cận, an toàn/riêng tư | EN, giáo viên/phụ huynh | TB | Chấm thật ~10 ngày làm việc; trượt có góp ý. Chuẩn bị chính sách riêng tư, không quảng cáo trong app. | P2 |
| 11 | EdTech Impact | edtechimpact.com | ~55 | ? | Miễn phí cho giáo viên; hồ sơ vendor **chưa rõ** | Hồ sơ sản phẩm + xin giáo viên review thật | EN (UK/EU trường học) | TB | Không mua/đổi quà lấy review. Hợp B2B trường học hơn người học lẻ. | P3 |
| 12 | Common Sense Education | commonsense.org/education | ~90 | — | ✓ nhưng **không có cổng nộp** | Chỉ gửi email đề xuất review khi app ổn định | EN (giáo viên Mỹ, K-12) | Thấp | Họ tự chọn; chủ yếu K-12 → khả năng thấp. | P3 |
| 13 | EdSurge Product Index | index.edsurge.com | ~80 | ? | ✓ (2022 relaunch; hiện trạng 2026 chưa xác minh) | Hồ sơ sản phẩm | EN (K-12/ĐH Mỹ) | TB | Kiểm trang còn hoạt động trước khi làm. | P3 |
| — | Class Central | classcentral.com | — | — | — | — | — | — | Chỉ liệt kê khóa học của trường/MOOC, không nhận app. | ✗ |

### (c) Cộng đồng viết bài / dev có uy tín
| # | Nền tảng | URL | DR | Link | Free | Gửi gì | Người đọc | Công | Luật & rủi ro | Ưu tiên |
|---|---|---|---|---|---|---|---|---|---|---|
| 14 | GitHub `awesome-fsrs` | github.com/open-spaced-repetition/awesome-fsrs | ~95 (github.com) | follow? (README GitHub thường `nofollow` – kiểm) | ✓ | PR/Issue thêm 1 dòng vào **Application → Specialized Flashcard**: "Lexkite – web/PWA + Chrome add-on for English exam vocabulary, FSRS-5" | EN, cộng đồng FSRS/Anki | Thấp | Repo nhận cả app đóng nguồn; viết ngắn, trung tính, đúng định dạng dòng cũ. Độ liên quan cao nhất. | P1 |
| 15 | dev.to | dev.to/new | ~90 | follow trong thân bài (kiểm) | ✓ | Bài kỹ thuật (kit §5), `canonical_url` trỏ bản gốc nếu đăng lại | EN, dev | TB | Bài chỉ để quảng cáo bị gắn cờ; tag `#showdev` hợp lệ. | P1 |
| 16 | Hashnode | hashnode.com | ~85 | ? | ✓ | Bản đăng lại bài dev.to, đặt "originalArticleURL"/canonical | EN | Thấp | Đặt canonical để không bị trùng lặp. | P2 |
| 17 | Medium | medium.com (Import a story) | ~95 | nofollow | ✓ | Import bài gốc (canonical tự đặt khi import) | EN | Thấp | Canonical chỉ đặt được lúc import. | P2 |
| 18 | LinkedIn – Company Page + Article | linkedin.com/company/setup | ~98 | nofollow | ✓ | Trang công ty (ảnh `brand/social/linkedin/`), 1 bài "Câu chuyện xây Lexkite" | EN + VI, người đi làm (TOEIC) | Thấp | Không spam nhóm. | P1 |
| 19 | HackerNoon | hackernoon.com (Write) | ~85 | ? | ✓ (biên tập duyệt) | Bài kỹ thuật **khác góc** với dev.to (vd. dựng blog 15 ngôn ngữ tĩnh, 0 đồng) | EN, dev | TB | Duyệt biên tập; không cho đăng bài trùng nguyên văn. | P3 |

### (d) Việt Nam
| # | Nền tảng | URL | DR | Link | Free | Gửi gì | Người đọc | Công | Luật & rủi ro | Ưu tiên |
|---|---|---|---|---|---|---|---|---|---|---|
| 20 | Viblo | viblo.asia | ~60 | ? | ✓ | Bài **thuần kỹ thuật** tiếng Việt (cài FSRS-5 bằng JS thuần, i18n 15 ngôn ngữ…), link Lexkite chỉ ở cuối | VI, dev | TB | Viblo gắn spam bài "mang tính thương mại, có URL tới trang thương mại" → nội dung phải đứng được khi bỏ link. | P1 |
| 21 | Spiderum | spiderum.com | ~55 | ? | ✓ | Bài trải nghiệm cá nhân (vd. "Một năm tự học từ vựng bằng lặp lại ngắt quãng"), nhắc app 1 lần | VI, sinh viên/đi làm | TB | Cộng đồng ghét PR; bài phải có giá trị tự thân. | P2 |
| 22 | Tinhte | tinhte.vn | ~70 | ? | ✓ | Giới thiệu add-on/app trong box phù hợp (phần mềm/ứng dụng) + ảnh thật | VI, người dùng công nghệ | TB | Đọc thỏa thuận dịch vụ (cập nhật 03/2026); không đăng lặp nhiều box. | P2 |
| 23 | Facebook nhóm học IELTS/TOEIC & nhóm công cụ (vd. J2TEAM Community) | facebook.com/groups | ~95 | nofollow | ✓ | Bài chia sẻ mẹo + "mình làm công cụ này miễn phí", xin admin trước | VI | TB | Nhiều nhóm cấm link → hỏi admin; không đăng hàng loạt cùng nội dung (FB khóa vì spam). | P1 |
| 24 | Voz | voz.vn | ~70 | ? | ✓ | Chỉ trả lời khi có người hỏi công cụ học tiếng Anh | VI | Thấp | Nội quy cấm quảng cáo ở box Phần mềm; vi phạm = ban. Không mở thread quảng cáo. | P3 |

### (e) Cộng đồng học ngôn ngữ quốc tế
| # | Nền tảng | URL | DR | Link | Free | Gửi gì | Người đọc | Công | Luật & rủi ro | Ưu tiên |
|---|---|---|---|---|---|---|---|---|---|---|
| 25 | Reddit r/languagelearning | reddit.com/r/languagelearning | ~95 | nofollow | ✓ | **Chỉ** trong thread quảng bá ghim (stickied) theo wiki "rules for promotion" | EN + toàn cầu | Thấp | Tự quảng bá = mọi thứ mình có liên quan; cấm "nuôi" tài khoản rồi chèn link; xin phép chỉ cho 1 lần. | P2 |
| 26 | Reddit r/IELTS, r/EnglishLearning, r/TOEIC, r/Anki | reddit.com/r/… | ~95 | nofollow | ✓ | Đọc sidebar từng sub; ưu tiên trả lời câu hỏi thật, nói rõ "I made this" | EN, IN, PK, VN, PH, LatAm | TB | Không đăng chéo cùng lúc nhiều sub (shadowban). r/Anki: chỉ khi bàn về FSRS. | P2 |
| 27 | Quora (câu trả lời + Space) | quora.com | ~90 | nofollow | ✓ | Trả lời câu hỏi "how to memorize vocabulary for IELTS" bằng nội dung thật, link bài blog đúng ngôn ngữ | EN, IN, ES/PT/JA (Quora bản địa) | TB | Ghi rõ là người làm app; tránh dán link mọi câu. | P3 |

### (f) Thông cáo báo chí miễn phí – nói thật
Phần lớn link `nofollow`, giá trị SEO trực tiếp thấp; lợi ích chính: có trang được index với tên thương hiệu + đôi khi được nhà báo/blog nhặt lại. **Đăng tối đa 2 nơi, cùng 1 thông cáo, mỗi nơi 1 lần** – rải hàng chục site PR = mẫu link spam.
| # | Nền tảng | URL | DR | Link | Free | Ghi chú | Ưu tiên |
|---|---|---|---|---|---|---|---|
| 28 | PRLog | prlog.org | ~78 | ? (nguồn nói follow, chưa kiểm) | ✓ | Ảnh + video, index nhanh qua RSS; không gửi nhà báo. | P2 |
| 29 | openPR | openpr.com | ~65–70 | nofollow? | ✓ 1 bài/tháng | ~800–1.000 từ, chỉ ảnh. | P3 |
| — | PR.com, EIN Presswire free, 24-7PressRelease… | | | nofollow | hạn chế | Phễu bán gói trả phí; bỏ qua. | ✗ |
| — | Báo VN (VnExpress, Tuổi Trẻ, GenK…) | | | | | Bài PR trên báo VN là **trả phí** và phải gắn nhãn quảng cáo → không thuộc kế hoạch free. Có thể gửi thông cáo tới email tòa soạn mục Công nghệ/Giáo dục, không cam kết. | P3 |

### (g) Kho tiện ích / ứng dụng / trang review
| # | Nền tảng | URL | DR | Link | Free | Gửi gì | Ghi chú | Ưu tiên |
|---|---|---|---|---|---|---|---|---|
| 30 | Microsoft Edge Add-ons | partner.microsoft.com/dashboard/microsoftedge | ~95 | nofollow | ✓ | `store/lexkite-extension.zip` + listing | Hướng dẫn sẵn ở `store/PUBLISH-FREE.md`. Mỗi kho = 1 trang thương hiệu được index + kênh tải. | P1 |
| 31 | Firefox AMO | addons.mozilla.org/developers | ~95 | nofollow | ✓ | gói Firefox mới – **cần dựng lại**: `scripts/build-extension.sh` hiện không xuất bản Firefox, `store/vocaband-firefox.zip` là bản cũ tên cũ | Cũng ở `store/PUBLISH-FREE.md` (AI dùng khóa Gemini của người dùng trên Firefox). | P1 |
| — | Chrome Web Store | chrome.google.com/webstore/devconsole | ~98 | nofollow | 5 USD một lần (đã có quy trình `docs/CWS-RULES.md`) | — | Không miễn phí nhưng là kho chính; dùng làm link "Get the extension" trong mọi bài. | (đã có) |
| — | Opera add-ons | addons.opera.com/developer | ~85 | nofollow | ✓ | zip Chrome | Duyệt có thể treo nhiều tháng; gửi rồi quên. | P3 |
| 32 | Crunchbase | crunchbase.com (Resources → Create Profile) | ~90 | nofollow | ✓ | Hồ sơ công ty: logo, mô tả, website, ngày thành lập, ngành Education/EdTech | Tài khoản mới duyệt tay vài ngày; dùng làm "nguồn" cho Knowledge Panel sau này. | P1 |
| — | G2 | g2.com (Add your product) | ~90 | không có link website ở bản free | ✓ | Hồ sơ sản phẩm | B2B → ít người học tìm; làm cho đủ hiện diện. | P3 |
| — | Capterra/GetApp | qua form G2 | ~90 | không link | ✓ | — | Như trên. | P3 |
| — | Wellfound | wellfound.com | ~85 | nofollow | ✓ | Hồ sơ startup | Dành tuyển dụng/gọi vốn; chỉ làm khi cần tuyển. | P3 |
| — | Google Play | play.google.com/console | — | — | 25 USD | — | Không miễn phí (ROADMAP). | ✗ (chưa) |
| — | Apple App Store | developer.apple.com | — | — | 99 USD/năm | — | Không miễn phí. | ✗ (chưa) |
| — | F-Droid | f-droid.org | — | — | ✓ | — | **Không khả thi**: chỉ nhận app mã nguồn mở build từ source, phụ thuộc không-tự-do (Firebase Auth/Google) bị gắn Anti-Feature hoặc từ chối. | ✗ |
| — | APKPure / mirror APK | | | | | — | Chưa có bản Play chính thức; APK trên kho mirror dễ bị gắn mác "mod", không kiểm soát cập nhật → không làm. | ✗ |

### (h) Thực thể thương hiệu (Google / Wiki)
| Nền tảng | Kết luận |
|---|---|
| Google Business Profile | **Không đủ điều kiện**: Google ghi rõ doanh nghiệp chỉ hoạt động online (không địa điểm khách đến, không phục vụ tận nơi) là không hợp lệ. Tạo vẫn bị gỡ/khóa. ✗ |
| Wikidata | **Chưa**. Cần "tham chiếu nghiêm túc, công khai" – nhiều bài báo độc lập; mục chỉ dựa trên website của chính mình bị xóa như quảng cáo. Làm lại khi có ≥ 2–3 bài báo/blog uy tín độc lập viết về Lexkite (P3, tháng 6+). |
| Wikipedia | **Không tự viết**: xung đột lợi ích (COI) + chuẩn đáng chú ý (nhiều nguồn độc lập đáng tin, chuyên sâu). Bài tự viết sẽ bị xóa, có thể ảnh hưởng uy tín. ✗ |
| Thay thế hợp lệ | `Organization` + `sameAs` JSON-LD trên trang chủ trỏ tới hồ sơ thật (LinkedIn, Crunchbase, YouTube, kho add-on) → giúp Google hiểu thực thể. Thêm khi các hồ sơ đã có URL. |

## 2. Cảnh báo – đọc trước khi đăng
1. **Không mua link, không PBN, không "gói 500 directory", không đổi link hàng loạt.** Google Spam Policies (link spam) phạt cả site nhận link; đợt 08/2026 siết "scaled content abuse". Badge đổi link (Fazier/TinyLaunch) chỉ đặt ở 1 trang "Featured on", không đặt footer toàn site.
2. **Không dùng một bài AI xào lại đăng 10 nơi.** Mỗi nền tảng 1 góc riêng, viết lại thật; khi đăng lại nguyên bài thì phải đặt `canonical` (dev.to/Hashnode/Medium).
3. **Reddit / HN / Product Hunt:** luôn nói "I built this"; không nhờ người quen upvote, không lập nhiều tài khoản, không đăng cùng lúc nhiều sub; HN và PH ban vĩnh viễn nếu phát hiện vote ring. Văn bản HN tự viết tay.
4. **Wikipedia/Wikidata:** không tự tạo bài về Lexkite (COI). Chờ báo chí độc lập.
5. **Nội dung hứa hẹn:** không hứa điểm/band, không nói "chính thức", không dùng logo IELTS/ETS/British Council/IDP, luôn kèm câu nhãn hiệu (`content/landing/en.json` → `tm`). Tiếng Việt không dùng "nhất/số 1/duy nhất".
6. **Không nêu tên đối thủ** trong copy quảng bá (Anki chỉ được nhắc ở góc kỹ thuật "FSRS – thuật toán mà Anki cũng dùng", đúng như landing).
7. **Không bịa số liệu** (người dùng, lượt tải, điểm tăng). Chỉ dùng số trong landing: 6.800+ từ, 77 bài ngữ pháp, 1.700 bài tập, 44 âm, 15 ngôn ngữ, 12 dạng câu TOEFL mới.
8. **Liên kết** dùng UTM trong `content/pr/kit.md §7` để đo lường; không đặt dữ liệu cá nhân vào URL.
9. **Bảo mật:** dùng email chính thức (xem `ACCOUNTS.local.md`), bật 2FA mỗi tài khoản, không chia sẻ mật khẩu qua chat.

## 3. Lộ trình 4 tuần (bắt đầu 20/10/2026)
| Tuần | Việc | Thị trường |
|---|---|---|
| **1 – Nền móng** (20–26/10) | Tạo LinkedIn Company Page, Crunchbase, tài khoản Product Hunt (để tuổi ≥ 1 tuần) + HN (bắt đầu bình luận thật); gửi Edge Add-ons + Firefox AMO; PR vào `awesome-fsrs`; gửi AlternativeTo + Uneed (vào hàng chờ); đọc luật Reddit/FB group, xin admin 3–5 nhóm VN. | EN, VI, ALL (kho add-on) |
| **2 – Nội dung kỹ thuật** (27/10–02/11) | Đăng bài dev.to (bản gốc) → Hashnode + Medium (canonical); Viblo bản tiếng Việt viết lại (không dịch máy); SaaSHub (nếu free), Educational App Store; Indie Hackers product page. | EN, VI |
| **3 – Ra mắt** (03–09/11, thứ Ba/Tư) | Product Hunt (12:01 PT, trực cả ngày, trả lời mọi comment); 1–2 ngày sau: Show HN (tự viết tay); Peerlist Launchpad thứ Hai 03/11 hoặc 10/11; bài chia sẻ LinkedIn; PRLog thông cáo EN. | EN (toàn cầu, IN/PH/LatAm) |
| **4 – Việt Nam & cộng đồng** (10–16/11) | Thông cáo VI (PRLog bản VI hoặc gửi email tòa soạn Công nghệ/Giáo dục); Spiderum, Tinhte, 3–5 nhóm FB đã được admin đồng ý (giãn ≥ 1 ngày/nhóm); Reddit theo luật từng sub (r/languagelearning thread ghim, r/IELTS); Quora 3–5 câu trả lời thật trỏ blog đúng ngôn ngữ. Tổng kết UTM trong admin/GSC. | VI, EN; Quora ES/PT/JA/HI |
| Sau đó | TinyLaunch/Fazier (P3), EdTech Impact, HackerNoon, Opera; Wikidata khi có báo chí độc lập; mỗi tháng 1 bài kỹ thuật mới (không đăng lại cũ). | — |

Ghi chú thị trường: các nền tảng (a)(c)(f) gần như chỉ tiếng Anh → kéo người dùng **EN, IN, PH, LatAm, Đông Nam Á** dùng tiếng Anh; (d) cho VI; 13 ngôn ngữ còn lại chủ yếu nhờ blog bản địa (SEO-GROWTH-PLAN) + kho add-on (listing đa ngôn ngữ `store/chrome/LISTING-LOCALES.md`) + Quora bản địa (es/pt/ja/hi). Không spam cộng đồng ngôn ngữ mình không đọc được luật.

## 4. Top 10 đăng ký trước
1. awesome-fsrs (PR GitHub) · 2. Product Hunt (tạo tài khoản ngay để đủ tuổi) · 3. Microsoft Edge Add-ons · 4. Firefox AMO · 5. Uneed · 6. AlternativeTo · 7. dev.to · 8. LinkedIn Company Page · 9. Crunchbase · 10. Viblo.

## Nguồn đã kiểm (10/2026)
Product Hunt (innmind.com launch guide 2026; saascity.io/directories/product-hunt) · news.ycombinator.com/showhn.html; keydiscussions.com 03/2026 · orangebot.ai/blog/betalist-alternatives-2026 · uneed.hc.ferndesk.com (dofollow) · saascity.io/directories/peerlist, /alternativeto, /fazier, /capterra, /g2 · github.com/open-spaced-repetition/awesome-fsrs · support.google.com/business/answer/13763036 · wikidata Help:Editing (notability) · f-droid.org/docs/Inclusion_Policy · support.crunchbase.com/…/115011823988 · educationalappstore.com/developer · voz.vn/help/terms · tinhte.vn thỏa thuận dịch vụ · viblo.asia (phản hồi spam) · redlib …/r/languagelearning/wiki/rules_for_promotion · ppc.land/scaled-content-abuse; relevantaudience.com (spam update 08/2026) · indiehackers.com (free PR sites 2026) · forums.opera.com (duyệt treo).

## Theo dõi tự động (Backlink, PR & Thương hiệu)
- **Workflow** `.github/workflows/pr-check.yml` (hằng ngày 08:30 giờ VN + chạy tay / nút "Kiểm ngay" trong Quản trị): `scripts/pr-check.mjs --remote`.
  - Bài/hồ sơ `live`/`pending`: HTTP, URL cuối (chuyển hướng), còn link `lexkite.com` (cả UTM, link bọc), `rel` (nofollow/ugc/sponsored), noindex (meta + `X-Robots-Tag`), tiêu đề, dấu hiệu bị gỡ/bị khóa theo nền tảng; PR GitHub qua API (+ README khi đã merge).
  - **Sự cố** (đỏ, thoát 1, issue `brand-watch`): live → bị gỡ/404/bị khóa, mất link, `rel` tụt so với mốc (lần kiểm đầu hoặc `expectedRel`), thêm noindex. **Thay đổi** (vàng): pending → đã lên/merge (đổi trạng thái sang live), PR bị đóng, rel nâng lên follow. **Kiểm tay**: 403/challenge/lỗi mạng – không bao giờ coi là bị gỡ.
  - **Thương hiệu** (`content/brand/watch.json`): tên miền na ná kiểm DNS (DoH `cloudflare-dns.com`: NS/A/AAAA/MX) – báo khi tên miền trước không phân giải nay phân giải, hoặc có MX mới (giữ đỏ tới khi bấm "Đã xem"); tài khoản mạng xã hội – tự kiểm GitHub/Bluesky/YouTube (hồ sơ công khai), nền tảng khác là danh sách để anh tự giữ tên.
  - **Bản sao chép**: `content-protect.yml` (hằng tuần, `copy-watch.mjs`) gửi kết quả lên cùng tab (`--push-copy`) – không dò trùng lặp.
- **Lưu & cảnh báo**: kết quả vào D1 (`bw_*`) qua `/api/backlinks` (ký HMAC bằng secret CI sẵn có `STUDIO_CALLBACK_SECRET`) → Quản trị → Cảnh báo có 3 dòng (Backlink & PR · Thương hiệu · Nghi bị chép). Thư (Worker lexkite-mail → `REPORT_NOTIFY_EMAIL`): sự cố nghiêm trọng (bị gỡ, bị khóa, tên miền na ná có MX, tài khoản của mình mất) gửi ngay 1 lần; bản tin tổng hợp mỗi tuần.
- **Cách xử lý**: mỗi sự cố có nút "Cách xử lý" trong Quản trị – mẫu DMCA điền sẵn (URL gốc + Wayback + URL vi phạm), checklist khiếu nại theo nền tảng, mẫu báo lạm dụng gửi nhà đăng ký tên miền.
- Không có secret/không đồng bộ được → vẫn chạy bằng file, kết quả ở artifact `pr-check` + issue GitHub.

