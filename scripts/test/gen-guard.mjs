// Máy gác chống xung đột (docs/METHODS.md › 2b; 10/11 #934 dirty 3 lần/ngày):
//  1) Tệp sinh không sửa tay được: mỗi loại có một bộ kiểm "khớp nguồn" nằm trong cổng PR (suite.txt / stitch-diff.yml) – thiếu bộ kiểm = đỏ.
//  2) Không nối thêm mục vào registry viết MỘT dòng: PR sửa một dòng có ≥ MIN_PAIRS cặp `khóa: giá trị` mà chỉ để thêm cặp (dòng cũ bị thay bằng
//     dòng dài hơn cùng đầu) → đỏ, bảo tách mỗi mục một dòng + thêm vào REGISTRIES (scripts/lib/fmt-registry.mjs). So với origin/main (npm-test.yml fetch sẵn).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const MIN_PAIRS = 10; // registry thật dồn hàng chục mục/dòng (ROUTE_BUNDLE 30+); hàng dữ liệu (bài nghe, âm) ít hơn và hiếm khi hai PR cùng thêm
const keys = l => (l.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`[^`]*`/g, m => (/^['"][\w$-]+['"]$/.test(m) ? m.slice(1, -1).replace(/-/g, '_') : 's')).match(/(?:^|[{,]\s*)[\w$]+\s*:/g) || []).map(k => k.replace(/^[{,\s]+|\s*:$/g, ''));

/** Từ diff -U0 (thuần): danh sách { file, line } nơi một dòng registry một dòng được nối thêm cặp khóa. */
export function oneLineGrowth(diff) {
  const out = []; let file = '', minus = [];
  for (const l of diff.split('\n')) {
    if (l.startsWith('+++ ')) { file = l.replace(/^\+\+\+ (b\/)?/, ''); minus = []; continue; }
    if (l.startsWith('@@')) { minus = []; continue; }
    if (l.startsWith('-') && !l.startsWith('---')) { minus.push(l.slice(1)); continue; }
    if (!l.startsWith('+') || l.startsWith('+++') || !/\.(m?js|cjs)$/.test(file) || /(^|\/)(extension\/app|web\/js\/i18n|i18n\/ui)\//.test(file)) continue;
    const nw = l.slice(1);
    if (!/^\s*(export\s+)?((const|let|var)\s+)?[\w$.]+\s*=\s*\{/.test(nw) || /\{"[^"]*":/.test(nw)) continue; // chỉ dòng KHAI BÁO registry; JSON nén = tệp sinh (dựng lại, không gộp tay)
    const nk = keys(nw);
    if (nk.length < MIN_PAIRS) continue;
    const head = nw.trim().slice(0, 30), old = minus.find(m => m.trim().slice(0, 30) === head), ok = old === undefined ? [] : keys(old);
    // dòng cũ cùng đầu, giữ MỌI khóa cũ và chỉ thêm khóa mới = nối mục vào registry một dòng
    if (old !== undefined && nk.length > ok.length && ok.every(k => nk.includes(k))) out.push({ file, line: nw.trim().slice(0, 80) });
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // 1)
  const suite = fs.readFileSync('scripts/test/suite.txt', 'utf8'), has = t => suite.split('\n').some(l => l.trim() === `node scripts/test/${t}.mjs`);
  for (const t of ['ext-sync', 'i18n-pack', 'fmt-stable', 'pr-unconflict', 'gen-guard']) assert.ok(has(t), `suite.txt thiếu scripts/test/${t}.mjs (bộ kiểm tệp sinh/định dạng)`);
  assert.match(fs.readFileSync('.github/workflows/stitch-diff.yml', 'utf8'), /build-stitch-css\.mjs --check/, 'stitch-diff.yml phải kiểm web/css/st-*.css khớp nguồn');
  // 2) tự kiểm hàm thuần
  const reg = n => `  const R = { ${Array.from({ length: n }, (_, i) => `k${i}: 'v${i}'`).join(', ')} };`;
  assert.equal(oneLineGrowth(`+++ b/web/js/app.js\n@@ -1 +1 @@\n-${reg(11)}\n+${reg(12)}`).length, 1, 'bắt được nối thêm cặp vào registry một dòng');
  assert.equal(oneLineGrowth(`+++ b/web/js/app.js\n@@ -1 +1 @@\n-${reg(11)}\n+${reg(11).replace("'v1'", "'x'")}`).length, 0, 'sửa giá trị (không thêm cặp) không tính');
  assert.equal(oneLineGrowth(`+++ b/web/js/x.js\n@@ -0,0 +1 @@\n+${reg(12)}`).length, 0, 'dòng mới hoàn toàn không tính (chỉ bắt dòng chung bị nối dài)');
  assert.equal(oneLineGrowth(`+++ b/web/js/app.js\n@@ -1 +1 @@\n-  const R = { a: 'k: v, b: c, d: e, f: g, h: i, j: k, l: m, n: o, p: q, r: s' };\n+  const R = { a: 'k: v, b: c, d: e, f: g, h: i, j: k, l: m, n: o, p: q, r: s, t: u' };`).length, 0, 'dấu hai chấm trong chuỗi không tính');
  assert.equal(oneLineGrowth(`+++ b/web/js/app.js\n@@ -1 +1 @@\n-${reg(11)}\n+${reg(12).replace('k0:', 'z0:')}`).length, 0, 'đổi tên khóa (không giữ mọi khóa cũ) không tính');
  // 2) diff thật của PR
  let diff = '';
  try { diff = execFileSync('git', ['diff', '-U0', process.env.GEN_GUARD_BASE || 'origin/main', 'HEAD', '--', '*.js', '*.mjs', '*.cjs'], { encoding: 'utf8', maxBuffer: 256 << 20, stdio: ['ignore', 'pipe', 'ignore'] }); } // GEN_GUARD_BASE: chạy tay với remote khác (vd. real/main)
  catch { console.log('gen-guard: không có origin/main – bỏ qua phần diff (chạy được trên CI npm-test.yml)'); }
  const bad = oneLineGrowth(diff);
  assert.equal(bad.length, 0, `nối thêm mục vào registry viết một dòng (mọi PR sửa cùng dòng → xung đột):\n  ${bad.map(b => `${b.file}: ${b.line}…`).join('\n  ')}\n  → tách mỗi mục một dòng, thêm registry vào REGISTRIES (scripts/lib/fmt-registry.mjs), chạy node scripts/fmt-stable.mjs`);
  console.log('✓ gen-guard: tệp sinh có bộ kiểm khớp nguồn; không nối registry một dòng');
}
