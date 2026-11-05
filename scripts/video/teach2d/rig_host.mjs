#!/usr/bin/env node
// Teach2D host = TeacherRig (docs/specs/video-production-v2.md §1): the 2D teacher drawn frame by frame by web/js/teacher-rig.js through its PUBLIC
// API (mount / speak / setEmotion / gesture / state), mouth = Rhubarb visemes of the episode's own voice. Replaces the registry talk/listen loop.
//   node scripts/video/teach2d/rig_host.mjs --geom-only <who> <out_dir>          static geom.json (before build.py; react pose from $E)   [CI only]
//   node scripts/video/teach2d/rig_host.mjs <timeline.json> <vo dir> <out_dir>   rig.webm + rig.frames.json + geom.json (after build.py)  [CI only]
//   node scripts/video/teach2d/rig_host.mjs --simulate <timeline.json> <vo dir> <out_dir>   core-only plan + frames (no browser, light – tests)
// Render: Playwright Chromium, page.clock installed BEFORE load, requestAnimationFrame replaced by a manual pump (the rig's frame() runs once per
// video frame at the exact sample time = middle of the frame), canvas 1108×960 css px, dpr 1, transparent → PNG → VP9 yuva420p CRF 12.
// Checks (exit 1): page state == core simulation on every frame (proves speak() with audio=null runs on the faked performance.now/setTimeout),
// re-render of 30 + 30 frames gives byte-identical PNGs (deterministic), rendered alpha bbox inside the static geom used by build.py, frame count.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { spawn, execFileSync } from 'node:child_process';
import { ROOT, CORE, plan, simulate, sampleMs, stateOf, geomPoses, BASE } from './rig_plan.mjs';
const args = process.argv.slice(2), W = 1108, H = 960;
const mode = args[0] === '--geom-only' ? 'geom' : args[0] === '--simulate' ? 'sim' : 'render', A = mode === 'render' ? args : args.slice(1);
if (mode !== 'sim' && !process.env.CI) { console.error('rig_host.mjs: CI only (docs/METHODS.md §4 – no heavy video work on the Mac); --simulate runs anywhere'); process.exit(2); }
const REG = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/teach/characters.json'), 'utf8'));
const die = m => { console.error('rig_host: ' + m); process.exit(1); };
const sha = b => crypto.createHash('sha256').update(b).digest('hex').slice(0, 16);

if (mode === 'sim') {   // light: plan + core frames (what the page must reproduce)
  const [tl, vo, out] = A; fs.mkdirSync(out, { recursive: true });
  const T = JSON.parse(fs.readFileSync(tl, 'utf8')), P = plan(T, vo), frames = simulate(P);
  if (P.errors.length) die(P.errors.join('; '));
  fs.writeFileSync(path.join(out, 'rig.frames.json'), JSON.stringify({ ...P, base: BASE, sample: 'mid', src: 'core', frames: frames.map((s, f) => ({ f, ...s })) }));
  console.log(`rig_host --simulate: ${P.nf} frames, ${P.blocks.length} speak blocks, ${P.events.filter(e => e.kind === 'gesture').length} gestures`);
  process.exit(0);
}

const { chromium } = await import('playwright');
const ROOTW = path.join(ROOT, 'web'), TYPES = { js: 'text/javascript', json: 'application/json', webp: 'image/webp', png: 'image/png', html: 'text/html', css: 'text/css' };
const PAGE = who => `<!doctype html><meta charset=utf-8><body style="margin:0;background:transparent"><div id=t style="width:${W}px"></div>
<script>window.__raf=[];window.requestAnimationFrame=cb=>(window.__raf.push(cb),window.__raf.length);window.cancelAnimationFrame=()=>{};</script>
<script src="js/characters.js"></script><script src="js/teacher-rig.js"></script>
<script>window.rig=${who ? `TeacherRig.mount(document.getElementById('t'),'${who}')` : 'null'};</script>`;
const browser = await chromium.launch({ args: ['--disable-gpu', '--force-color-profile=srgb', '--disable-lcd-text'] });
const sleep = t => new Promise(r => setTimeout(r, t));
async function open(who) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, reducedMotion: 'no-preference' }), miss = [];
  await ctx.route('**/*', r => {
    const u = new URL(r.request().url()); if (u.pathname === '/rig.html') return r.fulfill({ body: PAGE(who), contentType: 'text/html' });
    const f = path.join(ROOTW, decodeURIComponent(u.pathname)); if (!f.startsWith(ROOTW) || !fs.existsSync(f)) { miss.push(u.pathname); return r.fulfill({ status: 404, body: '' }); }
    r.fulfill({ body: fs.readFileSync(f), contentType: TYPES[path.extname(f).slice(1)] || 'application/octet-stream' });
  });
  const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await page.clock.install({ time: 0 });   // BEFORE the page loads: Date / performance.now / setTimeout are fake from the first script on
  await page.goto('http://lk.test/rig.html');
  if (who) {
    let st = 0; for (let i = 0; i < 600 && !st; i++) { st = await page.evaluate(() => (window.rig.stats.ready ? 1 : window.rig.stats.failed ? -1 : 0)); if (!st) await sleep(50); }
    if (st !== 1) die(`TeacherRig did not mount (${st}) – missing: ${miss.join(' ')} ${errs.join(' | ')}`);
  }
  await page.clock.pauseAt(BASE);
  const base = await page.evaluate(() => performance.now());
  return { ctx, page, errs, miss, base };
}

