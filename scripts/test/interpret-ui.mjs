// Phiên dịch (#/interpret) – dựng giao diện bằng jsdom với micro/dịch/giọng GIẢ: luồng nói → dịch → hiện ở nửa đối diện, lưu Sổ từ, nói lại, câu mẫu, lịch sử, tóm tắt. Nhẹ, không trình duyệt thật.
import fs from 'node:fs'; import assert from 'node:assert/strict'; import { JSDOM } from 'jsdom';
const dom = new JSDOM('<main id="v"></main>', { runScripts: 'outside-only', url: 'http://lexkite.localhost/app/' }), w = dom.window;
const calls = { tts: [], words: [], rec: [], toast: [] }; let heard = 'Xin chào, tôi cần giúp đỡ';
w.self = w; w.t = (k, v) => String(k).replace(/\{(\w+)\}/g, (m, n) => (v && n in v ? v[n] : m));
w.UI = { esc: s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), toast: m => calls.toast.push(m), icon: n => `<i>${n}</i>`, tts: (tx, loc, r) => calls.tts.push([tx, loc, r]), stopSpeak() {}, skelPage: s => s, confirm: async () => true,
  speechSession: async ({ lang, onText }) => { onText && onText('…'); return { stop: async () => ({ text: heard }), cancel() {} }; },
  recognize: (target, loc, cb) => { calls.rec.push([target, loc]); cb.result({ heard: target, score: 91 }); } };
w.I18N = { lang: () => 'vi', LANGS: { vi: ['Vietnamese', 'Tiếng Việt'], en: ['English', 'English'], es: ['Spanish', 'Español'] } };
const clean = []; w.App = { routes: {}, view: w.document.getElementById('v'), state: { cards: {} }, need: async () => {}, loadScript: async f => { w.eval(fs.readFileSync('web/' + f, 'utf8')); }, onCleanup: f => clean.push(f), addWord: async e => calls.words.push(e) };
w.AILocal = { detect: async tx => ({ lang: 'vi', confidence: 0.95 }), translate: async (tx, f, to) => (f === 'vi' && to === 'en' ? 'Hello, I need help' : null) };
for (const f of ['web/cpack/interpret/core.js', 'web/cpack/interpret/interpret.js']) w.eval(fs.readFileSync(f, 'utf8'));
const V = w.App.view, R = w.App.routes.interpret, $ = q => V.querySelector(q), tick = () => new Promise(r => setTimeout(r, 20));
// 1) Đối mặt: nửa trên xoay (lớp ip-b), mỗi bên có micro riêng; cặp mặc định vi ⇄ en
R(''); assert.ok($('.ip-half.ip-b') && $('.ip-half.ip-a'), 'hai nửa'); assert.equal(V.querySelectorAll('.ip-mic').length, 2); assert.equal($('.ip-half.ip-a').lang, 'vi'); assert.equal($('.ip-half.ip-b').lang, 'en');
// 2) Bấm micro bên dưới → bấm lần nữa để xong → bản dịch hiện ở NỬA TRÊN, đọc thành tiếng bằng ngôn ngữ đích, nút hành động bật
$('.ip-mic[data-s="a"]').click(); await tick(); assert.equal($('.ip-mic[data-s="a"]').getAttribute('aria-pressed'), 'true'); assert.ok($('.ip-mic[data-s="b"]').disabled, 'bên kia khóa khi đang nghe');
$('.ip-mic[data-s="a"]').click(); await tick(); await tick();
assert.equal($('.ip-half.ip-b .ip-heard').textContent, 'Hello, I need help'); assert.equal($('.ip-half.ip-a .ip-live').textContent, heard);
assert.deepEqual(calls.tts.pop(), ['Hello, I need help', 'en-US', undefined]); assert.ok(!$('.ip-act[data-a="save"]').disabled);
// 3) Nghe chậm, lưu Sổ từ (cụm ngoại ngữ + nghĩa theo tiếng mẹ đẻ), nói lại chấm điểm
$('.ip-act[data-a="slow"]').click(); assert.equal(calls.tts.pop()[2], 0.55);
$('.ip-act[data-a="save"]').click(); await tick(); assert.deepEqual([calls.words[0].word, calls.words[0].def], ['Hello, I need help', 'Xin chào, tôi cần giúp đỡ']);
$('.ip-act[data-a="say"]').click(); assert.deepEqual(calls.rec[0], ['Hello, I need help', 'en-US']); assert.match($('.ip-score').textContent, /91/);
// 4) Bên đối diện nói: dò ngôn ngữ cho biết đúng người nói (lệch bên bấm vẫn đúng)
w.AILocal.detect = async () => ({ lang: 'en', confidence: 0.9 }); w.AILocal.translate = async (tx, f, to) => (f === 'en' && to === 'vi' ? 'Tôi sẽ giúp bạn' : null); heard = 'I will help you';
$('.ip-mic[data-s="a"]').click(); await tick(); $('.ip-mic[data-s="a"]').click(); await tick(); await tick();
assert.equal($('.ip-half.ip-a .ip-heard').textContent, 'Tôi sẽ giúp bạn', 'phát hiện en → bên b nói, bản dịch về nửa a');
// 5) Đổi ngôn ngữ bằng hộp chọn (không trùng nhau) + lưu lựa chọn
const sel = $('.ip-lang[data-s="b"]'); sel.value = 'es'; sel.dispatchEvent(new w.Event('change', { bubbles: true })); assert.equal($('.ip-half.ip-b').lang, 'es'); assert.equal(JSON.parse(w.localStorage.getItem('lk.interp.pair')).b, 'es');
// 6) Câu mẫu: tải lười, nghe/lưu/nói lại; RTL cho tiếng Ả Rập
await R('phrases'); await tick(); assert.ok(V.querySelectorAll('.ip-ph').length >= 3, 'có câu mẫu'); V.querySelector('.ip-act[data-a="play"]').click(); assert.ok(calls.tts.length);
V.querySelector('.ip-act[data-a="save"]').click(); await tick(); assert.ok(calls.words.length >= 2);
// 7) Lịch sử + tóm tắt từ mới
R('history'); assert.ok(V.querySelector('.ip-conv'), 'lịch sử có cuộc vừa làm'); R('recap/' + w.InterpretCore.load().convs[0].id); assert.ok(V.querySelector('.ip-rc'), 'tóm tắt có câu đáng nhớ');
V.querySelector('#ipAll').click(); await tick(); assert.ok(calls.words.length >= 3);
// 8) Rời trang → dừng micro/giọng
clean.forEach(f => f()); console.log('interpret-ui: OK');
