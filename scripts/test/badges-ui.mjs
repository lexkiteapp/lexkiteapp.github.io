// 🏅 Báo cáo tuần + huy hiệu (Stitch v2, web/js/ux1-badges.js) – jsdom chạy khung TỰ SINH thật với dữ liệu mẫu:
//   #/week: 7 cột Thứ 2→CN (hôm nay đánh dấu), số liệu tuần thật so với tuần trước, KHÔNG còn số bịa của mẫu (Top 4%, 92% accuracy…),
//   mạnh nhất/cần luyện = bài thi thử gần nhất, ẩn khi chưa có · #/badges: đủ 19 ô Game.BADGES, tên thật, đã nhận = huy chương màu, chưa = đĩa khóa + tiến độ ·
//   chạm ô → bảng chi tiết (ngày nhận / tiến độ, Chia sẻ chỉ khi đã nhận, Esc đóng) · màn "Huy hiệu mới!": hàng đợi lần lượt, giảm chuyển động → không tung hoa giấy.
// Chạy: node scripts/test/badges-ui.mjs   (fixture, không mạng)
import assert from 'node:assert/strict'; import fs from 'node:fs'; import { JSDOM } from 'jsdom';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('✓ ' + m); };
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="view"></div></body></html>', { url: 'https://lexkite.com/app/#/week', runScripts: 'outside-only', pretendToBeVisual: true });
const W = dom.window, D = W.document; let reduce = false;
W.matchMedia = q => ({ matches: /reduce/.test(q) ? reduce : false, addEventListener() {} });
W.t = (k, p) => (p ? String(k).replace(/\{(\w+)\}/g, (m, x) => (p[x] != null ? p[x] : m)) : String(k));
W.I18N = { lang: () => 'en' };
const day = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const store = {}; W.Core = { todayKey: (d = new Date()) => day(d), Store: { get: async (k, def) => (k in store ? store[k] : def), set: async (k, v) => { store[k] = v; } } };
const now = new Date(), dow = (now.getDay() + 6) % 7, kd = i => { const x = new Date(now); x.setDate(now.getDate() - i); return day(x); };
const days = {}; for (let i = 0; i <= dow; i++) days[kd(i)] = { xp: i === 1 ? 0 : 100 + i * 10, newWords: 5, reviews: 10, quizzes: 1 }; for (let i = 1; i <= 7; i++) days[kd(dow + i)] = { xp: 50, newWords: 2, reviews: 5, quizzes: 0 };
const cleanups = [];
W.App = { state: { settings: { exam: 'ielts' }, cards: Object.fromEntries(Array.from({ length: 62 }, (_, i) => ['w' + i, {}])), game: { xp: 900, days, total: { reviews: 120, perfect: 2, spoken: 10, readings: 1 }, best: {}, badges: { first: Date.UTC(2026, 9, 12), words50: Date.now() } } },
  routes: {}, view: D.getElementById('view'), EXAMS: { ielts: { short: 'IELTS' } }, streak: () => 6, masteredCount: () => 4,
  guard: fn => fn, W: p => p, onCleanup: f => cleanups.push(f) };
for (const f of ['characters.js', 'game.js', 'st/v2/runtime.js', 'st/v2/shell.js', 'st/v2/week-report.js', 'st/v2/badges.js', 'st/v2/badge-detail.js', 'st/v2/badge-unlocked.js', 'badge-art.js', 'ux1-badges.js']) W.eval(fs.readFileSync('web/js/' + f, 'utf8'));
const { App, BadgeUI, Game } = W, view = App.view, txt = () => view.textContent;
const FAKE = ['Top 4%', '92% accuracy', 'Band 8.0 Level', 'Band 6.0 Level', '1,420', 'Collector Tier 2', 'Veteran V', 'IELTS Crown', 'Teacher slot', 'Teacher Slot', '2D teacher', 'Standby', '+30 XP', 'Band 7.5', 'LEVEL 3 UNLOCKED', 'Review machine', 'Listening Part 3', 'Writing Task 2: Lexical'];
const noFake = (s, where) => ok(!FAKE.some(f => s.includes(f)), `${where}: không còn chữ/số bịa của mẫu (${FAKE.filter(f => s.includes(f)).join(', ') || 'sạch'})`);

// ---- Báo cáo tuần ----
await App.routes.week();
ok(view.querySelectorAll('#wkChart [role=listitem]').length === 7, 'báo cáo tuần: 7 cột ngày');
ok(view.querySelectorAll('#wkChart [aria-current=date]').length === 1, 'đúng 1 cột "hôm nay"');
const curXp = Object.entries(days).filter(([k]) => k >= kd(dow)).reduce((a, [, x]) => a + x.xp, 0);
ok(txt().includes(curXp.toLocaleString('en')), `tổng XP tuần thật (${curXp})`);
ok(txt().includes('vs last week') || txt().includes('so với tuần trước'), 'chip so với tuần trước (có tuần trước)');
ok(!view.querySelector('#wkSkills'), 'chưa có bài thi thử → ẩn mạnh nhất / cần luyện');
ok(/teach\/carlos\/still-encourage/.test(view.innerHTML), 'giáo viên = Chars (Carlos khích lệ)');
ok(view.querySelector('#wkShare[data-share]') && view.querySelector('#wkBack[data-href="#/stats"]'), 'nút Chia sẻ (share-card.js) + quay lại #/stats');
noFake(txt(), 'báo cáo tuần');
store.mocks = [{ overall: 7, bands: { listening: 7.5, reading: 7, writing: 6, speaking: 6.5 } }];
await App.routes.week();
const sk = view.querySelector('#wkSkills');
ok(sk && sk.textContent.includes('Nghe hiểu') && sk.textContent.includes('Viết') && sk.textContent.includes('Band 7.5') && sk.textContent.includes('Band 6'), 'có bài thi thử → mạnh nhất Nghe 7.5, cần luyện Viết 6');
ok(sk.querySelector('[data-href="#/skill/writing"]'), 'nút Luyện tập → #/skill/writing');
ok(!sk.textContent.includes('accuracy'), 'không có % chính xác bịa');

