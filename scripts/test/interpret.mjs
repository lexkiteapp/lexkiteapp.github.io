// Phiên dịch (#/interpret): lõi thuần, câu mẫu đủ 15 ngôn ngữ, nối dây route/gói/CSS/i18n. Nhẹ (không trình duyệt).
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const ctx = { self: null, localStorage: (() => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; })(), Intl }; ctx.self = ctx;
vm.createContext(ctx); for (const f of ['web/cpack/interpret/core.js', 'web/cpack/interpret/phrases.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
const C = ctx.InterpretCore, P = ctx.INTERPRET_PHRASES, LANGS = 'en vi es pt fr de id th zh ja ko hi ar ru tr'.split(' ');
assert.deepEqual([...C.CODES].sort(), [...LANGS].sort(), 'core: đúng 15 ngôn ngữ giao diện');
for (const l of LANGS) assert.ok(C.LOC[l], 'mã giọng ' + l);
for (const [g, o] of P.items) { assert.ok(P.order.includes(g), 'nhóm ' + g); for (const l of LANGS) assert.ok(o[l] && o[l].length > 2, 'câu mẫu thiếu ' + l + ': ' + o.en); }
assert.ok(P.items.length >= 20, 'ít nhất 20 câu mẫu');
// chọn bên nói theo ngôn ngữ dò được
const pair = { a: 'vi', b: 'es' };
assert.equal(C.speaker({ lang: 'es', confidence: 0.9 }, pair, 'a'), 'b'); assert.equal(C.speaker({ lang: 'es', confidence: 0.3 }, pair, 'a'), 'a');
assert.equal(C.speaker({ lang: 'fr', confidence: 0.99 }, pair, 'b'), 'b'); assert.equal(C.speaker(null, pair, 'a'), 'a');
assert.equal(C.dirOf('ar-SA'), 'rtl'); assert.equal(C.dirOf('vi'), 'ltr');
// lịch sử: giới hạn + xóa
C.clear(); for (let i = 0; i < C.MAX_CONV + 5; i++) C.addTurn('c' + i, pair, { from: 'a', src: 'xin chào', dst: 'es', tx: 'hola', ts: i + 1 });
assert.equal(C.load().convs.length, C.MAX_CONV); for (let i = 0; i < C.MAX_TURN + 3; i++) C.addTurn('c1', pair, { from: 'b', src: 'hola', dst: 'vi', tx: 'xin chào', ts: i });
assert.ok(C.load().convs.find(c => c.id === 'c1').turns.length <= C.MAX_TURN); C.clear(); assert.equal(C.load().convs.length, 0);
// thẻ ôn: cụm ngoại ngữ + nghĩa theo ngôn ngữ của tôi, không trùng
const conv = { a: 'vi', b: 'es', turns: [{ from: 'a', src: 'xin chào', dst: 'es', tx: 'hola amigo' }, { from: 'b', src: 'buenas noches', dst: 'vi', tx: 'chúc ngủ ngon' }, { from: 'a', src: 'xin chào', dst: 'es', tx: 'hola amigo' }] };
assert.deepEqual(JSON.parse(JSON.stringify(C.cards(conv, 'vi'))), [{ word: 'hola amigo', def: 'xin chào', lang: 'es' }, { word: 'buenas noches', def: 'chúc ngủ ngon', lang: 'es' }]);
assert.deepEqual([...C.keyWords(['Quiero una habitación', 'La habitación es grande'], 'es', 3)], ['habitación', 'quiero', 'grande']);
assert.ok(C.keyWords(['我想要一个房间'], 'zh').length >= 1);
// nối dây
const rd = f => fs.readFileSync(f, 'utf8');
assert.match(rd('web/js/bundles.js'), /interpret: \['js\/i18n\/en\/interpret\.js', 'cpack\/interpret\/core\.js', 'cpack\/interpret\/interpret\.js'\]/);
assert.match(rd('web/js/app.js'), /interpret: 'interpret',/); assert.match(rd('web/js/app.js'), /interpret: \['css\/interpret\.css'\]/);
assert.match(rd('scripts/build-i18n.sh'), /LAZY="interpret /);
for (const f of ['web/cpack/interpret/interpret.js', 'web/cpack/interpret/core.js']) assert.ok(!/fetch\(['"`]https?:|XMLHttpRequest|openai|api[_-]?key/i.test(rd(f)), f + ': không gọi dịch vụ trả phí');
console.log('interpret: OK');
