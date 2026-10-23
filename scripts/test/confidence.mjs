// 🗣️ Giao tiếp tự tin (#/confidence) – jsdom chạy app THẬT (docs/CONFIDENCE.md §8):
// route + link sâu cụm câu · đi hết 6 bước 1 bài (nghe → cụm → nói theo → điền → roleplay kịch bản → tổng kết) · lưu SRS + XP ·
// mất mạng (roleplay rơi về kịch bản) · bộ công cụ · thử thách 2 phút (điểm + lưu máy) · i18n-leak es/ja/ar · a11y (nút có nhãn) · mobile (không bề rộng cố định) ·
// lối vào: trang chủ, menu Kỹ năng, cuối roleplay, tab mới add-on · bundle tải lười (khung app không chứa mã tính năng).
// Chạy: node scripts/test/confidence.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import jsdom from 'jsdom';
process.on('unhandledRejection', () => {}); // mất mạng giả: beacon/sync của app ném lỗi fetch (trình duyệt chỉ ghi log)
const require = createRequire(import.meta.url);
const WEB = 'web';
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));

async function boot(lang, { offline = false } = {}) {
  const vc = new jsdom.VirtualConsole(); vc.on('jsdomError', e => { if (!/Not implemented|Could not parse CSS/.test(e.message)) console.error(e.message); });
  const dom = new jsdom.JSDOM(html.replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, '').replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, ''), { url: `http://localhost/app/?hl=${lang}#/home`, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window, errors = [];
  w.addEventListener('error', e => errors.push(e.message)); w.console.error = (...a) => errors.push(a.join(' '));
  w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} }); w.CSS = { escape: s => s };
  w.fetch = async () => { if (offline) throw new Error('offline'); return { ok: false, status: 404, json: async () => ({}), text: async () => '' }; };
  if (offline) Object.defineProperty(w.navigator, 'onLine', { get: () => false });
  for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
  // từ điển lõi: trình duyệt tải js/i18n/<lang>.js bằng fetch (ở đây fetch giả) → nạp thẳng
  for (const f of ['js/i18n/en.js', ...(lang === 'en' || lang === 'vi' ? [] : [`js/i18n/${lang}.js`])]) w.eval(fs.readFileSync(path.join(WEB, f), 'utf8'));
  require('./lazyfix.js')(w, fs, path, WEB, errors);
  w.speechSynthesis = { speak() {}, cancel() {}, getVoices: () => [], pause() {}, resume() {} }; w.SpeechSynthesisUtterance = function (t) { this.text = t; };
  const spoken = [];
  w.UI.speak = () => {}; w.UI.tts = (text, acc, rate, opts = {}) => { spoken.push([text, rate]); if (opts.onEnd) setTimeout(opts.onEnd, 1); };
  w.UI.recognize = (target, acc, cb = {}) => { setTimeout(() => { cb.start && cb.start(); cb.result && cb.result({ heard: target, score: 92, audio: '' }); cb.end && cb.end(); }, 2); return { stop() {} }; };
  await tick(300); if (w.I18N.whenReady) await w.I18N.whenReady(); await w.App.ready; await tick(300); w.location.hash = '#/welcome/setup'; await tick(150); const g = w.document.querySelector('#go'); if (g) g.click(); await tick(1500);
  const $ = (s, r = w.document) => r.querySelector(s), $$ = (s, r = w.document) => [...r.querySelectorAll(s)];
  const go = async (h, ms = 200) => { w.location.hash = h; await tick(ms); };
  const click = el => el && el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  const view = () => $('#view') || w.document.body;
  return { w, errors, spoken, $, $$, go, click, view };
}
const labelled = (b, w) => (b.getAttribute('aria-label') || b.textContent || '').replace(/[\s\u{1F000}-\u{1FFFF}☀-➿←→✓✗⏹▶️]/gu, '').length > 0 || !!b.getAttribute('aria-label');

