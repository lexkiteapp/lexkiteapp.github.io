// Test giao diện Kho Drive (web/js/admin-drive.js) bằng jsdom: lọc Drive + Kết nối lại, cảnh báo, trình duyệt file (lưới/danh sách, ảnh thu nhỏ
// qua proxy, số bản sao, chọn nhiều → thùng rác + Hoàn tác, xem trước, xóa vĩnh viễn cần gõ DELETE), dọn dẹp thông minh (quét → bỏ tích → áp dụng),
// sổ kho (bộ lọc trong địa chỉ #drive/ledger?…, CSV), nhật ký. Chạy: node scripts/test/drive-ui.mjs (không cần mạng – dapi giả lập)
import fs from 'node:fs';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const code = fs.readFileSync(new URL('../../web/js/admin-drive.js', import.meta.url), 'utf8');
const vc = new jsdom.VirtualConsole(); vc.on('jsdomError', e => { if (!/Not implemented: navigation/.test(e.message)) console.error(e); });
const dom = new JSDOM('<!doctype html><html><head></head><body><main id="m"></main></body></html>', { url: 'https://lexkite.com/admin.html#drive', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window, doc = w.document, main = doc.getElementById('m');
w.eval(code);
const A = w.AdminDrive, T = A._t;
const tick = async (k = 6) => { for (let i = 0; i < k; i++) await new Promise(r => setTimeout(r, 0)); };
const G = 1024 ** 3;

// ---------- hàm thuần ----------
const DR = [
  { id: 1, email: 'alpha@gmail.com', status: 'ok', weight: 100, quota_total: 100 * G, quota_used: 50 * G, created: 3, checked: 30, files: 10, bytes: 1e6 },
  { id: 2, email: 'beta@gmail.com', status: 'disconnected', weight: 100, quota_total: 100 * G, quota_used: 10 * G, created: 2, checked: 10, files: 4, bytes: 1e5 },
  { id: 3, email: 'gamma@gmail.com', status: 'ok', weight: 0, quota_total: 100 * G, quota_used: 92 * G, created: 1, checked: 20, files: 1, bytes: 1, auto_paused: true },
  { id: 4, email: 'delta@gmail.com', status: 'draining', weight: 100, quota_total: 100 * G, quota_used: 85 * G, created: 4, checked: 40, files: 1, bytes: 1 },
];
const ids = l => l.map(x => x.id).join();
ok(ids(T.filterDrives(DR, { st: 'live' })) === '3,1', 'lọc live (sắp % giảm dần)');
ok(ids(T.filterDrives(DR, { st: 'die' })) === '2' && ids(T.filterDrives(DR, { st: 'full' })) === '3' && ids(T.filterDrives(DR, { st: 'warn' })) === '4', 'lọc mất kết nối / đầy ≥ 90 / cảnh báo 80–90');
ok(ids(T.filterDrives(DR, { st: 'drain' })) === '4' && ids(T.filterDrives(DR, { st: 'w0' })) === '3', 'lọc đang rút / trọng số 0');
ok(ids(T.filterDrives(DR, { q: 'beta' })) === '2' && ids(T.filterDrives(DR, { q: '4' })) === '4', 'tìm theo email / id');
ok(ids(T.filterDrives(DR, { sort: 'free' })) === '2,1,4,3' && ids(T.filterDrives(DR, { sort: 'created' })) === '4,1,2,3' && ids(T.filterDrives(DR, { sort: 'checked' })) === '2,3,1,4', 'sắp xếp còn trống / ngày kết nối / lần kiểm cũ nhất');
{ const h = T.toHash('ledger', { type: 'image', q: 'a b', x: '' }), p = T.parseHash(h); ok(h === '#drive/ledger?type=image&q=a+b' && p.view === 'ledger' && p.p.q === 'a b', 'bộ lọc ↔ địa chỉ #drive/ledger?…'); }
ok(T.parseHash('#drive').view === 'overview' && T.parseHash('#drive/evil?x=1').view === 'overview', 'mục lạ → tổng quan');

// ---------- dapi giả ----------
const calls = [];
const ITEMS = [
  { id: 'FOLDER_aaaaaaaa', name: 'originals', mime: 'application/vnd.google-apps.folder', kind: 'folder', folder: true, sys: true, size: null },
  { id: 'IMG_aaaaaaaaaaa', name: 'ama.png', mime: 'image/png', kind: 'image', folder: false, size: 2048, modified: '2026-10-01T00:00:00Z', thumb: '/api/drive/thumb?d=1&f=IMG_aaaaaaaaaaa&v=x&x=1&s=sig', web: 'https://drive.google.com/file/d/IMG/view', copies: 1, want: 2, known: true },
  { id: 'VID_aaaaaaaaaaa', name: 'mia.mp4', mime: 'video/mp4', kind: 'video', folder: false, size: 4096, thumb: null, copies: 2, want: 2, known: true },
];
const SCAN = { dry_run: true, count: 3, total: 3000, refs_synced: true, by: { duplicate: { files: 1, bytes: 1000 }, orphan: { files: 1, bytes: 1500 }, old_reject: { files: 0, bytes: 0 }, temp: { files: 0, bytes: 0 }, partial: { files: 0, bytes: 0 }, trashed: { files: 1, bytes: 500 } },
  groups: { duplicate: [{ id: 'DUP_aaaaaaaaaaa', name: 'a (1).png', path: 'originals', size: 1000, reason: 'dup-keep-referenced', keep: { id: 'IMG_aaaaaaaaaaa', name: 'ama.png', path: 'originals' } }], orphan: [{ id: 'ORP_aaaaaaaaaaa', name: 'lost.webp', path: 'originals', size: 1500, reason: 'orphan-unknown' }], old_reject: [], temp: [], partial: [], trashed: [{ id: 'TR_aaaaaaaaaaaa', name: 'old.png', size: 500, reason: 'in-trash' }] } };
const INV = { drive_id: 1, summary: { published: { files: 1, bytes: 9000 }, draft: { files: 2, bytes: 200 }, junk: { files: 1, bytes: 300 }, stale: { files: 1, bytes: 400 }, active: { files: 1, bytes: 500 } }, scheduled: 1, plan: {}, more: 0, signals_ok: true, truncated: false, cfg: { on: true, stale_on: false, stale_days: 90, every_days: 7 }, last: { at: 1, trashed: 2, bytes: 10, undo: ['JUNK_aaaaaaaaaa'] }, items: [
  { id: 'PUB_aaaaaaaaaaa', name: 'pub.mp4', path: 'shorts/a', size: 9000, mime: 'video/mp4', modified: '2026-10-01T00:00:00Z', state: 'published', lock: 'published', clean: null, posts: [{ p: 'youtube', u: 'https://youtu.be/x', t: 1 }, { p: 'tiktok', u: 'javascript:alert(1)', t: 2 }] },
  { id: 'SCH_aaaaaaaaaaa', name: 'sched.mp4', path: 'shorts/a', size: 100, mime: 'video/mp4', state: 'draft', lock: 'scheduled', clean: null, scheduled: 1893456000000 },
  { id: 'DRF_aaaaaaaaaaa', name: 'draft.mp4', path: 'shorts/a', size: 100, mime: 'video/mp4', state: 'draft', lock: 'clip', clean: null },
  { id: 'JUNK_aaaaaaaaaa', name: 'x<b>.tmp', path: 'tmp', size: 300, mime: 'text/plain', state: 'junk', lock: null, clean: 'junk', reason: 'temp-older' },
  { id: 'STL_aaaaaaaaaaa', name: 'lost.webm', path: 'misc', size: 400, mime: 'video/webm', state: 'stale', lock: null, clean: 'stale', reason: 'orphan-unreferenced' },
  { id: 'ACT_aaaaaaaaaaa', name: 'foot.mp4', path: 'footage', size: 500, mime: 'video/mp4', state: 'active', lock: 'footage', clean: null }] };
const dapi = async (op, b = {}) => {
  calls.push({ op, b });
  if (op === 'list') return { drives: DR, total: 400 * G, used: 237 * G, free: 163 * G, configured: { client: true, secret: true, key: true, cli: true }, alerts: [{ kind: 'conn:2', level: 'crit', t: 'conn', p: { email: 'beta@gmail.com' } }, { kind: 'quota:4', level: 'warn', t: 'quota', p: { email: 'delta@gmail.com', pct: 85 } }] };
  if (op === 'browse') return b.trash ? { items: [{ id: 'TR_aaaaaaaaaaaa', name: 'old.png', mime: 'image/png', kind: 'image', size: 500, trashed: true }], crumbs: [], next: null } : { root: 'ROOT', folder: { id: 'ROOT' }, crumbs: [{ id: 'ROOT', name: 'Lexkite Library' }], items: ITEMS, next: null };
  if (op === 'preview') return { url: '/api/drive/dl?f=' + b.file_id + '&x=1&s=z', kind: 'image', size: 2048 };
  if (op === 'trash' || op === 'restore' || op === 'cleanup_apply') return { ok: true, done: b.file_ids, failed: [], undo: b.file_ids };
  if (op === 'delete') return { ok: true, done: b.file_ids, failed: [], bytes: 500 };
  if (op === 'cleanup_scan') return SCAN;
  if (op === 'inventory') return INV;
  if (op === 'tidy_cfg') return { ok: true, cfg: { ...INV.cfg, ...b.set } };
  if (op === 'tidy_run') return { ok: true, trashed: 2, remaining: 0 };
  if (op === 'ledger') return b.format === 'csv' ? { csv: 'file,asset\r\n', count: 1 } : { rows: [{ drive_id: 1, email: 'alpha@gmail.com', file_id: 'IMG_aaaaaaaaaaa', sha256: 'ab', name: 'ama.png', folder: 'originals', size: 2048, status: 'ok', copies: 1, want: 2, lib: 'approved', at: 1, web: 'https://drive.google.com/x' }], total: 1, bytes: 2048 };
  if (op === 'audit_list') return { rows: [{ id: 1, at: 1, who: 'boss@lexkite.com', act: 'trash', name: 'ama.png', email: 'alpha@gmail.com', size: 10, ok: 1 }], next: null };
  if (op === 'connect') return { url: 'https://accounts.google.com/x' };
  if (op === 'where') return { copies: [{ drive_id: 1, email: 'alpha@gmail.com', file_id: 'IMG_aaaaaaaaaaa', name: 'ama.png', folder: 'originals', size: 1, status: 'ok', copies: 1, want: 2 }] };
  return {};
};
const L = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m)) : s);
const H = { esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), lang: () => 'vi' };
const go = async hash => { w.history.replaceState(null, '', '/admin.html' + hash); A.render(main, dapi, L, H); await tick(10); };
let confirmAns = true, promptAns = null; w.confirm = () => confirmAns; w.prompt = () => promptAns; w.alert = () => {};
const last = op => calls.filter(c => c.op === op).pop();

