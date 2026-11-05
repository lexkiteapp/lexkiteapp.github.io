// Native apps – chống lệch 3 bộ code (docs/specs/native-apps.md §3): mã Swift/Kotlin viết tay KHÔNG được chép màu, chữ giao diện hay hằng số chấm điểm.
// Chặn: mã màu hex / Color(red:…) / Color(0x…) ngoài thư mục Generated; Text("chữ cố định") hay Button("…"); bảng dịch tay (.strings, strings.xml có chữ).
// Hằng số FSRS chỉ được nằm ở SRS.swift/SRS.kt (đã kiểm bằng vector chuẩn). Chạy: node scripts/test/native-one-source.mjs [--self-test]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RULES = [
  [/#[0-9a-fA-F]{6}\b|Color\(\s*(red|\.sRGB|0x)|Color\(0x/, 'màu viết tay – dùng token sinh (LKColor/LKColors)'],
  [/\b(Text|Button|Label)\(\s*"[^"\\]*[A-Za-zÀ-ỹ]{2,}/, 'chữ giao diện viết tay – dùng L10nKey (chuỗi sinh 15 ngôn ngữ)'],
  [/0\.40255|1\.18385|15\.69105/, 'hằng số FSRS ngoài SRS.swift/SRS.kt'],
];
const ALLOW = [/\/Generated\//, /\/generated\//, /\/Tests?\//, /\/test\//, /Primitives\.swift$/, /\/SRS\.(swift|kt)$/];
export function scan(file, src) {
  if (ALLOW.some(r => r.test(file))) return [];
  const out = [];
  src.split('\n').forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    for (const [re, why] of RULES) if (re.test(line)) out.push(`${file}:${i + 1}: ${why}`);
  });
  return out;
}
function walk(d, acc = []) {
  if (!fs.existsSync(d)) return acc;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (['build', '.gradle', '.build', 'DerivedData'].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc); else if (/\.(swift|kt)$/.test(e.name) || /\.strings$|values(-[a-z]+)?\/strings\.xml$/.test(p)) acc.push(p);
  }
  return acc;
}
if (process.argv.includes('--self-test')) {
  const bad = [['a/Views/X.swift', 'Text("Hello there")'], ['a/ui/X.kt', 'val c = Color(0xFF00AA00)'], ['a/ui/Y.swift', 'let c = "#0F3D3E"'], ['a/core/Z.kt', 'val w = 0.40255']];
  const good = [['a/Generated/Tokens.swift', 'Color(0xFF00AA00)'], ['a/ui/X.kt', 'Text(t(L10nKey.tabToday))'], ['a/ui/X.swift', '// Text("doc")']];
  const fails = bad.filter(([f, s]) => !scan(f, s).length).length + good.filter(([f, s]) => scan(f, s).length).length;
  console.log(fails ? `✗ self-test ${fails} lỗi` : '✓ native-one-source self-test'); process.exit(fails ? 1 : 0);
}
const files = walk(path.join(ROOT, 'native'));
const errs = files.flatMap(f => {
  const rel = path.relative(ROOT, f);
  if (/\.strings$|strings\.xml$/.test(rel)) return [`${rel}: bảng dịch viết tay – chuỗi chỉ sinh từ scripts/native/gen.mjs`];
  return scan(rel, fs.readFileSync(f, 'utf8'));
});
if (errs.length) { console.log(errs.join('\n')); console.log(`✗ native-one-source: ${errs.length} chỗ chép tay`); process.exit(1); }
console.log(`✓ native-one-source: ${files.length} file Swift/Kotlin không chép màu/chữ/hằng số`);
