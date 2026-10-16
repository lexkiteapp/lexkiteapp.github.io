// 🗂️ Kiểm sổ đăng ký tài nguyên (infra/resources.json): mọi tên miền ngoài trong code, mọi Worker/D1/R2 trong wrangler.toml
// phải có mục đăng ký – thêm dịch vụ mới mà quên ghi sổ → chặn ship (npm test). Quy tắc: docs/INFRA-RULES.md
import fs from 'fs';
import path from 'path';
const R = JSON.parse(fs.readFileSync('infra/resources.json', 'utf8'));
const known = new Set([...R.services.flatMap(s => s.match || []), ...R.links.hosts]);
const miss = new Map(), add = (k, where) => { if (!known.has(k) && !miss.has(k)) miss.set(k, where); };
const DIRS = ['web/js', 'web/sw.js', 'web/index.html', 'functions', 'workers', 'extension/background.js', 'extension/content.js', 'extension/popup.js', 'extension/newtab.js', 'extension/manifest.json', 'mobile/capacitor.config.json'];
const walk = p => { if (!fs.existsSync(p)) return []; const st = fs.statSync(p); if (st.isFile()) return [p]; return fs.readdirSync(p).flatMap(f => (/^(i18n|node_modules)$/.test(f) ? [] : walk(path.join(p, f)))); };
for (const f of DIRS.flatMap(walk).filter(f => /\.(m?js|html|json|toml)$/.test(f))) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/https:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) { const h = m[1].toLowerCase(); if (!/\.(workers\.dev)$/.test(h) && !/^(localhost|example\.com)$/.test(h)) add(h, f); }
  if (f.endsWith('wrangler.toml')) for (const m of s.matchAll(/^\s*(?:name|database_name|bucket_name)\s*=\s*"([^"]+)"/gm)) add(m[1], f);
}
for (const f of walk('wrangler.toml')) for (const m of fs.readFileSync(f, 'utf8').matchAll(/^\s*(?:name|database_name|bucket_name)\s*=\s*"([^"]+)"/gm)) add(m[1], f);
for (const s of R.services) for (const k of ['key', 'name', 'kind', 'purpose', 'status']) if (!s[k]) { console.error(`✗ infra-check: mục "${s.name || s.key}" thiếu trường ${k}`); process.exit(1); }
if (miss.size) { console.error(`✗ infra-check: ${miss.size} tài nguyên chưa đăng ký trong infra/resources.json (thêm vào "match" của dịch vụ tương ứng, hoặc links.hosts nếu chỉ là liên kết):\n` + [...miss].map(([k, w]) => `  - ${k}  (${w})`).join('\n')); process.exit(1); }
console.log(`✓ infra-check: ${R.services.length} dịch vụ, ${known.size} tên miền/tài nguyên đã đăng ký – không thiếu mục nào`);
