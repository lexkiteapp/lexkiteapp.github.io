// Test Quản trị › Báo lỗi (web/js/admin-reports.js, jsdom, fetch giả – không tài khoản thật, không gửi thông báo thật): một hàng công cụ, bộ lọc đủ,
// phím tắt, đánh dấu đã sửa + Hoàn tác (không gửi gì trước khi hết thời gian), hàng loạt chia lô, mẫu trả lời theo ngôn ngữ người báo, an toàn khi đóng tab.
// + chuông thông báo (web/js/notices.js) gộp thông báo báo lỗi của máy này. Chạy: node scripts/test/admin-reports-ui.mjs
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const rd = f => fs.readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));
const UNDO = 120, SRC = rd('web/js/admin-reports.js'); // rút ngắn thời gian Hoàn tác khi test; bản thật 6 giây
ok(/UNDO_MS = 6000/.test(SRC), 'bản thật: 6 giây để Hoàn tác');
const mk = (i, x = {}) => ({ tid: 'LX-' + i, status: 'new', sev: 'P1', cat: 'bug', area: 'vocab', plat: 'web', ver: '1', lang: 'zh', msg: 'Sandbox report ' + i, at: Date.now() - 6e4, upd: Date.now() - 6e4, people: 1, ...x });

function setup({ wide = false, list = [mk(1001), mk(1002), mk(1003), mk(1004, { cat: 'idea' })] } = {}) {
  const dom = new JSDOM('<!doctype html><html><head></head><body><main id="m"></main></body></html>', { url: 'https://lk.test/admin.html#reports', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, d = w.document, calls = [];
  w.console.error = () => {}; w.alert = () => {}; w.confirm = () => true;
  if (wide) w.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  w.firebase = { auth: () => ({ currentUser: { getIdToken: async () => 'tok' } }) };
  const st = { rows: list, fail: false };
  w.fetch = async (u, init) => {
    const b = JSON.parse(init.body); calls.push({ b, keepalive: !!init.keepalive });
    let j = {};
    if (b.op === 'list') j = { rows: st.rows.map(r => ({ ...r })), total: st.rows.length, counts: { new: 2, ack: 1, prog: 1, fixed: 5, wontfix: 1, dup: 1, ideas: 1 }, sevs: { P0: 1, P1: 2 }, areas: { vocab: 2 }, spam: 3, admins: ['admin@example.com'] };
    else if (b.op === 'get') j = { ...(st.rows.find(r => r.tid === b.id) || mk(b.id.slice(3))), ctx: {}, errs: [], events: [], dups: [], tpl: { thanks: 'ZH-thanks', prog: 'ZH-prog', fixed: 'ZH-fixed', more: 'ZH-more' }, tpl_vi: { thanks: 'VI-thanks', prog: 'VI-prog', fixed: 'VI-fixed', more: 'VI-more' } };
    else if (b.op === 'cfg') j = { notify: 'instant', eta: { serious: 24, normal: 72, content: 168 } };
    else if (b.op === 'act') {
      if (st.fail) return { ok: false, status: 503, json: async () => ({ error: 'server' }) };
      for (const id of b.ids) { const r = st.rows.find(x => x.tid === id); if (r && b.status) r.status = b.status; }
      j = { ok: true, rows: b.ids.map(id => ({ id, changed: true, mailed: 0, pushed: 0, dups: 0 })) };
    } else if (b.op === 'export') j = { csv: 'ticket\nLX-1', n: 1 };
    return { ok: true, status: 200, json: async () => j };
  };
  w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = () => {};
  w.eval(SRC.replace('UNDO_MS = 6000', 'UNDO_MS = ' + UNDO));
  const main = d.getElementById('m');
  w.AdminReports.render(main, s => s, { esc, num: x => x, when: x => String(x), lang: () => 'en' });
  const key = (k, o = {}) => d.body.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...o }));
  const acts = () => calls.filter(c => c.b.op === 'act');
  return { dom, w, d, main, calls, acts, key, st, $: s => main.querySelector(s) };
}

