// #/interpret theo MỘT khung (frame-consistency, docs/DESIGN-SYSTEM.md §5d): thuộc tab Kỹ năng, không khung/cỡ tiêu đề riêng.
import fs from 'node:fs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('✗ ' + m); } else console.log('✓ ' + m); };
const hubs = fs.readFileSync(new URL('../../web/js/hubs.js', import.meta.url), 'utf8');
ok(/name === 'interpret'\) return \['skills'/.test(hubs), 'App.navOf: interpret thuộc tab Kỹ năng');
const css = fs.readFileSync(new URL('../../web/css/interpret.css', import.meta.url), 'utf8');
const ip = (css.match(/\.ip\{([^}]*)\}/) || [])[1] || '', h1 = (css.match(/\.ip-bar h1\{([^}]*)\}/) || [])[1] || '';
ok(ip && !/max-width|margin\s*:[^;]*auto/.test(ip), '.ip không đặt khung max-width/căn giữa riêng (dùng khung chung)');
ok(h1 && !/font-size/.test(h1), '.ip-bar h1 không đặt cỡ chữ riêng (dùng h1 chung)');
if (bad) { console.log(`✗ interpret-frame: ${bad} lỗi`); process.exit(1); } console.log('✓ interpret-frame');
