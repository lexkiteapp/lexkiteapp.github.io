#!/usr/bin/env node
// App Capacitor (iOS/Android) không mang trang tĩnh SEO theo ngôn ngữ (dist/<mã>/words|vocabulary|blog|… ≈ 190 MB của .aab 225 MB, 13/11):
// scripts/build-mobile.sh phải loại mọi thư mục con của 15 mã ngôn ngữ, và KHÔNG dùng mẫu /[a-z][a-z]/ (trùng js/, css/ → vỡ app).
import fs from 'node:fs';
const sh = fs.readFileSync('scripts/build-mobile.sh', 'utf8'), code = sh.replace(/^\s*#.*$/gm, '');
const bad = [];
const m = code.match(/for l in ([a-z ]+); do LANG_EX\+=\(--exclude "\/\$l\/\*\/"\)/);
const langs = m ? m[1].trim().split(/\s+/) : [];
const web = fs.readFileSync('web/js/i18n.js', 'utf8');
const sup = (web.match(/const SUPPORTED\s*=\s*\[([^\]]+)\]/) || [])[1];
const want = sup ? [...sup.matchAll(/'([a-z]{2})'/g)].map(x => x[1]) : null;
if (!m) bad.push('build-mobile.sh thiếu vòng LANG_EX loại /<mã>/*/');
if (!/"\$\{LANG_EX\[@\]\}"\s+dist\/ mobile\/www\//.test(code)) bad.push('rsync không nhận "${LANG_EX[@]}"');
if (/--exclude '\/\[a-z\]\[a-z\]\//.test(code)) bad.push("không dùng exclude '/[a-z][a-z]/…' (trùng js/)");
if (want) for (const l of want) if (!langs.includes(l)) bad.push('thiếu mã ngôn ngữ ' + l + ' trong LANG_EX');
if (langs.length < 15) bad.push('LANG_EX < 15 mã');
if (bad.length) { bad.forEach(b => console.error('  ✗ ' + b)); console.error('✗ mobile-www-slim'); process.exit(1); }
console.log('✓ mobile-www-slim: ' + langs.length + ' mã ngôn ngữ bị loại khỏi mobile/www');
