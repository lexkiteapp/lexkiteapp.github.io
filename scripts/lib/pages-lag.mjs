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
