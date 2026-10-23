// Hiệu năng + nhất quán từ điển trên máy di động tầm trung giả lập (Chromium thật, Playwright; CI: .github/workflows/dict-perf.yml)
//   mạng 150 ms RTT · 1,6 Mbps xuống · CPU chậm 4× · màn 390×844 · máy chủ tĩnh nén Brotli + Cache-Control như _headers (Cloudflare Pages)
// Đo: tải trang đầu (byte), tra lạnh / ấm (ms tới khi nghĩa hiện), byte mạng mỗi lần tra sau khi ấm, bộ nhớ JS, tác vụ dài khi gõ/tìm,
//     add-on trên trang nặng (thời gian script + bộ nhớ của trang có/không add-on).
// Nhất quán: cùng 1 từ → trang tra từ hiển thị đúng IPA Anh/Mỹ, nghĩa, định nghĩa của mục kho (mảnh = IELTS_DATA.INDEX).
// Dùng: node scripts/test/dict-perf.mjs [--root <repo>] [--label after] [--json out.json] [--strict] [--ext <thư mục add-on>]
//   --root: thư mục repo cần đo (vd. bản main cũ để so "trước/sau"); mảnh phải sinh sẵn: node <root>/scripts/lexicon/shards.mjs --out <root>/web
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
let pw; try { pw = await import('playwright'); } catch (e) { console.log('dict-perf: playwright chưa cài – bỏ qua'); process.exit(0); }
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const ROOT = path.resolve(arg('--root') || '.'), WEB = path.join(ROOT, 'web'), LABEL = arg('--label') || 'run', STRICT = process.argv.includes('--strict');
const T = { warm: 50, cold: 300, shellGz: 377 * 1024, perLookup: 5 * 1024, longTasks: 0 };

