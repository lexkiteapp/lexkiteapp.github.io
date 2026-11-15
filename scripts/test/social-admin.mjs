// Test bảng điều khiển Autopilot ở Quản trị #social (web/js/admin-social-mgr.js + op lk/auto/preview, lk/auto/channels/sync trong functions/api/_social_auto.js):
// bảng Kênh (đã nối/chưa nối, ngôn ngữ trang, sức khỏe, Kết nối = popup grabcast.click + tự làm mới khi đóng/quay lại, YouTube qua GrabCast / thủ công / API dự phòng),
// xem trước từng nền tảng (0 lượt GrabCast), duyệt bài đầu, Tạm dừng toàn bộ (hỏi trước), Nhật ký lỗi (mới nhất trước, lý do đã dịch), mobile (bảng → thẻ, chạm ≥ 44px),
// không còn mã màu hex cứng, đủ tiếng Anh. Chạy: node scripts/test/social-admin.mjs (không mạng, D1 sqlite, jsdom)
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const flush = async (k = 20) => { for (let i = 0; i < k; i++) await new Promise(res => setTimeout(res, 0)); };
const VI = /[ăđơư]|[ạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;

const sql = new DatabaseSync(':memory:');
const DB = { prepare(q) { const st = { q, args: [], bind(...a) { return { ...st, args: a }; },
  async run() { if (/^\s*(SELECT|WITH)/i.test(q)) return { results: sql.prepare(q).all(...this.args) }; const i = sql.prepare(q).run(...this.args); return { results: [], meta: { changes: Number(i.changes) } }; },
  async all() { return /^\s*(SELECT|WITH)/i.test(q) ? { results: sql.prepare(q).all(...this.args) } : (sql.prepare(q).run(...this.args), { results: [] }); },
  async first() { return sql.prepare(q).get(...this.args) || null; } }; return st; },
  async batch(list) { const out = []; for (const x of list) out.push(await x.run()); return out; } };

const A = await import('../../functions/api/_social_auto.js'), MGR = await import('../../functions/api/_social_mgr.js'), DIST = await import('../../functions/api/distribution.js');
const DATA = (await import('../../functions/api/_shorts_data.js')).default, CLIP = DATA.index.items.find(it => it && it.id && !it.rejected).id;

// ---------- 1) Máy chủ: xem trước + đồng bộ kênh ----------
{
  await MGR.setupMgr(DB); await DIST.setupDist(DB);
  const ENV = { DB, GRABCAST_API_KEY: 'gk_test_' + 'k'.repeat(20) };
  let net = 0; const realFetch = globalThis.fetch; globalThis.fetch = async () => { net++; throw new Error('không được gọi mạng'); };
  const pv = await A.autoOpFor('POST', 'lk/auto/preview')({ env: ENV, db: DB, b: { clip: CLIP } });
  ok(net === 0 && pv.posted === 0 && pv.grabcast_calls === 0, 'preview: 0 lượt mạng/GrabCast, không đăng');
  ok(pv.preview.clip === CLIP && pv.preview.posts.length === 5 && pv.preview.posts.every(x => x.caption_len <= x.caption_max && x.caption_max > 0), 'preview: 5 nền tảng, đếm ký tự caption len/max');
  ok(pv.preview.posts.every(x => x.channel_id === null && x.why === 'chưa nối kênh'), 'preview chưa nối kênh: lý do rõ, không có trang đích');
  const st = sql.prepare('SELECT COUNT(*) AS n FROM soc_board').get().n + sql.prepare('SELECT COUNT(*) AS n FROM dist_social').get().n;
  ok(st === 0, 'preview: không ghi D1');
  let e1 = null; try { await A.autoOpFor('POST', 'lk/auto/preview')({ env: ENV, db: DB, b: { clip: '../x y' } }); } catch (e) { e1 = e; }
  let e2 = null; try { await A.autoOpFor('POST', 'lk/auto/preview')({ env: ENV, db: DB, b: { clip: 'khong-co-clip-nay' } }); } catch (e) { e2 = e; }
  ok(e1 && e1.status === 400 && e1.code === 'bad-clip' && e2 && e2.status === 404 && e2.code === 'clip-not-found', 'preview: id xấu → 400, không có → 404');

  const calls = []; let accs = [{ id: 11, platform: 'facebook', display_name: 'Lexkite' }, { id: 12, platform: 'facebook', display_name: 'Lexkite Español' }, { id: 13, platform: 'instagram', username: 'lexkite.vi', display_name: 'Lexkite Tiếng Việt' }, { id: 14, platform: 'tiktok', display_name: 'Lexkite 日本語', needs_reconnect: true }];
  const gc = async (m, p) => { calls.push(m + ' ' + p); return p === 'accounts' ? { status: 200, data: { accounts: accs } } : { status: 404 }; };
  const r = await A.autoOpFor('POST', 'lk/auto/channels/sync')({ env: ENV, db: DB, b: {}, gc });
  const by = Object.fromEntries(r.channels.map(c => [c.channel_id, c]));
  ok(calls.join() === 'GET accounts' && r.n === 4, 'đồng bộ kênh: đúng 1 lượt GET accounts (API GrabCast có sẵn), không tạo/đăng bài');
  ok(by['gc-facebook_page-11'].lang === 'en' && by['gc-facebook_page-11'].lang_src === 'default' && by['gc-facebook_page-12'].lang === 'es' && by['gc-facebook_page-12'].lang_src === 'name' && by['gc-instagram-13'].lang === 'vi' && by['gc-tiktok-14'].lang === 'ja', 'ngôn ngữ trang nhận từ tên (bộ 16 fanpage), không nhận ra = trang chung EN');
  ok(by['gc-tiktok-14'].status === 'error' && by['gc-facebook_page-11'].status === 'ok', 'kênh cần kết nối lại → status error');
  sql.exec("DELETE FROM soc_meta WHERE k = 'ch_sync'"); // hết khoảng giãn 5 phút của lượt đồng bộ trên: lượt này phải gọi GrabCast thật
  let e3 = null; try { await A.autoOpFor('POST', 'lk/auto/channels/sync')({ env: ENV, db: DB, b: {}, gc: async () => ({ status: 503, code: 'down' }) }); } catch (e) { e3 = e; }
  ok(e3 && e3.status === 503 && sql.prepare("SELECT COUNT(*) AS n FROM dist_ext WHERE status = 'gone'").get().n === 0, 'GrabCast lỗi → báo lỗi, KHÔNG đánh dấu mọi kênh đã gỡ');
  let e4 = null; try { await A.autoOpFor('POST', 'lk/auto/channels/sync')({ env: { DB }, db: DB, b: {}, gc }); } catch (e) { e4 = e; }
  ok(e4 && e4.status === 412 && e4.code === 'no-key', 'chưa có khóa GrabCast → 412');
  const ast = await A.autoStatus(ENV);
  ok(Array.isArray(ast.channels) && ast.channels.length === 4 && ast.channels.some(c => c.lang === 'es') && Array.isArray(ast.yt_direct), 'autoStatus: kèm kênh + ngôn ngữ cho bảng Kênh, kênh YouTube API dự phòng');
  globalThis.fetch = realFetch;
  const so = fs.readFileSync(new URL('../../functions/api/social.js', import.meta.url), 'utf8');
  ok(/auto\\\/channels\\\/sync/.test(so), 'đồng bộ kênh nằm trong giới hạn tốc độ lkpush (12/phút)');
}

// ---------- 2) Giao diện (jsdom) ----------
const code = fs.readFileSync(new URL('../../web/js/admin-social-mgr.js', import.meta.url), 'utf8');
{
  ok(!/#(?:[0-9a-fA-F]{3}){1,2}\b/.test(code.replace(/#social\/board\//g, '')), 'admin-social-mgr.js: không còn mã màu hex cứng (dùng biến CSS admin – tự đúng sáng/tối)');
  ok(/@media \(prefers-color-scheme:dark\)/.test(code) && /:root\[data-theme="dark"\]/.test(code), 'có xử lý chế độ tối theo hệ thống + theme admin');
  const m640 = (/@media \(max-width:640px\)\{([\s\S]*?)`;/.exec(code) || [])[1] || '';
  ok(/min-height:44px/.test(m640) && /\.smg-tc thead\{display:none\}/.test(m640) && /\.smg-chs\{grid-template-columns:1fr\}/.test(m640), 'mobile ≤ 640px: thẻ xếp chồng, bảng → thẻ, chạm ≥ 44px');
  ok(!/\bCSS\.escape\b/.test(code) || !/const CSS = /.test(code), 'không còn hằng CSS che window.CSS (CSS.escape ở deep link duyệt bài từng lỗi)');
  const as = fs.readFileSync(new URL('../../web/js/admin-social.js', import.meta.url), 'utf8');
  ok(/const TABS = \[\['queue', '🛰️ Autopilot & kênh'\]/.test(as) && /goBoard: id => \{ focusId = id; go\('board'\); \}/.test(as) && /yapi: h\.yapi/.test(as), 'admin-social.js: tab Autopilot & kênh đứng đầu, goBoard + yapi cho bảng Kênh');
}

const jsdom = (await import('jsdom')).default, now = Date.now(), H = 36e5;
const AS = () => ({ cfg: A.cleanAuto({}), key: true, webhook: true, manual: { facebook_page: 0, instagram: 1 }, budget_left: 50, now,
  state: { last_run: { at: now - H, due: 3, created: 0, scheduled: 0, review: 1, skipped: [{ clip: 'c1', ch: 'gc-tiktok-14', why: 'account-gone' }, { clip: 'c2', ch: 'gc-tiktok-14', why: 'account-gone' }, { clip: 'c3', ch: 'gc-facebook_page-11', why: 'create-500' }, { clip: 'c4', ch: 'x', why: 'reconnect' }] },
    log: [{ k: 'post-failed:a', text: 'cũ nhất', at: now - 5 * H }, { k: 'gave-up:b', text: 'mới nhất', at: now - H }, { k: 'no-channels', text: 'giữa', at: now - 3 * H }] },
  channels: [{ channel_id: 'gc-facebook_page-11', platform: 'facebook_page', account_id: '11', title: 'Lexkite', status: 'ok', lang: 'en', lang_src: 'default' }, { channel_id: 'gc-facebook_page-12', platform: 'facebook_page', account_id: '12', title: 'Lexkite Español', status: 'ok', lang: 'es', lang_src: 'name' }, { channel_id: 'gc-instagram-13', platform: 'instagram', account_id: '13', title: 'Lexkite IG', status: 'error', lang: 'en', lang_src: 'name' }],
  yt_via_gc: false, yt_gc_channels: [], yt_direct: [],
  meta: { tokens: [{ channel_id: 'gc-facebook_page-11', platform: 'facebook_page', kind: 'fb', status: 'ok', expires_at: null }] },
  upcoming: [{ clip: CLIP, channel_id: 'gc-facebook_page-11', platform: 'facebook_page', slot_ms: now + H, state: 'pushed', board: 'review', board_id: 'b_first123', channel: 'Lexkite' }] });
const PV = { clip: CLIP, lang: 'en', posts: ['facebook_page', 'instagram', 'tiktok', 'youtube', 'threads'].map(p => ({ platform: p, channel_id: p === 'facebook_page' ? 'gc-facebook_page-11' : null, why: p === 'facebook_page' ? '' : 'chưa nối kênh', title: p === 'youtube' ? 'Tiêu đề YT' : '', caption: 'Cap ' + p + ' #esl', caption_len: p === 'threads' ? 520 : 40, caption_max: p === 'threads' ? 500 : 2200, hashtags: ['#esl'], cover: 'không có ảnh bìa', issues: p === 'instagram' ? ['error:hashtag-cut'] : [], body: {} })) };

async function mk({ lang = 'vi', st = AS(), open = 'win', D = { accounts: [{ id: 99, platform: 'tiktok', display_name: 'Lexkite TT new' }] } } = {}) {
  const dom = new jsdom.JSDOM('<!doctype html><html><head></head><body><main id="m"></main></body></html>', { url: 'https://lexkite.com/admin.html#social/queue', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, calls = [], T = { st, conf: () => true, opened: [], popup: { closed: false, close() { this.closed = true; } }, board: [], yapi: [], reloadAcc: 0 };
  w.eval(code); w.HTMLElement.prototype.scrollIntoView = () => {}; w.confirm = m => { T.lastConfirm = m; return T.conf(m); };
  w.open = (...a) => { T.opened.push(a); return open === 'blocked' ? null : T.popup; };
  const sapi = async (m, p, b) => {
    calls.push([p, b]);
    if (p === 'lk/auto') return JSON.parse(JSON.stringify(T.st));
    if (p === 'lk/health') return { accounts: [{ id: 12, platform: 'facebook_page', flags: ['limit'], name: 'Lexkite Español' }] };
    if (p === 'lk/auto/preview') return { preview: JSON.parse(JSON.stringify(PV)), posted: 0, grabcast_calls: 0 };
    if (p === 'lk/auto/pause_all') { T.st.cfg.on = false; return { ok: true, on: false, unscheduled: 3, left: 2, errors: [{ post_id: 'p9', status: 409, code: 'conflict' }] }; }
    if (p === 'lk/auto/save') { Object.assign(T.st.cfg, b.cfg); return { cfg: T.st.cfg }; }
    if (p === 'lk/auto/channels/sync') { T.st.channels.push({ channel_id: 'gc-tiktok-99', platform: 'tiktok', account_id: '99', title: 'Lexkite 日本語', status: 'ok', lang: 'ja', lang_src: 'name' }); return { n: 4, channels: T.st.channels }; }
    if (p === 'lk/rules') return { rules: MGR.cleanRules({}) };
    return {};
  };
  const ctx = { sapi, L: (s, v) => (v ? s.replace(/\{(\w+)\}/g, (x, k) => (v[k] != null ? v[k] : x)) : s), esc: s => String(s ?? '').replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';'), lang: () => lang, D,
    errText: e => String((e && e.message) || e), accById: () => null, modal: () => ({}), both: x => String(x), alive: () => true, LS: { get: (k, d) => d, set() {} },
    goBoard: id => T.board.push(id), yapi: async op => { T.yapi.push(op); return { url: 'https://example.invalid/không-chuyển-trang-trong-test' }; }, reloadAccounts: async () => { T.reloadAcc++; } };
  const main = w.document.getElementById('m'); w.AdminSocialMgr.paint('queue', main, ctx); await flush(30);
  return { w, main, calls, T, ctx, $: q => main.querySelector(q) };
}

// 2a) Bảng Kênh
{
  const U = await mk(), ch = U.$('#smgCh'), card = p => ch.querySelector(`.smg-pc[data-plat="${p}"]`);
  ok(ch && U.main.firstElementChild === ch && ch.nextElementSibling.id === 'smgAP', 'bảng Kênh ở đầu tab Autopilot, trên thẻ autopilot');
  ok(ch.querySelectorAll('.smg-pc').length === 5 && ['facebook_page', 'instagram', 'tiktok', 'threads', 'youtube'].every(p => card(p)), 'mỗi nền tảng 1 thẻ: Facebook Page, Instagram, TikTok, Threads, YouTube');
  ok(/Đã nối 2/.test(card('facebook_page').textContent) && /Chưa kết nối/.test(card('threads').textContent), 'đếm trang đã nối / chưa kết nối');
  ok(/EN · English \?/.test(card('facebook_page').textContent) && /ES · Español/.test(card('facebook_page').textContent), 'ngôn ngữ từng trang (EN mặc định có dấu ?, ES nhận từ tên)');
  ok(/Hết lượt 24 giờ/.test(card('facebook_page').querySelector('[data-ch="gc-facebook_page-12"]').textContent) && /Cần kết nối lại/.test(card('instagram').textContent), 'sức khỏe: hết lượt (lk/health), cần kết nối lại (D1)');
  ok(/Token Meta không hết hạn/.test(card('facebook_page').textContent), 'token Meta: hạn dùng khi biết');
  ok(/Lexkite TT new/.test(card('tiktok').textContent) && /chưa đồng bộ/.test(card('tiktok').textContent), 'tài khoản admin đã tải nhưng chưa có trong dist_ext → hiện “chưa đồng bộ”');
  // duyệt bài đầu
  const fb = card('facebook_page').querySelector('.smg-first');
  ok(fb && /Chờ anh duyệt bài đầu/.test(fb.textContent) && /0\/1/.test(fb.textContent) && !card('instagram').querySelector('.smg-first'), 'huy hiệu “Chờ anh duyệt bài đầu” khi số bài duyệt tay < manual_first (IG đủ 1/1 → không)');
  fb.querySelector('[data-gob]').click(); ok(U.T.board[0] === 'b_first123', 'nút Duyệt bài đầu → mở đúng bài ở tab Duyệt bài');
  const row = U.$('#smgAP tbody tr'); ok(/Chờ anh duyệt bài đầu/.test(row.textContent) && row.querySelector('[data-gob="b_first123"]'), 'dòng sắp đăng: huy hiệu + nút mở để duyệt');
  row.querySelector('[data-gob]').click(); ok(U.T.board.length === 2, 'nút ở dòng sắp đăng cũng mở tab Duyệt bài');
  // Kết nối GrabCast: popup + hướng dẫn + làm mới khi đóng
  card('tiktok').querySelector('[data-gc="tiktok"]').click(); await flush();
  ok(U.T.opened.length === 1 && U.T.opened[0][0] === 'https://grabcast.click/scheduler.html#accounts' && U.T.opened[0][1] === 'gc-connect' && U.T.opened[0][2] === 'width=1100,height=800', 'Kết nối → popup grabcast.click Accounts đúng kích thước');
  const g = U.$('#chG-tiktok');
  ok(g && g.querySelectorAll('li').length === 6 && /Lexkite \(#4\)/.test(g.textContent) && /Connect TikTok/.test(g.textContent) && /Lexkite Español/.test(g.textContent) && g.querySelector('[data-gco="tiktok"]'), 'hướng dẫn từng bước: workspace 4, Connect TikTok, đặt tên theo bộ 16 trang, nút mở trang');
  ok(/Đang chờ anh kết nối/.test(U.$('#chM').textContent) && !U.calls.some(([p]) => p === 'lk/auto/channels/sync'), 'đang chờ, chưa làm mới khi popup còn mở');
  U.T.popup.closed = true; await new Promise(r => setTimeout(r, 1200)); await flush(30);
  ok(U.calls.some(([p]) => p === 'lk/auto/channels/sync') && U.T.reloadAcc === 1 && U.calls.filter(([p]) => p === 'lk/auto').length >= 2, 'đóng popup → đồng bộ kênh + tải lại tài khoản + trạng thái');
  ok(/Kênh mới: .*Lexkite 日本語 \(JA\)/.test(U.$('#chM').textContent) && /Đã nối 1/.test(U.$('#smgCh .smg-pc[data-plat="tiktok"]').textContent) && !/chưa đồng bộ/.test(U.$('#smgCh .smg-pc[data-plat="tiktok"]').textContent), 'báo kênh mới kèm ngôn ngữ, thẻ cập nhật (tài khoản đã đồng bộ không còn “chưa đồng bộ”)');
  const nSync = U.calls.filter(([p]) => p === 'lk/auto/channels/sync').length; await new Promise(r => setTimeout(r, 1100));
  ok(U.calls.filter(([p]) => p === 'lk/auto/channels/sync').length === nSync, 'đã làm mới xong thì ngừng dò (không lặp)');
  // quay lại cửa sổ khi popup còn mở → làm mới
  U.T.popup = { closed: false, close() {} }; U.$('#smgCh [data-gc="threads"]').click(); await flush();
  U.w.dispatchEvent(new U.w.Event('focus')); await flush(30);
  ok(U.calls.filter(([p]) => p === 'lk/auto/channels/sync').length === nSync + 1, 'cửa sổ admin được focus lại → tự làm mới');
  U.T.popup.closed = true; await new Promise(r => setTimeout(r, 1200)); await flush(30);
  // YouTube
  const yt = U.$('#smgCh .smg-pc[data-plat="youtube"]');
  ok(/Qua GrabCast: chờ GrabCast được YouTube duyệt/.test(yt.textContent) && yt.querySelector('[data-gc="youtube"]') && yt.querySelector('a[href="#video"]') && /Riêng tư/.test(yt.querySelector('details').textContent), 'YouTube: đường chính GrabCast (chờ duyệt) + thủ công ở tab Video + API trực tiếp chỉ là dự phòng có cảnh báo');
  ok(yt.querySelector('details') && !yt.querySelector('details').open, 'API trực tiếp thu gọn (không quảng bá là đường chính)');
  yt.querySelector('#chYtAuto').checked = false; yt.querySelector('#chYtAuto').dispatchEvent(new U.w.Event('change')); await flush(30);
  ok(U.calls.some(([p, b]) => p === 'lk/auto/save' && b.cfg && b.cfg.yt_gc_auto === false && Object.keys(b.cfg).length === 1), 'công tắc tự bật YouTube qua GrabCast → lưu cfg.yt_gc_auto');
  U.$('#smgCh [data-ytapi]').click(); await flush();
  ok(U.T.yapi[0] === 'connect', 'Kết nối API trực tiếp → luồng YouTube có sẵn (yapi connect)');
  // popup bị chặn
  const B = await mk({ open: 'blocked' }); B.$('#smgCh [data-gc="instagram"]').click(); await flush();
  ok(/chặn cửa sổ bật lên/.test(B.$('#chM').textContent) && B.$('#chG-instagram'), 'popup bị chặn → báo + vẫn hiện hướng dẫn có nút mở');
}

// 2b) Xem trước từng nền tảng
{
  const U = await mk(); U.$('#smgAP [data-pv]').click(); await flush(30);
  const pv = U.$('#apPv');
  ok(U.calls.some(([p, b]) => p === 'lk/auto/preview' && b.clip === CLIP), 'Xem trước → lk/auto/preview đúng clip');
  ok(pv.querySelectorAll('[data-pvt]').length === 5 && /Lexkite/.test(pv.textContent) && /40\/2200/.test(pv.textContent) && /0 lượt GrabCast/.test(pv.textContent), 'panel: tab từng nền tảng, trang đích, đếm caption len/max');
  pv.querySelector('[data-pvt="threads"]').click(); await flush();
  const th = U.$('#apPv'); ok(th.querySelector('.smg-cnt.x') && /520\/500/.test(th.textContent) && /chưa nối kênh/.test(th.textContent), 'tab Threads: vượt giới hạn tô đỏ, lý do chưa có trang đích');
  th.querySelector('[data-pvt="instagram"]').click(); await flush();
  ok(/Hashtag bị cắt khỏi caption/.test(U.$('#apPv').textContent) && U.$('#apPv [data-pvt="instagram"]').getAttribute('aria-selected') === 'true', 'vấn đề dịch ra lời, tab chọn đúng');
  U.$('#apPv [data-pvx]').click(); ok(U.$('#apPv').innerHTML === '', 'Đóng panel xem trước');
  ok(U.$('#smgAP .smg-tw > table.smg-tc') && [...U.$('#smgAP tbody tr').children].slice(0, 5).every(td => td.dataset.l), 'bảng sắp đăng trong khung cuộn riêng + nhãn ô cho dạng thẻ mobile (không tràn trang)');
}

// 2c) Tạm dừng toàn bộ + chạy lại
{
  const U = await mk(); U.T.conf = () => false; U.$('#chPause').click(); await flush(30);
  ok(!U.calls.some(([p]) => p === 'lk/auto/pause_all') && /gỡ lịch/i.test(U.T.lastConfirm) && /KHÔNG bị xóa/.test(U.T.lastConfirm), 'Tạm dừng toàn bộ: hỏi trước (nói rõ gỡ lịch bài đã lên lịch) – Hủy thì không gọi');
  U.T.conf = () => true; U.$('#chPause').click(); await flush(30);
  ok(U.calls.some(([p]) => p === 'lk/auto/pause_all'), 'xác nhận → lk/auto/pause_all');
  const c = U.$('#smgCh');
  ok(/gỡ lịch 3 bài · còn 2 bài/.test(c.textContent) && /p9 \(409 conflict\)/.test(c.textContent) && c.querySelector('#chMore'), 'hiện kết quả: số bài gỡ, còn lại, lỗi + nút gỡ tiếp');
  ok(c.querySelector('#chPaused') && /Đang tạm dừng/.test(c.textContent) && !c.querySelector('#chPause'), 'tắt → băng “Đang tạm dừng” rõ ràng');
  U.$('#chResume').click(); await flush(30);
  ok(U.calls.some(([p, b]) => p === 'lk/auto/save' && b.cfg.on === true && Object.keys(b.cfg).length === 1) && U.$('#chPause') && !U.$('#chPaused'), 'Chạy lại → auto/save {on:true}, băng biến mất');
}

// 2d) Nhật ký lỗi
{
  const U = await mk(), lg = U.$('#smgLog'), li = [...lg.querySelectorAll('#lgErr li')];
  ok(li.length === 3 && li.map(x => +x.dataset.at).every((t, i, a) => !i || a[i - 1] >= t) && /mới nhất/.test(li[0].textContent) && /Dừng thử lại/.test(li[0].textContent), 'nhật ký: mới nhất trước, có loại lỗi dễ hiểu');
  const sk = lg.querySelector('#lgSkip');
  ok(sk && /2×/.test(sk.querySelector('[data-why="account-gone"]').textContent) && /Kênh không còn trên GrabCast/.test(sk.textContent) && /GrabCast không tạo được bài \(mã 500\)/.test(sk.textContent) && /Kênh cần kết nối lại trên GrabCast/.test(sk.textContent), 'lý do bỏ qua: gom nhóm + dịch mã sang lời (account-gone, create-500, reconnect)');
  const T = (await mk()).w.AdminSocialMgr._t;
  ok(T.skipWhy('meta-token:190')[0] === 'Meta báo lỗi ({c}).' && T.skipWhy('lạ')[0] === 'Lý do khác ({c}).' && T.skipWhy('validate:x')[1].c === 'x', 'skipWhy: mã chính xác, tiền tố, mặc định');
}

// 2e) Tiếng Anh đầy đủ
{
  const U = await mk({ lang: 'en' }), T = U.w.AdminSocialMgr._t, EN = T.EN;
  const region = code.slice(code.indexOf('async function autoCard'), code.indexOf('async function queue('));
  const keys = [...new Set([...region.matchAll(/\bM\('((?:[^'\\]|\\.)*)'/g)].map(m => m[1].replace(/\\'/g, "'")))];
  const dyn = [T.PAUSE_Q, ...Object.values(T.SKIP), ...T.SKIP_PRE.map(x => x[1]), 'Lý do khác ({c}).', ...Object.values(T.LOGK), ...Object.values(T.ISS), ...Object.values(T.GSTEP), 'Autopilot bật', 'Autopilot tắt'];
  const miss = [...keys, ...dyn].filter(k => !(k in EN));
  ok(keys.length > 120 && !miss.length, 'mọi chuỗi mới có bản tiếng Anh – thiếu: ' + miss.join(' | '));
  U.$('#smgCh [data-guide="facebook_page"]').click(); await flush();
  const clone = U.$('#smgCh').cloneNode(true); clone.querySelectorAll('.smg-names').forEach(x => x.remove());
  const lg = U.$('#smgLog').cloneNode(true); lg.querySelectorAll('#lgErr li > span').forEach(x => x.remove()); // nội dung log do máy chủ viết
  ok(/Channels/.test(clone.textContent) && /Pause everything/.test(clone.textContent) && /Waiting for your first-post approval/.test(clone.textContent) && !VI.test(clone.textContent), 'EN: bảng Kênh + hướng dẫn không lẫn tiếng Việt');
  ok(/Error log/.test(lg.textContent) && /gone from GrabCast/.test(lg.textContent) && !VI.test(lg.textContent), 'EN: nhật ký lỗi không lẫn tiếng Việt');
  U.$('#smgAP [data-pv]').click(); await flush(30); U.$('#apPv [data-pvt="threads"]').click(); await flush();
  ok(/Preview only/.test(U.$('#apPv').textContent) && /no channel connected/.test(U.$('#apPv').textContent) && !VI.test(U.$('#apPv').textContent.replace(/Cap \w+ #esl/g, '')), 'EN: panel xem trước');
}

// 2f) Deep link duyệt bài (CSS.escape từng bị hằng CSS che → TypeError, không focus được)
{
  const dom = new jsdom.JSDOM('<!doctype html><html><head></head><body><main id="m"></main></body></html>', { url: 'https://lexkite.com/admin.html', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window; w.eval(code); let scrolled = 0; w.HTMLElement.prototype.scrollIntoView = () => { scrolled++; };
  if (!w.CSS || !w.CSS.escape) w.CSS = { escape: s => String(s).replace(/["\\]/g, '\\$&') };
  const errs = []; w.addEventListener('error', e => errs.push(e.message));
  const ctx = { focus: 'b_first123', sapi: async (m, p) => (p === 'lk/board' ? { items: [{ id: 'b_first123', state: 'review', title: 'T', accounts: [] }] } : {}), L: s => s, esc: s => String(s ?? ''), lang: () => 'vi', D: { accounts: [] }, errText: String, accById: () => null, modal: () => ({}), both: String, alive: () => true, LS: { get: (k, d) => d, set() {} } };
  w.AdminSocialMgr.paint('board', w.document.getElementById('m'), ctx); await flush(30);
  const c = w.document.querySelector('.smg-card[data-id="b_first123"]');
  ok(c && /var\(--primary\)/.test(c.style.outline) && scrolled === 1 && !errs.length && !/✗/.test(w.document.getElementById('smgMsg').textContent), 'mở bài từ bảng Kênh: thẻ được tô viền + cuộn tới, không lỗi');
}

console.log(fails ? `✗ social-admin: ${fails}/${n} lỗi` : `✓ social-admin: ${n} kiểm tra đạt (bảng Kênh, kết nối popup, xem trước, duyệt bài đầu, tạm dừng, nhật ký, mobile, tối, EN)`);
process.exit(fails ? 1 : 0);
