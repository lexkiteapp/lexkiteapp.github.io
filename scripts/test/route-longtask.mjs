// Hồi quy tác vụ dài (quality-sweep #53): không buộc bố cục đồng bộ trong tác vụ vẽ trang. Node thuần, kiểm nguồn.
import fs from 'fs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗ ' + m); } else console.log('✓ ' + m); };
const app = fs.readFileSync('web/js/app.js', 'utf8'), pill = fs.readFileSync('web/js/report-pill-ui.js', 'utf8');
ok(/requestAnimationFrame\(\(\) => \{ if \(my === routeSeq\) focusView\(\); \}\)/.test(app), 'route(): view.focus dời sang rAF (không buộc bố cục trong tác vụ vẽ)');
ok(!/^\s*if \(routedOnce && !modalOpen[^\n]*view\.focus/m.test(app), 'route(): không còn focus đồng bộ');
ok(!/hashchange', function \(\) \{[^}]*requestAnimationFrame/.test(pill) && /rebase/.test(pill), 'report-pill-ui: hashchange không đọc scrollY trong rAF (đặt lại mốc ở sự kiện cuộn)');
ok(/function a11yRoute\(name, preTitle, my\)/.test(app) && /a11yRoute\(name, preTitle, my\)/.test(app), 'a11yRoute nhận my (focus rAF dùng routeSeq; thiếu → ReferenceError mọi route)');
process.exit(bad ? 1 : 0);
