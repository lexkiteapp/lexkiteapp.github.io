// Say it like a native – meanings in 13 languages (vi = audited lexicon gloss) via the AI pool (docs/SAY-NATIVE.md, CI only: .github/workflows/say-native.yml).
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
const items = S.series.flatMap(s => s.items).map(it => { const r = lex.get(it.key.toLowerCase()) || []; return { k: it.key.toLowerCase(), w: it.key, pos: r[2] || 'phrase', def: `${it.mean} (${r[4] || ''})`, ex: it.say }; });
const score = (r, k) => +((r && r.out && r.out[k]) ?? 0);
let kept = 0, empty = 0;
for (const lang of want) {
  for (let round = 0; round < 2; round++) {
    const todo = items.filter(x => REDO && round === 0 || !(M[x.k] && M[x.k][lang]));
    if (!todo.length) break;
    for (let i = 0; i < todo.length; i += 12) {
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
}
const sorted = Object.fromEntries(Object.keys(M).sort().map(k => [k, Object.fromEntries(LANGS.filter(l => M[k][l]).map(l => [l, M[k][l]]))]));
fs.writeFileSync(F, JSON.stringify(sorted, null, 1) + '\n');
AI.report('say-native');
console.log(`say-native translate: kept ${kept}, still empty ${empty}`);
if (!kept && empty) process.exit(1);   // a run that produced nothing is red (METHODS §4)
