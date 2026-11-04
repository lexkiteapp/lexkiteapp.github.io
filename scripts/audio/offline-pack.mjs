// 📥 Danh sách gói nghe offline (docs/specs/audio-quality.md việc 4): ~3000 từ thông dụng nhất (thứ tự NGSL của web/audio/w/s3.tsv)
// có file giọng đạt cho từng giọng → web/data/offline-pack.json { v, n, w: { bf_emma: [khóa…], af_heart: [khóa…] } }.
// Khóa = fnv36(giọng|từ|s3) giống web/js/ui.js (WAV) – service worker (web/sw.js) tải audio/w/<khóa>.mp3 vào cache 'lk-offline' khi người dùng bật.
// File nằm ngoài khung app (không phình shell). Dùng: node scripts/audio/offline-pack.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const N = 3000, OUT = path.join(ROOT, 'web/data/offline-pack.json');
const fnv36 = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
const rows = fs.readFileSync(path.join(ROOT, 'web/audio/w/s3.tsv'), 'utf8').split('\n').filter(Boolean).slice(0, N).map(l => l.split('\t'));
const w = {};
[['bf_emma', 1], ['af_heart', 2]].forEach(([v, c]) => { w[v] = rows.filter(r => r[c] === 'ok').map(r => fnv36(v + '|' + r[0].trim() + '|s3')); });
const json = JSON.stringify({ v: 1, n: N, w }) + '\n';
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== json) { console.error('✗ offline-pack: web/data/offline-pack.json lệch web/audio/w/s3.tsv – chạy node scripts/audio/offline-pack.mjs'); process.exit(1); }
  console.log(`✓ offline-pack: ${w.bf_emma.length} + ${w.af_heart.length} từ`);
} else { fs.writeFileSync(OUT, json); console.log(`✓ ghi ${path.relative(ROOT, OUT)}: ${w.bf_emma.length} (UK) + ${w.af_heart.length} (US) từ, ${(json.length / 1024).toFixed(0)} KB`); }
