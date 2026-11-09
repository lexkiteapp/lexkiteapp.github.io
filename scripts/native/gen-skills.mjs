/* Native M4 – skills-screen conformance vectors (parity P06 Listening & reading: #/listening #/listen #/listen-test #/dictation #/reading #/read; P07/P09 extend this file).
 * Reference = the REAL web code, never re-implemented: web/js/listening.js (hub, player, listen-test, dictation, castVoices, Player), web/js/reading.js (list + reader),
 * web/js/qengine.js (QE grading/band), web/js/qtips.js (qstat), web/js/lexis.js (tokeniser), web/js/listen/kvoice.js (voice casting + file keys), web/js/plan.js (logMistake)
 * run in node:vm. The pages run on the RECORDING DOM stub of gen-vocab.mjs (no real DOM); speech synthesis, <audio> and timers are replaced by a recorder, so the Player
 * "script" (which line, which voice, which rate, which wait) is a vector. Vectors keep DATA (rows, tokens, scores, stored records), never HTML.
 * Determinism: TZ=UTC, now = 2026-01-05T09:00:00Z (= skills.now), floats rounded by rigVectorText. Exports skillsVectors() → text of vectors/skills.json.
 * Top level is keyed by ROUTE (listening, listen, listen-test, dictation, reading, read) + shared/data/persist, so P07 (toeic…) and P09 can add keys. Spec: docs/specs/native-m4-vectors.md. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { mkEnv, mkApp, slice, NOW } from './gen-vocab.mjs';
import { rigVectorText } from './gen-teach.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
export const clone = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
const tick = () => new Promise(r => setImmediate(r));
export const settle = async (n = 40) => { for (let i = 0; i < n; i++) await tick(); };
const unesc = x => (typeof x === 'string' ? x.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&') : x);
const strip = h => unesc(String(h || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());

const LFILES = [...Array.from({ length: 9 }, (_, i) => `web/js/listen/test${i + 1}.js`), 'web/cpack/listen/test10.js'];
const KEEP_TESTS = [1, 2];                         // listening tests carried whole in skills.json (data.listening); the rest is fetched like the web does
const KEEP_READ = { A2: 1, B1: 2, B2: 2, C1: 1 };  // readings carried (first N of each level in load order)
const LISTEN_FILES = ['web/js/lexis.js', 'web/js/qengine.js', 'web/js/qtips.js', 'web/js/listen/kvoice.js'];
const SPLIT = vm.runInNewContext(`(function(){ ${slice(rd('web/js/ui.js'), /function splitSentences\(text\) \{/)}\n return splitSentences; })()`);
const UI_SRC = rd('web/js/ui.js');
const CDN_SRC = UI_SRC.slice(UI_SRC.indexOf('let cdnFail = 0;'), UI_SRC.indexOf('g.audioFail = () => { cdnFail++; };') + 'g.audioFail = () => { cdnFail++; };'.length).replace(/const lk = [^\n]*\n/, 'const lk = k => k;\n');
const VIHTML = /App\.viHtml = (\(vi, en\) => \{[^\n]*\});/.exec(rd('web/js/app.js'))[1];

// ---------- fake platform: speech, <audio>, timers (a recorder; completes every utterance/clip by itself unless a scenario holds it) ----------
export function platform(sb, opt = {}) {
  const log = []; let hold = null, gen = 0, nT = 0, played = 0; const pending = new Set(); const preload = [];
  const ctl = { log, preload, long: [], longMs: 0, failSrc: new Set(), notAllowed: false, hold: n => { hold = n == null ? null : played + n; }, release: () => { hold = null; } };
  const held = () => hold != null && played >= hold;
  sb.setTimeout = (f, ms) => { const id = ++nT; log.push(['wait', ms]); if (ms >= 15000) { ctl.long.push(f); ctl.longMs = ms; return id; } pending.add(id); setImmediate(() => { if (pending.delete(id)) f(); }); return id; };
  sb.clearTimeout = id => { pending.delete(id); };
  sb.setInterval = (f, ms) => { (sb._intervals ||= []).push({ f, ms }); return sb._intervals.length; };
  sb.clearInterval = () => {};
  if (!opt.noSpeech) {
    sb.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
    sb.speechSynthesis = {
      cancel() { gen++; }, getVoices: () => [],
      speak(u) {
        const my = gen; played++; log.push(['speak', u.text, u.voice ? u.voice.name : null, u.lang, u.pitch, u.rate]);
        if (held()) return;
        setImmediate(() => { if (my !== gen) return; if (u.onstart) u.onstart(); if (u.onend) u.onend(); });
      },
    };
  }
  sb.Audio = class {
    constructor(src) { this._src = src || ''; this.playbackRate = 1; this.preservesPitch = false; this.dead = false; this.used = false; }
    get src() { return this._src; }
    set src(v) { this._src = v; setImmediate(() => { if (!this.used) preload.push(String(v).replace(/^.*\/audio\/l\//, '').replace(/\.mp3$/, '')); }); }
    pause() { this.dead = true; }
    addEventListener(ev, fn) { (this._ls ||= {})[ev] = fn; }
    setAttribute() {}
    play() {
      this.used = true;
      if (ctl.notAllowed) { const e = new Error('blocked'); e.name = 'NotAllowedError'; return Promise.reject(e); }
      played++; log.push(['audio', this._src.replace(/^.*\/audio\/l\//, '').replace(/\.mp3$/, ''), Math.round(this.playbackRate * 1e6) / 1e6]);
      if (held()) return Promise.resolve();
      const failing = [...ctl.failSrc].some(s => this._src.includes(s));
      setImmediate(() => { if (this.dead) return; if (failing) { if (this.onerror) this.onerror(); else if (this._ls && this._ls.error) this._ls.error(); return; } if (this.onplaying) this.onplaying(); if (this.onended) this.onended(); else if (this._ls && this._ls.ended) this._ls.ended(); });
      return Promise.resolve();
    }
  };
  return ctl;
}

/** One web "install" for the skills pages: real core + word data + the listening/reading scripts, recording App/Game/Store. */
export async function mk(o = {}) {
  const voiceObjs = {}; // browsers return the same voice objects on every call; listening.js compares them with ===
  const calls = { ctx: [], tts: [], addWord: [], dict: [], rewards: [], speak: [] }, writes = [];
  const E = mkEnv({ hash: o.hash || '#/listening', lang: o.lang, learnLang: o.learnLang, meanLang: o.meanLang, ls: o.ls,
    ui: { icon: () => '', splitSentences: SPLIT, voicesFor: acc => (voiceObjs[acc] ||= ((o.voices || {})[acc] || []).map(name => ({ name }))), levelChip: () => '', posChip: () => '', ipaHtml: () => '',
      speak: (w, accent) => { calls.speak.push({ word: w, accent }); }, ctxBox: (s, w) => { calls.ctx.push({ sentence: s, word: w }); return ''; }, tts: (text, accent, x, opts) => { calls.tts.push({ text, accent, cb: !!opts }); if (opts) calls.ttsOpts = opts; }, ...(o.ui || {}) } });
  const sb = E.sb; sb.CSS = { escape: s => String(s) }; sb.confetti = n => { (sb._conf ||= []).push(n); }; sb.innerWidth = 1200; sb.confirm = o.confirm || (() => true);
  sb.document.body.contains = () => true;
  const ctl = platform(sb, o);
  vm.runInContext(`(function (g) { ${CDN_SRC}\n })(self)`, sb, { filename: 'web/js/ui.js#audioUrl' });
  sb.LISTEN_AUDIO = new Set(o.audio || []);
  const game = clone(o.game) || { xp: 100, days: {}, total: {} };
  const { app, state, routes } = mkApp(E, { cards: o.cards || {}, settings: o.settings || {}, game });
  const S = E.Core.Store, set0 = S.set.bind(S); S.set = async (k, v) => { writes.push({ store: 'store', key: k, value: clone(v) }); return set0(k, v); };
  const ls0 = E.ls.setItem; E.ls.setItem = (k, v) => { writes.push({ store: 'localStorage', key: k, value: String(v) }); return ls0(k, v); };
  sb.Game = { mutate: async fn => { const before = clone(state.game), gs = clone(before); await fn(gs); for (const k of Object.keys(gs)) if (JSON.stringify(gs[k]) !== JSON.stringify(before[k])) writes.push({ store: 'game', key: k, value: clone(gs[k]) }); state.game = gs; return gs; } };
  app.reward = async (r, el) => { calls.rewards.push(clone(r)); }; let prevSet = clone(state.settings); app.saveSettings = () => { for (const k of Object.keys(state.settings)) if (JSON.stringify(state.settings[k]) !== JSON.stringify(prevSet[k])) writes.push({ store: 'settings', key: k, value: clone(state.settings[k]) }); prevSet = clone(state.settings); };
  app.addWord = async (entry, ctx, opts) => { calls.addWord.push({ entry: entry.topic === 'mine' ? { word: entry.word, topic: 'mine', emoji: entry.emoji } : { word: entry.word, vi: entry.vi }, ctx: clone(ctx), opts: clone(opts) }); };
  app.inDeck = w => !!state.cards[String(w).toLowerCase()];
  app.viHtml = vm.runInContext(`(function(esc, I18N){ return ${VIHTML}; })`, sb)(sb.UI.esc, sb.I18N);
  const dict = o.dict || {};
  sb.Dict = { quick: async w => { calls.dict.push(['quick', w]); return dict.quick === undefined ? null : typeof dict.quick === 'function' ? dict.quick(w) : dict.quick; },
    lookup: async (w, op) => { calls.dict.push(['lookup', w, clone(op)]); return dict.lookup === undefined ? null : typeof dict.lookup === 'function' ? dict.lookup(w) : dict.lookup; },
    translateVi: async s => { calls.dict.push(['translateVi', s]); return 'VI:' + s; }, translateTo: async (s, L) => { calls.dict.push(['translateTo', s, L]); return L.toUpperCase() + ':' + s; } };
  for (const f of ['web/js/plan.js']) E.load(f);
  for (const f of o.files || []) E.load(f);
  if (o.sets) o.sets(sb);
  for (const f of o.late || []) E.load(f);
  return { E, sb, app, state, routes, ctl, calls, writes, view: E.dom.view, $: E.dom.$, game: () => state.game };
}

// ---------- element helpers for the recording DOM ----------
export function el(P, sel, o = {}) {
  const e = P.E.dom.mkEl(sel); Object.assign(e, o); const cls = new Set(o.classes || []);
  e.classList = { add: (...c) => c.forEach(x => cls.add(x)), remove: (...c) => c.forEach(x => cls.delete(x)), toggle: (c, f) => { const on = f === undefined ? !cls.has(c) : !!f; if (on) cls.add(c); else cls.delete(c); return on; }, contains: c => cls.has(c) };
  e._cls = cls; return e;
}
const noRoot = () => ({ dataset: {}, querySelector: () => null, querySelectorAll: () => [], insertAdjacentHTML() {} });
/** A fake question root for QE.collect: answers = { n: value } (radio value / TRUE.. / match letter / typed gap) and { m<groupIndex>: ['A','C'] } for "choose 2". */
export function fakeRoot(answers) {
  const r = noRoot();
  r.querySelector = sel => {
    let m = /^input\[name="q(\d+)"\]:checked$/.exec(sel); if (m) return answers[m[1]] == null ? null : { value: String(answers[m[1]]) };
    m = /^\[data-qn="(\d+)"\]$/.exec(sel); if (m) return { value: answers[m[1]] == null ? '' : String(answers[m[1]]) };
    return null;
  };
  r.querySelectorAll = sel => { const m = /^\[data-multi="(\d+)"\]:checked$/.exec(sel); return m ? (answers['m' + m[1]] || []).map(value => ({ value })) : []; };
  return r;
}
/** Harness-side generation of the answer sets the cases feed (recorded in each case's input; not logic under test). kind: perfect | blank | mixed */
export function answersFor(p, kind) {
  const a = {};
  p.groups.forEach((g, gi) => {
    if (g.type === 'multi') { a['m' + gi] = kind === 'perfect' ? g.a.slice() : kind === 'mixed' ? [g.a[0], g.options.map(o => String(o).split(' ')[0]).find(c => !g.a.includes(c))] : []; return; }
    g.items.forEach(it => {
      if (kind === 'blank') return;
      const wrong = kind === 'mixed' && it.n % 3 === 0, over = kind === 'mixed' && it.n % 5 === 0;
      if (g.type === 'mcq') a[it.n] = String(wrong ? (it.a + 1) % it.options.length : it.a);
      else if (g.type === 'tfng' || g.type === 'ynng') a[it.n] = wrong ? (it.a === 'TRUE' ? 'FALSE' : 'TRUE') : it.a;
      else if (g.type === 'match') a[it.n] = wrong ? g.options.map(o => String(o).split(' ')[0]).find(c => c !== it.a) : it.a;
      else a[it.n] = wrong ? 'zzz' : over ? it.a[0] + ' one two three four' : (it.n % 4 === 1 ? it.a[0].toUpperCase() : it.a[0]);
    });
  });
  return a;
}
const qNums = p => p.groups.flatMap(g => (g.type === 'multi' ? g.n : g.items.map(i => i.n)));

