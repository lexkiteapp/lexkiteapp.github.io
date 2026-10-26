// 🔎 Vòng dữ liệu Google Search Console (docs/SEO-DICT-PAGES.md §9, docs/BLOG-RUNBOOK.md § GSC) – 0 đồng, 0 thư viện.
// Kéo 28 ngày (kết thúc D-3, dataState final) theo query × page × country (+ query×page, page, page 28 ngày trước) từ
// sc-domain:lexkite.com → phân tích (a) truy vấn chưa có bài · (b) hạng 8–30 CTR thấp + gợi ý title/description ·
// (c) cannibalization · (d) trang tụt hiển thị → ghi reports/seo/gsc-<ngày>.{json,md} + content/blog/plan/gsc-priority.json.
// Khoá: CHỈ đọc từ biến môi trường GSC_SA_JSON (secret GitHub), giữ trong bộ nhớ – không bao giờ ghi/in ra.
//   node scripts/seo/gsc.mjs                      kéo API thật (CI hằng tuần, .github/workflows/seo-gsc.yml)
//   node scripts/seo/gsc.mjs --fixture f.json     dữ liệu giả, không gọi mạng (test: scripts/test/gsc.mjs)
//   node scripts/seo/gsc.mjs --issue <file.md>    mở/cập nhật issue nhãn seo-weekly (GITHUB_TOKEN)
// Tuỳ chọn: --root <thư mục repo> (mặc định .) · --date YYYY-MM-DD (ngày chạy, mặc định hôm nay UTC).
// Thiếu secret → in hướng dẫn, exit 0 (không có báo cáo). Token lỗi / 0 dòng / JSON hỏng → exit 1 (CI đỏ, không im lặng xanh).
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

export const SITE = 'sc-domain:lexkite.com';
export const ORIGIN = 'https://lexkite.com';
export const LANGS = ['vi', 'en', 'es', 'ja', 'id', 'pt', 'fr', 'de', 'tr', 'ru', 'ar', 'hi', 'ko', 'zh', 'th'];
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://searchconsole.googleapis.com/webmasters/v3/sites/';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
// Ngưỡng (chỉ được chặt hơn khi có đủ dữ liệu – không nới để "ra nhiều việc").
export const T = {
  days: 28, lagDays: 3, rowLimit: 25000, maxPages: 20,
  gapMinImpr: 50, matchKw: 0.8, matchQ: 0.5, weakPos: 30,          // (a)
  sdMin: 8, sdMax: 30, sdMinImpr: 100, lowCtrRatio: 0.75,            // (b)
  canMinImpr: 50, canPageMin: 10, canPageShare: 0.1,                 // (c)
  decPrevMin: 100, decDrop: 0.4, decAbsMin: 50,                      // (d)
  keepDays: 182, titleMax: 60, titleMaxCjk: 32, descMin: 70, descMax: 160,
};
export const expectedCtr = p => 0.30 / Math.pow(Math.max(1, p), 1.25); // đường CTR tự nhiên ước lượng (hạng 8 ≈ 2,2 %, 10 ≈ 1,7 %, 20 ≈ 0,7 %)

// ---------- chuẩn hoá & đặc trưng truy vấn ----------
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u;
const STOP = new Set(['the', 'a', 'an', 'to', 'is', 'are', 'what', 'how', 'cach', 'la', 'gi', 'nhung', 'cac', 'mot', 'de', 'el', 'los', 'las', 'que', 'como', 'o', 'os', 'le', 'les', 'des', 'du', 'der', 'die', 'das', 'und', 'yang', 'dan', 'cara', 'bir', 'nasil', 'как', 'что', 'это']);
export const norm = s => String(s || '').normalize('NFKC').toLowerCase().replace(/đ/g, 'd').normalize('NFD')
  .replace(/([\p{Script=Latin}\p{Script=Cyrillic}])\p{M}+/gu, '$1').normalize('NFC').replace(/\s+/g, ' ').trim();
export function feats(s) {
  const out = new Set();
  for (const seg of norm(s).split(/[^\p{L}\p{N}\p{M}]+/u).filter(Boolean)) {
    if (CJK.test(seg)) { const c = [...seg]; if (c.length === 1) out.add(seg); for (let i = 0; i + 1 < c.length; i++) out.add(c[i] + c[i + 1]); }
    else if (!STOP.has(seg)) out.add(seg);
  }
  return out;
}
const inter = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n; };
// Khớp truy vấn ↔ từ khoá bài: từ khoá gần như nằm trọn trong truy vấn và truy vấn không lệch hẳn sang ý khác.
export function matches(q, kw) {
  const A = q instanceof Set ? q : feats(q), B = kw instanceof Set ? kw : feats(kw);
  if (!A.size || !B.size) return false;
  const n = inter(A, B); return n / B.size >= T.matchKw && n / A.size >= T.matchQ;
}
export const clusterKey = q => [...feats(q)].sort().join(' ');

