// Sổ mẫu câu theo chức năng (#/phrases): bản sinh khớp nguồn, mục chưa đủ 2 giám khảo không giao, `qa` bị bỏ, không thêm gì vào khung nạp ngay, route vẫn lười.
// Dùng: node scripts/test/phrasebook.mjs
import fs from 'node:fs'; import vm from 'node:vm';
import { build, shipped, strip, SRC, SRC_VI, OUT, EN } from '../framework/build-functions.mjs';
import { firstLoadFiles } from '../lib/gz-canon.mjs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗ phrasebook: ' + m); } else console.log('✓ phrasebook: ' + m); };
const rd = f => fs.readFileSync(f, 'utf8');
// 1) quy tắc giao (thuần)
const mk = (id, qa) => ({ id, name: 'N ' + id, level: 'A1', phrases: { formal: ['a'], neutral: ['b'], informal: ['c'] }, responses: [], example: [], avoid: { wrong: 'w', right: 'r', why: 'Why ' + id }, note: 'Note ' + id, qa });
const two = { gen: 'x', j: { a: 5, b: 4 } }, one = { gen: 'x', j: { a: 5 } }, none = { gen: 'x' }, hand = {};
ok(shipped(mk('1', two)) && !shipped(mk('2', one)) && !shipped(mk('3', none)) && shipped(mk('4', hand)), 'giao: 2 giám khảo hoặc không có qa.gen; 1 giám khảo / chưa chấm → không giao');
ok(!('qa' in strip(mk('1', two))), 'strip bỏ qa');
const VI = id => ({ name: 'Tên ' + id, note: 'Ghi chú ' + id, why: 'Lý do ' + id }), vi = { 1: VI(1), 2: VI(2), 3: VI(3) };
const b = build([mk('1', two), mk('2', one), mk('3', none)], vi), ctx = { self: {} }; vm.runInNewContext(b.js, ctx);
ok(ctx.self.PHRASEBOOK.items.length === 1 && ctx.self.PHRASEBOOK.items[0].id === '1' && !/"qa"/.test(b.js), 'gói sinh: đúng 1 mục, không còn qa');
ok(JSON.stringify(JSON.parse(b.en)) === JSON.stringify({ 'Tên 1': 'N 1', 'Ghi chú 1': 'Note 1', 'Lý do 1': 'Why 1' }) && b.items[0].vi.name === 'Tên 1', 'en-src theo O5: khóa = chuỗi Việt, giá trị = en gốc; gói mang vi');
let thrown = false; try { build([mk('1', two)], {}); } catch (e) { thrown = true; } ok(thrown, 'mục giao thiếu tiếng Việt → generator báo lỗi');
// 2) bản sinh trong repo khớp nguồn + hình dạng
const all = JSON.parse(rd(SRC)).functions, VIall = JSON.parse(rd(SRC_VI)), real = build(all, VIall), bundle = rd(OUT);
ok(rd(OUT) === real.js && rd(EN) === real.en, 'web/cpack/framework/functions.js + content/i18n/en-src/functions.json khớp nguồn (node scripts/framework/build-functions.mjs --write)');
const pb = (() => { const c = { self: {} }; vm.runInNewContext(bundle, c); return c.self.PHRASEBOOK; })();
ok(pb.items.length === all.filter(e => Object.keys((e.qa || {}).j || {}).length >= 2 || !(e.qa || {}).gen).length, `chỉ giao mục đủ giám khảo (${pb.items.length}/${all.length})`);
ok(pb.items.every(f => f.id && f.name && /^[ABC][12]$/.test(f.level) && f.phrases.formal && f.phrases.neutral && f.phrases.informal && Array.isArray(f.responses) && Array.isArray(f.example) && f.avoid && f.avoid.why && !('qa' in f)), 'mỗi mục đủ trường (id, name, level, 3 mức, responses, example, avoid) và không có qa');
// 2b) tiếng Việt đủ 100 mục (không để người học vi thấy tiếng Anh), ngắn gọn, có dấu; en-src khóa là chuỗi Việt
ok(all.every(e => VIall[e.id] && VIall[e.id].name && VIall[e.id].note && VIall[e.id].why) && Object.keys(VIall).length === all.length, 'functions.vi.json đủ name/note/why cho cả ' + all.length + ' chức năng');
const viRe = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i, enSrc = JSON.parse(rd(EN));
ok(pb.items.every(f => f.vi && viRe.test(f.vi.note) && viRe.test(f.vi.why)) && Object.keys(enSrc).every(k => viRe.test(k) || /^[^a-z]*$/i.test(k) === false) && Object.keys(enSrc).length >= pb.items.length * 2, 'gói mang vi; en-src có khóa Việt → en');
// L1 trong phrase-book.js: vi dùng f.vi, L1 khác tra khóa vi, thiếu → en (không lộ tiếng Việt)
const pbjs = rd('web/js/phrase-book.js'); ok(/to\(\) === 'vi' \? v \|\| en/.test(pbjs) && /l1\[v\] \|\| en/.test(pbjs), 'phrase-book.js: vi → f.vi; L1 khác → l1[khóa vi] || en');
// 3) không thêm gì vào khung nạp ngay; chỉ gói lười 'pbook'; route phrases vẫn lười
const first = firstLoadFiles();
ok(!first.some(u => /phrase-book|cpack\/framework/.test(u)), 'phrase-book.js + cpack/framework KHÔNG nằm trong file nạp ngay');
const app = rd('web/js/app.js'), a = app.indexOf("const G = 'js/grammar/', BUNDLES = {"), e = app.indexOf('\n  };', a);
const BUNDLES = new Function(app.slice(a, e + 4) + '; return BUNDLES;')();
ok(BUNDLES.pbook && BUNDLES.pbook.includes('cpack/framework/functions.js') && BUNDLES.pbook.includes('js/phrase-book.js'), "gói lười 'pbook' = dữ liệu + mã vẽ");
const r0 = app.indexOf('const ROUTE_BUNDLE = {'), RB = new Function(app.slice(r0, app.indexOf('};', r0) + 2) + '; return ROUTE_BUNDLE;')();
ok([].concat(RB.phrases).join() === 'writing' && !Object.values(RB).flat().includes('pbook'), "route #/phrases vẫn chỉ nạp 'writing'; 'pbook' chỉ nạp khi mở mục (App.need)");
ok(/App\.need\('pbook'\)/.test(rd('web/js/phrases-model.js')) && !/PHRASEBOOK/.test(rd('web/js/phrases-model.js')), 'phrases-model.js chỉ gọi App.need(pbook), không chứa dữ liệu');
process.exit(bad ? 1 : 0);
