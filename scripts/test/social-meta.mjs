// Test đường dự phòng Meta Graph API của autopilot social (functions/api/_meta.js + _social_auto.js §6b, thẻ Quản trị):
// hàm thuần (lý do failover, chọn provider, bước Meta, ánh xạ kênh, cảnh báo 1 lần), đầu-cuối với D1 sqlite + GrabCast giả + Meta giả:
// GrabCast 503 db_budget_guard → failover; bài GrabCast đã lên lịch mà không hủy được → chỉ cứu sau slot + 30 phút; GrabCast trễ → GET + unschedule/cancel rồi đăng Meta;
// khóa clip + kênh không đăng trùng; bài chưa duyệt không công khai; IG container (chờ FINISHED, ERROR, giới hạn 24 giờ); token bị thu hồi → dừng + cảnh báo;
// GrabCast hồi phục → hủy bài treo + quay về; token không lọt vào D1/kết quả; truy vấn D1 theo chỉ mục; UI (jsdom, đủ tiếng Anh). Chạy: node scripts/test/social-meta.mjs
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

const store = new Map();
globalThis.caches = { default: { async match(req) { const e = store.get(req.url); return e && e.exp > Date.now() ? new Response(e.body) : undefined; }, async put(req, res) { store.set(req.url, { body: await res.text(), exp: Date.now() + 60e3 }); } } };
const sql = new DatabaseSync(':memory:');
const DB = { prepare(q) { const st = { q, args: [], bind(...a) { return { ...st, args: a }; },
  async run() { if (/^\s*(SELECT|WITH)/i.test(q)) return { results: sql.prepare(q).all(...this.args) }; const i = sql.prepare(q).run(...this.args); return { results: [], meta: { changes: Number(i.changes) } }; },
  async all() { return /^\s*(SELECT|WITH)/i.test(q) ? { results: sql.prepare(q).all(...this.args) } : (sql.prepare(q).run(...this.args), { results: [] }); },
  async first() { return sql.prepare(q).get(...this.args) || null; } }; return st; },
  async batch(list) { const out = []; for (const x of list) out.push(await x.run()); return out; } };

const A = await import(new URL('../../functions/api/_social_auto.js', import.meta.url));
const MT = await import(new URL('../../functions/api/_meta.js', import.meta.url));
const MGR = await import(new URL('../../functions/api/_social_mgr.js', import.meta.url));
const DATA = (await import(new URL('../../functions/api/_shorts_data.js', import.meta.url))).default;
const [CA, CB, CC, CD, CE] = DATA.index.items.filter(x => !x.rejected && x.video).map(x => x.id);
const H = 36e5, M60 = 60e3, now = Date.now();