// ---------- máy chủ tĩnh giống Pages ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
const brC = new Map();
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(WEB, p);
  if (!f.startsWith(WEB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  const st = fs.statSync(f), etag = `"${st.size}-${st.mtimeMs | 0}"`, ext = path.extname(f);
  const cc = p.startsWith('/data/lex/') || p.startsWith('/audio/') ? 'public, max-age=31536000, immutable' : 'no-cache';
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ETag: etag, 'Cache-Control': cc }); return res.end(); }
  let body = fs.readFileSync(f); const h = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': cc, ETag: etag };
  if (/br/.test(req.headers['accept-encoding'] || '') && /\.(html|js|css|json|svg|webmanifest)$/.test(f)) { const k = f + etag; if (!brC.has(k)) brC.set(k, zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } })); body = brC.get(k); h['Content-Encoding'] = 'br'; }
  res.writeHead(200, h); res.end(body);
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${srv.address().port}`;

// dữ liệu mong đợi (mảnh sinh từ chính root đang đo; không có mảnh = bản cũ → lấy INDEX bằng vm)
const hasShards = fs.existsSync(path.join(WEB, 'data/lex-index.json'));
let INDEX = null;
try { const m = await import(path.join(process.cwd(), 'scripts/lexicon/shards.mjs')); INDEX = m.loadBrowserIndex().INDEX; } catch (e) { console.log('không nạp được INDEX:', e.message); }

const browser = await pw.chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36', locale: 'vi-VN' };
async function newPage(ctx) {
  const page = await ctx.newPage(); page.setDefaultTimeout(60000);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Performance.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 0.75e6 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const net = { bytes: 0, same: 0, reqs: [] };
  cdp.on('Network.responseReceived', e => { net.reqs.push({ id: e.requestId, url: e.response.url }); });
  cdp.on('Network.loadingFinished', e => { net.bytes += e.encodedDataLength; const r = net.reqs.find(x => x.id === e.requestId); if (r && r.url.startsWith(ORIGIN)) net.same += e.encodedDataLength; });
  page.on('pageerror', e => console.log(`[${LABEL}] pageerror:`, e.message.slice(0, 200)));
  return { page, cdp, net };
}
// bên thứ ba (Google, Wiktionary, Datamuse, ảnh…): trả rỗng sau 400 ms như mạng di động thật – đo đúng phần của kho Lexkite
const thirdParty = ctx => ctx.route(u => !String(u).startsWith(ORIGIN), r => setTimeout(() => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }).catch(() => {}), 400));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = { label: LABEL, root: ROOT, shards: hasShards };

// ---------- 1) Tải trang đầu + bộ nhớ ----------
const ctx = await browser.newContext(MOBILE); await thirdParty(ctx);
await ctx.addInitScript(() => { try { localStorage.setItem('vb-onboarded', '1'); } catch (e) { /* */ } window.__lt = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push({ t: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true }); } catch (e) { /* */ } });
let { page, cdp, net } = await newPage(ctx);
await page.goto(ORIGIN + '/app/?sandbox=1#/dict', { waitUntil: 'load' });
await page.waitForFunction(() => window.Dict && document.querySelector('#q'), null, { timeout: 60000 });
await sleep(6000); // rảnh: lex.js + mục lục, các gói tải sẵn (prefetch không thực thi)
R.firstLoadKB = +(net.bytes / 1024).toFixed(1); R.firstLoadSameKB = +(net.same / 1024).toFixed(1);
const heap = async () => { const m = await cdp.send('Performance.getMetrics'); const v = n => (m.metrics.find(x => x.name === n) || {}).value || 0; return +(v('JSHeapUsedSize') / 1048576).toFixed(1); };
R.heapStartMB = await heap();

// ---------- 2) Tra lạnh / ấm (ms từ đổi hash tới khi từ + nghĩa hiện) ----------
const lookup = async w => {
  const b0 = net.same;
  const ms = await page.evaluate(async w => {
    const t0 = performance.now(); location.hash = '#/dict/' + encodeURIComponent(w);
    const nw = s => String(s || '').trim().toLowerCase();
    while (performance.now() - t0 < 30000) { const e = document.querySelector('#result .entry-word'), v = document.querySelector('#result .vi'); if (e && v && v.textContent.trim() && (nw(e.textContent) === nw(w) || document.querySelector('#result [data-from]'))) return performance.now() - t0; await new Promise(r => setTimeout(r, 5)); }
    return -1;
  }, w);
  await sleep(1200); // để lookup() đầy đủ chạy xong (byte bên thứ ba bị trả rỗng)
  return { w, ms: Math.round(ms), kb: +((net.same - b0) / 1024).toFixed(2) };
};
const COLD = ['mitigate', 'sustainable', 'phenomenon', 'resilient', 'infrastructure', 'tuition'];
R.cold = []; for (const w of COLD.slice(0, 3)) R.cold.push(await lookup(w));
R.warm = []; for (const w of COLD.slice(0, 3)) R.warm.push(await lookup(w)); // cùng từ, mảnh đã có
// sau khi ấm: 12 từ mới rải khắp bảng chữ cái → byte mạng trung bình mỗi lần tra
const SPREAD = ['abandon', 'benefit', 'consequence', 'diverse', 'evaluate', 'flexible', 'generate', 'hypothesis', 'justify', 'maintain', 'obtain', 'priority'];
R.spread = []; for (const w of SPREAD) R.spread.push(await lookup(w));
const med = a => { const s = a.filter(x => x >= 0).sort((x, y) => x - y); return s.length ? s[s.length >> 1] : -1; };
R.coldMs = Math.max(...R.cold.map(x => x.ms)); R.warmMs = med(R.warm.map(x => x.ms)); R.spreadMs = med(R.spread.map(x => x.ms));
R.perLookupKB = +(R.spread.reduce((a, x) => a + x.kb, 0) / R.spread.length).toFixed(2);
R.heapAfterMB = await heap();
R.lex = await page.evaluate(() => (window.Lex ? Lex.stats() : null)); // mảnh thật (không phải dự phòng INDEX)

// ---------- 3) Gõ tìm: tác vụ dài > 50 ms, gợi ý đúng chữ cuối (gõ nhanh) ----------
await page.evaluate(() => { location.hash = '#/home'; }); await sleep(2500);
await page.evaluate(() => { window.__lt.length = 0; });
if (await page.locator('#gq').count()) {
  await page.evaluate(() => document.querySelector('#gq').focus()); await page.keyboard.type('sustainab', { delay: 60 }); await sleep(1500);
  R.typingLongTasks = await page.evaluate(() => window.__lt.filter(x => x.d > 50).map(x => Math.round(x.d)));
  R.suggestOk = await page.evaluate(() => { const a = [...document.querySelectorAll('#suggest a b')].map(b => b.textContent.toLowerCase()); return a.length > 0 && a.every(x => x.startsWith('sustainab')); });
} else R.typingLongTasks = ['#gq không có'];

// ---------- 4) Offline: trang mới cùng hồ sơ (IndexedDB còn) → từ đã tra vẫn hiện khi mất mạng ----------
if (hasShards) {
  const p2 = await newPage(ctx); await p2.page.goto(ORIGIN + '/app/?sandbox=1#/home', { waitUntil: 'load' }); await p2.page.waitForFunction(() => window.Dict); await sleep(3000);
  await p2.cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  R.offlineOk = await p2.page.evaluate(async () => { const L = window.Lex || await new Promise(r => setTimeout(() => r(window.Lex), 2000)); if (!L) return 'no Lex'; L._reset(); const r = await L.get('mitigate'); return !!(r && r.entry && r.entry.vi); });
  await p2.page.close();
}

// ---------- 5) Nhất quán: trang tra từ hiện đúng mục kho ----------
R.consistency = [];
if (INDEX) {
  const SAMPLE = ['record', 'present', 'object', 'café', 'well-being', 'analyse', 'children', 'went', 'give up', 'resilient', 'the', 'data'];
  for (const w of SAMPLE) {
    const k = w.toLowerCase(); const want0 = INDEX[k] || (w === 'children' ? INDEX.child : w === 'went' ? INDEX.go : null); if (!want0) continue;
    await page.evaluate(w => { location.hash = '#/dict/' + encodeURIComponent(w); }, w);
    await page.waitForFunction(() => document.querySelector('#result .entry-word'), null, { timeout: 30000 }).catch(() => {});
    await sleep(2500);
    const got = await page.evaluate(() => { const ipa = [...document.querySelectorAll('#result .pron .ipa')].map(x => x.textContent.trim()); return { word: (document.querySelector('#result .entry-word') || {}).textContent, uk: ipa[0], us: ipa[1], vi: ((document.querySelector('#result .entry-head .vi') || {}).textContent || '').trim(), def: ((document.querySelector('#result .entry-head div[lang=en]') || {}).textContent || '').trim() }; });
    const want = { word: want0.word, uk: want0.ipa || '—', us: want0.ipaUS || want0.ipa || '—', vi: want0.vi, def: want0.def };
    const bad = Object.keys(want).filter(f => String(got[f] || '') !== String(want[f] || ''));
    R.consistency.push({ w, ok: !bad.length, bad: bad.map(f => `${f}: "${String(got[f]).slice(0, 40)}" ≠ "${String(want[f]).slice(0, 40)}"`) });
  }
}
await ctx.close();

// ---------- 6) Add-on trên trang nặng (3 000 đoạn + 12 khung) ----------
const EXT = arg('--ext') || path.join(ROOT, 'extension');
if (fs.existsSync(path.join(EXT, 'manifest.json'))) {
  const para = i => `<p>Paragraph ${i}: the committee reached a sustainable decision about infrastructure, tuition and resilient communities after a long debate.</p>`;
  const HEAVY = `<!doctype html><html><head><meta charset="utf-8"><title>Heavy</title></head><body>${Array.from({ length: 3000 }, (_, i) => para(i)).join('')}${Array.from({ length: 12 }, (_, i) => `<iframe src="https://heavy.example.com/frame${i}" width="300" height="120"></iframe>`).join('')}</body></html>`;
  const FRAME = `<!doctype html><html><body>${Array.from({ length: 40 }, (_, i) => para(i)).join('')}</body></html>`;
  const run = async withExt => {
    const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'lkperf-'));
    const c = await pw.chromium.launchPersistentContext(prof, { channel: 'chromium', headless: true, viewport: { width: 1280, height: 860 }, args: withExt ? [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`] : [] });
    await c.route('https://heavy.example.com/**', r => r.fulfill({ contentType: 'text/html', body: /frame/.test(r.request().url()) ? FRAME : HEAVY }));
    await c.route(u => !/heavy\.example\.com/.test(String(u)), r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    if (withExt) { let [sw] = c.serviceWorkers(); if (!sw) sw = await c.waitForEvent('serviceworker'); await sleep(1500); for (const p of c.pages()) if (/^chrome-extension:/.test(p.url())) await p.close().catch(() => {}); }
    const p = await c.newPage(); const s = await c.newCDPSession(p); await s.send('Performance.enable');
    await p.goto('https://heavy.example.com/article', { waitUntil: 'load' }); await sleep(5000);
    const m = await s.send('Performance.getMetrics'), v = n => (m.metrics.find(x => x.name === n) || {}).value || 0;
    const out = { scriptMs: Math.round(v('ScriptDuration') * 1000), heapMB: +(v('JSHeapUsedSize') / 1048576).toFixed(1), frames: p.frames().length };
    if (withExt) { // thao tác đầu tiên vẫn tra được (nạp lười)
      await p.locator('p').nth(5).dblclick({ position: { x: 120, y: 8 } }); await sleep(4000);
      out.lookupOk = await p.evaluate(() => { const h = document.querySelector('ielts-lexi-popup'); return !!(h && (h.shadowRoot ? h.shadowRoot.textContent.trim() : true)); });
    }
    await c.close(); return out;
  };
  try { const a = await run(false), b = await run(true); R.addon = { without: a, with: b, extraScriptMs: b.scriptMs - a.scriptMs, extraHeapMB: +(b.heapMB - a.heapMB).toFixed(1), lookupOk: b.lookupOk }; } catch (e) { R.addon = { error: String(e).split('\n')[0] }; }
}
await browser.close(); srv.close();

