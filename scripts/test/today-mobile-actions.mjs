// 📱 Đầu màn Hôm nay trên điện thoại (thanh trên của app bị ẩn dưới 1024 px) vẫn phải có lối vào tìm từ, thông báo, sáng/tối, kỳ thi.
//   Thiếu → đỏ: tính năng trên web không được mất lối vào ở mobile.
import fs from 'node:fs';
const errs = [], ux = fs.readFileSync('web/js/ux1.js', 'utf8');
for (const k of ['today', 'today-new']) { const s = fs.readFileSync(`web/js/st/v2/${k}.js`, 'utf8'); for (const a of ['search', 'notif', 'lang', 'menu']) if (!new RegExp(`data-act="(\\$\\{[^}]*\\}|${a})"`).test(s) && !s.includes(`"data-act", ${JSON.stringify(a)}`) && !s.includes(`'${a}'`)) errs.push(`${k}: thiếu nút ${a} ở đầu màn`); }
for (const [m, why] of [["on('search'", 'nối nút tìm vào #gq'], ["on('notif'", 'nối chuông vào #notifBtn'], ["on('menu'", 'menu avatar'], ['data-m="exam"', 'đổi kỳ thi trong menu'], ['data-m="theme"', 'sáng/tối trong menu'], ['headBtns(root)', 'gắn nút khi vẽ màn']]) if (!ux.includes(m)) errs.push(`ux1.js: thiếu ${why}`);
if (!fs.readFileSync('web/css/style.css', 'utf8').includes('body.v2on.v2-gs .topbar')) errs.push('style.css: thiếu luật hiện ô tìm trên mobile');
if (errs.length) { console.error('✗ today-mobile-actions:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log('✓ today-mobile-actions: đầu màn mobile đủ lối vào');
