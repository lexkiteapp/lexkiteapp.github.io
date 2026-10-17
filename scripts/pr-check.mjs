// 🔗 Kiểm backlink / bài PR / hồ sơ + theo dõi thương hiệu (tên miền na ná, tài khoản mạng xã hội) – chạy hằng ngày trên GitHub Actions (pr-check.yml).
// Nguồn: content/pr/placements.json (sổ bài PR) + content/brand/watch.json (tên miền, tài khoản); có --remote thì đồng bộ với D1 qua /api/backlinks
// (sổ anh sửa trong Quản trị + mốc lần trước) và gửi kết quả lên Quản trị → Backlink, PR & Thương hiệu (cảnh báo, thư, bản tin tuần).
// Dùng:
//   node scripts/pr-check.mjs [--remote] [--only <id>] [--no-brand] [--out reports/pr-check.json] [--md reports/pr-check.md]
//   node scripts/pr-check.mjs --issues reports/pr-check.json     mở/đóng issue GitHub (nhãn brand-watch) theo sự cố đang có (cần GITHUB_TOKEN)
//   node scripts/pr-check.mjs --push-copy reports/copy-watch.json gửi kết quả dò bản sao chép (content-protect.yml) lên Quản trị
//   node scripts/pr-check.mjs --table [--check]                  sinh lại bảng "Tiến độ đăng" trong docs/PR-PLATFORMS.md từ placements.json
// Biến môi trường: STUDIO_CALLBACK_SECRET (ký HMAC gửi /api/backlinks – bí mật CI sẵn có), LEXKITE_CI_HEADER (qua WAF), GITHUB_TOKEN (API GitHub).
// Thoát: 0 ổn · 1 có sự cố thật (live → bị gỡ / mất link / rel tụt / thêm noindex, tên miền na ná mới phân giải/có MX, tài khoản của mình mất)
//        · 3 không kiểm được mục nào (tránh "xanh giả"). Bị chặn bot (403/challenge) = "kiểm tay", KHÔNG tính là bị gỡ. Không bao giờ in bí mật.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFile } from 'node:child_process'; import { pathToFileURL } from 'node:url';
import { makeFetcher, checkPlacement, classify, validatePlacement } from './lib/pr-check.mjs';
import { domainList, checkDomain, classifyDomain, handleExists, classifyHandle, validateHandle, profileUrl } from './lib/brand-watch.mjs';

export const API = process.env.BW_API || 'https://lexkite.com/api/backlinks';
const STATUS_VI = { live: '✅ Đang hiển thị', pending: '⏳ Chờ duyệt', draft: '✍️ Nháp', removed: '⛔ Đã gỡ' };
const ORDER = { ok: 0, skip: 0, manual: 1, change: 2, regression: 3 };

// ---------- Bảng "Tiến độ đăng" trong docs/PR-PLATFORMS.md (sinh từ JSON – nguồn gốc duy nhất) ----------
const START = '<!-- pr-table:start (sinh tự động từ content/pr/placements.json – sửa JSON rồi chạy: node scripts/pr-check.mjs --table) -->', END = '<!-- pr-table:end -->';
const cell = s => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const dmy = d => (/^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d.split('-').reverse().join('/') : '—');
export function tableMd(placements) {
  const rows = placements.map((p, i) => `| ${i + 1} | ${cell(p.platform)} | ${STATUS_VI[p.status] || p.status} | ${dmy(p.submittedAt)} | ${p.url ? cell(p.url) : '—'} | ${cell(p.type)}${p.account ? ' · @' + cell(p.account) : ''} | ${cell(p.notes)} |`);
  return ['| # | Trang | Trạng thái | Ngày | Link kiểm tra | Loại · tài khoản | Ghi chú |', '|---|---|---|---|---|---|---|', ...rows].join('\n');
}
export function applyTable(doc, table) {
  const i = doc.indexOf(START), j = doc.indexOf(END);
  if (i < 0 || j < i) throw new Error('docs/PR-PLATFORMS.md thiếu mốc ' + START.slice(0, 22) + ' … ' + END);
  return doc.slice(0, i + START.length) + '\n' + table + '\n' + doc.slice(j);
}

