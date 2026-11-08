// Native M2 – the shared layer's vectors (lesson engine P03, teacher rig C05, audio C04, lesson strings): they regenerate byte-identically from the real web JS,
// and they are internally sane, so the SwiftUI / Compose ports can trust them. Light (a few seconds, no browser, no Mac heavy work). docs/specs/native-apps.md §3, §5.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { lessonVectors } from '../native/gen-lesson.mjs';
import { audioVectors } from '../native/gen-audio.mjs';
import { teachGen, teachBundle, rigVectorText, BUNDLED_POSES, TEACHERS } from '../native/gen-teach.mjs';
import { vocabVectors } from '../native/gen-vocab.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), R = p => path.join(ROOT, p), rd = p => fs.readFileSync(R(p), 'utf8');
const SH = 'native/shared/gen', IOS = 'native/ios/LexkiteKit/Sources/LKDesign/Resources/teach';
let failed = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };
const MAX = 1024 * 1024; // every generated vector stays well under 1 MB
const same = (rel, fresh) => { const cur = fs.existsSync(R(rel)) ? rd(rel) : null; return cur === fresh; };

// ---- 1) regenerate identically (twice in-process = deterministic; equal to the committed files) ----
const L1 = lessonVectors(), L2 = lessonVectors(), A1 = audioVectors(), A2 = audioVectors(), T1 = teachGen(), T2 = teachGen();
const rigVec = rigVectorText(T1.vectorJson), rigDef = JSON.stringify(T1.rigJson, null, 1) + '\n';
ok(L1 === L2 && A1 === A2 && rigVec === rigVectorText(T2.vectorJson) && rigDef === JSON.stringify(T2.rigJson, null, 1) + '\n', 'two runs give the same vectors (fixed clock, fixed seeds, TZ=UTC)');
ok(same(`${SH}/vectors/lesson.json`, L1) && same(`${SH}/vectors/audio.json`, A1) && same(`${SH}/vectors/rig.json`, rigVec) && same(`${SH}/teach/rig.json`, rigDef) && same(`${IOS}/rig.json`, rigDef), 'lesson.json · audio.json · vectors/rig.json · teach/rig.json (shared + iOS copy) equal what the web JS gives now (else: node scripts/native/gen.mjs)');
ok([L1, A1, rigVec, rigDef].every(s => Buffer.byteLength(s) < MAX), `each vector file < 1 MB (lesson ${(L1.length / 1024) | 0} KB · rig ${(rigVec.length / 1024) | 0} KB · audio ${(A1.length / 1024) | 0} KB · rig def ${(rigDef.length / 1024) | 0} KB)`);

