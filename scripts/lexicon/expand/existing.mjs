#!/usr/bin/env node
// In {từ: CEFR} của MỌI mục đang có (INDEX trình duyệt + mục mở rộng đã xuất/chờ soát) → đầu vào select.py (không chọn trùng).
import fs from 'fs';
import { loadBrowserIndex } from '../shards.mjs';
import { loadExpand, doneWords } from './lib.mjs';
const { INDEX } = loadBrowserIndex(), o = {};
for (const [k, e] of Object.entries(INDEX)) o[k] = e.level || '';
for (const { e } of loadExpand()) o[e.w] = e.level;
for (const w of doneWords()) if (!(w in o)) o[w] = '';
fs.writeFileSync(process.argv[2], JSON.stringify(o));
console.log(`existing: ${Object.keys(o).length} từ`);
