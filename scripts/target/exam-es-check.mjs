// Cổng QC đề luyện định dạng (es: DELE/SIELE – spanish-exam-w5.md §5; fr: DELF/DALF – french-course.md W5). Chạy: node scripts/target/exam-es-check.mjs [--tl es|fr] [--lt] [--write-credits] [--require-src]
// --require-src: CI bắt buộc có nguồn Tatoeba đủ 6 cấp (fr: sau khi exam-es-build đã dựng); không có cờ và tl chưa có nguồn nào → bỏ qua phần nguồn/đề với ghi chú rõ.
// Nguồn câu = Tatoeba có id + tác giả; spec chỉ chứa số ĐÃ xác minh (cấm số đoán: chỗ chưa biết = null); nhãn 15 ngôn ngữ; consigna qua LanguageTool khi --lt (CI).
import fs from 'node:fs';
import { readJSON, TL_RULES, ltErrors } from './lib.mjs';
import { EX_LV, MAXLEN, EX_N, EX_CLOZE, EX_LISTEN, EX_UI, SRC, EXT, hasSrc, buildExam } from './exam-es-lib.mjs';

const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : undefined; }, TL = arg('tl') || 'es', T = EXT[TL];
if (!T) { console.error('✗ tl lạ: ' + TL); process.exit(2); }
const errs = [], E = m => errs.push(m), D = T.D, LT = process.argv.includes('--lt'), REQ = process.argv.includes('--require-src'), lint = TL_RULES[TL].lint;
const VN = /[ơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹđă]/i, ph = s => (s.match(/\{[a-z]\}/g) || []).sort().join();
const { spec, tasks, ui, levels, UI_LANGS } = buildExam(TL), have = hasSrc(TL), SRCOK = have.length === EX_LV.length;
if (!SRCOK) { if (REQ) E(`${TL}: thiếu nguồn Tatoeba ${EX_LV.filter(l => !have.includes(l)).join(',')} – chạy workflow exam-es-build (tl=${TL}) rồi lấy kết quả về`); else console.log(`ℹ ${TL}: chưa có nguồn Tatoeba (${have.length}/${EX_LV.length} cấp) – bỏ qua kiểm nguồn/đề/CREDITS; CI dùng --require-src`); }

// 1) spec: đúng bảng đã đối chiếu trang chính thức; null = chưa xác minh (bảng theo tl)
const SPEC = {
  es: () => {
  const V = { A1: [45, 4, 25, 2, 20, 4, 15, null], A2: [60, 5, 50, 2, 35, 5, 15, null], B1: [70, 5, 60, 2, 40, 5, 15, null], B2: [70, 4, 80, 2, 40, 5, 20, null], C1: [90, 5, null, 2, 50, 5, 20, null], C2: [105, 6, 150, 3, null, null, 20, null] };
  for (const [lv, [rm, rt, wm, wt, lm, lt, sm, st]] of Object.entries(V)) {
    const s = spec.dele[lv]; if (!s) { E(`spec dele.${lv} thiếu`); continue; }
    const got = [s.read.min, s.read.tareas, s.write.min, s.write.tareas, s.listen.min, s.listen.tareas, s.speak.min, s.speak.tareas];
    if (got.join() !== [rm, rt, wm, wt, lm, lt, sm, st].join()) E(`spec dele.${lv} lệch bảng §1: ${got}`);
    if (s.items !== null) E(`spec dele.${lv}.items phải null (số câu mỗi tarea chưa xác minh)`);
    if (s.groupMinPct !== (lv === 'B1' || lv === 'B2' ? 60 : null)) E(`spec dele.${lv}.groupMinPct: chỉ B1/B2 (60) đã xác minh`);
  }
  const sg = spec.siele.global; if (sg.read.items !== 38 || sg.listen.items !== 38 || sg.write.items !== null || sg.speak.items !== null || sg.totalBands !== null) E('spec siele.global lệch bảng §1 (số chưa xác minh phải null)');
  if (JSON.stringify(spec.siele.bands.read) !== '{"A1":33,"A2":66,"B1":118,"B2":178,"C1":217}') E('spec siele.bands.read lệch');
  },
  fr: () => { // chỉ quy tắc chung DELF/DALF là chắc chắn; thời lượng/số bài chưa xác minh được từ nguồn chính thức → mọi số = null
    if (JSON.stringify(spec.rule) !== JSON.stringify({ total: 100, partMax: 25, passTotal: 50, partMin: 5, parts: 4, note: spec.rule && spec.rule.note })) E('spec rule lệch quy tắc chung DELF/DALF (100 / 4×25 / ≥ 50 / ≥ 5)');
    for (const [fam, lvs] of [['delf', ['A1', 'A2', 'B1', 'B2']], ['dalf', ['C1', 'C2']]]) for (const lv of lvs) {
      const s = spec[fam] && spec[fam][lv]; if (!s) { E(`spec ${fam}.${lv} thiếu`); continue; }
      for (const p of ['listen', 'read', 'write', 'speak']) if (!s[p] || s[p].min !== null || s[p].tareas !== null) E(`spec ${fam}.${lv}.${p}: thời lượng/số bài chưa xác minh phải null (cấm đoán số)`);
      if (s.items !== null) E(`spec ${fam}.${lv}.items phải null`);
    }
    for (const k of ['tef', 'tcf']) if (!spec.related || !spec.related[k] || spec.related[k].scale !== null || spec.related[k].items !== null) E(`spec related.${k}: chưa xác minh → scale/items = null`);
  },
};
SPEC[TL]();

