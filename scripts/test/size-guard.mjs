#!/usr/bin/env node
// Cổng dung lượng repo chính (docs/STORAGE.md) – chặn cả LOẠI lỗi "nhét media nặng vào repo chính":
//   1) cây đầu nhánh (tổng blob HEAD, git ls-tree -l) > 600 MB → đỏ
//   2) mỗi commit trong dải --range A..B thêm/sửa > 20 MB tệp nhị phân (mp3/mp4/ảnh/wav/zip/onnx…, tức không phải văn bản) → đỏ
// Ngoại lệ có chủ đích: dòng "Size-Guard: allow" trong thông điệp commit (ghi lý do). Ngưỡng: --tree-mb, --commit-mb.
//   node scripts/test/size-guard.mjs [--range A..B] [--tree-mb 600] [--commit-mb 20]
// Chạy được trên clone blobless (actions/checkout filter: blob:none) – chỉ tải blob của tệp nhị phân mới để đo cỡ.
import { execFileSync } from 'node:child_process';
const A = process.argv.slice(2), opt = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const TREE = +opt('tree-mb', 600) * 1e6, COMMIT = +opt('commit-mb', 20) * 1e6, RANGE = opt('range', '');
const git = (args, input) => execFileSync('git', args, { maxBuffer: 1 << 29, input }).toString();
const TEXT = /\.(m?js|cjs|ts|tsx|jsx|json|jsonl|md|txt|html?|css|ya?ml|sh|py|svg|xml|toml|csv|tsv|vtt|srt|ass|lock|map|webmanifest|ini|cfg|sql|kt|java|swift|gradle|plist|properties|xcconfig|pbxproj|storyboard|strings|xcstrings|entitlements|rb|go|rs|c|h|m|mm|po|env|example|gitignore|gitattributes|editorconfig|npmrc|nvmrc|conf|tpl|mustache|njk|liquid|ics|rss|atom)$/i;
const isBin = p => !TEXT.test(p) && /\.[a-z0-9]+$/i.test(p.split('/').pop());
let fail = 0, tree = 0, files = 0;
// clone blobless: ls-tree -l cần cỡ blob → tải lẻ TỪNG blob (rất chậm). Tải trước cả cây HEAD trong 1 lô (diff với cây rỗng).
try { git(['diff-tree', '-r', '--numstat', '4b825dc642cb6eb9a060e54bf8d69288fbee4904', 'HEAD']); } catch { /* clone đầy đủ: không cần */ }
for (const ln of git(['ls-tree', '-r', '-l', 'HEAD']).split('\n')) { const m = ln.match(/^\d+ blob \w+\s+(\d+)\t/); if (m) { tree += +m[1]; files++; } }
console.log(`size-guard: cây HEAD ${(tree / 1e6).toFixed(1)} MB / ${files} tệp (trần ${TREE / 1e6} MB)`);
if (tree > TREE) { console.error(`✗ size-guard: cây đầu nhánh ${(tree / 1e6).toFixed(1)} MB > ${TREE / 1e6} MB – chuyển media sang kho ngoài (infra/media-repos.json, scripts/media/push.mjs)`); fail = 1; }
if (RANGE) {
  let commits = [];
  try { commits = git(['rev-list', '--no-merges', RANGE]).split('\n').filter(Boolean); } catch { commits = [git(['rev-parse', 'HEAD']).trim()]; }
  for (const c of commits.slice(0, 500)) {
    const ents = [], raw = git(['diff-tree', '-r', '--no-commit-id', '--root', '--raw', '-z', c]).split('\0');
    for (let i = 0; i + 1 < raw.length; i += 2) { const m = raw[i].match(/^:\d+ \d+ \w+ (\w+) ([AMT])/); if (m && isBin(raw[i + 1]) && !/^0+$/.test(m[1])) ents.push([m[1], raw[i + 1]]); }
    if (!ents.length) continue;
    // clone blobless: tải blob nhị phân theo LÔ (diff --numstat prefetch 1 lần) – cat-file lẻ sẽ tải từng blob một
    for (let i = 0; i < ents.length; i += 400) { try { git(['diff-tree', '-r', '--root', '--no-commit-id', '--numstat', c, '--', ...ents.slice(i, i + 400).map(e => e[1])]); } catch { /* đo tiếp bằng cat-file */ } }
    const sizes = git(['cat-file', '--batch-check=%(objectsize)'], ents.map(e => e[0]).join('\n') + '\n').split('\n').filter(Boolean).map(Number);
    const sum = sizes.reduce((a, b) => a + (b || 0), 0);
    if (sum <= COMMIT) continue;
    const msg = git(['log', '-1', '--format=%B', c]);
    const top = ents.map((e, i) => [sizes[i], e[1]]).sort((a, b) => b[0] - a[0]).slice(0, 5).map(([s, p]) => `${s >= 1e6 ? (s / 1e6).toFixed(1) + ' MB' : Math.round(s / 1e3) + ' KB'} ${p}`).join(', ') + (ents.length > 5 ? ` … (${ents.length} tệp)` : '');
    if (/^Size-Guard:\s*allow/mi.test(msg)) { console.log(`⚠ size-guard: ${c.slice(0, 9)} thêm ${(sum / 1e6).toFixed(1)} MB nhị phân – được phép (Size-Guard: allow)`); continue; }
    console.error(`✗ size-guard: commit ${c.slice(0, 9)} thêm ${(sum / 1e6).toFixed(1)} MB nhị phân (> ${COMMIT / 1e6} MB): ${top}`); fail = 1;
  }
  console.log(`size-guard: đã soát ${Math.min(commits.length, 500)} commit trong ${RANGE}`);
}
process.exit(fail);
