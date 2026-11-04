// Kho DỊCH SẴN câu có trong dữ liệu (câu ví dụ `ex` + định nghĩa `def` của mọi từ) → bảng bôi đen "Dịch" hiện tức thì, không gọi mạng (web/js/tr-fast.js).
// Ra: web/packs/tr/<lang>/<0…63>.json = { "<băm 8 hex>": "bản dịch" } – khóa = TrFast.hash(TrFast.norm(câu EN)) (một nguồn: web/js/tr-fast.js).
// Nguồn bản dịch: câu ví dụ lấy lại từ web/packs/sent (cùng câu EN → không dịch lại); còn lại Google gtx theo lô (như gen-sent-packs, chạy trên CI).
// Chạy lại = chỉ dịch câu mới/đổi; câu đã bỏ khỏi dữ liệu bị xóa. Đụng băm (2 câu khác nhau cùng khóa) → thóat lỗi.
//   node scripts/gen-tr-packs.mjs <lang|all> [--max N] [--offline]   (--offline: chỉ dựng từ kho sent + kho cũ, không gọi mạng)
import fs from 'fs';
import { fileURLToPath } from 'url';
import { sentences, tr } from './gen-sent-packs.mjs';
const R = new URL('../', import.meta.url);
export const LANGS = ['vi'].concat(fs.readFileSync(new URL('scripts/i18n-langs.txt', R), 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#')));
const g = {}; new Function('self', fs.readFileSync(new URL('web/js/tr-fast.js', R), 'utf8'))(g);
export const { norm, hash, shardOf } = g.TrFast;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Mọi câu cần dịch sẵn: [{ h, en, word, kind }] – không trùng băm
export function items() {
  const out = new Map();
  for (const x of sentences().values()) for (const [kind, en] of [['ex', x.ex], ['def', String(x.w.def || '').trim()]]) {
    if (!en || !/[A-Za-z]{2}/.test(en)) continue;
    const n = norm(en), h = hash(n), o = out.get(h);
    if (o && o.n !== n) throw new Error(`đụng băm ${h}: "${o.en}" ↔ "${en}"`);
    if (!o) out.set(h, { h, n, en, word: x.word, kind });
  }
  return [...out.values()];
}
const readDir = d => { const m = {}; if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) if (f.endsWith('.json')) Object.assign(m, JSON.parse(fs.readFileSync(new URL(f, d), 'utf8'))); return m; };

async function run(lang, { max = 1e9, offline = false } = {}) {
  const dir = new URL(`web/packs/tr/${lang}/`, R), sent = new URL(`web/packs/sent/${lang}/`, R);
  const all = items(), prev = readDir(dir), sp = readDir(sent), have = {};
  for (const x of all) {
    const s = x.kind === 'ex' && sp[x.word]; // câu ví dụ đã dịch ở kho bài học (cùng câu EN)
    if (s && s[1] && norm(s[0]) === x.n) have[x.h] = s[1];
    else if (prev[x.h] && !(prev[x.h].trim().toLowerCase() === x.en.trim().toLowerCase() && x.en.split(' ').length > 2)) have[x.h] = prev[x.h]; // bản còn nguyên tiếng Anh (Google trả lại câu gốc) → dịch lại lượt sau
  }
  const miss = all.filter(x => !have[x.h]).slice(0, max);
  console.log(lang, all.length, 'câu, có sẵn', Object.keys(have).length, '· cần dịch', offline ? 0 : miss.length);
  let stop = offline;
  for (let i = 0; i < miss.length && !stop;) {
    const b = []; let len = 0; // lô ≤ ~6000 ký tự đã mã hóa, ≤ 40 câu (URL GET an toàn)
    while (i < miss.length && b.length < 40) { const n = encodeURIComponent(miss[i].en).length + 3; if (b.length && len + n > 6000) break; b.push(miss[i++]); len += n; }
    const o = await tr(lang, b.map(x => x.en));
    if (o === undefined) { stop = true; break; }
    if (o) b.forEach((x, n) => { if (o[n]) have[x.h] = o[n]; });
    else for (const x of b) { const one = await tr(lang, [x.en]); if (one === undefined) { stop = true; break; } if (one && one[0]) have[x.h] = one[0]; await sleep(400); }
    await sleep(1200);
  }
  fs.mkdirSync(dir, { recursive: true });
  const shards = {}; for (const [h, v] of Object.entries(have)) (shards[shardOf(h)] ||= {})[h] = v;
  for (let k = 0; k < 64; k++) fs.writeFileSync(new URL(k + '.json', dir), JSON.stringify(Object.fromEntries(Object.entries(shards[k] || {}).sort())));
  console.log(lang, 'có', Object.keys(have).length, '/', all.length, stop && !offline ? '(dừng: mạng/giới hạn – chạy lại để tiếp)' : '');
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = process.argv.slice(2), mi = a.indexOf('--max'), max = mi >= 0 ? +a[mi + 1] || 1e9 : 1e9, offline = a.includes('--offline');
  const arg = a.find((x, i) => !x.startsWith('--') && !(mi >= 0 && i === mi + 1)) || 'all';
  for (const l of arg === 'all' ? LANGS : [arg]) await run(l, { max, offline });
}