// ---------- the content the pages run on ----------
let DATA = null;
async function content() {
  if (DATA) return DATA;
  const P = await mk({ files: [...LISTEN_FILES, ...LFILES, 'web/js/readings.js', 'web/cpack/readings/more.js'], late: ['web/js/listening.js'] }); // listening.js rotates the MCQ options at load → ship the rotated data
  const all = clone(P.sb.LISTENING), R = clone(P.sb.READINGS), want = { ...KEEP_READ }, readings = [];
  for (const r of R) if (want[r.level] > 0) { want[r.level]--; readings.push(r); }
  const lex = vm.runInContext(`(function(g){ ${(() => { const s = rd('web/js/lexis.js'), a = s.indexOf('const AWL = new Set()'), b = s.indexOf('PHRASES.sort('); return `const { TOPICS, INDEX } = g.IELTS_DATA; ${s.slice(a, s.indexOf('\n', b))}`; })()}\n return { awl: [...AWL], link: [...LINK], phrases: PHRASES }; })(self)`, P.sb);
  DATA = { allListening: all, listening: all.filter(p => KEEP_TESTS.includes(p.test)), readings, readingsAll: R, lexis: clone(lex) };
  return DATA;
}
const BASE = ['web/js/lexis.js', 'web/js/qengine.js', 'web/js/qtips.js', 'web/js/listen/kvoice.js'];
/** page env on the cut-down data: LISTENING/READINGS = data.* (what the ports get) */
async function page(o = {}) {
  const D = await content();
  return mk({ ...o, files: BASE, sets: sb => { sb.LISTENING = clone(o.listening || D.listening); sb.READINGS = clone(o.readings || D.readings); if (o.sets) o.sets(sb); }, late: ['web/js/listening.js', 'web/js/reading.js'] });
}

// ---------- HTML → data parsers (the web pages emit HTML; the vector keeps what it says) ----------
const TOKRE = /<span class="([^"]*)" data-w="([^"]*)"(?: data-ph="([^"]*)")?>([^<]*)<\/span>|<mark class="evi">|<\/mark>|([^<]+)/g;
/** Lexis.markSentence HTML → ["plain", [text, w, "kw awl", ph?], …] */
export function tokensOf(html) {
  const out = []; let m; TOKRE.lastIndex = 0;
  while ((m = TOKRE.exec(html))) {
    if (m[2] !== undefined) { const cls = m[1].split(' ').filter(c => c && c !== 'tw').join(' '); out.push(m[3] !== undefined ? [unesc(m[4]), unesc(m[2]), cls, unesc(m[3])] : [unesc(m[4]), unesc(m[2]), cls]); }
    else if (m[5] !== undefined) out.push(unesc(m[5]));
  }
  return out;
}
const sentsOf = html => [...String(html).matchAll(/<span class="sent">([\s\S]*?)<\/span>(?=<span class="sent">|<\/p>)/g)].map(m => tokensOf(m[1]));
const paras = html => [...String(html).matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m => sentsOf(m[1] + '</p>'));
const plainOf = toks => toks.map(x => (typeof x === 'string' ? x : x[0])).join('');

/** transcriptHtml rows (listening.js:114) */
function transcriptRows(html) {
  return String(html).split('<div class="tl').slice(1).map(d => {
    const i = +/data-line="(\d+)"/.exec(d)[1];
    if (/^ say/.test(d)) return { i, kind: 'say', text: strip(/<i>([\s\S]*?)<\/i>/.exec(d)[1]) };
    const spk = strip((/<span class="spk">([\s\S]*?)<\/span>/.exec(d) || [])[1]), sent = (/<span class="sent">([\s\S]*)<\/span>(?: <span class="evn">|<\/div>)/.exec(d.replace(/<span class="evn">[\s\S]*$/, m => '</div>' + m)) || [])[1] || '';
    const ev = [...d.matchAll(/<span class="evn">([^<]*)<\/span>/g)].map(m => +/(\d+)/.exec(m[1])[1]);
    const row = { i, kind: 'line', speaker: spk, tokens: tokensOf(sent.replace(/<\/div>[\s\S]*$/, '')) };
    if (/has-ev/.test(d)) { row.ev = ev; row.marked = /<mark class="evi">/.test(d); }
    return row;
  });
}

// ---------- drive helpers ----------
function qCtx(P, p, answers) { const r = fakeRoot(answers); const q = P.$('#lQs'); q.querySelector = r.querySelector; q.querySelectorAll = r.querySelectorAll; q.dataset = {}; return q; }
const storeGet = (P, k, d) => P.E.Core.Store.get(k, d);
const mistakeRows = async P => (await storeGet(P, 'mistakes', [])).map(x => ({ kind: x.kind, qK: x.qK, q: x.q, answer: x.answer, given: x.givenK || x.given, explainK: x.explainK, ref: x.ref, n: x.n, fixed: x.fixed }));
const writesOf = P => { const m = new Set(); for (const w of P.writes) m.add(w.store === 'localStorage' && /^ielts\./.test(w.key) ? 'store:' + w.key.slice(6) : w.store + ':' + (w.key || '')); return [...m]; };
const lastW = (P, store, key) => { const l = P.writes.filter(w => w.store === store && w.key === key); return l.length ? l[l.length - 1].value : undefined; };

// ================================================================== shared ==================================================================
async function sharedVectors() {
  const D = await content(), out = {};
  const parts = D.listening;
  // ---- KVoice: file keys + voice casting for the HQ clips ----
  const KV = vm.runInNewContext(`(function(){ const self = {}; ${rd('web/js/listen/kvoice.js')}\n return self.KVoice; })()`, {});
  out.kvoice = {
    _doc: 'KVoice (web/js/listen/kvoice.js): voices(part) → speaker → Kokoro voice (fixed pools per accent+gender, narrator bm_george, no voice reused inside a part); lineKey = FNV-1a 32 → base36 of "<voice>|<trimmed text>"; mp3 URL = <AUDIO_BASE>/<key>.mp3. split = same sentence splitter as ui.js splitSentences (one clip per sentence).',
    hash: ['|', 'a|', 'bm_george|Part 1.', 'af_heart|Hello there, how are you today?'].map(s => ({ input: s, out: KV.lineKey(s.split('|')[0], s.split('|')[1]) })),
    voices: parts.map(p => ({ part: p.id, speakers: p.speakers, out: KV.voices(p) })),
    lineKeys: parts.slice(0, 2).map(p => { const v = KV.voices(p); return { part: p.id, keys: p.script.map((l, i) => (l.pause != null ? null : { i, voice: l.say ? v._narrator : v[l.s], key: KV.lineKey(l.say ? v._narrator : v[l.s], l.say || l.t) })).filter(Boolean).slice(0, 8) }; }),
    split: ['Hello there. How are you? Fine; thanks: and you', 'A'.repeat(230) + ', and more words here to cut at the comma. End.', '  spaced   out   text  '].map(s => ({ input: s, out: KV.split(s) })),
  };
  // ---- audio URL chain ----
  { const P = await mk({}); const A = P.sb; out.audioUrl = { _doc: 'ui.js: window.audioUrl(key) = AUDIO_BASES[min(2, cdnFail>>1)] + key + (LISTEN_AUDIO_S2.has(key) ? "-s2" : "") + ".mp3"; every audioFail() (error before the clip played) does cdnFail++ so the 2nd failure moves to the next CDN. The key set LISTEN_AUDIO (web/js/listen/audio-index.js, Rice-coded) says which lines have a clip: native may HEAD/try and fall back to TTS on error (web does the same).',
      bases: clone(A.AUDIO_BASES), steps: [0, 1, 2, 3, 4, 5, 6].map(n => { const s = A.audioUrl('k1'); const r = { failures: n, url: s }; A.audioFail(); return r; }) }; }
  // ---- castVoices: which device voice, pitch and accent each speaker gets ----
  const VOICES = {
    rich: { 'en-GB': ['Daniel', 'Kate', 'Oliver', 'Serena', 'Google UK English Female'], 'en-US': ['Samantha', 'Alex', 'Fred', 'Allison', 'Aaron'], 'en-AU': ['Karen', 'Lee', 'Catherine'] },
    one: { 'en-GB': ['Daniel'], 'en-US': ['Samantha'] },
    none: {},
    unlabelled: { 'en-GB': ['Voice A', 'Voice B', 'Voice C'] },
  };
  out.cast = [];
  for (const [vid, vs] of Object.entries(VOICES)) {
    const P = await page({ voices: vs });
    out.cast.push({ id: 'cast-' + vid, why: { rich: 'enough named voices: each speaker gets an unused voice matching the gender regex (female/male name lists), narrator = first unused en-GB voice, pitch 1.05 (f) / 0.95 (m)', one: 'one voice per accent: later speakers fall back to the other accent list, a re-used voice gets pitch 1.2 (f) / 0.8 (m); accents without voices use en-GB', none: 'no device voices: voice null everywhere, lang/pitch still set, narrator en-GB pitch 1', unlabelled: 'voice names that match neither gender regex: first unused voice that is not of the opposite gender regex, else any unused' }[vid],
      input: { voices: vs, parts: parts.map(p => ({ id: p.id, speakers: p.speakers })) }, out: parts.map(p => { const c = P.sb.App.listening.castVoices(p); return { part: p.id, cast: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, { voice: v.voice ? v.voice.name : null, lang: v.lang, pitch: v.pitch }])) }; }) });
  }
  // ---- Lexis tokeniser ----
  const L = await page({}); const Lx = L.sb.Lexis;
  const words = ['however', 'Sustainable', 'consumers', 'analysed', 'running', 'quickly', 'organisation', 'activity', 'Moreover', 'resident', 'residents', 'the', "don't", 'state-of-the-art', 'zzz', 'thus'];
  out.lexis = { _doc: 'Lexis (web/js/lexis.js): classify(w) = {awl: stem found in AWL set (bases(w) order) | undefined, link: w if in LINK}; markSentence tokenises a sentence (phrases from data.lexis.phrases first: longest-first regexp, \\s+ between words, case-insensitive) into tokens [text, w(lowercase, ’→\'), classes, phrase?] and plain strings; classes: kw (in opts.keywords), link/col (phrase type, else single link word), awl, mine (opts.mine(w)). A token is a word when it matches ^([^A-Za-z]*)([A-Za-z][A-Za-z\'’-]*[A-Za-z]|[A-Za-z])([^A-Za-z]*)$ – prefix/suffix punctuation stays plain text.',
    classify: words.map(w => ({ input: w, out: (c => ({ awl: c.awl || null, link: c.link || null }))(Lx.classify(w)) })),
    bases: ['studies', 'tried', 'stopped', 'making', 'quickly', 'activity', 'organisation', 'agreement', 'realise'].map(w => ({ input: w, out: Lx.bases(w) })),
    mark: [
      ['plain', 'no special words: every word is a tap target, nothing is highlighted', 'The city has a park.', {}], ['link-awl', 'a linking word (however → class link) and academic words (sustainable… → awl when their stem is in the AWL set)', 'However, sustainable farming has yielded results.', {}], ['phrase', 'multi-word phrases: every word of the phrase carries the phrase text (data-ph) and its class (link for linking phrases, col for collocations)', 'As a result, many people look forward to it, and in addition they pay attention.', {}],
      ['keywords-mine', 'opts.keywords adds class kw, opts.mine(w) adds class mine (order of classes: kw, link/col, awl, mine)', 'Residents consume fewer nutrients today.', { keywords: ['residents', 'nutrients'], mine: ['today', 'fewer'] }], ['punct', 'quotes, dashes, brackets, digits and % stay plain text around the words; ’ is normalised to \' in w', '“Hello,” she said – it\'s (really) 3.5% better; don’t panic!', {}], ['caps', 'matching is case-insensitive; w is lower-cased, the shown text keeps its case', 'FURTHERMORE, Moreover moreover.', {}],
    ].map(([id, why, s, o]) => ({ id, why, input: { sentence: s, keywords: o.keywords || [], mine: o.mine || [] }, out: tokensOf(Lx.markSentence(s, { keywords: new Set(o.keywords || []), mine: w => (o.mine || []).includes(w) }))})) };
  // ---- QE: grading + band ----
  const Q = L.sb.QE;
  const gaps = [{ a: ['library'], limit: 2, given: 'Library' }, { a: ['library'], limit: 2, given: 'the library' }, { a: ['7.45'], limit: 2, given: '7.45' }, { a: ['£20'], limit: 2, given: '20' }, { a: ['city centre'], limit: 1, given: 'city centre' }, { a: ['city centre'], limit: 2, given: 'City  centre!' }, { a: ['1,500'], limit: 1, given: '1500' }, { a: ['library'], limit: 2, given: '   ' }, { a: ["don't"], limit: 1, given: 'don’t' }, { a: ['library', 'books'], limit: 1, given: 'books' }];
  out.qe = { _doc: 'QE (web/js/qengine.js): norm lower-cases, ’‘`→\', drops £$€ and thousands commas, punctuation→space, collapses spaces, strips a leading the/a/an; words counts norm-ed tokens with a decimal/time/date number (7.45, 10:30, 1/11) as ONE; gradeGap = empty → {ok:false, empty:true}; over = limit && words(given) > limit; ok = !over && some accepted answer norm-equals. collect() → per question number {ok, given, answer, cue, q, type, kind}: mcq given = letter, answer "B. option"; tfng/ynng exact string; match letter; multi: the k-th number of a "choose 2" group is ok when k < (picked ∩ correct).length; gap: first accepted answer. bandOf = first row of the table with raw ≥ min; overall = mean of bands, .25→.5, .75→1.',
    norm: ['The Library', '  A  big   tree. ', '£1,250.50', 'Don’t! (stop)', 'An apple', '10:30', 'THE'].map(s => ({ input: s, out: Q.norm(s) })),
    words: ['7.45', 'ID card', 'the city centre', '10:30 am', '1/11', '', 'a'].map(s => ({ input: s, out: Q.words(s) })),
    gradeGap: gaps.map(g => ({ input: g, out: Q.gradeGap({ a: g.a }, g.limit, g.given) })),
    band: Object.fromEntries(['listening', 'reading', 'reading-gt'].map(sk => [sk, Array.from({ length: 41 }, (_, r) => Q.bandOf(r, sk))])),
    overall: [[7, 7, 7, 7], [6.5, 6, 6, 6], [6.5, 6.5, 6, 6], [7.5, 7, 7, 7], [5.5, 6, 6.5, 6.5], [8, 7.5, 7.5, 7]].map(b => ({ input: b, out: Q.overall(b) })),
    collect: [] };
  for (const p of parts) for (const kind of ['perfect', 'mixed', 'blank']) {
    const a = answersFor(p, kind), res = Q.collect(p, fakeRoot(a));
    out.qe.collect.push({ id: `${p.id}-${kind}`, why: { perfect: 'every accepted answer typed/picked → all ok', mixed: 'every 3rd question wrong, every 5th gap over the word limit, 1 in 4 gaps in capitals (case-insensitive), "choose 2" with one wrong pick', blank: 'nothing answered: ok=false, empty given' }[kind], input: { part: p.id, answers: a }, out: Object.fromEntries(Object.entries(res).map(([n, r]) => [n, { ok: r.ok, given: r.given, answer: r.answer, kind: r.kind, ...(r.over ? { over: true } : {}) }])) });
  }
  // ---- transcript (listening.js transcriptHtml) ----
  const tH = vm.runInContext(`(function(){ const { esc } = UI; ${slice(rd('web/js/listening.js'), /function transcriptHtml\(p, showEv\) \{/)}\n return transcriptHtml; })()`, L.sb);
  const tp = parts[0];
  out.transcript = { _doc: 'transcriptHtml(p, showEv) rows: pause lines are skipped; {say} = narrator line (italic, no speaker); other lines = speaker name + Lexis tokens (no keywords/mine); with showEv each question\'s cue (the first line whose text includes it; a multi group uses its group cue and number range "n–m") adds ev:[numbers] and the cue is wrapped in <mark> only when the escaped cue is a substring of the TOKENISED html – in practice almost never (marked:false). Tap on a line replays from that line, tap on a .tw word opens the popup.',
    part: tp.id, plain: transcriptRows(tH(tp, false)).slice(0, 12), withEvidence: transcriptRows(tH(tp, true)).filter(r => r.ev).map(r => ({ i: r.i, ev: r.ev, marked: r.marked })), lineCount: transcriptRows(tH(tp, false)).length };
  return out;
}

