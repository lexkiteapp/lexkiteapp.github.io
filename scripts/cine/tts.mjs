// Kokoro TTS for cine voice lines (same model/settings as the former rhubarb-adhoc branch and scripts/video/render.mjs).
// node scripts/cine/tts.mjs <lines.json> <outdir>   lines.json: {voices:{who:voice}, speed?, lines:[{id, who, text, voice?, speed?}]} -> <outdir>/<id>.wav (+ .txt for Rhubarb)
// Pronunciation lexicon (content/video/kokoro-lexicon.json, checked by scripts/video/tpl/pron.mjs audit): a line with a listed word is phonemised here
// exactly like kokoro-js (espeak-ng en-us per punctuation chunk + the same clean-up) with the listed phonemes for that word; other lines go through tts.generate unchanged.
import fs from 'node:fs'; import { createRequire } from 'node:module'; import { execFileSync } from 'node:child_process';
const req = createRequire(process.env.KOKORO_NODE_PATH + '/');
const { KokoroTTS } = req('kokoro-js'); const { phonemize } = req('phonemizer');
const [cfgPath, out] = process.argv.slice(2); const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); fs.mkdirSync(out, { recursive: true });
const LEXF = new URL('../../content/video/kokoro-lexicon.json', import.meta.url), LEX = fs.existsSync(LEXF) ? JSON.parse(fs.readFileSync(LEXF, 'utf8')).words : {};
const key = w => w.toLowerCase().replace(/’/g, "'").replace(/[^a-z0-9'-]/g, '').replace(/^['-]+|['-]+$/g, '');
const PUNCT = /(\s*[;:,.!?¡¿—…"«»“”(){}[\]]+\s*)+/g;   // kokoro-js chunk splitter
async function phonemes(text) {   // = kokoro-js phonemize(text, 'a') with lexicon words swapped in
  const parts = []; let i = 0;
  for (const m of text.matchAll(PUNCT)) { if (i < m.index) parts.push([false, text.slice(i, m.index)]); parts.push([true, m[0]]); i = m.index + m[0].length; }
  if (i < text.length) parts.push([false, text.slice(i)]);
  let s = '';
  for (const [p, t] of parts) {
    if (p) { s += t; continue; }
    const out = []; let run = [];
    const flush = async () => { if (run.length) out.push((await phonemize(run.join(' '), 'en-us')).join(' ')); run = []; };
    for (const w of t.trim().split(/\s+/)) { if (LEX[key(w)]) { await flush(); out.push(LEX[key(w)].ph); } else run.push(w); }
    await flush(); s += out.join(' ');
  }
  return s.replace(/ʲ/g, 'j').replace(/r/g, 'ɹ').replace(/x/g, 'k').replace(/ɬ/g, 'l').replace(/(?<=[a-zɹː])(?=hˈʌndɹɪd)/g, ' ').replace(/ z(?=[;:,.!?¡¿—…"«»“” ]|$)/g, 'z').replace(/(?<=nˈaɪn)ti(?!ː)/g, 'di').trim();
}
let tts = null;
for (let k = 1; k <= 4 && !tts; k++) { try { tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' }); } catch (e) { console.error('model load failed', k, e.message); await new Promise(r => setTimeout(r, 10000 * k)); } }
for (const l of cfg.lines) {
  const voice = l.voice || cfg.voices[l.who], speed = l.speed || cfg.speed || 1, raw = `${out}/${l.id}.raw.wav`, text = l.text.replace(/["“”]/g, '');
  const lex = text.split(/\s+/).map(key).filter(w => LEX[w]);
  let a;
  if (lex.length) { const ph = await phonemes(text); const { input_ids } = tts.tokenizer(ph, { truncation: true }); a = await tts.generate_from_ids(input_ids, { voice, speed }); console.log(l.id, 'lexicon', lex.join(','), ph); }
  else a = await tts.generate(text, { voice, speed });
  await a.save(raw);
  execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', raw, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,adelay=40:all=1,apad=pad_dur=0.06,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000', '-ac', '1', `${out}/${l.id}.wav`]);
  fs.writeFileSync(`${out}/${l.id}.txt`, l.text); console.log(l.id, voice, speed, l.text);
}
