// 📱 Khóa TBN (W7c) tới app gốc qua OTA: gói mobile/www = rsync của dist/ theo ĐÚNG danh sách loại trừ trong scripts/build-mobile.sh.
// Chạy rsync khô trên web/ (cùng bố cục với dist/) → mọi tệp của khóa es phải VÀO gói (không bị --exclude nuốt), cờ es_course_pct/es_kill tới app qua lk.cfg,
// và khóa es KHÔNG đòi plugin/quyền gốc mới (minNative giữ nguyên → máy cũ vẫn nhận OTA). 0 mạng, vài chục ms.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { execFileSync } from 'node:child_process';
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.error('  ✗ ' + m); } };
const rd = f => fs.readFileSync(f, 'utf8');

// 1) lấy nguyên các --exclude của lệnh rsync trong build-mobile.sh (một nguồn, không chép lại)
const sh = rd('scripts/build-mobile.sh'), line = sh.split('\n').find(l => /^rsync /.test(l));
ok(!!line, 'build-mobile.sh còn dòng rsync');
const ex = [...(line || '').matchAll(/--exclude '([^']+)'/g)].map(m => m[1]);
const LANGS = (sh.match(/for l in ([a-z_ ]+); do LANG_EX/) || [])[1]?.split(' ') || [];
for (const l of LANGS) ex.push(`/${l}/*/`);
ok(ex.length > 10 && LANGS.includes('es'), 'đọc được danh sách loại trừ (kể cả trang SEO /es/*/)');

// 2) rsync khô: web/ → thư mục tạm; in tên tệp sẽ chép
const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'esnb-'));
const out = execFileSync('rsync', ['-a', '--dry-run', '--out-format=%n', ...ex.flatMap(e => ['--exclude', e]), 'web/', tmp + '/'], { encoding: 'utf8', maxBuffer: 1 << 28 });
const inBundle = new Set(out.split('\n').filter(Boolean));
fs.rmSync(tmp, { recursive: true, force: true });

// 3) mọi tệp khóa es dùng lúc chạy phải vào gói
const need = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : need.push(p.replace(/^web\//, '')); } })('web/cpack/es');
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : need.push(p.replace(/^web\//, '')); } })('web/cpack/es-app');
need.push('js/target.js', 'js/target-es-seed.json');
const miss = need.filter(f => !inBundle.has(f));
ok(need.length > 80 && !miss.length, `gói app gốc thiếu ${miss.length}/${need.length} tệp khóa TBN: ${miss.slice(0, 5).join(', ')}`);
// tài nguyên tải qua mạng (không nằm trong gói) phải là loại sẵn có của khóa tiếng Anh: audio/ + packs/ (cùng cơ chế CDN)
ok(/--exclude 'audio\/'/.test(line) && /--exclude 'packs\/'/.test(line), 'audio/ và packs/ vẫn tải qua mạng như khóa tiếng Anh');

// 4) cờ bậc tới app: PUBLIC_KEYS (máy chủ trả lk.cfg) + công tắc khẩn
const cfg = rd('functions/api/config.js');
ok(/es_course_pct/.test(cfg) && /es_kill/.test(cfg) && /es_course\b/.test(cfg), 'config công khai có es_course/es_course_pct/es_kill (app gốc đọc cùng lk.cfg)');

// 5) không đòi native mới: manifest quyền + minNative không đổi vì khóa es
const perm = fs.existsSync('extension/permissions.lock') ? rd('extension/permissions.lock') : '';
ok(!/es[_-]course/.test(perm), 'permissions.lock không dính khóa es');
const pkg = JSON.parse(rd('mobile/package.json'));
ok(pkg.ota && /^[\d.]+$/.test(String(pkg.ota.minNative)), 'mobile/package.json có ota.minNative hợp lệ (khóa es không nâng: dùng Web Speech sẵn có)');

console.log(fails ? `✗ es-native-bundle: ${fails}/${n} lỗi` : `✓ es-native-bundle: ${n}/${n} đạt (${need.length} tệp khóa TBN vào gói OTA)`);
process.exit(fails ? 1 : 0);