// ---------- Tổng quan ----------
await go('#drive');
ok(main.querySelectorAll('.drv-card').length === 4, '4 thẻ Drive');
ok(main.querySelector('.drv-al.crit') && /mất kết nối/.test(main.querySelector('.drv-al.crit').textContent) && main.querySelector('.drv-al.crit').getAttribute('role') === 'alert', 'cảnh báo nghiêm trọng hiện đầu trang');
await go('#drive?ds=die');
ok(main.querySelectorAll('.drv-card').length === 1 && main.querySelector('[data-act="reconnect"]'), 'bộ lọc trong địa chỉ: chỉ Drive mất kết nối + nút Kết nối lại');
main.querySelector('[data-act="reconnect"]').click(); await tick();
ok(last('connect') && last('connect').b.reconnect_id === 2, 'Kết nối lại gửi reconnect_id (giữ id cũ)');
await go('#drive');
main.querySelector('[data-ds="full"]').click(); await tick();
ok(w.location.hash === '#drive?ds=full' && main.querySelectorAll('.drv-card').length === 1, 'bấm chip lọc → cập nhật địa chỉ + danh sách');
main.querySelector('#drvWhereQ').value = 'ama'; main.querySelector('#drvWhereF').dispatchEvent(new w.Event('submit', { cancelable: true })); await tick();
ok(last('where').b.q === 'ama' && /alpha@gmail\.com/.test(main.querySelector('#drvWhere').textContent), 'tra cứu vị trí → bảng bản sao kèm email Drive');

