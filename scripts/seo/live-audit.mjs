// Kiểm site THẬT (lexkite.com) sau deploy – bắt lỗi mà cổng dist trên PR không thấy (bài bot đẩy thẳng main, deploy kẹt, Worker từ điển):
// mọi sitemap con 200 · mẫu 3 URL/sitemap: 200, không noindex, canonical = chính nó, hreflang có chính nó + x-default, JSON-LD parse được,
// hreflang hai chiều (≤ 12 trang) · 404 thật cho trang không có · http/www → https gốc. Lỗi cứng → exit 1 (ci-triage mở issue).
// Tiêu đề > 70 / mô tả ngoài 50–170 ký tự chỉ ghi chú (Google tự cắt), không đỏ. Dùng: node scripts/seo/live-audit.mjs [origin]
const B = process.argv[2] || 'https://lexkite.com';
// Giãn ≥ 300 ms/request (≈ 33 req/10 s): dưới luật lexkite_content_rl 40 req/10 s/IP (docs/CONTENT-PROTECTION.md) – không bị 429 giả
let next = 0; const slot = async () => { const w = Math.max(0, next - Date.now()); next = Math.max(next, Date.now()) + 300; if (w) await new Promise(r => setTimeout(r, w)); };
const get = async (u, method = 'GET') => { await slot(); for (let i = 0; i < 3; i++) { try { const r = await fetch(u, { redirect: 'manual', method, headers: { 'user-agent': 'lexkite-live-audit' } }); return { s: r.status, h: r.headers, t: method === 'HEAD' ? '' : await r.text() }; } catch (e) { if (i === 2) return { s: 'ERR ' + e.message, h: new Headers(), t: '' }; await new Promise(r => setTimeout(r, 2000)); } } };
const locs = x => [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const canon = t => (t.match(/<link[^>]+rel="canonical"[^>]*href="([^"]+)"/i) || t.match(/<link[^>]+href="([^"]+)"[^>]*rel="canonical"/i) || [])[1];
const alts = t => [...t.matchAll(/<link[^>]+rel="alternate"[^>]+hreflang="([^"]+)"[^>]+href="([^"]+)"/gi)].map(m => [m[1], m[2]]);
const hard = [], soft = [];
const idx = await get(`${B}/sitemap.xml`);
if (idx.s !== 200) { console.log(`✗ live-audit: ${B}/sitemap.xml → ${idx.s}`); process.exit(1); }
const maps = idx.t.includes('<sitemapindex') ? locs(idx.t) : [`${B}/sitemap.xml`];
const sample = new Set(); let total = 0;
await Promise.all(maps.map(async m => {
  const r = await get(m); if (r.s !== 200) return hard.push(`sitemap ${m} → ${r.s}`);
  const L = locs(r.t); total += L.length;
  if (!L.length) hard.push(`sitemap rỗng ${m}`);
  if (L.length > 50000) hard.push(`sitemap ${m}: ${L.length} URL > 50.000`);
  [L[0], L[L.length >> 1], L.at(-1)].filter(Boolean).forEach(u => sample.add(u));
}));
const pages = new Map();
const check = async u => {
  const r = await get(u); if (r.s !== 200) return hard.push(`${u} → ${r.s}${r.h.get('location') ? ' ' + r.h.get('location') : ''} (nằm trong sitemap)`);
  const t = r.t, c = canon(t), a = alts(t), ro = (t.match(/<meta[^>]*name="robots"[^>]*>/i) || [''])[0] + ' ' + (r.h.get('x-robots-tag') || '');
  if (/noindex/i.test(ro)) hard.push(`${u}: noindex nằm trong sitemap`);
  if (!c) hard.push(`${u}: thiếu canonical`); else if (c !== u) hard.push(`${u}: canonical lệch → ${c}`);
  if (a.length && !a.some(([, h]) => h === u)) hard.push(`${u}: hreflang không chứa chính nó`);
  if (a.length > 1 && !a.some(([l]) => l === 'x-default')) hard.push(`${u}: hreflang thiếu x-default`);
  for (const m of t.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch { hard.push(`${u}: JSON-LD hỏng`); } }
  if (!/<html[^>]+lang="/.test(t)) hard.push(`${u}: thiếu <html lang>`);
  const ti = (t.match(/<title>([^<]*)/) || [])[1] || '', d = (t.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i) || [])[1];
  if (!ti) hard.push(`${u}: thiếu <title>`); else if ([...ti].length > 70) soft.push(`tiêu đề ${[...ti].length} ký tự: ${u}`);
  if (!d) hard.push(`${u}: thiếu meta description`); else if (d.length > 170 || (d.length < 50 && !/[　-鿿가-힯]/.test(d))) soft.push(`mô tả ${d.length} ký tự: ${u}`);
  pages.set(u, a);
};
const list = [...sample]; for (let i = 0; i < list.length; i += 8) await Promise.all(list.slice(i, i + 8).map(check));
let n = 0;
for (const [u, a] of pages) { if (!a.length || n++ >= 12) continue;
  for (const [l, h] of a) { if (h === u || l === 'x-default') continue; const r = await get(h);
    if (r.s !== 200) hard.push(`hreflang ${l} của ${u} → ${h} ${r.s}`); else if (!alts(r.t).some(([, x]) => x === u)) hard.push(`hreflang không hai chiều: ${h} thiếu ${u}`); } }
for (const p of ['/lexkite-live-audit-404', '/en/blog/lexkite-live-audit-404/']) { const r = await get(B + p); if (r.s !== 404) hard.push(`${p} → ${r.s} (phải 404, tránh soft-404)`); }
const host = new URL(B).host;
for (const u of [`http://${host}/`, `https://www.${host}/`]) { const r = await get(u, 'HEAD'); if (!(r.s === 301 || r.s === 308) || r.h.get('location') !== `${B}/`) hard.push(`${u} → ${r.s} ${r.h.get('location')} (phải 301 → ${B}/)`); }
console.log(`live-audit ${B}: ${maps.length} sitemap · ${total} URL · mẫu ${pages.size} trang`);
if (soft.length) { console.log(`ℹ ghi chú (${soft.length}, không đỏ):`); soft.slice(0, 15).forEach(x => console.log('  ' + x)); }
if (hard.length) { console.log(`✗ live-audit: ${hard.length} lỗi`); hard.slice(0, 40).forEach(x => console.log('  ' + x)); process.exit(1); }
console.log('✓ live-audit: sitemap, canonical, hreflang, noindex, JSON-LD, 404, chuyển hướng đều đúng');
