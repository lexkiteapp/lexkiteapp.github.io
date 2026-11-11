// Test trang quản lý kênh social (máy chủ): MỘT mapper GrabCast → ext_sync (extAccount, _distribution.js), avatar tải về phía máy chủ + cache D1 (dist_avatar),
// endpoint cùng origin GET /api/distribution?av=, URL ký dài không bị cắt (lỗi 05/11: cắt 300 ký tự → 403), URL hết hạn → giữ bản cũ, tài khoản grabcast* chỉ liệt kê,
// giới hạn tự Sync (lk/auto/channels/sync), số bài theo kênh (hôm nay · 7 ngày · tổng · kế tiếp) qua chỉ mục.
// Chạy: node scripts/test/dist-channels.mjs (không mạng – fetch giả, D1 sqlite)
import { DatabaseSync } from 'node:sqlite';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

const D = await import('../../functions/api/_distribution.js');
const DIST = await import('../../functions/api/distribution.js');

// ---- 1) extAccount: hợp đồng GET accounts thật (05/11: trường thật, giá trị giả) ----
{
  const fb = { id: 11, platform: 'facebook_page', external_id: '1000000000000001', display_name: 'Lexkite.com', username: null, avatar_url: 'https://scontent-ord5-2.xx.fbcdn.net/v/t39.30808-1/x.jpg?' + 'a'.repeat(500),
    status: 'active', needs_reconnect: false, connected_at: '2026-11-05T03:00:00Z', limits: { reels_24h: 2, reels_cap: 30 }, health: { ok: true, needs_reconnect: false, expires_at: null, expiring_soon: false, reason: null }, fb_user_name: 'Admin Person', last_published_at: null };
  const m = D.extAccount(fb);
  ok(m.platform === 'facebook_page' && m.id === '11' && m.name === 'Lexkite.com' && m.status === 'ok' && m.avatar === fb.avatar_url, 'extAccount: trường cơ bản + avatar nguyên vẹn');
  ok(m.connected_at === Date.parse('2026-11-05T03:00:00Z') && m.used === 2 && m.cap === 30 && m.admin === 'Admin Person' && m.admin_kind === 'fb_user' && m.ext_id === fb.external_id, 'extAccount: ngày nối, hạn mức 24h, quản trị (tên FB, không có email)');
  ok(D.extAccount({ ...fb, health: { needs_reconnect: true } }).status === 'error', 'extAccount: health.needs_reconnect → error (trước đây chỉ đọc needs_reconnect gốc)');
  ok(D.extAccount({ ...fb, publishing: 'paused' }).status === 'paused' && D.extAccount({ ...fb, publishing_paused: true }).status === 'paused' && D.extAccount({ ...fb, paused: true }).publishing === undefined, 'extAccount: Pause publishing của GrabCast được truyền (publishing / publishing_paused / paused)');
  ok(D.pausedAccount(D.extAccount({ ...fb, publishing_paused: true })), 'pausedAccount nhận bản đã map');
  ok(D.extAccount({ ...fb, platform: 'facebook' }).platform === 'facebook_page' && D.extAccount(null).id === '', 'extAccount: facebook → facebook_page, đầu vào rỗng an toàn');
  ok(D.extAccount({ ...fb, owner_email: 'x@y.z' }).admin_kind === 'email', 'extAccount: email quản trị dùng khi GrabCast trả về');
}

// ---- 2) ext_sync + avatar cache + endpoint ----
const sql = new DatabaseSync(':memory:');
const DB = { prepare(q) { const st = { q, args: [], bind(...a) { return { ...st, args: a }; },
  async run() { if (/^\s*(SELECT|WITH)/i.test(q)) return { results: sql.prepare(q).all(...this.args) }; const i = sql.prepare(q).run(...this.args); return { results: [], meta: { changes: Number(i.changes) } }; },
  async all() { return /^\s*(SELECT|WITH)/i.test(q) ? { results: sql.prepare(q).all(...this.args) } : (sql.prepare(q).run(...this.args), { results: [] }); },
  async first() { return sql.prepare(q).get(...this.args) || null; } }; return st; },
  async batch(list) { const out = []; for (const x of list) out.push(await x.run()); return out; } };
