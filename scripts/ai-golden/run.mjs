// Bộ golden chất lượng AI người dùng (docs/AI-CHAIN.md §Golden) – CHỈ chạy trên CI (ai-golden.yml): gọi từng model ứng viên với
// ĐÚNG lời nhắn của máy khách (web/js/ai.js AI._p, web/js/roleplay.js RP._p) và ĐÚNG thân yêu cầu của máy chủ (functions/api/_aichain.js),
// chấm bằng scripts/ai-golden/score.mjs. Trượt (exit 1) khi một model ĐANG trong chuỗi (Gemini Flash, GROQ_OK, Llama 8B nếu WEAK_OK) không đạt.
// Khóa: GEMINI_POOL / GROQ_POOL / CF_POOL (tài khoản phụ, KHÔNG tài khoản chính). Không bao giờ in khóa.
// Tham số: --only gem,groq,wai (mặc định tất cả) · --ielts N / --rp N (lấy N ca đầu, mặc định hết) · --out reports/ai-golden.json
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { parseKeys, keyRing } from '../lib/key-pool.mjs';
import { poolAccounts } from '../lib/cf-pool.mjs';
import { gemBody, groqBody, groqRetry, JSON_FAIL, waiBody, gemText, parseJSON, pickGemini, GROQ_OK, WAI_MODEL, WEAK_OK } from '../../functions/api/_aichain.js';
import { scoreIelts, sumIelts, scoreRp, sumRp, JUDGE_SYS, judgePrompt, GATE } from './score.mjs';
import { ieltsReq, rpCase } from './client.mjs';

const env = process.env, ROOT = fileURLToPath(new URL('../..', import.meta.url));
if (!env.CI && !env.AI_GOLDEN_LOCAL) { console.error('chỉ chạy trên CI (đặt AI_GOLDEN_LOCAL=1 để thử tay)'); process.exit(2); }
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ONLY = new Set(String(arg('only', 'gem,groq,wai')).split(',')), OUT = arg('out', 'reports/ai-golden.json');
const IE = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/ai-golden/ielts.json'), 'utf8')).cases.slice(0, +arg('ielts', 99));
const RPJ = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/ai-golden/roleplay.json'), 'utf8')), RPC = RPJ.cases.slice(0, +arg('rp', 99));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const redact = t => String(t).replace(/AIza[\w-]{10,}|AQ\.[\w.-]{10,}|gsk_\w{10,}/g, '[khoá]');

