/* 🎬 Học qua video – dữ liệu YouTube hợp lệ cho #/watch (web/js/watch.js, docs/specs/video-learn.md).
 * GET /api/watch?op=info&id=<11>          → { id, title, ch, thumb } qua oEmbed công khai (không khóa, không quota), đệm 7 ngày
 * GET /api/watch?op=feed&ch=UC…,UC…       → { items:[{id,title,ch,at}] } từ RSS kênh công khai (≤ 6 kênh), đệm 6 giờ
 * GET /api/watch?op=search&q=…&dur=&cc=1  → { items:[{id,title,ch,at,sec,cc}] } qua YouTube Data API v3 (khóa YOUTUBE_SEARCH_KEY, dự án GCP RIÊNG –
 *   không đụng 10k đơn vị upload của youtube.js). Một lượt = search.list 100 + videos.list 1 = 101 đơn vị; đếm theo ngày Pacific trong D1 watch_quota,
 *   trần WATCH_SEARCH_UNITS (mặc định 9000, 0 = tắt). Đệm: Cache API ở biên 24 giờ → D1 watch_cache 7 ngày (Developer Policies: dữ liệu API ≤ 30 ngày).
 *   Hết hạn mức / không có khóa / lỗi → 200 { items:[], fallback:<link YouTube search> } để giao diện vẫn mở được YouTube.
 * Không tải/lưu video hay âm thanh, không scrape trang hay phụ đề nội bộ của YouTube; chỉ gửi từ khóa (không id người học). Tốc độ theo IP (limit ở biên). */
import { limit } from './sync.js';

const ORIGINS = /^(https:\/\/((www\.)?lexkite\.com|([a-z0-9-]+\.)?lexkite\.pages\.dev)|https?:\/\/localhost(:\d+)?|capacitor:\/\/localhost|chrome-extension:\/\/[a-z]{32})$/;
export const UNITS = 101, CAP = 9000, EDGE_S = { info: 7 * 86400, feed: 6 * 3600, search: 86400 }, D1_TTL = 7 * 864e5;
const cors = req => { const o = req.headers.get('Origin') || ''; return ORIGINS.test(o) ? { 'Access-Control-Allow-Origin': o, Vary: 'Origin' } : {}; };
const json = (req, status, data, maxAge = 0) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': maxAge ? `public, max-age=${Math.min(maxAge, 3600)}` : 'no-store', ...cors(req) } });

