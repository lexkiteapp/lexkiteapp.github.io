// 🛡️ Cổng MỌI tab quản trị (docs/specs/admin-audit.md §3) – jsdom, không mạng, không tài khoản thật, module admin-*.js THẬT (không stub):
//  1) mỗi trang (VIEWS) × 4 chế độ API: có dữ liệu · rỗng ({}) · lỗi 500 · chậm (đang tải) → không lỗi JS chưa bắt / console.error;
//     đang tải = khung xương aria-busy; rỗng = không in "undefined"/"NaN"/"[object Object]"; lỗi = có ô báo lỗi (err-box/role=alert/chữ "lỗi").
//  2) không link chết: mọi href="#…"/data-go trỏ tới trang có thật (sau bí danh); cấm href="#" trơn.
//  3) mọi hash cũ (21 trang trước IA 05/11) + bí danh mới mở đúng trang, giữ đuôi /…?…; mục thanh bên/hub đúng.
//  4) R1: tab chậm trả về SAU khi đã sang tab khác không được đè tab mới.
// Lỗi đã biết chưa sửa: scripts/test/admin-tabs.baseline.json – CHỈ được giảm (mục đã hết lỗi mà còn trong baseline → đỏ, buộc xoá).
// Dùng: node scripts/test/admin-tabs.mjs   (npm test qua scripts/test/suite.txt)
import fs from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { FX, BFX, VFX } from './fixtures/admin-fx.mjs';
const rd = f => fs.readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const BASE = JSON.parse(rd('scripts/test/admin-tabs.baseline.json')), known = new Set(BASE.known || []);
let passes = 0; const fails = [], hit = new Set();
const ok = (c, m, key) => { if (c) { passes++; return; } if (key && known.has(key)) { hit.add(key); return; } fails.push(m + (key ? ` [${key}]` : '')); };
const tick = (ms = 15) => new Promise(r => setTimeout(r, ms));

const ADM = rd('web/js/admin.js');
const VIEWS = [...ADM.slice(ADM.indexOf('  const VIEWS = {'), ADM.indexOf('\n  };\n', ADM.indexOf('  const VIEWS = {'))).matchAll(/^ {4}async (\w+)\(main\) \{/gm)].map(m => m[1]);
const ALIAS = Function('return ' + /const ALIAS = (\{[^}]*\})/.exec(ADM)[1])();
const OLD = ['overview', 'analytics', 'ads', 'users', 'inbox', 'notices', 'alerts', 'reports', 'quality', 'dist', 'social', 'studio', 'video', 'backlinks', 'quota', 'drive', 'keys', 'accounts', 'services', 'storage', 'settings'];
ok(VIEWS.length >= 22 && OLD.every(k => VIEWS.includes(k)), 'VIEWS đủ 21 trang cũ + health: ' + VIEWS.join(','));