// ---------- 1) Hàm thuần ----------
{
  const env = { GRABCAST_API_KEY: 'k' };
  ok(A.gcDownWhy({}, {}, now) === 'no-key', 'không có khóa GrabCast → lý do no-key');
  ok(A.gcDownWhy(env, { breaker: { until: now + H, status: 401 } }, now) === 'auth-401' && A.gcDownWhy(env, { breaker: { until: now + H, status: 503, code: 'db_budget_guard' } }, now) === 'db_budget_guard', '401 / 503 db_budget_guard → failover ngay');
  ok(A.gcDownWhy(env, { breaker: { until: now + H, status: 500 } }, now) === '' && A.gcDownWhy(env, { breaker: { until: now + H, status: 504 }, gc_err_runs: 2 }, now) === 'down-504', '5xx/timeout: chỉ failover khi lặp ≥ 2 lượt');
  ok(A.gcDownWhy(env, { breaker: { until: now + H, status: 422 } }, now) === '' && A.gcDownWhy(env, { breaker: { until: now - 1, status: 401 } }, now) === '', '422 (lỗi nội dung) và cầu dao đã hết hạn → không failover');
  ok(A.decideProvider({ gcWhy: '', metaOk: true }).cur === 'grabcast' && A.decideProvider({ gcWhy: 'auth-401', metaOk: true }).cur === 'meta' && A.decideProvider({ gcWhy: 'auth-401', metaOk: false }).cur === 'grabcast', 'auto: GrabCast lỗi + Meta sẵn sàng → meta; Meta chưa cấu hình → giữ grabcast');
  ok(A.decideProvider({ mode: 'meta', metaOk: true }).why === 'manual' && A.decideProvider({ mode: 'grabcast', gcWhy: 'late', metaOk: true }).cur === 'grabcast' && A.decideProvider({ mode: 'meta', metaOk: false }).cur === 'grabcast', 'chuyển tay: meta / grabcast (Meta chưa cấu hình → không chuyển)');
  const st = (o, t = now) => A.metaStep({ platform: 'instagram', slot_ms: now + H, ...o }, t);
  ok(st({ platform: 'facebook_page' }) === 'fb' && st({ platform: 'facebook_page', gcScheduledUnreachable: true }) === 'wait' && st({ platform: 'facebook_page', gcScheduledUnreachable: true }, now + H + 31 * M60) === 'fb', 'FB: đăng/lên lịch ngay; GrabCast còn giữ lịch không hủy được → chờ tới slot + 30 phút');
  ok(st({}, now - 3 * H) === 'wait' && st({}) === 'ig-container' && st({ lock: { container: '1' } }) === 'ig-check' && st({ lock: { container: '1' } }, now - 2 * H) === 'wait', 'IG: container ≤ 3 giờ trước slot, đăng khi ≥ slot − 60 phút');
  ok(st({ lock: { state: 'posted' } }) === 'done' && st({}, now + 14 * H) === 'too-late' && st({ platform: 'facebook_page', lock: { state: 'scheduled' } }, now + 2 * H) === 'fb-check', 'đã đăng → xong; quá 12 giờ → bỏ; FB đã hẹn qua Meta → kiểm đã lên chưa');
  const ch = [{ channel_id: 'gc-facebook_page-2', platform: 'facebook_page' }, { channel_id: 'gc-facebook_page-5', platform: 'facebook_page' }, { channel_id: 'gc-instagram-3', platform: 'instagram' }];
  ok(A.metaChannelFor('instagram', ch) === 'gc-instagram-3' && A.metaChannelFor('facebook_page', ch) === null && A.metaChannelFor('facebook_page', ch, { facebook_page: 'gc-facebook_page-2' }) === 'gc-facebook_page-2' && A.metaChannelFor('facebook_page', ch, { facebook_page: 'gc-facebook_page-9' }) === null, 'kênh Meta: kênh duy nhất, nhiều kênh → phải chọn (meta_map)');
  const s = {}; ok(A.pushAlert(s, 'failover', 'x', now) && !A.pushAlert(s, 'failover', 'x', now + 9 * H) && s.alerts.length === 1, 'cảnh báo failover chỉ 1 lần mỗi đợt');
  ok(A.pushAlert(s, 'meta-token:expiring', 'x', now) && !A.pushAlert(s, 'meta-token:expiring', 'x', now + 864e5) && A.pushAlert(s, 'meta-token:expiring', 'x', now + 4 * 864e5), 'cảnh báo token nhắc lại sau 3 ngày');
  ok(MT.metaKind(190) === 'token' && MT.metaKind(200) === 'perm' && MT.metaKind(4) === 'rate' && MT.metaKind(0, 503) === 'down' && MT.metaKind(100, 400) === '' && MT.metaKind(9004, 400) === '', 'mã lỗi Graph: 190 token · 200 quyền · 4 giới hạn · 5xx sập · lỗi khác = riêng 1 bài');
  const c = A.cleanAuto({ provider: 'x', meta_daily: 9999, meta_map: { facebook_page: 'gc-facebook_page-2', instagram: 'javascript:alert(1)' } });
  ok(c.provider === 'auto' && c.meta_daily === 200 && c.meta_map.facebook_page === 'gc-facebook_page-2' && !c.meta_map.instagram && A.cleanAuto({}).provider === 'auto', 'cài đặt: provider mặc định auto, kẹp ngân sách Graph, meta_map chỉ nhận id kênh hợp lệ');
}

