// Cài đặt mục lục + trang con (docs/specs/me-settings-ux.md) & trang Tôi gọn – chặn theo LOẠI lỗi:
// 1) id điều khiển trùng trong template Cài đặt (5/11: hai ô "sAuto" → công tắc "Tự động theo giờ" không có handler, đặt giờ bỏ tick nhầm "Tự phát âm")
// 2) mỗi trang con trong SUB có đúng một <section id="set-<id>"> và một hàng mục lục go('<id>') (trừ admin: hàng thêm sau khi máy chủ xác nhận)
// 3) trang Tôi: liên kết "Tìm hiểu thêm" gom vào tấm (act 'more') có handler; nhãn hàng <a> không ăn màu liên kết toàn cục
import fs from 'node:fs';
const src = fs.readFileSync('web/js/settings.js', 'utf8'), me = fs.readFileSync('web/js/ux1-me.js', 'utf8');
const fail = m => { console.error('✗ settings-subpages: ' + m); process.exitCode = 1; };
const ids = [...src.matchAll(/\b(?:tog|slide)\('(s[A-Za-z0-9_]+)'/g)].map(m => m[1]).concat([...src.matchAll(/\bid="(s[A-Z][A-Za-z0-9_]*)"/g)].map(m => m[1]));
const seen = {}; for (const i of ids) seen[i] = (seen[i] || 0) + 1;
const dup = Object.entries(seen).filter(([, n]) => n > 1).map(([k]) => k);
if (dup.length) fail('id trùng trong template: ' + dup.join(', '));
const sub = (src.match(/const SUB = \[([^\]]+)\]/) || [])[1]; if (!sub) fail('thiếu SUB');
for (const id of (sub || '').match(/'[a-z]+'/g).map(x => x.slice(1, -1))) {
  const secN = (src.match(new RegExp(`sec\\('${id}',`, 'g')) || []).length + (src.match(new RegExp(`id="set-${id}"`, 'g')) || []).length;
  if (secN !== 1) fail(`trang con "${id}": ${secN} section (cần đúng 1)`);
  if (!src.includes(`go('${id}',`)) fail(`trang con "${id}" không có hàng ở mục lục`);
}
// 4) ô giá trị mục lục cắt "…" (text-overflow:ellipsis) phải có title đủ chữ (visual-qa ellipsis-no-title, 06/11)
if (!/<span class="set-go-v" title="\$\{esc\(val\)\}">/.test(src)) fail('mục lục: ô giá trị .set-go-v thiếu title (bị cắt … không đọc được)');
// 5) icon Material đổi bằng JS (ic.textContent = 'login') phải có trong font thu gọn, nếu không chữ tên icon hiện ra bị cắt (stitch-diff 06/11)
const msym = JSON.parse(fs.readFileSync('web/fonts/msym.json', 'utf8'));
for (const m of me.matchAll(/\bic\.textContent = '([a-z_0-9]+)'/g)) if (!msym.includes(m[1])) fail(`icon "${m[1]}" đổi trong ux1-me.js chưa có trong web/fonts/msym.woff2 → khai @icons rồi node scripts/build-stitch-css.mjs --fonts`);
// 6) qa-bot quét mọi trang con (trừ admin) – nút dời sang trang con thì baseline không được "tự xanh" vì bot không thấy (06/11); nút trong trang con ≥44 px
const bot = fs.readFileSync('scripts/test/qa-bot.mjs', 'utf8'), botSub = (bot.match(/\.\.\.\[([^\]]+)\]\.map\(k => \['settings-' \+ k/) || [])[1] || '';
for (const id of (sub || '').match(/'[a-z]+'/g).map(x => x.slice(1, -1))) if (id !== 'admin' && !botSub.includes(`'${id}'`)) fail(`qa-bot chưa quét trang con /settings/${id}`);
if (!/\.set-wrap\[data-open\] \.btn\.sm,[^{]*\{min-height:44px;min-width:44px\}/.test(src)) fail('trang con: thiếu vùng chạm ≥44 px cho .btn.sm/tab');
// 7) ô chọn/nhập có nhãn NHÌN THẤY gắn ô (<label for>), không chỉ aria-label (qa-bot nolabel 06/11) – settings.js row() và ai.js r()
if (!/<label for="\$\{fid\}">/.test(src)) fail('row(): nhãn hàng phải là <label for> gắn ô đầu tiên');
if (!/<label for="\$\{f\}">/.test(fs.readFileSync('web/js/ai.js', 'utf8'))) fail('ai.js r(): thiếu <label for> cho ô (aiModel)');
if (/\.set-nav|data-jump/.test(src)) fail('còn thanh chip set-nav cũ (đã thay bằng mục lục)');
if (!/a === 'more'/.test(me) || !/act: 'more'/.test(me)) fail("trang Tôi: thiếu hàng/handler 'more'");
if (!/\.v2-me \[data-row\] a\{color:inherit/.test(me)) fail('trang Tôi: thiếu chặn màu liên kết toàn cục cho nhãn hàng');
if (!process.exitCode) console.log(`✓ settings-subpages: ${ids.length} id duy nhất, ${(sub || '').split(',').length} trang con có section + hàng mục lục, trang Tôi gom "Tìm hiểu thêm"`);
