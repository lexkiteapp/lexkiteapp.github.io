// Template-1b batch pipeline invariants (docs/VIDEO-TEMPLATES.md §9) – no render, no network, < 1 s.
// Lessons/plan consistent · hook truth (strong hook only with a judge verdict "real error", soft family otherwise, verdict hash = current text)
// · hook quote = the real wrong phrase (class rule hookquote.py, every lesson) · host framing standard tokens (shoulder ±5 %, never upscale) · workflow: Rhubarb mandatory, ≤ 10 jobs, lease, no YouTube/social publishing.
import fs from 'node:fs';
import crypto from 'node:crypto';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const TD = 'content/video/cine/news/tpl1b', J = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const plan = J(`${TD}/plan.json`), L = J(`${TD}/lines.json`), byId = Object.fromEntries(L.lines.map(l => [l.id, l.text]));
const tok = fs.readFileSync('scripts/video/tpl/tokens.py', 'utf8'), judge = fs.readFileSync('scripts/video/tpl/hook-judge.mjs', 'utf8'), g2l = fs.readFileSync('scripts/video/tpl/gold2lesson.py', 'utf8');
const plates = [...tok.matchAll(/^\s{4}([a-z_]+)=dict\(tags=\[([^\]]*)\]/gm)].map(m => [m[1], m[2].replace(/'/g, '').split(',').map(s => s.trim())]), P = Object.fromEntries(plates);
const hash = (h, w, r) => crypto.createHash('sha1').update([h, w, r].join('\n')).digest('hex').slice(0, 12);

// plan + lessons
ok(!plan.skipped && plan.total_gold >= 261 && plan.lessons + plan.needs_solution.length === plan.total_gold, `plan covers every gold script (${plan.lessons} + ${plan.needs_solution.length} needs-solution = ${plan.total_gold})`);
ok(plan.needs_solution.every(s => s.reason && s.proposed_fix), 'every not-yet-rendered script keeps a reason + proposed fix (never deleted)');
const soft = [...tok.matchAll(/\('([^']+)', '([^']+)'\)/g)].map(m => m[1]);
for (const it of plan.items) {
  const f = `${TD}/${it.id}.json`; if (!fs.existsSync(f)) { ok(false, `lesson ${it.id} exists`); continue; }
  const d = J(f), h = byId[d.hook.line];
  ok(P[d.plate] && P[d.plate].includes(d.topic), `${it.id}: topic ${d.topic} ∈ plate ${d.plate} tags`);
  ok(['ama', 'carlos', 'mia'].includes(d.host) && d.clip, `${it.id}: host from HOST_CLIPS`);
  ok(h && soft.includes(h), `${it.id}: hook line is a tokens.HOOKS line (${h})`);
  ok(d.hook.mode === 'soft' ? /Americans usually|more natural/i.test(h) : /never say|stop saying/i.test(h), `${it.id}: hook family matches mode ${d.hook.mode}`);
  ok(byId[`n_${d.hook.line.slice(2, 8)}_g`] === (d.hook.mode === 'soft' ? 'Pause and guess. What sounds better?' : 'Pause and guess. What sounds right?'), `${it.id}: guess line follows the hook mode`);
  const j = d.hook.judge;
  if (j) {
    ok(j.hash === hash(h, d.wrong_line, d.key_line), `${it.id}: judge verdict is for the CURRENT hook text`);
    if (d.hook.mode === 'strong' && !d.reject) ok(j.wrong_is_error === true && j.right_ok === true, `${it.id}: strong hook only when the judge says the learner line is a real error`);
    if (!j.right_ok) ok(!!d.reject, `${it.id}: wrong correction → rejected`);
  }
  // hook quote (hookquote.py): strong = the learner's WRONG phrase incl. every error word (never a correct fragment like 'gate is');
  // soft = the natural phrase from the key line
  const nw = w => w.toLowerCase().replace(/’/g, "'").replace(/[^a-z0-9']/g, '').replace(/^'+|'+$/g, '');
  const tk = t => t.trim().split(/\s+/), q = d.hook.quote;
  if (d.hook.mode === 'strong') {
    const rs = new Set(tk(d.key_line).map(nw)), err = tk(d.wrong_line).map(nw).filter(w => w && !rs.has(w)), qs = new Set(tk(q || '').map(nw));
    ok(q && d.wrong_line.includes(q), `${it.id}: hook quote "${q}" is a phrase of the wrong line "${d.wrong_line}"`);
    ok(err.every(w => qs.has(w)), `${it.id}: hook quote "${q}" contains every error word (${err.join(' ')})`);
  } else if (q) ok(d.key_line.toLowerCase().includes(q.toLowerCase()), `${it.id}: soft quote "${q}" is a phrase of the key line`);
  ok(/\bLEXKITE\.COM\b|lexkite\.com/i.test(byId[`n_${d.hook.line.slice(2, 8)}_s`] || '') || (d.cta && d.cta.link.startsWith('https://lexkite.com/')), `${it.id}: CTA deep link`);
}
// the example the owner named: "room card" is acceptable → its lesson must never keep a strong hook once judged
const rc = plan.items.map(i => J(`${TD}/${i.id}.json`)).find(d => /room card/i.test(d.wrong_line));
if (rc) ok(!(rc.hook.judge && rc.hook.mode === 'strong'), 'room card lesson: no "Stop saying" hook after the judge');
// hook-judge ↔ gold2lesson ↔ tokens stay in sync
for (const s of ['Americans usually say this.', 'Sound more natural.']) ok(judge.includes(s) && tok.includes(s), `soft hook "${s}" in tokens + judge`);
ok(judge.includes("chain: ['gc-groq']"), 'hook judge runs on Groq only');
ok(g2l.includes('What sounds better?') && judge.includes('What sounds better?'), 'soft guess line in sync');
// the airport case the owner named: never 'gate is'
const ag = J(`${TD}/tpl1b_airport_gate_cc6fbe.json`); ok(ag.hook.quote === 'The gate is change?', `airport hook quotes the real error (got "${ag.hook.quote}")`);
ok(/hook_quote\(g\['w'\], g\['r'\], mode\)/.test(g2l), 'gold2lesson writes the hook quote with hookquote.hook_quote');
// host framing standard
const hl = tok.match(/HOST_LOCK = dict\(([^)]*)\)/)[1];
ok(/max_scale=1\.0/.test(hl) && /shoulder_tol=0\.05/.test(hl) && /shoulder=\d+/.test(hl) && /crop=\d+/.test(hl) && /top=\d+/.test(hl) && /cx=540/.test(hl), 'HOST_LOCK: shoulder width ±5 %, same head top / centre / crop line, never upscale');
const hf = fs.readFileSync('scripts/video/tpl/hostframe.py', 'utf8');
ok(/def landmarks\(/.test(hf) && /def check\(/.test(hf) && /def batch\(/.test(hf), 'hostframe.py measures shoulder width + crop line on the matte, per video + batch');
ok(/HF\.check\(SL, HOST_LOCK/.test(fs.readFileSync('scripts/video/tpl/render_tpl.py', 'utf8')), 'render re-measures the framing on the SCREEN matte');
const qc = fs.readFileSync('scripts/video/tpl/qc_tpl.py', 'utf8');
for (const g of ['host_frame_std', 'host_frame', 'lipsync_rhubarb', 'hook_truth', 'hook_readable', 'loop_end']) ok(qc.includes(`R['${g}']`), `qc_tpl gate ${g}`);
ok(/batch_host_scale/.test(fs.readFileSync('scripts/video/tpl/batch_report.py', 'utf8')) && /HF\.batch\(/.test(fs.readFileSync('scripts/video/tpl/batch_report.py', 'utf8')), 'batch framing gate across hosts');
ok(/scrim_last/.test(qc) && /hook_full/.test(qc), 'qc: loop end back to the clean plate, complete hook readable at 1.5 s');
ok(/lip-sync: Rhubarb cues missing/.test(fs.readFileSync('scripts/video/tpl/render_tpl.py', 'utf8')), 'render refuses estimated visemes');
// workflow
const wf = fs.readFileSync('.github/workflows/video-tpl1b.yml', 'utf8');
ok(/max-parallel: 10/.test(wf) && /min\(10, len\(ok\)\)/.test(wf), 'matrix ≤ 10 jobs');
ok(/lease\.mjs acquire video-tpl1b/.test(wf) && /lease\.mjs release video-tpl1b/.test(wf), 'lease acquire + release');
ok(/--version \| grep -q 1\.13/.test(wf), 'Rhubarb must run on CI (no silent estimate)');
ok(!/formula→|rsplit\(|\[:18\]/.test(fs.readFileSync('scripts/video/tpl/fix_tpl.py', 'utf8')), 'automatic fix never shortens/cuts content (owner rule: quality only goes up)');
ok(!/yt-upload|youtube-upload|publish-grabcast|social/i.test(wf.replace(/YouTube\/social|social stay/g, '')), 'no auto-publish to YouTube/social');
const jobs = J('infra/jobs.json').jobs.find(j => j.id === 'video-tpl1b');
ok(jobs && jobs.paused && jobs.lease && jobs.workflow === 'video-tpl1b.yml', 'infra/jobs.json: video-tpl1b registered (paused = dispatch only, lease)');
if (fails) { console.log(`✗ tpl1b-pipeline: ${fails} lỗi`); process.exit(1); }
console.log(`✓ tpl1b-pipeline: ${plan.lessons} lessons, ${plan.needs_solution.length} needs-solution, invariants OK`);
