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
let DRV_ALERTS = [{ level: 'warn', t: 'replica', p: { n: 17 } }]; // /api/drive alerts (đổi giữa chừng để kiểm nhãn theo loại)
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
  for (const [f, fn] of [['admin-ads.js', 'A'], ['admin-quota.js', 'Q'], ['admin-keys.js', 'S'], ['admin-drive.js', 'S'], ['admin-reports.js', 'T'], ['admin-social.js', 'S'], ['admin-social-mgr.js', 'M'], ['admin-studio.js', 'S'], ['admin-growth.js', 'G'], ['admin-backlinks.js', 'B'], ['admin-video.js', 'V'], ['admin-prefs.js', 'P'], ['admin-storage.js', 'S']]) {
    const src = rd('web/js/' + f), EN = dict(src);
    const m2 = [...new Set([...src.matchAll(new RegExp(`\\b(?:${fn}|L)\\(\\s*'((?:[^'\\\\]|\\\\.)*)'`, 'g'))].map(m => unq(m[1])))].filter(k => VI.test(k) && !(k in EN) && !(k in AEN));
    ok(!m2.length, `${f}: khóa tiếng Việt thiếu bản EN: ${m2.slice(0, 3).join(' | ')}`);
  }
}

// ---------- Dựng trang ----------
import { NOW, DAY, vday, CONFIG_KEYS, FX, EVIL, BFX, VIT, VFX } from './fixtures/admin-fx.mjs';
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
  if (/\/api\/admin-prefs/.test(url)) {
    if (b.op === 'get') return res({ ok: true, pref: { tab: 'settings', lang: 'en', theme: 'auto', autoLogoutMin: 0, alertTypes: ['js_error'], jsErrorThreshold: 10, quotaThresholdPct: 70 } });
    if (b.op === 'set') return res({ ok: true, pref: b.pref });
    if (b.op === 'logs') return res({ ok: true, rows: [{ at: NOW, email: 'admin@example.com', op: 'adminPrefSet', ok: 1, ip: '127.0.0.1', country: 'VN' }] });
    return res({ error: 'op' }, 400);
  }
  if (/\/api\/admin/.test(url)) return FX[b.op] ? res(JSON.parse(JSON.stringify(FX[b.op]))) : res({ error: 'op' }, 400);
  if (/\/api\/drive/.test(url)) return res({ alerts: JSON.parse(JSON.stringify(DRV_ALERTS)) });
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
w.AdminClips = {}; /* lưới cũ: không nạp admin-clips.js trong jsdom */ w.eval(rd('web/js/admin-backlinks.js')); w.eval(rd('web/js/admin-video.js')); w.eval(rd('web/js/admin-prefs.js'));
w.eval(rd("web/js/admin-chart.js")); w.eval(ADM);
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
ok($$('#tabs .side-g').length === 6 && $$('#tabs a[data-tab]').length === 20, 'thanh bên: 6 nhóm, 20 mục (+ Kênh & phân phối, Quảng cáo, Lưu trữ)');
ok($$('#tabs .side-h').map(x => x.textContent).join('|') === 'Overview|Users|Quality|Content & Video|System', 'tên nhóm EN: ' + $$('#tabs .side-h').map(x => x.textContent).join('|'));
ok($('#tabs a[data-tab="quota"] .nav-l').textContent === 'Quotas', '"Hạn mức" dịch thành Quotas ở EN');
ok($('#tabs a[aria-current="page"]').dataset.tab === 'settings' && h1() === 'Settings', 'mở thẳng #settings → mục Cài đặt đang chọn');
await tick(30);
ok($('#inboxN').textContent === '2' && $('#alertN').textContent === '1', 'huy hiệu hộp thư/cảnh báo: ' + $('#inboxN').textContent + '/' + $('#alertN').textContent);
ok($('#drvN').textContent === '⚠1' && /17 file\(s\) have only 1 copy/.test($('#drvBanner').textContent), 'banner + huy hiệu Kho Drive');
{ // 27/10: cảnh báo không phải Drive (CI…) → nhãn "System" + mở tab Cảnh báo; huy hiệu Kho Drive chỉ đếm cảnh báo Drive. Quay lại tab → tải lại cảnh báo.
  DRV_ALERTS = [{ kind: 'ci', level: 'crit', t: 'ci', p: { n: 5 } }, { level: 'warn', t: 'replica', p: { n: 17 } }];
  Object.defineProperty(d, 'hidden', { configurable: true, get: () => false }); d.dispatchEvent(new w.Event('visibilitychange')); await tick(40);
  const bn = $('#drvBanner'), a = bn && bn.querySelector('a');
  ok(bn && /^⛔ System:/.test(bn.querySelector('b').textContent.trim()) && /CI: 5 workflows failed/.test(bn.textContent) && !/disconnected/i.test(bn.textContent), 'banner: cảnh báo CI → nhãn System, chữ CI (không "Drive disconnected"): ' + (bn && bn.textContent.trim().slice(0, 120)));
  ok(a && a.getAttribute('href') === '#alerts' && /Open alerts/.test(a.textContent), 'banner CI → liên kết tab Cảnh báo');
  ok($('#drvN').textContent === '⚠1', 'huy hiệu Kho Drive chỉ đếm cảnh báo Drive (⚠1, không ⛔2): ' + $('#drvN').textContent);
  d.dispatchEvent(new w.Event('visibilitychange')); await tick(40); // < 60 s → không gọi lại API
  DRV_ALERTS = [{ level: 'warn', t: 'replica', p: { n: 17 } }];
}
{ // banner toàn cục phải có chữ cho MỌI loại cảnh báo mà tab Kho Drive biết (27/10: 'ci' rơi về mặc định → hiện nhầm "Drive disconnected")
  const src = f => rd('web/js/' + f), keys = s => [...s.matchAll(/(?:^|[{,]\s*)([a-z_0-9]+): '/g)].map(m => m[1]);
  const tab = keys(src('admin-drive.js').match(/const alertTxt = a => \{[^]*?\}\[a\.t\]/)[0]), ban = keys(src('admin.js').match(/const DRV_T = \{[^\n]*\};/)[0]);
  const miss = tab.filter(k => !ban.includes(k));
  ok(tab.length >= 10 && !miss.length, 'banner DRV_T đủ loại cảnh báo: thiếu ' + (miss.join(',') || '–'));
}

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
// Khối Cài đặt tài khoản quản trị ([N3])
ok(!!$('#admPrefCard'), 'hiện khối cài đặt tài khoản quản trị');
ok(!!$('#admPrefTab') && !!$('#admPrefLogout') && !!$('#admPrefJsLim'), 'đủ các ô chọn tab, tự đăng xuất, ngưỡng');
ok($$('.adm-alert-chk').length === 6, 'có 6 checkbox loại cảnh báo email');
$('#admPrefSave').click(); await tick(30);
const prefSetCall = calls.find(c => c.url.includes('/api/admin-prefs') && c.b.op === 'set');
ok(prefSetCall && prefSetCall.b.pref, 'bấm lưu cài đặt tài khoản → gọi API set');
$('#admLogCsv').click(); await tick(30);
const prefLogCall = [...calls].reverse().find(c => c.url.includes('/api/admin-prefs') && c.b.op === 'logs');
ok(prefLogCall && prefLogCall.b.limit === 500, 'bấm xuất CSV → gọi API logs limit=500');
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
// Người dùng: cột quốc gia (cờ + tên theo ngôn ngữ admin), thẻ đếm theo quốc gia bấm để lọc, ô lọc quốc gia/ngày tham gia
$('#tabs a[data-tab="users"]').click(); await tick(60);
{ const rows = $$('#uTable tbody tr'), hdr = $$('#uTable thead th').map(t => t.textContent);
  ok(hdr.includes('Country') && /🇻🇳/.test(rows[0].textContent) && /Vietnam/.test(rows[0].textContent) && /Unknown/.test(rows[1].textContent), 'Người dùng: cột quốc gia cờ + tên tiếng Anh, thiếu mã → "Unknown"');
  ok($$('#uCc [data-cc]').length === 3 && /Japan/.test($('#uCc [data-cc]').textContent) === false && /Unknown country/.test($('#uCc').textContent), 'thẻ theo quốc gia: đủ dòng + nhóm chưa rõ');
  ok($$('#fcc option').map(o => o.value).join() === ',JP,VN,??', 'ô lọc quốc gia xếp theo tên + "chưa rõ"');
  const n0 = calls.length; $('#uCc [data-cc="JP"]').click(); await tick(40);
  ok(calls.slice(n0).some(c => c.b.op === 'users' && c.b.cc === 'JP') && $('#uCc [data-cc="JP"]').getAttribute('aria-pressed') === 'true' && !$('#uclr').hidden, 'bấm quốc gia → lọc, nút Bỏ lọc hiện');
  const fr = $('#ffrom'); fr.value = '2026-10-01'; fr.dispatchEvent(new w.Event('change')); await tick(40);
  ok(calls.slice(n0).some(c => c.b.op === 'users' && c.b.from === '2026-10-01'), 'lọc ngày tham gia gửi from');
  $('#uclr').click(); await tick(40); ok(calls[calls.length - 1].b.cc === '' && calls[calls.length - 1].b.from === '' && $('#uclr').hidden, 'Bỏ lọc → xóa mọi bộ lọc');
  leak('#users quốc gia'); try { w.sessionStorage.removeItem('adm.uf'); } catch (e) { /* bỏ qua */ } }
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
{ // Trung tâm video: thanh mục con dính, Tổng quan ("Cần anh làm"), Chờ duyệt, Thư viện (lưới dự phòng), Sản xuất & QC, Kịch bản, Kênh, Lưu trữ
  const m = $('#main'), cards = () => m.querySelectorAll('.vid-card'), sec = async k => { m.querySelector(`.vx-nav [data-sec="${k}"]`).click(); await tick(60); };
  const tabs = [...m.querySelectorAll('.vx-nav [data-sec]')];
  ok(h1() === 'Video hub' && tabs.length === 7 && m.querySelector('.vx-nav [aria-current="page"]').dataset.sec === 'overview' && /#video\/overview$/.test(w.location.hash), 'tab Video: tiêu đề EN, 7 mục con, mặc định Tổng quan + #video/overview');
  ok(m.querySelectorAll('.vx-list li').length >= 2 && /waiting for your review/.test(m.textContent) && m.querySelectorAll('.vx-list .btn.primary').length === 1 && m.querySelectorAll('.kpis .kpi').length === 5 && (m.querySelectorAll('.ach .ach-c').length === 30 || m.querySelector('.ach-empty')), 'Tổng quan: danh sách "Cần anh làm" (1 nút chính), 5 KPI, biểu đồ 30 ngày liền (js/admin-chart.js) hoặc trạng thái trống');
  ok(m.querySelector('.vx-nav [data-n="review"]').textContent === '2' && m.querySelector('.vx-nav [data-n="qc"]').textContent === '1', 'huy hiệu mục: 2 chờ duyệt, 1 lỗi QA');
  m.querySelector('.vx-more summary').click(); m.querySelector('.vx-more').open = true; m.querySelector('.vx-more').dispatchEvent(new w.Event('toggle')); await tick();
  ok(m.querySelectorAll('#vx-stats .vid-box').length >= 5 && /100/.test(m.querySelector('#vx-stats').textContent), 'phân tích chi tiết tải lười khi mở');
  leak('#video tổng quan');
  m.querySelector('.vx-list [data-go2="review"]').click(); await tick(60);
  ok(m.querySelector('.vx-nav [aria-current="page"]').dataset.sec === 'review' && m.querySelectorAll('.vx-r').length === 2 && /#video\/review$/.test(w.location.hash), 'nút "Duyệt ngay" → mục Chờ duyệt (2 clip đạt QA)');
  ok(!w.__pwn && !m.querySelector('.vx-q img') && m.querySelectorAll('.vx-r [data-ok]').length === 2, 'Chờ duyệt: không bìa khi chưa có token, nút Duyệt mỗi dòng');
  leak('#video chờ duyệt');
  m.querySelector('.vx-r [data-open]').click(); await tick(40);
  const dl = d.querySelector('dialog.vid-dlg'); ok(dl && /ALL PASS/.test(dl.textContent) && !dl.querySelector('video') && /Drive pool/.test(dl.textContent), 'xem thử: modal QA, chưa tải video khi chưa có token');
  dl.querySelector('[data-c="hashtags"]').click(); await tick(); ok(copied === '#a #b', 'chép hashtag');
  leak('#video modal'); dl.querySelector('[data-x]').click(); ok(!d.querySelector('dialog.vid-dlg'), 'đóng modal');
  await sec('library');
  ok(cards().length === 3 && /Unavailable/.test(m.textContent) && /Drive pool/.test(m.textContent), 'Thư viện (dự phòng): 3 thẻ, chưa có token → "Unavailable" + cảnh báo Drive');
  const sel = k => m.querySelector(`select[data-f="${k}"]`), ch = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('change')); };
  ch(sel('format'), 'news'); ok(cards().length === 1 && cards()[0].dataset.id === 'n1', 'lọc định dạng bản tin'); ch(sel('format'), '');
  ch(sel('status'), 'fail'); ok(cards().length === 1 && cards()[0].dataset.id === 'x1', 'lọc QA chưa đạt'); ch(sel('status'), 'none'); ok(cards().length === 1, 'lọc chưa xếp lịch'); ch(sel('status'), '');
  input(m.querySelector('#vid-q'), 'listen a1'); ok(cards().length === 1, 'tìm theo điểm học'); input(m.querySelector('#vid-q'), '');
  const fr = m.querySelector('[data-f="from"]'); ch(fr, '2026-10-21'); ok(cards().length === 1, 'lọc theo ngày'); ch(fr, '');
  leak('#video thư viện');
  await sec('qc'); ok(/No QC report yet/.test(m.textContent) && m.querySelector('[data-go="studio"]'), 'Sản xuất & QC: trạng thái trống + liên kết Video Studio'); leak('#video QC');
  await sec('scripts'); ok(m.querySelectorAll('.vid-cov .none').length === 1 && m.querySelectorAll('.vid-cov .gap').length === 2, 'Kịch bản: độ phủ (thiếu/chưa có)'); leak('#video kịch bản');
  await sec('channels'); await tick(40); ok(m.querySelector('[data-go="dist"]') && m.querySelector('#vx-web'), 'Kênh & phân phối: liên kết tab Kênh + hiệu quả web'); leak('#video kênh');
  await sec('archive'); ok(/No clips in the archive/.test(m.textContent) && m.querySelector('[data-go="drive"]'), 'Lưu trữ: trống + liên kết Kho Drive'); leak('#video lưu trữ');
  w.history.replaceState(null, '', '#video/qc'); $('#tabs a[data-tab="video"]').click(); await tick(80);
  ok(true, 'mở lại tab'); await sec('overview');
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
