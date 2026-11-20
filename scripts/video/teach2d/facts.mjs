// Teach2D facts dump (gen.py --plan / gates): ONE node call instead of one per word.
//   node scripts/video/teach2d/facts.mjs bank            -> {words:{w:{key,pos,ipa,uk,def,ex,cefr,syl}}, ex:[lexicon examples], verbs:[...]}
//   echo '["text", ...]' | node scripts/video/teach2d/facts.mjs known   -> [[unknown words of text 1], ...]   (NGSL <= B1 gate, scriptbank known())
// Same sources as everything else: audited word bank (scriptbank sources().byWord, the row qc.py's IPA gate reads), verb engine
// (web/js/verbs-core.js), IPA syllable count (scripts/lexicon/ipa.mjs).
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { sources, known, words } from '../../scriptbank/lib.mjs';
import { syllables } from '../../lexicon/ipa.mjs';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const mode = process.argv[2];
if (mode === 'known') {
  const T = JSON.parse(fs.readFileSync(0, 'utf8'));
  console.log(JSON.stringify(T.map(s => words(s).filter(w => !known(w)))));
} else if (mode === 'bank') {
  const S = sources(), out = { words: {}, ex: [], verbs: [] };
  for (const [w, r] of S.byWord) {
    const ipa = r[10] || r[1];
    out.words[w] = { key: w + '#' + String(r[2] || '').toLowerCase().trim(), pos: r[2], ipa, uk: r[1], def: r[4], ex: r[5], cefr: r[8], em: r[9] || '', syl: ipa ? syllables(ipa) : 0 };
  }
  for (const r of S.lex.values()) if (r[5]) out.ex.push(r[5]);
  const c = {}; c.self = c; vm.createContext(c); vm.runInContext(fs.readFileSync(ROOT + 'web/js/verbs-core.js', 'utf8'), c);
  const V = c.LK_VERBS;
  for (const it of V.irregularList()) {
    const f = V.forms(it.base), over = (V.mistakes(it.base).find(m => m.code === 'overreg') || {}).arg || null;
    out.verbs.push({ base: f.base, P: f.P, PP: f.PP, past: f.past.map(x => x.w), pp: f.pp.map(x => x.w), tags: [...f.past, ...f.pp].some(x => x.tag),
                     irregular: !!f.irregular, partial: !!f.partial, over });
  }
  out.ex.sort();
  console.log(JSON.stringify(out));
} else { console.error('usage: facts.mjs bank | known'); process.exit(2); }
