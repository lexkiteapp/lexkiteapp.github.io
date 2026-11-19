#!/usr/bin/env node
// Tạo cặp khóa ký OTA MỘT LẦN (docs/OTA.md). Khóa riêng ghi ra tệp (chmod 600, ngoài repo), khóa công khai ghi thẳng vào web/js/ota-key.js.
// Chạy: node scripts/ota/keygen.mjs [--out ~/.config/lexkite/ota-signing.b64]   (không ghi đè khóa đã có)
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { genKeys } from './lib.mjs';
const i = process.argv.indexOf('--out'), out = (i > 0 ? process.argv[i + 1] : '').replace(/^~/, os.homedir()) || path.join(os.homedir(), '.config/lexkite/ota-signing.b64');
if (fs.existsSync(out)) { console.error(`✗ ${out} đã có – giữ nguyên (đổi khóa = mọi app cũ ngừng nhận OTA). Muốn đổi: xóa tệp tay rồi chạy lại.`); process.exit(1); }
const { privatePem, publicB64 } = genKeys();
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.from(privatePem).toString('base64') + '\n', { mode: 0o600 });
const keyJs = 'web/js/ota-key.js', src = fs.readFileSync(keyJs, 'utf8');
fs.writeFileSync(keyJs, src.replace(/self\.LK_OTA_KEY = '[^']*';/, `self.LK_OTA_KEY = '${publicB64}';`));
console.log(`✓ Khóa riêng (base64): ${out}\n✓ Khóa công khai đã ghi vào ${keyJs}

Việc của chủ (2 bước):
  1) Đặt secret cho CI (đọc từ tệp, không dán vào chat):  gh secret set OTA_SIGNING_KEY --repo lexkiteapp/lexkiteapp.github.io < ${out}
  2) Đưa ${keyJs} lên main như mọi thay đổi khác, rồi build app gốc mới (android.yml / ios.yml) để khóa công khai nằm trong app.
Sao lưu tệp khóa riêng ở nơi an toàn. Khóa riêng KHÔNG bao giờ vào repo.`);
