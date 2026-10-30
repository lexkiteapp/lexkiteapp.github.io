#!/usr/bin/env node
// Test ai-pool (scripts/lib/ai-pool.mjs) – ngoại tuyến, mọi nhà cung cấp giả (fetch mock). docs/API-KEYS.md §8.
import fs from 'fs';
import { createPool, allowed, familyOf, judgeKey, modelInfo, CHAINS, untilPacificMidnight, JUDGE_B_SYS, sameFamOk, cfTextOn } from '../lib/ai-pool.mjs';
import { agree } from '../content-qa/lib.mjs';
import { parseKeys, keyRing } from '../lib/key-pool.mjs';
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
// GrabCast nâng cấp: tôn trọng provider + model
const gcEcho = b => J({ text: JSON.stringify({ 'apple#n': { s: 5, def: 'a fruit' } }), provider: b.provider, model: b.model });

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
  const m = mock({ lexai: () => J({ error: 'no-model', diag: 'keys=0' }, 503), gc: gcEcho }); const P = mk(m);
  const r = await P.gen({ mode: 'lxgen', items: ITEMS });
  ok(r && r.route === 'gc-groq' && r.model === 'openai/gpt-oss-120b' && r.out['apple#n'], 'lxgen: Gemini rỗng → GrabCast Groq gpt-oss-120b');
  ok(m.calls.some(c => c.url.startsWith(GC) && c.body.provider === 'groq' && c.body.model === 'openai/gpt-oss-120b'), 'gửi provider + model tới GrabCast');
  const before = m.calls.filter(c => c.url === LX && !c.body.prompt).length; await P.gen({ mode: 'lxgen', items: ITEMS });
  ok(m.calls.filter(c => c.url === LX && !c.body.prompt).length === before, 'keys=0 → cả tuyến lexai nghỉ, không gọi lại');
  ok(m.calls.some(c => c.url.startsWith(GC) && c.body.prompt.startsWith(build({ mode: 'lxgen', items: ITEMS }).sys)) && !m.calls.some(c => c.body.prompt === true), 'tuyến GrabCast dùng prompt của lexai build() dựng tại chỗ (không gọi mạng)');
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
  const m = mock({ lexai: b => J({ out: { 'apple#n': { s: 5 } }, model: b.model }), gc: gcEcho });
  const { a, b } = await mk(m).judgePair({ mode: 'lxjudge', items: ITEMS });
  ok(a && b && a.route === 'gc-groq' && a.model === 'openai/gpt-oss-120b' && b.route === 'gc-groq' && b.model === 'openai/gpt-oss-20b', 'judgePair: A = Groq gpt-oss-120b, B = Groq gpt-oss-20b (25/10: không văn bản CF)');
  const gp = m.calls.filter(c => c.url.startsWith(GC)).map(c => c.body);
  ok(!gp.some(c => c.provider === 'cloudflare') && gp.find(c => c.model === 'openai/gpt-oss-20b').prompt.startsWith(JUDGE_B_SYS) && !gp.find(c => c.model === 'openai/gpt-oss-120b').prompt.startsWith(JUDGE_B_SYS), 'giám khảo B: lời nhắn khác A (JUDGE_B_SYS); không gọi provider cloudflare');
  ok(agree({ j: { [judgeKey(a.model)]: 5, [judgeKey(b.model)]: 4 } }).ok && !agree({ j: { 'gpt-oss:gpt-oss-120b': 5, 'gpt-oss:openai/gpt-oss-120b': 5 } }).ok && !agree({ j: { 'qwen:qwen3-235b': 5, 'qwen:qwen3-32b': 5 } }).ok, 'content-qa: cặp gpt-oss 120b + 20b đạt; cùng mô hình / họ khác cùng họ thì không');
  ok(sameFamOk('openai/gpt-oss-120b', 'openai/gpt-oss-20b') && !sameFamOk('openai/gpt-oss-120b', '@cf/openai/gpt-oss-120b') && !cfTextOn({}) && cfTextOn({ AI_POOL_CF_TEXT: '1' }), 'cặp cùng họ hợp lệ; cờ văn bản CF mặc định TẮT');
}
{ // A rơi về 20b (120b nghỉ) → B phải là 120b (khác mô hình), không bao giờ 2 lần 20b
  const m = mock({ lexai: () => J({ error: 'no-model', diag: 'keys=0' }, 503), gc: b => b.model === 'openai/gpt-oss-120b' && !b.prompt.startsWith(JUDGE_B_SYS) ? J({ text: 'cut', provider: 'groq', model: b.model }) : gcEcho(b) }); // 120b trả hỏng cho A (không nghỉ)
  const { a, b } = await mk(m).judgePair({ mode: 'lxjudge', items: ITEMS });
  ok(a && b && a.model === 'openai/gpt-oss-20b' && b.model === 'openai/gpt-oss-120b', 'judgePair: A 20b → B 120b (khác mô hình)');
}
{ // GrabCast tự trả lời yêu cầu groq bằng Cloudflare → bỏ (neuron ảnh) + tuyến nghỉ; cờ AI_POOL_CF_TEXT=1 → nhận
  const m = mock({ lexai: () => J({ error: 'no-model', diag: 'keys=0' }, 503), gc: gcLlama }); const P = mk(m);
  ok(await P.gen({ mode: 'lxgen', items: ITEMS }) === null && P.stats().used.cfLeak >= 1, 'GrabCast groq → CF: câu trả lời bị bỏ, đếm cfLeak');
  const k = m.calls.filter(c => c.url.startsWith(GC)).length; await P.gen({ mode: 'lxgen', items: ITEMS });
  ok(m.calls.filter(c => c.url.startsWith(GC)).length === k, 'sau rò CF: các tuyến GrabCast nghỉ 30 phút, không gọi lại');
  const m2 = mock({ lexai: () => J({ error: 'no-model', diag: 'keys=0' }, 503), gc: gcLlama }); const r2 = await mk(m2, { env: { AI_POOL_CF_TEXT: '1' } }).gen({ mode: 'lxgen', items: ITEMS });
  ok(r2 && r2.fam === 'llama', 'cờ AI_POOL_CF_TEXT=1: văn bản CF được dùng (dự phòng cuối)');
}
{ // B chỉ còn cùng họ → b null (bỏ qua trung tính, không ghi điểm)
  const m = mock({ lexai: () => J({ error: 'no-model', diag: 'keys=0' }, 503), gc: gcLlama }); // GrabCast mọi yêu cầu đều rơi về Llama
  const { a, b } = await mk(m, { env: { AI_POOL_CF_TEXT: '1' } }).judgePair({ mode: 'lxjudge', items: ITEMS });
  ok(a && a.fam === 'llama' && b === null, 'judgePair: chỉ còn 1 họ (không phải cặp gpt-oss) → b = null');
}
{ // GrabCast groq rơi về cloudflare (bad_request) → mô hình thật = llama; khi llama bị loại (exclude) → không nhận
  const m = mock({ lexai: () => J({ error: 'no-model', diag: 'keys=0' }, 503), gc: gcLlama });
  const r = await mk(m, { env: { AI_POOL_CF_TEXT: '1' } }).judge({ mode: 'lxjudge', items: ITEMS }, { exclude: ['llama'] });
  ok(r === null, 'GrabCast tự rơi về họ bị loại → không nhận (kiểm theo mô hình THẬT trả lời)');
}
// 5) chuẩn chất lượng: xgen khi chỉ còn Llama → null (không soạn bằng mô hình kém)
{
  const m = mock({ lexai: () => J({ error: 'no-model', diag: 'keys=0' }, 503), gc: gcLlama });
  ok(await mk(m, { env: { AI_POOL_CF_TEXT: '1' } }).gen({ mode: 'xgen', lang: 'en', items: ITEMS }) === null, 'xgen: chỉ còn Llama 70B → bỏ qua trung tính');
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
// 7b) kho CF_POOL (26/10, GrabCast hỏng): xoay vòng tài khoản; 4006 → bỏ tài khoản tới 00:00 UTC, gọi ngay tài khoản kế; không tài khoản chính; 2 giám khảo khác họ chỉ bằng kho
{
  const A = 'a'.repeat(32), B = 'b'.repeat(32), M = 'c'.repeat(32), seen = [];
  const m = mock({ lexai: () => J({ error: 'no-model', diag: 'keys=0' }, 503), cf2: (url, body) => { const acct = url.split('/accounts/')[1].split('/')[0]; seen.push(acct);
    if (acct === A) return J({ success: false, errors: [{ code: 4006, message: 'daily free allocation of 10,000 neurons' }] }, 429);
    const model = url.split('/ai/run/')[1]; return J({ success: true, result: { response: JSON.stringify({ 'apple#n': { s: 5, def: 'a fruit' } }), usage: { prompt_tokens: 500, completion_tokens: 100 } }, model }); } });
  const P = mk(m, { env: { GRABCAST_AI_KEY: '', CF_POOL: `${A}:ta\n${B}:tb\n${M}:tm`, CF_ACCOUNT_1: M, VIMG_POOL_SKIP: '0' }, budget: { cf2: 1e6 } });
  const r1 = await P.gen({ mode: 'lxdef', items: ITEMS }), r2 = await P.gen({ mode: 'lxdef', items: ITEMS });
  ok(r1 && r2 && r1.route === 'cf2' && seen.filter(x => x === A).length === 1 && !seen.includes(M), 'kho CF: 4006 → tài khoản kế ngay, không gọi lại tài khoản hết neuron, không tài khoản chính');
  ok(P.stats().used.cf2Dead.some(x => /4006/.test(x)), 'kho CF: ghi tài khoản hết neuron');
  const { a, b } = await P.judgePair({ mode: 'lxjudge', items: ITEMS });
  ok(a && b && a.fam === 'gpt-oss' && b.fam === 'llama', 'kho CF: giám khảo A gpt-oss-120b, B llama-3.3-70b (khác họ)');
  const m2 = mock({ lexai: () => J({ error: 'no-model', diag: 'keys=0' }, 503), cf2: () => J({ success: false, errors: [{ code: 4006 }] }, 429) });
  const P2 = mk(m2, { env: { GRABCAST_AI_KEY: '', CF_POOL: `${A}:ta\n${B}:tb`, VIMG_POOL_SKIP: '0' }, budget: { cf2: 1e6 } });
  ok(await P2.gen({ mode: 'lxdef', items: ITEMS }) === null && await P2.gen({ mode: 'lxdef', items: ITEMS }) === null && m2.calls.filter(c => c.url.includes('cloudflare.com')).length === 2, 'kho CF: mọi tài khoản 4006 → cả tuyến nghỉ, không gọi thêm');
}
// 7c) pilot 11: gpt-oss trên kho CF trả JSON bị cắt khi lô lớn → chia đôi lô, gộp kết quả
{
  const A = 'a'.repeat(32), I2 = [{ k: 'apple#n', w: 'apple' }, { k: 'pear#n', w: 'pear' }];
  const m = mock({ lexai: () => J({ error: 'no-model', diag: 'keys=0' }, 503), cf2: (url, body) => { const u = JSON.parse(body.messages[1].content || '[]'), ks = (Array.isArray(u) ? u : []).map(x => x.k);
    return J({ success: true, result: { response: ks.length > 1 ? '{"apple#n":{"s":5},"pear#n":{"s"' : JSON.stringify({ [ks[0]]: { s: 4 } }), usage: { prompt_tokens: 100, completion_tokens: 50 } } }); } });
  const P = createPool({ fetch: m.f, env: { CF_POOL: `${A}:t`, VIMG_POOL_SKIP: '0' }, lexaiUrl: LX, gcBase: GC, oidc: async () => 't', log: () => {}, sleep: async () => {}, budget: { cf2: 1e6 }, prompt: async r => ({ sys: 'S', user: JSON.stringify(r.items) }) });
  const r = await P.gen({ mode: 'lxdef', items: I2 });
  ok(r && r.out['apple#n'] && r.out['pear#n'] && P.stats().used.cf2Split === 1, 'kho CF: JSON bị cắt → chia đôi lô, gộp đủ mục');
}
// 7d) giám khảo C (27/10, đồng thuận 3): kho CF chọn họ THỨ BA (mistral) khi loại gpt-oss + llama, lời nhắn soát đối nghịch
{
  const A = 'a'.repeat(32), seenM = [], sys = [];
  const m = mock({ lexai: () => J({ error: 'no-model', diag: 'keys=0' }, 503), cf2: (url, body) => { const model = url.split('/ai/run/')[1]; seenM.push(model); sys.push(body.messages[0].content);
    return J({ success: true, result: { response: JSON.stringify({ 'apple#n': { s: 5 } }), usage: { prompt_tokens: 100, completion_tokens: 50 } } }); } });
  const P = createPool({ fetch: m.f, env: { CF_POOL: `${A}:t`, VIMG_POOL_SKIP: '0' }, lexaiUrl: LX, gcBase: GC, oidc: async () => 't', log: () => {}, sleep: async () => {}, budget: { cf2: 1e6 }, prompt: async r => ({ sys: 'S', user: JSON.stringify(r.items) }) });
  const c = await P.judge({ mode: 'lxjudge', items: ITEMS }, { chain: ['cf2'], slot: 'C', exclude: ['gpt-oss', 'llama'] });
  ok(c && c.fam === 'mistral' && /mistral-small-3\.1/.test(seenM.at(-1)) && sys.at(-1).startsWith(JUDGE_B_SYS.slice(0, 30)), 'giám khảo C: họ mistral trên kho CF, lời nhắn soát đối nghịch');
}
// 8) ngân sách GrabCast
{
  const m = mock({ lexai: () => J({ error: 'no-model', diag: 'keys=0' }, 503), gc: gcEcho }); const P = mk(m, { budget: { gc: 1 } });
  ok(await P.gen({ mode: 'lxgen', items: ITEMS }) && await P.gen({ mode: 'lxgen', items: ITEMS }) === null, 'trần GrabCast lượt này');
}
// 8b) GrabCast ≤ 8.000 ký tự: lô dài bị chia đôi, gộp out
{
  const big = Array.from({ length: 8 }, (_, i) => ({ k: 'w' + i, gloss: 'x'.repeat(1500) }));
  const m = mock({ lexai: () => J({ error: 'no-model', diag: 'keys=0' }, 503), gc: b => b.prompt.length > 8000 ? J({ detail: [{ msg: 'too long' }] }, 422) : J({ text: JSON.stringify(Object.fromEntries(JSON.parse(b.prompt.split('INPUT:\n')[1]).map(x => [x.k, { def: 'd' }]))), provider: b.provider, model: b.model }) });
  const r = await mk(m).gen({ mode: 'lxgen', items: big });
  ok(r && Object.keys(r.out).length === 8 && m.calls.filter(c => c.url.startsWith(GC)).every(c => c.body.prompt.length <= 8000), 'GrabCast: chia lô cho vừa 8.000 ký tự, đủ 8 mục');
}
// 8c) ai_exhausted → cả tuyến nghỉ; vision qua /api/owner-ai/vision
{
  const m = mock({ lexai: () => J({ error: 'no-model', diag: 'keys=0' }, 503), gc: b => b.provider === 'groq' ? J({ detail: { code: 'ai_exhausted' } }, 503) : gcEcho(b) });
  const P = mk(m); const r = await P.gen({ mode: 'lxgen', items: ITEMS }); const k = m.calls.filter(c => c.body.provider === 'groq').length; await P.gen({ mode: 'lxgen', items: ITEMS });
  ok(r && r.route === 'gc-gemini' && !m.calls.some(c => c.body.provider === 'cloudflare') && m.calls.filter(c => c.body.provider === 'groq').length === k, 'ai_exhausted Groq → GrabCast Gemini (không văn bản CF), Groq nghỉ');
  const mc = mock({ lexai: () => J({ error: 'no-model', diag: 'keys=0' }, 503), gc: b => b.provider !== 'cloudflare' ? J({ detail: { code: 'ai_exhausted' } }, 503) : gcEcho(b) });
  const rc = await mk(mc, { env: { AI_POOL_CF_TEXT: '1' } }).gen({ mode: 'lxgen', items: ITEMS });
  ok(rc && rc.route === 'gc-cf' && rc.model === '@cf/openai/gpt-oss-120b', 'cờ bật: CF gpt-oss-120b là dự phòng CUỐI chuỗi');
  const mv = mock({ gc: b => J({ text: '{"name":"apple"}', provider: 'cloudflare', model: '@cf/meta/llama-4-scout-17b-16e-instruct' }) });
  const v = await mk(mv).vision({ question: 'q', image: 'AAAA' });
  ok(v && v.route === 'gc-vision' && mv.calls[0].url === GC + '/api/owner-ai/vision' && mv.calls[0].body.image_b64 === 'AAAA' && v.out.name === 'apple', 'vision: GrabCast /api/owner-ai/vision');
}
// 8d) chuẩn hình trả lời
{ const { normOut } = await import('../lib/ai-pool.mjs');
  ok(JSON.stringify(normOut({ k: 'a#n', s: 5 }, [{ k: 'a#n' }])) === '{"a#n":{"s":5}}' && JSON.stringify(normOut([{ k: 'a#n', s: 4 }], [{ k: 'a#n' }])) === '{"a#n":{"s":4}}' && normOut({ 'a#n': { s: 3 } }, [{ k: 'a#n' }])['a#n'].s === 3, 'normOut: mục trần / mảng → { k: … }'); }
// 9) Workers AI TÀI KHOẢN CHÍNH bị cấm: ai-pool không có tuyến tới nó
{
  const src = fs.readFileSync(new URL('../lib/ai-pool.mjs', import.meta.url), 'utf8').replace(/^\s*\/\/.*$/gm, '');
  ok(!/env\.AI\b|CLOUDFLARE_API_TOKEN|CF_AI_TOKEN(?!_2)|CF_ACCOUNT_ID|CF_ACCOUNT(?!_2)/.test(src), 'không tham chiếu Workers AI / token tài khoản chính');
  ok(Object.values(CHAINS).flat().every(r => ['gem', 'groq', 'lexai', 'gc-cf', 'cf2', 'gc-gemini', 'gc-groq', 'gc-vision', 'studio', 'cf2-vision'].includes(r)), 'chuỗi chỉ gồm tuyến được phép');
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
// 30/10: kho khoá GEMINI_POOL / GROQ_POOL – đọc đúng loại, xoay khoá, 429 ngày → khoá nghỉ tới lượt đặt lại, 429 phút → Retry-After, không bao giờ ghi khoá ra nhật ký
{ const G1 = 'AIza' + 'a'.repeat(35), G2 = 'AQ.' + 'b'.repeat(30), Q1 = 'gsk_' + 'c'.repeat(40), Q2 = 'gsk_' + 'd'.repeat(40);
  ok(parseKeys(`# kho\n${G1}\n\n${G2}\n${G1}\n${Q1}`, 'gemini').join() === [G1, G2].join() && parseKeys(`${Q1}\n${Q2}\n${G1}`, 'groq').join() === [Q1, Q2].join(), 'parseKeys: đúng loại, bỏ trùng/dòng lạ');
  let t = 1e6; const ring = keyRing([G1, G2], { now: () => t }); const a = ring.next(), b = ring.next(); ok(a.key === G1 && b.key === G2, 'keyRing xoay vòng');
  ring.park('k0', 60e3, 'minute'); ok(ring.next().key === G2 && ring.next().key === G2 && ring.live() === 1, 'keyRing: khoá nghỉ bị bỏ qua'); t += 61e3; ok(ring.live() === 2, 'keyRing: hết nghỉ thì dùng lại');
  const logs = [], seen = [];
  const f = async (url, init = {}) => { const body = init.body ? JSON.parse(init.body) : {}, h = init.headers || {}; seen.push(h['x-goog-api-key'] || h.Authorization);
    if (url.includes('generativelanguage')) { if (h['x-goog-api-key'] === G1) return new Response('{"error":{"message":"Quota exceeded for metric generate_content_free_tier_requests, limit 250 PerDay"}}', { status: 429 });
      return J({ candidates: [{ content: { parts: [{ text: JSON.stringify({ 'apple#n': { s: 5 } }) }] } }] }); }
    if (url.includes('api.groq.com')) { if (h.Authorization === 'Bearer ' + Q1) return new Response('{"error":{"message":"Rate limit reached ... requests per minute (RPM)"}}', { status: 429, headers: { 'Retry-After': '7' } });
      return J({ choices: [{ message: { content: JSON.stringify({ 'apple#n': { s: 4 } }) } }] }); }
    if (url === LX && body.mode === 'ping') return J({ gemini: 0 });
    throw new Error('unexpected ' + url); };
  const P = createPool({ fetch: f, env: { GEMINI_POOL: `${G1}\n${G2}`, GROQ_POOL: `${Q1}\n${Q2}` }, lexaiUrl: LX, gcBase: GC, oidc: async () => 't', log: l => logs.push(l), sleep: async () => {}, now: () => t, prompt: async r => ({ sys: 'S', user: JSON.stringify(r.items) }) });
  const g = await P.gen({ mode: 'lxdef', items: ITEMS }); ok(g && g.route === 'gem' && /gemini-2\.5-flash/.test(g.model) && g.out['apple#n'].s === 5, 'gem: soạn bằng Gemini 2.5 Flash, khoá hết hạn mức ngày → khoá kế');
  const st = P.stats().keys; ok(st.gem.live === 1 && st.gem.parked.day === 1, 'gem: khoá hết hạn mức NGÀY nghỉ (không thử lại trong lượt)');
  const j = await P.judge({ mode: 'lxjudge', items: ITEMS }); ok(j && j.route === 'groq' && j.fam === 'gpt-oss' && P.stats().keys.groq.parked.minute === 1, 'groq: giám khảo A gpt-oss, 429 theo phút → khoá nghỉ Retry-After');
  const pair = await P.judgePair({ mode: 'lxjudge', items: ITEMS }); ok(pair.a && pair.b && pair.a.fam !== pair.b.fam, 'gem + groq: 2 giám khảo khác họ');
  const c = await P.judge({ mode: 'lxjudge', items: ITEMS }, { chain: ['groq', 'cf2'], slot: 'C', exclude: [pair.a.fam, pair.b.fam] }); ok(c && c.fam === 'llama', 'groq: giám khảo C họ thứ ba (llama)');
  ok(!logs.join('\n').includes(G1) && !logs.join('\n').includes(Q1) && !JSON.stringify(P.stats()).includes(G1) && !JSON.stringify(P.stats()).includes(Q2), 'không bao giờ ghi khoá ra nhật ký/thống kê'); }
console.log(`✓ ai-pool test: ${n} kiểm tra`);
