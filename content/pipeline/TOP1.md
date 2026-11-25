# Top-1 score (tự sinh – `node scripts/top1/score.mjs --write`, đừng sửa tay)

<!-- top1-score -->
## 🏆 Top-1 score: **82.1 / 100** · trên 2 trục có mốc: Lexkite 87.7 vs Duolingo 55

Gộp từ nguồn đã có, không quét lại – cách đo: [docs/TOP1-SCORE.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/docs/TOP1-SCORE.md) · sàn chỉ tăng: `content/pipeline/top1.budget.json` · lượt: https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45521460185 · quality-sweep: https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45339911977

| Trục | Trọng số | Lexkite | Duolingo | Sàn | Thành phần |
|---|---|---|---|---|---|
| UI (một khung, bám Stitch) | 15 | **23.7** | – | 55 | frame-consistency 0 · SSIM vs Stitch 39.7 · màn đã Stitch 31.4 |
| UX flows (hành trình, Thoát/Back, số chạm) | 15 | **95.6** | – | 90.6 | qa-bot (live) 100 · journey-e2e 100 · lần đầu → câu đầu 77.8 · chạm tới bài hôm nay 100 · Thoát/Back + luồng học 100 |
| Hiệu năng (Lighthouse, Web Vitals, máy yếu) | 15 | **82** | 28 | 80.3 | Lighthouse perf 99.5 · LCP máy yếu 0 · INP 100 · CLS 100 · TBT (tác vụ dài) 100 · CLS/long task quét đêm 92.3 |
| Trợ năng (axe AA, vùng chạm, tương phản) | 15 | **93.3** | 82 | 98 | Lighthouse a11y 99.7 · axe AA (mọi route × vi/en/ar × sáng/tối) 100 · vùng chạm ≥ 44 px 80.3 |
| Lỗi tiềm ẩn & logic | 15 | **95.7** | – | 97 | console/promise/4xx/tràn chữ 94.2 · add-on E2E 88.7 · bất biến FSRS/chuỗi ngày 100 · đồng bộ + chuỗi 100 |
| Nội dung (content-qa, dễ học) | 10 | **85.1** | – | 85.9 | content-qa 78.3 · learnability 91.8 |
| i18n (15 ngôn ngữ) | 10 | **100** | – | 100 | i18n-qa --strict 100 |
| Thông báo (chuẩn notif-ux) | 5 | **100** | – | 100 | nhắc học + notify-ux 100 · chuẩn thông báo (tĩnh) 100 |
| **Tổng** | 100 | **82.1** | 55 (2 trục) | 84.4 | trục thiếu số đo không tính (trọng số còn 100) |

### ⛔ Dưới sàn

- ui: 23.7 < sàn 55
- latent: 95.7 < sàn 97
- content: 85.1 < sàn 85.9
- total: 82.1 < sàn 84.4
- a11y: 93.3 < sàn 98

### Top 10 nâng cấp (lợi ích ÷ công sức)

