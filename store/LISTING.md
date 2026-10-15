# Hồ sơ đăng Chrome Web Store – Lexkite

Mọi thứ cần dán vào Chrome Web Store Developer Dashboard. Ảnh nằm trong `store/` và gói tải lên là `vocaband-extension.zip`.

---

## 1. Thông tin cơ bản (tab **Store listing**)

**Tên (Name):** `Lexkite – Từ điển & Flashcard IELTS`  *(lấy từ manifest)*

**Mô tả ngắn (Summary, ≤132 ký tự):**
> Bấm đúp tra từ, bôi đen dịch câu, tra từ trong phụ đề YouTube; lưu kèm ngữ cảnh và ôn flashcard đúng thời điểm vàng.

**Danh mục (Category):** Education → Language learning
**Ngôn ngữ:** Tiếng Việt (thêm English ở mục “Add language” với bản mô tả tiếng Anh bên dưới)

### Mô tả chi tiết – Tiếng Việt

```
Lexkite giúp bạn học từ vựng IELTS ngay khi đang đọc báo, xem YouTube hay làm bài – rồi nhắc bạn ôn đúng “thời điểm vàng” trước khi quên.

🔎 TRA TỪ TỨC THÌ TRÊN MỌI TRANG WEB
• Bấm đúp vào bất kỳ từ tiếng Anh nào: phiên âm IPA Anh–Anh & Anh–Mỹ, phát âm, nghĩa tiếng Việt theo từ loại, định nghĩa, hình minh họa.
• Bôi đen cả câu hoặc đoạn văn → bấm 🌐 để dịch sang tiếng Việt, nghe đọc mẫu, sao chép.
• Chuột phải → “Tra từ” hoặc “Dịch đoạn đã chọn”.

▶️ HỌC TỪ QUA VIDEO YOUTUBE
• Bật phụ đề tiếng Anh, chạm vào từ bất kỳ trong phụ đề: video tự dừng, hiện nghĩa và bản dịch cả câu.
• Lưu từ kèm câu phụ đề và mốc thời gian – bấm lại để xem đúng đoạn video đó.

📌 TỪ GẮN NGỮ CẢNH – NHỚ LÂU HƠN
• Mỗi từ được lưu cùng câu gốc nơi bạn gặp nó (bài báo, video, bài đọc).
• Thư viện cá nhân tự phân loại: Từ YouTube, Từ trang web, Từ bài đọc, Từ tra từ điển.

🧠 ÔN TẬP THÔNG MINH THEO KHOA HỌC GHI NHỚ
• Lặp lại ngắt quãng bằng thuật toán FSRS (như Anki) với bước học 1 → 10 phút cho từ mới.
• “Thời điểm vàng”: nhắc đúng lúc từ sắp bị quên, có giờ yên lặng và giới hạn số thẻ mỗi phiên.
• 5 cấp độ nhớ, chỉ số % còn nhớ cho từng từ.

📚 1.200+ TỪ IELTS CHỌN LỌC (trong ứng dụng web đi kèm)
• 24 chủ đề IELTS, 570 từ học thuật AWL, phrasal verb, idiom cho Speaking, từ nối & collocation band 7+.
• Học thông minh, Ghép thẻ tính giờ, Điền từ, Nghe & chép, Luyện phát âm có chấm điểm, Bài kiểm tra ước tính band.
• Bài đọc IELTS: chạm vào từ để tra và lưu kèm ngữ cảnh.
• XP, cấp độ, nhiệm vụ hằng ngày, huy hiệu, chuỗi ngày học.

🔒 RIÊNG TƯ
• Không quảng cáo, không theo dõi lịch sử duyệt web. Dữ liệu học lưu trên máy bạn.

Lexkite là sản phẩm độc lập, không liên kết với British Council, IDP hay Cambridge. IELTS là nhãn hiệu của các tổ chức này.
```

### Description – English

```
Lexkite turns everything you read and watch into IELTS vocabulary practice – then reminds you to review at the "golden time", right before you forget.

• Double-click any English word on any website: British & American IPA, audio, Vietnamese meanings by part of speech, definitions and images.
• Select a sentence or paragraph and click 🌐 to translate it into Vietnamese, listen to it or copy it.
• YouTube: turn on English subtitles and tap any word in the captions – the video pauses and you get the meaning plus a translation of the whole line. Save it with the timestamp.
• Every saved word keeps the sentence where you found it (context learning).
• Spaced repetition (FSRS + learning steps), golden-time reminders with quiet hours, 5 memory levels.
• Companion web app with 1,200+ curated IELTS words (24 topics, the Academic Word List, phrasal verbs, idioms, linking words, band-7+ collocations), games, pronunciation scoring, reading passages, XP and badges.
• No ads, no browsing-history tracking.

Lexkite is independent and not affiliated with or endorsed by the British Council, IDP or Cambridge. IELTS is a trademark of those organisations.
```

