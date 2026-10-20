// Test kiểm thử màn kết thúc phiên ôn [U2d] (reviewDone trong study.js)
// Chạy: node scripts/test/review-done.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import jsdom from 'jsdom';

const require = createRequire(import.meta.url);
const { JSDOM } = jsdom;
const WEB = 'web';
let total = 0, fails = 0;
const ok = (cond, msg) => {
  total++;
  if (!cond) {
    fails++;
    console.error('✗', msg);
  } else {
    console.log('✓', msg);
  }
};

const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const css = fs.readFileSync(path.join(WEB, 'css/style.css'), 'utf8');

const vc = new jsdom.VirtualConsole();
vc.on('jsdomError', e => {
  if (!/Not implemented|Could not parse CSS/.test(e.message)) console.error(e.message);
});

const dom = new JSDOM(
  html
    .replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, '')
    .replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '')
    .replace(/<link[^>]+>/g, '')
    .replace('</head>', `<style>${css}</style></head>`),
  {
    url: 'http://localhost/app/#/review',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole: vc,
  }
);

const w = dom.window;
w.scrollTo = () => {};
w.HTMLElement.prototype.scrollIntoView = () => {};
w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
w.CSS = { escape: s => s };
w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => '' });

let spokenWord = null;
const errors = [];
for (const f of scripts) {
  try {
    w.eval(fs.readFileSync(path.join(WEB, f), 'utf8'));
    if (f === 'js/ui.js') {
      w.UI.speak = (word) => { spokenWord = word; };
    }
  } catch (e) {
    errors.push(f + ': ' + e.message);
  }
}
require('./lazyfix.js')(w, fs, path, WEB, errors);

const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
await tick(200);

const { App, UI, Kit, Core } = w;
w.confetti = () => {};
Core.Cards.update = async () => {};
Core.Stats.logReview = async () => ({ days: App.state.stats.days });

// 1. Test reviewDone(true): Không có thẻ nào đến hạn hôm nay
{
  const now = Date.now();
  App.state.cards = {
    future_card: { word: 'future_card', vi: 'thẻ tương lai', srs: { lapses: 0, due: now + 10 * 864e5, last: now, reps: 3 } }
  };
  App.state.settings = { dailyGoal: 10, accent: 'en-US' };
  App.state.stats = { days: {} };
  App.state.game = { xp: 50, days: {} };

  App.routes.review();
  await tick(50);

  const view = App.view;
  ok(view.innerHTML.includes('Hôm nay bạn đã ôn hết!'), 'reviewDone(true): hiển thị Hôm nay bạn đã ôn hết!');
  ok(view.querySelector('a[href="#/home"]'), 'reviewDone(true): có nút Về trang chủ');
  ok(view.querySelector('a.rev-next[href="#/home"]'), 'reviewDone(true): nút chính Học tiếp → kế hoạch hôm nay');
  ok(view.querySelector('a[href="#/practice/learn"]'), 'reviewDone(true): có nút Học thông minh');
}

