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
// CLS #/home 14/11 (mqa 0.0757 mọi lượt): rời màn v2 mà GIỮ v2pre tới khi nội dung mới về → thanh trên hiện muộn > 500 ms sau chạm, đẩy cả #view 56 px.
{ const app = read('web/js/app.js'), css = read('web/css/style.css');
  ok(/document\.body\.classList\.toggle\('v2pre', preNow\)/.test(app) && !/if \(!holdPre\) document\.body\.classList\.toggle\('v2pre'/.test(app), 'route(): v2pre = preNow ngay lúc chạm (thanh trên không bị giữ ẩn khi rời màn v2)');
  ok(/classList\.toggle\('v2hold', holdPre\)/.test(app) && /body\.v2hold #view/.test(css) && !/body\.v2hold[^{]*\.topbar/.test(css), 'rời màn v2: chỉ giữ #view không đệm (v2hold), không ẩn thanh trên');
  // v2on (ST2.mount) cũng ẩn thanh trên; App.cleanup gỡ nó sau await App.need → phải gỡ ngay lúc chạm (mqa 14/11 vẫn 0.0757 khi chỉ sửa v2pre)
  const i = app.indexOf("classList.toggle('v2hold', holdPre)"), j = app.indexOf('await App.need(...b)');
  ok(/v2\(pre\|hold\|on\)/.test(app) && i > 0 && j > i && /if \(holdPre\) document\.body\.classList\.remove\('v2on'\)/.test(app.slice(i, j)), 'rời màn v2: gỡ v2on ngay lúc chạm, trước khi nạp gói trang'); }
if (bad) { console.log(`✗ v2pre-ring: ${bad} lỗi`); process.exit(1); }
console.log('✓ v2pre-ring: đạt');
