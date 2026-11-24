// Kiểm chéo bộ chia động từ (conjugate.mjs) với bảng chia Wiktionary (kaikki.org) – spanish-course.md §5 "khớp 100 %, ngoại lệ ghi tay có lý do".
// Chạy trên CI (target-content.yml, job check es): mọi động từ trong bộ từ es (seed + core-*) ∪ KNOWN của conjugate.mjs, 5 ngôi es-419 × 11 thì
// + danh động từ + phân từ. Dạng của mình phải nằm trong các dạng Wiktionary cùng nhãn (Wiktionary có thể ghi nhiều biến thể). Ô Wiktionary
// không có dữ liệu → bỏ qua (đếm riêng). Lỗi mạng → thoát 3. Không ghi dữ liệu Wiktionary vào repo.
// Chạy: node scripts/target/conj-check.mjs [--tl es] [động từ …]
import fs from 'node:fs';
import { readJSON, coreFiles, seedPath, kaikki } from './lib.mjs';
import { TL_GEN } from './tl-gen.mjs';
import * as ES from './conjugate.mjs';
import * as FR from './conj-fr.mjs';
import * as KO from './ko-hangul.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const TL = arg('tl', 'es'), G = TL_GEN[TL];
// ko (korean-course.md W2): lớp chia + loại lấy từ bộ từ (conj, pos v|adj) ∪ KO.KNOWN; conjAll → {dạng: chữ}; nhãn kaikki trong KO.CONJ_TAGS (khớp ĐÚNG bộ nhãn)
const KOCLS = TL === 'ko' ? { ...Object.fromEntries(Object.entries(KO.KNOWN)), ...Object.fromEntries([seedPath('ko'), ...coreFiles('ko')].flatMap(f => readJSON(f).words.filter(w => w.conj && w.conj !== '이').map(w => [w.word, [w.conj, w.pos]]))) } : {};
const KOC = { conjugate: v => ({ v, f: KO.conjAll(v, ...KOCLS[v]) }), KNOWN: Object.keys(KOCLS), PERSONS: [] };
const C = { es: ES, fr: FR, ko: KOC }[TL];
if (!C) { console.error(`✗ tl "${TL}" chưa có bộ chia`); process.exit(2); }
const { conjugate, KNOWN, PERSONS } = C;
// Ngoại lệ ghi tay (động từ:ô → lý do). Chỉ thêm khi Wiktionary sai/thiếu hoặc chuẩn es-419 khác – KHÔNG để che lỗi bộ chia.
export const EXCEPT = {
  // ko: 주다 quá khứ – Wiktionary chỉ ghi dạng không rút 주었-; dạng rút 줬- cũng là chuẩn (표준어 규정 제35항: ㅜ + ㅓ → ㅝ được rút) và là dạng nói thường, bộ chia giữ dạng rút
  '주다:past': 'rút 주었 → 줬 (chuẩn)', '주다:plainPast': 'rút 주었 → 줬 (chuẩn)', '주다:pastFormal': 'rút 주었 → 줬 (chuẩn)',
};
const P = [['first-person', 'singular'], ['second-person', 'singular'], ['third-person', 'singular'], ['first-person', 'plural'], ['third-person', 'plural']];
const ROWS = { pres: ['indicative', 'present'], pret: ['indicative', 'preterite'], impf: ['indicative', 'imperfect'], fut: ['indicative', 'future'], cond: ['conditional'], subj: ['subjunctive', 'present'], subjImpf: ['subjunctive', 'imperfect'], subjFut: ['subjunctive', 'future'] };
const IMPS = { tu: ['second-person', 'singular'], usted: ['formal', 'singular'], nos: ['first-person', 'plural'], ustedes: ['formal', 'plural'] };
const NEVER = ['vos-form', 'combined-form', 'imperfect-se', 'table-tags', 'inflection-template', 'class'];
// fr (french-course.md W2): 6 ngôi, nhãn kaikki French (historic past = passé simple); ô '-' (falloir, pleuvoir) = không có dạng → bỏ qua
const P6 = [['first-person', 'singular'], ['second-person', 'singular'], ['third-person', 'singular'], ['first-person', 'plural'], ['second-person', 'plural'], ['third-person', 'plural']];
const FR_ROWS = { pres: ['indicative', 'present'], impf: ['indicative', 'imperfect'], ps: ['indicative', 'historic'], fut: ['indicative', 'future'], cond: ['conditional'], subj: ['subjunctive', 'present'], subjImpf: ['subjunctive', 'imperfect'] };
const FR_IMP = { tu: ['second-person', 'singular'], nous: ['first-person', 'plural'], vous: ['second-person', 'plural'] };
const slotsFr = c => {
  const out = [], NO = ['multiword-construction'];
  for (const [k, t] of Object.entries(FR_ROWS)) c[k].forEach((f, i) => f !== '-' && out.push([`${k}.${PERSONS[i]}`, f, [...t, ...P6[i]], [...NO, ...(k === 'pres' ? ['subjunctive', 'imperfect', 'historic'] : [])]]));
  for (const [x, t] of Object.entries(FR_IMP)) if (c.imp[x] !== '-') out.push([`imp.${x}`, c.imp[x], ['imperative', ...t], NO]);
  out.push(['part', c.part, ['participle', 'past'], [...NO, 'feminine', 'plural']]);
  if (c.ppres !== '-') out.push(['ppres', c.ppres, ['participle', 'present'], NO]);
  if (!/^(se |s')/.test(c.inf)) out.push(['aux', `${c.aux} + past participle`, ['infinitive', 'multiword-construction'], []]); // trợ avoir/être của thì ghép
  return out;
};
const DET = new Set(['detPres', 'detFut', 'detPast']), FI = new Set(['formal', 'informal']);
const slotsKo = c => Object.entries(c.f).filter(([k]) => KO.CONJ_TAGS[k]).map(([k, f]) => [k, f, KO.CONJ_TAGS[k], [], t => { const s = new Set(t.filter(x => !(DET.has(k) && FI.has(x)))); return s.size === KO.CONJ_TAGS[k].length && KO.CONJ_TAGS[k].every(x => s.has(x)); }]);
const slots = c => {
  if (TL === 'ko') return slotsKo(c);
  if (TL === 'fr') return slotsFr(c);
  const out = [];
  for (const [k, t] of Object.entries(ROWS)) c[k].forEach((f, i) => out.push([`${k}.${PERSONS[i]}`, f, [...t, ...P[i]], k === 'pres' || k === 'subj' ? ['imperative'] : []]));
  for (const [x, t] of Object.entries(IMPS)) { out.push([`imp.${x}`, c.imp[x], ['imperative', ...t], ['negative']]); out.push([`impNeg.${x}`, c.impNeg[x], ['imperative', 'negative', ...t], []]); }
  out.push(['ger', c.ger, ['gerund'], []], ['part', c.part, ['participle'], ['feminine', 'plural']]);
  return out;
};
const deckVerbs = () => TL === 'ko' ? [] : [seedPath(TL), ...coreFiles(TL)].flatMap(f => readJSON(f).words.filter(w => w.pos === 'v').map(w => (TL === 'fr' ? w.word.replace(/^(se |s')/, '') : w.word.replace(/(?<=[aeií]r)se$/, ''))));
const posArgs = process.argv.slice(2).filter((a, i, A) => !a.startsWith('--') && A[i - 1] !== '--tl');
const verbs = posArgs.length ? posArgs : [...new Set([...deckVerbs(), ...KNOWN])].sort();

let ok = 0, miss = 0, nodata = 0; const bad = [], noPage = [];
async function check(v) {
  // fr: động từ phản thân Wiktionary ghi kèm đại từ (m'abstiens, abstiens-toi) → so phần động từ
  const bare = f => TL === 'fr' ? { ...f, form: f.form.replace(/^(m'|t'|s'|me |te |se |nous |vous )/, '').replace(/-(toi|nous|vous)$/, '') } : f;
  const forms = (await kaikki(G.kaikki, v)).filter(e => e.pos === 'verb' || (TL === 'ko' && e.pos === 'adj')).flatMap(e => e.forms || []).map(bare);
  if (!forms.length) { noPage.push(v); return; }
  for (const [slot, mine, req, ex, exact] of slots(conjugate(v))) {
    const cand = new Set(forms.filter(f => { const t = f.tags || []; if (exact) return exact(t) && f.form !== '-'; return req.every(x => t.includes(x)) && ![...NEVER, ...ex].some(x => t.includes(x)) && f.form !== '-'; }).map(f => /^(avoir|être)$/.test(f.form) ? f.form + ' + past participle' : f.form)); // fr: "avoir or être + pp" Wiktionary tách thành 2 dạng
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