// ---------- Duyệt file ----------
await go('#drive/browse?d=1');
ok(main.querySelectorAll('.drv-tab').length === 3, 'tab mỗi Drive đang kết nối (bỏ Drive mất kết nối)');
ok(main.querySelector('.drv-tab.on .fill') && main.querySelector('.drv-grid'), 'thanh dung lượng + lưới');
const img = main.querySelector('.drv-it img');
ok(img && img.getAttribute('src').startsWith('/api/drive/thumb?') && !main.innerHTML.includes('googleusercontent'), 'ảnh thu nhỏ qua proxy ký (không lộ thumbnailLink)');
ok(/1 bản/.test(main.querySelector('.drv-it[data-i="1"] .drv-rep').textContent) && main.querySelector('.drv-it[data-i="1"] .drv-rep').classList.contains('bad'), 'cảnh báo "1 bản" khi thiếu bản sao');
ok(!main.querySelector('.drv-it[data-i="0"] input[type=checkbox]'), 'thư mục hệ thống không chọn được');
ok(main.querySelector('#bCrumbs').textContent.includes('Lexkite Library'), 'đường dẫn (breadcrumbs)');
main.querySelector('#bMode').click(); ok(main.querySelector('.drv-list') && !main.querySelector('.drv-grid'), 'đổi sang danh sách');
main.querySelector('#bMode').click();
main.querySelector('.drv-it[data-i="1"] input[type=checkbox]').click();
main.querySelector('.drv-it[data-i="2"] input[type=checkbox]').click();
ok(!doc.querySelector('.drv-modal'), 'tích ô chọn không mở xem trước');
ok(/Đã chọn/.test(main.querySelector('.drv-sel').textContent), 'chọn nhiều → thanh thao tác');
main.querySelector('.drv-sel [data-a="trash"]').click(); await tick();
ok(last('trash') && last('trash').b.file_ids.length >= 1 && doc.querySelector('.drv-toast [data-undo]'), 'vứt vào thùng rác → thông báo có Hoàn tác');
doc.querySelector('.drv-toast [data-undo]').click(); await tick();
ok(last('restore') && last('restore').b.file_ids.join() === last('trash').b.file_ids.join(), 'Hoàn tác = restore đúng các file');
await go('#drive/browse?d=1');
main.querySelector('.drv-it[data-i="1"] .nm').dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await tick();
const mdl = doc.querySelector('.drv-modal');
ok(mdl && mdl.querySelector('img').getAttribute('src').startsWith('/api/drive/dl?') && mdl.querySelector('a[href^="https://drive.google.com"]'), 'xem trước ảnh qua link tải ký + mở trong Google Drive');
doc.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' })); w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' }));
ok(!doc.querySelector('.drv-modal'), 'Esc đóng xem trước');
main.querySelector('.drv-it[data-i="1"] [data-kb]').dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await tick();
const menu = doc.querySelector('.drv-menu');
ok(menu && ['web', 'download', 'rename', 'move', 'trash'].every(k => menu.querySelector(`[data-m="${k}"]`)), 'menu ⋮: mở Google Drive, tải, đổi tên, chuyển, vứt');
promptAns = 'moi.png'; menu.querySelector('[data-m="rename"]').click(); await tick();
ok(last('rename') && last('rename').b.name === 'moi.png', 'đổi tên');
main.querySelector('.drv-it[data-i="2"]').dispatchEvent(new w.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 })); await tick();
ok(doc.querySelector('.drv-menu'), 'chuột phải mở menu'); doc.querySelectorAll('.drv-menu').forEach(m => m.remove());
// thùng rác: xóa vĩnh viễn cần gõ DELETE
await go('#drive/browse?d=1&trash=1');
ok(main.querySelector('#bTrash').getAttribute('aria-pressed') === 'true' && main.querySelector('[data-empty]'), 'chế độ thùng rác + nút dọn sạch');
main.querySelector('.drv-it input[type=checkbox]').click();
const nDel = calls.filter(c => c.op === 'delete').length;
promptAns = 'delete'; main.querySelector('.drv-sel [data-a="delete"]').click(); await tick();
ok(calls.filter(c => c.op === 'delete').length === nDel, 'gõ sai "DELETE" → không xóa');
promptAns = 'DELETE'; main.querySelector('.drv-sel [data-a="delete"]').click(); await tick();
ok(last('delete') && last('delete').b.confirm === 'DELETE', 'gõ đúng DELETE → gửi confirm');

