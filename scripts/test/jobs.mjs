// Điều phối việc nền (functions/api/_jobs.js): thuê tài nguyên độc quyền, không chạy song song, ngân sách theo ưu tiên, nhật ký bỏ qua/chạy, timeline.
import { DatabaseSync } from 'node:sqlite';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const J = await import(new URL('../../functions/api/_jobs.js', import.meta.url)), G = await import(new URL('../../functions/api/_d1guard.js', import.meta.url));
const sql = new DatabaseSync(':memory:');
const DB = { prepare(q) { const st = { args: [], bind(...a) { return { ...st, args: a }; }, async run() { sql.prepare(q).run(...this.args); return {}; }, async all() { return { results: sql.prepare(q).all(...this.args) }; }, async first() { return sql.prepare(q).get(...this.args) || null; } }; return st; }, async batch(l) { for (const x of l) await x.run(); } };
await J.setupJobs(DB, 't');
const ENV = {}, T0 = Date.UTC(2026, 9, 24, 1, 45);
// 1) nhận thuê, việc khác dùng cùng tài nguyên độc quyền bị bỏ qua (không chạy song song)
let r = await J.acquire(ENV, DB, { job: 'footage-archive', run: 'r1' }, T0); ok(r.ok && r.leased.includes('drive_pool') && r.leased.includes('d1_internal'), 'footage-archive thuê drive_pool + d1_internal');
r = await J.acquire(ENV, DB, { job: 'drive-shorts', run: 'r2' }, T0 + 60e3); ok(!r.ok && r.skip && /footage-archive/.test(r.reason), 'drive-shorts bị bỏ qua vì footage-archive đang giữ: ' + r.reason);
r = await J.acquire(ENV, DB, { job: 'health', run: 'r3' }, T0 + 60e3); ok(r.ok && r.leased.length === 0, 'health (không tài nguyên độc quyền) chạy song song được');
// 2) trả thuê → việc kế nhận được; nhật ký
r = await J.release(ENV, DB, { job: 'footage-archive', run: 'r1', status: 'success', reads: 1234 }, T0 + 3600e3); ok(r.ok, 'release');
r = await J.acquire(ENV, DB, { job: 'drive-shorts', run: 'r4' }, T0 + 3601e3); ok(r.ok, 'sau khi trả thuê, drive-shorts nhận được');
await J.release(ENV, DB, { job: 'drive-shorts', run: 'r4', status: 'failure', reason: 'x' }, T0 + 3700e3);
// 3) thuê hết hạn tự giải phóng (ttl = phút × 1,5)
r = await J.acquire(ENV, DB, { job: 'footage-archive', run: 'r5' }, T0 + 7200e3); ok(r.ok, 'archive thuê lại');
r = await J.acquire(ENV, DB, { job: 'footage-verify', run: 'r6' }, T0 + 7200e3 + 150 * 1.5 * 60e3 + 1000); ok(r.ok, 'thuê quá hạn → việc khác lấy được');
// 4) ngân sách: D1 (tài khoản 1) đã dùng 55 % → 'archive' (trần 50 %) bỏ qua, 'publishing' (70 %) vẫn chạy
G.resetD1Cache();
const ENVB = { CF_ANALYTICS_TOKEN: 't', CF_ACCOUNT_ID: 'e34e14b7ab35eaf2b3d9d84fcce011f7' }, f0 = globalThis.fetch;
globalThis.fetch = async () => ({ json: async () => ({ data: { viewer: { accounts: [{ d1AnalyticsAdaptiveGroups: [{ sum: { rowsRead: 2750000, rowsWritten: 10 } }] }] } } }) });
await J.release(ENV, DB, { job: 'footage-verify', run: 'r6', status: 'success' }, T0 + 8e6);
r = await J.acquire(ENVB, DB, { job: 'drive-shorts', run: 'r7' }, T0 + 9e6); ok(!r.ok && /55%/.test(r.reason), 'drive-shorts (archive, trần 50 %) bỏ qua khi D1 55 % (chưa tách tài khoản): ' + r.reason);
r = await J.acquire(ENVB, DB, { job: 'youtube-manual', run: 'r8' }, T0 + 9.2e6); ok(r.ok, 'youtube-manual (publishing, trần 70 %) vẫn chạy ở 55 %');
r = await J.acquire(ENVB, DB, { job: 'storage-watch', run: 'r9' }, T0 + 9.3e6); ok(r.ok, 'storage-watch không dùng D1 → không bị chặn bởi ngân sách');
globalThis.fetch = async () => ({ json: async () => ({ data: { viewer: { accounts: [{ d1AnalyticsAdaptiveGroups: [{ sum: { rowsRead: 2250000, rowsWritten: 10 } }] }] } } }) }); G.resetD1Cache();
// 5) tách tài khoản: có D1B → việc d1_internal đo tài khoản 2, d1_main_read đo tài khoản 1
G.resetD1Cache();
let call = 0; globalThis.fetch = async (u, init) => { call++; const acct = JSON.parse(init.body).query.match(/accountTag:"([a-f0-9]+)"/)[1]; return { json: async () => ({ data: { viewer: { accounts: [{ d1AnalyticsAdaptiveGroups: [{ sum: { rowsRead: acct === 'f5641879aaaa' ? 3000000 : 100, rowsWritten: 1 } }] }] } } }) }; };
const ENV2 = { CF_ANALYTICS_TOKEN: 't', CF_ACCOUNT_ID: 'e34e14b7ab35eaf2b3d9d84fcce011f7', D1B: '1', D1B_ACCOUNT_ID: 'f5641879aaaa', D1B_TOKEN: 'tb' };
r = await J.acquire(ENV2, DB, { job: 'footage-archive', run: 'r10' }, T0 + 20e6); ok(!r.ok && /nội bộ/.test(r.reason) && /60%/.test(r.reason), 'tài khoản 2 ở 60 % → footage-archive (d1_internal) bỏ qua, nêu rõ "nội bộ": ' + r.reason);
r = await J.acquire(ENV2, DB, { job: 'youtube-manual', run: 'r11' }, T0 + 20e6); ok(r.ok, 'youtube-manual chỉ đo D1 chính (100 dòng) → chạy');
globalThis.fetch = f0;
// 6) timeline + job lạ
const tl = await J.timeline(ENV, DB, { day: '2026-10-24' }, T0 + 30e6);
ok(tl.runs.some(x => x.job === 'drive-shorts' && x.status === 'skipped' && /footage-archive/.test(x.reason)) && tl.runs.some(x => x.job === 'footage-archive' && x.status === 'ok' && x.reads === 1234), 'timeline: có dòng bỏ qua (lý do) và dòng đã chạy (số dòng đọc)');
ok(tl.jobs.length >= 25 && tl.jobs.every(j => j.cron.length && j.priority), 'timeline kèm sổ việc');
ok((await J.acquire(ENV, DB, { job: 'khong-co', run: 'x' })).status === 400, 'job lạ → 400');
// 8) gốc rễ 23/10: điều phối hỏng (D1 hết hạn mức → trước đây 500 mơ hồ) → 503 rõ ràng; việc nặng FAIL-CLOSED; đặt chỗ neuron Workers AI chính = 0
{
  const { createHmac, createHash } = await import('node:crypto');
  const mod = await import(new URL('../../functions/api/jobs.js', import.meta.url)), L = await import(new URL('../jobs/lease.mjs', import.meta.url));
  const KEY = 'k'.repeat(40), body = JSON.stringify({ op: 'acquire', job: 'storage-watch', run: 'x1' }), ts = Math.floor(Date.now() / 1000);
  const sig = createHmac('sha256', KEY).update(ts + '.' + createHash('sha256').update(body).digest('hex')).digest('hex');
  const brokenDb = { prepare() { throw new Error('D1_ERROR: Your account has exceeded D1 free tier daily row read limit [code: 7500]'); }, async batch() { throw new Error('7500 exceeded'); } };
  const res = await mod.onRequestPost({ request: new Request('https://lexkite.com/api/jobs', { method: 'POST', headers: { 'X-Drive-Ts': String(ts), 'X-Drive-Sig': sig, 'CF-Connecting-IP': '1.2.3.4' }, body }), env: { DB: brokenDb, LEXKITE_DRIVE_CLI_KEY: KEY } });
  const jb = await res.json(); ok(res.status === 503 && jb.error === 'coordinator-unavailable' && jb.cause === 'd1-quota', 'D1 hết hạn mức → /api/jobs trả 503 coordinator-unavailable (không phải 500 mơ hồ): ' + res.status + ' ' + JSON.stringify(jb));
  // fail-closed phía máy khách
  ok(L.failClosed('script-bank') && L.failClosed('footage-archive') && L.failClosed('news-auto') && L.failClosed('khong-co-trong-so'), 'việc dùng Workers AI/Drive/D1 và việc lạ → fail-closed');
  ok(!L.failClosed('storage-watch') && !L.failClosed('blog-publish'), 'việc tầm thường (chỉ phút GitHub) → fail-open');
  ok(!L.failClosed('lexicon-expand') && L.failClosed('x', { jobs: [{ id: 'x', resources: ['cf_pool', 'gemini'] }] }), 'kho CF_POOL dùng chung tự giới hạn (4006) → fail-open; kèm tài nguyên độc quyền → fail-closed');
  ok(L.decide(503, jb, true).skip === 1 && L.decide(0, { error: 'network' }, true).skip === 1 && L.decide(500, {}, true).skip === 1, 'việc nặng + điều phối 503/mạng/500 → KHÔNG chạy');
  ok(L.decide(503, jb, false).skip === 0 && L.decide(200, { ok: true }, true).skip === 0 && L.decide(200, { skip: true, reason: 'x' }, false).skip === 1 && L.decide(429, {}, false).skip === 1, 'việc tầm thường chạy khi điều phối hỏng; thuê được → chạy; bị từ chối/429 → bỏ qua');
  // đặt chỗ neuron: mặc định 0, cấp riêng theo việc
  const rr = await J.acquire({}, DB, { job: 'script-bank', run: 'g1' }, T0 + 40e6); ok(rr.ok && rr.grants.workers_ai === undefined && rr.grants.workers_ai_b === 2000, 'script-bank: không có phần cấp neuron CHÍNH (đặt chỗ cho người dùng), được 2000 neuron tài khoản 2');
  await J.release({}, DB, { job: 'script-bank', run: 'g1', status: 'success' }, T0 + 40.1e6);
  const REGM = (await import(new URL('../../functions/api/_jobs_reg.js', import.meta.url))).REG; REGM.reservations.workers_ai_b.grants['script-bank'] = 750;
  const r2 = await J.acquire({}, DB, { job: 'script-bank', run: 'g2' }, T0 + 41e6); ok(r2.ok && r2.grants.workers_ai_b === 750, 'cấp riêng grants → 750 neuron'); REGM.reservations.workers_ai_b.grants['script-bank'] = 2000;
  await J.release({}, DB, { job: 'script-bank', run: 'g2', status: 'success' }, T0 + 41.1e6);
  const VJ = REGM.jobs.find(j => j.id === 'vocab-img'); ok(VJ && !VJ.paused && !VJ.resources.some(r => /^workers_ai/.test(r)), 'vocab-img đang chạy, chỉ GrabCast + phút GitHub (không Workers AI Lexkite)');
  { const ra = await J.acquire({}, DB, { job: 'vocab-img', run: 'g2b' }, T0 + 41.5e6); ok(ra.ok && ra.grants.workers_ai === undefined && ra.grants.workers_ai_b === undefined, 'vocab-img: không neuron Workers AI nào được cấp'); if (ra.ok) await J.release({}, DB, { job: 'vocab-img', run: 'g2b', status: 'success' }, T0 + 41.6e6); }
  VJ.paused = true;   // đường tạm dừng (chủ có thể dừng lại bất cứ lúc nào)
  const rv = await J.acquire({}, DB, { job: 'vocab-img', run: 'g3' }, T0 + 42e6); ok(!rv.ok && /paused/.test(rv.reason), 'vocab-img paused: không --force thì bỏ qua');
  const rf = await J.acquire({}, DB, { job: 'vocab-img', run: 'g4', force: true }, T0 + 42e6); ok((rf.ok && rf.grants.workers_ai === undefined && rf.grants.workers_ai_b === undefined) || (!rf.ok), 'vocab-img --force: không neuron Workers AI nào (chính lẫn tài khoản 2)'); if (rf.ok) await J.release({}, DB, { job: 'vocab-img', run: 'g4', status: 'success' }, T0 + 42.1e6);
  // đường nền (CI) không dùng binding Workers AI của tài khoản chính khi nền = 0 neuron; DB và các biến khác giữ nguyên
  { const AIB = { run() { return 1; } }, e0 = { AI: AIB, DB: 'db', X: 'x' }, e1 = G.stripBackgroundAI(e0);
    ok(e1.AI === null && e1.DB === 'db' && e1.X === 'x' && e0.AI === AIB, 'stripBackgroundAI: env.AI = null cho đường nền, DB/biến khác giữ nguyên, env gốc không đổi');
    const R0 = (await import(new URL('../../functions/api/_jobs_reg.js', import.meta.url))).REG.reservations.workers_ai; R0.background_neurons = 500;
    ok(G.stripBackgroundAI(e0).AI === AIB, 'sổ cấp background_neurons > 0 → giữ binding'); R0.background_neurons = 0; }
  // skip() chịu được DB hỏng (vẫn trả lý do)
  const rb = await J.acquire({}, brokenDb, { job: 'vocab-img', run: 'g5' }, T0 + 43e6); ok(rb.skip === true, 'DB hỏng + paused → vẫn trả skip (không ném lỗi)'); VJ.paused = false;
}
// 7) sổ: footage-archive trước d1b-migrate; mọi việc d1_internal đều có lease
const reg = (await import(new URL('../../functions/api/_jobs_reg.js', import.meta.url))).REG;
ok(reg.jobs.filter(j => j.resources.includes('d1_internal')).every(j => j.lease), 'mọi việc dùng d1_internal đều thuê (lease)');
// 9) điều phối nằm ở D1 NỘI BỘ (tài khoản 2): D1 chính ném 7500 mà /api/jobs vẫn cấp/trả thuê; nội bộ hỏng + chính hỏng → 503; timeline suy giảm đọc từ D1 chính
{
  const { createHmac, createHash } = await import('node:crypto'), { DatabaseSync: DS } = await import('node:sqlite');
  const mod = await import(new URL('../../functions/api/jobs.js', import.meta.url)), Q = await import(new URL('../../functions/api/quota.js', import.meta.url)), GG = await import(new URL('../../functions/api/_d1guard.js', import.meta.url));
  const KEY = 'k'.repeat(40), sqlB = new DS(':memory:'), base = globalThis.fetch; let down = false, rest = 0;
  globalThis.fetch = async (url, init = {}) => {
    if (/^https:\/\/api\.cloudflare\.com\/client\/v4\/accounts\/ACCT2\/d1\/database\/[^/]+\/query$/.test(String(url))) {
      rest++; if (down) throw new Error('network down');
      const body = JSON.parse(init.body), one1 = st => { const q = sqlB.prepare(st.sql); if (/^\s*(select|with|pragma)/i.test(st.sql)) return { results: q.all(...(st.params || [])), meta: { rows_read: 1 }, success: true }; const r = q.run(...(st.params || [])); return { results: [], meta: { changes: r.changes }, success: true }; };
      return new Response(JSON.stringify({ success: true, result: body.batch ? body.batch.map(one1) : [one1(body)] }), { status: 200 });
    }
    return base(url, init);
  };
  const broken = { prepare() { throw new Error('D1_ERROR: exceeded row read limit [code: 7500]'); }, async batch() { throw new Error('7500'); } };
  const ENVI = { DB: broken, LEXKITE_DRIVE_CLI_KEY: KEY, D1B_ACCOUNT_ID: 'ACCT2', D1B_TOKEN: 'tok-b' };
  const post = async (env, obj, ip = '9.9.9.9') => { const body = JSON.stringify(obj), ts = Math.floor(Date.now() / 1000), sig = createHmac('sha256', KEY).update(ts + '.' + createHash('sha256').update(body).digest('hex')).digest('hex'); const r = await mod.onRequestPost({ request: new Request('https://lexkite.com/api/jobs', { method: 'POST', headers: { 'X-Drive-Ts': String(ts), 'X-Drive-Sig': sig, 'CF-Connecting-IP': ip }, body }), env }); return { s: r.status, j: await r.json() }; };
  let r = await post(ENVI, { op: 'acquire', job: 'footage-archive', run: 'c1' }); ok(r.s === 200 && r.j.ok && r.j.leased.includes('drive_pool'), 'D1 chính ném 7500, D1 nội bộ ổn → acquire vẫn cấp thuê: ' + r.s + JSON.stringify(r.j).slice(0, 120));
  r = await post(ENVI, { op: 'acquire', job: 'drive-shorts', run: 'c2' }); ok(r.s === 200 && r.j.skip && /footage-archive/.test(r.j.reason), 'thuê vẫn loại trừ nhau khi D1 chính chết');
  r = await post(ENVI, { op: 'release', job: 'footage-archive', run: 'c1', status: 'success' }); ok(r.s === 200 && r.j.ok, 'release ghi vào D1 nội bộ');
  ok(sqlB.prepare('SELECT COUNT(*) AS n FROM job_runs').get().n >= 2 && rest > 0, 'job_runs/job_leases nằm ở D1 nội bộ (' + rest + ' lượt REST)');
  down = true; r = await post(ENVI, { op: 'acquire', job: 'footage-archive', run: 'c3' }, '8.8.8.8'); ok(r.s === 503 && r.j.error === 'coordinator-unavailable', 'D1 nội bộ cũng hỏng → 503 (máy khách fail-closed)');
  // timeline suy giảm: nội bộ không với tới → đọc lịch sử từ D1 chính (còn sống)
  const mainOk = new DS(':memory:'); const MDB = { prepare(q) { const st = { a: [], bind(...x) { return { ...st, a: x }; }, async all() { return { results: mainOk.prepare(q).all(...this.a) }; }, async first() { return mainOk.prepare(q).get(...this.a) || null; }, async run() { mainOk.prepare(q).run(...this.a); return {}; } }; return st; }, async batch(l) { for (const x of l) await x.run(); } };
  await J.setupJobs(MDB, 'm'); mainOk.prepare("INSERT INTO job_runs (job, run, day, started, status) VALUES ('health','old','2026-10-24',1,'ok')").run();
  const tl = await Q.onRequestPost ? null : null; // quota.js cần phiên admin; kiểm trực tiếp nhánh suy giảm qua OPS không xuất khẩu → kiểm bằng timeline() trên D1 chính
  const t2 = await J.timeline({}, MDB, { day: '2026-10-24' }, Date.parse('2026-10-24T12:00:00Z')); ok(t2.runs.some(x => x.job === 'health'), 'timeline đọc được từ D1 chính (nhánh suy giảm)');
  // Workers AI nền → tài khoản 2 qua REST (không dùng binding chính)
  const calls = []; const fakeF = async (u, init) => { calls.push({ u: String(u), a: init.headers.Authorization, b: JSON.parse(init.body) }); return { ok: true, status: 200, json: async () => ({ success: true, result: { response: 'ok-b' } }) }; };
  const ebg = GG.stripBackgroundAI({ AI: { run() { throw new Error('KHÔNG được gọi AI chính'); } }, DB: 'd', D1B_ACCOUNT_ID: 'ACCT2', D1B_TOKEN: 'tok-b' }, fakeF);
  const out = await ebg.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', { messages: [] }); ok(out.response === 'ok-b' && /\/accounts\/ACCT2\/ai\/run\/@cf\/meta\/llama/.test(calls[0].u) && calls[0].a === 'Bearer tok-b' && ebg.DB === 'd', 'đường nền gọi Workers AI của tài khoản 2 qua REST (token đúng, không đụng binding chính)');
  ok(GG.stripBackgroundAI({ AI: {}, DB: 'd' }, fakeF).AI === null, 'chưa cấu hình tài khoản 2 → AI nền = null (rơi sang Gemini/GrabCast)');
  const regB = (await import(new URL('../../functions/api/_jobs_reg.js', import.meta.url))).REG.reservations.workers_ai_b;
  ok(regB.grants['news-auto'] === 3000 && Object.values(regB.grants).reduce((a, b) => a + b, 0) <= regB.daily_neurons - regB.safety_margin, 'phần cấp tài khoản 2: news-auto 3000, tổng ≤ 10.000 − biên an toàn');
  const g = await J.acquire({}, DB, { job: 'news-auto', run: 'ai1' }, T0 + 60e6); ok(g.ok && g.grants.workers_ai_b === 3000, 'acquire news-auto trả grants.workers_ai_b = 3000'); if (g.ok) await J.release({}, DB, { job: 'news-auto', run: 'ai1', status: 'success' }, T0 + 60.1e6);
  globalThis.fetch = base;
}
if (fails) { console.log(`✗ jobs: ${fails}/${n} kiểm thất bại`); process.exit(1); }
console.log(`✓ jobs: ${n} kiểm (thuê độc quyền, không song song, hết hạn, ngân sách theo ưu tiên/tài khoản, nhật ký, timeline)`);
