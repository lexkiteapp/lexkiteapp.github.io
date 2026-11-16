/* Native M4 – "Call Ama / Carlos" conformance vectors (parity P08: #/call).
 * Reference = the REAL web code, never re-implemented: web/js/call/engine.js (CallEngine: prep/depth/step/correct/slips/fluency/recap/retry/asrMode) and web/js/call.js (list, ring, turn flow, summary)
 * run in node:vm with the call scripts (calls.js, calls-exam.js, calls-lot1.js, calls-lot2.js), pron/pairs.js and characters.js, on the RECORDING DOM stub of gen-vocab.mjs. Microphone, ASR, speech, teacher rig, timers and
 * the clock are PLATFORM inputs: a recorder replaces them and what the platform would deliver (heard text, score, error code, elapsed ms) is part of each case's `input`, so the scoring/branching code runs as real code on recorded input.
 * Vectors keep DATA (rows, keys, writes, rewards, event order), never HTML. Determinism: TZ=UTC, clock = skills.now (2026-01-05T09:00:00Z), floats rounded by rigVectorText.
 * Exports callVectors() → text of vectors/call.json, callPack() → web/data/call-pack.json, callStarter() → content-pack/call-starter.json, callStringKeys(). Spec: docs/specs/native-m4-vectors.md (P08). */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { NOW } from './gen-vocab.mjs';
