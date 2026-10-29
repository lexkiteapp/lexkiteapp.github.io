import assert from 'node:assert/strict';
import { cleanNick, weekOf } from '../../functions/api/league.js';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

console.log('--- Kiểm tra [L1] League (API & UI) ---');

// 1. Kiểm tra cleanNick
assert.equal(cleanNick('Alex'), 'Alex');
assert.equal(cleanNick('Tuấn Anh'), 'Tuấn Anh');
assert.equal(cleanNick('Star_Gazer-99'), 'Star_Gazer-99');
assert.equal(cleanNick('김철수'), '김철수');
assert.equal(cleanNick('محمد'), 'محمد');
assert.equal(cleanNick('佐藤'), '佐藤');

// Chặn các dạng không hợp lệ
assert.equal(cleanNick('a'), '', 'Quá ngắn phải bị loại');
assert.equal(cleanNick('a'.repeat(21)), '', 'Quá 20 ký tự phải bị loại');
assert.equal(cleanNick('user@example.com'), '', 'Email phải bị chặn');
assert.equal(cleanNick('https://spam.com'), '', 'URL phải bị chặn');
assert.equal(cleanNick('www.lexkite.com'), '', 'Web link phải bị chặn');
assert.equal(cleanNick('   '), '', 'Khoảng trắng rỗng phải bị loại');

console.log('✓ cleanNick: hợp lệ & chống spam, email, link');

// 2. Kiểm tra weekOf
const now = Date.now();
const wk = weekOf(now);
assert.ok(wk.key, 'Có key tuần');
assert.ok(wk.start <= now && wk.end > now, 'Thời gian tuần bao trùm hiện tại');
assert.equal(wk.end - wk.start, 7 * 864e5, 'Độ dài tuần đúng 7 ngày');
const dStart = new Date(wk.start);
assert.equal(dStart.getUTCDay(), 1, 'Bắt đầu tuần vào thứ Hai');
assert.equal(dStart.getUTCHours(), 0, 'Bắt đầu tuần lúc 00:00 UTC');

console.log('✓ weekOf: chu kỳ thứ Hai 00:00 UTC chính xác');

// 3. Kiểm tra UI module (load trong môi trường JSDOM)
const dom = new JSDOM(`<!DOCTYPE html><html><body>
  <div id="view"></div>
  <div id="leagueHomeCard"></div>
  <div id="toast"></div>
</body></html>`, { url: 'https://lexkite.com/#/league' });

const { window } = dom;
global.window = window;
global.document = window.document;
global.localStorage = window.localStorage;
global.t = (k, p) => {
  let s = String(k);
  if (p) for (const [a, b] of Object.entries(p)) s = s.replaceAll('{' + a + '}', b);
  return s;
};

// Mock UI & App & Sync
window.UI = { icon: (n, cls) => `<svg class="i${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`, addIcons: () => {}, glyph: e => e,
  $: s => document.querySelector(s),
  $$: s => document.querySelectorAll(s),
  esc: s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
  toast: () => {},
  modal: () => {},
  closeModal: () => {}
};
const W = p => p; W.signal = {}; W.stale = () => false;
window.App = {
  view: document.getElementById('view'),
  routes: {},
  route: () => {},
  W,
  guard: fn => (...a) => { window.App.W = W; return fn(...a); }
};
window.Sync = {
  user: null,
  league: async () => ({ member: null })
};

// Chạy code league.js
const leagueCode = fs.readFileSync('web/js/league.js', 'utf8');
vm.runInNewContext(leagueCode, {
  window,
  document: window.document,
  localStorage: window.localStorage,
  UI: window.UI,
  App: window.App,
  t: global.t,
  console
});

assert.ok(window.League, 'Window có League object');
assert.equal(window.League.TIERS.length, 6, 'Có đủ 6 hạng: Đồng, Bạc, Vàng, Ngọc bích, Hồng ngọc, Kim cương');
assert.equal(window.League.tier(0).en, 'Bronze');
assert.equal(window.League.tier(5).en, 'Diamond');
assert.equal(window.League.tier(99).en, 'Diamond', 'Kẹp trần hạng');

// Render card khi chưa đăng nhập
const homeCard = document.getElementById('leagueHomeCard');
await window.League.renderHomeCard(homeCard);
assert.ok(homeCard.innerHTML.includes('Giải đấu tuần'), 'Thẻ trang chủ có chữ Giải đấu tuần');
assert.ok(homeCard.innerHTML.includes('#/league'), 'Thẻ trang chủ có link sang #/league');

