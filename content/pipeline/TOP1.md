# Top-1 score (tự sinh – `node scripts/top1/score.mjs --write`, đừng sửa tay)

<!-- top1-score -->
## 🏆 Top-1 score: **81.9 / 100** · trên 2 trục có mốc: Lexkite 90.9 vs Duolingo 57.5

Gộp từ nguồn đã có, không quét lại – cách đo: [docs/TOP1-SCORE.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/docs/TOP1-SCORE.md) · sàn chỉ tăng: `content/pipeline/top1.budget.json` · lượt: https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/44730705318 · quality-sweep: https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/44669557281

| Trục | Trọng số | Lexkite | Duolingo | Sàn | Thành phần |
|---|---|---|---|---|---|
| UI (một khung, bám Stitch) | 15 | **57** | – | 55 | frame-consistency 100 · SSIM vs Stitch 39.7 · màn đã Stitch 31.4 |
| UX flows (hành trình, Thoát/Back, số chạm) | 15 | **55.6** | – | 80.6 | qa-bot (live) 0 · journey-e2e 100 · lần đầu → câu đầu 77.8 · chạm tới bài hôm nay 0 · Thoát/Back + luồng học 100 |
| Hiệu năng (Lighthouse, Web Vitals, máy yếu) | 15 | **81.8** | 33 | 80.3 | Lighthouse perf 98.3 · LCP máy yếu 0 · INP 100 · CLS 100 · TBT (tác vụ dài) 100 · CLS/long task quét đêm 92.3 |
| Trợ năng (axe AA, vùng chạm, tương phản) | 15 | **99.9** | 82 | 98 | Lighthouse a11y 99.7 · axe AA (mọi route × vi/en/ar × sáng/tối) 100 · vùng chạm ≥ 44 px 100 |
| Lỗi tiềm ẩn & logic | 15 | **95.7** | – | 97 | console/promise/4xx/tràn chữ 94.2 · add-on E2E 88.7 · bất biến FSRS/chuỗi ngày 100 · đồng bộ + chuỗi 100 |
| Nội dung (content-qa, dễ học) | 10 | **84.3** | – | 85.9 | content-qa 76.7 · learnability 91.8 |
| i18n (15 ngôn ngữ) | 10 | **100** | – | 100 | i18n-qa --strict 100 |
| Thông báo (chuẩn notif-ux) | 5 | **100** | – | 100 | nhắc học + notify-ux 100 · chuẩn thông báo (tĩnh) 100 |
| **Tổng** | 100 | **81.9** | 57.5 (2 trục) | 84.4 | trục thiếu số đo không tính (trọng số còn 100) |

### ⛔ Dưới sàn

- ux: 55.6 < sàn 80.6
- latent: 95.7 < sàn 97
- content: 84.3 < sàn 85.9
- total: 81.9 < sàn 84.4

### Top 10 nâng cấp (lợi ích ÷ công sức)

