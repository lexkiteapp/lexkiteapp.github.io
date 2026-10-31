# Chất lượng giọng đọc, phát âm, nghe: điểm hiện tại và lộ trình lên 100

> TL;DR: Toàn hệ thống được ~64/100 so với ELSA, Duolingo, Speak và audio Cambridge/Oxford. Lên 100 bằng 5 việc $0. ElevenLabs chỉ cân nhắc cho giọng giáo viên, sau khi thử mù.
> Đọc khi: sửa giọng đọc, chấm phát âm, nghe, hoặc cân nhắc TTS trả phí. Đánh giá ngày 31/10/2026, trên main `2969da4d1`. Số liệu chi tiết nằm ở các tài liệu trong mục Nguồn, không lặp lại ở đây.

## Điểm hiện tại (thang 100)

| Mảng | Điểm | Số đo thật | Thiếu so với top |
|---|---|---|---|
| Audio từ đơn (`audio/w` s3) | 74 | Whisper kiểm đạt 15 352/16 114 file (95,3 %). 7 872/8 331 từ gốc có file. 185 từ dùng giọng máy cho cả hai giọng ([WORD-AUDIO](../WORD-AUDIO.md)) | Cambridge có người thật đọc cả giọng UK và US, đủ mọi từ. Ở đây đồng âm (weight/wait) còn dùng giọng máy |
| Audio câu và nghe | 70 | 25 479/25 479 câu có Kokoro (100 %). mp3 mono 24 kHz, 40 kbps. bf_emma chiếm 86 %, giọng nam 8 % | Câu chưa qua cổng ASR, bitrate thấp, giọng không đa dạng, chưa có nói đuổi |
| Độ to (LUFS) | 55 | App chưa có bước chuẩn hoá. Video đã dùng −16, nhưng tài liệu ghi −16 ([VIDEO](../VIDEO.md)) và −14 ([VIDEO-SCALE-PLAN](../VIDEO-SCALE-PLAN.md)), mâu thuẫn nhau | PR #281 sẽ xử lý |
| Chấm phát âm | 50 | 44 âm, 23 bộ với 173 cặp tối thiểu. App chấm bằng Web Speech kèm whisper-tiny trên máy. GOP theo âm vị mới ở mức kế hoạch và CI, chưa đo PER hay PCC ([pron-phoneme-plan](../research/pron-phoneme-plan.md)) | ELSA chấm và sửa lỗi theo từng âm vị |
| Giọng giáo viên và độ nhất quán | 66 | Ama dùng af_heart, Carlos dùng am_michael, người dẫn dùng bm_george. Hội thoại nghe dùng thêm 3 giọng nam khác. Khi rơi về giọng máy, app không chọn đúng giọng nam/nữ | Duolingo và Speak gắn mỗi nhân vật với một giọng cố định |
| Độ bền khi phát | 68 | Có `play().catch` rơi về TTS máy và đổi CDN sau 2 lần lỗi. Service worker đệm tối đa 2 000 file | Chưa có bước mở khoá âm thanh chung cho iOS, gói offline, test WebKit hay tải trước |

Điểm toàn hệ thống khoảng 64/100. Các mảng mạnh là độ phủ câu (100 %) và quy trình kiểm ASR cho từ.

## 5 nâng cấp ưu tiên (đều $0, chạy trên GitHub Actions)

1. **Độ to −16 LUFS ở mọi nơi.** Gộp #281, sau đó áp cổng cho audio câu và đổi hậu tố khoá CDN. Sửa tài liệu VIDEO-SCALE-PLAN về −16. Độ khó: thấp. Xung đột: thuộc phạm vi #281, phải chờ PR đó gộp xong.
2. **Chấm phát âm theo âm vị (GOP) chạy trên máy.** Đưa wav2vec2 lượng tử hoá vào app. Đo PER và PCC trên speechocean762, cổng CI PER ≤ 12 %. Độ khó: cao. Xung đột: #294 (chấm Play & Speak) và #286 (dữ liệu 44 âm) nên làm sau 2 PR này.
3. **Cổng ASR cho 25 479 câu**, như đang làm với từ. Render lại câu trượt với mp3 64 kbps (hậu tố mới). Với 185 từ trượt, thêm bộ kiểm bằng forced-alignment theo IPA. Bộ kiểm này dùng thêm, chặt bằng hoặc chặt hơn Whisper, không nới ngưỡng. Độ khó: vừa. Không xung đột.
4. **Phát ổn định mọi máy.** Mở khoá âm thanh ở lần chạm đầu (iOS Safari), giọng máy dự phòng chọn đúng nam/nữ, tải trước mục kế tiếp, gói offline khoảng 3 000 từ và bài học. Thêm test Playwright WebKit. Độ khó: vừa. Kiểm `web/js/ui.js` có nằm trong #294 không trước khi sửa.
5. **Một giọng cho mỗi nhân vật, và chế độ nói đuổi.** Lập bảng giọng chung kèm test CI. Thêm nói đuổi dùng audio câu sẵn có và mốc thời gian từng từ của Whisper. Mở rộng audio từ tới 20k từ bằng cùng quy trình. Độ khó: vừa.

