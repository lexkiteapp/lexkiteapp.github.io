// Test giao diện Video & Social (web/js/admin-social.js) bằng jsdom: hàm thuần (đếm ký tự, luật nền tảng, khung giờ vàng New York,
// lên lịch hàng loạt, chống trùng) + trình soạn (hiển thị, bộ đếm, lỗi theo tab, gọi validate, xác nhận trước khi gửi), lịch, danh sách, kênh.
// Chạy: node scripts/test/social-ui.mjs  (không cần mạng – sapi giả lập)
import fs from 'node:fs';
import jsdom from 'jsdom';
const { JSDOM } = jsdom;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const code = fs.readFileSync(new URL('../../web/js/admin-social.js', import.meta.url), 'utf8');
const dom = new JSDOM('<!doctype html><html><head></head><body><main id="m"></main></body></html>', { url: 'https://lexkite.com/admin.html', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, doc = w.document;
w.eval(code);
const A = w.AdminSocial, T = A._t;

// ---------- 1) Hàm thuần ----------
ok(T.clen('youtube', 'é') === 2 && T.clen('tiktok', 'é') === 1 && T.clen('threads', '😀a') === 5, 'đếm: YouTube theo byte, Threads emoji theo byte, còn lại theo ký tự');
ok(T.tagsIn('#a #b x#c https://x.com/#d').length === 2, 'đếm hashtag bỏ qua x#c và #fragment trong link');
ok(T.linksIn('xem https://lexkite.com và www.a.com').length === 2, 'đếm link');
const has = (l, s) => l.some(x => x.k.includes(s));
ok(has(T.checkLocal('instagram', { text: '#a #b #c #d', fc: '#e #f' }), 'hashtag'), 'Instagram > 5 hashtag (tính cả bình luận đầu) → cảnh báo');
ok(T.checkLocal('instagram', { text: '#a #b #c #d #e' }).length === 0, 'Instagram 5 hashtag → hợp lệ');
ok(has(T.checkLocal('youtube', { text: 'ok', title: '' }), 'Thiếu tiêu đề'), 'YouTube thiếu tiêu đề → lỗi');
ok(has(T.checkLocal('youtube', { text: 'ok', title: 'x'.repeat(101) }), 'Tiêu đề YouTube tối đa'), 'YouTube tiêu đề > 100 → lỗi');
ok(has(T.checkLocal('youtube', { text: 'a < b', title: 't' }), '< hoặc >'), 'YouTube mô tả có < → lỗi');
ok(has(T.checkLocal('youtube', { text: 'é'.repeat(2501), title: 't' }), 'Caption quá dài'), 'YouTube mô tả > 5000 byte → lỗi');
ok(has(T.checkLocal('tiktok', { text: 'x', o: {} }), 'quyền riêng tư TikTok') && !T.checkLocal('tiktok', { text: 'x', o: { privacy: 'SELF_ONLY' } }).length, 'TikTok bắt buộc chọn quyền riêng tư');
ok(has(T.checkLocal('tiktok', { text: 'xem https://lexkite.com', o: { privacy: 'SELF_ONLY' } }), 'không bấm được'), 'TikTok có link → cảnh báo');
ok(has(T.checkLocal('threads', { text: 'a'.repeat(501) }), 'Caption quá dài') && has(T.checkLocal('threads', { text: 'https://a.co '.repeat(6) }), 'Threads tối đa'), 'Threads 500 ký tự, tối đa 5 link');
ok(has(T.checkLocal('instagram', { text: 'x', m: { dur: 2 } }), 'Reels Instagram'), 'Reel < 3 giây → lỗi');
ok(T.kindFor({ kinds: ['video', 'short'] }, 'youtube', { dur: 40, w: 1080, h: 1920 }) === 'short' && T.kindFor({}, 'youtube', { dur: 400, w: 1920, h: 1080 }) === 'video', 'YouTube: dọc ≤ 3 phút → short, còn lại video');
ok(T.kindFor({}, 'facebook_page', { dur: 120, w: 1080, h: 1920 }) === 'video' && T.kindFor({}, 'facebook_page', { dur: 30, w: 1080, h: 1920 }) === 'reel', 'Facebook: reel 3–90 giây, dài hơn → video');
const yo = T.optsFor('youtube', { privacy: 'unlisted', tags: '#IELTS, toeic,IELTS' });
ok(yo.made_for_kids === false && yo.privacy_status === 'unlisted' && yo.contains_synthetic_media === false && yo.tags.join() === 'IELTS,toeic', 'YouTube options: made_for_kids=false, tags gọn');
ok(!('privacy_level' in T.optsFor('tiktok', {})) && T.optsFor('tiktok', { privacy: 'SELF_ONLY' }).privacy_level === 'SELF_ONLY', 'TikTok: chỉ gửi privacy_level khi đã chọn');
ok(T.optsFor('instagram', {}).share_to_feed === true, 'Instagram share_to_feed mặc định bật');
ok(T.GROUP('publishing') === 'scheduled' && T.GROUP('partial') === 'failed' && T.GROUP('cancel_failed') === 'failed' && T.GROUP('published') === 'published', 'nhóm trạng thái');
// Giờ New York: EDT (UTC-4) tháng 10, EST (UTC-5) sau 1/11
ok(T.nyAt(2026, 10, 19, 12).toISOString() === '2026-10-19T16:00:00.000Z' && T.nyAt(2026, 11, 2, 12).toISOString() === '2026-11-02T17:00:00.000Z', 'nyAt xử lý EDT/EST');
const mon6 = +T.nyAt(2026, 10, 19, 6); // thứ Hai 19/10/2026, 6:00 ET
const hrs = l => l.map(s => s.key + '@' + s.h).join(',');
ok(hrs(T.freeSlots([], { n: 3, now: mon6 })) === '2026-10-19@7,2026-10-19@8,2026-10-19@12', 'khung vàng kế tiếp 7/8/12 ET');
const busyPost = { id: 'b1', status: 'scheduled', scheduled_at: T.nyAt(2026, 10, 19, 8).toISOString(), targets: [{ account_id: 11 }] };
ok(hrs(T.freeSlots([busyPost], { n: 3, now: mon6 })) === '2026-10-19@7,2026-10-19@12,2026-10-19@19', 'bỏ qua khung đã có bài');
ok(hrs(T.freeSlots([busyPost], { n: 1, now: mon6, acc: ['99'] })) === '2026-10-19@7' && hrs(T.freeSlots([busyPost], { n: 2, now: mon6, acc: ['99'] })) === '2026-10-19@7,2026-10-19@8', 'khung bận của kênh khác không chặn');
ok(hrs(T.freeSlots([], { n: 1, now: +T.nyAt(2026, 10, 19, 6, 50) })) === '2026-10-19@8', 'khung còn < 15 phút bị bỏ');
const fri = +T.nyAt(2026, 10, 23, 6);
const plan = T.planBulk([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }], [], { hours: [19, 12], skipWeekend: true, now: fri });
ok(plan.map(r => r.v.id + ':' + r.key + '@' + r.h).join(',') === 'a:2026-10-23@12,b:2026-10-23@19,c:2026-10-26@12,d:2026-10-26@19', 'hàng loạt: xếp khung trống, bỏ cuối tuần ' + plan.map(r => r.key + '@' + r.h));
ok(T.planBulk([{ id: 'a' }], [], { hours: [12], from: '2026-11-05', now: mon6 })[0].key === '2026-11-05', 'hàng loạt: bắt đầu từ ngày chọn');
w.localStorage.setItem('lk.soc.used', JSON.stringify({ 'o:o9': ['p9'] }));
ok(T.dupOf([{ id: 'p9', status: 'scheduled', targets: [{ account_id: 11 }] }], { src: 'o:o9', acc: ['11'], cap: 'khác' }), 'trùng: cùng video đã đăng lên cùng kênh');
ok(!T.dupOf([{ id: 'p9', status: 'scheduled', targets: [{ account_id: 12 }] }], { src: 'o:o9', acc: ['11'], cap: 'khác' }), 'không trùng khi khác kênh');
ok(T.dupOf([{ id: 'p8', status: 'draft', caption: 'Cùng một caption dài', targets: [{ account_id: 11 }] }], { acc: ['11'], cap: 'Cùng một caption dài' }) && !T.dupOf([{ id: 'p8', status: 'cancelled', caption: 'Cùng một caption dài', targets: [{ account_id: 11 }] }], { acc: ['11'], cap: 'Cùng một caption dài' }), 'trùng caption (bỏ qua bài đã hủy)');

// Mọi chuỗi S('…') có bản tiếng Anh
const keys = new Set([...code.matchAll(/\bS\('((?:[^'\\]|\\.)*)'/g)].map(m => m[1].replace(/\\'/g, "'").replace(/\\n/g, '\n')));
for (const m of code.matchAll(/add\('(?:error|warning)', '([^']+)'|emptyConn\('([^']+)'\)/g)) keys.add(m[1] || m[2]);
const missing = [...keys].filter(k => !(k in T.EN) && !/^grabcast\.click|^<code>/.test(k));
ok(!missing.length, 'thiếu bản tiếng Anh: ' + missing.join(' | '));

