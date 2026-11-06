// Kiểm chéo lemma / giống / số nhiều với Wiktionary (kaikki.org, CC BY-SA) – spanish-course.md §3, §5.1. CHỈ đọc để kiểm trên CI (target-content.yml,
// sau gen.mjs + tl_ipa_fill.py); KHÔNG ghi dữ liệu Wiktionary vào repo (chỉ ghi kết quả đạt/loại). Mỗi từ 1 tệp nhỏ /meaning/… (không tải bản 1,1 GB).
// Luật: không có trang lemma → LOẠI; danh từ sai giống hoặc số nhiều không nằm trong dạng số nhiều Wiktionary → LOẠI; từ loại khác Wiktionary → gắn cờ qa.wikt.
// Lỗi mạng/5xx sau 3 lần → thoát 3 (dừng lượt, không bỏ cổng). Từ bị loại chuyển sang <lô>.report.json (rejected, why "wiktionary: …").
// Chạy: node scripts/target/wikt-check.mjs --tl es [tệp core-NN.json]   · --self: chỉ kiểm seed.json (phải đạt 100 %)
import fs from 'node:fs';
import { readJSON, coreFiles, seedPath, kaikki } from './lib.mjs';
import { TL_GEN } from './tl-gen.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const TL = arg('tl', 'es'), G = TL_GEN[TL], SELF = process.argv.includes('--self');
if (!G || !G.kaikki) { console.error(`✗ tl "${TL}" chưa có kaikki trong tl-gen.mjs`); process.exit(2); }
const POS = { n: ['noun'], v: ['verb'], adj: ['adj'], adv: ['adv'], pron: ['pron'], prep: ['prep'], conj: ['conj'], num: ['num'], interj: ['intj'], det: ['det', 'article'] };
const entries = w => kaikki(G.kaikki, w);
const genderOf = e => { const s = new Set(); for (const h of e.head_templates || []) for (const v of Object.values(h.args || {})) if (/^(m|f|mf|mfbysense|m-p|f-p)$/.test(v)) s.add(v.replace(/-p$/, '').replace('mfbysense', 'mf')); for (const x of e.senses || []) for (const t of x.tags || []) { if (t === 'masculine') s.add('m'); if (t === 'feminine') s.add('f'); } if (s.has('m') && s.has('f')) s.add('mf'); return s; };
const pluralsOf = e => new Set((e.forms || []).filter(f => (f.tags || []).includes('plural')).map(f => f.form.toLowerCase()));

async function check(w) {
  const E = await entries(w.word), mine = E.filter(e => (POS[w.pos] || []).includes(e.pos));
  if (!E.length) return { bad: 'không có trang Wiktionary' };
  if (!mine.length) return { flag: `từ loại ${w.pos} ↔ ${[...new Set(E.map(e => e.pos))].join('/')}` };
  if (w.pos !== 'n') return {};
  const g = new Set(mine.flatMap(e => [...genderOf(e)])), pl = new Set(mine.flatMap(e => [...pluralsOf(e)]));
  if (g.size && !g.has(w.gender)) return { bad: `giống ${w.gender} ↔ ${[...g].join('/')}` };
  if (pl.size && !pl.has(String(w.plural).toLowerCase()) && !(w.plural === w.word && /invariable/.test(JSON.stringify(mine.map(e => e.head_templates))))) return { bad: `số nhiều ${w.plural} ↔ ${[...pl].join('/')}` };
  return {};
}

const f = SELF ? seedPath(TL) : (process.argv.slice(2).find(a => a.endsWith('.json')) || coreFiles(TL).filter(x => /core-\d+\.json$/.test(x)).at(-1));
if (!f) { console.error('✗ chưa có tệp lô'); process.exit(1); }
const deck = readJSON(f), keep = [], out = [], flags = [];
for (let i = 0; i < deck.words.length; i += 4) { // 4 yêu cầu song song – nhẹ cho kaikki.org
  const part = deck.words.slice(i, i + 4), res = await Promise.all(part.map(check));
  part.forEach((w, k) => { const r = res[k]; if (r.bad) out.push({ form: w.word, word: w.word, why: ['wiktionary: ' + r.bad] }); else { if (r.flag) { flags.push(w.word + ': ' + r.flag); if (!SELF) (w.qa = w.qa || {}).wikt = r.flag; } keep.push(w); } });
}
const txt = [`## Wiktionary (kaikki.org) – ${f.split('/').slice(-2).join('/')}: đạt ${keep.length}/${deck.words.length}, loại ${out.length}, gắn cờ ${flags.length}`, ...out.map(o => `- ✗ ${o.word}: ${o.why[0]}`), ...flags.slice(0, 40).map(x => `- ⚑ ${x}`)].join('\n');
console.log(txt); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, txt + '\n');
if (SELF) process.exit(out.length ? 1 : 0); // seed soát tay phải đạt 100 %
for (const w of keep.filter(w => !(w.qa && w.qa.spot)).slice(0, Math.max(0, Math.ceil(keep.length * 0.05) - keep.filter(w => w.qa && w.qa.spot).length))) w.qa.spot = true; // giữ mẫu soát ≥ 5 % sau khi loại
deck.words = keep; fs.writeFileSync(f, JSON.stringify(deck, null, 1) + '\n');
const rf = f.replace(/\.json$/, '.report.json');
if (fs.existsSync(rf)) { const rep = readJSON(rf); rep.rejected = [...(rep.rejected || []), ...out]; rep.accepted = keep.length; rep.wiktFlags = flags; rep.spot = keep.filter(w => w.qa && w.qa.spot).map(w => w.word); fs.writeFileSync(rf, JSON.stringify(rep, null, 1) + '\n'); }
if (!keep.length) process.exit(1);
