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
const app = rd('web/js/app.js'), onb = rd('web/js/onboard.js'), wl = rd('web/js/welcome.js'), pl = rd('web/js/placement.js');
ok(!firstLoadFiles().includes('/js/welcome.js') && /welcome: \['js\/welcome\.js'\]/.test(app) && /ROUTE_BUNDLE = \{ welcome: 'welcome'/.test(app), 'welcome.js là gói lười, route nạp đúng gói');
ok(!/id="wCard"|id="wFeats"|data-wg=/.test(app) && /id="wCard"/.test(wl) && /id="wFeats"/.test(wl) && /#loginH/.test(wl) && /data-wjump/.test(wl), 'markup trang giới thiệu chỉ còn ở welcome.js');
ok(/!document\.getElementById\('lkHero'\)\) skel = setTimeout/.test(app), 'khung chờ không thay khung chào #lkHero');
ok(/const bootDog = setTimeout\([\s\S]{0,200}errState\(true, true\); \}, 8000\)/.test(app) && /clearTimeout\(bootDog\)/.test(app) && /reload === true \? location\.reload\(\)/.test(app), 'canh khởi động 8 s: thẻ lỗi, Thử lại = tải lại, boot chạy thì hủy');
ok(/const fresh = !hasData\(\);/.test(app) && /App\.replaceHash\('#\/welcome'\)/.test(app), 'boot dùng chung phép "có dữ liệu", chuyển bằng replace');
ok(/location\.replace\(location\.pathname \+ location\.search \+ h\)/.test(app), 'replace giữ /app/ (app có <base href="/">)');
ok(/const bare = v => String\(v \|\| ''\)\.replace\(\/\\\+\$\/, ''\)/.test(onb) && /examTarget: tg/.test(onb) && /targetBand = tg/.test(onb) && /IELTS 0–9, TOEIC 10–990, TOEFL 1–6, General A1–C2/.test(onb), 'examTarget/targetBand lưu không dấu +, có ghi chú thang');
ok(!/mình là Kit|Kit\.svg/.test(onb) && /aria-live="polite"/.test(onb) && /id="onbSay"/.test(onb), 'onboard.js: Ama thay Kit, giữ aria-live #onbSay');
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
for (const id of ['#wFront', '#wBack', '#wDone', '#wSay', '#wKit', '#loginW', '#loginH', '.w-nav', '#wFeats', '[data-wjump]', '[data-wg]', 'a[href="#/placement"]', 'a[href="#/style"]', 'footer.w-foot']) ok($(id), 'Welcome giữ ' + id);
click($('#wCard')); ok(!$('#wBack').hidden && $('#wFront').hidden, 'thẻ thử nhanh: chạm lật');
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
click($('#go')); await until(() => S.settings.onboarded && /^#\/day/.test(hash()), 15000); await tick(400);
ok(S.settings.onboarded && /^#\/day/.test(hash()), 'xong thiết lập → Ngày 1: ' + hash());
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

// ---- bài đầu vào làm trước: ghi sẵn, đổi được ----
asNew(); S.settings.exam = 'toeic'; S.settings.examTarget = '900'; await go('#/welcome/setup?s=target', 900); await until(() => $('#bandT'));
ok($('#bandT [data-v="900+"][aria-pressed=true]'), 'exam/examTarget hợp thang → chọn sẵn (nhãn 900+ ứng với 900 đã lưu)');
asNew(); S.settings.exam = 'ielts'; S.settings.placement = { v: 2, band: 6, stage: 's2', vCefr: 'B1', gCefr: 'B1', at: Date.now() };
await go('#/tests', 300); // rời màn thiết lập như người làm bài đầu vào rồi quay lại
await go('#/welcome/setup?s=level', 900); await until(() => $('.trk-lv'));
ok($('[data-lv=s2][aria-pressed=true]') && !$('[data-lv=s0][aria-pressed=true]'), 'có settings.placement: bước trình độ ghi sẵn kết quả');
ok(/bài kiểm tra/.test($('#onbSay').textContent), 'Ama nói rõ lấy từ bài kiểm tra');
click($('[data-lv=s0]')); await tick(); ok($('[data-lv=s0][aria-pressed=true]') && pickOf().lv === 's0', 'vẫn đổi được');
S.settings.onboarded = true; delete S.settings.placement; w.sessionStorage.removeItem('lk.onbPick');

await tick(200);
const real = errors.filter(e => !/Not implemented/.test(e));
ok(!real.length, 'không lỗi JS: ' + real.slice(0, 3).join(' | '));
if (fails) { console.error(`✗ welcome-flow: ${fails}/${n} đỏ`); process.exit(1); }
console.log(`✓ welcome-flow: ${n} kiểm`);
process.exit(0);
