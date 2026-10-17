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
window.UI = {
  $: s => document.querySelector(s),
  $$: s => document.querySelectorAll(s),
  esc: s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
  toast: () => {},
  modal: () => {},
  closeModal: () => {}
};
window.App = {
  view: document.getElementById('view'),
  routes: {},
  route: () => {}
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

console.log('✓ UI League: renderHomeCard & routes.league qua mọi trạng thái (khách, chưa tham gia, đã tham gia)');
console.log('✓ league test PASS 100%');
