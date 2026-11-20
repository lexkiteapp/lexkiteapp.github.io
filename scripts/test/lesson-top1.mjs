// Test khung bài học "top-1" (docs/LESSON-ENGINE.md): nhãn dạng bài khớp thẻ, bong bóng không trống, từ gây nhiễu cùng chủ đề/ngữ pháp, câu đúng trình độ, thẻ chuỗi ngày không mâu thuẫn.
// Chạy: node scripts/test/lesson-top1.mjs  (lõi thuần + đọc nguồn ui.js; không mạng)
import fs from 'node:fs';
import vm from 'node:vm';
let total = 0, fails = 0;
const ok = (c, m) => { total++; if (!c) { fails++; console.error('✗', m); } else console.log('✓', m); };
const ctx = { self: {} }; ctx.globalThis = ctx.self; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('web/js/lesson/engine.js', 'utf8'), ctx);
const E = ctx.self.LessonEngine, UI = fs.readFileSync('web/js/lesson/ui.js', 'utf8');
const mk = (word, pos, extra = {}) => Object.assign({ word, pos, vi: word, def: 'x ' + word }, extra);

// 1. Nhãn dạng bài: sau khi chấm, chip/thanh trên cùng phải giữ nhãn của câu VỪA làm, không nhảy sang câu kế
ok(/function bar\(cur\)/.test(UI) && /bar\(it\)/.test(UI) && /\(cur && TITLE\(cur\)\)/.test(UI), 'bar(cur): nhãn dạng bài theo câu đang hiện, submit() truyền câu vừa chấm');

// 2. Bong bóng không bao giờ trống
ok(!E.hasLine('') && !E.hasLine('🔊 · · ·') && !E.hasLine(' . . ') && !E.hasLine(null), 'hasLine: rỗng / 🔊 · · · / chấm → ẩn bong bóng');
ok(E.hasLine('Great job!') && E.hasLine('Tuyệt vời!') && E.hasLine('Отлично'), 'hasLine: có lời thật (mọi chữ viết) → hiện');

ok(/bub\.hidden = !\/\[\\p\{L\}\\p\{N\}\]\/u\.test\(v\)/.test(fs.readFileSync('web/js/lesson/teacher.js', 'utf8')) && /show: false/.test(UI) && !/show: cap \? false : RADIO/.test(UI), 'teacher.line ẩn bong bóng khi không có chữ; say() không đặt "🔊 · · ·" vào bong bóng bài tập');

// 3. Từ gây nhiễu cùng chủ đề + ngữ pháp
const routine = [mk('breakfast', 'noun', { topic: 'daily' }), mk('bath', 'noun', { topic: 'daily' }), mk('wash', 'noun', { topic: 'daily' }), mk('shower', 'noun', { topic: 'daily' })];
const off = [mk('salary', 'noun', { topic: 'work' }), mk('key card', 'noun', { topic: 'travel' }), mk('decide', 'verb'), mk('afraid', 'adjective')];
const d = E.distract('breakfast', 'noun', off.concat(routine), 3, E.rng(5), { modern: true, near: routine });
ok(d.length === 3 && d.every(w => routine.some(r => r.word === w)), `gap "have a ___ in the morning": nhiễu cùng chủ đề (${d.join(', ')}) — không salary/key card`);
const dv = E.distract('decide', 'verb', [mk('consider', 'verb'), mk('stop', 'verb'), mk('walk', 'verb'), mk('salary', 'noun'), mk('make', 'verb'), mk('arrive', 'verb')], 3, E.rng(3), { modern: true, form: 'decided' });
ok(dv.length === 3 && dv.every(w => /ed$/.test(w)) && !dv.includes('stoped') && !dv.includes('salaryed'), `chỗ trống "decided": nhiễu cùng dạng -ed, không sinh từ sai chính tả (${dv.join(', ')})`);
ok(E.inflect('arrive', 'ing') === 'arriving' && E.inflect('study', 'ed') === 'studied' && E.inflect('watch', 's') === 'watches' && E.inflect('stop', 'ing') === '' && E.inflect('key card', 'ed') === '', 'inflect: quy tắc đều; từ khó/cụm → bỏ');
ok(E.formKind('considering', 'consider') === 'ing' && E.formKind('go', 'go') === '', 'formKind');
// build: đáp án gap không bị lẫn nhiễu cùng chữ và nhiễu không lấy chữ có trong câu
const cards = [mk('wake', 'verb', { ex: 'I wake up at six every morning.', sentences: [{ en: 'I wake up at six every morning.', vi: 'x' }] }), mk('shower', 'noun', { ex: 'I take a shower after I wake.', sentences: [] }), mk('morning', 'noun', { ex: 'Good morning to everyone here.' }), mk('breakfast', 'noun', { ex: 'We have breakfast at seven today.' })];
const picks = cards.map(c => ({ card: c, why: 'new' }));
const items = E.build(picks, { seed: 11, only: ['gap'], pool: off, near: [], perWord: 1, vi: true });
ok(items.length >= 3 && items.every(it => it.options.length === 4 && new Set(it.options).size === 4), 'build gap: 4 phương án khác nhau');
ok(items.every(it => it.options.filter(o => /salary|key card/.test(o)).length <= 1), 'build gap: nhiễu ưu tiên từ cùng bài (tối đa 1 từ lạc chủ đề khi bài chỉ có 4 từ)');