// ---------- 2) Giao diện ----------
const iso = d => d.toISOString(), soon = new Date(Date.now() + 36e5) // +1 giờ: luôn nằm trong tuần đang xem (trước đây +2 ngày → thứ Bảy rơi sang tuần sau);
const FIX = {
  'storage/stores': { items: [{ id: 1, name: 'Drive A', provider: 'google_drive', used_bytes: 85e9, total_bytes: 100e9 }] },
  accounts: { accounts: [{ id: 11, platform: 'youtube', display_name: 'Lexkite YT', kinds: ['video', 'short'] }, { id: 12, platform: 'instagram', display_name: 'lexkite.ig', username: 'lexkite', limits: { posts_24h: 3, posts_cap: 100 } }, { id: 13, platform: 'tiktok', display_name: 'Lexkite TT' }, { id: 14, platform: 'threads', display_name: 'Lexkite Threads', status: 'needs_reauth', needs_reconnect: true }] },
  posts: { posts: [{ id: 'p1', status: 'scheduled', title: 'Old post', caption: 'Old caption', scheduled_at: iso(soon), targets: [{ id: 't1', account_id: 11, platform: 'youtube', kind: 'short', state: 'scheduled' }] }, { id: 'p2', status: 'failed', caption: 'Broken one', scheduled_at: iso(new Date(Date.now() - 864e5)), targets: [{ id: 't2', account_id: 12, platform: 'instagram', kind: 'reel', state: 'failed', last_error: 'Token expired', last_error_code: 'account_needs_reauth' }] }] },
  'storage/objects': { items: [{ id: 'o1', name: 'ielts-tip-1.mp4', mime: 'video/mp4', size: 12e6, meta: { w: 1080, h: 1920, duration_ms: 42000 } }, { id: 'o2', name: 'toeic-2.mp4', mime: 'video/mp4', size: 8e6 }, { id: 'o3', name: 'vocab-3.mov', mime: 'video/quicktime', size: 5e6 }, { id: 'x', name: 'cover.png', mime: 'image/png', size: 1 }] },
};
let calls = [], valOk = false, conf = [], confAns = () => true;
w.confirm = m => { conf.push(m); return confAns(m); }; w.alert = () => {}; w.prompt = () => null;
const sapi = async (method, path, body, opt = {}) => {
  calls.push({ method, path, body: body && JSON.parse(JSON.stringify(body)), opt });
  if (method === 'GET' && FIX[path]) return JSON.parse(JSON.stringify(FIX[path]));
  if (path === 'tiktok/creator-info/13') return { can_post: true, privacy_level_options: ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'], comment_disabled: true };
  if (/^storage\/objects\/[^/]+\/use$/.test(path)) return { media: { id: 'm1' } };
  if (path === 'validate') return valOk ? { ok: true, targets: [] } : { ok: false, targets: [{ account_id: 12, platform: 'instagram', problems: [{ level: 'error', code: 'aspect_ratio', message: 'Instagram Reel aspect ratio bad' }] }] };
  if (method === 'POST' && path === 'posts') { const post = { id: 'p_new' + (FIX.posts.posts.length || ''), status: 'draft', caption: body.caption, targets: body.targets }; FIX.posts.posts.push(post); return { post }; }
  if (/^posts\/[^/]+\/(schedule|unschedule|publish-now|cancel|retry)$/.test(path)) return { post: { id: path.split('/')[1], status: 'scheduled' } };
  if (path === 'posts/p2') return { post: FIX.posts.posts[1] };
  if (path === 'posts/p1') return { post: FIX.posts.posts[0] };
  return {};
};
const L = (vi, v) => (v ? vi.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? String(v[k]) : m)) : vi.split('@@')[0]);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const flush = async (n = 8) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)); };
const $ = s => doc.querySelector(s), $$ = s => [...doc.querySelectorAll(s)];
const fire = (el, type) => el.dispatchEvent(new w.Event(type, { bubbles: true }));
const setVal = (el, v, type = 'input') => { el.value = v; fire(el, type); };
const main = $('#m');

