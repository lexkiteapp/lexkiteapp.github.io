// 🎞️ E2E video nhúng một bước #/lesson (cờ lv_embed, ?lvembed=1) – Chrome thật (H.264), hermetic: phục vụ web/ + mp4/vtt/jpg mẫu từ thư mục fixture
// (artifact video-motion `motion-<t>-embed-*` của PR #191, scripts/test/lesson-embed-fixture.sh), 0 lượt chạm prod, 0 tài khoản.
// Kiểm: bản đồ chặng KHÔNG tải gì của video · bước mở → 4:5 (điện thoại) / 16:9 (máy tính) · bìa JPG · <track> phụ đề EN đang hiện + chương
// · nút chương tua đúng mốc · gác bố cục (ux-guard-lib: chồng lấn/cắt/tràn/nút bị che) · hết video → bài tự sang bước kế (nút Tiếp tục của bài).
// Dùng: node scripts/test/lesson-embed-e2e.mjs <web> <fixture-dir> [out]
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
import { serve, scan, MIME } from './ux-guard-lib.mjs';
const [ROOT = 'web', FIX = 'out/lv-fixture', OUT = 'out/lesson-embed'] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const EMB = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/videos.json'), 'utf8')).embeds || [];
if (!EMB.length) { console.log('✗ web/data/videos.json không có embeds'); process.exit(1); }
const ID = EMB[0].id;
const CONFIGS = [[390, 'light', 'vi'], [360, 'dark', 'ar'], [1366, 'light', 'en'], [1920, 'dark', 'ja']];
const OPT = { roots: ['#view', '#lsnFoot'], layers: true, cover: true };
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
const found = {}, errs = [], seen = [];

