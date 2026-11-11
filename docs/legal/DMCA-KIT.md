# Bộ hồ sơ DMCA của Lexkite (MẪU)

> TL;DR: Bộ hồ sơ DMCA mẫu của Lexkite (không phải tư vấn pháp lý): gỡ bản chép (Google, Cloudflare, host), thư mẫu tiếng Anh + thư kèm 15 ngôn ngữ, phản thông báo, checklist đăng ký DMCA agent / quyền tác giả VN / nhãn hiệu Lexkite cho owner.
> Đọc khi: xử lý DMCA, có canary/bài bị chép, hoặc owner chuẩn bị đăng ký.

> **ĐÂY LÀ MẪU THAM KHẢO, KHÔNG PHẢI TƯ VẤN PHÁP LÝ.** Điều chỉnh theo từng vụ việc. Thông báo DMCA và phản thông báo được ký "under penalty of perjury" (chịu trách nhiệm hình sự nếu khai gian) và có thể dẫn tới kiện tụng tại Mỹ – vụ lớn, bên kia có luật sư, hoặc khi phải chấp nhận thẩm quyền tòa án Mỹ thì **hỏi luật sư sở hữu trí tuệ trước khi gửi**.

Liên quan: `docs/CONTENT-PROTECTION.md` (WAF, sổ băm, giám sát) · sổ bằng chứng `content/protection/registry.jsonl`.

---

## 1. Bằng chứng cần gom (mọi trường hợp)
Lệnh gom đủ (băm, OTS, tem RFC 3161, DOI Zenodo, Wayback, Software Heritage, git): `node scripts/content-registry.mjs evidence <url|seq|canary-id>` – nguồn: `docs/CONTENT-PROTECTION.md` §4b–§4c.

| Bằng chứng | Lấy ở đâu | Chứng minh |
|---|---|---|
| Lịch sử git của file nguồn `.md` | `git log --follow --reverse -- content/blog/<lang>/<slug>.md`; link `github.com/lexkiteapp/lexkiteapp.github.io/commits/main/content/blog/<lang>/<slug>.md` | Bản nháp & ngày viết, do GitHub ghi giờ |
| Mục sổ băm `publish` | Lệnh `evidence` ở trên: `seq`, `at`, `sha256(HTML)`, `sha256(nguồn)`, `hash`, commit | HTML phục vụ lúc đăng; chuỗi băm chứng minh không sửa lùi |
| Bản lưu Wayback | Mục sổ `archive` (`https://web.archive.org/web/<thời điểm>/…`) | Bên thứ ba độc lập xác nhận trang tồn tại lúc đó |
| Dấu OpenTimestamps (Bitcoin) | `node scripts/ots.mjs export <seq>` → `lexkite-registry-<seq>.json` + `.ots` (kiểm ở opentimestamps.org hoặc `ots verify`; `docs/CONTENT-PROTECTION.md` §4b) | Khối Bitcoin xác nhận mục sổ (kèm sha256 HTML/nguồn) tồn tại từ thời điểm đó – không ai sửa lùi được |
| Ngày đăng trên trang | `<time datetime>`, JSON-LD `datePublished`, `article:published_time`, sitemap `lastmod` | Ngày công bố |
| Lập chỉ mục | GitHub Actions → *Blog publish* → lần chạy đúng giờ (log IndexNow/WebSub); Search Console → Kiểm tra URL → "Thu thập dữ liệu lần đầu" | Máy tìm kiếm biết bài của Lexkite trước |
| Câu hỏi luyện thi (~2.784), kho từ | Mục sổ `dataset` (gốc băm theo commit) + `git log -- web/js/<file>`; canary `content/protection/canaries.json` (tên riêng hư cấu, `docs/CONTENT-PROTECTION.md` §9) + `git log -S '<cụm q>'` cho ngày cài | Kho đề có trước; tên hư cấu độc nhất xuất hiện ở bản chép = chép từ Lexkite |
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
3. **Gửi thông báo** theo mẫu §3 (tiếng Anh – bản có giá trị pháp lý), kèm đoạn mở đầu ngôn ngữ của bên nhận (§3b) nếu họ không dùng tiếng Anh. Mỗi thông báo liệt kê từng cặp URL gốc ↔ URL vi phạm.
   - **Cloudflare** không gỡ nội dung của khách – chỉ chuyển thông báo cho hosting thật và cho mình biết tên hosting → gửi tiếp cho hosting đó.
   - **GitHub** (bản chép kho đề/từ, thường do canary GitHub code search phát hiện): `https://github.com/contact/dmca-notice` (form DMCA; ghi đúng file/dòng). Fork của repo công khai vẫn là bản sao – LICENSE không cấp quyền dùng lại.
   - **Hugging Face / Kaggle** (bộ dữ liệu): HF – email `dmca@huggingface.co`; Kaggle – form "Report" trên trang dataset + `https://www.kaggle.com/dmca`.
   - **App store** (app chép đề): Apple `https://www.apple.com/legal/internet-services/itunes/appstorenotices/`; Google Play `https://support.google.com/legal/troubleshooter/1114905` (Google Play → bản quyền).
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

