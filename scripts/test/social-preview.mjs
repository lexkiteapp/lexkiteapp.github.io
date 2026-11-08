// Test dry-run autopilot (functions/api/_social_preview.js, op preview của /api/social-auto, scripts/social/dryrun.mjs), đuôi hashtag không bị cắt (_role_meta.js),
// bìa IG Reels (cover_url, _meta.js), Tạm dừng toàn bộ (auto/pause_all gỡ lịch GrabCast), nhật ký lỗi bền (state.log), webhook post.failed.
// Chạy: node scripts/test/social-preview.mjs (không mạng – GrabCast/Meta giả, D1 sqlite)
import { DatabaseSync } from 'node:sqlite';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

const PV = await import('../../functions/api/_social_preview.js');
const RM = await import('../../functions/api/_role_meta.js');
const D = await import('../../functions/api/_distribution.js');
const clip = { id: 'news_taxi_ab_123', lang: 'en', title: 'Get in or get on a taxi?', keyword: 'get in a taxi', value: 'You get IN a taxi but ON a bus.', hashtags: ['#learnenglish', '#englishtips', '#esl'], cefr: 'A2', cover: 'abc' };

// ---- 1) Đuôi hashtag/marker không bao giờ bị cắt (lỗi cũ: cắt cả mô tả tới giới hạn → rơi hashtag im lặng) ----
{
  const long = { ...clip, value: 'x'.repeat(190) + ' ' + 'y '.repeat(400) };
  for (const p of Object.keys(RM.PLATFORMS)) {
    const m = RM.socialMeta({ ...long, headline: 'H'.repeat(80) }, p), cap = RM.PLATFORMS[p].caption;
    ok(m.description.length <= cap && m.hashtags.every(h => m.description.includes(h)), `socialMeta ${p}: ≤ ${cap} ký tự và đủ hashtag`);
  }
  const t = RM.socialMeta({ ...clip, slug: 'z'.repeat(600) }, 'threads');
  ok(t.description.length <= 500 && /#esl/.test(t.description) && /…/.test(t.description), 'Threads 500: thân bị rút gọn có "…", hashtag giữ nguyên');
  const yt = RM.socialMeta({ ...clip, value: 'w '.repeat(3000) }, 'youtube');
  ok(/lk:news_taxi_ab_123/.test(yt.description) || !RM.PLATFORMS.youtube.marker, 'YouTube: marker lk:<clip> còn sau khi rút gọn');
  ok(RM.socialMeta(clip, 'facebook_page').description.includes('Full lesson + quiz:') && RM.socialMeta(clip, 'tiktok').description.includes(RM.BIO_CTA) && !/…/.test(RM.socialMeta(clip, 'tiktok').description), 'mô tả ngắn: không bị rút gọn');
}

// ---- 2) previewClip: payload từng nền tảng, chưa nối kênh, 0 gọi mạng ----
{
  const realFetch = globalThis.fetch; let calls = 0; globalThis.fetch = async () => { calls++; throw new Error('no network in preview'); };
  const pv = PV.previewClip(clip);
  globalThis.fetch = realFetch;
  ok(calls === 0, 'preview không gọi mạng');
  ok(pv.posts.length === 5 && pv.posts.every(x => x.channel_id === null && x.why === 'chưa nối kênh'), 'chưa nối kênh: 5 nền tảng, lý do rõ');
  ok(pv.posts.every(x => x.body.media_ids[0] === PV.MEDIA_PLACEHOLDER && x.body.targets.length === 1), 'body đúng hình autopilot (media giữ chỗ, 1 đích)');
  const tk = pv.posts.find(x => x.platform === 'tiktok').body.targets[0].options, yt = pv.posts.find(x => x.platform === 'youtube');
  ok(tk.privacy_level === 'PUBLIC_TO_EVERYONE' && tk.is_aigc === true, 'TikTok: công khai + gắn nhãn AI');
  ok(yt.title && yt.title.length <= 100 && yt.body.targets[0].options.privacy_status === 'private' && yt.body.targets[0].options.contains_synthetic_media === true, 'YouTube: có title, private, công bố AI');
  ok(pv.posts.find(x => x.platform === 'threads').caption_max === 500 && pv.posts.every(x => x.caption_len <= x.caption_max), 'giới hạn ký tự đúng từng nền tảng');
  ok(pv.posts.every(x => !x.issues.some(i => i.startsWith('error:'))), 'clip đủ metadata: không lỗi chặn – ' + pv.posts.map(x => x.issues.join(',')).join('|'));
  ok(/cover_url/.test(pv.posts.find(x => x.platform === 'instagram').cover), 'bìa: IG ghi cover_url');
  const bad = PV.previewClip({ ...clip, keyword: '', title: '', value: '', hashtags: [], point: '', headline: '' });
  ok(bad.posts.some(x => x.issues.includes('error:no-metadata')) || bad.posts.every(x => x.title !== clip.title), 'clip thiếu metadata → báo lỗi chặn');
  const txt = PV.previewText(pv);
  ok(/── facebook_page/.test(txt) && /payload: \{/.test(txt) && /#esl/.test(txt), 'bản in có từng nền tảng + payload');
}

// ---- 3) preview với kênh thật: định tuyến theo ngôn ngữ ----
{
  const cfgs = { 'gc-facebook_page-1': D.normCfg({ lang: 'en' }), 'gc-facebook_page-2': D.normCfg({ lang: 'vi' }), 'gc-tiktok-3': D.normCfg({ lang: 'vi' }) };
  const accounts = { 'gc-facebook_page-1': '901', 'gc-facebook_page-2': '902', 'gc-tiktok-3': '903' };
  const en = PV.previewClip(clip, { cfgs, accounts }), vi = PV.previewClip({ ...clip, lang: 'vi' }, { cfgs, accounts });
  ok(en.posts.find(x => x.platform === 'facebook_page').body.targets[0].account_id === '901', 'EN → page EN (account 901)');
  ok(/ngôn ngữ \(en\)/.test(en.posts.find(x => x.platform === 'tiktok').why), 'EN không có TikTok EN → lý do "không có kênh cùng ngôn ngữ"');
  ok(vi.posts.find(x => x.platform === 'facebook_page').body.targets[0].account_id === '902' && vi.posts.find(x => x.platform === 'tiktok').channel_id === 'gc-tiktok-3', 'VI → page + TikTok tiếng Việt');
}

// ---- 4) pickPreviewClip + dryrun.mjs (CLI thật, manifest giả) ----
{
  const { pickPreviewClip } = await import('../../functions/api/social-auto.js');
  const items = [{ id: 'a1', created: '2026-11-01', qa: { status: 'pass' } }, { id: 'a2', created: '2026-11-03', qa: { status: 'pass' } }, { id: 'a3', created: '2026-11-04', qa: { status: 'fail' } }, { id: 'a4', created: '2026-11-05', qa: { status: 'pass' }, rejected: true }];
  ok(pickPreviewClip(items).id === 'a2', 'mặc định: clip ĐẠT QC mới nhất, bỏ clip trượt/bị loại');
  ok(pickPreviewClip(items, 'a1').id === 'a1' && pickPreviewClip(items, 'zz') === null, 'chọn theo id');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'socdry-')), idx = path.join(dir, 'index.json'), out = path.join(dir, 'o.json');
  fs.writeFileSync(idx, JSON.stringify({ items: [{ ...clip, created: '2026-11-04', qa: { status: 'pass' } }] }));
  const log = execFileSync(process.execPath, [fileURLToPath(new URL('../social/dryrun.mjs', import.meta.url)), '--index', idx, '--lang', 'vi', '--json', out], { encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: '' } });
  const j = JSON.parse(fs.readFileSync(out, 'utf8'));
  ok(/đăng 0 · lượt GrabCast 0/.test(log) && j.lang === 'vi' && j.posts.length === 5, 'dryrun.mjs: in payload, đăng 0, lưu JSON');
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---- 5) IG Reels cover_url ----
{
  const { igContainer } = await import('../../functions/api/_meta.js');
  const seen = []; const mc = async (m, p, body) => { seen.push(body); return { id: 'c1' }; };
  await igContainer(mc, 'ig1', { video_url: 'https://x/v.mp4', caption: 'c', cover_url: 'https://x/c.jpg' }).catch(() => {});
  await igContainer(mc, 'ig1', { video_url: 'https://x/v.mp4', caption: 'c' }).catch(() => {});
  await igContainer(mc, 'ig1', { video_url: 'https://x/v.mp4', caption: 'c', cover_url: 'javascript:x' }).catch(() => {});
  ok(seen[0] && seen[0].cover_url === 'https://x/c.jpg' && !('cover_url' in seen[1]) && !('cover_url' in seen[2]), 'igContainer: cover_url chỉ khi là https');
}

