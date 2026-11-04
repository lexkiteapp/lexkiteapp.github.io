# Top-1 score (tự sinh – `node scripts/top1/score.mjs --write`, đừng sửa tay)

<!-- top1-score -->
## 🏆 Top-1 score: **81.8 / 100** · trên 2 trục có mốc: Lexkite 91.7 vs Duolingo 57.5

Gộp từ nguồn đã có, không quét lại – cách đo: [docs/TOP1-SCORE.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/docs/TOP1-SCORE.md) · sàn chỉ tăng: `content/pipeline/top1.budget.json` · lượt: https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/41849346334 · quality-sweep: https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/41762285753

| Trục | Trọng số | Lexkite | Duolingo | Sàn | Thành phần |
|---|---|---|---|---|---|
| UI (một khung, bám Stitch) | 15 | **53.9** | – | 51.9 | frame-consistency 100 · SSIM vs Stitch 39.7 · màn đã Stitch 22.1 |
| UX flows (hành trình, Thoát/Back, số chạm) | 15 | **85** | – | 80 | qa-bot (live) 100 · journey-e2e 100 · lần đầu → câu đầu 75 · chạm tới bài hôm nay 50 · Thoát/Back + luồng học 100 |
| Hiệu năng (Lighthouse, Web Vitals, máy yếu) | 15 | **83.3** | 33 | 80.3 | Lighthouse perf 99.8 · LCP máy yếu 0 · INP 100 · CLS 100 · TBT (tác vụ dài) 100 · CLS/long task quét đêm 100 |
| Trợ năng (axe AA, vùng chạm, tương phản) | 15 | **100** | 82 | 98 | Lighthouse a11y 100 · axe AA (mọi route × vi/en/ar × sáng/tối) 100 · vùng chạm ≥ 44 px 100 |
| Lỗi tiềm ẩn & logic | 15 | **90.5** | – | 97 | console/promise/4xx/tràn chữ 100 · add-on E2E 61.9 · bất biến FSRS/chuỗi ngày 100 · đồng bộ + chuỗi 100 |
| Nội dung (content-qa, dễ học) | 10 | **49.4** | – | 49.4 | content-qa 49.4 · learnability – |
| i18n (15 ngôn ngữ) | 10 | **100** | – | 100 | i18n-qa --strict 100 |
| Thông báo (chuẩn notif-ux) | 5 | **100** | – | 100 | nhắc học + notify-ux 100 · chuẩn thông báo (tĩnh) 100 |
| **Tổng** | 100 | **81.8** | 57.5 (2 trục) | 79.8 | trục thiếu số đo không tính (trọng số còn 100) |

### ⛔ Dưới sàn

- latent: 90.5 < sàn 97

### Top 10 nâng cấp (lợi ích ÷ công sức)

