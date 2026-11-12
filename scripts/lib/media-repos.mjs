// Kho media ngoài repo chính (infra/media-repos.json): chọn kho cho tệp MỚI = round-robin theo hash trên các kho state=open đúng kind.
// Tệp đã đặt không bao giờ dời; Worker lexkite-audio dò lần lượt mọi kho kind audio nên URL không cần tiền tố kho.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; };
export const loadRepos = (file = path.join(ROOT, 'infra/media-repos.json')) => JSON.parse(fs.readFileSync(file, 'utf8'));
export const openRepos = (cfg, kind) => cfg.repos.filter(r => r.state === 'open' && (!kind || (r.kinds || []).includes(kind)));
export function pickRepo(relPath, kind = 'audio', cfg = loadRepos()) {
  const open = openRepos(cfg, kind);
  if (!open.length) throw new Error(`media-repos: không còn kho state=open cho kind=${kind} – mở kho planned (docs/STORAGE.md §Mở kho mới)`);
  return open[fnv(relPath) % open.length];
}
// Kho đã tạo (open + full) có kind – thứ tự dò cho dự phòng/kiểm tra
export const servingRepos = (cfg, kind) => cfg.repos.filter(r => r.state !== 'planned' && (!kind || (r.kinds || []).includes(kind)));
