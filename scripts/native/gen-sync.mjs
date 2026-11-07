/* Native data contract generator (docs/specs/native-apps.md §4, C02 + C03) – called by scripts/native/gen.mjs.
 * Every expected value is produced by the REAL web code through scripts/native/web-ref.mjs (vm sandboxes, fixed clock):
 *   contract.json         JSON Schema of the sync doc, card fields derived from real Cards.make/SRS/slim output + wire constants/vectors
 *   vectors/sync.json     merge cases (local, remote → out = real mergeIn + snapLocal) + multi-client scenarios (web/iOS/Android/add-on)
 *   vectors/migration.json + migration-export.js   Capacitor IndexedDB/localStorage → Doc (real core.js Store/normalize over the export)
 * Fixtures are synthetic (no real learner data). */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { webClient, addonClient, messageBus, slimCards, ROOT, pick, DOC_KEYS, LEX_FILES } from './web-ref.mjs';
import { fakeIndexedDB, memStorage } from './fake-idb.mjs';

export const NOW = Date.UTC(2026, 2, 1, 12, 0, 0); // fixed "now" of every vector (natives inject this clock)
const D = 864e5, H = 36e5, M = 6e4;
const T = d => NOW - Math.round(d * D);
const day = t => new Date(t).toISOString().slice(0, 10);
const cl = v => JSON.parse(JSON.stringify(v));
const split = key => (/^[a-z]{2,3}:/.test(key) ? [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)] : ['en', key]);
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// ---------- fixture docs, built through the real Cards API ----------
async function makeDoc(c, spec = {}) {
  c.reset(T(80));
  const INDEX = c.sb.IELTS_DATA.INDEX;
  for (const x of spec.cards || []) {
    const [tl, word0] = split(x.key), word = x.word || word0;
    const libE = tl === 'en' && INDEX[word.toLowerCase()];
    if (x.lib === true && !libE) throw new Error(`fixture: "${word}" expected in the web library (web/js/data.js)`);
    if (x.lib === false && libE) throw new Error(`fixture: "${word}" is a library word – pick a custom word`);
    const entry = { ...(libE || { word, vi: x.vi ?? 'nghĩa của ' + word }), word, ...(tl !== 'en' ? { tl } : {}) };
    const ctx = x.ctx || [];
    c.at(x.at); await c.Core.Cards.add(entry, ctx[0]);
    for (let i = 1; i < ctx.length; i++) { c.at(x.at + i * M); await c.Core.Cards.add(entry, ctx[i]); }
    for (const [g, t] of x.reviews || []) { c.at(t); await c.Core.Cards.patch(word, cc => { cc.srs = c.Core.SRS.review(cc.srs, g, t, true); }, tl); }
    if (x.patch) { c.at(x.patchAt ?? x.at + M); const p = cl(x.patch); await c.Core.Cards.patch(word, cc => Object.assign(cc, p), tl); }
  }
  const S = c.Core.Store;
  if (spec.deleted) await S.set('deleted', spec.deleted);
  if (spec.stats) await S.set('stats', spec.stats);
  if (spec.game) await S.set('game', spec.game);
  if (spec.settings) await S.set('settings', spec.settings);
  if (spec.settingsAt != null) await S.set('settingsAt', spec.settingsAt);
  c.at(NOW);
  return c.build();
}
export async function mergeDocs(c, L, R) { c.reset(NOW); await c.load(L); await c.apply(R); return c.build(); }

// review history helper: grades at successive days
const revs = (start, grades, gapDays = 2) => grades.map((g, i) => [g, start + i * gapDays * D]);
const ctxs = (n, tag) => Array.from({ length: n }, (_, i) => ({ text: `${tag} sentence ${i + 1} from a news article.`, source: `https://news.example.org/${tag}/${i + 1}`, title: `${tag} ${i + 1}` }));
const hours = seed => Array.from({ length: 24 }, (_, i) => (i * seed + 3) % 7);
const game = o => ({ xp: 0, days: {}, total: {}, best: {}, badges: {}, ...o });