// ---- 2) lesson.json sanity ----
const LV = JSON.parse(L1), CARDS = LV.inputs.cards, STARTER = LV.inputs.starter;
const cardOf = ref => (ref[0] === 'c' ? CARDS : STARTER)[+ref.slice(2)];
{
  const need = { gap: ['sent', 'blank', 'answer', 'options', 'tr'], build: ['sent', 'answer', 'tiles', 'prompt'], tr: ['sent', 'answer', 'tiles', 'prompt'], type: ['answer', 'def', 'len', 'first', 'bank'], pic: ['answer', 'options'], say: ['sent', 'answer', 'alt'], mean: ['answer', 'options'], match: ['pairs'], q: ['prompt', 'answer', 'options'] };
  let items = 0, bad = [], types = new Set();
  for (const c of LV.build) {
    const ids = new Set();
    for (const it of c.out) {
      items++; types.add(it.type);
      for (const k of ['id', 'type', 'word', 'retry', 'hints', 'noAudio']) if (!(k in it)) bad.push(`${c.id}#${it.id} missing ${k}`);
      if (ids.has(it.id)) bad.push(`${c.id} duplicate id ${it.id}`); ids.add(it.id);
      for (const k of need[it.type] || []) if (!(k in it)) bad.push(`${c.id}#${it.id}(${it.type}) missing ${k}`);
      if (it.card != null && !cardOf(it.card)) bad.push(`${c.id}#${it.id} bad card ref ${it.card}`);
      if (it.options && it.type !== 'match' && !it.options.includes(it.answer)) bad.push(`${c.id}#${it.id}(${it.type}) answer not in options`);
      if (it.tiles && !it.answer.split(' ').every(w => it.tiles.includes(w))) bad.push(`${c.id}#${it.id}(${it.type}) tiles lack answer words`);
      if (it.type === 'match' && (it.pairs.length !== 4 || !it.pairs.every(p => cardOf(p)))) bad.push(`${c.id}#${it.id} match pairs`);
      if (it.type === 'say' && it.alt && !it.alt.type) bad.push(`${c.id}#${it.id} say.alt`);
      if (c.off && c.off.listen && it.noAudio !== true) bad.push(`${c.id}#${it.id} noAudio`);
    }
    if (c.only && !c.out.every(it => c.only.includes(it.type) || it.type === 'match')) bad.push(`${c.id} only[] violated`);
    if (c.off && c.off.speak && c.out.some(it => (it.type === 'say' && !it.spoke) || (it.type === 'pic' && !it.choice))) bad.push(`${c.id} speak items survived off.speak`);
  }
  ok(bad.length === 0 && items > 150 && ['gap', 'build', 'tr', 'type', 'pic', 'say', 'mean', 'match'].every(t => types.has(t)), `lesson build: ${LV.build.length} cases, ${items} items, every exercise type present, required fields on all${bad.length ? ' – ' + bad.slice(0, 3).join('; ') : ''}`);
  ok(LV.pickWords.length >= 7 && LV.pickWords.every(p => p.out.length > 0 && p.out.every(x => ['due', 'ext', 'new', 'start'].includes(x.why) && cardOf(x.card))), 'pickWords: due → ext → new → start, valid refs');
}
{
  let bad = [];
  for (const s of LV.session) {
    let prevSolved = -1, prevProg = -1;
    for (const st of s.steps) { if (st.solved < prevSolved || st.progress < prevProg - 1e-12 || st.progress > 1) bad.push(`${s.id} progress went backwards`); prevSolved = st.solved; prevProg = st.progress; }
    const last = s.steps[s.steps.length - 1];
    if (!last.done || last.q.length) bad.push(`${s.id} not finished`); if (Math.abs(last.progress - 1) > 1e-12) bad.push(`${s.id} final progress ${last.progress}`);
    if (s.steps.some(st => st.best < st.combo)) bad.push(`${s.id} best < combo`);
    if (!s.results.every(r => r.grade === 0 || r.grade === 2)) bad.push(`${s.id} grade`);
  }
  const retry0 = LV.session.find(s => s.id === 'sess-retry0'), mixed = LV.session.find(s => s.id === 'sess-mixed');
  ok(bad.length === 0 && retry0.steps.every(st => !(st.res && st.res.requeued)) && mixed.steps.some(st => st.res && st.res.requeued), `Session: ${LV.session.length} scripts – progress only grows, ends at 100 %, maxRetry 0 never requeues, wrong answers requeue${bad.length ? ' – ' + bad.slice(0, 2).join('; ') : ''}`);
  ok(LV.check.length >= 8 && LV.check.every(c => c.cases.some(x => x.ok) && c.cases.some(x => !x.ok)), 'check: every exercise type has both a right and a wrong answer in the vector');
  ok(LV.rng.length === 8 && LV.rng.every(r => r.out.length === 8 && r.out.every(x => x >= 0 && x < 1)) && LV.storyItems.length >= 8 && LV.plans.length === 6 && LV.nextKind.length === 30, 'rng · shuffle · letterBank · plans · nextKind · storyItems present');
}

