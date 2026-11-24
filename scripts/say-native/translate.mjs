// Say it like a native + Slang Card – meanings in 13 languages (vi = audited lexicon gloss) via the AI pool (docs/SAY-NATIVE.md, CI only: .github/workflows/say-native.yml).
//   node scripts/say-native/translate.mjs [--langs vi,es] [--redo]
// gen = AI.gen mode 'translate' (sense-locked by the card's plain meaning + lexicon definition + example), judge = AI.judgePair (2 different
// model families). A meaning is kept only when BOTH judges score >= 4; else one regeneration, then the slot stays empty and build.mjs fails.
// Never hand-written by a session (owner 31/10: tokens), never copied from web/packs (literal idiom glosses).
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createPool } from '../lib/ai-pool.mjs';
import { LANGS } from './build.mjs';
if (!process.env.CI) { console.error('translate.mjs: CI only'); process.exit(1); }
const ROOT = fileURLToPath(new URL('../../', import.meta.url)), F = ROOT + 'content/say-native/meanings.json';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const want = (arg('--langs', '') || LANGS.filter(l => l !== 'vi').join(',')).split(',').filter(l => LANGS.includes(l) && l !== 'vi'), REDO = process.argv.includes('--redo');
const S = JSON.parse(fs.readFileSync(ROOT + 'content/say-native/series.json', 'utf8'));
const M = fs.existsSync(F) ? JSON.parse(fs.readFileSync(F, 'utf8')) : {};
const { sources } = await import(ROOT + 'scripts/scriptbank/lib.mjs');
const lex = new Map(); for (const [, r] of sources().byWord) lex.set(r[0].toLowerCase(), r);
const AI = createPool({ budget: { lexai: 400 } });
const cards = S.series.flatMap(s => s.items).map(it => { const r = lex.get(it.key.toLowerCase()) || []; return { k: it.key.toLowerCase(), w: it.key, pos: r[2] || 'phrase', def: `${it.mean} (${r[4] || ''})`, ex: it.say }; });
// Slang Card bank (content/say-native/slang.json): same meanings.json, sense-locked by the card's spoken meaning + definition + its own example
const SL = fs.existsSync(ROOT + 'content/say-native/slang.json') ? JSON.parse(fs.readFileSync(ROOT + 'content/say-native/slang.json', 'utf8')).items : [];
const seenK = new Set(cards.map(x => x.k));
const items = [...cards, ...SL.filter(it => !seenK.has(it.key.toLowerCase())).map(it => ({ k: it.key.toLowerCase(), w: it.key, pos: it.pos, def: `${it.mean} (${it.def}) – informal slang`, ex: it.example.text }))];
const score = (r, k) => +((r && r.out && r.out[k]) ?? 0);
// time budget (job timeout 40 min): stop cleanly before it and save after every language – a cancelled job used to lose every judged line (run 45029502257)
const T0 = Date.now(), MAX_MS = +arg('--max-min', 32) * 60e3, late = () => Date.now() - T0 > MAX_MS;
const sortOut = O => Object.fromEntries(Object.keys(O).sort().map(k => [k, Object.fromEntries(LANGS.filter(l => O[k][l]).map(l => [l, O[k][l]]))]));
const saveM = () => fs.writeFileSync(F, JSON.stringify(sortOut(M), null, 1) + '\n');
let kept = 0, empty = 0;
// --lines N: Slang Card L1 clips (gen.py --slang-l1) also show the hook + the example in the page language. The first N slang episodes of the batch
// (auto.json t2s_* order) get both lines translated into all 14 languages (vi included – the card's vi is only the gloss), sense-locked by the card,
// the English slang kept verbatim; same 2-judge rule. Stored apart from the word meanings: content/say-native/slang-lines.json.
const NL = +arg('--lines', 0), LF = ROOT + 'content/say-native/slang-lines.json', LN = fs.existsSync(LF) ? JSON.parse(fs.readFileSync(LF, 'utf8')) : {};
for (const lang of (process.argv.includes('--lines-only') ? [] : want)) {
  if (late()) { console.log(`meanings: time budget reached before ${lang} – the next run continues`); break; }
  for (let round = 0; round < 2 && !late(); round++) {
    const todo = items.filter(x => REDO && round === 0 || !(M[x.k] && M[x.k][lang]));
    if (!todo.length) break;
    for (let i = 0; i < todo.length; i += 12) {
      if (late()) break;
      const part = todo.slice(i, i + 12), g = await AI.gen({ mode: 'translate', lang, items: part });
      if (!g || !g.out) continue;
      const cand = part.filter(x => typeof g.out[x.k] === 'string' && g.out[x.k].trim()).map(x => ({ ...x, tr: g.out[x.k].trim() }));
      if (!cand.length) continue;
      const { a, b } = await AI.judgePair({ mode: 'judge', lang, items: cand });
      for (const x of cand) {
        const ok = score(a, x.k) >= 4 && score(b, x.k) >= 4;
        if (ok) { (M[x.k] = M[x.k] || {})[lang] = x.tr; kept++; }
        console.log(`${lang} ${ok ? '✓' : '✗'} ${x.w} → ${x.tr}  [${a && a.model}:${score(a, x.k)} ${b && b.model}:${score(b, x.k)}]`);
      }
    }
  }
  empty += items.filter(x => !(M[x.k] && M[x.k][lang])).length;
  saveM();   // saved after every language
}
await runLines();
const sorted = Object.fromEntries(Object.keys(M).sort().map(k => [k, Object.fromEntries(LANGS.filter(l => M[k][l]).map(l => [l, M[k][l]]))]));
fs.writeFileSync(F, JSON.stringify(sorted, null, 1) + '\n');
AI.report('say-native');
console.log(`say-native translate: kept ${kept}, still empty ${empty}`);
if (!kept && empty) process.exit(1);   // a run that produced nothing is red (METHODS §4)

