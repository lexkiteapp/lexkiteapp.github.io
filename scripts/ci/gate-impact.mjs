// gate-impact (17/11, điều phối): PR đổi tệp CỔNG (scripts/test/*, lib/*rules*, ci-policy, baseline, workflows) phải biết TRƯỚC khi merge PR nào đang mở sẽ đỏ,
// thay vì merge xong 30 PR cùng đỏ và gộp main 30 lần (~100 job/PR). Workflow gate-impact.yml: select (chọn PR + lệnh) → check (matrix, mỗi PR 1 job: ghi đè tệp cổng của PR lên head PR đó rồi chạy các lệnh) → report (1 comment trên PR cổng).
//   node scripts/ci/gate-impact.mjs select --self N --base SHA --head SHA     (in matrix JSON + cmds vào $GITHUB_OUTPUT; cần token đọc)
//   node scripts/ci/gate-impact.mjs run --pr N --sha S --gate SHA --files-file F --cmds-file F --out R.json   (trong job matrix: không token)
//   node scripts/ci/gate-impact.mjs report --self N --dir artifacts                (comment; cần pull-requests: write)
// Quy ước merge cổng theo đợt: docs/CI-RUNNERS.md § gate-impact. Test: scripts/test/gate-impact.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const MAX_PRS = 5, MAX_CMDS = 40, MARK = '<!-- gate-impact -->';
export const GATE_RE = /^(scripts\/test\/|scripts\/lib\/[^/]*rules[^/]*$|scripts\/test\/ci-policy|scripts\/ci\/(required-gate|gate-[\w-]+|guards|shards)\.mjs$|\.github\/workflows\/|[^]*baseline[^/]*\.json$)/;
export const isGateFile = f => GATE_RE.test(f);
export const gateFiles = (changed = []) => changed.filter(isGateFile);

