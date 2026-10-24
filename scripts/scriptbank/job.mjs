// Sinh kho kịch bản video ngắn (CHỈ chữ) – CI script-bank.yml, tiếp tục được, idempotent (docs/VIDEO-SCALE-PLAN.md §16).
//   node scripts/scriptbank/job.mjs [--max 400] [--calls 60] [--neurons 5000] [--batch 20] [--dry]
// Mỗi lượt: chấm nốt hàng chờ (pending) → lấy lô điểm chưa làm (trộn 40/40/20) → /api/lexai vgen (Gemini, xoay mô hình khi hết hạn mức ngày)
// → QC tất định (lib.qc) → chống trùng → /api/lexai vjudge (Llama 3.3 70B, chỉ chấm) → điểm ≥ 4 vào kho, ≤ 3 / trượt cổng → review.jsonl.
// Không có giám khảo (hết neuron) → giữ ở pending.jsonl, KHÔNG vào kho.
import fs from 'fs';
import { createPool, familyOf } from '../lib/ai-pool.mjs';
import { DIR, plan, nextBatch, qc, Dedupe, readBank, readJsonl, appendBank, summary, h8, TYPES } from './lib.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const MAX = +arg('max', 400), CALLS = +arg('calls', 60), NEURONS = +arg('neurons', 5000), BATCH = Math.min(20, +arg('batch', 20)), CAP = +arg('cap', 6), DRY = process.argv.includes('--dry');
// AI qua ai-pool (scripts/lib/ai-pool.mjs): vgen = chuỗi soạn (mô hình hạng L); vjudge = giám khảo KHÁC HỌ mô hình đã soạn. Neuron tài khoản 2 = phần cấp điều phối (--neurons).
const AI = createPool({ budget: { lexai: CALLS * 2, cf2: NEURONS } });

fs.mkdirSync(DIR, { recursive: true });
const F = { review: DIR + '/review.jsonl', pending: DIR + '/pending.jsonl', state: DIR + '/state.json' };
const state = fs.existsSync(F.state) ? JSON.parse(fs.readFileSync(F.state, 'utf8')) : { tries: {}, days: [] };
const pts = plan(), byPid = new Map(pts.map(p => [p.pid, p]));
let bank = readBank(), review = readJsonl(F.review), pending = readJsonl(F.pending);
const done = new Set([...bank, ...review, ...pending].map(s => s.pid));
const dd = new Dedupe(); for (const s of bank) dd.add(s); for (const s of pending) dd.add(s);
const today = new Date().toISOString().slice(0, 10);
const day = { date: today, gen_calls: 0, judge_calls: 0, generated: 0, qc_fail: 0, dup: 0, judged: 0, passed: 0, low: 0, neurons: 0, models: {} };
const toReview = [], toBank = [];

// ---- giám khảo (chỉ chấm, khác họ mô hình soạn) ----
async function judge(list) {
  const left = [];
  for (let i = 0; i < list.length; i += 20) {
    const part = list.slice(i, i + 20);
    if (DRY) { left.push(...part); continue; }
    const gen = [...new Set(part.map(s => familyOf((s.gen || {}).model)).filter(f => f !== 'other'))];
    const r = await AI.judge({ mode: 'vjudge', items: part.map(s => ({ k: s.id, type: s.type, point: s.point, facts: JSON.stringify((byPid.get(s.pid) || {}).facts || {}).slice(0, 400), hook: s.hook, wrong: s.wrong, right: s.right, why: s.why, ex: s.ex, memory: s.memory, quiz: s.quiz, lines: s.lines })) }, { exclude: gen });
    day.judge_calls++;
    if (!r) { console.log('vjudge: không có giám khảo khác họ → giữ hàng chờ'); left.push(...list.slice(i)); break; }
    for (const s of part) {
      const v = r.out[s.id], sc = Math.round(+(v && typeof v === 'object' ? v.s : v) || 0);
      if (!sc) { left.push(s); continue; }
      s.qc.judge = sc; s.qc.model_judge = r.model; day.judged++;
      if (sc >= 4) { toBank.push(s); day.passed++; } else { toReview.push({ ...s, reasons: ['judge:' + sc + ' ' + String((v && v.f) || '').slice(0, 100)] }); day.low++; }
    }
  }
  day.neurons = AI.stats().used.cf2;
  return left;
}

// ---- 1) chấm nốt hàng chờ ----
if (pending.length) { console.log('chấm hàng chờ', pending.length); pending = await judge(pending); }

