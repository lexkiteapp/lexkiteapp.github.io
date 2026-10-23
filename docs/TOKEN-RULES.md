# TOKEN-RULES – làm việc hiệu quả, tiết kiệm token (bắt buộc, 22/10/2026)

Áp dụng cho phiên chính, mọi agent con và Antigravity. Mục tiêu: cùng kết quả, ít token hơn ≥ 50 %.

## 1. Đọc
- Đầu phiên: chỉ `docs/README.md` + `docs/METHODS.md` + phần đang mở của `docs/agents/BOARD.md`. Tài liệu khác chỉ đọc khi đụng đúng vùng đó (README ghi "khi nào đọc").
- Không đọc nguyên file lớn: dùng `grep -n` rồi `sed -n 'a,bp'`; JSON lớn → `python3 -c` lấy đúng khóa; log CI → `grep`/`tail` vài dòng.
- Không bao giờ đọc file output/JSONL của agent; chờ thông báo kết quả.
- Ảnh: chỉ xem 1 contact sheet/lô, `scale 0.5`; trang web: `get_page_text`/`read_page` thay vì screenshot.

## 2. Giao việc cho agent
- Việc < ~5 lần gọi tool → tự làm, không tạo agent.
- Việc tiếp nối → `SendMessage` cho agent cũ (giữ ngữ cảnh) thay vì agent mới; trước khi tạo mới kiểm agent/phiên đang chạy để không trùng.
- Brief ≤ 25 dòng: mục tiêu, vùng file, tiêu chí xong, link tài liệu bằng đường dẫn (không dán nội dung), trần token, "báo cáo ≤ 8 dòng".
- Luôn ghi: "làm trên main mới nhất của github.com/lexkiteapp/lexkiteapp.github.io" (worktree agent có thể bắt đầu từ lịch sử cũ).
- Việc máy móc (dịch, chuyển file, gộp, kiểm tra) → `model: sonnet`/`haiku`; việc thiết kế/khó mới dùng model mạnh.
- Đặt trần token cho mỗi agent (thường 150–300k); vượt → dừng và báo.

## 3. Chờ & theo dõi
- CI: 1 lệnh `until …; do sleep 20; done` chạy nền, không gọi lặp từng lần.
- Thông báo tạm của agent ("đang chờ CI") → không gọi tool, tối đa 1 dòng.
- Vòng lặp tự động: 2 lần/giờ (không 5 phút); vòng không có gì mới → trả lời 1 dòng, không gọi tool.

## 4. Gộp & kiểm thử
- Gộp bằng `bash scripts/mergecheck.sh <nhánh> "<msg>"` (1 lệnh = mọi test + push). Không chạy lại toàn bộ `npm test` nhiều lần; chỉ chạy test liên quan khi sửa nhỏ.
- Gộp tuần tự từng nhánh (không 2 agent gộp cùng lúc), xếp hàng.

## 5. Nội dung hàng loạt (blog, video)
- Antigravity viết số lượng lớn; Claude duyệt bằng script (`blog-check`, `blog-captions`, `qa_news`) + đọc mẫu 1 bài/lô, không đọc hết.
- Video: tin vào QA tự động + 1 contact sheet; chỉ mở video khi QA báo lỗi hoặc gửi anh duyệt.

## 6. Báo cáo cho anh
- 3–6 dòng, tiếng Việt, kết quả + việc cần anh làm. Không kể lại quá trình.

## 7. Credit (tiền thật)
- Xem `docs/CREDIT-RULES.md`: không tiêu credit khi anh chưa duyệt số cụ thể cho việc đó.

## 8. Bài học 23/10 (làm hiệu quả)
- **Agent làm trong clone `$TMPDIR`, không đụng thư mục chính** (đang ở nhánh khác); nếu `mergecheck` không chạy được trong clone → chạy test liên quan + push, ghi rõ trong commit, CI `ci-triage` bắt lỗi sau.
- **Một agent giữ 1 mảng** (video, lưu trữ, từ điển, chịu tải…) → giao tiếp bằng SendMessage cho agent đang có ngữ cảnh, không mở agent mới trùng việc.
- **Không chờ bằng cách hỏi trạng thái liên tục** (đã làm cạn D1 2 lần): chờ CI = 1 lệnh nền `until … sleep 120` hoặc hẹn giờ (CronCreate 1 lần); không đọc file output của agent.
- **Hết hạn mức AI/D1 → không đứng chờ**: chạy phần không cần AI, agent tự chấm thay cổng AI (ghi `judge: claude-manual`), cổng AI tự bỏ qua trung tính.
- **Soát nhanh bằng ảnh nhỏ**: trích 2–4 khung/1 bảng contact sheet (scale 0.5–0.6), không xem cả video; trang dài → `javascript_tool` lấy đúng đoạn, không `get_page_text` cả trang.
- **Lệnh/giá trị bí mật**: đọc từ file (`< ~/.config/lexkite/...`), không in; tạo token/khoá do anh bấm nút cuối.
- **Báo cáo**: kết quả + con số trước/sau + việc anh cần làm (≤6 dòng); sửa sai số đã báo ngay khi đo thật khác ước tính.
