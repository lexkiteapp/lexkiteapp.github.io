#!/usr/bin/env node
// Dò kho CF_POOL (27/10): mỗi tài khoản 1 câu hỏi ~1 neuron (@cf/meta/llama-3.1-8b-instruct-fast, max_tokens 1) → bao nhiêu tài khoản còn neuron.
// Mục đích: biết chắc kho có được nạp lại lúc 00:00 UTC không (27/10 cả 121 tài khoản báo 4006 lúc 00:25 dù Lexkite/GrabCast không chạy gì).
// In tổng hợp (không in id tài khoản/khoá) + ghi GITHUB_STEP_SUMMARY.
import fs from 'fs';
import { poolAccounts } from './cf-pool.mjs';
// PROBE_SHARE (0–1): chỉ dò phần ĐẦU kho (phần vẽ ảnh, VIMG_DRAW_SHARE) – lượt ảnh tự kiểm trước khi bật máy; PROBE_QUICK=1 bỏ analytics
const ALL = poolAccounts({ ...process.env, VIMG_POOL_SKIP: '0' }), A = ALL.slice(0, Math.max(1, Math.ceil(ALL.length * Math.min(1, +(process.env.PROBE_SHARE || 1))))), M = '@cf/meta/llama-3.1-8b-instruct-fast', c = { ok: 0, q4006: 0, auth: 0, other: 0 }, why = {};
// 20/11: gốc = llama-3.2-1b bị Cloudflare gỡ (410 AiError «deprecated») → 121/121 «lỗi khác» → mọi lượt fill ảnh bỏ cả ngày từ ~11/11; đổi sang mô hình đang sống + mọi tài khoản cùng lỗi ⇒ ĐỎ (không bỏ lượt im lặng)
// 20/11: «lỗi khác» từng báo 61/61 (lượt ảnh bỏ cả ngày) mà không rõ lý do → ghi mẫu lỗi (HTTP + thông điệp, che id 32 hex) để biết gốc
const note = (k) => { k = String(k).replace(/[0-9a-f]{32}/gi, '<id>').slice(0, 90); why[k] = (why[k] || 0) + 1; };
// PROBE_HEAD (0–1, 31/10): đếm riêng tài khoản còn neuron ở phần ĐẦU (vẽ) – pilot dò cả kho: thẻ cảnh dùng đuôi, vẽ dùng đầu (pilot 41158516082: 15/121 sống, thẻ ăn hết, vẽ 0 ảnh)
const HEAD = process.env.PROBE_HEAD ? Math.ceil(ALL.length * Math.min(1, +process.env.PROBE_HEAD)) : 0; let head = 0;
await Promise.all(A.map(async (a, i) => {
  try {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${a.acct}/ai/run/${M}`, { method: 'POST', headers: { Authorization: 'Bearer ' + a.tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }) });
    const j = await r.json().catch(() => ({})), e = JSON.stringify(j.errors || '');
    if (r.ok && j.success) { c.ok++; if (i < HEAD) head++; } else if (/4006|daily free allocation/i.test(e)) c.q4006++; else if (r.status === 401 || r.status === 403 || /10000/.test(e)) c.auth++; else { c.other++; note(r.status + ' ' + ((j.errors || [])[0] || {}).message); }
  } catch (e) { c.other++; note('exc ' + ((e && e.cause && e.cause.code) || (e && e.message))); }
}));
// neuron đã dùng 24 h qua (GraphQL analytics – cần quyền Account Analytics Read; thiếu quyền → in lỗi đầu tiên, không sao)
const since = new Date(Date.now() - 24 * 3600e3).toISOString(), used = []; let gqlErr = '';
if (!process.env.PROBE_QUICK) await Promise.all(A.map(async a => {
  try {
    const q = `{viewer{accounts(filter:{accountTag:"${a.acct}"}){aiInferenceAdaptiveGroups(limit:10000,filter:{datetime_geq:"${since}"}){sum{totalNeurons}}}}}`;
    const r = await fetch('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: { Authorization: 'Bearer ' + a.tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) });
    const j = await r.json().catch(() => ({})); if (j.errors && j.errors.length) { gqlErr ||= String(j.errors[0].message).slice(0, 120); return; }
    const g = (((j.data || {}).viewer || {}).accounts || [])[0]; if (g) used.push((g.aiInferenceAdaptiveGroups || []).reduce((t, x) => t + ((x.sum || {}).totalNeurons || 0), 0));
  } catch (e) { gqlErr ||= String(e.message).slice(0, 80); }
}));
const st = used.length ? (() => { const v = [...used].sort((x, y) => x - y); return `neuron 24 h (${v.length} tk): min ${Math.round(v[0])} · trung vị ${Math.round(v[v.length >> 1])} · max ${Math.round(v[v.length - 1])} · tổng ${Math.round(v.reduce((t, x) => t + x, 0))}`; })() : `analytics: không đọc được (${gqlErr || 'không dữ liệu'})`;
const line = `${new Date().toISOString()} · kho CF ${A.length} tài khoản: còn neuron ${c.ok} · hết neuron (4006) ${c.q4006} · lỗi quyền ${c.auth} · lỗi khác ${c.other} · ${st}` + (c.other ? ` · mẫu lỗi khác: ${Object.entries(why).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, n]) => n + '× ' + k).join(' | ')}` : '');
console.log(line); if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `alive=${c.ok}\n` + (HEAD ? `alive_head=${head}\nalive_tail=${c.ok - head}\n` : '')); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, line + '\n');
if (A.length && c.other === A.length) { console.log(`::error::Dò kho CF: ${A.length}/${A.length} tài khoản lỗi khác – mô hình dò có thể đã bị gỡ (${Object.keys(why)[0]})`); process.exitCode = 1; }
