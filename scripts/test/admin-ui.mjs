// Test khung trang quản trị (web/admin.html + web/js/admin.js) bằng jsdom – không mạng, Firebase & /api/* giả:
//  1) thanh bên theo nhóm, điều hướng, #hash sâu (#drive/browse?…, #keys?…), huy hiệu, banner Kho Drive
//  2) bảng lệnh Ctrl/⌘+K (lọc, phím mũi tên, Enter, Esc)
//  3) Cài đặt: hiện giá trị đang lưu/mặc định, kiểm tra hợp lệ, trạng thái chưa lưu, nội dung gửi lưu, đặt lại mặc định, chặn rời trang
//  4) VI/EN: chế độ EN không lộ chữ Việt (giao diện, hộp thoại, bảng lệnh) + mọi khóa L('…') tiếng Việt có bản EN (admin.js và các module)
//  5) hộp thoại xóa phải gõ lại UID, nút sao chép mã, axe (WCAG A/AA) không lỗi nghiêm trọng
import fs from 'fs';
import { createRequire } from 'module';
import { JSDOM, VirtualConsole } from 'jsdom';
const require = createRequire(import.meta.url);
const rd = f => fs.readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.error('  ✗ ' + m); } };
const tick = (ms = 15) => new Promise(r => setTimeout(r, ms));
const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

