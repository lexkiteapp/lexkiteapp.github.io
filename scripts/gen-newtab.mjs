// Dữ liệu thẻ từ ở tab mới của add-on: extension/nt/<chữ cái>.json = { "word": { … } } – CHỈ dữ liệu thật đã có trong kho Lexkite.
// Nguồn: web/js/data.js + web/js/lib/*.js (từ, IPA, loại từ, CEFR, nghĩa vi, định nghĩa en, ví dụ, collocation, đồng nghĩa),
// ghi chú tự soạn WORD_NOTES (họ từ "f", trái nghĩa "Trái nghĩa: …"), danh sách file giọng Kokoro (web/js/listen/audio-index.js).
// Nhãn kỳ thi suy ra từ danh sách chứa từ (AWL/NAWL/NGSL/TSL-BSL/đề IELTS-TOEIC-TOEFL). Chạy trong build-extension.sh.
// Khóa: i ipa Anh · u ipa Mỹ · l CEFR · x nhãn thi · s nghĩa [[loại từ, vi, en]] (≤ 3) · e ví dụ · c collocation · y đồng nghĩa · a trái nghĩa · f họ từ · k có mp3 giọng Anh
import fs from 'fs';
import { loadBrowserIndex } from './lexicon/shards.mjs';
const R = new URL('../', import.meta.url), rd = p => fs.readFileSync(new URL(p, R), 'utf8');
globalThis.t = s => s;
const g = {};
new Function('self', rd('web/js/data.js'))(g);
for (const f of fs.readdirSync(new URL('web/js/lib/', R))) if (/\.js$/.test(f) && f !== 'qr.js') { try { new Function('self', 'window', rd('web/js/lib/' + f))(g, g); } catch (e) { /* bỏ qua */ } }
const kv = {};
new Function('self', 'window', rd('web/js/listen/kvoice.js'))(kv, kv);
new Function('self', 'window', rd('web/js/listen/audio-index.js'))(kv, kv);
const WAUD = new Set((() => { try { return rd('web/audio/w/index.txt'); } catch (e) { return ''; } })().split('\n').filter(Boolean)); // từ có file giọng Anh + Mỹ (gen-word-audio.mjs)
// Ghi chú tự soạn: nay ở web/js/notes/<chữ>.json (build-notes.mjs) – trước là WORD_NOTES trong lib/notes-*.js (thiếu → mất họ từ/trái nghĩa ở tab mới)
const NOTES = Object.assign({}, g.WORD_NOTES || {}, ...fs.readdirSync(new URL('web/js/notes/', R)).filter(f => /\.json$/.test(f)).map(f => JSON.parse(rd('web/js/notes/' + f))));
const N = NOTES, VI = /[ạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹđơưăâêôà-ỹ]/i;
const tagOf = tp => {
  const id = tp.id, gr = tp.group;
  if (/^ex-ielts/.test(id) || ((gr === 'topics' && !/^us-/.test(id)) || gr === 'writing' || gr === 'speaking')) return 'IELTS';
  if (/^ex-toeic/.test(id) || gr === 'toeic' || gr === 'bsl' || gr === 'office') return 'TOEIC';
  if (/^ex-toefl/.test(id)) return 'TOEFL';
  return { awl: 'AWL', nawl: 'NAWL', core: 'NGSL' }[gr] || '';
};
const ORDER = ['IELTS', 'TOEIC', 'TOEFL', 'AWL', 'NAWL', 'NGSL'], RANK = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
const EN_WORD = /^[A-Za-z][A-Za-z' -]{0,30}$/;
const uniq = (a, n) => [...new Set(a.map(s => String(s || '').trim()).filter(s => s && !VI.test(s)))].slice(0, n);
const STOP = new Set('a an the to of or and in on for with that which who you your your something someone somebody be is are was it its by as at from this'.split(' '));
const toks = s => new Set(String(s).toLowerCase().match(/[a-z]+/g)?.filter(x => !STOP.has(x)) || []);
const sim = (a, b) => { const A = toks(a), B = toks(b); let n = 0; for (const x of A) if (B.has(x)) n++; return n / Math.max(1, Math.min(A.size, B.size)); };
const out = {};
for (const tp of g.IELTS_DATA.TOPICS) for (const w of tp.words) {
  const word = String(w.word || '').trim(), k = word.toLowerCase();
  if (!word || word.length > 40) continue;
  const o = out[k] = out[k] || { w: word, i: '', u: '', l: '', x: [], s: [], e: '', c: [], y: [] };
  if (!o.i && w.ipa) o.i = w.ipa;
  if (!o.u && w.ipaUS) o.u = w.ipaUS;
  if (w.level && (!o.l || RANK[w.level] < RANK[o.l])) o.l = w.level; // cấp thấp nhất = nghĩa thông dụng nhất
  const tg = tagOf(tp); if (tg && !o.x.includes(tg)) o.x.push(tg);
  if (w.def && o.s.length < 6 && !o.s.some(s => s[0] === w.pos && (s[1] === w.vi || sim(s[2], w.def) >= 0.3))) o.s.push([w.pos || '', w.vi || '', w.def]); // nghĩa gần trùng (cùng loại từ) chỉ giữ 1
  if (!o.e && w.ex) o.e = w.ex;
  o.c.push(...(w.col || [])); o.y.push(...(w.syn || []));
}
// Trường chính (IPA Anh/Mỹ, CEFR, nghĩa đầu) = ĐÚNG mục chính của từ trong IELTS_DATA.INDEX (như trang tra từ, thẻ, quiz, add-on) – không lấy theo thứ tự file
const { INDEX } = loadBrowserIndex();
for (const [k, o] of Object.entries(out)) {
  const m = INDEX[k]; if (!m) continue;
  o.i = m.ipa || o.i; o.u = m.ipa ? m.ipaUS || '' : o.u; o.l = m.level || o.l;
  const j = o.s.findIndex(s => s[0] === (m.pos || '') && s[1] === (m.vi || ''));
  if (j > 0) o.s.unshift(o.s.splice(j, 1)[0]); else if (j < 0 && m.def) o.s.unshift([m.pos || '', m.vi || '', m.def]);
}
let fam = 0, ant = 0, aud = 0;
for (const [k, o] of Object.entries(out)) {
  { const ph = s => String(s[1] || "").toLowerCase().split(/[;,]/).map(x => x.trim().replace(/^(sự|việc|cái|người) /, "")).filter(Boolean); // bỏ nghĩa mà mọi cụm nghĩa vi đã có ở nghĩa khác (vd. "khuyến mãi; thăng chức")
    for (let i = o.s.length - 1; i > 0; i--) { const mine = ph(o.s[i]), rest = o.s.filter((_, j) => j !== i).flatMap(ph); if (mine.length && mine.every(p => rest.some(r => r.includes(p)))) o.s.splice(i, 1); }
    o.s = o.s.slice(0, 3); }
  o.x.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  o.c = uniq(o.c, 4); o.y = uniq(o.y, 4).filter(s => s.toLowerCase() !== k);
  const n = Object.hasOwn(N, k) ? N[k] : null, a = [], f = [];
  if (n) {
    for (const m of String(n.f || '').matchAll(/([A-Za-z][A-Za-z' -]*?)\s*\(([^)]*)\)/g)) {
      const x = m[1].trim(), tags = m[2];
      if (!EN_WORD.test(x) || x.toLowerCase() === k) continue;
      if (/trái nghĩa/i.test(tags)) a.push(x);
      else f.push(x + (/^[a-z ,.]+$/i.test(tags) ? ` (${tags.trim()})` : ''));
    }
    for (const fld of ['m', 'e', 'u', 'f']) for (const m of String(n[fld] || '').matchAll(/Trái nghĩa:\s*([^.;()\n]+)/g)) for (const x of m[1].split(/\s*[/,]\s*/)) if (EN_WORD.test(x.trim()) && x.trim().toLowerCase() !== k) a.push(x.trim());
  }
  o.f = uniq(f, 6); o.a = uniq(a, 4).filter(x => !o.y.includes(x));
  if (WAUD.has(o.w)) { o.k = 2; aud++; } else if (kv.LISTEN_AUDIO.has(kv.KVoice.lineKey('bf_emma', o.w))) { o.k = 1; aud++; }
  if (o.f.length) fam++; if (o.a.length) ant++;
  for (const key of Object.keys(o)) if (o[key] === '' || (Array.isArray(o[key]) && !o[key].length)) delete o[key];
}
const dir = new URL('extension/nt/', R);
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const sh = {};
for (const [k, o] of Object.entries(out)) { const c = /^[a-z]/.test(k) ? k[0] : '_'; (sh[c] = sh[c] || {})[k] = o; }
let bytes = 0;
for (const [c, m] of Object.entries(sh)) { const s = JSON.stringify(m); bytes += s.length; fs.writeFileSync(new URL(c + '.json', dir), s); }
console.log(`✓ nt/: ${Object.keys(out).length} từ · ${Object.keys(sh).length} tệp · ${(bytes / 1024).toFixed(0)} KB · họ từ ${fam} · trái nghĩa ${ant} · mp3 giọng Anh ${aud}`);
