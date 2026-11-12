// Role metadata (embed vs social), multi-platform routing + "test a clip" trace, rules editor model, hard-delete purge in the shorts archive.
// Run: node scripts/test/dist-roles.mjs (no network)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import * as M from '../../functions/api/_role_meta.js';
import * as D from '../../functions/api/_distribution.js';
const R = createRequire(import.meta.url)('../../web/js/lib/dist-rules.js');
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

// ---- embed role: stable, minimal, unlisted, marker ----
const clip = { id: 'cafe-look-for', slug: 'cafe-look-for', title: 'Look for vs look at – stop mixing them up!', point: 'look for', topic: 'food', sub: 'food/cafe', skill: 'vocab', cefr: 'A2', hook: 'mistake' };
const e1 = M.embedMeta(clip), e2 = M.embedMeta({ ...clip, hook: 'question', title: 'Other hook title' });
ok(e1.privacy === 'unlisted' && e1.role === 'embed' && e1.description.endsWith('lk:cafe-look-for'), 'embed: unlisted + lk: marker last');
ok(e1.title === e2.title && e1.description === e2.description, 'embed: stable (hook/title wording does not change it)');
ok(!e1.hashtags.length && !/#/.test(e1.description) && e1.tags.length <= 3 && e1.title.length <= 100, 'embed: minimal (no hashtags, few tags)');
ok(e1.made_for_kids === false && e1.synthetic === true, 'embed: not for kids + AI disclosure');
// ---- social role: viral metadata ----
for (const p of Object.keys(M.PLATFORMS)) {
  const s = M.socialMeta(clip, p), lines = s.description.split('\n');
  ok(s.title.length <= 60 && s.title.toLowerCase().startsWith('look for'), `${p}: title ≤ 60, keyword first (${s.title})`);
  const deep = 'https://lexkite.com/video/cafe-look-for/?utm_source=' + p, L = p === 'youtube' ? lines.slice(1) : lines; // §6c: YouTube link ở dòng ĐẦU mô tả
  if (p === 'youtube') ok(lines[0].startsWith('Full lesson + quiz: ' + deep), 'youtube: lesson deep link on the FIRST line of the description');
  ok(/\?|!|mistake/i.test(L[0]) && /look for/i.test(L[1]), `${p}: hook line, then value line`);
  if (M.BIO_ONLY.includes(p)) ok(L[2] === M.BIO_CTA && !s.description.includes('https://'), `${p}: no unclickable link in caption – "link in bio" CTA instead`);
  else if (p !== 'youtube') ok(L[2].includes(deep), `${p}: lesson deep link after hook + value`);
  ok(s.hashtags.length >= 3 && s.hashtags.length <= 5 && s.hashtags.every(h => /^#[a-z0-9]+$/i.test(h)), `${p}: 3–5 clean hashtags`);
  ok(s.tags.length >= 5 && new Set(s.variants).size === 3 && s.variants.every(v => v.length <= 60 && v.toLowerCase().startsWith('look for')), `${p}: tags + 3 distinct A/B variants, all keyword-first`);
  ok(s.seo.score >= 90 && s.privacy === 'public' && s.description.length <= M.PLATFORMS[p].caption, `${p}: SEO ≥ 90 (${s.seo.score} ${s.seo.failed}) + within caption limit`);
}
ok(M.socialMeta(clip, 'youtube').description.includes('lk:cafe-look-for') && !M.socialMeta(clip, 'tiktok').description.includes('lk:'), 'social: marker on YouTube only');
ok(M.socialMeta(clip, 'youtube').variants[0].includes('mistake'), 'social: first variant follows the clip hook type');
const longC = { id: 'x-long', point: 'how to politely decline an invitation from your manager at work', cefr: 'B2' };
ok(M.socialMeta(longC, 'tiktok').title.length <= 60 && !/[\s,:–-]$/.test(M.socialMeta(longC, 'tiktok').title), 'social: long keyword cut on a word boundary');
const bad = M.seoScore({ title: 'x'.repeat(80), description: 'hello', hashtags: ['#a'], tags: [], variants: ['a'] }, 'look for');
ok(bad.score < 30 && bad.failed.includes('title_len') && bad.failed.includes('link_early'), 'seoScore flags a weak post');
ok(M.socialMeta({ id: 'evil', point: '<script>x</script>' }, 'tiktok').title.indexOf('<') === -1, 'metadata strips < >');
const both = M.packsFor(clip, ['youtube', 'tiktok', 'nope']);
ok(both.embed.privacy === 'unlisted' && Object.keys(both.social).join() === 'youtube,tiktok', 'one clip → embed pack + social posts');

// ---- routing across platforms + explain ----
const cfgs = { UCemb0000001: D.normCfg({ role: 'embed' }), UCsoc0000001: D.normCfg({ types: ['short'] }), 'gc-tiktok-1': D.normCfg({ cefr: ['A1', 'A2'] }), 'gc-tiktok-2': D.normCfg({}), 'gc-instagram-9': D.normCfg({ active: 0 }) };
const rules = [{ cond: { topic: 'food' }, channel_id: 'gc-tiktok-1' }, { cond: { type: 'short' }, channel_id: 'gc-tiktok-2' }, { cond: { type: 'short' }, channel_id: 'gc-instagram-9' }, { cond: { topic: 'exam' }, channel_id: 'UCsoc0000001' }];
const c = { type: 'short', topic: 'food', sub: 'food/cafe', cefr: 'A2' };
const ra = D.routeAll(rules, cfgs, c, 'UCemb0000001');
ok(ra.length === 2 && ra.find(x => x.platform === 'tiktok').channel_id === 'gc-tiktok-1' && ra.find(x => x.platform === 'youtube').rule === -1, 'routeAll: first match per platform; YouTube falls back');
const ex = D.explain(rules, cfgs, { ...c, cefr: 'C1' }, null);
ok(ex.trace[0].result === 'blocked' && ex.trace[0].why === 'cefr' && ex.trace[1].result === 'win' && ex.trace[2].result === 'blocked' && ex.trace[2].why === 'paused' && ex.trace[3].result === 'no-match' && ex.trace[3].why === 'topic', 'explain: blocked/win/paused/no-match with reasons');
ok(D.explain([{ cond: { type: 'short' }, channel_id: 'gc-tiktok-2' }, { cond: { type: 'short' }, channel_id: 'gc-tiktok-1' }], cfgs, c, null).trace[1].result === 'shadowed', 'explain: second rule on a taken platform = shadowed');
ok(D.platformOf('UCabc') === 'youtube' && D.platformOf('gc-facebook_page-12') === 'facebook_page', 'platformOf');
ok(D.route(rules.filter(r => D.platformOf(r.channel_id) === 'youtube'), cfgs, c, 'UCemb0000001').channel_id === 'UCemb0000001', 'route (YouTube only) unchanged for the YouTube pass');

// ---- rules editor model ----
let rs = R.norm([{ name: 'a', cond: { type: 'short', evil: 'x' }, channel_id: 'A' }, { name: 'b', cond: { topic: 'food' }, channel_id: 'B' }, { name: 'c', cond: {}, channel_id: 'Z' }]);
ok(!('evil' in rs[0].cond) && rs.every(r => r.active === 1), 'norm drops unknown conditions');
ok(R.move(rs, 2, 0).map(r => r.name).join() === 'c,a,b' && R.move(rs, 0, 99).map(r => r.name).join() === 'b,c,a' && R.move(rs, -1, 0) !== rs, 'move: drag to index (clamped), returns a new array');
ok(R.remove(rs, 1).map(r => r.name).join() === 'a,c' && rs.length === 3, 'remove is immutable');
ok(R.toggle(rs, 0)[0].active === 0 && R.patch(rs, 1, { cond: { cefr: 'B1' } })[1].cond.topic === 'food', 'toggle + patch merge');
const chs = [{ channel_id: 'A', cfg: { active: 1 } }, { channel_id: 'B', cfg: { active: 0 } }];
const v = R.validate([...rs, { name: 'dup', cond: { type: 'short' }, channel_id: 'A', active: 1 }], chs);
ok(v.some(e => e.i === 2 && e.code === 'empty-condition') && v.some(e => e.i === 2 && e.code === 'bad-channel') && v.some(e => e.i === 1 && e.code === 'channel-paused' && e.warn) && v.some(e => e.i === 3 && e.code === 'shadowed' && e.by === 0), 'validate: empty, unknown, paused (warn), shadowed (warn)');
ok(R.dirty(rs, R.move(rs, 0, 1)) && !R.dirty(rs, R.norm(rs)), 'dirty detects reorder only');
ok(R.toPayload(rs, 'A').op === 'rules_set' && R.toPayload(rs).fallback === null, 'payload for rules_set');
ok(R.platformOf('gc-threads-1') === 'threads' && R.COND.join() === ['type', 'topic', 'skill', 'cefr', 'exam', 'region', 'template', 'scene'].join(), 'client COND/platform match the server');

// ---- "Xóa hẳn" purge in the shorts archive ----
const { runArchive } = await import('../../scripts/video/shorts-archive.mjs');
const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'arc-')); fs.mkdirSync(path.join(repo, 'shorts', 'gone-clip'), { recursive: true });
fs.writeFileSync(path.join(repo, 'shorts', 'index.json'), JSON.stringify({ items: [{ id: 'gone-clip', drive: { video: { sha256: 'a'.repeat(64) }, cover: { sha256: 'b'.repeat(64) } } }, { id: 'kept-clip' }] }));
let retired = [], reported = [];
await runArchive({ repo, yt: async () => ({ purge: ['gone-clip', '../evil'] }), purged: async ids => { reported = ids; }, api: async (op, b) => { if (op === 'retire') retired = b.sha256; return { done: [] }; }, rebalanceCalls: 0, pause: 0, log: () => {} });
const idx = JSON.parse(fs.readFileSync(path.join(repo, 'shorts', 'index.json'), 'utf8'));
ok(retired.length === 2 && reported.join() === 'gone-clip' && idx.items.map(x => x.id).join() === 'kept-clip' && !fs.existsSync(path.join(repo, 'shorts', 'gone-clip')), 'purge: master + cover to trash, recipe dropped, reported back; bad ids ignored');

// ---- Lỗi ẩn 04/11: retention xóa nhầm, file đã chuyển Drive, link 404, metadata là id ----
{
  const { planArchive, keepSet, applyMoves } = await import('../../scripts/video/shorts-archive.mjs');
  const old = '2026-01-01T00:00:00Z', it = (id, x = {}) => ({ id, lesson: id, created: old, drive: { video: { sha256: id.padEnd(64, '0'), fileId: 'f-' + id, driveId: 1 } }, ...x });
  const items = [it('live'), it('paused', { paused: true }), it('rej', { rejected: true }), it('rej-kept', { rejected: true })];
  const plan = planArchive(items, keepSet(items, { approved: ['rej-kept'] }), Date.parse('2026-11-20T00:00:00Z'));
  ok(plan.retire.map(x => x.id).join() === 'rej', 'retention: chỉ clip bị loại quá hạn; clip chưa duyệt/tạm dừng/đã duyệt không vào thùng rác');
  const arc = async ytl => { const r2 = fs.mkdtempSync(path.join(os.tmpdir(), 'arc-')); fs.mkdirSync(path.join(r2, 'shorts')); fs.writeFileSync(path.join(r2, 'shorts', 'index.json'), JSON.stringify({ items: [it('rej', { rejected: true })] })); const seen = []; await runArchive({ repo: r2, yt: async () => ytl, purged: async () => {}, api: async (op, b) => { seen.push(op); return { done: [] }; }, rebalanceCalls: 0, pause: 0, log: () => {} }); return seen; };
  ok(!(await arc({ _failed: 429 })).includes('retire'), 'không đọc được danh sách đã duyệt → không xóa gì');
  ok(!(await arc({})).includes('retire'), 'danh sách đã duyệt rỗng → không xóa gì');
  ok((await arc({ approved: ['khac'] })).includes('retire'), 'có danh sách → clip bị loại quá hạn vẫn vào thùng rác như luật');
  const mv = [it('a')]; ok(applyMoves(mv, [{ file_id: 'f-a', new_file_id: 'g-a', to: 7 }]) === 1 && mv[0].drive.video.fileId === 'g-a' && mv[0].drive.video.driveId === 7, 'cân bằng Drive: ghi fileId/driveId mới vào index');
  ok(applyMoves(mv, [{ file_id: 'f-khac', new_file_id: 'x', to: 9 }]) === 0 && mv[0].drive.video.fileId === 'g-a', 'file khác không đụng');

  const noPage = M.socialMeta({ id: 'cine-a', point: 'look for', headline: 'Stop saying "look a book"', cefr: 'A2' }, 'threads');
  ok(!/\/video\/cine-a/.test(noPage.description) && /lexkite\.com\/app\/\?utm_source=threads/.test(noPage.description), 'clip chưa có trang → link về app, không phải /video/<id>/ (404)');
  ok(noPage.title === 'Stop saying "look a book"' && !noPage.no_keyword && noPage.hashtags.length >= 3 && noPage.seo.score >= 80, 'tiêu đề tay được dùng, đủ hashtag, đạt SEO');
  ok(/\/video\/s-1\/\?utm/.test(M.socialMeta({ id: 'c', point: 'x', slug: 's-1' }, 'facebook_page').description), 'có slug → trang video');
  ok(/app\/\?utm_source=youtube[^#\s]*#\/grammar/.test(M.socialMeta({ id: 'c', point: 'x', url: 'https://lexkite.com/app/#/grammar' }, 'youtube').description), 'utm đứng trước #');
  ok(M.socialMeta({ id: 'c', point: 'x', slug: 's-1' }, 'tiktok').seo.failed.indexOf('link_early') < 0 && M.socialMeta({ id: 'c', point: 'x', slug: 's-1' }, 'instagram').seo.failed.indexOf('link_early') < 0, 'IG/TikTok: CTA "link in bio" tính là link sớm (không tụt điểm SEO)');
  ok(M.socialMeta({ id: 'cine-news-x', title: 'cine-news-x' }, 'tiktok').no_keyword === true, 'không có metadata → đánh dấu để không đăng');
  const own = M.socialMeta({ id: 'c', point: 'x', headline: 'Do yoga or make yoga?', value: "You do yoga. You don't make it.", hashtags: ['#learnenglish', '#englishtips', '#a2english'] }, 'facebook_page');
  ok(own.title === 'Do yoga or make yoga?' && own.description.split('\n')[1] === "You do yoga. You don't make it." && own.hashtags.join() === '#learnenglish,#englishtips,#a2english' && own.description.includes('#a2english'), 'khối publish được dùng nguyên cho tiêu đề, dòng giá trị, hashtag');
  const { fillMeta, hookOf, urlOf } = await import('../../scripts/video/shorts-meta.mjs');
  const cl = [{ id: 'c1', lesson: 'l1', title: '', point: '', cefr: '' }, { id: 'c2', lesson: 'l2', title: 'Có sẵn', point: 'p', cefr: 'B1', description: 'x https://lexkite.com/app/?utm_source=a#/grammar' }];
  fillMeta(cl, { lessonOf: id => (id === 'l1' ? { point: 'Stop saying X', cefr: 'A2', area: 'grammar-check', hook_type: 'mistake_callout' } : { point: 'khac', cefr: 'C2' }), pages: new Map([['l1', { slug: 'stop-x' }]]) });
  ok(cl[0].title && cl[0].point === 'Stop saying X' && cl[0].cefr === 'A2' && cl[0].hook === 'mistake' && cl[0].url === 'https://lexkite.com/video/stop-x/', 'bù metadata + link trang thật từ bài học');
  ok(cl[1].title === 'Có sẵn' && cl[1].cefr === 'B1' && cl[1].url === 'https://lexkite.com/app/#/grammar', 'không ghi đè; link trong mô tả bỏ query');
  const pb = [{ id: 'p1', lesson: 'lp', title: 'Tiêu đề ghép cũ' }]; fillMeta(pb, { lessonOf: () => ({ point: 'p', publish: { title: 'Do yoga or make yoga?', keyword: 'make vs do', value: 'You do yoga.', hashtags: ['#a', '#b', '#c'] } }) });
  ok(pb[0].title === 'Do yoga or make yoga?' && pb[0].keyword === 'make vs do' && pb[0].value === 'You do yoga.' && pb[0].hashtags.length === 3, 'khối publish thắng tiêu đề cũ trong index');
  ok(hookOf('mistake_callout') === 'mistake' && hookOf('khac') === '' && urlOf({}, null) === 'https://lexkite.com/app/', 'hook/url mặc định');
}

// ---- 16 fanpage: định tuyến theo ngôn ngữ (lỗi cũ: mọi clip vào kênh gc- đầu bảng chữ cái của nền tảng, bất kể ngôn ngữ) ----
{
  const L = D.langOfChannel;
  { const src = (await import('node:fs')).readFileSync('web/js/admin-dist.js', 'utf8'), m = /const PAGE_LANGS = (\[[^\]]*\])/.exec(src);
    ok(m && JSON.stringify(JSON.parse(m[1].replace(/'/g, '"')).sort()) === JSON.stringify([...D.SOCIAL_LANGS].sort()) && /id="cf-lang"/.test(src) && /lang: q\('#cf-lang'\)\.value/.test(src), '⚙ #dist: ô Ngôn ngữ trang = SOCIAL_LANGS + "Tự nhận từ tên", lưu vào cfg.lang'); }
  ok(L('Lexkite - Học Tiếng Anh') === 'vi' && L('Lexkite – học tiếng anh') === 'vi' && L('Lexkite Hoc Tieng Anh') === 'vi' && L('Học tiếng Nhật cùng Lexkite') === 'vi' && L('Lexkite - Learn English') === 'en' && L('Lexkite Tiếng Anh') === 'en' && L('Lexkite - Học Tiếng Anh (EN)') === 'en', 'langOfChannel: "học tiếng X" = page cho người Việt (vi), xét trước "tiếng anh"; mã ngoặc vẫn thắng');
  ok(D.normCfg({}).lang === '' && D.normCfg({ lang: 'VI' }).lang === 'vi' && D.normCfg({ lang: 'xx' }).lang === '' && D.blockOf(D.normCfg({}), { lang: 'vi' }) === '', 'normCfg: lang trống = tự nhận từ tên (lưu ⚙ không còn ép en), mã lạ bị bỏ');
  ok(L('Lexkite Español') === 'es' && L('Lexkite Tiếng Việt') === 'vi' && L('Lexkite (JA)') === 'ja' && L('Lexkite – ko') === 'ko' && L('Lexkite 日本語') === 'ja', 'langOfChannel: endonym, mã trong ngoặc, sau gạch');
  ok(L('Lexkite') === '' && L('Lexkite English') === 'en' && L('Lexkite Global') === 'en' && L('Lexkite Français') === 'fr' && L('Lexkite Português') === 'pt', 'langOfChannel: page chung / tên Âu');
  ok(D.SOCIAL_LANGS.length === 15, '15 ngôn ngữ + en chung = 16 page (vi,es,pt,fr,de,id,th,zh,ja,ko,hi,ar,ru,tr + en) – có ' + D.SOCIAL_LANGS.length);
  const n = c => D.normCfg(c), cfgs = { 'gc-facebook_page-a1': n({ lang: 'es' }), 'gc-facebook_page-b2': n({ lang: 'en' }), 'gc-facebook_page-c3': n({ lang: 'vi' }), 'gc-tiktok-t1': n({ lang: 'en' }), 'gc-instagram-i1': n({ lang: 'ja' }) };
  const imp = D.implicitSocialRules([], cfgs);
  ok(imp.filter(r => /facebook/.test(r.channel_id)).length === 3, 'luật ngầm: mỗi ngôn ngữ của nền tảng có 1 luật (không còn 1 kênh/nền tảng)');
  const en = D.routeAll(imp, cfgs, { id: 'c1', lang: 'en' }, null), fbEn = en.find(x => x.platform === 'facebook_page');
  ok(fbEn && fbEn.channel_id === 'gc-facebook_page-b2', 'clip EN → page EN chung, không vào page Español đứng đầu bảng chữ cái');
  ok(!en.find(x => x.platform === 'instagram'), 'clip EN không vào IG tiếng Nhật (không có IG EN → bỏ, không đăng sai ngôn ngữ)');
  ok(D.routeAll(imp, cfgs, { id: 'c0' }, null).find(x => x.platform === 'facebook_page').channel_id === 'gc-facebook_page-b2', 'clip không có lang = en');
  const vi = D.routeAll(imp, cfgs, { id: 'c2', lang: 'vi' }, null);
  ok(vi.length === 2 && vi.find(x => x.platform === 'facebook_page').channel_id === 'gc-facebook_page-c3' && vi.find(x => x.platform === 'tiktok').channel_id === 'gc-tiktok-t1' && !vi.find(x => x.platform === 'instagram'), 'clip VI → FB page Tiếng Việt; TikTok chỉ có kênh EN → fallback EN; không vào IG tiếng Nhật');
  ok(D.blockOf(cfgs['gc-facebook_page-a1'], { lang: 'en' }) === 'lang' && D.blockOf(cfgs['gc-facebook_page-a1'], { lang: 'es' }) === '', 'blockOf chặn sai ngôn ngữ cả với luật tay của chủ');
  ok(D.blockOf(D.normCfg({}), {}) === '', 'kênh YouTube mặc định (en) vẫn nhận clip không có lang');
  const exp = D.explain([{ cond: {}, channel_id: 'gc-facebook_page-a1', active: 1 }], cfgs, { id: 'c3', lang: 'en' }, null);
  ok(exp.trace[0].result === 'blocked' && exp.trace[0].why === 'lang', 'thử clip: giải thích "blocked: lang"');
}

{
  const { fillMeta } = await import('../../scripts/video/shorts-meta.mjs');
  const a = [{ id: 'x1', lesson: 'l' }, { id: 'x2', lesson: 'm' }, { id: 'x3', lesson: 'n' }];
  fillMeta(a, { lessonOf: id => ({ l: { publish: { title: 't', lang: 'VI' } }, m: { lang: 'es' }, n: { publish: { lang: 'vietnamese' } } })[id] });
  ok(a[0].lang === 'vi' && a[1].lang === 'es' && !a[2].lang, 'fillMeta: chép lang (publish > bài), bỏ giá trị không phải mã 2 chữ');
}

// ---- 05/11: mới có 1 page "Lexkite.com" (EN) + TikTok → mọi ngôn ngữ fallback page EN; Page/IG "Grabcast.click" kéo kèm vào ws4 không bao giờ là đích ----
{
  const n = c => D.normCfg(c), one = { 'gc-facebook_page-111': n({ lang: D.langOfChannel('Lexkite.com') || 'en' }), 'gc-tiktok-222': n({ lang: D.langOfChannel('lexkitecom') || 'en' }) };
  const imp = D.implicitSocialRules([], one);
  for (const lang of ['en', 'vi', 'ja', undefined]) {
    const r = D.routeAll(imp, one, { id: 'c', lang }, null);
    ok(r.length === 2 && r.find(x => x.platform === 'facebook_page').channel_id === 'gc-facebook_page-111', `clip ${lang || '(trống)'} → page EN chung khi chưa có page riêng`);
  }
  const both = { ...one, 'gc-facebook_page-333': n({ lang: 'vi' }) }, imp2 = D.implicitSocialRules([], both);
  ok(D.routeAll(imp2, both, { id: 'c', lang: 'vi' }, null).find(x => x.platform === 'facebook_page').channel_id === 'gc-facebook_page-333', 'có page tiếng Việt → clip vi vào page riêng (đứng trước page chung)');
  ok(D.routeAll(imp2, both, { id: 'c', lang: 'en' }, null).find(x => x.platform === 'facebook_page').channel_id === 'gc-facebook_page-111', 'clip en vẫn vào page chung');
  ok(D.foreignAccount({ name: 'Grabcast.click' }) && D.foreignAccount({ username: 'grabcast_click' }) && D.foreignAccount({ title: 'Grab Cast' }) && !D.foreignAccount({ name: 'Lexkite.com' }) && !D.foreignAccount({ username: 'lexkitecom' }), 'foreignAccount: chặn mọi biến thể tên GrabCast, giữ Lexkite');
  ok(D.pausedAccount({ status: 'paused' }) && D.pausedAccount({ publishing_paused: true }) && !D.pausedAccount({ status: 'active' }) && !D.pausedAccount({}), 'pausedAccount: kênh Pause publishing trên GrabCast');
}

console.log(`dist-roles: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