// ---------- 2) Đầu-cuối ----------
const KEY = 'gk_live_SECRET_meta_123456', TOK = 'EAAG' + 'x'.repeat(60) + 'PAGETOKEN', TOKI = 'IGAA' + 'y'.repeat(60) + 'IGTOKEN1', TOKI2 = 'IGAA' + 'z'.repeat(60) + 'IGTOKEN2';
const GC = { posts: {}, fail: null, down: false }, MG = { calls: [], ig: {}, igStatus: {}, quota: 0, revoked: false, refreshFail: false, n: 0 }; let gcCalls = [];
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url), J = (b, s = 200) => new Response(JSON.stringify(b), { status: s }), body = init.body;
  if (u.hostname === 'graph.facebook.com' || u.hostname === 'rupload.facebook.com' || u.hostname === 'graph.instagram.com') {
    const p = u.pathname.replace(/^\/(video-upload\/)?v\d+\.\d\/?/, ''), f = init.method === 'GET' ? Object.fromEntries(u.searchParams) : Object.fromEntries(new URLSearchParams(body || ''));
    MG.calls.push({ host: u.hostname, m: init.method, p, f, h: init.headers || {}, url: String(url) });
    if (MG.revoked && u.hostname !== 'graph.instagram.com') return J({ error: { code: 190, message: 'Error validating access token: ' + TOK } }, 400);
    if (u.hostname === 'graph.instagram.com' && p === '/refresh_access_token') return MG.refreshFail ? J({ error: { code: 190, message: 'expired ' + u.searchParams.get('access_token') } }, 400) : J({ access_token: TOKI2, token_type: 'bearer', expires_in: 5184000 });
    if (u.hostname === 'graph.instagram.com' && p === 'me') return (init.headers || {}).Authorization === 'Bearer ' + TOKI ? J({ user_id: '178000000001', username: 'lexkite.app' }) : J({ error: { code: 190, message: 'bad' } }, 400);
    if (p === 'debug_token') return J({ data: { is_valid: true, expires_at: 0, data_access_expires_at: Math.floor((now + 80 * 864e5) / 1000), scopes: ['pages_manage_posts', 'pages_read_engagement', 'instagram_content_publish', 'instagram_basic'] } });
    if (u.hostname === 'rupload.facebook.com') return J({ success: true });
    if (p === '123456789/video_reels' && f.upload_phase === 'start') return J({ video_id: String(900000 + (++MG.n)), upload_url: 'https://rupload.facebook.com/x' });
    if (p === '123456789/video_reels' && f.upload_phase === 'finish') return J({ success: true });
    if (p === '178000000001/media') { const id = String(1790000 + (++MG.n)); MG.ig[id] = f; if (MG.nextErr) MG.igStatus[id] = 'ERROR'; return J({ id }); }
    if (p === '178000000001/content_publishing_limit') return J({ data: [{ quota_usage: MG.quota, config: { quota_total: 100, quota_duration: 86400 } }] });
    if (p === '178000000001/media_publish') return J({ id: String(1791000 + (++MG.n)) });
    if (/^179\d+$/.test(p) && f.fields === 'status_code,status') return J({ status_code: MG.igStatus[p] || 'FINISHED', status: MG.igStatus[p] === 'ERROR' ? 'Error: video format' : '' });
    if (/^1791\d+$/.test(p)) return J({ permalink: 'https://www.instagram.com/reel/ABC' + p + '/' });
    if (/^9\d{5}$/.test(p)) return J({ published: true, permalink_url: '/reel/' + p, status: { video_status: 'ready' } });
    return J({ error: { code: 100, message: 'unknown ' + p } }, 400);
  }
  if (u.hostname === 'lexkite.com') return new Response(new Uint8Array(10), { status: 200 });
  if (u.hostname === 'api.github.com') return new Response('no', { status: 404 });
  const p = u.pathname.replace('/api/social/', ''); gcCalls.push({ m: init.method, p });
  if (GC.down) return J({ error: { code: 'db_budget_guard' } }, 503);
  if (p === 'accounts') return J({ accounts: [{ id: 2, platform: 'facebook_page', display_name: 'Lexkite', kinds: ['reel'] }, { id: 3, platform: 'instagram', display_name: 'lexkite.app', kinds: ['reel'] }] });
  if (p === 'posts' && init.method === 'GET') return J({ posts: Object.values(GC.posts) });
  let m = /^posts\/([^/]+)$/.exec(p); if (m) return GC.posts[m[1]] ? J({ post: GC.posts[m[1]] }) : J({ error: { code: 'not_found' } }, 404);
  m = /^posts\/([^/]+)\/(unschedule|cancel)$/.exec(p); if (m) { GC.posts[m[1]].status = m[2] === 'cancel' ? 'cancelled' : 'draft'; return J({ post: GC.posts[m[1]] }); }
  return J({});
};
const ENCK = Buffer.alloc(32, 5).toString('base64');
const ENV = { DB, GRABCAST_API_KEY: KEY, SHORTS_READ_TOKEN: 'ro', KEYS_ENC_KEY: ENCK, META_PAGE_TOKEN: TOK, META_PAGE_ID: '123456789' }; // FB qua secret khởi tạo, IG qua Quản trị (token kênh)
await MGR.setupMgr(DB);
sql.exec('CREATE TABLE yt_queue (clip TEXT PRIMARY KEY, status TEXT, title TEXT, approved_at INTEGER); CREATE TABLE clip_review (clip TEXT PRIMARY KEY, state TEXT, deleted INTEGER, web INTEGER)');
for (const c of [CA, CB, CC, CD, CE]) sql.prepare("INSERT INTO yt_queue (clip, status) VALUES (?, 'manual')").run(c);
await A.autoStatus({ ...ENV }); // tạo bảng
const ext = sql.prepare('INSERT INTO dist_ext (channel_id, platform, account_id, title, status, updated) VALUES (?, ?, ?, ?, ?, ?)');
ext.run('gc-facebook_page-2', 'facebook_page', '2', 'Lexkite', 'ok', now); ext.run('gc-instagram-3', 'instagram', '3', 'lexkite.app', 'ok', now);
// token kênh IG qua Quản trị: kiểm bằng GET me (graph.instagram.com), lưu mã hóa
{
  const op = A.autoOpFor('POST', 'lk/auto/token'); let e1 = 0, e2 = 0, e3 = 0;
  try { await op({ env: ENV, db: DB, b: { channel_id: 'gc-instagram-3', token: 'IGAA' + 'q'.repeat(40) } }); } catch (e) { e1 = e.status; }
  try { await op({ env: { ...ENV, KEYS_ENC_KEY: '' }, db: DB, b: { channel_id: 'gc-instagram-3', token: TOKI } }); } catch (e) { e2 = e.status; }
  try { await op({ env: ENV, db: DB, b: { channel_id: 'gc-instagram-9', token: TOKI } }); } catch (e) { e3 = e.status; }
  ok(e1 === 422 && e2 === 412 && e3 === 404, `lưu token: token sai → 422, thiếu KEYS_ENC_KEY → 412, kênh lạ → 404 (${e1}/${e2}/${e3})`);
  const o = await op({ env: ENV, db: DB, b: { channel_id: 'gc-instagram-3', token: TOKI } });
  const row = sql.prepare('SELECT * FROM soc_tokens WHERE channel_id = ?').get('gc-instagram-3');
  ok(o.target_id === '178000000001' && o.last4 === TOKI.slice(-4) && !JSON.stringify(o).includes(TOKI) && row && row.kind === 'ig' && !row.enc.includes(TOKI) && /^v1\./.test(row.enc) && row.expires_at > now, 'token IG lưu mã hóa (AES-GCM), trả về chỉ last4 + IG user id');
}
const due = (clip, ch, t, state = 'planned', pid = null) => sql.prepare("INSERT INTO dist_social (clip, channel_id, platform, slot_ms, source, rule, state, post_id, updated) VALUES (?, ?, ?, ?, 'auto', 0, ?, ?, ?) ON CONFLICT(clip, channel_id) DO UPDATE SET slot_ms = excluded.slot_ms, state = excluded.state, post_id = excluded.post_id").run(clip, ch, ch.split('-')[1], Math.round(t), state, pid, now);
const board = async (clip, ch, st, pid, by = 'boss@lexkite.com') => { const id = await A.boardId(clip, ch); sql.prepare("INSERT INTO soc_board (id, post_id, clip, title, caption, accounts, plats, state, mode, want_at, hash, approved_by, approved_at, note, created, updated, by_who) VALUES (?, ?, ?, 'T ' || ?, 'Cap ' || ?, ?, ?, ?, 'sched', 0, ?, ?, ?, 'autopilot', ?, ?, 'autopilot')")
  .run(id, pid, clip, clip, clip, JSON.stringify([ch.split('-').pop()]), JSON.stringify([ch.split('-')[1]]), st, st === 'review' ? null : 'h', st === 'review' ? null : by, st === 'review' ? null : now, now, now); return id; };
