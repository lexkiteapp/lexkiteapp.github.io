# Giáo viên 3D trong app – thiết kế v2 + pilot (chủ DUYỆT §9 ngày 27/10/2026)

> TL;DR: **Call with Ama / Carlos** chạy **local-first trên máy**: kịch bản dạng đồ thị, giọng Kokoro sinh sẵn trên CI kèm **mốc âm vị (viseme)**,
> nhận dạng giọng trên máy, AI tự do = Gemini Nano trên máy. Server chỉ là dự phòng có trần + cầu dao, hết thì về kịch bản → phần cuộc gọi **$0 ở 1M DAU**.
> Khớp môi THẬT theo âm vị: đề xuất **pilot A/B trước khi chọn**: (A) avatar 3D glTF + three.js/TalkingHead, (B) **viseme sprite** = ảnh Kling 3D + 10–15
> hình miệng, nhẹ, chạy cả máy yếu. Clip video Kling (khớp nhịp, không khớp từng âm) giữ cho short, clip trong bài và máy rất yếu.
> Rủi ro lớn nhất: (1) chưa có đường **miễn phí** ra mô hình 3D có 52 blendshape giống hệt nét Kling; (2) điều khoản CDN Cloudflare hạn chế phục vụ
> **video** ở gói Free → cuộc gọi không được phụ thuộc video; (3) đồng bộ D1 cho hàng triệu người KHÔNG miễn phí (`CAPACITY.md`: 1M DAU ≈ 1.550 USD/tháng).
> Chủ duyệt 27/10: local-first + kịch bản = xương sống ✔ · chạy 2 pilot 0 credit ✔ · đổi Call Mia → Call with Ama/Carlos ✔ · credit: CHỜ sau pilot · đồng bộ Drive: xong (PR #146).
> Chủ chọn **B (sprite)**. B v2 (§5.4): đầu/vai/chớp mắt từ footage thật + 10 hình miệng bám đầu, Ama ≈ 190 KB, Carlos ≈ 175 KB, lệch môi p95 16,6 ms @60 Hz. Pilot: `docs/mocks/teacher-pilot/`; mock gọi: `docs/mocks/teacher-call/`.

## 1. Mục tiêu (chủ 27/10)
Nhúng được web + add-on Chrome + Android (WebView Capacitor); nhẹ nhất; công nghệ MIỄN PHÍ tiên tiến nhất; ít lỗi ngầm; ngang Duolingo Video Call / Praktika / Speak;
**100 % miễn phí ở hàng triệu DAU**; chỉ 2 người dẫn Ama 3D + Carlos 3D (bộ mới `teachers3d/carlos2/`).

## 2. Kiến trúc (mọi thứ trên máy, server = tùy chọn)
| Lớp | Đường chính (trên máy, $0) | Dự phòng | Hạ cấp cuối |
|---|---|---|---|
| Nhân vật | Tầng 3D (A) hoặc sprite (B), chọn theo đo máy (§5) | clip video 480p talk/listen (khớp nhịp) | ảnh tĩnh + Kit |
| Giọng giáo viên | Kokoro (cùng giọng video) **sinh sẵn trên CI** cho mọi câu kịch bản: `mp3` ~15 KB + `visemes.json` (mốc âm vị/từ) | câu tự do: HeadTTS/kokoro-js WebGPU (chỉ máy mạnh – đúng máy có Nano) | `speechSynthesis` + viseme suy từ chữ theo mốc từ |
| Nghe người học | Web Speech (`processLocally` Chrome 139+), Android: `UI.recognize` → Whisper trên máy (transformers.js, đã dùng) | chạm câu gợi ý | gõ phím |
| "Não" | đồ thị kịch bản trên máy (mở rộng `js/call/calls.js`: nút, nhánh regex/từ khóa, câu sửa lỗi) | Gemini Nano (Prompt API) cho lượt tự do | `/api/ai` kind `rp` (trần + cầu dao) → hết thì về đồ thị |
| Tiến độ | IndexedDB trên máy | đồng bộ gói sẵn có (1 dòng nén / lần, đã gộp) chỉ khi đăng nhập | – |

Máy trạng thái nhân vật: `idle → talk(line) → listen → react(good|try|proud) → idle`. Video: 2 lớp `<video>` chồng, chuyển ở **khung khớp** (clip nối từ cùng
khung đầu/cuối) + crossfade 120–180 ms → không nháy. 3D/sprite: không cần chuyển clip, miệng chạy theo `visemes.json`, thân dùng vòng idle/listen.

**Độ trễ mục tiêu < 1,2 s/lượt**: kịch bản ≈ 0,1–0,3 s (âm thanh đã đệm, khớp nhánh tại máy, `call.js` hiện ≤ 0,3 s); Nano: nhận dạng xong → câu đầu
streaming ~0,5–1 s trên máy đủ cấu hình (đo trong pilot); server dự phòng: chấp nhận ~1,5–2,5 s, có câu đệm của giáo viên ("Hmm, let me think…") đã sinh sẵn.

**Nhúng**: web = bundle lười `call` (không vào shell ≤ 380 KB). Android = cùng mã web trong Capacitor; clip/sprite/audio kịch bản **đóng gói sẵn trong APK** (~3–6 MB)
→ chạy ngoại tuyến. Add-on: MV3 cấm mã từ xa (`CWS-RULES.md`) và micro trong popup phiền → add-on **mở tab `lexkite.com/app/#/call`** (không đổi
`permissions.lock`, không nhét three.js vào gói). Ngoại tuyến: SW đệm gói nhân vật + audio của cuộc gọi đã mở; chỉ AI server cần mạng.

## 2b. Tải theo nhu cầu & ngân sách dung lượng (đo gzip trên main 27/10, "ước" = chưa đo)
Luật: không bao giờ tải cả kho; mỗi màn tải gói riêng khi mở; chỉ **prefetch gói của cuộc gọi/bài kế tiếp** lúc rảnh (`requestIdleCallback`) khi
`!saveData` và mạng 4g (web không biết chắc Wi-Fi – `connection.type` chỉ có trên Chrome Android); Service Worker đệm theo gói, lần sau 0 byte.
Video bài học dài = **YouTube** qua mặt tiền nhẹ **đã có** (`web/js/lesson-video.js`: poster WebP của mình, 0 byte YouTube trước khi bấm, `youtube-nocookie`, lùi về bản tự lưu nhỏ khi YouTube chặn).
Tự lưu trữ CHỈ clip ngắn giáo viên + tài sản avatar cuộc gọi (cần chuyển liền mạch). Ảnh: AVIF/WebP + `srcset` + `loading=lazy` (theo `vocab-img.js`).
| Màn | Hiện nay | Thiết kế mới, lần đầu | Lần sau |
|---|---:|---:|---:|
| Khung app (mọi màn) | 365 KB gz (PR #123, trần 380) | +0 (mọi thứ mới đều lười) | SW |
| Gọi – mã | `call.js` 7,6 + `calls.js` 5,9 = 13,5 KB | + `teach.js` ~4 KB (ước) | 0 |
| Gọi – nhân vật tầng C (clip) | ảnh Mia 16 KB | bank v2: poster 19 + listen 271 + 1 talk 371 = **≈ 660 KB**; talk thứ 2 tải sau | 0 |
| Gọi – nhân vật tầng B (sprite) | – | ≈ 100–200 KB (ước) | 0 |
| Gọi – nhân vật tầng A (3D) | – | three.js ~170 KB + `.glb` ≤ 8 MB – chỉ máy mạnh, 4g/không saveData hoặc bấm "tải bản 3D" | 0 |
| Gọi – giọng kịch bản | TTS máy | 8 câu × ~15 KB mp3 + ~2 KB `visemes.json`/câu ≈ **140 KB / cuộc gọi** | 0 |
| Phát âm | gói `pron` 50,8 KB | + 3 clip phản ứng 5 s ≈ 3 × 120 KB (ước), tải lúc rảnh sau khi mở màn | 0 |
| Từ của ngày / mở bài | thẻ chữ | poster ~19 KB; clip 270–370 KB **chỉ khi bấm** | 0 |
| Video bài học | mặt tiền YouTube (poster WebP) | giữ nguyên | – |
Trần đề xuất (đưa vào `size-budget.mjs`, chỉ được giảm): màn gọi tầng B/C lần đầu ≤ 700 KB, phát âm ≤ 450 KB, mọi micro-clip ≤ 300 KB/10 s, `.glb` ≤ 8 MB.

## 3. Giới hạn miễn phí đã kiểm (nguồn chính thức, đọc 27/10/2026)
| Dịch vụ | Free | Ghi chú cho thiết kế |
|---|---|---|
| R2 | 10 GB, 1M Class A + 10M Class B / tháng, egress $0 ([pricing](https://developers.cloudflare.com/r2/pricing/)) | lượt trúng cache CDN ở tên miền riêng *gần như chắc* không tính Class B (không có câu chính thức) |
| Điều khoản CDN | [service-specific terms](https://www.cloudflare.com/service-specific-terms-application-services/) (28/9/2026): video/tệp lớn chiếm tỷ trọng lớn cần gói trả phí | **cuộc gọi không phụ thuộc video**; clip đóng trong APK; web chỉ tải 1 lần rồi đệm |
| Workers/Pages Functions | 100k lượt/ngày dùng chung ([limits](https://developers.cloudflare.com/workers/platform/limits/)) | tài sản cuộc gọi KHÔNG qua Worker (Worker âm thanh hiện tại = 12 lượt/DAU → phải đổi sang tĩnh trước khi scale) |
| Static assets | "free and unlimited" nếu không gọi Worker ([billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)); ≤ 25 MiB/tệp, 20k tệp | nơi đặt `.glb`, sprite, `mp3`, `visemes.json` |
| D1 | 5M dòng đọc + 100k dòng ghi / ngày, 5 GB ([pricing](https://developers.cloudflare.com/d1/platform/pricing/)) | cuộc gọi thêm **0 dòng** (thống kê gộp vào gói sync sẵn có) |
| Workers AI | 10k neuron/ngày; Whisper 41 neuron/phút (≈ 243 phút/ngày); Llama 3.2 3B 4,6/30,5 neuron mỗi 1k token vào/ra ([pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)) | 1 lượt 3B (~500 vào + 60 ra) ≈ 4 neuron → ≈ 2.000 lượt/ngày/tài khoản ở 80 % |
| Groq | Llama 8B ~14,4k yêu cầu/ngày/khóa (nguồn phụ, CHƯA chắc – xem console) | chỉ dự phòng, sau cầu dao |
| Chrome Prompt API (Nano) | Chrome 138 (extension) / 148 (web); cần ≥ 22 GB trống + GPU > 4 GB VRAM hoặc 16 GB RAM; Win/Mac/Linux/Chromebook Plus; **không có trên Chrome Android/iOS** ([docs](https://developer.chrome.com/docs/ai/prompt-api)) | AI tự do chủ yếu cho desktop mạnh |
| ML Kit GenAI Prompt (Android) | **beta**, chỉ máy có AICore (Pixel 9/10, Galaxy S25/S26… – nguồn phụ) | chỉ app Android native, máy cao cấp |
| GrabCast owner-ai | ≤ 10k lượt/ngày tổng, chỉ job CI | đường người dùng KHÔNG dùng; CI sinh kịch bản 1 lần trong ngân sách `infra/jobs.json` |

## 4. Bảng chi phí 1M DAU (riêng tính năng cuộc gọi; giả sử 20 % DAU gọi 1 cuộc ~8 lượt, 5 % thiết bị mới/ngày)
| Thành phần | Khối lượng/ngày | Free? | Gãy ở đâu |
|---|---:|---|---|
| Tải gói nhân vật lần đầu (3D ≤ 8 MB hoặc sprite ~1,5 MB) + audio kịch bản | 50k thiết bị × ≤ 8 MB ≈ 400 GB | $0 (static, egress $0) | điều khoản CDN nếu Cloudflare coi là "tệp lớn tỷ trọng cao" → giảm: sprite thay 3D trên mobile, gói trong APK |
| Lượt tải tài sản qua Worker | 0 | $0 | (nếu để qua Worker như audio hiện tại: 100k/ngày gãy ở ~8k DAU) |
| Nhận dạng giọng | 1,6M lượt, trên máy | $0 | – |
| Câu trả lời kịch bản | ~1,3M lượt, trên máy | $0 | – |
| AI tự do Nano | desktop đủ cấu hình (~10–20 % người gọi, ước) | $0 | – |
| AI tự do server | trần cứng ≈ 2.000 lượt/tài khoản Workers AI + Groq | $0 | **cầu dao** → về kịch bản. Ở 1M DAU chỉ ~0,1–0,5 % người gọi được AI server |
| D1 | +0 dòng | $0 | (toàn app: đồng bộ D1 ở 1M DAU **không miễn phí** – xem dưới) |

**Đồng bộ toàn app ở hàng triệu DAU (nói thẳng):** `CAPACITY.md` đo free ≈ 2.420 DAU (nút thắt lượt Functions ≈ 41/DAU), Paid 1M DAU ≈ 1.550 USD/tháng.
Muốn $0: (1) local-first là mặc định cho mọi người (IndexedDB, đã có); (2) đồng bộ chỉ khi đăng nhập, gộp 1 lần/phiên (không phải mỗi 20 s);
(3) chuyển nơi lưu đồng bộ sang **Google Drive appDataFolder của chính người học** (OAuth phía máy, 0 dòng D1, 0 Functions – cần kiểm quota Drive API theo dự án);
(4) D1 chỉ giữ bảng xếp hạng/lớp học. Việc này là dự án riêng, không thuộc tính năng giáo viên.

## 5. Khớp môi theo âm vị (chủ: cuộc gọi phải khớp từng âm như Duolingo)
| | (A) Avatar 3D realtime | (B) Viseme sprite | (C) Clip video Kling | (D) Kling Lip-Sync theo câu |
|---|---|---|---|---|
| Khớp môi | thật (15 viseme Oculus + 52 ARKit) | thật (10–15 hình miệng) | chỉ nhịp | thật, từng câu cố định |
| Giống nét Kling | thấp–trung bình (realtime ≠ video render) | **100 %** (chính ảnh Kling) | 100 % | 100 % |
| Tải | 5–10 MB + three.js ~170 KB gz | ~0,1–0,2 MB (1 ảnh nền 480×640 + 12 mảnh miệng nhỏ WebP, ước) + ~5 KB mã | 0,25 MB/clip | 1 clip/câu |
| Máy yếu | rủi ro (không có benchmark công bố) | chạy mọi máy (canvas 2D) | mọi máy | mọi máy |
| Sống động | cao: đầu/mắt/biểu cảm | trung bình: chớp mắt, thở, nghiêng nhẹ, miệng | cao nhưng lệch môi | cao |
| Chi phí | mô hình: §5.1 | ~15 credit ảnh (ước) | 0 (đã có) | credit MỖI câu – chỉ kịch bản, không scale |
Driver chung cho A/B: CI sinh `visemes.json` từ Kokoro (phoneme + mốc thời gian; HeadTTS – Kokoro, MIT, xuất viseme + mốc âm vị) → máy chỉ phát `mp3` + đọc mốc.
Câu tự do (hiếm): HeadTTS WebGPU trên desktop, hoặc mốc từ `speechSynthesis` + `lipsync-en` của TalkingHead (gần đúng).

### 5.1 Lấy mô hình 3D giống Ama/Carlos (chưa có đường miễn phí "1 cú bấm")
- Ready Player Me đã **đóng 31/1/2026** (Netflix mua). Avaturn: có ARKit/viseme nhưng điều khoản giá chưa rõ (có nguồn nói 800 USD/tháng). VRoid: miễn phí nhưng nét anime, lệch nét Kling.
- Ảnh→3D: **Meshy Free** (100 credit/tháng, 20/lần, CC BY 4.0 – thương mại được nếu ghi công) → lưới tĩnh, topo mặt kém. Hunyuan3D 2.1: giấy phép **loại trừ EU/UK/Hàn** → không dùng (app 15 ngôn ngữ toàn cầu). TRELLIS: phụ thuộc nvdiffrast giấy phép nghiên cứu → không dùng.
- **MPFB** (MakeHuman cho Blender, tài sản CC0/CC-BY): đường MIỄN PHÍ duy nhất ra mô hình có rig + ARKit/viseme mà TalkingHead đọc được (pilot A dùng chính mẫu CC0 này) – nhưng nét người thật, phải tạo hình lại theo Ama/Carlos trong Blender.
- Rig: Mixamo (miễn phí, chỉ thân). Mặt (52 ARKit + 15 viseme): Blender (miễn phí) tự nặn shape key = nhiều công; add-on Faceit (trả 1 lần, giá chưa xác minh) hoặc thuê họa sĩ 1 lần (ước 100–300 USD/nhân vật – CHƯA kiểm, cần anh duyệt nếu đi đường này).
- Mẹo giữ nét: shader toon/ramp + bake màu từ ảnh Kling; vẫn sẽ trông như "game 3D", không như clip render.

### 5.2 Hiệu năng Android yếu & cổng chọn tầng
Không tìm thấy benchmark công bố (TalkingHead chỉ thử desktop + iPad). Ngân sách: ≤ 30k tam giác, 1 lưới skinned, ≤ 60 xương, texture KTX2 1024², pixelRatio 1,
khóa 30 fps, không bóng/HDR, `powerPreference` mặc định, bắt `webglcontextlost` → về sprite. **Cổng tầng** (mock có bản thử): WebGL2 + `deviceMemory ≥ 4` +
đo ≥ 24 fps trong 2 s đầu → 3D; không thì sprite; `saveData`/2g/`prefers-reduced-motion` → ảnh tĩnh + Kit.

### 5.3 Pilot đề xuất (cần anh duyệt; hiện 0 chi phí đã tiêu)
1. **B-pilot (0 credit, 1 phiên):** dựng sprite từ khung Ama 3D sẵn có với 3 hình miệng thử cắt từ chính clip talk (khung miệng mở/khép/tròn) + driver `visemes.json` từ 3 câu Kokoro trên CI → so mắt với clip tempo. Đạt → xin ~15 credit ảnh cho đủ 12 hình miệng/người (theo CREDIT-RULES: phiếu, dry-run, từng ảnh).
2. **A-pilot (0 credit):** đo three.js + TalkingHead với 1 avatar mẫu (chỉ thử nội bộ, KHÔNG phát hành – avatar mẫu có điều khoản phi thương mại) trên máy Android yếu của anh: fps, nhiệt, thời gian tải.
3. Đạt cả hai → anh chọn: A (cần mô hình riêng: Meshy free + Blender, hoặc thuê 1 lần) hay B. Đề xuất của em: **B làm mặc định trên mobile, A cho desktop nếu pilot đẹp.**

### 5.4 Kết quả pilot (27/10, 0 credit) – chủ CHỌN B
**B v2 (sprite, Ama + Carlos)** – `docs/mocks/teacher-pilot/b-sprite.html`, dựng bằng `scripts/teacher/sprite_build.py` (+ `sprites.json`), `sprite_cues.py`, kiểm `lag_sim.mjs`:
- Nền = vòng 3 s cắt từ clip listen thật (Ama `a05l2` 80–152, Carlos `c05l` 134–206), phát xuôi + ngược (ping-pong) → đầu/vai chuyển động thật, chớp mắt thật, không nhảy, không trôi. Chớp mắt dán ghép đã bỏ → hết vệt mí.
- Miệng = 10 hình (X nghỉ, A M/B/P, B răng, C1 hé, C vừa, D rộng, E tròn O, F chu U, G F/V, H L/TH) cắt từ clip talk/present/listen, căn ORB + affine, khớp màu LAB; bám đầu từng khung qua `requestVideoFrameCallback` (track làm mượt, lệch ≤ 6,6 px Ama / 11,6 px Carlos so với track thô); chuyển hình bằng hoà trộn 60 ms bắt đầu sớm 30 ms; độ to âm thanh chọn C1/C/D cho mỗi âm; im lặng > 250 ms → miệng thật trong video.
- Tải lần đầu/giáo viên: Ama loop 133 + miệng 21 + poster 17 + dữ liệu 9 + 1 câu ~13 ≈ **190 KB** (4 câu: 228 KB); Carlos ≈ **175 KB** (≤ 300 KB ✔).
- Lệch môi (giữa pha hoà trộn − đầu âm, `lag_sim.mjs`, 50 pha ngẫu nhiên): 60 Hz p50 8–9 ms, **p95 16,6 ms** (≤ 40 ✔); 30 Hz p95 32 ms. Rhubarb thô so audio: Ama trung bình 72 ms (p90 165), Carlos 39 ms (p90 70) → gác VAD.
- fps: 60 trên Mac khi khung hiển thị (khung trình duyệt ẩn bị bóp rAF → số trên điện thoại do trang tự đo). Hạn chế còn lại: 10 hình miệng (không phải 15 viseme), đầu nghiêng mạnh thì miệng phẳng hơn mặt.

**A (3D realtime, mặt thay thế CC0)** – three.js r186 + TalkingHead 1.8.2, `mpfb.glb` 36,8 → 2,9 MB, JS 502 KB, lưới 84k tam giác/71 morph; không được chọn (chưa có mô hình Ama/Carlos, §5.1).

## 6. So với ông lớn (trung thực)
Duolingo Video Call (gói Max), Praktika, Speak: nhân vật có khớp môi thật + LLM/TTS server trả phí. Ta: kịch bản + Nano trên máy + viseme sinh sẵn → khớp môi tương đương
**cho câu kịch bản**; câu AI tự do ít hơn họ nhiều (server free ≈ vài nghìn lượt/ngày toàn hệ thống, Nano không có trên điện thoại). Muốn khớp viseme đầy đủ cho mọi câu
tự do trên mọi máy = TTS có mốc âm vị trên máy (Kokoro ~86 MB+ – nặng cho mobile) hoặc TTS server trả phí.

## 7. Clip video & micro-clip trong bài (giữ từ v1)
Clip Ama 3D bank v2 (`a05`, `a05b`, `a05l`; Carlos `c05*`) mã hoá 480×640 CRF 28 ≈ **270–370 KB/10 s** (đo thật; bank v1 a04 ≈ 240 KB). Dùng cho: mở bài (`path-day.js`), từ của ngày (`app.js` `.card.wotd`),
khen chuỗi (`lesson-fx.js` (d)), phản ứng phát âm (`pron/sayit.js`: đúng / thành từ kia / chưa rõ) và tầng hạ cấp của cuộc gọi. Mô-đun lười `web/js/teach.js` (~4 KB).
Clip phản ứng cần thêm (Kling v2.5, 5 s, nối từ khung cuối listen, miệng ngậm): `r_good`, `r_try`, `r_proud` × 2 người ≈ **150 credit (trần 200)** – chỉ khi anh duyệt.

## 8. Chống lỗi ngầm & CI
- e2e CI (Playwright, Chromium với `--use-file-for-fake-audio-capture` + WAV mẫu): đo độ trễ lượt (p50/p95 < 1,2 s cho kịch bản), tỷ lệ khớp nhánh, rơi tầng đúng khi tắt WebGL/Nano/mạng, 0 lỗi console; workflow tự đỏ khi số = 0 (METHODS §4).
- QC tài sản: `visemes.json` khớp độ dài `mp3` (±40 ms), mỗi câu kịch bản có audio, sprite đủ bộ hình miệng, `.glb` ≤ 8 MB/≤ 30k tam giác.
- Đăng ký: không dịch vụ mới; sửa mục "Video bài học trên web" trong `infra/resources.json` (tiền tố tĩnh `/teach/`), job CI `teach-assets.yml` vào `infra/jobs.json`.

## 9. Quyết định
Đã duyệt 27/10: (1) local-first ✔ (2) 2 pilot ✔ – kết quả §5.4 (3) Call with Ama/Carlos ✔ (5) đồng bộ Drive ✔ (PR #146).
Chủ chọn B (27/10) → B v2 xong; tiếp: gắn vào `call.js` + đổi tên Call Mia → Call with Ama/Carlos (15 ngôn ngữ) ở PR riêng; (4) credit ~15 ảnh miệng / ~200 clip phản ứng – chỉ khi cần sau pilot.
