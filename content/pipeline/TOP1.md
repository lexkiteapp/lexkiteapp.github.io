# Top-1 score (tự sinh – `node scripts/top1/score.mjs --write`, đừng sửa tay)

<!-- top1-score -->
## 🏆 Top-1 score: **88.6 / 100** · trên 2 trục có mốc: Lexkite 90.7 vs Duolingo 55

Gộp từ nguồn đã có, không quét lại – cách đo: [docs/TOP1-SCORE.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/docs/TOP1-SCORE.md) · sàn chỉ tăng: `content/pipeline/top1.budget.json` · lượt: https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45809121877 · quality-sweep: https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45754651910

| Trục | Trọng số | Lexkite | Duolingo | Sàn | Thành phần |
|---|---|---|---|---|---|
| UI (một khung, bám Stitch) | 15 | **56.9** | – | 55 | frame-consistency 100 · SSIM vs Stitch 39.7 · màn đã Stitch 31 |
| UX flows (hành trình, Thoát/Back, số chạm) | 15 | **95.6** | – | 90.6 | qa-bot (live) 100 · journey-e2e 100 · lần đầu → câu đầu 77.8 · chạm tới bài hôm nay 100 · Thoát/Back + luồng học 100 |
| Hiệu năng (Lighthouse, Web Vitals, máy yếu) | 15 | **82.1** | 28 | 80.3 | Lighthouse perf 98.2 · LCP máy yếu 2.1 · INP 100 · CLS 100 · TBT (tác vụ dài) 100 · CLS/long task quét đêm 92.3 |
| Trợ năng (axe AA, vùng chạm, tương phản) | 15 | **99.2** | 82 | 98 | Lighthouse a11y 99.7 · axe AA (mọi route × vi/en/ar × sáng/tối) 100 · vùng chạm ≥ 44 px 98 |
| Lỗi tiềm ẩn & logic | 15 | **100** | – | 97 | console/promise/4xx/tràn chữ 100 · add-on E2E 100 · bất biến FSRS/chuỗi ngày 100 · đồng bộ + chuỗi 100 |
| Nội dung (content-qa, dễ học) | 10 | **85.2** | – | 85.9 | content-qa 78.5 · learnability 91.8 |
| i18n (15 ngôn ngữ) | 10 | **100** | – | 100 | i18n-qa --strict 100 |
| Thông báo (chuẩn notif-ux) | 5 | **100** | – | 100 | nhắc học + notify-ux 100 · chuẩn thông báo (tĩnh) 100 |
| **Tổng** | 100 | **88.6** | 55 (2 trục) | 86.6 | trục thiếu số đo không tính (trọng số còn 100) |

### ⛔ Dưới sàn

- content: 85.2 < sàn 85.9

### Top 10 nâng cấp (lợi ích ÷ công sức)

