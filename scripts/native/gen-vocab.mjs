/* Native M3 – vocabulary-screen conformance vectors (parity P04 review/practice/mistakes/deck, P05 dict/library/topic/letters/verb/phrases/model/models/usage/ideas/paraphrase).
 * Reference = the REAL web code. Nothing is re-implemented: pure modules (core.js SRS/Cards, lex.js, dictionary.js build/normWord, verbs-core.js, usage-core.js) run as they are in node:vm;
 * page scripts (study.js, plan.js, letters.js, ideas.js, paraphrase.js, phrases-model.js and the deck/library/topic/practice parts of app.js, sliced from the source text) run in node:vm
 * against a RECORDING DOM stub (selector registry; no real DOM): the vector keeps the data the page produced (ordered keys, counts, stored records), never the HTML.
 * Determinism: TZ=UTC, fixed clock (now = 2026-01-05T09:00:00Z), Math.random() = 0.5 (so SRS fuzz = 0 and shuffles are the identity-ish web order), floats rounded by rigVectorText.
 * Exports vocabVectors() → text of vectors/vocab.json. Schema + per-screen inventory: docs/specs/native-m2-vectors.md ("M3 vectors"). */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { memStorage } from './fake-idb.mjs';
import { LEX_FILES } from './web-ref.mjs';
import { rigVectorText } from './gen-teach.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = p => path.join(ROOT, p);
const rd = f => fs.readFileSync(R(f), 'utf8');
export const NOW = Date.UTC(2026, 0, 5, 9, 0, 0), DAY = 864e5, MIN = 6e4;
const tick = () => new Promise(r => setImmediate(r));
const settle = async (n = 25) => { for (let i = 0; i < n; i++) await tick(); };
const clone = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));