/** Static geometry (same schema as host.py geom.json): alpha union of the bare head + every pose still the render may show, under every
 *  rig transform inside TeacherRig.core.LIMITS (tilt −6..6° in 5 steps, nod/sway/breath at both limits) – conservative, so the layout built
 *  from it holds for every rendered frame. Head = top 34 % of the figure, columns of the bare head, widened 8 % (host.py). */
async function geom(who, reactClip) {
  if (!REG.people[who]) die(`${who} is not in web/teach/characters.json`);
  const poses = geomPoses(reactClip), { ctx, page, errs, miss } = await open(null);
  const g = await page.evaluate(async ({ who, poses, L, W, H }) => {
    await TeacherRig.load();
    const ld = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
    const head = await ld(Chars.head(who, true)), stills = await Promise.all(poses.map(p => ld(Chars.still(who, p))));
    if (!head || stills.some(x => !x)) return { err: 'missing image' };
    const cv = new OffscreenCanvas(W, H), x = cv.getContext('2d', { willReadFrequently: true }), all = new Uint8Array(W * H), hd = new Uint8Array(W * H), pivot = LipFace.RIG[who].pivot;
    let am = 0;
    for (const tilt of [-L.tilt, -L.tilt / 2, 0, L.tilt / 2, L.tilt]) for (const nod of [-L.nod, L.nod]) for (const sway of [-L.sway, L.sway]) for (const breath of [-L.breath, L.breath])
      for (const im of [head, ...stills]) {
        const X = TeacherRig.core.matrix({ pivot, tilt, nod, sway, breath });
        x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H); x.setTransform(...X); x.drawImage(im, 0, 0, W, H);
        const d = x.getImageData(0, 0, W, H).data; for (let i = 0; i < W * H; i++) if (d[i * 4 + 3] > 128) { all[i] = 1; if (im === head) hd[i] = 1; }
      }
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H); x.drawImage(head, 0, 0, W, H); { const d = x.getImageData(0, 0, W, H).data; for (let i = 0; i < W * H; i++) am += d[i * 4 + 3] > 128 ? 1 : 0; }
    let x0 = W, y0 = H, x1 = 0, y1 = 0; for (let i = 0; i < W * H; i++) if (all[i]) { const px = i % W, py = (i - px) / W; x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px + 1); y1 = Math.max(y1, py + 1); }
    const fh = y1 - y0, hy1 = y0 + 0.34 * fh; let hx0 = W, hx1 = 0;
    for (let py = y0; py < Math.floor(hy1); py++) for (let px = 0; px < W; px++) if (hd[py * W + px]) { hx0 = Math.min(hx0, px); hx1 = Math.max(hx1, px); }
    const pad = 0.08 * (hx1 - hx0);
    return { bbox: [x0, y0, x1, y1], head: [Math.trunc(hx0 - pad), y0, Math.trunc(hx1 + pad), Math.trunc(hy1)], alpha_mean: Math.round(am / (W * H) * 1e4) / 1e4 };
  }, { who, poses, L: CORE.LIMITS, W, H });
  await ctx.close();
  if (g.err || errs.length) die(`geom: ${g.err || ''} ${errs.join(' | ')} missing: ${miss.join(' ')}`);
  return { clips: { rig: { pose: 'rig', frames: 0, fps: 30, src: 'rig', sha: null, bbox: g.bbox, alpha_mean: g.alpha_mean, poses } }, bank: 'rig', pose: reactClip || null,
    w: W, h: H, bbox: g.bbox, head: g.head, who, voice: REG.people[who].voice.video, rig: { limits: CORE.LIMITS, poses } };
}