const VI = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const COUNTRY = {
  vnm: 'vi', bra: 'pt', prt: 'pt', ago: 'pt', moz: 'pt', fra: 'fr', bel: 'fr', sen: 'fr', civ: 'fr', deu: 'de', aut: 'de', che: 'de',
  idn: 'id', tur: 'tr', rus: 'ru', blr: 'ru', kaz: 'ru', jpn: 'ja', kor: 'ko', chn: 'zh', twn: 'zh', hkg: 'zh', sgp: 'en', tha: 'th',
  ind: 'en', sau: 'ar', egy: 'ar', are: 'ar', mar: 'ar', dza: 'ar', irq: 'ar', jor: 'ar',
  esp: 'es', mex: 'es', arg: 'es', col: 'es', per: 'es', chl: 'es', ven: 'es', ecu: 'es', gtm: 'es', bol: 'es', dom: 'es', ury: 'es',
};
export function pageLang(page) { const m = /^https?:\/\/[^/]+\/([a-z]{2})\//.exec(page || ''); return m && LANGS.includes(m[1]) ? m[1] : null; }
// Ngôn ngữ của truy vấn: chữ viết → dấu tiếng Việt → nước → thư mục của trang → en.
export function detectLang(q, country, page) {
  if (/\p{Script=Hangul}/u.test(q)) return 'ko';
  if (/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(q)) return 'ja';
  if (/\p{Script=Han}/u.test(q)) return 'zh';
  if (/\p{Script=Thai}/u.test(q)) return 'th';
  if (/\p{Script=Arabic}/u.test(q)) return 'ar';
  if (/\p{Script=Devanagari}/u.test(q)) return 'hi';
  if (/\p{Script=Cyrillic}/u.test(q)) return 'ru';
  if (VI.test(q)) return 'vi';
  return COUNTRY[String(country || '').toLowerCase()] || pageLang(page) || 'en';
}
const LOOKUP = /(^|\s)(la gi|nghia la gi|nghia|meaning|meaning in hindi|definition|define|significado|signification|bedeutung|artinya|arti|ne demek|перевод|значение|意味|뜻|什么意思|แปลว่า|معنى)(\s|$)/u;
const LEARN = /(ielts|toeic|toefl|cefr|grammar|ngu phap|phat am|pronunciation|vocabulary|tu vung|essay|writing|speaking|listening|reading|tips|meo|luyen|practice|exercise|bai tap|cau truc|how to learn|cach hoc|語|문법|영어|英语|英語|雅思|托福|托业|토익|토플|ภาษาอังกฤษ)/u;
export const intentOf = q => { const n = norm(q); return /lexkite/.test(n) ? 'brand' : LEARN.test(n) ? 'learn' : LOOKUP.test(n) ? 'lookup' : 'other'; };
const INTENT_W = { learn: 1.5, other: 1, lookup: 0.8, brand: 0 };
// "X là gì / X meaning / معنى X" → X (từ tiếng Anh 1–3 chữ) cho hàng đợi trang từ điển.
export function lookupTerm(q) {
  const n = norm(q);
  const m = /^([a-z][a-z' -]{0,40}?)\s+(?:la gi|nghia la gi|nghia|meaning(?: in \w+)?|definition|significado|signification|bedeutung|artinya|arti|ne demek|перевод|значение|意味|뜻|什么意思|แปลว่า)$/u.exec(n)
    || /^(?:meaning of|define|definition of|معنى)\s+([a-z][a-z' -]{0,40})$/u.exec(n);
  if (!m) return null; const t = m[1].trim(); return t.split(' ').length <= 3 ? t : null;
}

// ---------- nội dung blog (chỉ đọc) ----------
export function frontmatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src); if (!m) return {};
  const o = {};
  for (const line of m[1].split(/\r?\n/)) {
    const k = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line); if (!k) continue;
    let v = k[2].trim();
    if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(',').map(x => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    else v = v.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    o[k[1]] = v;
  }
  return o;
}
export function loadContent(root) {
  const dir = path.join(root, 'content/blog'), posts = [], briefs = [];
  for (const lang of LANGS) {
    const d = path.join(dir, lang); if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter(f => f.endsWith('.md'))) {
      const fm = frontmatter(fs.readFileSync(path.join(d, f), 'utf8'));
      const slug = fm.slug || f.replace(/\.md$/, '');
      posts.push({ lang: fm.lang || lang, slug, translationKey: fm.translationKey || slug, keyword: fm.keyword || '', title: fm.title || '', description: fm.description || '', status: fm.status || '', publishAt: fm.publishAt || '', url: `${ORIGIN}/${fm.lang || lang}/blog/${slug}/` });
    }
  }
  const bf = path.join(dir, 'briefs.json');
  if (fs.existsSync(bf)) for (const b of JSON.parse(fs.readFileSync(bf, 'utf8')).briefs || []) briefs.push({ lang: b.lang || 'vi', slug: b.slug, keyword: b.keyword || '', cluster: b.cluster || '' });
  return { posts, briefs };
}

// ---------- phân tích (thuần, test được) ----------
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const r4 = x => Math.round(x * 1e4) / 1e4, r1 = x => Math.round(x * 10) / 10;
const cleanUrl = u => String(u || '').replace(/[?#].*$/, '');
const cap = s => s.charAt(0).toLocaleUpperCase() + s.slice(1);
function clip(s, max) { if ([...s].length <= max) return s; const c = [...s].slice(0, max).join(''); const i = c.lastIndexOf(' '); return (i > max * 0.6 ? c.slice(0, i) : c).replace(/[\s,:;–-]+$/, '') + '…'; }
// gộp nhiều dòng cùng khoá: cộng clicks/impressions, hạng trung bình có trọng số hiển thị
function agg(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r); let a = m.get(k);
    if (!a) m.set(k, a = { keys: r.keys, clicks: 0, impressions: 0, pw: 0 });
    a.clicks += r.clicks || 0; a.impressions += r.impressions || 0; a.pw += (r.position || 0) * (r.impressions || 0);
  }
  for (const a of m.values()) { a.ctr = a.impressions ? a.clicks / a.impressions : 0; a.position = a.impressions ? a.pw / a.impressions : 0; delete a.pw; }
  return m;
}
function titleHint(q, post, lang) {
  const max = /^(ja|zh|ko|th)$/.test(lang) ? T.titleMaxCjk : T.titleMax, hints = [];
  const qf = feats(q), has = s => { const f = feats(s); return qf.size && inter(qf, f) / qf.size >= T.matchKw; };
  let title = null, description = null;
  if (post) {
    if (!has(post.title)) { const rest = post.title.split(/\s*[:?–|]\s+/).slice(1).join(': ') || post.title; title = clip(`${cap(q)}: ${rest}`, max); hints.push(`Đưa đúng cụm "${q}" lên đầu tiêu đề`); }
    if ([...post.title].length > max) hints.push(`Tiêu đề ${[...post.title].length} ký tự > ${max} – Google sẽ cắt`);
    if (!has(post.description)) { description = clip(`${cap(q)} – ${post.description}`, T.descMax); hints.push(`Mô tả chưa chứa "${q}"`); }
    const dl = [...post.description].length; if (dl < T.descMin || dl > T.descMax) hints.push(`Mô tả ${dl} ký tự (nên ${T.descMin}–${T.descMax})`);
  } else hints.push('Trang không phải bài blog: sửa <title>/meta description ở nguồn dựng trang');
  hints.push(`Thêm 1 mục H2 trả lời thẳng "${q}" + liên kết nội bộ cùng cụm; KHÔNG đổi slug`);
  return { suggestedTitle: title, suggestedDescription: description, hints };
}

export function analyze(data, content, opts = {}) {
  const { qpc = [], qp = [], pageCur = [], pagePrev = [] } = data;
  const posts = content.posts || [], briefs = content.briefs || [];
  const byUrl = new Map(posts.map(p => [p.url, p]));
  const postFeat = posts.map(p => ({ p, kw: feats(p.keyword), ti: feats(p.title) }));
  const written = new Set(posts.map(p => `${p.lang}/${p.slug}`));
  const perLang = Object.fromEntries(LANGS.map(l => [l, posts.filter(p => p.lang === l).length]));
  const maxPosts = Math.max(1, ...Object.values(perLang));
  const langW = l => 1 + 0.5 * (1 - (perLang[l] || 0) / maxPosts);
  const covering = (q, qf, lang) => postFeat.filter(x => x.p.lang === lang && (matches(qf, x.kw) || (qf.size >= 2 && inter(qf, x.ti) === qf.size)));
  const targetCtr = expectedCtr(5);

  // (a) truy vấn có hiển thị chưa có bài khớp – gom cụm theo ngôn ngữ + đặc trưng đã chuẩn hoá
  const cl = new Map();
  for (const r of qpc) {
    const [q, page, country] = r.keys; const lang = detectLang(q, country, page), key = `${lang}|${clusterKey(q)}`;
    if (!clusterKey(q)) continue;
    let c = cl.get(key);
    if (!c) cl.set(key, c = { lang, key: clusterKey(q), queries: new Map(), pages: new Map(), clicks: 0, impressions: 0, pw: 0 });
    c.queries.set(q, (c.queries.get(q) || 0) + r.impressions); c.pages.set(cleanUrl(page), (c.pages.get(cleanUrl(page)) || 0) + r.impressions);
    c.clicks += r.clicks; c.impressions += r.impressions; c.pw += r.position * r.impressions;
  }
  const gaps = [], dictQueue = new Map();
  for (const c of cl.values()) {
    const top = [...c.queries].sort((a, b) => b[1] - a[1]), q = top[0][0], intent = intentOf(q);
    const ctr = c.impressions ? c.clicks / c.impressions : 0, position = c.pw / c.impressions;
    const term = lookupTerm(q);
    if (term) { const d = dictQueue.get(term) || { term, impressions: 0, clicks: 0, queries: [] }; d.impressions += c.impressions; d.clicks += c.clicks; if (d.queries.length < 5) d.queries.push(q); dictQueue.set(term, d); }
    if (c.impressions < T.gapMinImpr || intent === 'brand') continue;
    const qf = feats(q), cov = covering(q, qf, c.lang);
    const topPage = [...c.pages].sort((a, b) => b[1] - a[1])[0][0];
    if (cov.length && position <= T.weakPos) continue; // đã có bài đúng ý và đứng ≤ 30 → việc của (b), không phải bài mới
    const brief = briefs.find(b => b.lang === c.lang && matches(qf, feats(b.keyword)));
    const kind = cov.length ? 'post-weak' : brief && !written.has(`${brief.lang}/${brief.slug}`) ? 'brief-unwritten' : 'no-post';
    const gain = Math.max(0, c.impressions * targetCtr - c.clicks) * INTENT_W[intent] * langW(c.lang) * (kind === 'brief-unwritten' ? 1.5 : 1);
    gaps.push({ kind, lang: c.lang, query: q, variants: top.slice(1, 6).map(x => x[0]), intent, impressions: c.impressions, clicks: c.clicks, ctr: r4(ctr), position: r1(position), topPage,
      post: cov[0] ? cov[0].p.url : null, brief: brief ? brief.slug : null, cluster: brief ? brief.cluster || null : null, gain: r1(gain),
      reason: kind === 'post-weak' ? `Đã có bài (${cov[0].p.slug}) nhưng hạng ${r1(position)} > ${T.weakPos} – làm giàu bài cũ, không viết bài thứ 2 cùng từ khoá`
        : kind === 'brief-unwritten' ? `Brief "${brief.slug}" có sẵn mà chưa viết – viết trước` : `Chưa có bài/brief ${c.lang} cho cụm này – đề xuất brief mới` });
  }
  gaps.sort((a, b) => b.gain - a.gain);

  // (b) striking distance: (trang, truy vấn) hạng 8–30, đủ hiển thị, CTR thấp so với đường CTR tự nhiên
  const striking = [];
  const qpRows = qp.length ? qp : [...agg(qpc, r => `${r.keys[0]}\u0000${cleanUrl(r.keys[1])}`).values()].map(a => ({ ...a, keys: [a.keys[0], cleanUrl(a.keys[1])] }));
  const byPage = new Map();
  for (const r of qpRows) {
    const [q, page] = r.keys, exp = expectedCtr(r.position);
    if (r.position < T.sdMin || r.position > T.sdMax || r.impressions < T.sdMinImpr || r.ctr >= exp * T.lowCtrRatio || intentOf(q) === 'brand') continue;
    const u = cleanUrl(page), e = byPage.get(u) || { page: u, queries: [], impressions: 0, gain: 0 };
    e.queries.push({ query: q, impressions: r.impressions, clicks: r.clicks, ctr: r4(r.ctr), position: r1(r.position), expectedCtr: r4(exp) });
    e.impressions += r.impressions; e.gain += r.impressions * exp - r.clicks; byPage.set(u, e);
  }
  for (const e of byPage.values()) {
    e.queries.sort((a, b) => b.impressions - a.impressions);
    const post = byUrl.get(e.page), lang = post ? post.lang : pageLang(e.page) || 'en';
    striking.push({ page: e.page, lang, slug: post ? post.slug : null, title: post ? post.title : null, description: post ? post.description : null,
      impressions: e.impressions, gain: r1(e.gain), queries: e.queries.slice(0, 5), ...titleHint(e.queries[0].query, post, lang) });
  }
  striking.sort((a, b) => b.gain - a.gain);

  // (c) cannibalization: một truy vấn, ≥ 2 URL cùng nhận phần đáng kể hiển thị
  const cannibal = [], qGroups = new Map();
  for (const r of qpRows) { const g = qGroups.get(r.keys[0]) || []; g.push(r); qGroups.set(r.keys[0], g); }
  for (const [q, rows] of qGroups) {
    const total = sum(rows, r => r.impressions); if (total < T.canMinImpr || intentOf(q) === 'brand') continue;
    const pages = rows.filter(r => r.impressions >= Math.max(T.canPageMin, total * T.canPageShare)).map(r => ({ page: cleanUrl(r.keys[1]), impressions: r.impressions, clicks: r.clicks, position: r1(r.position) }))
      .sort((a, b) => b.clicks - a.clicks || a.position - b.position);
    if (pages.length < 2) continue;
    const langs = new Set(pages.map(p => pageLang(p.page) || 'en')), sameLang = langs.size === 1, win = pages[0];
    const gain = sum(pages.slice(1), p => p.impressions) * expectedCtr(win.position) * (sameLang ? 1 : 0.5);
    cannibal.push({ query: q, impressions: total, sameLang, winner: win.page, pages, gain: r1(gain),
      action: sameLang ? `Giữ ${win.page} làm trang chính cho "${q}": trang kia đổi trọng tâm từ khoá + link về trang chính (anchor "${q}"); trùng hẳn chủ đề → 301 về trang chính`
        : `Khác ngôn ngữ (${[...langs].join(', ')}): kiểm hreflang hai chiều + x-default để Google trả đúng bản theo ngôn ngữ người tìm` });
  }
  cannibal.sort((a, b) => b.gain - a.gain);

  // (d) trang tụt hiển thị mạnh so với 28 ngày trước
  const cur = agg(pageCur, r => cleanUrl(r.keys[0])), prev = agg(pagePrev, r => cleanUrl(r.keys[0])), declines = [];
  for (const [u, p] of prev) {
    const c = cur.get(u) || { impressions: 0, clicks: 0, position: 0, ctr: 0 };
    if (p.impressions < T.decPrevMin || c.impressions > p.impressions * (1 - T.decDrop) || p.impressions - c.impressions < T.decAbsMin) continue;
    const post = byUrl.get(u);
    declines.push({ page: u, lang: post ? post.lang : pageLang(u) || 'en', slug: post ? post.slug : null, prevImpressions: p.impressions, impressions: c.impressions,
      change: r4(c.impressions / p.impressions - 1), prevPosition: r1(p.position), position: r1(c.position), prevClicks: p.clicks, clicks: c.clicks, gain: r1(Math.max(p.clicks - c.clicks, (p.impressions - c.impressions) * p.ctr)),
      hint: c.impressions === 0 ? 'Mất hẳn hiển thị: kiểm trang còn 200/index được (URL Inspection), có bị noindex/301/canonical nhầm' : c.position > p.position + 3 ? 'Tụt hạng: cập nhật nội dung (factChecked), thêm ví dụ/FAQ, xem đối thủ mới trên các truy vấn chính' : 'Hạng giữ nguyên mà hiển thị giảm: nhu cầu theo mùa hoặc mất truy vấn phụ – xem lại truy vấn trong GSC' });
  }
  declines.sort((a, b) => b.gain - a.gain);

  const tot = rows => ({ clicks: sum(rows, r => r.clicks), impressions: sum(rows, r => r.impressions), ctr: r4(sum(rows, r => r.clicks) / Math.max(1, sum(rows, r => r.impressions))), position: r1(sum(rows, r => r.position * r.impressions) / Math.max(1, sum(rows, r => r.impressions))) });
  const dq = [...dictQueue.values()].sort((a, b) => b.impressions - a.impressions);

  // thứ tự ưu tiên mới cho lượt viết hằng tuần: một thang chung = ước tính thêm lượt bấm / 28 ngày
  const priority = [
    ...gaps.map(g => ({ type: g.kind === 'post-weak' ? 'enrich' : g.kind === 'brief-unwritten' ? 'write-brief' : 'new-brief', lang: g.lang, query: g.query, slug: g.brief || (g.post ? g.post.split('/').slice(-2)[0] : null), cluster: g.cluster, gain: g.gain, impressions: g.impressions, position: g.position, reason: g.reason })),
    ...striking.map(s => ({ type: 'refresh-title', lang: s.lang, query: s.queries[0].query, slug: s.slug, page: s.page, gain: s.gain, impressions: s.impressions, position: s.queries[0].position, reason: s.hints[0] })),
    ...cannibal.map(c => ({ type: 'cannibal', lang: pageLang(c.winner) || 'en', query: c.query, page: c.winner, gain: c.gain, impressions: c.impressions, reason: c.action })),
    ...declines.map(d => ({ type: 'decline', lang: d.lang, slug: d.slug, page: d.page, gain: d.gain, impressions: d.impressions, position: d.position, reason: d.hint })),
  ].filter(x => x.gain > 0).sort((a, b) => b.gain - a.gain).slice(0, 100).map((x, i) => ({ rank: i + 1, ...x }));

  return {
    totals: { current: tot(pageCur.length ? pageCur : qpc), previous: tot(pagePrev) },
    gaps: gaps.slice(0, 200), striking: striking.slice(0, 200), cannibal: cannibal.slice(0, 100), declines: declines.slice(0, 100), dictQueue: dq.slice(0, 200), priority,
    pages: [...cur].sort((a, b) => b[1].impressions - a[1].impressions).slice(0, 500).map(([u, a]) => ({ page: u, clicks: a.clicks, impressions: a.impressions, position: r1(a.position) })),
  };
}

// ---------- báo cáo ----------
const pct = x => `${(x * 100).toFixed(1)} %`, short = u => String(u).replace(ORIGIN, '');
const esc = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
export function markdown(rep) {
  const { range, prevRange, totals: t } = rep, L = [];
  L.push(`# GSC hằng tuần – ${rep.date}`, '', `Thuộc tính \`${rep.site}\` · ${range.startDate} → ${range.endDate} (so với ${prevRange.startDate} → ${prevRange.endDate}).`, '',
    `| | Lượt bấm | Hiển thị | CTR | Hạng TB |`, `|---|---|---|---|---|`,
    `| 28 ngày này | ${t.current.clicks} | ${t.current.impressions} | ${pct(t.current.ctr)} | ${t.current.position} |`,
    `| 28 ngày trước | ${t.previous.clicks} | ${t.previous.impressions} | ${pct(t.previous.ctr)} | ${t.previous.position} |`, '',
    `Ưu tiên mới cho lượt viết thứ Hai: \`content/blog/plan/gsc-priority.json\` (${rep.priority.length} mục, xếp theo ước tính thêm lượt bấm/28 ngày). Không tự đổi lịch đăng – \`blog-schedule.mjs\` vẫn do người chạy.`, '');
  L.push(`## (a) Truy vấn chưa có bài khớp (${rep.gaps.length})`, '', '| # | Ngôn ngữ | Truy vấn | Hiển thị | Hạng | Loại | Việc |', '|---|---|---|---|---|---|---|');
  rep.gaps.slice(0, 10).forEach((g, i) => L.push(`| ${i + 1} | ${g.lang} | ${esc(g.query)} | ${g.impressions} | ${g.position} | ${g.kind} | ${esc(g.reason)} |`));
  L.push('', `## (b) Hạng 8–30, CTR thấp (${rep.striking.length})`, '', '| # | Trang | Truy vấn chính | Hiển thị | Hạng | CTR / kỳ vọng | Tiêu đề gợi ý |', '|---|---|---|---|---|---|---|');
  rep.striking.slice(0, 10).forEach((s, i) => { const q = s.queries[0]; L.push(`| ${i + 1} | ${esc(short(s.page))} | ${esc(q.query)} | ${q.impressions} | ${q.position} | ${pct(q.ctr)} / ${pct(q.expectedCtr)} | ${esc(s.suggestedTitle || '– ' + s.hints[0])} |`); });
  L.push('', `## (c) Cannibalization – 2+ URL cùng một truy vấn (${rep.cannibal.length})`, '', '| # | Truy vấn | Hiển thị | URL (hạng) | Việc |', '|---|---|---|---|---|');
  rep.cannibal.slice(0, 10).forEach((c, i) => L.push(`| ${i + 1} | ${esc(c.query)} | ${c.impressions} | ${c.pages.map(p => `${esc(short(p.page))} (${p.position})`).join('<br>')} | ${esc(c.action)} |`));
  L.push('', `## (d) Trang tụt hiển thị mạnh (${rep.declines.length})`, '', '| # | Trang | Hiển thị trước → nay | Hạng trước → nay | Gợi ý |', '|---|---|---|---|---|');
  rep.declines.slice(0, 10).forEach((d, i) => L.push(`| ${i + 1} | ${esc(short(d.page))} | ${d.prevImpressions} → ${d.impressions} (${pct(d.change)}) | ${d.prevPosition} → ${d.position} | ${esc(d.hint)} |`));
  if (rep.dictQueue.length) L.push('', `## Từ người ta tra (hàng đợi trang từ điển, ${rep.dictQueue.length})`, '', rep.dictQueue.slice(0, 20).map(d => `\`${d.term}\` ${d.impressions}`).join(' · '));
  L.push('', `_Tự sinh bởi \`scripts/seo/gsc.mjs\` – số liệu chi tiết: \`reports/seo/gsc-${rep.date}.json\`._`, '');
  return L.join('\n');
}

// ---------- API Search Console (JWT service account, node:crypto) ----------
const b64u = b => Buffer.from(b).toString('base64url');
export function signJwt(sa, now = Math.floor(Date.now() / 1000)) {
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: sa.token_uri || TOKEN_URL, iat: now, exp: now + 3600 }));
  const sig = crypto.createSign('RSA-SHA256').update(`${head}.${body}`).sign(sa.private_key);
  return `${head}.${body}.${b64u(sig)}`;
}
async function call(fetchImpl, url, init, what) {
  for (let i = 0; ; i++) {
    const res = await fetchImpl(url, init);
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && i < 3) { await new Promise(r => setTimeout(r, 2000 * 2 ** i)); continue; }
    const t = (await res.text()).slice(0, 300).replace(/"access_token"\s*:\s*"[^"]*"/g, '"access_token":"***"');
    throw new Error(`${what}: HTTP ${res.status} ${t}`);
  }
}
export async function getToken(sa, fetchImpl = fetch) {
  const j = await call(fetchImpl, sa.token_uri || TOKEN_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signJwt(sa) }) }, 'token');
  if (!j.access_token) throw new Error('token: phản hồi không có access_token');
  return j.access_token;
}
export async function queryAll(token, body, fetchImpl = fetch) {
  const rows = [];
  for (let p = 0; p < T.maxPages; p++) {
    const j = await call(fetchImpl, `${API}${encodeURIComponent(SITE)}/searchAnalytics/query`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ ...body, type: 'web', dataState: 'final', rowLimit: T.rowLimit, startRow: rows.length }) }, `searchAnalytics ${body.dimensions.join('×')}`);
    const got = j.rows || []; rows.push(...got);
    if (got.length < T.rowLimit) break;
  }
  return rows;
}
const ymd = d => d.toISOString().slice(0, 10), addDays = (d, n) => new Date(d.getTime() + n * 864e5);
export function ranges(date) {
  const end = addDays(new Date(`${date}T00:00:00Z`), -T.lagDays), start = addDays(end, -(T.days - 1));
  return { range: { startDate: ymd(start), endDate: ymd(end) }, prevRange: { startDate: ymd(addDays(start, -T.days)), endDate: ymd(addDays(start, -1)) } };
}
export async function pull(sa, date, fetchImpl = fetch) {
  const token = await getToken(sa, fetchImpl), { range, prevRange } = ranges(date);
  const q = (dimensions, r = range) => queryAll(token, { startDate: r.startDate, endDate: r.endDate, dimensions }, fetchImpl);
  const [qpc, qp, pageCur, pagePrev] = [await q(['query', 'page', 'country']), await q(['query', 'page']), await q(['page']), await q(['page'], prevRange)];
  return { qpc, qp, pageCur, pagePrev };
}

