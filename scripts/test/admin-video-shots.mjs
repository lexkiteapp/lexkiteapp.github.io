import { fileURLToPath } from 'node:url';
// Visual check of Admin → Video (#video) on SANDBOX fixtures (no account, no API, no network): Playwright Chromium on CI
// (.github/workflows/admin-video-ui.yml). light/dark × desktop(1280)/mobile(390) → <out>/<tag>-<section>-<theme>-<vp>.png + <tag>.json.
// Works with the old module (tabs [data-t]) and the new one (sub-nav .vx-nav [data-sec]) so before/after can be compared.
// Fails on JS errors, horizontal page overflow, layout shift > 0.02 after load, or axe serious/critical issues inside the Video view (new module only).
// Run: node scripts/test/admin-video-shots.mjs [out=out/admin-video] [tag=after] [web=web]
//      node scripts/test/admin-video-shots.mjs --compare out/admin-video   → compare-*.png (before | after, side by side)
import fs from 'node:fs';
import path from 'node:path';
let pw; try { pw = await import('playwright'); } catch (e) { console.log('admin-video-shots: playwright not installed – skipped'); process.exit(0); }
const browser = await pw.chromium.launch().catch(e => { console.log('admin-video-shots: no browser – skipped (' + String(e).split('\n')[0] + ')'); return null; });
if (!browser) process.exit(0);

if (process.argv[2] === '--compare') { // side-by-side sheets: before (left) | after (right)
  const OUT = process.argv[3] || 'out/admin-video', PAIRS = [['lib', 'overview'], ['lib', 'library'], ['lib', 'review'], ['qc', 'qc'], ['sb', 'scripts'], ['web', 'channels']], made = [];
  for (const theme of ['light', 'dark']) for (const vp of ['desktop', 'mobile']) for (const [b, a] of PAIRS) {
    const fb = path.join(OUT, `before-${b}-${theme}-${vp}.png`), fa = path.join(OUT, `after-${a}-${theme}-${vp}.png`); if (!fs.existsSync(fb) || !fs.existsSync(fa)) continue;
    const img = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64'), w = vp === 'desktop' ? 1280 : 390;
    const page = await browser.newPage({ viewport: { width: w * 2 + 48, height: 600 } });
    await page.setContent(`<body style="margin:0;background:#888;font:600 16px system-ui;color:#fff;display:flex;gap:16px;padding:16px;align-items:flex-start"><figure style="margin:0;width:${w}px"><figcaption style="padding:0 0 8px">TRƯỚC · ${b}</figcaption><img style="width:${w}px;display:block" src="${img(fb)}"></figure><figure style="margin:0;width:${w}px"><figcaption style="padding:0 0 8px">SAU · ${a}</figcaption><img style="width:${w}px;display:block" src="${img(fa)}"></figure></body>`);
    await page.waitForTimeout(100); const f = path.join(OUT, `compare-${a}-${theme}-${vp}.png`); await page.screenshot({ path: f, fullPage: true }); made.push(f); await page.close();
  }
  await browser.close(); console.log(made.join('\n') || 'no pairs'); process.exit(0);
}

const OUT = process.argv[2] || 'out/admin-video', TAG = process.argv[3] || 'after', WEB = process.argv[4] || 'web'; fs.mkdirSync(OUT, { recursive: true });
let axe = null; try { axe = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.resolve('axe-core'))), 'axe.min.js'), 'utf8'); } catch (e) { /* optional */ }