// mp4 cần Range (tua) → 206; CORS cho <video crossorigin> + fetch chương
function media(r) {
  const u = new URL(r.request().url()), f = path.join(FIX, path.basename(u.pathname));
  if (!u.pathname.startsWith(`/video/${ID}/`) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
  const b = fs.readFileSync(f), type = MIME[path.extname(f)] || (f.endsWith('.vtt') ? 'text/vtt' : f.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream');
  const h = { 'access-control-allow-origin': '*', 'accept-ranges': 'bytes', 'content-type': type }, m = /bytes=(\d+)-(\d*)/.exec(r.request().headers().range || '');
  if (!m) return r.fulfill({ status: 200, headers: h, body: b });
  const a = +m[1], z = Math.min(m[2] ? +m[2] : b.length - 1, b.length - 1);
  return r.fulfill({ status: 206, headers: { ...h, 'content-range': `bytes ${a}-${z}/${b.length}` }, body: b.subarray(a, z + 1) });
}

async function run(width, scheme, lang) {
  const mobile = width < 768, tag = `${width}-${scheme}-${lang}`, want = width >= 900 ? 'wide' : 'sq45';
  const vp = mobile ? { viewport: { width, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width, height: width > 1600 ? 1080 : 860 } };
  const ctx = await browser.newContext({ ...vp, colorScheme: scheme, serviceWorkers: 'block', reducedMotion: 'reduce', locale: lang });
  await serve(ctx, ROOT);
  await ctx.route('https://lexkite.com/data/videos.json', r => r.fulfill({ status: 200, contentType: 'application/json', body: fs.readFileSync(path.join(ROOT, 'data/videos.json')) }));
  await ctx.route('https://media.lexkite.com/**', media);
  const page = await ctx.newPage(), net = [];
  page.on('pageerror', e => errs.push(`${tag}: ${e.message}`));
  page.on('request', q => { if (/videos\.json|media\.lexkite\.com|lesson-video\.js/.test(q.url())) net.push(q.url()); });
  const bad = m => { errs.push(`${tag}: ${m}`); console.log(`✗ ${tag}: ${m}`); };
  const check = async step => {
    seen.push(`${tag} ${step}`);
    const res = await page.evaluate(scan, OPT).catch(e => ({ err: [e.message] }));
    for (const [k, v] of Object.entries(res)) if (v.length) (found[k] ||= []).push(`${tag} ${step}: ${v.join(' | ')}`);
    await page.screenshot({ path: path.join(OUT, `${tag}-${step}.png`) });
  };
  const q = `sandbox=1&ux1=1&hl=${lang}`;
  // 1) bản đồ chặng: chưa mở bước → 0 byte video / manifest / gói lvideo
  await page.goto(`https://lk.test/app/?${q}#/lesson?demo=1&lvembed=1&vtest=1`, { waitUntil: 'load' }); await page.waitForTimeout(1800);
  if (net.length) bad('bản đồ chặng đã tải video/manifest trước khi mở bước: ' + net.slice(0, 3).join(', '));
  // 2) bấm Bắt đầu → bước đầu = video nhúng
  await page.evaluate(() => { const b = document.querySelector('.lsn-start, .ux1-go, a[href*="#/lesson/go"]'); if (b) b.click(); else location.hash = '#/lesson/go?demo=1&lvembed=1&vtest=1'; });
  const v = page.locator('#lsnVid video'); await v.waitFor({ timeout: 15000 }).catch(() => bad('bước video không hiện'));
  if (!await page.$('#lsnVid video')) { await ctx.close(); return; }
  const st = await page.evaluate(() => { const x = document.querySelector('#lsnVid video'); return { step: App._lsn && App._lsn.sess.cur && App._lsn.sess.cur.type, fmt: LessonVideo.fmt, src: x.querySelector('source').src, poster: x.poster, tracks: [...x.querySelectorAll('track')].map(t => `${t.kind}:${t.srclang}`).join(','), go: !!document.getElementById('lsnGo'), bub: document.getElementById('lsnBub').textContent }; });
  if (st.step !== 'video') bad('bước hiện tại không phải video: ' + st.step);
  if (st.fmt !== want || !st.src.endsWith(`/${want}.mp4`)) bad(`sai bản: ${st.fmt} ${st.src} (cần ${want})`);
  if (!/\.poster\.jpg$/.test(st.poster)) bad('thiếu bìa JPG: ' + st.poster);
  if (st.tracks !== 'captions:en,chapters:en') bad('track: ' + st.tracks);
  if (!st.go) bad('thiếu nút Tiếp tục của bài');
  if (!st.bub || /Xem video bài học/.test(st.bub) && lang !== 'vi') bad('nhãn bước chưa dịch: ' + st.bub);
  await page.waitForFunction(() => { const n = document.querySelector('.lv-chs'); return n && !n.hidden && n.querySelectorAll('.lv-ch').length >= 1; }, null, { timeout: 8000 }).catch(() => bad('không có nút chương'));
  await page.waitForFunction(() => { const x = document.querySelector('#lsnVid video'); return x && x.readyState >= 1; }, null, { timeout: 10000 }).catch(() => bad('video không nạp được metadata'));
  await page.waitForTimeout(400); await check('lesson-video');
  // 3) phát (tắt tiếng – không có cử chỉ người dùng) → phụ đề EN đang hiện, có cue
  await v.evaluate(x => { x.muted = true; return x.play(); }).catch(e => bad('play: ' + e.message));
  await page.waitForFunction(() => { const x = document.querySelector('#lsnVid video'); return x && x.currentTime > 1.2; }, null, { timeout: 15000 }).catch(() => bad('video không chạy'));
  const cap = await v.evaluate(x => [...x.textTracks].map(t => `${t.kind}:${t.mode}:${t.cues ? t.cues.length : 0}`).join(','));
  if (!/^captions:showing:[1-9]/.test(cap)) bad('phụ đề EN không hiện: ' + cap);
  await check('lesson-video-playing');
  // 4) nút chương cuối → tua đúng mốc + đánh dấu đang xem
  const ch = await page.evaluate(async () => { const bs = [...document.querySelectorAll('.lv-ch')], b = bs[bs.length - 1]; b.click(); await new Promise(r => setTimeout(r, 700)); const x = document.querySelector('#lsnVid video'); return { t: x.currentTime, n: bs.length, cur: b.getAttribute('aria-current'), label: b.textContent }; });
  if (ch.cur !== 'true') bad(`chương cuối không được đánh dấu (t=${ch.t.toFixed(2)} ${ch.label})`);
  // 5) hết video (end card "Next step →") → bài tự bấm nút Tiếp tục → sang bước kế
  await v.evaluate(x => { x.currentTime = Math.max(0, x.duration - 0.4); return x.play(); }).catch(() => {});
  await page.waitForFunction(() => App._lsn && App._lsn.sess.cur && App._lsn.sess.cur.type !== 'video' && !document.querySelector('#lsnVid'), null, { timeout: 10000 }).catch(() => bad('hết video nhưng bài không sang bước kế'));
  await check('lesson-after-video');
  const nAfter = net.filter(u => /media\.lexkite\.com/.test(u)).length; if (!nAfter) bad('không có yêu cầu media nào (fixture không được dùng?)');
  console.log(`· ${tag}: ${st.fmt} · ${ch.n} chương · ${cap}`);
  await ctx.close();
}
for (const [w, sc, lang] of CONFIGS) await run(w, sc, lang).catch(e => errs.push(`${w}-${sc}-${lang}: ${e.message}`));
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ found, errs, seen }, null, 1));
for (const [k, v] of Object.entries(found)) { console.log(`\n✗ ${k}: ${v.length}`); for (const x of v.slice(0, 40)) console.log('  ' + x); }
if (seen.length < CONFIGS.length * 3) errs.push(`quá ít màn được quét (${seen.length})`);
if (Object.keys(found).length || errs.length) { console.log('\n✗ lesson-embed:', JSON.stringify(errs.slice(0, 20))); process.exit(1); }
console.log(`✓ lesson-embed: ${seen.length} màn × ${CONFIGS.length} cấu hình – 0 tải trước khi mở bước, đúng bản 4:5/16:9, bìa, phụ đề EN + chương, hết video → bước kế`);