// ---- 3) rig vectors ----
const RV = T1.vectorJson, RD = T1.rigJson;
{
  const checks = RV.lipGate.flatMap(g => g.checks), worst = Math.max(...checks.map(c => Math.abs(c.deltaMs)));
  ok(checks.length > 300 && worst <= RV.lipsync.tolMs && RV.lipGate.every(g => g.who && g.transitions.length), `lip sync gate vector: ${checks.length} cue shapes (Ama + Carlos, ${RV.lipGate.length / 2} real Kokoro lines) all inside ±${RV.lipsync.tolMs} ms (worst ${worst} ms)`);
  const L = RD.limits, bad = [], eps = 1e-6, col = n => RV.columns.indexOf(n);
  for (const sc of RV.scenarios) {
    if (sc.rows.some(r => r.length !== RV.columns.length)) bad.push(`${sc.who}/${sc.id} row width`);
    for (const r of sc.rows) {
      if (Math.abs(r[col('tilt')]) > L.tilt + eps || Math.abs(r[col('nod')]) > L.nod + eps || Math.abs(r[col('sway')]) > L.sway + eps || Math.abs(r[col('breath')]) > L.breath + eps) bad.push(`${sc.who}/${sc.id} limit`);
      if (r.some(x => typeof x === 'number' && !Number.isFinite(x))) bad.push(`${sc.who}/${sc.id} NaN`);
      if (sc.calm && ['tilt', 'nod', 'sway', 'breath'].some(n => Math.abs(r[col(n)]) > 1e-9)) bad.push(`${sc.who}/${sc.id} calm moves`);
    }
  }
  ok(bad.length === 0 && RV.scenarios.length === 24, `machine reference: ${RV.scenarios.length} scenarios (idle · emotions · gestures · speak cues/queue/live · listen, normal + reduced motion), inside LIMITS, calm = neck/breath still${bad.length ? ' – ' + bad.slice(0, 3).join('; ') : ''}`);
  const posesOf = who => new Set(RV.scenarios.find(s => s.who === who && s.id === 'gestures').rows.map(r => r[col('pose')]).filter(Boolean));
  ok(['cheer', 'thumbs_up', 'clap', 'explain'].every(p => posesOf('ama').has(p)) && ['cheer', 'thumbs_up', 'hold_card'].every(p => posesOf('carlos').has(p)), 'gestures scenario: Ama clap + hold_card→explain (alt), Carlos hold_card + clap→cheer (alt)');
  const rigid = RV.matrix.every(({ m }) => Math.abs(m[0] - m[3]) < 1e-5 && Math.abs(m[1] + m[2]) < 1e-5);
  ok(rigid && RV.matrix.length === 12, 'matrix vectors are rigid (rotation + uniform scale + translation, no shear)');
  ok(RV.paint.length === 2 * 14 && RV.paint.every(p => p.parts.length === 5 && p.parts[3].length > 3) && RV.paint.filter(p => p.who === 'ama').every(p => p.parts[4].length === 0) && RV.paint.filter(p => p.who === 'carlos').every(p => p.parts[4].length > 0), 'face paint ops: 5 layers per state (eyes×2, brows, mouth, moustache only for Carlos)');
  ok(RV.mood.length === 10 && RV.mood[0].out.pose === 'cheer' && RV.mood[2].out.pose === 'concern' && RV.mood[3].out.pose === 'encourage' && RV.mood[9].out === null, 'mood vector: answer ok → cheer, wrong → concern, 2nd wrong → encourage, unknown event → null');
  ok(TEACHERS.every(w => RD.people[w] && Object.values(RD.people[w].gestures).filter(g => g.kind === 'pose').every(g => g.file.endsWith(`still-${g.pose}.webp`))) && RD.limits.tilt === 6 && Object.keys(RD.emotions).length === 9, 'rig.json: both teachers, every gesture resolves to a still, 9 emotions, limits from the web core');
}