// ---------- Bố cục gọn, không cắt tính năng ----------
{ const t = setup(); await tick(20);
  const bar = t.$('.rp-bar');
  ok(bar && bar.querySelector('#rpChips') && bar.querySelector('#rpQ') && bar.querySelector('#rpFB'), 'một hàng: trạng thái + tìm kiếm + nút Bộ lọc');
  ok(t.$('#rpFP').hidden && t.$('#rpMP').hidden, 'bộ lọc phụ và menu gom gọn, mặc định đóng');
  ok(t.main.querySelectorAll('.rp-tabs [data-st]').length <= 7, 'tối đa 7 nút trạng thái trên hàng (trước đây 10 chip)');
  for (const id of ['#rpArea', '#rpCat', '#rpPlat', '#rpSev', '#rpSort', '#rpSb', '#rpMode', '#rpCsv', '#rpRe', '#rpE1', '#rpE2', '#rpE3', '#rpEs', '#rpMoreSt']) ok(t.$(id), 'vẫn đủ tính năng: ' + id);
  for (const v of ['ack', 'wontfix', 'dup', 'spam']) ok(t.$(`#rpMoreSt option[value="${v}"]`), 'trạng thái phụ nằm trong "Thêm": ' + v);
  ok(!/[\u{1F300}-\u{1FAFF}✅✖⏸]/u.test(t.$('.rp-wrap').textContent), 'danh sách + hàng công cụ không còn emoji');
  t.$('#rpFB').click(); ok(!t.$('#rpFP').hidden && t.$('#rpFB').getAttribute('aria-expanded') === 'true', 'bấm Bộ lọc → mở');
  t.d.body.click(); ok(t.$('#rpFP').hidden, 'bấm ra ngoài → đóng');
  t.$('#rpCat').value = 'audio'; t.$('#rpCat').dispatchEvent(new t.w.Event('change')); await tick(10);
  ok(t.calls.filter(c => c.b.op === 'list').pop().b.cat === 'audio' && !t.$('#rpFN').hidden && t.$('#rpFN').textContent === '1', 'lọc gửi đúng và nút Bộ lọc hiện số đang bật');
  t.$('#rpCsv').click(); await tick(10); ok(t.calls.some(c => c.b.op === 'export'), 'Export CSV vẫn chạy');
  t.dom.window.close(); }

// ---------- Phím tắt ----------
{ const t = setup(); await tick(20);
  const curId = () => (t.$('.rp-row.cur') || { dataset: {} }).dataset.rid;
  ok(curId() === 'LX-1001', 'mở trang: dòng đầu đang chọn');
  t.key('j'); ok(curId() === 'LX-1002', 'j → dòng sau'); t.key('j'); t.key('k'); ok(curId() === 'LX-1002', 'k → dòng trước');
  t.key('k'); t.key('k'); ok(curId() === 'LX-1001', 'không chạy lố đầu danh sách');
  t.key('?'); ok(t.d.querySelector('dialog.rp-keys'), '? hiện bảng phím'); t.key('j'); ok(curId() === 'LX-1001', 'đang mở hộp thoại: phím không tác động danh sách');
  t.d.querySelector('dialog.rp-keys #rpKx').click(); ok(!t.d.querySelector('dialog.rp-keys'), 'đóng được bảng phím');
  t.key('/'); ok(t.d.activeElement === t.$('#rpQ'), '/ vào ô tìm kiếm');
  const inp = t.$('#rpQ'); inp.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: 'f', bubbles: true })); await tick(5); ok(!t.$('.rp-toast') && !t.d.querySelector('.rp-toast'), 'đang gõ: phím f không phải lệnh');
  t.d.body.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true })); ok(!t.d.querySelector('.rp-toast'), 'Ctrl/⌘ + phím: không chặn phím tắt trình duyệt');
  inp.blur();
  t.key('x'); ok(t.$('.rp-row.sel') && t.$('#rpBulk .rp-bulk'), 'x chọn dòng → hiện thanh hàng loạt');
  t.key('Escape'); ok(!t.$('.rp-row.sel') && !t.$('#rpBulk .rp-bulk'), 'Esc bỏ chọn');
  t.key('X'); ok(t.main.querySelectorAll('.rp-row.sel').length === 4, 'X chọn tất cả'); t.key('X'); ok(!t.$('.rp-row.sel'), 'X lần nữa bỏ chọn');
  t.dom.window.close(); }

