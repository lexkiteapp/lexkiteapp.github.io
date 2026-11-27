// 📞 Cuộc gọi ngôn ngữ đích không bị gói tiếng Anh xoá (owner 26/11: bấm X trong khóa es/fr không thoát, màn xoay vòng, trang treo).
// Gốc: cpack/<tl>/cl.js nạp trước, rồi route #/call nạp gói tiếng Anh call/calls.js – bản cũ GÁN `g.CALLS = [...]` xoá mất cuộc gọi tl → routes.call thấy thiếu → App.need() trả ngay (gói đã nạp)
// → gọi lại routes.call vô hạn (vòng microtask, trang treo, nút X không bấm được). Nay concat + call.js tự giới hạn số lần thử. Ngoại tuyến, 0 mạng.
import fs from 'node:fs';
import vm from 'node:vm';
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.error('  ✗ ' + m); } };
const run = (file, ctx) => vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
for (const file of ['web/js/call/calls.js', 'web/js/call/calls-lot1.js', 'web/js/call/calls-lot2.js', 'web/cpack/call/calls-lot3.js', 'web/js/call/calls-exam.js']) {
  const ctx = { CALLS: [{ id: 'es-demo', tl: 'es' }, { id: 'fr-demo', tl: 'fr' }] }; ctx.self = ctx; vm.createContext(ctx);
  run(file, ctx);
  ok(ctx.CALLS.some(c => c.id === 'es-demo') && ctx.CALLS.some(c => c.id === 'fr-demo') && ctx.CALLS.length > 2, `${file}: nạp sau cl.js KHÔNG xoá cuộc gọi es/fr (còn ${ctx.CALLS.length})`);
}
const src = fs.readFileSync('web/js/call.js', 'utf8');
ok(/routes\.call\.miss/.test(src) && /miss > 2/.test(src) && /App\.reneed/.test(src), 'call.js: thiếu cuộc gọi tl → thử tải lại tối đa 1 lần rồi báo lỗi có nút Thoát, không lặp vô hạn');
console.log(fails ? `✗ call-tl-order: ${fails}/${n} lỗi` : `✓ call-tl-order: ${n}/${n} đạt`);
process.exit(fails ? 1 : 0);
