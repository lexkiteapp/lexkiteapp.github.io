// Luyện định dạng (es: DELE/SIELE – spanish-exam-w5.md; fr: DELF/DALF – french-course.md W5): chọn câu NGƯỜI VIẾT từ Tatoeba (CC BY 2.0 FR, ghi công từng câu) → content/exams/<tl>/src/tatoeba-<cấp>.json.
// MỘT engine cho mọi tl: mọi thứ riêng ngôn ngữ (mã Tatoeba, kho từ, danh sách cấm, hạn mức cấp, mẫu bẫy điền từ, spec, biến toàn cục gói) ở bảng EXT – không nhánh `if (tl)`.
// Không AI sinh câu. Cấp = rank tần suất từ (FrequencyWords es_50k chỉ làm thứ hạng) + độ dài; câu điền từ: từ khuyết ∈ kho từ reviewed, bẫy chỉ nhận khi KHÔNG xuất hiện cạnh từ trước/sau trong 443k câu thật.
// Chạy 1 lần khi đổi nguồn (LEVELS=B2,C1,C2 chỉ ghi các cấp đó, giữ nguyên cấp đã có): TL=es LEVELS=… TATOEBA=<spa_sentences_detailed.tsv> FREQ=<es_50k.txt> node scripts/target/exam-es-lib.mjs  (CI/check chỉ đọc file đã commit).
import fs from 'node:fs';
import { readJSON, TL_RULES } from './lib.mjs';
import { form } from './conjugate.mjs';
import * as FR from './conj-fr.mjs';