// ---------- Kiểm ----------
/** Chạy toàn bộ kiểm (fetch tiêm vào để test). → báo cáo { at, placements, domains, handles, counts, regressions } */
export async function runChecks({ placements = [], handles = [], domains = [], domainsPrev = {}, get, getDns, ghHeaders = {}, only = null, brand = true, log = () => {} }) {
  const rep = { at: new Date().toISOString(), placements: [], domains: [], handles: [] };
  for (const p of placements) {
    if (only && p.id !== only) continue;
    if (p.status !== 'live' && p.status !== 'pending') { rep.placements.push({ id: p.id, platform: p.platform, url: p.url, status: p.status, state: 'skipped', level: 'skip', reasons: [p.status] }); continue; }
    const r = await checkPlacement(p, get, { ghHeaders }), c = classify(p, r, p.prev || null);
    rep.placements.push({ id: p.id, platform: p.platform, url: p.url, status: p.status, http: r.http, final: r.final, link: r.link ?? null, rel: r.rel ?? null, noindex: r.noindex ?? null, title: r.title || '', state: r.state, note: r.note || '', level: c.level, reasons: c.reasons, relBase: c.relBase, noindexBase: c.noindexBase });
    log(`${{ ok: '✓', change: '🔔', regression: '⛔', manual: '👀', skip: '·' }[c.level]} ${p.platform}: ${r.state}${r.http ? ' HTTP ' + r.http : ''}${r.link != null ? ' · link ' + (r.link ? '✓' : '✗') : ''}${r.rel ? ' · ' + r.rel : ''}${r.noindex ? ' · noindex' : ''}${c.reasons.length ? ' – ' + c.reasons.join(', ') : ''}`);
  }
  if (brand && !only) {
    for (const d of domains) {
      const cur = await checkDomain(d, getDns || get), c = classifyDomain(cur, domainsPrev[d] || null);
      rep.domains.push({ ...cur, level: c.level, reasons: c.reasons });
      if (c.level !== 'ok' || cur.a || cur.aaaa || cur.mx) log(`${c.level === 'regression' ? '⛔' : '·'} ${d}: ${cur.status}${cur.a || cur.aaaa ? ' · A' : ''}${cur.mx ? ' · MX ' + cur.mxHosts.join(',') : ''}${c.reasons.length ? ' – ' + c.reasons.join(', ') : ''}`);
    }
    for (const h of handles) {
      const ex = await handleExists(h.platform, h.handle, get, { ghHeaders }), c = classifyHandle(h, ex, h.prev || null);
      rep.handles.push({ platform: h.platform, handle: h.handle, url: h.url || profileUrl(h.platform, h.handle), status: h.status, exists: ex, state: c.state, level: c.level, reasons: c.reasons });
      log(`${c.level === 'regression' ? '⛔' : '·'} @${h.handle} (${h.platform}): ${c.state}`);
    }
  }
  const cnt = {}; for (const x of [...rep.placements, ...rep.domains, ...rep.handles]) cnt[x.level] = (cnt[x.level] || 0) + 1;
  rep.counts = { ...cnt, checked: rep.placements.filter(x => x.level !== 'skip').length + rep.domains.length + rep.handles.length };
  rep.regressions = regressionsOf(rep);
  return rep;
}
/** Sự cố đang có (mỗi mục 1 khóa ổn định cho issue GitHub). */
export function regressionsOf(rep) {
  return [
    ...rep.placements.filter(x => x.level === 'regression').map(x => ({ key: `pl:${x.id}`, kind: 'placement', label: `${x.platform}: ${x.reasons.join(', ')}`, url: x.url, reasons: x.reasons })),
    ...rep.domains.filter(x => x.level === 'regression').map(x => ({ key: `dom:${x.domain}`, kind: 'domain', label: `${x.domain}: ${x.reasons.join(', ')}`, url: `https://${x.domain}/`, reasons: x.reasons, mxHosts: x.mxHosts })),
    ...rep.handles.filter(x => x.level === 'regression').map(x => ({ key: `h:${x.platform}:${x.handle.toLowerCase()}`, kind: 'handle', label: `${x.platform} @${x.handle}: ${x.reasons.join(', ')}`, url: x.url, reasons: x.reasons })),
  ];
}
const WHY = { removed: 'bị gỡ / 404', banned: 'tài khoản/bài bị khóa', 'link-gone': 'mất link về lexkite.com', 'rel-nofollow': 'rel tụt xuống nofollow/ugc', 'noindex-added': 'trang bị thêm noindex', resolves: 'tên miền na ná bắt đầu phân giải', 'mx-added': 'tên miền na ná có MX (nguy cơ thư lừa đảo)', missing: 'tài khoản của mình không còn', listed: 'đã được duyệt – đổi trạng thái sang live', merged: 'PR đã merge – đổi sang live', 'pr-closed': 'PR bị đóng không merge', 'rel-follow': 'rel nâng lên follow', redirected: 'trang chuyển hướng', taken: 'tên đã có người khác dùng', 'taken-now': 'tên vừa bị người khác lấy', registered: 'tên miền na ná vừa được đăng ký' };
export function summaryMd(rep) {
  const L = [`## 🔗 Backlink, PR & Thương hiệu – ${rep.at.slice(0, 10)}`, '', `Đã kiểm ${rep.counts.checked} mục · sự cố ${rep.counts.regression || 0} · thay đổi ${rep.counts.change || 0} · kiểm tay ${rep.counts.manual || 0}`, ''];
  const sec = (t, xs) => { if (xs.length) L.push(`### ${t}`, ...xs, ''); };
  const why = r => r.map(x => WHY[x] || x).join('; ');
  sec('⛔ Sự cố', rep.regressions.map(r => `- **${r.label.split(':')[0]}** – ${why(r.reasons)} – ${r.url}`));
  sec('🔔 Thay đổi', [...rep.placements, ...rep.domains, ...rep.handles].filter(x => x.level === 'change').map(x => `- ${x.platform || x.domain}${x.handle ? ' @' + x.handle : ''} – ${why(x.reasons)}`));
  sec('👀 Kiểm tay (bị chặn bot / lỗi mạng – không phải bị gỡ)', [...rep.placements, ...rep.handles].filter(x => x.level === 'manual' && x.platform && !(x.reasons || []).includes('manual-only')).map(x => `- ${x.platform}${x.handle ? ' @' + x.handle : ''} – ${x.url}${x.http ? ' (HTTP ' + x.http + ')' : ''}`));
  L.push('| Trang | Trạng thái | HTTP | Link | rel | noindex | Kết quả |', '|---|---|---|---|---|---|---|', ...rep.placements.map(x => `| ${cell(x.platform)} | ${x.status} | ${x.http || '–'} | ${x.link == null ? '?' : x.link ? '✓' : '✗'} | ${x.rel || '–'} | ${x.noindex == null ? '–' : x.noindex ? 'có' : 'không'} | ${x.level}${x.reasons && x.reasons.length ? ' (' + x.reasons.join(', ') + ')' : ''} |`));
  return L.join('\n') + '\n';
}

