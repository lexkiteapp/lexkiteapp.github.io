// Dựng mp3 câu tiếng TBN (gen-audio.mjs --tl es, CI): âm vị espeak es-419 (misaki, tl_g2p.py) → Kokoro-82M fp32 (word-audio/kokoro.mjs: run() theo id âm vị,
// vì kokoro-js chỉ phiên âm tiếng Anh) → ffmpeg mono 64 kbps như câu tiếng Anh. Giọng ef_dora tải từ kho mô hình vào thư mục giọng của kokoro-js.
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
import { loadKokoro, trim } from '../word-audio/kokoro.mjs';
export async function renderEs(jobs, { OUT, TMP, limit, writeIndex, require }) {
  for (const ev of ['uncaughtException', 'unhandledRejection']) process.prependListener(ev, e => console.error(`✗ ${ev}: ${e && e.message}`));
  const PH = JSON.parse(execFileSync('python3', ['scripts/word-audio/tl_g2p.py'], { input: JSON.stringify([...jobs.values()].map(j => j.text)), env: { ...process.env, TL_ESPEAK: 'es-419' }, maxBuffer: 1 << 28 }).toString());
  if (PH.__err) { console.error('✗ G2P es: ' + PH.__err); process.exit(1); }
  const k = await loadKokoro(require), vdir = require.resolve('kokoro-js').replace(/dist\/.*$/, 'voices/');
  for (const v of new Set([...jobs.values()].map(j => j.voice))) if (!fs.existsSync(vdir + v + '.bin')) {
    const r = await fetch(`https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/${v}.bin`);
    if (!r.ok) { console.error(`✗ giọng ${v}: HTTP ${r.status}`); process.exit(1); }
    fs.writeFileSync(vdir + v + '.bin', Buffer.from(await r.arrayBuffer()));
  }
  const DEADLINE = Date.now() + (process.env.AUDIO_MIN ? +process.env.AUDIO_MIN : 1e6) * 60000; let n = 0;
  for (const [key, { voice, text }] of jobs) {
    if (n >= limit || Date.now() > DEADLINE) break;
    const ph = PH[text]; if (!ph) { console.error('✗ không phiên âm được: ' + text); continue; }
    k.wav(TMP, trim((await k.run(k.phIds(ph), voice, 0.95)).pcm));
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', TMP, '-ac', '1', '-ar', '24000', '-b:a', '64k', `${OUT}/${key}.mp3`]);
    if (++n % 25 === 0) { writeIndex(); console.log(`${n}/${jobs.size}`); }
  }
  console.log(`✓ es: ${n} câu`);
}