// ---------- 0) Tĩnh: mọi khóa tiếng Việt có bản EN ----------
const dict = src => { const i = src.indexOf('const EN = {'); let d = 0, j = i + 11; for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && !--d) break; } return new Function('return ' + src.slice(i + 11, j + 1))(); };
const unq = s => new Function(`return '${s}'`)();
const ADM = rd('web/js/admin.js'), AEN = dict(ADM);
{
  const enBlock = ADM.slice(ADM.indexOf('const EN = {'), ADM.indexOf('const L = ('));
  const miss = [...new Set([...ADM.replace(enBlock, '').matchAll(/'((?:[^'\\\n]|\\.)*)'/g)].map(m => unq(m[1])).filter(k => VI.test(k) && !/[|\\^$]/.test(k)))].filter(k => !(k in AEN) && !/^(lk\.|adm\.)/.test(k));
  ok(!miss.length, 'admin.js: chuỗi tiếng Việt thiếu bản EN: ' + miss.slice(0, 5).join(' | '));
  for (const [f, fn] of [['admin-quota.js', 'Q'], ['admin-keys.js', 'S'], ['admin-drive.js', 'S'], ['admin-reports.js', 'T'], ['admin-social.js', 'S'], ['admin-studio.js', 'S'], ['admin-growth.js', 'G'], ['admin-backlinks.js', 'B'], ['admin-video.js', 'V']]) {
    const src = rd('web/js/' + f), EN = dict(src);
    const m2 = [...new Set([...src.matchAll(new RegExp(`\\b(?:${fn}|L)\\(\\s*'((?:[^'\\\\]|\\\\.)*)'`, 'g'))].map(m => unq(m[1])))].filter(k => VI.test(k) && !(k in EN) && !(k in AEN));
    ok(!m2.length, `${f}: khóa tiếng Việt thiếu bản EN: ${m2.slice(0, 3).join(' | ')}`);
  }
}

// ---------- Dựng trang ----------
const NOW = Date.now(), DAY = 864e5, vday = t => new Date(t + 7 * 3600e3).toISOString().slice(0, 10);
const CONFIG_KEYS = ['banner', 'banner_url', 'banner_level', 'ai_user', 'ai_anon', 'ai_global', 'alert_errors', 'note', 'hit_rate'];
const FX = {
  whoami: { admin: true },
  overview: { users: { total: 120, new7: 8, act1: 14, act7: 40, act30: 70 }, sessions: { today: 30, s7: 200, v7: 90, dur7: 180, pages7: 3.2 }, inbox: { open: 2 }, errors24: { kinds: 1, hits: 3 }, humans: { d1: 25, p1: 20, d7: 90, p7: 80, d30: 300, p30: 310 }, online: 4, excluded: 12, series: Array.from({ length: 14 }, (_, i) => ({ day: vday(NOW - (13 - i) * DAY), v: i * 2 })) },
  alerts: { rows: [{ name: 'Translate', ok: true, conclusion: 'success', at: NOW }, { name: 'Android build', ok: false, conclusion: 'failure', at: NOW - 3600e3, url: 'https://github.com/x' }] },
  quality: { score: 100, standard: 100, at: NOW, url: 'https://github.com/run', checks: [{ name: 'Unit tests', ok: true }, { name: 'Live site', ok: true }], history: [{ at: NOW, ok: true, url: 'https://github.com/r1' }, { at: NOW - DAY, ok: false, url: 'https://github.com/r2' }] },
  geminiStatus: { set: true, keys: [{ last4: 'abcd', at: NOW - DAY, by: 'admin@example.com' }] },
  usage: { meters: [{ name: 'D1 storage', pct: 12, used: 60 * 1048576, cap: 500 * 1048576, unit: 'bytes' }] },
  config: { keys: CONFIG_KEYS, values: { banner: { k: 'banner', v: 'Maintenance tonight', at: NOW - 3600e3, by: 'admin@example.com' }, ai_user: { k: 'ai_user', v: '8', at: NOW - DAY, by: 'admin@example.com' }, hit_rate: { k: 'hit_rate', v: '', at: NOW - DAY, by: 'admin@example.com' } } },
  configSet: { ok: true, n: 3 },
  analytics: { days: 30, sum: { s: 10, v: 5, dur: 60, pages: 2, ret: 3, bounce: 1, lcp: 1800, lcpGood: 8, lcpN: 9 }, daily: [{ day: vday(NOW), s: 10 }], refs: [{ k: 'google.com', n: 4, dur: 30 }], countries: [{ k: 'US', n: 3 }], devs: [{ k: 'mobile', n: 6 }], langs: [{ k: 'en', n: 6 }], plats: [{ k: 'web', n: 6 }], paths: [{ k: 'home', n: 6 }], freq: [{ k: '1', n: 4 }], rate: 1, hours: [{ k: 9, n: 3 }], wdays: [{ k: 1, n: 3 }], durs: [{ k: '1–3 phút', n: 3 }], nr: [{ day: vday(NOW), fresh: 3, back: 2 }], signups: [{ day: vday(NOW), n: 2 }], excluded: { s: 2 } },
  live: { at: NOW, rate: 1, online: 3, viewing: [{ k: 'home', n: 2 }], today: { s: 5, views: 12, visitors: 4, dur: 80, perVisitor: 3 }, countries: [{ k: 'US', n: 2 }, { k: 'XX', n: 1 }], pagesToday: [{ k: 'home', n: 5 }], refs: [], platsToday: [{ k: 'web', n: 3 }], excluded: { s: 3, kinds: [{ k: 'bot', s: 2 }, { k: 'admin', s: 1 }] }, total: { views: 100, visitors: 40 }, plats30: [{ k: 'web', n: 20 }], pages7: [{ k: 'home', n: 30 }], series: Array.from({ length: 14 }, (_, i) => ({ day: vday(NOW - (13 - i) * DAY), views: i, visitors: i >> 1 })) },
  users: { rows: [{ uid: 'u1', email: 'learner@example.com', name: 'Ann', created: NOW - 9 * DAY, seen: NOW - 3600e3, plat: 'web', n: 5, isAdmin: false }], filtered: 1, total: 1, kpi: { act1: 1, act7: 1, act30: 1, new7: 1 }, plats: [{ k: 'web', n: 1 }] },
  user: { user: { uid: 'u1', email: 'learner@example.com', name: 'Ann', created: NOW - 9 * DAY, seen: NOW - 3600e3, plat: 'web', n: 5 }, docs: [{ k: 'meta', bytes: 300, updated: NOW }], learn: { xp: 10, streak: 2, studyDays: 3, reviews: 40, newWords: 5, quizzes: 1, readings: 1, spoken: 0, badges: 1, lastStudy: vday(NOW) } },
  userDelete: { ok: true },
  inbox: { rows: [{ id: 7, at: NOW - 600e3, name: 'Bob', email: 'bob@example.com', msg: 'Hello there', lang: 'en', sent: 1, handled: 0 }] },
  inboxMark: { ok: true },
  errors: { rows: [{ h: 'h1', msg: 'TypeError: x is undefined', src: 'app.js:1', path: 'home', n: 3, last: NOW }, { h: 'h2', msg: 'ReferenceError: y', src: 'ui.js:9', path: 'vocab', n: 9, last: NOW - DAY }] },
  auditLog: { rows: [{ at: NOW, email: 'admin@example.com', op: 'configSet', ip: 'abc123', country: 'VN', ok: 1 }, { at: NOW - 60e3, email: 'stranger@example.com', op: 'overview', ip: 'ff00', country: 'US', ok: 0 }] },
  services: { rows: [{ id: 1, name: 'Cloudflare Pages', purpose: 'Hosting', account: 'ops@example.com', status: 'active', console: 'https://dash.cloudflare.com', free: '500 builds', secret: '', note: '' }] },
};
// Backlink, PR & Thương hiệu (/api/backlinks) – có dữ liệu độc để thử chống XSS
const EVIL = '<img src=x onerror="window.__pwn=1">';
const BFX = {
  list: { configured: { ci: true, dispatch: true, mail: true }, run: { at: NOW - 3600e3, url: 'https://github.com/lexkiteapp/lexkiteapp.github.io/actions/runs/1' },
    placements: [
      { id: 'medium', platform: 'Medium', type: 'article', url: 'https://medium.com/@lexkite/post', account: 'lexkite', status: 'live', expectLink: 'lexkite.com', expectedRel: 'nofollow', notes: '', submittedAt: '2026-10-17', history: [{ at: NOW - DAY, level: 'ok', state: 'ok' }, { at: NOW, level: 'regression', state: 'removed', http: 404 }], last: { at: NOW, http: 404, final: 'https://medium.com/@lexkite/post', link: null, rel: null, noindex: null, title: EVIL, state: 'removed', level: 'regression', reasons: ['removed'], change: NOW } },
      { id: 'evil', platform: EVIL, type: 'listing', url: 'javascript:alert(1)', account: 'x', status: 'pending', expectLink: 'lexkite.com', expectedRel: 'unknown', notes: EVIL, history: [], last: { at: NOW, http: 200, link: true, rel: 'follow', noindex: false, title: '', state: 'ok', level: 'change', reasons: ['listed'] } },
      { id: 'devto', platform: 'dev.to', type: 'article', url: 'https://dev.to/u/p', account: 'u', status: 'live', expectLink: 'lexkite.com', expectedRel: 'unknown', notes: '', history: [{ at: NOW, level: 'ok', state: 'ok' }], last: { at: NOW, http: 200, link: true, rel: 'follow', noindex: false, state: 'ok', level: 'ok', reasons: [] } },
      { id: 'peer', platform: 'Peerlist', type: 'profile', url: 'https://peerlist.io/lexkite', account: 'lexkite', status: 'live', expectLink: 'lexkite.com', expectedRel: 'unknown', notes: '', history: [], last: { at: NOW, http: 403, state: 'blocked', level: 'manual', reasons: ['blocked'] } },
    ],
    domains: [{ domain: 'lexkite.net', status: 'ok', ns: true, a: true, aaaa: false, mx: true, mxHosts: ['mx.phish.example'], ips: ['203.0.113.9'], level: 'regression', reasons: ['resolves', 'mx-added'], since: NOW, at: NOW }, { domain: 'lexkite.org', status: 'nx', level: 'ok', reasons: [], at: NOW }],
    handles: [{ k: 'github:lexkiteapp', platform: 'github', handle: 'lexkiteapp', url: 'https://github.com/lexkiteapp', status: 'owned', notes: '', last: { state: 'ours', level: 'ok', reasons: [] } }, { k: 'x:lexkite', platform: 'x', handle: 'lexkite', url: 'https://x.com/lexkite', status: 'not-yet', notes: '', last: { state: 'unknown', level: 'manual', reasons: ['manual-only'] } }],
    copy: { at: NOW, configured: true, probes: [{ url: 'https://lexkite.com/en/blog/a/', sentence: 'A distinctive sentence', suspects: [{ url: 'https://copycat.example.net/a', title: EVIL }] }] } },
  checkNow: { ok: true }, placementSet: { ok: true }, handleSet: { ok: true }, domainAck: { ok: true }, export: { version: 1, placements: [{ id: 'devto' }] },
};
// Thư viện video (/api/admin-shorts) – manifest gói sẵn (chưa có token: không bìa/video) + 1 mục độc thử chống XSS
const VIT = (id, o = {}) => ({ id, lesson: id, scene: 'cafe', format: 'scene', template: 'choose', area: 'listening', cefr: 'A2', point: 'listen ' + id, title: 'Title ' + id, description: 'Desc ' + id, hashtags: ['#a', '#b'], duration: 21.5, qa: { status: 'pass', result: 'ALL PASS', ok: 30, fail: 0, lipsync_ms: 35, cps_max: 14.2 }, created: '2026-10-20T05:00:00Z', bytes: 8e6, video: `shorts/cafe/${id}/v.mp4`, cover: `shorts/cafe/${id}/v.jpg`, slot: { n: 1, date: '2099-01-01', time: '11:30', tz: 'Asia/Ho_Chi_Minh' }, ...o });
const VFX = { items: [VIT('a1'), VIT('n1', { scene: 'anchor', format: 'news', template: 'news', area: 'grammar', cefr: 'B1', created: '2026-10-21T05:00:00Z', slot: null }), VIT('x1', { title: EVIL, point: EVIL, qa: { status: 'fail' } })],
  source: 'bundle', media: false, updated: '2026-10-21T00:00:00Z', coverage: { target_per_area: 5, areas: { listening: { label: 'Listening' }, grammar: { label: 'Grammar' }, dictionary: { label: 'Dictionary' } } },
  calendar: { posts: [{ n: 1, date: '2099-01-01', time: '11:30', id: 'a1', scene: 'cafe', template: 'choose' }] }, credits: { total: 100, banks: { cafe: { total: 100, img_cr: 20, video_cr: 80 } } }, covers: {} };
const html = rd('web/admin.html').replace(/<script[^>]*><\/script>/g, '').replace(/<link[^>]+>/g, '');
const vc = new VirtualConsole(); vc.on('jsdomError', e => { if (!/Not implemented|Could not parse CSS/.test(e.message)) console.error('jsdom:', e.message); });
const dom = new JSDOM(html, { url: 'https://lexkite.com/admin.html#settings', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window, d = w.document, $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)];
w.localStorage.setItem('lk.admLang', 'en');
w.HTMLElement.prototype.scrollIntoView = () => {}; w.scrollTo = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {} });
let copied = null; Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: async v => { copied = v; } } });
const calls = [];
w.fetch = async (url, o = {}) => {
  const b = o.body ? JSON.parse(o.body) : {}; calls.push({ url: String(url), b });
  const res = (j, s = 200) => ({ ok: s < 400, status: s, json: async () => j });
  if (/\/api\/admin-shorts/.test(url)) return b.op === 'list' ? res(JSON.parse(JSON.stringify(VFX))) : res({ error: 'needs-token' }, 503);
  if (/\/api\/admin/.test(url)) return FX[b.op] ? res(JSON.parse(JSON.stringify(FX[b.op]))) : res({ error: 'op' }, 400);
  if (/\/api\/drive/.test(url)) return res({ alerts: [{ level: 'warn', t: 'replica', p: { n: 17 } }] });
  if (/\/api\/backlinks/.test(url)) return BFX[b.op] ? res(JSON.parse(JSON.stringify(BFX[b.op]))) : res({ error: 'op' }, 400);
  return res({}, 404);
};
const USER = { email: 'admin@example.com', getIdToken: async () => 'tok' };
let authCb = null;
const AUTH = { currentUser: USER, onAuthStateChanged: cb => { authCb = cb; setTimeout(() => cb(USER), 0); }, signOut: async () => {}, signInWithPopup: async () => {} };
w.FIREBASE_CONFIG = {}; w.firebase = { initializeApp() {}, auth: Object.assign(() => AUTH, { GoogleAuthProvider: function () {} }) };
// Module tải lười: thay bằng bản giả ghi lại #hash lúc vẽ (kiểm tra đường dẫn sâu)
const seen = {};
for (const n of ['AdminDrive', 'AdminKeys', 'AdminQuota', 'AdminSocial', 'AdminStudio']) w[n] = { render(box) { seen[n] = w.location.hash; box.innerHTML = `<div class="card" id="stub-${n}">stub</div>`; } };
w.AdminReports = { render(box) { box.innerHTML = '<div class="card" id="stub-rep">stub</div>'; }, card(box) { box.innerHTML = '<div class="card">reports card</div>'; } };
w.AdminClips = {}; /* lưới cũ: không nạp admin-clips.js trong jsdom */ w.eval(rd('web/js/admin-backlinks.js')); w.eval(rd('web/js/admin-video.js'));
w.eval(ADM);
await tick(80);
const h1 = () => ($('.pg-t') || {}).textContent;
const lastCall = op => [...calls].reverse().find(c => c.b.op === op);
const kd = (el, key, o = {}) => el.dispatchEvent(new w.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...o }));
const input = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
const visible = () => { // chữ người dùng thấy + nhãn trợ năng (bỏ <script>/<style>)
  const t = []; const walk = n => { if (n.nodeType === 3) t.push(n.nodeValue); else if (n.nodeType === 1 && !/^(SCRIPT|STYLE)$/.test(n.tagName)) { for (const a of ['title', 'aria-label', 'placeholder']) if (n.getAttribute(a)) t.push(n.getAttribute(a)); if (n.tagName === 'INPUT' && n.type === 'button') t.push(n.value); n.childNodes.forEach(walk); } };
  walk(d.body); return t.join(' ');
};
const leak = where => { const m = visible().match(new RegExp(`[^\\s]*${VI.source}[^\\s]*`, 'gi')); ok(!m, `EN ${where}: lộ chữ Việt: ${(m || []).slice(0, 6).join(' · ')}`); };

