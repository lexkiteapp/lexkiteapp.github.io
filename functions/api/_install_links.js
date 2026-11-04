/* Link cài Lexkite: hàm thuần cho web build, video, social, Functions (không I/O). Dữ liệu: infra/install-links.json → _install_data.js (tự sinh).
 * Kênh url rỗng không bao giờ được trả về → không nút chết. Tham số đo: CWS/Edge/Firefox utm_* · Play referrer=utm_* · App Store ct= (≤ 40 ký tự, luật Apple).
 * Trang /get tự chuyển theo thiết bị, đọc src + c → cùng tham số. Test: scripts/test/install-links.mjs. Luật video: docs/VIDEO.md. */
import { INSTALL } from './_install_data.js';

export { INSTALL };
const ORDER = ['ios', 'play', 'cws', 'edge', 'firefox'];
/** Kênh đang có listing, đúng thứ tự hiện. */
export const liveChannels = (D = INSTALL) => ORDER.filter(id => D.channels[id] && D.channels[id].url).map(id => ({ ...D.channels[id], id }));
const slug = (s, n) => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, n);
const q = u => u + (u.includes('?') ? '&' : '?');
const utm = (s, m, c) => `utm_source=${s}&utm_medium=${m}&utm_campaign=${c}`;

/** Link cửa hàng có nguồn đo. Kênh chưa có listing → ''. */
export function trackUrl(id, { source = 'lexkite.com', medium = 'install', campaign = 'general' } = {}, D = INSTALL) {
  const ch = D.channels[id], s = slug(source, 40), m = slug(medium, 30), c = slug(campaign, 60);
  if (!ch || !ch.url) return '';
  if (id === 'play') return q(ch.url) + 'referrer=' + encodeURIComponent(utm(s, m, c));
  if (id === 'ios') return q(ch.url) + 'ct=' + `${s}_${c}`.slice(0, 40);
  return q(ch.url) + utm(s, m, c);
}
/** Trang cài ngắn, tự chuyển theo thiết bị: https://lexkite.com/get?src=tiktok&c=clip-id */
export function shortUrl(source = '', campaign = '', D = INSTALL) {
  const s = slug(source, 40), c = slug(campaign, 60), p = [s && `src=${s}`, c && `c=${c}`].filter(Boolean).join('&');
  return D.site + D.short.path + (p ? '?' + p : '');
}
/** Chữ CTA trong hình: chỉ nhãn ngắn, không dán link cửa hàng dài vào video. */
export const ctaLabel = (D = INSTALL) => D.short.label;
const norm = p => String(p || '').toLowerCase().replace(/[^a-z_]/g, '').replace(/^facebook$/, 'facebook_page').replace(/^(ig|insta)$/, 'instagram').replace(/^yt$/, 'youtube').replace(/^x$/, 'twitter');
const LONG = new Set(['youtube', 'facebook_page']); // mô tả dài, link bấm được: liệt kê từng cửa hàng; còn lại 1 link ngắn
/** Dòng link cài cho mô tả/caption video theo nền tảng đăng. */
export function installLines(platform, clip = '', D = INSTALL) {
  const p = norm(platform) || 'social';
  if (!LONG.has(p)) return [`Get the app free: ${shortUrl(p, clip, D)}`];
  return ['Get the app free:', ...liveChannels(D).map(ch => `${ch.name}: ${trackUrl(ch.id, { source: p, medium: 'video', campaign: clip || 'general' }, D)}`)];
}
/** Gắn link cài vào caption (không gắn đôi, luôn giữ nguyên hashtag cuối, không vượt trần ký tự của nền tảng). */
export function withInstall(caption, platform, clip = '', limit = 0, D = INSTALL) {
  const text = String(caption || '').trim();
  if (text.includes(D.short.label) || liveChannels(D).some(ch => text.includes(ch.url))) return text;
  const block = installLines(platform, clip, D).join('\n'), parts = text.split('\n\n'), last = parts[parts.length - 1] || '';
  const tags = parts.length > 1 && /^(#\S+\s*)+$/.test(last) ? parts.pop() : '';
  const tail = [block, tags].filter(Boolean).join('\n\n');
  const room = limit ? Math.max(0, limit - tail.length - 2) : Infinity, head = parts.join('\n\n').slice(0, room).trim();
  return [head, tail].filter(Boolean).join('\n\n');
}