// ---- 2) sinh lô mới ----
// Cổng thí điểm: lịch tự động CHỈ sinh hàng loạt khi config.scale = true (chủ duyệt sau thí điểm 100 kịch bản ≥ 90 % đúng); trước đó chỉ chấm hàng chờ.
const CFG = fs.existsSync(DIR + '/config.json') ? JSON.parse(fs.readFileSync(DIR + '/config.json', 'utf8')) : { scale: false };
const GEN = !(process.env.GITHUB_EVENT_NAME === 'schedule' && !CFG.scale);
if (!GEN) console.log('chưa duyệt mở rộng (config.scale = false) → chỉ chấm hàng chờ');
let made = 0, misses = 0;
while (GEN && made < MAX && day.gen_calls < CALLS && misses < 2) {
  const batch = nextBatch(pts, done, Math.min(BATCH, MAX - made), CAP, day.gen_calls * 3); if (!batch.length) break;
  if (DRY) { console.log('[dry]', batch.map(p => p.diff[0] + ':' + p.pid).join(' ').slice(0, 300)); batch.forEach(p => done.add(p.pid)); made += batch.length; day.gen_calls++; continue; }
  day.gen_calls++;
  const items = batch.map(p => ({ k: h8(p.pid), type: p.type, point: p.point, cefr: p.cefr, diff: p.diff, hook_type: p.hook_type, topic: p.topic, facts: p.facts }));
  const res = await AI.gen({ mode: 'vgen', items });
  if (!res) { misses++; continue; } misses = 0;
  const r = { j: { out: res.out } }, model = res.model;
  day.models[model] = (day.models[model] || 0) + 1;
  const fresh = [];
  for (const p of batch) {
    const o = r.j.out[h8(p.pid)];
    if (!o || typeof o !== 'object') { state.tries[p.pid] = (state.tries[p.pid] || 0) + 1; if (state.tries[p.pid] >= 2) { toReview.push({ pid: p.pid, id: 'sb_' + h8(p.pid), type: p.type, reasons: ['no-output'] }); done.add(p.pid); } continue; }
    done.add(p.pid); made++; day.generated++;
    const s = { id: 'sb_' + h8(p.pid), pid: p.pid, src: p.src, type: p.type, cefr: o.cefr || p.cefr, diff: p.diff, topic: o.topic || p.topic, hook_type: p.hook_type, point: o.point, hook: o.hook, wrong: o.wrong, right: o.right, why: o.why,
      ex: o.ex, memory: o.memory, quiz: o.quiz, lines: (o.lines || []).map(l => ({ who: String(l.who || '').toLowerCase(), say: l.say })), ...(p.type === 'pronunciation' ? { syl: +o.syl, stress: +o.stress } : {}), gen: { model, at: today } };
    const q = qc(p, s); s.words = (s.lines || []).reduce((a, l) => a + (String(l.say || '').match(/[A-Za-z0-9']+/g) || []).length, 0); s.est_s = q.est; s.qc = { flags: q.flags };
    if (q.flags.length) { toReview.push({ ...s, reasons: q.flags }); day.qc_fail++; continue; }
    const d = dd.dup(s); if (d) { toReview.push({ ...s, reasons: [d] }); day.dup++; continue; }
    dd.add(s); fresh.push(s);
  }
  pending.push(...await judge(fresh));
}

// ---- 3) ghi ----
if (!DRY) {
  if (toBank.length) appendBank(toBank);
  if (toReview.length) fs.appendFileSync(F.review, toReview.map(s => JSON.stringify(s)).join('\n') + '\n');
  fs.writeFileSync(F.pending, pending.map(s => JSON.stringify(s)).join('\n') + (pending.length ? '\n' : ''));
}
state.days = (state.days || []).filter(d => d.date !== today).concat([{ ...((state.days || []).find(d => d.date === today) || {}), ...day }]).slice(-90);
if (!DRY) fs.writeFileSync(F.state, JSON.stringify(state, null, 0) + '\n');
bank = readBank(); review = readJsonl(F.review);
const sum = summary(bank, review, pts, state); sum.pending = pending.length; sum.types = TYPES;
if (!DRY) { fs.writeFileSync(DIR + '/summary.json', JSON.stringify(sum, null, 1) + '\n'); fs.mkdirSync(new URL('../../web/data/', import.meta.url), { recursive: true }); fs.writeFileSync(new URL('../../web/data/script-bank.json', import.meta.url), JSON.stringify(sum) + '\n'); }
if (!DRY) AI.report('script-bank');
console.log(`kho ${bank.length} · review ${review.length} · chờ chấm ${pending.length} · kế hoạch ${pts.length}`);
console.log(`lượt này: sinh ${day.gen_calls} lần (${JSON.stringify(day.models)}) · ${day.generated} kịch bản · trượt QC ${day.qc_fail} · trùng ${day.dup} · chấm ${day.judged} (đạt ${day.passed}, thấp ${day.low}) · neuron ≈ ${day.neurons}`);
if (!DRY && !day.generated && !day.judged && (GEN || pending.length)) { console.log('✗ không sinh/chấm được gì'); process.exit(1); }
