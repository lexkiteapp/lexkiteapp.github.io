#!/usr/bin/env node
// 📊 Số đo cho bộ điều khiển giai đoạn (scripts/dict/stage.mjs) – chạy trong dict-stage.yml, dùng lại xác thực của vòng GSC (scripts/seo/gsc.mjs, PR #60).
// Khoá: CHỈ env GSC_SA_JSON (secret), giữ trong bộ nhớ. Ghi reports/seo/dict-metrics.json (chỉ số tổng hợp, không dữ liệu cá nhân).
//   impressions/clicks: Search Analytics lọc page chứa /<lang>/<đường dẫn từ điển>/ (28 ngày, D-3, dataState final)
//   indexed/crawledNotIndexed: URL Inspection API trên MẪU ngẫu nhiên ≤ 60 URL/ngôn ngữ trong số URL đã mở (≤ 120 lượt/tuần ≪ 2.000/ngày) → tỷ lệ × submitted
//   siteImpressionsDelta: tổng hiển thị toàn site 28 ngày này so với 28 ngày trước
// Thiếu secret hoặc chưa mở trang nào → không ghi file → bộ điều khiển GIỮ nguyên (an toàn, không tự mở mù).
import fs from 'node:fs'; import { pathToFileURL } from 'node:url';
import { build } from './build.mjs';
import { ENABLED, DICT_PATH, SITE, wordPath, isIndexable, parseOpen } from '../../workers/dict/render.mjs';

export const SAMPLE = 60;
export async function collect({ gsc, token, date, urls, fetchImpl = fetch, rnd = Math.random }) {
  const { range, prevRange } = gsc.ranges(date), langs = {};
  const tot = rows => rows.reduce((a, r) => a + (r.impressions || 0), 0);
  const q = (r, extra = {}) => gsc.queryAll(token, { startDate: r.startDate, endDate: r.endDate, dimensions: ['page'], ...extra }, fetchImpl);
  const [cur, prev] = [await q(range), await q(prevRange)];
  for (const l of ENABLED) {
    const list = urls[l] || []; if (!list.length) continue;
    const rows = await q(range, { dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: 'contains', expression: `/${l}/${DICT_PATH[l]}/` }] }] });
    const sample = [...list].sort(() => rnd() - 0.5).slice(0, SAMPLE); let idx = 0, cni = 0;
    for (const u of sample) {
      const res = await fetchImpl('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ inspectionUrl: u, siteUrl: gsc.SITE }) });
      if (!res.ok) throw new Error(`urlInspection HTTP ${res.status}`);
      const s = ((await res.json()).inspectionResult || {}).indexStatusResult || {};
      if (s.verdict === 'PASS') idx++; else if (/crawled - currently not indexed/i.test(s.coverageState || '')) cni++;
    }
    const k = list.length / sample.length;
    langs[l] = { submitted: list.length, sampled: sample.length, indexed: Math.round(idx * k), crawledNotIndexed: Math.round(cni * k), impressions: tot(rows), clicks: rows.reduce((a, r) => a + (r.clicks || 0), 0), pagesWithImpressions: rows.length };
  }
  const p = tot(prev);
  return { at: date, range, langs, siteImpressionsDelta: p ? (tot(cur) - p) / p : null };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.GSC_SA_JSON) { console.log('· dict-metrics: chưa có secret GSC_SA_JSON → bỏ qua (bộ điều khiển giữ nguyên)'); process.exit(0); }
  if (!fs.existsSync('scripts/seo/gsc.mjs')) { console.log('· dict-metrics: chưa có scripts/seo/gsc.mjs (PR #60) → bỏ qua'); process.exit(0); }
  const st = JSON.parse(fs.readFileSync('content/dict/stage.json', 'utf8')), open = parseOpen(st.index);
  if (!st.index) { console.log('· dict-metrics: chưa mở index → không cần đo'); process.exit(0); }
  const { pages } = build({ n: st.n, index: st.index, write: false });
  const urls = Object.fromEntries(ENABLED.map(l => [l, pages[l].filter(d => isIndexable(d, open)).map(d => SITE + wordPath(l, d.slug))]));
  const gsc = await import('../seo/gsc.mjs'), sa = JSON.parse(process.env.GSC_SA_JSON);
  const m = await collect({ gsc, token: await gsc.getToken(sa), date: new Date().toISOString().slice(0, 10), urls });
  if (!Object.keys(m.langs).length) { console.error('✗ dict-metrics: 0 ngôn ngữ có số đo'); process.exit(1); }
  fs.mkdirSync('reports/seo', { recursive: true }); fs.writeFileSync('reports/seo/dict-metrics.json', JSON.stringify(m, null, 1) + '\n');
  console.log('✓ dict-metrics:', Object.entries(m.langs).map(([l, x]) => `${l} index ~${x.indexed}/${x.submitted} · ${x.impressions} hiển thị · ${x.clicks} bấm`).join(' | '));
}
