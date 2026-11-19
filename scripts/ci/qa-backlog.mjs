#!/usr/bin/env node
// Mỗi lỗi QA (workflow trong sổ ci-filler đỏ trên main) = 1 dòng trong docs/QA-BACKLOG.md: file sở hữu + cách tái hiện.
// KHÔNG mở PR/issue theo từng lỗi. Trùng khoá (workflow › job › bước) thì không thêm. Gọi từ qa-backlog.yml (workflow_run).
//   RUN_ID=… node scripts/ci/qa-backlog.mjs        (cần GITHUB_TOKEN)
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
export const FILE = 'docs/QA-BACKLOG.md';
// workflow → [file sở hữu, lệnh tái hiện cục bộ/CI]
export const OWNERS = {
  'qa-bot.yml': ['scripts/test/qa-bot.mjs', 'node scripts/test/qa-bot.mjs'],
  'visual-qa.yml': ['scripts/test/visual-qa.mjs', 'node scripts/test/visual-qa.mjs'],
  'journey-e2e.yml': ['scripts/test/journey-e2e.mjs', 'node scripts/test/journey-e2e.mjs'],
  'web-sweep.yml': ['scripts/test/web-sweep.mjs', 'node scripts/test/web-sweep.mjs'],
  'ux-cards.yml': ['scripts/test/ux-guard.mjs', 'node scripts/test/ux-guard.mjs'],
  'content-qa.yml': ['scripts/test/content-qa.mjs', 'node scripts/test/content-qa.mjs && node scripts/content-qa/gate.mjs --json'],
  'lighthouse.yml': ['.github/workflows/lighthouse.yml', 'gh workflow run lighthouse.yml --ref main'],
  'ext-e2e.yml': ['scripts/test/ext-e2e.mjs', 'node scripts/test/ext-e2e.mjs'],
};
export const key = (wf, job, step) => `${wf} › ${job} › ${step}`;
export function line({ wf, job, step, url, date }) {
  const [owner, cmd] = OWNERS[wf];
  return `- [ ] \`${key(wf, job, step)}\` | file: \`${owner}\` | repro: \`${cmd}\` (hoặc \`gh workflow run ${wf} --ref main\`) | thấy lần đầu ${date} | ${url}`;
}
// Thêm các dòng chưa có khoá; trả [nội dung mới, số dòng thêm].
export function merge(txt, items) {
  const seen = new Set(), add = items.filter(i => { const k = key(i.wf, i.job, i.step); if (!OWNERS[i.wf] || txt.includes('`' + k + '`') || seen.has(k)) return false; seen.add(k); return true; });
  return [txt.replace(/\s*$/, '\n') + add.map(line).join('\n') + (add.length ? '\n' : ''), add.length];
}
async function main() {
  const repo = process.env.GITHUB_REPOSITORY, tok = process.env.GITHUB_TOKEN, id = process.env.RUN_ID;
  const api = async p => { const r = await fetch('https://api.github.com/repos/' + repo + p, { headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json' } }); if (!r.ok) throw new Error(`${p} → ${r.status}`); return r.json(); };
  const run = await api('/actions/runs/' + id), wf = run.path.split('/').pop();
  const jobs = (await api(`/actions/runs/${id}/jobs?filter=latest&per_page=100`)).jobs.filter(j => j.conclusion === 'failure');
  const items = jobs.map(j => ({ wf, job: j.name, step: (j.steps.find(s => s.conclusion === 'failure') || { name: '?' }).name, url: j.html_url, date: (run.updated_at || '').slice(0, 10) }));
  const [out, n] = merge(fs.readFileSync(FILE, 'utf8'), items);
  console.log(`qa-backlog ${wf}: ${items.length} job đỏ, ${n} dòng mới`);
  if (n) fs.writeFileSync(FILE, out);
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main().catch(e => { console.error('qa-backlog:', e.message); process.exit(1); });
