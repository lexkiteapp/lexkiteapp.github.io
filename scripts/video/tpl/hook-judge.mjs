// Hook truth judge for template-1b lessons (docs/VIDEO-TEMPLATES.md §9) – Groq (gpt-oss-120b) via scripts/lib/ai-pool.mjs, provider groq only.
//   node scripts/video/tpl/hook-judge.mjs [--dir content/video/cine/news/tpl1b] [--ids a,b] [--force] [--dry-run] [--reviewed <file>]
// --reviewed <file>: NO network call – verdicts come from a human/teacher-reviewed JSON
//   {"verdicts": {"<lesson id>": {"wrong": "<learner line>", "right": "<correction>", "wrong_is_error": bool, "right_ok": bool,
//    "hook_true": bool, "soft_hook_true": bool (optional, default = right_ok), "note": "...", "by": "..."}}}
//   wrong/right must equal the lesson text (stale review = no verdict = not rendered). Ids not in the file get no verdict.
// For every lesson without a current verdict (verdict.hash = sha of hook + wrong + right): asks the judge
//   wrong_is_error – would a US English teacher mark the learner line as an error (ungrammatical / wrong word / clearly non-native)?
//   right_ok       – is the correction natural, correct US English?
// Then: strong hook ('Stop saying / Never say …') stays ONLY when wrong_is_error; otherwise the hook is rewritten to the soft family
// ('Americans usually say this.' / 'Sound more natural.'), the guess line follows, and the soft hook is judged again. right_ok = false →
// lesson.reject (never rendered, listed in the batch report). No answer from Groq = no verdict = the lesson is not rendered (fail closed).
// Env: GRABCAST_AI_KEY (or ~/.config/lexkite/grabcast-ai-key locally).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createPool } from '../../lib/ai-pool.mjs';

const args = process.argv.slice(2), opt = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };
const DIR = opt('dir') || 'content/video/cine/news/tpl1b', FORCE = args.includes('--force'), DRY = args.includes('--dry-run');
const IDS = opt('ids') ? new Set(opt('ids').split(',')) : null, REVIEWED = opt('reviewed');
if (!REVIEWED && !process.env.GRABCAST_AI_KEY) { try { process.env.GRABCAST_AI_KEY = fs.readFileSync(path.join(os.homedir(), '.config/lexkite/grabcast-ai-key'), 'utf8').trim(); } catch { /* CI secret */ } }
if (!REVIEWED && !process.env.GRABCAST_AI_KEY) { console.error('✗ GRABCAST_AI_KEY missing – the hook judge cannot run (fail closed)'); process.exit(1); }

// soft family + guess lines: keep in sync with tokens.HOOKS / gold2lesson.lines_for (test tpl-hook.mjs checks it)
export const SOFT = [['Americans usually say this.', 'Americans usually say'], ['Sound more natural.', 'Sound more natural:']];
export const GUESS = { strong: 'Pause and guess. What sounds right?', soft: 'Pause and guess. What sounds better?' };
export const verdictHash = (hook, wrong, right) => crypto.createHash('sha1').update([hook, wrong, right].join('\n')).digest('hex').slice(0, 12);
const h6 = id => id.slice(-6);

const SYS = 'You are a strict American English teacher reviewing short social-media lessons. Each item has a learner sentence (wrong), the taught correction (right), ' +
  'the rule shown (why) and the opening hook. Decide for each item:\n' +
  '- wrong_is_error: true ONLY if a US English teacher would mark the learner sentence as an error (ungrammatical, wrong word or collocation, clearly non-native). ' +
  'false if it is acceptable or merely less common / less idiomatic.\n' +
  '- right_ok: true if the correction is natural, correct US English and fixes or improves the learner sentence.\n' +
  '- hook_true: true if the hook claim is honest for this pair ("Stop saying this" / "Never say this" / "Natives never say this" are honest only when wrong_is_error; ' +
  '"Americans usually say this" / "Sound more natural" are honest when right_ok).\n' +
  '- note: max 15 words, why.\n' +
  'Reply with ONE JSON object only: {"<k>": {"wrong_is_error": bool, "right_ok": bool, "hook_true": bool, "note": "..."}, ...} for every k.';

const pool = REVIEWED ? null : createPool({ budget: { lexai: 0, cf2: 0, gc: +(process.env.AI_POOL_GC_MAX || 600) },
  prompt: req => ({ sys: SYS, user: JSON.stringify(req.items), temp: 0 }) });