function mergeSpecs() {
  const L = [], R = [], add = (name, l, r) => { L.push(name); R.push([name, l, r]); };
  const c1 = (key, at, o = {}) => ({ key, at, ...o });
  add('both sides empty', {}, {});
  add('local empty (new install pulls account)', {}, { cards: [c1('curriculum', T(30), { lib: true, reviews: revs(T(30), [2, 2, 3]) }), c1('kerfuffle', T(20), { lib: false })], stats: { days: { [day(T(2))]: 14 }, newToday: { day: day(T(2)), n: 3 } } });
  add('remote empty (first push)', { cards: [c1('brouhaha', T(10), { lib: false, reviews: revs(T(10), [2, 3]) })] }, {});
  add('disjoint cards union', { cards: [c1('hullabaloo', T(12), { lib: false })] }, { cards: [c1('gobbledygook', T(11), { lib: false })] });
  add('same card: remote newer review wins', { cards: [c1('pollution', T(40), { lib: true, reviews: revs(T(40), [2, 2]) })] }, { cards: [c1('pollution', T(40), { lib: true, reviews: revs(T(40), [2, 2, 0, 2]) })] });
  add('same card: local newer edit wins', { cards: [c1('kerfuffle', T(20), { lib: false, patch: { note: 'local note' }, patchAt: T(1) })] }, { cards: [c1('kerfuffle', T(20), { lib: false, patch: { note: 'remote note' }, patchAt: T(5) })] });
  add('same card: equal activity → stable-string tie-break', { cards: [c1('brouhaha', T(9), { lib: false, patch: { note: 'aaa' }, patchAt: T(3) })] }, { cards: [c1('brouhaha', T(9), { lib: false, patch: { note: 'zzz' }, patchAt: T(3) })] });
  add('same card: contexts union (winner first)', { cards: [c1('sustainable', T(25), { lib: true, ctx: ctxs(2, 'local') })] }, { cards: [c1('sustainable', T(25), { lib: true, ctx: ctxs(2, 'remote'), reviews: revs(T(20), [2]) })] });
  add('same card: contexts union capped at 5', { cards: [c1('well-being', T(25), { lib: true, ctx: ctxs(4, 'mine') })] }, { cards: [c1('well-being', T(26), { lib: true, ctx: ctxs(4, 'theirs') })] });
  add('remote tombstone newer than local edit → card removed', { cards: [c1('hullabaloo', T(30), { lib: false, patch: { note: 'edited' }, patchAt: T(8) })] }, { deleted: { hullabaloo: T(4) } });
  add('local edit newer than remote tombstone → card kept', { cards: [c1('hullabaloo', T(30), { lib: false, patch: { note: 'edited after delete' }, patchAt: T(2) })] }, { deleted: { hullabaloo: T(4) } });
  add('local tombstone beats older remote card', { deleted: { gobbledygook: T(3) } }, { cards: [c1('gobbledygook', T(30), { lib: false, reviews: revs(T(30), [2, 2]) })] });
  add('remote re-add newer than local tombstone', { deleted: { gobbledygook: T(9) } }, { cards: [c1('gobbledygook', T(5), { lib: false })] });
  add('tombstones on both sides → max time', { deleted: { a1: T(10), b2: T(3) } }, { deleted: { a1: T(6), c3: T(7) } });
  add('tombstone older than 90 days is pruned', { deleted: { ancient: NOW - 91 * D, recent: T(89) } }, { deleted: { old2: NOW - 120 * D } });
  add('settings: remote settingsAt newer wins', { settings: { dailyGoal: 20, accent: 'en-GB' }, settingsAt: T(10) }, { settings: { dailyGoal: 40, accent: 'en-US' }, settingsAt: T(2) });
  add('settings: local settingsAt newer kept', { settings: { dailyGoal: 30, reminderTime: '07:30' }, settingsAt: T(1) }, { settings: { dailyGoal: 10 }, settingsAt: T(6) });
  add('settings: equal settingsAt → local kept', { settings: { dailyNew: 5 }, settingsAt: T(4) }, { settings: { dailyNew: 15 }, settingsAt: T(4) });
  add('settings: remote without settingsAt ignored', { settings: { autoSpeak: false } }, { settings: { autoSpeak: true } });
  add('stats: streak days max per day', { stats: { days: { [day(T(3))]: 10, [day(T(2))]: 4 }, newToday: { day: day(T(2)), n: 2 } } }, { stats: { days: { [day(T(2))]: 9, [day(T(1))]: 21 }, newToday: { day: day(T(1)), n: 6 } } });
  add('stats: newToday same day → max n', { stats: { days: { [day(NOW)]: 5 }, newToday: { day: day(NOW), n: 7 } } }, { stats: { days: { [day(NOW)]: 8 }, newToday: { day: day(NOW), n: 4 } } });
  add('stats: study hours merged by max', { stats: { days: {}, newToday: { day: '', n: 0 }, hours: hours(3) } }, { stats: { days: {}, newToday: { day: '', n: 0 }, hours: hours(5) } });
  add('stats: one side without hours', { stats: { days: { [day(T(1))]: 3 }, newToday: { day: day(T(1)), n: 1 }, hours: hours(2) } }, { stats: { days: { [day(T(1))]: 2 }, newToday: { day: day(T(1)), n: 1 } } });
  add('game: xp max, days/total per metric max', { game: game({ xp: 1200, days: { [day(T(1))]: { xp: 60, reviews: 30 } }, total: { reviews: 900, newWords: 120 } }) }, { game: game({ xp: 1350, days: { [day(T(1))]: { xp: 40, reviews: 45, quizzes: 2 }, [day(NOW)]: { xp: 20 } }, total: { reviews: 850, newWords: 140, quizzes: 9 } }) });
  add('game: badges union', { game: game({ xp: 10, badges: { first: T(30), streak3: T(20) } }) }, { game: game({ xp: 5, badges: { first: T(31), words50: T(9) } }) });
  add('game: best match = min time', { game: game({ best: { match: 31 } }) }, { game: game({ best: { match: 24 } }) });
  add('game: unit scores max + freezes from higher-xp side', { game: game({ xp: 500, unitDone: { 'ngsl1.1': 80, 'ngsl1.2': 95 }, freezes: 1, freezeAt: T(9), frozen: { [day(T(9))]: 1 } }) }, { game: game({ xp: 800, unitDone: { 'ngsl1.1': 100 }, freezes: 3, freezeAt: T(4), frozen: { [day(T(4))]: 1 } }) });
  add('game: skill scoreboards (listen/grammar/pron/toeic/rtype)', { game: game({ xp: 1, listenDone: { l1: 70, l2: 90 }, grammarDone: { g1: 3 }, pronDone: { p1: 81 }, listenBest: { l1: 12 }, rtype: { r1: { t: T(5), v: 4 } }, toeicBest: { total: 805, l: 400, r: 405 }, readDone: { rd1: T(6) } }) }, { game: game({ xp: 2, listenDone: { l1: 85 }, grammarDone: { g1: 5, g2: 1 }, pronDone: { p2: 77 }, listenBest: { l2: 9 }, rtype: { r1: { t: T(2), v: 6 }, r2: { t: T(8), v: 1 } }, toeicBest: { total: 760, l: 380, r: 380 }, readDone: { rd2: T(3) } }) });
  add('game: retention (ret) events/frame merge', { game: game({ xp: 3, ret: { ms: { m7: T(10) }, own: { o1: 1 }, evDone: { e1: T(9) }, ev: { e2: [day(T(3)), day(T(1))] }, opened: T(2), frame: 'calm', frameAt: T(5) } }) }, { game: game({ xp: 4, ret: { ms: { m30: T(1) }, own: { o2: 1 }, evDone: {}, ev: { e2: [day(T(2)), day(T(1))], e3: [day(NOW)] }, opened: T(1), frame: 'bold', frameAt: T(3) } }) });
  add('game: only one side has ret', { game: game({ xp: 9, ret: { ms: {}, own: {}, evDone: {}, ev: {}, opened: T(4), frame: '', frameAt: 0 } }) }, { game: game({ xp: 8 }) });
  add('unicode words + target-language cards', { cards: [c1('naïve', T(14), { lib: false, vi: 'ngây thơ' }), c1('ja:食べる', T(13), { vi: 'ăn' }), c1('café', T(12), { lib: true, patch: { note: 'cà phê ☕ – “quán nhỏ”' } })] }, { cards: [c1('naïve', T(14), { lib: false, vi: 'ngây thơ', reviews: revs(T(7), [3]) }), c1('ar:كتاب', T(11), { vi: 'sách' }), c1('es:niño', T(10), { vi: 'đứa trẻ' })] });
  add('curly apostrophe word is keyed with straight quote', { cards: [c1('don’t', T(6), { lib: false })] }, { cards: [c1("don't", T(5), { lib: false, patch: { note: 'remote' }, patchAt: T(1) })] });
  add('prototype-like key "constructor"', { cards: [c1('constructor', T(6), { lib: false })] }, { cards: [c1('constructor', T(6), { lib: false, reviews: revs(T(4), [2]) })] });
  add('big reps / lapses / interval', { cards: [c1('brouhaha', T(70), { lib: false, patch: { srs: { ef: 2.5, interval: 36500, reps: 5000, lapses: 321, due: NOW + 36500 * D, last: T(2), step: 0, S: 98765.4321, D: 1.0000001 } }, patchAt: T(2) })] }, { cards: [c1('brouhaha', T(70), { lib: false, patch: { srs: { ef: 2.5, interval: 120, reps: 4999, lapses: 320, due: T(1) + 120 * D, last: T(3), step: 0, S: 120.5, D: 3.2 } }, patchAt: T(3) })] });
  add('library card (L:1) vs custom card edit', { cards: [c1('curriculum', T(30), { lib: true, patch: { note: 'school plan' }, patchAt: T(4) })] }, { cards: [c1('curriculum', T(30), { lib: true, patch: { vi: 'giáo trình (sửa riêng)' }, patchAt: T(2) })] });
  const many = (tag, n, off) => Array.from({ length: n }, (_, i) => c1(`w${String(i + off).padStart(3, '0')}${tag}`, T(60 - i * 0.2), { lib: false, vi: `nghĩa ${i}`, ...(i % 3 === 0 ? { reviews: revs(T(50 - i * 0.1), [2, 2]) } : {}) }));
  add('60 cards overlapping (bulk)', { cards: [...many('', 40, 0)] }, { cards: [...many('', 40, 20).map((x, i) => (i % 2 ? { ...x, patch: { note: 'remote ' + i }, patchAt: T(1) } : x))] });
  add('full doc both sides (cards + tombstones + stats + game + settings)',
    { cards: [c1('pollution', T(40), { lib: true, reviews: revs(T(40), [2, 2, 3]) }), c1('kerfuffle', T(30), { lib: false })], deleted: { hullabaloo: T(6) }, stats: { days: { [day(T(1))]: 12 }, newToday: { day: day(T(1)), n: 5 }, hours: hours(4) }, game: game({ xp: 640, days: { [day(T(1))]: { xp: 50 } }, badges: { first: T(40) } }), settings: { dailyGoal: 25 }, settingsAt: T(3) },
    { cards: [c1('pollution', T(40), { lib: true, reviews: revs(T(40), [2, 2]) }), c1('hullabaloo', T(20), { lib: false })], deleted: { kerfuffle: T(50) }, stats: { days: { [day(T(2))]: 8, [day(T(1))]: 4 }, newToday: { day: day(T(1)), n: 2 } }, game: game({ xp: 700, days: { [day(T(2))]: { xp: 70 } }, badges: { streak3: T(2) } }), settings: { dailyGoal: 15 }, settingsAt: T(5) });
  return R;
}

