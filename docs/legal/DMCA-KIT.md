# Bộ hồ sơ DMCA của Lexkite (MẪU)

> **ĐÂY LÀ MẪU THAM KHẢO, KHÔNG PHẢI TƯ VẤN PHÁP LÝ.** Điều chỉnh theo từng vụ việc. Thông báo DMCA và phản thông báo được ký "under penalty of perjury" (chịu trách nhiệm hình sự nếu khai gian) và có thể dẫn tới kiện tụng tại Mỹ – vụ lớn, bên kia có luật sư, hoặc khi phải chấp nhận thẩm quyền tòa án Mỹ thì **hỏi luật sư sở hữu trí tuệ trước khi gửi**.

Liên quan: `docs/CONTENT-PROTECTION.md` (WAF, sổ băm, giám sát) · sổ bằng chứng `content/protection/registry.jsonl`.

---

## 1. Bằng chứng cần gom (mọi trường hợp)
Lệnh gom nhanh cho 1 bài: `node scripts/content-registry.mjs evidence https://lexkite.com/<lang>/blog/<slug>/`

| Bằng chứng | Lấy ở đâu | Chứng minh |
|---|---|---|
| Lịch sử git của file nguồn `.md` | `git log --follow --reverse -- content/blog/<lang>/<slug>.md`; link `github.com/lexkiteapp/lexkiteapp.github.io/commits/main/content/blog/<lang>/<slug>.md` | Bản nháp & ngày viết, do GitHub ghi giờ |
| Mục sổ băm `publish` | Lệnh `evidence` ở trên: `seq`, `at`, `sha256(HTML)`, `sha256(nguồn)`, `hash`, commit | HTML phục vụ lúc đăng; chuỗi băm chứng minh không sửa lùi |
| Bản lưu Wayback | Mục sổ `archive` (`https://web.archive.org/web/<thời điểm>/…`) | Bên thứ ba độc lập xác nhận trang tồn tại lúc đó |
| Dấu OpenTimestamps (Bitcoin) | `node scripts/ots.mjs export <seq>` → `lexkite-registry-<seq>.json` + `.ots` (kiểm ở opentimestamps.org hoặc `ots verify`; `docs/CONTENT-PROTECTION.md` §4b) | Khối Bitcoin xác nhận mục sổ (kèm sha256 HTML/nguồn) tồn tại từ thời điểm đó – không ai sửa lùi được |
| Ngày đăng trên trang | `<time datetime>`, JSON-LD `datePublished`, `article:published_time`, sitemap `lastmod` | Ngày công bố |
| Lập chỉ mục | GitHub Actions → *Blog publish* → lần chạy đúng giờ (log IndexNow/WebSub); Search Console → Kiểm tra URL → "Thu thập dữ liệu lần đầu" | Máy tìm kiếm biết bài của Lexkite trước |
| Câu hỏi luyện thi (~2.784) | Mục sổ `dataset` (gốc băm theo commit) + `git log -- web/js/<file>`; danh sách câu canary `content/protection/canaries.json` (Antigravity) | Kho đề có trước; câu canary độc nhất xuất hiện ở bản chép |
| Bản sao của bên kia | Ảnh chụp toàn trang có ngày giờ + URL; **lưu Wayback trang của họ**: mở `https://web.archive.org/save/<URL của họ>`; xem ngày đăng họ ghi | Họ đăng sau / sao chép nguyên văn |

Ghi nhật ký vụ việc (ngày, việc đã làm, mã khiếu nại) ngay trong issue GitHub nhãn `content-copy`.

## 2. Gỡ bản chép của người khác (takedown)
1. **Tìm đúng nơi gửi**
   - Nhà cung cấp hosting: `https://rdap.org/domain/<tên-miền>` (hoặc `whois <tên-miền>`) → nhà đăng ký tên miền + email *abuse*; `dig +short <tên-miền>` → IP → `whois <IP>` hoặc `https://bgp.he.net/ip/<IP>` → nhà mạng/hosting + email abuse.
   - Nếu IP thuộc **Cloudflare**: gửi ở `https://abuse.cloudflare.com` (mục *Copyright infringement & DMCA*) – Cloudflare chuyển cho hosting thật và báo lại tên hosting cho mình.
   - Nền tảng (Blogger, WordPress.com, Medium, Facebook, YouTube…): dùng form bản quyền riêng của nền tảng (tìm "<tên nền tảng> copyright report").
2. **Gỡ khỏi kết quả tìm kiếm** (song song, kể cả khi hosting không phản hồi)
   - Google: `https://reportcontent.google.com/forms/dmca_search` (Web Search – bản quyền). Theo dõi ở `https://reportcontent.google.com/` (Dashboard). Kiểm Lumen Database sau đó.
   - Bing/Microsoft: `https://www.microsoft.com/en-us/concern/` → *Copyright infringement*.
   - Trang chuyên cào (spam): báo thêm Google Search spam report trong Search Console (Help → Report spam).
3. **Gửi thông báo** theo mẫu §3 (tiếng Anh). Mỗi thông báo liệt kê từng cặp URL gốc ↔ URL vi phạm.
4. Chờ 3–10 ngày; không phản hồi → nhắc 1 lần, rồi gửi lên cấp trên (nhà mạng của hosting, nhà đăng ký tên miền).
5. Cập nhật issue `content-copy`; khi đã gỡ, lưu Wayback trang đã gỡ (bằng chứng).

## 3. Mẫu thông báo gỡ bỏ (17 U.S.C. §512(c)(3)) – TEMPLATE

