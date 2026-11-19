// 🚩 Chọn ngôn ngữ đang học (web/cpack/tl-app/tl-pick.js): chạy MÃ THẬT target.js + tl-pick.js trong jsdom.
// Kiểm: danh sách = Target.avail() + "Sắp ra mắt" cho fr khi cờ tắt · chọn es → Target.set + về Target.homeOf · "Báo tôi khi có" lưu lựa chọn, không mở hộp mới ·
// a11y (radiogroup, aria-checked, nút ≥ nhãn, Esc/đóng) · cờ khẩn es_kill ẩn es · thông báo nhẹ đúng 1 lần khi fr bật · onboarding có bước 'lang' khi ≥ 2 ngôn ngữ.
// Chạy: node scripts/test/tl-picker.mjs
import fs from 'node:fs'; import { JSDOM } from 'jsdom';
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const rd = f => fs.readFileSync(f, 'utf8');
function mk(cfg = {}, lsInit = {}) {
  const dom = new JSDOM('<!doctype html><body><div class="top-stats"><button id="examChip"></button></div><div id="modal" hidden><div id="modalBox"></div></div><main id="view"><a class="chip tl-chip" href="#/settings" data-tl="es">x</a><p>c</p></main><div id="root"><div><button data-act="lang"></button></div></div></body>', { url: 'https://lexkite.test/app/#/home', runScripts: 'outside-only' });
  const w = dom.window; w.self = w; w.localStorage.setItem('lk.cfg', JSON.stringify({ v: cfg }));
  Object.entries(lsInit).forEach(([k, v]) => w.localStorage.setItem(k, v));
  const toasts = []; w.t = (k, v) => String(k).replace(/\{(\w+)\}/g, (_, x) => (v && v[x] != null ? v[x] : '{' + x + '}'));
  w.UI = { esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), toast: m => toasts.push(m),
    modal(html, o) { const m = w.document.getElementById('modal'); w.document.getElementById('modalBox').innerHTML = html; m.dataset.v = (o && o.v) || ''; m.hidden = false; return w.document.getElementById('modalBox'); },
    closeModal() { w.document.getElementById('modal').hidden = true; } };
  w.Core = { Cards: { all: async () => ({ a: { word: 'a', tl: 'es', srs: { interval: 30 } }, b: { word: 'b', tl: 'es', srs: { interval: 1 } }, c: { word: 'c', srs: { interval: 2 } } }) } };
  w.eval(rd('web/js/target.js')); w.eval(rd('web/cpack/tl-app/tl-pick.js')); return { w, toasts, d: w.document };
}
const tick = () => new Promise(r => setTimeout(r, 20));
// 1) es bật 100 %, fr tắt → en · es chọn được, fr "Sắp ra mắt"
{ const { w, d } = mk({ es_course: true });
  const c = w.TLPick.courses(); ok(c.map(x => x.id + (x.on ? '+' : '-')).join() === 'en+,es+,fr-,pt-', 'courses: en,es chọn được, fr sắp ra mắt: ' + JSON.stringify(c));
  await w.TLPick.open(); await tick();
  const g = d.querySelector('[role=radiogroup]'); ok(g && g.getAttribute('aria-labelledby') === 'tlpT' && d.getElementById('tlpT'), 'radiogroup có nhãn');
  const rows = [...d.querySelectorAll('button.tlp-row')]; ok(rows.length === 2 && rows.every(r => r.getAttribute('role') === 'radio'), '2 hàng chọn được (en, es)');
  ok(rows[0].getAttribute('aria-checked') === 'true' && rows[1].getAttribute('aria-checked') === 'false', 'en đang chọn');
  ok(/Sắp ra mắt/.test(d.querySelector('.tlp-row.soon').textContent) && d.querySelector('.tlp-row.soon button[data-notify="fr"]'), 'fr: Sắp ra mắt + Báo tôi khi có');
  ok(/2 từ đã học/.test(rows[1].textContent) && rows[1].querySelector('.tlp-bar i').style.width === '50%', 'tiến độ es: 2 từ, 50 % thuộc: ' + rows[1].textContent);
  ok(!!d.querySelector('[data-close][aria-label]'), 'nút đóng có aria-label');
  // báo tôi: lưu, không mở thêm hộp, nút khóa
  d.querySelector('[data-notify="fr"]').click(); ok(JSON.parse(w.localStorage.getItem('lk.tlnotify')).join() === 'fr', 'lưu lk.tlnotify'); ok(d.querySelector('[data-notify="fr"]').disabled && !d.getElementById('modal').hidden, 'nút khóa, hộp vẫn là bảng chọn (không popup mới)');
  ok(rows[0].querySelector('.tlp-lv') && /A1–C2/.test(rows[1].querySelector('.tlp-lv').textContent), 'mỗi khóa có nhãn cấp A1–C2');
  ok(rows[0].querySelector('.tlp-cur') && !rows[1].querySelector('.tlp-cur'), 'chỉ khóa hiện tại có nhãn "Đang học"');
  // chọn es
  rows[1].click(); ok(w.Target.cur() === 'es', 'Target.set(es)'); ok(w.location.hash === '#/practice/esd', 'điều hướng về Target.homeOf(es): ' + w.location.hash);
  ok(d.getElementById('modal').hidden, 'bảng đóng sau khi chọn');
  ok(!!d.querySelector('.tlp-skel[role=status]') && /Español/.test(d.querySelector('.tlp-skel').textContent), 'đổi khóa → khung xương có cờ + tên khóa mới (không màn trống)');
  // quay lại en → Hôm nay
  await w.TLPick.open(); await tick(); d.querySelector('button.tlp-row[data-tl="en"]').click(); ok(w.Target.cur() === 'en' && w.location.hash === '#/home', 'về en → #/home');
}
// 2) cờ tắt hết: không có es; fr vẫn "Sắp ra mắt"; chọn fr không đổi tl
{ const { w } = mk({}); ok(w.TLPick.courses().map(x => x.id).join() === 'en,fr,pt', 'chỉ en + fr/pt (sắp) khi es tắt'); w.TLPick.choose('fr'); ok(w.Target.cur() === 'en', 'fr chưa bật → không chọn được'); }
// 3) cờ khẩn es_kill ẩn es dù es_course = 1
{ const { w } = mk({ es_course: true, es_kill: true }); ok(!w.TLPick.courses().some(x => x.id === 'es' && x.on), 'es_kill tắt es'); }
// 4) nút cờ + a11y: desktop #tlBtn trước examChip; điện thoại cạnh nút ngôn ngữ; Esc = hộp chung (ui.js) – ở đây kiểm có nhãn
{ const { w, d } = mk({ es_course: true }); w.TLPick.boot(); const b = d.getElementById('tlBtn'); ok(b && b.nextElementSibling.id === 'examChip' && /English/.test(b.getAttribute('aria-label')) && b.getAttribute('aria-haspopup') === 'dialog', 'desktop #tlBtn + aria-label ngôn ngữ hiện tại');
  w.TLPick.head(d.getElementById('root')); ok(d.querySelectorAll('#root [data-act="tl"]').length === 1, 'điện thoại: 1 nút cờ'); w.TLPick.head(d.getElementById('root')); ok(d.querySelectorAll('#root [data-act="tl"]').length === 1, 'không nhân đôi nút');
  w.Target.set('es'); w.TLPick.paint(); ok(/Español/.test(b.getAttribute('aria-label')) && b.textContent.includes('🇪🇸'), 'nút cờ đổi theo ngôn ngữ đang học');
  w.TLPick.card(d.getElementById('root')); ok(/Khóa học khác/.test(d.querySelector('.tlp-card').textContent) && d.querySelectorAll('.tlp-open').length === 3, 'thẻ Khóa học khác: en + fr/pt (sắp)'); }