// ================================================================== Player (listening.js:56) ==================================================================
async function playerVectors() {
  const D = await content(), p0 = D.listening[0], cut = n => ({ ...clone(p0), script: p0.script.slice(0, n) });
  const KV = vm.runInNewContext(`(function(){ const self = {}; ${rd('web/js/listen/kvoice.js')}\n return self.KVoice; })()`, {});
  const out = [], VR = { 'en-GB': ['Daniel', 'Kate'], 'en-US': ['Samantha'] };
  const sc = async (id, why, o) => {
    const part = cut(o.lines || 9), v = KV.voices(part);
    const keys = (o.hq || []).map(i => { const l = part.script[i]; return KV.lineKey(l.say ? v._narrator : v[l.s], l.say || l.t); });
    const P = await page({ voices: VR, audio: keys, settings: o.settings || {}, noSpeech: o.noSpeech });
    if (o.failSrc) o.failSrc.map(i => keys[o.hq.indexOf(i)]).forEach(k => P.ctl.failSrc.add(k)); if (o.notAllowed) P.ctl.notAllowed = true;
    const lg = P.ctl.log; let heard = 0;
    const player = P.sb.App.listening.Player(part, { rate: o.rate ? () => o.rate : undefined, skipNarrator: o.skipNarrator,
      onLine: i => lg.push(['line', i]), onState: s => lg.push(['state', s]), onEnd: () => lg.push(['end']), onSound: () => lg.push(['sound']), onBlocked: o.blocked ? () => lg.push(['blocked']) : undefined });
    for (const op of o.ops) {
      lg.push(['op', ...op]);
      if (op[0] === 'play') { if (op[2] != null) P.ctl.hold(op[2]); player.play(op[1]); }
      else if (op[0] === 'pause') { P.ctl.release(); player.pause(); } else if (op[0] === 'stop') { P.ctl.release(); player.stop(); } else if (op[0] === 'back') { P.ctl.release(); player.back(); } else if (op[0] === 'resume') { P.ctl.hold(op[1]); player.play(); }
      await settle(120);
    }
    out.push({ id, why, input: { part: part.id + ' script[0..' + (o.lines || 9) + ')', lines: part.script.slice(0, o.lines || 9).length, rate: o.rate || null, skipNarrator: !!o.skipNarrator, hqLines: o.hq || [], settings: o.settings || {}, ops: o.ops, voices: o.noSpeech ? null : VR, failedClips: o.failSrc || [], blocked: !!o.notAllowed }, out: { toasts: P.sb._toasts || [], events: lg, preloaded: [...new Set(P.ctl.preload)].filter(k => keys.includes(k)), clipKeys: keys, pos: player.pos, playing: player.playing } });
  };
  await sc('tts-all', 'no clip on the CDN: every speaker line is spoken by the device voice cast for that speaker (per sentence: one utterance each; rate = listenRate 0.95; narrator (say) rate 0.95 voice _narrator); a {pause:s} line waits min(8,s)·1000 ms; after a spoken line wait 280 ms (narrator 600 ms); onLine(i) before each line, onEnd at the end', { ops: [['play']] });
  await sc('hq-mixed', 'clips exist for lines 0 (narrator), 2 and 3: those play <audio> (src = key, playbackRate = clamp(0.6,1.3, rate/0.95) for speakers, 1 for the narrator, preservesPitch) and the NEXT clip line is preloaded; other lines use the device voice', { hq: [0, 2, 3], ops: [['play']] });
  await sc('hq-off-setting', 'settings.hqVoice === false → clips are ignored, everything is spoken by the device voices', { hq: [0, 2], settings: { hqVoice: false }, ops: [['play']] });
  await sc('rate-1.1', 'opts.rate() = 1.1: utterance rate 1.1, clip playbackRate 1.1/0.95; narrator stays 0.95 / 1', { hq: [2], rate: 1.1, ops: [['play']] });
  await sc('skip-narrator', 'skipNarrator:true (exam practice): {say} lines are skipped without a wait; pauses still wait', { skipNarrator: true, ops: [['play']] });
  await sc('pause-resume', 'pause() stops speech and keeps pos on the interrupted line; play() with no argument replays THAT line then continues', { ops: [['play', null, 3], ['pause'], ['play']] });
  await sc('play-from-line', 'play(i) starts at the queue entry whose line index is i (a line index that does not exist → 0)', { ops: [['play', 4], ['pause'], ['play', 99]] });
  await sc('back', 'back() steps to the previous SPOKEN line (skipping pauses and narrator lines going backwards, never below 0); while playing it restarts from there, while stopped it only highlights (onLine)', { ops: [['play', null, 5], ['back'], ['stop'], ['play', 6, 1], ['back']] });
  await sc('clip-error-fallback', 'clip load error before it played: audioFail() (cdnFail++) and that line is spoken by the device voice; after 3 consecutive failures hqOn() is false for the rest of the page', { hq: [2, 3, 4, 5], failSrc: [2, 3, 4], ops: [['play']] });
  await sc('autoplay-blocked', 'play() rejected with NotAllowedError (iOS before the first tap): the Player stops at that line, onState(false), onBlocked → the page shows "Chạm ▶ để nghe"; tapping ▶ plays again from that line', { hq: [2], notAllowed: true, blocked: true, ops: [['play', 2]] });
  await sc('no-audio-support', 'no speechSynthesis and no clips: play() shows the toast "Trình duyệt không hỗ trợ đọc giọng nói …" and nothing starts', { noSpeech: true, ops: [['play']] });
  return out;
}

