// Teach2D rig plan (pure, Node only – no browser): timeline + Rhubarb cues -> ONE global viseme track, speak blocks, emotion/gesture schedule,
// and a core simulation of TeacherRig (web/js/teacher-rig.js TeacherRig.core.machine) with the exact clock semantics of the DOM layer.
// Used by rig_host.mjs (render + cross-check of the page against the core) and scripts/test/teach2d-rig.mjs. Spec: docs/specs/video-production-v2.md §1.
// The gate twin of cueTrack() lives in scripts/video/teach2d/lipsync_gate.py (qc.py lipsync_rig recomputes the track and compares).
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const CORE = require(path.join(ROOT, 'web/js/teacher-rig.js'));
export const SHAPES = ['X', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];   // Rhubarb letters == rig shapes (same identity map as scripts/test/teacher-rig.mjs)
export const FPS = 30;
export const LONG = 1.2;    // s – pose gestures only inside silences >= LONG (spec); also where one speak block ends and the next starts
export const PRE = 0.2;     // s – a block's speak() starts PRE before its first voiced cue (openK ramp 40 ms + pose fade 180 ms finish before the voice)
export const POST = 0.15;   // s – and ends POST after its last voiced cue
export const FIN = 0.08;    // s – the DOM layer calls quiet() dur + 80 ms after speak() (teacher-rig.js setTimeout(fin, dur * 1000 + 80))
export const BASE = 600000; // ms – page clock (performance.now) at video t = 0 (page.clock.pauseAt(BASE) after install({ time: 0 }))
const ms = x => Math.floor(x * 1000 + 0.5);   // same rounding in lipsync_gate.py (no banker's rounding)
/** Frame count – same formula as labels.py frames_of (integer ms half-up, then half-up frames). Math.round(total*fps) vs Python round()
 *  disagreed on x.5 (pilot #679: 833 vs 832). */
export const framesOf = (total, fps = FPS) => Math.floor((ms(total) * fps + 500) / 1000);
export const nfOf = T => (T.nf != null ? T.nf | 0 : framesOf(T.total, T.fps || FPS));
export const r3 = x => ms(x) / 1000;

/** Ordered timeline lines -> [{ id, t0, t1, text, words, pause, quiz, repeat }] */
export const linesOf = T => Object.entries(T.lines).map(([id, v]) => ({ id, ...v }));

/** One global cue track [{ value, start, end }] (seconds, video clock): every line's Rhubarb mouthCues shifted by the line's t0,
 *  clipped at the next line's t0, holes filled with X, X from 0 and to `total`, equal neighbours merged. */
export function cueTrack(lines, readCues, total) {
  const raw = [];
  lines.forEach((l, i) => {
    const lim = i + 1 < lines.length ? lines[i + 1].t0 : total;
    for (const c of readCues(l.id)) {
      if (!SHAPES.includes(c.value)) throw new Error(`rig_plan: unknown Rhubarb shape ${c.value} in line ${l.id}`);
      const s = r3(l.t0 + c.start), e = Math.min(r3(l.t0 + c.end), r3(lim));
      if (e > s) raw.push({ value: c.value, start: s, end: e });
    }
  });
  const out = []; let cur = 0;
  const push = (value, start, end) => { if (end <= start) return; const p = out[out.length - 1]; if (p && p.value === value && Math.abs(p.end - start) < 1e-9) p.end = end; else out.push({ value, start, end }); };
  for (const c of raw) { if (c.start > cur) push('X', cur, c.start); push(c.value, Math.max(cur, c.start), c.end); cur = Math.max(cur, c.end); }
  if (cur < r3(total)) push('X', cur, r3(total));
  return out;
}

/** Voiced intervals (non-X runs) of a track -> [[a, b]] */
export const voiced = track => { const v = []; for (const c of track) { if (c.value === 'X') continue; const p = v[v.length - 1]; if (p && Math.abs(p[1] - c.start) < 1e-9) p[1] = c.end; else v.push([c.start, c.end]); } return v; };

/** Speak blocks: speech separated by silences >= LONG. ONE speak() per block (a single speak for the whole video keeps the rig "speaking"
 *  through every pause, so its queued pose gestures would only play after the last word – teacher-rig.js gesture(): `if (S) queue`). */