const Y = await import('../../functions/api/youtube.js'); await Y.setup(DB); await DIST.setupDist(DB);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5]), JPG2 = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 9, 9, 9]), JPG3 = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 7]);
let served = {}, hits = [];
const fetcher = async url => { hits.push(url); const u = new URL(url); const b = served[u.pathname]; if (!b) return new Response('denied', { status: 403, headers: { 'content-type': 'text/plain' } }); return new Response(b, { status: 200, headers: { 'content-type': 'image/jpeg' } }); };
const env = { DB, AVATAR_FETCH: fetcher };
const longFb = 'https://scontent-ord5-2.xx.fbcdn.net/fb.jpg?oh=' + 'b'.repeat(480), ig = 'https://scontent-ord5-1.xx.fbcdn.net/ig.jpg?oh=' + 'c'.repeat(380);
served = { '/fb.jpg': JPG, '/ig.jpg': JPG2, '/gc.jpg': JPG3 };
const raw = [
  { id: 11, platform: 'facebook_page', display_name: 'Lexkite.com', avatar_url: longFb, status: 'active', needs_reconnect: false, connected_at: '2026-11-05T03:00:00Z', health: {}, limits: { reels_24h: 1, reels_cap: 30 }, fb_user_name: 'A' },
  { id: 12, platform: 'instagram', display_name: 'lexkitecom', username: 'lexkitecom', avatar_url: ig, status: 'active', health: { expires_at: '2026-11-01T00:00:00Z' } },
  { id: 13, platform: 'facebook_page', display_name: 'Grabcast.click', avatar_url: 'https://scontent-ord5-1.xx.fbcdn.net/gc.jpg', status: 'active', health: {} },
  { id: 14, platform: 'tiktok', display_name: 'lexkitecom', avatar_url: 'http://evil.example/x.jpg', status: 'active', health: {} },
];
let r = await DIST.DIST.ext_sync(DB, { accounts: raw.map(D.extAccount) }, env);
const row = id => sql.prepare('SELECT * FROM dist_ext WHERE channel_id = ?').get(id);
ok(r.ok && r.channels.length === 3 && r.foreign === 1 && !row('gc-facebook_page-13'), 'ext_sync: 3 kênh Lexkite, Grabcast.click không vào dist_ext');
ok(row('gc-facebook_page-11').thumb === longFb && row('gc-instagram-12').thumb === ig, 'ext_sync: URL avatar dài (533/417) lưu nguyên – không cắt ở 300 làm hỏng chữ ký');
ok(row('gc-tiktok-14').thumb === null, 'ext_sync: avatar http (không https) bị bỏ');
const I11 = JSON.parse(row('gc-facebook_page-11').info), I12 = JSON.parse(row('gc-instagram-12').info);
ok(/^[a-f0-9]{32}$/.test(I11.av) && I11.av !== I12.av && I11.av_src === longFb && I11.connected_at && I11.used === 1 && I11.cap === 30, 'ext_sync: avatar tải về máy chủ (băm nội dung), info đủ trường');
ok(I12.token_exp === Date.parse('2026-11-01T00:00:00Z') && I12.handle === 'lexkitecom', 'ext_sync: hạn token + @handle');
ok(!hits.some(u => /evil/.test(u)) && sql.prepare('SELECT COUNT(*) AS c FROM dist_avatar').get().c === 3, 'avatar: chỉ tải từ CDN nền tảng (không SSRF), 3 ảnh trong cache (gồm tài khoản ngoài)');

// endpoint cùng origin
const get = async q => DIST.onRequestGet({ request: new Request('https://lexkite.com/api/distribution' + q), env });
let res = await get('?av=' + I11.av), body = new Uint8Array(await res.arrayBuffer());
ok(res.status === 200 && res.headers.get('content-type') === 'image/jpeg' && /immutable/.test(res.headers.get('cache-control')) && body.length === JPG.length && body[0] === 0xff, 'GET ?av=: trả đúng ảnh, cache bất biến');
ok((await get('?av=' + 'f'.repeat(32))).status === 404 && (await get('?av=../x')).status === 400, 'GET ?av=: băm lạ 404, dữ liệu sai 400');