// ================================================================== #/listening (hub) ==================================================================
const PERSIST = [];   // [route, action, [store:key…]] collected from every flow → persist[]
const note = (route, action, P) => PERSIST.push([route, action, writesOf(P)]);
const SPK = c => [...String(c).matchAll(/<span class="chip">(\S*) ([^<]*)<\/span>/g)].map(m => ({ flag: m[1], name: unesc(m[2]) }));
function hubOut(h) {
  const tabs = [...h.matchAll(/<a class="(?:on)?" href="#\/listening\?t=(\d+)" style="([^"]*)">Test \d+( ✓)?<\/a>/g)].map(m => ({ n: +m[1], done: !!m[3], selected: /background/.test(m[2]) }));
  const card = h.split('<div class="card" style="margin-bottom:1rem">')[1] || '';
  const parts = card.split('<div class="card hover"').slice(1).map(c => ({ id: /href="#\/listen\/(\w+)"/.exec(c)[1], part: +/Part (\d) · /.exec(c)[1], partKey: unesc(/Part \d · ([^<]*)</.exec(c)[1]), best: (m => (m ? +m[1] : null))(/✓ (\d+)\/10/.exec(c)),
    title: strip(/<h3[^>]*>([\s\S]*?)<\/h3>/.exec(c)[1]), sub: strip(/<div class="small muted">([\s\S]*?)<\/div>/.exec(c)[1]), speakers: SPK(/<div class="row" style="margin-top:\.4rem">([\s\S]*?)<\/div>/.exec(c)[1]),
    actions: [...c.matchAll(/<a class="btn sm( primary)?" href="([^"]*)">/g)].map(m => m[2]) }));
  return { empty: h.includes('Đang cập nhật đề.'), tabs, selected: card ? +/<h2 style="margin:0">Test (\d+)<\/h2>/.exec(card)[1] : null, band: (m => (m ? +m[1] : null))(/Band ([\d.]+)<\/span>/.exec(card)), fullTest: (/href="(#\/listen-test\/\d+)"/.exec(card) || [])[1] || null, parts, tips: (h.split('Mẹo làm bài Listening')[1] || '').split('<li>').length - 1 };
}
async function hubVectors() {
  const D = await content(), only1 = D.listening.filter(p => p.test === 1), out = [];
  const run = async (id, why, o) => {
    const P = await page({ ls: o.ls, game: o.game, lang: o.lang, listening: o.data }); await P.routes.listening('', new URLSearchParams(o.query || '')); note('listening', id, P);
    out.push({ id, why, input: { query: o.query || '', localStorage: o.ls || {}, game: o.game || {}, lang: o.lang || 'vi', tests: (o.data || D.listening).map(p => p.id) }, out: { ...hubOut(P.view.innerHTML), persistedTest: lastW(P, 'localStorage', 'vb.listenT') ?? null } });
  };
  await run('default', 'no ?t and nothing remembered → the first test (lowest number); the choice is written to localStorage vb.listenT', {});
  await run('query-t2', '?t=2 selects Test 2 and remembers it', { query: 't=2' });
  await run('unknown-t-remembered', 'unknown ?t → vb.listenT if it names an existing test', { query: 't=9', ls: { 'vb.listenT': '2' } });
  await run('unknown-t-first', 'unknown ?t and no/garbage memory → first test', { query: 't=9', ls: { 'vb.listenT': 'abc' } });
  await run('progress', 'game.listenBest[n] (band) → "Band x" chip on the test card and ✓ on that tab; game.listenDone[partId] (best raw out of 10) → "✓ n/10" chip on the part card', { game: { xp: 0, days: {}, total: {}, listenBest: { 1: 7 }, listenDone: { t1p1: 8, t1p3: 10 } } });
  await run('lang-en', 'UI language ≠ vi: titleVi is not shown before the topic', { lang: 'en', query: 't=1' });
  await run('single-test', 'only one test in the data → no tab row', { data: only1 });
  await run('empty', 'no listening data → the empty card "Đang cập nhật đề." and no test card', { data: [] });
  return out;
}

// ================================================================== #/listen/<part> ==================================================================
function listenInit(h) {
  const m = /Test (\d+) · Part (\d+) · (.*?) · Câu (\d+)–(\d+)<\/div>/.exec(h) || [];
  return { back: { href: /<a href="([^"]*)" class="small listen-back"/.exec(h)[1], label: strip(/listen-back"[^>]*>\s*<span>([\s\S]*?)<\/span>/.exec(h)[1]) }, switchTo: (a => ({ href: a[1], label: strip(a[2]) }))(/<a class="btn sm ghost" href="([^"]*)">([\s\S]*?)<\/a>/.exec(h)),
    head: { test: +m[1], part: +m[2], partName: unesc(m[3]), qFrom: +m[4], qTo: +m[5] }, title: strip(/<h1 style="margin:\.2rem 0">([\s\S]*?)<\/h1>/.exec(h)[1]), context: strip(/<p class="muted" style="margin:0">([\s\S]*?)<\/p>/.exec(h)[1]), speakers: SPK(/<div class="row" style="margin-top:\.4rem">([\s\S]*?)<\/div>\s*<\/div><\/div>/.exec(h)[1]),
    player: { playLabel: strip(/id="lPlay">([\s\S]*?)<\/button>/.exec(h)[1]), examNote: /id="lNote"/.test(h), hasBack: /id="lBack"/.test(h), hasLive: /id="lLive"/.test(h), rates: [...h.matchAll(/<option value="([\d.]+)" ?(selected)?>([^<]*)<\/option>/g)].map(m => ({ v: +m[1], label: unesc(m[3]), selected: !!m[2] })) },
    transcriptHidden: /id="lTransWrap" hidden/.test(h), blurred: /id="lTrans" class="ltr blur"/.test(h), tipsOn: /qtip|QT/.test(h), submit: strip(/id="lSubmit">([\s\S]*?)<\/button>/.exec(h)[1]) };
}
async function listenFlow(id, why, o) {
  const D = await content(), p = D.listening.find(x => x.id === o.part);
  const P = await page({ voices: { 'en-GB': ['Daniel', 'Kate'] }, game: o.game, confirm: o.confirm, dict: { quick: async w => (w === 'membership' ? { word: 'membership', vi: 'tư cách hội viên', found: true } : null) } });
  const qs = o.exam ? 'mode=exam' : '';
  await P.routes.listen(p.id, new URLSearchParams(qs)); const init = listenInit(P.view.innerHTML), $ = P.$;
  const res = { id, why, input: { part: p.id, mode: o.exam ? 'exam' : 'practice', answers: o.answers, held: !!o.hold, confirmAnswer: o.confirm ? o.confirm() : true }, out: { initial: init } };
  if (o.hold) P.ctl.hold(o.hold);
  $('#lPlay').onclick(); await settle(o.hold ? 20 : 700);
  res.out.afterPlay = { playLabel: $('#lPlay').textContent, playDisabled: !!$('#lPlay').disabled, now: $('#lNow').textContent, spoken: P.ctl.log.filter(x => x[0] === 'speak').length };
  if (o.exam && !o.hold) { const n = P.ctl.log.filter(x => x[0] === 'speak').length; $('#lPlay').onclick(); await settle(10); res.out.secondTapIgnored = P.ctl.log.filter(x => x[0] === 'speak').length === n; }
  const a = o.answers === 'none' ? {} : answersFor(p, o.answers); res.input.answerMap = a;
  const orig = P.sb.QE.mark; let hearCb = null; P.sb.QE.mark = (root, r, lab, cb) => { hearCb = cb; res.out.evidenceLabel = lab; return orig(root, r, lab, cb); };
  const q = qCtx(P, p, a); const before = P.writes.length;
  const vb = (p.vocab || []).slice(0, 2).map((v, k) => el(P, '[data-v]', { dataset: { v: String(k) }, textContent: '', disabled: false })); P.E.dom.resolveList('[data-v]', () => vb);
  await $('#lSubmit').onclick(); await settle(20);
  if (P.writes.length === before) { res.out.submitted = false; res.out.writes = []; note('listen', id, P); return res; }
  const rh = $('#lRes').innerHTML;
  const fb = /class="feedback (ok|no)"/.exec(rh);
  res.out.submitted = true;
  res.out.result = { cls: fb[1], right: +/<b>(\d+)\/\d+ câu đúng<\/b>/.exec(rh)[1], total: +/<b>\d+\/(\d+) câu đúng<\/b>/.exec(rh)[1], xp: +/\+(\d+) XP/.exec(rh)[1], advice: strip(/<div class="small">([\s\S]*?)<\/div>/.exec(rh)[1]), links: [...rh.matchAll(/href="([^"]*)"/g)].map(m => m[1]), againButton: /id="lAgain"/.test(rh),
    vocab: [...rh.matchAll(/<b>([^<]*)<\/b> <span class="muted small">([^<]*)<\/span><\/span><button class="btn sm ghost" data-v="(\d+)">([^<]*)<\/button>/g)].map(m => ({ w: unesc(m[1]), vi: unesc(m[2]), button: unesc(m[4]) })) };
  res.out.after = { transHidden: !!$('#lTransWrap').hidden, transRows: transcriptRows($('#lTrans').innerHTML).filter(r => r.ev).map(r => ({ i: r.i, ev: r.ev })), ...(o.exam ? {} : { liveChecked: !!$('#lLive').checked, liveDisabled: !!$('#lLive').disabled }), playLabel: $('#lPlay').textContent, playDisabled: !!$('#lPlay').disabled, note: o.exam ? $('#lNote').textContent : undefined };
  res.out.rewards = clone(P.calls.rewards); res.out.game = { listenDone: lastW(P, 'game', 'listenDone'), qstat: lastW(P, 'game', 'qstat') }; res.out.mistakes = await mistakeRows(P);
  res.out.sfx = P.sb._sfx || [];
  // "Nghe đoạn có đáp án": the first two wrong questions → which line playback starts at
  const wrongNs = qNums(p).filter(n => { const r = P.sb.QE.collect(p, fakeRoot(a))[n]; return r && !r.ok && r.cue; }).slice(0, 2);
  res.out.hear = [];
  for (const n of wrongNs) { P.ctl.log.length = 0; P.ctl.hold(1); hearCb(n); await settle(10); const f = P.ctl.log.find(x => x[0] === 'speak' || x[0] === 'audio'); const cue = p.groups.flatMap(g => g.items || []).find(it => it.n === n).cue; const li = p.script.findIndex(l => l.t && l.t.includes(cue)); res.out.hear.push({ n, cue, cueLine: li, startsAt: f ? p.script.findIndex(l => l.t && f[1] && l.t.startsWith(f[1])) : null }); }
  // vocab save buttons: Dict.quick (miss → {word, vi, found}), translate the line that contains the word, App.addWord(…, {text: line, vi, title: "🎧 <part title>"}) (no line → context null)
  res.out.vocabSave = [];
  for (const [k, b] of vb.entries()) { P.calls.dict.length = 0; P.calls.addWord.length = 0; await b.onclick(); await settle(5); res.out.vocabSave.push({ vocab: p.vocab[k], dictCalls: clone(P.calls.dict), addWord: clone(P.calls.addWord), buttonLabel: b.textContent, disabled: b.disabled }); }
  note('listen', id, P); return res;
}
async function listenVectors() {
  const D = await content(), out = { render: [], flows: [], popup: [] };
  for (const [id, mode] of [['t1p1', ''], ['t1p1', 'mode=exam'], ['t2p3', ''], ['t2p4', 'mode=exam']]) {
    const P = await page({}); await P.routes.listen(id, new URLSearchParams(mode)); out.render.push({ id: `render-${id}${mode ? '-exam' : ''}`, why: mode ? 'exam mode: one listen, no rewind, transcript card hidden, no speed/back/live controls, note line shown, "Chế độ luyện tập" switch' : 'practice mode: player with Câu trước + speed (0.8/0.9/Chuẩn 0.95/1/1.1, from settings.listenRate) + live-transcript switch (off → transcript blurred), tips boxes on, "Chế độ thi thật" switch', input: { part: id, mode: mode || 'practice' }, out: listenInit(P.view.innerHTML) }); note('listen', 'render', P);
  }
  { const P = await page({}); await P.routes.listen('zzz', new URLSearchParams('')); out.render.push({ id: 'unknown-part', why: 'unknown part id → the hub (routes.listening())', input: { part: 'zzz' }, out: { fallback: 'listening', hub: hubOut(P.view.innerHTML).selected } }); }
  out.flows.push(await listenFlow('practice-perfect', 'practice, every answer right: ✓ feedback, advice "Xuất sắc" (≥9), xp = 15 + 3·right, game.listenDone[part] = max(right, old), reward {quizzes:1, listens:1, perfect, xp}, transcript revealed with evidence line numbers, qstat per question kind', { part: 't1p1', answers: 'perfect' }));
  out.flows.push(await listenFlow('practice-mixed', 'practice, every 3rd question wrong + over-limit gaps: right/total, advice by right≥9 / ≥7 / else, wrong questions logged to Store mistakes (kind listening, ref part id, explain = "Nghe: …cue…")', { part: 't1p2', answers: 'mixed' }));
  out.flows.push(await listenFlow('practice-blank', 'practice, nothing answered: right 0, advice "Mở lời thoại…", every question logged with given "(bỏ trống)"', { part: 't2p3', answers: 'none' }));
  out.flows.push(await listenFlow('exam-mixed', 'exam mode: playing is one-shot (second tap ignored, button "Đã nghe xong", note changes after the clip), after submit the transcript and re-listen unlock', { part: 't1p4', answers: 'mixed', exam: true }));
  out.flows.push(await listenFlow('exam-submit-while-playing', 'exam, audio still playing and the learner declines the confirm → nothing is graded/written; (the confirm text is t("Bài nghe chưa phát xong. Vẫn nộp bài?"))', { part: 't1p1', answers: 'perfect', exam: true, hold: 2, confirm: () => false }));
  // ---- word popup in the transcript (bindWordPop) ----
  const popFlow = async (id, why, o) => {
    const P = await page({ cards: o.cards, learnLang: o.learnLang, dict: o.dict, voices: {} }); await P.routes.listen('t1p1', new URLSearchParams(''));
    const created = []; const ce = P.sb.document.createElement; P.sb.document.createElement = () => { const e = ce(); created.push(e); return e; };
    const trans = P.$('#lTrans'); const handlers = trans._ls.click, sentence = o.sentence || "Oh, hello. I'd like to sign up for a membership, if that's possible over the phone.";
    const tw = { dataset: { w: o.word }, closest: s => (s === '.tw' ? tw : s === '.sent' ? { textContent: '  ' + sentence + '\n ' } : null), getBoundingClientRect: () => ({ left: 100, bottom: 150 }) };
    await handlers[handlers.length - 1]({ target: tw, stopPropagation() {} }); await settle(10);
    const pop = created.at(-1), h = pop.innerHTML, r = { id, why, input: { word: o.word, sentence, learnLang: o.learnLang || 'vi', inDeck: !!o.cards, dict: o.dict }, out: { dictCalls: clone(P.calls.dict), ctxBox: clone(P.calls.ctx) } };
    if (/data-save/.test(h)) { r.out.popup = { word: strip(/<b style="font-size:1\.15rem">([\s\S]*?)<\/b>/.exec(h)[1]), mean: (m => (m ? strip(m[1]) : null))(/<div class="vi">([\s\S]*?)<\/div>/.exec(h)), saveLabel: strip(/data-save>([\s\S]*?)<\/button>/.exec(h)[1]) };
      const b = el(P, 'b', { textContent: '', disabled: false }); P.calls.dict.length = 0; await P.$('[data-save]', pop).onclick({ currentTarget: b }); await settle(5);
      r.out.save = { dictCalls: clone(P.calls.dict), addWord: clone(P.calls.addWord), buttonLabel: b.textContent, buttonDisabled: b.disabled }; }
    else r.out.popup = { notFound: strip(h) };
    note('listen', 'popup', P); out.popup.push(r);
  };
  const E1 = { word: 'membership', vi: 'tư cách hội viên', def: 'the state of belonging to a group', found: true };
  await popFlow('found-new', 'Dict.quick(word) hit: popup shows word + meaning, button "+ Lưu flashcard"; Save → sentence translated with Dict.translateVi (learnLang vi) → App.addWord(entry, {text: sentence (whitespace-collapsed), vi, title: "🎧 Listening: <part title>"})', { word: 'membership', dict: { quick: E1 } });
  await popFlow('found-in-deck', 'word already a card (state.cards[word]): button reads "+ Thêm ngữ cảnh"', { word: 'membership', cards: { membership: { word: 'membership' } }, dict: { quick: E1 } });
  await popFlow('quick-miss-lookup', 'Dict.quick returns null → Dict.lookup(word, {examples:false, image:false}) is tried next', { word: 'membership', dict: { quick: null, lookup: E1 } });
  await popFlow('not-found', 'both miss / found:false → "Không tìm thấy “word”." and no buttons', { word: 'zzqx', dict: { quick: null, lookup: { found: false } } });
  await popFlow('learn-lang-de', 'learner language ≠ vi: the saved context is translated with Dict.translateTo(sentence, learnLang)', { word: 'membership', learnLang: 'de', dict: { quick: E1 } });
  return out;
}


