// Test autopilot social (functions/api/_social_auto.js + /api/social-auto + /api/social/webhook + thẻ Quản trị trong web/js/admin-social-mgr.js):
// hàm thuần (cài đặt mặc định an toàn, cầu dao, ngân sách, cửa sổ đến hạn, Idempotency-Key ổn định), 1 lượt đầu-cuối với D1 sqlite + GrabCast giả
// (bài NHÁP chờ duyệt khi tự duyệt TẮT, tự lên lịch đúng slot khi đủ N bài duyệt tay, không tạo trùng, dừng cả lượt khi 401/503, kill switch, hết ngân sách,
// đồng bộ trạng thái → dist_social 'published'), truy vấn D1 theo chỉ mục (EXPLAIN), chữ ký HMAC (CI + webhook), UI (jsdom, đủ tiếng Anh). Chạy: node scripts/test/social-auto.mjs
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
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
const MGR = await import(new URL('../../functions/api/_social_mgr.js', import.meta.url));
const DATA = (await import(new URL('../../functions/api/_shorts_data.js', import.meta.url))).default;
const [CA, CB, CC] = DATA.index.items.map(x => x.id);
const H = 36e5, now = Date.now();

// ---------- 1) Hàm thuần ----------
{
  const d = A.cleanAuto({});
  ok(d.on === true && d.auto_approve === false && d.plats.facebook_page && d.plats.instagram && !d.plats.tiktok && !d.plats.youtube && !d.plats.threads, 'mặc định: chạy, TỰ DUYỆT TẮT, chỉ FB + IG (TikTok/YouTube chờ duyệt app)');
  const c = A.cleanAuto({ manual_first: 0, max_per_run: 99, daily_calls: 9999, lookahead_h: 1, lead_min: 1, sync_h: 1, plats: { tiktok: 1 } });
  ok(c.manual_first === 1 && c.max_per_run === 5 && c.daily_calls === 120 && c.lookahead_h === 2 && c.lead_min === 10 && c.sync_h === 3 && c.plats.tiktok && c.plats.facebook_page, 'kẹp: ≥ 1 bài duyệt tay, ≤ 5 bài/lượt, ≤ 120 lượt GrabCast/ngày, đồng bộ ≥ 3 giờ');
  ok(A.breakerMs(401) === 12 * H && A.breakerMs(403) === 12 * H && A.breakerMs(409) && A.breakerMs(422) && A.breakerMs(429) && A.breakerMs(503) && A.breakerMs(500) && !A.breakerMs(400) && !A.breakerMs(404) && !A.breakerMs(200), 'cầu dao: 401/403/409/422/429/503/5xx dừng; 400/404 chỉ lỗi 1 bài');
  ok(!A.canAutoApprove({ ...d, auto_approve: false }, 'facebook_page', { facebook_page: 99 }) && !A.canAutoApprove({ ...d, auto_approve: true, manual_first: 5 }, 'facebook_page', { facebook_page: 4 }) && A.canAutoApprove({ ...d, auto_approve: true, manual_first: 5 }, 'facebook_page', { facebook_page: 5 }), 'tự duyệt chỉ khi công tắc BẬT và đủ N bài duyệt tay trên nền tảng đó');
  const rows = [{ platform: 'facebook_page', account_id: '2', slot_ms: now + 5 * 60e3 }, { platform: 'facebook_page', account_id: '2', slot_ms: now + 3 * H }, { platform: 'tiktok', account_id: '4', slot_ms: now + 2 * H }, { platform: 'instagram', account_id: '3', slot_ms: now + 2 * H }, { platform: 'instagram', account_id: '', slot_ms: now + 2 * H }, { platform: 'facebook_page', account_id: '2', slot_ms: now + 40 * H }];
  ok(A.pickDue(rows, d, now).map(r => r.platform + '@' + Math.round((r.slot_ms - now) / H)).join() === 'instagram@2,facebook_page@3', 'đến hạn: trong [now + 20 phút, now + 30 giờ], nền tảng bật, có tài khoản, sớm nhất trước');
  ok(await A.idemKey(CA, 'gc-facebook_page-2', 'c') === await A.idemKey(CA, 'gc-facebook_page-2', 'c') && await A.idemKey(CA, 'gc-facebook_page-2', 'c') !== await A.idemKey(CA, 'gc-instagram-3', 'c') && /^[A-Za-z0-9_-]{8,80}$/.test(await A.idemKey(CA, 'x', 's')), 'Idempotency-Key ổn định theo clip + kênh + bước, hợp lệ cho GrabCast');
  ok(/^b_[A-Za-z0-9_-]{6,60}$/.test(await A.boardId(CA, 'gc-facebook_page-2')), 'id mục duyệt đúng dạng soc_board');
  ok(A.budgetLeft({ calls: { day: A.dayOf(now), n: 50 } }, d, now) === 10 && A.budgetLeft({ calls: { day: '2000-01-01', n: 50 } }, d, now) === 60, 'ngân sách theo ngày UTC, qua ngày đặt lại');
}

