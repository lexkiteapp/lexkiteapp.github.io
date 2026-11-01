// Tạo file âm thanh chất lượng cao cho bài nghe IELTS/TOEIC bằng Kokoro-82M (Apache-2.0), chạy trên máy, miễn phí.
// Dùng: NODE_PATH=<thư mục có kokoro-js> NODE_USE_ENV_PROXY=1 node scripts/gen-audio.mjs [--limit N]
// Kết quả: .media-out/audio/l/<khóa>.mp3 (mono 64 kbps từ 31/10 – câu cũ 40 kbps; câu mới qua cổng ASR sentence-audio-asr.yml, AUDIO_OUT đổi được) → scripts/media/push.mjs đẩy lên kho media (infra/media-repos.json, KHÔNG vào repo chính)
//   + web/js/listen/audio-index.js (khóa đã có = chỉ mục cũ ∪ file mới). Bỏ qua khóa đã có trong chỉ mục → chạy lại an toàn.
import fs from 'node:fs'; import { collect } from './sentence-audio/corpus.mjs'; import { readIndex, writeIndex as writeIndex2 } from './sentence-audio/lib.mjs'; import { execFileSync } from 'node:child_process'; import { createRequire } from 'node:module';
const require = createRequire(process.env.NODE_PATH ? process.env.NODE_PATH.split(':')[0] + '/' : import.meta.url);
const OUT = process.env.AUDIO_OUT || '.media-out/audio/l', TMP = (process.env.TMPDIR || '/tmp') + '/vb-tts.wav';
const li = process.argv.indexOf('--limit'), limit = li > 0 ? +process.argv[li + 1] : Infinity; // --limit 0 = chỉ đếm, không tạo
fs.mkdirSync(OUT, { recursive: true });
const { have: HAVE, s2: HAVE_S2 } = readIndex();
const has = k => HAVE.has(k) || fs.existsSync(`${OUT}/${k}.mp3`);
const { jobs: ALL, parts } = collect(), jobs = new Map([...ALL].filter(([k]) => !has(k)));
const writeIndex = () => { const keys = new Set([...HAVE, ...fs.readdirSync(OUT).filter(f => f.endsWith('.mp3') && !f.includes('-')).map(f => f.slice(0, -4))]); writeIndex2(keys, HAVE_S2); return keys.size; };
console.log(`${parts.length} phần nghe · cần tạo ${jobs.size} câu`);
if (jobs.size && limit > 0) {
  // phonemizer (emscripten) nuốt lỗi và in cả mã nguồn 1 dòng khổng lồ → tự in lỗi ngắn gọn trước
  for (const ev of ['uncaughtException', 'unhandledRejection']) process.prependListener(ev, e => console.error(`✗ ${ev}: ${e && (e.cause ? (e.cause.code || e.cause.message) + ' · ' : '') + (e && e.message)}`));
  const { KokoroTTS } = require('kokoro-js');
  // Tải mô hình (~90 MB từ Hugging Face) – thử lại khi mạng/máy chủ lỗi tạm thời (máy chủ CI hay bị từ chối lần đầu)
  let tts = null;
  for (let k = 1; k <= 6 && !tts; k++) { try { tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' }); } catch (e) { console.error(`Tải mô hình lỗi (lần ${k}): ${e && (e.cause && e.cause.code || e.message)}`); await new Promise(r => setTimeout(r, 15000 * k)); } }
  if (!tts) { console.error('Không tải được mô hình Kokoro – bỏ qua lượt này'); process.exit(1); }
  let n = 0; const t0 = Date.now(), DEADLINE = t0 + (process.env.AUDIO_MIN ? +process.env.AUDIO_MIN : 1e6) * 60000;
  for (const [key, { voice, text }] of jobs) {
    if (n >= limit || Date.now() > DEADLINE) break; // AUDIO_MIN: dừng đúng hạn để CI kịp lưu (quá giờ job bị hủy → mất hết)
    const a = await tts.generate(text, { voice, speed: 1 });
    await a.save(TMP);
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', TMP, '-ac', '1', '-ar', '24000', '-b:a', '64k', `${OUT}/${key}.mp3`]);
    if (++n % 25 === 0) { writeIndex(); console.log(`${n}/${jobs.size} · ${Math.round((Date.now() - t0) / 1000)}s`); }
  }
}
console.log(`✓ audio-index: ${writeIndex()} câu có giọng Kokoro`);