| # | Trục | Việc | +điểm tổng | Công sức | Ưu tiên | Bằng chứng |
|---|---|---|---|---|---|---|
| 1 | perf | LCP máy yếu: 2.1 → 100 | +2.4 | 3 | 0.8 | mobile-qa (máy yếu, 4G chậm) 2026-11-26 – success 2026-11-26 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45799164731 |
| 2 | ui | màn đã Stitch: 31 → 100 | +3.5 | 5 | 0.7 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 22 Stitch / 71 màn (ref 45, tay 0) |
| 3 | ui | SSIM vs Stitch: 39.7 → 100 | +3 | 5 | 0.6 | [stitch-diff.json](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/stitch-diff.json) |
| 4 | content | content-qa: 78.5 → 100 | +1.1 | 4 | 0.3 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/SCORE.md |
| 5 | ux | lần đầu → câu đầu: 77.8 → 100 | +0.7 | 2 | 0.3 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 6 s · 9 chạm (probe 2026-11-26) |
| 6 | content | learnability: 91.8 → 100 | +0.4 | 4 | 0.1 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/LEARN.md |
| 7 | perf | medium cls: `layout-shift` | +0.1 | 2 | 0.1 | route ar #/skills d-dark (1) |
| 8 | a11y | low touch-target: `a` | +0.1 | 1 | 0.1 | [ảnh](https://raw.githubusercontent.com/lexkiteapp/lexkiteapp.github.io/quality-qa/en/en-m-dark__en_words_a_balanced_approach_html.png) · route en /en/words/a-balanced-approach.html m-dark, en /en/words/a-balanced-approach.html m-light (2) |

<details><summary>Chi tiết thành phần</summary>

- **ui/frame-consistency** 100 – success 2026-11-26 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45799164648
- **ui/SSIM vs Stitch** 39.7 – SSIM trung bình 0.338 trên 26 màn×chế độ (đích 0.85; ngưỡng ratchet = điểm CI − 0,01) ([stitch-diff.json](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/stitch-diff.json))
- **ui/màn đã Stitch** 31 – 22 Stitch / 71 màn (ref 45, tay 0) ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 22 Stitch / 71 màn (ref 45, tay 0))
- **ux/qa-bot (live)** 100 – success 2026-11-26 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45801851842
- **ux/journey-e2e** 100 – success 2026-11-26 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45799164355
- **ux/lần đầu → câu đầu** 77.8 – 6 s · 9 chạm (probe 2026-11-26) ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 6 s · 9 chạm (probe 2026-11-26))
- **ux/chạm tới bài hôm nay** 100 – 1 chạm ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 1 chạm)
- **ux/Thoát/Back + luồng học** 100 – ✓exit-guard.mjs ✓learn-flow.mjs
- **perf/Lighthouse perf** 98.2 – / 100, /en/ 99, /app/?hl=en 91, /en/vocabulary/ 100, /en/blog/ 99, /en/blog/about/ 100 (quality-sweep › lighthouse (6 trang, điện thoại))
- **perf/LCP máy yếu** 2.1 – LCP tối đa 5928 ms (tốt ≤ 2500, 0 điểm ≥ 6000) (mobile-qa (máy yếu, 4G chậm) 2026-11-26 – success 2026-11-26 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45799164731)
- **perf/INP** 100 – INP tối đa 128 ms (tốt ≤ 200) (mobile-qa (máy yếu, 4G chậm) 2026-11-26 – success 2026-11-26 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45799164731)
- **perf/CLS** 100 – CLS tối đa 0.0025 (tốt ≤ 0,1) (mobile-qa (máy yếu, 4G chậm) 2026-11-26 – success 2026-11-26 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45799164731)
- **perf/TBT (tác vụ dài)** 100 – TBT tối đa 29 ms (tốt ≤ 200) (mobile-qa (máy yếu, 4G chậm) 2026-11-26 – success 2026-11-26 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/45799164731)
- **perf/CLS/long task quét đêm** 92.3 – quality-sweep: cls, layout-shift, longtask, ngân sách Lighthouse
- **a11y/Lighthouse a11y** 99.7 – / 100, /en/ 100, /app/?hl=en 98, /en/vocabulary/ 100, /en/blog/ 100, /en/blog/about/ 100 (quality-sweep › lighthouse)
- **a11y/axe AA (mọi route × vi/en/ar × sáng/tối)** 100 – quality-sweep: axe serious/critical (gồm tương phản)
- **a11y/vùng chạm ≥ 44 px** 98 – quality-sweep: touch-target (điện thoại)
- **latent/console/promise/4xx/tràn chữ** 100 – quality-sweep: pageerror, rejection, console, http4xx/5xx, hscroll, text-clip, overlap
- **latent/add-on E2E** 100 – quality-sweep: ext-e2e vi/en/ar + trang nặng
- **latent/bất biến FSRS/chuỗi ngày** 100 – 380968/380968 bất biến đạt ở 4 múi giờ ([logic-invariants.mjs](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/logic-invariants.mjs))
- **latent/đồng bộ + chuỗi** 100 – ✓sync-pack.mjs ✓sync-ctx.mjs ✓streak-ui.mjs
- **content/content-qa** 78.5 – content/pipeline/SCORE.md ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/SCORE.md)
- **content/learnability** 91.8 – content/pipeline/LEARN.md ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/LEARN.md)
- **i18n/i18n-qa --strict** 100 – 0 lỗi, 14 ngôn ngữ ngoài vi ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 0 lỗi, 14 ngôn ngữ ngoài vi)
- **notif/nhắc học + notify-ux** 100 – ✓reminders.mjs ✓notify-ux.mjs
- **notif/chuẩn thông báo (tĩnh)** 100 – ✓giờ yên lặng ✓nhắc thông minh theo giờ học ✓spec thông báo ([REMINDERS.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/docs/REMINDERS.md))

</details>
