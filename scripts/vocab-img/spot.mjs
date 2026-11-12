#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
// Kiểm tra mẫu HẰNG TUẦN bởi tác tử Claude (docs/LEXICON.md § Ảnh minh hoạ › Kiểm mẫu tuần): 5 % ảnh mỗi lô đăng trong N ngày, tất định.
//   node scripts/vocab-img/spot.mjs --sample [--days 7]          → JSON [{k, b, url, def, card}] (Claude xem từng ảnh: đúng NGHĨA? không chữ? an toàn?)
//   node scripts/vocab-img/spot.mjs --verdict v.json [--write]   v.json = {"từ#loại": "ok" | "bad: lý do"}
// Luật: ảnh bad → gỡ (rejected). Lô (trường b = run id) có tỉ lệ sai trong mẫu > 2 % → GỠ CẢ LÔ (vẽ lại lượt sau với thẻ/lần thử mới).
// --write ghi content/lexicon/img.json rồi chạy build-lexicon --write; không --write = chỉ in kế hoạch.
import fs from 'fs';
import { execFileSync } from 'child_process';
import { fnv } from './style.mjs';

const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : undefined; };
const ROOT = new URL('../../', import.meta.url), P = p => fileURLToPath(new URL(p, ROOT)), J = p => JSON.parse(fs.readFileSync(P(p), 'utf8'));
const IMG = 'content/lexicon/img.json', MAX_BAD = 0.02, RATE = 0.05;
const img = J(IMG);

/** mẫu tất định 5 % (≥ 1) mỗi lô */
export function sample(items, days = 7, now = Date.now()) {
  const since = new Date(now - days * 864e5).toISOString().slice(0, 10), by = {};
  for (const [k, e] of Object.entries(items)) if (e.at >= since) (by[e.b || e.at] ||= []).push(k);
  const out = [];
  for (const [b, ks] of Object.entries(by)) { const n = Math.max(1, Math.ceil(ks.length * RATE)); out.push(...ks.sort((x, y) => fnv('spot|' + x) - fnv('spot|' + y)).slice(0, n).map(k => ({ k, b, size: ks.length }))); }
  return out;
}
/** áp kết quả: → { rejectKeys[], batches: {b: {checked, bad, rate, reject}} } */
export function judgeBatches(items, verdict) {
  const batches = {}, rej = new Set();
  for (const [k, v] of Object.entries(verdict)) {
    const e = items[k]; if (!e) continue; const b = e.b || e.at, x = (batches[b] ||= { checked: 0, bad: 0 });
    x.checked++; if (String(v).startsWith('bad')) { x.bad++; rej.add(k); }
  }
  for (const [b, x] of Object.entries(batches)) { x.rate = x.bad / x.checked; x.reject = x.rate > MAX_BAD; if (x.reject) for (const [k, e] of Object.entries(items)) if ((e.b || e.at) === b) rej.add(k); }
  return { rejectKeys: [...rej], batches };
}
function main() {
  if (process.argv.includes('--sample')) {
    const lex = fs.existsSync(P('dist/lexicon.json')) ? J('dist/lexicon.json') : {}, cards = J('content/lexicon/vimg-cards.json').items;
    const s = sample(img.items, +(arg('days') || 7)).map(x => ({ ...x, url: img.items[x.k].url, def: (lex[x.k] || {}).def, card: (cards[x.k] || {}).o }));
    process.stdout.write(JSON.stringify(s, null, 1) + '\n'); return;
  }
  const vf = arg('verdict'); if (!vf) { console.error('dùng --sample hoặc --verdict v.json'); process.exit(2); }
  const { rejectKeys, batches } = judgeBatches(img.items, JSON.parse(fs.readFileSync(vf, 'utf8')));
  console.log(JSON.stringify(batches), `→ gỡ ${rejectKeys.length} ảnh`);
  if (!process.argv.includes('--write')) return;
  const today = new Date().toISOString().slice(0, 10);
  for (const k of rejectKeys) { img.rejected[k] = { at: today, why: 'spot-check', h: img.items[k].h }; delete img.items[k]; }
  fs.writeFileSync(P(IMG), JSON.stringify(img, null, 1) + '\n');
  execFileSync('node', [P('scripts/build-lexicon.mjs'), '--write'], { stdio: 'inherit' });
}
if (process.argv[1] && fileURLToPath(new URL(import.meta.url)) === fs.realpathSync(process.argv[1])) main();
