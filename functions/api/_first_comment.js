/* Bình luận đầu / self-reply mang link web app cho bài social (docs/DISTRIBUTION.md §6c) – THUẦN, không I/O. Test: scripts/test/social-first-comment.mjs.
 * Luật từng nền tảng (đã kiểm docs chính thức 05/11/2026 – bảng nguồn ở DISTRIBUTION.md §6c):
 *   facebook_page · youtube → 1 bình luận của chính Page/kênh (Graph POST /{object-id}/comments · YouTube commentThreads.insert, scope youtube.force-ssl).
 *   threads · x             → 1 self-reply (Threads POST /{user-id}/threads + reply_to_id · X POST /2/tweets reply.in_reply_to_tweet_id).
 *   instagram · tiktok      → KHÔNG bình luận link (link trong caption/bình luận IG không bấm được; TikTok không có API bình luận) →
 *                             caption ghi "link in bio", link bio = /api/go/<nền tảng>/bio → trang landing nhẹ.
 *   Ghim bình luận: KHÔNG nền tảng nào có API ghim (FB/YouTube/Threads/X) → không ghim, chỉ đăng 1 bình luận ngay khi bài lên.
 * Nội dung bình luận viết lúc sản xuất (khối publish.first_comment, scripts/cine/publish_meta.py chặn ở qc_gate) với đúng 1 chỗ {link};
 * ở đây chỉ thay {link} = link đếm click theo nền tảng + clip, và kiểm lại lần cuối (không tin dữ liệu kho). */
export const SITE = 'https://lexkite.com';
export const FC_MODE = { facebook_page: 'comment', youtube: 'comment', threads: 'reply', x: 'reply', instagram: 'bio', tiktok: 'bio' };
export const FC_CODE = { facebook_page: 'fb', youtube: 'yt', threads: 'th', x: 'x', instagram: 'ig', tiktok: 'tt' };
export const CODE_PLAT = Object.fromEntries(Object.entries(FC_CODE).map(([p, c]) => [c, p]));
export const FC_MAX = { facebook_page: 8000, youtube: 10000, threads: 500, x: 280, instagram: 2200, tiktok: 150 }; // ký tự tối đa của 1 bình luận/self-reply
export const CLIP_RE = /^[a-z0-9][a-z0-9_-]{2,119}$/;
export const LANDING_LANGS = ['en', 'vi', 'es', 'pt', 'fr', 'de', 'id', 'ja', 'ko', 'zh', 'ar', 'hi', 'ru', 'th', 'tr'];
export const FC_DEFAULT = { on: true, per_ch_day: 6, max_tries: 3 }; // ≤ 6 bình luận/kênh/ngày (bằng số bài), ≤ 3 lần thử/bài

/** Link đếm click (functions/api/go/[[path]].js đếm rồi 302 kèm UTM). Ngắn, cùng tên miền lexkite.com (không rút gọn bên thứ ba). */
export const goUrl = (platform, clip) => `${SITE}/api/go/${FC_CODE[platform]}/${encodeURIComponent(clip)}`;
export const bioUrl = (platform, lang = 'en') => `${SITE}/api/go/${FC_CODE[platform]}/bio${lang && lang !== 'en' && LANDING_LANGS.includes(lang) ? '?l=' + lang : ''}`;

