#!/usr/bin/env node
// Máy gác 3/4 (23/11): job `gate` của workflow nặng trên PR dừng sớm "main đỏ – chờ" khi CÙNG workflow đang đỏ trên main (23/11: 80 lượt xếp vô ích vì main đỏ).
// Script này chạy lại ĐÚNG 1 LẦN (rerun-failed-jobs, run_attempt = 1) lượt đó khi workflow ấy trên main đã hết đỏ. Dấu hiệu "dừng vì main đỏ" = gate THẤT BẠI + mọi job khác skipped
// (gate chỉ đỏ vì lý do này: lỗi API khi đọc npm test cho go=true). Chỉ PR mở, tip nhánh = sha lượt chạy (không chạy lại sha cũ – huỷ lượt của commit mới, xem heavy-rerun.mjs).
//   node scripts/ci/main-red-retry.mjs [--dry]     Env: GITHUB_TOKEN, GITHUB_REPOSITORY. Workflow: main-red-retry.yml (nhịp 10 phút do required-gate dispatch + cron lưới).
import path from 'node:path';
import { heavyFiles } from './heavy-rerun.mjs';
import { isMain } from '../lib/is-main.mjs';

const SKIP = new Set(['cancelled', 'skipped']);
/** Hàm thuần: runs main (mọi trạng thái, mới→cũ) của 1 workflow → true nếu lượt xong gần nhất (bỏ huỷ/skipped) ĐỎ. Chưa có lượt → false. */
export const mainRed = runs => { const r = (runs || []).find(x => x.status === 'completed' && !SKIP.has(x.conclusion)); return !!r && r.conclusion === 'failure'; };
/** Hàm thuần: lượt PR cần chạy lại = xong, đỏ, thuộc workflow nặng, lần chạy đầu, gate đỏ + mọi job khác skipped, và workflow đó trên main KHÔNG còn đỏ. */
export function pickRetry(runs, jobsByRun, heavy, redOf) {
  const set = new Set(heavy);
  return runs.filter(r => r.event === 'pull_request' && r.status === 'completed' && r.conclusion === 'failure' && (r.run_attempt || 1) === 1 && set.has(path.basename((r.path || '').split('@')[0])))
    .filter(r => { const js = jobsByRun[r.id] || [], g = js.find(j => j.name === 'gate'), rest = js.filter(j => j.name !== 'gate'); return g && g.conclusion === 'failure' && rest.length > 0 && rest.every(j => j.conclusion === 'skipped'); })
    .filter(r => !redOf(path.basename((r.path || '').split('@')[0])))
    .map(r => r.id);
}

async function main() {
  const dry = process.argv.includes('--dry'), repo = process.env.GITHUB_REPOSITORY, tok = process.env.GITHUB_TOKEN;
  if (!repo || !tok) { console.error('thiếu GITHUB_REPOSITORY / GITHUB_TOKEN'); process.exit(2); }
  const api = async (p, init = {}) => { const r = await fetch(`https://api.github.com/repos/${repo}${p}`, { ...init, headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json' } }); return { status: r.status, json: await r.json().catch(() => ({})) }; };
  const heavy = heavyFiles(), since = Date.now() - 3 * 864e5, cache = new Map();
  const redOf = async f => { if (!cache.has(f)) cache.set(f, mainRed((await api(`/actions/workflows/${f}/runs?branch=main&event=push&status=completed&per_page=5`)).json.workflow_runs)); return cache.get(f); };
  const prs = ((await api('/pulls?state=open&sort=updated&direction=desc&per_page=50')).json || []).filter(p => Date.parse(p.updated_at) >= since);
  let n = 0;
  for (const p of prs) {
    const runs = ((await api(`/actions/runs?head_sha=${p.head.sha}&event=pull_request&per_page=100`)).json.workflow_runs) || [];
    const cand = runs.filter(r => r.status === 'completed' && r.conclusion === 'failure' && heavy.includes(path.basename((r.path || '').split('@')[0])));
    if (!cand.length) continue;
    const jobsByRun = {}; for (const r of cand) jobsByRun[r.id] = ((await api(`/actions/runs/${r.id}/jobs?per_page=100`)).json.jobs) || [];
    for (const f of new Set(cand.map(r => path.basename((r.path || '').split('@')[0])))) await redOf(f);
    for (const id of pickRetry(runs, jobsByRun, heavy, f => cache.get(f))) {
      console.log(`#${p.number}: main đã hết đỏ → chạy lại 1 lần lượt ${id}`);
      if (!dry) { const r = await api(`/actions/runs/${id}/rerun-failed-jobs`, { method: 'POST' }); if (r.status !== 201) console.log(`::warning::rerun ${id} → HTTP ${r.status}`); }
      n++;
    }
  }
  console.log(`main-red-retry: ${n} lượt chạy lại (${prs.length} PR xét)`);
}
if (isMain(import.meta.url)) main().catch(e => { console.error(e); process.exit(1); });