// 2) nguồn Tatoeba + đề
const ids = new Set(), authors = new Set();
for (const lv of have) {
  const src = readJSON(SRC(lv, TL));
  if (!/CC BY 2\.0 FR/.test(src.source) || !/creativecommons\.org/.test(src.license)) E(`${lv}: thiếu nguồn/giấy phép Tatoeba`);
  const cz = src.items.filter(i => i.k === 'c'), ls = src.items.filter(i => i.k === 'l');
  if (cz.length !== EX_N * EX_CLOZE || ls.length !== EX_N * EX_LISTEN) E(`${lv}: cần ${EX_N * EX_CLOZE} câu điền từ + ${EX_N * EX_LISTEN} câu nghe (có ${cz.length}/${ls.length})`);
  for (const it of src.items) {
    const w = `${lv}#${it.id}`; if (!Number.isInteger(it.id) || !it.au) E(`${w}: thiếu id/tác giả Tatoeba`); if (ids.has(it.id)) E(`${w}: id trùng`); ids.add(it.id); authors.add(it.au);
    const full = it.k === 'c' ? it.s.replace('___', it.a) : it.s;
    if (lint.some(re => re.test(full))) E(`${w}: lệch chuẩn ${TL}: ${full}`);
    if (it.k === 'c') {
      if ((it.s.match(/___/g) || []).length !== 1) E(`${w}: cần đúng một ___`);
      if (!it.o.includes(it.a) || new Set(it.o).size !== 3) E(`${w}: 3 phương án khác nhau, gồm đáp án`);
      if (it.o.some(o => o !== it.a && it.s.replace('___', o) === full)) E(`${w}: bẫy trùng đáp án`);
    } else if (it.s.length < 12 || it.s.length > MAXLEN[lv]) E(`${w}: độ dài câu nghe lạ`);
  }
}
for (const lv of have) { const l = levels[lv]; if (l.e.length !== EX_N) E(`${lv}: cần ${EX_N} đề`); }

