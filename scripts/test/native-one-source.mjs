// Native apps – chống lệch 3 bộ code (docs/specs/native-apps.md §3): mã Swift/Kotlin viết tay KHÔNG được chép màu, chữ giao diện hay hằng số chấm điểm.
// Chặn: mã màu hex / Color(red:…) / Color(0x…) ngoài thư mục Generated; Text("chữ cố định") hay Button("…"); bảng dịch tay (.strings, strings.xml có chữ).
// Hằng số FSRS chỉ được nằm ở SRS.swift/SRS.kt (đã kiểm bằng vector chuẩn). Chạy: node scripts/test/native-one-source.mjs [--self-test]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logoFiles, LOGO_ANDROID, LOGO_IOS_DIR } from '../native/logo.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RULES = [
  [/#[0-9a-fA-F]{6}\b|Color\(\s*(red|\.sRGB|0x)|Color\(0x/, 'màu viết tay – dùng token sinh (LKColor/LKColors)'],
  [/\b(Text|Button|Label)\(\s*"[^"\\]*[A-Za-zÀ-ỹ]{2,}/, 'chữ giao diện viết tay – dùng L10nKey (chuỗi sinh 15 ngôn ngữ)'],
  [/0\.40255|1\.18385|15\.69105/, 'hằng số FSRS ngoài SRS.swift/SRS.kt'],
];
// Logo: owner-controlled, never redrawn. The ONLY files that may carry the brand mark's geometry/colours are the generated ones (logoFiles(): Android VectorDrawable +
// iOS imageset, derived from brand/lexkite-mark.svg). Anywhere else under native/ (Swift, Kotlin, XML, SVG) the mark's path data or its brand colours = a redraw.
const LOGO_PATHS = /M58 54 C46 40|M62 54 C74 40|M54 80 C52 92|M61 33 l8 -5/;
const LOGO_COLOURS = /#F2553B|#FFB054|#FFC94A|0xF2553B|0xFFB054|0xFFC94A/i; // brand colours may legitimately appear as Kit tokens (generated Tokens.*, values/colors.xml) – not in drawables / views
const TOKEN_FILE = /\/(Generated|generated)\/|\/values(-[a-z]+)?\/colors\.xml$/;
export const logoViolation = (rel, src, generated) => (!generated.has(rel) && (LOGO_PATHS.test(src) || (!TOKEN_FILE.test(rel) && LOGO_COLOURS.test(src))) ? `${rel}: contains the brand mark's geometry/colours – the logo is generated only (scripts/native/logo.mjs from brand/lexkite-mark.svg); use lk_logo_mark / LexkiteMark` : null);
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
  const g = new Map([['gen/lk_logo_mark.xml', '']]);
  const logoBad = [['a/Redraw.kt', 'PathParser().parsePathString("M58 54 C46 40 26 30 4 30")'], ['a/res/drawable/own.xml', 'android:fillColor="#FFC94A"'], ['a/Mark.swift', 'let c = 0xF2553B']];
  const logoOk = [['gen/lk_logo_mark.xml', 'M58 54 C46 40 26 30 4 30'], ['a/X.kt', 'Text(t(L10nKey.appName))']];
  const lfails = logoBad.filter(([f, s]) => !logoViolation(f, s, g)).length + logoOk.filter(([f, s]) => logoViolation(f, s, g)).length;
  const fails = lfails + bad.filter(([f, s]) => !scan(f, s).length).length + good.filter(([f, s]) => scan(f, s).length).length;
  console.log(fails ? `✗ self-test ${fails} lỗi` : '✓ native-one-source self-test'); process.exit(fails ? 1 : 0);
}
function walkAll(d, acc = []) {
  if (!fs.existsSync(d)) return acc;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (['build', '.gradle', '.build', 'DerivedData', 'node_modules'].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walkAll(p, acc); else if (/\.(swift|kt|kts|xml|svg|json|md|plist|yml|pbxproj)$/.test(e.name)) acc.push(p);
  }
  return acc;
}
const files = walk(path.join(ROOT, 'native'));
const generatedLogo = logoFiles(); // rel → expected content, derived from brand/lexkite-mark.svg right now
const logoErrs = [];
for (const [rel, want] of generatedLogo) {
  const f = path.join(ROOT, rel);
  if (!fs.existsSync(f)) logoErrs.push(`${rel}: missing – run node scripts/native/gen.mjs`);
  else if (fs.readFileSync(f, 'utf8') !== want) logoErrs.push(`${rel}: differs from brand/lexkite-mark.svg (the logo must not be edited by hand) – run node scripts/native/gen.mjs`);
}
if (!generatedLogo.has(LOGO_ANDROID) || !generatedLogo.has(`${LOGO_IOS_DIR}/Contents.json`)) logoErrs.push('logo generator lost an output');
for (const f of walkAll(path.join(ROOT, 'native'))) { const rel = path.relative(ROOT, f); if (/\.md$/.test(rel) || /\/shared\/gen\//.test(rel)) continue; const v = logoViolation(rel, fs.readFileSync(f, 'utf8'), generatedLogo); if (v) logoErrs.push(v); }
const errs = logoErrs.concat(files.flatMap(f => {
  const rel = path.relative(ROOT, f);
  if (/\.strings$|strings\.xml$/.test(rel)) return [`${rel}: bảng dịch viết tay – chuỗi chỉ sinh từ scripts/native/gen.mjs`];
  return scan(rel, fs.readFileSync(f, 'utf8'));
}));
if (errs.length) { console.log(errs.join('\n')); console.log(`✗ native-one-source: ${errs.length} chỗ chép tay`); process.exit(1); }
console.log(`✓ native-one-source: ${files.length} file Swift/Kotlin không chép màu/chữ/hằng số`);
