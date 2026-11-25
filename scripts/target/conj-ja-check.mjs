// Kiểm chéo bộ chia tiếng Nhật (conj-ja.mjs) với bảng chia Wiktionary (kaikki.org, `Japanese`) – japanese-course.md §2/§5 "khớp 100 %, ngoại lệ ghi tay có lý do".
// CI (target-content.yml, job check ja): mọi động từ trong bộ từ ja (seed + core-*) ∪ KNOWN. Mỗi ô: dạng chữ HOẶC dạng kana của mình phải nằm trong các dạng Wiktionary
// cùng nhãn (bảng hiện đại – dừng ở bảng văn ngôn ja-conj-bungo). Ô Wiktionary không có → bỏ qua (đếm riêng). Không có trang động từ (cả chữ lẫn kana) → báo (không loại). Lỗi mạng → thoát 3.
// Chạy: node scripts/target/conj-ja-check.mjs [từ …]
import fs from 'node:fs';
import { readJSON, coreFiles, seedPath, kaikki } from './lib.mjs';
import { conjugate, KNOWN } from './conj-ja.mjs';

// Ngoại lệ ghi tay (động từ:ô → lý do). Chỉ khi Wiktionary sai/thiếu – KHÔNG để che lỗi bộ chia.
export const EXCEPT = {};
// ô của mình → [nhãn bắt buộc, nhãn cấm]
export const SLOTS = { masu: [['formal'], ['negative', 'past']], nai: [['negative'], ['continuative', 'formal']], te: [['conjunctive'], ['negative']], ta: [['perfective'], ['negative']],
  ba: [['conditional', 'hypothetical'], ['negative']], vol: [['volitional'], []], pot: [['potential'], []], pass: [['passive'], []], caus: [['causative'], ['passive']],
  imp: [['imperative'], ['negative']], zu: [['continuative', 'negative'], []], stem: [['continuative'], ['negative']] };
/** forms kaikki → chỉ bảng hiện đại (cắt ở mốc inflection-template ja-conj-bungo) */
export const modern = forms => { const o = []; for (const f of forms) { if (f.form === 'ja-conj-bungo') break; o.push(f); } return o; };
const deckVerbs = () => [seedPath('ja'), ...coreFiles('ja')].flatMap(f => readJSON(f).words.filter(w => w.pos === 'v' && w.vclass));
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const pool = [...deckVerbs(), ...KNOWN], verbs = [...new Map(pool.filter(v => !args.length || args.includes(v.word)).map(v => [v.word, v])).values()];
let ok = 0, nodata = 0; const bad = [], noPage = [];
async function check(v) {
  const vf = async w => modern((await kaikki('Japanese', w)).filter(e => e.pos === 'verb').flatMap(e => e.forms || []));
  let forms = await vf(v.word); if (!forms.length && v.kana && v.kana !== v.word) forms = await vf(v.kana); // chữ là trang chuyển hướng (飲む → 呑む…) → trang kana
  if (!forms.length) { noPage.push(v.word); return; }
  const c = conjugate(v);
  for (const [slot, [req, no]] of Object.entries(SLOTS)) {
    const cand = new Set(forms.filter(f => { const t = f.tags || []; return req.every(x => t.includes(x)) && !no.some(x => t.includes(x)); }).map(f => f.form));
    if (!cand.size) { nodata++; continue; }
    const m = c[slot];
    if (cand.has(m.w) || cand.has(m.k) || EXCEPT[`${v.word}:${slot}`]) { ok++; continue; }
    bad.push(`${v.word} ${slot}: ${m.w}/${m.k} ↔ ${[...cand].slice(0, 4).join('/')}`);
  }
}
for (let i = 0; i < verbs.length; i += 4) await Promise.all(verbs.slice(i, i + 4).map(check)); // 4 yêu cầu song song – nhẹ cho kaikki.org
const txt = [`## Chia động từ ja ↔ Wiktionary: khớp ${ok}/${ok + bad.length} ô (${verbs.length} động từ, ${nodata} ô Wiktionary trống, ${noPage.length} không có trang)`, ...bad.map(b => '- ✗ ' + b), ...(noPage.length ? ['- không có trang: ' + noPage.join(', ')] : [])].join('\n');
console.log(txt); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, txt + '\n');
process.exit(bad.length || !ok ? 1 : 0);
