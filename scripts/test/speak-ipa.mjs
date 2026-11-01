// Loa 🔊 + IPA cho nội dung tiếng Anh (owner 28/10): UI.sayBtn / UI.ipaTag / UI.fillIpa và trang Sổ lỗi sai (#/mistakes)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

console.log('--- Kiểm tra loa + IPA (UI.sayBtn, #/mistakes, #/quick) ---');
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="view"></div><div id="toast"></div></body></html>', { url: 'https://lexkite.com/#/mistakes', runScripts: 'outside-only' });
const { window } = dom;
window.t = (k, p) => { let s = String(k); if (p) for (const [a, b] of Object.entries(p)) s = s.replaceAll('{' + a + '}', b); return s; };
window.I18N = { lang: () => 'vi', tk: (k, v) => ({ k, v }) };
window.IELTS_DATA = { INDEX: { compulsory: { word: 'compulsory', ipa: '/kəmˈpʌlsəri/', vi: 'bắt buộc' } } };
window.eval(fs.readFileSync('web/js/ui.js', 'utf8'));
const UI = window.UI;

// 1. Helper dùng chung
assert.match(UI.sayBtn('compulsory'), /class="icon-btn sm" data-speak="compulsory">🔊</, 'Từ → nút .icon-btn.sm data-speak');
assert.match(UI.sayBtn('She has lived here since 2010.'), /data-speak-text="She has lived here since 2010\."/, 'Câu → data-speak-text');
assert.equal(UI.sayBtn(''), '', 'Rỗng → không có nút');
assert.match(UI.sayBtn('a "b" <c>'), /data-speak="a &quot;b&quot; &lt;c&gt;"/, 'Thoát ký tự HTML');
assert.equal(UI.ipaOf('Compulsory'), '/kəmˈpʌlsəri/', 'IPA lấy từ kho từ trong máy');
assert.match(UI.ipaTag('compulsory'), /<span class="ipa small" translate="no">\/kəmˈpʌlsəri\/<\/span>/);
assert.match(UI.ipaTag('serendipity'), /data-ipa-lazy="serendipity"/, 'Thiếu IPA → chỗ trống tra lười');
assert.equal(UI.ipaTag('this is a long sentence'), '', 'Câu dài → không IPA');
// fillIpa: không có Dict → không làm gì; có Dict.quick → điền
const box = window.document.createElement('div'); box.innerHTML = UI.ipaTag('serendipity');
UI.fillIpa(box); assert.ok(box.querySelector('[data-ipa-lazy]'), 'Không tự tải từ điển khi chưa có Dict');
window.Dict = { quick: async w => ({ word: w, ipa: '/ˌserənˈdɪpəti/' }) };
UI.fillIpa(box); await new Promise(r => setTimeout(r, 0));
assert.equal(box.querySelector('.ipa').textContent, '/ˌserənˈdɪpəti/', 'Dict.quick điền IPA còn thiếu');
// Nút sinh sau (chưa bindCommon) vẫn đọc: bộ bắt click dự phòng gọi tts
let spoken = '';
window.speechSynthesis = { cancel() {}, speak(u) { spoken = u.text; }, getVoices: () => [] };
window.SpeechSynthesisUtterance = function (text) { this.text = text; };
box.innerHTML = UI.sayBtn('Nice to meet you.');
window.document.body.appendChild(box); box.firstChild.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await new Promise(r => setTimeout(r, 30));
assert.equal(spoken, 'Nice to meet you.', 'Nút loa chưa gắn onclick vẫn đọc nhờ bộ bắt click dự phòng');
box.remove();
console.log('✓ UI.sayBtn / ipaOf / ipaTag / fillIpa · click dự phòng');

