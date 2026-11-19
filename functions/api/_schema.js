/* Cổng lược đồ (docs/CAPACITY.md §Kiến trúc A1): CREATE/ALTER/di chuyển chỉ chạy khi PHIÊN BẢN lược đồ của module đổi,
 * không chạy lại ở mỗi isolate lạnh (đo Miniflare: khởi động lạnh tốn ~190 dòng đọc + ~100 dòng GHI – CREATE IF NOT EXISTS, ALTER trùng cột, DROP INDEX…).
 * Thứ tự kiểm: bộ nhớ isolate → Cache API (theo trung tâm dữ liệu, 1 ngày) → D1 schema_ver (1 dòng đọc) → chạy fn() rồi ghi phiên bản.
 * Đổi lược đồ của module → TĂNG số phiên bản (ver) ở lời gọi once(). Tắt cổng (rollback): biến môi trường SCHEMA_GATE=0 → chạy fn() mỗi isolate như cũ. */
const DONE = new Set();
const ck = (tag, name, ver) => new Request(`https://cache.lexkite.internal/schema/${encodeURIComponent(tag)}/${encodeURIComponent(name)}/${ver}`);
/** @param {any} db @param {string} name @param {number} ver @param {() => Promise<any>} fn @param {{ env?: any, tag?: string }} [o] */
export async function once(db, name, ver, fn, o = {}) {
  const tag = o.tag || 'DB', key = tag + '|' + name + '|' + ver;
  if (DONE.has(key)) return;
  if (o.env && o.env.SCHEMA_GATE === '0') { await fn(); DONE.add(key); return; }
  let ok = false;
  try { ok = !!(await /** @type {any} */ (caches).default.match(ck(tag, name, ver))); } catch (e) { ok = false; }
  if (!ok) { try { const r = await db.prepare('SELECT v FROM schema_ver WHERE k = ?').bind(name).first(); ok = !!r && +r.v === ver; } catch (e) { ok = false; } }
  if (!ok) {
    await fn();
    try { await db.batch([db.prepare('CREATE TABLE IF NOT EXISTS schema_ver (k TEXT PRIMARY KEY, v INTEGER NOT NULL, at INTEGER) WITHOUT ROWID'), db.prepare('INSERT INTO schema_ver (k, v, at) VALUES (?1, ?2, ?3) ON CONFLICT (k) DO UPDATE SET v = ?2, at = ?3').bind(name, ver, Date.now())]); } catch (e) { /* lần sau chạy lại – vô hại */ }
  }
  try { await /** @type {any} */ (caches).default.put(ck(tag, name, ver), new Response('1', { headers: { 'Cache-Control': 'max-age=86400' } })); } catch (e) { /* bỏ qua */ }
  DONE.add(key);
}
export const _resetSchema = () => DONE.clear(); // kiểm thử
