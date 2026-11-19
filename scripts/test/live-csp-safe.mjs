// Mã chạy trên bản LIVE (CSP không 'unsafe-eval') không được dùng page.waitForFunction: WebKit đánh giá hàm bằng eval → EvalError (17/11: post-deploy-check đỏ 3/3 ở rig-live webkit).
import fs from 'node:fs';
const FILES = ['scripts/test/rig-live.mjs', 'scripts/test/live-lesson-lang.mjs'];
const bad = FILES.filter(f => /\.waitForFunction\(/.test(fs.readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '')));
if (bad.length) { console.error('✗ waitForFunction trên bản live (CSP chặn eval ở WebKit): ' + bad.join(', ') + ' – dùng vòng page.evaluate'); process.exit(1); }
console.log('live-csp-safe OK');
