/* Native M2 – lesson engine conformance vectors (docs/specs/native-apps.md §3, P03). Reference = the REAL web/js/lesson/engine.js (+ web/js/core.js Cards.make,
 * web/cpack/lesson/stories.js, the DEMO/STARTER cards of web/js/lesson/ui.js) run in node:vm with a fixed clock, TZ=UTC. Nothing here re-implements engine logic:
 * every "out" is whatever LessonEngine returned. Items keep every field; the only transform is `card` (object) → a reference string "c:<i>" | "s:<i>" into
 * inputs.cards / inputs.starter so the file stays small (see the docs/specs/native-m2-vectors.md for the schema).
 * Exports lessonVectors() → JSON string for native/shared/gen/vectors/lesson.json. Used by scripts/native/gen.mjs. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { contentPack } from './content-pack.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = p => path.join(ROOT, p);
export const NOW = Date.UTC(2026, 0, 5, 9, 0, 0); // same T0 as vectors/scoring.json
const DAY = 864e5;
const clone = o => JSON.parse(JSON.stringify(o));

function sandbox(extra = {}) {
  const sb = { console, Math, JSON, navigator: {}, location: { hostname: 'native-gen' }, setTimeout, clearTimeout, ...extra };
  sb.self = sb; sb.globalThis = sb;
  sb.Date = class extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
  vm.createContext(sb);
  return sb;
}

/** DEMO/STARTER cards exactly as web/js/lesson/ui.js defines them (the source lines from `const learnVi` to `const STARTER`, evaluated with the fixed clock). */
function uiStarter() {
  const ui = fs.readFileSync(R('web/js/lesson/ui.js'), 'utf8');
  const a = ui.indexOf('const learnVi = '), b = ui.indexOf('const STARTER = ');
  const e = ui.indexOf('\n', b);
  if (a < 0 || b < 0 || e < 0) throw new Error('gen-lesson: DEMO/STARTER block not found in web/js/lesson/ui.js');
  const sb = sandbox({ window: {} });
  return vm.runInContext(`(() => { ${ui.slice(a, e)}\n return { demo: DEMO(), starter: STARTER() }; })()`, sb, { filename: 'web/js/lesson/ui.js(DEMO)' });
}

