/* Bộ định tuyến phân mảnh dữ liệu học theo người dùng (docs/CAPACITY.md §Kiến trúc C2). Hiện N = 1 (mọi người ở env.DB) – thêm mảnh chỉ là cấu hình.
 * Bảng users (luôn ở DB chính) giữ cột shard = số mảnh của người đó (thư mục, không băm lại) → chuyển người giữa mảnh = chép dòng docs + đổi users.shard.
 * Người MỚI: chọn theo băm uid trong danh sách mảnh đang NHẬN (SYNC_SHARDS_OPEN, vd. "0,1,2"); mảnh k ≥ 1 = binding D1 'DB_S<k>' trong wrangler.toml.
 * Mảnh thiếu binding → bỏ qua khi chọn; người đã ở mảnh đó → lỗi 'shard-missing' (không bao giờ ghi nhầm sang mảnh khác). */
export const fnv = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };
/** @param {any} env @param {number} shard */
export function docsDb(env, shard = 0) {
  if (!shard) return env.DB;
  const b = env['DB_S' + shard]; if (!b) throw new Error('shard-missing');
  return b;
}
/** Mảnh cho người dùng mới. */
export function pickShard(env, uid) {
  const open = String((env && env.SYNC_SHARDS_OPEN) || '0').split(',').map(s => +s.trim()).filter(n => Number.isInteger(n) && n >= 0 && (n === 0 || (env && env['DB_S' + n])));
  return open.length ? open[fnv(String(uid)) % open.length] : 0;
}