// ---------- 2) Đầu-cuối: 1 lượt autopilot ----------
const KEY = 'gk_live_SECRET_auto_123456', CLI = 'cli-key-for-tests-0123456789abcdef';
const GC = { posts: {}, fail: {}, n: 0 }; let calls = [];
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url);
  if (u.hostname === 'lexkite.com' && u.pathname === '/api/admin-shorts') return new Response(new Uint8Array(1000), { status: 200, headers: { 'Content-Length': '1000' } }); // bản master (URL ký)
  if (u.hostname === 'upload.example') { calls.push({ m: init.method, p: 'PUT' }); return new Response('', { status: 200 }); }
  if (u.hostname === 'api.github.com') return new Response('no', { status: 404 });
  const p = u.pathname.replace('/api/social/', ''), J = (b, s = 200) => new Response(JSON.stringify(b), { status: s });
  calls.push({ m: init.method, p, h: init.headers || {}, body: init.body && JSON.parse(init.body) });
  const f = GC.fail[init.method + ' ' + p.replace(/\/p_\d+/, '/:id')]; if (f) return J({ error: { code: 'x_' + f } }, f);
  if (p === 'accounts') return J({ accounts: [{ id: 2, platform: 'facebook_page', display_name: 'Lexkite', kinds: ['reel'] }, { id: 3, platform: 'instagram', display_name: 'lexkite.app', kinds: ['reel'] }, { id: 5, platform: 'facebook_page', display_name: 'Lexkite 2', kinds: ['reel'] }] });
  if (p === 'posts' && init.method === 'GET') return J({ posts: Object.values(GC.posts) });
  if (p === 'posts' && init.method === 'POST') { const k = (init.headers || {})['Idempotency-Key'], ex = Object.values(GC.posts).find(x => x._k === k); if (ex) return J({ post: ex }); const id = 'p_' + (++GC.n), b = JSON.parse(init.body); GC.posts[id] = { id, status: 'draft', _k: k, ...b, targets: b.targets.map(t => ({ ...t, platform: t.account_id === 3 ? 'instagram' : 'facebook_page' })) }; return J({ post: GC.posts[id] }); }
  if (p === 'media/upload-url') return J({ upload: { url: 'https://upload.example/x', method: 'PUT' }, media: { id: 'm_up' } });
  if (/^media\/[^/]+\/complete$/.test(p)) return J({ media: { id: 'm_up' } });
  let m = /^posts\/([^/]+)$/.exec(p); if (m) return GC.posts[m[1]] ? J({ post: GC.posts[m[1]] }) : J({ error: { code: 'not_found' } }, 404);
  m = /^posts\/([^/]+)\/schedule$/.exec(p); if (m) { Object.assign(GC.posts[m[1]], { status: 'scheduled', scheduled_at: JSON.parse(init.body).scheduled_at }); return J({ post: GC.posts[m[1]] }); }
  return J({});
};
if (typeof FixedLengthStream === 'undefined') globalThis.FixedLengthStream = class { constructor() { const t = new TransformStream(); this.readable = t.readable; this.writable = t.writable; } };
const ENV = { DB, GRABCAST_API_KEY: KEY, SHORTS_READ_TOKEN: 'ro', LEXKITE_DRIVE_CLI_KEY: CLI, GRABCAST_WEBHOOK_SECRET: 'whsec_0123456789abcdefghijklmn' };
await MGR.setupMgr(DB);
sql.exec('CREATE TABLE yt_queue (clip TEXT PRIMARY KEY, status TEXT, title TEXT, approved_at INTEGER); CREATE TABLE clip_review (clip TEXT PRIMARY KEY, state TEXT, deleted INTEGER, web INTEGER)');
for (const c of [CA, CB]) sql.prepare("INSERT INTO yt_queue (clip, status) VALUES (?, 'manual')").run(c); // CC chưa duyệt
await A.runAuto({ ...ENV, GRABCAST_API_KEY: '' }, { now }); // tạo bảng (setupDist) – không có khóa → không gọi gì
ok(calls.length === 0 && JSON.parse(sql.prepare("SELECT v FROM soc_meta WHERE k = 'auto_state'").get().v).last_run.stop === 'no-key', 'thiếu GRABCAST_API_KEY → dừng "no-key", 0 lượt gọi');
const ext = sql.prepare('INSERT INTO dist_ext (channel_id, platform, account_id, title, status, updated) VALUES (?, ?, ?, ?, ?, ?)');
ext.run('gc-facebook_page-2', 'facebook_page', '2', 'Lexkite', 'ok', now); ext.run('gc-instagram-3', 'instagram', '3', 'lexkite.app', 'ok', now); ext.run('gc-tiktok-4', 'tiktok', '4', 'TT', 'ok', now); ext.run('gc-facebook_page-5', 'facebook_page', '5', 'Lexkite 2', 'ok', now);
const due = (clip, ch, h) => sql.prepare("INSERT INTO dist_social (clip, channel_id, platform, slot_ms, source, rule, state, updated) VALUES (?, ?, ?, ?, 'auto', 0, 'planned', ?) ON CONFLICT(clip, channel_id) DO UPDATE SET slot_ms = excluded.slot_ms, state = 'planned'").run(clip, ch, ch.split('-')[1], Math.round(now + h * H), now);
due(CA, 'gc-facebook_page-2', 3); due(CA, 'gc-instagram-3', 5); due(CC, 'gc-facebook_page-2', 6); due(CB, 'gc-facebook_page-2', 8); due(CA, 'gc-tiktok-4', 4); due(CB, 'gc-instagram-3', 0.1); due(CB, 'gc-facebook_page-5', 40);
sql.prepare("INSERT INTO soc_meta (k, v, at) VALUES (?, ?, ?)").run('media:' + CA, JSON.stringify({ id: 'm_cached' }), now); // clip A đã có media (cache) – clip B phải tải lên
const st = () => JSON.parse(sql.prepare("SELECT v FROM soc_meta WHERE k = 'auto_state'").get().v);
const ds = (clip, ch) => sql.prepare('SELECT * FROM dist_social WHERE clip = ? AND channel_id = ?').get(clip, ch);
calls = [];
let r = await A.runAuto(ENV, { now });
const gcCalls = calls.filter(c => c.p !== 'PUT');
ok(r.due === 4 && r.created === 3 && r.review === 3 && r.scheduled === 0 && !r.stop, `lượt 1 (tự duyệt TẮT): 3 bài NHÁP chờ duyệt (đến hạn ${r.due}, tạo ${r.created}, lên lịch ${r.scheduled}, dừng ${r.stop})`);
ok(r.skipped.some(s => s.clip === CC && s.why === 'clip-not-approved'), 'clip chưa duyệt trong kho → bỏ qua');
ok(!gcCalls.some(c => /schedule|publish-now/.test(c.p)) && Object.values(GC.posts).every(p => p.status === 'draft' && !p.scheduled_at), 'không bài nào lên lịch/công khai khi chưa duyệt');
ok(r.calls === gcCalls.length && r.calls === 7, `đếm lượt GrabCast đúng (đồng bộ 2 + tải 2 + tạo 3 = 7; nhận ${r.calls}/${gcCalls.length})`);
ok(gcCalls.filter(c => c.p === 'posts' && c.m === 'POST').every(c => /^lkap-c-[0-9a-f]{40}$/.test(c.h['Idempotency-Key'])), 'tạo bài kèm Idempotency-Key cố định');
ok(calls.filter(c => c.p === 'media/upload-url').length === 1 && calls.some(c => c.p === 'PUT'), 'chỉ clip chưa có media mới tải lên (cache media dùng lại cho FB + IG)');
const p1 = Object.values(GC.posts).find(p => p.media_ids[0] === 'm_cached' && p.targets[0].account_id === 2);
ok(p1 && /Full lesson \+ quiz/.test(p1.caption) && p1.targets[0].kind === 'reel', 'nội dung từ socialMeta (hợp đồng social_due) – Reel FB');
const b1 = sql.prepare("SELECT * FROM soc_board WHERE post_id = ?").get(p1.id);
ok(b1 && b1.state === 'review' && b1.by_who === 'autopilot' && b1.want_at === ds(CA, 'gc-facebook_page-2').slot_ms && !b1.hash, 'soc_board: cột Chờ duyệt, giờ mong muốn = slot');
ok(ds(CA, 'gc-facebook_page-2').state === 'pushed' && ds(CA, 'gc-facebook_page-2').post_id === p1.id && ds(CA, 'gc-tiktok-4').state === 'planned' && ds(CB, 'gc-facebook_page-5').state === 'planned', 'social_ack pushed + post_id; TikTok (tắt) và slot ngoài cửa sổ không đụng');
calls = []; r = await A.runAuto(ENV, { now: now + 60e3 });
ok(r.created === 0 && calls.length === 0, 'lượt 2 ngay sau: không tạo trùng, 0 lượt GrabCast (đồng bộ chưa tới hạn)');
ok(st().calls.n === 7 && st().last_sync && st().last_sync.at === now, 'ngân sách ngày + lần đồng bộ lưu ở D1');

