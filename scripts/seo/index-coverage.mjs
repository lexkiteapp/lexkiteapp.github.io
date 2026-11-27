// 🔎 Độ phủ chỉ mục THẬT của lexkite.com (chạy trong seo-gsc.yml sau báo cáo GSC, cùng secret GSC_SA_JSON):
//   1. Sitemaps API: sitemap nào Google đã đọc, lúc nào, lỗi/cảnh báo, số URL đã gửi.
//   2. URL Inspection API: mẫu ngẫu nhiên-có-hạt-giống-theo-tuần BUDGET URL rải theo tỉ lệ từng sitemap con (tối thiểu MIN_PER) →
//      coverageState (Đã index / Đã thu thập – chưa index / Đã phát hiện – chưa index / …), canonical Google chọn ≠ canonical của mình,
//      robots/fetch lỗi → ước tính số trang index mỗi nhóm (words-th, blog-en, pages…) = tỉ lệ index mẫu × số URL trong sitemap.
//   3. Máy gác: so với lần đo trước (reports/seo/index-*.json) và 2 báo cáo GSC gần nhất → tụt ≥ DROP (số trang index ước tính,
//      lượt bấm 28 ngày, số trang có hiển thị) hoặc báo cáo GSC cũ > STALE_DAYS → ::error + exit 1 (ci-triage mở issue).
// Hạn mức URL Inspection: 2.000 lượt/ngày, 600/phút mỗi site → BUDGET 400/tuần, 4 luồng, dừng sau DEADLINE_MIN phút (ước tính trên phần đã kiểm). Test: scripts/test/index-coverage.mjs.
//   node scripts/seo/index-coverage.mjs [--date YYYY-MM-DD] [--root .] [--fixture f.json]   (thiếu secret → bỏ qua, xanh)
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { SITE, ORIGIN, getToken, call } from './gsc.mjs';

export const BUDGET = 400, MIN_PER = 4, DEADLINE_MIN = Number(process.env.INDEX_DEADLINE_MIN || 9), DROP = 0.25, STALE_DAYS = 9, KEEP = 26;
const API = 'https://searchconsole.googleapis.com/';
const locs = x => [...String(x).matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
export const group = sm => (/sitemap-([a-z-]+?)(?:-\d+)?\.xml$/.exec(sm) || [, 'root'])[1];

/** Chọn mẫu ổn định trong tuần (hạt giống = ngày) – lần chạy lại cùng ngày ra cùng mẫu, tuần sau mẫu khác. */
export function sample(maps, budget = BUDGET, seed = '') {
  const total = maps.reduce((s, m) => s + m.urls.length, 0) || 1, out = [];
  for (const m of maps) {
    const k = Math.min(m.urls.length, Math.max(MIN_PER, Math.round(budget * m.urls.length / total)));
    const h = u => crypto.createHash('sha1').update(seed + u).digest('hex');
    out.push(...m.urls.map(u => [h(u), u]).sort().slice(0, k).map(([, u]) => ({ url: u, sitemap: m.sitemap, group: group(m.sitemap) })));
  }
  return out;
}

export const isIndexed = r => r?.verdict === 'PASS' || /^(Submitted and indexed|Indexed)/i.test(r?.coverageState || '');

/** Gộp kết quả kiểm theo nhóm → ước tính số trang index; trạng thái phủ đếm theo nhóm. */
export function summarize(maps, checked) {
  const groups = {};
  for (const m of maps) { const g = groups[group(m.sitemap)] ||= { urls: 0, sampled: 0, indexed: 0, states: {}, canonMismatch: 0, errors: 0 }; g.urls += m.urls.length; }
  for (const c of checked) {
    const g = groups[c.group]; if (!g) continue;
    if (c.error) { g.errors++; continue; }
    g.sampled++; if (isIndexed(c.result)) g.indexed++;
    const st = c.result?.coverageState || c.result?.verdict || '?'; g.states[st] = (g.states[st] || 0) + 1;
    const gc = c.result?.googleCanonical, uc = c.result?.userCanonical;
    if (gc && uc && gc !== uc) g.canonMismatch++;
  }
  let urls = 0, est = 0, sampled = 0, indexed = 0; const states = {};
  for (const g of Object.values(groups)) {
    g.rate = g.sampled ? g.indexed / g.sampled : null; g.estIndexed = g.rate == null ? null : Math.round(g.rate * g.urls);
    urls += g.urls; sampled += g.sampled; indexed += g.indexed; est += g.estIndexed || 0;
    for (const [k, v] of Object.entries(g.states)) states[k] = (states[k] || 0) + v;
  }
  return { urls, sampled, indexed, estIndexed: est, rate: sampled ? indexed / sampled : null, states, groups };
}

const readJson = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const latest = (dir, re, before) => fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => re.test(f) && (!before || f.match(re)[1] < before)).sort().reverse() : [];