// ================================================================== #/listen-test/<n> ==================================================================
async function listenTestVectors() {
  const D = await content(), parts = D.listening.filter(p => p.test === 1).sort((a, b) => a.part - b.part), out = { intro: null, flows: [] };
  const VO = { 'en-GB': ['Daniel', 'Kate'], 'en-US': ['Samantha'] };
  { const P = await page({ voices: VO }); P.routes['listen-test'](1); const h = P.view.innerHTML;
    out.intro = { id: 'intro', why: 'full mock test intro: title "IELTS Listening – Test n", rules paragraph, [Bắt đầu thi] → part 0, [Để sau] → #/listening. Unknown/empty test number → the hub.', input: { n: 1 }, out: { title: strip(/<h2>([\s\S]*?)<\/h2>/.exec(h)[1]), buttons: [strip(/id="tGo">([\s\S]*?)<\/button>/.exec(h)[1]), strip(/<a class="btn" href="#\/listening">([\s\S]*?)<\/a>/.exec(h)[1])], parts: parts.map(p => p.id) } };
    const P2 = await page({}); P2.routes['listen-test'](9); out.intro.out.unknownTest = hubOut(P2.view.innerHTML).selected; note('listen-test', 'intro', P); }
  const flow = async (id, why, kind, o = {}) => {
    const P = await page({ voices: VO, ...(o.page || {}) }); P.routes['listen-test'](1); P.$('#tGo').onclick();
    const res = { id, why, input: { test: 1, answers: kind, held: !!o.hold }, out: { parts: [] } };
    for (let k = 0; k < parts.length; k++) {
      const p = parts[k], h = P.view.innerHTML, m = /Test (\d+) · Part (\d)\/4 · Câu (\d+)–(\d+)<\/span>/.exec(h);
      const st = { part: p.id, chip: { test: +m[1], part: +m[2], qFrom: +m[3], qTo: +m[4] }, progressPct: +/<i style="width:([\d.]+)%"/.exec(h)[1], countdown: strip(/id="tCount">([\s\S]*?)<\/b>/.exec(h)[1]), nextLabel: strip(/id="tNext"[^>]*>([\s\S]*?)<\/button>/.exec(h)[1]), nextDisabledInitially: /id="tNext"[^>]*disabled/.test(h), why: strip((/id="tNextWhy">([\s\S]*?)<\/p>/.exec(h) || [])[1] || '') };
      const iv = P.sb._intervals[P.sb._intervals.length - 1]; P.$('#tNext').disabled = true; P.ctl.log.length = 0; if (o.hold && k === 0) P.ctl.hold(o.hold);
      if (k === 0) { st.tickMs = iv.ms; for (let i = 0; i < 29; i++) iv.f(); st.countdownAt29 = P.$('#tCount').textContent; iv.f(); } else { st.skipButton = true; P.$('#tSkip').onclick(); }
      st.afterStart = P.$('#tCount').textContent; await settle(o.hold && k === 0 ? 20 : 900);
      st.firstSpeak = (P.ctl.log.find(x => x[0] === 'speak') || [])[1] || null; st.waits = [...new Set(P.ctl.log.filter(x => x[0] === 'wait').map(x => x[1]))].sort((a, b) => a - b);
      st.whenListened = { count: P.$('#tCount').textContent, nextDisabled: !!P.$('#tNext').disabled, now: P.$('#lNow').textContent };
      if (o.hold && k === 0) { st.stuck = { fallbackMs: P.ctl.longMs, nextDisabledBefore: !!P.$('#tNext').disabled }; P.ctl.long.forEach(f => f()); st.stuck.nextDisabledAfter = !!P.$('#tNext').disabled; P.ctl.release(); }
      const a = kind === 'none' ? {} : answersFor(p, kind); qCtx(P, p, a); st.answers = a;
      P.$('#tNext').onclick(); await settle(k === parts.length - 1 ? 40 : 5); res.out.parts.push(st);
    }
    const h = P.view.innerHTML;
    res.out.result = { band: +/<h2>Band ([\d.]+) · \d+\/\d+ câu đúng<\/h2>/.exec(h)[1], raw: +/<h2>Band [\d.]+ · (\d+)\/\d+ câu đúng<\/h2>/.exec(h)[1], byPart: [...h.matchAll(/<a class="card hover" href="(#\/listen\/\w+)"[^>]*><b>Part (\d)<\/b> · (\d+)\/10/g)].map(m => ({ href: m[1], part: +m[2], right: +m[3] })),
      sheet: [...h.matchAll(/<div class="(ok|no)"><b>(\d+)<\/b> [✓✗] <span>([^<]*)<\/span>(?:<span class="tiny muted">\(bạn: ([^<]*)\)<\/span>)?<\/div>/g)].map(m => ({ q: +m[2], ok: m[1] === 'ok', answer: unesc(m[3]), ...(m[4] !== undefined ? { given: unesc(m[4]) } : {}) })), links: [...h.matchAll(/class="btn( primary)?" href="([^"]*)"/g)].map(m => m[2]).concat([...h.matchAll(/class="btn primary" href="([^"]*)"/g)].map(m => m[1])) };
    res.out.result.links = [...new Set(res.out.result.links)];
    res.out.rewards = clone(P.calls.rewards); res.out.game = { listenBest: lastW(P, 'game', 'listenBest'), listenTests: lastW(P, 'game', 'listenTests'), qstat: lastW(P, 'game', 'qstat') }; res.out.mistakes = (await mistakeRows(P)).length; res.out.firstMistake = (await mistakeRows(P))[0] || null; res.out.celebrate = { sfx: P.sb._sfx || [], confetti: P.sb._conf || [] };
    note('listen-test', id, P); out.flows.push(res);
  };
  await flow('perfect', '4 parts all right: raw 40 → band 9 (QE.bandOf), reward {quizzes:1, listens:4, perfect:1, xp:40+2·raw}, game.listenBest[1] = max(band, old), game.listenTests += {n, raw, band, at} (last 30), band ≥ 7 → win sound + confetti(160); each part: 30 s read time (interval 1000 ms; the 30th tick starts audio, or [Bắt đầu nghe ngay]), audio plays ONCE (Player from line 0), [Sang phần tiếp] stays disabled until the audio ended; answers of a part are collected (QE.collect) when pressing next', 'perfect');
  await flow('mixed', 'some wrong answers: wrong questions logged to Store mistakes with q "Test 1 – Câu n: …" (ref = part id), the answer sheet shows "(bạn: …)" for given answers', 'mixed');
  await flow('blank', 'nothing answered: raw 0, band 0, no band chip celebration, every question logged with given "(bỏ trống)"', 'none');
  await flow('stuck-audio', 'audio frozen after 2 lines (blocked/failed voice): the next button unlocks by itself 20 000 ms after the audio started (web timer; vector shows it disabled before and enabled after)', 'perfect', { hold: 2 });
  return out;
}