// 3) consigna + rubric
for (const lv of EX_LV) {
  const T = tasks[lv]; if (!T || T.w.length !== EX_N || T.s.length !== EX_N || !T.con.length) { E(`tasks ${lv}: cần ${EX_N} đề viết + ${EX_N} đề nói + từ nối`); continue; }
  for (const [k, x] of [...T.w.map((x, i) => ['w' + i, x]), ...T.s.map((x, i) => ['s' + i, x])]) {
    if (!x.t || !(x.min > 0) || !x.g.length) E(`tasks ${lv}.${k}: thiếu consigna/min/ý khóa`);
    for (const g of x.g) { try { new RegExp(g); } catch (e) { E(`tasks ${lv}.${k}: regex hỏng ${g}`); } if (g !== g.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()) E(`tasks ${lv}.${k}: ý khóa phải không dấu/chữ thường: ${g}`); }
    if (lint.some(re => re.test(x.t))) E(`tasks ${lv}.${k}: lệch chuẩn ${TL}`);
  }
}

// 4) nhãn 15 ngôn ngữ
const en = ui.en;
for (const l of UI_LANGS) for (const k of EX_UI) {
  const v = ui[l] && ui[l][k]; if (!v) { E(`ui.${l}.${k} thiếu`); continue; }
  if (ph(v) !== ph(en[k])) E(`ui.${l}.${k}: biến {…} lệch bản en`);
  if (l !== 'vi' && VN.test(v)) E(`ui.${l}.${k}: lẫn tiếng Việt`);
  if (l !== 'en' && l !== 'es' && l !== 'pt' && l !== 'fr' && l !== 'de' && l !== 'id' && l !== 'tr' && v === en[k] && /[a-z]{4}/i.test(v) && !/^(DELE|SIELE|DELF|DALF)/.test(v)) E(`ui.${l}.${k}: chưa dịch`);
}
for (const k of Object.keys(en)) if (!EX_UI.includes(k)) E(`ui.en.${k} không có trong EX_UI`);

// 5) ghi công Tatoeba: CREDITS.md liệt kê mọi câu (id + tác giả)
const rows = have.flatMap(lv => readJSON(SRC(lv, TL)).items.map(i => `${i.id}\t${i.au}\t${lv}`)).sort((a, b) => a.split('\t')[0] - b.split('\t')[0]);
const credits = `${T.head}\n\n${T.credit} lấy từ Tatoeba (https://tatoeba.org), giấy phép CC BY 2.0 FR (https://creativecommons.org/licenses/by/2.0/fr/). Sinh bởi \`node scripts/target/exam-es-check.mjs${TL === 'es' ? '' : ' --tl ' + TL} --write-credits\`.\n\n| Câu | Tác giả | Cấp |\n|---|---|---|\n${rows.map(r => '| ' + r.split('\t').join(' | ') + ' |').join('\n')}\n`;
if (process.argv.includes('--write-credits')) { fs.writeFileSync(D + 'CREDITS.md', credits); console.log('✓ ghi CREDITS.md'); process.exit(0); }
if (SRCOK && (!fs.existsSync(D + 'CREDITS.md') || fs.readFileSync(D + 'CREDITS.md', 'utf8') !== credits)) E(`${D}CREDITS.md cũ so với nguồn – chạy: node scripts/target/exam-es-check.mjs${TL === 'es' ? '' : ' --tl ' + TL} --write-credits`);

// 6) LanguageTool trên consigna (CI)
if (LT) {
  const url = process.env.LT_URL; if (!url) E('--lt cần LT_URL (scripts/ci/lt-up.sh ${TL})');
  else for (const lv of EX_LV) for (const x of [...tasks[lv].w, ...tasks[lv].s]) { const r = await ltErrors(url, TL, x.t); if (r.length) E(`LanguageTool ${lv}: “${x.t}” → ${r.join(' | ')}`); }
}
if (errs.length) { console.error(errs.map(e => '✗ ' + e).join('\n')); process.exit(1); }
console.log(`✓ exam-es-check ${TL}: ${have.length}/${EX_LV.length} cấp × ${EX_N} đề, ${ids.size} câu Tatoeba (${authors.size} tác giả), spec khớp §1, nhãn ${UI_LANGS.length} ngôn ngữ${LT ? ', LanguageTool 0 lỗi' : ''}`);