// ---------- scenarios: several installs + one account (in-memory Drive file) ----------
function scenarioSpecs() {
  const S = [];
  S.push({ name: 'web edits → iOS reads', steps: [
    ['web', 'edit', 'kerfuffle', { vi: 'sự ồn ào', note: 'seen in class' }, T(3)],
    ['web', 'edit', 'curriculum', {}, T(3) + H],
    ['web', 'sync', null, null, T(3) + 2 * H],
    ['ios', 'sync', null, null, T(2)],
  ] });
  S.push({ name: 'Android offline edits card X + deletes card Y → sync → web/iOS see it', steps: [
    ['web', 'edit', 'hullabaloo', { note: 'X' }, T(10)],
    ['web', 'edit', 'brouhaha', { note: 'Y' }, T(10) + H],
    ['web', 'sync', null, null, T(10) + 2 * H],
    ['android', 'sync', null, null, T(9)],
    ['ios', 'sync', null, null, T(9) + H],
    ['android', 'offline_edit', 'hullabaloo', { note: 'X edited offline on Android' }, T(5)],
    ['android', 'review', 'hullabaloo', 2, T(5) + H],
    ['android', 'delete', 'brouhaha', null, T(5) + 2 * H],
    ['android', 'sync', null, null, T(4)],
    ['web', 'sync', null, null, T(4) + H],
    ['ios', 'sync', null, null, T(4) + 2 * H],
  ] });
  S.push({ name: 'same-card conflict → later edit wins', steps: [
    ['web', 'edit', 'gobbledygook', {}, T(20)],
    ['web', 'sync', null, null, T(20) + H],
    ['ios', 'sync', null, null, T(19)],
    ['android', 'sync', null, null, T(19) + H],
    ['android', 'offline_edit', 'gobbledygook', { note: 'android (earliest)' }, T(6) - H],
    ['web', 'offline_edit', 'gobbledygook', { note: 'web (middle)' }, T(6)],
    ['ios', 'offline_edit', 'gobbledygook', { note: 'ios (latest)' }, T(6) + 2 * H],
    ['web', 'sync', null, null, T(5)],
    ['android', 'sync', null, null, T(5) + H],
    ['ios', 'sync', null, null, T(5) + 2 * H],
    ['web', 'sync', null, null, T(5) + 3 * H],
    ['android', 'sync', null, null, T(5) + 4 * H],
  ] });
  S.push({ name: 'add-on saves a word → web (bridge) → Android/iOS', steps: [
    ['web', 'edit', 'pollution', {}, T(9)],
    ['web', 'sync', null, null, T(9) + H],
    ['addon', 'edit', 'flibbertigibbet', { note: 'saved from a web page' }, T(8)],
    ['addon', 'sync', null, null, T(7)],
    ['android', 'sync', null, null, T(6)],
    ['ios', 'sync', null, null, T(6) + H],
    ['ios', 'delete', 'flibbertigibbet', null, T(5)],
    ['ios', 'sync', null, null, T(5) + H],
    ['addon', 'sync', null, null, T(4)],
  ] });
  S.push({ name: 'delete beats an older edit; a later re-add beats the tombstone', steps: [
    ['web', 'edit', 'skedaddle', { note: 'v1' }, T(15)],
    ['web', 'sync', null, null, T(15) + H],
    ['ios', 'sync', null, null, T(14)],
    ['web', 'offline_edit', 'skedaddle', { note: 'older edit' }, T(12)],
    ['ios', 'delete', 'skedaddle', null, T(11)],
    ['ios', 'sync', null, null, T(10)],
    ['web', 'sync', null, null, T(10) + H],
    ['web', 'edit', 'skedaddle', { note: 're-added' }, T(3)],
    ['web', 'sync', null, null, T(3) + H],
    ['ios', 'sync', null, null, T(2)],
  ] });
  S.push({ name: 'unicode + target-language cards round-trip across clients', steps: [
    ['ios', 'edit', 'ja:食べる', { vi: 'ăn', note: '🍣 たべる' }, T(7)],
    ['android', 'edit', 'ar:كتاب', { vi: 'sách' }, T(7) + H],
    ['ios', 'sync', null, null, T(6)],
    ['android', 'sync', null, null, T(6) + H],
    ['web', 'sync', null, null, T(6) + 2 * H],
    ['ios', 'sync', null, null, T(5)],
  ] });
  return S;
}

