// Kiểm "sàn chỉ tăng" đúng cách: chỉ chặn khi CHÍNH PR hạ/xoá sàn so với merge-base với origin/main.
// Main nâng sàn sau lúc nhánh tách ra (vd 78.8 → 79) thì PR không đụng file sàn KHÔNG được đỏ oan.
import { execFileSync } from 'node:child_process';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

// Sàn của file budget tại 1 ref ({} nếu file chưa có ở ref; null nếu ref không có/không đọc được).
export function floorsAt(ref, file) {
  try { return JSON.parse(git('show', `${ref}:${file}`)).floors || {}; } catch { return null; }
}

// Sàn tại merge-base(HEAD, origin/main) – mốc để biết PR có TỰ hạ sàn không. null nếu máy không có origin/main.
export function baseFloors(file, remote = process.env.FLOOR_BASE_REF || 'origin/main') {
  try { return floorsAt(git('merge-base', 'HEAD', remote), file); } catch { return null; }
}

// Thuần: PR hạ/xoá sàn nào so với mốc `base`? (cur = sàn trong nhánh). Trả danh sách lỗi.
export function loweredFloors(cur, base) {
  const bad = [];
  for (const [k, v] of Object.entries(base || {})) {
    if (cur[k] == null) bad.push(`xoá sàn ${k} (no-cuts)`);
    else if (cur[k] < v) bad.push(`hạ sàn ${k}: ${cur[k]} < ${v} (no-cuts)`);
  }
  return bad;
}
