// Đặt cảnh báo Quản trị › Kho Drive từ NGOÀI script chính (bước `if: failure()` của workflow): hết giờ/huỷ/lỗi checkout/lỗi hạ tầng không chạy tới alert() trong script → trước đây giám sát mù.
//   node scripts/ops/flag.mjs <backup_code|backup_d1|backup_rel> "<thông điệp>"
import { alert } from './lib.mjs';
const [kind, ...msg] = process.argv.slice(2);
if (!/^backup_(code|d1|rel)$/.test(kind || '')) { console.error('kind không hợp lệ'); process.exit(2); }
await alert(kind, false, msg.join(' ') || kind + ': workflow lỗi');
