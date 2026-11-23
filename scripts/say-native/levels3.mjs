// Levels 3 bank (growth series #3 "Một tình huống, 3 cấp độ", docs/VIDEO-TEACH2D.md "Levels 3"): content/video/teach2d/levels3.json = ONE situation said at A1, B1 and C1
// (order coffee, check in, ask directions…) for the 10-13 s `levels3` clips + square carousel (teach2d template `levels3`).
//   node scripts/say-native/levels3.mjs --check      gates below (npm test)        node scripts/say-native/levels3.mjs --stats
// Gates: >= 60 situations · unique id · title <= 3 words, hook (title + "three levels") <= 5 words · reg enum · chip <= 4 words · each level {text, key, note}: key inside its text (<= 3 words, <= 20 chars),
// note <= 8 words · A1 line <= 6 words and EVERY word A1 in the audited bank (lexicon cefr) · B1 line <= 9 words, every word <= B1 (bank cefr or NGSL known()) · C1 line <= 10 words, every word a real bank / NGSL / slang word,
// the C1 key is a chunk (>= 2 words) or a B2+ word, and a multi-word C1 key must occur in a repo English text (lexicon examples, situations, lessons, roleplay, listening, notes, framework, slang bank; <= 10 rows may carry vouch:true for a standard phrase the repo lacks) and a single-word key must be a bank / slang / repo word · three different lines ·
// hook + 3 lines <= 24 spoken words (clip 10-13 s, <= 150 wpm) · quiz pair (A1/B1 key vs C1 key) distinct and <= 20 chars · ad-safety blocklist (slang.mjs UNSAFE) on every English string · no alcohol.
import fs from 'fs';
import { fileURLToPath } from 'url';
import { unsafeIn } from './slang.mjs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url)), F = ROOT + 'content/video/teach2d/levels3.json';
export const REG = ['neutral', 'polite', 'casual', 'formal'], MIN_ITEMS = 60, SPOKEN_MAX = 24, LIM = { a: 6, b: 9, c: 10 }, MAX_VOUCH = 10;
const W = s => (String(s).match(/[A-Za-z0-9'’-]+/g) || []);
const RANK = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const NAMES = new Set(['ana', 'tom', 'sam', 'lee', 'mia', 'ben']);
const IRREG = Object.fromEntries(Object.entries({ be: 'am is are was were been', do: 'did does done', have: 'has had', get: 'got gotten', go: 'went gone', see: 'saw seen', take: 'took taken', make: 'made', say: 'said', come: 'came', give: 'gave given', meet: 'met', eat: 'ate eaten', buy: 'bought', think: 'thought', leave: 'left', feel: 'felt', tell: 'told', pay: 'paid', sit: 'sat', run: 'ran', hold: 'held', spend: 'spent', keep: 'kept', know: 'knew known', can: "can't cannot", will: "won't" }).flatMap(([b, v]) => v.split(' ').map(w => [w, b])));   // contractions ('s 're 've 'll 'd 'm n't) are stripped in stems()
// closed-class words and proper names the audited bank has no cefr row for: allowed on the A1 line (numbers, days, pronouns, question words, fixed polite words) and, with the names, on B1 / C1
const A1_FN = new Set(('my your me us him her them our their his its this that these those i you he she it we they what where when how who why and or but so to of in on at for from with by about the a an some any no not yes please thanks thank sorry hello hi goodbye bye one two three four five six seven eight nine ten twelve ' +
  'monday tuesday wednesday thursday friday saturday sunday spain wi-fi latte').split(' '));
const CHUNK_OK = ['excuse me'];   // A1 in every learner syllabus; the bank only lists the verb sense (B2)
const ALCOHOL = /\b(wine|beer|cocktail|whisky|whiskey|champagne|pub|bar tab|drinks? up|cheers)\b/i;
export function load() { return JSON.parse(fs.readFileSync(F, 'utf8')); }
// PIL-free width estimate (px at 56 px Jakarta 800) of a quiz pill label: conservative per-class widths; the quiz pill is one line inside the card, so <= 640 (gen.py levels3 + teach2d-levels3.py re-check with the real font where PIL exists)
export const pillW = s => [...s].reduce((a, c) => a + ('MWmw'.includes(c) ? 46 : /[A-Z]/.test(c) ? 38 : c === ' ' ? 16 : /[ilj.,'!?:;]/.test(c) ? 16 : 31), 0);
export const hookOf = it => `${it.title}: three levels!`;
export const norm = s => String(s).toLowerCase().replace(/[’]/g, "'");
// every spelling a bank row could carry for this token: itself, its contraction stem, inflections (same candidates as gen.py lvl_ok)
export function stems(w) {
  w = norm(w); if (IRREG[w]) return [IRREG[w], w];
  const x = w.replace(/n't$/, '').replace(/'(s|re|ve|ll|d|m)$/, '');
  return [...new Set([w, x, x.replace(/ies$/, 'y'), x.replace(/es$/, ''), x.replace(/s$/, ''), x.replace(/ied$/, 'y'), x.replace(/ed$/, ''), x.replace(/d$/, ''), x.replace(/ing$/, ''), x.replace(/ing$/, 'e'), x.replace(/(.)\1ing$/, '$1'), x.replace(/er$/, ''), x.replace(/(.)\1er$/, '$1'), x.replace(/est$/, ''), x.replace(/ly$/, ''), x.replace(/(.)\1ed$/, '$1'), IRREG[x] || x])].filter(s => s.length > 0);
}
// English text of the repo (lexicon examples, situations, slang bank, lessons / roleplay / listening / notes / framework / blog), lower-cased, punctuation -> spaces: the phrase check below searches it
export function repoText(S) {
  const slangW = new Set(), corpus = [];
  for (const it of JSON.parse(fs.readFileSync(ROOT + 'content/say-native/slang.json', 'utf8')).items) { for (const t of W(it.key)) slangW.add(norm(t)); corpus.push(it.key, it.example.text, it.mean, it.def); }
  for (const f of fs.readdirSync(ROOT + 'content/situations')) { const d = JSON.parse(fs.readFileSync(ROOT + 'content/situations/' + f, 'utf8')); for (const l of d.lines || []) corpus.push(l.en, ...Object.values(l.variants || {})); for (const l of d.dialogue || []) corpus.push(l.en); }
  for (const r of S.lex.values()) if (r[5]) corpus.push(r[5]);
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(d + '/' + e.name) : /\.(json|js|md|txt)$/.test(e.name) ? [d + '/' + e.name] : []);   // English text of lessons / roleplay / listening / notes / framework / blog
  for (const d of ['web/js/listen', 'web/js/notes', 'web/js/roleplay', 'web/js/lib', 'web/js/write', 'web/js/toeic', 'web/js/call', 'content/framework', 'content/notes-src', 'content/confidence', 'content/blog/en', 'content/seo-en', 'content/stories', 'content/say-native', 'content/lesson/path-nodes.json', 'content/lesson/stories.json'])
    if (fs.existsSync(ROOT + d)) for (const f of fs.statSync(ROOT + d).isDirectory() ? walk(ROOT + d) : [ROOT + d]) corpus.push(fs.readFileSync(f, 'utf8'));
  const text = ' ' + corpus.map(s => norm(s).replace(/[^a-z0-9' ]+/g, ' ')).join(' | ').replace(/ +/g, ' ') + ' ';
  return { slangW, text };
}
export async function check(B = load()) {
  const { sources, known } = await import(ROOT + 'scripts/scriptbank/lib.mjs'); const S = sources(), lex = new Map();
  for (const [w, r] of S.byWord) lex.set(w.toLowerCase(), r);
  const rank = w => { for (const s of stems(w)) { const r = lex.get(s); if (r && RANK.includes(r[8])) return RANK.indexOf(r[8]); } return null; };
  const { slangW, text } = repoText(S);
  const seenW = new Map(); for (const m of text.matchAll(/ ([a-z']+)(?= )/g)) seenW.set(m[1], (seenW.get(m[1]) || 0) + 1);   // a word the repo itself uses (>= 2 times) is a real word even when the bank has no row (sec, loo, lifesaver)
  const realW = w => stems(w).some(s => lex.has(s) || slangW.has(s) || (seenW.get(s) || 0) >= 2);
  const err = [], seen = new Set(), I = B.items || []; let vouched = 0;
  if (I.length < MIN_ITEMS) err.push(`need >= ${MIN_ITEMS} situations, have ${I.length}`);
  for (const it of I) {
    const k = it.id || '?', e = m => err.push(`${k}: ${m}`);
    if (!/^[a-z][a-z0-9-]+$/.test(k) || seen.has(k)) { e('id unique kebab-case'); continue; } seen.add(k);
    if (!it.title || W(it.title).length > 3) e(`title <= 3 words: ${it.title}`);
    if (!it.em || !it.chip || W(it.chip).length > 4) e('em + chip (<= 4 words)');
    if (!REG.includes(it.reg)) e(`reg ${it.reg} not in ${REG.join('|')}`);
    const L = ['a', 'b', 'c'].map(l => it[l] || {}); let spoken = W(hookOf(it)).length;
    L.forEach((x, i) => {
      const lv = 'abc'[i], T = x.text || '', ws = W(T), NM = ['A1', 'B1', 'C1'][i];
      if (!T || !x.key || !x.note) { e(`${NM} {text, key, note}`); return; }
      spoken += ws.length;
      if (ws.length > LIM[lv]) e(`${NM} line <= ${LIM[lv]} words: ${T}`);
      if (!norm(T).includes(norm(x.key)) || W(x.key).length > 4 || x.key.length > 20) e(`${NM} key inside the line, <= 4 words / 20 chars: ${x.key}`);
      if (W(x.note).length > 8) e(`${NM} note <= 8 words`);
      for (const s of [T, x.note]) { const u = unsafeIn(s) || (s.match(ALCOHOL) || [])[0]; if (u) e(`ad-safety: "${u}" in "${s}"`); }
      for (const w of ws) {
        const n = norm(w).replace(/^'+|'+$/g, ''); if (/^\d+$/.test(n) || NAMES.has(n) || n === "o'clock" || (i === 0 ? A1_FN.has(n) : (A1_FN.has(n) || CHUNK_OK.some(c => norm(T).includes(c) && c.split(' ').includes(n))))) continue;
        const r = rank(w);
        if (i === 0 && r !== 0) e(`A1 line: "${w}" is not A1 in the bank (${r === null ? 'not in the bank' : RANK[r]})`);
        if (i === 1 && !(r !== null ? r <= 2 : known(w))) e(`B1 line: "${w}" is above B1 (${r === null ? 'unknown' : RANK[r]})`);
        if (i === 2 && r === null && !known(w) && !realW(w)) e(`C1 line: "${w}" is not a real bank / NGSL / slang word`);
      }
    });
    const [a, b, c] = L; if (c.key) {
      const kw = W(c.key), single = kw.length === 1, hi = kw.some(w => (rank(w) ?? 3) >= 3);
      if (single && !hi) e(`C1 key "${c.key}" must be a chunk (>= 2 words) or a B2+ word`);
      const inRepo = text.includes(' ' + norm(c.key).replace(/[^a-z0-9' ]+/g, ' ').trim() + ' ');
      if (c.vouch) vouched++;
      if (!single && !inRepo && !c.vouch) e(`C1 key "${c.key}" not found in any repo English text (add vouch:true only for a standard phrase the repo lacks)`);
      if (single && !realW(c.key)) e(`C1 key "${c.key}" is not a bank / repo word`);
    }
    for (const x of [a, b, c]) if (x.key && pillW(x.key[0].toUpperCase() + x.key.slice(1)) > 640) e(`quiz label too wide for the pill: ${x.key}`);
    if (new Set([a.text, b.text, c.text].map(x => norm(x || '').replace(/[^a-z]/g, ''))).size < 3) e('three different lines');
    if (new Set([a.key, b.key, c.key].map(x => norm(x || ''))).size < 3) e('three different keys');
    if (spoken > SPOKEN_MAX) e(`clip budget: hook + 3 lines = ${spoken} words > ${SPOKEN_MAX}`);
    if (W(hookOf(it)).length > 5) e('hook <= 5 words');
    const u = unsafeIn(hookOf(it)); if (u) e(`ad-safety in hook: ${u}`);
  }
  if (vouched > MAX_VOUCH) err.push(`${vouched} vouched C1 phrases > ${MAX_VOUCH}: find the phrase in the repo texts or replace it`);
  return err;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const B = load(), err = await check(B);
  if (process.argv.includes('--stats')) { const by = f => Object.entries(B.items.reduce((a, x) => (a[x[f]] = (a[x[f]] || 0) + 1, a), {})).map(([k, n]) => `${k} ${n}`).join(' · '); console.log('reg: ' + by('reg') + '\nchip: ' + by('chip')); }
  if (err.length) { console.error(`✗ levels3 bank: ${err.length} lỗi\n  ` + err.slice(0, 120).join('\n  ')); process.exit(1); }
  console.log(`✓ levels3 bank OK: ${B.items.length} situations`);
}