### 3b. Thư kèm theo ngôn ngữ bên nhận (dán TRÊN mẫu §3 tiếng Anh)
Mẫu §3 tiếng Anh luôn đi kèm và là bản có giá trị; đoạn dưới chỉ để bên nhận hiểu nhanh.
| | Đoạn mở đầu |
|---|---|
| en | This is a copyright infringement notice. Your service hosts copies of original content owned by Lexkite (lexkite.com). Please remove or disable access to the URLs listed in the formal notice below. |
| vi | Đây là thông báo vi phạm bản quyền. Dịch vụ của quý vị đang lưu trữ bản sao nội dung gốc thuộc sở hữu của Lexkite (lexkite.com). Đề nghị gỡ bỏ hoặc chặn truy cập các URL nêu trong thông báo chính thức (tiếng Anh) bên dưới. |
| es | Este es un aviso de infracción de derechos de autor. Su servicio aloja copias de contenido original propiedad de Lexkite (lexkite.com). Les rogamos que eliminen o bloqueen el acceso a las URL indicadas en el aviso formal (en inglés) que figura a continuación. |
| pt | Este é um aviso de violação de direitos autorais. O seu serviço hospeda cópias de conteúdo original de propriedade da Lexkite (lexkite.com). Solicitamos que removam ou bloqueiem o acesso às URLs listadas no aviso formal (em inglês) abaixo. |
| fr | Ceci est une notification de violation du droit d’auteur. Votre service héberge des copies de contenus originaux appartenant à Lexkite (lexkite.com). Merci de supprimer ou de rendre inaccessibles les URL listées dans la notification officielle (en anglais) ci-dessous. |
| de | Dies ist eine Mitteilung über eine Urheberrechtsverletzung. Ihr Dienst hostet Kopien von Originalinhalten, die Lexkite (lexkite.com) gehören. Bitte entfernen oder sperren Sie die in der folgenden formellen Mitteilung (auf Englisch) aufgeführten URLs. |
| id | Ini adalah pemberitahuan pelanggaran hak cipta. Layanan Anda menyimpan salinan konten asli milik Lexkite (lexkite.com). Mohon hapus atau nonaktifkan akses ke URL yang tercantum dalam pemberitahuan resmi (bahasa Inggris) di bawah ini. |
| th | นี่คือหนังสือแจ้งการละเมิดลิขสิทธิ์ บริการของท่านโฮสต์สำเนาเนื้อหาต้นฉบับที่เป็นของ Lexkite (lexkite.com) โปรดลบหรือปิดการเข้าถึง URL ที่ระบุในหนังสือแจ้งอย่างเป็นทางการ (ภาษาอังกฤษ) ด้านล่าง |
| zh | 这是一份版权侵权通知。贵方服务托管了属于 Lexkite（lexkite.com）的原创内容的副本。请删除或屏蔽下方正式通知（英文）中列出的网址。 |
| ja | これは著作権侵害の通知です。貴社のサービスに、Lexkite（lexkite.com）が所有するオリジナルコンテンツの複製が掲載されています。以下の正式な通知（英語）に記載された URL の削除またはアクセス停止をお願いいたします。 |
| ko | 본 메일은 저작권 침해 통지입니다. 귀사의 서비스에 Lexkite(lexkite.com)가 소유한 원본 콘텐츠의 복제본이 게시되어 있습니다. 아래 공식 통지(영문)에 기재된 URL을 삭제하거나 접근을 차단해 주시기 바랍니다. |
| hi | यह कॉपीराइट उल्लंघन की सूचना है। आपकी सेवा पर Lexkite (lexkite.com) के स्वामित्व वाली मूल सामग्री की प्रतियाँ होस्ट की गई हैं। कृपया नीचे दी गई औपचारिक सूचना (अंग्रेज़ी में) में सूचीबद्ध URL हटाएँ या उन तक पहुँच बंद करें। |
| ar | هذا إشعار بانتهاك حقوق النشر. تستضيف خدمتكم نسخًا من محتوى أصلي مملوك لـ Lexkite ‏(lexkite.com). نرجو إزالة الروابط المذكورة في الإشعار الرسمي (باللغة الإنجليزية) أدناه أو تعطيل الوصول إليها. |
| ru | Это уведомление о нарушении авторских прав. Ваш сервис размещает копии оригинальных материалов, принадлежащих Lexkite (lexkite.com). Просим удалить или заблокировать доступ к URL-адресам, указанным в официальном уведомлении (на английском языке) ниже. |
| tr | Bu bir telif hakkı ihlali bildirimidir. Hizmetiniz, Lexkite’a (lexkite.com) ait özgün içeriğin kopyalarını barındırmaktadır. Lütfen aşağıdaki resmi bildirimde (İngilizce) listelenen URL’leri kaldırın veya erişime kapatın. |

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

