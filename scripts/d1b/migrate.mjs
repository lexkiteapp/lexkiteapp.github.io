// Sao các bảng nội bộ (drive*) từ D1 chính sang D1 nội bộ (tài khoản Cloudflare thứ hai) qua op d1b_copy (≤ 100 dòng/lượt, INSERT OR REPLACE – chạy lại được),
// rồi đối chiếu số dòng (d1b_counts). Chạy bởi d1b-migrate.yml qua điều phối việc nền. Cờ D1B: 'dual' (ghi cả hai) → đối chiếu ≥ 1 ngày → 'on' (chỉ nội bộ).
// 412 = chưa cấu hình D1B_ACCOUNT_ID/D1B_TOKEN → bỏ qua; 409 = đã chuyển hẳn → xong; 429 = cầu dao D1 → dừng, mai chạy tiếp (không thử lại).
import fs from 'fs';
import { driveApi } from '../video/library.mjs';

const TABLES = [['drives', 'id'], ['drive_files', 'id'], ['drive_audit', 'id'], ['drive_folders', '_offset'], ['drive_refs', 'rowid'], ['drive_alerts', 'kind'], ['drive_meta', 'k'], ['drive_nonce', 'n']];
const sum = m => process.env.GITHUB_STEP_SUMMARY && fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, m + '\n');
const stop = (code, msg, exit = 0) => { console.log(msg); sum('### d1b-migrate\n' + msg); process.exit(exit); };
let copied = 0, calls = 0;
try {
  const c0 = await driveApi('d1b_counts', {});
  if (c0.match) stop(0, `✓ D1 nội bộ đã khớp D1 chính (${Object.entries(c0.counts).map(([t, v]) => t + '=' + v.main).join(', ')}) – không cần sao`);
  // 26/10: chỉ sao bảng LỆCH số dòng (trước: lệch 1 bảng là sao lại cả 8 bảng ≈ 33k dòng × chỉ mục mỗi ngày → vượt 100k dòng ghi/ngày của D1 nội bộ).
  for (const [t, k] of TABLES) {
    const c = c0.counts && c0.counts[t];
    if (c && c.main === c.internal) { console.log(`· ${t}: khớp (${c.main}) – bỏ qua`); continue; }
    let after = ['kind', 'k', 'n'].includes(k) ? '' : 0;
    for (;;) {
      const r = await driveApi('d1b_copy', { table: t, after, limit: 100 }); calls++; copied += r.copied;
      if (r.done || calls > 5000) break; after = r.last;
    }
    console.log(`· ${t}: xong`);
  }
  const c1 = await driveApi('d1b_counts', {});
  stop(0, `${c1.match ? '✓' : '⚠'} sao ${copied} dòng / ${calls} lượt – ${c1.match ? 'số dòng KHỚP' : 'chưa khớp (bình thường khi đang ghi đôi; kiểm lại hôm sau): ' + Object.entries(c1.counts).filter(([, v]) => v.main !== v.internal).map(([t, v]) => `${t} ${v.main}/${v.internal}`).join(', ')}`);
} catch (e) {
  const code = String(e.code || e.message);
  if (/412|not-configured/.test(code)) stop(0, '⏭ chưa cấu hình D1B_ACCOUNT_ID / D1B_TOKEN trên Pages → chưa sao (xem docs/JOBS.md, lệnh cho chủ)');
  if (/409|cutover/.test(code)) stop(0, '✓ đã chuyển hẳn sang D1 nội bộ (D1B=1) – không sao nữa');
  if (/quota-guard|d1-budget/.test(code)) stop(0, '⏸ cầu dao D1 (429): dừng, mai chạy tiếp');
  stop(1, '✗ ' + code, 1);
}