if (mode === 'geom') {
  const [who, out] = A; fs.mkdirSync(out, { recursive: true });
  const E = process.env.E && fs.existsSync(process.env.E) ? JSON.parse(fs.readFileSync(process.env.E, 'utf8')) : null;
  const G = await geom(who, E && E.pose ? E.pose.clip : null);
  fs.writeFileSync(path.join(out, 'geom.json'), JSON.stringify(G, null, 1)); console.log(JSON.stringify(G));
  await browser.close(); process.exit(0);
}

// ---------------- render ----------------
const [tl, vo, out] = A; fs.mkdirSync(out, { recursive: true });
const T = JSON.parse(fs.readFileSync(tl, 'utf8')), P = plan(T, vo), who = P.who;
if (P.errors.length) die(P.errors.join('; '));
const gf = path.join(out, 'geom.json'), G = fs.existsSync(gf) ? JSON.parse(fs.readFileSync(gf, 'utf8')) : await geom(who, T.pose && T.pose.clip);
if (G.who !== who || !G.clips.rig) die(`geom.json is for ${G.who} / ${Object.keys(G.clips)} – run --geom-only ${who} first`);
const lost = P.poses.filter(p => !G.rig.poses.includes(p)); if (lost.length) die(`poses ${lost} are not in the static geom (${G.rig.poses})`);

/** Drive one page through frames [0, upto): events at their exact ms (page.clock.runFor), pump the rig's frame() at each sample time;
 *  for frames where capture(f): sink(f, { png, bbox, size }) (PNG streamed, never all kept in memory). Returns per-frame state. */
async function run(upto, capture, sink) {
  const R = await open(who), { page } = R; let cur = R.base, k = 0, lastDraws = -1, last = null, prevCap = false; const loaded = new Set(), st = [];
  const ev = P.events.map(e => ({ ...e, at: R.base + Math.floor(e.t * 1000 + 0.5) }));
  const to = async t => { if (t > cur) { await page.clock.runFor(t - cur); cur = t; } };
  const PUMP = cap => page.evaluate(cap => {
    const cbs = window.__raf.splice(0), now = performance.now(); for (const cb of cbs) cb(now);
    const s = rig.state(), o = { now, draws: rig.stats.draws, st: { shape: s.shape, pose: s.pose, poseW: s.poseW, emo: s.emo, talking: s.talking } };
    if (cap && cap.draws !== o.draws) {
      const cv = document.querySelector('.trig-cv'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, w = cv.width; let x0 = w, y0 = cv.height, x1 = 0, y1 = 0;
      for (let i = 3, p = 0; i < d.length; i += 4, p++) if (d[i] > 128) { const x = p % w, y = (p - x) / w; if (x < x0) x0 = x; if (x >= x1) x1 = x + 1; if (y < y0) y0 = y; if (y >= y1) y1 = y + 1; }
      o.png = cv.toDataURL('image/png'); o.bbox = [x0, y0, x1, y1]; o.size = [cv.width, cv.height];
    }
    return o;
  }, cap);
  for (let f = 0; f < upto; f++) {
    const ts = R.base + sampleMs(f, P.fps);
    while (k < ev.length && ev[k].at <= ts) {
      const e = ev[k++]; await to(e.at);
      if (e.kind === 'speak') await page.evaluate(async e => { rig.speak(null, e.cues, { dur: e.dur, text: e.text }); for (let i = 0; i < 3; i++) await Promise.resolve(); }, e);
      else if (e.kind === 'emo') await page.evaluate(n => rig.setEmotion(n), e.name);
      else await page.evaluate(n => rig.gesture(n), e.name);
    }
    await to(ts);
    const cap = capture(f); let o = await PUMP(cap ? { draws: prevCap ? lastDraws : -1 } : null);
    if (Math.abs(o.now - ts) > 0.01) die(`frame ${f}: page clock ${o.now} != ${ts} (performance.now is not the faked clock)`);
    if (o.st.pose && !loaded.has(o.st.pose)) {   // first frame of a pose: wait (real time) until the rig's lazy still has loaded, redraw at the same instant
      const d0 = o.draws; let t0 = Date.now();
      while (o.draws === d0) { if (Date.now() - t0 > 15000) die(`pose still ${o.st.pose} did not load`); await sleep(25); o = await PUMP(cap ? { draws: -1 } : null); }
      loaded.add(o.st.pose);
    }
    if (cap) { if (o.png) last = { png: Buffer.from(o.png.split(',')[1], 'base64'), bbox: o.bbox, size: o.size }; await sink(f, last); }
    prevCap = !!cap; lastDraws = o.draws; st.push(stateOf(o.st));
  }
  if (R.errs.length || R.miss.length) die(`page errors: ${R.errs.slice(0, 3).join(' | ')} missing: ${R.miss.join(' ')}`);
  const base = R.base; await R.ctx.close(); return { st, base };
}

// main render: every frame → ffmpeg (PNG pipe → VP9 alpha)
const webm = path.join(out, 'rig.webm');
const ff = spawn('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(P.fps), '-c:v', 'png', '-i', '-', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p',
  '-crf', '12', '-b:v', '0', '-auto-alt-ref', '0', '-row-mt', '1', '-an', webm], { stdio: ['pipe', 'inherit', 'inherit'] });
