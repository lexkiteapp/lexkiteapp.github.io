#!/usr/bin/env node
// Hồi quy "ngữ pháp A1/C2 tải lười": mở màn Ngữ pháp KHÔNG kéo starter2.js / mastery.js (~58 KB nén), nhưng danh sách vẫn đủ 22 bài,
// mở bài (kể cả link thẳng #/grammar/<id> lúc khởi động nguội) chờ gói cấp đó rồi thay bài rút gọn theo id – không trùng, nạp lại không nhân đôi.
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import assert from 'node:assert/strict';
import { LAZY, lessonsOf, render } from '../grammar/build-lazy-idx.mjs';
import { loadContent, ROOT } from '../lib/content-load.mjs';
const W = p => path.join(ROOT, 'web', p), read = p => fs.readFileSync(W(p), 'utf8');
const app = read('js/app.js'), cut = (from, to) => { const a = app.indexOf(from), b = app.indexOf(to, a); return new Function(`${app.slice(a, b + to.length)}; return ${from.match(/(\w+) = \{$/)[1]};`)(); };
const BUNDLES = cut("const G = 'js/grammar/', BUNDLES = {", '\n  };'), ROUTE_BUNDLE = cut('const ROUTE_BUNDLE = {', '};');

// 1. Gói: 'grammar' không chứa file nặng; hai gói lười đúng 1 file nguồn, không gắn vào route nào (chỉ grammar.js gọi khi cần)
for (const L of LAZY) {
  assert.ok(!BUNDLES.grammar.includes('js/grammar/' + L.src), `BUNDLES.grammar còn chứa ${L.src}`);
  assert.deepEqual(BUNDLES[L.bundle], ['js/grammar/' + L.src], `BUNDLES.${L.bundle} phải chỉ có ${L.src}`);
  assert.ok(BUNDLES.grammar.includes('js/grammar/' + L.idx), `BUNDLES.grammar thiếu mục lục ${L.idx}`);
  assert.ok(![].concat(...Object.values(ROUTE_BUNDLE)).includes(L.bundle), `${L.bundle} không được nằm trong ROUTE_BUNDLE`);
  assert.ok(fs.existsSync(W('js/grammar/' + L.src)), L.src);
}
// mục lục nằm đúng chỗ file nguồn cũ (thứ tự bài trong danh sách không đổi)
assert.deepEqual(BUNDLES.grammar.map(f => f.replace(/^.*\//, '')).filter(f => /^(starter|lazy-a1|academic|lazy-c2|chapters)\.js$/.test(f)), ['starter.js', 'lazy-a1.js', 'academic.js', 'lazy-c2.js', 'chapters.js']);

// 2. Mục lục khớp nguồn (sinh bằng scripts/grammar/build-lazy-idx.mjs --write)
for (const L of LAZY) assert.equal(read('js/grammar/' + L.idx), render(L, lessonsOf(L.src)), `${L.idx} cũ so với ${L.src}: node scripts/grammar/build-lazy-idx.mjs --write`);

// 3. Nạp như trình duyệt: dữ liệu của gói grammar (đúng thứ tự BUNDLES), rồi từng gói lười
const mkCtx = () => { const c = { console, Date, Math, JSON, setTimeout, clearTimeout }; c.self = c.window = c; return vm.createContext(c); };
const run = (c, f) => vm.runInContext(fs.readFileSync(W(f), 'utf8'), c, { filename: f });
const dataFiles = BUNDLES.grammar.filter(f => /^(js|cpack)\/grammar\//.test(f));
const lazyOf = c => c.GRAMMAR.filter(x => x.lazy);
const sig = c => c.GRAMMAR.map(x => `${x.id}:${(x.blocks || []).length}/${(x.quiz || []).length}/${(x.drills || []).length}`);
const full = loadContent();
{
  const c = mkCtx(); dataFiles.forEach(f => run(c, f));
  const ids = LAZY.flatMap(L => lessonsOf(L.src).map(x => x.id));
  assert.equal(lazyOf(c).length, ids.length, 'phải có đủ bài rút gọn');
  assert.ok(lazyOf(c).every(x => !x.blocks && !x.quiz && x.title && x.en && x.level && x.emoji && x.summary && x.unit && x.order != null), 'bài rút gọn đủ trường danh sách, không có nội dung');
  assert.ok(Object.keys(c.GRAMMAR_CHECK).length && ids.every(id => c.GRAMMAR_CHECK[id]), 'GRAMMAR_CHECK vẫn đủ 22 bài');
  assert.equal(c.GRAMMAR.length, full.GRAMMAR.length, 'danh sách phải đủ số bài như nạp đầy đủ');
  const n = c.GRAMMAR.length;
  for (const L of LAZY) { // thay theo id: không trùng, đúng chỗ, bài tập gắn trước (drills-own) vẫn còn; nạp lần 2 không đổi gì
    run(c, 'js/grammar/' + L.src); const a = sig(c); run(c, 'js/grammar/' + L.src);
    assert.equal(c.GRAMMAR.length, n, `${L.src}: nạp xong số bài đổi (trùng?)`);
    assert.deepEqual(sig(c), a, `${L.src}: nạp lần 2 không idempotent`);
    assert.ok(!c.GRAMMAR.some(x => x.lazy === L.bundle), `${L.src}: còn bài rút gọn`);
  }
  assert.equal(new Set(c.GRAMMAR.map(x => x.id)).size, c.GRAMMAR.length, 'id trùng');
  const A = sig(c), B = sig(full), i = A.findIndex((v, k) => v !== B[k]);
  assert.ok(A.length === B.length && i < 0, `sau khi nạp 2 gói, GRAMMAR (thứ tự, blocks/quiz/drills) phải y hệt nạp đầy đủ – lệch ở #${i}: ${A[i]} ≠ ${B[i]}`);
}
// loader Node (content-load) vẫn thấy đủ bài đầy đủ, không có bài rút gọn
assert.ok(!full.GRAMMAR.some(x => x.lazy) && LAZY.every(L => lessonsOf(L.src).every(x => full.GRAMMAR.some(y => y.id === x.id && y.blocks.length))), 'content-load phải thấy đủ bài đầy đủ');

// 4. grammar.js: mở bài rút gọn (cả link thẳng lúc khởi động nguội) chờ gói rồi mới vẽ; lỗi tải → toast + về danh sách, lần sau tải lại
const stub = new Proxy(function () {}, { get: (_, k) => (k === Symbol.toPrimitive ? () => '' : stub), apply: () => '' });
async function boot(fail) {
  const c = mkCtx(); dataFiles.forEach(f => run(c, f));
  const log = [], view = { innerHTML: '', querySelectorAll: () => [], querySelector: () => null };
    c.t = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m)) : s);
  c.I18N = { lang: () => 'vi' }; c.Kit = undefined; c.Sfx = stub; c.WordArrange = stub;
  c.document = { getElementById: () => ({}), createElement: () => ({}), head: { appendChild() {} }, querySelector: () => null, querySelectorAll: () => [] };
  c.UI = new Proxy({ esc: s => String(s == null ? '' : s).replace(/[&<>"]/g, ch => `&#${ch.charCodeAt(0)};`), $: () => null, $$: () => [], shuffle: a => a, toast: m => log.push('toast:' + m) }, { get: (o, k) => (k in o ? o[k] : stub) });
  const state = { game: {}, settings: {} }, routes = {}, seq = { n: 0 }; let bundleOk = !fail;
  const need = async n => { if (/^grammar/.test(n)) log.push('need:' + n); if (bundleOk) { const L = LAZY.find(l => l.bundle === n); if (!c.GRAMMAR.some(x => x.lazy === n)) return; run(c, 'js/grammar/' + L.src); } };
  c.App = { state, routes, view, bindCommon() {}, lazy: (...n) => Promise.all(n.map(need)), reneed: n => { log.push('reneed:' + n); bundleOk = true; return need(n); }, reward() {} };
  run(c, 'js/grammar.js');
  return { c, log, view, routes };
}
const flush = () => new Promise(r => setTimeout(r, 20));
const q = new URLSearchParams();
{ // link thẳng #/grammar/<id> khi chưa nạp gói
  const { c, log, view, routes } = await boot(false), id = lessonsOf('starter2.js')[0].id;
  routes.grammar(id, q);
  assert.deepEqual(log, ['need:grammarA1'], 'phải chờ gói grammarA1 trước khi vẽ');
  assert.ok(/aria-busy/.test(view.innerHTML), 'trong lúc chờ phải có khung chờ');
  await flush();
  assert.ok(!c.GRAMMAR.some(x => x.lazy === 'grammarA1') && c.GRAMMAR.some(x => x.lazy === 'grammarC2'), 'chỉ gói A1 được nạp');
  assert.ok(view.innerHTML.includes(c.GRAMMAR.find(x => x.id === id).en) && !/aria-busy/.test(view.innerHTML), 'sau khi nạp phải vẽ bài đầy đủ');
  log.length = 0; routes.grammar(id, q); await flush();
  assert.ok(!log.length, 'bài đã đầy đủ thì không nạp lại');
  const c2 = lessonsOf('mastery.js')[0].id; routes.grammar(c2, new URLSearchParams('view=full')); await flush();
  assert.deepEqual(log, ['need:grammarC2'], 'bài C2 tải gói C2');
  assert.ok(view.innerHTML.includes('g-hero') || view.innerHTML.includes(c.GRAMMAR.find(x => x.id === c2).en), 'xem toàn bài C2 vẽ được');
  log.length = 0; routes.grammar(lessonsOf('foundation.js')[0].id, q); await flush();
  assert.ok(!log.length, 'bài thường không đụng gói lười');
}
{ // gói hỏng: loadScript nuốt lỗi → vẫn rút gọn → thử tải lại 1 lần → toast + về danh sách; lần bấm sau tải lại và mở được
  const { c, log, view, routes } = await boot(true), id = lessonsOf('starter2.js')[0].id;
  let tries = 0; const re = c.App.reneed; c.App.reneed = n => (++tries < 2 ? (log.push('reneed:' + n), Promise.resolve()) : re(n));
  routes.grammar(id, q); await flush();
  assert.ok(log.includes('reneed:grammarA1') && log.some(l => l.startsWith('toast:')), 'lỗi tải → thử lại + toast');
  assert.ok(c.GRAMMAR.some(x => x.lazy === 'grammarA1') && view.innerHTML.includes('#/grammar/' + id), 'bài vẫn rút gọn và còn trong danh sách');
  routes.grammar(id, q); await flush();
  assert.ok(!c.GRAMMAR.some(x => x.lazy === 'grammarA1'), 'lần sau bấm lại phải tải được');
}
{ // đề tổng hợp: mọi bài vào đề → nạp các gói còn rút gọn trước khi gom câu hỏi
  const { c, log, routes } = await boot(false); routes.grammar('mix', q); await flush();
  assert.deepEqual(log.sort(), ['need:grammarA1', 'need:grammarC2'], 'đề tổng hợp mọi bài phải nạp cả hai gói');
  assert.ok(!c.GRAMMAR.some(x => x.lazy), 'sau đề tổng hợp không còn bài rút gọn');
}
console.log('grammar-lazy OK');