// duyệt tay trong Quản trị (board/approve) → lên lịch đúng slot
{
  const gc = (await import(new URL('../../functions/api/_grabcast.js', import.meta.url))).gcClient(ENV);
  const out = await MGR.OPS['POST board/approve']({ db: DB, b: { id: b1.id }, who: 'boss@lexkite.com', gc, idem: 'apv-test-1' });
  ok(out.state === 'scheduled' && GC.posts[p1.id].status === 'scheduled' && Date.parse(GC.posts[p1.id].scheduled_at) === ds(CA, 'gc-facebook_page-2').slot_ms, 'owner duyệt tay bài autopilot → GrabCast lên lịch đúng slot');
}
// tự duyệt: FB đã có 1 bài duyệt tay (manual_first = 1) → bài FB mới tự lên lịch; IG chưa có bài duyệt tay → chờ duyệt
sql.prepare("INSERT INTO soc_meta (k, v, at) VALUES ('auto', ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").run(JSON.stringify({ auto_approve: true, manual_first: 1 }), now);
due(CB, 'gc-instagram-3', 10); sql.prepare('UPDATE dist_social SET slot_ms = ? WHERE clip = ? AND channel_id = ?').run(Math.round(now + 9 * H), CB, 'gc-facebook_page-5');
calls = []; r = await A.runAuto(ENV, { now: now + 2 * 60e3 });
const p5 = Object.values(GC.posts).find(p => p.targets[0].account_id === 5), b5 = p5 && sql.prepare('SELECT * FROM soc_board WHERE post_id = ?').get(p5.id);
ok(r.scheduled === 1 && r.review === 1 && p5 && p5.status === 'scheduled' && Date.parse(p5.scheduled_at) === ds(CB, 'gc-facebook_page-5').slot_ms, `tự duyệt: FB (đủ 1 bài duyệt tay) tự lên lịch đúng slot, IG (0) chờ duyệt (lên lịch ${r.scheduled}, chờ ${r.review})`);
ok(b5 && b5.state === 'scheduled' && b5.approved_by === 'autopilot' && b5.hash && calls.some(c => /^lkap-s-/.test((c.h || {})['Idempotency-Key'] || '')), 'bài tự duyệt có dấu băm + approved_by autopilot + Idempotency-Key lên lịch');
ok((await MGR.approvalFor(ENV, p5.id, (await import(new URL('../../functions/api/_grabcast.js', import.meta.url))).gcClient(ENV))).ok, 'cổng duyệt của proxy chấp nhận bài tự duyệt (dấu băm khớp nội dung GrabCast)');
ok((await A.manualCounts(DB)).facebook_page === 1 && !(await A.manualCounts(DB)).instagram, 'đếm bài duyệt TAY theo nền tảng (không tính autopilot)');

