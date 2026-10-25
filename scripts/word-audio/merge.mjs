// Gộp kết quả nghe lại của các shard (word-audio.yml) → web/audio/w/s3.tsv + web/audio/w/index.txt, in thống kê trước/sau.
//   node scripts/word-audio/merge.mjs <res1.json> [res2.json …]
// s3.tsv: "từ\tbf_emma\taf_heart" – "ok" hoặc lý do trượt (giọng đó → giọng máy của thiết bị). Chỉ ghi từ đã có kết quả CUỐI cho cả 2 giọng.
// index.txt (cờ "có file" cho Lex/newtab): từ có ≥ 1 giọng đạt, theo thứ tự kho từ.
import fs from 'node:fs';
import { corpus, readRes, writeRes, IDX, VOICES } from './lib.mjs';
const res = Object.assign({}, ...process.argv.slice(2).filter(f => fs.existsSync(f)).map(f => JSON.parse(fs.readFileSync(f, 'utf8'))));
const st = readRes(), words = await corpus(), before = st.size; let add = 0, both = 0, part = 0, none = 0, oldN = 0, oldOk = 0, newOk = 0, newN = 0;
const clean = s => String(s).replace(/[\t\n]+/g, ' ').slice(0, 300);
for (const w of new Set(Object.keys(res).filter(k => !k.startsWith('old\t')).map(k => k.split('\t')[0]))) {
  const s = VOICES.map(v => res[w + '\t' + v]);
  if (s.some(x => x === undefined || String(x).startsWith('pending'))) continue; // chưa xong (hết giờ) → lượt sau làm lại
  st.set(w, s.map(clean)); add++;
  const k = s.filter(x => x === 'ok').length; k === 2 ? both++ : k ? part++ : none++; newOk += k; newN += 2;
}
for (const [k, v] of Object.entries(res)) if (k.startsWith('old\t')) { oldN++; oldOk += v === 'ok'; }
const SF = 'web/audio/w/s3-stats.json', S = fs.existsSync(SF) ? JSON.parse(fs.readFileSync(SF, 'utf8')) : { oldN: 0, oldOk: 0, fileN: 0, fileOk: 0 };
Object.assign(S, { oldN: S.oldN + oldN, oldOk: S.oldOk + oldOk, fileN: S.fileN + newN, fileOk: S.fileOk + newOk }); fs.writeFileSync(SF, JSON.stringify(S) + '\n');
const order = new Map(words.map((w, i) => [w, i]));
writeRes(new Map([...st].filter(([w]) => order.has(w)).sort((a, b) => order.get(a[0]) - order.get(b[0]))));
const idx = words.filter(w => st.has(w) && st.get(w).includes('ok'));
fs.writeFileSync(IDX, idx.join('\n') + '\n');
const fb = [...st].filter(([, s]) => s.some(x => x !== 'ok'));
const md = `## Giọng từ đơn s3: +${add} từ (${before} → ${st.size}/${words.length})
- Lượt này: ${both} từ đạt cả 2 giọng · ${part} đạt 1 giọng · ${none} không đạt (giọng máy) · file đạt ${newOk}/${newN}${newN ? ` (${(100 * newOk / newN).toFixed(1)}%)` : ''}
- File cũ (trước s3) nghe lại: ${oldOk}/${oldN} đạt${oldN ? ` (${(100 * oldOk / oldN).toFixed(1)}%)` : ''}
- Cộng dồn: file cũ ${S.oldOk}/${S.oldN} đạt · file s3 ${S.fileOk}/${S.fileN} đạt
- index.txt: ${idx.length} từ có file · danh sách dùng giọng máy (web/audio/w/s3.tsv, có lý do): ${fb.length} từ
${fb.slice(-25).map(([w, s]) => `  - ${w}: ${s.map((x, i) => x === 'ok' ? '' : VOICES[i] + ' ' + x.slice(0, 120)).filter(Boolean).join(' | ')}`).join('\n')}`;
console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
