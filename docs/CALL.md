# Call Ama / Carlos (#/call) – cuộc gọi luyện nói + nhịp câu phát âm

> TL;DR: Cuộc gọi video luyện nói chạy hoàn toàn trên máy: kịch bản đồ thị rẽ nhánh theo kỳ thi, giáo viên sprite khớp môi, nhận dạng trên máy trước, tổng kết có sửa lỗi và luyện lại câu yếu. $0 ở mọi quy mô.
> Đọc khi: sửa `web/js/call*.js`, thêm kịch bản gọi, đổi nhận dạng giọng nói, sửa `pron/coach.js`/`pron/rhythm.js`.

## Thành phần
| Phần | File | Ghi chú |
|---|---|---|
| Logic thuần | `web/js/call/engine.js` | `prep/step` đồ thị, `correct` (ngữ pháp), `slips` (nhầm cặp âm từ `pron/pairs.js` + `EXTRA`), `fluency`, `recap` (điểm tử tế ≥ 40, nhãn great/good/keep), `retry`, `asrMode` |
| Kịch bản | `call/calls.js` (6 đời sống, dạng `turns` cũ) · `call/calls-exam.js` (IELTS P1/P2/P3, TOEIC, bakery – dạng `nodes`) | `o[0]` = câu mẫu, phải đạt `min` từ (test chặn); `words` = từ chủ đề; `long`/`prep`/`cue` cho Part 2 |
| Giao diện | `web/js/call.js` | lượt lời talk → you → listen → think; mã lượt chống kết quả muộn; gõ phím luôn có; Part 2 gom nhiều đoạn nói, đồng hồ 2 phút |
| Giáo viên | `lesson/teacher.js` (chỉ dùng, không sửa ở đây) | giọng Kokoro sinh sẵn: `scripts/gen-audio.mjs` (audio.yml đêm) quét `CALLS`; thiếu file → giọng máy + miệng theo chữ |
| Phát âm | `pron/coach.js` (thuần) · `pron/rhythm.js` | nhịp câu + dạng yếu theo `UI.WEAK` (UK/US, PR #178), nghe chậm, shadowing, nghe lại giọng mình 0,75×, gợi ý luyện tiếp; gắn vào bài `weak-forms`, `word-stress`, `connected-speech`… |

## Nhận dạng (riêng tư mặc định)
`asrMode`: Chrome `processLocally` có gói → trên máy · chưa có → hỏi 1 lần (tải gói Chrome / Whisper tiny.en ~40 MB / dịch vụ trình duyệt – ghi rõ gửi âm thanh / chỉ chạm-gõ). Không bao giờ tự gửi âm thanh lên đám mây. Đổi lại: nút "Đổi cách nhận dạng" ở danh sách.

## QA
`scripts/test/call-engine.mjs`, `pron-coach.mjs` (npm test) · `call-qa.yml`: e2e Chromium (`call-e2e.mjs`), Whisper thật với mẫu espeak-ng, ảnh 1280/375, video, bảng trước/sau (artifact `call-qa`).
Chưa làm: chấm âm vị GOP (chờ mô hình qua cổng `docs/research/pron-phoneme-plan.md` §6), Moonshine, restyle Stitch (sau PR #185).