// ---------- 1) Khung + thanh bên ----------
ok(d.body.classList.contains('adm-in') && !$('#side').hidden, 'đăng nhập → hiện thanh bên');
ok($$('#tabs .side-g').length === 6 && $$('#tabs a[data-tab]').length === 17, 'thanh bên: 6 nhóm, 17 mục');
ok($$('#tabs .side-h').map(x => x.textContent).join('|') === 'Overview|Users|Quality|Content & Video|System', 'tên nhóm EN: ' + $$('#tabs .side-h').map(x => x.textContent).join('|'));
ok($('#tabs a[data-tab="quota"] .nav-l').textContent === 'Quotas', '"Hạn mức" dịch thành Quotas ở EN');
ok($('#tabs a[aria-current="page"]').dataset.tab === 'settings' && h1() === 'Settings', 'mở thẳng #settings → mục Cài đặt đang chọn');
await tick(30);
ok($('#inboxN').textContent === '2' && $('#alertN').textContent === '1', 'huy hiệu hộp thư/cảnh báo: ' + $('#inboxN').textContent + '/' + $('#alertN').textContent);
ok($('#drvN').textContent === '⚠1' && /17 file\(s\) have only 1 copy/.test($('#drvBanner').textContent), 'banner + huy hiệu Kho Drive');

