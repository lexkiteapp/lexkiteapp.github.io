#!/usr/bin/env node
// Ảnh bộ kênh social ↔ kho media ngoài (docs/STORAGE.md, infra/media-repos.json). Dùng trong workflow social-channel-kit (CI), không chạy nặng ở máy cá nhân.
//   node scripts/social/channel-kit-media.mjs index            ghi brand/social/channel-kit/media-index.json từ ảnh đang có trên đĩa (giữ mục chỉ-ở-CDN)
//   node scripts/social/channel-kit-media.mjs stage [dir]      chép ảnh vào <dir>/channel-kit/<rel> (mặc định .media-out) để scripts/media/push.mjs --kind img đẩy
//   node scripts/social/channel-kit-media.mjs verify [--minutes 30]   mọi URL trong chỉ mục phải trả 200 đúng số byte (chờ Pages dựng ≤ 30 phút); thoát 1 nếu còn thiếu/sai
import fs from 'node:fs';
import path from 'node:path';
import { OUT, KIT_PREFIX, localImages, buildIndex, writeIndex, readIndex } from '../lib/channel-kit-media.mjs';
const [cmd, ...rest] = process.argv.slice(2), sleep = ms => new Promise(r => setTimeout(r, ms));
if (cmd === 'index') { const idx = buildIndex(); writeIndex(idx); console.log(`channel-kit-media: chỉ mục ${Object.keys(idx.files).length} ảnh`); }
else if (cmd === 'stage') {
  const dir = rest[0] || '.media-out', imgs = localImages();
  for (const rel of imgs) { const to = path.join(dir, KIT_PREFIX + rel); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(path.join(OUT, rel), to); }
  console.log(`channel-kit-media: chép ${imgs.length} ảnh → ${dir}/${KIT_PREFIX}`);
} else if (cmd === 'verify') {
  const mi = rest.indexOf('--minutes'), deadline = Date.now() + (mi >= 0 ? +rest[mi + 1] : 30) * 60e3, files = readIndex().files;
  let pending = Object.entries(files);
  if (!pending.length) { console.error('✗ channel-kit-media: chỉ mục rỗng'); process.exit(1); }
  for (let round = 1; pending.length; round++) {
    const bad = [];
    for (let i = 0; i < pending.length; i += 8) await Promise.all(pending.slice(i, i + 8).map(async ([rel, e]) => {
      try { const r = await fetch(e.url, { redirect: 'follow' }); if (r.status !== 200) return bad.push([rel, e, 'HTTP ' + r.status]);
        const n = (await r.arrayBuffer()).byteLength; if (n !== e.bytes) bad.push([rel, e, `${n} B ≠ ${e.bytes} B`]); } catch (x) { bad.push([rel, e, String(x.cause?.code || x.message)]); }
    }));
    pending = bad; console.log(`verify vòng ${round}: còn ${pending.length}/${Object.keys(files).length}${pending[0] ? ' – vd ' + pending[0][1].url + ' → ' + pending[0][2] : ''}`);
    if (pending.length && Date.now() + 60e3 > deadline) { console.error(`✗ channel-kit-media: ${pending.length} URL chưa trả 200 đúng byte sau hạn chờ`); process.exit(1); }
    if (pending.length) await sleep(60e3);
  }
  console.log(`✓ channel-kit-media: ${Object.keys(files).length} ảnh trả 200 đúng số byte`);
} else { console.error('dùng: channel-kit-media.mjs index | stage [dir] | verify [--minutes N]'); process.exit(2); }