| # | Trục | Việc | +điểm tổng | Công sức | Ưu tiên | Bằng chứng |
|---|---|---|---|---|---|---|
| 1 | ux | qa-bot (live): 0 → 100 | +3 | 2 | 1.5 | failure 2026-11-20 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/44722469402 |
| 2 | ux | chạm tới bài hôm nay: 0 → 100 | +3 | 2 | 1.5 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · probe trượt: không tới bài hôm nay từ /app/?sandbox=1&hl=en#/day/1 |
| 3 | perf | LCP máy yếu: 0 → 100 | +2.5 | 3 | 0.8 | mobile-qa (máy yếu, 4G chậm) 2026-11-20 – success 2026-11-20 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/44722469129 |
| 4 | ui | màn đã Stitch: 31.4 → 100 | +3.4 | 5 | 0.7 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 22 Stitch / 70 màn (ref 45, tay 0) |
| 5 | ui | SSIM vs Stitch: 39.7 → 100 | +3 | 5 | 0.6 | [stitch-diff.json](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/stitch-diff.json) |
| 6 | content | content-qa: 76.7 → 100 | +1.2 | 4 | 0.3 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/SCORE.md |
| 7 | ux | lần đầu → câu đầu: 77.8 → 100 | +0.7 | 2 | 0.3 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 5.9 s · 9 chạm (probe 2026-11-20) |
| 8 | latent | add-on: không có lỗi console/trang từ add-on | +0.4 | 2 | 0.2 | ar/en/vi — console https://lexkite.com/app/?hl=ar#/welcome: Failed to load resource: the server respo |
| 9 | latent | medium overlap: `button.[min-width:44px].[min-height:44px]#qClear` | +0.2 | 1 | 0.2 | [ảnh](https://raw.githubusercontent.com/lexkiteapp/lexkiteapp.github.io/quality-qa/ar/ar-m-dark__dict_sustainable.png) · route ar #/dict/sustainable m-dark, ar #/dict/sustainable m-light, ar #/dict/sustainable d-dark (12) |
| 10 | content | learnability: 91.8 → 100 | +0.4 | 4 | 0.1 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/LEARN.md |

<details><summary>Chi tiết thành phần</summary>

- **ui/frame-consistency** 100 – success 2026-11-20 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/44722469254
- **ui/SSIM vs Stitch** 39.7 – SSIM trung bình 0.338 trên 26 màn×chế độ (đích 0.85; ngưỡng ratchet = điểm CI − 0,01) ([stitch-diff.json](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/stitch-diff.json))
- **ui/màn đã Stitch** 31.4 – 22 Stitch / 70 màn (ref 45, tay 0) ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 22 Stitch / 70 màn (ref 45, tay 0))
- **ux/qa-bot (live)** 0 – failure 2026-11-20 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/44722469402
- **ux/journey-e2e** 100 – success 2026-11-20 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/44722469549
- **ux/lần đầu → câu đầu** 77.8 – 5.9 s · 9 chạm (probe 2026-11-20) ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 5.9 s · 9 chạm (probe 2026-11-20))
- **ux/chạm tới bài hôm nay** 0 – probe trượt: không tới bài hôm nay từ /app/?sandbox=1&hl=en#/day/1 ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · probe trượt: không tới bài hôm nay từ /app/?sandbox=1&hl=en#/day/1)
- **ux/Thoát/Back + luồng học** 100 – ✓exit-guard.mjs ✓learn-flow.mjs
- **perf/Lighthouse perf** 98.3 – / 95, /en/ 99, /app/?hl=en 97, /en/vocabulary/ 100, /en/blog/ 99, /en/blog/about/ 100 (quality-sweep › lighthouse (6 trang, điện thoại))
- **perf/LCP máy yếu** 0 – LCP tối đa 6820 ms (tốt ≤ 2500, 0 điểm ≥ 6000) (mobile-qa (máy yếu, 4G chậm) 2026-11-20 – success 2026-11-20 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/44722469129)
- **perf/INP** 100 – INP tối đa 96 ms (tốt ≤ 200) (mobile-qa (máy yếu, 4G chậm) 2026-11-20 – success 2026-11-20 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/44722469129)
- **perf/CLS** 100 – CLS tối đa 0.0112 (tốt ≤ 0,1) (mobile-qa (máy yếu, 4G chậm) 2026-11-20 – success 2026-11-20 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/44722469129)
- **perf/TBT (tác vụ dài)** 100 – TBT tối đa 49 ms (tốt ≤ 200) (mobile-qa (máy yếu, 4G chậm) 2026-11-20 – success 2026-11-20 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/44722469129)
- **perf/CLS/long task quét đêm** 92.3 – quality-sweep: cls, layout-shift, longtask, ngân sách Lighthouse
- **a11y/Lighthouse a11y** 99.7 – / 100, /en/ 100, /app/?hl=en 98, /en/vocabulary/ 100, /en/blog/ 100, /en/blog/about/ 100 (quality-sweep › lighthouse)
- **a11y/axe AA (mọi route × vi/en/ar × sáng/tối)** 100 – quality-sweep: axe serious/critical (gồm tương phản)
- **a11y/vùng chạm ≥ 44 px** 100 – quality-sweep: touch-target (điện thoại)
- **latent/console/promise/4xx/tràn chữ** 94.2 – quality-sweep: pageerror, rejection, console, http4xx/5xx, hscroll, text-clip, overlap
- **latent/add-on E2E** 88.7 – quality-sweep: ext-e2e vi/en/ar + trang nặng
- **latent/bất biến FSRS/chuỗi ngày** 100 – 380968/380968 bất biến đạt ở 4 múi giờ ([logic-invariants.mjs](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/logic-invariants.mjs))
- **latent/đồng bộ + chuỗi** 100 – ✓sync-pack.mjs ✓sync-ctx.mjs ✓streak-ui.mjs
- **content/content-qa** 76.7 – content/pipeline/SCORE.md ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/SCORE.md)
- **content/learnability** 91.8 – content/pipeline/LEARN.md ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/LEARN.md)
- **i18n/i18n-qa --strict** 100 – 0 lỗi, 14 ngôn ngữ ngoài vi ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 0 lỗi, 14 ngôn ngữ ngoài vi)
- **notif/nhắc học + notify-ux** 100 – ✓reminders.mjs ✓notify-ux.mjs
- **notif/chuẩn thông báo (tĩnh)** 100 – ✓giờ yên lặng ✓nhắc thông minh theo giờ học ✓spec thông báo ([REMINDERS.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/docs/REMINDERS.md))

</details>
