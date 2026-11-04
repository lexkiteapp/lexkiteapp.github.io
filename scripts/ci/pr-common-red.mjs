// Lỗi CHUNG trên nhiều PR: cùng 1 check đỏ ở ≥ MIN PR đang mở → gốc thường ở main/workflow, không ở từng PR.
// 3/11: ~50 PR mở, phần lớn đỏ cùng vài check (size-budget kẹt trần trên main, before-after đỏ khi bot bị huỷ…) suốt 2 ngày mà
// ci-triage im lặng – nó chỉ nhìn lượt chạy trên main/lịch, không nhìn PR. Mô-đun này gom check đỏ theo tên trên mọi PR mở
// (gọi từ triage.mjs sweep, 3 giờ/lần + bản tin ngày) → tóm tắt job + 1 issue ci-failure tự đóng khi hết. Test: scripts/test/ci-triage.mjs
export const MIN = 3;
const MARK = '<!-- ci-triage:common-red -->', TITLE = 'CI: cùng check đỏ trên nhiều PR (gốc chung ở main/workflow?)';
// Tên check của job ma trận dạng "render (x, short)" → gộp về "render" (mỗi PR một tham số khác nhau vẫn là cùng 1 bước)
const base = n => String(n).replace(/\s*\(.*\)\s*$/, '');

/** prs: [{ number, failed: [tên check] }] → { groups: [{ check, prs: [số] }] (nhiều PR nhất trước), md, text } (thuần). */
export function commonRed(prs, min = MIN) {
  const by = {};
  for (const p of prs) for (const c of new Set((p.failed || []).map(base))) (by[c] = by[c] || []).push(p.number);
  const groups = Object.entries(by).filter(([, v]) => v.length >= min).map(([check, v]) => ({ check, prs: v.sort((a, b) => a - b) }))
    .sort((a, b) => b.prs.length - a.prs.length || a.check.localeCompare(b.check));
  const lines = groups.map(g => `- \`${g.check}\` đỏ ở ${g.prs.length}/${prs.length} PR: ${g.prs.map(n => '#' + n).join(' ')}`);
  const text = groups.length ? `${groups.length} check đỏ chung (≥ ${min} PR):\n${lines.join('\n')}` : `không có check đỏ chung (≥ ${min} PR) trên ${prs.length} PR mở`;
  return { groups, text, md: `## 🧩 Check đỏ chung trên PR mở\n${text}\n\nĐọc log 2–3 PR + main: gốc ở main/workflow → sửa 1 lần lên main, gộp trước các PR khác.\n` };
}

/** Đọc check đỏ (failure/timed_out) của commit đầu mỗi PR mở. Bỏ PR nháp. */
export async function scanPrs(gh) {
  const pulls = ((await gh('/pulls?state=open&per_page=100')) || []).filter(p => !p.draft);
  const out = [];
  for (const p of pulls) {
    const runs = ((await gh(`/commits/${p.head.sha}/check-runs?per_page=100&filter=latest`)) || {}).check_runs || [];
    out.push({ number: p.number, failed: runs.filter(r => ['failure', 'timed_out'].includes(r.conclusion)).map(r => r.name) });
  }
  return out;
}

export async function syncIssue(gh, { groups, md }, label = 'ci-failure') {
  const open = ((await gh(`/issues?state=open&labels=${label}&per_page=100`)) || []).find(i => (i.body || '').includes(MARK));
  if (!groups.length) { if (open) await gh(`/issues/${open.number}`, { method: 'PATCH', body: { state: 'closed', state_reason: 'completed', body: open.body + '\n\n✅ Hết check đỏ chung trên PR (ci-triage tự đóng).' } }); return open ? 'closed' : 'none'; }
  const body = `${MARK}\n${md}`;
  if (open) await gh(`/issues/${open.number}`, { method: 'PATCH', body: { title: TITLE, body } });
  else await gh('/issues', { method: 'POST', body: { title: TITLE, body, labels: [label] } });
  return open ? 'updated' : 'opened';
}