const ds = (clip, ch) => sql.prepare('SELECT * FROM dist_social WHERE clip = ? AND channel_id = ?').get(clip, ch);
const lk = (clip, ch) => sql.prepare('SELECT * FROM soc_lock WHERE clip = ? AND channel_id = ?').get(clip, ch);
const bd = id => sql.prepare('SELECT * FROM soc_board WHERE id = ?').get(id);
const stt = () => JSON.parse(sql.prepare("SELECT v FROM soc_meta WHERE k = 'auto_state'").get().v);
const reels = clip => MG.calls.filter(c => c.p === '123456789/video_reels' && c.f.upload_phase === 'finish' && c.f.description === 'Cap ' + clip);
const sleep = async () => {};

// Kịch bản A: GrabCast sập (503 db_budget_guard). FB clip A: GrabCast đã lên lịch p_1 lúc +1 giờ (owner đã duyệt). IG clip A: đã duyệt, chưa có bài GrabCast, slot +2,5 giờ. FB clip B: chờ duyệt.
GC.posts.p_1 = { id: 'p_1', status: 'scheduled', caption: 'Cap ' + CA, targets: [{ account_id: 2, platform: 'facebook_page' }] };
due(CA, 'gc-facebook_page-2', now + H, 'pushed', 'p_1'); const bA = await board(CA, 'gc-facebook_page-2', 'scheduled', 'p_1');
due(CA, 'gc-instagram-3', now + 2.5 * H); const bAi = await board(CA, 'gc-instagram-3', 'approved', null);
due(CB, 'gc-facebook_page-2', now + 2 * H); const bB = await board(CB, 'gc-facebook_page-2', 'review', null);
GC.down = true; gcCalls = []; MG.calls = [];
let r = await A.runAuto(ENV, { now, sleep });
ok(/db_budget/.test(String(r.stop)) && r.provider.cur === 'meta' && r.provider.why === 'db_budget_guard', `lượt 1: GrabCast 503 db_budget_guard → cầu dao + chuyển Meta NGAY trong lượt (${r.stop} ${JSON.stringify(r.provider)})`);
ok(r.alerts.length === 1 && r.alerts[0].k === 'failover' && /Meta/.test(r.alerts[0].text), 'cảnh báo failover (1 issue/email) giao cho CI');
gcCalls = []; r = await A.runAuto(ENV, { now: now + M60, sleep });

ok(r.provider.cur === 'meta' && !r.alerts.length && !gcCalls.length, 'lượt 2: cầu dao còn mở → Meta, 0 lượt GrabCast, không báo lại');
ok(!reels(CA).length && lk(CA, 'gc-facebook_page-2').gc_cancel === 'pending' && r.skipped.some(s => s.clip === CA && s.why === 'meta-wait'), 'FB đã lên lịch trên GrabCast, không hủy được → CHƯA đăng Meta (chờ slot + 30 phút), ghi hủy treo');
ok(MG.calls.some(c => c.p === '178000000001/media' && c.f.media_type === 'REELS' && /^https:\/\/lexkite\.com\/api\/admin-shorts\?/.test(c.f.video_url) && c.f.caption === 'Cap ' + CA) && lk(CA, 'gc-instagram-3').container, 'IG: container REELS (video_url ký từ lexkite.com, caption đã duyệt) ≤ 3 giờ trước slot');
ok(!MG.calls.some(c => c.p === '178000000001/media_publish'), 'IG chưa tới giờ → chưa media_publish');
ok(!reels(CB).length && bd(bB).state === 'review' && r.skipped.some(s => s.clip === CB && s.why === 'waiting-approval'), 'bài CHƯA DUYỆT không công khai qua Meta');
ok(MG.calls.every(c => c.h.Authorization === 'Bearer ' + (c.host === 'graph.instagram.com' ? TOKI : TOK) && (c.p === 'debug_token' || !c.url.includes(TOK))), 'mỗi kênh token riêng ở header (FB → graph.facebook.com, IG → graph.instagram.com), không vào URL (trừ debug_token)');
ok(MG.calls.some(c => c.host === 'graph.instagram.com' && c.p === '178000000001/media') && !MG.calls.some(c => c.host === 'graph.facebook.com' && /^178/.test(c.p)), 'IG đi Instagram Login (graph.instagram.com), không qua Page FB');
ok(MG.calls.some(c => c.p === 'debug_token') && stt().meta.th['gc-facebook_page-2'].ok && stt().meta.th['gc-facebook_page-2'].expires_at === 0, 'kiểm sức khỏe Page token (debug_token) – không hết hạn');

