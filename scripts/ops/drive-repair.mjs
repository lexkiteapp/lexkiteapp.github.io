// Chép bù mọi file thiếu bản sao / chỉ còn 1 bản trên Kho Drive (op `repair` = chép phía máy chủ giữa các Drive, KHÔNG qua byte của CI), rồi `health` để cờ
// "N file chỉ còn 1 bản sao" tự tắt. Trước 1/11 chỉ shorts-archive gọi repair (≤ 100 file/ngày, chỉ khi drive-shorts chạy) → file ngoài shorts kẹt 1 bản mãi.
//   node scripts/ops/drive-repair.mjs [--rounds 40] [--files 5]
import { driveApi } from '../video/library.mjs';
import { arg, summary, QUOTA } from './lib.mjs';
const A = process.argv.slice(2), ROUNDS = +arg(A, 'rounds', 40), FILES = +arg(A, 'files', 5);
let done = 0, failed = 0, left = null;
try {
  for (let i = 0; i < ROUNDS; i++) {
    const r = await driveApi('repair', { max_files: FILES }); done += (r.done || []).length; failed += (r.failed || []).length; left = r.remaining ?? 0;
    if (!left || !(r.done || []).length) break;
    await new Promise(res => setTimeout(res, 1500));
  }
  const h = await driveApi('health', {});
  summary(`### drive-repair\n- chép bù ${done} file · lỗi ${failed} · còn thiếu ${left ?? 0}\n- sau health: thiếu ${h.under_replicated} · chỉ 1 bản ${h.single} · chỉ còn trên Drive mất kết nối ${h.lost_only}`);
  process.exit(h.single > 0 && failed > 0 ? 1 : 0);
} catch (e) {
  if (QUOTA.test(String(e.code))) { summary('⏸ drive-repair: cầu dao D1 – mai chạy tiếp'); process.exit(0); }
  console.error('✗ drive-repair: ' + e.message); process.exit(1);
}
