/* Quản trị → 🎬 Video (web/js/admin-video.js): thư viện short ĐẠT – media nằm ở Kho Drive riêng (functions/api/drive.js), bản gốc ở repo riêng lexkite-shorts.
 * POST /api/admin-shorts (Bearer Firebase ID token, adminGate)  { op: 'list' | 'sign', path? }
 *   list → manifest + coverage, lịch đăng, tóm tắt credit; kèm URL ký sẵn cho ảnh bìa.
 *          Nguồn manifest theo thứ tự: Kho Drive (shorts/_admin/admin-shorts.json mới nhất trong sổ drive_files, do drive-shorts.yml tải lên)
 *          → repo riêng (chỉ khi có SHORTS_READ_TOKEN) → bản gói sẵn _shorts_data.js.
 *   sign → URL ký (HMAC, hết hạn ≤ 2 giờ) cho 1 file shorts/<cảnh>/<bài>/<tên>.mp4|.jpg (tra item.drive trong manifest).
 * GET /api/admin-shorts?f=<fileId>&d=<driveId>&k=v|c&n=<tên>&e=<exp>&s=<sig>[&dl=1] → phát từ Drive (alt=media, chuyển tiếp HTTP Range).
 * GET /api/admin-shorts?p=<path>&e=<exp>&s=<sig>[&dl=1] → dự phòng: phát từ repo riêng (chỉ khi có SHORTS_READ_TOKEN).
 *   Thẻ <video>/<img> không gửi được header Authorization → chữ ký thay cho phiên quản trị; khóa ký suy ra từ DRIVE_ENC_KEY (hoặc SHORTS_READ_TOKEN).
 * Bìa đệm ở Cache API của Cloudflare (khóa băm bí mật, 1 ngày) để không tốn hạn mức Drive API. Không bao giờ trả token/khóa về máy khách.
 * Không cần việc gì của chủ: secret Drive (GOOGLE_DRIVE_CLIENT_ID/SECRET, DRIVE_ENC_KEY) đã có (docs/SHORTS-ACCESS.md). */
import { adminGate, adminCors } from './admin.js';
import { limit } from './sync.js';
import { latestFile, driveMedia } from './drive.js';
import DATA from './_shorts_data.js';

