#!/usr/bin/env node
// Chuyển media.lexkite.com / audio.lexkite.com từ Worker sang R2 tĩnh (docs/CAPACITY.md §A4). Chỉ gọi API Cloudflare (nhẹ, chạy tay được).
//   node scripts/cdn/cutover.mjs check              → R2 đã bật? (GITHUB_OUTPUT r2=on|off|noperm; off/noperm = dừng trung tính + việc chủ cần bấm)
//   node scripts/cdn/cutover.mjs prepare            → tạo bucket (apac) + CORS + Cache Rule + Transform Rule (giữ nguyên luật khác của zone)
//   node scripts/cdn/cutover.mjs switch --host audio → cổng: _mirror/status.json đủ (thiếu 0, lỗi 0, < 26 h) → gỡ tên miền Worker → gắn tên miền R2
//   node scripts/cdn/cutover.mjs verify --host audio → mẫu thật qua tên miền: 200/206 Range, kiểu, cache, CORS, lần 2 HIT
//   node scripts/cdn/cutover.mjs rollback --host audio → gỡ tên miền R2 → gắn lại Worker (Worker vẫn deploy, không xoá)
// Token: CLOUDFLARE_API_TOKEN hoặc ~/.config/lexkite/cf-token – quyền: Workers R2 Storage Edit, Workers Scripts Edit,
// Zone lexkite.com: Cache Rules Edit, Transform Rules Edit, DNS Edit. Không in token.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { isMain } from '../lib/is-main.mjs';
import { hosts, ACCOUNT, ZONE, typeFor, cacheFor } from './hosts.mjs';

