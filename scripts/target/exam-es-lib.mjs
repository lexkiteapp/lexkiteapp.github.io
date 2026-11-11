// Luyện định dạng DELE/SIELE (spanish-exam-w5.md): chọn câu NGƯỜI VIẾT từ Tatoeba (CC BY 2.0 FR, ghi công từng câu) → content/exams/es/src/tatoeba-<cấp>.json.
// Không AI sinh câu. Cấp = rank tần suất từ (FrequencyWords es_50k chỉ làm thứ hạng) + độ dài; câu điền từ: từ khuyết ∈ kho từ reviewed, bẫy chỉ nhận khi KHÔNG xuất hiện cạnh từ trước/sau trong 443k câu thật.
// Chạy 1 lần khi đổi nguồn (LEVELS=B2,C1,C2 chỉ ghi các cấp đó, giữ nguyên cấp đã có): LEVELS=… TATOEBA=<spa_sentences_detailed.tsv> FREQ=<es_50k.txt> node scripts/target/exam-es-lib.mjs  (CI/check chỉ đọc file đã commit).
import fs from 'node:fs';
import { readJSON, TL_RULES } from './lib.mjs';
import { form } from './conjugate.mjs';

export const EX_LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], EX_NEW = ['B2', 'C1', 'C2'], EX_N = 2, EX_CLOZE = 10, EX_LISTEN = 6; // mỗi cấp 2 đề × (10 điền từ + 6 nghe)
export const SRC = lv => `content/exams/es/src/tatoeba-${lv}.json`;
const CAP = { A1: [600, 9, 70], A2: [1500, 12, 95], B1: [4000, 16, 130], B2: [9000, 22, 160], C1: [20000, 28, 200], C2: [50000, 34, 240] }; export const MAXLEN = Object.fromEntries(Object.entries(CAP).map(([k, v]) => [k, v[2]])); const MINTOK = { A1: 4, A2: 6, B1: 8, B2: 10, C1: 12, C2: 14 }; // [rank tối đa, số từ tối đa, ký tự tối đa]
const BAN = /(^|[^\p{L}])(tom|mary|bob|ken|jim|tomás|imbécil\w*|idiota\w*|demonio\w*|maldición|teniente|abogado|cita|hospital|sangre|perdedor|maría|john|muert\w*|muri\w+|matar\w*|mató|asesin\w*|sexo|sexual\w*|guerra|dios|jesús|iglesia|religi\w+|suicid\w*|droga\w*|violen\w*|violad\w*|polític\w*|president\w*|gobierno|terror\w*|bomba|armas?|racis\w+|gay|judíos?|musulman\w*|cáncer|hospital)(?=$|[^\p{L}])/iu;
const toks = s => s.toLowerCase().match(/[\p{L}]+/gu) || [];