const ffDone = new Promise((ok, no) => ff.on('close', c => (c ? no(new Error('ffmpeg ' + c)) : ok())));
const hash = crypto.createHash('sha256'), bb = [W, H, 0, 0]; const shaOf = new Map();
const main = await run(P.nf, () => true, async (f, fr) => {
  if (!fr) die(`frame ${f} not captured`);
  if (fr.size[0] !== W || fr.size[1] !== H) die(`canvas ${fr.size} != ${W}×${H}`);
  hash.update(fr.png); shaOf.set(f, sha(fr.png));
  if (fr.bbox[2] > fr.bbox[0]) { bb[0] = Math.min(bb[0], fr.bbox[0]); bb[1] = Math.min(bb[1], fr.bbox[1]); bb[2] = Math.max(bb[2], fr.bbox[2]); bb[3] = Math.max(bb[3], fr.bbox[3]); }
  if (!ff.stdin.write(fr.png)) await new Promise(r => ff.stdin.once('drain', r));
});
if (shaOf.size !== P.nf) die(`${shaOf.size} frames captured, timeline needs ${P.nf}`);
ff.stdin.end(); await ffDone;
const nb = +execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v', '-count_frames', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', webm]).toString().trim();
if (nb !== P.nf) die(`rig.webm has ${nb} frames, timeline needs ${P.nf}`);

// page == core simulation, frame by frame (shape, pose, pose weight, emotion, talking)
const sim = simulate(P, { base: main.base }), bad = [];
main.st.forEach((s, f) => { const c = sim[f]; if (s.shape !== c.shape || s.pose !== c.pose || Math.abs(s.poseW - c.poseW) > 0.002 || s.emo !== c.emo || s.talking !== c.talking) bad.push({ f, page: s, core: c }); });
if (bad.length) die(`page state != core simulation on ${bad.length} frames, first ${JSON.stringify(bad[0])}`);
// determinism: a fresh page re-renders frames 0..29 and the 30 frames from the first pose (or the middle) – byte-identical PNGs
const fp = main.st.findIndex(s => s.poseW > 0), w2 = Math.max(30, Math.min(P.nf - 30, fp > 0 ? fp : P.nf >> 1)), want = f => f < 30 || (f >= w2 && f < w2 + 30);
const diff = []; let nAgain = 0;
await run(Math.min(P.nf, w2 + 30), want, async (f, fr) => { nAgain++; if (!fr || sha(fr.png) !== shaOf.get(f)) diff.push(f); });
if (diff.length || nAgain < Math.min(60, P.nf)) die(`not deterministic: ${diff.length}/${nAgain} re-rendered frames differ (first ${diff[0]})`);
await browser.close();
// rendered alpha must stay inside the static geom build.py laid out with
if (bb[0] < G.bbox[0] - 1 || bb[1] < G.bbox[1] - 1 || bb[2] > G.bbox[2] + 1 || bb[3] > G.bbox[3] + 1) die(`rendered bbox ${bb} leaves the static geom ${G.bbox}`);
const S = hash.digest('hex').slice(0, 16);
G.clips.rig = { ...G.clips.rig, frames: P.nf, fps: P.fps, sha: S, bbox_rendered: bb };
fs.writeFileSync(gf, JSON.stringify(G, null, 1));
fs.writeFileSync(path.join(out, 'rig.frames.json'), JSON.stringify({ who, fps: P.fps, nf: P.nf, total: P.total, base: main.base, sample: 'mid', src: 'page', sha: S,
  track: P.track, blocks: P.blocks, events: P.events, poses: P.poses, determinism: { frames: nAgain, from: [0, w2] }, sim_mismatch: 0,
  frames: main.st.map((s, f) => ({ f, ...s })) }));
console.log(`rig_host: ${P.nf} frames (${(P.nf / P.fps).toFixed(1)} s), ${P.blocks.length} speak blocks, ${P.events.filter(e => e.kind === 'gesture').length} gestures, page == core, ` +
  `${nAgain} frames re-rendered identical, bbox ${bb} ⊂ ${G.bbox}, sha ${S}`);
