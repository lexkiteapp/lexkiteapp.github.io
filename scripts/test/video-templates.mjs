// Test khuôn nội dung video (scripts/video/template.mjs, docs/VIDEO-PIPELINE.md §11) – không dựng, không mạng, < 1 s.
// Phủ: chính các khuôn (schema/cảnh/vai/từ vựng) · ví dụ vars → samples đồng bộ · mọi sample khuôn qua cổng tĩnh · cổng bắt đúng lỗi (đối thủ, CTA,
//   hook dài, ? trong ngoặc kép, vai không có clip, từ khóa vắng, hứa hẹn, sai thứ tự beat, sai bối cảnh) · ước lượng hook khớp log CI.
// Chạy: node scripts/test/video-templates.mjs
import fs from 'fs';
import * as V from '../video/lib.mjs';
import * as T from '../video/template.mjs';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const R = new URL('../../', import.meta.url), J = f => JSON.parse(fs.readFileSync(new URL(f, R), 'utf8'));
const ctx = T.loadCtx(), tpls = T.listTemplates();

// 1) Khuôn hợp lệ + đủ thể loại
const errs = tpls.flatMap(t => T.checkTemplate(t, ctx));
ok(!errs.length, 'khuôn hợp lệ: ' + errs.slice(0, 5).join(' | '));
for (const id of ['spot-the-mistake', 'word-of-the-day', 'confusing-pair', 'phrasal-verb', 'roleplay', 'ielts-speaking', 'pronunciation-pair', 'idiom-vs-textbook', 'quiz-ab']) ok(tpls.some(t => t.id === id), `có khuôn ${id}`);

// 2) Ví dụ: mỗi khuôn ≥ 1, sample sinh ra đúng bằng file đã commit, và qua mọi cổng tĩnh
const exs = T.examples();
for (const t of tpls) ok(exs.some(e => e.id === t.id), `khuôn ${t.id} có ví dụ trong templates/examples`);
for (const e of exs) {
  const out = T.fill(T.loadTemplate(e.id), e.vars), txt = JSON.stringify(out, null, 1) + '\n';
  ok(fs.existsSync(e.out) && fs.readFileSync(e.out, 'utf8') === txt, `${e.out.split('/').pop()} đồng bộ với vars (node scripts/video/template.mjs build)`);
  const r = T.preflight(out, ctx), f = T.failed(r);
  ok(!f.length, `${e.id} (${e.vars.scene}) qua cổng tĩnh: ${f.map(x => x.k + ': ' + x.note).join(' | ').slice(0, 400)}`);
  ok(r.stage && r.stage.lines.every(l => l.who === 'kit' || l.actors.some(a => a.role === 'speaker' && a.asset.kind === 'clip')), `${e.id}: mọi người nói có clip thật`);
}
for (const f of ['content/video/samples/cafe-order.json', 'content/video/samples/supermarket-price.json']) ok(!T.failed(T.preflight(J(f), ctx)).length, `${f} (mẫu cũ đã dựng CI) qua cổng tĩnh`);