// ---- sandbox fixtures (deterministic) ----
const SCENES = ['cafe', 'airport', 'hotel', 'office', 'anchor'], TPL = ['choose', 'listen', 'news', 'fix-it'], CEFR = ['A2', 'B1', 'B2'], AREAS = ['listening', 'grammar', 'dictionary', 'speaking', 'exam'];
const POINTS = ['look for vs look at', 'I am agree → I agree', 'borrow vs lend', 'make vs do', 'since vs for', 'say vs tell', 'gate change at the airport', 'late check-out please', 'split the bill', 'on time vs in time'];
const items = Array.from({ length: 48 }, (_, i) => {
  const sc = SCENES[i % 5], pass = i % 7 !== 3, d = String(1 + (i * 3) % 22).padStart(2, '0');
  return { id: `${sc}-${String(i).padStart(3, '0')}`, lesson: 'l' + i, scene: sc, format: sc === 'anchor' ? 'news' : 'scene', template: TPL[i % 4], area: AREAS[i % 4], cefr: CEFR[i % 3], point: POINTS[i % 10], title: POINTS[i % 10].replace(/^./, c => c.toUpperCase()) + (i > 9 ? ` (${Math.floor(i / 10) + 1})` : ''),
    description: 'Learn ' + POINTS[i % 10], hashtags: ['#learnenglish', '#shorts'], duration: 18 + (i % 9), bytes: 7e6 + i * 1e5, created: `2026-10-${d}T05:00:00Z`, run: 1200 + i,
    qa: pass ? { status: 'pass', result: 'ALL PASS', ok: 31, fail: 0, score: 86 + (i % 14), lipsync_ms: 30 + i % 20, cps_max: 13.5 } : { status: 'fail', result: 'FAIL', ok: 27, fail: 4, score: 58 + i % 20 },
    video: `shorts/${sc}/${i}/v.mp4`, cover: `shorts/${sc}/${i}/v.jpg`, slot: i % 3 ? { n: i, date: `2026-11-${String(1 + i % 28).padStart(2, '0')}`, time: '11:30', tz: 'Asia/Ho_Chi_Minh' } : null };
});
const V = i => (i % 7 === 3 ? {} : i % 11 === 0 ? { rejected: true, reason: 'Hook too slow' } : i % 13 === 5 ? { paused: true } : i % 5 === 1 ? { uploaded: true } : i % 6 === 2 ? { web: true } : i % 4 === 2 ? { approved: true } : {});
const section = (it, v) => (v.rejected || v.paused ? 'archive' : v.uploaded || v.web ? 'live' : v.approved ? 'approved' : it.qa.status === 'pass' ? 'pending' : 'fail');
const covers = Object.fromEntries(items.map((it, i) => [it.cover, `https://img.test/${i}.svg`]));
const rows = items.map((it, i) => { const v = V(i); return { ...it, cover_url: covers[it.cover], _v: { ...v, score: it.qa.score, slot: it.slot } }; });
const counts = {}; rows.forEach(r => { const s = section(r, r._v); counts[s] = (counts[s] || 0) + 1; });
const qcDays = ['2026-10-22', '2026-10-21', '2026-10-20'].map((date, k) => ({ date, items: items.slice(k * 9, k * 9 + 9).map((it, j) => ({ id: it.id, score: it.qa.score, ok: it.qa.status === 'pass' && j !== 4, failed: it.qa.status === 'pass' && j !== 4 ? [] : [['bg_no_text', 'speaking_rate'], ['ai_vision'], ['asr_vs_script', 'qa_news']][j % 3], bg: 'bg-' + j, run: it.run })) }));
const FX = {
  list: { items, source: 'drive', media: true, updated: '2026-10-22T00:00:00Z', covers,
    coverage: { target_per_area: 12, areas: { listening: { label: 'Listening' }, grammar: { label: 'Grammar' }, dictionary: { label: 'Dictionary' }, speaking: { label: 'Speaking' }, exam: { label: 'Exam prep' }, kids: { label: 'Kids' } } },
    calendar: { posts: items.filter(x => x.slot).map(x => ({ ...x.slot, id: x.id, scene: x.scene, template: x.template })).sort((a, b) => a.date.localeCompare(b.date)) },
    credits: { total: 2950, banks: { cafe: { total: 1200, img_cr: 200, video_cr: 1000 }, airport: { total: 950, img_cr: 150, video_cr: 800 }, anchor: { total: 800, img_cr: 100, video_cr: 700 } } } },
  qc: { days: qcDays },
  web: { rows: items.slice(0, 8).map((it, i) => ({ id: it.id, view: 400 - i * 37, done: 260 - i * 25, quiz_ok: 90 - i * 8, quiz_no: 20 + i })) },
};
const YT = {
  status: { configured: true, channel: { channel_id: 'UCdemo000001', title: 'Lexkite English', status: 'ok', videos: 42 }, channels: [{ channel_id: 'UCdemo000001', title: 'Lexkite English', status: 'ok', videos: 42, is_default: true }, { channel_id: 'UCdemo000002', title: 'Lexkite Lessons', status: 'revoked', videos: 7 }],
    quota: { used: 1600, limit: 10000, left: 8400, uploads_left: 5 }, queue: { queued: 2, failed: 0, done: 31 }, manual: { ready: 2, packing: 1, uploaded: 3, live: 28, issues: 1 }, settings: { mode: 'manual', privacy: 'private' }, scope: { ok: true },
    sync: { at: Date.parse('2026-10-22T08:00:00Z'), scanned: 41, matched: 38, issues: [{ kind: 'no-marker', video_id: 'AbCdEfGhIj0', title: 'Old upload' }], channels: [{ channel_id: 'UCdemo000001', title: 'Lexkite English', scanned: 41, matched: 38, unmatched: 3 }], unmatched: [{ video_id: 'AbCdEfGhIj0', title: 'Old upload – ordering coffee', at: Date.parse('2026-10-20T08:00:00Z'), channel_id: 'UCdemo000001' }, { video_id: 'XyZxYzXyZ01', title: 'Behind the scenes', at: Date.parse('2026-10-18T08:00:00Z'), channel_id: 'UCdemo000001' }] }, studio: 'https://studio.youtube.com/' },
  queue: { rows: [{ clip: items[1].id, status: 'manual' }, { clip: items[2].id, status: 'manual' }] },
  packs: { studio: 'https://studio.youtube.com/', rows: items.slice(0, 3).map((it, i) => ({ id: it.id, title: it.title, marker: 'lk:' + it.id, state: ['ready', 'packing', 'uploaded'][i], pack: i === 0 ? '/api/admin-shorts?p=x' : null, tags: ['learn english'], description: 'd', updated: Date.parse('2026-10-22T00:00:00Z') })) },
};
const DIST = { get: { channels: [{ channel_id: 'UCdemo000001', title: 'Lexkite English', platform: 'youtube', status: 'ok', cfg: { role: 'social', active: 1 } }, { channel_id: 'UCdemo000002', title: 'Lexkite Lessons', platform: 'youtube', status: 'revoked', cfg: { role: 'embed', active: 1 } }, { channel_id: 'gc-tiktok-77', title: '@lexkite', platform: 'tiktok', ext: 1, cfg: { role: 'social', active: 1, label: '@lexkite' } }, { channel_id: 'gc-instagram-12', title: 'lexkite.app', platform: 'instagram', ext: 1, cfg: { role: 'social', active: 0 } }] },
  embed_status: { channels: [{ channel_id: 'UCdemo000001', role: 'social', rotating: false }, { channel_id: 'UCdemo000002', role: 'embed', rotating: false }], ready: [], lessons: [], broken: [], coverage: [] } };
