# 🏭 Xưởng nội dung (lô đêm, mọi mảng dùng chung)

> TL;DR: Một lõi `scripts/factory/` + `content-factory.yml` lấp khoảng trống bảng điểm `content/pipeline/SCORE.md` mỗi đêm: tầng 0 luật → tầng 1 ai-pool → 2 giám khảo → soát mẫu 5 % → MỘT PR bot vào main (auto-merge). Mảng mới = thêm một `KIND`.
> Đọc khi: thêm loại nội dung sinh hàng loạt, sửa xưởng, xem vì sao lô đêm không ra.

Chuẩn đích, trọng số: `scripts/content-score.mjs` · kế hoạch: `CONTENT-WORLD-PLAN.md` §3.3 (thang 4 tầng) + §5 (tiến độ) · cổng: `CONTENT-QA.md` (lớp 1–7).

## 1. Luồng một đêm (`.github/workflows/content-factory.yml`, cron 19:20 UTC)
1. **plan** – `node scripts/factory/run.mjs --plan`: mỗi kind số lô = ⌈min(chuẩn − có, hạt giống còn) / n⌉, trần `--max` (mặc định 4); tổng shard ≤ 40 − job đang chạy − 16 (giữ ≥ 16 runner trống, `scripts/ci/shards.mjs busyJobs`).
2. **gen** (ma trận, `max-parallel` theo runner rảnh) – `run.mjs --area <a> --kind <k> --shard i --shards n`: hạt giống chia theo băm (shard không trùng), lô ≤ 25 hạt:
   tầng 1 `cfgen` (gem → groq → GrabCast; `cf2` = 0 neuron – kho CF để cho ảnh; lexai = 0) → tầng 0 `rules()` của kind → `judgePair` `cfjudge` (≥ 4, lệch ≤ 1, khác họ mô hình soạn) → lớp 6 `cfaudit` giám khảo thứ ba khác mô hình soát ≥ 5 % (sai > 2 % → loại cả lô). Thiếu giám khảo = bỏ qua trung tính (không xuất, không tính lần trượt). Hạt giống trượt 2 lần → chỉ hàng duyệt người.
   0 mục ra khi còn hạt giống → job đỏ.
3. **collect** – `merge.mjs`: `K.apply()` ghi nguồn, lô → `content/qa/batches/cf-*.json`, mục không đạt → `content/factory/review.jsonl`, trạng thái → `content/factory/state.json`, dựng lại tệp sinh, `content-score --bump` (sàn chỉ tăng; điểm giảm → đỏ) → `npm test` → `open-pr.sh`: nhánh `bot/content-factory-<ngày>-<run>` qua khoá deploy, PR bằng GITHUB_TOKEN + commit rỗng qua khoá deploy (để check chạy), `gh pr merge --auto`. **Không bao giờ đẩy vào nhánh PR khác.**
4. `pull_request` sửa `scripts/factory/**` = **lượt thử**: 1 lô/kind, chỉ artifact `factory-merged` (`factory.patch` + tóm tắt); phiên chính áp bản vá vào PR nếu muốn chứng minh điểm.

Chạy tay: Actions → Xưởng nội dung → `area`, `max`, `n`. Tắt: vô hiệu workflow (không mất dữ liệu; state giữ chỗ dừng).

## 2. Hợp đồng KIND (`scripts/factory/<mảng>.mjs` export `KINDS`)
`{ area, kind, std, have(), seeds() → [{k,…}], prompt?(seed), sys, rubric, view(item, seed), rules(item, seed) → [lỗi], finalize?(item, seed), apply(list, {root}), touches? }` – lõi `scripts/factory/lib.mjs`, test `scripts/test/content-factory.mjs` (pool giả, không mạng). Mỗi mục mang `lo` LKF (từ hạt giống) và `qa: { gen, j }`.

## 3. Kind đang chạy (đợt 1, 02/11)
| Mảng | kind | Nguồn ghi | Ghi chú |
|---|---|---|---|
| Giao tiếp | `functions` | `content/framework/functions.json` (hạt giống `content/factory/seeds/functions.json`, 100 chức năng A1–C2, `lo` I/S) | §4 |
| Ngữ pháp | `mcq` | `content/factory/grammar-quiz.json` → `web/js/grammar/bank-gen.js` (`build-grammar-bank.mjs --check` trong npm test) | 5 câu/hạt, tới 39 câu/bài |

Chưa bật (đợt kế, cần Kokoro trong luồng – cổng `audio-coverage` chỉ cho ≤ 25 câu thiếu/nhóm): gold (`bank/auto*.jsonl`, KHÔNG đặt tên `g####`), roleplay, cuộc gọi, tình huống Play & Speak, drill tự luận, bài C1/C2 (kèm `grammar-inventory.json` + `targets.json`). Định dạng + cổng từng loại: `side-session-notes/content-factory.md`.

## 4. Sổ mẫu câu theo chức năng – `content/framework/functions.json`
`{ functions: [{ id, name, level, lo[], situations[], phrases: {formal[3], neutral[3], informal[3]}, responses[], example[4 lượt A/B], avoid: {wrong, right, why}, note, qa }] }` – chuẩn 100 (bảng điểm). Chưa có màn hiển thị: chỉ dữ liệu + spec; màn đọc (4 bước nghe → ngôn ngữ chính → luyện → nhập vai, `CONTENT-WORLD-PLAN.md` P1) làm khi số PR mở ≤ 15.