// 3) Cổng bắt lỗi – biến thể từ 1 ví dụ chuẩn
const base = T.fill(T.loadTemplate('spot-the-mistake'), J('content/video/templates/examples/spot-the-mistake--she-doesnt.vars.json'));
const mut = fn => { const x = JSON.parse(JSON.stringify(base)); fn(x.script); return T.failed(T.preflight(x, ctx)).map(g => g.k); };
ok(!mut(() => {}).length, 'bản gốc sạch');
ok(mut(s => { s.lines[3].text = 'Duolingo says she doesn\'t like coffee.'; }).includes('brand'), 'chặn tên đối thủ');
ok(mut(s => { s.lines[5].text = 'See you next time!'; }).includes('cta'), 'chặn thiếu CTA lexkite');
ok(mut(s => { s.lines[0].text = 'Wait, is "she don\'t like coffee" actually correct English?'; }).includes('hook'), 'chặn hook > 2 s');
ok(mut(s => { s.lines[1].text = 'My notes say "Is that okay?"'; s.lines[1].expr = 'calm'; }).includes('t-beats'), 'dấu ? trong ngoặc kép → không nhận ra câu hỏi (sai cảm xúc beat)');
ok(mut(s => { s.lines[2].text = 'Guaranteed: you will never forget doesn\'t again.'; }).includes('claims'), 'chặn hứa hẹn');
ok(mut(s => { s.keywords = ['espresso']; }).includes('keywords'), 'chặn từ khóa không có trong lời thoại');
ok(mut(s => { [s.lines[2], s.lines[3]] = [s.lines[3], s.lines[2]]; }).includes('t-beats'), 'chặn sai thứ tự beat');
ok(mut(s => { s.lines[1].text = 'Was that okay? Great!'; }).length > 0, 'câu có great (right) ở beat cần ask → lỗi');
ok(mut(s => { s.lines[3].text = 'Stop saying it wrong: my brother doesn\'t drink coffee.'; }).includes('consistency'), 'Ama dùng clip sốc 2 lần (lặp clip) → cổng nhất quán');
ok(mut(s => { s.scene = 'office'; }).some(k => ['t-scene', 'consistency'].includes(k)), 'chặn bối cảnh ngoài khuôn/chủ đề');
ok(mut(s => { s.lines.forEach(l => { if (l.who === 'ama') l.who = 'leo'; }); }).some(k => ['cast', 'consistency', 't-beats'].includes(k)), 'chặn nhân vật không thuộc dàn bối cảnh / render sẽ đổi vai');
// office: Leo chỉ có clip vẫy tay → không được giảng
const office = J('content/video/samples/phrasal-verb--push-back.json'); office.script.lines[2].who = 'leo';
ok(T.failed(T.preflight(office, ctx)).some(g => g.k === 'consistency' || g.k === 't-beats'), 'Leo (chỉ có wave_clasp) giảng bài → chặn');
ok(T.failed(T.preflight(J('content/video/samples/sample.json'), ctx)).some(g => g.k === 'consistency'), 'sample.json cũ: Mia/Leo thiếu clip sốc/giảng → cổng nhất quán báo (như CI)');

// 4) fill: thiếu biến báo rõ, viết hoa đầu câu, chọn mẫu ổn định theo seed
let msg = ''; try { T.fill(T.loadTemplate('quiz-ab'), { topic: 'Quiz: x', scene: 'library', vars: { question: 'A or B?' } }); } catch (e) { msg = e.message; }
ok(/thiếu biến \{\{optionA\}\}/.test(msg), 'fill báo thiếu biến kèm mô tả');
ok(T.capFirst('"affect or effect?"') === '"Affect or effect?"' && T.capFirst('push back?') === 'Push back?', 'viết hoa đầu câu');
ok(JSON.stringify(T.fill(T.loadTemplate('spot-the-mistake'), J('content/video/templates/examples/spot-the-mistake--she-doesnt.vars.json'))) === JSON.stringify(base), 'fill tất định');

// 5) Ước lượng hook khớp số đo CI 17/10 (Kokoro: 1,8–1,9 s cho hook 5–6 âm tiết) + hằng số dùng chung với render
ok(Math.abs(V.hookEstSec('Wait, is "I\'m agree" wrong?') - 1.8) <= 0.25 && Math.abs(V.hookEstSec('Wait, is "give me" rude?') - 1.9) <= 0.25, 'hookEstSec sát số đo thật');
ok(V.syllables('procrastinate') === 4 && V.syllables('coffee') === 2 && V.syllables('the') === 1, 'đếm âm tiết');
ok(V.estLineSec('one two three four five six seven eight nine ten eleven twelve thirteen') === 5.3 && V.HOOK_MAX === 2.05, 'ước lượng câu = công thức bước tts');
ok(V.brandGate({ title: 't', lines: [{ who: 'bob', text: 'hi' }] }).ok === false && V.ctaGate({ lines: [{ beat: 'cta', text: 'lexkite.com' }] }).ok, 'cổng brand/CTA dùng chung');

if (fails) { console.log(`✗ video-templates: ${fails} lỗi`); process.exit(1); }
console.log(`✓ video-templates: ${tpls.length} khuôn · ${exs.length} ví dụ qua cổng tĩnh · bắt đúng 13 kiểu lỗi`);
