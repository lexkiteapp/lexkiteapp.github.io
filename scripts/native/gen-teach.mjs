/* Native M2 – teacher rig (C05): shared rig definition + frame/lip-sync conformance vectors + the bundled offline art list.
 * Decision (docs/specs/native-apps.md §5, teacher-rive-rig.md): the native apps do NOT use a .riv file; they port the web TeacherRig (same Rive-style inputs:
 * `viseme`, `emotion`, trigger `gesture`) and draw on a SwiftUI Canvas / Compose Canvas over the bare-head image + pose stills.
 * Everything below comes from running the REAL web code (node `require` of the same UMD files the CI gate scripts/test/teacher-rig.mjs uses, plus vm for
 * characters.js / teacher-mood.js):  web/js/teacher-rig.js (core machine, matrix, LIMITS, EMOTIONS, GESTURES) · web/js/call/{face,mouths,paint,lipsync}.js ·
 * web/js/call/cues.js (LK_CUES: real Kokoro cue + loudness envelopes) · web/js/characters.js (Chars) · web/js/teacher-mood.js.  Nothing is re-implemented.
 * Exports teachGen() → { rigJson, vectorJson, bundle:[{rel, srcRel, bytes}] }. Used by scripts/native/gen.mjs. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = p => path.join(ROOT, p);
const rq = createRequire(import.meta.url);
const r6 = x => (typeof x === 'number' ? Number(x.toFixed(6)) : x);
const FPS = 60, EVERY = 6; // reference frames: the machine is stepped at 1/60 s, every EVERY-th frame is recorded
export const TEACHERS = ['ama', 'carlos'];
/** Poses bundled offline (byte-for-byte web/teach/<who>/still-<pose>.webp, ≤ 60 KB each): feedback sheet (cheer / concern / encourage), complete + streak (cheer, laugh, empathy),
 * rig defaults (happy, thinking, point) and the gesture-bank thumbs_up. Anything else (explain, wave, surprise, clap, hold_card, talk, listen) is fetched like web (CDN) with `happy` as fallback. */
export const BUNDLED_POSES = ['happy', 'cheer', 'point', 'thinking', 'concern', 'encourage', 'laugh', 'empathy', 'thumbs_up'];
export const HEAD_FILE = 'head-bare-2x.webp';
const STILL_MAX = 60 * 1024;

const web = f => rq(R('web/js/' + f));
function loadVm(files, extra = {}) { const sb = { console, ...extra }; sb.self = sb; sb.globalThis = sb; vm.createContext(sb); for (const f of files) vm.runInContext(fs.readFileSync(R(f), 'utf8'), sb, { filename: f }); return sb; }
const lipSrc = fs.readFileSync(R('web/js/call/lipsync.js'), 'utf8');
/** `const A = <js literal>, B = …;` constants that lipsync.js keeps private → read from the source (so they cannot drift). */
const lit = (name, re) => { const m = re.exec(lipSrc); if (!m) throw new Error(`gen-teach: ${name} not found in web/js/call/lipsync.js`); return Function(`return (${m[1]})`)(); };

/** vectors/rig.json text – the ONE serializer (gen.mjs writes it, scripts/test/native-m2-vectors.mjs compares with it).
 *  Floats → 9 decimals (values already rounded to 6 decimals are unchanged): Math.exp/pow/sin differ in the last bit between x64 (CI)
 *  and arm64 V8 builds (seen in lipsync.gain); ports compare with ≥ 1e-9 absolute tolerance, so this keeps the drift gate byte-stable. */
export const rigVectorText = v => JSON.stringify(v, (k, x) => (typeof x === 'number' && !Number.isInteger(x) ? Math.round(x * 1e9) / 1e9 : x)) + '\n';

