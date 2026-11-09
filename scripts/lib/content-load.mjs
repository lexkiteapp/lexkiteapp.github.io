// Nạp toàn bộ dữ liệu học (từ vựng, ngữ pháp, đề IELTS/TOEIC/TOEFL) trong web/js vào một ngữ cảnh vm, không cần trình duyệt.
// Dùng: import { loadContent } from './lib/content-load.mjs'; const C = loadContent(); C.IELTS_DATA, C.GRAMMAR, C.TOEIC…
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { SCAN_ROOTS } from './scan-roots.mjs';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const W = path.join(ROOT, 'web/js');
// Thư mục dữ liệu theo thứ tự app nạp; mỗi thư mục có thể nằm ở web/js hoặc gói tải lười web/cpack – gốc quét lấy từ scan-roots.mjs (một nguồn đường dẫn).
const SUBS = ['lib', 'grammar', 'toeic', 'toefl', 'readtest', 'listen', 'write', 'speak'];
export const DATA_DIRS = SUBS.flatMap(sub => SCAN_ROOTS.map(r => path.relative(W, path.join(ROOT, r, sub))).filter(d => fs.existsSync(path.join(W, d))));
export function loadContent() {
  const noop = () => {}, ctx = { console: { log: noop, warn: noop, error: noop }, Date, Math, JSON, setTimeout: noop, clearTimeout: noop, localStorage: { getItem: () => null, setItem: noop }, navigator: {} };
  ctx.self = ctx; ctx.window = ctx; ctx.t = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m)) : s);
  vm.createContext(ctx);
  const files = ['data.js', 'lexis.js', 'structures.js', 'readings.js', '../cpack/readings/more.js'];
  // grammar: đúng thứ tự app nạp (web/js/app.js) – drills-*.js gắn bài tập vào chương đã có
  const GORDER = ['tenses', 'verbs', 'sentences', 'foundation', 'starter', 'academic', 'chapters', 'book2', 'drills-a', 'drills-b', 'drills-c', 'drills-own', 'bank-gen', 'check'];
  // grammar có thể nằm ở web/js/grammar và web/cpack/grammar (drills-own.js): gộp rồi xếp đúng thứ tự app nạp
  const isG = d => /(^|\/)grammar$/.test(d), gOrder = f => GORDER.indexOf(path.basename(f).slice(0, -3)) + 1 || 99;
  for (const d of DATA_DIRS) {
    if (isG(d)) { if (!files.some(f => /(^|\/)grammar\//.test(f))) files.push(...DATA_DIRS.filter(isG).flatMap(g => fs.readdirSync(path.join(W, g)).filter(f => f.endsWith('.js')).map(f => g + '/' + f)).sort((a, b) => gOrder(a) - gOrder(b))); continue; }
    for (const f of fs.readdirSync(path.join(W, d)).sort((a, b) => a < b ? -1 : 1)) if (f.endsWith('.js')) files.push(d + '/' + f);
  }
  // Cambridge A2–C2 (docs/specs/cambridge.md): web/cpack/cambridge/<cấp>/t<N>.js → self.CAMBRIDGE
  const CAM = path.join(W, '../cpack/cambridge'); // gói nội dung tải lười (như TOEFL) – ngoài ngân sách byte web/js
  if (fs.existsSync(path.join(CAM, 'rubric.js'))) files.push('../cpack/cambridge/rubric.js');
  if (fs.existsSync(CAM)) for (const l of fs.readdirSync(CAM).filter(x => /^(a2|b1|b2|c1|c2)$/.test(x)).sort()) for (const f of fs.readdirSync(path.join(CAM, l)).filter(x => /^t\d+\.js$/.test(x)).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)))) files.push(`../cpack/cambridge/${l}/${f}`);
  for (const f of files) { try { vm.runInContext(fs.readFileSync(path.join(W, f), 'utf8'), ctx, { filename: f }); } catch (e) { ctx.__errors = [...(ctx.__errors || []), f + ': ' + e.message]; } }
  return ctx;
}