function load() {
  const L = JSON.parse(fs.readFileSync(path.join(DIR, 'lines.json'), 'utf8')), byId = Object.fromEntries(L.lines.map(l => [l.id, l]));
  const files = fs.readdirSync(DIR).filter(f => /^tpl1b_.*\.json$/.test(f)).sort();
  return { L, byId, lessons: files.map(f => ({ f: path.join(DIR, f), d: JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) })) };
}
const item = (x, byId) => ({ k: x.d.id, wrong: x.d.wrong_line, right: x.d.key_line, why: (x.d.beats.find(b => b.kind === 'y') || {}).card?.text || '', hook: byId[x.d.hook.line].text });

const RV = REVIEWED ? JSON.parse(fs.readFileSync(REVIEWED, 'utf8')).verdicts || {} : null;
function reviewed(batch, byId) {   // pre-reviewed verdicts (no GrabCast/Groq call); soft pass → soft_hook_true (default right_ok)
  const out = {};
  for (const x of batch) {
    const v = RV[x.d.id];
    if (!v) { console.error('✗ no reviewed verdict for', x.d.id); continue; }
    if (v.wrong !== x.d.wrong_line || v.right !== x.d.key_line) { console.error('✗ stale reviewed verdict (text changed) for', x.d.id); continue; }
    const soft = x.d.hook.mode === 'soft';
    out[x.d.id] = { wrong_is_error: v.wrong_is_error, right_ok: v.right_ok, hook_true: soft ? (v.soft_hook_true ?? v.right_ok) : v.hook_true,
      note: v.note, model: 'reviewed:' + (v.by || 'teacher') };
  }
  return out;
}

async function judge(batch, byId) {
  if (RV) return reviewed(batch, byId);
  const out = {};
  for (let i = 0; i < batch.length; i += 8) {
    const items = batch.slice(i, i + 8).map(x => item(x, byId));
    const r = await pool.judge({ mode: 'judge', items }, { chain: ['gc-groq'] });
    if (!r) { console.error('✗ Groq judge gave no answer for', items.map(x => x.k).join(',')); continue; }
    for (const it of items) if (r.out[it.k]) out[it.k] = { ...r.out[it.k], model: r.model };
  }
  return out;
}

const { L, byId, lessons } = load();
let todo = lessons.filter(x => (!IDS || IDS.has(x.d.id)) && (FORCE || !x.d.hook.judge || x.d.hook.judge.hash !== verdictHash(byId[x.d.hook.line].text, x.d.wrong_line, x.d.key_line)));
console.log(`${lessons.length} lessons, ${todo.length} to judge`);
const stat = { strong: 0, soft: 0, rewritten: 0, rejected: 0, none: 0 };
for (let pass = 0; pass < 2 && todo.length; pass++) {
  const V = await judge(todo, byId), again = [];
  for (const x of todo) {
    const v = V[x.d.id]; if (!v) { stat.none++; continue; }
    const hl = byId[x.d.hook.line], at = new Date().toISOString().slice(0, 10);
    x.d.hook.judge = { wrong_is_error: !!v.wrong_is_error, right_ok: !!v.right_ok, hook_true: !!v.hook_true, note: String(v.note || '').slice(0, 140), model: v.model, at, hash: verdictHash(hl.text, x.d.wrong_line, x.d.key_line) };
    delete x.d.reject;
    if (!v.right_ok) { x.d.reject = 'judge: correction not natural/correct – ' + x.d.hook.judge.note; stat.rejected++; }
    else if (x.d.hook.mode === 'strong' && !v.wrong_is_error) {   // the learner line is acceptable → soft hook, judged again next pass
      const [line, disp] = SOFT[parseInt(h6(x.d.id), 16) % SOFT.length];
      x.d.hook = { ...x.d.hook, mode: 'soft', display: disp, judge: null, quote: null, rewritten_from: hl.text };
      hl.text = line; byId[`n_${h6(x.d.id)}_g`].text = GUESS.soft; stat.rewritten++; again.push(x);
    } else if (!v.hook_true) { x.d.reject = 'judge: hook claim not true – ' + x.d.hook.judge.note; stat.rejected++; }
    else stat[x.d.hook.mode]++;
  }
  todo = again;
}
if (DRY) { console.log('dry run', stat); process.exit(0); }
for (const x of lessons) fs.writeFileSync(x.f, JSON.stringify(x.d, null, 1) + '\n');
fs.writeFileSync(path.join(DIR, 'lines.json'), JSON.stringify(L, null, 1) + '\n');
if (pool) pool.report('tpl-hook-judge');
console.log('hook judge', JSON.stringify(stat));
if (stat.none && !lessons.some(x => x.d.hook.judge)) process.exit(1);
