// Kokoro TTS for cine voice lines (same model/settings as the former rhubarb-adhoc branch and scripts/video/render.mjs).
// node scripts/cine/tts.mjs <lines.json> <outdir>   lines.json: {voices:{who:voice}, speed?, lines:[{id, who, text, voice?, speed?}]} -> <outdir>/<id>.wav (+ .txt for Rhubarb)
import fs from 'node:fs'; import { createRequire } from 'node:module'; import { execFileSync } from 'node:child_process';
const { KokoroTTS } = createRequire(process.env.KOKORO_NODE_PATH + '/')('kokoro-js');
const [cfgPath, out] = process.argv.slice(2); const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); fs.mkdirSync(out, { recursive: true });
let tts = null;
for (let k = 1; k <= 4 && !tts; k++) { try { tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' }); } catch (e) { console.error('model load failed', k, e.message); await new Promise(r => setTimeout(r, 10000 * k)); } }
for (const l of cfg.lines) {
  const voice = l.voice || cfg.voices[l.who], speed = l.speed || cfg.speed || 1, raw = `/tmp/${l.id}.raw.wav`;
  const a = await tts.generate(l.text.replace(/["“”]/g, ''), { voice, speed }); await a.save(raw);
  execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', raw, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,adelay=40:all=1,apad=pad_dur=0.06,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000', '-ac', '1', `${out}/${l.id}.wav`]);
  fs.writeFileSync(`${out}/${l.id}.txt`, l.text); console.log(l.id, voice, speed, l.text);
}