// ---------- 3) Cài đặt ----------
const fld = k => $(`.fld[data-k="${k}"]`), val = k => $('#set-' + k).value;
ok(val('ai_user') === '8' && /Default: 5/.test(fld('ai_user').textContent) && fld('ai_user').querySelector('[data-reset]'), 'ai_user: hiện giá trị đang lưu 8 + chip mặc định 5 + nút đặt lại');
ok(val('ai_anon') === '3' && /Using default/.test(fld('ai_anon').textContent), 'ai_anon chưa đặt: hiện mặc định 3 + "Using default"');
ok(val('hit_rate') === '1' && $('#set-hit_rate-r').value === '1' && /100% of visitors/.test(fld('hit_rate').textContent), 'hit_rate: thanh trượt + ô số + giải thích');
ok(val('banner') === 'Maintenance tonight' && $('#bnPrev .lk-banner.info') && /Maintenance tonight/.test($('#bnPrev').textContent), 'banner: giá trị hiện tại + xem trước kiểu info');
ok($$('.fld[data-k="banner_level"] input[type=radio]').length === 3 && $('.fld[data-k="banner_level"] input[value="info"]').checked, 'kiểu thông báo = nút chọn 3 lựa chọn (mặc định info)');
ok($('.fld-unit') && /per user\/day/.test(fld('ai_user').textContent), 'trường số có đơn vị');
ok($('[data-card="note"]') && $('[data-card="note"] #set-note'), 'Ghi chú nội bộ ở thẻ riêng');
ok(/No changes/.test($('#saveSt').textContent) && $('#csave').disabled, 'chưa sửa: "No changes", nút Lưu tắt');
input($('#set-ai_anon'), '-1');
ok(fld('ai_anon').classList.contains('invalid') && /whole number from 0 to 1,000/.test(fld('ai_anon').querySelector('.fld-err').textContent) && $('#csave').disabled, 'ai_anon -1 → lỗi phạm vi, không lưu được');
input($('#set-banner_url'), 'http://x.com');
ok(/must start with https/.test(fld('banner_url').querySelector('.fld-err').textContent), 'link không https → lỗi');
input($('#set-hit_rate'), '2'); ok(fld('hit_rate').classList.contains('invalid'), 'tỉ lệ lấy mẫu > 1 → lỗi');
input($('#set-hit_rate'), '0.1'); ok(!fld('hit_rate').classList.contains('invalid') && $('#set-hit_rate-r').value === '0.1' && /× 10/.test(fld('hit_rate').textContent), 'tỉ lệ 0.1 → thanh trượt đồng bộ + "× 10"');
input($('#set-hit_rate'), '1'); ok(!fld('hit_rate').classList.contains('dirty'), 'gõ lại đúng mặc định → không tính là thay đổi');
input($('#set-banner_url'), '');
input($('#set-ai_anon'), '4');
ok(/1 unsaved change/.test($('#saveSt').textContent) && !$('#csave').disabled && fld('ai_anon').classList.contains('dirty'), 'sửa 1 trường → "1 unsaved change"');
const warn = $('.fld[data-k="banner_level"] input[value="warn"]'); warn.checked = true; warn.dispatchEvent(new w.Event('change', { bubbles: true }));
ok($('#bnPrev .lk-banner.warn') && /2 unsaved changes/.test($('#saveSt').textContent), 'đổi kiểu → xem trước warn + 2 thay đổi');
input($('#set-note'), 'key AIzaSyFAKEFAKE'); ok(fld('note').classList.contains('invalid'), 'ghi chú chứa khóa → chặn'); input($('#set-note'), '');
fld('ai_user').querySelector('[data-reset]').click(); await tick();
ok(val('ai_user') === '5' && /Using default/.test(fld('ai_user').textContent) && /3 unsaved changes/.test($('#saveSt').textContent), 'đặt lại mặc định ai_user → hiện 5 + "Using default"');
$('#csave').click(); await tick(30);
const cs = lastCall('configSet');
ok(cs && JSON.stringify(cs.b.values) === JSON.stringify({ banner_level: 'warn', ai_user: '', ai_anon: '4' }), 'lưu: chỉ gửi trường đã đổi, mặc định = "" → ' + JSON.stringify(cs && cs.b.values));
ok(/Saved 3 changes/.test($('#toasts').textContent), 'toast xác nhận đã lưu');
ok(/No changes/.test($('#saveSt').textContent) && !$('.fld.dirty'), 'sau khi lưu: hết trạng thái chưa lưu');
// Chặn rời trang khi còn thay đổi
input($('#set-ai_anon'), '6');
$('#tabs a[data-tab="overview"]').click(); await tick();
ok($('.cf-dlg') && /Discard unsaved changes/.test($('.cf-dlg').textContent), 'rời Cài đặt khi chưa lưu → hỏi xác nhận');
$('.cf-dlg [data-no]').click(); await tick();
ok(h1() === 'Settings' && w.location.hash === '#settings' && val('ai_anon') === '6', 'chọn Ở lại → vẫn ở Cài đặt, giữ thay đổi');
w.location.hash = '#users'; await tick(30);
ok($('.cf-dlg'), 'đổi #hash khi chưa lưu → hỏi xác nhận');
$('.cf-dlg [data-yes]').click(); await tick(40);
ok(h1() === 'Users' && $('#tabs a[aria-current]').dataset.tab === 'users', 'Bỏ thay đổi → sang Người dùng');

