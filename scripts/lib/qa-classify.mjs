// Phân loại dùng chung cho các cổng trình duyệt (web-sweep, font-audit) – thuần, không DOM, test: scripts/test/qa-classify.mjs.

/** Máy chủ ngoài "không phục vụ được" (hết hạn mức 429 – vd. Cloudflare 1027 khi Workers chạm 100k lượt/ngày – hoặc 5xx):
 *  thân lỗi do nền tảng sinh ra KHÔNG có Access-Control-Allow-Origin, nên Chrome báo "blocked by CORS policy" dù cấu hình CORS
 *  của trang/Worker đúng. Đó là sự cố sẵn sàng của máy chủ, cùng loại net::ERR (đã không tính ở err) – không phải lỗi của trang.
 *  404/403/200-thiếu-CORS thì VẪN là lỗi thật (thiếu file, sai đường dẫn, cấu hình header). */
export const extUnavailable = status => status === 429 || (status >= 500 && status <= 599);

/** URL trong thông báo CORS của Chrome: "Access to <loại> at '<url>' from origin '<gốc>' has been blocked by CORS policy…". */
export function corsBlockedUrl(msg) {
  const m = /^Access to (?:[\w ]+) at '([^']+)' from origin '[^']*' (?:has been )?blocked/.exec(String(msg || ''));
  return m ? m[1] : null;
}

/** Tách lỗi console: lỗi CORS của URL ngoài mà máy chủ đã trả 429/5xx → `ext` (báo riêng, không tính lỗi trang); còn lại → `errs`.
 *  down: Map url → status (chỉ các phản hồi khác gốc trang có extUnavailable). */
export function splitConsoleErrors(msgs, down) {
  const errs = [], ext = [];
  for (const m of msgs) { const u = corsBlockedUrl(m); (u && down.has(u) ? ext : errs).push(m); }
  return { errs, ext };
}

/** Phần tử ẩn bằng mẫu "chỉ cho trình đọc màn hình" (.sr-only / visually-hidden): hộp ≤ 1×1 px và bị cắt hết bằng
 *  clip: rect(0 0 0 0) hoặc clip-path: inset(50%). Người xem không thấy chữ này → không phải "chữ bị cắt mất" hay "chữ nhỏ".
 *  Chỉ hộp 1 px mà KHÔNG có clip/clip-path thì vẫn coi là hiển thị (vd. sr-only bị CSS khác đè mất clip → lộ ra 1 px). */
export function srOnlyHidden(cs, rect) {
  if (!cs || !rect || rect.width > 1.5 || rect.height > 1.5) return false;
  const clip = String(cs.clip || '').replace(/\s+/g, ''), cp = String(cs.clipPath || '').replace(/\s+/g, '');
  const clipZero = /^rect\(0(px)?,?0(px)?,?0(px)?,?0(px)?\)$/.test(clip);
  const cpHalf = /^inset\((50%|100%)\)$/.test(cp);
  return clipZero || cpHalf;
}