// 2. Sổ lỗi sai – mỗi từ chỉ 1 IPA + 1 loa; dòng Đáp án đúng loại câu; giải thích không lặp những gì đã hiện (owner 28/10)
const mistakes = [
  { kind: 'vocab', q: 'Nghĩa của “compulsory”?', qK: { k: 'Nghĩa của “{word}”?', v: { word: 'compulsory' } }, answer: 'bắt buộc', given: 'tùy chọn', explain: 'compulsory /kəmˈpʌlsəri/ = bắt buộc', ref: 'compulsory', key: 'a', n: 1, at: Date.now() },
  { kind: 'vocab', q: 'Từ tiếng Anh nghĩa là “bắt buộc”?', qK: { k: 'Từ tiếng Anh nghĩa là “{vi}”?', v: { vi: 'bắt buộc' } }, answer: 'mandatory', given: 'optional', explain: 'mandatory /ˈmændətəri/ = bắt buộc', ref: 'mandatory', key: 'b', n: 1, at: Date.now() },
  { kind: 'grammar', q: 'She ___ here since 2010.', answer: 'has lived', given: 'lives', explain: 'Hiện tại hoàn thành', ref: 'g1', key: 'c', n: 2, at: Date.now() },
  { kind: 'reading', q: 'Bài 1: Q3', answer: '(bỏ trống)', given: 'x', explain: '', ref: 'r1', key: 'd', n: 1, at: Date.now() },
  // Bản ghi cũ (ảnh owner): câu nghe & gõ lại bị lưu là "Nghĩa của X?" với đáp án = chính X
  { kind: 'vocab', q: 'Nghĩa của “compulsory”?', qK: { k: 'Nghĩa của “{word}”?', v: { word: 'compulsory' } }, answer: 'compulsory', given: 'compulsary', explain: 'compulsory /kəmˈpʌlsəri/ = bắt buộc', ref: 'compulsory', key: 'e', n: 1, at: Date.now() },
  { kind: 'vocab', q: 'Gõ lại từ bạn nghe được', qK: { k: 'Gõ lại từ bạn nghe được' }, answer: 'mandatory', given: 'mandatery', explain: 'mandatory /ˈmændətəri/ = bắt buộc', ref: 'mandatory', key: 'f', n: 1, at: Date.now() }
];
const store = { mistakes };
window.Core = { Store: { get: async (k, d) => store[k] ?? d, set: async (k, v) => { store[k] = v; } }, Golden: {}, SRS: {}, Cards: {}, todayKey: () => '2026-10-28', DAY: 864e5 };
const W = p => p;
window.App = { state: { settings: { accent: 'en-GB' }, cards: {}, game: { days: {} }, stats: { days: {} } }, routes: {}, view: window.document.getElementById('view'), W, guard: fn => fn, bindCommon() {}, inDeck: () => false, reward() {}, lazy: async () => {} };
window.eval(fs.readFileSync('web/js/plan.js', 'utf8'));
// 2a. Hàm thuần App.mistakeView
const mv = window.App.mistakeView, [ma, mb, mc, md, me, mf] = mistakes.map(mv);
assert.deepEqual([ma.qSay, ma.qIpa, ma.ans, ma.ansSay, ma.tip], ['compulsory', 'compulsory', 'bắt buộc', '', ''], '"Nghĩa của X?": X + IPA + loa ở đầu; đáp án = nghĩa; giải thích lặp → bỏ');
assert.deepEqual([mb.qSay, mb.ansSay, mb.ansIpa, mb.tip], ['', 'mandatory', 'mandatory', ''], '"Từ tiếng Anh nghĩa là …": loa + IPA ở đáp án; nghĩa đã ở câu hỏi → không giải thích');
assert.deepEqual([mc.ansSay, mc.ansIpa, mc.tip], ['has lived', '', 'Hiện tại hoàn thành'], 'Ngữ pháp: loa đáp án, không IPA, giữ giải thích');
assert.deepEqual([md.ansSay, md.qSay], ['', ''], '"(bỏ trống)" không loa');
assert.deepEqual([me.q, me.qSay, me.qIpa, me.ans, me.ansSay, me.ansIpa, me.tip], ['Gõ lại từ bạn nghe được', 'compulsory', '', 'compulsory', '', 'compulsory', 'bắt buộc'], 'Bản ghi cũ lỗi: thành câu nghe – loa đầu thẻ, đáp án = từ + IPA (không loa thứ 2), giải thích chỉ còn nghĩa');
assert.deepEqual([mf.qSay, mf.ansSay, mf.ansIpa, mf.tip], ['mandatory', '', 'mandatory', 'bắt buộc'], 'Câu nghe mới: 1 loa đầu thẻ, IPA ở đáp án');
for (const v of [ma, mb, mc, md, me, mf]) {
  assert.ok(!(v.qSay && v.ansSay), 'Không bao giờ 2 loa cho một thẻ');
  assert.ok(!(v.qIpa && v.ansIpa), 'Không bao giờ 2 IPA cho một thẻ');
  assert.ok(!/\/[^/]+\//.test(v.tip) || !(v.qIpa || v.ansIpa), 'Giải thích không lặp IPA đã hiện');
}
// 2b. Thẻ đã vẽ
for (const retry of [false, true]) {
  await window.App.routes.mistakes('', new window.URLSearchParams(retry ? 'retry=1' : ''));
  const cards = [...window.document.querySelectorAll('#mList .card')];
  assert.equal(cards.length, 6, 'Đủ 6 lỗi sai');
  const by = k => cards.find(c => c.querySelector(`[data-fix="${k}"]`)); const [v1, v2, g1, r1, l1] = ['a', 'b', 'c', 'd', 'e'].map(by);
  for (const c of cards) {
    assert.ok(c.querySelectorAll('[data-speak],[data-speak-text]').length <= 1, 'Mỗi thẻ tối đa 1 loa');
    assert.ok(c.querySelectorAll('.ipa').length <= 1, 'Mỗi thẻ tối đa 1 IPA');
    const no = c.querySelector('.mb-row.no'); if (no) assert.ok(!no.querySelector('[data-speak],[data-speak-text]'), 'Câu trả lời sai của bạn không có loa');
    assert.equal(c.querySelectorAll('.mb-acts:not([data-self])').length, 1, 'Nút thao tác nằm một hàng');
  }
  const q1 = v1.querySelector('.mb-q');
  assert.ok(q1.querySelector('[data-speak="compulsory"]'), 'Câu hỏi "Nghĩa của …" có loa đọc từ');
  assert.equal(q1.querySelector('.ipa').textContent, '/kəmˈpʌlsəri/', 'Câu hỏi "Nghĩa của …" có IPA');
  assert.equal(v1.querySelector('.mb-row.ok .mb-v').textContent, 'bắt buộc', 'Đáp án câu nghĩa là NGHĨA, không phải từ');
  assert.ok(!v1.querySelector('.mb-tip'), 'Giải thích lặp từ/IPA/nghĩa → không hiện');
  assert.ok(!v2.querySelector('.mb-q [data-speak]'), 'Câu hỏi "Từ tiếng Anh nghĩa là …" KHÔNG có loa (lộ đáp án)');
  const ans2 = v2.querySelector('.mb-row.ok');
  assert.ok(ans2.querySelector('[data-speak="mandatory"]'), 'Phần đáp án từ vựng có loa đọc từ');
  assert.ok(ans2.querySelector('[data-ipa-lazy="mandatory"], .ipa'), 'Phần đáp án từ vựng có chỗ IPA');
  assert.ok(g1.querySelector('.mb-row.ok [data-speak="has lived"]'), 'Đáp án ngữ pháp tiếng Anh có loa');
  assert.ok(!g1.querySelector('.mb-q [data-speak],.mb-q [data-speak-text]'), 'Câu hỏi có chỗ trống ___ không có loa');
  assert.equal(g1.querySelector('.mb-tip').textContent, 'Hiện tại hoàn thành', 'Giải thích ngữ pháp vẫn hiện');
  assert.ok(!r1.querySelector('[data-speak],[data-speak-text]'), 'Đáp án "(bỏ trống)" không có loa');
  assert.equal(l1.querySelector('.mb-qt').textContent, 'Gõ lại từ bạn nghe được', 'Bản ghi cũ hiện đúng dạng câu nghe');
  assert.ok(l1.querySelector('.mb-q [data-speak="compulsory"]') && !l1.querySelector('.mb-q .ipa'), 'Câu nghe: loa ở đầu thẻ, không lộ chữ/IPA');
  assert.equal(l1.querySelector('.mb-tip').textContent, 'bắt buộc', 'Câu nghe: giải thích chỉ còn nghĩa');
  if (retry) assert.ok(v2.querySelector('[data-ans]').hidden && v2.querySelector('[data-ans] .mb-row.ok'), 'Chế độ làm lại: đáp án nằm trong phần ẩn');
}
console.log('✓ #/mistakes: 1 IPA + 1 loa mỗi thẻ, Đáp án đúng loại câu, giải thích không lặp, không lộ đáp án khi làm lại');
// 2c. Nguồn ghi lỗi: chỉ câu chọn nghĩa (mcq-vi) mới hỏi "Nghĩa của X?"; câu nghe ghi đúng đề
const study = fs.readFileSync('web/js/study.js', 'utf8');
assert.match(study, /q\.type === 'type-listen' \? I18N\.tk\('Gõ lại từ bạn nghe được'\) : q\.type === 'mcq-vi' \? I18N\.tk\('Nghĩa của “\{word\}”\?'/, 'study.js: đề lỗi sai khớp loại câu');
console.log('✓ study.js: đề lỗi sai khớp loại câu (nghe ≠ nghĩa)');
// 2d. Bảng phản hồi luyện tập: dòng đầu không lặp lại từ đã có ở khối từ + IPA + loa ngay dưới (chỉ nêu đáp án khi khác từ, vd. dạng chia trong câu)
assert.match(study, /q\.answer && q\.answer\.toLowerCase\(\) !== w\.word\.toLowerCase\(\) \? t\('Chưa đúng · Đáp án: \{answer\}'/, 'study.js: "Chưa đúng · Đáp án" không lặp từ của khối bên dưới');
// 2e. Câu + loa: loa nằm trong .say-line (cố định ở mép cuối) – không trôi theo chữ
const gram = fs.readFileSync('web/js/grammar.js', 'utf8');
assert.equal((gram.match(/sayBtn\(/g) || []).length, 1, 'grammar.js: mọi loa đi qua sayLine()');
assert.match(study, /fi-ex say-line"><span class="say-tx">/, 'Thẻ ôn: ví dụ + loa dùng .say-line');
assert.match(study, /sheet-ex"><div class="say-line"><span class="say-tx">/, 'Bảng phản hồi: ví dụ + loa dùng .say-line');
assert.match(fs.readFileSync('web/css/style.css', 'utf8'), /\.say-line \{ display: flex;/, 'style.css có .say-line');
console.log('✓ Bảng phản hồi không lặp từ · loa thẳng hàng (.say-line) ở ngữ pháp, thẻ ôn, phản hồi luyện tập');

// 3. Chơi nhanh 15 giây: từ hiện ra có loa (từ là đề bài, đáp án là nghĩa)
const quick = fs.readFileSync('web/js/quick.js', 'utf8');
assert.match(quick, /qk-word[^\n]*\n[^\n]*UI\.sayBtn\(q\.word\)/, '#/quick: từ đề bài có loa');
console.log('✓ #/quick: từ đề bài có loa + IPA');
