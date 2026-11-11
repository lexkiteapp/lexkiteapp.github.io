/* Nhóm nước theo CPM quảng cáo + chuẩn hoá nguồn truy cập – NGUỒN DUY NHẤT cho Quản trị, scripts/seo/gsc.mjs, lịch nội dung (docs/SEO-ARCH.md §9).
 * HIGH_CPM là GIẢ ĐỊNH (chủ 4/11): khi quảng cáo chạy đủ số liệu, thay bằng RPM thật theo nước từ scripts/ads/report.mjs – chỉ sửa ở file này.
 * Nước → mã GSC (ISO 3166-1 alpha-3, chữ thường). */
export const HIGH_CPM = {
  US: 'usa', GB: 'gbr', CA: 'can', AU: 'aus', NZ: 'nzl', IE: 'irl', DE: 'deu', AT: 'aut', CH: 'che', NL: 'nld', BE: 'bel', LU: 'lux', FR: 'fra',
  SE: 'swe', NO: 'nor', DK: 'dnk', FI: 'fin', IS: 'isl', JP: 'jpn', KR: 'kor', SG: 'sgp', HK: 'hkg', TW: 'twn', AE: 'are', SA: 'sau', QA: 'qat', KW: 'kwt', IL: 'isr', ES: 'esp', IT: 'ita',
};
/** Ngôn ngữ của app gắn thị trường CPM cao mà chưa đủ trang: de (DE/AT/CH), fr (FR/BE/CA/CH), ja, ko, ar (vùng Vịnh). Nước CPM cao không có ngôn ngữ riêng (NL, SE, NO, DK, FI…) dùng trang en, không mở ngôn ngữ mới. */
export const PRIORITY_LANGS = ['de', 'fr', 'ja', 'ko', 'ar'];
/** Trọng số điểm ưu tiên viết: lượt bấm ước tính × (1 + CPM_W × tỉ lệ hiển thị từ nhóm CPM cao). Giả định, chỉnh theo RPM thật. */
export const CPM_W = 1;
const ISO3 = new Set(Object.values(HIGH_CPM));
/** 'US' | 'usa' → 'vn' | 'high' | 'other' */
export function tierOf(c) {
  const s = String(c || '');
  if (/^(vn|vnm)$/i.test(s)) return 'vn';
  return (s.length === 2 ? Object.hasOwn(HIGH_CPM, s.toUpperCase()) : ISO3.has(s.toLowerCase())) ? 'high' : 'other';
}
/** rows [{k: mã nước, n}] → { vn, high, other, total, highPct } (highPct: làm tròn 1 chữ số, null khi chưa có số) */
export function tierShare(rows) {
  const r = { vn: 0, high: 0, other: 0, total: 0 };
  for (const x of rows || []) { if (!x.k || x.k === 'XX' || x.k === 'T1') continue; r[tierOf(x.k)] += +x.n || 0; r.total += +x.n || 0; }
  return { ...r, highPct: r.total ? Math.round(r.high / r.total * 1000) / 10 : null };
}

