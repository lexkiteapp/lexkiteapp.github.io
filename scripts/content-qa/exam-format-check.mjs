// 📐 Cổng format đề thi (P0.5, docs/CONTENT-WORLD-PLAN.md §4–5 · docs/CONTENT-QA.md §6).
//   node scripts/content-qa/exam-format-check.mjs            kiểm mọi đề/bộ hiện có theo content/exams/spec/*.json
//   … --json                                              + ghi reports/exam-format.json (cho content:score)
//   … --md <file>                                         + ghi bảng % đề qua cổng ra file Markdown
//   … --list                                              in toàn bộ lệch hiện tại dạng JSON (để soạn deviations.json bằng tay)
// Đếm phần / câu / thời gian / độ dài bài khớp spec; mọi câu có đáp án + lời giải + căn cứ (cue hoặc câu trích có trong bài/lời thoại).
// Lệch đã biết ghi ở content/exams/spec/deviations.json – CHỈ được bớt (no-cuts): lệch mới → đỏ; lệch đã sửa mà còn trong danh sách → đỏ (xoá dòng đó).
// Đỏ khi: thiếu/hỏng spec, đếm được 0 đề ở bất kỳ họ đề nào có dữ liệu, hoặc tổng = 0.
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../lib/content-load.mjs';
const P = (...a) => path.join(ROOT, ...a), J = f => JSON.parse(fs.readFileSync(P(f), 'utf8'));
const argv = process.argv.slice(2), ARG = new Set(argv);
const SPEC_IDS = ['ielts-ac', 'ielts-gt', 'toeic-lr', 'toeic-sw', 'toefl-2026', 'cam-a2', 'cam-b1', 'cam-b2', 'cam-c1', 'cam-c2'];
const fatal = [];

// ---------- 1) Spec: đủ 10 file, trường bắt buộc, tổng câu = tổng các phần ----------
const SPEC = {};
for (const id of SPEC_IDS) {
  const f = `content/exams/spec/${id}.json`;
  if (!fs.existsSync(P(f))) { fatal.push(`${f}: thiếu file spec`); continue; }
  let s; try { s = J(f); } catch (e) { fatal.push(`${f}: JSON hỏng (${e.message})`); continue; }
  SPEC[id] = s;
  if (s.id !== id) fatal.push(`${f}: id "${s.id}" ≠ tên file`);
  if (!s.verified || !s.verified.date || !(s.verified.sources || []).length) fatal.push(`${f}: thiếu verified.date/sources (phải đối chiếu trang chính thức)`);
  if (!s.scoring || !s.scoring.scale) fatal.push(`${f}: thiếu scoring.scale`);
  if (!(s.sections || []).length) fatal.push(`${f}: không có sections`);
  for (const sec of s.sections || []) {
    if (!sec.id || sec.minutes == null) fatal.push(`${f}: section ${sec.id || '?'} thiếu id/minutes`);
    const parts = sec.parts || sec.tasks || [];
    if (!parts.length) fatal.push(`${f}: ${sec.id} không có parts/tasks`);
    const known = parts.map(p => p.questions).filter(q => typeof q === 'number');
    if (typeof sec.questions === 'number' && known.length === parts.length && known.reduce((a, b) => a + b, 0) !== sec.questions) fatal.push(`${f}: ${sec.id} tổng câu các phần ${known.reduce((a, b) => a + b, 0)} ≠ ${sec.questions}`);
  }
  const hasW = (s.sections || []).some(x => /writing/.test(x.id)), hasS = (s.sections || []).some(x => x.id === 'speaking');
  const crit = k => (s.criteria && s.criteria[k]) || ((s.sections || []).find(x => x.id === k) || {}).criteria || ((s.sections || []).find(x => x.id === k && x.tasks) || {}).criteria;
  if (hasW && !(crit('writing') || []).length) fatal.push(`${f}: thiếu tiêu chí chấm Writing`);
  if (hasS && !(crit('speaking') || []).length && !(s.sections.find(x => x.id === 'speaking').parts || []).some(p => p.criteria)) fatal.push(`${f}: thiếu tiêu chí chấm Speaking`);
}
const sec = (id, s) => ((SPEC[id] || {}).sections || []).find(x => x.id === s) || {};
const parts = (id, s) => sec(id, s).parts || sec(id, s).tasks || [];

