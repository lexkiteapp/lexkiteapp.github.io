// Cổng "hộp inline bọc khối" (chủ 4/11: thẻ Chuỗi 7 ngày ở cột phải có 2 mảnh bo góc thừa ở mép trái, chữ sát mép).
// Gốc: bind `tag` đổi <div> → <a> giữ nguyên class. <a> mặc định display:inline; viền/nền/padding của hộp inline chứa khối con
// chỉ vẽ lên các mảnh rỗng trước và sau khối → 2 mảnh thừa, còn nội dung mất padding. Cổng này quét TĨNH mọi khung Stitch sinh ra;
// qa-bot/detect.js (loại `inlinebox`) quét lúc chạy mọi route × cỡ × sáng/tối, gồm cả màn viết tay.
// Trong dòng flex/grid phần tử con tự thành khối nên vô hại, nhưng converter vẫn gắn `block` để khung không phụ thuộc cha.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const R = fileURLToPath(new URL('../../', import.meta.url));
let fail = 0;
const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} inline-box: ${m}`); if (!c) fail++; };

export const DISPLAY = /(?:^|\s)(?:[\w-]+:)*(?:block|flex|grid|inline-flex|inline-block|inline-grid|hidden|contents|table)(?:\s|$)/;
const BLOCK_CHILD = /^(?:div|p|h[1-6]|ul|ol|section|article|li|table|header|footer|nav|aside)$/;
// Trả về các thẻ inline có khối con mà chưa có lớp display. Chỉ xét con đầu tiên ngay sau thẻ mở (khung sinh tự động viết liền, 1 dòng).
export function offenders(src) {
  const out = [];
  for (const m of src.matchAll(/<(a|span|label|b|i|em|strong)\b((?:[^>"]|"[^"]*")*)>\s*<([a-z][a-z0-9]*)\b/g)) {
    if (!BLOCK_CHILD.test(m[3])) continue;
    const cls = (m[2].match(/class="([^"]*)"/) || [])[1] || '';
    if (/\$\{/.test(cls) && !DISPLAY.test(cls)) continue; // class động: runtime qa-bot kiểm
    if (!DISPLAY.test(cls)) out.push({ tag: m[1], cls: cls.slice(0, 80) });
  }
  return out;
}

// Tự kiểm: mẫu đúng lỗi gốc phải bị bắt, mẫu đã sửa phải qua
ok(offenders('<a class="p-4 border-2" href="x"><div class="flex">a</div></a>').length === 1, 'tự kiểm: <a> có viền + khối con, thiếu display → bắt');
ok(offenders('<a class="block p-4 border-2"><div>a</div></a>').length === 0, 'tự kiểm: có `block` → qua');
ok(offenders('<a class="p-4 lg:flex"><div>a</div></a>').length === 0, 'tự kiểm: display theo biến thể → qua');
ok(offenders('<a class="underline"><span>a</span></a>').length === 0, 'tự kiểm: con inline → qua');

const DIRS = ['web/js/st/v2', 'web/cpack/st/v2', 'brand/stitch/web/gen'];
for (const d of DIRS) {
  let bad = 0, n = 0;
  for (const f of fs.readdirSync(R + d).filter(x => x.endsWith('.js'))) {
    n++;
    const list = offenders(fs.readFileSync(path.join(R, d, f), 'utf8'));
    for (const x of list) { bad++; console.error(`  ${d}/${f}: <${x.tag} class="${x.cls}…">`); }
  }
  ok(bad === 0, `${d}: ${n} khung, ${bad} thẻ inline bọc khối mà thiếu display`);
}
// Converter phải tự gắn, không dựa vào việc nhớ sửa từng bind
const conv = fs.readFileSync(R + 'scripts/stitch-v2-convert.mjs', 'utf8');
ok(/const blockify\b/.test(conv) && /blockify\(el\)/.test(conv), 'stitch-v2-convert: blockify chạy cho mọi khung');
// Chuỗi 7 ngày: đúng biểu tượng lửa (Lucide flame, docs/DESIGN-SYSTEM.md §1), không phải hình khối Stitch trông như bóng đèn/lỗ khoá
const rail = fs.readFileSync(R + 'web/js/st/v2/today-rail.js', 'utf8');
ok(!rail.includes('M12 2c-3.3 0-6 2.7-6 6'), 'today-rail: hết hình bóng đèn/lỗ khoá ở ô ngày');
ok((rail.match(/M8\.5 14\.5A2\.5 2\.5 0 0 0 11 12/g) || []).length === 2, 'today-rail: ô đã xong và ô hôm nay dùng lửa Lucide');
// Đầu dò lúc chạy còn trong qa-bot
ok(/add\('inlinebox'/.test(fs.readFileSync(R + 'scripts/test/qa-bot/detect.js', 'utf8')), 'qa-bot/detect.js có đầu dò inlinebox');
if (fail) { console.error(`✗ inline-box: ${fail} lỗi`); process.exit(1); }
console.log('✓ inline-box: đạt');
