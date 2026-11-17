#!/usr/bin/env node
// Bảng sức khoẻ hệ thống (docs/HEALTH-BOARD.md): workflow TẮT / ĐỎ / QUÁ HẠN cron / SẢN LƯỢNG 0 → bảng xếp theo mức nghiêm trọng.
//   node scripts/ops/health-board.mjs            in bảng (máy cục bộ, qua scripts/ci/gh-api.sh để có proxy)
//   node scripts/ops/health-board.mjs --issue    cập nhật issue cố định "Sức khoẻ hệ thống" (CI, cần GITHUB_TOKEN issues:write)
//   --json  in JSON; thoát 1 khi có mục đỏ (critical/high) để job đỏ → điều phối thấy ngay (health-board.yml).
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ghApi, REPO } from '../ci/gh-api.mjs';
import { classify, crons, rank, render, redCount } from '../lib/health-board.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TITLE = 'Sức khoẻ hệ thống';
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); } catch { return d; } };
const api = async p => { const r = await ghApi('GET', `/repos/${REPO}${p}`); if (r.status >= 400 || !r.body) throw new Error(`GET ${p} → ${r.status}${r.rateLimited ? ' (hạn mức)' : ''}`); return r.body; };

export async function collect() {
  const floors = readJson('infra/yield-floors.json', {}), offs = readJson('infra/health-expected-off.json', {});
  const wfs = []; for (let p = 1; ; p++) { const b = await api(`/actions/workflows?per_page=100&page=${p}`); wfs.push(...b.workflows); if (b.workflows.length < 100) break; }
  const own = wfs.filter(w => w.path.startsWith('.github/workflows/') && !/dynamic/.test(w.path));
  const findings = []; let i = 0;
  const work = async () => {
    for (; i < own.length;) {
      const w = own[i++], file = path.basename(w.path), id = file.replace(/\.yml$/, '');
      let runs = [];
      try { runs = (await api(`/actions/workflows/${w.id}/runs?per_page=15&exclude_pull_requests=true`)).workflow_runs.filter(r => r.event !== 'pull_request' && r.event !== 'pull_request_target' && r.status === 'completed'); } catch (e) { findings.push({ sev: 'warn', kind: 'đọc lỗi', wf: file, name: w.name, msg: e.message }); continue; }
      let src = ''; try { src = fs.readFileSync(path.join(ROOT, w.path), 'utf8'); } catch { /* workflow đã xoá khỏi cây */ }
      const y = readJson(`reports/yield/${id}.json`, null);
      findings.push(...classify({ wf: { name: w.name, file, state: w.state }, runs, cronList: crons(src), floor: floors[id], yieldRuns: y && y.runs, off: offs[id] }));
    }
  };
  await Promise.all(Array.from({ length: 6 }, work));
  return { findings: rank(findings), total: own.length };
}

async function upsertIssue(body) {
  const list = await api(`/issues?state=open&labels=health-board&per_page=10`);
  const cur = list.find(i => i.title === TITLE && !i.pull_request);
  if (cur) { if (cur.body !== body) await ghApi('PATCH', `/repos/${REPO}/issues/${cur.number}`, { data: { body } }); return cur.number; }
  await ghApi('POST', `/repos/${REPO}/labels`, { data: { name: 'health-board', color: 'd93f0b', description: 'Bảng sức khoẻ hệ thống (health-board.yml)' } });
  const r = await ghApi('POST', `/repos/${REPO}/issues`, { data: { title: TITLE, body, labels: ['health-board'] } });
  return r.body && r.body.number;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { findings, total } = await collect();
  const run = process.env.GITHUB_RUN_ID ? `https://github.com/${REPO}/actions/runs/${process.env.GITHUB_RUN_ID}` : '';
  const body = render(findings, { total, run });
  if (process.argv.includes('--json')) console.log(JSON.stringify(findings, null, 1)); else console.log(body);
  if (process.argv.includes('--issue')) console.log('issue #' + await upsertIssue(body));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, body);
  const n = redCount(findings);
  if (n) { console.error(`::error title=health-board::${n} mục đỏ – xem issue "${TITLE}"`); process.exit(1); }
}
