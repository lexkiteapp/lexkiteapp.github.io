// Mọi dấu `/* CSS-NOTES §n */` trong web/css/*.css phải có mục "## §n" trong docs/CSS-NOTES.md (chú thích dài sống ở docs, không mất kiến thức) và ngược lại.
import fs from 'fs';
const doc = fs.readFileSync('docs/CSS-NOTES.md', 'utf8'), have = new Set([...doc.matchAll(/^## §(\d+) /gm)].map(m => m[1])), used = new Set(), bad = [];
for (const f of fs.readdirSync('web/css').filter(f => f.endsWith('.css'))) for (const m of fs.readFileSync(`web/css/${f}`, 'utf8').matchAll(/CSS-NOTES §(\d+)/g)) { used.add(m[1]); if (!have.has(m[1])) bad.push(`web/css/${f}: §${m[1]} thiếu trong docs/CSS-NOTES.md`); }
for (const n of have) if (!used.has(n)) bad.push(`docs/CSS-NOTES.md §${n} không còn dấu trong CSS`);
if (bad.length) { console.error('✗ css-notes:\n- ' + bad.join('\n- ')); process.exit(1); }
console.log(`✓ css-notes: ${have.size} chú thích dài khớp dấu trong CSS`);
