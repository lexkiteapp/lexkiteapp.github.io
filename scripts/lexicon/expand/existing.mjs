#!/usr/bin/env node
// In {từ: CEFR} + {từ#loại: CEFR} của MỌI mục đang có (mọi dòng kho web/js + mục mở rộng đã xuất/chờ soát/hàng duyệt) → đầu vào pick_words.py.
// Khoá trùng = từ#loại (30/10 đa từ loại): kho có duck#n vẫn chọn được duck#v; {từ: CEFR} chỉ để hiệu chỉnh ngưỡng Zipf ↔ CEFR.
import fs from 'fs';
import { loadBrowserIndex } from '../shards.mjs';
import { loadAll, key } from '../lib.mjs';
import { loadExpand, doneWords } from './lib.mjs';
const { INDEX } = loadBrowserIndex(), o = {};
for (const [k, e] of Object.entries(INDEX)) o[k] = e.level || '';
for (const { row } of loadAll()) { const k = key(row); if (!(k in o)) o[k] = row[8] || ''; }
for (const { e } of loadExpand()) { o[e.w] ??= e.level; o[e.w + '#' + e.pos] = e.level; }
for (const k of doneWords()) { if (!(k in o)) o[k] = ''; o[k.split('#')[0]] ??= ''; }
fs.writeFileSync(process.argv[2], JSON.stringify(o));
const wp = Object.keys(o).filter(k => k.includes('#')).length;
console.log(`existing: ${Object.keys(o).length - wp} từ · ${wp} từ#loại`);
