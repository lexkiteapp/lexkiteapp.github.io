// Kiểm bài PR / hồ sơ / thư mục trỏ về lexkite.com (thuần – không I/O trừ hàm nhận fetch tiêm vào; test: scripts/test/pr-check.mjs).
// Dùng bởi scripts/pr-check.mjs (CLI + workflow pr-check.yml). Mức kết quả: ok · change (thay đổi cần anh cập nhật, không phải lỗi)
// · regression (mất bài / mất link / rel tụt xuống nofollow / thêm noindex – báo động) · manual (bị chặn bot / lỗi mạng – kiểm tay) · skip.
import { TYPES, STATUSES, RELS, SERIOUS, validatePlacement } from '../../functions/api/_bw.js';
export { TYPES, STATUSES, RELS, SERIOUS, validatePlacement };
export const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export const decode = s => String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e.toLowerCase()] ?? m));
const attrs = tag => { const o = {}; for (const m of tag.matchAll(/([^\s=<>"'/]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) o[m[1].toLowerCase()] = decode(m[3] ?? m[4] ?? m[5] ?? ''); return o; };
const strip = html => String(html || '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, '');

export function platformOf(url) {
  let h = ''; try { h = new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return 'other'; }
  if (h === 'dev.to') return 'devto';
  if (h === 'medium.com' || h.endsWith('.medium.com')) return 'medium';
  if (h === 'hashnode.com' || h.endsWith('.hashnode.dev')) return 'hashnode';
  const M = { 'peerlist.io': 'peerlist', 'github.com': 'github', 'saashub.com': 'saashub', 'uneed.best': 'uneed', 'alternativeto.net': 'alternativeto', 'producthunt.com': 'producthunt', 'crunchbase.com': 'crunchbase' };
  return M[h] || 'other';
}
const hostIs = (host, want) => { host = String(host || '').toLowerCase(); want = String(want || '').toLowerCase(); return !!want && (host === want || host.endsWith('.' + want)); };

/** Mọi thẻ <a href> trỏ tới tên miền đích (kể cả UTM, link bọc qua trang chuyển hướng ?url=…). → [{ href, rel: [token], wrapped }] */
export function targetLinks(html, want = 'lexkite.com', base = 'https://example.invalid/') {
  const out = [];
  for (const m of strip(html).matchAll(/<a\b[^>]*>/gi)) {
    const a = attrs(m[0]); if (!a.href) continue;
    let u; try { u = new URL(a.href.trim(), base); } catch { continue; }
    if (!/^https?:$/.test(u.protocol)) continue;
    const rel = String(a.rel || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (hostIs(u.hostname, want)) out.push({ href: u.href, rel, wrapped: false });
    else { // link bọc: https://site/out?url=https%3A%2F%2Flexkite.com… – đi qua trang chuyển hướng, không truyền uy tín như link thẳng
      for (const v of u.searchParams.values()) { try { const t = new URL(v); if (hostIs(t.hostname, want)) { out.push({ href: t.href, rel: [...new Set([...rel, 'redirect'])], wrapped: true }); break; } } catch { /* không phải URL */ } }
    }
  }
  return out;
}
/** Link trong Markdown (README GitHub): [x](https://lexkite.com/…) hoặc <https://lexkite.com>. */
export function markdownLinks(md, want = 'lexkite.com') {
  const out = [];
  for (const m of String(md || '').matchAll(/\]\(\s*<?(https?:\/\/[^)\s>]+)>?[^)]*\)|<(https?:\/\/[^>\s]+)>/g)) { try { const u = new URL(m[1] || m[2]); if (hostIs(u.hostname, want)) out.push({ href: u.href, rel: [], wrapped: false }); } catch { /* bỏ qua */ } }
  return out;
}
const BAD_REL = ['nofollow', 'ugc', 'sponsored', 'redirect'];
/** Tóm tắt rel của các link đích: có ≥ 1 link follow → 'follow'; ngược lại các token của link tốt nhất ('nofollow', 'nofollow ugc'…). */
export function relSummary(links) {
  if (!links || !links.length) return null;
  if (links.some(l => !l.rel.some(t => BAD_REL.includes(t)))) return 'follow';
  const best = links.map(l => BAD_REL.filter(t => l.rel.includes(t))).sort((a, b) => a.includes('redirect') - b.includes('redirect') || a.length - b.length)[0]; // link thẳng ưu tiên hơn link bọc
  return best.join(' ');
}
export const isFollow = rel => rel === 'follow';
/** noindex từ <meta name="robots|googlebot"> hoặc header X-Robots-Tag. */
export function noindexOf(html, headers = {}) {
  const xr = String(headerGet(headers, 'x-robots-tag') || '').toLowerCase();
  if (xr.split(',').some(p => /(^|:)\s*(noindex|none)\b/.test(p.trim()) && !/^(?!googlebot)[a-z-]+bot\s*:/.test(p.trim()))) return true;
  for (const m of strip(html).matchAll(/<meta\b[^>]*>/gi)) { const a = attrs(m[0]); if (/^(robots|googlebot)$/i.test(a.name || '') && /\b(noindex|none)\b/i.test(a.content || '')) return true; }
  return false;
}
export const titleOf = html => { const m = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i); return m ? decode(m[1]).replace(/\s+/g, ' ').trim().slice(0, 200) : ''; };
const headerGet = (h, k) => (h && typeof h.get === 'function' ? h.get(k) : h ? h[k] ?? h[k.toLowerCase()] : null);

/** Trang chặn bot / thử thách (Cloudflare, DataDome, PerimeterX, captcha…) → không kết luận là bị gỡ. */
export function isChallenge(status, headers, html) {
  if (/challenge/i.test(headerGet(headers, 'cf-mitigated') || '')) return true;
  const t = titleOf(html), body = String(html || '').slice(0, 20000);
  if (/^(Just a moment|Attention Required|Access denied|Please Wait|Checking your browser|Security check|DDoS-Guard)/i.test(t)) return true;
  if ([401, 403, 429, 503].includes(status) && /cf-chl|challenge-platform|captcha|px-captcha|datadome|perimeterx|Enable JavaScript and cookies to continue|verify you are human/i.test(body)) return true;
  if (status === 429) return true;
  return false;
}
// Dấu hiệu bị gỡ / bị khóa theo nền tảng (cụm câu đặc trưng – không dò chữ chung chung trong thân bài)
const REMOVED = {
  devto: /This post (has been|was) removed|This (article|post) is (no longer available|unavailable)|The page you were looking for doesn['’]t exist/i,
  medium: /This post is unavailable|This (page|story) is (no longer )?(available|unavailable)|This post has been removed/i,
  hashnode: /This (article|post) (has been|was) (deleted|removed)|We can['’]t find the page you['’]re looking for/i,
  peerlist: /Page not found|This (profile|project) (doesn['’]t|does not) exist/i,
  saashub: /Page not found|The page you were looking for doesn['’]t exist/i,
  uneed: /Tool not found|Page not found/i,
  alternativeto: /Page not found|Application not found/i,
  other: /$^/,
};
const BANNED = {
  devto: /account (has been )?suspended|This user has been (banned|suspended)/i,
  medium: /under investigation or was found in violation of the Medium Rules|This account (has been|is) suspended/i,
  hashnode: /This (account|blog|user) (has been|is) (suspended|banned|blocked)/i,
  peerlist: /This (account|profile) (has been|is) (suspended|banned)/i,
  other: /\baccount (has been |is )?(suspended|banned|terminated)\b/i,
};
const SOFT404 = /^(404\b|Page not found|Not found|Error 404|This page (isn['’]t|is not) available|Post unavailable)/i;

/** Đánh giá 1 phản hồi HTTP của trang công khai. → { state, http, final, redirected, link, rel, noindex, title, links } */
export function evaluatePage(p, res) {
  const plat = platformOf(p.url), html = res.body || '', title = titleOf(html), out = { http: res.status, final: res.url || p.url, redirected: false, title };
  try { const a = new URL(p.url), b = new URL(out.final); out.redirected = a.hostname.replace(/^www\./, '') !== b.hostname.replace(/^www\./, '') || (a.pathname.replace(/\/+$/, '') !== b.pathname.replace(/\/+$/, '') && (b.pathname === '/' || b.pathname === '')); } catch { /* bỏ qua */ }
  if (res.error) return { ...out, state: 'error', note: String(res.error).slice(0, 160) };
  if (isChallenge(res.status, res.headers, html)) return { ...out, state: 'blocked', title: '' };
  const ban = BANNED[plat] || BANNED.other;
  if (ban.test(title) || (plat !== 'other' && BANNED[plat] && ban.test(html.slice(0, 200000)))) return { ...out, state: 'banned' };
  if (res.status === 404 || res.status === 410) return { ...out, state: 'removed' };
  if (res.status >= 500 || res.status === 0) return { ...out, state: 'error', note: 'HTTP ' + res.status };
  if (res.status >= 400) return { ...out, state: 'error', note: 'HTTP ' + res.status };
  if ((REMOVED[plat] || REMOVED.other).test(title) || (REMOVED[plat] && REMOVED[plat].test(html.slice(0, 200000)) && !targetLinks(html, p.expectLink, out.final).length) || SOFT404.test(title)) return { ...out, state: 'removed' };
  if (out.redirected && /^https?:\/\/[^/]+\/?$/.test(out.final)) return { ...out, state: 'removed', note: 'redirect-home' };
  const links = targetLinks(html, p.expectLink || 'lexkite.com', out.final);
  return { ...out, state: links.length ? 'ok' : 'link-missing', link: links.length > 0, rel: relSummary(links), noindex: noindexOf(html, res.headers), links: links.slice(0, 5).map(l => l.href) };
}

/** URL PR GitHub → { owner, repo, n } */
export const githubPr = url => { const m = String(url || '').match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)/); return m ? { owner: m[1], repo: m[2], n: +m[3] } : null; };
/** PR GitHub: trạng thái qua API (+ README nhánh mặc định khi đã merge). pr = JSON pulls/N, readme = { status, body } */
export function evaluatePr(p, pr, readme) {
  if (!pr || pr.status !== 200) return { state: pr && (pr.status === 403 || pr.status === 429) ? 'blocked' : pr && pr.status === 404 ? 'removed' : 'error', http: pr ? pr.status : 0, final: p.url };
  const j = pr.json || {};
  if (j.merged || j.merged_at) {
    const links = readme && readme.status === 200 ? markdownLinks(readme.body, p.expectLink || 'lexkite.com') : null;
    if (!links) return { state: 'error', http: readme ? readme.status : 0, final: p.url, title: j.title || '', note: 'readme' };
    return { state: links.length ? 'pr-merged' : 'link-missing', http: 200, final: p.url, title: String(j.title || '').slice(0, 200), link: links.length > 0, rel: links.length ? 'nofollow' : null, noindex: false, merged: true, links: links.slice(0, 3).map(l => l.href) };
  }
  return { state: j.state === 'closed' ? 'pr-closed' : 'pr-open', http: 200, final: p.url, title: String(j.title || '').slice(0, 200), link: null, rel: null, noindex: null };
}

const relRank = r => (r == null ? 0 : r === 'follow' ? 3 : 1);
/** Phân loại so với mốc. prev = { relBase, noindexBase, ... } (lưu ở D1, thiếu = lần đầu). → { level, reasons, relBase, noindexBase } */
export function classify(p, r, prev = null) {
  const reasons = [], add = (lv, why) => { reasons.push(why); if (ORDER[lv] > ORDER[level]) level = lv; };
  let level = 'ok';
  const relBase = prev && prev.relBase ? prev.relBase : p.expectedRel && p.expectedRel !== 'unknown' ? p.expectedRel : r.link ? r.rel : null;
  const noindexBase = prev && prev.noindexBase != null ? !!prev.noindexBase : r.link ? !!r.noindex : null;
  const live = r.state === 'ok' || r.state === 'pr-merged' || r.state === 'link-missing';
  if (r.state === 'skipped') return { level: 'skip', reasons: ['no-url'], relBase, noindexBase };
  if (r.state === 'blocked' || r.state === 'error') return { level: 'manual', reasons: [r.state], relBase: prev ? prev.relBase || null : null, noindexBase: prev && prev.noindexBase != null ? !!prev.noindexBase : null };
  if (p.status === 'live') {
    if (r.state === 'removed') add('regression', 'removed');
    else if (r.state === 'banned') add('regression', 'banned');
    else if (r.state === 'pr-closed') add('regression', 'removed');
    else if (r.state === 'pr-open') add('change', 'pr-open');
    else if (live) {
      if (!r.link) add('regression', 'link-gone');
      else {
        if (relBase && relRank(r.rel) < relRank(relBase)) add('regression', 'rel-nofollow');
        else if (relBase && relBase !== 'follow' && r.rel === 'follow') add('change', 'rel-follow');
        if (r.noindex && noindexBase === false) add('regression', 'noindex-added');
      }
      if (r.redirected) add('change', 'redirected');
    }
  } else if (p.status === 'pending') {
    if (r.state === 'pr-merged') add('change', 'merged');
    else if (r.state === 'pr-closed') add('change', 'pr-closed');
    else if (r.state === 'banned') add('regression', 'banned');
    else if (r.state === 'ok' && r.link && !r.noindex) add('change', 'listed');
    else reasons.push(r.state === 'ok' && r.link ? 'preview-noindex' : 'not-listed'); // trang xem trước (chưa ra mắt) thường noindex
  }
  return { level, reasons, relBase: live && r.link ? relBase : prev ? prev.relBase || null : null, noindexBase: live && r.link ? noindexBase : prev && prev.noindexBase != null ? !!prev.noindexBase : null };
}
const ORDER = { ok: 0, skip: 0, manual: 1, change: 2, regression: 3 };

// ---------- Tải trang lịch sự: timeout, thử lại có giãn cách, giãn cách theo tên miền ----------
export function makeFetcher({ fetch: f = globalThis.fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), timeout = 20000, tries = 3, gap = 1500, maxBytes = 3e6, headers = {} } = {}) {
  const lastAt = new Map();
  return async function get(url, opt = {}) {
    let host = ''; try { host = new URL(url).hostname; } catch { return { status: 0, error: 'bad-url', url }; }
    let last = { status: 0, error: 'no-try', url };
    for (let i = 0; i < tries; i++) {
      const wait = (lastAt.get(host) || 0) + gap - Date.now(); if (wait > 0) await sleep(wait);
      lastAt.set(host, Date.now());
      const ac = typeof AbortController === 'function' ? new AbortController() : null, t = ac ? setTimeout(() => ac.abort(), timeout) : null;
      try {
        const res = await f(url, { redirect: 'follow', signal: ac ? ac.signal : undefined, headers: { 'User-Agent': UA, Accept: opt.accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9', ...headers, ...(opt.headers || {}) } });
        let body = await res.text(); if (body.length > maxBytes) body = body.slice(0, maxBytes);
        last = { status: res.status, url: res.url || url, headers: res.headers, body };
        if (res.status === 429 || res.status >= 500) { const ra = Math.min(30, +(res.headers && res.headers.get ? res.headers.get('retry-after') : 0) || 0); if (i < tries - 1) { await sleep(ra ? ra * 1000 : 3000 * 2 ** i); continue; } }
        return last;
      } catch (e) {
        last = { status: 0, url, error: e && e.name === 'AbortError' ? 'timeout' : String((e && e.message) || e).slice(0, 120) };
        if (i < tries - 1) await sleep(3000 * 2 ** i);
      } finally { if (t) clearTimeout(t); }
    }
    return last;
  };
}

/** Kiểm 1 mục (live/pending có URL). get = makeFetcher(); gh = header GitHub API (token tùy chọn). */
/** URL bài Figshare → id (…/articles/<loại>/<tên>/<id>[/<phiên bản>]) */
export const figshareId = url => { const m = String(url || '').match(/^https:\/\/(?:[\w-]+\.)?figshare\.com\/articles\/(?:[\w-]+\/)*?(\d{5,})(?:\/\d+)?\/?(?:[?#].*)?$/); return m ? +m[1] : null; };
/** Figshare: trang HTML dựng bằng JS + chặn bot (curl nhận 202/rỗng; CI nhận 200 không có mô tả → báo nhầm link-gone 27/10) → đọc API công khai chính thức.
 *  api = { status, body } của https://api.figshare.com/v2/articles/<id>; link lấy từ mô tả (HTML) + references. Bài private/bị gỡ → API 404. */
export function evaluateFigshare(p, api) {
  const out = { http: api ? api.status : 0, final: p.url, redirected: false };
  if (!api || api.error) return { ...out, state: 'error', note: String((api && api.error) || 'api').slice(0, 160) };
  if (api.status === 403 || api.status === 429) return { ...out, state: 'blocked', title: '' };
  if (api.status === 404 || api.status === 410) return { ...out, state: 'removed' };
  if (api.status !== 200) return { ...out, state: 'error', note: 'HTTP ' + api.status };
  let j = null; try { j = JSON.parse(api.body || 'null'); } catch { j = null; }
  if (!j || !j.id) return { ...out, state: 'error', note: 'api-json' };
  const want = p.expectLink || 'lexkite.com', refs = (j.references || []).map(u => `<a href="${String(u).replace(/"/g, '&quot;')}">`).join('');
  const links = targetLinks(String(j.description || '') + refs, want, j.url_public_html || p.url);
  return { ...out, title: String(j.title || '').slice(0, 200), state: links.length ? 'ok' : 'link-missing', link: links.length > 0, rel: relSummary(links), noindex: null, links: links.slice(0, 5).map(l => l.href), via: 'api' };
}

export async function checkPlacement(p, get, { ghHeaders = {} } = {}) {
  if (!p.url || !/^https:\/\//.test(p.url)) return { state: 'skipped', http: 0, final: '' };
  const pr = githubPr(p.url);
  if (pr) {
    const api = await get(`https://api.github.com/repos/${pr.owner}/${pr.repo}/pulls/${pr.n}`, { accept: 'application/vnd.github+json', headers: ghHeaders });
    let json = null; try { json = JSON.parse(api.body || 'null'); } catch { json = null; }
    let readme = null;
    if (api.status === 200 && json && (json.merged || json.merged_at)) {
      const br = (json.base && json.base.repo && json.base.repo.full_name) || `${pr.owner}/${pr.repo}`;
      readme = await get(`https://raw.githubusercontent.com/${br}/HEAD/README.md`, { accept: 'text/plain' });
    }
    return evaluatePr(p, { status: api.status, json }, readme);
  }
  const fs = figshareId(p.url);
  if (fs) return evaluateFigshare(p, await get(`https://api.figshare.com/v2/articles/${fs}`, { accept: 'application/json' }));
  return evaluatePage(p, await get(p.url));
}