/** Máy gác: trả danh sách cảnh báo (rỗng = ổn). */
export function alerts(root, date, cur) {
  const dir = path.join(root, 'reports/seo'), out = [];
  const prevF = latest(dir, /^index-(\d{4}-\d{2}-\d{2})\.json$/, date)[0], prev = prevF && readJson(path.join(dir, prevF));
  // 24/11: mẫu URL Inspection đổi theo ngày (seed = ngày) → 4/343 so với 1/344 trúng là nhiễu (lượt bấm GSC vẫn tăng 89→92), không phải tụt thật.
  // Có đủ số mẫu thì chỉ báo khi chênh tỉ lệ index có ý nghĩa (z ≥ 3, kiểm định hai tỉ lệ); thiếu số mẫu → luật cũ.
  const sig = (a, b) => { if (!(a?.sampled > 0 && b?.sampled > 0)) return true; const p = (a.indexed + b.indexed) / (a.sampled + b.sampled), se = Math.sqrt(p * (1 - p) * (1 / a.sampled + 1 / b.sampled)); return se === 0 ? a.indexed !== b.indexed : (a.indexed / a.sampled - b.indexed / b.sampled) / se >= 3; };
  if (cur && prev?.summary?.estIndexed > 0 && cur.estIndexed < prev.summary.estIndexed * (1 - DROP) && sig(prev.summary, cur))
    out.push(`Số trang index ước tính tụt ${prev.summary.estIndexed} → ${cur.estIndexed} (${prevF})`);
  const g = latest(dir, /^gsc-(\d{4}-\d{2}-\d{2})\.json$/, null).filter(f => f.slice(4, 14) <= date);
  if (!g.length) out.push('Chưa có báo cáo GSC nào trong reports/seo');
  else {
    const age = (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${g[0].slice(4, 14)}T00:00:00Z`)) / 864e5;
    if (age > STALE_DAYS) out.push(`Báo cáo GSC mới nhất ${g[0]} đã ${age} ngày (> ${STALE_DAYS}) – lịch seo-gsc không chạy hoặc lỗi`);
    // so với báo cáo cách ≥ 6 ngày (bỏ lượt chạy lại cùng tuần)
    const a = readJson(path.join(dir, g[0])), bF = g.find(f => (Date.parse(g[0].slice(4, 14)) - Date.parse(f.slice(4, 14))) / 864e5 >= 6), b = bF && readJson(path.join(dir, bF));
    if (a && b) {
      const c = x => x?.totals?.current?.clicks ?? 0, p = x => x?.rows?.pageCur ?? 0;
      if (c(b) >= 20 && c(a) < c(b) * (1 - DROP)) out.push(`Lượt bấm 28 ngày tụt ${c(b)} → ${c(a)} (${bF} → ${g[0]})`);
      // 27/11: đỉnh hiển thị 2 ngày (24–25/10, ~9,5k lượt) trôi khỏi cửa sổ 28 ngày → trang có hiển thị 2881→372 dù lượt bấm tăng 71→86: không phải mất thật.
      // Số trang tụt chỉ đáng báo khi lượt bấm cũng không tăng so với mốc (đỉnh hiển thị trôi đi ≠ mất lưu lượng).
      if (p(b) >= 50 && p(a) < p(b) * (1 - DROP) && c(a) <= c(b)) out.push(`Số trang có hiển thị tụt ${p(b)} → ${p(a)} (${bF} → ${g[0]})`);
    }
  }
  return out;
}

const pct = x => x == null ? '–' : `${(x * 100).toFixed(1)} %`;
export function markdown(rep) {
  const s = rep.summary, L = [`# Độ phủ chỉ mục – ${rep.date}`, '', `Thuộc tính \`${SITE}\` · mẫu ${s.sampled} URL (URL Inspection API) trên ${s.urls} URL sitemap.`, '',
    `**Ước tính đã index: ${s.estIndexed} / ${s.urls} (${pct(s.rate)} mẫu)**`, '', '| Nhóm sitemap | URL | Mẫu | Index | Tỉ lệ | Ước tính index | Canonical Google ≠ mình |', '|---|---|---|---|---|---|---|'];
  for (const [k, g] of Object.entries(s.groups).sort((a, b) => b[1].urls - a[1].urls)) L.push(`| ${k} | ${g.urls} | ${g.sampled} | ${g.indexed} | ${pct(g.rate)} | ${g.estIndexed ?? '–'} | ${g.canonMismatch} |`);
  L.push('', '## Trạng thái phủ (mẫu)', '', '| Trạng thái | Số URL |', '|---|---|');
  for (const [k, v] of Object.entries(s.states).sort((a, b) => b[1] - a[1])) L.push(`| ${k} | ${v} |`);
  if (rep.sitemaps?.length) {
    L.push('', '## Sitemap Google đã đọc', '', '| Sitemap | Đọc lần cuối | Đã gửi | Lỗi | Cảnh báo |', '|---|---|---|---|---|');
    for (const m of rep.sitemaps) L.push(`| ${m.path.replace(ORIGIN, '')} | ${(m.lastDownloaded || '–').slice(0, 10)} | ${(m.contents || []).reduce((a, c) => a + Number(c.submitted || 0), 0)} | ${m.errors || 0} | ${m.warnings || 0} |`);
  }
  const ex = rep.checked.filter(c => c.result && !isIndexed(c.result)).slice(0, 25);
  if (ex.length) { L.push('', '## Ví dụ chưa index', '', '| URL | Trạng thái | Thu thập lần cuối |', '|---|---|---|'); for (const c of ex) L.push(`| ${c.url.replace(ORIGIN, '')} | ${c.result.coverageState || c.result.verdict} | ${(c.result.lastCrawlTime || '–').slice(0, 10)} |`); }
  L.push('', '## Máy gác', '', rep.alerts.length ? rep.alerts.map(a => `- ⚠ ${a}`).join('\n') : '- ✓ không tụt, báo cáo GSC còn mới', '', '_Tự sinh bởi `scripts/seo/index-coverage.mjs` (seo-gsc.yml)._', '');
  return L.join('\n');
}

async function pool(items, n, fn) { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } })); return out; }

