// Canh lịch cron của workflow (gọi từ ci-triage sweep mỗi giờ): GitHub có lúc KHÔNG chạy lịch – sau khi bật lại workflow (ci-filler 02/11:
// active nhưng 0 lượt schedule), sau khi thêm cron mới (free-tier-guard '17 * * * *'), hoặc lịch bị bỏ khi tải cao. Báo đỏ khi:
//   (a) workflow có cron mà > 3 × khoảng lịch (sàn 60 phút – GitHub trễ lịch 10–30 phút lúc tải cao là bình thường) không có lượt schedule nào,
//       tính từ max(lượt schedule cuối, lúc workflow đổi trạng thái/tạo); → tự "đá" 1 lần (disable → enable: GitHub đăng ký lại lịch)
//   (b) workflow có cron đang bị tắt mà KHÔNG nằm trong OFF_OK (tắt có chủ ý), infra/jobs.json paused, hay danh sách free-tier guard đã dừng.
// Kết quả: 1 issue nhãn ci-failure "Lịch CI không chạy" (marker ci-triage:cron) – cập nhật khi còn, tự đóng khi hết. Test: scripts/test/cron-watch.mjs.
import fs from 'node:fs';
import { starts } from '../test/jobs-check.mjs';

const W = 7 * 1440;
// Tắt có chủ ý (memory/METHODS: 7 workflow GrabCast giữ TẮT tới khi all-clear + số egress) – thêm mục mới phải kèm lý do
export const OFF_OK = {
  'explain.yml': 'GrabCast: tắt tới all-clear', 'lexicon-expand.yml': 'GrabCast: tắt tới all-clear', 'script-bank.yml': 'GrabCast: tắt tới all-clear',
  'video-tpl1b.yml': 'GrabCast: tắt tới all-clear', 'video.yml': 'GrabCast: tắt tới all-clear', 'vocab-img-scene.yml': 'GrabCast: tắt tới all-clear', 'vocab-img.yml': 'GrabCast: tắt tới all-clear',
};
export const FLOOR_MIN = 60, TIMES = 3, LONG_GAP = 720, GRACE_MIN = 360;
/** Ngưỡng (phút) coi lịch là không chạy. Lịch dày: max(60, 3 × khoảng). Lịch ≥ 12 h (đêm/tuần): khoảng + 6 h – 3/11 quality-sweep bị GitHub
 *  bỏ lượt đêm 2/11 mà 3 × 1440 = 3 ngày mới báo → lượt quét đêm mất mà không ai biết. */
export const limitMin = gap => gap >= LONG_GAP ? gap + GRACE_MIN : Math.max(FLOOR_MIN, TIMES * gap);
// bù lượt (3/11): GitHub bỏ lịch HÀNG LOẠT lúc tải cao (03/11 00–03Z cả repo 13 lượt schedule) → không chỉ báo/đá mà dispatch bù.
// Ưu tiên free-tier-guard (gỡ lệnh dừng), rồi workflow trong infra/jobs.json, rồi còn lại; ≤ BACKFILL_MAX lượt mỗi lần gọi (~1 giờ).
export const BACKFILL_MAX = 5, PRIORITY = ['free-tier-guard.yml'];
/** Có dispatch bù được không (thuần): có workflow_dispatch và không có input bắt buộc thiếu mặc định. */
export function dispatchable(yml) {
  const m = String(yml).match(/^  workflow_dispatch:[^\n]*\n((?:    [^\n]*\n|\s*\n)*)/m);
  if (!m && !/^  workflow_dispatch:/m.test(yml)) return false;
  const body = m ? m[1] : '';
  for (const b of body.split(/\n(?=      [\w-]+:)/)) if (/required:\s*true/.test(b) && !/default:/.test(b)) return false;
  return true;
}
/** Thứ tự bù (thuần). */
export function backfillOrder(files, jobs = new Set()) {
  const rank = f => (PRIORITY.includes(f) ? 0 : jobs.has(f) ? 1 : 2);
  return [...files].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}
export const MARK = '<!-- ci-triage:cron -->', TITLE = 'Lịch CI không chạy (cron)';

/** Khoảng lịch dài nhất (phút) giữa 2 lượt liên tiếp của mọi dòng cron (vòng tuần). */
export function maxGap(crons) {
  const s = [...new Set(crons.flatMap(starts))].sort((a, b) => a - b);
  if (!s.length) return Infinity;
  let g = W - s[s.length - 1] + s[0];
  for (let i = 1; i < s.length; i++) g = Math.max(g, s[i] - s[i - 1]);
  return g;
}
export const cronsOf = yml => [...String(yml).matchAll(/^\s*-\s*cron:\s*['"]([^'"]+)['"]/gm)].map(m => m[1]);

/** wf: { file, state, crons, since (ms – đổi trạng thái/tạo), lastSched (ms|0) } → null | { file, why, kind } */
export function verdict(wf, now, { paused = new Set() } = {}) {
  if (!wf.crons.length) return null;
  if (wf.state !== 'active') return OFF_OK[wf.file] || paused.has(wf.file) ? null : { file: wf.file, kind: 'off', why: `đang tắt (${wf.state}) – không có trong OFF_OK / jobs.json paused / free-tier paused` };
  const gap = maxGap(wf.crons), lim = limitMin(gap), base = Math.max(wf.lastSched || 0, wf.since || 0), age = (now - base) / 6e4;
  return age > lim ? { file: wf.file, kind: 'stale', why: `${Math.round(age)} phút không có lượt schedule (ngưỡng ${lim} = ${gap >= LONG_GAP ? `${gap} + ${GRACE_MIN}` : `max(${FLOOR_MIN}, ${TIMES} × ${gap})`})` } : null;
}
export function pausedSet(root = '.') {
  const s = new Set();
  try { for (const j of JSON.parse(fs.readFileSync(`${root}/infra/jobs.json`, 'utf8')).jobs) if (j.paused === true && j.workflow) s.add(j.workflow); } catch (e) { /* bỏ qua */ }
  try { for (const w of JSON.parse(fs.readFileSync(`${root}/web/free-tier-state.json`, 'utf8')).paused || []) s.add(w); } catch (e) { /* bỏ qua */ }
  return s;
}