export function build(tsv, freqTxt) {
  const rank = new Map(); freqTxt.split('\n').forEach((l, i) => { const w = l.split(' ')[0]; if (w && !rank.has(w)) rank.set(w, i + 1); });
  const kho = new Map(), gen = new Map(); // từ kho (1 chữ) → pos / giống
  for (const f of fs.readdirSync('content/target/es').filter(f => /^core-\d+\.json$/.test(f))) for (const w of readJSON('content/target/es/' + f).words) if (!/[\s-]/.test(w.word)) { kho.set(w.word.toLowerCase(), w.pos); if (w.gender === 'm' || w.gender === 'f') gen.set(w.word.toLowerCase(), w.gender); }
  const rows = tsv.split('\n').map(l => l.split('\t')).filter(r => r[1] === 'spa' && r[2]), big = new Set();
  for (const r of rows) { const t = toks(r[2]); for (let i = 0; i < t.length - 1; i++) big.add(t[i] + ' ' + t[i + 1]); }
  const inv = new Map(); // từ → tập id câu (chặn bẫy từng xuất hiện CÙNG câu với một từ nội dung của câu này)
  rows.forEach((r, i) => { for (const w of new Set(toks(r[2]))) { let a = inv.get(w); if (!a) inv.set(w, a = new Set()); a.add(i); } });
  const co = (d, T) => { const A = inv.get(d) || new Set(); return T.some(t => { const B = inv.get(t); if (!B) return false; const [S, L] = A.size < B.size ? [A, B] : [B, A]; for (const i of S) if (L.has(i)) return true; return false; }); };
  const lint = TL_RULES.es.lint, per = {}, hash = id => (id * 2654435761) % 4294967296;
  for (const lv of EX_LV) per[lv] = [];
  const used = new Set();
  const cand = rows.map(r => ({ id: +r[0], au: r[3], s: r[2].trim() })).filter(x => x.au && x.au !== '\\N' && /^[¿¡A-ZÁÉÍÓÚÑ]/.test(x.s) && /[.?!]$/.test(x.s) && !/[0-9@:\/"“”()]/.test(x.s) && !BAN.test(x.s) && !lint.some(re => re.test(x.s)) && !/[a-zñáéíóú],[a-z]/.test(x.s)).sort((a, b) => hash(a.id) - hash(b.id));
  for (const x of cand) {
    const t = toks(x.s), words = x.s.split(/\s+/);
    if (words.slice(1).some(w => /^[A-ZÁÉÍÓÚÑ]/.test(w.replace(/^[¿¡]/, '')))) continue; // tên riêng giữa câu
    const mx = Math.max(...t.map(w => rank.get(w) || 99999)); const lv = EX_LV.find(l => mx <= CAP[l][0] && t.length >= 4 && t.length <= CAP[l][1] && x.s.length <= CAP[l][2]); // nhận ở cấp THẤP nhất phù hợp
    if (!lv || t.length < MINTOK[lv]) continue;
    const need = EX_N * (EX_CLOZE + EX_LISTEN); if (per[lv].length >= need * 40) continue; // dư để chọn
    per[lv].push({ ...x, t });
  }
  const out = {};
  for (const lv of EX_LV) {
    const items = [], ans = [new Set(), new Set()];
    const clz = [], lis = [];
    for (const x of per[lv]) {
      if (clz.length < EX_N * EX_CLOZE) {
        const DET = { m: /^(el|un|mi|su|tu|este|ese|aquel|otro|todo|ningún|algún)$/, f: /^(la|una|mi|su|tu|esta|esa|aquella|otra|toda|ninguna|alguna)$/ }, MOD = /^(quiero|puedo|puedes|puede|podemos|pueden|debo|debes|sin|para|de|a|voy|vas|va|vamos|van|tengo|tiene|tienen|quieres|quiere|quieren|hay|que|no)$/;
        const pos = x.t.map((w, i) => [w, i]).filter(([w, i]) => kho.has(w) && i > 0 && i < x.t.length - 1 && w.length > 3 && !BAN.test(w) && (kho.get(w) === 'n' && gen.get(w) && DET[gen.get(w)].test(x.t[i - 1]) && !DET[gen.get(w) === 'm' ? 'f' : 'm'].test(x.t[i - 1]) || kho.get(w) === 'v' && /(ar|er|ir)$/.test(w) && MOD.test(x.t[i - 1])));
        const dup = pos.find(([w]) => !clz.some(c => c.a === w));
        if (dup) {
          const [a, i] = dup, nn = kho.get(a) === 'n', same = [...kho].filter(([w, p]) => p === kho.get(a) && w !== a && w.length > 2 && !BAN.test(w) && (!nn || (gen.get(w) && gen.get(w) !== gen.get(a))) && nn && !x.t.includes(w) && !big.has(x.t[i - 1] + ' ' + w) && !big.has(w + ' ' + x.t[i + 1]) && !co(w, x.t.filter((u, j) => j !== i && (rank.get(u) || 9e4) > 150)) && Math.abs((rank.get(w) || 9e4) - (rank.get(a) || 9e4)) < 4000).map(([w]) => w).sort((p, q) => Math.abs(rank.get(p) - rank.get(a)) - Math.abs(rank.get(q) - rank.get(a)));
          let vf = []; if (!nn) { try { vf = [form(a, 'pres')[2], form(a, 'pret')[2]]; } catch (e) { vf = []; } } // bẫy động từ = dạng chia của CHÍNH nó (sai ngữ pháp sau giới từ/động từ khuyết, không thể đúng)
          if (!nn && vf.length === 2 && vf.every(v => v && v !== a)) same.splice(0, same.length, ...vf);
          if (same.length >= 2) {
            const re = new RegExp(`(^|[^\\p{L}])(${a})(?=$|[^\\p{L}])`, 'iu');
            const o = [a, ...same.slice(0, 2)].sort((p, q) => (hash(p.length * 7 + p.charCodeAt(0)) - hash(q.length * 7 + q.charCodeAt(0))));
            clz.push({ id: x.id, au: x.au, s: x.s.replace(re, (m, p) => p + '___'), a, o, k: 'c' }); continue;
          }
        }
      }
      if (lis.length < EX_N * EX_LISTEN && x.t.length >= (lv === 'A1' ? 4 : 6)) lis.push({ id: x.id, au: x.au, s: x.s, k: 'l' });
      if (clz.length >= EX_N * EX_CLOZE && lis.length >= EX_N * EX_LISTEN) break;
    }
    out[lv] = { v: 1, source: 'Tatoeba (tatoeba.org), CC BY 2.0 FR', license: 'https://creativecommons.org/licenses/by/2.0/fr/', lv, items: [...clz, ...lis] };
  }
  return out;
}

if (process.argv[1].endsWith('exam-es-lib.mjs') && process.env.TATOEBA) {
  const o = build(fs.readFileSync(process.env.TATOEBA, 'utf8'), fs.readFileSync(process.env.FREQ, 'utf8'));
  for (const lv of (process.env.LEVELS ? process.env.LEVELS.split(',') : EX_LV)) { fs.writeFileSync(SRC(lv), JSON.stringify(o[lv], null, 1) + '\n'); console.log(lv, o[lv].items.filter(i => i.k === 'c').length, 'điền từ', o[lv].items.filter(i => i.k === 'l').length, 'nghe'); }
}

// ---- Gói cpack (dựng từ nguồn đã commit; drill-lib.build() gộp, drill-pack --check kiểm "cũ/mồ côi") ----
const D = 'content/exams/es/', UI_LANGS = ['en', 'vi', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
export const EX_UI = 'ti sub ex rd ls wr sp qrd qls est grp okg nog nov wl wc chk crit c1 c2 c3 mic hd nm sr cr pr mn tk go sc ns'.split(' ');
export function buildExam() {
  const spec = readJSON(D + 'spec.json'), tasks = readJSON(D + 'tasks.json'), ui = readJSON(D + 'ui.json'), files = {}, levels = {};
  for (const lv of EX_LV) {
    const src = readJSON(SRC(lv)), cz = src.items.filter(i => i.k === 'c'), ls = src.items.filter(i => i.k === 'l'), exams = [];
    for (let e = 0; e < EX_N; e++) exams.push({
      c: cz.slice(e * EX_CLOZE, (e + 1) * EX_CLOZE).map(i => [i.s, i.a, i.o, i.id, i.au]),
      l: ls.slice(e * EX_LISTEN, (e + 1) * EX_LISTEN).map(i => [i.s, i.id, i.au]),
      w: tasks[lv].w[e], s: tasks[lv].s[e],
    });
    levels[lv] = { e: exams, con: tasks[lv].con, sp: spec.dele[lv], sb: Object.fromEntries(Object.entries(spec.siele.bands).map(([k, b]) => [k, b])) };
    files[`x-${lv}.js`] = `self.ESX=self.ESX||{};(ESX.x=ESX.x||{})[${JSON.stringify(lv)}]=${JSON.stringify(levels[lv])};\n`;
  }
  for (const l of UI_LANGS) files[`x-ui-${l}.js`] = `self.ESX=self.ESX||{};(ESX.xl=ESX.xl||{})[${JSON.stringify(l)}]=${JSON.stringify(ui[l])};\n`;
  return { files, levels, ui, spec, tasks, UI_LANGS };
}
// Câu nghe cần giọng đọc (corpus âm thanh Kokoro, gen-audio --tl es)
export const examLines = () => { const { levels } = buildExam(); return Object.values(levels).flatMap(l => l.e.flatMap(e => e.l.map(x => x[0]).concat(e.c.map(x => x[0].replace('___', x[1]))))); };
