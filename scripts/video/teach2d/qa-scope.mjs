// Phạm vi dịch ngược online của native-qa (16/11, điều phối): gtx (Google Translate miễn phí) đổi bản dịch giữa các lần chạy → hàng nằm sát ngưỡng lúc đạt lúc trượt
// (t2_l1_ja_hard: sim hook 0,20 so với ngưỡng 0,2 → đỏ teach-video preqc trên main và mọi PR chạm scripts/video/teach2d, kể cả PR không đụng hàng đó).
// → TRÊN PR chỉ dịch ngược các hàng PR thêm/sửa (so với base); kiểm TĨNH (rò tiếng Việt, từ cấm, độ dài, hashtag, giữ câu tiếng Anh…) vẫn chạy MỌI hàng; main/lịch đêm chạy đủ.
import { execFileSync } from 'node:child_process';

/** Hàm thuần: oldRows/newRows = mảng hàng {id,…}. Trả Set id hàng mới hoặc nội dung khác bản cũ. oldRows = null (không đọc được base) → null (= kiểm hết, không bỏ sót). */
export function changedIds(oldRows, newRows) {
  if (!Array.isArray(oldRows)) return null;
  const old = new Map(oldRows.map(r => [r.id, JSON.stringify(r)])), out = new Set();
  for (const r of newRows) if (old.get(r.id) !== JSON.stringify(r)) out.add(r.id);
  return out;
}

/** Đọc các hàng của 1 tệp ở bản `ref` qua git ([] nếu tệp chưa có ở ref → mọi hàng là mới; lỗi git → undefined = không biết). */
export function rowsAt(ref, file, git = (a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] })) {
  try { return JSON.parse(git(['show', `${ref}:${file}`])).rows; }
  catch (e) { return /exists on disk, but not in|does not exist in/i.test(String(e.stderr || e.message)) ? [] : undefined; }
}
