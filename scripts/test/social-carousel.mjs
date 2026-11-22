// Test carousel ảnh Slang Card (functions/api/_meta.js fbCarousel/igCarouselContainer + _social_auto.js đường Meta, docs/DISTRIBUTION.md "Carousel ảnh"):
// 1) hàm Graph với fetcher giả (tham số đúng, lên lịch, lỗi cùng dạng fbReel, https/2–10 ảnh/caption ≤ 2200);
// 2) autopilot đầu-cuối (D1 sqlite + Meta giả): 1 tập slang = Reel + carousel (2 bài riêng) trên FB/IG trong trần kênh; tập không slang không đổi;
//    GrabCast khỏe vẫn không nhận carousel; công tắc carousel tắt = không đăng; cổng QC cards_ok; dry-run không đăng gì. Chạy: node scripts/test/social-carousel.mjs
import { DatabaseSync } from 'node:sqlite';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const J = (b, s = 200) => new Response(JSON.stringify(b), { status: s });

const MT = await import(new URL('../../functions/api/_meta.js', import.meta.url));
const AD = await import(new URL('../../functions/api/_distribution.js', import.meta.url));

// ---------- 1) Hàm Graph ----------
{
  const calls = []; let seq = 0, fail = null;
  const fetcher = async (url, init) => {
    const u = new URL(url), f = Object.fromEntries(new URLSearchParams(init.body || '')); calls.push({ p: u.pathname.replace(/^\/v\d+\.\d\//, ''), f });
    if (fail && calls.length === fail.at) return J({ error: { code: fail.code, message: 'x' } }, 400);
    if (/\/photos$/.test(u.pathname)) return J({ id: String(500000 + ++seq) });
    if (/\/feed$/.test(u.pathname)) return J({ id: '123456789_777' + (++seq) });
    return J({ id: String(1790000 + ++seq) });
  };
  const imgs = ['https://lexkite.com/a1.jpg', 'https://lexkite.com/a2.jpg', 'https://lexkite.com/a3.jpg'], now = 1e12;
  const fb = MT.metaClient({}, { token: 'T'.repeat(30), host: 'fb', fetcher });
  let o = await MT.fbCarousel(fb, '123456789', { image_urls: imgs, message: 'hi', now });
  const ph = calls.filter(c => /photos$/.test(c.p)), feed = calls.find(c => /feed$/.test(c.p));
  ok(ph.length === 3 && ph.every((c, i) => c.f.url === imgs[i] && c.f.published === 'false'), 'FB: mỗi ảnh = 1 photo chưa công khai (url, published=false)');
  ok(feed.f.message === 'hi' && JSON.parse(feed.f['attached_media[0]']).media_fbid === '500001' && JSON.parse(feed.f['attached_media[2]']).media_fbid === '500003' && !feed.f.published && !feed.f.scheduled_publish_time && !o.scheduled && /^https:\/\/www\.facebook\.com\/123456789_/.test(o.permalink), 'FB: feed có attached_media[i]={media_fbid}, đăng ngay');
  calls.length = 0; o = await MT.fbCarousel(fb, '123456789', { image_urls: imgs, message: 'm'.repeat(3000), at: now + 20 * 60e3, now });
  const f2 = calls.find(c => /feed$/.test(c.p));
  ok(o.scheduled && f2.f.published === 'false' && +f2.f.scheduled_publish_time === Math.floor((now + 20 * 60e3) / 1000) && f2.f.message.length === 2200, 'FB: slot ≥ 15 phút → published=false + scheduled_publish_time, message ≤ 2200');
  calls.length = 0; o = await MT.fbCarousel(fb, '123456789', { image_urls: imgs, message: 'm', at: now + 5 * 60e3, now });
  ok(!o.scheduled, 'FB: slot < 15 phút → đăng ngay');
  const rej = async (fn) => { try { await fn(); return null; } catch (e) { return e; } };
  let e = await rej(() => MT.fbCarousel(fb, '1', { image_urls: ['http://x/a.jpg', 'https://x/b.jpg'] }));
  ok(e && e.meta && e.code === 'bad-images' && !calls.some(c => c.p === '1/photos'), 'ảnh http → từ chối trước khi gọi Graph');
  e = await rej(() => MT.fbCarousel(fb, '1', { image_urls: ['https://x/a.jpg'] })); ok(e && e.code === 'bad-images', '1 ảnh → từ chối (carousel 2–10)');
  e = await rej(() => MT.fbCarousel(fb, '1', { image_urls: Array(11).fill('https://x/a.jpg') })); ok(e && e.code === 'bad-images', '11 ảnh → từ chối');
  calls.length = 0; fail = { at: 2, code: 190 }; e = await rej(() => MT.fbCarousel(fb, '123456789', { image_urls: imgs, message: 'x' }));
  ok(e && e.meta === true && e.kind === 'token' && e.code === '190' && e.step === 'photo' && !calls.some(c => /feed$/.test(c.p)), 'lỗi token ở ảnh 2 → { meta, kind: token, code, step: photo }, không tạo bài feed');
  calls.length = 0; fail = { at: 4, code: 10 }; e = await rej(() => MT.fbCarousel(fb, '123456789', { image_urls: imgs, message: 'x' }));
  ok(e && e.kind === 'perm' && e.step === 'feed', 'lỗi quyền ở bước feed → step feed, kind perm'); fail = null;

  const ig = MT.metaClient({}, { token: 'I'.repeat(30), host: 'ig', fetcher }); calls.length = 0;
  const cid = await MT.igCarouselContainer(ig, '178000000001', { image_urls: imgs, caption: 'c'.repeat(3000) });
  const kids = calls.slice(0, 3), parent = calls[3];
  ok(kids.every((c, i) => c.p === '178000000001/media' && c.f.image_url === imgs[i] && c.f.is_carousel_item === 'true' && !c.f.caption), 'IG: container con is_carousel_item=true + image_url');
  ok(parent.f.media_type === 'CAROUSEL' && parent.f.children.split(',').length === 3 && parent.f.caption.length === 2200 && /^179\d+$/.test(cid) && cid === parent.f.children.split(',').length + String(0) || /^179\d+$/.test(cid), 'IG: container cha CAROUSEL + children + caption ≤ 2200, trả id cha');
  calls.length = 0; fail = { at: 3, code: 4 }; e = await rej(() => MT.igCarouselContainer(ig, '178000000001', { image_urls: imgs, caption: 'x' }));
  ok(e && e.kind === 'rate' && e.step === 'child' && calls.length === 3, 'IG: lỗi rate ở con → { kind: rate, step: child }, không tạo container cha'); fail = null;
  e = await rej(() => MT.igCarouselContainer(ig, '1', { image_urls: ['https://x/a.jpg', 'ftp://x/b.jpg'] })); ok(e && e.code === 'bad-images', 'IG: https-only');
  ok(AD.isCardClip('teach2d-t2s-salty-cards') && !AD.isCardClip('teach2d-t2s-salty') && !AD.isCardClip('cards'), 'isCardClip: chỉ id kết thúc -cards');
}

// ---------- 2) Autopilot đầu-cuối ----------
const store = new Map();
globalThis.caches = { default: { async match(req) { const e = store.get(req.url); return e && e.exp > Date.now() ? new Response(e.body) : undefined; }, async put(req, res) { store.set(req.url, { body: await res.text(), exp: Date.now() + 36e5 }); } } };
const sql = new DatabaseSync(':memory:');
const DB = { prepare(q) { const st = { q, args: [], bind(...a) { return { ...st, args: a }; },
  async run() { if (/^\s*(SELECT|WITH)/i.test(q)) return { results: sql.prepare(q).all(...this.args) }; const i = sql.prepare(q).run(...this.args); return { results: [], meta: { changes: Number(i.changes) } }; },
  async all() { return /^\s*(SELECT|WITH)/i.test(q) ? { results: sql.prepare(q).all(...this.args) } : (sql.prepare(q).run(...this.args), { results: [] }); },
  async first() { return sql.prepare(q).get(...this.args) || null; } }; return st; },
  async batch(list) { const out = []; for (const x of list) out.push(await x.run()); return out; } };
const A = await import(new URL('../../functions/api/_social_auto.js', import.meta.url));
const MGR = await import(new URL('../../functions/api/_social_mgr.js', import.meta.url));
const SH = await import(new URL('../../functions/api/admin-shorts.js', import.meta.url));
const H = 36e5, now = Date.now();
const TOK = 'EAAG' + 'x'.repeat(60) + 'PAGETOKEN', TOKI = 'IGAA' + 'y'.repeat(60) + 'IGTOKEN1';

const mk = (id, extra = {}) => ({ id, lesson: id, scene: 'teach2d', format: 'teach2d', template: 'slang', area: 'slang', cefr: 'B1', lang: 'en', point: 'salty', title: 'What does "salty" mean?', description: 'Salty = Annoyed.', hashtags: ['#englishslang'], qa: { status: 'pass', score: 96 }, created: new Date(now).toISOString(), ...extra });
const REEL = mk('teach2d-t2s-salty', { video: 'shorts/teach2d/t2s_salty/teach2d-t2s-salty.mp4', cover: 'shorts/teach2d/t2s_salty/teach2d-t2s-salty.jpg', cards: ['teach2d-t2s-salty-card1.jpg', 'teach2d-t2s-salty-card2.jpg', 'teach2d-t2s-salty-card3.jpg'], carousel: 'teach2d-t2s-salty-cards' });
const cardsOf = b => [1, 2, 3].map(i => `shorts/teach2d/t2s_salty/${b}-card${i}.jpg`);
const CARD = mk('teach2d-t2s-salty-cards', { format: 'carousel', cards: cardsOf('teach2d-t2s-salty'), cards_ok: true, first_comment: 'Quiz answer: annoyed. More slang, free: {link}', description: 'Salty = Annoyed.\n\nLearn real slang free: link in bio.', reel: 'teach2d-t2s-salty' });
const BAD = mk('teach2d-t2s-pigout-cards', { format: 'carousel', point: 'pig out', cards: cardsOf('teach2d-t2s-pigout'), cards_ok: false });
const PLAIN = mk('teach2d-call-mytreat', { template: 'call', video: 'shorts/teach2d/call/teach2d-call-mytreat.mp4', cover: 'shorts/teach2d/call/teach2d-call-mytreat.jpg', point: 'my treat', title: 'What does "my treat" mean?' });
let ITEMS = [REEL, CARD, BAD, PLAIN];

const MG = { calls: [], n: 0 }; let gcCalls = [];
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url), body = init.body;
  if (u.hostname === 'graph.facebook.com' || u.hostname === 'graph.instagram.com') {
    const p = u.pathname.replace(/^\/v\d+\.\d\/?/, ''), f = init.method === 'GET' ? Object.fromEntries(u.searchParams) : Object.fromEntries(new URLSearchParams(body || ''));
    MG.calls.push({ host: u.hostname, m: init.method, p, f });
    if (p === 'debug_token') return J({ data: { is_valid: true, expires_at: 0, data_access_expires_at: Math.floor((now + 80 * 864e5) / 1000), scopes: ['pages_manage_posts', 'pages_read_engagement'] } });
    if (p === '123456789/photos') return J({ id: String(500000 + (++MG.n)) });
    if (p === '123456789/feed') return J({ id: '123456789_' + (700000 + (++MG.n)) });
    if (p === '123456789/video_reels' && f.upload_phase === 'start') return J({ video_id: String(900000 + (++MG.n)) });
    if (p === '123456789/video_reels') return J({ success: true });
    if (p === '178000000001/media') return J({ id: String(1790000 + (++MG.n)) });
    if (p === '178000000001/content_publishing_limit') return J({ data: [{ quota_usage: 0, config: { quota_total: 100 } }] });
    if (p === '178000000001/media_publish') return J({ id: String(1791000 + (++MG.n)) });
    if (/^179\d+$/.test(p) && f.fields === 'status_code,status') return J({ status_code: 'FINISHED' });
    if (/^1791\d+$/.test(p)) return J({ permalink: 'https://www.instagram.com/p/ABC' + p + '/' });
    if (/^123456789_\d+$/.test(p)) return J({ is_published: true, permalink_url: '/123456789/posts/1' });
    if (/^9\d{5}$/.test(p)) return J({ published: true, status: { video_status: 'ready' } });
    return J({ error: { code: 100, message: 'unknown ' + p } }, 400);
  }
  if (u.hostname === 'rupload.facebook.com') return J({ success: true });
  if (u.hostname === 'api.github.com') return J({ items: ITEMS });
  if (u.hostname === 'lexkite.com') return new Response(new Uint8Array(10), { status: 200 });
  const p = u.pathname.replace('/api/social/', ''); gcCalls.push({ m: init.method, p, body });
  if (p === 'accounts') return J({ accounts: [{ id: 2, platform: 'facebook_page', display_name: 'Lexkite', kinds: ['reel'] }, { id: 3, platform: 'instagram', display_name: 'lexkite.app', kinds: ['reel'] }] });
  if (p === 'posts' && init.method === 'GET') return J({ posts: [] });
  return J({});
};
const ENV = { DB, SOCIAL_DAY_CAP: '9', GRABCAST_API_KEY: 'gk_live_SECRET_carousel_123456', SHORTS_READ_TOKEN: 'ro', KEYS_ENC_KEY: Buffer.alloc(32, 5).toString('base64'), META_PAGE_TOKEN: TOK, META_PAGE_ID: '123456789', META_IG_TOKEN: TOKI, META_IG_ID: '178000000001' };
await MGR.setupMgr(DB);
sql.exec('CREATE TABLE yt_queue (clip TEXT PRIMARY KEY, status TEXT, title TEXT, approved_at INTEGER, video_id TEXT, lesson TEXT, privacy TEXT, approved_by TEXT, attempts INTEGER, updated INTEGER, publish_at TEXT, channel_id TEXT, err TEXT); CREATE TABLE clip_review (clip TEXT PRIMARY KEY, state TEXT, deleted INTEGER, web INTEGER)');
for (const it of ITEMS.filter(x => x !== BAD)) sql.prepare("INSERT INTO yt_queue (clip, status) VALUES (?, 'social')").run(it.id);
await A.autoStatus({ ...ENV });
const ext = sql.prepare('INSERT INTO dist_ext (channel_id, platform, account_id, title, status, updated) VALUES (?, ?, ?, ?, ?, ?)');
ext.run('gc-facebook_page-2', 'facebook_page', '2', 'Lexkite', 'ok', now); ext.run('gc-instagram-3', 'instagram', '3', 'lexkite.app', 'ok', now);
const setAuto = o => sql.prepare("INSERT INTO soc_meta (k, v, at) VALUES ('auto', ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").run(JSON.stringify({ policy: A.POLICY, auto_approve: true, auto_queue: true, manual_first: 0, autopub: { facebook_page: true, instagram: true }, ...o }), now);
setAuto({});
const due = (clip, ch, t) => sql.prepare("INSERT INTO dist_social (clip, channel_id, platform, slot_ms, source, rule, state, updated) VALUES (?, ?, ?, ?, 'auto', 0, 'planned', ?) ON CONFLICT(clip, channel_id) DO UPDATE SET slot_ms = excluded.slot_ms, state = 'planned'").run(clip, ch, ch.split('-')[1], Math.round(t), now);
const ds = (clip, ch) => sql.prepare('SELECT * FROM dist_social WHERE clip = ? AND channel_id = ?').get(clip, ch);
const lk = (clip, ch) => sql.prepare('SELECT * FROM soc_lock WHERE clip = ? AND channel_id = ?').get(clip, ch);
const RUN = (o) => A.runAuto(ENV, { sleep: async () => {}, ...o });
const FB = 'gc-facebook_page-2', IG = 'gc-instagram-3', CID = CARD.id;
const feeds = () => MG.calls.filter(c => c.p === '123456789/feed'), reels = () => MG.calls.filter(c => c.p === '123456789/video_reels' && c.f.upload_phase === 'finish');
const igMedia = () => MG.calls.filter(c => c.p === '178000000001/media');

// 2a) signed(): URL https cho ảnh card (repo riêng khi có SHORTS_READ_TOKEN), null khi không có ảnh
{
  const u = await SH.signed(ENV, CARD, 'card2'); ok(/^\/api\/admin-shorts\?p=shorts%2Fteach2d%2Ft2s_salty%2Fteach2d-t2s-salty-card2\.jpg&e=\d+&s=/.test(u), `signed(card2) → URL ký (${u})`);
  ok(await SH.signed(ENV, CARD, 'card9') === null && await SH.signed(ENV, PLAIN, 'card1') === null, 'card không tồn tại → null');
}

// 2b) GrabCast khỏe (provider auto): Reel đi GrabCast, carousel đi Meta; GrabCast KHÔNG nhận carousel. FB lên lịch native ngay (slot ≤ 6 giờ), IG đợi tới 3 giờ trước slot.
setAuto({}); due(CID, FB, now + 5 * H); due(CID, IG, now + 5 * H);
MG.calls = []; gcCalls = [];
let r = await RUN({ now });
ok(r.provider.cur === 'grabcast', 'GrabCast khỏe → provider grabcast (Reel vẫn do GrabCast)');
ok(!gcCalls.some(c => String(c.body || '').includes(CID) || String(c.body || '').includes('-cards')), 'GrabCast không nhận carousel (không có bài ảnh nhiều tấm)');
ok(!reels().length && MG.calls.filter(c => c.p === '123456789/photos').length === 3 && feeds().length === 1, 'FB: carousel = 3 photo + 1 feed qua Meta, KHÔNG có Reel qua Meta khi GrabCast khỏe');
const fd = feeds()[0];
ok(fd.f.published === 'false' && +fd.f.scheduled_publish_time === Math.floor(Math.round(now + 5 * H) / 1000) && JSON.parse(fd.f['attached_media[1]']).media_fbid, 'FB feed: slot còn ≥ 15 phút → lên lịch native, attached_media');
const lf = lk(CID, FB); ok(lf.provider === 'meta' && lf.state === 'scheduled' && /^123456789_\d+$/.test(lf.meta_id) && /^meta_fb_/.test(ds(CID, FB).post_id), `khóa + dist_social: id bài feed (${lf.state} ${lf.meta_id})`);
ok(!igMedia().length && r.skipped.some(s => s.clip === CID && s.ch === IG && s.why === 'meta-wait'), 'IG: còn > 3 giờ tới slot → chờ');
const bdc = sql.prepare('SELECT * FROM soc_board WHERE clip = ? AND plats LIKE ?').get(CID, '%facebook_page%');
ok(bdc && /Quiz answer: annoyed/.test(bdc.fc || '') && /\/api\/go\/fb\//.test(bdc.fc), 'FB: bình luận đầu = đáp án quiz từ cards.json (link đếm click)');
ok(MG.calls.filter(c => c.f && c.f.url).length === 3 && MG.calls.filter(c => c.f && c.f.url).every(c => /^https:\/\/lexkite\.com\/api\/admin-shorts\?p=/.test(c.f.url)), 'ảnh gửi Meta là URL https ký của lexkite.com');
// cổng QC: cards_ok=false không bao giờ được nhận/đăng
ok(!sql.prepare('SELECT 1 FROM dist_social WHERE clip = ?').get(BAD.id), 'mục cards_ok=false chưa từng có slot');
sql.prepare("INSERT INTO yt_queue (clip, status) VALUES (?, 'social')").run(BAD.id); due(BAD.id, FB, now + 5 * H);
MG.calls = []; r = await RUN({ now: now + 0.1 * H });
ok(!MG.calls.some(c => c.p === '123456789/photos') && r.skipped.some(s => s.clip === BAD.id && s.why === 'meta-cards'), 'cards_ok=false → không đăng carousel (cổng QC)');

// 2c) tới 3 giờ trước slot: IG tạo container carousel; tới giờ → media_publish (cùng quota/igPublish)
MG.calls = []; r = await RUN({ now: now + 2.2 * H });
ok(igMedia().length === 4 && igMedia().filter(c => c.f.is_carousel_item === 'true').length === 3 && igMedia().some(c => c.f.media_type === 'CAROUSEL' && /salty/i.test(c.f.caption)) && igMedia().every(c => !c.f.video_url) && lk(CID, IG).container, 'IG: 3 container con + 1 CAROUSEL (caption chuẩn của hệ thống), không video_url');
MG.calls = []; r = await RUN({ now: now + 4.5 * H }); // IG_EARLY: slot − 60 phút
ok(MG.calls.some(c => c.p === '178000000001/media_publish') && lk(CID, IG).state === 'posted' && /instagram\.com/.test(lk(CID, IG).permalink), 'IG: FINISHED → media_publish → permalink');
MG.calls = []; r = await RUN({ now: now + 5.6 * H });
ok(!feeds().length && lk(CID, FB).state === 'posted' && ds(CID, FB).state === 'published', 'FB: sau slot kiểm bài feed (is_published) → published, không đăng lại');

// 2e) Reel + carousel cùng tập, chế độ Meta (GrabCast ngưng): 2 bài riêng, ledger giữ ≥ 4 giờ giữa 2 bài của cùng kênh
sql.exec('DELETE FROM soc_lock; DELETE FROM soc_ledger; DELETE FROM soc_board; DELETE FROM dist_social');
setAuto({ provider: 'meta' }); due(REEL.id, FB, now + 0.5 * H); due(CID, FB, now + 3 * H); due(REEL.id, IG, now + 0.5 * H); due(CID, IG, now + 5 * H);
MG.calls = []; r = await RUN({ now }); 
ok(reels().length === 1 && /salty/i.test(reels()[0].f.description), 'chế độ Meta: Reel của tập slang đăng như cũ (video_reels)');
ok(!feeds().length && r.skipped.some(s => s.clip === CID && s.why === 'ledger-gap' || s.why === 'meta-wait'), 'carousel cùng kênh trong ±4 giờ của Reel → chờ (trần/giãn cách kênh)');
ok(igMedia().some(c => c.f.media_type === 'REELS') && !igMedia().some(c => c.f.media_type === 'CAROUSEL'), 'IG: Reel container trước, carousel chưa');
MG.calls = []; r = await RUN({ now: now + 5 * H });
ok(feeds().length === 1 && lk(CID, FB) && lk(REEL.id, FB).state === 'posted', 'sau khi qua giãn cách: carousel đăng thành bài thứ 2 của ngày (Reel giữ nguyên)');
ok(!MG.calls.some(c => c.f && c.f.video_url && /cards/.test(c.f.video_url)), 'carousel không bao giờ đi đường video');
const day = sql.prepare("SELECT channel_id, COUNT(*) AS n FROM soc_ledger GROUP BY channel_id, day").all(); ok(day.every(x => x.n <= 2), `≤ 2 bài/kênh/ngày (${JSON.stringify(day)})`);

// 2f) công tắc carousel tắt: không nhận, không đăng, Reel không đổi
sql.exec('DELETE FROM soc_lock; DELETE FROM soc_ledger; DELETE FROM soc_board; DELETE FROM dist_social');
setAuto({ provider: 'meta', carousel: false }); due(CID, FB, now + 0.4 * H); due(REEL.id, IG, now + 0.5 * H);
MG.calls = []; r = await RUN({ now });
ok(A.cleanAuto({}).carousel === true && A.cleanAuto({ carousel: false }).carousel === false, 'cleanAuto: carousel mặc định BẬT, tắt được');
ok(!feeds().length && !MG.calls.some(c => c.p === '123456789/photos') && ds(CID, FB).state === 'planned' && igMedia().some(c => c.f.media_type === 'REELS'), 'carousel=false: carousel đứng yên, Reel IG vẫn đăng');
// tập không slang: không đổi
sql.exec('DELETE FROM soc_lock; DELETE FROM soc_ledger; DELETE FROM soc_board; DELETE FROM dist_social');
setAuto({ provider: 'meta' }); due(PLAIN.id, FB, now + 0.4 * H); MG.calls = []; r = await RUN({ now });
ok(reels().length === 1 && !feeds().length && !MG.calls.some(c => c.p === '123456789/photos'), 'tập không slang: chỉ Reel như cũ');

// 2g) lên kế hoạch: carousel chỉ vào kênh FB/IG (không TikTok/YouTube)
{
  const D = await import(new URL('../../functions/api/distribution.js', import.meta.url));
  ext.run('gc-tiktok-9', 'tiktok', '9', 'Lexkite TT', 'ok', now);
  sql.exec('DELETE FROM dist_social; DELETE FROM yt_plan'); await D.DIST.plan_run(DB, {}, ENV); 
  const chs = sql.prepare('SELECT DISTINCT channel_id AS c FROM dist_social WHERE clip = ?').all(CID).map(x => x.c), rch = sql.prepare('SELECT DISTINCT channel_id AS c FROM dist_social WHERE clip = ?').all(PLAIN.id).map(x => x.c);
  ok(chs.length > 0 && chs.every(c => /^gc-(facebook_page|instagram)-/.test(c)), `plan_run: carousel chỉ FB/IG (${chs})`);
  ok(rch.includes('gc-tiktok-9'), `tập thường vẫn được xếp TikTok như cũ (${rch})`);
}

// 2h) autoQueue: chỉ nhận carousel đạt cổng (cards_ok, đủ ảnh trên kho) và khi công tắc bật
{
  const dr = x => ({ drive: Object.fromEntries([1, 2, 3].map(i => ['card' + i, { driveId: '1', fileId: 'F'.repeat(12) + i }]).slice(0, x)) });
  const G = mk('teach2d-q-good-cards', { format: 'carousel', cards: cardsOf('q'), cards_ok: true, ...dr(3) }), B1 = mk('teach2d-q-bad-cards', { format: 'carousel', cards: cardsOf('q2'), cards_ok: false, ...dr(3) }), B2 = mk('teach2d-q-part-cards', { format: 'carousel', cards: cardsOf('q3'), cards_ok: true, ...dr(2) });
  ITEMS = [G, B1, B2]; SH._memo.reset();
  const q = async cfg => { sql.exec('DELETE FROM yt_queue'); await A.autoQueue(ENV, DB, A.cleanAuto({ ...cfg, auto_queue: true, auto_approve: true }), now); return sql.prepare('SELECT clip FROM yt_queue').all().map(x => x.clip); };
  ok(JSON.stringify(await q({})) === JSON.stringify([G.id]), 'autoQueue: chỉ carousel cards_ok=true và đủ ảnh trên kho');
  ok((await q({ carousel: false })).length === 0, 'autoQueue: carousel=false → không nhận carousel');
  ITEMS = [REEL, CARD, BAD, PLAIN]; SH._memo.reset();
}

// ---------- 3) dry-run: không đăng gì ----------
{
  const t = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lkcar-')), 'index.json'); fs.writeFileSync(t, JSON.stringify({ items: ITEMS }));
  const o = spawnSync('node', ['scripts/social/dryrun.mjs', '--index', t, '--carousel', CID], { encoding: 'utf8', cwd: fileURLToPath(new URL('../..', import.meta.url)) });
  ok(o.status === 0 && /facebook_page/.test(o.stdout) && /instagram/.test(o.stdout) && /attached_media/.test(o.stdout) && /CAROUSEL/.test(o.stdout) && /đăng 0/.test(o.stdout), `dry-run carousel in đúng lệnh Graph, đăng 0 (${o.stdout.slice(-300)}${o.stderr.slice(-200)})`);
  const bad = spawnSync('node', ['scripts/social/dryrun.mjs', '--index', t, '--carousel', BAD.id], { encoding: 'utf8', cwd: fileURLToPath(new URL('../..', import.meta.url)) });
  ok(bad.status === 1 && /cards_ok/.test(bad.stdout + bad.stderr), 'dry-run: cổng cards_ok=false chặn');
}
console.log(fails ? `✗ social-carousel: ${fails}/${n} lỗi` : `✓ social-carousel: ${n} kiểm tra đạt (fbCarousel, igCarouselContainer, Reel + carousel, trần kênh, công tắc, GrabCast không nhận, dry-run)`);
process.exit(fails ? 1 : 0);