// ---------- Dọn dẹp thông minh ----------
await go('#drive/browse?d=1');
main.querySelector('#bClean').click(); await tick();
main.querySelector('[data-o="reject_days"]').value = '45';
main.querySelector('[data-scan]').click(); await tick();
ok(last('cleanup_scan').b.reject_days === 45, 'ngưỡng ngày gửi lên máy quét');
ok(main.querySelectorAll('.drv-grp').length === 3 && main.querySelectorAll('input[data-id]').length === 2, 'nhóm ứng viên; mục thùng rác chỉ xem (không tích)');
ok(/Đã chọn 2 · thu hồi 2 KB/.test(main.querySelector('[data-sum]').textContent), 'tổng thu hồi theo mục đã tích');
const orp = main.querySelector('input[data-id="ORP_aaaaaaaaaaa"]'); orp.checked = false; orp.dispatchEvent(new w.Event('change'));
ok(/Đã chọn 1 · thu hồi 1000 B/.test(main.querySelector('[data-sum]').textContent), 'bỏ tích → tổng giảm');
confirmAns = true; main.querySelector('[data-apply]').click(); await tick();
ok(last('cleanup_apply') && last('cleanup_apply').b.file_ids.join() === 'DUP_aaaaaaaaaaa', 'áp dụng chỉ các mục còn tích');
ok(doc.querySelector('.drv-toast [data-undo]'), 'thông báo kết quả có Hoàn tác');
doc.querySelector('.drv-toast [data-undo]').click(); await tick();
ok(last('restore').b.file_ids.join() === 'DUP_aaaaaaaaaaa', 'Hoàn tác dọn dẹp = restore');

