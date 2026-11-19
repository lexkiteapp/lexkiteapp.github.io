#!/usr/bin/env node
// Công cụ kiểm tra và giải mã thủy ấn tàng hình (Zero-width watermark) của Lexkite.
// Dùng: node scripts/decode-watermark.mjs "<văn bản nghi ngờ bị cào>"
// Hoặc: cat file_nghi_ngo.html | node scripts/decode-watermark.mjs
// Hoặc: node scripts/decode-watermark.mjs --file <đường-dẫn-file>

import fs from 'node:fs';
import { decodeWatermark } from '../content/protection/watermark.mjs';

const args = process.argv.slice(2);
let text = '';

if (args.includes('--file') || args.includes('-f')) {
  const fIdx = args.findIndex(a => a === '--file' || a === '-f');
  const filePath = args[fIdx + 1];
  if (!filePath || !fs.existsSync(filePath)) {
    console.error(`✗ Lỗi: Không tìm thấy file "${filePath}"`);
    process.exit(1);
  }
  text = fs.readFileSync(filePath, 'utf8');
} else if (args.length > 0 && !args[0].startsWith('-')) {
  text = args.join(' ');
} else if (!process.stdin.isTTY) {
  text = fs.readFileSync(0, 'utf8');
}

if (!text) {
  console.log('Dùng: node scripts/decode-watermark.mjs "<văn bản>" hoặc --file <đường_dẫn>');
  process.exit(0);
}

const payload = decodeWatermark(text);
if (payload) {
  console.log('✓ TÌM THẤY CHỮ KÝ BẢN QUYỀN LEXKITE!');
  console.log(`  Payload: "${payload}"`);
  const parts = payload.split(':');
  if (parts.length >= 3 && parts[0] === 'LK') {
    console.log(`  - Định danh bài: ${parts[1]}`);
    console.log(`  - Ngày phát hành: ${parts[2]}`);
    console.log('  -> Đây là bằng chứng xác thực văn bản gốc thuộc sở hữu trí tuệ của Lexkite.');
  }
  process.exit(0);
} else {
  console.log('✗ Không tìm thấy chữ ký bản quyền tàng hình trong văn bản đã cung cấp.');
  process.exit(1);
}
