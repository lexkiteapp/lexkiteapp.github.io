// Giọng đọc TỪ ĐƠN (Anh bf_emma + Mỹ af_heart) bằng Kokoro-82M (Apache-2.0) – chỉ chạy trên CI (word-audio.yml), tiếp tục được.
//   NODE_PATH=<thư mục có kokoro-js> node scripts/gen-word-audio.mjs [--limit N từ] [--shard i/N] [--round 1|2] [--count]
// Vì sao bản s3 (25/10): Kokoro đọc từ đứng một mình hay bịa âm ("away" → "The way", "just" → "Adjust") – faster-whisper nghe lại thấy 24/100 file cũ sai.
// Cách làm (thí nghiệm word-audio-lab.yml, docs/WORD-AUDIO.md): tổng hợp từ trong câu mang rồi cắt lấy từ (scripts/word-audio/kokoro.mjs, METHODS[0]);
// vòng 2 cho file trượt thử các cách còn lại. MỌI file đều qua scripts/word-audio-asr.py (Whisper + độ dài) – chỉ file đạt được đẩy lên kho media.
// Kết quả: .s3-cand/ (bản thử + manifest.json) → word-audio-asr.py chép bản đạt sang .media-out/audio/w/<fnv(giọng|từ|s3)>.mp3
//   → scripts/media/push.mjs → audio.lexkite.com/audio/w/… (khóa mới |s3: CDN đệm 1 năm không bao giờ phát file cũ).
// Trạng thái: web/audio/w/s3.tsv (từ \t bf_emma \t af_heart: "ok" hoặc lý do – từ không đạt dùng giọng máy, xem danh sách này)
//   → web/audio/w/index.txt (từ có ≥ 1 giọng đạt; Lex/newtab dùng làm cờ "có file") – scripts/word-audio/merge.mjs ghi.
import fs from 'node:fs'; import { execFileSync } from 'node:child_process'; import { createRequire } from 'node:module';
import { STRONG, wordKey } from './word-audio-strong.mjs'; import { corpus, readRes, IDX, VOICES } from './word-audio/lib.mjs';
import { loadKokoro, METHODS } from './word-audio/kokoro.mjs';
export { fnv } from './word-audio-strong.mjs';
const A = process.argv, opt = (k, d) => { const i = A.indexOf('--' + k); return i > 0 ? A[i + 1] : d; };
const OUT = process.env.WORD_AUDIO_OUT || '.media-out/audio/w', CAND = process.env.WORD_AUDIO_CAND || '.s3-cand';
const limit = +opt('limit', 300), [si, sn] = opt('shard', '0/1').split('/').map(Number), round = +opt('round', 1);
const words = await corpus(), done = readRes();
// thứ tự: từ dạng mạnh → từ đã có file cũ (index.txt trước s3 – làm lại trước để app đổi khóa không mất file nào) → còn lại theo kho (NGSL trước)
const oldIdx = new Set((fs.existsSync(IDX) ? fs.readFileSync(IDX, 'utf8') : '').split('\n').filter(Boolean));
const todo = [...new Set([...words.filter(w => STRONG[w]), ...words.filter(w => oldIdx.has(w)), ...words])].filter(w => !done.has(w));
console.log(`${words.length} từ · cần tạo ${todo.length} từ`);
if (A.includes('--count')) process.exit(0);
const require = createRequire(process.env.NODE_PATH ? process.env.NODE_PATH.split(':')[0] + '/' : import.meta.url);
const k = await loadKokoro(require);
const enc = (wav, f) => execFileSync('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-i', wav, '-ac', '1', '-ar', '24000', '-b:a', '40k', f]);
fs.mkdirSync(CAND, { recursive: true });
// vòng 1: METHODS[0] cho các từ của lượt này; vòng 2: các cách còn lại cho từng (từ, giọng) trượt vòng 1 (.s3-cand/fail.json do word-audio-asr.py ghi)
const jobs = round === 1
  ? todo.slice(0, limit * sn).filter((_, i) => i % sn === si).flatMap(w => VOICES.map(v => ({ word: w, voice: v, old: oldIdx.has(w) })))
  : JSON.parse(fs.readFileSync(`${CAND}/fail.json`, 'utf8'));
const names = round === 1 ? Object.keys(METHODS).slice(0, 1) : Object.keys(METHODS).slice(1);
const manifest = [], t0 = Date.now(), DEADLINE = t0 + (+process.env.AUDIO_MIN || 1e6) * 60000; let clips = 0;
for (const j of jobs) {
  if (Date.now() > DEADLINE) break;
  const ph = STRONG[j.word] && STRONG[j.word][VOICES.indexOf(j.voice)], key = wordKey(j.voice, j.word), cands = [];
  for (const m of names) {
    try {
      const pcm = await METHODS[m](k, j.word, j.voice, ph); if (!pcm) continue;
      const wav = `${CAND}/${key}.${m}.wav`, f = `${CAND}/${key}.r${round}.${m}.mp3`; k.wav(wav, pcm); enc(wav, f); fs.rmSync(wav); cands.push({ m, f }); clips++;
    } catch (e) { console.error(`✗ ${j.word}/${j.voice}/${m}: ${e.message}`); }
  }
  manifest.push({ ...j, out: `${OUT}/${key}.mp3`, cands });
  if (manifest.length % 200 === 0) console.log(`${manifest.length}/${jobs.length} · ${Math.round((Date.now() - t0) / 1000)}s`);
}
fs.writeFileSync(`${CAND}/manifest.json`, JSON.stringify(manifest, null, 1));
console.log(`✓ word-audio vòng ${round} (shard ${si}/${sn}): ${manifest.length} (từ × giọng) · ${clips} bản thử · ${Math.round((Date.now() - t0) / 1000)}s`);