const REPO = 'lexkiteapp/lexkite-shorts';
export const MANIFEST = { folder: 'shorts/_admin', name: 'admin-shorts.json' };
const PATH = /^shorts\/[a-z0-9_]{1,80}\/[a-z0-9_]{1,80}\/[a-z0-9-]{1,120}\.(mp4|jpg)$/;
const FID = /^[A-Za-z0-9_-]{10,120}$/, NAME = /^[a-z0-9-]{1,120}$/;
const TYPES = { mp4: 'video/mp4', jpg: 'image/jpeg' };
const MAX_TTL = 2 * 3600, MEMO_MS = 5 * 60e3;
const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...adminCors(req) } });
const enc = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const okPath = p => typeof p === 'string' && PATH.test(p) && !p.includes('..');
const driveOn = env => !!(env.DB && env.DRIVE_ENC_KEY && env.GOOGLE_DRIVE_CLIENT_ID && env.GOOGLE_DRIVE_CLIENT_SECRET);
const keyOf = env => env.DRIVE_ENC_KEY || env.SHORTS_READ_TOKEN || '';
async function sigOf(env, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode('lexkite-shorts-media|' + keyOf(env)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, enc.encode(msg))).slice(0, 43);
}
const same = (a, b) => { if (typeof a !== 'string' || a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; };
// Hết hạn làm tròn theo giờ → URL bìa ổn định trong 1 giờ (trình duyệt tự đệm)
const expOf = ttl => Math.ceil(Date.now() / 1000 / 3600) * 3600 + Math.min(ttl, MAX_TTL - 3600);
const driveRef = (it, k) => { const c = it && it.drive && it.drive[k]; return c && FID.test(String(c.fileId || '')) && /^\d{1,6}$/.test(String(c.driveId || '')) ? c : null; };
/** URL ký cho 1 phần (video|cover) của 1 item: Drive nếu có item.drive, nếu không repo riêng khi có token; null = không phát được. */
async function signed(env, it, k, ttl = 3600) {
  const path = it && it[k], exp = expOf(ttl), c = driveOn(env) ? driveRef(it, k) : null;
  if (c && okPath(path)) {
    const kk = k === 'video' ? 'v' : 'c', n = path.split('/').pop().replace(/\.(mp4|jpg)$/, '');
    return `/api/admin-shorts?f=${c.fileId}&d=${c.driveId}&k=${kk}&n=${n}&e=${exp}&s=${await sigOf(env, `drive|${c.fileId}|${c.driveId}|${kk}|${n}|${exp}`)}`;
  }
  if (env.SHORTS_READ_TOKEN && okPath(path)) return `/api/admin-shorts?p=${encodeURIComponent(path)}&e=${exp}&s=${await sigOf(env, path + '|' + exp)}`;
  return null;
}

let memo = null; // { at, m: {items, updated, coverage, calendar, credits, source} } – đệm 5 phút/isolate
export const _memo = { reset: () => { memo = null; } };
async function driveManifest(env) {
  const f = await latestFile(env, MANIFEST.folder, MANIFEST.name); if (!f) throw new Error('no-manifest');
  const r = await driveMedia(env, f.drive_id, f.file_id); if (!r.ok) throw new Error('manifest ' + r.status);
  const j = await r.json(); const items = j && j.index && j.index.items; if (!Array.isArray(items)) throw new Error('manifest shape');
  return { items, updated: j.index.updated, coverage: j.coverage, calendar: j.calendar, credits: j.credits, source: 'drive' };
}
async function repoManifest(env) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/shorts/index.json`, { headers: { Authorization: 'Bearer ' + env.SHORTS_READ_TOKEN, Accept: 'application/vnd.github.raw', 'User-Agent': 'lexkite-admin' } });
  if (!r.ok) throw new Error('index ' + r.status);
  const j = await r.json(); if (!j || !Array.isArray(j.items)) throw new Error('index shape');
  return { items: j.items, updated: j.updated || (DATA.index && DATA.index.updated), source: 'repo' };
}
async function manifest(env) {
  const mk = `${driveOn(env)}|${!!env.SHORTS_READ_TOKEN}`;
  if (memo && memo.k === mk && Date.now() - memo.at < MEMO_MS) return memo.m;
  let m = null;
  if (driveOn(env)) { try { m = await driveManifest(env); } catch (e) { m = null; } }
  if (!m && env.SHORTS_READ_TOKEN) { try { m = await repoManifest(env); } catch (e) { m = null; } }
  const b = { items: (DATA.index && DATA.index.items) || [], updated: DATA.index && DATA.index.updated, coverage: DATA.coverage, calendar: DATA.calendar, credits: DATA.credits, source: 'bundle' };
  m = m ? { ...b, ...Object.fromEntries(Object.entries(m).filter(([, v]) => v != null)) } : b;
  if (m.source !== 'bundle') memo = { at: Date.now(), k: mk, m };
  return m;
}

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: adminCors(request) });

export async function onRequestPost({ request, env }) {
  const g = await adminGate(request, env, 'adm'); if (!g.who) return json(request, g.status, { error: g.error });
  let b; try { b = await request.json(); } catch (e) { b = null; }
  if (!b || typeof b !== 'object') return json(request, 400, { error: 'body' });
  if (b.op === 'list') {
    const m = await manifest(env), covers = {};
    for (const it of m.items) if (okPath(it.cover)) { const u = await signed(env, it, 'cover'); if (u) covers[it.cover] = u; }
    const media = !!(Object.keys(covers).length || (env.SHORTS_READ_TOKEN && m.items.length));
    return json(request, 200, { items: m.items, source: m.source, media, updated: m.updated, coverage: m.coverage, calendar: m.calendar, credits: m.credits, covers });
  }
  if (b.op === 'sign') {
    if (!okPath(b.path)) return json(request, 400, { error: 'path' });
    if (!driveOn(env) && !env.SHORTS_READ_TOKEN) return json(request, 503, { error: 'needs-drive' });
    const k = b.path.endsWith('.mp4') ? 'video' : 'cover', m = await manifest(env);
    const it = m.items.find(x => x && x[k] === b.path) || { [k]: b.path };
    const url = await signed(env, it, k, 2 * 3600);
    return url ? json(request, 200, { url }) : json(request, 404, { error: 'not-on-drive' });
  }
  return json(request, 400, { error: 'op' });
}

const plain = (status, msg) => new Response(msg, { status, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
/** Trả byte nguồn cho trình duyệt: chuyển tiếp 206, hoặc tự cắt khi nguồn bỏ qua Range (short ≤ ~25 MB). */
async function relay(up, m, h) {
  if (up.status === 206) {
    for (const k of ['Content-Range', 'Content-Length']) if (up.headers.get(k)) h[k] = up.headers.get(k);
    return new Response(up.body, { status: 206, headers: h });
  }
  if (!m) { if (up.headers.get('Content-Length')) h['Content-Length'] = up.headers.get('Content-Length'); return new Response(up.body, { status: 200, headers: h }); }
  const buf = new Uint8Array(await up.arrayBuffer()), size = buf.length;
  let a = m[1] === '' ? size - +m[2] : +m[1]; const z = m[1] === '' || m[2] === '' ? size - 1 : Math.min(+m[2], size - 1);
  if (a < 0) a = 0;
  if (a >= size || a > z) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  h['Content-Range'] = `bytes ${a}-${z}/${size}`; h['Content-Length'] = String(z - a + 1);
  return new Response(buf.slice(a, z + 1), { status: 206, headers: h });
}
const headersFor = (ext, name, dl) => ({ 'Content-Type': TYPES[ext], 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff',
  'Content-Disposition': `${dl ? 'attachment' : 'inline'}; filename="${name}"`, 'Cross-Origin-Resource-Policy': 'same-origin' });

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url), q = k => u.searchParams.get(k) || '', e = +q('e'), s = q('s'), now = Date.now() / 1000;
  const range = request.headers.get('Range') || '', m = /^bytes=(\d*)-(\d*)$/.exec(range), dl = q('dl') === '1';
  const ip = request.headers.get('CF-Connecting-IP') || '?';
  if (u.searchParams.has('f')) { // ---- Kho Drive ----
    const f = q('f'), d = q('d'), k = q('k'), n = q('n');
    if (!FID.test(f) || !/^\d{1,6}$/.test(d) || !(k === 'v' || k === 'c') || !NAME.test(n)) return plain(400, 'bad');
    if (!driveOn(env)) return plain(503, 'needs-drive');
    if (!Number.isInteger(e) || e < now || e > now + MAX_TTL + 60 || !same(s, await sigOf(env, `drive|${f}|${d}|${k}|${n}|${e}`))) return plain(403, 'forbidden');
    if (range && !m) return plain(416, 'range');
    if (await limit('shm:' + ip, 900, 60)) return plain(429, 'too-fast');
    const ext = k === 'v' ? 'mp4' : 'jpg', h = headersFor(ext, `${n}.${ext}`, dl);
    // Bìa: đệm ở Cache API (khóa = băm bí mật của fileId, không đoán được) → 1 lần gọi Drive/ngày/vùng
    const cache = k === 'c' && typeof caches !== 'undefined' ? caches.default : null;
    const ck = cache && new Request('https://lexkite.com/api/admin-shorts/_c/' + (await sigOf(env, 'cache|' + f)));
    if (cache) { const hit = await cache.match(ck).catch(() => null); if (hit) return new Response(hit.body, { status: 200, headers: { ...h, ...(hit.headers.get('Content-Length') ? { 'Content-Length': hit.headers.get('Content-Length') } : {}) } }); }
    let up; try { up = await driveMedia(env, d, f, k === 'v' && m ? range : ''); } catch (err) { return plain(err.status === 404 ? 404 : 502, err.status === 404 ? 'not-found' : 'upstream'); }
    if (up.status === 404) return plain(404, 'not-found');
    if (up.status === 416) return new Response(null, { status: 416, headers: { 'Content-Range': up.headers.get('Content-Range') || 'bytes */0' } });
    if (!up.ok) return plain(502, 'upstream');
    if (cache && up.status === 200) {
      const buf = await up.arrayBuffer();
      await cache.put(ck, new Response(buf, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400', 'Content-Length': String(buf.byteLength) } })).catch(() => {});
      return new Response(buf, { status: 200, headers: { ...h, 'Content-Length': String(buf.byteLength) } });
    }
    return relay(up, k === 'v' ? m : null, h);
  }
  // ---- dự phòng: repo riêng (chỉ khi có SHORTS_READ_TOKEN) ----
  const p = q('p');
  if (!okPath(p)) return plain(400, 'path');
  if (!env.SHORTS_READ_TOKEN) return plain(503, 'needs-token');
  if (!Number.isInteger(e) || e < now || e > now + MAX_TTL + 60 || !same(s, await sigOf(env, p + '|' + e))) return plain(403, 'forbidden');
  if (await limit('shm:' + ip, 900, 60)) return plain(429, 'too-fast');
  if (range && !m) return plain(416, 'range');
  const up = await fetch(`https://raw.githubusercontent.com/${REPO}/main/${p}`, { headers: { Authorization: 'token ' + env.SHORTS_READ_TOKEN, 'User-Agent': 'lexkite-admin', ...(m ? { Range: range } : {}) } });
  if (up.status === 404) return plain(404, 'not-found');
  if (!up.ok) return plain(502, 'upstream');
  const ext = p.split('.').pop();
  return relay(up, m, headersFor(ext, p.split('/').pop(), dl));
}
