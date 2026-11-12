// Test (jsdom, nhẹ, chạy trong npm test) cho bảng trạng thái docs/specs/welcome.md: ai thấy gì ở #/welcome, /setup, /login · từng bước có hash riêng · lk.onbPick ·
// điểm mục tiêu không dấu + · nhãn cường độ khớp ô đang lưu · đăng nhập giữa thiết lập · kết quả bài đầu vào ghi sẵn · canh khởi động. Trình duyệt thật (Back hệ thống, tải lại, indexedDB treo): welcome-journey.mjs trên CI.
// Chạy: node scripts/test/welcome-flow.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import jsdom from 'jsdom';
import { firstLoadFiles } from '../lib/gz-canon.mjs';
const require = createRequire(import.meta.url);
const { JSDOM } = jsdom, WEB = 'web';
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const rd = f => fs.readFileSync(f, 'utf8');

// ---- 1. tĩnh: tách khung, canh khởi động, lưu không dấu + ----
const app = rd('web/js/app.js'), onb = rd('web/js/onboard.js'), wl = rd('web/js/welcome.js') + rd('web/js/st/v2/welcome.js') + rd('web/js/st/v2/welcome-desk.js'), pl = rd('web/js/placement.js'), frames = ['goal', 'level', 'target', 'pace', 'ready'].map(k => rd(`web/js/st/v2/onb-${k}.js`));
ok(!firstLoadFiles().includes('/js/welcome.js') && /welcome: \[[^\]]*'js\/welcome\.js'\]/.test(app) && /ROUTE_BUNDLE = \{[^}]*\bwelcome: 'welcome',/.test(app), 'welcome.js là gói lười, route nạp đúng gói');
ok(!/id="wCard"|id="wFeats"|data-wg=/.test(app) && /wCard/.test(wl) && /wFeats/.test(wl) && /#loginH/.test(wl) && /data-wjump/.test(wl), 'markup trang giới thiệu chỉ còn ở welcome.js');
ok(/!document\.getElementById\('lkHero'\)\) skel = setTimeout/.test(app), 'khung chờ không thay khung chào #lkHero');
ok(/const bootDog = setTimeout\([\s\S]{0,200}errState\(true, true\); \}, 8000\)/.test(app) && /clearTimeout\(bootDog\)/.test(app) && /reload === true \? location\.reload\(\)/.test(app), 'canh khởi động 8 s: thẻ lỗi, Thử lại = tải lại, boot chạy thì hủy');
ok(/App\.blogLive && !\(window\.Capacitor && Capacitor\.isNativePlatform && Capacitor\.isNativePlatform\(\)\)\) App\.blogLive\(\)/.test(wl), 'app iOS/Android: Welcome lần mở đầu KHÔNG hiện lối vào blog (chặn hồi quy "mở app ra trang chủ blog", chủ 5/11)');
ok(!/blog/.test(rd('web/js/onboard.js')) && !/\/blog\//.test(rd('scripts/gen-hero.mjs')), 'thiết lập + khung chào dựng sẵn không có link blog');
{ // khung chào dựng sẵn (gen-hero): mọi ngôn ngữ ≠ vi phải có chữ KHÁC bản Việt ở cả mục (không rơi về khóa tiếng Việt). Từng hỏng khi khóa kicker chuyển sang en/lazyui.js (4a141cbf) → hero non-vi tiếng Việt + app gọi dịch máy /api/dictlookup, e2e đỏ (503 mock CI)
  const hm = /var T=(\{.*?\}),S=/.exec(rd('web/app/index.html').split('<!--hero-->')[1] || ''); const HT = hm ? JSON.parse(hm[1]) : {};
  ok(Object.keys(HT).length === 15, 'hero dựng sẵn đủ 15 ngôn ngữ');
  for (const l of Object.keys(HT).filter(x => x !== 'vi')) ok(HT[l].every((x, i) => x !== HT.vi[i]), `hero ${l}: không còn chữ tiếng Việt chưa dịch (gen-hero gộp lõi + nhóm lazy)`);
}
ok(/const fresh = !hasData\(\);/.test(app) && /App\.replaceHash\('#\/welcome'\)/.test(app), 'boot dùng chung phép "có dữ liệu", chuyển bằng replace');
ok(/location\.replace\(location\.pathname \+ location\.search \+ h\)/.test(app), 'replace giữ /app/ (app có <base href="/">)');
ok(/const bare = v => String\(v \|\| ''\)\.replace\(\/\\\+\$\/, ''\)/.test(onb) && /examTarget: tg/.test(onb) && /targetBand = tg/.test(onb) && /IELTS 0–9, TOEIC 10–990, TOEFL 1–6, General A1–C2/.test(onb), 'examTarget/targetBand lưu không dấu +, có ghi chú thang');
ok(!/mình là Kit|Kit\.svg/.test(onb) && frames.every(f => /aria-live="\$\{e\('polite'\)\}"/.test(f) && /onbSay/.test(f) && /onbBack/.test(f)), 'onboard: Ama thay Kit; mọi bước có aria-live #onbSay + #onbBack');
ok(/state\.settings\.onboarded \? `<a class="btn primary lg block" href="#\/home">[\s\S]{0,120}href="#\/welcome\/setup"/.test(pl), 'kết quả bài đầu vào: chưa thiết lập → nút cuối đi #/welcome/setup');
ok(/href="\$\{App\.homeHref\(\)\}" id="plX"/.test(pl) && /plXpDue = 1/.test(pl) && /plXpDue/.test(app), 'thoát bài đầu vào về Welcome cho người mới; XP hoãn tới khi xong thiết lập');

// ---- 2. chạy app trong jsdom ----
const html = rd(path.join(WEB, 'app', 'index.html')), scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const vc = new jsdom.VirtualConsole(); vc.on('jsdomError', e => { if (!/Not implemented|Could not parse CSS/.test(e.message)) console.error(e.message); });
const dom = new JSDOM(html.replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, '').replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, ''), { url: 'http://localhost/app/?sandbox=1&hl=vi#/home', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window, errors = [];
w.addEventListener('error', e => errors.push(e.message));
w.console.error = (...a) => errors.push(a.join(' '));
w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
w.CSS = { escape: s => s };
w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => '' });
w.Audio = function () { return { play: async () => {}, pause() {}, addEventListener() {} }; };
for (const f of scripts) { try { w.eval(rd(path.join(WEB, f))); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
const tick = (ms = 120) => new Promise(r => setTimeout(r, ms));
const $ = s => w.document.querySelector(s), click = el => el && el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const go = async (h, ms = 350) => { w.location.hash = h; await tick(ms); };
const hash = () => w.location.hash;
const until = async (f, ms = 3000) => { for (let t = 0; t < ms && !f(); t += 50) await tick(50); return !!f(); };
const pickOf = () => JSON.parse(w.sessionStorage.getItem('lk.onbPick') || 'null');
await tick(400);
const S = w.App.state;
const asNew = () => { S.settings.onboarded = false; S.cards = {}; S.game.xp = 0; S.user = null; delete S.settings.placement; w.sessionStorage.removeItem('lk.onbPick'); };

ok(await until(() => $('#wCard')), 'người mới mở #/home → Welcome');
ok(hash() === '#/welcome' && w.location.pathname === '/app/' && w.location.search.includes('sandbox=1'), 'chuyển về #/welcome, vẫn ở /app/?sandbox=1: ' + w.location.href);
ok(w.document.body.classList.contains('bare'), 'Welcome: giao diện trần');
for (const id of ['#wFront', '#wBack', '#wDone', '#wSay', '#wKit', '#loginW', '#loginH', '#wFeats', '[data-wg]', 'a[href="#/placement"]', 'a[href="#/style"]', 'footer.w-foot']) ok($(id), 'Welcome giữ ' + id);
ok(!$('.v2s-welcome [data-wjump]') && $('.v2s-welcome select[data-lang-select]') && $('#loginH'), 'điện thoại: khung welcome, chọn ngôn ngữ + Đăng nhập là nút thật');
click($('#wCard')); ok(!$('#wBack').hidden && $('#wFront').hidden, 'thẻ thử nhanh: chạm lật');
// qua mốc 1024 px: đổi khung, thẻ giữ nguyên mặt đang lật
{ const L = []; w.matchMedia = () => ({ get matches() { return desk; }, addEventListener: (_, f) => L.push(f), removeEventListener() {} }); var desk = false; await go('#/tests', 150); await go('#/welcome', 400); await until(() => $('#wCard')); click($('#wCard'));
  desk = true; const m = L[L.length - 1]; m(); await until(() => $('.v2s-welcome-desk'), 2500);
  ok($('.v2s-welcome-desk') && !$('#wBack').hidden && $('#wFront').hidden, 'qua 1024 px: sang khung máy tính, giữ trạng thái thẻ');
  for (const id of ['.w-nav', '[data-wjump]', '.w-nav a[href="#/tests"]', '.w-nav a[href="#/settings"]', '.w-nav a[data-blog][hidden]', 'select[data-lang-select]', '#loginH', '#wFeats']) ok($(id), 'máy tính giữ ' + id);
  ok(!/Bright Day|Lexkite Kit/.test($('#view').textContent), 'máy tính: bỏ dòng thừa của mẫu');
  desk = false; m(); await until(() => $('.v2s-welcome'), 2500); ok($('.v2s-welcome') && !$('#wBack').hidden, 'về điện thoại: giữ trạng thái thẻ'); }
ok(/80 |2\.000/.test($('#wFeats').textContent) && !/77 |1\.700/.test($('#wFeats').textContent), 'số bài/câu ngữ pháp đúng dữ liệu');
{ const K = w.Chars; ok(K && $('#wKit img[src*="teach/ama/still-"]') && !$('#wKit').className.match(/bg-|border/), 'ô giáo viên: ảnh Chars, trong suốt'); }
click($('[data-wg=good]')); ok($('#wBack').hidden && !$('#wDone').hidden && $('#wDone a[href="#/welcome/setup"]'), 'chấm → #wDone mời thiết lập');

// ---- từng bước ----
await go('#/welcome/setup', 900);
ok(await until(() => $('#obNext')), 'vào thiết lập');
ok(hash() === '#/welcome/setup?s=goal', 'bước đầu có hash riêng: ' + hash());
ok($('#onbBack') && $('[role=progressbar][aria-valuenow="1"]') && $('#onbSay') && /Ama/.test($('#onbSay').textContent), 'bước 1: nút lùi, tiến độ, lời của Ama');
click($('[data-track=toeic]')); await until(() => pickOf() && pickOf().track === 'toeic');
ok(pickOf().track === 'toeic' && pickOf().exam === 'toeic', 'lưu lựa chọn vào lk.onbPick');
click($('#obNext')); await tick();
ok(hash() === '#/welcome/setup?s=level' && $('[role=progressbar][aria-valuenow="2"]') && pickOf().step === 1, 'Tiếp tục → ?s=level');
click($('#onbBack')); await until(() => /s=goal/.test(hash())); await tick();
ok(hash() === '#/welcome/setup?s=goal' && $('[data-track=toeic]:is([aria-pressed=true],[aria-checked=true])'), 'Quay lại 1 bước, giữ lựa chọn');
click($('#obNext')); await tick();
w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await until(() => /s=goal/.test(hash())); await tick();
ok(/s=goal/.test(hash()) && $('[role=progressbar][aria-valuenow="1"]'), 'Esc lùi 1 bước');
await go('#/welcome/setup?s=target'); ok($('#bandT') && $('[role=progressbar][aria-valuenow="3"]'), 'vào thẳng ?s=target: đúng bước, không khung chờ');
click($('#bandT [data-v="900+"]')); await tick();
ok($('#bandT [data-v="900+"][aria-pressed=true]') && pickOf().target === '900+', 'nhãn 900+ để hiển thị');
await go('#/welcome/setup?s=pace'); click($('[data-pace="40"]')); await tick();
ok(/15 phút/.test($('[data-pace="40"]').textContent) && /20 từ mới/.test($('[data-pace="40"]').textContent), 'nhãn Tăng tốc khớp 15 phút (Tutor PACE) · 20 từ mới (dailyNew)');
ok(/10 phút/.test($('[data-pace="20"]').textContent) && /5 phút/.test($('[data-pace="10"]').textContent), 'nhãn các mức còn lại khớp 5 / 10 phút');
click($('#obNext')); await tick();
ok($('#go'), 'tới màn cuối');
ok(/5/.test($('#go').textContent), 'chưa chọn trình độ: nút cuối mời bài đầu vào 5 phút');
click($('#go')); await until(() => S.settings.onboarded && $('#plSkip'), 15000); await tick(400);
ok(S.settings.onboarded && /^#\/placement/.test(hash()) && $('#plSkip') && $('.pl-inv .tslot') && $('.pl-say') && $('#go'), 'chưa chọn trình độ → lời mời bài đầu vào: Ama (Chars.slot), Bắt đầu + Bỏ qua: ' + hash());
const nSeed = Object.keys(S.cards).length; ok(nSeed > 0, 'bộ thẻ ban đầu đã có trước lời mời');
click($('#plSkip')); await until(() => hash() === '#/home'); await tick(300);
ok(hash() === '#/home' && !w.sessionStorage.getItem('lk.plInv') && !S.settings.placement, 'Bỏ qua → Hôm nay, trình độ mặc định: ' + hash());
{ const at = hash(); w.history.back(); await tick(500); ok(!/welcome\/setup/.test(hash()), 'Back sau thiết lập: không đi qua các bước: ' + hash()); await go(at, 200); }
ok(S.settings.examTarget === '900' && S.settings.exam === 'toeic', 'lưu examTarget không dấu +: ' + S.settings.examTarget);
ok(S.settings.dailyGoal === 40 && S.settings.dailyNew === 20 && S.settings.pace === 40, 'lưu cường độ đúng ô Hôm nay + Tutor đọc');
ok(w.sessionStorage.getItem('lk.onbPick') === null, 'xong thiết lập: xóa lk.onbPick');

// ---- người đã có dữ liệu ----
await go('#/welcome'); ok(hash() === '#/home', 'có dữ liệu: #/welcome → #/home');
await go('#/welcome/setup'); ok(hash() === '#/home', 'có dữ liệu: /setup → #/home');
await go('#/setup'); await tick(); ok(hash() === '#/home', 'có dữ liệu: bí danh #/setup → #/home');
await go('#/start'); await tick(); ok(hash() === '#/home', 'có dữ liệu: bí danh #/start → #/home');
await go('#/welcome/login', 600); ok(hash() === '#/welcome/login' && await until(() => $('#wCard')) && $('.hl#loginH, .hl#loginW'), 'có tiến độ, chưa đăng nhập: /login → Welcome, nút Đăng nhập nổi');
S.user = { uid: 'u' }; await go('#/home'); await go('#/welcome/login'); ok(hash() === '#/me', 'đã đăng nhập, có dữ liệu: /login → #/me');
S.user = null;

// ---- người mới: /login + deep link ----
asNew(); await go('#/welcome/login', 500); ok(hash() === '#/welcome/login' && $('.hl#loginH, .hl#loginW'), 'người mới: /login → Welcome, nút Đăng nhập nổi');
await go('#/tests', 500); ok(hash() === '#/tests', 'người mới: deep link giữ nguyên');

// ---- đăng nhập giữa thiết lập ----
const stubSync = (user, merge) => Object.assign(w.Sync, { signIn: async () => { S.user = user; }, merged: () => Promise.resolve().then(merge), can: true, gBtn: w.Sync.gBtn || (() => '') });
asNew(); await go('#/welcome/setup', 700); await until(() => $('#setupIn')); ok($('#setupIn'), 'chưa đăng nhập: có liên kết Đăng nhập ở bước 1');
stubSync({ uid: 'empty' }, () => {}); await w.App.loginOnboard(() => { w.__empty = 1; });
ok(w.__empty === 1 && !S.settings.onboarded, 'tài khoản trống: gọi nhánh trống, KHÔNG đánh dấu đã thiết lập');
click($('#setupIn')); await tick(300);
ok(/welcome\/setup/.test(hash()) && !S.settings.onboarded && !$('#setupIn') && $('#obNext'), 'tài khoản trống: ở lại đúng bước, liên kết đăng nhập biến mất');
asNew(); await go('#/welcome/setup', 500); stubSync({ uid: 'full' }, () => { S.cards = { a: { word: 'a', srs: { reps: 0, last: 0, due: 0 } } }; }); await w.App.loginOnboard(() => { w.__empty = 2; }); await tick(300);
ok(w.__empty !== 2 && S.settings.onboarded && hash() === '#/home', 'tài khoản có dữ liệu: gộp xong → #/home: ' + hash());

// ---- lời mời bài đầu vào: làm xong → Hôm nay, chặng + bộ từ theo kết quả; đã chọn trình độ → Ngày 1 ----
const toGo = async () => { await go('#/welcome/setup', 900); await until(() => $('#obNext')); for (let i = 0; i < 8 && !$('#go'); i++) { click($('#obNext')); await tick(150); } };
asNew(); await toGo(); click($('#go')); await until(() => $('#plSkip'), 15000);
ok($('#plSkip') && /placement/.test(hash()), 'người mới thứ hai: tới lời mời');
const n0 = Object.keys(S.cards).length; click($('#go')); await tick(400);
for (let i = 0; i < 40 && !$('.pl-result h2'); i++) { const o = [...w.document.querySelectorAll('.pl-wrap .option[data-k]')].filter(b => b.dataset.k !== '-1'); if (o.length) click(o[i % o.length]); await tick(320); }
const PL = S.settings.placement;
ok($('.pl-result h2') && PL && /^s[0-3]$/.test(PL.stage) && $('.pl-result a[href="#/home"]'), 'làm xong → kết quả, nút về Hôm nay');
{ const T = w.Tracks, cur = S.settings.tracks && S.settings.tracks.cur; ok(T && cur && T.start(T.TR[cur]) && !(S.settings.tracks.lv || {})[cur], 'chặng lấy từ kết quả (không ghi đè trình độ tay): ' + (T && cur && T.start(T.TR[cur]))); }
const lvW = Object.values(S.cards).length - n0; ok(lvW >= 0 && lvW <= 10 && (!lvW || /\b(A1|A2|B1|B2|C1|C2)\b/.test($('.pl-result').textContent)), 'thêm ≤10 từ đúng trình độ vào bộ thẻ: ' + lvW);
ok(!w.sessionStorage.getItem('lk.plInv'), 'xong: xóa lời mời');
await go($('.pl-result a[href="#/home"]').getAttribute('href'), 500); ok(hash() === '#/home', 'làm xong → Hôm nay: ' + hash()); // jsdom bỏ khối <base> chặn link "#/…" → đi theo href (trình duyệt thật: welcome-journey)
asNew(); await go('#/welcome/setup?s=level', 900); await until(() => $('[data-lv]')); click($('[data-lv]:not([data-lv="test"])')); await tick(); for (let i = 0; i < 8 && !$('#go'); i++) { click($('#obNext')); await tick(150); }
click($('#go')); await until(() => S.settings.onboarded && /^#\/day/.test(hash()), 15000); await tick(300);
ok(/^#\/day/.test(hash()) && !w.sessionStorage.getItem('lk.plInv'), 'đã chọn trình độ tay → vào thẳng Ngày 1, không mời: ' + hash());
S.settings.onboarded = true;

// ---- bài đầu vào làm trước: ghi sẵn, đổi được ----
asNew(); S.settings.exam = 'toeic'; S.settings.examTarget = '900'; await go('#/welcome/setup?s=target', 900); await until(() => $('#bandT'));
ok($('#bandT [data-v="900+"][aria-pressed=true]'), 'exam/examTarget hợp thang → chọn sẵn (nhãn 900+ ứng với 900 đã lưu)');
asNew(); S.settings.exam = 'ielts'; S.settings.placement = { v: 2, band: 6, stage: 's2', vCefr: 'B1', gCefr: 'B1', at: Date.now() };
await go('#/tests', 300); // rời màn thiết lập như người làm bài đầu vào rồi quay lại
await go('#/welcome/setup?s=level', 900); await until(() => $('[data-lv]'));
ok($('[data-lv=s2][aria-checked=true]') && !$('[data-lv=s0][aria-checked=true]'), 'có settings.placement: bước trình độ ghi sẵn kết quả');
ok(/bài kiểm tra/.test($('#onbSay').textContent), 'Ama nói rõ lấy từ bài kiểm tra');
click($('[data-lv=s0]')); await tick(); ok($('[data-lv=s0][aria-checked=true]') && pickOf().lv === 's0', 'vẫn đổi được');
S.settings.onboarded = true; delete S.settings.placement; w.sessionStorage.removeItem('lk.onbPick');

await tick(200);
const real = errors.filter(e => !/Not implemented/.test(e));
ok(!real.length, 'không lỗi JS: ' + real.slice(0, 3).join(' | '));
if (fails) { console.error(`✗ welcome-flow: ${fails}/${n} đỏ`); process.exit(1); }
console.log(`✓ welcome-flow: ${n} kiểm`);
process.exit(0);