// ---------- Sổ kho ----------
await go('#drive/ledger?type=image&copies=1');
ok(last('ledger').b.f.type === 'image' && last('ledger').b.f.copies === '1' && last('ledger').b.f.limit === 50, 'bộ lọc từ địa chỉ gửi lên máy chủ (phân trang 50)');
ok(main.querySelector('[data-k="type"]').value === 'image' && /alpha@gmail\.com/.test(main.querySelector('#lRows').textContent), 'bảng sổ kho + ô lọc khớp địa chỉ');
const sel = main.querySelector('[data-k="lib"]'); sel.value = 'reject'; sel.dispatchEvent(new w.Event('change')); await tick();
ok(last('ledger').b.f.lib === 'reject' && /lib=reject/.test(w.location.hash) && /type=image/.test(w.location.hash), 'đổi bộ lọc → lưu vào địa chỉ');
w.URL.createObjectURL = () => 'blob:x';
main.querySelector('#lCsv').click(); await tick();
ok(last('ledger').b.format === 'csv' && last('ledger').b.f.lib === 'reject' && last('ledger').b.f.limit === undefined, 'xuất CSV theo bộ lọc hiện tại (toàn bộ)');

// ---------- Nhật ký ----------
await go('#drive/audit');
ok(/boss@lexkite\.com/.test(main.textContent) && last('audit_list'), 'nhật ký thao tác');
const as = main.querySelector('#aAct'); as.value = 'trash'; as.dispatchEvent(new w.Event('change')); await tick();
ok(last('audit_list').b.act === 'trash' && /act=trash/.test(w.location.hash), 'lọc nhật ký theo thao tác');
// tiếng Anh
await go('#drive'); H.lang = () => 'en'; A.render(main, dapi, L, H); await tick(10);
ok(/Private Drive storage/.test(main.textContent) && /Reconnect|Disconnected/.test(main.textContent), 'giao diện tiếng Anh');

{ // 27/10: máy chủ chậm/treo → không kẹt "Loading…": báo rõ + nút Thử lại tải lại được
  let k = 0; const slow = async (op, b) => { if (op === 'list' && k++ === 0) { const e = new Error('timeout'); e.code = 'timeout'; throw e; } return dapi(op, b); };
  w.history.replaceState(null, '', '/admin.html#drive'); A.render(main, slow, L, H); await tick(10);
  const rb = main.querySelector('[data-retry]');
  ok(rb && /took too long/.test(main.textContent) && !/Loading/.test(main.textContent), 'list quá hạn → báo "server took too long" + nút Thử lại (không kẹt Loading): ' + main.textContent.trim().slice(0, 90));
  rb && rb.click(); await tick(10);
  ok(/Private Drive storage/.test(main.textContent) && !main.querySelector('[data-retry]'), 'bấm Thử lại → tải lại và vẽ Kho Drive');
}