// đồng bộ trạng thái (≥ 6 giờ) → Published ở bảng duyệt + dist_social
GC.posts[p1.id].status = 'published'; GC.posts[p1.id].targets[0].state = 'published';
calls = []; r = await A.runAuto(ENV, { now: now + 7 * H });
ok(r.synced && sql.prepare('SELECT state FROM soc_board WHERE post_id = ?').get(p1.id).state === 'published' && ds(CA, 'gc-facebook_page-2').state === 'published', 'đồng bộ nền: bài đã đăng → soc_board published + dist_social published');
ok(calls.filter(c => c.m === 'GET').length === 2, 'đồng bộ = đúng 2 lượt GET (accounts + posts), không poll');

// dừng cả lượt + cầu dao
GC.fail['POST posts'] = 503; due(CB, 'gc-facebook_page-2', 9.5); sql.prepare("UPDATE dist_social SET state = 'planned' WHERE clip = ? AND channel_id = 'gc-facebook_page-2'").run(CB);
sql.prepare("DELETE FROM soc_board WHERE clip = ? AND accounts = '[\"2\"]'").run(CB);
calls = []; r = await A.runAuto(ENV, { now: now + 8 * H });
ok(r.stop === 'x_503' && st().breaker && st().breaker.until === now + 8 * H + 2 * H && calls.filter(c => c.p === 'posts' && c.m === 'POST').length === 1, `GrabCast 503 → dừng cả lượt, không thử lại, cầu dao 2 giờ (dừng ${r.stop})`);
calls = []; r = await A.runAuto(ENV, { now: now + 9 * H });
ok(r.stop === 'breaker' && calls.length === 0, 'cầu dao mở → lượt sau 0 lượt gọi');
await A.autoOpFor('POST', 'lk/auto/reset')({ db: DB }); delete GC.fail['POST posts'];
ok(!st().breaker, 'Quản trị "Mở lại" xóa cầu dao');
GC.fail['GET accounts'] = 401;
calls = []; r = await A.runAuto(ENV, { now: now + 14 * H });
ok(r.stop === 'x_401' && st().breaker.until === now + 26 * H && calls.length === 1, 'khóa sai (401) → dừng ngay sau 1 lượt gọi, cầu dao 12 giờ');
await A.autoOpFor('POST', 'lk/auto/reset')({ db: DB }); delete GC.fail['GET accounts'];
// kill switch + ngân sách
await A.autoOpFor('POST', 'lk/auto/save')({ db: DB, b: { cfg: { on: false } } });
calls = []; r = await A.runAuto(ENV, { now: now + 15 * H });
ok(r.stop === 'off' && calls.length === 0, 'kill switch TẮT → 0 lượt gọi GrabCast');
ok(A.cleanAuto(JSON.parse(sql.prepare("SELECT v FROM soc_meta WHERE k = 'auto'").get().v)).auto_approve === true, 'lưu cài đặt giữ các trường cũ (gộp)');
await A.autoOpFor('POST', 'lk/auto/save')({ db: DB, b: { cfg: { on: true, daily_calls: 10 } } });
{ const s = st(); s.calls = { day: A.dayOf(now + 15 * H), n: 8 }; sql.prepare("UPDATE soc_meta SET v = ? WHERE k = 'auto_state'").run(JSON.stringify(s)); }
calls = []; r = await A.runAuto(ENV, { now: now + 15 * H });
ok(r.stop === 'budget' && calls.length === 0, 'còn < 3 lượt GrabCast hôm nay → không bắt đầu lượt');
const S = await A.autoStatus(ENV, now + 15 * H);
ok(S.key && S.webhook && S.cfg.daily_calls === 10 && S.budget_left === 2 && S.upcoming.length >= 3 && S.upcoming.some(u => u.board === 'scheduled'), 'trạng thái cho Quản trị: khóa, webhook, ngân sách, bài sắp đăng kèm cột duyệt');