// 3b. Đường cũ giữ nguyên cho native (vectors/lesson.json): không near/level → build y như trước
const legacy = E.build(picks, { seed: 11, only: ['gap'], pool: off, perWord: 1 });
ok(legacy.length >= 3 && legacy.every(it => it.options.length === 4), 'build không near/level = đường cũ (khớp vectors native)');

// 4. Câu đúng trình độ mục tiêu
const multi = mk('plan', 'verb', { sentences: [{ en: 'I plan a trip.', vi: 'a' }, { en: 'Governments should plan carefully for long term climate change.', vi: 'b' }, { en: 'We plan to meet at noon today.', vi: 'c' }] });
const nA1 = E.toks(E.sentenceOf(multi, true, 1).text).length, nC1 = E.toks(E.sentenceOf(multi, true, 5).text).length;
ok(nA1 <= 5 && nC1 >= 9, `sentenceOf theo trình độ: A1 ${nA1} từ, C1 ${nC1} từ`);
ok(E.sentLevel(2, 'ielts', 7.5) === 3 && E.sentLevel(5, 'ielts', 5) === 3 && E.sentLevel(2, 'general', 6) === 3 && E.sentLevel(4, 'ielts', 8) === 5 && E.sentLevel(2, 'general', 0) === 2, 'sentLevel = min(mục tiêu, trình độ + 1)');
ok(/level: lvlS/.test(UI) && /lvlS = E\.sentLevel\(/.test(UI), 'ui.js truyền level vào E.build');

// 5. Thẻ chuỗi ngày: chuỗi hiện tại ≠ số ngày học trong tuần
const key = x => x.getFullYear() + '-' + x.getMonth() + '-' + x.getDate();
const wed = new Date(2026, 10, 18, 10), k = x => key(new Date(2026, 10, x));
const act = new Set([k(16), k(18)]); // T2 + T4 (không liền)
const wk = E.weekDots(act, wed, key);
ok(wk.n === 2 && wk.on[0] && !wk.on[1] && wk.on[2] && wk.today === 2, 'weekDots: 2 ngày học trong tuần, không liền nhau');
ok(E.runOf(act, wed, key) === 1, 'runOf: chuỗi liền tới hôm nay = 1 (không phải 2) – hai số tách nhãn');
ok(E.runOf(new Set([k(16), k(17), k(18)]), wed, key) === 3 && E.runOf(new Set(), wed, key) === 1, 'runOf: 3 ngày liền = 3; chưa có ngày nào = 1 (hôm nay)');
ok(/weekDots\(/.test(UI) && /Tuần này/.test(UI) && /Chuỗi hiện tại/.test(UI), 'finishV2 dùng weekDots + nhãn "Chuỗi hiện tại" / "Tuần này"');

// 6. Hai giọng giống nhau → một loa
ok(E.sameVoice('/ˈbɹɛkfəst/', '/ˈbɹɛkfəst/') && !E.sameVoice('/kənˈsɪd.ər/', '/kənˈsɪd.ɚ/') && !E.sameVoice('', ''), 'sameVoice: UK = US → 1 loa 1 IPA');

console.log(`${total - fails}/${total} lesson-top1`); process.exit(fails ? 1 : 0);
