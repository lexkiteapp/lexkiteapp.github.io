---
title: "FSRS là gì? Thuật toán flashcard giúp ôn ít mà nhớ lâu"
description: "FSRS là gì, khác SM-2 ra sao? Giải thích dễ hiểu độ khó, độ ổn định, khả năng nhớ và cách chọn mục tiêu ghi nhớ 80–95% phù hợp với lịch học của bạn."
slug: fsrs-la-gi
lang: vi
translationKey: fsrs-la-gi
category: phuong-phap
tags: [fsrs, flashcard, anki]
keyword: "fsrs là gì"
cover: review
coverAlt: "Phiên ôn flashcard trong Lexkite với thẻ từ pollution và nút Lật thẻ"
publishAt: 2026-10-16T08:41:00+07:00
factChecked: 2026-10-15
author: Lexkite
status: ready
---
Hai người cùng học 1.000 từ. Người thứ nhất ôn mỗi ngày theo danh sách cố định và mất gần một tiếng. Người thứ hai chỉ ôn những thẻ mà phần mềm báo "sắp quên", mất 15 phút, mà vẫn nhớ tương đương. Khác biệt nằm ở thuật toán lập lịch phía sau. Nếu bạn từng thắc mắc FSRS là gì và vì sao nhiều người dùng Anki chuyển sang nó, bài này giải thích bằng ngôn ngữ đời thường, không cần biết toán.

## FSRS là gì? Định nghĩa ngắn gọn

FSRS viết tắt của **Free Spaced Repetition Scheduler**, tạm dịch là "bộ lập lịch lặp lại ngắt quãng miễn phí". Đây là một thuật toán mã nguồn mở, có nhiệm vụ trả lời đúng một câu hỏi: *thẻ này nên được ôn lại vào ngày nào?*

Câu hỏi nghe đơn giản nhưng rất quan trọng. Ôn quá sớm thì phí thời gian vì bạn vẫn nhớ. Ôn quá muộn thì bạn đã quên, phải học lại gần như từ đầu. FSRS cố gắng xếp mỗi lần ôn vào khoảng thời điểm khả năng nhớ của bạn vừa giảm xuống một ngưỡng định trước.

FSRS được cộng đồng phát triển công khai và đã được tích hợp vào Anki từ phiên bản 23.10. Từ đó nó trở thành lựa chọn phổ biến cho những ai học bằng flashcard nghiêm túc.

## Ba con số FSRS theo dõi cho mỗi thẻ

Thay vì chỉ nhớ "thẻ này dễ hay khó", FSRS mô hình hóa trí nhớ của bạn với từng thẻ bằng ba đại lượng. Hiểu ba đại lượng này giúp bạn dùng app hiệu quả hơn.

### Độ khó (Difficulty)

Độ khó cho biết thẻ này "cứng đầu" đến mức nào với riêng bạn. Từ *cat* có độ khó thấp. Một từ như *ubiquitous* hay cặp dễ nhầm *affect/effect* thường có độ khó cao hơn. Thẻ càng khó thì khoảng cách giữa các lần ôn tăng càng chậm.

### Độ ổn định (Stability)

Độ ổn định có thể hiểu là "trí nhớ về thẻ này bền đến đâu", đo bằng số ngày. Nếu độ ổn định là 20 ngày, nghĩa là sau khoảng 20 ngày không ôn, khả năng bạn còn nhớ sẽ giảm xuống mức mục tiêu. Mỗi lần bạn ôn thành công, đặc biệt là ôn khi đã hơi quên, độ ổn định tăng lên đáng kể.

### Khả năng nhớ (Retrievability)

Đây là xác suất bạn nhớ ra thẻ *ngay lúc này*. Ngay sau khi ôn, con số này gần 100%. Theo thời gian nó giảm dần theo dạng đường cong quên lãng. FSRS tính trước con số này cho từng ngày và chọn ngày ôn khi nó chạm ngưỡng bạn đặt.

