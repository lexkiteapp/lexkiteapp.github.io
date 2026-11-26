// Báo cáo tỉ lệ chập chờn hằng tuần của các bài đo hiệu năng (16/11, điều phối): "chập chờn" = lượt chạy xanh chỉ sau khi chạy lại (run_attempt > 1) – cùng mã lúc đỏ lúc xanh.
// Chỉ ĐỌC API. Dùng: node scripts/ci/perf-flake.mjs [--days 7] [--out perf-flake.md]   (GITHUB_TOKEN + GITHUB_REPOSITORY trong CI)
import fs from 'node:fs';
export const WORKFLOWS = ['call-rt', 'story-stage', 'scroll-perf', 'mobile-qa', 'ux-cards'];

/** Hàm thuần: runs = workflow_runs của 1 workflow trong kỳ → thống kê. Bỏ lượt đang chạy/bị huỷ/bỏ qua (không có kết luận về mã). */
export function summarize(runs = []) {
  const done = runs.filter(r => r.conclusion === 'success' || r.conclusion === 'failure');
  const failed = done.filter(r => r.conclusion === 'failure');
  const flaky = done.filter(r => r.conclusion === 'success' && (r.run_attempt || 1) > 1);   // xanh sau khi chạy lại
  const bySha = new Map(); for (const r of failed) bySha.set(r.head_sha, (bySha.get(r.head_sha) || 0) + 1);
  const repeatRed = [...bySha.values()].filter(n => n >= 2).length;                         // cùng sha đỏ ≥ 2 lượt = nhiều khả năng lỗi thật, không phải nhiễu
  const n = done.length;
  return { runs: n, failed: failed.length, flaky: flaky.length, repeatRed, flakePct: n ? Math.round((1000 * flaky.length) / n) / 10 : 0, failPct: n ? Math.round((1000 * failed.length) / n) / 10 : 0 };
}

export function toMarkdown(rows, days, now = new Date()) {
  const lines = [`# Chập chờn hiệu năng – ${days} ngày tới ${now.toISOString().slice(0, 10)}`, '', 'Chập chờn = xanh chỉ sau khi chạy lại (cùng mã). "Đỏ lặp" = cùng sha đỏ ≥ 2 lượt (nghiêng về lỗi thật).', '',
    '| Workflow | Lượt | Đỏ | Đỏ % | Xanh sau chạy lại | Chập chờn % | Sha đỏ lặp |', '|---|---|---|---|---|---|---|'];
  for (const [w, s] of rows) lines.push(`| ${w} | ${s.runs} | ${s.failed} | ${s.failPct} | ${s.flaky} | ${s.flakePct} | ${s.repeatRed} |`);
  const hot = rows.filter(([, s]) => s.runs >= 5 && s.flakePct >= 10).map(([w]) => w);
  lines.push('', hot.length ? `⚠️ Chập chờn ≥ 10 %: ${hot.join(', ')} → xem hiệu chuẩn CPU (scripts/test/lib/perf-calibrate.mjs, docs/CI-RUNNERS.md).` : '✓ Không workflow nào chập chờn ≥ 10 %.');
  return lines.join('\n') + '\n';
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const days = +arg('--days', 7), out = arg('--out', 'perf-flake.md'), repo = process.env.GITHUB_REPOSITORY || 'lexkiteapp/lexkiteapp.github.io', tok = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10), rows = [];
  for (const w of WORKFLOWS) {
    const runs = [];
    for (let p = 1; p <= 5; p++) {
      const r = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${w}.yml/runs?per_page=100&page=${p}&created=>=${since}`, { headers: { authorization: `Bearer ${tok}`, accept: 'application/vnd.github+json' } });
      if (!r.ok) { console.error(`${w}: ${r.status}`); break; }
      const j = await r.json(); runs.push(...(j.workflow_runs || [])); if ((j.workflow_runs || []).length < 100) break;
    }
    rows.push([w, summarize(runs)]);
  }
  const md = toMarkdown(rows, days); fs.writeFileSync(out, md); console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}
