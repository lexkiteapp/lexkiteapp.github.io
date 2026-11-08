#!/usr/bin/env node
// Khoá ngân sách JS người học (issue #788): tệp > 150 KB mới KHÔNG được nằm trong web/js (tính thẳng vào totalJs) → đặt ở web/cpack (tải lười theo gói, scripts/build-cpack.mjs).
// Danh sách hiện có (big-data.allow.json) chỉ được giảm: tệp đã dời/nhỏ lại mà còn trong danh sách → đỏ, để mốc luôn khớp thực tế.
import fs from 'node:fs';
import path from 'node:path';
const A = JSON.parse(fs.readFileSync('scripts/test/big-data.allow.json', 'utf8')), max = A.maxKB * 1024, allow = new Set(A.files);
const big = [], walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name);
  if (e.isDirectory()) { if (p !== 'web/js/i18n') walk(p); } else if (/\.(js|json)$/.test(e.name) && !/^admin/.test(e.name) && fs.statSync(p).size > max) big.push(p); } };
walk('web/js');
const errs = [];
for (const f of big) if (!allow.has(f)) errs.push(`${f} (${Math.round(fs.statSync(f).size / 1024)} KB) > ${A.maxKB} KB trong web/js – dời sang web/cpack/ và thêm 'cpack/…' vào BUNDLES (app.js)`);
for (const f of allow) if (!big.includes(f)) errs.push(`${f} đã dời/nhỏ lại – xoá khỏi scripts/test/big-data.allow.json (danh sách chỉ được giảm)`);
if (errs.length) { console.error('✗ big-data:\n  - ' + errs.join('\n  - ')); process.exit(1); }
console.log(`✓ big-data: ${big.length} tệp > ${A.maxKB} KB còn trong web/js (chỉ giảm), không tệp mới`);
