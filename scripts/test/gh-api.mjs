// scripts/ci/gh-api.mjs: ETag 304 (không tính hạn mức), poll ≥ 5 phút, hạn mức thấp → chờ reset, 403/429 hạn mức ≠ lỗi/PR đóng. Chạy: node scripts/test/gh-api.mjs
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
process.env.GH_API_CACHE = fs.mkdtempSync(path.join(os.tmpdir(), 'ghapi-')); process.env.GITHUB_TOKEN = 'test';
const { ghApi, isRateLimited, waitSeconds, MIN_POLL } = await import('../ci/gh-api.mjs');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const res = (status, body, h = {}) => ({ status, ok: status < 300, headers: new Map(Object.entries(h)), text: async () => (body == null ? '' : JSON.stringify(body)) });
let t = 1_800_000_000_000; const now = () => t, slept = [], sleep = async ms => { slept.push(ms); t += ms; };
ok(isRateLimited(429) && isRateLimited(403, { 'x-ratelimit-remaining': '0' }) && isRateLimited(403, {}, 'You have exceeded a secondary rate limit'), 'nhận 429 / 403 hạn mức');
ok(!isRateLimited(403, { 'x-ratelimit-remaining': '4000' }, 'Resource not accessible by integration') && !isRateLimited(404), '403 quyền / 404 không phải hạn mức');
ok(waitSeconds({ 'x-ratelimit-remaining': '120', 'x-ratelimit-reset': String(t / 1000 + 600) }, { now: t }) === 602, 'còn < 500 → chờ tới reset');
ok(waitSeconds({ 'x-ratelimit-remaining': '4000', 'x-ratelimit-reset': String(t / 1000 + 600) }, { now: t }) === 0, 'còn nhiều → không chờ');
ok(MIN_POLL >= 300, 'khoảng poll tối thiểu ≥ 300 s');
// ETag: lần 2 gửi If-None-Match, 304 → trả bản đệm
const seen = []; let n = 0;
const f1 = async (u, o) => { seen.push(o.headers['If-None-Match']); n++; return n === 1 ? res(200, { state: 'open' }, { etag: '"abc"', 'x-ratelimit-remaining': '4000' }) : res(304, null, { 'x-ratelimit-remaining': '4000' }); };
let r = await ghApi('GET', '/repos/x/y/pulls/1', { fetcher: f1, now, sleep });
ok(r.status === 200 && r.body.state === 'open' && !r.cached, 'lần đầu 200');
r = await ghApi('GET', '/repos/x/y/pulls/1', { fetcher: f1, now, sleep });
ok(r.cached && r.body.state === 'open' && seen[1] === '"abc"', '304 có If-None-Match → bản đệm');
// poll: < 5 phút → không gọi mạng
const before = n; t += 60e3; r = await ghApi('GET', '/repos/x/y/pulls/1', { fetcher: f1, now, sleep, poll: true });
ok(n === before && r.cached, '--poll < 5 phút: không gọi mạng');
t += 301e3; await ghApi('GET', '/repos/x/y/pulls/1', { fetcher: f1, now, sleep, poll: true }); ok(n === before + 1, '--poll ≥ 5 phút: gọi lại (304)');
// 403 hạn mức: có bản đệm → trả đệm đánh dấu rateLimited, KHÔNG coi là đóng/lỗi
const f2 = async () => res(403, { message: 'API rate limit exceeded' }, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(t / 1000 + 900) });
r = await ghApi('GET', '/repos/x/y/pulls/1', { fetcher: f2, now, sleep });
ok(r.rateLimited && r.cached && r.body.state === 'open', '403 hạn mức + có đệm → bản đệm, cờ rateLimited');
// không đệm: ngủ tới reset rồi thử lại; vẫn chặn → status 0 + rateLimited (CLI thoát 75)
slept.length = 0; r = await ghApi('GET', '/repos/x/y/pulls/2', { fetcher: f2, now, sleep, tries: 2 });
ok(r.status === 0 && r.rateLimited && slept.length >= 1 && slept[0] >= 900e3, 'không đệm: ngủ tới reset, hết lượt → rateLimited (không body giả)');
fs.rmSync(process.env.GH_API_CACHE, { recursive: true, force: true });
console.log(fails ? `✗ gh-api: ${fails} lỗi` : '✓ gh-api: ETag/304, poll ≥ 5 phút, chờ reset, 403/429 hạn mức ≠ lỗi');
if (fails) process.exit(1);   // không exit(0): được ci-filler.mjs import nối chuỗi (không sửa dòng test dài của package.json)
