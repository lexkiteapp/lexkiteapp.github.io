// 📈 Đầu ra 3–6 tháng (docs/specs/outcomes-3-6m.md): lõi chỉ số + rubric + gộp lần đo + đề song song + nối route. Chạy: node scripts/test/outcomes.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const R = p => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const ctx = { console }; ctx.self = ctx; vm.createContext(ctx);
for (const f of ['web/js/writecheck-rules.js', 'web/cpack/outcomes/forms.js', 'web/cpack/outcomes-app/outcomes-core.js']) vm.runInContext(R(f), ctx, { filename: f });
const O = ctx.Outcomes, F = ctx.OUTCOME_FORMS;
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

// 1. Chỉ số cơ bản
ok(O.words("I don't know, it's fine.").length === 5, 'words');
ok(O.mattr(O.words('a a a a')) === 0.25 && O.mattr(O.words('one two three')) === 1, 'mattr ngắn = TTR');
const long = Array.from({ length: 60 }, (_, i) => 'w' + (i % 30)).join(' ').replace(/w(\d+)/g, (m, d) => 'word' + 'abcdefghijklmnopqrstuvwxyzabcd'[d]);
ok(O.mattr(O.words(long)) === 0.52 && O.mattr(O.words(long), 25) > 0.9, 'mattr cửa sổ trượt 50 (25 thổi phồng)');
const sp = O.speech({ text: 'my brother he go to the market every day and I am agree that it is a good idea because the fruit there is fresh and cheap', sec: 20 });
ok(O.speech({ text: sp.text || 'a '.repeat(30), sec: 4 }).few && O.speech({ text: 'a '.repeat(30), sec: 4 }).wpm === 0, 'nói < 10 giây → few, không chấm trôi chảy (lỗi thật: 2 giây ra A1)');
ok(sp.w === 27 && sp.wpm === 81 && !sp.few, 'speech: số từ + wpm ' + sp.w + '/' + sp.wpm);
ok(sp.errs['lk:sva-3'] === 1 && sp.errs['lk:be-agree'] === 1 && sp.epw === 7.4, 'speech: LK_WRITE bắt lỗi (he go, am agree) ' + JSON.stringify(sp.errs));
ok(O.speech({ text: 'hello there', sec: 2 }).wpm === 0 && O.speech({ text: 'hello there', sec: 2 }).few, 'nói quá ngắn → few, không chia cho ~0 giây');
const rd = O.read({ target: 'My name is Sam and I live near the station.', heard: 'my name is sam and i live near station', sec: 4 });
ok(rd.acc === 90 && rd.wpm === 0, 'read: % khớp LCS, < 5 giây không tính wpm');
ok(O.read({ target: 'a b c', heard: 'c b a', sec: 10 }).acc === 33, 'read: theo thứ tự');
const wr = O.writing({ text: 'Dear Anna, I am writing to ask about the meeting. However, I cannot come on Monday because I have a dentist appointment. Could we meet on Tuesday or Wednesday instead? Thank you for understanding. Best wishes, Tom' });
ok(wr.w === 37 && wr.sl === 7.4 && wr.link === 8.1 && wr.epw === 0 && !wr.few, 'writing: số từ, độ dài câu, từ nối');

// 2. Rubric: đơn điệu, low = ngược chiều, biên đúng
for (const [k, r] of Object.entries(O.RUBRIC)) { const a = r.at; ok(a.length === 5 && a.every((v, i) => !i || (r.low ? v < a[i - 1] : v > a[i - 1])), 'rubric đơn điệu: ' + k); }
ok(O.level('wpm', 54) === 'A1' && O.level('wpm', 55) === 'A2' && O.level('wpm', 200) === 'C2', 'level wpm biên');
ok(O.level('epw', 20) === 'A1' && O.level('epw', 15) === 'A2' && O.level('epw', 0) === 'C2', 'level epw (càng thấp càng tốt)');
ok(O.level('wpm', null) === null && O.level('nope', 3) === null, 'level thiếu dữ liệu → null');

// 3. Ước tính: trung vị thấp, cần ≥ 2 khía cạnh, bỏ phần quá ngắn
const C = { sp: { w: 120, wpm: 110, mattr: 0.7, epw: 5, few: false }, rd: { acc: 88, w: 45 }, wr: { w: 100, sl: 12, link: 2, mattr: 0.66, epw: 7, few: false } };
const e = O.estimate(C);
ok(e.fl === 'B2' && e.ph === 'B2' && e.rg === 'B2' && e.ac === 'B2' && e.wr === 'B1' && e.all === 'B2', 'estimate: ' + JSON.stringify(e));
const e2 = O.estimate({ sp: { w: 5, few: true, wpm: 300, mattr: 1, epw: 0 }, rd: null, wr: null });
ok(e2.fl === null && e2.all === null, 'estimate: nói 5 từ không được chấm C2');
ok(O.estimate({}).all === null, 'estimate rỗng');
ok(O.estimate({ sp: { w: 41, sec: 2, wpm: 0, mattr: 0.8, epw: 2, few: false } }).fl === null, 'bản ghi cũ few:false nhưng 2 giây → vẫn chưa chấm trôi chảy');
const hi = O.estimate({ sp: { w: 200, wpm: 190, mattr: 0.95, epw: 0, few: false }, rd: { acc: 100, w: 50 }, wr: { w: 250, sl: 25, link: 6, mattr: 0.95, epw: 0, few: false } });
ok(hi.ac === 'B2' && hi.rg === 'B2' && hi.fl === 'C1' && hi.ph === 'C1' && hi.wr === 'C1' && hi.all === 'C1', 'trần khía cạnh: số đo máy không hứa C2 ' + JSON.stringify(hi));
ok(O.estimate({ sp: { w: 25, wpm: 100, mattr: 0.9, epw: 2, few: false }, rd: { acc: 80, w: 40 } }).rg === null, 'vốn từ cần ≥ 50 từ');

