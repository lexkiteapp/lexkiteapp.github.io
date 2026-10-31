// Bản dịch CÂU ví dụ cho bài học (nghĩa tiếng mẹ đẻ của câu ở dạng Xếp câu / Chọn từ thiếu – docs/LESSON-UX-V2.md §3).
// Nguồn: câu `ex` của mọi từ chủ đề (web/js/data.js + web/js/lib/*.js, trừ notes-*) – cùng bộ từ với gen-word-packs.mjs.
// Ra: web/packs/sent/<lang>/<mảnh>.json = { "word": ["câu EN", "bản dịch"] }, mảnh = chữ cái đầu của từ (a–z, khác → "_"), tải lười theo từ của bài.
// Chạy trên CI (sent-packs.yml), không cần khóa: Google Translate gtx (POST theo lô). Chạy lại = chỉ dịch câu mới/đổi.
//   node scripts/gen-sent-packs.mjs <lang|all> [--max N]   (all = vi + scripts/i18n-langs.txt)
import fs from 'fs';
import { fileURLToPath } from 'url';
const R = new URL('../', import.meta.url);
const LANGS = ['vi'].concat(fs.readFileSync(new URL('scripts/i18n-langs.txt', R), 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#')));
const arg = process.argv[2] || 'all', mi = process.argv.indexOf('--max'), MAX = mi > 0 ? +process.argv[mi + 1] || 1e9 : 1e9;
const sleep = ms => new Promise(r => setTimeout(r, ms));
export const shardOf = w => { const c = String(w || '').trim().toLowerCase()[0] || '_'; return c >= 'a' && c <= 'z' ? c : '_'; };

export function sentences() {
  globalThis.t = globalThis.t || (s => s);
  const g = {};
  new Function('self', fs.readFileSync(new URL('web/js/data.js', R), 'utf8'))(g);
  for (const f of fs.readdirSync(new URL('web/js/lib/', R)).sort()) if (/\.js$/.test(f) && !/^notes/.test(f)) { try { new Function('self', fs.readFileSync(new URL('web/js/lib/' + f, R), 'utf8'))(g); } catch (e) { /* tệp không phải kho từ */ } }
  const out = new Map();
  for (const tp of g.IELTS_DATA.TOPICS) for (const w of tp.words || []) {
    const k = String(w.word || '').toLowerCase().trim();
    if (k && w.ex && !out.has(k)) out.set(k, { word: k, ex: String(w.ex).trim(), w });
  }
  return out;
}

const tl = l => (l === 'zh' ? 'zh-CN' : l);
let warned = 0;
async function tr(lang, list) {
  const q = encodeURIComponent(list.join('\n')); // GET như gen-word-packs (gtx không nhận POST); lô giới hạn theo độ dài URL ở run()
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${tl(lang)}&dt=t&q=${q}`);
      if (r.ok) { const j = await r.json(); const o = j[0].map(x => x[0]).join('').split('\n').map(s => s.trim()); return o.length === list.length ? o : null; }
      if (warned++ < 5) console.warn(lang, 'HTTP', r.status, 'lô', list.length, 'câu, URL', q.length);
      if (r.status === 429) await sleep(30000);
      else if (r.status === 400 || r.status === 413 || r.status === 414) return null; // lô quá dài → tách từng câu
    } catch (e) { if (warned++ < 5) console.warn(lang, 'lỗi mạng', e.message); }
    await sleep(3000 * (i + 1));
  }
  return undefined; // mạng/giới hạn
}

async function run(lang) {
  const S = sentences(), dir = new URL(`web/packs/sent/${lang}/`, R); fs.mkdirSync(dir, { recursive: true });
  const shards = {};
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.json')) shards[f.slice(0, -5)] = JSON.parse(fs.readFileSync(new URL(f, dir), 'utf8'));
  for (const sh of Object.values(shards)) for (const k of Object.keys(sh)) if (!S.has(k)) delete sh[k]; // từ đã bỏ khỏi app
  const miss = [...S.values()].filter(x => { const v = (shards[shardOf(x.word)] || {})[x.word]; return !v || v[0] !== x.ex || !v[1]; }).slice(0, MAX);
  console.log(lang, S.size, 'câu, cần dịch', miss.length);
  const put = (x, s) => { (shards[shardOf(x.word)] ||= {})[x.word] = [x.ex, s]; };
  let stop = false;
  for (let i = 0; i < miss.length && !stop;) {
    const b = []; let len = 0; // lô ≤ ~6000 ký tự đã mã hóa (URL GET an toàn), ≤ 40 câu
    while (i < miss.length && b.length < 40) { const n = encodeURIComponent(miss[i].ex).length + 3; if (b.length && len + n > 6000) break; b.push(miss[i++]); len += n; }
    const o = await tr(lang, b.map(x => x.ex));
    if (o === undefined) { stop = true; break; }
    if (o) b.forEach((x, n) => o[n] && put(x, o[n]));
    else for (const x of b) { const one = await tr(lang, [x.ex]); if (one === undefined) { stop = true; break; } if (one && one[0]) put(x, one[0]); await sleep(400); } // lô lệch dòng → dịch từng câu
    await sleep(1200);
  }
  for (const [k, sh] of Object.entries(shards)) fs.writeFileSync(new URL(k + '.json', dir), JSON.stringify(Object.fromEntries(Object.entries(sh).sort())));
  const have = Object.values(shards).reduce((a, s) => a + Object.keys(s).length, 0);
  console.log(lang, 'có', have, '/', S.size, stop ? '(dừng: mạng/giới hạn – chạy lại để tiếp)' : '');
}

if (fileURLToPath(import.meta.url) === process.argv[1]) for (const l of arg === 'all' ? LANGS : [arg]) await run(l);
