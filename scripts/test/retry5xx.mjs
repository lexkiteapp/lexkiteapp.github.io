#!/usr/bin/env node
// Workflow tự dispatch workflow khác phải chịu được 5xx tạm thời của GitHub (fillpub đỏ vì HTTP 500, 07/11):
// 5xx → thử lại 3 lần có backoff; 4xx → đỏ ngay; không còn chỗ nào gọi `gh workflow run` trần trong workflow.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { retry5xx, isNetErr, quota, quotaLine, quotaPct, rateWaitOf, noteQuota } from '../lib/retry5xx.mjs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗', m); } };

// 1) thư viện JS
const seq = st => { let n = 0; const waits = []; return { fn: async () => ({ status: st[Math.min(n++, st.length - 1)] }), get n() { return n; }, waits, sleep: async ms => { waits.push(ms); } }; };
let t = seq([500, 502, 204]); let r = await retry5xx(t.fn, { sleep: t.sleep });
ok(r.status === 204 && t.n === 3 && t.waits.length === 2 && t.waits[1] > t.waits[0], '5xx rồi 204: thử lại, backoff tăng');
t = seq([503]); r = await retry5xx(t.fn, { sleep: t.sleep });
ok(r.status === 503 && t.n === 3, '5xx mãi: đúng 3 lần thử rồi trả lỗi cuối');
t = seq([422]); r = await retry5xx(t.fn, { sleep: t.sleep });
ok(r.status === 422 && t.n === 1 && !t.waits.length, '4xx: không thử lại');
// lỗi mạng ném ra (10/11 cdn-mirror: "TypeError: terminated" ← SocketError other side closed) → thử lại; lỗi code → ném ngay
const sock = () => Object.assign(new TypeError('terminated'), { cause: Object.assign(new Error('other side closed'), { code: 'UND_ERR_SOCKET' }) });
let n = 0, w = []; r = await retry5xx(async () => { if (n++ < 2) throw sock(); return { status: 200 }; }, { sleep: async ms => w.push(ms), log: () => {} });
ok(r.status === 200 && n === 3 && w.length === 2, 'socket đóng giữa chừng: thử lại rồi OK');
n = 0; let thrown = null; try { await retry5xx(async () => { n++; throw new SyntaxError('Unexpected token'); }, { sleep: async () => {}, log: () => {} }); } catch (e) { thrown = e; }
ok(thrown instanceof SyntaxError && n === 1, 'lỗi không phải mạng (JSON hỏng…): ném ngay, không thử lại');
ok(isNetErr(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNRESET' } })) && !isNetErr(new Error('PUT 403')), 'isNetErr phân biệt lỗi mạng / lỗi khác');

// 1b) hạn mức GitHub API (26/11: 403 rate limit làm đỏ autopilot / merge-recheck / pr-unconflict cùng lúc)
{ const R = (status, h = {}, body = '') => new Response(body, { status, headers: h }), nw = [], sl = async ms => nw.push(ms), lg = () => {};
  ok(await rateWaitOf(R(403, { 'retry-after': '12' })) === 12, '403 + retry-after → chờ 12 s');
  ok(await rateWaitOf(R(403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 30) })) >= 30, '403 hết hạn mức → chờ tới reset');
  ok(await rateWaitOf(R(403, {}, 'Resource not accessible by integration')) === 0, '403 thiếu quyền → KHÔNG chờ');
  ok(await rateWaitOf(R(429)) > 0 && await rateWaitOf(R(404)) === 0, '429 chờ, 404 không');
  let n = 0; let r = await retry5xx(async () => (n++ < 2 ? R(403, { 'retry-after': '5' }) : R(200)), { sleep: sl, log: lg });
  ok(r.status === 200 && n === 3 && nw.join() === '5000,5000', '403 hạn mức → chờ rồi gọi lại tới khi được');
  n = 0; r = await retry5xx(async () => { n++; return R(403, { 'retry-after': '500' }); }, { sleep: sl, log: lg, rlBudget: 60e3 });
  ok(r.status === 403 && n === 1, 'phải chờ > ngân sách → trả 403 ngay, không treo job');
  n = 0; r = await retry5xx(async () => { n++; return R(403, {}, 'Resource not accessible'); }, { sleep: sl, log: lg });
  ok(r.status === 403 && n === 1, '403 thiếu quyền → trả ngay, không thử lại');
  quota.calls = 0; quota.limited = 0; quota.firstRemaining = null; quota.remaining = null; quota.limit = null;
  noteQuota(R(200, { 'x-ratelimit-remaining': '800', 'x-ratelimit-limit': '1000' })); noteQuota(R(200, { 'x-ratelimit-remaining': '150', 'x-ratelimit-limit': '1000', 'x-ratelimit-resource': 'core' }));
  ok(quota.calls === 2 && quotaPct() === 0.15 && /trừ 651 hạn mức.*còn 150\/1000 = 15 %/.test(quotaLine('t')), 'quota: đếm lượt, trừ bao nhiêu, còn % (dưới 20 % → cảnh báo)'); }