// ---------- 3) D1 theo chỉ mục (không quét cả bảng) ----------
{
  const plan = q => sql.prepare('EXPLAIN QUERY PLAN ' + q).all().map(x => x.detail).join(' | ');
  const qs = {
    social_due: "SELECT s.*, e.account_id FROM dist_social s LEFT JOIN dist_ext e ON e.channel_id = s.channel_id WHERE s.state IN ('planned', 'failed') AND s.slot_ms BETWEEN 1 AND 2 ORDER BY s.slot_ms LIMIT 200",
    upcoming: 'SELECT s.clip FROM dist_social s LEFT JOIN dist_ext e ON e.channel_id = s.channel_id WHERE s.slot_ms BETWEEN 1 AND 2 ORDER BY s.slot_ms LIMIT 40',
    manual: "SELECT plats FROM soc_board WHERE state IN ('approved', 'scheduled', 'published') AND approved_by IS NOT NULL AND approved_by != 'autopilot' LIMIT 5000",
    mirror: "SELECT clip, accounts, plats FROM soc_board WHERE state = 'published' AND by_who = 'autopilot' AND updated > 1 LIMIT 200",
    dup: "SELECT post_id, accounts FROM soc_board WHERE clip = 'x' AND post_id IS NOT NULL AND state NOT IN ('idea', 'draft') LIMIT 50",
  };
  for (const [k, q] of Object.entries(qs)) { const p = plan(q); ok(!/\bSCAN (s|soc_board|dist_social)\b(?! USING)/.test(p), `${k}: dùng chỉ mục – ${p}`); }
}

