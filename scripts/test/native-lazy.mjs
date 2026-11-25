#!/usr/bin/env node
// Khóa: js/native.js (cầu nối app gốc Capacitor, ~6 KB gz) KHÔNG nằm trong khung app của bản WEB (khung app có ngân sách 374 KB gz) nhưng VẪN có trong app di động:
// (1) bản web (scripts/app-loader.mjs → dist/app/index.html) không tải native.js, danh sách nạp không có nó; (2) bản di động (build-mobile.sh chép web/app/index.html) vẫn có thẻ, ĐỨNG TRƯỚC app.js
// (chạy đồng bộ theo thứ tự defer như cũ → VBNative sẵn lúc app.js khởi động); (3) web/sw.js SHELL và thước khung (firstLoadFiles) không đếm nó.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { firstLoadFiles } from '../lib/gz-canon.mjs';
const rd = f => fs.readFileSync(f, 'utf8'), bad = [], src = rd('web/app/index.html');
if (!/<!--lknat-->\s*<script defer src="js\/native\.js"><\/script>\s*<!--\/lknat-->/.test(src)) bad.push('web/app/index.html: native.js phải nằm trong khối <!--lknat-->…<!--/lknat-->');
{ const d = fs.mkdtempSync(path.join(os.tmpdir(), 'natlazy-')); fs.mkdirSync(path.join(d, 'app')); fs.mkdirSync(path.join(d, 'js'));
  fs.writeFileSync(path.join(d, 'app/index.html'), src.replace(/(<\/body>)/, '<noscript><nav></nav></noscript>\n$1'));
  try { execFileSync('node', ['scripts/app-loader.mjs', path.join(d, 'app/index.html')], { stdio: 'pipe' }); const out = rd(path.join(d, 'app/index.html'));
    if (/native\.js/.test(out)) bad.push('bản web (app-loader) vẫn nhắc native.js');
    if (!/var S=\[[^\]]*js\/app\.js/.test(out)) bad.push('bản web: danh sách nạp thiếu js/app.js (app-loader hỏng?)'); }
  catch (e) { bad.push('app-loader lỗi: ' + String(e.stderr || e.message).slice(0, 200)); } fs.rmSync(d, { recursive: true, force: true }); }
{ const mob = src.replace(/<!--base-->.*?<!--\/base-->/s, '').replace(/<!--lkpre-->.*?<!--\/lkpre-->/s, ''); // đúng lệnh perl của scripts/build-mobile.sh
  const a = mob.indexOf('src="js/native.js"'), b = mob.indexOf('src="js/app.js"');
  if (a < 0 || b < 0 || a > b) bad.push('bản di động: native.js phải có và đứng TRƯỚC app.js'); }
if (/lknat/.test(rd('scripts/build-mobile.sh'))) bad.push('build-mobile.sh không được bỏ khối lknat (app gốc cần native.js)');
if (/native\.js/.test(rd('web/sw.js').match(/const SHELL = \[([\s\S]*?)\];/)[1])) bad.push('web/sw.js SHELL không được cache native.js (bản web không nạp)');
if (firstLoadFiles().includes('/js/native.js')) bad.push('firstLoadFiles (thước khung app) không được đếm native.js');
if (bad.length) { console.error('✗ native-lazy:\n- ' + bad.join('\n- ')); process.exit(1); }
console.log('✓ native-lazy: bản web không tải native.js · app di động có, trước app.js · SW/thước khung không đếm');