// tới giờ IG + quá slot FB + 30 phút: FB đăng ngay, IG media_publish
MG.calls = []; r = await A.runAuto(ENV, { now: now + 1.6 * H, sleep });
const fbRe = reels(CA);
ok(fbRe.length === 1 && fbRe[0].f.video_state === 'PUBLISHED' && MG.calls.some(c => c.host === 'rupload.facebook.com' && c.h.file_url && /admin-shorts/.test(c.h.file_url)), 'FB: quá slot + 30 phút → Reel PUBLISHED qua Reels API (start → rupload file_url → finish)');
ok(lk(CA, 'gc-facebook_page-2').state === 'posted' && lk(CA, 'gc-facebook_page-2').provider === 'meta' && /^https:\/\/www\.facebook\.com\/reel\/9\d+$/.test(lk(CA, 'gc-facebook_page-2').permalink), 'khóa: provider meta, posted, permalink');
ok(/^meta_fb_9\d+$/.test(ds(CA, 'gc-facebook_page-2').post_id) && ds(CA, 'gc-facebook_page-2').state === 'published' && bd(bA).state === 'published' && !bd(bA).post_id && JSON.parse(bd(bA).links)[0].v === 'meta' && /facebook\.com\/reel/.test(JSON.parse(bd(bA).links)[0].u), 'dist_social + soc_board: published, provider meta, permalink (bỏ post_id GrabCast)');
ok(MG.calls.some(c => c.p === '178000000001/content_publishing_limit') && MG.calls.some(c => c.p === '178000000001/media_publish') && lk(CA, 'gc-instagram-3').state === 'posted' && /instagram\.com\/reel/.test(lk(CA, 'gc-instagram-3').permalink), 'IG: FINISHED → kiểm giới hạn 24 giờ → media_publish → permalink');
MG.calls = []; r = await A.runAuto(ENV, { now: now + 1.7 * H, sleep });
ok(!MG.calls.some(c => /video_reels|media_publish|\/media$/.test(c.p)), 'lượt sau: không đăng lại (khóa clip + kênh)');

// duyệt tay khi đang đi Meta → lượt sau đăng (FB lên lịch native vì slot còn ≥ 15 phút)
const ap = await A.autoOpFor('POST', 'lk/auto/approve')({ db: DB, b: { id: bB }, who: 'boss@lexkite.com' });
ok(ap.state === 'approved' && bd(bB).approved_by === 'boss@lexkite.com', 'Quản trị "Duyệt (Meta)" → approved');
let bad = 0; try { await A.autoOpFor('POST', 'lk/auto/approve')({ db: DB, b: { id: bB }, who: 'x' }); } catch (e) { bad = e.status; } ok(bad === 409, 'duyệt lại bài không còn ở Chờ duyệt → 409');
MG.calls = []; r = await A.runAuto(ENV, { now: now + 1.75 * H, sleep });
const fbB = reels(CB);
ok(fbB.length === 1 && fbB[0].f.video_state === 'SCHEDULED' && +fbB[0].f.scheduled_publish_time === Math.floor(Math.round(now + 2 * H) / 1000) && lk(CB, 'gc-facebook_page-2').state === 'scheduled' && ds(CB, 'gc-facebook_page-2').state === 'pushed', 'FB còn ≥ 15 phút tới slot → Reel SCHEDULED đúng slot qua Meta');
MG.calls = []; r = await A.runAuto(ENV, { now: now + 2.7 * H, sleep });ok(!reels(CB).length && lk(CB, 'gc-facebook_page-2').state === 'posted' && ds(CB, 'gc-facebook_page-2').state === 'published', 'sau slot: kiểm video đã lên (GET) → published, không đăng lại');

// IG container ERROR + giới hạn 24 giờ
due(CC, 'gc-instagram-3', now + 3 * H); const bC = await board(CC, 'gc-instagram-3', 'approved', null);
MG.nextErr = true; MG.calls = []; r = await A.runAuto(ENV, { now: now + 2.75 * H, sleep });
ok(!lk(CC, 'gc-instagram-3').container && /ig-container/.test(lk(CC, 'gc-instagram-3').err) && ds(CC, 'gc-instagram-3').state === 'failed' && /^meta-ig-container/.test(ds(CC, 'gc-instagram-3').err) && !MG.calls.some(c => c.p === '178000000001/media_publish'), 'IG container ERROR → không publish, ghi lỗi (dist_social failed), xóa container để thử lại');
MG.nextErr = false; MG.quota = 25;
MG.calls = []; r = await A.runAuto(ENV, { now: now + 2.8 * H, sleep });
ok(r.skipped.some(s => s.clip === CC && s.why === 'ig-limit') && lk(CC, 'gc-instagram-3').container && !MG.calls.some(c => c.p === '178000000001/media_publish'), 'IG đã 25 bài/24 giờ → không publish (giới hạn của Lexkite ≤ 100 của Meta), giữ container');
MG.quota = 0; MG.igStatus[lk(CC, 'gc-instagram-3').container] = 'ERROR';
MG.calls = []; r = await A.runAuto(ENV, { now: now + 2.85 * H, sleep });
MG.calls = []; r = await A.runAuto(ENV, { now: now + 2.9 * H, sleep });
ok(r.skipped.some(s => s.clip === CC && s.why === 'meta-gave-up') && !MG.calls.some(c => c.p === '178000000001/media'), 'lỗi lặp 2 lần → bỏ qua tới khi owner xem (không đốt lượt Graph)');
MG.quota = 0;