// ---------- 2) Dữ liệu đề ----------
const K = loadContent();
const words = s => (String(s || '').match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []).length;
const norm = s => String(s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/-{3,}\s*(?:\(\d+\))?\s*-*/g, ' | ').replace(/[^a-z0-9'|]+/g, ' ').trim();
// cue có thể có "…" hoặc chỗ trống "-------": tách khúc, mọi khúc ≥ 2 từ phải có trong nguồn
const frags = s => norm(String(s || '').replace(/\.\.\.|…/g, ' | ')).split('|').map(x => x.trim()).filter(x => x.split(' ').length >= 2 || x.length >= 4);
const quotes = s => [...String(s || '').matchAll(/["“]([^"”]{6,})["”]/g)].map(m => m[1]);
const has = v => Array.isArray(v) ? v.length > 0 && v.every(x => String(x).trim()) : v != null && String(v).trim() !== '';
// căn cứ: cue có trong nguồn, hoặc ít nhất một câu trích trong lời giải có trong nguồn
const evidence = (item, expl, src) => {
  const S = norm(src).replace(/\s*\|\s*/g, ' ');
  const found = t => { const fs_ = frags(t); return fs_.length > 0 && fs_.every(x => S.includes(x)); };
  if (has(item.cue) && found(item.cue)) return true;
  return quotes(expl).some(found);
};
const fam = {}, dev = {};
const unit = (f, u) => { (fam[f] = fam[f] || { units: [], label: f }).units.push(u); return u; };
const D = (f, u, k, msg) => { dev[`${f}/${u}/${k}`] = msg; };
const itemChecks = (f, u, items, src, explOf = it => it.explain) => {
  let noA = [], noE = [], noC = [];
  for (const it of items) {
    const n = Array.isArray(it.n) ? it.n.join('-') : it.n, e = explOf(it);
    if (!has(it.a) && it.a !== 0) noA.push(n);
    if (!has(e)) noE.push(n);
    if (!evidence(it, e, src)) noC.push(n);
  }
  if (noA.length) D(f, u, 'answer', `${noA.length} câu thiếu đáp án: ${noA.slice(0, 8).join(', ')}`);
  if (noE.length) D(f, u, 'explain', `${noE.length} câu thiếu lời giải: ${noE.slice(0, 8).join(', ')}`);
  if (noC.length) D(f, u, 'evidence', `${noC.length} câu thiếu căn cứ (cue/câu trích không tìm thấy trong bài): ${noC.slice(0, 8).join(', ')}`);
};
const scriptText = sc => (sc || []).map(s => s.say || s.t || s.text || '').join(' ');
const qCount = it => Array.isArray(it.n) ? it.n.length : 1;
const numbering = (f, u, items, from, to) => {
  const ns = items.flatMap(it => Array.isArray(it.n) ? it.n : [it.n]).sort((a, b) => a - b);
  const want = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  if (ns.join() !== want.join()) D(f, u, 'numbering', `số câu không liền ${from}–${to} (có ${ns.length}, đầu ${ns[0]}, cuối ${ns.at(-1)})`);
};

// IELTS Listening (ielts-ac và ielts-gt dùng chung)
const byTest = {};
for (const L of K.LISTENING || []) (byTest[L.test] = byTest[L.test] || []).push(L);
for (const [t, ps] of Object.entries(byTest)) {
  const f = 'ielts-listening', u = unit(f, 'test' + t), spec = parts('ielts-ac', 'listening');
  const nums = ps.map(p => p.part).sort();
  if (nums.join() !== spec.map(p => p.n).join()) D(f, u, 'parts', `phần ${nums.join(',')} ≠ spec ${spec.map(p => p.n).join(',')}`);
  let all = [];
  for (const p of ps) {
    const items = p.groups.flatMap(g => g.items || [g]), q = items.reduce((a, it) => a + qCount(it), 0), sp = spec.find(x => x.n === p.part);
    if (sp && q !== sp.questions) D(f, u, `part${p.part}.questions`, `Part ${p.part}: ${q} câu ≠ ${sp.questions}`);
    itemChecks(f, `${u}/part${p.part}`, items, scriptText(p.script));
    all = all.concat(items);
  }
  const tot = all.reduce((a, it) => a + qCount(it), 0);
  if (tot !== sec('ielts-ac', 'listening').questions) D(f, u, 'questions', `${tot} câu ≠ ${sec('ielts-ac', 'listening').questions}`);
  numbering(f, u, all, 1, sec('ielts-ac', 'listening').questions);
}

// IELTS Reading Academic / GT
for (const R of K.READTESTS || []) {
  const id = R.gt ? 'ielts-gt' : 'ielts-ac', f = R.gt ? 'ielts-reading-gt' : 'ielts-reading-ac', u = unit(f, R.id), S = sec(id, 'reading');
  if (R.passages.length !== S.sections) D(f, u, 'sections', `${R.passages.length} bài ≠ ${S.sections}`);
  const items = R.passages.flatMap(p => p.groups.flatMap(g => g.items || [g]));
  const q = items.reduce((a, it) => a + qCount(it), 0);
  if (q !== S.questions) D(f, u, 'questions', `${q} câu ≠ ${S.questions}`);
  numbering(f, u, items, 1, S.questions);
  const w = R.passages.reduce((a, p) => a + p.paras.reduce((b, x) => b + words(x.t), 0), 0);
  if (w < S.text_words.min || w > S.text_words.max) D(f, u, 'words', `tổng độ dài ${w} từ ngoài khoảng ${S.text_words.min}–${S.text_words.max}`);
  const E = (K.READ_EXPLAIN || {})[R.id] || {};
  const ex = it => { const k = Array.isArray(it.n) ? it.n : [it.n]; const e = k.map(n => E[n]).find(Boolean); return e && e.why; };
  for (const p of R.passages) itemChecks(f, `${u}/p${p.n}`, p.groups.flatMap(g => g.items || [g]), p.paras.map(x => x.t).join(' '), ex);
}

// IELTS Writing – bài mẫu đạt số từ tối thiểu (Task 1 / thư GT ≥ 150, Task 2 ≥ 250)
for (const m of K.MODELS || []) {
  const f = 'ielts-writing-models', u = unit(f, m.id), min = String(m.task) === '2' ? 250 : 150, w = words(m.text);
  if (w < min) D(f, u, 'words', `bài mẫu ${w} từ < tối thiểu ${min}`);
}
// IELTS Speaking – bộ đề 3 phần (Part 2 có thẻ đề + gợi ý)
for (const [i, s] of (K.SPEAK_MORE || []).entries()) {
  const f = 'ielts-speaking', u = unit(f, s.topic || 'set' + i);
  if (!(s.p1 || []).length || !(s.p3 || []).length || !s.p2 || !s.p2.q) D(f, u, 'parts', 'thiếu Part 1/2/3');
  else if ((s.p2.points || []).length < 3) D(f, u, 'cue-card', `thẻ Part 2 có ${(s.p2.points || []).length} gợi ý < 3`);
}
// Thi thử IELTS (mock.js): đồng hồ Reading/Writing đúng spec
{
  const src = fs.readFileSync(P('web/js/mock.js'), 'utf8'), f = 'ielts-mock', u = unit(f, 'mock');
  for (const s of ['reading', 'writing']) if (!src.includes(`countdown(${sec('ielts-ac', s).minutes * 60},`)) D(f, u, `${s}.minutes`, `không có đồng hồ ${sec('ielts-ac', s).minutes} phút cho ${s}`);
  if ((src.match(new RegExp(`countdown\\(${sec('ielts-ac', 'reading').minutes * 60},`, 'g')) || []).length < 2) D(f, u, 'timers', 'cần 2 đồng hồ 60 phút (Reading + Writing)');
}

// TOEIC Listening & Reading
const tl = {};
for (const L of (K.TOEIC || {}).listening || []) (tl[L.test] = tl[L.test] || []).push(L);
for (const R of (K.TOEIC || {}).reading || []) (tl[R.test] = tl[R.test] || []).push(R);
for (const [t, xs] of Object.entries(tl)) {
  const f = 'toeic-lr', u = unit(f, 'test' + t);
  const lis = xs.filter(x => x.part), rd = xs.find(x => x.parts);
  const L = sec('toeic-lr', 'listening'), Rs = sec('toeic-lr', 'reading');
  let all = [];
  for (const sp of L.parts) {
    const p = lis.find(x => x.part === sp.n);
    if (!p) { D(f, u, `part${sp.n}`, `thiếu Part ${sp.n}`); continue; }
    const items = p.groups.flatMap(g => g.items);
    if (items.length !== sp.questions) D(f, u, `part${sp.n}.questions`, `Part ${sp.n}: ${items.length} câu ≠ ${sp.questions}`);
    if (sp.sets && p.groups.length !== sp.sets) D(f, u, `part${sp.n}.sets`, `Part ${sp.n}: ${p.groups.length} nhóm ≠ ${sp.sets}`);
    const badOpt = items.filter(it => (it.options || []).length !== sp.options).map(it => it.n);
    if (badOpt.length) D(f, u, `part${sp.n}.options`, `Part ${sp.n}: ${badOpt.length} câu không đủ ${sp.options} phương án`);
    itemChecks(f, `${u}/part${sp.n}`, items, scriptText(p.script) + ' ' + items.map(it => (it.options || []).join(' ')).join(' '));
    all = all.concat(items);
  }
  if (!rd) D(f, u, 'reading', 'thiếu phần Reading');
  else for (const sp of Rs.parts) {
    const p = rd.parts.find(x => x.part === sp.n);
    if (!p) { D(f, u, `part${sp.n}`, `thiếu Part ${sp.n}`); continue; }
    const pas = p.passages || [{ text: '', groups: p.groups }];
    const items = pas.flatMap(x => x.groups.flatMap(g => g.items));
    if (items.length !== sp.questions) D(f, u, `part${sp.n}.questions`, `Part ${sp.n}: ${items.length} câu ≠ ${sp.questions}`);
    if (sp.sets && pas.length !== sp.sets) D(f, u, `part${sp.n}.sets`, `Part ${sp.n}: ${pas.length} bài ≠ ${sp.sets}`);
    if (sp.single) {
      const multi = x => /following\s+[^.]*\b(and)\b/i.test(x.groups.map(g => g.instr || '').join(' ') + ' ' + (x.title || '').replace(/^.*?(\band\b)/i, ' and '));
      const qs = pas.filter(x => !multi(x)).flatMap(x => x.groups.flatMap(g => g.items)).length, qm = items.length - qs;
      if (qs !== sp.single.questions || qm !== sp.multiple.questions) D(f, u, `part${sp.n}.split`, `Part 7 đơn/đa bài ${qs}/${qm} ≠ ${sp.single.questions}/${sp.multiple.questions}`);
    }
    const badOpt = items.filter(it => (it.options || []).length !== sp.options).map(it => it.n);
    if (badOpt.length) D(f, u, `part${sp.n}.options`, `Part ${sp.n}: ${badOpt.length} câu không đủ ${sp.options} phương án`);
    for (const x of pas) itemChecks(f, `${u}/part${sp.n}`, x.groups.flatMap(g => g.items), (x.text || '') + ' ' + x.groups.flatMap(g => g.items.map(it => (it.q || '') + ' ' + (it.options || []).join(' '))).join(' '));
    all = all.concat(items);
  }
  numbering(f, u, all, 1, L.questions + Rs.questions);
}

// TOEIC Speaking & Writing – ngân hàng theo dạng: thời gian từng câu + bài mẫu/tiêu chí; ghép được bao nhiêu đề đủ
{
  const f = 'toeic-sw', SW = K.TOEIC_SW || { speaking: [], writing: [] };
  const map = { read: 'read', picture: 'picture', respond: 'respond', info: 'info', opinion: 'opinion', 'picture-sentence': 'picture-sentence', request: 'request', essay: 'essay' };
  const spT = [...parts('toeic-sw', 'speaking').map(p => ['speaking', p]), ...parts('toeic-sw', 'writing').map(p => ['writing', p])];
  const pool = [...SW.speaking.map(x => ['speaking', x]), ...SW.writing.map(x => ['writing', x])];
  for (const [s, x] of pool) {
    const u = unit(f, x.id), sp = spT.find(([ss, p]) => ss === s && p.types[0] === map[x.task]);
    if (!sp) { D(f, u, 'type', `dạng "${x.task}" không có trong spec`); continue; }
    const p = sp[1];
    if (s === 'speaking') {
      const qs = x.questions || [x];
      const want = Array.isArray(p.resp_s) ? p.resp_s : [p.resp_s];
      if (x.questions ? qs.length !== p.questions : false) D(f, u, 'questions', `${qs.length} câu ≠ ${p.questions}`);
      const got = qs.map(q => q.secs), prep = qs.map(q => q.prep);
      if (got.join() !== want.slice(0, got.length).join()) D(f, u, 'resp_s', `thời gian nói ${got.join('/')} ≠ ${want.join('/')} giây`);
      if (prep.some(v => v !== p.prep_s)) D(f, u, 'prep_s', `thời gian chuẩn bị ${prep.join('/')} ≠ ${p.prep_s} giây`);
      if (x.task === 'read' ? !has(x.text) : qs.some(q => !has(q.model || x.model))) D(f, u, 'model', x.task === 'read' ? 'thiếu đoạn đọc' : 'thiếu câu trả lời mẫu');
      if (x.task !== 'read' && !(x.checklist || qs.some(q => q.tip) || x.tips)) D(f, u, 'criteria', 'thiếu tiêu chí/gợi ý chấm');
    } else {
      if (x.minutes !== p.minutes) D(f, u, 'minutes', `${x.minutes} phút ≠ ${p.minutes}`);
      if (!has(x.model)) D(f, u, 'model', 'thiếu bài mẫu');
      else if (p.min_words && words(x.model) < p.min_words) D(f, u, 'words', `bài mẫu ${words(x.model)} từ < ${p.min_words}`);
      if (!(x.checklist || []).length) D(f, u, 'criteria', 'thiếu checklist chấm');
    }
  }
  // đề đủ = mỗi dạng có đủ số câu của 1 đề
  const cnt = t => pool.filter(([, x]) => map[x.task] === t).reduce((a, [, x]) => a + 1, 0);
  const missing = spT.filter(([, p]) => !cnt(p.types[0])).map(([s, p]) => `${s} "${p.name}" (Q${p.q.join('–')})`);
  const u = unit(f, 'full-test');
  if (missing.length) D(f, u, 'coverage', `chưa ghép được đề đủ 19 câu – thiếu dạng: ${missing.join('; ')}`);
}

// TOEFL 2026 – mỗi bộ (set) so với một đề đủ
{
  const T = K.TOEFL || {}, sets = [...new Set(['reading', 'listening', 'writing', 'speaking'].flatMap(s => (T[s] || []).map(x => x.set)))].sort((a, b) => a - b);
  for (const n of sets) {
    const f = 'toefl-2026', u = unit(f, 'set' + n);
    const R = (T.reading || []).filter(x => x.set === n), L = (T.listening || []).filter(x => x.set === n), W = (T.writing || []).filter(x => x.set === n), S = (T.speaking || []).filter(x => x.set === n);
    // Reading: cw = số ô trống; còn lại = số câu
    const blanks = x => (String(x.text).match(/\{[^}]*\|[^}]*\}/g) || []).length;
    const rq = R.reduce((a, x) => a + (x.task === 'cw' ? blanks(x) : x.groups.reduce((b, g) => b + g.items.length, 0)), 0);
    const lq = L.reduce((a, x) => a + x.groups.reduce((b, g) => b + g.items.length, 0), 0);
    if (rq !== sec(f, 'reading').questions) D(f, u, 'reading.questions', `Reading ${rq} câu ≠ ${sec(f, 'reading').questions}`);
    if (lq !== sec(f, 'listening').questions) D(f, u, 'listening.questions', `Listening ${lq} câu ≠ ${sec(f, 'listening').questions}`);
    for (const t of parts(f, 'reading')) if (!R.some(x => x.task === t.types[0])) D(f, u, `reading.${t.types[0]}`, `Reading thiếu dạng ${t.name}`);
    for (const t of parts(f, 'listening')) if (!L.some(x => x.task === t.types[0])) D(f, u, `listening.${t.types[0]}`, `Listening thiếu dạng ${t.name}`);
    for (const x of R) {
      if (x.task === 'cw') { if ((x.explain || []).length !== blanks(x)) D(f, `${u}/${x.id}`, 'explain', `${blanks(x)} ô trống nhưng ${(x.explain || []).length} lời giải`); continue; }
      itemChecks(f, `${u}/${x.id}`, x.groups.flatMap(g => g.items), x.text || (x.paras || []).map(p => p.t || p).join(' '));
    }
    for (const x of L) itemChecks(f, `${u}/${x.id}`, x.groups.flatMap(g => g.items), scriptText(x.script) + ' ' + x.groups.flatMap(g => g.items.map(it => (it.options || []).join(' '))).join(' '));
    // Writing: Build a Sentence đủ 10 câu; email 7', discussion 10'; có bài mẫu + tiêu chí
    for (const t of parts(f, 'writing')) {
      const xs = W.filter(x => x.task === t.types[0]);
      if (!xs.length) { D(f, u, `writing.${t.types[0]}`, `Writing thiếu dạng ${t.name}`); continue; }
      if (t.types[0] === 'sentence') {
        const q = xs.reduce((a, x) => a + (x.items || []).length, 0);
        if (q < t.questions) D(f, u, 'writing.sentence', `Build a Sentence ${q} câu < ${t.questions}`);
        const bad = xs.flatMap(x => (x.items || []).filter(it => !(it.chunks || []).length || !has(it.explain)).map(it => it.n));
        if (bad.length) D(f, u, 'writing.sentence.explain', `${bad.length} câu Build a Sentence thiếu đáp án/lời giải`);
      } else for (const x of xs) {
        if (x.minutes !== t.minutes) D(f, `${u}/${x.id}`, 'minutes', `${x.minutes} phút ≠ ${t.minutes}`);
        if (!has(x.model)) D(f, `${u}/${x.id}`, 'model', 'thiếu bài mẫu');
        if (!(x.checklist || []).length) D(f, `${u}/${x.id}`, 'criteria', 'thiếu checklist chấm');
      }
    }
    // Speaking: Listen and Repeat 7 câu/bài; Interview 4 câu × 45 giây, có câu mẫu
    for (const t of parts(f, 'speaking')) {
      const xs = S.filter(x => x.task === t.types[0]);
      if (!xs.length) { D(f, u, `speaking.${t.types[0]}`, `Speaking thiếu dạng ${t.name}`); continue; }
      for (const x of xs) {
        const qs = x.sentences || x.questions || [];
        if (qs.length !== t.questions) D(f, `${u}/${x.id}`, 'questions', `${t.name}: ${qs.length} câu ≠ ${t.questions}`);
        if (t.resp_s && x.seconds !== t.resp_s) D(f, `${u}/${x.id}`, 'resp_s', `${x.seconds} giây ≠ ${t.resp_s}`);
        if (t.types[0] === 'interview' && qs.some(q => !has(q.model))) D(f, `${u}/${x.id}`, 'model', 'có câu thiếu câu trả lời mẫu');
      }
    }
  }
}

// Cambridge A2–C2 (docs/specs/cambridge.md): mỗi đề web/cpack/cambridge/<cấp>/t<N>.js so với spec cam-<cấp>
{
  const WTYPES = new Set(['email', 'story', 'essay', 'article', 'letter', 'review', 'report', 'proposal', 'note']);
  const RUB = K.CAMBRIDGE_RUBRIC || {};
  const txt = v => Array.isArray(v) ? v.join(' ') : String(v || '');
  const seen = new Set();
  for (const T of K.CAMBRIDGE || []) {
    const id = 'cam-' + T.level, f = id, u = unit(f, T.id || '?'), S = SPEC[id];
    if (!S) { D(f, u, 'spec', `không có spec ${id}`); continue; }
    if (T.spec !== id || T.id !== `${T.level}-t${T.n}`) D(f, u, 'id', `id/spec "${T.id}"/"${T.spec}" ≠ "${T.level}-t${T.n}"/"${id}"`);
    if (seen.has(T.id)) D(f, u, 'dup', 'trùng id đề'); seen.add(T.id);
    const optsOf = p => (p.texts || []).map(x => x.code).concat((p.options || []).map(code => String(code).split(' ')[0]));
    const paper = (key, secId) => {
      const sp = parts(id, secId), got = (T[key] || {}).parts || [];
      if (got.map(p => p.n).join() !== sp.map(p => p.n).join()) D(f, u, `${secId}.parts`, `phần ${got.map(p => p.n).join(',')} ≠ spec ${sp.map(p => p.n).join(',')}`);
      let all = [];
      for (const p of got) {
        const s = sp.find(x => x.n === p.n); if (!s) continue;
        if (!s.types.includes(p.type)) D(f, u, `${secId}.part${p.n}.type`, `dạng "${p.type}" ≠ spec ${s.types.join('/')}`);
        if (WTYPES.has(p.type)) { // phần viết: đề + ý bắt buộc + bài mẫu đủ số từ + gợi ý/kiểm ý (phản hồi sản sinh)
          if (s.min_words && p.min_words !== s.min_words) D(f, u, `${secId}.part${p.n}.min_words`, `min_words ${p.min_words} ≠ ${s.min_words}`);
          if (!has(p.prompt) || !has(p.model) || !(p.tips || []).length) D(f, u, `${secId}.part${p.n}.model`, 'thiếu đề/bài mẫu/gợi ý');
          else if (words(p.model) < (s.min_words || 0)) D(f, u, `${secId}.part${p.n}.words`, `bài mẫu ${words(p.model)} từ < ${s.min_words}`);
          if (p.points && (!(p.checks || []).length || p.checks.length !== p.points.length)) D(f, u, `${secId}.part${p.n}.checks`, 'mỗi ý bắt buộc cần 1 nhóm từ kiểm ý (checks)');
          if (!(RUB[T.level] && (RUB[T.level].writing || []).length)) D(f, u, 'rubric', `thiếu tiêu chí chấm viết ${T.level} trong web/cpack/cambridge/rubric.js`);
          continue;
        }
        const units = p.units || [p], items = units.flatMap(x => x.items || []);
        const q = items.reduce((a, it) => a + qCount(it), 0);
        if (s.questions != null && q !== s.questions) D(f, u, `${secId}.part${p.n}.questions`, `Part ${p.n}: ${q} câu ≠ ${s.questions}`);
        const codes = optsOf(p);
        const badA = items.filter(it => /mcq/.test(p.type) ? !((it.options || []).length >= 3 && it.options[it.a] != null) : /match/.test(p.type) ? !codes.includes(it.a) : !(Array.isArray(it.a) && it.a.length)).map(it => it.n);
        if (badA.length) D(f, u, `${secId}.part${p.n}.answer`, `${badA.length} câu đáp án không hợp lệ: ${badA.join(', ')}`);
        for (const x of units) {
          const src = key === 'listening' ? scriptText(x.script) : [txt(p.text), ...(p.texts || []).map(y => y.text), ...(x.items || []).map(it => txt(it.text))].join(' ');
          if (key === 'listening') {
            const sp_ = x.speakers || {}, bad = (x.script || []).filter(l => l.s && !sp_[l.s]);
            if (!(x.script || []).length || bad.length) D(f, u, `${secId}.part${p.n}.script`, 'thiếu lời thoại hoặc người nói không khai báo');
          }
          itemChecks(f, `${u}/${secId}.part${p.n}`, x.items || [], src);
        }
        all = all.concat(items);
      }
      return all;
    };
    const rw = paper('rw', 'reading-writing'), li = paper('listening', 'listening');
    numbering(f, u, rw, 1, rw.length); numbering(f, u, li, 1, li.length);
    // Speaking: đủ phần theo spec, có câu hỏi + câu trả lời mẫu (phản hồi sản sinh nói)
    const ssp = parts(id, 'speaking'), sg = ((T.speaking || {}).parts || []);
    if (sg.map(p => p.n).join() !== ssp.map(p => p.n).join()) D(f, u, 'speaking.parts', `phần ${sg.map(p => p.n).join(',')} ≠ spec ${ssp.map(p => p.n).join(',')}`);
    for (const p of sg) {
      const qs = p.type === 'interview' ? (p.phases || []).flatMap(x => [...(x.q || []), ...(x.extended ? [x.extended] : [])]) : [p.prompt, ...(p.follow || [])].filter(Boolean);
      if (qs.length < 4 || !Object.keys(p.models || {}).length) D(f, u, `speaking.part${p.n}`, `Part ${p.n}: ${qs.length} câu hỏi / ${Object.keys(p.models || {}).length} câu mẫu (cần ≥ 4 và ≥ 1)`);
      const orphan = Object.keys(p.models || {}).filter(k => !qs.includes(k));
      if (orphan.length) D(f, u, `speaking.part${p.n}.models`, `câu mẫu không khớp câu hỏi: ${orphan[0]}`);
    }
    if (!(RUB[T.level] && (RUB[T.level].speaking || []).length)) D(f, u, 'rubric.speaking', `thiếu tiêu chí chấm nói ${T.level}`);
  }
}

// ---------- 3) So với danh sách lệch đã biết (chỉ được bớt) ----------
const KNOWN_F = 'content/exams/spec/deviations.json';
const KNOWN = fs.existsSync(P(KNOWN_F)) ? J(KNOWN_F).known || {} : {};
if (ARG.has('--list')) { console.log(JSON.stringify(dev, null, 1)); process.exit(0); }
// Họ đề ĐÃ đạt chuẩn (live, học viên đang làm): cấm có bất kỳ lệch nào trong danh sách "đã biết" – lệch ở đây = đề sai chuẩn đang phục vụ người học (13/11/2026).
const STRICT = ['ielts-reading-gt/', 'toefl-2026/'];
for (const k of Object.keys(KNOWN)) if (STRICT.some(x => k.startsWith(x))) fatal.push(`đề live sai chuẩn: "${k}" – sửa nội dung (đủ số câu/độ dài), không ghi vào ${KNOWN_F}`);
for (const k of Object.keys(dev)) if (STRICT.some(x => k.startsWith(x)) && !fatal.some(m => m.includes(`"${k}"`))) fatal.push(`đề live sai chuẩn: "${k}" – ${dev[k]}`);
const fresh = Object.keys(dev).filter(k => !(k in KNOWN)), fixed = Object.keys(KNOWN).filter(k => !(k in dev));
for (const k of fresh) fatal.push(`LỆCH MỚI ${k}: ${dev[k]}`);
for (const k of fixed) fatal.push(`đã hết lệch – xoá "${k}" khỏi ${KNOWN_F} (danh sách chỉ được bớt)`);

// ---------- 4) Đếm & báo cáo ----------
const MUST = ['ielts-listening', 'ielts-reading-ac', 'ielts-reading-gt', 'ielts-writing-models', 'ielts-speaking', 'ielts-mock', 'toeic-lr', 'toeic-sw', 'toefl-2026'];
for (const f of MUST) if (!(fam[f] && fam[f].units.length)) fatal.push(`${f}: đếm được 0 đề/bộ – dữ liệu không nạp được hoặc bị mất`);
const rows = Object.values(fam).map(F => {
  const bad = new Set(Object.keys(dev).filter(k => k.startsWith(F.label + '/')).map(k => k.split('/')[1]));
  const pass = F.units.filter(u => !bad.has(u)).length;
  return { family: F.label, units: F.units.length, pass, pct: Math.round(100 * pass / F.units.length), deviations: Object.keys(dev).filter(k => k.startsWith(F.label + '/')).length };
});
const total = rows.reduce((a, r) => a + r.units, 0), pass = rows.reduce((a, r) => a + r.pass, 0);
if (!total) fatal.push('tổng số đề đếm được = 0');
const cam = SPEC_IDS.filter(x => x.startsWith('cam-')).map(x => `${x}: ${(fam[x] || { units: [] }).units.length} đề`);
const pct = total ? Math.round(1000 * pass / total) / 10 : 0;
const md = ['| Họ đề | Đơn vị | Qua cổng | % | Số lệch |', '|---|---|---|---|---|', ...rows.map(r => `| ${r.family} | ${r.units} | ${r.pass} | ${r.pct} % | ${r.deviations} |`), `| **Tổng** | **${total}** | **${pass}** | **${pct} %** | **${Object.keys(dev).length}** |`].join('\n');
console.log(md);
console.log(`Cambridge: ${cam.join(' · ')}`);
if (ARG.has('--json')) { fs.mkdirSync(P('reports'), { recursive: true }); fs.writeFileSync(P('reports/exam-format.json'), JSON.stringify({ total, pass, pct, rows, deviations: dev }, null, 1)); }
const mi = argv.indexOf('--md'); if (mi >= 0 && argv[mi + 1]) fs.writeFileSync(argv[mi + 1], md + '\n\n' + Object.entries(dev).map(([k, v]) => `- \`${k}\` – ${v}`).join('\n') + '\n');
if (fatal.length) { console.error(`❌ exam-format-check: ${fatal.length} lỗi\n` + fatal.slice(0, 40).map(s => '  - ' + s).join('\n')); process.exit(1); }
console.log(`✅ exam-format-check: ${total} đề/bộ · ${pct} % qua cổng · ${Object.keys(dev).length} lệch đã ghi trong ${KNOWN_F}`);
