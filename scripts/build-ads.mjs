// ads.txt (AdSense) + app-ads.txt (AdMob) ở gốc tên miền (docs/ADS.md §6). web/ads.txt, web/app-ads.txt = bản giữ chỗ pub-0000000000000000;
// khi đã dán mã nhà xuất bản vào web/js/ads/config.js (web.client = 'ca-pub-…') → bước build ghi đè dist/ bằng số thật.
import fs from 'node:fs'; import vm from 'node:vm';
const c = { self: {} }; c.self = c; vm.createContext(c);
vm.runInContext(fs.readFileSync('web/js/ads/config.js', 'utf8'), c);
const C = c.ADS_CONFIG || {}, pub = (C.web && C.web.client || '').replace(/^ca-/, '');
const line = p => `google.com, ${p}, DIRECT, f08c47fec0942fa0\n`;
if (pub && !/^pub-\d{16}$/.test(pub)) { console.error('✗ web/js/ads/config.js: web.client phải dạng ca-pub-<16 số>'); process.exit(1); }
if (pub && fs.existsSync('dist')) { fs.writeFileSync('dist/ads.txt', line(pub)); fs.writeFileSync('dist/app-ads.txt', line(pub)); console.log('✓ ads.txt + app-ads.txt cho ' + pub); }
else console.log('· Quảng cáo chưa có mã nhà xuất bản – giữ ads.txt/app-ads.txt giữ chỗ (pub-0000000000000000)');
