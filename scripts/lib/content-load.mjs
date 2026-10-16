// Nạp toàn bộ dữ liệu học (từ vựng, ngữ pháp, đề IELTS/TOEIC/TOEFL) trong web/js vào một ngữ cảnh vm, không cần trình duyệt.
// Dùng: import { loadContent } from './lib/content-load.mjs'; const C = loadContent(); C.IELTS_DATA, C.GRAMMAR, C.TOEIC…
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const W = path.join(ROOT, 'web/js');
export const DATA_DIRS = ['lib', 'grammar', 'toeic', 'toefl', 'readtest', 'listen', 'write', 'speak'];
export function loadContent() {
  const noop = () => {}, ctx = { console: { log: noop, warn: noop, error: noop }, Date, Math, JSON, setTimeout: noop, clearTimeout: noop, localStorage: { getItem: () => null, setItem: noop }, navigator: {} };
  ctx.self = ctx; ctx.window = ctx; ctx.t = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m)) : s);
  vm.createContext(ctx);
  const files = ['data.js', 'lexis.js', 'structures.js', 'readings.js', 'readings-more.js'];
  // grammar: đúng thứ tự app nạp (web/js/app.js) – drills-*.js gắn bài tập vào chương đã có
  const GORDER = ['tenses', 'verbs', 'sentences', 'foundation', 'academic', 'chapters', 'book2', 'drills-a', 'drills-b', 'drills-c', 'check'];
  for (const d of DATA_DIRS) for (const f of fs.readdirSync(path.join(W, d)).sort((a, b) => d === 'grammar' ? (GORDER.indexOf(a.slice(0, -3)) + 1 || 99) - (GORDER.indexOf(b.slice(0, -3)) + 1 || 99) : a < b ? -1 : 1)) if (f.endsWith('.js')) files.push(d + '/' + f);
  for (const f of files) { try { vm.runInContext(fs.readFileSync(path.join(W, f), 'utf8'), ctx, { filename: f }); } catch (e) { ctx.__errors = [...(ctx.__errors || []), f + ': ' + e.message]; } }
  return ctx;
}
