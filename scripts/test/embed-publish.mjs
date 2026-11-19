// Phần thuần của embed-publish (không mạng, không ffmpeg): từ khoá, mục embed hợp lệ, gộp, đo phủ.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { wordsOf, idOf, embedEntry, mergeEmbeds, coverage } from '../lib/embed-publish.mjs';
const ep = JSON.parse(fs.readFileSync('content/video/teach2d/eps/t2_l1_ar_ajob.json', 'utf8'));
assert.deepEqual(wordsOf(ep).includes('teacher'), true);
assert.equal(idOf('t2_l1_ar_ajob'), 't2e_l1_ar_ajob');
const names = { mp4: 'wide-aaaaaaaa.mp4', poster: 'wide.poster-bbbbbbbb.jpg', vtt: 'wide.en-cccccccc.vtt' };
const e = embedEntry(ep, { score: 100 }, names, 24.04);
const m = mergeEmbeds([], [e]); assert.deepEqual(m.errors, []);
assert.equal(mergeEmbeds(m.embeds, [{ ...e, title: 'x' }]).embeds.length, 1, 'cùng id → thay, không nhân đôi');
assert.ok(mergeEmbeds([], [{ ...e, renditions: { wide: { ...e.renditions.wide, src: 'https://evil.example/x.mp4' } } }]).errors.length, 'src ngoài CDN bị chặn');
assert.deepEqual(coverage([{ words: ['teacher'] }, { words: ['zebra'] }], m.embeds), { lessons: 2, covered: 1, pct: 50 });
console.log('✓ embed-publish');
