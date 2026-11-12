// 📚 Tab Từ vựng: chạy web/js/vocab-hub.js thật với dữ liệu giả – CTA theo số thẻ, đủ mọi lối đi cũ, ô tra từ sang #/dict (mã hoá), mã nằm ở gói lười.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const src = fs.readFileSync('web/js/vocab-hub.js', 'utf8'), app = fs.readFileSync('web/js/app.js', 'utf8'), hubs = fs.readFileSync('web/js/hubs.js', 'utf8');
assert.match(app, /vhub: \['js\/st\/v2\/vocab-hub\.js', 'js\/vocab-hub\.js'\]/); assert.match(app, /ROUTE_BUNDLE = \{[^\n]*\bvocab: \['ux1', 'words', 'vhub'\]/); assert.equal(app.slice(app.indexOf('const ROUTE_BUNDLE'), app.indexOf('};', app.indexOf('const ROUTE_BUNDLE'))).match(/\bvocab:/g).length, 1, 'ROUTE_BUNDLE chỉ một khóa vocab (khóa sau đè mất gói)'); assert.doesNotMatch(hubs, /routes\.vocab\s*=/);
const removed = [];
const run = (due, exam) => { let d; const el = () => { const o = { value: '', on: {}, addEventListener: (n, fn) => { o.on[n] = fn; }, scrollIntoView() { o.seen = true; } }; return o; }, q = el(), f = el(), loc = { hash: '#/vocab' };
  const root = { querySelector: s => (s.includes('search') ? f : q) }; const c = { window: { App: { state: { cards: { a: { srs: { interval: 30 } }, b: {} }, settings: {}, stats: {} }, routes: {}, view: {}, exam: () => exam, ux1On: () => true } }, Core: { Cards: { dueCount: () => ({ total: due }) } }, I18N: { lang: () => 'en' }, Chars: { slot: () => '<i></i>' }, ST2: { mount: (v, k, x, tab) => { assert.equal(k, 'vocab-hub'); assert.equal(tab, null, 'không dựng đầu trang/tab Stitch: dùng thanh chung'); d = x; return root; } }, t: (s, v) => s + (v ? JSON.stringify(v) : ''), location: loc, setTimeout: x => x(), document: { body: { classList: { remove: (...n) => { removed.push(...n); } } } } };
  vm.runInNewContext(src, c); c.window.App.routes.vocab(); return { d, loc, q, f }; };
const a = run(18, 'toeic'); assert.equal(a.d.count, '18'); assert.equal(a.d.href, '#/review?hub=1'); assert.equal(a.d.r[1].href, '#/library?g=toeic');
assert.deepEqual([...a.d.r, ...a.d.p].map(x => x.href.split('?')[0]), ['#/path', '#/library', '#/deck', '#/practice', '#/verb', '#/irregular', '#/usage', '#/phrases']);
const b = run(0, 'ielts'); assert.equal(b.d.count, ''); assert.equal(b.d.href, '#/review?hub=1'); assert.equal(b.d.r[1].href, '#/library');
const c = run(1, 'ielts'); c.q.value = ' a/b c '; c.f.on.submit({ preventDefault() {} }); assert.equal(c.loc.hash, '#/dict/a%2Fb%20c'); c.q.on.focus(); assert.ok(c.q.seen, 'ô nhập cuộn vào vùng nhìn thấy khi bàn phím mở');
assert.ok(removed.includes('v2on') && removed.includes('st'), 'bỏ st + v2on để giữ thanh trên và lề #view chung');
console.log('✓ vocab-hub');