// Page token bị thu hồi → CHỈ kênh FB dừng 12 giờ + cảnh báo; kênh IG vẫn đăng
{ const s = stt(); delete s.meta.th['gc-facebook_page-2']; sql.prepare("UPDATE soc_meta SET v = ? WHERE k = 'auto_state'").run(JSON.stringify(s)); }
due(CE, 'gc-instagram-3', now + 3.2 * H); await board(CE, 'gc-instagram-3', 'approved', null);
MG.revoked = true; MG.calls = []; r = await A.runAuto(ENV, { now: now + 3 * H, sleep });
ok(/gc-facebook_page-2 token:/.test(r.meta.stop) && stt().meta.br['gc-facebook_page-2'].until === now + 15 * H && r.alerts.some(a => a.k === 'meta-token:gc-facebook_page-2'), `Page token bị thu hồi (190) → kênh FB dừng 12 giờ + cảnh báo (${r.meta.stop})`);
ok(lk(CE, 'gc-instagram-3') && lk(CE, 'gc-instagram-3').state === 'posted' && !stt().meta.br['gc-instagram-3'], 'kênh IG không bị ảnh hưởng: vẫn đăng trong cùng lượt');
ok(sql.prepare('SELECT status FROM soc_tokens WHERE channel_id = ?').get('gc-instagram-3').status === 'ok', 'trạng thái token IG giữ ok');
ok(!JSON.stringify(r).includes(TOK) && !JSON.stringify(r).includes(TOKI) && !sql.prepare("SELECT group_concat(v) AS v FROM soc_meta").get().v.includes(TOK) && !JSON.stringify(sql.prepare('SELECT * FROM soc_lock').all()).includes(TOK) && !JSON.stringify(sql.prepare('SELECT * FROM soc_tokens').all()).includes(TOKI), 'token không lọt vào kết quả lượt / D1 bản rõ (scrub cả thông báo lỗi Meta)');
MG.revoked = false;
await A.autoOpFor('POST', 'lk/auto/reset')({ db: DB });
// IG token còn ≤ 10 ngày → refresh (graph.instagram.com/refresh_access_token) → token mới mã hóa vào D1; lỗi refresh → cảnh báo
sql.prepare('UPDATE soc_tokens SET expires_at = ?, refreshed_at = ? WHERE channel_id = ?').run(now + 5 * 864e5, now - 2 * 864e5, 'gc-instagram-3');
MG.refreshFail = true; MG.calls = []; r = await A.runAuto(ENV, { now: now + 3.3 * H, sleep });
ok(MG.calls.some(c => c.p === '/refresh_access_token') && r.alerts.some(a => a.k === 'meta-token:gc-instagram-3:refresh') && sql.prepare('SELECT status FROM soc_tokens WHERE channel_id = ?').get('gc-instagram-3').status === 'refresh-failed', 'refresh IG lỗi → cảnh báo + đánh dấu token, kênh bị dừng');
await A.autoOpFor('POST', 'lk/auto/reset')({ db: DB }); MG.refreshFail = false; sql.prepare("UPDATE soc_tokens SET status = 'ok' WHERE channel_id = ?").run('gc-instagram-3');
MG.calls = []; r = await A.runAuto(ENV, { now: now + 3.4 * H, sleep });
const tr = sql.prepare('SELECT * FROM soc_tokens WHERE channel_id = ?').get('gc-instagram-3');
ok(MG.calls.some(c => c.p === '/refresh_access_token') && tr.last4 === TOKI2.slice(-4) && tr.refreshed_at === now + 3.4 * H && Math.abs(tr.expires_at - (now + 3.4 * H + 60 * 864e5)) < 1000 && !tr.enc.includes(TOKI2), 'refresh IG (~ngày 50) → token mới (60 ngày) lưu mã hóa');
{ const M2 = await import(new URL('../../functions/api/_meta_tokens.js', import.meta.url)); ok(await M2.tokenOf(ENV, DB, { channel_id: 'gc-instagram-3', src: 'd1' }) === TOKI2, 'giải mã đúng token mới'); }


// GrabCast hồi phục → lượt GrabCast hủy bài treo p_1 (unschedule + cancel), quay về grabcast + báo hồi phục
{ const s = stt(); delete s.breaker; sql.prepare("UPDATE soc_meta SET v = ? WHERE k = 'auto_state'").run(JSON.stringify(s)); } // cầu dao GrabCast hết hạn
GC.down = false; gcCalls = []; MG.calls = [];
r = await A.runAuto(ENV, { now: now + 4 * H, sleep });
ok(r.provider.cur === 'grabcast' && stt().provider.prev === 'meta' && r.alerts.some(a => /^recovered/.test(a.k)), 'GrabCast hồi phục → provider grabcast + báo hồi phục');
ok(gcCalls.some(c => c.p === 'posts/p_1/unschedule') && gcCalls.some(c => c.p === 'posts/p_1/cancel') && GC.posts.p_1.status === 'cancelled' && lk(CA, 'gc-facebook_page-2').gc_cancel === 'done', 'bài GrabCast treo của bài Meta đã đăng → unschedule + cancel (không đăng trùng)');
ok(!MG.calls.length, 'provider grabcast → 0 lượt Graph');

