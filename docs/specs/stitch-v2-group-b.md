# Stitch v2 nhóm B – port lại từ #247 (spec 1 trang)

> TL;DR: port lại 5 màn Stitch v2 nhóm B từ #247, mỗi màn một nhánh + một PR cắt từ main, theo docs/STITCH-V2-PORT.md; Thư viện → Bộ từ → Chủ đề → Sổ lỗi sai → Tiến độ.
> Đọc khi: làm hoặc duyệt một màn nhóm B, hoặc quyết định đóng #247.

**Mục tiêu**: đưa 5 màn còn thiếu sang khung Stitch v2 sau cờ ux1: Thư viện (`library`), Bộ từ (`deck`), Chủ đề (`topic`), Sổ lỗi sai (`mistakes`), Tiến độ & huy hiệu (`stats`). Màn Từ điển (`dict`) và Hub Từ vựng (`vocab-hub`) đã có trên main nên bỏ khỏi phạm vi. PR cũ #247 (162 file, 1/11) dirty, không gộp nguyên.

**Cách làm** (docs/STITCH-V2-PORT.md): mỗi màn 1 nhánh + 1 PR cắt từ main mới nhất. Lấy mẫu HTML sáng/tối và `bind/<màn>.json` từ nhánh `stitch-v2-b` làm điểm xuất phát, đối chiếu khung "inner" hiện tại (frame-variants.json, shell chung), rồi sinh bằng `stitch-v2-convert`; không sửa tay `web/js/st/v2/<màn>.js`.

**Thứ tự**: library → deck → topic → mistakes → stats (dữ liệu: `web/js/stats-page.js`, `plan.js` mistakes, `app.js` library/deck/topic).

**Mỗi PR**: móc test cũ giữ nguyên (ux1, test riêng của màn), i18n đủ 15 ngôn ngữ + RTL, WCAG AA không hạ ngưỡng, chạm ≥ 44 px, CSS ≤ 10 KB gz/màn, thêm màn vào `SCREENS`/`V2REF` của stitch-diff; tắt cờ ux1 → bản cũ đủ mục như nhau.

**Không cắt**: mục thật mà mẫu không vẽ (Mic sổ từ, nhập/xuất, huy hiệu…) đặt vào chỗ sẵn có trong mẫu, ghi trong PR.

**Xong khi**: 5 PR xanh, stitch-diff sáng/tối đạt, ảnh đã qua điều phối duyệt (design-approval), rồi đóng #247 kèm link 5 PR.