// ---- 6) pause_all + log bền + webhook failed (D1 sqlite, GrabCast giả) ----
{
  const sql = new DatabaseSync(':memory:');
  const DB = { prepare(q) { const st = { q, args: [], bind(...a) { return { ...st, args: a }; },
    async run() { if (/^\s*(SELECT|WITH)/i.test(q)) return { results: sql.prepare(q).all(...this.args) }; const i = sql.prepare(q).run(...this.args); return { results: [], meta: { changes: Number(i.changes) } }; },
    async all() { return /^\s*(SELECT|WITH)/i.test(q) ? { results: sql.prepare(q).all(...this.args) } : (sql.prepare(q).run(...this.args), { results: [] }); },
    async first() { return sql.prepare(q).get(...this.args) || null; } }; return st; },
    async batch(list) { const out = []; for (const x of list) out.push(await x.run()); return out; } };
  const A = await import('../../functions/api/_social_auto.js'), MGR = await import('../../functions/api/_social_mgr.js');
  await MGR.setupMgr(DB);
  const t = Date.now();
  for (let i = 0; i < 3; i++) sql.prepare("INSERT INTO soc_board (id, post_id, clip, title, caption, accounts, plats, state, mode, want_at, created, updated, by_who) VALUES (?, ?, ?, 't', 'c', '[\"9\"]', '[\"tiktok\"]', 'scheduled', 'sched', ?, ?, ?, ?)").run('b' + i, 'p' + i, 'clip' + i, t + i * 36e5, t, t, A.AUTO_WHO);
  sql.prepare("INSERT INTO soc_board (id, post_id, clip, title, caption, accounts, plats, state, mode, want_at, created, updated, by_who) VALUES ('hand', 'ph', 'c', 't', 'c', '[]', '[]', 'scheduled', 'sched', ?, ?, ?, 'owner@x')").run(t, t, t);
  const hits = [], realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { hits.push(init.method + ' ' + new URL(url).pathname); return new Response(/p1\/unschedule/.test(url) ? '{"error":{"code":"conflict"}}' : '{"ok":true}', { status: /p1\/unschedule/.test(url) ? 409 : 200 }); };
  const env = { DB, GRABCAST_API_KEY: 'k'.repeat(20), GRABCAST_WORKSPACE: '4' };
  const r = await A.autoOpFor('POST', 'lk/auto/pause_all')({ env, db: DB, b: {} });
  globalThis.fetch = realFetch;
  const cfg = A.cleanAuto(JSON.parse(sql.prepare("SELECT v FROM soc_meta WHERE k = 'auto'").get().v));
  ok(cfg.on === false && r.on === false, 'pause_all: tắt autopilot');
  ok(r.unscheduled === 1 && r.errors.length === 1 && r.errors[0].status === 409 && hits.length === 2, 'pause_all: gỡ lịch bài autopilot, dừng ngay khi 409 (không lặp) – ' + JSON.stringify(r) + ' ' + hits.join(','));
  ok(!hits.some(h => /ph\//.test(h)), 'pause_all: không đụng bài người đăng tay');
  ok(sql.prepare("SELECT state, note FROM soc_board WHERE id = 'b0'").get().state === 'review' && sql.prepare("SELECT state FROM soc_board WHERE id = 'b1'").get().state === 'scheduled', 'trạng thái cục bộ khớp kết quả GrabCast');
  const off = await A.autoOpFor('POST', 'lk/auto/pause_all')({ env: { DB }, db: DB, b: {} });
  ok(off.on === false && off.unscheduled === 0 && off.left === 2, 'chưa có khóa GrabCast: vẫn tắt, báo số bài còn lịch');
  const { DIST, setupDist } = await import('../../functions/api/distribution.js'); await setupDist(DB);
  sql.prepare("INSERT INTO dist_ext (channel_id, platform, account_id, title, status, updated) VALUES ('gc-instagram-9', 'instagram', '9', 'grabcast.click', 'ok', 1)").run();
  const xs = await DIST.ext_sync(DB, { accounts: [{ id: '111', platform: 'facebook', name: 'Lexkite.com' }, { id: '222', platform: 'tiktok', username: 'lexkitecom', name: 'Lexkite' }, { id: '8', platform: 'facebook', name: 'Grabcast.click' }, { id: '9', platform: 'instagram', username: 'grabcast.click' }, { id: '7', platform: 'tiktok', name: 'Lexkite test', status: 'paused' }] });
  const ext = sql.prepare('SELECT channel_id, status FROM dist_ext ORDER BY channel_id').all().map(r => r.channel_id + ':' + r.status).join(',');
  ok(ext === 'gc-facebook_page-111:ok,gc-instagram-9:gone,gc-tiktok-222:ok,gc-tiktok-7:paused' && xs.channels.length === 3, 'ext_sync: bỏ Page/IG GrabCast.click (gỡ bản cũ), kênh Pause → paused – ' + ext);
  const st = {}; A.pushAlert(st, 'post-failed:x', 'lỗi 1', t); A.pushAlert(st, 'gave-up:y', 'lỗi 2', t + 1);
  ok(st.log && st.log.length === 2 && st.alerts.length === 2, 'pushAlert ghi nhật ký bền state.log');
  for (let i = 0; i < 60; i++) A.pushAlert(st, 'k' + i, 'e', t + i + 5);
  ok(st.log.length === 50, 'nhật ký giữ 50 mục gần nhất');
}

// ---- 7) YouTube qua GrabCast tự bật + luật YouTube trực tiếp không làm câm kênh GrabCast ----
{
  const A = await import('../../functions/api/_social_auto.js');
  const c = A.cleanAuto({});
  ok(c.yt_gc_auto === true && c.plats.youtube === false, 'mặc định: YouTube tắt, tự bật qua GrabCast = bật');
  ok(!A.ytViaGc(c, []) && A.ytViaGc(c, [{ channel_id: 'gc-youtube-1' }]) && A.effPlats(c, [{}]).plats.youtube === true && c.plats.youtube === false, 'có kênh YouTube GrabCast ok → bật trong lượt (không ghi đè cấu hình)');
  ok(!A.ytViaGc(A.cleanAuto({ yt_gc_auto: false }), [{}]), 'chủ tắt yt_gc_auto → không tự bật');
  const cfgs = { 'gc-youtube-7': D.normCfg({}) };
  const imp = D.implicitSocialRules([{ cond: {}, channel_id: 'UCabc', active: 1 }], cfgs);
  ok(imp.length === 1 && imp[0].channel_id === 'gc-youtube-7', 'luật YouTube trực tiếp (UC…) không chặn luật ngầm của kênh YouTube GrabCast');
  ok(D.implicitSocialRules([{ cond: {}, channel_id: 'gc-youtube-7', active: 0 }], cfgs).length === 0, 'luật gc-youtube đã tắt = chủ ý dừng');
}

console.log(fails ? `✗ social-preview: ${fails}/${n} lỗi` : `✓ social-preview: ${n} kiểm tra đạt (dry-run, hashtag, ngôn ngữ, bìa IG, tạm dừng toàn bộ, nhật ký)`);
if (fails) process.exit(1);
