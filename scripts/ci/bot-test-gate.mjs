#!/usr/bin/env node
// Máy gác bot đẩy main (15/11: bot lexicon-expand commit [skip ci] 9c4e52d158 làm lex.mjs đỏ, không cổng nào chặn → mọi PR kẹt shard 4).
// Commit [skip ci] KHÔNG qua CI → ngay trước lệnh đẩy bot chạy các lệnh test (infra/bot-push-tests.json) khớp đường dẫn tệp nó đổi.
// Đỏ MÀ bản gốc (--base) xanh → mã 1, KHÔNG đẩy (lỗi do bản bot). Đỏ cả ở gốc → mã 0 + cảnh báo (main đã đỏ từ trước, bot không được kẹt thêm).
//   node scripts/ci/bot-test-gate.mjs --base <ref>   thay đổi = cây làm việc (gồm đã add/commit) so với <ref>; chạy từ gốc repo, cây = bản sẽ đẩy
// Test thuần: scripts/test/bot-test-gate.mjs. Luật chặn workflow [skip ci] không có máy gác: scripts/test/ci-policy.mjs (luật 17).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { isMain } from '../lib/is-main.mjs';

export const MAP = 'infra/bot-push-tests.json';
export const TEST_TIMEOUT_MS = 10 * 60e3;

/** Lệnh test cần chạy cho danh sách tệp đổi (thuần): hợp các `tests` của mọi luật có mẫu khớp ≥ 1 tệp, khử trùng, giữ thứ tự. */
export function pickTests(files, rules) {
  const out = [];
  for (const r of rules) { const re = new RegExp(r.paths); if (files.some(f => re.test(f))) for (const t of r.tests) if (!out.includes(t)) out.push(t); }
  return out;
}

/** Workflow có commit/push [skip ci] thật (không tính dòng chú thích) mà không qua máy gác (thuần). Trả danh sách lý do vi phạm; rỗng = đạt.
 *  Qua máy gác = gọi bot-test-gate.mjs, hoặc dùng script chung đã gọi nó (push-main.sh / commit-regen.sh), hoặc `# ci-policy: bot-test – <lý do>` (vd. chỉ ghi sổ sao lưu). */
export const GATED_HELPERS = ['bot-test-gate.mjs', 'push-main.sh', 'commit-regen.sh', 'ledger-push.mjs'];
export function ungated(src) {
  const code = src.split('\n').filter(l => !/^\s*#/.test(l));
  if (!code.some(l => /\[skip ci\]/.test(l))) return [];
  if (GATED_HELPERS.some(h => src.includes(h)) || /#\s*ci-policy:\s*bot-test[ \t]*–[ \t]*\S/.test(src)) return [];
  return ['commit [skip ci] không qua máy gác (gọi scripts/ci/bot-test-gate.mjs trước lệnh đẩy, hoặc dùng push-main.sh; sổ chỉ-ghi: `# ci-policy: bot-test – <lý do>`)'];
}

const sh = (cmd, cwd) => spawnSync('bash', ['-c', cmd], { cwd, encoding: 'utf8', timeout: TEST_TIMEOUT_MS, maxBuffer: 1 << 26 });

export function run({ base, cwd = process.cwd(), log = console.log } = {}) {
  const git = (...a) => execFileSync('git', a, { cwd, encoding: 'utf8', maxBuffer: 1 << 28 }).trim();
  const files = git('diff', '--name-only', '--no-renames', base).split('\n').filter(Boolean);
  const rules = JSON.parse(fs.readFileSync(path.join(cwd, MAP), 'utf8')).rules;
  const tests = pickTests(files, rules);
  if (!tests.length) { log(`bot-test-gate: ${files.length} tệp đổi, không luật test nào khớp – đẩy`); return 0; }
  const red = tests.filter(t => { const r = sh(t, cwd); if (r.status === 0) return false; log(`✗ ${t}\n${`${r.stdout}${r.stderr}`.split('\n').filter(l => !l.startsWith('✓')).slice(0, 15).join('\n')}`); return true; });
  if (!red.length) { log(`bot-test-gate: ${tests.length} test xanh – đẩy`); return 0; }
  // đỏ: so với bản gốc – chỉ chặn khi chính bản bot làm đỏ
  const wt = fs.mkdtempSync(path.join(os.tmpdir(), 'botgate-'));
  try {
    git('worktree', 'add', '-q', '--detach', wt, base);
    if (fs.existsSync(path.join(cwd, 'node_modules'))) fs.symlinkSync(path.join(cwd, 'node_modules'), path.join(wt, 'node_modules'));
    const mine = red.filter(t => sh(t, wt).status === 0);
    if (mine.length) { log(`::error::bot-test-gate: bản bot làm đỏ ${mine.length} test (gốc ${base} xanh) – KHÔNG đẩy (commit [skip ci] không qua CI): ${mine.join(' | ')}`); return 1; }
    log(`::warning::bot-test-gate: ${red.length} test đã đỏ sẵn ở ${base} (không phải do bản bot) – đẩy: ${red.join(' | ')}`); return 0;
  } finally { try { git('worktree', 'remove', '--force', wt); } catch { fs.rmSync(wt, { recursive: true, force: true }); } }
}

if (isMain(import.meta.url)) {
  const i = process.argv.indexOf('--base');
  if (i < 0 || !process.argv[i + 1]) { console.error('dùng: node scripts/ci/bot-test-gate.mjs --base <ref>'); process.exit(2); }
  process.exit(run({ base: process.argv[i + 1] }));
}