async function runScenario(spec) {
  const used = new Set(spec.steps.map(s => s[0]));
  const bus = messageBus();
  const C = {};
  C.web = await webClient({ bus, now: T(60), uid: 'test-uid-0001' });
  if (used.has('addon')) C.addon = await addonClient(bus, { now: T(60) });
  for (const k of ['ios', 'android']) if (used.has(k)) C[k] = await webClient({ now: T(60), uid: 'test-uid-0001' });
  let server = null;
  const steps = [];
  for (const [client, op, card, arg, at] of spec.steps) {
    const c = C[client];
    if (op === 'review') { // a review is an edit whose patch is the real SRS.review result on this client's card
      const cur = client === 'addon' ? (await c.Core.Cards.all())[card] : (await c.Core.Cards.all())[card];
      const srs = (client === 'addon' ? c.Core : c.Core).SRS.review(cl(cur.srs), arg, at, true);
      await c.edit(card, { srs }, at); steps.push({ client, op: 'edit', card, patch: { srs }, at }); continue;
    }
    if (op === 'edit' || op === 'offline_edit') { await c.edit(card, arg, at); steps.push({ client, op, card, patch: arg, at }); continue; }
    if (op === 'delete') { await c.remove(card, at); steps.push({ client, op, card, at }); continue; }
    if (op === 'sync') { const host = client === 'addon' ? C.web : c; host.at(at); server = await host.sync(server); steps.push({ client, op, at }); continue; }
    throw new Error('unknown op ' + op);
  }
  const expect = {};
  for (const k of ['web', 'ios', 'android']) if (C[k]) { C[k].at(NOW); expect[k] = await C[k].build(); }
  if (C.addon) { const s = C.addon.store(); expect.addon = { cards: slimCards(C.web, s.cards), deleted: s.deleted, stats: s.stats }; }
  expect.server = server;
  return { name: spec.name, steps, expect };
}

