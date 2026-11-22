// Slang Card bank (docs/SAY-NATIVE.md "Slang Card"): content/say-native/slang.json = clean, ad-safe slang natives use every day
// (no cap, lowkey, ghosted, salty, it's giving…) for the 7–12 s slang clips + square carousel cards (teach2d template `slang`).
//   node scripts/say-native/slang.mjs --check      gates below (npm test)        node scripts/say-native/slang.mjs --stats
// Facts: IPA = US broad, every lexicon word inside the key must carry its audited lexicon IPA (same source as qc.py / build.mjs);
// meanings in 13 more languages = content/say-native/meanings.json via CI translate.mjs (vi = the bank's own hand gloss).
// Gates: >= 300 items · unique key + slug · enums (level, reg, region, era, pos, expr, theme) · hook <= 6 words ending ?/! · mean <= 9 words ·
// def <= 20 words · hook + key + mean + example <= 20 spoken words (clip 7-12 s) · vi short + Vietnamese · example uses the key (or a listed form), <= 14 words, has a context · quiz 2 options, answer in range,
// options <= 7 words, answer A on 35-65 % · no expr > 15 % · misuse text + why · ad-safety blocklist on every English string · IPA well-formed + lexicon IPA of each content word.
import fs from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url)), F = ROOT + 'content/say-native/slang.json';
export const ENUM = {
  level: ['A2', 'B1', 'B2', 'C1'], reg: ['neutral', 'casual', 'very-casual'], region: ['global', 'US', 'UK'], era: ['evergreen', 'modern', 'gen-z'],
  pos: ['phrase', 'adj', 'adv', 'noun', 'verb', 'interjection'],
  // expression set = TeacherRig.EXPR (web/js/teacher-rig.js, one source with the app + video rig): one strong face per card (docs/CHARACTERS.md "Biểu cảm mạnh")
  expr: Object.keys(createRequire(import.meta.url)('../../web/js/teacher-rig.js').EXPR),
};
export const MIN_ITEMS = 300, SPOKEN_MAX = 20;
export const slug = s => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const W = s => (String(s).match(/[A-Za-z0-9'’-]+/g) || []);
const VI = /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i;
// ad-safety (monetization): profanity, sexual, drugs/alcohol, violence, slurs, politics – none of these may appear in any English string of a card
export const UNSAFE = /\b(shit\w*|fuck\w*|damn\w*|hell|bitch\w*|ass(hole)?|bastard|crap|piss\w*|dick|cock|pussy|tits?|boobs?|sexy?|sexual|horny|thirsty|nudes?|porn\w*|hookup|hook up|weed|stoned|high as|dope|drunk|wasted|hammered|booze|beer|vodka|shots?|vape|420|kill\w*|murder\w*|gun|shoot\w*|die|dead[- ]?ass|suicid\w*|lottery|casino|gambl\w*|poker|smok\w*|cigar\w*|ghetto|ratchet|karen|retard\w*|gay|lesbian|trans|woke|maga|trump|biden|liberal|conservative|religio\w*|church|god|jesus|allah|racist|nazi)\b/i;
// "I'm dead" / "dying" = laughing hard (evergreen, ad-safe) – the blocklist's "die" is for the literal verb only
const SAFE_IDIOMS = [/\bI'?m dead\b/i, /\bdying\b/i, /\bdead\b/i];
const unsafeIn = s => { let t = String(s); for (const r of SAFE_IDIOMS) t = t.replace(r, ''); const m = t.match(UNSAFE); return m && m[0]; };
const IPA_OK = /^\/[a-zɑɒæɐʌəɚɛɜɝɪiʊuɔoeɡŋθðʃʒʧʤtʃdʒjwrlmnpbkfvszhʔɾɫːˈˌ.\s‿-]+\/$/;
const norm = s => String(s || '').replace(/[\/ˈˌ.\s‿-]/g, '').replace(/ɝ/g, 'ɜr').replace(/ɚ/g, 'ər').replace(/ɡ/g, 'g').replace(/r/g, 'r');
const STOP = new Set('a an the to of in on at for and or but is are am be it its it’s it\'s i i\'m you your my me we he she they this that no not so up out off down with like just'.split(' '));

export function load() { return JSON.parse(fs.readFileSync(F, 'utf8')); }
export const items = B => B.items;

export async function check(B = load(), lex = null) {
  if (!lex) { const { sources } = await import(ROOT + 'scripts/scriptbank/lib.mjs'); lex = new Map(); for (const [, r] of sources().byWord) lex.set(r[0].toLowerCase(), r); }
  const err = [], seen = new Set(), slugs = new Set(), I = items(B) || [];
  if (I.length < MIN_ITEMS) err.push(`need >= ${MIN_ITEMS} items, have ${I.length}`);
  const a0 = I.filter(x => x.quiz && x.quiz.answer === 0).length / Math.max(1, I.length);   // the right option must not always be A (viewers learn the pattern, not the word)
  if (I.length && (a0 < 0.35 || a0 > 0.65)) err.push(`quiz answers unbalanced: ${Math.round(a0 * 100)} % are option A (35-65 %)`);
  const ex = {}; for (const x of I) ex[x.expr] = (ex[x.expr] || 0) + 1;   // variety: no expression on more than 15 % of the cards
  for (const [k, n] of Object.entries(ex)) if (n / I.length > 0.15) err.push(`expr ${k} on ${n} cards (> 15 %)`);
  for (const it of I) {
    const k = it.key || '?', e = m => err.push(`${k}: ${m}`);
    if (!it.key || it.key !== it.key.trim()) { e('key'); continue; }
    if (seen.has(k.toLowerCase())) e('duplicate key'); seen.add(k.toLowerCase());
    if (slugs.has(slug(k))) e('duplicate slug'); slugs.add(slug(k));
    for (const f of Object.keys(ENUM)) if (!ENUM[f].includes(it[f])) e(`${f} ${it[f]} not in ${ENUM[f].join('|')}`);
    if (!/^[a-z][a-z-]+$/.test(it.theme || '')) e('theme');
    if (!it.hook || W(it.hook).length > 6 || !/[?!]$/.test(it.hook)) e(`hook <= 6 words ending ?/!: ${it.hook}`);
    if (!it.mean || W(it.mean).length > 9) e(`mean <= 9 words: ${it.mean}`);
    if (!it.def || W(it.def).length > 20) e(`def <= 20 words`);
    if (!it.vi || it.vi.length > 40 || !VI.test(it.vi)) e(`vi short Vietnamese gloss: ${it.vi}`);
    const ex = it.example || {}, forms = [k, ...(it.forms || [])].map(f => f.toLowerCase().replace(/’/g, "'"));
    if (!ex.text || !ex.ctx) e('example {ctx, text}');
    else {
      if (!forms.some(f => ex.text.toLowerCase().replace(/’/g, "'").includes(f))) e(`example must use the key or a form: ${ex.text}`);
      if (W(ex.text).length > 14) e(`example <= 14 words: ${ex.text}`);
      if (W(ex.ctx).length > 10) e(`example ctx <= 10 words`);
      const spoken = W(it.hook).length + W(k).length + W(it.mean).length + W(ex.text).length;   // the 7-12 s clip speaks hook + key + mean + example (≤ 150 wpm with the silences)
      if (spoken > SPOKEN_MAX) e(`clip budget: hook + key + mean + example = ${spoken} words > ${SPOKEN_MAX}`);
    }
    const q = it.quiz;
    if (!q || !q.ask || !Array.isArray(q.options) || q.options.length !== 2 || !(q.answer === 0 || q.answer === 1)) e('quiz {ask, options[2], answer 0|1}');
    else { if (W(q.ask).length > 12) e('quiz ask <= 12 words'); if (q.options.some(o => !o || W(o).length > 7)) e('quiz options <= 7 words'); if (q.options[0] === q.options[1]) e('quiz options identical'); }
    const m = it.misuse;
    if (!m || !m.text || !m.why || W(m.text).length > 12 || W(m.why).length > 12) e('misuse {text <= 12 words, why <= 12 words}');
    for (const s of [k, it.hook, it.mean, it.def, ex.text, ex.ctx, q && q.ask, ...(q ? q.options : []), m && m.text, m && m.why]) { const u = s && unsafeIn(s); if (u) e(`ad-safety: "${u}" in "${s}"`); }
    if (!IPA_OK.test(it.ipa || '')) e(`ipa /…/ US broad: ${it.ipa}`);
    else {
      const ni = norm(it.ipa);
      for (const w of W(k.replace(/-/g, ' '))) {
        const lw = w.toLowerCase(); if (lw.length < 3 || STOP.has(lw)) continue;
        const r = lex.get(lw); if (!r) continue;
        const want = norm(r[10] || r[1]);   // US else UK, the audited row (build.mjs / qc.py rule)
        if (want && !ni.includes(want)) e(`ipa: "${w}" must be ${r[10] || r[1]} (lexicon) inside ${it.ipa}`);
      }
    }
  }
  return err;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const B = load(), err = await check(B);
  if (process.argv.includes('--stats')) {
    const by = f => Object.entries(B.items.reduce((a, x) => (a[x[f]] = (a[x[f]] || 0) + 1, a), {})).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · ');
    for (const f of ['theme', 'level', 'reg', 'region', 'era', 'expr']) console.log(`${f}: ${by(f)}`);
  }
  if (err.length) { console.error(`✗ slang bank: ${err.length} lỗi\n  ` + err.slice(0, 60).join('\n  ')); process.exit(1); }
  console.log(`✓ slang bank OK: ${B.items.length} cards`);
}
