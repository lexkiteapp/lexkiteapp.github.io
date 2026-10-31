// Lip-sync lab trên CI (lipsync-lab.yml): giọng Kokoro + Rhubarb → web/lab/lipsync/lines.json; Chromium (CPU chậm 4× ≈ điện thoại tầm trung) phát thật + đo; dựng video ≤ 20 s.
// Đo: lệch lịch vẽ (pre), lệch tiếng–miệng của video (tương quan chéo độ mở miệng ↔ năng lượng tiếng), live so với Rhubarb, fps, số lần nháy (< MIN_HOLD).
// Cần: KOKORO_NODE_PATH (kokoro-js), RHUBARB, ffmpeg, playwright. Ra: qa/lipsync/{report.md, metrics.json, lipsync.mp4, lipsync.gif, harvest-*.jpg}
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { execFileSync } from 'node:child_process'; import { createRequire } from 'node:module';
const req = createRequire(import.meta.url), LS = req('../../web/js/call/lipsync.js');
const OUT = 'web/lab/lipsync', QA = 'qa/lipsync'; fs.mkdirSync(`${OUT}/audio`, { recursive: true }); fs.mkdirSync(`${QA}/frames`, { recursive: true });
const sh = (c, a) => execFileSync(c, a, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const chars = JSON.parse(fs.readFileSync('web/teach/characters.json', 'utf8')).people;
// 5 câu mẫu / giáo viên (lấy kiểu lời thoại Call: chào, hỏi, khen, sửa, giải thích) + cảm xúc → tư thế 2D sẵn có
const LINES = [
  ['ama', 'happy', 'Hi! I am Ama. How was your weekend?'],
  ['ama', 'explain', 'We say "I went", not "I goed". Try it with me.'],
  ['ama', 'encourage', 'Nice work! Your vowels sound much clearer now.'],
  ['ama', 'thinking', 'Hmm, what would you order at a busy cafe?'],
  ['ama', 'cheer', 'Brilliant! Five perfect answers in a row.'],
  ['carlos', 'happy', 'Hey, I am Carlos. Ready for a quick chat?'],
  ['carlos', 'explain', 'Listen: photograph, photographer. The stress moves.'],
  ['carlos', 'encourage', 'Good try! Say it once more, a little slower.'],
  ['carlos', 'thinking', 'So, why do you want to work abroad?'],
  ['carlos', 'cheer', 'Fantastic! That was a very natural answer.']];

// PCM wav → RMS 100 Hz
const rms100 = f => { const b = fs.readFileSync(f); let o = 12; while (b.toString('ascii', o, o + 4) !== 'data') o += 8 + b.readUInt32LE(o + 4);
  const n = b.readUInt32LE(o + 4) / 2, s = o + 8, hop = 240, R = []; for (let i = 0; i + hop <= n; i += hop) { let e = 0; for (let j = 0; j < hop; j++) { const x = b.readInt16LE(s + 2 * (i + j)) / 32768; e += x * x; } R.push(Math.sqrt(e / hop)); } return R; };
const OPEN = { X: 0, A: 0, B: .35, C: .7, D: 1, E: .55, F: .3, G: .25, H: .6 };
const open100 = (cues, n) => Array.from({ length: n }, (_, k) => { const s = LS.stateAt(cues, k / 100); return OPEN[s.a] * (1 - s.k) + OPEN[s.b] * s.k; });
const xlag = (a, b) => { const m = v => { const u = v.reduce((x, y) => x + y, 0) / v.length; return v.map(x => x - u); }; a = m(a); b = m(b); let best = -1e9, L = 0;
  for (let l = -30; l <= 30; l++) { let s = 0; for (let i = 0; i < a.length; i++) { const j = i - l; if (j >= 0 && j < b.length) s += a[i] * b[j]; } if (s > best) { best = s; L = l; } } return L * 10; }; // ms, + = miệng trễ hơn tiếng
const pct = (v, p) => { const s = [...v].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };

// 1) Giọng + mốc Rhubarb (có văn bản lời thoại → nhận dạng chính xác hơn)
const np = process.env.KOKORO_NODE_PATH; const { KokoroTTS } = createRequire(np + '/')('kokoro-js');
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
const lines = [];
for (const [i, [who, emo, text]] of LINES.entries()) {
  const id = `${who}-${i}`, raw = `${QA}/${id}.raw.wav`, wav = `${QA}/${id}.wav`, voice = chars[who].voice.app;
  const a = await tts.generate(text.replace(/["“”]/g, ''), { voice, speed: 1 }); await a.save(raw);
  sh('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-af', 'loudnorm=I=-16:TP=-1.5', '-ar', '24000', '-ac', '1', wav]);
  sh('ffmpeg', ['-y', '-v', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '64k', `${OUT}/audio/${id}.mp3`]);
  fs.writeFileSync(`${QA}/${id}.txt`, text);
  const rh = JSON.parse(sh(process.env.RHUBARB || 'rhubarb', ['-f', 'json', '-q', '-d', `${QA}/${id}.txt`, '--extendedShapes', 'GHX', wav]));
  const dur = rh.metadata.duration, raw0 = rh.mouthCues;
    // mốc Rhubarb → neo mép im/mở vào lúc tiếng bắt đầu/tắt (LS.align) → chống nháy; giữ lệch của mốc thô để so
  const env = rms100(wav), cues = LS.smooth(LS.align(raw0, env)), rawLag = xlag(open100(LS.smooth(raw0), env.length), env);
  lines.push({ id, who, emo, text, voice, dur, mp3: `audio/${id}.mp3`, cues, rawLagMs: rawLag, rawFlicker: raw0.filter(c => c.end - c.start < LS.MIN_HOLD).length });
}
fs.writeFileSync(`${OUT}/lines.json`, JSON.stringify(lines));
fs.copyFileSync('content/lexicon/cmudict-subset.txt', `${OUT}/cmudict.txt`);

// 2) Chromium: phục vụ web/, phát thật (CPU 4×) + dựng khung
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.txt': 'text/plain' };
const srv = http.createServer((q, r) => { const f = path.join('web', decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith('web') || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(8123);
const { chromium } = req(process.cwd() + '/node_modules/playwright');
const br = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const pg = await br.newPage({ viewport: { width: 900, height: 900 } });
await pg.goto('http://localhost:8123/lab/lipsync.html?lab=1'); await pg.waitForFunction(() => window.lab && window.lab.ready);
const cdp = await pg.context().newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const RT = [];
for (const [i, l] of lines.entries()) for (const mode of ['pre', 'live']) {
  const r = await pg.evaluate(([i, mode, ms]) => Promise.race([window.lab.say(i, mode), new Promise(z => setTimeout(() => z({ timeout: 1 }), ms))]), [i, mode, (l.dur + 6) * 1000]);
  RT.push({ ...r, id: l.id });
}
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

// 3) Số đo
const M = { lines: [], gates: {} };
for (const [i, l] of lines.entries()) {
  const pre = RT.find(r => r.id === l.id && r.mode === 'pre'), lv = RT.find(r => r.id === l.id && r.mode === 'live');
  const sched = (pre && pre.sw || []).map(([t, v]) => { const c = l.cues.filter(c => c.value === v).map(c => t - (c.start - LS.LEAD)).filter(d => d > -0.02); return c.length ? Math.min(...c) * 1000 : null; }).filter(x => x != null);
  const env = rms100(`${QA}/${l.id}.wav`), lag = xlag(open100(l.cues, env.length), env);
  let liveB = [], agree = null, liveFlick = null;
  if (lv && lv.cues) { const st = lv.cues.slice(1).map(c => c.start); liveB = l.cues.slice(1).map(c => Math.min(...st.map(s => Math.abs(s - c.start))) * 1000).filter(isFinite);
    const cl = v => (v === 'X' || v === 'A' ? 0 : 1); let ok = 0, n = 0; for (let t = 0; t < l.dur; t += 0.01) { n++; if (cl(LS.stateAt(l.cues, t).b) === cl(LS.stateAt(lv.cues, t).b)) ok++; } agree = Math.round(100 * ok / n);
    liveFlick = lv.cues.filter((c, k) => k > 0 && k < lv.cues.length - 1 && c.end - c.start < LS.MIN_HOLD - 0.005).length; }
  M.lines.push({ id: l.id, emo: l.emo, dur: l.dur, cues: l.cues.length, avLagMs: lag, avLagRawMs: l.rawLagMs, schedMeanMs: Math.round(sched.reduce((a, b) => a + b, 0) / (sched.length || 1)), schedP95Ms: Math.round(pct(sched, 0.95)),
    fps: pre && pre.fps, longFrames: pre && pre.long, worstMs: pre && pre.worstMs, preFlicker: l.cues.filter(c => c.end - c.start < LS.MIN_HOLD - 0.005).length, rawFlicker: l.rawFlicker,
    liveBoundaryMedMs: Math.round(pct(liveB, 0.5)), liveBoundaryP90Ms: Math.round(pct(liveB, 0.9)), liveOpenAgreePct: agree, liveFlicker: liveFlick, liveFps: lv && lv.fps, timeout: !!(pre && pre.timeout) });
}
const all = k => M.lines.map(x => x[k]).filter(x => x != null);
M.summary = { avLagMsMaxAbs: Math.max(...all('avLagMs').map(Math.abs)), schedP95Ms: Math.max(...all('schedP95Ms')), fpsMin: Math.min(...all('fps')), longFrames: all('longFrames').reduce((a, b) => a + b, 0),
  preFlicker: all('preFlicker').reduce((a, b) => a + b, 0), liveBoundaryMedMs: Math.round(pct(all('liveBoundaryMedMs'), 0.5)), liveOpenAgreePct: Math.round(all('liveOpenAgreePct').reduce((a, b) => a + b, 0) / (all('liveOpenAgreePct').length || 1)) };
const S = M.summary;
M.gates = { av_lag_le_45ms: S.avLagMsMaxAbs <= 45, sched_p95_le_40ms: S.schedP95Ms <= 40, fps_ge_50_cpu4x: S.fpsMin >= 50, no_flicker_pre: S.preFlicker === 0, live_open_agree_ge_75: S.liveOpenAgreePct >= 75 };

// 4) Video ≤ 20 s: vẽ tĩnh từng khung (cùng hàm stateAt với phát thật) + ghép tiếng
const rp = await br.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });
await rp.goto('http://localhost:8123/lab/lipsync.html?lab=1&render=1'); await rp.waitForFunction(() => window.lab && window.lab.ready);
const pick = [0, 5, 1, 6, 2, 7, 3, 8].map(i => lines[i]); let tot = 0; const segs = [];
for (const l of pick) { if (tot + l.dur + 0.3 > 19.5) continue; tot += l.dur + 0.3; segs.push(l); }
let fn = 0; const FPS = 24; const parts = [];
for (const l of segs) {
  const i = lines.indexOf(l), card = rp.locator(`#ls-${l.who}`).locator('xpath=..'), n = Math.ceil((l.dur + 0.3) * FPS), d = `${QA}/frames/${l.id}`; fs.mkdirSync(d, { recursive: true });
  for (let k = 0; k < n; k++) { await rp.evaluate(([i, t]) => window.lab.frame(i, t), [i, k / FPS]); await card.screenshot({ path: `${d}/${String(k).padStart(4, '0')}.png` }); fn++; }
  sh('ffmpeg', ['-y', '-v', 'error', '-framerate', String(FPS), '-i', `${d}/%04d.png`, '-i', `${QA}/${l.id}.wav`, '-af', 'apad', '-t', String(n / FPS), '-vf', 'scale=480:-2,format=yuv420p', '-c:v', 'libx264', '-crf', '20', '-c:a', 'aac', '-ar', '48000', `${QA}/${l.id}.mp4`]);
  parts.push(`file '${path.resolve(QA, l.id + '.mp4')}'`);
}
fs.writeFileSync(`${QA}/list.txt`, parts.join('\n'));
sh('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', `${QA}/list.txt`, '-c', 'copy', `${QA}/lipsync.mp4`]);
sh('ffmpeg', ['-y', '-v', 'error', '-i', `${QA}/lipsync.mp4`, '-vf', 'fps=12,scale=360:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer', `${QA}/lipsync.gif`]);
M.video = { seconds: +tot.toFixed(1), frames: fn, lines: segs.map(l => l.id) };
await br.close(); srv.close();
fs.writeFileSync(`${QA}/metrics.json`, JSON.stringify(M, null, 1));
const md = [`# Lip-sync lab – ${new Date().toISOString().slice(0, 16)}`, '', '| gate | ok |', '|---|---|', ...Object.entries(M.gates).map(([k, v]) => `| ${k} | ${v ? '✅' : '❌'} |`), '',
  '```', JSON.stringify(S, null, 1), '```', '', '| line | emo | dur s | AV lag ms (thô) | sched p95 ms | fps (4×) | long | flicker pre/raw | live bnd med ms | live open % |', '|---|---|---|---|---|---|---|---|---|---|',
  ...M.lines.map(x => `| ${x.id} | ${x.emo} | ${x.dur} | ${x.avLagMs} (${x.avLagRawMs}) | ${x.schedP95Ms} | ${x.fps} | ${x.longFrames} | ${x.preFlicker}/${x.rawFlicker} | ${x.liveBoundaryMedMs} | ${x.liveOpenAgreePct} |`)].join('\n');
fs.writeFileSync(`${QA}/report.md`, md); console.log(md);
fs.rmSync(`${QA}/frames`, { recursive: true, force: true });
if (!Object.values(M.gates).every(Boolean)) { console.error('GATE FAIL'); process.exitCode = 1; }