export function blocks(track, total) {
  const V = voiced(track), B = [];
  for (const iv of V) { const b = B[B.length - 1]; if (b && iv[0] - b.v1 < LONG) b.v1 = iv[1]; else B.push({ v0: iv[0], v1: iv[1] }); }
  B.forEach((b, i) => {
    b.start = r3(Math.max(i ? B[i - 1].end + FIN + 0.05 : 0, b.v0 - PRE)); b.end = r3(Math.min(total, b.v1 + POST)); b.dur = r3(b.end - b.start);
    if (i && b.start < B[i - 1].end + FIN) throw new Error('rig_plan: block overlaps the previous quiet()');
    b.cues = track.filter(c => c.end > b.start && c.start < b.end).map(c => ({ value: c.value, start: r3(Math.max(0, c.start - b.start)) }));
    if (!b.cues.length || b.cues[0].value !== 'X' || b.cues[0].start !== 0) b.cues.unshift({ value: 'X', start: 0 });
  });
  return B;
}

const GEST_FOR_POSE = pose => Object.entries(CORE.GESTURES).filter(([, g]) => g.kind === 'pose' && g.pose === pose).map(([n]) => n).sort((a, b) => (a === pose ? -1 : b === pose ? 1 : 0))[0] || null;
const posesOf = names => [...new Set(names.map(n => CORE.GESTURES[n] && CORE.GESTURES[n].pose).filter(Boolean))];
export const SILENCE_POSES = ['point', 'explain', 'cheer'];

/** Emotion / gesture schedule from the script (spec §1): hook surprise -> happy · quiz: thinking in its pause · answer: praise + nod ·
 *  CTA: encourage · otherwise explain (neutral in a long pause without a pose). Pose gestures only in silences >= LONG between blocks. */
export function schedule(T, lines, B) {
  const ev = [], hook = (T.hook && T.hook.line) || lines[0].id, rings = (T.nodes || []).filter(n => n.type === 'ring').map(n => n.ring);
  const wEnd = l => (l.words && l.words.length ? l.words[l.words.length - 1].e : l.t1), wStart = l => (l.words && l.words.length ? l.words[0].s : l.t0);
  const isQuiz = l => !!l.quiz || rings.some(r => r.t0 >= wEnd(l) - 0.2 && r.t0 <= l.t1 + (l.pause || 0));
  const MX = mixGestures(T.mix);
  const react = T.pose && T.pose.clip ? { after: T.pose.after, g: GEST_FOR_POSE(T.pose.clip) } : null;
  const at = (t, kind, name, why) => ev.push({ t: r3(Math.max(0, t)), kind, name, why });
  lines.forEach((l, i) => {
    const prev = lines[i - 1], s = wStart(l);
    if (l.id === hook) { at(s - 0.1, 'emo', 'surprise', 'hook'); at((s + wEnd(l)) / 2, 'emo', 'happy', 'hook'); }
    else if (isQuiz(l)) { at(s - 0.1, 'emo', 'explain', 'quiz'); at(wEnd(l) + 0.05, 'emo', 'thinking', 'quiz pause'); }
    else if (prev && isQuiz(prev)) { at(s - 0.1, 'emo', 'praise', 'answer'); at(s + 0.05, 'gesture', 'nod', 'answer'); }
    else if (l.id === 'c') at(s - 0.1, 'emo', 'encourage', 'cta');
    else at(s - 0.1, 'emo', 'explain', 'line');
  });
  // silences between blocks: pose gesture after quiet() when it shows >= 0.5 s at full weight (react pose >= 0.3 s) before the next speak fades it
  for (let i = 0; i + 1 < B.length; i++) {
    const g0 = B[i].end + FIN + 0.02, room = B[i + 1].start - g0, F = CORE.FADE;
    const l = [...lines].reverse().find(x => wStart(x) <= B[i].v1) || lines[0];
    if (isQuiz(l)) continue;   // quiz countdown: thinking face only (the ring is the focus)
    let name = null, need = 2 * F + 0.5;
    if (react && react.after === l.id && react.g) { name = react.g; need = 2 * F + 0.3; }
    else if (l.repeat) name = 'point';           // "say it with me" -> your turn
    else if (lines[lines.indexOf(l) - 1] && isQuiz(lines[lines.indexOf(l) - 1])) name = MX.g_praise || 'cheer';   // mix.py silence gestures (0-credit bank)
    else name = MX.g_line || 'explain';
    if (room >= need) at(g0, 'gesture', name, `silence ${(B[i + 1].v0 - B[i].v1).toFixed(2)} s`);
    else at(g0, 'emo', 'neutral', 'silence');
  }
  if (react && !ev.some(e => e.kind === 'gesture' && e.name === react.g)) ev.push({ t: 0, kind: 'error', why: `react pose ${T.pose.clip} (gesture ${react.g}) has no silence after line ${react.after}` });
  B.forEach((b, i) => ev.push({ t: b.start, kind: 'speak', block: i, dur: b.dur, cues: b.cues, text: lines.filter(l => wStart(l) >= b.start - 1e-6 && wStart(l) < b.end).map(l => l.text).join(' ') }));
  // speak first at equal times (setEmotion/gesture after it, as a script would call them)
  return ev.sort((a, b) => a.t - b.t || (a.kind === 'speak' ? -1 : b.kind === 'speak' ? 1 : 0));
}

