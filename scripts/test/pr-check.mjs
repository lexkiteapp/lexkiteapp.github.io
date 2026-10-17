// Test Backlink, PR & Thương hiệu: phân tích link/rel/noindex (fixture follow · nofollow · ugc · noindex · bị gỡ · bị khóa · trang chặn bot),
// phân loại sự cố, DNS tên miền na ná, tài khoản mạng xã hội, tải trang (thử lại/giãn cách), issue GitHub, chữ ký HMAC CI,
// API /api/backlinks (cổng quản trị, kiểm hợp lệ, seed không ghi đè bản anh sửa, báo cáo CI → cảnh báo Quản trị + thư), bảng docs khớp JSON.
// Chạy: node scripts/test/pr-check.mjs  (không mạng – fetch/D1/Firebase/thư giả lập)
import fs from 'node:fs';
import { webcrypto } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import * as P from '../lib/pr-check.mjs';
import * as BW from '../lib/brand-watch.mjs';
import * as CLI from '../pr-check.mjs';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const fx = f => fs.readFileSync(new URL('./fixtures/pr/' + f, import.meta.url), 'utf8');
const res = (status, body, extra = {}) => ({ status, body, url: extra.url, headers: extra.headers || {}, error: extra.error });
const PL = { id: 'x', platform: 'dev.to', url: 'https://dev.to/u/post-1', status: 'live', expectLink: 'lexkite.com', expectedRel: 'unknown' };

