// Cổng YouTube ID của blog: chỉ ID đã kiểm oEmbed (content/blog/youtube.json) mới được nhúng.
// Hồi quy lô B5-R2 (5/11/2026): 9 ID bịa nằm trong 29 bài, blog-check cũ chỉ kiểm độ dài 11 ký tự.
// Dùng: node scripts/test/blog-youtube.mjs
import assert from 'node:assert/strict';
import { checkPosts } from '../blog-check.mjs';
import { loadYoutube } from '../blog-youtube.mjs';
import { loadPosts } from '../lib/blog-content.mjs';

const OK = loadYoutube(), FAKE = ['F380pA5-cEE', 'kO8xHC4j15Y', 'sU3673f-Z-U', 'Fx4mC1K8Z6c', 'M_aC8W5sYHg', 'bGywZ6D_uX4', 'hTms_jR9ZfM', 'h_04bH_R2YI', 'sRFEVUtq9LA'];
for (const [id, v] of Object.entries(OK)) assert.ok(/^[\w-]{11}$/.test(id) && v.title && v.channel && /^\d{4}-\d{2}-\d{2}$/.test(v.checked), `youtube.json: mục ${id} thiếu title/channel/checked`);
for (const id of FAKE) assert.ok(!OK[id], `ID bịa ${id} không được nằm trong sổ`);
let used = 0;
for (const p of loadPosts()) for (const m of (p.body || '').matchAll(/\{\{\s*youtube:\s*([\w-]*)/g)) if (m[1]) { used++; assert.ok(OK[m[1]], `${p.lang}/${p.slug}: YouTube ${m[1]} chưa kiểm`); }
const post = id => ({ file: 'x.md', lang: 'en', slug: 'yt-test', title: 'T', description: 'd', body: `Text\n\n{{youtube: ${id} | Demo}}\n` });
const yt = id => checkPosts([post(id)]).errors.filter(e => e.includes('[youtube]'));
assert.match(yt(FAKE[0]).join('\n'), /chưa kiểm/, 'ID bịa phải bị chặn');
assert.deepEqual(yt(Object.keys(OK)[0]), [], 'ID đã kiểm không bị chặn');
assert.deepEqual(yt(''), [], 'slot trống hợp lệ');
console.log(`✓ blog-youtube: ${Object.keys(OK).length} ID trong sổ, ${used} lần dùng trong bài đều đã kiểm, ID bịa bị chặn`);