export const EX_LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], EX_NEW = ['B2', 'C1', 'C2'], EX_N = 2, EX_CLOZE = 10, EX_LISTEN = 6; // mỗi cấp 2 đề × (10 điền từ + 6 nghe)
const CAP = { A1: [600, 9, 70], A2: [1500, 12, 95], B1: [4000, 16, 130], B2: [9000, 22, 160], C1: [20000, 28, 200], C2: [50000, 34, 240] }; export const MAXLEN = Object.fromEntries(Object.entries(CAP).map(([k, v]) => [k, v[2]])); const MINTOK = { A1: 4, A2: 6, B1: 8, B2: 10, C1: 12, C2: 14 }; // [rank tối đa, số từ tối đa, ký tự tối đa]
const toks = s => s.toLowerCase().match(/[\p{L}]+/gu) || [];
const vow = w => /^[aeiouyéèêâîôûh]/i.test(w);
// fr: bẫy chia động từ = dạng của CÙNG động từ ở ngôi khác (conj-fr.mjs), chỉ khi ngay trước là đại từ chủ ngữ → sai ngữ pháp chắc chắn
const FPERS = { je: 0, j: 0, tu: 1, il: 2, elle: 2, on: 2, nous: 3, vous: 4, ils: 5, elles: 5 }, FTENSE = ['pres', 'impf', 'fut', 'cond', 'ps', 'subj', 'subjImpf'];
let FIDX = null;
const frIndex = () => FIDX || (FIDX = (() => { const m = new Map(); for (const v of FR.KNOWN) { if (/\s|'/.test(v)) continue; for (const t of FTENSE.slice(0, 5)) { let f; try { f = FR.form(v, t); } catch (e) { continue; } f.forEach((x, p) => { if (x && x !== '-' && !/\s/.test(x)) (m.get(x) || m.set(x, []).get(x)).push({ v, t, p }); }); } } return m; })());
function frVerbTraps(t, i) {
  const a = t[i], p = FPERS[t[i - 1]]; if (p === undefined || a.length < 2 || (i >= 2 && /^(que|qu)$/.test(t[i - 2]))) return null;
  const hit = (frIndex().get(a) || []).filter(e => e.p === p); if (!hit.length) return null;
  const ok = new Set(); for (const e of hit) for (const tn of FTENSE) { try { const f = FR.form(e.v, tn)[p]; if (f) ok.add(f); } catch (er) { /* thì lạ */ } }
  const e = hit[0], out = [];
  for (let q = 0; q < 6; q++) { if (q === p) continue; const f = FR.form(e.v, e.t)[q]; if (f && f !== '-' && f !== a && !ok.has(f) && !out.includes(f) && (t[i - 1] !== 'j' || vow(f))) out.push(f); }
  return out.length >= 2 ? out.slice(0, 2) : null;
}
// Bảng theo ngôn ngữ đích. kho = tệp từ có pos/giống (lọc theo regex tên tệp); det = từ hạn định đúng giống; vTrap(t, i, kho, a) = bẫy động từ của vị trí i hoặc null; sameStart = bẫy danh từ phải cùng kiểu đầu từ (fr: nguyên âm/phụ âm, tránh lộ vì nối âm)
const ES_MOD = /^(quiero|puedo|puedes|puede|podemos|pueden|debo|debes|sin|para|de|a|voy|vas|va|vamos|van|tengo|tiene|tienen|quieres|quiere|quieren|hay|que|no)$/;
export const EXT = {
  es: { iso3: 'spa', D: 'content/exams/es/', G: 'ESX', kho: ['content/target/es', /^core-\d+\.json$/], title: 'DELE/SIELE', lang: 'tiếng Tây Ban Nha', check: 'exam-es-check.mjs', freq: 'es_50k.txt',
    BAN: /(^|[^\p{L}])(tom|mary|bob|ken|jim|tomás|imbécil\w*|idiota\w*|demonio\w*|maldición|teniente|abogado|cita|hospital|sangre|perdedor|maría|john|muert\w*|muri\w+|matar\w*|mató|asesin\w*|sexo|sexual\w*|guerra|dios|jesús|iglesia|religi\w+|suicid\w*|droga\w*|violen\w*|violad\w*|polític\w*|president\w*|gobierno|terror\w*|bomba|armas?|racis\w+|gay|judíos?|musulman\w*|cáncer|hospital|noé|arca|diluvio)(?=$|[^\p{L}])/iu,
    start: /^[¿¡A-ZÁÉÍÓÚÑ]/, badChars: /[0-9@:\/"“”()]/, comma: /[a-zñáéíóú],[a-z]/, cap: /^[A-ZÁÉÍÓÚÑ]/, clit: new Set(),
    DET: { m: /^(el|un|mi|su|tu|este|ese|aquel|otro|todo|ningún|algún)$/, f: /^(la|una|mi|su|tu|esta|esa|aquella|otra|toda|ninguna|alguna)$/ }, sameStart: () => true, vmin: 3,
    vTrap: (t, i, kho, a) => { if (!(kho.get(a) === 'v' && /(ar|er|ir)$/.test(a) && ES_MOD.test(t[i - 1]))) return null; let vf; try { vf = [form(a, 'pres')[2], form(a, 'pret')[2]]; } catch (e) { return null; } return vf.length === 2 && vf.every(v => v && v !== a) ? vf : null; }, // bẫy = dạng chia của CHÍNH nó (sai ngữ pháp sau giới từ/động từ khuyết, không thể đúng)
    pack: (spec, lv) => ({ sp: spec.dele[lv], sb: Object.fromEntries(Object.entries(spec.siele.bands).map(([k, b]) => [k, b])) }),
    credit: 'Câu tiếng Tây Ban Nha', head: '# Ghi công câu Tatoeba (đề luyện định dạng DELE/SIELE W5)' },
  fr: { iso3: 'fra', D: 'content/exams/fr/', G: 'FRX', kho: ['content/target/fr', /^(core-\d+|seed)\.json$/], title: 'DELF/DALF', lang: 'tiếng Pháp', check: 'exam-es-check.mjs --tl fr', freq: 'fr_50k.txt',
    BAN: /(^|[^\p{L}])(tom|mary|marie|john|jean|pierre|paul|ken|jim|bob|imbécile\w*|idiot\w*|con|conne|connard\w*|merde|putain|salaud\w*|démon\w*|hôpital|sang|perdant\w*|mort\w*|meur\w+|mourir|tu[ée]\w*|tuer|assassin\w*|sexe|sexuel\w*|guerre\w*|dieu|jésus|église|religi\w+|suicid\w*|drogue\w*|violen\w*|viol\w*|politique\w*|président\w*|gouvernement|terror\w*|bombe\w*|arme\w*|racis\w+|gay|juifs?|musulman\w*|cancer|noé|arche|déluge|cadavre\w*|police|policier\w*)(?=$|[^\p{L}])/iu,
    start: /^[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŒ]/, badChars: /[0-9@:\/"“”«»()]/, comma: /\p{L},\p{L}/u, cap: /^[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŒ]/, clit: new Set(['c', 'd', 'j', 'l', 'm', 'n', 's', 't', 'qu', 'jusqu', 'lorsqu', 'puisqu', 'aujourd', 'hui']),
    DET: { m: /^(le|un|ce)$/, f: /^(la|une|cette|ma|ta|sa)$/ }, sameStart: (a, w) => vow(a) === vow(w), vmin: 1,
    vTrap: (t, i) => frVerbTraps(t, i),
    pack: (spec, lv) => ({ sp: spec.delf[lv] || spec.dalf[lv], rl: spec.rule }),
    credit: 'Câu tiếng Pháp', head: '# Ghi công câu Tatoeba (đề luyện định dạng DELF/DALF, W5 tiếng Pháp)' },
};
export const SRC = (lv, tl = 'es') => `${EXT[tl].D}src/tatoeba-${lv}.json`;
export const hasSrc = (tl = 'es') => EX_LV.filter(lv => fs.existsSync(SRC(lv, tl)));

export function build(tsv, freqTxt, tl = 'es') {
  const T = EXT[tl], { BAN } = T, rk = (rank, w) => rank.get(w) || (T.clit.has(w) ? 1 : 99999);
  const rank = new Map(); freqTxt.split('\n').forEach((l, i) => { const w = l.split(' ')[0]; if (w && !rank.has(w)) rank.set(w, i + 1); });
  const kho = new Map(), gen = new Map(); // từ kho (1 chữ) → pos / giống
  for (const f of fs.readdirSync(T.kho[0]).filter(f => T.kho[1].test(f))) for (const w of readJSON(T.kho[0] + '/' + f).words) if (!/[\s-]/.test(w.word)) { kho.set(w.word.toLowerCase(), w.pos); if (w.gender === 'm' || w.gender === 'f') gen.set(w.word.toLowerCase(), w.gender); }
  const rows = tsv.split('\n').map(l => l.split('\t')).filter(r => r[1] === T.iso3 && r[2]), big = new Set();
  for (const r of rows) { const t = toks(r[2]); for (let i = 0; i < t.length - 1; i++) big.add(t[i] + ' ' + t[i + 1]); }
  const inv = new Map(); // từ → tập id câu (chặn bẫy từng xuất hiện CÙNG câu với một từ nội dung của câu này)
  rows.forEach((r, i) => { for (const w of new Set(toks(r[2]))) { let a = inv.get(w); if (!a) inv.set(w, a = new Set()); a.add(i); } });
  const co = (d, T) => { const A = inv.get(d) || new Set(); return T.some(t => { const B = inv.get(t); if (!B) return false; const [S, L] = A.size < B.size ? [A, B] : [B, A]; for (const i of S) if (L.has(i)) return true; return false; }); };
  const R = TL_RULES[tl], lint = R.lint, per = {}, hash = id => (id * 2654435761) % 4294967296;
  for (const lv of EX_LV) per[lv] = [];
  const used = new Set();
  const cand = rows.map(r => ({ id: +r[0], au: r[3], s: r[2].trim() })).filter(x => x.au && x.au !== '\\N' && T.start.test(x.s) && /[.?!]$/.test(x.s) && !T.badChars.test(x.s) && !BAN.test(x.s) && !lint.some(re => re.test(x.s)) && !(R.mix && R.mix.informal.test(x.s) && R.mix.formal.test(x.s)) && !T.comma.test(x.s)).sort((a, b) => hash(a.id) - hash(b.id));
  for (const x of cand) {
    const t = toks(x.s), words = x.s.split(/\s+/);
    if (words.slice(1).some(w => T.cap.test(w.replace(/^[¿¡]/, '')))) continue; // tên riêng giữa câu
    const mx = Math.max(...t.map(w => rk(rank, w))); const lv = EX_LV.find(l => mx <= CAP[l][0] && t.length >= 4 && t.length <= CAP[l][1] && x.s.length <= CAP[l][2]); // nhận ở cấp THẤP nhất phù hợp
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
        const { DET } = T;
        const pos = x.t.map((w, i) => [w, i]).filter(([w, i]) => i > 0 && i < x.t.length - 1 && (kho.has(w) && w.length > 3 && !BAN.test(w) && kho.get(w) === 'n' && gen.get(w) && DET[gen.get(w)].test(x.t[i - 1]) && !DET[gen.get(w) === 'm' ? 'f' : 'm'].test(x.t[i - 1]) || w.length > T.vmin && !BAN.test(w) && T.vTrap(x.t, i, kho, w)));
        const dup = pos.find(([w]) => !clz.some(c => c.a === w) && x.t.filter(u => u === w).length === 1); // từ khuyết chỉ xuất hiện một lần (khỏi thay nhầm chỗ)
        if (dup) {
          const [a, i] = dup, vt = T.vTrap(x.t, i, kho, a), nn = !vt && kho.get(a) === 'n', same = vt ? [...vt] : [...kho].filter(([w, p]) => p === kho.get(a) && w !== a && w.length > 2 && !BAN.test(w) && (!nn || (gen.get(w) && gen.get(w) !== gen.get(a))) && nn && T.sameStart(a, w) && !x.t.includes(w) && !big.has(x.t[i - 1] + ' ' + w) && !big.has(w + ' ' + x.t[i + 1]) && !co(w, x.t.filter((u, j) => j !== i && rk(rank, u) > 150)) && Math.abs(rk(rank, w) - rk(rank, a)) < 4000).map(([w]) => w).sort((p, q) => Math.abs(rk(rank, p) - rk(rank, a)) - Math.abs(rk(rank, q) - rk(rank, a)));
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

if ((process.argv[1] || '').endsWith('exam-es-lib.mjs') && process.env.TATOEBA) {
  const tl = process.env.TL || 'es', o = build(fs.readFileSync(process.env.TATOEBA, 'utf8'), fs.readFileSync(process.env.FREQ, 'utf8'), tl);
  fs.mkdirSync(EXT[tl].D + 'src', { recursive: true });
  for (const lv of (process.env.LEVELS ? process.env.LEVELS.split(',') : EX_LV)) { fs.writeFileSync(SRC(lv, tl), JSON.stringify(o[lv], null, 1) + '\n'); console.log(tl, lv, o[lv].items.filter(i => i.k === 'c').length, 'điền từ', o[lv].items.filter(i => i.k === 'l').length, 'nghe'); }
}

// ---- Gói cpack (dựng từ nguồn đã commit; drill-lib.build() gộp, drill-pack --check kiểm "cũ/mồ côi"). Cấp chưa có nguồn (fr: trước khi CI dựng) → không có gói, UI hiện trạng thái "chưa có đề".
const UI_LANGS = ['en', 'vi', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
export const EX_UI = 'ti sub ex rd ls wr sp qrd qls est grp okg nog nov wl wc chk crit c1 c2 c3 mic hd nm sr cr pr mn tk go sc ns'.split(' ');
export function buildExam(tl = 'es') {
  const T = EXT[tl], D = T.D, G = T.G, spec = readJSON(D + 'spec.json'), tasks = readJSON(D + 'tasks.json'), ui = readJSON(D + 'ui.json'), files = {}, levels = {};
  for (const lv of hasSrc(tl)) {
    const src = readJSON(SRC(lv, tl)), cz = src.items.filter(i => i.k === 'c'), ls = src.items.filter(i => i.k === 'l'), exams = [];
    for (let e = 0; e < EX_N; e++) exams.push({
      c: cz.slice(e * EX_CLOZE, (e + 1) * EX_CLOZE).map(i => [i.s, i.a, i.o, i.id, i.au]),
      l: ls.slice(e * EX_LISTEN, (e + 1) * EX_LISTEN).map(i => [i.s, i.id, i.au]),
      w: tasks[lv].w[e], s: tasks[lv].s[e],
    });
    levels[lv] = { e: exams, con: tasks[lv].con, ...T.pack(spec, lv) };
    files[`x-${lv}.js`] = `self.${G}=self.${G}||{};(${G}.x=${G}.x||{})[${JSON.stringify(lv)}]=${JSON.stringify(levels[lv])};\n`;
  }
  if (Object.keys(levels).length) for (const l of UI_LANGS) files[`x-ui-${l}.js`] = `self.${G}=self.${G}||{};(${G}.xl=${G}.xl||{})[${JSON.stringify(l)}]=${JSON.stringify(ui[l])};\n`;
  return { files, levels, ui, spec, tasks, UI_LANGS };
}
// Câu nghe cần giọng đọc (corpus âm thanh Kokoro, gen-audio --tl <tl>)
export const examLines = (tl = 'es') => { const { levels } = buildExam(tl); return Object.values(levels).flatMap(l => l.e.flatMap(e => e.l.map(x => x[0]).concat(e.c.map(x => x[0].replace('___', x[1]))))); };
