/* Native M4 – speaking & pronunciation conformance vectors (parity P07: #/speak #/speaking #/pron #/say #/reflex #/rtype #/roleplay #/handsfree).
 * Reference = the REAL web code, never re-implemented: web/js/speak/{app,score}.js, speaking.js, pron.js + pron/{pairs,coach,sayit,rhythm}.js, say.js, reflex.js, rtype.js, roleplay.js, handsfree.js,
 * qengine.js/lexis.js/ui.js (similarity, ASR best-alternative rule, WEAK table) run in node:vm on the RECORDING DOM stub of gen-vocab.mjs. Microphone, ASR, recording, speech synthesis, <audio> and timers are
 * PLATFORM inputs: replaced by a recorder, and what the platform would deliver (heard text, alternatives, errors, elapsed ms) is part of each case's `input`, so scoring runs as real code on recorded input.
 * Vectors keep DATA (rows, scores, writes, event order), never HTML. Determinism: TZ=UTC, clock = skills.now (2026-01-05T09:00:00Z), floats rounded by rigVectorText, random = recorded sequences.
 * Exports speakVectors() → text of vectors/speak.json, speakPack() → web/data/speak-pack.json, speakStarter() → content-pack/speak-starter.json. Spec: docs/specs/native-m4-vectors.md (P07). */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { slice, NOW } from './gen-vocab.mjs';
import { rigVectorText } from './gen-teach.mjs';
import { mk, el, platform, settle, clone, answersFor, fakeRoot } from './gen-skills.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const unesc = x => (typeof x === 'string' ? x.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&') : x);
const strip = h => unesc(String(h || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
const tt = (k, v) => { let s = String(k); if (v) for (const [a, b] of Object.entries(v)) s = s.split('{' + a + '}').join(String(b)); return s; };
/** deterministic "Math.random": the recorded sequence is part of the case input (a port feeds the same numbers) */
const seq = n => { let s = 12345; return Array.from({ length: n }, () => { s = (s * 1664525 + 1013904223) % 4294967296; return Math.round(s / 4294967296 * 1e6) / 1e6; }); };
const cyc = a => { let i = 0; return () => a[i++ % a.length]; };

// ---------- the data files (same load order as the web bundles pas/speak/pron/roleplay) ----------
const SPK_FILES = ['web/js/speak/data.js'];
const SPEAK_FILES = ['web/cpack/speak/samples.js', 'web/cpack/speak/more2.js', 'web/cpack/speak/more3.js', 'web/js/speak/more.js'];
const PRON_FILES = ['web/js/pron/sounds.js', 'web/cpack/pron/skills.js'];
const RP_FILES = ['web/js/roleplay/data-everyday.js', 'web/js/roleplay/data-a.js', 'web/js/roleplay/data-b.js', 'web/js/roleplay/data-lot1.js', 'web/js/roleplay/data-lot2.js'];
const sbox = (extra = {}) => { const sb = { console, Math, JSON, t: tt, ...extra }; sb.self = sb; sb.window = sb; sb.globalThis = sb; vm.createContext(sb); return sb; };
const run = (sb, f) => vm.runInContext(rd(f), sb, { filename: f });
let CONTENT = null;
/** The learning content as the web bundles load it (PRON, ROLEPLAY, SPEAK_*, PronPairs/PronCoach data, ui.js WEAK). The speaking BANK lives inside speaking.js: speakBank() reads it from the page. */
function content() {
  if (CONTENT) return CONTENT;
  const sb = sbox();
  for (const f of [...PRON_FILES, ...RP_FILES, ...SPEAK_FILES, 'web/js/pron/pairs.js', 'web/js/pron/coach.js']) run(sb, f);
  const ui = rd('web/js/ui.js'), a = ui.indexOf('const WEAK = {'), b = ui.indexOf('/* LK_WEAK-END */');
  const WEAK = vm.runInNewContext('(' + ui.slice(a + 'const WEAK = '.length, ui.lastIndexOf('};', b) + 1) + ')');
  const P = sb.PronPairs, num = vm.runInNewContext('(' + /const NUM = (\{[^\n]*\});/.exec(rd('web/js/pron/pairs.js'))[1] + ')');
  const light = /const LIGHT = new Set\('([^']+)'/.exec(rd('web/js/pron/coach.js'))[1].split(' ');
  CONTENT = { PRON: clone(sb.PRON), ROLEPLAY: clone(sb.ROLEPLAY), SAMPLES: clone(sb.SPEAK_SAMPLES), MORE: clone(sb.SPEAK_MORE), WEAK: clone(WEAK), sb,
    pairs: { contrasts: clone(P.CONTRASTS), ipa: clone(P.IPA), hom: clone(P.HOM), num, tips: Object.fromEntries(Object.entries(P.TIPS).map(([k, f]) => [k, f()])), labels: Object.fromEntries(P.CONTRASTS.map(c => [c.id, P.label(c)])) },
    coach: { sentences: clone(sb.PronCoach.SENTENCES), light } };
  return CONTENT;
}

// ================================================================== shared ==================================================================
const UI_SRC = rd('web/js/ui.js');
const similarity = vm.runInNewContext(`(function(){ ${slice(UI_SRC, /function similarity\(a, b\) \{/)}\n return similarity; })()`);
const BEST_SRC = /const alts = \[\.\.\.e\.results\[0\]\][^\n]*\n\s*const best = [^\n]*/.exec(UI_SRC)[0];
const bestAlt = vm.runInNewContext(`(function(similarity){ return function(alts0, target){ const e = { results: [alts0.map(transcript => ({ transcript }))] }; ${BEST_SRC}\n return { alts, heard: best.a, score: Math.round(best.s * 100) }; }; })`)(similarity);
/** a vm with a controllable clock (Date.now) for the code that measures elapsed time */
function timed(extra = {}) {
  const clk = { t: NOW }, CD = class extends Date { constructor(...a) { if (a.length) super(...a); else super(clk.t); } static now() { return clk.t; } };
  return { clk, sb: sbox({ Date: CD, ...extra }) };
}

function recogVectors() {
  const cases = [
    ['think', ['sink', 'think', 'thing'], 'the later alternative is closer to the target: the best similarity wins'],
    ['think', ['think', 'thing'], 'first alternative exact'], ['it is a nice day', ['its a nice day', 'it is a nice they'], 'similarity ignores case, punctuation and anything outside a-z/space'],
    ['sheep', ['ship', 'ship'], 'ties keep the FIRST maximum (Array.sort is stable)'], ['hello', ['', '  '], 'blank alternatives are dropped; nothing left ⇒ heard "" and score 0'],
    ['three', ['tree', 'free'], 'wrong word, partial credit by edit distance'], ["don't worry", ['dont worry'], 'apostrophes are not letters: removed before comparing'], ['café au lait', ['cafe au lait'], 'accented letters are not a-z: removed on both sides'],
    ['dont worry', ["don't worry"], 'a pair shared with lesson.json similarity (heard "don\'t worry", target "dont worry"): the score must be the same'], ['cafe au lait', ['Café au lait'], 'a pair shared with lesson.json similarity (heard "Café au lait")'], ['sink', ['think'], 'a pair shared with lesson.json similarity (heard "think", target "sink")'],
  ];
  return { _doc: 'Platform ASR → what the screens get ({ heard, score, alts }): the browser returns up to 5 alternatives; ui.js recognize() keeps the alternative with the highest similarity to the TARGET (ties: first), score = round(similarity·100). similarity = 1 − Levenshtein/maxLen on lower-cased text with everything outside [a-z ] removed (the same function as lesson.json similarity; every (heard,target) pair that also exists there must give the same score). Whisper-on-device returns ONE transcript and uses the same score. Order of platform events: start → result | error(code) → end; with no result before end the web reports error "no-speech". Error codes the screens react to: not-allowed, service-not-allowed, unsupported, audio-capture, no-speech, network, busy, whisper, phrases-not-supported, language-not-supported.',
    best: cases.map(([target, alts, why], i) => ({ id: 'best-' + i, why, input: { target, alts }, out: (r => ({ heard: r.heard, score: r.score }))(bestAlt(alts, target)) })) };
}

// ---------- Speak.score (web/js/speak/score.js): one scorer for the #/speak drills ----------
async function speakScoreVectors() {
  const mkS = rec => { const { clk, sb } = timed({ UI: rec === undefined ? undefined : { recognize: rec } }); run(sb, 'web/js/speak/score.js'); return { clk, sb, S: sb.Speak }; };
  const align = [['Could I get a medium latte, please?', 'could i get a medium latte please', 'exact after normalising (case, punctuation, apostrophes)'],
    ['Could I get a medium latte, please?', 'could i get latte please', 'omitted words are not ok; the rest are matched in order (LCS)'],
    ['Could I get a medium latte, please?', 'please latte medium a get i could', 'wrong order: only the longest in-order run is ok'],
    ['Could I get a medium latte, please?', '', 'heard nothing: every word not ok'], ['Could I get a medium latte, please?', 'could i get a medium latte please and some cake', 'extra words are ignored'],
    ["It's a long way.", 'its a long way', 'apostrophes are not kept: "it\'s" and "its" are the same word'], ['Well - done!', 'well done', 'a token that normalises to empty (the dash) is always ok'], ['Hello Hello Hello', 'hello hello', 'repeated words: first matches win, in order'],
    ['10 p.m. tonight', '10 pm tonight', 'digits are kept; dots dropped'], ['', 'anything', 'empty target ⇒ no words']];
  const intents = [{ id: 'order', keywords: ['latte', 'coffee'] }, { id: 'pay', keywords: ['how much', 'pay'] }];
  const S0 = mkS(null).S;
  const pass = [0, 0.5, 0.79, 0.7999, 0.8, 0.8001, 0.9, 1].map(text => ({ input: { text }, out: S0.pass({ text }) }));
  pass.push({ input: { text: 1, unclear: true }, out: S0.pass({ text: 1, unclear: true }) }, { input: null, out: S0.pass(null) });
  const flows = [];
  const flow = async (id, why, o) => {
    const calls = [], { clk, S } = mkS((target, accent, cb) => { calls.push({ target, accent }); o.script.forEach((ev, i) => setTimeout(() => { clk.t = NOW + ev.at; if (ev.ev === 'start') cb.start(); else if (ev.ev === 'result') cb.result({ heard: ev.heard, score: ev.score }); else if (ev.ev === 'error') cb.error(ev.code); else if (ev.ev === 'end') cb.end(); }, i)); return { stop() {} }; });
    const r = await S.score(o.opts); flows.push({ id, why, input: { opts: o.opts, script: o.script }, out: { result: r, recognizerCalls: calls } });
  };
  const T = 'Could I get a medium latte, please?';
  await flow('perfect', 'every word said: text 1, words all ok; 7 heard words in 2.0 s of speech ⇒ wpm 210; conf = platform score/100; accent defaults to en-US', { opts: { target: T, mode: 'drill' }, script: [{ at: 0, ev: 'start' }, { at: 2000, ev: 'result', heard: 'could I get a medium latte please', score: 96 }] });
  await flow('partial', '4 of 7 words matched in order ⇒ text 4/7; below 0.8 so Speak.pass is false', { opts: { target: T, mode: 'drill', accent: 'en-GB' }, script: [{ at: 0, ev: 'start' }, { at: 3000, ev: 'result', heard: 'could I get latte', score: 52 }] });
  await flow('fast-short', 'elapsed < 1 s counts as 1 s (max(1, …)): wpm = round(words/1·60)', { opts: { target: 'Hello there', mode: 'drill' }, script: [{ at: 0, ev: 'start' }, { at: 400, ev: 'result', heard: 'hello there', score: 100 }] });
  await flow('no-start-event', 'no start event ⇒ the clock starts at the call: seconds = (result − call)', { opts: { target: 'Hello there friend', mode: 'drill' }, script: [{ at: 6000, ev: 'result', heard: 'hello there friend', score: 100 }] });
  await flow('intent', 'o.intents ⇒ r.intent = first matching intent id (null when none)', { opts: { target: T, mode: 'free', intents }, script: [{ at: 0, ev: 'start' }, { at: 2500, ev: 'result', heard: 'a latte please', score: 70 }] });
  await flow('empty-heard', 'platform returned a result with no text ⇒ unclear:true, text 0 (words all not ok), no error code', { opts: { target: T, mode: 'drill' }, script: [{ at: 0, ev: 'start' }, { at: 1000, ev: 'result', heard: '', score: 0 }] });
  await flow('error-not-allowed', 'platform error ⇒ unclear:true + error code; the drill falls back to tap-the-words on not-allowed / unsupported / service-not-allowed', { opts: { target: T, mode: 'drill' }, script: [{ at: 0, ev: 'error', code: 'not-allowed' }] });
  await flow('error-no-speech', 'no-speech is an error with unclear:true (the drill lets the learner retry twice, then passes without stars)', { opts: { target: T, mode: 'drill' }, script: [{ at: 0, ev: 'start' }, { at: 5000, ev: 'error', code: 'no-speech' }] });
  const nu = mkS(undefined); const unsupported = await nu.S.score({ target: T });
  flows.push({ id: 'unsupported', why: 'no recognizer at all (UI.recognize missing) ⇒ immediate { error:"unsupported", unclear:true, engine:"webspeech", text 0, fluency {wpm 0, pauses null} }', input: { opts: { target: T }, script: [] }, out: { result: unsupported, recognizerCalls: [] } });
  const nullCtl = await (async () => { const { S } = mkS(() => null); return S.score({ target: T }); })();
  flows.push({ id: 'recognizer-null', why: 'recognize() returned null (cannot start) ⇒ the same as unsupported (error "unsupported")', input: { opts: { target: T }, script: [] }, out: { result: nullCtl, recognizerCalls: [{ target: T, accent: 'en-US' }] } });
  return { _doc: 'Speak (web/js/speak/score.js). align(target, heard) = LCS alignment of target words (punctuation kept for display) against heard tokens → [{w, ok}]. score({target,mode,intents,accent}) wraps the platform recognizer: text = ok words / target words, fluency.wpm = round(heard words / seconds · 60) with seconds = max(1, (end||now) − (start||call time))/1000 measured when the result arrives (the end event comes AFTER the result in the real platform, so ms is always 0), conf = platform score/100, unclear = nothing heard, error "unsupported" when no recognizer exists. pass(r) = !unclear && σ(12·text − 9.6) ≥ 0.5 ⇔ text ≥ 0.8 (CAL.calibrated=false: the 80 % target of LEARNING-PATH). The GOP hook (`Gop.score` when r.audio is set) never fires in the web today (r.audio is never set) – there is NO GOP engine in the shipped web (scripts/pron/gop.mjs is a research core), so natives score text only. intentOf: first intent whose keyword (normalised, whole-word) occurs in the heard text.',
    cal: clone(S0.CAL), align: align.map(([t, h, why], i) => ({ id: 'align-' + i, why, input: { target: t, heard: h }, out: S0.align(t, h) })), pass,
    intentOf: ['I would like a latte', 'How much is it?', '  HOW   MUCH  ', 'a coffee and how much', 'nothing relevant', ''].map(h => ({ input: { heard: h, intents }, out: S0.intentOf(h, intents) })), toks: ["Don't stop!", 'A  b'].map(s => ({ input: s, out: S0.toks(s) })), flows };
}

// ---------- PronPairs + PronCoach (web/js/pron/pairs.js, coach.js): pure logic of the pronunciation screens ----------
function pronLogicVectors() {
  const C = content(), P = C.sb.PronPairs, K = C.sb.PronCoach, WEAK = C.WEAK, cid = C.pairs.contrasts.map(c => c.id);
  const items = q => q.map(x => ({ c: x.c, words: x.words, side: x.side, ...(x.retry ? { retry: true } : {}) }));
  const mem = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _m: m }; };
  const norm = ['Sink!', "It's a  THREE", '10th place', 'Café', "'quoted'", '  ', '7 years', 'rock-and-roll', 'ONE two 3'].map(s => ({ input: s, out: P.norm(s) }));
  const decide = [
    [['sink', 'think'], 'think', 'sink', 'the first alternative that contains exactly ONE of the two words decides (here "sink" ⇒ said the other word)'],
    [['think', 'sink'], 'think', 'sink', 'target heard first ⇒ target'], [['we think sink', 'think'], 'think', 'sink', 'an alternative with BOTH words is skipped (cannot decide); the next one decides'],
    [['sea'], 'see', 'sit', 'homophone: "sea" counts as "see"'], [['write'], 'right', 'light', 'homophone table'], [['one'], 'one', 'won', 'digit words: "1" ⇒ "one" via NUM'], [['1'], 'one', 'two', 'a spoken digit is normalised to the number word'],
    [['rock and roll'], 'rock', 'roll', 'both words in the same alternative ⇒ cannot decide ⇒ neither'], [[''], 'think', 'sink', 'nothing heard ⇒ neither'], [['blue', 'green'], 'think', 'sink', 'neither word in any alternative ⇒ neither + heard = first alternative'],
    [['thing'], 'think', 'sink', 'near miss that is neither word'], [['10th'], 'tenth', 'tent', '"10th" ⇒ "tenth" via NUM'], [['bite', 'buy'], 'bite', 'buy', 'both in different alternatives: the FIRST alternative with exactly one decides'],
    ['sink', 'think', 'sink', 'a plain string is accepted as a single alternative'], [['Thanks.', 'tanks'], 'thank', 'tank', 'case and punctuation ignored, forms via HOM'], [[null, undefined, ' ', 'ship'], 'sheep', 'ship', 'blank / null alternatives are filtered out first'],
  ].map(([alts, target, other, why], i) => ({ id: 'decide-' + i, why, input: { alts, target, other }, out: P.decide(alts, target, other) }));
  const stats0 = {}, stWeak = { 'th-s': { ok: 1, n: 5, hist: [] }, 'r-l': { ok: 9, n: 10, hist: [] }, 'p-b': { ok: 0, n: 0, hist: [] } };
  const bs = [
    ['fresh', 'no stats: every contrast weight 2 (unpractised); first side chosen by the first random number; sides alternate per contrast; no pair repeated back-to-back', ['th-s', 'th-t', 'r-l'], stats0, 10, 11],
    ['weak-first', 'weights = 1 + 3·(1 − accuracy) (2 when unpractised), divided by (1 + used·0.5): the weak contrast "th-s" (20 %) is drawn far more often than "r-l" (90 %)', ['th-s', 'r-l', 'p-b'], stWeak, 10, 12],
    ['single', 'one contrast: pairs cycle in data order (used % pairs.length), sides alternate', ['final-drop'], stats0, 10, 13], ['short', 'n = 4: a short session of four words', ['s-z', 'ed'], stats0, 4, 14],
    ['empty', 'no contrasts ⇒ []', [], stats0, 10, 15],
  ].map(([id, why, ids, st, n, sd]) => { const r = seq(40), q = P.buildSession(ids.map(i => C.pairs.contrasts.find(c => c.id === i)), st, n, cyc(r)); return { id: 'session-' + id, why, input: { contrasts: ids, stats: st, n, random: r }, out: items(q) }; });
  const adapt = (() => { const ids = ['th-s', 'r-l'], r = seq(40), q = P.buildSession(ids.map(i => C.pairs.contrasts.find(c => c.id === i)), {}, 10, cyc(r)), before = items(q), res = items(P.adapt(q.slice(), 2, q[2])), late = items(P.adapt(q.slice(), 9, q[9])), mid = items(P.adapt(q.slice(), 8, q[8]));
    return [{ id: 'adapt-gap3', why: 'a wrong answer at index i puts the same contrast again at i+3 (another pair of that contrast when one is not already queued after i, same target side), flagged retry:true', input: { random: r, contrasts: ids, queue: before, index: 2 }, out: res },
      { id: 'adapt-last', why: 'index 9 of 10: the retry slot is clamped to the last item; when at ≤ idx nothing changes', input: { random: r, contrasts: ids, queue: before, index: 9 }, out: late }, { id: 'adapt-near-end', why: 'index 8: slot = min(i+3, last) = 9', input: { random: r, contrasts: ids, queue: before, index: 8 }, out: mid }]; })();
  const st = {}; P.record(st, 'th-s', false); P.record(st, 'th-s', true); P.record(st, 'th-s', false); P.record(st, 'r-l', true);
  const stats = { id: 'record-end-weak', why: 'record: n++ and ok++ when correct; endSession appends {d: day, ok, n} per contrast and keeps the LAST 12; weak = contrasts with n ≥ 2 and accuracy < 0.8, lowest first; acc = ok/n or null', input: { ops: [['th-s', false], ['th-s', true], ['th-s', false], ['r-l', true]], session: { 'th-s': { ok: 1, n: 3 }, 'r-l': { ok: 1, n: 1 } }, day: '2026-01-05' },
    out: (() => { const out = { stats: clone(st), acc: { 'th-s': P.acc(st['th-s']), 'r-l': P.acc(st['r-l']), none: P.acc(undefined) }, weak: P.weak(st, ['th-s', 'r-l']), weakAllKeys: P.weak(st) }; P.endSession(st, { 'th-s': { ok: 1, n: 3 }, 'r-l': { ok: 1, n: 1 } }, '2026-01-05'); out.afterEnd = clone(st); const h = { 'th-s': { ok: 1, n: 1, hist: Array.from({ length: 12 }, (_, i) => ({ d: 'd' + i, ok: 1, n: 1 })) } }; P.endSession(h, { 'th-s': { ok: 1, n: 1 } }, 'new'); out.histCap = { length: h['th-s'].hist.length, first: h['th-s'].hist[0].d, last: h['th-s'].hist[11].d }; return out; })() };
  const ls = mem(); P.save({ a: 1 }, ls); const saved = ls._m[P.KEY]; const bad = mem(); bad._m[P.KEY] = '[1'; bad.getItem = k => bad._m[k];
  const store = { id: 'storage', why: 'stats live in localStorage "lk.pronPairs" (JSON); unreadable or non-object JSON ⇒ {}; saving failure ⇒ false', input: { key: P.KEY }, out: { saved, loaded: P.load(ls), corrupt: P.load(bad), nonObject: P.load({ getItem: () => '5' }) } };
  const pairsOf = ['th-s', 'dh-z', 'i-ih', 'plural'].map(id => ({ id: 'pairsOf-' + id, why: id === 'dh-z' ? 'a "word=ipa" token overrides the dictionary IPA for that word (clothe/close=kloʊz)' : 'pairs string "w0/w1 …" → [{c, words:[w0,w1], ipa:["/…/","/…/"]}] (IPA from the table)', input: { contrast: id }, out: P.pairsOf(C.pairs.contrasts.find(c => c.id === id)).slice(0, 4) }));
  const skills = ['th-sounds', 'iː', 'final-consonants', 'weak-forms', 'zzz'].map(id => ({ input: id, out: P.forSkill(id).map(c => c.id) }));
  // ---- PronCoach: stress plan, diff, band, score, next ----
  const planC = [['I want to go to the shop.', 'en-GB'], ['I want to go to the shop.', 'en-US'], ['Can you give me a cup of tea?', 'en-US'], [{ s: 'She sold sea shells.', w: ['sold', 'shells'] }, 'en-GB']].map(([x, acc], i) => ({ id: 'plan-' + i, why: i === 3 ? 'forced stress list (w): only those words are stressed; the others are light' : 'stress = not a function word (WEAK table) and not in LIGHT; weak = "/IPA/" of the accent for unstressed words that have a weak form', input: { sentence: x, accent: acc }, out: K.plan(x, acc, WEAK) }));
  const diff = [['I want go the shop', 'I want to go to the shop'], ['could you send me the by friday', 'Could you send me the report by Friday?'], ['we have been waiting for an hour', 'we have been waiting for an hour'], ['tea cup', 'a cup of tea'], ['', 'anything']].map(([h, t], i) => ({ id: 'diff-' + i, why: ['small (function) words dropped: they land in missingWeak', 'a content word dropped lands in missingContent (function words in missingWeak)', 'perfect: nothing missing, cover 1', 'order is ignored: words are matched as a multiset (each heard word is used once)', 'nothing heard: every target word missing; an empty target gives cover 0'][i], input: { heard: h, target: t }, out: K.diff(h, t, WEAK) }));
  const band = [0, 40, 64, 65, 66, 84, 85, 100].map(s => ({ input: { score: s }, out: K.band(s) }));
  const scoreC = [[1, ['I want to go to the shop', 'I want go the shop']], [0.9, ['I want to go to the shop', 'I want to go to the shop']], [0.5, ['could you send me the report', 'send me']], [1, ['a b', '']], [0.2, ['someone said that', 'zzz yyy xxx']]].map(([sim, [t, h]], i) => { const d = K.diff(h, t, WEAK); return { id: 'score-' + i, why: 'score = clamp(0,100, round(sim·100 − 12·missingContent − 3·missingWeak))', input: { sim, heard: h, target: t }, out: { diff: { missingContent: d.missingContent.length, missingWeak: d.missingWeak.length }, score: K.score(sim, d) } }; });
  const nextC = [['no data', { skill: 'x' }], ['weak pairs first', { pairs: P, stats: { 'th-s': { ok: 1, n: 4 }, 'r-l': { ok: 0, n: 3 }, 'v-b': { ok: 4, n: 5 } }, rhythm: { 0: 90, 1: 70 }, skill: 'weak-forms' }], ['rhythm done', { rhythm: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i, 90])), skill: 'weak-forms' }]].map(([id, o], i) => ({ id: 'next-' + i, why: ['no pairs/rhythm: first unfinished rhythm sentence (<85) then skills weak-forms/connected-speech/word-stress (not the current one) up to 3 items', 'at most 2 weakest contrasts (n≥2, accuracy<80 %, lowest first) → pair suggestions with the first skill of the contrast; then the first rhythm sentence below 85; then skills to fill 3', 'every rhythm sentence ≥ 85: no rhythm item, skills fill the rest (skipping the current skill)'][i], input: { stats: o.stats || {}, rhythm: o.rhythm || {}, skill: o.skill, usePairs: !!o.pairs }, out: K.next(o) }));
  return { _doc: 'Pure pronunciation logic (web/js/pron/pairs.js = minimal-pair SPEAKING practice, coach.js = rhythm/shadowing coach), run as is. Data (CONTRASTS, IPA, HOM, NUM, TIPS keys, label keys, SENTENCES, LIGHT, UI.WEAK) is in the content pack (speak-pack.json pron.pairs / pron.coach / consts.weak); randomness is injected: `random` lists the numbers a port must feed in order (cycled).',
    pairs: { norm, decide, sessions: bs, adapt, stats: [stats], storage: [store], pairsOf, forSkill: skills },
    coach: { plan: planC, diff, band, score: scoreC, next: nextC } };
}

