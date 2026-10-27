#!/usr/bin/env node
// ☁️ Đẩy JSON trang từ điển lên R2 lexkite-dict-data (tầng 2 – đuôi dài, docs/SEO-DICT-PAGES.md §6, §8 bước 4). CHỈ chạy khi chủ đã bật R2 (biến repo DICT_R2=1).
// So băm dist-dict/data/v1/manifest.json với manifest trên R2 → chỉ PUT file đổi (giữ ≪ 1 triệu lượt ghi/tháng), manifest ghi CUỐI (lỗi giữa chừng → lần sau đẩy lại).
// API REST Cloudflare (token CLOUDFLARE_API_TOKEN cần quyền R2 Edit) – không cần khoá S3 riêng. --plan: chỉ in số file sẽ đẩy, không gọi mạng ghi.
import fs from 'node:fs'; import path from 'node:path';
const OUT = process.env.DICT_OUT || 'dist-dict', ACC = process.env.CLOUDFLARE_ACCOUNT_ID, TOKEN = process.env.CLOUDFLARE_API_TOKEN, BUCKET = 'lexkite-dict-data';
const plan = process.argv.includes('--plan');
const local = JSON.parse(fs.readFileSync(path.join(OUT, 'data/v1/manifest.json'), 'utf8'));
const api = k => `https://api.cloudflare.com/client/v4/accounts/${ACC}/r2/buckets/${BUCKET}/objects/${k.split('/').map(encodeURIComponent).join('/')}`;
let remote = { langs: {} };
if (!plan) { if (!ACC || !TOKEN) { console.error('✗ r2-sync: thiếu CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN'); process.exit(1); }
  const r = await fetch(api('v1/manifest.json'), { headers: { authorization: `Bearer ${TOKEN}` } }); if (r.ok) remote = await r.json(); else if (r.status !== 404) { console.error(`✗ r2-sync: đọc manifest ${r.status}`); process.exit(1); } }
const keys = ['v1/shell.json'];
for (const [l, m] of Object.entries(local.langs)) for (const [slug, h] of Object.entries(m)) if ((remote.langs[l] || {})[slug] !== h) keys.push(`v1/${l}/${slug}.json`);
console.log(`r2-sync: ${keys.length} file đổi / ${Object.values(local.langs).reduce((a, m) => a + Object.keys(m).length, 0)} từ${plan ? ' (--plan, không ghi)' : ''}`);
if (plan) process.exit(0);
let i = 0, fail = 0;
const put = async k => { for (let t = 0; t < 3; t++) { const r = await fetch(api(k), { method: 'PUT', headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, body: fs.readFileSync(path.join(OUT, 'data', k)) }); if (r.ok) return; await new Promise(z => setTimeout(z, 1000 * (t + 1))); } fail++; console.error(`✗ ${k}`); };
await Promise.all(Array.from({ length: 12 }, async () => { while (i < keys.length) await put(keys[i++]); }));
if (fail) { console.error(`✗ r2-sync: ${fail} file lỗi – không ghi manifest`); process.exit(1); }
await put('v1/manifest.json'); console.log(fail ? '✗ manifest lỗi' : '✓ r2-sync xong'); process.exit(fail ? 1 : 0);
