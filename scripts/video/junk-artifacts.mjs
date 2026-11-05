#!/usr/bin/env node
// Dọn artifact Actions rác của video (tv-*, tvo-*, cine/motion render…). Mặc định CHỈ LIỆT KÊ (dry-run) → manifest; `--apply` mới xoá.
//   node scripts/video/junk-artifacts.mjs --out manifest.json [--apply] [--max-pages 400] [--min-age-hours 24] [--max-delete 2000] [--stats]
// Lý do được xoá (và chỉ các lý do này):
//   failed-run   artifact của lượt chạy failure/cancelled/timed_out/startup_failure
// Phạm vi: chỉ artifact có tên video (VIDEO_RE). 
//   superseded   cùng tiền tố tên (chỉ bỏ hậu tố số/sha cuối; số giữa giữ nguyên) + cùng nhánh, đã có lượt MỚI hơn → giữ bản mới nhất, xoá bản cũ
//   gone-episode tên tv-/tvo-<tập>… mà <tập> không còn trong repo (content/video/**) và artifact > 3 ngày
// KHÔNG BAO GIỜ: `tv-bank-*` của lượt thành công trên main; artifact trẻ hơn --min-age-hours (lượt đang chạy); lượt chưa rõ trạng thái.
// Dùng scripts/ci/gh-api.mjs (ETag, hạn mức). Docs: docs/VIDEO-STORAGE.md § "Dọn video rác". Test: scripts/test/video-junk.py (thuần: classify).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ghApi, REPO } from '../ci/gh-api.mjs';

/** Chỉ động tới artifact video (tiền tố tên); QA/ảnh/font… của workflow khác không thuộc phạm vi. */
export const VIDEO_RE = /^(tvo?|cine|motion|video|mvo?|matte|shorts?|render|teach|lesson-embed|footage|bank|library|news|tpl|anchor)[-_]/i;
const BAD_RUN = ['failure', 'cancelled', 'timed_out', 'startup_failure'];
const DAY = 86400e3;

/** Tiền tố ổn định của tên artifact (thuần): chỉ bỏ hậu tố số lượt / sha ở CUỐI tên.
 *  Số đứng giữa GIỮ NGUYÊN: t2/t3/t4 là bản mẫu khác nhau, e2e-100/e2e-102 là bài khác nhau – gộp chúng (#) từng làm
 *  660 artifact / 16 GB bị coi "superseded" sai (05/11). */
export function prefixOf(name) {
  return String(name).toLowerCase().replace(/[-_.]?(?:\d{4,}|[0-9a-f]{7,40})$/, '');
}
/** Khoá nhóm "superseded" (thuần): cùng tiền tố VÀ cùng nhánh – bản của nhánh/PR khác không thay được bản này. */
export function groupOf(a) {
  return prefixOf(a.name) + '@' + String(a.workflow_run?.head_branch ?? '');
}
/** Tập id tập phim còn trong repo (thuần): tên file/thư mục dưới content/video (chữ thường, bỏ đuôi). */
export function episodeIds(names) {
  const s = new Set();
  for (const n of names) { const b = String(n).toLowerCase().replace(/\.[a-z0-9]{1,5}$/, ''); if (b.length >= 3) { s.add(b); for (const t of b.split(/[-_.]/)) if (t.length >= 3) s.add(t); } }
  return s;
}
/** Phần "tập" trong tên tv-/tvo- (thuần) hoặc null: tv-<tập>[-bank|-render…]. */
export function episodeOf(name) {
  const m = String(name).toLowerCase().match(/^tvo?-(?!bank)([a-z][a-z0-9]{2,}(?:[-_][a-z][a-z0-9]*)*?)(?:-(?:bank|render|final|video|audio|frames|qc|log)s?)?(?:[-_]?(?:\d{4,}|[0-9a-f]{7,40}))?$/);
  return m ? m[1] : null;
}
/**
 * Phân loại (thuần, có test): arts = [{id,name,size_in_bytes,expired,created_at,workflow_run:{id,head_branch}}],
 * badRuns = Map runId → conclusion, known = Set id tập còn trong repo, now ms. → [{id,name,bytes,created_at,run_id,reason}] (chỉ mục rác).
 */
