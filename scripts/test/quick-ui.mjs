import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

console.log('--- Kiểm tra [Q1] Quick Play 15s & English Style Quiz ---');

const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>
  <div id="view"></div>
  <div id="modal" hidden></div>
</body></html>`, { url: 'https://lexkite.com/#/quick' });

const { window } = dom;
global.window = window;
global.document = window.document;
global.localStorage = window.localStorage;
global.self = window;

global.t = window.t = (k, p) => {
  let s = String(k);
  if (p) for (const [a, b] of Object.entries(p)) s = s.replaceAll('{' + a + '}', b);
  return s;
};

window.UI = {
  $: s => document.querySelector(s),
  $$: s => document.querySelectorAll(s),
  esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
  modal: html => {
    const m = document.getElementById('modal');
    m.innerHTML = html;
    m.hidden = false;
    return m;
  },
  toast: () => {},
};

window.Kit = {
  svg: (m, s) => `<svg class="kit" data-mood="${m}" width="${s}"></svg>`,
};

window.Sfx = {
  win: () => {},
  levelUp: () => {},
};

let rewarded = 0;

const state = {
  cards: {
    hello: { word: 'hello', vi: 'xin chào', srs: { due: Date.now() - 1000 } },
    world: { word: 'world', vi: 'thế giới', srs: { due: Date.now() - 1000 } },
    cat: { word: 'cat', vi: 'con mèo', srs: { due: Date.now() - 1000 } },
    dog: { word: 'dog', vi: 'con chó', srs: { due: Date.now() - 1000 } },
    bird: { word: 'bird', vi: 'con chim', srs: { due: Date.now() - 1000 } },
  },
  settings: {},
};

window.App = {
  state,
  routes: {},
  view: document.getElementById('view'),
  meanOf: w => (w && (w.vi || w.word)) || '',
  allWords: () => Object.values(state.cards),
  saveSettings: async () => true,
  reward: async d => { rewarded += d.xp || 0; },
  cleanups: [],
};

// 1. Nạp web/js/quick.js
const code = fs.readFileSync('web/js/quick.js', 'utf8');
new Function(code)();

assert(typeof window.App.routes.quick === 'function', 'routes.quick phải là function');
assert(typeof window.App.routes.style === 'function', 'routes.style phải là function');
console.log('✓ routes.quick & routes.style đã đăng ký thành công');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const view = window.App.view;

// 2. Chơi nhanh: render, CSS nạp khi mở, đáp án đúng duy nhất, phương án nhiễu khác nghĩa
window.App.routes.quick();
assert(document.getElementById('qk-css'), 'CSS #qk-css nạp khi mở route');
assert(document.querySelector('.qk-timer-pill'), 'Có đồng hồ 15s');
for (let i = 0; i < 4; i++) {
  const btns = [...document.querySelectorAll('#qkOpts .qk-btn')];
  assert.equal(btns.length, 3, 'Mỗi câu 3 lựa chọn');
  const texts = btns.map(b => b.textContent.trim());
  assert.equal(new Set(texts).size, 3, 'Không trùng lựa chọn');
  const word = document.querySelector('.qk-word').textContent;
  const right = state.cards[word].vi;
  assert.equal(texts.filter(x => x.startsWith(right)).length, 1, 'Đúng 1 đáp án đúng');
  btns[i % 2 ? 0 : texts.findIndex(x => x.startsWith(right))].click();
  assert(btns.some(b => b.classList.contains('qk-right') || b.classList.contains('qk-wrong')), 'Có phản hồi');
  if (!btns.some(b => b.classList.contains('qk-right'))) assert(btns.some(b => b.classList.contains('qk-reveal')), 'Sai → hiện đáp án đúng');
  await sleep(950);
}
assert(document.querySelector('.qk-result-box'), 'Hết 4 câu → màn kết quả');
assert(!document.querySelector('#qkOpts'), 'Không còn câu hỏi sau khi xong');
assert(rewarded > 0 && rewarded <= 8, 'XP nhỏ, tối đa 8');
window.App.cleanups.splice(0).forEach(fn => fn());
console.log('✓ routes.quick: 4 câu, 1 đáp án đúng, phản hồi, kết quả, XP');

// 3. Hết giờ giữa lúc đang xem phản hồi → không vẽ lại câu hỏi đè lên màn kết quả
const realNow = Date.now;
window.App.routes.quick();
document.querySelector('#qkOpts .qk-btn').click();
Date.now = () => realNow() + 16000;
await sleep(1000);
Date.now = realNow;
assert(document.querySelector('.qk-result-box'), 'Hết giờ → màn kết quả');
assert(!document.querySelector('#qkOpts'), 'Không vẽ câu hỏi đè lên kết quả');
window.App.cleanups.splice(0).forEach(fn => fn());
console.log('✓ Hết giờ xử lý đúng');

// 4. Phong cách tiếng Anh: 6 câu, kết quả, lưu, liên kết gợi ý
window.App.routes.style();
for (let i = 0; i < 6; i++) {
  const o = document.querySelectorAll('#styOpts .sty-opt');
  assert.equal(o.length, 4, 'Câu phong cách có 4 lựa chọn');
  o[i === 5 ? 2 : i % 4].click();
  await sleep(280);
}
assert(document.querySelector('.sty-res-box .sty-badge'), 'Có kết quả');
assert.equal(state.settings.englishStyle.id, 'pragmatic', 'Hòa điểm → hệ chọn gần nhất');
const links = [...document.querySelectorAll('.sty-recs a')].map(a => a.getAttribute('href'));
assert(links.length === 3 && links.every(h => /^#\/[a-z]+$/.test(h)), 'Gợi ý là liên kết nội bộ');
console.log('✓ routes.style: 6 câu, kết quả, lưu, liên kết gợi ý');

// 5. app.js khai báo bundle/route + lối vào
const appCode = fs.readFileSync('web/js/app.js', 'utf8');
assert(appCode.includes("quick: ['js/i18n/en/quick.js', 'js/quick.js']"), 'bundle quick');
assert(appCode.includes("quick: ['words', 'quick']") && appCode.includes("style: 'quick'"), 'route quick/style');
assert(appCode.includes('href="#/quick"') && appCode.includes('href="#/style"'), 'lối vào #/quick, #/style');
console.log('--- ALL QUICK PLAY & STYLE TESTS PASSED ---');
process.exit(0);
