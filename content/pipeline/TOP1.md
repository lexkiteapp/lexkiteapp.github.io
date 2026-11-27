# Top-1 score (tự sinh – `node scripts/top1/score.mjs --write`, đừng sửa tay)

<!-- top1-score -->
## 🏆 Top-1 score: **86 / 100** · trên 2 trục có mốc: Lexkite 85.8 vs Duolingo 55

Gộp từ nguồn đã có, không quét lại – cách đo: [docs/TOP1-SCORE.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/docs/TOP1-SCORE.md) · sàn chỉ tăng: `content/pipeline/top1.budget.json` · lượt: https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45968098967 · quality-sweep: https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45940420048

| Trục | Trọng số | Lexkite | Duolingo | Sàn | Thành phần |
|---|---|---|---|---|---|
| UI (một khung, bám Stitch) | 15 | **56.5** | – | 55 | frame-consistency 100 · SSIM vs Stitch 38.6 · màn đã Stitch 31 |
| UX flows (hành trình, Thoát/Back, số chạm) | 15 | **95.6** | – | 90.6 | qa-bot (live) 100 · journey-e2e 100 · lần đầu → câu đầu 77.8 · chạm tới bài hôm nay 100 · Thoát/Back + luồng học 100 |
| Hiệu năng (Lighthouse, Web Vitals, máy yếu) | 15 | **83.1** | 28 | 80.3 | Lighthouse perf 97.8 · LCP máy yếu 2.6 · INP 100 · CLS 100 · TBT (tác vụ dài) 100 · CLS/long task quét đêm 98 |
| Trợ năng (axe AA, vùng chạm, tương phản) | 15 | **88.5** | 82 | 98 | Lighthouse a11y 99.7 · axe AA (mọi route × vi/en/ar × sáng/tối) 88.7 · vùng chạm ≥ 44 px 77.1 |
| Lỗi tiềm ẩn & logic | 15 | **92.5** | – | 97 | console/promise/4xx/tràn chữ 69.8 · add-on E2E 100 · bất biến FSRS/chuỗi ngày 100 · đồng bộ + chuỗi 100 |
| Nội dung (content-qa, dễ học) | 10 | **85.2** | – | 85.9 | content-qa 78.6 · learnability 91.8 |
| i18n (15 ngôn ngữ) | 10 | **100** | – | 100 | i18n-qa --strict 100 |
| Thông báo (chuẩn notif-ux) | 5 | **100** | – | 100 | nhắc học + notify-ux 100 · chuẩn thông báo (tĩnh) 100 |
| **Tổng** | 100 | **86** | 55 (2 trục) | 86.6 | trục thiếu số đo không tính (trọng số còn 100) |

### ⛔ Dưới sàn

- latent: 92.5 < sàn 97
- content: 85.2 < sàn 85.9
- total: 86 < sàn 86.6
- a11y: 88.5 < sàn 98

### Top 10 nâng cấp (lợi ích ÷ công sức)

