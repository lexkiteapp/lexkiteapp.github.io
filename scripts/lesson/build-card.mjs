// Dựng dữ liệu thẻ kết quả (docs/specs/learn-card.md).
// Nguồn: content/lesson/card/frames.json (mẫu câu viết tay), content/lesson/card/tr/<lang>.json (bản dịch câu truyện + nghĩa thành ngữ).
// Ra: web/packs/lcard/frames.json, web/packs/lcard/<lang>.json.
//   node scripts/lesson/build-card.mjs            ghi file
//   node scripts/lesson/build-card.mjs --check    kiểm + so file đã dựng (CI)
//   node scripts/lesson/build-card.mjs --report   báo % câu có mẫu / có nghĩa theo nguồn
import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
const R = fileURLToPath(new URL('../..', import.meta.url));
const SRC = path.join(R, 'content/lesson/card'), OUT = path.join(R, 'web/packs/lcard');
await import(pathToFileURL(path.join(R, 'web/js/lesson/card.js')).href);
const C = globalThis.LearnCard;
export const LANGS = ['vi'].concat(fs.readFileSync(path.join(R, 'scripts/i18n-langs.txt'), 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#')));
const NEST = /\((?:[^()\\]|\\.)*[+*](?:[^()\\]|\\.)*\)[+*]/; // lượng từ lồng nhau = dễ treo regex

export function storySentences() {
  const items = JSON.parse(fs.readFileSync(path.join(R, 'content/lesson/stories.json'), 'utf8')).items, out = new Set();
  for (const s of items) { for (const l of s.lines) out.add(l.en.trim()); for (const c of s.checks || []) if (c.type === 'q') { out.add(c.q.trim()); c.options.forEach(o => out.add(String(o).trim())); } }
  return [...out];
}
export function corpus() {
  globalThis.t = globalThis.t || (s => s);
  const g = {};
  new Function('self', fs.readFileSync(path.join(R, 'web/js/data.js'), 'utf8'))(g);
  for (const f of fs.readdirSync(path.join(R, 'web/js/lib')).sort()) if (/\.js$/.test(f) && !/^notes/.test(f)) { try { new Function('self', fs.readFileSync(path.join(R, 'web/js/lib', f), 'utf8'))(g); } catch (e) { /* tệp phụ */ } }
  const ex = new Map();
  for (const tp of g.IELTS_DATA.TOPICS) for (const w of tp.words || []) { const k = String(w.word || '').toLowerCase().trim(); if (k && w.ex && !ex.has(k)) ex.set(k, { word: k, en: String(w.ex).trim(), cefr: w.cefr || w.level || '' }); }
  return { ex: [...ex.values()], story: storySentences() };
}
function validate(frames) {
  const err = [], ids = new Set();
  if (frames.length > 300) err.push(`quá nhiều mẫu: ${frames.length} > 300`);
  for (const f of frames) {
    const at = m => err.push(`${f.id}: ${m}`);
    if (!/^[a-z0-9-]+$/.test(f.id || '')) at('id xấu'); if (ids.has(f.id)) at('trùng id'); ids.add(f.id);
    if (!/_{3}|\bidiom\b/.test(f.f) && !f.idiom) at('chữ mẫu thiếu ___');
    if (NEST.test(f.re)) at('regex lồng lượng từ');
    let r; try { r = new RegExp(f.re, 'i'); } catch (e) { at('regex lỗi'); continue; }
    if (!Array.isArray(f.alts) || f.alts.length < 2) at('cần ≥ 2 câu đổi từ');
    for (const a of f.alts || []) {
      if (!/\[.+?\]/.test(a)) at(`câu đổi không đánh dấu [..]: ${a}`);
      const s = C.altText(a);
      if (!/^["“A-Z0-9]/.test(s) || !/[.!?"”]$/.test(s)) at(`câu đổi sai dấu/viết hoa: ${s}`);
      if (!r.test(s) || !C.fits(f, s)) at(`câu đổi không khớp chính mẫu: ${s}`);
    }
    for (const s of f.test || []) if (!r.test(s) || !C.fits(f, s)) at(`ví dụ không khớp: ${s}`);
    for (const s of f.not || []) if (r.test(s) && C.fits(f, s)) at(`khớp nhầm: ${s}`);
  }
  return err;
}
const load = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const frames = load(path.join(SRC, 'frames.json')).frames;
const VI = /[ăđơưĂĐƠƯ\u1EA0-\u1EF9]/; // chữ chỉ tiếng Việt có (á, é, ê… dùng chung với es/fr/pt)

export function build() {
  const err = validate(frames), S = storySentences(), files = {};
  files['frames.json'] = JSON.stringify({ frames: frames.map(({ id, f, re, alts, idiom }) => (idiom ? { id, f, re, alts, idiom: 1 } : { id, f, re, alts })) });
  for (const L of LANGS) {
    const p = path.join(SRC, 'tr', L + '.json'); if (!fs.existsSync(p)) { err.push(`${L}: thiếu ${path.relative(R, p)}`); continue; }
    const j = load(p), s = {}, i = {};
    for (const en of S) { const v = j.s && j.s[en]; if (!v) { err.push(`${L}: thiếu bản dịch "${en}"`); continue; } if (C.norm(v) === C.norm(en) && !/^[A-Z][a-z]+[.!?]?$/.test(en)) err.push(`${L}: chưa dịch "${en}"`); if (L !== 'vi' && VI.test(v)) err.push(`${L}: lẫn tiếng Việt "${v}"`); s[C.norm(en)] = v; }
    for (const f of frames) if (f.idiom) { const v = j.i && j.i[f.id]; if (!v) err.push(`${L}: thiếu nghĩa thành ngữ ${f.id}`); else i[f.id] = v; }
    files[L + '.json'] = JSON.stringify({ s, i });
  }
  return { err, files };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--report')) {
    const { ex, story } = corpus();
    const pc = L => { let n = 0; const miss = []; for (const x of L) { if (C.match(x, frames)) n++; else miss.push(x); } return { n, all: L.length, pc: +(n * 100 / Math.max(1, L.length)).toFixed(1), miss }; };
    const a = pc(ex.map(x => x.en)), b = pc(story), lvl = {};
    console.log(`mẫu: ${frames.length} · truyện ${b.n}/${b.all} = ${b.pc}% · ví dụ từ ${a.n}/${a.all} = ${a.pc}%`);
    const argi = process.argv.indexOf('--miss'); if (argi > 0) { const k = +process.argv[argi + 1] || 60; console.log(b.miss.slice(0, k).join('\n')); for (let i = 0; i < k; i++) console.log(a.miss[Math.floor(i * a.miss.length / k)]); }
    process.exit(0);
  }
  const { err, files } = build();
  if (err.length) { console.error('✗ build-card:\n  ' + err.slice(0, 40).join('\n  ') + (err.length > 40 ? `\n  … +${err.length - 40}` : '')); process.exit(1); }
  if (process.argv.includes('--check')) {
    const stale = Object.entries(files).filter(([n, c]) => { const p = path.join(OUT, n); return !fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== c; }).map(([n]) => n);
    if (stale.length) { console.error('✗ web/packs/lcard cũ: ' + stale.join(', ') + ' – chạy node scripts/lesson/build-card.mjs'); process.exit(1); }
    console.log(`✓ build-card: ${frames.length} mẫu, ${LANGS.length} ngôn ngữ`); process.exit(0);
  }
  fs.mkdirSync(OUT, { recursive: true });
  for (const [n, c] of Object.entries(files)) fs.writeFileSync(path.join(OUT, n), c);
  console.log(`build-card: ${frames.length} mẫu, ${Object.keys(files).length} tệp`);
}