## ElevenLabs: có nên dùng không

Chất lượng theo [Artificial Analysis Speech Arena](https://artificialanalysis.ai/text-to-speech/leaderboard) (người nghe so mù, xem ngày 31/10/2026):

| Mô hình | ELO | Giá / 1 triệu ký tự |
|---|---|---|
| Eleven v4 | 1334 (hạng 2) | $80 |
| Eleven Multilingual v2 | 1093 | $100 |
| Kokoro-82M (đang dùng) | 1062 | $0 |
| StyleTTS 2 | 891 | $0 (kém Kokoro, không nên đổi sang) |

Chênh 272 ELO tức là người nghe chọn v4 khoảng 83 % số lần. Arena chỉ đo câu dài. Với từ đơn, lỗi chính là đọc sai từ, và chưa có số đo nào cho thấy ElevenLabs làm tốt hơn ở đây.

Số ký tự cần render (đo trên repo): 87 527 ký tự từ gốc × 2 giọng, 1 258 090 ký tự câu, khoảng 6 000 ký tự bài học, khoảng 61 000 ký tự Call và Play & Speak. Video thêm khoảng 12 000 ký tự mỗi tháng (ước tính). Cộng 20 % render lại thì được khoảng 1,8 triệu ký tự. Khi mở rộng tới 20k từ thì khoảng 3,6 triệu.

Giá xem trên [elevenlabs.io/pricing/api](https://elevenlabs.io/pricing/api) ngày 31/10/2026:

| Phương án | Chi phí một lần |
|---|---|
| Giữ $0 (Kokoro + 5 nâng cấp trên) | $0 |
| ElevenLabs cho toàn bộ hiện tại (1,8 triệu ký tự) | Khoảng $145 (gói Pro $99 một tháng cộng phần vượt $0,08/1k), tối đa $198 (gói Pro 2 tháng) |
| ElevenLabs toàn bộ, mở rộng 20k từ (3,6 triệu ký tự) | $299 (gói Scale, 1 tháng) |
| ElevenLabs chỉ cho giọng giáo viên (Call, Play & Speak, video) | $22 cho mỗi đợt (gói Creator 1 tháng, 275k ký tự) |

Điều khoản ([Terms](https://elevenlabs.io/terms-of-use) §1(c) và §4, [sau khi hết gói](https://elevenlabs.io/docs/help-center/account/general/what-happens-to-my-content-after-my-subscription-ends)):

- Gói trả phí được dùng thương mại, và người dùng giữ quyền với audio tạo ra.
- Audio tạo trong lúc còn gói vẫn được dùng thương mại mãi mãi, kể cả sau khi huỷ gói, nên lưu cache và phát qua CDN được.
- Gói miễn phí không được dùng thương mại.
- Nội dung mới sau này cần mua lại gói. Nếu không, giọng mới sẽ lệch với giọng cũ.
- Mặc định ElevenLabs được dùng nội dung để huấn luyện mô hình (§4(i)), nên phải tắt mục Data use.
- Không dùng audio ElevenLabs làm dữ liệu huấn luyện `pron-train`. Cần đọc Prohibited Use Policy trước.

**Đề xuất:**
- Làm 5 nâng cấp $0 trước (lên khoảng 90).
- Không đưa ElevenLabs vào từ và câu: phải trả lại tiền với mỗi nội dung mới, và trộn giọng sẽ phá tính đồng bộ.
- Chỉ cân nhắc dùng cho giọng Ama và Carlos trong video, Call và Play & Speak, sau khi thử mù 0 credit: 10k ký tự miễn phí, chỉ để nghe thử, không phát hành. Nếu anh duyệt thì mỗi đợt $22.

## Nguồn

Kiểm kê chi tiết (file:dòng) nằm ở ghi chú phiên `audio-inventory.md`. Xem thêm [WORD-AUDIO](../WORD-AUDIO.md), [VIDEO](../VIDEO.md), [CREDIT-RULES](../CREDIT-RULES.md), PR #281, #286, #293, #294.
