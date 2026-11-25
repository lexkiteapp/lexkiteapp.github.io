// Hồi quy bộ đo (quality-sweep #53): tác vụ dài của route trước (axe) không tính cho route sau. Node thuần, kiểm nguồn.
import fs from 'fs';
const s = fs.readFileSync('scripts/quality/sweep.mjs', 'utf8');
const ok = /e\.startTime < window\.__navAt\) continue;[^]*window\.__probeAt != null && e\.startTime >= window\.__probeAt/.test(s) && /longtask/.test(s) && /lt > 200/.test(s);
console.log(ok ? '✓ sweep: tác vụ dài trước mốc điều hướng bị bỏ; ngưỡng 200 ms giữ nguyên' : '✗ sweep: thiếu lọc mốc điều hướng hoặc ngưỡng 200 ms'); process.exit(ok ? 0 : 1);
