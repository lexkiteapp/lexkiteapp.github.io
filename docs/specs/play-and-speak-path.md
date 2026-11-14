# Lộ trình Play & Speak v3: phần lớn luôn mở, bài nhỏ khóa tuần tự (spec-lite, chờ chủ duyệt)

> TL;DR: Bản đồ học đổi từ "chuỗi 6 nút khóa nối tiếp" sang **7 phần lớn luôn mở** (Từ mới, Nghe, Nói, Truyện, Ngữ pháp, Luyện thi, Ôn lỗi). Mỗi phần là một thang bài nhỏ A1→C1, **khóa tuần tự**, có **bài nhảy cóc** theo từng bậc. Tiến độ = hàm thuần `PathV3` (web/js/lesson/path3.js) có test. Thứ tự gợi ý dựa trên trí nhớ người học trên máy. 5 mốc M1–M5, cờ `path3`. Nguồn gốc: [play-and-speak.md](play-and-speak.md) (#291, v2.2), [LEARNING-PATH.md](../LEARNING-PATH.md).
> Đọc khi: sửa bản đồ học, khóa/mở bài, xếp lớp, thứ tự bài, luyện nói lưu loát, ngữ pháp theo kỳ thi.

## 1. Mục tiêu và tiêu chí xong
| # | Chủ yêu cầu (01/11) | Xong khi |
|---|---|---|
| G1 | Phần lớn không khóa; bài nhỏ khóa tuần tự | Mọi phần bấm được ngay ngày đầu; trong phần, bài *i* mở khi bài *i−1* xong hoặc được nhảy cóc. Test bất biến xanh. |
| G2 | Lộ trình thông minh theo trí nhớ người học | Thẻ "Gợi ý tiếp" chọn phần + bài theo điểm yếu (lỗi, âm khó, thẻ đến hạn). Hồ sơ ở IndexedDB, xem/xoá được ([AI-LOCAL.md](../AI-LOCAL.md)). |
| G3 | Thư viện A1→C1, vừa học vừa chơi | Mỗi phần có bài ở đủ 5 bậc; không cùng dạng trò chơi 3 lần liền; ≥ 8 dạng chơi. |
| G4 | Nói tới lưu loát theo phương pháp có nghiên cứu | Phần Nói có 6 kỹ thuật ở §4, đo tốc độ nói + độ ngắt + GOP theo thời gian. |
| G5 | Ngữ pháp riêng từng kỳ thi, đúng khối lượng đề | Mỗi kỳ thi có thang ngữ pháp riêng khớp phạm vi chính thức (§5), có bảng đối chiếu nguồn. |

Không cắt gì (luật no-cuts): mọi bài, nút, module thi, test và ngưỡng hiện có đều phải tới được từ bản đồ mới. Test `path3` kiểm "không mất nội dung": danh sách đích (`href`) cũ ⊆ danh sách đích mới.

## 2. Mô hình (M1)
- **Phần (track)**: `{ id, name, icon, ladder: [bài] }`. Bài: `{ id, cefr: 'A1'…'C1', kind, ref, min }`. `ref` trỏ tới nội dung sẵn có (từ chủ đề, Listening, Speak/Pron, truyện/radio, chương ngữ pháp, module thi, FSRS).
- **Thứ tự phần** theo mục tiêu (IELTS/TOEIC/TOEFL/Giao tiếp) giữ luật `ORDER` của LEARNING-PATH §2. Thứ tự này chỉ để sắp, không dùng để khóa.
- **Trạng thái bài** `PathV3.status(track, i, prog)` → `done | next | open-skip | lock`:
  - bài 0 luôn mở;
  - bài *i* mở khi bài *i−1* `done` hoặc `i ≤ prog.skip[track]`.
  - Bài đã nhảy cóc vẫn chơi lại được và không mất sao.
- **Nhảy cóc**: đầu mỗi bậc CEFR có một nút "Kiểm tra nhảy cóc" (6–8 câu lấy từ chính các bài của bậc đó). Đạt ≥ 80 % thì mở tới bài đầu bậc kế. Không có phạt và không giới hạn số lần thử.
- **Xếp lớp ban đầu**: kết quả `#/placement` (band + CEFR) đặt `skip` cho mọi phần cùng lúc. Chưa làm bài xếp lớp thì giữ chip "Kiểm tra trình độ" như hiện nay.
- **Tiến độ** `state.path3 = { v: 1, done: { track: [id…] }, skip: { track: n } }`, đồng bộ qua tài khoản như `state.cards`.
  - Di trú từ `ux1`: bộ đếm `n` cũ + sao `lk.ux1.st` → đánh `done` các bài tương ứng, để không ai mất tiến độ (có test).
- **Phát hành**: cờ `path3` dùng đúng cơ chế `ux1` (LEARNING-PATH §6). Bản đồ cũ giữ nguyên khi cờ tắt.

## 3. Thứ tự thông minh (M2)
- Hồ sơ người học (IndexedDB `learner`): lỗi theo thẻ ngữ pháp, âm yếu (GOP), từ hay quên (FSRS lapses), tốc độ nói, sở thích chủ đề.
- **Gợi ý tiếp** = bài `next` của phần có điểm cao nhất. Công thức: `điểm = 3·nợ ôn + 2·điểm yếu khớp phần + 1·mục tiêu thi − 1·vừa học phần này`. Đây là hàm thuần, có test.
- Trong phần, bài vẫn đi tuần tự. Câu hỏi bên trong bài ưu tiên mục yếu (đích đúng 80–85 %).
- Không tinh chỉnh mô hình trên máy. Hồ sơ chỉ dùng để chọn bài kế và làm ngữ cảnh cho lời thoại.

## 4. Nói tới lưu loát (M3, nối F2/F3 của #291)
| Kỹ thuật | Nguồn | Dạng bài |
|---|---|---|
| Shadowing | Hamada 2016 (LTR); Kadota 2019 | Nói theo 3 nhịp F2: nghe → đuổi → che câu |
| 4/3/2 | Maurice 1983; Nation 1989; de Jong & Perfetti 2011 | Kể cùng một ý 3 lượt, thời gian 90/60/40 giây; đo số từ/phút và chỗ ngắt |
| Nhắc lại theo mẫu | Lyster & Ranta 1997 (recast, lặp lại) | Đổi một chỗ trong câu mẫu ("Change one item") |
| Nhiệm vụ đóng vai | Willis 1996; Ellis 2003 (TBLT) | Nhập vai F3 có danh sách việc phải làm |
| Cụm từ cố định | Boers & Lindstromberg 2009; Wood 2006 | Thẻ cụm từ, nói nhanh dần |
| Nhận xét phát âm | Witt & Young 2000 (GOP) | Tô màu âm sai, đưa vào bản đồ âm F6 |

Chỉ số lưu loát lưu trong hồ sơ: số từ/phút, tỉ lệ ngắt dài (> 0,4 giây), độ dài chuỗi nói liền, GOP trung bình. Chấm trên máy theo §5 của #291.

## 5. Ngữ pháp theo kỳ thi (M4)
- Bước 0: kiểm kê `web/js/grammar/*` (chương, bài drill, check) và gắn nhãn kỳ thi/CEFR. Việc này giao subagent sonnet. Không xoá bài nào.
- Phạm vi phải khớp nguồn chính thức. Trước khi gộp, đối chiếu lại các trang ETS / IELTS (IDP, British Council):

| Kỳ thi | Phạm vi |
|---|---|
| **TOEIC** | Part 5: 30 câu hòan thành câu. Part 6: 16 câu, 4 đoạn văn. Gồm từ loại, thì, giới từ, liên từ, mệnh đề quan hệ, bị động, so sánh, đại từ. |
| **IELTS** | Writing/Speaking chấm theo tiêu chí Grammatical Range & Accuracy của band descriptors: câu phức, mệnh đề, điều kiện, bị động, mạo từ, hòa hợp, theo dải band 5–8. |
| **TOEFL iBT (từ 01/2026)** | Build a Sentence, Write an Email, Academic Discussion, Listen and Repeat; thang 1–6. |

- Khối lượng: thang mỗi kỳ thi có đủ số dạng câu theo tỉ lệ của đề thật. Bảng đối chiếu nguồn lưu ở `content/qa/sources.json`.

## 6. Thư viện trò chơi (M5)
- ≥ 8 dạng, mỗi dạng dùng được ở nhiều phần: ghép cặp, xếp câu, điền chỗ trống, nghe chọn, nói theo, Thả diều bằng giọng (F5), đua giờ cụm từ, tìm lỗi sai, truyện chọn nhánh.
- Luật xoay vòng: không cùng dạng 3 lần liền (`LessonEngine.calm`/`adapt`).
- Mỗi dạng mới phải có màn Stitch được chủ duyệt.

## 7. Giao diện (Stitch, khung 390 px, sáng/tối)
| Màn | Nội dung |
|---|---|
| S1 "Lộ trình" (mới) | Thẻ "Gợi ý tiếp" kèm giáo viên Chars Ama/Carlos; 7 thẻ phần luôn mở, mỗi thẻ có tiến độ x/y, bậc CEFR hiện tại và bài kế. |
| S2 "Trong phần" | Dùng lại kiểu nút rắn của `st/v2/path` (done/next/lock), thêm tiêu đề bậc A1…C1 và nút nhảy cóc. |
| S3 | Tấm giới thiệu bài nhảy cóc. |

- Ảnh trước/sau (sáng/tối, 390 px) gửi chủ duyệt trước khi gộp (luật duyệt hình).

## 8. Mốc, file, cổng
| Mốc | Việc | File chính (chỉ sửa sau khi PR đang giữ file đã gộp) |
|---|---|---|
| M1 | `PathV3` + di trú + nhảy cóc + S1/S2/S3 sau cờ | mới: `web/js/lesson/path3.js`, `scripts/test/path3.mjs`. Sửa `web/js/ux1.js` `map()` sau #294, #314, #284 |
| M2 | hồ sơ người học + Gợi ý tiếp | `path3.js`, `learner` store |
| M3 | 6 kỹ thuật nói + chỉ số lưu loát | `web/js/speak/*` (sau #294) |
| M4 | thang ngữ pháp 4 kỳ thi | `web/js/grammar/*` (thêm nhãn, không xoá) |
| M5 | thư viện ≥ 8 dạng chơi | `lesson/engine.js` + màn Stitch mới |

- **Cổng**:
  - `npm test` xanh, có thêm `path3.mjs` (bất biến khóa, di trú, không mất nội dung);
  - khung app ≤ 377 KB gz (`path3` tải lười cùng gói ux1);
  - i18n 15 ngôn ngữ;
  - tương phản ≥ 4,5:1;
  - QA bot đi hết hành trình;
  - ảnh chủ duyệt.
- **Quy trình**: mỗi mốc là 1 PR. Nội dung lớn giao subagent sonnet. Phiên làm việc nghỉ quanh 150k token để bàn giao.