// 2. Test reviewDone(false): Phiên ôn hoàn thành có từ bị quên
{
  spokenWord = null;
  const now = Date.now();
  App.state.cards = {
    ephemeral: { word: 'ephemeral', ipa: 'ɪˈfem.ər.əl', vi: 'phù du, chóng tàn', srs: { lapses: 5, due: now - 1000, last: now - 864e5, reps: 2 }, contexts: [], col: [], syn: [] },
    ubiquitous: { word: 'ubiquitous', ipa: 'juːˈbɪk.wə.təs', vi: 'phổ biến khắp nơi', srs: { lapses: 2, due: now - 2000, last: now - 864e5, reps: 2 }, contexts: [], col: [], syn: [] },
  };
  App.state.settings = { dailyGoal: 10, accent: 'en-US' };
  App.state.stats = { days: { [Core.todayKey()]: 12 } }; // đạt mục tiêu ngày
  App.state.game = { xp: 120, days: { [Core.todayKey()]: { xp: 50 } } };

  App.routes.review();
  await tick(50);

  // Thẻ 1: lật và bấm Quên (grade 0)
  const flip1 = App.view.querySelector('#flipBtn');
  ok(flip1, 'Thẻ 1: có nút lật');
  if (flip1) flip1.click();
  await tick(50);
  const btnAgain1 = App.view.querySelector('[data-grade="0"]');
  ok(btnAgain1, 'Thẻ 1: có nút Quên (grade 0)');
  if (btnAgain1) btnAgain1.click();
  await tick(250);

  // Thẻ 2: lật và bấm Quên (grade 0)
  const flip2 = App.view.querySelector('#flipBtn');
  ok(flip2, 'Thẻ 2: có nút lật');
  if (flip2) flip2.click();
  await tick(50);
  const btnAgain2 = App.view.querySelector('[data-grade="0"]');
  ok(btnAgain2, 'Thẻ 2: có nút Quên (grade 0)');
  if (btnAgain2) btnAgain2.click();
  await tick(250);

  // Thẻ bị quên quay lại: lần này bấm Nhớ (grade 2) để hoàn thành phiên
  let guard = 0;
  while (App.view.querySelector('#flipBtn') && guard++ < 10) {
    App.view.querySelector('#flipBtn').click();
    await tick(30);
    const goodBtn = App.view.querySelector('[data-grade="2"]');
    if (goodBtn) goodBtn.click();
    await tick(100);
  }

  const view = App.view;
  ok(view.querySelector('.rev-stats'), 'Màn kết thúc: hiển thị .rev-stats');
  ok(view.querySelectorAll('.rev-pill').length >= 4, 'Màn kết thúc: có đủ các thẻ pill thống kê');
  ok(view.querySelector('.rev-goal'), 'Màn kết thúc: hiển thị dòng đạt mục tiêu ngày');
  ok(view.querySelector('.gmix'), 'Màn kết thúc: giữ phân bố Quên/Khó/Nhớ/Dễ');
  ok(!view.innerHTML.includes('<script'), 'Màn kết thúc: không chèn mã');

  const hardestBox = view.querySelector('.rev-hardest');
  ok(hardestBox, 'Màn kết thúc: có hộp .rev-hardest cho từ khó nhất');
  ok(hardestBox && hardestBox.textContent.includes('ephemeral'), 'Màn kết thúc: từ khó nhất đúng là ephemeral (lapses cao nhất)');
  ok(hardestBox && hardestBox.textContent.includes('ubiquitous'), 'Màn kết thúc: từ vừa quên khác chứa ubiquitous');

  const sayBtn = view.querySelector('[data-say-hard]');
  ok(sayBtn, 'Màn kết thúc: có nút nghe phát âm từ khó nhất');
  if (sayBtn) sayBtn.click();
  ok(spokenWord === 'ephemeral', `Nút phát âm gọi UI.speak đúng từ khó nhất (thực tế: ${spokenWord})`);

  ok(view.querySelector('a[href="#/home"]'), 'Màn kết thúc: có nút Về trang chủ');
  ok(view.querySelectorAll('.btn.primary').length === 1, 'Màn kết thúc: đúng 1 nút chính');
}

// 3. Test reviewDone(false): Phiên ôn hoàn hảo không có từ quên
{
  const now = Date.now();
  App.state.cards = {
    resilient: { word: 'resilient', ipa: 'rɪˈzɪl.jənt', vi: 'kiên cường', srs: { lapses: 0, due: now - 1000, last: now - 864e5, reps: 3 }, contexts: [], col: [], syn: [] },
  };
  App.state.settings = { dailyGoal: 10, accent: 'en-US' };
  App.state.stats = { days: {} };
  App.state.game = { xp: 0, days: {} };

  App.routes.review();
  await tick(50);

  const flip = App.view.querySelector('#flipBtn');
  if (flip) flip.click();
  await tick(50);
  const btnEasy = App.view.querySelector('[data-grade="3"]');
  if (btnEasy) btnEasy.click();
  await tick(100);

  const view = App.view;
  ok(!view.querySelector('.rev-hardest'), 'Phiên hoàn hảo: không có hộp từ khó nhất');
  ok(view.innerHTML.includes('Phiên ôn xuất sắc!') || view.innerHTML.includes('Bạn không quên từ nào'), 'Phiên hoàn hảo: có lời khen xuất sắc');
}

// 4. Test hiển thị nút Ôn trước khi có thẻ đến hạn trong 2 ngày tới
{
  const now = Date.now();
  App.state.cards = {
    future1: { word: 'future1', vi: 'tương lai', srs: { lapses: 0, due: Core.endOfToday() + Core.DAY, last: now, reps: 2 } },
  };
  App.state.settings = { dailyGoal: 10, accent: 'en-US' };
  App.state.stats = { days: {} };
  App.state.game = { xp: 0, days: {} };

  App.routes.review();
  await tick(50);

  const view = App.view;
  const aheadBtn = view.querySelector('a[href="#/review?ahead=2"]');
  ok(aheadBtn, 'Có thẻ trong 2 ngày tới: hiển thị link Ôn trước trỏ tới #/review?ahead=2');
}

// Kiểm tra CSS
const cssText = fs.readFileSync(path.join(WEB, 'css/style.css'), 'utf8');
ok(cssText.includes('.rev-stats'), 'CSS chứa .rev-stats');
ok(cssText.includes('.rev-pill'), 'CSS chứa .rev-pill');
ok(cssText.includes('.rev-hardest'), 'CSS chứa .rev-hardest');
ok(cssText.includes('.rev-goal'), 'CSS chứa .rev-goal');

if (fails > 0) {
  console.error(`✗ review-done: ${fails}/${total} bài kiểm tra thất bại.`);
  process.exit(1);
} else {
  console.log(`✓ review-done: tất cả ${total} bài kiểm tra đạt.`);
  process.exit(0);
}
