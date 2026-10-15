// Sinh ads.txt (AdSense) và app-ads.txt (AdMob) ở gốc tên miền từ js/ads-config.js – chỉ khi đã điền mã nhà xuất bản.
import fs from 'node:fs'; import vm from 'node:vm';
const c = { self: {} }; c.self = c; vm.createContext(c);
vm.runInContext(fs.readFileSync('web/js/ads-config.js', 'utf8'), c);
const C = c.ADS_CONFIG || {}, pub = (C.web && C.web.client || '').replace(/^ca-/, '');
const line = p => `google.com, ${p}, DIRECT, f08c47fec0942fa0\n`;
if (pub) { fs.writeFileSync('dist/ads.txt', line(pub)); fs.writeFileSync('dist/app-ads.txt', line(pub)); console.log('✓ ads.txt + app-ads.txt cho ' + pub); }
else console.log('· Quảng cáo chưa cấu hình (ads-config.js) – bỏ qua ads.txt');
