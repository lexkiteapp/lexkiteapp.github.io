# Top-1 score (tự sinh – `node scripts/top1/score.mjs --write`, đừng sửa tay)

<!-- top1-score -->
## 🏆 Top-1 score: **83.1 / 100** · trên 2 trục có mốc: Lexkite 91.2 vs Duolingo 58.5

Gộp từ nguồn đã có, không quét lại – cách đo: [docs/TOP1-SCORE.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/docs/TOP1-SCORE.md) · sàn chỉ tăng: `content/pipeline/top1.budget.json` · lượt: https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/43119195182 · quality-sweep: https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/43090974329

| Trục | Trọng số | Lexkite | Duolingo | Sàn | Thành phần |
|---|---|---|---|---|---|
| UI (một khung, bám Stitch) | 15 | **54.8** | – | 52.9 | frame-consistency 100 · SSIM vs Stitch 39.7 · màn đã Stitch 24.6 |
| UX flows (hành trình, Thoát/Back, số chạm) | 15 | **65.6** | – | 80.6 | qa-bot (live) 0 · journey-e2e 100 · lần đầu → câu đầu 77.8 · chạm tới bài hôm nay 50 · Thoát/Back + luồng học 100 |
| Hiệu năng (Lighthouse, Web Vitals, máy yếu) | 15 | **82.5** | 35 | 80.3 | Lighthouse perf 96.8 · LCP máy yếu 0 · INP 100 · CLS 100 · TBT (tác vụ dài) 100 · CLS/long task quét đêm 98 |
| Trợ năng (axe AA, vùng chạm, tương phản) | 15 | **99.9** | 82 | 98 | Lighthouse a11y 99.7 · axe AA (mọi route × vi/en/ar × sáng/tối) 100 · vùng chạm ≥ 44 px 100 |
| Lỗi tiềm ẩn & logic | 15 | **98.6** | – | 97 | console/promise/4xx/tràn chữ 94.2 · add-on E2E 100 · bất biến FSRS/chuỗi ngày 100 · đồng bộ + chuỗi 100 |
| Nội dung (content-qa, dễ học) | 10 | **78.8** | – | 78.8 | content-qa 66 · learnability 91.6 |
| i18n (15 ngôn ngữ) | 10 | **100** | – | 100 | i18n-qa --strict 100 |
| Thông báo (chuẩn notif-ux) | 5 | **100** | – | 100 | nhắc học + notify-ux 100 · chuẩn thông báo (tĩnh) 100 |
| **Tổng** | 100 | **83.1** | 58.5 (2 trục) | 82.5 | trục thiếu số đo không tính (trọng số còn 100) |

### ⛔ Dưới sàn

- ux: 65.6 < sàn 80.6

### Top 10 nâng cấp (lợi ích ÷ công sức)

