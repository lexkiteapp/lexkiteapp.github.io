// Trang admin Phân tích trên điện thoại (390 px): không emoji ở thẻ số liệu/tiêu đề, icon SVG thay ⌕, tab kỳ 1 hàng cuộn ngang,
// khu "Trực tiếp · hôm nay" tách khỏi khu theo kỳ. Tĩnh (không trình duyệt) – chạy trên mọi lượt CI.
import fs from 'node:fs';
const rd = f => fs.readFileSync(f, 'utf8'), fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const js = rd('web/js/admin.js'), css = rd('web/css/admin.css'), html = rd('web/admin.html');
const EMO = /[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u2B50\u2300-\u23FF\u2139]\ufe0f?|⌕|Σ/u;
const cut = (a, b) => { const i = js.indexOf(a), j = js.indexOf(b, i + 1); return i < 0 || j < 0 ? '' : js.slice(i, j); };
// vùng mã của trang Phân tích: thẻ KPI/biểu đồ/nền tảng (đến route) + hàm analytics
const zones = { 'thẻ trực tiếp': cut('// ---------- Phân tích trực tiếp', 'const route = k =>'), 'màn analytics': cut('async analytics(main)', 'const T = (l2, val, sub') + cut("const T = (l2, val, sub = '')", "main.querySelectorAll('.range-tabs") };
for (const [n, z] of Object.entries(zones)) { ok(z.length > 500, `${n}: không tìm thấy vùng mã (đổi cấu trúc?)`); const code = z.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n'); const m = code.match(new RegExp(EMO.source, 'gu')); ok(!m, `${n}: còn emoji/glyph ${m && [...new Set(m)].join(' ')} – dùng ic('tên') (icon Material SVG)`); }
// bản dịch en của các khoá đã bỏ emoji không được còn emoji
for (const k of ['Lưu lượng trực tiếp', 'Quốc gia hôm nay', 'Đang xem', 'Trang xem nhiều hôm nay', 'Nguồn giới thiệu hôm nay', 'Trang xem nhiều · 7 ngày', 'Khách theo quốc gia · hôm nay', 'Nền tảng']) { const m = js.match(new RegExp("'" + k + "': '([^']*)'")); ok(m && !EMO.test(m[1]), `EN '${k}' thiếu hoặc còn emoji`); }
ok(!EMO.test(html.match(/<button[^>]*id="cmdk"[\s\S]*?<\/button>/)?.[0] || '⌕'), 'admin.html: nút tìm kiếm còn glyph ⌕ (dùng svg.ic)');
ok(/class="cmdk-in">\$\{ic\('search'\)\}/.test(js), 'bảng Ctrl K: icon tìm kiếm phải là ic(search)');
ok(/const ICO = \{/.test(js) && /"search":/.test(js) && /"visibility":/.test(js), 'bộ icon ICO thiếu');
// tab kỳ: 1 hàng (không wrap), cuộn ngang, nút không xuống dòng; nằm trong hàng tiêu đề khu Chi tiết
ok(/\.sec-row \.range-tabs\s*\{[^}]*flex-wrap:\s*nowrap[^}]*overflow-x:\s*auto/.test(css), 'range-tabs: phải nowrap + cuộn ngang');
ok(/\.sec-row \.range-tabs button\s*\{[^}]*white-space:\s*nowrap/.test(css), 'nút kỳ: white-space nowrap (không rớt "365 ngày" xuống dòng 2)');
ok(/class="sec-row"><h2 class="sec-t">\$\{L\('Chi tiết · \{r\}'/.test(js) && /\$\{tabs\}/.test(js), 'tab kỳ phải nằm cùng hàng tiêu đề "Chi tiết · kỳ"');
ok(!/setActions\(`<div class="range-tabs"/.test(zones['màn analytics']), 'tab kỳ không được đặt ở đầu trang (dễ hiểu nhầm cả trang đổi theo kỳ)');
ok(/L\('Trực tiếp · hôm nay'\)/.test(js), 'thiếu tiêu đề khu "Trực tiếp · hôm nay"');
ok(/scroll-margin-top:\s*calc\(var\(--a-top\)/.test(css), 'thiếu scroll-margin-top dưới thanh trên dính');
console.log(fails.length ? fails.map(f => '✗ ' + f).join('\n') + `\n✗ admin-analytics-mobile: ${fails.length} lỗi` : '✓ admin-analytics-mobile: đạt');
process.exit(fails.length ? 1 : 0);
