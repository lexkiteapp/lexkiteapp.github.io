# docs/ – INDEX (phần lưu trữ & thư mục con)

> TL;DR: Nửa sau của mục lục `docs/INDEX.md`, chuyển nguyên văn sang đây để INDEX.md không vượt ngân sách 45 KB: con trỏ tài liệu đã chuyển, thư mục con, kho `docs/archive/`. Mỗi tài liệu vẫn có đúng một dòng (ở INDEX.md hoặc ở đây); `docs-budget` kiểm cả hai file. Thêm doc mới ở thư mục con hoặc archive = thêm dòng vào file này.

## Con trỏ tới tài liệu đã chuyển (stub trong docs/)
- [CINE-SCENE-STANDARD.md](CINE-SCENE-STANDARD.md) — Con trỏ → VIDEO.md (toàn văn cũ ở archive/); đọc khi: cần biết nó đã chuyển đi đâu
- [KLING-PLAN.md](KLING-PLAN.md) — Con trỏ → VIDEO.md (toàn văn cũ ở archive/); đọc khi: cần biết nó đã chuyển đi đâu
- [LISTENING-CHANNEL-PLAN.md](LISTENING-CHANNEL-PLAN.md) — Con trỏ → VIDEO.md (toàn văn cũ ở archive/); đọc khi: cần biết nó đã chuyển đi đâu
- [VIDEO-CONTENT-PLAN.md](VIDEO-CONTENT-PLAN.md) — Con trỏ → VIDEO.md (toàn văn cũ ở archive/); đọc khi: cần biết nó đã chuyển đi đâu
- [VIDEO-PIPELINE.md](VIDEO-PIPELINE.md) — Con trỏ → VIDEO.md (toàn văn cũ ở archive/); đọc khi: cần biết nó đã chuyển đi đâu
- [VIDEO-SYSTEM-PLAN.md](VIDEO-SYSTEM-PLAN.md) — Con trỏ → VIDEO.md (toàn văn cũ ở archive/); đọc khi: cần biết nó đã chuyển đi đâu

## Thư mục con
- [BOARD-ARCHIVE.md](agents/BOARD-ARCHIVE.md) — Lưu trữ BOARD: thẻ đã xong, thread đã đóng, toàn văn thẻ đã rút gọn (nguyên văn, chỉ để tra); đọc khi: tra thẻ cũ
- [BOARD.md](agents/BOARD.md) — Bảng giao việc Claude ⇄ Antigravity: TODO → ĐANG LÀM → CHỜ DUYỆT → ĐÃ XONG, mục HỎI CLAUDE. Thẻ đã xong ở BOARD-ARCHIVE.md; đọc khi: MỖI vòng lặp
- [DUO-GAP.md](agents/DUO-GAP.md) — Bảng khoảng trống UX bài học kiểu Duolingo (21/10): chỉ học mẫu tương tác, không chép tài sản/chữ; đọc khi: làm UX bài học
- [dictionary-quality-2026-10.md](audits/dictionary-quality-2026-10.md) — Audit chất lượng từ điển 10/2026; đọc khi: tra chất lượng từ điển
- [exams-2026-10.md](audits/exams-2026-10.md) — Audit đề thi 10/2026; đọc khi: tra chất lượng đề thi
- [exams-2026-11.md](audits/exams-2026-11.md) — Kiểm kê kho đề thi 13/11 + kế hoạch ưu tiên (Cambridge, GT, TOEIC S&W tranh, giữ chân); đọc khi: chọn đợt đề thi tiếp theo
- [grammar-2026-10.md](audits/grammar-2026-10.md) — Audit ngữ pháp 10/2026; đọc khi: tra chất lượng ngữ pháp
- [path-2026-10.md](audits/path-2026-10.md) — Audit lộ trình học 10/2026; đọc khi: tra chất lượng lộ trình
- [vocabulary-2026-10.md](audits/vocabulary-2026-10.md) — Audit từ vựng 10/2026; đọc khi: tra chất lượng từ vựng
- [DMCA-KIT.md](legal/DMCA-KIT.md) — Bộ hồ sơ DMCA mẫu của Lexkite (không phải tư vấn pháp lý): thông báo và phản thông báo; đọc khi: xử lý DMCA
- [study4-courses.md](research/study4-courses.md) — Ghi chú nghiên cứu cấu trúc khóa học & bài tập của Study4 (15/10/2026, duyệt chỉ đọc); đọc khi: thiết kế khóa học/bài tập
- [study4-syllabi.md](research/study4-syllabi.md) — Ghi chú nghiên cứu giáo trình Study4; đọc khi: thiết kế giáo trình
- [pron-phoneme-plan.md](research/pron-phoneme-plan.md) — Kế hoạch R&D chấm phát âm từng âm vị kiểu ELSA, 100% miễn phí (wav2vec2 ONNX trên máy, GOP, P0–P3 + ước lượng token); đọc khi: làm chấm phát âm
- [ai-speaking-first.md](specs/ai-speaking-first.md) — Spec-lite 05/11: đưa Nói với AI (Call/Roleplay) lên 1 chạm, phản hồi mỗi lượt (sửa câu · vì sao · câu tự nhiên · phát âm), cổng độ trễ/độ đúng, 9 việc PR; đọc khi sửa lối vào hoặc chấm nói
- [play-and-speak.md](specs/play-and-speak.md) — Spec-lite (chờ chủ duyệt) vừa học vừa chơi + luyện nói theo tình huống: kiểm kê, so app top, 9 tính năng, P0–P2, kế hoạch 40 tình huống × 12 mẫu câu, $0; đọc khi: làm luyện nói/mini-game nói/nhập vai

