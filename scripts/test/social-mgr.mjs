// Test quản lý social (functions/api/_social_mgr.js qua /api/social "lk/…" + web/js/admin-social-mgr.js): hàm thuần (sức khỏe kênh, dấu băm duyệt,
// kiểm caption theo nền tảng, hàng đợi tôn trọng trần/giãn cách/chống trùng, ánh xạ số liệu, trọng số), CỔNG DUYỆT đầu-cuối với GrabCast giả,
// bảo mật route (người lạ, Origin lạ, route lạ, nhật ký), giao diện kanban/sức khỏe/hàng đợi (jsdom). Chạy: node scripts/test/social-mgr.mjs
import { webcrypto } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

const store = new Map();
globalThis.caches = { default: { async match(req) { const e = store.get(req.url); return e && e.exp > Date.now() ? new Response(e.body) : undefined; }, async put(req, res) { store.set(req.url, { body: await res.text(), exp: Date.now() + 60e3 }); } } };
const sql = new DatabaseSync(':memory:');
const exec = (q, a) => /^\s*(SELECT|WITH)|RETURNING/i.test(q) ? { results: sql.prepare(q).all(...a) } : (sql.prepare(q).run(...a), { results: [] });
const DB = { prepare(q) { const st = { q, args: [], bind(...a) { return { ...st, args: a }; }, async run() { return exec(q, this.args); }, async all() { return exec(q, this.args); }, async first() { return sql.prepare(q).get(...this.args) || null; } }; return st; },
  async batch(list) { const out = []; for (const x of list) out.push(await x.run()); return out; } };

const M = await import(new URL('../../functions/api/_social_mgr.js', import.meta.url));
const SOC = await import(new URL('../../functions/api/social.js', import.meta.url));
const now = Date.UTC(2026, 9, 22, 12); // 22/10/2026 12:00 UTC

