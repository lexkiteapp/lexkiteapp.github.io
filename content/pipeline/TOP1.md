# Top-1 score (tự sinh – `node scripts/top1/score.mjs --write`, đừng sửa tay)

<!-- top1-score -->
## 🏆 Top-1 score: **85.9 / 100** · trên 2 trục có mốc: Lexkite 90.9 vs Duolingo 58.5

Gộp từ nguồn đã có, không quét lại – cách đo: [docs/TOP1-SCORE.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/docs/TOP1-SCORE.md) · sàn chỉ tăng: `content/pipeline/top1.budget.json` · lượt: https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/43126347500 · quality-sweep: https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/43119191113

| Trục | Trọng số | Lexkite | Duolingo | Sàn | Thành phần |
|---|---|---|---|---|---|
| UI (một khung, bám Stitch) | 15 | **54.8** | – | 52.9 | frame-consistency 100 · SSIM vs Stitch 39.7 · màn đã Stitch 24.6 |
| UX flows (hành trình, Thoát/Back, số chạm) | 15 | **85.6** | – | 80.6 | qa-bot (live) 100 · journey-e2e 100 · lần đầu → câu đầu 77.8 · chạm tới bài hôm nay 50 · Thoát/Back + luồng học 100 |
| Hiệu năng (Lighthouse, Web Vitals, máy yếu) | 15 | **81.9** | 35 | 80.3 | Lighthouse perf 99.3 · LCP máy yếu 0 · INP 100 · CLS 100 · TBT (tác vụ dài) 100 · CLS/long task quét đêm 92.3 |
| Trợ năng (axe AA, vùng chạm, tương phản) | 15 | **99.9** | 82 | 98 | Lighthouse a11y 99.7 · axe AA (mọi route × vi/en/ar × sáng/tối) 100 · vùng chạm ≥ 44 px 100 |
| Lỗi tiềm ẩn & logic | 15 | **98.1** | – | 97 | console/promise/4xx/tràn chữ 100 · add-on E2E 92.3 · bất biến FSRS/chuỗi ngày 100 · đồng bộ + chuỗi 100 |
| Nội dung (content-qa, dễ học) | 10 | **78.8** | – | 78.8 | content-qa 66 · learnability 91.6 |
| i18n (15 ngôn ngữ) | 10 | **100** | – | 100 | i18n-qa --strict 100 |
| Thông báo (chuẩn notif-ux) | 5 | **100** | – | 100 | nhắc học + notify-ux 100 · chuẩn thông báo (tĩnh) 100 |
| **Tổng** | 100 | **85.9** | 58.5 (2 trục) | 83.9 | trục thiếu số đo không tính (trọng số còn 100) |

### Top 10 nâng cấp (lợi ích ÷ công sức)

