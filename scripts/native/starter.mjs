#!/usr/bin/env node
/* Native onboarding STARTER DECK (parity with web, C17). At the end of web setup (web/js/onboard.js `go.onclick`) every pack adds the words of the
 * first 3 topics of its exam (`topicsFor(ex).slice(0,3)` → `D.addWord(w, null, {silent})` = Core.Cards.add → Cards.make + mod) unless already in the deck.
 * Everything is derived from the real web sources (no hand copies):
 *   web/js/onboard.js   TOPIC_GROUPS + topicsFor (filter by group, first 15, first 3)         · web/js/tracks.js  pack → exam mapping (TR[id].exam)
 *   web/js/data.js + web/js/lib/*.js  IELTS_DATA.TOPICS (word entries, same load order as App.need('words') then 'tsl')
 *   web/js/core.js      Core.Cards.make / keyOf (run in vm with a fixed clock) → the expected cards in vectors/starter-deck.json
 * Output: content-pack/starter.json (entries per topic + which topics each exam uses; bundled in both apps) and vectors/starter-deck.json (expected result). */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = p => path.join(ROOT, p);
export const STARTER_MAX_BYTES = 160 * 1024; // own budget (the 3 TOEIC lists are ~100 KB of real word data); the Today + first-lesson pack keeps its own 32 KB budget
const NOW = Date.UTC(2026, 0, 5, 9, 0, 0);

export function starter() {
  const sb = { console, Math, JSON, t: s => s }; sb.self = sb; sb.globalThis = sb; sb.window = sb; vm.createContext(sb);
  // same files and order as web App.BUNDLES.words then .tsl (topic order = push order, which decides "first 3")
  for (const f of ['data.js', 'lib/topics-more.js', 'lib/skills.js', 'lib/awl.js', 'lib/ngsl.js', 'lib/ngsl2.js', 'lib/office.js', 'lib/tsl-a.js', 'lib/tsl-b.js', 'lib/domain-a.js', 'lib/domain-b.js', 'lib/exam-vocab.js', 'lib/exam-vocab2.js', 'lib/exam-vocab3.js', 'lib/nawl.js', 'lib/bsl.js'])
    vm.runInContext(fs.readFileSync(R('web/js/' + f), 'utf8'), sb, { filename: 'web/js/' + f });
  const TOPICS = sb.IELTS_DATA.TOPICS;

  const onb = fs.readFileSync(R('web/js/onboard.js'), 'utf8');
  const gm = onb.match(/const TOPIC_GROUPS = (\{[^;]+\});/);
  if (!gm || !/topicsFor = ex => D\.TOPICS\.filter\(x => TOPIC_GROUPS\[ex\]\.includes\(x\.group\)\)\.slice\(0, 15\)/.test(onb) || !/list\.slice\(0, 3\)/.test(onb)) throw new Error('starter: topicsFor/TOPIC_GROUPS changed in web/js/onboard.js – update scripts/native/starter.mjs');
  const GROUPS = Function(`return (${gm[1]})`)();
  const topicsFor = ex => TOPICS.filter(x => GROUPS[ex].includes(x.group)).slice(0, 15).slice(0, 3);

  // pack → exam (web tracks.js TR[id].exam: constant, or v => v === 'gt' ? 'ieltsgt' : 'ielts')
  const trk = fs.readFileSync(R('web/js/tracks.js'), 'utf8');
  const packs = [];
  for (const m of trk.matchAll(/\b(comm|ielts|toeic|toefl|work): \{ id: '(\w+)'[\s\S]*?exam: (\(\) => '(\w+)'|v => \(v === 'gt' \? '(\w+)' : '(\w+)'\))/g)) {
    if (m[1] !== m[2]) continue;
    if (m[4]) packs.push({ track: m[1], variant: '', exam: m[4] });
    else packs.push({ track: m[1], variant: 'ac', exam: m[6] }, { track: m[1], variant: 'gt', exam: m[5] });
  }
  if (packs.length < 6) throw new Error('starter: pack → exam mapping not found in web/js/tracks.js');
  // TOEIC variants (lr/sw) have the same exam id: web `exam: () => 'toeic'` ignores v
  const exams = [...new Set(packs.map(p => p.exam))].sort();

  // entries as stored on web minus fields Cards.make defaults anyway (smaller pack, identical card)
  const slim = w => { const o = {}; for (const [k, v] of Object.entries(w)) if (!(v === '' || (Array.isArray(v) && !v.length))) o[k] = v; return o; };
  const byExam = {}, topics = {};
  for (const ex of exams) { const l = topicsFor(ex); byExam[ex] = l.map(x => x.id); for (const x of l) topics[x.id] = x.words.map(slim); }

  // expected cards = the real web Core.Cards.make under a fixed clock, added in order, skipping words already in the deck (D.inDeck), + mod (Cards._add)
  const web = { console, Math, navigator: {}, setTimeout, clearTimeout }; web.self = web; web.globalThis = web; vm.createContext(web);
  web.Date = class extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
  vm.runInContext(fs.readFileSync(R('web/js/core.js'), 'utf8'), web, { filename: 'web/js/core.js' });
  const { Cards, keyOf } = web.Core;
  const deckOf = ex => {
    const seen = new Set(), out = [];
    for (const id of byExam[ex]) for (const w of TOPICS.find(x => x.id === id).words) { // the ORIGINAL entry (not slim) goes through web make
      const k = keyOf(w.word); if (seen.has(k)) continue; seen.add(k);
      out.push([k, JSON.parse(JSON.stringify({ ...Cards.make(w), mod: NOW }))]);
    }
    return out;
  };
  const decks = {};
  for (const ex of exams) {
    const d = deckOf(ex), pick = d.length <= 60 ? d : [d[0], d[Math.floor(d.length / 2)], d[d.length - 1]];
    decks[ex] = { topics: byExam[ex], count: d.length, keys: d.map(x => x[0]), cards: Object.fromEntries(pick) };
  }
  const head = '_doc';
  const packJson = JSON.stringify({ [head]: 'GENERATED by scripts/native/starter.mjs from web/js/onboard.js (topicsFor), web/js/tracks.js, web/js/data.js + web/js/lib/*.js – do not edit by hand. Entries per topic id; byExam = topics added at the end of onboarding.', v: 1, byExam, topics }) + '\n';
  const bytes = Buffer.byteLength(packJson);
  if (bytes > STARTER_MAX_BYTES) throw new Error(`starter: ${bytes} B > ${STARTER_MAX_BYTES} B budget`);
  const vector = JSON.stringify({ [head]: 'GENERATED by scripts/native/starter.mjs – expected starter deck per exam: web Core.Cards.make(entry) + mod, clock = now (ms). keys = insertion order; cards = every card (≤60) or first/middle/last. Native onboarding must produce exactly this.', now: NOW, packs, decks }, null, 1) + '\n';
  return { packJson, vector, bytes, exams, counts: Object.fromEntries(exams.map(e => [e, decks[e].count])) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { const s = starter(); console.log('starter OK', s.bytes, 'B', JSON.stringify(s.counts)); }
