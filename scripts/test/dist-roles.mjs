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
const clip = { id: 'cafe-look-for', title: 'Look for vs look at – stop mixing them up!', point: 'look for', topic: 'food', sub: 'food/cafe', skill: 'vocab', cefr: 'A2', hook: 'mistake' };
const e1 = M.embedMeta(clip), e2 = M.embedMeta({ ...clip, hook: 'question', title: 'Other hook title' });
ok(e1.privacy === 'unlisted' && e1.role === 'embed' && e1.description.endsWith('lk:cafe-look-for'), 'embed: unlisted + lk: marker last');
ok(e1.title === e2.title && e1.description === e2.description, 'embed: stable (hook/title wording does not change it)');
ok(!e1.hashtags.length && !/#/.test(e1.description) && e1.tags.length <= 3 && e1.title.length <= 100, 'embed: minimal (no hashtags, few tags)');
ok(e1.made_for_kids === false && e1.synthetic === true, 'embed: not for kids + AI disclosure');
// ---- social role: viral metadata ----
for (const p of Object.keys(M.PLATFORMS)) {
  const s = M.socialMeta(clip, p), lines = s.description.split('\n');
  ok(s.title.length <= 60 && s.title.toLowerCase().startsWith('look for'), `${p}: title ≤ 60, keyword first (${s.title})`);
  ok(/\?|!|mistake/i.test(lines[0]) && /look for/i.test(lines[1]) && lines[2].includes('https://lexkite.com/video/cafe-look-for/?utm_source=' + p), `${p}: line 1 hook, line 2 value, then lesson deep link`);
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

console.log(`dist-roles: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