| # | Trục | Việc | +điểm tổng | Công sức | Ưu tiên | Bằng chứng |
|---|---|---|---|---|---|---|
| 1 | perf | LCP máy yếu: 2.6 → 100 | +2.4 | 3 | 0.8 | mobile-qa (máy yếu, 4G chậm) 2026-11-27 – success 2026-11-27 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45968156297 |
| 2 | ui | màn đã Stitch: 31 → 100 | +3.5 | 5 | 0.7 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 22 Stitch / 71 màn (ref 45, tay 0) |
| 3 | ui | SSIM vs Stitch: 38.6 → 100 | +3.1 | 5 | 0.6 | [stitch-diff.json](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/stitch-diff.json) |
| 4 | a11y | high axe-serious: `link-in-text-block a[href$="#/library"]` | +0.6 | 1 | 0.6 | [ảnh](https://raw.githubusercontent.com/lexkiteapp/lexkiteapp.github.io/quality-qa/ar/ar-m-dark__deck.png) · route ar #/deck m-dark, ar #/deck m-light, ar #/deck d-dark (12) |
| 5 | content | content-qa: 78.6 → 100 | +1.1 | 4 | 0.3 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/SCORE.md |
| 6 | ux | lần đầu → câu đầu: 77.8 → 100 | +0.7 | 2 | 0.3 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 6.2 s · 9 chạm (probe 2026-11-27) |
| 7 | latent | medium overlap: `button.w-10.h-10` | +0.2 | 1 | 0.2 | [ảnh](https://raw.githubusercontent.com/lexkiteapp/lexkiteapp.github.io/quality-qa/ar/ar-m-light__stats.png) · route ar #/stats m-light, ar #/stats m-dark, ar #/mistakes m-dark (12) |
| 8 | latent | medium overlap: `a.inline-flex.items-center` | +0.2 | 1 | 0.2 | [ảnh](https://raw.githubusercontent.com/lexkiteapp/lexkiteapp.github.io/quality-qa/ar/ar-m-dark__topic_ngsl1.png) · route ar #/topic/ngsl1 m-dark, ar #/topic/ngsl1 m-light, ar #/topic/office-email m-dark (12) |
| 9 | latent | medium overlap: `button.absolute.-right-px#dkMic` | +0.2 | 1 | 0.2 | [ảnh](https://raw.githubusercontent.com/lexkiteapp/lexkiteapp.github.io/quality-qa/ar/ar-m-dark__deck.png) · route ar #/deck m-dark, ar #/deck m-light, ar #/deck d-dark (12) |
| 10 | latent | medium overlap: `button.[background:linear-gradient(180deg,_#FF7B54_0%,_#F2553B_100%)].` | +0.2 | 1 | 0.2 | [ảnh](https://raw.githubusercontent.com/lexkiteapp/lexkiteapp.github.io/quality-qa/ar/ar-m-light__stats.png) · route ar #/stats m-light, ar #/stats m-dark, en #/stats m-dark (6) |

<details><summary>Chi tiết thành phần</summary>

- **ui/frame-consistency** 100 – success 2026-11-27 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45968156161
- **ui/SSIM vs Stitch** 38.6 – SSIM trung bình 0.328 trên 26 màn×chế độ (đích 0.85; ngưỡng ratchet = điểm CI − 0,01) ([stitch-diff.json](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/stitch-diff.json))
- **ui/màn đã Stitch** 31 – 22 Stitch / 71 màn (ref 45, tay 0) ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 22 Stitch / 71 màn (ref 45, tay 0))
- **ux/qa-bot (live)** 100 – success 2026-11-27 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45959119525
- **ux/journey-e2e** 100 – success 2026-11-27 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45968156269
- **ux/lần đầu → câu đầu** 77.8 – 6.2 s · 9 chạm (probe 2026-11-27) ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 6.2 s · 9 chạm (probe 2026-11-27))
- **ux/chạm tới bài hôm nay** 100 – 1 chạm ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 1 chạm)
- **ux/Thoát/Back + luồng học** 100 – ✓exit-guard.mjs ✓learn-flow.mjs
- **perf/Lighthouse perf** 97.8 – / 100, /en/ 99, /app/?hl=en 90, /en/vocabulary/ 100, /en/blog/ 98, /en/blog/about/ 100 (quality-sweep › lighthouse (6 trang, điện thoại))
- **perf/LCP máy yếu** 2.6 – LCP tối đa 5909 ms (tốt ≤ 2500, 0 điểm ≥ 6000) (mobile-qa (máy yếu, 4G chậm) 2026-11-27 – success 2026-11-27 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45968156297)
- **perf/INP** 100 – INP tối đa 104 ms (tốt ≤ 200) (mobile-qa (máy yếu, 4G chậm) 2026-11-27 – success 2026-11-27 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45968156297)
- **perf/CLS** 100 – CLS tối đa 0.0025 (tốt ≤ 0,1) (mobile-qa (máy yếu, 4G chậm) 2026-11-27 – success 2026-11-27 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45968156297)
- **perf/TBT (tác vụ dài)** 100 – TBT tối đa 12 ms (tốt ≤ 200) (mobile-qa (máy yếu, 4G chậm) 2026-11-27 – success 2026-11-27 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45968156297)
- **perf/CLS/long task quét đêm** 98 – quality-sweep: cls, layout-shift, longtask, ngân sách Lighthouse
- **a11y/Lighthouse a11y** 99.7 – / 100, /en/ 100, /app/?hl=en 98, /en/vocabulary/ 100, /en/blog/ 100, /en/blog/about/ 100 (quality-sweep › lighthouse)
- **a11y/axe AA (mọi route × vi/en/ar × sáng/tối)** 88.7 – quality-sweep: axe serious/critical (gồm tương phản)
- **a11y/vùng chạm ≥ 44 px** 77.1 – quality-sweep: touch-target (điện thoại)
- **latent/console/promise/4xx/tràn chữ** 69.8 – quality-sweep: pageerror, rejection, console, http4xx/5xx, hscroll, text-clip, overlap
- **latent/add-on E2E** 100 – quality-sweep: ext-e2e vi/en/ar + trang nặng
- **latent/bất biến FSRS/chuỗi ngày** 100 – 380968/380968 bất biến đạt ở 4 múi giờ ([logic-invariants.mjs](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/logic-invariants.mjs))
- **latent/đồng bộ + chuỗi** 100 – ✓sync-pack.mjs ✓sync-ctx.mjs ✓streak-ui.mjs
- **content/content-qa** 78.6 – content/pipeline/SCORE.md ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/SCORE.md)
- **content/learnability** 91.8 – content/pipeline/LEARN.md ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/LEARN.md)
- **i18n/i18n-qa --strict** 100 – 0 lỗi, 14 ngôn ngữ ngoài vi ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 0 lỗi, 14 ngôn ngữ ngoài vi)
- **notif/nhắc học + notify-ux** 100 – ✓reminders.mjs ✓notify-ux.mjs
- **notif/chuẩn thông báo (tĩnh)** 100 – ✓giờ yên lặng ✓nhắc thông minh theo giờ học ✓spec thông báo ([REMINDERS.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/docs/REMINDERS.md))

</details>