const RAW_URL = /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|app|net|org|io)\b/i, TAG = /(^|\s)[#@]\w/, SPAM = /click here|link in (my )?bio|\bdm\b|follow (me|us)|like and (share|subscribe)|smash|check out my|giveaway/i;
/** Kiểm lại lần cuối lúc đăng (cổng chính ở publish_meta.py). → mã lỗi | '' */
export function fcIssue(tpl) {
  const t = typeof tpl === 'string' ? tpl.trim() : '';
  if (!t) return 'missing';
  if (t.split('{link}').length !== 2) return 'link-slot';
  const body = t.replace('{link}', '');
  if (RAW_URL.test(body)) return 'raw-url';
  if (TAG.test(body)) return 'tag';
  if (SPAM.test(body)) return 'spam';
  if (body.length < 15 || body.length > 260) return 'length';
  return '';
}
/** clip (clipOf / clipsFor, có first_comment) × nền tảng → { mode, text, link, why }. text rỗng = không bình luận (why nói lý do). */
export function firstComment(c, platform) {
  const mode = FC_MODE[platform] || 'none';
  if (mode === 'none') return { mode, text: '', link: '', why: 'platform' };
  if (mode === 'bio') return { mode, text: '', link: bioUrl(platform, String((c && c.lang) || 'en')), why: 'bio' };
  const id = String((c && c.id) || ''); if (!CLIP_RE.test(id)) return { mode, text: '', link: '', why: 'bad-clip' };
  const tpl = c.first_comment || (c._it && c._it.first_comment) || '', bad = fcIssue(tpl), link = goUrl(platform, id);
  if (bad) return { mode, text: '', link, why: bad };
  const text = tpl.trim().replace('{link}', link);
  return [...text].length > FC_MAX[platform] ? { mode, text: '', link, why: 'too-long' } : { mode, text, link, why: '' };
}
/** Caption khi đã gắn bình luận đầu: dòng "Full lesson + quiz: <url>" → "… in the first comment 👇" (FB giảm phân phối bài có link; Threads 500 ký tự).
 *  YouTube giữ link (mô tả YouTube bấm được – dòng đầu mô tả). Không có dòng link → giữ nguyên. */
export function fcCaption(caption, platform) {
  const s = String(caption || '');
  if (platform !== 'facebook_page' && platform !== 'threads') return s;
  return s.replace(/^Full lesson \+ quiz: https:\/\/lexkite\.com\/\S*$/m, platform === 'threads' ? 'Full lesson + quiz in the reply below 👇' : 'Full lesson + quiz in the first comment 👇');
}
/** Giới hạn tần suất: ≤ per_ch_day bình luận/kênh/ngày UTC (st.fc = {day, n: {ch: số}}). */
export const fcLeft = (st, cfg, ch, now) => { const d = new Date(now).toISOString().slice(0, 10), f = (st && st.fc) || {}; return Math.max(0, (cfg.per_ch_day || FC_DEFAULT.per_ch_day) - (f.day === d ? +((f.n || {})[ch]) || 0 : 0)); };
export function fcCount(st, ch, now) { const d = new Date(now).toISOString().slice(0, 10); if (!st.fc || st.fc.day !== d) st.fc = { day: d, n: {} }; st.fc.n[ch] = (+st.fc.n[ch] || 0) + 1; }
export function cleanFc(f) {
  f = f && typeof f === 'object' ? f : {};
  const k = (v, lo, hi, d) => { const n = Math.round(+v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
  return { on: f.on !== false, per_ch_day: k(f.per_ch_day, 1, 20, FC_DEFAULT.per_ch_day), max_tries: k(f.max_tries, 1, 5, FC_DEFAULT.max_tries) };
}

// ---------------- Link đếm click /api/go/<p>/<clip|bio> ----------------
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|facebookcatalog|meta-externalagent|twitterbot|slackbot|whatsapp|telegrambot|discordbot|linkedinbot|embedly|preview|skypeuri|headless|lighthouse|curl|wget|python-requests|okhttp|go-http/i;
export const isBot = ua => !ua || BOT.test(String(ua));
/** Đường /api/go/... → { plat, clip|'' (bio), lang } | null (sai dạng → 404, không mở chuyển hướng tùy ý). */
export function parseGo(pathname, search = '') {
  const m = /^\/api\/go\/([a-z]{1,3})\/([A-Za-z0-9_-]{2,120})\/?$/.exec(String(pathname || ''));
  if (!m || !CODE_PLAT[m[1]]) return null;
  const lang = new URLSearchParams(search).get('l') || 'en', bio = m[2] === 'bio';
  if (!bio && !CLIP_RE.test(m[2])) return null;
  return { plat: CODE_PLAT[m[1]], clip: bio ? '' : m[2], lang: LANDING_LANGS.includes(lang) ? lang : 'en' };
}
/** Trang đích (chỉ lexkite.com) + UTM chuẩn: source = nền tảng, medium = social, campaign = id clip (bio: 'bio'), content = first_comment | bio.
 *  slug có trang /video/<slug>/ → trang đó; không → /app/. Bio → landing nhẹ /<lang>/ (en: /en/). */
export function goTarget({ plat, clip, lang = 'en' }, slug = '') {
  const base = clip ? (slug && /^[a-z0-9-]{1,120}$/.test(slug) ? `${SITE}/video/${slug}/` : `${SITE}/app/`) : `${SITE}/${LANDING_LANGS.includes(lang) ? lang : 'en'}/`;
  return `${base}?utm_source=${plat}&utm_medium=social&utm_campaign=${encodeURIComponent(clip || 'bio')}&utm_content=${clip ? 'first_comment' : 'bio'}`;
}
/** Khóa đếm ext_events (theo ngày): tổng theo nền tảng + loại · theo clip (chỉ bình luận). */
export const clickKeys = ({ plat, clip }) => (clip ? [`soc:${plat}:fc`, `socc:${plat}:${clip}`] : [`soc:${plat}:bio`]);
/** rows [{kind, n}] (ext_events, N ngày) → số liệu Quản trị: tổng, theo nền tảng, theo loại (bình luận/bio), top clip. */
export function clickStats(rows) {
  const plats = {}, kinds = { fc: 0, bio: 0 }, clips = {}; let total = 0;
  for (const r of rows || []) {
    const a = String(r.kind || '').split(':'), n = +r.n || 0;
    if (a[0] === 'soc' && a.length === 3 && FC_CODE[a[1]] && (a[2] === 'fc' || a[2] === 'bio')) { total += n; plats[a[1]] = (plats[a[1]] || 0) + n; kinds[a[2]] += n; }
    else if (a[0] === 'socc' && a.length === 3 && FC_CODE[a[1]]) { const k = a[2] + '|' + a[1]; clips[k] = (clips[k] || 0) + n; }
  }
  const sorted = m => Object.entries(m).map(([k, n]) => ({ k, n })).sort((x, y) => y.n - x.n || (x.k < y.k ? -1 : 1));
  return { total, plats: sorted(plats), kinds, top: sorted(clips).slice(0, 10).map(x => ({ clip: x.k.split('|')[0], plat: x.k.split('|')[1], n: x.n })) };
}
