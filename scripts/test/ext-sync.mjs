// extension/app phải trùng khớp bản dựng từ web/ (bash scripts/build-extension.sh). Sửa web mà quên build add-on → đỏ.
// Kiểm thật: dựng vào thư mục tạm bằng chính build-extension.sh --check rồi so từng byte với bản đã commit.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const r = spawnSync('bash', [path.join(ROOT, 'scripts/build-extension.sh'), '--check'], { encoding: 'utf8' });
process.stdout.write(r.stdout || ''); process.stderr.write(r.stderr || '');
if (r.status !== 0) { console.error('✗ ext-sync: extension/app lệch web/'); process.exit(1); }
console.log('✓ ext-sync: extension/app khớp web/');