// Kịch bản B: GrabCast sống nhưng TRỄ (đã lên lịch, quá slot + 30 phút chưa đăng) → GET + unschedule/cancel → đăng Meta
GC.posts.p_9 = { id: 'p_9', status: 'scheduled', caption: 'Cap ' + CD, targets: [{ account_id: 2, platform: 'facebook_page' }] };
due(CD, 'gc-facebook_page-2', now + 4 * H, 'pushed', 'p_9'); const bD = await board(CD, 'gc-facebook_page-2', 'scheduled', 'p_9');
gcCalls = []; MG.calls = [];
r = await A.runAuto(ENV, { now: now + 4.6 * H, sleep });ok(r.provider.cur === 'meta' && r.provider.why === 'late', `GrabCast trễ (slot + 36 phút, GET posts/{id} vẫn scheduled) → provider meta, lý do late (${JSON.stringify(r.provider)})`);
ok(gcCalls.filter(c => c.p === 'posts/p_9').length >= 1 && gcCalls.some(c => c.p === 'posts/p_9/unschedule') && GC.posts.p_9.status === 'cancelled', 'trước khi đăng Meta: kiểm GET posts/{id} chưa published + unschedule/cancel trên GrabCast');
ok(reels(CD).length === 1 && lk(CD, 'gc-facebook_page-2').gc_cancel === 'done' && bd(bD).state === 'published', 'đăng Meta 1 lần, khóa ghi hủy GrabCast xong');
// GrabCast đã đăng rồi (không trễ thật) → không đăng Meta
GC.posts.p_10 = { id: 'p_10', status: 'published', caption: 'Cap ' + CB, targets: [{ account_id: 3, platform: 'instagram', state: 'published' }] };
due(CB, 'gc-instagram-3', now + 4 * H, 'pushed', 'p_10'); await board(CB, 'gc-instagram-3', 'scheduled', 'p_10');
MG.calls = []; r = await A.runAuto(ENV, { now: now + 4.7 * H, sleep });
ok(!MG.calls.some(c => /media/.test(c.p)) && ds(CB, 'gc-instagram-3').state === 'published', 'GET cho thấy GrabCast đã đăng → không đăng Meta, đánh dấu published');
// chế độ tay: luôn GrabCast → không failover dù GrabCast sập
await A.autoOpFor('POST', 'lk/auto/provider')({ db: DB, b: { mode: 'grabcast' } }); GC.down = true; await A.autoOpFor('POST', 'lk/auto/reset')({ db: DB });
MG.calls = []; await A.runAuto(ENV, { now: now + 5 * H, sleep }); r = await A.runAuto(ENV, { now: now + 5.1 * H, sleep });
ok(r.provider.cur === 'grabcast' && !MG.calls.length, 'chế độ "Luôn GrabCast" → không bao giờ gọi Meta');
bad = 0; try { await A.autoOpFor('POST', 'lk/auto/provider')({ db: DB, b: { mode: 'x' } }); } catch (e) { bad = e.status; } ok(bad === 400, 'provider lạ → 400');
const S = await A.autoStatus(ENV, now + 5.1 * H);
ok(S.provider.mode === 'grabcast' && S.meta.configured && S.meta.tokens.some(t => t.src === 'env' && t.channel_id === 'gc-facebook_page-2') && S.meta.tokens.some(t => t.src === 'd1' && t.kind === 'ig' && t.last4 === TOKI2.slice(-4)) && !JSON.stringify(S).includes(TOKI2) && S.upcoming.some(u => u.provider === 'meta' && /facebook\.com\/reel/.test(u.permalink || '')) && !JSON.stringify(S).includes(TOK), 'trạng thái Quản trị: provider, Meta, kênh, permalink từng bài – không lộ token');

// ---------- 3) D1 theo chỉ mục ----------
{
  const plan = q => sql.prepare('EXPLAIN QUERY PLAN ' + q).all().map(x => x.detail).join(' | ');
  const qs = {
    late: "SELECT clip, channel_id, platform, slot_ms, post_id FROM dist_social WHERE slot_ms BETWEEN 1 AND 2 AND state = 'pushed' LIMIT 20",
    meta_rows: 'SELECT clip, channel_id, platform, slot_ms, state, post_id FROM dist_social WHERE slot_ms BETWEEN 1 AND 2 ORDER BY slot_ms LIMIT 60',
    cancel: "SELECT clip, channel_id, gc_post FROM soc_lock WHERE gc_cancel = 'pending' LIMIT 3",
    lock: "SELECT * FROM soc_lock WHERE clip = 'x' AND channel_id = 'y'",
    token: "SELECT enc FROM soc_tokens WHERE channel_id = 'x'",
  };
  for (const [k, q] of Object.entries(qs)) { const p = plan(q); ok(!/\bSCAN (dist_social|soc_lock)\b(?! USING)/.test(p), `${k}: dùng chỉ mục – ${p}`); }
}

