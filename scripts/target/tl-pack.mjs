// Gói từ vựng ngôn ngữ đích cho app – ngoài cpack (japanese-course.md §4 W1b: "dữ liệu ra web/packs/CDN, không phình cpack"): web/packs/tl/<tl>/<L>.json,
// MỘT tệp cho mỗi ngôn ngữ nghĩa L (người học chỉ tải nghĩa của mình), app fetch /packs/tl/<tl>/<L>.json khi mở khóa (như web/packs/<lang>.json – app.js loadPack).
// Nguồn: seed.json soát tay + các lô core-NN.json ĐÃ DUYỆT (status "reviewed"; lô pending-review không ra app). Trường theo bảng: chỉ ghi cột có trong dữ liệu.
// Dùng: node scripts/target/tl-pack.mjs ja   (ghi)   · --check (gói khớp nguồn, test target-lang)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, MEAN_LANGS, readJSON, seedPath, coreFiles, validate } from './lib.mjs';

export const COLS = ['word', 'kana', 'romaji', 'pitch', 'jlpt', 'pos', 'vclass', 'aclass', 'gender', 'plural', 'ipa', 'emoji', 'img', 'gl', 'ex', 'exEn', 'exForm'];
export const packDir = tl => path.join(ROOT, 'web/packs/tl', tl);
export function sources(tl) {
  const decks = [readJSON(seedPath(tl)), ...coreFiles(tl).filter(f => /core-\d+\.json$/.test(f)).map(readJSON).filter(d => d.status === 'reviewed')];
  const seen = new Set(), words = [];
  for (const d of decks) for (const w of d.words) { const k = w.word + '#' + w.pos; if (!seen.has(k)) { seen.add(k); words.push(w); } }
  return { words, err: decks.flatMap(d => validate(d)) };
}
/** { L: text } – cột dùng = cột có ít nhất một mục có giá trị (es/fr không có kana…, ja không có gender…) */
export function build(tl) {
  const { words, err } = sources(tl), row = (w, L) => ({ ...w, gl: w.gl[L], ex: w.ex[tl], exEn: w.ex.en });
  const cols = COLS.filter(c => words.some(w => row(w, 'en')[c] !== undefined));
  const out = {};
  for (const L of MEAN_LANGS) out[L] = JSON.stringify({ v: 1, tl, lang: L, n: words.length, cols, words: words.map(w => { const r = row(w, L); return cols.map(c => r[c] ?? null); }) }) + '\n';
  return { out, err, n: words.length };
}
if (import.meta.url === 'file://' + process.argv[1]) {
  const tl = process.argv.slice(2).find(a => /^[a-z]{2}$/.test(a)), check = process.argv.includes('--check');
  if (!tl) { console.error('Dùng: node scripts/target/tl-pack.mjs <tl> [--check]'); process.exit(2); }
  const { out, err, n } = build(tl), dir = packDir(tl);
  if (err.length) { console.error('✗ nguồn lỗi cổng:\n' + err.slice(0, 10).join('\n')); process.exit(1); }
  const bad = Object.entries(out).filter(([L, s]) => !fs.existsSync(path.join(dir, L + '.json')) || fs.readFileSync(path.join(dir, L + '.json'), 'utf8') !== s).map(([L]) => L);
  if (check) { if (bad.length) { console.error(`✗ web/packs/tl/${tl} lệch nguồn (${bad.join(',')}) – chạy: node scripts/target/tl-pack.mjs ${tl}`); process.exit(1); } console.log(`✓ web/packs/tl/${tl}: ${n} mục × ${MEAN_LANGS.length} ngôn ngữ khớp nguồn`); }
  else { fs.mkdirSync(dir, { recursive: true }); for (const [L, s] of Object.entries(out)) fs.writeFileSync(path.join(dir, L + '.json'), s); console.log(`✓ ${n} mục → web/packs/tl/${tl}/<${MEAN_LANGS.length} ngôn ngữ>.json (${Math.round(Object.values(out).reduce((a, s) => a + s.length, 0) / 1024)} KB tổng)`); }
}
