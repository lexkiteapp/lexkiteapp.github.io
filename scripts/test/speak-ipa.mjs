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

// 2. Sổ lỗi sai
const mistakes = [
  { kind: 'vocab', q: 'Nghĩa của “compulsory”?', qK: { k: 'Nghĩa của “{word}”?', v: { word: 'compulsory' } }, answer: 'bắt buộc', given: 'tùy chọn', explain: 'compulsory /kəmˈpʌlsəri/ = bắt buộc', ref: 'compulsory', key: 'a', n: 1, at: Date.now() },
  { kind: 'vocab', q: 'Từ tiếng Anh nghĩa là “bắt buộc”?', qK: { k: 'Từ tiếng Anh nghĩa là “{vi}”?', v: { vi: 'bắt buộc' } }, answer: 'mandatory', given: 'optional', explain: '', ref: 'mandatory', key: 'b', n: 1, at: Date.now() },
  { kind: 'grammar', q: 'She ___ here since 2010.', answer: 'has lived', given: 'lives', explain: 'Hiện tại hoàn thành', ref: 'g1', key: 'c', n: 2, at: Date.now() },
  { kind: 'reading', q: 'Bài 1: Q3', answer: '(bỏ trống)', given: 'x', explain: '', ref: 'r1', key: 'd', n: 1, at: Date.now() }
];
const store = { mistakes };
window.Core = { Store: { get: async (k, d) => store[k] ?? d, set: async (k, v) => { store[k] = v; } }, Golden: {}, SRS: {}, Cards: {}, todayKey: () => '2026-10-28', DAY: 864e5 };
const W = p => p;
window.App = { state: { settings: { accent: 'en-GB' }, cards: {}, game: { days: {} }, stats: { days: {} } }, routes: {}, view: window.document.getElementById('view'), W, guard: fn => fn, bindCommon() {}, inDeck: () => false, reward() {}, lazy: async () => {} };
window.eval(fs.readFileSync('web/js/plan.js', 'utf8'));
for (const retry of [false, true]) {
  await window.App.routes.mistakes('', new window.URLSearchParams(retry ? 'retry=1' : ''));
  const cards = [...window.document.querySelectorAll('#mList .card')];
  assert.equal(cards.length, 4, 'Đủ 4 lỗi sai');
  const by = k => cards.find(c => c.querySelector(`[data-fix="${k}"]`)); const [v1, v2, g1, r1] = ['a', 'b', 'c', 'd'].map(by);
  const q1 = v1.children[1];
  assert.ok(q1.querySelector('[data-speak="compulsory"]'), 'Câu hỏi "Nghĩa của …" có loa đọc từ');
  assert.equal(q1.querySelector('.ipa').textContent, '/kəmˈpʌlsəri/', 'Câu hỏi "Nghĩa của …" có IPA');
  assert.ok(!v2.children[1].querySelector('[data-speak]'), 'Câu hỏi "Từ tiếng Anh nghĩa là …" KHÔNG có loa (lộ đáp án)');
  const ans2 = v2.querySelector('[data-ans]') || v2;
  assert.ok(ans2.querySelector('[data-speak="mandatory"]'), 'Phần đáp án từ vựng có loa đọc từ');
  assert.ok(ans2.querySelector('[data-ipa-lazy="mandatory"], .ipa'), 'Phần đáp án từ vựng có chỗ IPA');
  const ex1 = [...v1.querySelectorAll('.small.muted')].find(d => d.textContent.includes('= bắt buộc'));
  assert.ok(ex1 && ex1.querySelector('[data-speak="compulsory"]'), 'Dòng giải thích "compulsory /…/ = bắt buộc" có loa');
  assert.equal(ex1.querySelectorAll('.ipa').length, 0, 'Giải thích đã có IPA → không lặp IPA');
  assert.ok(g1.querySelector('[data-speak="has lived"]'), 'Đáp án ngữ pháp tiếng Anh có loa');
  assert.ok(!g1.children[1].querySelector('[data-speak],[data-speak-text]'), 'Câu hỏi có chỗ trống ___ không có loa');
  assert.ok(!r1.querySelector('[data-speak],[data-speak-text]'), 'Đáp án "(bỏ trống)" không có loa');
  if (retry) assert.ok(v2.querySelector('[data-ans]').hidden, 'Chế độ làm lại: loa đáp án nằm trong phần ẩn');
}
console.log('✓ #/mistakes: loa + IPA ở câu hỏi nghĩa, đáp án, giải thích; không lộ đáp án khi làm lại');

// 3. Chơi nhanh 15 giây: từ hiện ra có loa (từ là đề bài, đáp án là nghĩa)
const quick = fs.readFileSync('web/js/quick.js', 'utf8');
assert.match(quick, /qk-word[^\n]*\n[^\n]*UI\.sayBtn\(q\.word\)/, '#/quick: từ đề bài có loa');
console.log('✓ #/quick: từ đề bài có loa + IPA');
