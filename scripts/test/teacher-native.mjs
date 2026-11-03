// 🧍 Cổng teacher-native (npm test, phần tĩnh): giáo viên trên màn phải đi qua chỗ giáo viên chung Chars.slot (web/js/teacher-slot.js) – đứng sau bệ,
// không vệt cắt/khối xám ở hông, cỡ chuẩn xs/s/m/l/xl. Ảnh tĩnh nửa người đặt trần (Chars.img/still/poster/avatar) chỉ còn ở các chỗ đã ghi trong
// teacher-native.known.json (danh sách CHỈ ĐƯỢC GIẢM khi chuyển từng màn sang slot; thêm chỗ mới = đỏ). Luật: docs/CHARACTERS.md §Chỗ giáo viên.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const KNOWN = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/test/teacher-native.known.json'), 'utf8')).raw;
const SKIP = new Set(['web/js/characters.js', 'web/js/teacher-slot.js']);
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);
const err = [], raw = {};
for (const f of walk(path.join(ROOT, 'web/js'))) {
  const rel = path.relative(ROOT, f).split(path.sep).join('/'); if (SKIP.has(rel)) continue;
  const s = fs.readFileSync(f, 'utf8');
  const code = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''); // bỏ chú thích: chỉ đếm mã thật
  const n = (code.match(/Chars\.(img|still|poster|avatar)\(/g) || []).length; if (n) raw[rel] = n;
  for (const m of s.matchAll(/Chars\.slot\([^)]*?size:\s*'([a-z]+)'/g)) if (!['xs', 's', 'm', 'l', 'xl'].includes(m[1])) err.push(`${rel}: Chars.slot size '${m[1]}' ngoài cỡ chuẩn xs/s/m/l/xl`);
  if (/teach\/(ama|carlos)\/still-/.test(s)) err.push(`${rel}: đường dẫn ảnh giáo viên viết tay – dùng Chars.slot`);
}
for (const [f, n] of Object.entries(raw)) {
  const k = KNOWN[f] || 0;
  if (n > k) err.push(`${f}: ${n} chỗ giáo viên đặt trần (Chars.img/still/poster/avatar), được phép ${k} – dùng Chars.slot(who, {pose, size}) (docs/CHARACTERS.md §Chỗ giáo viên)`);
}
for (const [f, k] of Object.entries(KNOWN)) if ((raw[f] || 0) < k) err.push(`${f}: còn ${raw[f] || 0} < ${k} trong teacher-native.known.json – hạ số trong danh sách (chỉ được giảm)`);
const sl = fs.readFileSync(path.join(ROOT, 'web/js/teacher-slot.js'), 'utf8');
if (!/\.tslot-fig\{[^}]*bottom:0;overflow:hidden;overflow:clip\}/.test(sl) || /clip-path|mask-image/.test(sl) || !/tslot-ledge/.test(sl)) err.push('teacher-slot.js: thiếu khung cắt đáy (overflow:clip – hidden là khung cuộn, scrollIntoView đẩy ảnh lên lộ thân mờ; không clip-path/mask – final-qc coi mặt nạ là dán) hoặc bệ che hông (vệt cắt sẽ lộ)');
{ const fg = (sl.match(/\.tslot-fig\{[^}]*\}/) || [''])[0], lr = ['left', 'right'].map(k => +((fg.match(new RegExp(k + ':calc\\(var\\(--h\\)\\*-([.\\d]+)\\)')) || [])[1]));
  if (!lr.every(x => x >= 0.243 && x <= 0.3)) err.push(`teacher-slot.js: .tslot-fig lố ngang phải vừa ảnh (0,243–0,3 khung-cao mỗi bên: ảnh 1,385, khung 0,9) – đang ${lr.join('/')}; rộng hơn → tràn ngang màn 360 px, hẹp hơn → cắt tay`); }
if (!/prefers-reduced-motion:no-preference/.test(sl)) err.push('teacher-slot.js: chuyển động phải nằm trong prefers-reduced-motion:no-preference');
const idx = fs.readFileSync(path.join(ROOT, 'web/app/index.html'), 'utf8');
if (!(idx.indexOf('js/characters.js') > 0 && idx.indexOf('js/teacher-slot.js') > idx.indexOf('js/characters.js'))) err.push('web/app/index.html: teacher-slot.js phải nạp ngay sau characters.js');
if (err.length) { console.error('✗ teacher-native:\n  ' + err.join('\n  ')); process.exit(1); }
const left = Object.values(raw).reduce((a, b) => a + b, 0);
console.log(`✓ teacher-native: chỗ giáo viên chung OK · còn ${left} chỗ đặt trần chờ chuyển (teacher-native.known.json)`);