// ---------- 5) Xóa dữ liệu: gõ lại UID ----------
$('[data-del="u1"]').click(); await tick();
const yes = $('.cf-dlg [data-yes]');
ok(yes && yes.disabled && $('#cfIn'), 'xóa dữ liệu: nút tắt tới khi gõ UID');
input($('#cfIn'), 'u2'); ok(yes.disabled, 'gõ sai UID → vẫn tắt');
input($('#cfIn'), 'u1'); ok(!yes.disabled, 'gõ đúng UID → bật');
yes.click(); await tick(30);
ok(lastCall('userDelete') && lastCall('userDelete').b.confirm === 'u1', 'gửi userDelete kèm confirm = UID');
$('[data-uid="u1"]').click(); await tick(30);
ok($('.u-dlg .copy[data-copy="u1"]'), 'chi tiết người dùng: nút sao chép UID'); leak('chi tiết người dùng');
$('.u-dlg .copy').click(); await tick(); ok(copied === 'u1', 'bấm → sao chép UID');
$('.u-dlg [data-close]').click(); await tick(); ok(!$('.u-dlg'), 'đóng hộp thoại');

// ---------- 1b) Điều hướng bằng thanh bên + #hash sâu ----------
$('#tabs a[data-tab="inbox"]').click(); await tick(30);
ok(w.location.hash === '#inbox' && h1() === 'Inbox' && /Hello there/.test($('#main').textContent), 'bấm thanh bên → #inbox');
$('.ib-meta .copy').click(); await tick(); ok(copied === '7', 'sao chép mã tin');
w.location.hash = '#drive/browse?d=abc&q=x'; await tick(40);
ok(seen.AdminDrive === '#drive/browse?d=abc&q=x' && w.location.hash === '#drive/browse?d=abc&q=x' && h1() === 'Drive storage', 'đường dẫn sâu #drive/browse?… giữ nguyên khi vẽ module');
w.location.hash = '#keys?p=gemini&s=live'; await tick(40);
ok(seen.AdminKeys === '#keys?p=gemini&s=live' && $('#tabs a[aria-current]').dataset.tab === 'keys', 'đường dẫn sâu #keys?… giữ nguyên');
$('#tabs a[data-tab="drive"]').click(); await tick(40);
ok(w.location.hash === '#drive' && seen.AdminDrive === '#drive', 'bấm lại mục Drive → về #drive gốc');

