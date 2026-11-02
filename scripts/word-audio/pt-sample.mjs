// Giọng từ đơn tiếng Bồ Đào Nha (pt-BR) – lượt MẪU 20 từ (docs/specs/target-language.md §Giọng). CHỈ chạy trên CI (word-audio-pt.yml).
// 1) Dò: kokoro-js có tự đọc tiếng Bồ không? (thư viện chỉ phiên âm 'a'=en-us / 'b'=en-gb và chỉ kèm giọng Anh/Mỹ → dự kiến KHÔNG)
// 2) Đường thay: cùng mô hình Kokoro-82M (Apache-2.0) + âm vị pt-br từ G2P chính thức của Kokoro (misaki EspeakG2P + espeak-ng đầy đủ, scripts/word-audio/pt_g2p.py –
//    gói phonemizer kèm kokoro-js chỉ có tiếng Anh: lượt 41428871761) + giọng pf_dora (Ama, nữ) / pm_alex (Carlos, nam)
//    tải từ onnx-community/Kokoro-82M-v1.0-ONNX. Không dùng được → thoát 3 (đổi sang Piper pt_BR, ghi trong spec).
// Ra: $OUT/<giọng>/<từ>.wav + $OUT/probe.json → scripts/word-audio/pt_gate.py (−16 LUFS + nghe lại bằng Whisper đa ngôn ngữ).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { loadKokoro, trim } from './kokoro.mjs';
import { readJSON, seedPath } from '../target/lib.mjs';

if (!process.env.CI) { console.error('Chỉ chạy trên CI (word-audio-pt.yml) – việc nặng không chạy trên máy'); process.exit(75); }
const require = createRequire(path.join(process.env.NODE_PATH || process.cwd(), 'x.js'));
const OUT = process.env.OUT || 'out/pt-sample', N = +(process.env.PT_N || 20), VOICES = ['pf_dora', 'pm_alex'];
const words = readJSON(seedPath('pt')).words.slice(0, N).map(w => w.word);
fs.mkdirSync(OUT, { recursive: true });
const probe = { words: words.length, at: new Date().toISOString() };

const k = await loadKokoro(require);
const vdir = require.resolve('kokoro-js').replace(/dist\/.*$/, 'voices/');
probe.kokoroJsVoices = fs.readdirSync(vdir).filter(f => f.endsWith('.bin')).map(f => f.slice(0, -4));
probe.kokoroJsHasPt = probe.kokoroJsVoices.some(v => /^p[fm]_/.test(v));
try { await k.tts.generate('casa', { voice: 'pf_dora' }); probe.kokoroJsGenPt = 'ok'; } catch (e) { probe.kokoroJsGenPt = 'error: ' + e.message.slice(0, 160); }

// giọng pt tải từ kho mô hình (cùng bản v1.0 ONNX) vào thư mục giọng của kokoro-js
for (const v of VOICES) {
  const f = vdir + v + '.bin'; if (fs.existsSync(f)) continue;
  const r = await fetch(`https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/${v}.bin`);
  if (!r.ok) { probe.voiceDownload = `${v}: HTTP ${r.status}`; break; }
  fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
}
// âm vị cả lô một lần (python khởi động chậm): {chữ: âm vị}
let PH = {};
try { PH = JSON.parse(execFileSync('python3', [fileURLToPath(new URL('./pt_g2p.py', import.meta.url))], { input: JSON.stringify(['coração', ...words]), maxBuffer: 1 << 26 }).toString()); } catch (e) { probe.phErr = String((e.stdout || '') + e.message).slice(0, 300); }
if (PH.__err) probe.phErr = PH.__err;
const ph = async w => (PH[w] ? { p: PH[w], lang: 'pt-br (misaki espeak)' } : null);
probe.sample = await ph('coração');
if (!probe.sample || probe.voiceDownload) { fs.writeFileSync(path.join(OUT, 'probe.json'), JSON.stringify(probe, null, 1)); console.error('✗ Kokoro + espeak pt-br không dùng được:', JSON.stringify(probe)); process.exit(3); }

const rows = [];
for (const v of VOICES) {
  fs.mkdirSync(path.join(OUT, v), { recursive: true });
  for (const w of words) {
    const p = await ph(w); if (!p) { rows.push({ v, w, err: 'phonemize' }); continue; }
    const pcm = trim((await k.run(k.phIds(p.p + '.'), v, 0.9)).pcm);
    const f = path.join(OUT, v, w + '.wav'); k.wav(f, pcm); rows.push({ v, w, ph: p.p, f, sec: +(pcm.length / 24000).toFixed(2) });
  }
}
probe.rows = rows;
fs.writeFileSync(path.join(OUT, 'probe.json'), JSON.stringify(probe, null, 1));
console.log(`✓ ${rows.filter(r => r.f).length}/${words.length * VOICES.length} file · kokoro-js tự đọc pt: ${probe.kokoroJsGenPt} · âm vị mẫu: ${probe.sample.p} (${probe.sample.lang})`);
