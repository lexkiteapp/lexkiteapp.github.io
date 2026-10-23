// [P2-1.2] Ôn tập đa chế độ trên giao diện (jsdom): đổi chế độ bằng bộ chọn/phím M, Gõ phản xạ (gợi ý chữ cái, chấp nhận lỗi gõ nhỏ),
// Nghe chọn nghĩa (1/4, phím 1–4), thẻ "Câu của bạn" (tô sáng, chip nguồn, 🔊), chấm FSRS qua nút có sẵn. Chạy: node scripts/test/review-modes-ui.js web
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const WEB = process.argv[2] || 'web';
const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, ''), { url: 'http://localhost/app/#/home', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, errors = [];
w.addEventListener('error', e => errors.push(e.message));
w.console.error = (...a) => errors.push(a.join(' '));
w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false });
w.CSS = { escape: s => s }; w.fetch = async () => ({ ok: false, json: async () => ({}) });
w.HTMLMediaElement.prototype.play = () => Promise.resolve(); w.HTMLMediaElement.prototype.pause = () => {}; w.HTMLCanvasElement.prototype.getContext = () => null;
for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
const $ = s => w.document.querySelector(s), $$ = s => [...w.document.querySelectorAll(s)];
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const key = (k, el) => (el || w.document).dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
const go = async h => { w.location.hash = '#/home'; await tick(60); w.location.hash = h; await tick(400); };
const setMode = async m => { const s = $('#rmSel'); s.value = m; s.dispatchEvent(new w.Event('change')); await tick(60); };
(async () => {
  await tick(300);
  const now = Date.now(), map = {};
  const mk = (word, vi, srs, x) => { const c = w.Core.Cards.make({ word, vi, pos: 'verb', ex: `I ${word} it every day.` }); c.srs = { ef: 2.5, interval: 5, reps: 3, lapses: 0, due: now - 1000, last: now - 5 * 864e5, step: 0, S: 5, D: 4, ...srs }; Object.assign(c, x || {}); map[word] = c; return c; };
  mk('accomplish', 'hoàn thành', { D: 9, due: now - 9000 }, { ctx: 'The team <b>accomplished</b> the goal.', src: 'bbc.co.uk' });
  for (const [a, b] of [['river', 'dòng sông'], ['window', 'cửa sổ']]) mk(a, b, { due: now + 9e9 });
  mk('decline', 'suy giảm', { D: 6, due: now - 5000 }); mk('habit', 'thói quen', { D: 6, due: now - 4000 });
  w.localStorage.setItem('ielts.cards', JSON.stringify(map)); w.App.state.cards = await w.Core.Cards.all();
  await go('#/review');
  ok(w.StudyModes, 'study-modes.js tải lười khi mở #/review');
  ok($('#rmSel') && $('#rmSel').getAttribute('aria-label'), 'bộ chọn chế độ có aria-label');
  // thẻ khó (D=9) → tự động lật + thẻ "Câu của bạn"
  ok(!$('#typeIn') && !$('[data-opt]'), 'thẻ khó → chế độ lật');
  const rc = $('.rctx.own'); ok(rc && /Câu của bạn|Your sentence/.test(rc.textContent) && /bbc\.co\.uk$/.test($('.rctx-src').textContent), 'thẻ "Câu của bạn" + chip nguồn');
  ok(rc && rc.querySelector('mark') && rc.querySelector('mark').textContent === 'accomplished' && !rc.querySelector('b'), 'tô sáng biến thể từ, HTML trong câu bị esc');
  ok(rc && rc.querySelector('[data-saysent]').getAttribute('aria-label'), 'nút 🔊 nghe cả câu có aria-label');
  // Gõ phản xạ
  await setMode('type'); ok($('#typeIn'), 'đổi tay → Gõ từ');
  key('?', $('#typeIn')); ok(/a c _/.test($('#rmHint').textContent), 'gợi ý chữ cái hiện thêm chữ');
  $('#typeIn').value = 'acomplish'; key('Enter', $('#typeIn')); await tick(30);
  ok($('#flash').classList.contains('flipped'), 'gõ xong → lật thẻ');
  const sug = $('[data-grade].suggest'); ok(sug && sug.dataset.grade === '1', 'sai 1 chữ + 1 gợi ý → gợi ý mức Khó (Hard)');
  const before = JSON.stringify(w.App.state.cards.accomplish.srs);
  sug.click(); await tick(120);
  ok(JSON.stringify(w.App.state.cards.accomplish.srs) !== before, 'chấm cập nhật FSRS qua SRS.review');
  // Nghe chọn nghĩa
  await go('#/review'); await setMode('audio');
  const opts = $$('[data-opt]'); ok(opts.length === 4, 'nghe chọn nghĩa: 4 phương án');
  ok(opts.every(b => b.getAttribute('aria-keyshortcuts')), 'phương án có phím tắt 1–4');
  const right = w.StudyModes && w.App.state.cards[Object.keys(w.App.state.cards).find(k => w.App.state.cards[k]._opt)];
  const ri = right && right._opt.right; key(String(ri + 1)); await tick(30);
  ok($('[data-opt].ok') && /✓/.test($('[data-opt].ok').textContent), 'đáp án đúng có dấu ✓ (không chỉ màu)');
  ok($('#flash').classList.contains('flipped') && $('[data-grade].suggest'), 'chọn xong → lật + gợi ý mức chấm');
  // phím M đổi chế độ
  await go('#/review'); const m0 = $('#rmSel').value; key('m'); await tick(80); ok($('#rmSel').value !== m0, 'phím M đổi chế độ');
  ok(!errors.length, 'không lỗi JS: ' + errors.slice(0, 3).join(' | '));
  if (fails) { console.log(`✗ review-modes-ui: ${fails} lỗi`); process.exit(1); }
  console.log('✓ review-modes-ui: lật + câu của bạn · gõ phản xạ · nghe chọn nghĩa · phím tắt · chấm FSRS');
  process.exit(0);
})();
