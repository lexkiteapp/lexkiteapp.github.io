#!/usr/bin/env node
// Kiểm file giọng đọc mà app tham chiếu (web/js/listen/audio-index.js → LISTEN_AUDIO) có thật trên CDN.
//   node scripts/audio-cdn-check.mjs --local                 → chỉ kiểm file có trong web/audio/l (nhanh, chạy trong npm test)
//   node scripts/audio-cdn-check.mjs [--base URL] [--sample N] [--concurrency C] [--retries R]
//     --base mặc định https://audio.lexkite.com/audio/l/ ; gốc GitHub Pages: https://lexkiteapp.github.io/audio/l/
//     --sample N: kiểm N file ngẫu nhiên (mặc định: tất cả)
// Thoát mã 1 nếu có file thiếu (sau khi thử lại --retries lần, cách nhau 30 s – chờ Pages lan truyền).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const src = fs.readFileSync(path.join(root, 'web/js/listen/audio-index.js'), 'utf8');
const keys = (src.match(/new Set\("([^"]*)"/) || [, ''])[1].split(/\s+/).filter(Boolean);
if (!keys.length) { console.error('audio-cdn-check: không đọc được LISTEN_AUDIO'); process.exit(1); }

if (args.includes('--local')) {
  const miss = keys.filter(k => !fs.existsSync(path.join(root, 'web/audio/l', k + '.mp3')));
  console.log(`audio-cdn-check --local: ${keys.length} khóa, thiếu file ${miss.length}`);
  if (miss.length) { console.log(miss.slice(0, 20).join(' ')); process.exit(1); }
  process.exit(0);
}

const base = opt('base', 'https://audio.lexkite.com/audio/l/');
const conc = +opt('concurrency', 12);
const retries = +opt('retries', 0);
let list = keys;
const n = +opt('sample', 0);
if (n && n < keys.length) { list = [...keys]; for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } list = list.slice(0, n); }

async function head(k) {
  for (let t = 0; t < 3; t++) {
    try { const r = await fetch(base + k + '.mp3', { method: 'HEAD' }); if (r.status < 500) return r.status; } catch {}
    await new Promise(r => setTimeout(r, 1000 * (t + 1)));
  }
  return 0;
}
async function run(ks) {
  const res = { ok: [], nf: [], other: [] };
  let i = 0;
  await Promise.all(Array.from({ length: conc }, async () => {
    while (i < ks.length) { const k = ks[i++]; const s = await head(k); (s === 200 ? res.ok : s === 404 ? res.nf : res.other).push(k + (s === 200 || s === 404 ? '' : ':' + s)); }
  }));
  return res;
}
let todo = list, res = await run(todo);
const total = list.length, okAll = [...res.ok];
for (let r = 0; r < retries && res.nf.length + res.other.length; r++) {
  console.log(`  thử lại ${res.nf.length + res.other.length} file sau 30 s…`);
  await new Promise(x => setTimeout(x, 30000));
  res = await run([...res.nf, ...res.other.map(s => s.split(':')[0])]);
  okAll.push(...res.ok);
}
console.log(`audio-cdn-check ${base}: tổng ${total}, OK ${okAll.length}, 404 ${res.nf.length}, khác ${res.other.length}`);
if (res.nf.length) console.log('404:', res.nf.slice(0, 30).join(' ') + (res.nf.length > 30 ? ' …' : ''));
if (res.other.length) console.log('khác:', res.other.slice(0, 30).join(' '));
const out = opt('out', '');
if (out) fs.writeFileSync(out, JSON.stringify({ base, total, ok: okAll.length, missing: res.nf, other: res.other }, null, 1));
process.exit(res.nf.length + res.other.length ? 1 : 0);