/** gh(path, opts) như triage.mjs. Trả { bad, md }. kick = disable → enable workflow bị trễ lịch (đăng ký lại lịch). */
export async function cronWatch(gh, { now = Date.now(), wfDir = '.github/workflows', root = '.', kick = true } = {}) {
  const list = [];
  for (let p = 1; p <= 5; p++) { const r = (await gh(`/actions/workflows?per_page=100&page=${p}`)) || {}; list.push(...(r.workflows || [])); if (!r.workflows || r.workflows.length < 100) break; }
  const paused = pausedSet(root), bad = [], stale = [];
  for (const w of list) {
    const file = w.path.split('/').pop(), f = `${wfDir}/${file}`;
    if (!fs.existsSync(f)) continue;
    const crons = cronsOf(fs.readFileSync(f, 'utf8')); if (!crons.length) continue;
    const last = ((((await gh(`/actions/workflows/${w.id}/runs?event=schedule&per_page=1`)) || {}).workflow_runs) || [])[0];
    const v = verdict({ file, state: w.state, crons, since: Date.parse(w.updated_at || w.created_at) || 0, lastSched: last ? Date.parse(last.created_at) : 0 }, now, { paused });
    if (!v) continue;
    if (v.kind === 'stale' && kick) { await gh(`/actions/workflows/${w.id}/disable`, { method: 'PUT' }); await gh(`/actions/workflows/${w.id}/enable`, { method: 'PUT' }); v.why += ' → đã đá lại lịch (disable → enable)'; }
    if (v.kind === 'stale') stale.push({ v, w, file, yml: fs.readFileSync(f, 'utf8'), lim: Math.max(FLOOR_MIN, TIMES * maxGap(crons)) });
    bad.push(v);
  }
  if (kick) {   // bù lượt: chống trùng = bỏ qua nếu đang có lượt chờ/chạy hoặc đã có lượt (bất kỳ sự kiện) trong 1 khoảng lịch; concurrency của workflow lo phần còn lại
    let used = 0; const jobs = new Set(); try { for (const j of JSON.parse(fs.readFileSync(`${root}/infra/jobs.json`, 'utf8')).jobs) if (j.workflow) jobs.add(j.workflow); } catch (e) { /* bỏ qua */ }
    const byFile = new Map(stale.map(x => [x.file, x]));
    for (const file of backfillOrder(byFile.keys(), jobs)) {
      const { v, w, yml } = byFile.get(file);
      if (!dispatchable(yml)) { v.why += ' · không bù được (không có workflow_dispatch/input bắt buộc)'; continue; }
      if (used >= BACKFILL_MAX) { v.why += ` · chờ bù lượt sau (trần ${BACKFILL_MAX}/giờ)`; continue; }
      const last = ((((await gh(`/actions/workflows/${w.id}/runs?per_page=1`)) || {}).workflow_runs) || [])[0];
      if (last && (last.status !== 'completed' || now - Date.parse(last.created_at) < maxGap(cronsOf(yml)) * 6e4)) { v.why += ` · đã có lượt ${last.event} ${last.status} gần đây – không bù`; continue; }
      const r = await gh(`/actions/workflows/${w.id}/dispatches`, { method: 'POST', body: { ref: 'main' } });
      if (r !== false) { used++; v.why += ' → đã dispatch bù 1 lượt'; v.backfilled = true; }
    }
  }
  const md = bad.length ? `#### ⛔ Lịch CI không chạy (${bad.length})\n` + bad.map(b => `- \`${b.file}\`: ${b.why}`).join('\n') + '\n' : '- Lịch cron: mọi workflow có lượt schedule đúng hạn.\n';
  return { bad, md };
}
/** Issue: còn lỗi → mở/cập nhật; hết → đóng. */
export async function syncIssue(gh, { bad, md }, label = 'ci-failure') {
  const open = ((await gh(`/issues?state=open&labels=${label}&per_page=100`)) || []).find(i => (i.body || '').includes(MARK));
  if (!bad.length) { if (open) await gh(`/issues/${open.number}`, { method: 'PATCH', body: { state: 'closed', state_reason: 'completed', body: open.body + '\n\n✅ Mọi lịch chạy lại đúng hạn (ci-triage tự đóng).' } }); return open ? 'closed' : 'ok'; }
  const body = `${MARK}\n${md}\nSửa: push 1 commit chạm workflow (GitHub đăng ký lại lịch) hoặc disable → enable; tắt có chủ ý → thêm vào OFF_OK (scripts/ci/cron-watch.mjs) kèm lý do.`;
  if (open) await gh(`/issues/${open.number}`, { method: 'PATCH', body: { title: TITLE, body } });
  else await gh('/issues', { method: 'POST', body: { title: TITLE, body, labels: [label] } });
  return open ? 'updated' : 'opened';
}