// 4b) chip trang ngôn ngữ đích mở bảng chọn; Explore có thẻ Khóa học khác
{ const { w, d } = mk({ es_course: true }); w.App = {}; w.TLPick.boot(); d.querySelector('a.tl-chip').click(); await tick();
  ok(!d.getElementById('modal').hidden && d.querySelector('.tlp-sheet'), 'bấm chip ngôn ngữ → mở bảng chọn (không rời trang)');
  w.App.afterRoute('courses'); ok(d.querySelectorAll('#view .tlp-card').length === 1, 'Explore (courses): thẻ Khóa học khác'); w.App.afterRoute('courses'); ok(d.querySelectorAll('#view .tlp-card').length === 1, 'không nhân đôi thẻ');
  d.querySelector('.tlp-card').remove(); w.App.afterRoute('review'); ok(!d.querySelector('.tlp-card'), 'trang khác: không thẻ'); }
// 5) thông báo nhẹ đúng 1 lần khi fr bật và người dùng đã bấm "Báo tôi"
{ const { w, toasts } = mk({}, { 'lk.tlnotify': '["fr"]' }); w.TLPick.boot(); ok(toasts.length === 0, 'fr còn tắt → im lặng');
  w.localStorage.setItem('lk.fr', '1'); w.TLPick.boot(); ok(toasts.length === 0, 'fr ready:false → vẫn im lặng (người thường không thấy khóa chưa có nội dung)'); w.Target.TABLE.fr.ready = true; w.TLPick.boot(); ok(toasts.length === 1 && /Français/.test(toasts[0]), 'fr bật → 1 dòng báo'); w.TLPick.boot(); ok(toasts.length === 1, 'không báo lại'); }
