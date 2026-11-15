// Độ phủ giọng Kokoro dựng sẵn cho MỌI nhóm nội dung tĩnh mà app đọc to (một giọng thống nhất – docs/WORD-AUDIO.md mục "Độ phủ").
// Nhóm câu: scripts/sentence-audio/corpus.mjs (khóa = KVoice.lineKey(giọng, câu) đúng như UI.tts tra) ∩ web/js/listen/audio-index.js.
// Nhóm từ: kho từ của scripts/word-audio/lib.mjs, mỗi giọng; có giọng nếu s3.tsv "ok" (audio/w) HOẶC có khóa câu cùng giọng (UI.speak → UI.tts).
// Thiếu = app rơi về speechSynthesis của máy (mỗi máy một giọng) → mục tiêu 0.
//   node scripts/audio/coverage.mjs            → in bảng, ghi GITHUB_STEP_SUMMARY nếu có
//   node scripts/audio/coverage.mjs --ratchet  → nâng sàn web/audio/coverage.json (chỉ lên, không xuống) – audio.yml sau mỗi lượt render
//   node scripts/audio/coverage.mjs --check    → thoát 1 nếu nhóm nào tụt dưới sàn (scripts/test/audio-coverage.mjs, npm test)
import fs from 'node:fs'; import { pathToFileURL } from 'node:url';
import { collect } from '../sentence-audio/corpus.mjs'; import { readIndex } from '../sentence-audio/lib.mjs';
import { corpus as wordCorpus, readRes, VOICES } from '../word-audio/lib.mjs';
export const FLOOR = 'web/audio/coverage.json';
// Câu mới chưa kịp render (nội dung vừa thêm trong PR; audio.yml render đêm sau khi gộp) – mỗi nhóm cho phép thêm tối đa GRACE câu thiếu
// so với sàn. Không phải nới: sàn thiếu chỉ giảm theo ratchet; đổi giọng/khóa làm hàng loạt câu mất file vẫn đỏ ngay.
export const GRACE = 25;
export async function measure() {
  const { jobs, groups } = collect(), { have } = readIndex(), res = readRes(), out = {};
  for (const [g, keys] of groups) { const n = keys.size, h = [...keys].filter(k => have.has(k)).length; out[g] = { total: n, have: h }; }
  // Từ mở rộng (x: 1) cũng đi kèm app (Lex) → luôn đo cả kho; WORD_AUDIO_EXPAND chỉ quyết nơi render, không quyết độ phủ
  const ex0 = process.env.WORD_AUDIO_EXPAND; process.env.WORD_AUDIO_EXPAND = '1';
  const words = await wordCorpus().finally(() => { if (ex0 == null) delete process.env.WORD_AUDIO_EXPAND; else process.env.WORD_AUDIO_EXPAND = ex0; }), { KVoice } = (() => { const c = { self: {} }; c.self = c; new Function('self', fs.readFileSync('web/js/listen/kvoice.js', 'utf8'))(c); return c; })();
  VOICES.forEach((v, i) => {
    const h = words.filter(w => (res.get(w) || [])[i] === 'ok' || have.has(KVoice.lineKey(v, w))).length;
    out[`words-${v === 'af_heart' ? 'us' : 'uk'}`] = { total: words.length, have: h };
  });
  for (const x of Object.values(out)) { x.missing = x.total - x.have; x.pct = x.total ? +(100 * x.have / x.total).toFixed(2) : 100; }
  return out;
}
// Từ (chưa) có giọng Kokoro của MỌI giọng (thuần theo dữ liệu repo) – cổng xuất lô lexicon-expand dùng: lô mới nhiều từ chưa có giọng làm npm test đỏ (06/11: 54 từ > GRACE ${GRACE})
export function wordsWithoutAudio(words) {
  const { have } = readIndex(), res = readRes(), { KVoice } = (() => { const c = { self: {} }; c.self = c; new Function('self', fs.readFileSync('web/js/listen/kvoice.js', 'utf8'))(c); return c; })();
  return words.filter(w => VOICES.some((v, i) => !((res.get(w) || [])[i] === 'ok' || have.has(KVoice.lineKey(v, w)))));
}
const table = m => ['| Nhóm | Có file | Tổng | % | Thiếu (giọng máy) |', '|---|---:|---:|---:|---:|',
  ...Object.entries(m).sort().map(([g, x]) => `| ${g} | ${x.have} | ${x.total} | ${x.pct} | ${x.missing} |`),
  `| **Tổng** | ${sum(m, 'have')} | ${sum(m, 'total')} | ${(100 * sum(m, 'have') / Math.max(1, sum(m, 'total'))).toFixed(2)} | **${sum(m, 'missing')}** |`].join('\n');
const sum = (m, k) => Object.values(m).reduce((a, x) => a + x[k], 0);
export const readFloor = () => (fs.existsSync(FLOOR) ? JSON.parse(fs.readFileSync(FLOOR, 'utf8')) : { groups: {} });
// Sàn mỗi nhóm: pct (chỉ lên) + missing (chỉ xuống). Trượt khi pct < sàn VÀ thiếu > sàn thiếu + GRACE.
export function verdict(m, floor) {
  const bad = [];
  for (const [g, f] of Object.entries(floor.groups || {})) {
    const x = m[g];
    if (!x) { bad.push(`${g}: nhóm biến mất khỏi đo độ phủ (đổi tên → sửa ${FLOOR} cùng PR)`); continue; }
    if (x.pct < f.pct && x.missing > f.missing + GRACE) bad.push(`${g}: ${x.pct}% < sàn ${f.pct}% (thiếu ${x.missing} > ${f.missing} + ${GRACE})`);
  }
  for (const g of Object.keys(m)) if (!(floor.groups || {})[g]) bad.push(`${g}: nhóm mới chưa có sàn – chạy node scripts/audio/coverage.mjs --ratchet`);
  return bad;
}
export function ratchet(m, floor) {
  const groups = {};
  for (const [g, x] of Object.entries(m)) { const f = (floor.groups || {})[g]; groups[g] = f ? { pct: Math.max(f.pct, x.pct), missing: Math.min(f.missing, x.missing) } : { pct: x.pct, missing: x.missing }; }
  return { note: 'Sàn độ phủ giọng Kokoro – chỉ lên (scripts/audio/coverage.mjs --ratchet, audio.yml). KHÔNG sửa tay để hạ.', groups };
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const m = await measure(), A = process.argv, floor = readFloor(), md = `## Độ phủ giọng Kokoro dựng sẵn\n${table(m)}`;
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  if (A.includes('--ratchet')) { fs.writeFileSync(FLOOR, JSON.stringify(ratchet(m, floor), null, 1) + '\n'); console.log(`✓ sàn → ${FLOOR}`); }
  if (A.includes('--check')) { const bad = verdict(m, floor); if (bad.length) { console.error('✗ độ phủ giọng Kokoro tụt:\n  ' + bad.join('\n  ')); process.exit(1); } console.log('✓ độ phủ không tụt dưới sàn'); }
}