export function lessonVectors() {
  process.env.TZ = 'UTC';
  const sb = sandbox();
  for (const f of ['web/js/core.js', 'web/js/lesson/engine.js', 'web/cpack/lesson/stories.js']) vm.runInContext(fs.readFileSync(R(f), 'utf8'), sb, { filename: f });
  const E = sb.LessonEngine, { Cards } = sb.Core, STORIES = clone(sb.LESSON_STORIES);
  const { demo, starter } = clone(uiStarter());

  // ---- input cards: DEMO set (real fixture) + the first NGSL lesson words made by the real Cards.make, with SRS states set on purpose ----
  const pack = JSON.parse(contentPack().files.get('native/shared/gen/content-pack/lesson-ngsl1.1.json'));
  const mk = (e, o) => Object.assign(clone(Cards.make(e)), o);
  const srs = (daysAgo, reps, lapses) => ({ ef: 2.5, interval: reps ? 3 : 0, reps, lapses, due: NOW - daysAgo * DAY, last: reps ? NOW - (daysAgo + 3) * DAY : null, step: 0, S: reps ? 3 : null, D: reps ? 5 : null });
  const W = pack.words;
  const cards = [
    ...demo.map(c => clone(c)),                                                           // 6 DEMO cards (due / new / ext / future)
    mk(W[0], { srs: srs(4, 3, 3), mod: NOW - 5 * DAY }),                                   // due, lapses 3
    mk(W[1], { srs: srs(2, 2, 1), mod: NOW - 4 * DAY }),                                   // due, lapses 1
    mk(W[2], { sentences: [{ en: W[2].ex, vi: 'Câu mẫu có bản dịch: ' + W[2].ex }], mod: NOW - 3 * DAY }), // new, bilingual sentence (tr)
    mk(W[3], { ctx: W[3].ex, src: 'news.example.com', mod: NOW - 2 * DAY }),                // new, learner sentence from the web (ext)
    mk(W[4], { mod: NOW - 1 * DAY }), mk(W[5], { mod: NOW }), mk(W[6], { mod: NOW - 6 * DAY }), mk(W[7], {}), mk(W[8], { srs: srs(-3, 2, 0) }), mk(W[9], {}),
    mk({ word: 'zebra', pos: 'noun', ipa: '/ˈzeb.rə/', vi: 'ngựa vằn', def: 'a striped African animal' }, { mod: NOW - 7 * DAY }), // no example sentence: say → mean, type needs def/vi
    mk({ word: 'kiwi', pos: 'noun', ipa: '/ˈkiː.wiː/', vi: 'quả kiwi', def: '' }, { mod: NOW - 8 * DAY }),
  ];
  const cardSets = () => { const cs = clone(cards), st = clone(starter); return { cs, st }; };
  const imgWords = ['consider', 'afraid', 'salary', 'be', 'and', 'of'];
  const gloss = {}; cards.forEach(c => { const x = c.ex || c.ctx; if (x && /[aeiou]/.test(c.word) && (c.word.length + x.length) % 2 === 0) gloss[x] = 'Dịch: ' + x; }); starter.forEach(c => { if (c.ex) gloss[c.ex] = 'Dịch: ' + c.ex; });
  const meanVi = c => c.vi || '';

  const refOf = (cs, st) => { const m = new Map(); cs.forEach((c, i) => m.set(c, 'c:' + i)); st.forEach((c, i) => m.set(c, 's:' + i)); return m; };
  const unref = (it, m) => { const o = { ...it }; if ('card' in o) { o.card = o.card ? (m.get(o.card) || (() => { throw new Error('gen-lesson: unknown card ref'); })()) : null; } if (o.type === 'match' && Array.isArray(o.pairs)) o.pairs = o.pairs.map(c => m.get(c) || c); return o; };
  const jItems = (items, m) => items.map(it => unref(it, m));

  // ---- pickWords ----
  const pickCases = [
    { id: 'pw-default', cards: 'all', opts: { n: 6, now: NOW }, starter: true },
    { id: 'pw-n4', cards: 'all', opts: { n: 4, now: NOW }, starter: true },
    { id: 'pw-n3-later', cards: 'all', opts: { n: 3, now: NOW + 3 * DAY }, starter: false },
    { id: 'pw-review', cards: 'all', opts: { n: 6, now: NOW, mode: 'review' }, starter: true },
    { id: 'pw-empty-starter', cards: 'none', opts: { n: 4, now: NOW }, starter: true },
    { id: 'pw-new-only', cards: 'new', opts: { n: 6, now: NOW }, starter: false },
    { id: 'pw-n8-map', cards: 'all', opts: { n: 8, now: NOW }, starter: true },
    { id: 'pw-noex', cards: 'noex', opts: { n: 6, now: NOW }, starter: false },
  ];
  const subset = (cs, kind) => kind === 'none' ? [] : kind === 'noex' ? cs.filter(c => !c.ex && !c.ctx && !(c.sentences || []).length) : kind === 'new' ? cs.filter(c => c.srs && c.srs.reps === 0 && !c.srs.last) : cs;
  const pickOut = pickCases.map(pc => {
    const { cs, st } = cardSets(), m = refOf(cs, st), use = subset(cs, pc.cards);
    const picks = E.pickWords(pc.cards === 'all' ? Object.fromEntries(cs.map((c, i) => ['k' + i, c])) : use, { ...pc.opts, starter: pc.starter ? st : [] });
    return { id: pc.id, cards: pc.cards, opts: pc.opts, starter: pc.starter, out: picks.map(p => ({ card: m.get(p.card), why: p.why })) };
  });

  // ---- build ----
  const BUILD = [
    { id: 'b-1', seed: 1, pick: 'pw-default', mean: 'vi', gloss: true, img: true },
    { id: 'b-7', seed: 7, pick: 'pw-default', mean: 'vi', gloss: true, img: true },
    { id: 'b-42', seed: 42, pick: 'pw-n4', mean: 'vi', gloss: true, img: true },
    { id: 'b-2026', seed: 2026, pick: 'pw-n8-map', mean: 'vi', gloss: true, img: true },
    { id: 'b-90210', seed: 90210, pick: 'pw-review', mean: 'vi', gloss: false, img: false },
    { id: 'b-nolisten', seed: 7, pick: 'pw-default', mean: 'vi', gloss: false, img: true, off: { listen: true } },
    { id: 'b-nolisten-nomean', seed: 42, pick: 'pw-n4', mean: 'none', gloss: false, img: true, off: { listen: true } },
    { id: 'b-nospeak', seed: 7, pick: 'pw-default', mean: 'vi', gloss: true, img: true, off: { speak: true } },
    { id: 'b-nospeak-noimg', seed: 3, pick: 'pw-n4', mean: 'vi', gloss: true, img: false, off: { speak: true } },
    { id: 'b-none-both', seed: 11, pick: 'pw-n8-map', mean: 'vi', gloss: true, img: true, off: { listen: true, speak: true } },
    { id: 'b-only-gap-build', seed: 7, pick: 'pw-default', mean: 'vi', gloss: true, img: true, only: ['gap', 'build'] },
    { id: 'b-only-listen', seed: 5, pick: 'pw-n8-map', mean: 'vi', gloss: true, img: true, only: E.KIND.listen },
    { id: 'b-only-speak', seed: 5, pick: 'pw-n8-map', mean: 'vi', gloss: true, img: true, only: E.KIND.speak },
    { id: 'b-calm', seed: 13, pick: 'pw-n8-map', mean: 'vi', gloss: true, img: true, calm: true },
    { id: 'b-per1', seed: 21, pick: 'pw-n8-map', mean: 'vi', gloss: true, img: true, perWord: 1 },
    { id: 'b-per3', seed: 22, pick: 'pw-default', mean: 'vi', gloss: true, img: true, perWord: 3 },
    { id: 'b-noex', seed: 4, pick: 'pw-noex', mean: 'vi', gloss: false, img: false },
    { id: 'b-noex-nospeak', seed: 4, pick: 'pw-noex', mean: 'vi', gloss: false, img: false, off: { speak: true } },
    { id: 'b-noex-nolisten', seed: 4, pick: 'pw-noex', mean: 'none', gloss: false, img: false, off: { listen: true } },
    { id: 'b-nomatch', seed: 7, pick: 'pw-n8-map', mean: 'vi', gloss: true, img: true, match: false },
  ];
  const picksOf = (id, cs, st) => pickOut.find(p => p.id === id).out.map(p => ({ card: (p.card[0] === 'c' ? cs : st)[+p.card.slice(2)], why: p.why }));
  const run = bc => {
    const { cs, st } = cardSets(), m = refOf(cs, st), picks = picksOf(bc.pick, cs, st);
    const opts = { seed: bc.seed, pool: cs.concat(st), off: bc.off, only: bc.only, calm: !!bc.calm, perWord: bc.perWord, match: bc.match,
      hasImg: bc.img ? (w => imgWords.includes(w)) : () => false, gloss: bc.gloss ? ((c, en) => gloss[en] || '') : undefined, mean: bc.mean === 'vi' ? meanVi : () => '' };
    Object.keys(opts).forEach(k => opts[k] === undefined && delete opts[k]);
    return { items: E.build(picks, opts), m, cs, st, picks };
  };
  const buildOut = BUILD.map(bc => { const r = run(bc); return { ...bc, out: jItems(r.items, r.m) }; });

  // ---- adapt: one built item per type × the 4 off combos ----
  const base = run(BUILD[0]), seenT = new Set(), adaptIn = [];
  for (const it of [...base.items, ...run(BUILD[3]).items]) { const k = it.type + (it.choice ? '/c' : ''); if (!seenT.has(k)) { seenT.add(k); adaptIn.push(it); } }
  const OFFS = [{}, { listen: true }, { speak: true }, { listen: true, speak: true }];
  const adaptOut = adaptIn.map(it => ({ in: unref(it, base.m), outs: OFFS.map(off => ({ off, out: unref(E.adapt(it, off), base.m) })) }));

  // ---- check: answers per built item type (right / wrong / near-miss) ----
  const checkCases = [];
  const seenC = new Set();
  for (const bc of [BUILD[0], BUILD[3], BUILD[9], BUILD.find(b => b.id === 'b-noex-nospeak')]) for (const it of run(bc).items) {
    const k = it.type + (it.choice ? '/c' : '') + (it.spoke ? '/s' : ''); if (seenC.has(k) || it.type === 'line') continue; seenC.add(k);
    const item = { type: it.type, answer: it.answer }; if (it.choice) item.choice = true;
    let answers;
    if (it.type === 'build' || it.type === 'tr') { const t = it.answer.split(' '); answers = [t, t.slice().reverse(), it.answer, it.answer.toUpperCase() + '!', t.slice(1), []]; }
    else if (it.type === 'say' || (it.type === 'pic' && !it.choice)) answers = [0.95, 0.7, 0.69, 0, it.answer, it.answer.toUpperCase(), 'zzz'];
    else if (it.type === 'match') answers = [true, false];
    else answers = [it.answer, it.answer.toUpperCase() + ' ', (it.options || []).find(o => o !== it.answer) || 'zzz', '', it.answer.slice(0, -1)];
    checkCases.push({ item, cases: answers.map(ans => ({ ans, ok: E.check(item, ans) })) });
  }

  // ---- Session (scripts: '1' right · '0' wrong · 's' skip; remaining items are answered right) ----
  const sessCases = [
    { id: 'sess-all-right', build: 'b-7', script: '', opts: {} },
    { id: 'sess-mixed', build: 'b-7', script: '1011001', opts: {} },
    { id: 'sess-retry0', build: 'b-42', script: '0010', opts: { maxRetry: 0 } },
    { id: 'sess-retry1', build: 'b-42', script: '00100', opts: { maxRetry: 1 } },
    { id: 'sess-ease', build: 'b-2026', script: '0010011', opts: { ease: true } },
    { id: 'sess-skip', build: 'b-nolisten', script: '1s0s1', opts: {} },
    { id: 'sess-nospeak', build: 'b-nospeak', script: '10000', opts: { ease: true } },
    { id: 'sess-noex-nospeak', build: 'b-noex-nospeak', script: '01', opts: {} },
  ];
  const sessOut = sessCases.map(sc => {
    const bc = BUILD.find(b => b.id === sc.build), r = run(bc), S = new E.Session(r.items, sc.opts), steps = [];
    const snap = (op, res) => ({ op, res: res === undefined ? null : res, cur: S.cur ? S.cur.id : null, curRetry: S.cur ? S.cur.retry : null, solved: S.solved, progress: S.progress, combo: S.combo, best: S.best, n: S.n, ok1: S.ok1, miss: S.miss, accuracy: S.accuracy, done: S.done, q: S.q.map(x => [x.id, x.retry]) });
    for (let i = 0; !S.done && i < 80; i++) {
      const ch = sc.script[i] || '1';
      if (ch === 's') { S.skip(); steps.push(snap('skip')); } else { const res = S.answer(ch === '1'); steps.push(snap(ch === '1' ? 'right' : 'wrong', res)); }
    }
    const resCards = Object.fromEntries(r.cs.map((c, i) => ['c' + i, c]));
    const results = E.results(S, r.items, resCards, NOW).map(x => ({ word: x.word, grade: x.grade, add: x.add, card: x.card ? r.m.get(x.card) || null : null }));
    return { id: sc.id, build: sc.build, opts: sc.opts, script: sc.script, start: { total: S.total }, steps, log: S.log, wrong: Object.fromEntries(S.wrong), firstOk: [...S.firstOk], results, resultsNow: NOW };
  });

  // ---- small pure functions ----
  const seeds = [0, 1, 7, 42, 2026, 90210, 123456789, 4294967295];
  const rngOut = seeds.map(seed => { const r = E.rng(seed); return { seed, out: Array.from({ length: 8 }, r) }; });
  const shuffleOut = seeds.slice(1, 6).map(seed => ({ seed, in: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], out: E.shuffle(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], E.rng(seed)) }));
  const bankOut = ['consider', 'well-being', "don't", 'ice cream', 'a', 'Hello'].flatMap(word => [3, 99].map(seed => ({ word, seed, out: E.letterBank(word.toLowerCase(), E.rng(seed)) })));
  const toksOut = ['She said "hello" to everyone.', "It's fine, isn't it?", '  ', 'well-known facts', '“Quoted” words here!'].map(s => ({ in: s, out: E.toks(s) }));
  const findOut = [['We decided to stay at home.', 'decide'], ["We're considering moving.", 'consider'], ['I like key cards a lot.', 'key card'], ['She has a nice salary.', 'salary'], ['Nothing here.', 'decide'], ['They were studying hard.', 'study'], ['A mixed Case Word', 'case'], ['', 'x']].map(([s, w]) => ({ sentence: s, word: w, out: E.findWord(s, w) }));
  const sentOut = cardSets().cs.slice(0, 14).map((c, i) => ({ card: 'c:' + i, out: E.sentenceOf(c) }));
  const stressOut = ['/kənˈsɪd.ər/', '/ˌɪn.fərˈmeɪ.ʃən/', '/æpl/', '', '/ˈsæl.ər.i/', 'ˈnʌm'].map(ipa => ({ ipa, out: E.stress(ipa) }));
  const usukOut = [{ ipa: '/kənˈsɪd.ər/', ipaUS: '/kənˈsɪd.ɚ/' }, { ipa: '/æpl/', ipaUS: '/ æpl /' }, { ipa: '/x/' }, null].map(c => ({ card: c, out: E.usuk(c) }));
  const visemeOut = [['hello world', 1.2], ['Maybe, five loops!', undefined], ['', undefined], ['Thank you.', 0.9], ['bob?', 0.5]].map(([text, dur]) => ({ text, dur: dur === undefined ? null : dur, out: E.visemes(text, dur) }));
  const normOut = ['Consider', '  well-being ', 'don’t', 'It\'s fine.', 'A  B\tC'].map(s => ({ in: s, out: E.norm(s) }));

  // ---- plans ----
  const planCards = (kind) => { const { cs } = cardSets(); const o = {}; cs.forEach((c, i) => { if (kind === 'many-due') c.srs = Object.assign(c.srs || {}, srs(2, 2, 1)); if (kind === 'none') return; o['k' + i] = c; }); return kind === 'none' ? {} : o; };
  const HAS = [{}, { story: 1 }, { radio: 1 }, { story: 1, radio: 1 }, { story: 1, radio: 1, odd: 1 }, { radio: 1, odd: 1, exam: 1 }, { exam: 1 }];
  const planOut = ['mixed', 'many-due', 'none'].flatMap(kind => [NOW, NOW + 10 * DAY].map(now => ({ cards: kind, now, path: HAS.map(has => ({ has, out: E.pathPlan(planCards(kind), now, has).map(x => x.kind) })), unit: HAS.map(has => ({ has, out: E.unitPlan(planCards(kind), now, has).map(x => x.kind) })) })));
  const nextOut = ['lesson', 'review', 'speak', 'radio', 'listen'].flatMap(kind => [{}, { acc: 59 }, { acc: 60 }, { acc: 95, due: 0 }, { acc: 95, due: 3 }, { acc: 100, due: 0 }].map(ctx => ({ kind, ctx, out: E.nextKind(kind, ctx) })));
  const dueOut = cardSets().cs.map((c, i) => ({ card: 'c:' + i, now: NOW, isDue: E.isDue(c, NOW), fromExt: E.fromExt(c) }));

  // ---- calm / HARD ----
  const typesSeq = ['build', 'tr', 'type', 'gap', 'say', 'pic', 'build', 'build', 'build', 'gap', 'tr', 'type', 'type', 'say', 'gap', 'pic'];
  const calmIn = typesSeq.map((type, i) => ({ id: i + 1, type, word: 'w' + i }));
  const calmOut = { in: calmIn, out: E.calm(calmIn).map(x => x.id), hard: calmIn.map(x => E.HARD(x)) };
  const hardCases = [{ type: 'say' }, { type: 'say', spoke: true }, { type: 'pic' }, { type: 'pic', choice: true }, { type: 'gap' }, { type: 'match' }, { type: 'q' }, { type: 'type' }, { type: 'build' }, { type: 'tr' }, { type: 'mean' }].map(it => ({ item: it, out: E.HARD(it) }));

  // ---- stories / radio ----
  const storyOut = STORIES.flatMap(st => ['vi', 'en', 'ar', 'xx'].map(lang => ({ story: st.id, lang, seed: lang === 'ar' ? 3 : 2, out: E.storyItems(st, lang, lang === 'ar' ? 3 : 2) })));
  const stSession = (() => { const st = STORIES[0], items = E.storyItems(st, 'vi', 2), S = new E.Session(items), steps = [];
    for (let i = 0; !S.done && i < 60; i++) { const it = S.cur; const res = it.free ? S.answer(true) : S.answer(i % 4 !== 0); steps.push({ op: it.free ? 'line' : 'check', type: it.type, res, solved: S.solved, progress: S.progress, combo: S.combo, best: S.best, n: S.n, ok1: S.ok1, accuracy: S.accuracy, done: S.done, q: S.q.map(x => [x.id, x.retry]) }); }
    return { story: st.id, lang: 'vi', seed: 2, steps }; })();

  // say/pic speech score: web/js/ui.js similarity() (Levenshtein on [a-z ] only) sliced from source; lesson ui: score = round(sim*100), ≥ 70 → submit, else retry (2nd miss → submit anyway)
  const uiSrc = fs.readFileSync(R('web/js/ui.js'), 'utf8'), simM = /function similarity\(a, b\) \{[\s\S]*?\n  \}\n/.exec(uiSrc);
  if (!simM) throw new Error('gen-lesson: similarity() not found in web/js/ui.js');
  const similarity = vm.runInNewContext('(' + simM[0] + ')');
  const simOut = [['hello', 'hello'], ['Hello!', 'hello'], ['helo', 'hello'], ['I like green tea', 'i like green tea'], ['I like tea', 'I like green tea'], ['', ''], ['', 'cat'], ['cat', 'dog'],
    ["don't worry", 'dont worry'], ['Café au lait', 'cafe au lait'], ['look after', 'look out for'], ['THE', 'the'], ['think', 'sink']].map(([heard, target]) => { const v = similarity(heard, target); return { heard, target, sim: v, score: Math.round(v * 100) }; });
  const vec = {
    _doc: 'Reference outputs of web/js/lesson/engine.js (REAL code in node:vm; clock = now, TZ=UTC; cards = web/js/core.js Cards.make + web/js/lesson/ui.js DEMO/STARTER fixtures; stories = web/cpack/lesson/stories.js). Items keep every field; `card` is replaced by a reference "c:<i>" (inputs.cards[i]) | "s:<i>" (inputs.starter[i]). See docs/specs/native-m2-vectors.md. Swift + Kotlin ports must match exactly (floats from rng are exact 6-decimal values).',
    now: NOW,
    inputs: { cards, starter, imgWords, gloss, meanRule: 'mean(card) = card.vi || "" ("vi") · always "" ("none")', hasImgRule: 'hasImg(word, pos) = imgWords.includes(word)', glossRule: 'gloss(card, sentenceEN) = inputs.gloss[sentenceEN] || ""', poolRule: 'pool = cards ++ starter (list order)', pickMapRule: 'pickWords(cards): when cards="all" the input is the map {k0..kN} in list order; "none" = []; "new" = the filtered list' },
    consts: { HINTS: E.HINTS, KIND: E.KIND, DAY: E.DAY },
    pickWords: pickOut, build: buildOut, adapt: { offs: OFFS, cases: adaptOut }, check: checkCases, session: sessOut,
    rng: rngOut, shuffle: shuffleOut, letterBank: bankOut, toks: toksOut, norm: normOut, findWord: findOut, sentenceOf: sentOut, stress: stressOut, usuk: usukOut, visemes: visemeOut,
    plans: planOut, nextKind: nextOut, isDue: dueOut, calm: calmOut, hard: hardCases, storyItems: storyOut, storySession: stSession, similarity: { pass: 70, retriesBeforeSubmit: 2, cases: simOut },
  };
  return JSON.stringify(vec) + '\n';
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { const s = lessonVectors(); console.log('lesson vectors', Buffer.byteLength(s), 'B'); }
