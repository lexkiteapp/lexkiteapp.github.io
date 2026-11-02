// 🔥 Ngọn lửa chuỗi dùng chung (ST2.flame, web/js/st/v2/runtime.js): path = đúng Stitch "Tactile Flame" (streak-light/dark.html),
// 4 trạng thái chỉ đổi màu (màu có trong brand/tokens.json), lửa lay tắt khi giảm chuyển động, dùng ở màn chuỗi + chip đầu trang + màn hoàn thành bài.
import assert from 'node:assert/strict'; import fs from 'node:fs'; import vm from 'node:vm'; import { JSDOM } from 'jsdom';
const paths = f => [...fs.readFileSync(f, 'utf8').matchAll(/<path class="fl-(\w+)" d="([^"]+)"/g)].map(m => m[1] + ':' + m[2]);
const ref = paths('brand/stitch/v2/streak-light.html');
assert.equal(ref.length, 5, 'mẫu Stitch streak-light có đủ 5 lớp lửa'); assert.deepEqual(paths('brand/stitch/v2/streak-dark.html'), ref, 'sáng/tối cùng ngọn lửa');
const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="v"></div></body></html>'), w = dom.window;
const ctx = { self: w, window: w, document: w.document, App: { state: { game: { days: {}, frozen: {} } } }, Core: { todayKey: () => '2026-10-30' }, Date: class extends Date { static now() { return new Date(2026, 9, 30, 12).getTime(); } } };
w.Core = ctx.Core; vm.createContext(ctx); vm.runInContext(fs.readFileSync('web/js/st/v2/runtime.js', 'utf8'), ctx); const S = w.ST2;
w.document.getElementById('v').innerHTML = S.flame('active', 28); const svg = w.document.querySelector('svg.st-fl');
assert.deepEqual([...svg.querySelectorAll('path')].map(p => p.getAttribute('class').slice(3) + ':' + p.getAttribute('d')), ref, 'ST2.flame = path Stitch y nguyên');
assert.equal(svg.getAttribute('aria-hidden'), 'true'); assert.equal(svg.getAttribute('height'), '28');
const css = w.document.getElementById('stFlCss').textContent, tok = new Set(fs.readFileSync('brand/tokens.json', 'utf8').match(/#[0-9A-Fa-f]{6}/g).map(c => c.toUpperCase()));
for (const st of ['frozen', 'lost', 'milestone']) assert.ok(css.includes(`[data-fl=${st}]`), 'có màu trạng thái ' + st);
for (const c of css.match(/#[0-9A-Fa-f]{6}/g)) assert.ok(tok.has(c.toUpperCase()), 'màu trạng thái ngoài brand/tokens.json: ' + c);
assert.match(css, /prefers-reduced-motion:reduce\)\{[^}]*animation:none/, 'lửa lay tắt khi giảm chuyển động');
assert.equal(S.flameState(0), 'lost'); assert.equal(S.flameState(14), 'active'); assert.equal(S.flameState(14, { milestone: true }), 'milestone');
ctx.App.state.game.frozen['2026-10-29'] = 1; assert.equal(S.flameState(14), 'frozen', 'hôm qua đóng băng, hôm nay chưa học → băng');
ctx.App.state.game.days['2026-10-30'] = { xp: 5 }; assert.equal(S.flameState(14), 'active', 'đã học hôm nay → lửa');
const gen = f => fs.readFileSync('web/js/st/v2/' + f, 'utf8');
assert.match(gen('streak.js'), /class="[^"]*st-fl" data-fl="\$\{e\(d\.fl\)\}"/, 'màn chuỗi: lửa Stitch có trạng thái');
assert.match(gen('shell.js'), /ST2\.flame\(ST2\.flameState\(d\.hdr\.streak\)/, 'chip chuỗi đầu trang dùng lửa chung');
assert.match(gen('lesson-complete.js'), /ST2\.flame\(ST2\.flameState\(\+d\.streak\)/, 'màn hoàn thành bài dùng lửa chung');
assert.match(fs.readFileSync('web/js/retention.js', 'utf8'), /fl: g\.ST2\.flameState\(n, o\)/, 'retention truyền trạng thái lửa');
console.log('✓ streak-flame: path Stitch, 4 trạng thái màu (tokens), giảm chuyển động, 3 chỗ dùng');