// --- Kho video + Dọn kho
H.lang = () => 'vi'; await go('#drive/stock'); await tick(12);
{ const chips = () => [...main.querySelectorAll('[data-st]')], rows = () => [...main.querySelectorAll('.stk-rw')].map(r => r.dataset.id), q = s => main.querySelector(s);
  ok(last('inventory') && chips().length === 6 && /Đã đăng/.test(chips()[1].textContent) && /1 file/.test(chips()[1].textContent), 'chip nhóm có số + dung lượng');
  ok(rows().length === 6 && rows()[0] === 'PUB_aaaaaaaaaaa', 'mặc định: tất cả, lớn trước');
  ok(q('.stk-posts a').href === 'https://youtu.be/x' && q('.stk-posts a').rel.includes('noopener') && main.querySelectorAll('.stk-posts a').length === 1, 'link bài đăng; link không https bị bỏ');
  ok(q('[data-id="JUNK_aaaaaaaaaa"] b').textContent === 'x<b>.tmp', 'tên file được thoát HTML');
  chips()[2].click(); await tick(); ok(rows().join() === 'SCH_aaaaaaaaaaa,DRF_aaaaaaaaaaa' && /Lên lịch/.test(q('.stk-rw').textContent) && /#drive\/stock\?.*st=draft/.test(w.location.hash), 'chip Nháp: phân biệt đã/chưa lên lịch, giữ trong địa chỉ');
  chips()[0].click(); await tick(); q('#sVid').checked = true; q('#sVid').onchange(); await tick(); ok(!rows().includes('JUNK_aaaaaaaaaa'), 'lọc chỉ video');
  q('#sVid').checked = false; q('#sVid').onchange(); await tick(); q('#sSort').value = 'name'; q('#sSort').onchange(); await tick(); ok(rows()[0] === 'DRF_aaaaaaaaaaa', 'sắp xếp tên');
  q('#sQ').value = 'lost'; q('#sQ').oninput(); await new Promise(r => setTimeout(r, 300)); await tick(); ok(rows().join() === 'STL_aaaaaaaaaaa', 'tìm theo tên');
  q('#sQ').value = ''; q('#sQ').oninput(); await new Promise(r => setTimeout(r, 300)); await tick();
  calls.length = 0; q('[data-clean]').click(); await tick();
  const m = doc.querySelector('.drv-modal'), idsIn = () => [...m.querySelectorAll('input[data-id]')].map(i => i.dataset.id);
  ok(idsIn().sort().join() === 'JUNK_aaaaaaaaaa,STL_aaaaaaaaaaa', 'Dọn kho: chỉ file được dọn – không đã đăng/lên lịch/nháp/footage');
  ok(!calls.some(c => c.op === 'cleanup_apply' || c.op === 'trash'), 'xem trước không gọi thao tác ghi');
  ok(m.querySelector('input[data-id="JUNK_aaaaaaaaaa"]').checked && !m.querySelector('input[data-id="STL_aaaaaaaaaaa"]').checked, 'Rác tích sẵn, Lâu không dùng phải tự chọn');
  ok(/1 file/.test(m.querySelector('[data-sum]').textContent) && /300 B/.test(m.querySelector('[data-sum]').textContent), 'tổng dung lượng lấy lại');
  m.querySelector('[data-apply]').click(); await tick(12);
  ok(last('cleanup_apply').b.file_ids.join() === 'JUNK_aaaaaaaaaa', 'áp dụng đúng file đã chọn');
  const un = doc.querySelector('.drv-toast [data-undo]'); ok(!!un, 'có nút Hoàn tác'); un.click(); await tick(12); ok(last('restore').b.file_ids.join() === 'JUNK_aaaaaaaaaa', 'Hoàn tác = restore');
  await tick(12);
  const a = s => main.querySelector('.stk-auto ' + s);
  ok(a('#tOn').checked && !a('#tStale').checked, 'công tắc tự dọn: Lâu không dùng mặc định tắt');
  a('#tStale').checked = true; a('#tDays').value = '120'; a('[data-save]').click(); await tick(12); ok(last('tidy_cfg').b.set.stale_on === true && last('tidy_cfg').b.set.stale_days === 120, 'lưu công tắc + số ngày');
  await tick(12); main.querySelector('.stk-auto [data-run]').click(); await tick(12); ok(last('tidy_run').b.drive_id === 1, 'nút Chạy ngay');
  await tick(12); main.querySelector('.stk-auto [data-undo]').click(); await tick(12); ok(last('restore').b.file_ids.join() === 'JUNK_aaaaaaaaaa', 'Hoàn tác lần tự dọn');
  const css = doc.getElementById('drvCss').textContent; ok(/\.stk-act \.btn[^{]*\{min-height:44px/.test(css) && /stk-tabs \.chip-f\{min-height:44px/.test(css), 'nút/chip ≥ 44 px');
}

if (fails) { console.log(`✗ drive-ui: ${fails}/${n} kiểm thất bại`); process.exit(1); }
console.log(`✓ drive-ui: ${n} kiểm (lọc Drive, Kết nối lại, trình duyệt file, thùng rác, dọn dẹp + Hoàn tác, sổ kho, nhật ký)`);
