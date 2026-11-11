// R2 (docs/specs/admin-audit.md): GitHub API của trang Quản trị – token phía server, lỗi rõ ràng, không bao giờ "0 tác vụ" giả,
// không đệm kết quả lỗi. Chạy: node scripts/test/admin-gh.mjs
import assert from 'node:assert/strict';
import { ghApi, OPS } from '../../functions/api/admin.js';

let fails = 0;
const t = async (name, fn) => { try { await fn(); console.log('✓', name); } catch (e) { fails++; console.error('✗', name, '\n ', e.message); } };
const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

// Cache API giả (giống caches.default của Cloudflare) – đếm put để chứng minh lỗi không bị đệm
const store = new Map(); let puts = [];
globalThis.caches = { default: {
  async match(req) { const v = store.get(req.url); return v ? new Response(v) : undefined; },
  async put(req, r) { puts.push(req.url); store.set(req.url, await r.text()); },
} };
const reset = () => { store.clear(); puts = []; };
const realFetch = globalThis.fetch;
const withFetch = (fn) => { const calls = []; globalThis.fetch = async (u, o) => { calls.push({ u: String(u), h: (o && o.headers) || {} }); return fn(String(u)); }; return calls; };

// D1 giả, chịu mọi câu hỏi alerts/usage hỏi (trả rỗng) – chỉ kiểm phần GitHub
const DB = { prepare: () => { const st = { bind: () => st, first: async () => null, all: async () => ({ results: [] }), run: async () => ({ meta: {} }) }; return st; }, batch: async () => [] };

await t('ghApi gửi Bearer khi có GH_DISPATCH_TOKEN', async () => {
  const calls = []; await ghApi({ GH_DISPATCH_TOKEN: 'tokA' }, 'actions/runs', async (u, o) => { calls.push(o.headers); return res(200, { ok: 1 }); });
  assert.equal(calls[0].Authorization, 'Bearer tokA');
  assert.equal(calls[0]['User-Agent'], 'lexkite-admin');
});
await t('ghApi dùng GH_ISSUES_TOKEN khi thiếu GH_DISPATCH_TOKEN', async () => {
  const calls = []; await ghApi({ GH_ISSUES_TOKEN: 'tokB' }, 'x', async (u, o) => { calls.push(o.headers); return res(200, {}); });
  assert.equal(calls[0].Authorization, 'Bearer tokB');
});
await t('ghApi không token → không gửi Authorization (vẫn chạy được)', async () => {
  const calls = []; const j = await ghApi({}, 'x', async (u, o) => { calls.push({ u, h: o.headers }); return res(200, { a: 1 }); });
  assert.equal(calls[0].h.Authorization, undefined);
  assert.match(calls[0].u, /^https:\/\/api\.github\.com\/repos\/lexkiteapp\/lexkiteapp\.github\.io\/x$/);
  assert.deepEqual(j, { a: 1 });
});
for (const st of [403, 429, 500]) await t(`ghApi HTTP ${st} → ném lỗi (không trả JSON rỗng)`, async () => {
  await assert.rejects(ghApi({ GH_DISPATCH_TOKEN: 't' }, 'x', async () => res(st, { message: 'API rate limit exceeded' })), new RegExp('GitHub HTTP ' + st));
});

await t('alerts: GitHub 403 → một hàng "không đọc được", không có workflow giả, không đệm', async () => {
  reset(); withFetch(() => res(403, { message: 'rate limit' }));
  const { rows } = await OPS.alerts(DB, {}, {}, {});
  const wf = rows.filter(r => r.kind === 'workflow');
  assert.equal(wf.length, 1, 'chỉ một hàng workflow');
  assert.equal(wf[0].ok, false); assert.equal(wf[0].unreadable, true);
  assert.match(wf[0].conclusion, /không đọc được/); assert.match(wf[0].conclusion, /403/);
  assert.ok(!puts.some(u => /alerts-gh/.test(u)), 'lỗi không được đệm');
  const en = (await OPS.alerts(DB, { ui: 'en' }, {}, {})).rows.find(r => r.kind === 'workflow');
  assert.match(en.conclusion, /unreadable/);
});
await t('alerts: đọc được → mỗi workflow một hàng (mới nhất), có token, đệm 60 s rồi dùng lại', async () => {
  reset();
  const calls = withFetch(() => res(200, { workflow_runs: [
    { name: 'CI', status: 'completed', conclusion: 'failure', updated_at: '2026-11-05T01:00:00Z', html_url: 'u1' },
    { name: 'CI', status: 'completed', conclusion: 'success', updated_at: '2026-11-04T01:00:00Z', html_url: 'u0' },
    { name: 'Deploy', status: 'in_progress', conclusion: null, updated_at: '2026-11-05T02:00:00Z', html_url: 'u2' },
  ] }));
  const env = { GH_DISPATCH_TOKEN: 'tokC' };
  const wf = (await OPS.alerts(DB, {}, {}, env)).rows.filter(r => r.kind === 'workflow');
  assert.deepEqual(wf.map(r => [r.name, r.ok]), [['CI', false], ['Deploy', true]]);
  assert.equal(calls[0].h.Authorization, 'Bearer tokC');
  assert.ok(puts.some(u => /\/alerts-gh$/.test(u)), 'kết quả tốt được đệm');
  const n = calls.length; await OPS.alerts(DB, {}, {}, env);
  assert.equal(calls.length, n, 'lần 2 trong 60 s không gọi GitHub nữa');
});
await t('quality: GitHub lỗi → ném ra, KHÔNG đệm (lần sau gọi lại được)', async () => {
  reset(); const calls = withFetch(() => res(403, {}));
  await assert.rejects(OPS.quality(DB, {}, {}, {}), /GitHub HTTP 403/);
  assert.equal(puts.length, 0, 'không đệm kết quả lỗi');
  await assert.rejects(OPS.quality(DB, {}, {}, {}), /GitHub HTTP 403/);
  assert.equal(calls.length, 2, 'lần 2 vẫn hỏi GitHub (không dính bản rỗng 10 phút)');
});
await t('quality: đọc được → điểm theo các bước kiểm, có đệm', async () => {
  reset(); withFetch(u => /\/jobs$/.test(u)
    ? res(200, { jobs: [{ steps: [{ name: 'Kiểm thử', conclusion: 'success' }, { name: 'Bản live', conclusion: 'failure' }, { name: 'Set up job', conclusion: 'success' }] }] })
    : res(200, { workflow_runs: [{ id: 7, status: 'completed', conclusion: 'failure', updated_at: '2026-11-05T00:00:00Z', html_url: 'h' }, { id: 6, status: 'in_progress' }] }));
  const q = await OPS.quality(DB, {}, {}, { GH_DISPATCH_TOKEN: 't' });
  assert.equal(q.score, 50); assert.equal(q.checks.length, 2); assert.equal(q.history.length, 1);
  assert.ok(puts.some(u => /quality-v2$/.test(u)));
});

globalThis.fetch = realFetch;
if (fails) { console.error(`admin-gh: ${fails} lỗi`); process.exit(1); }
console.log('admin-gh: OK');