## Lưu trữ (docs/archive/ – nguyên văn, chỉ để tra cứu)
- [PLAYBOOK.md](archive/PLAYBOOK.md) — Sổ tay vận hành cũ (15/10): kiến trúc 0 đồng, thứ tự ship, pipeline GitHub Actions, nội dung/bản quyền, giọng đọc. METHODS.md thắng khi lệch; đọc khi: tra quy trình cũ
- [BACKLOG-DONE.md](archive/BACKLOG-DONE.md) — Việc đã xong 15/10/2026 (tách từ BACKLOG.md, nguyên văn); đọc khi: tra việc đã xong
- [CINE-SCENE-STANDARD.md](archive/CINE-SCENE-STANDARD.md) — Toàn văn cũ chuẩn cảnh footage điện ảnh (giữ số §); bản hiện hành VIDEO.md; đọc khi: cần số § cũ
- [COORDINATION-LOG.md](archive/COORDINATION-LOG.md) — Nhật ký bàn giao Claude ⇄ Antigravity (tách từ COORDINATION.md, nguyên văn); đọc khi: tra lịch sử bàn giao
- [KLING-PLAN.md](archive/KLING-PLAN.md) — Toàn văn cũ kế hoạch Kling; bản hiện hành VIDEO.md; đọc khi: tra kế hoạch Kling cũ
- [LISTENING-CHANNEL-PLAN.md](archive/LISTENING-CHANNEL-PLAN.md) — Toàn văn cũ kế hoạch kênh nghe; bản hiện hành VIDEO.md; đọc khi: tra kế hoạch kênh nghe cũ
- [METHODS-HISTORY.md](archive/METHODS-HISTORY.md) — Toàn văn METHODS.md trước khi rút gọn (22/10) và các bài học dài đã chuyển ra sau đó; đọc khi: tra bài học chi tiết (footage, matting, D1, điều phối)
- [STORE-READINESS-HISTORY.md](archive/STORE-READINESS-HISTORY.md) — Mục đã xong/cũ của STORE-READINESS.md (nguyên văn 22/10); đọc khi: tra checklist store cũ
- [VIDEO-CONTENT-PLAN.md](archive/VIDEO-CONTENT-PLAN.md) — Toàn văn cũ kế hoạch nội dung video; bản hiện hành VIDEO.md; đọc khi: tra kế hoạch nội dung cũ
- [VIDEO-PIPELINE.md](archive/VIDEO-PIPELINE.md) — Toàn văn cũ pipeline video; bản hiện hành VIDEO.md; đọc khi: tra pipeline cũ
- [VIDEO-SYSTEM-PLAN.md](archive/VIDEO-SYSTEM-PLAN.md) — Toàn văn cũ kế hoạch hệ video; bản hiện hành VIDEO.md; đọc khi: tra kế hoạch hệ video cũ
- [i18n-review-2026-10-16.md](archive/i18n-review-2026-10-16.md) — Nhật ký rà soát bản dịch 16/10 (chuyển từ docs/, nguyên văn); đọc khi: tra quyết định dịch
- [LEXICON-expand-pilots-24-10.md](archive/LEXICON-expand-pilots-24-10.md) — Nhật ký pilot 5–10 kho từ 20k (24/10, nguyên văn từ LEXICON.md); đọc khi: tra vì sao có espeak/retry/dịch ngược theo ngôn ngữ
- [LEXICON-ra-la-ok-29-10](archive/LEXICON-ra-la-ok-29-10.md) — bài học từng lớp lỗi lexicon-expand 29/10 (nguyên văn); đọc khi sửa cổng nghĩa/IPA của lexicon-expand
- [LEXICON-throughput-31-10](archive/LEXICON-throughput-31-10.md) — nhật ký thông lượng lexicon-expand 31/10–05/11 (nguyên văn); đọc khi chẩn đoán sản lượng/retry
- [LEXICON-img-pilot-23-10.md](archive/LEXICON-img-pilot-23-10.md) — Pilot ảnh minh hoạ s1 ngày 23/10 (nguyên văn từ LEXICON.md); đọc khi: tra số đo pilot ảnh đầu tiên.
- [archive/UX-BENCHMARK-2026-10.md](archive/UX-BENCHMARK-2026-10.md) — Bản so sánh UX bằng lời 25/10 (scorecard theo luồng, top 10 đã ship, UX v3 icon/token, UX1); đọc khi: tra lịch sử UX
- [specs/upgrade-audit.md](specs/upgrade-audit.md) — Kiểm toán nâng cấp ≤1 trang so Duolingo/Anki/Elsa/Speak (UX, hiệu năng, a11y, nội dung, AI), số đo tự làm mới; đọc khi: chọn việc nâng chất lượng tiếp theo
- [QA-BACKLOG.md](QA-BACKLOG.md) — Sổ lỗi do QA tự chạy phát hiện (1 dòng/lỗi: file sở hữu + cách tái hiện); đọc khi: chọn việc sửa chất lượng
- [archive/PLAN-2026-10.md](archive/PLAN-2026-10.md) — Kế hoạch nâng cấp tổng 15/10, còn 42 mục chưa đánh dấu nhưng không ai cập nhật từ 15/10; hướng hiện hành xem BACKLOG.md và CONTENT-WORLD-PLAN.md. Đọc khi: tra lịch sử.
- [archive/ROADMAP-2026-10.md](archive/ROADMAP-2026-10.md) — Lộ trình thương mại hóa 14/10, hiện trạng đã cũ; trạng thái store xem STORE-READINESS.md. Đọc khi: tra lịch sử.
- [archive/AI-PLAN-2026-10.md](archive/AI-PLAN-2026-10.md) — Kế hoạch AI miễn phí nhiều tầng 15/10; hiện hành xem AI-LOCAL.md và EXPLAIN.md. Đọc khi: tra lịch sử.
- [specs/teacher-rive-rig.md](specs/teacher-rive-rig.md) — Rig 2D Ama/Carlos kiểu Rive (TeacherRig: speak/setEmotion/gesture), vì sao không .riv, cổng khớp môi ±33 ms/khớp xương/fps/alpha, kế hoạch gesture bank chờ duyệt credit; đọc khi: thêm cử chỉ/biểu cảm hoặc gắn giáo viên vào màn mới
- [specs/video-production-v2.md](specs/video-production-v2.md) — Video v2: giáo viên Teach2D vẽ bằng TeacherRig (viseme của voice.wav, cổng lipsync_rig ±33 ms), khối publish 4 nền tảng từ kịch bản, dọn video rác có cách ly; đọc khi: sửa lớp giáo viên video, metadata đăng bài, dọn video
- [specs/me-settings-ux.md](specs/me-settings-ux.md) — Tôi + Cài đặt gọn: mục lục nhóm có giá trị hiện tại, trang con #/settings/<mục>, gom liên kết đọc thêm; đọc khi sửa settings.js/ux1-me.js
- [specs/teacher-bubble.md](specs/teacher-bubble.md) — TeacherBubble: bong bóng lời giáo viên dùng chung (gõ 1 lần/ngày, pop, 🔊 Ama đọc giọng nữ, miệng bám âm thanh, idle dừng khi ẩn) + kiểm kê chỗ giáo viên nói; đọc khi đổi lời thoại giáo viên ở màn nào.
- [specs/story-stage.md](specs/story-stage.md) — Màn Truyện Ama↔Carlos + khung bài tập (Xếp câu, nghe, điền, chính tả) chuẩn Duolingo Stories: lỗi → gốc → sửa, bảng kiểm màn tương tự; đọc khi sửa màn hội thoại/bài tập có giáo viên