// ---------- source slicing (brace matching by the file's own 2-space layout; never retyped) ----------
export const slice = (src, re) => { // from the match to the first following line that closes a top-level (2-space indented) block
  const m = re.exec(src); if (!m) throw new Error('gen-vocab: not found ' + re);
  const rest = src.slice(m.index), e = /\n {2}\};?(?=\n)/.exec(rest);
  const first = rest.split('\n')[0];
  if (/^\s*const\b/.test(first) && /;\s*(\/\/.*)?$/.test(first)) return first; // one-line const
  if (!e) throw new Error('gen-vocab: unterminated ' + re);
  return rest.slice(0, e.index + e[0].length);
};
const t = (k, v) => { let s = String(k); if (v) for (const [a, b] of Object.entries(v)) s = s.split('{' + a + '}').join(String(b)); return s; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const unesc = x => (typeof x === 'string' ? x.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'") : x);
const attrs = (html, re) => [...String(html).matchAll(re)].map(m => m[1]);

// ---------- recording DOM stub ----------
function makeDom() {
  const mkEl = sel => {
    const e = { sel, value: '', innerHTML: '', textContent: '', hidden: false, disabled: false, checked: false, dataset: {}, style: { setProperty() {} }, className: '', options: [], _ls: {}, offsetWidth: 0, offsetHeight: 0,
      classList: { add() {}, remove() {}, toggle(c, f) { if (e._tog) e._tog(c, f); }, contains: () => false }, addEventListener(ev, fn) { (e._ls[ev] ||= []).push(fn); },
      setAttribute() {}, getAttribute: () => '', removeAttribute() {}, closest: () => null, querySelector: () => null, querySelectorAll: () => [], focus() {}, blur() {}, select() {}, scrollIntoView() {}, remove() {},
      appendChild() {}, prepend() {}, before() {}, insertAdjacentHTML() {}, matches: () => false, getBoundingClientRect: () => ({ top: 0, bottom: 0 }), click() { if (e.onclick) return e.onclick({ target: e, preventDefault() {}, stopPropagation() {} }); } };
    return e;
  };
  const reg = () => { const m = new Map(); return sel => { if (!m.has(sel)) m.set(sel, mkEl(sel)); return m.get(sel); }; };
  const top = reg(), resolvers = new Map(), listRes = new Map();
  const $ = (sel, root) => (root && root._q ? root._q(sel) : resolvers.has(sel) ? resolvers.get(sel)() : top(sel));
  const $$ = (sel, root) => (root && root._lists && root._lists[sel]) || (listRes.has(sel) ? listRes.get(sel)() : []);
  const view = mkEl('#view');
  return { $, $$, top, mkEl, view, reg, resolve: (sel, fn) => resolvers.set(sel, fn), resolveList: (sel, fn) => listRes.set(sel, fn) };
}

// ---------- sandbox with the real core + word data ----------
let WORDS = null;
function loadWordData() { // IELTS_DATA (TOPICS/INDEX/GROUPS) once per process: the same files and order as App.need('words','tsl')
  if (WORDS) return WORDS;
  const sb = { console, Math, JSON, t }; sb.self = sb; sb.window = sb; sb.globalThis = sb; vm.createContext(sb);
  for (const f of ['web/js/data.js', ...LEX_FILES]) vm.runInContext(rd(f), sb, { filename: f });
  return (WORDS = sb.IELTS_DATA);
}

// ---------- mini library: the same real topics cut down; carried in vocab.json as data.catalog so the ports build their catalog from it (no web files, no skip) ----------
const MINI_KEEP = { topics: 7, core: 2, writing: 2, speaking: 1, toeic: 1 }; // topics kept per group (first N, load order); > 6 'topics' so the "Xem cả n bộ" cut shows
const MINI_WORDS = { topics: 12 }, MINI_WORDS_OTHER = 6;          // words kept per topic (the fixtures use education[0..10], environment[0..2], technology[0])
let MINI = null;
export function miniData() {
  if (MINI) return MINI;
  const sb = { console, Math, JSON, t }; sb.self = sb; sb.window = sb; sb.globalThis = sb; vm.createContext(sb);
  for (const f of ['web/js/data.js', ...LEX_FILES]) vm.runInContext(rd(f), sb, { filename: f });
  const D = sb.IELTS_DATA, n = {}, TOPICS = [];
  for (const tp of D.TOPICS) {
    n[tp.group] = n[tp.group] || 0; if (n[tp.group] >= (MINI_KEEP[tp.group] || 0)) continue; n[tp.group]++;
    TOPICS.push(clone({ id: tp.id, name: tp.name, emoji: tp.emoji, desc: tp.desc, group: tp.group, words: tp.words.slice(0, MINI_WORDS[tp.group] || MINI_WORDS_OTHER) }));
  }
  const GROUPS = D.GROUPS.filter(g => TOPICS.some(x => x.group === g.id)).map(g => clone({ id: g.id, name: g.name, emoji: g.emoji, desc: g.desc }));
  const RANK = vm.runInNewContext('(' + /const RANK = (\{.*?\});/.exec(rd('web/js/data.js'))[1] + ')'), rk = g => (g in RANK ? RANK[g] : 99), INDEX = Object.create(null), rankOf = {};
  for (const tp of TOPICS) { rankOf[tp.id] = rk(tp.group); for (const w of tp.words) { const k = w.word.toLowerCase(), cur = INDEX[k]; if (!cur || rankOf[tp.id] < (rankOf[cur.topic] ?? 99)) INDEX[k] = w; } } // data.js indexTopic
  return (MINI = { TOPICS, INDEX, GROUPS, add() {} });
}

/** A web "install": real core.js + word data + fixed clock; page scripts are loaded on demand with load(file). */
export function mkEnv(o = {}) {
  process.env.TZ = 'UTC';
  const clock = { t: o.now ?? NOW }, ls = memStorage(o.ls || {}), dom = makeDom(), data = o.mini ? miniData() : loadWordData();
  const CD = class extends Date { constructor(...a) { if (a.length) super(...a); else super(clock.t); } static now() { return clock.t; } };
  const rnd = o.random ?? (() => 0.5);
  const M = Object.create(Math); M.random = rnd;
  const soft = new Proxy({}, { get: (_, k) => (k === 'then' ? undefined : () => '') });
  const I18N = new Proxy({ lang: () => o.lang || 'vi', meanLang: () => o.meanLang || 'vi', learnLang: () => o.learnLang || 'vi', flag: l => l, tk: (k, v) => ({ k, v }), tr: (l, k) => k, LANGS: {}, SUPPORTED: ['vi', 'en'] }, { get: (a, k) => (k in a ? a[k] : () => '') });
  const sfx = new Proxy({}, { get: (_, k) => (...a) => { (sb._sfx ||= []).push(k); } });
  const doc = new Proxy({ addEventListener() {}, removeEventListener() {}, createElement: () => dom.mkEl('x'), querySelector: () => null, querySelectorAll: () => [], body: dom.mkEl('body'), head: dom.mkEl('head'), documentElement: dom.mkEl('html'), hidden: false, onkeydown: null }, { get: (a, k) => (k in a ? a[k] : () => null), set: (a, k, v) => { a[k] = v; return true; } });
  const sb = { console, JSON, Promise, Object, Array, Map, Set, Error, RegExp, URL, URLSearchParams, structuredClone, Date: CD, Math: M, parseInt, parseFloat, isNaN, Number, String, Boolean, Symbol, encodeURIComponent, decodeURIComponent,
    localStorage: ls, sessionStorage: memStorage(), navigator: { onLine: true, language: 'vi' }, location: { hash: o.hash || '#/home', hostname: 'lexkite.com', protocol: 'https:', search: '', pathname: '/app/', href: 'https://lexkite.com/app/', origin: 'https://lexkite.com' },
    t, I18N, Sfx: sfx, document: doc, addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, CustomEvent: class { constructor(n, d) { this.type = n; this.detail = d && d.detail; } }, history: { replaceState() {} }, scrollTo() {}, scrollBy() {}, matchMedia: () => ({ matches: false }), requestAnimationFrame: f => f(), requestIdleCallback: f => f(),
    setTimeout: (f, ms) => { if (typeof f === 'function') setImmediate(f); return 0; }, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, confirm: () => true, confetti() {}, fetch: async () => ({ ok: false, status: 404, json: async () => null, text: async () => '' }), AbortSignal: { timeout: () => undefined },  performance: { now: () => 0 }, IELTS_DATA: data, UI: null, App: null, Game: null };
  sb.self = sb; sb.window = sb; sb.globalThis = sb; sb._clock = clock; sb._dom = dom;
  const base = { $: dom.$, $$: dom.$$, esc, shuffle: a => a.slice(), toast: m => { (sb._toasts ||= []).push(m); }, closeModal() {}, modal: () => dom.mkEl('modal'), masteryDots: () => '', pic: () => '', speak() {}, tts() {}, similarity: () => 0, cloze: s => s, clozeAnswer: s => s, highlight: s => s, wordRegex: w => new RegExp('\\b' + String(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\w*', 'i'), xpFloat() {}, ...(o.ui || {}) };
  sb.UI = new Proxy(base, { get: (a, k) => (k in a ? a[k] : () => '') });
  const async0 = new Proxy({}, { get: (_, k) => (k === 'then' ? undefined : async () => null) });
  sb.Dict = async0; sb.AI = async0; sb.Lex = undefined;
  vm.createContext(sb);
  const load = f => vm.runInContext(rd(f), sb, { filename: f });
  load('web/js/core.js');
  const { Core } = sb;
  const run = src => vm.runInContext(src, sb);
  return { sb, clock, ls, dom, Core, data, load, run, I18N, M };
}

/** App stand-in: the members the page scripts read. `real` are slices of web/js/app.js evaluated in the sandbox (the exact source). */
export function mkApp(E, { cards = {}, settings = {}, stats, game } = {}) {
  const { sb, Core } = E, S = Core.SRS;
  const state = { cards, settings: { ...Core.DEFAULT_SETTINGS, ...settings }, stats: stats || { days: {}, newToday: { day: '', n: 0 } }, game: game || { xp: 100, days: {}, total: {} }, user: null };
  const routes = {};
  const app = { state, routes, view: E.dom.view, W: x => x, guard: fn => fn, lazy: () => Promise.resolve(), need: () => Promise.resolve(), reward() {}, bindCommon() {}, backHref: () => '#/home', routeToken: () => 1, routeStale: () => false, live: p => p, enrichLater() {}, updateChrome() {},
    notesHtml: () => '', chipsHtml: () => '', vimg: () => '', imgKey: () => [], masteryDots: () => '', meanOf: x => (x ? x.vi || x.def || '' : ''), allWords: () => sb.IELTS_DATA.TOPICS.flatMap(x => x.words), streak: () => 1, exam: () => 'ielts', parseHash: () => ({ arg: '' }) };
  sb.App = new Proxy(app, { get: (a, k) => (k in a ? a[k] : (...x) => ''), set: (a, k, v) => { a[k] = v; return true; } });
  // exact app.js source for the helpers the vocabulary pages share
  const appSrc = rd('web/js/app.js');
  const sliceMany = [/const ORIGINS = \{/, /function origin\(c\) \{/, /const topicOf = id =>/, /const inDeck = w =>/, /const forgetting = \(\) =>/, /const masteredCount = \(\) =>/, /async function addWord\(entry, context, \{ silent \} = \{\}\) \{/, /function personalCollections\(\) \{/, /function topicCard\(tp, lvf\) \{/].map(re => slice(appSrc, re));
  const prelude = `const { Store, SRS, Cards, Stats, Golden, DEFAULT_SETTINGS, todayKey, endOfToday, DAY } = Core; const { TOPICS, INDEX, GROUPS } = IELTS_DATA; const { $, $$, esc, highlight, toast, modal, closeModal, speak, pic, levelChip, posChip, ring } = UI; const state = App.state; let topIx = null; const enrichLater = App.enrichLater, updateChrome = App.updateChrome, masteryDots = App.masteryDots;\n`;
  const fns = vm.runInContext(`(function(){ ${prelude}${sliceMany.join('\n')}\n return { ORIGINS, origin, topicOf, inDeck, forgetting, masteredCount, addWord, personalCollections, topicCard }; })()`, sb, { filename: 'web/js/app.js#slices' });
  Object.assign(app, fns); app.isPhrase = c => /\s/.test(c.word.trim()) || c.pos === 'phrase' || c.topic === 'phrases'; // web/js/phrases.js:262 (loaded in every app session)
  return { app, state, routes, fns };
}

// ---------- fixtures: real word entries → real Cards.make → hand-set SRS state ----------
const srsOf = (o = {}) => ({ ef: 2.5, interval: 0, reps: 0, lapses: 0, due: NOW, last: null, step: 0, ...o });
export function fixtureDecks(E) {
  const { Core, data } = E, T = id => data.TOPICS.find(x => x.id === id).words;
  const ed = T('education'), en = T('environment'), te = T('technology');
  const mk = (e, srs, extra = {}) => { const c = JSON.parse(JSON.stringify(Core.Cards.make(e))); c.added = NOW - (extra.ageDays ?? 1) * DAY; delete extra.ageDays; c.mod = c.added; c.srs = srs; Object.assign(c, extra); return c; };
  // Deck A (review/practice): every queue state
  const A = [
    mk(ed[0], srsOf({ reps: 3, interval: 6, S: 6, D: 5, last: NOW - 8 * DAY, due: NOW - 2 * DAY }), { ageDays: 30 }),            // 0 overdue 2 days
    mk(ed[1], srsOf({ reps: 1, interval: 1, S: 1.2, D: 6, last: NOW - 1 * DAY, due: NOW - 6 * 36e5 }), { ageDays: 20 }),       // 1 due earlier today
    mk(ed[2], srsOf({ reps: 2, interval: 3, S: 3.5, D: 5.5, last: NOW - 3 * DAY, due: NOW + 6 * 36e5 }), { ageDays: 19 }),     // 2 due later today (still counts: end of day)
    mk(ed[3], srsOf({ reps: 4, interval: 12, S: 12, D: 4, last: NOW - 5 * DAY, due: NOW + 20 * 36e5 }), { ageDays: 18 }),      // 3 due tomorrow 05:00 (not due today)
    mk(ed[4], srsOf({ reps: 0, step: 1, S: 0.6, D: 5, last: NOW - 3 * MIN, due: NOW + 7 * MIN }), { ageDays: 5 }),             // 4 learning step 2 (10 min)
    mk(ed[5], srsOf({ reps: 0, lapses: 2, S: 1.1, D: 8, last: NOW - 2 * DAY, due: NOW + MIN }), { ageDays: 25 }),              // 5 lapsed → relearning
    mk(ed[6], srsOf(), { ageDays: 9 }), mk(ed[7], srsOf(), { ageDays: 8 }), mk(ed[8], srsOf(), { ageDays: 7 }), mk(ed[9], srsOf(), { ageDays: 6 }), // 6..9 new
    mk(ed[10], srsOf(), { ageDays: 10 }),                                                                                      // 10 new, already seen (lk.newSeen)
    mk(en[0], srsOf({ reps: 2, interval: 4, S: 4, D: 5, last: NOW - 2 * DAY, due: NOW + 2 * DAY - 6 * 36e5 }), { ageDays: 12 }), // 11 due in ~1.75 d (day after tomorrow)
    mk(en[1], srsOf({ reps: 5, interval: 20, S: 20, D: 3, last: NOW - 15 * DAY, due: NOW + 5 * DAY }), { ageDays: 40 }),       // 12 due in 5 d
    mk({ ...en[2], vi: '' }, srsOf({ reps: 2, interval: 3, S: 3, D: 5, last: NOW - 4 * DAY, due: NOW - DAY }), { ageDays: 22 }), // 13 due but no meaning (review yes, practice 'due' no)
  ];
  // Deck B (deck / library / phrases / mistakes): sources, origins, mastery levels, own decks, phrases
  const B = [
    mk(ed[0], srsOf({ reps: 6, interval: 40, S: 40, D: 3, last: NOW - 20 * DAY, due: NOW + 20 * DAY }), { topic: 'education', ageDays: 50, contexts: [{ text: 'The curriculum was revised.', source: 'https://www.youtube.com/watch?v=abc', title: 'Video', at: NOW }] }), // mastered, youtube
    mk(ed[1], srsOf({ reps: 3, interval: 8, S: 8, D: 4, last: NOW - 5 * DAY, due: NOW + 3 * DAY }), { topic: 'education', ageDays: 40, contexts: [{ text: 'Seen on a blog.', source: 'https://example.com/post', at: NOW }] }), // web, mastery 2
    mk(ed[2], srsOf({ reps: 1, interval: 2, S: 2, D: 5, last: NOW - 1 * DAY, due: NOW + DAY }), { topic: 'education', ageDays: 30, contexts: [{ text: 'Read it today.', source: '', title: 'Bài đọc: Urban farms', at: NOW }] }), // reading
    mk({ word: 'serendipity', vi: 'sự tình cờ may mắn', ipa: '/ˌserənˈdɪpəti/', pos: 'n', def: 'finding good things by chance', ex: '' }, srsOf({ reps: 0, step: 0, S: 0.4, D: 6, last: NOW - 2 * MIN, due: NOW + MIN }), { topic: 'mine', ageDays: 3 }), // dict, learning
    mk(en[0], srsOf(), { topic: 'environment', ageDays: 2 }),                                                                   // library, new
    mk({ word: 'look forward to', vi: 'mong đợi', pos: 'phrase', def: '', ex: 'I look forward to meeting you.' }, srsOf({ reps: 2, interval: 3, S: 3, D: 5, last: NOW - 3 * DAY, due: NOW }), { topic: 'phrases', ageDays: 4 }), // phrase
    mk({ word: 'abandon', vi: 'từ bỏ', ipa: '/əˈbændən/', pos: 'v', def: 'to leave', ex: '' }, srsOf({ reps: 1, interval: 1, S: 1, D: 9, lapses: 3, last: NOW - 9 * DAY, due: NOW - 8 * DAY }), { topic: 'anki', deck: 'Anki: TOEIC', ageDays: 60 }), // anki deck, forgetting
    mk(te[0], srsOf({ reps: 4, interval: 15, S: 15, D: 4, last: NOW - 12 * DAY, due: NOW + 3 * DAY }), { topic: 'technology', ageDays: 15 }),
  ];
  return { A, B };
}
const keyed = (E, list) => { const m = Object.create(null); for (const c of list) m[E.Core.cardKey(c)] = JSON.parse(JSON.stringify(c)); return m; };
const srsView = s => ({ reps: s.reps, lapses: s.lapses, step: s.step || 0, interval: s.interval, S: s.S ?? null, D: s.D ?? null, due: s.due, last: s.last ?? null });

// ============================================================ #/review (study.js buildQueue / showCard / grade / undo / reviewDone) ============================================================
async function reviewCases(decks) {
  const cases = [], sessions = [];
  const base = (extra = {}) => ({ settings: { dailyNew: 10, sessionCap: 50, ...(extra.settings || {}) }, stats: extra.stats || { days: {}, newToday: { day: '', n: 0 } }, seen: extra.seen || {}, query: extra.query || '', deck: extra.deck || 'A' });
  async function open(inp, script) {
    const E = mkEnv({ hash: '#/review', ls: Object.keys(inp.seen).length ? { 'lk.newSeen': JSON.stringify(inp.seen) } : {} });
    E.sb.Game = { mutate: async fn => { const gs = { xp: 100, days: {}, total: {} }; fn(gs); return gs; } };
    const dk = decks(E)[inp.deck], map = keyed(E, dk);
    await E.Core.Store.set('cards', map);
    const { app, state, routes } = mkApp(E, { cards: await E.Core.Cards.all(), settings: inp.settings, stats: clone(inp.stats) });
    app.currentSession = () => null;
    E.load('web/js/study.js');
    const doc = E.sb.document, key = (k, code) => doc.onkeydown && doc.onkeydown({ key: k, code: code || '', target: { matches: () => false, closest: () => null }, preventDefault() {}, ctrlKey: false, metaKey: false, altKey: false });
    routes.review(undefined, new URLSearchParams(inp.query)); await settle();
    const S = () => { const s = app.currentSession(); return s && { queue: s.queue.slice(), done: s.done, again: s.again, missed: s.missed.slice(), xp: s.xp, g: s.g.slice(), total: s.total }; };
    const html = E.dom.view.innerHTML, st = /rev-done/.test(html) ? (/Hôm nay bạn đã ôn hết/.test(html) ? 'allDone' : 'summary') : /Chưa có flashcard nào/.test(html) ? 'empty' : /study-top/.test(html) ? 'card' : 'redirect';
    return { E, app, state, S, key, st, html };
  }
  const run = async (id, why, inp) => {
    const o = await open(inp); const s = o.S();
    const out = { state: o.st, queue: s ? s.queue : [], total: s ? s.total : 0, hash: o.E.sb.location.hash };
    cases.push({ id, why, input: inp, out });
  };
  await run('queue-default', 'due (sorted by due asc, learning/lapsed cards included while due today) + up to dailyNew new cards spliced at positions 1,4,7,… ; no-meaning card still in review', base());
  await run('queue-cap-5', 'sessionCap truncates AFTER the new cards are spliced in', base({ settings: { sessionCap: 5 } }));
  await run('queue-cap-0', 'sessionCap 0 = unlimited', base({ settings: { sessionCap: 0 } }));
  await run('queue-new-2-introduced-1', 'dailyNew 2 with 1 already introduced today → only 1 new card', base({ settings: { dailyNew: 2 }, stats: { days: {}, newToday: { day: '2026-01-05', n: 1 } } }));
  await run('queue-new-stale-day', 'newToday.day is yesterday → counter ignored (full dailyNew)', base({ settings: { dailyNew: 3 }, stats: { days: {}, newToday: { day: '2026-01-04', n: 3 } } }));
  await run('queue-new-0', 'dailyNew 0 → no new cards', base({ settings: { dailyNew: 0 } }));
  await run('queue-seen-new-last', 'a new card already shown before (lk.newSeen) goes after unseen ones', base({ settings: { dailyNew: 5 }, seen: { [decks(mkEnv())['A'][10].word.toLowerCase()]: NOW - 3600e3 } }));
  await run('queue-ahead-2', '?ahead=2 adds cards due within 2 more days and NO new cards', base({ query: 'ahead=2' }));
  await run('queue-ahead-7', '?ahead=7 (max 7)', base({ query: 'ahead=7' }));
  await run('queue-ahead-99', '?ahead=99 clamps to 7', base({ query: 'ahead=99' }));
  await run('queue-pin', '?w=<word> moves that card to the front (widgets)', base({ query: 'w=' + decks(mkEnv())['A'][3].word }));
  await run('queue-pin-unknown', '?w=unknown word is ignored', base({ query: 'w=zzzzunknown' }));
  await run('empty-deck', 'no cards at all → empty state (links to library + dictionary)', { ...base(), deck: 'none' });
  await run('all-done', 'cards exist but none due and no new left → "reviewDone(nothing)"', { ...base({ settings: { dailyNew: 0 } }), deck: 'future' });
  await run('forgetting-redirect', '?src=forgetting with ≥1 forgetting card → location.hash = #/practice/learn?src=forgetting', base({ query: 'src=forgetting', deck: 'forget' }));
  // ---- grading scripts: keys 1-4 after Space (flip), z = undo ----
  const scripts = [
    ['all-good', 'good ×N: learning cards come back 6 positions later once, then leave', base({ settings: { dailyNew: 2 } }), [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]],
    ['again-requeue', 'again on a review card: lapses, reps→0, requeue at index 3 (a learning card again → 3, hard/good/easy → 6)', base({ settings: { dailyNew: 0 }, query: '' }), [0, 0, 1, 2, 3, 2, 2, 2, 2, 2, 2, 2]],
    ['hard-easy-mix', 'hard on new card = 6 min step, easy graduates new card (2 d)', base({ settings: { dailyNew: 3 } }), [1, 3, 1, 3, 2, 2, 0, 3, 3, 3, 3, 3, 3, 3]],
    ['undo', 'z restores srs, queue, counters, XP and stats of the previous grade (only the LAST grade, once)', base({ settings: { dailyNew: 1 } }), [2, 0, 'undo', 3, 'undo', 'undo', 2]],
  ];
  for (const [id, why, inp, script] of scripts) {
    const o = await open(inp), steps = [];
    for (const g of script) {
      const s0 = o.S(); if (!s0 || !s0.queue.length) break;
      const w = s0.queue[0], c0 = o.state.cards[w], wasNew = c0.srs.reps === 0 && !c0.srs.last;
      if (g === 'undo') { o.key('z'); await settle(); const c1 = o.state.cards[w]; steps.push({ op: 'undo', word: w, ...o.S(), srs: srsView(o.state.cards[o.S().queue[0]].srs), statsDay: o.state.stats.days['2026-01-05'] || 0, newToday: clone(o.state.stats.newToday), xpGame: null }); void c1; continue; }
      o.key(' ', 'Space'); await settle(5); o.key(String(g + 1)); await settle();
      const s1 = o.S();
      steps.push({ op: 'grade', grade: g, word: w, wasNew, ...s1, srs: srsView(o.state.cards[w].srs), statsDay: o.state.stats.days['2026-01-05'] || 0, newToday: clone(o.state.stats.newToday), summary: /rev-done/.test(o.E.dom.view.innerHTML) });
    }
    sessions.push({ id, why, input: inp, script, start: o.S() && undefined, steps });
  }
  return { cases, sessions };
}


// ============================================================ #/mistakes (plan.js: logMistake, migrate, mistakeView, list/tabs/retry/settle) ============================================================
const parseBtns = (html, attr) => attrs(html, new RegExp(attr + '="([^"]*)"', 'g'));
async function mistakeCases() {
  const out = { log: [], view: [], list: [], retry: [] };
  const newPlan = async (seed, hash) => {
    const E = mkEnv({ hash: hash || '#/mistakes' });
    if (seed) await E.Core.Store.set('mistakes', clone(seed));
    const { app, state, routes } = mkApp(E, { cards: Object.create(null) });
    const rewards = []; app.reward = (r, el) => { rewards.push(r); };
    app.inDeck = w => false;
    E.load('web/js/plan.js');
    return { E, app, routes, rewards };
  };
  // ---- logMistake: dedupe key, n++, reopen, newest first, cap 300 ----
  const L = [
    { kind: 'vocab', q: 'Nghĩa của “abandon”?', answer: 'từ bỏ', given: 'ở lại', explain: 'abandon /əˈbændən/ = từ bỏ', ref: 'abandon' },
    { kind: 'grammar', q: { k: 'Điền từ: {sentence}', v: { sentence: 'She ___ to school.' } }, answer: 'goes', given: 'go', explain: '', ref: 'present-simple' },
    { kind: 'vocab', q: 'Nghĩa của “abandon”?', answer: 'từ bỏ', given: 'bỏ qua', explain: 'abandon /əˈbændən/ = từ bỏ', ref: 'abandon' },
    { kind: 'reading', q: 'Urban farms: What is the main idea?', answer: 'B', given: 'C', explain: 'See paragraph 2', ref: 'r1' },
  ];
  { const P = await newPlan(); for (let i = 0; i < L.length; i++) { P.E.clock.t = NOW + i * 1000; await P.app.logMistake(L[i]); }
    out.log.push({ id: 'log-4', why: 'same kind+q twice → one record with n=2, at=latest, fixed=false; object q/given/explain are stored as <field>K = {k,v} AND as translated text; new records go first', input: L, out: await P.E.Core.Store.get('mistakes', []) });
    const P2 = await newPlan([{ kind: 'vocab', q: 'Nghĩa của “abandon”?', key: 'vocab|Nghĩa của “abandon”?', answer: 'từ bỏ', given: '', explain: '', ref: 'abandon', n: 3, at: NOW - DAY, fixed: true }]);
    await P2.app.logMistake(L[0]);
    out.log.push({ id: 'log-reopen-fixed', why: 'a fixed record that is wrong again is reopened (fixed=false, n+1, at=now)', input: { seed: 'one fixed record n=3', add: L[0] }, out: await P2.E.Core.Store.get('mistakes', []) });
    const P3 = await newPlan(); for (let i = 0; i < 305; i++) { P3.E.clock.t = NOW + i; await P3.app.logMistake({ kind: 'vocab', q: 'q' + i, answer: 'a', given: '' }); }
    const l3 = await P3.E.Core.Store.get('mistakes', []); out.log.push({ id: 'log-cap-300', why: 'list is cut to the newest 300', input: { adds: 305 }, out: { length: l3.length, first: l3[0].q, last: l3[299].q } }); }
  // ---- mistakeView (pure) ----
  const V = [
    { kind: 'vocab', q: 'Nghĩa của “abandon”?', qK: { k: 'Nghĩa của “{word}”?', v: { word: 'abandon' } }, answer: 'từ bỏ', given: 'ở lại', explain: 'abandon /əˈbændən/ = từ bỏ', ref: 'abandon' },
    { kind: 'vocab', q: 'Gõ lại từ bạn nghe được', qK: { k: 'Gõ lại từ bạn nghe được', v: undefined }, answer: 'abandon', given: 'abandn', explain: 'abandon /əˈbændən/ = từ bỏ', ref: 'abandon' },
    { kind: 'vocab', q: 'Nghĩa của “abandon”?', qK: { k: 'Nghĩa của “{word}”?', v: { word: 'abandon' } }, answer: 'abandon', given: '', explain: '', ref: 'abandon' },
    { kind: 'vocab', q: 'Từ tiếng Anh nghĩa là “từ bỏ”?', qK: { k: 'Từ tiếng Anh nghĩa là “{vi}”?', v: { vi: 'từ bỏ' } }, answer: 'abandon', given: 'leave', explain: 'abandon /əˈbændən/ = từ bỏ', ref: 'abandon' },
    { kind: 'vocab', q: 'Điền từ: She had to ___ the car.', qK: { k: 'Điền từ: {sentence}', v: { sentence: 'She had to ___ the car.' } }, answer: 'abandon', given: 'leave', explain: 'abandon = từ bỏ', ref: 'abandon' },
    { kind: 'grammar', q: 'She ___ to school every day.', answer: 'goes', given: 'go', explain: 'Ngôi 3 số ít thêm -es', ref: 'present-simple' },
    { kind: 'grammar', q: 'Choose the correct sentence', answer: 'She goes to school every day with her very good friends from the village', given: 'x', explain: '', ref: 'g1' },
    { kind: 'reading', q: 'Urban farms: What is the main idea?', answer: 'Food can be grown in cities.', given: 'Cities are noisy.', explain: 'Food can be grown in cities.', ref: 'r1' },
    { kind: 'listening', q: 'Test 1 – Câu 3: Where is the library?', answer: 'next to the bank', given: '', explain: '', ref: 'l1' },
    { kind: 'vocab', q: 'Nghĩa của “look forward to”?', qK: { k: 'Nghĩa của “{word}”?', v: { word: 'look forward to' } }, answer: 'mong đợi', given: '', explain: 'look forward to = mong đợi', ref: 'look forward to' },
    { kind: 'vocab', q: 'Nghĩa của “abandon”?', qK: { k: 'Nghĩa của “{word}”?', v: { word: 'abandon' } }, answer: 'từ bỏ', given: '', explain: 'từ bỏ', ref: 'abandon' },
    { kind: 'vocab', q: 'q', answer: '', given: '', explain: '', ref: '' },
  ];
  { const P = await newPlan(); for (const x of V) out.view.push({ input: x, out: P.app.mistakeView(x), why: 'App.mistakeView: pronunciation (qSay/qIpa/ansSay/ansIpa = the word to speak / look up, "" = none) and tip (explain minus what is already shown)' }); }
  // ---- list / tabs / retry order ----
  const mk = (kind, q, n, atDays, fixed, ref = '', answer = 'ans', extra = {}) => ({ kind, q, key: kind + '|' + q, answer, given: '', explain: '', ref, n, at: NOW - atDays * DAY, fixed, ...extra });
  const SEED = [mk('vocab', 'Nghĩa của “abandon”?', 1, 1, false, 'abandon', 'từ bỏ', { qK: { k: 'Nghĩa của “{word}”?', v: { word: 'abandon' } } }), mk('grammar', 'She ___ to school.', 3, 2, false, 'present-simple', 'goes'), mk('vocab', 'Điền từ: He ___ it.', 2, 3, false, 'abandon', 'abandons'),
    mk('reading', 'Urban farms: main idea?', 1, 4, false, 'r1', 'A'), mk('listening', 'Test 1 – Câu 3', 5, 5, false, 'l1', 'next to the bank'), mk('vocab', 'old fixed', 9, 6, true, 'x', 'x'), mk('grammar', 'Choose the right one', 3, 7, false, 'g2', 'a long answer with more than four words here')];
  const LEG = [{ kind: 'vocab', q: 'Nghĩa của “abandon”?', key: 'vocab|Nghĩa của “abandon”?', answer: 'từ bỏ', given: 'ở lại', explain: 'Từ tiếng Anh nghĩa là “từ bỏ”?', ref: 'abandon', n: 1, at: NOW, fixed: false }, { kind: 'listening', q: 'Test 3 – Câu 12: Where?', key: 'k', answer: 'a', given: '', explain: '', ref: '', n: 1, at: NOW, fixed: false }];
  const listCase = async (id, why, seed, query, tabs) => {
    const P = await newPlan(seed); P.E.dom.resolveList('#mTabs button', () => { const h = P.E.dom.view.innerHTML; if (!P.__t || P.__h !== h) { P.__h = h; P.__t = parseBtns(h.slice(h.indexOf('id="mTabs"')), 'data-k').map(k => { const b = P.E.dom.mkEl('b'); b.dataset.k = k; return b; }); } return P.__t; });
    await P.routes.mistakes('', new URLSearchParams(query)); await settle();
    const keysOf = () => attrs(P.E.dom.$('#mList').innerHTML, /data-fix="([^"]*)"/g), view = P.E.dom.view.innerHTML;
    const res = { counts: Object.fromEntries([...view.matchAll(/data-k="(\w*)">[^<(]*\((\d+)\)/g)].map(m => [m[1] || 'all', +m[2]])), retryButton: /mistakes\?retry=1/.test(view), listButton: /href="#\/mistakes">/.test(view), forgettingButton: /src=forgetting/.test(view), tabs: {} };
    res.tabs.all = keysOf();
    for (const b of P.E.dom.$$('#mTabs button')) { b.onclick(); res.tabs[b.dataset.k || 'all'] = keysOf(); }
    res.empty = /Không có lỗi sai nào cần xem lại/.test(P.E.dom.$('#mList').innerHTML);
    const stored = await P.E.Core.Store.get('mistakes', []);
    out.list.push({ id, why, input: { seed, query }, out: { ...res, storedAfterOpen: stored.filter((x, i) => JSON.stringify(x) !== JSON.stringify(seed[i])).map(x => ({ key: x.key, qK: x.qK, givenK: x.givenK, explainK: x.explainK })) } });
    return P;
  };
  await listCase('list-default', 'open records only (fixed hidden), newest first as stored; per-kind tab = filter by kind; counts only count open records', SEED, '');
  await listCase('list-retry', '?retry=1 sorts by n DESC (stable) inside the active tab; "Làm lại" button becomes "Xem danh sách"', SEED, 'retry=1');
  await listCase('list-empty', 'no open records → empty message, no retry/forgetting buttons', [SEED[5]], '');
  await listCase('list-migrate', 'legacy records that stored translated text get qK/givenK/explainK recovered from the known templates (written back to the store)', LEG, '');
  // ---- retry flows ----
  const flows = [
    ['typed-right', 'short answer (≤4 words): typed answer equal → fixed=true, +3 XP', [{ key: SEED[0].key, do: 'type', value: 'Từ bỏ ' }]],
    ['typed-wrong', 'typed answer different → n+1, no XP', [{ key: SEED[0].key, do: 'type', value: 'ở lại' }]],
    ['self-ok', 'long answer: reveal then "Mình làm đúng" → fixed, +3 XP', [{ key: SEED[6].key, do: 'ok' }]],
    ['self-no', 'long answer: reveal then "Vẫn sai" → n+1', [{ key: SEED[6].key, do: 'no' }]],
    ['understood', '"Đã hiểu" (works in list and retry mode) → fixed, +2 XP', [{ key: SEED[1].key, do: 'fix' }]],
    ['clear-fixed', '"Dọn lỗi đã sửa" removes every fixed record from the store', [{ key: SEED[0].key, do: 'fix' }, { do: 'clear' }]],
  ];
  for (const [id, why, steps] of flows) {
    const P = await newPlan(SEED); const retry = id !== 'understood' && id !== 'clear-fixed';
    P.E.dom.resolveList('[data-rt]', () => { const h = P.E.dom.$('#mList').innerHTML; if (P.__rh !== h) { P.__rh = h; P.__rb = parseBtns(h, 'data-rt').map(key => { const box = P.E.dom.mkEl('rt'), card = P.E.dom.mkEl('card'); box.dataset.rt = key; box._q = P.E.dom.reg(); card._q = P.E.dom.reg(); box.closest = () => card; box._card = card; return box; }); } return P.__rb; });
    P.E.dom.resolveList('[data-fix]', () => { const h = P.E.dom.$('#mList').innerHTML; if (P.__fh !== h) { P.__fh = h; P.__fb = parseBtns(h, 'data-fix').map(key => { const b = P.E.dom.mkEl('fix'), card = P.E.dom.mkEl('card'); b.dataset.fix = key; b.closest = () => card; return b; }); } return P.__fb; });
    await P.routes.mistakes('', new URLSearchParams(retry ? 'retry=1' : '')); await settle();
    for (const s of steps) {
      if (s.do === 'clear') { P.E.dom.$('#clearFixed').onclick(); await settle(); continue; }
      if (s.do === 'fix') { P.E.dom.$$('[data-fix]').find(b => b.dataset.fix === s.key).onclick(); await settle(); continue; }
      const box = P.E.dom.$$('[data-rt]').find(b => b.dataset.rt === s.key), card = box._card;
      if (s.do === 'type') { box._q('[data-in]').value = s.value; box._q('[data-chk]').onclick(); } else if (s.do === 'ok') card._q('[data-ok]').onclick(); else card._q('[data-no]').onclick();
      await settle();
    }
    out.retry.push({ id, why, input: { seed: 'list-default seed', retry, steps }, out: { stored: (await P.E.Core.Store.get('mistakes', [])).map(x => ({ key: x.key, n: x.n, fixed: x.fixed })), rewards: P.rewards } });
  }
  return out;
}


// ============================================================ #/deck · #/library · #/topic · word-book ops · #/practice sources (app.js + study.js slices) ============================================================
/** Evaluate an exact app.js page function (routes.X / editCard) with the closure names it needs. */
function appFn(E, A, re) {
  const { app } = A, src = slice(rd('web/js/app.js'), re);
  const ctx = { ankiAll: () => ({ cards: Object.values(app.state.cards), name: 'Sổ từ' }), sharedPreview() {}, importData() {}, shareDeck() {}, packDeck() {} };
  const wrapper = `(function (routes, App, ctx, editCard) { const state = App.state, view = App.view; const { Store, SRS, Cards, todayKey, endOfToday } = Core; const { TOPICS, INDEX, GROUPS } = IELTS_DATA; const { $, $$, esc, highlight, toast, modal, closeModal, speak, pic, levelChip, posChip, ring } = UI; const Sfx_ = Sfx;
    const masteryDots = App.masteryDots, bindCommon = App.bindCommon, origin = App.origin, ORIGINS = App.ORIGINS, forgetting = App.forgetting, inDeck = App.inDeck, masteredCount = App.masteredCount, topicOf = App.topicOf, addWord = App.addWord, personalCollections = App.personalCollections, updateChrome = App.updateChrome;
    const ankiAll = ctx.ankiAll, sharedPreview = ctx.sharedPreview, importData = ctx.importData, shareDeck = ctx.shareDeck; ${src.replace(/^routes\.(\w+) = function/, 'routes.$1 = function')}\n })`;
  return wrapper;
}
const deckRow = h => ({ word: decodeURIComponent((/href="#\/dict\/([^"]+)"/.exec(h) || [])[1] || ''), ipa: ((/<span class="ipa small">(.*?)<\/span>/.exec(h) || [])[1]) || '', mean: ((/<div class="small">(.*?)<\/div>/.exec(h) || [])[1]) || '', note: ((/<div class="small muted hide-sm">(.*?)<\/div>/.exec(h) || [])[1]) || '', retention: (/🧠 (\d+)%/.exec(h) || [])[1] != null ? +(/🧠 (\d+)%/.exec(h))[1] : null, thumb: ((/<div class="em">(.*?)<\/div>/.exec(h) || [])[1]) || '' });
async function deckLibraryTopic(decks) {
  const out = { deck: [], library: [], topic: [], wordbook: [] };
  const open = async (dk, hash, mini = false) => {
    const E = mkEnv({ hash, mini }); const map = keyed(E, decks(E)[dk]); await E.Core.Store.set('cards', map);
    const A = mkApp(E, { cards: await E.Core.Cards.all() }); A.app.routes.deck = () => {}; return { E, A };
  };
  // ---------------- deck ----------------
  const deckCases = [
    ['default', 'no filter: all cards, newest added first (added DESC); header "{n} từ · {k} đã thuộc" (k = cards with mastery 3 = interval ≥ 21)', '', {}],
    ['q-word', 'search text matches word.includes(q) OR meaning(vi).toLowerCase().includes(q) (q trimmed + lowercased)', '', { q: 'cur' }],
    ['q-meaning', 'search by meaning', '', { q: 'học phí' }],
    ['q-none', 'nothing matches → "Không có từ phù hợp bộ lọc."', '', { q: 'zzz' }],
    ['topic-education', 'topic filter = card.topic === id', '', { topic: 'education' }],
    ['topic-mine', 'topic "mine" = card.topic === "mine" (own words)', '', { topic: 'mine' }],
    ['topic-deck', 'own deck filter "deck:<name>" = card.deck === name (options listed from cards\' deck field)', '', { topic: 'deck:Anki: TOEIC' }],
    ['from-youtube', 'origin filter (origin(c): anki > youtube > web > reading > dict > library, by contexts[].source/title/topic)', '', { from: 'youtube' }],
    ['from-web', 'origin web', '', { from: 'web' }],
    ['from-reading', 'origin reading (context title starts "Bài đọc")', '', { from: 'reading' }],
    ['from-dict', 'origin dict (topic mine / empty)', '', { from: 'dict' }],
    ['from-library', 'origin library (everything else)', '', { from: 'library' }],
    ['from-anki', 'origin anki (deck set or topic anki)', '', { from: 'anki' }],
    ['from-forget', '"Sắp quên": cards with reps>0 and retention < min(0.85, target-0.05)=0.85, SORTED by retention ASC (not by added)', '', { from: 'forget' }],
    ['m-0', 'mastery 0 = new (reps 0, never reviewed)', '', { m: '0' }],
    ['m-1', 'mastery 1 = learning (interval < 4, or reps 0 but reviewed)', '', { m: '1' }],
    ['m-2', 'mastery 2 = known (interval 4..20)', '', { m: '2' }],
    ['m-3', 'mastery 3 = mastered (interval ≥ 21)', '', { m: '3' }],
    ['m-12', 'mastery "12" = practising: (reps>0 or last) and mastery < 3', '', { m: '12' }],
    ['combo', 'filters AND together', '', { topic: 'education', m: '12' }],
    ['query-m', '#/deck?m=12 pre-selects the mastery filter (only when it is one of the options)', 'm=12', {}],
    ['query-m-bad', '#/deck?m=9 is ignored', 'm=9', {}],
    ['query-from', '#/deck?from=youtube pre-selects the origin filter', 'from=youtube', {}],
  ];
  for (const [id, why, qs, f] of deckCases) {
    const { E, A } = await open('B', '#/deck');
    E.dom.$('#filterM').options = ['', '0', '12', '1', '2', '3'].map(value => ({ value }));
    for (const sid of ['filterTopic', 'filterFrom', 'filterM']) { // a real <select> reports its <option selected>; the recording DOM must do the same (a test/user assignment wins)
      const el = E.dom.$('#' + sid); let ov; Object.defineProperty(el, 'value', { get() { if (ov !== undefined) return ov; const blk = new RegExp('id="' + sid + '"[\\s\\S]*?</select>').exec(E.dom.view.innerHTML); const m = blk && /<option value="([^"]*)"\s+selected/.exec(blk[0]); return m ? m[1] : ''; }, set(v) { ov = v; } });
    }
    vm.runInContext(appFn(E, A, /routes\.deck = function \(arg, query\) \{/), E.sb)(A.routes, A.app, {}, null);
    await A.routes.deck('', new URLSearchParams(qs)); await settle(3);
    for (const [k, id2] of [['q', '#filterQ'], ['topic', '#filterTopic'], ['from', '#filterFrom'], ['m', '#filterM']]) if (f[k] != null) { E.dom.$(id2).value = f[k]; for (const fn of E.dom.$(id2)._ls.input || []) fn(); }
    const html = E.dom.$('#deckList').innerHTML, rows = html.split('class="deck-row"').slice(1).map(deckRow);
    out.deck.push({ id, why, input: { deck: 'B', query: qs, filters: f }, out: { headline: (/<p class="muted">(.*?)<\/p>/.exec(E.dom.view.innerHTML) || [])[1], selected: { q: E.dom.$('#filterQ').value, topic: E.dom.$('#filterTopic').value, from: E.dom.$('#filterFrom').value, m: E.dom.$('#filterM').value }, empty: /class="empty"/.test(html), rows } });
  }
  // ---------------- library ----------------
  const libCases = [
    ['default-few-cards', 'fewer than 10 cards and exam=ielts → default tab "topics"', '', []],
    ['tab-all', 'tab "all": every group, only the first 6 topics per group + "Xem cả n bộ" link when a group has more', 'g=all', []],
    ['tab-core', 'a group tab lists every topic of the group (no cut)', 'g=core', []],
    ['tab-mine', 'tab "mine" ("Đang học"): personal collections by origin (deck?from=…) + topics that contain ≥1 saved word', 'g=mine', []],
    ['search', 'text filter: topic name/desc contains q OR a word equals q exactly', 'g=all', [{ q: 'educ' }]],
    ['search-word', 'a word equal to q selects the topics that contain it', 'g=all', [{ q: 'curriculum' }]],
    ['level-b2', 'CEFR filter: topic kept when ≥5 words (or ≥30 %) are at that level; topic links carry ?lv=B2', 'g=topics', [{ lv: 'B2' }]],
    ['level-query', '#/library?lv=C1 pre-selects the level (A1..C2 only)', 'g=topics&lv=C1', []],
    ['tab-switch', 'switching tab keeps q + lv filters', 'g=topics', [{ lv: 'B2' }, { tab: 'core' }]],
  ];
  for (const mini of [false, true]) for (const [id0, why, qs, acts] of libCases) { // the second pass runs the SAME page on the mini library carried in data.catalog (ports without the 104-topic library)
    const id = mini ? 'mini-' + id0 : id0;
    const { E, A } = await open('B', '#/library', mini);
    E.dom.resolveList('#libTabs button', () => { const h = E.dom.view.innerHTML; if (E.__h !== h) { E.__h = h; E.__t = attrs(h, /data-g="(\w+)"/g).map(g => { const b = E.dom.mkEl('b'); b.dataset.g = g; b._tog = (c, f) => { if (c === 'on' && f) E.__on = g; }; return b; }); } return E.__t; });
    E.dom.resolve('#libTabs .on', () => { const e = E.dom.mkEl('on'); e.dataset.g = E.__on ?? (/data-g="(\w+)" class="on"/.exec(E.dom.view.innerHTML) || [])[1]; return e; });
    E.dom.resolveList('[data-lvf]', () => { const h = E.dom.view.innerHTML; if (E.__lh !== h) { E.__lh = h; E.__l = attrs(h, /data-lvf="(\w*)"/g).map(v => { const b = E.dom.mkEl('l'); b.dataset.lvf = v; return b; }); } return E.__l; });
    vm.runInContext(appFn(E, A, /routes\.library = function \(arg, query\) \{/), E.sb)(A.routes, A.app, {}, null);
    await A.routes.library('', new URLSearchParams(qs));
    const snap = () => { const h = E.dom.$('#libBody').innerHTML; return { tab: E.dom.$('#libTabs .on').dataset.g, sections: h.split('<div class="section-title"').slice(1).map(sec => ({ heading: unesc((/<h2>(.*?)<\/h2>/.exec(sec) || [])[1]) || '', viewAll: ((/data-go-g="(\w+)">(.*?)<\/a>/.exec(sec) || []).slice(1).join('|')) || null, topics: [...sec.matchAll(/href="#\/topic\/([^"?]+)(?:\?lv=(\w+))?"/g)].map(m => m[2] ? m[1] + '?lv=' + m[2] : m[1]), collections: attrs(sec, /href="#\/deck\?from=(\w+)"/g) })), empty: /class="card empty"/.test(h) ? (/<div class="em">(.*?)<\/div>/.exec(h) || [])[1] : null }; };
    const steps = [{ after: 'open', ...snap() }];
    for (const a of acts) {
      if (a.q != null) { E.dom.$('#libQ').value = a.q; E.dom.$('#libQ').oninput(); }
      if (a.lv != null) E.dom.$$('[data-lvf]').find(b => b.dataset.lvf === a.lv).onclick();
      if (a.tab) E.dom.$$('#libTabs button').find(b => b.dataset.g === a.tab).onclick();
      steps.push({ after: a, ...snap() });
    }
    out.library.push({ id, why: mini ? why + ' (mini library)' : why, input: { deck: 'B', ...(mini ? { catalog: 'mini' } : {}), query: qs, actions: acts, tabs: attrs(E.dom.view.innerHTML, /data-g="(\w+)"/g), levels: attrs(E.dom.view.innerHTML, /data-lvf="(\w*)"/g) }, out: steps });
  }
  // ---------------- topic ----------------
  const topCases = [
    ['education', 'topic page: header counts, words in topic order (flag = already in deck), add-all label; level tabs only when >1 level', 'education', '', []],
    ['education-lv', '#/topic/education?lv=B2 pre-selects a level (must be one of the topic\'s levels)', 'education', 'lv=B2', []],
    ['tab-lv', 'level tab filters the list (tab "" = all)', 'education', '', [{ lv: 'C1' }, { lv: '' }]],
    ['add-all', '"Thêm n từ vào flashcard": adds every missing word silently (Cards.add, topic kept), then label becomes "Đã thêm toàn bộ" and the button is disabled', 'environment', '', [{ addAll: true }]],
    ['unknown', 'unknown topic id → falls back to the library page', 'zzz', '', []],
  ];
  for (const [id, why, tid, qs, acts] of topCases) {
    const { E, A } = await open('B', '#/topic/' + tid);
    let libCalled = 0; A.routes.library = () => { libCalled++; };
    E.dom.resolveList('#lvTabs button', () => { const h = E.dom.view.innerHTML; if (E.__h !== h) { E.__h = h; E.__t = attrs(h, /data-lv="(\w*)"/g).map(v => { const b = E.dom.mkEl('b'); b.dataset.lv = v; return b; }); } return E.__t; });
    vm.runInContext(appFn(E, A, /routes\.topic = function \(id, query\) \{/), E.sb)(A.routes, A.app, {}, null);
    await A.routes.topic(tid, new URLSearchParams(qs)); await settle(3);
    const snap = () => { const h = E.dom.$('#wordList').innerHTML; return { count: E.dom.$('#tCount').textContent, addAll: { label: E.dom.$('#addAll').textContent, disabled: E.dom.$('#addAll').disabled }, words: h.split('class="word-row"').slice(1).map(r => ({ word: decodeURIComponent((/class="w" href="#\/dict\/([^"]+)"/.exec(r) || [])[1]), inDeck: !/data-add-seed/.test(r) })) }; };
    const pre = libCalled ? { fallbackToLibrary: true } : { title: (/<h1[^>]*>(.*?)<\/h1>/.exec(E.dom.view.innerHTML) || [])[1], back: (/<a href="(#\/library\?g=\w+)"/.exec(E.dom.view.innerHTML) || [])[1], levels: attrs(E.dom.view.innerHTML, /data-lv="(\w*)"/g), links: attrs(E.dom.view.innerHTML, /<a class="btn" href="([^"]+)"/g), ...snap() };
    const steps = [{ after: 'open', ...pre }];
    if (!libCalled) for (const a of acts) {
      if (a.lv != null) E.dom.$$('#lvTabs button').find(b => b.dataset.lv === a.lv).onclick();
      if (a.addAll) { E.dom.$('#addAll').onclick(); await settle(40); }
      steps.push({ after: a, ...snap(), deckSize: Object.keys(A.state.cards).length });
    }
    out.topic.push({ id, why, input: { deck: 'B', topic: tid, query: qs, actions: acts }, out: steps });
  }
  // ---------------- word-book add / remove / edit / reset (real addWord + Cards + editCard) ----------------
  {
    const E = mkEnv({ hash: '#/dict/curriculum' }); await E.Core.Store.set('cards', {}); E.load('web/js/ctx.js');
    const A = mkApp(E, { cards: await E.Core.Cards.all() }); A.app.routes.deck = () => {};
    const snapW = async () => { const m = await E.Core.Cards.all(), del = await E.Core.Store.get('deleted', {}); return { cards: Object.fromEntries(Object.entries(m).map(([k, c]) => [k, { word: c.word, vi: c.vi, ipa: c.ipa, ex: c.ex, note: c.note, image: c.image, topic: c.topic, contexts: c.contexts.map(x => x.text), ctx: c.ctx || null, src: c.src || null, added: c.added, mod: c.mod, srs: srsView(c.srs) }])), inState: Object.keys(A.state.cards), deleted: del }; };
    const ent = Object.assign({}, E.data.INDEX.curriculum), steps = [];
    const step = async (op, input, fn) => { E.clock.t += 60e3; await fn(); steps.push({ op, input, out: await snapW() }); };
    await step('add', { entry: 'curriculum (library entry), no context' }, () => A.app.addWord(ent, null));
    await step('add-context', { context: 'The curriculum was revised.', source: 'https://example.com/a' }, () => A.app.addWord(ent, { text: 'The curriculum was revised.', source: 'https://example.com/a', title: 'Ghi chú của bạn' }));
    await step('add-same-context', { context: 'same text again' }, () => A.app.addWord(ent, { text: 'The curriculum was revised.', source: 'https://example.com/a' }));
    await step('add-fills-empty-fields', { entry: 'ipaUS arrives later' }, () => A.app.addWord({ ...ent, ipaUS: '/kəˈrɪkjələm/', vi: 'IGNORED (already set)' }, null));
    await step('add-phrase', { entry: 'look forward to' }, () => A.app.addWord({ word: 'look forward to', vi: 'mong đợi', pos: 'phrase', ex: 'I look forward to meeting you.', topic: 'phrases' }, null));
    await step('add-6-contexts', { contexts: 6 }, async () => { for (let i = 0; i < 6; i++) { E.clock.t += 1000; await A.app.addWord(ent, { text: 'ctx number ' + i, source: '' }); } });
    // edit dialog (editCard): save fields, reset progress, delete
    const editSrc = slice(rd('web/js/app.js'), /function editCard\(word, after\) \{/);
    const editCard = vm.runInContext(`(function (App) { const state = App.state, routes = App.routes; const { SRS, Cards } = Core; const { $, esc, toast, modal, closeModal } = UI; const updateChrome = App.updateChrome; ${editSrc}\n return editCard; })`, E.sb)(A.app);
    const $e = E.dom.$;
    await step('edit-save', { word: 'curriculum', vi: 'giáo trình', ipa: '/kəˈrɪk/', ex: 'My own example.', note: 'mẹo', image: 'https://example.com/i.png' }, async () => { editCard('curriculum'); Object.assign($e('#eVi'), { value: ' giáo trình ' }); $e('#eIpa').value = '/kəˈrɪk/'; $e('#eEx').value = 'My own example.'; $e('#eNote').value = 'mẹo'; $e('#eImg').value = 'https://example.com/i.png'; await $e('#eSave').onclick(); });
    await step('grade-then-reset', { do: 'review good ×1 then "Học lại" (SRS.newState)' }, async () => { const c = (await E.Core.Cards.all()).curriculum; c.srs = E.Core.SRS.review(c.srs, 2, E.clock.t, true); await E.Core.Cards.update(c); A.state.cards.curriculum = c; editCard('curriculum'); await $e('#eReset').onclick(); });
    await step('delete', { word: 'curriculum', confirm: true }, async () => { editCard('curriculum'); await $e('#eDel').onclick(); });
    await step('re-add-after-delete', { note: 'adding again clears the tombstone in "deleted"' }, () => A.app.addWord(ent, null));
    out.wordbook = steps;
  }
  return out;
}


// ============================================================ #/dict: Dict (dictionary.js) + Lex (lex.js) + the dictionary page (dict-page.js) ============================================================
const J = (status, body) => ({ ok: status === 200, status, json: async () => body, text: async () => JSON.stringify(body) });
/** Offline "network" for dictionary.js: the shapes of the 4 sources (Google dict via /api/dictlookup?src=gtx, dictionaryapi.dev via ?src=dapi, Wiktionary parse, /api/img, Tatoeba). */
const NET = {
  curriculum: { gtx: { sentences: [{ trans: 'chương trình học' }], dict: [{ pos: 'noun', terms: ['chương trình giảng dạy', 'giáo trình', 'chương trình học'], base_form: 'curriculum' }], definitions: [{ pos: 'noun', entry: [{ gloss: 'the subjects comprising a course of study in a school or college.', example: 'the school curriculum', definition_id: 'a1' }] }], synsets: [{ entry: [{ synonym: ['syllabus', 'course'] }] }], examples: { example: [{ definition_id: 'a1', text: 'a <b>curriculum</b> for adults' }] } },
    dapi: [{ word: 'curriculum', phonetic: '/kəˈrɪkjʊləm/', phonetics: [{ text: '/kəˈrɪkjʊləm/', audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/curriculum-uk.mp3' }, { text: '/kəˈrɪkjələm/', audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/curriculum-us.mp3' }], meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'The set of courses offered by a school.', example: 'The curriculum is broad.' }], synonyms: ['syllabus'] }] }],
    img: { src: 'https://upload.wikimedia.org/x/curriculum.jpg', link: 'https://commons.wikimedia.org/wiki/File:x', license: 'CC BY', creator: 'A. Author', title: 'School', via: 'Wikipedia' },
    tato: { data: [{ text: 'The new curriculum was introduced last year.', translations: [[{ lang: 'vie', text: 'Chương trình mới được áp dụng năm ngoái.' }]] }, { text: 'Short one.', translations: [[{ lang: 'vie', text: 'Ngắn.' }]] }] } },
  blorptastic: { gtx: { sentences: [{ trans: 'tuyệt vời kỳ quặc' }], dict: [{ pos: 'adjective', terms: ['kỳ quặc', 'lạ lùng'] }, { pos: 'noun', terms: ['sự kỳ quặc'] }], definitions: [{ pos: 'adjective', entry: [{ gloss: 'extremely odd and wonderful.', example: 'a blorptastic idea' }] }], synsets: [] }, dapi: null, img: { none: 1 }, tato: { data: [] } },
  zorble: { gtx: { sentences: [{ trans: 'tổng thể' }], dict: [{ pos: 'adjective', terms: ['tổng thể', 'toàn bộ'] }, { pos: 'noun', terms: ['cái zorble'] }], definitions: [{ pos: 'adjective', entry: [{ gloss: 'taking everything into account.', example: 'the zorble cost' }] }, { pos: 'noun', entry: [{ gloss: 'a made-up thing.', example: 'a zorble' }] }], synsets: [] }, dapi: null, img: { none: 1 }, tato: { data: [] },
    wikitext: '==English==\n===Etymology 1===\n====Adjective====\n====Adverb====\n===Etymology 2===\n====Noun====\n* {{a|UK}} {{IPA|en|/ˌəʊvəˈɹɔːl/}}\n* {{a|US}} {{IPA|en|/ˌoʊvɚˈɔl/}}\n* {{a|UK}} {{q|noun}} {{IPA|en|/ˈəʊvəɹɔːl/}}\n* {{audio|en|En-uk-zorble.ogg|a=UK}}\n' },
};
async function dictCases() {
  const out = { norm: [], lookup: [], page: [], lex: [], suggest: [] };
  const mkDict = (o = {}) => {
    const E = mkEnv({ meanLang: o.meanLang, learnLang: o.learnLang });
    const net = o.net || {};
    const sb = { console, Math, JSON, Promise, Object, Array, Map, Set, Error, RegExp, URL, URLSearchParams, TextEncoder, AbortController, encodeURIComponent, decodeURIComponent, Date: E.sb.Date, setTimeout: (f, ms) => { setImmediate(f); return 0; }, clearTimeout() {}, localStorage: E.ls, navigator: { onLine: true }, location: { hostname: 'lexkite.com', origin: 'https://lexkite.com', protocol: 'https:' }, t, I18N: E.I18N, Core: E.Core, IELTS_DATA: E.data, App: { state: { settings: { aiLocal: false } } } };
    sb.fetch = async url => {
      url = String(url); const q = decodeURIComponent((/[?&]q=([^&]*)/.exec(url) || [])[1] || (/[?&]w=([^&]*)/.exec(url) || [])[1] || (/page=([^&]*)/.exec(url) || [])[1] || '');
      const key = q.toLowerCase(), N = net[key] || {};
      if (/src=gtx/.test(url) && /dt=bd/.test(url)) return N.gtx ? J(200, N.gtx) : J(200, null);
      if (/src=dapi/.test(url)) return N.dapi ? J(200, N.dapi) : J(200, null);
      if (/wiktionary.*action=parse/.test(url)) return N.wikitext ? J(200, { parse: { wikitext: N.wikitext } }) : J(200, null);
      if (/\/api\/img/.test(url)) return J(200, N.img || { none: 1 });
      if (/tatoeba/.test(url)) return J(200, N.tato || { data: [] });
      return J(404, null);
    };
    sb.self = sb; sb.window = sb; sb.globalThis = sb; vm.createContext(sb);
    for (const f of ['web/js/verbs-core.js', 'web/js/lex.js', 'web/js/dictionary.js']) vm.runInContext(rd(f), sb, { filename: f });
    return { E, sb, Dict: sb.Dict, Lex: sb.Lex };
  };
  // ---- normWord (pure) ----
  { const { Dict } = mkDict(); for (const s of ['  Hello ', 'Don’t', 'café', 'NAÏVE', 'well-being', 'a   b', '3×4 ok', 'x²y', '', null, 'look-up!', "o'clock", 'RÉSUMÉ', 'ice cream', 'Ünï', '你好', 'rock&roll', 'e.g.']) out.norm.push({ input: s, out: Dict.normWord(s), why: 'Dict.normWord: NFC, trim, lowercase, ’→\', drop ×÷, keep only a-z, Latin-1/Latin Extended letters (À–ɏ), space, \' and -, collapse spaces' }); }
  // ---- lookup pipeline ----
  const cases = [
    ['quick-local', 'quick(): word in the lexicon → shown at once from the local entry, partial=true, no network', { fn: 'quick', w: 'Curriculum' }, {}],
    ['lookup-local+net', 'lookup(): lexicon entry wins for ipa/pos/vi/def/ex/col/syn/level/emoji; US ipa from lexicon (ipaUS may be empty = same as UK); audio from dictionaryapi; senses from Google; oxford = Google defs with the lexicon def put FIRST for its POS; sentences from Tatoeba (≥5 words, closest to 70 chars first); image from /api/img', { fn: 'lookup', w: 'curriculum' }, { curriculum: NET.curriculum }],
    ['lookup-irregular', 'lookup("went") → lexicon entry of "go" (via irregular map), entry.from = "went"', { fn: 'lookup', w: 'went' }, {}],
    ['lookup-rule', 'quick("curriculums"): plural → stem rule → curriculum, from = the word typed', { fn: 'quick', w: 'curriculums' }, {}],
    ['lookup-google-only', 'word not in the lexicon: built from Google (pos = first sense/def pos, vi = Google vi), no level/emoji/col, topic "mine"', { fn: 'lookup', w: 'blorptastic' }, { blorptastic: NET.blorptastic }],
    ['lookup-wiktionary-ipa', 'IPA from Wiktionary entries by part of speech: first sense pos (adjective) picks the entry whose pos matches; no pos → accent default; audio from Commons', { fn: 'lookup', w: 'zorble' }, { zorble: NET.zorble }],
    ['lookup-not-found', 'nothing anywhere → { word, found:false, vi } (vi from MyMemory or "")', { fn: 'lookup', w: 'zzzqqqxx' }, {}],
    ['lookup-empty', 'normalises to "" → null', { fn: 'lookup', w: '123' }, {}],
    ['lookup-meanlang-en', 'meaning language = en: forLang() drops Vietnamese senses/definitions, maps POS names to English', { fn: 'lookup', w: 'curriculum', meanLang: 'en' }, { curriculum: NET.curriculum }],
  ];
  for (const [id, why, inp, net] of cases) {
    const { E, Dict } = mkDict({ net, meanLang: inp.meanLang });
    const r = await Dict[inp.fn](inp.w, inp.fn === 'lookup' ? { image: true, examples: true } : undefined); await settle(3);
    out.lookup.push({ id, why, input: { ...inp, network: Object.keys(net) }, out: r });
  }
  // ---- Lex (lexicon lookup + suggestions, offline fallback = same normalisation as the shards) ----
  { const { Lex } = mkDict();
    for (const w of ['sustainable', 'Sustainable.', '“sustainable”', 'cafe', 'went', 'looking it up', 'gave them back', 'curriculums', 'studies', 'zzzz', '']) { const r = await Lex.get(w); out.lex.push({ input: w, out: r && { key: r.key, via: r.via, from: r.from, word: r.entry.word, pos: r.entry.pos, vi: r.entry.vi }, why: 'Lex.get: norm → exact → fold (accents) → irregular (r) → stem rules → phrasal-verb heads; via tells which' }); }
    for (const q of ['cur', 'sust', 'look', 'zz', 'a', ' Edu']) { const r = await Lex.suggest(q, 6); out.suggest.push({ input: q, n: 6, out: r.map(x => ({ key: x.key, word: x.word, vi: x.vi, pos: x.pos })), why: 'Lex.suggest: keys that START with the normalised query, sorted, max n (top bar search box = these + remote /sug words)' }); } }
  return out;
}


// ============================================================ #/practice sources · answer kits (ChoiceKit.accept, QE.norm, LessonFx.typo) ============================================================
async function practiceCases(decks) {
  const out = { sources: [], pool: [], accept: [], qeNorm: [], typo: [] };
  const mk = (dk, mini = false) => { const E = mkEnv({ hash: '#/practice', mini }); return E.Core.Store.set('cards', keyed(E, decks(E)[dk])).then(async () => { const A = mkApp(E, { cards: await E.Core.Cards.all() }); return { E, A }; }); };
  const study = rd('web/js/study.js');
  const slices = ['const mean = x =>', 'const picOk = w =>', 'const norm = w =>', 'function sourceList() {', 'function pool(src) {', 'const srcName = src =>'].map(r => slice(study, new RegExp(r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))));
  const mkPool = (E, A) => vm.runInContext(`(function (App) { const { SRS, Cards, Stats, endOfToday, DAY } = Core; const { TOPICS, INDEX } = IELTS_DATA; const { $, $$, esc, shuffle } = UI; const state = App.state; ${slices.join('\n')}\n return { pool, sourceList, norm, srcName }; })`, E.sb)(A.app);
  for (const [dk, label] of [['P', 'mixed deck (all fixture states)'], ['tiny', 'only 2 cards']]) {
    const { E, A } = await mk(dk), P = mkPool(E, A);
    const src = ['deck', 'due', 'weak', 'forgetting', 'phrases', 'level:1', 'level:2', 'level:3', 'level:4', 'level:5', 'origin:youtube', 'origin:dict', 'origin:library', 'origin:anki', 'topic:education', 'topic:zzz', 'nonsense'];
    for (const sname of src) { const r = P.pool(sname); out.pool.push({ id: `pool-${dk}-${sname}`, why: `pool("${sname}") on ${label}: cards WITH a meaning (vi) for deck/weak/forgetting/phrases/level/origin; 'due' = Cards.dueList practicable; topic = topic words; deck with <4 cards falls back to 120 random words of the "topics" group`, input: { deck: dk, src: sname }, out: { n: r.length, words: r.length > 40 ? undefined : r.map(x => x.word), first: r.slice(0, 3).map(x => ({ word: x.word, ipa: x.ipa, vi: x.vi, ex: x.ex, def: x.def, pos: x.pos, emoji: x.emoji, image: x.image, audio: x.audio, level: x.level, topic: x.topic })) } }); }
    if (dk === 'P') out.sources = P.sourceList().filter(o => !/^(origin|topic):/.test(o[0]) || /^(origin:|topic:education)/.test(o[0])).map(([value, label]) => ({ value, label })).concat([{ topicEntries: E.data.TOPICS.length, note: 'one entry "topic:<id>" = "<emoji> <name>" per TOPICS item, in TOPICS order' }]);
  }
  { // the mini library (data.catalog): the <4-cards fallback ("120 words of the topics group") and a topic source, runnable by ports without the 104-topic library
    const { E, A } = await mk('tiny', true), P = mkPool(E, A);
    for (const sname of ['deck', 'topic:education', 'topic:zzz']) { const r = P.pool(sname); out.pool.push({ id: `pool-mini-tiny-${sname}`, why: `pool("${sname}") with 2 cards on the mini library (data.catalog): deck with <4 cards falls back to up to 120 words of the "topics" group (shuffle = identity)`, input: { deck: 'tiny', catalog: 'mini', src: sname }, out: { n: r.length, words: r.length > 40 ? undefined : r.map(x => x.word), first: r.slice(0, 3).map(x => ({ word: x.word, ipa: x.ipa, vi: x.vi, ex: x.ex, def: x.def, pos: x.pos, emoji: x.emoji, image: x.image, audio: x.audio, level: x.level, topic: x.topic })) } }); }
  }
  // typed-answer helpers used by quizzes / mistakes retry (web/js/choice-kit.js accept, qengine.js norm, lesson-fx.js typo): loaded exactly as web loads them
  const sb = { console, Math, JSON, t, I18N: { lang: () => 'vi', tk: (k, v) => ({ k, v }) }, localStorage: memStorage(), sessionStorage: memStorage(), document: undefined, navigator: {}, location: { hash: '' }, setTimeout, clearTimeout }; sb.self = sb; sb.window = sb; sb.globalThis = sb; vm.createContext(sb);
  for (const f of ['web/js/choice-kit.js', 'web/js/qengine.js']) { try { vm.runInContext(rd(f), sb, { filename: f }); } catch (e) { /* DOM-only parts */ } }
  const CK = sb.ChoiceKit, QE = sb.QE;
  if (CK) for (const [g, a, o] of [['consider', 'consider', {}], ['Consider ', 'consider', {}], ['don’t', "don't", {}], ['do not', "don't", {}], ['colour', 'color', {}], ['considr', 'consider', { typo: true }], ['considr', 'consider', {}], ['', 'x', {}], ['green tea', 'green tea', { alts: ['tea'] }], ['tea', 'green tea', { alts: ['tea'] }], ['The cat!', 'the cat', {}]]) out.accept.push({ input: { given: g, answer: a, opts: o }, out: CK.accept(g, a, o), why: 'ChoiceKit.accept(given, answer, {alts, typo}) → {ok, how: exact|variant|typo|"", want}' });
  if (QE) for (const x of ['The Cat!', "  It’s  fine. ", '1,000 people', '$50', 'a bird', 'An apple', 'A.B', '']) out.qeNorm.push({ input: x, out: QE.norm(x), why: 'QE.norm: lowercase, curly→straight quotes, drop currency, 1,000→1000, punctuation→space, collapse, drop leading the/a/an' });
  const sf = { console, Math, JSON, t, UI: vm.runInNewContext(`(function(){ ${slice(rd('web/js/ui.js'), /function similarity\(a, b\) \{/)}\n return { similarity }; })()`), I18N: sb.I18N, localStorage: memStorage(), sessionStorage: memStorage(), navigator: {}, setTimeout, clearTimeout, location: { hash: '' }, ChoiceKit: CK }; sf.self = sf; sf.window = sf; sf.globalThis = sf; vm.createContext(sf);
  try { vm.runInContext(rd('web/js/lesson-fx.js'), sf, { filename: 'web/js/lesson-fx.js' }); } catch (e) { /* DOM-only parts */ }
  const FX = sf.LessonFx;
  if (FX && FX.typo) for (const [g, tg, o] of [['consider', 'consider', {}], ['considr', 'consider', {}], ['conzider', 'consider', {}], ['cat', 'cut', {}], ['scholarshp', 'scholarship', {}], ['i like grean tea', 'I like green tea', {}], ['grean', 'green', { strict: true }], ['tow', 'two', { isWord: x => x === 'two' || x === 'tow' }]]) out.typo.push({ input: { given: g, target: tg, opts: o.strict ? { strict: true } : o.isWord ? { isWord: 'x === "two" || x === "tow"' } : {} }, out: FX.typo(g, tg, o), why: 'LessonFx.typo: ≤1 slip per word of ≥4 letters is accepted (ok) and marked (marks[].fix); strict = no slips; isWord blocks a slip that is itself another word' });
  return out;
}

// ============================================================ #/ideas · #/letters · #/paraphrase · #/models · #/model · #/phrases ============================================================
/** The REAL lemmatizer + irregular tables of web/js/phrases.js (IRR … lemma), evaluated on a word index (IELTS_DATA.INDEX): App.lemma / App.lemmaT. */
function lemmaTables(IELTS_DATA) {
  const src = rd('web/js/phrases.js'), a = src.indexOf('const IRR = '), b = src.indexOf('  App.lemma = lemma;');
  if (a < 0 || b < a) throw new Error('gen-vocab: phrases.js IRR…lemma block not found');
  return vm.runInNewContext(`(function (IELTS_DATA) { ${src.slice(a, b)}\n return { lemma, PAST, PP, BASE, KNOWN, KEEP, IRR }; })`)(IELTS_DATA);
}
const pageEnv = async (hash, files, appOpts = {}, mini = false) => {
  const E = mkEnv({ hash, mini }); await E.Core.Store.set('cards', {});
  for (const f of files) E.load(f);
  const A = mkApp(E, { cards: await E.Core.Cards.all(), ...appOpts });
  return { E, A };
};
const SIMILARITY = vm.runInNewContext(`(function(){ ${slice(rd('web/js/ui.js'), /function similarity\(a, b\) \{/)}\n return similarity; })()`);
async function writingCases() {
  const out = { ideas: [], letters: [], paraphrase: {}, models: [], model: [], phrases: [], annotated: [] };
  // ---- the web content the page scripts read, plus the REDUCED copy the ports get in vocab.json (data.writing): the same real records, a few of them ----
  const MODF = ['web/js/models.js', 'web/cpack/write/models2.js', 'web/cpack/write/models3.js', 'web/cpack/write/models4.js', 'web/cpack/write/models5.js', 'web/js/write/gt-letters.js', 'web/cpack/write/task2-more.js'];
  const applyMini = (P, W) => { const sb = P.E.sb; sb.MODELS = clone(W.models); sb.WRITE_PROMPTS = clone(W.prompts); const S = P.A.app.task1 && P.A.app.task1.SETS; if (S) S.splice(0, S.length, ...clone(W.task1)); };
  const base = async (hash, W) => { // the model pages on the MINI library (word index = data.catalog) with the real phrases.js lemmatizer
    const P = await pageEnv(hash, MODF, {}, true);
    const L = lemmaTables(P.E.sb.IELTS_DATA); P.A.app.lemma = L.lemma; P.A.app.lemmaT = { PAST: L.PAST, PP: L.PP, BASE: L.BASE, KNOWN: L.KNOWN };
    P.A.app.cleanText = el => ''; P.A.app.phrasePop = () => {}; P.A.app.savePhraseDialog = () => {}; P.A.app.saveSettings = () => {};
    for (const f of ['web/cpack/write/task1-more.js', 'web/js/write/task1-more2.js', 'web/js/write.js', 'web/js/task1.js']) P.E.load(f);
    P.E.load('web/js/phrases-model.js'); if (W) applyMini(P, W);
    return P;
  };
  const FULL = await base('#/models'); FULL.E.load('web/cpack/write/ideas.js'); FULL.E.load('web/js/lib/paraphrase-data.js');
  const sbF = FULL.E.sb, KEEP_TOPICS = ['education', 'sport'];
  const kept = [1, 2, 'gt'].flatMap(k => sbF.MODELS.filter(m => m.task === k).slice(0, 2)), refs = new Set(kept.map(m => m.ref));
  const MW = clone({ ideas: sbF.IDEAS.filter(x => KEEP_TOPICS.includes(x.topic)), letters: sbF.GT_LETTERS, paraphrase: sbF.PARAPHRASE.slice(0, 60), models: kept,
    prompts: sbF.WRITE_PROMPTS.filter(p => KEEP_TOPICS.includes(p.topic) || refs.has(p.id)), task1: FULL.A.app.task1.SETS.filter(x => refs.has(x.id)) });
  out._mini = MW;
  // ---- ideas ----
  for (const [id, why, topic] of [['default', 'no topic → first topic of window.IDEAS', ''], ['education', '#/ideas/education', 'education'], ['unknown', 'unknown topic id → first topic', 'zzz']]) {
    const { E, A } = await pageEnv('#/ideas', ['web/cpack/write/ideas.js']);
    E.sb.WRITE_PROMPTS = clone(MW.prompts); E.sb.IDEAS.splice(0, E.sb.IDEAS.length, ...clone(MW.ideas));
    const saved = []; A.app.savePhraseDialog = o => saved.push(o);
    E.load('web/js/ideas.js');
    E.dom.resolveList('.idea-ch', () => { const h = E.dom.view.innerHTML; if (E.__h !== h) { E.__h = h; E.__c = [...h.matchAll(/data-en="([^"]*)" data-vi="([^"]*)" data-ex="([^"]*)"/g)].map(m => { const b = E.dom.mkEl('c'); b.dataset = { en: m[1], vi: m[2], ex: m[3] }; return b; }); } return E.__c; });
    A.routes.ideas(topic); const h = E.dom.view.innerHTML; E.dom.$$('.idea-ch')[0].onclick();
    const topics = [...h.matchAll(/href="#\/ideas\/(\w[\w-]*)"/g)].map(m => m[1]);
    const issues = h.split('<details class="card idea"').slice(1).map(d => ({ q: (/<b>❓ (.*?)<\/b>/.exec(d) || [])[1], ideas: d.split('class="idea-it"').slice(1).map(i => ({ idea: (/<b>(.*?)<\/b>/.exec(i) || [])[1], chunks: [...i.matchAll(/data-en="([^"]*)" data-vi="([^"]*)"/g)].map(m => [m[1], m[2]]) })).length, side: [...d.matchAll(/<h4[^>]*>(.*?)<\/h4>/g)].map(m => m[1]) }));
    out.ideas.push({ id, why, input: { topic, learnLang: 'vi' }, out: { topics, selected: (/class="chip lv" href="#\/ideas\/([\w-]+)"/.exec(h) || [])[1], issues: issues.length, firstIssue: issues[0] && { ...issues[0], q: unesc(issues[0].q) }, vocab: (h.split('class="ai-vocab"')[1] || '').split('<div><b>').length - 1, prompts: [...h.matchAll(/href="#\/write\/(\w+)"/g)].map(m => m[1]), firstChunkSave: saved[0] } });
  }
  { const { E } = await pageEnv('#/ideas', ['web/cpack/write/ideas.js']); out.ideasData = { topics: E.sb.IDEAS.map(x => ({ topic: x.topic, title: x.title, emoji: x.emoji, issues: x.issues.length, vocab: (x.vocab || []).length, exampleIssue: x.topic === 'education' ? { q: x.issues[0].q, for: x.issues[0].for[0], against: x.issues[0].against[0] } : undefined })).map(x => x), shape: '{topic,title,emoji,issues:[{q,for:[{idea,vi,ex,chunks:["en|vi",…]}],against:[…]}],vocab:[[en,vi],…]}' }; out.ideasData.topics = out.ideasData.topics.map(x => (x.exampleIssue ? x : { ...x })); }
  // ---- letters ----
  const LET = ['web/js/write/gt-letters.js'];
  for (const [id, why, qs, drafts] of [['all', '#/letters: all prompts, tone tabs with counts, draft chips (✍️ n từ) from Store letterDrafts', '', { gt1: 'Dear Sir or Madam, hello world one two three' }], ['formal', '?tone=formal filters; unknown tone → all', 'tone=formal', {}], ['bad-tone', 'unknown tone → all', 'tone=zzz', {}]]) {
    const { E, A } = await pageEnv('#/letters', LET); await E.Core.Store.set('letterDrafts', drafts); E.load('web/js/letters.js');
    await A.routes.letters('', new URLSearchParams(qs)); await settle(3); const h = E.dom.view.innerHTML;
    out.letters.push({ id, why, input: { query: qs, drafts }, out: { tabs: [...h.matchAll(/href="#\/letters\?tone=([\w-]+)"[^>]*>([^<]*)<span class="tiny muted">(\d+)<\/span>/g)].map(m => ({ tone: m[1], label: m[2].trim(), n: +m[3] })), tip: /class="tip small"/.test(h), cards: h.split('<div class="card">').slice(1).map(c => ({ id: (/href="#\/letters\/(\w+)"/.exec(c) || [])[1], tone: (/<span class="chip">(.*?)<\/span>/.exec(c) || [])[1], draftWords: (/chip ok">✍️ (\d+) từ/.exec(c) || [])[1] ? +(/chip ok">✍️ (\d+) từ/.exec(c))[1] : null, title: unesc((/<h3[^>]*>(.*?)<\/h3>/.exec(c) || [])[1]) })) } });
  }
  { const { E } = await pageEnv('#/letters', LET); const L = E.sb.GT_LETTERS; out.lettersData = { count: L.length, example: L[0], shape: 'GT_LETTERS item = {id,tone: formal|semi-formal|informal,topic,titleVi,to,situation,bullets[3],open,close}' }; }
  const checks = [['gt1', 'Dear Sir or Madam,\n\nI am writing to complain.\n\n' + 'word '.repeat(150) + '\n\nYours faithfully,\nA'], ['gt1', 'Hi there, I\'m upset. short'], ['gt1', ''], ['gt13', 'Dear Mr Smith,\n\n' + 'x '.repeat(160) + '\n\nBest regards']];
  for (const [lid, text] of checks) {
    const { E, A } = await pageEnv('#/letters/' + lid, LET); await E.Core.Store.set('letterDrafts', {}); E.load('web/js/letters.js');
    await A.routes.letters(lid, new URLSearchParams('')); await settle(3);
    const ta = E.dom.$('#lt'); ta.value = text; ta.oninput(); E.dom.$('#ltCheck').onclick(); await settle(4);
    const html = E.dom.$('#ltRes').innerHTML, L = E.sb.GT_LETTERS.find(x => x.id === lid);
    out.letters.push({ id: `check-${lid}-${text.length}`, why: 'practice page: live word count (regex [A-Za-z0-9\'’-]+) + "Kiểm tra" rows: ≥150 words · greeting starts like the prompt\'s open · closing phrase present (if the prompt has one) · ≥4 non-empty paragraphs · formal letters: no contractions. Draft saved to Store letterDrafts after typing', input: { letter: lid, open: L.open, close: L.close, tone: L.tone, text }, out: { wordChip: E.dom.$('#ltWc').textContent, wordChipOk: E.dom.$('#ltWc').className, rows: [...html.matchAll(/<div class="small">(✅|⚠️) (.*?)<\/div>/g)].map(m => ({ ok: m[1] === '✅', msg: m[2] })), draftSaved: (await E.Core.Store.get('letterDrafts', {}))[lid] === text ? true : (await E.Core.Store.get('letterDrafts', {}))[lid] ?? null } });
  }
  // ---- paraphrase ----
  { const { E, A } = await pageEnv('#/paraphrase', ['web/js/lib/paraphrase-data.js']); const rewards = []; A.app.reward = r => rewards.push(r); E.load('web/js/paraphrase.js');
    const src = rd('web/js/paraphrase.js'), rules = [slice(src, /const STOP = /), slice(src, /const keyw = /), slice(src, /const usable = /)].join('\n');
    const U = vm.runInContext(`(function () { ${rules}\n return { usable, keyw }; })()`, E.sb);
    const all = E.sb.PARAPHRASE, okFull = all.filter(([q, p]) => U.usable(q, p));
    out.paraphrase.data = { total: all.length, usable: okFull.length, shape: 'self.PARAPHRASE = [[phraseInQuestion, phraseInPassage], …] (web/js/lib/paraphrase-data.js)' };
    all.splice(0, all.length, ...clone(MW.paraphrase)); const ok = all.filter(([q, p]) => U.usable(q, p)); // from here on: the reduced list (data.writing.paraphrase)
    out.paraphrase.usable = [...all.slice(0, 6), ['the ___ of', 'x'], ['a / b', 'c'], ['same words here today', 'same words here today'], ['abc', 'x'.repeat(95)], ['hello world', 'greeting people']].map(([q, p]) => ({ input: [q, p], out: U.usable(q, p) }));
    E.dom.resolveList('[data-o]', () => { const h = E.dom.view.innerHTML; if (E.__h !== h) { E.__h = h; E.__o = [...h.matchAll(/data-o="([^"]*)"/g)].map(m => { const b = E.dom.mkEl('o'); b.dataset.o = m[1]; return b; }); } return E.__o; });
    A.routes.paraphrase(); const h0 = E.dom.view.innerHTML;
    out.paraphrase.first = { q: unesc((/class="pp-q"[^>]*>“(.*?)”/.exec(h0) || [])[1]), options: [...h0.matchAll(/data-o="([^"]*)"/g)].map(m => unesc(m[1])), progress: (/<span class="small muted">(\d+\/\d+)<\/span>/.exec(h0) || [])[1], why: 'round = 10 random usable pairs; options = the right phrase + 3 other usable phrases whose length differs < 40 and q differs; shuffled (test order here = web order with shuffle disabled)' };
    let right = 0, steps = [];
    for (let i = 0; i < 10; i++) { const h = E.dom.view.innerHTML, qtxt = (/class="pp-q"[^>]*>“(.*?)”/.exec(h) || [])[1], opts = E.dom.$$('[data-o]'); const want = ok.find(([q]) => q.replace(/&#39;/g, "'") === qtxt || esc(q) === qtxt); const rightBtn = want && opts.find(b => b.dataset.o === esc(want[1])); const pickRight = i % 3 !== 2; const btn = pickRight && rightBtn ? rightBtn : opts.find(b => b !== rightBtn); if (btn === rightBtn) right++; btn.onclick(); steps.push({ i, correct: btn === rightBtn }); E.dom.$('#ppNext').onclick(); }
    out.paraphrase.finish = { steps, summary: (/<h2>(.*?)<\/h2>/.exec(E.dom.view.innerHTML) || [])[1], rewards, rule: 'reward {quizzes:1, readings:0, xp: 5 + right*2}' }; }
  // ---- models (library) ----
  for (const [id, why, qs, acts] of [['tab-2', 'default tab = "2" (Task 2) for exam ielts; sorted by kind then title; each row: title/kind/topic/words/band', '', []], ['tab-1', '?t=1 Task 1 charts (kind = chart type)', 't=1', []], ['tab-gt', '?t=gt letters (kind = tone)', 't=gt', []], ['search', 'search over "title kind topic" lowercase', 't=2', [{ q: 'education' }]]]) {
    const { E, A } = await base('#/models', MW); A.routes.models('', new URLSearchParams(qs));
    E.dom.resolveList('#mTabs button', () => { const h = E.dom.view.innerHTML; if (E.__h !== h) { E.__h = h; E.__t = attrs(h, /data-v="(\w+)"/g).map(v => { const b = E.dom.mkEl('b'); b.dataset.v = v; return b; }); } return E.__t; });
    const rows = () => E.dom.$('#mList').innerHTML.split('class="card hover model-row"').slice(1).map(r => ({ id: (/href="#\/model\/([\w-]+)"/.exec(r) || [])[1], title: unesc((/<b>(.*?)<\/b>/.exec(r) || [])[1]), meta: unesc((/<small>(.*?)<\/small>/.exec(r) || [])[1]), band: (/Band (\S+?)<\/span>/.exec(r) || [])[1] }));
    const steps = [{ after: 'open', rows: rows() }];
    for (const a of acts) { E.dom.$('#mq').value = a.q; E.dom.$('#mq').oninput(); steps.push({ after: a, rows: rows() }); }
    out.models.push({ id, why, input: { query: qs, actions: acts, tabs: ['2', '1', 'gt'] }, out: { tabsHtml: attrs(E.dom.view.innerHTML, /data-v="(\w+)">([^<]*)/g), steps: steps.map(s => ({ ...s, n: s.rows.length, rows: s.rows.slice(0, 8) })) } });
  }
  // ---- model page + annotated text ----
  const { E: EM, A: AM } = await base('#/model/t1-energy', MW);
  const ann = ['<<Mở bài>> The graph [[illustrates|minh họa]] data.\n\n{{However}}, [[the figure|con số]] rose. <<Kết>> Done & dusted <b>.']; // role at start, role inline, chunk, link, html-escaped
  for (const text of ann) { const h = AM.app.renderAnnotated(text); out.annotated.push({ input: text, out: { paragraphs: h.split('</p>').filter(Boolean).length, roles: attrs(h, /<span class="an-role[^"]*" translate="no">(.*?)<\/span>/g), roleHead: /<div class="an-ptag">/.test(h), chunks: [...h.matchAll(/data-ph="([^"]*)" data-vi="([^"]*)"/g)].map(m => [m[1], m[2]]), links: attrs(h, /<span class="an-lk">(.*?)<\/span>/g), escaped: /&lt;b&gt;/.test(h), glossHidden: !/data-gl=/.test(h) }, why: 'App.renderAnnotated: [[en|vi]] chunk, {{linker}}, <<Role>> at paragraph start = label above, inline = small tag; text is HTML-escaped first; paragraphs split on blank lines' }); }
  { const MODELS = sbF.MODELS, picks = [MODELS.find(m => m.task === 1), MODELS.find(m => m.task === 2), MODELS.find(m => m.task === 'gt')].filter(Boolean);
    out.modelData = { count: MODELS.length, byTask: Object.fromEntries(['1', '2', 'gt'].map(k => [k, MODELS.filter(m => String(m.task) === k).length])), shape: 'MODELS item = {id,task: 1|2|"gt",ref,band,words,text (annotated),outline?[],vocab?[[en,vi]],pitfalls?[],band6?{text,notes{TR,CC,LR,GRA}}}' };
    for (const m of picks) {
      const P = await base('#/model/' + m.id, MW); const rewards = []; P.A.app.reward = r => rewards.push(r);
      P.E.dom.resolveList('[data-sv]', () => { const h = P.E.dom.view.innerHTML; if (P.__h !== h) { P.__h = h; P.__b = attrs(h, /data-sv="(\d+)"/g).map(i => { const b = P.E.dom.mkEl('sv'); b.dataset.sv = i; return b; }); } return P.__b; });
      P.A.routes.model(m.id); const h = P.E.dom.view.innerHTML;
      const chunks = [...m.text.matchAll(/\[\[([^|\]]+)\|([^\]]+)\]\]/g)].map(x => [x[1], x[2]]);
      P.E.dom.$$('[data-sv]')[0].onclick(); await settle(6); P.E.dom.$('#saveAll').onclick(); await settle(40);
      const cards = await P.E.Core.Cards.all();
      out.model.push({ id: 'page-' + m.id, why: 'model page: header (task/kind/band/words), prompt source (WRITE_PROMPTS / task1 SETS / GT_LETTERS by m.ref), chunks list (+ saved flag), linkers set (unique {{…}}), "+" saves ONE chunk as a phrase card (pos "phrase", emoji 🧩, topic "phrases", ex = the sentence that contains it, context title "Bài mẫu Task n"), "Lưu tất cả" saves every missing chunk; tabs: read/vocab/gram/link/copy/write', input: { id: m.id, task: m.task, ref: m.ref, band: m.band, words: m.words }, out: { badges: attrs(h.split('id="mExtra"')[0], /<span class="md-badge[^"]*">(.*?)<\/span>/g), back: (/<a href="(#\/[^"]+)" class="small">←/.exec(h) || [])[1], chunks, linkers: [...new Set([...m.text.matchAll(/\{\{([^}]+)\}\}/g)].map(x => x[1]))], tabs: attrs(h, /data-mt="(\w+)"/g), extras: { outline: !!m.outline, vocab: !!m.vocab, pitfalls: !!m.pitfalls, band6: !!m.band6 }, saved: Object.values(cards).slice(0, 4).map(c => ({ word: c.word, vi: c.vi, pos: c.pos, topic: c.topic, emoji: c.emoji, ex: c.ex, ctxTitle: (c.contexts[0] || {}).title })), savedCount: Object.keys(cards).length } });
    }
  }
  // ---- gap exercises (vocab / link) and phrase book, driven on real models ----
  out.gap = []; 
  for (const kind of ['vocab', 'link']) for (const scenario of ['all-correct', 'one-correct']) {
    const m = EM.sb.MODELS.find(x => x.id === 't1-energy'); const P = await base('#/model/' + m.id, MW); const rewards = []; P.A.app.reward = r => rewards.push(r);
    const btn = P.E.dom.mkEl('tab'); btn.dataset.mt = kind; P.E.dom.resolveList('#mTabs button', () => [btn]);
    const box = P.E.dom.mkEl('pane'); box._q = P.E.dom.reg(); P.E.dom.resolve('#mPane', () => box);
    let gapEls = null, gh = null; Object.defineProperty(box, '_lists', { get: () => { if (gh !== box.innerHTML) { gh = box.innerHTML; gapEls = [...gh.matchAll(/class="gap[^"]*" data-i="(\d+)"/g)].map(x => { const g = P.E.dom.mkEl('gap'); g.dataset.i = x[1]; g.classList.toggle = (c, f) => { g[c] = f; }; return g; }); } return { '.gap': gapEls, '.bankw': [] }; } });
    box.querySelectorAll = sel => (sel === '.gap' ? box._lists['.gap'] : []); box.querySelector = sel => (sel === '.gap' ? box._lists['.gap'][0] || null : null); box.firstElementChild = P.E.dom.mkEl('first');
    P.A.routes.model(m.id); await settle(3); btn.onclick(); await settle(3);
    const n = box._lists['.gap'].length, bank = [...box.innerHTML.matchAll(/class="chip bankw"[^>]*>(.*?)<\/button>/g)].map(x => x[1]);
    if (scenario === 'all-correct') P.E.dom.$('#show', box) && box._q('#show').onclick();
    else { const q = box._lists['.gap'][0]; q.value = ''; }
    const gaps = box._lists['.gap']; if (scenario === 'one-correct') { box._q('#show').onclick(); gaps.slice(1).forEach(g => { g.value = 'wrong'; }); }
    box._q('#chk').onclick(); await settle(6);
    out.gap.push({ id: `${kind}-${scenario}`, why: 'gap exercise: answers = every [[chunk]] (vocab) or {{linker}} (link) in text order, bank = unique answers; check compares norm(input) === norm(answer) (norm: lowercase, ’→\', non [a-z0-9\' ] → space, collapse); score = right/total, reward {quizzes:1, perfect: pct===100 ?1:0, xp: 5 + right*2}; ≥70 % stores kind in Store "mdone:<id>"', input: { model: m.id, kind, scenario }, out: { gaps: n, bank, feedback: box.firstElementChild && (box._q('#chk') && 'checked'), rewards, mdone: await P.E.Core.Store.get('mdone:' + m.id, []), marks: gaps.map(g => (g.ok ? 'ok' : g.no ? 'no' : '')) } });
  }
  // ---- exercises generated from a model (phrases-model.js EX): gram = errExercise (planted errors; <5 candidates → select fallback), copy = slotExercise, write = lemmaExercise ----
  out.exercise = [];
  const exercise = async (m, mode) => {
    const P = await base('#/model/' + m.id, MW), rewards = []; P.A.app.reward = r => rewards.push(r);
    P.E.sb.UI.similarity = SIMILARITY; // the page's own UI.similarity (web/js/ui.js), not the page-env stub that always answers 0: lemmaExercise accepts >= 95 % similar lines
    const D = P.E.dom, btn = D.mkEl('tab'); btn.dataset.mt = mode; D.resolveList('#mTabs button', () => [btn]);
    const box = D.mkEl('pane'); box._q = D.reg(); D.resolve('#mPane', () => box);
    let h0 = null, L = {};
    const lists = () => { // the recording DOM: input/select/line elements of the exercise HTML, rebuilt only when the HTML changes (values the page sets stay)
      if (h0 === box.innerHTML) return L; h0 = box.innerHTML;
      const gen = (re, init) => [...h0.matchAll(re)].map(x => { const e = D.mkEl('x'); e.classList.toggle = (c, f) => { e[c] = f; }; init(e, x); return e; });
      L = { '.gap': gen(/class="gap[^"]*" data-(?:i|k)="(\d+)"/g, (e, x) => { e.dataset.i = e.dataset.k = x[1]; }), '.gsel': gen(/class="gap gsel" data-i="(\d+)"/g, (e, x) => { e.dataset.i = x[1]; }), '.slot': gen(/class="slot" data-i="(\d+)"/g, (e, x) => { e.dataset.i = x[1]; }),
        '.line': gen(/class="line" data-i="(\d+)"/g, (e, x) => { e.dataset.i = x[1]; const k = { '.lin': D.mkEl('lin'), '.lres': D.mkEl('lres') }; e.querySelector = sel => k[sel] || null; e._k = k; }), '.bankw': [] };
      return L;
    };
    Object.defineProperty(box, '_lists', { get: lists }); box.querySelectorAll = sel => lists()[sel] || []; box.querySelector = sel => (lists()[sel] || [])[0] || null; box.firstElementChild = D.mkEl('first');
    P.A.routes.model(m.id); await settle(3); btn.onclick(); await settle(3);
    const html = box.innerHTML, right = () => (rewards.length ? (rewards[rewards.length - 1].xp - 5) / 2 : null), res = {};
    if (mode === 'gram' && /class="gap gsel"/.test(html)) { // fewer than 5 plantable errors → the "choose the right form" exercise
      res.kind = 'select'; const sel = lists()['.gsel']; res.options = [...html.matchAll(/<select class="gap gsel"[^>]*>(.*?)<\/select>/g)].map(x => attrs(x[1], /<option>(.*?)<\/option>/g).map(unesc).filter(o => o !== '…'));
      box._q('#chk').onclick(); res.answers = sel.map(g => g.title.replace(/^Đáp án: /, '')); // nothing chosen → every title is "Đáp án: <word>"
      res.typed = sel.map((g, i) => (i % 3 === 1 ? res.options[i].find(o => o.toLowerCase() !== res.answers[i].toLowerCase()) : res.answers[i])); sel.forEach((g, i) => { g.value = res.typed[i]; }); rewards.length = 0; box._q('#chk').onclick(); await settle(6); res.right = right();
    } else if (mode === 'gram') {
      res.kind = 'errors'; res.items = [...html.matchAll(/(?:<u class="err-w">([^<]*)<\/u>)?<input class="gap( err-miss)?" data-k="(\d+)"/g)].map(x => ({ k: +x[3], wrong: unesc(x[1] || ''), missing: !!x[2] }));
      res.paragraphs = html.split('</p><p>').length;
      box._q('#show').onclick(); const gaps = lists()['.gap']; res.items.forEach((it, i) => { it.ans = gaps[i].value; it.why = gaps[i].title; });
      const typed = gaps.map((g, i) => (i % 3 === 1 ? 'zz' : g.value)); gaps.forEach((g, i) => { g.value = typed[i]; }); box._q('#chk').onclick(); await settle(6);
      res.typed = typed; res.right = right();
    } else if (mode === 'copy') {
      res.blocks = html.split('<p class="slot-p">').slice(1).map(b => ({ role: (/<span class="an-role slot-role" translate="no">(.*?)<\/span>/.exec(b) || [])[1] || '', n: (b.match(/class="slot"/g) || []).length }));
      const ins = lists()['.slot']; res.n = ins.length; box._q('#chk').onclick(); await settle(3); res.answers = ins.map(g => g.title).join(' '); // empty fields → each title is the expected word
      ins.forEach((g, i) => { g.value = i % 2 ? 'x' : g.title; g.title = ''; }); rewards.length = 0; box._q('#chk').onclick(); await settle(6); res.right = right();
    } else {
      const lines = lists()['.line']; res.prompts = html.split('class="lem-q">').slice(1).map(x => unesc(x.split('</div>')[0])); res.roles = html.split('<li class="line"').slice(1).map(x => (/slot-role" translate="no">(.*?)<\/span>/.exec(x) || [])[1] || '');
      box._q('#show').onclick(); res.sentences = lines.map(l => unesc(l._k['.lres'].innerHTML.replace(/^<span class="muted">[^<]*<\/span> /, '')));
      res.typed = res.sentences.map((x, i) => (i % 3 === 1 ? 'x' : i % 3 === 2 ? 'X' + x.slice(1) : x)); lines.forEach((l, i) => { l._k['.lin'].value = res.typed[i]; });
      box._q('#chk').onclick(); await settle(6); res.right = right();
    }
    out.exercise.push({ id: `${mode}-${m.id}`, why: { gram: 'errExercise: the app plants real errors in the model (missing article / past tense / was-were / -ed / -ly / plural / comparative; max 12, ≥ 6 tokens apart; Math.random=0.5 → no article is dropped), the learner types the right form; items = underlined wrong word (or an empty box for a missing word), answer and reason key; typed = answers except every 3rd (zz); fewer than 5 errors → select-the-form fallback (options per box, answers, typed = answer except every 3rd = another form)',
      copy: 'slotExercise: one box per word (punctuation stays), role label per paragraph; typed = even boxes exact, odd boxes "x"', write: 'lemmaExercise: each sentence given as lemmas (real App.lemma on the mini index); typed per line: exact / "x" / first letter changed; right = exact or ≥ 95 % similar' }[mode], input: { model: m.id, mode }, out: res });
  };
  for (const m of MW.models) await exercise(m, 'gram');
  for (const m of MW.models.filter((x, i) => i % 2 === 0)) { await exercise(m, 'copy'); await exercise(m, 'write'); }
  // ---- #/phrases ----
  for (const [id, why, deckName] of [['empty', 'no phrase cards → empty hint + "Thêm nhanh 20 cụm" starter (top 20 chunks by frequency in all MODELS, ≥2 words, ≤48 chars, not already saved)', 'none'], ['with-cards', 'phrase cards (isPhrase: has a space, pos phrase or topic phrases) newest first; "Học các cụm" shown when ≥4', 'B']]) {
    const dk = fixtureDecks(mkEnv()); const P = await base('#/phrases', MW); await P.E.Core.Store.set('cards', keyed(P.E, deckName === 'B' ? [...dk.B, ...dk.A.slice(0, 3).map((c, i) => ({ ...c, word: ['by and large', 'in terms of', 'as a result'][i], topic: 'phrases', pos: 'phrase' }))] : [])); P.A.state.cards = await P.E.Core.Cards.all();
    P.A.routes.phrases(); await settle(2); const h = P.E.dom.view.innerHTML;
    const res = { list: h.split('class="deck-row"').slice(1).map(r => (/<b>(.*?)<\/b>/.exec(r) || [])[1]), learnButton: /practice\/learn\?src=phrases/.test(h), models: (/hub-meta">([^<]*)</.exec(h) || [])[1], starterButton: /id="starter"/.test(h) };
    if (res.starterButton) { P.E.dom.$('#starter').onclick(); await settle(80); const c = await P.E.Core.Cards.all(); res.starterAdded = Object.values(c).sort((a, b) => a.added - b.added).map(x => ({ word: x.word, vi: x.vi, pos: x.pos, topic: x.topic, ctxTitle: (x.contexts[0] || {}).title })); }
    out.phrases.push({ id, why, input: { deck: deckName }, out: res });
  }
  return out;
}


// ============================================================ #/usage (usage-core.js) · #/verb (verbs-core.js + landing filter of verbs.js) · #/dict page (dict-page.js) ============================================================
async function usageVerbCases() {
  const out = { usage: {}, verb: {} };
  const sb = { console, Math, JSON, t, Date, localStorage: memStorage(), sessionStorage: memStorage(), location: { hash: '' } }; sb.self = sb; sb.window = sb; sb.globalThis = sb; vm.createContext(sb);
  for (const f of ['web/js/verbs-core.js', 'web/js/usage-index.js', ...fs.readdirSync(R('web/js/usage')).sort().map(f => 'web/js/usage/' + f), 'web/js/usage-core.js']) vm.runInContext(rd(f), sb, { filename: f });
  const U = sb.LK_USAGE, V = sb.LK_VERBS, IDX = sb.LK_USAGE_IDX;
  const brief = e => ({ kind: e.kind, sub: e.sub, key: e.key, items: e.items.map(i => ({ h: i.h, vi: i.vi, en: i.en, ex: i.ex })), ex: e.ex, notes: e.notes, mis: e.mis, col: e.col, lessons: e.lessons, reg: e.reg, quiz: e.quiz, k: e.k, pos: e.pos, rel: e.rel, f: e.f });
  const sample = '@a interested\n+ in | quan tâm | wanting to know | She is interested [in] art.\nx Are you interested [in] jazz?\n# ghi chú | note\n! interested about => interested in | sai | wrong\n= highly interested, genuinely interested\n> adjectives-prepositions\n~ neutral | trung tính | neutral\n? He is good [at|in|on] maths.\n';
  out.usage.parse = [{ input: { kind: 'p', src: sample }, out: U.parse('p', sample), why: 'line grammar: @sub key · + head | vi | en | example · x example · # note · ! wrong => right | vi | en · = collocations · > lessons · ~ register · ? quiz sentence · f formula · k keywords · ^ positions · & related; "[a|b|c]" = answer | distractors' }, { input: { kind: 'p', src: '+ orphan line\n@zz key\n! no arrow' }, out: U.parse('p', '+ orphan line\n@zz key\n! no arrow'), why: 'errors are collected, never thrown' }];
  out.usage.example = ['She is interested [in] art.', 'She stopped [to buy|buying|buy] water.', 'plain'].map(x => ({ input: x, out: U.example(x), why: 'example(): [answer|alt|alt] marks the focus part' }));
  out.usage.resolve = ['interested', 'interested in', 'Interests', 'relied', 'arriving', 'stopped', 'to arrive', 'affect', 'a bit', 'depend on', 'went', 'studies', 'hardly.', '', 'zzzz'].map(x => ({ input: x, out: U.resolve(x), why: 'resolve(): normalise → index key / id → verb base via LK_VERBS → plural/-ed/-ing rules → first word of a phrase; null = not covered' }));
  out.usage.suggest = ['inter', 'dep', 'on', 'affe', 'zz', ''].map(x => ({ input: x, n: 8, out: U.suggest(x, 8), why: 'suggest(): resolved key first, then keys starting with q (shortest first), then keys containing q' }));
  out.usage.near = ['intrested', 'dependd', 'adbice', 'xyzxyz'].map(x => ({ input: x, out: U.near(x, 6), why: 'near(): edit distance ≤ 2 (Levenshtein, length diff ≤ 2), closest first, max 6' }));
  out.usage.lookup = ['interested', 'affect', 'stop', 'hardly', 'zzzz'].map(k => { const r = U.lookup(k); return { input: k, out: { key: r.key, count: r.count, ...Object.fromEntries(['p', 'v', 'a', 's', 'c'].map(x => [x, r[x].map(e => e.key)])) }, why: 'lookup(): entries of every kind whose key or covered words (words(e)) include the key' }; });
  out.usage.entries = ['interested', 'stop', 'hardly', 'affect'].map(k => { const e = [['p', k], ['v', k], ['a', k], ['c', k]].map(([kind, key]) => U.byId(kind, key)).find(Boolean); return e && { input: k, out: brief(e), why: 'one full parsed entry (data file web/js/usage/<group>.js → LK_USAGE_SRC[kind] string → parse)' }; }).filter(Boolean);
  const stopE = U.byId('v', 'stop') || U.load('v')[0], intE = U.byId('p', 'interested');
  out.usage.quizItems = [intE, stopE].filter(Boolean).map(e => ({ input: { kind: e.kind, key: e.key }, out: U.quizItems(e), why: 'quizItems(): per example with [answer|alts] use alts; preposition entries get QUIZ_PREPS distractors (not their own preps); verb patterns get verbAlts via LK_VERBS unless the pattern is ambiguous (to/ing/bare/…); xid(q) = kind|key|item.h or @answer' }));
  out.usage.quiz = [{ seed: 1, n: 5 }, { seed: 42, n: 3 }].map(a => ({ input: { entries: ['p:interested', 'v:stop'], ...a }, out: U.quiz([intE, stopE].filter(Boolean), a.n, a.seed).map(q => ({ ...q, xid: U.xid(q) })), why: 'quiz(entries, n, seed): LCG rng x = (x*1664525 + 1013904223) >>> 0 / 2^32; shuffle; one question per entry per round; choices = answer + 3 shuffled distractors, then shuffled' }));
  out.usage.counts = { counts: U.counts(), index: { words: Object.keys(IDX.w).length, ids: Object.keys(IDX.id).length }, chunksOf: ['interested', 'affect'].map(k => ({ key: k, chunks: U.chunksOf(k) })), why: 'counts() = entries/items per kind; index LK_USAGE_IDX.w[word] = letters of the kinds that cover the word (p v a s c)' };
  out.usage.categories = { kinds: U.KINDS, subs: U.SUBS, preps: U.PREPS, vcodes: U.VCODES, list: Object.fromEntries(U.KINDS.map(k => [k, U.list(k).length])), shape: 'LK_USAGE_SRC[kind] = template string per group; files web/js/usage/{prep-adj,prep-verb,prep-noun → p, verb → v, adv → a, struct → s, pair → c}.js; index web/js/usage-index.js' };
  // ---- verbs ----
  const fm = o => JSON.parse(JSON.stringify(o));
  out.verb.resolve = ['go', 'went', 'gone', 'going', 'goes', 'studies', 'studied', 'looking up', 'gave up', 'can', 'ought to', 'Be', 'was', 'zorbling', 'x', '', 'to run', 'ran', 'lay', 'lain', 'lies'].map(x => ({ input: x, out: fm(V.resolve(x)), why: 'resolve(): irregular forms → base + from (past/pp/ing/s), regular endings, modal verbs, phrasal tail, alts for ambiguous forms; unknown/guess flags' }));
  out.verb.forms = [['go', 'UK'], ['study', 'UK'], ['travel', 'UK'], ['travel', 'US'], ['stop', 'UK'], ['be', 'UK'], ['learn', 'UK'], ['learn', 'US'], ['panic', 'UK'], ['dream', 'UK'], ['lie', 'UK'], ['use', 'UK'], ['laugh', 'UK']].map(([b, region]) => ({ input: { base: b, region }, out: fm(V.forms(b, { region })), why: 'forms(): V2/V3/-ing/-s lists with UK/US tags, spelling-rule codes (double, y-ies, td…), -ed/-s pronunciation (ipa + why), irregular/stative/transitive/passive flags' }));
  out.verb.table = [['go', 'UK'], ['travel', 'US'], ['know', 'UK']].map(([b, region]) => ({ input: { base: b, region }, out: fm(V.table(b, { region })), why: 'table(): 4 tense groups × tenses × 5 persons × affirmative/negative/question (+ passive rows, example, formula, flags rare/stative/dual/mustNote)' }));
  out.verb.mistakes = ['go', 'study', 'lie', 'make', 'zzz'].map(b => ({ input: b, out: V.mistakes(b), why: 'mistakes(): typical learner errors {wrong, right, code}' }));
  out.verb.suggest = ['go', 'wen', 'st', 'zz', 'be'].map(q => ({ input: q, n: 8, out: V.suggest(q, 8), why: 'suggest(q): the search-box list (base verbs + forms)' }));
  out.verb.modal = ['can', 'must', 'ought to', 'go'].map(b => ({ input: b, out: V.modal(b), why: 'modal(base) → [negative, contraction, past, alternative] or null' }));
  out.verb.verbOf = ['went', 'run'].map(w => ({ input: { word: w, pos: 'v' }, out: V.verbOf({ word: w, pos: 'v' }), why: 'verbOf(dictEntry): base verb when the entry is a verb (drives the "Chia động từ" button in #/dict)' }));
  const irr = V.irregularList();
  const landing = (pat, q) => irr.filter(x => (!pat || x.pattern === pat) && (!q || [x.base, ...x.past.map(y => y.w), ...x.pp.map(y => y.w)].some(w => w.startsWith(q)))).map(x => x.base);
  out.verb.irregular = { total: irr.length, sample: fm(irr.slice(0, 4)), patterns: Object.fromEntries(['AAA', 'ABB', 'ABA', 'ABC'].map(p => [p, landing(p, '').length])), filters: [['', ''], ['ABB', ''], ['', 'go'], ['ABC', 'be'], ['', 'zz']].map(([pat, q]) => ({ input: { pattern: pat, prefix: q }, n: landing(pat, q).length, first: landing(pat, q).slice(0, 6), why: 'landing table filter (verbs.js): pattern chip (AAA/ABB/ABA/ABC or all) AND (base or any past/pp form startsWith prefix)' })) };
  out.verb.pairs = { note: 'PAIRS ("Hay nhầm với") in verbs.js: see web/js/verbs.js PAIRS map' };
  return out;
}
async function dictPageCases() {
  const out = [];
  const L = ['web/js/verbs-core.js', 'web/js/usage-index.js'];
  const cases = [['curriculum', 'full entry for a lexicon word: examples de-duplicated (main example under the meaning; the bilingual list drops the sentence equal to it), POS blocks from senses + oxford (Vietnamese terms) or meanings fallback', NET.curriculum, 'vi'], ['blorptastic', 'Google-only word', NET.blorptastic, 'vi'], ['zzzqqq', 'not found → "Không tìm thấy" card', null, 'vi'], ['', 'no query → search form, sample words, recent chips', null, 'vi']];
  for (const [w, why, net, ml] of cases) {
    const P = await pageEnv('#/dict/' + w, L); const added = [], rewards = []; P.A.app.reward = r => rewards.push(r); P.A.app.parseHash = () => ({ arg: w }); P.A.app.extCta = async () => null; P.A.app.vimgReady = async () => null; P.A.app.notesReady = async () => null; P.A.app.guard = fn => fn;
    // the REAL Dict pipeline feeds the page (same offline network as the lookup vectors)
    const dsb = { console, Math, JSON, Promise, Object, Array, Map, Set, Error, RegExp, URL, TextEncoder, AbortController, encodeURIComponent, decodeURIComponent, Date: P.E.sb.Date, setTimeout: f => { setImmediate(f); return 0; }, clearTimeout() {}, localStorage: P.E.ls, navigator: { onLine: true }, location: P.E.sb.location, t, I18N: P.E.I18N, Core: P.E.Core, IELTS_DATA: P.E.data, App: { state: { settings: { aiLocal: false } } } };
    dsb.fetch = async url => { url = String(url); if (net && /src=gtx/.test(url) && /dt=bd/.test(url)) return J(200, net.gtx); if (net && /src=dapi/.test(url)) return J(200, net.dapi); if (/\/api\/img/.test(url)) return J(200, (net && net.img) || { none: 1 }); if (net && /tatoeba/.test(url)) return J(200, net.tato); return J(200, null); };
    dsb.self = dsb; dsb.window = dsb; vm.createContext(dsb); for (const f of ['web/js/verbs-core.js', 'web/js/lex.js', 'web/js/dictionary.js']) vm.runInContext(rd(f), dsb, { filename: f });
    P.E.sb.Dict = dsb.Dict; P.E.sb.Lex = undefined;
    vm.runInContext('1', P.E.sb); P.E.load('web/js/dict-page.js');
    await P.A.routes.dict(w); await settle(30);
    const h = P.E.dom.$('#result').innerHTML, r = { empty: /class="card empty"/.test(h), resultHtmlLength: undefined };
    r.word = (/class="entry-word"[^>]*>(.*?)<\/span>/.exec(h) || [])[1];
    r.meaning = (/<div class="vi">(.*?)<\/div>/.exec(h) || [])[1] || null;
    r.def = (/<div style="margin-top:\.4rem" lang="en">(.*?)<\/div>/.exec(h) || [])[1] || null;
    r.example = (/<div lang="en" dir="ltr">(.*?)<\/div>/.exec(h) || [])[1] || null;
    r.exampleTranslation = (/class="muted small" style="margin-top:\.25rem">(.*?) <span class="chip">(.*?)<\/span>/.exec(h) || []).slice(1);
    r.posBlocks = h.split('class="pos-block"').slice(1).map(b => ({ pos: (/<span class="chip pos">(.*?)<\/span>/.exec(b) || [])[1], vi: ((/<b class="vi">(.*?)<\/b>/.exec(b) || [])[1] || '').split(', ').filter(Boolean), defs: ((x) => x.split('<li>').slice(1))(b.split('<details')[0]).map(li => ({ def: li.split('<div')[0].replace(/<\/li>.*$/, ''), ex: (/<div class="ex small">“(.*?)”/.exec(li) || [])[1] || '' })) }));
    r.extraMeanings = (h.match(/<details/g) || []).length;
    r.bilingual = h.split('class="meaning"').slice(1).filter(x => /data-use-sent/.test(x)).map(x => ({ en: (/<div>(.*?) <button/.exec(x) || [])[1], vi: (/<div class="muted small">(.*?) <span/.exec(x) || [])[1] }));
    r.actions = { quickSave: /id="quickSave"/.test(h), saved: /entry-saved/.test(h), practiceSpeak: (/href="(#\/practice\/speak[^"]*)"/.exec(h) || [])[1] || null, verb: (/href="(#\/verb\/[^"]*)"/.exec(h) || [])[1] || null, usage: (/href="(#\/usage\/[^"]*)"/.exec(h) || [])[1] || null, saveCard: /id="saveCard"/.test(h) };
    r.recent = await P.E.Core.Store.get('recent', []); r.lookupReward = rewards;
    r.samples = [...h.matchAll(/href="#\/dict\/(\w+)"/g)].map(m => m[1]);
    if (r.actions.quickSave || r.actions.saveCard) { P.E.dom.$('#ctx').value = 'My own sentence with ' + w + '.'; await P.E.dom.$('#saveWord').onclick(); await settle(40); const c = (await P.E.Core.Cards.all())[w]; r.afterSave = c && { word: c.word, vi: c.vi, pos: c.pos, ex: c.ex, contexts: c.contexts.map(x => ({ text: x.text, title: x.title, source: x.source })), image: c.image, audio: c.audio, ipaUS: c.ipaUS, topic: c.topic }; }
    delete r.resultHtmlLength;
    out.push({ id: w || 'blank', why, input: { query: w, meanLang: ml }, out: r });
  }
  return out;
}


// ============================================================ #/review modes (study-modes.js: auto mode by FSRS difficulty, typing / listening → grade) ============================================================
async function modeCases(decks) {
  const E = mkEnv({ hash: '#/review' }), d = decks(E); await E.Core.Store.set('cards', keyed(E, d.P));
  const { app } = mkApp(E, { cards: await E.Core.Cards.all(), settings: {} });
  E.load('web/js/study-modes.js'); const M = E.sb.StudyModes;
  const mk = (srs, extra = {}) => ({ word: 'tuition', pos: 'n', vi: 'học phí', srs: { reps: 3, lapses: 0, D: 4, S: 5, last: NOW - DAY, interval: 4, ...srs }, ...extra });
  const out = { modes: M.MODES, auto: [], pick: [], gradeType: [], gradeAudio: [], norm: [], dist: [], trim: [], host: [] };
  for (const [id, srs] of [['hard-D8', { D: 8 }], ['lapses3', { lapses: 3 }], ['easy-reps2-mod', { reps: 2, D: 4 }], ['easy-reps4-mod1', { reps: 4, D: 4 }], ['mid', { reps: 1, D: 6 }], ['legacy-ef', { D: undefined, ef: 2.2 }]]) out.auto.push({ id, input: srs, out: M.auto(mk(srs)), why: 'auto(card): lapses ≥3 or D ≥ 7.5 → flip · reps ≥2 & D ≤5 & lapses ≤1 → (reps%3===1 ? audio : type) · else audio; D missing → (3-ef)*6' });
  for (const [id, c, want, rev] of [['new-card', mk({ reps: 0, last: null }), 'auto', false], ['reverse', mk({}), 'auto', true], ['forced-type', mk({ reps: 3 }), 'type', false], ['forced-audio', mk({}), 'audio', false], ['type-too-long', mk({ reps: 3 }, { word: 'x'.repeat(31) }), 'type', false], ['type-no-letters', mk({ reps: 3 }, { word: '123' }), 'type', false], ['auto-easy', mk({ reps: 3, D: 3 }), 'auto', false]]) { const r = M.pick(c, want, rev); out.pick.push({ id, input: { card: { word: c.word, srs: c.srs }, want, rev }, out: { mode: r, optionsFound: !!c._opt, optionCount: c._opt ? c._opt.all.length : 0 }, why: 'pick(): new card or reverse → flip; forced mode kept unless type is impossible (word >30 chars or no letters) → audio; audio needs 3 other distinct meanings (same POS first) else flip' }); }
  for (const dist of [0, 1, 2, 3]) for (const [len, hints, ms, gaveUp] of [[7, 0, 1000, false], [7, 0, 9000, false], [7, 2, 1000, false], [3, 0, 500, false], [10, 0, 100, true], [8, 0, 3000, false]]) out.gradeType.push({ input: { dist, len, hints, ms, gaveUp }, out: M.gradeType({ dist, len, hints, ms, gaveUp }), why: 'gradeType: gaveUp or dist > tol(len: ≥8→2, ≥4→1, else 0) → 0 · any typo or ≥2 hints → 1 · no hints & ms < 2500+350*len → 3 · else 2' });
  for (const [ok, replays, ms] of [[false, 0, 1000], [true, 2, 1000], [true, 0, 4000], [true, 0, 6000], [true, 1, 1000]]) out.gradeAudio.push({ input: { ok, replays, ms }, out: M.gradeAudio({ ok, replays, ms }), why: 'gradeAudio: wrong → 0 · ≥2 replays → 1 · no replay & ms < 5000 → 3 · else 2' });
  for (const x of ['Café', 'well-known', 'don’t', 'A_B/C', 'Hello, World!', '  x  y ']) out.norm.push({ input: x, out: M.norm(x), why: 'typing compare: NFD strip accents, lowercase, curly→straight quotes, - _ / → space, drop .,!?;:"“”(), collapse spaces' });
  for (const [a, b] of [['kitten', 'sitting'], ['', 'abc'], ['same', 'same'], ['cat', 'cut']]) out.dist.push({ input: [a, b], out: M.dist(a, b), why: 'Levenshtein distance' });
  for (const [text, word] of [['short text with tuition in it', 'tuition'], ['x '.repeat(150) + 'tuition ' + 'y '.repeat(150), 'tuition']]) out.trim.push({ input: { text: text.length > 80 ? text.slice(0, 40) + '…(' + text.length + ' chars)' : text, word, max: 200 }, out: M.trim(text, word), why: 'trim(): ≤ 200 chars, cut at word boundaries around the target word, "…" at cut ends' });
  for (const x of ['https://www.youtube.com/watch?v=abc', 'example.com/post?x=1', '']) out.host.push({ input: x, out: M.host(x), why: 'source host shown under "Câu của bạn" (scheme/www/path stripped, ≤60)' });
  void app; return out;
}

export async function vocabVectors() {
  process.env.TZ = 'UTC';
  const E0 = mkEnv(), D0 = fixtureDecks(E0);
  const decks = E => { const d = fixtureDecks(E), A = d.A; return { A, B: d.B, P: [...A, ...d.B], tiny: A.slice(6, 8), none: [], future: A.filter(c => c.srs.last && c.srs.due > NOW + DAY).map(c => ({ ...c })), forget: A.slice(0, 4).map((c, i) => ({ ...c, srs: i < 2 ? { ...c.srs, reps: 3, interval: 30, S: 5, last: NOW - 25 * DAY, due: NOW - 5 * DAY } : c.srs })) }; };
  const out = { _doc: 'GENERATED by scripts/native/gen-vocab.mjs – see docs/specs/native-m2-vectors.md "M3 vectors". Each case: id, why, input, out.', now: NOW, inputs: { A: D0.A, B: D0.B } };
  const rv = await reviewCases(decks);
  out.review = rv.cases; out.reviewSession = rv.sessions; out.reviewModes = await modeCases(decks);
  out.mistakes = await mistakeCases();
  Object.assign(out, await deckLibraryTopic(decks));
  out.dict = await dictCases();
  out.practice = await practiceCases(decks);
  out.writing = await writingCases(); const MW = out.writing._mini; delete out.writing._mini;
  Object.assign(out, await usageVerbCases());
  out.dict.page = await dictPageCases();
  const MD = miniData(); out.data = { _doc: 'REAL records cut down so the ports run every screen with no web files: catalog = mini word library (groups + topics + words, load order), writing = ideas/letters/paraphrase pairs/models/prompts/task1 sets used by the writing vectors', catalog: { groups: MD.GROUPS, topics: MD.TOPICS }, writing: MW };
  return rigVectorText(out);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const s = await vocabVectors(); console.log(s.length, 'bytes');
  if (process.argv.includes('--print')) console.log(s.slice(0, 6000));
}

// Bảng động từ (hằng trong IIFE của verbs-core.js): chạy đúng đoạn khai báo của web, xuất nguyên giá trị → native/shared/gen/verbs.json (port đọc tệp này, không chép tay).
export function verbsTables() {
  const src = fs.readFileSync('web/js/verbs-core.js', 'utf8');
  const a = src.indexOf('const IRR ='), b = src.indexOf('const IRREG =');
  if (a < 0 || b < a) throw new Error('verbs-core.js: không tìm thấy khối bảng IRR…IRREG');
  const NAMES = ['IRR', 'COMMON', 'MODALS', 'INTRANS', 'STATIVE', 'DUAL', 'DOUBLE', 'L_BOTH', 'L_NONE', 'L_UKX', 'NOPASS', 'UK_DOUBLE', 'SE_S', 'GH_F', 'K_END'];
  const t = vm.runInNewContext(`(()=>{${src.slice(a, b)};return {${NAMES.join(',')}}})()`);
  const out = {};
  for (const k of NAMES) out[k] = t[k] && t[k].constructor.name === 'Set' ? [...t[k]] : t[k];
  out.MODALS_ORDER = Object.keys(t.MODALS);                // JSON objects are unordered on Swift: suggest() lists modals in this order
  // example sentences + small lookup tables of the same file (the ports read them from here; nothing is copied by hand)
  const EXN = ['OBJ', 'COMP', 'TIME', 'SUBJ', 'MIS', 'MODAL_MIS', 'SAY_S', 'IPA_END', 'BE', 'AUX', 'NEG', 'CON'];
  const ex = vm.runInNewContext(`(()=>{${[...EXN.map(k => slice(src, new RegExp('const ' + k + ' = '))), slice(src, /const BE_PRES = /)].join('\n')};return {${[...EXN, 'BE_PRES', 'BE_PAST'].join(',')}}})()`);
  Object.assign(out, ex);
  out.VI_TYPO = vm.runInNewContext(`(()=>{${slice(fs.readFileSync('web/js/dictionary.js', 'utf8'), /const VI_TYPO = /)};return VI_TYPO})()`);   // hỏi/ngã fixes of Google's Vietnamese (Dict.fixVi)
  const ph = fs.readFileSync('web/js/phrases.js', 'utf8');   // phrases.js lemmatizer data (App.lemma): irregular rows, extra base forms, words never reduced
  out.LEMMA = vm.runInNewContext(`(()=>{${slice(ph, /const IRR = /)};const BASE_EXTRA = ${/Object\.assign\(BASE, (\{.*\})\);/.exec(ph)[1]};${slice(ph, /const KEEP = /)};return { IRR, BASE_EXTRA, KEEP: [...KEEP] }})()`);
  out.FORMS = vm.runInNewContext(`(()=>{${slice(fs.readFileSync('web/js/phrases-model.js', 'utf8'), /const FORMS = /)};return FORMS})()`);   // grammar-exercise form families
  return JSON.stringify(out, null, 0) + '\n';
}
