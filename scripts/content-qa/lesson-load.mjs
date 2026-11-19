// Nạp dữ liệu web/cpack/*.js (script trình duyệt) trong vm để soát/lấy mẫu offline. Chỉ đọc, không chạy mạng.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
export function loadScripts(files, root = process.cwd()) {
  const g = { console: { log() {}, warn() {}, error() {} } };
  g.self = g.window = g.globalThis = g;
  vm.createContext(g);
  for (const f of files) {
    try { vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), g, { filename: f }); } catch (e) { g.__err = (g.__err || []).concat(f + ': ' + e.message); }
  }
  return g;
}