/** Hàm thuần: tệp cổng PR đổi + suite.txt + đọc nguồn → các lệnh test cần chạy trên head PR khác. Tệp test → lệnh của nó; tệp khác → lệnh trong suite mà nguồn nhắc tên tệp; workflow → ci-policy/workflow-yaml. */
export function impactCmds(changed = [], suiteText = '', readSrc = () => '') {
  const gates = gateFiles(changed), lines = String(suiteText).split('\n').map(l => l.trim()).filter(l => l.startsWith('node scripts/'));
  const out = new Set(), script = l => l.split(/\s+/)[1];
  for (const f of gates) {
    if (/^scripts\/test\/[\w.-]+\.mjs$/.test(f)) lines.filter(l => script(l) === f).forEach(l => out.add(l));
    else if (/^\.github\/workflows\//.test(f)) lines.filter(l => /\/(ci-policy|workflow-yaml)\.mjs$/.test(script(l))).forEach(l => out.add(l));
    else { const b = path.basename(f); lines.filter(l => { try { return readSrc(script(l)).includes(b); } catch { return false; } }).forEach(l => out.add(l)); }
  }
  return { cmds: [...out].slice(0, MAX_CMDS), truncated: out.size > MAX_CMDS, gates };
}
/** Hàm thuần: PR đang mở → danh sách PR cần thử (cùng repo, không nháp, không phải PR cổng, PR mới nhất trước khi vượt trần, tối đa max). */
export function selectPrs(pulls = [], self, repo, max = MAX_PRS) {
  const ok = pulls.filter(p => p.number !== self && !p.draft && p.state !== 'closed' && p.head?.repo?.full_name === repo).sort((a, b) => a.number - b.number);
  return { prs: ok.slice(-max).map(p => ({ pr: p.number, sha: p.head.sha })), skipped: Math.max(0, ok.length - max), forks: pulls.filter(p => p.number !== self && p.head?.repo?.full_name !== repo).length };
}
/** Hàm thuần: tệp overlay = tệp cổng PR cổng đổi (trong scripts/ hoặc workflows) trừ tệp head PR kia cũng đổi (giữ nguyên bản của họ). */
export const overlayOf = (gate = [], prChanged = []) => gate.filter(f => /^(scripts|\.github)\//.test(f) && !new Set(prChanged).has(f));
/** Hàm thuần: results [{ pr, sha, ok, error, bad:[{cmd,tail}] , skipped }] → { red, ok, md }. */
export function render(results = [], { self, cmds = [], skipped = 0 } = {}) {
  const red = results.filter(r => r.ok === false && !r.error), unk = results.filter(r => r.error), good = results.filter(r => r.ok);
  let md = `${MARK}\n### 🚦 Tác động đổi cổng lên PR đang mở\nPR #${self} đổi tệp cổng; đã chạy ${cmds.length} lệnh cổng mới trên head ${results.length} PR khác.\n\n`;
  md += red.length ? `**${red.length} PR sẽ ĐỎ** nếu merge PR này (sửa trước hoặc gom cùng đợt merge):\n` + red.map(r => `- #${r.pr}: ${r.bad.map(b => `\`${b.cmd.replace(/^node scripts\//, '')}\`${b.tail ? ` – ${b.tail}` : ''}`).join('; ')}`).join('\n') + '\n' : '✅ Không PR nào đỏ vì thay đổi này.\n';
  if (unk.length) md += `\n⚠️ Không đo được (hạ tầng, không tính đỏ): ${unk.map(r => '#' + r.pr).join(', ')}\n`;
  if (skipped) md += `\n⚠️ ${skipped} PR vượt trần ${MAX_PRS} không được thử.\n`;
  md += `\n${good.length} PR vẫn xanh. **Quy ước:** PR cổng chỉ merge trong đợt hằng ngày (02:00Z) sau khi mọi PR đỏ ở trên đã sửa hoặc nằm trong đợt; cả đợt gộp main một lần.\n`;
  return { red, ok: !red.length, md };
}

const sh = (c, a, o = {}) => execFileSync(c, a, { encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'pipe'], ...o });
const arg = (a, k, d = '') => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
const gh = async (p, o = {}) => { const r = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${p}`, { method: o.method || 'GET', headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json' }, body: o.body && JSON.stringify(o.body) }); if (!r.ok) { const e = new Error(`GitHub ${r.status} ${p}`); e.status = r.status; e.retryAfter = +r.headers.get('retry-after') || 0; throw e; } return r.json(); };
/** Đăng/cập nhật comment báo cáo. Lỗi tạm hoặc 403 (rate limit/quyền của token) KHÔNG làm đỏ job (26/11: report đỏ trên #1938 vì 403 khi POST /comments, không phải lỗi mã): thử lại 3 lần
 *  (429/403/5xx, chờ retry-after ≤ 60 s), vẫn lỗi → trả { posted:false, error } để gọi ::warning::. Báo cáo luôn đã ghi ở job summary; luật impact (PR nào sẽ đỏ) không phụ thuộc comment. */
export async function postReport(api, self, md, { sleep = ms => new Promise(r => setTimeout(r, ms)), tries = 3 } = {}) {
  let last = '';
  for (let i = 0; i < tries; i++) {
    try {
      const cs = await api(`/issues/${self}/comments?per_page=100`), mine = cs.find(c => (c.body || '').includes(MARK));
      if (mine) await api(`/issues/comments/${mine.id}`, { method: 'PATCH', body: { body: md } }); else await api(`/issues/${self}/comments`, { method: 'POST', body: { body: md } });
      return { posted: true };
    } catch (e) {
      last = String(e.message || e); const st = e.status || 0;
      if (st && st !== 403 && st !== 429 && st < 500) break; // 4xx khác (404/422…): thử lại vô ích
      if (i + 1 < tries) await sleep(Math.min(60, e.retryAfter || 15 * (i + 1)) * 1000);
    }
  }
  return { posted: false, error: last };
}
async function main() {
  const a = process.argv.slice(2), mode = a[0], out = process.env.GITHUB_OUTPUT;
  if (mode === 'select') {
    const self = +arg(a, '--self'), changed = sh('git', ['diff', '--name-only', arg(a, '--base'), arg(a, '--head')]).split('\n').filter(Boolean);
    const plan = impactCmds(changed, fs.readFileSync('scripts/test/suite.txt', 'utf8'), f => fs.readFileSync(f, 'utf8'));
    const pulls = []; for (let p = 1; p <= 3; p++) { const x = await gh(`/pulls?state=open&per_page=100&page=${p}`); pulls.push(...x); if (x.length < 100) break; }
    const sel = selectPrs(pulls, self, process.env.GITHUB_REPOSITORY), run = plan.cmds.length && sel.prs.length;
    console.log(`cổng đổi: ${plan.gates.length} tệp · ${plan.cmds.length} lệnh · ${sel.prs.length} PR (bỏ ${sel.skipped} vượt trần, ${sel.forks} fork)`);
    fs.writeFileSync('gate-impact-files.txt', plan.gates.join('\n')); fs.writeFileSync('gate-impact-cmds.txt', plan.cmds.join('\n'));
    if (out) fs.appendFileSync(out, `run=${run ? 'true' : 'false'}\nmatrix=${JSON.stringify({ include: sel.prs })}\nskipped=${sel.skipped}\ncount=${sel.prs.length}\n`);
    return;
  }
  if (mode === 'run') {
    const pr = +arg(a, '--pr'), sha = arg(a, '--sha'), gate = arg(a, '--gate'), o = arg(a, '--out', 'result.json');
    const files = fs.readFileSync(arg(a, '--files-file'), 'utf8').split('\n').filter(Boolean), cmds = fs.readFileSync(arg(a, '--cmds-file'), 'utf8').split('\n').filter(Boolean);
    const res = { pr, sha, ok: false, error: '', bad: [] };
    try {
      sh('git', ['fetch', '--no-tags', 'origin', gate]);
      const base = sh('git', ['merge-base', 'HEAD', gate]).trim(), prChanged = sh('git', ['diff', '--name-only', base, 'HEAD']).split('\n').filter(Boolean);
      const ov = overlayOf(files, prChanged); for (const f of ov) { try { sh('git', ['checkout', gate, '--', f]); } catch { /* bị xoá ở PR cổng */ } }
      for (const c of cmds) {
        const [bin, ...args] = c.split(/\s+/), r = spawnSync(bin, args, { encoding: 'utf8', timeout: 180e3, maxBuffer: 1 << 26, env: { ...process.env, GITHUB_TOKEN: '', GH_TOKEN: '' } });
        if (r.status !== 0) res.bad.push({ cmd: c, tail: String((r.stdout || '') + (r.stderr || '')).split('\n').filter(l => /✗|Error|error/.test(l)).slice(0, 2).join(' | ').slice(0, 200) });
      }
      res.ok = !res.bad.length;
    } catch (e) { res.error = String(e.message).slice(0, 200); res.ok = false; }
    fs.writeFileSync(o, JSON.stringify(res)); console.log(res.ok ? `✓ #${pr} đạt` : `✗ #${pr}: ${res.error || res.bad.map(b => b.cmd).join(', ')}`);
    return;
  }
  if (mode === 'report') {
    const self = +arg(a, '--self'), dir = arg(a, '--dir', 'artifacts'), results = [];
    const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : /\.json$/.test(e.name) ? [path.join(d, e.name)] : []) : [];
    for (const f of walk(dir)) { try { results.push(JSON.parse(fs.readFileSync(f, 'utf8'))); } catch { /* bỏ qua tệp hỏng */ } }
    const cmds = fs.existsSync('gate-impact-cmds.txt') ? fs.readFileSync('gate-impact-cmds.txt', 'utf8').split('\n').filter(Boolean) : [];
    const rep = render(results.sort((x, y) => x.pr - y.pr), { self, cmds, skipped: +arg(a, '--skipped', 0) });
    console.log(rep.md); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, rep.md + '\n');
    for (const r of rep.red) console.log(`::warning::PR #${r.pr} sẽ đỏ: ${r.bad.map(b => b.cmd).join(', ')}`);
    const pr = await postReport(gh, self, rep.md); if (!pr.posted) console.log(`::warning::gate-impact: không đăng được comment (${pr.error}) – báo cáo vẫn ở job summary`);
  }
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main().catch(e => { console.error('::error::gate-impact: ' + e.message); process.exit(1); });
