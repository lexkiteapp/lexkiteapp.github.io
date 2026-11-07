/* Reference "web client" for the native data contract (docs/specs/native-apps.md §4).
 * Runs the REAL web code – web/js/core.js (Store, Cards, SRS, Stats), web/js/data.js (library INDEX for slim/fat),
 * web/js/game.js (Game.get), web/js/sync.js (mergeIn, slim/fat, snapLocal, mergeCards/Stats/Game) and, for the add-on,
 * extension/content.js (lkBridge 'get'/'set') – inside node:vm sandboxes with a controllable clock. Nothing here re-implements
 * merge logic: a "sync" is the real Sync.now() → driveRun → SyncDrive.cycle(ctx), where only the Drive TRANSPORT is replaced
 * by an in-memory document (ctx.apply(remote) = fat + mergeIn, ctx.build() = snapLocal). Dependency-free (node:vm only).
 * Used by scripts/native/gen.mjs (vectors) and scripts/test/sync-cross-client.mjs (checks). */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { fakeIndexedDB, memStorage } from './fake-idb.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SRC = {};
const code = f => (SRC[f] ||= src(f));
export const ORIGIN = 'https://lexkite.com';
export const DOC_KEYS = ['cards', 'deleted', 'stats', 'game', 'settings', 'settingsAt'];
/** Library packs the web loads BEFORE every merge (sync.js: App.need('words', 'tsl')) – read from web/js/app.js, data files only (js/lib/*).
 * slim()/fat() depend on IELTS_DATA.INDEX: a card whose word is in these packs travels as L:1 without its library fields. */
