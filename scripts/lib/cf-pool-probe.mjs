#!/usr/bin/env node
// Dò kho CF_POOL (27/10): mỗi tài khoản 1 câu hỏi ~1 neuron (@cf/meta/llama-3.2-1b-instruct, max_tokens 1) → bao nhiêu tài khoản còn neuron.
// Mục đích: biết chắc kho có được nạp lại lúc 00:00 UTC không (27/10 cả 121 tài khoản báo 4006 lúc 00:25 dù Lexkite/GrabCast không chạy gì).
// In tổng hợp (không in id tài khoản/khoá) + ghi GITHUB_STEP_SUMMARY.
import fs from 'fs';
import { poolAccounts } from './cf-pool.mjs';
const A = poolAccounts({ ...process.env, VIMG_POOL_SKIP: '0' }), M = '@cf/meta/llama-3.2-1b-instruct', c = { ok: 0, q4006: 0, auth: 0, other: 0 };
await Promise.all(A.map(async a => {
  try {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${a.acct}/ai/run/${M}`, { method: 'POST', headers: { Authorization: 'Bearer ' + a.tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }) });
    const j = await r.json().catch(() => ({})), e = JSON.stringify(j.errors || '');
    if (r.ok && j.success) c.ok++; else if (/4006|daily free allocation/i.test(e)) c.q4006++; else if (r.status === 401 || r.status === 403 || /10000/.test(e)) c.auth++; else c.other++;
  } catch { c.other++; }
}));
const line = `${new Date().toISOString()} · kho CF ${A.length} tài khoản: còn neuron ${c.ok} · hết neuron (4006) ${c.q4006} · lỗi quyền ${c.auth} · lỗi khác ${c.other}`;
console.log(line); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, line + '\n');
