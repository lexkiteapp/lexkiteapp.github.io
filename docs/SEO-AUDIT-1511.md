# SEO audit live 15/11 – blog, trang từ /<lang>/words/ (R2), đề thi/công cụ
> TL;DR: 1.407 trang lấy mẫu từ 39 sitemap trên lexkite.com đều 200, canonical đúng, không noindex, JSON-LD hợp lệ, ảnh có alt. Lỗi thật: `/ko/words/<slug>/` 404 (R2 mất 308), phản hồi R2 thiếu header bảo mật, `<title>` > 60 ký tự ở ~70 % trang, `lastmod` = hôm nay ở 6 sitemap tĩnh. Đã sửa gốc trong generator/Function ở PR này.
> Đọc khi: làm SEO, sitemap, trang từ R2, hoặc đo lại index.

Đo ngày 15/11/2026 bằng curl (không đăng nhập, không gửi form). Công cụ: crawler một lần (python + curl), mẫu = toàn bộ blog (443), authority/grammar/ielts-writing/pronunciation/tools/dict (mọi URL), `pages` 60, `words-<lang>` 25/ngôn ngữ, `conversations` 25. Riêng `/ko/words/` kiểm đủ 261/261 URL trong sitemap → 200.

## Kết quả theo mục kiểm
| Mục | Kết quả |
|---|---|
| Mã 200 | 1.407/1.407 sau khi chạy chậm (lần đầu 340 blog trả 429 do em gửi dồn – bot giới hạn tốc độ của Cloudflare, không phải lỗi trang) |
| Canonical tuyệt đối đúng | Đạt toàn mẫu |
| noindex | Không trang nào (trừ trang cố ý) |
| Meta description | Đạt. 10 trang bị cờ "thiếu/ngắn" ban đầu là dương tính giả của crawler (regex dừng ở dấu `'` trong mô tả nháy kép, vd. `l'IELTS`); đọc lại bằng parser đúng: 78–192 ký tự, đủ. Không có lỗi |
| JSON-LD | Parse hợp lệ mọi trang; blog có Article/FAQ/Breadcrumb |
| Ảnh alt | Không `<img>` nào thiếu alt trong mẫu |
| hreflang | Trang từ/blog có bản dịch: đủ + x-default. Bài blog chưa có bản dịch (153/443) không phát hreflang (hợp lệ, P3) |
| sitemap | Mọi URL mẫu có trong sitemap; sitemap index 39 file hợp lệ |
| Link nội bộ | Xem mục "Link gãy" cuối file |

## Lỗi và mức ưu tiên
| # | Mức | Phát hiện | Xử lý |
|---|---|---|---|
| 1 | **P1** | `lastmod` của `sitemap-pages` (614), `-authority` (105), `-grammar` (77), `-ielts-writing` (65), `-pronunciation` (57), `-tools` (120) đều = hôm nay (15/11) → Google bỏ qua lastmod cả site. `conversations` đồng loạt 13/11. words/blog đúng (sổ băm / ngày bài). Đã nêu ở `SEO-AUDIT-1211.md` #2, chưa ai sửa | **Chưa sửa trong PR này** (cần sổ băm `content/seo/lastmod.json` cho 6 generator + bước ghi sổ trên CI `seo-indexnow.yml` đang chỉ dựng trang từ). Việc riêng, xem "Việc tiếp" |
| 2 | **P1** | `/ko/words/<slug>/` (có `/` cuối) → **404**; các ngôn ngữ còn trong dist (`/es/words/x/`) → 308 về không `/`. File ko đã rời dist nên Pages không tự chuyển được; link ngoài có `/` cuối mất trang | **Đã sửa**: `functions/[lang]/words/[[path]].js` trả 308 cho slug hợp lệ; test `words-r2-fn` |
| 3 | **P2** | Phản hồi Function R2 (`/ko/words/*`) không có `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `HSTS`, `COOP`, `Permissions-Policy` (Function trả Response riêng, không qua `web/_headers`). Header đang là của Function (`cache-control: s-maxage=3600…`, đúng yêu cầu) nhưng thiếu bộ bảo mật. Cũng thiếu `ETag` (R2 `httpEtag` không về) | **Đã sửa** (bộ header lặp lại trong Function + test). CSP report-only chưa lặp (dài, chỉ báo cáo). ETag: để sau |
| 4 | **P2** | `<title>` > 60 ký tự: blog 319/443, grammar 77/77 (TB 83), ielts-writing 65/65 (TB 91), samples 58/60 (TB 94), pronunciation 56/57, words 193/375, tools 53/120, authority 36/105, dict 27/80 | **Đã sửa** ở generator: `scripts/lib/title-fit.mjs` (`fitTitle`: bỏ dần đoạn đuôi sau " \| ", " – ", ": " rồi cắt theo từ; trang mẫu chỉ cắt theo từ để giữ chủ đề) gắn vào `build-blog`, `build-seo-pages`, `build-tools`, `build-authority`, `build-samples`, `build-samples-en`. Worker từ điển (`workers/dict/render.mjs`) chưa gắn (27/80 trang dài 61–64) |
| 5 | **P3** | Trang `/en/ielts-writing/task-1/*` (40 mẫu) và bài blog chỉ một ngôn ngữ không có hreflang nào (kể cả tự tham chiếu) | Hợp lệ nếu không có bản dịch; thêm self-hreflang để thống nhất – chưa làm |
| 6 | **P3** | `/ko/words/` sitemap 261 URL vs các ngôn ngữ R2 khác 125–261, `words-vi` 1.268: quy mô index lệch (cổng độ dày) – đã theo dõi ở `SEO-GROWTH-PLAN.md` | Không đổi |
| 7 | **P3** | Tải sitemap bằng Python (không gzip) bị cắt giữa chừng (`IncompleteRead`) ở một số file; curl lấy đủ | Chưa tái hiện với Googlebot (gzip); theo dõi |

Đính chính: mục meta description ở bản đầu của audit sai (xem bảng trên) – không cần session blog sửa.

Không sửa nội dung bài/trang của các session blog, từ điển, đề thi (chỉ template/generator/Function).

## Việc tiếp (đề xuất)
- P1 #1: thêm bước hậu kỳ `lastmodStore` cho 6 sitemap tĩnh + chạy ghi sổ trên CI.
- P3: self-hreflang cho trang một ngôn ngữ; gắn `fitTitle` vào Worker từ điển.

## Link gãy (nội bộ)
Gom 6.300 link nội bộ duy nhất từ 1.407 trang mẫu, kiểm 6.282 (bỏ asset/app/api): 6.280 trả 200/3xx. Gãy thật: **1** – `/toeic/` (404) trong `content/blog/th/theknik-toeic-listening.md` (P3; nội dung của session blog → báo, không sửa ở đây; đích đúng là trang TOEIC theo ngôn ngữ). 2 lần timeout (`/ru/words/debate`, `/emerge`) đã kiểm lại = 200.