// ---------- kết quả ----------
const fails = [];
if (R.warmMs > T.warm) fails.push(`tra ấm ${R.warmMs} ms > ${T.warm}`);
if (R.coldMs > T.cold) fails.push(`tra lạnh ${R.coldMs} ms > ${T.cold}`);
if (R.perLookupKB * 1024 > T.perLookup) fails.push(`mỗi lần tra ${R.perLookupKB} KB > 5 KB`);
if ((R.typingLongTasks || []).length > T.longTasks) fails.push(`tác vụ dài khi gõ: ${R.typingLongTasks}`);
if (R.suggestOk === false) fails.push('gợi ý không khớp chữ đang gõ');
if (R.offlineOk === false || typeof R.offlineOk === 'string') fails.push('offline: không tra được từ đã lưu');
for (const c of R.consistency) if (!c.ok) fails.push(`nhất quán "${c.w}": ${c.bad.join('; ')}`);
if (hasShards && !(R.lex && R.lex.version !== 'local' && R.lex.net > 0)) fails.push(`Lex không dùng mảnh: ${JSON.stringify(R.lex)}`);
if (R.addon && R.addon.lookupOk === false) fails.push('add-on: bấm đúp lần đầu không tra được');
R.fails = fails;
console.log(JSON.stringify(R, null, 1));
if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify(R));
console.log(`${fails.length ? '✗' : '✓'} dict-perf [${LABEL}]: lạnh ${R.coldMs} ms · ấm ${R.warmMs} ms · mỗi lần tra ${R.perLookupKB} KB · trang đầu ${R.firstLoadKB} KB · heap ${R.heapAfterMB} MB · tác vụ dài khi gõ ${(R.typingLongTasks || []).length}${R.addon && R.addon.with ? ` · add-on +${R.addon.extraScriptMs} ms script, +${R.addon.extraHeapMB} MB` : ''}${fails.length ? '\n  - ' + fails.join('\n  - ') : ''}`);
process.exit(STRICT && fails.length ? 1 : 0);
