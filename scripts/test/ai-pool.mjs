#!/usr/bin/env node
// Test ai-pool (scripts/lib/ai-pool.mjs) – ngoại tuyến, mọi nhà cung cấp giả (fetch mock). docs/API-KEYS.md §8.
import fs from 'fs';
import { createPool, allowed, familyOf, judgeKey, modelInfo, CHAINS, untilPacificMidnight } from '../lib/ai-pool.mjs';
import { agree } from '../content-qa/lib.mjs';
import { build } from '../../functions/api/lexai.js';

let n = 0; const ok = (c, m) => { if (!c) { console.error('✗ ' + m); process.exit(1); } n++; };
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
const GC = 'https://gc.test', LX = 'https://lex.test/api/lexai';
const ITEMS = [{ k: 'apple#n', w: 'apple' }];
// mock: lexai { mode, model, prompt } · GrabCast { provider } · cf2 REST
function mock(h) {
  const calls = [];
  const f = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : {}; calls.push({ url, body });
    if (url === LX) return body.prompt ? J({ sys: 'SYS', user: JSON.stringify(body.items), temp: 0.1 }) : body.mode === 'ping' ? J({ gemini: h.geminiKeys ?? 1 }) : h.lexai(body);
    if (url.startsWith(GC)) return h.gc ? h.gc(body) : J({ detail: 'x' }, 500);
    if (url.includes('api.cloudflare.com')) return h.cf2 ? h.cf2(url, body) : J({ success: false, errors: [{ code: 10000 }] }, 403);
    throw new Error('unexpected ' + url);
  };
  return { f, calls };
}
const env = extra => ({ GRABCAST_AI_KEY: 'gk', ...extra });
const mk = (m, o = {}) => createPool({ fetch: m.f, env: env(o.env), lexaiUrl: LX, gcBase: GC, oidc: async () => 't', log: () => {}, sleep: async () => {}, budget: o.budget, now: o.now });
const gcLlama = () => J({ text: JSON.stringify({ 'apple#n': { s: 5, def: 'a fruit' } }), provider: 'cloudflare', model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' });

// 1) mô hình / chuẩn chất lượng
ok(familyOf('gemini-3.5-flash') === 'gemini' && familyOf('gemma-3-27b-it') === 'gemma' && familyOf('@cf/openai/gpt-oss-120b') === 'gpt-oss' && familyOf('@cf/meta/llama-3.3-70b-instruct-fp8-fast') === 'llama', 'họ mô hình');
ok(allowed('lxgen', 'gemini-3.6-flash') && allowed('lxgen', '@cf/meta/llama-3.3-70b-instruct-fp8-fast') && !allowed('xgen', '@cf/meta/llama-3.3-70b-instruct-fp8-fast') && !allowed('lxtr', '@cf/meta/llama-3.3-70b-instruct-fp8-fast'), 'Llama 70B: soạn lxgen được, cấm xgen/lxtr (đo 22/10, 24/10)');
ok(!allowed('lxgen', 'gemma-3-27b-it') && allowed('lxjudge', 'gemma-3-27b-it') && !allowed('lxgen', 'gemini-3.5-flash-lite') && allowed('xjudge', 'gemini-3.5-flash-lite'), 'hạng M: chỉ chấm');
ok(!allowed('lxjudge', '@cf/meta/llama-3.1-8b-instruct') && !allowed('lxjudge', 'mystery-7b') && modelInfo('x').tier === 'S', 'hạng S/lạ: cấm cả soạn lẫn chấm');
ok(judgeKey('@cf/openai/gpt-oss-120b') === 'gpt-oss:gpt-oss-120b' && judgeKey('gemini-3.5-flash') === 'gemini:gemini-3.5-flash', 'khóa giám khảo qa.j');
ok(agree({ j: { 'gemini:gemini-3.5-flash': 5, 'llama:llama-3.3-70b-instruct-fp8-fast': 4 } }).ok && !agree({ j: { 'gemini:gemini-3.5-flash': 5, 'llama:llama-3.1-8b-instruct': 5 } }).ok, 'content-qa: giám khảo nhỏ không được tính');
ok(untilPacificMidnight(Date.UTC(2026, 9, 24, 7, 30)) > 23 * 3600e3 - 120e3, 'nghỉ tới nửa đêm Pacific');

// 2) dự phòng: kho Gemini rỗng → GrabCast Cloudflare trả lời; lexai nghỉ CẢ tuyến (keys=0), lượt sau không gọi lại
{
  const m = mock({ lexai: () => J({ error: 'no-model', diag: 'keys=0' }, 503), gc: gcLlama }); const P = mk(m);
  const r = await P.gen({ mode: 'lxgen', items: ITEMS });
  ok(r && r.route === 'gc-cf' && r.fam === 'llama' && r.out['apple#n'], 'lxgen: Gemini rỗng → GrabCast Cloudflare (Llama 70B)');
  const before = m.calls.filter(c => c.url === LX && !c.body.prompt).length; await P.gen({ mode: 'lxgen', items: ITEMS });
  ok(m.calls.filter(c => c.url === LX && !c.body.prompt).length === before, 'keys=0 → cả tuyến lexai nghỉ, không gọi lại');
  ok(m.calls.some(c => c.url.startsWith(GC) && c.body.prompt.startsWith('SYS')), 'tuyến GrabCast dùng prompt của lexai build (prompt: true)');
}
// 3) 429 / PerDay theo mô hình → chỉ mô hình đó nghỉ, mô hình kế trong CÙNG tuyến trả lời; 403 một mô hình không giết cả khóa
{
  const m = mock({ lexai: b => b.model === 'gemini-3.6-flash' ? J({ error: 'no-model', diag: 'keys=1 429:PerDay quota' }, 503) : b.model === 'gemini-3.5-flash' ? J({ error: 'no-model', diag: 'keys=1 403:denied' }, 503) : J({ out: { 'apple#n': { def: 'x' } }, model: b.model }) });
  const P = mk(m); const r = await P.gen({ mode: 'lxgen', items: ITEMS });
  ok(r && r.route === 'lexai' && r.model === 'gemini-3-flash-preview', 'PerDay/403 ở 3.6 + 3.5 → 3-flash-preview cùng kho trả lời');
  const c0 = m.calls.length; await P.gen({ mode: 'lxgen', items: ITEMS });
  const tried = m.calls.slice(c0).filter(c => c.url === LX).map(c => c.body.model);
  ok(tried.length === 1 && tried[0] === 'gemini-3-flash-preview', 'mô hình đang nghỉ bị bỏ qua, tuyến vẫn sống');
}
// 4) 2 giám khảo khác họ: A Gemini, B không được là Gemini (GrabCast-gemini bị loại, GrabCast tự rơi về gemini → loại)
{
  const m = mock({ lexai: b => J({ out: { 'apple#n': { s: 5 } }, model: b.model }), gc: b => b.provider === 'cloudflare' ? gcLlama() : J({ text: '{"apple#n":{"s":4}}', provider: 'gemini', model: 'gemini-2.5-flash' }) });
  const { a, b } = await mk(m).judgePair({ mode: 'lxjudge', items: ITEMS });
  ok(a && b && a.fam === 'gemini' && b.fam === 'llama' && b.route === 'gc-cf', 'judgePair: gemini + llama (khác họ)');
}
{ // B chỉ còn cùng họ → b null (bỏ qua trung tính, không ghi điểm)
  const m = mock({ lexai: b => J({ out: { 'apple#n': { s: 5 } }, model: b.model }), gc: () => J({ text: '{"apple#n":{"s":4}}', provider: 'gemini', model: 'gemini-2.5-flash' }) });
  const { a, b } = await mk(m).judgePair({ mode: 'lxjudge', items: ITEMS });
  ok(a && a.fam === 'gemini' && (!b || b.fam === 'gemma'), 'judgePair: không có họ khác Gemini ngoài gemma → b = gemma hoặc null, không bao giờ 2 × gemini');
}
{ // GrabCast groq rơi về cloudflare (bad_request) → mô hình thật = llama; khi llama bị loại (exclude) → không nhận
  const m = mock({ lexai: () => J({ error: 'no-model', diag: 'keys=0' }, 503), gc: gcLlama });
  const r = await mk(m).judge({ mode: 'lxjudge', items: ITEMS }, { exclude: ['llama'] });
  ok(r === null, 'GrabCast tự rơi về họ bị loại → không nhận (kiểm theo mô hình THẬT trả lời)');
}
// 5) chuẩn chất lượng: xgen khi chỉ còn Llama → null (không soạn bằng mô hình kém)
{
  const m = mock({ lexai: () => J({ error: 'no-model', diag: 'keys=0' }, 503), gc: gcLlama });
  ok(await mk(m).gen({ mode: 'xgen', lang: 'en', items: ITEMS }) === null, 'xgen: chỉ còn Llama 70B → bỏ qua trung tính');
}
// 6) tất cả hỏng → null, không ném lỗi
{
  const m = mock({ lexai: () => J({ error: 'x' }, 500), gc: () => J({ detail: 'down' }, 500) });
  ok(await mk(m).gen({ mode: 'lxgen', items: ITEMS }) === null, 'mọi tuyến hỏng → null (job không xuất gì)');
}
// 7) tài khoản 2: chỉ khi điều phối cấp neuron; 10000 = chưa có quyền → nghỉ cả tuyến; gpt-oss trả lời → họ gpt-oss
{
  const m0 = mock({ lexai: () => J({ error: 'no-model', diag: 'keys=0' }, 503), gc: () => J({ detail: 'x' }, 500), cf2: () => J({ success: true, result: { response: '{"apple#n":{"s":5}}', usage: { prompt_tokens: 1000, completion_tokens: 200 } } }) });
  ok(await mk(m0, { env: { CF_AI_TOKEN_2: 't', CF_ACCOUNT_2: 'a' }, budget: { cf2: 0 } }).gen({ mode: 'lxgen', items: ITEMS }) === null && !m0.calls.some(c => c.url.includes('cloudflare.com')), 'cf2: phần cấp 0 neuron → không gọi');
  const P = mk(m0, { env: { CF_AI_TOKEN_2: 't', CF_ACCOUNT_2: 'a' }, budget: { cf2: 1500 } }); const r = await P.gen({ mode: 'xgen', lang: 'en', items: ITEMS });
  ok(r && r.route === 'cf2' && r.fam === 'gpt-oss' && P.stats().used.cf2 > 0, 'cf2 gpt-oss-120b soạn xgen + trừ neuron');
  const m1 = mock({ lexai: () => J({ error: 'no-model', diag: 'keys=0' }, 503), gc: () => J({ detail: 'x' }, 500) });
  const P1 = mk(m1, { env: { CF_AI_TOKEN_2: 't', CF_ACCOUNT_2: 'a' }, budget: { cf2: 1500 } }); await P1.gen({ mode: 'lxgen', items: ITEMS });
  const k = m1.calls.filter(c => c.url.includes('cloudflare.com')).length; await P1.gen({ mode: 'lxgen', items: ITEMS });
  ok(k === 1 && m1.calls.filter(c => c.url.includes('cloudflare.com')).length === 1, 'cf2 10000 (chưa có quyền) → nghỉ cả tuyến sau 1 lần');
}
// 8) ngân sách GrabCast
{
  const m = mock({ lexai: () => J({ error: 'no-model', diag: 'keys=0' }, 503), gc: gcLlama }); const P = mk(m, { budget: { gc: 1 } });
  ok(await P.gen({ mode: 'lxgen', items: ITEMS }) && await P.gen({ mode: 'lxgen', items: ITEMS }) === null, 'trần GrabCast lượt này');
}
// 8b) GrabCast ≤ 8.000 ký tự: lô dài bị chia đôi, gộp out
{
  const big = Array.from({ length: 8 }, (_, i) => ({ k: 'w' + i, gloss: 'x'.repeat(1500) }));
  const m = mock({ lexai: () => J({ error: 'no-model', diag: 'keys=0' }, 503), gc: b => b.prompt.length > 8000 ? J({ detail: [{ msg: 'too long' }] }, 422) : J({ text: JSON.stringify(Object.fromEntries(JSON.parse(b.prompt.split('INPUT:\n')[1]).map(x => [x.k, { def: 'd' }]))), provider: 'cloudflare', model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' }) });
  const r = await mk(m).gen({ mode: 'lxgen', items: big });
  ok(r && Object.keys(r.out).length === 8 && m.calls.filter(c => c.url.startsWith(GC)).every(c => c.body.prompt.length <= 8000), 'GrabCast: chia lô cho vừa 8.000 ký tự, đủ 8 mục');
}
// 9) Workers AI TÀI KHOẢN CHÍNH bị cấm: ai-pool không có tuyến tới nó
{
  const src = fs.readFileSync(new URL('../lib/ai-pool.mjs', import.meta.url), 'utf8').replace(/^\s*\/\/.*$/gm, '');
  ok(!/env\.AI\b|CLOUDFLARE_API_TOKEN|CF_AI_TOKEN(?!_2)|CF_ACCOUNT_ID|CF_ACCOUNT(?!_2)/.test(src), 'không tham chiếu Workers AI / token tài khoản chính');
  ok(Object.values(CHAINS).flat().every(r => ['lexai', 'gc-cf', 'cf2', 'gc-gemini', 'gc-groq', 'gc-vision', 'studio', 'cf2-vision'].includes(r)), 'chuỗi chỉ gồm tuyến được phép');
  const lx = fs.readFileSync(new URL('../../functions/api/lexai.js', import.meta.url), 'utf8');
  ok(/stripBackgroundAI\(env\)/.test(lx) && !/env\.AI\.run/.test(lx), 'lexai: không gọi env.AI (tài khoản chính)');
}
// 10) lexai build = một nguồn prompt
{
  const p = build({ mode: 'lxjudge', items: [{ k: 'a#n', w: 'a', pos: 'n', def: 'x', ex: ['e'], tr: { es: 'b' } }] });
  ok(p && /lexicographer/.test(p.sys) && p.temp === 0.1 && JSON.parse(p.user)[0].k === 'a#n', 'build lxjudge');
  ok(build({ mode: 'xgen', lang: 'vi', items: [{ k: 1 }] }) === null && build({ mode: 'nope' }) === null, 'build từ chối yêu cầu sai');
  ok(build({ mode: 'vjudge', items: [{ k: 'x' }] }).models.includes('gemma-3-27b-it'), 'vjudge chấm được bằng Gemini/Gemma kho Lexkite');
}
// 11) các việc nền đã chuyển sang ai-pool
for (const f of ['../lexicon/expand/job.mjs', '../explain/job.mjs', '../scriptbank/job.mjs', '../vocab-img/judge.mjs']) {
  const s = fs.readFileSync(new URL(f, import.meta.url), 'utf8');
  ok(/from '(\.\.\/)+lib\/ai-pool\.mjs'/.test(s) && !/fetch\(API/.test(s), f + ' dùng ai-pool');
}
console.log(`✓ ai-pool test: ${n} kiểm tra`);
