// 📈 Test bộ điều khiển giai đoạn mở index (scripts/dict/stage.mjs) – thuần, không mạng.
import { decide, LADDER, RULES } from '../dict/stage.mjs';
import { collect } from '../dict/metrics.mjs';
let n = 0, f = 0; const ok = (c, m) => { n++; if (!c) { f++; console.log('✗', m); } };
const S = (stage, since = '2026-01-01', index) => ({ stage, index: index ?? LADDER.find(x => x.stage === stage).index, n: LADDER.find(x => x.stage === stage).n, since, history: [] });
const good = { langs: { vi: { submitted: 50, indexed: 40, crawledNotIndexed: 5, impressions: 2000, clicks: 40 }, en: { submitted: 30, indexed: 25, crawledNotIndexed: 2, impressions: 900, clicks: 20 } }, cwvGood: true, siteImpressionsDelta: 0.1 };
const T = '2026-03-01';
ok(!decide(S('S0'), null, { today: T }).change, 'S0 không route → giữ');
ok(decide(S('S0'), null, { today: T, live: true }).next.stage === 'S1', 'S0 + route → S1');
ok(!decide(S('S1'), null, { today: T }).change, 'không số đo → giữ (không tự mở mù)');
ok(!decide(S('S1', '2026-02-20'), good, { today: T }).change, `< ${RULES.minDays} ngày → giữ`);
ok(decide(S('S1'), good, { today: T }).next.stage === 'S2', 'S1 đạt → S2');
ok(decide(S('S3c'), good, { today: T }).change === false, 'S3c → S4 cần người (không tự mở ngôn ngữ)');
const low = { ...good, langs: { ...good.langs, en: { ...good.langs.en, indexed: 5 } } };
ok(!decide(S('S2', '2026-01-25'), low, { today: T }).change, 'tỷ lệ index thấp nhưng < 42 ngày lùi → giữ');
const r = decide(S('S2', '2026-01-01'), low, { today: '2026-02-20' }); ok(r.change && r.next.stage === 'S1', 'sau 6 tuần index < 30 % → lùi S1');
const r1 = decide(S('S1', '2026-01-01'), low, { today: '2026-02-20' }); ok(r1.change && r1.next.index === '' , 'S1 xấu → về noindex');
const drop = decide(S('S3a'), { ...good, siteImpressionsDelta: -0.3 }, { today: T }); ok(drop.change && drop.next.index === '' && drop.next.stage === 'S3a', 'hiển thị toàn site −30 % → noindex ngay');
ok(!decide({ ...S('S3a'), index: '' }, good, { today: T }).change, 'đang tạm noindex → chờ người');
ok(!decide(S('S1'), { ...good, cwvGood: false }, { today: T }).change, 'CWV xấu → giữ');
ok(!decide(S('S3b'), good, { today: T }).change && decide(S('S3b'), good, { today: T, r2: true }).next.stage === 'S3c', 'S3c vượt trang tĩnh → cần R2');
ok(LADDER.every((x, i) => i === 0 || x.n >= LADDER[i - 1].n), 'bậc chỉ tăng N');
// Bộ thu số đo với GSC giả (không mạng)
{
  const calls = [], fake = { SITE: 'sc-domain:lexkite.com', ranges: () => ({ range: { startDate: 'a', endDate: 'b' }, prevRange: { startDate: 'c', endDate: 'd' } }),
    queryAll: async (tok, body) => { calls.push(body); return body.dimensionFilterGroups ? [{ impressions: 100, clicks: 3 }, { impressions: 50, clicks: 1 }] : body.startDate === 'a' ? [{ impressions: 900 }] : [{ impressions: 1000 }]; } };
  let insp = 0; const fetchImpl = async () => ({ ok: true, json: async () => ({ inspectionResult: { indexStatusResult: insp++ % 2 ? { verdict: 'PASS' } : { verdict: 'NEUTRAL', coverageState: 'Crawled - currently not indexed' } } }) });
  const urls = { vi: Array.from({ length: 120 }, (_, i) => `https://lexkite.com/vi/tu-dien/w${i}/`), en: [] };
  const m = await collect({ gsc: fake, token: 't', date: '2026-03-01', urls, fetchImpl, rnd: () => 0.3 });
  ok(m.langs.vi && m.langs.vi.submitted === 120 && m.langs.vi.sampled === 60 && m.langs.vi.indexed === 60 && m.langs.vi.crawledNotIndexed === 60, 'metrics: mẫu 60 URL, ngoại suy ×2');
  ok(m.langs.vi.impressions === 150 && m.langs.vi.clicks === 4 && !m.langs.en, 'metrics: hiển thị theo thư mục, bỏ ngôn ngữ chưa mở');
  ok(Math.abs(m.siteImpressionsDelta + 0.1) < 1e-9 && insp === 60, 'metrics: delta toàn site −10 %, 60 lượt inspect');
  ok(calls.some(c => c.dimensionFilterGroups && c.dimensionFilterGroups[0].filters[0].expression === '/vi/tu-dien/'), 'metrics: lọc đúng thư mục');
}
console.log(f ? `✗ dict-stage: ${f}/${n} lỗi` : `✓ dict-stage: ${n} kiểm tra đạt`); process.exit(f ? 1 : 0);
