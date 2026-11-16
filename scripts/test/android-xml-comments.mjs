// Hồi quy 07/11: chú thích XML trong res Android chứa "--" (vd. "--bg") làm aapt/mergeResources đỏ (apk/aab trên main sau #754).
// XML cấm "--" bên trong <!-- … -->. Quét mọi .xml dưới mobile/android và native/android (nếu có).
import fs from 'node:fs'; import path from 'node:path';
const roots = ['mobile/android', 'native/android'].filter(d => fs.existsSync(d)), bad = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
  const p = path.join(d, e.name);
  if (e.isDirectory()) { if (!['build', '.gradle', 'node_modules'].includes(e.name)) walk(p); }
  else if (p.endsWith('.xml')) { const s = fs.readFileSync(p, 'utf8'); for (const m of s.matchAll(/<!--([\s\S]*?)-->/g)) if (m[1].includes('--')) bad.push(`${p}: "${m[1].trim().slice(0, 60)}"`); }
} };
roots.forEach(walk);
if (bad.length) { console.error('✗ android-xml-comments: chú thích XML chứa "--" (aapt từ chối):\n  ' + bad.join('\n  ')); process.exit(1); }
console.log(`✓ android-xml-comments: không chú thích XML nào chứa "--" (${roots.join(', ')})`);