// ---------- contract (JSON Schema) derived from real cards ----------
const typeOf = v => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
function schemaOf(samples, { requiredAll = true } = {}) {
  const props = {}, seen = {};
  for (const s of samples) for (const [k, v] of Object.entries(s)) { (seen[k] ||= new Set()).add(typeOf(v)); }
  for (const [k, ts] of Object.entries(seen)) { let t = [...ts].sort(); if (t.includes('integer') && t.includes('number')) t = t.filter(x => x !== 'integer'); props[k] = { type: t.length === 1 ? t[0] : t }; }
  const required = requiredAll ? Object.keys(seen).filter(k => samples.every(s => k in s)) : [];
  return { type: 'object', properties: Object.fromEntries(Object.entries(props).sort(([a], [b]) => (a < b ? -1 : 1))), required: required.sort() };
}
async function contractOf(c, addon) {
  const docs = [];
  // real cards: library word, custom word, target-language word, with/without contexts, reviewed, patched (mod)
  docs.push(await makeDoc(c, { cards: [
    { key: 'curriculum', at: T(20), lib: true }, { key: 'kerfuffle', at: T(19), lib: false, ctx: ctxs(2, 'k'), reviews: revs(T(18), [0, 2, 2, 3]) },
    { key: 'ja:食べる', at: T(17), vi: 'ăn' }, { key: 'brouhaha', at: T(16), lib: false, patch: { note: 'n', image: 'https://img.example.org/b.webp', imageCredit: { by: 'x', lic: 'CC0' }, audio: 'https://cdn.example.org/a.mp3' } },
    { key: 'pollution', at: T(15), lib: true, reviews: revs(T(15), [2, 2, 2]), patch: { vi: 'sự ô nhiễm (riêng)' } },
  ], stats: { days: { [day(T(1))]: 3 }, newToday: { day: day(T(1)), n: 1 }, hours: hours(1) }, game: game({ xp: 5 }), settings: { dailyGoal: 20 }, settingsAt: T(1), deleted: { gone: T(2) } }));
  // a card exactly as Cards.make writes it (never patched: no mod) – old installs hold many of these
  c.reset(NOW); await c.Core.Store.set('cards', { 'make-only': c.Core.Cards.make({ word: 'make-only', vi: 'thẻ chưa sửa' }) }); docs.push(await c.build());
  // add-on saves keep the cleaned sentence context (ctx/src) – web/js/ctx.js runs in the add-on
  await addon.edit('hullabaloo', {}, T(3)); await addon.Core.Cards.add({ word: 'hullabaloo' }, { text: 'What a hullabaloo at the market today.', source: 'https://www.example.org/x', title: 'x' });
  const addonCards = slimCards(c, addon.store().cards);
  const cards = [...docs.flatMap(d => Object.values(d.cards)), ...Object.values(addonCards)];
  const card = schemaOf(cards);
  const srs = schemaOf(cards.map(x => x.srs));
  card.properties.srs = srs;
  card.properties.contexts = { type: 'array', maxItems: 5, items: schemaOf(cards.flatMap(x => x.contexts || [])) };
  const made = c.Core.Cards.make({ word: 'x' });
  const sync = src('web/js/sync.js'), drive = src('web/js/sync-drive.js'), core = src('web/js/core.js');
  const LIB_FIELDS = vm.runInNewContext(pick(sync, /const LIB_FIELDS = /).replace(/^const LIB_FIELDS = /, '').replace(/;$/, ''));
  const dc = (re, s = drive) => { const m = s.match(re); if (!m) throw new Error('contract: ' + re); return m[1]; };
  const keys = ['Curriculum', '  Well   Being ', 'don’t', 'naïve', '食べる', 'Niño', 'constructor'];
  const keyVec = [...keys.map(w => ({ word: w, tl: 'en', key: c.Core.tlKey(w, 'en') })), { word: '食べる', tl: 'ja', key: c.Core.tlKey('食べる', 'ja') }, { word: 'Niño', tl: 'es', key: c.Core.tlKey('Niño', 'es') }];
  const hashIn = ['', '{}', '{"a":1}', 'naïve ☕ 食べる', JSON.stringify(docs[0].cards.kerfuffle)];
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://lexkite.com/schemas/sync-doc.v2.json',
    title: 'Lexkite sync document v2 (web, add-on, iOS, Android – one account, one schema)',
    description: 'GENERATED by scripts/native/gen.mjs from web/js/core.js (Cards.make, SRS), web/js/sync.js (slim/fat, snapLocal, mergeIn) and web/js/sync-drive.js. Drive appDataFolder holds one Doc; D1 /api/sync holds meta + cards_0..31. Merge rules: vectors/sync.json.',
    type: 'object',
    required: ['v', 'cards', 'deleted', 'stats', 'settings', 'settingsAt'],
    properties: {
      v: { const: 2 }, at: { type: 'integer', description: 'ms epoch of the snapshot (Drive only)' },
      cards: { type: 'object', description: 'key → slim card; key = Core.tlKey(word, tl)', additionalProperties: { $ref: '#/$defs/card' } },
      deleted: { $ref: '#/$defs/deleted' }, stats: { $ref: '#/$defs/stats' }, game: { anyOf: [{ $ref: '#/$defs/game' }, { type: 'null' }] },
      settings: { type: 'object', description: 'user settings (DEFAULT_SETTINGS keys + more); whole object wins by settingsAt' }, settingsAt: { type: 'integer' },
    },
    $defs: {
      card: { ...card, description: 'slim() card: sentences/ipaUS dropped; empty contexts/note/image/audio dropped; library cards (L:1) drop fields equal to the library entry (fat() restores them from the lexicon). Unknown fields must be preserved; readers must tolerate missing optional fields (fat() fills them from cardDefaults).', additionalProperties: true },
      deleted: { type: 'object', description: 'tombstones key → ms; merged by max; pruned when older than 90 days', additionalProperties: { type: 'integer' } },
      stats: { type: 'object', properties: { days: { type: 'object', additionalProperties: { type: 'integer' } }, newToday: { type: 'object', properties: { day: { type: 'string' }, n: { type: 'integer' } } }, hours: { type: 'array', minItems: 24, maxItems: 24, items: { type: 'integer' } } }, required: ['days'] },
      game: { type: 'object', description: 'Game.get() shape (EMPTY() + stored); merged by mergeGame0 (xp/days/total max, badges union, best.match min, unitDone max, freezes from higher-xp side, ret by mergeRet). questsDone is sent empty.', properties: Object.fromEntries(Object.keys(game({})).concat(['questsDone']).map(k => [k, { type: k === 'xp' ? 'integer' : 'object' }])), additionalProperties: true },
      d1Meta: { type: 'object', description: 'D1 doc "meta" body after gunzip: { stats, game (questsDone {}), settings, settingsAt, deleted }', properties: { stats: { $ref: '#/$defs/stats' }, game: { $ref: '#/$defs/game' }, settings: { type: 'object' }, settingsAt: { type: 'integer' }, deleted: { $ref: '#/$defs/deleted' } } },
    },
    'x-lexkite': {
      cardDefaults: made, srsNew: c.Core.SRS.newState(), libFields: LIB_FIELDS,
      activity: 'max(srs.last, added, mod) – newer activity wins per card; tie → larger stable JSON (sorted keys) of the FAT card wins',
      keyRule: 'lowercase; ’ ‘ ` → \'; collapse whitespace; trim; tl other than en → "<tl>:" prefix', keys: keyVec,
      drive: { space: 'appDataFolder', file: dc(/NAME = '([^']+)'/), prefix: dc(/PREFIX = '([^']+)'/), schema: +dc(/SCHEMA = (\d+)/), backups: +dc(/NBAK = (\d+)/), envelope: 'gzip(JSON {kind: prefix, v: schema, sha: hex(SHA-256(data)), data: JSON string of the Doc})' },
      d1: { endpoint: 'POST https://lexkite.com/api/sync (Authorization: Bearer <Firebase ID token>)', docs: 'meta + cards_0..cards_{NB-1}', NB: c.lib.NB, bucketOf: 'FNV-1a 32-bit over UTF-16 code units of the key, % NB', bucketVectors: keyVec.map(k => ({ key: k.key, bucket: c.lib.bucketOf(k.key) })), hash: 'h = (h*31 + charCode) | 0 over UTF-16 code units; "<h>:<length>"', hashVectors: hashIn.map(s => ({ in: s, out: c.lib.hash(s) })), body: '{ json } or { z: base64(gzip(json)) } when smaller' },
      store: { indexedDB: dc(/indexedDB\.open\('([^']+)', 1\)/, core), objectStore: 'kv', prefix: dc(/PREFIX = SANDBOX \? 'sbx\.' : '([^']+)'/, core), legacyDb: dc(/indexedDB\.open\('([^']+)', 1\); q\.onupgradeneeded/, core), bigKeys: JSON.parse(dc(/const BIG = new Set\((\[[^\]]+\])\)/, core).replace(/'/g, '"')) },
    },
  };
}