export function teachGen() {
  process.env.TZ = 'UTC';
  const RIG = web('teacher-rig.js'), LS = web('call/lipsync.js'), LF = web('call/face.js'), LM = web('call/mouths.js'), LP = web('call/paint.js');
  const chars = loadVm(['web/js/characters.js']).Chars;
  const cuesG = {}; new Function('self', fs.readFileSync(R('web/js/call/cues.js'), 'utf8'))(cuesG);
  const CUES = cuesG.LK_CUES, DICT = CUES.dict;
  const mood = loadVm(['web/js/characters.js', 'web/js/teacher-mood.js']).TeacherMood;
  const charsJson = JSON.parse(fs.readFileSync(R('web/teach/characters.json'), 'utf8'));
  const seedOf = who => [...who].reduce((a, c) => a * 31 + c.charCodeAt(0), 7); // = TeacherRig.mount (web/js/teacher-rig.js)
  const hasOf = who => p => chars.has(who, p);

  // ================= rig.json =================
  const GMIN = lit('GMIN', /const GMIN = ([0-9.]+), GMAX/), GMAX = lit('GMAX', /const GMIN = [0-9.]+, GMAX = ([0-9.]+);/);
  const people = {};
  for (const who of TEACHERS) {
    const gestures = {};
    for (const [name, G] of Object.entries(RIG.GESTURES)) {
      if (G.kind === 'proc') { gestures[name] = { kind: 'proc', dur: G.dur }; continue; }
      const pose = RIG.poseOf(G, hasOf(who)), file = chars.still(who, pose).replace(/^teach\//, 'teach/'); // same relative path as the CDN / bundle: teach/<who>/still-<pose>.webp
      gestures[name] = { kind: 'pose', wanted: G.pose, pose, file, hold: G.hold, emo: G.emo, pending: !!G.pending, alt: G.alt || null, bundled: BUNDLED_POSES.includes(pose) };
    }
    people[who] = {
      name: chars.name(who), voice: chars.voice(who), head: `teach/${who}/${HEAD_FILE}`, stillPattern: `teach/${who}/still-<pose>.webp`,
      seed: seedOf(who), stills: chars.stills(who), poses: chars.poses.filter(p => chars.has(who, p)).concat(chars.stills(who)),
      bundledPoses: BUNDLED_POSES, gestures,
    };
  }
  const rigJson = {
    _doc: 'GENERATED by scripts/native/gen-teach.mjs from web/js/teacher-rig.js, web/js/call/{face,mouths,lipsync}.js, web/js/characters.js, web/js/call/cues.js (dict) – do not edit by hand. Native port of the web TeacherRig (docs/specs/teacher-rive-rig.md): same Rive-style inputs, drawn on a Canvas over the bare-head image. Schema: docs/specs/native-m2-vectors.md.',
    version: 1,
    canvas: { w: 1108, h: 960, aspect: '1108/960', breathPivot: [554, 960], note: 'All face coordinates are poster-2x pixels; the head image and every pose still are 1108x960 with the same origin.' },
    fps: FPS,
    limits: RIG.LIMITS, fade: RIG.FADE, emotions: RIG.EMOTIONS,
    poseEmo: chars.POSE_EMO, people,
    face: { rig: LF.RIG, emo: LF.EMO },
    mouth: { shapes: LM.SHAPES, shape: LM.SHAPE, style: LM.STYLE, segments: 24 },
    lip: { vis: LS.VIS, blend: LS.BLEND, minHold: LS.MIN_HOLD, lead: LS.LEAD, leads: LS.LEADS, gain: { min: GMIN, max: GMAX }, dict: DICT,
      elv: lit('ELV', /const ELV = (\{[^}]+\});/), emin: lit('EMIN', /const EMIN = (\{[^}]+\});/) },
    bundle: { head: HEAD_FILE, poses: BUNDLED_POSES, maxStillBytes: STILL_MAX, fallbackPose: 'happy' },
    moodRules: { note: 'TeacherMood.machine (web/js/teacher-mood.js): answer ok → cheer · wrong → concern, 2nd wrong in a row → encourage · streak → laugh · streakLost → empathy · idle → encourage. Pose → emotion via poseEmo. Reference: vectors/rig.json mood[].' },
  };

  // ================= vectors/rig.json =================
  // ---- sources: real Kokoro cue + envelope entries from cues.js (sampled evenly, plus the ones the scenarios use) ----
  const keys = Object.entries(CUES.k).filter(([, v]) => v).map(([k]) => k).sort();
  const ents = keys.map(k => ({ key: k, packed: CUES.k[k], u: LS.unpack(CUES.k[k]) }));
  const pickSrc = (lo, hi, skip = 0) => ents.filter(e => e.u.dur >= lo && e.u.dur <= hi)[skip];
  const SA = pickSrc(2.4, 3.2, 0), SB = pickSrc(3.4, 4.6, 1), SC = pickSrc(1.9, 2.6, 2);
  const sample = new Set([SA.key, SB.key, SC.key]); for (let i = 0; i < 16; i++) sample.add(keys[Math.floor(i * keys.length / 16)]);
  const toSrc = e => ({ key: e.key, dur: e.u.dur, cues: e.u.cues.map(c => [c.start, c.value]), env255: e.u.env.map(v => Math.round(v * 255)) });
  const sources = Object.fromEntries([...sample].sort().map(k => [k, toSrc(ents.find(e => e.key === k))]));
  const expand = s => ({ dur: s.dur, cues: s.cues.map(([start, value], i, a) => ({ value, start, end: i < a.length - 1 ? a[i + 1][0] : s.dur })), env: s.env255.map(v => v / 255) });
  for (const s of Object.values(sources)) { const e = ents.find(x => x.key === s.key); if (JSON.stringify(expand(s).cues) !== JSON.stringify(e.u.cues) || JSON.stringify(expand(s).env) !== JSON.stringify(e.u.env)) throw new Error('gen-teach: source round trip drifted ' + s.key); }

  // ---- lip-sync: pure functions of web/js/call/lipsync.js ----
  const cuesOut = cs => cs.map(c => [c.start, c.end, c.value]);
  const unpack = [
    ...[SA, SB].map(e => ({ packed: e.packed, out: { dur: e.u.dur, cues: e.u.cues.map(c => [c.start, c.value]), env255: e.u.env.map(v => Math.round(v * 255)) } })),
    ...[[1000, 'X0 B120 A400 D700'], [1000, '+X0 B24 A40 D60'], [1200, '*X0B5A8D5F10'], [900, '*X0Bo', 'AAAA~3.AAAAQUJD'], [500, 'X0', '~2.']].map(p => { const u = LS.unpack(p); return { packed: p, out: { dur: u.dur, cues: u.cues.map(c => [c.start, c.value]), env255: u.env ? u.env.map(v => Math.round(v * 255)) : null } }; }),
  ];
  const TEXTS = [['Hello, how are you today?', 2.4], ['Maybe the bubble moves up.', 2.0], ['I have five loops.', 1.8], ['Wow!', 0.8], ['Thank you very much, my friend. See you soon.', 4.0], ['', 1], ['Look at Mary: she wants a beautiful photo.', 3.2]];
  LS.setDict(null);
  const fromTextPlain = TEXTS.map(([text, dur]) => ({ text, dur, out: cuesOut(LS.fromText(text, dur)) }));
  const unitsPlain = TEXTS.slice(0, 4).map(([text]) => ({ text, out: LS.units(text) }));
  LS.setDict(DICT);
  const fromTextDict = TEXTS.map(([text, dur]) => ({ text, dur, out: cuesOut(LS.fromText(text, dur)) }));
  const unitsDict = TEXTS.slice(0, 4).map(([text]) => ({ text, out: LS.units(text) }));
  const fromEnv = [[SA, 'Could you open the window, please?'], [SC, 'It is a good idea.']].map(([e, text]) => ({ source: e.key, text, dur: e.u.dur, out: cuesOut(LS.fromEnv(text, e.u.dur, e.u.env)) }));
  const liveCases = [['Hello, how are you today?', 2.4], ['Maybe the bubble moves up.', 2.0]].map(([text, dur]) => {
    const lv = LS.live(text, { dur }), trace = [];
    for (let i = 0; i <= Math.ceil(dur * FPS) + 20; i++) { const t = i / FPS, voiced = t > 0.1 && t < dur - 0.1 && (i % 90) < 72; lv.tick(t, voiced, 1 / FPS); if (i % 6 === 0) trace.push([i, voiced ? 1 : 0, lv.cues[lv.cues.length - 1].value]); }
    return { text, dur, fps: FPS, voicedRule: 't > 0.1 && t < dur - 0.1 && (i % 90) < 72', trace, cues: lv.cues.map(c => [c.start, c.end, c.value]) };
  });
  LS.setDict(null);
  const stateAt = [SA, SB].flatMap(e => { const c = e.u.cues; return Array.from({ length: 24 }, (_, i) => { const t = Math.round(e.u.dur * i / 23 * 1000) / 1000, s = LS.stateAt(c, t); return { source: e.key, t, a: s.a, b: s.b, k: s.k, i: s.i }; }); });
  const gain = [SA, SB].map(e => { const g = LS.gain(e.u.env); return { source: e.key, samples: Array.from({ length: 30 }, (_, i) => { const t = Math.round(e.u.dur * i / 29 * 1000) / 1000; return [t, g(t)]; }) }; });
  const lipsync = { tolMs: 33, unpack, units: { plain: unitsPlain, dict: unitsDict }, fromText: { plain: fromTextPlain, dict: fromTextDict }, fromEnv, live: liveCases, stateAt, gain };

  // ---- lip-sync gate vector: cue → shape that must show within ±33 ms (same measurement as scripts/test/teacher-rig.mjs §1) ----
  const lipGate = [];
  for (const s of Object.values(sources)) for (const who of TEACHERS) {
    const E = expand(s), M = RIG.machine(who, { seed: 3 }); let T = 0;
    M.speak({ clock: () => T, playing: () => T < s.dur, cues: E.cues, env: E.env, dur: s.dur, text: s.key });
    const tr = []; let ps = 'X';
    for (let i = 0; T <= s.dur + 0.1; i++) { T = i / FPS; const sh = M.step(100 + T).shape; if (sh !== ps) { tr.push([r6(T), sh]); ps = sh; } }
    const checks = [];
    E.cues.forEach((c, i) => {
      const prev = i ? E.cues[i - 1].value : 'X';
      if (c.end - c.start < 0.05 || c.value === prev || c.start < 0.05 || c.start > s.dur - 0.05) return;
      let d = 1; for (const [t, sh] of tr) if (sh === c.value && Math.abs(t - c.start) < Math.abs(d)) d = t - c.start;
      checks.push({ i, start: c.start, value: c.value, deltaMs: Math.round(d * 1000) });
    });
    lipGate.push({ source: s.key, who, seed: 3, nowOffset: 100, text: s.key, transitions: tr, checks });
  }

  // ---- machine scenarios: frame-by-frame reference of TeacherRig.core.machine ----
  const COLS = ['i', 'shape', 'talking', 'tilt', 'nod', 'sway', 'breath', 'poseW', 'pose', 'emo', 'blink', 'brow', 'knit', 'lookX', 'lookY', 'open', 'gain', ...Object.keys(LM.SHAPE.X).map(k => 'm.' + k)];
  function runScenario(who, spec) {
    const M = RIG.machine(who, { calm: !!spec.calm, seed: seedOf(who), has: hasOf(who) });
    const ev = spec.events.map(e => ({ ...e })).sort((a, b) => a.t - b.t); let ei = 0, cur = 0, t0 = 0; const rows = [], n = Math.round(spec.seconds * FPS);
    if (spec.dict) LS.setDict(DICT);
    for (let i = 0; i < n; i++) {
      const now = i / FPS; cur = now;
      while (ei < ev.length && ev[ei].t <= now + 1e-9) {
        const e = ev[ei++];
        if (e.op === 'emotion') M.setEmotion(e.name);
        else if (e.op === 'listen') M.setEmotion(e.on ? 'listen' : 'neutral');
        else if (e.op === 'gesture') M.gesture(e.name, now);
        else if (e.op === 'quiet') M.quiet();
        else if (e.op === 'speak') {
          t0 = now; const dur = e.dur != null ? e.dur : sources[e.source].dur, t0l = t0;
          if (e.source) { const X = expand(sources[e.source]); M.speak({ clock: () => cur - t0l, playing: () => cur - t0l < dur, cues: X.cues, env: X.env, dur, text: e.text }); }
          else M.speak({ clock: () => cur - t0l, playing: () => cur - t0l < dur, live: LS.live(e.text, { dur }), dur, text: e.text });
        }
      }
      const f = M.step(now), s = f.s;
      if (i % EVERY === 0 || i === n - 1) rows.push([i, f.shape, f.talking ? 1 : 0, f.tilt, f.nod, f.sway, f.breath, f.poseW, f.pose, f.emo, s.blink, s.brow, s.knit, s.look.x, s.look.y, s.open, s.gain == null ? null : s.gain, ...Object.keys(LM.SHAPE.X).map(k => s.mouth[k])].map(r6));
    }
    if (spec.dict) LS.setDict(null);
    return { id: spec.id, who, calm: !!spec.calm, seed: seedOf(who), dict: !!spec.dict, seconds: spec.seconds, events: spec.events, rows };
  }
  const EMO = Object.keys(RIG.EMOTIONS);
  const TXT_Q = 'Could you open the window, please?', TXT_S = 'It is a good idea to try again.';
  const SPEC = [
    { id: 'idle', seconds: 6, events: [] },
    { id: 'emotions', seconds: 7.5, events: [...EMO, 'neutral'].map((name, i) => ({ t: i * 0.7, op: 'emotion', name })) },
    { id: 'gestures', seconds: 11, events: [[0.2, 'nod'], [0.8, 'shake'], [1.4, 'bob'], [1.9, 'blink'], [2.4, 'cheer'], [5.0, 'thumbs_up'], [7.0, 'hold_card'], [8.6, 'clap'], [10.0, 'wave']].map(([t, name]) => ({ t, op: 'gesture', name })) },
    { id: 'speak-cues', seconds: 5, events: [{ t: 0, op: 'emotion', name: 'happy' }, { t: 0.4, op: 'speak', source: SA.key, text: TXT_Q }, { t: 1.2, op: 'gesture', name: 'nod' }, { t: 0.4 + SA.u.dur, op: 'quiet' }] },
    { id: 'speak-queue', seconds: 6, events: [{ t: 0.3, op: 'speak', source: SB.key, text: TXT_S }, { t: 0.8, op: 'gesture', name: 'cheer' }, { t: 1.0, op: 'gesture', name: 'think' }, { t: 0.3 + SB.u.dur, op: 'quiet' }] },
    { id: 'speak-live', seconds: 5, dict: true, events: [{ t: 0.2, op: 'listen', on: true }, { t: 0.8, op: 'speak', text: 'Hello, how are you today?', dur: 2.4 }, { t: 3.2, op: 'quiet' }] },
    { id: 'listen-then-speak', seconds: 5, events: [{ t: 0, op: 'listen', on: true }, { t: 1.5, op: 'listen', on: false }, { t: 1.8, op: 'speak', source: SC.key, text: TXT_S }, { t: 1.8 + SC.u.dur, op: 'quiet' }] },
  ];
  const CALM = ['idle', 'emotions', 'gestures', 'speak-cues', 'speak-queue'];
  const scenarios = [];
  for (const who of TEACHERS) { for (const sp of SPEC) scenarios.push(runScenario(who, sp)); for (const sp of SPEC.filter(x => CALM.includes(x.id))) scenarios.push(runScenario(who, { ...sp, id: sp.id + '-calm', calm: true })); }

  // ---- matrix (rigid transform) ----
  const matrix = TEACHERS.flatMap(who => [[0, 0, 0, 0], [6, 0, 0, 0], [-6, 8, 3, 0.006], [2.5, -3, -3, -0.006], [0, 8, 0, 0.003], [-3.3, 4, 1.5, 0.006]].map(([tilt, nod, sway, breath]) => {
    const f = { pivot: LF.RIG[who].pivot, tilt, nod, sway, breath }; return { who, ...f, m: RIG.matrix(f).map(r6) };
  }));

  // ---- face paint: LipFace.parts(...) compiled by LipPaint.compile (the exact canvas op lists the web draws) ----
  const mixState = (a, b, k, o = {}) => ({ mouth: LM.mix(a, b, k), ...o });
  const paintStates = [
    ...LM.SHAPES.map(sh => ({ name: 'shape-' + sh, st: { mouth: sh } })),
    { name: 'blink-half', st: { mouth: 'X', blink: 0.5 } }, { name: 'blink-full', st: { mouth: 'A', blink: 1 } },
    { name: 'look-brow-knit', st: mixState('D', 'F', 0.4, { blink: 0.1, look: { x: 0.6, y: -0.3 }, brow: 0.6, knit: 0.4, open: 0.6 }) },
    { name: 'mix-bg', st: mixState('B', 'G', 0.7, { brow: -0.2, look: { x: -0.5, y: 0.4 } }) }, { name: 'mix-xc-smile', st: { mouth: { ...LM.mix('X', 'C', 0.5), s: 0.4 }, open: 0.5 } },
  ];
  const paint = TEACHERS.flatMap(who => paintStates.map(p => {
    const parts = LF.parts(who, p.st, 'tr' + who);
    return { who, name: p.name, state: p.st, parts: parts.map(str => LP.compile(str)) };
  }));

  // ---- mood (TeacherMood.machine) ----
  const moodSeq = [['answer', { ok: true }], ['answer', { ok: true }], ['answer', { ok: false }], ['answer', { ok: false }], ['answer', { ok: false }], ['answer', { ok: true }], ['streak', {}], ['streakLost', {}], ['idle', {}], ['unknown', {}]];
  const MM = mood.machine(), moodOut = moodSeq.map(([type, d]) => { const r = MM.feed(type, d); return { type, data: d, out: r, state: MM.state() }; });

  // ---- gestures resolved + emotions as the machine sees them (poseOf per teacher) ----
  const vector = {
    _doc: 'Reference outputs of the REAL web TeacherRig core (web/js/teacher-rig.js machine/matrix, call/{lipsync,face,mouths,paint}.js, cues.js, teacher-mood.js). Stepped at 1/60 s; scenario rows are every ' + EVERY + 'th frame (cols = columns). Tolerance 2e-6 on floats, exact on strings; see docs/specs/native-m2-vectors.md.',
    fps: FPS, every: EVERY, columns: COLS, sources, lipsync, lipGate, scenarios, matrix, paint, mood: moodOut,
  };
  return { rigJson, vectorJson: vector, SA: SA.key, SB: SB.key };
}

