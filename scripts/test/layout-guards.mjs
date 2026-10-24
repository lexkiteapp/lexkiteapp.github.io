// Chặn tái phát lỗi quality-sweep #17: CLS logo (/en/, /ar/ → app), nút đè ở #/review, vùng chạm < 44px (trang chủ, blog), SEO link-text /app/.
import fs from 'node:fs';
const R = new URL('../../', import.meta.url).pathname, rd = f => fs.readFileSync(R + f, 'utf8');
let fail = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} layout-guards: ${m}`); if (!c) fail++; };
const app = rd('web/js/app.js'), html = rd('web/app/index.html'), css = rd('web/css/style.css');
const logos = [...(app + html).matchAll(/<img class="logo"[^>]*>/g)].map(m => m[0]);
ok(logos.length > 0 && logos.every(x => /width="\d+"/.test(x) && /height="\d+"/.test(x)), `img.logo có width/height (giữ chỗ trước khi CSS/ảnh nạp) – ${logos.length} chỗ`);
const onb = [...app.matchAll(/^.*localStorage\.(?:set|remove)Item\('lk\.onb'.*$/gm)].map(m => m[0]);
ok(onb.length >= 2 && onb.every(l => /!Store\.sandbox/.test(l)), 'phiên ?sandbox=1 không ghi lk.onb (gợi ý sai → trang giới thiệu chuyển vào app, bỏ khung chào → CLS)');
ok(/\.flash:not\(\.flipped\) \.face\.back, \.flash\.flipped \.face\.front \{ visibility: hidden/.test(css), 'mặt thẻ đang quay lưng bị ẩn (không đè/không nhận Tab)');
ok(/\.wotd-w \{[^}]*min-height: 44px[^}]*min-width: 44px/.test(css) && /class="wotd-w"/.test(app), 'Từ của ngày: vùng chạm ≥ 44×44');
ok(!/href="#\/welcome\/setup">\$\{t\('Bắt đầu'\)\}/.test(app), 'nút đầu trang chào có chữ mô tả (Lighthouse link-text: không dùng "Start" trơn)');
const layout = rd('scripts/lib/site-layout.mjs'), blog = rd('scripts/build-blog.mjs');
ok(/export const TAP_CSS = `[^`]*nav\.main a:not\(\.btn\)\{[^}]*min-height:44px/.test(layout) && /\$\{TAP_CSS\}/.test(blog), 'blog dùng chung CSS vùng chạm ≥ 44px với trang SEO');
const about = R + 'dist/en/blog/about/index.html';
if (fs.existsSync(about)) { const a = fs.readFileSync(about, 'utf8'); ok(a.includes('nav.main a:not(.btn){display:inline-flex;align-items:center;min-height:44px') && a.includes('.crumbs a{display:inline-flex;align-items:center;min-height:44px'), 'dist blog có luật vùng chạm'); ok(!/>ETS – TOE/.test(a), 'tên liên kết ngắn không xuống dòng giữa chừng (ETS – TOEIC dùng khoảng trắng không ngắt)'); }
if (fail) { console.error(`✗ layout-guards: ${fail} lỗi`); process.exit(1); }
console.log('✓ layout-guards: đạt');
