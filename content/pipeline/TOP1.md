# Top-1 score (tự sinh – `node scripts/top1/score.mjs --write`, đừng sửa tay)

<!-- top1-score -->
## 🏆 Top-1 score: **71.3 / 100** · trên 1 trục có mốc: Lexkite 75 vs Duolingo 33

Gộp từ nguồn đã có, không quét lại – cách đo: [docs/TOP1-SCORE.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/docs/TOP1-SCORE.md) · sàn chỉ tăng: `content/pipeline/top1.budget.json` · lượt: https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/41583672572

| Trục | Trọng số | Lexkite | Duolingo | Sàn | Thành phần |
|---|---|---|---|---|---|
| UI (một khung, bám Stitch) | 15 | **32.1** | – | 30.1 | frame-consistency – · SSIM vs Stitch 42 · màn đã Stitch 22.1 |
| UX flows (hành trình, Thoát/Back, số chạm) | 15 | **65** | – | 60 | qa-bot (live) 0 · journey-e2e 100 · lần đầu → câu đầu 75 · chạm tới bài hôm nay 50 · Thoát/Back + luồng học 100 |
| Hiệu năng (Lighthouse, Web Vitals, máy yếu) | 15 | **75** | 33 | 72 | Lighthouse perf – · LCP máy yếu 0 · INP 100 · CLS 100 · TBT (tác vụ dài) 100 · CLS/long task quét đêm – |
| Trợ năng (axe AA, vùng chạm, tương phản) | 15 | **–** | 82 | – | Lighthouse a11y – · axe AA (mọi route × vi/en/ar × sáng/tối) – · vùng chạm ≥ 44 px – |
| Lỗi tiềm ẩn & logic | 15 | **100** | – | 97 | console/promise/4xx/tràn chữ – · add-on E2E – · bất biến FSRS/chuỗi ngày 100 · đồng bộ + chuỗi 100 |
| Nội dung (content-qa, dễ học) | 10 | **47.8** | – | 47.8 | content-qa 47.8 · learnability – |
| i18n (15 ngôn ngữ) | 10 | **100** | – | 100 | i18n-qa --strict 100 |
| Thông báo (chuẩn notif-ux) | 5 | **100** | – | 100 | nhắc học + notify-ux 100 · chuẩn thông báo (tĩnh) 100 |
| **Tổng** | 100 | **71.3** | 33 (1 trục) | 69.3 | trục thiếu số đo không tính (trọng số còn 85) |

### Top 10 nâng cấp (lợi ích ÷ công sức)

| # | Trục | Việc | +điểm tổng | Công sức | Ưu tiên | Bằng chứng |
|---|---|---|---|---|---|---|
| 1 | ux | qa-bot (live): 0 → 100 | +3.5 | 2 | 1.8 | failure 2026-11-03 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/41577160726 |
| 2 | content | content-qa: 47.8 → 100 | +6.1 | 4 | 1.5 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/SCORE.md |
| 3 | perf | LCP máy yếu: 0 → 100 | +4.4 | 3 | 1.5 | mobile-qa (máy yếu, 4G chậm) 2026-11-03 – success 2026-11-03 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/41575499165 |
| 4 | ui | màn đã Stitch: 22.1 → 100 | +6.9 | 5 | 1.4 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 15 Stitch / 68 màn (ref 51, tay 0) |
| 5 | ui | SSIM vs Stitch: 42 → 100 | +5.1 | 5 | 1 | [stitch-diff.json](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/stitch-diff.json) |
| 6 | ux | chạm tới bài hôm nay: 50 → 100 | +1.8 | 2 | 0.9 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 2 chạm |
| 7 | ux | lần đầu → câu đầu: 75 → 100 | +0.9 | 2 | 0.4 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 5.9 s · 10 chạm (probe 2026-11-03) |

<details><summary>Chi tiết thành phần</summary>