// ---------- 2) Bảng lệnh ----------
kd(d, 'k', { ctrlKey: true }); await tick();
const q = $('#cmdkQ');
ok($('#cmdkDlg') && d.activeElement === q, 'Ctrl+K mở bảng lệnh, con trỏ ở ô tìm');
ok($$('#cmdkL [role=option]').length >= 19, 'bảng lệnh liệt kê mọi trang + lệnh');
leak('bảng lệnh');
input(q, 'quota'); ok($$('#cmdkL [role=option]')[0].textContent.includes('Quotas'), 'gõ "quota" → Quotas đứng đầu');
kd(q, 'Enter'); await tick(40);
ok(!$('#cmdkDlg') && w.location.hash === '#quota' && h1() === 'Quotas', 'Enter → mở Hạn mức');
kd(d, 'k', { metaKey: true }); await tick();
input($('#cmdkQ'), 'han muc'); ok(/Quotas/.test($('#cmdkL').textContent), 'tìm không dấu theo tên Việt cũng ra');
input($('#cmdkQ'), 'drive'); const o0 = $('#cmdkL [aria-selected="true"]');
kd($('#cmdkQ'), 'ArrowDown'); ok($('#cmdkL [aria-selected="true"]') !== o0 && $('#cmdkQ').getAttribute('aria-activedescendant'), 'mũi tên xuống đổi mục chọn');
input($('#cmdkQ'), 'ledger'); kd($('#cmdkQ'), 'Enter'); await tick(40);
ok(w.location.hash === '#drive/ledger' && seen.AdminDrive === '#drive/ledger', 'lệnh "Ledger" → #drive/ledger');
kd(d, 'k', { ctrlKey: true }); await tick(); kd($('#cmdkQ'), 'Escape'); await tick(); ok(!$('#cmdkDlg'), 'Esc đóng bảng lệnh');
$('#cmdk').click(); await tick(); ok($('#cmdkDlg'), 'nút "Go to…" mở bảng lệnh'); kd($('#cmdkQ'), 'Escape'); await tick();

// ---------- 4) EN không lộ chữ Việt trên từng màn hình lõi ----------
for (const t of ['overview', 'analytics', 'users', 'inbox', 'alerts', 'quality', 'services', 'settings']) {
  $(`#tabs a[data-tab="${t}"]`).click(); await tick(60);
  if ($('.cf-dlg')) { $('.cf-dlg [data-yes]').click(); await tick(40); }
  ok($('#tabs a[aria-current]').dataset.tab === t && !$('.err-box'), `#${t} vẽ được, không lỗi`);
  leak('#' + t);
}
$('#tabs a[data-tab="overview"]').click(); await tick(60);
ok(/Humans today/.test($('#main').textContent) && /▲ 25%/.test($('#main').textContent) && /Bot sessions excluded/.test($('#main').textContent) && /Active now/.test($('#main').textContent), 'Tổng quan: ô người thật + xu hướng + phiên bot đã loại + đang online');
ok($('#main .spark') && $$('#main .kstat[data-go]').length >= 8, 'Tổng quan: đường mini + ô bấm được');
$('#tabs a[data-tab="alerts"]').click(); await tick(60);
const errRows = () => $$('#tErr tbody tr').map(r => r.cells[0].textContent);
ok(errRows()[0].startsWith('TypeError'), 'bảng lỗi: mặc định mới nhất trước');
$('#tErr th[data-k="n"] .th-sort').click(); ok(errRows()[0].startsWith('ReferenceError') && $('#tErr th[data-k="n"]').getAttribute('aria-sort') === 'descending', 'bấm tiêu đề → sắp theo số lần');
input($('#tErr .dt-q'), 'TypeError'); ok(errRows().length === 1, 'ô lọc trong bảng');
input($('#tErr .dt-q'), 'zzz'); ok(/No errors/.test($('#tErr tbody').textContent), 'lọc không khớp → trạng thái rỗng');
ok($('#tLog tr.bad-row'), 'nhật ký: dòng bị từ chối tô đỏ');
$('#eclr').click(); await tick(); ok($('.cf-dlg') && /Clear the entire error log/.test($('.cf-dlg').textContent), 'Xóa tất cả → hộp thoại xác nhận'); leak('hộp thoại xóa lỗi'); $('.cf-dlg [data-no]').click(); await tick();
ok(!lastCall('errorsClear'), 'Hủy → không xóa');