// ---- Tất cả huy hiệu ----
App.routes.badges();
const tiles = [...view.querySelectorAll('#bdGrid [data-badge]')];
ok(tiles.length === 19 && tiles.map(b => b.dataset.badge).join() === Game.BADGES.map(b => b.id).join(), 'đủ 19 ô theo đúng Game.BADGES');
ok(tiles.every((b, i) => b.textContent.includes(Game.BADGES[i].name)), 'tên huy hiệu thật (t())');
ok(view.textContent.includes('2 / 19'), 'đếm 2 / 19 đã nhận');
ok(!tiles[0].querySelector('.grayscale') && tiles[2].querySelector('.grayscale'), 'đã nhận = huy chương màu · chưa nhận = mờ trong đĩa khóa');
ok(!/[\u{1F300}-\u{1FAFF}]/u.test(view.querySelector('#bdGrid').textContent), 'ô huy hiệu không dùng emoji');
const ids = [...view.querySelectorAll('#bdGrid [id]')].map(e => e.id); ok(new Set(ids).size === ids.length, 'id gradient của huy chương không trùng');
ok(view.querySelector('#bdNext') && /Sổ tay|Thư viện|Khởi|Trí nhớ|Lửa|Một tuần|Cỗ máy|Hoàn hảo|Phát âm|Mọt|Cú|Chim|Thợ|Cấp/.test(view.querySelector('#bdNext').textContent), 'thẻ "kế tiếp" = huy hiệu thật gần mở nhất');
ok(/teach\/ama\//.test(view.innerHTML), 'giáo viên Ama (Chars)');
noFake(view.textContent, 'tất cả huy hiệu');

// ---- Bảng chi tiết ----
tiles[0].click();
let sh = D.querySelector('#bdSheet'); ok(sh && sh.textContent.includes(Game.BADGES[0].name) && /Nhận ngày/.test(sh.textContent), 'chạm ô đã nhận → bảng chi tiết có ngày nhận');
ok(!D.querySelector('#bdShare').className.includes('hidden'), 'đã nhận → có nút Chia sẻ');
D.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Escape' })); ok(!D.querySelector('#bdSheet'), 'Esc đóng bảng');
view.querySelector('[data-badge="words200"]').click(); sh = D.querySelector('#bdSheet');
ok(sh && /Tiến độ 62\/200/.test(sh.textContent) && D.querySelector('#bdShare').className.includes('hidden'), 'chưa nhận → tiến độ thật 62/200, ẩn Chia sẻ');
D.querySelector('#bdClose').click(); ok(!D.querySelector('#bdSheet'), 'nút Đóng đóng bảng');

// ---- Màn "Huy hiệu mới!" ----
BadgeUI.unlocked(Game.BADGES[9]); BadgeUI.unlocked(Game.BADGES[1]);
let L = D.querySelector('.v2s-badge-unlocked'); ok(L && L.textContent.includes(Game.BADGES[9].name), 'hiện huy hiệu đầu tiên trong hàng đợi');
ok(L.querySelector('[role=dialog][aria-modal=true]') && L.querySelector('.st-burst'), 'hộp thoại + tung hoa giấy nhẹ');
ok(/still-cheer/.test(L.innerHTML), 'giáo viên reo mừng (Chars cheer)');
noFake(L.textContent, 'màn chúc mừng');
L.querySelector('[data-bu-next]').click(); L = D.querySelector('.v2s-badge-unlocked');
ok(L && L.textContent.includes(Game.BADGES[1].name), 'Tiếp tục → huy hiệu kế trong hàng đợi');
cleanups.forEach(f => f()); ok(D.querySelector('.v2s-badge-unlocked'), 'đổi trang không đóng màn chúc mừng');
L.querySelector('[data-bu-next]').click(); ok(!D.querySelector('.v2s-badge-unlocked'), 'hết hàng đợi → đóng');
reduce = true; BadgeUI.unlocked(Game.BADGES[2]); L = D.querySelector('.v2s-badge-unlocked');
ok(L && !L.querySelector('.st-burst') && !L.querySelector('.st-pop'), 'giảm chuyển động → không hoa giấy, không nảy');
L.querySelector('[data-bu-next]').click(); reduce = false;
D.body.classList.add('focus'); BadgeUI.unlocked(Game.BADGES[3]); ok(!D.querySelector('.v2s-badge-unlocked'), 'đang ôn/học (body.focus) → chưa chen ngang');
D.body.classList.remove('focus'); W.dispatchEvent(new W.HashChangeEvent('hashchange')); await new Promise(r => setTimeout(r, 700));
ok(D.querySelector('.v2s-badge-unlocked') && D.querySelector('.v2s-badge-unlocked').textContent.includes(Game.BADGES[3].name), 'rời phiên → hiện màn chúc mừng');
ok(D.querySelector('.v2s-badge-unlocked > [role=dialog][aria-modal=true]'), 'lớp phủ là hộp thoại aria-modal');
console.log(`\n${n}/${n} badges-ui`);
