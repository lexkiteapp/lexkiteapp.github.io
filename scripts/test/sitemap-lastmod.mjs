// 🧪 build-sitemap-index.mjs: sitemap tĩnh không bao giờ ghi lastmod = ngày build cho URL chưa có ngày thật (bỏ thẻ), có sổ → ngày sổ,
// nội dung đổi → hôm nay; sitemap con không có lastmod → index không bịa ngày. Chạy trên dist giả trong thư mục tạm.
import fs from 'fs'; import os from 'os'; import path from 'path'; import { execFileSync } from 'child_process';
const S = path.resolve('scripts/build-sitemap-index.mjs'), d = fs.mkdtempSync(path.join(os.tmpdir(), 'smlm-'));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error(`  ✗ ${m}`); } };
const run = (env = {}) => execFileSync('node', [S], { cwd: d, env: { ...process.env, LASTMOD_WRITE: '', ...env }, encoding: 'utf8' });
fs.mkdirSync(path.join(d, 'dist/en/about'), { recursive: true });
fs.writeFileSync(path.join(d, 'dist/en/about/index.html'), '<main>A</main>');
fs.writeFileSync(path.join(d, 'dist/sitemap.xml'), '<urlset><url><loc>https://lexkite.com/en/about/</loc><lastmod>2099-01-01</lastmod></url><url><loc>https://lexkite.com/en/gone/</loc><lastmod>2026-01-02</lastmod></url></urlset>');
fs.writeFileSync(path.join(d, 'dist/sitemap-words-en.xml'), '<urlset><url><loc>https://lexkite.com/en/words/a</loc><lastmod>2026-11-02</lastmod></url></urlset>');
run();
let pg = fs.readFileSync(path.join(d, 'dist/sitemap-pages.xml'), 'utf8'), ix = fs.readFileSync(path.join(d, 'dist/sitemap.xml'), 'utf8');
ok(!/about\/<\/loc><lastmod>/.test(pg), 'URL chưa có trong sổ → bỏ lastmod');
ok(/gone\/<\/loc><lastmod>2026-01-02/.test(pg), 'URL không có file dist → giữ nguyên');
ok(/sitemap-words-en\.xml<\/loc><lastmod>2026-11-02/.test(ix), 'index: lastmod = mới nhất bên trong');
fs.mkdirSync(path.join(d, 'content/seo'), { recursive: true });
fs.writeFileSync(path.join(d, 'content/seo/lastmod.json'), JSON.stringify({ '/en/about/': ['khac', '2026-10-05'] }));
run(); pg = fs.readFileSync(path.join(d, 'dist/sitemap-pages.xml'), 'utf8');
ok(new RegExp(`about/</loc><lastmod>${new Date().toISOString().slice(0, 10)}`).test(pg), 'băm khác sổ → hôm nay (nội dung đổi)');
run({ LASTMOD_WRITE: '1' }); const book = JSON.parse(fs.readFileSync(path.join(d, 'content/seo/lastmod.json'), 'utf8'));
fs.writeFileSync(path.join(d, 'content/seo/lastmod.json'), JSON.stringify({ '/en/about/': [book['/en/about/'][0], '2026-10-05'] }));
run(); pg = fs.readFileSync(path.join(d, 'dist/sitemap-pages.xml'), 'utf8');
ok(/about\/<\/loc><lastmod>2026-10-05/.test(pg), 'băm khớp sổ → ngày sổ (không phải hôm nay)');
fs.rmSync(d, { recursive: true, force: true });
if (fails) { console.error(`✗ sitemap-lastmod: ${fails} lỗi`); process.exit(1); }
console.log('✓ sitemap-lastmod: sitemap tĩnh dùng ngày thật hoặc bỏ lastmod, không ghi ngày build');
