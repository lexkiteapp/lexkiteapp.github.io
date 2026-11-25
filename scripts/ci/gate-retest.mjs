// gate-retest (16/11, điều phối): "main đổi tệp cổng → mọi PR mở phải gộp lại" đốt ~100 job CI mỗi PR (1 lần gộp = push mới = chạy lại toàn bộ). Thay vì heuristic "test có nhắc tệp PR không",
// cổng CHẠY THẬT các test đổi trên main (bản main) trên đầu PR – 1 job nhẹ (workflow gate-retest.yml) – và ghi commit status `gate-retest`:
//   success + "main@<8 ký tự>" = các test đó ĐẠT trên head PR với main đó → required-gate coi drift đã giải, KHÔNG bắt gộp lại.
//   chưa có / lỗi thời / ĐỎ / lỗi hạ tầng → hành vi CŨ (đòi gộp main) – bất định không bao giờ mở cổng, không bao giờ làm đỏ oan.
// Chỉ áp cho test `node scripts/test/X.mjs …` có trong scripts/test/suite.txt (chạy trên mọi PR trong npm test). Workflow/luật/i18n-qa vẫn theo cách cũ.
//   node scripts/ci/gate-retest.mjs run  --sha S --main M --cmds-file F [--out R.json]   (trong job: ghi đè tệp main đổi lên head PR rồi chạy từng lệnh)
//   node scripts/ci/gate-retest.mjs post --sha S --main M --result R.json                 (bước riêng, có token: ghi commit status)
import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const CONTEXT = 'gate-retest';
export const WORKFLOW = 'gate-retest.yml';
export const MAX_CMDS = 40;
const TEST = /^scripts\/test\/[\w.-]+\.mjs$/;
// 25/11: tệp ghi chú/mô tả (*.notes.json, *.md) không có ngưỡng nào để test đọc → không làm đổi kết quả PR, bỏ qua (budget.notes.json làm #1802 bị đòi gộp main). Tệp dữ liệu khác (ngưỡng thật) vẫn theo cách cũ.
export const NOTES = /^scripts\/test\/[\w./-]+(\.notes\.json|\.md)$/;

/** Hàm thuần: danh sách tệp drift + nội dung suite.txt → { ok, cmds }. ok=false khi có tệp drift KHÔNG chạy lại được (khác test trong suite) → dùng cách cũ. */
export function retestPlan(drift = [], suiteText = '', prFiles = null) {
  if (!drift.length) return { ok: false, cmds: [], why: 'không có drift' };
  const lines = String(suiteText).split('\n').map(l => l.trim()).filter(l => l.startsWith('node scripts/test/'));
  const cmds = [];
  for (const f of drift) {
    // 25/11: suite.txt = DANH SÁCH test, không phải test. Nó vào drift khi PR đụng một test có trong danh sách → chạy lại đúng các dòng của main cho những test PR đụng (đủ biết đối số mới). Trước đây ok:false → #1802/#2079/#2095 đều bị đòi gộp main lặp lại (~100 job mỗi lần).
    if (NOTES.test(f)) continue;
    if (f === 'scripts/test/suite.txt' && prFiles) { const hit = lines.filter(l => prFiles.includes(l.split(/\s+/)[1])); if (!hit.length) return { ok: false, cmds: [], why: 'suite.txt đổi nhưng PR không đụng test nào trong danh sách' }; cmds.push(...hit); continue; }
    if (!TEST.test(f)) return { ok: false, cmds: [], why: `${f} không phải test trong suite` };
    const found = lines.filter(l => l.split(/\s+/)[1] === f);
    if (!found.length) return { ok: false, cmds: [], why: `${f} không có trong suite.txt` };
    cmds.push(...found);
  }
  if (!cmds.length) return { ok: false, cmds: [], why: 'chỉ có tệp ghi chú – không có lệnh để chạy lại' };
  if (cmds.length > MAX_CMDS) return { ok: false, cmds: [], why: `quá ${MAX_CMDS} test` };
  return { ok: true, cmds: [...new Set(cmds)] };
}

export const tagOf = sha => String(sha || '').slice(0, 8);

