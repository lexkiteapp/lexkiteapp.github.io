# CI làn nhanh + nặng một lần – spec-lite (16/11)
> TL;DR: PR chỉ chạy làn nhanh (≤10 phút); việc nặng chạy MỘT lần trong merge queue. Không bỏ check nào, chỉ dời chỗ.
> Đọc khi: sửa `merge-queue.yml`, `required-gate`, `heavy-gate`, hoặc thêm workflow nặng.

## Số thật (16/11)
- 219 workflow, 70 chạy trên `pull_request`, 51 có `heavy-gate`; mọi workflow PR đã có `concurrency` + `cancel-in-progress` (ci-policy luật 12), 15 workflow không có là lịch/thủ công.
- PR giao diện ≈ 70 job/lượt push; chạy được cùng lúc ~20–29; 59 PR mở → hàng chờ 100–200.
- Đã làm: job-level scope (#1395: PR nội dung/chữ dịch/backend bỏ job UI), gate lượt 2 (#1396: bỏ ~⅓ job gate), gate-drift (#1448: hết vòng "gộp lại main").

## Thiết kế (không cần bấm; điều phối chốt 16/11)
1. **Làn nhanh trên PR**: `npm-test` (lint, unit, size-budget, i18n-qa, ci-policy). Lượt 1 của mọi PR: job `gate` của 51 workflow nặng bị bỏ qua (không tốn máy) – luật 17 (#1396).
2. **Nặng MỘT lần trên đúng head**: khi `npm-test` xanh, job `heavy` (`scripts/ci/heavy-rerun.mjs`) chạy lại lượt 2 của các workflow nặng; push mới → run cũ bị huỷ (luật 12), lượt 1 bỏ qua, nặng chỉ chạy lại sau khi làn nhanh xanh. Nhãn `ready` = chạy nặng ngay (ngoại lệ có chủ ý). Không cần nhãn tự gắn: lượt 2 chính là "nhãn" (tránh 1 vòng API thừa; token workflow gắn nhãn không kích workflow).
3. **required-gate đòi nặng xanh trên đúng head**: đã đúng – gate đánh giá check-run của head (không xanh khi còn pending / chưa có check thật).
4. **Việc nặng theo vùng**: native/audio/golden/report… tự giới hạn bằng `paths:` của workflow (không gate) – chỉ chạy khi PR chạm vùng đó. PR nội dung/chữ dịch bỏ job UI (luật 16, #1395).
5. **Khi merge queue bật – đổi MỘT chỗ**: thêm `merge_group` vào điều kiện `gate` (cùng một biểu thức `if` ở 51 file, ci-policy canh) và cho `heavy` bỏ qua PR; `merge-queue.yml` ghi required-gate cho sha hàng đợi sau khi các workflow nặng xanh.
6. Đo: run/PR và job/PR trước–sau, ghi `docs/CI-RUNNERS.md` (sau khi #1395/#1396/#1448 lên main).

## Điều kiện chặn
- Merge queue CHƯA bật ở ruleset 26316463 (chỉ có required-gate; chủ phải bấm theo `docs/specs/merge-queue.md`). Không bật thì bước 2 không có chỗ chạy → heavy sẽ không được kiểm trước khi vào main.