const SB = { updated: '2026-10-22T06:00:00Z', bank: 1240, review: 37, pending: 85, pass_rate: 0.82, planned: 3000, left: 1760, avg_score: 8.4,
  by_type: { 'fix-it': 420, choose: 380, listen: 260, news: 180 }, by_cefr: { A2: 510, B1: 480, B2: 250 }, by_diff: { easy: 400, mid: 600, hard: 240 }, by_topic: { travel: 300, work: 260, food: 240, daily: 440 }, review_reasons: { 'too long': 14, 'CEFR too high': 12, 'weak hook': 11 },
  days: [{ date: '2026-10-22', gen_calls: 120, judge_calls: 110, generated: 96, qc_fail: 9, dup: 4, passed: 80, low: 3, neurons: 5100 }, { date: '2026-10-21', gen_calls: 118, judge_calls: 104, generated: 90, qc_fail: 7, dup: 6, passed: 74, low: 3, neurons: 4900 }] };
const VIDEOS = { items: items.slice(0, 8).map((it, i) => ({ id: it.id, slug: it.id, title: it.title, template: it.template, youtube_id: i < 3 ? 'AbCdEfGhIj' + i : undefined })) };

const page0 = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/css/style.css"><link rel="stylesheet" href="/css/admin.css"></head>
<body class="adm adm-in"><header class="adm-top"><span class="wordmark">lex<b>kite</b></span><span class="adm-tag">Admin</span></header><div class="adm-shell"><aside class="adm-side" id="side"><nav class="side-nav" aria-label="Admin"><div class="side-g"><div class="side-h">Nội dung &amp; Video</div><a class="side-a" href="#dist">🛰️ Kênh &amp; phân phối</a><a class="side-a" href="#studio">🎞️ Video Studio</a><a class="side-a" href="#video" aria-current="page">🎬 Trung tâm video</a></div></nav></aside><div class="adm-content"><div class="pg-head" id="pgHead"><div class="pg-tx"><div class="pg-crumb">Nội dung &amp; Video</div><h1 class="pg-t">Video</h1></div><div class="pg-act" id="pgAct"></div></div><main class="adm-main" id="main" tabindex="-1"></main></div></div><div class="adm-toasts" id="toasts"></div>
<script src="/js/admin-chart.js"></script><script src="/js/admin-video.js"></script><script src="/js/admin-clips.js"></script></body></html>`;
const svg = i => `<svg xmlns="http://www.w3.org/2000/svg" width="270" height="480"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${(i * 47) % 360},45%,62%)"/><stop offset="1" stop-color="hsl(${(i * 47 + 40) % 360},45%,30%)"/></linearGradient></defs><rect width="270" height="480" fill="url(#g)"/><circle cx="135" cy="210" r="62" fill="rgba(255,255,255,.35)"/><rect x="60" y="300" width="150" height="120" rx="30" fill="rgba(255,255,255,.3)"/></svg>`;

const report = [], fails = [];
for (const theme of ['light', 'dark']) for (const [vp, size] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: size, colorScheme: theme, deviceScaleFactor: 1 }), page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await page.route('https://img.test/**', r => { const i = +(r.request().url().match(/(\d+)\.svg/) || [0, 0])[1]; r.fulfill({ contentType: 'image/svg+xml', body: svg(i) }); });
  await page.route('https://lexkite.test/**', r => {
    const u = new URL(r.request().url());
    if (u.pathname === '/admin.html') return r.fulfill({ contentType: 'text/html', body: page0 });
    if (u.pathname === '/data/script-bank.json') return r.fulfill({ contentType: 'application/json', body: JSON.stringify(SB) });
    if (u.pathname === '/data/videos.json') return r.fulfill({ contentType: 'application/json', body: JSON.stringify(VIDEOS) });
    const f = path.join(WEB, u.pathname); return fs.existsSync(f) ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' });
  });
  await page.goto('https://lexkite.test/admin.html#video');
  await page.evaluate(({ FX, YT, rows, counts, DIST }) => {
    const esc = x => String(x ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`), L = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m)) : s), J = x => JSON.parse(JSON.stringify(x));
    const SECT = it => { const v = it._v; return v.rejected || v.paused ? 'archive' : v.uploaded || v.web ? 'live' : v.approved ? 'approved' : it.qa.status === 'pass' ? 'pending' : 'fail'; };
    const capi = async (op, b) => {
      if (op === 'query') { const f = b.filter || {}, at = b.cursor || 0; let list = rows.filter(r => (f.section ? SECT(r) === f.section : SECT(r) !== 'archive') && (!f.template || r.template === f.template) && (!f.q || r.title.toLowerCase().includes(f.q.toLowerCase())));
        if (f.sort === 'qa') list = list.slice().sort((x, y) => (f.dir === 'asc' ? 1 : -1) * ((x.qa.score || 0) - (y.qa.score || 0)));
        return J({ rows: list.slice(at, at + b.limit), total: list.length, next: at + b.limit < list.length ? at + b.limit : null, counts, typeCounts: { short: rows.length, long: 0, podcast: 0 }, facets: { template: ['choose', 'listen', 'news', 'fix-it'], format: ['news', 'scene'], cefr: ['A2', 'B1', 'B2'], scene: ['cafe', 'airport', 'hotel', 'office', 'anchor'] } }); }
      if (op === 'ids') return { ids: rows.map(r => r.id) };
      return { results: (b.ids || []).map(id => ({ id, ok: true })) };
    };
    window.__mount = () => window.AdminVideo.render(document.getElementById('main'), async op => { if (!FX[op]) throw new Error('op'); return J(FX[op]); }, L, { esc, lang: () => 'vi', toast() {}, yapi: async op => J(YT[op] || { ok: true }), distapi: async op => J(DIST[op] || { ok: true }), capi });
    window.__mount();
  }, { FX, YT, rows, counts, DIST });
  const isNew = await page.waitForSelector('.vx-nav, [data-t]', { timeout: 15000 }).then(() => page.$('.vx-nav')).then(Boolean);
  const SEC = isNew ? ['overview', 'review', 'library', 'qc', 'scripts', 'channels', 'archive'] : ['lib', 'stats', 'web', 'qc', 'sb'];
  for (const s of SEC) {
    if (vp === 'mobile' && theme === 'dark' && !['overview', 'review', 'library', 'lib', 'qc'].includes(s)) continue;
    await page.evaluate(() => window.scrollTo(0, 0));
    if (isNew) await page.click(`.vx-nav [data-sec="${s}"]`); else await page.click(`[data-t="${s}"]`);
    await page.waitForTimeout(isNew ? 500 : 700);
    if (s === 'library' || s === 'lib' || s === 'archive') await page.waitForSelector('.cl-c, .vid-card, .cl-empty, .empty', { timeout: 8000 }).catch(() => {});
    // layout shift after the section is shown (late data must not push content)
    const cls = await page.evaluate(() => new Promise(res => { let v = 0; try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) v += e.value; }).observe({ type: 'layout-shift' }); } catch (e) { /* unsupported */ } setTimeout(() => res(v), 700); }));
    const over = await page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth);
    let ax = null;
    if (isNew && axe && vp === 'desktop') { await page.addScriptTag({ content: axe }).catch(() => {}); ax = await page.evaluate(async () => { const r = await window.axe.run('#main', { runOnly: ['wcag2a', 'wcag2aa'] }); return r.violations.filter(v => /serious|critical/.test(v.impact)).map(v => v.id + ' ×' + v.nodes.length + ' ' + v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')); }); }
    const file = path.join(OUT, `${TAG}-${s}-${theme}-${vp}.png`); await page.screenshot({ path: file, fullPage: true });
    report.push({ s, theme, vp, file, overflow: over, cls: +cls.toFixed(3), axe: ax });
    if (over > 1) { const who = await page.evaluate(() => [...document.querySelectorAll('#main *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && !e.closest('.tbl-x,.cl-vp,.vx-nav')).slice(-3).map(e => e.tagName.toLowerCase() + '.' + [...e.classList].join('.') + ' w=' + Math.round(e.getBoundingClientRect().width)).join(' | ')); fails.push(`${s} ${theme} ${vp}: horizontal overflow ${over}px ← ${who}`); }
    if (isNew && cls > 0.02) fails.push(`${s} ${theme} ${vp}: layout shift ${cls.toFixed(3)}`);
    if (ax && ax.length) fails.push(`${s} ${theme}: axe ${ax.join('; ')}`);
  }
  if (errs.length) fails.push(`${theme} ${vp}: ` + errs.slice(0, 3).join(' | '));
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, TAG + '.json'), JSON.stringify({ report, fails }, null, 1));
console.log(report.map(r => `${r.file} overflow=${r.overflow} cls=${r.cls}${r.axe ? ' axe=' + r.axe.length : ''}`).join('\n'));
if (fails.length) { console.log('✗ ' + fails.join('\n✗ ')); if (TAG !== 'before') process.exit(1); }
