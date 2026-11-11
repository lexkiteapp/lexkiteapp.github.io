#!/usr/bin/env node
// Kiểm file giọng đọc mà app tham chiếu (web/js/listen/audio-index.js → LISTEN_AUDIO) có thật trên CDN.
//   node scripts/audio-cdn-check.mjs --local                 → không mạng (npm test): chỉ mục đọc được, web/audio KHÔNG còn mp3
//   node scripts/audio-cdn-check.mjs --media                 → kiểm mọi khóa (audio/l) + mọi từ trong web/audio/w/index.txt (audio/w, 2 giọng) có trong
//                                                              cây git các kho media kind audio (infra/media-repos.json; clone nông không blob, vài MB)
//   node scripts/audio-cdn-check.mjs [--base URL] [--sample N] [--concurrency C] [--retries R]
//     --base mặc định https://audio.lexkite.com/audio/l/ ; gốc Pages kho m2: https://lexkiteapp.github.io/lexkite-media-2/audio/l/
//     --sample N: kiểm N file ngẫu nhiên (mặc định: tất cả)
// Thoát mã 1 nếu có file thiếu (sau khi thử lại --retries lần, cách nhau 30 s – chờ Pages lan truyền).
import { pagesPending, MAX_MIN, mirrorPending, MIRROR_MAX_MIN } from './lib/pages-lag.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { loadRepos, servingRepos } from './lib/media-repos.mjs';
import { readIndex } from './sentence-audio/lib.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const keys = [...readIndex(path.join(root, 'web/js/listen/audio-index.js')).have]; // dạng nén Rice – chạy tệp (scripts/sentence-audio/keyset.mjs)
if (!keys.length) { console.error('audio-cdn-check: không đọc được LISTEN_AUDIO'); process.exit(1); }

// --local (npm test, không mạng): chỉ mục đọc được + repo chính KHÔNG chứa mp3 (đã chuyển sang kho media – docs/STORAGE.md); đủ tệp trong kho: --media (pages.yml)
if (args.includes('--local')) {
  const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
  const mp3 = walk(path.join(root, 'web/audio')).filter(f => f.endsWith('.mp3'));
  const words = fs.existsSync(path.join(root, 'web/audio/w/index.txt')) ? fs.readFileSync(path.join(root, 'web/audio/w/index.txt'), 'utf8').split('\n').filter(Boolean).length : -1;
  console.log(`audio-cdn-check --local: ${keys.length} khóa câu · ${words} từ · mp3 trong repo chính: ${mp3.length}`);
  if (mp3.length || words < 0) { console.error('✗ mp3 phải nằm ở kho media (scripts/media/push.mjs), không ở web/audio/; web/audio/w/index.txt phải có'); process.exit(1); }
  process.exit(0);
}
if (args.includes('--media')) {
  const have = new Set();
  for (const r of servingRepos(loadRepos(), 'audio')) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acc-'));
    try {
      execFileSync('git', ['clone', '-q', '--bare', '--depth', '1', '--filter=blob:none', `https://github.com/${r.repo}.git`, dir], { stdio: 'ignore' });
      for (const ln of execFileSync('git', ['-C', dir, 'ls-tree', '-r', '--name-only', 'HEAD', 'audio'], { maxBuffer: 1 << 28 }).toString().split('\n')) if (ln) have.add(ln);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
  const words = fs.readFileSync(path.join(root, 'web/audio/w/index.txt'), 'utf8').split('\n').filter(Boolean);
  const { wordKey, fnv } = await import('./word-audio-strong.mjs'), st = new Map((fs.existsSync(path.join(root, 'web/audio/w/s3.tsv')) ? fs.readFileSync(path.join(root, 'web/audio/w/s3.tsv'), 'utf8') : '').split('\n').filter(Boolean).map(l => [l.split('\t')[0], l.split('\t').slice(1)]));
  const miss = [...keys.map(k => `audio/l/${k}.mp3`), ...words.flatMap(w => ['bf_emma', 'af_heart'].filter((v, i) => !st.has(w) || st.get(w)[i] === 'ok').map(v => `audio/w/${st.size ? wordKey(v, w) : fnv(v + '|' + w)}.mp3`))].filter(f => !have.has(f));
  console.log(`audio-cdn-check --media: ${keys.length} khóa câu + ${words.length} từ · kho có ${have.size} tệp · thiếu ${miss.length}`);
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
// --pages-repo owner/repo: Pages của kho đang dựng bản mới (lô đẩy gần đây) → file 404 là "chờ lan truyền", không đỏ (quá 90 phút/dựng xong vẫn 404 → đỏ). Cây kho đã được bước --media xác nhận đủ file.
let pend = null;
{ const pr = opt('pages-repo', ''); if (pr && res.nf.length) { try { const h = { accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { authorization: 'Bearer ' + process.env.GITHUB_TOKEN } : {}) }; const j = await (await fetch(`https://api.github.com/repos/${pr}/pages/builds?per_page=1`, { headers: h })).json(); const p = pagesPending(j); if (p.pending) pend = p; } catch {} } }
console.log(`audio-cdn-check ${base}: tổng ${total}, OK ${okAll.length}, 404 ${res.nf.length}, khác ${res.other.length}`);
if (res.nf.length) console.log('404:', res.nf.slice(0, 30).join(' ') + (res.nf.length > 30 ? ' …' : ''));
if (res.other.length) console.log('khác:', res.other.slice(0, 30).join(' '));
// --origin URL (gốc Pages của cùng đường dẫn): CDN R2 chép từ Pages mỗi giờ → file 404 ở CDN nhưng đã có ở gốc Pages và mới (≤ MIRROR_MAX_MIN) = chờ lượt chép, không đỏ
let mirrorWait = false;
{ const og = opt('origin', ''); if (og && res.nf.length && !res.other.length) { const lm = await Promise.all(res.nf.slice(0, 60).map(async k => { try { const r = await fetch(og + k + '.mp3', { method: 'HEAD' }); return r.status === 200 && mirrorPending(r.headers.get('last-modified')).pending; } catch { return false; } }));
  mirrorWait = lm.length === res.nf.length && lm.every(Boolean); } }
const out = opt('out', '');
if (out) fs.writeFileSync(out, JSON.stringify({ base, total, ok: okAll.length, missing: res.nf, other: res.other }, null, 1));
if (pend && !res.other.length) { console.log(`⏳ ${res.nf.length} file chờ Pages kho dựng xong (bản dựng đang chạy ${pend.ageMin} phút ≤ ${MAX_MIN}) – không tính lỗi; lượt sau kiểm lại`); process.exit(0); }
if (mirrorWait) { console.log(`⏳ ${res.nf.length} file đã có ở gốc Pages (≤ ${MIRROR_MAX_MIN} phút) chờ cdn-mirror chép sang R2 (mỗi giờ) – không tính lỗi; lượt sau kiểm lại`); process.exit(0); }
process.exit(res.nf.length + res.other.length ? 1 : 0);
