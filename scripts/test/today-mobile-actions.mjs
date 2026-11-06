// 📱 Đầu màn Hôm nay trên điện thoại (thanh trên của app bị ẩn dưới 1024 px) vẫn phải có lối vào tìm từ, thông báo, sáng/tối, kỳ thi.
//   Thiếu → đỏ: tính năng trên web không được mất lối vào ở mobile.
import fs from 'node:fs';
const errs = [], ux = fs.readFileSync('web/js/ux1.js', 'utf8');
for (const k of ['today', 'today-new']) { const s = fs.readFileSync(`web/js/st/v2/${k}.js`, 'utf8'); for (const a of ['search', 'notif', 'lang', 'menu']) if (!new RegExp(`data-act="(\\$\\{[^}]*\\}|${a})"`).test(s) && !s.includes(`"data-act", ${JSON.stringify(a)}`) && !s.includes(`'${a}'`)) errs.push(`${k}: thiếu nút ${a} ở đầu màn`); }
for (const [m, why] of [["on('search'", 'nối nút tìm vào #gq'], ["on('notif'", 'nối chuông vào #notifBtn'], ["on('menu'", 'menu avatar'], ['headBtns(root)', 'gắn nút khi vẽ màn']]) if (!ux.includes(m)) errs.push(`ux1.js: thiếu ${why}`);
const app = fs.readFileSync('web/js/app.js', 'utf8'); for (const [m, why] of [['data-m="exam"', 'đổi kỳ thi trong menu'], ['data-m="theme"', 'sáng/tối trong menu']]) if (!app.includes(m)) errs.push(`app.js (App.accountMenu): thiếu ${why}`);
if (!fs.readFileSync('web/css/style.css', 'utf8').includes('body.v2on.v2-gs .topbar')) errs.push('style.css: thiếu luật hiện ô tìm trên mobile');
const css = fs.readFileSync('web/css/style.css', 'utf8'); for (const c of ['.v2-practice', '.v2-me', '.v2-exam-readiness', '.v2-streak', '.v2-today-new']) if (!new RegExp(`min-width: 1024px\\) \\{ body\\.v2on:not\\(\\.focus\\) :is\\([^)]*${c.replace('.', '\\.')}[,)]`).test(css)) errs.push(`style.css: màn hub ${c} bị kẹt khổ điện thoại trên máy tính`);
if (errs.length) { console.error('✗ today-mobile-actions:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log('✓ today-mobile-actions: đầu màn mobile đủ lối vào');
