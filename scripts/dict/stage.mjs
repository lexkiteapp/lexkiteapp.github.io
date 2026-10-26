#!/usr/bin/env node
// 📈 Bộ điều khiển giai đoạn mở index trang từ điển (docs/SEO-DICT-PAGES.md §5b) – chạy hằng tuần trên CI (dict-stage.yml), không cần người nhớ.
// Vào: content/dict/stage.json (trạng thái) + reports/seo/dict-metrics.json (số đo do vòng GSC §9 ghi) + có route lexkite.com chưa (DICT_LIVE=1).
// Ra: stage.json mới (nếu đổi) + dòng tóm tắt; workflow commit, dựng, deploy (khi có secret) và cập nhật issue `dict-stage`.
// Tự động lên bậc khi đạt ngưỡng ≥ 28 ngày; tự lùi về noindex khi xấu; dừng ở S4 (thêm ngôn ngữ cần nhãn dịch thật – việc người).
import fs from 'node:fs'; import { pathToFileURL } from 'node:url';

export const LADDER = [
  { stage: 'S0', index: '', n: 200 },
  { stage: 'S1', index: '{"vi":50,"en":30}', n: 200 },
  { stage: 'S2', index: 'all', n: 200 },
  { stage: 'S3a', index: 'all', n: 1000 },
  { stage: 'S3b', index: 'all', n: 5000 },
  { stage: 'S3c', index: 'all', n: 20000 },
  { stage: 'S4', index: 'all', n: 20000, human: 'Mở thêm ngôn ngữ: cần nhãn T[lang] dịch thật + duyệt (docs §2) – không tự động' },
];
export const RULES = { minDays: 28, indexedMin: 0.6, ctrMin: 0.01, notIndexedMax: 0.3, rollbackIndexed: 0.3, rollbackAfterDays: 42, siteDropMax: -0.2, minSubmitted: 20 };
const days = (a, b) => Math.floor((Date.parse(b) - Date.parse(a)) / 864e5);

// m = { at, langs: { vi: { submitted, indexed, crawledNotIndexed, impressions, clicks }, … }, cwvGood: bool, siteImpressionsDelta: số (−0,25 = giảm 25 %) }
export const STATIC_CAP = 19000; // asset tĩnh/Worker (trần Free 20.000) – vượt thì trang đuôi dài cần R2
export function decide(state, m, { today = new Date().toISOString().slice(0, 10), live = false, r2 = false, langs = 2, wordsRoute = false } = {}) {
  const i = LADDER.findIndex(x => x.stage === state.stage), cur = LADDER[i], age = days(state.since, today);
  const go = (to, why) => ({ change: true, next: { ...state, stage: to.stage, index: to.index, n: to.n, since: today, history: [...(state.history || []), { at: today, from: state.stage, to: to.stage, why }].slice(-30) }, why });
  const hold = why => ({ change: false, next: state, why });
  if (i < 0) return hold(`trạng thái lạ ${state.stage}`);
  if (cur.stage === 'S0') return live ? go(LADDER[1], 'route lexkite.com đã chạy → mở 50 vi/30 en ứng viên tốt nhất') : hold('chờ route lexkite.com (chủ duyệt gắn route, docs §8)');
  if (!m || !m.langs) return hold('chưa có số đo GSC (reports/seo/dict-metrics.json) – giữ nguyên, không tự mở thêm');
  const L = Object.entries(m.langs).filter(([, x]) => x && x.submitted >= RULES.minSubmitted);
  if (!L.length) return hold('sitemap chưa đủ URL để đo');
  const rate = (x, k) => (x.submitted ? x[k] / x.submitted : 0), ctr = x => (x.impressions ? x.clicks / x.impressions : 0);
  // Lùi: hiển thị toàn site giảm mạnh, hoặc sau 6 tuần mà tỷ lệ index vẫn thấp
  if (typeof m.siteImpressionsDelta === 'number' && m.siteImpressionsDelta <= RULES.siteDropMax) return go({ ...cur, index: '' , stage: cur.stage }, `hiển thị toàn site ${Math.round(m.siteImpressionsDelta * 100)} % → về noindex, giữ bậc để người xem`);
  if (age >= RULES.rollbackAfterDays && L.some(([, x]) => rate(x, 'indexed') < RULES.rollbackIndexed)) { const back = LADDER[Math.max(1, i - 1)]; return go(cur.stage === 'S1' ? { ...LADDER[0], stage: 'S1', index: '' } : back, `sau ${age} ngày tỷ lệ index < ${RULES.rollbackIndexed * 100} % → lùi`); }
  if (!state.index) return hold('đang tạm noindex sau lần lùi – cần người xem lại (issue dict-stage)');
  if (age < RULES.minDays) return hold(`mới ${age}/${RULES.minDays} ngày ở ${cur.stage}`);
  const bad = L.filter(([, x]) => rate(x, 'indexed') < RULES.indexedMin || rate(x, 'crawledNotIndexed') > RULES.notIndexedMax || ctr(x) < RULES.ctrMin).map(([l, x]) => `${l} index ${Math.round(rate(x, 'indexed') * 100)} % · CTR ${(ctr(x) * 100).toFixed(1)} %`);
  if (bad.length) return hold(`chưa đạt: ${bad.join('; ')}`);
  if (m.cwvGood === false) return hold('Core Web Vitals chưa "Tốt"');
  const nx = LADDER[i + 1];
  if (!nx || nx.human) return hold(nx ? nx.human : 'đã ở bậc cuối');
  if (nx.stage === 'S3a' && !wordsRoute) return hold('đạt ngưỡng nhưng S3a bắt đầu trùng trang /words/ – cần gắn route lexkite.com/vi/words/*, /en/words/* cho Worker (wrangler.toml) để 301, tránh 2 URL cho 1 từ');
  if (nx.n * langs > STATIC_CAP && !r2) return hold(`đạt ngưỡng nhưng ${nx.stage} (${nx.n} từ × ${langs}) vượt ${STATIC_CAP} trang tĩnh – cần bucket R2 lexkite-dict-data (docs §8)`);
  return go(nx, `đạt ngưỡng ${age} ngày (index ≥ ${RULES.indexedMin * 100} %, CTR ≥ ${RULES.ctrMin * 100} %) → ${nx.stage}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const F = 'content/dict/stage.json', M = 'reports/seo/dict-metrics.json';
  const state = JSON.parse(fs.readFileSync(F, 'utf8')), m = fs.existsSync(M) ? JSON.parse(fs.readFileSync(M, 'utf8')) : null;
  const r = decide(state, m, { live: process.env.DICT_LIVE === '1', r2: process.env.DICT_R2 === '1', wordsRoute: process.env.DICT_WORDS_ROUTE === '1' });
  if (r.change) fs.writeFileSync(F, JSON.stringify(r.next, null, 1) + '\n');
  const out = `${r.change ? 'ĐỔI' : 'GIỮ'} ${state.stage}${r.change ? ' → ' + r.next.stage : ''}: ${r.why}`;
  console.log(out);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${r.change ? 1 : 0}\nindex=${r.next.index}\nn=${r.next.n}\nsummary=${out.replace(/\n/g, ' ')}\n`);
}
