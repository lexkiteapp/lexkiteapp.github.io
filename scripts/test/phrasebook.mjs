// Sổ mẫu câu theo chức năng (#/phrases): bản sinh khớp nguồn, mục chưa đủ 2 giám khảo không giao, `qa` bị bỏ, không thêm gì vào khung nạp ngay, route vẫn lười.
// Dùng: node scripts/test/phrasebook.mjs
import fs from 'node:fs'; import vm from 'node:vm';
import { build, shipped, strip, enKeys, SRC, OUT, EN } from '../framework/build-functions.mjs';
import { firstLoadFiles } from '../lib/gz-canon.mjs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗ phrasebook: ' + m); } else console.log('✓ phrasebook: ' + m); };
const rd = f => fs.readFileSync(f, 'utf8');
// 1) quy tắc giao (thuần)
const mk = (id, qa) => ({ id, name: 'N ' + id, level: 'A1', phrases: { formal: ['a'], neutral: ['b'], informal: ['c'] }, responses: [], example: [], avoid: { wrong: 'w', right: 'r', why: 'Why ' + id }, note: 'Note ' + id, qa });
const two = { gen: 'x', j: { a: 5, b: 4 } }, one = { gen: 'x', j: { a: 5 } }, none = { gen: 'x' }, hand = {};
ok(shipped(mk('1', two)) && !shipped(mk('2', one)) && !shipped(mk('3', none)) && shipped(mk('4', hand)), 'giao: 2 giám khảo hoặc không có qa.gen; 1 giám khảo / chưa chấm → không giao');
ok(!('qa' in strip(mk('1', two))), 'strip bỏ qa');
const b = build([mk('1', two), mk('2', one), mk('3', none)]), ctx = { self: {} }; vm.runInNewContext(b.js, ctx);
ok(ctx.self.PHRASEBOOK.items.length === 1 && ctx.self.PHRASEBOOK.items[0].id === '1' && !/"qa"/.test(b.js), 'gói sinh: đúng 1 mục, không còn qa');
ok(Object.keys(enKeys(b.items)).sort().join('|') === 'N 1|Note 1|Why 1', 'en-src: name + note + avoid.why, en gốc = chính câu');
// 2) bản sinh trong repo khớp nguồn + hình dạng
const all = JSON.parse(rd(SRC)).functions, real = build(all), bundle = rd(OUT);
ok(rd(OUT) === real.js && rd(EN) === real.en, 'web/cpack/framework/functions.js + content/i18n/en-src/functions.json khớp nguồn (node scripts/framework/build-functions.mjs --write)');
const pb = (() => { const c = { self: {} }; vm.runInNewContext(bundle, c); return c.self.PHRASEBOOK; })();
ok(pb.items.length === all.filter(e => Object.keys((e.qa || {}).j || {}).length >= 2 || !(e.qa || {}).gen).length, `chỉ giao mục đủ giám khảo (${pb.items.length}/${all.length})`);
ok(pb.items.every(f => f.id && f.name && /^[ABC][12]$/.test(f.level) && f.phrases.formal && f.phrases.neutral && f.phrases.informal && Array.isArray(f.responses) && Array.isArray(f.example) && f.avoid && f.avoid.why && !('qa' in f)), 'mỗi mục đủ trường (id, name, level, 3 mức, responses, example, avoid) và không có qa');
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
