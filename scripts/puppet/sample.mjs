// 🎭 Dựng dữ liệu cho video mẫu con rối 2D (chạy trên CI – .github/workflows/puppet.yml; docs/LESSON-ENGINE.md §4b).
// Kịch bản (content/video/puppet/*.json) → giọng Kokoro từng câu → mốc từ (faster-whisper, scripts/video/align.py) → khẩu hình Rhubarb (có văn bản -d)
// → dòng thời gian chung { cues, expr, gest, words, lines } + voice.wav. Remotion (scripts/video/remotion/src/Puppet.jsx) và cổng khẩu hình (gate.mjs) đọc props.json.
// Dùng: node scripts/puppet/sample.mjs <kịch bản.json> <thư mục ra>   · env: KOKORO_NODE_PATH, RHUBARB, PYTHON, WHISPER_MODEL
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [script = 'content/video/puppet/sample-borrow.json', OUT = 'out/puppet'] = process.argv.slice(2);
const P = f => path.join(OUT, f), RATE = 48000, LEAD = 0.6, GAP = 0.45, TAIL = 1.4, FPS = 30;
const PY = process.env.PYTHON || 'python3', RHUBARB = process.env.RHUBARB || 'rhubarb';
const require = createRequire(import.meta.url);
const Pup = require(path.join(ROOT, 'web/js/lesson/puppet.js'));
const ff = args => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'ignore', 'inherit'] });
const pcm = wav => { const b = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', wav, '-f', 'f32le', '-ac', '1', '-ar', String(RATE), '-'], { maxBuffer: 1 << 28 }); return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
const norm = w => String(w).toLowerCase().replace(/[^a-z']/g, '');

const S = JSON.parse(fs.readFileSync(script, 'utf8'));
fs.mkdirSync(OUT, { recursive: true });

// 1) Kokoro (cùng mô hình/giọng với audio.yml + video.yml) – cắt im lặng đầu câu, -16 LUFS
const np = process.env.KOKORO_NODE_PATH || process.env.NODE_PATH;
const { KokoroTTS } = createRequire(np ? np.split(':')[0] + '/' : import.meta.url)('kokoro-js');
let tts = null;
for (let k = 1; k <= 4 && !tts; k++) { try { tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' }); } catch (e) { console.error(`Kokoro lỗi (lần ${k}): ${e.message}`); await new Promise(r => setTimeout(r, 10000 * k)); } }
if (!tts) throw new Error('không tải được Kokoro');
const lines = [];
for (const [i, l] of S.lines.entries()) {
  const nn = String(i).padStart(2, '0'), raw = P(`line-${nn}.raw.wav`), wav = P(`line-${nn}.wav`);
  await (await tts.generate(l.text, { voice: S.voice || 'af_heart', speed: 1 })).save(raw);
  ff(['-i', raw, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,adelay=40:all=1,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000', '-ac', '1', wav]);
  fs.rmSync(raw, { force: true });
  fs.writeFileSync(P(`line-${nn}.txt`), l.text);
  lines.push({ ...l, wav, samples: pcm(wav) });
}

// 2) Mốc từ (faster-whisper tiny.en, khớp lại đầu từ theo năng lượng) – để gắn cử chỉ vào đúng từ + phụ đề karaoke
fs.writeFileSync(P('align-jobs.json'), JSON.stringify(lines.map(l => ({ wav: l.wav, text: l.text }))));
const asr = JSON.parse(execFileSync(PY, [path.join(ROOT, 'scripts/video/align.py'), P('align-jobs.json'), '--model', process.env.WHISPER_MODEL || 'tiny.en'], { encoding: 'utf8', maxBuffer: 32 << 20, stdio: ['ignore', 'pipe', 'inherit'] }));

// Rhubarb hay bỏ sót hình mím môi đầu từ (borrow, back, pen…): ta BIẾT chữ + mốc từ → ép đoạn khép môi A (m: từ đầu tiếng mũi; b/p: khép trước lúc bật hơi)
// và môi-răng G cho f/v đầu từ, rồi trả lại hình đang chạy. Câu động trong app dùng fromText (đã bắt đầu bằng A/G đúng chữ).
function closures(cues, ws) {
  const at = (c, x) => { let v = 'X'; for (const [t0, s] of c) if (t0 <= x) v = s; else break; return v; };
  let out = cues.slice();
  for (const w of ws) {
    const ch = norm(w.w)[0], [a, b, v] = ch === 'm' ? [w.start - 0.02, w.start + 0.07, 'A'] : ch === 'b' || ch === 'p' ? [w.start - 0.08, w.start + 0.01, 'A'] : ch === 'f' || ch === 'v' ? [w.start - 0.03, w.start + 0.06, 'G'] : [];
    if (!v) continue;
    const after = at(out, b);
    out = out.filter(c => c[0] < a || c[0] > b).concat([[+a.toFixed(3), v], [+b.toFixed(3), after]]).sort((x, y) => x[0] - y[0]);
  }
  return out.filter((c, k) => !k || c[1] !== out[k - 1][1]);
}

// 3) Rhubarb (bộ hình mở rộng G H X, có văn bản câu → nhận dạng âm vị chính xác hơn)
const cues = [], expr = [[0, 'neutral']], gest = [], words = [], outLines = [];
let t = LEAD;
for (const [i, l] of lines.entries()) {
  const nn = String(i).padStart(2, '0'), dur = l.samples.length / RATE;
  execFileSync(RHUBARB, ['-q', '-f', 'json', '-d', P(`line-${nn}.txt`), '-o', P(`line-${nn}.vis.json`), l.wav], { stdio: ['ignore', 'ignore', 'inherit'] });
  const mc = JSON.parse(fs.readFileSync(P(`line-${nn}.vis.json`), 'utf8')).mouthCues;
  const ws = (asr[i] && asr[i].words || []).map(w => ({ w: w.w, start: +(t + w.start).toFixed(3), end: +(t + w.end).toFixed(3) }));
  cues.push(...closures(mc.map(c => [+(t + c.start).toFixed(3), c.value]), ws));
  words.push(...ws.map(w => ({ ...w, line: i })));
  const toks = l.text.split(/\s+/);
  for (const g of l.tags || []) {
    let at = t - 0.15;
    if (typeof g.at === 'string') { const w = ws.find(x => norm(x.w) === norm(g.at)); const k = toks.findIndex(x => norm(x) === norm(g.at)); at = w ? w.start - 0.12 : t + dur * Math.max(0, k) / toks.length; }
    else if (g.at > 0) at = ws[g.at] ? ws[g.at].start - 0.12 : t + dur * g.at / toks.length;
    const k = g.kind ? Pup.KIND[g.kind] || {} : {}, e = g.expr || k.expr, ge = g.gest || k.gest;
    if (e) expr.push([+Math.max(0, at).toFixed(3), e]); if (ge) gest.push([+Math.max(0, at).toFixed(3), ge]);
  }
  outLines.push({ text: l.text, start: +t.toFixed(3), end: +(t + dur).toFixed(3) });
  t += dur + GAP;
}
const total = t - GAP + TAIL;
expr.push([+(total - TAIL + 0.1).toFixed(3), 'happy']);
expr.sort((a, b) => a[0] - b[0]); gest.sort((a, b) => a[0] - b[0]);

// 4) voice.wav = các câu đặt đúng chỗ trên dòng thời gian
const buf = new Float32Array(Math.ceil(total * RATE));
outLines.forEach((o, i) => buf.set(lines[i].samples.subarray(0, Math.min(lines[i].samples.length, buf.length - Math.round(o.start * RATE))), Math.round(o.start * RATE)));
fs.writeFileSync(P('voice.f32'), Buffer.from(buf.buffer));
ff(['-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', P('voice.f32'), '-c:a', 'pcm_s16le', P('voice.wav')]);
fs.rmSync(P('voice.f32'));

const props = { fps: FPS, durationInFrames: Math.ceil(total * FPS), w: 1080, h: 1920, who: S.who, card: S.card, tl: { cues, expr, gest, seed: 11, lead: 0.03 }, words, lines: outLines, audio: 'voice.wav' };
fs.writeFileSync(P('props.json'), JSON.stringify(props));
console.log(`props.json: ${total.toFixed(1)} s · ${cues.length} cue · ${expr.length} biểu cảm · ${gest.length} cử chỉ · ${words.length} từ`);
