#!/usr/bin/env node
// Gọi GitHub API dùng chung cho MỌI phiên/watcher (2/11: hạn mức 5.000/giờ của token chung CẠN lúc 07:38Z vì nhiều phiên poll curl trần).
//   node scripts/ci/gh-api.mjs [GET|POST|PATCH|PUT|DELETE] /repos/o/r/pulls/433 [--data '{json}'] [--poll] [--repo]
//   - GET có ETag/If-None-Match: 304 KHÔNG tính hạn mức → trả bản đệm ($TMPDIR/gh-api-cache).
//   - --poll: lượt GET cùng URL < 5 phút trước → trả bản đệm, không gọi mạng (khoảng poll tối thiểu GH_API_MIN_POLL=300 s, không hạ được dưới 300).
//   - Đọc X-RateLimit-Remaining: < 500 → ngủ tới reset rồi mới gọi (GH_API_FLOOR); 403/429 do hạn mức → ngủ + thử lại, KHÔNG BAO GIỜ
//     coi là "PR đóng"/lỗi thật: hết lượt thử → thoát 75 (EX_TEMPFAIL) + thông báo "rate-limited", không in body giả.
//   - Đường dẫn bắt đầu bằng "/" (tương đối api.github.com); "--repo" thêm tiền tố /repos/lexkiteapp/lexkiteapp.github.io.
// Token: GITHUB_TOKEN | GH_TOKEN | `gh auth token`. Không bao giờ in token. Thoát: 0 ok · 1 lỗi HTTP thật (in mã + body) · 75 hạn mức.
// Dùng như thư viện: import { ghApi } from './gh-api.mjs'. Test: scripts/test/gh-api.mjs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const FLOOR = +(process.env.GH_API_FLOOR || 500), MIN_POLL = Math.max(300, +(process.env.GH_API_MIN_POLL || 300));
export const REPO = 'lexkiteapp/lexkiteapp.github.io';
const CACHE = process.env.GH_API_CACHE || path.join(process.env.TMPDIR || os.tmpdir(), 'gh-api-cache');

/** Lượt trả lời có phải do hạn mức không (thuần): 429, hoặc 403 kèm remaining=0 / thông điệp rate limit / retry-after. */
export function isRateLimited(status, headers = {}, body = '') {
  const h = k => headers[k] ?? headers[k.toLowerCase()];
  if (status === 429) return true;
  if (status !== 403) return false;
  return h('x-ratelimit-remaining') === '0' || h('retry-after') != null || /rate limit|abuse detection|secondary rate/i.test(String(body));
}
/** Số giây cần chờ (thuần): retry-after > reset (khi remaining < floor, hoặc đã bị chặn) > 0. Trần 3.700 s. */
export function waitSeconds(headers = {}, { now = Date.now(), floor = FLOOR, limited = false } = {}) {
  const h = k => headers[k] ?? headers[k.toLowerCase()];
  const ra = h('retry-after'); if (ra != null && !isNaN(+ra)) return Math.min(3700, Math.max(1, +ra));
  const rem = h('x-ratelimit-remaining'), reset = +h('x-ratelimit-reset');
  if ((limited || (rem != null && +rem < floor)) && reset) return Math.min(3700, Math.max(1, Math.ceil(reset - now / 1000) + 2));
  return limited ? 60 : 0;
}
const key = url => path.join(CACHE, crypto.createHash('sha1').update(url).digest('hex') + '.json');
const readCache = url => { try { return JSON.parse(fs.readFileSync(key(url), 'utf8')); } catch { return null; } };
const writeCache = (url, v) => { try { fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(key(url), JSON.stringify(v)); } catch { /* đệm là tối ưu, không bắt buộc */ } };
let STATE = { blockedUntil: 0 };
const statePath = () => path.join(CACHE, '_limit.json');
const readState = () => { try { STATE = JSON.parse(fs.readFileSync(statePath(), 'utf8')); } catch { /* chưa có */ } };
const writeState = () => { try { fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(statePath(), JSON.stringify(STATE)); } catch { /* bỏ qua */ } };
const token = () => process.env.GITHUB_TOKEN || process.env.GH_TOKEN || execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();

