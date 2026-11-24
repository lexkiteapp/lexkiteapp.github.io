// 🗺️ Mọi ngôn ngữ đích có lộ trình ngày dùng ĐÚNG MỘT hub (web/cpack/es-app/day-ui.js, owner 23/11): liệt kê route từ bảng Target (web/js/target.js, `home` = #/practice/<tl>d)
// và kiểm mỗi route: có dòng bảng TLD trong day-ui.js, gói bundles.js `<tl>day`, route study.js, dy.js + 15 nhãn đủ khoá/chỗ giữ, và KHÔNG còn lưới ô cũ (chip số ngày).
// Thêm ngôn ngữ đích mới có `home` mà quên nối vào hub → đỏ ở đây. Render thật từng route: es-path.mjs / fr-path.mjs (jsdom) + ảnh CI tlpath-shots.yml. 0 mạng.
import fs from 'node:fs';
import { DAY_UI } from '../target/path-lib.mjs';
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.error('  ✗ ' + m); } };
const rd = f => fs.readFileSync(f, 'utf8');
const tgt = rd('web/js/target.js'), ui = rd('web/cpack/es-app/day-ui.js'), bun = rd('web/js/bundles.js'), study = rd('web/js/study.js');
const TLS = [...tgt.matchAll(/^ {4}([a-z]{2}): \{ em: [^\n]*?home: '#\/practice\/([a-z]{2})d'/gm)].map(m => (ok(m[1] === m[2], `home của ${m[1]} phải là #/practice/${m[1]}d`), m[1]));
ok(TLS.includes('es') && TLS.includes('fr'), `bảng Target có es + fr làm lộ trình ngày (thấy: ${TLS.join(',')})`);
const LANGS = 'en vi es pt fr de id th zh ja ko hi ar ru tr'.split(' '), ph = s => (String(s).match(/\{\w+\}/g) || []).sort().join();
for (const tl of TLS) {
  ok(new RegExp(`^\\s{4}${tl}: \\{ G: '[A-Z]+X', call: `, 'm').test(ui), `${tl}: dòng bảng TLD trong day-ui.js`);
  ok(new RegExp(`${tl}day: \\['cpack/${tl}/dy\\.js', 'cpack/es-app/day-ui\\.js'\\]`).test(bun), `${tl}: gói ${tl}day trong bundles.js (dy.js + day-ui.js dùng chung)`);
  ok(new RegExp(`${tl}d: \\{[^\\n]*App\\.need\\('${tl}day'\\)`).test(study), `${tl}: route #/practice/${tl}d mở gói ${tl}day`);
  ok(fs.existsSync(`web/cpack/${tl}/dy.js`) && fs.existsSync(`web/packs/${tl}/wd.json`), `${tl}: dy.js + packs/${tl}/wd.json đã dựng`);
  const pu = JSON.parse(rd(`content/target/${tl}/path-ui.json`)), en = pu.en;
  for (const l of LANGS) for (const k of DAY_UI) {
    ok(typeof pu[l]?.[k] === 'string' && pu[l][k].trim(), `${tl}/${l}: thiếu nhãn "${k}"`);
    if (pu[l]?.[k] && en[k]) ok(ph(pu[l][k]) === ph(en[k]), `${tl}/${l}/${k}: chỗ giữ {…} lệch bản en`);
  }
}
// hub dùng chung: không còn lưới ô số ngày (chip href ?d=) ở bất kỳ nhánh nào của day-ui.js
ok(!/class="chip[^"]*"[^>]*href="\$\{home\(\)\}\?d=/.test(ui) && /class="tp-ring"|tp-ring/.test(ui) && /details class="tp-w/.test(ui), 'day-ui.js: hub dùng hero vòng tiến độ + tuần <details>, không còn lưới ô cũ');
ok(/'css\/tlpath\.css'/.test(ui) && fs.existsSync('web/css/tlpath.css'), 'hub tải css/tlpath.css (token --st-* + --sp/--r/--fs)');
console.log(fails ? `✗ tl-day-routes: ${fails}/${n} lỗi` : `✓ tl-day-routes: ${n}/${n} đạt (${TLS.join(', ')})`);
process.exit(fails ? 1 : 0);