// ---------- migration (C03): Capacitor WebView storage → Doc ----------
export function exportScript() {
  const core = src('web/js/core.js'), tpl = src('scripts/native/migration-export.tpl.js');
  const prefix = core.match(/PREFIX = SANDBOX \? 'sbx\.' : '([^']+)'/)[1], db = core.match(/indexedDB\.open\('([^']+)', 1\)/)[1], old = core.match(/indexedDB\.open\('([^']+)', 1\); q\.onupgradeneeded/)[1];
  return tpl.replace('__GENERATED__', 'GENERATED by scripts/native/gen.mjs from scripts/native/migration-export.tpl.js + web/js/core.js (store names) – do not edit by hand.').replace(/__PREFIX__/g, prefix).replace(/__DB__/g, db).replace(/__OLD_DB__/g, old);
}
export async function runExport(js, { idb, ls, origin = 'capacitor://localhost', now = NOW }) {
  const sb = { indexedDB: idb, localStorage: ls, location: { origin }, Date: class extends Date { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } }, JSON, Object, Promise, console, setTimeout };
  sb.window = sb; vm.createContext(sb);
  return JSON.parse(await vm.runInContext(js, sb, { filename: 'migration-export.js' }));
}
function migrationSpecs() {
  const P = 'ielts.';
  const card = (word, i, o = {}) => ({ word, ipa: '', ipaUS: '', pos: 'n', vi: 'nghĩa ' + word, def: '', ex: '', col: [], syn: [], level: '', topic: 'mine', emoji: '📘', image: '', imageCredit: null, audio: '', sentences: [], contexts: [], note: '', added: T(70) + i * M, srs: { ef: 2.5, interval: 0, reps: 0, lapses: 0, due: T(70) + i * M, last: null, step: 0 }, ...o });
  const reviewed = (word, i) => card(word, i, { srs: { ef: 2.5, interval: 3 + (i % 20), reps: 1 + (i % 7), lapses: i % 3, due: T(1) + (i % 30) * D, last: T(5) + (i % 50) * H, step: 0, S: 2.5 + (i % 40) / 3, D: 3 + (i % 50) / 10 }, mod: T(5) + (i % 50) * H });
  const lsBase = { [P + 'stats']: JSON.stringify({ days: { [day(T(2))]: 15, [day(T(1))]: 22 }, newToday: { day: day(T(1)), n: 4 }, hours: hours(2) }), [P + 'game']: JSON.stringify(game({ xp: 1520, days: { [day(T(1))]: { xp: 80, reviews: 22 } }, total: { reviews: 1400 }, badges: { first: T(60) }, unitDone: { 'ngsl1.1': 90 }, freezes: 1 })), [P + 'settings']: JSON.stringify({ dailyGoal: 30, dailyNew: 8, accent: 'en-US', reminderTime: '19:30' }), [P + 'settingsAt']: String(T(10)), [P + 'deleted']: JSON.stringify({ oldword: T(20) }), [P + 'pulledHashes']: JSON.stringify({ 'test-uid-0001': { meta: '12345:678', cards_0: '-998:40' } }), [P + 'lastUid']: '"test-uid-0001"', 'lk.acct': JSON.stringify({ displayName: 'Test', photoURL: '' }), 'lk.idbMoved': '1' };
  const cards = n => Object.fromEntries(Array.from({ length: n }, (_, i) => { const w = `word${String(i).padStart(4, '0')}`; return [w, i % 2 ? reviewed(w, i) : card(w, i)]; }));
  return [
    { name: 'empty install (never opened)', idb: {}, ls: {} },
    { name: 'typical learner (IndexedDB cards + localStorage meta)', idb: { lexkite: { kv: { [P + 'cards']: { ...cards(30), curriculum: card('curriculum', 99, { vi: 'chương trình giảng dạy', contexts: [{ text: 'The curriculum changed.', source: 'news.example.org', title: 't', at: T(9) }] }) }, [P + 'dc2:hello']: { cached: 'dictionary entry (cache, skipped)' } } } }, ls: lsBase },
    { name: '2k cards', idb: { lexkite: { kv: { [P + 'cards']: cards(2000) } } }, ls: { [P + 'stats']: lsBase[P + 'stats'], [P + 'settingsAt']: '0' } },
    { name: 'unicode words, target-language cards, key re-normalised', idb: { lexkite: { kv: { [P + 'cards']: { 'naïve': card('naïve', 1, { vi: 'ngây thơ' }), 'ja:食べる': card('食べる', 2, { tl: 'ja', vi: 'ăn', note: '🍣' }), 'ar:كتاب': card('كتاب', 3, { tl: 'ar' }), 'Don’t': card('Don’t', 4), 'café au lait': card('Café  au lait', 5) } } } }, ls: { [P + 'settings']: JSON.stringify({ dailyGoal: 10 }), [P + 'settingsAt']: String(T(3)) } },
    { name: 'corrupted entries skipped (null card, card without word, broken JSON value)', idb: { lexkite: { kv: { [P + 'cards']: { good: card('good', 1), broken: null, noword: { vi: 'không có từ', srs: {} }, partial: { word: 'partial' } } } } }, ls: { [P + 'stats']: '{"days": {"2026-02-27": 3', [P + 'game']: 'null', [P + 'deleted']: JSON.stringify({ x: T(4) }) } },
    { name: 'pre-IndexedDB install: cards still in localStorage, newer mod wins over IndexedDB copy', idb: { lexkite: { kv: { [P + 'cards']: { alpha: card('alpha', 1, { note: 'idb', mod: T(9) }), beta: card('beta', 2, { note: 'idb only' }) } } } }, ls: { [P + 'cards']: JSON.stringify({ alpha: card('alpha', 1, { note: 'localStorage newer', mod: T(3) }), gamma: card('gamma', 3) }) } },
    { name: 'very old install: legacy "vocaband" IndexedDB only', idb: { vocaband: { kv: { [P + 'cards']: { legacy: card('legacy', 1, { note: 'from vocaband' }) } } } }, ls: { [P + 'settingsAt']: '0' } },
    { name: 'sandbox (?sandbox=1) and dictionary-cache keys are not learner data', idb: { lexkite: { kv: { [P + 'cards']: { real: card('real', 1) }, 'sbx.cards': { fake: card('fake', 2) }, [P + 'dcIndex']: { a: 1 } } } }, ls: { 'sbx.stats': JSON.stringify({ days: { x: 99 } }), [P + 'dc:old']: '{}', [P + 'stats']: JSON.stringify({ days: { [day(T(1))]: 2 }, newToday: { day: day(T(1)), n: 0 } }) } },
  ];
}
/** Expected native result for an export: load the exported storage into a real web/js/core.js install and read it back. */
export async function migrateExpect(exp, uid = 'test-uid-0001') {
  const seed = {};
  for (const [db, kv] of Object.entries(exp.idb || {})) seed[db] = { kv };
  const c = await webClient({ now: NOW, uid, idb: fakeIndexedDB(seed), ls: exp.ls || {} });
  const doc = await c.build();
  const ph = await c.Core.Store.get('pulledHashes', {});
  return { ...doc, pulledHashes: ph };
}

