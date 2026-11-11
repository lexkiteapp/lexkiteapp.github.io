// v2pre (ẩn thanh trên bằng display:none) chỉ được đặt cho màn mà khung v2 vẽ NGAY trong route(); sau 1500 ms v2pre bị gỡ.
// #/call/<id> là màn "đổ chuông" kiểu cũ (v2 chỉ gắn khi bấm Gọi ngay) → đặt v2pre ở đó làm thanh trên 64 px hiện muộn, đẩy cả màn (CLS 0.1, scroll-perf call-item).
import fs from 'fs';

let bad = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) bad++; };
const read = f => fs.readFileSync(f, 'utf8');

for (const f of ['web/js/app.js', 'extension/app/js/app.js']) {
  const s = read(f), m = /classList\.toggle\('v2pre',[^\n]*/.exec(s);
  ok(!!m, `${f}: có dòng đặt v2pre`);
  ok(m && !/name === 'call'/.test(m[0]), `${f}: v2pre không đặt cho màn đổ chuông #/call/<id>`);
}
const idx = read('web/app/index.html'), pre = /classList\.add\('v2pre'\)/.exec(idx);
ok(!!pre, 'web/app/index.html: có đặt v2pre trước khi nạp');
ok(!/n==='call'\|\|n==='lesson'/.test(idx), 'web/app/index.html: v2pre không đặt cho #/call/<id>');
if (bad) { console.log(`✗ v2pre-ring: ${bad} lỗi`); process.exit(1); }
console.log('✓ v2pre-ring: đạt');
