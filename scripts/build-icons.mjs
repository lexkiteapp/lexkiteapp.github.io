// Bộ icon UI duy nhất của app: Lucide (ISC, https://lucide.dev) – chỉ các icon đang dùng, dựng thành sprite <symbol> nội tuyến trong web/app/index.html.
// Dùng: npm pack lucide-static@0.460.0 → giải nén → node scripts/build-icons.mjs <thư-mục-package> → bash scripts/build-extension.sh
// Thêm icon: thêm tên vào ICONS (đúng tên tệp Lucide), chạy lại. Quy tắc dùng: docs/DESIGN-SYSTEM.md.
import fs from 'fs';
import path from 'path';
export const ICONS = ['house', 'book-open', 'target', 'flag', 'user', 'layout-grid', 'layers', 'map', 'library', 'notebook-pen', 'zap', 'puzzle', 'search', 'headphones', 'newspaper', 'pen-line', 'mic', 'message-circle', 'ruler', 'audio-lines', 'compass', 'goal', 'chart-column', 'trophy', 'book-x', 'settings', 'flame', 'star', 'bell', 'sun-moon', 'globe', 'volume-2', 'turtle', 'x', 'chevron-left', 'chevron-right', 'snowflake', 'arrow-left'];
// Icon chỉ dùng ở trang tải lười → nhúng vào chính file đó (không tính vào khung app ≤377 KB gz), thêm vào sprite lúc trang đó nạp
export const LAZY = { 'web/js/settings.js': ['cloud', 'palette', 'alarm-clock', 'bot', 'database', 'shield'] };
const src = process.argv[2];
if (!src) { console.error('Dùng: node scripts/build-icons.mjs <lucide-static package dir>'); process.exit(1); }
const sym = n => {
  const s = fs.readFileSync(path.join(src, 'icons', n + '.svg'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const inner = s.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\s*\n\s*/g, '').replace(/\s*\/>/g, '/>');
  return `<symbol id="i-${n}" viewBox="0 0 24 24">${inner}</symbol>`;
};
const sprite = `<!--icons--><svg id="lk-sprite" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><!-- Lucide ISC © Lucide Contributors, © Cole Bemis (Feather, MIT) – scripts/build-icons.mjs -->${ICONS.map(sym).join('')}</svg><!--/icons-->`;
for (const [f, ns] of Object.entries(LAZY)) {
  const js = fs.readFileSync(f, 'utf8'), blk = `/*icons*/UI.addIcons('${ns.map(sym).join('')}');/*/icons*/`;
  fs.writeFileSync(f, js.includes('/*icons*/') ? js.replace(/\/\*icons\*\/[\s\S]*?\/\*\/icons\*\//, blk) : js.replace(/\(function \(\) \{\n/, m => m + '  ' + blk + '\n'));
}
const F = 'web/app/index.html', html = fs.readFileSync(F, 'utf8');
const out = /<!--icons-->[\s\S]*?<!--\/icons-->/.test(html) ? html.replace(/<!--icons-->[\s\S]*?<!--\/icons-->/, sprite) : html.replace(/<body>\n/, `<body>\n  ${sprite}\n`);
fs.writeFileSync(F, out);
console.log(`✓ build-icons: ${ICONS.length} icon, sprite ${sprite.length} B`);