A.render(main, sapi, L, { esc, lang: () => 'vi' }); await flush();
ok($$('.soc-tabs [role=tab]').length === 9 && $('[data-tab=compose]').getAttribute('aria-selected') === 'true', '9 tab, mở Soạn bài');
ok($$('#cmMedia [data-oid]').length === 3, 'kho video chỉ hiện video (3)');
setVal($('#cmQ'), 'toeic'); ok($$('#cmMedia [data-oid]').length === 1, 'tìm video'); setVal($('#cmQ'), '');
$('#cmMedia [data-oid="o1"]').click();
ok(/ielts-tip-1\.mp4/.test($('#cmSel').textContent) && /0:42/.test($('#cmSel').textContent) && /1080×1920/.test($('#cmSel').textContent) && /12 MB/.test($('#cmSel').textContent), 'xem trước video: tên, thời lượng, kích thước, dung lượng');
for (const id of ['11', '12', '13']) $(`#cmAcc input[value="${id}"]`).checked = true;
fire($('#cmAcc'), 'change'); await flush();
ok($$('#cmPT [role=tab]').length === 3, '3 tab nền tảng theo kênh đã chọn');
setVal($('#cmCap'), 'Học IELTS mỗi ngày https://lexkite.com #a #b #c #d #e #f');
ok(/6 hashtag/.test($('#cmCapN').textContent) && /1 link/.test($('#cmCapN').textContent) && /\/2[.,]?200/.test($('#cmCapN').textContent), 'bộ đếm caption chung: ký tự, hashtag, link');
ok($('#cmPT [data-p=youtube] .dot:not(.w)') && $('#cmPT [data-p=tiktok] .dot:not(.w)') && $('#cmPT [data-p=instagram] .dot.w'), 'chấm lỗi/cảnh báo trên tab nền tảng');
$('#cmPT [data-p=instagram]').click();
ok(/hashtag/.test($('#cmProbs').textContent) && /không bấm được/.test($('#cmProbs').textContent), 'tab Instagram: cảnh báo hashtag + link');
ok($('#pv .soc-phone') && /#f/.test($('#pv').textContent), 'xem trước khung điện thoại có caption');
calls = []; $('#cmVal').click(); await flush();
ok(/Sửa các lỗi/.test($('#cmMsg').textContent) && !calls.some(c => c.path === 'validate'), 'lỗi tại chỗ → chặn, không gọi validate');
ok($('#cmPT [aria-selected=true]').dataset.p === 'youtube', 'tự chuyển sang tab có lỗi');
setVal($('#cmPanel [data-k=title]'), 'IELTS tip #1');
ok(!$('#cmPT [data-p=youtube] .dot:not(.w)'), 'nhập tiêu đề YouTube → hết lỗi');
$('#cmPT [data-p=tiktok]').click(); await flush();
ok($$('#cmPanel [data-k=privacy] option').length === 3 && $('#cmPanel [data-k=comment]').disabled, 'TikTok: quyền riêng tư theo creator-info, tắt bình luận khi creator chặn');
setVal($('#cmPanel [data-k=privacy]'), 'SELF_ONLY', 'change');
calls = []; $('#cmVal').click(); await flush();
const vc = calls.find(c => c.path === 'validate');
ok(vc && vc.body.media_ids[0] === 'm1' && vc.body.title === 'IELTS tip #1', 'gọi POST validate với media + tiêu đề');
const tg = p => vc && vc.body.targets.find(t => String(t.account_id) === p);
ok(tg('11') && tg('11').kind === 'short' && tg('11').options.made_for_kids === false && tg('13').options.privacy_level === 'SELF_ONLY' && tg('12').options.share_to_feed === true && tg('12').kind === 'reel', 'targets đúng loại + tùy chọn từng nền tảng');
ok(/Chưa hợp lệ/.test($('#cmMsg').textContent) && $('#cmPT [aria-selected=true]').dataset.p === 'instagram' && /GrabCast: Instagram Reel aspect ratio bad/.test($('#cmProbs').textContent), 'lỗi máy chủ hiện đúng tab Instagram');
ok(!calls.some(c => c.path === 'posts'), 'validate không tạo bài');
valOk = true;
$('#cmNext').click(); ok($('#cmAt').value && /ET|GMT|EDT|EST/.test($('#cmAtTz').textContent), 'khung trống kế tiếp + hiện giờ NY & giờ máy');
ok($$('#cmTimes [data-at]').length === 6, '6 khung giờ vàng gợi ý');
confAns = () => false; calls = []; conf = []; $('#cmSched').click(); await flush();
ok(conf.length === 1 && !calls.some(c => c.method === 'POST'), 'hủy xác nhận → không gửi gì');
confAns = () => true; calls = []; conf = []; $('#cmSched').click(); await flush(12);
const cp = calls.find(c => c.method === 'POST' && c.path === 'posts'), sb = calls.find(c => c.path === 'lk/board/submit');
ok(conf.length === 1 && /gửi duyệt/.test(conf[0]), 'hỏi xác nhận trước khi tạo nháp & gửi duyệt');
ok(cp && /^[A-Za-z0-9_-]{8,80}$/.test(cp.opt.idem || '') && !cp.body.scheduled_at && sb && /^p_new/.test(sb.body.post_id) && sb.body.mode === 'sched' && sb.body.want_at > Date.now(), 'tạo bài NHÁP (Idempotency-Key) rồi gửi duyệt kèm giờ mong muốn');
ok(!calls.some(c => /\/(schedule|publish-now)$/.test(c.path)), 'trình soạn KHÔNG tự lên lịch/đăng (luật duyệt)');
ok(/gửi duyệt/.test($('#cmMsg').textContent), 'báo đã gửi duyệt');
conf = []; confAns = m => !/trùng/.test(m); calls = []; $('#cmDraft').click(); await flush();
ok(conf.some(m => /trùng/.test(m)) && !calls.some(c => c.path === 'posts'), 'chống trùng: hỏi lại, từ chối → không tạo');
confAns = () => true;

// Lịch + hàng loạt
$('[data-tab=calendar]').click(); await flush();
ok($('.soc-wk') && $('.soc-chip[data-pid=p1]') && $('.soc-chip[data-pid=p1]').getAttribute('draggable') === 'true', 'lịch tuần có bài, kéo được');
ok($$('#calFree [data-new]').length === 8, 'danh sách khung trống');
$('[data-cv=month]').click(); await flush(); ok($('.soc-mo') && $$('.soc-mo .soc-cell').length === 42, 'lịch tháng 6×7');
$('#calBulk').click(); ok(!$('#bulkBox').hidden && $$('#bkMedia [data-bv]').length === 3, 'mở lên lịch hàng loạt');
for (const id of ['o2', 'o3']) $(`#bkMedia [data-bv="${id}"]`).checked = true; fire($('#bkMedia'), 'change');
$('#bkAcc input[value="11"]').checked = true; fire($('#bkAcc'), 'change');
$('#bkPlan').click();
const rows = $$('#bkOut tbody tr');
ok(rows.length === 2 && rows.every(r => !/–/.test(r.children[2].textContent)) && !$('#bkGo').disabled, 'kế hoạch 2 video vào khung giờ');
calls = []; conf = []; $('#bkGo').click(); await flush(30);
ok(conf.length === 1 && calls.filter(c => c.path === 'lk/board/submit').length === 2 && !calls.some(c => /\/schedule$/.test(c.path)) && calls.filter(c => c.method === 'POST' && c.path === 'posts').every(c => c.body.title && c.body.caption.includes(c.body.title)), 'hàng loạt: 1 xác nhận, 2 bài, caption điền {title}');

// Bài đăng + ngăn chi tiết
$('[data-tab=posts]').click(); await flush();
ok($$('#pfList .soc-row').length >= 2, 'danh sách bài');
$('#pfS [data-pf=failed]').click(); ok($$('#pfList .soc-row').length === 1 && /Token expired/.test($('#pfList').textContent), 'lọc Lỗi + hiện lỗi');
setVal($('#pfQ'), 'zzz'); ok($('#pfList .soc-empty'), 'tìm không thấy → trạng thái rỗng'); setVal($('#pfQ'), '');
$('#pfList .soc-row').click(); await flush();
const dw = $('.soc-drawer');
ok(dw && /Token expired/.test(dw.textContent) && /account_needs_reauth/.test(dw.textContent) && dw.querySelector('[data-act=retry]'), 'ngăn chi tiết: lỗi từng kênh + nút thử lại');
calls = []; conf = []; dw.querySelector('[data-act=retry]').click(); await flush();
ok(conf.length === 1 && calls.some(c => c.path === 'posts/p2/retry' && c.body.consent === true), 'thử lại có xác nhận');
dw.remove();

// Kênh & Drive
$('[data-tab=accounts]').click(); await flush();
ok($$('.soc-accs li').length === 4 && /Kết nối lại/.test($('.soc-accs').textContent) && /3\/100/.test($('.soc-accs').textContent), 'kênh: 4 kênh, cần kết nối lại, hạn mức');
ok($('.soc-bar[aria-valuenow="85"]') && /80%/.test($('#socBody').textContent) && $('a[href*="grabcast.click/scheduler.html#accounts"]'), 'Drive 85% + cảnh báo + link GrabCast');

// Tiếng Anh + chưa cấu hình
main.innerHTML = ''; A.render(main, sapi, L, { esc, lang: () => 'en' }); await flush();
ok(/Compose/.test($('.soc-tabs').textContent) && !/Soạn bài/.test(main.textContent), 'giao diện tiếng Anh');
main.innerHTML = ''; A.render(main, async () => { const e = new Error('nc'); e.code = 'not-configured'; throw e; }, L, { esc, lang: () => 'vi' }); await flush();
ok(/GRABCAST_API_KEY/.test(main.textContent) && !/gk_|SECRET/.test(main.innerHTML), 'chưa cấu hình → hướng dẫn, không lộ khóa');
// Studio điền sẵn
main.innerHTML = ''; A.prefill({ objectId: 'o2', title: 'From Studio', caption: 'Studio caption' }); A.render(main, sapi, L, { esc, lang: () => 'vi' }); await flush();
ok($('[data-tab=compose]').getAttribute('aria-selected') === 'true' && $('#cmCap').value === 'Studio caption' && /toeic-2/.test($('#cmSel').textContent), 'prefill từ Studio');

w.close();
if (fails) { console.error(`✗ social-ui: ${fails} lỗi`); process.exit(1); }
console.log('✓ social-ui: bộ đếm, luật nền tảng, validate theo tab, khung giờ vàng, hàng loạt, chống trùng, lịch, chi tiết, kênh đều đạt');
