// Khóa tên file theo mã băm (scripts/build-hash.mjs): đổi nội dung = đổi tên (kể cả file cha khi file con đổi), không băm nhầm file
// tự tìm vị trí / gói i18n, CSS url() đổi sang tuyệt đối, đường cập nhật an toàn (HTML + sw.js no-cache, /h/ immutable, SW + loadScript
// quay về file gốc khi bản băm đã gỡ), app di động không mang bản /h/. Dùng: node scripts/test/build-hash.mjs  (trong npm test)
import fs from 'node:fs';
import { plan, hashedName, absUrls, plainRefs } from '../build-hash.mjs';
let fail = 0; const ok = (c, m) => { if (c) console.log('✓ build-hash: ' + m); else { fail++; console.error('✗ build-hash: ' + m); } };
const rd = f => fs.readFileSync(f, 'utf8');

const F = (o) => new Map(Object.entries(o));
const base = {
  'js/lib/ngsl.js': 'add("ngsl")', 'js/lib/ngsl2.js': 'add("ngsl2")',
  'js/app.js': "B={words:['js/lib/ngsl.js','js/lib/ngsl2.js']};css('css/a.css')",
  'js/i18n/en/x.js': 'T("x")', 'js/self.js': "document.currentScript.src", 'css/a.css': 'a{src:url(../fonts/f.woff2)}',
  'js/c1.js': "load('js/c2.js')", 'js/c2.js': "load('js/c1.js')",
};
const scan = F({ 'app/index.html': '<script src="js/app.js"></script>', 'sw.js': "const SHELL=['/js/app.js','/css/a.css']" });
const A = plan(F(base), scan);
ok(/^h\/js\/lib\/ngsl\.[0-9a-f]{10}\.js$/.test(A.map['js/lib/ngsl.js']) && A.map['js/lib/ngsl2.js'] !== A.map['js/lib/ngsl.js'], 'file lá có tên h/<đường dẫn>.<băm10>.<đuôi>');
ok(A.out.get('js/app.js').includes(`'${A.map['js/lib/ngsl.js']}','${A.map['js/lib/ngsl2.js']}'`), "tham chiếu trỏ đúng bản băm, 'ngsl.js' không ăn vào 'ngsl2.js'");
ok(A.map['js/app.js'] && A.out.get('app/index.html').includes(`src="${A.map['js/app.js']}"`) && A.out.get('sw.js').includes(`'/${A.map['js/app.js']}'`), 'index.html + SHELL của sw.js trỏ bản băm (giữ "/" đầu)');
ok(!A.map['js/i18n/en/x.js'] && !A.map['js/self.js'], 'không băm gói i18n (loadScript suy gói ngôn ngữ từ đường dẫn) và file tự tìm vị trí (currentScript)');
ok(!A.map['js/c1.js'] && !A.map['js/c2.js'] && A.skipped.some(([r, w]) => r === 'js/c1.js' && /chu trình/.test(w)), 'chu trình tham chiếu → giữ tên gốc');
ok(A.map['css/a.css'] && A.out.get('css/a.css') === 'a{src:url(/fonts/f.woff2)}', 'CSS dời sang /h/: url(../fonts/…) thành /fonts/…');
ok(absUrls('css/x/y.css', 'b{background:url("data:x")} c{u:url(img/a.png)} d{u:url(#g)}') === 'b{background:url("data:x")} c{u:url(/css/x/img/a.png)} d{u:url(#g)}', 'url() data:/#/tuyệt đối giữ nguyên, tương đối theo thư mục CSS');
// Merkle: đổi file con → file cha đổi tên; không đổi gì → tên giữ nguyên (cache trúng giữa các lần deploy)
const B = plan(F({ ...base, 'js/lib/ngsl2.js': 'add("ngsl2 v2")' }), scan), C = plan(F(base), scan);
ok(B.map['js/lib/ngsl2.js'] !== A.map['js/lib/ngsl2.js'] && B.map['js/app.js'] !== A.map['js/app.js'] && B.map['js/lib/ngsl.js'] === A.map['js/lib/ngsl.js'], 'đổi 1 file con → con + cha đổi tên, file khác giữ tên');
ok(JSON.stringify(C.map) === JSON.stringify(A.map), 'cùng nội dung → cùng tên (tất định)');
ok(hashedName('css/x.css', 'abcdef0123') === 'h/css/x.abcdef0123.css', 'hashedName');
ok(plainRefs(A.out.get('js/app.js'), A.map) === base['js/app.js'] && plainRefs('x', {}) === 'x', 'plainRefs: bộ kiểm dist đọc tên băm về tên gốc qua manifest (theme-switch đọc site.js)');
ok(/plainRefs\(fs\.readFileSync\(path\.join\(r, 'js\/site\.js'\)/.test(rd('scripts/test/theme-switch.mjs')), 'theme-switch đọc dist/js/site.js qua manifest, không cố định tên');

// Đường quay về file gốc: SW (HASHED) và app.js (UNHASH) phải hiểu đúng tên do build-hash tạo
const sw = rd('web/sw.js'), app = rd('web/js/app.js');
const HASHED = new Function('return ' + /const HASHED = (\/.+\/);/.exec(sw)[1])(), UNHASH = new Function('return ' + /const UNHASH = (\/.+\/);/.exec(app)[1])();
const hn = hashedName('js/lib/ngsl.js', '0123456789');
ok(('/' + hn).replace(HASHED, '/$1$2') === '/js/lib/ngsl.js' && hn.replace(UNHASH, '$1$2') === 'js/lib/ngsl.js' && hashedName('css/a.css', 'abcdefabcd').replace(UNHASH, '$1$2') === 'css/a.css', 'SW + loadScript/loadCss đổi tên băm về đường dẫn gốc');
ok(/if \(HASHED\.test\(url\.pathname\)\)/.test(sw) && sw.indexOf('if (HASHED.test(url.pathname))') < sw.indexOf('if (STATIC.test(url.pathname))') && /text\\\/html/.test(sw) && /fetch\(plain, \{ cache: 'no-cache' \}\)/.test(sw), 'SW: /h/ cache-first, 404/HTML → file gốc no-cache, mất mạng → bản gốc trong cache');
ok(/const plain = src\.replace\(UNHASH, '\$1\$2'\);\s*if \(plain !== src && await loadOne\(plain\)\) return;/.test(app) && /l\.onerror = \(\) => \{ const p = h\.replace\(UNHASH/.test(app), 'loadScript/loadCss: bản băm lỗi → file gốc (trang mở từ trước lần deploy)');
const H = rd('web/_headers');
ok(/\n\/h\/\*\n  Cache-Control: public, max-age=31536000, immutable\n/.test(H), '_headers: /h/* immutable 1 năm');
ok(/\n\/app\/\n  Cache-Control: no-cache\n/.test(H) && /\n\/sw\.js\n  Cache-Control: no-store\n/.test(H) && /\n\/\n  Cache-Control: no-cache\n/.test(H), '_headers: HTML (/, /app/) no-cache, sw.js no-store → bản mới thấy ngay');
const bw = rd('scripts/build-web.sh');
ok(bw.indexOf('node scripts/build-hash.mjs dist') > bw.indexOf('node scripts/build-cpack.mjs dist') && bw.indexOf('node scripts/build-hash.mjs dist') < bw.indexOf('sw-version.mjs'), 'build-web.sh: băm sau cpack, trước gắn phiên bản sw');
ok(/NO_HASH=1 \.\/scripts\/build-web\.sh/.test(rd('scripts/build-mobile.sh')), 'app di động dựng không có /h/ (NO_HASH=1)');

if (fail) { console.error(`✗ build-hash: ${fail} lỗi`); process.exit(1); }
console.log('✓ build-hash: đạt');