// ---- nhà cung cấp (xoay khóa; 429/401/403 → khóa kế) ----
const GEM = keyRing(parseKeys(env.GEMINI_POOL, 'gemini')), GROQ = keyRing(parseKeys(env.GROQ_POOL, 'groq')), CF = poolAccounts(env);
let cfi = 0;
const why = { gem: {}, groq: {} }; // lý do khóa bị bỏ (mã HTTP) – in cuối để biết kho khóa chết hay hết lượt
async function keyed(ring, f, name = '') {
  for (let t = 0; t < Math.min(ring.size, 12); t++) {
    const k = ring.next(); if (!k) return null; // mọi khóa đang nghỉ → báo không gọi được (không chờ – lần chạy 03/11 treo 30 phút vì chờ)
    const r = await f(k.key).catch(e => ({ ok: false, status: 0, text: async () => String(e.message) }));
    if (name && r.status >= 400) why[name][r.status] = (why[name][r.status] || 0) + 1;
    if (r.status === 429) { const b = await r.text().catch(() => ''); ring.park(k.id, /per ?day|PerDay|\bRPD\b|\bTPD\b/i.test(b) ? 20 * 3600e3 : 65e3, 'q'); continue; }
    if (r.status === 401 || r.status === 403) { ring.park(k.id, 24 * 3600e3, 'auth'); continue; }
    if (r.status >= 500 || r.status === 0) { await sleep(3e3); continue; }
    return r;
  }
  return null;
}
const T = ms => AbortSignal.timeout(Math.min(ms, 60e3));
const MODEL_MS = +(env.AI_GOLDEN_MODEL_MS || 8 * 60e3); // trần thời gian mỗi model – ca chưa chạy kịp = bỏ qua (không tính), > 30 % bỏ qua → model 'không gọi được'
const call = {
  async gem(model, q) { const r = await keyed(GEM, key => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', signal: T(90e3), headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(gemBody(model, q.sys, q.prompt, q.temp, q.rp)) }), 'gem');
    if (!r) return { err: 'no-key' }; if (!r.ok) return { err: r.status + ' ' + redact(await r.text()).slice(0, 120) }; return { out: parseJSON(gemText(await r.json())) }; },
  async groq(model, q) { const go = (key, b) => fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', signal: T(90e3), headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
    const b = groqBody(model, q.sys, q.prompt, q.temp, q.rp);
    const r = await keyed(GROQ, async key => { const x = await go(key, b); if (x.status === 400) { const t = await x.clone().text().catch(() => ''); if (JSON_FAIL.test(t)) return go(key, groqRetry(b)); } return x; }, 'groq'); // như máy chủ: lỗi JSON → thử lại không ép JSON
    if (!r) return { err: 'no-key' }; if (!r.ok) return { err: r.status + ' ' + redact(await r.text()).slice(0, 120) }; const j = await r.json(); return { out: parseJSON((((j.choices || [])[0] || {}).message || {}).content) }; },
  async cf(model, q) { return call.wai(model, q); },
  async wai(model, q) { // tài khoản Workers AI phụ (CF_POOL) – cùng model với binding env.AI của site
    for (let t = 0; t < Math.min(CF.length, 6); t++) { const a = CF[cfi++ % CF.length];
      const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${a.acct}/ai/run/${model}`, { method: 'POST', signal: T(60e3), headers: { Authorization: 'Bearer ' + a.tok, 'Content-Type': 'application/json' }, body: JSON.stringify(waiBody(q.sys, q.prompt, q.temp)) }).catch(() => null);
      if (!r || !r.ok) continue; const j = await r.json().catch(() => null), raw = j && j.result && j.result.response; return { out: raw && typeof raw === 'object' ? raw : parseJSON(raw) }; }
    return { err: 'no-account' }; },
};
async function listModels() {
  const M = [];
  if (ONLY.has('gem') && GEM.size) { let ids = [];
    for (let t = 0; t < 3 && !ids.length; t++) { const k = GEM.peek(t); if (!k) break; const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': k.key } }).catch(() => null); if (r && r.ok) ids = ((await r.json()).models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => m.name); }
    const g = pickGemini(ids); console.log(`· Gemini: ${ids.length} model, Flash mới nhất ${JSON.stringify(g)}`); if (g[0]) M.push({ route: 'gem', model: g[0], chain: true }); }
  if (ONLY.has('groq') && GROQ.size) { let ids = []; const k = GROQ.peek(0); const r = k && await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: 'Bearer ' + k.key } }).catch(() => null); if (r && r.ok) ids = ((await r.json()).data || []).filter(m => m.active !== false).map(m => m.id);
    console.log(`· Groq: ${JSON.stringify(ids)}`);
    qwenJudge = ids.filter(m => /qwen/i.test(m)).sort().reverse()[0] || null;
    for (const m of GROQ_OK) M.push({ route: 'groq', model: m, chain: true, listed: ids.includes(m) });
    for (const m of ['moonshotai/kimi-k2-instruct-0905', 'moonshotai/kimi-k2-instruct', 'qwen/qwen3-32b', 'meta-llama/llama-4-maverick-17b-128e-instruct', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b']) if (ids.includes(m) && !GROQ_OK.includes(m)) M.push({ route: 'groq', model: m, chain: false }); }
  if (ONLY.has('wai') && CF.length) M.push({ route: 'wai', model: WAI_MODEL, chain: WEAK_OK });
  return M.sort((a, b) => 'groq gem wai'.indexOf(a.route) - 'groq gem wai'.indexOf(b.route));
}
const pmap = async (xs, n, f) => { const out = new Array(xs.length); let i = 0; await Promise.all(Array.from({ length: Math.min(n, xs.length) }, async () => { while (i < xs.length) { const k = i++; out[k] = await f(xs[k], k); } })); return out; };
// giám khảo khác HỌ với ứng viên: gpt-oss-120b (Groq) chấm mọi model trừ gpt-oss → Gemini Flash
let gemJudge = null;
// giám khảo KHÁC HỌ với ứng viên: gpt-oss-120b (Groq) → Gemini Flash → Llama 3.3 70B (tài khoản CF_POOL) – ai còn gọi được và khác họ thì chấm
let qwenJudge = null, judgeFams = null; // judgeFams: chỉ họ giám khảo đã qua MỌI câu mồi mới được chấm
 // Groq Qwen (họ thứ tư) – golden 03/11 lần 5: Gemini hết lượt + Llama 70B (CF_POOL) không gọi được → 6/20 lượt không ai chấm
const JUDGES = () => [['groq', 'openai/gpt-oss-120b', 'gpt-oss'], ['gem', gemJudge, 'gemini'], ['cf', '@cf/meta/llama-3.3-70b-instruct-fp8-fast', 'llama'], ['groq', qwenJudge, 'qwen']].filter(j => j[1]);
const famOf = m => /gpt-oss/.test(m) ? 'gpt-oss' : /gemini/.test(m) ? 'gemini' : /llama/.test(m) ? 'llama' : /qwen/.test(m) ? 'qwen' : 'other';
async function judge(cand, x, only = null) {
  const q = { sys: JUDGE_SYS, prompt: judgePrompt(x), temp: 0, rp: false };
  for (const [route, model, fam] of JUDGES()) {
    if (fam === famOf(cand.model) || (only && only !== fam) || (judgeFams && !judgeFams.has(fam))) continue;
    for (let t = 0; t < 2; t++) { const r = await call[route](model, q); // thử lại 1 lần (mạng / JSON hỏng)
      if (r.out && Number.isFinite(+r.out.score)) return { ...r.out, by: route + '/' + model }; if (/no-key|no-account/.test(r.err || '')) break; }
  }
  return null;
}

const models = await listModels(); gemJudge = (models.find(m => m.route === 'gem') || {}).model || null;
if (!models.length) { console.error('✗ không có model nào để chấm (thiếu GEMINI_POOL/GROQ_POOL/CF_POOL)'); process.exit(1); }
// kiểm GIÁM KHẢO trước bằng câu mồi (có câu vô lý thật của Llama 8B ngày 03/11)
const decoyRes = [];
for (const d of RPJ.decoys) { const c = RPJ.cases.find(x => x.id === d.case), x = rpCase(c);
  for (const fam of ['gpt-oss', 'gemini', 'llama', 'qwen']) { const j = await judge({ model: 'x' }, { ...x, L: c.L, unclear: c.unclear, reply: d.reply }, fam); if (!j) continue; // kiểm TỪNG giám khảo sẽ dùng
    const ok = (d.max == null || +j.score <= d.max) && (d.min == null || +j.score >= d.min); decoyRes.push({ case: d.case, by: j.by, score: +j.score, ok }); } }
judgeFams = new Set([...new Set(decoyRes.map(d => famOf(d.by)))].filter(f => decoyRes.filter(d => famOf(d.by) === f).every(d => d.ok)));
const judgeOk = judgeFams.size >= 2; // ≥ 2 họ đạt câu mồi → mọi ứng viên đều có giám khảo khác họ; họ trượt câu mồi bị loại (không chấm)
console.log(`· giám khảo (câu mồi): ${JSON.stringify(decoyRes)} → họ đạt: ${[...judgeFams].join(', ')} → ${judgeOk ? 'đạt' : 'TRƯỢT'}`);

const report = { at: new Date().toISOString(), gate: GATE, judge: { ok: judgeOk, decoys: decoyRes }, models: [] };
for (const m of models) {
  const t0 = Date.now(), par = m.route === 'gem' ? 3 : 4, late = () => Date.now() - t0 > MODEL_MS, tag = `${m.route} ${m.model}`;
  // ca không gọi được (hết khóa/hết giờ) = bỏ qua, không tính là sai; ca gọi được mà trả sai khuôn vẫn tính
  const ielts = (await pmap(IE, par, async c => { if (late()) return null; const r = await call[m.route](m.model, ieltsReq(c)); if (!r.out && /no-key|no-account|^0 |^5\d\d/.test(r.err || '')) { console.log(`    · ${tag} ielts ${c.id}: bỏ qua (${r.err})`); return null; }
    const s = { ...scoreIelts(c, r.out), got: ((r.out && r.out.errors) || []).slice(0, 12).map(e => [e && e.quote, e && e.fix]) }; console.log(`    ${tag} ielts ${c.id}: ${s.valid ? `band ${s.band} (${s.want}) · bắt ${s.found}/${s.total}` : 'sai khuôn ' + (r.err || '')} · ${Math.round((Date.now() - t0) / 1000)}s`); return { ...s, langCase: true, err: r.err || null }; })).filter(Boolean);
  const rp = (await pmap(RPC, par, async c => { if (late()) return null; const x = rpCase(c), r = await call[m.route](m.model, x.req), out = r.out; if (!out && /no-key|no-account|^0 |^5\d\d/.test(r.err || '')) return null;
    const j = out && typeof out.reply === 'string' ? await judge(m, { ...x, L: c.L, unclear: c.unclear, reply: out.reply }) : null;
    return { ...scoreRp(c, out, j), unclearCase: !!c.unclear, err: r.err || null }; })).filter(Boolean);
  const cover = (ielts.length + rp.length) / (IE.length + RPC.length);
  const SI = sumIelts(ielts), SR = sumRp(rp), avail = cover >= 0.7;
  const row = { route: m.route, model: m.model, chain: m.chain, available: avail, cover: Math.round(cover * 100) / 100, pass: avail && SI.pass && SR.pass && judgeOk, ielts: SI, rp: SR, secs: Math.round((Date.now() - t0) / 1000), detail: { ielts, rp } };
  report.models.push(row);
  console.log(`${row.pass ? '✓' : avail ? '✗' : '·'} ${m.route} ${m.model}${m.chain ? ' [chuỗi]' : ''}: IELTS bắt lỗi ${Math.round(SI.recall * 100)}% · band lệch ${SI.mae} · JSON ${Math.round(SI.valid * 100)}% · ngôn ngữ ${Math.round(SI.lang * 100)}% | roleplay ${SR.mean}/5 · vô lý ${SR.absurd} · hỏi lại ${Math.round(SR.clarify * 100)}% · JSON ${Math.round(SR.valid * 100)}% (${row.secs}s)`);
  for (const r of ielts) if (r.err || r.missed.length || r.diff > 0.5) console.log(`    ielts ${r.id}: band ${r.band ?? '-'} (kỳ vọng ${r.want}) · sót ${JSON.stringify(r.missed)}${r.missed.length ? ' · model ghi ' + JSON.stringify(r.got).slice(0, 600) : ''}${r.langOk ? '' : ' · SAI NGÔN NGỮ'}${r.err ? ' · ' + r.err : ''}`);
  for (const r of rp) if (r.err || (r.score ?? 0) <= 3 || r.absurd || !r.clarifyOk) console.log(`    rp ${r.id}: ${r.score ?? '-'}/5${r.absurd ? ' VÔ LÝ' : ''}${r.clarifyOk ? '' : ' KHÔNG HỎI LẠI'} «${r.reply || ''}» ${r.why}${r.err ? ' · ' + r.err : ''}`);
}
console.log(`· mã lỗi khóa: Gemini ${JSON.stringify(why.gem)} · Groq ${JSON.stringify(why.groq)} (kho: Gemini ${GEM.size} khóa, sống ${GEM.live()} · Groq ${GROQ.size}, sống ${GROQ.live()})`); report.keys = { why, gem: GEM.stats(), groq: GROQ.stats() };
fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
const md = ['## AI golden (chuỗi người dùng)', '', `Giám khảo: ${judgeOk ? '✅' : '❌'} · ngưỡng: IELTS bắt lỗi ≥ ${GATE.ielts.recall * 100}%, band lệch ≤ ${GATE.ielts.mae}; roleplay ≥ ${GATE.rp.mean}/5, vô lý ≤ ${GATE.rp.absurd}`, '',
  '| Model | Chuỗi | IELTS bắt lỗi | Band lệch TB | Ngôn ngữ | Roleplay /5 | Vô lý | Hỏi lại | Kết quả |', '|---|---|---|---|---|---|---|---|---|',
  ...report.models.map(m => `| ${m.route} ${m.model} | ${m.chain ? 'có' : '–'} | ${Math.round(m.ielts.recall * 100)}% | ${m.ielts.mae} | ${Math.round(m.ielts.lang * 100)}% | ${m.rp.mean} | ${m.rp.absurd} | ${Math.round(m.rp.clarify * 100)}% | ${m.pass ? '✅' : m.available ? '❌' : '⏸ không gọi được'} |`)].join('\n');
if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, md + '\n');
console.log('\n' + md);
// Trượt: giám khảo hỏng, hoặc model TRONG CHUỖI gọi được mà không đạt, hoặc không model nào trong chuỗi gọi được
const chain = report.models.filter(m => m.chain), bad = chain.filter(m => m.available && !m.pass), up = chain.filter(m => m.available);
if (!judgeOk || bad.length || !up.length) { console.error(`✗ golden trượt: ${!judgeOk ? 'giám khảo không đạt câu mồi; ' : ''}${bad.map(m => m.model).join(', ')}${!up.length ? ' không model nào trong chuỗi gọi được' : ''}`); process.exit(1); }
console.log('✓ mọi model trong chuỗi đạt golden');