export const LEX_FILES = (() => {
  const app = src('web/js/app.js'), list = k => { const m = app.match(new RegExp(`\\b${k}: (\\[[^\\]]+\\])`)); if (!m) throw new Error('web-ref: App.need pack "' + k + '" not found in web/js/app.js'); return JSON.parse(m[1].replace(/'/g, '"')); };
  return [...list('words'), ...list('tsl')].filter(f => f.startsWith('js/lib/')).map(f => 'web/' + f);
})();
const noop = () => {};
const tick = () => new Promise(r => setImmediate(r));

/** Clock shared by a sandbox: Date.now()/new Date() return clock.t (ms). */
function clockDate(clock) {
  return class extends Date {
    constructor(...a) { if (a.length) super(...a); else super(clock.t); }
    static now() { return clock.t; }
  };
}

/** Extract `function name(...) {…}` / `const name = …;` source from a script (brace-matched), to evaluate inside its own sandbox. */
export function pick(source, re) {
  const m = re.exec(source); if (!m) throw new Error('web-ref: not found ' + re);
  if (!m[0].startsWith('function')) { const e = source.indexOf('\n', m.index); return source.slice(m.index, e).replace(/\/\/[^'"`]*$/, ''); } // one-line const (drop trailing comment)
  let i = source.indexOf('{', m.index + m[0].length - 1), depth = 0;
  for (; i < source.length; i++) { const c = source[i]; if (c === '{') depth++; else if (c === '}' && --depth === 0) return source.slice(m.index, i + 1); }
  throw new Error('web-ref: unbalanced ' + re);
}

/**
 * One web client (a browser/app install). opts: { now, ls?: {key: rawString}, idb?: seed | true, bus?, uid? }
 * Returns helpers: build() → Doc, apply(doc), load(doc), sync(server) → server', edit/remove (real Cards.add/patch/remove), raw().
 */
export async function webClient(opts = {}) {
  const clock = { t: opts.now ?? Date.UTC(2026, 2, 1) };
  const ls = memStorage({ 'lk.syncDrive': '1', ...(opts.ls || {}) });
  const listeners = {};
  const user = { uid: opts.uid || 'test-uid-0001', email: 'test@example.invalid', displayName: 'Test', providerData: [{ providerId: 'google.com' }], getIdToken: async () => 'fake-token' };
  let authCb = null, initT = null, cycleImpl = async () => 'ok', ctx = null;
  const sb = {
    console, Math, JSON, structuredClone, Promise, Object, Array, Map, Set, Error, TextEncoder, TextDecoder,
    Date: clockDate(clock), localStorage: ls, navigator: { onLine: true, language: 'vi' },
    location: { hostname: 'lexkite.com', origin: ORIGIN, protocol: 'https:', host: 'lexkite.com', href: ORIGIN + '/app/#/home', hash: '#/home', search: '', pathname: '/app/' },
    setTimeout: (fn, ms) => { if (ms === 1200 && !initT) { initT = fn; return 1; } return 0; }, clearTimeout: noop, setInterval: () => 0, clearInterval: noop, requestAnimationFrame: noop, scrollTo: noop, scrollY: 0,
    addEventListener: (ev, fn) => { (listeners[ev] ||= []).push(fn); }, removeEventListener: (ev, fn) => { listeners[ev] = (listeners[ev] || []).filter(f => f !== fn); },
    document: { hidden: false, addEventListener: noop, removeEventListener: noop, body: { contains: () => false }, querySelector: () => null, createElement: () => ({}), head: { appendChild: noop } },
    t: s => s, I18N: { lang: () => 'vi' }, confirm: () => true,
    UI: { $: () => null, esc: s => String(s), toast: noop, icon: () => '', modal: () => null, closeModal: noop },
    App: { state: {}, updateChrome: noop, load: async () => {}, route: noop, need: async () => {} },
    FIREBASE_CONFIG: { apiKey: 'test-only' }, LK_SYNC: { drive: true },
    firebase: { initializeApp: () => ({}), auth: Object.assign(() => ({ currentUser: user, onAuthStateChanged: cb => { authCb = cb; }, getRedirectResult: async () => null }), { GoogleAuthProvider: class { addScope() {} setCustomParameters() {} } }) },
    SyncDrive: {
      tok: { get: () => 'fake-drive-token', set: noop, clear: noop },
      load: async () => ({ on: 1, scope: 'ok', fileId: 'mem', nextAt: 0, fail: 0 }), save: async () => {},
      cfg: () => ({ every: 600e3, cap: 1200, stale: 12 * 3600e3, bridgeDays: 30 }),
      cycle: async (c, why) => { ctx = c; return cycleImpl(c, why); },
    },
  };
  if (opts.idb) sb.indexedDB = opts.idb === true ? fakeIndexedDB() : opts.idb;
  sb.self = sb; sb.window = sb; sb.globalThis = sb;
  sb.postMessage = (data, origin) => (opts.bus ? opts.bus.post('web', data, origin) : undefined);
  vm.createContext(sb);
  const win = vm.runInContext('window', sb);
  for (const f of ['web/js/core.js', 'web/js/data.js', ...LEX_FILES, 'web/js/game.js', 'web/js/sync.js']) vm.runInContext(code(f), sb, { filename: f });
  // slim/fat are internal to sync.js: evaluate their exact source in this sandbox (same Cards/IELTS_DATA)
  const s = code('web/js/sync.js');
  const lib = vm.runInContext(`(function () { const { Cards } = Core; ${pick(s, /const LIB_FIELDS = /)} ${pick(s, /function slim\(c\) /)} ${pick(s, /function fat\(o\) /)} ${pick(s, /const NB = /)} ${pick(s, /const bucketOf = /)} ${pick(s, /const hash = /)} return { slim, fat, bucketOf, hash, NB }; })()`, sb);
  if (!initT) throw new Error('web-ref: sync.js init timer not scheduled (supported=false?)');
  initT(); for (let i = 0; i < 20 && !authCb; i++) await tick();
  if (!authCb) throw new Error('web-ref: firebase auth not initialised');
  await authCb(user);
  for (let i = 0; i < 50 && !ctx; i++) await tick();
  if (!ctx || sb.Sync.mode !== 'drive') throw new Error('web-ref: Drive context not captured (mode ' + sb.Sync.mode + ')');
  const { Core, Sync } = sb;
  const strip = snap => { const o = {}; for (const k of DOC_KEYS) o[k] = snap[k]; return JSON.parse(JSON.stringify(o)); };
  const settle = async () => { for (let i = 0; i < 30; i++) await tick(); if (opts.bus) await opts.bus.idle(); };
  const api = {
    sb, win, clock, ls, Core, Sync, lib, user, listeners, m: Sync._m,
    at(t) { clock.t = t; return api; },
    /** Doc = snapLocal() without v/at – exactly what the web writes to Drive appDataFolder. */
    async build() { return strip(await ctx.build()); },
    /** Real mergeIn of a remote Doc (fat → mergeCards/Stats/Game, settings by settingsAt, deleted = max, pruned 90 d). */
    async apply(doc) { await ctx.apply(JSON.parse(JSON.stringify(doc))); await settle(); },
    /** Put a Doc into local storage as this install would hold it (cards fat via the real fat() + normalize). */
    async load(doc) {
      await Core.Store.set('cards', {});
      await ctx.apply({ cards: JSON.parse(JSON.stringify(doc.cards || {})) });
      for (const k of DOC_KEYS.slice(1)) if (doc[k] !== undefined) await Core.Store.set(k, JSON.parse(JSON.stringify(doc[k])));
      await settle();
    },
    /** One sync with an in-memory Drive file (null = no file yet). Real Sync.now(): apply remote, build, write. */
    async sync(server) {
      let out = server;
      cycleImpl = async c => { if (server) await c.apply(JSON.parse(JSON.stringify(server))); out = strip(await c.build()); return 'ok'; };
      const r = await Sync.now(); await settle(); cycleImpl = async () => 'ok';
      if (r !== 'ok') throw new Error('web-ref: sync returned ' + r);
      return out;
    },
    /** Learner edit with the real Core.Cards API at clock t: new key → Cards.add({word}); then Cards.patch(shallow-assign). */
    async edit(key, patch = {}, t = clock.t) {
      clock.t = t;
      const [tl, word] = key.includes(':') && /^[a-z]{2,3}:/.test(key) ? [key.split(':')[0], key.slice(key.indexOf(':') + 1)] : ['en', key];
      const cards = await Core.Cards.all();
      if (!cards[key]) { const libE = !patch.tl && tl === 'en' && sb.IELTS_DATA.INDEX[word.toLowerCase()]; await Core.Cards.add({ ...(libE || {}), word: patch.word || word, ...(tl !== 'en' ? { tl } : {}) }); }
      const p = JSON.parse(JSON.stringify(patch));
      await Core.Cards.patch(patch.word || word, c => Object.assign(c, p), tl);
      await settle();
    },
    async remove(key, t = clock.t) { clock.t = t; const [tl, word] = /^[a-z]{2,3}:/.test(key) ? [key.split(':')[0], key.slice(key.indexOf(':') + 1)] : ['en', key]; await Core.Cards.remove(word, tl); await settle(); },
    raw: () => ls._dump(),
    /** Fresh install state (same sandbox, empty storage) – lets the generator reuse one client for many merges. */
    reset(t = clock.t) { ls.clear(); ls.setItem('lk.syncDrive', '1'); clock.t = t; return api; },
    deliver(data) { const ev = { source: win, origin: ORIGIN, data }; return Promise.all((listeners.message || []).map(f => f(ev))); },
  };
  if (opts.bus) opts.bus.web = api;
  return api;
}

/** The Chrome add-on on the same machine: chrome.storage.local (cards/stats/deleted) + the REAL extension/content.js bridge
 * + the add-on's own web/js/core.js (Store → chrome.storage) for edits. The bridge talks to `web` over window.postMessage. */
export async function addonClient(bus, opts = {}) {
  const clock = { t: opts.now ?? Date.UTC(2026, 2, 1) };
  const mem = {};
  const cl = v => JSON.parse(JSON.stringify(v));
  const chrome = {
    runtime: { id: 'test-addon', getManifest: () => ({ version: '0.0.0-test' }), sendMessage: async () => ({}), onMessage: { addListener: noop } },
    storage: { local: { get: async k => { const o = {}; for (const x of (k == null ? Object.keys(mem) : [].concat(k))) if (x in mem) o[x] = cl(mem[x]); return o; }, set: async o => { Object.assign(mem, cl(o)); }, remove: async k => { for (const x of [].concat(k)) delete mem[x]; } }, onChanged: { addListener: noop } },
    i18n: { getUILanguage: () => 'vi' },
  };
  const deep = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : k === 'then' ? undefined : deep()), apply: () => deep(), construct: () => deep() });
  const listeners = {};
  const cs = { chrome, console, Math, JSON, Date: clockDate(clock), location: { hostname: 'lexkite.com', origin: ORIGIN, href: ORIGIN + '/app/' }, navigator: { language: 'vi' }, document: deep(),
    addEventListener: (ev, fn) => { (listeners[ev] ||= []).push(fn); }, removeEventListener: noop, setTimeout: () => 0, clearTimeout: noop, CustomEvent: class {}, MutationObserver: class { observe() {} disconnect() {} }, getComputedStyle: deep, matchMedia: () => ({ matches: false, addEventListener: noop }) };
  cs.window = cs; cs.top = cs; cs.self = cs;
  cs.postMessage = (data, origin) => bus.post('addon', data, origin);
  vm.createContext(cs);
  const cwin = vm.runInContext('window', cs);
  // add-on pages (popup/new tab/background) use the same core.js with chrome.storage.local
  const core = { chrome, console, Math, JSON, structuredClone, Date: clockDate(clock), navigator: {}, setTimeout, clearTimeout };
  core.self = core; core.globalThis = core; vm.createContext(core);
  for (const f of ['extension/app/js/data.js', 'extension/app/js/core.js', 'extension/app/js/ctx.js']) vm.runInContext(code(f), core, { filename: f }); // = extension/background.js importScripts order
  bus.addon = { deliver: data => Promise.all((listeners.message || []).map(f => f({ source: cwin, origin: ORIGIN, data }))) };
  vm.runInContext(code('extension/content.js'), cs, { filename: 'extension/content.js' }); // posts lkBridge 'hello' → web extReady
  await bus.idle();
  const C = core.Core;
  const keyParts = key => (/^[a-z]{2,3}:/.test(key) ? [key.split(':')[0], key.slice(key.indexOf(':') + 1)] : ['en', key]);
  return {
    mem, clock, Core: C,
    async edit(key, patch = {}, t = clock.t) {
      clock.t = t; const [tl, word] = keyParts(key);
      if (!(await C.Cards.all())[key]) { const libE = tl === 'en' && core.IELTS_DATA.INDEX[word.toLowerCase()]; await C.Cards.add({ ...(libE || {}), word, ...(tl !== 'en' ? { tl } : {}) }); }
      const p = cl(patch); await C.Cards.patch(word, c => Object.assign(c, p), tl);
    },
    async remove(key, t = clock.t) { clock.t = t; const [tl, word] = keyParts(key); await C.Cards.remove(word, tl); },
    store: () => cl({ cards: mem.cards || {}, deleted: mem.deleted || {}, stats: mem.stats || { days: {} } }),
  };
}

/** window.postMessage bus shared by a web page and the add-on content script on the same tab. */
export function messageBus() {
  const pending = new Set();
  const bus = {
    web: null, addon: null,
    post(from, data) {
      const p = (async () => { await tick(); await Promise.all([bus.web && bus.web.deliver(data), bus.addon && bus.addon.deliver(data)]); })();
      pending.add(p); p.finally(() => pending.delete(p)); return undefined;
    },
    async idle() { for (let i = 0; i < 50; i++) { await tick(); if (!pending.size) { await tick(); if (!pending.size) return; } else await Promise.all([...pending]); } },
  };
  return bus;
}

/** Doc for the add-on store, in the same slim form (cards via the web slim()). */
export function slimCards(ref, cards) { const o = {}; for (const k of Object.keys(cards).sort()) o[k] = ref.lib.slim(cards[k]); return JSON.parse(JSON.stringify(o)); }
