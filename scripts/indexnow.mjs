// Báo URL mới cho các công cụ tìm kiếm hỗ trợ IndexNow (Bing, Yandex, Seznam, Naver…) qua api.indexnow.org.
// Khóa công khai: content/blog/config.json "indexNowKey" + file web/<key>.txt (công khai theo thiết kế).
// Dùng: node scripts/indexnow.mjs [--dry] [url…]   hoặc   node scripts/blog-due.mjs --since 70 | node scripts/indexnow.mjs
// Luôn gửi kèm https://lexkite.com/vi/blog/. Thoát 0 khi API trả 200/202.
import fs from 'node:fs'; import { config } from './lib/blog-content.mjs';

const args = process.argv.slice(2), dry = args.includes('--dry');
let urls = args.filter(a => !a.startsWith('--'));
if (!urls.length && !process.stdin.isTTY) urls = fs.readFileSync(0, 'utf8').split(/\s+/).filter(Boolean);
const cfg = config(), key = cfg.indexNowKey, site = (cfg.site || 'https://lexkite.com').replace(/\/$/, ''), host = new URL(site).host;
if (!/^[a-f0-9]{32}$/.test(key || '')) { console.error('✗ indexnow: thiếu/sai "indexNowKey" trong content/blog/config.json'); process.exit(1); }
if (!fs.existsSync(`web/${key}.txt`)) console.error(`⚠ indexnow: không thấy web/${key}.txt – công cụ tìm kiếm sẽ không xác minh được khóa`);
const bad = urls.filter(u => { try { return new URL(u).host !== host; } catch { return true; } });
for (const u of bad) console.error(`⚠ bỏ qua URL không thuộc ${host}: ${u}`);
const urlList = [...new Set([...urls.filter(u => !bad.includes(u)), `${site}/vi/blog/`])];
const payload = { host, key, keyLocation: `${site}/${key}.txt`, urlList };
if (dry) { console.log(JSON.stringify(payload, null, 1)); process.exit(0); }
try {
  const r = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(30e3) });
  if (r.status === 200 || r.status === 202) { console.log(`✓ indexnow: đã gửi ${urlList.length} URL (HTTP ${r.status})`); process.exit(0); }
  const why = { 400: 'yêu cầu sai định dạng', 403: 'khóa không hợp lệ / chưa đọc được file khóa trên site', 422: 'URL không thuộc host hoặc khóa không khớp', 429: 'gửi quá nhiều (bị giới hạn)' }[r.status] || 'lỗi không rõ';
  console.error(`✗ indexnow: HTTP ${r.status} – ${why}. ${(await r.text()).slice(0, 300)}`); process.exit(1);
} catch (e) { console.error(`✗ indexnow: không gọi được API – ${e.message}`); process.exit(1); }
