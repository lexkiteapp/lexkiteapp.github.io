// 🌍 Kết luận lượt gần nhất trên main của các cổng QA máy (GitHub API, GITHUB_TOKEN) + số đo mobile-qa (artifact report.json)
// → reports/world/ci.json cho bảng World. Không gọi host Lexkite. Dùng (CI): node scripts/world/ci-status.mjs
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const REPO = process.env.GITHUB_REPOSITORY || 'lexkiteapp/lexkiteapp.github.io', T = process.env.GITHUB_TOKEN;
if (!T) { console.error('thiếu GITHUB_TOKEN'); process.exit(75); }
// npm-test = ci.yml (không có file npm-test.yml: cổng này từng luôn null). Danh sách dùng chung với bản tin ci-triage.
import { CORE_TESTS } from '../ci/triage.mjs';
const WF = Object.entries(CORE_TESTS);
const H = { Authorization: `Bearer ${T}`, Accept: 'application/vnd.github+json' };
const api = p => fetch(`https://api.github.com/repos/${REPO}/${p}`, { headers: H }).then(r => r.ok ? r.json() : null).catch(() => null);
const out = { at: new Date().toISOString(), workflows: {}, mobile: null };
for (const [key, w] of WF) {
  const j = await api(`actions/workflows/${w}/runs?branch=main&status=completed&per_page=5`);
  const run = j && (j.workflow_runs || []).find(r => !['cancelled', 'skipped'].includes(r.conclusion));
  out.workflows[key] = run ? { conclusion: run.conclusion, at: run.updated_at, id: run.id } : null;
}
const mq = out.workflows['mobile-qa'];
if (mq) try {
  const arts = await api(`actions/runs/${mq.id}/artifacts`), art = arts && arts.artifacts.find(a => a.name === 'mobile-qa' && !a.expired);
  if (art) {
    const r = await fetch(art.archive_download_url, { headers: H }); fs.writeFileSync('/tmp/mqa.zip', Buffer.from(await r.arrayBuffer()));
    const rep = JSON.parse(execFileSync('unzip', ['-p', '/tmp/mqa.zip', 'report.json'], { encoding: 'utf8', maxBuffer: 64 << 20 }));
    out.mobile = { maxLcp: rep.maxLcp, maxCls: rep.maxCls, maxInp: rep.maxInp, maxTbt: rep.maxTbt, at: rep.at };
  }
} catch (e) { console.error('mobile-qa artifact: ' + e.message); }
fs.mkdirSync('reports/world', { recursive: true }); fs.writeFileSync('reports/world/ci.json', JSON.stringify(out, null, 1) + '\n');
const n = Object.values(out.workflows).filter(Boolean).length; console.log(JSON.stringify(out)); if (!n) { console.error('✗ 0 cổng có kết luận'); process.exit(1); }
