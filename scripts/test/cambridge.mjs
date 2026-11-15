// 🎓 Cambridge A2–C2 (docs/specs/cambridge.md): dữ liệu đề nạp được, MỌI file đề có trong gói tải lười của app (không thì app không thấy đề),
//   bài mẫu viết tự qua chính bộ kiểm ý của màn thi (checks + từ nối + số từ), audio Kokoro có đủ câu nghe + câu hỏi Speaking trong corpus CI.
//   Cấu trúc/đáp án/căn cứ theo spec: scripts/content-qa/exam-format-check.mjs (chạy riêng trong npm test).
import fs from 'node:fs'; import vm from 'node:vm';
import { loadContent } from '../lib/content-load.mjs'; import { collect } from '../sentence-audio/corpus.mjs';
const errs = [], C = loadContent(), T = C.CAMBRIDGE || [];
if (!T.length) errs.push('không nạp được đề Cambridge nào (web/cpack/cambridge/<cấp>/t<N>.js)');
if (!T.some(x => x.id === 'a2-t1' && x.gold)) errs.push('mất đề gold a2-t1');
// 1) file đề ↔ gói "cambridge" trong web/js/app.js
const app = fs.readFileSync('web/js/app.js', 'utf8'), m = app.match(/\n\s*cambridge: \[([^\]]*)\]/), bundle = m ? m[1] : '';
for (const l of fs.readdirSync('web/cpack/cambridge').filter(x => /^(a2|b1|b2|c1|c2)$/.test(x))) for (const f of fs.readdirSync('web/cpack/cambridge/' + l).filter(f => /\.js$/.test(f))) {
  if (!/^t\d+\.js$/.test(f)) errs.push(`web/cpack/cambridge/${l}/${f}: tên file phải là t<N>.js`);
  else if (!bundle.includes(`'cpack/cambridge/${l}/${f}'`)) errs.push(`web/cpack/cambridge/${l}/${f}: chưa có trong gói cambridge của web/js/app.js`);
}
for (const f of ['cpack/cambridge/rubric.js', 'js/cambridge.js', 'js/qengine.js']) if (!bundle.includes(`'${f}'`)) errs.push(`gói cambridge thiếu ${f}`);
// 2) helper chấm viết của màn thi (chạy thật trong vm) – bài mẫu phải qua đủ ý, đủ từ, ≥ 2 từ nối
const ctx = { self: {}, console, UI: { $: () => null, $$: () => [], esc: s => s }, t: s => s };
ctx.self = ctx; ctx.window = ctx; ctx.App = { state: { game: {} }, routes: {}, view: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('web/js/qengine.js', 'utf8'), ctx); vm.runInContext(fs.readFileSync('web/cpack/cambridge/rubric.js', 'utf8'), ctx); vm.runInContext(fs.readFileSync('web/js/cambridge.js', 'utf8'), ctx);
const H = ctx.App.cambridge, R = ctx.CAMBRIDGE_RUBRIC;
if (!H || typeof ctx.App.routes.cambridge !== 'function') errs.push('cambridge.js không đăng ký routes.cambridge / App.cambridge');
else {
  if (H.wc("I'd like to see the new film.") !== 7) errs.push('wc đếm sai');
  if (H.pointHits('We can meet outside', [['film'], ['meet']]).join() !== 'false,true') errs.push('pointHits sai');
  // mỗi nhóm câu có đúng 1 khung [data-g] (lỗi 05/11: Part 1 đẩy thêm nhóm rỗng → nộp bài lỗi) + mọi câu có ô trả lời
  for (const x of T) for (const pp of ['rw', 'listening']) {
    const { groups, html } = H.build(x, pp), ids = groups.map(([k, j]) => `${k}-${j}`);
    for (const id of ids) if ((html.match(new RegExp(`data-g="${id}"`, 'g')) || []).length !== 1) errs.push(`${x.id} ${pp}: nhóm ${id} không có đúng 1 khung data-g`);
    const n = groups.reduce((a, [, , g]) => a + g.items.length, 0), boxes = (html.match(/data-item="\d+"/g) || []).length;
    if (boxes !== n) errs.push(`${x.id} ${pp}: ${n} câu nhưng ${boxes} ô trả lời`);
    // lỗi 14/11: bài nghe nối hiện khung lựa chọn A–H 2 lần (khung của cambridge.js + khung của QE) → mỗi bài nghe tối đa 1 khung
    for (const u of html.split('class="toeic-u"').slice(1)) if ((u.match(/class="lq-box"/g) || []).length > 1) errs.push(`${x.id} ${pp}: khung lựa chọn hiện trùng trong một bài nghe`);
  }
  for (const x of T) for (const p of (x.rw || {}).parts || []) if (p.model) {
    const miss = H.pointHits(p.model, p.checks).map((h, i) => h ? null : i + 1).filter(Boolean);
    if (miss.length) errs.push(`${x.id} Part ${p.n}: bài mẫu không qua kiểm ý ${miss.join(',')} (checks quá hẹp hoặc bài mẫu thiếu ý)`);
    if (H.wc(p.model) < p.min_words) errs.push(`${x.id} Part ${p.n}: bài mẫu < ${p.min_words} từ`);
    if (H.linkersUsed(p.model, (R[x.level] || {}).linkers).length < 2) errs.push(`${x.id} Part ${p.n}: bài mẫu dùng < 2 từ nối`);
    // kiểm ý không được đạt với bài rỗng / lạc đề
    if (H.pointHits('I like my school. It is big.', p.checks).some(Boolean)) errs.push(`${x.id} Part ${p.n}: checks quá rộng (bài lạc đề vẫn đạt ý)`);
  }
}
// 3) audio CI: mọi câu nghe + câu hỏi Speaking có trong corpus (scripts/sentence-audio/corpus.mjs)
const { groups } = collect(), lines = T.reduce((a, x) => a + ((x.listening || {}).parts || []).flatMap(p => p.units).flatMap(u => u.script).filter(l => l.say || l.t).length, 0);
if (!(groups.get('cambridge-listening') || new Set()).size || (groups.get('cambridge-listening').size < lines * 0.95)) errs.push(`corpus audio thiếu câu nghe Cambridge (${(groups.get('cambridge-listening') || new Set()).size}/${lines})`);
if (!(groups.get('cambridge-speaking') || new Set()).size) errs.push('corpus audio thiếu câu hỏi Speaking Cambridge');
if (errs.length) { console.error('✗ cambridge:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log(`✓ cambridge: ${T.length} đề (${[...new Set(T.map(x => x.level))].join(', ')}), gói app đủ file, bài mẫu qua kiểm ý, ${groups.get('cambridge-listening').size} câu nghe + ${groups.get('cambridge-speaking').size} câu Speaking vào corpus audio`);