// ===== 1) Luồng đầy đủ (en) =====
{
  const A = await boot('en'), { w, $, $$, go, click, errors } = A;
  ok(w.CONF && w.CONF.units.length >= 12, 'data.js nạp 12 bài');
  ok(typeof w.RP === 'object' && typeof w.RP.chat === 'function', 'roleplay.js xuất RP.chat cho Giao tiếp tự tin');
  await go('#/home');
  ok(!!$('a[href="#/confidence"]', $('#view')), 'lối vào: thẻ trang chủ');
  ok(!!$('#nav a[href="#/confidence"]'), 'lối vào: menu Kỹ năng (nav)');
  await go('#/skill/speaking'); ok(!!$('#view a[href="#/confidence"]'), 'lối vào: trang kỹ năng Nói');
  await go('#/confidence');
  const v = $('#view');
  ok(/Speak with confidence/.test(v.textContent), 'tổng quan: tiêu đề tiếng Anh ' + w.I18N.lang() + ' ' + v.textContent.slice(0, 120));
  ok($$('a.cf-unit', v).length >= 12 && $$('.cf-soon', v).length === 4, 'tổng quan: 12 bài + 4 bài B2 "Coming soon"');
  ok(!!$('a[href="#/confidence/daily"]', v) && !!$('a[href="#/confidence/toolkit"]', v), 'tổng quan: thử thách ngày + bộ công cụ');
  // link sâu cụm câu
  await go('#/confidence/cafe#can-i-get');
  const ph = $('#can-i-get'); ok(ph && ph.classList.contains('hl'), 'link sâu #/confidence/cafe#can-i-get làm nổi đúng cụm');
  ok($$('.cf-ph', $('#view')).length === 7, 'trang bài: 7 cụm câu');
  ok(/I want a latte/.test($('#view').textContent) && /Can I get a latte/.test($('#view').textContent), 'cặp "say this instead of that"');
  await go('#/confidence/khong-co'); ok(/#\/confidence$/.test(w.location.hash), 'bài không tồn tại → về tổng quan');
  // chạy bài
  await go('#/confidence/cafe'); click($('#cfGo')); await tick(50);
  ok($$('.cf-line').length === 8 && !!$('#cfSlow'), 'bước 1: hội thoại mẫu 8 câu + nút nghe chậm');
  A.spoken.length = 0; click($('#cfSlow')); await tick(3600);
  ok(A.spoken.length >= 8 && A.spoken.every(([, r]) => r < 0.8), 'nghe chậm: đọc hết hội thoại ở tốc độ chậm');
  click($('#cfNext')); await tick(50);
  ok($$('.cf-ph').length === 7, 'bước 2: gói 7 cụm');
  click($('#cfNext')); await tick(50);
  click($('#cfMic')); await tick(40);
  ok(/92%/.test($('#cfFb').textContent) && $$('.cf-w.y').length > 0, 'bước 3: nói theo → điểm + tô từng từ');
  click($('#cfNext')); await tick(50);
  click($('#cfMic')); await tick(40);
  ok(/✅/.test($('#cfFb').textContent), 'bước 4: điền chỗ trống bằng giọng nói');
  click($('#cfGn')); await tick(20); $('#cfIn').value = 'nope'; click($('#cfChk')); await tick(10);
  ok(!/✅/.test($('#cfFb').textContent), 'bước 4: gõ sai → chưa qua');
  click($('#cfNext')); await tick(50);
  click($('#cfRp')); await tick(200);
  ok(!!$('#rpChat') && !!$('#rpHelp'), 'bước 5: roleplay dùng chung roleplay.js + nút "Help me say it"');
  click($('#rpHelp')); await tick(20);
  ok($('#rpIn').value.length > 3 && /Listen, then say this/.test($('#rpHintBox').textContent), '"Help me say it" đọc chậm + điền sẵn câu');
  for (let k = 0; k < 6 && $('#rpIn'); k++) { click($('#rpHelp')); click($('#rpSend')); await tick(120); }
  await tick(900);
  ok(!!$('#rpDone'), 'roleplay xong → nút Tiếp tục (không rời bài)');
  click($('#rpDone')); await tick(400);
  ok(/You finished this lesson/.test($('#view').textContent), 'bước 6: tổng kết');
  await tick(400);
  const cards = Object.keys(w.App.state.cards);
  ok(cards.includes('can i get a latte, please?') || cards.some(c => /can i get a latte/i.test(c)), 'cụm câu đã lưu vào SRS');
  ok(JSON.parse(w.localStorage.getItem('vb.conf')).done.cafe, 'đánh dấu bài đã xong (máy)');
  // bộ công cụ
  await go('#/confidence/toolkit#repair-say-again');
  ok($$('section.card', $('#view')).length === 5 && $('#repair-say-again').classList.contains('hl'), 'bộ công cụ: 5 nhóm + link sâu');
  // thử thách ngày: điểm tự tin
  ok(w.Confidence.scoreOf({ wpm: 110, pausesPerMin: 1, secs: 120, phrases: 2 }, 5) > w.Confidence.scoreOf({ wpm: 40, pausesPerMin: 8, secs: 30, phrases: 0 }, 2), 'điểm tự tin: nói trôi + dùng cụm + tự tin cao → điểm cao hơn');
  await go('#/confidence/daily'); ok(!!$('#cfRec') && /2:00/.test($('#cfClock').textContent), 'thử thách 2 phút: đồng hồ + nút ghi');
  // cuối roleplay thường → lối vào bài tương ứng
  await go('#/roleplay/cafe'); click($('#rpGo')); await tick(200); $('#rpIn').value = 'Hi! Can I get a latte, please?'; click($('#rpSend')); await tick(200); click($('#rpEnd')); await tick(800);
  ok(!!$('#view a[href="#/confidence/cafe"]'), 'lối vào: cuối roleplay → bài Ở quán cà phê');
  ok(!errors.filter(e => !/whisper|Not implemented/i.test(e)).length, 'không lỗi JS: ' + errors.slice(0, 3).join(' | '));
  // a11y + mobile
  await go('#/confidence/cafe'); click($('#cfGo')); await tick(50);
  for (const h of ['#/confidence', '#/confidence/cafe', '#/confidence/toolkit', '#/confidence/daily']) {
    await go(h); const bad = $$('#view button, #view a').filter(b => !labelled(b, w));
    ok(!bad.length, `a11y ${h}: mọi nút/link có nhãn (${bad.map(b => b.outerHTML.slice(0, 60)).join(' | ')})`);
  }
}
// ===== 2) Mất mạng: roleplay rơi về kịch bản soạn sẵn =====
{
  const { $, go, click } = await boot('en', { offline: true });
  await go('#/confidence/directions'); click($('#cfGo')); await tick(30);
  for (let k = 0; k < 4; k++) { click($('#cfSkip')); await tick(30); }
  click($('#cfRp')); await tick(200);
  ok(/Pre-written script|script/i.test($('#rpMode') ? $('#rpMode').textContent : ''), 'mất mạng: roleplay dùng kịch bản (' + ($('#rpMode') || {}).textContent + ')');
}
// ===== 3) i18n-leak: es / ja / ar không lộ tiếng Việt =====
for (const lang of ['es', 'ja', 'ar']) {
  const { $, go, click } = await boot(lang);
  const leaks = [];
  const scan = h => { const tx = ($('#view') || {}).textContent || ''; if (VI.test(tx)) leaks.push(h + ': ' + (tx.match(new RegExp('.{0,30}' + VI.source + '.{0,30}', 'i')) || [''])[0]); };
  for (const h of ['#/confidence', '#/confidence/greetings', '#/confidence/opinions', '#/confidence/toolkit', '#/confidence/daily']) { await go(h); scan(h); }
  await go('#/confidence/doctor'); click($('#cfGo')); await tick(30);
  for (let k = 0; k < 4; k++) { scan('bước ' + (k + 1)); click($('#cfNext')); await tick(40); }
  scan('bước 5');
  ok(!leaks.length, `${lang}: không lộ chữ Việt – ${leaks.slice(0, 2).join(' | ')}`);
}
// ===== 4) Tĩnh: tải lười, mobile, add-on =====
{
  const sw = fs.readFileSync('web/sw.js', 'utf8'), app = fs.readFileSync('web/js/app.js', 'utf8'), js = fs.readFileSync('web/js/confidence.js', 'utf8');
  ok(!/confidence/.test((sw.match(/const SHELL = \[([\s\S]*?)\];/) || [])[1] || ''), 'khung app không chứa file Giao tiếp tự tin (tải lười)');
  ok(/confidence: \['js\/i18n\/en\/confidence\.js', 'js\/confidence\/data\.js', 'js\/confidence\.js'\]/.test(app), 'bundle confidence trong BUNDLES (prefetch → dùng offline)');
  ok(!/(?<!max-)width:\s*\d{3,}px/.test(js) && /min\(100%/.test(js), 'mobile: không bề rộng cố định, lưới co theo màn hình');
  ok((js.match(/min-(height|width):4[4-9]px|min-(height|width):5\dpx|min-(height|width):6\dpx/g) || []).length >= 4, 'vùng chạm ≥ 44 px');
  // t() lúc nạp module: i18n-switch.mjs --scan (npm test) quét cả file này
  ok(/#\/confidence/.test(fs.readFileSync('extension/newtab.js', 'utf8')), 'lối vào: tab mới add-on (link)');
  ok(!/fetch\(|sendBeacon|XMLHttpRequest/.test(js), 'riêng tư: confidence.js không gửi gì lên mạng (âm thanh ở máy)');
}
console.log(fails ? `✗ confidence: ${fails}/${n} lỗi` : `✓ confidence: ${n} kiểm tra`);
process.exit(fails ? 1 : 0);