| # | Trục | Việc | +điểm tổng | Công sức | Ưu tiên | Bằng chứng |
|---|---|---|---|---|---|---|
| 1 | ux | qa-bot (live): 0 → 100 | +3 | 2 | 1.5 | failure 2026-11-11 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/43093326412 |
| 2 | ui | màn đã Stitch: 24.6 → 100 | +3.8 | 5 | 0.8 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 17 Stitch / 69 màn (ref 49, tay 0) |
| 3 | perf | LCP máy yếu: 0 → 100 | +2.5 | 3 | 0.8 | mobile-qa (máy yếu, 4G chậm) 2026-11-11 – success 2026-11-11 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/43090937644 |
| 4 | ux | chạm tới bài hôm nay: 50 → 100 | +1.5 | 2 | 0.8 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 2 chạm |
| 5 | ui | SSIM vs Stitch: 39.7 → 100 | +3 | 5 | 0.6 | [stitch-diff.json](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/stitch-diff.json) |
| 6 | content | content-qa: 66 → 100 | +1.7 | 4 | 0.4 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/SCORE.md |
| 7 | ux | lần đầu → câu đầu: 77.8 → 100 | +0.7 | 2 | 0.3 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 6 s · 9 chạm (probe 2026-11-11) |
| 8 | latent | medium overlap: `summary` | +0.2 | 1 | 0.2 | [ảnh](https://raw.githubusercontent.com/lexkiteapp/lexkiteapp.github.io/quality-qa/ar/ar-d-dark__home.png) · route ar #/home d-dark, ar #/home d-light, ar #/path d-dark (378) |
| 9 | content | learnability: 91.6 → 100 | +0.4 | 4 | 0.1 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/LEARN.md |
| 10 | perf | Lighthouse perf: 96.8 → 100 | +0.1 | 3 | 0 | quality-sweep › lighthouse (6 trang, điện thoại) |

<details><summary>Chi tiết thành phần</summary>

- **ui/frame-consistency** 100 – success 2026-11-11 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/43090937797
- **ui/SSIM vs Stitch** 39.7 – SSIM trung bình 0.338 trên 26 màn×chế độ (đích 0.85; ngưỡng ratchet = điểm CI − 0,01) ([stitch-diff.json](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/stitch-diff.json))
- **ui/màn đã Stitch** 24.6 – 17 Stitch / 69 màn (ref 49, tay 0) ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 17 Stitch / 69 màn (ref 49, tay 0))
- **ux/qa-bot (live)** 0 – failure 2026-11-11 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/43093326412
- **ux/journey-e2e** 100 – success 2026-11-11 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/43090374542
- **ux/lần đầu → câu đầu** 77.8 – 6 s · 9 chạm (probe 2026-11-11) ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 6 s · 9 chạm (probe 2026-11-11))
- **ux/chạm tới bài hôm nay** 50 – 2 chạm ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 2 chạm)
- **ux/Thoát/Back + luồng học** 100 – ✓exit-guard.mjs ✓learn-flow.mjs
- **perf/Lighthouse perf** 96.8 – / 100, /en/ 88, /app/?hl=en 94, /en/vocabulary/ 100, /en/blog/ 99, /en/blog/about/ 100 (quality-sweep › lighthouse (6 trang, điện thoại))
- **perf/LCP máy yếu** 0 – LCP tối đa 6666 ms (tốt ≤ 2500, 0 điểm ≥ 6000) (mobile-qa (máy yếu, 4G chậm) 2026-11-11 – success 2026-11-11 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/43090937644)
- **perf/INP** 100 – INP tối đa 136 ms (tốt ≤ 200) (mobile-qa (máy yếu, 4G chậm) 2026-11-11 – success 2026-11-11 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/43090937644)
- **perf/CLS** 100 – CLS tối đa 0.0757 (tốt ≤ 0,1) (mobile-qa (máy yếu, 4G chậm) 2026-11-11 – success 2026-11-11 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/43090937644)
- **perf/TBT (tác vụ dài)** 100 – TBT tối đa 68 ms (tốt ≤ 200) (mobile-qa (máy yếu, 4G chậm) 2026-11-11 – success 2026-11-11 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/43090937644)
- **perf/CLS/long task quét đêm** 98 – quality-sweep: cls, layout-shift, longtask, ngân sách Lighthouse
- **a11y/Lighthouse a11y** 99.7 – / 100, /en/ 100, /app/?hl=en 98, /en/vocabulary/ 100, /en/blog/ 100, /en/blog/about/ 100 (quality-sweep › lighthouse)
- **a11y/axe AA (mọi route × vi/en/ar × sáng/tối)** 100 – quality-sweep: axe serious/critical (gồm tương phản)
- **a11y/vùng chạm ≥ 44 px** 100 – quality-sweep: touch-target (điện thoại)
- **latent/console/promise/4xx/tràn chữ** 94.2 – quality-sweep: pageerror, rejection, console, http4xx/5xx, hscroll, text-clip, overlap
- **latent/add-on E2E** 100 – quality-sweep: ext-e2e vi/en/ar + trang nặng
- **latent/bất biến FSRS/chuỗi ngày** 100 – 380968/380968 bất biến đạt ở 4 múi giờ ([logic-invariants.mjs](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/logic-invariants.mjs))
- **latent/đồng bộ + chuỗi** 100 – ✓sync-pack.mjs ✓sync-ctx.mjs ✓streak-ui.mjs
- **content/content-qa** 66 – content/pipeline/SCORE.md ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/SCORE.md)
- **content/learnability** 91.6 – content/pipeline/LEARN.md ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/LEARN.md)
- **i18n/i18n-qa --strict** 100 – 0 lỗi, 14 ngôn ngữ ngoài vi ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 0 lỗi, 14 ngôn ngữ ngoài vi)
- **notif/nhắc học + notify-ux** 100 – ✓reminders.mjs ✓notify-ux.mjs
- **notif/chuẩn thông báo (tĩnh)** 100 – ✓giờ yên lặng ✓nhắc thông minh theo giờ học ✓spec thông báo ([REMINDERS.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/docs/REMINDERS.md))

</details>
