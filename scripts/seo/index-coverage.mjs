// 🧪 scripts/seo/index-coverage.mjs với dữ liệu giả – không gọi API: chọn mẫu, gộp nhóm/ước tính, máy gác tụt/cũ, markdown.
import fs from 'fs';
import os from 'os';
import path from 'path';
import * as I from '../seo/index-coverage.mjs';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error(`  ✗ ${m}`); } };
const O = 'https://lexkite.com';
const maps = [
  { sitemap: `${O}/sitemap-words-th.xml`, urls: Array.from({ length: 900 }, (_, i) => `${O}/th/words/w${i}`) },
  { sitemap: `${O}/sitemap-blog-en.xml`, urls: Array.from({ length: 30 }, (_, i) => `${O}/en/blog/p${i}/`) },
  { sitemap: `${O}/sitemap-dict-en-1.xml`, urls: Array.from({ length: 70 }, (_, i) => `${O}/en/dict/d${i}`) },
];
ok(I.group(`${O}/sitemap-words-th.xml`) === 'words-th' && I.group(`${O}/sitemap-dict-en-1.xml`) === 'dict-en', 'tên nhóm sitemap');
const s = I.sample(maps, 100, '2026-11-23');
ok(s.length >= 100 && s.length <= 106, `cỡ mẫu ${s.length}`);
ok(s.filter(x => x.group === 'blog-en').length === I.MIN_PER, 'nhóm nhỏ vẫn có tối thiểu MIN_PER');
ok(JSON.stringify(s) === JSON.stringify(I.sample(maps, 100, '2026-11-23')), 'cùng ngày → cùng mẫu');
ok(JSON.stringify(s) !== JSON.stringify(I.sample(maps, 100, '2026-11-30')), 'tuần khác → mẫu khác');
const checked = s.map((x, i) => i % 7 === 0 ? { ...x, error: 'HTTP 500' } : { ...x, result: i % 2 ? { verdict: 'PASS', coverageState: 'Submitted and indexed', googleCanonical: x.url, userCanonical: x.url }
  : { verdict: 'NEUTRAL', coverageState: 'Discovered - currently not indexed', googleCanonical: i % 4 ? x.url : `${O}/en/x`, userCanonical: x.url } });
const sum = I.summarize(maps, checked);
ok(sum.urls === 1000, 'tổng URL');
ok(sum.sampled + checked.filter(c => c.error).length === s.length, 'lỗi không tính vào mẫu');
ok(sum.groups['words-th'].estIndexed > 300 && sum.groups['words-th'].estIndexed < 600, `ước tính words-th ${sum.groups['words-th'].estIndexed}`);
ok(sum.states['Discovered - currently not indexed'] > 0, 'đếm trạng thái');
ok(I.isIndexed({ coverageState: 'Indexed, not submitted in sitemap' }) && !I.isIndexed({ verdict: 'NEUTRAL', coverageState: 'Crawled - currently not indexed' }), 'isIndexed');

// máy gác
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'idxcov-')), dir = path.join(root, 'reports/seo'); fs.mkdirSync(dir, { recursive: true });
const gsc = (d, clicks, pages) => fs.writeFileSync(path.join(dir, `gsc-${d}.json`), JSON.stringify({ totals: { current: { clicks } }, rows: { pageCur: pages } }));
ok(I.alerts(root, '2026-11-23', null).some(a => /Chưa có báo cáo GSC/.test(a)), 'không có báo cáo → cảnh báo');
gsc('2026-11-09', 100, 2000); gsc('2026-11-16', 110, 2100);
ok(I.alerts(root, '2026-11-23', null).length === 0, 'báo cáo 7 ngày, không tụt → yên');
ok(I.alerts(root, '2026-11-30', null).some(a => /ngày/.test(a)), 'báo cáo 14 ngày → cảnh báo cũ');
gsc('2026-11-23', 60, 2100);
ok(I.alerts(root, '2026-11-23', null).some(a => /Lượt bấm/.test(a)), 'click tụt 45 % → cảnh báo');
gsc('2026-11-23', 120, 1000);
ok(I.alerts(root, '2026-11-23', null).some(a => /hiển thị/.test(a)), 'số trang có hiển thị tụt → cảnh báo');
gsc('2026-11-23', 120, 2200);
fs.writeFileSync(path.join(dir, 'index-2026-11-16.json'), JSON.stringify({ summary: { estIndexed: 5000 } }));
ok(I.alerts(root, '2026-11-23', { estIndexed: 3000 }).some(a => /index ước tính/.test(a)), 'index tụt 40 % → cảnh báo');
ok(I.alerts(root, '2026-11-23', { estIndexed: 4500 }).length === 0, 'index tụt 10 % → yên');
// nhiễu mẫu (4/343 → 1/344, đúng ca 22–23/11) → yên; tụt thật 120/343 → 30/344 → cảnh báo
fs.writeFileSync(path.join(dir, 'index-2026-11-16.json'), JSON.stringify({ summary: { estIndexed: 156, sampled: 343, indexed: 4 } }));
ok(I.alerts(root, '2026-11-23', { estIndexed: 12, sampled: 344, indexed: 1 }).length === 0, 'nhiễu mẫu 4→1 → yên');
fs.writeFileSync(path.join(dir, 'index-2026-11-16.json'), JSON.stringify({ summary: { estIndexed: 7000, sampled: 343, indexed: 120 } }));
ok(I.alerts(root, '2026-11-23', { estIndexed: 1800, sampled: 344, indexed: 30 }).some(a => /index ước tính/.test(a)), 'tụt thật → cảnh báo');

const rep = I.build(root, '2026-11-23', { maps, checked, sitemaps: [{ path: `${O}/sitemap.xml`, lastDownloaded: '2026-11-20T01:00:00Z', errors: '0', warnings: '1', contents: [{ type: 'web', submitted: '1000' }] }] });
I.write(root, '2026-11-23', rep);
const md = fs.readFileSync(path.join(dir, 'index-2026-11-23.md'), 'utf8');
ok(/Ước tính đã index/.test(md) && /words-th/.test(md) && /Sitemap Google đã đọc/.test(md), 'markdown đủ mục');
let threw = false; try { I.build(root, '2026-11-23', { maps, checked: s.map(x => ({ ...x, error: 'HTTP 403' })) }); } catch { threw = true; }
ok(threw, 'mọi lượt lỗi → đỏ');
fs.rmSync(root, { recursive: true, force: true });

if (fails) { console.error(`✗ index-coverage: ${fails} lỗi`); process.exit(1); }
console.log('✓ index-coverage: mẫu, ước tính, máy gác, markdown');
