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
if (/\.set-nav|data-jump/.test(src)) fail('còn thanh chip set-nav cũ (đã thay bằng mục lục)');
if (!/a === 'more'/.test(me) || !/act: 'more'/.test(me)) fail("trang Tôi: thiếu hàng/handler 'more'");
if (!/\.v2-me \[data-row\] a\{color:inherit/.test(me)) fail('trang Tôi: thiếu chặn màu liên kết toàn cục cho nhãn hàng');
if (!process.exitCode) console.log(`✓ settings-subpages: ${ids.length} id duy nhất, ${(sub || '').split(',').length} trang con có section + hàng mục lục, trang Tôi gom "Tìm hiểu thêm"`);
