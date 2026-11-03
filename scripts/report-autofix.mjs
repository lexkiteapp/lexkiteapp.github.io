#!/usr/bin/env node
// Tự chuyển trạng thái báo lỗi theo PR (workflow report-autofix.yml, docs/REPORTS.md § Tự động theo PR):
//   merged – PR đã gộp, tiêu đề/nội dung/nhánh có LX-1234 → op 'progress' (Đang xử lý + ghi commit chờ live)
//   live   – op 'pending' → commit nào là tổ tiên của bản live (CF_PAGES_COMMIT_SHA) → op 'resolve' (fix_ver = CACHE của sw.js live)
// Thiếu LEXKITE_REPORT_CLI_KEY → in cảnh báo, thoát 0 (chủ app chưa nhập bí mật; không làm đỏ CI). Idempotent: chạy lại không gửi thư lặp.
import { execFileSync } from 'node:child_process';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { cliKey, mkCall } from './report-cli.mjs';

/** Mã phiếu trong chữ (tiêu đề + nội dung + nhánh) → ['LX-1234', …] (≤ 20, không trùng, chỉ mã ≥ LX-1001). */
export const lxIds = s => [...new Set([...String(s || '').matchAll(/(?<![\w-])LX-(\d{4,9})(?!\d)/gi)].map(m => 'LX-' + m[1]).filter(x => +x.slice(3) > 1000))].slice(0, 20);
/** CACHE trong sw.js → 'lexkite-20261102183000' (phiên bản người dùng thấy) hoặc ''. */
export const cacheVer = src => (String(src || '').match(/const CACHE = '([\w.-]{4,40})'/) || [, ''])[1];
const isAnc = (a, b) => { try { execFileSync('git', ['merge-base', '--is-ancestor', a, b], { stdio: 'ignore' }); return true; } catch (e) { return false; } };

export async function run(mode, { call, env = process.env, anc = isAnc, f = fetch, log = console.log } = {}) {
  if (mode === 'merged') {
    const ids = lxIds([env.PR_TITLE, env.PR_BODY, env.PR_BRANCH].join('\n'));
    if (!ids.length) return log('– PR không ghi mã LX-xxxx'), { ids };
    const j = await call({ op: 'progress', commit: env.SHA, pr: +env.PR || 0, ids });
    for (const r of j.rows) log(r.prog ? `✓ ${r.id} → Đang xử lý (${env.SHA.slice(0, 10)})` : `= ${r.id} bỏ qua: ${r.skip}`);
    return { ids, rows: j.rows };
  }
  if (mode === 'live') {
    const p = await call({ op: 'pending' });
    if (!p.live) return log('– bản live chưa báo commit (CF_PAGES_COMMIT_SHA)'), { done: [] };
    const todo = p.rows.filter(r => anc(r.commit, p.live)), done = [];
    if (!todo.length) return log(`– ${p.rows.length} phiếu chờ, chưa phiếu nào lên live ${p.live.slice(0, 10)}`), { done };
    const ver = cacheVer(await (await f((env.LEXKITE_SITE || 'https://lexkite.com') + '/sw.js', { cache: 'no-store' })).text().catch(() => '')) || p.live.slice(0, 12);
    for (const r of todo) { const j = await call({ op: 'resolve', id: r.id, commit: r.commit, ver, note: '' }); done.push(r.id); log(j.skipped ? `= ${r.id} đã sửa` : `✓ ${r.id} → Đã sửa (${ver}) · ${j.dups} trùng · ${j.mailed} thư`); }
    return { done, ver };
  }
  throw new Error('mode: merged | live');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const key = cliKey();
  if (!key) { console.log('::warning::Thiếu secret LEXKITE_REPORT_CLI_KEY – báo lỗi chưa tự chuyển trạng thái (docs/REPORTS.md)'); process.exit(0); }
  run(process.argv[2], { call: mkCall(key) }).catch(e => { console.error('✗', e.message); process.exit(1); });
}
