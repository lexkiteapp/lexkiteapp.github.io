# Landing lexkite.com (?home=1, /<lang>/) – spec-lite (owner 3/11)
> TL;DR: Một trang giới thiệu Stitch (Lexkite Kit) rõ giá trị trong 5 giây, một CTA chính "Học miễn phí", không làm phiền; sáng + tối, 390 + 1280; port nguyên HTML Stitch.
> Đọc khi: sửa `scripts/build-landing.mjs`, vẽ lại landing trên Stitch, landing-routing / stitch-web đỏ.

## Mục tiêu (đo được)
- Người lạ hiểu "Lexkite là gì + vì sao miễn phí + bắt đầu ở đâu" trong 5 giây: H1 + 1 câu phụ + CTA nằm trọn màn đầu ở 390×844 và 1280×800.
- Bấm CTA chính → `/app/?hl=<lang>` (không đăng ký trước, giống Duolingo "Get started"). CTR CTA đo bằng sự kiện sẵn có, không thêm script bên thứ ba.
- Lighthouse mobile ≥ bản đang chạy (mục tiêu ≥ 95), CLS ≈ 0, LCP ≤ 2,0 s (4G chậm), HTML ≤ 16 KB gz (không nới), ảnh lazy + AVIF/WebP.

## So sánh (bài học lấy, không chép)
| App | Điểm mạnh màn đầu | Lexkite làm |
|---|---|---|
| Duolingo | 1 câu lời hứa + 2 nút (Bắt đầu / Đã có tài khoản), nhân vật lớn, vui | H1 lời hứa + CTA chính + liên kết phụ "Tôi đã có tài khoản"; Ama/Carlos 2D thay linh vật |
| Babbel | Kết quả cụ thể ("nói chuyện sau 3 tuần"), bằng chứng | Dải số liệu thật (từ vựng, bài, 15 ngôn ngữ) – chỉ số có nguồn, không bịa |
| Busuu | Cộng đồng + chứng chỉ, lộ trình theo cấp | Lộ trình A1→C2 + IELTS/TOEIC/TOEFL thành thẻ |
| Speak | Demo hội thoại AI ngay đầu trang | Thẻ minh hoạ Gọi giáo viên (ảnh tĩnh, không tự phát âm thanh) |
| ELSA | Điểm phát âm trực quan | Thẻ chấm phát âm (ảnh UI thật) |
Lexkite vượt ở: 100 % miễn phí (không paywall, không tim/năng lượng), add-on tra từ trên mọi trang, 15 ngôn ngữ giao diện.

## Các section (thứ tự)
1. Top-bar: diều Lexkite · Blog · Từ vựng · nút ngôn ngữ · nút giao diện (`themeSwitch`) · "Mở app".
2. Hero: H1, câu phụ, CTA chính (cam, nút nhún) + phụ (Thêm vào Chrome / Tải app theo thiết bị), Ama 2D chạm nền.
3. Dải tin cậy: miễn phí 100 %, không quảng cáo chặn nội dung, 15 ngôn ngữ, số liệu thật.
4. Tính năng (4 thẻ): Flashcard FSRS · Gọi giáo viên AI · Luyện thi IELTS/TOEIC/TOEFL · Add-on tra từ.
5. Cách học (3 bước) với Carlos 2D.
6. Tài nguyên miễn phí (blog, công cụ, từ vựng – giữ mọi link cũ cho SEO).
7. FAQ (`<details>`, giữ JSON-LD FAQPage).
8. CTA cuối + chân trang chung (site-layout `siteFooter`, viên Tự động/Sáng/Tối).
Không bỏ nội dung nào đang có (no-cuts): mọi section hiện tại phải có chỗ trong bản mới.

## Trải nghiệm
- Không popup, không chặn nội dung, không tự phát âm thanh/video; gợi ý ngôn ngữ là dải nhỏ đóng được (đã có).
- Quảng cáo: theo `docs/ADS.md` (deny-by-default; landing không có ô quảng cáo trên màn đầu).
- Chuyển động: fade + nút nhún, tôn trọng reduced-motion. Tương phản ≥ 4,5:1 / ≥ 3:1 cả sáng lẫn tối.

## Thiết kế & port
- Stitch project `7268539912208977707`, design system `assets/1b7a8a3d3d52404bb332d9ba3f783547`; 4 màn: desktop sáng, desktop tối (edit từ bản sáng), mobile sáng, mobile tối. Prompt tả cảm giác, mỗi lần 1 màn; key theo `stitch-quota`.
- Port nguyên HTML (pipeline `stitch-v2-convert --web` + `scripts/lib/st-web.mjs` của #244): Tailwind biên dịch trên CI, không CDN; chỉ thay logo diều + `Chars.*` (2D). CSS ra file ngoài cache được để HTML ≤ 16 KB gz.
- Giữ SEO: title/meta/canonical/15 hreflang + x-default/JSON-LD; chữ 15 ngôn ngữ qua `docs/I18N-PIPELINE.md` + `i18n-qa --strict`.
- Theme: `themePage()` (một nguồn với app, `lk.theme`) – xem PR #303.

## Xong khi
- CI xanh: landing-routing (≤ 16 KB gz), stitch-web (SSIM 1280/390 × sáng/tối), theme-switch + theme-static, axe AA, Lighthouse mobile ≥ hiện tại, CLS ≤ 0,01, i18n-qa strict, seo-twin.
- Không tràn ngang @360, chạm ≥ 44 px, không lỗi JS; ảnh 4 màn trong artifact CI.