/** Hàm thuần: status `gate-retest` hiện có + sha main hiện tại → 'clear' | 'wait' | 'stale' | 'inconclusive'. */
export function verdict(status, mainSha) {
  const tag = tagOf(mainSha);
  if (!status || !String(status.description || '').includes(`main@${tag}`)) return 'stale';       // chưa chạy cho main này
  if (status.state === 'success') return 'clear';
  if (status.state === 'pending') return 'wait';
  return 'inconclusive';                                                                            // đỏ/lỗi: không tin → đòi gộp main như cũ
}

/** Hàm thuần: tệp main đổi (mainChanged) trừ tệp PR cũng đổi (prChanged), chỉ trong scripts/ → danh sách ghi đè lên head PR (test + thư viện nó nhập). */
export function overlayFiles(mainChanged = [], prChanged = []) {
  const pr = new Set(prChanged);
  return mainChanged.filter(f => /^scripts\//.test(f) && !pr.has(f));
}

const sh = (cmd, args, opt = {}) => execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'pipe'], ...opt });
const arg = (a, k, d = '') => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };

async function main() {
  const a = process.argv.slice(2), mode = a[0];
  if (mode === 'run') {
    const main = arg(a, '--main'), out = arg(a, '--out', 'gate-retest-result.json');
    const cmds = fs.readFileSync(arg(a, '--cmds-file'), 'utf8').split('\n').map(l => l.trim()).filter(Boolean);
    sh('git', ['fetch', '--no-tags', 'origin', 'main']);
    const base = sh('git', ['merge-base', 'HEAD', main]).trim();
    const mainChanged = sh('git', ['diff', '--name-only', base, main]).split('\n').filter(Boolean), prChanged = sh('git', ['diff', '--name-only', base, 'HEAD']).split('\n').filter(Boolean);
    const ov = overlayFiles(mainChanged, prChanged); console.log(`overlay ${ov.length} tệp scripts/ từ main@${tagOf(main)} (PR cũng đổi ${prChanged.length} tệp – giữ nguyên)`);
    for (let i = 0; i < ov.length; i += 100) { try { sh('git', ['checkout', main, '--', ...ov.slice(i, i + 100)]); } catch (e) { /* tệp bị xoá ở main: bỏ qua */ } }
    const results = [];
    for (const c of cmds) {
      const [bin, ...args] = c.split(/\s+/), t0 = Date.now();
      const r = spawnSync(bin, args, { encoding: 'utf8', timeout: 180e3, maxBuffer: 1 << 26, env: { ...process.env, GITHUB_TOKEN: '', GH_TOKEN: '' } });
      const ok = r.status === 0; results.push({ cmd: c, ok, ms: Date.now() - t0, tail: ok ? '' : String((r.stdout || '') + (r.stderr || '')).split('\n').filter(l => /✗|Error|error/.test(l)).slice(0, 3).join(' | ').slice(0, 300) });
      console.log(`${ok ? '✓' : '✗'} ${c} (${((Date.now() - t0) / 1000).toFixed(1)}s)${ok ? '' : ' ' + results[results.length - 1].tail}`);
    }
    fs.writeFileSync(out, JSON.stringify({ main, results }));
    return;
  }
  if (mode === 'post') {
    const sha = arg(a, '--sha'), main = arg(a, '--main'), repo = process.env.GITHUB_REPOSITORY, tok = process.env.GH_TOKEN;
    let state = 'failure', description = `main@${tagOf(main)}: lỗi hạ tầng gate-retest`;
    try {
      const R = JSON.parse(fs.readFileSync(arg(a, '--result'), 'utf8')), bad = R.results.filter(x => !x.ok);
      state = bad.length ? 'failure' : 'success';
      description = (bad.length ? `main@${tagOf(main)}: ${bad.length}/${R.results.length} test cổng đỏ trên head PR: ${bad.map(x => x.cmd.split(/\s+/)[1].replace('scripts/test/', '')).join(', ')}` : `main@${tagOf(main)}: ${R.results.length} test cổng đổi đạt trên head PR – không cần gộp main`).slice(0, 140);
    } catch (e) { /* giữ failure = bất định */ }
    const r = await fetch(`https://api.github.com/repos/${repo}/statuses/${sha}`, { method: 'POST', headers: { Authorization: `Bearer ${tok}`, Accept: 'application/vnd.github+json' }, body: JSON.stringify({ state, context: CONTEXT, description }) });
    console.log(`status ${CONTEXT} → ${state} (${r.status}): ${description}`);
  }
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
