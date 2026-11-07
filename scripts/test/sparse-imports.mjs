#!/usr/bin/env node
// Workflow checkout một phần (sparse-checkout) phải có đủ file mà script nó chạy import (07/11: #824 dời retry5xx sang scripts/lib,
// required-gate + ci-filler chỉ checkout scripts/ci → ERR_MODULE_NOT_FOUND, cổng PR đỏ). Quét: mọi `node scripts/….mjs` trong workflow có sparse
// → lần theo import tương đối (đệ quy) → mỗi file phải nằm trong danh sách sparse (cone = thư mục, non-cone = mẫu đường dẫn).
import fs from 'node:fs'; import path from 'node:path';
const WF = '.github/workflows'; let bad = 0, n = 0;
const importsOf = f => { try { return [...fs.readFileSync(f, 'utf8').matchAll(/(?:import\s[^'"]*?from\s*|import\s*\(\s*|^\s*import\s*)['"](\.{1,2}\/[^'"]+)['"]/gm)].map(m => path.normalize(path.join(path.dirname(f), m[1]))); } catch { return []; } };
const closure = f => { const seen = new Set(), st = [f]; while (st.length) { const x = st.pop(); if (seen.has(x)) continue; seen.add(x); st.push(...importsOf(x).filter(y => fs.existsSync(y))); } return seen; };
for (const file of fs.readdirSync(WF).filter(f => /\.ya?ml$/.test(f))) {
  const src = fs.readFileSync(path.join(WF, file), 'utf8');
  // một job = một khối; đơn giản: tách theo checkout, mỗi checkout sparse áp cho các bước sau nó tới checkout kế tiếp
  const parts = src.split(/uses:\s*actions\/checkout@/).slice(1);
  for (const part of parts) {
    const m = part.match(/sparse-checkout:\s*(?:"([^"]*)"|'([^']*)'|\|\n((?:\s{10,}.*\n)+)|([^,}\s]+))/); if (!m) continue;
    const pats = (m[1] != null ? m[1].replace(/\\n/g, '\n') : (m[2] ?? m[3] ?? m[4] ?? '')).split('\n').map(s => s.trim()).filter(Boolean);
    const cone = !/sparse-checkout-cone-mode:\s*false/.test(part.slice(0, 400));
    const covered = f => pats.some(p => cone ? (f === p || f.startsWith(p.replace(/\/$/, '') + '/') || !f.includes('/')) : (p.endsWith('/') ? f.startsWith(p) : (f === p || f.startsWith(p + '/'))));
    for (const s of new Set([...part.matchAll(/node\s+(scripts\/[\w./-]+\.mjs)/g)].map(x => x[1]))) {
      if (!fs.existsSync(s)) continue; n++;
      for (const dep of closure(s)) if (!covered(dep)) { bad++; console.error(`✗ ${file}: ${s} cần ${dep} nhưng sparse-checkout chỉ có: ${pats.join(', ')}`); }
    }
  }
}
console.log(bad ? `✗ sparse-imports: ${bad} file thiếu` : `✓ sparse-imports: ${n} script trong workflow checkout một phần đủ file import`);
process.exit(bad ? 1 : 0);
