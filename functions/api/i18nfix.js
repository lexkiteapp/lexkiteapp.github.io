/* Bản sửa dịch giao diện đã được quản trị duyệt (Quản trị → Chất lượng → Áp dụng) – công khai (chỉ là bản dịch),
 * workflow i18n.yml tải mỗi đêm và gộp vào scripts/i18n-fixed.json. GET /api/i18nfix → { "<khóa tiếng Việt>": { "<lang>": "bản dịch" } } */
export async function onRequestGet({ env }) {
  const out = {};
  try { for (const r of (await env.DB.prepare('SELECT lang, key, val FROM i18n_fix').all()).results || []) (out[r.key] = out[r.key] || {})[r.lang] = r.val; } catch (e) { /* chưa có bảng */ }
  return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