// VI ⇄ EN
$('#lng').click(); await tick(60);
ok(d.documentElement.lang === 'vi' && h1() === 'Cảnh báo' && $('#tabs a[data-tab="quota"] .nav-l').textContent === 'Hạn mức' && $('.adm-skip').textContent === 'Bỏ qua tới nội dung', 'đổi sang VI: thanh bên, tiêu đề, chữ tĩnh');
$('#lng').click(); await tick(60);
ok(d.documentElement.lang === 'en' && $('#tabs a[data-tab="quota"] .nav-l').textContent === 'Quotas' && $('#inboxN').textContent === '2', 'về EN: giữ huy hiệu sau khi vẽ lại thanh bên');

// ---------- Ngăn kéo thanh bên (điện thoại) ----------
$('#navBtn').click(); ok($('#side').classList.contains('open') && !$('#scrim').hidden && $('#navBtn').getAttribute('aria-expanded') === 'true', 'nút ☰ mở ngăn kéo');
kd($('#side'), 'Escape'); ok(!$('#side').classList.contains('open') && $('#scrim').hidden, 'Esc đóng ngăn kéo');

// ---------- Lỗi tải → hộp lỗi + Thử lại ----------
const fx = FX.inbox; delete FX.inbox;
$('#tabs a[data-tab="inbox"]').click(); await tick(40);
ok($('.err-box [data-retry]'), 'API lỗi → hộp lỗi có nút Thử lại'); FX.inbox = fx;
$('.err-box [data-retry]').click(); await tick(40); ok(!$('.err-box') && /Hello there/.test($('#main').textContent), 'Thử lại → tải được');

