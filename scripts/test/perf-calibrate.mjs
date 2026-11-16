// Test hàm thuần của lib/perf-calibrate.mjs: ngưỡng KHÔNG đổi, chỉ chỉnh hệ số giảm tốc khi runner chậm rõ rệt.
import { calibratedRate, REF_MS, SLACK, MIN_RATE } from './lib/perf-calibrate.mjs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗ ' + m); } else console.log('✓ ' + m); };
ok(calibratedRate(4, REF_MS).rate === 4 && !calibratedRate(4, REF_MS).scaled, 'runner đúng chuẩn → giữ 4×');
ok(calibratedRate(4, REF_MS * 0.7).rate === 4, 'runner NHANH hơn chuẩn → KHÔNG siết thêm (vẫn 4×)');
ok(calibratedRate(4, REF_MS * SLACK).rate === 4, 'chậm đúng mức dao động bình thường → giữ 4×');
const slow = calibratedRate(4, REF_MS * 1.5); ok(slow.scaled && Math.abs(slow.rate - 4 / 1.5) < 0.01, `runner chậm 1,5× → giảm hệ số còn ${slow.rate}×`);
ok(calibratedRate(4, REF_MS * 10).rate === MIN_RATE, 'runner cực chậm → không dưới sàn ' + MIN_RATE + '×');
ok(calibratedRate(4, NaN).rate === 4 && calibratedRate(4, 0).rate === 4 && calibratedRate(4, undefined).rate === 4, 'số đo hỏng → giữ nguyên hệ số, không đoán');
ok(calibratedRate(6, REF_MS * 2).rate === 3, 'hệ số danh định 6× chia theo tỉ lệ');
if (bad) { console.error(`✗ perf-calibrate: ${bad} lỗi`); process.exit(1); } console.log('✓ perf-calibrate: đạt');