export async function pull(sa, date, fetchImpl = fetch) {
  const token = await getToken(sa, fetchImpl), H = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const idx = await (await fetchImpl(`${ORIGIN}/sitemap.xml`, { headers: { 'user-agent': 'lexkite-index-coverage' } })).text();
  const children = idx.includes('<sitemapindex') ? locs(idx) : [`${ORIGIN}/sitemap.xml`];
  const maps = await pool(children, 4, async sm => ({ sitemap: sm, urls: locs(await (await fetchImpl(sm, { headers: { 'user-agent': 'lexkite-index-coverage' } })).text()) }));
  let sitemaps = [];
  try { sitemaps = (await call(fetchImpl, `${API}webmasters/v3/sites/${encodeURIComponent(SITE)}/sitemaps`, { headers: H }, 'sitemaps')).sitemap || []; } catch (e) { console.warn(`⚠ ${e.message}`); }
  // xen kẽ các nhóm (thứ tự băm) → hết giờ giữa chừng vẫn có mẫu ở mọi nhóm, không lệch về sitemap đầu danh sách
  const picks = sample(maps, BUDGET, date).map(p => [crypto.createHash('sha1').update(date + '|' + p.url).digest('hex'), p]).sort((a, b) => a[0] < b[0] ? -1 : 1).map(([, p]) => p);
  const stop = Date.now() + DEADLINE_MIN * 60e3; // 22/11: URL Inspection ~3–5 s/lượt → 600 lượt vượt timeout job; hết giờ → báo phần đã kiểm
  const checked = (await pool(picks, 4, async p => {
    if (Date.now() > stop) return null;
    try {
      const j = await call(fetchImpl, `${API}v1/urlInspection/index:inspect`, { method: 'POST', headers: H, body: JSON.stringify({ inspectionUrl: p.url, siteUrl: SITE, languageCode: 'en' }) }, 'urlInspection');
      const r = j.inspectionResult?.indexStatusResult || {};
      return { ...p, result: { verdict: r.verdict, coverageState: r.coverageState, robotsTxtState: r.robotsTxtState, indexingState: r.indexingState, pageFetchState: r.pageFetchState, googleCanonical: r.googleCanonical, userCanonical: r.userCanonical, lastCrawlTime: r.lastCrawlTime } };
    } catch (e) { return { ...p, error: e.message.slice(0, 160) }; }
  })).filter(Boolean);
  if (checked.length < picks.length) console.warn(`⚠ index-coverage: hết ${DEADLINE_MIN} phút – kiểm ${checked.length}/${picks.length} URL`);
  return { maps, sitemaps, checked };
}

