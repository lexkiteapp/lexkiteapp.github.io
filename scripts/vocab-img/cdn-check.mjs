#!/usr/bin/env node
// Mỗi mục img.json phải có file trên CDN (media.lexkite.com/vimg/<h>.<fmt>): HEAD một MẪU (mặc định 5 %, tất định theo ngày) – dict-consistency gọi khi CI.
//   node scripts/vocab-img/cdn-check.mjs [--sample 0.05] [--all]
// 404/403 = lỗi (thiếu file → app sẽ gỡ hộp, nhưng chỉ mục không được trỏ tới file không có). Lỗi mạng = chỉ cảnh báo.
import fs from 'fs';
import crypto from 'crypto';

export function cdnTargets(img) {
  const t = [];
  for (const [k, e] of Object.entries(img.items || {})) {
    if (e.h) for (const f of e.fmt || ['webp']) t.push([k, `${img.base}${e.h}.${f}`]);
    if (e.photo && e.photo.h) for (const f of e.photo.fmt || ['webp']) t.push([k + ' (photo)', `${img.base}${e.photo.h}.${f}`]);
  }
  return t;
}
export async function cdnCheck(img, frac = 0.05, seed = new Date().toISOString().slice(0, 10)) {
  const all = cdnTargets(img), pick = frac >= 1 ? all : all.filter(([, u]) => parseInt(crypto.createHash('sha1').update(seed + u).digest('hex').slice(0, 8), 16) / 0xffffffff < frac);
  if (all.length && !pick.length) pick.push(all[0]);
  const bad = [], warn = [];
  for (let i = 0; i < pick.length; i += 8) await Promise.all(pick.slice(i, i + 8).map(async ([k, u]) => {
    try { const r = await fetch(u, { method: 'HEAD', signal: AbortSignal.timeout(15000) }); if (r.status === 404 || r.status === 403 || r.status === 410) bad.push(`img ${k}: CDN ${r.status} ${u}`); else if (!r.ok) warn.push(`${u} ${r.status}`); }
    catch (e) { warn.push(`${u} ${String(e.message || e).slice(0, 40)}`); }
  }));
  return { n: pick.length, of: all.length, bad, warn };
}
if (process.argv[1] && process.argv[1].endsWith('cdn-check.mjs')) {
  const i = process.argv.indexOf('--sample'), img = JSON.parse(fs.readFileSync(new URL('../../content/lexicon/img.json', import.meta.url), 'utf8'));
  const r = await cdnCheck(img, process.argv.includes('--all') ? 1 : i > 0 ? +process.argv[i + 1] : 0.05);
  if (r.warn.length) console.log('⚠ ' + r.warn.slice(0, 10).join(' · '));
  console.log(`CDN: HEAD ${r.n}/${r.of} file · thiếu ${r.bad.length}`); if (r.bad.length) { console.error(r.bad.join('\n')); process.exit(1); }
}
