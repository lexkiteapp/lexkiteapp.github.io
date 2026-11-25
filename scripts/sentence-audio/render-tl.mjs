// Dựng mp3 câu của ngôn ngữ đích (gen-audio.mjs --tl <tl>, CI): công cụ theo bảng scripts/word-audio/tl-voices.json (engine.mjs) – KHÔNG nhánh theo tl.
//  · kokoro (es): âm vị espeak của bảng (misaki, tl_g2p.py) → Kokoro-82M fp32 (word-audio/kokoro.mjs: run() theo id âm vị, vì kokoro-js chỉ phiên âm tiếng Anh) → ffmpeg mono 64 kbps như câu tiếng Anh.
//    Giọng (ef_dora…) tải từ kho mô hình vào thư mục giọng của kokoro-js.
//  · piper (fr): Piper của bảng (fr_FR-siwis-medium) qua render_piper.py (nạp mô hình MỘT lần, đọc cả shard) → CÙNG ffmpeg mono 24 kHz 64 kbps. Độ to −16 LUFS chuẩn hoá + kiểm ở audio.yml (loudness.mjs).
// Khóa/đường dẫn/chỉ mục giống hệt tiếng Anh (audio/l/<khóa>.mp3, khóa = KVoice.lineKey(giọng, chữ); giọng của tl nằm ở bảng Target nên không đụng khóa tiếng Anh).
import fs from 'node:fs'; import { execFileSync, spawn } from 'node:child_process'; import readline from 'node:readline';
import { VOICES, engineOf } from './engine.mjs';
const MP3 = (TMP, out) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', TMP, '-ac', '1', '-ar', '24000', '-b:a', '64k', out]);
const noisy = () => { for (const ev of ['uncaughtException', 'unhandledRejection']) process.prependListener(ev, e => console.error(`✗ ${ev}: ${e && e.message}`)); };
const deadline = () => Date.now() + (process.env.AUDIO_MIN ? +process.env.AUDIO_MIN : 1e6) * 60000;

async function renderKokoro(tl, jobs, { OUT, TMP, limit, writeIndex, require }) {
  const { loadKokoro, trim } = await import('../word-audio/kokoro.mjs');
  noisy();
  const PH = JSON.parse(execFileSync('python3', ['scripts/word-audio/tl_g2p.py'], { input: JSON.stringify([...jobs.values()].map(j => j.text)), env: { ...process.env, TL_ESPEAK: VOICES()[tl].espeak }, maxBuffer: 1 << 28 }).toString());
  if (PH.__err) { console.error(`✗ G2P ${tl}: ` + PH.__err); process.exit(1); }
  const k = await loadKokoro(require), vdir = require.resolve('kokoro-js').replace(/dist\/.*$/, 'voices/');
  for (const v of new Set([...jobs.values()].map(j => j.voice))) if (!fs.existsSync(vdir + v + '.bin')) {
    const r = await fetch(`https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/${v}.bin`);
    if (!r.ok) { console.error(`✗ giọng ${v}: HTTP ${r.status}`); process.exit(1); }
    fs.writeFileSync(vdir + v + '.bin', Buffer.from(await r.arrayBuffer()));
  }
  const DEADLINE = deadline(); let n = 0;
  for (const [key, { voice, text }] of jobs) {
    if (n >= limit || Date.now() > DEADLINE) break;
    const ph = PH[text]; if (!ph) { console.error('✗ không phiên âm được: ' + text); continue; }
    k.wav(TMP, trim((await k.run(k.phIds(ph), voice, 0.95)).pcm));
    MP3(TMP, `${OUT}/${key}.mp3`);
    if (++n % 25 === 0) { writeIndex(); console.log(`${n}/${jobs.size}`); }
  }
  console.log(`✓ ${tl}: ${n} câu`);
}

async function renderPiper(tl, jobs, { OUT, TMP, limit, writeIndex }) {
  noisy();
  const p = spawn('python3', ['-u', 'scripts/sentence-audio/render_piper.py', tl, TMP], { stdio: ['pipe', 'pipe', 'inherit'] }), rl = readline.createInterface({ input: p.stdout }), lines = rl[Symbol.asyncIterator]();
  const ask = async text => { p.stdin.write(text.replace(/\s+/g, ' ') + '\n'); const { value, done } = await lines.next(); if (done || value !== 'ok') throw new Error(done ? 'Piper dừng giữa chừng' : value); };
  const hello = await lines.next(); if (hello.done || hello.value !== 'ready') { console.error('✗ Piper không nạp được mô hình: ' + hello.value); process.exit(1); }
  const DEADLINE = deadline(); let n = 0, bad = 0;
  for (const [key, { text }] of jobs) {
    if (n >= limit || Date.now() > DEADLINE) break;
    try { await ask(text); MP3(TMP, `${OUT}/${key}.mp3`); } catch (e) { console.error(`✗ ${key} "${text}": ${e.message}`); if (++bad > 20) { console.error('✗ quá nhiều câu lỗi – dừng'); process.exit(1); } continue; }
    if (++n % 25 === 0) { writeIndex(); console.log(`${n}/${jobs.size}`); }
  }
  p.stdin.end(); console.log(`✓ ${tl}: ${n} câu (Piper)`);
}

export const renderTl = (tl, jobs, o) => (engineOf(tl) === 'piper' ? renderPiper : renderKokoro)(tl, jobs, o);