// ---- 4) audio vectors ----
{
  const AV = JSON.parse(A1), l0 = AV.urls[0].urls, bad = [];
  if (AV.bases.length !== 3 || l0.length !== 3 || !l0[0].startsWith(AV.bases[0])) bad.push('origin order');
  const byFails = f => AV.urls.find(u => u.kind === 'l' && u.fails === f && !u.s2.length).urls.length;
  if (byFails(0) !== 3 || byFails(2) !== 2 || byFails(4) !== 1 || byFails(9) !== 1) bad.push('origin drop after 2 fails each');
  if (!AV.word.every(w => w.urls.every(u => u.includes('/audio/w/' + w.key + '.mp3')))) bad.push('word urls');
  if (!AV.sentence.every(s => s.cueUrls[0].endsWith(s.key + '-ls.mp3') && s.urls[0].endsWith(s.key + '.mp3'))) bad.push('sentence urls');
  if (AV.genderFor.find(g => g.who === 'carlos').out !== 'm' || AV.genderFor.find(g => g.who === 'ama').out !== 'f') bad.push('teacher genders');
  const gOf = name => (AV.genderOf.find(g => g.name === name) || {}).out;
  for (const p of AV.pick) if (p.gender && gOf(p.out) && gOf(p.out) !== p.gender) bad.push(`pick ${p.accent}/${p.gender} crosses gender (${p.out})`);
  ok(bad.length === 0, `audio vectors: CDN origin order + failover, word/sentence keys, genders, voice ranking on ${AV.sampleVoices.length} sample voices${bad.length ? ' – ' + bad.join('; ') : ''}`);
}

