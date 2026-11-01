/* GET /api/ota?p=<android|ios>&n=<bản app gốc>&v=<bản web đang chạy> – bản web OTA mới nhất (docs/OTA.md).
 * Nguồn: tệp latest.json đính kèm GitHub Release 'ota-manifest' (CI prod-release ghi; ota-rollback.yml ghi lại bản cũ). Không D1, không khóa bí mật:
 * chữ ký ECDSA nằm TRONG manifest và app tự kiểm (web/js/ota.js) → máy chủ này không cần tin cậy. Đệm biên 60 giây.
 * Trả {version,url,sha256,signature,minNative} hoặc {none:true}. Lọc minNative phía app (app gốc quá cũ → nhắc cập nhật cửa hàng). */
export const MANIFEST = 'https://github.com/lexkiteapp/lexkiteapp.github.io/releases/download/ota-manifest/latest.json';
export const TTL = 60;
const KEY = 'https://cache.lexkite.internal/ota/v1';
const URL_OK = /^https:\/\/github\.com\/lexkiteapp\/lexkiteapp\.github\.io\/releases\/download\/ota-[\w.-]+\/bundle\.zip$/;
/** Chỉ cho đi qua đúng các trường đã định (manifest lạ/hỏng → none). */
export function clean(m) {
  if (!m || typeof m !== 'object' || !/^[\w.-]{1,64}$/.test(m.version || '') || !URL_OK.test(m.url || '') || !/^[0-9a-f]{64}$/.test(m.sha256 || '') || typeof m.signature !== 'string' || m.signature.length > 120) return null;
  return { version: m.version, url: m.url, sha256: m.sha256, signature: m.signature, minNative: /^[\d.]{1,20}$/.test(m.minNative || '') ? m.minNative : '0' };
}
export async function onRequestGet({ request }) {
  let body = null;
  try { const hit = await /** @type {any} */ (caches).default.match(new Request(KEY)); if (hit) body = await hit.text(); } catch (e) { body = null; }
  if (body == null) {
    let out = { none: true };
    try { const r = await fetch(MANIFEST, { redirect: 'follow', cf: { cacheTtl: TTL } }); if (r.ok) out = clean(await r.json()) || out; } catch (e) { /* GitHub lỗi → none, app thử lại sau */ }
    body = JSON.stringify(out);
    try { await /** @type {any} */ (caches).default.put(new Request(KEY), new Response(body, { headers: { 'Cache-Control': `max-age=${TTL}` } })); } catch (e) { /* bỏ qua */ }
  }
  void request;
  return new Response(body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${TTL}`, 'Access-Control-Allow-Origin': '*' } });
}
