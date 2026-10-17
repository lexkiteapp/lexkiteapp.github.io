/* Ảnh minh họa giấy phép mở cho từ vựng: GET /api/img?w=<word>
 * Gọi Openverse 1 lần/từ rồi lưu đệm ở biên Cloudflare (có ảnh: 30 ngày, không có: 7 ngày) → mọi người dùng dùng chung,
 * không vượt hạn mức ẩn danh của Openverse. Chỉ nhận ảnh thực sự liên quan (tiêu đề/thẻ chứa từ), ưu tiên CC0/PD rồi CC BY. */
import { gate } from './_quota.js';

const H = (body, ttl) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${ttl}`, 'Access-Control-Allow-Origin': '*' } });

function pick(results, word) {
  const stem = word.toLowerCase().replace(/(ies|es|s|ed|ing)$/, '').slice(0, Math.max(4, word.length - 3)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b${stem}`);
  const photo = r => r.thumbnail && !r.mature && !/svg|gif/i.test(r.filetype || '') && !/maki|icon|logo|symbol|emblem|coat of arms|\.svg|\.tif|\.pdf|diagram|chart|map of/i.test(r.title || '')
    && (!r.width || r.width >= 400) && (!r.height || !r.width || (r.width / r.height > 0.6 && r.width / r.height < 2.2));
  const title = r => re.test((r.title || '').toLowerCase()), tags = r => re.test([(r.title || ''), ...(r.tags || []).map(t => t.name || '')].join(' ').toLowerCase());
  const free = r => /cc0|pdm/i.test(r.license || '');
  const words = r => (r.title || '').replace(/\.[a-z]{3,4}$/i, '').split(/[\s_\-–:,.!?()]+/).filter(Boolean);
  const whole = new RegExp(`(^|[^a-z])${stem}[a-z]{0,4}([^a-z]|$)`, 'i');
  const EVENT = /\b(minister|president|chair|ceremony|conference|summit|forum|meeting|briefing|speech|addresses|day|award|festival|society|association|council|committee|campaign|initiative|program(me)?|report|press|launch|logo|poster|flyer|sign|map|chart|diagram|screenshot|slide|book|cover|museum|exhibit|mural|painting|portrait|plan|dictionary|definition|glossary|facebook|twitter|google|microsoft|apple|amazon|youtube|instagram|website|online|internet|privacy|hire|ie\d+|warming|amphibian)\b/i;
  const strict = r => photo(r) && whole.test(r.title || '') && words(r).length <= 2 && !EVENT.test(r.title || ''); // tiêu đề gần như đúng bằng từ ("Market", "Research") – thà không ảnh còn hơn ảnh lạc đề
  return results.find(r => strict(r) && free(r)) || results.find(strict);
}
const thumbOf = r => {
  const u = r.url || '';
  if (/upload\.wikimedia\.org/.test(u)) { const f = decodeURIComponent(u.split('/').pop()); return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=480`; }
  if (/staticflickr\.com/.test(u)) return u.replace(/(_[a-z])?\.jpg$/, '_n.jpg');
  return u || r.thumbnail;
};

// Dự phòng: ảnh đại diện bài Wikipedia tiếng Anh đúng tên từ (vd. library → kệ sách, pollution → khói bụi) – liên quan hơn hẳn tìm theo tên file.
// Chỉ nhận ảnh JPG nằm trên Wikimedia Commons (giấy phép tự do; ảnh "non-free" của Wikipedia nằm ở /wikipedia/en/ → bỏ),
// bỏ trang định hướng; tác giả + giấy phép lấy từ Commons để ghi nguồn đúng.
async function wiki(word) {
  const UA = { headers: { 'User-Agent': 'Lexkite/1.0 (https://lexkite.com; support@lexkite.com)' } };
  const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(word)}`, UA);
  if (!r.ok) return null;
  const d = await r.json(), src = (d.originalimage || {}).source || '';
  if (d.type !== 'standard' || !/\/wikipedia\/commons\//.test(src)) return null;
  const file = decodeURIComponent(src.split('?')[0].split('/').pop().replace(/^\d+px-/, ''));
  if (!/\.jpe?g$/i.test(file) || /museum|mural|painting|portrait|fresco|engraving|lithograph|map|flag|logo|poster|plaque|diagram/i.test(file)) return null; // tranh/bản đồ/biểu đồ không minh họa tốt nghĩa từ
  const q = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent('File:' + file)}&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=480`, UA);
  if (!q.ok) return null;
  const pg = Object.values(((await q.json()).query || {}).pages || {})[0] || {}, ii = (pg.imageinfo || [])[0], m = (ii && ii.extmetadata) || {};
  const strip = h => String(h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const lic = strip((m.LicenseShortName || {}).value);
  if (!ii || !ii.thumburl || !/^(cc0|public domain|cc by(-sa)? [\d.]+)$/i.test(lic)) return null;
  return { src: ii.thumburl, link: ii.descriptionurl, license: lic, title: strip(d.title || word).slice(0, 60), creator: strip((m.Artist || {}).value).slice(0, 80), via: 'Wikimedia Commons' };
}

export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url), word = String(url.searchParams.get('w') || '').toLowerCase().trim().slice(0, 60);
  if (!/^[a-z][a-z' -]*$/.test(word)) return H({ none: true }, 86400);
  const key = new Request(`https://lexkite.com/api/img?w=${encodeURIComponent(word)}&v=5`), cache = caches.default; // v3: Wikipedia trước, Openverse lọc chặt sau → bỏ đệm ảnh lệch nghĩa cũ
  const hit = await cache.match(key); if (hit) return hit;
  // Chỉ lượt trượt bộ đệm mới gọi Wikipedia/Openverse → mới tính hạn mức (theo IP; 429 không được lưu đệm)
  { const q = await gate(request, env || {}, 'img', { who: null, json: (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } }) }); if (q.res) return q.res; }
  let out = { none: true }, ttl = 7 * 86400;
  // 1) Ảnh đại diện bài Wikipedia đúng khái niệm (society → gia đình, climate → mây…) – thường đúng nghĩa hơn ảnh khớp chữ trong tiêu đề
  try { const c = await wiki(word); if (c) { out = c; ttl = 30 * 86400; } } catch (e) { /* thử Openverse */ }
  // 2) Openverse – chỉ nhận ảnh mà từ là chủ thể chính (tiêu đề ngắn, không phải ảnh sự kiện/người phát biểu/tên tổ chức)
  if (out.none) try {
    const r = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(word)}&page_size=20&mature=false&license_type=commercial`, { headers: { 'User-Agent': 'Lexkite/1.0 (https://lexkite.com; support@lexkite.com)' } });
    if (r.ok) {
      const j = await r.json(), x = pick(j.results || [], word);
      if (x) { const lic = (x.license || '').toUpperCase() + (x.license_version && !/cc0|pdm/i.test(x.license) ? ' ' + x.license_version : ''); out = { src: thumbOf(x), link: x.foreign_landing_url || x.url, license: /pdm/i.test(x.license) ? 'Public Domain' : lic, title: (x.title || word).slice(0, 60), creator: x.creator || '' }; ttl = 30 * 86400; }
    } else ttl = 600; // Openverse bận/giới hạn → thử lại sau 10 phút
  } catch (e) { ttl = 600; }
  const res = H(out, ttl);
  waitUntil(cache.put(key, res.clone()));
  return res;
}
