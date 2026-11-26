// Test gate-impact: chọn PR + chọn lệnh + overlay + báo cáo (thuần, không mạng).
import { isGateFile, gateFiles, impactCmds, selectPrs, overlayOf, render, MAX_PRS, MARK, postReport, ghReq } from '../ci/gate-impact.mjs';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
ok(['scripts/test/a.mjs', 'scripts/lib/x-rules.mjs', '.github/workflows/w.yml', 'web/size-baseline.json'].every(isGateFile), 'nhận diện tệp cổng');
ok(!isGateFile('web/js/app.js') && !isGateFile('docs/a.md'), 'tệp thường không phải cổng');
ok(gateFiles(['web/a.js', 'scripts/test/a.mjs']).length === 1, 'gateFiles lọc');
const suite = 'node scripts/test/a.mjs\nnode scripts/test/ci-policy.mjs\nnode scripts/test/uses-rules.mjs\n# c\n';
let r = impactCmds(['scripts/test/a.mjs', 'web/x.js'], suite);
ok(r.cmds.length === 1 && r.cmds[0] === 'node scripts/test/a.mjs', 'tệp test → lệnh của nó');
r = impactCmds(['.github/workflows/w.yml'], suite);
ok(r.cmds.join() === 'node scripts/test/ci-policy.mjs', 'workflow → ci-policy');
r = impactCmds(['scripts/lib/x-rules.mjs'], suite, f => f.includes('uses-rules') ? "import '../lib/x-rules.mjs'" : '');
ok(r.cmds.join() === 'node scripts/test/uses-rules.mjs', 'lib rules → test nhắc tới nó');
ok(impactCmds(['web/x.js'], suite).cmds.length === 0, 'không đổi cổng → không lệnh');
const repo = 'o/r', P = (n, o = {}) => ({ number: n, state: 'open', draft: false, head: { sha: 's' + n, repo: { full_name: repo } }, ...o });
let s = selectPrs([P(5), P(1), P(2, { draft: true }), P(3, { head: { sha: 'x', repo: { full_name: 'f/r' } } }), P(9)], 9, repo);
ok(s.prs.map(p => p.pr).join() === '1,5' && s.forks === 1, 'chọn PR: bỏ nháp, fork, chính nó; sắp theo số');
s = selectPrs(Array.from({ length: 30 }, (_, i) => P(i + 1)), 99, repo);
ok(s.prs.length === MAX_PRS && s.skipped === 30 - MAX_PRS && s.prs[0].pr === 31 - MAX_PRS, 'trần số PR + báo phần vượt');
ok(overlayOf(['scripts/test/a.mjs', 'scripts/test/b.mjs', 'web/z.js'], ['scripts/test/b.mjs']).join() === 'scripts/test/a.mjs', 'overlay giữ tệp PR kia đã đổi');
const m = render([{ pr: 1, ok: true, bad: [] }, { pr: 2, ok: false, bad: [{ cmd: 'node scripts/test/a.mjs', tail: '✗ x' }] }, { pr: 3, ok: false, error: 'mạng', bad: [] }], { self: 7, cmds: ['c'], skipped: 0 });
ok(!m.ok && m.red.length === 1 && m.md.includes(MARK) && m.md.includes('#2') && m.md.includes('Không đo được') && /#3/.test(m.md), 'báo cáo: đỏ + không đo được tách riêng');
ok(render([{ pr: 1, ok: true, bad: [] }], { self: 7 }).ok, 'tất cả xanh → ok');
// postReport: comment lỗi tạm/403 không làm đỏ job (26/11, #1938); luật impact không phụ thuộc comment
{ const err = (status, retryAfter = 0) => Object.assign(new Error('GitHub ' + status), { status, retryAfter }), slept = [], sleep = async ms => { slept.push(ms); };
  const mk = (fails, existing = []) => { const calls = []; let n = 0; const api = async (p, o = {}) => { calls.push((o.method || 'GET') + ' ' + p); if (p.includes('?per_page')) return existing; if (n < fails.length) throw fails[n++]; return {}; }; return { api, calls }; };
  let r = mk([]); let o = await postReport(r.api, 7, 'md', { sleep }); ok(o.posted && r.calls.some(c => c.startsWith('POST /issues/7/comments')), 'đăng comment mới khi chưa có');
  r = mk([], [{ id: 5, body: 'x ' + MARK }]); o = await postReport(r.api, 7, 'md', { sleep }); ok(o.posted && r.calls.some(c => c === 'PATCH /issues/comments/5'), 'có comment cũ → cập nhật');
  r = mk([err(403, 20)]); slept.length = 0; o = await postReport(r.api, 7, 'md', { sleep }); ok(o.posted && slept[0] === 20000, '403 có retry-after → chờ đúng rồi đăng được');
  r = mk([err(403), err(403), err(403)]); o = await postReport(r.api, 7, 'md', { sleep }); ok(!o.posted && /403/.test(o.error), '403 mãi → không ném, trả posted:false để job chỉ cảnh báo');
  r = mk([err(404)]); slept.length = 0; o = await postReport(r.api, 7, 'md', { sleep }); ok(!o.posted && !slept.length, '404 → bỏ ngay, không chờ');
  r = mk([err(502)]); o = await postReport(r.api, 7, 'md', { sleep }); ok(o.posted, '5xx → thử lại được'); }
// ghReq: 403 hạn mức / 429 / 5xx thử lại có chờ, 403 thiếu quyền ném ngay (26/11: select đỏ cứng 3 PR vì 403)
{ const R = (st, h = {}, b = '{}') => new Response(b, { status: st, headers: h }), slept = [], sleep = async ms => { slept.push(ms); };
  let n = 0; let j = await ghReq('https://api.github.com/repos/o/r/pulls', {}, { fetcher: async () => (n++ < 2 ? R(403, { 'retry-after': '7' }) : R(200, {}, '[1]')), sleep }); ok(Array.isArray(j) && n === 3 && slept.join() === '7000,7000', '403 + retry-after → chờ 7 s hai lần rồi được');
  n = 0; let err = null; try { await ghReq('https://api.github.com/repos/o/r/pulls', {}, { fetcher: async () => { n++; return R(403, {}, 'Resource not accessible by integration'); }, sleep }); } catch (e) { err = e; } ok(err && err.status === 403 && n === 1, '403 thiếu quyền → ném ngay, không thử lại');
  n = 0; err = null; try { await ghReq('https://api.github.com/repos/o/r/pulls', {}, { fetcher: async () => { n++; return R(403, { 'x-ratelimit-remaining': '0' }); }, sleep }); } catch (e) { err = e; } ok(err && err.status === 403 && n === 3, '403 hết hạn mức mãi → thử đủ 3 lần rồi ném (có .status để select báo không xác định)');
  n = 0; j = await ghReq('https://api.github.com/repos/o/r/x', {}, { fetcher: async () => (n++ < 1 ? R(502) : R(200)), sleep }); ok(n === 2, '5xx → thử lại');
  err = null; try { await ghReq('https://api.github.com/repos/o/r/x', {}, { fetcher: async () => R(404), sleep }); } catch (e) { err = e; } ok(err && err.status === 404, '404 → ném ngay'); }
if (bad) process.exit(1);
