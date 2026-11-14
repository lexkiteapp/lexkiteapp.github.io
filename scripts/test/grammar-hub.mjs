// 📐 Hub Ngữ pháp (#/grammar) trên khung Stitch v2: chạy web/js/grammar.js thật với bài thật (loadContent) – tiến độ, bài nên học tiếp, 10 chương + chương tự động mở,
// tab trọng tâm IELTS/TOEIC (nhớ trong sessionStorage), đề tổng hợp 20/40 câu + Chia động từ + Sửa ngữ pháp, tên Việt/Anh theo ngôn ngữ, nút Back, gói nạp đúng chỗ,
// khung sinh (st/v2/grammar.js) dựng ra HTML đủ mọi lối đi cũ (hook data-grow cho e2e), chương rỗng/hết bài không vỡ.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
import { loadContent } from '../lib/content-load.mjs';
const read = f => fs.readFileSync(f, 'utf8'), src = read('web/js/grammar.js'), app = read('web/js/app.js'), gen = read('web/js/st/v2/grammar.js');
const dict = { 'Tất cả {n} bài': 'All {n} lessons' };
const mk = ({ lang = 'vi', done = {}, tab = null, hist = 2 } = {}) => {
  const log = { mount: [], hash: [], back: 0, store: {}, toast: [] }, routes = {}, view = { innerHTML: '' };
  const root = { listeners: {}, addEventListener(n, f) { this.listeners[n] = f; }, querySelectorAll: () => [], querySelector: () => null };
  const c = { console, Date, Math, JSON, Object, Array, Set, Map, String, Number, RegExp, Promise, Error, setTimeout, clearTimeout, URLSearchParams, encodeURIComponent };
  c.self = c.window = c; c.GRAMMAR = []; c.GRAMMAR_CHECK = {};
  c.t = (s, v) => String(dict[s] && lang !== 'vi' ? dict[s] : s).replace(/\{(\w+)\}/g, (m, k) => (v && v[k] != null ? v[k] : m));
  c.I18N = { lang: () => lang }; c.UI = { addIcons() {}, icon: n => `<i ${n}></i>`, esc: s => String(s), speak() {}, $: () => null, $$: () => [], shuffle: a => a };
  c.App = { state: { game: { grammarDone: done } }, routes, view, bindCommon() {}, lazy: async () => {}, reneed: async () => {}, reward() {}, onCleanup() {} };
  c.document = { getElementById: () => ({}), createElement: () => ({ style: {} }), head: { appendChild() {} }, querySelector: () => null, querySelectorAll: () => [] };
  c.sessionStorage = { getItem: k => (k in log.store ? log.store[k] : null), setItem: (k, v) => { log.store[k] = v; } }; if (tab) log.store['g.tab'] = tab;
  c.history = { length: hist, back() { log.back++; } }; c.location = { set hash(v) { log.hash.push(v); } };
  c.ST2 = { mount: (v, k, d, tabArg) => { assert.equal(k, 'grammar'); assert.equal(tabArg, 'skills', 'hub ngữ pháp thuộc tab Kỹ năng: đầu trang + thanh tab chung (journey-matrix kiểm 5 tab, đánh dấu skills)'); log.mount.push(JSON.parse(JSON.stringify(d))); log.root = root; return root; } };
  const { GRAMMAR } = loadContent(); c.GRAMMAR = GRAMMAR; c.window.GRAMMAR_CHECK = {};
  vm.createContext(c); vm.runInContext(src, c, { filename: 'grammar.js' });
  return { c, routes, log, root };
};
const ids = h => h.rows.filter(r => !r.test).map(r => r.id);

// 1. Gói nạp: khung + runtime + en/v2 trong gói riêng ghub (đứng TRƯỚC gói grammar), CSS riêng; không kéo vào gói grammar nặng
assert.match(app, /ghub: \['js\/i18n\/en\/v2\.js', 'js\/st\/v2\/runtime\.js', 'js\/st\/v2\/shell\.js', 'js\/st\/v2\/grammar\.js'\]/);
assert.match(app, /\n\s+grammar: \['ghub', 'grammar', 'lfx'\],/); assert.match(app, /ghub: 'css\/st-v2-grammar\.css'/);
assert.equal(app.slice(app.indexOf('const ROUTE_BUNDLE'), app.indexOf('};', app.indexOf('const ROUTE_BUNDLE'))).match(/\bgrammar:/g).length, 1, 'ROUTE_BUNDLE chỉ một khóa grammar');

