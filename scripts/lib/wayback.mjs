// Wayback Machine Save Page Now (ẩn danh, miễn phí): lưu 1 URL, trả { ok, snapshotUrl, status }.
// Mốc thời gian lấy từ header Location/Content-Location của /save/; không có → hỏi API availability (bản chụp ≤ 3 giờ).
// 429 (quá tần suất) → chờ rồi thử lại 1 lần. Dùng chung: scripts/wayback-snapshot.mjs (bài mới, sitemap), scripts/tm-evidence.mjs.
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const UA_WB = 'Lexkite-evidence/1.0 (+https://lexkite.com; support@lexkite.com)';
export const SNAP_RE = /^https:\/\/web\.archive\.org\/web\/(\d{14})\//;
const abs = l => (l.startsWith('http') ? l : `https://web.archive.org${l}`);
export async function saveSnapshot(url, { fetchImpl = fetch, wait = sleep, retryMs = 60e3 } = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    let r;
    try { r = await fetchImpl(`https://web.archive.org/save/${url}`, { redirect: 'manual', headers: { 'User-Agent': UA_WB }, signal: AbortSignal.timeout(120e3) }); }
    catch (e) { return { ok: false, error: e.message }; }
    if (r.status === 429 && attempt === 0) { await wait(retryMs); continue; }
    const loc = r.headers.get('location') || r.headers.get('content-location') || '';
    if (loc && SNAP_RE.test(abs(loc))) return { ok: true, snapshotUrl: abs(loc), status: r.status };
    if (r.status >= 200 && r.status < 400) { const s = await latest(url, fetchImpl); if (s) return { ok: true, snapshotUrl: s, status: r.status }; }
    return { ok: false, status: r.status, error: `HTTP ${r.status}` };
  }
  return { ok: false, status: 429, error: 'HTTP 429' };
}
// Bản chụp mới nhất ≤ maxAgeH giờ (API availability) – null nếu không có
export async function latest(url, fetchImpl = fetch, maxAgeH = 3, now = Date.now()) {
  try {
    const j = await (await fetchImpl(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}&timestamp=${new Date(now).toISOString().replace(/\D/g, '').slice(0, 14)}`, { headers: { 'User-Agent': UA_WB } })).json();
    const c = j && j.archived_snapshots && j.archived_snapshots.closest; if (!c || !c.available) return null;
    const t = c.timestamp, ms = Date.UTC(+t.slice(0, 4), +t.slice(4, 6) - 1, +t.slice(6, 8), +t.slice(8, 10), +t.slice(10, 12), +t.slice(12, 14));
    return now - ms <= maxAgeH * 3600e3 ? c.url.replace(/^http:/, 'https:') : null;
  } catch { return null; }
}
// sitemap.xml (index hoặc urlset) → [{ loc, lastmod }]
export function parseSitemap(xml) {
  const out = [], re = /<(url|sitemap)>([\s\S]*?)<\/\1>/g; let m;
  while ((m = re.exec(xml))) { const loc = (m[2].match(/<loc>\s*([^<\s]+)\s*<\/loc>/) || [])[1], lastmod = (m[2].match(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/) || [])[1] || ''; if (loc) out.push({ kind: m[1], loc: loc.replace(/&amp;/g, '&'), lastmod }); }
  return out;
}
// Hàng đợi lưu: trang chưa từng lưu hoặc đổi sau lần lưu cuối (lastmod > ngày lưu), mới đổi trước; tối đa max
export function pickChanged(pages, archived, max) {
  const q = pages.filter(p => { const a = archived.get(p.loc); return !a || (p.lastmod && p.lastmod.slice(0, 10) > a.slice(0, 10)); });
  return q.sort((a, b) => (b.lastmod || '').localeCompare(a.lastmod || '') || a.loc.localeCompare(b.loc)).slice(0, max);
}