let MODE = 'data', SLOW = 0;
const errs = [];
process.on('unhandledRejection', e => errs.push('unhandled: ' + String(e && e.message || e).split('\n')[0]));
const html = rd('web/admin.html').replace(/<script[^>]*><\/script>/g, '').replace(/<link[^>]+>/g, '');
const vc = new VirtualConsole();
vc.on('jsdomError', e => { if (!/Not implemented|Could not parse CSS/.test(e.message)) errs.push('jsdom: ' + e.message); });
vc.on('error', (...a) => errs.push('console.error: ' + a.map(String).join(' ').slice(0, 200)));
const dom = new JSDOM(html, { url: 'https://lexkite.com/admin.html#overview', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window, d = w.document, $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)];
w.localStorage.setItem('lk.admLang', 'vi');
w.HTMLElement.prototype.scrollIntoView = () => {}; w.scrollTo = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
w.alert = m => errs.push('alert(): ' + m); w.confirm = () => false; w.prompt = () => null; // hộp thoại gốc lúc vẽ = lỗi (R6)
w.HTMLCanvasElement.prototype.getContext = () => null;
w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
const clone = x => JSON.parse(JSON.stringify(x));
const dataFor = (url, b) => {
  if (/\/api\/admin-shorts/.test(url)) return b.op === 'list' ? clone(VFX) : {};
  if (/\/api\/admin-prefs/.test(url)) return b.op === 'get' ? { ok: true, pref: { tab: 'overview' } } : { ok: true, rows: [] };
  if (/\/api\/admin\b/.test(url)) return FX[b.op] ? clone(FX[b.op]) : {};
  if (/\/api\/backlinks/.test(url)) return BFX[b.op] ? clone(BFX[b.op]) : {};
  return {};
};
w.fetch = async (url, o = {}) => {
  url = String(url); const b = o && o.body && typeof o.body === 'string' ? (() => { try { return JSON.parse(o.body); } catch (e) { return {}; } })() : {};
  const res = (j, s = 200) => ({ ok: s < 400, status: s, headers: { get: () => 'application/json' }, json: async () => j, text: async () => JSON.stringify(j), blob: async () => new w.Blob([]) });
  if (/\/api\/admin\b/.test(url) && b.op === 'whoami') return res({ admin: true }); // cổng vào luôn mở để kiểm từng tab
  if (SLOW) await tick(SLOW);
  if (MODE === 'error') return res({ error: 'boom' }, 500);
  if (MODE === 'empty') return res(/\/api\/admin-prefs/.test(url) && b.op === 'get' ? { ok: true, pref: {} } : {});
  return res(dataFor(url, b));
};
const USER = { email: 'admin@example.com', uid: 'a1', getIdToken: async () => 'tok' };
const AUTH = { currentUser: USER, onAuthStateChanged: cb => { setTimeout(() => cb(USER), 0); }, signOut: async () => {}, signInWithPopup: async () => {} };
w.FIREBASE_CONFIG = {}; w.firebase = { initializeApp() {}, auth: Object.assign(() => AUTH, { GoogleAuthProvider: function () { this.setCustomParameters = () => {}; } }) };
// Module thật (tải lười trong trình duyệt) – nạp sẵn để lazy() dùng luôn
for (const f of fs.readdirSync(new URL('../../web/js/', import.meta.url)).filter(f => /^admin-.*\.js$/.test(f) && f !== 'admin-gate.js').sort()) {
  try { w.eval(rd('web/js/' + f)); } catch (e) { fails.push(`nạp ${f}: ${e.message}`); }
}
w.eval(ADM);
await tick(150); errs.length = 0;

const view = () => $('#main .view-host');
const text = () => { const n = (view() || $('#main')).cloneNode(true); n.querySelectorAll('style,script,template').forEach(x => x.remove()); return n.textContent; }; // chữ người dùng thấy (bỏ <style> module tự chèn)
const gotoHash = async (h, ms = 160) => { w.location.hash = h; w.dispatchEvent(new w.HashChangeEvent('hashchange')); await tick(ms); };
const closeDialogs = () => $$('dialog').forEach(x => { try { x.remove(); } catch (e) { /* bỏ qua */ } });

// ---------- 1) mỗi trang × 4 chế độ ----------
for (const mode of ['data', 'empty', 'error', 'slow']) {
  for (const t of VIEWS) {
    MODE = mode === 'slow' ? 'data' : mode; SLOW = mode === 'slow' ? 250 : 0; errs.length = 0;
    await gotoHash('#overview', 5); await gotoHash('#settings', 5); // rời trang để lần mở sau luôn vẽ lại
    if (mode === 'slow') {
      w.location.hash = '#' + t; w.dispatchEvent(new w.HashChangeEvent('hashchange')); await tick(20);
      const busy = !!$('#main [aria-busy="true"], #main .sk');
      ok(busy, `#${t} đang tải: thiếu khung xương`, `${t}:loading`);
      await tick(400);
    } else await gotoHash('#' + t, 220);
    const v = view(), tx = text();
    ok(v && v.dataset.view === t, `#${t} (${mode}): khung trang không đúng (${v && v.dataset.view})`);
    ok(!errs.length, `#${t} (${mode}): lỗi JS: ${errs.slice(0, 2).join(' | ')}`, `${t}:${mode}:js`);
    ok(tx.trim().length > 0, `#${t} (${mode}): trang trống`, `${t}:${mode}:blank`);
    ok(!/\bundefined\b|\bNaN\b|\[object Object\]/.test(tx), `#${t} (${mode}): in "${(/.{0,40}(\bundefined\b|\bNaN\b|\[object Object\]).{0,20}/.exec(tx) || [])[0]}"`, `${t}:${mode}:junk`);
    if (mode === 'error') ok(!!$('#main .err-box, #main [role="alert"]') || /lỗi|không tải|không đọc|thử lại/i.test(tx), `#${t} (lỗi 500): không báo lỗi cho người dùng`, `${t}:error:state`);
    closeDialogs();
  }
}
MODE = 'data'; SLOW = 0;

