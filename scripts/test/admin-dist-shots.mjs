// Visual check of Admin → "Kênh & phân phối" + the library type switch on SANDBOX data (no account, no API): Playwright Chromium on CI
// (.github/workflows/dist-ui.yml). light/dark × desktop/mobile → <out>/<area>-<theme>-<vp>.png + report.json; fails on JS errors or horizontal overflow.
// Run: node scripts/test/admin-dist-shots.mjs [out=out/admin-dist]   (needs `npm i playwright` + `npx playwright install chromium`)
import fs from 'node:fs';
import path from 'node:path';
import * as T from '../../functions/api/_taxonomy.js';
import * as M from '../../functions/api/_role_meta.js';
import * as D from '../../functions/api/_distribution.js';
let pw; try { pw = await import('playwright'); } catch (e) { console.log('admin-dist-shots: playwright not installed – skipped'); process.exit(0); }
const OUT = process.argv[2] || 'out/admin-dist'; fs.mkdirSync(OUT, { recursive: true });
const browser = await pw.chromium.launch().catch(e => { console.log('admin-dist-shots: no browser – skipped (' + String(e).split('\n')[0] + ')'); return null; });
if (!browser) process.exit(0);
const tax = { types: T.TYPES, topics: T.TOPICS, skills: T.SKILLS, exams: T.EXAMS, cefr: T.CEFR };
const cfg = c => D.normCfg(c), now = Date.now(), H = 36e5;
const channels = [
  { channel_id: 'UCembed000001', title: 'Lexkite Lessons', status: 'ok', platform: 'youtube', cfg: cfg({ role: 'embed', label: 'Lessons (embed)', daily_cap: 6 }) },
  { channel_id: 'UCsocial00001', title: 'Lexkite English', status: 'ok', platform: 'youtube', cfg: cfg({ label: 'Lexkite English', types: ['short'], tz: 'America/New_York' }) },
  { channel_id: 'gc-tiktok-77', title: '@lexkite', status: 'ok', platform: 'tiktok', ext: 1, cfg: cfg({ cefr: ['A1', 'A2', 'B1'], regions: ['US', 'GB'] }) },
  { channel_id: 'gc-instagram-12', title: 'lexkite.app', status: 'ok', platform: 'instagram', ext: 1, cfg: cfg({ active: 0 }) },
];
const rules = [{ name: 'Exam → YouTube', cond: { topic: 'exam' }, channel_id: 'UCsocial00001', active: 1 }, { name: 'Easy → TikTok', cond: { cefr: 'A2' }, channel_id: 'gc-tiktok-77', active: 1 }, { name: 'Food', cond: { topic: 'food/cafe' }, channel_id: 'gc-instagram-12', active: 1 }];
const clips = ['cafe-look-for', 'airport-gate-change', 'hotel-late-checkout', 'ielts-part2-hobby', 'restaurant-split-bill', 'news-weather-idioms'];
const DATA = {
  get: { channels, rules, fallback: 'UCembed000001', alerts: [{ at: now, channel_id: 'gc-instagram-12', title: 'lexkite.app', reason: 'publish-failed ×5' }], taxonomy: tax },
  embed_status: { channels: channels.filter(c => c.platform === 'youtube').map(c => ({ channel_id: c.channel_id, title: c.title, role: c.cfg.role, active: 1, status: 'ok' })),
    ready: clips.slice(0, 3).map((c, i) => ({ clip: c, title: c.replace(/-/g, ' '), channel_id: 'UCembed000001', state: i ? 'ready' : 'packing' })),
    lessons: clips.slice(2).map((c, i) => ({ clip: c, title: c.replace(/-/g, ' '), video_id: 'AAAAAAAAAA' + i, channel_id: i === 2 ? 'UCsocial00001' : 'UCembed000001', status: i >= 2 ? 'fallback' : 'youtube', why: i === 2 ? 'not-embed-channel' : i === 3 ? 'private' : null })),
    broken: [{ clip: clips[4], title: 'restaurant split bill', why: 'not-embed-channel' }, { clip: clips[5], title: 'news weather idioms', why: 'private' }],
    coverage: [['food', 'A2', 3, 0], ['food', 'B1', 1, 1], ['travel', 'A2', 2, 0], ['exam', 'B2', 0, 1], ['news', 'B1', 1, 0]].map(([topic, cefr, yt, self]) => ({ topic, cefr, yt, self })) },
  plan_get: { rows: clips.flatMap((c, i) => [0, 1].map(k => { const ms = now + (i * 26 + k * 7 + 3) * H, ch = k ? 'gc-tiktok-77' : 'UCsocial00001'; return { clip: c, channel_id: ch, slot_ms: ms, source: i === 1 ? 'manual' : 'auto', title: c.replace(/-/g, ' '), date: new Date(ms).toISOString().slice(0, 10), time: new Date(ms).toISOString().slice(11, 16), tz: 'UTC' }; })) },
  test_clip: { routes: [{ channel_id: 'gc-tiktok-77', rule: 1, platform: 'tiktok' }, { channel_id: 'UCembed000001', rule: -1, platform: 'youtube' }], trace: [{ i: 0, channel_id: 'UCsocial00001', result: 'no-match', why: 'topic' }, { i: 1, channel_id: 'gc-tiktok-77', result: 'win' }, { i: 2, channel_id: 'gc-instagram-12', result: 'blocked', why: 'paused' }] },
  meta: { clip: clips[0], embed: M.embedMeta({ id: clips[0], point: 'look for' }), social: { youtube: M.socialMeta({ id: clips[0], point: 'look for', cefr: 'A2', topic: 'food', sub: 'food/cafe', hook: 'mistake' }, 'youtube'), tiktok: M.socialMeta({ id: clips[0], point: 'look for', cefr: 'A2' }, 'tiktok') } },
};
const page0 = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/css/style.css"><link rel="stylesheet" href="/css/admin.css"></head>
<body><main class="adm-main" id="main" style="padding:16px"></main><script src="/js/lib/dist-rules.js"></script><script src="/js/admin-dist.js"></script><script src="/js/admin-clips.js"></script></body></html>`;
const report = [], fails = [];
for (const theme of ['light', 'dark']) for (const [vp, size] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: size, colorScheme: theme, deviceScaleFactor: 1 }), page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await page.route('https://lexkite.test/**', r => { const u = new URL(r.request().url()); if (u.pathname === '/admin.html') return r.fulfill({ contentType: 'text/html', body: page0 }); const f = path.join('web', u.pathname); return fs.existsSync(f) ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' }); });
  await page.goto('https://lexkite.test/admin.html');
  await page.evaluate(d => {
    window.__D = d; const esc = x => String(x ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
    window.__mount = area => { location.hash = area === 'social' ? '#dist?area=social' : '#dist'; window.AdminDist.render(document.getElementById('main'), async (op) => JSON.parse(JSON.stringify(window.__D[op] || { ok: true })), (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => v[k]) : s), { esc, lang: () => 'vi', toast() {}, yapi: async () => ({}), sapi: null }); };
  }, DATA);
  const shot = async (name, prep) => {
    await page.evaluate(() => { document.getElementById('main').innerHTML = ''; document.querySelectorAll('.ds-dlg').forEach(x => x.remove()); });
    await prep(); await page.waitForTimeout(250);
    const over = await page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth);
    const file = path.join(OUT, `${name}-${theme}-${vp}.png`); await page.screenshot({ path: file, fullPage: true });
    report.push({ name, theme, vp, file, overflow: over }); if (over > 1) fails.push(`${name} ${theme} ${vp}: horizontal overflow ${over}px`);
  };
  await shot('system', async () => { await page.evaluate(() => window.__mount('system')); await page.waitForSelector('#ds-cv'); });
  await shot('social', async () => { await page.evaluate(() => window.__mount('social')); await page.waitForSelector('.ds-rule'); await page.click('#ds-tgo'); await page.waitForSelector('#ds-tout table'); });
  if (vp === 'desktop' || theme === 'light') await shot('social-settings', async () => { await page.evaluate(() => window.__mount('social')); await page.waitForSelector('[data-cfg]'); await page.click('[data-cfg="gc-tiktok-77"]'); await page.waitForSelector('.ds-dlg'); });
  if (vp === 'desktop' || theme === 'light') await shot('social-meta', async () => { await page.evaluate(() => window.__mount('social')); await page.waitForSelector('[data-meta]'); await page.click('[data-meta]'); await page.waitForSelector('.ds-dlg pre'); });
  // rules editor: drag rule #3 onto #1 → order changes + "unsaved" badge
  if (vp === 'desktop' && theme === 'light') { await page.evaluate(() => { document.querySelectorAll('.ds-dlg').forEach(x => x.remove()); window.__mount('social'); }); await page.waitForSelector('.ds-rule');
    await page.dragAndDrop('.ds-rule[data-i="2"] .ds-h', '.ds-rule[data-i="0"]'); const names = await page.$$eval('.ds-rule [data-r=name]', x => x.map(i => i.value));
    if (names[0] !== 'Food' || !(await page.$('#ds-dirty .ds-b'))) fails.push('drag & drop reorder did not work: ' + names.join(',')); }
  await shot('library-types', async () => { await page.evaluate(() => { const all = Array.from({ length: 24 }, (_, i) => ({ id: 'clip-' + i, title: 'Clip ' + i + ' – look for vs look at', scene: ['cafe', 'airport', 'hotel'][i % 3], template: 'news', cefr: ['A2', 'B1'][i % 2], qa: { status: 'pass', score: 92 }, _v: { type: 'short' } }));
    window.AdminClips.mount(document.getElementById('main'), { capi: async op => (op === 'query' ? { rows: all, total: all.length, next: null, counts: { pending: 24, approved: 0, live: 0, fail: 0, archive: 0 }, typeCounts: { short: 20, long: 3, podcast: 1 }, facets: { format: ['news'], cefr: ['A2', 'B1'] }, taxonomy: window.__D.get.taxonomy } : { ids: [] }), esc: x => String(x ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`), lang: () => 'vi', toast() {}, open() {} }); });
    await page.waitForSelector('.cl-c'); await page.click('#cl-fb'); });
  if (errs.length) fails.push(`${theme} ${vp}: ` + errs.slice(0, 3).join(' | '));
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ report, fails }, null, 1));
console.log(report.map(r => `${r.file} overflow=${r.overflow}`).join('\n'));
if (fails.length) { console.log('✗ ' + fails.join('\n✗ ')); process.exit(1); }
console.log(`✓ admin-dist-shots: ${report.length} ảnh, không lỗi JS, không tràn ngang`);
