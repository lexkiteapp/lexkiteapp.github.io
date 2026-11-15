// Hồi quy: handler imgData của add-on chỉ tải ảnh từ danh sách host cho phép, https, không IP/localhost; chuyển hướng ra ngoài bị bỏ.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src = fs.readFileSync('extension/background.js', 'utf8');
const m = /\/\*IMG-ALLOW\*\/([\s\S]*?)\/\*END-IMG-ALLOW\*\//.exec(src);
assert.ok(m, 'background.js phải có khối IMG-ALLOW');
const imgUrlOk = new Function(m[1] + '; return imgUrlOk;')();
const good = [
  'https://upload.wikimedia.org/wikipedia/commons/a/a9/Example.jpg',
  'https://commons.wikimedia.org/wiki/Special:FilePath/Cat.jpg?width=480',
  'https://api.openverse.org/v1/images/abc/thumb/',
  'https://live.staticflickr.com/65535/1_n.jpg',
  'https://farm5.staticflickr.com/1/2_n.jpg',
  'https://lexkite.com/images/banner.png',
  'https://audio.lexkite.com/img/x.jpg',
  'https://lexkiteapp.github.io/x.png',
];
const bad = [
  'http://upload.wikimedia.org/a.jpg', 'https://127.0.0.1/a.png', 'https://[::1]/a.png', 'https://localhost/a.png', 'https://10.0.0.5/a.png',
  'https://169.254.169.254/latest/meta-data', 'https://192.168.1.1/a.png', 'https://evil.example/a.png', 'https://upload.wikimedia.org.evil.example/a.png',
  'https://evil-lexkite.com/a.png', 'https://lexkite.com.evil.example/a.png', 'https://user:pw@lexkite.com/a.png', 'https://lexkite.com:8443/a.png',
  'https://wikimedia.org.attacker.io/', 'file:///etc/passwd', 'data:image/png;base64,AAAA', 'javascript:alert(1)', '', 'not a url', 'https://2130706433/', 'https://intranet/a.png',
];
for (const u of good) assert.ok(imgUrlOk(u), 'phải cho phép: ' + u);
for (const u of bad) assert.ok(!imgUrlOk(u), 'phải chặn: ' + u);
assert.ok(!imgUrlOk(undefined) && !imgUrlOk(null) && !imgUrlOk({}), 'đầu vào lạ');

const h = /case 'imgData':[\s\S]*?case 'uiDict'/.exec(src);
assert.ok(h, 'có handler imgData');
assert.match(h[0], /imgUrlOk\(u\)/, 'handler phải dùng imgUrlOk');
assert.match(h[0], /r\.redirected && !imgUrlOk\(r\.url\)/, 'handler phải kiểm tra URL sau chuyển hướng');
console.log('✓ ext imgData: allowlist host, https, chặn IP/localhost/redirect ngoài');