// Render trang #/league khi chưa đăng nhập
await window.App.routes.league();
const viewHtml = document.getElementById('view').innerHTML;
assert.ok(viewHtml.includes('Giải đấu tuần'), 'Trang league có tiêu đề');
assert.ok(viewHtml.includes('Đăng nhập với Google'), 'Trang league có nút đăng nhập khi là khách');

// Mock đã đăng nhập nhưng chưa tham gia
window.Sync.user = { uid: 'u123', displayName: 'Tuấn' };
window.Sync.league = async () => ({ member: null, week: wk });

await window.App.routes.league();
const joinHtml = document.getElementById('view').innerHTML;
assert.ok(joinHtml.includes('Tham gia giải đấu tuần'), 'Có form tham gia');
assert.ok(joinHtml.includes('leagueJoinNick'), 'Có ô nhập biệt danh');
assert.ok(joinHtml.includes('Bảo vệ quyền riêng tư'), 'Có ghi chú bảo vệ quyền riêng tư');

// Mock đã tham gia
window.Sync.league = async () => ({
  member: { nick: 'Tuấn', tier: 2, xp: 450 },
  week: wk,
  board: [
    { rank: 1, nick: 'Star', xp: 900, me: false, zone: 'up' },
    { rank: 2, nick: 'Tuấn', xp: 450, me: true, zone: 'up' },
    { rank: 3, nick: 'Luna', xp: 200, me: false, zone: 'up' },
    { rank: 4, nick: 'Bob', xp: 100, me: false, zone: '' }
  ],
  rules: { group: 30, up: 7, down: 5, maxTier: 5 }
});

await window.App.routes.league();
const boardHtml = document.getElementById('view').innerHTML;
assert.ok(boardHtml.includes('Hạng Vàng'), 'Hiển thị đúng Hạng Vàng');
assert.ok(boardHtml.includes('is-me'), 'Dòng của mình có class is-me');
assert.ok(boardHtml.includes('450'), 'Hiển thị số XP của người dùng');

// Phiên đã nhớ, Firebase báo trạng thái muộn → không được hiện nhầm “Đăng nhập với Google”
const savedUser = { displayName: 'Quyen Khieu', uid: 'u1' };
window.Sync.user = null;
window.Sync.authed = () => new Promise(r => setTimeout(() => { window.Sync.user = savedUser; r(savedUser); }, 20));
await window.App.routes.league();
const lateHtml = document.getElementById('view').innerHTML;
assert.ok(!lateHtml.includes('leagueSignInBtn'), 'Đã đăng nhập (báo muộn) → không hiện nút đăng nhập');
assert.ok(lateHtml.includes('Hạng Vàng'), 'Đã đăng nhập (báo muộn) → hiện bảng xếp hạng');
window.Sync.user = null; window.Sync.authed = async () => null;
await window.App.routes.league();
assert.ok(document.getElementById('view').innerHTML.includes('leagueSignInBtn'), 'Thật sự chưa đăng nhập → vẫn có nút đăng nhập');
console.log('✓ League: chờ phiên đã nhớ, không hiện nhầm nút đăng nhập');