export const REF = 'lexkite_cdn_';
const HOSTS = hosts(), NAMES = Object.values(HOSTS).map(h => h.hostname);
export const CORS = { rules: [{ allowed: { origins: ['*'], methods: ['GET', 'HEAD'], headers: ['Range'] }, exposeHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges', 'ETag'], maxAgeSeconds: 86400 }] };
const inHosts = `(http.host in {${NAMES.map(n => `"${n}"`).join(' ')}})`;
/** Luật zone do script này sở hữu (ref bắt đầu REF) – thay đúng chúng, giữ mọi luật khác. */
export const RULES = {
  http_request_cache_settings: [{
    ref: REF + 'cache', description: 'Lexkite CDN R2: cache mọi tệp, TTL theo Cache-Control của đối tượng (1 năm immutable; /library/ 1 ngày)',
    expression: inHosts, action: 'set_cache_settings',
    action_parameters: { cache: true, edge_ttl: { mode: 'respect_origin' }, browser_ttl: { mode: 'respect_origin' } },
  }],
  http_response_headers_transform: [{
    ref: REF + 'headers', description: 'Lexkite CDN R2: CORS + nosniff như Worker cũ', expression: inHosts, action: 'rewrite',
    action_parameters: { headers: { 'Access-Control-Allow-Origin': { operation: 'set', value: '*' }, 'Timing-Allow-Origin': { operation: 'set', value: '*' }, 'X-Content-Type-Options': { operation: 'set', value: 'nosniff' }, 'X-Origin': { operation: 'set', value: 'r2' } } },
  }, {
    ref: REF + 'svg', description: 'Lexkite CDN R2: SVG mở trực tiếp không chạy script', expression: '(http.host eq "media.lexkite.com" and ends_with(lower(http.request.uri.path), ".svg"))', action: 'rewrite',
    action_parameters: { headers: { 'Content-Security-Policy': { operation: 'set', value: "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox" } } },
  }],
};
/** Gộp luật: bỏ luật cũ của mình (theo ref), thêm bản mới; luật khác giữ nguyên thứ tự. */
export const mergeRules = (existing = [], mine) => [...existing.filter(r => !String(r.ref || '').startsWith(REF)).map(({ id, version, last_updated, ...r }) => r), ...mine];

const token = () => process.env.CLOUDFLARE_API_TOKEN || fs.readFileSync(path.join(os.homedir(), '.config/lexkite/cf-token'), 'utf8').trim();
async function cf(method, p, body) {
  const r = await fetch('https://api.cloudflare.com/client/v4' + p, { method, headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok && j.success !== false, status: r.status, j };
}
const must = async (what, method, p, body) => { const r = await cf(method, p, body); if (!r.ok) throw new Error(`${what}: ${r.status} ${JSON.stringify(r.j.errors || r.j).slice(0, 300)}`); return r.j.result; };
const A = `/accounts/${ACCOUNT}`;

const summary = t => { console.log(t); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, t + '\n'); };
const out = (k, v) => { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };
/** R2 đã bật trên tài khoản chưa? on | off (chủ chưa bật – mã 10042) | noperm (token thiếu Workers R2 Storage). Không bao giờ ném lỗi. */
export function r2State(r) {
  if (r.ok) return 'on';
  const codes = ((r.j && r.j.errors) || []).map(e => +e.code), msg = JSON.stringify((r.j && r.j.errors) || '').toLowerCase();
  if (codes.includes(10042) || /enable r2|r2 is not enabled|not subscribed/.test(msg)) return 'off';
  return 'noperm';
}
export const R2_HELP = { off: 'Cần chủ bấm: dash.cloudflare.com › R2 Object Storage › bật R2 (Cloudflare đòi phương thức thanh toán; trong hạn Free 10 GB / 1 tr ghi / 10 tr đọc mỗi tháng = $0).', noperm: 'Token CI (secret CLOUDFLARE_API_TOKEN) thiếu quyền Account › Workers R2 Storage › Edit.' };
async function check() {
  const st = r2State(await cf('GET', `${A}/r2/buckets`)); out('r2', st);
  if (st === 'on') { let n = 0; for (const h of Object.values(HOSTS)) if ((await cf('GET', `${A}/r2/buckets/${h.bucket}`)).ok) n++; out('buckets', n === Object.keys(HOSTS).length ? 1 : 0); }
  summary(st === 'on' ? '✅ R2 đã bật trên tài khoản – chép + chuyển được.' : `⏸ R2: ${st}. ${R2_HELP[st]} Dừng trung tính (không đổi gì).`);
  return st;
}
async function prepare() {
  for (const h of Object.values(HOSTS)) {
    const b = await cf('GET', `${A}/r2/buckets/${h.bucket}`);
    if (!b.ok) { await must(`tạo bucket ${h.bucket}`, 'POST', `${A}/r2/buckets`, { name: h.bucket, locationHint: 'apac' }); console.log(`+ bucket ${h.bucket}`); }
    await must(`CORS ${h.bucket}`, 'PUT', `${A}/r2/buckets/${h.bucket}/cors`, CORS);
  }
  // Luật zone (Cache Rule + Transform Rule) – cần quyền Zone Cache Rules/Transform Rules Edit. Thiếu → vẫn chạy được: Cloudflare cache mặc định
  // theo đuôi tệp (mp3/ảnh/mp4, tôn trọng Cache-Control của đối tượng) + CORS của bucket; chỉ library/*.json không cache biên (đọc R2 Class B, 0 lượt Worker).
  let rules = 0;
  for (const [phase, mine] of Object.entries(RULES)) {
    const cur = await cf('GET', `/zones/${ZONE}/rulesets/phases/${phase}/entrypoint`);
    if (!cur.ok && cur.status !== 404) { summary(`⚠️ ${phase}: token thiếu quyền (${cur.status}) – bỏ qua; cần chủ thêm Zone › ${phase.includes('cache') ? 'Cache Rules' : 'Transform Rules'} › Edit để có ${phase.includes('cache') ? 'cache biên cho .json' : 'nosniff/CSP SVG/X-Origin'}.`); continue; }
    const w = await cf('PUT', `/zones/${ZONE}/rulesets/phases/${phase}/entrypoint`, { rules: mergeRules(cur.ok ? cur.j.result.rules : [], mine) });
    if (w.ok) { rules++; console.log(`✓ ${phase}: ${mine.length} luật Lexkite CDN`); } else summary(`⚠️ ghi ${phase}: ${w.status} – bỏ qua`);
  }
  out('rules', rules);
}
async function readStatus(h) {
  const r = await fetch(`https://api.cloudflare.com/client/v4${A}/r2/buckets/${h.bucket}/objects/_mirror/status.json`, { headers: { Authorization: `Bearer ${token()}` } });
  return r.ok ? r.json() : null;
}
async function workerDomain(hostname) { return (await must('đọc tên miền Worker', 'GET', `${A}/workers/domains?hostname=${hostname}`)).find(d => d.hostname === hostname); }
async function switchHost(h) {
  const st = await readStatus(h);
  const age = st ? (Date.now() - Date.parse(st.at)) / 36e5 : Infinity;
  if (!st || st.missing !== 0 || st.fail !== 0 || st.bad !== 0 || age > 26) throw new Error(`cổng: bucket ${h.bucket} chưa đủ (status ${JSON.stringify(st)}) – chạy cdn-mirror.yml trước`);
  const wd = await workerDomain(h.hostname);
  if (wd) { await must('gỡ tên miền Worker', 'DELETE', `${A}/workers/domains/${wd.id}`); console.log(`− ${h.hostname} ↛ Worker ${wd.service}`); }
  // Gắn R2 lỗi (vd. token thiếu quyền zone) → gắn lại Worker NGAY (không để tên miền trống); app/SW vẫn lùi GitHub trong lúc chuyển
  try { await must('gắn tên miền R2', 'POST', `${A}/r2/buckets/${h.bucket}/domains/custom`, { domain: h.hostname, zoneId: ZONE, enabled: true, minTLS: '1.2' }); }
  catch (e) { summary(`✗ ${e.message} → quay lại Worker`); await rollback(h); throw e; }
  console.log(`+ ${h.hostname} → R2 ${h.bucket} (${st.keys} khoá). Kiểm: node scripts/cdn/cutover.mjs verify --host ${Object.keys(HOSTS).find(k => HOSTS[k] === h)}`);
}
/** Chốt $0 (free-tier guard, R2 ≥ 90 %): mọi tên miền về Worker (nguồn GitHub). */
export async function rollbackAll() { for (const h of Object.values(HOSTS)) await rollback(h); }
async function rollback(h) {
  const d = await cf('DELETE', `${A}/r2/buckets/${h.bucket}/domains/custom/${h.hostname}`); console.log(d.ok ? `− ${h.hostname} ↛ R2` : `(R2 chưa gắn ${h.hostname}: ${d.status})`);
  for (let i = 0; i < 10; i++) {
    const r = await cf('PUT', `${A}/workers/domains`, { environment: 'production', hostname: h.hostname, service: h.worker, zone_id: ZONE });
    if (r.ok) { console.log(`+ ${h.hostname} → Worker ${h.worker}`); return; }
    await new Promise(r => setTimeout(r, 6000)); // DNS của tên miền R2 gỡ chậm vài giây
  }
  throw new Error('gắn lại Worker thất bại – làm tay: Workers › ' + h.worker + ' › Domains');
}
/** Trạng thái cache biên của GET đã lưu: HIT (hoặc STALE/REVALIDATED/UPDATING = vẫn phục vụ từ cache). DYNAMIC/BYPASS/MISS = không cache. */
export const cacheHit = st => /^(HIT|STALE|REVALIDATED|UPDATING)$/i.test(String(st || ''));
export function checkResponse(k, r, { range } = {}) {
  const bad = [], hd = n => r.headers.get(n) || '';
  if (r.status !== (range ? 206 : 200)) bad.push(`status ${r.status}`);
  if (hd('content-type') !== typeFor(k)) bad.push(`type ${hd('content-type')}`);
  if (hd('cache-control') !== cacheFor(k)) bad.push(`cache ${hd('cache-control')}`);
  if (hd('access-control-allow-origin') !== '*') bad.push('CORS');
  if (range && !/^bytes 0-99\/\d+$/.test(hd('content-range'))) bad.push(`range ${hd('content-range')}`);
  return bad;
}
async function verify(name, h) {
  const st = await readStatus(h); if (!st || !st.sample || !st.sample.length) throw new Error('không có mẫu trong _mirror/status.json');
  let bad = 0;
  for (const k of st.sample) {
    const url = `https://${h.hostname}/${k}`, range = /\.mp4$/.test(k);
    const r1 = await fetch(url, { headers: { Origin: 'https://lexkite.com', ...(range ? { Range: 'bytes=0-99' } : {}) } }); await r1.arrayBuffer();
    // Đo cache LUÔN bằng GET (Cloudflare không cache HEAD → HEAD luôn DYNAMIC, báo nhầm 02/11); lần 3 phải HIT (lần 1 có Origin → khoá Vary khác)
    const get = async () => { const x = await fetch(url, { headers: range ? { Range: 'bytes=0-99' } : {} }); await x.arrayBuffer(); return x; };
    const r2 = await get(), r3 = await get();
    const errs = checkResponse(k, r1, { range }); if (process.env.CDN_RULES === '1' && r1.headers.get('x-origin') !== 'r2') errs.push(`x-origin ${r1.headers.get('x-origin')}`); // X-Origin do Transform Rule (cần quyền zone)
    const hit = r3.headers.get('cf-cache-status'); if (!cacheHit(hit)) errs.push(`cache biên ${hit} (GET lần 3 phải HIT)`);
    if (errs.length) bad++;
    console.log(`${errs.length ? '✗' : '✓'} ${k} ${r1.status} GET lần 3 ${hit}${errs.length ? ' – ' + errs.join(', ') : ''}`);
  }
  console.log(`${name}: ${st.sample.length - bad}/${st.sample.length} đạt`);
  if (bad) process.exitCode = 1;
}

if (isMain(import.meta.url)) { // so realpath: /tmp ↔ /private/tmp (02/11: so chuỗi → khối main không chạy, switch im lặng 'thành công')
  const [cmd] = process.argv.slice(2), i = process.argv.indexOf('--host'), name = i > 0 ? process.argv[i + 1] : '';
  const h = HOSTS[name];
  if (!['prepare', 'check'].includes(cmd) && !h) { console.error('dùng: check | prepare | switch|verify|rollback --host media|audio'); process.exit(2); }
  const run = { check, prepare, switch: () => switchHost(h), verify: () => verify(name, h), rollback: () => rollback(h) }[cmd];
  if (!run) { console.error('lệnh lạ: ' + cmd); process.exit(2); }
  run().catch(e => { console.error('✗ ' + e.message); process.exit(1); });
}
