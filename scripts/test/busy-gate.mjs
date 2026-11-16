// busy-gate: job video nặng dời khi hàng CI đông (chủ 10/11). Thuần, không gọi mạng.
import fs from 'node:fs';
import { queuedRecent, isBusy, QUEUE_MAX } from '../ci/busy-gate.mjs';
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
const now = Date.parse('2026-11-10T12:00:00Z'), at = h => new Date(now - h * 3600e3).toISOString();
const r = (h, extra = {}) => ({ id: h, status: 'queued', created_at: at(h), path: '.github/workflows/x.yml', ...extra });
const runs = [...Array.from({ length: 19 }, () => r(0.5)), r(1.9), r(3), r(0.2, { status: 'in_progress' })];
ok(queuedRecent(runs, now) === 20, 'chỉ đếm lượt queued tạo ≤ 2 giờ (lượt 3 giờ trước, lượt đang chạy không tính)');
ok(QUEUE_MAX === 20 && isBusy(20) && !isBusy(19), 'ngưỡng: ≥ 20 job chờ → dời');
const wf = fs.readFileSync('.github/workflows/video-auto.yml', 'utf8');
ok(/busy-gate\.mjs/.test(wf) && /steps\.ci\.outputs\.busy == '0'/.test(wf), 'video-auto gọi busy-gate và chỉ tạo job khi hàng CI vắng');
ok((wf.match(/- cron:/g) || []).length >= 2 && /recent/.test(wf), 'có lượt cron thấp điểm dự phòng, chỉ chạy khi hôm nay chưa tạo video');
if (fail) { console.log(`✗ busy-gate: ${fail} lỗi`); process.exit(1); }
console.log('busy-gate: ok');