/** Full plan for a timeline + vo dir (Rhubarb vo/<id>.json). */
export function plan(T, vo) {
  const lines = linesOf(T), fps = T.fps || FPS, nf = nfOf(T);
  const track = cueTrack(lines, id => JSON.parse(fs.readFileSync(path.join(vo, id + '.json'), 'utf8')).mouthCues, T.total);
  const B = blocks(track, T.total), all = schedule(T, lines, B), events = all.filter(e => e.kind !== 'error'), errors = all.filter(e => e.kind === 'error').map(e => e.why);
  const used = posesOf(events.filter(e => e.kind === 'gesture').map(e => e.name));
  return { who: T.teacher, fps, nf, total: T.total, track, blocks: B.map(({ cues, ...b }) => ({ ...b, n: cues.length })), events, poses: used, errors };
}

/** Sample time of video frame f (ms after BASE): the middle of the frame's display interval (|error| <= half a frame). */
export const sampleMs = (f, fps = FPS) => ms((f + 0.5) / fps);
export const seedOf = who => [...who].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);   // = TeacherRig.mount

/** Core simulation with the DOM layer's semantics: speak(null, cues, {dur}) -> clock = (now - t0), playing = clock < dur, quiet() at
 *  t0 + dur + 80 ms; gesture(name) at now; one step(now) per video frame at sampleMs(f). Returns per-frame state like rig_host logs. */
export function simulate(P, o = {}) {
  const base = o.base ?? BASE, M = CORE.machine(P.who, { seed: seedOf(P.who) }), q = P.events.map(e => ({ ...e, at: base + ms(e.t) })), timers = [], out = [];
  let NOW = base, k = 0;
  const run = to => {   // fire timers and events in time order up to `to` (timers first at equal times, like page.clock.runFor then the call)
    for (;;) {
      const tm = timers.length ? timers[0] : null, e = k < q.length ? q[k] : null;
      if (tm && tm.at <= to && (!e || tm.at <= e.at)) { timers.shift(); NOW = tm.at; tm.fn(); continue; }
      if (e && e.at <= to) { NOW = e.at; k++; apply(e); continue; }
      break;
    }
    NOW = to;
  };
  const apply = e => {
    if (e.kind === 'speak') { const t0 = NOW, clock = () => (NOW - t0) / 1000; M.speak({ clock, playing: () => clock() < e.dur, cues: e.cues, dur: e.dur, text: e.text }); timers.push({ at: t0 + e.dur * 1000 + FIN * 1000, fn: () => M.quiet() }); timers.sort((a, b) => a.at - b.at); }
    else if (e.kind === 'emo') M.setEmotion(e.name);
    else if (e.kind === 'gesture') M.gesture(e.name, NOW / 1000);
  };
  const n = o.frames ?? P.nf;
  for (let f = 0; f < n; f++) { run(base + sampleMs(f, P.fps)); out.push(stateOf(M.step(NOW / 1000))); }
  return out;
}
/** The logged per-frame state (same fields from the page: rig.state()). */
export const stateOf = s => ({ shape: s.shape, pose: s.poseW > 0 ? s.pose : null, poseW: Math.round(s.poseW * 1000) / 1000, emo: s.emo, talking: !!s.talking });
/** Pose stills a render can show (static geometry): silence poses + the react pose. */
/** mix.py silence gestures, kept only when TeacherRig knows them as pose gestures (an unknown name falls back to the series default). */
export const mixGestures = m => Object.fromEntries(['g_line', 'g_praise'].filter(k => m && CORE.GESTURES[m[k]] && CORE.GESTURES[m[k]].kind === 'pose').map(k => [k, m[k]]));
export const geomPoses = (reactClip, mix) => [...new Set([...posesOf(SILENCE_POSES), ...posesOf(Object.values(mixGestures(mix))), ...(reactClip ? posesOf([GEST_FOR_POSE(reactClip)].filter(Boolean)) : [])])];
