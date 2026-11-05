#!/usr/bin/env node
// Android: bàn phím ảo không che ô đang nhập. targetSdk ≥ 35 = edge-to-edge bắt buộc (adjustResize vô hiệu) → khi SystemBars.insetsHandling
// = "disable", PHẢI có bộ nghe inset IME riêng trong MainActivity (đệm đáy = chiều cao IME). Đổi insetsHandling khác "disable" thì
// SystemBars của Capacitor tự lo IME → bộ nghe riêng phải gỡ (tránh 2 bộ nghe đè nhau trên decorView). Đo thật: journey-e2e/android.mjs.
import fs from 'node:fs';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('✗ ' + m); } };
const cap = JSON.parse(fs.readFileSync('mobile/capacitor.config.json', 'utf8'));
const mode = ((cap.plugins || {}).SystemBars || {}).insetsHandling || 'css';
const vars = fs.readFileSync('mobile/android/variables.gradle', 'utf8'), sdk = +(/targetSdkVersion\s*=\s*(\d+)/.exec(vars) || [])[1];
const f = (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) { const r = walk(p); if (r) return r; } else if (e.name === 'MainActivity.java') return p; } return ''; })('mobile/android/app/src/main/java');
const src = f ? fs.readFileSync(f, 'utf8') : '';
const has = /setOnApplyWindowInsetsListener\(decor/.test(src) && /isVisible\(WindowInsetsCompat\.Type\.ime\(\)\)/.test(src) && /getInsets\(WindowInsetsCompat\.Type\.ime\(\)\)\.bottom/.test(src) && /setPadding\(0, 0, 0, bottom\)/.test(src);
// WebView < 140 không có env(safe-area-inset-*) đúng → phải đệm theo thanh hệ thống (ô tra từ trên thanh trên từng nằm dưới thanh trạng thái, emulator 05/11)
const oldWv = /WEBVIEW_SAFE_AREA_ENV = 140/.test(src) && /setPadding\(sb\.left, sb\.top, sb\.right, kb \? bottom : sb\.bottom\)/.test(src) && /androidx\.webkit:webkit/.test(fs.readFileSync('mobile/android/app/build.gradle', 'utf8'));
ok(!!f, 'không thấy MainActivity.java');
if (mode === 'disable' && sdk >= 35) ok(has && /keepInputAboveKeyboard\(\);/.test(src), `insetsHandling "disable" + targetSdk ${sdk}: MainActivity phải đệm đáy theo IME (keepInputAboveKeyboard) – thiếu thì bàn phím che ô nhập`);
if (mode !== 'disable') ok(!has, `insetsHandling "${mode}": SystemBars của Capacitor đã lo IME → gỡ keepInputAboveKeyboard (2 bộ nghe inset đè nhau)`);
if (mode === 'disable' && sdk >= 35) ok(oldWv, 'WebView < 140: MainActivity phải đệm theo thanh hệ thống (+ androidx.webkit để đọc bản WebView)');
ok(has ? /return insets;/.test(src) : true, 'bộ nghe inset phải chuyển tiếp insets cho WebView (vùng an toàn CSS env())');
if (fails) { console.error(`android-ime: ${fails} lỗi`); process.exit(1); }
console.log(`✓ android-ime: insetsHandling=${mode}, targetSdk ${sdk}, MainActivity ${has ? 'đệm đáy theo IME' : 'để SystemBars lo IME'}`);