// ---------- Đánh dấu đã sửa + Hoàn tác: không gửi gì trước khi hết thời gian ----------
{ const t = setup(); await tick(20);
  t.key('f'); await tick(30);
  ok(!t.acts().length, 'f: chưa gửi gì (chờ Hoàn tác) → người dùng chưa bị báo');
  ok(!t.main.querySelector('[data-rid="LX-1001"]'), 'dòng rời tab Mở ngay');
  ok((t.$('.rp-row.cur') || { dataset: {} }).dataset.rid === 'LX-1002', 'con trỏ sang dòng kế tiếp');
  const tt = t.d.querySelector('.rp-toast'); ok(tt && /LX-1001/.test(tt.textContent) && /Undo/.test(tt.textContent) && tt.getAttribute('aria-live') === 'polite', 'toast có Hoàn tác, aria-live');
  tt.querySelector('.rp-undo').click(); await tick(10);
  ok(t.main.querySelector('[data-rid="LX-1001"]') && (t.$('.rp-row.cur') || { dataset: {} }).dataset.rid === 'LX-1001', 'Hoàn tác: dòng về đúng chỗ');
  await tick(UNDO + 60); ok(!t.acts().length, 'đã Hoàn tác → không bao giờ gửi');
  t.main.querySelector('[data-rid="LX-1002"] [data-do="fix"]').click();
  t.key('u'); ok(t.main.querySelector('[data-rid="LX-1002"]'), 'phím u cũng hoàn tác');
  t.main.querySelector('[data-rid="LX-1003"] [data-do="fix"]').click();
  await tick(UNDO + 60);
  const a = t.acts()[0]; ok(a && a.b.ids[0] === 'LX-1003' && a.b.status === 'fixed' && a.b.tpl === 'fixed' && t.acts().length === 1, 'nút trên dòng: hết giờ → gửi đúng 1 lệnh Fixed + mẫu đã sửa');
  ok(t.calls.filter(c => c.b.op === 'list').length >= 2, 'gửi xong tải lại số đếm');
  t.dom.window.close(); }

// ---------- Lỗi mạng: dòng quay lại, có Thử lại, không mất thao tác; đóng tab: gửi ngay bằng keepalive ----------
{ const t = setup(); await tick(20); t.st.fail = true;
  t.key('f'); await tick(UNDO + 60);
  ok(t.main.querySelector('[data-rid="LX-1001"]') && /Retry/.test(t.d.querySelector('.rp-toast').textContent), 'lỗi: dòng quay lại, toast có Thử lại');
  t.st.fail = false; t.d.querySelector('.rp-toast .rp-undo').click(); await tick(UNDO + 60);
  ok(t.acts().filter(c => c.b.status === 'fixed').length === 2, 'Thử lại gửi lại lệnh');
  t.main.querySelector('[data-rid="LX-1002"] [data-do="fix"]').click(); await tick(5);
  const before = t.acts().length; t.w.dispatchEvent(new t.w.Event('pagehide')); await tick(10);
  ok(t.acts().length === before + 1 && t.acts().pop().keepalive, 'đóng tab trong lúc chờ: gửi ngay (keepalive), không mất thao tác');
  t.dom.window.close(); }