export function build(root, date, data) {
  const summary = summarize(data.maps, data.checked);
  const errs = data.checked.filter(c => c.error);
  if (data.checked.length && errs.length === data.checked.length) throw new Error(`URL Inspection lỗi mọi lượt: ${errs[0].error}`);
  const rep = { date, site: SITE, summary, sitemaps: (data.sitemaps || []).map(({ path: p, lastDownloaded, errors, warnings, isPending, contents }) => ({ path: p, lastDownloaded, errors: Number(errors || 0), warnings: Number(warnings || 0), isPending, contents })), checked: data.checked, alerts: [] };
  rep.alerts = alerts(root, date, summary);
  return rep;
}

export function write(root, date, rep) {
  const dir = path.join(root, 'reports/seo'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `index-${date}.json`), JSON.stringify(rep, null, 1) + '\n');
  fs.writeFileSync(path.join(dir, `index-${date}.md`), markdown(rep));
  const keep = latest(dir, /^index-(\d{4}-\d{2}-\d{2})\.json$/).slice(KEEP).map(f => f.slice(6, 16));
  for (const d of keep) for (const e of ['json', 'md']) fs.rmSync(path.join(dir, `index-${d}.${e}`), { force: true });
}

async function main(argv) {
  const arg = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
  const root = arg('--root') || '.', date = arg('--date') || new Date().toISOString().slice(0, 10), fx = arg('--fixture');
  let data;
  if (fx) data = JSON.parse(fs.readFileSync(fx, 'utf8'));
  else {
    const raw = process.env.GSC_SA_JSON;
    if (!raw || !raw.trim()) {
      const a = alerts(root, date, null); a.forEach(x => console.log(`::error title=SEO::${x}`));
      console.log('index-coverage: chưa có GSC_SA_JSON → bỏ phần URL Inspection'); return process.exit(a.length ? 1 : 0);
    }
    data = await pull(JSON.parse(raw), date);
  }
  const rep = build(root, date, data); write(root, date, rep);
  const s = rep.summary;
  console.log(`✓ index-coverage: ước tính index ${s.estIndexed}/${s.urls} · mẫu ${s.indexed}/${s.sampled} (${pct(s.rate)}) · lỗi ${rep.checked.filter(c => c.error).length}`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown(rep));
  if (rep.alerts.length) { rep.alerts.forEach(x => console.log(`::error title=SEO tụt::${x}`)); process.exit(1); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main(process.argv.slice(2)).catch(e => { console.error(`✗ index-coverage: ${e.message}`); process.exit(1); });
