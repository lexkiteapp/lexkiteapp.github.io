#!/usr/bin/env node
// Định dạng chống xung đột (docs/METHODS.md › Chống xung đột): nguồn dịch i18n/ui (mỗi khóa một dòng, sắp xếp – scripts/lib/i18n-pack.mjs srcText)
// + registry dài (mỗi mục một dòng – scripts/lib/fmt-registry.mjs REGISTRIES).
//   node scripts/fmt-stable.mjs          → viết lại tệp lệch định dạng (không đổi nội dung: cùng khóa, cùng giá trị)
//   node scripts/fmt-stable.mjs --check  → chỉ kiểm, thoát 1 nếu lệch (npm test qua scripts/test/fmt-stable.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, LANGS, srcPath, srcText, loadDictFile } from './lib/i18n-pack.mjs';
import { REGISTRIES, formatFile } from './lib/fmt-registry.mjs';

/** Mọi tệp nguồn dịch hiện có: [{ lang, group, file }] (group '' = lõi). */
export function i18nSources() {
  const out = [];
  for (const lang of LANGS) {
    if (fs.existsSync(path.join(ROOT, srcPath(lang)))) out.push({ lang, group: '', file: srcPath(lang) });
    const d = path.join(ROOT, 'i18n/ui', lang);
    if (fs.existsSync(d)) for (const f of fs.readdirSync(d).filter(f => f.endsWith('.js')).sort()) out.push({ lang, group: f.slice(0, -3), file: srcPath(lang, f.slice(0, -3)) });
  }
  return out;
}

/** Danh sách { file, want } của mọi tệp lệch định dạng. */
export function drift() {
  const bad = [];
  for (const { lang, group, file } of i18nSources()) {
    const cur = fs.readFileSync(path.join(ROOT, file), 'utf8'), want = srcText(lang, group, loadDictFile(file));
    if (cur !== want) bad.push({ file, want });
  }
  const byFile = new Map();
  for (const r of REGISTRIES) byFile.set(r.file, [...(byFile.get(r.file) || []), r]);
  for (const [file, regs] of byFile) {
    const cur = fs.readFileSync(path.join(ROOT, file), 'utf8'), want = formatFile(cur, regs.map(r => ({ ...r, file })));
    if (cur !== want) bad.push({ file, want });
  }
  return bad;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const check = process.argv.includes('--check'), bad = drift();
  if (check && bad.length) {
    console.error(`✗ fmt-stable: ${bad.length} tệp lệch định dạng chống xung đột (vd. ${bad.slice(0, 3).map(b => b.file).join(', ')}) – chạy node scripts/fmt-stable.mjs rồi commit. Quy tắc: docs/METHODS.md › Chống xung đột`);
    process.exit(1);
  }
  if (!check) for (const b of bad) fs.writeFileSync(path.join(ROOT, b.file), b.want);
  console.log(`✓ fmt-stable: ${check ? 'đúng định dạng' : `viết lại ${bad.length} tệp`}`);
}
