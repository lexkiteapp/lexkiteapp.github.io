#!/usr/bin/env node
// Xem/ghi tệp khung thử: node scripts/build-path-skel.mjs <thư mục ra>   (mặc định không ghi, chỉ in số tệp). Bản phát hành: scripts/app-loader.mjs tự ghi vào dist/js/path-skel.
import fs from 'node:fs'; import path from 'node:path'; import { buildSkeletons } from './lib/path-skel.mjs';
const out = process.argv[2], files = buildSkeletons();
if (out) { fs.mkdirSync(out, { recursive: true }); for (const [n, c] of Object.entries(files)) fs.writeFileSync(path.join(out, n), c); }
console.log(`path-skel: ${Object.keys(files).length} tệp, ${Object.values(files).reduce((a, c) => a + c.length, 0)} B${out ? ' → ' + out : ''}`);
