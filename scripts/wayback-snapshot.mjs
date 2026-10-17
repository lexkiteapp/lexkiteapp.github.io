#!/usr/bin/env node
// Gửi URL bài/trang mới lên Internet Archive (Wayback Machine) để lưu bằng chứng thời gian bất biến.
// Dùng: node scripts/wayback-snapshot.mjs [--dry] [--force] [--delay 12000] [url...]
// Hoặc kết hợp: node scripts/blog-due.mjs --since 1440 | node scripts/wayback-snapshot.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRegistry, recordArchive } from './lib/content-registry.mjs';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_PATH = path.join(ROOT_DIR, 'content', 'protection', 'registry.jsonl'); // sổ băm chuỗi chung (scripts/lib/content-registry.mjs)

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const force = args.includes('--force');

let delayMs = 12000;
const delayIdx = args.findIndex(a => a === '--delay');
if (delayIdx !== -1 && args[delayIdx + 1]) {
  delayMs = Math.max(1000, Number(args[delayIdx + 1]) || 12000);
}

// Thu thập URLs
let urls = args.filter(a => !a.startsWith('--') && (a.startsWith('http://') || a.startsWith('https://')));
if (!urls.length && !process.stdin.isTTY) {
  urls = fs.readFileSync(0, 'utf8').split(/\s+/).filter(u => u.startsWith('http://') || u.startsWith('https://'));
}

urls = [...new Set(urls)];

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!urls.length) {
    console.log('wayback-snapshot: Không có URL nào cần lưu.');
    process.exit(0);
  }

  const done = new Set(readRegistry(REGISTRY_PATH).filter(e => e.type === 'archive' && e.service === 'wayback').map(e => e.url));
  const queue = urls.filter(u => force || !done.has(u));
  console.log(`ℹ wayback-snapshot: Nhận ${urls.length} URL, cần xử lý ${queue.length} URL mới.`);

  if (dry) {
    for (const u of queue) console.log(`[DRY-RUN] Sẽ lưu Wayback: ${u}`);
    process.exit(0);
  }

  let count = 0;
  for (let i = 0; i < queue.length; i++) {
    const u = queue[i];
    console.log(`[${i + 1}/${queue.length}] Đang gửi Wayback Machine: ${u}`);
    const r = await saveSnapshot(u);
    if (r.ok) {
      console.log(`  ✓ Thành công: ${r.snapshotUrl}`);
      if (/^https:\/\/web\.archive\.org\/web\/\d{4,14}/.test(r.snapshotUrl)) { recordArchive({ url: u, archiveUrl: r.snapshotUrl }, REGISTRY_PATH); count++; }
      else console.error(`  ⚠ Wayback chưa trả mốc thời gian (${r.snapshotUrl}) – không ghi sổ, lần sau thử lại`);
    } else {
      console.error(`  ✗ Thất bại (${u}): ${r.error || r.status}`);
    }

    if (i < queue.length - 1) {
      await sleep(delayMs);
    }
  }

  console.log(`✓ Hoàn thành: Đã lưu ${count}/${queue.length} bản ghi vào sổ đăng ký ${REGISTRY_PATH}`);
  process.exit(0);
}