/** → { status, body, headers, cached, rateLimited }. Không ném lỗi vì HTTP; chỉ ném khi mạng hỏng hẳn. */
export async function ghApi(method, p, { data, poll = false, fetcher = fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), tries = 3, now = () => Date.now() } = {}) {
  const url = p.startsWith('http') ? p : 'https://api.github.com' + p, get = method === 'GET', c = get ? readCache(url) : null;
  if (get && poll && c && now() - c.at < MIN_POLL * 1000) return { status: c.status, body: c.body, headers: {}, cached: true };
  readState();   // trạng thái chặn dùng chung giữa các tiến trình/phiên trên máy
  for (let i = 0; i < tries; i++) {
    const wait = STATE.blockedUntil - now();
    if (wait > 0) { if (get && c) return { status: c.status, body: c.body, headers: {}, cached: true, rateLimited: true }; await sleep(Math.min(wait, 3700e3)); }
    const headers = { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'lexkite-gh-api' };
    if (get && c && c.etag) headers['If-None-Match'] = c.etag;
    if (data != null) headers['Content-Type'] = 'application/json';
    const r = await fetcher(url, { method, headers, body: data != null ? (typeof data === 'string' ? data : JSON.stringify(data)) : undefined });
    const hd = Object.fromEntries([...r.headers.entries()].map(([k, v]) => [k.toLowerCase(), v]));
    if (r.status === 304 && c) { c.at = now(); writeCache(url, c); return { status: c.status, body: c.body, headers: hd, cached: true }; }
    const text = await r.text();
    if (isRateLimited(r.status, hd, text)) {
      STATE.blockedUntil = now() + waitSeconds(hd, { now: now(), limited: true }) * 1000; writeState();
      continue;   // vòng sau: còn đệm → trả đệm (đánh dấu rateLimited), không thì ngủ tới reset
    }
    const low = waitSeconds(hd, { now: now() }); if (low > 0) { STATE.blockedUntil = now() + low * 1000; writeState(); }
    let body = text; try { body = text ? JSON.parse(text) : null; } catch { /* không phải JSON */ }
    if (get && r.ok) writeCache(url, { etag: hd.etag || '', status: r.status, body, at: now() });
    return { status: r.status, body, headers: hd, cached: false };
  }
  return { status: 0, body: null, headers: {}, cached: false, rateLimited: true };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), flag = f => { const i = a.indexOf(f); if (i < 0) return undefined; const v = a[i + 1]; a.splice(i, 2); return v; };
  const data = flag('--data'), poll = a.includes('--poll'), repo = a.includes('--repo'); const rest = a.filter(x => x !== '--poll' && x !== '--repo');
  const method = /^(GET|POST|PATCH|PUT|DELETE)$/.test(rest[0]) ? rest.shift() : 'GET';
  let p = rest[0]; if (!p) { console.error('dùng: gh-api.mjs [METHOD] /path [--data json] [--poll] [--repo]'); process.exit(2); }
  if (repo) p = `/repos/${REPO}${p.startsWith('/') ? '' : '/'}${p}`;
  const r = await ghApi(method, p, { data, poll }).catch(e => { console.error(`mạng lỗi: ${e.cause?.code || e.message} (sandbox: dùng scripts/ci/gh-api.sh để bật proxy)`); process.exit(1); });
  if (r.rateLimited && r.status === 0) { console.error('rate-limited: GitHub API hết hạn mức – thử lại sau reset (KHÔNG phải lỗi/PR đóng)'); process.exit(75); }
  if (r.rateLimited) console.error('rate-limited: trả bản đệm cũ');
  process.stdout.write((typeof r.body === 'string' ? r.body : JSON.stringify(r.body)) + '\n');
  if (r.status >= 400) { console.error(`HTTP ${r.status}`); process.exit(1); }
}
