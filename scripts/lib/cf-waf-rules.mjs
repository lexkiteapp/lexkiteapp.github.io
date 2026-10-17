// Bộ dựng luật Cloudflare WAF chống cào nội dung (thuần, không gọi mạng – test ở scripts/test/protection.mjs).
// Dùng bởi scripts/cf-waf.mjs (apply/verify/dry-run). Tài liệu: docs/CONTENT-PROTECTION.md.
// Nguyên tắc: CHỈ nhắm đường dẫn nội dung tĩnh (blog, bài mẫu, từ vựng, ngữ pháp, gói nghĩa); KHÔNG BAO GIỜ /api/*, /sw.js, /js/*,
// /css/*, /icons/*, ảnh/âm thanh; luôn cho qua bot đã xác minh (cf.client.bot: Googlebot, Bingbot…) và CI có header bí mật.

export const LANGS = ['vi', 'en', 'es', 'ja', 'id', 'pt', 'fr', 'de', 'tr', 'ru', 'ar', 'hi', 'ko', 'zh', 'th'];
export const HOSTS = ['lexkite.com', 'www.lexkite.com'];
export const CI_HEADER = 'x-lexkite-ci'; // http.request.headers dùng tên viết thường
export const REF = 'lexkite_'; // tiền tố "ref" đánh dấu luật do script này quản lý (luật khác giữ nguyên)

// Trang HTML nội dung (đúng theo sitemap-pages.xml + blog 15 ngôn ngữ). /blog/ cũ chỉ 301 sang /vi/blog/.
export const HTML_PREFIXES = ['/blog/', ...LANGS.map(l => `/${l}/blog/`), '/tu-vung/', '/ngu-phap/', '/samples/', '/speaking/', '/viet-thu/', '/en/vocabulary/', '/en/samples/', '/en/speaking/'];
// Dữ liệu nội dung app tải lười (trình duyệt thật vẫn qua; chỉ chặn công cụ cào)
export const DATA_PREFIXES = ['/packs/'];
// Không bao giờ nằm trong phạm vi (kiểm ở test): API, service worker, mã/ảnh/âm thanh app
export const NEVER = ['/api/', '/sw.js', '/js/', '/css/', '/icons/', '/audio/', '/img/', '/i18n/', '/screenshots/', '/index.html', '/manifest.webmanifest'];

// Công cụ cào phổ biến (so khớp chữ thường, "contains"). UA trống xử lý riêng.
export const TOOL_UAS = ['python-requests', 'python-urllib', 'python-httpx', 'aiohttp', 'scrapy', 'go-http-client', 'httrack', 'wget', 'libwww', 'okhttp', 'colly'];
export const HEADLESS_UAS = ['headlesschrome', 'phantomjs'];

// Rate limit: gói Free = 1 luật, chu kỳ 10 s, đếm theo IP (+ colo), biểu thức chỉ được dùng đường dẫn + cf.client.bot.
// Một lần mở bài blog = 1 request vào đường dẫn nội dung (ảnh ở media.lexkite.com/blog/… – KHÔNG nằm trong phạm vi RL vì không có
// tiền tố ngôn ngữ; CSS nội tuyến; icon ở /icons/). Người đọc nhanh nhất ~1 trang/giây → 10 req/10 s; 40 chừa dư ×4 cho NAT/CGNAT.
export const RL_DEFAULT = { period: 10, requests: 40, action: 'managed_challenge' };

const q = s => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const path = 'http.request.uri.path';
export const anyPrefix = list => `(${list.map(p => `starts_with(${path}, ${q(p)})`).join(' or ')})`;
const uaAny = list => list.map(u => `lower(http.user_agent) contains ${q(u)}`).join(' or ');
const hostIn = `http.host in {${HOSTS.map(q).join(' ')}}`;

export function exemptions(ciSecret) {
  if (!/^[A-Za-z0-9_-]{24,128}$/.test(ciSecret || '')) throw new Error('CI header secret thiếu hoặc sai dạng (24–128 ký tự [A-Za-z0-9_-])');
  return `not cf.client.bot and not any(http.request.headers[${q(CI_HEADER)}][*] eq ${q(ciSecret)})`;
}

