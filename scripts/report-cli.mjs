#!/usr/bin/env node
// Hàng đợi báo lỗi cho phiên Claude Code (docs/REPORTS.md § Claude Code). Ký HMAC-SHA256 bằng LEXKITE_REPORT_CLI_KEY
// (biến môi trường, hoặc file ~/.config/lexkite/report-cli-key – KHÔNG commit). Chỉ gọi được CLI_OPS (queue/resolve/progress/pending).
//   node scripts/report-cli.mjs queue [--json] [--limit 30]
//   node scripts/report-cli.mjs resolve LX-1234 "Sửa IPA của record (v.)" <commit> [phiên bản]
//   node scripts/report-cli.mjs progress <commit 40 ký tự> [pr] LX-1234 [LX-…]   (workflow report-autofix.yml gọi khi PR gộp)
//   node scripts/report-cli.mjs pending [--json]
//   node scripts/report-cli.mjs shots-migrate [--all]   (workflow report-shots.yml: ảnh D1 → R2 theo lô)
// LEXKITE_API (tùy chọn) = https://lexkite.com
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
export function cliKey() {
  let key = process.env.LEXKITE_REPORT_CLI_KEY || '';
  if (!key) try { key = fs.readFileSync(path.join(os.homedir(), '.config/lexkite/report-cli-key'), 'utf8').trim(); } catch (e) { /* thiếu */ }
  return key;
}
/** Hàm gọi API đã ký: (body) → JSON; lỗi HTTP → ném Error('<mã> <lỗi>'). */
export function mkCall(key, api = (process.env.LEXKITE_API || 'https://lexkite.com') + '/api/report', f = fetch) {
  return async body => {
    const raw = JSON.stringify(body), ts = String(Date.now()), sig = crypto.createHmac('sha256', key).update(ts + '.' + raw).digest('hex');
    const r = await f(api, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Lexkite-Cli': ts + '.' + sig }, body: raw });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(r.status + ' ' + (j.error || '')); return j;
  };
}
async function main() {
  const key = cliKey();
  if (!key) { console.error('✗ Thiếu LEXKITE_REPORT_CLI_KEY (biến môi trường hoặc ~/.config/lexkite/report-cli-key)'); process.exit(1); }
  const call = mkCall(key), [cmd, ...a] = process.argv.slice(2);
  if (cmd === 'queue') {
    const li = a.indexOf('--limit'), j = await call({ op: 'queue', limit: li >= 0 ? +a[li + 1] : 30 });
    if (a.includes('--json')) console.log(JSON.stringify(j, null, 2));
    else for (const r of j.rows) console.log(`${r.id} ${r.kind === 'feature' ? 'FEATURE' : r.sev || 'P?'} ×${r.people} ${r.area}/${r.cat} #/${r.route} ${r.ver}\n   ${r.ai.summary_vi || r.msg.slice(0, 120)}${r.ai.needs_human ? '  ⚠️ cần người duyệt' : ''}\n   fix: ${r.ai.suggested_fix || '–'}\n   ${r.admin}`);
  } else if (cmd === 'resolve' && /^LX-\d+$/i.test(a[0] || '')) {
    const j = await call({ op: 'resolve', id: a[0].toUpperCase(), note: a[1] || '', commit: a[2] || '', ver: a[3] || '' });
    console.log(j.skipped ? `= ${j.id} đã sửa từ trước – bỏ qua` : `✓ ${j.id} → Đã sửa · ${j.dups} phiếu trùng · ${j.mailed} thư đã gửi`);
  } else if (cmd === 'progress' && /^[0-9a-f]{40}$/i.test(a[0] || '')) {
    const pr = /^\d+$/.test(a[1] || '') ? +a[1] : 0, ids = a.filter(x => /^LX-\d+$/i.test(x));
    console.log(JSON.stringify(await call({ op: 'progress', commit: a[0], pr, ids })));
  } else if (cmd === 'pending') {
    const j = await call({ op: 'pending' }); console.log(a.includes('--json') ? JSON.stringify(j) : j.rows.map(r => r.id + ' ' + r.commit).join('\n') + `\nlive: ${j.live || '?'}`);
  } else if (cmd === 'shots-migrate') { // lô 20 ảnh D1 → R2; --all: lặp tới khi hết (≤ 200 lô) rồi VACUUM
    for (let i = 0; i < (a.includes('--all') ? 200 : 1); i++) {
      const j = await call({ op: 'shots-migrate', n: 20, vacuum: a.includes('--all') });
      if (j.error) { console.log(`::warning::${j.error} – còn ${j.left} ảnh trong D1 (gắn binding REPORT_SHOTS trước)`); break; }
      console.log(`lô ${i + 1}: chuyển ${j.moved} (${Math.round(j.bytes / 1024)} KB) · lỗi ${j.failed} · hết hạn ${j.expired} · còn ${j.left}${j.vacuum ? ' · VACUUM ' + j.vacuum : ''}`);
      if (!j.left || (!j.moved && j.failed)) break;
    }
  } else { console.error('Dùng: report-cli.mjs queue [--json] | resolve LX-1234 "<ghi chú>" <commit> [phiên bản] | progress <commit> [pr] LX-… | pending'); process.exit(1); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error('✗', e.message); process.exit(1); });
