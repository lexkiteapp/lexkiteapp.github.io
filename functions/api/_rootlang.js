/* Chọn ngôn ngữ cho "/" (functions/index.js). Thứ tự chủ chốt 4/11: cookie người dùng đã chọn → nước theo IP (GEO) → Accept-Language → en.
 * Thuần, chỉ phụ thuộc bảng GEO sinh tự động để hàm không bao giờ hỏng vì mã khác. */
import { GEO } from './_geo.gen.js';
export const LANGS = ['vi', 'en', 'es', 'ja', 'id', 'pt', 'fr', 'de', 'tr', 'ru', 'ar', 'hi', 'ko', 'zh', 'th'];
export const COOKIE = 'lk_lang';
const ALIAS = { in: 'id' };
/** Accept-Language → mã ngôn ngữ theo thứ tự q giảm dần (bỏ q=0, '*'; giữ thứ tự gốc khi q bằng nhau). */
export function parseAL(h) {
  return String(h || '').split(',').map((part, i) => {
    const [tag, ...ps] = part.trim().split(';'), m = /^q=([\d.]+)$/i.exec((ps.find(p => /^\s*q=/i.test(p)) || '').trim());
    const lang = tag.trim().toLowerCase().split('-')[0], q = m ? +m[1] : 1;
    return { l: ALIAS[lang] || lang, q: Number.isFinite(q) ? q : 0, i };
  }).filter(x => x.l && x.l !== '*' && x.q > 0).sort((a, b) => b.q - a.q || a.i - b.i).map(x => x.l);
}
/** Giá trị cookie lk_lang nếu là 1 trong 15 ngôn ngữ; giá trị lạ bị bỏ qua. */
export function cookieLang(h) {
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([a-z]{2})(?:;|$)`).exec(String(h || ''));
  return m && LANGS.includes(m[1]) ? m[1] : null;
}
export function pickLang(cookie, country, al) {
  const c = cookieLang(cookie); if (c) return c;
  const home = Object.hasOwn(GEO, String(country || '').toUpperCase()) ? GEO[String(country).toUpperCase()] : null;
  if (home && LANGS.includes(home)) return home;
  return parseAL(al).find(l => LANGS.includes(l)) || 'en';
}
/** Đích 302, giữ query. vi kèm ?r=1: trình duyệt có thể đã lưu 301 cũ /vi/ → / (301 không hạn dùng, Chromium coi là tươi vô hạn) → không có dấu này sẽ lặp vô tận. */
export function rootTarget(cookie, country, al, search = '') {
  const l = pickLang(cookie, country, al), s = String(search || '').replace(/^\?/, '');
  if (l !== 'vi') return `/${l}/${s ? '?' + s : ''}`;
  return `/vi/?r=1${s ? '&' + s : ''}`;
}
