// Thí nghiệm giọng từ đơn (word-audio-lab.yml, chỉ CI): so các cách tổng hợp Kokoro cho từ ngắn, ghi .lab/manifest.json cho lab.py nghe lại.
//   NODE_PATH=/tmp/kk/node_modules node scripts/word-audio/lab.mjs word1 word2 …
import fs from 'node:fs'; import { createRequire } from 'node:module';
import { STRONG } from '../word-audio-strong.mjs';
import { loadKokoro, variants } from './kokoro.mjs';
const require = createRequire(process.env.NODE_PATH.split(':')[0] + '/');
const words = process.argv.slice(2), DIR = '.lab', VOICES = ['bf_emma', 'af_heart'];
fs.mkdirSync(DIR, { recursive: true });
const k = await loadKokoro(require);
const rows = [];
for (const w of words) for (const [vi, v] of VOICES.entries()) {
  for (const [name, gen] of Object.entries(variants(k, w, v, STRONG[w] && STRONG[w][vi]))) {
    const f = `${DIR}/${w}.${v}.${name}.wav`;
    try { const pcm = await gen(); if (!pcm) { rows.push({ word: w, voice: v, variant: name, file: null, why: 'cut' }); continue; } k.wav(f, pcm); rows.push({ word: w, voice: v, variant: name, file: f }); }
    catch (e) { rows.push({ word: w, voice: v, variant: name, file: null, why: String(e.message).slice(0, 80) }); }
  }
}
fs.writeFileSync(`${DIR}/manifest.json`, JSON.stringify(rows, null, 1));
console.log(`✓ lab: ${rows.length} bản (${words.length} từ × 2 giọng) · đầu ra mô hình: ${k.outNames}`);