// ---- Stitch v2 (cờ ux1 bật): CÙNG các hành vi trên khung tự sinh (web/js/st/v2/leagues.js) ----
window.t = global.t; window.I18N = { lang: () => 'vi' }; window.Core = { todayKey: () => '2026-01-01' };
window.App.state = { settings: {}, game: { xp: 450 }, stats: { days: {} } }; window.App.EXAMS = {}; window.App.streak = () => 3; window.App.ux1On = () => true;
window.App.onCleanup = () => {};
for (const f of ['runtime', 'shell', 'leagues']) vm.runInNewContext(fs.readFileSync(`web/js/st/v2/${f}.js`, 'utf8'), { window, self: window, document, console, App: window.App, I18N: window.I18N, Core: window.Core, t: global.t });
assert.ok(window.ST2 && window.ST2.leagues, 'khung Stitch leagues nạp được');
const modals = []; window.UI.modal = h => { modals.push(h); return null; };
const mkBoard = n => Array.from({ length: n }, (_, i) => ({ rank: i + 1, nick: i === 8 ? 'Tuấn Anh' : 'User' + (i + 1), xp: 1000 - i * 50, me: i === 8, zone: i < 7 ? 'up' : i >= n - 5 ? 'down' : '' }));
window.localStorage.removeItem('lk.leagueLastSeen');
window.Sync.user = { uid: 'u123', displayName: 'Tuấn' }; window.Sync.authed = async () => window.Sync.user;
window.Sync.league = async () => ({ member: { nick: 'Tuấn Anh', tier: 2, xp: 550 }, week: wk, board: mkBoard(14), rules: { group: 30, up: 7, down: 5, maxTier: 5 }, last: { week: 'w0', tier: 1, move: 1, rank: 3, of: 30, xp: 900 } });
await window.App.routes.league();
const v = document.getElementById('view');
assert.ok(v.querySelector('.v2-leagues') && v.querySelector('h1').textContent.includes('Hạng Vàng'), 'v2: tiêu đề = hạng hiện tại (Hạng Vàng)');
assert.ok(v.querySelector('.lg2-me[aria-current="true"]') && v.querySelector('.lg2-me').textContent.includes('Tuấn Anh') && v.querySelector('.lg2-me').textContent.includes('600'), 'v2: dòng của mình được tô sáng (lg2-me) với tên + XP');
assert.equal(v.querySelectorAll('.lg2-row').length, 14, 'v2: đủ 14 dòng bảng xếp hạng thật');
assert.ok(v.querySelector('.lg2-up') && v.querySelector('.lg2-down') && /Hạng Ngọc bích/.test(v.querySelector('.lg2-up').textContent), 'v2: dải vùng thăng hạng (lên Hạng Ngọc bích) và vùng xuống hạng');
assert.ok(/còn|Đã kết thúc/.test(v.textContent), 'v2: hiện thời gian còn lại của tuần');
assert.ok(v.querySelector('.lg2-me').textContent.includes('An toàn') && /Còn 101 XP để thăng hạng/.test(v.querySelector('.lg2-me').textContent), 'v2: nhãn vùng + số XP còn thiếu để thăng hạng');
assert.equal(v.querySelector('[data-card="cta"] button').getAttribute('data-href'), '#/review', 'v2: nút học trỏ tới bài kế tiếp thật (#/review khi chưa có kế hoạch)');
assert.ok(v.querySelector('[data-card="last"]') && /thăng hạng/.test(v.querySelector('[data-card="last"]').textContent), 'v2: banner kết quả tuần trước (thăng hạng) còn');
v.querySelector('[data-card="last"] [data-act="last"]').click();
assert.equal(window.localStorage.getItem('lk.leagueLastSeen'), 'w0', 'v2: bấm Đã hiểu → ghi nhớ đã xem tuần trước');
assert.ok(!v.querySelector('[data-card="last"]'), 'v2: banner biến mất sau Đã hiểu');
v.querySelector('[data-card="nick"] [data-act="nick"]').click();
assert.ok(modals.some(h => /dlgNickInput/.test(h)), 'v2: nút Đổi biệt danh mở hộp đổi biệt danh');
v.querySelector('[data-card="rules"] [data-act="rules"]').click();
assert.ok(modals.some(h => /Quy tắc giải đấu tuần/.test(h) && /Top 7/.test(h)), 'v2: quy tắc giải đấu mở được');
assert.ok(v.querySelector('nav[aria-label], [data-tab="league"]') || v.querySelector('nav'), 'v2: có thanh tab (tab Giải đấu)');
// các trạng thái khác vẫn vào được khi cờ bật: khách → nút đăng nhập; chưa tham gia → form biệt danh
window.Sync.league = async () => ({ member: null, week: wk });
await window.App.routes.league();
assert.ok(document.getElementById('view').innerHTML.includes('leagueJoinNick'), 'v2 bật: chưa tham gia vẫn có form gia nhập');
window.Sync.user = null; window.Sync.authed = async () => null;
await window.App.routes.league();
assert.ok(document.getElementById('view').innerHTML.includes('leagueSignInBtn'), 'v2 bật: khách vẫn có nút đăng nhập');
window.Sync.league = async () => { throw new Error('x'); }; window.Sync.user = { uid: 'u' };
await window.App.routes.league();
assert.ok(document.getElementById('view').innerHTML.includes('Thử lại'), 'v2 bật: lỗi mạng vẫn có nút Thử lại');
console.log('✓ League (Stitch v2): hạng, dòng của mình, vùng thăng/xuống hạng, thời gian còn lại, CTA, banner tuần trước, đổi biệt danh, quy tắc, các trạng thái khác');

console.log('✓ UI League: renderHomeCard & routes.league qua mọi trạng thái (khách, chưa tham gia, đã tham gia)');
console.log('✓ league test PASS 100%');