// ---------- 1) Phân tích link / rel / noindex ----------
{
  const L = P.targetLinks(fx('follow.html'), 'lexkite.com', PL.url);
  ok(L.length === 1 && L[0].href.includes('utm_source=devto&utm_medium=referral'), 'follow: 1 link đích (giải mã &amp;, bỏ link trong comment/script) ' + JSON.stringify(L));
  ok(P.relSummary(L) === 'follow', 'follow: rel noopener noreferrer = follow');
  ok(P.relSummary(P.targetLinks(fx('nofollow.html'))) === 'nofollow', 'nofollow (www.lexkite.com vẫn tính là đích)');
  const U = P.targetLinks(fx('ugc.html'));
  ok(U.length === 2 && U[1].wrapped && P.relSummary(U) === 'nofollow ugc', 'ugc + link bọc qua trang chuyển hướng: ' + P.relSummary(U));
  ok(P.relSummary(P.targetLinks('<a href="https://out.example.net/r?url=https%3A%2F%2Flexkite.com%2F">x</a>')) === 'redirect', 'chỉ có link bọc → không coi là follow');
  ok(P.targetLinks('<a href="https://evil-lexkite.com/">x</a><a href="javascript:alert(1)">y</a><a href="https://lexkite.com.evil.net/">z</a>').length === 0, 'tên miền giả (evil-lexkite.com, lexkite.com.evil.net) và javascript: không tính');
  ok(P.noindexOf(fx('noindex.html')) && !P.noindexOf(fx('follow.html')) && !P.noindexOf(fx('ugc.html')), 'noindex từ meta robots');
  ok(P.noindexOf('', { 'x-robots-tag': 'noindex' }) && P.noindexOf('', { get: k => (k === 'x-robots-tag' ? 'googlebot: noindex' : null) }) && !P.noindexOf('', { 'x-robots-tag': 'otherbot: noindex' }), 'noindex từ X-Robots-Tag (bỏ qua bot khác Google)');
  ok(P.markdownLinks(fx('readme.md')).length === 1 && P.markdownLinks('[a](https://example.com) <https://lexkite.com>').length === 1, 'link Markdown README');
  ok(P.titleOf(fx('follow.html')).startsWith('Building a 15-language'), 'tiêu đề trang');
}
// ---------- 2) Đánh giá trang ----------
{
  const e = (body, status = 200, extra = {}, p = PL) => P.evaluatePage(p, res(status, body, { url: p.url, ...extra }));
  let r = e(fx('follow.html')); ok(r.state === 'ok' && r.link && r.rel === 'follow' && r.noindex === false && r.http === 200, 'trang ok: ' + JSON.stringify(r));
  ok(e(fx('removed-devto.html')).state === 'removed', 'dev.to "This post has been removed" (HTTP 200) → removed');
  ok(e('<title>Not Found</title>', 404).state === 'removed' && e('', 410).state === 'removed', '404/410 → removed');
  ok(e(fx('medium-unavailable.html'), 200, {}, { ...PL, url: 'https://medium.com/@lexkite/x' }).state === 'banned', 'Medium vi phạm luật → banned');
  r = e(fx('challenge.html'), 403, { headers: { 'cf-mitigated': 'challenge' } }); ok(r.state === 'blocked' && r.noindex == null, 'trang thử thách Cloudflare 403 → blocked (không đọc noindex của trang chặn)');
  ok(e(fx('challenge.html'), 200).state === 'blocked', 'tiêu đề "Just a moment..." dù HTTP 200 → blocked');
  ok(e('', 429).state === 'blocked' && e('', 503).state === 'error' && P.evaluatePage(PL, res(0, '', { error: 'timeout' })).state === 'error', '429 → blocked · 503/timeout → error (không phải bị gỡ)');
  ok(e(fx('link-gone.html')).state === 'link-missing', 'còn trang nhưng mất link → link-missing');
  ok(e(fx('follow.html'), 200, { url: 'https://dev.to/' }).state === 'removed', 'chuyển hướng về trang chủ → removed');
  ok(e('<title>Hi</title><p>We discuss how an account suspended policy works.</p><a href="https://lexkite.com/">x</a>', 200, {}, { ...PL, url: 'https://blog.example.org/p' }).state === 'ok', 'trang lạ: chữ "account suspended" trong thân bài không bị coi là khóa');
}
// ---------- 3) PR GitHub ----------
{
  const p = { ...PL, url: 'https://github.com/o/r/pull/80', type: 'pr' };
  ok(P.githubPr(p.url).n === 80, 'nhận URL PR');
  ok(P.evaluatePr(p, { status: 200, json: { state: 'open', merged: false } }).state === 'pr-open', 'PR mở');
  ok(P.evaluatePr(p, { status: 200, json: { state: 'closed', merged: false } }).state === 'pr-closed', 'PR đóng không merge');
  let r = P.evaluatePr(p, { status: 200, json: { state: 'closed', merged: true } }, res(200, fx('readme.md'))); ok(r.state === 'pr-merged' && r.link && r.rel === 'nofollow', 'PR merged + README có link');
  ok(P.evaluatePr(p, { status: 200, json: { merged: true } }, res(200, '# list')).state === 'link-missing', 'merged nhưng README mất link');
  ok(P.evaluatePr(p, { status: 0, json: null }).state === 'error' && P.evaluatePr(p, { status: 403 }).state === 'blocked', 'API GitHub lỗi/hạn mức → không kết luận');
}
// ---------- 4) Phân loại ----------
{
  const live = { ...PL }, okR = { state: 'ok', link: true, rel: 'follow', noindex: false };
  let c = P.classify(live, okR); ok(c.level === 'ok' && c.relBase === 'follow' && c.noindexBase === false, 'lần đầu: mốc rel = follow');
  ok(P.classify(live, { ...okR, rel: 'nofollow' }, { relBase: 'follow', noindexBase: false }).reasons.includes('rel-nofollow'), 'follow → nofollow = sự cố');
  ok(P.classify(live, { ...okR, rel: 'nofollow ugc' }, { relBase: 'follow' }).level === 'regression', 'sự cố rel giữ nguyên tới khi sửa (vẫn so với mốc)');
  ok(P.classify({ ...live, expectedRel: 'nofollow' }, okR).reasons.includes('rel-follow'), 'nofollow → follow = thay đổi tốt');
  ok(P.classify(live, { ...okR, noindex: true }, { relBase: 'follow', noindexBase: false }).reasons.includes('noindex-added'), 'thêm noindex = sự cố');
  ok(P.classify(live, { ...okR, noindex: true }).level === 'ok', 'trang noindex từ lần đầu → mốc, không báo');
  ok(P.classify(live, { state: 'link-missing', link: false }).reasons.join() === 'link-gone', 'mất link = sự cố');
  ok(P.classify(live, { state: 'removed' }).level === 'regression' && P.classify(live, { state: 'banned' }).reasons[0] === 'banned', 'bị gỡ / bị khóa = sự cố');
  c = P.classify(live, { state: 'blocked' }, { relBase: 'follow', noindexBase: false }); ok(c.level === 'manual' && c.relBase === 'follow', 'bị chặn bot = kiểm tay, giữ mốc cũ');
  const pend = { ...PL, status: 'pending' };
  ok(P.classify(pend, { state: 'removed' }).level === 'ok', 'pending + 404 = chưa lên (không phải sự cố)');
  ok(P.classify(pend, okR).reasons.includes('listed') && P.classify(pend, { ...okR, noindex: true }).reasons.includes('preview-noindex'), 'pending lên trang (index) → thay đổi; trang xem trước noindex → chưa');
  ok(P.classify(pend, { state: 'pr-merged', link: true, rel: 'nofollow' }).reasons.includes('merged') && P.classify({ ...live }, { state: 'pr-closed' }).level === 'regression', 'PR merged → thay đổi; live mà PR bị đóng → sự cố');
}
// ---------- 5) Kiểm hợp lệ ----------
{
  const good = { id: 'devto-a', platform: 'dev.to', type: 'article', url: 'https://dev.to/a', account: '@lexkite', status: 'live', expectedRel: 'unknown' };
  ok(P.validatePlacement(good).ok && P.validatePlacement(good).row.account === 'lexkite', 'mục hợp lệ (bỏ @)');
  ok(P.validatePlacement({ ...good, url: 'javascript:alert(1)' }).errors.includes('url'), 'chặn javascript:');
  ok(P.validatePlacement({ ...good, account: 'boss@gmail.com' }).errors.includes('email') && P.validatePlacement({ ...good, notes: 'liên hệ a.b@example.com' }).errors.includes('email'), 'chặn email trong tài khoản/ghi chú');
  ok(P.validatePlacement({ ...good, notes: 'token: abc' }).errors.includes('secret'), 'chặn ghi chú giống bí mật');
  ok(P.validatePlacement({ ...good, id: 'Bad ID' }).errors.includes('id') && P.validatePlacement({ ...good, type: 'x' }).errors.includes('type') && P.validatePlacement({ ...good, url: '' }).errors.includes('url'), 'id/type sai, live thiếu URL');
  ok(P.validatePlacement({ ...good, url: 'https://medium.com/@lexkite/post-1' }).ok, 'URL Medium có @tên không bị coi là email');
  const file = JSON.parse(fs.readFileSync('content/pr/placements.json', 'utf8')), w = JSON.parse(fs.readFileSync('content/brand/watch.json', 'utf8'));
  const bad = file.placements.map(x => [x.id, P.validatePlacement(x)]).filter(([, v]) => !v.ok);
  ok(!bad.length, 'placements.json hợp lệ: ' + bad.map(([i, v]) => i + ':' + v.errors).join(' '));
  ok(new Set(file.placements.map(x => x.id)).size === file.placements.length, 'placements.json: id không trùng');
  ok(w.handles.every(h => BW.validateHandle(h).ok) && !/@[a-z0-9-]+\.[a-z]{2,}/i.test(JSON.stringify(w) + JSON.stringify(file)), 'watch.json hợp lệ, không có email trong 2 file công khai');
  const doc = fs.readFileSync('docs/PR-PLATFORMS.md', 'utf8');
  ok(CLI.applyTable(doc, CLI.tableMd(file.placements)) === doc, 'docs/PR-PLATFORMS.md khớp placements.json (chạy: node scripts/pr-check.mjs --table)');
}
// ---------- 6) Thương hiệu ----------
{
  const d = BW.domainList({ own: ['lexkite.com'], domains: { base: 'lexkite', tlds: ['net', 'com.vn', 'com'], typos: ['lexkit.com', 'LEXKIT.com', 'bad domain'] } });
  ok(d.join() === 'lexkite.net,lexkite.com.vn,lexkit.com', 'danh sách tên miền (bỏ của mình, trùng, sai): ' + d);
  ok(BW.parseDoh({ Status: 3 }, 'A').status === 'nx' && BW.parseDoh({ Status: 0, Answer: [{ type: 15, data: '10 mx.evil.net.' }] }, 'MX').hosts[0] === 'mx.evil.net' && BW.parseDoh(null, 'A').status === 'err', 'đọc DoH: NXDOMAIN, MX, lỗi');
  const base = { status: 'ok', ns: true, a: false, aaaa: false, mx: false };
  ok(BW.classifyDomain({ ...base, a: true }, null).level === 'ok', 'lần đầu đã phân giải → mốc, không báo');
  ok(BW.classifyDomain({ ...base, a: true }, { ...base }).reasons.includes('resolves'), 'trước không có A/AAAA/MX, nay có → sự cố');
  ok(BW.classifyDomain({ ...base, a: true, mx: true }, { ...base, a: true }).reasons.join() === 'mx-added', 'MX mới → sự cố mx-added');
  ok(BW.classifyDomain({ ...base, a: true }, { ...base, a: true, level: 'regression', reasons: ['resolves'] }).level === 'regression', 'sự cố tên miền giữ đỏ tới khi bấm Đã xem');
  ok(BW.classifyDomain({ ...base, a: true }, { ...base, a: true, level: 'regression', reasons: ['resolves'], acked: true }).level === 'ok', 'đã xem → hết đỏ');
  ok(BW.classifyDomain({ status: 'err' }, null).level === 'manual', 'lỗi DNS → kiểm tay');
  ok(BW.classifyHandle({ platform: 'github', status: 'owned' }, false).state === 'missing' && BW.classifyHandle({ platform: 'github', status: 'owned' }, false).level === 'regression', 'tài khoản của mình mất → sự cố');
  ok(BW.classifyHandle({ platform: 'x', status: 'not-yet' }, null).reasons[0] === 'manual-only' && BW.classifyHandle({ platform: 'bluesky', status: 'not-yet' }, true, { state: 'available' }).reasons[0] === 'taken-now', 'X = kiểm tay · Bluesky vừa bị lấy');
  const fake = async (url) => /users\/lexkiteapp/.test(url) ? res(200, '{}') : /users\//.test(url) ? res(404, '') : /resolveHandle/.test(url) ? res(400, '{"error":"InvalidRequest","message":"Unable to resolve handle"}') : /youtube/.test(url) ? res(200, '<script>{"externalId":"UC1"}</script>', { url }) : res(500, '');
  ok(await BW.handleExists('github', 'lexkiteapp', fake) === true && await BW.handleExists('github', 'nobody', fake) === false && await BW.handleExists('bluesky', 'lexkite', fake) === false && await BW.handleExists('youtube', 'lexkite', fake) === true && await BW.handleExists('instagram', 'lexkite', fake) === null, 'kiểm tài khoản: GitHub/Bluesky/YouTube tự động, Instagram = không chắc');
  ok(BW.profileUrl('tiktok', 'lexkite') === 'https://www.tiktok.com/@lexkite' && BW.validateHandle({ platform: 'myspace', handle: 'x' }).errors.includes('platform'), 'URL hồ sơ · nền tảng lạ bị chặn');
}
// ---------- 7) Tải trang: thử lại có giãn cách, không thử lại khi bị chặn ----------
{
  let calls = 0; const waits = [];
  const g = P.makeFetcher({ fetch: async () => { calls++; return calls < 3 ? new Response('busy', { status: 503 }) : new Response('<title>ok</title>', { status: 200 }); }, sleep: async ms => { waits.push(ms); }, gap: 0 });
  let r = await g('https://a.example.org/'); ok(r.status === 200 && calls === 3 && waits.length >= 2 && waits[1] > waits[0], 'HTTP 503 → thử lại 3 lần, giãn cách tăng dần');
  calls = 0; const g2 = P.makeFetcher({ fetch: async () => { calls++; return new Response('x', { status: 403, headers: { 'cf-mitigated': 'challenge' } }); }, sleep: async () => {}, gap: 0 });
  r = await g2('https://b.example.org/'); ok(r.status === 403 && calls === 1, '403 bị chặn → không thử lại (lịch sự)');
  const g3 = P.makeFetcher({ fetch: async () => { throw Object.assign(new Error('aborted'), { name: 'AbortError' }); }, sleep: async () => {}, gap: 0 });
  r = await g3('https://c.example.org/'); ok(r.status === 0 && r.error === 'timeout', 'quá thời gian → error timeout');
  let ua = ''; const g4 = P.makeFetcher({ fetch: async (u, o) => { ua = o.headers['User-Agent']; return new Response('', { status: 200 }); }, sleep: async () => {}, gap: 0 }); await g4('https://d.example.org/');
  ok(/Mozilla\/5\.0/.test(ua), 'User-Agent trình duyệt thường');
}
// ---------- 8) Chạy đầy đủ (fetch giả) + issue GitHub ----------
const PAGES = {
  'https://dev.to/u/post-1': [200, fx('follow.html')], 'https://medium.com/@lexkite/p': [200, fx('medium-unavailable.html')], 'https://peerlist.io/lexkite': [403, fx('challenge.html')],
  'https://www.saashub.com/lexkite': [404, ''], 'https://lexkite.hashnode.dev/p': [200, fx('link-gone.html')],
};
const fakeFetch = async (url) => {
  url = String(url);
  if (url.startsWith('https://cloudflare-dns.com/')) { const q = new URL(url), name = q.searchParams.get('name'), type = q.searchParams.get('type');
    if (name === 'lexkite.net') return new Response(JSON.stringify(type === 'MX' ? { Status: 0, Answer: [{ type: 15, data: '10 mx.phish.example.' }] } : type === 'A' ? { Status: 0, Answer: [{ type: 1, data: '203.0.113.9' }] } : { Status: 0, Answer: [{ type: 2, data: 'ns1.example.' }] }), { status: 200 });
    return new Response(JSON.stringify({ Status: 3 }), { status: 200 }); }
  if (url.includes('api.github.com/repos/o/r/pulls/80')) return new Response(JSON.stringify({ state: 'closed', merged: true, base: { repo: { full_name: 'o/r' } } }), { status: 200 });
  if (url.includes('raw.githubusercontent.com/o/r/HEAD/README.md')) return new Response(fx('readme.md'), { status: 200 });
  if (url.includes('api.github.com/users/lexkiteapp')) return new Response('{}', { status: 200 });
  if (url.includes('api.github.com/users/')) return new Response('{}', { status: 404 });
  const p = PAGES[url]; return p ? new Response(p[1], { status: p[0], headers: p[0] === 403 ? { 'cf-mitigated': 'challenge' } : {} }) : new Response('', { status: 404 });
};
const placements = [
  { id: 'devto', platform: 'dev.to', type: 'article', url: 'https://dev.to/u/post-1', status: 'live', expectLink: 'lexkite.com', expectedRel: 'unknown', prev: { relBase: 'follow', noindexBase: false } },
  { id: 'medium', platform: 'Medium', type: 'article', url: 'https://medium.com/@lexkite/p', status: 'live', expectLink: 'lexkite.com', expectedRel: 'nofollow' },
  { id: 'peerlist', platform: 'Peerlist', type: 'profile', url: 'https://peerlist.io/lexkite', status: 'live', expectLink: 'lexkite.com', expectedRel: 'unknown' },
  { id: 'saashub', platform: 'SaaSHub', type: 'directory', url: 'https://www.saashub.com/lexkite', status: 'pending', expectLink: 'lexkite.com', expectedRel: 'unknown' },
  { id: 'hashnode', platform: 'Hashnode', type: 'article', url: 'https://lexkite.hashnode.dev/p', status: 'live', expectLink: 'lexkite.com', expectedRel: 'unknown' },
  { id: 'gh', platform: 'GitHub', type: 'pr', url: 'https://github.com/o/r/pull/80', status: 'live', expectLink: 'lexkite.com', expectedRel: 'nofollow' },
  { id: 'cb', platform: 'Crunchbase', type: 'profile', url: '', status: 'draft', expectLink: 'lexkite.com', expectedRel: 'nofollow' },
];
const handles = [{ platform: 'github', handle: 'lexkiteapp', status: 'owned' }, { platform: 'github', handle: 'gone', status: 'owned' }, { platform: 'x', handle: 'lexkite', status: 'not-yet' }];
const mk = () => P.makeFetcher({ fetch: fakeFetch, sleep: async () => {}, gap: 0 });
const rep = await CLI.runChecks({ placements, handles, domains: ['lexkite.net', 'lexkite.org'], domainsPrev: { 'lexkite.net': { status: 'nx', ns: false, a: false, aaaa: false, mx: false } }, get: mk(), getDns: mk() });
{
  const by = id => rep.placements.find(x => x.id === id);
  ok(by('devto').level === 'ok' && by('devto').rel === 'follow', 'devto ok');
  ok(by('medium').level === 'regression' && by('medium').reasons[0] === 'banned', 'medium bị khóa → sự cố');
  ok(by('peerlist').level === 'manual', 'peerlist bị chặn bot → kiểm tay');
  ok(by('saashub').level === 'ok' && by('saashub').reasons[0] === 'not-listed', 'saashub chờ duyệt, 404 = chưa lên');
  ok(by('hashnode').reasons.includes('link-gone'), 'hashnode mất link → sự cố');
  ok(by('gh').level === 'ok' && by('gh').state === 'pr-merged', 'PR GitHub merged + README còn link');
  ok(by('cb').level === 'skip', 'nháp → bỏ qua');
  const net = rep.domains.find(d => d.domain === 'lexkite.net');
  ok(net.level === 'regression' && net.reasons.includes('mx-added') && net.mxHosts[0] === 'mx.phish.example' && rep.domains.find(d => d.domain === 'lexkite.org').level === 'ok', 'tên miền na ná mới có A + MX → sự cố');
  ok(rep.handles.find(h => h.handle === 'gone').level === 'regression' && rep.handles.find(h => h.handle === 'lexkiteapp').state === 'ours' && rep.handles.find(h => h.platform === 'x').level === 'manual', 'tài khoản: mất · của mình · kiểm tay');
  ok(rep.regressions.map(r => r.key).sort().join() === 'dom:lexkite.net,h:github:gone,pl:hashnode,pl:medium', 'khóa sự cố: ' + rep.regressions.map(r => r.key));
  const md = CLI.summaryMd(rep); ok(/Sự cố/.test(md) && /tên miền na ná có MX/.test(md) && /Peerlist/.test(md), 'tóm tắt Markdown');
  // Issue: mở 3 mới (1 đã có), đóng 1 đã hết
  const gh = []; const ghf = async (url, o = {}) => { gh.push({ url, m: o.method || 'GET', b: o.body ? JSON.parse(o.body) : null, auth: o.headers && o.headers.Authorization });
    if (/issues\?labels=brand-watch/.test(url)) return new Response(JSON.stringify([{ number: 7, title: '🔗 brand-watch: Medium [bw:pl:medium]' }, { number: 9, title: '🔗 brand-watch: old [bw:pl:old]' }]), { status: 200 });
    return new Response('{}', { status: /\/labels$/.test(url) ? 422 : 201 }); };
  const s = await CLI.syncIssues(rep, { fetch: ghf, repo: 'o/r', token: 'ghs_SECRET_x', runUrl: 'https://github.com/o/r/actions/runs/1' });
  ok(s.opened.length === 3 && s.kept.join() === 'pl:medium' && s.closed.join() === 'pl:old', 'issue: mở 3, giữ 1, đóng 1 ' + JSON.stringify(s));
  ok(gh.filter(x => x.m === 'POST' && /\/issues$/.test(x.url)).every(x => x.b.labels[0] === 'brand-watch' && /\[bw:/.test(x.b.title)) && gh.some(x => x.m === 'PATCH' && /issues\/9$/.test(x.url) && x.b.state === 'closed'), 'issue có nhãn brand-watch + mã [bw:…]; issue hết sự cố được đóng');
  ok((await CLI.syncIssues(rep, { fetch: ghf, repo: 'o/r', token: '' })).skipped === 'no-token', 'không có token → bỏ qua issue');
}

// ---------- 9) API /api/backlinks + cảnh báo Quản trị + thư ----------
const sql = new DatabaseSync(':memory:');
const exec = (q, a) => /^\s*(SELECT|WITH)|RETURNING/i.test(q) ? { results: sql.prepare(q).all(...a) } : { results: [], meta: { changes: sql.prepare(q).run(...a).changes } };
const DB = { prepare(q) { const st = { args: [], bind(...a) { return { ...st, args: a }; }, async run() { return exec(q, this.args); }, async all() { return exec(q, this.args); }, async first() { return sql.prepare(q).get(...this.args) || null; } }; return st; },
  async batch(list) { const out = []; for (const x of list) out.push(await x.run()); return out; } };
const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
const b64u = b => Buffer.from(b).toString('base64url'), sec = Math.floor(Date.now() / 1000);
const tok = async email => { const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 3600, iat: sec, auth_time: sec, sub: 'u-' + email, email, email_verified: true })); return `${h}.${p}.${b64u(new Uint8Array(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))))}`; };
const gcalls = [];
globalThis.fetch = async (url, init = {}) => { url = String(url); if (url.includes('googleapis.com')) return { ok: true, json: async () => ({ keys: [jwk] }) }; gcalls.push({ url, init }); if (url.includes('/dispatches')) return new Response(null, { status: 204 }); if (url.includes('/actions/runs')) return new Response(JSON.stringify({ workflow_runs: [] }), { status: 200 }); return new Response('{}', { status: 404 }); };
const mails = [];
// bảng của các phần khác trong Quản trị (op alerts đọc chung) – tạo rỗng cho test
sql.exec('CREATE TABLE docs (uid TEXT, k TEXT, body TEXT, updated INTEGER); CREATE TABLE errors (h TEXT, msg TEXT, src TEXT, path TEXT, n INTEGER, last INTEGER); CREATE TABLE ai_quota (id TEXT, day TEXT, n INTEGER);');
const SECRET = 'cb_SECRET_7f6e5d4c3b2a1x', GHT = 'github_pat_SECRET_abcdef';
const ENV = { DB, ADMIN_EMAILS: 'boss@lexkite.com', STUDIO_CALLBACK_SECRET: SECRET, GH_DISPATCH_TOKEN: GHT, REPORT_NOTIFY_EMAIL: 'boss@lexkite.com', MAIL: { fetch: async (u, o) => { mails.push(JSON.parse(o.body)); return new Response('ok', { status: 200 }); } } };
const API = await import(new URL('../../functions/api/backlinks.js', import.meta.url)), ADMIN = await import(new URL('../../functions/api/admin.js', import.meta.url));
const call = async (tk, body, { env = ENV, origin = 'https://lexkite.com', headers = {}, raw } = {}) => {
  const r = await API.onRequestPost({ request: new Request('https://lexkite.com/api/backlinks', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}), ...(tk ? { Authorization: 'Bearer ' + tk } : {}), ...headers }, body: raw ?? JSON.stringify(body) }), env });
  const text = await r.text(); let j = {}; try { j = JSON.parse(text); } catch (e) { /* bỏ qua */ } return { s: r.status, j, text };
};
const ci = async (body, { secret = SECRET, ts, env = ENV } = {}) => { const raw = JSON.stringify(body); return call(null, null, { env, origin: null, raw, headers: CLI.signHeaders(secret, raw, ts) }); };
const ADM = await tok('boss@lexkite.com'), USR = await tok('someone@gmail.com');
const noLeak = (r, m) => ok(![SECRET, GHT].some(k => r.text.includes(k)), 'không lộ bí mật: ' + m);
{
  ok((await call(null, { op: 'list' })).s === 403 && (await call('a.b.c', { op: 'list' })).s === 403 && (await call(USR, { op: 'list' })).s === 403, 'không token / token giả / người thường → 403');
  ok((await call(ADM, { op: 'list' }, { origin: 'https://evil.example' })).s === 403, 'Origin lạ → 403');
  ok((await call(ADM, { op: 'constructor' })).s === 400 && (await call(ADM, { op: 'ciReport' })).s === 400, 'op lạ / op CI qua cổng quản trị → 400');
  let r = await call(ADM, { op: 'list' }); ok(r.s === 200 && r.j.placements.length === 0 && r.j.configured.ci && r.j.configured.dispatch && r.j.configured.mail, 'list rỗng + báo đã cấu hình (chỉ true/false)'); noLeak(r, 'list');
  r = await call(ADM, { op: 'placementSet', row: { id: 'x1', platform: 'Evil', type: 'article', url: 'javascript:alert(1)', status: 'live' } }); ok(r.s === 400 && r.j.fields.includes('url'), 'URL javascript: → 400');
  r = await call(ADM, { op: 'placementSet', row: { id: 'x1', platform: 'Dev', type: 'article', url: 'https://dev.to/x', account: 'me@gmail.com', status: 'live' } }); ok(r.s === 400 && r.j.fields.includes('email'), 'email trong tài khoản → 400');
  r = await call(ADM, { op: 'placementSet', isNew: true, row: { id: 'devto', platform: 'dev.to (sửa tay)', type: 'article', url: 'https://dev.to/u/post-1', status: 'live', expectedRel: 'follow', notes: '<b>hi</b>' } }); ok(r.s === 200, 'thêm mục hợp lệ');
  ok((await call(ADM, { op: 'placementSet', isNew: true, row: { id: 'devto', platform: 'x', type: 'article', url: 'https://dev.to/y', status: 'live' } })).s === 409, 'trùng mã khi thêm mới → 409');
  r = await call(ADM, { op: 'handleSet', row: { platform: 'x', handle: 'lexkite', status: 'owned' } }); ok(r.s === 200 && r.j.k === 'x:lexkite', 'thêm tài khoản');
  ok((await call(ADM, { op: 'handleSet', row: { platform: 'x', handle: 'bad handle!' } })).s === 400, 'tên tài khoản sai → 400');
  ok((await call(ADM, { op: 'checkNow' }, { env: { ...ENV, GH_DISPATCH_TOKEN: '' } })).j.need === 'GH_DISPATCH_TOKEN', 'Kiểm ngay khi thiếu GH_DISPATCH_TOKEN → not-configured');
  r = await call(ADM, { op: 'checkNow' }); const d = gcalls.find(c => c.url.includes('/actions/workflows/pr-check.yml/dispatches'));
  ok(r.s === 200 && d && d.init.headers.Authorization === 'Bearer ' + GHT, 'Kiểm ngay → workflow_dispatch pr-check.yml'); noLeak(r, 'checkNow');
  // CI
  ok((await ci({ op: 'ciSync' }, { env: { ...ENV, STUDIO_CALLBACK_SECRET: '' } })).s === 503, 'máy chủ chưa có secret → 503');
  ok((await ci({ op: 'ciSync' }, { secret: 'wrong_secret_wrong_secret' })).s === 403, 'chữ ký sai → 403');
  ok((await ci({ op: 'ciSync' }, { ts: sec - 3600 })).s === 403, 'dấu thời gian cũ (phát lại) → 403');
  const raw = JSON.stringify({ op: 'ciSync' }); ok((await call(null, null, { origin: null, raw: raw + ' ', headers: CLI.signHeaders(SECRET, raw) })).s === 403, 'thân bị sửa sau khi ký → 403');
  ok((await ci({ op: 'list' })).s === 400, 'CI không gọi được op quản trị');
  const sv = await API.ciHeaders(SECRET, raw, sec), cl = CLI.signHeaders(SECRET, raw, sec); ok(sv['X-BW-Sig'] === cl['X-BW-Sig'], 'chữ ký CLI (node:crypto) = máy chủ (WebCrypto)');
  r = await ci({ op: 'ciSync', placements: [...placements.map(({ prev, ...x }) => ({ ...x, submittedAt: '2026-10-17', account: '', notes: '' })), { id: 'evil', platform: 'x', type: 'article', url: 'javascript:1', status: 'live' }], handles });
  ok(r.s === 200 && r.j.placements.length === 7 && !r.j.placements.some(p => p.id === 'evil'), 'ciSync: seed 6 mục mới, bỏ mục sai, giữ mục anh thêm');
  ok(r.j.placements.find(p => p.id === 'devto').platform === 'dev.to (sửa tay)', 'seed KHÔNG ghi đè mục anh đã sửa trong Quản trị');
  ok(r.j.handles.length === 3 && r.j.handles.find(h => h.platform === 'x').status === 'owned', 'ciSync: tài khoản seed + giữ bản anh sửa');
  mails.length = 0;
  r = await ci({ op: 'ciReport', run: { url: 'https://github.com/o/r/actions/runs/1', sha: 'abcdef1', counts: { checked: 9, regression: 4 } }, placements: rep.placements, domains: rep.domains, handles: rep.handles });
  ok(r.s === 200 && r.j.stored.p === 7 && r.j.stored.d === 2, 'ciReport lưu kết quả ' + JSON.stringify(r.j));
  ok(mails.length === 2 && /⛔/.test(mails[0].subject) && /Medium/.test(mails[0].text) && /lexkite\.net/.test(mails[0].text) && /gone/.test(mails[0].text) && mails[0].to === 'boss@lexkite.com', 'thư sự cố nghiêm trọng gửi ngay (bị khóa, MX, tài khoản mất)');
  ok(/Bản tin tuần/.test(mails[1].subject) && /Tên miền na ná/.test(mails[1].text), 'bản tin tuần lần đầu');
  mails.length = 0; await ci({ op: 'ciReport', placements: rep.placements, domains: rep.domains, handles: rep.handles }); ok(mails.length === 0, 'lần sau cùng sự cố → không gửi thư lặp, chưa tới hạn bản tin');
  r = await call(ADM, { op: 'list' }); const md = r.j.placements.find(p => p.id === 'medium'); if (!(md.history.length === 2)) console.log(JSON.stringify(md).slice(0,500), r.j.run);
  ok(md.last.level === 'regression' && md.history.length === 2 && r.j.run && r.j.run.at > 0 && r.j.domains.find(x => x.domain === 'lexkite.net').mx, 'list: kết quả + lịch sử + lần chạy + tên miền');
  ok(r.j.placements.find(p => p.id === 'devto').relBase === 'follow', 'mốc rel lưu ở D1');
  let al = await ADMIN.onRequestPost({ request: new Request('https://lexkite.com/api/admin', { method: 'POST', headers: { Origin: 'https://lexkite.com', Authorization: 'Bearer ' + ADM, 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'alerts' }) }), env: ENV });
  const aj = await al.json(); if (!aj.rows) console.log('alerts:', al.status, aj); let rows = aj.rows || [];  const row = k => rows.find(x => x.kind === k);
  ok(row('backlink') && !row('backlink').ok && row('backlink').url === '/admin.html#backlinks' && row('brand') && !row('brand').ok, 'Quản trị → Cảnh báo: Backlink & PR + Thương hiệu đỏ');
  ok((await call(ADM, { op: 'domainAck', domain: 'lexkite.net' })).s === 200, 'Đã xem tên miền');
  const fixed = rep.placements.map(p => ['medium', 'hashnode'].includes(p.id) ? { ...p, level: 'ok', state: 'ok', reasons: [], link: true, rel: 'nofollow' } : p);
  await ci({ op: 'ciReport', placements: fixed, domains: rep.domains.map(x => ({ ...x, level: 'ok', reasons: ['active'] })), handles: rep.handles.map(h => ({ ...h, level: h.level === 'regression' ? 'ok' : h.level, state: h.state === 'missing' ? 'ours' : h.state })) });
  await ci({ op: 'ciCopy', configured: true, probes: [{ url: 'https://lexkite.com/en/blog/a/', sentence: 'A distinctive sentence', status: 200, suspects: [{ url: 'https://copycat.example.net/a', title: '<img src=x onerror=alert(1)>' }, { url: 'javascript:alert(1)' }] }] });
  al = await ADMIN.onRequestPost({ request: new Request('https://lexkite.com/api/admin', { method: 'POST', headers: { Origin: 'https://lexkite.com', Authorization: 'Bearer ' + ADM, 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'alerts' }) }), env: ENV });
  rows = (await al.json()).rows || [];
  ok(row('backlink').ok && row('brand').ok, 'hết sự cố → cảnh báo tự hết đỏ');
  ok(row('copy') && !row('copy').ok && /1/.test(row('copy').conclusion), 'Nghi bị chép → cảnh báo đỏ');
  r = await call(ADM, { op: 'list' }); ok(r.j.copy.probes[0].suspects.length === 1, 'ciCopy: bỏ URL javascript:');
  r = await call(ADM, { op: 'export' }); ok(r.j.placements.length === 7 && r.j.placements.every(p => !('last' in p) && !('by' in p)), 'Xuất JSON đúng định dạng file (không có dữ liệu kiểm/email người sửa)');
  ok((await call(ADM, { op: 'placementDelete', id: 'cb' })).s === 200 && !(await call(ADM, { op: 'list' })).j.placements.some(p => p.id === 'cb'), 'xóa mục');
  r = await ci({ op: 'ciSync', placements: [{ id: 'cb', platform: 'Crunchbase', type: 'profile', url: '', status: 'draft' }] }); ok(!r.j.placements.some(p => p.id === 'cb'), 'mục đã xóa không bị seed tạo lại');
  const big = await call(ADM, null, { raw: JSON.stringify({ op: 'list', pad: 'x'.repeat(600 * 1024) }) }); ok(big.s === 413, 'thân quá lớn → 413');
  ok(sql.prepare("SELECT COUNT(*) AS n FROM admin_log WHERE op LIKE 'bw:%'").get().n >= 3, 'thao tác ghi được ghi nhật ký quản trị');
}

console.log(fails ? `✗ pr-check: ${fails} lỗi / ${n}` : `✓ pr-check: ${n} kiểm tra đạt (link/rel/noindex, gỡ/khóa/chặn bot, phân loại, DNS, tài khoản, thử lại, issue, HMAC, API, cảnh báo, thư, bảng docs)`);
process.exit(fails ? 1 : 0);
