// 📱 Đầu màn Hôm nay trên điện thoại (thanh trên của app bị ẩn dưới 1024 px) vẫn phải có lối vào tìm từ, thông báo, sáng/tối, kỳ thi.
//   Thiếu → đỏ: tính năng trên web không được mất lối vào ở mobile.
import fs from 'node:fs';
const errs = [], ux = fs.readFileSync('web/js/ux1.js', 'utf8');
for (const k of ['today', 'today-new']) { const s = fs.readFileSync(`web/js/st/v2/${k}.js`, 'utf8'); for (const a of ['search', 'notif', 'lang', 'menu']) if (!new RegExp(`data-act="(\\$\\{[^}]*\\}|${a})"`).test(s) && !s.includes(`"data-act", ${JSON.stringify(a)}`) && !s.includes(`'${a}'`)) errs.push(`${k}: thiếu nút ${a} ở đầu màn`); }
for (const [m, why] of [["on('search'", 'nối nút tìm vào #gq'], ["on('notif'", 'nối chuông vào #notifBtn'], ["on('menu'", 'menu avatar'], ['headBtns(root)', 'gắn nút khi vẽ màn']]) if (!ux.includes(m)) errs.push(`ux1.js: thiếu ${why}`);
const app = fs.readFileSync('web/js/app.js', 'utf8'); for (const [m, why] of [['data-m="exam"', 'đổi kỳ thi trong menu'], ['data-m="theme"', 'sáng/tối trong menu']]) if (!app.includes(m)) errs.push(`app.js (App.accountMenu): thiếu ${why}`);
if (!fs.readFileSync('web/css/style.css', 'utf8').includes('body.v2on.v2-gs .topbar')) errs.push('style.css: thiếu luật hiện ô tìm trên mobile');
const css = fs.readFileSync('web/css/style.css', 'utf8'); for (const c of ['.v2-practice', '.v2-me', '.v2-exam-readiness', '.v2-streak', '.v2-today-new']) if (!new RegExp(`min-width: 1024px\\) \\{ body\\.v2on:not\\(\\.focus\\) :is\\([^)]*${c.replace('.', '\\.')}[,)]`).test(css)) errs.push(`style.css: màn hub ${c} bị kẹt khổ điện thoại trên máy tính`);
// Thanh hub chung (st/v2/runtime.js hubbar – mọi tab điện thoại, thay đầu trang sinh ra của shell/Hôm nay/Tôi): nhãn phải có trong từ điển khung (en.js) hoặc gói ux1 cùng nạp (en/ux1.js, en/v2.js);
//   có logo + tra từ + chuông + 🌐 + avatar, nối nút qua Ux1.headBtns; avatar mở menu ở pha bắt (bộ chặn "#…" của index.html + sync.js vẽ lại #avatarBtn)
{ const rt = fs.readFileSync('web/js/st/v2/runtime.js', 'utf8'), en = fs.readFileSync('web/js/i18n/en.js', 'utf8') + fs.readFileSync('web/js/i18n/en/ux1.js', 'utf8') + fs.readFileSync('web/js/i18n/en/v2.js', 'utf8');
  const hb = rt.slice(rt.indexOf('S.hubbar ='), rt.indexOf('S.hubWire ='));
  for (const [, k] of hb.matchAll(/\bt\('([^']+)'\)/g)) if (!en.includes(`'${k}'`) && !en.includes(`"${k}"`)) errs.push(`runtime.js hubbar: khóa "${k}" không có trong từ điển khung/ux1 – ngôn ngữ khác thấy tiếng Việt rồi dịch máy gọi mạng`);
  for (const [m, why] of [['hb-logo', 'logo'], ['data-act="search"', 'nút tra từ'], ['data-act="notif"', 'chuông'], ['data-act="lang"', 'nút ngôn ngữ'], ['hb-av', 'avatar'], ['Ux1.headBtns(h)', 'nối nút tra từ/chuông vào #gq/#notifBtn']]) if (!rt.includes(m)) errs.push(`runtime.js: thiếu ${why}`);
  const mt = rt.slice(rt.indexOf('S.mount ='));
  if (!/S\.hubWire\(view\)/.test(mt)) errs.push('runtime.js: mount không nối nút thanh hub'); }
{ for (const sel of ["closest('#avatarBtn')", `closest('.v2 header a[href="#/me"]')`]) { const i = app.indexOf(sel), j = app.indexOf('\n', i); if (i < 0 || !/App\.accountMenu\(\); \}, true\)/.test(app.slice(i, j))) errs.push(`app.js: ${sel} phải mở App.accountMenu() ở pha bắt`); } }
if (errs.length) { console.error('✗ today-mobile-actions:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log('✓ today-mobile-actions: đầu màn mobile đủ lối vào');