// ---------- 1) Sức khỏe kênh ----------
{
  const fb = { id: 2, platform: 'facebook_page', display_name: 'Lexkite', limits: { reels_24h: 25, reels_cap: 30 }, health: { ok: true, expires_at: new Date(now + 90 * 864e5).toISOString() }, capabilities: { publish: true, insights: true, comments_read: true } };
  const h = M.healthOf(fb, [], now);
  ok(h.state === 'near_limit' && h.used === 25 && h.cap === 30 && h.perms.publish, 'FB Reels 25/30 → gần trần 24 h');
  ok(M.healthOf({ ...fb, limits: { reels_24h: 30, reels_cap: 30 } }, [], now).state === 'limit', 'FB 30/30 → hết lượt');
  ok(M.healthOf({ ...fb, needs_reconnect: true }, [], now).state === 'reconnect', 'needs_reconnect → cần kết nối lại (ưu tiên nhất)');
  ok(M.healthOf({ ...fb, limits: {}, health: { expires_at: new Date(now + 3 * 864e5).toISOString() } }, [], now).flags.includes('expiring'), 'token còn 3 ngày → sắp hết hạn');
  const ig = M.healthOf({ id: 3, platform: 'instagram', limits: {} }, [{ targets: [{ account_id: 3, published_at: new Date(now - 3600e3).toISOString() }, { account_id: 3, published_at: new Date(now - 30 * 3600e3).toISOString() }] }], now);
  ok(ig.used === 1 && ig.cap === 100, 'IG: đếm bài 24 h từ lịch sử khi GrabCast không trả limits, trần 100');
  ok(M.healthOf({ id: 4, platform: 'tiktok' }, [], now).state === 'private_only' && M.healthOf({ id: 5, platform: 'youtube' }, [], now).privateOnly, 'TikTok/YouTube → chỉ riêng tư (chờ duyệt app)');
}
// ---------- 2) Dấu băm nội dung duyệt ----------
{
  const p = { caption: 'Hi', title: 'T', media_ids: ['m2', 'm1'], targets: [{ account_id: 3, kind: 'reel', options: { b: 1, a: 2 } }, { account_id: 2, kind: 'reel' }], status: 'draft', updated_at: 'x' };
  const q = { ...p, media_ids: ['m1', 'm2'], targets: [p.targets[1], { ...p.targets[0], options: { a: 2, b: 1 } }], status: 'scheduled', updated_at: 'y' };
  ok(await M.contentHash(p) === await M.contentHash(q), 'băm không đổi theo thứ tự/trạng thái/updated_at');
  ok(await M.contentHash(p) !== await M.contentHash({ ...p, caption: 'Hi!' }), 'đổi caption → băm khác');
  ok(await M.contentHash(p) !== await M.contentHash({ ...p, targets: [...p.targets, { account_id: 9 }] }), 'thêm kênh → băm khác');
  ok(await M.contentHash({ post: p }) === await M.contentHash(p), 'chấp nhận dạng {post}');
}
// ---------- 3) Kiểm caption theo nền tảng ----------
{
  const v = (d, pl) => M.validateCompose({ clip: 'c', ...d }, pl).filter(x => x.lv === 'error').map(x => x.p + ':' + x.code);
  ok(v({ caption: 'x'.repeat(2201) }, ['instagram']).includes('instagram:too-long'), 'IG > 2.200 ký tự → lỗi');
  ok(!v({ caption: 'x'.repeat(2200) }, ['instagram']).length, 'IG đúng 2.200 → hợp lệ');
  ok(v({ caption: '#a #b #c #d', first_comment: '#e #f' }, ['instagram']).includes('instagram:hashtags'), 'IG > 5 hashtag (tính cả bình luận đầu) → lỗi');
  ok(v({ caption: 'é'.repeat(2501), title: 't' }, ['youtube']).includes('youtube:too-long'), 'YouTube đếm byte UTF-8 (5.000)');
  ok(v({ caption: 'ok' }, ['youtube']).includes('youtube:no-title') && v({ caption: 'a<b', title: 't' }, ['youtube']).includes('youtube:angle'), 'YouTube thiếu tiêu đề / có < >');
  ok(v({ caption: 'ok' }, []).includes('*:no-accounts') && M.validateCompose({ caption: 'x' }, ['tiktok']).some(x => x.code === 'no-media'), 'thiếu kênh / thiếu video');
  ok(!v({ caption: '#a '.repeat(9) }, ['tiktok']).length && M.validateCompose({ clip: 'c', caption: '#a '.repeat(9) }, ['tiktok']).some(x => x.lv === 'warn'), 'TikTok > 8 hashtag chỉ cảnh báo');
}
// ---------- 4) Hàng đợi: trần/ngày, giãn cách, trần 24 h, chống trùng, múi giờ ----------
{
  const clips = Array.from({ length: 12 }, (_, i) => ({ id: 'clip-' + i }));
  const accounts = [{ id: '2', platform: 'facebook_page', state: 'ok', used: 0, cap: 30 }, { id: '3', platform: 'instagram', state: 'ok', used: 0, cap: 100 }, { id: '9', platform: 'tiktok', state: 'reconnect' }];
  const rules = { perDay: { facebook_page: 2, instagram: 1 }, minGapH: 3, hours: [8, 12, 19], tz: 'America/New_York', tzBy: { 3: 'Asia/Ho_Chi_Minh' }, dupDays: 30, days: 3 };
  const r = M.planQueue({ clips, accounts, rules, history: [{ clip: 'clip-0', account_id: '2', at: now - 5 * 864e5 }], taken: [{ account_id: '3', at: now + 864e5 }], now });
  const by = id => r.slots.filter(s => s.account_id === id);
  ok(!r.slots.some(s => s.account_id === '9'), 'kênh cần kết nối lại → không xếp');
  const perDay = (id, tz) => { const m = {}; for (const s of by(id)) { const k = M.dayKeyTz(s.at, tz); m[k] = (m[k] || 0) + 1; } return Object.values(m); };
  ok(by('2').length && perDay('2', 'America/New_York').every(x => x <= 2), 'FB ≤ 2 bài/ngày (giờ NY)');
  ok(perDay('3', 'Asia/Ho_Chi_Minh').every(x => x <= 1), 'IG ≤ 1 bài/ngày theo múi giờ riêng của kênh');
  const gaps = id => { const t = by(id).map(s => s.at).sort((a, b) => a - b); return t.slice(1).every((x, i) => x - t[i] >= 3 * 36e5); };
  ok(gaps('2') && gaps('3'), 'giãn cách ≥ 3 giờ giữa 2 bài cùng kênh');
  ok(!by('2').some(s => s.clip === 'clip-0') && r.skipped.some(s => s.clip === 'clip-0' && s.why === 'duplicate'), 'clip đã đăng trên kênh trong 30 ngày → bỏ (trùng)');
  ok(!by('3').some(s => Math.abs(s.at - (now + 864e5)) < 3 * 36e5), 'tránh khung đã có bài lên lịch');
  ok(r.slots.every(s => s.at > now + 30 * 60e3), 'chỉ khung ở tương lai (> 30 phút)');
  const ny = by('2').map(s => +new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hourCycle: 'h23' }).format(s.at));
  ok(ny.every(h => [8, 12, 19].includes(h)), 'đúng khung giờ vàng địa phương ' + ny.join(','));
  const full = M.planQueue({ clips, accounts: [{ id: '2', platform: 'facebook_page', state: 'ok', used: 30, cap: 30 }], rules, now });
  ok(full.slots.length && !full.slots.some(x => x.at - now < 864e5), 'kênh hết lượt 24 h → không xếp trong 24 h tới');
  const near = M.planQueue({ clips, accounts: [{ id: '2', platform: 'facebook_page', state: 'near_limit', used: 29, cap: 30 }], rules: { ...rules, perDay: { facebook_page: 5 }, minGapH: 1, hours: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 20, 21, 22, 23] }, now });
  ok(near.slots.filter(s => s.at - now < 864e5).length <= 1, 'trần nền tảng 24 h: còn 1 lượt → tối đa 1 bài trong 24 h tới');
  ok(M.cleanRules({ perDay: { facebook_page: 99 }, tz: 'Mars/Base', hours: [25, 7, 7] }).perDay.facebook_page === 30 && M.cleanRules({ tz: 'Mars/Base' }).tz === 'America/New_York' && M.cleanRules({ hours: [25, 7, 7] }).hours.join() === '7', 'luật bị kẹp: trần ≤ trần nền tảng, múi giờ hợp lệ, giờ 0–23 duy nhất');
}
// ---------- 5) Số liệu & trọng số ----------
{
  ok(JSON.stringify(M.mapMetrics('youtube', { statistics: { viewCount: '100', likeCount: '7', commentCount: '2' } })) === JSON.stringify({ views: 100, likes: 7, comments: 2, saves: 0, shares: 0, watch_s: 0 }), 'YouTube statistics → dạng chuẩn');
  const g = M.mapMetrics('grabcast', { metrics: { plays: 50, likes: 5, comments: 1, saved: 3, shares: 2, ig_reels_video_view_total_time: 90500 } });
  ok(g.views === 50 && g.saves === 3 && g.shares === 2 && g.watch_s === 91, 'GrabCast/Meta insights → dạng chuẩn (ms → s)');
  ok(M.mapMetrics('web', { view: 9, done: 4 }).views === 9, 'web views');
  const w = M.weightsFrom([{ template: 'A', hook: 'q', views: 10000, saves: 300, shares: 200 }, { template: 'B', hook: 'q', views: 10000, saves: 10, shares: 5 }, { template: 'C', views: 10, saves: 5 }]);
  ok(w.by.template.A.w > 1 && w.by.template.B.w < 1 && w.by.template.A.w <= 2 && w.by.template.B.w >= 0.5, 'template tương tác cao → trọng số > 1, thấp → < 1 (kẹp 0,5–2)');
  ok(Math.abs(w.by.template.C.w - 1) < 0.4, 'ít view → làm mượt Bayes về gần 1');
}