## 6. Checklist đăng ký cho OWNER (Claude KHÔNG tự làm)
**Owner chốt 3/11/2026: giai đoạn này 100% miễn phí** – mục 1–4 (tốn phí) để SAU khi app có doanh thu; trong lúc chờ, bằng chứng miễn phí §4c của `docs/CONTENT-PROTECTION.md` (RFC 3161, OTS, Wayback, Software Heritage, Zenodo, nhật ký nhãn hiệu ™) chạy tự động. Giá tham khảo 11/2026, kiểm lại trước khi trả.
1. **DMCA designated agent – US Copyright Office (~$6, 3 năm):** `https://dmca.copyright.gov` → tạo tài khoản → *Designate an agent* → tên pháp nhân **MODIAN LUXURY JEWELRY LLC**, tên khác **Lexkite**, agent = owner hoặc dịch vụ agent, địa chỉ (có thể là địa chỉ đăng ký Wyoming), email `support@lexkite.com` → trả phí → lưu số đăng ký. **Gia hạn trước 3 năm** (quá hạn mất "safe harbor"). Xong thì: nhắn Claude số đăng ký để ghi vào Điều khoản §9 `#dmca` (tên + địa chỉ agent).
2. **Quyền tác giả Việt Nam – Cục Bản quyền tác giả (tùy chọn, chứng cứ mạnh khi tranh chấp trong nước):** `https://cov.gov.vn` → hồ sơ: tờ khai, 2 bản tác phẩm (in/xuất PDF bộ đề + lời giải, hoặc chương trình máy tính), giấy cam đoan, giấy tờ chủ thể (LLC nước ngoài cần ủy quyền/dịch công chứng) → lệ phí nhà nước khoảng vài trăm nghìn đồng/tác phẩm (chương trình máy tính/bộ đề cao hơn tác phẩm viết). Ưu tiên: bộ đề luyện thi + kho từ + nhân vật Ama/Carlos (tác phẩm mỹ thuật).
3. **Đăng ký quyền tác giả Mỹ (tùy chọn, ~$45–$65/tác phẩm, copyright.gov/registration):** cần có đăng ký trước khi kiện tại Mỹ và để đòi bồi thường luật định; nộp theo nhóm (blog: *Group Registration of Short Online Literary Works*; kho đề: *literary work* hoặc *database*).
4. **Nhãn hiệu "Lexkite":** USPTO (`https://www.uspto.gov/trademarks/apply`, ~$350/nhóm; nhóm 9 app + 41 giáo dục) · Việt Nam – Cục Sở hữu trí tuệ (`https://ipvietnam.gov.vn`, khoảng 1–2 triệu đồng/nhóm) · quốc tế qua hệ thống Madrid (WIPO) khi có đăng ký gốc. Tra trùng trước: USPTO Trademark Search, WIPO Global Brand Database, IP Vietnam WIPO Publish. Sau khi có số đơn: đổi ™ → ® chỉ khi đã **cấp** (Mỹ).
5. **Đưa nội dung sang repo private** (đề, lời giải, kho từ, blog nguồn): quyết định kiến trúc (ảnh hưởng runner miễn phí/Pages) – owner quyết; sau khi chuyển, `LICENSE` vẫn giữ cho phần còn công khai.
6. **Token Zenodo (miễn phí):** ĐÃ CÓ 3/11/2026 – secret `ZENODO_TOKEN` (`docs/CONTENT-PROTECTION.md` §4c). Xoay vòng: tạo token mới cùng scope → cập nhật secret → xóa token cũ.
7. **Brave Search API key (miễn phí):** để dò bản chép trên toàn web (không chỉ GitHub) – `docs/CONTENT-PROTECTION.md` §6 bước 5.