// ---------- Trạng thái, cảm ơn, đề xuất, hàng loạt ----------
{ const many = Array.from({ length: 23 }, (_, i) => mk(2000 + i)); const t = setup({ list: many }); await tick(20);
  t.key('t'); await tick(UNDO + 60);
  let a = t.acts().pop(); ok(a.b.tpl === 'thanks' && a.b.status === 'ack', 't: mẫu cảm ơn, phiếu Mới → Đã tiếp nhận');
  t.key('j'); t.key('3'); await tick(UNDO + 60); a = t.acts().pop(); ok(a.b.status === 'prog' && a.b.tpl === 'prog', 'phím 3: Đang xử lý + mẫu');
  t.key('5'); await tick(UNDO + 60); a = t.acts().pop(); ok(a.b.status === 'wontfix' && a.b.tpl == null, 'phím 5: Không sửa');
  const nBefore = t.acts().length; t.key('X'); const nSel = t.main.querySelectorAll('.rp-row.sel').length;
  t.$('#rpBulk [data-b="fix"]').click(); await tick(UNDO + 80);
  const lots = t.acts().slice(nBefore); ok(lots.length === Math.ceil(nSel / 10) && lots.every(x => x.b.ids.length <= 10 && x.b.status === 'fixed'), `hàng loạt ${nSel} dòng: chia lô ≤ 10 (${lots.length} lệnh)`);
  ok(!t.$('.rp-row.sel') && !t.$('#rpBulk .rp-bulk'), 'xong hàng loạt: bỏ chọn');
  t.dom.window.close(); }
{ const t = setup({ list: [mk(1004, { cat: 'idea' })] }); await tick(20);
  ok(!t.main.querySelector('[data-do="fix"]'), 'đề xuất: không có nút Đã sửa trên dòng');
  t.key('f'); await tick(UNDO + 60); ok(!t.acts().length, 'đề xuất: phím f không gửi gì'); t.dom.window.close(); }

// ---------- Bảng chi tiết bên cạnh, mẫu trả lời theo ngôn ngữ người báo, sửa được trước khi gửi ----------
{ const t = setup({ wide: true }); await tick(200);
  const pane = t.$('#rpPane');
  ok(!pane.hidden && /LX-1001/.test(pane.textContent) && pane.getAttribute('role') !== 'dialog' && !t.d.querySelector('.rp-dim'), 'màn rộng: bảng chi tiết mở bên cạnh, không che danh sách');
  t.key('j'); await tick(200); ok(/LX-1002/.test(pane.querySelector('.rp-head').textContent), 'j: bảng theo dòng đang chọn');
  ok(pane.querySelectorAll('[data-tpl]').length === 4, 'đủ 4 mẫu trả lời');
  pane.querySelector('[data-tpl="more"]').click();
  const ta = pane.querySelector('#rpReply');
  ok(ta.value === 'ZH-more', 'chọn mẫu: chữ đúng ngôn ngữ người báo'); ok(/VI-more/.test(pane.querySelector('#rpViHint').textContent), 'người soạn đọc được nghĩa tiếng Việt');
  pane.querySelector('#rpReplyB').click(); await tick(UNDO + 60);
  let a = t.acts().pop(); ok(a.b.tpl === 'more' && a.b.reply == null && a.b.status === 'ack', 'không sửa chữ: gửi theo khóa mẫu + trạng thái đi cùng');
  await tick(200);
  const p2 = t.$('#rpPane'); p2.querySelector('[data-tpl="prog"]').click(); const ta2 = p2.querySelector('#rpReply'); ta2.value = 'Custom edited text'; ta2.dispatchEvent(new t.w.Event('input'));
  p2.querySelector('#rpReplyB').click(); await tick(UNDO + 60);
  a = t.acts().pop(); ok(a.b.reply === 'Custom edited text' && a.b.tpl == null && a.b.status === 'prog', 'đã sửa chữ: gửi đúng chữ anh soạn');
  await tick(200);
  const p3 = t.$('#rpPane'), fx = p3.querySelector('#rpFix'); ok(fx, 'có nút Đánh dấu đã sửa và báo'); fx.click(); await tick(UNDO + 60);
  a = t.acts().pop(); ok(a.b.status === 'fixed', 'nút trong bảng: Fixed');
  t.dom.window.close(); }

