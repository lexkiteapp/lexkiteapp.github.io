// Mini-test biến thể từ Sổ lỗi sai (web/js/mistake-variant.js, spec upgrade-2026-11 #9): chọn lỗi đến hạn, sinh câu hỏi KHÁC lỗi gốc,
// lịch = FSRS thật (Core.SRS) – không bộ lập lịch riêng; làm sai không hẹn lại trong hôm nay; 2 lượt đúng liên tiếp → đã nắm.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// core.js + mistake-variant.js THẬT trong vm (không DOM); kho lưu giả trong bộ nhớ (như chrome.storage)
const mem = {}, window = {};
Object.assign(window, {
  chrome: { storage: { local: { get: async k => (typeof k === 'string' ? (k in mem ? { [k]: structuredClone(mem[k]) } : {}) : structuredClone(mem)), set: async o => { Object.assign(mem, structuredClone(o)); }, remove: async k => { delete mem[k]; } } } },
  console, structuredClone, Promise, JSON, Date, Math, setTimeout, clearTimeout, Intl, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, navigator: { onLine: true }, location: { hostname: 'lexkite.com', protocol: 'https:', hash: '#/mistakes', search: '' },
  document: { hidden: false, head: { appendChild() {} }, createElement: () => ({}), getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} }, addEventListener() {},
  t: (k, p) => { let s = String(k); if (p) for (const [a, b] of Object.entries(p)) s = s.replaceAll('{' + a + '}', b); return s; },
  UI: { $: () => null, $$: () => [], esc: x => x, toast() {}, icon: () => '', wordRegex: w => new RegExp('\\b' + w + '\\b', 'i') },
  I18N: { lang: () => 'vi', meanLang: () => 'vi' }, IELTS_DATA: { INDEX: {} },
  App: { state: { cards: {} }, view: {}, meanOf: w => w.vi || '', allWords: () => [] },
});
window.self = window.window = window; vm.createContext(window);
for (const f of ['web/js/core.js', 'web/js/mistake-variant.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), window, { filename: f });
const { MVar } = window, DAY = 864e5, NOW = Date.UTC(2026, 10, 12, 9, 0, 0);

const W = (word, vi, pos, ex) => ({ word, vi, pos, ex, ipa: '' });
const POOL = [W('mitigate', 'giảm nhẹ', 'v', 'We must mitigate the risks.'), W('exacerbate', 'làm trầm trọng', 'v', ''), W('alleviate', 'làm dịu', 'v', ''), W('curtail', 'cắt giảm', 'v', ''), W('abundant', 'dồi dào', 'adj', ''), W('scarce', 'khan hiếm', 'adj', '')];
const env = (rnd = () => 0.3) => ({ word: r => POOL.find(w => w.word === r), pool: () => POOL, lesson: id => ({ id, emoji: '🧩', quiz: [{ q: 'She ___ here since 2010.', options: ['lives', 'has lived', 'lived'], answer: 1, explain: 'since → present perfect' }, { q: 'I ___ him twice this week.', options: ['saw', 'have seen', 'see'], answer: 1, explain: 'this week → present perfect' }] }), meanOf: w => w.vi, rnd });

// 1. Đến hạn: lỗi mới nghỉ 12 giờ; không có ref / đã hiểu / loại khác → không hỏi
const old = { key: 'vocab|a', kind: 'vocab', ref: 'mitigate', q: 'Nghĩa của “mitigate”?', answer: 'giảm nhẹ', at: NOW - DAY, n: 2 };
const fresh = { key: 'vocab|b', kind: 'vocab', ref: 'curtail', q: 'x', at: NOW - 3600e3, n: 1 };
const noRef = { key: 'grammar|c', kind: 'grammar', q: 'x', at: NOW - DAY }, fixed = { ...old, key: 'vocab|d', fixed: true }, rd = { key: 'reading|e', kind: 'reading', ref: 'p1', at: NOW - DAY };
assert.deepEqual(MVar.due([old, fresh, noRef, fixed, rd], NOW).map(x => x.key), ['vocab|a'], 'chỉ lỗi từ/ngữ pháp có ref, đã nghỉ ≥ 12 giờ, chưa hiểu');
assert.equal(MVar.due([{ ...old, vs: { srs: { due: NOW + DAY } } }], NOW).length, 0, 'đã có lịch FSRS: chưa tới hạn thì không hỏi');
assert.equal(MVar.due([{ ...old, vs: { srs: { due: NOW - 1 } } }], NOW).length, 1, 'tới hạn FSRS thì hỏi');

// 2. Từ vựng: câu hỏi khác lỗi gốc, 4 phương án khác nhau, đáp án đúng nằm trong đó
const q1 = MVar.make({ ...old, n: 1 }, env()), q2 = MVar.make({ ...old, n: 2 }, env());
assert.match(q1.q, /^Điền từ: We must ___ the risks\.$/, 'lần lẻ + có câu ví dụ → điền từ bằng câu ví dụ KHÁC');
assert.equal(q1.options[q1.answer], 'mitigate');
assert.match(q2.q, /^Nghĩa của “mitigate”\?$/);
assert.equal(q2.options[q2.answer], 'giảm nhẹ');
for (const q of [q1, q2]) { assert.equal(q.options.length, 4); assert.equal(new Set(q.options).size, 4, 'phương án không trùng'); }
const sameQ = MVar.make({ ...old, n: 1, q: 'Điền từ: We must ___ the risks.' }, env());
assert.match(sameQ.q, /^Nghĩa của/, 'câu ví dụ đã hỏi ở lỗi gốc thì không lặp lại – đổi sang dạng chọn nghĩa');
assert.equal(MVar.make({ ...old, ref: 'unknownword' }, env()), null, 'không có dữ liệu từ → bỏ qua, không đoán');
assert.equal(MVar.make({ ...old }, { ...env(), pool: () => [POOL[0]] }), null, 'thiếu phương án nhiễu → bỏ qua');

// 3. Ngữ pháp: câu khác trong cùng bài (cùng quy tắc), không phải câu đã sai
const g = { key: 'grammar|f', kind: 'grammar', ref: 'present-perfect', q: 'She ___ here since 2010.', answer: 'has lived', at: NOW - DAY, n: 1 };
const gq = MVar.make(g, env());
assert.equal(gq.q, 'I ___ him twice this week.', 'câu ngữ pháp khác với câu đã sai');
assert.equal(gq.options[gq.answer], 'have seen');
assert.equal(MVar.make({ ...g, q: 'I ___ him twice this week.' }, env()).q, 'She ___ here since 2010.');

// 4. Lịch: FSRS thật, hẹn không sớm hơn sáng mai; sai không bị hỏi lại trong hôm nay; 2 lượt đúng → đã nắm
const SRS = window.Core.SRS, x = { ...old };
MVar.grade(x, true, NOW);
assert.ok(x.vs.srs.due >= NOW + 3600e3 && x.vs.srs.due > NOW, 'đúng → hẹn ngày sau (khoảng FSRS)');
assert.ok(x.vs.srs.S > 0 && x.vs.srs.reps === 2, 'trạng thái là FSRS của Core.SRS.review (S, reps)');
assert.equal(x.fixed, undefined);
MVar.grade(x, true, x.vs.srs.due);
assert.equal(x.fixed, true, '2 lượt đúng liên tiếp → đã nắm (ra khỏi sổ)');
const y = { ...old }; MVar.grade(y, false, NOW);
assert.ok(y.vs.srs.due > NOW + 3600e3 && !y.fixed, 'sai → không hỏi lại ngay (≥ sáng mai), vẫn ở trong sổ');
assert.equal(MVar.due([y], NOW).length, 0, 'sau khi làm xong: hôm nay không còn gợi ý');
assert.ok(typeof SRS.review === 'function' && !/setInterval|schedule\(/.test(fs.readFileSync('web/js/mistake-variant.js', 'utf8').replace(/Sync\.schedule/g, '')), 'không có bộ lập lịch riêng');

// 5. Gợi ý trên Hôm nay: 1 việc, giọng nhẹ nhàng, không đếm tội
await window.Core.Store.set('mistakes', [{ ...old, at: Date.now() - DAY }, { ...old, key: 'vocab|z', ref: 'curtail', at: Date.now() - DAY }]);
const task = await MVar.todayTask();
assert.equal(task.href, '#/mistakes?variant=1');
assert.equal(task.t, 'Mini-test biến thể');
assert.ok(task.mins <= 3 && !/(quên|bỏ lỡ|chưa làm|miss|forgot|overdue)/i.test(task.sub), 'ngắn, không gây áp lực');
await window.Core.Store.set('mistakes', []);
assert.equal(await MVar.todayTask(), null, 'không có lỗi đến hạn → không gợi ý');

console.log('✓ mistake-variant: đến hạn, câu hỏi biến thể (từ + ngữ pháp), lịch FSRS, gợi ý Hôm nay');
