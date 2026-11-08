// Teach2D TeacherRig host (no browser, seconds): cue track / speak blocks / script schedule (rig_plan.mjs), core simulation through the
// `lipsync_rig` gate (lipsync_gate.py, same rule as qc.py) – green on the real rig, red on every tampered case – and the stress-label
// regression (build.py T_stress: ordinals and syllable-position quiz labels from the data, not '1st'/'2nd'). Spec: docs/specs/video-production-v2.md §1.
//   node scripts/test/teach2d-rig.mjs
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { ROOT, plan, simulate, cueTrack, linesOf, LONG, PRE, framesOf, nfOf } from '../video/teach2d/rig_plan.mjs';
const out = [], ok = (c, m) => { out.push((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
const TMP = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'teach2d-rig-')), VO = path.join(TMP, 'vo'); fs.mkdirSync(VO);
const py = (code, input) => { const r = spawnSync('python3', ['-c', code], { cwd: ROOT, input, encoding: 'utf8' }); if (r.status && !r.stdout) console.error(r.stderr); return r; };

// ---- fixture: Rhubarb-like cues per line (X head, 30–160 ms shapes incl. < 50 ms ones, X tail), lines placed like build.py ----
let rnd = 99; const rand = () => ((rnd = (rnd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const SPEC = [['h', "Where's the stress? Photograph!", 0.42], ['a', 'Photograph. Stress on the first part.', 0.42], ['r', 'Say it with me: photographer.', 1.8, { repeat: true }],
  ['q', "Quick quiz! Where's the stress?", 2.6, { quiz: true }], ['ans', 'The second part. Photographer.', 0.42], ['c', 'Save this. Free on lexkite.com.', 0.42]];
const T = { ep: 'fixture', fps: 30, teacher: 'carlos', hook: { line: 'h' }, lines: {}, nodes: [], pose: null }; let t = 0.1;
for (const [id, text, pause, x] of SPEC) {
  const cues = [{ start: 0, end: 0.06, value: 'X' }]; let c = 0.06; const n = 10 + Math.floor(rand() * 8);
  for (let i = 0; i < n; i++) { const d = rand() < 0.15 ? 0.03 : 0.06 + rand() * 0.1, v = 'ABCDEFGH'[Math.floor(rand() * 8)]; if (i === n >> 1) { cues.push({ start: c, end: c + 0.12, value: 'X' }); c += 0.12; } cues.push({ start: c, end: c + d, value: v }); c += d; }
  const v1 = c; cues.push({ start: c, end: c + 0.1, value: 'X' }); const dur = c + 0.1;
  fs.writeFileSync(path.join(VO, id + '.json'), JSON.stringify({ metadata: { duration: dur }, mouthCues: cues.map(q => ({ ...q, start: +q.start.toFixed(2), end: +q.end.toFixed(2) })) }));
  T.lines[id] = { t0: +t.toFixed(3), t1: +(t + dur).toFixed(3), text, pause, words: [{ w: text, s: +(t + 0.06).toFixed(3), e: +(t + v1).toFixed(3) }], ...(x || {}) };
  t += dur + pause;
}
T.total = +(t + 0.6).toFixed(3);
const TL = path.join(TMP, 'timeline.json'); fs.writeFileSync(TL, JSON.stringify(T));

// ---- 1) cue track: Rhubarb times + line t0, holes X, equal neighbours merged ----
const lines = linesOf(T), raw = id => JSON.parse(fs.readFileSync(path.join(VO, id + '.json'), 'utf8')).mouthCues, tr = cueTrack(lines, raw, T.total);
const q0 = raw('q').find(c => c.value !== 'X'), hit = tr.find(c => Math.abs(c.start - Math.floor((T.lines.q.t0 + q0.start) * 1000 + 0.5) / 1000) < 1e-9);
ok(tr[0].start === 0 && tr[tr.length - 1].end === T.total && tr.every((c, i) => !i || (c.start === tr[i - 1].end && c.value !== tr[i - 1].value)),
  `cue track: ${tr.length} cues, contiguous 0 → ${T.total} s, no equal neighbours`);
ok(hit && hit.value === q0.value, `cue track: line q's first viseme ${q0.value} at t0 + ${q0.start} s = ${hit && hit.start} s`);

// ---- 2) blocks + schedule ----
const P = plan(T, VO), B = P.blocks, ev = P.events, E = (k, n) => ev.filter(e => e.kind === k && (!n || e.name === n));
ok(B.length === 3 && B.every((b, i) => b.start <= b.v0 - PRE + 1e-9 || b.start === 0) && B.every((b, i) => !i || b.v0 - B[i - 1].v1 >= LONG),
  `speak blocks: ${B.length} (split only at silences ≥ ${LONG} s: after the repeat and the quiz), each starts ≥ ${PRE} s before its voice`);
ok(E('speak').length === B.length && E('speak').every(e => e.cues[0].value === 'X' && e.cues[0].start === 0), 'one speak(null, cues, {dur}) per block, cues relative to the block, X lead-in');
const at = (n, id) => E('emo', n).some(e => Math.abs(e.t - T.lines[id].words[0].s) < 1.2 || e.t > T.lines[id].words[0].s && e.t < T.lines[id].t1 + T.lines[id].pause);
ok(at('surprise', 'h') && at('happy', 'h') && at('thinking', 'q') && at('praise', 'ans') && E('gesture', 'nod').length === 1 && at('encourage', 'c') && at('explain', 'a'),
  'script → hook surprise→happy · quiz thinking in its pause · answer praise + nod · CTA encourage · lines explain');
const pg = E('gesture').filter(e => e.name !== 'nod');
ok(pg.length === 1 && pg[0].name === 'point' && pg[0].t > T.lines.r.words[0].e && pg[0].t < T.lines.q.words[0].s, `pose gesture only in a long silence: ${pg.map(e => `${e.name}@${e.t}`)} (after the repeat line, none in the quiz countdown)`);

// ---- 3) core simulation → lipsync_rig gate (green), deterministic ----
const r = spawnSync('node', [path.join(ROOT, 'scripts/video/teach2d/rig_host.mjs'), '--simulate', TL, VO, TMP], { encoding: 'utf8', env: { ...process.env, CI: '' } });
ok(r.status === 0, `rig_host --simulate (no browser, no CI): ${(r.stdout || r.stderr).trim()}`);
const FJ = path.join(TMP, 'rig.frames.json'), F = JSON.parse(fs.readFileSync(FJ, 'utf8'));
ok(JSON.stringify(simulate(P).slice(0, 200)) === JSON.stringify(F.frames.slice(0, 200).map(({ f, ...s }) => s)), 'core simulation is deterministic (same input → same frames)');
const pose = F.frames.filter(x => x.pose === 'point' && x.poseW >= 0.99).length, emos = new Set(F.frames.map(x => x.emo));
ok(pose >= 10 && ['surprise', 'happy', 'thinking', 'praise', 'encourage', 'explain'].every(x => emos.has(x)), `rig follows the script: point pose ${pose} frames at full weight, emotions ${[...emos].join(' ')}`);
const gate = (fr, label, want) => {
  fs.writeFileSync(path.join(TMP, 'f.json'), JSON.stringify(fr));
  const g = spawnSync('python3', [path.join(ROOT, 'scripts/video/teach2d/lipsync_gate.py'), TL, path.join(TMP, 'f.json'), VO], { encoding: 'utf8' });
  let j = null; try { j = JSON.parse(g.stdout); } catch (e) { j = { ok: null, err: g.stderr.slice(-300) }; }
  ok(j.ok === want && (g.status === 0) === want, `lipsync_rig ${want ? 'green' : 'red'} – ${label}: ${JSON.stringify(j).slice(0, 220)}`); return j;
};
const g0 = gate(F, 'core rig on the fixture', true);
ok(g0.cues > 60 && Math.abs(g0.p99_ms) <= 33, `±33 ms on ${g0.cues} cues ≥ 50 ms (p50 ${g0.p50_ms} ms, p99 ${g0.p99_ms} ms) at 30 fps, mid-frame sampling`);
const cl = () => JSON.parse(JSON.stringify(F));
{ const x = cl(); x.frames = x.frames.map((_, i) => ({ ...x.frames[Math.max(0, i - 2)], f: i })); gate(x, 'mouth 2 frames late (67 ms)', false); }
{ const x = cl(), s = P.track.find(c => c.value === 'X' && c.end - c.start > 1), f = Math.ceil((s.start + s.end) / 2 * 30); x.frames[f].shape = 'D'; gate(x, `mouth open in a ${(s.end - s.start).toFixed(1)} s silence`, false); }
{ const x = cl(), c = P.track.find(q => q.value !== 'X' && q.start > 1), f = Math.floor(c.start * 30) + 1; x.frames[f].poseW = 0.8; x.frames[f].pose = 'point'; gate(x, 'pose still over the mouth while the voice is on', false); }
{ const x = cl(); x.frames.pop(); gate(x, 'one frame short', false); }
{ const x = cl(); x.track[5].start += 0.02; gate(x, 'renderer used another cue track', false); }

// ---- 4) stress labels from the data (latent bug: '1st'/'2nd' + "X-…"/"…-X-…" were hard-coded) ----
const L = py(`import sys, json, glob; sys.path.insert(0, 'scripts/video/teach2d'); from labels import ordinal, stress_quiz
attend = dict(syl=['at', 'tend'], stress=1); attendee = dict(syl=['at', 'ten', 'dee'], stress=2)
r = dict(ord=[ordinal(i) for i in (0, 1, 2, 3, 10, 20)], attend=ordinal(attend['stress']), attendee=ordinal(attendee['stress']),
  q_attendee=stress_quiz(attendee, dict(options=['AT', 'DEE'], answer=1)), q_photographer=stress_quiz(dict(syl=['pho', 'to', 'gra', 'pher'], stress=1), dict(options=['PHO', 'TO'], answer=1)),
  q_referee=stress_quiz(dict(syl=['re', 'fe', 'ree'], stress=2), dict(options=['RE', 'REE'], answer=1)), eps=[])
for f in sorted(glob.glob('content/video/teach2d/eps/*stress*.json')):
    d = json.load(open(f))['data']; lab, a = stress_quiz(d['b'], d['quiz']); r['eps'].append([f.split('/')[-1], lab, d['b']['syl'][d['b']['stress']].upper() in lab[a]])
try: stress_quiz(attendee, dict(options=['AT', 'TEN'], answer=1)); r['bad_answer'] = 'accepted'
except AssertionError: r['bad_answer'] = 'rejected'
print(json.dumps(r))`);
let R = null; try { R = JSON.parse(L.stdout); } catch (e) { console.error(L.stderr); }
ok(R && R.ord.join() === '1st,2nd,3rd,4th,11th,21st' && R.attend === '2nd' && R.attendee === '3rd', `ordinals from the data: attend → ${R && R.attend}, attendee → ${R && R.attendee} (${R && R.ord.join(' ')})`);
ok(R && R.q_attendee[0].join() === 'AT-…,…-DEE' && R.q_photographer[0].join() === 'PHO-…,…-TO-…' && R.q_referee[0].join() === 'RE-…,…-REE' && R.bad_answer === 'rejected',
  `quiz labels by syllable position: attendee ${R && R.q_attendee[0].join(' | ')} · photographer ${R && R.q_photographer[0].join(' | ')} · referee ${R && R.q_referee[0].join(' | ')}; answer ≠ stressed syllable rejected`);
ok(R && R.eps.length >= 5 && R.eps.every(e => e[2]), `every stress episode labels its answer at the stressed syllable (${R && R.eps.length} eps)`);

// ---- one frame-count formula (pilot #679 run 41953177844: phrasal_hangout short lipsync_rig 833 vs need 832 – JS Math.round vs Python banker's round) ----
{
  const TOT = [27.75, 27.749, 27.751, 0.0167, 12.25, 30.05, 7.35, 19.65, 41.15, 3.85];
  for (let i = 0; i < 300; i++) TOT.push(+(5 + i * 0.0517).toFixed(3));
  const P = py(`import json,sys; sys.path.insert(0,'scripts/video/teach2d'); from labels import frames_of, nf_of
T = json.loads(sys.stdin.read()); print(json.dumps(dict(f=[frames_of(t, 30) for t in T], nf=nf_of(dict(total=27.75, fps=30, nf=900)), dflt=nf_of(dict(total=27.75, fps=30)))))`, JSON.stringify(TOT));
  let Q = null; try { Q = JSON.parse(P.stdout); } catch (e) { console.error(P.stderr); }
  const js = TOT.map(t => framesOf(t, 30)), diff = Q ? TOT.filter((t, i) => Q.f[i] !== js[i]) : TOT;
  ok(Q && !diff.length && js[0] === 833 && js[1] === 832, `frames_of (Python) == framesOf (JS) on ${TOT.length} totals incl. x.5 frames (27.75 s → ${js[0]}; differ: ${diff.slice(0, 3).join(',') || 0})`);
  ok(Q && Q.nf === 900 && Q.dflt === 833 && nfOf({ total: 27.75, fps: 30, nf: 900 }) === 900 && nfOf({ total: 27.75, fps: 30 }) === 833, 'timeline nf (written by build.py) wins on both sides, else the same formula');
  const src = ['build.py', 'qc.py', 'lipsync_gate.py'].map(f => fs.readFileSync(path.join(ROOT, 'scripts/video/teach2d', f), 'utf8')).join('\n') + fs.readFileSync(path.join(ROOT, 'scripts/video/teach2d/rig_plan.mjs'), 'utf8');
  ok(!/round\(\s*T\['total'\]\s*\*|round\(\s*TOTAL\s*\*|Math\.round\(\s*T\.total\s*\*/.test(src), 'no second frame-count formula left (round(total * fps)) in build/qc/lipsync_gate/rig_plan');
}

// ---- side layout: camera zoom never pushes the head into the caption band (pilot #679 short/dusk: head x1 519 > band x0 510) ----
{
  { // owner review 05/11: "It's my | treat", side band 1–2 words a page, chip label running past its pill
    const P = JSON.parse(py(`import json,sys; sys.path.insert(0,'scripts/video/teach2d'); from labels import paginate, chip_w
tw = lambda s: len(s) * 30.0
def pg(t, mw, r): W = t.split(); return [[' '.join(W[a:z]), b] for a, z, b in paginate(W, [tw(x) for x in W], 14, mw, r)]
print(json.dumps(dict(side=pg("Your teammate says: It's my treat today!", 394, 2), short=pg("It's my treat!", 300, 2), one=pg("It's my treat today!", 300, 1), sent=pg("Save this. Free on lexkite.com.", 900, 1),
  chip=[chip_w('☕ AB', lambda s, z: len(s) * 20.0, 40), chip_w('AB', lambda s, z: len(s) * 20.0, 40)])))`).stdout);
    const flat = pg => pg.map(x => x[0]);
    ok(P.side.every(x => x[0].split(' ').length >= 2) && P.side.length <= 2, `side band: two-row pages of ≥ 2 words (${JSON.stringify(P.side)})`);
    ok(P.short.length === 1 && P.short[0][1] === 1, `side: "It's my treat!" stays one page and the row break is not after a function word (${JSON.stringify(P.short)})`);
    ok(!flat(P.one).some((x, i) => i < P.one.length - 1 && /\b(my|the|a|to)$/i.test(x)), `no page ends on a function word (${flat(P.one)})`);
    ok(flat(P.sent).length === 2 && flat(P.sent)[0] === 'Save this.', 'a page never crosses a sentence end');
    ok(P.chip[0] - P.chip[1] >= 40, 'chip width reserves real emoji width');
    ok(!/📞/.test(fs.readFileSync(path.join(ROOT, 'scripts/video/teach2d/build.py'), 'utf8')), 'no dark phone glyph on the dark chip');
  }
  const Z = py(`import json,sys; sys.path.insert(0,'scripts/video/teach2d'); from labels import side_zoom_cap as z
ox, hx1, cap0 = 253.1, 490.0, 510
s = z(1.12, ox, hx1, cap0, 12); print(json.dumps(dict(s=s, edge=ox + (hx1 - ox) * s, old=ox + (hx1 - ox) * 1.12, floor=z(1.12, 253, 505, 510, 12), left=z(1.12, 300, 250, 510, 12))))`);
  let Zr = null; try { Zr = JSON.parse(Z.stdout); } catch (e) { console.error(Z.stderr); }
  ok(Zr && Zr.old > 510 && Zr.edge <= 510 - 12 + 1e-6 && Zr.s >= 1 && Zr.floor === 1 && Zr.left === 1.12,
    `side_zoom_cap: zoom ${Zr && Zr.s.toFixed(3)} keeps head edge ${Zr && Zr.edge.toFixed(1)} ≤ 498 (uncapped 1.12 → ${Zr && Zr.old.toFixed(1)}); never < 1.0; no cap when head is left of the anchor`);
  const b = fs.readFileSync(path.join(ROOT, 'scripts/video/teach2d/build.py'), 'utf8');
  ok(/if side and FMT\['cap'\]:[^\n]*\n[^\n]*\n\s*cap_s = side_zoom_cap\(cap_s, ox, hx1, FMT\['cap'\]\[0\], CAP_GAP\)/.test(b), 'build.py side layout clamps the camera with side_zoom_cap before the shots are built');
}

// ---- determinism failure leaves evidence, threshold stays byte-identical (pilot #679: 7 jobs "60/60 differ, first 0") ----
{
  const h = fs.readFileSync(path.join(ROOT, 'scripts/video/teach2d/rig_host.mjs'), 'utf8'), wf = fs.readFileSync(path.join(ROOT, '.github/workflows/teach-video.yml'), 'utf8');
  ok(/sha\(fr\.png\) !== shaOf\.get\(f\)/.test(h) && /await diagnose\(diff, again, re\); die\(`not deterministic/.test(h), 'rig_host: re-run must be byte-identical; a miss writes the diagnosis before failing');
  ok(/full: \{ tilt: s\.tilt, nod: s\.nod, sway: s\.sway, breath: s\.breath/.test(h) && /matches_main/.test(h) && /max_delta/.test(h), 'diagnosis compares idle transforms, pixel deltas and a fresh-process frame 0');
  ok(/\$\{\{ env\.O \}\}\/rig\.diag\//.test(wf), 'teach-video.yml uploads rig.diag with the render artifact (always)');
}
// ---- first frame of a pose never waits for a redraw at the same instant (run 42047456815: react 'point' on a frame sample -> 15 s deadlock) ----
{
  const h = fs.readFileSync(path.join(ROOT, 'scripts/video/teach2d/rig_host.mjs'), 'utf8'), rg = fs.readFileSync(path.join(ROOT, 'web/js/teacher-rig.js'), 'utf8');
  ok(/gesture\(name\) \{[^\n]*ready\.then\(\(\) => \(G && G\.kind === 'pose' \? loadPose\([^\n]*\.then\(\(\) => !dead && M\.gesture\(/.test(rg), 'teacher-rig gesture() applies a pose only after loadPose resolved (rig_host relies on it)');
  ok(/else await page\.evaluate\(n => rig\.gesture\(n\), e\.name\)/.test(h), 'rig_host awaits rig.gesture (the still is loaded before the next frame)');
  ok(/await page\.clock\.pauseAt\(BASE \/ 2\)/.test(h) && /performance\.now\(\) - Date\.now\(\)/.test(h) && /await page\.clock\.pauseAt\(BASE - off\)/.test(h) && /Math\.abs\(base - BASE\) > 1e-6\) die/.test(h), 'rig_host: every page starts at performance.now() == BASE (timeOrigin cancelled; idle breath is a function of absolute time)');
  ok(!/while \(o\.draws === d0\)/.test(h) && /was never served/.test(h), 'rig_host: no same-instant redraw wait; a pose still that was never served fails loudly');
}
const bsrc = fs.readFileSync(path.join(ROOT, 'scripts/video/teach2d/build.py'), 'utf8');
ok(!/\['1st', 'accent'\]|\['2nd', 'accent'\]|f"…-\{o\[1\]\}-…"/.test(bsrc), 'build.py T_stress has no hard-coded 1st/2nd or option positions');

fs.rmSync(TMP, { recursive: true, force: true });
console.log(out.join('\n')); console.log(process.exitCode ? '✗ teach2d-rig: ĐỎ' : '✓ teach2d-rig: đạt');