// ---------- Issue GitHub (nhãn brand-watch): 1 issue / sự cố đang có, tự đóng khi hết ----------
export async function syncIssues(rep, { fetch: f = globalThis.fetch, repo, token, runUrl = '' }) {
  if (!repo || !token) return { skipped: 'no-token' };
  const H = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'User-Agent': 'lexkite-pr-check', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' }, B = `https://api.github.com/repos/${repo}`;
  await f(`${B}/labels`, { method: 'POST', headers: H, body: JSON.stringify({ name: 'brand-watch', color: 'B60205', description: 'Backlink / PR / thương hiệu – do pr-check.yml tự mở/đóng' }) }).catch(() => null); // 422 = đã có
  const r = await f(`${B}/issues?labels=brand-watch&state=open&per_page=100`, { headers: H }); const open = r.ok ? await r.json() : [];
  const keyOf = t => ((String(t || '').match(/\[bw:([^\]]+)\]/) || [])[1] || null), byKey = new Map(open.map(i => [keyOf(i.title), i]).filter(([k]) => k));
  const done = { opened: [], closed: [], kept: [] }, active = new Set(rep.regressions.map(x => x.key));
  for (const x of rep.regressions) {
    if (byKey.has(x.key)) { done.kept.push(x.key); continue; }
    const body = [`**${x.label}**`, '', ...x.reasons.map(k => `- ${WHY[k] || k}`), '', `URL: ${x.url}`, x.mxHosts && x.mxHosts.length ? `MX: ${x.mxHosts.join(', ')}` : '', '', 'Cách xử lý (mẫu thư/thông báo điền sẵn): Quản trị → Backlink, PR & Thương hiệu → "Cách xử lý". Issue tự đóng khi lần kiểm sau hết sự cố.', runUrl ? `Lần chạy: ${runUrl}` : ''].filter(s => s !== null).join('\n');
    const c = await f(`${B}/issues`, { method: 'POST', headers: H, body: JSON.stringify({ title: `🔗 brand-watch: ${x.label.slice(0, 120)} [bw:${x.key}]`, body, labels: ['brand-watch'] }) });
    if (c.ok) done.opened.push(x.key);
  }
  for (const [k, i] of byKey) {
    if (active.has(k)) continue;
    await f(`${B}/issues/${i.number}/comments`, { method: 'POST', headers: H, body: JSON.stringify({ body: `✅ ${rep.at.slice(0, 10)}: hết sự cố – tự đóng.${runUrl ? ' ' + runUrl : ''}` }) });
    const c = await f(`${B}/issues/${i.number}`, { method: 'PATCH', headers: H, body: JSON.stringify({ state: 'closed', state_reason: 'completed' }) });
    if (c.ok) done.closed.push(k);
  }
  return done;
}

