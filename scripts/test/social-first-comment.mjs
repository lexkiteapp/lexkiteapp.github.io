// Bình luận đầu mang link web app (docs/DISTRIBUTION.md §6c): functions/api/_first_comment.js (thuần), /api/go (đếm click → 302 + UTM),
// autopilot GrabCast (options.first_comment chỉ khi kênh có quyền, ≤ 1/bài, hạn mức kênh/ngày, bài đầu có bình luận vẫn duyệt tay),
// đường Meta (1 bình luận của Page sau khi Reel lên, chống trùng khi hết giờ chờ, thử có giới hạn, lỗi quyền không dừng kênh), số liệu Quản trị.
// Chạy: node scripts/test/social-first-comment.mjs  (D1 = node:sqlite, GrabCast/Graph giả – 0 lượt mạng thật)
import { DatabaseSync } from 'node:sqlite';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const store = new Map();
globalThis.caches = { default: { async match(req) { const e = store.get(req.url); return e && e.exp > Date.now() ? new Response(e.body) : undefined; }, async put(req, res) { store.set(req.url, { body: await res.text(), exp: Date.now() + 60e3 }); } } };
const sql = new DatabaseSync(':memory:');
const DB = { prepare(q) { const st = { q, args: [], bind(...a) { return { ...st, args: a }; },
  async run() { if (/^\s*(SELECT|WITH)/i.test(q)) return { results: sql.prepare(q).all(...this.args) }; const i = sql.prepare(q).run(...this.args); return { results: [], meta: { changes: Number(i.changes) } }; },
  async all() { return /^\s*(SELECT|WITH)/i.test(q) ? { results: sql.prepare(q).all(...this.args) } : (sql.prepare(q).run(...this.args), { results: [] }); },
  async first() { return sql.prepare(q).get(...this.args) || null; } }; return st; },
  async batch(list) { const out = []; for (const x of list) out.push(await x.run()); return out; } };
const F = await import(new URL('../../functions/api/_first_comment.js', import.meta.url));
const RM = await import(new URL('../../functions/api/_role_meta.js', import.meta.url));
const H = 36e5, now = Date.now();

