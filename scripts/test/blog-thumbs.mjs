// Thẻ danh sách blog: chọn ảnh thật trong bài (ngang → dọc/vuông), thiếu ảnh riêng chưa render → bài báo; đếm bài còn rơi về bìa chung.
// Dùng: node scripts/test/blog-thumbs.mjs
import assert from 'node:assert/strict';
import { pickThumb, mediaId } from '../lib/blog-images.mjs';
import { loadPosts, loadMedia, ROOT, isLive } from '../lib/blog-content.mjs';
import { checkPosts } from '../blog-check.mjs';

const M = { a: { w: 1440, h: 900 }, tall: { w: 1440, h: 2648 }, sq: { w: 1440, h: 1276 } }, im = (id, real = id) => ({ id, real, alt: '' });
assert.equal(pickThumb([im('tall'), im('a')], M).real, 'a', 'ảnh ngang thắng ảnh dọc');
assert.equal(pickThumb([im('tall')], M).real, 'tall', 'chỉ có ảnh dọc → vẫn dùng (CSS cắt 16:10)');
assert.equal(pickThumb([im('sq')], M).real, 'sq', 'ảnh vuông dùng được');
assert.equal(pickThumb([im('@s1', 'x--s1')], M), null, 'ảnh riêng chưa render → không chọn');
assert.equal(pickThumb([im('@s1', 'x--s1'), im('tall')], M).real, 'tall', 'ảnh riêng thiếu sổ → rơi sang ảnh khác');
assert.equal(pickThumb([im('a'), im('sq')], M, { used: new Set(['a']) }).real, 'sq', 'tránh ảnh đã dùng trong lưới khi còn lựa chọn');
assert.equal(pickThumb([im('a')], M, { used: new Set(['a']) }).real, 'a', 'hết lựa chọn → chấp nhận lặp');
assert.equal(pickThumb([im('@s1', 'ok--s1'), im('a')], { ...M, 'ok--s1': { w: 1440, h: 900 } }).real, 'ok--s1', 'ảnh riêng ngang ưu tiên ảnh chung');
assert.equal(pickThumb([], M), null);

// Bài thật: đếm thẻ còn dùng bìa chung
const { items } = loadMedia(ROOT), IMG_RE = /^!\[([^\]]*)\]\(media:(@?[\w-]+)/gm, now = Date.now();
const posts = loadPosts().filter(p => p.status !== 'draft' && isLive(p, now));
const bare = [], missing = [];
for (const p of posts) {
  const imgs = [...(p.body || '').matchAll(IMG_RE)].map(m => ({ id: m[2], real: m[2].startsWith('@') ? mediaId(p, m[2].slice(1)) : m[2] }));
  if (!pickThumb(imgs, items)) (imgs.length ? missing : bare).push(`${p.lang}/${p.slug}`);
}
console.log(`· ${posts.length} bài đã đăng · bìa chung vì không có ảnh nào: ${bare.length} · vì ảnh riêng chưa render: ${missing.length}`);
if (missing.length) console.log('  chưa render (chạy blog-images backfill):', missing.slice(0, 10).join(', '), missing.length > 10 ? '…' : '');
// Guard blog-check: media:@ thiếu sổ phải ra cảnh báo [media-missing]; số cảnh báo = số bài chưa render
const { warnings } = checkPosts(posts);
const w = warnings.filter(x => x.includes('[media-missing]')).length;
console.log(`· cảnh báo media-missing: ${w}`);
assert.ok(missing.length === 0 || w >= missing.length, 'bài thiếu ảnh riêng phải bị cảnh báo');
console.log('✓ blog-thumbs');
