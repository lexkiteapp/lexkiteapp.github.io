# Soát lỗi nội dung người học 15/11 – chấm mù, tỉ lệ lỗi, sửa gốc

> TL;DR: Chấm mù 574 mục (ngữ pháp, từ vựng, nhập vai, đề thi, Speaking, 13 ngôn ngữ giải thích): 9,6 % có lỗi NẶNG, 21,4 % có lỗi. Gần như toàn bộ lỗi nặng nằm ở BẢN DỊCH máy (dịch luôn ví dụ tiếng Anh, dịch từng chữ thành ngữ); tiếng Anh, đáp án, đề thi gần sạch.
> Đọc khi: sửa generator dịch (gen-content-i18n, gen-word-packs), thêm nội dung đa ngôn ngữ, đo chất lượng nội dung.

## 1. Cách đo (tái lập được)
- Lấy mẫu: `node scripts/content-qa/lesson-sample.mjs --seed N --out DIR` – phân tầng theo loại × cấp A1–C2 × 13 ngôn ngữ, ~600 mục, chia lô 30 mục, bản mù (không có nguồn).
- Chấm: 20 subagent Sonnet song song, mỗi agent một lô, rubric: đáp án đúng/duy nhất, tiếng Anh tự nhiên, IPA UK/US, dịch đúng nghĩa + xưng hô (de Sie, es tú, fr vous…), ví dụ không gây hiểu sai. Kết quả `result-NN.json`.
- Gộp: `node scripts/content-qa/lesson-tally.mjs DIR` (bảng theo loại/ngôn ngữ/cấp/kiểu lỗi).
- Giới hạn: giám khảo là AI (có thể chấm quá tay hoặc bỏ sót); âm thanh không nghe được → xem §4. Nội dung viết tay tiếng Anh được chấm sát, lỗi "minor" gồm cả chỗ chưa tối ưu.

## 2. Vòng 1 (seed 1, 574 mục)

## kind
| kind | n | major | minor | tỉ lệ major | tỉ lệ có lỗi |
|---|--:|--:|--:|--:|--:|
| exam-cambridge | 29 | 0 | 3 | 0.0% | 10.3% |
| exam-listen | 21 | 0 | 1 | 0.0% | 4.8% |
| exam-readtest | 10 | 0 | 0 | 0.0% | 0.0% |
| gold | 48 | 1 | 6 | 2.1% | 14.6% |
| grammar-drill | 60 | 0 | 3 | 0.0% | 5.0% |
| grammar-quiz | 60 | 0 | 0 | 0.0% | 0.0% |
| i18n-ui | 104 | 31 | 25 | 29.8% | 53.8% |
| l1-note | 39 | 0 | 0 | 0.0% | 0.0% |
| match-tr | 12 | 0 | 0 | 0.0% | 0.0% |
| roleplay | 42 | 0 | 3 | 0.0% | 7.1% |
| speaking | 30 | 0 | 1 | 0.0% | 3.3% |
| story-q | 11 | 0 | 0 | 0.0% | 0.0% |
| vocab | 108 | 23 | 26 | 21.3% | 45.4% |

## lang
| lang | n | major | minor | tỉ lệ major | tỉ lệ có lỗi |
|---|--:|--:|--:|--:|--:|
| ar | 12 | 0 | 2 | 0.0% | 16.7% |
| de | 12 | 8 | 0 | 66.7% | 66.7% |
| en | 191 | 1 | 14 | 0.5% | 7.9% |
| es | 12 | 0 | 1 | 0.0% | 8.3% |
| fr | 12 | 1 | 3 | 8.3% | 33.3% |
| hi | 12 | 3 | 4 | 25.0% | 58.3% |
| id | 12 | 3 | 2 | 25.0% | 41.7% |
| ja | 11 | 1 | 4 | 9.1% | 45.5% |
| ko | 11 | 3 | 1 | 27.3% | 36.4% |
| pt | 12 | 2 | 1 | 16.7% | 25.0% |
| ru | 12 | 3 | 2 | 25.0% | 41.7% |
| th | 12 | 2 | 2 | 16.7% | 33.3% |
| tr | 12 | 2 | 2 | 16.7% | 33.3% |
| vi | 121 | 0 | 3 | 0.0% | 2.5% |
| vocab-multi | 108 | 23 | 26 | 21.3% | 45.4% |
| zh | 12 | 3 | 1 | 25.0% | 33.3% |