async function runLines() {   // after the meanings (every L1 row needs its meaning first; lines retry rejects each run)
  if (!(NL > 0)) return;
  const AU = JSON.parse(fs.readFileSync(ROOT + 'content/video/teach2d/auto.json', 'utf8')).rows.filter(r => r.template === 'slang' && !r.lang).map(r => r.in.key.toLowerCase());   // English batch order (L1 rows repeat the keys)
  const byK = Object.fromEntries(SL.map(it => [it.key.toLowerCase(), it])), keep = `Translate the whole line naturally for a learner; keep the English slang "%s" exactly as it is, in quotes if needed`;
  const lines = AU.slice(0, NL).filter(k => byK[k]).flatMap(k => { const it = byK[k], d = keep.replace('%s', it.key);
    return [{ k: `${k}|hook`, w: it.hook, pos: 'sentence', def: `${d}. It is a short situation line before learning "${it.key}" (${it.mean})`, ex: it.example.ctx },
            { k: `${k}|ex`, w: it.example.text, pos: 'sentence', def: `${d}. "${it.key}" means: ${it.mean}`, ex: it.example.ctx }]; });
  for (const lang of (arg('--langs', '') || LANGS.join(',')).split(',').filter(l => LANGS.includes(l) && l !== 'vi')) {   // vi lines are hand-written on the card (vi_hook / vi_ex)
    if (late()) { console.log(`lines: time budget reached before ${lang} – the next run continues`); break; }
    for (let round = 0; round < 2 && !late(); round++) {
      const todo = lines.filter(x => !(LN[x.k] && LN[x.k][lang])); if (!todo.length) break;
      for (let i = 0; i < todo.length; i += 10) {
        if (late()) break;
        const part = todo.slice(i, i + 10), g = await AI.gen({ mode: 'translate', lang, items: part }); if (!g || !g.out) continue;
        const cand = part.filter(x => typeof g.out[x.k] === 'string' && g.out[x.k].trim()).map(x => ({ ...x, tr: g.out[x.k].trim() })); if (!cand.length) continue;
        const { a, b } = await AI.judgePair({ mode: 'judge', lang, items: cand });
        for (const x of cand) {
          const slangKept = x.tr.toLowerCase().includes(x.k.split('|')[0].split(' ')[0]) || x.k.endsWith('|hook');   // the example must keep the English slang
          const ok = score(a, x.k) >= 4 && score(b, x.k) >= 4 && slangKept;
          if (ok) { (LN[x.k] = LN[x.k] || {})[lang] = x.tr; kept++; }
          console.log(`lines ${lang} ${ok ? '✓' : '✗'} ${x.w} → ${x.tr}  [${a && a.model}:${score(a, x.k)} ${b && b.model}:${score(b, x.k)}${slangKept ? '' : ' slang-lost'}]`);
        }
      }
    }
    empty += lines.filter(x => !(LN[x.k] && LN[x.k][lang])).length;
    fs.writeFileSync(LF, JSON.stringify(sortOut(LN), null, 1) + '\n');   // saved after every language
  }
  fs.writeFileSync(LF, JSON.stringify(Object.fromEntries(Object.keys(LN).sort().map(k => [k, Object.fromEntries(LANGS.filter(l => LN[k][l]).map(l => [l, LN[k][l]]))])), null, 1) + '\n');
}