// ---------- ghi file ----------
export function write(root, date, rep) {
  const dir = path.join(root, 'reports/seo'); fs.mkdirSync(dir, { recursive: true });
  const jf = path.join(dir, `gsc-${date}.json`), mf = path.join(dir, `gsc-${date}.md`);
  fs.writeFileSync(jf, JSON.stringify(rep, null, 1) + '\n'); fs.writeFileSync(mf, markdown(rep));
  const plan = path.join(root, 'content/blog/plan'); fs.mkdirSync(plan, { recursive: true });
  fs.writeFileSync(path.join(plan, 'gsc-priority.json'), JSON.stringify({
    _note: 'Tự sinh mỗi thứ Hai bởi scripts/seo/gsc.mjs (workflow seo-gsc.yml) từ Google Search Console 28 ngày. Lượt viết hằng tuần đọc file này TRƯỚC 2026-11-seo-program.json/briefs.json. type: write-brief = brief có sẵn chưa viết · new-brief = soạn brief mới (1 từ khoá chính/bài) · enrich = làm giàu bài đã có (không viết bài thứ 2) · refresh-title = sửa title/description theo truy vấn (không đổi slug) · cannibal = gộp/phân vai 2 URL · decline = điều tra trang tụt. gain = ước tính thêm lượt bấm/28 ngày. Không tự sửa lịch đăng.',
    generated: date, source: `reports/seo/gsc-${date}.json`, range: rep.range, items: rep.priority }, null, 1) + '\n');
  // giữ 26 tuần báo cáo, cắt bản cũ
  const cut = ymd(addDays(new Date(`${date}T00:00:00Z`), -T.keepDays));
  for (const f of fs.readdirSync(dir)) { const m = /^gsc-(\d{4}-\d{2}-\d{2})\.(json|md)$/.exec(f); if (m && m[1] < cut) fs.unlinkSync(path.join(dir, f)); }
  return { jf, mf };
}