// ---------- 6) Đầu-cuối qua /api/social: bảo mật + cổng duyệt ----------
const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
const b64u = b => Buffer.from(b).toString('base64url'), sec = Math.floor(Date.now() / 1000);
const tok = async email => { const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 3600, iat: sec, auth_time: sec, sub: 'u-' + email, email, email_verified: true })); return h + '.' + p + '.' + b64u(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))); };
const KEY = 'gk_live_SECRET_mgr_12345';
const GC = { posts: { p_1: { id: 'p_1', status: 'draft', caption: 'Hello', media_ids: ['m1'], targets: [{ id: 't1', account_id: 2, platform: 'facebook_page', kind: 'reel', state: 'draft' }] } } };
let calls = [];
globalThis.fetch = async (url, init = {}) => {
  url = String(url); if (url.includes('googleapis.com')) return { ok: true, json: async () => ({ keys: [jwk] }) };
  const u = new URL(url), p = u.pathname.replace('/api/social/', ''); calls.push({ m: init.method, p, h: init.headers, body: init.body && JSON.parse(init.body) });
  const J = (b, s = 200) => new Response(JSON.stringify(b), { status: s });
  if (p === 'accounts') return J({ accounts: [{ id: 2, platform: 'facebook_page', display_name: 'Lexkite', limits: { reels_24h: 1, reels_cap: 30 }, health: {}, capabilities: { publish: true } }], groups: [] });
  if (p === 'posts' && init.method === 'GET') return J({ posts: Object.values(GC.posts) });
  if (p === 'posts' && init.method === 'POST') { const id = 'p_' + (Object.keys(GC.posts).length + 1); GC.posts[id] = { id, status: 'draft', ...JSON.parse(init.body) }; return J({ post: GC.posts[id] }); }
  let m = /^posts\/([^/]+)$/.exec(p); if (m) return GC.posts[m[1]] ? J({ post: GC.posts[m[1]] }) : J({ error: { code: 'not_found' } }, 404);
  m = /^posts\/([^/]+)\/(schedule|publish-now)$/.exec(p); if (m) { GC.posts[m[1]].status = m[2] === 'schedule' ? 'scheduled' : 'publishing'; GC.posts[m[1]].scheduled_at = (JSON.parse(init.body).scheduled_at) || null; return J({ post: GC.posts[m[1]] }); }
  if (/insights$/.test(p)) return J({ error: { code: 'api_key_not_allowed', message: 'x' } }, 403);
  return J({});
};
const ENV = { ADMIN_EMAILS: 'boss@lexkite.com', GRABCAST_API_KEY: KEY, DB };
let ipN = 1;
const call = async (tk, body, { origin = 'https://lexkite.com', env = ENV } = {}) => {
  const r = await SOC.onRequestPost({ request: new Request('https://lexkite.com/api/social', { method: 'POST', headers: { Authorization: 'Bearer ' + tk, Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.7.0.' + (ipN++ % 200) }, body: JSON.stringify(body) }), env });
  const text = await r.text(); let j = {}; try { j = JSON.parse(text); } catch (e) { /* */ } return { s: r.status, j, text };
};
const ADM = await tok('boss@lexkite.com'), USER = await tok('someone@gmail.com');
// bảo mật
for (const [m, p] of [['GET', 'lk/board'], ['POST', 'lk/board/approve'], ['GET', 'lk/health'], ['POST', 'lk/queue/apply'], ['POST', 'lk/metrics/import'], ['POST', 'lk/ai/caption'], ['POST', 'lk/sets/save'], ['POST', 'lk/lib/save']]) {
  ok((await call(USER, { method: m, path: p, body: {} })).s === 403, `${m} ${p}: tài khoản thường → 403`);
  ok((await call('x.y.z', { method: m, path: p, body: {} })).s === 403, `${m} ${p}: token giả → 403`);
  ok((await call(ADM, { method: m, path: p, body: {} }, { origin: 'https://evil.example' })).s === 403, `${m} ${p}: Origin lạ → 403 (CSRF)`);
}
for (const [m, p] of [['GET', 'lk/board/approve'], ['POST', 'lk/board'], ['GET', 'lk/constructor'], ['POST', 'lk/__proto__'], ['DELETE', 'lk/board'], ['GET', 'lk/../accounts'], ['POST', 'lk/sets/save/x']]) {
  const r = await call(ADM, { method: m, path: p }); ok(r.s === 400 && r.j.error === 'route', `route lạ ${m} ${p} → 400 (nhận ${r.s})`);
}
ok((await call(ADM, { method: 'GET', path: 'lk/board' }, { env: { ...ENV, DB: undefined } })).s === 412, 'không có D1 → 412');
// luồng duyệt
calls = [];
let r = await call(ADM, { method: 'POST', path: 'posts/p_1/schedule', body: { scheduled_at: new Date(Date.now() + 864e5).toISOString(), consent: true } });
ok(r.s === 403 && r.j.error === 'not-approved' && !calls.some(c => /schedule$/.test(c.p)), 'chưa duyệt → chặn schedule, KHÔNG gọi GrabCast');
ok((await call(ADM, { method: 'POST', path: 'posts', body: { caption: 'x', scheduled_at: '2030-01-01T00:00:00Z' } })).j.error === 'needs-approval', 'tạo bài kèm giờ đăng → needs-approval');
const want = Date.now() + 2 * 864e5;
r = await call(ADM, { method: 'POST', path: 'lk/board/submit', body: { post_id: 'p_1', want_at: want, mode: 'sched', clip: 'clip-a', template: 'tpl1', hook: 'question' } });
ok(r.s === 200 && r.j.state === 'review', 'gửi duyệt → In review');
const bid = r.j.id;
ok((await call(ADM, { method: 'POST', path: 'posts/p_1/publish-now', body: { consent: true } })).j.error === 'not-approved', 'đang chờ duyệt → vẫn chặn publish-now');
calls = [];
r = await call(ADM, { method: 'POST', path: 'lk/board/approve', body: { id: bid }, idem: 'apv-test-0001' });
const sc = calls.find(c => c.p === 'posts/p_1/schedule');
ok(r.s === 200 && r.j.state === 'scheduled' && sc && sc.body.consent === true && Date.parse(sc.body.scheduled_at) === want && sc.h['Idempotency-Key'] === 'apv-test-0001', 'duyệt → máy chủ lên lịch trên GrabCast đúng giờ, có Idempotency-Key');
ok(!calls.some(c => JSON.stringify(c.body || {}).includes(KEY)) && !r.text.includes(KEY), 'khóa không lọt vào nội dung');
ok((await call(ADM, { method: 'POST', path: 'posts/p_1/schedule', body: { scheduled_at: new Date(want + 3600e3).toISOString(), consent: true } })).s === 200, 'đã duyệt + nội dung y nguyên → dời lịch được');
GC.posts.p_1.caption = 'Hello EDITED on GrabCast';
r = await call(ADM, { method: 'POST', path: 'posts/p_1/schedule', body: { scheduled_at: new Date(want).toISOString(), consent: true } });
ok(r.s === 403 && r.j.error === 'changed-since-approval', 'sửa nội dung sau khi duyệt → chặn, phải duyệt lại');
const row = sql.prepare('SELECT state, note, hash FROM soc_board WHERE id = ?').get(bid);
ok(row.state === 'review' && !row.hash, 'mục duyệt quay về In review, xóa dấu duyệt');
r = await call(ADM, { method: 'GET', path: 'lk/board' });
ok(r.s === 200 && r.j.items.length === 1 && r.j.items[0].links.length === 1 && r.j.items[0].caption === 'Hello EDITED on GrabCast', 'bảng phản chiếu nội dung/link từ GrabCast');
ok((await call(ADM, { method: 'POST', path: 'lk/board/move', body: { id: bid, state: 'approved' } })).s === 400, 'không thể kéo thẳng sang Approved (phải qua board/approve)');
// nhân bản
r = await call(ADM, { method: 'POST', path: 'lk/board/duplicate', body: { id: bid }, idem: 'dup-test-0001' });
ok(r.s === 200 && r.j.state === 'draft' && GC.posts[r.j.post_id] && GC.posts[r.j.post_id].caption === 'Hello EDITED on GrabCast' && !GC.posts[r.j.post_id].scheduled_at, 'nhân bản → bài NHÁP mới cùng nội dung, chưa lên lịch');
// sức khỏe, bộ kênh, luật, số liệu
r = await call(ADM, { method: 'GET', path: 'lk/health' }); ok(r.s === 200 && r.j.accounts[0].used === 1 && r.j.accounts[0].cap === 30, 'lk/health → 1/30');
ok((await call(ADM, { method: 'POST', path: 'lk/sets/save', body: { name: 'All FB', ids: ['2', '../x', '3'] } })).s === 200 && JSON.stringify((await call(ADM, { method: 'GET', path: 'lk/sets' })).j.sets) === JSON.stringify([{ name: 'All FB', ids: ['2', '3'] }]), 'bộ kênh: lưu + lọc id xấu');
ok((await call(ADM, { method: 'POST', path: 'lk/lib/save', body: { kind: 'tpl', items: [{ name: 'A', body: 'B', evil: 1 }] } })).s === 200 && JSON.stringify((await call(ADM, { method: 'GET', path: 'lk/lib' })).j.tpl) === '[{"name":"A","body":"B"}]', 'mẫu caption lưu D1 (chỉ trường đã biết)');
ok((await call(ADM, { method: 'POST', path: 'lk/lib/save', body: { kind: 'x', items: [] } })).s === 400, 'kho mẫu: loại lạ → 400');
ok((await call(ADM, { method: 'POST', path: 'lk/rules/save', body: { rules: { perDay: { instagram: 500 } } } })).j.rules.perDay.instagram === 100, 'luật: kẹp theo trần nền tảng');
r = await call(ADM, { method: 'POST', path: 'lk/metrics/import', body: { rows: [{ post_id: 'p_1', platform: 'instagram', views: 1000, saves: 40, shares: 10 }, { post_id: 'bad id!', views: 5 }] } });
ok(r.s === 200 && r.j.imported === 1 && r.j.weights.by.template.tpl1, 'nhập số liệu → gắn template/hook từ mục duyệt, tính trọng số');
r = await call(ADM, { method: 'POST', path: 'lk/metrics/sync', body: {} });
ok(r.s === 200 && r.j.grabcast === 'ok', 'đồng bộ số liệu chạy (không có bài đã đăng)');
const aud = sql.prepare("SELECT COUNT(*) AS n FROM admin_log WHERE op LIKE 'soc:lk/%'").get();
ok(aud && aud.n >= 8, 'mọi thao tác ghi lk/… vào nhật ký quản trị (' + (aud && aud.n) + ')');
const blk = sql.prepare("SELECT COUNT(*) AS n FROM admin_log WHERE op LIKE 'gc:blocked%'").get();
ok(blk && blk.n >= 2, 'lần bị chặn ở cổng duyệt cũng ghi nhật ký');

// ---------- 7) Giao diện (jsdom) ----------
const jsdom = (await import('jsdom')).default;
const dom = new jsdom.JSDOM('<!doctype html><html><head></head><body><main id="m"></main></body></html>', { url: 'https://lexkite.com/admin.html', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, doc = w.document; w.eval(fs.readFileSync(new URL('../../web/js/admin-social-mgr.js', import.meta.url), 'utf8'));
const T = w.AdminSocialMgr._t;
ok(T.groupSlots([{ clip: 'a', at: 5, account_id: 2 }, { clip: 'a', at: 5, account_id: 3 }, { clip: 'b', at: 1, account_id: 2 }]).map(g => g.clip + ':' + g.account_ids.join('+')).join() === 'b:2,a:2+3', 'gộp cùng clip + cùng giờ thành 1 bài nhiều kênh');
ok(T.parseCsv('post_id,platform,views\np1,instagram,10\n,x,1').length === 1 && T.parseCsv('p9,facebook_page,5,1')[0].likes === '1', 'đọc CSV số liệu (có/không tiêu đề)');
ok(T.parseQueueCsv('clip-1,2;3,2099-01-01T10:00\nBAD,2,2099-01-01\nclip-2,2,2000-01-01').length === 1, 'CSV hàng loạt: chỉ dòng hợp lệ ở tương lai');
ok(T.newAccounts([{ id: 2 }], [{ id: 2 }, { id: 7 }]).map(a => a.id).join() === '7', 'nhận kênh mới sau khi kết nối');
let confAns = () => true; w.confirm = m => confAns(m); w.prompt = () => null; w.alert = () => {};
const items = [{ id: 'b_aaaaaa1', state: 'review', title: 'Clip A', accounts: ['2'], mode: 'sched', want_at: Date.now() + 864e5, post_id: 'p_1', links: [] }, { id: 'b_aaaaaa2', state: 'published', title: 'Clip B', accounts: ['2'], links: [{ p: 'facebook_page', u: 'https://facebook.com/x', a: '2' }] }, { id: 'b_aaaaaa3', state: 'scheduled', title: 'Clip C', accounts: ['2'], note: 'changed-in-grabcast', links: [] }];
let ucalls = [];
const sapi = async (m, p, b, o) => { ucalls.push({ m, p, b, o }); if (p === 'lk/board') return { items }; if (p === 'lk/health') return { accounts: [M.healthOf({ id: 2, platform: 'facebook_page', display_name: 'Lexkite', limits: { reels_24h: 28, reels_cap: 30 } }), M.healthOf({ id: 4, platform: 'tiktok', display_name: 'TT' })] }; if (p === 'lk/rules') return { rules: M.cleanRules({}) }; return { state: 'scheduled' }; };
const ctx = { sapi, L: (s, v) => (v ? s.replace(/\{(\w+)\}/g, (x, k) => (v[k] != null ? v[k] : x)) : s), esc: s => String(s ?? '').replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';'), lang: () => 'vi', D: { accounts: [{ id: 2, platform: 'facebook_page', display_name: 'Lexkite' }], posts: [] }, accById: id => (String(id) === '2' ? { id: 2, platform: 'facebook_page', display_name: 'Lexkite' } : null), modal: () => ({ d: doc.createElement('dialog'), shut() {} }), both: t => new Date(t).toISOString(), errText: e => String(e && (e.code || e.message)), alive: () => true, LS: { get: (k, d) => d, set() {} } };
const flush = async (k = 10) => { for (let i = 0; i < k; i++) await new Promise(res => setTimeout(res, 0)); };
const main = doc.getElementById('m');
w.AdminSocialMgr.paint('board', main, ctx); await flush();
ok(main.querySelectorAll('.smg-col').length === 7 && main.querySelector('[data-col=review] .smg-card') && main.querySelector('[data-col=published] a[href="https://facebook.com/x"]'), 'kanban 7 cột, link bài đã đăng');
ok(/sửa trên GrabCast/.test(main.querySelector('[data-col=scheduled]').textContent), 'cảnh báo nội dung sửa trên GrabCast sau khi duyệt');
ok(main.querySelector('[data-col=scheduled] .smg-card').getAttribute('draggable') === 'false', 'bài đã lên lịch không kéo được');
confAns = () => false; ucalls = []; main.querySelector('[data-a=approve]').click(); await flush();
ok(!ucalls.some(c => c.p === 'lk/board/approve'), 'hủy xác nhận → không duyệt');
const conf = []; confAns = m => { conf.push(m); return true; }; main.querySelector('[data-a=approve]').click(); await flush();
const ap = ucalls.find(c => c.p === 'lk/board/approve');
ok(conf.length === 1 && /GrabCast sẽ tự đăng/.test(conf[0]) && ap && ap.b.id === 'b_aaaaaa1' && /^apv-/.test(ap.o.idem), 'duyệt: hỏi xác nhận rồi gọi approve kèm idempotency key');
main.innerHTML = ''; w.AdminSocialMgr.paint('health', main, ctx); await flush();
ok(/28\/30/.test(main.textContent) && /Gần trần 24 giờ/.test(main.textContent) && /Chỉ riêng tư/.test(main.textContent), 'sức khỏe: 28/30 gần trần, TikTok chỉ riêng tư');
ok(main.querySelector('[data-conn=meta]') && /workspace <b>Lexkite|workspace Lexkite/.test(main.innerHTML), 'nút kết nối FB & IG + checklist workspace');
const sel = main.querySelector('#hP'); sel.value = 'tiktok'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
ok(main.querySelectorAll('#hOut tbody tr').length === 1 && /TT/.test(main.querySelector('#hOut').textContent), 'lọc theo nền tảng');
let opened = null; w.open = u => { opened = u; return { closed: false, close() {} }; };
main.querySelector('[data-conn=meta]').click(); ok(opened === 'https://grabcast.click/scheduler.html#accounts', 'kết nối mở GrabCast trong popup');
main.innerHTML = ''; w.AdminSocialMgr.paint('queue', main, ctx); await flush();
ok(main.querySelectorAll('[data-pd]').length === 5 && main.querySelector('#smgGo').disabled, 'hàng đợi: luật 5 nền tảng, nút tạo khóa khi chưa có kế hoạch');

console.log(fails ? `✗ social-mgr: ${fails}/${n} lỗi` : `✓ social-mgr: ${n} kiểm tra đạt (sức khỏe, băm duyệt, caption, hàng đợi, số liệu, cổng duyệt, bảo mật, UI)`);
process.exit(fails ? 1 : 0);