// ================================================================== page harness ==================================================================
/** t() that keeps the KEY and its variables: "key" or "key⟦{vars}⟧" – parse with tk(). The vectors carry the Vietnamese keys exactly as the web passes them to t(). */
const RT = (k, v) => (v ? String(k) + '⟦' + JSON.stringify(v) + '⟧' : String(k));
const tk = str => { const m = /^([\s\S]*?)⟦([\s\S]*)⟧$/.exec(String(str)); if (!m) return { k: unesc(String(str)) }; const v = JSON.parse(m[2]); for (const [a, b] of Object.entries(v)) if (typeof b === 'string') { const u = unesc(b); v[a] = /⟦/.test(u) ? tk(u) : u; } return { k: unesc(m[1]), v }; };
const tkAll = h => String(h).replace(/<[^>]*>/g, '\u0001').split('\u0001').map(x => x.trim()).filter(Boolean).map(x => { const r = tk(x); r.k = unesc(r.k); return r; });
const SPK_STUB = `(function(){ })`;
/** One web "install" for a speaking page. ui = overrides/extra UI members; the recognizer is a recorder (P.rec.recog[]: { target, accent, cb }) a case drives by hand. */
const PAGES = [];
async function pg(o = {}) {
  const rec = { recog: [], stopSpeak: 0, stopRecognize: 0, intervals: [] };
  const ui = { recognize: (target, accent, cb) => { const h = { target, accent, cb: cb || {}, stopped: false }; rec.recog.push(h); return { stop() { h.stopped = true; } }; }, stopRecognize() { rec.stopRecognize++; }, stopSpeak() { rec.stopSpeak++; }, recErrorText: c => 'ERR:' + c, similarity,
    recUrl: () => 'blob:rec', micParallel: () => true, MIC: {}, ring: () => '', dev: () => 'dev', shuffle: o.shuffle || (a => a.slice()), ...(o.ui || {}) };
  const P = await mk({ hash: o.hash || '#/home', lang: o.lang, learnLang: o.learnLang, ls: o.ls, settings: o.settings, cards: o.cards, game: o.game, confirm: o.confirm, ui, files: ['web/js/lexis.js', ...(o.files || [])],
    sets: sb => { sb.t = RT; sb.window.t = RT; sb.location.replace = u => { (sb._replaced ||= []).push(String(u).replace(/^[^#]*/, '')); sb.location.hash = String(u).replace(/^[^#]*/, ''); }; if (o.sets) o.sets(sb); }, late: o.late });
  P.rec = rec; P.route = String(o.hash || '#/home').replace(/^#\//, '').split('/')[0]; PAGES.push(P); return P;
}
const flagWrites = P => { const m = {}; for (const w of P.writes) m[w.store + ':' + (w.key || '')] = w.value; return m; };
const parseResult = h => ({
  stats: [...String(h).matchAll(/<div><b>([^<]*)<\/b><span class="tiny muted">([^<]*)<\/span><\/div>/g)].map(m => ({ label: tk(m[2]), value: unesc(m[1]) })),
  notes: [...String(h).matchAll(/<li style="margin:\.3rem 0">([\s\S]*?)<\/li>/g)].map(m => tk(m[1])),
  chips: [...String(h).matchAll(/<span class="chip( ok| lv)?">([^<]*)<\/span>/g)].map(m => ({ kind: m[1] ? m[1].trim() : 'link', text: unesc(m[2]).replace(/^(✓|🎓|🧷) /, '') })),
  hasTranscript: /passage hl-awl/.test(h), hasAudio: /<audio/.test(h) });

// ================================================================== #/speaking (web/js/speaking.js) ==================================================================
/** browser media stand-ins for speaking.js: getUserMedia, MediaRecorder, continuous SpeechRecognition (instances recorded; a case feeds onresult by hand) */
function mediaStubs(sb, o = {}) {
  const srs = [], mrs = [];
  sb.navigator.mediaDevices = { getUserMedia: async () => { if (o.denyMic) throw new Error('denied'); return { getTracks: () => [{ stop() {} }] }; } };
  sb.MediaRecorder = class { constructor() { this.state = 'inactive'; mrs.push(this); } start() { this.state = 'recording'; } stop() { this.state = 'inactive'; if (this.onstop) this.onstop(); } };
  sb.Blob = class { constructor(p, op) { this.parts = p; this.type = op && op.type; } };
  if (!o.noSR) sb.SpeechRecognition = class { constructor() { srs.push(this); this.started = 0; } start() { this.started++; } stop() { this.stopped = true; } abort() { this.aborted = true; } };
  sb.innerWidth = 1200;
  return { srs, mrs };
}
const TXT = {
  plain: n => Array.from({ length: n }, (_, i) => ['city', 'people', 'walk', 'house', 'garden', 'friend', 'family', 'street'][i % 8]).join(' '),
  rich: 'However, I think living in a big city is a good thing. For example, there are many opportunities for young people. In addition, public transport is convenient. As a result, many residents prefer the urban lifestyle because it offers significant benefits and a sustainable future for everyone.',
};
async function speakingVectors() {
  const C = content(), out = { render: [], analyse: [], timer: [], shadow: [] };
  const open = async (arg, o = {}) => { const media = {}; const P = await pg({ hash: '#/speaking', settings: o.settings, cards: o.cards, files: ['web/js/speak/more.js'].slice(0, 0), sets: sb => { Object.assign(media, mediaStubs(sb, o)); for (const k of ['SPEAK_SAMPLES', 'SPEAK_MORE']) sb[k] = clone(C[k === 'SPEAK_SAMPLES' ? 'SAMPLES' : 'MORE']); }, late: ['web/js/speech-session.js', 'web/js/speaking.js'] }); P.media = media; P.parts = ['p1', 'p2', 'p3'].map(k => el(P, 'button', { dataset: { part: k } })); P.E.dom.resolveList('[data-part]', () => P.parts); P.routes.speaking(arg); await settle(8); return P; };
  const view = P => P.view.innerHTML;
  const renderOut = P => { const h = view(P), part = /data-part="(\w+)"/g; return { tabs: [...h.matchAll(/<button class="(on)?" data-part="(\w+)">([^<]*)<\/button>/g)].map(m => ({ part: m[2], on: !!m[1], label: tk(m[3]) })), topics: [...h.matchAll(/<option value="(\d+)" (selected)?>([^<]*)<\/option>/g)].map(m => ({ i: +m[1], selected: !!m[2], label: tk(m[3].replace(/^\S+ /, '')) })), desc: tk(/<span class="chip">([^<]*)<\/span>/.exec(h)[1]), clockHint: tk(strip(/id="clockHint">([\s\S]*?)<\/div>/.exec(h)[1])), recHint: tk(strip(/id="recHint">([\s\S]*?)<\/div>/.exec(h)[1])), qIdx: tk(P.$('#qIdx').textContent), question: strip(P.$('#qBox').innerHTML), hasNext: /id="nextQ"/.test(h), topicCount: tk(/class="tiny muted">([^<]*⟦\{"n":\d+\}⟧)</.exec(h)[1]), suggestions: [...P.$('#sugg').innerHTML.matchAll(/<b>([^<]*)<\/b> <span class="tiny muted">([^<]*)<\/span>/g)].map(m => [unesc(m[1]), unesc(m[2])]), tips: [...h.matchAll(/<li style="margin:\.3rem 0">([\s\S]*?)<\/li>/g)].map(m => tk(strip(m[1]))), sampleBox: strip(P.$('#sampleBox').innerHTML).slice(0, 60) }; };
  const ex = [['', 'default: no part ⇒ p1, no topic ⇒ index 0; the examiner question is spoken 400 ms after the page opens (tts, accent = settings.accent, rate 0.95)'], ['p2/3', 'part p2, topic 3: ONE cue card (topic.p2.q + "You should say" + points); no "next question" button'], ['p3/1', 'part p3, topic 1: topic.p3 list; "Câu khác →" cycles qi = (qi+1) % n and speaks the new question'], ['zzz/99', 'unknown part ⇒ p1; topic index out of range ⇒ 0'], ['p2/abc', 'non-numeric topic ⇒ 0'], ['p1/20', 'merged topics (SPEAK_MORE appended by title) are addressable: index 20']];
  for (const [arg, why] of ex) { const P = await open(arg); const o = renderOut(P); o.spoken = clone(P.calls.tts).slice(0, 1); o.bankSize = P.sb.App.speakBank.length; if (arg === '') o.waits = P.ctl.log.filter(x => x[0] === 'wait'); out.render.push({ id: 'open-' + (arg || 'default').replace(/\W/g, '_'), why, input: { arg, accent: P.state.settings.accent }, out: o }); }
  { const P = await open('p3/0'); const before = P.calls.tts.length; P.$('#nextQ').onclick(); await settle(3); const q1 = P.$('#qBox').innerHTML; P.$('#nextQ').onclick(); await settle(3); P.$('#nextQ').onclick(); await settle(3);
    out.render.push({ id: 'next-question', why: 'p3 has 3 questions: 3 taps wrap qi 0→1→2→0; each tap clears #result and speaks the new question (tts, rate 0.95)', input: { arg: 'p3/0', taps: 3 }, out: { qIdx: tk(P.$('#qIdx').textContent), spoken: P.calls.tts.slice(before).map(x => x.text) } }); }
  { const P = await open('p1/0'); const sel = P.$('#spTopic'); sel.onchange({ target: { value: '4' } }); const a = P.sb.location.hash; P.$('#spRand').onclick(); const b = P.sb.location.hash; P.parts[1].onclick(); const c = P.sb.location.hash;
    out.render.push({ id: 'navigation', why: 'tabs and the topic select navigate with location.hash = #/speaking/<part>/<topic>; the dice picks a random topic different from the current one (Math.random)', input: { part: 'p1', topic: 0, select: 4 }, out: { afterSelect: a, afterRandomIsDifferent: b !== '#/speaking/p1/0', afterPartTab: c } }); }
  // ---------- recording timer (tick every 250 ms) ----------
  const rec = async (arg, o = {}) => { const P = await open(arg, o); P.$('#recBtn').onclick(); await settle(8); return P; };
  const tickAt = (P, secs) => { P.E.clock.t = P.t0 + secs * 1000; const iv = P.sb._intervals.filter(x => x.ms === 250).at(-1); iv.f(); return { text: P.$('#clock').textContent, color: P.$('#clock').style.color || '' }; };
  for (const [part, secs] of [['p1', [5, 19.9, 20, 40, 41, 120]], ['p3', [10, 40, 70, 71]], ['p2', [10, 90, 120, 130]]]) {
    const P = await open(part + '/0'); if (part === 'p2') { P.$('#recBtn').onclick(); P.sb._intervals.filter(x => x.ms === 1000).at(-1); await settle(3); P.$('#skipPrep').onclick({ preventDefault() {} }); } else P.$('#recBtn').onclick(); await settle(8);
    P.t0 = P.E.clock.t; const steps = secs.map(s => ({ secs: s, ...tickAt(P, s) })); P.sb.document.querySelector = () => null;
    out.timer.push({ id: 'clock-' + part, why: `clock = mm:ss of elapsed seconds, updated every 250 ms; colour: red (var(--again)) above target[1], green from target[0], neutral below${part === 'p2' ? '; Part 2 stops itself at 120 s (as in the real exam)' : ''}`, input: { part, ticksAtSeconds: secs }, out: { recordingStarted: P.media.srs.length === 1, srLang: P.media.srs[0] && P.media.srs[0].lang, continuous: P.media.srs[0] && P.media.srs[0].continuous, interim: P.media.srs[0] && P.media.srs[0].interimResults, steps, stoppedAutomatically: !!(P.media.srs[0] && P.media.srs[0].stopped) } }); }
  { const P = await open('p2/0'); P.$('#recBtn').onclick(); await settle(3); const hint = tk(P.$('#clockHint').innerHTML), c0 = P.$('#clock').textContent; const iv = P.sb._intervals.filter(x => x.ms === 1000).at(-1); const seen = []; for (let i = 0; i < 60; i++) { iv.f(); if (i === 0 || i === 58 || i === 59) seen.push(P.$('#clock').textContent); } await settle(8);
    out.timer.push({ id: 'p2-prep', why: 'Part 2: the FIRST tap on the mic starts a 60 s preparation countdown (1 s ticks, clock mm:ss), hint "Thời gian chuẩn bị – …"; at 0 a pop sound plays and recording starts by itself; "bắt đầu nói ngay" skips the wait and starts recording', input: { part: 'p2', prepSeconds: 60 }, out: { hint, initial: c0, ticks: seen, recordingStartedAtZero: P.media.srs.length === 1, sfx: P.sb._sfx || [], hintAfter: tk(P.$('#clockHint').textContent) } }); }
  // ---------- analyse() ----------
  const ana = async (id, why, o) => {
    const P = await open(o.arg || 'p1/0', { settings: o.settings, cards: o.cards });
    if (o.part2) { P.$('#recBtn').onclick(); await settle(3); P.$('#skipPrep').onclick({ preventDefault() {} }); } else P.$('#recBtn').onclick(); await settle(8);
    const sr = P.media.srs[0]; if (sr && o.text != null) { const parts = Array.isArray(o.text) ? o.text : [o.text]; for (const [i, tx] of parts.entries()) sr.onresult({ resultIndex: 0, results: [{ isFinal: i < parts.length - (o.interim ? 1 : 0), 0: { transcript: tx } }] }); }
    const live = P.$('#live').textContent; P.E.clock.t += o.secs * 1000; const calls0 = P.calls.rewards.length; P.$('#recBtn').onclick(); await settle(10);
    const r = { id, why, input: { arg: o.arg || 'p1/0', part: (o.arg || 'p1').split('/')[0], seconds: o.secs, recognised: o.text, cards: Object.keys(o.cards || {}) }, out: { ...parseResult(P.$('#result').innerHTML), live, rewards: clone(P.calls.rewards).slice(calls0), win: (P.sb._sfx || []).includes('win'), aiAttached: !!P.sb.AI, hint: tk(P.$('#recHint').textContent) } };
    out.analyse.push(r); return r;
  };
  await ana('short', 'p1: 8 s < target[0] (20): "ngắn" note; 11 words in 8 s ⇒ wpm = round(words/(s/60)) = 83 < 90 ⇒ slow note; secs ≤ 3 would give wpm 0 (shown "—"); ≥ 10 words ⇒ reward {spoken: min(10, round(words/10)), quizzes 1, xp 15} + win sound', { secs: 8, text: TXT.plain(11) });
  await ana('good', 'p1: 24 s, 47 words (~117 wpm), linking words and an idiom present: no note applies ⇒ the single "Rất tốt!…" note', { secs: 24, text: TXT.rich });
  await ana('long', 'p1: > target[1] + 15 s (55) ⇒ "quá dài" note (not for Part 2)', { secs: 60, text: TXT.plain(110) });
  await ana('fast', '> 180 wpm ⇒ "khá nhanh" note', { secs: 20, text: TXT.plain(80) });
  await ana('fillers', '≥ 3 filler words (um, uh, er, like, you know, i mean, kind of, sort of) ⇒ note with the count; fillers counted by the regex on the raw transcript', { secs: 30, text: 'um I think uh the city is like very big you know and kind of noisy ' + TXT.plain(40) });
  await ana('no-link-no-phrase', '> 30 words with fewer than 2 linking words ⇒ "Thêm từ nối" note; no collocation/idiom ⇒ "Thử dùng 1–2 collocation" note (Lexis.analyze on the transcript)', { secs: 30, text: TXT.plain(60) });
  await ana('rich', 'academic words, linking words and phrases present ⇒ none of those notes; topic words found in the transcript get ✓ chips, AWL words 🎓, linking words 🧷', { arg: 'p1/7', secs: 25, text: TXT.rich, cards: { residents: { word: 'residents' } } });
  await ana('no-text', 'nothing recognised: "Không nhận được chữ nào…" note, no transcript card, no reward (words < 10)', { secs: 25, text: null });
  await ana('under-10-words', 'a result with < 10 words: analysis shown, but NO reward and no win sound', { secs: 12, text: 'I like my city very much' });
  await ana('interim-merge', 'final results are appended with a space, the last non-final (interim) text is included in the analysed transcript: text = (final + " " + interim)', { secs: 30, text: ['the city is big', 'and the people are kind and friendly to everyone around'], interim: true });
  await ana('p2', 'Part 2 target 90–120 s: 60 s answer ⇒ "ngắn" note; the "quá dài" note never applies to Part 2', { arg: 'p2/0', part2: true, secs: 60, text: TXT.plain(120) });
  { const P = await open('p1/0', { denyMic: true }); P.$('#recBtn').onclick(); await settle(8);
    out.analyse.push({ id: 'mic-denied', why: 'getUserMedia fails ⇒ toast "⚠️ Cần cho phép dùng micro…", recording does not start (no SR, no clock)', input: { arg: 'p1/0' }, out: { toast: tkAll((P.sb._toasts || []).join('|')), srCreated: P.media.srs.length } }); }
  { const P = await open('p1/0', { noSR: true }); P.$('#recBtn').onclick(); await settle(8); P.E.clock.t += 20000; P.$('#recBtn').onclick(); await settle(10);
    out.analyse.push({ id: 'no-recognizer', why: 'no SpeechRecognition: the audio is still recorded; hint "Đang ghi âm… (trình duyệt không hỗ trợ chuyển giọng nói thành chữ)"; analysis has no transcript ⇒ the no-text note', input: { arg: 'p1/0' }, out: { ...parseResult(P.$('#result').innerHTML), srCreated: P.media.srs.length, rewards: clone(P.calls.rewards) } }); }
  // ---------- sample answer + shadowing ----------
  const keyQ = Object.keys(C.SAMPLES)[0];
  const shP = async () => { const P = await open('p1/0'); return P; };
  { const P = await shP(); const smp = C.SAMPLES[keyQ], box = P.$('#sampleBox').innerHTML, sents = [...box.matchAll(/<span class="sm-s" data-i="(\d+)">([^<]*)<\/span>/g)].map(m => unesc(m[2]));
    out.shadow.push({ id: 'sample-box', why: 'a sample answer exists for the question (key = the question text; Part 2 key = topic.p2.q): shown in a collapsed box, split into sentences (UI.splitSentences); vocab chips save a phrase (App.savePhraseDialog) with the first sentence that contains the first word; "Nghe cả bài" speaks the whole sample sentence by sentence (accent, rate 0.95)', input: { question: keyQ }, out: { sentences: sents, vocab: [...box.matchAll(/data-en="([^"]*)" data-vi="([^"]*)"/g)].map(m => [unesc(m[1]), unesc(m[2])]), expectedSentences: P.sb.UI.splitSentences(smp.a) } }); }
  const shadow = async (id, why, script) => {
    const P = await shP(), sents = P.sb.UI.splitSentences(C.SAMPLES[keyQ].a); P.$('#smShadow').onclick(); await settle(3); const steps = [];
    for (let k = 0; k < sents.length; k++) {
      const sh = { sentence: sents[k], boxStart: tkAll(P.$('#smShadowBox').innerHTML).slice(0, 1) }; const act = script[k] || { skip: true };
      if (act.skip) { P.$('#shN').onclick(); sh.action = 'skip'; } else { const n0 = P.rec.recog.length; P.$('#shR').onclick(); const h = P.rec.recog[n0]; sh.recognizeTarget = h.target; sh.accent = h.accent; h.cb.result({ heard: act.heard, score: act.score, audio: act.audio || '' }); sh.score = act.score; const html = P.$('#shRes').innerHTML; sh.verdictColor = /color:var\((--\w+)\)/.exec(html)[1]; P.$('#shNext').onclick(); sh.action = 'score'; }
      await settle(2); steps.push(sh);
    }
    const fin = P.$('#smShadowBox').innerHTML; out.shadow.push({ id, why, input: { question: keyQ, sentences: sents, script }, out: { steps, final: tkAll(fin).slice(0, 1), rewards: clone(P.calls.rewards), settingsWritten: Object.keys(flagWrites(P)) } });
  };
  const sN = C.sb ? 0 : 0; void sN;
  { const P = await shP(); const n = P.sb.UI.splitSentences(C.SAMPLES[keyQ].a).length;
    await shadow('shadow-all', 'shadowing: for each sample sentence: hear it (normal 🔊 / slow 🐢 rate 0.7, whisper switch), speak it (recognizer target = the sentence, accent = settings.accent), score = platform similarity %; colour: ≥ 80 good, ≥ 60 medium, else again; "Câu tiếp" moves on. Finish: "Hoàn thành shadowing · trung bình {pct}% giống mẫu" with pct = round(sum of scores / number of sentences) and reward {spoken: 3, xp: 10}', Array.from({ length: n }, (_, k) => ({ heard: 'heard sentence ' + k, score: [95, 72, 40, 80, 60, 59][k % 6] })));
    await shadow('shadow-skip', 'skipping ("Bỏ qua →") adds nothing to the total but the average still divides by ALL sentences', Array.from({ length: n }, (_, k) => (k % 2 ? { skip: true } : { heard: 'x', score: 100 }))); }
  return out;
}

// ================================================================== #/pron (web/js/pron.js + pron/{sayit,rhythm}.js) ==================================================================
const PFILES = [...PRON_FILES, 'web/js/pron/pairs.js', 'web/js/pron/coach.js'];
const mouthOf = (() => { const src = rd('web/js/pron.js'); const fn = vm.runInNewContext(`(function(t){ ${slice(src, /function mouthSvg\(m\) \{/)}\n return mouthSvg; })`)(RT); return m => { const h = fn(m); const num = (re, i = 1) => +re.exec(h)[i]; const ell = [...h.matchAll(/<ellipse cx="([\d.]+)" cy="([\d.]+)" rx="([\d.]+)" ry="([\d.]+)"/g)].map(x => x.slice(1).map(Number)); return { outerLip: ell[0], innerMouth: ell[1], tongue: ell[2], caption: [...h.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(x => x[1])[0] }; }; })();
async function pronPage(arg, o = {}) {
  const x = arg && content().PRON.find(l => l.id === arg), cache = {}, cl = (key, n, f) => (cache[key] ||= Array.from({ length: n }, (_, i) => f(i)));
  const P = await pg({ hash: '#/pron', game: o.game, settings: o.settings, files: PFILES, sets: sb => { sb.innerWidth = 1200; sb.PronSay = { mount(box, lx, op) { sb._say = { box, lx, op }; } }; sb.PronRhythm = { mount(box, lx) { sb._rhythm = { box, lx }; } }; sb.Audio = class { constructor(src) { this.src = src; } play() { return Promise.resolve(); } }; }, late: ['web/js/pron.js'] });
  const D = P.E.dom;
  if (x) {
    D.resolveList('[data-slow]', () => cl('slow', x.words.length, i => el(P, 'b', { dataset: { slow: x.words[i].w } })));
    D.resolveList('.pmic', () => cl('pmic', x.words.length, i => el(P, '.pmic', { dataset: { k: String(i) } })));
    D.resolveList('.smic', () => cl('smic', (x.sentences || []).length, i => el(P, '.smic', { dataset: { k: String(i) } })));
    x.words.forEach((_, i) => D.resolve(`[data-s="${i}"]`, () => (cache['s' + i] ||= el(P, '.pscore'))));
    (x.sentences || []).forEach((_, i) => D.resolve(`[data-ss="${i}"]`, () => (cache['ss' + i] ||= el(P, '.pscore'))));
    D.resolveList('#pairGame .option', () => cl('opt', 2, i => el(P, '.option', { dataset: { k: String(i) } })));
    D.resolveList('.q-item', () => cl('qi', (x.quiz || []).length, i => { const it = el(P, '.q-item', { dataset: { q: String(i) } }), btns = x.quiz[i].options.map((_, j) => el(P, 'button', { dataset: { v: String(j) } })), ex = el(P, '[data-explain]', { hidden: true }); it._lists = { '.opts button': btns }; it._q = sel => (sel === '[data-explain]' ? ex : null); it._btns = btns; it._ex = ex; return it; }));
    P.cache = cache;
  }
  await P.routes.pron(arg); await settle(4); return { P, x };
}
const pronHubOut = h => { const groups = [], re = /<div class="section-title"><h2>([^<]*)<\/h2><span class="muted small">([^<]*)<\/span><\/div>\s*([\s\S]*?)(?=<div class="section-title">|<p class="tiny muted"|$)/g; let m;
  while ((m = re.exec(h))) { const body = m[3], tiles = body.split(/<a class="/).slice(1).map(a => ({ id: decodeURIComponent(/href="#\/pron\/([^"]*)"/.exec(a)[1]), cls: /^([^"]*)"/.exec(a)[1], done: /<i>✓<\/i>/.test(a) ? true : (x => (x ? +x[1] : null))(/✓ (\d+)%/.exec(a)) }));
    groups.push({ title: tk(unesc(m[1]).replace(/^\S+ /, '')), desc: tk(unesc(m[2])), chart: /ipa-grid/.test(body), lessons: tiles.map(t => t.id), done: Object.fromEntries(tiles.filter(t => t.done).map(t => [t.id, t.done])), unvoiced: tiles.filter(t => /\bunv\b/.test(t.cls)).map(t => t.id) }); }
  return { ring: /--p:(\d+)/.exec(h) ? +/--p:(\d+)/.exec(h)[1] : null, groups }; };
async function pronVectors() {
  const C = content(), out = { hub: [], lesson: [], mouth: [], pairGame: [] };
  // ---- hub ----
  for (const [id, why, game] of [['fresh', 'no progress: ring 0; five groups in this order: vowels (12), diphthongs (8), consonants (24) as IPA tiles; vn (Sửa lỗi người Việt) and stress as topic cards; a group with no lessons is skipped', {}], ['progress', 'game.pronDone = { lessonId: best % } ⇒ ✓ on the tile / "✓ n%" chip on the card; ring = number of lessons with an entry ÷ all lessons (rounded %), label "n/N"', { pronDone: { 'iː': 90, 'th-sounds': 60, 'weak-forms': 100 } }]]) {
    const P = await pg({ hash: '#/pron', game: { xp: 0, days: {}, total: {}, ...game }, files: PFILES, sets: sb => { sb.PronSay = {}; sb.PronRhythm = {}; }, ui: { ring: (p, l, c) => `<div class="ring" style="--p:${Math.round(p)}"><b>${l}</b></div>` }, late: ['web/js/pron.js'] });
    await P.routes.pron(''); const h = P.view.innerHTML, o = pronHubOut(h); o.lessonCount = C.PRON.length; o.ringLabel = /<div class="ring"[^>]*><b>([^<]*)<\/b>/.exec(h)[1]; o.counts = Object.fromEntries(o.groups.map(g => [g.title.k, g.lessons.length])); o.groups.forEach(g => { g.lessons = g.lessons.length > 6 ? [...g.lessons.slice(0, 3), '…'] : g.lessons; });
    out.hub.push({ id, why, input: { pronDone: game.pronDone || {} }, out: o }); }
  // ---- mouth figure geometry (vowels): the SVG numbers come from lips/jaw/tongue ----
  const combos = [...new Map(C.PRON.filter(l => l.mouth && l.mouth.lips).map(l => [JSON.stringify([l.mouth.lips, l.mouth.jaw, l.mouth.tongue]), l.mouth])).values()];
  for (const m of combos) out.mouth.push({ input: { lips: m.lips, jaw: m.jaw, tongue: m.tongue }, out: mouthOf(m) });
  // ---- lesson render ----
  const lessonOut = (P, x) => { const h = P.view.innerHTML, all = C.PRON, i = all.findIndex(l => l.id === x.id); return { back: '#/pron', ipa: x.ipa, title: x.title, chips: [...h.matchAll(/<span class="chip" style="background:rgba\(255,255,255,\.2\);color:#fff">([^<]*)<\/span>/g)].map(m => tk(m[1])), hasMouth: /class="mouth"/.test(h), rules: x.rules ? x.rules.length : 0, words: x.words.length, pairs: (x.pairs || []).length, sentences: (x.sentences || []).length, quiz: (x.quiz || []).length, sections: { sayIt: /id="sayIt"/.test(h), rhythm: /id="pRhythm"/.test(h), pairGame: /id="pairGame"/.test(h) }, prev: i > 0 ? '#/pron/' + encodeURIComponent(all[i - 1].id) : null, next: i < all.length - 1 ? '#/pron/' + encodeURIComponent(all[i + 1].id) : '#/pron', firstWordSpoken: P.calls.speak.slice(0, 1), waits: P.ctl.log.filter(z => z[0] === 'wait') }; };
  for (const [id, why] of [['iː', 'vowel lesson: chips (voiced/long), mouth figure, no rules, words (hear 🔊 / slow 🐢 rate 0.55 / mic), pair game (5 pairs), sentences; the first word is spoken 300 ms after opening (UI.speak, accent)'], ['th-sounds', 'Vietnamese-errors lesson: rules cards, "Luyện nói cặp từ" (PronSay, because PronPairs.forSkill(id) is non-empty), pair game, sentences, quick quiz (5)'], ['weak-forms', 'stress lesson: the rhythm coach (PronRhythm) mounts because the id is in RHYTHM = weak-forms, word-stress, stress-shift, connected-speech, chunking, intonation'], ['chunking', 'last of the rhythm group: no pairs ⇒ no pair-game card']]) {
    const { P, x } = await pronPage(id); out.lesson.push({ id: 'render-' + id, why, input: { lesson: id, accent: P.state.settings.accent }, out: lessonOut(P, x) }); }
  { const { P } = await pronPage('zzz'); out.lesson.push({ id: 'unknown-lesson', why: 'unknown lesson id ⇒ the hub is shown (routes.pron())', input: { lesson: 'zzz' }, out: { hub: /Thư viện phát âm/.test(P.view.innerHTML) } }); }
  // ---- word / sentence mic ----
  const mic = async (id, why, lessonId, script, o = {}) => {
    const { P, x } = await pronPage(lessonId, o), steps = []; const btns = P.cache.pmic, sbs = P.cache.smic;
    for (const sc of script) { const b = (sc.sentence ? sbs : btns)[sc.k], n0 = P.rec.recog.length, r0 = P.calls.rewards.length, w0 = P.writes.length, s0 = (P.sb._sfx || []).length; b.onclick(); const h = P.rec.recog[n0]; const rec = { k: sc.k, sentence: !!sc.sentence, target: h.target, accent: h.accent, recording: b._cls ? b._cls.has('rec') : null };
      h.cb.result({ score: sc.score, heard: sc.heard || 'heard', audio: sc.audio || '' }); h.cb.end(); await settle(3);
      const o2 = P.cache[(sc.sentence ? 'ss' : 's') + sc.k]; rec.score = sc.score; rec.colour = /var\((--\w+)\)/.exec(o2.innerHTML)[1]; rec.hint = tk(P.$('#pHint').textContent); rec.rewards = clone(P.calls.rewards).slice(r0); rec.writes = P.writes.slice(w0).map(w => ({ [w.store + ':' + w.key]: w.value })); rec.sounds = (P.sb._sfx || []).slice(s0); steps.push(rec); }
    out.lesson.push({ id, why, input: { lesson: lessonId, words: x.words.map(w => w.w), sentences: x.sentences || [], script, pronDone: (o.game || {}).pronDone || {} }, out: { steps } }); };
  const base = { xp: 0, days: {}, total: {} };
  await mic('word-mic-save', 'word mic: the platform score (similarity %) is shown (colour: ≥ 85 good, ≥ 65 medium, else again; sounds correct ≥ 85, wrong < 65); every score ≥ 65 rewards {spoken:1, xp:2}; scores[k] keeps the BEST per word; the lesson best is saved to game.pronDone[id] = max(old, round(mean of the best scores)) as soon as ≥ min(5, words) words have a score', 'iː', [90, 70, 50, 85, 65, 40, 100].map((score, k) => ({ k, score })).concat([{ k: 0, score: 60 }, { k: 5, score: 95 }]), { game: base });
  await mic('word-mic-keeps-old-best', 'an existing best is never lowered: pronDone[id] = max(new mean, old)', 'iː', [0, 1, 2, 3, 4].map(k => ({ k, score: 70 })), { game: { ...base, pronDone: { 'iː': 95 } } });
  await mic('sentence-mic', 'sentence mic (text cleaned of ↗ ↘ ‿ and " / " before recognising): ≥ 70 rewards {spoken:2, xp:4}; nothing is saved to pronDone', 'th-sounds', [{ k: 0, score: 69, sentence: true }, { k: 1, score: 70, sentence: true }, { k: 2, score: 100, sentence: true }], { game: base });
  // ---- pair game (listen & choose, 8 rounds) ----
  const pairRun = async (id, why, lessonId, rights) => {
    const { P, x } = await pronPage(lessonId, { game: base }); P.E.M.random = cyc(seq(50)); P.$('#startPairs').onclick(); await settle(3); const rounds = [];
    for (let r = 0; r < 8; r++) { const h = P.$('#pairGame').innerHTML, opts = [...h.matchAll(/data-k="(\d)">([^<]*)<\/button>/g)].map(m => unesc(m[2])); const spoken = P.calls.tts.at(-1).text, ans = opts.indexOf(spoken), right = rights[r]; const picked = right ? ans : 1 - ans; const sfx0 = (P.sb._sfx || []).length; P.cache.opt[picked].onclick(); rounds.push({ options: opts, spoken: spoken, answerIndex: ans, picked, right, classes: P.cache.opt.map(o => [...o._cls].sort()), sound: (P.sb._sfx || []).slice(sfx0) }); await settle(3); }
    const fin = P.$('#pairGame').innerHTML; const ok = rights.filter(Boolean).length;
    out.pairGame.push({ id, why, input: { lesson: lessonId, random: seq(50), pairs: x.pairs, rights }, out: { rounds, final: tkAll(/<b>([\s\S]*?)<\/b>[\s\S]*?(?: – ([^<]*?) )?<button/.exec(fin) ? fin.replace(/<button[\s\S]*$/, '') : fin).slice(0, 3), good: /feedback ok/.test(fin), rewards: clone(P.calls.rewards), finishSfx: (P.sb._sfx || []).slice(-1) } }); };
  await pairRun('pairs-6-of-8', 'pair game: 8 rounds; the word list is the lesson pairs cycled (pairs[k % n]) in random order; per round the platform plays one word of the pair (the answer side = random < 0.5 ? 0 : 1, rate 0.85) and the learner picks; right ⇒ green + correct sound, wrong ⇒ red + the right one green + wrong sound; next round 900 ms later. End: "Nghe đúng {ok}/8", ≥ 75 % ⇒ praise else retry hint; reward {quizzes:1, pron:1, xp: 5 + 2·ok}', 'iː', [true, true, false, true, true, false, true, true]);
  await pairRun('pairs-5-of-8', '5/8 = 63 % < 75 ⇒ the "nghe chậm lại" hint (feedback "no")', 'iː', [true, false, true, false, true, false, true, true]);
  // ---- quick quiz ----
  const quiz = async (id, why, lessonId, picks) => {
    const { P, x } = await pronPage(lessonId, { game: base }), items = P.cache.qi, steps = [];
    for (const [i, v] of picks.entries()) { const it = items[i], b0 = (P.sb._sfx || []).length, r0 = P.calls.rewards.length; it._btns[v].onclick(); await settle(3); steps.push({ q: i, picked: v, answer: x.quiz[i].answer, ok: v === x.quiz[i].answer, classes: it._btns.map(b => [...b._cls].sort()), mark: it._ex.innerHTML.slice(0, 2), explainHidden: it._ex.hidden, locked: !!it.dataset.locked, rewards: clone(P.calls.rewards).slice(r0) }); }
    items[0]._btns[0].onclick(); await settle(2);
    out.lesson.push({ id, why, input: { lesson: lessonId, picks, answers: x.quiz.map(q => q.answer), pronDone: {} }, out: { steps, writes: P.writes.filter(w => w.key === 'pronDone').map(w => w.value), rewardsTotal: clone(P.calls.rewards), clickAfterLockedIgnored: P.calls.rewards.length } }); };
  await quiz('quiz-perfect', 'quick quiz: one try per question (locked after the first pick; ✅/❌ + explanation shown); after the LAST question: pct = round(right/n·100); reward {quizzes:1, pron:1, perfect: pct==100 ? 1 : 0, xp: 8 + 3·right}; pronDone[id] = max(pct, old)', 'th-sounds', [0, 0, 0, 0, 0].map((_, i) => C.PRON.find(l => l.id === 'th-sounds').quiz[i].answer));
  await quiz('quiz-mixed', '3 of 5 right: no perfect, xp 8 + 9', 'th-sounds', C.PRON.find(l => l.id === 'th-sounds').quiz.map((q, i) => (i < 3 ? q.answer : (q.answer + 1) % q.options.length)));
  return out;
}

/** a container element whose children are created on demand and reset every time innerHTML is assigned (what a re-render does in a real DOM) */
function fakeBox(P) {
  let reg = new Map(); const get = sel => { if (!reg.has(sel)) reg.set(sel, P.E.dom.mkEl(sel)); return reg.get(sel); };
  const box = { _h: '', get innerHTML() { return this._h; }, set innerHTML(v) { this._h = v; reg = new Map(); }, querySelector: get, querySelectorAll: () => [], isConnected: true, remove() { this.removed = true; }, get };
  return box;
}
async function pronSayVectors() {
  const C = content(), out = { say: [], rhythm: [] };
  const open = async ls => pg({ hash: '#/pron', ls, files: [...PFILES, 'web/js/pron/sayit.js', 'web/js/pron/rhythm.js'], ui: { WEAK: C.WEAK } });
  const X = C.PRON.find(l => l.id === 'th-sounds');
  // ---------- "Nói thử": minimal-pair speaking session ----------
  const sayRun = async (id, why, script, o = {}) => {
    const P = await open(o.stats ? { 'lk.pronPairs': JSON.stringify(o.stats) } : undefined), box = fakeBox(P); let fb = 0; P.E.M.random = cyc(o.random || seq(60));
    P.sb.PronSay.mount(box, X, { fallback: () => { fb++; } }); const intro = tkAll(box.innerHTML.replace(/<h3>[\s\S]*?<\/h3>/, '')).slice(0, 4);
    box.get('#sayStart').onclick(); await settle(3); const steps = []; let n = 0, guard = 0;
    while (!/sayAgain/.test(box.innerHTML) && guard++ < 60) {
      const h = box.innerHTML, it = { index: /(\d+)\/(\d+)/.exec(h) ? /(\d+)\/(\d+)/.exec(h)[0] : null, target: unesc((/font-size:2\.4rem[^>]*>([^<]*)</.exec(h) || [])[1]), other: unesc((/≠ ([^<]*)</.exec(h) || [])[1]), label: unesc((/<div class="small muted">([^<]*)</.exec(h) || [])[1]) };
      const sc = script[n++ % script.length]; const mic = box.get('#sayMic'), n0 = P.rec.recog.length; mic.onclick(); await settle(4);
      if (sc.error === 'stopTap') { mic.onclick(); } const h2 = P.rec.recog[n0]; if (!h2) { steps.push({ ...it, outcome: sc.o, noRecognizer: true }); break; }
      if (sc.error) { h2.cb.error(sc.error); } else { const alts = sc.o === 'good' ? [it.target, 'x'] : sc.o === 'other' ? [it.other] : sc.o === 'both' ? [it.target + ' ' + it.other] : ['zzz', 'qqq']; h2.cb.result({ alts, heard: alts[0], audio: sc.audio || '' }); }
      h2.cb.end(); await settle(4);
      if (sc.error && /sayListen/.test(box.innerHTML)) { steps.push({ ...it, outcome: sc.o, error: sc.error, blocked: tkAll(box.innerHTML.replace(/<h3>[\s\S]*?<\/h3>/, '')).slice(0, 1) }); box.get('#sayListen').onclick(); break; }
      const stateEl = box.get('#sayState'), outEl = box.get('#sayOut'); const rec = { ...it, outcome: sc.error || sc.o, state: tk(strip(stateEl.innerHTML || stateEl.textContent)), tip: /g-tip/.test(outEl.innerHTML) ? strip(outEl.innerHTML.replace(/<button[\s\S]*$/, '')).replace(/^\S+ /, '').slice(0, 80) : null, retryHeard: /<div class="small muted">/.test(outEl.innerHTML), nextButton: /sayNext/.test(outEl.innerHTML), micDisabled: !!mic.disabled };
      steps.push(rec); if (/sayNext/.test(outEl.innerHTML)) box.get('#sayNext').onclick(); await settle(2); }
    const fin = /sayAgain/.test(box.innerHTML) ? { score: tk(strip(/<div class="feedback[^>]*>([\s\S]*?)<\/div>/.exec(box.innerHTML)[1])), chips: [...box.innerHTML.matchAll(/<span class="chip ?(ok)?"><b>([^<]*)<\/b> (\d+)\/(\d+)/g)].map(m => ({ contrast: unesc(m[2]), ok: +m[3], n: +m[4], all: !!m[1] })) } : null;
    out.say.push({ id, why, input: { lesson: X.id, contrasts: C.sb.PronPairs.forSkill(X.id).map(c => c.id), script, random: o.random || seq(60), stats: o.stats || {} }, out: { intro, steps, final: fin, rewards: clone(P.calls.rewards), writes: P.writes.filter(w => w.key === 'lk.pronPairs').map(w => JSON.parse(w.value)).slice(-1), fallbackCalled: fb, spoken: P.calls.speak.slice(0, 2).map(x => x.word) } }); };
  await sayRun('session-mixed', 'speaking session (lesson th-sounds ⇒ contrasts th-s, th-t, dh-d, dh-z): 10 words from PronPairs.buildSession (weakest contrasts weighted up); each word: hear the model (UI.speak 250 ms after showing, accent en-US), tap the mic: PronPairs.decide(alts, target, other) ⇒ "target" (✓ counted, "Chính xác!"), "other" (counted wrong, tip = TIPS[contrast][side], PronPairs.adapt re-queues it 3 later) or "neither" (not counted: retry, "Chưa nghe rõ – thử lại nhé (không trừ điểm)."; after 2 retries the 3rd "neither" shows "Vẫn chưa rõ – chuyển sang từ tiếp theo." and a Next button). End: "Nói đúng {ok}/{n} từ" (n = scored words), chips per contrast "ok/n", reward {spoken: ok, pron: 1, xp: 5 + 2·ok}; stats saved to localStorage lk.pronPairs via PronPairs.record + endSession', [{ o: 'good' }, { o: 'other' }, { o: 'neither' }, { o: 'neither' }, { o: 'neither' }, { o: 'good' }, { o: 'good' }, { o: 'other' }, { o: 'good' }, { o: 'good' }, { o: 'good' }, { o: 'good' }, { o: 'good' }, { o: 'good' }]);
  await sayRun('session-all-good', 'every word said right: ok = scored = 10 ⇒ feedback "ok" (≥ 80 %), xp 25', [{ o: 'good' }]);
  await sayRun('session-weak-stats', 'existing stats (th-s 20 % over 5, dh-d 100 %) change which contrasts are drawn (weights 1 + 3·(1 − accuracy), unpractised 2)', [{ o: 'good' }], { stats: { 'th-s': { ok: 1, n: 5, hist: [] }, 'dh-d': { ok: 5, n: 5, hist: [] } }, random: seq(60).map((x, i) => (i % 2 ? x : 1 - x)) });
  await sayRun('mic-blocked', 'error not-allowed (or service-not-allowed / unsupported / audio-capture) ⇒ a friendly "mic blocked" panel with [Luyện nghe] (jumps to the pair-listening game, o.fallback) and [Thử lại]; "unsupported" has its own text', [{ error: 'not-allowed', o: 'blocked' }]);
  await sayRun('no-speech', 'error no-speech / network / busy / whisper ⇒ treated as "neither" (retry, no penalty)', [{ error: 'no-speech', o: 'neither' }, { error: 'network', o: 'neither' }, { error: 'busy', o: 'neither' }, { o: 'good' }]);
  // ---------- Nhịp câu & shadowing ----------
  const rhRun = async (id, why, sentenceIdx, heard, o = {}) => {
    const P = await open(o.done ? { 'vb.pron.rhythm': JSON.stringify(o.done) } : undefined), box = fakeBox(P), x = C.PRON.find(l => l.id === 'weak-forms'); if (o.accent) P.state.settings.accent = o.accent;
    P.sb.PronRhythm.mount(box, x); const init = { picked: [...box.innerHTML.matchAll(/data-k="(\d+)" aria-pressed="(true|false)"/g)].find(m => m[2] === 'true')[1], marks: [...box.innerHTML.matchAll(/data-k="\d+" aria-pressed="(?:true|false)" title="[^"]*">([^<]*)<\/button>/g)].map(m => m[1]), plan: [...box.innerHTML.matchAll(/<span class="rhy-w">(<b>([^<]*)<\/b>|<span>([^<]*)<\/span>(?:<span class="ipa">([^<]*)<\/span>)?)<\/span>/g)].map(m => (m[2] ? { w: m[2], stress: true } : { w: m[3], stress: false, weak: m[4] || '' })) };
    if (sentenceIdx !== init.picked * 1) { box.get('[data-k]'); }
    const g = box.get('#rhyGo'); g.onclick(); await settle(6); const tts0 = clone(P.calls.tts).slice(-1)[0]; P.calls.ttsOpts.onEnd(); await settle(2); const h = P.rec.recog.at(-1); const target = h.target;
    h.cb.result({ heard, alts: o.alts || [heard], audio: o.audio || '' }); await settle(4);
    const html = box.innerHTML, fb = /<b>(\d+)\/100 · ([^<]*)<\/b>/.exec(html);
    out.rhythm.push({ id, why, input: { sentence: init.picked * 1, heard, alts: o.alts || [heard], accent: P.state.settings.accent, doneBefore: o.done || {} }, out: { init, shadowingTts: { text: tts0.text, accent: tts0.accent }, recognizeTarget: target, score: +fb[1], verdict: tk(unesc(fb[2])), tips: [...html.matchAll(/<div class="small">💡 ([^<]*)<\/div>/g)].map(m => tk(unesc(m[1]))), heardShown: unesc(/“([^”]*)”/.exec(html)[1]), mineButtons: /rhyMine"/.test(html), suggestions: [...html.matchAll(/<(?:button type="button" class="btn sm" data-goto="(\d+)"|a class="btn sm" href="#\/pron\/([^"]*)")>([^<]*)</g)].map(m => (m[1] ? { kind: 'rhythm', k: +m[1] } : { kind: 'link', href: decodeURIComponent(m[2]), label: unesc(m[3]) })), feedbackClass: /feedback (ok|no)/.exec(html)[1], rewards: clone(P.calls.rewards), saved: P.writes.filter(w => w.key === 'vb.pron.rhythm').map(w => JSON.parse(w.value)).slice(-1)[0] } }); };
  await rhRun('great', 'shadowing: the model is spoken at rate 0.9, THEN (onEnd) the recognizer starts with the sentence as target; score = PronCoach.score(max similarity over the alternatives, PronCoach.diff(heard, sentence)); ≥ 85 great, ≥ 65 close, else again (kind messages only); best score per sentence saved to localStorage vb.pron.rhythm {index: best}; reward {spoken:1, pron:1, xp: ≥85 ? 4 : 2} when score ≥ 65', 0, 'I want to go to the shop');
  await rhRun('close-missing-weak', 'weak words dropped: small penalty (3 each) + tip "Máy nghe sót từ nhỏ…" (no tip when a content word is missing: content tip wins)', 0, 'I want go the shop');
  await rhRun('again-missing-content', 'content word missing: 12 points each + tip "Nhấn rõ hơn các từ chính: …"; < 65 ⇒ no reward', 0, 'I want to the shop');
  await rhRun('keeps-best', 'the sentence offered first is the first whose saved best is < 85; the saved best per sentence is max(old, new): a worse run does not lower it', 1, 'give cup', { done: { 0: 90, 1: 80 } });
  await rhRun('best-of-alternatives', 'similarity uses the best of the platform alternatives; the diff uses the first (heard)', 0, 'a shop to go I want', { alts: ['a shop to go I want', 'I want to go to the shop'] });
  return out;
}

// ================================================================== #/say (web/js/say.js) ==================================================================
const SAY = JSON.parse(rd('web/data/say.json'));
const NOHTML = d => Object.fromEntries(Object.entries(d).filter(([k, v]) => !(typeof v === 'string' && /<[a-z][\s\S]*>/i.test(v) && ['teacher', 'nav', 'tabs', 'heard'].includes(k))));
async function sayVectors() {
  const out = { list: [], card: [], mic: [], actions: [] };
  const open = async (arg, o = {}) => {
    const mounts = []; let P;
    P = await pg({ hash: '#/say', ls: o.ls, learnLang: o.learnLang, lang: o.lang, files: ['web/js/characters.js'], ui: { tts: (text, accent, rate, opts) => { (P.say ||= []).push({ text, accent, rate: rate ?? null, voice: opts && opts.voice }); }, ...(o.ui || {}) },
      sets: sb => { sb.fetch = async () => (o.fetchFail ? { ok: false, status: 500 } : { ok: true, status: 200, json: async () => clone(o.data || SAY) }); sb.matchMedia = () => ({ matches: true }); sb.scrollTo = () => {}; sb.document.onkeydown = null; sb.ST = { esc: s => s };
        const rootEl = () => { const r = P.E.dom.mkEl('.v2'), main = P.E.dom.mkEl('main'); r.main = main; r.querySelector = s => (s === 'main' ? main : s === '#sFlag' ? P.E.dom.mkEl('#sFlag') : P.E.dom.mkEl(s)); return r; };
        sb.ST2 = { mount: (view, name, d) => { const r = rootEl(); mounts.push({ name, d: NOHTML(clone(d)) }); view.querySelector = s => (s === '.v2' ? r : null); P.root = r; return r; }, tabs: id => id, shell: () => ({ nav: '' }), hdr: () => '' };
        sb.LKFile = { save: async () => 'saved' }; sb.App.need = async () => {}; sb.App.onCleanup = fn => (P.cleanups ||= []).push(fn); sb.UI.modal = () => P.E.dom.mkEl('modal'); }, late: ['web/js/say.js'] });
    P.mounts = mounts; P.$('#view'); P.state.settings.accent = 'en-US';
    await P.routes.say(arg); await settle(6); return P;
  };
  const listOut = P => ({ mounted: P.mounts.map(m => m.name), rows: [...P.root.main.innerHTML.matchAll(/<a href="#\/say\/([^"\/]*)\/([^"]*)"[\s\S]*?class="block text-\[17px\][^>]*>([^<]*)<\/span>[\s\S]*?class="block text-\[12px\][^>]*>([^<]*)<\/span>[\s\S]*?width:(\d+)%/g)].map(m => ({ series: m[1], firstCard: m[2], title: unesc(m[3]), progress: tk(unesc(m[4])), pct: +m[5] })), intro: tk(unesc(/<p class="text-\[14px\][^>]*>([\s\S]*?)<\/p>/.exec(P.root.main.innerHTML)[1])) });
  { const P = await open(''); out.list.push({ id: 'list-fresh', why: 'no argument ⇒ the list of series (Stitch say-front frame with a list body): per series the first card you have not seen (localStorage lk.say.seen {"series/card":1}), progress "{n}/{total} thẻ · với {name}" and bar % = round(100·seen/total); name = Chars.name(series.teacher)', input: { seen: {}, series: SAY.series.map(s => [s.id, s.items.length, s.teacher]) }, out: listOut(P) }); }
  { const seen = { 'say-no/not-my-cup-of-tea': 1, 'say-no/cant-stand': 1 }; const P = await open('', { ls: { 'lk.say.seen': JSON.stringify(seen) } }); out.list.push({ id: 'list-progress', why: 'seen cards advance the "first unseen" link (here card 3 of say-no) and the bar; when all are seen the link goes to the FIRST card', input: { seen }, out: listOut(P) }); }
  { const P = await open('', { fetchFail: true }); out.list.push({ id: 'list-error', why: 'data/say.json cannot be fetched ⇒ the error panel "Không tải được – thử lại sau" with [Thử lại] → #/say (nothing cached)', input: { fetch: 500 }, out: { html: strip(P.view.innerHTML) } }); }
  // ---- cards ----
  const cardOut = (P, face) => { const m = P.mounts.filter(x => x.name === 'say-' + face).at(-1); return { frame: m.name, data: m.d }; };
  const first = SAY.series[0], it0 = first.items[0], itMasked = SAY.series.flatMap(s => s.items).find(i => i.dont && i.dont.masked), itNoDont = SAY.series.flatMap(s => s.items).find(i => !i.dont);
  for (const [id, why, arg, o] of [
    ['card-front-vi', 'card front: series title · n/total, step "Thẻ {n}/{total}", IPA wrapped in /…/ (slashes normalised), progress % = round(1000·(i+1)/total)/10, register label (REG table keys), teacher = series.teacher with the card pose (Chars.still); opening a card marks it seen', 'say-no/' + it0.id, { learnLang: 'vi' }],
    ['redirect-first', 'known series, no/unknown card ⇒ location.replace("#/say/<series>/<first card>") (the redirect target is returned; the card is drawn by the next route call)', 'say-no/zzz', {}],
    ['unknown-series', 'unknown series ⇒ the list', 'zzz', {}]]) {
    const P = await open(arg, { learnLang: o.learnLang }); const r = { id, why, input: { arg, learnLang: o.learnLang || 'vi' }, out: {} };
    if (arg === 'say-no/zzz') r.out = { replaced: P.sb._replaced || null, mounted: P.mounts.map(m => m.name) }; else if (arg === 'zzz') r.out = listOut(P); else { r.out = { ...cardOut(P, 'front'), teacher: { who: SAY.series[0].teacher, pose: it0.pose }, seenWrites: P.writes.filter(w => w.key === 'lk.say.seen').map(w => JSON.parse(w.value)) }; }
    out.card.push(r); }
  // back face, by meaning language
  for (const [id, why, card, lang] of [['back-vi', 'back face (flip): reaction line by register (REACT: polite/neutral/casual only), easy definition, meaning in the LEARNER language (it.m[lang], else the English meaning), "Thực ra là: {s}" shows the English meaning when the learner meaning is used, when-to-use, the "don\'t say" line + its register + why (WHY table), the "say instead" line + register + why', it0, 'vi'], ['back-en', 'learner language en ⇒ the English meaning is the main line (label "Nghĩa dễ hiểu"), no "Thực ra là" line', it0, 'en'], ['back-masked', 'a rude "don\'t say" line arrives already masked (h•••) and the accessible label becomes "Câu thô lỗ – đã che" (never spoken, never in share images)', itMasked, 'vi'], ['back-no-dont', 'card without a "don\'t say" line: dont/dontReg/dontWhy are empty strings (no block); the meaning is in German (it.m.de)', itNoDont, 'de'], ['back-lang-missing', 'meaning language not translated for this card ⇒ English meaning, mLang "en"', it0, 'th']]) {
    const sid = SAY.series.find(s => s.items.includes(card)).id, P = await open(sid + '/' + card.id, { learnLang: lang }); P.$('#sFlip', P.root).onclick({ stopPropagation() {} }); await settle(3);
    out.card.push({ id, why, input: { card: sid + '/' + card.id, learnLang: lang }, out: { ...cardOut(P, 'back'), flipFace: P.mounts.map(m => m.name), ...(id === 'back-vi' ? { itemData: clone(card) } : {}) } }); }
  // ---- mic, listen, flip, next, share ----
  const pickCard = async (lang = 'vi') => { const P = await open('say-no/' + it0.id, { learnLang: lang }); return P; };
  for (const [score, heard] of [[100, 'it is not my cup of tea'], [85, 'its not my cup of tea'], [84, 'not my cup tea'], [60, 'cup of tea'], [59, 'tea'], [0, '']]) {
    const P = await pickCard(); const mic = P.$('#sMic', P.root); mic.onclick({ stopPropagation() {} }); const h = P.rec.recog[0]; const first = tk(P.$('#sHeard').textContent); h.cb.result({ heard, score }); h.cb.end(); await settle(2);
    out.mic.push({ id: 'mic-' + score, why: score === 100 ? 'mic: UI.recognize(card.say, "en-US"): while listening the line "Đang nghe… hãy nói câu trên" shows; result: score ≥ 85 "Chuẩn như người bản xứ! {p}%", ≥ 60 "Gần đúng rồi – {p}%…", else "Chưa giống lắm ({p}%)…", followed by · “heard” when something was heard; the button gets aria-pressed true until end' : 'thresholds 85 / 60', input: { target: it0.say, accent: 'en-US', heard, score }, out: { listening: first, recognizeTarget: h.target, accent: h.accent, result: tk(P.$('#sHeard').textContent.split(' · ')[0]), heardAppended: P.$('#sHeard').textContent.includes(' · “') } }); }
  for (const code of ['not-allowed', 'unsupported', 'no-speech']) { const P = await pickCard(); P.$('#sMic', P.root).onclick({ stopPropagation() {} }); P.rec.recog[0].cb.error(code); out.mic.push({ id: 'mic-error-' + code, why: 'error text: not-allowed ⇒ "Hãy cho phép dùng micro để luyện nói", unsupported ⇒ "Trình duyệt này chưa hỗ trợ nhận giọng nói", anything else ⇒ "Không nghe rõ – thử lại nhé"', input: { error: code }, out: { text: tk(P.$('#sHeard').textContent) } }); }
  { const P = await pickCard(); P.$('#sSpk', P.root).onclick({ stopPropagation() {} }); P.$('#sSlow', P.root).onclick({ stopPropagation() {} });
    out.actions.push({ id: 'listen', why: '🔊 speaks the card sentence with the voice of THE SERIES TEACHER (Chars.voice: ama = af_heart, carlos = am_michael; accent en-US), 🎧 the same at rate 0.7; raw/rude sentences are never spoken', input: { card: 'say-no/' + it0.id }, out: { spoken: P.say, teacher: first.teacher } }); }
  { const P = await open('not-fine/' + SAY.series[1].items[0].id); P.$('#sSpk', P.root).onclick({ stopPropagation() {} }); out.actions.push({ id: 'listen-carlos', why: 'a series taught by Carlos speaks with am_michael', input: { card: 'not-fine/' + SAY.series[1].items[0].id }, out: { spoken: P.say } }); }
  { const last = SAY.series[0].items.at(-1), P = await open('say-no/' + last.id, { learnLang: 'en' }); P.$('#sFlip', P.root).onclick({ stopPropagation() {} }); await settle(2); const back = P.mounts.at(-1).d;
    const key = { ArrowRight: 'next', f: 'flip' }; const h0 = P.sb.location.hash; P.sb.document.onkeydown({ key: 'ArrowRight', target: { closest: () => null } });
    out.actions.push({ id: 'next-wraps', why: 'the "next card" link on the back face = the following card of the series; after the last card it wraps to the first; ArrowRight on the keyboard goes there, F flips (web keyboard only)', input: { card: 'say-no/' + last.id }, out: { next: back.next, keyboardNavigatesTo: P.sb.location.hash } }); }
  { const P = await pickCard(); P.$('#sShare', P.root); out.actions.push({ id: 'share-text', why: 'share sheet: image 1080×1080 (1:1) or 1080×1350 (4:5) drawn on-device (platform canvas: teal background, cream card, register pill, the sentence in “…”, meaning in coral, "Dùng khi: …", teacher image, QR + lexkite.com); share text = “{s}” – nói như người bản xứ cùng Lexkite: {url}; file name lexkite-say-<card>-<1x1|4x5>.png; link = ' + 'https://lexkite.com/app/#/say/<series>/<card>', input: { card: 'say-no/' + it0.id }, out: { url: `https://lexkite.com/app/#/say/say-no/${it0.id}`, text: { k: '“{s}” – nói như người bản xứ cùng Lexkite: {url}', v: { s: it0.say, url: `https://lexkite.com/app/#/say/say-no/${it0.id}` } }, fileNames: ['1x1', '4x5'].map(f => `lexkite-say-${it0.id}-${f}.png`), titleKey: 'Nói như người bản xứ', labels: ['Dùng khi', 'Luyện nói câu này cùng {name}', 'Nói như người bản xứ'] } }); }
  return out;
}

// ================================================================== #/speak (Play & Speak: web/js/speak/app.js, flag speak_pack) ==================================================================
const SIT_IDS = ['cafe', 'ask-directions'];
const sitFile = id => rd(`web/cpack/speak/s/${id}.js`);
async function speakRouteVectors() {
  const out = { situation: [], drill: [], fill: [] };
  const open = async (arg, o = {}) => {
    const mounts = []; let P;
    P = await pg({ hash: '#/speak', ls: { 'lk.speak': '1', ...(o.ls || {}) }, lang: o.lang, cards: o.cards, files: ['web/js/characters.js', 'web/js/speak/data.js', 'web/js/speak/score.js'], ui: { tts: (text, accent, rate) => { (P.say ||= []).push({ text, accent, rate: rate ?? null }); }, toast: m => { (P.toasts ||= []).push(tk(m)); }, ...(o.ui || {}) },
      sets: sb => { sb.ST = { esc: s => String(s) }; sb.ST2 = { mount: (view, name, d) => { mounts.push({ name, d: Object.fromEntries(Object.entries(clone(d)).filter(([k]) => !['teacher'].includes(k))) }); return {}; } }; sb.SpeechRecognition = class {}; sb.MediaRecorder = class {}; sb.navigator.mediaDevices = {};
        sb.App.loadScript = async src => { const f = String(src); P.loaded = (P.loaded || []).concat(f); vm.runInContext(rd('web/' + f), sb, { filename: f }); }; sb.App.onCleanup = () => {}; }, late: ['web/js/speak/app.js'] });
    P.mounts = mounts; await P.routes.speak(arg, new URLSearchParams(o.query || '')); await settle(8); return P;
  };
  const click = (P, id, wi) => P.view.onclick({ target: { closest: () => ({ id, dataset: wi != null ? { wi: String(wi) } : {} }) } });
  const snap = P => { const d = P.mounts.at(-1).d; return { frame: P.mounts.at(-1).name, line: tk(d.prog), pct: d.pct, done: d.done, total: d.total, beats: d.beats && d.beats.map(b => b.k + (b.cur ? '*' : b.done ? '+' : '')), say: tk(d.say), hint: d.hint, words: d.words && d.words.map(w => (w.p ? 'P' : '') + (w.bad ? 'X' : '') + w.w).join(' '), res: d.res, score: d.score, verdict: d.verdict && tk(d.verdict), sub: d.sub && tk(d.sub), stars: d.stars && d.stars.filter(s => s.on).length, canNext: d.canNext, noMic: d.noMic, rec: d.rec, alt: d.alt && tk(d.alt), tip: d.tipHtml || null }; };
  // ---------- the situation screen ----------
  const lsK = o => ({ 'lk.spk': JSON.stringify(o) });
  const wkKey = (() => { const d = new Date(NOW), j = new Date(d.getFullYear(), 0, 1); return d.getFullYear() + '-W' + Math.ceil(((d - j) / 864e5 + j.getDay() + 1) / 7); })();
  const prog0 = { cafe: { lines: { o1: { best: 0.9, stars: 2 }, o2: { best: 0.9, stars: 1 }, o3: { best: 1, stars: 3 }, o4: { best: 1, stars: 2 }, p1: { best: 1, stars: 2 } }, tasks: { 'two-drinks': true } }, week: { [wkKey]: 7 } };
  for (const [id, why, arg, o] of [['fresh', 'situation hub: stage nodes (done when every line of the stage has ≥ 1 star; the first not-done stage is "cur", the rest "todo"), per-stage stars = MIN of its lines\' stars; mission tasks (done = p.tasks[id]; first undone is "cur"); mastered = lines with ≥ 2 stars ("n / total" + "mẫu câu đã thuộc"), pct = round(100·mastered/total), "Còn {n} mẫu câu", weekly goal "Mục tiêu tuần {n}/50 câu" (50 = WEEK_GOAL); add-on words = up to 4 distinct words of the lines that are saved cards', 'cafe', {}], ['progress', 'with progress: stage 1 done (all ≥ 1 star), stage 2 current; week count from localStorage lk.spk.week[<year>-W<week>]', 'cafe', { ls: lsK(prog0), cards: { latte: { word: 'latte', ipa: '/ˈlɑːteɪ/' }, please: { w: 'please' } } }], ['other-situation', 'any situation id from SPK_IDX; unknown id ⇒ redirect to #/speak/cafe; no id ⇒ #/speak/<first>', 'ask-directions', {}]]) {
    const P = await open(arg, o), d = P.mounts.at(-1).d; out.situation.push({ id, why, input: { arg, progress: o.ls ? JSON.parse(o.ls['lk.spk']) : {}, cards: Object.keys(o.cards || {}), now: NOW }, out: { frame: P.mounts.at(-1).name, back: d.back, title: d.title, sub: d.sub, mission: d.mission, stage: tk(d.stage), nodes: d.nodes.map(n => ({ label: n.label, st: n.st, stars: n.stars.filter(x => x.on).length, href: n.href, starsAria: tk(n.starsAria) })), tasks: d.tasks, taskDone: tk(d.taskDone), mastered: d.mastered, masteredSub: tk(d.masteredSub), remain: tk(d.remain), pct: d.pct, week: tk(d.week), addon: d.addon, start: d.start, rp: d.rp, culture: d.culture, loaded: P.loaded } }); }
  for (const [arg, why] of [['zzz', 'unknown situation id ⇒ location.replace("#/speak/cafe")'], ['', 'no id ⇒ the default situation (cafe)']]) { const P = await open(arg); out.situation.push({ id: 'redirect-' + (arg || 'empty'), why, input: { arg }, out: { replaced: P.sb._replaced || [], mounted: P.mounts.map(m => m.name) } }); }
  { const P = await open('cafe', { ls: { 'lk.speak': '0' } }); out.situation.push({ id: 'flag-off', why: 'the whole route is behind the speak_pack flag: localStorage lk.speak "1"/"0" wins, else the public config value speak_pack in lk.cfg.v; off ⇒ replace to #/skills', input: { 'lk.speak': '0' }, out: { replaced: P.sb._replaced, speakOn: P.sb.App.speakOn() } }); }
  { const P = await open('cafe', { ls: { 'lk.speak': undefined, 'lk.cfg': JSON.stringify({ v: { speak_pack: 'true' } }) } }); out.situation.push({ id: 'flag-config', why: 'no lk.speak ⇒ lk.cfg.v.speak_pack true / "1" / "true" turns the route on', input: { cfg: { speak_pack: 'true' } }, out: { speakOn: P.sb.App.speakOn(), mounted: P.mounts.map(m => m.name) } }); }
  // ---------- "Nói theo 3 nhịp" drill ----------
  const L1 = 'Could I get a medium latte, please?', words = L1.split(/\s+/).length, limitMs = (words * 0.6 + 3) * 1000;
  const mic = async (P, o) => { const n0 = P.rec.recog.length; click(P, 'spkMic'); const during = snap(P).rec; const h = P.rec.recog[n0]; if (o.ms != null) P.E.clock.t += o.ms; if (o.error) h.cb.error(o.error); else h.cb.result({ heard: o.heard === '=' ? h.target : o.heard, score: o.score ?? 90 }); h.cb.end(); await settle(8); return during; };
  const play = async (id, why, steps, o = {}) => {
    const P = await open('cafe/drill', { query: o.query || '', ls: o.ls }), trace = [], r0 = () => P.calls.rewards.length; trace.push({ step: 'open', ...snap(P) });
    for (const st of steps) { const w0 = P.writes.length, rw0 = r0(), t0 = P.E.clock.t;
      if (st.mic) { const during = await mic(P, st.mic); trace.push({ step: 'mic', input: st.mic, recordingWhileListening: during, ...snap(P), tts: P.say, writes: P.writes.slice(w0).map(w => ({ [w.key]: JSON.parse(w.value) })), rewards: clone(P.calls.rewards).slice(rw0) }); }
      else if (st.tap != null) { P.view.onclick({ target: { closest: () => ({ id: '', dataset: { wi: String(st.tap) } }) } }); trace.push({ step: 'tap', index: st.tap, ...snap(P), writes: P.writes.slice(w0).map(w => ({ [w.key]: JSON.parse(w.value) })), rewards: clone(P.calls.rewards).slice(rw0), tts: P.say }); }
      else if (st.act) { click(P, st.act); await settle(4); trace.push({ step: st.act, ...snap(P), toasts: P.toasts, hash: P.sb.location.hash, writes: P.writes.slice(w0).map(w => ({ [w.key]: JSON.parse(w.value) })) }); } }
    out.drill.push({ id, why, input: { route: 'cafe/drill', query: o.query || '', lineText: L1, wordCount: words, quickLimitMs: limitMs, progress: o.ls ? JSON.parse(o.ls['lk.spk']) : {}, script: steps }, out: { trace } }); };
  await play('three-beats-quick', 'each line has 3 beats: Nghe (listen & repeat) → Nói đuổi (shadow) → Nói từ trí nhớ (first letters only). A passing attempt (Speak.pass: ≥ 80 % words) earns stars: beat 1 or 2 ⇒ 1 star; beat 3 ⇒ 3 stars when said within (words·0.6 + 3) seconds of tapping the mic, else 2. A pass records lines[id] = {best: max(best, text), stars: max(stars, new)}, marks mission tasks whose intents include the line, adds 1 to the week counter (localStorage lk.spk) and rewards {spoken:1, xp: 2·stars}. "Tiếp" (spkNext) is enabled after a pass and moves to the next beat; after beat 3 to the next line; progress pct = round((line·3 + beat + (pass ? 1 : 0)) / (lines·3) · 100)', [{ mic: { heard: L1, ms: 2000 } }, { act: 'spkNext' }, { mic: { heard: L1, ms: 2000 } }, { act: 'spkNext' }, { mic: { heard: L1, ms: Math.round(limitMs) } }, { act: 'spkNext' }]);
  await play('memory-slow', 'beat 3 slower than the limit ⇒ 2 stars (limit + 1 ms)', [{ mic: { heard: L1, ms: 1 } }, { act: 'spkNext' }, { mic: { heard: L1, ms: 1 } }, { act: 'spkNext' }, { mic: { heard: L1, ms: Math.round(limitMs) + 1 } }], {});
  await play('fail-retry', 'text < 80 % ⇒ not a pass: red words (the ones not matched), "Gần đúng rồi!", no stars, no record, Next disabled; "Thử lại" (spkRetry) resets the beat; a later pass is recorded', [{ mic: { heard: 'could I get latte', ms: 3000 } }, { act: 'spkRetry' }, { mic: { heard: L1, ms: 2000 } }]);
  await play('unclear-three', 'recognizer heard nothing: the first 2 times "Cô chưa nghe rõ – thử lại nhé, không bị trừ điểm." (counter S.unclear); the 3rd time the line is let through as a FREE pass: all words ok, "Chưa nghe rõ – cho qua, không tính sao.", stars 0, record best 0 (week +1, reward {spoken:1, xp:0}), Next enabled', [{ mic: { heard: '', score: 0, ms: 1000 } }, { mic: { heard: '', score: 0, ms: 1000 } }, { mic: { heard: '', score: 0, ms: 1000 } }]);
  await play('mic-denied-tap', 'mic error not-allowed / unsupported / service-not-allowed ⇒ noMic: the words become a shuffled bank to tap IN ORDER (wrong one ⇒ "Chưa đúng thứ tự – thử từ khác nhé."); the last right tap passes with text 1: stars 1 (never more without a mic), the line is recorded but NO reward (App.reward skipped), the sentence is spoken afterwards (tts en-US); "Dùng mic" toggles back (localStorage lk.spk.nomic = 0/1)', [{ mic: { error: 'not-allowed', ms: 0 } }, { tap: 3 }, ...Array.from({ length: words }, (_, i) => ({ tap: i })), { act: 'spkNext' }]);
  await play('stage-order', '?stage=<id>: the lines of that stage first, then the others; the start line = first line (in that order) with < 2 stars', [], { query: 'stage=pay', ls: lsK({ cafe: { lines: { p1: { best: 1, stars: 2 }, p2: { best: 1, stars: 1 } }, tasks: {} } }) });
  await play('resume', 'no stage: all stages in order; resumes at the first line with < 2 stars (o1 and o2 done ⇒ o3)', [], { ls: lsK({ cafe: { lines: { o1: { stars: 2 }, o2: { stars: 3 } }, tasks: {} } }) });
  await play('finish-situation', 'after beat 3 of the LAST line, Next shows the toast "Xong cả {n} mẫu câu!" (n = number of lines) and goes back to the situation screen #/speak/<id>', [{ mic: { heard: '=', ms: 1 } }, { act: 'spkNext' }, { mic: { heard: '=', ms: 1 } }, { act: 'spkNext' }, { mic: { heard: '=', ms: 1 } }, { act: 'spkNext' }], { ls: lsK({ cafe: { lines: Object.fromEntries('o1 o2 o3 o4 p1 p2 p3 p4 t1 t2 t3'.split(' ').map(k => [k, { best: 1, stars: 2 }])), tasks: {} } }) });
  // ---------- SPK_fill: position-wise translation overlay ----------
  { const sb = sbox(); vm.runInContext(rd('web/js/speak/data.js'), sb); const base = { title: { en: 'A' }, lines: [{ en: 'x', gloss: { en: 'g' }, pitfalls: [{ note: { en: 'n' } }] }], plain: 'keep' };
    out.fill.push({ id: 'fill', why: 'SPK_fill(base, arr, lang) walks the base object depth-first; every object whose ONLY key is "en" (a string) takes the next string of the translation array as [lang]; a non-string entry (null) leaves it English-only; other values are copied', input: { base, arr: ['T', 'G', null], lang: 'vi' }, out: sb.SPK_fill(base, ['T', 'G', null], 'vi') }); }
  return out;
}

// ================================================================== #/reflex (web/js/reflex.js) ==================================================================
async function reflexVectors() {
  const out = { pool: [], colorize: [], game: [] }, KV = (() => { const sb = sbox(); run(sb, 'web/js/listen/kvoice.js'); return sb.KVoice; })();
  const key = text => KV.lineKey('bf_emma', String(text).trim());
  const open = async o => { let P; P = await pg({ hash: '#/reflex', cards: o.cards, settings: o.settings, files: ['web/js/listen/kvoice.js'], sets: sb => { sb.LISTEN_AUDIO = new Set((o.audio || []).map(key)); sb.READINGS = clone(o.readings || []); sb.IELTS_DATA = { TOPICS: [{ id: 'x', words: clone(o.words || []) }] }; sb.audioUrl = k => 'https://audio.lexkite.com/audio/l/' + k + '.mp3'; }, late: ['web/js/reflex.js'] }); P.routes.reflex(); P.$('#rxStage').insertAdjacentHTML = (pos, html) => (P.inserted ||= []).push([pos, html]); await settle(3); return P; };
  const step = async P => { await settle(8); const h = P.rec.recog.at(-1); return h; };
  // ---------- the pool of sentences ----------
  const yt = (id, text, t) => ({ word: 'w' + id, contexts: [{ text, source: `https://www.youtube.com/watch?v=${id}${t ? '&t=' + t : ''}` }] });
  const S = n => Array.from({ length: n }, (_, i) => 'word' + (i + 1)).join(' ');
  const cards = { a: yt('abcDEF12345', S(5), '65s'), b: yt('xyz98765432', S(2)), c: yt('longlongl12', S(17)), d: { word: 'd', contexts: [{ text: S(6), source: 'https://example.com/x' }] }, e: { word: 'e', contexts: [{ text: S(3), source: 'https://youtu.be/shortID1234?t=30' }, { text: S(16), source: 'https://youtu.be/sixteenOK123' }] }, f: yt('bad', S(6)) };
  const words = [{ word: 'k1', ex: 'I like to read the news every morning.' }, { word: 'k2', ex: 'Too short.' }, { word: 'k3', ex: 'She walks to school with her best friend today.' }, { word: 'k4', ex: 'No audio exists for this long example sentence here.' }];
  const audio = [words[0].ex, words[2].ex];
  const readings = [{ text: 'The old city has a lovely market. It sells fresh bread and fruit. Wow.' }];
  const readAudio = ['The old city has a lovely market.', 'It sells fresh bread and fruit.'];
  { const P = await open({ cards, words, audio: [...audio, ...readAudio], readings }); const seen = [], plays = [];
    P.$('#rxGo').onclick(); let h = await step(P); for (let n = 0; n < 9; n++) { seen.push({ target: h.target, accent: h.accent, media: P.ctl.log.filter(x => x[0] === 'audio').length }); P.$('#rxNext').onclick(); h = await step(P); }
    out.pool.push({ id: 'sources-order', why: 'the pool = (1) saved YouTube contexts of the learner\'s cards (card order; source must be youtube.com/watch?v= or youtu.be/<id>, id matches [\\w-]{6,15}, text 3–16 words, start = ?t seconds), then (2) library example sentences of 4–14 words that HAVE a Kokoro clip (key = lineKey("bf_emma", sentence)), then (3) ONLY when fewer than 40 so far: sentences of the readings (KVoice.split, 5–14 words, with clip); shuffled (UI.shuffle) and cut to 40. Items are played in order and wrap around (index mod pool size); recognition target = the sentence', input: { cards: Object.fromEntries(Object.entries(cards).map(([k, c]) => [k, c.contexts])), examples: words, withClip: audio, readings: readings.map(r => r.text), readingClips: readAudio, shuffle: 'identity (a port shuffles randomly)' }, out: { targets: seen.map(x => x.target), accent: seen[0].accent } }); }
  { const many = Object.fromEntries(Array.from({ length: 45 }, (_, i) => ['c' + i, yt('vid' + String(i).padStart(8, '0'), 'item ' + i + ' is a short test line ok')])); const P = await open({ cards: many }); P.$('#rxGo').onclick(); let h = await step(P); const t = []; for (let n = 0; n < 42; n++) { t.push(h.target); P.$('#rxNext').onclick(); h = await step(P); }
    out.pool.push({ id: 'cap-40', why: 'at most 40 items: the 41st step wraps to the first', input: { youtubeCards: 45 }, out: { size: t.slice(1).indexOf(t[0]) + 1, wrapAt: t.indexOf(t[0], 1) } }); }
  { const P = await open({ cards: { a: yt('abcDEF12345', S(5), '65s') } }); P.$('#rxGo').onclick(); await step(P); const ifr = /src="([^"]*)"/.exec((P.inserted || []).map(x => x[1]).join(''));
    out.pool.push({ id: 'youtube-embed', why: 'a YouTube item: the 5-second embed starts at max(0, t − 1) and ends 5 s later (youtube-nocookie, autoplay, no controls, playsinline); after 5600 ms the player is removed and the recognizer starts', input: { id: 'abcDEF12345', t: 65 }, out: { waits: P.ctl.log.filter(x => x[0] === 'wait'), src: ifr ? ifr[1] : null, target: P.rec.recog.at(-1).target } }); }
  { const P = await open({ cards: {} }); out.pool.push({ id: 'empty', why: 'no item at all ⇒ "Chưa có câu để luyện…" and the Start button is hidden', input: {}, out: { stage: tk(strip(P.$('#rxStage').innerHTML)), startHidden: P.$('#rxGo').hidden } }); }
  // ---------- per-word colouring ----------
  const col = async (id, why, target, heard) => { const P = await open({ words: [{ word: 'k', ex: target }], audio: [target] }); P.$('#rxGo').onclick(); const h = await step(P); h.cb.result({ heard }); await settle(2); const html = P.$('#rxStage').innerHTML;
    out.colorize.push({ id, why, input: { target, heard }, out: { words: [...html.matchAll(/<span class="rx-w (ok|no)">([^<]*)<\/span>/g)].map(m => [unesc(m[2]), m[1] === 'ok']), pct: +/<b>(\d+)%<\/b>/.exec(html)[1], shown: unesc(/“([^”]*)”/.exec(html)[1]), sfx: (P.sb._sfx || []).slice(-1), nextVisible: P.$('#rxNext').hidden === false, label: tkAll(html.replace(/<span class="rx-w[\s\S]*?<\/div>/, '')).slice(0, 1) } }); };
  const T = 'I like to read the news every morning.';
  await col('exact', 'every word found in order ⇒ pct 100; words coloured ok; the sound "answer(true)" when pct ≥ 80', T, 'I like to read the news every morning');
  await col('missing', 'words matched left→right with a 4-word look-ahead from the last match; a missing word is red; pct = round(ok / words·100)', T, 'I like read the news morning');
  await col('window', 'a heard word more than 3 positions after the cursor is NOT matched (window = 4): here "morning" is 5 words after "like"', 'a b c d e morning', 'a z z z z z morning');
  await col('out-of-order', 'order matters: after "news" matched, an earlier word never matches again', T, 'news the read to like I');
  await col('punctuation', 'case and punctuation are ignored (target tokens keep theirs for display) but APOSTROPHES are kept: "it\'s" ≠ "its" (Speak.align strips them – the two scorers differ)', "It's NOT a big deal, is it?", "its not a big deal is it");
  await col('apostrophe-same', 'the same words with the apostrophe the recogniser usually returns', "It's NOT a big deal, is it?", "it's not a big deal is it");
  await col('empty-heard', 'nothing heard ⇒ every word red, pct 0, shown "…"', T, '');
  await col('extra-words', 'extra heard words are ignored (they only consume the look-ahead window)', T, 'well I really like to read the news every morning ok');
  // ---------- the 60-second game ----------
  { const P = await open({ words: [{ word: 'k1', ex: words[0].ex }, { word: 'k3', ex: words[2].ex }], audio }); const go = P.$('#rxGo'); go.onclick(); let h = await step(P);
    const log = [{ step: 'start', timer: P.$('#rxT').textContent, goHidden: go.hidden, target: h.target, nextHidden: P.$('#rxNext').hidden, recognizerAccent: h.accent, audio: P.ctl.log.filter(x => x[0] === 'audio').map(x => x[1] === key(words[0].ex) ? 'clip(item1)' : x[1]) }];
    h.cb.result({ heard: words[0].ex }); await settle(2); log.push({ step: 'result-100', nextHidden: P.$('#rxNext').hidden }); P.$('#rxNext').onclick(); h = await step(P); h.cb.result({ heard: 'she walks school' }); await settle(2); log.push({ step: 'result-partial', target: h.target, text: strip(P.$('#rxStage').innerHTML).slice(-20) });
    const iv = P.sb._intervals.filter(x => x.ms === 1000).at(-1), ticks = []; for (let n = 1; n <= 60; n++) { iv.f(); if ([1, 30, 59, 60].includes(n)) ticks.push({ after: n, timer: P.$('#rxT').textContent }); }
    await settle(2); out.game.push({ id: 'timed-run', why: 'Start: timer 60 → counts down every 1000 ms (rxT); each item: play the clip (Audio) or the 5 s YouTube embed, then the recognizer starts (accent = settings.accent or en-GB); a result shows the colourised sentence + "Bạn nói: “…” · pct%"; Next reveals after a result OR a recognizer error ("Không nghe rõ – thử lại hoặc bỏ qua."). At 0: "Hết giờ!" + "{n} câu · trung bình {p}%" (n = scored items, p = round(mean pct)), Start becomes "↻ Chơi lại", Next hidden; reward {spoken: n, xp: 5 + 2n} only when n > 0. Leaving the page ends every callback', input: { items: [words[0].ex, words[2].ex], heard: [words[0].ex, 'she walks school'], tickAt: [1, 30, 59, 60] }, out: { log, ticks, final: tkAll(P.$('#rxStage').innerHTML).slice(0, 3), goLabel: P.$('#rxGo').textContent, goHidden: P.$('#rxGo').hidden, nextHidden: P.$('#rxNext').hidden, rewards: clone(P.calls.rewards) } }); }
  { const P = await open({ words: [{ word: 'k1', ex: words[0].ex }], audio }); P.$('#rxGo').onclick(); await step(P); const iv = P.sb._intervals.filter(x => x.ms === 1000).at(-1); for (let n = 0; n < 60; n++) iv.f(); await settle(2);
    out.game.push({ id: 'timeout-no-answer', why: 'time runs out before any result ⇒ finish with n = 0: "0 câu · trung bình 0%" and NO reward', input: { answered: 0 }, out: { final: tkAll(P.$('#rxStage').innerHTML).slice(0, 3), rewards: clone(P.calls.rewards) } }); }
  { const P = await open({ words: [{ word: 'k1', ex: words[0].ex }], audio }); P.$('#rxGo').onclick(); const h = await step(P); h.cb.error('no-speech'); await settle(2);
    out.game.push({ id: 'recognizer-error', why: 'a recognizer error keeps the stage, appends the "Không nghe rõ…" hint and shows Next (no score counted)', input: { error: 'no-speech' }, out: { hint: tkAll((P.inserted || []).map(x => x[1]).slice(-1)[0]).slice(-1), nextHidden: P.$('#rxNext').hidden } }); }
  { const P = await open({ words: words.map((w, i) => ({ word: 'k' + i, ex: w.ex })), audio }); P.ctl.failSrc.add(key(words[0].ex)); P.$('#rxGo').onclick(); await settle(12); const h = P.rec.recog.at(-1);
    out.game.push({ id: 'clip-error-skips', why: 'a clip that fails to load (audio error) is skipped: i++ and the next item plays; after 3 consecutive failures the 4th goes to the recognizer anyway (miss counter reset on a clip that ends)', input: { failingClip: words[0].ex, items: 2 }, out: { recognizerTarget: h && h.target } }); }
  return out;
}

// ================================================================== #/rtype (web/js/rtype.js: Reading practice by question type) ==================================================================
const RTFILES = ['web/js/lexis.js', 'web/js/qengine.js', 'web/js/qtips.js'];
const RT_DATA = ['web/js/readtest/_i.js', ...Array.from({ length: 10 }, (_, i) => `web/js/readtest/test${i + 1}.js`).filter(f => fs.existsSync(path.join(ROOT, f))), ...fs.readdirSync(path.join(ROOT, 'web/js/readtest')).filter(f => /^explain-[a-g]\.js$/.test(f)).sort().map(f => 'web/js/readtest/' + f)];
const RT_KINDS = ['completion', 'tfng', 'ynng', 'mcq', 'multi', 'headings', 'info', 'features'];
let RTC = null;
/** READTESTS cut to ONE group per question kind (+ the explanations of those questions); the full IELTS reading tests belong to the P09 (mock test) pack. */
function readtestCut() {
  if (RTC) return RTC;
  const sb = sbox(); for (const f of RTFILES.slice(1)) run(sb, f); for (const f of RT_DATA) run(sb, f);
  const kindOf = g => (g.type === 'match' ? (g.options || []).map(sb.QE.code).some(x => /^[ivx]+$/i.test(x)) ? 'headings' : (g.options || []).every(o => !sb.QE.label(o)) ? 'info' : 'features' : ['tfng', 'ynng', 'mcq', 'multi'].includes(g.type) ? g.type : 'completion');
  const all = []; for (const t of sb.READTESTS) for (const p of t.passages) p.groups.forEach((g, gi) => all.push({ t, p, g, gi, kind: kindOf(g) }));
  const tests = [], ex = {}, units = {}; for (const k of RT_KINDS) { const u = all.find(x => x.kind === k); if (!u) continue; units[k] = { test: u.t.id, passage: u.p.n, group: clone(u.g) }; let t = tests.find(x => x.id === u.t.id); if (!t) tests.push(t = { id: u.t.id, test: u.t.test, passages: [] }); let p = t.passages.find(x => x.n === u.p.n); if (!p) t.passages.push(p = { ...clone(u.p), groups: [] }); p.groups.push(clone(u.g)); const nums = u.g.type === 'multi' ? u.g.n : u.g.items.map(i => i.n); for (const n of nums) if ((sb.READ_EXPLAIN[u.t.id] || {})[n]) (ex[u.t.id] ||= {})[n] = clone(sb.READ_EXPLAIN[u.t.id][n]); }
  const counts = Object.fromEntries(RT_KINDS.map(k => [k, { groups: all.filter(x => x.kind === k).length, questions: all.filter(x => x.kind === k).reduce((a, x) => a + sb.QE.numsOf({ groups: [x.g] }).length, 0) }]));
  return (RTC = { tests, explain: ex, counts, units, totalTests: sb.READTESTS.length });
}
async function rtypeVectors() {
  const D = readtestCut(), out = { hub: [], kinds: [], flows: [] };
  const open = async (arg, o = {}) => { const P = await pg({ hash: '#/rtype', game: o.game, files: RTFILES, sets: sb => { sb.READTESTS = clone(o.tests || D.tests); sb.READ_EXPLAIN = clone(D.explain); sb.innerWidth = 1200; sb.confetti = () => {}; }, late: ['web/js/rtype.js'] }); P.routes.rtype(arg); await settle(6); return P; };
  const hubOf = P => [...P.view.innerHTML.matchAll(/<a class="card hover" href="#\/rtype\/(\w+)"[\s\S]*?<span style="font-size:1\.6rem">([^<]*)<\/span>(?:<span class="chip ?(ok)?">([^<]*)<\/span>)[\s\S]*?<h3[^>]*>([^<]*)<\/h3><div class="small muted">([^<]*)<\/div>[\s\S]*?<i style="width:(\d+)%[^>]*><\/i>[\s\S]*?<div class="tiny muted"[^>]*>([^<]*)<\/div>/g)].map(m => ({ kind: m[1], emoji: m[2], chip: tk(unesc(m[4])), reached: !!m[3], title: tk(unesc(m[5])), size: tk(unesc(m[6])), bar: +m[7], note: tk(unesc(m[8])) }));
  { const P = await open(''); out.hub.push({ id: 'fresh', why: 'hub: one card per kind in the order completion, tfng, ynng, mcq, multi, headings, info, features (a kind with no group in the data is not shown); chip "Chưa làm" until game.rtype[kind] has attempts, then "{pct}% đúng" (pct = round(100·r/t)) with class ok from 75; bar = pct; note "Bắt đầu luyện" / "Mục tiêu 75%" / "✅ Đã đạt mục tiêu – chuyển dạng tiếp theo" (≥ 75); the size line "{q} câu · {g} nhóm" counts the questions (QE.numsOf) and groups of the kind over ALL tests', input: { rtype: {} }, out: { cards: hubOf(P) } }); }
  { const P = await open('', { game: { xp: 0, days: {}, total: {}, rtype: { completion: { r: 9, t: 12 }, tfng: { r: 5, t: 10 }, mcq: { r: 3, t: 3 } } } }); out.hub.push({ id: 'progress', why: 'game.rtype = { kind: { r: right, t: total } }: 75 % ⇒ ok chip + goal note, 50 % ⇒ plain chip + "Mục tiêu 75%"', input: { rtype: { completion: { r: 9, t: 12 }, tfng: { r: 5, t: 10 }, mcq: { r: 3, t: 3 } } }, out: { cards: hubOf(P).filter(c => ['completion', 'tfng', 'mcq'].includes(c.kind)) } }); }
  out.hub.push({ id: 'counts-full-data', why: 'groups and questions per kind over ALL the web reading tests (what the hub "size" line shows in the full app); the cut-down data below carries one group per kind', input: { tests: D.totalTests }, out: D.counts });
  // ---------- one kind: header, tip, passage, questions ----------
  for (const k of RT_KINDS) { const P = await open(k), h = P.view.innerHTML; const tip = /class="tip small"/.test(h);
    out.kinds.push({ id: 'kind-' + k, why: k === 'completion' ? 'a kind page shows the groups of that kind one at a time ("Nhóm i/n"): the passage (paragraph letters + text) beside the group\'s questions (QE.questionsHtml), the QT tip box for the group type; Check → Next group; when the list is exhausted a "Đã làm hết dạng “…”" card with [Chọn dạng khác] and [Thi thử đầy đủ]; unknown kind ⇒ the hub' : 'header (emoji + kind title), position chip, passage title + paragraph letters for the first group of the kind', input: { kind: k }, out: { header: tkAll(/<h2[^>]*>[\s\S]*?<\/h2>/.exec(h)[0]).slice(0, 1), position: tk(/<span class="chip">([^<]*)<\/span>/.exec(h)[1]), back: '#/rtype', passageTitle: unesc(/<h3 style="margin-top:0">([^<]*)<\/h3>/.exec(h)[1]), paragraphs: [...h.matchAll(/<p data-para="([^"]*)">/g)].map(m => m[1]), plainTip: tip } }); }
  { const P = await open('zzz'); out.kinds.push({ id: 'unknown-kind', why: 'unknown kind ⇒ the hub', input: { kind: 'zzz' }, out: { hub: /Luyện Reading theo dạng/.test(P.view.innerHTML) } }); }
  // ---------- submit ----------
  const flow = async (id, why, kind, mode, o = {}) => {
    const P = await open(kind, { game: o.game }), u0 = { t: { id: D.units[kind].test }, g: D.units[kind].group }, g = u0.g;
    const answers = answersFor({ groups: [g] }, mode), r = fakeRoot(answers), q = P.$('#rq'); q.querySelector = r.querySelector; q.querySelectorAll = r.querySelectorAll; q.dataset = {};
    await P.$('#rSub').onclick(); await settle(12); const fb = P.$('#rRes').innerHTML;
    const rec = { id, why, input: { kind, mode, answers, previous: (o.game && o.game.rtype) || {}, explainedQuestions: Object.keys(D.explain[u0.t.id] || {}) }, out: { checked: { subHidden: P.$('#rSub').hidden, nextHidden: P.$('#rNext').hidden }, result: tk(/<div class="feedback[^>]*>([\s\S]*)<\/div>/.exec(fb)[1]), feedbackClass: /feedback (ok|no)/.exec(fb)[1], game: { rtype: (P.writes.filter(w => w.key === 'rtype').at(-1) || {}).value }, qstat: (P.writes.filter(w => w.key === 'qstat').at(-1) || {}).value, rewards: clone(P.calls.rewards), mistakes: (await P.E.Core.Store.get('mistakes', [])).map(x => ({ kind: x.kind, q: x.qK || x.q, answer: x.answer, given: x.givenK || x.given, explain: x.explain, ref: x.ref })), sounds: (P.sb._sfx || []).slice(-2) } };
    if (o.next) { P.$('#rNext').onclick(); await settle(3); rec.out.afterNext = { position: /Nhóm \{i\}/.test(P.view.innerHTML) ? tk(/<span class="chip">([^<]*)<\/span>/.exec(P.view.innerHTML)[1]) : null, finished: /Đã làm hết dạng/.test(P.view.innerHTML) ? tkAll(P.view.innerHTML.replace(/<[^>]*>/g, '\u0001')).slice(0, 2) : null }; }
    out.flows.push(rec); };
  await flow('completion-perfect', 'Check: QE.collect → QE.mark → QT.record("ir") (game.qstat["ir:<kind>"] += {r,t,s}); right/total from the graded items; game.rtype[kind] += {r: right, t: total} (cumulative, never reset); every wrong item → App.logMistake({kind:"reading", q:"{title} – câu {n}: {q}", answer, given | "(bỏ trống)", explain: READ_EXPLAIN why, ref ""}); reward {quizzes:1, readings:1, xp: 5 + 2·right}; win sound when all right else the "correct" sound; feedback text "<b>{r}/{n} câu đúng</b> · tỉ lệ tích lũy dạng này: {p}%" with p = round(100·cumulative r / t); class ok when right/total ≥ 0.75; Check hides, Next shows', 'completion', 'perfect', { next: true });
  await flow('tfng-mixed', 'every 3rd question wrong ⇒ mistakes logged, class no below 75 %, cumulative percentage includes earlier attempts', 'tfng', 'mixed', { game: { xp: 0, days: {}, total: {}, rtype: { tfng: { r: 5, t: 10 } } } });
  await flow('mcq-blank', 'nothing answered: every item wrong, given "(bỏ trống)"', 'mcq', 'blank');
  await flow('multi-perfect', '"choose 2": counts as the number of answers (QE.numsOf: multi ⇒ group.n), right when both picked', 'multi', 'perfect', { next: true });
  await flow('headings-perfect', 'matching headings (match with roman-numeral options)', 'headings', 'perfect');
  await flow('info-mixed', 'matching information (paragraph letters, no option labels)', 'info', 'mixed');
  await flow('features-perfect', 'matching features (option letters with labels)', 'features', 'perfect');
  await flow('ynng-perfect', 'YES/NO/NOT GIVEN', 'ynng', 'perfect');
  return out;
}

// ================================================================== #/roleplay (web/js/roleplay.js) ==================================================================
async function roleplayVectors() {
  const C = content(), out = { hub: [], brief: [], chat: [], report: [], ai: [] };
  const open = async (o = {}) => {
    let P; const fetches = [];
    P = await pg({ hash: '#/roleplay', ls: o.ls, settings: o.settings, lang: o.lang, files: RP_FILES, ui: { ring: (p, l) => `<div class="ring">${l}</div>`, dev: () => 'dev', quota: j => { (P.quotas ||= []).push(j); }, icon: n => '' },
      sets: sb => { sb.AbortController = AbortController; sb.fetch = async (url, op) => { const body = JSON.parse(op.body); fetches.push({ url, body, auth: !!(op.headers || {}).Authorization }); const r = o.server ? o.server(fetches.length, body) : { status: 500, json: {} }; return { ok: r.status === 200, status: r.status, json: async () => r.json }; }; if (o.signedIn) sb.Sync = { user: { getIdToken: async () => 'tok' } }; if (o.offline) sb.navigator.onLine = false;
        sb.document.createElement = () => { const e = P.E.dom.mkEl('bubble'); e.querySelector = () => P.E.dom.mkEl('btn'); (P.bubbles ||= []).push(e); return e; }; sb.App.cleanups = []; sb.App.addWord = async (entry, ctx, op) => { (P.words ||= []).push({ entry: clone(entry), ctx: clone(ctx), opts: clone(op) }); }; }, late: ['web/js/roleplay.js'] });
    P.fetches = fetches; P.E.M.random = cyc(o.random || [0.9]); const lv = [0, 1, 2].map(i => el(P, 'button', { dataset: { lv: String(i) } })); P.lv = lv; P.E.dom.resolveList('[data-lv]', () => lv); const vv = Array.from({ length: 7 }, (_, i) => el(P, 'button', { dataset: { v: String(i) } })); P.vv = vv; P.E.dom.resolveList('[data-v]', () => vv); return P;
  };
  const bubbles = P => (P.bubbles || []).map(b => ({ who: /rp-b (ai|me)/.exec(b.className)[1], text: unesc(/<div>([^<]*)<\/div>\s*$/.exec(b.innerHTML)[1]) }));
  const start = async (P, id) => { await P.routes.roleplay(id); P.$('#rpGo').onclick(); await settle(8); };
  // ---------- hub ----------
  { const P = await open({}); await P.routes.roleplay(''); const h = P.view.innerHTML;
    const cards = [...h.matchAll(/<a class="rp-card" href="#\/roleplay\/([^"]*)"><span class="em"[^>]*>([^<]*)<\/span><span><b>([^<]*)<\/b><span class="tiny muted" lang="en">([^<]*) · ([^<]*)<\/span>/g)].map(m => ({ id: m[1], emoji: m[2], name: tk(unesc(m[3])), title: unesc(m[4]), turns: tk(m[5]) }));
    const sections = [...h.matchAll(/<h2 class="set-h">([^<]*) <span class="chip">([^<]*)<\/span><\/h2>/g)].map(m => ({ title: tk(unesc(m[1])), levels: m[2] }));
    P.lv[2].onclick(); out.hub.push({ id: 'hub', why: 'hub: level switch (labels A1/B1… per script kind: everyday A1 A2 B1, work B1 B2 C1) default index 1 (stored in localStorage vb.rp.level as JSON 0|1|2; anything else ⇒ 1); two sections: "Tình huống hằng ngày" (kind everyday, A1 – B1) and "Công sở" (B1 – C1); card = emoji + name (NAME table keys, else script.name || title) + English title + "{n} lượt" (turns); footnote differs for signed-in users (unlimited AI) vs guests (GUEST_AI = 2 AI conversations a day); tapping a level stores it', input: { scripts: C.ROLEPLAY.length, level: null }, out: { sections, scriptCount: cards.length, first: cards.slice(0, 3), everyday: cards.filter(c => C.ROLEPLAY.find(s => s.id === c.id).kind === 'everyday').length, work: cards.filter(c => C.ROLEPLAY.find(s => s.id === c.id).kind !== 'everyday').length, levelButtons: [...h.matchAll(/data-lv="(\d)" aria-pressed="(true|false)">([^<]*)</g)].map(m => ({ i: +m[1], pressed: m[2] === 'true', label: m[3] })), levelStored: P.writes.filter(w => w.key === 'vb.rp.level').map(w => w.value), footnote: tk(unesc(/<p class="tiny muted" style="margin-top:1rem">([^<]*)<\/p>/.exec(h)[1])) } }); }
  { const P = await open({ signedIn: true, ls: { 'vb.rp.level': '2' } }); await P.routes.roleplay(''); const h = P.view.innerHTML; out.hub.push({ id: 'hub-signed-in', why: 'signed in ⇒ the AI footnote without the guest limit; stored level 2 is pressed', input: { level: 2, signedIn: true }, out: { pressed: [...h.matchAll(/data-lv="(\d)" aria-pressed="true"/g)].map(m => +m[1]), footnote: tk(unesc(/<p class="tiny muted" style="margin-top:1rem">([^<]*)<\/p>/.exec(h)[1])) } }); }
  { const P = await open({ ls: { 'vb.rp.level': '9' } }); await P.routes.roleplay(''); out.hub.push({ id: 'hub-bad-level', why: 'a stored level outside 0–2 is ignored ⇒ 1', input: { stored: '9' }, out: { pressed: [...P.view.innerHTML.matchAll(/data-lv="(\d)" aria-pressed="true"/g)].map(m => +m[1]) } }); }
  // ---------- brief ----------
  for (const id of ['cafe', 'salary']) { const P = await open({}); await P.routes.roleplay(id); const h = P.view.innerHTML, s = C.ROLEPLAY.find(x => x.id === id); P.vv[1].onclick(); await settle(3);
    out.brief.push({ id: 'brief-' + id, why: id === 'cafe' ? 'brief screen: scenario name + English title, the AI role (name – role, persona), YOUR goal (everyday scripts show the Vietnamese "can-do" line as key + the English goal), vocabulary chips (tap saves the word via App.addWord({word, def, emoji, topic:"roleplay"}, {text: def, title:"Roleplay: <title>"}) then disables with "✓ word" + toast "Đã lưu vào flashcard"), level switch labelled with the script levels, [Bắt đầu hội thoại], [Chọn tình huống khác]' : 'a work script: levels B1/B2/C1, no can-do line', input: { script: id }, out: { name: tk(unesc(/<h1>[\s\S]*?(<|)([^<]*)<\/h1>/.exec(h)[0].replace(/<[^>]*>/g, '').replace(s.em, '').trim())), ai: { name: s.ai.name, role: s.ai.role }, levels: [...h.matchAll(/data-lv="\d" aria-pressed="(?:true|false)">([^<]*)</g)].map(m => m[1]), cando: s.cando ? tk(unesc(/<p><b>([^<]*)<\/b><\/p>/.exec(h)[1])) : null, vocab: s.vocab.length, saved: P.words, toast: P.sb._toasts || [] } }); }
  { const P = await open({}); await P.routes.roleplay('zzz'); out.brief.push({ id: 'brief-unknown', why: 'unknown id ⇒ the hub', input: { script: 'zzz' }, out: { hub: /Hội thoại đóng vai/.test(P.view.innerHTML) } }); }
  // ---------- script-mode conversation (guest AI used up) ----------
  const used = { 'vb.rp.day': JSON.stringify({ d: new Date(NOW).toISOString().slice(0, 10), n: 2 }) };
  const cafe = C.ROLEPLAY.find(x => x.id === 'cafe'), L = 1;
  const chat = async (id, why, o) => {
    const P = await open({ ls: { ...used, ...(o.ls || {}) }, random: o.random, server: o.server, signedIn: o.signedIn, offline: o.offline }), steps = [], sc = C.ROLEPLAY.find(x => x.id === (o.script || 'cafe')); if (o.viaRP) { P.dones = []; P.sb.RP.chat(clone(sc), 1, { help: true, done: r => P.dones.push(r) }); await settle(8); } else await start(P, o.script || 'cafe');
    steps.push({ step: 'open', mode: tk(unesc(/<span id="rpMode">([^<]*)<\/span>/.exec(P.view.innerHTML)[1])), bubbles: bubbles(P), turn: /<span id="rpN"><\/span>/.test(P.view.innerHTML), spoken: clone(P.calls.tts).slice(0, 1).map(x => x.text) });
    for (const a of o.actions) { const n0 = (P.bubbles || []).length; if (a.say != null) { P.$('#rpIn').value = a.say; await P.$('#rpSend').onclick(); await settle(8); } else if (a.hint) { P.$('#rpHint').onclick(); } else if (a.help) { P.$('#rpHelp').onclick(); } else if (a.mic) { P.$('#rpMic').onclick(); const h = P.rec.recog.at(-1); if (a.mic.error) h.cb.error(a.mic.error); else { h.cb.result({ heard: a.mic.heard }); } h.cb.end(); await settle(8); steps.push({ step: 'mic-target', target: h.target, accent: h.accent }); } else if (a.end) { P.$('#rpEnd').onclick(); await settle(20); } else if (a.done) { P.$('#rpDone').onclick(); }
      steps.push({ step: Object.keys(a)[0], input: a, newBubbles: bubbles(P).slice(n0), turnLabel: P.$('#rpN').textContent, hintBox: a.hint || a.help ? strip(P.$('#rpHintBox').innerHTML) : undefined, inputValue: a.help ? P.$('#rpIn').value : undefined, toasts: P.sb._toasts && P.sb._toasts.slice(-1) }); }
    await settle(10);
    const rec = { id, why, input: { script: o.script || 'cafe', level: L, guestAiLeft: 0, random: o.random || [0.9], actions: o.actions, signedIn: !!o.signedIn }, out: { steps, rewards: clone(P.calls.rewards), fetches: P.fetches.map(f => ({ url: f.url, kind: f.body.kind, auth: f.auth, hasSys: !!f.body.sys })), store: P.writes.filter(w => w.store === 'localStorage').map(w => ({ [w.key]: w.value })), ...(o.viaRP ? { doneCallbacks: P.dones } : {}) } };
    if (/rpRep/.test(P.view.innerHTML) && P.$("#rpRep").innerHTML) { const h = P.$("#rpRep").innerHTML; rec.out.report = !/class="ring"/.test(h) ? { emptyBecause: 'no-answer', retry: /href="#\/roleplay\/(\w+)"/.exec(h)[1], message: tk(strip(/<p>([^<]*)<\/p>/.exec(h)[1])) } : { ring: +/<div class="ring">(\d+)<\/div>/.exec(h)[1], meters: [...h.matchAll(/<div class="rp-meter"><span class="small">([^<]*)<\/span><i role="img" aria-label="[^"]*"><b style="width:(\d+)%"><\/b><\/i><b class="small">(\d+)<\/b>/g)].map(m => ({ label: tk(unesc(m[1])), value: +m[3] })), summary: (m => (m ? unesc(m[1]) : ''))(/<p style="margin-top:\.8rem">([^<]*)<\/p>/.exec(h)), source: tk(unesc(/<p class="tiny muted">([^<]*)<\/p>/.exec(h)[1])), rewrites: [...h.matchAll(/<div class="rp-rw"><div class="small"><s lang="en">([^<]*)<\/s><\/div><div lang="en"><b>([^<]*)<\/b>[\s\S]*?<div class="small"> ?([^<]*)<\/div><button/g)].map(m => ({ you: unesc(m[1]), better: unesc(m[2]), why: tk(unesc(m[3])) })), noRewrites: /Rất tốt – không có câu nào cần viết lại/.test(h), again: /href="#\/roleplay\/cafe"/.test(h) ? '#/roleplay/' + sc.id : null, confidence: (/href="#\/confidence([^"]*)"/.exec(h) || [])[1] ?? null }; }
    out.chat.push(rec); return P; };
  const T = sc => sc.turns.length;
  const good = cafe.turns.map(t => t.h[2]);
  await chat('script-full-good', 'script mode (no AI): the AI line 1 = turns[0].a[level]; each learner message → scripted(): ≥ 3 words ⇒ advance; the reaction = the first `br` pattern (RegExp "\\\\b(pat)", case-insensitive; a pattern containing "\\\\?" also matches any "?") that matches the message, else (Math.random() < 0.5) a random ACK[level]; then the next turn\'s line a[level] (or end[level] after the last turn). AI lines are spoken (tts accent = settings.accent, rate RATE[level] = 0.82 / 0.92 / 1). After the last turn the report opens 600 ms later', { actions: good.map(say => ({ say })), random: [0.9] });
  await chat('script-short-reply', 'a reply shorter than 3 words the FIRST time ⇒ "Sorry, can you say a little more?" (clarification, turn does not advance, retried = true); the same turn answered again (any length) advances', { actions: [{ say: 'coffee' }, { say: 'a coffee' }, { say: 'large' }], random: [0.9] });
  await chat('script-ack-random', 'no `br` match ⇒ with Math.random() < 0.5 a random ACK of the level (ACK[level][floor(random·3)]) is put before the next line', { actions: [{ say: 'Could I get a latte, please?' }], random: [0.1, 0.9] });
  await chat('script-branch', 'turn 2 has `br` patterns: "large|big" answers "Large – okay."', { actions: [{ say: 'A latte please' }, { say: 'The big one, please.' }], random: [0.9] });
  await chat('hints-xp', 'hint button shows the turn tip (key, translated by the app) + "Bạn có thể nói:" + h[level] (+ 🔊); hintsUsed counts every tap; report xp = 10 + 3·spoken − min(hintsUsed, spoken), reward {spoken, xp: max(5, xp)}', { actions: [{ hint: true }, { hint: true }, ...good.map(say => ({ say }))], random: [0.9] });
  await chat('rp-chat-help', 'RP.chat(script, level, { help, done }) is the same conversation engine used by #/confidence: with help ⇒ the extra button "Giúp tôi nói" reads the hint line slowly (rate 0.72) and puts it in the input box (counts as a hint); with done ⇒ the report ends with [Tiếp tục →] which calls done({avg}) (avg = mean of the 4 criteria, null when nothing was said) instead of the retry links', { viaRP: true, actions: [{ help: true }, ...good.slice(0, 5).map(say => ({ say })), { done: true }], random: [0.9] });
  await chat('mic-turn', 'mic: the recognizer target is the turn\'s hint line h[level]; a result (heard) is sent like typed text; an error shows the toast text (UI.recErrorText)', { actions: [{ mic: { heard: 'could i get a latte please' } }, { mic: { error: 'no-speech' } }], random: [0.9] });
  await chat('end-early', '"Kết thúc & chấm điểm" at any time ⇒ the report for what was said (no answers ⇒ "Bạn chưa trả lời câu nào – hãy thử lại nhé." + [Thử lại])', { actions: [{ end: true }] });
  await chat('end-after-two', 'ending after 2 replies scores only those (clarity = min(1, replies/turns)·25 …)', { actions: [{ say: 'Could I get a medium latte with oat milk, please?' }, { say: 'Medium, please.' }, { end: true }] });
  // ---------- local scoring (what the report shows without AI) ----------
  const sets = { terse: ['coffee', 'big', 'here', 'no', 'card'], errors: ['I am agree with a latte', 'she go large', 'more better one', 'I very like it here', 'I want informations about it'], polite: ['Could I please have a latte? Thank you.', 'I would like a large one, please.', "I'd like to eat here, thanks.", 'Could I also get a croissant, please?', 'Card, please. Thank you very much.'], mixed: ["I'm happy with a coffee.", "That's fine, thanks.", 'Here is good.', "No, that's all.", "I'll pay by card."] };
  for (const [k, replies] of Object.entries(sets)) await chat('score-' + k, { terse: 'local score, very short replies: length factor 0.25 (avg words < 4) lowers natural/clarity; no polite markers; "^i\\\\s" and bare "I" count as grammar hits', errors: 'grammar patterns (ERR) each hit costs grammar 30/replies points: "I am agree", "she go", "more better", "I very like", "informations"', polite: 'POLITE markers (please, thank, could, would, i\'d like, sorry, …) raise polite = 45 + 55·share of polite replies; contractions raise natural', mixed: 'contractions in every reply: natural = 45 + 25·contractionShare + 15·lenOk + 25·meanSimilarity(reply, h[level]); all four scores clamp to 20–98' }[k], { actions: [...replies.map(say => ({ say })), ...(k === 'terse' ? [{ end: true }] : [])], random: [0.9] });
  // ---------- server AI ----------
  const srv = (n, b) => ({ status: 200, json: { out: { reply: 'Sure! What size would you like?', advance: true } } });
  await chat('server-mode', 'guest with AI left (< 2 today) and online: mode "server" (/api/ai, kind "rp", header X-Lexkite-Device, Bearer token when signed in); one AI conversation is counted in localStorage vb.rp.day {d: yyyy-mm-dd, n}; each learner message POSTs {sys, prompt, kind:"rp"} and the AI line = out.reply (≤ 400 chars); advance = out.advance !== false (or the learner already retried); the report asks the AI to score (aiScore) and falls back to the local score when the answer is not valid (4 numeric criteria + rewrites array)', { ls: { 'vb.rp.day': undefined }, server: srv, actions: [{ say: 'Could I get a latte, please?' }], random: [0.9] });
  const scoreSrv = good => (n, body) => (/^Conversation so far/.test(body.prompt) ? { status: 200, json: { out: { reply: 'Sure! What size would you like?', advance: true } } } : good ? { status: 200, json: { out: { natural: 91, polite: 82, clarity: 73, grammar: 64.4, summary: 'Nice work. Keep going.', rewrites: [{ you: 'Could I get a latte, please?', better: 'Could I get a medium oat-milk latte, please?', why: 'More specific.', meaning: 'Cho tôi một ly latte sữa yến mạch cỡ vừa.' }, { you: 'x', better: '' }, { you: 'a', better: 'b', why: 'c' }, { you: 'd', better: 'e' }, { you: 'f', better: 'g' }] } } } : { status: 200, json: { out: { natural: 'high' } } });
  await chat('server-report-ai', 'report in a server conversation: the AI scores the transcript ("Chấm bởi AI"): the four criteria must be NUMBERS and rewrites an array, else the local estimate is used; each criterion is clamped to 0–100 and rounded, avg = mean of the four; rewrites without `better` are dropped and at most 3 kept; the optional `meaning` (translation) is shown; xp as usual', { ls: { 'vb.rp.day': undefined }, server: scoreSrv(true), actions: [{ say: 'Could I get a latte, please?' }, { end: true }], random: [0.9] });
  await chat('server-report-invalid', 'an AI answer without the four numeric criteria ⇒ the local estimate ("Ước lượng nhanh trên máy (không có AI).")', { ls: { 'vb.rp.day': undefined }, server: scoreSrv(false), actions: [{ say: 'Could I get a latte, please?' }, { end: true }], random: [0.9] });
  await chat('server-fail-downgrade', 'a server error ⇒ toast "AI đang bận – tiếp tục bằng kịch bản soạn sẵn." and the mode switches to the script for the rest of the conversation (this turn already answered by the script)', { ls: { 'vb.rp.day': undefined }, server: () => ({ status: 500, json: {} }), actions: [{ say: 'Could I get a latte, please?' }, { say: 'Large, please.' }], random: [0.9] });
  await chat('server-quota', 'HTTP 429 ⇒ UI.quota(json) (toast with the reset time) and "Đã hết lượt AI hôm nay – tiếp tục bằng kịch bản soạn sẵn." ⇒ script mode', { ls: { 'vb.rp.day': undefined }, server: () => ({ status: 429, json: { error: 'quota', msg: 'Hết lượt' } }), actions: [{ say: 'Could I get a latte, please?' }], random: [0.9] });
  await chat('offline-script', 'navigator.onLine === false ⇒ no server mode even with AI left (and no AI turn is counted)', { ls: { 'vb.rp.day': undefined }, offline: true, actions: [{ say: 'Could I get a latte, please?' }], random: [0.9] });
  await chat('server-signed-in', 'signed in ⇒ AI left is unlimited (99) and the request carries Authorization: Bearer <id token>', { ls: { 'vb.rp.day': undefined }, signedIn: true, server: srv, actions: [{ say: 'Could I get a latte, please?' }], random: [0.9] });
  { const P = await open({ ls: { 'vb.rp.day': undefined }, server: srv }); const modes = []; for (let n = 0; n < 4; n++) { await start(P, 'cafe'); modes.push(tk(unesc(/<span id="rpMode">([^<]*)<\/span>/.exec(P.view.innerHTML)[1]))); }
    out.ai.push({ id: 'guest-budget', why: 'guests get GUEST_AI = 2 AI conversations per day: conversations 1 and 2 use the server (counter vb.rp.day n = 1, 2), the 3rd and later the script; the counter resets when the date changes (yyyy-mm-dd, UTC)', input: { guestAiPerDay: 2, today: new Date(NOW).toISOString().slice(0, 10) }, out: { modes, counter: P.writes.filter(w => w.key === 'vb.rp.day').map(w => JSON.parse(w.value)) } }); }
  out.ai.push({ id: 'prompts', why: 'the AI system prompt (sysOf) and the scoring prompt are built from the script: copy the templates from the request bodies below; the nano (Gemini Nano) path is a web-only on-device model: ports use their own on-device model or skip straight to the server/script', input: { script: 'cafe', level: 1 }, out: await (async () => { const P = await open({ ls: { 'vb.rp.day': undefined }, server: srv }); await start(P, 'cafe'); P.$('#rpIn').value = 'Could I get a latte, please?'; await P.$('#rpSend').onclick(); await settle(8); return { systemPrompt: P.fetches[0].body.sys, turnPrompt: P.fetches[0].body.prompt }; })() });
  return out;
}

// ================================================================== #/handsfree (web/js/handsfree.js) ==================================================================
async function handsfreeVectors() {
  const out = { queue: [], play: [], controls: [] }, KV = (() => { const sb = sbox(); run(sb, 'web/js/listen/kvoice.js'); return sb.KVoice; })(), key = t => KV.lineKey('bf_emma', String(t).trim());
  const NOWD = NOW, DAY = 864e5, srs = (o = {}) => ({ ef: 2.5, interval: 1, reps: 1, lapses: 0, due: NOWD, last: NOWD - DAY, ...o });
  const W = [{ word: 'alpha', vi: 'chữ cái đầu', ipa: '/ˈælfə/', ex: 'Alpha is the first letter of the Greek alphabet.', audio: 'https://dict.example/alpha-uk.mp3', audioUS: 'https://dict.example/alpha-us.mp3' }, { word: 'beta', vi: 'chữ cái thứ hai', ex: 'Beta comes after alpha in the alphabet.' }, { word: 'gamma', def: 'the third letter', ex: '' }];
  const card = (w, s, extra = {}) => ({ ...w, srs: s, added: NOWD - 5 * DAY, ...extra });
  const open = async (arg, o = {}) => {
    const hand = {}; let P;
    P = await pg({ hash: '#/handsfree', lang: o.lang, ls: undefined, settings: o.settings, cards: o.cards, files: ['web/js/listen/kvoice.js'], ui: { ttsClean: s => String(s).replace(/\s+/g, ' ').trim(), ipaHtml: w => `<span class="ipa">${w.ipa || ''}</span>`, ...(o.ui || {}) },
      sets: sb => { sb.LISTEN_AUDIO = new Set((o.clips || []).map(key)); sb.audioUrl = k => 'https://audio.lexkite.com/audio/l/' + k + '.mp3'; sb.document.visibilityState = o.hidden ? 'hidden' : 'visible'; sb.navigator.mediaSession = { setActionHandler(a, f) { hand[a] = f; }, metadata: null, playbackState: 'none' }; sb.MediaMetadata = class { constructor(x) { Object.assign(this, x); } };
        sb.App.currentSession = () => o.session || null; sb.URL = { createObjectURL: () => 'blob:silence' }; sb.Blob = class {}; sb.document.body.classList = { toggle: (c, f) => { const cur = !!(P.body || {})[c], on = f === undefined ? !cur : !!f; (P.body ||= {})[c] = on; }, remove: (...c) => c.forEach(x => ((P.body ||= {})[x] = false)), add: (...c) => c.forEach(x => ((P.body ||= {})[x] = true)) }; sb.IELTS_DATA = { TOPICS: [{ id: 'ngsl1', name: 'NGSL 1', words: clone(o.topicWords || W) }, { id: 'demo', name: 'Demo topic', words: clone(W.slice(0, 2)) }] }; }, late: ['web/js/handsfree.js'] });
    P.hand = hand; P.routes.handsfree(arg); await settle(4); return P;
  };
  const events = P => P.ctl.log.map(x => (x[0] === 'audio' ? ['audio', /^data:|^blob:/.test(x[1]) ? 'silence' : x[1], x[2]] : x[0] === 'speak' ? ['speak', x[1], x[3], x[5]] : x)).filter(x => x[0] !== 'wait' || true);
  const pos = P => P.$('#hfPos').textContent, card0 = P => strip(P.$('#hfCard').innerHTML);
  // ---------- which words ----------
  const q = [['due', 'no arg: cards that were studied (srs.reps > 0 or srs.last) and are due within 24 h (due ≤ now + 1 day), soonest first, at most 60; title "Từ đến hạn ôn"', '', { cards: { a: card(W[0], srs({ due: NOWD - DAY })), b: card(W[1], srs({ due: NOWD + 2 * DAY })), c: card(W[2], srs({ due: NOWD }), { word: 'gamma' }), d: { word: 'newcard', added: NOWD, srs: { reps: 0, last: null, due: NOWD } } } }],
    ['book', 'no due card but cards exist: the learner\'s book by added date, newest first (≤ 60); title "Sổ từ của bạn"', '', { cards: { a: card(W[0], srs({ due: NOWD + 9 * DAY }), { added: NOWD - 3 * DAY }), b: card(W[1], srs({ due: NOWD + 9 * DAY }), { added: NOWD - 1 * DAY }) } }],
    ['default', 'no cards at all: the first 60 words of topic ngsl1 (title = the topic name)', '', { cards: {} }],
    ['topic', '#/handsfree/<topic id>: the words of that library topic', 'demo', { cards: { a: card(W[0], srs()) } }],
    ['unknown-topic', 'unknown topic id ⇒ falls through to the due/book/default rules', 'zzz', { cards: {} }],
    ['session', '#/handsfree/session with an active review session: the session queue (cards by key, missing ones dropped); title "Phiên ôn tập ({n} thẻ)"', 'session', { cards: { a: card(W[0], srs()), b: card(W[1], srs()) }, session: { queue: ['a', 'missing', 'b'] } }],
    ['no-words', 'a topic with no words (and no cards) ⇒ the card shows "Chưa có từ nào để nghe." and no controls work', 'zzz', { cards: {}, topicWords: [] }],
    ['session-empty', 'session without a usable queue ⇒ the default rules', 'session', { cards: {}, session: { queue: [] } }]];
  for (const [id, why, arg, o] of q) { const P = await open(arg, o); out.queue.push({ id, why, input: { arg, cards: Object.keys(o.cards).length, session: o.session || null }, out: { position: pos(P), firstWord: P.$('#hfCard').innerHTML.includes('hf-word') ? /hf-word">([^<]*)</.exec(P.$('#hfCard').innerHTML)[1] : null, footer: tkAll(P.view.innerHTML.slice(P.view.innerHTML.lastIndexOf('<p class="tiny'))).slice(0, 1), empty: P.$('#hfCard').innerHTML.includes('hf-word') ? null : tk(strip(P.$('#hfCard').innerHTML)) } }); }
  // ---------- playback script ----------
  const play = async (id, why, o) => {
    const P = await open('', { cards: { a: card(W[0], srs({ due: NOWD - DAY })), b: card(W[1], srs({ due: NOWD })) }, clips: o.clips, hidden: o.hidden, settings: o.settings, lang: o.lang }); if (o.failSrc) P.ctl.failSrc.add(o.failSrc);
    P.ctl.hold(o.plays); const e0 = P.ctl.log.length; P.$('#hfPlay').onclick(); await settle(30); const ev = events(P), label1 = P.$('#hfPlay').textContent;
    if (o.pause) { P.$('#hfPlay').onclick(); }
    out.play.push({ id, why, input: { words: ['alpha', 'beta'], clips: (o.clips || []).length ? 'word+example of alpha' : 'none', hidden: !!o.hidden, hold: o.plays, settings: o.settings || {} }, out: { events: ev, playLabel: label1, label2: P.$('#hfPlay').textContent, position: pos(P), card: card0(P).slice(0, 80), body: P.body || {} } }); };
  await play('visible-clips', 'Play, screen on, Kokoro clips exist for the word and the example: step 0 plays the word clip (word-audio URL = clip for lineKey("bf_emma", word) else the card audio for the accent: en-US ⇒ audioUS||audio, else audio||audioUS; none ⇒ speech), on `ended` wait gap (900 ms, settings.hf.gap) → step 1: wait 2200 ms (time to think of the meaning) then SPEAK the meaning when opt.mean && meaning exists (voice language: vi-VN when the meaning language is vi, else LANG[ui language], else en-GB; rate 0.95) → wait gap → step 2: the example sentence (clip, else speech when the screen is on; skipped when opt.ex is off or there is none) → advance → next word (wraps), step 0 again', { clips: [W[0].word, W[0].ex], plays: 6 });
  await play('visible-no-clips', 'no clip: the word itself is spoken (accent), the card audio URL is NOT used because it exists only as a fallback URL: here the card has audio, so it is played as a track (alpha) while beta (no audio) is spoken', { plays: 6 });
  await play('hidden-screen', 'screen off (document hidden): no speech synthesis is used (browsers suspend it); where a step has no audio file a 1 s silent WAV track keeps the playback session alive and the chain advances immediately on `ended` (no setTimeout)', { hidden: true, plays: 8, clips: [W[0].word] });
  await play('no-meaning-no-example', 'options off: settings.hf = { ex: false, mean: false } ⇒ step 1 only waits, step 2 is skipped', { settings: { hf: { ex: false, mean: false, gap: 400 } }, plays: 3 });
  await play('audio-error', 'a track that fails to load (`error`) advances like `ended`', { failSrc: 'dict.example/alpha-uk', plays: 5 });
  await play('pause', 'tap again = pause: label "▶ Tiếp tục", timers cleared, audio paused, speech cancelled; MediaSession playbackState follows', { plays: 2, pause: true });
  // ---------- controls ----------
  { const P = await open('', { cards: { a: card(W[0], srs({ due: NOWD - DAY })), b: card(W[1], srs({ due: NOWD })), c: card(W[2], srs({ due: NOWD + DAY })) } }), seq = [];
    seq.push(['start', pos(P), P.$('#hfPlay').textContent]); P.$('#hfNext').onclick(); seq.push(['next', pos(P)]); P.$('#hfNext').onclick(); P.$('#hfNext').onclick(); seq.push(['next×2 (wraps)', pos(P)]); P.$('#hfPrev').onclick(); seq.push(['prev', pos(P)]); P.$('#hfPrev').onclick(); P.$('#hfPrev').onclick(); P.$('#hfPrev').onclick(); seq.push(['prev×3 (wraps)', pos(P)]);
    const md = P.sb.navigator.mediaSession.metadata; P.$('#hfEx').onchange({ target: { checked: false } }); P.$('#hfMean').onchange({ target: { checked: false } });
    out.controls.push({ id: 'prev-next', why: 'next/prev move one word with wrap-around (index mod n), reset the step to 0 and redraw (and keep playing when playing); the counter shows "i/n"; draw() also publishes the MediaSession metadata { title: word, artist: "<ipa> · <meaning>" (missing parts dropped), album: "Lexkite · <list title>", artwork 128/512 icons }', input: { cards: 3 }, out: { seq, metadata: md ? { title: md.title, artist: md.artist, album: md.album, artwork: md.artwork.map(a => a.sizes) } : null, toggles: P.writes.filter(w => w.key === 'hf').map(w => w.value), settingsHf: P.state.settings.hf } }); }
  { const P = await open('', { cards: { a: card(W[0], srs({ due: NOWD - DAY })) } }); const acts = Object.keys(P.hand).sort(); P.hand.play(); const l1 = P.$('#hfPlay').textContent; P.hand.pause(); const l2 = P.$('#hfPlay').textContent;
    out.controls.push({ id: 'media-session', why: 'lock-screen / headset controls: play, pause, nexttrack, previoustrack, seekbackward (= previous), seekforward (= next); the handlers call the same functions as the buttons; leaving the page clears metadata and every handler, stops audio and speech, removes body classes hf-on / hf-ambient', input: {}, out: { actions: acts, afterPlay: l1, afterPause: l2 } }); }
  { const P = await open('', { cards: { a: card(W[0], srs({ due: NOWD - DAY })) } }); P.$('#hfDark').onclick(); out.controls.push({ id: 'ambient-and-options', why: 'the "Màn tối" button toggles body class hf-ambient (dim screen for lock-screen listening, UI only); the two switches write settings.hf = { ex, mean, gap } (gap default 900) via App.saveSettings', input: {}, out: { ambient: P.body || {}, defaults: { ex: true, mean: true, gap: 900 } } }); }
  return out;
}

// ================================================================== the content pack + starter + assembly ==================================================================
let SPD = null;
/** the speaking bank exactly as routes.speaking() merges it (BANK + SPEAK_MORE by title) and the PARTS/FILLERS constants, read from the page / its source */
async function speakingData() {
  if (SPD) return SPD;
  const C = content(), P = await pg({ hash: '#/speaking', files: [], sets: sb => { mediaStubs(sb); sb.SPEAK_SAMPLES = clone(C.SAMPLES); sb.SPEAK_MORE = clone(C.MORE); }, late: ['web/js/speech-session.js', 'web/js/speaking.js'] });
  P.routes.speaking(''); await settle(4); const src = rd('web/js/speaking.js');
  const parts = vm.runInNewContext('(' + /const PARTS = (\{[\s\S]*?\n  \});/.exec(src)[1] + ')'), fill = /const FILLERS = \/(.*)\/gi;/.exec(src)[1];
  const tips = Object.fromEntries(['p1', 'p2', 'p3'].map(k => { P.routes.speaking(k + '/0'); return [k, [...P.view.innerHTML.matchAll(/<li style="margin:\.3rem 0">([\s\S]*?)<\/li>/g)].map(m => tk(m[1]).k)]; }));
  return (SPD = { bank: clone(P.sb.App.speakBank), parts, fillers: fill, tips });
}
function rpConsts() {
  const src = rd('web/js/roleplay.js');
  const lit = (re, what) => { const m = re.exec(src); if (!m) throw new Error('speak-pack: ' + what + ' not found'); return vm.runInNewContext('(' + m[1] + ')', { t: k => k }); };
  const nm = lit(/const NAME = (\{[\s\S]*?doctor: \(\) => t\('[^']*'\) \});/, 'roleplay NAME');
  return { names: Object.fromEntries(Object.entries(nm).map(([k, f]) => [k, f()])), confidence: lit(/const CONF = (\{[^\n]*\});/, 'roleplay CONF'), rate: lit(/const RATE = (\[[^\]]*\]);/, 'roleplay RATE'), levels: lit(/const LV = (\[[^\]]*\]), GUEST_AI/, 'roleplay LV'), guestAiPerDay: +/GUEST_AI = (\d+)/.exec(src)[1],
    ack: lit(/const ACK = (\[\[[\s\S]*?\]\]);/, 'roleplay ACK'), polite: { source: /const POLITE = \/(.*)\/i;/.exec(src)[1], flags: 'i' }, errors: [...src.slice(src.indexOf('const ERR = [')).split('\n')[0].matchAll(/\/((?:[^\/\\]|\\.)+)\/([a-z]*)(?=[,\]])/g)].map(m => ({ source: m[1], flags: m[2] })) };
}
export const SPEAK_PACK_PATH = 'web/data/speak-pack.json', SPEAK_PACK_URL = 'https://lexkite.com/data/speak-pack.json', SPEAK_STARTER_PATH = 'native/shared/gen/content-pack/speak-starter.json';
async function speakBody(starter) {
  const C = content(), S = await speakingData(), BUILTIN = 8;
  const bank = starter ? S.bank.slice(0, BUILTIN) : S.bank, qs = new Set(bank.flatMap(b => [...b.p1, b.p2.q, ...b.p3]));
  const samples = Object.fromEntries(Object.entries(C.SAMPLES).filter(([k]) => !starter || qs.has(k)));
  const pronKeep = starter ? C.PRON.filter((l, i) => i < 6 || ['th-sounds', 'weak-forms'].includes(l.id)) : C.PRON;
  return { speaking: { bank, samples, parts: S.parts, fillers: S.fillers, tips: S.tips }, pron: { lessons: clone(pronKeep), pairs: clone(C.pairs), coach: clone(C.coach) }, roleplay: { scripts: starter ? C.ROLEPLAY.filter(s => s.kind === 'everyday').slice(0, 6) : C.ROLEPLAY, ...rpConsts() }, consts: { weak: C.WEAK, similarity: 'lesson.json similarity', speakScore: clone((await speakScoreVectors()).cal) },
    sources: { say: 'https://lexkite.com/data/say.json (4 series, ~39 KB: not repeated here)', situations: 'cpack/speak/s/<id>.js (#/speak, flag speak_pack): SPK_B bodies are JSON after "= " in the first statement; translations are positional arrays (SPK_T) merged by SPK_fill', readtests: 'rtype: the P09 reading-test pack (web/js/readtest/test*.js + explain-*.js)' } };
}
const hash12 = o => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0, 12);
/** Text of web/data/speak-pack.json: the COMPLETE content of the P07 screens (speaking bank + sample answers, 56 pronunciation lessons + pair/coach data, 31 roleplay scripts) + constants read from the web code. v = content hash. */
export async function speakPack() {
  const body = await speakBody(false), v = hash12(body);
  return JSON.stringify({ _doc: 'GENERATED by scripts/native/gen-speak.mjs (node scripts/native/gen.mjs) from web/js/speaking.js + cpack/speak/{samples,more2,more3}.js + speak/more.js, web/js/pron/*.js, web/js/roleplay/data-*.js – do not edit. Native pack for P07: shape documented in docs/specs/native-m4-vectors.md (P07). Audio and the speak situations are NOT bundled.', schema: 1, v, ...body }) + '\n';
}
/** Offline first launch: the 8 built-in speaking topics (+ their sample answers), 8 pronunciation lessons, the 6 everyday roleplay scripts and every table/constant. */
export async function speakStarter() {
  const body = await speakBody(true), v = hash12(body);
  return JSON.stringify({ _doc: 'GENERATED by scripts/native/gen-speak.mjs (node scripts/native/gen.mjs) – do not edit. Starter subset of ' + SPEAK_PACK_URL + ' (same shape): 8 built-in speaking topics, 8 pronunciation lessons, 6 everyday roleplay scripts; bundled for the first offline launch.', schema: 1, v, ...body }) + '\n';
}

// ---------- strings: every Vietnamese key the P07 screens pass to t() (literal calls + keys that arrive as data) ----------
export const STRING_FILES = { sp: ['web/js/speak/app.js', 'web/js/st/v2/pas-sit.js', 'web/js/st/v2/pas-drill.js'], spk: ['web/js/speaking.js'], pron: ['web/js/pron.js', 'web/js/pron/pairs.js', 'web/js/pron/coach.js', 'web/js/pron/sayit.js', 'web/js/pron/rhythm.js'], say: ['web/js/say.js', 'web/js/st/v2/say-front.js', 'web/js/st/v2/say-back.js'], reflex: ['web/js/reflex.js'], rtype: ['web/js/rtype.js'], rp: ['web/js/roleplay.js'], hf: ['web/js/handsfree.js'] };
/** [{ key, area }] – area = the screen group (string-id prefix speak.<area>.*) the key belongs to; shared UI helpers (ui.js recognizer errors / quota) go to area "ui" */
export async function speakStringKeys() {
  const out = new Map(), add = (key, area) => { if (key && !out.has(key)) out.set(key, area); };
  const RE = [/\bt\('((?:[^'\\]|\\.)*)'/g, /\bt\("((?:[^"\\]|\\.)*)"/g, /\bI18N\.tk\('((?:[^'\\]|\\.)*)'/g];
  const scan = (src, area) => { for (const ln of src.split('\n')) for (const re of RE) for (const m of ln.matchAll(re)) add(m[1].replace(/\\(['"\\])/g, '$1'), area); };
  for (const [area, files] of Object.entries(STRING_FILES)) for (const f of files) scan(rd(f), area);
  const ui = rd('web/js/ui.js').split('\n'), a = ui.findIndex(l => l.includes('const REC_ERR = {')), b = ui.findIndex(l => l.includes('const recErrorText ='));
  scan(ui.slice(a, b + 1).join('\n'), 'ui'); scan(ui.find(l => l.includes('const quotaText =')), 'ui');
  // keys that reach t() as DATA: speaking part names/descriptions + topic titles, pron group names, roleplay tips / can-do lines, the tab + beat labels of #/speak
  const S = await speakingData(); for (const p of Object.values(S.parts)) { add(p.name, 'spk'); add(p.desc, 'spk'); } for (const bt of S.bank) add(bt.title, 'spk');
  const pron = rd('web/js/pron.js'); for (const m of pron.matchAll(/\{ id: '(?:vowels|diphthongs|consonants|vn|stress)', name: '([^']*)', emoji: '[^']*', desc: '([^']*)' \}/g)) { add(m[1], 'pron'); add(m[2], 'pron'); }
  for (const sc of content().ROLEPLAY) { add(sc.cando, 'rp'); for (const tr of sc.turns) add(tr.tip, 'rp'); }
  const spk = rd('web/js/speak/app.js'); for (const m of spk.matchAll(/\['(?:listen|shadow|memory)', '([^']*)'\]/g)) add(m[1], 'sp'); for (const m of spk.matchAll(/\['#\/[a-z]+', '([^']*)'\]/g)) add(m[1], 'sp');
  return [...out].map(([key, area]) => ({ key, area }));
}

// ---------- assembly ----------
const keysOf = P => { const m = new Set(); for (const w of P.writes) m.add(w.store + ':' + (w.key || '')); return [...m]; };
export async function speakVectors() {
  process.env.TZ = 'UTC'; PAGES.length = 0;
  const C = content(), D = readtestCut(), S = await speakingData();
  const out = { _doc: 'GENERATED by scripts/native/gen-speak.mjs – see docs/specs/native-m4-vectors.md (P07). Top level = web route (speak, speaking, pron, say, reflex, rtype, roleplay, handsfree) + shared + persist + data. Each case: id, why, input, out. Text inside out is the Vietnamese i18n KEY as the web passes it to t() (a key with variables is {k, v}); map keys through native/shared/strings.json speak.* ids. Microphone/ASR/recording/speech/audio/timers are PLATFORM inputs recorded in each case `input` (heard text, alternatives, error codes, elapsed ms, random numbers); the scoring code that consumes them is the real web code.', now: NOW };
  out.shared = { recognize: recogVectors(), speak: await speakScoreVectors() };
  out.speak = await speakRouteVectors();
  out.speaking = await speakingVectors();
  out.pron = { ...(await pronVectors()), ...(await pronSayVectors()), logic: pronLogicVectors() };
  out.say = await sayVectors();
  out.reflex = await reflexVectors();
  out.rtype = await rtypeVectors();
  out.roleplay = await roleplayVectors();
  out.handsfree = await handsfreeVectors();
  // Số lượng nội dung THẬT của gói đầy đủ (speak-pack.json): test native đọc số kỳ vọng ở đây thay vì ghi cứng – thêm chủ đề/kịch bản không làm đỏ native; sàn tối thiểu vẫn nằm trong test (chỉ tăng).
  out.counts = { bank: S.bank.length, lessons: C.PRON.length, contrasts: C.pairs.contrasts.length, coachSentences: C.coach.sentences.length, scripts: C.ROLEPLAY.length, daily: C.ROLEPLAY.filter(s => s.kind === 'everyday').length };
  const per = {}; for (const P of PAGES) for (const k of keysOf(P)) (per[P.route] ||= new Set()).add(k);
  out.persist = { _doc: 'What each screen WRITES, observed from the flows above (store:key). store = IndexedDB/Store key ("store:mistakes", logMistake), game = Game.mutate field (state.game.*, synced via sync.json), settings = App.saveSettings, localStorage = per-device only (NOT synced). XP / daily quests go through App.reward (M3) with the reward objects recorded in each case; cards go through App.addWord (vocab.json wordbook). Audio recordings are never stored.', ...Object.fromEntries(Object.entries(per).map(([k, v]) => [k, [...v].sort()])) };
  out.data = { _doc: 'REAL records cut down so the ports run every P07 screen with no web files: speaking = the first 3 merged topics + the sample answers of their questions; pron = lessons iː, th-sounds, weak-forms + ALL pair/coach tables; roleplay = scripts cafe + salary; say = the first series; situations = cafe + ask-directions (SPK_B bodies, English only); readtests = ONE group per question kind (the full IELTS reading tests are the P09 pack). The complete content is web/data/speak-pack.json.',
    speaking: { bank: S.bank.slice(0, 3), samples: Object.fromEntries(Object.entries(C.SAMPLES).filter(([k]) => S.bank.slice(0, 3).some(b => [...b.p1, b.p2.q, ...b.p3].includes(k)))), parts: S.parts, fillers: S.fillers }, pron: { lessons: C.PRON.filter(l => ['iː', 'th-sounds', 'weak-forms'].includes(l.id)), pairs: C.pairs, coach: C.coach, weak: C.WEAK },
    roleplay: C.ROLEPLAY.filter(s => ['cafe', 'salary'].includes(s.id)), say: { v: SAY.v, series: [SAY.series[0]] }, situations: (() => { const sb = sbox(); for (const id of SIT_IDS) vm.runInContext(sitFile(id), sb); return clone(Object.fromEntries(SIT_IDS.map(id => [id, sb.SPK_B[id]]))); })(), readtests: { tests: D.tests, explain: D.explain, counts: D.counts } };
  return rigVectorText(out);
}
export { content };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { const s = await speakVectors(); console.log(Buffer.byteLength(s), 'bytes'); }