// ---------- Gửi lên Quản trị (HMAC bằng STUDIO_CALLBACK_SECRET – cùng thuật toán functions/api/backlinks.js ciHeaders) ----------
export function signHeaders(secret, raw, ts = Math.floor(Date.now() / 1000)) {
  const h = crypto.createHash('sha256').update(raw).digest('hex');
  return { 'X-BW-Ts': String(ts), 'X-BW-Sig': crypto.createHmac('sha256', secret).update(`bw|${ts}.${h}`).digest('hex') };
}
export async function post(op, body, { secret = process.env.STUDIO_CALLBACK_SECRET || '', api = API, fetch: f = globalThis.fetch } = {}) {
  if (String(secret).length < 16) return { ok: false, error: 'no-secret' };
  const raw = JSON.stringify({ op, ...body }), ci = (process.env.LEXKITE_CI_HEADER || '').trim();
  try {
    const r = await f(api, { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'lexkite-pr-check', ...(ci ? { 'X-Lexkite-CI': ci } : {}), ...signHeaders(secret, raw) }, body: raw });
    const j = await r.json().catch(() => ({})); return r.ok ? { ok: true, ...j } : { ok: false, status: r.status, error: j.error || 'HTTP ' + r.status };
  } catch (e) { return { ok: false, error: String((e && e.message) || e).slice(0, 120) }; }
}