export async function genSync() {
  const c = await webClient({ now: NOW });
  const bus = messageBus(); await webClient({ bus, now: NOW }); const addon = await addonClient(bus, { now: NOW });
  // merge vectors
  const merge = [], props = [];
  for (const [name, ls, rs] of mergeSpecs()) {
    const local = await makeDoc(c, ls), remote = await makeDoc(c, rs);
    c.reset(NOW); await c.load(local); const back = await c.build();
    if (c.m.stable(back) !== c.m.stable(local)) throw new Error(`fixture "${name}": local Doc does not round-trip load → build`);
    const out = await mergeDocs(c, local, remote);
    const rev = await mergeDocs(c, remote, local), again = await mergeDocs(c, out, out), absorb = await mergeDocs(c, out, remote);
    props.push({ name, commutative: c.m.stable(rev) === c.m.stable(out), idempotent: c.m.stable(again) === c.m.stable(out), absorbs: c.m.stable(absorb) === c.m.stable(out) });
    merge.push({ name, local, remote, out });
  }
  const scenarios = [];
  for (const s of scenarioSpecs()) scenarios.push(await runScenario(s));
  const nonCommutative = props.filter(p => !p.commutative).map(p => p.name), nonIdempotent = props.filter(p => !p.idempotent || !p.absorbs).map(p => p.name);
  const sync = {
    v: 1,
    _doc: 'GENERATED by scripts/native/gen.mjs (scripts/native/gen-sync.mjs) with the REAL web code (web/js/sync.js mergeIn/snapLocal, core.js, game.js, extension/content.js bridge). Doc = Drive snapshot without v/at. merge: out = local install after merging remote (clock = now; tombstones older than 90 days pruned). scenarios: clients start empty; edit = new key → Cards.add({word}) (library entry if the word is in the lexicon), then shallow-assign patch, mod = at; delete = remove + deleted[key] = at; offline_edit = edit without network; sync = merge the server Doc into the client, then server = client Doc; an add-on sync = the web app on the same machine syncs (bridge get → merge → set). expect.server = account Doc after the last step; expect.addon has only cards/deleted/stats (all the add-on stores). nonCommutative lists merge cases where merge(local, remote) != merge(remote, local) in the web itself.',
    now: NOW,
    nonCommutative,
    ...(nonIdempotent.length ? { nonIdempotent } : {}),
    merge, scenarios,
  };
  const contract = await contractOf(c, addon);
  // lib: every library entry the vectors rely on (L:1 cards travel without these fields) – from the real lexicon loaded by web-ref
  const libOf = obj => { const words = new Set(); JSON.stringify(obj, (k, v) => { if (v && typeof v === 'object' && v.L === 1 && typeof v.word === 'string' && !v.tl) words.add(v.word.toLowerCase()); return v; }); const o = {}; for (const w of [...words].sort()) { const e = c.sb.IELTS_DATA.INDEX[w]; if (!e) throw new Error('lib: "' + w + '" not in the web lexicon'); o[w] = JSON.parse(JSON.stringify(e)); } return o; };
  // migration
  const js = exportScript();
  const cases = [];
  for (const m of migrationSpecs()) {
    const seed = {}; for (const [db, st] of Object.entries(m.idb)) seed[db] = st;
    const exp = await runExport(js, { idb: fakeIndexedDB(seed), ls: memStorage(m.ls) });
    cases.push({ name: m.name, export: exp, expect: await migrateExpect(exp) });
  }
  const migration = { v: 1, _doc: 'GENERATED by scripts/native/gen.mjs. export = what native/shared/gen/migration-export.js returns inside the old Capacitor WebView origin (capacitor://localhost on iOS, https://localhost on Android); expect = what the native store must hold afterwards, computed by loading that export into the real web/js/core.js Store (IndexedDB "lexkite" kv + localStorage "ielts.*", legacy "vocaband" DB, normalize: invalid cards dropped, keys re-normalised, defaults added with clock = now) and reading it back as a Doc (+ pulledHashes).', now: NOW, cases };
  sync.lib = libOf(sync);
  migration.lib = libOf(migration);
  contract['x-lexkite'].lib = { _doc: 'library entries (IELTS_DATA.INDEX after App.need(words, tsl), key = lowercase word) used by the vectors and contract samples; the full lexicon = web/js/data.js + LEX_FILES packs', files: ['web/js/data.js', ...LEX_FILES], entries: { ...libOf(contract), ...sync.lib, ...migration.lib } };
  contract['x-lexkite'].content = { url: 'https://lexkite.com/native/content/{type}.json', types: ['today', 'modules', 'banner'], source: 'native/shared/content/<type>.json', publish: 'scripts/native/content-publish.mjs sign (CI, OTA_SIGNING_KEY) → web/native/content/<type>.json (committed, served by Cloudflare Pages)', key: 'web/js/ota-key.js LK_OTA_KEY (ECDSA P-256 SPKI base64)', envelope: 'see scripts/native/content-schema.mjs + vectors/compat.json', fallback: 'bad signature / minApp / offline → last verified cache, then native/shared/gen/content-pack' };
  return { contract, sync, migration, exportJs: js, props };
}
