/* Đọc bài viết từ liên kết cho "Nhập tài liệu → bộ thẻ" (docs/specs/import-to-deck.md #5, lát link): POST /api/readable { url }
 *   → { title, text, host, chars } – máy chủ tải trang (trình duyệt không đọc chéo miền được), rút chữ bài chính, KHÔNG lưu gì.
 * Chống SSRF (mọi bước, kể cả sau chuyển hướng): chỉ http/https cổng 80/443, không user:pass, chặn localhost/tên nội bộ, chặn IP riêng
 * (IPv4 thập phân/hex/bát phân đã được URL chuẩn hóa về dạng chấm; IPv6 mở rộng, ::ffff:v4, NAT64, 6to4…), phân giải DNS (DoH miễn phí của
 * Cloudflare) và chặn nếu BẤT KỲ địa chỉ nào là riêng; chuyển hướng thủ công ≤ 4 lần, kiểm lại từng bước; chỉ nhận text/html · xhtml · text/plain;
 * trần 1 MB (đọc luồng, vượt → báo lỗi), hết giờ 8 s, không gửi cookie/Authorization. Cloudflare Workers vốn cũng không nối được IP riêng.
 * Hạn mức: tính năng `readable` của _quota.js (biên, 0 lượt ghi D1), vượt → 429 như các API khác. Lỗi → { error: <mã> } (máy khách báo nhẹ nhàng). */
import { gate } from './_quota.js';

export const MAX_BYTES = 1048576, MAX_HOPS = 4, FETCH_MS = 8000, MAX_TEXT = 300000, MIN_TEXT = 200;
const TYPES = /^(text\/html|application\/xhtml\+xml|text\/plain)$/i;
const BAD_HOST = /(^|\.)(localhost|local|localdomain|internal|intranet|lan|home|corp|private|onion|arpa)$/i;
const ORIGINS = /^(https:\/\/((www\.)?lexkite\.com|([a-z0-9-]+\.)?lexkite(-preview)?\.pages\.dev)|https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?|capacitor:\/\/localhost|chrome-extension:\/\/[a-z]{32})$/;
const err = code => Object.assign(new Error(code), { code });

const cors = req => { const o = req.headers.get('Origin') || ''; return ORIGINS.test(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Lexkite-Device', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } : {}; };
const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req) } });

// ---------- IP riêng / không định tuyến công khai ----------
const V4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
export function isPrivateV4(ip) {
  const m = V4.exec(ip); if (!m) return true;
  const [a, b, c] = [+m[1], +m[2], +m[3]]; if ([a, b, c, +m[4]].some(x => x > 255)) return true;
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0 && c <= 2) || (a === 192 && b === 168) || (a === 192 && b === 88 && c === 99) || (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113);
}
function groups6(ip) { // IPv6 → 8 nhóm 16 bit (hỗ trợ :: và đuôi IPv4 chấm); không hợp lệ → null
  ip = ip.replace(/^\[|\]$/g, '').toLowerCase().replace(/%.*$/, '');
  const t = ip.match(/^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (t) { const p = t[2].split('.').map(Number); if (p.some(x => x > 255)) return null; ip = t[1] + ((p[0] << 8) | p[1]).toString(16) + ':' + ((p[2] << 8) | p[3]).toString(16); }
  if (!/^[0-9a-f:]+$/.test(ip) || (ip.match(/::/g) || []).length > 1) return null;
  const [h, tl] = ip.split('::'), a = h ? h.split(':') : [], b = tl ? tl.split(':') : [];
  if (tl === undefined ? a.length !== 8 : a.length + b.length > 7) return null;
  const all = tl === undefined ? a : [...a, ...Array(8 - a.length - b.length).fill('0'), ...b];
  if (all.some(x => !/^[0-9a-f]{1,4}$/.test(x))) return null;
  return all.map(x => parseInt(x, 16));
}
export function isPrivateV6(ip) {
  const g = groups6(ip); if (!g) return true;
  const v4 = (x, y) => `${x >> 8}.${x & 255}.${y >> 8}.${y & 255}`;
  if (g.slice(0, 5).every(x => x === 0) && (g[5] === 0xffff || g[5] === 0)) return isPrivateV4(v4(g[6], g[7])); // ::ffff:a.b.c.d · ::a.b.c.d (gồm :: và ::1)
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every(x => x === 0)) return isPrivateV4(v4(g[6], g[7])); // NAT64
  if (g[0] === 0x2002) return isPrivateV4(v4(g[1], g[2])); // 6to4
  if (g[0] === 0x2001 && (g[1] === 0 || g[1] === 0xdb8)) return true; // Teredo · tài liệu
  return (g[0] & 0xe000) !== 0x2000; // chỉ nhận unicast toàn cầu 2000::/3 (chặn fc00::/7, fe80::/10, ff00::/8, 100::/64, …)
}
export const isPrivateIp = ip => String(ip).includes(':') ? isPrivateV6(ip) : isPrivateV4(ip);

