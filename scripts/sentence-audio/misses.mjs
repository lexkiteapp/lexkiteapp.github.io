// Câu tiếng Anh hay rơi về giọng máy → dựng sẵn file Kokoro (docs/specs/kokoro-on-device.md §Số đo, chủ 22/11: 28 % giọng máy).
// Client chỉ gửi KHÓA băm KVoice.lineKey(giọng, câu) (web/js/ui.js → LKAudio.miss → /api/hit 'vm:<khóa>'), không văn bản.
// Ở đây: lấy khóa hay rơi nhất (/api/vmiss, ký HMAC) → băm mọi chuỗi tiếng Anh trong nội dung tĩnh của repo theo mọi giọng Kokoro →
// khóa khớp = câu có trong nội dung → thêm vào web/audio/l/misses.tsv (cộng dồn, nhiều lượt nhất trước) → corpus.mjs nhóm 'misses' → audio.yml render
// (qua cổng ASR câu như mọi câu khác). Khóa không khớp = chữ động (câu người học tự viết, AI) – không bao giờ có văn bản để dựng, chỉ in tỉ lệ.
//   node scripts/sentence-audio/misses.mjs [--from-api-to f.json] → gọi /api/vmiss (LEXKITE_DRIVE_CLI_KEY), cập nhật misses.tsv (lưu số liệu vào f.json)
//   node scripts/sentence-audio/misses.mjs --from top.json → khóa từ tệp { keys: [[khóa, lần]], routes } (test / chạy tay)
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
import { readIndex } from './lib.mjs';
export const OUT = 'web/audio/l/misses.tsv', ROOTS = ['web/js', 'web/cpack', 'web/data', 'content'], CAP = 4000; // CAP: trần câu mới mỗi lượt (≈ 20 shard × 200)
const c = { self: {} }; c.self = c; vm.createContext(c); vm.runInContext(fs.readFileSync('web/js/listen/kvoice.js', 'utf8'), c);
const K = c.KVoice;
// Mọi giọng Kokoro app có thể đọc qua UI.tts: giọng chung theo accent, giọng nhân vật, người dẫn + bể giọng người nói (kvoice.js POOL)
export const VOICES = 'bf_emma af_heart am_michael bm_george bf_isabella bf_alice bf_lily bm_lewis bm_daniel bm_fable af_bella af_nicole af_sarah am_adam am_eric am_liam'.split(' ');
// Chuỗi tiếng Anh (chữ Latinh không dấu, có ≥ 2 chữ cái liền) – bỏ chuỗi tiếng Việt/ngôn ngữ khác, mã, đường dẫn
const EN = s => s.length >= 2 && s.length <= 1200 && /[A-Za-z]{2}/.test(s) && !/[^\x20-\x7E\u2018\u2019\u201C\u201D\u2013\u2014\u2026]/.test(s) && !/^[\w./-]+\.(js|json|css|png|svg|mp3|webp|html)$|^https?:|[{}<>]=|=>|\bfunction\b/.test(s);
// Biến thể như lúc app đọc: nguyên chuỗi, bỏ thẻ HTML/đánh dấu, rồi tách câu giống hệt UI.tts (KVoice.split)
export function variants(s) {
  const out = new Set(), add = x => { x = String(x).replace(/\s+/g, ' ').trim(); if (x) out.add(x); };
  for (const v of [s, s.replace(/<[^>]+>/g, ''), s.replace(/[*_~^]+/g, '')]) { add(v); for (const p of K.split(v)) add(p); }
  return out;
}
function* strings(file) {
  const t = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.json')) { try { const st = [JSON.parse(t)]; while (st.length) { const v = st.pop(); if (typeof v === 'string') yield v; else if (v && typeof v === 'object') st.push(...Object.values(v), ...(Array.isArray(v) ? [] : Object.keys(v))); } return; } catch (e) { /* rơi xuống regex */ } }
  for (const m of t.matchAll(/'((?:[^'\\\n]|\\.){2,1200})'|"((?:[^"\\\n]|\\.){2,1200})"|`([^`$\\]{2,1200})`/g)) yield (m[1] || m[2] || m[3] || '').replace(/\\(['"\\])/g, '$1').replace(/\\n/g, ' ');
}
const walk = d => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => { const p = path.join(d, e.name); return e.isDirectory() ? (/^(node_modules|vendor|i18n|\.)/.test(e.name) ? [] : walk(p)) : /\.(js|json)$/.test(e.name) ? [p] : []; }) : []);
// Khóa muốn tìm → { voice, text } (mỗi khóa lấy chuỗi khớp đầu tiên)
export function match(want, roots = ROOTS) {
  const found = new Map(), seen = new Set(); // câu trùng giữa các tệp chỉ băm 1 lần
  for (const f of roots.flatMap(walk)) for (const s of strings(f)) if (EN(s)) for (const v of variants(s)) if (!seen.has(v) && seen.add(v)) for (const voice of VOICES) { const k = K.lineKey(voice, v); if (want.has(k) && !found.has(k)) found.set(k, { voice, text: v }); }
  return found;
}
export const readTsv = (f = OUT) => new Map((fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '').split('\n').filter(l => l && !l.startsWith('#')).map(l => { const [k, voice, text, n] = l.split('\t'); return [k, { voice, text, n: +n || 0 }]; }));
export function writeTsv(rows, f = OUT) {
  const body = [...rows].sort((a, b) => b[1].n - a[1].n || (a[0] < b[0] ? -1 : 1)).map(([k, r]) => [k, r.voice, r.text.replace(/[\t\n]/g, ' '), r.n].join('\t'));
  fs.writeFileSync(f, '# khóa\tgiọng\tcâu\tlượt rơi giọng máy (14 ngày gần nhất; câu đã thêm giữ mãi) – scripts/sentence-audio/misses.mjs, đọc bởi corpus.mjs (nhóm misses)\n' + body.join('\n') + (body.length ? '\n' : ''));
}
// Gộp: câu đã biết cập nhật số lượt 14 ngày; câu mới (khớp nội dung, chưa có file) tối đa CAP, nhiều lượt nhất trước
export function merge(prev, top, found, have) {
  const rows = new Map(prev); let added = 0, hitAll = 0, hitMatched = 0;
  for (const [k, n] of top) {
    hitAll += n; const r = rows.get(k) || found.get(k); if (!r) continue; hitMatched += n;
    if (rows.has(k)) rows.set(k, { ...rows.get(k), n }); else if (!have.has(k) && added < CAP && K.lineKey(r.voice, r.text) === k) { rows.set(k, { voice: r.voice, text: r.text, n }); added++; }
  }
  return { rows, added, hitAll, hitMatched };
}
async function fetchTop() {
  const { driveSign, driveCliKey } = await import('../video/library.mjs');
  const key = driveCliKey(); if (!key) throw new Error('thiếu LEXKITE_DRIVE_CLI_KEY');
  const text = JSON.stringify({ op: 'top', days: 14 }), base = String(process.env.LEXKITE_API_BASE || 'https://lexkite.com').replace(/\/+$/, '');
  const r = await fetch(base + '/api/vmiss', { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'lexkite-bot voice-misses', ...driveSign(key, text) }, body: text });
  if (!r.ok) throw new Error('/api/vmiss → ' + r.status); return r.json();
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const A = process.argv, arg = k => (A.includes(k) ? A[A.indexOf(k) + 1] : ''), from = arg('--from'), save = arg('--from-api-to');
  const j = from ? JSON.parse(fs.readFileSync(from, 'utf8')) : await fetchTop(), top = (j.keys || []).filter(([k, n]) => /^[0-9a-z]{1,8}$/.test(k) && n > 0);
  if (save) fs.writeFileSync(save, JSON.stringify(j)); // commit-regen chạy lại trên main mới nhất từ đúng số liệu này (không gọi API lần 2)
  const prev = readTsv(), { have } = readIndex(), want = new Set(top.map(([k]) => k).filter(k => !prev.has(k)));
  const t0 = Date.now(), found = match(want), res = merge(prev, top, found, have);
  writeTsv(res.rows);
  const pct = (a, b) => (b ? Math.round(100 * a / b) : 0) + ' %';
  const msg = `${top.length} khóa rơi giọng máy (từ ${j.since || '?'}) · khớp nội dung ${pct(res.hitMatched, res.hitAll)} lượt · thêm ${res.added} câu mới · tổng ${res.rows.size} câu trong ${OUT} · ${Math.round((Date.now() - t0) / 1000)} s\n` +
    `trang: ${Object.entries(j.routes || {}).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([r, n]) => `${r} ${n}`).join(' · ')}`;
  console.log(msg);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Câu rơi giọng máy\n${msg.replace('\n', '\n\n')}\n`);
}