// ---------- Nội dung độc từ người dùng không thành HTML ----------
{ const evil = '<img src=x onerror=window.__p=1>'; const t = setup({ list: [mk(1001, { msg: evil, area: evil, lang: evil, ver: evil, plat: evil, asg: evil + '@x' })] }); await tick(30);
  ok(!t.main.querySelector('.rp-row img') && !t.w.__p, 'dòng: dữ liệu người dùng luôn esc()'); t.dom.window.close(); }

// ---------- Chuông thông báo: gộp báo lỗi của máy này, không gọi máy chủ khi đánh dấu đã đọc ----------
{ const dom = new JSDOM('<!doctype html><html><body><button id="notifBtn"></button><span id="notifBadge" hidden></span></body></html>', { url: 'https://lexkite.com/app/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, d = w.document, posts = []; w.t = (s, v) => { let x = { 'Đã sửa xong báo lỗi {id}': 'Report {id} is fixed', 'Đã nhận báo lỗi {id}': 'We received report {id}' }[s] || s; if (v) x = x.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m)); return x; };
  w.fetch = async (u, init) => { if (init && init.method === 'POST') posts.push(init.body); return { ok: true, json: async () => ({ ok: true, notices: [{ id: 'srv1', kind: 'info', title: 'Server notice', body: 'b', at: 5, read: true }] }) }; };
  const T = 'T'.repeat(24); w.localStorage.setItem('lk.rpn', JSON.stringify([{ n: 'rp:TTTTTTTTTT:ack:0', k: 'ack', id: 'LX-1001', t: T, at: 10, r: 1 }, { n: 'rp:TTTTTTTTTT:fixed:20', k: 'fixed', id: 'LX-1001', t: T, at: 20 }, { n: 'bad"><img', k: 'fixed', id: 'LX-1', t: T, at: 30 }, { n: 'rp:x:evil:1', k: 'evil', id: 'LX-1', t: T, at: 31 }]));
  w.eval(rd('web/js/notices.js')); await w.NoticesUI.init({}); await tick(5);
  const badge = d.getElementById('notifBadge'); ok(!badge.hidden && badge.textContent === '1', 'chuông: "đã sửa" chưa đọc tính badge, xác nhận (đã đọc) không tính, mục sai dạng bị bỏ');
  w.NoticesUI.toggle(); await tick(5); const items = [...d.querySelectorAll('.notif-item')];
  ok(items[0].textContent.includes('Report LX-1001 is fixed') && items.some(x => x.textContent.includes('We received report LX-1001')) && items.some(x => x.textContent.includes('Server notice')), 'danh sách: thông báo máy chủ + báo lỗi, mới nhất lên đầu, đúng chữ đã dịch');
  ok(items[0].querySelector('a[href="#/report/' + T + '"]'), 'có nút mở trang trạng thái');
  items[0].click(); await tick(5); ok(badge.hidden && !posts.length, 'đọc xong: hết badge, không gọi máy chủ');
  w.localStorage.setItem('lk.rpn', JSON.stringify([{ n: 'rp:TTTTTTTTTT:upd:40', k: 'upd', id: 'LX-1001', t: T, at: 40 }])); d.dispatchEvent(new w.Event('lk:rpn')); await tick(5);
  ok(!badge.hidden && badge.textContent === '1', 'có cập nhật mới (sự kiện lk:rpn): badge tăng ngay');
  dom.window.close(); }

if (fails) { console.log(`✗ admin-reports-ui: ${fails}/${n} lỗi`); process.exit(1); }
console.log(`✓ admin-reports-ui: ${n} kiểm tra – bố cục gọn đủ tính năng, phím tắt, đã sửa + Hoàn tác, hàng loạt, mẫu trả lời, chuông thông báo`);
process.exit(0);