// ================================================================== #/dictation/<part> ==================================================================
const DKRE = /<span>[^<]*<\/span>|[^\s<]*<input[^>]*>[^\s<]*/g;
function dictParse(h) {
  if (/Chính xác \d+%<\/h2>/.test(h)) return { done: true, pct: +/Chính xác (\d+)%<\/h2>/.exec(h)[1], count: +/(\d+) câu đã chép/.exec(h)[1], links: [...h.matchAll(/class="btn( primary)?" href="([^"]*)"/g)].map(m => m[2]) };
  const line = (/<div class="dict-line">([\s\S]*?)<\/div>\s*<div id="dFb"/.exec(h) || [])[1];
  return { done: false, title: unesc(/Chép chính tả · (.*?) · [^<]*<\/span>/.exec(h)[1]), speaker: unesc(/Chép chính tả · .*? · ([^<]*)<\/span>/.exec(h)[1]), counter: [+/<span class="small muted">(\d+)\/(\d+)<\/span>/.exec(h)[1], +/<span class="small muted">\d+\/(\d+)<\/span>/.exec(h)[1]], progressPct: +/<i style="width:([\d.]+)%"/.exec(h)[1], mode: /<option value="(\w+)" selected>/.exec(h)[1], textarea: /id="dIn"/.test(h),
    cells: line ? [...line.matchAll(DKRE)].map(m => { const s = m[0], i = /^([^<]*)<input class="dict-h" data-i="(\d+)" size="(\d+)"[^>]*>([^<]*)$/.exec(s); return i ? { pre: unesc(i[1]), hole: +i[2], size: +i[3], post: unesc(i[4]) } : unesc(strip(s)); }) : null };
}
const clean = w => w.toLowerCase().replace(/[^a-z0-9'%]/g, '');
const dtoks = s => s.replace(/[’‘]/g, "'").split(/\s+/).filter(Boolean);
async function dictWalk(partId, mode, strat, o = {}) {
  const D = await content(), p = D.listening.find(x => x.id === partId), lines = p.script.filter(l => l.t && l.t.split(/\s+/).length >= 4);
  const P = await page({ voices: { 'en-GB': ['Daniel', 'Kate'], 'en-AU': ['Karen'] }, settings: o.settings });
  let cur = [], cH = '', cEls = [];
  P.E.dom.resolveList('.dict-h', () => { const h = P.view.innerHTML; if (h !== cH) { cH = h; const pd = dictParse(h); cEls = pd.done ? [] : (pd.cells || []).filter(c => c && c.hole !== undefined).map(c => el(P, '.dict-h', { dataset: { i: String(c.hole) }, value: '', title: '', className: 'dict-h' })); } return cEls; });
  await P.routes.dictation(partId, new URLSearchParams(mode ? 'm=' + mode : ''));
  const walk = [], feedback = [];
  for (let guard = 0; guard < 80; guard++) {
    const h = P.view.innerHTML, pd = dictParse(h); if (pd.done) { walk.push(pd); break; }
    const k = pd.counter[0] - 1, l = lines[k], tw = dtoks(l.t), holes = (pd.cells || []).filter(c => c && c.hole !== undefined);
    cur = P.E.dom.$$('.dict-h');
    walk.push({ k, speaker: pd.speaker, mode: pd.mode, nWords: tw.length, holes: holes.map(c => [c.hole, c.size]), ...(o.keepCells ? { cells: pd.cells } : {}) });
    const act = strat(k, l, tw, holes);
    if (act === 'skip') { cH = ''; P.$('#dNext').onclick(); await settle(3); continue; }
    if (pd.textarea) P.$('#dIn').value = act.full; else cur.forEach((e, j) => { e.value = act.holes[j]; });
    P.$('#dChk').onclick(); await settle(2);
    const fb = P.$('#dFb').innerHTML; const f = { k, typed: pd.textarea ? act.full : act.holes, checkLabel: P.$('#dChk').textContent };
    if (pd.textarea) { f.pct = +/<b>(\d+)% chính xác<\/b>/.exec(fb)[1]; f.cls = /feedback (ok|no)/.exec(fb)[1]; f.diff = [...fb.matchAll(/<span class="dk (ok|extra|miss)">([^<]*)<\/span>/g)].filter((m, i, a) => i < a.length - 3 || true).map(m => [m[1], unesc(m[2])]); f.diff = f.diff.slice(0, f.diff.length - 3); }
    else { const m = /<b>(\d+)\/(\d+) ô đúng<\/b>/.exec(fb); f.right = +m[1]; f.of = +m[2]; f.cls = /feedback (ok|no)/.exec(fb)[1]; f.cells = cur.map(e => [e._cls.has('ok') ? 'ok' : 'no', e.title || '']); }
    feedback.push(f); cH = ''; P.$('#dChk').onclick(); await settle(3);
  }
  const fin = walk[walk.length - 1];
  return { P, walk, feedback, fin, lines, writes: { rewards: clone(P.calls.rewards), dictDone: lastW(P, 'game', 'dictDone'), settings: P.writes.filter(w => w.store === 'settings').length } };
}
async function dictationVectors() {
  const D = await content(), out = { render: [], walks: [], diff: [], session: [], say: [], settings: [] };
  const part = 't1p1';
  const perfect = (k, l, tw, holes) => ({ holes: holes.map(c => tw[c.hole].replace(/^[^A-Za-z0-9]*|[^A-Za-z0-9%']*$/g, '')), full: l.t });
  for (const mode of ['mid', 'hard', 'full']) {
    const w = await dictWalk(part, mode, perfect);
    out.walks.push({ id: `walk-${mode}`, why: { mid: 'Điền từ (trung bình): holes(words, 0.35) – content words (not in STOPW) first, spread evenly (step = pool/need), need = max(1, round(words·ratio)); a hole keeps its leading/trailing punctuation outside the input; input size = max(3, word length)', hard: 'Điền từ (khó): ratio 0.65', full: 'Chép cả câu: one textarea, no holes' }[mode], input: { part, mode, lines: 'script lines with ≥4 whitespace-separated words, in order', typed: 'the correct word in every hole / the whole line' }, out: { lines: w.walk.filter(x => !x.done).map(x => ({ k: x.k, speaker: x.speaker, nWords: x.nWords, holes: x.holes })), count: w.walk.filter(x => !x.done).length, final: w.fin, firstFeedback: w.feedback[0], rewards: w.writes.rewards, dictDone: w.writes.dictDone } });
    note('dictation', 'walk-' + mode, w.P);
  }
  // first line, all three modes with the cells (words + holes) so the layout is a vector
  for (const mode of ['mid', 'hard']) { const w = await dictWalk(part, mode, () => 'skip', { keepCells: true }); out.render.push({ id: `cells-${mode}`, why: 'first two lines: the cells the page draws (plain word | hole{pre,size,post}); hole index = word index in the whitespace-split line (curly quotes normalised to \')', input: { part, mode }, out: { cells: w.walk.filter(x => !x.done).slice(0, 2).map(x => ({ k: x.k, speaker: x.speaker, cells: x.cells })), count: w.walk.filter(x => !x.done).length, skippedAll: w.fin } }); }
  // ---- diff / grading in full-sentence mode ----
  const lines = D.listening.find(x => x.id === part).script.filter(l => l.t && l.t.split(/\s+/).length >= 4);
  const variants = [['exact', t => t], ['lowercase-no-punct', t => t.toLowerCase().replace(/[.,!?]/g, '')], ['drop-2nd', t => t.split(' ').filter((_, i) => i !== 1).join(' ')], ['extra-word', t => { const a = t.split(' '); a.splice(3, 0, 'really'); return a.join(' '); }], ['misspelt', t => t.replace(/(\w+)(\W*)$/, (m, a, b) => a.slice(0, -1) + 'x' + b)], ['empty', () => ''], ['reversed', t => t.split(' ').reverse().join(' ')], ['curly-apostrophe', t => t.replace(/'/g, '’')]];
  const typed = variants.map(([n, f], i) => ({ name: n, k: i, target: lines[i].t, typed: f(lines[i].t) }));
  const w = await dictWalk(part, 'full', (k, l) => (typed[k] ? { full: typed[k].typed } : 'skip'));
  out.diff = w.feedback.map(f => ({ id: typed[f.k].name, why: 'full-sentence check: tokens of target/typed are split on whitespace (’‘→\'), compared case-insensitively after removing everything but [a-z0-9\'%]; LCS (longest common subsequence) over the cleaned tokens → ok (in LCS) / extra (typed word not matched) / miss (target word not matched), emitted target-order; pct = LCS length / number of non-empty target tokens (0 when the target has none); feedback ok class when pct ≥ 0.9; the "done" counter +1 per check, score += pct', input: { target: typed[f.k].target, typed: typed[f.k].typed }, out: { pct: f.pct, cls: f.cls, diff: f.diff } }));
  out.session.push({ id: 'diff-session', why: 'after the 8 typed lines the rest are skipped with [Câu sau] (not counted): finish page shows round(score/done·100) where score = Σ pct', input: { part, mode: 'full', checked: 8 }, out: { fin: w.fin, rewards: w.writes.rewards, dictDone: w.writes.dictDone } }); note('dictation', 'diff-session', w.P);
  { const alt = await dictWalk(part, 'mid', (k, l, tw, holes) => (k % 2 ? { holes: holes.map(() => 'x'), full: '' } : perfect(k, l, tw, holes)));
    out.session.push({ id: 'mid-alternating', why: 'mid mode, even lines right, odd lines wrong: pct per line = right/holes (1 when a line has no holes); finish = round(Σ/done); reward {quizzes:1, dictations:1, xp:10+round(pct/5)}; game.dictDone[part] = max(pct, old); next-mode link (mid→hard, else→full)', input: { part, mode: 'mid' }, out: { fin: alt.fin, rewards: alt.writes.rewards, dictDone: alt.writes.dictDone, firstWrong: alt.feedback[1] } }); note('dictation', 'mid-alternating', alt.P);
    const sk = await dictWalk(part, 'hard', (k, l, tw, holes) => (k % 3 ? 'skip' : perfect(k, l, tw, holes)));
    out.session.push({ id: 'hard-skipping', why: 'skipped lines (Câu sau without Kiểm tra) are not counted: finish counts only checked lines', input: { part, mode: 'hard' }, out: { fin: sk.fin, rewards: sk.writes.rewards, dictDone: sk.writes.dictDone } }); note('dictation', 'hard-skipping', sk.P); }
  // ---- settings + audio ----
  { const P = await page({ voices: { 'en-GB': ['Daniel', 'Kate'] } }); await P.routes.dictation(part, new URLSearchParams('')); const m0 = dictParse(P.view.innerHTML).mode;
    await P.$('#dMode').onchange({ target: { value: 'hard' } }); await settle(2); const m1 = dictParse(P.view.innerHTML);
    P.ctl.log.length = 0; await P.$('#dAuto').onchange({ target: { checked: true } }); await settle(5); P.sb.setTimeout = () => 0; P.sb.speechSynthesis.cancel(); // the 1800 ms auto-replay timer would loop forever in the instant-timer stub
    out.settings.push({ id: 'mode-and-auto', why: 'mode select → state.settings.dictMode saved (+ redraw of the same line in the new mode); "Tự động phát lại câu" → settings.dictAuto saved and the line is spoken at once; query ?m= beats the setting; default mid', input: { start: 'default', mode: 'hard', auto: true }, out: { startMode: m0, afterModeChange: m1.mode, settingsSaved: P.writes.filter(w => w.store === 'settings').map(w => ({ [w.key]: w.value })), spokeAfterAuto: P.ctl.log.filter(x => x[0] === 'speak').length > 0 } }); note('dictation', 'settings', P); }
  { const P = await page({}); await P.routes.dictation('zzz', new URLSearchParams('')); out.settings.push({ id: 'unknown-part', why: 'unknown part → hub', input: { part: 'zzz' }, out: { fallback: 'listening', hub: hubOut(P.view.innerHTML).selected } }); }
  const KV = vm.runInNewContext(`(function(){ const self = {}; ${rd('web/js/listen/kvoice.js')}\n return self.KVoice; })()`, {}), p0 = D.listening.find(x => x.id === part), kv = KV.voices(p0), l0 = lines[0];
  const key = KV.lineKey(kv[l0.s], l0.t);
  for (const [id, why, aud, slow] of [['say-tts', 'no clip for the line: device voice of that speaker, rate = settings.listenRate (0.95)', [], false], ['say-tts-slow', '🐢 slow: rate 0.7', [], true], ['say-clip', 'clip exists (and hqVoice not false): <audio> src = key, playbackRate 1, preservesPitch', [key], false], ['say-clip-slow', '🐢 slow clip: playbackRate 0.7 (pitch preserved)', [key], true]]) {
    const P = await page({ voices: { 'en-GB': ['Daniel', 'Kate'], 'en-AU': ['Karen'] }, audio: aud }); await P.routes.dictation(part, new URLSearchParams('m=full')); await settle(5); P.ctl.log.length = 0;
    if (slow) await P.$('#dSlow').onclick(); else await P.$('#dPlay').onclick(); await settle(3);
    out.say.push({ id, why, input: { part, line: 0, speaker: l0.s, clipKeys: aud, slow }, out: { events: P.ctl.log.filter(x => x[0] === 'speak' || x[0] === 'audio') } });
  }
  return out;
}

// ================================================================== #/reading ==================================================================
function readingListOut(h) {
  const tabs = [...h.matchAll(/<a class="(?:on)?" href="#\/reading\?lv=(\w+)" style="([^"]*)">([^<]*) <span class="tiny muted">(\d+)<\/span><\/a>/g)].map(m => ({ lv: m[1], label: unesc(m[3]), n: +m[4], selected: /background/.test(m[2]) }));
  const cards = [...h.matchAll(/<a class="card hover topic-card" href="#\/read\/([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map(m => { const c = m[2], sum = /<div class="muted small">([\s\S]*?)<\/div>/.exec(c)[1];
    return { id: m[1], emoji: strip(/<span class="em">([\s\S]*?)<\/span>/.exec(c)[1]), title: strip(/<h3>([\s\S]*?)<\/h3>/.exec(c)[1]), summary: strip(sum), summaryKind: /^<span lang="en">/.test(sum) ? 'en' : /tr-wait/.test(sum) ? 'translate' : 'text', minutes: +/(\d+) phút/.exec(c)[1], questions: +/(\d+) câu hỏi/.exec(c)[1], done: (m2 => (m2 ? m2[1] : null))(/<span class="chip ok">✓ ([^<]*)<\/span>/.exec(c)) }; });
  return { tabs, cards, selected: (tabs.find(t => t.selected) || {}).lv || null };
}
async function readingListVectors() {
  const D = await content(), out = [];
  const run = async (id, why, o) => {
    const P = await page({ ls: o.ls, game: o.game, learnLang: o.learnLang, readings: o.data }); await P.routes.reading('', new URLSearchParams(o.query || '')); note('reading', id, P);
    out.push({ id, why, input: { query: o.query || '', localStorage: o.ls || {}, game: o.game || {}, learnLang: o.learnLang || 'vi', readings: (o.data || D.readings).map(r => r.id) }, out: { ...readingListOut(P.view.innerHTML), persistedLevel: lastW(P, 'localStorage', 'vb.readLv') ?? null } });
  };
  await run('default', 'no ?lv and nothing remembered → "all"; tabs = Tất cả + each distinct level of the data (sorted) with counts; the choice is written to localStorage vb.readLv; minutes = max(2, round(words/140))', {});
  await run('lv-b1', '?lv=B1 filters (data order kept)', { query: 'lv=B1' });
  await run('lv-unknown', 'unknown level → all', { query: 'lv=C2' });
  await run('lv-remembered', 'no ?lv: the remembered level is used when it exists in the data', { ls: { 'vb.readLv': 'B2' } });
  await run('done-chips', 'game.readDone[id] = "score/n" → green "✓ score/n" chip', { game: { xp: 0, days: {}, total: {}, readDone: { [D.readings[0].id]: '4/5', [D.readings[2].id]: '5/5' } } });
  await run('learn-lang-en', 'learner language en: the summary shows summaryEn (lang="en"); other non-vi languages get the Vietnamese text flagged for on-demand translation (tr-wait)', { learnLang: 'en' });
  await run('learn-lang-de', 'learner language de: summaryKind translate (Vietnamese source + data-en fallback)', { learnLang: 'de' });
  await run('single-level', 'one level in the data → no tab row', { data: D.readings.filter(r => r.level === 'B1') });
  await run('empty', 'no readings → no cards', { data: [] });
  return out;
}

// ================================================================== #/read/<id> ==================================================================
function wireReader(P, r, o = {}) {
  let cacheHtml = '', cache = null; const items = r.questions.map((q, i) => { const btns = (q.type === 'tfng' ? ['TRUE', 'FALSE', 'NOT GIVEN'] : q.options).map((x, k) => el(P, 'button', { dataset: { v: q.type === 'tfng' ? x : String(k) } })), ex = el(P, '[data-explain]', { hidden: true, innerHTML: '' }), it = el(P, '.q-item', { dataset: { q: String(i) } }); it._lists = { '.opts button': btns }; it._q = s => (s === '[data-explain]' ? ex : null); return { it, btns, ex }; });
  const parse = () => { const h = P.view.innerHTML; if (h === cacheHtml && cache) return cache; cacheHtml = h; const pass = (h.split('id="passage">')[1] || '').split('</div>')[0], sents = [], tws = [];
    for (const m of pass.matchAll(/<span class="sent">([\s\S]*?)<\/span>(?=<span class="sent">|<\/p>)/g)) { const toks = tokensOf(m[1]), sentEl = el(P, '.sent', { textContent: plainOf(toks) }); sents.push(sentEl);
      for (const t of toks) if (Array.isArray(t)) { const tw = el(P, '.tw', { dataset: { w: t[1], ...(t[3] ? { ph: t[3] } : {}) }, classes: ['tw', ...t[2].split(' ').filter(Boolean)] }); tw.closest = s => (s === '.tw' ? tw : s === '.sent' ? sentEl : null); tws.push(tw); } }
    const chips = [...h.matchAll(/<button class="hl-chip (\w+) ?(on)?" data-hl="(\w+)">/g)].map(m => el(P, '[data-hl]', { dataset: { hl: m[3] }, classes: m[2] ? ['on'] : [] }));
    return (cache = { sents, tws, chips, passageClasses: (/<div class="passage ([^"]*)" id="passage">/.exec(h) || [])[1] || '' }); };
  const D = P.E.dom, L = (sel, fn) => D.resolveList(sel, fn);
  L('#passage .tw.kw', () => parse().tws.filter(t => t._cls.has('kw'))); L('#passage .tw.awl', () => parse().tws.filter(t => t._cls.has('awl')));
  L('#passage .tw.link, #passage .tw.col', () => parse().tws.filter(t => t._cls.has('link') || t._cls.has('col'))); L('#passage .tw.mine', () => parse().tws.filter(t => t._cls.has('mine')));
  L('#passage .sent', () => parse().sents); L('.tw', () => parse().tws); L('.tw.active', () => parse().tws.filter(t => t._cls.has('active')));
  L('[data-hl]', () => parse().chips); L('[data-hl].on', () => parse().chips.filter(c => c._cls.has('on')));
  let kws = null; L('[data-kw]', () => (kws ||= r.keywords.map(k => el(P, '[data-kw]', { dataset: { kw: k } })))); L('.q-item', () => items.map(x => x.it));
  items.forEach((x, i) => D.resolve(`.q-item[data-q="${i}"]`, () => x.it));
  for (const k of new Set([...r.keywords, ...(o.words || [])])) { D.resolve(`.tw[data-w="${k.toLowerCase()}"]`, () => parse().tws.find(t => t.dataset.w === k.toLowerCase()) || null); L(`.tw[data-w="${k.toLowerCase()}"]`, () => parse().tws.filter(t => t.dataset.w === k.toLowerCase())); }
  const ps = P.$('#passage'); ps._cls = new Set(); ps.classList = { add: c => ps._cls.add(c), remove: c => ps._cls.delete(c), toggle: (c, f) => { const on = f === undefined ? !ps._cls.has(c) : !!f; if (on) ps._cls.add(c); else ps._cls.delete(c); return on; }, contains: c => ps._cls.has(c) };
  return { items, parse };
}
const readInit = (P, r, W) => { const h = P.view.innerHTML, c = W.parse(); return { back: { href: /<a href="([^"]*)" class="small">/.exec(h)[1], label: strip(/<a href="#\/reading" class="small">([\s\S]*?)<\/a>/.exec(h)[1]) }, level: r.level, topic: r.topic, emoji: r.emoji, title: strip(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(h)[1]),
  summaryKind: /<p class="muted"[^>]*><span lang="en">/.test(h) ? 'en' : /tr-wait/.test(h) ? 'translate' : 'text', highlightChips: [...h.matchAll(/<button class="hl-chip (\w+) ?(on)?" data-hl="\w+">/g)].map(m => ({ k: m[1], on: !!m[2] })), passageClasses: c.passageClasses.split(' ').filter(Boolean),
  counts: Object.fromEntries(['kw', 'awl', 'link', 'mine'].map(k => [k, P.$(`[data-count="${k}"]`).textContent])), paragraphs: (h.split('id="passage">')[1] || '').split('</div>')[0].split('</p>').filter(x => x.includes('<p>')).length, sentences: c.sents.length, words: c.tws.length, questions: r.questions.length, keywordChips: r.keywords.length }; };
async function readerVectors() {
  const D = await content(), out = { render: [], popup: [], questions: [], actions: [] }; const R0 = D.readings;
  const base = async (o = {}) => { const P = await page({ cards: o.cards, settings: o.settings, learnLang: o.learnLang, game: o.game, dict: o.dict, confirm: o.confirm, voices: {} }); const r = R0.find(x => x.id === (o.id || R0[0].id)); const W = wireReader(P, r, o); await P.routes.read(r.id); return { P, r, W }; };
  // ---- render ----
  for (const [i, r] of R0.entries()) { const { P, W } = await base({ id: r.id, cards: i === 1 ? { [r.keywords[0].toLowerCase()]: { word: r.keywords[0] } } : undefined }); const init = readInit(P, r, W); const e = { id: `render-${r.id}`, why: i === 0 ? 'reader: passage = Lexis.markText(text, {keywords, mine: inDeck}) → paragraphs (split on blank lines) → sentences (split on . ! ? runs) → tokens (see shared.lexis); highlight chips default "kw awl link mine" (settings.hl) with distinct-word counts (link counts link + col classes, by phrase or word); keyword chips; a "Câu hỏi" card' : i === 1 ? 'a keyword already in the deck gets class mine ("Từ của tôi" count > 0)' : 'another passage', input: { reading: r.id, cards: i === 1 ? [r.keywords[0]] : [] }, out: init };
    if (i === 0) e.out.passage = paras((P.view.innerHTML.split('id="passage">')[1] || '').split('</div>')[0]); out.render.push(e); note('read', 'render', P); }
  { const P = await page({}); await P.routes.read('zzz'); out.render.push({ id: 'unknown-id', why: 'unknown id → the list (routes.reading())', input: { id: 'zzz' }, out: { fallback: 'reading', cards: readingListOut(P.view.innerHTML).cards.length } }); }
  // ---- highlight chips ----
  { const { P, r, W } = await base({}); const chips = P.E.dom.$$('[data-hl]'); const seq = []; W.parse().passageClasses.split(' ').filter(Boolean).forEach(x => P.$('#passage')._cls.add(x));
    for (const k of ['awl', 'kw', 'mine', 'link']) { chips.find(c => c.dataset.hl === k).onclick(); seq.push({ toggled: k, settings: lastW(P, 'settings', 'hl'), passage: [...P.$('#passage')._cls].sort() }); }
    out.actions.push({ id: 'highlight-toggle', why: 'each chip toggles class "on" and hl-<k> on the passage; settings.hl = the chips that are on, space-joined in DOM order (kw awl link mine) and saved (App.saveSettings)', input: { reading: r.id, start: 'kw awl link mine', toggles: ['awl', 'kw', 'mine', 'link'] }, out: { steps: seq } }); note('read', 'highlight-toggle', P); }
  { const { P, r } = await base({ settings: { hl: 'kw' } }); out.render.push({ id: 'settings-hl-kw', why: 'settings.hl = "kw" → only the keyword highlight is on', input: { settingsHl: 'kw' }, out: { passageClasses: readInit(P, r, { parse: () => ({ passageClasses: (/<div class="passage ([^"]*)" id="passage">/.exec(P.view.innerHTML) || [])[1] || '', sents: [], tws: [] }) }).passageClasses } }); }
  // ---- word popup ----
  const popFlow = async (id, why, o) => {
    const { P, r, W } = await base({ cards: o.cards, learnLang: o.learnLang, dict: o.dict, settings: o.settings || { autoSpeak: false }, words: [o.word] }); const created = []; const ce = P.sb.document.createElement; P.sb.document.createElement = () => { const e = ce(); created.push(e); return e; };
    const tw = W.parse().tws.find(t => t.dataset.w === o.word); const click = P.$('#passage')._ls.click[0]; await click({ target: tw }); await settle(10);
    const pop = created.at(-1), h = pop.innerHTML, sentence = tw.closest('.sent').textContent.replace(/\s+/g, ' ').trim(), res = { id, why, input: { reading: r.id, word: o.word, sentence, learnLang: o.learnLang || 'vi', inDeck: !!o.cards, dict: o.dict, autoSpeak: !!P.state.settings.autoSpeak }, out: { dictCalls: clone(P.calls.dict), ctxBox: clone(P.calls.ctx), tokenActive: tw._cls.has('active'), autoSpoke: clone(P.calls.speak) } };
    if (/data-save/.test(h)) { res.out.popup = { word: strip(/font-weight:800">([\s\S]*?)<\/span>/.exec(h)[1]), mean: (m => (m ? strip(m[1]) : null))(/<div class="vi"[^>]*>([\s\S]*?)<\/div>/.exec(h)), def: (m => (m ? strip(m[1]) : null))(/<div class="small" style="margin-top:\.3rem">([\s\S]*?)<\/div>/.exec(h)), saveLabel: strip(/data-save>([\s\S]*?)<\/button>/.exec(h)[1]), detailsHref: /href="(#\/dict\/[^"]*)"/.exec(h)[1] };
      const b = el(P, 'b', { textContent: '', disabled: false }); P.calls.dict.length = 0; await P.$('[data-save]', pop).onclick({ currentTarget: b }); await settle(5);
      res.out.save = { dictCalls: clone(P.calls.dict), addWord: clone(P.calls.addWord), buttonLabel: b.textContent, minedTokens: W.parse().tws.filter(t => t._cls.has('mine') && t.dataset.w === o.word).length > 0, countsAfter: Object.fromEntries(['kw', 'awl', 'link', 'mine'].map(k => [k, P.$(`[data-count="${k}"]`).textContent])) }; }
    else res.out.popup = { notFound: strip(h) };
    note('read', 'popup', P); out.popup.push(res);
  };
  const E1 = { word: 'sustainable', pos: 'adj', level: 'B2', vi: 'bền vững', def: 'able to continue over a long period of time', found: true };
  await popFlow('found-new', 'tap a word: Dict.quick(word) (else Dict.lookup(word,{examples:false,image:false})) → popup: word + pos/level chips + IPA/speaker + meaning (App.meanOf) + English definition when different + the sentence (context box) + [+ Lưu flashcard] + [Chi tiết → #/dict/<word>]; the tapped token gets class active; Save: translate the sentence (translateVi / translateTo(learnLang)) → App.addWord(entry, {text: sentence, vi, title: "Bài đọc: <title>"}) — the title is a KEY, translated at render time (study.js ctxTitle); then every token of that word gets class mine and the counts refresh', { word: 'sustainable', dict: { quick: E1 } });
  await popFlow('found-in-deck', 'word already a card: button "+ Thêm ngữ cảnh"', { word: 'sustainable', cards: { sustainable: { word: 'sustainable' } }, dict: { quick: E1 } });
  await popFlow('auto-speak', 'settings.autoSpeak → the word is spoken as soon as the popup opens (UI.speak(word, accent, audio))', { word: 'sustainable', settings: { autoSpeak: true }, dict: { quick: E1 } });
  await popFlow('quick-miss-lookup', 'Dict.quick null → Dict.lookup(…) is the fallback', { word: 'sustainable', dict: { quick: null, lookup: E1 } });
  await popFlow('not-found', 'no entry: "Không tìm thấy “w”." (+ "Dịch: <b>meaning</b>" when the lookup returned only a translation)', { word: 'sustainable', dict: { quick: null, lookup: { found: false, vi: 'bền vững' } } });
  await popFlow('learn-lang-de', 'learner language ≠ vi → Dict.translateTo(sentence, learnLang)', { word: 'sustainable', learnLang: 'de', dict: { quick: E1 } });
  // ---- keyword chips, save all, listening ----
  { const { P, r } = await base({ cards: { [R0[0].keywords[1].toLowerCase()]: { word: R0[0].keywords[1] } } }); await P.$('#addKw').onclick(); await settle(5);
    out.actions.push({ id: 'save-all-keywords', why: '"+ Lưu tất cả từ khóa": for each keyword not in the deck: entry = IELTS_DATA.INDEX[k] (library word) else {word, topic:"mine", emoji}; context = first sentence containing the keyword token ({text, title:"Bài đọc: <title>"}) or none; App.addWord(entry, context, {silent:true}); then win sound + toast "Đã lưu {n} từ khóa kèm câu ngữ cảnh", button "✓ Đã lưu"', input: { reading: r.id, keywords: r.keywords, alreadyInDeck: [r.keywords[1]] }, out: { saved: P.calls.addWord.map(a => ({ entry: a.entry, ctx: a.ctx, opts: a.opts })), n: P.calls.addWord.length, toasts: P.sb._toasts || [], sfx: P.sb._sfx || [], buttonLabel: P.$('#addKw').textContent } }); note('read', 'save-all-keywords', P); }
  { const { P, r } = await base({}); const kb = P.E.dom.$$('[data-kw]')[0]; P.ctl.log.length = 0; await kb.onclick(); await settle(5);
    out.actions.push({ id: 'keyword-chip', why: 'tapping a keyword chip scrolls to its first token (exact data-w, else a token starting with the first 5 letters) and opens the popup after 350 ms', input: { reading: r.id, keyword: r.keywords[0] }, out: { waits: P.ctl.log.filter(x => x[0] === 'wait'), dictCalls: clone(P.calls.dict) } }); }
  { const { P, r } = await base({}); const sa = P.$('#readAloud'); await sa.onclick(); const opts = P.calls.ttsOpts, sents = P.E.dom.$$('#passage .sent');
    const t0 = clone(P.calls.tts[0]); const seen = []; for (let i = 0; i < 3; i++) { opts.onSentence(i); seen.push(sents.map((s, k) => (s._cls.has('reading') ? k : -1)).filter(k => k >= 0)); } const label1 = sa.textContent; opts.onEnd(); const label2 = sa.textContent;
    out.actions.push({ id: 'read-aloud', why: '"Nghe cả bài": text = all .sent texts joined by a space, spoken sentence by sentence (UI.splitSentences); idx[i] = which displayed .sent the i-th spoken sentence belongs to → that .sent gets class "reading" (scrolled into view); second tap stops; onEnd resets the button; double-tap on a sentence speaks only that sentence', input: { reading: r.id }, out: { accent: t0.accent, textStartsWith: t0.text.slice(0, 80), textLength: t0.text.length, sentences: sents.length, highlight: seen, labelWhilePlaying: label1, labelAfter: label2 } }); note('read', 'read-aloud', P); }
  // ---- questions ----
  const qFlow = async (id, why, o) => {
    const { P, r, W } = await base({ id: o.id, game: o.game, confirm: o.confirm }); const picks = o.picks(r); const before = P.writes.length;
    picks.forEach((v, i) => { if (v != null) { const b = W.items[i].btns.find(x => x.dataset.v === String(v)); b.onclick(); } });
    await P.$('#check').onclick(); await settle(15);
    const res = { id, why, input: { reading: r.id, picks, confirmAnswer: o.confirm ? o.confirm() : true, alreadyDone: (o.game && o.game.readDone) || {} }, out: { graded: P.writes.length > before } };
    if (res.out.graded) { const h = P.$('#qResult').innerHTML; res.out.result = { score: +/Kết quả: (\d+)\//.exec(h)[1] || 0, n: r.questions.length, pct: +/\((\d+)%\)/.exec(h)[1], cls: /feedback (ok|no)/.exec(h)[1], xp: +/\+(\d+) XP/.exec(h)[1], links: [...h.matchAll(/href="([^"]*)"/g)].map(m => m[1]) };
      res.out.items = W.items.map((x, i) => ({ chosen: picks[i] ?? null, classes: x.btns.map(b => [...b._cls].filter(c => c === 'right' || c === 'wrong' || c === 'sel').sort().join('+')), explain: strip(x.ex.innerHTML), explainHidden: !!x.ex.hidden, locked: !!x.it.dataset.locked }));
      res.out.rewards = clone(P.calls.rewards); res.out.game = { readDone: lastW(P, 'game', 'readDone') }; res.out.mistakes = await mistakeRows(P); res.out.checkDisabled = !!P.$('#check').disabled; }
    note('read', id, P); out.questions.push(res);
  };
  const ans = r => r.questions.map(q => (q.type === 'tfng' ? q.answer : +q.answer)), wrong = (r, i) => r.questions.map((q, j) => { const a = ans(r)[j]; return j % 2 === i ? (q.type === 'tfng' ? (a === 'TRUE' ? 'FALSE' : 'TRUE') : (a + 1) % q.options.length) : a; });
  await qFlow('perfect', 'all right: score n/n, pct 100, perfect:1, readings:1 (first time), xp = 10 + 4·score, game.readDone[id] = "score/n", every option row marked right (green) and the explanation shown (✅ prefix is an icon on right answers, ❌ on wrong), no mistakes, button disabled', { picks: ans });
  await qFlow('partial', 'two wrong answers: wrong picks get class wrong, the right option right; mistakes logged (kind reading, q "Title: question", answer/given = the option TEXT for mcq, TRUE/FALSE strings for tfng, explain = the question explanation key, ref = reading id)', { picks: r => wrong(r, 0) });
  await qFlow('blank', 'nothing answered, confirm accepted: all wrong, given "(bỏ trống)"; the confirm text is t("Bạn chưa trả lời hết. Vẫn chấm điểm?")', { picks: r => r.questions.map(() => null) });
  await qFlow('blank-declined', 'confirm declined → nothing is graded and nothing is written', { picks: r => r.questions.map(() => null), confirm: () => false });
  await qFlow('repeat', 'second attempt of a reading already in readDone: reward.readings = 0 (only the first completion counts), readDone overwritten with the new score', { picks: ans, game: { xp: 0, days: {}, total: {}, readDone: { [R0[0].id]: '3/5' } } });
  return out;
}


// ================================================================== assemble ==================================================================
export { hubVectors, listenVectors, playerVectors, sharedVectors, listenTestVectors, dictationVectors, readingListVectors, readerVectors };
export async function skillsVectors() {
  process.env.TZ = 'UTC'; PERSIST.length = 0;
  const D = await content();
  const out = { _doc: 'GENERATED by scripts/native/gen-skills.mjs – see docs/specs/native-m4-vectors.md. Top level = web route (listening, listen, listen-test, dictation, reading, read) + shared + persist + data. Each case: id, why, input, out. Texts inside out are the Vietnamese i18n KEYS as the web passes them to t() (map them via native/shared/strings.json skill.* ids).', now: NOW };
  out.listening = await hubVectors();
  out.listen = await listenVectors(); out.listen.player = await playerVectors();
  out['listen-test'] = await listenTestVectors();
  out.dictation = await dictationVectors();
  out.reading = await readingListVectors();
  out.read = await readerVectors();
  out.shared = await sharedVectors();
  const per = {}; for (const [route, action, w] of PERSIST) { (per[route] ||= {}); per[route][action] = w; }
  const all = {}; for (const [route, , w] of PERSIST) for (const k of w) ((all[route] ||= new Set()).add(k));
  out.persist = { _doc: 'What each screen WRITES, observed from the flows above (store:key). store = IndexedDB/Store key ("store:mistakes", logMistake), game = Game.mutate field (state.game.*, synced via sync.json), settings = App.saveSettings (state.settings, synced), localStorage = per-device only. Card writes go through App.addWord (see vocab.json wordbook). XP/quests go through App.reward (rewards in each flow).', byRoute: Object.fromEntries(Object.entries(all).map(([k, v]) => [k, [...v].sort()])), byAction: per };
  out.data = { _doc: 'REAL records cut down so the ports run every P06 screen with no web files and no JavaScriptCore: listening = tests 1-2 (8 parts, MCQ options ALREADY rotated by listening.js – ship as is, ignore the _rot flag, grading is by index); readings = first 1/2/2/1 of A2/B1/B2/C1 in load order; lexis = the tokeniser tables (AWL stems, linking words, phrase list sorted longest-first) built by the real lexis.js from the word library. The full content is fetched like the web does (see sources).',
    sources: { listening: 'web/js/listen/test1..9.js + web/cpack/listen/test10.js → self.LISTENING (10 tests × 4 parts, 40 parts) – JS data files, parse into the same JSON shape as data.listening; TOEIC parts (id tl*, #/toeic) come from web/js/toeic/listening1..2.js (P07)', readings: 'web/js/readings.js + web/cpack/readings/more.js → self.READINGS (' + D.readingsAll.length + ' passages)', lexis: 'web/js/lexis.js builds the tables from IELTS_DATA.TOPICS (group awl → AWL; topics linking/opinion → link words/phrases; collocations/idioms/phrasal → col phrases)', clips: 'https://audio.lexkite.com/audio/l/<KVoice.lineKey>.mp3 (+ fallbacks, shared.audioUrl); key set = web/js/listen/audio-index.js (LISTEN_AUDIO)', explain: 'translated answer explanations: GET /i18n/explain/<lang>.json keyed by FNV-1a base36 of the Vietnamese explanation (qengine.js exT); Vietnamese is the source text in the data', mistakes: 'Store mistakes / App.logMistake (plan.js) – vocab.json mistakes' },
    listening: D.listening, readings: D.readings, lexis: D.lexis };
  return rigVectorText(out);
}

// ================================================================== the downloadable pack (web/data/skills-pack.json) ==================================================================
export const PACK_PATH = 'web/data/skills-pack.json', PACK_URL = 'https://lexkite.com/data/skills-pack.json';
/** Constants the ports must not retype: read from the web source text (qengine.js BAND, kvoice.js POOL/NARRATOR, listening.js STOPW), never copied. */
function packConsts() {
  const lit = (src, re, what) => { const m = re.exec(src); if (!m) throw new Error('skills-pack: ' + what + ' not found'); return vm.runInNewContext('(' + m[1] + ')'); };
  const band = lit(rd('web/js/qengine.js'), /const BAND = (\{[\s\S]*?\n  \});/, 'qengine.js BAND');
  const kv = rd('web/js/listen/kvoice.js');
  const pools = lit(kv, /const POOL = (\{[\s\S]*?\n  \});/, 'kvoice.js POOL'), narrator = /const NARRATOR = '([^']+)'/.exec(kv)?.[1];
  const stop = /const STOPW = new Set\('([^']+)'\.split/.exec(rd('web/js/listening.js'));
  if (!narrator || !stop) throw new Error('skills-pack: NARRATOR / STOPW not found');
  const names = lit(rd('web/js/qtips.js'), /const NAME = (\{[\s\S]*?\n  \});/, 'qtips.js NAME');
  return { band, kvoice: { narrator, pools }, stopwords: stop[1].split(' '), names };
}
/** Text of web/data/skills-pack.json: the COMPLETE content in the exact shape of skills.json `data` (listening 10 tests × 4 parts, MCQ options rotated; readings 57; lexis) + consts. v = content hash (cache key). */
export async function skillsPack() {
  const D = await content();
  const body = { listening: clone(D.allListening), readings: clone(D.readingsAll), lexis: clone(D.lexis), consts: packConsts() };
  const v = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 12);
  return JSON.stringify({ _doc: 'GENERATED by scripts/native/gen-skills.mjs (node scripts/native/gen.mjs) from web/js/listen/test1..9.js + web/cpack/listen/test10.js + web/js/readings.js + web/cpack/readings/more.js + lexis/qengine/kvoice/listening.js – do not edit. Native pack for P06: listening/readings/lexis have the shape of vectors/skills.json data.*; consts = band table, Kokoro voice pools, dictation stopwords. Served at ' + PACK_URL + '; cache by v.', schema: 1, v, ...body }) + '\n';
}

export const STARTER_PATH = 'native/shared/gen/content-pack/skills-starter.json';
/** Offline first launch: the first 2 listening tests + the 6 sample readings + lexis + consts, in the shape of the pack (the app bundles it, the pack replaces it). */
export async function skillsStarter() {
  const D = await content();
  const body = { listening: clone(D.listening), readings: clone(D.readings), lexis: clone(D.lexis), consts: packConsts() };
  const v = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 12);
  return JSON.stringify({ _doc: 'GENERATED by scripts/native/gen-skills.mjs (node scripts/native/gen.mjs) – do not edit. Starter subset of ' + PACK_URL + ' (same shape): tests 1-2, 6 readings, lexis, consts; bundled for the first offline launch.', schema: 1, v, ...body }) + '\n';
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const s = await skillsVectors(); console.log(s.length, 'bytes');
}
