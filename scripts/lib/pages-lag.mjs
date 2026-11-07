// Pages của kho media dựng theo lô (GitHub gộp nhiều lần đẩy vào 1 bản dựng, có khi chờ hàng chục phút): file vừa đẩy 404 trên CDN
// KHÔNG phải lỗi khi bản dựng mới nhất còn đang chạy và chưa quá MAX_MIN. Quá hạn (kẹt) hoặc bản dựng đã xong mà vẫn 404 → vẫn đỏ.
export const MAX_MIN = 90;
/** builds = JSON của GET /repos/{repo}/pages/builds (mới nhất trước) → { pending, ageMin } */
export function pagesPending(builds, now = Date.now(), maxMin = MAX_MIN) {
  const b = Array.isArray(builds) ? builds[0] : null;
  if (!b || !/^(building|queued)$/.test(String(b.status))) return { pending: false, ageMin: 0 };
  const ageMin = Math.round((now - Date.parse(b.created_at)) / 60000);
  return { pending: ageMin >= 0 && ageMin <= maxMin, ageMin };
}

// audio.lexkite.com / media.lexkite.com phục vụ tĩnh từ R2, chép tăng dần từ Pages kho MỖI GIỜ (cdn-mirror.yml, cron :47): file vừa lên Pages 404 trên CDN
// tới lượt chép kế (≤ 60 phút + thời gian chạy). Không phải lỗi khi file ĐÃ có ở gốc Pages và còn mới (last-modified ≤ MIRROR_MAX_MIN); gốc Pages cũng 404
// hoặc file cũ hơn hạn mà CDN vẫn 404 (chép hỏng) → vẫn đỏ.
export const MIRROR_MAX_MIN = 75;
/** lastModified = header Last-Modified của gốc Pages (file 200) → { pending, ageMin } */
export function mirrorPending(lastModified, now = Date.now(), maxMin = MIRROR_MAX_MIN) {
  const t = Date.parse(lastModified || ''); if (Number.isNaN(t)) return { pending: false, ageMin: 0 };
  const ageMin = Math.round((now - t) / 60000);
  return { pending: ageMin >= -5 && ageMin <= maxMin, ageMin };
}