// 4. Gộp lần đo: hợp, giao hoán, lũy đẳng, giữ tối đa 36
const A = [{ id: 'x1', at: 1 }, { id: 'x2', at: 5 }], B = [{ id: 'x3', at: 3 }, { id: 'x2', at: 5 }];
const ab = JSON.stringify(O.merge(A, B)), ba = JSON.stringify(O.merge(B, A));
ok(ab === ba && JSON.parse(ab).map(c => c.id).join() === 'x1,x3,x2', 'merge giao hoán + sắp theo thời gian');
ok(JSON.stringify(O.merge(JSON.parse(ab), JSON.parse(ab))) === ab, 'merge lũy đẳng');
ok(O.merge(Array.from({ length: 50 }, (_, i) => ({ id: 'k' + i, at: i })), []).length === 36, 'merge trần 36');
ok(O.merge([null, { at: 1 }], undefined).length === 0, 'merge bỏ bản ghi hỏng');

// 5. Lịch 4 tuần
const D = 864e5;
ok(O.due([]).due && O.due([]).first, 'chưa đo → đến hạn');
ok(!O.due([{ at: 0 + 1 }], 1 + 10 * D).due && O.due([{ at: 1 }], 1 + 10 * D).days === 18, 'còn 18 ngày');
ok(O.due([{ at: 1 }], 1 + 28 * D).due, 'đủ 28 ngày → đến hạn');

// 6. Đề song song: đủ cấp, đoạn đọc 40–60 từ, Can-do có thật, xoay đề không lặp lần trước
const lkf = new Set(JSON.parse(R('content/framework/lkf.json')).objectives.map(o => o.id));
for (const b of ['a', 'b', 'c']) ok(Object.keys(F).filter(k => k[0] === b).length >= 2, 'cấp ' + b + ' có ≥ 2 đề');
for (const [id, f] of Object.entries(F)) {
  const w = O.words(f.read).length;
  ok(w >= 40 && w <= 60, `${id}: đoạn đọc ${w} từ (40–60)`);
  ok(f.speak && f.write && !/[ăâđêôơư]/i.test(f.read + f.speak + f.write), id + ': đề tiếng Anh đủ 3 phần');
  ok(f.lo.length && f.lo.every(x => lkf.has(x)), id + ': lo có trong lkf.json');
}
ok(O.pickForm(F, 'b', []) === 'b1' && O.pickForm(F, 'b', [{ form: 'b1' }]) === 'b2' && O.pickForm(F, 'b', [{ form: 'b1' }, { form: 'b2' }]) === 'b1', 'xoay đề');
ok(O.bandOf('A2') === 'a' && O.bandOf('C1') === 'c' && O.bandOf('B2') === 'b' && O.bandOf(null) === 'b', 'bandOf');

// 7. Thưởng đầu ra + dữ liệu đồng bộ gọn
ok(O.xpFor({}) === 0 && O.xpFor({ sp: { w: 100 }, wr: { w: 100 } }) === 40 && O.xpFor({ sp: { w: 900 }, wr: { w: 900 } }) === 60, 'XP theo số từ, trần 60');
const fx = O.topFixes({ sp: { errs: { a: 1, b: 3 }, items: [{ rule: 'b', bad: 'x' }] }, wr: { errs: { a: 3, c: 1 }, items: [] } });
ok(fx.map(f => f.rule).join() === 'a,b,c' && fx[1].bad === 'x' && fx[0].n === 4, 'topFixes gộp nói + viết');
const s = O.slim({ id: 'q', sp: { w: 1, items: [1] }, wr: { w: 1, items: [1], text: 'x'.repeat(3000) } });
ok(!s.sp.items && !s.wr.items && s.wr.text.length === 1500, 'slim: bỏ items, cắt bài viết');

// 8. Nối vào app: gói lười, route, lối thoát, không t() lúc nạp module
const app = R('web/js/app.js'), ui = R('web/cpack/outcomes-app/outcomes.js');
ok(/\boutcome: \['js\/i18n\/en\/outcomes\.js'[^\]]*'cpack\/outcomes-app\/outcomes\.js'\]/.test(app) && /\boutcome: 'outcome'[,}]/.test(app), 'BUNDLES + ROUTE_BUNDLE');
ok(/WITH_ARG = \[[^\]]*'outcome'/.test(R('web/js/exit-guard.js')), 'ExitGuard WITH_ARG');
ok(/routes\.outcome = /.test(ui) && !/^\s{0,4}const [A-Z_]+ = t\(/m.test(ui), 'route + không t() lúc nạp');
ok(/LAZY="[^"]*\boutcomes\b/.test(R('scripts/build-i18n.sh')), 'nhóm i18n lười outcomes');
console.log(`✓ outcomes: ${n} kiểm tra`);
