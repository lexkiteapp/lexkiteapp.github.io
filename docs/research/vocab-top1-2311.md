# Kế hoạch kho từ vựng EN + kho ảnh theo nghĩa lên top-1 (23/11/2026)

> TL;DR: Đo nhẹ 23/11 (`node scripts/lexicon/vocab-stats.mjs`, chỉ đọc). Kho EN 10.309 từ / 10.585 khoá nghĩa (`từ#loại`), ~1,03 nghĩa/từ; ảnh 8.324 nghĩa (78,6 %), lượt đầu ~64–66 %, âm thanh 89 % từ. Khoảng cách lớn nhất so với Oxford/Cambridge: SỐ NGHĨA/từ, số từ, ví dụ/nghĩa, collocation. Chỉ kế hoạch + đo; chưa chạy lô nào. es/ja/ko giữ kho riêng (không đụng).
> Đọc khi: điều phối lô từ vựng/ảnh EN. Chủ đề liên quan: docs/LEXICON.md, docs/VOCAB-IMG-STYLE.md, handoffs vocab-bank / vimg-lexicon-20k / dict-2000 (~/.config/lexkite/handoffs).

## 1. Đo hiện tại (nguồn: loadAllPlus = data.js + lib + expand; img.json; web/audio/w/index.txt; vimg-scene-queue.json)
- Từ (lemma) 10.309; khoá nghĩa 10.585; hàng nguồn 11.943 (nhiều bộ trùng khoá). Từ loại: n 7.087, adj 1.830, v 1.629, adv 501, cụm/thành ngữ/phrv/colloc ~750, hư từ ~140.
- CEFR (người soạn): A1 896 · A2 1.198 · B1 2.317 · B2 3.365 · C1 2.870 · C2 1.297 (đã phủ A1–C2, lệch nặng B2–C1).
- Định nghĩa + ví dụ + IPA Anh: 11.943/11.943 (100 %); IPA Mỹ 7.893 (66 %); collocation 6.400 (54 %); đồng nghĩa 3.817 (32 %).
- Ảnh: 8.324/10.585 khoá nghĩa = 78,6 % (7.968 cảnh, 356 loại cũ s1). Chưa có ảnh: n 1.068 · phrase 514 · v 204 · adj 169 · phrv 128 · adv 122 · idiom 50 · collocation 60 · hư từ 140 (ô khái niệm SVG).
- Chấm ảnh: ảnh đã đăng qua ở lượt vẽ thứ 1 = 5.517/8.324 = 66,3 % (thiên lệch người sống sót: không tính ảnh trượt). Pilot liteplus 41396836982 đo trực tiếp lượt đầu 64,4 % / 146 neuron mỗi ảnh nhận (mốc #358 53,3 %). 330 nghĩa kẹt trong `vimg-scene-queue.json` (TB 52 lần thử; trượt: kiểm nghĩa 157, thị giác 100, >6 KB 15, chữ 14).
- Âm thanh từ (Kokoro 2 giọng): 9.200/10.309 từ = 89,2 % (index 9.281 từ).
- Lô chờ xuất: expand/pending 2 lô (20261104-pilot, 20261122-r269); retry/words 2 mục; lượt expand gần nhất 22/11 n=89, retry=1.529.
- Kho lưu trữ: main 1.025/1.000 MB (lịch sử git), m2 đủ khi chạm 20k → cần m3 (infra/media-repos.json) trước khi nhân ảnh.

## 2. Mốc công khai để so (xấp xỉ, từ công bố nhà xuất bản – không sao chép nội dung)
Oxford Learner's (OALD): ~185k từ/cụm/nghĩa, ~100k+ ví dụ, Oxford 3000/5000 gắn CEFR, mỗi nghĩa có ví dụ + collocation. Cambridge Dictionary: ~140–170k mục/nghĩa, ví dụ mỗi nghĩa, cấp CEFR theo NGHĨA. Duolingo (EN): vài nghìn từ, mỗi từ có ảnh/âm thanh, không phải từ điển. Ta KHÔNG đuổi số lượng thô; đích top-1 cho NGƯỜI HỌC: phủ trọn Oxford 5000 + CEFR theo nghĩa + ảnh MỌI nghĩa đủ điều kiện + 2 giọng + ví dụ/collocation đủ.

## 3. Bảng khoảng cách và lô
| Chỉ số | Ta | Đích | Khoảng cách | Lô (chạy CI) | Chủ | Workflow |
|---|---|---|---|---|---|---|
| Từ EN (lemma) | 10.309 | 12.000 (Oxford 5000 + NGSL + AWL phủ 100 %, rồi dict-2000 lô 5+) | ~1.700 | L1: pool-ext lô 5–8 (250/lô, 5 tác tử viết add/{words,en,vi}-b<N>, chấm độc lập) | dict-2000 | PR theo nhánh (không workflow); `ext-queue.mjs 250` |
| Từ mới qua pipeline tự động | 4,2 % đạt lượt cuối (nghẽn nguồn vi người viết) | ≥ 10 % | nguồn vi | L2: `rescue=wd:1210` rồi `rewrite:300`, sau đó pilot nguồn Wikipedia langlinks | vocab-bank | lexicon-expand `rescue=wd:1210 retry_share=1 shards=1` |
| Nghĩa/từ | 1,03 | ≥ 1,3 cho 2.000 từ thông dụng (nghĩa 2–3) | ~600 nghĩa | L3: viết nghĩa thứ 2–3 tự viết cho top NGSL đa nghĩa (sense-v2) | content-95 | PR dữ liệu + `sense-check.mjs` |
| CEFR theo nghĩa | cấp theo từ#loại | gắn theo nghĩa, cờ lệch 0 | `cefr-flags.json` | L4: `cefr-check.mjs` rà cờ lệch ≥ 2 bậc, soát tay | content-95 | `node scripts/lexicon/cefr-check.mjs` (nhẹ) |
| Ví dụ ≥ 2 câu/nghĩa phổ thông | 1 | 2 (A1–B2) | ~7k nghĩa | L5: expand rescue=rewrite (ví dụ 806) + câu Tatoeba/CC0 | vocab-bank | lexicon-expand `rescue=rewrite:300` → nâng theo yield |
| Collocation | 54 % | 80 % (A1–B2 100 %) | ~2.700 | L6: viết col cho nghĩa thiếu (n/v/adj trước) | content-95 | PR dữ liệu, cổng dict-consistency |
| Đồng nghĩa | 32 % | 50 % chỉ khi CHÍNH XÁC | ~1.900 | cùng L6 | content-95 | như trên |
| IPA Mỹ | 66 % | 100 % | ~4.000 | L7: build-lexicon `--cmu` (CMUdict) + ipaus-manual cho phần còn | content-95 | `scripts/build-lexicon.mjs --write` (CI mergecheck) |
| Ảnh theo nghĩa | 78,6 % (8.324) | ≥ 95 % nghĩa đủ điều kiện | ~2.000 (đủ điều kiện ~1.300; 140 hư từ = SVG khái niệm) | L8: vocab-img-scene `fill` shards=4 variants=2 (pool CF_POOL) → L9 ô khái niệm hư từ (SVG tất định, 0 neuron) | vimg | vocab-img-scene `mode=fill shards=4 variants=2 style=` (rỗng=liteplus) |
| Ảnh lượt đầu | 64–66 % | ≥ 80 % | +14–16 điểm | L10: pilot 92 nghĩa `only=content/visual/pilot-e6.json variants=1 cands=3` đo; chỉ nhân khi ≥ 80 % mà KHÔNG đổi ngưỡng giám khảo; sửa thẻ (key không chữ, bỏ nghĩa quan hệ) | vimg | vocab-img-scene `mode=pilot pool=tail cands=3` |
| Ảnh kẹt (queue) | 330 | 0 | 330 | L11: viết lại thẻ (vimg-scenes.json) 1–2 chi tiết thấy được, xoá khỏi queue, fill lại | vimg | scene-publish.mjs + fill |
| Âm thanh 2 giọng | 89,2 % | 100 % | ~1.100 từ | L12: word-audio limit=300 shards=10 (cron 4 giờ vẫn chạy; Kokoro, 0 tiền) | word-audio | word-audio `limit=300 shards=10` |
| Kho lưu trữ ảnh | m4 64 MB, m2 gần đầy | trống cho +2.000×2 tệp (~25 MB) | thấp | m4 đủ chỗ; mở m3 khi m2 ≥ 70 % (forecast.mjs) | CI | media-repo.mjs |

## 4. Thứ tự và cổng (không đổi cổng/ngưỡng)
1. L12 + L7 + L4 trước (rẻ, 0 neuron, không đụng giám khảo): âm 89→100 %, IPA Mỹ 66→100 %, cờ CEFR sạch.
2. L10 pilot đo lượt đầu → quyết nhân L8 (fill 4 lượt/ngày đã có cron; dispatch thêm khi CF_POOL còn). Ngưỡng `vimg-judge-scene.json` KHÔNG sửa; ảnh không chữ (cổng TEXT_OBJ + OCR) giữ nguyên.
3. L2/L5 theo yield pilot (≥ ~0,1 thì nâng; không requeue mục chưa có nguồn mới).
4. L1/L3/L6 là việc viết tay (tác tử Sonnet, chấm độc lập), mỗi lô 1 nhánh; PR chỉ mở khi hết băng PR (hiện 67 mở).
Mọi nội dung TỰ VIẾT (không chép Oxford/Cambridge); dịch 15 ngôn ngữ qua lexicon-i18n; không cắt; không lộ bí mật.

## 5. Số kỳ vọng trước → sau (khi các lô chạy xong, ước tính)
Từ 10.309 → ~12.000 · nghĩa/từ 1,03 → ~1,2 · IPA Mỹ 66 → 100 % · âm 89 → 100 % · ảnh 78,6 → ~92 % (kẹt 330 → <100) · lượt đầu 64 → ≥ 80 % (nếu pilot L10 đạt) · collocation 54 → ~75 %.

## 6. Đo lại
`node scripts/lexicon/vocab-stats.mjs` (≈ vài giây, không jsdom). Lượt đầu thật: `report.mjs` → `fill-report.json` của lượt pilot (không dùng q.tries vì thiên lệch).
