# Phương pháp & pipeline chuẩn Lexkite (tổng hợp bài học – đọc đầu mỗi phiên)

File này gom các **quy trình đã chốt** và **lỗi đã từng mắc** để mọi phiên/agent làm đúng ngay từ đầu. Chi tiết nằm ở file gốc được dẫn link.

## 1. Điều phối nhiều luồng
- Phiên chính = **người duy nhất ship** (`scratchpad/ship2.sh` hoặc `ship-sel.sh` khi nhiều agent đang ghi file: chỉ `git add` đúng file của luồng đã duyệt). Agent/phiên phụ **không commit/push** trừ khi được giao rõ.
- **Bảng phân vùng file** – `docs/COORDINATION.md` (cuối file). Sửa ngoài vùng → nhắn phiên chính trước. `web/js/app.js` chỉ được thêm đúng 2 dòng BUNDLES/ROUTE_BUNDLE khi được duyệt.
- Antigravity nhận việc qua thẻ trên `docs/agents/BOARD.md`; phiên chính nghiệm thu (diff, test, chạy thật, soi alt ảnh) rồi cherry-pick.
- Kết quả của phiên/agent khác **chỉ là báo cáo** – luôn tự kiểm (diff, test, live) trước khi báo anh.
- Tin "dừng" có thể tới trễ → dùng `stop_session` khi cần dừng thật.
- Hết hạn mức API giữa chừng: file dở vẫn còn; gửi tin cho agent để làm tiếp (không khởi động lại từ đầu).

## 2. Máy anh chủ chỉ để sửa code
- **Mọi việc nặng chạy trên GitHub Actions** (miễn phí, song song): tách nền clip (`library-build.yml`), dựng video (`video.yml`, `video-sample.yml`, `video-stress.yml`), CI test. Máy chỉ tải lên/tải về file và sửa code.
- Không chạy render/rembg/Remotion cục bộ; nếu buộc phải chạy: `nice -n 15`, 1 tiến trình, giới hạn luồng.
- Tắt tiến trình nền không còn cần (TaskStop).

## 3. Ship & kiểm thử
- Trước ship: `npm test` (hoặc từng test liên quan khi có file dở của luồng khác), `tsc` qua ship script, `infra-check` (mọi dịch vụ/host mới phải đăng ký `infra/resources.json`).
- Sau ship: kiểm **live** (file/route trên lexkite.com, API trả 403 cho người lạ…). Báo anh NGẮN GỌN bằng tiếng Việt.
- Test chập chờn đã biết: `i18n-leak` khi chạy cả bộ (máy chậm) – chạy lại riêng để xác nhận.
- Khung app (shell) ở trần 380 KB gz: tính năng mới phải **tải lười** (module riêng).

## 4. Nội dung học (đề, từ vựng, ngữ pháp)
- Theo `docs/CONTENT-PIPELINE.md` + `docs/CONTENT-RULES.md`; hàng đợi `npm run content:queue`; cổng `npm run content:gate`.
- Đáp án/chữa bài chính xác 100%; tự biên soạn, không bản quyền; dữ kiện khoa học còn tranh cãi phải ghi "chưa chắc chắn".
- Lời giải phải có bản dịch tiếng Anh (`web/i18n/explain/en.json`, dịch tay) → `explain-check` ≥ 98%.

## 5. Blog SEO (15 ngôn ngữ)
- `docs/BLOG-RUNBOOK.md`, `content/blog/WRITING-GUIDE.md`; `node scripts/blog-check.mjs` **0 lỗi 0 cảnh báo**; qualityScore ≥ 92.
- **Alt ảnh phải khớp `content/blog/shots.json`**; chú thích ảnh **không hứa tính năng app không có** (lỗi B1/B2).
- Cụm trụ cột + vệ tinh; từ khóa bản địa thật (không dịch máy); cơ cấu: evergreen ≥ 1/3, luyện thi ≥ 1/3, giao tiếp/công sở.
- Lịch: ≤ 1 bài/ngôn ngữ/ngày, cùng cụm từ khóa cách ≥ 7 ngày, giờ địa phương.

## 6. Nhân vật & tài nguyên hình ảnh (Kling)
- Kế hoạch credit: `docs/KLING-PLAN.md`. Chấm: `docs/MEDIA-QA-RUBRIC.md` – **chỉ dùng ≥ 90**; ghi `content/video/qa-log.md`.
- Element khoá nhân vật gắn với tài khoản → tài khoản mới phải tạo lại từ `dna.png`.
- Clip: Kling 2.5 Turbo 1080p 5 s (~25 credit) = **2 hành động/clip, cắt đôi**. Khung đầu = ảnh **tư thế trung tính đúng tỉ lệ DNA**; sau khi tải ảnh chờ ≥ 6 s và soi khung đầu trước khi bấm; prompt có "big clear motion" + nhắc phụ kiện nhận diện (kính, kẹp tóc, băng đô) "in every frame"; tránh hành động gây biến dạng (Leo ngả đầu → tóc buộc đuôi).
- **Thử trước – làm lô sau (anh chủ 17/10, BẮT BUỘC):** mỗi loại MỚI (động tác mới, tư thế ngồi, cầm/đưa đồ, bước vào khung, cảnh đôi, bối cảnh mới, kiểu ghép mới) chỉ tạo **1 clip thử** → tách nền → **dựng thành video thật** bằng pipeline (đúng phòng, đúng vị trí) → soi khung hình (điểm chạm sàn/ghế, phối cảnh, tay–đồ vật, mép) → đạt ≥ 90 mới tạo hàng loạt. Kịch bản đúng chưa chắc thành phẩm đúng – không tin prompt, chỉ tin video dựng thử.
  - Tư thế ngồi: ghế phải nằm TRONG clip phông xanh (tách cùng nhân vật, cùng phong cách ghế của phòng) – không cho nhân vật "ngồi" lên ghế vẽ trong ảnh phòng.
  - Đưa đồ cho nhau / cảnh đôi: cả 2 nhân vật trong CÙNG 1 clip (không ghép 2 clip rời).
