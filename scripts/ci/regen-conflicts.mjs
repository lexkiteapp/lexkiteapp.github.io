#!/usr/bin/env node
// Gỡ xung đột "kiểu quen" khi gộp main vào nhánh PR – dùng cho phiên pr-fixer/người, cùng một bộ luật với bot pr-unconflict
// (scripts/pr-unconflict.mjs: plan/applySteps/regen) nên máy và người không bao giờ gỡ khác nhau.
// Tệp sinh (web/js/i18n/<lang>, extension/app, st-*.css, CODEMAP…) → lấy main rồi DỰNG LẠI từ nguồn đã gộp; i18n/ui + i18n-fixed.json + registry → gộp theo khóa/mục.
// Tệp người viết (xung đột thật) → KHÔNG đụng, in danh sách để gỡ tay, để nguyên cuộc gộp dở.
//
//   node scripts/ci/regen-conflicts.mjs                     gộp real/main vào nhánh hiện tại (hoặc tiếp cuộc gộp đang dở), gỡ, commit
//   node scripts/ci/regen-conflicts.mjs --base=origin/main  gộp nhánh khác
//   node scripts/ci/regen-conflicts.mjs --strip             KHÔNG gộp: chỉ đưa tệp sinh (gói dịch, extension/app) về bản của base + commit – PR không được commit chúng (cổng gen-pr-clean)
//   node scripts/ci/regen-conflicts.mjs --dry               chỉ báo sẽ gỡ gì (huỷ cuộc gộp)
//   node scripts/ci/regen-conflicts.mjs --measure 1 2 3     ĐO không đổi cây làm việc: PR N (refs/pull/N/head đã fetch) xung đột tệp nào với base; kèm đếm theo tệp
// Không push – push là việc của phiên (prepush + prwatch như thường lệ). Thoát 0 = đã gỡ hết/không xung đột; 2 = còn xung đột người viết; 1 = lỗi.
import { execFileSync } from 'node:child_process';
import { plan, applySteps, regen, stripGenerated } from '../pr-unconflict.mjs';

const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1];
const flag = k => process.argv.includes(`--${k}`);
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const tryGit = (...a) => { try { return { ok: true, out: git(...a) }; } catch (e) { return { ok: false, out: String(e.stdout || '') + String(e.stderr || '') }; } };
const unmerged = () => git('diff', '--name-only', '--diff-filter=U').split('\n').filter(Boolean);
const base = arg('base') || 'real/main';

/** Tệp xung đột của PR N so với base, không đụng cây làm việc (git merge-tree). */
export function conflictsOf(ref, baseRef = base) {
  const r = tryGit('merge-tree', '--write-tree', '--name-only', baseRef, ref), lines = r.out.split('\n');
  if (r.ok) return [];
  const out = []; for (const l of lines.slice(1)) { if (!l) break; out.push(l); }
  return out;
}

/** Nhóm tên tệp để thống kê (tệp sinh nhiều như extension/app/** gộp thành một dòng). */
export const bucket = f => f.replace(/^(extension\/app|web\/js\/i18n|extension\/_locales|web\/cpack\/lesson)\/.*/, '$1/*').replace(/^web\/[a-z]{2}\/(privacy|terms|credits)\.html$/, 'web/<lang>/$1.html');

function measure(nums) {
  const per = new Map(), files = new Map();
  for (const n of nums) {
    const c = conflictsOf(`refs/remotes/pr/${n}`); per.set(n, c.length);
    for (const b of new Set(c.map(bucket))) files.set(b, (files.get(b) || 0) + 1);
  }
  console.log(`PR xung đột: ${[...per.values()].filter(Boolean).length}/${nums.length}`);
  for (const [f, k] of [...files].sort((a, b) => b[1] - a[1])) console.log(String(k).padStart(4), f);
}

/** Gộp sạch (hoặc chỉ --strip): đưa tệp sinh về bản của base rồi commit. */
function strip() {
  const n = stripGenerated(base);
  if (!n) { console.log('✓ PR không đụng tệp sinh'); return 0; }
  if (flag('dry')) { git('reset', '-q', '--hard', 'HEAD'); console.log(`[dry] sẽ đưa ${n} tệp sinh về bản ${base}`); return 0; }
  git('commit', '-q', '-m', `Bỏ bản sinh khỏi PR (${n} tệp): CI dựng lại, bot gen-sync commit sau gộp`); console.log(`✓ đưa ${n} tệp sinh về bản ${base} + commit`); return 0;
}

function resolve() {
  const dry = flag('dry');
  if (!tryGit('rev-parse', '-q', '--verify', 'MERGE_HEAD').ok) {
    if (git('status', '--porcelain', '--untracked-files=no')) { console.error('✗ cây làm việc đang có thay đổi chưa commit – commit/stash trước.'); process.exit(1); }
    const m = tryGit('merge', '--no-edit', '-m', `Gộp ${base} (regen-conflicts: tự gỡ tệp sinh)`, base);
    if (m.ok) { console.log(`✓ gộp ${base} sạch, không xung đột`); return strip(); }
  }
  const conflicted = unmerged(), steps = plan(conflicted);
  const manual = steps ? [] : conflicted.filter(f => !plan([f]));
  if (!steps) { console.log(`✗ ${manual.length} tệp xung đột do người viết – gỡ tay rồi chạy lại để dựng phần sinh:\n  ${manual.join('\n  ')}`); return 2; }
  const bad = applySteps(steps);
  if (bad) { console.log(`✗ ${bad} – gỡ tay (cuộc gộp còn dở)`); return 2; }
  const n = stripGenerated(base); if (n) console.log(`✓ đưa ${n} tệp sinh về bản ${base} (PR không commit bản sinh)`);
  const rg = regen(tryGit('diff', '--name-only', 'HEAD').out.split('\n').filter(Boolean).map(f => ({ f })));
  if (rg) { console.log(`✗ dựng lại lỗi: ${rg}`); return 1; }
  console.log(`✓ đã gỡ: ${steps.map(s => `${s.f}=${s.how}`).join(', ')}`);
  if (dry) { git('merge', '--abort'); console.log('[dry] đã huỷ cuộc gộp'); return 0; }
  git('commit', '-q', '--no-edit'); console.log('✓ commit gộp. Còn: npm run prepush → đẩy → prwatch.py N@<head-sha>');
  return 0;
}

if (flag('strip')) process.exit(strip());
else if (flag('measure')) measure(process.argv.slice(2).filter(a => /^\d+$/.test(a)));
else process.exit(resolve());
