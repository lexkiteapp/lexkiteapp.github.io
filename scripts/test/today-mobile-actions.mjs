// 📱 Đầu màn Hôm nay trên điện thoại (thanh trên của app bị ẩn dưới 1024 px) vẫn phải có lối vào tìm từ, thông báo, sáng/tối, kỳ thi.
//   Thiếu → đỏ: tính năng trên web không được mất lối vào ở mobile.
import fs from 'node:fs';
const errs = [], ux = fs.readFileSync('web/js/ux1.js', 'utf8');
for (const k of ['today', 'today-new']) { const s = fs.readFileSync(`web/js/st/v2/${k}.js`, 'utf8'); for (const a of ['search', 'notif', 'lang', 'menu']) if (!new RegExp(`data-act="(\\$\\{[^}]*\\}|${a})"`).test(s) && !s.includes(`"data-act", ${JSON.stringify(a)}`) && !s.includes(`'${a}'`)) errs.push(`${k}: thiếu nút ${a} ở đầu màn`); }
for (const [m, why] of [["on('search'", 'nối nút tìm vào #gq'], ["on('notif'", 'nối chuông vào #notifBtn'], ["on('menu'", 'menu avatar'], ['headBtns(root)', 'gắn nút khi vẽ màn']]) if (!ux.includes(m)) errs.push(`ux1.js: thiếu ${why}`);
const app = fs.readFileSync('web/js/app.js', 'utf8'); for (const [m, why] of [['data-m="exam"', 'đổi kỳ thi trong menu'], ['data-m="theme"', 'sáng/tối trong menu']]) if (!app.includes(m)) errs.push(`app.js (App.accountMenu): thiếu ${why}`);
if (!fs.readFileSync('web/css/style.css', 'utf8').includes('body.v2on.v2-gs .topbar')) errs.push('style.css: thiếu luật hiện ô tìm trên mobile');
const css = fs.readFileSync('web/css/style.css', 'utf8'); for (const c of ['.v2-practice', '.v2-me', '.v2-exam-readiness', '.v2-streak', '.v2-today-new']) if (!new RegExp(`min-width: 1024px\\) \\{ body\\.v2on:not\\(\\.focus\\) :is\\([^)]*${c.replace('.', '\\.')}[,)]`).test(css)) errs.push(`style.css: màn hub ${c} bị kẹt khổ điện thoại trên máy tính`);
// Đầu trang Stitch chung (shell.js – màn Ôn/Lộ trình/Tôi…): nhãn trợ năng phải có ngay trong từ điển khung (en.js), không nằm ở gói lười
//   – thiếu → ngôn ngữ khác thấy tiếng Việt rồi dịch máy gọi mạng (review-taps WebKit 06/11: dictlookup "Mức sẵn sàng thi…")
{ const en = fs.readFileSync('web/js/i18n/en.js', 'utf8'); for (const [, k] of fs.readFileSync('web/js/st/v2/shell.js', 'utf8').matchAll(/\bt\('([^']+)'\)/g)) if (!en.includes(`'${k}'`) && !en.includes(`"${k}"`)) errs.push(`shell.js: khóa "${k}" không có trong en.js (khung) – chuyển vào web/js/i18n/en/xcore.js rồi bash scripts/build-i18n.sh`); }
// Tôi (điện thoại): đầu trang có logo + tra từ; avatar mở menu ở pha bắt (bộ chặn "#…" của index.html + sync.js vẽ lại #avatarBtn)
{ const me = fs.readFileSync('web/js/ux1-me.js', 'utf8'); for (const [m, why] of [['hubHead(root)', 'gắn đầu trang khi vẽ'], ["dataset.act = 'search'", 'nút tra từ'], ["className: 'logo'", 'logo'], ['Ux1.headBtns(h)', 'nối nút tra từ vào #gq']]) if (!me.includes(m)) errs.push(`ux1-me.js: thiếu ${why}`);
  for (const sel of ["closest('#avatarBtn')", `closest('.v2 header a[href="#/me"]')`]) { const i = app.indexOf(sel), j = app.indexOf('\n', i); if (i < 0 || !/App\.accountMenu\(\); \}, true\)/.test(app.slice(i, j))) errs.push(`app.js: ${sel} phải mở App.accountMenu ở pha bắt (…, true)`); } }
if (errs.length) { console.error('✗ today-mobile-actions:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log('✓ today-mobile-actions: đầu màn mobile đủ lối vào');