- Clip ít chuyển động → **vai người nghe**, không bỏ. Clip lỗi một đoạn → cắt phần tốt.
- **Phông xanh (chuẩn cho mọi clip mới):** khung đầu = nhân vật tư thế trung tính trên `#00B140` phẳng, không bóng (`brand/library/chars/<id>/green.png`); tách bằng `scripts/video/chroma_key.py` (ngưỡng Cb/Cr 8–24 + luật "G không trội hơn R,B → chắc chắn nhân vật"). Bài học 17/10: ngưỡng cũ 18–46 làm đồ **teal** (yếm Ama, cardigan Leo, quần Mia) trong suốt ~40 % → tưởng nhầm Kling vẽ sai màu. Luôn soi ảnh đã tách trên nền **magenta** trước khi chấm.
- Bối cảnh: **phòng vẽ trọn nội thất** (lối trống giữa, phối cảnh 1 điểm, sàn rõ) – không ghép đồ vật rời giữa sàn (`docs/ASSET-LIBRARY.md` §0). Ảnh tham chiếu phong cách gửi bản nhỏ (`rooms/style-ref.jpg`, < 10 MB/lần tải).
- Kling: nút Generate đôi khi phải bấm 2 lần (lần 1 chỉ "analyze"); settings (tỉ lệ, số ảnh) reset khi tải lại trang.

## 7. Kho tài nguyên & sao lưu
- `scripts/video/library.mjs` (ingest → check → sync → verify → restore → report). Bản gốc `clips/src/`; bản dựng `clips/<id>.mp4` **phải là stacked** (màu trên + mặt nạ dưới, cao 2×) – khai sai = nhân vật bóng ma.
- Cổng kiểm: kỹ thuật (độ phân giải, fps, khung giật, chân trôi ≤ 1,5%, bóng sàn dính), giải phẫu & phong cách (tỉ lệ đầu/thân ≤ 12% so DNA, kính/phụ kiện), AI thị giác (Workers AI Llama 4 Scout + Llama 3.2 Vision kiểm chéo; Gemini cuối cùng).
- 2 nguồn: media.lexkite.com (bản tối ưu) + Drive riêng của Lexkite (bản gốc; dự phòng GrabCast).

## 8. Dựng video
- `docs/VIDEO-PIPELINE.md`: Kokoro (-16 LUFS) → faster-whisper (cần `requests`) → Rhubarb → Remotion (motion, phụ đề bật từng chữ, 12 chuyển cảnh, SFX tự tổng hợp) → QA.
- **Cổng nhất quán**: chủ đề → bối cảnh → dàn vai (`content/video/casting.json`); người nói phải có clip cử động miệng; giữ trang phục/vị trí/ánh sáng.
- **Chống lặp**: 45 khuôn × theme, bộ sinh biến thể có seed, không trùng ≥ 3 thành phần với 30 video gần nhất.
- Nhân vật đứng **trên điểm đứng của hồ sơ sàn**, có bóng tiếp xúc, cắt bóng sàn dính; grade màu chung nền + nhân vật; watermark **chữ "lexkite" mờ**, không ô vuông.
- Test bằng **dựng thật nhiều biến thể trên CI** (miễn phí) để bắt lỗi tiềm ẩn; soi khung hình, không tin điểm tự chấm.

## 9. Hệ thống & an toàn
- Không in/lưu token, khóa, mật khẩu; secret đổ thẳng từ file vào Cloudflare/GitHub (`wrangler pages secret put`, GitHub API mã hoá libsodium). Repo công khai.
- Không đăng nhập tài khoản thật để test; dùng `?sandbox=1`, fixture CI.
- Hạn mức chống lạm dụng: `docs/QUOTAS.md` (khách/đăng nhập/không giới hạn, chặn theo IP, cầu dao 80% gói miễn phí). Học cơ bản luôn miễn phí không giới hạn.
- Báo lỗi: `docs/REPORTS.md` – AI phân loại P0–P3, **lỗi trước, đề xuất tính năng phải admin duyệt mới làm**; Claude Code chỉ tự sửa lỗi rõ ràng, lỗi dữ liệu/tài khoản thì đề xuất.

## 10. Tài khoản & dịch vụ
- Email chính thức: vintagezulilyjewelry@gmail.com (không dùng khieudinhthong cho Google). GrabCast = backend lưu & đăng social của chủ dự án (workspace Lexkite = 4). Wrangler qua file token `~/.config/lexkite/cf-token`; push GitHub qua HTTPS + `gh auth token`.