import { rigVectorText } from './gen-teach.mjs';
import { mk, settle, clone } from './gen-skills.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const unesc = x => (typeof x === 'string' ? x.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&') : x);
const strip = h => unesc(String(h || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());

// ---------- the files (same bundle order as web/js/app.js `call`) ----------
const PAIR_FILE = 'web/js/pron/pairs.js', CALL_FILES = ['web/js/call/calls.js', 'web/js/call/calls-exam.js', 'web/js/call/calls-lot1.js', 'web/js/call/calls-lot2.js'], ENGINE_FILE = 'web/js/call/engine.js', PAGE_FILE = 'web/js/call.js';
/** t() that keeps the KEY and its variables: "key" or "key⟦{vars}⟧" – parse with tk(). The vectors carry the Vietnamese keys exactly as the web passes them to t(). */
const RT = (k, v) => (v ? String(k) + '⟦' + JSON.stringify(v) + '⟧' : String(k));
const tk = str => { const m = /^([\s\S]*?)⟦([\s\S]*)⟧$/.exec(String(str)); if (!m) return { k: unesc(String(str)) }; const v = JSON.parse(m[2]); for (const [a, b] of Object.entries(v)) if (typeof b === 'string') { const u = unesc(b); v[a] = /⟦/.test(u) ? tk(u) : u; } return { k: unesc(m[1]), v }; };
const sbox = (extra = {}) => { const sb = { console, Math, JSON, t: RT, ...extra }; sb.self = sb; sb.window = sb; sb.globalThis = sb; vm.createContext(sb); return sb; };
const run = (sb, f) => vm.runInContext(rd(f), sb, { filename: f });
const J = x => JSON.stringify(x);

let CONTENT = null;
/** The real data + engine as the web bundle loads them (a fresh engine instance = a fresh pair index). */
function content() {
  if (CONTENT) return CONTENT;
  const sb = sbox(); for (const f of [PAIR_FILE, ...CALL_FILES, ENGINE_FILE]) run(sb, f);
  const E = sb.CallEngine, raw = clone(sb.CALLS), calls = clone(sb.CALLS).map(c => { E.prep(c); delete c._ok; delete c.turns; return c; }), P = sb.PronPairs;
  return (CONTENT = { sb, E, raw, calls, byId: Object.fromEntries(calls.map(c => [c.id, c])), contrasts: clone(P.CONTRASTS).map(c => ({ id: c.id, pairs: c.pairs, skills: c.skills || [] })) });
}
/** a fresh engine on its own sandbox (so `prep` mutations of one case never leak into another) */
function engine() { const sb = sbox(); for (const f of [PAIR_FILE, ENGINE_FILE]) run(sb, f); return sb.CallEngine; }
const fresh = o => clone(o);
const prepped = c => { const x = clone(c); delete x._ok; return x; };

// ================================================================== engine ==================================================================
function engineVectors() {
  const C = content(), by = C.byId, out = { prep: [], depth: [], step: [], correct: [], slips: [], fluency: [], recap: [], retry: [], asrMode: [] };
  const E = () => engine();
  // ---------- prep ----------
  const turns3 = { id: 'old', turns: [{ m: 'A?', o: ['a'], re: 'ok' }, { m: 'B?', o: ['b'], br: [['x', 'y']] }, { m: 'C?', o: ['c'] }], end: 'bye' };
  for (const [id, why, c] of [
    ['turns-to-nodes', 'old shape turns[] ⇒ nodes t0, t1, … chained by `next` (the last has next null); start = "t0"; every turn field is copied', turns3],
    ['nodes-no-start', 'a graph without `start` ⇒ start = the FIRST key of nodes (insertion order)', { id: 'g', nodes: { b: { m: 'B', next: 'a' }, a: { m: 'A', next: null } } }],
    ['nodes-keep-start', 'an explicit `start` is kept', { id: 'g', start: 'a', nodes: { b: { m: 'B' }, a: { m: 'A' } } }],
    ['already-prepped', 'a call that was already prepared (flag `_ok`) is returned untouched (idempotent)', { id: 'g', _ok: true, start: 'z', nodes: { a: { m: 'A' } } }],
    ['empty-turns', 'turns [] ⇒ nodes {} and start "t0" (a dangling id: the call has no turn)', { id: 'e', turns: [] }],
    ['coffee', 'a real legacy call (coffee): 6 turns become t0…t5', clone(C.raw.find(x => x.id === 'coffee'))],
  ]) { const e = E(), r = e.prep(fresh(c)); out.prep.push({ id: 'prep-' + id, why, input: c, out: { start: r.start === undefined ? null : r.start, nodeIds: Object.keys(r.nodes || {}), nexts: Object.fromEntries(Object.entries(r.nodes || {}).map(([k, n]) => [k, n.next === undefined ? null : n.next])), flag: !!r._ok } }); }
  out.prep.push({ id: 'prep-null', why: 'null/undefined call ⇒ returned as is (no error)', input: null, out: null });
  // ---------- depth ----------
  const dep = (id, why, c) => out.depth.push({ id: 'depth-' + id, why, input: c, out: E().depth(fresh(c)) });
  dep('linear', 'longest path counted in nodes: 3 linear turns = 3', turns3);
  dep('branch-longer', 'a branch target that gives a longer path wins (max over `next` and every br[2])', { nodes: { a: { m: 'A', next: 'b', br: [['x', 'r', 'c']] }, b: { m: 'B', next: null }, c: { m: 'C', next: 'd' }, d: { m: 'D' } }, start: 'a' });
  dep('cycle', 'a cycle is cut (a node already on the current path counts 0): a → b → a = 2', { nodes: { a: { m: 'A', next: 'b' }, b: { m: 'B', next: 'a' } }, start: 'a' });
  dep('dangling', 'a `next` that names a missing node counts 0', { nodes: { a: { m: 'A', next: 'zzz' } }, start: 'a' });
  dep('diamond', 'two branches that rejoin: the node after the join is counted once per path, the longest path is returned', { nodes: { a: { m: 'A', next: 'b', br: [['x', 'r', 'c']] }, b: { m: 'B', next: 'd' }, c: { m: 'C', next: 'e' }, e: { m: 'E', next: 'd' }, d: { m: 'D' } }, start: 'a' });
  dep('empty', 'no nodes ⇒ 0', { turns: [] });
  out.depth.push({ id: 'depth-all-calls', why: 'longest path of EVERY English call (the number behind "turn n/depth" and the progress % of the call flow); ports must match this table', input: { calls: C.calls.length }, out: Object.fromEntries(C.calls.map(c => [c.id, E().depth(clone(C.raw.find(x => x.id === c.id)))])) });
  // ---------- step ----------
  const S = (id, why, c, nid, text) => { const e = E(), cc = fresh(c); out.step.push({ id: 'step-' + id, why, input: { call: c.id || null, node: nid, text, ...(c.nodes && !by[c.id] ? { inlineCall: c } : {}) }, out: e.step(cc, nid, text) }); };
  const coffee = C.raw.find(x => x.id === 'coffee'), gx = { id: 'g', start: 'a', nodes: { a: { m: 'A', next: 'b', re: 'Default.', br: [['red|blue', 'A colour!', 'c'], ['stop', 'Okay.', null], ['maybe', 'Hmm.']] }, b: { m: 'B', next: null, re: 'B default' }, c: { m: 'C' } } };
  S('branch-first-match', 'the FIRST `br` whose regex matches wins: react = its line, next = its 3rd item when present', gx, 'a', 'I like Blue things');
  S('branch-null-ends', 'a branch whose next is explicitly null ends the call (null !== undefined)', gx, 'a', 'please stop now');
  S('branch-keeps-next', 'a branch without 3rd item keeps the node\'s `next`', gx, 'a', 'maybe tomorrow');
  S('default', 'no branch matches ⇒ react = node.re, next = node.next, br = -1', gx, 'a', 'nothing here');
  S('default-empty', 'a node without `re` ⇒ react "" ; a node without `next` ⇒ null', gx, 'c', 'anything');
  S('case-insensitive', 'regex flag i: "RED" matches "red"', gx, 'a', 'RED');
  S('word-start', 'the pattern is wrapped as \\b(pattern): it must START at a word boundary ("notebook" matches "no", "know" does not)', coffee, 't0', 'a notebook');
  S('word-start-no', 'the same pattern does not match inside a word ("know" has no word-start "no")', coffee, 't0', 'I know');
  S('invalid-regex', 'a broken regex ("(") is skipped (try/catch), the next branch is tried', { nodes: { a: { m: 'A', next: 'z', re: 'D', br: [['(', 'bad'], ['ok', 'good']] } }, start: 'a' }, 'a', 'ok');
  S('invalid-regex-only', 'only a broken branch ⇒ default', { nodes: { a: { m: 'A', next: 'z', re: 'D', br: [['(', 'bad']] } }, start: 'a' }, 'a', 'ok');
  S('unknown-node', 'unknown node id ⇒ { react "", next null, br -1 }', gx, 'nope', 'x');
  S('text-null', 'null text is read as ""', gx, 'a', null);
  S('legacy-turns', 'a legacy call is prepared on the fly: t0 branch "iced" answers "Iced it is!…"', clone(C.raw.find(x => x.id === 'coffee')), 't1', 'Iced, please');
  S('legacy-next', 'legacy chain: t2 default goes to t3', clone(C.raw.find(x => x.id === 'coffee')), 't2', 'Hmm');
  const es = { id: 'es-x', tl: 'es', start: 'a', nodes: { a: { m: '¿Qué prefieres?', next: 'b', re: 'Vale.', br: [['cafe|té', 'Buena elección', 'c']] } , b: { m: 'x' }, c: { m: 'y' } } };
  S('tl-fold-text', 'target language ≠ en (call.tl "es"): text AND pattern are folded (NFD, accents dropped, lower-cased) before matching: "Café" matches "cafe"', es, 'a', 'Un Café, por favor');
  S('tl-fold-pattern', 'the pattern is folded too: "té" matches "te"', es, 'a', 'te');
  // ---------- correct ----------
  const CR = [
    ['agree', 'RULE 1 – "I am agree" ⇒ "I agree" (am/are/\'m/\'re before agree)', 'I am agree with you', ''],
    ['doesnt', 'RULE 2 – he/she/it + don\'t ⇒ doesn\'t', 'She don\'t like coffee', ''],
    ['modal-to', 'RULE 3 – can/could/should/will/must + to ⇒ drop "to"', 'I can to help you', ''],
    ['more-better', 'RULE 4 – "more better" ⇒ "better" (also easier/faster/bigger/cheaper/closer/worse)', 'This is more better', ''],
    ['uncountable', 'RULE 5 – uncountable noun with -s / many / an: "informations" ⇒ "information", "many advices" ⇒ "a lot of advice", "too many homeworks" ⇒ "too much homework", "an equipment" ⇒ "equipment"', 'I need informations and many advices and an equipment, too many homeworks', ''],
    ['very-like', 'RULE 6 – "I very like" ⇒ "I really like"', 'I very like this place', ''],
    ['want-to', 'RULE 7 – want/need/would like/\'d like + bare verb ⇒ add "to" (only the FIRST occurrence of a rule is replaced: the regex has no g flag, so "I need buy" stays)', 'I want go home and I need buy bread', ''],
    ['article-job', 'RULE 8 – "I\'m engineer" ⇒ "I\'m an engineer" (a before a consonant, an before a vowel; only the first occurrence)', 'I am engineer and I\'m teacher', ''],
    ['third-person', 'RULE 9 – he/she + base verb ⇒ -s form (S3 table: go→goes, have→has, study→studies…); not after a modal/did/does/do/to/let/make/help', 'He go to work and she study English', ''],
    ['third-person-modal', 'RULE 9 does NOT apply after a modal or "to": "can she go", "to he go" stay as typed', 'Can she go with us? I want to let she go', ''],
    ['past-own', 'RULE 10/11 need a past marker in the learner\'s OWN sentence (yesterday, last week/…, ago, in 19xx/20xx): "have + V3" ⇒ simple past', 'I have seen him yesterday', ''],
    ['past-own-been', 'RULE 10: "have been" ⇒ was/were (I/he/she/it ⇒ was)', 'We have been there last year', ''],
    ['past-own-no-marker', 'no past marker in the learner\'s sentence ⇒ rule 10 does not apply (even when the QUESTION is in the past): "I have done it" stays', 'I have done it', 'What did you do?'],
    ['past-prompt', 'RULE 11 also applies when only the PROMPT is in the past (did you / how was / what did / yesterday / last night|week|weekend): "I go to the park" ⇒ "I went"', 'I go to the park with my friends', 'What did you do?'],
    ['past-prompt-no-own', 'RULE 12 (3rd person -s ⇒ past, e.g. "he goes") needs the learner\'s OWN past marker – a past prompt alone is not enough', 'He goes to school', 'How was your day?'],
    ['past-own-3rd', 'RULE 12 – he/she/it + present -s verb ⇒ past when the learner marks the past himself', 'Yesterday he goes to school and she likes it', ''],
    ['past-keep-aux', 'RULE 11 (prompt in the past, no own marker) keeps "have" as an auxiliary before a participle ("I have done" is not turned into "had") and does not touch a verb right after a modal/did ("Did I go")', 'I have done it. Did I go?', 'What did you do?'],
    ['keep-case', 'capitalised verbs keep their capital', 'Yesterday We go home. He Go there', ''],
    ['several-rules', 'EVERY rule is applied in order on the running text (not only the first): bad = original, good = all fixes, why = first reason, whys = every distinct reason', 'I am agree and I want go yesterday', ''],
    ['already-ok', 'a correct sentence ⇒ null', 'I would like a medium latte, please.', ''],
    ['empty', 'empty text ⇒ null', '', ''],
  ];
  for (const [id, why, text, prompt] of CR) out.correct.push({ id: 'correct-' + id, why, input: { text, prompt }, out: E().correct(text, prompt) });
  // ---------- slips ----------
  const sl = (id, why, text, call, node) => out.slips.push({ id: 'slips-' + id, why, input: { text, call, node }, out: E().slips(text, call, node) });
  sl('bread-breast', 'the recogniser heard "breast" while the topic word is "bread" (pair bread/breast of EXTRA, id final-drop): { said, meant, id, skill } with skill = first skill of that contrast in PronPairs (else "final-consonants")', 'I like breast with butter', { words: ['bread', 'butter'] }, { m: 'What do you eat?' });
  sl('keyword-node', 'expected words = node.kw + call.words + words of node.o with ≥ 5 letters and not in STOP', 'I put it on the desk', { words: [] }, { kw: ['dress'], o: ['I like it'] });
  sl('from-hints', 'words (≥ 5 letters) of the suggested answers also count as expected', 'We will go to the ship', { words: [] }, { kw: [], o: ['Where are the sheep today'] });
  sl('already-said', 'the expected word was also said ⇒ no slip', 'bread and breast', { words: ['bread'] }, {});
  sl('stem-variant', 'a variant of the expected word (same stem: lives ~ live) is not a slip', 'She lives here', { words: ['live'] }, {});
  sl('max-two', 'at most 2 slips are reported (in order of heard words)', 'I think ship rice west', { words: ['sink', 'sheep', 'lice', 'vest'] }, {});
  sl('same-meant-once', 'one `meant` word is reported once', 'rice rice price', { words: ['lice', 'prize'] }, {});
  sl('no-pair', 'a heard word with no pair ⇒ []', 'hello world', { words: ['bread'] }, {});
  sl('empty', 'no text / no call ⇒ []', '', null, null);
  sl('contrast-skill', 'the skill comes from the contrast that owns the pair: "think" said for "sink" (th-s)', 'I sink so', { words: ['think'] }, {});
  // ---------- fluency ----------
  const fl = (id, why, text, n, secs, tl) => out.fluency.push({ id: 'fluency-' + id, why, input: { text, node: n, secs, tl: tl || null }, out: E().fluency(text, n, secs, tl) });
  fl('plain', 'words = tokens [a-z][a-z\']* (curly apostrophes folded); wpm = round(words/secs·60) when secs > 1', 'I like to read books at home', { min: 4 }, 6);
  fl('short', 'short = node.min set AND words < min', 'Yes please', { min: 5 }, 3);
  fl('min-zero', 'min 0 / absent ⇒ never short', 'Yes', { min: 0 }, 3);
  fl('fillers', 'fillers (um, uhh, er, erm, hmm, you know) are counted and REMOVED from words: words = tokens − fillers', 'Um I think uh you know it is good', {}, 6);
  fl('link', 'link = a connective of LINK present (because, so, but, although, though, however, for example, for instance, actually, also, then, which, when, if, while, instead, especially)', 'I stay home because it rains', {}, 0);
  fl('no-link', 'no connective ⇒ link false', 'I stay home', {}, 0);
  fl('secs-one', 'secs ≤ 1 ⇒ wpm 0 (too short to measure)', 'one two three', {}, 1);
  fl('empty', 'empty text ⇒ zeros', '', {}, 5);
  fl('curly', 'curly apostrophes are folded: "don’t" is one word', 'I don’t know', {}, 2);
  fl('tl-es', 'target language es: accents folded, es fillers (eh, em, mm, o sea) and es connectives (porque, pero, entonces, aunque, además, también, por ejemplo, cuando, mientras, sin embargo, por eso, ya que, así que) are used', 'Eeh yo quiero café porque tengo sueño', { min: 3 }, 4, 'es');
  fl('tl-es-nolink', 'es text without a connective', 'Yo quiero café', {}, 3, 'es');
  // ---------- recap ----------
  const RC = (id, why, call, log) => { const c = typeof call === 'string' ? by[call] : call, e = E(), r = e.recap(fresh(c), clone(log)); out.recap.push({ id: 'recap-' + id, why, input: { call: typeof call === 'string' ? call : call.id, ...(typeof call === 'string' ? {} : { inlineCall: call }), log }, out: r }); return r; };
  const p1 = by['ielts-p1-home'], ids1 = Object.keys(p1.nodes), good = Object.fromEntries(Object.entries(p1.nodes).map(([k, n]) => [k, (n.o || ['x'])[0]]));
  const LG = (ids, mode) => ids.map(id => ({ id, text: good[id], picked: mode === 'picked', secs: 10 }));
  RC('all-good', 'every turn answered with its model sentence: not weak, score 100, band "great" (done 1 · share 1 · clean 1 ⇒ 40+20+20+20)', 'ielts-p1-home', LG(ids1));
  RC('all-picked', 'every answer picked from the suggestions: nothing spoken ⇒ note "speak", no fluency notes, weak none (picked turns are never weak), score = 40 + done·20 + 0 + 0', 'ielts-p1-home', LG(ids1, 'picked'));
  RC('empty-log', 'no turns ⇒ score 0, no notes, band "keep"', 'ielts-p1-home', []);
  RC('all-weak', 'every spoken answer is weak (too short): clean 0 ⇒ score = 40 + done·20 + share·20', 'ielts-p1-home', ids1.slice(0, 2).map(id => ({ id, text: 'yes', picked: false, secs: 2 })));
  RC('floor-40', 'score floor: 40 is the base of the formula and max(40, …) clamps it, so a learner who tried scores at least 40 (here: ONE tapped suggestion = 40 + 20/depth(7) ⇒ 43; never 0 once a turn exists)', 'ielts-p1-home', LG(ids1.slice(0, 1), 'picked'));
  // band edges: search the (turns, spoken, weak) space of the call for the scores 69/70/84/85 and keep the first log of each
  { const k = Math.max(1, E().depth(clone(p1))), found = {}, bad = id => ({ id, text: 'yes', picked: false, secs: 5 }), okT = id => ({ id, text: good[id], picked: false, secs: 12 }), pk = id => ({ id, text: good[id], picked: true, secs: 0 });
    for (let n = 1; n <= ids1.length; n++) for (let s = 0; s <= n; s++) for (let w = 0; w <= s; w++) { const lg = ids1.slice(0, n).map((id, i) => (i < w ? bad(id) : i < s ? okT(id) : pk(id))), r = E().recap(clone(p1), clone(lg)); if (!found[r.score]) found[r.score] = { lg, r }; }
    for (const sc of [69, 70, 84, 85]) { const f = found[sc] || found[sc - 1] || found[sc + 1]; if (f) { const r = RC('edge-' + f.r.score, `band edges: score ${f.r.score} ⇒ "${f.r.band}" (≥ 85 great, ≥ 70 good, else keep); score = round(max(40, min(100, 40 + 20·turns/depth + 20·spoken/turns + 20·clean/spoken)))`, 'ielts-p1-home', f.lg); } } }
  RC('weak-fix', 'a grammar fix makes the turn weak (fix = Engine.correct on the learner text vs the teacher line); weak ids list those turns; model = first suggestion', 'ielts-p1-home', [{ id: 'name', text: 'My name is Linh and I am agree', picked: false, secs: 6 }, { id: 'job', text: good.job, picked: false, secs: 10 }]);
  RC('picked-vs-spoken', 'picked turns (tapped suggestion) are never corrected, never weak and do not count as spoken; spoken/picked counters', 'ielts-p1-home', [{ id: 'name', text: good.name, picked: true }, { id: 'job', text: good.job, picked: false, secs: 9 }]);
  RC('asr-ignored', 'the recogniser score (asr 0–100) is NOT used: a free sentence that differs from the model is still a good one (asr 12 ⇒ not weak)', 'ielts-p1-home', [{ id: 'name', text: 'My name is Linh Nguyen and I come from Hue.', picked: false, secs: 6, asr: 12 }]);
  RC('note-short', 'note "short" {n}: spoken answers below node.min words', 'ielts-p1-home', [{ id: 'job', text: 'I study', picked: false, secs: 4 }, { id: 'name', text: 'Linh', picked: false, secs: 3 }]);
  RC('note-link', 'note "link": ≥ 2 spoken turns, exam call (c.exam starts with "ielts") and NO connective in any spoken answer', 'ielts-p1-home', [{ id: 'name', text: 'My name is Linh Nguyen and people call me Linh', picked: false, secs: 6 }, { id: 'job', text: 'I am a student at a university in Hanoi now', picked: false, secs: 7 }]);
  RC('note-link-everyday', 'the "link" note is for IELTS calls only: the same answers in an everyday call give none', 'hobbies', [{ id: 'hi', text: 'I like to read books and listen to music', picked: false, secs: 6 }, { id: 'often', text: 'About twice a week in the evening', picked: false, secs: 6 }]);
  RC('note-fillers', 'note "fillers" {n}: ≥ 20 real words AND fillers / words > 0.08', 'ielts-p1-home', [{ id: 'job', text: 'Um I work uh in a bank and um I really enjoy it you know because the people are kind and the work is good er yes', picked: false, secs: 30 }]);
  RC('note-fillers-low', 'fillers ≤ 8 % (or fewer than 20 words) ⇒ no "fillers" note', 'ielts-p1-home', [{ id: 'job', text: 'Um I work in a bank and I really enjoy it because the people are kind and the work is good yes', picked: false, secs: 30 }]);
  RC('note-slips', 'note "slips": at least one spoken turn has a slip (rice said for the topic word lice is not expected here; use bread/breast in a call with the word "bread")', { id: 'x', who: 'ama', exam: 'everyday', words: ['bread', 'butter'], start: 'a', nodes: { a: { m: 'What do you eat?', o: ['I like bread with butter.'], min: 3 } } }, [{ id: 'a', text: 'I like breast with butter for breakfast', picked: false, secs: 8 }]);
  RC('note-slow', 'note "slow" {wpm}: mean wpm of the spoken turns that have one (> 0) is below 70', 'ielts-p1-home', [{ id: 'name', text: 'My name is Linh Nguyen and people call me Linh', picked: false, secs: 20 }]);
  RC('slow-boundary-70', 'wpm 70 is NOT slow (the note needs < 70): 10 words in 8.5714 s', 'ielts-p1-home', [{ id: 'name', text: 'My name is Linh Nguyen and people call me Linh', picked: false, secs: 8.5714 }]);
  RC('slow-boundary-69', 'wpm 69 IS slow: 10 words in 8.7 s', 'ielts-p1-home', [{ id: 'name', text: 'My name is Linh Nguyen and people call me Linh', picked: false, secs: 8.7 }]);
  RC('note-good', 'no other note and at least one spoken turn ⇒ the single note "good"', 'ielts-p1-home', [{ id: 'name', text: good.name + ' because it is easy to remember', picked: false, secs: 6 }, { id: 'job', text: 'I work as a sales assistant in a bank, and I really enjoy it.', picked: false, secs: 7 }]);
  RC('used-words', 'topic words used: every word of c.words (lower-cased, de-duplicated; multi-word entries need every part) found among the spoken words after stemming (plural/-ed/-ing/-es/-ies stripped); picked turns do not count', 'hobbies', [{ id: 'hi', text: 'I like reading books in my free time and I play often', picked: false, secs: 8 }, { id: 'often', text: 'I draw every weekend', picked: true }]);
  RC('words-uniq', 'words = sum of spoken real words, uniq = distinct spoken word count; fillers excluded from words', 'ielts-p1-home', [{ id: 'name', text: 'Um my name is Linh my name is Linh', picked: false, secs: 6 }]);
  RC('unknown-node', 'a log id that is not a node of the call is tolerated (no model, no min): m undefined', 'ielts-p1-home', [{ id: 'nope', text: 'Hello there my friend', picked: false, secs: 5 }]);
  { const esC = { id: 'es-x', tl: 'es', who: 'ama', exam: 'everyday', words: ['café', 'queso'], start: 'a', nodes: { a: { m: '¿Qué quieres?', o: ['Quiero un café.'], min: 3 } } };
    RC('tl-es', 'target language es: NO grammar fix and NO slips (English-only rules); fluency/words use the folded es tables; target words compared folded', esC, [{ id: 'a', text: 'Quiero un café porque tengo sueño', picked: false, secs: 5 }]); }
  RC('retry-call', 'a retry call (retry:true, only the weak nodes) is scored over ITS OWN depth', (() => { const c = E().retry(E().prep(clone(p1)), ['name', 'job']); delete c._ok; return c; })(), [{ id: 'name', text: good.name, picked: false, secs: 6 }, { id: 'job', text: good.job, picked: false, secs: 8 }]);
  // ---------- retry ----------
  const rt = (id, why, c, ids) => { const e = E(), r = e.retry(e.prep(fresh(c)), ids); out.retry.push({ id: 'retry-' + id, why, input: { call: c.id, ids }, out: prepped(r) }); };
  rt('two-nodes', 'retry(call, ids): only those nodes, chained in the given order (next of the last = null); each node keeps m/o/min/kw/re; branches keep [regex, line] but lose their 3rd item; start = first id; retry:true', by['ielts-p1-home'], ['job', 'name']);
  rt('dedupe-unknown', 'duplicate ids are collapsed (first wins) and ids that are not nodes are dropped', by['ielts-p1-home'], ['job', 'job', 'zzz', 'name']);
  rt('long-node', 'a long/prep/cue node keeps those fields', by['ielts-p2-place'], ['intro', 'talk']);
  rt('empty', 'no (valid) ids ⇒ no nodes and start undefined', by['ielts-p1-home'], ['zzz']);
  // ---------- asrMode ----------
  const rule = e => (e.pref === 'tap' ? 'pref tap ⇒ tap' : e.local && e.sr ? 'local+sr ⇒ local' : e.pref === 'cloud' && e.sr ? 'pref cloud+sr ⇒ cloud' : e.media && !e.ext ? (e.whisper ? 'media+whisper ⇒ whisper' : e.pref === 'device' ? 'media+pref device ⇒ whisper' : 'media only ⇒ ask') : e.sr ? (e.pref === 'cloud' ? 'sr, pref cloud ⇒ cloud' : 'sr only ⇒ ask') : 'nothing ⇒ tap');
  for (const pref of [null, 'device', 'cloud', 'tap']) for (const local of [false, true]) for (const sr of [false, true]) for (const media of [false, true]) for (const ext of [false, true]) for (const whisper of [false, true]) {
    const env = { local, sr, media, ext, whisper, pref }; out.asrMode.push({ id: `asr-${pref || 'none'}-${+local}${+sr}${+media}${+ext}${+whisper}`, why: rule(env), input: env, out: E().asrMode(env) }); }
  out.asrMode.push({ id: 'asr-empty', why: 'no env at all ⇒ tap', input: {}, out: E().asrMode() });
  // native: the web probes a browser; a port feeds { local: on-device recogniser available, sr: some recogniser exists (on-device or system service), media: false (no Whisper path), ext: false, whisper: false }
  const nat = [];
  for (const pref of [null, 'device', 'cloud', 'tap']) for (const onDevice of [true, false]) for (const system of [true, false]) { if (onDevice && !system) continue; const env = { local: onDevice, sr: system, media: false, ext: false, whisper: false, pref }; nat.push({ id: `native-${pref || 'none'}-${+onDevice}${+system}`, why: onDevice ? (pref === 'tap' ? 'native: learner chose tap ⇒ tap even with an on-device recogniser' : 'native: on-device recogniser available ⇒ local (private, no ask)') : system ? (pref === 'tap' ? 'native: pref tap ⇒ tap' : pref === 'cloud' ? 'native: only the system (cloud) recogniser and the learner accepted it ⇒ cloud' : 'native: only the system recogniser, nothing chosen ⇒ ask the learner (device/pref "device" has no Whisper on native ⇒ also ask)') : 'native: no recogniser at all ⇒ tap', input: { onDevice, system, pref }, out: E().asrMode(env) }); }
  out.asrModeNative = nat;
  return out;
}

// ================================================================== page harness (web/js/call.js) ==================================================================
/** One web "install" for #/call: the real call.js + engine + data + characters.js on the recording DOM. Platform = recorders: recognizer (UI.recognize), teacher rig (LessonTeacher.mount), tts, toasts, timers. */
const CALL_PAGE_FILES = ['web/js/characters.js', PAIR_FILE, ...CALL_FILES, ENGINE_FILE];
async function cpg(o = {}) {
  const rec = { recog: [], stopSpeak: 0, tch: [], words: [], hash: [], ttsFallback: [] }, env = o.env || {};
  let P;
  P = await mk({ hash: '#/call', lang: o.lang || 'en', ls: o.ls, files: CALL_PAGE_FILES,
    ui: { recognize: (target, accent, cb) => { const h = { target, accent, cb: cb || {}, stopped: false }; rec.recog.push(h); return { stop() { h.stopped = true; } }; }, stopSpeak() { rec.stopSpeak++; }, recErrorText: c => 'recErrorText(' + c + ')', ring: (p, l) => `<div class="ring">${l}</div>`,
      tts: (text, accent, rate, op) => { rec.ttsFallback.push({ text, accent, rate: rate ?? null, voice: op && op.voice }); }, ...(o.ui || {}) },
    sets: sb => {
      sb.t = RT; sb.window.t = RT; sb.CSS = { escape: s => String(s) };
      sb.App.cleanups = []; sb.App.ux1On = () => true; sb.App.need = async () => {};
      sb.App.addWord = async (entry, ctx, op) => { rec.words.push({ entry: clone(entry), ctx: clone(ctx), opts: clone(op) }); };
      Object.defineProperty(sb.location, 'hash', { get: () => rec.cur || '#/call', set: v => { rec.hash.push(String(v)); rec.cur = String(v); }, configurable: true });
      // capabilities the probe looks at
      if (env.sr) { sb.SpeechRecognition = class { }; sb.SpeechRecognition.prototype.processLocally = false; sb.SpeechRecognition.available = async () => (env.local ? 'available' : env.localDl ? 'downloadable' : 'unavailable'); if (env.localDl) sb.SpeechRecognition.install = async () => true; sb.SpeechRecognitionPhrase = class { constructor(phrase, boost) { this.phrase = phrase; this.boost = boost; } }; }
      if (env.media) { sb.navigator.mediaDevices = {}; sb.MediaRecorder = class { }; }
      if (env.ext) sb.Core.Store.isExtension = true;
      // Stitch teacher-call frame: the page runs its v2 path (this is the one that ships); mount data is recorded, the teacher rig is a recorder
      sb.ST2 = { 'teacher-call': true, mount: (view, name, d) => { rec.mount = { name, data: Object.fromEntries(['pct', 'title', 'lv', 'who', 'tip', 'micLbl', 'canTr', 'showTr', 'trLbl'].map(k => [k, typeof d[k] === 'string' && /^[^<]*$/.test(d[k]) ? (k === 'title' || k === 'tip' || k === 'micLbl' || k === 'trLbl' ? tk(d[k]) : d[k]) : d[k]])) }; for (const k of ['#cYou', '#cClock', '#cLongN', '#cPct']) P.$(k).textContent = ''; P.$('#cCue').innerHTML = ''; P.opts.innerHTML = ''; P.ask.innerHTML = ''; P.__logN = 0; P.__you = ''; P.__opts = null; return P.E.dom.mkEl('.v2s-teacher-call'); } };
      sb.LessonTeacher = { prep() { rec.tch.push({ ev: 'prep' }); }, mount: (host, who, op) => ({ say(text, x) { rec.tch.push({ ev: 'say', text, voice: x && x.voice, accent: x && x.accent }); }, listen(on) { rec.tch.push({ ev: 'listen', on: !!on }); }, react(name, ms) { rec.tch.push({ ev: 'react', pose: name, ms }); }, stop() {}, destroy() {}, lip: null }), VOICE: {} };
      if (o.sets) o.sets(sb);
    }, late: [PAGE_FILE] });
  P.rec = rec; const dom = P.E.dom;
  // observable elements (setters record every write): phase (class), status text, mic label, tip box, progress
  const phases = [], rw = (el, prop, fn) => { let v = el[prop]; Object.defineProperty(el, prop, { get: () => v, set: x => { v = x; fn(x); }, configurable: true }); };
  const st = dom.mkEl('#cSt'); rw(st, 'className', x => phases.push(String(x).split(' ').pop())); dom.resolve('#cSt', () => st);
  const stT = dom.mkEl('#cStT'); const stx = []; rw(stT, 'textContent', x => stx.push(tk(x))); dom.resolve('#cStT', () => stT);
  const tip = dom.mkEl('#cTipT'); const tips = []; rw(tip, 'textContent', x => tips.push({ text: tk(x) })); rw(tip, 'innerHTML', x => tips.push({ html: x })); dom.resolve('#cTipT', () => tip);
  const l1 = dom.mkEl('#cL1'); l1.children = []; l1.append = x => l1.children.push(x); dom.resolve('#cL1', () => l1);
  const cue = dom.mkEl('#cCue'); rw(cue, 'innerHTML', () => { dom.$('#cClock').textContent = ''; dom.$('#cLongN').textContent = ''; }); dom.resolve('#cCue', () => cue);
  const opts = dom.mkEl('#cOpts'), optEls = new Map(); dom.resolve('#cOpts', () => opts);
  dom.resolveList('[data-o]', () => { const h = opts.innerHTML; if (!optEls.has(h)) optEls.set(h, [...String(h).matchAll(/data-o="(\d+)"/g)].map(m => { const b = dom.mkEl('o'); b.dataset.o = m[1]; return b; })); return optEls.get(h); });
  const ask = dom.mkEl('#cAsk'), askEls = new Map(); dom.resolve('#cAsk', () => ask);
  dom.resolveList('[data-a]', () => { const h = ask.innerHTML; if (!askEls.has(h)) askEls.set(h, [...String(h).matchAll(/data-a="(\w+)"/g)].map(m => { const b = dom.mkEl('a'); b.dataset.a = m[1]; return b; })); return askEls.get(h); });
  const gb = []; dom.resolveList('[data-g]', () => { const h = P.view.innerHTML; if (P.__gh !== h) { P.__gh = h; P.__ge = [...h.matchAll(/data-g="(\w+)"/g)].map(m => { const b = dom.mkEl('g'); b.dataset.g = m[1]; return b; }); } return P.__ge; });
  P.phases = phases; P.stx = stx; P.tips = tips; P.l1 = l1; P.opts = opts; P.ask = ask; P.gb = gb;
  const mic = dom.mkEl('#cMic'); P.micAttr = {}; mic.setAttribute = (k, v) => { P.micAttr[k] = v; }; dom.resolve('#cMic', () => mic);
  return P;
}
const drain = async P => { for (let i = 0; i < 12; i++) { await settle(8); const l = P.ctl.long.splice(0); if (!l.length) break; for (const f of l) f(); } };
const callOf = id => content().byId[id];
/** run the 500 ms tick of call.js (prep/long countdown, elapsed clock) after advancing the fake clock */
const tickMs = async (P, ms) => { const iv = P.sb._intervals.filter(x => x.ms === 500).at(-1); for (let left = ms; left > 0 && iv;) { const d = Math.min(500, left); left -= d; P.E.clock.t += d; iv.f(); if (P.sb.__callState().phase === 'think') { P.E.clock.t += left; break; } } if (!iv) P.E.clock.t += ms; await drain(P); };

// ---------- parsing the data the page produced (never the HTML) ----------
const phr = h => { const m = /^(🔒|☁️|⌨️) ([\s\S]*)$/.exec(unesc(h)); return m ? { icon: m[1], ...tk(m[2]) } : tk(unesc(h)); };
const cardsOf = h => [...h.matchAll(/<a class="call-card" href="#\/call\/([^"]*)"><img[^>]*alt="" [^>]*><span><b>([^<]*)<\/b><span class="tiny muted"><span class="chip lv">([^<]*)<\/span> ([^ ]*) · <span lang="en">([^<]*)<\/span>/g)].map(m => { const i = m[2].indexOf(' '); return { id: m[1], em: m[2].slice(0, i), name: tk(m[2].slice(i + 1)), lv: m[3], who: m[4], title: unesc(m[5]) }; });
const listOut = (h, priv, full) => ({ title: tk(unesc(/<h1>📞 ([^<]*)<\/h1>/.exec(h)[1])), intro: tk(unesc(/<p class="muted">([\s\S]*?)<\/p>/.exec(h)[1])), filter: { label: (m => (m ? tk(unesc(m[1])) : null))(/aria-label="([^"]*)">/.exec(h)), buttons: [...h.matchAll(/<button type="button" class="btn sm (primary)?\s*" data-g="(\w+)" aria-pressed="(true|false)">([^<]*)<\/button>/g)].map(m => ({ group: m[2], pressed: m[3] === 'true', label: m[2] === 'all' ? tk(unesc(m[4])) : m[2] === 'ielts' ? { k: 'IELTS' } : m[2] === 'toeic' ? { k: 'TOEIC' } : tk(unesc(m[4])) })) }, ...(full ? { cards: cardsOf(h) } : { cardIds: cardsOf(h).map(c => c.id) }), privacy: phr(priv || /<span id="callPriv">([^<]*)<\/span>/.exec(h)[1]), changeAsr: /id="callAsr"/.test(h) ? tk(unesc(/id="callAsr">([^<]*)</.exec(h)[1])) : null });
const ringOut = (h, priv) => ({ title: tk(unesc(/<h1>📞 ([^<]*)<\/h1>/.exec(h)[1])), lv: /<span class="chip lv">([^<]*)<\/span> <span lang="en">([^<]*)<\/span>/.exec(h).slice(1, 3).map(unesc), teacher: unesc(/<b>([^<]*)<\/b> – <span lang="en">([^<]*)<\/span>/.exec(h)[1]), role: unesc(/<b>[^<]*<\/b> – <span lang="en">([^<]*)<\/span>/.exec(h)[1]), privacy: phr(priv || /id="callPriv">([^<]*)</.exec(h)[1]), buttons: [{ id: 'callGo', label: tk(unesc(/id="callGo">📞 ([^<]*)</.exec(h)[1])) }, { href: '#/call', label: tk(unesc(/<a class="btn" href="#\/call">([^<]*)</.exec(h)[1])) }] });
const cueOf = h => (!h ? null : { kind: /call-clock/.test(h) && /id="cLongDone"/.test(h) ? 'long' : 'prep', title: (m => (m ? (/lang=/.test(m[0]) ? { text: unesc(m[1]) } : tk(unesc(m[1]))) : null))(/<b(?: lang="en")?>([^<]*)<\/b>/.exec(h)), points: [...h.matchAll(/<li>([^<]*)<\/li>/g)].map(m => unesc(m[1])), hint: (m => (m ? tk(unesc(m[1])) : null))(/<div class="tiny" style="opacity:\.8;margin-top:\.3rem">([^<]*)<\/div>/.exec(h)), done: (m => (m ? tk(unesc(m[1]).replace(/^✓ /, '')) : null))(/id="cLongDone">([^<]*)</.exec(h)) });
const optsOf = h => [...String(h).matchAll(/<button type="button" data-o="\d+" lang="en"[^>]*>([^<]*)<\/button>/g)].map(m => unesc(m[1]));
const askOf = h => (!h ? null : { title: tk(unesc(/<b>🎙️ ([^<]*)<\/b>/.exec(h)[1])), choices: [...h.matchAll(/data-a="(\w+)"[^>]*>(🔒|☁️|⌨️) ([^<]*)</g)].map(m => ({ id: m[1], icon: m[2], ...tk(unesc(m[3])) })) });
const tipOf = L => { const l = L.at(-1); if (!l) return null; if (l.html) { const m = /<s>([^<]*)<\/s> → <b>([^<]*)<\/b><\/span> <span class="block [^"]*">([^<]*)<\/span>/.exec(l.html); return m ? { kind: 'fix', bad: unesc(m[1]), good: unesc(m[2]), why: tk(unesc(m[3])) } : { kind: 'html', html: l.html }; } const k = l.text.k || ''; return /^👂 /.test(k) ? { kind: 'slip', ...tk(k.replace(/^👂 /, '') + (l.text.v ? '⟦' + JSON.stringify(l.text.v) + '⟧' : '')) } : { kind: 'default', ...l.text }; };

const SNAPKEYS = ['id', 'phase', 'turn', 'mode'];
/** what the learner sees / what the platform was asked to do after one action (everything since the previous snapshot) */
function snap(P, label, input, mark) {
  const st = P.sb.__callState ? P.sb.__callState() : null, d = { step: label, input };
  const ev = P.rec.tch.slice(mark.tch), toasts = (P.sb._toasts || []).slice(mark.toast);
  const view = P.view.innerHTML;
  if (/Tổng kết cuộc gọi/.test(view) && mark.view !== view) d.summary = summaryOut(view, P);
  else { d.say = ev.filter(e => e.ev === 'say').map(e => e.text); d.react = ev.filter(e => e.ev === 'react').map(e => ({ pose: e.pose, ms: e.ms })); }
  d.phases = P.phases.slice(mark.phases).filter((x, i, a) => x !== a[i - 1]); d.status = P.stx.length > mark.stx ? P.stx.at(-1) : undefined;
  if (st) { d.state = { node: st.id, phase: st.phase, mode: st.mode, logged: st.log.length }; if (st.log.length < (P.__logN || 0)) P.__logN = 0; d.log = st.log.slice(P.__logN || 0).map(x => ({ id: x.id, text: x.text, picked: x.picked, secs: x.secs == null ? null : Math.round(x.secs * 1000) / 1000, ...(x.asr != null ? { asr: x.asr } : {}), ...(x.typed ? { typed: true } : {}) })); P.__logN = st.log.length; }
  { const y = P.$('#cYou').textContent; if (y !== (P.__you || '')) d.you = y; P.__you = y; } d.tip = P.tips.length > mark.tips ? tipOf(P.tips.slice(mark.tips)) : undefined; { const o2 = optsOf(P.opts.innerHTML); if (J(o2) !== J(P.__opts)) d.options = o2; P.__opts = o2; } d.cue = cueOf(P.$('#cCue').innerHTML); d.ask = askOf(P.ask.innerHTML);
  d.progress = P.$('#cPct').textContent || null; d.clock = d.cue ? P.$('#cClock').textContent || null : null; d.longWords = d.cue && P.$('#cLongN').textContent ? tk(P.$('#cLongN').textContent) : null; { const ml = P.micAttr['aria-label'] ? tk(P.micAttr['aria-label']) : null; if (J(ml) !== J(P.__ml)) d.micLabel = ml; P.__ml = ml; }
  d.recognizer = P.rec.recog.slice(mark.recog).map(h => ({ target: h.target.length > 70 ? h.target.slice(0, 70) + '…' : h.target, ...(h.target.length > 70 ? { targetChars: h.target.length } : {}), accent: h.accent, ...(h.cb.whisper ? { whisper: true, maxMs: h.cb.maxMs } : {}), setup: (h.cb.setup ? (() => { const r = { phrases: [] }; h.cb.setup(r); return { processLocally: r.processLocally, continuous: r.continuous === undefined ? null : r.continuous, phrases: r.phrases.map(x => x.phrase), boost: r.phrases[0] ? r.phrases[0].boost : null }; })() : null) }));
  d.toasts = toasts.map(x => (/^recErrorText\((.*)\)$/.test(x) ? { recError: /^recErrorText\((.*)\)$/.exec(x)[1] } : tk(x)));
  d.rewards = P.calls.rewards.slice(mark.rewards); d.writes = P.writes.slice(mark.writes).filter(w => w.store === 'localStorage').map(w => ({ key: w.key, value: w.value })); d.hash = P.rec.hash.slice(mark.hash);
  if (P.rec.words.length > mark.words) d.cards = P.rec.words.slice(mark.words);
  for (const k of Object.keys(d)) if (d[k] === undefined || d[k] === null || (Array.isArray(d[k]) && !d[k].length && !['say', 'phases'].includes(k))) delete d[k];
  return d;
}
const markOf = P => ({ tch: P.rec.tch.length, toast: (P.sb._toasts || []).length, rewards: P.calls.rewards.length, writes: P.writes.length, hash: P.rec.hash.length, words: P.rec.words.length, recog: P.rec.recog.length, phases: P.phases.length, stx: P.stx.length, tips: P.tips.length, view: P.view.innerHTML });

function summaryOut(h, P) {
  const sub = /<p class="muted">([\s\S]*?)<\/p><\/div><\/div>/.exec(h)[1].split(' · ').map(unesc), tx = h.split('<div class="call-tx').slice(1).map(b => {
    const q = /<b>([^<]*):<\/b> ([^<]*)<\/div>/.exec(b), a = /<div class="a" lang="en"><b>([^<]*):<\/b> ([^<]*?)(?: <span class="chip">([^<]*)<\/span>)?<\/div>/.exec(b), fx = /<s>([^<]*)<\/s> → <b>([^<]*)<\/b><\/span> <span class="muted">([^<]*)<\/span>/.exec(b), mdl = /Câu mẫu: <span lang="en">([^<]*)<\/span>/.exec(b);
    return { weak: /^ weak/.test(b), teacher: q[1], question: unesc(q[2]), answer: unesc(a[2]), picked: !!a[3], fix: fx ? { bad: unesc(fx[1]), good: unesc(fx[2]), why: tk(unesc(fx[3])) } : null,
      slips: [...b.matchAll(/<div class="small">👂 <span lang="en"><b>([^<]*)<\/b>[\s\S]*?≠ ([^<]*?) [\s\S]*?<a href="#\/pron\/([^"]*)"/g)].map(m => ({ meant: unesc(m[1]), said: unesc(m[2]).trim(), skillHref: decodeURIComponent(m[3]) })), shortHint: /↻ Trả lời đầy đủ hơn/.test(b), modelShown: !!mdl, model: mdl ? unesc(mdl[1]) : null };
  });
  const sc = /data-latency="(\d+)" data-score="(\d+)"/.exec(h), bandM = /<div><b>([^<]*)<\/b><p class="small muted" style="margin:\.2rem 0 0">([\s\S]*?)<\/p><\/div>/.exec(h), line = unesc(bandM[2]).split(' · ');
  return { title: tk(unesc(/<h1>📞 ([^<]*)<\/h1>/.exec(h)[1])), header: { name: sub[0], retry: /Luyện lại/.test(sub[1]) ? tk(sub[1]) : null, duration: tk(sub[/Luyện lại/.test(sub[1]) ? 2 : 1]), xp: sub.at(-1) }, latency: +sc[1], score: +sc[2], band: tk(unesc(bandM[1])), answered: tk(line[0]), words: line[1] ? tk(line[1]) : null,
    topicWords: (m => (m ? { title: tk(unesc(m[1])), chips: [...m[2].matchAll(/<span class="chip( ok)?">(?:✓ )?([^<]*)<\/span>/g)].map(c => ({ word: unesc(c[2]), used: !!c[1] })) } : null))(/<h2 class="set-h">🧩 ([^<]*)<\/h2><div class="call-chips" lang="en">([\s\S]*?)<\/div>/.exec(h)),
    notes: [...(/<h2 class="set-h">📈[\s\S]*?<ul class="small"[^>]*>([\s\S]*?)<\/ul>/.exec(h)[1]).matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => tk(unesc(m[1]))), turns: tx,
    phrases: [...(/<h2 class="set-h">💬[\s\S]*?<ul class="small"[^>]*>([\s\S]*?)<\/ul>/.exec(h)[1]).matchAll(/<li lang="en"><b>([^<]*)<\/b> – <span class="muted">([^<]*)<\/span><\/li>/g)].map(m => [unesc(m[1]), unesc(m[2])]),
    buttons: { retry: (m => (m ? tk(unesc(m[1])) : null))(/id="cRetry">↻ ([^<]*)</.exec(h)), save: tk(unesc(/id="cSave">\+ ([^<]*)</.exec(h)[1])), again: { href: /<a class="btn" href="#\/call\/([^"]*)">/.exec(h)[1] }, other: '#/call' }, privacy: tk(unesc(/<p class="tiny muted" style="margin-top:\.8rem">([^<]*)<\/p>/.exec(h)[1])) };
}

/** Run one call flow. actions: { start } | { mic: {heard, score?, secs?} | {error} | {end} | {empty} } | { tap: k } | { type: text } | { tick: ms } | { longDone } | { hang } | { save } | { retry } | { ask: 'cloud'|'tap'|… } | { tr } | { settleOnly } */
async function flow(id, why, o) {
  const P = await cpg({ env: o.env, ls: o.ls, lang: o.lang }), steps = [], c = callOf(o.call);
  const go = async (label, input, fn) => { if (!['start', 'ring', 'tick', 'save-cards'].includes(label)) P.E.clock.t += 4000; const mark = markOf(P); await fn(); await drain(P); steps.push(snap(P, label, input, mark)); };
  for (const a of o.actions) {
    if (a.start) await go('start', a, async () => { await P.routes.call(o.call); P.$('#callGo').onclick(); });
    else if (a.ring) await go('ring', a, async () => { await P.routes.call(o.call); });
    else if (a.mic) await go('mic', a, async () => { P.$('#cMic').onclick(); await drain(P); const h = P.rec.recog.at(-1); if (!h) return; if (a.mic.secs != null) P.E.clock.t += a.mic.secs * 1000; if (a.mic.error) h.cb.error(a.mic.error); else if (a.mic.heard != null) { h.cb.start(); h.cb.result({ heard: a.mic.heard, score: a.mic.score ?? 90 }); } else if (!a.mic.stop) return; h.cb.end(); });
    else if (a.heard) await go('recognized', a, async () => { const h = P.rec.recog.at(-1); if (a.secs != null) P.E.clock.t += a.secs * 1000; h.cb.start(); h.cb.result({ heard: a.heard.text, score: a.heard.score ?? 90 }); h.cb.end(); });
    else if (a.stale) await go('stale-result', a, async () => { const h = P.rec.recog[a.stale.index]; h.cb.start(); h.cb.result({ heard: a.stale.text, score: 90 }); h.cb.end(); });
    else if (a.tap !== undefined) await go('tap', a, async () => { P.E.dom.$$('[data-o]', P.opts)[a.tap].onclick(); });
    else if (a.type !== undefined) await go('type', a, async () => { P.$('#cIn').value = a.type; P.$('#cType').onsubmit({ preventDefault() {} }); });
    else if (a.tick !== undefined) await go('tick', a, async () => { await tickMs(P, a.tick); });
    else if (a.longDone) await go('long-done', a, async () => { P.$('#cLongDone').onclick(); });
    else if (a.hang) await go('hang', a, async () => { P.$('#cEnd').onclick(); });
    else if (a.askPick) await go('ask-pick', a, async () => { const b = P.E.dom.$$('[data-a]', P.ask).find(x => x.dataset.a === a.askPick); await b.onclick(); });
    else if (a.tr) await go('subtitle-toggle', a, async () => { P.$('#cTr').onclick(); });
    else if (a.save) await go('save-cards', a, async () => { await P.$('#cSave').onclick(); });
    else if (a.retry) await go('retry', a, async () => { P.$('#cRetry').onclick(); });
    else if (a.settle) await go('wait', a, async () => {});
  }
  const dictCalls = P.calls.dict.filter(d => d[0] === 'translateTo').map(d => ({ lang: d[2], pieces: d[1].split('\n').length }));
  const says = P.rec.tch.filter(e => e.ev === 'say'), voices = [...new Set(says.map(e => e.voice + '|' + e.accent))];
  return { id, why, input: { call: o.call, env: o.env || {}, ls: o.ls || {}, lang: o.lang || 'en', actions: o.actions }, out: { teacher: { who: c.who, voice: voices.length === 1 ? voices[0].split('|')[0] : voices, accent: voices.length === 1 ? voices[0].split('|')[1] : voices }, mount: P.rec.mount, steps, ...(dictCalls.length ? { translateRequests: dictCalls } : {}), ...(P.rec.ttsFallback.length ? { ttsFallback: P.rec.ttsFallback } : {}), store: [...new Set(P.writes.filter(w => w.store === 'localStorage').map(w => w.key))] }, _P: P };
}

// ================================================================== list / ring ==================================================================
async function listCase(id, why, o) {
  const P = await cpg({ env: o.env, ls: o.ls }); await P.routes.call(o.arg || ''); await drain(P);
  const steps = [{ step: 'open', out: listOut(P.view.innerHTML, P.$('#callPriv').textContent, o.full) }];
  for (const a of o.actions || []) {
    const mark = markOf(P);
    if (a.filter) { P.E.dom.$$('[data-g]', P.view).find(b => b.dataset.g === a.filter).onclick(); await drain(P); steps.push({ step: 'filter', input: a, out: listOut(P.view.innerHTML, P.$('#callPriv').textContent, o.full), writes: P.writes.slice(mark.writes).filter(w => w.store === 'localStorage').map(w => ({ key: w.key, value: w.value })) }); }
    if (a.changeAsr) { P.$('#callAsr').onclick(); await drain(P); steps.push({ step: 'change-asr', input: a, out: listOut(P.view.innerHTML, P.$('#callPriv').textContent, o.full), toasts: (P.sb._toasts || []).slice(mark.toast).map(tk), asrPrefAfter: P.E.ls.getItem('vb.call.asr') }); }
  }
  return { id, why, input: { env: o.env || {}, ls: o.ls || {}, arg: o.arg || '', actions: o.actions || [] }, out: { steps } };
}
async function ringCase(id, why, o) {
  const P = await cpg({ env: o.env }); await P.routes.call(o.call); await drain(P);
  return { id, why, input: { call: o.call, env: o.env || {} }, out: /id="callGo"/.test(P.view.innerHTML) ? ringOut(P.view.innerHTML, P.$('#callPriv').textContent) : { list: true, title: listOut(P.view.innerHTML, '', false).title } };
}
/** the learner-side plan of a whole conversation: for each turn { kind: mic|heard|type|tap, text } → the action list (the path through the graph is computed with the real engine) */
function plan(callId, pick, max = 20) {
  const E = engine(), c = clone(callOf(callId)), acts = []; E.prep(c); let id = c.start, i = 0;
  while (id && i < max) { const n = c.nodes[id], p = pick(i, id, n) || { kind: 'tap', tap: 0 }, text = p.kind === 'tap' ? n.o[p.tap || 0] : p.text; acts.push(p.kind === 'tap' ? { tap: p.tap || 0 } : p.kind === 'type' ? { type: p.text } : i === 0 || p.kind === 'mic' ? { mic: { heard: p.text, score: p.score ?? 90, secs: p.secs ?? 6 } } : { heard: { text: p.text, score: p.score ?? 90 }, secs: p.secs ?? 6 }); id = E.step(c, id, text).next; i++; }
  return acts;
}
const LOCAL = { sr: true, local: true };
const lastStep = r => r.out.steps.at(-1);

async function pageVectors() {
  const out = { list: [], ring: [], flow: [] };
  // ---------- list ----------
  out.list.push(await listCase('list-default', 'no argument ⇒ the list: all English calls (callsNow = CALLS without a tl), filter "all" (stored vb.call.flt, default "all"), groups all/ielts/toeic/everyday (labels: Tất cả, IELTS, TOEIC, Đời sống = t()); card = emoji + NAME[id]() (a t() key for the 11 named calls) else the English title, level chip, teacher name (Chars.name(who)), English title; the intro text; the privacy line under the list is the PRIV[asrMode] sentence (here: nothing available ⇒ ⌨️ tap); this case carries the full card rows, the others only the card ids', { full: true }));
  for (const g of ['ielts', 'toeic', 'everyday', 'all']) out.list.push(await listCase('list-filter-' + g, `tap the "${g}" filter: only the cards of that group (groupOf: exam starts with "ielts" ⇒ ielts, exam "toeic" ⇒ toeic, else everyday); the choice is stored in localStorage vb.call.flt and survives reloads`, { env: LOCAL, actions: [{ filter: g }] }));
  out.list.push(await listCase('list-stored-filter', 'a stored vb.call.flt ("toeic") opens the list already filtered; the filter group is aria-pressed', { ls: { 'vb.call.flt': 'toeic' } }));
  out.list.push(await listCase('list-asr-change', 'a remembered recognition choice (vb.call.asr) adds the "Đổi cách nhận dạng" button under the list; tapping it removes vb.call.asr, toasts "Lần gọi sau Lexkite sẽ hỏi lại cách nhận dạng." and redraws the list without the button', { ls: { 'vb.call.asr': 'cloud' }, env: { sr: true }, actions: [{ changeAsr: true }] }));
  const privEnvs = [['none', 'nothing available ⇒ ⌨️ "Trả lời bằng cách chạm gợi ý hoặc gõ phím."', {}, {}], ['sr-only', 'a recogniser exists but nothing chosen yet ⇒ 🔒 "Mặc định Lexkite không gửi âm thanh của bạn đi đâu." (asrMode "ask")', { sr: true }, {}], ['local', 'on-device recogniser available ⇒ 🔒 "Nhận dạng ngay trên máy – âm thanh không rời khỏi máy bạn." (local)', LOCAL, {}], ['cloud', 'learner chose the browser/cloud recogniser ⇒ ☁️ "Đang dùng nhận dạng của trình duyệt: âm thanh được gửi tới máy chủ của trình duyệt."', { sr: true }, { 'vb.call.asr': 'cloud' }], ['tap-pref', 'learner chose tap ⇒ ⌨️ (pref "tap" wins over everything)', LOCAL, { 'vb.call.asr': 'tap' }], ['whisper', 'media available and Whisper accepted (web-only) ⇒ 🔒 on-device', { media: true }, { 'vb.whisper': '1' }]];
  for (const [k, why, env, ls] of privEnvs) out.list.push(await listCase('list-privacy-' + k, 'privacy sentence under the list: ' + why, { env, ls }));
  // ---------- ring ("incoming call" screen) ----------
  for (const [cid, why] of [['coffee', 'ring screen of a legacy call: h1 📞 + NAME key, level chip + English title, teacher poster + "Ama – role", the privacy sentence, [📞 Gọi ngay] and [Cuộc gọi khác] (#/call)'], ['ielts-p2-place', 'an IELTS call with teacher Carlos (who) – name from c.who via Chars.name'], ['toeic-reschedule', 'TOEIC call'], ['bakery', 'a call whose NAME key exists (Mua bánh mì ở tiệm bánh) – everyday, Carlos'], ['hobbies', 'a lot-1 call without a NAME key: the h1 is the English title']]) out.ring.push(await ringCase('ring-' + cid, why, { call: cid, env: LOCAL }));
  out.ring.push(await ringCase('ring-unknown', 'an unknown call id ⇒ the list is shown instead', { call: 'zzz' }));
  return out;
}

export { content, engineVectors, pageVectors, flow, cpg, drain, listOut, ringOut, plan, LOCAL, lastStep, RT, tk, sbox, run, rd, strip, unesc, J, settle, clone, mk, NOW, rigVectorText, fs, path, crypto, vm, ROOT, callOf, engine };

// ================================================================== turn flows ==================================================================
async function flowVectors() {
  const out = [], add = async (id, why, o) => { const r = await flow(id, why, o); delete r._P; out.push(r); return r; };
  const P1 = 'ielts-p1-home';
  // 1. a whole legacy call by tapping the suggestions: say order, phases, progress %, rewards, save cards
  await add('tap-through-coffee', 'a legacy call (coffee, 6 turns) answered ONLY by tapping the suggestions: after each answer the teacher says [react, next.m] (react = matching branch line else node.re; the call ends with c.end), phase sequence think → talk → you (the mic is NOT opened by itself until the learner has pressed it once: autoMic), the log keeps { id, text, picked:true, secs:0 }, progress % = min(95, round(logged/depth·100)) and 100 at the end, then after 900 ms the summary: all answers picked ⇒ note "speak"; reward { spoken: 0, xp: 5 + turns·2 + voiced·2 + (topic words used > 0 ? 3 : 0) } = 17; save-cards writes the phrases', { call: 'coffee', env: LOCAL, actions: [{ start: 1 }, ...Array.from({ length: 6 }, () => ({ tap: 0 })), { save: 1 }] });
  // 2. voice conversation with grammar fix + sound-pair slip + typed + tapped turns, then retry of the weak turns
  const cA = plan('bakery', (i, id, n) => ({ 0: { kind: 'mic', text: n.o[0], secs: 6 }, 1: { kind: 'heard', text: 'I want to bye some breast please and I am agree', secs: 7 }, 2: { kind: 'type', text: 'yes' }, 3: { kind: 'tap', tap: 1 } })[i] || { kind: 'heard', text: n.o[0], secs: 8 });
  const r2 = await add('voice-fix-slip-retry', 'bakery call, local recognition: turn 1 by voice, turn 2 by voice with a SOUND-PAIR SLIP (breast for bread) and a grammar error (I am agree ⇒ I agree) ⇒ the tip under the options (fix tip has priority over the slip tip; tip kinds: fix = "bad → good" + why key, slip = "Nghe giống “said” – bạn muốn nói “meant”?…"), the teacher reacts "encourage" (2200 ms) when there is a fix/slip else "happy"; turn 3 typed (typed:true ⇒ not counted as voiced), turn 4 tapped (picked); the summary lists fixes, slips with the pronunciation skill link, weak turns and offers "Luyện lại {n} câu yếu" which starts a RETRY call of only the weak nodes (same teacher, retry:true); finishing it shows a second summary whose header carries "Luyện lại"', { call: 'bakery', env: LOCAL, actions: [{ start: 1 }, ...cA, { retry: 1 }, { mic: { heard: 'I want a cake please', secs: 5 } }, { heard: { text: 'No thank you, I only want the bread' }, secs: 5 }] });
  void r2;
  // 3. unsafe input
  await add('unsafe-reask', 'unsafe / rude input (UNSAFE regex: fuck shit bitch asshole dick sex kill suicide drug(s) nigg whore slut …) typed or spoken: NOT logged, the node stays, the learner answer is not shown, the teacher says the exact English line "Let\'s keep our chat friendly and on topic!" and then re-asks the same question n.m; (target language es has its own line and list)', { call: 'coffee', env: LOCAL, actions: [{ start: 1 }, { type: 'what the fuck' }, { type: 'I like to kill time' }, { type: 'Yes please a latte' }] });
  // 4. IELTS part 2 – preparation countdown then the long turn
  const p2 = 'ielts-p2-place', talk = callOf(p2).nodes.talk.o[0].split('. ');
  await add('long-turn-buffering', 'IELTS Part 2: the first node has prep (60 s): the cue card shows the prompt + "Bạn nên nói:" + the cue points + a countdown (clock mm:ss, 1 s resolution by a 500 ms tick: ceil((end − now)/1000)); at 0 the app answers by itself with "(đã chuẩn bị xong)" as a PICKED answer that is NOT logged (prep nodes are never logged); then the LONG node: a 120 s clock, "Lượt nói dài: 1–2 phút", each spoken chunk is BUFFERED (not answered): #you shows all chunks joined, the word counter {n} từ = fluency(all).words, the microphone re-opens after each chunk while more than 3 s remain; at 0 s (or "✓ Tôi nói xong") the joined text is ONE answer (logged, secs of the last chunk) and the call goes on', { call: p2, env: LOCAL, actions: [{ start: 1 }, { tick: 1000 }, { tick: 30000 }, { tick: 29000 }, { mic: { heard: talk.slice(0, 2).join('. ') + '.', secs: 20 } }, { heard: { text: talk.slice(2, 4).join('. ') + '.' }, secs: 15 }, { tick: 60000 }, { tick: 60000 }, { tap: 0 }, { tap: 0 }] });
  await add('long-turn-done-button', 'the "✓ Tôi nói xong" button ends the long turn before the clock: the buffered chunks become the answer (logged, not picked); it cancels the clock', { call: p2, env: LOCAL, actions: [{ start: 1 }, { tap: 0 }, { mic: { heard: talk.slice(0, 3).join('. ') + '.', secs: 25 } }, { longDone: 1 }] });
  await add('long-turn-silent', '"Tôi nói xong" with nothing said ⇒ the model answer (o[0]) is used as a PICKED answer (logged, picked:true)', { call: p2, env: LOCAL, actions: [{ start: 1 }, { tap: 0 }, { longDone: 1 }] });
  await add('long-turn-tap-option', 'tapping a suggestion of a long node answers at once (picked, force) with the FULL model text o[k] (the button shows only its first two sentences + " …")', { call: p2, env: LOCAL, actions: [{ start: 1 }, { tap: 0 }, { tap: 0 }] });
  // 5. recognition modes
  await add('asr-tap-only', 'no recogniser at all (mode "tap"): pressing the mic does not start anything: toast "Trên thiết bị này hãy chạm gợi ý hoặc gõ câu trả lời." (3500 ms), the typing field opens, autoMic stays off', { call: 'coffee', env: {}, actions: [{ start: 1 }, { mic: {} }, { type: 'Yes please a latte' }] });
  await add('asr-ask-cloud', 'a recogniser exists but nothing is chosen (mode "ask"): the first mic press shows the choice box "Chọn cách nhận dạng giọng nói" – on web: 🔒 Chrome pack (when downloadable) · 🔒 Whisper (media, no extension) · ☁️ browser service · ⌨️ tap only; picking one stores localStorage vb.call.asr ("cloud"), repaints the privacy line, opens the mic (autoMic) and the recogniser starts WITHOUT processLocally (cloud)', { call: 'coffee', env: { sr: true }, actions: [{ start: 1 }, { mic: {} }, { askPick: 'cloud' }, { heard: { text: 'Yes please a latte' }, secs: 4 }] });
  await add('asr-ask-tap', 'picking "⌨️ Chỉ chạm gợi ý hoặc gõ phím" stores vb.call.asr = "tap", disables the mic button and the call goes on by tapping/typing', { call: 'coffee', env: { sr: true, media: true }, actions: [{ start: 1 }, { mic: {} }, { askPick: 'tap' }, { tap: 0 }] });
  await add('asr-whisper', 'web-only path (Whisper on-device, media available, accepted): cb.whisper with maxMs = min(15000, 3000 + (min||8)·450) – 28000 for a long node; no processLocally setup. Native has no Whisper: it uses the OS recogniser (asrModeNative)', { call: 'coffee', env: { media: true }, ls: { 'vb.whisper': '1' }, actions: [{ start: 1 }, { mic: { heard: 'Yes please a latte', secs: 3 } }] });
  await add('asr-errors', 'recogniser errors: "no-speech" ⇒ phase back to "you", toast (2500 ms) of UI.recErrorText("no-speech"); any other code ⇒ autoMic OFF (no re-listen), toast (3500 ms) of recErrorText(code); an empty result (heard "") ⇒ phase back to "you" without a toast; the learner can press the mic again', { call: 'coffee', env: LOCAL, actions: [{ start: 1 }, { mic: { error: 'no-speech' } }, { mic: { error: 'not-allowed' } }, { mic: { heard: '' } }, { mic: { heard: 'Yes please a latte', secs: 3 } }] });
  await add('stale-result-ignored', 'a recognition result that arrives after the learner typed an answer (turn counter moved) is ignored: the typed answer is the one logged, the late result changes nothing (this is the turn-id guard that also makes "tap the mic while the teacher speaks" safe)', { call: 'coffee', env: LOCAL, actions: [{ start: 1 }, { mic: {} }, { type: 'Yes please a latte' }, { stale: { index: 0, text: 'something very different' } }] });
  await add('mic-toggle-stop', 'phase "listen": pressing the mic again STOPS listening (recogniser.stop() ⇒ the platform still delivers result/end); the button label is "Dừng nghe" while listening and "Nói" otherwise', { call: 'coffee', env: LOCAL, actions: [{ start: 1 }, { mic: {} }, { mic: { stop: 1 } }] });
  // 6. voice-only full call + rewards + hang up
  const cV = plan(P1, (i, id, n) => ({ kind: i === 0 ? 'mic' : 'heard', text: n.o[0], secs: 6 }));
  await add('voice-full-call', 'IELTS Part 1 call answered entirely by voice (suggested sentences as the heard text): every logged turn has secs and asr; summary: reward { spoken: voiced, xp: 5 + turns·2 + voiced·2 + 3 (topic words used) }, score/band from Engine.recap, notes, topic-word chips (✓ used), the "Câu mẫu" block only on weak/picked turns', { call: P1, env: LOCAL, actions: [{ start: 1 }, ...cV] });
  await add('hang-with-log', 'the red button (and Escape) with at least one logged turn ends the call NOW and shows the summary of what was said (the unanswered turns are not counted: score uses turns/depth)', { call: P1, env: LOCAL, actions: [{ start: 1 }, { mic: { heard: callOf(P1).nodes.name.o[0], secs: 5 } }, { hang: 1 }] });
  await add('hang-no-log', 'hanging up before any answer leaves the call and goes to #/call (location.hash = "#/call"); no reward, no summary', { call: P1, env: LOCAL, actions: [{ start: 1 }, { hang: 1 }] });
  await add('save-cards-fixes', 'save-cards after a call with fixes: one card per phrase { word, def, pos "phrase", emoji "📞", topic "call" } context { text: def, title "Call <name>: <title>" } silent, then one card per grammar fix { word: good, pos "phrase", ex: good, … } – the toast and the button show phrases + fixes ("Đã thêm {n} thẻ")', { call: 'coffee', env: LOCAL, actions: [{ start: 1 }, { type: 'I am agree, yes a latte please' }, { type: 'Iced please' }, { hang: 1 }, { save: 1 }] });
  // 7. translated subtitles (UI language ≠ en)
  await add('subtitles-vi', 'UI language ≠ en: subtitles are ON by default (localStorage vb.call.tr ≠ "0"), the app asks Dict.translateTo ONCE for all the teacher lines of the call (unique m / re / branch lines / end joined by newlines; the answer must have the same number of lines, else no subtitles) and the "Aa" button toggles them (stores vb.call.tr "0"/"1"); web-only service, optional for native', { call: 'coffee', env: LOCAL, lang: 'vi', actions: [{ start: 1 }, { tr: 1 }, { tr: 1 }] });
  return out;
}

// ================================================================== content pack + starter + strings ==================================================================
const lit = (src, re, what, ctx = {}) => { const m = re.exec(src); if (!m) throw new Error('call-pack: ' + what + ' not found'); return vm.runInNewContext('(' + m[1] + ')', ctx); };
const rx = r => ({ source: r.source, flags: r.flags });
function callConsts() {
  const eng = rd(ENGINE_FILE), page = rd(PAGE_FILE), C = content();
  const names = Object.fromEntries(Object.entries(lit(page, /const NAME = (\{[\s\S]*?\n  \});/, 'call NAME', { t: k => k })).map(([k, f]) => [k, f()])), tlx = lit(eng, /const TLX = (\{[^\n]*\});/, 'engine TLX');
  const unsafeEs = lit(page, /const UNSAFE_X = (\{[^\n]*\});/, 'call UNSAFE_X'), en = /\(UNSAFE_X\[TLC\] \|\| (\/.*?\/i)\)\.test/.exec(page)[1], one = (re, w) => rx(lit(eng, re, w));
  return { engine: { past: lit(eng, /const PAST = (\{[^\n]*\});/, 'PAST'), s3: lit(eng, /const S3 = (\{[^\n]*\});/, 'S3'), past3: lit(eng, /const PAST3 = (\{[^\n]*\});/, 'PAST3'), v3to2: lit(eng, /const V3TO2 = (\{[^\n]*\});/, 'V3TO2'), uncountable: lit(eng, /const UNC = ('[^\n]*');/, 'UNC'), modal: one(/const MODAL = (\/[^\n]*\/i);/, 'MODAL'), pastPrompt: one(/const PAST_Q = (\/[^\n]*\/i);/, 'PAST_Q'), pastOwn: one(/const PAST_OWN = (\/[^\n]*\/i);/, 'PAST_OWN'),
      filler: one(/const FILL = (\/[^\n]*\/gi);/, 'FILL'), link: one(/const LINK = (\/[^\n]*\/i);/, 'LINK'), stop: lit(eng, /const STOP = (new Set\('[^']*'\.split\(' '\)\));/, 'STOP', { Set }) && [...lit(eng, /const STOP = (new Set\('[^']*'\.split\(' '\)\));/, 'STOP')].sort(), extraPairs: clone(C.sb.CallEngine.EXTRA), tl: { es: { filler: rx(tlx.es.fill), link: rx(tlx.es.link) } },
      score: { base: 40, doneWeight: 20, shareWeight: 20, cleanWeight: 20, max: 100, great: 85, good: 70, slowWpm: 70, fillerShare: 0.08, fillerMinWords: 20, maxSlips: 2 } },
    call: { groups: ['all', 'ielts', 'toeic', 'everyday'], names, unsafe: { en: (m => ({ source: m[1], flags: m[2] }))(/^\/(.*)\/([a-z]*)$/.exec(en)), es: rx(unsafeEs.es) }, longSeconds: 120, prepNote: 'node.prep = seconds of preparation', fallbackSayMs: '1500 + 90·chars, max 15000 (the platform does not report the end of speech ⇒ go on)', pctMax: 95, xp: { base: 5, perTurn: 2, perVoiced: 2, usedWords: 3 } } };
}
/** body shared by the full pack and the offline starter */
function callBody(starter) {
  const C = content(), ids = ['coffee', 'weekend', 'ielts-p1-home', 'ielts-p2-place', 'toeic-reschedule', 'bakery', 'hobbies', 'ask-directions'];
  const calls = (starter ? C.calls.filter(c => ids.includes(c.id)) : C.calls).map(c => clone(c));
  return { calls, pron: { contrasts: clone(C.contrasts), note: 'PronPairs.CONTRASTS ({id, pairs "w0/w1 …", skills}) – with consts.engine.extraPairs they build the sound-pair index of Engine.slips (both directions); skill = first skills[0] of the contrast, else "final-consonants"' }, consts: callConsts(),
    sources: { teachers: 'who = "ama" | "carlos" (characters.json: name, voice af_heart / am_michael, poster); audio is NOT bundled', spanish: 'calls with tl "es" come from cpack/es/cl.js (Spanish pack, not here); the engine tl tables are in consts.engine.tl', translations: 'subtitles use the app translation service (web-only, optional)' } };
}
const hash12 = o => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0, 12);
export const CALL_PACK_PATH = 'web/data/call-pack.json', CALL_PACK_URL = 'https://lexkite.com/data/call-pack.json', CALL_STARTER_PATH = 'native/shared/gen/content-pack/call-starter.json';
/** Text of web/data/call-pack.json: every English call as a prepared graph (turns[] converted to nodes) + the pronunciation-pair data of Engine.slips + the engine/page constants read from the web code. v = content hash. */
export async function callPack() {
  const body = callBody(false), v = hash12(body);
  return JSON.stringify({ _doc: 'GENERATED by scripts/native/gen-call.mjs (node scripts/native/gen.mjs) from web/js/call/{calls,calls-exam,calls-lot1,calls-lot2,engine}.js + call.js + pron/pairs.js – do not edit. Native pack for P08 (#/call): shape documented in docs/specs/native-m4-vectors.md (P08). Calls are PREPARED graphs: { id, em, lv, title, role, who, exam, words, phrases[[phrase, meaning]], start, nodes{ id: { m, o[], br[[regex, line, next?]], re, next, min, kw, long, prep, cue } }, end }. Audio is NOT bundled.', schema: 1, v, ...body }) + '\n';
}
/** Offline first launch: 8 calls (both teachers; IELTS Part 1/2, TOEIC, everyday A1–B1) + every table. */
export async function callStarter() {
  const body = callBody(true), v = hash12(body);
  return JSON.stringify({ _doc: 'GENERATED by scripts/native/gen-call.mjs (node scripts/native/gen.mjs) – do not edit. Starter subset of ' + CALL_PACK_URL + ' (same shape): ' + body.calls.length + ' calls (Ama + Carlos; ielts / toeic / everyday); bundled for the first offline launch (Android assets content-pack/call-starter.json, iOS Resources/call-content.json).', schema: 1, v, ...body }) + '\n';
}

// ---------- strings: every Vietnamese key the #/call screens pass to t() ----------
export const CALL_STRING_FILES = { ui: ['web/js/call.js', 'web/js/st/v2/teacher-call.js'], eng: ['web/js/call/engine.js'] };
/** [{ key, area }] – area = the string-id group (call.<area>.*) the key belongs to; the recognition-error / quota keys of ui.js (shared with P07, already mapped) go to area "rec" */
export function callStringKeys() {
  const out = new Map(), add = (key, area) => { if (key && !out.has(key)) out.set(key, area); };
  const RE = [/\bt\('((?:[^'\\]|\\.)*)'/g, /\bt\("((?:[^"\\]|\\.)*)"/g, /\bI18N\.tk\('((?:[^'\\]|\\.)*)'/g];
  const scan = (src, area) => { for (const ln of src.split('\n')) for (const re of RE) for (const m of ln.matchAll(re)) add(m[1].replace(/\\(['"\\])/g, '$1'), area); };
  for (const [area, files] of Object.entries(CALL_STRING_FILES)) for (const f of files) scan(rd(f), area);
  const ui = rd('web/js/ui.js').split('\n'), a = ui.findIndex(l => l.includes('const REC_ERR = {')), b = ui.findIndex(l => l.includes('const recErrorText ='));
  scan(ui.slice(a, b + 1).join('\n'), 'rec'); scan(ui.find(l => l.includes('const quotaText =')), 'rec');
  return [...out].map(([key, area]) => ({ key, area }));
}

// ================================================================== assembly ==================================================================
const keysOf = (...lists) => [...new Set(lists.flat())].sort();
export async function callVectors() {
  process.env.TZ = 'UTC';
  const out = { _doc: 'GENERATED by scripts/native/gen-call.mjs – see docs/specs/native-m4-vectors.md (P08). Top level: engine (CallEngine.* run as is: prep, depth, step, correct, slips, fluency, recap, retry, asrMode + asrModeNative) · list (#/call) · ring (#/call/<id>) · flow (a whole call: start → turns → summary; the page runs its Stitch v2 path with a recording teacher rig) · rewards · progress · persist · data. Each case: id, why, input, out. Text inside out is the Vietnamese i18n KEY as the web passes it to t() (a key with variables is {k, v}); map keys through native/shared/strings.json call.* ids. Microphone/ASR/speech/teacher rig/timers/clock are PLATFORM inputs recorded in each case `input` (heard text, score, error codes, elapsed ms); the branching, correction, scoring and summary code that consumes them is the real web code.', now: NOW };
  out.engine = engineVectors();
  const pv = await pageVectors(); out.list = pv.list; out.ring = pv.ring; out.flow = await flowVectors();
  // rewards: observed on every flow that reached the summary (xp = 5 + turns·2 + voiced·2 + (used > 0 ? 3 : 0); App.reward({ spoken: voiced, xp }))
  out.rewards = out.flow.flatMap(f => f.out.steps.filter(s => s.summary).map(s => { const sm = s.summary, log = lastLog(f, s), turns = sm.turns.length, voiced = log.filter(x => !x.picked && !x.typed).length, used = sm.topicWords ? sm.topicWords.chips.filter(c => c.used).length : 0;
    return { id: 'reward-' + f.id, why: 'rewards of the finished call: voiced = answers that were neither tapped (picked) nor typed; xp = 5 + turns·2 + voiced·2 + 3 when at least one topic word was used; App.reward({ spoken: voiced, xp }) once, when the summary opens (a retry call rewards again, over its own turns)', input: { turns, voiced, usedWords: used }, out: s.rewards[0] }; }));
  // progress: the % after every answer (V2 frame): min(95, round(logged / depth · 100)) while the call goes on, 100 after the last answer
  out.progress = out.flow.flatMap(f => { const c = f.input.call, depth = out.engine.depth.find(d => d.id === 'depth-all-calls').out[c], cut = f.out.steps.findIndex(s => s.step === 'retry'); return f.out.steps.slice(0, cut < 0 ? undefined : cut).filter(s => s.progress && s.state && ['tap', 'mic', 'recognized', 'type', 'long-done'].includes(s.step)).map((s, i) => ({ id: 'progress-' + f.id + '-' + i, why: 'progress = min(95, round(logged/depth·100)) %, 100 at the end', input: { call: c, depth, logged: s.state.logged, ended: !!s.summary }, out: s.progress })); });
  const wr = [...out.flow.flatMap(f => [...f.out.steps.flatMap(s => s.writes || []), ...f.out.store.map(k => ({ key: k }))]), ...out.list.flatMap(l => l.out.steps.flatMap(s => s.writes || []))];
  out.persist = { _doc: 'What the call screens WRITE, observed from the flows above. localStorage keys (per device, never synced, never in sync.json): vb.call.flt (list filter all|ielts|toeic|everyday), vb.call.asr (remembered recognition choice "cloud"|"tap"|"device"; removed by "Đổi cách nhận dạng"), vb.call.tr (subtitles "1"/"0", UI language ≠ en only), vb.whisper "1" (web-only Whisper consent). XP/daily quests: App.reward({ spoken, xp }) (M3). Cards: App.addWord on "Thêm vào thẻ ôn" (phrases + grammar fixes, topic "call", pos "phrase", emoji 📞, silent). Nothing the learner says is stored; the summary is never saved.', localStorage: keysOf(wr.map(w => w.key)), removed: ['vb.call.asr'], rewards: 'App.reward({ spoken, xp })', cards: 'App.addWord(entry, { text, title: "Call <teacher>: <title>" }, { silent: true })', saved: 'nothing else' };
  const C = content(), keep = ['coffee', 'ielts-p1-home', 'ielts-p2-place', 'toeic-reschedule', 'bakery', 'hobbies'];
  out.data = { _doc: 'REAL calls cut down (6 of ' + C.calls.length + ': both teachers, ielts p1/p2, toeic, everyday A1–B1, a legacy turns[] call as prepared nodes) + the pair tables of Engine.slips, so the ports run every case with no web files. The complete content is web/data/call-pack.json (calls[' + C.calls.length + ']).', calls: keep.map(id => clone(C.byId[id])), pron: { contrasts: clone(C.contrasts), extraPairs: clone(C.sb.CallEngine.EXTRA) }, teachers: { ama: { name: 'Ama', voice: 'af_heart' }, carlos: { name: 'Carlos', voice: 'am_michael' } }, names: callConsts().call.names };
  return rigVectorText(out);
}
const lastLog = (f, s) => { const i = f.out.steps.indexOf(s); let from = 0; for (let k = i - 1; k >= 0; k--) if (f.out.steps[k].step === 'retry' || f.out.steps[k].summary) { from = k + (f.out.steps[k].step === 'retry' ? 0 : 1); break; } return f.out.steps.slice(from, i + 1).flatMap(x => (x.step === 'retry' && x !== f.out.steps[from] ? [] : x.log || [])); };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { const s = await callVectors(); console.log(Buffer.byteLength(s), 'bytes'); }
