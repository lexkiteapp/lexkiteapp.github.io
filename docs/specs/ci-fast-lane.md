# CI làn nhanh + nặng một lần – spec-lite (16/11)
> TL;DR: PR chỉ chạy làn nhanh (≤10 phút); việc nặng chạy MỘT lần trong merge queue. Không bỏ check nào, chỉ dời chỗ.
> Đọc khi: sửa `merge-queue.yml`, `required-gate`, `heavy-gate`, hoặc thêm workflow nặng.

## Số thật (16/11)
- 219 workflow, 70 chạy trên `pull_request`, 51 có `heavy-gate`; mọi workflow PR đã có `concurrency` + `cancel-in-progress` (ci-policy luật 12), 15 workflow không có là lịch/thủ công.
- PR giao diện ≈ 70 job/lượt push; chạy được cùng lúc ~20–29; 59 PR mở → hàng chờ 100–200.
- Đã làm: job-level scope (#1395: PR nội dung/chữ dịch/backend bỏ job UI), gate lượt 2 (#1396: bỏ ~⅓ job gate), gate-drift (#1448: hết vòng "gộp lại main").

## Thiết kế
1. **Làn nhanh trên PR** (đã có, giữ): npm-test (lint, unit, size-budget, i18n-qa, ci-policy) theo đường dẫn.
2. **Làn nặng** (E2E matrix, Mobile/Visual QA, golden, teacher-motion, scroll-perf, native, Stitch diff): thêm trigger `merge_group` + giữ `pull_request` chỉ khi nhãn `ready-heavy` hoặc PR chạm đúng vùng; `required-gate` của sha hàng đợi = npm-test + các workflow nặng liên quan đường dẫn.
3. Mỗi push mới huỷ run cũ (đã bắt buộc bởi luật 12).
4. Đo: run/PR và job/PR trước–sau, ghi `docs/CI-RUNNERS.md`.

## Điều kiện chặn
- Merge queue CHƯA bật ở ruleset 26316463 (chỉ có required-gate; chủ phải bấm theo `docs/specs/merge-queue.md`). Không bật thì bước 2 không có chỗ chạy → heavy sẽ không được kiểm trước khi vào main.