| # | Trục | Việc | +điểm tổng | Công sức | Ưu tiên | Bằng chứng |
|---|---|---|---|---|---|---|
| 1 | content | content-qa: 49.4 → 100 | +5.1 | 4 | 1.3 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/SCORE.md |
| 2 | ui | màn đã Stitch: 22.1 → 100 | +3.9 | 5 | 0.8 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 15 Stitch / 68 màn (ref 51, tay 0) |
| 3 | perf | LCP máy yếu: 0 → 100 | +2.5 | 3 | 0.8 | mobile-qa (máy yếu, 4G chậm) 2026-11-04 – success 2026-11-04 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/41845606763 |
| 4 | ux | chạm tới bài hôm nay: 50 → 100 | +1.5 | 2 | 0.8 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 2 chạm |
| 5 | ui | SSIM vs Stitch: 39.7 → 100 | +3 | 5 | 0.6 | [stitch-diff.json](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/stitch-diff.json) |
| 6 | ux | lần đầu → câu đầu: 75 → 100 | +0.8 | 2 | 0.4 | [WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 6.1 s · 10 chạm (probe 2026-11-04) |
| 7 | latent | add-on: danh từ "forest": có ảnh minh họa (đã tải xong) | +0.3 | 2 | 0.1 | ar/en/vi — letter (chưa tải/ lỗi) |
| 8 | latent | add-on: "action": có ảnh minh họa (đã tải xong) | +0.3 | 2 | 0.1 | ar/en/vi — none |
| 9 | latent | add-on: trang CSP chặn ảnh: vẫn có ảnh (canvas) | +0.3 | 2 | 0.1 | ar/en/vi — none |
| 10 | latent | add-on: không có lỗi console/trang từ add-on | +0.3 | 2 | 0.1 | ar/en/vi — console chrome-extension://kblfilcmclonmeecilfiflfpingdofc: Failed to load resource: net:: |

<details><summary>Chi tiết thành phần</summary>

- **ui/frame-consistency** 100 – success 2026-11-04 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/41845606802
- **ui/SSIM vs Stitch** 39.7 – SSIM trung bình 0.338 trên 26 màn×chế độ (đích 0.85; ngưỡng ratchet = điểm CI − 0,01) ([stitch-diff.json](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/stitch-diff.json))
- **ui/màn đã Stitch** 22.1 – 15 Stitch / 68 màn (ref 51, tay 0) ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 15 Stitch / 68 màn (ref 51, tay 0))
- **ux/qa-bot (live)** 100 – success 2026-11-04 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/41839762079
- **ux/journey-e2e** 100 – success 2026-11-04 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/41813660683
- **ux/lần đầu → câu đầu** 75 – 6.1 s · 10 chạm (probe 2026-11-04) ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 6.1 s · 10 chạm (probe 2026-11-04))
- **ux/chạm tới bài hôm nay** 50 – 2 chạm ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 2 chạm)
- **ux/Thoát/Back + luồng học** 100 – ✓exit-guard.mjs ✓learn-flow.mjs
- **perf/Lighthouse perf** 99.8 – / 100, /en/ 100, /app/?hl=en 99, /en/vocabulary/ 100, /en/blog/ 100, /en/blog/about/ 100 (quality-sweep › lighthouse (6 trang, điện thoại))
- **perf/LCP máy yếu** 0 – LCP tối đa 9424 ms (tốt ≤ 2500, 0 điểm ≥ 6000) (mobile-qa (máy yếu, 4G chậm) 2026-11-04 – success 2026-11-04 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/41845606763)
- **perf/INP** 100 – INP tối đa 184 ms (tốt ≤ 200) (mobile-qa (máy yếu, 4G chậm) 2026-11-04 – success 2026-11-04 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/41845606763)
- **perf/CLS** 100 – CLS tối đa 0.0878 (tốt ≤ 0,1) (mobile-qa (máy yếu, 4G chậm) 2026-11-04 – success 2026-11-04 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/41845606763)
- **perf/TBT (tác vụ dài)** 100 – TBT tối đa 165 ms (tốt ≤ 200) (mobile-qa (máy yếu, 4G chậm) 2026-11-04 – success 2026-11-04 https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/41845606763)
- **perf/CLS/long task quét đêm** 100 – quality-sweep: cls, layout-shift, longtask, ngân sách Lighthouse
- **a11y/Lighthouse a11y** 100 – / 100, /en/ 100, /app/?hl=en 100, /en/vocabulary/ 100, /en/blog/ 100, /en/blog/about/ 100 (quality-sweep › lighthouse)
- **a11y/axe AA (mọi route × vi/en/ar × sáng/tối)** 100 – quality-sweep: axe serious/critical (gồm tương phản)
- **a11y/vùng chạm ≥ 44 px** 100 – quality-sweep: touch-target (điện thoại)
- **latent/console/promise/4xx/tràn chữ** 100 – quality-sweep: pageerror, rejection, console, http4xx/5xx, hscroll, text-clip, overlap
- **latent/add-on E2E** 61.9 – quality-sweep: ext-e2e vi/en/ar + trang nặng
- **latent/bất biến FSRS/chuỗi ngày** 100 – 380968/380968 bất biến đạt ở 4 múi giờ ([logic-invariants.mjs](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/scripts/test/logic-invariants.mjs))
- **latent/đồng bộ + chuỗi** 100 – ✓sync-pack.mjs ✓sync-ctx.mjs ✓streak-ui.mjs
- **content/content-qa** 49.4 – content/pipeline/SCORE.md ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · content/pipeline/SCORE.md)
- **content/learnability** – – chưa có LEARN.md (PR #427 chưa gộp) ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · chưa có LEARN.md (PR #427 chưa gộp))
- **i18n/i18n-qa --strict** 100 – 0 lỗi, 14 ngôn ngữ ngoài vi ([WORLD.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/content/pipeline/WORLD.md) · 0 lỗi, 14 ngôn ngữ ngoài vi)
- **notif/nhắc học + notify-ux** 100 – ✓reminders.mjs ✓notify-ux.mjs
- **notif/chuẩn thông báo (tĩnh)** 100 – ✓giờ yên lặng ✓nhắc thông minh theo giờ học ✓spec thông báo ([REMINDERS.md](https://github.com/lexkiteapp/lexkiteapp.github.io/blob/main/docs/REMINDERS.md))

</details>