// ---------- 4) Chữ ký: CI (/api/social-auto) + webhook ----------
{
  const SA = await import(new URL('../../functions/api/social-auto.js', import.meta.url));
  const sign = (text, ts = Math.floor(Date.now() / 1000)) => ({ 'X-Drive-Ts': String(ts), 'X-Drive-Sig': crypto.createHmac('sha256', CLI).update(ts + '.' + crypto.createHash('sha256').update(text).digest('hex')).digest('hex') });
  let ip = 1; const post = async (text, headers = {}) => SA.onRequestPost({ request: new Request('https://lexkite.com/api/social-auto', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.9.0.' + (ip++), ...headers }, body: text }), env: ENV });
  ok((await post('{"op":"run"}')).status === 403, 'CI: không ký → 403');
  ok((await post('{"op":"run"}', sign('{"op":"other"}'))).status === 403, 'CI: chữ ký sai thân → 403');
  ok((await post('{"op":"run"}', sign('{"op":"run"}', Math.floor(Date.now() / 1000) - 900))).status === 403, 'CI: chữ ký cũ > 5 phút → 403');
  const s = await post('{"op":"status"}', sign('{"op":"status"}')), sj = await s.json();
  ok(s.status === 200 && sj.cfg && !JSON.stringify(sj).includes(KEY), 'CI status 200, không lộ khóa GrabCast');
  const rr = await post('{"op":"run"}', sign('{"op":"run"}')), rj = await rr.json();
  ok(rr.status === 200 && rj.run && rj.run.src === 'cron', 'CI run 200 → 1 lượt (src cron)');
  const WH = await import(new URL('../../functions/api/social/webhook.js', import.meta.url));
  const sec = ENV.GRABCAST_WEBHOOK_SECRET, whSign = (body, ts = Math.floor(Date.now() / 1000), k = sec) => ({ 'X-GrabCast-Timestamp': String(ts), 'X-GrabCast-Signature': 'sha256=' + crypto.createHmac('sha256', k).update(ts + '.' + body).digest('hex') });
  const wh = async (body, headers, env = ENV) => WH.onRequestPost({ request: new Request('https://lexkite.com/api/social/webhook', { method: 'POST', headers: { 'CF-Connecting-IP': '10.8.0.' + (ip++), ...headers }, body }), env });
  const p5b = sql.prepare('SELECT post_id FROM soc_board WHERE approved_by = ? AND state = ?').get('autopilot', 'scheduled').post_id;
  const ev = JSON.stringify({ type: 'post.published', post: { ...GC.posts[p5b], status: 'published' } });
  ok((await wh(ev, whSign(ev), { ...ENV, GRABCAST_WEBHOOK_SECRET: '' })).status === 503, 'webhook: chưa có secret → 503 (không nhận gì)');
  ok((await wh(ev, whSign(ev, undefined, 'wrong-secret-0123456789abcdef'))).status === 401 && (await wh(ev, whSign(ev, Math.floor(Date.now() / 1000) - 600))).status === 401 && (await wh(ev, {})).status === 401, 'webhook: sai khóa / quá cũ / thiếu chữ ký → 401');
  const w1 = await wh(ev, whSign(ev));
  ok(w1.status === 200 && sql.prepare('SELECT state FROM soc_board WHERE post_id = ?').get(p5b).state === 'published' && ds(CB, 'gc-facebook_page-5').state === 'published', 'webhook ký đúng → bài Published ngay (bảng duyệt + dist_social)');
}

// ---------- 5) Thẻ Quản trị (jsdom) ----------
{
  const code = fs.readFileSync(new URL('../../web/js/admin-social-mgr.js', import.meta.url), 'utf8');
  const card = code.slice(code.indexOf('async function autoCard'), code.indexOf('async function queue('));
  const jsdom = (await import('jsdom')).default, dom = new jsdom.JSDOM('<!doctype html><html><head></head><body><main id="m"></main></body></html>', { url: 'https://lexkite.com/admin.html', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, doc = w.document; w.eval(code); const EN = w.AdminSocialMgr._t.EN;
  const keys = [...new Set([...card.matchAll(/\bM\('((?:[^'\\]|\\.)*)'/g)].map(m => m[1].replace(/\\'/g, "'")))], strs = [...card.matchAll(/(?:STOP|DS) = \{([^}]+)\}/g)].flatMap(m => [...m[1].matchAll(/: '([^']+)'/g)].map(x => x[1]));
  const kpi = [...card.matchAll(/\[\['Đến hạn'[^\n]*/g)].flatMap(m => [...m[0].matchAll(/\['([^']+)', /g)].map(x => x[1]));
  const missing = [...keys, ...strs, ...kpi].filter(k => !(k in EN));
  ok(keys.length > 25 && !missing.length, 'thẻ autopilot: mọi chuỗi có bản tiếng Anh – thiếu: ' + missing.join(' | '));
  let confAns = () => true, saved = null, ran = 0; w.confirm = m => confAns(m);
  const AS = { cfg: A.cleanAuto({}), state: { last_run: { at: now, due: 2, created: 1, scheduled: 0, review: 1, stop: null }, breaker: { until: now + H, code: 'x_503' }, last_sync: { at: now } }, key: true, webhook: false, manual: { facebook_page: 2 }, budget_left: 41, upcoming: [{ clip: CA, channel_id: 'gc-facebook_page-2', platform: 'facebook_page', slot_ms: now + H, state: 'pushed', board: 'review', channel: 'Lexkite' }], now };
  const sapi = async (m, p, b) => { if (p === 'lk/auto') return JSON.parse(JSON.stringify(AS)); if (p === 'lk/auto/save') { saved = b.cfg; return { cfg: A.cleanAuto(b.cfg) }; } if (p === 'lk/auto/run') { ran++; return { run: { created: 1, scheduled: 1, review: 0, calls: 6 } }; } if (p === 'lk/rules') return { rules: MGR.cleanRules({}) }; return {}; };
  const lang = { v: 'vi' }, ctx = { sapi, L: (s, v) => (v ? s.replace(/\{(\w+)\}/g, (x, k) => (v[k] != null ? v[k] : x)) : s), esc: s => String(s ?? '').replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';'), lang: () => lang.v, D: { accounts: [] }, errText: e => String(e && e.message || e), alive: () => true, LS: { get: (k, d) => d, set() {} }, modal() {} };
  const flush = async (k = 15) => { for (let i = 0; i < k; i++) await new Promise(res => setTimeout(res, 0)); };
  const main = doc.getElementById('m'); w.AdminSocialMgr.paint('queue', main, ctx); await flush();
  const ap = main.querySelector('#smgAP');
  ok(ap && /Autopilot/.test(ap.textContent) && /Cầu dao mở/.test(ap.textContent) && /41\/60/.test(ap.textContent) && ap.querySelector('#apOn').checked && !ap.querySelector('#apAA').checked, 'thẻ ở đầu tab Hàng đợi: trạng thái, cầu dao, ngân sách, công tắc (tự duyệt mặc định TẮT)');
  ok(/Đã duyệt tay 2\/5/.test(ap.textContent) && !ap.querySelector('[data-ap=tiktok]').checked && /Chờ duyệt/.test(ap.querySelector('tbody').textContent), 'đếm bài duyệt tay/nền tảng, TikTok tắt, bảng sắp đăng');
  ap.querySelector('#apRun').click(); await flush();
  ok(ran === 1 && /tạo 1/.test(main.querySelector('#apM').textContent), 'Chạy ngay → 1 lượt, báo kết quả');
  const ap2 = main.querySelector('#smgAP');
  confAns = () => false; ap2.querySelector('#apAA').checked = true; ap2.querySelector('#apSave').click(); await flush();
  ok(saved === null, 'bật tự duyệt phải xác nhận – hủy thì không lưu');
  confAns = () => true; ap2.querySelector('#apAA').checked = true; ap2.querySelector('#apOn').checked = false; ap2.querySelector('#apSave').click(); await flush();
  ok(saved && saved.auto_approve === true && saved.on === false && saved.plats.facebook_page === true, 'lưu: tự duyệt + kill switch + nền tảng');
  lang.v = 'en'; main.innerHTML = ''; w.AdminSocialMgr.paint('queue', main, ctx); await flush();
  const t = main.querySelector('#smgAP').textContent;
  ok(/Social autopilot/.test(t) && /Breaker open/.test(t) && /In review/.test(t) && !/[ăđơư]|[ạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(t), 'tiếng Anh: không lẫn tiếng Việt');
}

console.log(fails ? `✗ social-auto: ${fails}/${n} lỗi` : `✓ social-auto: ${n} kiểm tra đạt (mặc định an toàn, cầu dao, ngân sách, đầu-cuối, chỉ mục D1, chữ ký, UI)`);
process.exit(fails ? 1 : 0);