| # | Trục | Việc | +điểm tổng | Công sức | Ưu tiên | Bằng chứng |
|---|---|---|---|---|---|---|
| 1 | ui | màn đã Stitch: 24.6 → 100 | +3.8 | 5 | 0.8 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 17 Stitch / 69 màn (ref 49, tay 0) |
| 2 | perf | LCP máy yếu: 0 → 100 | +2.5 | 3 | 0.8 | mobile-qa (máy yếu, 4G chậm) 2026-11-11 – success 2026-11-11 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/43119192441 |
| 3 | ux | chạm tới bài hôm nay: 50 → 100 | +1.5 | 2 | 0.8 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 2 chạm |
| 4 | ui | SSIM vs Stitch: 39.7 → 100 | +3 | 5 | 0.6 | [stitch-diff.json](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/stitch-diff.json) |
| 5 | content | content-qa: 66 → 100 | +1.7 | 4 | 0.4 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/SCORE.md |
| 6 | ux | lần đầu → câu đầu: 77.8 → 100 | +0.7 | 2 | 0.3 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 5.7 s · 9 chạm (probe 2026-11-12) |
| 7 | content | learnability: 91.6 → 100 | +0.4 | 4 | 0.1 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/LEARN.md |
| 8 | perf | medium cls: `layout-shift` | +0.1 | 2 | 0.1 | [ảnh](https://raw.githubusercontent.com/lexkiteapp/lexkiteapp.github.io/quality-qa/ar/ar-d-light__speak.png) · route ar #/speak d-light (1) |
| 9 | latent | add-on: không có lỗi console/trang từ add-on | +0.1 | 2 | 0.1 | ar — console https://lexkite.com/app/?hl=ar#/welcome: Failed to load resource: the server respo |
| 10 | latent | add-on: tab mới: vẽ thẻ < 100 ms (không chờ mạng) | +0.1 | 2 | 0.1 | en — 132 ms |

<details><summary>Chi tiết thành phần</summary>

- **ui/frame-consistency** 100 – success 2026-11-11 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/43119192242
- **ui/SSIM vs Stitch** 39.7 – SSIM trung bình 0.338 trên 26 màn×chế độ (đích 0.85; ngưỡng ratchet = điểm CI − 0,01) ([stitch-diff.json](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/stitch-diff.json))
- **ui/màn đã Stitch** 24.6 – 17 Stitch / 69 màn (ref 49, tay 0) ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 17 Stitch / 69 màn (ref 49, tay 0))
- **ux/qa-bot (live)** 100 – success 2026-11-12 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/43121234885
- **ux/journey-e2e** 100 – success 2026-11-11 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/43090374542
- **ux/lần đầu → câu đầu** 77.8 – 5.7 s · 9 chạm (probe 2026-11-12) ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 5.7 s · 9 chạm (probe 2026-11-12))
- **ux/chạm tới bài hôm nay** 50 – 2 chạm ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 2 chạm)
- **ux/Thoát/Back + luồng học** 100 – ✓exit-guard.mjs ✓learn-flow.mjs
- **perf/Lighthouse perf** 99.3 – / 100, /en/ 99, /app/?hl=en 98, /en/vocabulary/ 100, /en/blog/ 99, /en/blog/about/ 100 (quality-sweep › lighthouse (6 trang, điện thoại))
- **perf/LCP máy yếu** 0 – LCP tối đa 6288 ms (tốt ≤ 2500, 0 điểm ≥ 6000) (mobile-qa (máy yếu, 4G chậm) 2026-11-11 – success 2026-11-11 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/43119192441)
- **perf/INP** 100 – INP tối đa 160 ms (tốt ≤ 200) (mobile-qa (máy yếu, 4G chậm) 2026-11-11 – success 2026-11-11 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/43119192441)
- **perf/CLS** 100 – CLS tối đa 0.0757 (tốt ≤ 0,1) (mobile-qa (máy yếu, 4G chậm) 2026-11-11 – success 2026-11-11 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/43119192441)
- **perf/TBT (tác vụ dài)** 100 – TBT tối đa 119 ms (tốt ≤ 200) (mobile-qa (máy yếu, 4G chậm) 2026-11-11 – success 2026-11-11 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/43119192441)
- **perf/CLS/long task quét đêm** 92.3 – quality-sweep: cls, layout-shift, longtask, ngân sách Lighthouse
- **a11y/Lighthouse a11y** 99.7 – / 100, /en/ 100, /app/?hl=en 98, /en/vocabulary/ 100, /en/blog/ 100, /en/blog/about/ 100 (quality-sweep › lighthouse)
- **a11y/axe AA (mọi route × vi/en/ar × sáng/tối)** 100 – quality-sweep: axe serious/critical (gồm tương phản)
- **a11y/vùng chạm ≥ 44 px** 100 – quality-sweep: touch-target (điện thoại)
- **latent/console/promise/4xx/tràn chữ** 100 – quality-sweep: pageerror, rejection, console, http4xx/5xx, hscroll, text-clip, overlap
- **latent/add-on E2E** 92.3 – quality-sweep: ext-e2e vi/en/ar + trang nặng
- **latent/bất biến FSRS/chuỗi ngày** 100 – 380968/380968 bất biến đạt ở 4 múi giờ ([logic-invariants.mjs](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/logic-invariants.mjs))
- **latent/đồng bộ + chuỗi** 100 – ✓sync-pack.mjs ✓sync-ctx.mjs ✓streak-ui.mjs
- **content/content-qa** 66 – content/pipeline/SCORE.md ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/SCORE.md)
- **content/learnability** 91.6 – content/pipeline/LEARN.md ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/LEARN.md)
- **i18n/i18n-qa --strict** 100 – 0 lỗi, 14 ngôn ngữ ngoài vi ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 0 lỗi, 14 ngôn ngữ ngoài vi)
- **notif/nhắc học + notify-ux** 100 – ✓reminders.mjs ✓notify-ux.mjs
- **notif/chuẩn thông báo (tĩnh)** 100 – ✓giờ yên lặng ✓nhắc thông minh theo giờ học ✓spec thông báo ([REMINDERS.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/docs/REMINDERS.md))

</details>
