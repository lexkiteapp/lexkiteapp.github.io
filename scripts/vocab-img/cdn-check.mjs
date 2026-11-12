#!/usr/bin/env node
// Mỗi mục img.json phải có file trên CDN (media.lexkite.com/vimg/<h>.<fmt>): HEAD một MẪU (mặc định 5 %, tất định theo ngày) – dict-consistency gọi khi CI.
// HEAD THẲNG gốc GitHub Pages của kho media (cùng thứ tự VIMG_ORDER/VIMG_ORIGINS của Worker lexkite-media), KHÔNG qua media.lexkite.com:
// 01/11–02/11 mỗi lượt npm test HEAD ~1k ảnh qua Worker × hàng trăm lượt CI/ngày → hạn mức Workers 100k/ngày cạn (lỗi 1027, /api chết,
// Live traffic 0). --via-cdn = kiểm qua Worker thật (chạy tay, hiếm).
//   node scripts/vocab-img/cdn-check.mjs [--sample 0.05] [--all] [--via-cdn]
// 404/403 = lỗi (thiếu file → app sẽ gỡ hộp, nhưng chỉ mục không được trỏ tới file không có). Lỗi mạng = chỉ cảnh báo.
import fs from 'fs';
import crypto from 'crypto';
// workers/ không có package.json type=module → nạp như ES module qua data: (giống scripts/test/api-security.mjs)
const { VIMG_ORIGINS, VIMG_ORDER } = await import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(new URL('../../workers/media/index.js', import.meta.url))).toString('base64'));

/** URL CDN → các URL gốc theo đúng thứ tự Worker thử (null nếu không phải /vimg/). */
export function originUrls(u) {
  const m = String(u).match(/^https:\/\/media\.lexkite\.com\/(?:(m\d+)\/)?vimg\/([0-9a-f]{16}(?:@2x)?\.(?:webp|avif))$/);
  if (!m || (m[1] && !VIMG_ORIGINS[m[1]])) return null;
  return (m[1] ? [m[1]] : VIMG_ORDER).flatMap(id => VIMG_ORIGINS[id].map(o => `${o}/vimg/${m[2]}`));
}
// Như Worker: tệp có ở gốc đầu tiên trả 2xx; mọi gốc 404 → 404; lỗi khác → trả lỗi cuối
async function headVia(u, viaCdn, fetcher) {
  const list = viaCdn ? [u] : originUrls(u) || [u];
  let last = null;
  for (const x of list) { const r = await fetcher(x, { method: 'HEAD', signal: AbortSignal.timeout(15000) }); if (r.ok) return r; last = r; }
  return last;
}

export function cdnTargets(img) {
  const t = [];
  for (const [k, e] of Object.entries(img.items || {})) {
    if (e.h) for (const f of e.fmt || ['webp']) t.push([k, `${img.base}${e.h}.${f}`]);
    if (e.photo && e.photo.h) for (const f of e.photo.fmt || ['webp']) t.push([k + ' (photo)', `${img.base}${e.photo.h}.${f}`]);
  }
  return t;
}
export async function cdnCheck(img, frac = 0.05, seed = new Date().toISOString().slice(0, 10), { viaCdn = false, fetcher = fetch } = {}) {
  const all = cdnTargets(img), pick = frac >= 1 ? all : all.filter(([, u]) => parseInt(crypto.createHash('sha1').update(seed + u).digest('hex').slice(0, 8), 16) / 0xffffffff < frac);
  if (all.length && !pick.length) pick.push(all[0]);
  const bad = [], warn = [];
  for (let i = 0; i < pick.length; i += 8) await Promise.all(pick.slice(i, i + 8).map(async ([k, u]) => {
    try { const r = await headVia(u, viaCdn, fetcher); if (r.status === 404 || r.status === 403 || r.status === 410) bad.push(`img ${k}: CDN ${r.status} ${u}`); else if (!r.ok) warn.push(`${u} ${r.status}`); }
    catch (e) { warn.push(`${u} ${String(e.message || e).slice(0, 40)}`); }
  }));
  return { n: pick.length, of: all.length, bad, warn };
}
if (process.argv[1] && process.argv[1].endsWith('cdn-check.mjs')) {
  const i = process.argv.indexOf('--sample'), img = JSON.parse(fs.readFileSync(new URL('../../content/lexicon/img.json', import.meta.url), 'utf8'));
  const r = await cdnCheck(img, process.argv.includes('--all') ? 1 : i > 0 ? +process.argv[i + 1] : 0.05, undefined, { viaCdn: process.argv.includes('--via-cdn') });
  if (r.warn.length) console.log('⚠ ' + r.warn.slice(0, 10).join(' · '));
  console.log(`CDN: HEAD ${r.n}/${r.of} file · thiếu ${r.bad.length}`); if (r.bad.length) { console.error(r.bad.join('\n')); process.exit(1); }
}