// get → thumb cùng origin + foreign + stats
{
  const t = Date.now();
  sql.prepare("INSERT INTO dist_social (clip, channel_id, platform, slot_ms, source, rule, state, updated) VALUES ('c1', 'gc-facebook_page-11', 'facebook_page', ?, 'auto', 0, 'published', ?)").run(t - 60e3, t);
  sql.prepare("INSERT INTO dist_social (clip, channel_id, platform, slot_ms, source, rule, state, updated) VALUES ('c2', 'gc-facebook_page-11', 'facebook_page', ?, 'auto', 0, 'published', ?)").run(t - 3 * 864e5, t);
  sql.prepare("INSERT INTO dist_social (clip, channel_id, platform, slot_ms, source, rule, state, updated) VALUES ('c3', 'gc-facebook_page-11', 'facebook_page', ?, 'auto', 0, 'published', ?)").run(t - 30 * 864e5, t);
  sql.prepare("INSERT INTO dist_social (clip, channel_id, platform, slot_ms, source, rule, state, updated) VALUES ('c4', 'gc-facebook_page-11', 'facebook_page', ?, 'auto', 0, 'planned', ?)").run(t + 5 * 36e5, t);
}
const G = await DIST.OPS_FOR_TEST.get(DB);
const fbc = G.channels.find(c => c.channel_id === 'gc-facebook_page-11');
ok(fbc.thumb === '/api/distribution?av=' + I11.av && fbc.thumb_src === longFb, 'get: thumb = avatar cùng origin, giữ URL gốc làm dự phòng');
ok(fbc.stats.d7 === 2 && fbc.stats.total === 3 && fbc.stats.next > Date.now() && fbc.stats.last && fbc.stats.today >= 0 && fbc.stats.today <= 1, 'get: số bài 7 ngày / tổng / kế tiếp');
ok(G.foreign.length === 1 && G.foreign[0].name === 'Grabcast.click' && /^\/api\/distribution\?av=/.test(G.foreign[0].thumb) && G.synced_at, 'get: tài khoản ngoài (khóa ngắt kết nối) + thời điểm sync');
const plan = sql.prepare("EXPLAIN QUERY PLAN SELECT slot_ms FROM dist_social WHERE channel_id = ? AND slot_ms BETWEEN ? AND ? AND state = 'published'").all('x', 0, 1).map(x => x.detail).join(' ');
ok(/USING INDEX dist_social_ch/.test(plan), 'số bài theo kênh dùng chỉ mục dist_social_ch (không quét bảng): ' + plan);

// sync lần 2: URL đổi nhưng hết hạn (403) → giữ avatar cũ; ảnh mới hợp lệ → băm mới
served = { '/ig2.jpg': JPG };
const raw2 = raw.map(a => (a.id === 11 ? { ...a, avatar_url: 'https://scontent-ord5-2.xx.fbcdn.net/fb-expired.jpg?oe=1' } : a.id === 12 ? { ...a, avatar_url: 'https://scontent-ord5-1.xx.fbcdn.net/ig2.jpg?oe=2' } : a));
hits = []; r = await DIST.DIST.ext_sync(DB, { accounts: raw2.map(D.extAccount) }, env);
const J11 = JSON.parse(row('gc-facebook_page-11').info), J12 = JSON.parse(row('gc-instagram-12').info);
ok(J11.av === I11.av && J11.av_err && hits.some(u => /fb-expired/.test(u)), 'URL hết hạn (403) → giữ avatar đã cache, không bao giờ mất ảnh');
ok(J12.av === I11.av, 'làm mới mỗi sync: URL đổi → tải lại (ảnh IG mới)');
// cache còn mới + URL không đổi → không tải lại
hits = []; await DIST.DIST.ext_sync(DB, { accounts: raw2.map(D.extAccount) }, env);
ok(!hits.some(u => /ig2\.jpg|gc\.jpg/.test(u)), 'URL không đổi + cache < 24 giờ → 0 lượt tải avatar');

// fetchAvatar: không phải ảnh / quá lớn
ok(await DIST.fetchAvatar('https://x.fbcdn.net/a', async () => new Response('<html>', { headers: { 'content-type': 'text/html' } })) === null, 'fetchAvatar: không phải ảnh → null');
ok(await DIST.fetchAvatar('https://x.fbcdn.net/a', async () => new Response(new Uint8Array(300000), { headers: { 'content-type': 'image/jpeg' } })) === null, 'fetchAvatar: > 256 KB → null');
ok(await DIST.fetchAvatar('https://169.254.169.254/a', fetcher) === null, 'fetchAvatar: host lạ → null');

// ---- 3) lk/auto/channels/sync: giới hạn tần suất ----
{
  const A = await import('../../functions/api/_social_auto.js'), MGR = await import('../../functions/api/_social_mgr.js'); await MGR.setupMgr(DB);
  let calls = 0; const gc = async (m, p) => { calls++; return { status: 200, data: { accounts: raw } }; };
  const op = A.autoOpFor('POST', 'lk/auto/channels/sync');
  if (!op) ok(false, 'autoOpFor: thiếu op channels/sync');
  else {
    const e2 = { DB, GRABCAST_API_KEY: 'k'.repeat(20), GRABCAST_WORKSPACE: '4', AVATAR_FETCH: fetcher };
    const a1 = await op({ env: e2, db: DB, gc, b: {} }), a2 = await op({ env: e2, db: DB, gc, b: {} }), a3 = await op({ env: e2, db: DB, gc, b: { force: true } });
    ok(a1.n === 4 && calls === 1 && a2.cached && a2.retry_s > 0 && a3.cached && calls === 1, 'channels/sync: tự Sync ≤ 1 lần/5 phút, bấm tay ≤ 1 lần/20 giây → trả dữ liệu đã lưu');
    ok(Array.isArray(a2.channels) && a2.channels.length === 3, 'channels/sync (cache): vẫn trả danh sách kênh');
  }
}

console.log(fails ? `dist-channels: ${fails}/${n} FAIL` : `dist-channels: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