// ---------- 4) Thẻ Quản trị (jsdom) ----------
{
  const code = fs.readFileSync(new URL('../../web/js/admin-social-mgr.js', import.meta.url), 'utf8');
  const jsdom = (await import('jsdom')).default, dom = new jsdom.JSDOM('<!doctype html><html><head></head><body><main id="m"></main></body></html>', { url: 'https://lexkite.com/admin.html', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, doc = w.document; w.eval(code); const EN = w.AdminSocialMgr._t.EN;
  const card = code.slice(code.indexOf('async function autoCard'), code.indexOf('async function queue('));
  const maps = [...card.matchAll(/(?:PW|MODES|TW) = \{([^}]+)\}/g)].flatMap(m => [...m[1].matchAll(/: '([^']+)'/g)].map(x => x[1]));
  ok(maps.length >= 10 && maps.every(k => k in EN), 'lý do failover + chế độ: đủ tiếng Anh – thiếu: ' + maps.filter(k => !(k in EN)).join(' | '));
  let confAns = () => true, calls = []; w.confirm = m => confAns(m);
  const AS = JSON.parse(JSON.stringify(S)); AS.provider = { cur: 'meta', why: 'db_budget_guard', since: now, mode: 'auto' }; AS.cfg.provider = 'auto';
  AS.upcoming = [{ clip: CB, channel_id: 'gc-facebook_page-2', platform: 'facebook_page', slot_ms: now + H, state: 'planned', board: 'review', board_id: 'b_apX1', provider: null }, { clip: CA, channel_id: 'gc-facebook_page-2', platform: 'facebook_page', slot_ms: now, state: 'published', board: 'published', board_id: 'b_apX2', provider: 'meta', permalink: 'https://www.facebook.com/reel/900001' }];
  const sapi = async (m, p, b) => { calls.push([p, b]); if (p === 'lk/auto') return JSON.parse(JSON.stringify(AS)); if (p === 'lk/auto/provider') return { cfg: A.cleanAuto({ ...AS.cfg, provider: b.mode }) }; if (p === 'lk/auto/save') return { cfg: A.cleanAuto(b.cfg) }; if (p === 'lk/rules') return { rules: MGR.cleanRules({}) }; return { ok: true, state: 'approved' }; };
  const lang = { v: 'vi' }, ctx = { sapi, L: (s, v) => (v ? s.replace(/\{(\w+)\}/g, (x, k) => (v[k] != null ? v[k] : x)) : s), esc: s => String(s ?? '').replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';'), lang: () => lang.v, D: { accounts: [] }, errText: e => String(e && e.message || e), accById: () => null, modal: () => {}, both: x => x, alive: () => true, LS: { get: (k, d) => d, set: () => {} } };
  const flush = async (k = 15) => { for (let i = 0; i < k; i++) await new Promise(res => setTimeout(res, 0)); };
  const main = doc.getElementById('m'); w.AdminSocialMgr.paint('queue', main, ctx); await flush();
  const ap = main.querySelector('#smgAP'), t = ap ? ap.textContent : '';  ok(/Đường đăng FB\/IG/.test(t) && /Meta API/.test(t) && /GrabCast quá tải/.test(t) && /không hết hạn/.test(t), 'thẻ: provider đang dùng + lý do failover + token');
  ok(ap.querySelector('a[href="https://www.facebook.com/reel/900001"]') && ap.querySelector('[data-apv="b_apX1"]'), 'bảng sắp đăng: permalink Meta + nút Duyệt (Meta) cho bài chờ duyệt');
  ap.querySelector('[data-apv="b_apX1"]').click(); await flush();
  ok(calls.some(([p, b]) => p === 'lk/auto/approve' && b.id === 'b_apX1'), 'Duyệt (Meta) → lk/auto/approve');
  const ap2 = main.querySelector('#smgAP'); ap2.querySelector('#apMode').value = 'meta'; ap2.querySelector('#apProv').click(); await flush();
  ok(calls.some(([p, b]) => p === 'lk/auto/provider' && b.mode === 'meta'), 'nút chuyển tay provider → lk/auto/provider');
  const ap3 = main.querySelector('#smgAP'); ap3.querySelector('#apTkCh').value = 'gc-instagram-3'; ap3.querySelector('#apTkV').value = TOKI; ap3.querySelector('#apTkSave').click(); await flush();
  ok(calls.some(([p, b]) => p === 'lk/auto/token' && b.channel_id === 'gc-instagram-3' && b.token === TOKI) && !main.innerHTML.includes(TOKI), 'lưu token kênh → lk/auto/token, ô token xóa sau khi gửi, không hiện lại token');
  ok(/…IGT2|…KEN2/.test(main.querySelector('#smgAP').textContent) && main.querySelector('[data-tdel="gc-instagram-3"]') && !main.querySelector('[data-tdel="gc-facebook_page-2"]'), 'bảng token theo kênh: chỉ last4; token secret (env) không có nút Xóa');
  lang.v = 'en'; main.innerHTML = ''; w.AdminSocialMgr.paint('queue', main, ctx); await flush();
  const te = main.querySelector('#smgAP').textContent;
  ok(/FB\/IG route/.test(te) && /GrabCast overloaded/.test(te) && /Approve \(Meta\)/.test(te) && !/[ăđơư]|[ạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(te), 'tiếng Anh: khối Meta không sót tiếng Việt');
}

console.log(fails ? `✗ social-meta: ${fails}/${n} lỗi` : `✓ social-meta: ${n} kiểm tra đạt (failover, chống trùng, IG container, token, hồi phục, chỉ mục D1, UI)`);
process.exit(fails ? 1 : 0);
