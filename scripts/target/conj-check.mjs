// Kiểm chéo bộ chia động từ (conjugate.mjs) với bảng chia Wiktionary (kaikki.org) – spanish-course.md §5 "khớp 100 %, ngoại lệ ghi tay có lý do".
// Chạy trên CI (target-content.yml, job check es): mọi động từ trong bộ từ es (seed + core-*) ∪ KNOWN của conjugate.mjs, 5 ngôi es-419 × 11 thì
// + danh động từ + phân từ. Dạng của mình phải nằm trong các dạng Wiktionary cùng nhãn (Wiktionary có thể ghi nhiều biến thể). Ô Wiktionary
// không có dữ liệu → bỏ qua (đếm riêng). Lỗi mạng → thoát 3. Không ghi dữ liệu Wiktionary vào repo.
// Chạy: node scripts/target/conj-check.mjs [--tl es] [động từ …]
import fs from 'node:fs';
import { readJSON, coreFiles, seedPath, kaikki } from './lib.mjs';
import { TL_GEN } from './tl-gen.mjs';
import { conjugate, KNOWN, PERSONS } from './conjugate.mjs';

const TL = 'es', G = TL_GEN[TL];
// Ngoại lệ ghi tay (động từ:ô → lý do). Chỉ thêm khi Wiktionary sai/thiếu hoặc chuẩn es-419 khác – KHÔNG để che lỗi bộ chia.
export const EXCEPT = {};
const P = [['first-person', 'singular'], ['second-person', 'singular'], ['third-person', 'singular'], ['first-person', 'plural'], ['third-person', 'plural']];
const ROWS = { pres: ['indicative', 'present'], pret: ['indicative', 'preterite'], impf: ['indicative', 'imperfect'], fut: ['indicative', 'future'], cond: ['conditional'], subj: ['subjunctive', 'present'], subjImpf: ['subjunctive', 'imperfect'], subjFut: ['subjunctive', 'future'] };
const IMPS = { tu: ['second-person', 'singular'], usted: ['formal', 'singular'], nos: ['first-person', 'plural'], ustedes: ['formal', 'plural'] };
const NEVER = ['vos-form', 'combined-form', 'imperfect-se', 'table-tags', 'inflection-template', 'class'];
const slots = c => {
  const out = [];
  for (const [k, t] of Object.entries(ROWS)) c[k].forEach((f, i) => out.push([`${k}.${PERSONS[i]}`, f, [...t, ...P[i]], k === 'pres' || k === 'subj' ? ['imperative'] : []]));
  for (const [x, t] of Object.entries(IMPS)) { out.push([`imp.${x}`, c.imp[x], ['imperative', ...t], ['negative']]); out.push([`impNeg.${x}`, c.impNeg[x], ['imperative', 'negative', ...t], []]); }
  out.push(['ger', c.ger, ['gerund'], []], ['part', c.part, ['participle'], ['feminine', 'plural']]);
  return out;
};
const deckVerbs = () => [seedPath(TL), ...coreFiles(TL)].flatMap(f => readJSON(f).words.filter(w => w.pos === 'v').map(w => w.word.replace(/(?<=[aeií]r)se$/, '')));
const verbs = process.argv.slice(2).filter(a => !a.startsWith('--')).length ? process.argv.slice(2).filter(a => !a.startsWith('--')) : [...new Set([...deckVerbs(), ...KNOWN])].sort();

let ok = 0, miss = 0, nodata = 0; const bad = [], noPage = [];
async function check(v) {
  const forms = (await kaikki(G.kaikki, v)).filter(e => e.pos === 'verb').flatMap(e => e.forms || []);
  if (!forms.length) { noPage.push(v); return; }
  for (const [slot, mine, req, ex] of slots(conjugate(v))) {
    const cand = new Set(forms.filter(f => { const t = f.tags || []; return req.every(x => t.includes(x)) && ![...NEVER, ...ex].some(x => t.includes(x)) && f.form !== '-'; }).map(f => f.form));
    if (!cand.size) { nodata++; continue; }
    if (cand.has(mine)) { ok++; continue; }
    if (EXCEPT[`${v}:${slot}`]) { ok++; continue; }
    miss++; bad.push(`${v} ${slot}: ${mine} ↔ ${[...cand].join('/')}`);
  }
}
for (let i = 0; i < verbs.length; i += 4) await Promise.all(verbs.slice(i, i + 4).map(check)); // 4 yêu cầu song song – nhẹ cho kaikki.org
const txt = [`## Chia động từ ↔ Wiktionary: ${verbs.length} động từ, khớp ${ok}/${ok + miss} ô (${nodata} ô Wiktionary trống), lệch ${miss}${noPage.length ? `, không có trang: ${noPage.join(' ')}` : ''}`,
  ...(bad.length ? ['động từ lệch: ' + [...new Set(bad.map(x => x.split(' ')[0]))].join(' ')] : []), ...bad.slice(0, 80).map(x => '- ✗ ' + x)].join('\n');
console.log(txt); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, txt + '\n');
process.exit(miss || noPage.length ? 1 : 0);
