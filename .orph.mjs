import fs from 'fs'; import path from 'path';
const files = []; (function w(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) w(p); else if (/\.js$/.test(f.name)) files.push(p); } })('web/js');
const hay = [...files, ...['web/app/index.html', 'web/sw.js', 'web/index.html'].filter(f => fs.existsSync(f))].map(f => fs.readFileSync(f, 'utf8')).join('\n') + fs.readdirSync('scripts', { recursive: true }).filter(f => /\.(mjs|js|sh)$/.test(f) && !f.includes('node_modules')).map(f => { try { return fs.readFileSync('scripts/' + f, 'utf8'); } catch { return ''; } }).join('\n');
const out = [];
for (const f of files) {
  if (/\/i18n\/|admin|\/lib\//.test(f)) continue;
  const rel = f.replace(/^web\//, ''), base = path.basename(f);
  const refs = hay.split(rel).length - 1;
  if (refs === 0) out.push([fs.statSync(f).size, f, refs]);
}
out.sort((a, b) => b[0] - a[0]); console.log(out.slice(0, 30).map(x => x.join(' ')).join('\n'));