// ---------- 2) không link chết ----------
const canon = h => { let x = String(h || '').replace(/^#/, ''); const b = x.split(/[/?]/)[0]; if (ALIAS[b]) x = ALIAS[b] + x.slice(b.length); return x; };
const dead = new Set();
for (const t of VIEWS) {
  await gotoHash('#' + t, 200);
  for (const a of $$('#main a[href^="#"], #pgHead a[href^="#"], #tabs a[href^="#"], [data-go]')) {
    const h = a.getAttribute('data-go') || a.getAttribute('href');
    if (a.getAttribute('href') === '#' && !a.hasAttribute('data-go') && !a.getAttribute('role')) { dead.add(`#${t}: href="#"`); continue; }
    const b = canon(h).split(/[/?]/)[0]; if (h === '#main' || !b) continue;
    if (!VIEWS.includes(b) && !$(`#${CSS.escape ? CSS.escape(b) : b}`) && !d.getElementById(b)) dead.add(`#${t}: ${h}`);
  }
  closeDialogs();
}
for (const x of dead) ok(false, 'link chết ' + x, 'dead:' + x);

// ---------- 3) hash cũ + bí danh ----------
const HUB = { quota: 'health', storage: 'health', quality: 'health', drive: 'health', health: 'health', keys: 'vault', accounts: 'vault', services: 'vault' };
for (const k of OLD) {
  await gotoHash('#' + k, 160);
  ok(baseOfHash() === k && view() && view().dataset.view === k, `hash cũ #${k} → mở ${view() && view().dataset.view} (${w.location.hash})`);
  const cur = $('#tabs a[aria-current="page"]'); ok(cur && cur.dataset.tab === (HUB[k] || k), `#${k}: thanh bên chọn ${cur && cur.dataset.tab}, cần ${HUB[k] || k}`);
  if (HUB[k] && k !== 'health') ok(($('.hub-tabs a[aria-current="page"]') || { dataset: {} }).dataset.go === k, `#${k}: tab con hub chưa chọn`);
  closeDialogs();
}
function baseOfHash() { return w.location.hash.replace(/^#/, '').split(/[/?]/)[0]; }
for (const [from, to] of Object.entries(ALIAS)) { await gotoHash('#' + from, 160); ok(baseOfHash() === to && view() && view().dataset.view === to, `bí danh #${from} → #${to} (đang ${w.location.hash})`); }
await gotoHash('#drive/ledger?q=x', 160); ok(w.location.hash === '#drive/ledger?q=x', 'đuôi #drive/ledger?q=x giữ nguyên: ' + w.location.hash);
await gotoHash('#today', 160); ok(w.location.hash === '#overview', '#today đổi thành #overview trên thanh địa chỉ: ' + w.location.hash);

// ---------- 4) R1: tab chậm không đè tab mới ----------
SLOW = 300; await gotoHash('#settings', 5); SLOW = 300; w.location.hash = '#overview'; w.dispatchEvent(new w.HashChangeEvent('hashchange')); await tick(30);
SLOW = 0; await gotoHash('#inbox', 120); await tick(450);
ok(view() && view().dataset.view === 'inbox' && !$('#main .today-q'), 'R1: Tổng quan trả về muộn đè lên Hộp thư');
// Hôm nay: hàng đợi có mục đỏ/vàng từ dữ liệu mẫu (Android build hỏng) + link xử lý
await gotoHash('#overview', 250); ok($$('#main .today-i').length >= 1 && $('#main .today-i a'), 'Hôm nay: hàng đợi có việc + link xử lý');
await gotoHash('#alerts', 250); ok($$('#tSig .sig-f').length === 5 && $('#tSig table'), 'Trung tâm cảnh báo: 5 nút lọc mức + bảng');
const crit = $('#tSig .sig-f[data-lv="crit"]'); if (crit) { crit.click(); await tick(20); ok(crit.getAttribute('aria-pressed') === 'true', 'lọc mức Nghiêm trọng bật'); }

// ---------- baseline chỉ được giảm ----------
const stale = [...known].filter(k => !hit.has(k));
ok(!stale.length, 'baseline còn mục đã hết lỗi – xoá khỏi scripts/test/admin-tabs.baseline.json: ' + stale.join(', '));
if (fails.length) { console.error(fails.map(x => '  ✗ ' + x).join('\n')); console.error(`✗ admin-tabs: ${fails.length} lỗi, ${passes} đạt, ${hit.size} lỗi đã biết (baseline)`); process.exit(1); }
console.log(`✓ admin-tabs: ${passes} kiểm tra đạt · ${VIEWS.length} trang × 4 chế độ, link, ${OLD.length} hash cũ, bí danh · ${hit.size} lỗi đã biết còn lại (baseline, chỉ giảm)`);
process.exit(0);
