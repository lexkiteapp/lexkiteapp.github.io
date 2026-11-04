// driver.mjs (iOS E2E, chỉ chạy trên macOS CI): sau MỖI launch() phải đặt lại đồng hồ 45 s. launch() chặn tới khi simctl trả về; quên đặt lại thì
// runner bận sẽ báo treo giả, mở lại app và giết nó giữa bước đang chạy → đỏ ngẫu nhiên "authui – stall" (run 41758412221).
import fs from 'node:fs';
import assert from 'node:assert';
const src = fs.readFileSync('scripts/test/ios-e2e/driver.mjs', 'utf8');
const calls = [...src.matchAll(/^\s*launch\(\);(.*)$/gm)];
assert.ok(calls.length >= 2, 'tìm thấy các lệnh launch() của driver');
for (const m of calls) assert.match(m[1], /lastEv = Date\.now\(\)/, 'launch() thiếu đặt lại lastEv: ' + m[0].trim());
assert.ok(src.indexOf('Date.now() - lastEv > 45000') > src.indexOf('launch(); lastEv = Date.now();'), 'đồng hồ được đặt lại trước vòng theo dõi');
console.log(`✓ ios-driver-watchdog: ${calls.length} lệnh launch() đều đặt lại đồng hồ`);
