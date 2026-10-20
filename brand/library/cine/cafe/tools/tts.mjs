// Kokoro TTS for cine bank lines (same model/settings as scripts/video/render.mjs tts step): cine/tts/lines.json -> cine/wav/<id>.wav + .txt
import fs from 'node:fs'; import { createRequire } from 'node:module'; import { execFileSync } from 'node:child_process';
const { KokoroTTS } = createRequire(process.env.KOKORO_NODE_PATH + '/')('kokoro-js');
const cfg = JSON.parse(fs.readFileSync('cine/tts/lines.json', 'utf8')); fs.mkdirSync('cine/wav', { recursive: true });
let tts = null;
for (let k = 1; k <= 4 && !tts; k++) { try { tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' }); } catch (e) { console.error('model load failed', k, e.message); await new Promise(r => setTimeout(r, 10000 * k)); } }
for (const l of cfg.lines) {
  const voice = cfg.voices[l.who], raw = `/tmp/${l.id}.raw.wav`;
  const a = await tts.generate(l.text.replace(/["“”]/g, ''), { voice, speed: 1 }); await a.save(raw);
  // trim Kokoro's leading silence, keep 40 ms; trim trailing silence; -16 LUFS; 48 kHz mono
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,adelay=40:all=1,apad=pad_dur=0.06,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000', '-ac', '1', `cine/wav/${l.id}.wav`]);
  fs.writeFileSync(`cine/wav/${l.id}.txt`, l.text); console.log(l.id, voice, l.text);
}