// 2. Người mới (chưa học gì): bài đầu = bài nên học tiếp, chương 1 mở sẵn, đủ 10 chương + hàng "Kiểm tra chương", tab Tất cả
{ const { routes, log } = mk(); routes.grammar(); const d = log.mount[0];
  assert.equal(d.pct, 0); assert.match(d.prog, /^0\/\d+ bài đã đạt$/); assert.ok(d.nx && /^#\/grammar\/[\w-]+$/.test(d.nx.href)); assert.match(d.nx.h, /^Bài tiếp theo: /); assert.match(d.nx.sub, /^Chương 1/);
  assert.deepEqual(d.tabs.map(x => x.k + (x.on ? '*' : '')), ['all*', 'ielts', 'toeic']);
  assert.equal(d.ch.length, 10); assert.deepEqual(d.ch.map(c => c.id), Array.from({ length: 10 }, (_, i) => 'chap' + (i + 1)));
  assert.deepEqual(d.ch.map(c => c.open), [true, ...Array(9).fill(false)]);
  for (const c of d.ch) { const t = c.rows[c.rows.length - 1]; assert.ok(t.test && /^#\/grammar\/mix\?ch=\d+$/.test(t.href), 'hàng cuối mỗi chương = Kiểm tra chương'); assert.equal(c.dn, 0); assert.equal(c.total, c.rows.length - 1); }
  const all = d.ch.flatMap(ids); assert.equal(new Set(all).size, all.length, 'không bài nào hiện 2 lần'); assert.ok(all.length >= 80, 'đủ bài'); assert.match(d.sub, new RegExp(`^${all.length} bài học trực quan$`));
  assert.ok(d.ch[0].rows.every(r => r.test || r.pct == null), 'chưa học: mọi hàng = plain (không chip %)');
  assert.deepEqual(d.cards.map(c => c.href), ['#/grammar/mix', '#/grammar/mix?n=40', '#/verb', '#/fix'], 'đủ đề 20 + 40 câu + 2 công cụ ngữ pháp');
  assert.match(d.cards[0].t, /20/); assert.match(d.cards[1].t, /40/); assert.ok(d.blurb.includes(String(all.length)), 'đoạn mô tả hub vẫn còn'); }

// 3. Đang học dở: bài < 80% là bài nên học tiếp (nhãn "Làm lại cho chắc"), chương của nó mở; ≥ 80% = đã đạt, đếm tiến độ
{ const probe = mk(); probe.routes.grammar(); const d0 = probe.log.mount[0], a = d0.ch[2].rows[0].id, b = d0.ch[2].rows[1].id, z = d0.ch[0].rows[0].id;
  const { routes, log } = mk({ done: { [z]: 90, [a]: 60, [b]: 80 } }); routes.grammar(); const d = log.mount[0];
  assert.equal(d.nx.href, '#/grammar/' + a); assert.match(d.nx.sub, /^Làm lại cho chắc · lần trước 60%/); assert.match(d.nx.sub, /Chương 3/);
  assert.deepEqual(d.ch.map(c => c.open), d.ch.map((_, i) => i === 2), 'chỉ chương của bài kế tiếp mở sẵn');
  assert.equal(d.ch[0].dn, 1); assert.equal(d.ch[2].dn, 1); assert.match(d.prog, /^2\/\d+ bài đã đạt$/); assert.ok(d.pct > 0);
  const r = x => d.ch.flatMap(c => c.rows).find(y => y.id === x); assert.equal(r(z).pct, 90); assert.equal(r(a).pct, 60); assert.equal(r(b).pct, 80);
  assert.ok(r(z).lv !== undefined && r(z).href === '#/grammar/' + z && r(z).t, 'hàng có tên, cấp độ, liên kết'); }

// 4. Hết bài: không bài nào còn "tiếp theo" → ẩn thẻ bài kế (nx rỗng), không vỡ
{ const probe = mk(); probe.routes.grammar(); const every = Object.fromEntries(probe.log.mount[0].ch.flatMap(ids).map(i => [i, 95]));
  const { routes, log } = mk({ done: every }); routes.grammar(); const d = log.mount[0]; assert.ok(!d.nx); assert.equal(d.pct, 100); assert.ok(d.ch.every(c => c.pct === 100)); }

// 5. Tab trọng tâm IELTS/TOEIC: chỉ nhóm bài đó trong MỘT thẻ mở sẵn (không hàng Kiểm tra chương), nhớ trong sessionStorage, chọn tab → vẽ lại + trả tiêu điểm
for (const [k, n] of [['ielts', 15], ['toeic', 12]]) {
  const { routes, log, root, c } = mk({ tab: k }); routes.grammar(); const d = log.mount[0];
  assert.deepEqual(d.tabs.map(x => x.on), [k === 'all', k === 'ielts', k === 'toeic']); assert.equal(d.ch.length, 1); assert.equal(d.ch[0].id, 'gFocus'); assert.ok(d.ch[0].open);
  assert.ok(d.ch[0].rows.every(r => !r.test), 'tab trọng tâm không có hàng Kiểm tra chương'); assert.equal(d.ch[0].total, n, `${k}: đủ ${n} bài trọng tâm`); assert.ok(d.nx, 'vẫn có bài nên học tiếp');
  assert.equal(d.ch[0].h, k === 'ielts' ? 'Trọng tâm IELTS 7.0+' : 'Bí kíp TOEIC Part 5 & 6');
}
{ const { routes, log, root } = mk(); routes.grammar(); let focused = 0; root.querySelector = s => (/aria-pressed/.test(s) ? { focus() { focused++; } } : null);
  root.listeners.click({ target: { closest: () => ({ dataset: { gt: 'toeic' } }) } }); assert.equal(log.store['g.tab'], 'toeic'); assert.equal(log.mount.length, 2, 'đổi tab vẽ lại'); assert.equal(log.mount[1].ch[0].id, 'gFocus'); assert.equal(focused, 1, 'trả tiêu điểm bàn phím về viên đã chọn');
  root.listeners.click({ target: { closest: () => ({ dataset: { gt: 'all' } }) } }); assert.equal(log.mount[2].ch.length, 10); }
{ const { routes, log } = mk({ tab: 'bậy' }); routes.grammar(); assert.equal(log.mount[0].tabs[0].on, true, 'tab lạ → về Tất cả'); }

// 6. Nút Back (đầu trang mẫu): có lịch sử → quay lại, mở thẳng liên kết → về Kỹ năng
{ const a = mk({ hist: 3 }); a.routes.grammar(); a.root.listeners.click({ target: { closest: () => ({ dataset: { gh: 'back' } }) } }); assert.equal(a.log.back, 1); assert.deepEqual(a.log.hash, []);
  const b = mk({ hist: 1 }); b.routes.grammar(); b.root.listeners.click({ target: { closest: () => ({ dataset: { gh: 'back' } }) } }); assert.equal(b.log.back, 0); assert.deepEqual(b.log.hash, ['#/skills']);
  const n = mk(); n.routes.grammar(); n.root.listeners.click({ target: { closest: () => null } }); assert.equal(n.log.mount.length, 1, 'bấm ngoài nút: không làm gì'); }

// 7. Ngôn ngữ khác: không lẫn tiếng Việt – tên bài đã dịch hoặc tên Anh; tab "Tất cả" dịch; tên Anh phụ chỉ khi khác tên chính
{ const { routes, log } = mk({ lang: 'en' }); routes.grammar(); const d = log.mount[0], rows = d.ch.flatMap(c => c.rows).filter(r => !r.test);
  assert.ok(rows.every(r => !r.s || r.s !== r.t), 'dòng phụ không lặp lại tên chính'); assert.match(d.tabs[0].l, /^All \d+ lessons$/);
  assert.ok(rows.filter(r => /[à-ỹ]/i.test(r.t)).length === 0, 'giao diện en: tên bài không còn tiếng Việt'); }

// 8. Khung sinh dựng đủ mọi lối đi cũ cho dữ liệu thật; không còn class cũ trùng CSS chung (g-row/g-chap dùng chung với trang Khóa học)
{ const ST = { esc: s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]) }, c = { self: {}, ST }; c.self.ST = ST; vm.createContext(c); vm.runInContext(gen, c); const ST2 = c.self.ST2;
  const { routes, log } = mk(); routes.grammar(); const d = log.mount[0], o = ST2.grammar(d, s => s, ST.esc), h = o.main;
  assert.ok(h.includes('data-gh="back"') && h.includes('role="progressbar"') && h.includes(`aria-valuenow="${d.pct}"`));
  assert.equal((h.match(/data-gt="/g) || []).length, 3); assert.equal((h.match(/aria-pressed="true"/g) || []).length, 1);
  assert.equal((h.match(/<details /g) || []).length, 10); assert.ok(h.includes('id="chap1"') && h.includes('data-open="1"'));
  assert.equal((h.match(/data-grow="/g) || []).length, d.ch.flatMap(ids).length, 'mọi bài có hook data-grow (e2e) + liên kết');
  for (const x of ['#/grammar/mix', '#/grammar/mix?n=40', '#/verb', '#/fix', '#/grammar/mix?ch=10', d.nx.href]) assert.ok(h.includes(`href="${x}"`) || h.includes(`data-href="${x}"`), 'mất lối đi ' + x);
  assert.ok(!/class="[^"]*\b(g-row|g-chap|g-tx|g-prog|g-list|hub-card)\b/.test(h), 'không dùng class chung của trang khác'); assert.ok(!h.includes('undefined') && !h.includes('[object'), 'không rò dữ liệu rỗng');
  const e = ST2.grammar({ ...d, ch: [{ empty: true, h: 'Đang cập nhật bài học…' }], nx: null }, s => s, ST.esc).main; assert.ok(e.includes('Đang cập nhật bài học…') && !e.includes('<details'), 'chương rỗng không vỡ');
  const hx = ST2.grammar({ ...d, ch: [{ ...d.ch[0], h: '<b>x</b>', rows: [{ id: 'a', href: '#/x', t: '<img src=x onerror=1>', s: '"', lv: 'A1', pct: 50 }] }] }, s => s, ST.esc).main; assert.ok(!hx.includes('<img src=x') && !hx.includes('<b>x</b>'), 'tên bài/chương được thoát HTML'); }
console.log('✓ grammar-hub');