/** Kiểm URL thô (chưa phân giải DNS) → URL đã chuẩn hóa; ném { code: 'badurl' | 'blocked' } */
export function checkUrl(raw) {
  let u; try { u = new URL(String(raw || '').trim()); } catch (e) { throw err('badurl'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw err('badurl');
  if (u.username || u.password) throw err('blocked');
  if (u.port && u.port !== '80' && u.port !== '443') throw err('blocked');
  const h = u.hostname.replace(/\.$/, '').toLowerCase();
  if (!h || h.length > 253) throw err('badurl');
  if (h.startsWith('[')) { if (isPrivateV6(h)) throw err('blocked'); }
  else if (/^[\d.]+$/.test(h) || /^0x/i.test(h.split('.').pop())) { if (isPrivateV4(h)) throw err('blocked'); }
  else if (!h.includes('.') || BAD_HOST.test(h)) throw err('blocked');
  return u;
}

/** Phân giải A + AAAA qua DoH của Cloudflare (miễn phí). Trả mảng IP; ném 'dns' khi không phân giải được */
export async function resolveHost(host, f = fetch) {
  const one = async type => {
    const r = await f(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`, { headers: { Accept: 'application/dns-json' }, signal: AbortSignal.timeout(3000) });
    if (!r.ok) throw err('dns');
    const j = await r.json(); return (j.Answer || []).filter(a => a.type === (type === 'A' ? 1 : 28)).map(a => String(a.data));
  };
  let ips; try { ips = (await Promise.all([one('A'), one('AAAA')])).flat(); } catch (e) { throw err('dns'); }
  if (!ips.length) throw err('dns');
  return ips;
}

// ---------- Rút chữ bài chính (không phụ thuộc, tuyến tính – không regex lồng lặp) ----------
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1); return n > 0 && n < 0x110000 && !(n >= 0xd800 && n < 0xe000) ? String.fromCodePoint(n) : ' '; }
  return ENT[e.toLowerCase()] ?? m;
});
function stripBlocks(html, tags) { // bỏ <tag>…</tag> bằng indexOf + ghép mảnh (tuyến tính, không regex lười → không bị "bom" thẻ mở)
  for (const t of tags) {
    const low = html.toLowerCase(), parts = []; let i = 0, at = 0;
    for (;;) {
      const s = low.indexOf('<' + t, i); if (s < 0) break;
      const nx = low.charCodeAt(s + t.length + 1); if (nx > 32 && nx !== 62 && nx !== 47) { i = s + 1; continue; } // <articles ≠ <article
      const j = low.indexOf('</' + t, s), k = j < 0 ? -1 : low.indexOf('>', j), end = k < 0 ? html.length : k + 1;
      parts.push(html.slice(at, s), ' '); at = i = end;
    }
    if (at) { parts.push(html.slice(at)); html = parts.join(''); }
  }
  return html;
}
const meta = (html, re) => { const m = re.exec(html); return m ? decode(m[1] || m[2] || '').replace(/\s+/g, ' ').trim() : ''; };
export function extract(raw, isHtml = true) {
  let title = '', text = String(raw);
  if (isHtml) {
    const head = raw.slice(0, 200000);
    title = meta(head, /<meta[^>]+property=["']og:title["'][^>]+content=(?:"([^"]*)"|'([^']*)')/i) || meta(head, /<title[^>]*>([^<]*)</i);
    let h = stripBlocks(raw.replace(/<!--[\s\S]*?-->/g, ' '), ['script', 'style', 'noscript', 'svg', 'template', 'iframe', 'head', 'nav', 'footer', 'aside', 'form', 'button', 'select']);
    const low = h.toLowerCase();
    for (const tag of ['article', 'main']) { const a = low.indexOf('<' + tag), z = low.lastIndexOf('</' + tag); if (a >= 0 && z > a + 400) { h = h.slice(a, z); break; } } // chỉ lấy khi đủ dài (tránh <article> chỉ là thẻ bên lề)
    text = decode(h.replace(/<\/?(?:p|div|br|li|ul|ol|h[1-6]|tr|section|blockquote|pre|figcaption|table|dd|dt)\b[^<>]*>/gi, '\n').replace(/<[^<>]*>/g, ' '));
    if (!title) title = meta(h, /<h1[^>]*>([^<]*)</i);
  }
  const lines = text.split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(l => l.length > 0 && (!isHtml || l.length >= 40 || /[.!?…”"]$/.test(l) || l.split(' ').length >= 6)); // bỏ dòng menu ngắn không câu
  return { title: title.slice(0, 120), text: lines.join('\n').slice(0, MAX_TEXT) };
}

async function readCapped(res) { // đọc luồng tới trần; vượt → 'toobig'
  const len = +res.headers.get('Content-Length') || 0; if (len > MAX_BYTES) throw err('toobig');
  if (!res.body) { const b = new Uint8Array(await res.arrayBuffer()); if (b.length > MAX_BYTES) throw err('toobig'); return b; }
  const rd = res.body.getReader(), parts = []; let n = 0;
  for (;;) { const { done, value } = await rd.read(); if (done) break; n += value.length; if (n > MAX_BYTES) { try { await rd.cancel(); } catch (e) { /* bỏ qua */ } throw err('toobig'); } parts.push(value); }
  const out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out;
}

/** Tải + rút chữ. deps: { fetch, resolve } để kiểm thử. Ném { code } thay vì trả lỗi lạ. */
export async function readArticle(raw, { fetch: f = fetch, resolve = h => resolveHost(h, f) } = {}) {
  let u = checkUrl(raw);
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const host = u.hostname.replace(/\.$/, '');
    if (!/^[\d.]+$/.test(host) && !host.startsWith('[')) { const ips = await resolve(host); if (!ips.length || ips.some(isPrivateIp)) throw err('blocked'); }
    let res; try { res = await f(u.href, { method: 'GET', redirect: 'manual', credentials: 'omit', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LexkiteReader/1.0; +https://lexkite.com)', Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9', 'Accept-Language': 'en' }, signal: AbortSignal.timeout(FETCH_MS) }); }
    catch (e) { throw err('fetch'); }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('Location'); try { await res.body?.cancel(); } catch (e) { /* bỏ qua */ }
      if (!loc || hop === MAX_HOPS) throw err('fetch');
      let nx; try { nx = new URL(loc, u); } catch (e) { throw err('fetch'); }
      u = checkUrl(nx.href); continue; // kiểm lại SSRF ở MỌI bước chuyển hướng
    }
    if (!res.ok) { try { await res.body?.cancel(); } catch (e) { /* bỏ qua */ } throw err('fetch'); }
    const ct = String(res.headers.get('Content-Type') || '').split(';')[0].trim();
    if (!TYPES.test(ct)) { try { await res.body?.cancel(); } catch (e) { /* bỏ qua */ } throw err('type'); }
    const bytes = await readCapped(res), cs = (/charset=["']?([\w-]+)/i.exec(res.headers.get('Content-Type') || '') || [])[1];
    let s; try { s = new TextDecoder(cs || 'utf-8').decode(bytes); } catch (e) { s = new TextDecoder('utf-8').decode(bytes); }
    const out = extract(s, ct.toLowerCase() !== 'text/plain');
    if (out.text.length < MIN_TEXT) throw err('empty');
    return { title: out.title, text: out.text, host: u.hostname, chars: out.text.length };
  }
  throw err('fetch');
}

const STATUS = { badurl: 400, blocked: 403, type: 415, toobig: 413, empty: 422, dns: 502, fetch: 502 };
export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: cors(request) });
export async function onRequestPost({ request, env }) {
  const o = request.headers.get('Origin'); if (o && !ORIGINS.test(o)) return json(request, 403, { error: 'origin' });
  if (+(request.headers.get('Content-Length') || 0) > 4096) return json(request, 413, { error: 'size' });
  let body; try { body = await request.json(); } catch (e) { return json(request, 400, { error: 'json' }); }
  const url = body && typeof body.url === 'string' ? body.url : ''; if (!url || url.length > 2048) return json(request, 400, { error: 'badurl' });
  const q = await gate(request, env || {}, 'readable', { json }); if (q.res) return q.res; // hết lượt/burst/khóa → 429 { error:'quota', … }
  try { return json(request, 200, await readArticle(url)); }
  catch (e) { const c = e && e.code; return json(request, STATUS[c] || 502, { error: STATUS[c] ? c : 'fetch' }); } // không lộ chi tiết nội bộ
}