// ---------- Backlink, PR & Thương hiệu ----------
$('#tabs a[data-tab="video"]').click(); await tick(80);
{
  const m = $('#main'), cards = () => m.querySelectorAll('.vid-card');
  ok(h1() === 'Video library' && cards().length === 3, 'tab Thư viện video: tiêu đề EN + 3 thẻ (' + cards().length + ')');
  ok(!w.__pwn && !m.querySelector('.vid-grid img') && /Unavailable/.test(m.textContent) && /Drive pool/.test(m.textContent), 'chưa có token: không bìa, hiện "cần token", dữ liệu độc không thành HTML');
  const sel = k => m.querySelector(`select[data-f="${k}"]`), ch = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('change')); };
  ch(sel('format'), 'news'); ok(cards().length === 1 && cards()[0].dataset.id === 'n1', 'lọc định dạng bản tin'); ch(sel('format'), '');
  ch(sel('status'), 'fail'); ok(cards().length === 1 && cards()[0].dataset.id === 'x1', 'lọc QA chưa đạt'); ch(sel('status'), 'none'); ok(cards().length === 1, 'lọc chưa xếp lịch'); ch(sel('status'), '');
  input(m.querySelector('#vid-q'), 'listen a1'); ok(cards().length === 1, 'tìm theo điểm học'); input(m.querySelector('#vid-q'), '');
  const fr = m.querySelector('[data-f="from"]'); ch(fr, '2026-10-21'); ok(cards().length === 1, 'lọc theo ngày'); ch(fr, '');
  leak('#video');
  cards()[0].click(); await tick(40);
  const dl = d.querySelector('dialog.vid-dlg'); ok(dl && /ALL PASS/.test(dl.textContent) && !dl.querySelector('video') && /Drive pool/.test(dl.textContent), 'mở modal: QA + chưa tải video khi chưa có token');
  dl.querySelector('[data-c="hashtags"]').click(); await tick(); ok(copied === '#a #b', 'chép hashtag');
  leak('#video modal'); dl.querySelector('[data-x]').click(); ok(!d.querySelector('dialog.vid-dlg'), 'đóng modal');
  m.querySelector('[data-t="stats"]').click(); await tick();
  ok(m.querySelector('.vid-svg') && m.querySelectorAll('.vid-cov .none').length === 1 && m.querySelectorAll('.vid-cov .gap').length === 2 && /67%/.test(m.textContent), 'thống kê: biểu đồ SVG, độ phủ (thiếu/chưa có), tỉ lệ QA');
  leak('#video thống kê'); m.querySelector('[data-t="lib"]').click();
}
$('#tabs a[data-tab="backlinks"]').click(); await tick(80);
{
  const m = $('#main'), rowsT = () => [...m.querySelectorAll('#bwT tbody tr')];
  ok(h1() === 'Backlinks, PR & Brand' && rowsT().length === 4, 'tab Backlink: tiêu đề EN + 4 dòng');
  ok(rowsT()[0].dataset.id === 'medium' && rowsT()[0].classList.contains('bad-row') && /removed \/ 404/.test(rowsT()[0].textContent), 'sự cố lên đầu, tô đỏ, lý do EN');
  ok(m.querySelectorAll('#bwT .bw-h').length === 3 && /Incidents: 2/.test(m.textContent), 'lịch sử dạng vạch + đếm sự cố (bài + tên miền)');
  ok(!m.querySelector('#bwT img') && !m.querySelector('a[href^="javascript"]') && !w.__pwn, 'dữ liệu độc không thành HTML, link javascript: bị chặn');
  ok(m.querySelector('[data-live="evil"]') && m.querySelector('[data-play="peer"]'), 'nút Đánh dấu live (pending đã lên) + Cách xử lý (kiểm tay)');
  const fl = m.querySelector('#bwFl'); fl.value = 'manual'; fl.dispatchEvent(new w.Event('change')); ok(rowsT().length === 1 && rowsT()[0].dataset.id === 'peer', 'lọc theo kết quả');
  fl.value = ''; fl.dispatchEvent(new w.Event('change')); input(m.querySelector('#bwFq'), 'dev.to'); ok(rowsT().length === 1, 'ô tìm'); input(m.querySelector('#bwFq'), '');
  leak('#backlinks');
  m.querySelector('[data-play="medium"]').click(); await tick();
  ok(/Appeal/.test(m.querySelector('#bwTpl').value) && m.querySelector('#bwPlay a[href="https://help.medium.com/hc/en-us/requests/new"]'), 'Cách xử lý bài bị gỡ: mẫu khiếu nại + trang hỗ trợ Medium');
  m.querySelector('[data-cplay]').click(); await tick();
  const dm = m.querySelector('#bwTpl').value; ok(/DMCA Takedown Notice/.test(dm) && dm.includes('https://copycat.example.net/a') && dm.includes('https://web.archive.org/web/*/https://lexkite.com/en/blog/a/') && /\[Full legal name\]/.test(dm), 'mẫu DMCA điền sẵn URL gốc + Wayback + URL vi phạm, chừa trống tên');
  m.querySelector('#bwCopy').click(); await tick(); ok(copied === dm, 'sao chép mẫu');
  m.querySelector('[data-dplay="lexkite.net"]').click(); await tick();
  ok(/Abuse report/.test(m.querySelector('#bwTpl').value) && /mx\.phish\.example/.test(m.querySelector('#bwTpl').value) && m.querySelector('#bwPlay a[href*="lookup.icann.org"]'), 'tên miền na ná: mẫu báo lạm dụng có MX + ICANN Lookup');
  leak('#backlinks cách xử lý');
  m.querySelector('[data-ack="lexkite.net"]').click(); await tick(40); ok(lastCall('domainAck').b.domain === 'lexkite.net', 'Đã xem tên miền');
  $('#bwNow').click(); await tick(); ok(lastCall('checkNow'), 'Kiểm ngay → checkNow');
  $('#bwAdd').click(); await tick();
  const f = $('#bwForm'); f.querySelector('[name=id]').value = 'new-one'; f.querySelector('[name=platform]').value = 'Indie Hackers'; f.querySelector('[name=url]').value = 'https://www.indiehackers.com/product/lexkite'; f.querySelector('[name=account]').value = 'me@gmail.com';
  f.querySelector('#bwSave').click(); await tick(); ok(/No emails here/.test(f.querySelector('#bwErr').textContent) && !lastCall('placementSet'), 'biểu mẫu: chặn email');
  f.querySelector('[name=account]').value = 'lexkite'; f.querySelector('#bwSave').click(); await tick(40);
  const ps = lastCall('placementSet'); ok(ps && ps.b.isNew && ps.b.row.id === 'new-one' && ps.b.row.status === 'pending', 'biểu mẫu: gửi placementSet');
  $('#main [data-live="evil"]').click(); await tick(40); ok(lastCall('placementSet').b.row.status === 'live' && lastCall('placementSet').b.row.id === 'evil', 'Đánh dấu live');
  const own = $('#main [data-own="x:lexkite"]'); own.checked = true; own.dispatchEvent(new w.Event('change')); await tick(40); ok(lastCall('handleSet').b.row.status === 'owned', 'tích Đã giữ → handleSet owned');
}

// ---------- axe (WCAG 2 A/AA) ----------
w.eval(fs.readFileSync(require.resolve('axe-core'), 'utf8'));
const OFF = { 'color-contrast': { enabled: false }, region: { enabled: false } };
for (const t of ['overview', 'settings', 'alerts', 'users', 'backlinks']) {
  $(`#tabs a[data-tab="${t}"]`).click(); await tick(60);
  const r = await w.axe.run(d, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, rules: OFF });
  const bad = r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
  ok(!bad.length, `axe #${t}: ${bad.map(v => v.id + ' ' + (v.nodes[0] && v.nodes[0].html.slice(0, 90))).join(' | ')}`);
}
kd(d, 'k', { ctrlKey: true }); await tick();
{ const r = await w.axe.run(d, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }, rules: OFF }); const bad = r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical'); ok(!bad.length, 'axe bảng lệnh: ' + bad.map(v => v.id).join(', ')); }

console.log(fails ? `✗ admin-ui: ${fails} lỗi / ${passes + fails}` : `✓ admin-ui: ${passes} kiểm tra đạt (thanh bên, #hash sâu, bảng lệnh, Cài đặt, VI/EN, xác nhận gõ lại, axe)`);
process.exit(fails ? 1 : 0);
