// Bù metadata cho shorts/index.json trước khi dựng manifest thư viện (drive-shorts.yml): clip không có gói publish/<lesson>.json thì title/point/cefr trống,
// khiến bài social ra tiêu đề kiểu "Cine-news-…-en". Lấy từ content/video/cine/news/<lesson>.json; thêm hook + url (trang có thật) cho socialMeta.
//   node scripts/video/shorts-meta.mjs --repo /tmp/shorts
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { titleOf } from '../lib/video-web.mjs';

const SITE = 'https://lexkite.com';
/** hook_type của bài học → khóa HOOKS trong functions/api/_role_meta.js. Không khớp → để trống, socialMeta tự xoay. */
export const hookOf = t => { t = String(t || ''); return /mistake|fix|wrong/.test(t) ? 'mistake' : /quiz|challenge|test/.test(t) ? 'challenge' : /ways|number|list/.test(t) ? 'number' : /surpris|myth/.test(t) ? 'surprise' : /pov|native/.test(t) ? 'pov' : /question/.test(t) ? 'question' : ''; };
/** Link trang có thật: trang /video/<slug>/ nếu clip đã lên web; không thì link trong mô tả gói (bỏ query, giữ #); cuối cùng là app. Không bao giờ dựng /video/<id>/ (404). */
export function urlOf(it, page) {
  if (page && page.slug) return `${SITE}/video/${page.slug}/`;
  const m = /https:\/\/lexkite\.com\/[^\s]*/.exec(String(it.description || ''));
  if (m) { const u = new URL(m[0]); return u.origin + u.pathname + u.hash; }
  return SITE + '/app/';
}
/** Điền trường còn trống, không ghi đè nội dung đã có. → số clip được đổi. */
export function fillMeta(items, { lessonOf, pages = new Map() }) {
  let n = 0;
  for (const it of items) {
    const L = lessonOf(it.lesson) || {}, before = JSON.stringify(it), page = pages.get(it.lesson);
    const P = L.publish || {};
    if (P.title) it.title = P.title; else if (!it.title && L.point) it.title = titleOf(L); // khối publish (viết lúc sản xuất) thắng tiêu đề ghép
    if (P.keyword) it.keyword = P.keyword;
    if (P.value) it.value = P.value;
    if (Array.isArray(P.hashtags) && P.hashtags.length) it.hashtags = P.hashtags;
    if (typeof P.first_comment === 'string' && P.first_comment.includes('{link}')) it.first_comment = P.first_comment; // bình luận đầu viết lúc sản xuất (functions/api/_first_comment.js)
    const lang = String(P.lang || L.lang || '').toLowerCase(); if (/^[a-z]{2}$/.test(lang)) it.lang = lang; // ngôn ngữ người học của clip → đúng fanpage (_distribution.js langOfChannel); trống = 'en' (page chung)
    for (const [k, v] of [['point', L.point], ['cefr', L.cefr], ['area', L.area]]) if (!it[k] && v) it[k] = v;
    const hook = hookOf(L.hook_type); if (!it.hook && hook) it.hook = hook;
    if (page && page.slug) it.slug = page.slug;
    it.url = urlOf(it, page);
    if (JSON.stringify(it) !== before) n++;
  }
  return n;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2), repo = a[a.indexOf('--repo') + 1] || '/tmp/shorts', IDX = path.join(repo, 'shorts', 'index.json');
  const J = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };
  const idx = J(IDX), web = J('web/data/videos.json') || { items: [] };
  if (!idx) { console.error('✗ không đọc được ' + IDX); process.exit(1); }
  const n = fillMeta(idx.items, { lessonOf: id => (/^[a-z0-9_-]{1,120}$/i.test(String(id || '')) ? J(`content/video/cine/news/${id}.json`) : null), pages: new Map(web.items.map(x => [x.id, x])) });
  if (n) fs.writeFileSync(IDX, JSON.stringify(idx, null, 1));
  const live = idx.items.filter(x => !x.rejected && !x.paused), empty = live.filter(x => !x.title && !x.point);
  console.log(`shorts-meta: bù ${n} clip · clip đang dùng ${live.length}, thiếu tiêu đề ${empty.length}`);
  if (empty.length) console.log('::warning::clip thiếu metadata, autopilot sẽ không đăng: ' + empty.slice(0, 10).map(x => x.id).join(' '));
}