```
Subject: DMCA Takedown Notice – infringement of Lexkite content (lexkite.com)

To: [Service provider / designated DMCA agent / abuse contact]

I am the [owner / authorized agent of the owner] of the copyrighted works described below,
published by Lexkite at https://lexkite.com.

1. Copyrighted work(s):
   - "[Title]" – https://lexkite.com/[lang]/blog/[slug]/ – first published [YYYY-MM-DD HH:MM UTC]
     (archived: https://web.archive.org/web/[timestamp]/https://lexkite.com/[lang]/blog/[slug]/)
   [repeat for each work; for practice questions: "Lexkite practice question set [name], published in the
   Lexkite app at https://lexkite.com/ since [date]"]

2. Infringing material and its location (please remove or disable access):
   - https://[infringing-site]/[path]  – copies the text of the work above [verbatim / with minor edits],
     published on or after [date]
   [repeat for each URL]

3. Contact information:
   Name: [Full legal name]            Organization: Lexkite
   Address: [Postal address]
   Email: [email]                     Phone: [phone]

4. I have a good faith belief that use of the material in the manner complained of is not authorized
   by the copyright owner, its agent, or the law.

5. The information in this notification is accurate, and under penalty of perjury, I am the owner,
   or am authorized to act on behalf of the owner, of an exclusive right that is allegedly infringed.

Supporting evidence (available on request): version-control history with timestamps, a SHA-256
hash-chained publication registry with OpenTimestamps (Bitcoin) proofs of existence, Internet Archive
snapshots, and search-engine first-crawl dates.

Signature: /[Full legal name]/
Date: [YYYY-MM-DD]
```

## 4. Bị gửi DMCA GIẢ nhắm vào Lexkite – phản thông báo (17 U.S.C. §512(g)(3))
1. **Không xóa bằng chứng.** Gom bằng chứng §1 cho đúng URL bị gỡ; lưu Wayback trang của người khiếu nại; tải bản thông báo (Google: email + Lumen; hosting: email).
2. Kiểm tra: họ có tác phẩm gốc thật không? So ngày: commit git + sổ băm + Wayback của Lexkite **trước** ngày trang họ xuất hiện → khiếu nại sai.
3. Gửi phản thông báo:
   - Google: `https://support.google.com/legal/contact/lr_counternotice` (chọn sản phẩm Web Search).
   - Hosting/nền tảng khác: gửi mẫu dưới tới DMCA agent của họ.
4. Theo luật Mỹ, nhà cung cấp khôi phục nội dung sau **10–14 ngày làm việc** kể từ khi nhận phản thông báo, trừ khi người khiếu nại báo đã khởi kiện. Lưu ý: phản thông báo sẽ được chuyển cho người khiếu nại, **gồm tên, địa chỉ, điện thoại** của mình.
5. Khiếu nại sai cố ý có thể bị kiện bồi thường theo **17 U.S.C. §512(f)** (misrepresentation) – nêu điều này trong thư gửi nhà cung cấp nếu họ lặp lại; trao đổi với luật sư nếu muốn theo đuổi.
6. Song song: báo Google Search Console nếu trang bị gỡ khỏi chỉ mục; nếu kẻ khiếu nại cũng là trang chép bài → làm takedown §2 với họ.

**Mẫu phản thông báo – TEMPLATE (đủ 4 yếu tố §512(g)(3))**
```
Subject: DMCA Counter-Notification – [complaint / reference ID]

To: [Service provider's designated agent]

1. Signature: /[Full legal name]/  (physical or electronic signature of the subscriber)

2. Identification of the material removed and its location before removal:
   - https://lexkite.com/[lang]/blog/[slug]/   (removed / de-indexed on [date],
     notice reference [ID], complainant "[name]")

3. I swear, under penalty of perjury, that I have a good faith belief that the material identified
   above was removed or disabled as a result of mistake or misidentification of the material to be
   removed or disabled. The material is original work authored and first published by Lexkite on
   [YYYY-MM-DD], as shown by [version-control history / Internet Archive snapshot
   https://web.archive.org/web/[timestamp]/... / SHA-256 publication registry entry #[seq]],
   which predates the complainant's page.

4. Name: [Full legal name]          Organization: Lexkite
   Address: [Postal address, country]
   Phone: [phone]                   Email: [email]
   [If address is outside the United States:]
   I consent to the jurisdiction of any judicial district in which [service provider] may be found,
   and I will accept service of process from the person who provided the original notification
   or an agent of such person.
   [If address is in the United States:]
   I consent to the jurisdiction of the Federal District Court for the judicial district in which my
   address is located, and I will accept service of process from the person who provided the
   original notification or an agent of such person.

Date: [YYYY-MM-DD]
```

## 5. Ghi chú thêm (Việt Nam)
- Quyền tác giả phát sinh khi tác phẩm được tạo ra và thể hiện dưới hình thức vật chất, không bắt buộc đăng ký (Luật Sở hữu trí tuệ). Đăng ký tại **Cục Bản quyền tác giả** là tùy chọn nhưng là chứng cứ mạnh khi tranh chấp trong nước – cân nhắc cho bộ câu hỏi luyện thi.
- Trang chép đặt tại Việt Nam: có thể gửi kèm thông báo tới nhà cung cấp hosting trong nước; vụ nghiêm trọng hỏi luật sư về khiếu nại hành chính/khởi kiện dân sự.
- Không trả lời đe dọa/tống tiền qua kênh riêng; mọi trao đổi bằng email, lưu lại toàn bộ.
