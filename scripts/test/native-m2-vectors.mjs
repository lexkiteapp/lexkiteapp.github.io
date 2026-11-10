// Native M2–M4 – the shared layer's vectors (lesson engine P03, teacher rig C05, audio C04, lesson strings, M3 vocab P04/P05, M4 skills P06, speak P07, call P08, write P09): they regenerate byte-identically from the real web JS,
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
  const R3 = { 'web/js/study.js': [[1, 10], [96, 420]], 'web/js/plan.js': [[10, 110]], 'web/js/app.js': [["t('Phản xạ 60 giây')", 345]], 'web/js/dict-page.js': [[1, 220]], 'web/js/ideas.js': [[1, 30]], 'web/js/letters.js': [[1, 90]], 'web/js/paraphrase.js': [[1, 60]], 'web/js/phrases-model.js': [[1, 400]], 'web/js/verbs.js': [[85, 260]], 'web/js/usage.js': [[90, 480]] };
  const keys = new Set();
  for (const [f, rs] of Object.entries(R3)) { const L = rd(f).split('\n'); for (let [a, b] of rs) { if (typeof a === 'string') { const at = L.findIndex(x => x.includes(a)); ok(at >= 0, `M3 strings: neo "${a}" không còn trong ${f}`); [a, b] = [at + 2, at + 1 + b]; } // neo theo dòng chứa chuỗi (số dòng trượt mỗi khi app.js thêm/bớt dòng): quét b dòng sau dòng neo
      for (const ln of L.slice(a - 1, b)) for (const m of ln.matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)) keys.add(m[1].replace(/\\'/g, "'")); } }
  const miss = [...keys].filter(k => !have.has(k) && !UNP.has(k));
  ok(miss.length === 0, `M3 strings: ${keys.size} t() keys of the P04/P05 screens are mapped in native/shared/strings.json${miss.length ? ' – missing: ' + miss.slice(0, 3).join(' | ') : ''}`);
}
// ---- 8) M4 skills vectors (P06 listening & reading: #/listening #/listen #/listen-test #/dictation #/reading #/read; P07/P09 extend skills.json) ----
{
  const { skillsVectors } = await import('../native/gen-skills.mjs');
  const S1 = await skillsVectors(), S2 = await skillsVectors();
  ok(S1 === S2 && same(`${SH}/vectors/skills.json`, S1), 'skills.json: two runs identical and equal to the committed file (else: node scripts/native/gen.mjs)');
  ok(Buffer.byteLength(S1) < 500 * 1024, `skills.json < 500 KB (${(Buffer.byteLength(S1) / 1024) | 0} KB; owner cap, incl. the cut-down listening/reading/lexis "data")`);
  const SV = JSON.parse(S1), at = (o, k) => k.split('.').reduce((x, y) => (x ? x[y] : undefined), o), bad = [];
  const selfD = a => Array.isArray(a) && a.length > 0 && a.every(c => c && typeof c.why === 'string' && c.why.length > 8 && c.input !== undefined && c.out !== undefined);
  const pure = a => Array.isArray(a) && a.length > 0 && a.every(c => c && c.input !== undefined && c.out !== undefined);
  for (const k of ['listening', 'listen.render', 'listen.flows', 'listen.popup', 'listen.player', 'listen-test.flows', 'dictation.walks', 'dictation.render', 'dictation.diff', 'dictation.session', 'dictation.settings', 'dictation.say', 'reading', 'read.render', 'read.popup', 'read.questions', 'read.actions', 'shared.cast', 'shared.qe.collect', 'shared.lexis.mark']) if (!selfD(at(SV, k))) bad.push(k);
  for (const k of ['shared.kvoice.hash', 'shared.kvoice.split', 'shared.lexis.classify', 'shared.lexis.bases', 'shared.qe.norm', 'shared.qe.words', 'shared.qe.gradeGap', 'shared.qe.overall']) if (!pure(at(SV, k))) bad.push(k);
  ok(bad.length === 0, `skills.json: every vector list is present and each case has why + input + out${bad.length ? ' – missing/invalid: ' + bad.join(', ') : ''}`);
  // rules that the web code states and the ports must keep (cheap re-derivations from the vectors themselves)
  const b8 = [], Q = SV.shared.qe, BL = Q.band.listening, byId = (l, id) => l.find(c => c.id === id);
  if (BL.length !== 41 || BL[39] !== 9 || BL[30] !== 7 || BL[0] !== 0 || BL.some((v, i) => i && v < BL[i - 1])) b8.push('band table listening');
  if (Q.band.reading[40] !== 9 || Q.band['reading-gt'][23] !== 5 || Q.band.reading.some((v, i) => i && v < Q.band.reading[i - 1])) b8.push('band tables reading');
  if (byId(SV.listening, 'default').out.selected !== 1 || byId(SV.listening, 'query-t2').out.selected !== 2 || byId(SV.listening, 'unknown-t-remembered').out.selected !== 2 || byId(SV.listening, 'empty').out.empty !== true) b8.push('hub test selection');
  for (const f of SV.listen.flows.filter(c => c.out.submitted)) { const r = f.out.result; if (r.xp !== 15 + 3 * r.right || f.out.rewards[0].xp !== r.xp || f.out.rewards[0].perfect !== (r.right === r.total ? 1 : 0) || f.out.mistakes.length !== r.total - r.right) b8.push('listen flow ' + f.id); }
  for (const f of SV['listen-test'].flows) { const r = f.out.result, raw = r.byPart.reduce((n, x) => n + x.right, 0); if (raw !== r.raw || r.band !== BL[r.raw] || f.out.rewards[0].xp !== 40 + 2 * r.raw || r.sheet.length !== 40 || r.sheet.filter(x => x.ok).length !== raw || f.out.rewards[0].listens !== 4 || f.out.mistakes !== 40 - raw) b8.push('listen-test ' + f.id); }
  { const p = SV['listen-test'].flows.find(c => c.id === 'perfect').out.parts; if (p.some((x, i) => x.progressPct !== i * 25 || x.nextDisabledInitially !== true || x.whenListened.nextDisabled !== false) ) b8.push('listen-test parts unlock after the audio'); }
  const wk = SV.dictation.walks; for (const w of wk.filter(x => x.id !== 'walk-full')) { const ratio = w.id === 'walk-mid' ? 0.35 : 0.65; if (w.out.lines.some(l => l.holes.length < 1 || l.holes.length > Math.max(1, Math.round(l.nWords * ratio)))) b8.push(w.id + ' hole count'); if (w.out.final.pct !== 100 || w.out.rewards[0].xp !== 30) b8.push(w.id + ' perfect run'); }
  if (byId(SV.dictation.diff, 'exact').out.pct !== 100 || byId(SV.dictation.diff, 'empty').out.pct !== 0 || byId(SV.dictation.diff, 'misspelt').out.cls !== 'no') b8.push('dictation diff');
  for (const s of SV.dictation.session) if (s.out.rewards[0].xp !== 10 + Math.round(s.out.fin.pct / 5) || s.out.dictDone['t1p1'] !== s.out.fin.pct) b8.push('dictation session ' + s.id);
  { const rd = SV.reading, all = byId(rd, 'default').out; if (all.tabs[0].n !== SV.data.readings.length || all.tabs.slice(1).reduce((n, t) => n + t.n, 0) !== SV.data.readings.length || all.cards.some(c => c.minutes < 2)) b8.push('reading list counts'); }
  for (const q of SV.read.questions.filter(c => c.out.graded)) { const r = q.out.result; if (r.xp !== 10 + 4 * r.score || q.out.rewards[0].xp !== r.xp || q.out.rewards[0].perfect !== (r.pct === 100 ? 1 : 0) || q.out.mistakes.length !== r.n - r.score) b8.push('read ' + q.id); }
  if (SV.read.questions.find(c => c.id === 'repeat').out.rewards[0].readings !== 0 || SV.read.questions.find(c => c.id === 'perfect').out.rewards[0].readings !== 1 || SV.read.questions.find(c => c.id === 'blank-declined').out.graded !== false) b8.push('read first-completion / confirm');
  if (SV.data.listening.length !== 8 || SV.data.readings.length !== 6 || SV.data.lexis.awl.length < 400 || SV.data.lexis.phrases.length < 100 || SV.data.listening.some(p => !p.script.length || !p.groups.length)) b8.push('data block');
  ok(b8.length === 0, `skills vectors obey the web rules (hub selection, listen/listen-test/dictation/reading XP + band + rewards, hole counts, diff, first-completion)${b8.length ? ' – ' + b8.slice(0, 4).join('; ') : ''}`);
  // the downloadable pack (web/data/skills-pack.json, https://lexkite.com/data/skills-pack.json): complete content, same shape as skills.json data.*, consts read from web code
  {
    const { skillsPack, PACK_PATH } = await import('../native/gen-skills.mjs'), zlib = await import('node:zlib');
    const K1 = await skillsPack(), K2 = await skillsPack(), PK = JSON.parse(K1), gz = zlib.gzipSync(K1, { level: 9 }).length, bp = [];
    ok(K1 === K2 && same(PACK_PATH, K1), 'skills-pack.json: two runs identical and equal to the committed file (else: node scripts/native/gen.mjs)');
    ok(Buffer.byteLength(K1) < 700 * 1024 && gz < 250 * 1024, `skills-pack.json size: ${(Buffer.byteLength(K1) / 1024) | 0} KB raw (< 700) / ${(gz / 1024) | 0} KB gzip (< 250); not in the extension or app shell`);
    if (!/^[0-9a-f]{12}$/.test(PK.v) || PK.schema !== 1) bp.push('v/schema');
    if (PK.listening.length !== 40 || new Set(PK.listening.map(p => p.test)).size !== 10 || [...Array(10).keys()].some(t => [1, 2, 3, 4].some(k => !PK.listening.find(p => p.id === `t${t + 1}p${k}`)))) bp.push('listening is not 10 tests x 4 parts');
    if (PK.readings.length !== 57 || new Set(PK.readings.map(r => r.id)).size !== 57) bp.push('readings is not 57 distinct passages');
    const JS = x => JSON.stringify(x);
    if (SV.data.listening.some(p => JS(PK.listening.find(q => q.id === p.id)) !== JS(p))) bp.push('listening parts differ from skills.json data.listening');
    if (SV.data.readings.some(r => JS(PK.readings.find(q => q.id === r.id)) !== JS(r))) bp.push('readings differ from skills.json data.readings');
    if (JS(PK.lexis) !== JS(SV.data.lexis)) bp.push('lexis differs from skills.json data.lexis');
    for (const sk of Object.keys(Q.band)) if (JS(Q.band[sk]) !== JS(Array.from({ length: 41 }, (_, r) => (PK.consts.band[sk].find(([m]) => r >= m) || [0, 0])[1]))) bp.push('band ' + sk);
    if (PK.consts.kvoice.narrator !== 'bm_george' || Object.keys(PK.consts.kvoice.pools).length !== 6 || SV.shared.kvoice.voices.some(c => c.out._narrator !== PK.consts.kvoice.narrator)) bp.push('kvoice consts');
    if (PK.consts.stopwords.length < 40 || !PK.consts.stopwords.includes('the')) bp.push('stopwords');
    ok(bp.length === 0, `skills-pack.json: 10 tests / 40 parts, 57 readings, shape = skills.json data.*, consts (band, voice pools, stopwords) match the vectors${bp.length ? ' – ' + bp.join('; ') : ''}`);
  }
  // strings: every literal t() key on the P06 screens (listening, reading, qengine, qtips, choice-kit) is mapped by strings.json
  const have8 = new Set(Object.values(JSON.parse(rd('native/shared/strings.json')))), keys8 = new Set();
  for (const f of ['web/js/listening.js', 'web/js/reading.js', 'web/js/qengine.js', 'web/js/qtips.js', 'web/js/choice-kit.js', 'web/js/lexis.js']) for (const ln of rd(f).split('\n')) for (const m of ln.matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)) keys8.add(m[1].replace(/\\(['\\])/g, '$1'));
  const miss8 = [...keys8].filter(k => !have8.has(k));
  ok(miss8.length === 0, `M4 strings: ${keys8.size} t() keys of the P06 screens are mapped in native/shared/strings.json${miss8.length ? ' – missing: ' + miss8.slice(0, 3).join(' | ') : ''}`);
}

// ---- 9) M4 speak vectors (P07 speaking & pronunciation: #/speak #/speaking #/pron #/say #/reflex #/rtype #/roleplay #/handsfree) ----
{
  const SP = await import('../native/gen-speak.mjs');
  const P1 = await SP.speakVectors(), P2 = await SP.speakVectors();
  ok(P1 === P2 && same(`${SH}/vectors/speak.json`, P1), 'speak.json: two runs identical and equal to the committed file (else: node scripts/native/gen.mjs)');
  ok(Buffer.byteLength(P1) < 500 * 1024, `speak.json < 500 KB (${(Buffer.byteLength(P1) / 1024) | 0} KB; owner cap, incl. the cut-down content "data")`);
  const V = JSON.parse(P1), at = (o, k) => k.split('.').reduce((x, y) => (x ? x[y] : undefined), o), bad = [];
  const selfD = a => Array.isArray(a) && a.length > 0 && a.every(c => c && typeof c.why === 'string' && c.why.length > 8 && c.input !== undefined && c.out !== undefined);
  const pure = a => Array.isArray(a) && a.length > 0 && a.every(c => c && c.input !== undefined && c.out !== undefined);
  for (const k of ['shared.recognize.best', 'shared.speak.align', 'shared.speak.flows', 'speak.situation', 'speak.drill', 'speak.fill', 'speaking.render', 'speaking.timer', 'speaking.analyse', 'speaking.shadow', 'pron.hub', 'pron.lesson', 'pron.pairGame', 'pron.say', 'pron.rhythm', 'pron.logic.pairs.decide', 'pron.logic.pairs.sessions', 'pron.logic.pairs.adapt', 'pron.logic.pairs.stats', 'pron.logic.pairs.storage', 'pron.logic.pairs.pairsOf', 'pron.logic.coach.plan', 'pron.logic.coach.diff', 'pron.logic.coach.score', 'pron.logic.coach.next', 'say.list', 'say.card', 'say.mic', 'say.actions', 'reflex.pool', 'reflex.colorize', 'reflex.game', 'rtype.hub', 'rtype.kinds', 'rtype.flows', 'roleplay.hub', 'roleplay.brief', 'roleplay.chat', 'roleplay.ai', 'handsfree.queue', 'handsfree.play', 'handsfree.controls']) if (!selfD(at(V, k))) bad.push(k);
  for (const k of ['shared.speak.pass', 'shared.speak.intentOf', 'shared.speak.toks', 'pron.mouth', 'pron.logic.pairs.norm', 'pron.logic.pairs.forSkill', 'pron.logic.coach.band']) if (!pure(at(V, k))) bad.push(k);
  ok(bad.length === 0, `speak.json: every vector list is present and each case has why + input + out${bad.length ? ' – missing/invalid: ' + bad.join(', ') : ''}`);
  // rules that the web code states and the ports must keep (cheap re-derivations from the vectors themselves)
  const b9 = [], byId = (l, id) => l.find(c => c.id === id), sc = V.shared.speak, J = JSON.stringify;
  { const pf = Object.fromEntries(sc.pass.filter(c => c.input && c.input.text != null && !c.input.unclear).map(c => [c.input.text, c.out])); if (pf[0.8] !== true || pf[0.7999] !== false || pf[1] !== true || sc.pass.find(c => c.input && c.input.unclear).out !== false || sc.cal.a !== 12 || sc.cal.b !== -9.6) b9.push('Speak.pass threshold'); }
  { const f = byId(sc.flows, 'perfect').out.result; if (f.text !== 1 || f.fluency.wpm !== 210 || Math.abs(byId(sc.flows, 'partial').out.result.text - 4 / 7) > 1e-8 || byId(sc.flows, 'fast-short').out.result.fluency.wpm !== 300 || byId(sc.flows, 'unsupported').out.result.error !== 'unsupported' || byId(sc.flows, 'empty-heard').out.result.unclear !== true) b9.push('Speak.score'); }
  { // the ASR best-alternative score equals the similarity pairs already in lesson.json (one source: no second implementation)
    const sim = new Map(LV.similarity.cases.map(c => [c.heard + '|' + c.target, c.score])); let n = 0;
    for (const c of V.shared.recognize.best) { const k = c.input.alts[0] + '|' + c.input.target; if (sim.has(k)) { n++; if (c.out.heard === c.input.alts[0] && c.out.score !== sim.get(k)) b9.push('recognize vs lesson.json similarity ' + k); } }
    if (n < 1) b9.push('recognize shares no pair with lesson.json similarity'); }
  for (const c of V.speak.drill.filter(x => /^three-beats|memory-slow/.test(x.id))) for (const t of c.out.trace.filter(x => x.step === 'mic' && x.stars > 0)) if (t.rewards[0].xp !== 2 * t.stars || t.rewards[0].spoken !== 1) b9.push('speak drill xp ' + c.id);
  { const st = id => byId(V.speak.drill, id).out.trace.filter(t => t.step === 'mic').map(t => t.stars), qs = V.speak.drill.find(x => x.id === 'three-beats-quick').input.quickLimitMs; if (J(st('three-beats-quick')) !== '[1,1,3]' || J(st('memory-slow')) !== '[1,1,2]' || qs !== (7 * 0.6 + 3) * 1000) b9.push('speak drill stars 1/1/3 and 2 when slow'); }
  { const u = byId(V.speak.drill, 'unclear-three').out.trace.filter(t => t.step === 'mic'); if (u.length !== 3 || u[0].res || u[1].res || !u[2].canNext || u[2].stars !== 0 || J(u[2].rewards) !== '[{"spoken":1,"xp":0}]') b9.push('speak drill unclear ×3 = free pass'); }
  { const d = byId(V.speak.drill, 'mic-denied-tap').out.trace, last = d.filter(t => t.step === 'tap').at(-1); if (last.stars !== 1 || last.rewards.length !== 0 || !last.canNext || !d.some(t => t.say && t.say.k === 'Chưa đúng thứ tự – thử từ khác nhé.')) b9.push('speak drill tap fallback: 1 star, no reward'); }
  if (byId(V.speak.drill, 'finish-situation').out.trace.at(-1).toasts[0].k !== 'Xong cả {n} mẫu câu!' || byId(V.speak.drill, 'stage-order').out.trace[0].line.v.n !== 2) b9.push('speak drill finish / stage order');
  for (const a of V.speaking.analyse.filter(x => x.out.stats)) { const words = +a.out.stats[2].value, secs = parseFloat(a.out.stats[0].value), r = a.out.rewards; if (words >= 10 ? J(r) !== J([{ spoken: Math.min(10, Math.round(words / 10)), quizzes: 1, xp: 15 }]) : r.length) b9.push('speaking reward ' + a.id); }
  { const sh = byId(V.speaking.shadow, 'shadow-all').out, scs = sh.steps.map(s => s.score); const pct = Math.round(scs.reduce((a, b) => a + b, 0) / sh.steps.length); if (sh.final[0].v.pct !== pct || J(sh.rewards) !== '[{"spoken":3,"xp":10}]' || sh.steps.some(s => s.verdictColor !== (s.score >= 80 ? '--good' : s.score >= 60 ? '--hard' : '--again'))) b9.push('speaking shadowing average / reward / colours'); }
  { const c = byId(V.speaking.timer, 'clock-p2').out.steps; if (c.find(s => s.secs === 90).color !== 'var(--good)' || c.find(s => s.secs === 130).color !== 'var(--again)' || !byId(V.speaking.timer, 'clock-p2').out.stoppedAutomatically || byId(V.speaking.timer, 'p2-prep').out.ticks[2] !== '00:00') b9.push('speaking clock colours / p2 auto stop / prep 60 s'); }
  { const w = byId(V.pron.lesson, 'word-mic-save').out.steps; for (const s of w) { const r = s.score >= 65 ? [{ spoken: 1, xp: 2 }] : []; if (J(s.rewards) !== J(r) || s.colour !== (s.score >= 85 ? '--good' : s.score >= 65 ? '--hard' : '--again')) b9.push('pron word mic ' + s.score); } if (w[4].writes.length !== 1 || w[4].writes[0]['game:pronDone']['iː'] !== 72) b9.push('pron pronDone after 5 words'); }
  for (const c of V.pron.pairGame) { const ok2 = c.input.rights.filter(Boolean).length; if (c.out.rewards[0].xp !== 5 + 2 * ok2 || c.out.good !== (ok2 / 8 >= 0.75) || c.out.rounds.length !== 8) b9.push('pron pair game ' + c.id); }
  for (const c of V.pron.lesson.filter(x => /^quiz-/.test(x.id))) { const right = c.out.steps.filter(s => s.ok).length, r = c.out.rewardsTotal[0]; if (r.xp !== 8 + 3 * right || r.perfect !== (right === 5 ? 1 : 0) || c.out.writes[0]['th-sounds'] !== Math.round(right / 5 * 100)) b9.push('pron quiz ' + c.id); }
  for (const c of V.pron.say.filter(x => /^session-/.test(x.id))) { const f = c.out.final.score.v; if (c.out.rewards[0].xp !== 5 + 2 * f.ok || c.out.rewards[0].spoken !== f.ok) b9.push('pron say xp ' + c.id); }
  { const bd = V.pron.logic.coach.band; if (J(bd.map(x => x.out)) !== J(['again', 'again', 'again', 'close', 'close', 'close', 'great', 'great'])) b9.push('PronCoach.band 65/85'); if (V.pron.logic.pairs.decide[0].out.res !== 'other' || V.pron.logic.pairs.decide.find(x => x.id === 'decide-8').out.res !== 'neither') b9.push('PronPairs.decide'); }
  { for (const c of V.pron.rhythm) if (c.out.rewards.length ? c.out.rewards[0].xp !== (c.out.score >= 85 ? 4 : 2) : c.out.score >= 65) b9.push('pron rhythm reward ' + c.id); }
  { const m = Object.fromEntries(V.say.mic.filter(x => /^mic-\d/.test(x.id)).map(x => [x.input.score, x.out.result.k])); if (!/^Chuẩn/.test(m[85]) || !/^Gần đúng/.test(m[84]) || !/^Gần đúng/.test(m[60]) || !/^Chưa giống/.test(m[59])) b9.push('say mic 85/60'); const ls = byId(V.say.actions, 'listen').out; if (ls.spoken[0].voice !== 'af_heart' || ls.spoken[1].rate !== 0.7 || byId(V.say.actions, 'listen-carlos').out.spoken[0].voice !== 'am_michael') b9.push('say teacher voices / slow 0.7'); }
  { const g = byId(V.reflex.game, 'timed-run').out; if (g.rewards[0].spoken !== 2 || g.rewards[0].xp !== 5 + 2 * 2 || g.ticks.find(t => t.after === 60).timer !== 0 || byId(V.reflex.game, 'timeout-no-answer').out.rewards.length) b9.push('reflex 60 s reward 5 + 2n'); if (byId(V.reflex.colorize, 'exact').out.pct !== 100 || byId(V.reflex.colorize, 'window').out.pct !== 17 || byId(V.reflex.pool, 'cap-40').out.size !== 40) b9.push('reflex colourise / pool cap'); }
  for (const c of V.rtype.flows) { const r = c.out.rewards[0], right = +c.out.result.v.r, tot = +c.out.result.v.n; if (r.xp !== 5 + 2 * right || r.quizzes !== 1 || r.readings !== 1 || c.out.game.rtype[c.input.kind].t !== (c.input.previous[c.input.kind] ? c.input.previous[c.input.kind].t : 0) + tot) b9.push('rtype flow ' + c.id); }
  { for (const c of V.roleplay.chat.filter(x => x.out.report && x.out.report.ring != null && x.out.rewards.length)) { const spoken = c.out.rewards[0].spoken, hints = c.out.steps.filter(s => s.step === 'hint' || s.step === 'help').length; if (c.out.rewards[0].xp !== Math.max(5, 10 + 3 * spoken - Math.min(hints, spoken))) b9.push('roleplay xp ' + c.id); } const g = byId(V.roleplay.ai, 'guest-budget').out; if (J(g.modes.map(m => m.k.slice(0, 2))) !== J(['☁️', '☁️', '📜', '📜'])) b9.push('roleplay guest AI budget 2/day'); const sr = byId(V.roleplay.chat, 'server-report-ai').out.report; if (J(sr.meters.map(m => m.value)) !== '[91,82,73,64]' || sr.rewrites.length !== 3) b9.push('roleplay AI report clamp/rewrites'); }
  { const p = byId(V.handsfree.play, 'visible-clips').out.events; if (!p.some(e => e[0] === 'wait' && e[1] === 2200) || !p.some(e => e[0] === 'wait' && e[1] === 900) || byId(V.handsfree.play, 'hidden-screen').out.events.some(e => e[0] === 'speak' || e[0] === 'wait')) b9.push('handsfree timings / hidden screen'); }
  { const t = V.persist; if (!t.speak || !t.speak.includes('localStorage:lk.spk') || !t.pron.includes('game:pronDone') || !t.pron.includes('localStorage:lk.pronPairs') || !t.rtype.includes('game:rtype') || !t.rtype.includes('store:mistakes') || !t.say.includes('localStorage:lk.say.seen') || !t.roleplay.includes('localStorage:vb.rp.level') || !t.handsfree.includes('settings:hf')) b9.push('persist keys'); }
  if (V.data.speaking.bank.length !== 3 || V.data.pron.lessons.length !== 3 || V.data.roleplay.length !== 2 || Object.keys(V.data.situations).length !== 2 || V.data.readtests.tests.length < 1 || Object.keys(V.data.readtests.counts).length !== 8 || Object.keys(V.data.pron.weak).length < 35) b9.push('data block');
  ok(b9.length === 0, `speak vectors obey the web rules (speak drill stars/xp, speaking analyse/shadow/clock, pron mic/pairs/quiz/say/rhythm, say mic, reflex, rtype, roleplay xp + AI budget, handsfree timing, persist)${b9.length ? ' – ' + b9.slice(0, 4).join('; ') : ''}`);
  // the downloadable pack (web/data/speak-pack.json, https://lexkite.com/data/speak-pack.json) + the offline starter
  {
    const zlib = await import('node:zlib'), K1 = await SP.speakPack(), K2 = await SP.speakPack(), S1 = await SP.speakStarter(), PK = JSON.parse(K1), ST = JSON.parse(S1), gz = zlib.gzipSync(K1, { level: 9 }).length, bp = [];
    ok(K1 === K2 && same(SP.SPEAK_PACK_PATH, K1), 'speak-pack.json: two runs identical and equal to the committed file (else: node scripts/native/gen.mjs)');
    ok(Buffer.byteLength(K1) < 700 * 1024 && gz < 250 * 1024, `speak-pack.json size: ${(Buffer.byteLength(K1) / 1024) | 0} KB raw (< 700) / ${(gz / 1024) | 0} KB gzip (< 250); not in the extension or app shell, no audio`);
    ok(S1 === (await SP.speakStarter()) && same(SP.SPEAK_STARTER_PATH, S1) && same('native/ios/LexkiteKit/Sources/LKStore/Resources/speak-content.json', S1) && Buffer.byteLength(S1) < 128 * 1024, `speak-starter.json: deterministic, equal to the committed copies (shared + iOS resource), ${(Buffer.byteLength(S1) / 1024) | 0} KB < 128`);
    if (!/^[0-9a-f]{12}$/.test(PK.v) || PK.schema !== 1) bp.push('v/schema');
    if (PK.speaking.bank.length < 30 || Object.keys(PK.speaking.samples).length < 300 || Object.keys(PK.speaking.parts).join() !== 'p1,p2,p3' || !PK.speaking.fillers.includes('you know')) bp.push('speaking');
    if (PK.pron.lessons.length !== 56 || PK.pron.pairs.contrasts.length !== 23 || Object.keys(PK.pron.pairs.tips).length !== 23 || PK.pron.coach.sentences.length !== 12 || Object.keys(PK.consts.weak).length < 35) bp.push('pron');
    if (PK.roleplay.scripts.length !== 31 || PK.roleplay.guestAiPerDay !== 2 || PK.roleplay.rate.join() !== '0.82,0.92,1' || Object.keys(PK.roleplay.names).length < 16 || PK.roleplay.errors.length !== 11) bp.push('roleplay');
    const JS = x => JSON.stringify(x);
    if (V.data.pron.lessons.some(l => JS(PK.pron.lessons.find(q => q.id === l.id)) !== JS(l)) || JS(V.data.pron.pairs) !== JS(PK.pron.pairs) || V.data.roleplay.some(r => JS(PK.roleplay.scripts.find(q => q.id === r.id)) !== JS(r))) bp.push('data.* differs from the pack');
    if (JS(PK.consts.speakScore) !== JS(V.shared.speak.cal) || JS(PK.speaking.parts) !== JS(V.data.speaking.parts)) bp.push('consts vs vectors');
    if (ST.speaking.bank.length !== 8 || ST.pron.lessons.length !== 8 || ST.roleplay.scripts.length !== 6 || JS(ST.pron.pairs) !== JS(PK.pron.pairs) || ST.speaking.bank.some((b, i) => JS(b) !== JS(PK.speaking.bank[i]))) bp.push('starter is not a subset of the pack');
    ok(bp.length === 0, `speak-pack.json: ${PK.speaking.bank.length} speaking topics + ${Object.keys(PK.speaking.samples).length} sample answers, 56 pronunciation lessons + pair/coach tables, 31 roleplay scripts + constants; shape = speak.json data.*; starter = 8 topics / 8 lessons / 6 scripts${bp.length ? ' – ' + bp.join('; ') : ''}`);
  }
  // strings: every t() key of the P07 screens (literal calls + keys that arrive as data) is mapped by strings.json
  {
    const have9 = new Set(Object.values(JSON.parse(rd('native/shared/strings.json')))), keys9 = await SP.speakStringKeys(), miss9 = keys9.filter(k => !have9.has(k.key)).map(k => k.key);
    ok(miss9.length === 0, `M4 strings: ${keys9.length} t() keys of the P07 screens are mapped in native/shared/strings.json${miss9.length ? ' – missing: ' + miss9.slice(0, 3).join(' | ') : ''}`);
  }
}

// ---- 10) M4 call vectors (P08 Call Ama / Carlos: #/call) ----
{
  const CL = await import('../native/gen-call.mjs');
  const C1 = await CL.callVectors(), C2 = await CL.callVectors();
  ok(C1 === C2 && same(`${SH}/vectors/call.json`, C1), 'call.json: two runs identical and equal to the committed file (else: node scripts/native/gen.mjs)');
  ok(Buffer.byteLength(C1) < 300 * 1024, `call.json < 300 KB (${(Buffer.byteLength(C1) / 1024) | 0} KB; owner cap, incl. the cut-down content "data")`);
  const V = JSON.parse(C1), at = (o, k) => k.split('.').reduce((x, y) => (x ? x[y] : undefined), o), bad = [];
  const selfD = a => Array.isArray(a) && a.length > 0 && a.every(c => c && typeof c.why === 'string' && c.why.length > 8 && c.input !== undefined && c.out !== undefined);
  for (const k of ['engine.prep', 'engine.depth', 'engine.step', 'engine.correct', 'engine.slips', 'engine.fluency', 'engine.recap', 'engine.retry', 'engine.asrMode', 'engine.asrModeNative', 'list', 'ring', 'flow', 'rewards', 'progress']) if (!selfD(at(V, k))) bad.push(k);
  ok(bad.length === 0, `call.json: every vector list is present and each case has why + input + out${bad.length ? ' – missing/invalid: ' + bad.join(', ') : ''}`);
  // rules that the web code states and the ports must keep (cheap re-derivations from the vectors themselves)
  const b10 = [], byId = (l, id) => l.find(c => c.id === id), J = JSON.stringify, E = V.engine, flowOf = id => byId(V.flow, id).out, steps = (f, name) => f.steps.filter(s => s.step === name);
  { const ex = k => E.correct.find(c => c.id === 'correct-' + k).out;
    for (const [k, good] of [['agree', 'I agree with you'], ['doesnt', "She doesn't like coffee"], ['modal-to', 'I can help you'], ['more-better', 'This is better'], ['very-like', 'I really like this place'], ['past-own', 'I saw him yesterday'], ['past-prompt', 'I went to the park with my friends']]) if (!ex(k) || ex(k).good !== good) b10.push('correct ' + k);
    if (ex('past-own-no-marker') !== null || ex('past-prompt-no-own') !== null || ex('already-ok') !== null || ex('third-person-modal') !== null) b10.push('correct past/own/modal conditions'); if (ex('several-rules').whys.length !== 2) b10.push('correct applies every rule'); }
  { const sl = id => E.slips.find(c => c.id === 'slips-' + id).out; if (J(sl('bread-breast')) !== '[{"said":"breast","meant":"bread","id":"final-drop","skill":"final-consonants"}]' || sl('already-said').length || sl('stem-variant').length || sl('max-two').length !== 2) b10.push('slips'); }
  { const f = id => E.fluency.find(c => c.id === 'fluency-' + id).out; if (f('fillers').words !== 6 || f('fillers').fillers !== 3 || !f('short').short || f('min-zero').short || f('secs-one').wpm !== 0 || f('plain').wpm !== 70 || !f('link').link) b10.push('fluency'); }
  { const st = id => E.step.find(c => c.id === 'step-' + id).out; if (st('branch-null-ends').next !== null || st('branch-keeps-next').next !== 'b' || st('default').br !== -1 || st('invalid-regex').react !== 'good' || st('unknown-node').next !== null || st('word-start').br !== 0 || st('word-start-no').br !== -1 || st('tl-fold-text').br !== 0) b10.push('step'); }
  { const rc = id => E.recap.find(c => c.id === 'recap-' + id).out, edge = E.recap.filter(c => /^recap-edge-/.test(c.id));
    if (rc('all-good').score !== 100 || rc('all-good').band !== 'great' || rc('empty-log').score !== 0 || J(rc('all-picked').notes) !== '[{"id":"speak"}]' || rc('all-picked').weak.length || rc('floor-40').score < 40) b10.push('recap score / floor / picked');
    for (const c of edge) { const s = c.out.score; if (c.out.band !== (s >= 85 ? 'great' : s >= 70 ? 'good' : 'keep')) b10.push('recap band ' + s); } if (!edge.some(c => c.out.score === 70) || !edge.some(c => c.out.score === 85)) b10.push('recap band edges 70/85 not both covered');
    const ids = new Set(E.recap.flatMap(c => c.out.notes.map(n => n.id))); for (const n of ['short', 'link', 'fillers', 'slips', 'slow', 'speak', 'good']) if (!ids.has(n)) b10.push('recap note ' + n + ' not covered');
    if (rc('asr-ignored').weak.length || !rc('weak-fix').weak.includes('name') || rc('slow-boundary-70').notes.some(n => n.id === 'slow') || !rc('slow-boundary-69').notes.some(n => n.id === 'slow') || rc('note-link-everyday').notes.some(n => n.id === 'link') || rc('tl-es').turns[0].fix !== null) b10.push('recap rules'); }
  { const r = id => E.retry.find(c => c.id === 'retry-' + id).out; if (!r('two-nodes').retry || r('two-nodes').start !== 'job' || J(Object.keys(r('two-nodes').nodes)) !== '["job","name"]' || r('two-nodes').nodes.job.next !== 'name' || r('two-nodes').nodes.name.next !== null || r('two-nodes').nodes.job.br.some(b => b.length !== 2) || r('dedupe-unknown').nodes.job === undefined) b10.push('retry'); }
  { const a = E.asrMode, one = (p, o) => a.find(c => c.input.pref === p && Object.entries(o).every(([k, v]) => c.input[k] === v)).out;
    if (a.length < 128 || one('tap', { local: true, sr: true, media: true, ext: false, whisper: true }) !== 'tap' || one(null, { local: true, sr: true, media: false, ext: false, whisper: false }) !== 'local' || one('cloud', { local: false, sr: true, media: false, ext: false, whisper: false }) !== 'cloud' || one(null, { local: false, sr: true, media: false, ext: false, whisper: false }) !== 'ask' || one(null, { local: false, sr: false, media: false, ext: false, whisper: false }) !== 'tap' || one(null, { local: false, sr: false, media: true, ext: false, whisper: true }) !== 'whisper' || one('device', { local: false, sr: false, media: true, ext: false, whisper: false }) !== 'whisper') b10.push('asrMode table');
    const nat = Object.fromEntries(E.asrModeNative.map(c => [c.id, c.out])); if (nat['native-none-11'] !== 'local' || nat['native-tap-11'] !== 'tap' || nat['native-cloud-01'] !== 'cloud' || nat['native-none-01'] !== 'ask' || nat['native-none-00'] !== 'tap') b10.push('asrModeNative'); }
  { const d = byId(E.depth, 'depth-all-calls').out; if (d.coffee !== 6 || Object.keys(d).length < 30 || V.data.calls.some(c => !(c.id in d))) b10.push('depth table'); }
  { const l0 = byId(V.list, 'list-default').out.steps[0].out, g = id => byId(V.list, id).out.steps.at(-1).out.cardIds;
    if (l0.cards.length < 30 || l0.filter.buttons.map(b => b.group).join() !== 'all,ielts,toeic,everyday' || !l0.filter.buttons[0].pressed || l0.cards.find(c => c.id === 'coffee').name.k !== 'Mua cà phê cho cả nhóm' || l0.cards.find(c => c.id === 'hobbies').name.k !== l0.cards.find(c => c.id === 'hobbies').title || g('list-filter-ielts').some(i => !/^ielts/.test(i)) || J(g('list-filter-toeic')) !== '["toeic-reschedule"]' || g('list-filter-everyday').some(i => /^ielts|^toeic/.test(i)) || g('list-filter-all').length !== l0.cards.length) b10.push('list groups / names');
    if (byId(V.list, 'list-filter-ielts').out.steps[1].writes[0].key !== 'vb.call.flt' || byId(V.list, 'list-asr-change').out.steps[1].asrPrefAfter !== null || byId(V.list, 'list-asr-change').out.steps[1].out.changeAsr) b10.push('list persist'); }
  { const f = flowOf('tap-through-coffee'), say = f.steps[1].say, last = f.steps.find(s => s.summary); if (J(say) !== J(['Great choice!', 'Do you want it hot or iced?']) || J(f.steps[1].phases) !== '["think","talk","you"]' || f.steps[1].progress !== '17%' || !last || last.rewards[0].xp !== 17 || last.rewards[0].spoken !== 0 || last.progress !== '100%' || f.teacher.voice !== 'af_heart') b10.push('flow tap-through say order / phases / progress / xp'); }
  { const f = flowOf('unsafe-reask'), s = steps(f, 'type'); if (s[0].say[0] !== "Let's keep our chat friendly and on topic!" || s[0].say[1] !== f.steps[0].say[0] || s[0].state.logged !== 0 || s[0].state.node !== f.steps[0].state.node || s[2].state.node === s[0].state.node || s[2].state.logged !== 1) b10.push('flow unsafe keeps node and re-asks'); }
  { const f = flowOf('long-turn-buffering'), c = f.steps.filter(s => s.cue && s.cue.kind === 'prep'), lg = f.steps.find(s => s.cue && s.cue.kind === 'long' && s.longWords);
    if (!c.length || !c.some(s => s.clock === '00:59') || !c.some(s => s.clock === '00:29') || !lg || lg.longWords.v.n < 20 || lg.state.logged !== 0 || f.steps.some(s => s.log && s.log.some(x => x.id === 'intro')) || !f.steps.some(s => s.log && s.log.some(x => x.id === 'talk' && x.text.split('. ').length >= 4))) b10.push('flow long turn: prep clock, buffering, word count, 120 s'); }
  { const d = flowOf('long-turn-silent').steps.flatMap(s => s.log || []).find(x => x.id === 'talk'), t = flowOf('long-turn-tap-option').steps.flatMap(s => s.log || []).find(x => x.id === 'talk'); if (!d || !d.picked || !t || !t.picked || t.text.length < 300) b10.push('flow long turn silent/tap ⇒ model answer'); }
  { const f = flowOf('voice-fix-slip-retry'), sm = f.steps.filter(s => s.summary).map(s => s.summary), tip = f.steps.find(s => s.tip && s.tip.kind === 'fix');
    if (sm.length !== 2 || !tip || sm[0].turns[1].slips[0].said !== 'breast' || sm[0].buttons.retry.v.n !== 2 || sm[1].header.retry === null || f.steps.find(s => s.step === 'retry').state.logged !== 0 || J(f.steps.find(s => s.step === 'retry').say) !== J([sm[0].turns[1].question])) b10.push('flow fix tip / slip / retry call'); }
  { const f = flowOf('voice-full-call'); if (f.steps.flatMap(s => s.log || []).some(x => !x.secs || x.asr == null)) b10.push('flow voice log secs/asr'); }
  { const f = flowOf('save-cards-fixes'), cards = f.steps.find(s => s.cards).cards; if (cards.length !== 6 || cards[0].entry.topic !== 'call' || cards[0].entry.pos !== 'phrase' || cards[0].entry.emoji !== '📞' || cards[0].opts.silent !== true || cards[5].entry.word !== 'I agree, yes a latte please' || cards[5].entry.ex !== cards[5].entry.word || !/^Call Ama: /.test(cards[0].ctx.title)) b10.push('flow save-cards phrases + fixes'); }
  { for (const r of V.rewards) { const x = r.input, xp = 5 + x.turns * 2 + x.voiced * 2 + (x.usedWords > 0 ? 3 : 0); if (r.out.xp !== xp || r.out.spoken !== x.voiced) b10.push('reward ' + r.id); } if (V.rewards.length < 5) b10.push('rewards: too few flows'); }
  { for (const p of V.progress) { const x = p.input, want = x.ended ? '100%' : Math.min(95, Math.round(x.logged / Math.max(1, x.depth) * 100)) + '%'; if (p.out !== want) b10.push('progress ' + p.id); } if (V.progress.length < 20) b10.push('progress: too few'); }
  { const m = flowOf('asr-ask-cloud'), ask = m.steps.find(s => s.ask).ask; if (ask.choices.map(c => c.id).join() !== 'cloud,tap' || !m.store.includes('vb.call.asr') || steps(m, 'recognized')[0].state.mode !== 'cloud' || flowOf('asr-tap-only').steps[1].toasts[0].k !== 'Trên thiết bị này hãy chạm gợi ý hoặc gõ câu trả lời.' || flowOf('asr-errors').steps[1].toasts[0].recError !== 'no-speech' || flowOf('asr-errors').steps[2].toasts[0].recError !== 'not-allowed' || flowOf('stale-result-ignored').steps.at(-1).state.logged !== 1 || flowOf('hang-no-log').steps.at(-1).hash[0] !== '#/call' || !flowOf('hang-with-log').steps.at(-1).summary) b10.push('flow asr modes / errors / stale / hang'); }
  { const r = flowOf('asr-whisper').steps.find(s => s.recognizer).recognizer[0]; if (!r.whisper || r.maxMs !== Math.min(15000, 3000 + (V.data.calls[0].nodes.t0.min || 8) * 450)) b10.push('whisper maxMs'); }
  { const t = flowOf('subtitles-vi'); if (t.translateRequests[0].lang !== 'vi' || t.translateRequests[0].pieces < 10 || J(t.steps.flatMap(s => s.writes || []).map(w => w.value)) !== '["0","1"]') b10.push('subtitles'); }
  { const p = V.persist.localStorage; if (J(p) !== '["vb.call.asr","vb.call.flt","vb.call.tr"]') b10.push('persist keys'); }
  if (V.data.calls.length !== 6 || V.data.pron.contrasts.length < 20 || !V.data.calls.some(c => c.who === 'ama') || !V.data.calls.some(c => c.who === 'carlos') || !V.data.calls.some(c => c.nodes.talk && c.nodes.talk.long) || !V.data.calls.some(c => c.exam === 'toeic')) b10.push('data block');
  ok(b10.length === 0, `call vectors obey the web rules (engine correct/slips/fluency/recap/retry/asrMode, list groups + names, say order, phases, unsafe, long turn, tips, retry, rewards xp, progress %, asr modes, persist)${b10.length ? ' – ' + b10.slice(0, 4).join('; ') : ''}`);
  // the downloadable pack (web/data/call-pack.json, https://lexkite.com/data/call-pack.json) + the offline starter (Android assets content-pack/call-starter.json, iOS Resources/call-content.json)
  {
    const zlib = await import('node:zlib'), K1 = await CL.callPack(), K2 = await CL.callPack(), S1 = await CL.callStarter(), PK = JSON.parse(K1), ST = JSON.parse(S1), gz = zlib.gzipSync(K1, { level: 9 }).length, bp = [], JS = x => JSON.stringify(x);
    ok(K1 === K2 && same(CL.CALL_PACK_PATH, K1), 'call-pack.json: two runs identical and equal to the committed file (else: node scripts/native/gen.mjs)');
    ok(Buffer.byteLength(K1) < 200 * 1024 && gz < 60 * 1024, `call-pack.json size: ${(Buffer.byteLength(K1) / 1024) | 0} KB raw (< 200) / ${(gz / 1024) | 0} KB gzip (< 60); not in the extension or app shell, no audio`);
    ok(S1 === (await CL.callStarter()) && same(CL.CALL_STARTER_PATH, S1) && same('native/ios/LexkiteKit/Sources/LKStore/Resources/call-content.json', S1) && Buffer.byteLength(S1) < 48 * 1024, `call-starter.json: deterministic, equal to the committed copies (shared content-pack = Android assets + iOS resource), ${(Buffer.byteLength(S1) / 1024) | 0} KB < 48`);
    ok(/Resources\/call-content\.json/.test(fs.readFileSync(R('native/ios/LexkiteKit/Package.swift'), 'utf8')), 'Package.swift copies Resources/call-content.json (iOS bundle) – Android reads content-pack/call-starter.json from assets (srcDirs shared/gen)');
    if (!/^[0-9a-f]{12}$/.test(PK.v) || PK.schema !== 1) bp.push('v/schema');
    if (PK.calls.length < 30 || PK.calls.some(c => !c.nodes || !c.start || c.turns || c._ok || !c.phrases || !c.who || !c.exam || !c.end) || !PK.calls.some(c => c.who === 'ama') || !PK.calls.some(c => c.who === 'carlos')) bp.push('calls');
    if (PK.calls.some(c => c.tl)) bp.push('English calls only');
    if (PK.pron.contrasts.length !== 23 || Object.keys(PK.consts.engine.extraPairs).length < 8 || !PK.consts.engine.past.go || PK.consts.engine.filler.flags !== 'gi' || PK.consts.call.names['coffee'] !== 'Mua cà phê cho cả nhóm' || PK.consts.call.longSeconds !== 120 || !/fuck/.test(PK.consts.call.unsafe.en.source) || PK.consts.engine.score.great !== 85) bp.push('consts');
    if (V.data.calls.some(c => JS(PK.calls.find(q => q.id === c.id)) !== JS(c)) || JS(V.data.pron.contrasts) !== JS(PK.pron.contrasts)) bp.push('data.* differs from the pack');
    if (ST.calls.length < 6 || ST.calls.length > 10 || !ST.calls.some(c => /^ielts/.test(c.exam)) || !ST.calls.some(c => c.exam === 'toeic') || !ST.calls.some(c => c.exam === 'everyday') || !ST.calls.some(c => c.who === 'ama') || !ST.calls.some(c => c.who === 'carlos') || ST.calls.some(c => JS(PK.calls.find(q => q.id === c.id)) !== JS(c)) || JS(ST.pron) !== JS(PK.pron) || JS(ST.consts) !== JS(PK.consts)) bp.push('starter is not a subset of the pack');
    // every call the pack carries is walkable: ids resolve, depth > 0, every branch target exists, every node has a question and ≥ 1 suggestion
    const eng = CL.engine(); for (const c of PK.calls) { const e = JSON.parse(JS(c)); if (!(eng.depth(e) > 0) || !e.nodes[e.start]) bp.push('walk ' + c.id); for (const [k, n] of Object.entries(c.nodes)) { if (!n.m || !(n.o || []).length) bp.push(`node ${c.id}/${k}`); for (const to of [n.next, ...(n.br || []).map(b => b[2])]) if (to && !c.nodes[to]) bp.push(`dangling ${c.id}/${k}→${to}`); } }
    ok(bp.length === 0, `call-pack.json: ${PK.calls.length} English calls as prepared graphs (Ama + Carlos; IELTS/TOEIC/everyday), pair index data + engine tables + page constants; shape = call.json data.*; starter = ${ST.calls.length} calls${bp.length ? ' – ' + bp.slice(0, 4).join('; ') : ''}`);
  }
  // strings: every t() key of the call screens (call.js, engine.js, teacher-call frame, recogniser errors; NAME/GROUP labels included) is mapped by strings.json
  {
    const have10 = new Set(Object.values(JSON.parse(rd('native/shared/strings.json')))), keys10 = CL.callStringKeys(), miss10 = keys10.filter(k => !have10.has(k.key)).map(k => k.key);
    ok(miss10.length === 0 && keys10.length > 100, `M4 strings: ${keys10.length} t() keys of the P08 call screens are mapped in native/shared/strings.json${miss10.length ? ' – missing: ' + miss10.slice(0, 3).join(' | ') : ''}`);
    const vk = new Set(); const walk = o => { if (o && typeof o === 'object') { if (typeof o.k === 'string' && Object.keys(o).every(x => x === 'k' || x === 'v' || x === 'icon')) vk.add(o.k); for (const v of Object.values(o)) walk(v); } }; walk({ list: V.list, ring: V.ring, flow: V.flow, engine: V.engine.correct });
    const unmapped = [...vk].filter(k => !have10.has(k) && /[À-ỹ]/.test(k));
    ok(unmapped.length === 0, `call.json: every Vietnamese key in the vector outputs exists in strings.json${unmapped.length ? ' – missing: ' + unmapped.slice(0, 3).join(' | ') : ''}`);
  }
}

// ---- 11) M4 write vectors (P09 Writing & grammar: #/write #/task1 #/qstats #/criteria) ----
{
  const WR = await import('../native/gen-write.mjs');
  const W1 = await WR.writeVectors(), W2 = await WR.writeVectors();
  ok(W1 === W2 && same(`${SH}/vectors/write.json`, W1), 'write.json: two runs identical and equal to the committed file (else: node scripts/native/gen.mjs)');
  ok(Buffer.byteLength(W1) < 300 * 1024, `write.json < 300 KB (${(Buffer.byteLength(W1) / 1024) | 0} KB; owner cap, incl. the word-library index of Lexis.analyze)`);
  const V = JSON.parse(W1), bad = [];
  const selfD = a => Array.isArray(a) && a.length > 0 && a.every(c => c && typeof c.why === 'string' && c.why.length > 8 && c.input !== undefined && c.out !== undefined);
  for (const k of ['write.analyze', 'write.flow', 'task1.score', 'task1.flow', 'qstats.cases']) if (!selfD(k.split('.').reduce((x, y) => (x ? x[y] : undefined), V))) bad.push(k);
  ok(bad.length === 0, `write.json: every vector list is present and each case has why + input + out${bad.length ? ' – missing/invalid: ' + bad.join(', ') : ''}`);
  const b11 = [], an = id => V.write.analyze.find(c => c.id === id).out, sc = id => V.task1.score.find(c => c.id === id).out;
  // rules that the web code states and the ports must keep (cheap re-derivations from the vectors themselves)
  for (const c of V.write.analyze.filter(c => c.id !== 'too-short')) { const o = c.out, w = o.words;
    const cap = w < 150 ? 5 : w < 250 ? 6 : 8.5; if (o.band > cap || o.band < 4 || o.band * 2 !== Math.round(o.band * 2)) b11.push('band ' + c.id);
    if ((w < 250) !== o.tips.some(t => /^Bài mới có/.test(t.k))) b11.push('short tip ' + c.id);
    if (o.overused.some(([, n]) => n < 4) || o.overused.length > 8) b11.push('overused ' + c.id);
    if (o.writes[0].value[0].prompt !== 'p1' || o.writes[0].value[0].words !== w || JSON.stringify(o.rewards) !== '[{"quizzes":1,"writes":1,"xp":25}]') b11.push('saves ' + c.id); }
  if (an('band-8-essay').band <= an('band-5-essay').band || an('repeat').overused.length < 2 || !an('long-sentences').tips.some(t => /^Câu trung bình hơi dài/.test(t.k)) || !an('even-lengths').tips.some(t => /^Câu có độ dài khá giống/.test(t.k))) b11.push('analyse ordering/tips');
  const ta = V.write.analyze.find(c => c.id === 'too-short').out; if (ta.reported || ta.writes.length || ta.rewards.length || ta.toast.length !== 1) b11.push('too-short');
  if (sc('good-line').band !== 8 || sc('under-100').band > 4.5 || sc('120-words').band > 5.5 || !sc('opinion').notes.some(n => /^Task 1 <b>không nêu/.test(n.k)) || !sc('process-active').notes.some(n => /^Với quy trình/.test(n.k)) || !sc('map-passive').notes.some(n => /^Với bản đồ/.test(n.k))) b11.push('task1 score rules');
  const fl = V.write.flow.find(c => c.id === 'saved-list').out; if (fl.keptAfter !== 20 || fl.newest !== 'p5' || fl.shownCount !== 6) b11.push('saved list');
  const qs = id => V.qstats.cases.find(c => c.id === id).out; if (!qs('empty').empty || qs('unknown-skill').cards.length || qs('listening-reading').cards.map(c => c.name).join() !== 'IELTS Listening,IELTS Reading' || JSON.stringify(V.qstats.skills.map(s => s[0])) !== '["il","ir","tl","tr","fr","fl","fw"]') b11.push('qstats');
  ok(b11.length === 0, `write vectors obey the web rules (Lexis.analyze band caps + tips, saved essays, Task 1 score, qstats cards)${b11.length ? ' – ' + b11.slice(0, 4).join(' | ') : ''}`);
  // the downloadable pack (web/data/write-pack.json, https://lexkite.com/data/write-pack.json)
  {
    const P1 = await WR.writePack(), P2 = await WR.writePack(), PK = JSON.parse(P1), bp = [];
    ok(P1 === P2 && same(WR.WRITE_PACK_PATH, P1), 'write-pack.json: two runs identical and equal to the committed file (else: node scripts/native/gen.mjs)');
    ok(Buffer.byteLength(P1) < 80 * 1024, `write-pack.json size: ${(Buffer.byteLength(P1) / 1024) | 0} KB (< 80); not in the extension or app shell`);
    if (!/^[0-9a-f]{12}$/.test(PK.v) || PK.schema !== 1) bp.push('v/schema');
    if (JSON.stringify(PK.write.outline) !== JSON.stringify(V.write.static.outline) || JSON.stringify(PK.write.trends) !== JSON.stringify(V.write.static.trends) || JSON.stringify(PK.task1.vocab) !== JSON.stringify(V.task1.static.vocab) || JSON.stringify(PK.lexis.stop) !== JSON.stringify(V.data.stop)) bp.push('tables differ from the vectors');
    for (const sk of ['writing', 'speaking']) { const d = PK.criteria[sk]; if (!d || d.criteria.length !== 4 || Object.keys(d.models).join() !== '5.0,6.5,8.0' || d.jumpTips.length < 2 || d.criteria.some(c => Object.keys(c.bands).join() !== '4,5,6,7,8,9') || PK.scoreKeys[sk].length !== 4) bp.push('criteria ' + sk); }
    if (PK.qstats.skills.length !== 7 || !PK.write.connectors.includes('Firstly,') || PK.lexis.stop.length < 100) bp.push('qstats/connectors/stop');
    ok(bp.length === 0, `write-pack.json: criteria (writing + speaking: 4 criteria × bands 4–9, 3 models, roadmap) + STOP table + page tables; shape = write.json criteria rules${bp.length ? ' – ' + bp.join(' | ') : ''}`);
  }
  // strings: every t() key of the P09 screens (write.js, task1.js, qtips.js #/qstats, criteria.js + their data) is mapped by strings.json
  {
    const have11 = new Set(Object.values(JSON.parse(rd('native/shared/strings.json')))), keys11 = await WR.writeStringKeys(), miss11 = keys11.filter(k => !have11.has(k.key)).map(k => k.key);
    ok(miss11.length === 0 && keys11.length > 300, `M4 strings: ${keys11.length} t() keys of the P09 writing screens are mapped in native/shared/strings.json${miss11.length ? ' – missing: ' + miss11.slice(0, 3).join(' | ') : ''}`);
    const vk = new Set(); const walk = o => { if (o && typeof o === 'object') { if (typeof o.k === 'string' && Object.keys(o).every(x => x === 'k' || x === 'v')) vk.add(o.k); for (const v of Object.values(o)) walk(v); } }; walk(V);
    const unmapped = [...vk].filter(k => !have11.has(k) && /[À-ỹ]/.test(k));
    ok(unmapped.length === 0, `write.json: every Vietnamese key in the vector outputs exists in strings.json${unmapped.length ? ' – missing: ' + unmapped.slice(0, 3).join(' | ') : ''}`);
  }
}

// ---- 12) M4 learn vectors (P09 part 2: #/fix #/grammar #/method #/quick #/style #/confidence) ----
{
  const LN = await import('../native/gen-learn.mjs');
  const L1 = await LN.learnVectors(), L2 = await LN.learnVectors();
  ok(L1 === L2 && same(`${SH}/vectors/learn.json`, L1), 'learn.json: two runs identical and equal to the committed file (else: node scripts/native/gen.mjs)');
  ok(Buffer.byteLength(L1) < 400 * 1024, `learn.json < 400 KB (${(Buffer.byteLength(L1) / 1024) | 0} KB)`);
  const V = JSON.parse(L1), b12 = [];
  const selfD = a => Array.isArray(a) && a.length > 0 && a.every(c => c && typeof c.id === 'string');
  for (const k of ['fix.cases', 'style.cases', 'method.cases']) if (!selfD(k.split('.').reduce((x, y) => (x ? x[y] : undefined), V))) b12.push(k);
  // fix: every rule of the web table fires in at least one case; the engine's guards (empty / clean / overlap) hold
  const ruleIds = new Set(V.fix.cases.flatMap(c => c.issues.map(i => i.rule))); const content = JSON.parse(await LN.learnContent());
  const missingRules = content.fix.rules.map(r => 'lk:' + r.id).filter(r => !ruleIds.has(r));
  if (missingRules.length) b12.push('fix rules never hit: ' + missingRules.join(','));
  if (content.fix.rules.length !== 40) b12.push('fix rule count ' + content.fix.rules.length);
  const fx = id => V.fix.cases.find(c => c.id === id);
  if (fx('empty').issues.length || fx('clean').issues.length || fx('whitespace').issues.length || fx('long-repeat').issues.length > 400) b12.push('fix guards');
  const ov = fx('overlap').issues; for (let i = 1; i < ov.length; i++) if (ov[i].s < ov[i - 1].e) b12.push('fix overlap');
  if (fx('sample').fixed === fx('sample').text) b12.push('fix sample not fixed');
  // style: four styles, six questions of four options, the winner of "all same" is that style, ties go to the latest pick
  const stc = id => V.style.cases.find(c => c.id === id).winner;
  if (stc('natural-all') !== 'natural' || stc('precision-all') !== 'precision' || stc('pragmatic-all') !== 'pragmatic' || stc('curious-all') !== 'curious' || stc('tie-last-wins') !== 'precision') b12.push('style winners');
  if (content.style.questions.length !== 6 || content.style.questions.some(q => q.opts.length !== 4) || Object.keys(content.style.styles).length !== 4) b12.push('style data');
  // method: loop of 6, four strands, 12 principles with a stat each, 5 FAQ, four plans
  if (content.method.principles.length !== 12 || content.method.faq.length !== 5 || content.method.loop.length !== 6 || Object.keys(content.method.plans).join() !== 's0,s1,s2,s3') b12.push('method content');
  if (V.method.cases.some(c => c.out.prin.length !== 12 || c.out.loop.length !== 6 || c.out.strands.length !== 4)) b12.push('method cases shape');
  // confidence + grammar
  if (content.conf.units.length < 20 || !content.conf.toolkit.length || !content.conf.daily.length) b12.push('confidence data');
  if (V.grammar.counts.lessons !== 80 || V.grammar.missingListed.length || V.grammar.counts.l1.length !== 14) b12.push('grammar counts');
  if (V.quick.limit !== 15 || V.quick.n !== 4) b12.push('quick constants');
  ok(b12.length === 0, `learn vectors obey the web rules (fix rule table + guards, style winners, method content, grammar tables, quick constants)${b12.length ? ' – ' + b12.slice(0, 4).join(' | ') : ''}`);
  // bundled content + download pack (grammar-pack.json = https://lexkite.com/data/grammar-pack.json; the app bundles learn-content.json and grammar-starter.json)
  {
    const C1 = await LN.learnContent(), G1 = await LN.grammarPack(), G2 = await LN.grammarPack(), S1 = await LN.grammarStarter(), bp = [];
    ok(same(LN.LEARN_CONTENT_PATH, C1) && same('native/ios/LexkiteKit/Sources/LKStore/Resources/learn-content.json', C1), 'learn-content.json: equal to the committed file and the iOS copy (else: node scripts/native/gen.mjs)');
    ok(G1 === G2 && same(LN.GRAMMAR_PACK_PATH, G1), 'grammar-pack.json: two runs identical and equal to the committed file');
    ok(same(LN.GRAMMAR_STARTER_PATH, S1) && same('native/ios/LexkiteKit/Sources/LKStore/Resources/grammar-content.json', S1), 'grammar-starter.json: equal to the committed file and the iOS copy');
    ok(Buffer.byteLength(C1) < 200 * 1024 && Buffer.byteLength(S1) < 100 * 1024, `bundled size: learn-content ${(Buffer.byteLength(C1) / 1024) | 0} KB (< 200) + grammar starter ${(Buffer.byteLength(S1) / 1024) | 0} KB (< 100)`);
    ok(Buffer.byteLength(G1) < 1400 * 1024, `grammar-pack.json size: ${(Buffer.byteLength(G1) / 1024) | 0} KB (< 1400; downloaded, never bundled)`);
    const GP = JSON.parse(G1), GS = JSON.parse(S1);
    if (!/^[0-9a-f]{12}$/.test(GP.v) || GP.schema !== 1 || GP.lessons.length !== 80 || GP.index.length !== 80) bp.push('shape');
    if (GS.index.length !== 80 || GS.lessons.length !== 3 || GS.lessons.some(l => !GP.lessons.find(x => x.id === l.id))) bp.push('starter');
    if (GP.lessons.some(l => !l.quiz.length || !l.blocks.length)) bp.push('lessons without quiz/blocks');
    ok(bp.length === 0, `grammar pack: 80 lessons with blocks + quiz, 14 L1 languages, starter lists all and carries 3${bp.length ? ' – ' + bp.join(' | ') : ''}`);
  }
  // strings: every t() key of the part-2 screens (+ their data) and every `lv("…")` literal of the new native code is mapped by strings.json
  {
    const have12 = new Set(Object.values(JSON.parse(rd('native/shared/strings.json')))), keys12 = await LN.learnStringKeys(), miss12 = keys12.filter(k => !have12.has(k.key) && /[À-ỹ]/.test(k.key)).map(k => k.key);
    ok(miss12.length === 0 && keys12.length > 600, `M4 strings: ${keys12.length} t() keys of the P09 part-2 screens are mapped in native/shared/strings.json${miss12.length ? ' – missing: ' + miss12.slice(0, 3).join(' | ') : ''}`);
    const files = ['native/ios/LexkiteKit/Sources/LKStore/Skills/LearnCore.swift', 'native/ios/LexkiteKit/Sources/LKStore/Skills/FixEngine.swift', 'native/android/core/src/main/kotlin/com/lexkite/app/core/write/Learn.kt',
      ...fs.readdirSync(R('native/ios/LexkiteKit/Sources/LKFeatures/Write')).filter(f => /^(Fix|Grammar|Learn|Confidence)/.test(f)).map(f => 'native/ios/LexkiteKit/Sources/LKFeatures/Write/' + f),
      ...fs.readdirSync(R('native/android/feature-vocab/src/main/kotlin/com/lexkite/app/feature/vocab')).filter(f => /^(Fix|Grammar|Learn|Confidence)/.test(f)).map(f => 'native/android/feature-vocab/src/main/kotlin/com/lexkite/app/feature/vocab/' + f)];
    const lit = [];
    for (const f of files) rd(f).split('\n').forEach((ln, i) => { if (/^\s*(\/\/|\*|\/\*)/.test(ln)) return; for (const m of ln.matchAll(/"((?:[^"\\]|\\.)*)"/g)) { if (!/[À-ỹ]/.test(m[1])) continue; const s = m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\\$/g, '$'); if (!have12.has(s)) lit.push(`${f.split('/').pop()}:${i + 1} ${s.slice(0, 50)}`); } });
    ok(lit.length === 0, `P09 part-2 native code: every Vietnamese literal (lv("…") / Line("…")) is a key of strings.json (${files.length} files)${lit.length ? ' – missing: ' + lit.slice(0, 3).join(' | ') : ''}`);
  }
}

if (failed) process.exit(1);
console.log('✓ native-m2-vectors OK');
