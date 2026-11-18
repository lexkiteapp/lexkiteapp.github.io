// Chính sách workflow (2/11 – "CI tiết kiệm, không mất tín hiệu"): mọi workflow phải tự giới hạn số lượt + thời gian.
//  1) Mọi job (trừ job gọi workflow tái dùng `uses:`) có `timeout-minutes` – job treo không giữ runner 6 giờ.
//  2) Workflow có sự kiện tự động (push / pull_request / schedule / workflow_run / check_suite) có `concurrency` (mức workflow hoặc job)
//     – lượt trùng cùng nhánh/sha bị gộp thay vì dồn hàng. Workflow chỉ chạy tay/gọi lại (dispatch/workflow_call) mà cố ý không gộp
//     (mỗi lượt khác input, nhóm chung sẽ HUỶ lượt chờ = mất việc – docs/CI-RUNNERS.md) ghi rõ: `# ci-policy: no-concurrency – <lý do>`.
//  3) push / pull_request có phạm vi: `paths`/`paths-ignore`, hoặc push chỉ trên nhánh thử riêng (không có main), hoặc lý do:
//     `# ci-policy: all-paths – <lý do>` (vd. check bắt buộc phải chạy mọi PR).
//  4) Workflow chạy trên PR (pull_request/_target – kết quả job = check của PR): job có `needs:` không dùng `always()` trần: `always()` vẫn chạy khi CẢ lượt đã bị huỷ (huỷ tay/concurrency/giải phóng runner)
//     → job tải artifact của job bị huỷ đỏ "Artifact not found" và nhuộm đỏ PR (3/11: before-after đỏ ở #311 #323 #325 #326 #331 vì bot bị huỷ).
//     Dùng `!cancelled()` (chạy cả khi job trước đỏ, không chạy khi lượt bị huỷ), hoặc có chặn rõ `needs.<job>.result != 'cancelled'`.
//  5) (3/11 – sự cố required-gate: workflow_run ×38 → ~20 runner/commit, 66 % lượt CI) workflow nghe workflow_run / check_suite / check_run:
//     (a) mọi job có `if:` mức job (hoặc `needs:` job đã có if) – lượt không cần là skipped, không chiếm runner; danh sách workflow_run
//         > 5 workflow thì `if:` của job gốc phải lọc theo chính sự kiện (github.event.workflow_run / check_suite / check_run);
//     (b) concurrency có cancel-in-progress: true, hoặc dòng `# ci-policy: queue – <lý do>` (việc tuần tự không được huỷ, vd. deploy);
//     (c) không vòng workflow_run (A → B → A) – kiểm trên toàn bộ .github/workflows.
//  6) Bước đẩy kết quả lên nhánh mà `git pull --rebase` phải chịu được cây làm việc bẩn: build/script hay sửa tệp đã theo dõi mà không add
//     → "cannot pull with rebase: You have unstaged changes" (i18n 23/10, world-scorecard 2/11 đỏ 2 lượt liền). Dùng `--autostash`,
//     hoặc cất phần còn sót trước đó trong cùng job (`git stash push` / `git reset --hard`).
//  7) (3/11 – #553 gộp xanh mà main đỏ vì tsc chỉ có trong ci.yml, ci.yml không chạy trên PR): mọi lệnh kiểm trong ci.yml phải có trong scripts/test/suite.txt
//     (npm test = cổng PR), nếu không PR xanh vẫn làm main đỏ.
//  8) (05/11 – Font audit 7 job/commit, 6 job < 90 s = 20 % số job PR khởi động, hàng chờ 102 job / 40 runner): workflow chạy trên PR có matrix
//     tĩnh > MATRIX_MAX nhánh (tích các mảng; trong biểu thức ${{ }} lấy mảng lớn nhất) phải gộp phần nhỏ chạy nối tiếp trong 1 job, hoặc ghi lý do
//     `# ci-policy: matrix – <lý do>` (vd. đo hiệu năng từng máy phải tách runner). Mỗi nhánh = 1 lượt xin runner + setup ~40 s trong hàng chờ.
//  9) (05/11 – e2e webkit / ux1 bị huỷ sau 20–40 phút vì `playwright install --with-deps` / `apt-get install` treo trên runner, #760): mọi lệnh
//     cài Playwright/apt phải có giới hạn thời gian: bước CHỈ cài có `timeout-minutes` mức bước; bước vừa cài vừa chạy việc dài (render, e2e) bọc
//     riêng lệnh cài bằng `timeout <giây>` (không giới hạn nhầm phần việc chính). Treo → bước đỏ rõ ràng sau vài phút thay vì job bị huỷ.
//  11) (07/11 – hàng chờ 245 job / 40 runner, 43 % lượt nặng chạy trên sha mà npm test đỏ/bị huỷ) LÀN NHANH TRƯỚC LÀN NẶNG: 11 workflow nặng trên PR
//     (QA bot, Journey E2E, UX cards, Scroll perf, Stitch diff, Font audit, Frame consistency, Visual QA, Mobile QA, Web sweep, size-guard – HEAVY dưới đây)
//     có dòng `# ci-policy: heavy-gate – …`, job `gate` (đọc check-run `npm test` cùng sha) và MỌI job khác `needs: gate` + `if` chứa
//     needs.gate.outputs.go == 'true'; npm-test.yml có job `heavy` chạy scripts/ci/heavy-rerun.mjs để chạy lại lượt nặng khi npm test xanh.
//  12) Workflow chạy trên PR có concurrency cancel-in-progress: true (đẩy commit mới huỷ lượt cũ cùng ref, không dồn hàng), hoặc `# ci-policy: queue – <lý do>`.
//  13) (08/11 – native-m1 đỏ: ký Automatic + -allowProvisioningUpdates tạo 1 chứng chỉ Development mỗi máy CI → tài khoản Apple đầy hạn mức)
//     cấm ký iOS Automatic trên CI (`-allowProvisioningUpdates`, `CODE_SIGN_STYLE=Automatic`, ExportOptions signingStyle automatic): ký Manual
//     bằng chứng chỉ Distribution cố định – scripts/native/ios-sign.sh, docs/CI-SIGNING-IOS.md.
//  17) (15/11 – bot lexicon-expand đẩy main [skip ci] làm lex.mjs đỏ) workflow commit [skip ci] vào main phải qua máy gác bot-test-gate.mjs (hoặc push-main.sh / commit-regen.sh), hoặc `# ci-policy: bot-test – <lý do>`.
// Không có danh sách miễn trừ ngầm: ngoại lệ nằm ngay trong file workflow, kèm lý do. Chạy: node scripts/test/ci-policy.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { classify, needed, prPaths, relevantFiles } from '../ci/pr-scope.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WF = path.join(ROOT, '.github/workflows');

/** Lệnh kiểm của ci.yml thiếu trong suite.txt (thuần): so theo script node; `node --check`, `tsc -p` viết trần trong ci.yml luôn bị báo (suite chỉ nhận `node …`, suite-guard) → bọc thành script. */
export function ciParity(ciYml, suite) {
  const need = new Set();
  for (const m of String(ciYml).matchAll(/^\s*(?:-\s*)?(?:run:\s*)?(.*)$/gm)) {
    for (const x of m[1].matchAll(/node (scripts\/[\w./-]+)/g)) need.add(x[1]);
    if (/node --check/.test(m[1])) need.add('node --check');
    if (/\btsc -p /.test(m[1])) need.add('tsc -p');
  }
  return [...need].filter(k => !String(suite).includes(k));
}