// ---------- 1) Hàm thuần ----------
const TPL = 'Quiz answer: buying. Consider is followed by the -ing form. Practice it with a free quiz: {link}';
const clip = { id: 'cine-news-shopping-stop-8cf065-en', first_comment: TPL, lang: 'en' };
{
  const fb = F.firstComment(clip, 'facebook_page');
  ok(fb.mode === 'comment' && fb.text === TPL.replace('{link}', 'https://lexkite.com/api/go/fb/cine-news-shopping-stop-8cf065-en') && !fb.why, 'FB: bình luận của Page, {link} → link đếm click theo nền tảng + clip');
  ok(F.firstComment(clip, 'youtube').mode === 'comment' && F.firstComment(clip, 'youtube').link.endsWith('/go/yt/cine-news-shopping-stop-8cf065-en'), 'YouTube: bình luận của kênh, link yt');
  ok(F.firstComment(clip, 'threads').mode === 'reply' && F.firstComment(clip, 'x').mode === 'reply' && F.firstComment(clip, 'threads').text.includes('/go/th/'), 'Threads/X: self-reply');
  for (const p of ['instagram', 'tiktok']) { const f = F.firstComment(clip, p); ok(f.mode === 'bio' && !f.text && f.link === `https://lexkite.com/api/go/${F.FC_CODE[p]}/bio`, `${p}: KHÔNG bình luận link (không bấm được) → link bio`); }
  ok(F.firstComment({ ...clip, lang: 'vi' }, 'instagram').link.endsWith('/bio?l=vi') && F.firstComment({ ...clip, lang: 'zz' }, 'tiktok').link.endsWith('/tt/bio'), 'link bio theo ngôn ngữ landing (ngôn ngữ lạ → en)');
  ok(F.firstComment({ id: clip.id }, 'facebook_page').why === 'missing' && !F.firstComment({ id: clip.id }, 'facebook_page').text, 'clip chưa có bình luận viết lúc sản xuất → không bình luận (không tự chế câu)');
  ok(F.firstComment({ id: clip.id, _it: { first_comment: TPL } }, 'facebook_page').text.includes('/go/fb/'), 'đọc first_comment từ mục kho (_it)');
  ok(F.fcIssue('a {link} b {link}') === 'link-slot' && F.fcIssue('Answer: discuss the plan. More at https://evil.example now {link}') === 'raw-url' && F.fcIssue('Answer: discuss the plan. #learnenglish every day {link}') === 'tag' && F.fcIssue('Answer: discuss it. Full lesson in the link in bio: {link}') === 'spam' && F.fcIssue('Go {link}') === 'length', 'kiểm lại lúc đăng: 1 {link}, không link trần/hashtag/câu mồi/độ dài');
  ok(F.firstComment({ ...clip, first_comment: 'x'.repeat(250) + ' {link}' }, 'x').why === 'too-long' && F.firstComment({ ...clip, first_comment: 'x'.repeat(250) + ' {link}' }, 'facebook_page').text, 'quá giới hạn nền tảng (X 280) → không đăng; FB dài hơn vẫn được');
  ok(F.firstComment({ ...clip, id: '../evil' }, 'facebook_page').why === 'bad-clip', 'id clip sai dạng → không tạo link');
  const cap = RM.socialMeta({ id: clip.id, point: 'consider + -ing', slug: 's-1' }, 'facebook_page').description, th = RM.socialMeta({ id: clip.id, point: 'consider + -ing' }, 'threads').description;
  ok(/first comment 👇/.test(F.fcCaption(cap, 'facebook_page')) && !/lexkite\.com/.test(F.fcCaption(cap, 'facebook_page')) && /reply below/.test(F.fcCaption(th, 'threads')), 'FB/Threads: caption trỏ xuống bình luận (không lặp link)');
  ok(F.fcCaption(cap, 'youtube') === cap && F.fcCaption('no link here', 'facebook_page') === 'no link here', 'YouTube giữ link mô tả; caption không có dòng link → giữ nguyên');
  const yt = RM.socialMeta({ id: clip.id, point: 'consider + -ing', slug: 's-1' }, 'youtube');
  ok(yt.description.split('\n')[0].startsWith('Full lesson + quiz: https://lexkite.com/video/s-1/') && yt.seo.score >= 90, 'YouTube: link ở dòng đầu mô tả, SEO vẫn ≥ 90');
  for (const p of ['instagram', 'tiktok']) ok(!RM.socialMeta({ id: clip.id, point: 'consider + -ing' }, p).description.includes('https://') && RM.socialMeta({ id: clip.id, point: 'consider + -ing' }, p).description.includes('link in bio'), `${p}: caption "link in bio", không link không bấm được`);
  const st = {}; const c1 = F.cleanFc({ per_ch_day: 2 });
  ok(F.fcLeft(st, c1, 'ch', now) === 2 && (F.fcCount(st, 'ch', now), F.fcCount(st, 'ch', now), F.fcLeft(st, c1, 'ch', now) === 0) && F.fcLeft(st, c1, 'other', now) === 2 && F.fcLeft(st, c1, 'ch', now + 864e5) === 2, 'hạn mức bình luận theo kênh/ngày UTC, qua ngày đặt lại');
  ok(F.cleanFc({ per_ch_day: 999, max_tries: 0 }).per_ch_day === 20 && F.cleanFc({ max_tries: 0 }).max_tries === 1 && F.cleanFc({}).on === true && F.cleanFc({ on: false }).on === false, 'cài đặt bị kẹp (≤ 20/kênh/ngày, ≥ 1 lần thử)');
  // /api/go
  ok(F.parseGo('/api/go/fb/cine-a-123') && F.parseGo('/api/go/fb/cine-a-123').plat === 'facebook_page' && F.parseGo('/api/go/ig/bio', '?l=vi').lang === 'vi' && !F.parseGo('/api/go/zz/cine-a') && !F.parseGo('/api/go/fb/../../x') && !F.parseGo('/api/go/fb/A%2F'), 'đường /api/go: chỉ mã nền tảng biết + id clip hợp lệ');
  const t1 = F.goTarget({ plat: 'facebook_page', clip: 'cine-a-123', lang: 'en' }, 'look-for-a59145'), t2 = F.goTarget({ plat: 'tiktok', clip: '', lang: 'vi' }), t3 = F.goTarget({ plat: 'youtube', clip: 'cine-b' }, 'evil.com/x');
  ok(t1 === 'https://lexkite.com/video/look-for-a59145/?utm_source=facebook_page&utm_medium=social&utm_campaign=cine-a-123&utm_content=first_comment', 'đích = trang video + UTM (source nền tảng, medium social, campaign id bài)');
  ok(t2 === 'https://lexkite.com/vi/?utm_source=tiktok&utm_medium=social&utm_campaign=bio&utm_content=bio' && t3.startsWith('https://lexkite.com/app/?'), 'bio → landing nhẹ /<lang>/; slug lạ → /app/ (không chuyển hướng ra ngoài)');
  ok(F.isBot('facebookexternalhit/1.1') && F.isBot('Twitterbot/1.0') && F.isBot('') && !F.isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Instagram 300'), 'bot xem trước link không tính click');
  const cs = F.clickStats([{ kind: 'soc:facebook_page:fc', n: 5 }, { kind: 'soc:youtube:fc', n: 2 }, { kind: 'soc:instagram:bio', n: 3 }, { kind: 'socc:facebook_page:cine-a', n: 4 }, { kind: 'socc:facebook_page:cine-b', n: 1 }, { kind: 'land:x', n: 99 }]);
  ok(cs.total === 10 && cs.kinds.fc === 7 && cs.kinds.bio === 3 && cs.plats[0].k === 'facebook_page' && cs.top[0].clip === 'cine-a' && cs.top[0].n === 4, 'số liệu Quản trị: tổng, theo nền tảng, bình luận/bio, top clip');
}

// ---------- 2) /api/go: đếm + 302 ----------
{
  sql.exec('CREATE TABLE ext_events (day TEXT NOT NULL, kind TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, kind)) WITHOUT ROWID');
  const G = await import(new URL('../../functions/api/go/[[path]].js', import.meta.url)); G._resetSlugs();
  const ASSETS = { fetch: async u => new Response(JSON.stringify({ items: [{ id: 'news_shopping_stop_8cf065', slug: 'consider-buying-8cf065' }] }), { status: String(u).endsWith('/data/videos.json') ? 200 : 404 }) };
  const env = { DB, ASSETS }, ua = 'Mozilla/5.0 (iPhone) FBAN/FBIOS';
  const go = (path, o = {}) => G.onRequest({ request: new Request('https://lexkite.com' + path, { method: o.method || 'GET', headers: { 'User-Agent': o.ua == null ? ua : o.ua, 'CF-Connecting-IP': o.ip || '1.2.3.4' } }), env });
  const r1 = await go('/api/go/fb/cine-news-shopping-stop-8cf065-en');
  ok(r1.status === 302 && r1.headers.get('Location') === 'https://lexkite.com/video/consider-buying-8cf065/?utm_source=facebook_page&utm_medium=social&utm_campaign=cine-news-shopping-stop-8cf065-en&utm_content=first_comment', '302 tới trang video của clip (slug từ videos.json) + UTM');
  const cnt = k => (sql.prepare('SELECT SUM(n) AS n FROM ext_events WHERE kind = ?').get(k) || {}).n || 0;
  ok(cnt('soc:facebook_page:fc') === 1 && cnt('socc:facebook_page:cine-news-shopping-stop-8cf065-en') === 1, 'đếm click theo nền tảng + theo clip');
  await go('/api/go/fb/cine-news-shopping-stop-8cf065-en', { ua: 'facebookexternalhit/1.1' }); await go('/api/go/fb/cine-news-shopping-stop-8cf065-en', { method: 'HEAD' });
  ok(cnt('soc:facebook_page:fc') === 1, 'bot xem trước link + HEAD: chuyển hướng nhưng không đếm');
  const r2 = await go('/api/go/tt/bio?l=es'); ok(r2.status === 302 && r2.headers.get('Location').startsWith('https://lexkite.com/es/?utm_source=tiktok') && cnt('soc:tiktok:bio') === 1, 'link bio TikTok → landing /es/ + đếm');
  const r3 = await go('/api/go/fb/cine-x-zzzzzz-en'); ok(r3.headers.get('Location').startsWith('https://lexkite.com/app/?utm_source=facebook_page'), 'clip chưa có trang → /app/');
  ok((await go('/api/go/fb/..%2Fevil')).status === 404 && (await go('/api/go/qq/abc')).status === 404, 'đường sai → 404 (không mở chuyển hướng)');
  for (let i = 0; i < 25; i++) await go('/api/go/yt/cine-news-shopping-stop-8cf065-en', { ip: '9.9.9.9' });
  ok(cnt('soc:youtube:fc') === 20, 'chặn đếm dồn: ≤ 20 lượt/IP/giờ (vẫn chuyển hướng)');
  const broken = await G.onRequest({ request: new Request('https://lexkite.com/api/go/fb/cine-news-shopping-stop-8cf065-en', { headers: { 'User-Agent': ua } }), env: { DB: { batch: async () => { throw new Error('d1 down'); } }, ASSETS } });
  ok(broken.status === 302, 'D1 lỗi → người bấm vẫn được chuyển hướng');
}

// ---------- 3) Autopilot GrabCast: options.first_comment ----------
const A = await import(new URL('../../functions/api/_social_auto.js', import.meta.url));
const MGR = await import(new URL('../../functions/api/_social_mgr.js', import.meta.url));
const DATA = (await import(new URL('../../functions/api/_shorts_data.js', import.meta.url))).default;
const [CA, CB, CC] = DATA.index.items.map(x => x.id);
for (const it of DATA.index.items) { it.point = it.point || 'look for: I am looking for a book'; it.first_comment = TPL; }
DATA.index.items.find(x => x.id === CC).first_comment = undefined; // clip chưa có bình luận viết lúc sản xuất
const GC = { posts: {}, n: 0, caps: true }; let calls = [];
const MG = { calls: [], comments: [], postFail: null, n: 0 };
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url), J = (b, s = 200) => new Response(JSON.stringify(b), { status: s });
  if (u.hostname === 'lexkite.com' && u.pathname === '/api/admin-shorts') return new Response(new Uint8Array(1000), { status: 200, headers: { 'Content-Length': '1000' } });
  if (u.hostname === 'upload.example') return new Response('', { status: 200 });
  if (u.hostname === 'api.github.com') return new Response('no', { status: 404 });
  if (u.hostname === 'graph.facebook.com') {
    const p = u.pathname.replace(/^\/v\d+\.\d+\//, ''), f = Object.fromEntries(new URLSearchParams(init.body || u.search));
    MG.calls.push({ m: init.method || 'GET', p, f });
    if (p === 'debug_token') return J({ data: { is_valid: true, expires_at: 0, scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_manage_engagement'] } });
    let m = /^(\d+)\/comments$/.exec(p);
    if (m && (init.method || 'GET') === 'GET') return J({ data: MG.comments.filter(c => c.obj === m[1]).map(c => ({ id: c.id, message: c.message, from: { id: '123456789' } })) });
    if (m && init.method === 'POST') {
      if (MG.postFail === 'perm') return J({ error: { code: 200, message: 'Permissions error' } }, 403);
      if (MG.postFail === 'timeout') { MG.comments.push({ obj: m[1], id: m[1] + '_' + (++MG.n), message: f.message }); throw new Error('timeout'); }
      if (MG.postFail === 'down') return J({ error: { code: 2, message: 'down' } }, 500);
      const c = { obj: m[1], id: m[1] + '_' + (++MG.n), message: f.message }; MG.comments.push(c); return J({ id: c.id });
    }
    return J({});
  }
  const p = u.pathname.replace('/api/social/', '');
  calls.push({ m: init.method, p, body: init.body && JSON.parse(init.body) });
  if (p === 'accounts') return J({ accounts: [{ id: 2, platform: 'facebook_page', display_name: 'Lexkite', kinds: ['reel'], capabilities: { publish: true, first_comment: GC.caps } }, { id: 3, platform: 'instagram', display_name: 'lexkite.app', kinds: ['reel'], capabilities: { publish: true, first_comment: true } }, { id: 5, platform: 'facebook_page', display_name: 'Lexkite 2', kinds: ['reel'], capabilities: { publish: true } }] });
  if (p === 'posts' && init.method === 'GET') return J({ posts: Object.values(GC.posts) });
  if (p === 'posts' && init.method === 'POST') { const k = (init.headers || {})['Idempotency-Key'], ex = Object.values(GC.posts).find(x => x._k === k); if (ex) return J({ post: ex }); const id = 'p_' + (++GC.n), b = JSON.parse(init.body); GC.posts[id] = { id, status: 'draft', _k: k, ...b }; return J({ post: GC.posts[id] }); }
  if (/^media\/[^/]+$/.test(p) && init.method === 'GET') return J({ media: { id: p.slice(6), status: 'ready' } });
  let m = /^posts\/([^/]+)$/.exec(p); if (m) return GC.posts[m[1]] ? J({ post: GC.posts[m[1]] }) : J({ error: { code: 'not_found' } }, 404);
  if (p === 'validate') return J({ ok: true, targets: [] });
  m = /^posts\/([^/]+)\/schedule$/.exec(p); if (m) { if (GC.posts[m[1]].status !== 'draft') return J({ error: 'not_draft' }, 409); Object.assign(GC.posts[m[1]], { status: 'scheduled', scheduled_at: JSON.parse(init.body).scheduled_at }); return J({ post: GC.posts[m[1]] }); }
  return J({});
};
const ENV = { DB, GRABCAST_API_KEY: 'gk_live_SECRET_auto_123456', SHORTS_READ_TOKEN: 'ro', LEXKITE_DRIVE_CLI_KEY: 'cli-key-for-tests-0123456789abcdef' };
await MGR.setupMgr(DB);
sql.exec('CREATE TABLE yt_queue (clip TEXT PRIMARY KEY, lesson TEXT, status TEXT, privacy TEXT, publish_at TEXT, approved_by TEXT, approved_at INTEGER, video_id TEXT, upload_url TEXT, session_at INTEGER, attempts INTEGER DEFAULT 0, err TEXT, updated INTEGER, thumb INTEGER, title TEXT, channel_id TEXT); CREATE TABLE clip_review (clip TEXT PRIMARY KEY, state TEXT, deleted INTEGER, web INTEGER)');
for (const c of [CA, CB, CC]) sql.prepare("INSERT INTO yt_queue (clip, status) VALUES (?, 'manual')").run(c);
const setCfg = o => sql.prepare("INSERT INTO soc_meta (k, v, at) VALUES ('auto', ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").run(JSON.stringify({ plats: { tiktok: false }, plan_daily: false, sync_h: 6, provider: 'grabcast', ...o }), now);
setCfg({});
await A.runAuto({ ...ENV, GRABCAST_API_KEY: '' }, { now }); // tạo bảng
const ext = sql.prepare('INSERT INTO dist_ext (channel_id, platform, account_id, title, status, updated) VALUES (?, ?, ?, ?, ?, ?)');
ext.run('gc-facebook_page-2', 'facebook_page', '2', 'Lexkite', 'ok', now); ext.run('gc-instagram-3', 'instagram', '3', 'lexkite.app', 'ok', now); ext.run('gc-facebook_page-5', 'facebook_page', '5', 'Lexkite 2', 'ok', now);
const due = (clip, ch, h) => sql.prepare("INSERT INTO dist_social (clip, channel_id, platform, slot_ms, source, rule, state, updated) VALUES (?, ?, ?, ?, 'auto', 0, 'planned', ?) ON CONFLICT(clip, channel_id) DO UPDATE SET slot_ms = excluded.slot_ms, state = 'planned'").run(clip, ch, ch.split('-')[1], Math.round(now + h * H), now);
for (const c of [CA, CB, CC]) sql.prepare('INSERT INTO soc_meta (k, v, at) VALUES (?, ?, ?)').run('media:' + c, JSON.stringify({ id: 'm_' + c }), now);
const post = (clip, acc) => Object.values(GC.posts).find(p => p.media_ids[0] === 'm_' + clip && p.targets[0].account_id === acc);
const board = pid => sql.prepare('SELECT * FROM soc_board WHERE post_id = ?').get(pid);
due(CA, 'gc-facebook_page-2', 3); due(CA, 'gc-instagram-3', 4); due(CA, 'gc-facebook_page-5', 5);
let r = await A.runAuto(ENV, { now });
const pa = post(CA, 2), pi = post(CA, 3), p5 = post(CA, 5);
ok(r.created === 3 && pa && pi && p5, `lượt 1 tạo 3 bài (tạo ${r.created})`);
ok(pa.targets[0].options.first_comment === TPL.replace('{link}', 'https://lexkite.com/api/go/fb/' + CA) && /first comment 👇/.test(pa.caption) && !pa.first_comment, 'FB (kênh có quyền first_comment): 1 bình luận đầu trong target options, caption trỏ xuống bình luận');
ok(!pi.targets[0].options.first_comment && /link in bio/.test(pi.caption) && !/https:\/\//.test(pi.caption), 'IG: không bình luận link, caption "link in bio"');
ok(!p5.targets[0].options.first_comment && /Full lesson \+ quiz: https:\/\/lexkite\.com/.test(p5.caption) && r.fc.skipped.some(s => s.ch === 'gc-facebook_page-5' && s.why === 'no-capability'), 'kênh GrabCast không báo quyền first_comment → giữ link trong caption, ghi lý do');
ok(board(pa.id).fc === pa.targets[0].options.first_comment && !board(p5.id).fc && r.fc.attached === 1, 'soc_board.fc lưu đúng bình luận đã gắn');
ok(calls.filter(c => c.p === 'posts' && c.m === 'POST').length === 3 && !calls.some(c => /comment/.test(c.p)), 'bình luận nằm trong lệnh tạo bài – không có lệnh thứ 2 (không thể đăng trùng)');
const h1 = await MGR.contentHash(pa), h2 = await MGR.contentHash({ ...pa, targets: [{ ...pa.targets[0], options: { ...pa.targets[0].options, first_comment: 'khác {link}' } }] });
ok(h1 !== h2, 'bình luận đầu nằm trong dấu băm duyệt: sửa bình luận sau khi duyệt = phải duyệt lại');
// tự duyệt: đã có 1 bài FB duyệt tay KHÔNG bình luận → bài CÓ bình luận vẫn chờ duyệt tay (bài đầu mỗi nền tảng)
sql.prepare("INSERT INTO soc_board (id, post_id, clip, accounts, plats, state, approved_by, approved_at, created, updated, by_who) VALUES ('b_old', 'p_old', 'old', '[\"2\"]', '[\"facebook_page\"]', 'published', 'boss@lexkite.com', ?, ?, ?, 'boss@lexkite.com')").run(now, now, now);
setCfg({ auto_approve: true, autopub: { facebook_page: true, instagram: true, tiktok: true, youtube: true, threads: true }, manual_first: 1 });
due(CB, 'gc-facebook_page-2', 6); due(CB, 'gc-facebook_page-5', 7);
calls = []; r = await A.runAuto(ENV, { now: now + 60e3 });
const pb = post(CB, 2), pb5 = post(CB, 5);
ok(pb && pb.status === 'draft' && pb.targets[0].options.first_comment && pb5 && pb5.status === 'scheduled', `tự duyệt: bài FB có bình luận chờ duyệt TAY (chưa có bài có bình luận nào duyệt tay); bài không bình luận tự lên lịch (FB ${pb && pb.status}, FB5 ${pb5 && pb5.status})`);
ok(r.review >= 1 && !(await A.manualCounts(DB, { fc: true })).facebook_page && (await A.manualCounts(DB)).facebook_page === 1, 'đếm duyệt tay có bình luận tách riêng');
// chủ duyệt tay 1 bài có bình luận → bài sau tự lên lịch
{ const gc = (await import(new URL('../../functions/api/_grabcast.js', import.meta.url))).gcClient(ENV); await MGR.OPS['POST board/approve']({ db: DB, b: { id: board(pa.id).id }, who: 'boss@lexkite.com', gc, idem: 'apv-fc-1' }); }
ok((await A.manualCounts(DB, { fc: true })).facebook_page === 1, 'sau khi chủ duyệt tay bài có bình luận: đếm = 1');
calls = []; r = await A.runAuto(ENV, { now: now + 2 * 60e3 });
ok(post(CB, 2).status === 'scheduled' && board(post(CB, 2).id).approved_by === 'autopilot', 'bài có bình luận tiếp theo tự lên lịch');
// hạn mức kênh/ngày + clip thiếu bình luận + công tắc
setCfg({ auto_approve: true, autopub: { facebook_page: true, instagram: true, tiktok: true, youtube: true, threads: true }, manual_first: 1, fc: { per_ch_day: 2 } });
due(CC, 'gc-facebook_page-2', 8);
calls = []; r = await A.runAuto(ENV, { now: now + 3 * 60e3 });
const pc = post(CC, 2);
ok(pc && !pc.targets[0].options.first_comment && r.fc.skipped.some(s => s.clip === CC && /missing|rate/.test(s.why)), 'clip thiếu bình luận hoặc hết hạn mức → đăng không bình luận, ghi lý do');
const stx = JSON.parse(sql.prepare("SELECT v FROM soc_meta WHERE k = 'auto_state'").get().v);
ok(stx.fc && stx.fc.n['gc-facebook_page-2'] === 2, 'đếm bình luận/kênh/ngày lưu ở D1');
ok(F.fcLeft(stx, F.cleanFc({ per_ch_day: 2 }), 'gc-facebook_page-2', now) === 0, 'kênh đã đủ 2 bình luận hôm nay → hết hạn mức');
const S = await A.autoOpFor('GET', 'lk/auto')({ env: ENV });
ok(S.cfg.fc.per_ch_day === 2 && S.clicks && S.clicks.total >= 1 && S.clicks.plats.some(x => x.k === 'facebook_page') && S.fc.manual.facebook_page === 1, 'Quản trị: cài đặt fc, click 28 ngày, đếm duyệt tay có bình luận');

// ---------- 4) Đường Meta: bình luận của Page sau khi Reel lên ----------
{
  const MENV = { ...ENV, GRABCAST_API_KEY: '', META_PAGE_TOKEN: 'EAAB' + 'x'.repeat(40), META_PAGE_ID: '123456789' };
  setCfg({ provider: 'meta', fc: { per_ch_day: 6, max_tries: 2 } });
  sql.prepare('DELETE FROM dist_ext WHERE channel_id != ?').run('gc-facebook_page-2');
  const addLock = (clip, vid, fc) => { sql.prepare("INSERT INTO soc_lock (clip, channel_id, platform, provider, state, slot_ms, meta_id, created, updated, fc_state, fc_tries) VALUES (?, 'gc-facebook_page-2', 'facebook_page', 'meta', 'posted', ?, ?, ?, ?, 'due', 0)").run(clip, now, vid, now, now); return A.boardId(clip, 'gc-facebook_page-2').then(id => sql.prepare("INSERT INTO soc_board (id, clip, accounts, plats, state, created, updated, by_who, fc) VALUES (?, ?, '[\"2\"]', '[\"facebook_page\"]', 'published', ?, ?, 'autopilot', ?) ON CONFLICT(id) DO UPDATE SET fc = excluded.fc").run(id, clip, now, now, fc)); };
  const lock = clip => sql.prepare("SELECT * FROM soc_lock WHERE clip = ? AND channel_id = 'gc-facebook_page-2'").get(clip);
  const FCT = TPL.replace('{link}', 'https://lexkite.com/api/go/fb/m-one-111111-en');
  await addLock('m-one-111111-en', '900001', FCT);
  MG.calls = []; r = await A.runAuto(MENV, { now: now + 10 * 60e3 });
  const posts = MG.calls.filter(c => c.m === 'POST' && /comments$/.test(c.p));
  ok(posts.length === 1 && posts[0].p === '900001/comments' && posts[0].f.message === FCT && lock('m-one-111111-en').fc_state === 'done' && /^900001_/.test(lock('m-one-111111-en').fc_id), 'Reel FB đã lên: đúng 1 bình luận của Page trên video, ghi done + id');
  MG.calls = []; await A.runAuto(MENV, { now: now + 20 * 60e3 });
  ok(!MG.calls.some(c => /comments$/.test(c.p)), 'lượt sau: không bình luận lại');
  // hết giờ chờ (có thể đã đăng) → lượt sau tìm thấy bình luận của Page → không đăng lần 2
  await addLock('m-two-222222-en', '900002', FCT.replace('m-one-111111-en', 'm-two-222222-en'));
  MG.postFail = 'timeout'; await A.runAuto(MENV, { now: now + 30 * 60e3 }); MG.postFail = null;
  ok(lock('m-two-222222-en').fc_state === 'unknown', 'hết giờ chờ → trạng thái unknown (không đăng mù)');
  MG.calls = []; await A.runAuto(MENV, { now: now + 40 * 60e3 });
  ok(MG.calls.some(c => c.m === 'GET' && c.p === '900002/comments') && !MG.calls.some(c => c.m === 'POST' && c.p === '900002/comments') && lock('m-two-222222-en').fc_state === 'done' && MG.comments.filter(c => c.obj === '900002').length === 1, 'lượt sau đọc bình luận của Page, thấy đã có → done, đúng 1 bình luận');
  // lỗi quyền → no-perm + cảnh báo, kênh KHÔNG bị dừng
  await addLock('m-three-333333-en', '900003', FCT.replace('m-one-111111-en', 'm-three-333333-en'));
  MG.postFail = 'perm'; r = await A.runAuto(MENV, { now: now + 50 * 60e3 }); MG.postFail = null;
  const st4 = JSON.parse(sql.prepare("SELECT v FROM soc_meta WHERE k = 'auto_state'").get().v);
  ok(lock('m-three-333333-en').fc_state === 'no-perm' && (st4.log || []).some(e => /^fc-perm:/.test(e.k) && /pages_manage_engagement/.test(e.text)) && !((st4.meta || {}).br || {})['gc-facebook_page-2'], 'thiếu pages_manage_engagement → no-perm + cảnh báo "Kết nối lại", không mở cầu dao kênh');
  // lỗi tạm → thử lại có giới hạn (max_tries 2) rồi dừng
  await addLock('m-four-444444-en', '900004', FCT.replace('m-one-111111-en', 'm-four-444444-en'));
  MG.postFail = 'down'; await A.runAuto(MENV, { now: now + 60 * 60e3 });
  ok(lock('m-four-444444-en').fc_state === 'retry' && lock('m-four-444444-en').fc_tries === 1, 'Meta 500 → retry, đếm lần thử');
  await A.runAuto(MENV, { now: now + 70 * 60e3 }); MG.postFail = null;
  ok(lock('m-four-444444-en').fc_state === 'gave-up' && lock('m-four-444444-en').fc_tries === 2, 'quá max_tries → gave-up (không thử mãi)');
  MG.calls = []; await A.runAuto(MENV, { now: now + 80 * 60e3 }); ok(!MG.calls.some(c => c.p === '900004/comments'), 'gave-up: không gọi nữa');
  // bài không có bình luận → none, 0 lượt gọi bình luận
  await addLock('m-five-555555-en', '900005', null); MG.calls = []; await A.runAuto(MENV, { now: now + 90 * 60e3 });
  ok(lock('m-five-555555-en').fc_state === 'none' && !MG.calls.some(c => /comments$/.test(c.p)), 'bài không có bình luận → none, không gọi Graph');
  ok(/soc_lock_fc/.test(JSON.stringify(sql.prepare("EXPLAIN QUERY PLAN SELECT clip, channel_id, meta_id, fc_state, fc_tries, updated FROM soc_lock WHERE fc_state IN ('due', 'retry', 'unknown') LIMIT 10").all())), 'lượt bình luận Meta đọc theo chỉ mục soc_lock_fc (không quét bảng)');
}

// ---------- 5) Nguồn: sản xuất → kho → autopilot ----------
{
  const fs = await import('node:fs'), src = f => fs.readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
  ok(/it\.first_comment = P\.first_comment/.test(src('scripts/video/shorts-meta.mjs')) && /first_comment: typeof it\.first_comment === 'string'/.test(src('functions/api/distribution.js')), 'khối publish.first_comment → manifest (shorts-meta) → clipOf');
  ok(/fc_errors\(pub\.get\('first_comment'\)/.test(src('scripts/cine/publish_meta.py')) && /gate\('publish_meta'/.test(src('scripts/cine/qc_gate.py')), 'qc_gate chặn clip thiếu/sai bình luận đầu (publish_meta.validate)');
  ok(/SCOPES_OPT = \{ fb: 'pages_manage_engagement' \}/.test(src('functions/api/_meta_oauth.js')), 'Kết nối Meta xin thêm pages_manage_engagement (tùy chọn)');
  const doc = src('docs/DISTRIBUTION.md'); ok(/§6c|6c\./.test(doc) && /ghim/i.test(doc) && /developers\.facebook\.com/.test(doc) && /developers\.google\.com\/youtube/.test(doc), 'docs: bảng nền tảng → cách làm → ghim (có nguồn)');
}
console.log(fails ? `✗ social-first-comment: ${fails}/${n} lỗi` : `✓ social-first-comment: ${n} kiểm tra đạt (bình luận đầu, link đếm click, chống trùng, hạn mức, duyệt tay bài đầu)`);
process.exit(fails ? 1 : 0);
