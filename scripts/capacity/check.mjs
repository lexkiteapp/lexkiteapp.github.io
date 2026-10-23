// Cron hằng ngày (.github/workflows/capacity-watch.yml): gọi /api/capacity op check (ký HMAC LEXKITE_DRIVE_CLI_KEY) → máy chủ đọc Cloudflare GraphQL,
// lưu chuỗi 30 ngày, đặt/gỡ chuông Quản trị + gửi thư "Nâng gói Cloudflare 5 USD trước ngày X". Đỏ khi: thiếu khoá CLI, máy chủ lỗi, hoặc không có số liệu.
// Pages chưa có khoá đọc Analytics (503 no-analytics-token) → bỏ qua trung tính (xanh, ghi chú), không đỏ.
// Chỉ 1 yêu cầu/ngày (không thăm dò bằng vòng lặp – METHODS §8). Tài liệu: docs/CAPACITY.md
import { driveSign, driveCliKey } from '../video/library.mjs';
const BASE = String(process.env.LEXKITE_API_BASE || 'https://lexkite.com').replace(/\/+$/, '');
const key = driveCliKey(); if (!key) { console.error('✗ thiếu LEXKITE_DRIVE_CLI_KEY'); process.exit(1); }
const text = JSON.stringify({ op: 'check' });
const r = await fetch(BASE + '/api/capacity', { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'lexkite-bot capacity-watch', ...driveSign(key, text) }, body: text });
const j = await r.json().catch(() => ({}));
if (r.status === 503 && j.error === 'no-analytics-token') { // chưa có khoá đọc Analytics → BỎ QUA trung tính (không đỏ) cho tới khi chủ tạo khoá
  const msg = 'Bỏ qua: Pages chưa có CF_ANALYTICS_TOKEN + CF_ACCOUNT_ID (khoá chỉ đọc "Account Analytics: Read") – các bước: docs/CAPACITY.md §5';
  console.log('::notice::' + msg);
  if (process.env.GITHUB_STEP_SUMMARY) { const fs = await import('node:fs'); fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Hạn mức Cloudflare\n⏭ ${msg}\n`); }
  process.exit(0);
}
if (!r.ok) { console.error(`✗ /api/capacity → ${r.status} ${j.error || ''}`); process.exit(1); }
const ev = j.evaluation || {};
console.log(`ngày có số liệu: ${j.rows} · ${(ev.metrics || []).map(m => `${m.k} ${m.pct}%${m.eta != null ? ` (80% sau ~${m.eta} ngày)` : ''}`).join(' · ')}`);
console.log(ev.alert ? `⚠️ CẢNH BÁO: nâng gói trước ${ev.upgradeBy} – ${ev.reason}${j.mailed ? ' (đã gửi thư)' : ''}` : '✓ chưa cần nâng gói');
if (!j.rows) { console.error('✗ không có số liệu'); process.exit(1); }
if (process.env.GITHUB_STEP_SUMMARY) { const fs = await import('node:fs'); fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Hạn mức Cloudflare\n${(ev.metrics || []).map(m => `- ${m.k}: ${m.pct}% gói Free hôm qua${m.streak ? `, ${m.streak} ngày ≥ 60%` : ''}${m.eta != null ? `, dự báo 80% sau ~${m.eta} ngày` : ''}`).join('\n')}\n\n${ev.alert ? `**⚠️ Nâng gói Cloudflare 5 USD trước ngày ${ev.upgradeBy}** – ${ev.reason}` : '✓ Chưa cần nâng gói'}\n`); }
