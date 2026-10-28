// 🎭 Quay màn hình con rối 2D trên CI (Playwright, .github/workflows/puppet.yml): (1) phòng thử docs/mocks/teacher-pilot/puppet.html – Ama lớn, bấm lần lượt
// greet/explain/point/question/correct/wrong; (2) bài học thật #/lesson/go?demo=1&puppet=1 – trả lời sai (phản ứng thật) rồi khen. Đo fps rAF + long task.
// Cần: máy chủ tĩnh gốc repo ở :8081 (app ở /web/app/ → dùng :8080 = web/). Ra: <out>/{lab.webm, app.webm, shots/*.png, perf.json}
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT = process.argv[2] || 'out/puppet-rec';
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const sleep = ms => new Promise(r => setTimeout(r, ms));
const perf = {};
const fpsProbe = () => new Promise(r => { let n = 0, lt = 0; const t0 = performance.now(); try { new PerformanceObserver(l => { lt += l.getEntries().length; }).observe({ type: 'longtask', buffered: false }); } catch (e) { /* bỏ qua */ }
  (function f() { n++; if (performance.now() - t0 < 4000) requestAnimationFrame(f); else r({ fps: +(n / ((performance.now() - t0) / 1000)).toFixed(1), longTasks: lt }); })(); });

async function rec(name, size, url, run) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, recordVideo: { dir: path.join(OUT, 'raw-' + name), size }, reducedMotion: 'no-preference' });
  await ctx.addInitScript(() => { try { localStorage.setItem('lk.puppet', '1'); localStorage.setItem('lk.onb', '1'); } catch (e) { /* riêng tư */ } });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e.message)));
  await page.goto(url, { waitUntil: 'load' }); await sleep(1200);
  await run(page);
  perf[name] = { ...(await page.evaluate(fpsProbe)), errors: errs };
  const v = page.video(); await ctx.close(); fs.renameSync(await v.path(), path.join(OUT, name + '.webm'));
}

await rec('lab', { width: 760, height: 960 }, 'http://localhost:8081/docs/mocks/teacher-pilot/puppet.html', async page => {
  await page.addStyleTag({ content: '#live{width:440px!important} main{padding-top:8px}' });
  await sleep(1500);
  for (const k of ['greet', 'explain', 'point', 'question', 'correct', 'wrong']) {
    await page.click(`button.k:text-is("${k}")`); await sleep(500); await page.screenshot({ path: path.join(OUT, 'shots', `lab-${k}.png`), clip: { x: 16, y: 40, width: 440, height: 587 } }); await sleep(2400);
  }
});

await rec('app', { width: 430, height: 932 }, 'http://localhost:8080/app/#/lesson/go?demo=1&puppet=1', async page => {
  await page.waitForSelector('#lsnTch svg', { timeout: 15000 }).catch(() => {});
  await sleep(2500); await page.screenshot({ path: path.join(OUT, 'shots', 'app-prompt.png') });
  const tiles = await page.$$('#lsnBank .lsn-tile');
  for (const t of tiles.slice(0, 3).reverse()) { await t.click().catch(() => {}); await sleep(250); }
  const chk = await page.$('#lsnCheck:not([disabled])'); if (chk) { await chk.click(); await sleep(700); await page.screenshot({ path: path.join(OUT, 'shots', 'app-react.png') }); }
  await sleep(2500);
  await page.evaluate(() => { const T = window.LessonTeacher && LessonTeacher.last; if (T) T.say('Yes! That is correct. Great job!', { rate: 1, kind: 'correct' }); });
  await sleep(600); await page.screenshot({ path: path.join(OUT, 'shots', 'app-correct.png') }); await sleep(2600);
  perf.appTeacher = await page.evaluate(() => { const s = document.querySelector('#lsnTch svg'); const r = s && s.getBoundingClientRect(); return { puppet: !!s, w: r && r.width, h: r && r.height, js: performance.getEntriesByType('resource').filter(e => /puppet\.js/.test(e.name)).map(e => ({ kb: +(e.encodedBodySize / 1024).toFixed(1) })) }; });
});

// giảm chuyển động: chỉ miệng + chớp mắt, không lắc/cử chỉ
{
  const ctx = await browser.newContext({ viewport: { width: 760, height: 960 }, reducedMotion: 'reduce' }); const page = await ctx.newPage();
  await page.goto('http://localhost:8081/docs/mocks/teacher-pilot/puppet.html'); await sleep(500);
  perf.reduced = await page.evaluate(async () => { const L = window.PUPPET_LIVE, a = document.querySelector('#live .phead').getAttribute('transform'); L.cue('correct'); await new Promise(r => setTimeout(r, 900)); return { still: a === document.querySelector('#live .phead').getAttribute('transform') }; });
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'perf.json'), JSON.stringify(perf, null, 1));
console.log(JSON.stringify(perf));
const bad = Object.entries(perf).filter(([, v]) => v && v.errors && v.errors.length);
if (bad.length) { console.error('❌ lỗi JS: ' + JSON.stringify(bad)); process.exit(1); }
