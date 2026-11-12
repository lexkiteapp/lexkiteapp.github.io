// Canh ĐƯỜNG ẢNH TỪ VỰNG (gọi từ ci-triage sweep, 6 giờ/lần – ~20 lệnh API). 12/11: coordinator phát hiện hai điểm mù:
//   (a) vocab-img-free đỏ 24/10→9/11 mà không ai báo riêng cho ảnh; (b) vocab-img-scene "xanh" cả ngày nhưng mọi job bị bỏ qua (plan: hết nghĩa vẽ được) → xanh giả.
// Báo khi: (1) workflow ảnh đỏ ≥ 2 lượt liền; (2) 48 giờ img.json không có commit ảnh mới mà lượt fill CÓ chạy thật (job fill/fillpub xanh) = đầu ra không tới chỉ mục.
// Không báo khi chỉ vì hết nghĩa để vẽ (lượt bị bỏ qua) – chỉ ghi vào bản tin kèm tốc độ ảnh/ngày. Một issue nhãn ci-failure (marker ci-triage:vimg), tự đóng khi hết. Test: scripts/test/vimg-watch.mjs.
export const MARK = '<!-- ci-triage:vimg -->', TITLE = 'Đường ảnh từ vựng: đỏ liền hoặc đứng';
export const WORKFLOWS = ['vocab-img-scene.yml', 'vocab-img-free.yml', 'vocab-img-publish.yml'], STREAK_MIN = 2, STALL_HOURS = 48, IMG = 'content/lexicon/img.json';
const DONE = r => r && r.status === 'completed' && !['cancelled', 'skipped'].includes(r.conclusion) && !/^pull_request/.test(r.event || '');
/** Số lượt đỏ liên tiếp mới nhất (thuần). */
export function streak(runs) { let n = 0; for (const r of [...(runs || [])].filter(DONE).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))) { if (r.conclusion !== 'failure') break; n++; } return n; }
/** Số ảnh một commit bot ghi trong thông điệp "… (N ảnh)" / "+N icon, +M Wikimedia" (thuần). */
export function addedOf(msg) { const m = String(msg || '').match(/\((\d+) ảnh\)/); if (m) return +m[1]; const a = [...String(msg || '').matchAll(/\+(\d+) (?:icon|Wikimedia)/g)]; return a.reduce((s, x) => s + +x[1], 0); }
/** Phán quyết (thuần). in = { runs: {file→lượt}, commits: [{at, msg}], realScene: số lượt fill chạy thật 48 h, now } */
export function verdict({ runs, commits, realScene, now = Date.now() }) {
  const bad = [], info = [];
  for (const f of WORKFLOWS) { const n = streak((runs || {})[f]); if (n >= STREAK_MIN) bad.push(`🔴 ${f}: đỏ ${n} lượt liền`); }
  const day = (commits || []).filter(c => now - Date.parse(c.at) < 864e5).reduce((s, c) => s + addedOf(c.msg), 0);
  const stall = !(commits || []).some(c => now - Date.parse(c.at) < STALL_HOURS * 36e5 && addedOf(c.msg) > 0);
  if (stall && realScene > 0) bad.push(`🔴 img.json không có ảnh mới ${STALL_HOURS} giờ dù ${realScene} lượt fill chạy thật xanh → đầu ra không tới chỉ mục (kiểm bước fillpub / kho m4)`);
  else if (stall) info.push(`ℹ️ ${STALL_HOURS} giờ không ảnh mới và mọi lượt fill bị bỏ qua = hết nghĩa vẽ được; muốn tăng nữa cần thêm nghĩa vào kho từ vựng (lexicon-expand) hoặc mở hàng chờ`);
  info.push(`Ảnh mới 24 giờ qua: ${day}`);
  return { bad, info, perDay: day, md: `## 🖼 Đường ảnh từ vựng\n${[...bad, ...info].map(x => '- ' + x).join('\n')}\n` };
}
export async function collect(gh, now = Date.now()) {
  const runs = {}, since = new Date(now - STALL_HOURS * 36e5).toISOString();
  for (const f of WORKFLOWS) runs[f] = ((await gh(`/actions/workflows/${f}/runs?status=completed&per_page=10`)) || {}).workflow_runs || [];
  const commits = (((await gh(`/commits?path=${IMG}&since=${since}&per_page=100`)) || [])).map(c => ({ at: c.commit.committer.date, msg: c.commit.message }));
  // lượt fill "chạy thật" = có job fill/fillpub xanh (lượt bị plan bỏ qua vẫn "success" nhưng mọi job skipped)
  let realScene = 0;
  for (const r of (runs['vocab-img-scene.yml'] || []).filter(r => DONE(r) && now - Date.parse(r.created_at) < STALL_HOURS * 36e5 && r.conclusion === 'success').slice(0, 8)) {
    const jobs = ((await gh(`/actions/runs/${r.id}/jobs?per_page=30`)) || {}).jobs || [];
    if (jobs.some(j => ['fill', 'fillpub'].includes(j.name) && j.conclusion === 'success')) realScene++;
  }
  return { runs, commits, realScene, now };
}
export async function syncIssue(gh, { bad, md }, label = 'ci-failure') {
  const open = ((await gh(`/issues?state=open&labels=${label}&per_page=100`)) || []).find(i => (i.body || '').includes(MARK));
  if (!bad.length) { if (open) await gh(`/issues/${open.number}`, { method: 'PATCH', body: { state: 'closed', state_reason: 'completed', body: open.body + '\n\n✅ Đường ảnh khoẻ lại (ci-triage tự đóng).' } }); return open ? 'closed' : 'none'; }
  const body = `${MARK}\n${md}\nGốc thường gặp: docs/VOCAB-IMG-STYLE.md · .github/workflows/vocab-img-scene.yml (fillpub) · vocab-img-free.yml.`;
  if (open) await gh(`/issues/${open.number}`, { method: 'PATCH', body: { title: TITLE, body } }); else await gh('/issues', { method: 'POST', body: { title: TITLE, body, labels: [label] } });
  return open ? 'updated' : 'opened';
}
export async function vimgWatch(gh, { now = Date.now() } = {}) { return verdict(await collect(gh, now)); }