## level
| level | n | major | minor | tỉ lệ major | tỉ lệ có lỗi |
|---|--:|--:|--:|--:|--:|
| ? | 250 | 32 | 35 | 12.8% | 26.8% |
| A1 | 51 | 0 | 4 | 0.0% | 7.8% |
| A2 | 69 | 2 | 10 | 2.9% | 17.4% |
| B1 | 74 | 2 | 7 | 2.7% | 12.2% |
| B2 | 59 | 9 | 5 | 15.3% | 23.7% |
| C1 | 40 | 5 | 3 | 12.5% | 20.0% |
| C2 | 31 | 5 | 4 | 16.1% | 29.0% |

## all
| all | n | major | minor | tỉ lệ major | tỉ lệ có lỗi |
|---|--:|--:|--:|--:|--:|
| ALL | 574 | 55 | 68 | 9.6% | 21.4% |

## type
| type | n | major | minor | tỉ lệ major | tỉ lệ có lỗi |
|---|--:|--:|--:|--:|--:|
| ADDRESS | 1 | 1 | 0 | 100.0% | 100.0% |
| ANSWER | 5 | 0 | 5 | 0.0% | 100.0% |
| ENGLISH | 3 | 1 | 2 | 33.3% | 100.0% |
| IPA | 6 | 2 | 4 | 33.3% | 100.0% |
| MISLEADING | 18 | 5 | 13 | 27.8% | 100.0% |
| OTHER | 8 | 0 | 8 | 0.0% | 100.0% |
| TRANSLATION | 96 | 54 | 42 | 56.3% | 100.0% |

chấm 574/574 mục, 0 id lạ

### Theo nguồn (gói nghĩa từ `web/packs`, cờ trong gói)
Từ vựng (mục `vocab`, mỗi mục 2 bản dịch): cờ 0 (dịch nhanh) 17/53 sai nặng (32 %) · cờ 1 (cũ, chưa kiểm dịch ngược) 13/25 (52 %) · cờ 2 (bảng tay) 1/15 (7 %) · cờ 3 (đã kiểm dịch ngược) 15/113 (13 %). Kết luận: cờ 0/1 chưa đạt, kiểm dịch ngược giúp nhưng chưa đủ với thành ngữ/cụm động từ (dịch từng chữ: "circle back"→"vòng lại", "a piece of cake"→"một miếng bánh", "splash out on"→"bắn tung tóe").

## 3. Gốc lỗi và cách sửa
| Gốc | Bằng chứng | Sửa | Cổng CI |
|---|---|---|---|
| **A. Generator dịch nội dung (`gen-content-i18n.mjs`, Google gtx) dịch luôn ví dụ tiếng Anh trong câu giải thích** ("Apple…→ an apple" thành "사과…→ 사과"; "‘I like’" thành "Ich mag") | 2.823/3.497 chuỗi có ví dụ trong ngoặc bị mất ví dụ (81 %, đủ 13 ngôn ngữ); ~460 chuỗi/ngôn ngữ còn từ Anh không ngoặc bị dịch | `scripts/lib/quote-english.mjs`: `restore()` thay mảnh dịch bằng mảnh Anh gốc khi số mảnh ngoặc khớp; gắn vào generator (mọi bản dịch mới); `scripts/content-qa/quote-english-fix.mjs --write` sửa kho cũ: **2.250 chuỗi sửa**, còn ~1.000 lệch số mảnh → hàng dịch lại | `scripts/test/quote-english.mjs` + `content/qa/quote-english-baseline.json` (số chuỗi vi phạm mỗi ngôn ngữ chỉ được giảm) |
| **B. Gói nghĩa từ máy dịch (cờ 0/1) sai nghĩa/loại từ/dịch từng chữ thành ngữ** | §2 theo cờ | (PR 2) sửa các mục bắt được bằng bảng tay `content/wordlists/pack-fix.gloss.json`; hàng đợi `--refine` ưu tiên cờ 0/1 + cụm/thành ngữ | `pack-gloss` đã có; thêm luật: mục `phr v`/`idiom` cờ < 2 không hiện như nghĩa chuẩn |
| C. Xưng hô de: `füge … hinzu` (du) trong khi quy ước Sie | I045 | (PR 2) quét du-form de trong kho | `i18n-qa` register |

## 4. Âm thanh
`web/audio/l/asr.tsv` (Whisper đối chiếu từng câu 55.970): 92,38 % khớp; 4.266 câu (7,6 %) lệch – danh sách `asr-fail.tsv`, nguyên nhân phần lớn là từ viết tắt/ký hiệu (MC, "every day" vs "everyday"). Chưa nghe lại bằng người.

## 5. Còn mở
Vòng 2 sau sửa (mẫu seed khác) và dịch lại ~1.000 chuỗi lệch số mảnh + lớp "từ Anh không ngoặc": xem cuối file khi PR 2 hoàn tất.