/** Khối `on:` (thuần) → { events: Set, push: text, pull_request: text }. Hỗ trợ dạng khối (repo không dùng `on: [..]`). */
export function triggers(src) {
  const m = String(src).match(/^on:[ \t]*\n([\s\S]*?)(?=^\S)/m), body = m ? m[1] : '';
  const inline = String(src).match(/^on:[ \t]*\[?([^\n\]]+)\]?[ \t]*$/m);
  const events = new Set(inline && !m ? inline[1].split(',').map(s => s.trim()) : [...body.matchAll(/^  ([a-z_]+):/gm)].map(x => x[1]));
  const block = ev => { const b = body.match(new RegExp(`^  ${ev}:[^\\n]*\\n((?:    [^\\n]*\\n|\\s*\\n)*)`, 'm')); return b ? b[1] : ''; };
  return { events, push: block('push'), pull_request: block('pull_request') };
}
/** Các job (thuần) → [{ id, text }]. */
export function jobs(src) {
  const m = String(src).match(/^jobs:[ \t]*\n([\s\S]*)$/m); if (!m) return [];
  const body = m[1], heads = [...body.matchAll(/^  ([\w-]+):[ \t]*(?:#.*)?\n/gm)];
  return heads.map((h, i) => ({ id: h[1], text: body.slice(h.index, i + 1 < heads.length ? heads[i + 1].index : undefined) }));
}
const AUTO = ['push', 'pull_request', 'pull_request_target', 'schedule', 'workflow_run', 'check_suite', 'check_run'];
const CHAIN = ['workflow_run', 'check_suite', 'check_run'];
const reason = (src, k) => new RegExp(`^#\\s*ci-policy:\\s*${k}\\s*[–-]\\s*\\S.{8,}`, 'm').test(src);
export const MATRIX_MAX = 4;
/** Số nhánh matrix TĨNH của 1 job (thuần): tích độ dài các mảng ngoài ${{ }}; mỗi biểu thức ${{ }} lấy mảng literal lớn nhất (nhánh || thay thế nhau). Matrix động (output job khác) = 0. */
export function matrixLegs(jobText) {
  const m = String(jobText).match(/^\s*(?:strategy:.*?\bmatrix:|matrix:)([\s\S]*?)(?=^    \S|^      steps:|$(?![\s\S]))/m);
  if (!m) return 0;
  let blk = m[1].replace(/\s+#.*$/gm, ''), legs = 1, any = false;
  const count = a => { try { const v = JSON.parse(a); if (Array.isArray(v)) return v.length; } catch (e) { /* không phải JSON */ } return a.slice(1, -1).trim() ? a.slice(1, -1).split(',').length : 0; };
  blk = blk.replace(/\$\{\{(.*)\}\}/g, (_, e) => { const arrs = [...e.matchAll(/'(\[[\s\S]*?\])'/g)].map(x => count(x[1])); if (arrs.length) { legs *= Math.max(...arrs); any = true; } return ''; });
  for (const a of blk.matchAll(/:\s*(\[[^\[\]]*\])/g)) { legs *= count(a[1]); any = true; }
  return any ? legs : 0;
}
// 9) Lệnh cài Playwright/apt (thuần, có test): mỗi bước → { start, insertAt, keyIndent, jobTimeout, installLines, installOnly, bounded }
const INSTALL_RE = [/\bapt(?:-get)?\s(?:[^\n;&|#]*?\s)?(?:install|update)\b/g, /(?:npx\s+(?:--yes\s+)?playwright(?:@[\w.]+)?|node\s+\S*playwright[\w-]*\/cli\.js)\s+install\b/g];
const SETUP_LINE = /^(npm (i|ci|install)\b|(timeout \d+ )?npx (--yes )?playwright\S* install|(sudo )?(timeout \d+ )?apt(-get)?\b|sudo |pip3? install|python3? -m pip|echo |fc-cache|for i in|if timeout|then\b|fi\b|done\b|do\b|else\b|\[ |google-chrome --version|export |mkdir |corepack|node --version|[{}]|run:\s*\|?\s*$)/;
const installCmds = line => /^\s*#/.test(line) ? [] : INSTALL_RE.flatMap(re => [...line.matchAll(re)]);
const boundedCmd = (line, m) => /timeout\s+(?:-\S+\s+)*\d+[smh]?\s+$/.test(line.slice(0, m.index));
export function installSteps(src) {
  const L = String(src).split('\n'), out = [];
  for (let i = 0; i < L.length; i++) {
    const sm = L[i].match(/^(\s*)steps:\s*(#.*)?$/); if (!sm) continue;
    const si = sm[1].length, ind = l => l.match(/^\s*/)[0].length;
    let jobTimeout = 360; for (let k = i - 1; k >= 0 && !/^  [\w-]+:\s*(#.*)?$/.test(L[k]); k--) { const m = L[k].match(/^(\s*)timeout-minutes:\s*(\d+)/); if (m && m[1].length === si) { jobTimeout = +m[2]; break; } }
    let j = i + 1; const items = [];
    for (; j < L.length; j++) { const l = L[j]; if (l.trim() && ind(l) <= si && !/^\s*#/.test(l)) break; const m = l.match(/^(\s*)- /); if (m && m[1].length > si && (!items.length || m[1].length === items[0].ind)) items.push({ start: j, ind: m[1].length }); }
    items.forEach((it, a) => { it.end = a + 1 < items.length ? items[a + 1].start : j; });
    for (const it of items) {
      const lines = L.slice(it.start, it.end), installLines = [];
      lines.forEach((l, k) => { if (installCmds(l).length) installLines.push(it.start + k); });
      if (!installLines.length) continue;
      const keyIndent = it.ind + 2, body = lines.join('\n');
      const stepTimeout = new RegExp('^ {' + keyIndent + '}timeout-minutes:|^\\s*- \\{.*\\btimeout-minutes:', 'm').test(body);
      const cmds = lines.map(l => l.replace(/^\s*(- )?(name|uses|with|env|if|id|shell|working-directory|continue-on-error):.*$/, '').replace(/^\s*(- )?(run:\s*\|?)?\s*/, '').trim()).filter(c => c && !c.startsWith('#'));
      const installOnly = cmds.every(c => SETUP_LINE.test(c) || installCmds(c).length);
      const bounded = stepTimeout || installLines.every(n => installCmds(L[n]).every(m => boundedCmd(L[n], m)));
      out.push({ start: it.start, insertAt: /^\s*- name:/.test(L[it.start]) ? it.start + 1 : it.end, keyIndent, jobTimeout, installLines, installOnly, bounded });
    }
  }
  return out;
}
// (14) 13/11/2026 – ubuntu-latest chuyển sang 26.04, Playwright chưa hỗ trợ chromium ở đó ("Playwright does not support chromium on ubuntu26.04-x64"
//     → shell/taps/topbar đỏ mọi PR): job dùng Playwright/Chromium phải ghim ubuntu-24.04 (không ubuntu-latest / 26.04) tới khi Playwright hỗ trợ
//     (theo dõi: https://github.com/microsoft/playwright/issues?q=ubuntu+26.04). Job "dùng Playwright" = nhắc playwright/chromium/puppeteer hoặc chạy script có import playwright.
const PW_SCRIPTS = (() => { const r = []; const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name);
  if (e.isDirectory()) { if (e.name !== 'node_modules') walk(f); } else if (/\.(mjs|cjs|js)$/.test(e.name) && /from ['"]playwright|require\(['"]playwright|playwright-core/.test(fs.readFileSync(f, 'utf8').slice(0, 4000))) r.push(path.relative(ROOT, f).split(path.sep).join('/')); } };
  try { walk(path.join(ROOT, 'scripts')); } catch (e) { /* không có thư mục scripts (test tổng hợp) */ } return r; })();
// + job cài faster-whisper/scripts/cine/requirements.txt: PyAV (av 11) chưa có wheel cho Python của 26.04 → build từ nguồn lỗi "libavformat not found" (voice (t2_usuk_elevator) đỏ 13/11)
const PW_RE = /playwright|chromium|puppeteer|faster-whisper|scripts\/cine\/requirements/i;
const ACT = (() => { const m = {}; const d = path.join(ROOT, '.github/actions'); try { for (const n of fs.readdirSync(d)) { const f = path.join(d, n, 'action.yml'); if (fs.existsSync(f)) m[n] = fs.readFileSync(f, 'utf8'); } } catch (e) { /* không có thư mục actions */ } return m; })();
// job dùng composite action nội bộ (./.github/actions/<tên>, tối đa 3 tầng) mà action đó cài/chạy những thứ trên cũng tính (video9-setup cài faster-whisper)
const actUses = (text, depth = 0) => depth < 3 && [...text.matchAll(/uses:\s*\.\/\.github\/actions\/([\w-]+)/g)].some(x => ACT[x[1]] && (PW_RE.test(ACT[x[1]]) || actUses(ACT[x[1]], depth + 1)));
export const usesPlaywright = jobText => PW_RE.test(jobText) || PW_SCRIPTS.some(f => jobText.includes(f)) || actUses(jobText);
export const badRunner = jobText => { const m = jobText.match(/^    runs-on:\s*(.*)$/m); return !!m && (/ubuntu-latest|26\.04/.test(m[1]) || (/ubuntu/.test(m[1]) && !/vars\.PW_RUNNER/.test(m[1]))); }; // một chỗ đổi chung: repo variable PW_RUNNER (mặc định ubuntu-24.04)
/** Lỗi chính sách của 1 workflow (thuần, có test) → [chuỗi]. */
const SIGN_AUTO = /-allowProvisioningUpdates\b|CODE_SIGN_STYLE\s*=\s*"?Automatic|signingStyle<\/key>\s*<string>automatic/i;
export function violations(file, src) {
  const out = [], t = triggers(src);
  for (const j of jobs(src)) if (usesPlaywright(j.text) && badRunner(j.text)) out.push(`${file}: luật 14 – job "${j.id}" dùng Playwright/Chromium mà runs-on không phải vars.PW_RUNNER (mặc định ubuntu-24.04; ubuntu-latest = 26.04, Playwright chưa hỗ trợ, 13/11)`);
  for (const j of jobs(src)) if (!/^    uses:/m.test(j.text) && !/^    timeout-minutes:/m.test(j.text)) out.push(`${file}: job "${j.id}" thiếu timeout-minutes`);
  const cg = (src.match(/^concurrency:.*$/m) || [''])[0]; if (/\binputs\.(templates|lessons|eps|ids|list)\b/.test(cg) && !reason(src, 'group-inputs')) out.push(`${file}: concurrency.group nhúng cả danh sách input (templates/lessons/eps/ids) – danh sách dài làm lượt dispatch lỗi 0 job (video-motion 15/11); dùng github.run_id hoặc ghi "# ci-policy: group-inputs – <lý do>"`);
  // 15/11 (luật chủ 13/11: video ≤ 3 máy khi còn việc khác): ma trận của workflow video/dựng phim PHẢI có max-parallel – 10 job video-motion từng chiếm 10/40 máy, 260 job PR xếp hàng
  if (/^(video|cine|teach)-/.test(file)) for (const j of jobs(src)) if (/^\s+strategy:/m.test(j.text) && /\bmatrix:/.test(j.text) && !/max-parallel:/.test(j.text) && !reason(j.text, 'no-max-parallel')) out.push(`${file}: job "${j.id}" có matrix mà thiếu strategy.max-parallel (video chiếm hết máy; hoặc dòng "# ci-policy: no-max-parallel – <lý do>")`);
  const hasConc = /^concurrency:/m.test(src) || jobs(src).some(j => /^    concurrency:/m.test(j.text));
  const auto = AUTO.filter(e => t.events.has(e));
  if (!hasConc && auto.length) out.push(`${file}: chạy tự động (${auto.join(', ')}) mà thiếu concurrency`);
  else if (!hasConc && !reason(src, 'no-concurrency')) out.push(`${file}: thiếu concurrency (hoặc dòng "# ci-policy: no-concurrency – <lý do>")`);
  const scoped = ev => /^\s*paths(-ignore)?:/m.test(t[ev]) || (ev === 'push' && /^\s*branches:/m.test(t.push) && !/\bmain\b/.test((t.push.match(/^\s*branches:([^\n]*)/m) || [])[1] || ''));
  for (const ev of ['push', 'pull_request']) if (t.events.has(ev) && !scoped(ev) && !reason(src, 'all-paths')) out.push(`${file}: ${ev} không có paths (hoặc dòng "# ci-policy: all-paths – <lý do>")`);
  if (t.events.has('pull_request') || t.events.has('pull_request_target')) for (const j of jobs(src)) { const c = (j.text.match(/^    if:([^\n]*)/m) || [])[1] || '';
    if (/^    needs:/m.test(j.text) && /\balways\(\)/.test(c) && !/!=\s*'cancelled'/.test(c)) out.push(`${file}: job "${j.id}" có needs + if: always() – lượt bị huỷ vẫn chạy rồi đỏ; dùng !cancelled()`); }
  for (const j of jobs(src)) for (const m of j.text.matchAll(/^.*\bgit\b[^\n]*\bpull\b[^\n]*--rebase\b.*$/gm)) {
    const before = j.text.slice(0, m.index);
    if (!/--autostash\b/.test(m[0]) && !/\bgit\b[^\n]*\b(stash push|reset (-q )?--hard)\b/.test(before)) out.push(`${file}: job "${j.id}" có git pull --rebase không --autostash (cây bẩn → "cannot pull with rebase")`);
  }
  const chain = CHAIN.filter(e => t.events.has(e));
  if (chain.length) {
    const js = jobs(src), gated = new Set(js.filter(j => /^    if:/m.test(j.text)).map(j => j.id));
    const needsOf = j => { const m = j.text.match(/^    needs:\s*(\[[^\]]*\]|[\w-]+)/m); return m ? m[1].replace(/[[\]\s]/g, '').split(',').filter(Boolean) : []; };
    for (const j of js) if (!gated.has(j.id) && !needsOf(j).some(n => gated.has(n))) out.push(`${file}: nghe ${chain.join('/')} mà job "${j.id}" thiếu if: mức job (lượt không cần phải skipped, không chiếm runner)`);
    const list = workflowRunList(src);
    if (list.length > 5) for (const j of js) if (!needsOf(j).length && !/^    if:.*github\.event\.(workflow_run|check_suite|check_run)/m.test(j.text)) out.push(`${file}: workflow_run nghe ${list.length} workflow (> 5) mà job "${j.id}" không có cổng skip theo github.event.workflow_run`);
    if (!/cancel-in-progress:\s*true/.test(src) && !reason(src, 'queue')) out.push(`${file}: nghe ${chain.join('/')} cần concurrency cancel-in-progress: true (hoặc dòng "# ci-policy: queue – <lý do>")`);
  }
  if ((t.events.has('pull_request') || t.events.has('pull_request_target')) && !reason(src, 'matrix'))
    for (const j of jobs(src)) { const n = matrixLegs(j.text); if (n > MATRIX_MAX) out.push(`${file}: job "${j.id}" chạy trên PR với matrix ${n} nhánh (> ${MATRIX_MAX}) – gộp phần nhỏ nối tiếp trong 1 job (mỗi nhánh = 1 lượt xin runner + setup), hoặc dòng "# ci-policy: matrix – <lý do>"`); }
  if ((t.events.has('pull_request') || t.events.has('pull_request_target')) && !/cancel-in-progress:\s*["']?(true|\$\{\{)/.test(src) && !reason(src, 'queue')) out.push(`${file}: chạy trên PR mà concurrency không có cancel-in-progress (luật 12) – commit mới phải huỷ lượt cũ (hoặc dòng "# ci-policy: queue – <lý do>")`);
  // luật 14 (12/11 – bão CI: 262 lượt chờ, PR mới đợi ~2 h): workflow chạy trình duyệt (Playwright/Chrome) trên PR PHẢI nằm sau làn nhanh
  //  (`# ci-policy: heavy-gate`, luật 11) – hoặc có dòng `# ci-policy: fast-lane – <lý do>` (vd. đường dẫn rất hẹp). Không để bộ UI mới lọt qua cổng.
  if ((t.events.has('pull_request') || t.events.has('pull_request_target')) && /playwright|pw-install|puppeteer|google-chrome/i.test(String(src).replace(/^\s*#.*$/gm, '')) && !/^# ci-policy: heavy-gate\b/m.test(src) && !reason(src, 'fast-lane'))
    out.push(`${file}: chạy trình duyệt trên PR mà không qua làn nhanh (luật 14) – thêm "# ci-policy: heavy-gate" + job gate (mẫu web-sweep.yml) hoặc dòng "# ci-policy: fast-lane – <lý do>"`);
  if (/^# ci-policy: heavy-gate\b/m.test(src) && !/READY/.test(src)) out.push(`${file}: job gate thiếu nhãn \`ready\` (luật 14: PR có nhãn ready chạy việc nặng ngay, không chờ npm test)`);
  if (/^# ci-policy: heavy-gate\b/m.test(src)) {   // luật 11
    const js = jobs(src), g = js.find(j => j.id === 'gate');
    if (!g || !/check_name=npm%20test/.test(g.text) || !/outputs:\s*\{\s*go:/.test(g.text)) out.push(`${file}: heavy-gate cần job "gate" đọc check-run npm test và xuất output go`);
    // luật 17 (15/11): lượt 1 của PR gate chỉ skipped (npm test chưa thể xanh) – tiết kiệm ~½ số job gate (27 → ~13/PR UI); heavy-rerun chạy lại (run_attempt ≥ 2) mới tốn máy
    if (g && !/^    if:[^\n]*github\.run_attempt > 1[^\n]*'ready'/m.test(g.text)) out.push(`${file}: job gate phải có if: … github.run_attempt > 1 … ready (luật 17: lượt 1 của PR bỏ qua gate không tốn máy, heavy-rerun chạy lại lượt 2)`);
    for (const j of js) if (j.id !== 'gate' && !/^    uses:/m.test(j.text) ? !(/^    needs:[^\n]*\bgate\b/m.test(j.text) && /^    if:[^\n]*needs\.gate\.outputs\.go == 'true'/m.test(j.text)) : false) out.push(`${file}: job "${j.id}" phải needs: gate và if: … needs.gate.outputs.go == 'true' (luật 11: việc nặng chờ npm test xanh)`);
  }
  // 10) (06/11 – stitch-web đỏ vì `timeout 600 npx playwright install --with-deps` treo apt hết 600 s, #780): cài Playwright qua scripts/ci/pw-install.sh
  //     (mỗi lượt ≤ 4 phút, thử lại 3 lượt, giết apt treo) – một lượt treo không còn làm đỏ job. Trừ mobile-qa.yml (nội dung bị mqa-parity khoá) và vòng thử lại tự viết.
  if (!/(^|\/)mobile-qa\.yml$/.test(file)) String(src).split('\n').forEach((l, n) => { if (!/^\s*#/.test(l) && /npx\s+(?:--yes\s+)?playwright(?:@[\w.]+)?\s+install\b/.test(l) && !/\bif timeout \d+ npx/.test(l)) out.push(`${file}:${n + 1}: cài Playwright trần – dùng \`bash scripts/ci/pw-install.sh [--with-deps] <trình duyệt>\` (trần + thử lại, luật 10)`); });
  // pw-cache (17/11 – `playwright install --with-deps webkit` treo mirror apt + `npm i playwright` hết 12 phút làm đỏ ≥6 PR): mỗi lần gọi pw-install.sh phải có
  //     MỘT bước `uses: ./.github/actions/playwright-cache` (cache trình duyệt + .deb apt + npm) đứng trước – cài trình duyệt chỉ đi qua action chung.
  { const code = String(src).replace(/^\s*#.*$/gm, ''), calls = (code.match(/scripts\/ci\/pw-install\.sh/g) || []).length, uses = (code.match(/uses:\s*\.\/\.github\/actions\/playwright-cache\b/g) || []).length;
    if (calls > uses) out.push(`${file}: ${calls} lần gọi pw-install.sh nhưng chỉ ${uses} bước \`uses: ./.github/actions/playwright-cache\` – thêm bước cache TRƯỚC mỗi lần cài (luật pw-cache)`); }
  // action cục bộ (`uses: ./.github/actions/…`) cần mã trên đĩa: (17/11 – report-shots `bench` đỏ "Can't find action.yml" vì checkout thưa không có .github/actions) →
  //     trong MỖI job, trước bước dùng action cục bộ phải có actions/checkout, và nếu checkout thưa thì danh sách phải gồm `.github/actions` (hoặc `.github`).
  for (const j of jobs(src)) { const t = j.text, u = t.search(/^\s*-?\s*uses:\s*\.\/\.github\/actions\//m); if (u < 0) continue;
    const before = t.slice(0, u), cks = [...before.matchAll(/uses:\s*actions\/checkout@[^\n]*\n?([^\n]*)/g)];
    if (!cks.length) out.push(`${file}: job "${j.id}" dùng action cục bộ trước khi có actions/checkout (không tìm thấy action.yml trên runner)`);
    else { const last = cks[cks.length - 1][0]; if (/sparse-checkout/.test(last) && !/\.github(\/actions)?(\\n|["'\s\n,}]|$)/.test(last)) out.push(`${file}: job "${j.id}" checkout thưa thiếu .github/actions nhưng dùng action cục bộ`); } }
  for (const st of installSteps(src)) if (!st.bounded) out.push(`${file}:${st.start + 1}: bước cài Playwright/apt không giới hạn thời gian – bước chỉ cài: thêm timeout-minutes; bước còn việc khác: bọc lệnh cài bằng \`timeout 600 …\` (luật 9)`);
  String(src).split('\n').forEach((l, n) => { if (!/^\s*#/.test(l) && SIGN_AUTO.test(l)) out.push(`${file}:${n + 1}: ký iOS Automatic/-allowProvisioningUpdates trên CI – mỗi máy CI tạo 1 chứng chỉ mới → đầy hạn mức; ký Manual qua scripts/native/ios-sign.sh (luật 13)`); });
  return out;
}
/** Tên các workflow trong workflow_run.workflows (dạng [a, b] hoặc danh sách - 'a'). */
export function workflowRunList(src) {
  const b = (String(src).match(/^  workflow_run:[^\n]*\n((?:    [^\n]*\n|\s*\n)*)/m) || [, ''])[1];
  const inl = b.match(/^    workflows:\s*\[([^\]]*)\]/m);
  if (inl) return inl[1].split(',').map(x => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  const blk = b.match(/^    workflows:\s*\n((?:      - [^\n]*\n)*)/m);
  return blk ? [...blk[1].matchAll(/^      - ['"]?([^'"\n#]+?)['"]?\s*(?:#.*)?$/gm)].map(x => x[1].trim()) : [];
}
/** Vòng workflow_run trên cả thư mục: files = [[file, src]] → ['A → B → A', …]. */
export function chainCycles(files) {
  const name = (f, s) => ((s.match(/^name:\s*(.+)$/m) || [])[1] || f).trim().replace(/^['"]|['"]$/g, '');
  const edges = new Map();   // workflow nguồn → workflow bị kích hoạt
  for (const [f, s] of files) for (const src of workflowRunList(s)) { if (!edges.has(src)) edges.set(src, new Set()); edges.get(src).add(name(f, s)); }
  const out = new Set(), path = [], on = new Set(), done = new Set();
  const dfs = n => { if (on.has(n)) { const i = path.indexOf(n); out.add([...path.slice(i), n].join(' → ')); return; } if (done.has(n)) return;
    on.add(n); path.push(n); for (const m of edges.get(n) || []) dfs(m); path.pop(); on.delete(n); done.add(n); };
  for (const n of edges.keys()) dfs(n);
  return [...out];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
  // --- tự kiểm hàm thuần
  const base = "name: x\non:\n  push:\n    branches: [main]\n    paths: ['a/**']\nconcurrency: { group: x }\njobs:\n  a:\n    runs-on: ubuntu-latest\n    timeout-minutes: 5\n    steps: []\n";
  ok(violations('x.yml', base).length === 0, 'mẫu đúng → 0 lỗi');
  ok(violations('x.yml', base.replace('    timeout-minutes: 5\n', '')).some(v => /timeout-minutes/.test(v)), 'job thiếu timeout → lỗi');
  ok(violations('x.yml', base.replace('    timeout-minutes: 5\n', '').replace('    runs-on: ubuntu-latest\n', '    uses: ./.github/workflows/y.yml\n')).length === 0, 'job uses: (workflow tái dùng) không cần timeout');
  ok(violations('x.yml', base.replace('concurrency: { group: x }\n', '')).some(v => /thiếu concurrency/.test(v)), 'push thiếu concurrency → lỗi');
  ok(violations('x.yml', base.replace('group: x', "group: 'v-${{ github.event.inputs.templates }}'")).some(v => /danh sách input/.test(v)), 'concurrency group nhúng danh sách input → lỗi');
  ok(!violations('x.yml', '# ci-policy: group-inputs – danh sách ngắn có lý do\n' + base.replace('group: x', "group: 'v-${{ github.event.inputs.templates }}'")).some(v => /danh sách input/.test(v)), 'group-inputs có lý do → qua');
  ok(violations('x.yml', base.replace('concurrency: { group: x }\n', '').replace('steps: []', 'concurrency: { group: y }\n    steps: []')).length === 0, 'concurrency mức job cũng được');
  ok(violations('x.yml', base.replace("    paths: ['a/**']\n", '')).some(v => /không có paths/.test(v)), 'push main không paths → lỗi');
  ok(violations('x.yml', '# ci-policy: all-paths – check bắt buộc của ruleset\n' + base.replace("    paths: ['a/**']\n", '')).length === 0, 'all-paths có lý do → đạt');
  ok(violations('x.yml', base.replace("    branches: [main]\n    paths: ['a/**']\n", "    branches: ['try-*']\n")).length === 0, 'push nhánh thử riêng = có phạm vi');
  const disp = "name: d\non:\n  workflow_dispatch:\njobs:\n  a:\n    runs-on: ubuntu-latest\n    timeout-minutes: 5\n    steps: []\n";
  ok(violations('d.yml', disp).some(v => /no-concurrency/.test(v)), 'dispatch không concurrency, không lý do → lỗi');
  ok(violations('d.yml', '# ci-policy: no-concurrency – mỗi lượt khác input, nhóm chung huỷ lượt chờ\n' + disp).length === 0, 'dispatch có lý do → đạt');
  ok(violations('d.yml', '# ci-policy: no-concurrency – x\n' + disp).length === 1, 'lý do quá ngắn không tính');
  const pr = base.replace('  push:\n    branches: [main]\n', '  pull_request:\n').replace('concurrency: { group: x }', 'concurrency: { group: x, cancel-in-progress: true }');
  const nd = pr.replace('    runs-on: ubuntu-latest\n', "    needs: b\n    if: always() && github.event_name == 'pull_request'\n    runs-on: ubuntu-latest\n");
  ok(violations('x.yml', nd).some(v => /always\(\)/.test(v)), 'job needs + always() trần → lỗi (before-after đỏ khi bot bị huỷ)');
  ok(violations('x.yml', nd.replace('always()', '!cancelled()')).length === 0, 'job needs + !cancelled() → đạt');
  ok(violations('x.yml', nd.replace("&& github.event_name == 'pull_request'", "&& needs.b.result != 'cancelled'")).length === 0, "always() + chặn != 'cancelled' → đạt");
  ok(violations('x.yml', nd.replace('  pull_request:\n', '  push:\n    branches: [main]\n')).length === 0, 'workflow không chạy trên PR: chưa áp luật 5');
  ok(violations('x.yml', pr.replace('    timeout-minutes: 5\n', "    timeout-minutes: 5\n    steps:\n      - if: always()\n        run: x\n").replace('    steps: []\n', '')).length === 0, 'always() mức bước (upload artifact) không bị chặn');
  const push = base.replace('    steps: []\n', "    steps:\n      - run: |\n          git commit -qm x\n          git pull -q --rebase origin main && git push\n");
  ok(violations('x.yml', push).some(v => /autostash/.test(v)), 'pull --rebase không autostash → lỗi (world-scorecard 2/11)');
  ok(violations('x.yml', push.replace('--rebase', '--rebase --autostash')).length === 0, 'pull --rebase --autostash → đạt');
  ok(violations('x.yml', push.replace('git commit -qm x', 'git commit -qm x; git stash push -q -u || true')).length === 0, 'cất phần sót trước khi pull → đạt (i18n)');
  // --- 5) workflow_run / check_suite / check_run (hồi quy sự cố required-gate 3/11 – fixture vi phạm phải đỏ)
  const wr = (list, job = "    if: github.event.workflow_run.conclusion == 'success'\n", conc = "concurrency: { group: w-${{ github.event.workflow_run.head_sha }}, cancel-in-progress: true }\n") =>
    `name: w\non:\n  workflow_run:\n    types: [completed]\n    workflows: [${list.join(', ')}]\n${conc}jobs:\n  a:\n${job}    runs-on: ubuntu-latest\n    timeout-minutes: 3\n    steps: []\n`;
  ok(violations('w.yml', wr(['A'])).length === 0, 'workflow_run có if + cancel → đạt');
  ok(violations('w.yml', wr(['A'], '')).some(v => /thiếu if/.test(v)), 'workflow_run job thiếu if → lỗi');
  ok(violations('w.yml', wr(['A']).replace('steps: []\n', 'steps: []\n  b:\n    needs: a\n    runs-on: ubuntu-latest\n    timeout-minutes: 3\n    steps: []\n')).length === 0, 'job needs job đã có if → đạt (skipped lan theo needs)');
  ok(violations('w.yml', wr(['A'], '', '').replace('jobs:\n  a:\n', 'jobs:\n  a:\n    if: always()\n')).some(v => /concurrency/.test(v)), 'workflow_run thiếu concurrency → lỗi');
  ok(violations('w.yml', wr(['A'], undefined, 'concurrency: { group: w, cancel-in-progress: false }\n')).some(v => /cancel-in-progress/.test(v)), 'workflow_run cancel-in-progress false không lý do → lỗi');
  ok(violations('w.yml', '# ci-policy: queue – deploy tuần tự, huỷ là mất bản phát hành\n' + wr(['A'], undefined, 'concurrency: { group: w, cancel-in-progress: false }\n')).length === 0, 'queue có lý do → đạt');
  const six = ['A', 'B', 'C', 'D', 'E', 'F'];
  ok(violations('w.yml', wr(six, '    if: always()\n')).some(v => /> 5/.test(v)), 'danh sách workflow_run > 5 mà if không lọc theo sự kiện → lỗi (kiểu required-gate cũ)');
  ok(violations('w.yml', wr(six)).length === 0, 'danh sách > 5 có cổng skip theo github.event.workflow_run → đạt');
  { const pr = m => `name: m\non:\n  pull_request:\n    paths: ['a/**']\nconcurrency: { group: m, cancel-in-progress: true }\njobs:\n  a:\n    runs-on: ubuntu-latest\n    timeout-minutes: 5\n    strategy:\n      fail-fast: false\n      matrix:\n${m}\n    steps: []\n`;
    ok(matrixLegs(pr('        device: [phone, desktop, webkit]\n        theme: [light, dark]')) === 6, 'matrix tích 3×2 = 6');
    ok(matrixLegs(pr(`        part: \${{ fromJSON(inputs.p && format('["{0}"]', inputs.p) || '["static","landing","legal","app","admin","blog","ext"]') }}`)) === 7, 'fromJSON literal: lấy nhánh lớn nhất (7)');
    ok(matrixLegs(pr(`        group: \${{ fromJSON(inputs.p && format('[{{"name":"{0}","parts":"{0}"}}]', inputs.p) || '[{"name":"site","parts":"a b"},{"name":"app","parts":"app"}]') }}`)) === 2, 'mảng object JSON đếm theo phần tử (2)');
    ok(matrixLegs("  a:\n    strategy: { fail-fast: false, matrix: { ep: '${{ fromJSON(needs.p.outputs.list) }}' } }\n    steps: []\n") === 0, 'matrix động (output job) không tính');
    ok(violations('m.yml', pr('        device: [phone, desktop, webkit]\n        theme: [light, dark]')).some(v => /matrix 6 nhánh/.test(v)), 'PR + matrix 6 nhánh, không lý do → lỗi');
    ok(violations('m.yml', '# ci-policy: matrix – đo hiệu năng từng máy phải tách runner\n' + pr('        device: [phone, desktop, webkit]\n        theme: [light, dark]')).length === 0, 'có lý do → đạt');
    ok(violations('m.yml', pr('        lang: [vi, en, ar]')).length === 0, 'matrix 3 nhánh → đạt');
    ok(violations('m.yml', pr('        device: [phone, desktop, webkit]\n        theme: [light, dark]').replace("  pull_request:\n    paths: ['a/**']", '  workflow_dispatch:')).length === 0, 'chỉ dispatch → không áp luật matrix'); }
  ok(violations('c.yml', "name: c\non:\n  check_suite:\n    types: [completed]\nconcurrency: { group: c, cancel-in-progress: true }\njobs:\n  a:\n    runs-on: ubuntu-latest\n    timeout-minutes: 3\n    steps: []\n").some(v => /thiếu if/.test(v)), 'check_suite job thiếu if → lỗi');
  ok(workflowRunList("on:\n  workflow_run:\n    workflows:\n      - 'Một'\n      - Hai # x\n    types: [completed]\n").join() === 'Một,Hai', 'đọc danh sách workflow_run dạng khối');
  ok(chainCycles([['a.yml', wr(['B']).replace('name: w', 'name: A')], ['b.yml', wr(['A']).replace('name: w', 'name: B')]]).length === 1, 'vòng A → B → A → lỗi');
  ok(chainCycles([['a.yml', wr(['A']).replace('name: w', 'name: A')]]).length === 1, 'tự kích hoạt A → A → lỗi');
  ok(chainCycles([['a.yml', wr(['B']).replace('name: w', 'name: A')], ['c.yml', wr(['A']).replace('name: w', 'name: C')]]).length === 0, 'chuỗi B → A → C không vòng → đạt');
  { // 9) bước cài có giới hạn thời gian
    const job = (step) => 'name: i\non:\n  workflow_dispatch:\nconcurrency: { group: i }\njobs:\n  a:\n    runs-on: ubuntu-latest\n    timeout-minutes: 20\n    steps:\n' + step + '      - run: echo xong\n';
    const v = st => violations('i.yml', job(st)).filter(x => /luật 9/.test(x)).length;
    ok(v('      - name: Cài\n        run: |\n          npm i playwright@1.48.2\n          npx playwright install --with-deps chromium\n') === 1, 'luật 9: bước cài Playwright không timeout → lỗi');
    ok(v('      - name: Cài\n        timeout-minutes: 12\n        run: |\n          npx playwright install --with-deps chromium\n') === 0, 'luật 9: bước chỉ cài có timeout-minutes → đạt');
    ok(v('      - run: sudo apt-get update -qq && sudo apt-get install -y x && node render.mjs\n') === 1, 'luật 9: apt-get trong bước có việc khác, không bọc timeout → lỗi');
    ok(v('      - run: sudo timeout 600 apt-get update -qq && sudo timeout 600 apt-get install -y x && node render.mjs\n') === 0, 'luật 9: lệnh cài bọc timeout → đạt');
    ok(v('      - run: |\n          # npx playwright install chromium\n          node a.mjs\n') === 0, 'luật 9: dòng chú thích không tính');
    const st = installSteps(job('      - name: Cài\n        run: npx playwright install chromium\n'))[0];
    ok(st && st.installOnly && st.jobTimeout === 20 && st.keyIndent === 8, 'luật 9: installSteps nhận bước chỉ cài + timeout của job');
    const v10 = st => violations('i.yml', job(st)).filter(x => /luật 10/.test(x)).length;
    ok(v10('      - timeout-minutes: 12\n        run: timeout 600 npx playwright install --with-deps chromium\n') === 1, 'luật 10: cài Playwright trần (kể cả bọc timeout) → lỗi');
    ok(v10('      - timeout-minutes: 14\n        run: bash scripts/ci/pw-install.sh --with-deps chromium\n') === 0, 'luật 10: qua pw-install.sh → đạt');
    ok(v10('      - run: |\n          for i in 1 2 3; do\n            if timeout 240 npx playwright install chromium; then break; fi\n          done\n') === 0, 'luật 10: vòng thử lại tự viết → đạt');
    const v17 = st => violations('i.yml', job(st)).filter(x => /luật pw-cache/.test(x)).length;
    ok(v17('      - run: bash scripts/ci/pw-install.sh --with-deps webkit\n') === 1, 'luật pw-cache: pw-install.sh không kèm action playwright-cache → lỗi');
    ok(v17("      - uses: ./.github/actions/playwright-cache\n        with: { browsers: webkit }\n      - run: bash scripts/ci/pw-install.sh --with-deps webkit\n") === 0, 'luật pw-cache: có action playwright-cache trước → đạt');
    ok(v17('      - run: |\n          # bash scripts/ci/pw-install.sh chromium\n          node a.mjs\n') === 0, 'luật pw-cache: dòng chú thích không tính');
    const vl = st => violations('i.yml', job(st)).filter(x => /action cục bộ/.test(x)).length;
    ok(vl('      - uses: ./.github/actions/apt\n        with: { packages: x }\n') === 1, 'action cục bộ: dùng trước khi checkout → lỗi');
    ok(vl('      - uses: actions/checkout@v4\n        with: { sparse-checkout: scripts }\n      - uses: ./.github/actions/apt\n') === 1, 'action cục bộ: checkout thưa thiếu .github/actions → lỗi');
    ok(vl('      - uses: actions/checkout@v4\n        with: { sparse-checkout: "scripts\\n.github/actions" }\n      - uses: ./.github/actions/apt\n') === 0 && vl('      - uses: actions/checkout@v4\n      - uses: ./.github/actions/apt\n') === 0, 'action cục bộ: checkout đủ → đạt');
    ok(!violations('mobile-qa.yml', job('      - timeout-minutes: 12\n        run: npx playwright install chromium\n')).some(x => /luật 10/.test(x)), 'luật 10: mobile-qa.yml được miễn');
  }
  { const hv = "# ci-policy: heavy-gate – x\n" + base.replace("  push:\n    branches: [main]\n    paths: ['a/**']", "  pull_request:\n    paths: ['a/**']").replace('concurrency: { group: x }', 'concurrency: { group: x, cancel-in-progress: true }');
    const gate = "  gate:\n    if: ${{ github.event_name != 'pull_request' || github.run_attempt > 1 || contains(github.event.pull_request.labels.*.name, 'ready') }}\n    runs-on: ubuntu-latest\n    timeout-minutes: 3\n    outputs: { go: '${{ steps.g.outputs.go }}' }\n    steps:\n      - run: gh api 'x?check_name=npm%20test' $READY\n";
    const good = hv.replace('jobs:\n', 'jobs:\n' + gate).replace('  a:\n', "  a:\n    needs: gate\n    if: needs.gate.outputs.go == 'true'\n");
    ok(violations('h.yml', good).length === 0, 'luật 11: gate + needs + if → đạt');
    ok(violations('h.yml', hv.replace('jobs:\n', 'jobs:\n' + gate)).some(v => /luật 11/.test(v)), 'luật 11: job không needs gate → lỗi');
    ok(violations('h.yml', hv).some(v => /gate/.test(v)), 'luật 11: thiếu job gate → lỗi');
    ok(violations('h.yml', good.replace("github.run_attempt > 1 || ", '')).some(v => /luật 17/.test(v)), 'luật 17: gate không bỏ qua ở lượt 1 → lỗi');
    ok(violations('h.yml', good.replace(' $READY', '')).some(v => /luật 14/.test(v)), 'luật 14: gate thiếu nhãn ready → lỗi');
    const ui = base.replace("  push:\n    branches: [main]\n", '  pull_request:\n').replace('concurrency: { group: x }', 'concurrency: { group: x, cancel-in-progress: true }').replace('    steps: []\n', '    steps:\n      - run: npx playwright test\n');
    ok(violations('u.yml', ui).some(v => /luật 14/.test(v)), 'luật 14: PR chạy trình duyệt không qua làn nhanh → lỗi');
    ok(violations('u.yml', '# ci-policy: fast-lane – đường dẫn rất hẹp, không phải bộ UI nặng\n' + ui.replace('ubuntu-latest', "${{ vars.PW_RUNNER || 'ubuntu-24.04' }}")).length === 0, 'luật 14: có lý do fast-lane → đạt');
    ok(violations('h.yml', good.replace('cancel-in-progress: true', 'cancel-in-progress: false')).some(v => /luật 12/.test(v)), 'luật 12: PR không cancel-in-progress → lỗi');
    ok(violations('h.yml', '# ci-policy: queue – việc tuần tự không được huỷ\n' + good.replace('cancel-in-progress: true', 'cancel-in-progress: false')).length === 0, 'luật 12: có lý do queue → đạt'); }
  { const sg = l => violations('s.yml', base.replace('    steps: []\n', `    steps:\n      - run: |\n          ${l}\n`)).filter(v => /luật 13/.test(v)).length;
    ok(sg('xcodebuild archive -allowProvisioningUpdates') === 1, 'luật 13: -allowProvisioningUpdates → lỗi (đầy hạn mức chứng chỉ 08/11)');
    ok(sg('xcodebuild DEVELOPMENT_TEAM=X CODE_SIGN_STYLE=Automatic archive') === 1, 'luật 13: CODE_SIGN_STYLE=Automatic → lỗi');
    ok(sg('<key>signingStyle</key><string>automatic</string>') === 1, 'luật 13: ExportOptions automatic → lỗi');
    ok(sg('bash scripts/native/ios-sign.sh App.xcodeproj/project.pbxproj com.lexkite.app:P') === 0, 'luật 13: ký Manual qua ios-sign.sh → đạt');
    ok(sg('# không dùng -allowProvisioningUpdates') === 0, 'luật 13: dòng chú thích không tính'); }
  { const pw = base.replace('    steps: []\n', '    steps:\n      - run: npx playwright install chromium\n');
    ok(violations('p.yml', pw).some(v => /luật 14/.test(v)), 'luật 14: job Playwright trên ubuntu-latest → lỗi');
    ok(violations('p.yml', pw.replace('ubuntu-latest', 'ubuntu-24.04')).some(v => /luật 14/.test(v)), 'luật 14: ghim ubuntu-24.04 trần (không qua vars.PW_RUNNER) → lỗi');
    ok(!violations('p.yml', pw.replace('ubuntu-latest', "${{ vars.PW_RUNNER || 'ubuntu-24.04' }}")).some(v => /luật 14/.test(v)), 'luật 14: runs-on qua vars.PW_RUNNER → đạt');
    ok(violations('p.yml', pw.replace('ubuntu-latest', 'ubuntu-26.04')).some(v => /luật 14/.test(v)), 'luật 14: ubuntu-26.04 → lỗi');
    ok(!violations('p.yml', base).some(v => /luật 14/.test(v)), 'luật 14: job không Playwright dùng ubuntu-latest → đạt');
    ok(PW_SCRIPTS.length > 10, 'luật 14: quét được script có import playwright (' + PW_SCRIPTS.length + ')'); }
  // luật 15 (13/11): ngưỡng fps của cổng sân khấu/rig KHÔNG được hạ dưới 50 (4×) / 55 (1×) – runner dao động thì đo bền hơn (warm-up + 15 mẫu + trung vị + 1 lần đo lại), không nới ngưỡng
  { const ss = fs.readFileSync(path.join(ROOT, 'scripts/test/story-stage.mjs'), 'utf8'), rg = fs.readFileSync(path.join(ROOT, 'scripts/test/teacher-rig-browser.mjs'), 'utf8');
    ok(+((ss.match(/const FPS_MIN = (\d+)/) || [])[1]) >= 50 && /m\.fps >= FPS_MIN/.test(ss), 'luật 15: story-stage FPS_MIN ≥ 50 và cổng dùng FPS_MIN');
    const rm = rg.match(/const FPS_MIN = \{ 1: (\d+), 4: (\d+) \}/); ok(rm && +rm[1] >= 55 && +rm[2] >= 50 && /good = m => m\.fps >= min/.test(rg), 'luật 15: teacher-rig FPS_MIN 1× ≥ 55, 4× ≥ 50');
    ok(/runSet\(15\)/.test(ss) && /runSet\(rate === 4 \? 15 : 5\)/.test(rg) && /fps-samples\.json/.test(ss) && /fps-samples\.json/.test(rg), 'luật 15: đo 15 mẫu + ghi fps-samples.json cho cả hai cổng'); }
  // --- quét repo
  const files = fs.readdirSync(WF).filter(f => /\.ya?ml$/.test(f)), srcs = files.map(f => [f, fs.readFileSync(path.join(WF, f), 'utf8')]);
  for (const [f, s] of srcs) for (const v of violations(f, s)) ok(false, v);
  const HEAVY = ['teach-video', 'video-motion', 'qa-bot', 'journey-e2e', 'ux-cards', 'scroll-perf', 'stitch-diff', 'font-audit', 'frame-consistency', 'visual-qa', 'mobile-qa', 'web-sweep', 'size-guard',
    'journey-matrix', 'storage-audit', 'theme-qa', 'shell-responsive', 'icon-flash', 'figure-layout', 'stitch-web', 'stitch-quality-qc', 'stitch-refs-qc', 'topbar-lang', 'review-taps', 'review-taps-stability', 'samples-visual', 'admin-guard', 'admin-ads-ui', 'tools-pages', 'dict-pages', 'authority-pages'];
  for (const h of HEAVY) { const src = (srcs.find(([f]) => f === h + '.yml') || [])[1] || ''; ok(/^# ci-policy: heavy-gate\b/m.test(src), `${h}.yml thiếu dòng "# ci-policy: heavy-gate – …" (luật 11)`); }
  // luật 11b: teach-video trên PR chỉ smoke (preqc + ≤ 2 tập; render đầy đủ khi dispatch/ci-filler), video-motion PR chỉ 1 mẫu
  { let n = -1; try { n = JSON.parse(execFileSync('python3', ['scripts/video/teach2d/gen.py', '--pick', '', '0', 'pull_request', '24'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })).length; } catch (e) { console.log('• ci-policy: python3/gen.py không chạy được – bỏ qua kiểm shard teach-video'); }
    ok(n < 0 || (n >= 1 && n <= 2), `teach-video trên PR chọn ${n} tập (phải 1–2: smoke, không render 24 shard)`);
    { const tv = (srcs.find(([f]) => f === 'teach-video.yml') || [])[1] || ''; const c = (tv.match(/^concurrency:.*$/m) || [''])[0];
      ok(/workflow_dispatch/.test(c) && /run_id/.test(c) && /batch/.test(c), 'teach-video.yml: mỗi dispatch phải có concurrency group riêng (batch/run_id) – group chung làm GitHub hủy âm thầm lượt đang chờ (12/11)');
      ok(!/cancel-in-progress:[^}]*workflow_dispatch/.test(c) && !/github\.ref != /.test(c), 'teach-video.yml: dispatch không được cancel-in-progress'); }
    const vm = (srcs.find(([f]) => f === 'video-motion.yml') || [])[1] || ''; ok(/github\.event_name == 'pull_request' && 'drill' \|\|/.test(vm), 'video-motion.yml: PR phải chạy 1 mẫu (drill), không 4'); }
  { const np = (srcs.find(([f]) => f === 'npm-test.yml') || [])[1] || ''; ok(/^  heavy:/m.test(np) && /heavy-rerun\.mjs/.test(np) && /needs:\s*test/.test(np), 'npm-test.yml thiếu job heavy (chạy heavy-rerun.mjs sau job test) – luật 11'); }
  { // luật 15: ci-autopilot không được cập nhật nhánh PR cũ/nhàn rỗi, trần 6 PR/lượt (bão CI 12/11: update-branch mọi PR tụt → ~40 workflow/PR/lần)
    const ap = fs.readFileSync(path.join(ROOT, 'scripts/ci/autopilot.mjs'), 'utf8');
    ok(/MAX_UPDATES = 6\b/.test(ap) && /isPriority\(pr, now\)/.test(ap) && /isRecent\(pr, now\)/.test(ap), 'luật 15: autopilot giữ trần 6 PR + chỉ đụng PR ưu tiên (isPriority/isRecent)');
    // luật 15b: hàng chờ > 30 → ngừng đẩy nhánh; mỗi PR tối đa 1 lần đẩy / 3 giờ (cả gỡ xung đột lẫn gộp main)
    ok(/QUEUE_MAX = 30\b/.test(ap) && /UPDATE_GAP_H = 3\b/.test(ap) && /budget\(m\.busy, m\.queued\)/.test(ap) && (ap.match(/!updatedRecently\(/g) || []).length >= 2, 'luật 15b: autopilot dừng khi hàng chờ > 30 và mỗi PR ≤ 1 lần đẩy/3 giờ (QUEUE_MAX, UPDATE_GAP_H, updatedRecently)'); }
  { // luật 16 (15/11 – hàng chờ 200–330: PR chỉ đổi nội dung/chữ dịch vẫn chạy ~19–32 job UI nặng): job nặng bỏ qua theo PHẠM VI PR ở mức JOB
    //  (scripts/ci/pr-scope.mjs trong job gate; KHÔNG dùng `paths:` mức workflow; skipped = đạt với required-gate). Mặc định coi là giao diện → chỉ bớt khi MỌI file đều là nội dung/chữ dịch/backend.
    const SCOPED = { 'stitch-diff': 'ui', 'frame-consistency': 'ui', 'journey-matrix': 'ui', 'qa-bot': 'ui', 'scroll-perf': 'ui', 'ux-cards': 'ui', 'teacher-native': 'ui', 'visual-qa': 'ui,text', 'mobile-qa': 'ui,text', 'journey-e2e': 'ui,text' };
    for (const [w, need] of Object.entries(SCOPED)) {
      const src = (srcs.find(([f]) => f === w + '.yml') || [])[1] || '', g = jobs(src).find(j => j.id === 'gate');
      ok(!!g, `luật 16: ${w}.yml thiếu job gate`); if (!g) continue;
      ok(g.text.includes(`node scripts/ci/pr-scope.mjs --repo "$REPO" --pr "$PR" --workflow .github/workflows/${w}.yml --need ${need}\n`) && g.text.includes(`scripts/ci/pr-scope.mjs .github/workflows/${w}.yml; do gh api`) && !/actions\/checkout@/.test(g.text), `luật 16: ${w}.yml gate phải chạy pr-scope.mjs --workflow … --need ${need}, lấy file qua API (không checkout: no-prod-hosts/luật 14)`);
      ok(/outputs:\s*\{\s*go:[^\n]*steps\.g\.outputs\.go == ''true''[^\n]*steps\.s\.outputs\.ok != ''false''/.test(g.text), `luật 16: ${w}.yml output go phải gộp steps.s.outputs.ok != 'false' (lỗi API → mở cổng, không mất kiểm)`);
      ok(/id: s\n\s+if: github\.event_name == 'pull_request'\n\s+continue-on-error: true/.test(g.text), `luật 16: ${w}.yml bước scope chỉ chạy trên PR và continue-on-error (không làm đỏ gate)`);
      ok(/pull-requests: read/.test(g.text), `luật 16: ${w}.yml gate cần pull-requests: read để đọc danh sách file PR`);
    }
    for (const [f, src] of srcs) if (/pr-scope\.mjs/.test(src) && !SCOPED[f.replace(/\.yml$/, '')]) ok(false, `luật 16: ${f} dùng pr-scope.mjs nhưng chưa khai báo trong SCOPED (ci-policy.mjs) – thêm để có gác`);
    const sc = f => classify(f.split(',')), nd = (f, n) => needed(f.split(','), n);
    ok(!sc('web/cpack/a/b.json,content/blog/en/x.md,docs/A.md,web/de/index.html').ui, 'luật 16: cpack/blog/docs/trang SEO = không phải UI');
    ok(!sc('web/js/i18n/de/a.js,extension/app/js/i18n/de/a.js,i18n/ui/de/a.js').ui && sc('web/js/i18n/de/a.js').text, 'luật 16: chữ dịch = text, không phải ui');
    ok(sc('web/css/a.css').ui && sc('web/js/app.js').ui && sc('extension/app/js/x.js').ui && sc('brand/stitch/v2/a.html').ui && sc('web/index.html').ui && sc('web/sw.js').ui, 'luật 16: css/js/app/add-on/Stitch/index/sw = UI');
    ok(sc('web/cpack/a.json,web/css/a.css').ui, 'luật 16: PR lẫn nội dung + UI → vẫn UI (chạy đủ)');
    ok(sc('scripts/test/stitch-diff.mjs').ui && sc('.github/workflows/x.yml').ui && sc('package.json').ui && sc('some/unknown/file.bin').ui, 'luật 16: script test / workflow / file lạ = UI (mặc định an toàn)');
    ok(!nd('functions/api/a.js,web/js/admin-x.js', 'ui,text') && nd('functions/api/a.js,web/js/i18n/de/a.js', 'ui,text') && !nd('web/js/i18n/de/a.js', 'ui'), 'luật 16: backend bỏ qua cả ui,text; chữ dịch chạy ui,text nhưng bỏ qua ui');
    { const pp = prPaths("on:\n  pull_request:\n    paths: ['web/**', '!web/**/*.md', 'a/b.js']\n  push:\n    paths: ['x']\n") || [];
      ok(pp.join('|') === 'web/**|!web/**/*.md|a/b.js', 'luật 16: prPaths đọc paths của pull_request (không lẫn push)');
      ok(relevantFiles(['web/a.js', 'web/a.md', 'z/y', 'a/b.js'], pp).join() === 'web/a.js,a/b.js', 'luật 16: relevantFiles = file khớp paths, trừ phủ định');
      ok(relevantFiles(['q'], null).join() === 'q' && relevantFiles(['.github/workflows/w.yml'], ['web/**'], '.github/workflows/w.yml').length === 1, 'luật 16: không paths → mọi file; file workflow tự nó luôn tính');
      const own = f => needed(relevantFiles(f.split(','), pp), 'ui');
      ok(!own('web/cpack/x.json,scripts/test/other.mjs') && own('web/css/a.css,web/cpack/x.json'), 'luật 16: chỉ file KÍCH workflow mới tính (file lạc đề như scripts/test/other.mjs không kéo workflow chạy)'); }
    ok(nd('', 'ui') && needed([], 'ui'), 'luật 16: không đọc được danh sách file → chạy (mở cổng)'); }
  { // luật 16 (15/11): ảnh QC Stitch → R2 + MỘT bình luận PR (scripts/ci/stitch-shots.mjs) – giám khảo UI đọc link, không tải artifact; không nới luật CI
    const sd = (srcs.find(([f]) => f === 'stitch-diff.yml') || [])[1] || '', st = (sd.match(/- name: Ảnh QC → R2 \+ bình luận PR\n[\s\S]*$/) || [''])[0];
    ok(/stitch-shots\.mjs/.test(st) && /timeout-minutes:/.test(st) && /continue-on-error: true/.test(st), 'luật 16: stitch-diff.yml có bước stitch-shots (timeout + continue-on-error)');
    ok(/head\.repo\.full_name == github\.repository/.test(st) && /github\.event_name == 'pull_request'/.test(st), 'luật 16: bước ảnh QC chỉ chạy PR cùng repo (fork không có secret)');
    ok(/pull-requests: write/.test(sd) && /^concurrency:/m.test(sd) && !/workflow_run|check_suite|check_run/.test(sd.split('\njobs:')[0]), 'luật 16: stitch-diff.yml có quyền bình luận PR, vẫn concurrency, không nghe workflow_run/check_suite');
    ok(!/upload-artifact[\s\S]{0,200}stitch-shots|git (add|commit|push)/.test(st) && !/echo[^\n]*(secrets\.|TOKEN|SECRET)/.test(st), 'luật 16: không commit ảnh vào repo, không in secret');
    const sh = fs.readFileSync(path.join(ROOT, 'scripts/ci/stitch-shots.mjs'), 'utf8');
    ok(/BUCKET = 'lexkite-report-shots'/.test(sh) && !/bucket create/.test(sh) && /MARKER = '<!-- stitch-shots -->'/.test(sh) && /'PATCH'/.test(sh), 'luật 16: dùng bucket report-shots có sẵn (không tạo bucket), marker ẩn + PATCH');
    const M = await import('../ci/stitch-shots.mjs'), cfg = { host: 'a.r2.cloudflarestorage.com', bucket: 'b', keyId: 'KID', secret: 'S', region: 'auto' };
    const u = M.presign(cfg, 'ci-shots/pr1/abc1234/sheet-x.jpg', 99999999, new Date('2026-11-15T01:02:03Z'));
    ok(/^https:\/\/a\.r2\.cloudflarestorage\.com\/b\/ci-shots\/pr1\/abc1234\/sheet-x\.jpg\?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=KID%2F20261115%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20261115T010203Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Signature=[0-9a-f]{64}$/.test(u) && !u.includes('S&') && !/Secret|=S$/.test(u), 'luật 16: link ký SigV4 đúng dạng, trần 7 ngày, không lộ secret');
    const fl = [{ kind: 'sheet', screen: 'today', name: 'sheet-today.jpg' }, { kind: 'desk', screen: 'today', name: 'desk-today.jpg' }, { kind: 'v2', screen: 'tờ-stitch-v2-1', name: 'v2-1.jpg' }], md = M.renderComment({ files: fl, links: { 'sheet-today.jpg': 'https://x/1', 'desk-today.jpg': 'https://x/2', 'v2-1.jpg': 'https://x/3' }, sha: 'abcdef0123', a11y: { 'today-dark': { violations: [{ impact: 'serious' }] } } });
    ok(md.startsWith(M.MARKER) && md.includes('[ảnh](https://x/1)') && md.includes('[ảnh](https://x/2)') && md.includes('(https://x/3)') && md.includes('– · 1/1') && md.includes('abcdef0'), 'luật 16: bình luận có marker ở đầu + bảng link theo màn + axe');
    { const rows = md.split('\n').filter(l => l.startsWith('|')); ok(rows.length > 2 && rows.every(l => l.split('|').length === rows[0].split('|').length), 'luật 16: bảng bình luận không vỡ cột (nhãn cột không chứa |)'); }
    const calls = [], mk = existing => async (m, p, b) => { calls.push(m); return m === 'GET' ? existing : { id: 7 }; };
    await M.upsertComment(mk([{ id: 5, body: 'x' }, { id: 9, body: M.MARKER + ' cũ' }]), 'o/r', 1, 'b'); ok(calls.join() === 'GET,PATCH', 'luật 16: có bình luận cũ → PATCH (không đăng mới)');
    calls.length = 0; await M.upsertComment(mk([{ id: 5, body: 'x' }]), 'o/r', 1, 'b'); ok(calls.join() === 'GET,POST', 'luật 16: chưa có → đăng đúng một bình luận'); }
  { // luật 18 (15/11): bản sinh (gói dịch, pn-*, extension/app) không commit trong PR → job PR đọc/serve web/ phải có bước sinh TRƯỚC (npm ci|i, build-web, gen-if-needed), không thì chạy trên bản sinh cũ của main (xanh/đỏ giả, vd. teacher-bubble --static đứng trước npm i)
    const G = await import('../lib/generated.mjs');
    const J = t => 'on:\n  pull_request:\njobs:\n  a:\n    steps:\n      - uses: actions/checkout@v4\n' + t;
    ok(G.genViolations(J('      - run: node scripts/test/x.mjs --static\n      - run: npm i --no-save p')).join() === 'a' && G.genViolations(J('      - run: npm ci\n      - run: node scripts/test/x.mjs')).length === 0
      && G.genViolations(J('      - uses: ./.github/actions/gen-if-needed\n      - run: python3 -m http.server')).length === 0 && G.genViolations(J('      - run: npm ci --ignore-scripts\n      - run: playwright test')).join() === 'a'
      && G.genViolations('# ci-policy: no-gen – x\n' + J('      - run: node scripts/test/x.mjs')).length === 0 && G.genViolations('on:\n  push:\njobs:\n  a:\n    steps:\n      - run: node scripts/test/x.mjs\n').length === 0, 'luật 18: genViolations bắt job đọc trước khi sinh');
    ok(G.needsRegen(['i18n/ui/vi/a.json']) && !G.needsRegen(['web/js/i18n/de.js', 'README.md']) && G.needsRegen(['web/app/x.js'], true) && !G.needsRegen(['web/app/x.js']) && !G.needsRegen(['extension/app/a.js'], true), 'luật 18: needsRegen chỉ theo NGUỒN bản sinh');
    for (const [f, src] of srcs) for (const j of G.genViolations(src)) ok(false, `${f} job ${j}: đọc/serve web/ trước khi có bản sinh khớp nguồn PR (bản sinh không commit trong PR) → thêm "- uses: ./.github/actions/gen-if-needed" ngay sau checkout, hoặc "# ci-policy: no-gen – <lý do>" nếu không đọc bản sinh (luật 18)`);
    ok(/--needed/.test(fs.readFileSync(path.join(ROOT, '.github/actions/gen-if-needed/action.yml'), 'utf8')), 'luật 18: action gen-if-needed gọi regen-generated --needed'); }
  { // luật 17 (15/11): workflow bot commit [skip ci] vào main (không qua CI) phải qua máy gác test theo tệp đổi (scripts/ci/bot-test-gate.mjs) – 9c4e52d158 làm lex.mjs đỏ, mọi PR kẹt shard 4
    const { ungated } = await import('../ci/bot-test-gate.mjs');
    for (const [f, s] of srcs) for (const why of ungated(s)) ok(false, `luật 17: ${f}: ${why}`); }
  for (const c of chainCycles(srcs)) ok(false, `vòng workflow_run: ${c}`);
  for (const k of ciParity(fs.readFileSync(path.join(WF, 'ci.yml'), 'utf8'), fs.readFileSync(path.join(ROOT, 'scripts/test/suite.txt'), 'utf8'))) ok(false, `ci.yml chạy "${k}" nhưng suite.txt (cổng PR) không có → PR xanh vẫn làm main đỏ`);
  ok(ciParity('run: node scripts/a.mjs\n- run: npx tsc -p x.json', 'node scripts/a.mjs').join() === 'tsc -p', 'ciParity bắt lệnh thiếu');
  // luật 15 (13/11): "tạm không chặn" phải có hạn – dòng `# tạm-không-chặn-tới: YYYY-MM-DD (issue #N)`; quá hạn mà còn marker → đỏ (không để bỏ chặn thành vĩnh viễn)
  const expiredTemp = (src, today) => [...src.matchAll(/^\s*# tạm-không-chặn-tới: (\d{4}-\d{2}-\d{2})/gm)].filter(m => m[1] < today).map(m => m[1]);
  ok(expiredTemp('# tạm-không-chặn-tới: 2026-11-20 (issue #1)', '2026-11-21').length === 1 && expiredTemp('# tạm-không-chặn-tới: 2026-11-20 (issue #1)', '2026-11-20').length === 0, 'luật 15: marker quá hạn → lỗi, đúng hạn → đạt');
  { const today = new Date().toISOString().slice(0, 10); for (const [f, s] of srcs) for (const d of expiredTemp(s, today)) ok(false, `${f}: "tạm không chặn" quá hạn ${d} – đưa leg về chặn gate hoặc gia hạn có OK của owner (luật 15)`); }
  console.log(fails ? `ci-policy: ${fails} lỗi` : `✓ ci-policy: ${files.length} workflow đạt (timeout + concurrency + phạm vi + workflow_run có cổng skip, không vòng)`);
  process.exit(fails ? 1 : 0);
}