| # | Trục | Việc | +điểm tổng | Công sức | Ưu tiên | Bằng chứng |
|---|---|---|---|---|---|---|
| 1 | ui | frame-consistency: 0 → 100 | +5 | 3 | 1.7 | failure 2026-11-25 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45515664875 |
| 2 | perf | LCP máy yếu: 0 → 100 | +2.5 | 3 | 0.8 | mobile-qa (máy yếu, 4G chậm) 2026-11-25 – success 2026-11-25 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45515664732 |
| 3 | ui | màn đã Stitch: 31.4 → 100 | +3.4 | 5 | 0.7 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 22 Stitch / 70 màn (ref 45, tay 0) |
| 4 | ui | SSIM vs Stitch: 39.7 → 100 | +3 | 5 | 0.6 | [stitch-diff.json](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/stitch-diff.json) |
| 5 | content | content-qa: 78.3 → 100 | +1.1 | 4 | 0.3 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/SCORE.md |
| 6 | ux | lần đầu → câu đầu: 77.8 → 100 | +0.7 | 2 | 0.3 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 5.7 s · 9 chạm (probe 2026-11-25) |
| 7 | latent | add-on: không có lỗi console/trang từ add-on | +0.4 | 2 | 0.2 | ar/en/vi — console https://lexkite.com/app/?hl=ar#/welcome: Failed to load resource: the server respo |
| 8 | latent | medium overlap: `button.[min-width:44px].[min-height:44px]#qClear` | +0.2 | 1 | 0.2 | [ảnh](https://raw.githubusercontent.com/lexkiteapp/lexkiteapp.github.io/quality-qa/ar/ar-m-dark__dict_sustainable.png) · route ar #/dict/sustainable m-dark, ar #/dict/sustainable m-light, ar #/dict/sustainable d-dark (12) |
| 9 | content | learnability: 91.8 → 100 | +0.4 | 4 | 0.1 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/LEARN.md |
| 10 | perf | medium cls: `layout-shift` | +0.1 | 2 | 0.1 | [ảnh](https://raw.githubusercontent.com/lexkiteapp/lexkiteapp.github.io/quality-qa/ar/ar-m-dark__speak.png) · route ar #/speak m-dark, ar #/speak m-light, ar #/skills d-light (4) |

<details><summary>Chi tiết thành phần</summary>

- **ui/frame-consistency** 0 – failure 2026-11-25 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45515664875
- **ui/SSIM vs Stitch** 39.7 – SSIM trung bình 0.338 trên 26 màn×chế độ (đích 0.85; ngưỡng ratchet = điểm CI − 0,01) ([stitch-diff.json](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/stitch-diff.json))
- **ui/màn đã Stitch** 31.4 – 22 Stitch / 70 màn (ref 45, tay 0) ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 22 Stitch / 70 màn (ref 45, tay 0))
- **ux/qa-bot (live)** 100 – success 2026-11-25 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45515503394
- **ux/journey-e2e** 100 – success 2026-11-25 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45515664473
- **ux/lần đầu → câu đầu** 77.8 – 5.7 s · 9 chạm (probe 2026-11-25) ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 5.7 s · 9 chạm (probe 2026-11-25))
- **ux/chạm tới bài hôm nay** 100 – 1 chạm ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 1 chạm)
- **ux/Thoát/Back + luồng học** 100 – ✓exit-guard.mjs ✓learn-flow.mjs
- **perf/Lighthouse perf** 99.5 – / 100, /en/ 99, /app/?hl=en 98, /en/vocabulary/ 100, /en/blog/ 100, /en/blog/about/ 100 (quality-sweep › lighthouse (6 trang, điện thoại))
- **perf/LCP máy yếu** 0 – LCP tối đa 6676 ms (tốt ≤ 2500, 0 điểm ≥ 6000) (mobile-qa (máy yếu, 4G chậm) 2026-11-25 – success 2026-11-25 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45515664732)
- **perf/INP** 100 – INP tối đa 96 ms (tốt ≤ 200) (mobile-qa (máy yếu, 4G chậm) 2026-11-25 – success 2026-11-25 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45515664732)
- **perf/CLS** 100 – CLS tối đa 0.0022 (tốt ≤ 0,1) (mobile-qa (máy yếu, 4G chậm) 2026-11-25 – success 2026-11-25 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45515664732)
- **perf/TBT (tác vụ dài)** 100 – TBT tối đa 127 ms (tốt ≤ 200) (mobile-qa (máy yếu, 4G chậm) 2026-11-25 – success 2026-11-25 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45515664732)
- **perf/CLS/long task quét đêm** 92.3 – quality-sweep: cls, layout-shift, longtask, ngân sách Lighthouse
- **a11y/Lighthouse a11y** 99.7 – / 100, /en/ 100, /app/?hl=en 98, /en/vocabulary/ 100, /en/blog/ 100, /en/blog/about/ 100 (quality-sweep › lighthouse)
- **a11y/axe AA (mọi route × vi/en/ar × sáng/tối)** 100 – quality-sweep: axe serious/critical (gồm tương phản)
- **a11y/vùng chạm ≥ 44 px** 80.3 – quality-sweep: touch-target (điện thoại)
- **latent/console/promise/4xx/tràn chữ** 94.2 – quality-sweep: pageerror, rejection, console, http4xx/5xx, hscroll, text-clip, overlap
- **latent/add-on E2E** 88.7 – quality-sweep: ext-e2e vi/en/ar + trang nặng
- **latent/bất biến FSRS/chuỗi ngày** 100 – 380968/380968 bất biến đạt ở 4 múi giờ ([logic-invariants.mjs](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/logic-invariants.mjs))
- **latent/đồng bộ + chuỗi** 100 – ✓sync-pack.mjs ✓sync-ctx.mjs ✓streak-ui.mjs
- **content/content-qa** 78.3 – content/pipeline/SCORE.md ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/SCORE.md)
- **content/learnability** 91.8 – content/pipeline/LEARN.md ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/LEARN.md)
- **i18n/i18n-qa --strict** 100 – 0 lỗi, 14 ngôn ngữ ngoài vi ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 0 lỗi, 14 ngôn ngữ ngoài vi)
- **notif/nhắc học + notify-ux** 100 – ✓reminders.mjs ✓notify-ux.mjs
- **notif/chuẩn thông báo (tĩnh)** 100 – ✓giờ yên lặng ✓nhắc thông minh theo giờ học ✓spec thông báo ([REMINDERS.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/docs/REMINDERS.md))

</details>
