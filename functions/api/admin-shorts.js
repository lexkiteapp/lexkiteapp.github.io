/* Quản trị → 🎬 Video (web/js/admin-video.js): thư viện short đã dựng trong repo RIÊNG TƯ lexkiteapp/lexkite-shorts.
 * POST /api/admin-shorts (Bearer Firebase ID token, adminGate)  { op: 'list' | 'sign', path? }
 *   list → manifest (shorts/index.json trong repo riêng nếu có SHORTS_READ_TOKEN, nếu không = bản gói _shorts_data.js) + coverage,
 *          lịch đăng, tóm tắt credit; kèm URL ký sẵn cho ảnh bìa khi có token.
 *   sign → URL ký (HMAC, hết hạn ≤ 2 giờ) cho 1 file shorts/<cảnh>/<bài>/<tên>.mp4|.jpg.
 * GET /api/admin-shorts?p=<path>&e=<exp>&s=<sig>[&dl=1] → phát file từ repo riêng (hỗ trợ HTTP Range cho <video>).
 *   Thẻ <video>/<img> không gửi được header Authorization → chữ ký thay cho phiên quản trị; khóa ký suy ra từ SHORTS_READ_TOKEN.
 * Secret Cloudflare Pages: SHORTS_READ_TOKEN = PAT fine-grained CHỈ repo lexkite-shorts, Contents: Read-only (docs/SHORTS-ACCESS.md).
 * Thiếu secret → trang vẫn chạy với manifest gói sẵn, bìa/video hiện "cần token". Không bao giờ trả token về máy khách. */
import { adminGate, adminCors } from './admin.js';
import { limit } from './sync.js';
import DATA from './_shorts_data.js';

const REPO = 'lexkiteapp/lexkite-shorts';
const PATH = /^shorts\/[a-z0-9_]{1,80}\/[a-z0-9_]{1,80}\/[a-z0-9-]{1,120}\.(mp4|jpg)$/;
const TYPES = { mp4: 'video/mp4', jpg: 'image/jpeg' };
const MAX_TTL = 2 * 3600;
const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...adminCors(req) } });
const enc = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const okPath = p => typeof p === 'string' && PATH.test(p) && !p.includes('..');
async function sigOf(env, path, exp) {
  const key = await crypto.subtle.importKey('raw', enc.encode('lexkite-shorts-media|' + env.SHORTS_READ_TOKEN), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, enc.encode(path + '|' + exp))).slice(0, 43);
}
const same = (a, b) => { if (typeof a !== 'string' || a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; };
// Hết hạn làm tròn theo giờ → URL bìa ổn định trong 1 giờ (trình duyệt tự đệm)
async function signed(env, path, ttl = 3600) {
  const exp = Math.ceil(Date.now() / 1000 / 3600) * 3600 + Math.min(ttl, MAX_TTL - 3600);
  return `/api/admin-shorts?p=${encodeURIComponent(path)}&e=${exp}&s=${await sigOf(env, path, exp)}`;
}

let memo = null; // { at, items } – manifest repo riêng, đệm 60 s
async function repoIndex(env) {
  if (memo && Date.now() - memo.at < 60e3) return memo.items;
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/shorts/index.json`, { headers: { Authorization: 'Bearer ' + env.SHORTS_READ_TOKEN, Accept: 'application/vnd.github.raw', 'User-Agent': 'lexkite-admin' } });
  if (!r.ok) throw new Error('index ' + r.status);
  const j = await r.json(); if (!j || !Array.isArray(j.items)) throw new Error('index shape');
  memo = { at: Date.now(), items: j.items }; return j.items;
}

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: adminCors(request) });

export async function onRequestPost({ request, env }) {
  const g = await adminGate(request, env, 'adm'); if (!g.who) return json(request, g.status, { error: g.error });
  let b; try { b = await request.json(); } catch (e) { b = null; }
  if (!b || typeof b !== 'object') return json(request, 400, { error: 'body' });
  const media = !!env.SHORTS_READ_TOKEN;
  if (b.op === 'list') {
    let items = (DATA.index && DATA.index.items) || [], source = 'bundle';
    if (media) { try { items = await repoIndex(env); source = 'repo'; } catch (e) { source = 'bundle'; } }
    const covers = {};
    if (media) for (const it of items) if (okPath(it.cover)) covers[it.cover] = await signed(env, it.cover);
    return json(request, 200, { items, source, media, updated: DATA.index && DATA.index.updated, coverage: DATA.coverage, calendar: DATA.calendar, credits: DATA.credits, covers });
  }
  if (b.op === 'sign') {
    if (!okPath(b.path)) return json(request, 400, { error: 'path' });
    if (!media) return json(request, 503, { error: 'needs-token' });
    return json(request, 200, { url: await signed(env, b.path, 2 * 3600) });
  }
  return json(request, 400, { error: 'op' });
}

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url), p = u.searchParams.get('p') || '', e = +u.searchParams.get('e'), s = u.searchParams.get('s') || '';
  const plain = (status, msg) => new Response(msg, { status, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  if (!okPath(p)) return plain(400, 'path');
  if (!env.SHORTS_READ_TOKEN) return plain(503, 'needs-token');
  const now = Date.now() / 1000;
  if (!Number.isInteger(e) || e < now || e > now + MAX_TTL + 60 || !same(s, await sigOf(env, p, e))) return plain(403, 'forbidden');
  if (await limit('shm:' + (request.headers.get('CF-Connecting-IP') || '?'), 900, 60)) return plain(429, 'too-fast');
  const range = request.headers.get('Range') || '', m = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (range && !m) return plain(416, 'range');
  const up = await fetch(`https://raw.githubusercontent.com/${REPO}/main/${p}`, { headers: { Authorization: 'token ' + env.SHORTS_READ_TOKEN, 'User-Agent': 'lexkite-admin', ...(m ? { Range: range } : {}) } });
  if (up.status === 404) return plain(404, 'not-found');
  if (!up.ok) return plain(502, 'upstream');
  const ext = p.split('.').pop();
  const h = { 'Content-Type': TYPES[ext], 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': `${u.searchParams.get('dl') === '1' ? 'attachment' : 'inline'}; filename="${p.split('/').pop()}"`, 'Cross-Origin-Resource-Policy': 'same-origin' };
  if (up.status === 206) {
    for (const k of ['Content-Range', 'Content-Length']) if (up.headers.get(k)) h[k] = up.headers.get(k);
    return new Response(up.body, { status: 206, headers: h });
  }
  if (!m) { if (up.headers.get('Content-Length')) h['Content-Length'] = up.headers.get('Content-Length'); return new Response(up.body, { status: 200, headers: h }); }
  // Nguồn bỏ qua Range → tự cắt (short ≤ ~25 MB)
  const buf = new Uint8Array(await up.arrayBuffer()), size = buf.length;
  let a = m[1] === '' ? size - +m[2] : +m[1], z = m[1] === '' || m[2] === '' ? size - 1 : Math.min(+m[2], size - 1);
  if (a < 0) a = 0;
  if (a >= size || a > z) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  h['Content-Range'] = `bytes ${a}-${z}/${size}`; h['Content-Length'] = String(z - a + 1);
  return new Response(buf.slice(a, z + 1), { status: 206, headers: h });
}