- **ui/frame-consistency** – – chưa có lượt trên main
- **ui/SSIM vs Stitch** 42 – SSIM trung bình 0.357 trên 26 màn×chế độ (đích 0.85; ngưỡng ratchet = điểm CI − 0,01) ([stitch-diff.json](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/stitch-diff.json))
- **ui/màn đã Stitch** 22.1 – 15 Stitch / 68 màn (ref 51, tay 0) ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 15 Stitch / 68 màn (ref 51, tay 0))
- **ux/qa-bot (live)** 0 – failure 2026-11-03 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/41577160726
- **ux/journey-e2e** 100 – success 2026-11-01 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/41311124108
- **ux/lần đầu → câu đầu** 75 – 5.9 s · 10 chạm (probe 2026-11-03) ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 5.9 s · 10 chạm (probe 2026-11-03))
- **ux/chạm tới bài hôm nay** 50 – 2 chạm ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 2 chạm)
- **ux/Thoát/Back + luồng học** 100 – ✓exit-guard.mjs ✓learn-flow.mjs
- **perf/Lighthouse perf** – – chưa có lh.json (quality-sweep › lighthouse (6 trang, điện thoại))
- **perf/LCP máy yếu** 0 – LCP tối đa 9341 ms (tốt ≤ 2500, 0 điểm ≥ 6000) (mobile-qa (máy yếu, 4G chậm) 2026-11-03 – success 2026-11-03 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/41575499165)
- **perf/INP** 100 – INP tối đa 96 ms (tốt ≤ 200) (mobile-qa (máy yếu, 4G chậm) 2026-11-03 – success 2026-11-03 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/41575499165)
- **perf/CLS** 100 – CLS tối đa 0.0878 (tốt ≤ 0,1) (mobile-qa (máy yếu, 4G chậm) 2026-11-03 – success 2026-11-03 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/41575499165)
- **perf/TBT (tác vụ dài)** 100 – TBT tối đa 50 ms (tốt ≤ 200) (mobile-qa (máy yếu, 4G chậm) 2026-11-03 – success 2026-11-03 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/41575499165)
- **perf/CLS/long task quét đêm** – – quality-sweep: cls, layout-shift, longtask, ngân sách Lighthouse
- **a11y/Lighthouse a11y** – – chưa có lh.json (quality-sweep › lighthouse)
- **a11y/axe AA (mọi route × vi/en/ar × sáng/tối)** – – quality-sweep: axe serious/critical (gồm tương phản)
- **a11y/vùng chạm ≥ 44 px** – – quality-sweep: touch-target (điện thoại)
- **latent/console/promise/4xx/tràn chữ** – – quality-sweep: pageerror, rejection, console, http4xx/5xx, hscroll, text-clip, overlap
- **latent/add-on E2E** – – quality-sweep: ext-e2e vi/en/ar + trang nặng
- **latent/bất biến FSRS/chuỗi ngày** 100 – 380968/380968 bất biến đạt ở 4 múi giờ ([logic-invariants.mjs](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/logic-invariants.mjs))
- **latent/đồng bộ + chuỗi** 100 – ✓sync-pack.mjs ✓sync-ctx.mjs ✓streak-ui.mjs
- **content/content-qa** 47.8 – content/pipeline/SCORE.md ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/SCORE.md)
- **content/learnability** – – chưa có LEARN.md (PR #427 chưa gộp) ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · chưa có LEARN.md (PR #427 chưa gộp))
- **i18n/i18n-qa --strict** 100 – 0 lỗi, 14 ngôn ngữ ngoài vi ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 0 lỗi, 14 ngôn ngữ ngoài vi)
- **notif/nhắc học + notify-ux** 100 – ✓reminders.mjs ✓notify-ux.mjs
- **notif/chuẩn thông báo (tĩnh)** 100 – ✓giờ yên lặng ✓nhắc thông minh theo giờ học ✓spec thông báo ([REMINDERS.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/docs/REMINDERS.md))

</details>