// Trả { custom: [...], ratelimit: [...] } đúng định dạng rules của Rulesets API (phase http_request_firewall_custom / http_ratelimit).
export function buildRules({ ciSecret, rl = {} } = {}) {
  const ex = exemptions(ciSecret), R = { ...RL_DEFAULT, ...rl };
  const notFeeds = `not ends_with(${path}, ".xml")`; // RSS/sitemap: trình đọc RSS, hub WebSub, công cụ SEO luôn đọc được
  const custom = [
    { ref: `${REF}scraper_ua`, description: '[lexkite] Chặn công cụ cào (UA thư viện/UA trống) trên trang nội dung tĩnh', action: 'block', enabled: true,
      expression: `${hostIn} and ${anyPrefix([...HTML_PREFIXES, ...DATA_PREFIXES])} and ${notFeeds} and (http.user_agent eq "" or ${uaAny(TOOL_UAS)}) and ${ex}` },
    { ref: `${REF}headless`, description: '[lexkite] Thử thách trình duyệt headless trên trang HTML nội dung', action: 'managed_challenge', enabled: true,
      expression: `${hostIn} and ${anyPrefix(HTML_PREFIXES)} and ${notFeeds} and (${uaAny(HEADLESS_UAS)}) and ${ex}` },
  ];
  if (!(R.period === 10 && R.requests >= 20 && R.requests <= 200)) throw new Error('rate limit gói Free: period phải 10 s, requests 20–200');
  const ratelimit = [{ ref: `${REF}content_rl`, description: `[lexkite] > ${R.requests} req/${R.period}s/IP vào trang nội dung → ${R.action}`, action: R.action, enabled: true,
    // gói Free: chỉ được path + cf.client.bot (không dùng host/header) → không miễn CI bằng header được; CI tự giới hạn tốc độ (< 1 req/s)
    expression: `${anyPrefix([...HTML_PREFIXES.filter(p => p !== '/blog/'), ...DATA_PREFIXES])} and not cf.client.bot`,
    ratelimit: { characteristics: ['cf.colo.id', 'ip.src'], period: R.period, requests_per_period: R.requests, mitigation_timeout: R.action === 'block' ? 10 : 0, requests_to_origin: false } }];
  return { custom, ratelimit };
}

// Ghép luật của mình vào ruleset hiện có: giữ nguyên luật khác (không có ref lexkite_), thay luật cùng ref, thêm luật mới.
const CMP = ['ref', 'description', 'action', 'expression', 'enabled', 'ratelimit'];
export const strip = r => Object.fromEntries(CMP.filter(k => r[k] !== undefined).map(k => [k, k === 'ratelimit' ? Object.fromEntries(Object.entries(r.ratelimit).filter(([x]) => ['characteristics', 'period', 'requests_per_period', 'mitigation_timeout', 'requests_to_origin'].includes(x))) : r[k]]));
export function mergeRules(existing = [], ours = []) {
  const mine = new Set(ours.map(r => r.ref));
  const keep = existing.filter(r => !(r.ref && (mine.has(r.ref) || r.ref.startsWith(REF))));
  const keepIds = keep.map(r => ({ ...strip(r), ...(r.id ? { id: r.id } : {}) }));
  return [...keepIds, ...ours.map(strip)];
}
const canon = v => (Array.isArray(v) ? `[${v.map(canon).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}` : JSON.stringify(v));
// Luật đang chạy có khớp bản mong muốn không (bỏ qua id/version/last_updated)
export function sameRules(live = [], want = []) {
  const ours = live.filter(r => r.ref && r.ref.startsWith(REF)).map(strip);
  return ours.length === want.length && want.every(w => ours.some(o => canon(o) === canon(strip(w))));
}
// Che giá trị bí mật khi in ra màn hình / tài liệu
export const mask = (s, secret) => (secret ? String(s).split(secret).join('***LEXKITE_CI_HEADER***') : String(s));