**Ảnh (Graphic assets):**
| Mục | Kích thước | File |
|---|---|---|
| Store icon | 128×128 | `store/icon-128.png` |
| Screenshots (1–5) | 1280×800 | `store/screenshot-1.png` … `screenshot-5.png` |
| Small promo tile | 440×280 | `store/promo-small-440x280.png` |
| Marquee promo tile | 1400×560 | `store/promo-marquee-1400x560.png` |

**Trang web chính thức:** `https://vocaband.web.app`
**URL hỗ trợ:** `https://vocaband.web.app/privacy.html` (hoặc email hỗ trợ)

---

## 2. Tab **Privacy practices**

**Single purpose (Mục đích duy nhất):**
> Giúp người học tiếng Anh tra nghĩa, dịch và lưu từ vựng gặp trên web/YouTube kèm ngữ cảnh, rồi ôn tập bằng flashcard lặp lại ngắt quãng.

**Permission justifications (Giải thích từng quyền):**

| Quyền | Giải thích (dán vào ô tương ứng) |
|---|---|
| `storage` | Lưu từ vựng người dùng đã lưu, câu ngữ cảnh, lịch ôn tập và cài đặt trên máy của người dùng. |
| `alarms` | Lên lịch nhắc học hằng ngày và kiểm tra “thời điểm vàng” (khi có từ sắp bị quên) mỗi 15 phút. |
| `notifications` | Hiển thị thông báo nhắc ôn tập theo giờ người dùng chọn. |
| `contextMenus` | Thêm mục “Tra từ” và “Dịch đoạn đã chọn” vào menu chuột phải khi người dùng bôi đen chữ. |
| `scripting` | Kích hoạt tính năng tra từ trên các tab đang mở ngay sau khi cài/cập nhật, để người dùng không phải tải lại trang. |
| Host permission `http://*/*`, `https://*/*` | Tính năng cốt lõi là tra từ khi người dùng bấm đúp/bôi đen chữ trên bất kỳ trang web nào (kể cả phụ đề YouTube), nên content script phải chạy trên mọi trang. Tiện ích chỉ xử lý từ/câu người dùng chủ động chọn. |
| Host permission tới các API từ điển (translate.googleapis.com, api.dictionaryapi.dev, en.wiktionary.org, en.wikipedia.org, api.tatoeba.org, api.datamuse.com, api.mymemory.translated.net) | Lấy phiên âm, nghĩa, bản dịch, câu ví dụ và hình minh họa cho từ người dùng tra. |

**Remote code:** Chọn **“No, I am not using remote code”** (toàn bộ JavaScript nằm trong gói; chỉ gọi API lấy dữ liệu JSON).

**Data usage – tích các mục:**
- ✅ *Website content*: chỉ đoạn chữ người dùng chủ động chọn để tra/dịch, cùng câu chứa từ đó khi người dùng lưu.
- (Không tích các mục còn lại: personally identifiable info, health, financial, authentication, personal communications, location, web history, user activity.)

**Certifications – tích cả 3:**
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item’s single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** `https://vocaband.web.app/privacy.html`

---

## 3. Tab **Distribution**
- Visibility: **Public** (hoặc **Unlisted** để thử trước với bạn bè)
- Regions: All regions
- Pricing: Free

---

## 4. Các bước đăng ký & nộp (người sở hữu tài khoản tự làm)

1. Vào **https://chrome.google.com/webstore/devconsole** bằng tài khoản Google sẽ đứng tên nhà phát triển.
2. Chấp nhận điều khoản nhà phát triển và **trả phí đăng ký một lần 5 USD**. Tài khoản cần **bật xác minh 2 bước**.
3. Điền **Publisher name** (ví dụ: Lexkite) và xác minh email liên hệ.
4. Bấm **New item** → tải lên `vocaband-extension.zip` (tạo bằng `./scripts/build-extension.sh --zip`).
5. Điền tab **Store listing**, **Privacy practices**, **Distribution** theo nội dung ở trên, tải ảnh trong thư mục `store/`.
6. Bấm **Submit for review**. Thời gian duyệt thường vài ngày; tiện ích yêu cầu quyền truy cập mọi trang nên có thể được xem xét kỹ hơn.
7. Mỗi lần cập nhật: tăng `version` trong `extension/manifest.json`, build lại zip, vào item → **Package → Upload new package** → Submit.
