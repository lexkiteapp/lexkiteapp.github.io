// Máy gác "sẵn sàng duyệt AdSense" (docs/ADSENSE-READY.md), tĩnh, không mạng:
//  1) không file bản quyền bên thứ ba (PDF/EPUB/MOBI/DJVU) được theo dõi bởi git hay nằm trong web/ (nguồn của dist/) · .gitignore chặn *.pdf
//  2) trang bắt buộc còn nguồn: web/privacy.html, web/terms.html, bộ dựng About; /about + /contact có chuyển hướng
//  3) ads.txt/app-ads.txt đúng dạng IAB; không trang "đang xây dựng / coming soon" trong web/*/
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\n').filter(Boolean);
const BAD = /\.(pdf|epub|mobi|azw3?|djvu)$/i;
ok(!tracked.some(f => BAD.test(f)), 'git theo dõi file sách/PDF: ' + tracked.filter(f => BAD.test(f)).join(', '));
ok(/^\*\.pdf$/m.test(fs.readFileSync('.gitignore', 'utf8')), '.gitignore phải chặn *.pdf');
const walk = (d, o = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p, o) : o.push(p); } return o; };
const web = walk('web');
ok(!web.some(f => BAD.test(f)), 'web/ (nguồn của dist) có PDF/sách: ' + web.filter(f => BAD.test(f)).join(', '));
for (const f of ['web/privacy.html', 'web/terms.html', 'web/en/privacy.html', 'web/en/terms.html', 'scripts/build-authority.mjs']) ok(fs.existsSync(f), 'thiếu trang bắt buộc ' + f);
const redir = fs.readFileSync('web/_redirects', 'utf8');
for (const p of ['/about', '/contact']) ok(new RegExp('^' + p + '\\s+/en/about/', 'm').test(redir), `_redirects thiếu ${p}`);
for (const f of ['web/ads.txt', 'web/app-ads.txt']) ok(/^google\.com, pub-\d{16}, DIRECT, f08c47fec0942fa0$/m.test(fs.readFileSync(f, 'utf8')), f + ' sai dạng IAB');
const priv = fs.readFileSync('web/en/privacy.html', 'utf8');
for (const k of ['AdSense', 'policies.google.com/technologies/partner-sites', 'adssettings.google.com']) ok(priv.includes(k), 'Privacy (EN) thiếu: ' + k);
const UC = /under construction|coming soon|lorem ipsum|đang xây dựng/i;
for (const f of web.filter(f => /^web\/[a-z]{2}\/.*\.html$/.test(f))) ok(!UC.test(fs.readFileSync(f, 'utf8')), 'trang dang dở: ' + f);
if (fails) { console.log(`✗ adsense-hygiene: ${fails} lỗi`); process.exit(1); }
console.log('✓ adsense-hygiene: không PDF/sách, trang bắt buộc, ads.txt, Privacy, không trang dang dở');