// Nguồn gộp: mọi tên miền quốc gia/ứng dụng của cùng một công cụ về 1 tên – Quản trị và báo cáo không vỡ thành google.com.vn, google.de, com.google.android…
const SRC = [
  [/^gemini\.google\.|^bard\.google\./, 'gemini.google.com'],
  [/(^|\.)google\.[a-z.]{2,8}$|^com\.google\.android\.(googlequicksearchbox|gm)/, 'google.com'],
  [/(^|\.)bing\.com$/, 'bing.com'], [/(^|\.)yahoo\.[a-z.]{2,8}$/, 'yahoo.com'], [/(^|\.)duckduckgo\.com$/, 'duckduckgo.com'],
  [/(^|\.)(yandex\.[a-z.]{2,8}|ya\.ru)$/, 'yandex.com'], [/(^|\.)naver\.com$/, 'naver.com'], [/(^|\.)daum\.net$/, 'daum.net'], [/(^|\.)baidu\.com$/, 'baidu.com'],
  [/(^|\.)ecosia\.org$/, 'ecosia.org'], [/^search\.brave\.com$/, 'brave.com'], [/(^|\.)coccoc\.com$/, 'coccoc.com'],
  [/(^|\.)(chatgpt\.com|openai\.com)$/, 'chatgpt.com'], [/(^|\.)perplexity\.ai$/, 'perplexity.ai'], [/^copilot\.microsoft\.com$/, 'copilot.microsoft.com'], [/(^|\.)claude\.ai$/, 'claude.ai'],
  [/(^|\.)(facebook\.com|fb\.com)$/, 'facebook.com'], [/(^|\.)instagram\.com$/, 'instagram.com'], [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube.com'], [/(^|\.)reddit\.com$/, 'reddit.com'],
  [/(^|\.)(x\.com|twitter\.com|t\.co)$/, 'x.com'], [/(^|\.)tiktok\.com$/, 'tiktok.com'], [/(^|\.)linkedin\.com$/, 'linkedin.com'], [/(^|\.)pinterest\.[a-z.]{2,8}$/, 'pinterest.com'], [/(^|\.)zalo\.me$/, 'zalo.me'], [/(^|\.)github\.com$/, 'github.com'],
];
const OWN = /(^|\.)lexkite\.(com|pages\.dev|web\.app)$|^lexkiteapp\.github\.io$|^(localhost|127\.0\.0\.1)$/;
const KNOWN = new Set(SRC.map(x => x[1]));
export function srcOf(host) {
  const h = String(host || '').toLowerCase().replace(/^www\./, '');
  if (!h || OWN.test(h)) return '';
  for (const [re, name] of SRC) if (re.test(h)) return name;
  return h;
}
// Loại trang tĩnh theo đoạn đầu đường dẫn (sau /<ngôn ngữ>/). Không có ở đây = không ghi đường dẫn thô.
const KIND = { '': 'landing', blog: 'blog', words: 'words', conversations: 'conversations', samples: 'samples', speaking: 'speaking', 'ielts-writing': 'writing', 'viet-thu': 'writing',
  vocabulary: 'vocab', 'tu-vung': 'vocab', grammar: 'grammar', 'ngu-phap': 'grammar', pronunciation: 'pron', 'phat-am': 'pron', tools: 'tools', 'cong-cu': 'tools', videos: 'video', get: 'get' };
export const kindOf = p => (Object.hasOwn(KIND, String(p ?? '')) ? KIND[String(p ?? '')] : '');
/** b.ref của beacon phiên → giá trị cột sessions.ref: 'site:blog' (đi từ trang tĩnh của mình), tên nguồn gộp, hoặc '' (trực tiếp). */
export function normRef(v) {
  const s = String(v || '');
  if (s.startsWith('site:')) { const k = kindOf(s.slice(5)); return k ? 'site:' + k : ''; }
  try { return s ? srcOf(new URL(s).hostname) : ''; } catch (e) { return ''; }
}
const LANGS = new Set(['vi', 'en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr']);
/** Beacon { t:'l', ref, p, lang } → khoá ext_events 'land:<nguồn>:<nước>:<loại>:<ngôn ngữ>' | '' (bỏ: nguồn là mình/rỗng). Nguồn ngoài danh sách → 'other' để số dòng/ngày có trần. */
export function landKey(b, country) {
  const s = srcOf(String((b && b.ref) || '').slice(0, 200)); if (!s) return '';
  const c = /^[A-Z0-9]{2}$/.test(String(country || '')) ? country : 'XX', lang = String((b && b.lang) || '').toLowerCase().slice(0, 2);
  return `land:${KNOWN.has(s) ? s : 'other'}:${c}:${kindOf(b && b.p) || 'other'}:${LANGS.has(lang) ? lang : 'xx'}`;
}
/** rows [{kind:'land:…', n}] → số liệu Quản trị: theo nguồn, nước, loại trang, ngôn ngữ trang, nhóm CPM */
export function landStats(rows) {
  const by = { src: {}, country: {}, kind: {}, lang: {} }, add = (m, k, n) => { m[k] = (m[k] || 0) + n; }, sorted = m => Object.entries(m).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n || (a.k < b.k ? -1 : 1));
  let total = 0;
  for (const r of rows || []) {
    const a = String(r.kind).split(':'), n = +r.n || 0; if (a[0] !== 'land' || a.length !== 5) continue;
    total += n; add(by.src, a[1], n); add(by.country, a[2], n); add(by.kind, a[3], n); add(by.lang, a[4], n);
  }
  const countries = sorted(by.country);
  return { total, src: sorted(by.src).slice(0, 12), countries: countries.slice(0, 20), kinds: sorted(by.kind), langs: sorted(by.lang), tiers: tierShare(countries) };
}