// 2) bản shell
const sh = (script, env = {}) => { const d = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'ghr-')); const c = path.join(d, 'c'), f = path.join(d, 'cmd.sh');
  fs.writeFileSync(f, script.replaceAll('$CNT', c)); return { r: spawnSync('bash', ['scripts/ci/gh-retry.sh', 'bash', f], { env: { ...process.env, GH_RETRY_SLEEPS: '0 0', ...env }, encoding: 'utf8' }), count: () => fs.existsSync(c) ? fs.readFileSync(c, 'utf8').length : 0 }; };
let x = sh('echo x >> $CNT; [ $(wc -c < $CNT) -ge 3 ] && exit 0; echo "HTTP 500: Server Error" >&2; exit 1');
ok(x.r.status === 0 && x.count() === 4, `shell: 500 hai lần rồi OK (${x.count()} lượt gọi)`);   // "x\n" = 2 byte/lượt → 2 lượt? xem dưới
x = sh('echo y >> $CNT; echo "HTTP 500: Server Error" >&2; exit 1');
ok(x.r.status !== 0 && x.count() === 6, `shell: 5xx mãi → 3 lượt rồi đỏ (${x.count()} byte)`);
x = sh('echo y >> $CNT; echo "HTTP 422: Validation Failed" >&2; exit 1');
ok(x.r.status !== 0 && x.count() === 2, `shell: 4xx → 1 lượt, đỏ ngay (${x.count()} byte)`);
x = sh('echo y >> $CNT; [ $(wc -c < $CNT) -ge 4 ] && exit 0; echo "curl: (56) Recv failure: Connection reset by peer" >&2; exit 56');
ok(x.r.status === 0 && x.count() === 4, `shell: lỗi mạng curl 56 → thử lại rồi OK (${x.count()} byte)`);

// 3) không còn `gh workflow run` trần trong workflow (trừ comment)
const WF = '.github/workflows', naked = [];
for (const f of fs.readdirSync(WF).filter(f => /\.ya?ml$/.test(f))) fs.readFileSync(path.join(WF, f), 'utf8').split('\n').forEach((l, i) => {
  if (/^\s*#/.test(l)) return;
  if (/(^|[^\w./-])gh workflow run\b/.test(l.replace(/gh-retry\.sh gh workflow run/g, ''))) naked.push(`${f}:${i + 1}`);
  if (/\/dispatches\b/.test(l) && /curl/.test(l) && !/gh-retry\.sh/.test(l)) naked.push(`${f}:${i + 1} (curl)`);
});
ok(!naked.length, 'gọi dispatch trần, thiếu gh-retry.sh: ' + naked.join(', '));
// 4) vòng thăm dò `for …; do x=$(curl …)` dưới bash -e: curl lỗi mạng (mã 56) làm đỏ cả bước (09/11 vocab-img-scene) → phải `|| true`
// 1c) script CI chạy từ cây repo gọi api.github.com phải qua ghFetch/retry5xx (chờ hạn mức + đếm quota); cheap/gate-retest/gate-impact chạy BẢN CHÉP LẺ từ main nên không import lib (giữ fetch trần)
for (const f of ['guards', 'main-red-retry', 'cheap-revert', 'heavy-rerun']) ok(!/await fetch\(`https:\/\/api\.github\.com/.test(fs.readFileSync(`scripts/ci/${f}.mjs`, 'utf8')) && /ghFetch|retry5xx/.test(fs.readFileSync(`scripts/ci/${f}.mjs`, 'utf8')), `${f}.mjs gọi API qua ghFetch/retry5xx`);

const polls = [];
for (const f of fs.readdirSync(WF).filter(f => /\.ya?ml$/.test(f))) fs.readFileSync(path.join(WF, f), 'utf8').split('\n').forEach((l, i) => {
  const m = !/^\s*#/.test(l) && /\bfor\b[^\n]*\bdo\b[^\n]*\b\w+=\$\(curl\b([^()]|\([^()]*\))*\)/.exec(l);
  if (m && !/\|\|\s*(true|echo|:)|\|\s*\w/.test(m[0])) polls.push(`${f}:${i + 1}`);
});
ok(!polls.length, 'vòng thăm dò curl thiếu `|| true` (bash -e làm đỏ cả bước khi mạng chập chờn): ' + polls.join(', '));
if (bad) process.exit(1); console.log('✓ retry5xx: dispatch workflow thử lại 5xx 3 lần, 4xx đỏ ngay, không còn gọi trần');
