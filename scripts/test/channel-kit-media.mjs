// Ảnh bộ kênh social ở kho media ngoài (26/11, size-guard): chỉ mục media-index.json + URL + --check không cần ảnh trên đĩa. Thuần Node, không mạng.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { imgSize, urlOf, buildIndex, localImages, readIndex, sha256, INDEX, OUT } from '../lib/channel-kit-media.mjs';
import { check, ASSETS } from '../social/build-channel-kit.mjs';
import { loadRepos, pickRepo } from '../lib/media-repos.mjs';
let n = 0, bad = 0; const ok = (c, m) => { n++; if (!c) { bad++; console.error('✗ ' + m); } };
// 1) kích thước PNG/JPEG
const png = Buffer.alloc(33); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png); png.writeUInt32BE(1640, 16); png.writeUInt32BE(624, 20);
const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 11, 8, 0x05, 0xa0, 0x0a, 0x00, 1, 1, 0x11, 0]); // SOF0: 1440 cao × 2560 rộng
ok(JSON.stringify(imgSize(png)) === '{"w":1640,"h":624}', 'PNG: đọc w×h'); ok(JSON.stringify(imgSize(jpg)) === '{"w":2560,"h":1440}', 'JPEG: đọc w×h'); ok(imgSize(Buffer.from('xx')) === null, 'không phải ảnh → null');
// 2) URL khớp nơi push.mjs đẩy (cùng pickRepo, tiền tố channel-kit/)
const cfg = loadRepos(), r = pickRepo('channel-kit/facebook/x.png', 'img', cfg);
ok(urlOf('facebook/x.png', cfg) === r.pages + 'channel-kit/facebook/x.png' && /^https:\/\/lexkiteapp\.github\.io\/lexkite-media-\d\/channel-kit\//.test(urlOf('a.png', cfg)), 'URL = Pages kho img + channel-kit/<rel> (Worker media chỉ phục vụ /vimg/ cho m4)');
// 3) chỉ mục: ảnh trên đĩa cập nhật, mục chỉ-ở-CDN giữ nguyên, stitch-ref bị bỏ
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ckm-')); fs.mkdirSync(path.join(tmp, 'facebook')); fs.mkdirSync(path.join(tmp, 'stitch-ref'));
fs.writeFileSync(path.join(tmp, 'facebook/a.png'), png); fs.writeFileSync(path.join(tmp, 'stitch-ref/b.jpg'), jpg); fs.writeFileSync(path.join(tmp, 'README.md'), 'x');
ok(JSON.stringify(localImages(tmp)) === '["facebook/a.png"]', 'localImages: chỉ ảnh ngoài stitch-ref');
const prev = { files: { 'youtube/i18n/old.jpg': { bytes: 5, sha256: 'z', w: 2560, h: 1440, url: 'u' } } }, ix = buildIndex({ dir: tmp, prev, cfg });
ok(ix.files['youtube/i18n/old.jpg'].bytes === 5 && ix.files['facebook/a.png'].sha256 === sha256(png) && ix.files['facebook/a.png'].w === 1640, 'buildIndex: giữ mục cũ chỉ-ở-CDN, thêm mục mới');
// 4) --check đạt khi KHÔNG có ảnh trên đĩa nhưng có media-index.json; đỏ khi chỉ mục thiếu/sai
const real = readIndex(INDEX), emptyOut = fs.mkdtempSync(path.join(os.tmpdir(), 'ckm2-')); fs.copyFileSync(path.join(OUT, 'manifest.json'), path.join(emptyOut, 'manifest.json'));
ok(Object.keys(real.files).length >= 1, 'media-index.json có mục');
const e0 = check(emptyOut, real); ok(e0.length === 0, 'check: không ảnh trên đĩa + có chỉ mục → đạt' + (e0.length ? ': ' + e0.slice(0, 2).join(' | ') : ''));
const fewer = { files: { ...real.files } }; delete fewer.files[ASSETS[0].file]; ok(check(emptyOut, fewer).some(x => x.includes('thiếu')), 'check: thiếu ảnh ở cả đĩa lẫn chỉ mục → đỏ');
const wrong = { files: { ...real.files, [ASSETS[0].file]: { ...real.files[ASSETS[0].file], w: 1 } } }; ok(check(emptyOut, wrong).some(x => x.includes('≠')), 'check: kích thước trong chỉ mục sai → đỏ');
ok(Object.values(real.files).every(f => /^https:\/\//.test(f.url) && f.bytes > 0 && f.sha256.length === 64), 'mọi mục chỉ mục có url/bytes/sha256');
if (bad) { console.error(`channel-kit-media: ${bad}/${n} trượt`); process.exit(1); }
console.log(`✓ channel-kit-media: ${n} kiểm tra đạt`);
