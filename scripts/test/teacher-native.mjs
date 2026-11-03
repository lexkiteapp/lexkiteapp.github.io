// 🧍 Cổng teacher-native (npm test, phần tĩnh): giáo viên trên màn phải đi qua chỗ giáo viên chung Chars.slot (web/js/teacher-slot.js) – đứng sau bệ,
// không vệt cắt/khối xám ở hông, cỡ chuẩn xs/s/m/l/xl. Ảnh tĩnh nửa người đặt trần (Chars.img/still/poster/avatar) chỉ còn ở các chỗ đã ghi trong
// teacher-native.known.json (danh sách CHỈ ĐƯỢC GIẢM khi chuyển từng màn sang slot; thêm chỗ mới = đỏ). Luật: docs/CHARACTERS.md §Chỗ giáo viên.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
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
  for (const m of s.matchAll(/Chars\.slot\([^;]*?ground:\s*([^,}\s]+)/g)) if (!["'card'", "'fade'"].includes(m[1])) err.push(`${rel}: Chars.slot ground ${m[1]} – chỉ 'fade' (mặc định, nền trống) hoặc 'card' (sau mép thẻ đục)`);
  if (/tslot-ledge/.test(code)) err.push(`${rel}: .tslot-ledge (bệ rời lơ lửng) đã bỏ – dùng Chars.slot ground fade/card`);
  if (/teach\/(ama|carlos)\/still-/.test(s)) err.push(`${rel}: đường dẫn ảnh giáo viên viết tay – dùng Chars.slot`);
}
for (const [f, n] of Object.entries(raw)) {
  const k = KNOWN[f] || 0;
  if (n > k) err.push(`${f}: ${n} chỗ giáo viên đặt trần (Chars.img/still/poster/avatar), được phép ${k} – dùng Chars.slot(who, {pose, size}) (docs/CHARACTERS.md §Chỗ giáo viên)`);
}
for (const [f, k] of Object.entries(KNOWN)) if ((raw[f] || 0) < k) err.push(`${f}: còn ${raw[f] || 0} < ${k} trong teacher-native.known.json – hạ số trong danh sách (chỉ được giảm)`);
const sl = fs.readFileSync(path.join(ROOT, 'web/js/teacher-slot.js'), 'utf8');
if (!/\.tslot-fig\{[^}]*bottom:0;overflow:hidden;overflow:clip\}/.test(sl) || /clip-path/.test(sl)) err.push('teacher-slot.js: thiếu khung cắt đáy (overflow:clip – hidden là khung cuộn, scrollIntoView đẩy ảnh lên lộ thân mờ; không clip-path – final-qc coi là dán)');
// Tiếp đất (chủ 3/11 – bệ xám .tslot-ledge lơ lửng giữa nền trang trông như lỗi): chỉ 2 chế độ, KHÔNG có bệ rời.
//  'fade': mặt nạ mờ dần đặt trên KHUNG .tslot-fig (che cả ảnh tĩnh lẫn canvas clip WebGL), có tiền tố -webkit-, trong suốt hẳn trước đáy khung (không đường cắt),
//          mặt nạ chỉ ở đúng luật này (final-qc chỉ chấp nhận mặt nạ của khung fade) + bóng tiếp đất elip radial-gradient + phương án @supports not cho máy không có mask.
//  'card': không vẽ gì – thẻ đục của người gọi đè dải đáy (runtime teacher-native-shots kiểm có thẻ che, không thì đỏ).
{ const fade = (sl.match(/\.tslot-fade \.tslot-fig\{([^}]*)\}/) || [])[1] || '', std = (fade.match(/(?:^|;)mask-image:([^;]*)/) || [])[1], wk = (fade.match(/-webkit-mask-image:([^;]*)/) || [])[1];
  if (!std || !wk || std !== wk || !/^linear-gradient\(to top,transparent calc\(var\(--h\)\*\.0\d\)/.test(std) || !/#000 calc\(var\(--h\)\*\.[2-4]\d\)\)$/.test(std)) err.push(`teacher-slot.js: chế độ 'fade' phải có mask-image + -webkit-mask-image giống hệt trên .tslot-fade .tslot-fig: linear-gradient(to top, transparent ≤0,09 khung → #000 ở 0,2–0,49 khung) – mờ mượt, trong suốt trước đáy khung`);
  const slc = sl.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\/\/ [^\n`']*$/gm, ''); // mã thật (bỏ chú thích)
  if (/mask-image/.test(slc.replace(/\.tslot-fade \.tslot-fig\{[^}]*\}/, '').replace(/@supports not \(\(-webkit-mask-image:[^)]*\)\) or \(mask-image:[^)]*\)\)\)/, ''))) err.push('teacher-slot.js: mask-image chỉ được nằm trong luật .tslot-fade .tslot-fig (mặt nạ ở chỗ khác = "dán đè" theo final-qc)');
  if (!/\.tslot-shadow\{[^}]*border-radius:50%[^}]*radial-gradient\(closest-side/.test(sl) || !/'<i class="tslot-shadow"><\/i>'/.test(sl)) err.push("teacher-slot.js: 'fade' thiếu bóng tiếp đất elip .tslot-shadow (radial-gradient) – giáo viên sẽ lơ lửng");
  if (!/@supports not \(\(-webkit-mask-image:[^)]*\)\) or \(mask-image:[^)]*\)\)\)\{\.tslot-fade/.test(sl)) err.push("teacher-slot.js: 'fade' thiếu phương án @supports not (máy không có mask) – đường cắt cứng sẽ lộ");
  if (/tslot-ledge|data-ground="0"/.test(slc)) err.push('teacher-slot.js: bệ rời .tslot-ledge đã bỏ (chủ 3/11: khối xám lơ lửng giữa nền trang) – dùng ground fade (nền trống) hoặc card (sau mép thẻ đục)');
  if (!/const gr = o\.ground === 'card' \? 'card' : 'fade'/.test(sl)) err.push("teacher-slot.js: mặc định phải là ground 'fade' (chỗ mới không thẻ phía sau không được ra bệ lơ lửng)"); }
{ const fg = (sl.match(/\.tslot-fig\{[^}]*\}/) || [''])[0], lr = ['left', 'right'].map(k => +((fg.match(new RegExp(k + ':calc\\(var\\(--h\\)\\*-([.\\d]+)\\)')) || [])[1]));
  if (!lr.every(x => x >= 0.243 && x <= 0.3)) err.push(`teacher-slot.js: .tslot-fig lố ngang phải vừa ảnh (0,243–0,3 khung-cao mỗi bên: ảnh 1,385, khung 0,9) – đang ${lr.join('/')}; rộng hơn → tràn ngang màn 360 px, hẹp hơn → cắt tay`); }
{ // hành vi thật của Chars.slot (vm, không DOM): mặc định 'fade' có bóng tiếp đất, 'card' không vẽ gì dưới chân, không đâu còn bệ rời; ground lạ/false cũ → 'fade'
  const G = { matchMedia: () => ({ matches: false }), navigator: {} }; G.self = G; G.window = G; vm.createContext(G);
  for (const f of ['web/js/characters.js', 'web/js/teacher-slot.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), G);
  const out = o => G.Chars.slot('ama', { pose: 'point', size: 'l', ...o });
  for (const [o, want] of [[{}, 'fade'], [{ ground: false }, 'fade'], [{ ground: 'ledge' }, 'fade'], [{ ground: 'fade' }, 'fade'], [{ ground: 'card' }, 'card']]) {
    const h = out(o), sh = /<i class="tslot-shadow"><\/i><span class="tslot-fig">/.test(h);
    if (!h.includes(`data-ground="${want}"`) || !h.includes(` tslot-${want}`) || /tslot-ledge/.test(h) || sh !== (want === 'fade')) err.push(`Chars.slot(${JSON.stringify(o)}) phải ra ground '${want}'${want === 'fade' ? ' + bóng .tslot-shadow trước khung' : ' không bóng'}, không bệ rời – đang: ${h.slice(0, 160)}`);
  } }
if (!/prefers-reduced-motion:no-preference/.test(sl)) err.push('teacher-slot.js: chuyển động phải nằm trong prefers-reduced-motion:no-preference');
const idx = fs.readFileSync(path.join(ROOT, 'web/app/index.html'), 'utf8');
if (!(idx.indexOf('js/characters.js') > 0 && idx.indexOf('js/teacher-slot.js') > idx.indexOf('js/characters.js'))) err.push('web/app/index.html: teacher-slot.js phải nạp ngay sau characters.js');
if (err.length) { console.error('✗ teacher-native:\n  ' + err.join('\n  ')); process.exit(1); }
const left = Object.values(raw).reduce((a, b) => a + b, 0);
console.log(`✓ teacher-native: chỗ giáo viên chung OK · còn ${left} chỗ đặt trần chờ chuyển (teacher-native.known.json)`);
