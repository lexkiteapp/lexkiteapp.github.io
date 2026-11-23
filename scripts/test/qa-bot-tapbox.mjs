// Probe vùng chạm của qa-bot/detect.js: ::after tuyệt đối đo theo KHỐI CHỨA (link tĩnh "stretched" = cả thẻ). Lấy hàm tapBox từ chính nguồn detect.js.
import fs from 'node:fs';
const src = fs.readFileSync('scripts/test/qa-bot/detect.js', 'utf8');
const m = /\/\/ <tapbox>[^\n]*\n\s*(const tapBox = [^\n]+)\n\s*\/\/ <\/tapbox>/.exec(src);
let n = 0, fails = 0; const ok = (c, msg) => { n++; if (!c) { fails++; console.log('✗', msg); } };
ok(!!m, 'tìm thấy tapBox trong detect.js');
if (m) {
  const tapBox = new Function(m[1] + '; return tapBox;')();
  const link = { width: 74, height: 21 }, card = { width: 358, height: 96 };
  // link static, ::after inset-0 trong thẻ 358×96 → vùng chạm thật = cả thẻ (trước đây bị đo 74×21 → báo sai)
  const t1 = tapBox(link, { left: '0px', right: '0px', top: '0px', bottom: '0px', minWidth: '0px', minHeight: '0px' }, card);
  ok(t1.width === 358 && t1.height === 96, `stretched link static: ${t1.width}×${t1.height} (phải 358×96)`);
  // link relative, ::after -inset-3 (mở rộng 12px mỗi phía): cb = chính phần tử → 74+24 × 21+24
  const t2 = tapBox(link, { left: '-12px', right: '-12px', top: '-12px', bottom: '-12px', minWidth: '0px', minHeight: '0px' }, null);
  ok(t2.width === 98 && t2.height === 45, `::after mở rộng quanh chính nó: ${t2.width}×${t2.height} (phải 98×45)`);
  // ::after min 44×44 trên phần tử 20×20
  const t3 = tapBox({ width: 20, height: 20 }, { left: '0px', right: '0px', top: '0px', bottom: '0px', minWidth: '44px', minHeight: '44px' }, null);
  ok(t3.width === 44 && t3.height === 44, 'min 44×44 giữ nguyên');
  // không có ::after hữu ích → không nhỏ hơn hộp phần tử
  const t4 = tapBox(link, { left: '0px', right: '0px', top: '0px', bottom: '0px', minWidth: '0px', minHeight: '0px' }, { width: 10, height: 10 });
  ok(t4.width === 74 && t4.height === 21, 'không bao giờ nhỏ hơn hộp phần tử');
}
console.log(fails ? `✗ qa-bot-tapbox: ${fails}/${n} lỗi` : `✓ qa-bot-tapbox: ${n}/${n} đạt`); process.exit(fails ? 1 : 0);