/** fetch qua curl (--curl / BW_CURL=1): máy cá nhân có proxy chặn DNS của Node. Header (kể cả token) truyền qua stdin, không hiện trong danh sách tiến trình. */
export function curlFetch(url, init = {}) {
  return new Promise(resolve => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-')), hf = path.join(dir, 'h'), bf = path.join(dir, 'b');
    const conf = Object.entries(init.headers || {}).map(([k, v]) => `header = "${k}: ${String(v).replace(/["\\\n]/g, '')}"`).join('\n') + '\n';
    const args = ['-s', '-L', '--max-redirs', '8', '--max-time', '25', '-K', '-', '-D', hf, '-o', bf, '-w', '%{http_code}\n%{url_effective}', '-X', init.method || 'GET', ...(init.body ? ['--data-binary', '@-'] : []), url];
    if (init.body) { fs.writeFileSync(path.join(dir, 'd'), init.body, { mode: 0o600 }); args.splice(args.indexOf('@-'), 1, '@' + path.join(dir, 'd')); }
    const ch = execFile('curl', args, { maxBuffer: 1e6 }, (err, out) => {
      const [code, eff] = String(out || '').split('\n'), raw = fs.existsSync(hf) ? fs.readFileSync(hf, 'utf8') : '', body = fs.existsSync(bf) ? fs.readFileSync(bf, 'utf8') : '';
      fs.rmSync(dir, { recursive: true, force: true });
      const blocks = raw.split(/\r?\n\r?\n/).filter(b => /^HTTP\//.test(b)), last = blocks[blocks.length - 1] || '', h = new Map();
      for (const l of last.split(/\r?\n/).slice(1)) { const i = l.indexOf(':'); if (i > 0) h.set(l.slice(0, i).trim().toLowerCase(), l.slice(i + 1).trim()); }
      const status = +code || 0;
      if (!status && err) return resolve(Promise.reject(new Error('curl ' + (err.code || 'error'))));
      resolve({ status, ok: status >= 200 && status < 300, url: eff || url, redirected: !!eff && eff !== url, headers: { get: k => h.get(String(k).toLowerCase()) ?? null }, text: async () => body, json: async () => JSON.parse(body) });
    });
    ch.stdin.end(conf);
  });
}
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; }, has = k => a.includes(k);
  const PL = readJson('content/pr/placements.json'), W = readJson('content/brand/watch.json');
  if (has('--table')) {
    const doc = fs.readFileSync('docs/PR-PLATFORMS.md', 'utf8'), next = applyTable(doc, tableMd(PL.placements));
    if (has('--check')) { if (next !== doc) { console.error('✗ docs/PR-PLATFORMS.md lệch content/pr/placements.json – chạy: node scripts/pr-check.mjs --table'); process.exit(1); } console.log('✓ bảng Tiến độ đăng khớp placements.json'); process.exit(0); }
    fs.writeFileSync('docs/PR-PLATFORMS.md', next); console.log('✓ đã sinh lại bảng Tiến độ đăng'); process.exit(0);
  }
  if (opt('--push-copy') != null) { // không bao giờ làm đỏ CI chỉ vì gửi lên Quản trị lỗi
    const f = opt('--push-copy'), rep = fs.existsSync(f) ? readJson(f) : null;
    const r = await post('ciCopy', rep ? { configured: true, probes: rep.probes || [], run: process.env.RUN_URL || '' } : { configured: process.env.BRAVE_SET === 'true', probes: [], run: process.env.RUN_URL || '' });
    console.log(r.ok ? `✓ đã gửi kết quả dò sao chép lên Quản trị (${r.n} câu)` : `::warning::Không gửi được kết quả dò sao chép lên Quản trị: ${r.error}`); process.exit(0);
  }
  if (opt('--issues') != null) {
    const rep = readJson(opt('--issues')), r = await syncIssues(rep, { repo: process.env.GITHUB_REPOSITORY, token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN, runUrl: process.env.RUN_URL || '' });
    console.log('issue brand-watch:', JSON.stringify(r)); process.exit(0);
  }
  // Sổ: file (đã kiểm hợp lệ) → nếu --remote: đồng bộ D1 (anh sửa trong Quản trị + mốc lần trước)
  let placements = PL.placements.map(x => { const v = validatePlacement(x); if (!v.ok) { console.error(`✗ placements.json: mục "${x.id}" sai trường ${v.errors.join(', ')}`); process.exit(3); } return v.row; });
  let handles = (W.handles || []).map(x => { const v = validateHandle(x); if (!v.ok) { console.error(`✗ watch.json: tài khoản ${x.platform}/${x.handle} sai trường ${v.errors.join(', ')}`); process.exit(3); } return v.row; });
  let domainsPrev = {}, remote = false;
  if (has('--remote')) {
    const s = await post('ciSync', { placements, handles });
    if (s.ok) { remote = true; placements = s.placements; handles = s.handles; domainsPrev = s.domains || {}; console.log(`· đồng bộ Quản trị: ${placements.length} mục, ${handles.length} tài khoản, ${Object.keys(domainsPrev).length} tên miền có mốc`); }
    else console.log(`::warning::Không đồng bộ được với Quản trị (${s.error}${s.status ? ', HTTP ' + s.status : ''}) – chỉ dùng file, không có mốc lần trước; kết quả vẫn ra artifact + issue.`);
  }
  const F = has('--curl') || process.env.BW_CURL === '1' ? curlFetch : globalThis.fetch;
  const gh = process.env.GITHUB_TOKEN ? { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN } : {};
  const rep = await runChecks({ placements, handles, domains: domainList(W), domainsPrev, get: makeFetcher({ fetch: F }), getDns: makeFetcher({ fetch: F, gap: 150 }), ghHeaders: gh, only: opt('--only'), brand: !has('--no-brand'), log: s => console.log(s) });
  rep.remote = remote;
  const out = opt('--out') || 'reports/pr-check.json', md = opt('--md') || 'reports/pr-check.md';
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(rep, null, 1)); fs.writeFileSync(md, summaryMd(rep));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryMd(rep));
  if (remote) { const r = await post('ciReport', { run: { url: process.env.RUN_URL || '', sha: process.env.GITHUB_SHA || '', counts: rep.counts }, placements: rep.placements, domains: rep.domains, handles: rep.handles }); console.log(r.ok ? `· đã gửi lên Quản trị${r.mailed && r.mailed.length ? ' · thư: ' + r.mailed.join(', ') : ''}` : `::warning::Không gửi được kết quả lên Quản trị: ${r.error}`); }
  console.log(`\n${rep.regressions.length ? '⛔' : '✓'} pr-check: ${rep.counts.checked} mục · sự cố ${rep.regressions.length} · thay đổi ${rep.counts.change || 0} · kiểm tay ${rep.counts.manual || 0} → ${out}`);
  process.exit(rep.regressions.length ? 1 : rep.counts.checked ? 0 : 3);
}