export const VID = /^[A-Za-z0-9_-]{11}$/, CHID = /^UC[A-Za-z0-9_-]{22}$/;
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };
export const unxml = s => String(s || '').replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e] != null ? ENT[e] : m));
/** RSS kênh YouTube (feeds/videos.xml) → [{id,title,ch,at}] */
export function parseRss(xml) {
  const out = [];
  for (const m of String(xml || '').matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const e = m[1], id = (e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
    if (!id || !VID.test(id)) continue;
    out.push({ id, title: unxml((e.match(/<title>([^<]*)<\/title>/) || [])[1]).trim(), ch: unxml((e.match(/<author>\s*<name>([^<]*)<\/name>/) || [])[1]).trim(), at: (e.match(/<published>([^<]+)<\/published>/) || [])[1] || '' });
  }
  return out;
}
/** ISO 8601 (PT1H2M3S) → giây */
export const isoSec = d => { const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(d || '')); return m ? ((+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0)) : 0; };
export const normQ = q => String(q || '').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}' -]+/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
export const pacificDay = (now = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
export const ytSearchUrl = q => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
const DUR = new Set(['short', 'medium', 'long']);
async function sha(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].slice(0, 12).map(x => x.toString(16).padStart(2, '0')).join(''); }
const edge = () => { try { return /** @type {any} */ (caches).default; } catch (e) { return null; } };
async function edgeGet(key) { const c = edge(); if (!c) return null; try { const r = await c.match(new Request('https://watch.lexkite.internal/' + key)); return r ? await r.json() : null; } catch (e) { return null; } }
async function edgePut(key, data, s) { const c = edge(); if (!c) return; try { await c.put(new Request('https://watch.lexkite.internal/' + key), new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=' + s } })); } catch (e) { /* bỏ qua */ } }

let ready = false;
async function setup(db) {
  if (ready) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS watch_quota (day TEXT PRIMARY KEY, units INTEGER NOT NULL) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS watch_cache (h TEXT PRIMARY KEY, out TEXT NOT NULL, at INTEGER NOT NULL) WITHOUT ROWID'),
  ]);
  ready = true;
}
/** Giữ chỗ 101 đơn vị trong ngày Pacific; false = hết trần. Một câu UPDATE có điều kiện → không vượt trần khi nhiều yêu cầu cùng lúc. */
export async function take(db, cap, now = Date.now()) {
  const day = pacificDay(now);
  await db.prepare('INSERT INTO watch_quota (day, units) VALUES (?1, 0) ON CONFLICT(day) DO NOTHING').bind(day).run();
  const r = await db.prepare('UPDATE watch_quota SET units = units + ?2 WHERE day = ?1 AND units + ?2 <= ?3 RETURNING units').bind(day, UNITS, cap).first();
  return !!r;
}

async function info(id) {
  const r = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id));
  if (r.status === 401 || r.status === 403) return { id, embeddable: false };
  if (!r.ok) return null;
  const j = await r.json();
  return { id, title: String(j.title || '').slice(0, 200), ch: String(j.author_name || '').slice(0, 100), thumb: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`, embeddable: true };
}
async function feedOne(ch) {
  const k = 'feed/' + ch, hit = await edgeGet(k); if (hit) return hit;
  const r = await fetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + ch);
  const items = r.ok ? parseRss(await r.text()).slice(0, 15) : [];
  await edgePut(k, items, r.ok ? EDGE_S.feed : 600);
  return items;
}
export async function search(env, q, dur, cc) {
  const fb = { items: [], fallback: ytSearchUrl(q) }, cap = env.WATCH_SEARCH_UNITS == null || env.WATCH_SEARCH_UNITS === '' ? CAP : +env.WATCH_SEARCH_UNITS;
  if (!env.YOUTUBE_SEARCH_KEY || !(cap > 0) || !env.DB) return { ...fb, why: 'off' };
  const db = env.DB, h = await sha([q, dur, cc].join('|')), now = Date.now();
  await setup(db);
  const row = await db.prepare('SELECT out, at FROM watch_cache WHERE h = ?').bind(h).first();
  if (row && now - row.at < D1_TTL) return JSON.parse(row.out);
  if (!(await take(db, cap, now))) return row ? JSON.parse(row.out) : { ...fb, why: 'quota' }; // hết trần → bản đệm cũ (vẫn ≤ 30 ngày nhờ dọn bên dưới) hoặc mở YouTube
  const p = new URLSearchParams({ part: 'snippet', type: 'video', maxResults: '12', q, videoEmbeddable: 'true', safeSearch: 'strict', relevanceLanguage: 'en', key: env.YOUTUBE_SEARCH_KEY });
  if (DUR.has(dur)) p.set('videoDuration', dur);
  if (cc) p.set('videoCaption', 'closedCaption');
  const r = await fetch('https://www.googleapis.com/youtube/v3/search?' + p);
  if (!r.ok) return { ...fb, why: 'api' };
  const j = await r.json(), list = (j.items || []).filter(x => x.id && VID.test(x.id.videoId || ''));
  const ids = list.map(x => x.id.videoId), det = {};
  if (ids.length) {
    const d = await fetch('https://www.googleapis.com/youtube/v3/videos?' + new URLSearchParams({ part: 'contentDetails', id: ids.join(','), key: env.YOUTUBE_SEARCH_KEY })).then(x => (x.ok ? x.json() : {})).catch(() => ({}));
    for (const v of d.items || []) det[v.id] = { sec: isoSec(v.contentDetails && v.contentDetails.duration), cc: !!(v.contentDetails && v.contentDetails.caption === 'true') };
  }
  const out = { items: list.map(x => ({ id: x.id.videoId, title: unxml(x.snippet.title).slice(0, 200), ch: unxml(x.snippet.channelTitle).slice(0, 100), at: x.snippet.publishedAt || '', ...(det[x.id.videoId] || {}) })) };
  await db.batch([
    db.prepare('INSERT OR REPLACE INTO watch_cache (h, out, at) VALUES (?1, ?2, ?3)').bind(h, JSON.stringify(out), now),
    db.prepare('DELETE FROM watch_cache WHERE at < ?').bind(now - 30 * 864e5), // không giữ dữ liệu API quá 30 ngày
  ]);
  return out;
}

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: { ...cors(request), 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Max-Age': '86400' } });

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url), op = u.searchParams.get('op'), ip = request.headers.get('CF-Connecting-IP') || 'x';
  try {
    if (op === 'info') {
      const id = u.searchParams.get('id') || '';
      if (!VID.test(id)) return json(request, 400, { error: 'id' });
      const k = 'info/' + id, hit = await edgeGet(k); if (hit) return json(request, 200, hit, EDGE_S.info);
      { const w = await limit(`watch-info:${ip}`, 60, 600); if (w) return json(request, 429, { error: 'too-fast', wait: w }); }
      const d = await info(id); if (!d) return json(request, 404, { error: 'not-found' });
      await edgePut(k, d, EDGE_S.info); return json(request, 200, d, EDGE_S.info);
    }
    if (op === 'feed') {
      const chs = [...new Set(String(u.searchParams.get('ch') || '').split(','))].filter(c => CHID.test(c)).slice(0, 6);
      if (!chs.length) return json(request, 400, { error: 'ch' });
      { const w = await limit(`watch-feed:${ip}`, 60, 600); if (w) return json(request, 429, { error: 'too-fast', wait: w }); }
      const all = (await Promise.all(chs.map(c => feedOne(c).catch(() => [])))).flat().sort((a, b) => (a.at < b.at ? 1 : -1));
      return json(request, 200, { items: all.slice(0, 40) }, EDGE_S.feed);
    }
    if (op === 'search') {
      const q = normQ(u.searchParams.get('q')), dur = u.searchParams.get('dur') || '', cc = u.searchParams.get('cc') === '1';
      if (q.length < 2) return json(request, 400, { error: 'q' });
      const k = 'search/' + (await sha([q, dur, cc].join('|'))), hit = await edgeGet(k); if (hit) return json(request, 200, hit, EDGE_S.search);
      { const w = await limit(`watch-search:${ip}`, 20, 600); if (w) return json(request, 200, { items: [], fallback: ytSearchUrl(q), why: 'rate', wait: w }); }
      const out = await search(env, q, dur, cc);
      if (!out.fallback) await edgePut(k, out, EDGE_S.search);
      return json(request, 200, out, out.fallback ? 0 : EDGE_S.search);
    }
    return json(request, 400, { error: 'op' });
  } catch (e) { return json(request, op === 'search' ? 200 : 500, op === 'search' ? { items: [], fallback: ytSearchUrl(normQ(u.searchParams.get('q')) || 'english'), why: 'server' } : { error: 'server' }); }
}