export function classify(arts, { badRuns = new Map(), known = new Set(), now = Date.now(), minAgeH = 24, hasKnown = true } = {}) {
  const junk = [], live = arts.filter(a => !a.expired && VIDEO_RE.test(a.name));
  const age = a => now - Date.parse(a.created_at);
  const failedRun = a => badRuns.has(a.workflow_run?.id);
  const protectedBank = a => /^tv-bank-/i.test(a.name) && a.workflow_run?.head_branch === 'main' && !failedRun(a);
  const good = live.filter(a => !failedRun(a));
  const newest = new Map();   // tiền tố@nhánh → artifact mới nhất của lượt không hỏng
  for (const a of good) { const k = groupOf(a); const b = newest.get(k); if (!b || Date.parse(a.created_at) > Date.parse(b.created_at)) newest.set(k, a); }
  for (const a of live) {
    if (protectedBank(a) || age(a) < minAgeH * 3600e3) continue;
    let reason = null;
    if (failedRun(a)) reason = 'failed-run';
    else {
      const top = newest.get(groupOf(a));
      if (top && top.id !== a.id && a.workflow_run?.id !== top.workflow_run?.id && Date.parse(top.created_at) > Date.parse(a.created_at)) reason = 'superseded';
      else if (hasKnown && /^tvo?-/i.test(a.name) && age(a) > 3 * DAY) { const ep = episodeOf(a.name); if (ep && !known.has(ep) && !ep.split(/[-_]/).some(t => known.has(t) && t.length >= 4)) reason = 'gone-episode'; }
    }
    if (reason) junk.push({ id: a.id, name: a.name, bytes: a.size_in_bytes, created_at: a.created_at, run_id: a.workflow_run?.id ?? null, reason });
  }
  return junk;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(p, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const r = await ghApi('GET', p);
    if (r.status === 200) return r.body;
    if (r.rateLimited && r.status === 0) throw Object.assign(new Error('rate-limited'), { code: 75 });
    if (r.status >= 500 || r.status === 0) { await sleep(800 * (i + 1)); continue; }
    return null;
  }
  return null;   // trang lỗi dai dẳng → bỏ qua (ghi cảnh báo), không coi là rác
}
function walkNames(dir, depth, out) {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) { out.push(e.name); if (e.isDirectory() && depth > 0) walkNames(path.join(dir, e.name), depth - 1, out); }
}

async function main() {
  const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
  const apply = a.includes('--apply'), out = opt('--out', 'junk-artifacts.json'), maxPages = +opt('--max-pages', 400), minAgeH = +opt('--min-age-hours', 24), maxDelete = +opt('--max-delete', 2000);
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), base = `/repos/${REPO}`;
  const arts = [], warn = []; let total = 0;
  for (let p = 1; p <= maxPages; p++) {
    const d = await get(`${base}/actions/artifacts?per_page=100&page=${p}`);
    if (!d) { warn.push(`artifacts page ${p} lỗi`); if (warn.length > 8) break; continue; }
    total = d.total_count; if (!d.artifacts.length) break; arts.push(...d.artifacts);
    if (arts.length >= total) break;
  }
  const live = arts.filter(x => !x.expired), oldest = live.reduce((m, x) => Math.min(m, Date.parse(x.created_at)), Date.now());
  const badRuns = new Map();
  for (const st of BAD_RUN) for (let p = 1; p <= 120; p++) {
    const d = await get(`${base}/actions/runs?status=${st}&per_page=100&page=${p}`);
    if (!d) { warn.push(`runs ${st} page ${p} lỗi`); break; }
    const rs = d.workflow_runs || []; if (!rs.length) break;
    for (const r of rs) badRuns.set(r.id, r.conclusion || st);
    if (Date.parse(rs[rs.length - 1].created_at) < oldest) break;
  }
  const names = []; walkNames(path.join(root, 'content/video'), 4, names);
  const known = episodeIds(names);
  const junk = classify(arts, { badRuns, known, minAgeH, hasKnown: known.size > 20 });
  const sum = {}; for (const j of junk) { const s = sum[j.reason] ||= { count: 0, bytes: 0 }; s.count++; s.bytes += j.bytes; }
  for (const s of Object.values(sum)) s.gb = +(s.bytes / 1e9).toFixed(3);
  const man = { version: 1, repo: REPO, created: new Date().toISOString(), apply, totals: { listed: arts.length, live: live.length, reported_total: total, bad_runs: badRuns.size, live_gb: +(live.reduce((s, x) => s + x.size_in_bytes, 0) / 1e9).toFixed(3) }, summary: sum, warnings: warn, junk };
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(man, null, 1));
  const gb = junk.reduce((s, j) => s + j.bytes, 0) / 1e9;
  const lines = [`artifact: ${arts.length}/${total} liệt kê, ${live.length} còn hạn (${man.totals.live_gb} GB); rác ${junk.length} = ${gb.toFixed(2)} GB`, ...Object.entries(sum).map(([k, v]) => `  ${k}: ${v.count} · ${v.gb} GB`), ...warn.map(w => '⚠ ' + w)];
  console.log(lines.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Artifact rác (${apply ? 'ĐÃ XOÁ' : 'dry-run'})\n\n` + lines.map(l => '- ' + l.trim()).join('\n') + '\n');
  if (!apply) return;
  let del = 0, freed = 0, fail = 0;
  for (const j of junk.slice(0, maxDelete)) {
    const r = await ghApi('DELETE', `${base}/actions/artifacts/${j.id}`);
    if (r.status === 204 || r.status === 404) { del++; freed += j.bytes; j.deleted = true; } else if (r.rateLimited && r.status === 0) { console.error('rate-limited: dừng xoá, chạy lại sau'); break; } else { fail++; j.error = r.status; }
  }
  man.deleted = { count: del, bytes: freed, gb: +(freed / 1e9).toFixed(3), failed: fail };
  fs.writeFileSync(out, JSON.stringify(man, null, 1));
  console.log(`đã xoá ${del} artifact (${(freed / 1e9).toFixed(2)} GB), lỗi ${fail}`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- đã xoá ${del} (${(freed / 1e9).toFixed(2)} GB), lỗi ${fail}\n`);
  if (fail > 5) process.exit(1);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main().catch(e => { console.error(e.message); process.exit(e.code || 1); });
