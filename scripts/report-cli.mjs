#!/usr/bin/env node
// Hàng đợi báo lỗi cho phiên Claude Code (docs/REPORTS.md § Claude Code). Ký HMAC-SHA256 bằng LEXKITE_REPORT_CLI_KEY
// (biến môi trường, hoặc file ~/.config/lexkite/report-cli-key – KHÔNG commit). Chỉ gọi được 'queue' và 'resolve'.
//   node scripts/report-cli.mjs queue [--json] [--limit 30]
//   node scripts/report-cli.mjs resolve LX-1234 "Sửa IPA của record (v.)" <commit> [phiên bản]
// LEXKITE_API (tùy chọn) = https://lexkite.com
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto';
const API = (process.env.LEXKITE_API || 'https://lexkite.com') + '/api/report';
let key = process.env.LEXKITE_REPORT_CLI_KEY || '';
if (!key) try { key = fs.readFileSync(path.join(os.homedir(), '.config/lexkite/report-cli-key'), 'utf8').trim(); } catch (e) { /* thiếu */ }
if (!key) { console.error('✗ Thiếu LEXKITE_REPORT_CLI_KEY (biến môi trường hoặc ~/.config/lexkite/report-cli-key)'); process.exit(1); }
const [cmd, ...a] = process.argv.slice(2);
const call = async body => {
  const raw = JSON.stringify(body), ts = String(Date.now()), sig = crypto.createHmac('sha256', key).update(ts + '.' + raw).digest('hex');
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Lexkite-Cli': ts + '.' + sig }, body: raw });
  const j = await r.json().catch(() => ({})); if (!r.ok) { console.error('✗', r.status, j.error || ''); process.exit(1); } return j;
};
if (cmd === 'queue') {
  const li = a.indexOf('--limit'), j = await call({ op: 'queue', limit: li >= 0 ? +a[li + 1] : 30 });
  if (a.includes('--json')) console.log(JSON.stringify(j, null, 2));
  else for (const r of j.rows) console.log(`${r.id} ${r.kind === 'feature' ? 'FEATURE' : r.sev || 'P?'} ×${r.people} ${r.area}/${r.cat} #/${r.route} ${r.ver}\n   ${r.ai.summary_vi || r.msg.slice(0, 120)}${r.ai.needs_human ? '  ⚠️ cần người duyệt' : ''}\n   fix: ${r.ai.suggested_fix || '–'}\n   ${r.admin}`);
} else if (cmd === 'resolve' && /^LX-\d+$/i.test(a[0] || '')) {
  const j = await call({ op: 'resolve', id: a[0].toUpperCase(), note: a[1] || '', commit: a[2] || '', ver: a[3] || '' });
  console.log(`✓ ${j.id} → Đã sửa · ${j.dups} phiếu trùng · ${j.mailed} thư đã gửi`);
} else { console.error('Dùng: report-cli.mjs queue [--json] | resolve LX-1234 "<ghi chú>" <commit> [phiên bản]'); process.exit(1); }
