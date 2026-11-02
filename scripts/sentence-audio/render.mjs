// Render lại câu trượt cổng ASR (sentence-audio-asr.yml): Kokoro-82M fp32, CÙNG giọng của câu, nhiều phương án (như docs/WORD-AUDIO.md).
//   NODE_PATH=<thư mục có kokoro-js> AUDIO_MIN=<phút> node scripts/sentence-audio/render.mjs .sa/fail.json .sa/cands.json
// Câu (> 3 chữ): đọc trọn câu ở tốc độ 1,0 → 0,92 → 1,08. Từ/cụm ≤ 3 chữ: các phương án từ đơn (scripts/word-audio/kokoro.mjs METHODS,
// bản cut_* được scripts/word-audio/asr_lib.py cắt). Bản thử → .sa/cand/*.wav; scripts/sentence-asr.py --cands nghe lại, chọn bản đầu tiên đạt.
import fs from 'node:fs'; import { createRequire } from 'node:module';
import { loadKokoro, METHODS } from '../word-audio/kokoro.mjs'; import { isShort } from './lib.mjs';
import { espeakOf } from '../word-audio/ipa.mjs'; import { loadAllPlus } from '../lexicon/lib.mjs';
const [inF = '.sa/fail.json', outF = '.sa/cands.json'] = process.argv.slice(2), CAND = '.sa/cand';
const rows = fs.existsSync(inF) ? JSON.parse(fs.readFileSync(inF, 'utf8')) : [];
const out = []; console.log(`${rows.length} câu cần render lại`);
if (rows.length) {
  const require = createRequire(process.env.NODE_PATH ? process.env.NODE_PATH.split(':')[0] + '/' : import.meta.url);
  const k = await loadKokoro(require), DEADLINE = Date.now() + (+process.env.AUDIO_MIN || 1e6) * 60000; fs.mkdirSync(CAND, { recursive: true });
  const SPEEDS = { fp100: 1.0, fp092: 0.92, fp108: 1.08 };
  // Cụm ngắn: thêm phương án đọc theo phiên âm từ điển (Anh row[1], Mỹ row[10]) – khi Kokoro tự phiên âm sai từ đứng một mình (reap → "rape")
  const IPA = new Map(); for (const e of await loadAllPlus()) { const w = e.row[0].trim().toLowerCase(); if (!IPA.has(w)) IPA.set(w, [e.row[1], e.row[10] || e.row[1]]); }
  const phOf = (t, v) => { const x = IPA.get(t.trim().toLowerCase()); return x ? espeakOf(x[v.startsWith('a') ? 1 : 0]) : ''; };
  const PH_METHODS = ['cut_wordis', 'dot100', 'cut_next'];
  for (const r of rows) {
    if (Date.now() > DEADLINE) break; // hết giờ: câu chưa render → không có kết quả cuối → lượt sau làm lại
    const ph = isShort(r.text) ? phOf(r.text, r.voice) : '';
    const cands = [], meth = isShort(r.text) ? [...Object.entries(METHODS).map(([m, f]) => [m, () => f(k, r.text, r.voice, null)]), ...(ph ? PH_METHODS.map(m => [`${m}_ipa`, () => METHODS[m](k, r.text, r.voice, ph)]) : [])]
      : Object.entries(SPEEDS).map(([m, sp]) => [m, async () => (await k.tts.generate(r.text, { voice: r.voice, speed: sp })).audio]);
    for (const [m, f] of meth) {
      try { const pcm = await f(); if (!pcm || !pcm.length) continue; const fn = `${CAND}/${r.key}.${m}.wav`; k.wav(fn, pcm); cands.push({ m, f: fn }); }
      catch (e) { console.error(`${r.key} ${m}: ${e.message}`); }
    }
    out.push({ ...r, cands });
  }
}
fs.writeFileSync(outF, JSON.stringify(out)); console.log(`✓ ${out.length} câu có bản thử → ${outF}`);