// ---- 5) strings: every t() key of the web lesson player is mapped (or consciously listed) ----
{
  const map = JSON.parse(rd('native/shared/strings.json')), have = new Set(Object.values(map)), idsOf = Object.keys(map).filter(k => k.startsWith('lesson.'));
  const UNPIPELINED = { 'Hay sai': 'not in the web i18n pipeline (shows Vietnamese in every language on web too) – native shows no label until it is added through the web pipeline' };
  const keys = new Set();
  for (const f of ['web/js/lesson/ui.js', 'web/js/lesson/teacher.js', 'web/js/lesson/story-stage.js']) for (const m of rd(f).matchAll(/\b[tT]\(('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g)) keys.add(Function(`return ${m[1]}`)());
  // web/js/exit-guard.js serves every focus screen; the lesson player uses exactly these keys of its confirm dialog (saved / unsaved progress)
  const EXIT = ['Thoát bài?', 'Tiến độ đã được lưu – lần sau bạn học tiếp từ đây.', 'Thoát bây giờ sẽ mất tiến độ bài này?', 'Tiếp tục học', 'Thoát'], guard = rd('web/js/exit-guard.js');
  const exitMissing = EXIT.filter(k => !guard.includes(`t('${k}')`));
  const miss = [...keys, ...EXIT].filter(k => !have.has(k) && !UNPIPELINED[k]);
  ok(miss.length === 0 && !exitMissing.length && idsOf.length >= 80, `lesson strings: ${keys.size} t() keys of lesson/ui.js, teacher.js, story-stage.js + the exit confirm → mapped by ${idsOf.length} lesson.* ids (+ reused action.*/today.*)${miss.length ? ' – UNMAPPED: ' + miss.join(' | ') : ''}${exitMissing.length ? ' – exit-guard.js changed: ' + exitMissing.join(' | ') : ''}`);
}

// ---- 6) bundled art: byte-identical, capped, both destinations ----
{
  const B = teachBundle(), total = B.reduce((s, a) => s + a.bytes.length, 0), bad = [];
  for (const a of B) { for (const dst of [`${SH}/teach/${a.who}/${a.name}`, `${IOS}/${a.who}/${a.name}`]) if (!fs.existsSync(R(dst)) || !fs.readFileSync(R(dst)).equals(a.bytes)) bad.push(dst); }
  ok(bad.length === 0 && B.length === 2 * (1 + BUNDLED_POSES.length) && total < 1.0 * 1024 * 1024, `teacher art: ${B.length} files (head-bare-2x + ${BUNDLED_POSES.length} stills × Ama, Carlos) = ${(total / 1024) | 0} KB per platform, byte for byte from web/teach in both destinations${bad.length ? ' – drift: ' + bad.slice(0, 2).join(', ') : ''}`);
}

// ---- 7) M3 vocab vectors (P04 review/practice/mistakes/deck · P05 dict/library/topic/letters/verb/phrases/model/models/usage/ideas/paraphrase) ----
{
  const V1 = await vocabVectors(), V2 = await vocabVectors();
  ok(V1 === V2 && same(`${SH}/vectors/vocab.json`, V1), 'vocab.json: two runs identical and equal to the committed file (else: node scripts/native/gen.mjs)');
  ok(Buffer.byteLength(V1) < 500 * 1024, `vocab.json < 500 KB (${(Buffer.byteLength(V1) / 1024) | 0} KB; owner cap, incl. the mini library + reduced writing content of "data")`);
  const VV = JSON.parse(V1), bad = [];
  const selfDescribing = a => Array.isArray(a) && a.length > 0 && a.every(c => c && c.why && (c.out !== undefined));
  for (const k of ['review', 'mistakes.log', 'mistakes.view', 'mistakes.list', 'mistakes.retry', 'deck', 'library', 'topic', 'wordbook', 'dict.norm', 'dict.lookup', 'dict.page', 'dict.lex', 'dict.suggest', 'practice.pool', 'practice.accept', 'writing.ideas', 'writing.letters', 'writing.models', 'writing.model', 'writing.phrases', 'writing.gap', 'writing.exercise', 'usage.resolve', 'usage.suggest', 'usage.near', 'usage.lookup', 'usage.quiz', 'verb.resolve', 'verb.forms', 'verb.table', 'verb.mistakes', 'verb.suggest'].filter(Boolean)) {
    const v = k.split('.').reduce((o, x) => (o ? o[x] : undefined), VV);
    if (!selfDescribing(v) && !(k === 'wordbook' && Array.isArray(v) && v.length >= 9)) bad.push(k);
  }
  ok(bad.length === 0, `vocab.json: every vector list is present and each case has why + out${bad.length ? ' – missing/invalid: ' + bad.join(', ') : ''}`);
  // review: queue rules (due asc, new cards spliced at 1,4,7…, cap, ahead has no new cards, pin first) and per-grade bookkeeping
  const rq = id => VV.review.find(c => c.id === id).out.queue, b2 = [];
  const def = rq('queue-default'), cap = rq('queue-cap-5'), pin = rq('queue-pin');
  if (cap.join() !== def.slice(0, 5).join()) b2.push('cap = prefix of default');
  if (pin[0] !== 'vocational' || pin.slice(1).join() !== def.filter(w => w !== 'vocational').join()) b2.push('pin puts one card first, rest unchanged');
  if (rq('queue-new-0').length >= def.length || rq('queue-ahead-2').length <= rq('queue-new-0').length) b2.push('new/ahead counts');
  if (VV.review.find(c => c.id === 'empty-deck').out.state !== 'empty' || VV.review.find(c => c.id === 'all-done').out.state !== 'allDone' || VV.review.find(c => c.id === 'forgetting-redirect').out.hash !== '#/practice/learn?src=forgetting') b2.push('states');
  for (const S of VV.reviewSession) {
    let prev = null;
    for (const st of S.steps) {
      if (st.op === 'grade') {
        const xp = st.grade === 0 ? 2 : st.wasNew ? 8 : 5;
        if (prev && st.xp - prev.xp !== xp) b2.push(`${S.id}: xp rule at ${st.word}`);
        if (prev && st.done - prev.done !== 1) b2.push(`${S.id}: done +1`);
        if (st.srs.reps === 0 && !st.queue.includes(st.word) && !st.summary) b2.push(`${S.id}: learning card ${st.word} must come back`);
        if (st.srs.reps === 0 && !st.summary && st.queue.indexOf(st.word) !== Math.min(st.grade === 0 ? 3 : 6, st.queue.length - 1)) b2.push(`${S.id}: learning card requeues at index 3 (again) / 6 (else)`);
      }
      prev = st;
    }
  }
  const U = VV.reviewSession.find(x => x.id === 'undo').steps; const ui = U.findIndex(x => x.op === 'undo');
  if (ui < 1 || U[ui].xp !== U[ui - 2].xp || U[ui].done !== U[ui - 2].done) b2.push('undo restores the previous counters');
  ok(b2.length === 0, `review vectors: ${VV.review.length} queue cases + ${VV.reviewSession.length} graded sessions (${VV.reviewSession.reduce((n, s) => n + s.steps.length, 0)} steps) obey the web rules${b2.length ? ' – ' + b2.slice(0, 3).join('; ') : ''}`);
  // mistakes: tabs partition the open records; retry sorts by n desc
  const ML = VV.mistakes.list, b3 = [];
  for (const c of ML.filter(x => !x.out.empty)) { const t = c.out.tabs, sum = ['vocab', 'grammar', 'reading', 'listening'].reduce((n, k) => n + t[k].length, 0); if (sum !== t.all.length || c.out.counts.all !== t.all.length) b3.push(c.id + ' tabs'); }
  if (!ML.find(c => c.id === 'list-retry').out.retryButton === false && ML.find(c => c.id === 'list-retry').out.tabs.all[0] !== 'listening|Test 1 – Câu 3') b3.push('retry sort');
  ok(b3.length === 0, `mistakes vectors: ${ML.length} list cases (tabs partition the open records, ?retry=1 sorts by n desc) + ${VV.mistakes.retry.length} retry flows + ${VV.mistakes.view.length} mistakeView${b3.length ? ' – ' + b3.join('; ') : ''}`);
  // dict/verb/usage: the engines answered (not empty)
  ok(VV.dict.lookup.find(c => c.id === 'lookup-local+net').out.found && VV.dict.lookup.find(c => c.id === 'lookup-not-found').out.found === false && VV.verb.table[0].out.length === 4 && VV.usage.resolve.filter(x => x.out).length >= 8 && VV.writing.paraphrase.data.usable > 100, 'dict lookup / not-found, verb table (4 tense groups), usage resolve, paraphrase data are all non-trivial');
  // strings: every literal t() key on the P04/P05 screens is mapped by strings.json (or consciously listed as not in the web pipeline)
  const map = JSON.parse(rd('native/shared/strings.json')), have = new Set(Object.values(map));
  const UNP = new Set(['“{w}” → {b}', 'V2 = V3', 'V1 = V3']); // not translated in ANY web language either (code-like labels) – native shows the key as is
  const R3 = { 'web/js/study.js': [[1, 10], [96, 420]], 'web/js/plan.js': [[10, 110]], 'web/js/app.js': [[886, 1230]], 'web/js/dict-page.js': [[1, 220]], 'web/js/ideas.js': [[1, 30]], 'web/js/letters.js': [[1, 90]], 'web/js/paraphrase.js': [[1, 60]], 'web/js/phrases-model.js': [[1, 400]], 'web/js/verbs.js': [[85, 260]], 'web/js/usage.js': [[90, 480]] };
  const keys = new Set();
  for (const [f, rs] of Object.entries(R3)) { const L = rd(f).split('\n'); for (const [a, b] of rs) for (const ln of L.slice(a - 1, b)) for (const m of ln.matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)) keys.add(m[1].replace(/\\'/g, "'")); }
  const miss = [...keys].filter(k => !have.has(k) && !UNP.has(k));
  ok(miss.length === 0, `M3 strings: ${keys.size} t() keys of the P04/P05 screens are mapped in native/shared/strings.json${miss.length ? ' – missing: ' + miss.slice(0, 3).join(' | ') : ''}`);
}
if (failed) process.exit(1);
console.log('✓ native-m2-vectors OK');