/** Bundled teacher art: head + BUNDLED_POSES for both teachers, byte for byte from web/teach (size-capped). → [{ who, name, srcRel, bytes }] */
export function teachBundle() {
  const chars = JSON.parse(fs.readFileSync(R('web/teach/characters.json'), 'utf8')), out = [];
  for (const who of TEACHERS) {
    if (!chars.people[who]) throw new Error(`teacher "${who}" is not in web/teach/characters.json`);
    for (const name of [HEAD_FILE, ...BUNDLED_POSES.map(p => `still-${p}.webp`)]) {
      if (name.startsWith('still-')) { const p = name.slice(6, -5); if (!chars.poses.includes(p) && !(chars.still_poses || []).includes(p)) throw new Error(`teacher pose "${p}" is not in web/teach/characters.json`); }
      const srcRel = `web/teach/${who}/${name}`, bytes = fs.readFileSync(R(srcRel));
      if (bytes.length > STILL_MAX) throw new Error(`teacher art ${who}/${name} is ${bytes.length} B – too large to bundle`);
      out.push({ who, name, srcRel, bytes });
    }
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const t = teachGen(), v = JSON.stringify(t.vectorJson), r = JSON.stringify(t.rigJson);
  console.log('rig.json', r.length, 'B · vectors/rig.json', v.length, 'B · bundle', teachBundle().reduce((s, x) => s + x.bytes.length, 0), 'B');
}