// 6) onboarding: bước 'lang' chỉ khi ≥ 2 ngôn ngữ; Target.set chỉ khi bấm Tiếp tục (đã onboard xong không bị hỏi: bước chỉ chạy trong luồng thiết lập)
{ const o = rd('web/js/onboard.js'); ok(/Target\.avail\(\)\.length > 1 \? \['lang', \.\.\.BASE\] : BASE/.test(o), 'onboard: bước lang khi avail ≥ 2'); ok(/pick\.tl \|\| Target\.cur\(\)/.test(o), 'onboard: mặc định = ngôn ngữ hiện tại (en)'); }
// 7) nối dây: bundle + css + hook
{ const a = rd('web/js/app.js'); ok(/tlpick: \['cpack\/tl-app\/tl-pick\.js'\]/.test(rd('web/js/bundles.js')) && /tlpick: \['css\/tl-pick\.css'\]/.test(a) && /App\.need\('tlpick'\)/.test(a), 'app.js: gói + css + boot'); ok(/TLPick\.head\(root\)/.test(rd('web/js/ux1.js')) && /TLPick\.card\(root\)/.test(rd('web/js/ux1-me.js')), 'ux1 + tab Tôi gắn cờ/thẻ');
  ok(!/#[0-9a-fA-F]{3,8}\b/.test(rd('web/css/tl-pick.css')), 'css không hex'); }
// 8) (19/11) đang học es/fr/pt KHÔNG BAO GIỜ ra màn tiếng Anh: bản đồ route + ready:false + màn chuẩn bị
{ const NAV = ['vocab', 'skills', 'skill', 'tests', 'toeic', 'mock', 'path', 'library', 'deck', 'grammar', 'lesson', 'listen', 'read', 'write', 'speaking', 'today'];
  const { w, d } = mk({ es_course: true }); w.Target.set('es');
  ok(w.Target.routeFor('vocab') === '#/practice/es' && w.Target.routeFor('skills') === '#/practice/esp' && w.Target.routeFor('tests') === '#/practice/esx', 'es: vocab/skills/tests → màn tiếng TBN');
  ok(NAV.every(n => /^#\/(practice\/es|tlprep)/.test(w.Target.routeFor(n))), 'es: mọi màn chỉ-có-tiếng-Anh đều ánh xạ sang màn es (không về en): ' + NAV.map(n => w.Target.routeFor(n)).join());
  ok(w.Target.routeFor('home') === '' && w.Target.routeFor('me') === '' && w.Target.routeFor('settings') === '', 'màn dùng chung giữ nguyên');
  w.Target.set('en'); ok(NAV.every(n => w.Target.routeFor(n) === ''), 'en: không ánh xạ nào (giữ nguyên từng byte)');
  for (const id of w.Target.LANGS) { const r = w.Target.table(id); if (r.ready === false) { ok(!w.Target.enabled(id), id + ' ready:false → người thường không bật được'); } else if (id !== 'en') { ok(r.routes && ['vocab', 'skills', 'tests'].every(k => /^#\/(?!vocab|skills|tests)/.test(r.routes[k] || '')), id + ': đủ bản đồ vocab/skills/tests không trỏ về hub tiếng Anh'); } }
  const a = mk({ fr_course: true }, { 'lk.adm': '1' }); a.w.Target.set('fr'); ok(a.w.Target.cur() === 'fr' && a.w.Target.routeFor('vocab') === '#/tlprep/fr' && a.w.Target.homeOf('fr') === '#/tlprep/fr', 'quản trị chọn fr → màn chuẩn bị, không phải Hôm nay tiếng Anh');
  const u = mk({ fr_course: true }); u.w.Target.set('fr'); ok(u.w.Target.cur() === 'en', 'người thường: fr (chưa sẵn sàng) → cur() = en');
  a.w.App = { routes: {} }; a.w.eval(rd('web/cpack/tl-app/tl-pick.js')); a.w.location.hash = '#/tlprep/fr'; a.w.App.routes.tlprep(); ok(!!a.d.querySelector('.tlp-prep [data-back]') && /Français/.test(a.d.querySelector('.tlp-prep').textContent), 'màn chuẩn bị: tên khóa + nút quay lại tiếng Anh');
  a.d.querySelector('[data-back]').click(); ok(a.w.Target.cur() === 'en' && a.w.location.hash === '#/home', 'quay lại tiếng Anh → #/home');
  const ap = rd('web/js/app.js'); ok(/Target\.routeFor\(name\)/.test(ap) && /tlprep: 'tlpick'/.test(ap), 'app.js route(): chuyển hướng + gói tlprep');
  ok(/TH\('vocab'\)/.test(rd('web/js/ux1.js')), 'ux1: thanh tab theo bản đồ'); }

console.log(fails ? `✗ tl-picker: ${fails}/${n} lỗi` : `✓ tl-picker: ${n}/${n} đạt`); process.exit(fails ? 1 : 0);
