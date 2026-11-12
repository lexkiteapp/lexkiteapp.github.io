// Popup tra từ ở màn Ôn (jsdom): chạm từ trong câu ví dụ của thẻ → ô ngữ cảnh là đúng câu ví dụ (không lẫn tên từ, phiên âm, UK/US, "💬 Ví dụ"),
// 🔊 và 🐢 gửi vào speechSynthesis đúng câu đó. Kèm test đơn vị UI.ttsClean (bộ làm sạch chung cho mọi chỗ gọi TTS).
// Chạy: node scripts/test/review-lookup.js web
const { JSDOM } = require('jsdom');
const fs = require('fs'), path = require('path');
const WEB = process.argv[2] || 'web';
const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, ''), { url: 'http://localhost/app/#/home', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, errors = [], spoken = [];
w.addEventListener('error', e => errors.push(e.message));
w.console.error = (...a) => errors.push(a.join(' '));
w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false });
w.CSS = { escape: s => s }; w.fetch = async () => ({ ok: false, json: async () => ({}) });
w.HTMLMediaElement.prototype.play = () => Promise.resolve(); w.HTMLMediaElement.prototype.pause = () => {}; w.HTMLCanvasElement.prototype.getContext = () => null;
w.Range.prototype.getBoundingClientRect = () => ({ top: 100, left: 100, bottom: 120, right: 140, width: 40, height: 20 });
w.SpeechSynthesisUtterance = function (text) { this.text = text; };
w.speechSynthesis = { speak: u => spoken.push({ text: u.text, rate: u.rate }), cancel() {}, pause() {}, resume() {}, getVoices: () => [], paused: false, speaking: false, addEventListener() {} };
for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
const $ = s => w.document.querySelector(s);
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const EX = 'Many people argue that practical life skills should be added to the school curriculum.';
(async () => {
  await tick(300);
  // ---------- đơn vị: UI.ttsClean ----------
  const C = w.UI.ttsClean, eq = (a, b) => ok(C(a) === b, `ttsClean(${JSON.stringify(a)}) → ${JSON.stringify(C(a))}, cần ${JSON.stringify(b)}`);
  eq(`📌 📚 curriculum /kəˈrɪkjələm/ UK US n 💬 Ví dụ ${EX}`, EX);
  eq(`📚 curriculum /kəˈrɪkjələm/ UK US n 💬 Example ${EX}`, EX);
  eq(`✍️ Câu của bạn I accomplished the goal.`, 'I accomplished the goal.');
  eq('that /ðæt/ det', 'that');
  eq('🇬🇧 UK /ˈwɔːtə/ 🇺🇸 US /ˈwɑːtər/ water', 'water');
  eq('🔊 Hello world 🐢', 'Hello world');
  eq('/ðæt/', '');
  eq('', ''); eq(null, '');
  eq(EX, EX); // câu thường giữ nguyên
  eq('The US economy grew in the UK and/or Europe, 24/7 at 60 km/h.', 'The US economy grew in the UK and/or Europe, 24/7 at 60 km/h.');
  eq('Ví dụ: một câu tiếng Việt', 'Ví dụ: một câu tiếng Việt'); // không emoji/phiên âm → không đụng
  eq('  Many   people\nargue.  ', 'Many people argue.');
  // ---------- e2e: thẻ "curriculum" ở màn Ôn ----------
  const now = Date.now(), c = w.Core.Cards.make({ word: 'curriculum', vi: 'chương trình giảng dạy', pos: 'noun', ipa: '/kəˈrɪkjələm/', ex: EX });
  c.srs = { ef: 2.5, interval: 5, reps: 3, lapses: 0, due: now - 1000, last: now - 5 * 864e5, step: 0, S: 5, D: 9 };
  w.localStorage.setItem('ielts.cards', JSON.stringify({ curriculum: c })); w.App.state.cards = await w.Core.Cards.all();
  w.App.state.settings.autoSpeak = false; w.App.state.settings.hqVoice = false; // đo đúng chuỗi vào speechSynthesis (không qua mp3 Kokoro)
  w.Dict.quick = async () => ({ found: true, word: 'that', pos: 'det', ipa: '/ðæt/', vi: 'đó, kia' });
  w.location.hash = '#/home'; await tick(60); w.location.hash = '#/review'; await tick(400);
  const bq = $('.face.front .rctx-tx'); ok(bq, 'mặt trước thẻ có câu ví dụ');
  ok(bq && bq.dataset.sent === EX, 'câu ví dụ mang data-sent = câu có cấu trúc');
  ok(/📚|UK|\/kə/.test($('.face.front').textContent), 'thẻ cha có tên từ/phiên âm/nhãn (bối cảnh tái hiện lỗi)');
  // chạm (bôi chọn) "that" trong câu ví dụ
  const walker = w.document.createTreeWalker(bq, 4); let node; while ((node = walker.nextNode()) && !node.nodeValue.includes(' that ')) { /* tìm nút chữ */ }
  ok(node, 'tìm thấy chữ "that" trong câu');
  if (node) {
    const i = node.nodeValue.indexOf(' that ') + 1, r = w.document.createRange(); r.setStart(node, i); r.setEnd(node, i + 4);
    const sel = w.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    bq.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true })); await tick(40);
    const look = $('.sel-bar [data-act="look"]'); ok(look, 'thanh chọn hiện nút Tra nghĩa');
    if (look) { look.click(); await tick(120); }
    const pop = $('.sel-pop'), cx = pop && pop.querySelector('.ctx-tx');
    ok(pop && !pop.hidden && /^\s*that\b/.test(pop.textContent) && /\/ðæt\//.test(pop.textContent), 'popup tra "that" hiện từ + phiên âm');
    ok(cx && cx.dataset.sent === EX, 'ô ví dụ trong popup = đúng câu ví dụ: ' + (cx && cx.dataset.sent));
    ok(cx && !/📚|💬|\/kə|\bUK\b|Ví dụ/.test(cx.textContent), 'ô ví dụ không lẫn chữ thẻ cha: ' + (cx && cx.textContent));
    const [say, slow] = pop ? [...pop.querySelectorAll('.ctx-box [data-saysent]')] : [];
    spoken.length = 0; if (say) say.click(); await tick(30);
    ok(spoken.length === 1 && spoken[0].text === EX, '🔊 đọc đúng câu ví dụ: ' + JSON.stringify(spoken));
    spoken.length = 0; if (slow) slow.click(); await tick(30);
    ok(spoken.length === 1 && spoken[0].text === EX && spoken[0].rate === 0.7, '🐢 đọc chậm đúng câu ví dụ: ' + JSON.stringify(spoken));
    // dù chuỗi thô lọt vào (nút cũ/bản cache), TTS vẫn chỉ đọc câu
    spoken.length = 0; w.UI.tts(`📌 📚 curriculum /kəˈrɪkjələm/ UK US n 💬 Ví dụ ${EX}`, 'en-GB'); await tick(10);
    ok(spoken.length === 1 && spoken[0].text === EX, 'UI.tts làm sạch chuỗi thô: ' + JSON.stringify(spoken));
  }
  ok(!errors.length, 'không lỗi JS: ' + errors.slice(0, 3).join(' | '));
  if (fails) { console.log(`✗ review-lookup: ${fails} lỗi`); process.exit(1); }
  console.log('✓ review-lookup: ttsClean · popup tra từ ở màn Ôn lấy đúng câu ví dụ · 🔊/🐢 đọc đúng câu');
  process.exit(0);
})();
