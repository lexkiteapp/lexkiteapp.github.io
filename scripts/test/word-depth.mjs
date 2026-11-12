// Thước đo độ dày trang từ (scripts/lib/word-depth.mjs – docs/specs/seo-words-depth.md §4): khối riêng, trừ WordNet/FAQ/tiêu đề, đếm chữ CJK/Thái.
import assert from 'node:assert/strict';
import { measure, deep, countWords, DEPTH_MIN } from '../lib/word-depth.mjs';
const sec = (d, h, body) => `<section aria-labelledby="h" data-d="${d}"><h2 id="h">${h}</h2>${body}</section>`;
const words = n => Array.from({ length: n }, (_, i) => 'w' + i).join(' ');
// WordNet + FAQ không tính khối/chữ; h2 không tính chữ; section không data-d (công cụ, blog, liên quan) không tính
const html = sec('mean', 'Heading words here', `<p>${words(10)}</p>`) + sec('wn', 'x', words(500)) + sec('faq', 'x', words(500)) + `<section aria-labelledby="t"><h2 id="t">x</h2>${words(300)}</section>`;
assert.deepEqual(measure(html), { blocks: 1, words: 10, kinds: ['mean'] });
// đủ ngưỡng ↔ deep()
const ok = Array.from({ length: DEPTH_MIN.blocks }, (_, i) => sec('b' + i, 'h', words(Math.ceil(DEPTH_MIN.words / DEPTH_MIN.blocks)))).join('');
assert.ok(deep(measure(ok)));
assert.ok(!deep(measure(ok.replace(/<section[^>]*data-d="b0"[\s\S]*?<\/section>/, ''))), 'thiếu 1 khối phải trượt');
// chữ không cách (ja/zh/th/ko) tính 1 chữ / 2 ký tự; thẻ + thực thể HTML không tính
assert.equal(countWords('意味は何ですか'), 4);
assert.equal(countWords('detect the problem'), 3);
assert.equal(measure(sec('x', 'h', '<b>a&amp;b</b> c')).words, 3);
console.log('✓ word-depth: khối/chữ riêng, trừ WordNet/FAQ/tiêu đề, CJK/Thái, ngưỡng', DEPTH_MIN);