Tóm lại: **độ khó** ảnh hưởng tới việc độ ổn định tăng nhanh hay chậm, **độ ổn định** quyết định khả năng nhớ giảm nhanh hay chậm, còn **khả năng nhớ** quyết định khi nào cần ôn.

## FSRS khác SM-2 như thế nào

SM-2 là thuật toán cũ ra đời từ cuối thập niên 1980 trong phần mềm SuperMemo, và là nền tảng của Anki trong nhiều năm. Ý tưởng của SM-2 là nhân khoảng cách ôn với một "hệ số dễ" (ease) cho mỗi thẻ. Cách này đơn giản nhưng có vài điểm yếu.

| Tiêu chí | SM-2 | FSRS |
|---|---|---|
| Mô hình trí nhớ | Một hệ số dễ cho mỗi thẻ | Độ khó, độ ổn định, khả năng nhớ |
| Ôn trễ vài ngày | Gần như không tính đến | Tính khả năng nhớ thực tế tại lúc ôn |
| Mục tiêu ghi nhớ | Không chọn trực tiếp được | Chọn trực tiếp, ví dụ 90% |
| Học từ dữ liệu của bạn | Không | Có thể tối ưu tham số theo lịch sử ôn |

Một vấn đề nổi tiếng của SM-2 là "ease hell": bấm "khó" vài lần, hệ số dễ tụt thấp và thẻ bị ôn quá dày suốt thời gian dài dù bạn đã thuộc. FSRS tách độ khó khỏi độ ổn định nên ít gặp hiện tượng này hơn.

Điều quan trọng với người học: cùng một mức nhớ, lịch do FSRS sắp thường cần ít lượt ôn hơn. Bạn tiết kiệm thời gian để dành cho việc đọc, nghe và viết.

## Chọn mục tiêu ghi nhớ 80–95% thế nào cho hợp lý

Điểm đặc biệt của FSRS là bạn được chọn **mục tiêu ghi nhớ** (desired retention), tức là xác suất bạn muốn còn nhớ thẻ vào ngày đến hạn. Con số này có đánh đổi rõ ràng:

- **Mục tiêu cao (93–95%)**: bạn quên rất ít, nhưng khoảng cách ôn ngắn hơn và số thẻ mỗi ngày tăng mạnh.
- **Mục tiêu vừa (88–90%)**: cân bằng giữa công sức và độ nhớ, phù hợp với đa số người học.
- **Mục tiêu thấp (80–85%)**: ôn ít, khoảng cách dài, nhưng bạn sẽ quên nhiều thẻ hơn và phải học lại.

Một cách chọn thực tế:

1. Còn dưới hai tháng là đến ngày thi và cần nhớ chắc từ đã học: đặt khoảng 92–95%.
2. Học đều dài hạn, mỗi ngày 20–30 phút: giữ khoảng 90%.
3. Đang có quá nhiều thẻ tồn, cảm thấy quá tải: tạm hạ về 85% trong vài tuần.

Đừng đặt 99%. Khi mục tiêu tiến sát 100%, số lượt ôn tăng vọt trong khi lợi ích thêm rất nhỏ.

## Làm ngay trong Lexkite

Lexkite dùng FSRS cho toàn bộ flashcard, nên bạn không phải cài đặt gì phức tạp. Các bước thực hành:

1. Mở [Ôn tập flashcard](/#/review). App chỉ đưa ra những thẻ đã đến hạn theo lịch FSRS. Hãy cố nhớ nghĩa trước rồi mới lật thẻ.
2. Chấm thật lòng bằng bốn mức Quên, Khó, Nhớ, Dễ. Chấm "Nhớ" khi bạn nhớ ra chắc chắn, chỉ chấm "Dễ" khi nhớ ngay không cần nghĩ. Chấm sai lệch sẽ làm lịch kém chính xác.

![Phiên ôn flashcard Lexkite với thẻ pollution, phiên âm và thanh tiến độ](media:review "Ôn flashcard: chỉ những thẻ đến hạn theo FSRS")

3. Vào [Cài đặt](/#/settings) để chỉnh mục tiêu ghi nhớ trong khoảng 80–95%. Mặc định là 90%.
4. Xem trang [Phương pháp học](/#/method) để hiểu vòng lặp mỗi ngày và đường cong quên lãng mà app dựa vào.

![Trang Phương pháp học của Lexkite với vòng lặp mỗi ngày và đường cong quên lãng](media:method "Phương pháp học: vòng lặp hằng ngày và đường cong quên lãng")

5. Theo dõi trang Tiến độ để thấy dự báo số thẻ đến hạn những ngày tới. Nếu cột dự báo quá cao, giảm số từ mới mỗi ngày.

![Trang Tiến độ với XP, chuỗi ngày, lịch học dạng heatmap và dự báo thẻ đến hạn](media:stats "Tiến độ: lịch học 6 tháng và dự báo thẻ đến hạn")

{{cta: /#/review | Mở phiên ôn đầu tiên với FSRS}}

{{youtube: | Gợi ý video: Giải thích FSRS bằng hình ảnh – độ khó, độ ổn định và khả năng nhớ}}

Muốn hiểu sâu hơn nền tảng khoa học phía sau, bạn có thể đọc thêm bài [đường cong quên lãng Ebbinghaus](/blog/duong-cong-quen-lang-ebbinghaus/).

## FSRS phù hợp với ai

FSRS hữu ích nhất cho những ai có lượng thẻ lớn và học đều trong thời gian dài: người luyện IELTS, TOEIC, TOEFL cần vài nghìn từ, sinh viên y học thuật ngữ, người học ngoại ngữ thứ hai. Nếu bạn chỉ có vài chục thẻ cho một bài kiểm tra tuần sau, lợi ích của thuật toán không rõ rệt bằng việc tự kiểm tra đều đặn. Nhưng một khi số thẻ vượt quá vài trăm, việc tự tính ngày ôn gần như bất khả thi, và một thuật toán tốt sẽ tiết kiệm cho bạn rất nhiều giờ.

## Những hiểu lầm thường gặp về FSRS

- **"FSRS làm mình nhớ hộ."** Không. Thuật toán chỉ chọn thời điểm ôn. Bạn vẫn phải chủ động gợi nhớ, và chất lượng thẻ (có câu ví dụ, có cụm từ) vẫn quyết định nhiều.
- **"Bấm Khó cho an toàn."** Bấm Khó khi thực ra nhớ tốt sẽ khiến thẻ quay lại quá sớm, tốn thời gian. Hãy chấm đúng cảm nhận.
- **"Nghỉ vài ngày là hỏng lịch."** FSRS tính khả năng nhớ thực tế khi bạn quay lại, nên nghỉ ngắn không phá hỏng gì. Chỉ cần ôn dần phần tồn, ưu tiên thẻ đến hạn trước.

## Câu hỏi thường gặp

### FSRS có miễn phí không?

Có. FSRS là thuật toán mã nguồn mở, ai cũng có thể dùng và tích hợp. Anki có FSRS từ bản 23.10, và Lexkite dùng FSRS cho flashcard mà không thu phí.

### Mục tiêu ghi nhớ 90% có nghĩa là gì?

Nghĩa là thuật toán sắp lịch sao cho vào ngày một thẻ đến hạn, xác suất bạn còn nhớ nó là khoảng 90%. Trong 100 thẻ đến hạn, bạn dự kiến quên khoảng 10 thẻ. Đó là mức quên hợp lý, không phải dấu hiệu bạn học kém.

### Chuyển từ SM-2 sang FSRS có mất dữ liệu cũ không?

Trong các app hỗ trợ cả hai như Anki, lịch sử ôn vẫn được giữ lại, và FSRS có thể dùng chính lịch sử đó để ước lượng trạng thái trí nhớ của từng thẻ. Bạn nên sao lưu trước khi đổi cài đặt để yên tâm.

### Vì sao có ngày phải ôn rất nhiều thẻ?

Thường do bạn học nhiều từ mới trong cùng vài ngày, nên chúng đến hạn cùng lúc. Hãy giữ số từ mới đều đặn mỗi ngày thay vì học dồn, lượng thẻ ôn sẽ dàn đều hơn.