export const HELP = `GSC: chưa có secret GSC_SA_JSON → bỏ qua (không lỗi). Làm 1 lần (docs/BLOG-RUNBOOK.md § "Việc anh chủ làm 1 lần – GSC"):
  1. console.cloud.google.com bằng vintagezulilyjewelry@gmail.com (KHÔNG dùng khieudinhthong – bị cấm GCP) → tạo dự án → bật "Google Search Console API".
  2. IAM → Service accounts → tạo (không cấp vai trò) → Keys → Add key → JSON (tải về máy, không gửi ai).
  3. search.google.com/search-console → thuộc tính lexkite.com → Cài đặt → Người dùng và quyền → Thêm email service account, quyền "Bị hạn chế" (Restricted).
  4. GitHub lexkiteapp/lexkiteapp.github.io → Settings → Secrets and variables → Actions → New secret GSC_SA_JSON = toàn bộ nội dung file JSON.`;

async function issue(mdFile) {
  const tok = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPOSITORY;
  if (!tok || !repo) throw new Error('--issue cần GITHUB_TOKEN + GITHUB_REPOSITORY');
  const body = fs.readFileSync(mdFile, 'utf8'), title = body.split('\n')[0].replace(/^#\s*/, '');
  const gh = (p, method = 'GET', b) => fetch(`https://api.github.com/repos/${repo}${p}`, { method, headers: { authorization: `Bearer ${tok}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' }, body: b && JSON.stringify(b) });
  const open = await (await gh('/issues?labels=seo-weekly&state=open&per_page=1')).json();
  if (Array.isArray(open) && open[0]) {
    const r = await gh(`/issues/${open[0].number}`, 'PATCH', { title, body }); if (!r.ok) throw new Error(`issue PATCH ${r.status}`);
    await gh(`/issues/${open[0].number}/comments`, 'POST', { body: `Cập nhật ${title} – xem nội dung issue.` });
    console.log(`✓ cập nhật issue #${open[0].number}`);
  } else {
    await gh('/labels', 'POST', { name: 'seo-weekly', color: '0e8a8a', description: 'Báo cáo GSC hằng tuần (scripts/seo/gsc.mjs)' }); // 422 = đã có
    const r = await gh('/issues', 'POST', { title, body, labels: ['seo-weekly'] }); if (!r.ok) throw new Error(`issue POST ${r.status}`);
    console.log(`✓ mở issue #${(await r.json()).number}`);
  }
}

async function main(argv) {
  const arg = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
  if (arg('--issue')) return issue(arg('--issue'));
  const root = arg('--root') || '.', date = arg('--date') || ymd(new Date()), fx = arg('--fixture');
  let data;
  if (fx) data = JSON.parse(fs.readFileSync(fx, 'utf8'));
  else {
    const raw = process.env.GSC_SA_JSON;
    if (!raw || !raw.trim()) { console.log(HELP); if (process.env.GITHUB_ACTIONS) console.log('::warning title=GSC::Chưa có secret GSC_SA_JSON – xem docs/BLOG-RUNBOOK.md'); return; }
    let sa; try { sa = JSON.parse(raw); } catch { throw new Error('GSC_SA_JSON không phải JSON hợp lệ – dán lại TOÀN BỘ file khoá JSON vào secret'); }
    if (!sa.client_email || !sa.private_key) throw new Error('GSC_SA_JSON thiếu client_email/private_key – cần khoá JSON của service account');
    data = await pull(sa, date);
  }
  if (!(data.qpc || []).length) throw new Error(`0 dòng query×page×country cho ${SITE} – kiểm service account đã được thêm vào GSC (quyền Restricted) và thuộc tính đúng`);
  const { range, prevRange } = ranges(date);
  const rep = { date, site: SITE, range, prevRange, rows: { qpc: data.qpc.length, qp: (data.qp || []).length, pageCur: (data.pageCur || []).length, pagePrev: (data.pagePrev || []).length }, thresholds: T, ...analyze(data, loadContent(root)) };
  const { jf, mf } = write(root, date, rep);
  console.log(`✓ GSC ${range.startDate}→${range.endDate}: ${rep.rows.qpc} dòng · (a) ${rep.gaps.length} · (b) ${rep.striking.length} · (c) ${rep.cannibal.length} · (d) ${rep.declines.length} · ưu tiên ${rep.priority.length} → ${jf}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `report=${mf}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main(process.argv.slice(2)).catch(e => { console.error(`✗ gsc: ${e.message}`); process.exit(1); });
